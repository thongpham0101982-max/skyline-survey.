/* eslint-disable */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { isGradeMatching } from "@/app/admin/ktdbcl/diem-nhan-xet/grade-utils"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get("academicYearId") || ""
    const evaluationPeriod = searchParams.get("evaluationPeriod") || "KSĐN" // "ALL", "KSĐN", "GK1", etc.
    const campusId = searchParams.get("campusId") || "ALL"
    const grade = searchParams.get("grade") || "ALL"
    const classId = searchParams.get("classId") || "ALL"
    const status = searchParams.get("status") || "ALL"
    const searchTerm = (searchParams.get("search") || "").trim().toLowerCase()

    // 1. Resolve Academic Year
    let targetYearId = academicYearId
    if (!targetYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      }) || await prisma.academicYear.findFirst({
        where: { name: { contains: "2026" } }
      }) || await prisma.academicYear.findFirst()
      targetYearId = activeYear?.id || ""
    }

    // 2. Evaluation Period variants
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

    // 3. Fetch Campuses
    const campuses = await prisma.campus.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, campusCode: true, campusName: true },
      orderBy: { campusName: "asc" }
    })
    const campusMap = new Map<string, any>()
    campuses.forEach(c => campusMap.set(c.id, c))

    // 4. Build Class query filters
    const classWhere: any = {
      status: "ACTIVE"
    }
    if (targetYearId) {
      classWhere.academicYearId = targetYearId
    }
    if (campusId && campusId !== "ALL") {
      classWhere.campusId = campusId
    }

    const allClasses = await prisma.class.findMany({
      where: classWhere,
      include: {
        campus: { select: { id: true, campusCode: true, campusName: true } },
        teachers: {
          include: {
            teacher: { select: { id: true, teacherName: true, teacherCode: true } }
          }
        },
        teachingAssignments: {
          include: {
            subject: { select: { id: true, subjectName: true } },
            teacher: { select: { id: true, teacherName: true, teacherCode: true } }
          }
        }
      },
      orderBy: { className: "asc" }
    })

    // Filter classes by grade
    const filteredClasses = allClasses.filter(c => {
      if (grade !== "ALL" && !isGradeMatching(grade, c.grade)) return false
      if (classId !== "ALL" && c.id !== classId) return false
      return true
    })

    const classIds = filteredClasses.map(c => c.id)

    // Also build teacher lookup for homeroom teacher
    const allHomeroomIds = Array.from(new Set(allClasses.map(c => c.homeroomTeacherId).filter(Boolean)))
    const homeroomTeachers = allHomeroomIds.length > 0 ? await prisma.teacher.findMany({
      where: { id: { in: allHomeroomIds } },
      select: { id: true, teacherName: true, teacherCode: true }
    }) : []
    const teacherMap = new Map<string, string>()
    homeroomTeachers.forEach(t => teacherMap.set(t.id, t.teacherName))

    // 5. Query active students in these classes
    const students = await prisma.student.findMany({
      where: {
        classId: { in: classIds },
        status: "ACTIVE"
      },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        gender: true,
        dateOfBirth: true,
        classId: true,
        campusId: true
      },
      orderBy: { studentName: "asc" }
    })

    const studentIds = students.map(s => s.id)

    // 6. Query AcademicConsultationLog for these students
    const logWhere: any = {
      studentId: { in: studentIds }
    }
    if (targetYearId) {
      logWhere.academicYearId = targetYearId
    }

    if (evaluationPeriod !== "ALL") {
      logWhere.OR = periodVariants.map(p => ({ notes: { contains: `[GradePeriod: ${p}]` } }))
    }

    const consultationLogs = await prisma.academicConsultationLog.findMany({
      where: logWhere,
      include: {
        teacher: { select: { id: true, teacherName: true, teacherCode: true } }
      },
      orderBy: { updatedAt: "desc" }
    }).catch(() => [])

    // Map logs by studentId (priority to most recently updated log matching period)
    const studentLogMap = new Map<string, any>()
    consultationLogs.forEach(log => {
      if (!studentLogMap.has(log.studentId)) {
        studentLogMap.set(log.studentId, log)
      }
    })

    // 7. Assemble Student Consultation Records
    const classLookup = new Map<string, any>()
    allClasses.forEach(c => classLookup.set(c.id, c))

    const rawItems = students.map(st => {
      const cls = classLookup.get(st.classId)
      const campus = cls?.campus || campusMap.get(st.campusId) || { id: st.campusId, campusName: "Cơ sở" }
      
      let homeroomName = "Chưa phân công"
      if (cls?.homeroomTeacherId && teacherMap.has(cls.homeroomTeacherId)) {
        homeroomName = teacherMap.get(cls.homeroomTeacherId)!
      } else if (cls?.teachers && cls.teachers.length > 0) {
        homeroomName = cls.teachers[0]?.teacher?.teacherName || "Chưa phân công"
      }

      const log = studentLogMap.get(st.id)

      let parentFeedback = ""
      let parentFeedbackDate: any = null
      let teacherRemark = ""
      let teacherRemarkDate: any = null
      let isAcknowledged = false
      let acknowledgedAt: string | null = null
      let forwardedGvbm: any = null
      let gvbmResponse: any = null
      let logPeriod = evaluationPeriod !== "ALL" ? evaluationPeriod : "KSĐN"

      if (log) {
        // Extract period from log.notes
        const pMatch = log.notes?.match(/\[GradePeriod:\s*(.*?)\]/)
        if (pMatch) {
          logPeriod = pMatch[1].trim()
        }

        if (log.difficulties) {
          parentFeedback = log.difficulties.replace(/^Ý KIẾN PHHS:\s*/i, "").trim()
          parentFeedbackDate = log.updatedAt || log.createdAt
        }

        if (log.content) {
          teacherRemark = log.content.replace(/^Ý KIẾN GVCN:\s*/i, "").trim()
          teacherRemarkDate = log.meetingDate || log.createdAt
        }

        if (log.nextActions) {
          if (log.nextActions.includes("[ACKNOWLEDGED]")) {
            isAcknowledged = true
            acknowledgedAt = log.updatedAt ? new Date(log.updatedAt).toISOString() : null
          }

          // GVBM Forward
          const forwardMatch = log.nextActions.match(/\[GVBM_FORWARD:(.*?)\]/)
          if (forwardMatch) {
            try {
              forwardedGvbm = JSON.parse(forwardMatch[1])
              isAcknowledged = true
            } catch {}
          }

          // GVBM Response
          const respMatch = log.nextActions.match(/\[GVBM_RESPONSE:(.*?)\]/)
          if (respMatch) {
            try {
              gvbmResponse = JSON.parse(respMatch[1])
            } catch {}
          }
        }
      }

      const hasParentFeedback = Boolean(parentFeedback)
      const hasTeacherRemark = Boolean(teacherRemark)
      const hasGvbmForward = Boolean(forwardedGvbm)
      const hasGvbmResponse = Boolean(gvbmResponse)

      // Compute status tag
      let statusTag: "WAITING_GVBM" | "WAITING_GVCN" | "COMPLETED" | "NO_FEEDBACK" = "NO_FEEDBACK"
      if (hasGvbmForward && !hasGvbmResponse) {
        statusTag = "WAITING_GVBM"
      } else if (hasParentFeedback && !hasTeacherRemark && !isAcknowledged) {
        statusTag = "WAITING_GVCN"
      } else if (hasParentFeedback || hasTeacherRemark || hasGvbmForward || hasGvbmResponse) {
        statusTag = "COMPLETED"
      }

      return {
        id: log?.id || `${st.id}_${logPeriod}`,
        logId: log?.id || null,
        studentId: st.id,
        studentCode: st.studentCode,
        studentName: st.studentName,
        gender: st.gender,
        dateOfBirth: st.dateOfBirth,
        classId: st.classId,
        className: cls?.className || "Lớp",
        grade: cls?.grade || "",
        campusId: campus?.id || "",
        campusName: campus?.campusName || "Cơ sở",
        campusCode: campus?.campusCode || "",
        homeroomTeacherName: homeroomName,
        evaluationPeriod: logPeriod,
        // PHHS
        hasParentFeedback,
        parentFeedback,
        parentFeedbackDate,
        // GVCN
        hasTeacherRemark,
        teacherRemark,
        teacherRemarkDate,
        isAcknowledged,
        acknowledgedAt,
        // GVBM
        hasGvbmForward,
        forwardedGvbm,
        hasGvbmResponse,
        gvbmResponse,
        // Overall status
        statusTag,
        updatedAt: log?.updatedAt || null
      }
    })

    // 8. Filter by status
    const statusFilteredItems = rawItems.filter(item => {
      if (status === "ALL") return true
      if (status === "HAS_PARENT_FEEDBACK") return item.hasParentFeedback
      if (status === "NO_PARENT_FEEDBACK") return !item.hasParentFeedback
      if (status === "HOMEROOM_REMARKED") return item.hasTeacherRemark
      if (status === "HOMEROOM_PENDING") return !item.hasTeacherRemark
      if (status === "GVBM_FORWARDED") return item.hasGvbmForward
      if (status === "GVBM_RESPONDED") return item.hasGvbmResponse
      if (status === "GVBM_PENDING") return item.hasGvbmForward && !item.hasGvbmResponse
      return true
    })

    // 9. Filter by search term
    const searchedItems = statusFilteredItems.filter(item => {
      if (!searchTerm) return true
      return (
        item.studentName.toLowerCase().includes(searchTerm) ||
        item.studentCode.toLowerCase().includes(searchTerm) ||
        item.className.toLowerCase().includes(searchTerm) ||
        item.campusName.toLowerCase().includes(searchTerm) ||
        item.homeroomTeacherName.toLowerCase().includes(searchTerm) ||
        (item.parentFeedback && item.parentFeedback.toLowerCase().includes(searchTerm)) ||
        (item.teacherRemark && item.teacherRemark.toLowerCase().includes(searchTerm)) ||
        (item.forwardedGvbm?.subjectName && item.forwardedGvbm.subjectName.toLowerCase().includes(searchTerm)) ||
        (item.forwardedGvbm?.teacherName && item.forwardedGvbm.teacherName.toLowerCase().includes(searchTerm)) ||
        (item.gvbmResponse?.responseContent && item.gvbmResponse.responseContent.toLowerCase().includes(searchTerm))
      )
    })

    // 10. Compute Summary Statistics (based on filtered classes & students in scope)
    const totalStudents = rawItems.length
    const parentFeedbackCount = rawItems.filter(i => i.hasParentFeedback).length
    const homeroomRemarkCount = rawItems.filter(i => i.hasTeacherRemark).length
    const gvbmForwardCount = rawItems.filter(i => i.hasGvbmForward).length
    const gvbmRespondedCount = rawItems.filter(i => i.hasGvbmResponse).length
    const gvbmPendingCount = rawItems.filter(i => i.hasGvbmForward && !i.hasGvbmResponse).length

    const summary = {
      totalStudents,
      parentFeedbackCount,
      parentFeedbackPct: totalStudents > 0 ? ((parentFeedbackCount / totalStudents) * 100).toFixed(1) : "0",
      homeroomRemarkCount,
      homeroomRemarkPct: totalStudents > 0 ? ((homeroomRemarkCount / totalStudents) * 100).toFixed(1) : "0",
      gvbmForwardCount,
      gvbmRespondedCount,
      gvbmRespondedPct: gvbmForwardCount > 0 ? ((gvbmRespondedCount / gvbmForwardCount) * 100).toFixed(1) : "0",
      gvbmPendingCount
    }

    // 11. Compute Campus-level stats (byCampus)
    const campusStatsMap = new Map<string, any>()
    campuses.forEach(c => {
      campusStatsMap.set(c.id, {
        campusId: c.id,
        campusCode: c.campusCode,
        campusName: c.campusName,
        classCount: 0,
        studentCount: 0,
        parentFeedbackCount: 0,
        homeroomRemarkCount: 0,
        gvbmForwardCount: 0,
        gvbmRespondedCount: 0,
        gvbmPendingCount: 0
      })
    })

    // Count classes per campus
    filteredClasses.forEach(c => {
      const stat = campusStatsMap.get(c.campusId)
      if (stat) stat.classCount++
    })

    rawItems.forEach(item => {
      const stat = campusStatsMap.get(item.campusId)
      if (stat) {
        stat.studentCount++
        if (item.hasParentFeedback) stat.parentFeedbackCount++
        if (item.hasTeacherRemark) stat.homeroomRemarkCount++
        if (item.hasGvbmForward) stat.gvbmForwardCount++
        if (item.hasGvbmResponse) stat.gvbmRespondedCount++
        if (item.hasGvbmForward && !item.hasGvbmResponse) stat.gvbmPendingCount++
      }
    })

    const byCampus = Array.from(campusStatsMap.values())
      .filter(stat => (campusId === "ALL" ? stat.classCount > 0 || stat.studentCount > 0 : stat.campusId === campusId))
      .map(stat => ({
        ...stat,
        parentFeedbackPct: stat.studentCount > 0 ? ((stat.parentFeedbackCount / stat.studentCount) * 100).toFixed(1) : "0",
        homeroomRemarkPct: stat.studentCount > 0 ? ((stat.homeroomRemarkCount / stat.studentCount) * 100).toFixed(1) : "0",
        gvbmRespondedPct: stat.gvbmForwardCount > 0 ? ((stat.gvbmRespondedCount / stat.gvbmForwardCount) * 100).toFixed(1) : "0"
      }))

    // 12. Compute Class-level stats (byClass)
    const classStatsMap = new Map<string, any>()
    filteredClasses.forEach(c => {
      let homeroomName = "Chưa phân công"
      if (c.homeroomTeacherId && teacherMap.has(c.homeroomTeacherId)) {
        homeroomName = teacherMap.get(c.homeroomTeacherId)!
      } else if (c.teachers && c.teachers.length > 0) {
        homeroomName = c.teachers[0]?.teacher?.teacherName || "Chưa phân công"
      }

      classStatsMap.set(c.id, {
        classId: c.id,
        className: c.className,
        campusId: c.campusId,
        campusName: c.campus?.campusName || "Cơ sở",
        grade: c.grade || "",
        homeroomTeacherName: homeroomName,
        studentCount: 0,
        parentFeedbackCount: 0,
        homeroomRemarkCount: 0,
        gvbmForwardCount: 0,
        gvbmRespondedCount: 0,
        gvbmPendingCount: 0
      })
    })

    rawItems.forEach(item => {
      const stat = classStatsMap.get(item.classId)
      if (stat) {
        stat.studentCount++
        if (item.hasParentFeedback) stat.parentFeedbackCount++
        if (item.hasTeacherRemark) stat.homeroomRemarkCount++
        if (item.hasGvbmForward) stat.gvbmForwardCount++
        if (item.hasGvbmResponse) stat.gvbmRespondedCount++
        if (item.hasGvbmForward && !item.hasGvbmResponse) stat.gvbmPendingCount++
      }
    })

    const byClass = Array.from(classStatsMap.values()).map(stat => ({
      ...stat,
      parentFeedbackPct: stat.studentCount > 0 ? ((stat.parentFeedbackCount / stat.studentCount) * 100).toFixed(1) : "0",
      homeroomRemarkPct: stat.studentCount > 0 ? ((stat.homeroomRemarkCount / stat.studentCount) * 100).toFixed(1) : "0",
      gvbmRespondedPct: stat.gvbmForwardCount > 0 ? ((stat.gvbmRespondedCount / stat.gvbmForwardCount) * 100).toFixed(1) : "0"
    }))

    return NextResponse.json({
      success: true,
      summary,
      byCampus,
      byClass,
      items: searchedItems,
      totalStudentsCount: rawItems.length,
      filteredCount: searchedItems.length
    })

  } catch (error: any) {
    console.error("GET /api/admin/ktdbcl/feedback-tracking error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi tải dữ liệu theo dõi phản hồi & trao đổi" },
      { status: 500 }
    )
  }
}
