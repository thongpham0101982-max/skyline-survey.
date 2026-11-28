import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { parseVnEduWorkbook, normalizeHeaderKey } from "@/lib/grading/vnedu-excel-parser"
import {
  buildSheetPreview,
  ImportMode,
  recomputeCompositeForConfig,
  suggestTargetSubject,
} from "@/lib/grading/vnedu-import-engine"
import {
  buildPrimaryVnEduDefaultConfig,
  buildSecondaryTt22VnEduDefaultConfig,
  calculateTt22SemesterAverage,
  extractGradeNumber,
  findExactPeriodInternalOverrideConfig,
  getPrimaryEnglishVnEduPreset,
  isEnglishSubjectName,
  isPrimaryGrade,
  isSecondaryOrHighGrade,
  normalizeGradeColumnDefs,
  resolveGradeConfigForScope,
} from "@/lib/grading/vnedu-config-types"
import { resolveVnEduCodeMap } from "@/lib/grading/vnedu-code-resolver"

const IMPORT_ALLOWED_ROLES = [
  "ADMIN",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "KT_DBCL",
  "KHAO_THI",
  "TB_DHCM",
  "GDCS",
  "GIAO_VU_CS",
  "GIAO_VU",
  "BAN_GIAM_HIEU",
  "BGH",
  "CM",
  "TO_TRUONG",
  "TEACHER",
]

const PRIVILEGED_ROLES = [
  "ADMIN",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "KT_DBCL",
  "KHAO_THI",
  "TB_DHCM",
  "GDCS",
  "GIAO_VU_CS",
  "GIAO_VU",
  "BAN_GIAM_HIEU",
  "BGH",
  "CM",
  "TO_TRUONG",
]

function normalizeClassMatchKey(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/^lớp\s*/i, "")
    .replace(/[/_.\s-]+/g, "")
    .trim()
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    const role = ((session.user as any)?.role || "").toUpperCase().trim()
    if (!IMPORT_ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get("sessionId") || ""
    const academicYearId = searchParams.get("academicYearId") || ""

    if (sessionId) {
      const importSession = await prisma.vnEduImportSession.findUnique({
        where: { id: sessionId },
        include: { logs: { orderBy: [{ fileName: "asc" }, { sheetName: "asc" }, { rowIndex: "asc" }] } },
      })
      if (!importSession) {
        return NextResponse.json({ success: false, error: "Không tìm thấy phiên import" }, { status: 404 })
      }
      return NextResponse.json({ success: true, importSession })
    }

    const sessions = await prisma.vnEduImportSession.findMany({
      where: academicYearId ? { academicYearId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 30,
    })
    return NextResponse.json({ success: true, sessions })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập" }, { status: 401 })
    }
    const userId = (session.user as any)?.id || ""
    const userName = (session.user as any)?.name || (session.user as any)?.fullName || (session.user as any)?.email || "Người dùng"
    const role = ((session.user as any)?.role || "").toUpperCase().trim()
    if (!IMPORT_ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ success: false, error: "Bạn không có quyền import sổ điểm" }, { status: 403 })
    }
    const isPrivileged = PRIVILEGED_ROLES.includes(role)

    const contentType = req.headers.get("content-type") || ""

    // =========================================================================
    // STEP 1: Parse uploaded .xls / .xlsx files (multipart/form-data)
    // =========================================================================
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      const academicYearId = String(formData.get("academicYearId") || "")
      const defaultPeriod = String(formData.get("evaluationPeriod") || "")
      const defaultClassId = String(formData.get("defaultClassId") || "")
      const files = formData.getAll("files") as File[]

      if (!academicYearId) {
        return NextResponse.json({ success: false, error: "Thiếu năm học" }, { status: 400 })
      }
      if (!files || files.length === 0) {
        return NextResponse.json({ success: false, error: "Vui lòng chọn ít nhất một file Excel (.xls / .xlsx)" }, { status: 400 })
      }

      const [classes, subjects, hints, aliases] = await Promise.all([
        prisma.class.findMany({
          where: { academicYearId, status: "ACTIVE" },
          select: {
            id: true,
            classCode: true,
            className: true,
            grade: true,
            level: true,
            educationSystem: true,
            campus: { select: { campusCode: true } },
          },
          orderBy: { className: "asc" },
        }),
        prisma.subject.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, subjectCode: true, subjectName: true, level: true, category: true },
          orderBy: { subjectName: "asc" },
        }),
        prisma.vnEduSubjectMappingHint.findMany({
          where: { academicYearId },
          select: { sourceSubjectNormalized: true, targetSubjectId: true },
        }),
        prisma.subjectAlias.findMany({
          select: { subjectId: true, aliasPattern: true, normalizedKey: true },
        }),
      ])

      const parsedWorkbooks = []
      const sheetDrafts = []

      for (const f of files) {
        const buf = Buffer.from(await f.arrayBuffer())
        const parsed = parseVnEduWorkbook(buf, f.name)
        parsedWorkbooks.push({
          fileName: parsed.fileName,
          warnings: parsed.warnings,
          usedFallbackParser: parsed.usedFallbackParser,
          sheetCount: parsed.sheets.length,
        })

        for (const sh of parsed.sheets) {
          const sourceSub = sh.detectedSubject || sh.sheetName
          const suggestion = suggestTargetSubject(sourceSub, subjects, hints, aliases)

          // Suggest class by normalized className / classCode / className+campusCode, or fallback to defaultClassId
          const detClassKey = normalizeClassMatchKey(sh.detectedClass)
          const sheetKey = normalizeClassMatchKey(sh.sheetName)
          const matchedClass =
            classes.find(c => {
              if (!detClassKey) return false
              const cNameKey = normalizeClassMatchKey(c.className)
              const cCodeKey = normalizeClassMatchKey(c.classCode)
              const cWithCampusKey = c.campus?.campusCode
                ? normalizeClassMatchKey(`${c.className}_${c.campus.campusCode}`)
                : ""
              return cNameKey === detClassKey || cCodeKey === detClassKey || (cWithCampusKey && cWithCampusKey === detClassKey)
            }) ||
            classes.find(c => {
              if (!sheetKey) return false
              const cNameKey = normalizeClassMatchKey(c.className)
              const cCodeKey = normalizeClassMatchKey(c.classCode)
              const cWithCampusKey = c.campus?.campusCode
                ? normalizeClassMatchKey(`${c.className}_${c.campus.campusCode}`)
                : ""
              return cNameKey === sheetKey || cCodeKey === sheetKey || (cWithCampusKey && cWithCampusKey === sheetKey)
            }) ||
            (defaultClassId ? classes.find(c => c.id === defaultClassId) || null : null)

          sheetDrafts.push({
            fileName: sh.fileName,
            sheetName: sh.sheetName,
            detectedSubject: sh.detectedSubject,
            detectedClass: sh.detectedClass,
            detectedAcademicYear: sh.detectedAcademicYear,
            detectedPeriod: sh.detectedPeriod || defaultPeriod || "GK1",
            metadataConflicts: sh.metadataConflicts,
            warnings: sh.warnings,
            rowCount: sh.rows.length,
            nonEmptyRowCount: sh.rows.filter(r => !r.isEmptyResultRow).length,
            emptyRowCount: sh.rows.filter(r => r.isEmptyResultRow).length,
            skippedFooterStartRow: sh.skippedFooterStartRow,
            suggestedClassId: matchedClass?.id || "",
            suggestedSubjectId: suggestion.suggestedSubjectId || "",
            suggestionSource: suggestion.suggestionSource,
            confirmed: false, // NEVER auto-confirmed!
            parsedSheet: sh,
          })
        }
      }

      const importSession = await prisma.vnEduImportSession.create({
        data: {
          academicYearId,
          uploadedById: userId,
          uploadedByName: userName,
          status: "PARSED",
          fileNamesJson: JSON.stringify(files.map(f => f.name)),
        },
      })

      return NextResponse.json({
        success: true,
        sessionId: importSession.id,
        workbooks: parsedWorkbooks,
        sheets: sheetDrafts,
      })
    }

    // =========================================================================
    // STEP 2 & 3: Preview or Commit (application/json)
    // =========================================================================
    const body = await req.json()
    const { action, academicYearId, sessionId, mode = "FILL_EMPTY", sheetMappings = [], idempotencyKey, previewTimestamp } = body

    if (!academicYearId || !sessionId) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin phiên import hoặc năm học" }, { status: 400 })
    }

    const importSession = await prisma.vnEduImportSession.findUnique({ where: { id: sessionId } })
    if (!importSession) {
      return NextResponse.json({ success: false, error: "Phiên import không tồn tại" }, { status: 404 })
    }

    const activeSheets = (sheetMappings as any[]).filter(m => !m.skip)
    if (activeSheets.length === 0) {
      return NextResponse.json({ success: false, error: "Không có sheet nào được chọn để xử lý" }, { status: 400 })
    }

    // Strict check: Every active sheet MUST have confirmedSubjectId & confirmedByUser === true
    for (const sm of activeSheets) {
      if (!sm.confirmedByUser || !sm.confirmedSubjectId) {
        return NextResponse.json({
          success: false,
          error: `Sheet "${sm.sheetName}" (${sm.fileName}) chưa xác nhận môn SSM nhận kết quả. Vui lòng xác nhận mapping môn trước khi tiếp tục.`,
        }, { status: 400 })
      }
      if (!sm.targetClassId) {
        return NextResponse.json({
          success: false,
          error: `Sheet "${sm.sheetName}" (${sm.fileName}) chưa chọn lớp đích trong SSM.`,
        }, { status: 400 })
      }
    }

    // Load authoritative DB data (never trust client-supplied student/config/subject names)
    const targetClassIds = Array.from(new Set(activeSheets.map(s => s.targetClassId))) as string[]
    const targetSubjectIds = Array.from(new Set(activeSheets.map(s => s.confirmedSubjectId))) as string[]
    const targetPeriods = Array.from(new Set(activeSheets.map(s => s.evaluationPeriod || "GK1"))) as string[]

    let teacherRecord: any = null
    if (userId) {
      teacherRecord = await prisma.teacher.findUnique({ where: { userId } })
    }

    const [classes, subjects, configs, studentsRaw, locks, existingEntries, teachingAssignments] = await Promise.all([
      prisma.class.findMany({ where: { id: { in: targetClassIds }, academicYearId } }),
      prisma.subject.findMany({ where: { id: { in: targetSubjectIds }, status: "ACTIVE" } }),
      prisma.subjectGradeConfig.findMany({
        where: {
          academicYearId,
          configType: "VNEDU",
          isActive: true,
          subjectId: { in: targetSubjectIds },
        },
      }),
      prisma.student.findMany({
        where: { academicYearId, status: "ACTIVE" },
        select: { id: true, studentCode: true, vnEduCode: true, studentName: true, dateOfBirth: true, classId: true, class: { select: { className: true } } },
      }).catch(() =>
        prisma.student.findMany({
          where: { academicYearId, status: "ACTIVE" },
          select: { id: true, studentCode: true, studentName: true, dateOfBirth: true, classId: true, class: { select: { className: true } } },
        })
      ),
      prisma.gradebookLock.findMany({
        where: {
          academicYearId,
          evaluationPeriod: { in: targetPeriods },
        },
      }),
      prisma.subjectGradeEntry.findMany({
        where: {
          academicYearId,
          configType: "VNEDU",
          subjectId: { in: targetSubjectIds },
          evaluationPeriod: { in: targetPeriods },
          classId: { in: targetClassIds },
        },
      }),
      !isPrivileged && teacherRecord
        ? prisma.teachingAssignment.findMany({
            where: { academicYearId, teacherId: teacherRecord.id },
            select: { classId: true, subjectId: true },
          })
        : Promise.resolve([]),
    ])

    const classMap = new Map(classes.map(c => [c.id, c]))
    const subjectMap = new Map(subjects.map(s => [s.id, s]))
    const mappingByDbCode = await resolveVnEduCodeMap(
      studentsRaw.map((s: any) => s.studentCode).filter(Boolean),
      academicYearId
    )

    const studentsInYear = studentsRaw.map((s: any) => ({
      id: s.id,
      studentCode: s.studentCode,
      vnEduCode: s.vnEduCode || mappingByDbCode.get(s.studentCode) || null,
      studentName: s.studentName,
      dateOfBirth: s.dateOfBirth,
      classId: s.classId,
      className: s.class?.className || "",
    }))

    const sheetResults: any[] = []
    const allPreviewItems: any[] = []

    for (const sm of activeSheets) {
      const targetClass = classMap.get(sm.targetClassId)
      const confirmedSubject = subjectMap.get(sm.confirmedSubjectId)
      const evalPeriod = String(sm.evaluationPeriod || "GK1").trim()

      if (!targetClass || !confirmedSubject) {
        return NextResponse.json({
          success: false,
          error: `Lớp hoặc môn đích của sheet "${sm.sheetName}" không hợp lệ trong năm học đã chọn.`,
        }, { status: 400 })
      }

      // Permission check for non-privileged teacher
      if (!isPrivileged) {
        const assigned = (teachingAssignments as any[]).some(
          ta => ta.classId === targetClass.id && ta.subjectId === confirmedSubject.id
        )
        if (!assigned) {
          return NextResponse.json({
            success: false,
            error: `Bạn không được phân công giảng dạy môn "${confirmedSubject.subjectName}" cho lớp "${targetClass.className}".`,
          }, { status: 403 })
        }
      }

      // Lock check (period-wide or class+subject specific)
      const specificLock = locks.find(l => l.evaluationPeriod === evalPeriod && l.classId === targetClass.id && l.subjectId === confirmedSubject.id)
      const periodLock = locks.find(l => l.evaluationPeriod === evalPeriod && l.classId === "ALL" && l.subjectId === "ALL" && Boolean(l.isLocked))
      const isLocked = specificLock ? Boolean(specificLock.isLocked) : Boolean(periodLock)
      if (isLocked && !isPrivileged) {
        return NextResponse.json({
          success: false,
          error: `Sổ điểm môn "${confirmedSubject.subjectName}" lớp "${targetClass.className}" kỳ "${evalPeriod}" đã bị khóa.`,
        }, { status: 403 })
      }

      // Resolve VNEDU config strictly, preferring newer exact-scope INTERNAL config if configured in "2. Đánh giá nội bộ Sky-Line"
      const gradeLabel = targetClass.grade || targetClass.className
      let activeConfig = resolveGradeConfigForScope(configs, {
        academicYearId,
        program: targetClass.educationSystem || "ALL",
        grade: gradeLabel,
        subjectId: confirmedSubject.id,
        evaluationPeriod: evalPeriod,
        configType: "VNEDU",
      })
      const exactInternalOverride = findExactPeriodInternalOverrideConfig(configs, {
        academicYearId,
        program: targetClass.educationSystem || "ALL",
        grade: gradeLabel,
        subjectId: confirmedSubject.id,
        evaluationPeriod: evalPeriod,
      })
      if (exactInternalOverride) {
        const vnTime = activeConfig?.updatedAt ? new Date(activeConfig.updatedAt).getTime() : 0
        const intTime = exactInternalOverride.updatedAt ? new Date(exactInternalOverride.updatedAt).getTime() : 0
        if (!activeConfig || intTime > vnTime) {
          activeConfig = exactInternalOverride
        }
      }

      // Check Primary English Grade 1 & 2 unconfirmed rule
      if (!activeConfig && isEnglishSubjectName(confirmedSubject.subjectName)) {
        const preset = getPrimaryEnglishVnEduPreset(gradeLabel, evalPeriod)
        const gNum = extractGradeNumber(gradeLabel)
        if (preset && (gNum === 1 || gNum === 2)) {
          return NextResponse.json({
            success: false,
            error: `Chưa xác nhận cấu hình vnEdu cho môn ${confirmedSubject.subjectName} (${gradeLabel} - ${evalPeriod}).`,
          }, { status: 400 })
        }
      }

      if (!activeConfig && isPrimaryGrade(gradeLabel)) {
        activeConfig = buildPrimaryVnEduDefaultConfig({
          academicYearId,
          program: targetClass.educationSystem || "ALL",
          grade: gradeLabel,
          subjectId: confirmedSubject.id,
          subjectName: confirmedSubject.subjectName,
          evaluationPeriod: evalPeriod,
        }) as any
      } else if (!activeConfig && isSecondaryOrHighGrade(gradeLabel)) {
        activeConfig = buildSecondaryTt22VnEduDefaultConfig({
          academicYearId,
          program: targetClass.educationSystem || "ALL",
          grade: gradeLabel,
          subjectId: confirmedSubject.id,
          subjectName: confirmedSubject.subjectName,
          evaluationPeriod: evalPeriod,
        }) as any
      }

      if (!activeConfig) {
        return NextResponse.json({
          success: false,
          error: `Thiếu cấu hình Sổ điểm theo vnEdu cho môn "${confirmedSubject.subjectName}" - ${gradeLabel} - ${evalPeriod}. Vui lòng cấu hình trước khi import.`,
        }, { status: 400 })
      }

      if (activeConfig.confirmationStatus === "UNCONFIRMED") {
        return NextResponse.json({
          success: false,
          error: `Chưa xác nhận cấu hình vnEdu cho môn "${confirmedSubject.subjectName}" (${gradeLabel} - ${evalPeriod}).`,
        }, { status: 400 })
      }

      const relevantEntries = existingEntries.filter(
        e => e.classId === targetClass.id && e.subjectId === confirmedSubject.id && e.evaluationPeriod === evalPeriod
      )

      const built = buildSheetPreview({
        sheet: sm.parsedSheet,
        targetClass: { id: targetClass.id, className: targetClass.className },
        confirmedSubject: {
          id: confirmedSubject.id,
          subjectCode: confirmedSubject.subjectCode,
          subjectName: confirmedSubject.subjectName,
        },
        config: activeConfig,
        studentsInYear,
        existingEntries: relevantEntries,
        mode: (mode === "UPDATE_EXISTING" ? "UPDATE_EXISTING" : "FILL_EMPTY") as ImportMode,
      })

      sheetResults.push({
        fileName: sm.fileName,
        sheetName: sm.sheetName,
        targetClassId: targetClass.id,
        targetClassName: targetClass.className,
        confirmedSubjectId: confirmedSubject.id,
        confirmedSubjectName: confirmedSubject.subjectName,
        evaluationPeriod: evalPeriod,
        configId: activeConfig.id,
        configVersion: activeConfig.version,
        config: activeConfig,
        extraColumns: built.colMapping.extraColumns,
        compositeRefColumns: built.colMapping.compositeRefColumns,
        studentIssues: built.studentIssues,
      })
      allPreviewItems.push(...built.previewItems)
    }

    if (action === "preview") {
      return NextResponse.json({
        success: true,
        previewTimestamp: new Date().toISOString(),
        sheetResults,
        previewItems: allPreviewItems,
      })
    }

    // =========================================================================
    // STEP 4: Commit valid selected rows atomically per student-subject-period
    // =========================================================================
    if (action === "commit") {
      if (idempotencyKey) {
        const dupSession = await prisma.vnEduImportSession.findUnique({ where: { idempotencyKey } })
        if (dupSession && dupSession.id !== sessionId) {
          return NextResponse.json({
            success: true,
            idempotentReplay: true,
            summary: dupSession.summaryJson ? JSON.parse(dupSession.summaryJson) : null,
          })
        }
        if (importSession.status === "COMMITTED" && importSession.idempotencyKey === idempotencyKey) {
          return NextResponse.json({
            success: true,
            idempotentReplay: true,
            summary: importSession.summaryJson ? JSON.parse(importSession.summaryJson) : null,
          })
        }
      }

      // Concurrency check: ensure no existing entry changed after previewTimestamp
      if (previewTimestamp) {
        const previewDate = new Date(previewTimestamp)
        const modifiedAfter = existingEntries.filter(e => e.updatedAt && new Date(e.updatedAt) > previewDate)
        if (modifiedAfter.length > 0) {
          return NextResponse.json({
            success: false,
            conflict: true,
            error: `Dữ liệu sổ điểm của ${modifiedAfter.length} học sinh đã bị thay đổi sau khi xem trước. Vui lòng xem trước lại trước khi nhập.`,
          }, { status: 409 })
        }
      }

      const selectedKeys = new Set<string>(Array.isArray(body.selectedRowKeys) ? body.selectedRowKeys : [])

      // Group actionable items by (studentId, subjectId, classId, evaluationPeriod)
      // Enforce all-or-nothing per student row!
      const groupedByRow = new Map<string, {
        studentId: string
        subjectId: string
        classId: string
        evaluationPeriod: string
        fileName: string
        sheetName: string
        rowIndex: number
        vnEduCode: string
        sourceSubject: string
        configId: string
        configVersion: number
        config: any
        items: any[]
        hasBlockingError: boolean
      }>()

      for (const item of allPreviewItems) {
        if (!item.studentId) continue
        const sheetInfo = sheetResults.find(sr => sr.fileName === item.fileName && sr.sheetName === item.sheetName)
        if (!sheetInfo) continue

        const groupKey = `${item.fileName}::${item.sheetName}::${item.rowIndex}::${item.studentId}`
        const group = groupedByRow.get(groupKey) || {
          studentId: item.studentId,
          subjectId: item.confirmedSubjectId,
          classId: item.classId,
          evaluationPeriod: sheetInfo.evaluationPeriod,
          fileName: item.fileName,
          sheetName: item.sheetName,
          rowIndex: item.rowIndex,
          vnEduCode: item.vnEduCode,
          sourceSubject: item.sourceSubject,
          configId: sheetInfo.configId,
          configVersion: sheetInfo.configVersion,
          config: sheetInfo.config,
          items: [] as any[],
          hasBlockingError: false,
        }
        if (item.status === "ERROR" || item.status === "CONFLICT") {
          group.hasBlockingError = true
        }
        group.items.push(item)
        groupedByRow.set(groupKey, group)
      }

      let addedCount = 0
      let updatedCount = 0
      let unchangedCount = 0
      let skippedCount = 0
      let failedCount = 0
      const logCreates: any[] = []

      const configById = new Map(configs.map(c => [c.id, c]))
      const entryMap = new Map(
        existingEntries.map(e => [`${e.studentId}::${e.subjectId}::${e.evaluationPeriod}`, e])
      )

      await prisma.$transaction(async (tx) => {
        for (const group of groupedByRow.values()) {
          const activeItems = group.items.filter(
            it => (it.status === "ADD" || it.status === "UPDATE") && (selectedKeys.size === 0 || selectedKeys.has(it.rowKey))
          )

          if (group.hasBlockingError) {
            failedCount++
            logCreates.push({
              sessionId,
              academicYearId,
              fileName: group.fileName,
              sheetName: group.sheetName,
              rowIndex: group.rowIndex,
              sourceSubjectName: group.sourceSubject,
              targetSubjectId: group.subjectId,
              configId: group.configId,
              configVersion: group.configVersion,
              classId: group.classId,
              studentId: group.studentId,
              vnEduCode: group.vnEduCode,
              confirmedById: userId,
              confirmedByName: userName,
              importedById: userId,
              importedByName: userName,
              action: "FAILED",
              reason: group.items.find(i => i.status === "ERROR" || i.status === "CONFLICT")?.reason || "Lỗi dữ liệu trên dòng",
            })
            continue
          }

          if (activeItems.length === 0) {
            const hasUnchanged = group.items.some(i => i.status === "UNCHANGED")
            if (hasUnchanged) unchangedCount++
            else skippedCount++
            continue
          }

          const existing = entryMap.get(`${group.studentId}::${group.subjectId}::${group.evaluationPeriod}`)
          let compScores: Record<string, any> = {}
          if (existing?.componentScores) {
            try { compScores = JSON.parse(existing.componentScores) || {} } catch { compScores = {} }
          }
          let nextRating = existing?.ratingValue || null
          let nextRemark = existing?.remark || ""

          const beforeSnapshot = {
            componentScores: { ...compScores },
            ratingValue: nextRating,
            remark: nextRemark,
          }

          let rowWasUpdated = false
          let rowWasAdded = false

          const cfg = configById.get(group.configId) || group.config
          const cfgDefs = normalizeGradeColumnDefs(cfg)

          for (const it of activeItems) {
            if (it.status === "UPDATE") rowWasUpdated = true
            else if (it.status === "ADD") rowWasAdded = true

            if (it.fieldKey === "remark") {
              nextRemark = String(it.newValue).slice(0, 1000)
            } else if (it.fieldKey === "ratingValue") {
              nextRating = String(it.newValue).slice(0, 20)
            } else {
              compScores[it.fieldKey] = it.newValue
              const def = cfgDefs.find(d => d.key === it.fieldKey)
              if (def?.group === "GK") {
                compScores.gk = it.newValue
              } else if (def?.group === "CK") {
                compScores.ck = it.newValue
              } else if (def?.group === "TX" && def.attempt) {
                compScores[`tx${def.attempt}`] = it.newValue
                compScores[`col${def.attempt - 1}`] = it.newValue
              }
            }
          }

          const nextComposite = recomputeCompositeForConfig(compScores, cfg)
          if (cfg?.isTt22CommentOnly) {
            const txVals = [1, 2, 3, 4].map(idx => compScores[`tx${idx}`] ?? compScores[`col${idx - 1}`] ?? "")
            const gkVal = compScores.gk ?? compScores.col4 ?? ""
            const ckVal = compScores.ck ?? compScores.col5 ?? ""
            const computedDat = calculateTt22SemesterAverage({ txValues: txVals, gkValue: gkVal, ckValue: ckVal }, true)
            if (computedDat) nextRating = computedDat
          }

          await tx.subjectGradeEntry.upsert({
            where: {
              studentId_subjectId_evaluationPeriod_academicYearId_configType: {
                studentId: group.studentId,
                subjectId: group.subjectId,
                evaluationPeriod: group.evaluationPeriod,
                academicYearId,
                configType: "VNEDU",
              },
            },
            update: {
              classId: group.classId,
              configId: group.configId,
              configVersion: group.configVersion,
              componentScores: JSON.stringify(compScores),
              compositeScore: nextComposite,
              ratingValue: nextRating,
              remark: nextRemark,
              sourceType: "VNEDU_IMPORT",
            },
            create: {
              academicYearId,
              classId: group.classId,
              subjectId: group.subjectId,
              evaluationPeriod: group.evaluationPeriod,
              configType: "VNEDU",
              configId: group.configId,
              configVersion: group.configVersion,
              studentId: group.studentId,
              componentScores: JSON.stringify(compScores),
              compositeScore: nextComposite,
              ratingValue: nextRating,
              remark: nextRemark,
              sourceType: "VNEDU_IMPORT",
            },
          })

          if (rowWasUpdated) updatedCount++
          else if (rowWasAdded) addedCount++

          logCreates.push({
            sessionId,
            academicYearId,
            fileName: group.fileName,
            sheetName: group.sheetName,
            rowIndex: group.rowIndex,
            sourceSubjectName: group.sourceSubject,
            targetSubjectId: group.subjectId,
            configId: group.configId,
            configVersion: group.configVersion,
            classId: group.classId,
            studentId: group.studentId,
            vnEduCode: group.vnEduCode,
            confirmedById: userId,
            confirmedByName: userName,
            importedById: userId,
            importedByName: userName,
            action: rowWasUpdated ? "UPDATED" : "ADDED",
            beforeJson: JSON.stringify(beforeSnapshot),
            afterJson: JSON.stringify({ componentScores: compScores, ratingValue: nextRating, remark: nextRemark }),
            reason: rowWasUpdated ? "Cập nhật kết quả" : "Bổ sung mới",
          })
        }

        // Save subject mapping hints (for suggestion only in future sessions)
        for (const sm of activeSheets) {
          const rawSub = sm.parsedSheet?.detectedSubject || sm.sheetName || ""
          const normSub = normalizeHeaderKey(rawSub)
          if (normSub && sm.confirmedSubjectId) {
            await tx.vnEduSubjectMappingHint.upsert({
              where: {
                academicYearId_sourceSubjectNormalized: {
                  academicYearId,
                  sourceSubjectNormalized: normSub,
                },
              },
              update: {
                sourceSubjectRaw: rawSub,
                targetSubjectId: sm.confirmedSubjectId,
                lastUsedById: userId,
              },
              create: {
                academicYearId,
                sourceSubjectNormalized: normSub,
                sourceSubjectRaw: rawSub,
                targetSubjectId: sm.confirmedSubjectId,
                lastUsedById: userId,
              },
            })
          }
        }

        if (logCreates.length > 0) {
          await tx.vnEduImportLog.createMany({ data: logCreates })
        }

        const summary = { addedCount, updatedCount, unchangedCount, skippedCount, failedCount }
        await tx.vnEduImportSession.update({
          where: { id: sessionId },
          data: {
            status: failedCount > 0 ? "PARTIAL" : "COMMITTED",
            mode: mode === "UPDATE_EXISTING" ? "UPDATE_EXISTING" : "FILL_EMPTY",
            idempotencyKey: idempotencyKey || null,
            summaryJson: JSON.stringify(summary),
            committedAt: new Date(),
          },
        })
      })

      return NextResponse.json({
        success: true,
        summary: { addedCount, updatedCount, unchangedCount, skippedCount, failedCount },
      })
    }

    return NextResponse.json({ success: false, error: "Hành động không hợp lệ" }, { status: 400 })
  } catch (error: any) {
    console.error("Error in vnedu-import:", error)
    return NextResponse.json({ success: false, error: error.message || "Lỗi xử lý import vnEdu" }, { status: 500 })
  }
}
