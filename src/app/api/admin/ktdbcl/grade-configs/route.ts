import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import {
  extractGradeNumber,
  getPrimaryEnglishVnEduPreset,
  isEnglishSubjectName,
  normalizeGradeColumnDefs,
} from "@/lib/grading/vnedu-config-types"
import { recalculateGradeEntriesForConfig } from "@/lib/grading/recalculate-grade-entries"

const CONFIG_ALLOWED_ROLES = [
  "ADMIN",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "KT_DBCL",
  "KHAO_THI",
  "TB_DHCM",
]

function buildSnapshotJson(cfg: any) {
  return JSON.stringify({
    program: cfg.program,
    grade: cfg.grade,
    subjectId: cfg.subjectId,
    evaluationPeriod: cfg.evaluationPeriod,
    configType: cfg.configType,
    columnCount: cfg.columnCount,
    columnNames: cfg.columnNames,
    columnTypes: cfg.columnTypes,
    columnMaxScores: cfg.columnMaxScores,
    columnsJson: cfg.columnsJson,
    hasCompositeColumn: cfg.hasCompositeColumn,
    compositeColumnName: cfg.compositeColumnName,
    hasRatingColumn: cfg.hasRatingColumn,
    ratingColumnName: cfg.ratingColumnName,
    ratingScaleJson: cfg.ratingScaleJson,
    hasRemarkColumn: cfg.hasRemarkColumn,
    confirmationStatus: cfg.confirmationStatus,
    formula: cfg.formula,
    formulaCustom: cfg.formulaCustom,
    weights: cfg.weights,
    roundingRule: cfg.roundingRule,
  })
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Vui lòng đăng nhập" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const historyFor = searchParams.get("historyFor") || ""
    if (historyFor) {
      const versions = await prisma.subjectGradeConfigVersion.findMany({
        where: { configId: historyFor },
        orderBy: { version: "desc" },
      })
      return NextResponse.json({ success: true, versions })
    }

    const academicYearId = searchParams.get("academicYearId") || ""
    const grade = searchParams.get("grade") || ""
    const evaluationPeriod = searchParams.get("evaluationPeriod") || ""
    const configType = searchParams.get("configType") || ""
    const program = searchParams.get("program") || ""
    const includeInactive = searchParams.get("includeInactive") === "true"

    const where: any = {}
    if (academicYearId) where.academicYearId = academicYearId
    if (grade && grade !== "ALL") where.grade = grade
    if (evaluationPeriod && evaluationPeriod !== "ALL") where.evaluationPeriod = evaluationPeriod
    if (configType && configType !== "ALL") where.configType = configType
    if (program && program !== "ALL") where.program = program
    if (!includeInactive) where.isActive = true

    const configs = await prisma.subjectGradeConfig.findMany({
      where,
      include: {
        subject: true,
        academicYear: true,
        versions: {
          orderBy: { version: "desc" },
          take: 5,
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ success: true, configs })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Vui lòng đăng nhập" }, { status: 401 })
    }
    const role = ((session.user as any)?.role || "").toUpperCase().trim()
    if (!CONFIG_ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden: Bạn không có quyền cấu hình sổ điểm" }, { status: 403 })
    }

    const userId = (session.user as any)?.id || null
    const userName = (session.user as any)?.name || (session.user as any)?.fullName || (session.user as any)?.email || "Quản trị viên"

    const body = await request.json()
    const {
      academicYearId,
      program = "ALL",
      grade = "ALL",
      subjectId = null,
      batchSubjectIds = null,
      batchTargets = null, // Array<{ subjectId: string; grade: string; evaluationPeriod: string; program?: string }>
      previewOnly = false,
      skipConfirmedExceptions = true,
      evaluationPeriod = "ALL",
      configType = "INTERNAL",
      columnCount = 1,
      columnNames = [],
      columnTypes = [],
      columnMaxScores = [],
      columnsJson = null,
      hasCompositeColumn = true,
      compositeColumnName = "Điểm thành phần",
      hasRatingColumn = false,
      ratingColumnName = "Xếp loại",
      ratingScaleJson = null,
      hasRemarkColumn = true,
      confirmationStatus = "CONFIRMED",
      formula = "AVERAGE",
      formulaCustom = null,
      weights = null,
      roundingRule = "ROUND_1",
      changeNote = "",
    } = body

    if (!academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin Năm học" }, { status: 400 })
    }

    const normalizedConfigType = configType === "VNEDU" ? "VNEDU" : "INTERNAL"
    const normalizedProgram = String(program || "ALL").trim() || "ALL"
    const columnNamesStr = typeof columnNames === "string" ? columnNames : JSON.stringify(columnNames)
    const columnTypesStr = typeof columnTypes === "string" ? columnTypes : JSON.stringify(columnTypes)
    const columnMaxScoresStr = typeof columnMaxScores === "string" ? columnMaxScores : JSON.stringify(columnMaxScores)
    const columnsJsonStr = columnsJson ? (typeof columnsJson === "string" ? columnsJson : JSON.stringify(columnsJson)) : null
    const ratingScaleStr = ratingScaleJson ? (typeof ratingScaleJson === "string" ? ratingScaleJson : JSON.stringify(ratingScaleJson)) : null
    const weightsStr = weights ? (typeof weights === "string" ? weights : JSON.stringify(weights)) : null

    // Helper to upsert a single scope with versioning & conflict protection
    const upsertScopeConfig = async (scope: {
      targetProgram: string
      targetGrade: string
      targetSubjectId: string | null
      targetPeriod: string
      data: any
    }) => {
      const existing = await prisma.subjectGradeConfig.findFirst({
        where: {
          academicYearId,
          program: scope.targetProgram,
          grade: scope.targetGrade,
          subjectId: scope.targetSubjectId,
          evaluationPeriod: scope.targetPeriod,
          configType: normalizedConfigType,
          isActive: true,
        },
      })

      if (existing) {
        const nextVersion = (existing.version || 1) + 1
        const updated = await prisma.subjectGradeConfig.update({
          where: { id: existing.id },
          data: {
            ...scope.data,
            version: nextVersion,
            updatedById: userId,
            updatedByName: userName,
            changeNote: changeNote || `Cập nhật phiên bản ${nextVersion}`,
          },
          include: { subject: true },
        })
        await prisma.subjectGradeConfigVersion.create({
          data: {
            configId: updated.id,
            version: nextVersion,
            snapshotJson: buildSnapshotJson(updated),
            changedById: userId,
            changedByName: userName,
            changeNote: changeNote || `Cập nhật phiên bản ${nextVersion}`,
          },
        })
        return { action: "UPDATED", config: updated }
      } else {
        const created = await prisma.subjectGradeConfig.create({
          data: {
            academicYearId,
            program: scope.targetProgram,
            grade: scope.targetGrade,
            subjectId: scope.targetSubjectId,
            evaluationPeriod: scope.targetPeriod,
            configType: normalizedConfigType,
            ...scope.data,
            version: 1,
            isActive: true,
            updatedById: userId,
            updatedByName: userName,
            changeNote: changeNote || "Khởi tạo cấu hình v1",
          },
          include: { subject: true },
        })
        await prisma.subjectGradeConfigVersion.create({
          data: {
            configId: created.id,
            version: 1,
            snapshotJson: buildSnapshotJson(created),
            changedById: userId,
            changedByName: userName,
            changeNote: changeNote || "Khởi tạo cấu hình v1",
          },
        })
        return { action: "CREATED", config: created }
      }
    }

    // Mode 1: Batch targets (copy & apply across matrix with preview & exception protection)
    if (Array.isArray(batchTargets) && batchTargets.length > 0) {
      const subjectIds = Array.from(new Set(batchTargets.map((t: any) => t.subjectId).filter(Boolean))) as string[]
      const subjectsList = await prisma.subject.findMany({ where: { id: { in: subjectIds } } })
      const subjectMap = new Map(subjectsList.map(s => [s.id, s]))

      const previewRows: any[] = []
      const appliedConfigs: any[] = []

      for (const t of batchTargets) {
        const tSubId = t.subjectId || null
        const tGrade = String(t.grade || grade)
        const tPeriod = String(t.evaluationPeriod || evaluationPeriod)
        const tProg = String(t.program || normalizedProgram)
        const subj = tSubId ? subjectMap.get(tSubId) : null
        const gradeNum = extractGradeNumber(tGrade)

        // Guardrail: Primary English Grade 1 & 2 cannot copy Grade 3-5 score columns automatically
        if (
          normalizedConfigType === "VNEDU" &&
          subj &&
          isEnglishSubjectName(subj.subjectName) &&
          (gradeNum === 1 || gradeNum === 2) &&
          Number(columnCount) > 0
        ) {
          previewRows.push({
            subjectId: tSubId,
            subjectName: subj.subjectName,
            grade: tGrade,
            evaluationPeriod: tPeriod,
            status: "BLOCKED",
            reason: "Không sao chép cột điểm Khối 3–5 sang Tiếng Anh Khối 1–2",
          })
          continue
        }

        // Guardrail: Never overwrite confirmed exceptions when skipConfirmedExceptions is true
        const existing = await prisma.subjectGradeConfig.findFirst({
          where: {
            academicYearId,
            program: tProg,
            grade: tGrade,
            subjectId: tSubId,
            evaluationPeriod: tPeriod,
            configType: normalizedConfigType,
            isActive: true,
          },
        })

        if (existing && skipConfirmedExceptions && existing.confirmationStatus === "CONFIRMED") {
          const isEnglishG3Gk1 = subj && isEnglishSubjectName(subj.subjectName) && gradeNum === 3 && tPeriod === "GK1"
          if (isEnglishG3Gk1 || existing.subjectId !== null) {
            previewRows.push({
              subjectId: tSubId,
              subjectName: subj?.subjectName || "Mẫu chung",
              grade: tGrade,
              evaluationPeriod: tPeriod,
              status: "SKIPPED_CONFIRMED",
              reason: "Giữ nguyên ngoại lệ / cấu hình đã xác nhận",
            })
            continue
          }
        }

        previewRows.push({
          subjectId: tSubId,
          subjectName: subj?.subjectName || "Mẫu chung",
          grade: tGrade,
          evaluationPeriod: tPeriod,
          status: existing ? "WILL_UPDATE" : "WILL_CREATE",
          reason: existing ? `Cập nhật lên v${(existing.version || 1) + 1}` : "Tạo mới cấu hình v1",
        })

        if (!previewOnly) {
          const res = await upsertScopeConfig({
            targetProgram: tProg,
            targetGrade: tGrade,
            targetSubjectId: tSubId,
            targetPeriod: tPeriod,
            data: {
              columnCount: Number(columnCount),
              columnNames: columnNamesStr,
              columnTypes: columnTypesStr,
              columnMaxScores: columnMaxScoresStr,
              columnsJson: columnsJsonStr,
              hasCompositeColumn: Boolean(hasCompositeColumn),
              compositeColumnName: compositeColumnName || "Điểm thành phần",
              hasRatingColumn: Boolean(hasRatingColumn),
              ratingColumnName: ratingColumnName || "Xếp loại",
              ratingScaleJson: ratingScaleStr,
              hasRemarkColumn: Boolean(hasRemarkColumn),
              confirmationStatus: confirmationStatus === "UNCONFIRMED" ? "UNCONFIRMED" : "CONFIRMED",
              formula,
              formulaCustom: formulaCustom || null,
              weights: weightsStr,
              roundingRule: roundingRule || "ROUND_1",
            },
          })
          appliedConfigs.push(res.config)
        }
      }

      let recalculatedCount = 0
      if (!previewOnly) {
        for (const cfg of appliedConfigs) {
          recalculatedCount += await recalculateGradeEntriesForConfig(cfg).catch(() => 0)
        }
      }

      return NextResponse.json({
        success: true,
        previewOnly,
        previewRows,
        count: appliedConfigs.length,
        recalculatedCount,
        configs: appliedConfigs,
      })
    }

    // Mode 2: Legacy batchSubjectIds (kept compatible)
    if (batchSubjectIds && Array.isArray(batchSubjectIds) && batchSubjectIds.length > 0) {
      const { keepExistingTemplates = false } = body
      const results = []
      for (const subId of batchSubjectIds) {
        const targetSubId = subId && subId !== "ALL" ? subId : null
        let payloadData: any = {
          columnCount: Number(columnCount),
          columnNames: columnNamesStr,
          columnTypes: columnTypesStr,
          columnMaxScores: columnMaxScoresStr,
          columnsJson: columnsJsonStr,
          hasCompositeColumn: Boolean(hasCompositeColumn),
          compositeColumnName: compositeColumnName || "Điểm thành phần",
          hasRatingColumn: Boolean(hasRatingColumn),
          ratingColumnName: ratingColumnName || "Xếp loại",
          ratingScaleJson: ratingScaleStr,
          hasRemarkColumn: Boolean(hasRemarkColumn),
          confirmationStatus: confirmationStatus === "UNCONFIRMED" ? "UNCONFIRMED" : "CONFIRMED",
          formula,
          formulaCustom: formulaCustom || null,
          weights: weightsStr,
          roundingRule: roundingRule || "ROUND_1",
        }

        if (keepExistingTemplates && targetSubId) {
          const refConfig = await prisma.subjectGradeConfig.findFirst({
            where: {
              academicYearId,
              program: normalizedProgram,
              grade,
              subjectId: targetSubId,
              evaluationPeriod: "ALL",
              configType: normalizedConfigType,
              isActive: true,
            },
          })
          if (refConfig) {
            payloadData = {
              columnCount: refConfig.columnCount,
              columnNames: refConfig.columnNames,
              columnTypes: refConfig.columnTypes,
              columnMaxScores: refConfig.columnMaxScores,
              columnsJson: refConfig.columnsJson,
              hasCompositeColumn: refConfig.hasCompositeColumn,
              compositeColumnName: refConfig.compositeColumnName || "Điểm thành phần",
              hasRatingColumn: refConfig.hasRatingColumn,
              ratingColumnName: refConfig.ratingColumnName || "Xếp loại",
              ratingScaleJson: refConfig.ratingScaleJson,
              hasRemarkColumn: refConfig.hasRemarkColumn,
              confirmationStatus: refConfig.confirmationStatus || "CONFIRMED",
              formula: refConfig.formula || "AVERAGE",
              formulaCustom: refConfig.formulaCustom,
              weights: refConfig.weights,
              roundingRule: refConfig.roundingRule || "ROUND_1",
            }
          }
        }

        const res = await upsertScopeConfig({
          targetProgram: normalizedProgram,
          targetGrade: grade,
          targetSubjectId: targetSubId,
          targetPeriod: evaluationPeriod,
          data: payloadData,
        })
        results.push(res.config)
      }
      let recalculatedCount = 0
      for (const cfg of results) {
        recalculatedCount += await recalculateGradeEntriesForConfig(cfg).catch(() => 0)
      }
      return NextResponse.json({ success: true, count: results.length, recalculatedCount, configs: results })
    }

    // Mode 3: Single scope create/update
    const targetSubjectId = subjectId && subjectId !== "ALL" ? subjectId : null

    // Enforce Primary English Grade 3 GK1 preset check if requested as preset
    if (normalizedConfigType === "VNEDU" && targetSubjectId) {
      const subj = await prisma.subject.findUnique({ where: { id: targetSubjectId }, select: { subjectName: true } })
      if (subj && isEnglishSubjectName(subj.subjectName)) {
        const preset = getPrimaryEnglishVnEduPreset(grade, evaluationPeriod)
        if (preset && extractGradeNumber(grade) === 3 && evaluationPeriod === "GK1" && body.applyPreset) {
          const cols = normalizeGradeColumnDefs({ columnsJson: JSON.stringify(preset.columns) })
          const res = await upsertScopeConfig({
            targetProgram: normalizedProgram,
            targetGrade: grade,
            targetSubjectId,
            targetPeriod: evaluationPeriod,
            data: {
              columnCount: 0,
              columnNames: "[]",
              columnTypes: "[]",
              columnMaxScores: "[]",
              columnsJson: JSON.stringify(cols),
              hasCompositeColumn: false,
              compositeColumnName: "",
              hasRatingColumn: true,
              ratingColumnName: "XL GK1",
              ratingScaleJson: preset.ratingScaleJson,
              hasRemarkColumn: true,
              confirmationStatus: "CONFIRMED",
              formula: "AVERAGE",
              formulaCustom: null,
              weights: null,
              roundingRule: "ROUND_1",
            },
          })
          const recalculatedCount = await recalculateGradeEntriesForConfig(res.config).catch(() => 0)

    return NextResponse.json({ success: true, recalculatedCount, config: res.config })
        }
      }
    }

    const res = await upsertScopeConfig({
      targetProgram: normalizedProgram,
      targetGrade: grade,
      targetSubjectId,
      targetPeriod: evaluationPeriod,
      data: {
        columnCount: Number(columnCount),
        columnNames: columnNamesStr,
        columnTypes: columnTypesStr,
        columnMaxScores: columnMaxScoresStr,
        columnsJson: columnsJsonStr,
        hasCompositeColumn: Boolean(hasCompositeColumn),
        compositeColumnName: compositeColumnName || "Điểm thành phần",
        hasRatingColumn: Boolean(hasRatingColumn),
        ratingColumnName: ratingColumnName || "Xếp loại",
        ratingScaleJson: ratingScaleStr,
        hasRemarkColumn: Boolean(hasRemarkColumn),
        confirmationStatus: confirmationStatus === "UNCONFIRMED" ? "UNCONFIRMED" : "CONFIRMED",
        formula,
        formulaCustom: formulaCustom || null,
        weights: weightsStr,
        roundingRule: roundingRule || "ROUND_1",
      },
    })

    const recalculatedCount = await recalculateGradeEntriesForConfig(res.config).catch(() => 0)

    return NextResponse.json({ success: true, recalculatedCount, config: res.config })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Vui lòng đăng nhập" }, { status: 401 })
    }
    const role = ((session.user as any)?.role || "").toUpperCase().trim()
    const isAllowed = ["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN", "KT_DBCL", "KHAO_THI"].includes(role)
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: "Forbidden: Bạn không có quyền xóa cấu hình sổ điểm" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const singleId = searchParams.get("id")
    const idsParam = searchParams.get("ids")

    let targetIds: string[] = []
    if (idsParam) {
      targetIds = idsParam.split(",").map(s => s.trim()).filter(Boolean)
    } else if (singleId) {
      targetIds = [singleId.trim()]
    } else {
      try {
        const body = await request.json()
        if (Array.isArray(body?.ids)) {
          targetIds = body.ids.map((s: any) => String(s || "").trim()).filter(Boolean)
        } else if (body?.id) {
          targetIds = [String(body.id).trim()]
        }
      } catch {
        // ignore empty body
      }
    }

    targetIds = Array.from(new Set(targetIds))
    if (targetIds.length === 0) {
      return NextResponse.json({ success: false, error: "Thiếu ID cấu hình cần xóa" }, { status: 400 })
    }

    if (targetIds.length === 1) {
      const id = targetIds[0]
      const linkedEntriesCount = await prisma.subjectGradeEntry.count({ where: { configId: id } })
      if (linkedEntriesCount > 0) {
        await prisma.subjectGradeConfig.update({
          where: { id },
          data: { isActive: false, status: "ARCHIVED" },
        })
        return NextResponse.json({
          success: true,
          archived: true,
          count: 1,
          message: "Cấu hình đã có dữ liệu điểm nên được chuyển sang lưu trữ (không xóa dữ liệu cũ).",
        })
      }
      await prisma.subjectGradeConfig.delete({ where: { id } })
      return NextResponse.json({ success: true, count: 1, message: "Đã xóa cấu hình thành công." })
    }

    // Bulk delete / archive for multiple IDs
    const linkedEntries = await prisma.subjectGradeEntry.groupBy({
      by: ["configId"],
      where: { configId: { in: targetIds } },
      _count: { _all: true },
    })
    const idsWithEntries = new Set(linkedEntries.map(g => g.configId).filter(Boolean) as string[])
    const idsToArchive = targetIds.filter(id => idsWithEntries.has(id))
    const idsToDelete = targetIds.filter(id => !idsWithEntries.has(id))

    if (idsToArchive.length > 0) {
      await prisma.subjectGradeConfig.updateMany({
        where: { id: { in: idsToArchive } },
        data: { isActive: false, status: "ARCHIVED" },
      })
    }
    if (idsToDelete.length > 0) {
      await prisma.subjectGradeConfig.deleteMany({
        where: { id: { in: idsToDelete } },
      })
    }

    return NextResponse.json({
      success: true,
      count: targetIds.length,
      deletedCount: idsToDelete.length,
      archivedCount: idsToArchive.length,
      message:
        idsToArchive.length > 0
          ? `Đã xử lý ${targetIds.length} cấu hình (${idsToDelete.length} xóa hẳn, ${idsToArchive.length} chuyển lưu trữ do đã có điểm).`
          : `Đã xóa ${targetIds.length} cấu hình thành công.`,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
