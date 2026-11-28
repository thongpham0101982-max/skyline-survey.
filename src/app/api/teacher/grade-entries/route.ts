// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import {
  buildPrimaryVnEduDefaultConfig,
  buildSecondaryTt22VnEduDefaultConfig,
  findExactPeriodInternalOverrideConfig,
  isKsdnEvaluationPeriod,
  isPrimaryGrade,
  resolveGradeConfigForScope,
} from "@/lib/grading/vnedu-config-types"
import { resolveVnEduCodeMap } from "@/lib/grading/vnedu-code-resolver"
import { isPrivilegedGradebookRole, writeSecurityAuditLog } from "@/lib/security-guard"
import {
  computeCompositeFromComponentScores,
  shouldAutoComputeFormulaComposite,
} from "@/lib/grading/formula-calculator"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập để truy cập sổ điểm" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const academicYearId = searchParams.get("academicYearId") || ""
    const classId = searchParams.get("classId") || ""
    const subjectId = searchParams.get("subjectId") || ""
    const evaluationPeriod = searchParams.get("evaluationPeriod") || "KSĐN"
    const isKsdn = isKsdnEvaluationPeriod(evaluationPeriod)
    // Kỳ Khảo sát đầu năm (KSĐN) luôn lấy cấu hình các môn theo "2. Đánh giá nội bộ Sky-Line" (INTERNAL)
    const configType = isKsdn
      ? "INTERNAL"
      : (searchParams.get("configType") || "INTERNAL").toUpperCase() === "VNEDU"
      ? "VNEDU"
      : "INTERNAL"

    let teacher = null
    let userId = (session?.user as any)?.id
    if (userId) {
      teacher = await prisma.teacher.findUnique({ where: { userId } })
    }

    const userRole = ((session?.user as any)?.role || "").toUpperCase().trim()
    const userRoles = Array.isArray((session?.user as any)?.roles) ? (session?.user as any).roles : []
    if (userRole === "PARENT") {
      return NextResponse.json({ success: false, error: "Phụ huynh không có quyền truy cập phân hệ sổ điểm giáo viên" }, { status: 403 })
    }
    const isPrivileged = isPrivilegedGradebookRole(userRole, userRoles)

    // Action 1: Get list of assigned classes & subjects for teacher
    if (action === "getAssignments") {
      let teachingAssignments: any[] = []
      let availableClasses: any[] = []
      let availableSubjects: any[] = []

      if (teacher) {
        teachingAssignments = await prisma.teachingAssignment.findMany({
          where: academicYearId ? { teacherId: teacher.id, academicYearId } : { teacherId: teacher.id },
          include: { class: true, subject: true }
        })
      }

      if (teachingAssignments.length > 0) {
        const classMap = new Map()
        const subjectMap = new Map()
        teachingAssignments.forEach(ta => {
          if (ta.class) classMap.set(ta.class.id, ta.class)
          if (ta.subject) subjectMap.set(ta.subject.id, ta.subject)
        })
        availableClasses = Array.from(classMap.values())
        availableSubjects = Array.from(subjectMap.values())
      }

      // If privileged user has no personal teaching assignments, load all active classes and subjects
      if (isPrivileged && availableClasses.length === 0) {
        availableClasses = await prisma.class.findMany({
          where: academicYearId ? { academicYearId, status: "ACTIVE" } : { status: "ACTIVE" },
          orderBy: { className: "asc" }
        })
        availableSubjects = await prisma.subject.findMany({
          where: { status: "ACTIVE" },
          orderBy: { subjectName: "asc" }
        })
      }

      const ksdnConfigs = await prisma.subjectGradeConfig.findMany({
        where: {
          ...(academicYearId ? { academicYearId } : {}),
          OR: [
            { evaluationPeriod: { in: ["KSĐN", "KSDN", "ALL"] }, configType: "INTERNAL" },
            { grade: { in: ["Khối 5", "5"] }, evaluationPeriod: { in: ["KSĐN", "KSDN", "ALL", "GK1"] } },
          ],
          isActive: true,
        },
        select: { subjectId: true, grade: true, evaluationPeriod: true },
      }).catch(() => [])

      return NextResponse.json({
        success: true,
        assignments: teachingAssignments,
        classes: availableClasses,
        subjects: availableSubjects,
        ksdnConfigs,
      })
    }

    // Action 2: Get grade entries for specific classId + subjectId + evaluationPeriod
    if (!classId || !subjectId) {
      return NextResponse.json({ success: true, students: [], config: null, entries: [] })
    }

    // Verify teacher assignment for this class & subject ONLY IF user is strictly a regular teacher and NOT in management mode
    if (teacher && !isPrivileged && userRole === "TEACHER") {
      const isAssigned = await prisma.teachingAssignment.findFirst({
        where: {
          teacherId: teacher.id,
          classId,
          subjectId,
          ...(academicYearId ? { academicYearId } : {})
        }
      })
      if (!isAssigned) {
        return NextResponse.json({ success: true, students: [], config: null, entries: [], unassigned: true })
      }
    }

    const targetClass = await prisma.class.findUnique({ where: { id: classId } })
    if (!targetClass) {
      return NextResponse.json({ success: false, error: "Lớp học không tồn tại" }, { status: 404 })
    }

    const classGrade = targetClass.grade || targetClass.className || "ALL"
    const targetAcademicYearId = academicYearId || targetClass.academicYearId

    // Extract normalized grade numbers for accurate matching
    let rawGrade = (targetClass.grade || "").trim()
    if (!rawGrade && targetClass.className) {
      const match = targetClass.className.match(/^(\d+)/)
      if (match) rawGrade = match[1]
    }
    const numMatch = rawGrade.match(/(\d+)/)
    const gradeNum = numMatch ? numMatch[1] : ""
    // Với Khối 6 KSĐN: các môn khảo sát lấy ở Tiểu học của Khối 5
    const candidateGrades = Array.from(new Set([
      rawGrade,
      `Khối ${gradeNum}`,
      `Khoi ${gradeNum}`,
      gradeNum,
      ...(isKsdn && gradeNum === "6" ? ["Khối 5", "Khoi 5", "5"] : []),
      "ALL"
    ].filter(Boolean)))

    const isSecondaryVnEdu = configType === "VNEDU" && !isPrimaryGrade(rawGrade || targetClass.className)
    const evalUpper = String(evaluationPeriod || "").toUpperCase().trim()
    const isSem1VnEdu = isSecondaryVnEdu && (evalUpper === "GK1" || evalUpper === "CK1" || evalUpper === "HK1")
    const isSem2VnEdu = isSecondaryVnEdu && (evalUpper === "GK2" || evalUpper === "CK2" || evalUpper === "HK2")

    const periodQueryList = isKsdn
      ? gradeNum === "5" || gradeNum === "6"
        ? ["KSĐN", "KSDN", "ALL", "GK1"]
        : ["KSĐN", "KSDN", "ALL"]
      : isSem1VnEdu
      ? [evaluationPeriod, "CK1", "GK1", "HK1", "ALL"]
      : isSem2VnEdu
      ? [evaluationPeriod, "CK2", "GK2", "HK2", "ALL"]
      : [evaluationPeriod, "ALL"]
    const entryPeriodList = isKsdn
      ? ["KSĐN", "KSDN"]
      : isSem1VnEdu
      ? [evaluationPeriod, "CK1", "GK1", "HK1"]
      : isSem2VnEdu
      ? [evaluationPeriod, "CK2", "GK2", "HK2"]
      : [evaluationPeriod]

    // Fetch evaluation configs, students, teaching assignment, homeroom teacher, locks, and unlock request concurrently
    const [configs, studentsRaw, assignment, clsObj, locks, unlockRequest] = await Promise.all([
      prisma.subjectGradeConfig.findMany({
        where: {
          academicYearId: targetAcademicYearId,
          evaluationPeriod: { in: periodQueryList },
          subjectId,
          grade: { in: candidateGrades },
          isActive: true,
        }
      }),
      prisma.student.findMany({
        where: {
          classId,
          status: "ACTIVE"
        },
        orderBy: { studentName: "asc" },
        select: { id: true, studentCode: true, vnEduCode: true, studentName: true, gender: true, dateOfBirth: true }
      }).catch(() =>
        prisma.student.findMany({
          where: {
            classId,
            status: "ACTIVE"
          },
          orderBy: { studentName: "asc" },
          select: { id: true, studentCode: true, studentName: true, gender: true, dateOfBirth: true }
        })
      ),
      prisma.teachingAssignment.findFirst({
        where: {
          classId,
          subjectId,
          academicYearId: targetAcademicYearId
        },
        include: { teacher: true }
      }),
      prisma.class.findUnique({
        where: { id: classId },
        select: { homeroomTeacherId: true }
      }),
      prisma.gradebookLock.findMany({
        where: {
          academicYearId: targetAcademicYearId,
          evaluationPeriod: isKsdn ? { in: ["KSĐN", "KSDN"] } : evaluationPeriod,
          OR: [
            { classId, subjectId },
            { classId: "ALL", subjectId: "ALL" }
          ]
        }
      }),
      prisma.gradebookUnlockRequest.findFirst({
        where: {
          academicYearId: targetAcademicYearId,
          evaluationPeriod: { in: entryPeriodList },
          classId,
          subjectId,
          status: { not: "CANCELLED" }
        },
        orderBy: { requestedAt: "desc" }
      })
    ])

    // Enrich students with vnEduCode (read-only from Student.vnEduCode or StudentCodeMapping across academic years)
    const studentCodesForMapping = studentsRaw.map(s => s.studentCode).filter(Boolean)
    const vnEduMappingByDbCode = await resolveVnEduCodeMap(studentCodesForMapping, targetAcademicYearId)
    const students = studentsRaw.map(s => ({
      ...s,
      vnEduCode: s.vnEduCode || vnEduMappingByDbCode.get(s.studentCode) || null
    }))

    let config = resolveGradeConfigForScope(configs, {
      academicYearId: targetAcademicYearId,
      program: targetClass.educationSystem || "ALL",
      grade: rawGrade || targetClass.className || "ALL",
      subjectId,
      evaluationPeriod,
      configType
    })

    // Nếu quản trị viên đã cấu hình tường minh đúng (Môn + Khối + Kỳ) ở "2. Đánh giá nội bộ Sky-Line" (INTERNAL),
    // tự động ưu tiên cấu hình đó khi VNEDU chưa lưu hoặc cấu hình INTERNAL được cập nhật mới hơn.
    // Tuyệt đối không lấy nhầm mẫu chung (ALL / subjectId == null / KSĐN).
    if (configType === "VNEDU" && !isKsdn) {
      const exactInternal = findExactPeriodInternalOverrideConfig(configs, {
        academicYearId: targetAcademicYearId,
        program: targetClass.educationSystem || "ALL",
        grade: rawGrade || targetClass.className || "ALL",
        subjectId,
        evaluationPeriod,
      })
      if (exactInternal) {
        const vnTime = config?.updatedAt ? new Date(config.updatedAt).getTime() : 0
        const intTime = exactInternal.updatedAt ? new Date(exactInternal.updatedAt).getTime() : 0
        if (!config || intTime > vnTime) {
          config = exactInternal
        }
      }
    }

    // Chỉ fallback sang cấu hình bên kia đối với kỳ KSĐN hoặc chế độ INTERNAL (khi ở chế độ VNEDU cho các kỳ GK1/CK1/GK2/CK2/CN thì giữ nguyên chuẩn VNEDU TT27/TT22, tuyệt đối không lấy nhầm mẫu INTERNAL chung)
    if (!config && (isKsdn || configType === "INTERNAL")) {
      config = resolveGradeConfigForScope(configs, {
        academicYearId: targetAcademicYearId,
        program: targetClass.educationSystem || "ALL",
        grade: rawGrade || targetClass.className || "ALL",
        subjectId,
        evaluationPeriod,
        configType: configType === "VNEDU" ? "INTERNAL" : "VNEDU"
      })
    }

    if (!config && (isKsdn || configType === "INTERNAL")) {
      const generalConfigs = await prisma.subjectGradeConfig.findMany({
        where: {
          academicYearId: targetAcademicYearId,
          evaluationPeriod: { in: periodQueryList },
          subjectId: null,
          grade: { in: candidateGrades },
          isActive: true,
          configType: "INTERNAL"
        }
      })
      config = resolveGradeConfigForScope(generalConfigs, {
        academicYearId: targetAcademicYearId,
        program: targetClass.educationSystem || "ALL",
        grade: rawGrade || targetClass.className || "ALL",
        subjectId,
        evaluationPeriod,
        configType: "INTERNAL"
      })
    }

    let assignedTeacher = assignment?.teacher?.teacherName || ""
    if (!assignedTeacher && clsObj?.homeroomTeacherId) {
      const hr = await prisma.teacher.findUnique({ where: { id: clsObj.homeroomTeacherId } })
      assignedTeacher = hr?.teacherName || "Chưa phân công"
    } else if (!assignedTeacher) {
      assignedTeacher = "Chưa phân công"
    }

    // Hierarchical lock check: specific class+subject lock overrides period-wide lock
    const specificLock = (locks || []).find(l => l.classId === classId && l.subjectId === subjectId)
    const periodLock = (locks || []).find(l => l.classId === "ALL" && l.subjectId === "ALL" && Boolean(l.isLocked))

    let isLocked = false
    let lockInfo = null
    if (specificLock !== undefined) {
      isLocked = Boolean(specificLock.isLocked)
      lockInfo = specificLock.isLocked ? specificLock : null
    } else if (periodLock) {
      isLocked = true
      lockInfo = periodLock
    }

    const studentIds = students.map(s => s.id)

    // Get existing grade entries for this class and its active students
    let entries = await prisma.subjectGradeEntry.findMany({
      where: {
        academicYearId: targetAcademicYearId,
        subjectId,
        evaluationPeriod: { in: entryPeriodList },
        configType,
        OR: [
          { classId },
          { studentId: { in: studentIds } }
        ]
      }
    })

    if (entries.length === 0) {
      entries = await prisma.subjectGradeEntry.findMany({
        where: {
          academicYearId: targetAcademicYearId,
          subjectId,
          evaluationPeriod: { in: entryPeriodList },
          OR: [
            { classId },
            { studentId: { in: studentIds } }
          ]
        }
      })
    }

    // Với Khối 6 KSĐN: nếu đang chọn môn Tiếng Việt (TVI — Tiểu học K5) mà dữ liệu KSĐN trước đó lưu ở mã môn Ngữ Văn (NVA) hoặc ngược lại, tự động nạp dữ liệu điểm
    if (entries.length === 0 && isKsdn && gradeNum === "6" && studentIds.length > 0) {
      const currentSubj = await prisma.subject.findUnique({
        where: { id: subjectId },
        select: { subjectCode: true, subjectName: true },
      })
      const sCode = String(currentSubj?.subjectCode || "").toUpperCase().trim()
      const counterpartCodes =
        sCode === "TVI" ? ["NVA", "VAN"] : sCode === "NVA" || sCode === "VAN" ? ["TVI"] : []
      if (counterpartCodes.length > 0) {
        const counterpartSubjs = await prisma.subject.findMany({
          where: { subjectCode: { in: counterpartCodes } },
          select: { id: true },
        })
        const counterpartIds = counterpartSubjs.map(s => s.id)
        if (counterpartIds.length > 0) {
          entries = await prisma.subjectGradeEntry.findMany({
            where: {
              academicYearId: targetAcademicYearId,
              subjectId: { in: counterpartIds },
              evaluationPeriod: { in: entryPeriodList },
              OR: [{ classId }, { studentId: { in: studentIds } }],
            },
          })
        }
      }
    }

    // When THCS/THPT VNEDU queries across ["CK1", "GK1", "HK1"] or ["CK2", "GK2", "HK2"], merge entries per student
    if ((isSem1VnEdu || isSem2VnEdu) && entries.length > 0) {
      const mergedByStudent = new Map<string, any>()
      // Sort so non-exact periods come first, and exact requested evaluationPeriod + newer updatedAt win on conflicts
      const sortedEntries = [...entries].sort((a, b) => {
        const aExact = a.evaluationPeriod === evaluationPeriod ? 1 : 0
        const bExact = b.evaluationPeriod === evaluationPeriod ? 1 : 0
        if (aExact !== bExact) return aExact - bExact
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return aTime - bTime
      })
      for (const e of sortedEntries) {
        let comp: Record<string, any> = {}
        if (e.componentScores) {
          try {
            comp = typeof e.componentScores === "string" ? JSON.parse(e.componentScores) : { ...e.componentScores }
          } catch {
            comp = {}
          }
        }
        const prev = mergedByStudent.get(e.studentId)
        if (!prev) {
          mergedByStudent.set(e.studentId, {
            ...e,
            _compObj: comp,
          })
        } else {
          const nextComp = { ...prev._compObj }
          for (const [k, v] of Object.entries(comp)) {
            if (v !== undefined && v !== null && String(v).trim() !== "") {
              nextComp[k] = v
            }
          }
          mergedByStudent.set(e.studentId, {
            ...prev,
            ...e,
            _compObj: nextComp,
            compositeScore:
              e.compositeScore !== null && e.compositeScore !== undefined ? e.compositeScore : prev.compositeScore,
            ratingValue: e.ratingValue || prev.ratingValue,
            remark: e.remark || prev.remark,
          })
        }
      }
      entries = Array.from(mergedByStudent.values()).map(({ _compObj, ...rest }) => ({
        ...rest,
        componentScores: JSON.stringify(_compObj),
      }))
    }

    // Enrich "CN" (Cả năm) entries with TBHK 1 (from CK1/HK1/GK1), TBHK 2 (from CK2/HK2/GK2), and HK2 Remark
    if (String(evaluationPeriod).toUpperCase() === "CN" && studentIds.length > 0) {
      const semesterEntries = await prisma.subjectGradeEntry.findMany({
        where: {
          academicYearId: targetAcademicYearId,
          subjectId,
          evaluationPeriod: { in: ["CK1", "HK1", "GK1", "CK2", "HK2", "GK2"] },
          configType,
          OR: [{ classId }, { studentId: { in: studentIds } }],
        },
      })
      const ck1ByStudent = new Map<string, any>()
      const ck2ByStudent = new Map<string, any>()
      for (const se of semesterEntries) {
        if (se.evaluationPeriod === "CK1" || se.evaluationPeriod === "HK1" || se.evaluationPeriod === "GK1") {
          const prev = ck1ByStudent.get(se.studentId)
          if (!prev || se.evaluationPeriod === "CK1" || (prev.compositeScore == null && se.compositeScore != null)) {
            ck1ByStudent.set(se.studentId, se)
          }
        }
        if (se.evaluationPeriod === "CK2" || se.evaluationPeriod === "HK2" || se.evaluationPeriod === "GK2") {
          const prev = ck2ByStudent.get(se.studentId)
          if (!prev || se.evaluationPeriod === "CK2" || (prev.compositeScore == null && se.compositeScore != null)) {
            ck2ByStudent.set(se.studentId, se)
          }
        }
      }

      const cnByStudent = new Map<string, any>(entries.map(e => [e.studentId, e]))
      const enrichedEntries: any[] = []

      for (const stId of studentIds) {
        const existingCn = cnByStudent.get(stId)
        const ck1 = ck1ByStudent.get(stId)
        const ck2 = ck2ByStudent.get(stId)

        let compObj: Record<string, any> = {}
        if (existingCn?.componentScores) {
          try {
            compObj =
              typeof existingCn.componentScores === "string"
                ? JSON.parse(existingCn.componentScores)
                : { ...existingCn.componentScores }
          } catch {
            compObj = {}
          }
        }

        const hk1Val =
          compObj.tbhk1 ??
          compObj.col0 ??
          (ck1?.compositeScore !== null && ck1?.compositeScore !== undefined
            ? String(ck1.compositeScore)
            : ck1?.ratingValue || "")
        const hk2Val =
          compObj.tbhk2 ??
          compObj.col1 ??
          (ck2?.compositeScore !== null && ck2?.compositeScore !== undefined
            ? String(ck2.compositeScore)
            : ck2?.ratingValue || "")
        const hk2Rem = compObj.hk2Remark ?? ck2?.remark ?? ""

        if (hk1Val !== "") {
          compObj.tbhk1 = String(hk1Val)
          compObj.col0 = String(hk1Val)
        }
        if (hk2Val !== "") {
          compObj.tbhk2 = String(hk2Val)
          compObj.col1 = String(hk2Val)
        }
        if (hk2Rem) {
          compObj.hk2Remark = String(hk2Rem)
        }

        let calcComposite: number | null =
          existingCn?.compositeScore !== null && existingCn?.compositeScore !== undefined
            ? Number(existingCn.compositeScore)
            : null
        let calcRating: string | null = existingCn?.ratingValue || null

        if (calcComposite === null && hk1Val !== "" && hk2Val !== "") {
          const n1 = Number(String(hk1Val).replace(",", "."))
          const n2 = Number(String(hk2Val).replace(",", "."))
          if (!isNaN(n1) && !isNaN(n2)) {
            calcComposite = Math.round(((n1 + 2 * n2) / 3 + Number.EPSILON) * 10) / 10
          } else if (!calcRating && (hk2Val === "Đ" || hk2Val === "CĐ")) {
            calcRating = hk2Val
          }
        }

        if (existingCn || hk1Val !== "" || hk2Val !== "" || hk2Rem !== "") {
          enrichedEntries.push({
            ...(existingCn || {
              id: `virtual_cn_${stId}`,
              academicYearId: targetAcademicYearId,
              classId,
              subjectId,
              evaluationPeriod: "CN",
              configType,
              studentId: stId,
              remark: "",
            }),
            componentScores: JSON.stringify(compObj),
            compositeScore: calcComposite,
            ratingValue: calcRating,
          })
        }
      }
      entries = enrichedEntries
    }

    // Load Homeroom Coordination logs (Transferred from GVCN to GVBM)
    let periodVariants = [evaluationPeriod]
    if (evaluationPeriod === "KSĐN" || evaluationPeriod === "KSDN") {
      periodVariants = ["KSĐN", "KSDN"]
    } else if (evaluationPeriod === "GK1" || evaluationPeriod === "GIUA_KY_1") {
      periodVariants = ["GK1", "GIUA_KY_1"]
    } else if (evaluationPeriod === "CK1" || evaluationPeriod === "CUOI_KY_1") {
      periodVariants = ["CK1", "CUOI_KY_1"]
    } else if (evaluationPeriod === "GK2" || evaluationPeriod === "GIUA_KY_2") {
      periodVariants = ["GK2", "GIUA_KY_2"]
    } else if (evaluationPeriod === "CK2" || evaluationPeriod === "CUOI_KY_2") {
      periodVariants = ["CK2", "CUOI_KY_2"]
    }

    const currentSubject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, subjectName: true, subjectCode: true }
    }).catch(() => null)

    if (!config && configType === "VNEDU" && !isKsdn && isPrimaryGrade(rawGrade || targetClass.className)) {
      config = buildPrimaryVnEduDefaultConfig({
        academicYearId: targetAcademicYearId,
        program: targetClass.educationSystem || "ALL",
        grade: rawGrade || targetClass.className || "Khối 1",
        subjectId,
        subjectName: currentSubject?.subjectName || currentSubject?.subjectCode || "",
        evaluationPeriod,
      }) as any
    } else if (!config && configType === "VNEDU" && !isKsdn) {
      config = buildSecondaryTt22VnEduDefaultConfig({
        academicYearId: targetAcademicYearId,
        program: targetClass.educationSystem || "ALL",
        grade: rawGrade || targetClass.className || "Khối 6",
        subjectId,
        subjectName: currentSubject?.subjectName || currentSubject?.subjectCode || "",
        evaluationPeriod,
      }) as any
    }

    const consultationLogs = await prisma.academicConsultationLog.findMany({
      where: {
        studentId: { in: studentIds },
        academicYearId: targetAcademicYearId,
        OR: periodVariants.flatMap(p => [
          { notes: { contains: `[GradePeriod: ${p}]` } },
          { notes: { contains: `[GradePeriod:${p}]` } },
          { notes: { contains: p } }
        ])
      },
      include: {
        teacher: { select: { id: true, teacherName: true } }
      },
      orderBy: { updatedAt: "desc" }
    }).catch(() => [])

    const homeroomCoordination: Record<string, any> = {}
    consultationLogs.forEach((log: any) => {
      if (!log.nextActions || !log.nextActions.includes("[GVBM_FORWARD:")) return

      const forwardMatch = log.nextActions.match(/\[GVBM_FORWARD:(.*?)\]/)
      if (!forwardMatch) return

      try {
        const forwardedGvbm = JSON.parse(forwardMatch[1])
        // Match by subjectId or subjectName or teacherId
        const isSubjectMatch = (forwardedGvbm.subjectId && forwardedGvbm.subjectId === subjectId) ||
          (currentSubject?.subjectName && forwardedGvbm.subjectName && 
           forwardedGvbm.subjectName.trim().toLowerCase() === currentSubject.subjectName.trim().toLowerCase()) ||
          (teacher?.id && forwardedGvbm.teacherId === teacher.id)

        if (!isSubjectMatch) return

        let gvbmResponse: any = null
        const respMatch = log.nextActions.match(/\[GVBM_RESPONSE:(.*?)\]/)
        if (respMatch) {
          try {
            gvbmResponse = JSON.parse(respMatch[1])
          } catch (_) {}
        }

        let parentFeedback = ""
        if (log.difficulties) {
          parentFeedback = log.difficulties.replace(/^Ý KIẾN PHHS:\s*/i, "").trim()
        }

        let teacherRemark = ""
        if (log.content) {
          teacherRemark = log.content.replace(/^Ý KIẾN GVCN:\s*/i, "").trim()
        }

        if (!homeroomCoordination[log.studentId]) {
          homeroomCoordination[log.studentId] = {
            logId: log.id,
            studentId: log.studentId,
            forwardedGvbm,
            gvbmResponse,
            parentFeedback,
            teacherRemark,
            homeroomTeacherName: log.teacher?.teacherName || "GVCN",
            updatedAt: log.updatedAt
          }
        }
      } catch (_) {}
    })

    // Ensure returned compositeScore always reflects the active formula & roundingRule
    // (protects against stale compositeScore saved before a formula/rounding config change)
    if (shouldAutoComputeFormulaComposite(config, evaluationPeriod) && Array.isArray(entries) && entries.length > 0) {
      entries = entries.map((e: any) => {
        if (!e?.componentScores) return e
        const computed = computeCompositeFromComponentScores(e.componentScores, config)
        if (!computed) return e
        return {
          ...e,
          compositeScore: computed.value,
        }
      })
    }

    return NextResponse.json({
      success: true,
      config,
      students,
      entries,
      assignedTeacher,
      isLocked,
      isPeriodLocked: Boolean(periodLock),
      lockInfo,
      unlockRequest: unlockRequest || null,
      homeroomCoordination
    })

  } catch (error: any) {
    console.error("Lỗi lấy sổ điểm:", error)
    return NextResponse.json({ success: false, error: "Đã xảy ra lỗi khi tải dữ liệu sổ điểm. Vui lòng thử lại sau." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập để thực hiện thao tác này" }, { status: 401 })
    }

    const body = await request.json()
    const {
      academicYearId,
      classId,
      subjectId,
      evaluationPeriod,
      entries,
      configType: rawConfigType = "INTERNAL",
      configId = null,
      configVersion = null
    } = body
    const isKsdn = isKsdnEvaluationPeriod(evaluationPeriod)
    const configType = isKsdn
      ? "INTERNAL"
      : String(rawConfigType).toUpperCase() === "VNEDU"
      ? "VNEDU"
      : "INTERNAL"

    if (!classId || !subjectId || !evaluationPeriod || !Array.isArray(entries)) {
      return NextResponse.json({ success: false, error: "Thiếu dữ liệu sổ điểm" }, { status: 400 })
    }

    const userRole = ((session?.user as any)?.role || "").toUpperCase().trim()
    const userRoles = Array.isArray((session?.user as any)?.roles) ? (session?.user as any).roles : []
    if (userRole === "PARENT") {
      return NextResponse.json({ success: false, error: "Phụ huynh không có quyền chỉnh sửa sổ điểm" }, { status: 403 })
    }
    const isPrivileged = isPrivilegedGradebookRole(userRole, userRoles)

    let targetYearId = academicYearId
    if (!targetYearId && classId) {
      const cls = await prisma.class.findUnique({ where: { id: classId }, select: { academicYearId: true } })
      targetYearId = cls?.academicYearId || ""
    }
    if (!targetYearId) {
      const activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } })
      targetYearId = activeYear?.id || ""
    }
    if (!targetYearId) {
      return NextResponse.json({ success: false, error: "Không xác định được năm học" }, { status: 400 })
    }

    let teacherId = null
    const userId = (session?.user as any)?.id
    let teacher = null
    if (userId) {
      teacher = await prisma.teacher.findUnique({ where: { userId } })
      if (teacher) teacherId = teacher.id
    }

    // Authorization check: non-privileged users must be assigned to teach this class & subject
    if (!isPrivileged) {
      if (!teacher) {
        return NextResponse.json({
          success: false,
          error: "Tài khoản giáo viên không tồn tại trong hệ thống hoặc chưa được liên kết"
        }, { status: 403 })
      }
      const isAssigned = await prisma.teachingAssignment.findFirst({
        where: {
          teacherId: teacher.id,
          classId,
          subjectId,
          academicYearId: targetYearId
        }
      })
      if (!isAssigned) {
        return NextResponse.json({
          success: false,
          error: "Bạn không được phân công giảng dạy môn học này cho lớp đã chọn"
        }, { status: 403 })
      }
    }

    // Check hierarchical lock status before saving
    const postLocks = await prisma.gradebookLock.findMany({
      where: {
        academicYearId: targetYearId,
        evaluationPeriod,
        OR: [
          { classId, subjectId },
          { classId: "ALL", subjectId: "ALL" }
        ]
      }
    })

    const specificLock = (postLocks || []).find(l => l.classId === classId && l.subjectId === subjectId)
    const periodLock = (postLocks || []).find(l => l.classId === "ALL" && l.subjectId === "ALL" && Boolean(l.isLocked))

    let activeLock = null
    if (specificLock !== undefined) {
      if (specificLock.isLocked) activeLock = specificLock
    } else if (periodLock) {
      activeLock = periodLock
    }

    if (activeLock && !isPrivileged) {
      return NextResponse.json({
        success: false,
        error: `Sổ điểm môn này trong kỳ ${evaluationPeriod} đã bị Khóa bởi ${activeLock.lockedBy || "Ban Khảo thí & ĐBCL"}. Bạn không thể chỉnh sửa hoặc lưu điểm lúc này.`
      }, { status: 403 })
    }

    // Validate students belong to this class to preserve data integrity
    const classStudents = await prisma.student.findMany({
      where: { classId, status: "ACTIVE" },
      select: { id: true }
    })
    const validStudentIds = new Set(classStudents.map(s => s.id))

    // Deduplicate entries and ensure student belongs to the class
    const cleanEntriesMap = new Map<string, any>()
    for (const entry of entries) {
      if (entry && entry.studentId) {
        const sId = String(entry.studentId).trim()
        if (validStudentIds.has(sId)) {
          cleanEntriesMap.set(sId, entry)
        }
      }
    }
    const cleanEntries = Array.from(cleanEntriesMap.values())

    if (entries.length > 0 && cleanEntries.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Danh sách học sinh không hợp lệ hoặc không thuộc lớp học này"
      }, { status: 400 })
    }

    // Upsert each grade entry atomically using transaction and compound unique key
    await prisma.$transaction(
      cleanEntries.map(entry => {
        const { studentId, componentScores, compositeScore, ratingValue, remark } = entry
        const parsedComposite =
          compositeScore !== "" && compositeScore !== null && compositeScore !== undefined
            ? parseFloat(compositeScore)
            : null
        const safeComposite = (parsedComposite !== null && !isNaN(parsedComposite)) ? parsedComposite : null
        const safeRating = typeof ratingValue === "string" && ratingValue.trim() ? ratingValue.trim().slice(0, 20) : null

        let compScoresStr = "{}"
        if (componentScores) {
          if (typeof componentScores === "string") {
            try {
              JSON.parse(componentScores)
              compScoresStr = componentScores
            } catch {
              compScoresStr = "{}"
            }
          } else if (typeof componentScores === "object") {
            compScoresStr = JSON.stringify(componentScores)
          }
        }

        return prisma.subjectGradeEntry.upsert({
          where: {
            studentId_subjectId_evaluationPeriod_academicYearId_configType: {
              studentId,
              subjectId,
              evaluationPeriod,
              academicYearId: targetYearId,
              configType
            }
          },
          update: {
            classId, // Always keep classId up to date
            configId: configId || undefined,
            configVersion: configVersion !== null ? Number(configVersion) : undefined,
            componentScores: compScoresStr,
            compositeScore: safeComposite,
            ratingValue: safeRating,
            remark: typeof remark === "string" ? remark.slice(0, 1000) : "",
            sourceType: "MANUAL",
            ...(teacherId ? { teacherId } : {})
          },
          create: {
            academicYearId: targetYearId,
            classId,
            subjectId,
            evaluationPeriod,
            configType,
            configId: configId || null,
            configVersion: configVersion !== null ? Number(configVersion) : null,
            studentId,
            teacherId,
            componentScores: compScoresStr,
            compositeScore: safeComposite,
            ratingValue: safeRating,
            remark: typeof remark === "string" ? remark.slice(0, 1000) : "",
            sourceType: "MANUAL"
          }
        })
      })
    )

    await writeSecurityAuditLog({
      userId: userId || "SYSTEM",
      userEmail: (session?.user as any)?.email || (session?.user as any)?.name || "TEACHER",
      action: "SCORE_UPDATE",
      targetTable: "SubjectGradeEntry",
      targetId: `${classId}:${subjectId}:${evaluationPeriod}`,
      newValues: {
        academicYearId: targetYearId,
        classId,
        subjectId,
        evaluationPeriod,
        configType,
        updatedCount: cleanEntries.length
      }
    })

    // Đồng bộ tự động sang StudentTermScore cho các kỳ cuối kỳ / cả năm (CK1/HK1 -> HK1, CK2/HK2 -> HK2, CN -> CN)
    const periodUpper = String(evaluationPeriod || "").toUpperCase().trim()
    const targetTermSemester =
      periodUpper === "CK1" || periodUpper === "HK1"
        ? "HK1"
        : periodUpper === "CK2" || periodUpper === "HK2"
        ? "HK2"
        : periodUpper === "CN"
        ? "CN"
        : null

    if (targetTermSemester && configType === "VNEDU" && cleanEntries.length > 0) {
      try {
        await prisma.$transaction(
          cleanEntries.map(entry => {
            let comp: Record<string, any> = {}
            if (entry.componentScores) {
              try {
                comp =
                  typeof entry.componentScores === "string"
                    ? JSON.parse(entry.componentScores)
                    : entry.componentScores
              } catch {}
            }
            let scoreVal: number | null =
              entry.compositeScore !== "" &&
              entry.compositeScore !== null &&
              entry.compositeScore !== undefined &&
              !isNaN(Number(entry.compositeScore))
                ? Math.round(Number(entry.compositeScore) * 10) / 10
                : null
            if (scoreVal === null) {
              const rawKt = comp.kt_ck1 ?? comp.kt_ck2 ?? comp.col0 ?? ""
              const parsedKt = parseFloat(String(rawKt).replace(",", "."))
              if (String(rawKt).trim() !== "" && !isNaN(parsedKt)) {
                scoreVal = Math.round(parsedKt * 10) / 10
              }
            }
            const evalGrade =
              String(entry.ratingValue || comp.xl_ck1 || comp.xl_ck2 || "").trim() || null

            return prisma.studentTermScore.upsert({
              where: {
                studentId_subjectId_semester: {
                  studentId: entry.studentId,
                  subjectId,
                  semester: targetTermSemester
                }
              },
              update: {
                score: scoreVal,
                evaluationGrade: evalGrade
              },
              create: {
                studentId: entry.studentId,
                subjectId,
                semester: targetTermSemester,
                score: scoreVal,
                evaluationGrade: evalGrade
              }
            })
          })
        )
      } catch (syncErr) {
        console.warn("Non-fatal warning syncing SubjectGradeEntry to StudentTermScore:", syncErr)
      }
    }

    return NextResponse.json({ success: true, message: "Lưu sổ điểm thành công" })

  } catch (error: any) {
    console.error("Lỗi lưu sổ điểm:", error)
    return NextResponse.json({ success: false, error: "Đã xảy ra lỗi trong quá trình lưu sổ điểm. Vui lòng thử lại sau." }, { status: 500 })
  }
}
