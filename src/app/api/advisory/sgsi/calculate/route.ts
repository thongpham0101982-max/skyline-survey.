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

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const academicYearId = searchParams.get("academicYearId") || ""
    const term = searchParams.get("term") || "HK1"

    if (!studentId) {
      return jsonResponse({ error: "Thiếu studentId" }, 400)
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: { select: { className: true, grade: true } } }
    })

    if (!student) return jsonResponse({ error: "Không tìm thấy học sinh" }, 404)

    // 1. Thu thập dữ liệu thành phần 1: Tiến bộ HS (Trọng số 45%)
    // - Mức độ hoàn thành mục tiêu SMART (30%)
    const goals = await prisma.studentGoal.findMany({
      where: { studentId: student.id, ...(academicYearId ? { academicYearId } : {}) }
    }).catch(() => [])

    let smartScore = 70 // default benchmark
    if (goals.length > 0) {
      const completed = goals.filter(g => g.status === "COMPLETED").length
      const inProgress = goals.filter(g => g.status === "IN_PROGRESS").length
      smartScore = Math.min(100, Math.round(((completed * 100 + inProgress * 70) / (goals.length * 100)) * 100))
    }

    // - Điểm học thuật hiện tại (15%)
    const grades = await prisma.subjectGradeEntry.findMany({
      where: { studentId: student.id, ...(academicYearId ? { academicYearId } : {}) },
      select: { compositeScore: true }
    }).catch(() => [])

    let academicScore = 75
    let hasAcademicData = false
    if (grades.length > 0) {
      const validScores = grades.filter(g => g.compositeScore !== null).map(g => (g.compositeScore || 0) * 10) // quy ra thang 100
      if (validScores.length > 0) {
        academicScore = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
        hasAcademicData = true
      }
    }

    const progressScore = Math.round(smartScore * (30 / 45) + academicScore * (15 / 45))

    // 2. Thu thập dữ liệu thành phần 2: Hiệu quả Hỗ trợ (Trọng số 35%)
    // - Tỷ lệ hành động hoàn thành đúng hạn (AdvisoryActionItem + nextActions)
    let actionItemRows: any[] = []
    try {
      const actRes = await libsqlClient.execute({
        sql: `SELECT "deadline", "status" FROM "AdvisoryActionItem" WHERE "studentId" = ? ${academicYearId ? 'AND "academicYearId" = ?' : ''}`,
        args: academicYearId ? [student.id, academicYearId] : [student.id]
      })
      actionItemRows = actRes.rows || []
    } catch {}

    const now = Date.now()
    let actionSuccessScore = 80
    if (actionItemRows.length > 0) {
      const completedOnTime = actionItemRows.filter(r => r.status === "COMPLETED").length
      const overdue = actionItemRows.filter(r => r.status !== "COMPLETED" && r.deadline && new Date(r.deadline).getTime() < now).length
      actionSuccessScore = Math.max(20, Math.min(100, Math.round(((completedOnTime * 100 - overdue * 20) / (actionItemRows.length * 100)) * 100)))
    }

    // - Tỷ lệ giải quyết khó khăn trong buổi cố vấn
    const consultations = await prisma.academicConsultationLog.findMany({
      where: { studentId: student.id, ...(academicYearId ? { academicYearId } : {}) },
      select: { status: true, difficulties: true }
    }).catch(() => [])

    let supportResolutionScore = 75
    if (consultations.length > 0) {
      const resolved = consultations.filter(c => c.status === "COMPLETED").length
      supportResolutionScore = Math.round((resolved / consultations.length) * 100)
    }

    const supportEffectScore = Math.round(actionSuccessScore * (15 / 35) + supportResolutionScore * (20 / 35))

    // 3. Thu thập dữ liệu thành phần 3: Chất lượng Quy trình (Trọng số 20%)
    // - Tính đầy đủ của phiên cố vấn (10%)
    const meetingPresenceScore = consultations.length >= 1 ? 100 : 40

    // - Tinh thần tự đánh giá của học sinh (10%)
    const reflections = await prisma.studentReflection.findMany({
      where: { studentId: student.id, ...(academicYearId ? { academicYearId } : {}) }
    }).catch(() => [])

    const reflectionScore = reflections.length >= 1 ? 95 : 60
    const processQualityScore = Math.round(meetingPresenceScore * 0.5 + reflectionScore * 0.5)

    // 4. Tính toán Chỉ số SGSI Tổng hợp (Thang 100)
    const compositeSgsi = Math.round(
      progressScore * 0.45 +
      supportEffectScore * 0.35 +
      processQualityScore * 0.20
    )

    // Xác định xếp loại tăng trưởng
    let ratingTier = "ĐẠT TIẾN BỘ TỐT"
    let tierBadgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300"
    if (compositeSgsi >= 85) {
      ratingTier = "TIẾN BỘ XUẤT SẮC"
      tierBadgeClass = "bg-teal-100 text-teal-800 border-teal-300"
    } else if (compositeSgsi < 65) {
      ratingTier = "CẦN TĂNG CƯỜNG ĐỒNG HÀNH"
      tierBadgeClass = "bg-amber-100 text-amber-800 border-amber-300"
    }

    return jsonResponse({
      studentId: student.id,
      studentName: student.studentName,
      className: student.class?.className || "N/A",
      academicYearId,
      term,
      compositeSgsiScore: compositeSgsi,
      ratingTier,
      tierBadgeClass,
      breakdown: {
        academicProgress: {
          weight: 45,
          score: progressScore,
          smartGoalScore: smartScore,
          academicGradeScore: academicScore,
          description: "Mức độ hoàn thành mục tiêu SMART và phong độ điểm số môn học"
        },
        supportEffect: {
          weight: 35,
          score: supportEffectScore,
          actionCompletionScore: actionSuccessScore,
          problemResolutionScore: supportResolutionScore,
          description: "Hiệu quả tháo gỡ khó khăn và tỷ lệ hành động hoàn thành đúng hạn"
        },
        processQuality: {
          weight: 20,
          score: processQualityScore,
          meetingPresenceScore,
          reflectionScore,
          description: "Độ chuyên cần tham gia cố vấn và tính chủ động tự đánh giá bản thân"
        }
      },
      dataCompletenessRate: hasAcademicData ? 1.0 : 0.85,
      isMissingBaselineData: !hasAcademicData
    })
  } catch (error: any) {
    console.error("GET /api/advisory/sgsi/calculate error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}
