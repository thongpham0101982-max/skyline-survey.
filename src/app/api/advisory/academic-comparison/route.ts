import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getStudentSession } from "@/lib/student-session"

export const dynamic = "force-dynamic"

function jsonResponse(data: unknown, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

// Map giữa Checkpoint Cố Vấn và EvaluationPeriod Sổ Điểm
const PERIOD_MAPPING: Record<string, { periodCode: string; periodLabel: string; checkpointCode: string; checkpointLabel: string }> = {
  "DAU_NAM": { periodCode: "KSĐN", periodLabel: "Khảo sát đầu năm", checkpointCode: "DAU_NAM", checkpointLabel: "Mốc Đầu Năm Học" },
  "KSĐN": { periodCode: "KSĐN", periodLabel: "Khảo sát đầu năm", checkpointCode: "DAU_NAM", checkpointLabel: "Mốc Đầu Năm Học" },
  "KSDN": { periodCode: "KSĐN", periodLabel: "Khảo sát đầu năm", checkpointCode: "DAU_NAM", checkpointLabel: "Mốc Đầu Năm Học" },

  "GIUA_KY_1": { periodCode: "GK1", periodLabel: "Giữa Học Kỳ 1", checkpointCode: "GIUA_KY_1", checkpointLabel: "Mốc Giữa Kỳ 1" },
  "GK1": { periodCode: "GK1", periodLabel: "Giữa Học Kỳ 1", checkpointCode: "GIUA_KY_1", checkpointLabel: "Mốc Giữa Kỳ 1" },

  "CUOI_KY_1": { periodCode: "CK1", periodLabel: "Cuối Học Kỳ 1", checkpointCode: "CUOI_KY_1", checkpointLabel: "Mốc Cuối Kỳ 1" },
  "CK1": { periodCode: "CK1", periodLabel: "Cuối Học Kỳ 1", checkpointCode: "CUOI_KY_1", checkpointLabel: "Mốc Cuối Kỳ 1" },

  "GIUA_KY_2": { periodCode: "GK2", periodLabel: "Giữa Học Kỳ 2", checkpointCode: "GIUA_KY_2", checkpointLabel: "Mốc Giữa Kỳ 2" },
  "GK2": { periodCode: "GK2", periodLabel: "Giữa Học Kỳ 2", checkpointCode: "GIUA_KY_2", checkpointLabel: "Mốc Giữa Kỳ 2" },

  "CUOI_NAM": { periodCode: "CK2", periodLabel: "Cuối Năm Học", checkpointCode: "CUOI_NAM", checkpointLabel: "Mốc Cuối Năm Học" },
  "CK2": { periodCode: "CK2", periodLabel: "Cuối Năm Học", checkpointCode: "CUOI_NAM", checkpointLabel: "Mốc Cuối Năm Học" },
  "CUOI_KY_2": { periodCode: "CK2", periodLabel: "Cuối Năm Học", checkpointCode: "CUOI_NAM", checkpointLabel: "Mốc Cuối Năm Học" }
}

const ALL_PERIODS = [
  { code: "KSĐN", label: "Khảo sát đầu năm", checkpoint: "DAU_NAM" },
  { code: "GK1", label: "Giữa kỳ 1", checkpoint: "GIUA_KY_1" },
  { code: "CK1", label: "Cuối kỳ 1", checkpoint: "CUOI_KY_1" },
  { code: "GK2", label: "Giữa kỳ 2", checkpoint: "GIUA_KY_2" },
  { code: "CK2", label: "Cuối kỳ 2", checkpoint: "CUOI_NAM" }
]

interface SubjectTargetItem {
  subjectId?: string
  subjectName?: string
  subjectCode?: string
  overallTarget?: number
  targetScore?: number
  targetScores?: Record<string, number>
  note?: string
}

interface ComparisonResult {
  subjectId: string
  subjectName: string
  subjectCode: string
  targetScore: number | null
  targetSource: string
  actualScore: number | null
  componentScores: unknown[]
  benchmarkScore: number
  delta: number | null
  status: "SURPASSED" | "ACHIEVED" | "NEED_EFFORT" | "ALERT" | "NO_DATA"
  statusLabel: string
  statusBadge: string
  teacherRemark: string | null
}

export async function GET(request: Request) {
  try {
    const studentSess = await getStudentSession().catch(() => null)

    const { searchParams } = new URL(request.url)
    const rawStudentId = searchParams.get("studentId") || studentSess?.studentId
    const rawStudentCode = searchParams.get("studentCode")
    const rawPeriod = searchParams.get("evaluationPeriod") || searchParams.get("checkPoint") || "GK1"
    let academicYearId = searchParams.get("academicYearId") || ""

    if (!rawStudentId && !rawStudentCode) {
      return jsonResponse({ error: "Thiếu studentId hoặc studentCode" }, 400)
    }

    // Xác định kỳ đối sánh hiện tại
    const normalizedPeriodKey = rawPeriod.toUpperCase().trim()
    const periodConfig = PERIOD_MAPPING[normalizedPeriodKey] || PERIOD_MAPPING["GK1"]
    const targetPeriod = periodConfig.periodCode

    // 1. Tìm thông tin học sinh
    let student = null
    let targetStudentIds: string[] = []

    if (rawStudentId) {
      student = await prisma.student.findUnique({
        where: { id: rawStudentId },
        include: {
          class: {
            include: { academicYear: true, campus: true }
          }
        }
      }).catch(() => null)
    }

    if (!student && rawStudentCode) {
      student = await prisma.student.findFirst({
        where: { studentCode: rawStudentCode },
        include: {
          class: {
            include: { academicYear: true, campus: true }
          }
        }
      }).catch(() => null)
    }

    if (!student) {
      return jsonResponse({ error: "Không tìm thấy thông tin học sinh" }, 404)
    }

    // Hỗ trợ map nếu HS có nhiều record cùng studentCode
    if (student.studentCode) {
      const peers = await prisma.student.findMany({
        where: { studentCode: student.studentCode },
        select: { id: true }
      }).catch(() => [])
      targetStudentIds = peers.map(p => p.id)
    } else {
      targetStudentIds = [student.id]
    }

    if (!academicYearId) {
      academicYearId = student.academicYearId || student.class?.academicYearId || ""
    }

    // 2. Lấy Mục tiêu Học tập của học sinh
    const academicGoals = await prisma.studentGoal.findMany({
      where: {
        studentId: { in: targetStudentIds },
        category: "HOC_TAP",
        ...(academicYearId ? { academicYearId } : {})
      },
      include: { actions: true },
      orderBy: { createdAt: "desc" }
    }).catch(() => [])

    // Phân tích subjectTargets nếu học sinh đã thiết lập chi tiết môn học
    const parsedSubjectTargets: Record<string, { targetScore: number; note?: string }> = {}
    let generalTargetGpa: number | null = null

    academicGoals.forEach(g => {
      // 1. Thử đọc từ smartMeasurable (JSON payload lưu target điểm môn)
      if (g.smartMeasurable) {
        try {
          const parsed = JSON.parse(g.smartMeasurable)
          if (Array.isArray(parsed)) {
            parsed.forEach((item: SubjectTargetItem) => {
              const key = (item.subjectName || item.subjectCode || item.subjectId || "").toLowerCase().trim()
              let score = item.overallTarget
              if (item.targetScores && item.targetScores[targetPeriod] !== undefined) {
                score = Number(item.targetScores[targetPeriod])
              } else if (item.targetScores && item.targetScores[periodConfig.checkpointCode] !== undefined) {
                score = Number(item.targetScores[periodConfig.checkpointCode])
              }
              if (key && score !== undefined && !isNaN(Number(score))) {
                parsedSubjectTargets[key] = { targetScore: Number(score), note: item.note }
              }
            })
          } else if (typeof parsed === "object" && parsed !== null) {
            const obj = parsed as { targets?: SubjectTargetItem[]; targetGpa?: number }
            if (obj.targets && Array.isArray(obj.targets)) {
              obj.targets.forEach((item: SubjectTargetItem) => {
                const key = (item.subjectName || item.subjectCode || item.subjectId || "").toLowerCase().trim()
                let score = item.overallTarget
                if (item.targetScores && item.targetScores[targetPeriod] !== undefined) {
                  score = Number(item.targetScores[targetPeriod])
                }
                if (key && score !== undefined && !isNaN(Number(score))) {
                  parsedSubjectTargets[key] = { targetScore: Number(score), note: item.note }
                }
              })
            }
            if (obj.targetGpa) generalTargetGpa = Number(obj.targetGpa)
          }
        } catch {
          // Chuỗi thông thường, thử tìm số
          const numMatch = g.smartMeasurable.match(/(\d+[.,]?\d*)/)
          if (numMatch) generalTargetGpa = parseFloat(numMatch[1].replace(",", "."))
        }
      }

      // 2. Thử đoán điểm từ targetText (ví dụ: "đạt hsg", "Toán 8.5, Văn 8.0, Anh 9.0")
      if (g.targetText) {
        const text = g.targetText.toLowerCase()
        if (text.includes("xuất sắc") || text.includes("xuat sac")) {
          if (!generalTargetGpa) generalTargetGpa = 9.0
        } else if (text.includes("hsg") || text.includes("học sinh giỏi") || text.includes("hoc sinh gioi") || text.includes("tốt")) {
          if (!generalTargetGpa) generalTargetGpa = 8.0
        }

        // Tìm các cặp môn: điểm như "toán 8.5", "văn: 8.0"
        const matches = text.matchAll(/(toán|toan|văn|van|ngữ văn|tiếng anh|tieng anh|anh|lý|ly|hóa|hoa|sinh|khtn|tin|lịch sử|dia|địa)\s*[:=-]?\s*(\d+[.,]?\d*)/gi)
        for (const m of matches) {
          const sub = m[1].toLowerCase()
          const sc = parseFloat(m[2].replace(",", "."))
          if (!isNaN(sc) && sc >= 0 && sc <= 10) {
            parsedSubjectTargets[sub] = { targetScore: sc }
          }
        }
      }
    })

    if (!generalTargetGpa) {
      generalTargetGpa = 8.0 // Mặc định kỳ vọng mục tiêu mức Khá-Giỏi tại Sky-Line
    }

    // 3. Lấy tất cả điểm kiểm tra định kỳ của học sinh từ SubjectGradeEntry
    const gradeEntries = await prisma.subjectGradeEntry.findMany({
      where: {
        studentId: { in: targetStudentIds },
        ...(academicYearId ? { academicYearId } : {})
      },
      include: {
        subject: true
      },
      orderBy: { createdAt: "desc" }
    }).catch(() => [])

    // Lấy Benchmarks nếu có
    const benchmarks = await prisma.subjectBenchmarkConfig.findMany({
      where: {
        ...(academicYearId ? { academicYearId } : {})
      }
    }).catch(() => [])

    // Tập hợp danh sách các môn học xuất hiện
    interface SubjectInfo {
      id: string
      subjectName?: string | null
      name?: string | null
      subjectCode?: string | null
      code?: string | null
    }
    const subjectMap = new Map<string, SubjectInfo>()

    // Đưa môn từ gradeEntries vào map
    gradeEntries.forEach(entry => {
      if (entry.subject && !subjectMap.has(entry.subject.id)) {
        subjectMap.set(entry.subject.id, entry.subject)
      }
    })

    // Nếu không có gradeEntries, lấy danh sách môn học từ SubjectGradeConfig của lớp/khối
    if (subjectMap.size === 0 && student.classId) {
      const configs = await prisma.subjectGradeConfig.findMany({
        where: {
          academicYearId,
          subjectId: { not: null },
          status: "ACTIVE"
        },
        include: { subject: true }
      }).catch(() => [])
      configs.forEach(c => {
        if (c.subject && !subjectMap.has(c.subject.id)) {
          subjectMap.set(c.subject.id, c.subject)
        }
      })
    }

    // 4. Xây dựng ma trận so sánh theo kỳ hiện tại
    const currentPeriodEntries = gradeEntries.filter(e => {
      const ep = (e.evaluationPeriod || "").toUpperCase()
      return ep === targetPeriod || ep === periodConfig.checkpointCode
    })

    const comparisons: ComparisonResult[] = []
    let totalActualScore = 0
    let countActualScore = 0
    let totalTargetScore = 0
    let countTargetScore = 0

    let achievedCount = 0
    let needEffortCount = 0
    let alertCount = 0
    let surpassedCount = 0

    // Duyệt qua từng môn học để map
    subjectMap.forEach((sub, subId) => {
      const entry = currentPeriodEntries.find(e => e.subjectId === subId)
      const subNameLower = (sub.subjectName || sub.name || "").toLowerCase()
      const subCodeLower = (sub.subjectCode || sub.code || "").toLowerCase()

      // Tìm targetScore cho môn
      let targetScore: number | null = null
      let targetSource = "Chung"

      // Khớp theo tên môn hoặc mã môn
      for (const [key, val] of Object.entries(parsedSubjectTargets)) {
        if (subNameLower.includes(key) || subCodeLower === key || key.includes(subNameLower)) {
          targetScore = val.targetScore
          targetSource = "Cá nhân tự đặt"
          break
        }
      }

      if (targetScore === null) {
        targetScore = generalTargetGpa
        targetSource = "Mục tiêu chung"
      }

      const actualScore = entry?.compositeScore != null ? Number(entry.compositeScore) : null
      let delta: number | null = null
      let status: "SURPASSED" | "ACHIEVED" | "NEED_EFFORT" | "ALERT" | "NO_DATA" = "NO_DATA"
      let statusLabel = "Chưa có điểm"
      let statusBadge = "bg-slate-100 text-slate-600 border-slate-200"

      // Tìm benchmark của môn
      const bm = benchmarks.find(b => b.subjectId === subId || b.subjectId === "ALL")
      const benchmarkScore = bm?.benchmarkScore ?? 6.0

      if (actualScore != null && targetScore != null) {
        delta = Math.round((actualScore - targetScore) * 10) / 10
        totalActualScore += actualScore
        countActualScore++
        totalTargetScore += targetScore
        countTargetScore++

        if (delta >= 0.5) {
          status = "SURPASSED"
          statusLabel = "Vượt mục tiêu 🌟"
          statusBadge = "bg-emerald-100 text-emerald-800 border-emerald-300"
          surpassedCount++
          achievedCount++
        } else if (delta >= 0) {
          status = "ACHIEVED"
          statusLabel = "Đạt mục tiêu ✅"
          statusBadge = "bg-teal-100 text-teal-800 border-teal-300"
          achievedCount++
        } else if (delta >= -0.9) {
          status = "NEED_EFFORT"
          statusLabel = "Cần nỗ lực ⚠️"
          statusBadge = "bg-amber-100 text-amber-900 border-amber-300"
          needEffortCount++
        } else {
          status = "ALERT"
          statusLabel = "Báo động hụt chuẩn 🚨"
          statusBadge = "bg-rose-100 text-rose-800 border-rose-300"
          alertCount++
        }

        // Bổ sung nếu thấp hơn benchmark của nhà trường
        if (actualScore < benchmarkScore && status !== "ALERT") {
          status = "ALERT"
          statusLabel = "Dưới Benchmark trường 🚨"
          statusBadge = "bg-rose-100 text-rose-800 border-rose-300"
          alertCount++
          if (needEffortCount > 0) needEffortCount--
        }
      }

      // Đọc componentScores
      let parsedComponentScores: unknown[] = []
      if (entry?.componentScores) {
        try {
          parsedComponentScores = typeof entry.componentScores === "string" ? JSON.parse(entry.componentScores) : (entry.componentScores as unknown[])
        } catch {
          parsedComponentScores = []
        }
      }

      comparisons.push({
        subjectId: sub.id,
        subjectName: sub.subjectName || sub.name || "Môn học",
        subjectCode: sub.subjectCode || sub.code || "",
        targetScore,
        targetSource,
        actualScore,
        componentScores: parsedComponentScores,
        benchmarkScore,
        delta,
        status,
        statusLabel,
        statusBadge,
        teacherRemark: entry?.remark || null
      })
    })

    // Sắp xếp các môn có điểm trước, môn chưa đạt lên đầu để ưu tiên cố vấn
    comparisons.sort((a, b) => {
      const order: Record<string, number> = { ALERT: 1, NEED_EFFORT: 2, NO_DATA: 3, ACHIEVED: 4, SURPASSED: 5 }
      return (order[a.status] || 99) - (order[b.status] || 99)
    })

    // 5. Thống kê theo lịch sử tất cả các đợt (Trend Timeline)
    const historyTimeline = ALL_PERIODS.map(p => {
      const pEntries = gradeEntries.filter(e => {
        const ep = (e.evaluationPeriod || "").toUpperCase()
        return ep === p.code || ep === p.checkpoint
      })
      const validScores = pEntries.map(e => e.compositeScore).filter(sc => sc != null && !isNaN(Number(sc))) as number[]
      const avg = validScores.length > 0 ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10 : null

      return {
        periodCode: p.code,
        periodLabel: p.label,
        checkpoint: p.checkpoint,
        hasData: validScores.length > 0,
        subjectsCount: validScores.length,
        averageScore: avg,
        targetGpa: generalTargetGpa
      }
    })

    // 6. Tính tổng kết đợt hiện tại
    const avgActual = countActualScore > 0 ? Math.round((totalActualScore / countActualScore) * 10) / 10 : null
    const avgTarget = countTargetScore > 0 ? Math.round((totalTargetScore / countTargetScore) * 10) / 10 : generalTargetGpa
    const overallDelta = avgActual != null && avgTarget != null ? Math.round((avgActual - avgTarget) * 10) / 10 : null
    const totalCount = countActualScore
    const achievedRate = totalCount > 0 ? Math.round((achievedCount / totalCount) * 100) : 0

    // Gợi ý đánh giá và lời khuyên cố vấn
    let suggestedAdvisoryStatus: "DAT" | "TIEN_TRIEN" | "CHUA_DAT" = "TIEN_TRIEN"
    let advisoryNotes = ""

    if (totalCount === 0) {
      advisoryNotes = "Chưa có kết quả kiểm tra định kỳ của đợt này. Học sinh tiếp tục bám sát kế hoạch rèn luyện."
      suggestedAdvisoryStatus = "TIEN_TRIEN"
    } else if (achievedRate >= 80) {
      suggestedAdvisoryStatus = "DAT"
      advisoryNotes = `Xuất sắc! Đạt ${achievedRate}% số môn mục tiêu (ĐTB: ${avgActual}/${avgTarget}). Khen ngợi tinh thần tự chủ và nỗ lực học tập của em.`
    } else if (achievedRate >= 50) {
      suggestedAdvisoryStatus = "TIEN_TRIEN"
      const alertSubs = comparisons.filter(c => c.status === "ALERT" || c.status === "NEED_EFFORT").map(c => c.subjectName).join(", ")
      advisoryNotes = `Đang có tiến triển (Đạt ${achievedRate}% mục tiêu). Cần tập trung tăng tốc và phân bổ thêm thời gian ôn tập cho môn: ${alertSubs || "các môn dưới chuẩn"}.`
    } else {
      suggestedAdvisoryStatus = "CHUA_DAT"
      const alertSubs = comparisons.filter(c => c.status === "ALERT").map(c => c.subjectName).join(", ")
      advisoryNotes = `Cần hỗ trợ học tập khẩn cấp! Tỷ lệ đạt mục tiêu chỉ ${achievedRate}%. Cần mở phiên tư vấn 1-1 với GVBM và GVCN cho các môn: ${alertSubs || "các môn chính"}.`
    }

    return jsonResponse({
      student: {
        id: student.id,
        studentCode: student.studentCode,
        studentName: student.studentName,
        className: student.class?.className || "",
        grade: student.grade || student.class?.grade || ""
      },
      period: {
        currentPeriod: targetPeriod,
        periodLabel: periodConfig.periodLabel,
        checkpoint: periodConfig.checkpointCode,
        checkpointLabel: periodConfig.checkpointLabel
      },
      summary: {
        averageActual: avgActual,
        averageTarget: avgTarget,
        overallDelta,
        totalSubjects: comparisons.length,
        evaluatedSubjects: countActualScore,
        achievedCount,
        surpassedCount,
        needEffortCount,
        alertCount,
        achievedRate,
        suggestedAdvisoryStatus,
        advisoryNotes
      },
      comparisons,
      historyTimeline,
      studentAcademicGoal: {
        goalsCount: academicGoals.length,
        primaryGoalText: academicGoals[0]?.targetText || "Chưa nhập mục tiêu định tính",
        studentCommitment: academicGoals[0]?.studentCommitment || "",
        teacherSupportRequest: academicGoals[0]?.teacherSupportRequest || "",
        parentSupportRequest: academicGoals[0]?.parentSupportRequest || ""
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("GET /api/advisory/academic-comparison error:", error)
    return jsonResponse({ error: message }, 500)
  }
}
