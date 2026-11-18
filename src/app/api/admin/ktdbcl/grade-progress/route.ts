// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { resolveAccountGradebookScope } from "@/lib/gradebook/subjectPermissions"
import { isGradeMatching } from "@/app/admin/ktdbcl/diem-nhan-xet/grade-utils"
import {
  extractGradeNumber,
  getSubjectCurriculumGroup,
  isKsdnEvaluationPeriod
} from "@/lib/grading/vnedu-config-types"

function hasValidEntryData(e: any): boolean {
  if (!e) return false
  if (e.compositeScore !== null && e.compositeScore !== undefined && String(e.compositeScore).trim() !== "" && !isNaN(Number(e.compositeScore))) {
    return true
  }
  if (e.ratingValue && String(e.ratingValue).trim() !== "") {
    return true
  }
  if (e.remark && String(e.remark).trim() !== "") {
    return true
  }
  if (e.componentScores) {
    try {
      const comp = typeof e.componentScores === "string" ? JSON.parse(e.componentScores) : e.componentScores
      if (comp && typeof comp === "object") {
        return Object.values(comp).some(v => v !== null && v !== undefined && String(v).trim() !== "")
      }
    } catch (_) {}
  }
  return false
}

export async function GET(request: Request) {
  try {
    let session = null
    try {
      session = await auth()
    } catch (_) {}
    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get("academicYearId") || ""
    const evaluationPeriod = searchParams.get("evaluationPeriod") || "KSĐN"
    const campusId = searchParams.get("campusId") || "ALL"
    const grade = searchParams.get("grade") || "ALL"
    const subjectIdFilter = searchParams.get("subjectId") || "ALL"
    const status = searchParams.get("status") || "ALL"
    const searchTerm = (searchParams.get("search") || "").trim().toLowerCase()
    const scope = searchParams.get("scope") || "SURVEY" // "SURVEY" | "ALL_ASSIGNED"
    const configTypeFilter = (searchParams.get("configType") || "ALL").toUpperCase() // "ALL" | "VNEDU" | "INTERNAL"

    // Optional student details modal query
    const detailClassId = searchParams.get("detailClassId")
    const detailSubjectId = searchParams.get("detailSubjectId")

    // Determine target academic year
    let targetYearId = academicYearId
    if (!targetYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      }) || await prisma.academicYear.findFirst({
        where: { name: { contains: "2026" } }
      }) || await prisma.academicYear.findFirst()
      targetYearId = activeYear?.id || ""
    }

    // --- SUB-FEATURE: DETAIL STUDENTS IN A CLASS & SUBJECT ---
    if (detailClassId && detailSubjectId) {
      const cls = await prisma.class.findUnique({
        where: { id: detailClassId },
        include: { campus: true }
      })
      const sub = await prisma.subject.findUnique({
        where: { id: detailSubjectId }
      })

      if (!cls || !sub) {
        return NextResponse.json({ success: false, error: "Không tìm thấy lớp học hoặc môn học" }, { status: 404 })
      }

      // Check lock status for this class + subject or entire evaluation period
      const lock = await prisma.gradebookLock.findFirst({
        where: {
          academicYearId: targetYearId,
          evaluationPeriod,
          OR: [
            { classId: detailClassId, subjectId: detailSubjectId },
            { classId: "ALL", subjectId: "ALL" }
          ],
          isLocked: true
        }
      })
      const isLocked = Boolean(lock)

      // Teaching assignment
      const ta = await prisma.teachingAssignment.findFirst({
        where: {
          classId: detailClassId,
          subjectId: detailSubjectId,
          ...(targetYearId ? { academicYearId: targetYearId } : {})
        },
        include: { teacher: true }
      })

      let assignedTeacher = ta?.teacher?.teacherName || ""
      if (!assignedTeacher && cls.homeroomTeacherId) {
        const hmTeacher = await prisma.teacher.findUnique({
          where: { id: cls.homeroomTeacherId }
        })
        assignedTeacher = hmTeacher?.teacherName || ""
      }
      if (!assignedTeacher) {
        assignedTeacher = "Chưa phân công"
      }

      // Students
      const students = await prisma.student.findMany({
        where: { classId: detailClassId, status: "ACTIVE" },
        orderBy: { studentName: "asc" },
        select: { id: true, studentCode: true, studentName: true, gender: true, dateOfBirth: true }
      })

      // Entries for this class & subject & period
      const entries = await prisma.subjectGradeEntry.findMany({
        where: {
          classId: detailClassId,
          subjectId: detailSubjectId,
          ...(evaluationPeriod !== "ALL" ? { evaluationPeriod } : {}),
          ...(targetYearId ? { academicYearId: targetYearId } : {})
        }
      })

      const entryMap = new Map()
      entries.forEach(e => {
        let compScores: any = {}
        if (e.componentScores) {
          try {
            compScores = typeof e.componentScores === "string" ? JSON.parse(e.componentScores) : e.componentScores
          } catch (_) {}
        }
        const existing = entryMap.get(e.studentId)
        if (!existing || hasValidEntryData(e)) {
          entryMap.set(e.studentId, {
            compositeScore: e.compositeScore,
            ratingValue: e.ratingValue || "",
            componentScores: compScores,
            remark: e.remark || "",
            updatedAt: e.updatedAt,
            hasData: hasValidEntryData(e)
          })
        }
      })

      const detailedStudents = students.map(st => {
        const ent = entryMap.get(st.id)
        return {
          id: st.id,
          studentCode: st.studentCode,
          studentName: st.studentName,
          gender: st.gender,
          dateOfBirth: st.dateOfBirth,
          hasGrade: Boolean(ent && ent.hasData),
          compositeScore: ent ? ent.compositeScore : null,
          ratingValue: ent ? ent.ratingValue : "",
          componentScores: ent ? ent.componentScores : {},
          remark: ent ? ent.remark : "",
          updatedAt: ent ? ent.updatedAt : null
        }
      })

      return NextResponse.json({
        success: true,
        classInfo: {
          id: cls.id,
          className: cls.className,
          grade: cls.grade,
          campusName: cls.campus?.campusName || cls.campus?.campusCode || ""
        },
        subjectInfo: {
          id: sub.id,
          subjectName: sub.subjectName,
          subjectCode: sub.subjectCode
        },
        assignedTeacher,
        evaluationPeriod,
        isLocked,
        lockInfo: lock || null,
        totalStudents: detailedStudents.length,
        gradedStudents: detailedStudents.filter(s => s.hasGrade).length,
        students: detailedStudents
      })
    }

    // --- MAIN FEATURE: PROGRESS AUDIT & STATISTICS ---
    // 1. Load active classes (chỉ lấy lớp phổ thông K1–K12)
    const classWhere: any = { status: "ACTIVE" }
    if (targetYearId) classWhere.academicYearId = targetYearId
    if (campusId && campusId !== "ALL") classWhere.campusId = campusId

    const classes = await prisma.class.findMany({
      where: classWhere,
      include: {
        campus: true
      },
      orderBy: { className: "asc" }
    })

    const targetFilterGradeNum = grade !== "ALL" ? extractGradeNumber(grade) : null

    // Filter classes by K1-K12 and by grade if specified
    const filteredClasses = classes.filter(cls => {
      const clsGradeNum = extractGradeNumber(cls.grade || cls.className)
      if (!clsGradeNum || clsGradeNum < 1 || clsGradeNum > 12) return false
      if (grade !== "ALL") {
        if (targetFilterGradeNum !== null) {
          return clsGradeNum === targetFilterGradeNum
        }
        return isGradeMatching(grade, cls.grade || cls.className)
      }
      return true
    })

    // 4. Load all active configs for targetYearId to build both configuredSubjectsSummary and class-subject tracking
    const isKsdn = isKsdnEvaluationPeriod(evaluationPeriod)
    const allYearConfigs = await prisma.subjectGradeConfig.findMany({
      where: {
        academicYearId: targetYearId,
        isActive: true
      },
      include: { subject: true },
      orderBy: [{ grade: "asc" }, { evaluationPeriod: "asc" }]
    })

    // Classify configs into 1. VNEDU (Môn Bộ GD&ĐT) and 2. INTERNAL (Đánh giá nội bộ Sky-Line: Môn Song ngữ & Quốc tế)
    // Chỉ tính các cấu hình đã được thiết lập cụ thể theo Kỳ đánh giá (loại bỏ các bản ghi mẫu mặc định evaluationPeriod = "ALL" cũ)
    const normalizedConfigs = allYearConfigs
      .filter(c => c.subjectId && c.subjectId !== "ALL" && c.subject && c.evaluationPeriod && c.evaluationPeriod !== "ALL")
      .map(c => {
        const currGroup = getSubjectCurriculumGroup(c.subject)
        // 1. Sổ điểm theo vnEdu (Môn Bộ GD&ĐT): các môn thuộc nhóm MOET
        // 2. Đánh giá nội bộ Sky-Line (Môn Song ngữ & Quốc tế): các môn thuộc nhóm BILINGUAL / SKL
        const effectiveConfigType: "VNEDU" | "INTERNAL" =
          currGroup === "MOET" ? "VNEDU" : "INTERNAL"
        const gradeNum = extractGradeNumber(c.grade)
        let colNames: string[] = []
        try {
          colNames = Array.isArray(c.columnNames) ? c.columnNames : JSON.parse(c.columnNames || "[]")
        } catch (_) {}
        return {
          ...c,
          curriculumGroup: currGroup,
          effectiveConfigType,
          gradeNum,
          parsedColumnNames: colNames.filter(Boolean)
        }
      })

    // Build summary of configured subjects for 1. VNEDU and 2. INTERNAL
    const buildGroupSummary = (type: "VNEDU" | "INTERNAL") => {
      const list = normalizedConfigs.filter(c => c.effectiveConfigType === type)
      const bySubjectMap = new Map<
        string,
        {
          subjectId: string
          subjectCode: string
          subjectName: string
          curriculumGroup: string
          configType: "VNEDU" | "INTERNAL"
          grades: Set<string>
          periods: Set<string>
          scopes: Array<{
            id: string
            grade: string
            evaluationPeriod: string
            program: string
            columnCount: number
            columnNames: string[]
            hasCompositeColumn: boolean
            hasRatingColumn: boolean
            hasRemarkColumn: boolean
          }>
        }
      >()

      list.forEach(c => {
        const sId = c.subjectId!
        if (!bySubjectMap.has(sId)) {
          bySubjectMap.set(sId, {
            subjectId: sId,
            subjectCode: c.subject?.subjectCode || "",
            subjectName: c.subject?.subjectName || "",
            curriculumGroup: c.curriculumGroup,
            configType: type,
            grades: new Set(),
            periods: new Set(),
            scopes: []
          })
        }
        const item = bySubjectMap.get(sId)!
        if (c.grade) item.grades.add(c.grade)
        if (c.evaluationPeriod) item.periods.add(c.evaluationPeriod)
        item.scopes.push({
          id: c.id,
          grade: c.grade || "ALL",
          evaluationPeriod: c.evaluationPeriod || "ALL",
          program: c.program || "ALL",
          columnCount: Number(c.columnCount || 0),
          columnNames: c.parsedColumnNames,
          hasCompositeColumn: c.hasCompositeColumn !== false,
          hasRatingColumn: Boolean(c.hasRatingColumn),
          hasRemarkColumn: c.hasRemarkColumn !== false
        })
      })

      const subjectsArray = Array.from(bySubjectMap.values())
        .map(s => ({
          ...s,
          grades: Array.from(s.grades).sort((a, b) => (extractGradeNumber(a) || 99) - (extractGradeNumber(b) || 99)),
          periods: Array.from(s.periods)
        }))
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "vi"))

      return {
        totalConfigs: list.length,
        totalUniqueSubjects: subjectsArray.length,
        subjects: subjectsArray
      }
    }

    const configuredSubjectsSummary = {
      vnEdu: buildGroupSummary("VNEDU"),
      internal: buildGroupSummary("INTERNAL")
    }

    // Filter configs matching the active evaluationPeriod & configTypeFilter (chỉ lấy đúng kỳ đã cấu hình, không lấy tràn "ALL")
    const periodMatchedConfigs = normalizedConfigs.filter(c => {
      if (configTypeFilter === "VNEDU" && c.effectiveConfigType !== "VNEDU") return false
      if (configTypeFilter === "INTERNAL" && c.effectiveConfigType !== "INTERNAL") return false

      if (evaluationPeriod === "ALL") return true
      if (isKsdn) return isKsdnEvaluationPeriod(c.evaluationPeriod)
      return c.evaluationPeriod === evaluationPeriod
    })

    // Build available configured subjects for the current filter (for dropdown filter)
    const availableSubjectsMap = new Map<string, any>()
    periodMatchedConfigs.forEach(c => {
      if (grade !== "ALL" && targetFilterGradeNum !== null) {
        const isG6KsdnMatch = targetFilterGradeNum === 6 && isKsdn && c.gradeNum === 5
        if (c.gradeNum !== targetFilterGradeNum && !isG6KsdnMatch) return
      }
      if (!availableSubjectsMap.has(c.subjectId!)) {
        availableSubjectsMap.set(c.subjectId!, {
          id: c.subjectId!,
          subjectCode: c.subject?.subjectCode || "",
          subjectName: c.subject?.subjectName || "",
          curriculumGroup: c.curriculumGroup,
          configType: c.effectiveConfigType
        })
      }
    })
    const availableConfiguredSubjects = Array.from(availableSubjectsMap.values()).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName, "vi")
    )

    const classIds = filteredClasses.map(c => c.id)
    if (classIds.length === 0) {
      return NextResponse.json({
        success: true,
        evaluationPeriod,
        configuredSubjectsSummary,
        availableConfiguredSubjects,
        summary: {
          totalAssignments: 0,
          completedCount: 0,
          inProgressCount: 0,
          notStartedCount: 0,
          noStudentsCount: 0,
          overallRate: 0,
          totalGradedStudents: 0,
          totalExpectedStudents: 0
        },
        items: []
      })
    }

    // 2. Teachers lookup
    const homeroomIds = Array.from(new Set(filteredClasses.map(c => c.homeroomTeacherId).filter(Boolean)))
    const homeroomTeachers = homeroomIds.length > 0
      ? await prisma.teacher.findMany({
          where: { id: { in: homeroomIds } },
          select: { id: true, teacherName: true, teacherCode: true, email: true }
        })
      : []
    const homeroomMap = new Map()
    homeroomTeachers.forEach(t => homeroomMap.set(t.id, t))

    // 3. Count active students per class
    const studentGroups = await prisma.student.groupBy({
      by: ["classId"],
      where: {
        classId: { in: classIds },
        status: "ACTIVE"
      },
      _count: { id: true }
    })
    const studentCountMap = new Map<string, number>()
    studentGroups.forEach(g => {
      studentCountMap.set(g.classId, g._count.id)
    })

    // 5. Load TeachingAssignments
    const assignments = await prisma.teachingAssignment.findMany({
      where: {
        classId: { in: classIds },
        ...(targetYearId ? { academicYearId: targetYearId } : {})
      },
      include: {
        teacher: true,
        subject: true
      }
    })
    const taMap = new Map<string, any>()
    assignments.forEach(ta => {
      taMap.set(`${ta.classId}_${ta.subjectId}`, ta)
    })

    // 6. Load Grade Entries aggregated by classId & subjectId (only counting entries with actual data)
    const entries = await prisma.subjectGradeEntry.findMany({
      where: {
        classId: { in: classIds },
        academicYearId: targetYearId,
        ...(evaluationPeriod !== "ALL" ? { evaluationPeriod } : {})
      },
      select: {
        classId: true,
        subjectId: true,
        studentId: true,
        configType: true,
        compositeScore: true,
        ratingValue: true,
        componentScores: true,
        remark: true,
        updatedAt: true
      }
    })

    const entryStatsMap = new Map<
      string,
      {
        gradedStudentIds: Set<string>
        totalScore: number
        validScoreCount: number
        lastUpdated: Date | null
      }
    >()
    entries.forEach(e => {
      if (!hasValidEntryData(e)) return
      const key = `${e.classId}_${e.subjectId}`
      const existing = entryStatsMap.get(key) || {
        gradedStudentIds: new Set<string>(),
        totalScore: 0,
        validScoreCount: 0,
        lastUpdated: null
      }
      if (!existing.gradedStudentIds.has(e.studentId)) {
        existing.gradedStudentIds.add(e.studentId)
        if (e.compositeScore !== null && e.compositeScore !== undefined && String(e.compositeScore).trim() !== "" && !isNaN(Number(e.compositeScore))) {
          existing.totalScore += Number(e.compositeScore)
          existing.validScoreCount += 1
        }
      }
      if (!existing.lastUpdated || (e.updatedAt && new Date(e.updatedAt) > new Date(existing.lastUpdated))) {
        existing.lastUpdated = e.updatedAt
      }
      entryStatsMap.set(key, existing)
    })

    // 7. Active subjects cache (filtered by user subject permission scope if applicable)
    const scopeInfo = await resolveAccountGradebookScope(
      (session?.user as any)?.id,
      (session?.user as any)?.role,
      targetYearId
    )
    const subjects = await prisma.subject.findMany({
      where: {
        status: "ACTIVE",
        ...(scopeInfo.isSubjectScoped && scopeInfo.allowedSubjectIds.length > 0
          ? { id: { in: scopeInfo.allowedSubjectIds } }
          : {})
      }
    })
    const subjectsMap = new Map()
    subjects.forEach(s => subjectsMap.set(s.id, s))

    // 7.1 Load locks for target year and period
    const locks = await prisma.gradebookLock.findMany({
      where: {
        academicYearId: targetYearId,
        evaluationPeriod: evaluationPeriod === "ALL" ? undefined : evaluationPeriod
      }
    })
    const periodLock = locks.find(l => l.classId === "ALL" && l.subjectId === "ALL" && Boolean(l.isLocked))
    const isPeriodLocked = Boolean(periodLock)
    const lockMap = new Map<string, any>()
    locks.forEach(l => {
      lockMap.set(`${l.classId}_${l.subjectId}`, l)
    })

    // 7.2 Load reminders for target year and period
    const reminders = await prisma.gradeEntryReminder.findMany({
      where: {
        academicYearId: targetYearId,
        evaluationPeriod: evaluationPeriod === "ALL" ? undefined : evaluationPeriod
      },
      orderBy: { remindedAt: "desc" }
    })

    // 7.3 Load pending unlock requests
    const pendingUnlockRequests = await prisma.gradebookUnlockRequest.findMany({
      where: {
        academicYearId: targetYearId,
        evaluationPeriod: evaluationPeriod === "ALL" ? undefined : evaluationPeriod,
        status: "PENDING"
      }
    })
    const unlockRequestMap = new Map<string, any>()
    pendingUnlockRequests.forEach(r => {
      unlockRequestMap.set(`${r.classId}_${r.subjectId}`, r)
    })
    const reminderMap = new Map<string, { lastRemindedAt: Date; count: number; remindedBy: string; channel: string }>()
    reminders.forEach(r => {
      const key = `${r.classId}_${r.subjectId}`
      if (!reminderMap.has(key)) {
        reminderMap.set(key, {
          lastRemindedAt: r.remindedAt,
          count: 1,
          remindedBy: r.remindedBy || "",
          channel: r.channel
        })
      } else {
        const existing = reminderMap.get(key)!
        existing.count += 1
      }
    })

    // 8. Assemble progress items
    const rawItems: any[] = []

    filteredClasses.forEach(cls => {
      const totalStudents = studentCountMap.get(cls.id) || 0
      const classHomeroom = cls.homeroomTeacherId ? homeroomMap.get(cls.homeroomTeacherId) : null
      const clsGradeNum = extractGradeNumber(cls.grade || cls.className)

      const trackedSubjectConfigMap = new Map<string, { configType: "VNEDU" | "INTERNAL"; columnCount: number; columnNames: string[] }>()

      const classAssignments = assignments.filter(ta => ta.classId === cls.id)
      const classHasAssignments = classAssignments.length > 0

      if (scope === "ALL_ASSIGNED") {
        // Track all subjects assigned to this class
        classAssignments.forEach(ta => {
          if (!ta.subjectId) return
          const subObj = subjectsMap.get(ta.subjectId)
          const grp = subObj ? getSubjectCurriculumGroup(subObj) : "MOET"
          const defaultType: "VNEDU" | "INTERNAL" = grp === "MOET" && !isKsdn ? "VNEDU" : "INTERNAL"
          if (configTypeFilter !== "ALL" && defaultType !== configTypeFilter) return
          trackedSubjectConfigMap.set(ta.subjectId, {
            configType: defaultType,
            columnCount: 0,
            columnNames: []
          })
        })
      } else {
        // Track strictly the subjects configured in 1. Sổ điểm theo vnEdu & 2. Đánh giá nội bộ Sky-Line for this class's grade and period
        const matchingConfigs = periodMatchedConfigs.filter(c => {
          if (c.gradeNum !== null && clsGradeNum !== null) {
            if (c.gradeNum === clsGradeNum) return true
            // Quy tắc Khối 6 KSĐN lấy môn khảo sát Tiểu học Khối 5
            if (clsGradeNum === 6 && isKsdn && c.gradeNum === 5 && c.effectiveConfigType === "INTERNAL") {
              return true
            }
            return false
          }
          return isGradeMatching(c.grade, cls.grade || cls.className)
        })

        matchingConfigs.forEach(c => {
          const sId = c.subjectId!
          // Nếu lớp có phân công giảng dạy nhưng không học môn này (ví dụ lớp Hệ S không học ESL/MAT) và chưa có điểm nhập thì bỏ qua
          if (classHasAssignments && !taMap.has(`${cls.id}_${sId}`) && !entryStatsMap.has(`${cls.id}_${sId}`)) {
            return
          }
          const existing = trackedSubjectConfigMap.get(sId)
          if (!existing || c.gradeNum === clsGradeNum) {
            trackedSubjectConfigMap.set(sId, {
              configType: c.effectiveConfigType,
              columnCount: Number(c.columnCount || 0),
              columnNames: c.parsedColumnNames || []
            })
          }
        })
      }

      Array.from(trackedSubjectConfigMap.entries()).forEach(([subId, cfgMeta]) => {
        if (subjectIdFilter !== "ALL" && subId !== subjectIdFilter) return
        const sub = subjectsMap.get(subId)
        if (!sub) return

        const ta = taMap.get(`${cls.id}_${subId}`)
        const teacherName = ta?.teacher?.teacherName || classHomeroom?.teacherName || "Chưa phân công"
        const teacherCode = ta?.teacher?.teacherCode || classHomeroom?.teacherCode || ""
        const teacherId = ta?.teacher?.id || classHomeroom?.id || null

        const entryStat = entryStatsMap.get(`${cls.id}_${subId}`)
        const gradedCount = entryStat ? entryStat.gradedStudentIds.size : 0
        const avgScore = entryStat && entryStat.validScoreCount > 0
          ? Math.round((entryStat.totalScore / entryStat.validScoreCount) * 100) / 100
          : null
        const lastUpdated = entryStat?.lastUpdated || null

        const completionRate = totalStudents > 0 ? Math.min(100, Math.round((gradedCount / totalStudents) * 100)) : 0
        let itemStatus: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "NO_STUDENTS" = "NOT_STARTED"
        if (totalStudents === 0) {
          itemStatus = "NO_STUDENTS"
        } else if (gradedCount >= totalStudents && totalStudents > 0) {
          itemStatus = "COMPLETED"
        } else if (gradedCount > 0) {
          itemStatus = "IN_PROGRESS"
        }

        const specificLock = lockMap.get(`${cls.id}_${sub.id}`)
        const isLocked = specificLock !== undefined ? Boolean(specificLock.isLocked) : isPeriodLocked
        const lockedAt = isLocked ? (specificLock?.lockedAt || periodLock?.lockedAt || null) : null
        const lockedBy = isLocked ? (specificLock?.lockedBy || periodLock?.lockedBy || null) : null
        const lockReason = isLocked ? (specificLock?.lockReason || periodLock?.lockReason || null) : null
        const pendingReq = unlockRequestMap.get(`${cls.id}_${sub.id}`) || null

        const remInfo = reminderMap.get(`${cls.id}_${sub.id}`)
        const lastRemindedAt = remInfo?.lastRemindedAt || null
        const reminderCount = remInfo?.count || 0

        const teacherEmail = ta?.teacher?.email || classHomeroom?.email || ""

        rawItems.push({
          classId: cls.id,
          className: cls.className,
          grade: clsGradeNum ? String(clsGradeNum) : cls.grade,
          campusId: cls.campusId,
          campusName: cls.campus?.campusName || cls.campus?.campusCode || "Cơ sở",
          subjectId: sub.id,
          subjectName: sub.subjectName,
          subjectCode: sub.subjectCode,
          curriculumGroup: getSubjectCurriculumGroup(sub),
          configType: cfgMeta.configType,
          configColumnCount: cfgMeta.columnCount,
          configColumnNames: cfgMeta.columnNames,
          teacherId,
          teacherName,
          teacherCode,
          teacherEmail,
          evaluationPeriod,
          totalStudents,
          gradedCount,
          completionRate,
          status: itemStatus,
          avgScore,
          lastUpdated,
          isLocked,
          lockedAt,
          lockedBy,
          lockReason,
          hasPendingUnlockRequest: Boolean(pendingReq),
          pendingUnlockRequest: pendingReq,
          lastRemindedAt,
          reminderCount
        })
      })
    })

    // Filter by status & search
    let filteredItems = rawItems
    if (status !== "ALL") {
      filteredItems = filteredItems.filter(i => i.status === status)
    }

    if (searchTerm) {
      filteredItems = filteredItems.filter(i => {
        const cName = i.className.toLowerCase()
        const sName = i.subjectName.toLowerCase()
        const sCode = i.subjectCode.toLowerCase()
        const tName = i.teacherName.toLowerCase()
        const tCode = (i.teacherCode || "").toLowerCase()
        const gName = (i.grade || "").toLowerCase()
        return cName.includes(searchTerm) ||
          sName.includes(searchTerm) ||
          sCode.includes(searchTerm) ||
          tName.includes(searchTerm) ||
          tCode.includes(searchTerm) ||
          gName.includes(searchTerm)
      })
    }

    // Summary statistics (calculated from rawItems before status & search filter for comprehensive KPIs)
    const totalAssignments = rawItems.length
    const completedCount = rawItems.filter(i => i.status === "COMPLETED").length
    const inProgressCount = rawItems.filter(i => i.status === "IN_PROGRESS").length
    const notStartedCount = rawItems.filter(i => i.status === "NOT_STARTED").length
    const noStudentsCount = rawItems.filter(i => i.status === "NO_STUDENTS").length

    const totalGradedStudents = rawItems.reduce((acc, i) => acc + i.gradedCount, 0)
    const totalExpectedStudents = rawItems.reduce((acc, i) => acc + i.totalStudents, 0)
    const overallRate = totalExpectedStudents > 0
      ? Math.round((totalGradedStudents / totalExpectedStudents) * 100)
      : 0

    const lockedCount = rawItems.filter(i => i.isLocked).length
    const unlockedCount = rawItems.filter(i => !i.isLocked).length
    const remindedTotal = rawItems.filter(i => (i.reminderCount || 0) > 0).length

    return NextResponse.json({
      success: true,
      evaluationPeriod,
      isPeriodLocked,
      periodLockInfo: periodLock || null,
      configuredSubjectsSummary,
      availableConfiguredSubjects,
      summary: {
        totalAssignments,
        completedCount,
        inProgressCount,
        notStartedCount,
        noStudentsCount,
        overallRate,
        totalGradedStudents,
        totalExpectedStudents,
        lockedCount,
        unlockedCount,
        remindedTotal
      },
      items: filteredItems
    })

  } catch (error: any) {
    console.error("Lỗi lấy tiến độ nhập điểm:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
