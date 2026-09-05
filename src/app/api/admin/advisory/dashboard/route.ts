import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getDefaultAcademicYear } from "@/lib/academicYear"

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
    let academicYearId = searchParams.get("academicYearId") || ""
    const classId = searchParams.get("classId") || ""
    const statusColor = searchParams.get("statusColor") || ""
    const search = (searchParams.get("search") || "").trim()

    // 1. Tự động lấy Năm học hoạt động mặc định nếu không truyền academicYearId
    if (!academicYearId) {
      const activeYear = await getDefaultAcademicYear(prisma)
      if (activeYear) {
        academicYearId = activeYear.id
      }
    }

    // 2. Thiết lập điều kiện lọc học sinh (Bao gồm Năm học, trạng thái ACTIVE và loại trừ Mầm non)
    const classConditions: any = {
      NOT: [
        { level: "Mam non" },
        { level: "Mầm non" },
        { level: "MAM_NON" },
        { level: "Preschool" },
        { level: "PRESCHOOL" },
        { className: { contains: "Mầm" } },
        { className: { contains: "mầm" } },
        { className: { contains: "Mam" } },
        { className: { contains: "mam" } },
        { grade: "MAM" },
        { grade: "CHOI" },
        { grade: "LA" },
        { grade: "NHA_TRE" },
        { grade: "MAM_NON" }
      ]
    }

    if (campusId) {
      classConditions.campusId = campusId
    }

    const whereStudent: any = {
      status: "ACTIVE",
      class: classConditions
    }

    if (academicYearId) {
      whereStudent.academicYearId = academicYearId
    }

    if (classId) {
      whereStudent.classId = classId
    }

    if (search) {
      whereStudent.OR = [
        { studentName: { contains: search } },
        { studentCode: { contains: search } }
      ]
    }

    const rawStudents = await prisma.student.findMany({
      where: whereStudent,
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        academicYearId: true,
        class: {
          select: {
            id: true,
            className: true,
            level: true,
            grade: true,
            campus: { select: { id: true, campusName: true, campusCode: true } }
          }
        }
      },
      orderBy: { studentName: "asc" }
    })

    // Lọc loại trừ thêm ở tầng JS để đảm bảo 100% không sót bất kỳ lớp Mầm non nào
    const students = rawStudents.filter(st => {
      const clsName = (st.class?.className || "").toLowerCase()
      const lvl = (st.class?.level || "").toLowerCase()
      const grd = (st.class?.grade || "").toLowerCase()
      const isMamNon = lvl.includes("mầm") || lvl.includes("mam") || lvl.includes("preschool") ||
                       clsName.includes("mầm") || clsName.includes("mam") ||
                       ["mam", "choi", "la", "nha_tre", "mam_non"].includes(grd)
      return !isMamNon
    })

    const studentIds = students.map(s => s.id)

    // 3. Fetch goals for these students
    const goals = await prisma.studentGoal.findMany({
      where: { studentId: { in: studentIds } },
      include: { actions: true }
    }).catch(() => [])

    // 4. Fetch warnings for these students
    const warnings = await prisma.studentAdvisoryStatus.findMany({
      where: { studentId: { in: studentIds } }
    }).catch(() => [])

    // 5. Fetch tracking logs
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
        gradeLevel: (st.class as any)?.gradeLevel || st.class?.grade || st.class?.className || "Khối",
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
      currentAcademicYearId: academicYearId,
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
