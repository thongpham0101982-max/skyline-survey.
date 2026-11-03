import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { createClient } from "@libsql/client"

export const dynamic = "force-dynamic"

function cleanEnv(val?: string | null): string {
  if (!val) return ""
  let s = String(val).trim()
  while ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
  }
  return s
}

const rawUrl = cleanEnv(process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.DATABASE_URL)
const TURSO_URL = rawUrl && !rawUrl.startsWith("file:") ? rawUrl.replace(/^libsql:\/\//i, "https://") : "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
const TURSO_TOKEN = cleanEnv(process.env.TURSO_AUTH_TOKEN) || ""

const libsqlClient = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
})

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Unauthorized" }, 401)

    const userRole = (session.user as any)?.role || ""
    const userId = (session.user as any)?.id || ""
    const allowedCampusIds = (session.user as any)?.campusIds || []

    const { searchParams } = new URL(req.url)
    const campusId = searchParams.get("campusId")
    const grade = searchParams.get("grade") // "K1" -> "K12"
    const classId = searchParams.get("classId")
    const academicYearId = searchParams.get("academicYearId") || ""

    // Xây dựng điều kiện lọc lớp theo phạm vi quyền
    let classWhere: any = { status: "ACTIVE" }
    if (academicYearId) classWhere.academicYearId = academicYearId
    if (campusId && campusId !== "ALL") {
      classWhere.campusId = campusId
    } else if (allowedCampusIds.length > 0 && !["ADMIN", "ADMINISTRATOR", "KT_DBCL", "KTDBCL"].includes(userRole)) {
      classWhere.campusId = { in: allowedCampusIds }
    }

    if (grade && grade !== "ALL") {
      classWhere.grade = grade
    }
    if (classId && classId !== "ALL") {
      classWhere.id = classId
    }

    // Nếu là giáo viên, giới hạn lớp phụ trách nếu không có quyền quản lý
    if (["TEACHER", "GV_MN"].includes(userRole)) {
      const teacher = await prisma.teacher.findUnique({ where: { userId } })
      if (teacher) {
        const assignedClasses = await prisma.teacherClassAssignment.findMany({
          where: { teacherId: teacher.id },
          select: { classId: true }
        })
        const homeroomClasses = await prisma.class.findMany({
          where: { homeroomTeacherId: teacher.id },
          select: { id: true }
        })
        const teacherClassIds = Array.from(new Set([...assignedClasses.map(a => a.classId), ...homeroomClasses.map(h => h.id)]))
        if (teacherClassIds.length > 0) {
          classWhere.id = { in: teacherClassIds }
        }
      }
    }

    // Lấy danh sách lớp phù hợp
    const classes = await prisma.class.findMany({
      where: classWhere,
      select: { id: true, className: true, grade: true, campusId: true }
    }).catch(() => [])

    const matchedClassIds = classes.map(c => c.id)

    if (matchedClassIds.length === 0) {
      return jsonResponse({
        totalStudents: 0,
        smartGoalStats: { submitted: 0, submittedPercent: 0, inProgress: 0, completed: 0 },
        consultationStats: { totalLogs: 0, uniqueConsultedStudents: 0, consultationRate: 0 },
        riskStats: { red: 0, yellow: 0, green: 0 },
        actionItemStats: { total: 0, overdue: 0, completed: 0 },
        priorityStudents: []
      })
    }

    // Lấy danh sách học sinh thuộc các lớp này
    const students = await prisma.student.findMany({
      where: {
        classId: { in: matchedClassIds },
        status: { not: "TRANSFERRED_OUT" }
      },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        classId: true,
        class: { select: { className: true, grade: true } }
      }
    }).catch(() => [])

    const totalStudents = students.length
    if (totalStudents === 0) {
      return jsonResponse({
        totalStudents: 0,
        smartGoalStats: { submitted: 0, submittedPercent: 0, inProgress: 0, completed: 0 },
        consultationStats: { totalLogs: 0, uniqueConsultedStudents: 0, consultationRate: 0 },
        riskStats: { red: 0, yellow: 0, green: 0 },
        actionItemStats: { total: 0, overdue: 0, completed: 0 },
        priorityStudents: []
      })
    }

    const studentIds = students.map(s => s.id)

    // 1. Thống kê Mục tiêu SMART
    const goals = await prisma.studentGoal.findMany({
      where: {
        studentId: { in: studentIds },
        ...(academicYearId ? { academicYearId } : {})
      },
      select: { studentId: true, status: true, signedByStudent: true, signedByTeacher: true }
    }).catch(() => [])

    const studentsWithGoals = new Set(goals.map(g => g.studentId))
    const submittedCount = studentsWithGoals.size
    const submittedPercent = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0
    const completedGoalsCount = goals.filter(g => g.status === "COMPLETED").length
    const inProgressGoalsCount = goals.filter(g => g.status === "IN_PROGRESS").length

    // 2. Thống kê Phiên cố vấn 1-1
    const consultationLogs = await prisma.academicConsultationLog.findMany({
      where: {
        studentId: { in: studentIds },
        ...(academicYearId ? { academicYearId } : {})
      },
      select: { id: true, studentId: true, meetingDate: true, deadline: true, status: true, notes: true, content: true }
    }).catch(() => [])

    // Lọc loại trừ exchange grade
    const validLogs = consultationLogs.filter(l => {
      const notes = (l.notes || "").toLowerCase()
      const content = (l.content || "").toLowerCase()
      return !notes.includes("[gradeperiod:") && !notes.includes("trao đổi giữa gvcn")
    })

    const consultedStudentIds = new Set(validLogs.map(l => l.studentId))
    const uniqueConsulted = consultedStudentIds.size
    const consultationRate = totalStudents > 0 ? Math.round((uniqueConsulted / totalStudents) * 100) : 0

    // 3. Thống kê Cảnh báo Rủi ro (Xanh / Vàng / Đỏ)
    const advisoryStatuses = await prisma.studentAdvisoryStatus.findMany({
      where: {
        studentId: { in: studentIds },
        ...(academicYearId ? { academicYearId } : {})
      },
      select: { studentId: true, statusColor: true, reasonDetail: true }
    }).catch(() => [])

    const statusMap = new Map(advisoryStatuses.map(s => [s.studentId, s.statusColor]))
    let redCount = 0
    let yellowCount = 0
    let greenCount = 0

    students.forEach(st => {
      const color = statusMap.get(st.id) || "GREEN"
      if (color === "RED") redCount++
      else if (color === "YELLOW") yellowCount++
      else greenCount++
    })

    // 4. Thống kê Việc tiếp theo & Quá hạn
    const placeholders = studentIds.map(() => "?").join(",")
    let standaloneActionRows: any[] = []
    try {
      const actionRes = await libsqlClient.execute({
        sql: `SELECT "id", "studentId", "deadline", "status" FROM "AdvisoryActionItem" WHERE "studentId" IN (${placeholders}) ${academicYearId ? 'AND "academicYearId" = ?' : ''}`,
        args: academicYearId ? [...studentIds, academicYearId] : studentIds
      })
      standaloneActionRows = actionRes.rows || []
    } catch {}

    const now = Date.now()
    let overdueActionCount = 0
    let completedActionCount = 0
    const studentOverdueMap = new Map<string, number>()

    standaloneActionRows.forEach((r: any) => {
      if (r.status === "COMPLETED") {
        completedActionCount++
      } else {
        const d = r.deadline ? new Date(r.deadline).getTime() : null
        if (d && d < now) {
          overdueActionCount++
          const prev = studentOverdueMap.get(String(r.studentId)) || 0
          studentOverdueMap.set(String(r.studentId), prev + 1)
        }
      }
    })

    // Cộng thêm việc quá hạn từ nextActions của consultationLogs
    validLogs.forEach(l => {
      if (l.status !== "COMPLETED" && l.deadline) {
        const d = new Date(l.deadline).getTime()
        if (d < now) {
          overdueActionCount++
          const prev = studentOverdueMap.get(l.studentId) || 0
          studentOverdueMap.set(l.studentId, prev + 1)
        }
      }
    })

    // 5. Danh sách Top học sinh ưu tiên cần hỗ trợ (Cảnh báo Đỏ hoặc có việc quá hạn hoặc chưa có mục tiêu)
    const priorityStudents = students
      .map(st => {
        const color = statusMap.get(st.id) || "GREEN"
        const hasGoal = studentsWithGoals.has(st.id)
        const isConsulted = consultedStudentIds.has(st.id)
        const overdues = studentOverdueMap.get(st.id) || 0
        let priorityScore = 0
        if (color === "RED") priorityScore += 100
        if (color === "YELLOW") priorityScore += 40
        if (overdues > 0) priorityScore += overdues * 20
        if (!hasGoal) priorityScore += 15
        if (!isConsulted) priorityScore += 10

        return {
          id: st.id,
          studentCode: st.studentCode,
          studentName: st.studentName,
          className: st.class?.className || "N/A",
          grade: st.class?.grade || "N/A",
          statusColor: color,
          hasGoal,
          isConsulted,
          overdueCount: overdues,
          priorityScore
        }
      })
      .filter(s => s.priorityScore > 0)
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 15)

    return jsonResponse({
      totalStudents,
      smartGoalStats: {
        submitted: submittedCount,
        submittedPercent,
        inProgress: inProgressGoalsCount,
        completed: completedGoalsCount
      },
      consultationStats: {
        totalLogs: validLogs.length,
        uniqueConsultedStudents: uniqueConsulted,
        consultationRate
      },
      riskStats: {
        red: redCount,
        yellow: yellowCount,
        green: greenCount
      },
      actionItemStats: {
        total: standaloneActionRows.length + validLogs.length,
        overdue: overdueActionCount,
        completed: completedActionCount
      },
      priorityStudents
    })
  } catch (error: any) {
    console.error("GET /api/advisory/dashboard-stats error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}
