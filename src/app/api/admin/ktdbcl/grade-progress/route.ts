// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { isGradeMatching } from "@/app/admin/ktdbcl/diem-nhan-xet/grade-utils"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get("academicYearId") || ""
    const evaluationPeriod = searchParams.get("evaluationPeriod") || "KSĐN"
    const campusId = searchParams.get("campusId") || "ALL"
    const grade = searchParams.get("grade") || "ALL"
    const status = searchParams.get("status") || "ALL"
    const searchTerm = (searchParams.get("search") || "").trim().toLowerCase()
    const scope = searchParams.get("scope") || "SURVEY" // "SURVEY" | "ALL_ASSIGNED"

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
          evaluationPeriod,
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
        entryMap.set(e.studentId, {
          compositeScore: e.compositeScore,
          componentScores: compScores,
          remark: e.remark || "",
          updatedAt: e.updatedAt
        })
      })

      const detailedStudents = students.map(st => {
        const ent = entryMap.get(st.id)
        return {
          id: st.id,
          studentCode: st.studentCode,
          studentName: st.studentName,
          gender: st.gender,
          dateOfBirth: st.dateOfBirth,
          hasGrade: Boolean(ent && (ent.compositeScore !== null || Object.keys(ent.componentScores || {}).length > 0)),
          compositeScore: ent ? ent.compositeScore : null,
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
    // 1. Load active classes
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

    // Filter classes by grade if specified
    const filteredClasses = classes.filter(cls => {
      if (grade !== "ALL" && !isGradeMatching(grade, cls.grade)) return false
      return true
    })

    const classIds = filteredClasses.map(c => c.id)
    if (classIds.length === 0) {
      return NextResponse.json({
        success: true,
        evaluationPeriod,
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

    // 4. Load configs for evaluationPeriod
    const configs = await prisma.subjectGradeConfig.findMany({
      where: {
        academicYearId: targetYearId,
        evaluationPeriod: evaluationPeriod === "ALL" ? undefined : { in: [evaluationPeriod, "ALL"] }
      },
      include: { subject: true }
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

    // 6. Load Grade Entries aggregated by classId & subjectId
    const entries = await prisma.subjectGradeEntry.findMany({
      where: {
        classId: { in: classIds },
        academicYearId: targetYearId,
        ...(evaluationPeriod !== "ALL" ? { evaluationPeriod } : {})
      },
      select: {
        classId: true,
        subjectId: true,
        compositeScore: true,
        updatedAt: true
      }
    })

    const entryStatsMap = new Map<string, { count: number; totalScore: number; validScoreCount: number; lastUpdated: Date | null }>()
    entries.forEach(e => {
      const key = `${e.classId}_${e.subjectId}`
      const existing = entryStatsMap.get(key) || { count: 0, totalScore: 0, validScoreCount: 0, lastUpdated: null }
      existing.count += 1
      if (e.compositeScore !== null && e.compositeScore !== undefined && !isNaN(Number(e.compositeScore))) {
        existing.totalScore += Number(e.compositeScore)
        existing.validScoreCount += 1
      }
      if (!existing.lastUpdated || (e.updatedAt && new Date(e.updatedAt) > new Date(existing.lastUpdated))) {
        existing.lastUpdated = e.updatedAt
      }
      entryStatsMap.set(key, existing)
    })

    // 7. Active subjects cache
    const subjects = await prisma.subject.findMany({
      where: { status: "ACTIVE" }
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

      let subjectIdsToTrack: string[] = []

      if (scope === "ALL_ASSIGNED") {
        // Track all subjects assigned to this class
        const classAssignments = assignments.filter(ta => ta.classId === cls.id)
        subjectIdsToTrack = Array.from(new Set(classAssignments.map(ta => ta.subjectId).filter(Boolean)))
      } else {
        // Track survey subjects configured for this grade and period
        const matchingConfigs = configs.filter(c => isGradeMatching(c.grade, cls.grade))
        subjectIdsToTrack = Array.from(new Set(matchingConfigs.map(c => c.subjectId).filter(Boolean)))
        
        // If no survey subjects configured for this grade yet, fallback to teaching assignments
        if (subjectIdsToTrack.length === 0) {
          const classAssignments = assignments.filter(ta => ta.classId === cls.id)
          subjectIdsToTrack = Array.from(new Set(classAssignments.map(ta => ta.subjectId).filter(Boolean)))
        }
      }

      subjectIdsToTrack.forEach(subId => {
        const sub = subjectsMap.get(subId)
        if (!sub) return

        const ta = taMap.get(`${cls.id}_${subId}`)
        const teacherName = ta?.teacher?.teacherName || classHomeroom?.teacherName || "Chưa phân công"
        const teacherCode = ta?.teacher?.teacherCode || classHomeroom?.teacherCode || ""
        const teacherId = ta?.teacher?.id || classHomeroom?.id || null

        const entryStat = entryStatsMap.get(`${cls.id}_${subId}`)
        const gradedCount = entryStat ? entryStat.count : 0
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
        const isLocked = isPeriodLocked || Boolean(specificLock?.isLocked)
        const lockedAt = isLocked ? (specificLock?.lockedAt || periodLock?.lockedAt || null) : null
        const lockedBy = isLocked ? (specificLock?.lockedBy || periodLock?.lockedBy || null) : null
        const lockReason = isLocked ? (specificLock?.lockReason || periodLock?.lockReason || null) : null

        const remInfo = reminderMap.get(`${cls.id}_${sub.id}`)
        const lastRemindedAt = remInfo?.lastRemindedAt || null
        const reminderCount = remInfo?.count || 0

        const teacherEmail = ta?.teacher?.email || classHomeroom?.email || ""

        rawItems.push({
          classId: cls.id,
          className: cls.className,
          grade: cls.grade,
          campusId: cls.campusId,
          campusName: cls.campus?.campusName || cls.campus?.campusCode || "Cơ sở",
          subjectId: sub.id,
          subjectName: sub.subjectName,
          subjectCode: sub.subjectCode,
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
