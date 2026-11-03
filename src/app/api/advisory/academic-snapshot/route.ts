import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Unauthorized" }, 401)

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const academicYearId = searchParams.get("academicYearId") || ""

    if (!studentId) {
      return jsonResponse({ error: "Thiếu studentId" }, 400)
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          include: { campus: true, academicYear: true }
        }
      }
    })

    if (!student) {
      return jsonResponse({ error: "Không tìm thấy học sinh" }, 404)
    }

    // Kiểm tra phân quyền truy cập (Chống IDOR)
    const userRole = (session.user as any)?.role || ""
    const currentUserId = (session.user as any)?.id || ""
    const allowedCampusIds = (session.user as any)?.campusIds || []
    const isFullAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "KTDBCL"].includes(userRole)

    let canAccess = isFullAdmin
    if (!canAccess && ["GDCS", "GD_CS", "GIAO_VU_CS", "GIAO_VU"].includes(userRole)) {
      if (allowedCampusIds.length === 0 || allowedCampusIds.includes(student.campusId)) {
        canAccess = true
      }
    }
    if (!canAccess && (userRole === "TEACHER" || userRole === "GV_MN")) {
      const teacher = await prisma.teacher.findUnique({ where: { userId: currentUserId } })
      if (teacher) {
        const isHomeroom = student.class?.homeroomTeacherId === teacher.id
        const isAssigned = await prisma.teacherClassAssignment.findFirst({
          where: { teacherId: teacher.id, classId: student.classId }
        })
        const isSupport = await prisma.learningSupportAssignment.findFirst({
          where: { teacherId: teacher.id, target: { studentId: student.id } }
        })
        if (isHomeroom || isAssigned || isSupport) {
          canAccess = true
        }
      }
    }

    if (!canAccess) {
      return jsonResponse({ error: "Bạn không có quyền truy cập hồ sơ học sinh này." }, 403)
    }

    // 1. Kết quả học tập (KQHT)
    const gradeEntries = await prisma.subjectGradeEntry.findMany({
      where: {
        studentId: student.id,
        ...(academicYearId ? { academicYearId } : {})
      },
      include: {
        subject: { select: { id: true, subjectCode: true, subjectName: true } }
      },
      orderBy: { updatedAt: "desc" }
    }).catch(() => [])

    const subjectMap = new Map<string, any>()
    gradeEntries.forEach(g => {
      const subjKey = g.subjectId
      if (!subjectMap.has(subjKey) && g.compositeScore !== null) {
        subjectMap.set(subjKey, {
          subjectId: g.subjectId,
          subjectCode: g.subject?.subjectCode || "N/A",
          subjectName: g.subject?.subjectName || "Môn học",
          score: g.compositeScore,
          evaluationPeriod: g.evaluationPeriod,
          isUnderBenchmark: (g.compositeScore || 0) < 6.0
        })
      }
    })

    const subjectScores = Array.from(subjectMap.values())
    const underBenchmarkSubjects = subjectScores.filter(s => s.isUnderBenchmark)
    const avgScore = subjectScores.length > 0
      ? parseFloat((subjectScores.reduce((acc, s) => acc + s.score, 0) / subjectScores.length).toFixed(2))
      : null

    // 2. Khảo sát chất lượng (KSCL / Input Assessment)
    let baselineAssessment: any = null
    try {
      const ia = await prisma.inputAssessmentStudent.findFirst({
        where: {
          OR: [
            { studentCode: student.studentCode },
            { id: student.id }
          ]
        },
        orderBy: { createdAt: "desc" }
      })
      if (ia) {
        baselineAssessment = {
          periodName: "Khảo sát đầu năm",
          mathScore: (ia as any).mathScore ?? null,
          englishScore: (ia as any).englishScore ?? null,
          literatureScore: (ia as any).literatureScore ?? null,
          totalScore: (ia as any).totalScore ?? null,
          note: (ia as any).note ?? null
        }
      }
    } catch {}

    // 3. Đánh giá năng lực cốt lõi
    const competencySummary = await prisma.studentSubjectCompetencySummary.findFirst({
      where: {
        studentId: student.id,
        ...(academicYearId ? { academicYearId } : {})
      },
      orderBy: { updatedAt: "desc" }
    }).catch(() => null)

    let radarDataParsed = null
    try {
      if (competencySummary?.radarData) {
        radarDataParsed = JSON.parse(competencySummary.radarData)
      }
    } catch {}

    // 4. Hỗ trợ học tập (Learning Support)
    const supportTargets = await prisma.learningSupportTarget.findMany({
      where: {
        studentId: student.id,
        ...(academicYearId ? { academicYearId } : {})
      },
      select: {
        id: true,
        supportType: true,
        sourceType: true,
        status: true,
        reason: true,
        startDate: true,
        evaluations: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { trackingLevel: true, comment: true }
        }
      }
    }).catch(() => [])

    // Tách và bảo mật dữ liệu tâm lý: chỉ hiển thị cờ hỗ trợ nếu không có quyền cao cấp
    const sanitizedSupportTargets = supportTargets.map(t => {
      const isPsychological = t.supportType === "PSYCHOLOGICAL"
      const canViewSensitive = isFullAdmin || ["GDCS", "GD_CS"].includes(userRole)
      return {
        id: t.id,
        supportType: t.supportType,
        sourceType: t.sourceType,
        status: t.status,
        reason: isPsychological && !canViewSensitive ? "[Hồ sơ bảo mật chuyên gia tâm lý]" : t.reason,
        startDate: t.startDate,
        latestLevel: t.evaluations?.[0]?.trackingLevel || null
      }
    })

    // 5. Định hướng Hướng nghiệp
    const careerOrientation = await prisma.studentCareerOrientation.findFirst({
      where: {
        studentId: student.id,
        ...(academicYearId ? { academicYearId } : {})
      }
    }).catch(() => null)

    return jsonResponse({
      student: {
        id: student.id,
        studentCode: student.studentCode,
        studentName: student.studentName,
        className: student.class?.className || "N/A",
        campusName: student.class?.campus?.campusName || "N/A",
        grade: student.class?.grade || "N/A"
      },
      academicPerformance: {
        avgScore,
        subjectScores,
        underBenchmarkSubjects,
        underBenchmarkCount: underBenchmarkSubjects.length
      },
      baselineAssessment,
      competencies: {
        summaryScore: competencySummary?.subjectScore || null,
        radarData: radarDataParsed
      },
      learningSupport: sanitizedSupportTargets,
      careerOrientation: careerOrientation ? {
        initialOrientation: careerOrientation.initialOrientation,
        counselingResult: careerOrientation.counselingResult,
        status: careerOrientation.status
      } : null
    })
  } catch (error: any) {
    console.error("GET /api/advisory/academic-snapshot error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}
