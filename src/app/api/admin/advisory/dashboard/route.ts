import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  return res
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Chưa đăng nhập" }, 401)

    const { searchParams } = new URL(req.url)
    const campusId = searchParams.get("campusId") || ""
    const academicYearId = searchParams.get("academicYearId") || ""
    const classId = searchParams.get("classId") || ""
    const statusColor = searchParams.get("statusColor") || ""
    const search = (searchParams.get("search") || "").trim()

    // 1. Fetch Students based on filters
    const whereStudent: any = {}
    if (classId) {
      whereStudent.classId = classId
    } else if (campusId) {
      whereStudent.class = { campusId }
    }

    if (search) {
      whereStudent.OR = [
        { studentName: { contains: search } },
        { studentCode: { contains: search } }
      ]
    }

    const students = await prisma.student.findMany({
      where: whereStudent,
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        gradeLevel: true,
        class: {
          select: {
            id: true,
            className: true,
            campus: { select: { id: true, campusName: true, campusCode: true } }
          }
        }
      },
      orderBy: { studentName: "asc" }
    })

    const studentIds = students.map(s => s.id)

    // 2. Fetch goals for these students
    const goals = await prisma.studentGoal.findMany({
      where: { studentId: { in: studentIds } },
      include: { actions: true }
    }).catch(() => [])

    // 3. Fetch warnings for these students
    const warnings = await prisma.studentAdvisoryStatus.findMany({
      where: { studentId: { in: studentIds } }
    }).catch(() => [])

    // 4. Fetch tracking logs
    const trackingLogs = await prisma.studentGoalTrackingLog.findMany({
      where: { studentId: { in: studentIds } }
    }).catch(() => [])

    // Group goals by student
    const studentGoalMap: Record<string, any[]> = {}
    goals.forEach(g => {
      if (!studentGoalMap[g.studentId]) studentGoalMap[g.studentId] = []
      studentGoalMap[g.studentId].push(g)
    })

    // Map warnings by student
    const warningMap: Record<string, string> = {}
    warnings.forEach(w => {
      warningMap[w.studentId] = w.statusColor || "GREEN"
    })

    // Map tracking teacher notes
    const teacherNoteCountMap: Record<string, number> = {}
    trackingLogs.forEach(t => {
      if (t.teacherNotes && t.teacherNotes.trim()) {
        teacherNoteCountMap[t.studentId] = (teacherNoteCountMap[t.studentId] || 0) + 1
      }
    })

    // Build comprehensive list
    const studentRows = students.map(st => {
      const stGoals = studentGoalMap[st.id] || []
      const hasSubmitted = stGoals.length > 0
      const color = warningMap[st.id] || "GREEN"
      const parentSigned = stGoals.some(g => g.signedByParent)
      const hasTeacherNotes = (teacherNoteCountMap[st.id] || 0) > 0

      return {
        id: st.id,
        studentCode: st.studentCode,
        studentName: st.studentName,
        gradeLevel: st.gradeLevel,
        className: st.class?.className || "Chưa xếp lớp",
        campusName: st.class?.campus?.campusName || "Chưa xác định",
        campusCode: st.class?.campus?.campusCode || "CS",
        goalCount: stGoals.length,
        hasSubmitted,
        statusColor: color,
        studentCommitment: stGoals[0]?.studentCommitment || "",
        parentSigned,
        hasTeacherNotes,
        goals: stGoals
      }
    })

    // Filter by statusColor if requested
    let finalRows = studentRows
    if (statusColor && statusColor !== "ALL") {
      finalRows = finalRows.filter(r => r.statusColor === statusColor)
    }

    // Calculate executive summary metrics
    const totalStudents = students.length
    const submittedCount = studentRows.filter(r => r.hasSubmitted).length
    const greenCount = studentRows.filter(r => r.statusColor === "GREEN").length
    const yellowCount = studentRows.filter(r => r.statusColor === "YELLOW").length
    const redCount = studentRows.filter(r => r.statusColor === "RED").length
    const parentSignedCount = studentRows.filter(r => r.parentSigned).length
    const reviewedByTeacherCount = studentRows.filter(r => r.hasTeacherNotes).length

    return jsonResponse({
      metrics: {
        totalStudents,
        submittedCount,
        unsubmittedCount: totalStudents - submittedCount,
        submissionPercent: totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0,
        greenCount,
        yellowCount,
        redCount,
        parentSignedCount,
        reviewedByTeacherCount
      },
      students: finalRows
    })
  } catch (e: any) {
    console.error("GET /api/admin/advisory/dashboard error:", e)
    return jsonResponse({ error: e.message }, 500)
  }
}
