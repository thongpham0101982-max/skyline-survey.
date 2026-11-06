import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { ensureTriPartyTables } from "@/lib/advisory/triparty-sync"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

export type AiAdvisorMode = 
  | "PROGRESS_ANALYSIS"    // 3.2: AI Phân tích học sinh & tiến bộ
  | "CONSULTATION_TOPICS"   // 3.3: AI Gợi ý nội dung trao đổi & câu hỏi gợi mở
  | "SMART_GOALS"           // 3.4: AI Gợi ý mục tiêu SMART
  | "SUPPORT_SOLUTIONS"     // 3.5: AI Đề xuất giải pháp & đánh giá sau hỗ trợ
  | "TERM_EVALUATION"       // 3.1: AI Nhận xét tiến bộ theo rubric

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Unauthorized" }, 401)

    const body = await req.json()
    const { 
      studentId, 
      academicYearId, 
      mode = "PROGRESS_ANALYSIS", 
      targetCategory = "HOC_TAP",
      evalTerm = "HK1"
    } = body

    if (!studentId) {
      return jsonResponse({ error: "Thiếu studentId" }, 400)
    }

    // 1. Thu thập dữ liệu đồng thời tất cả các bảng (Song song hóa toàn diện Promise.all)
    const [
      student,
      gradeEntries,
      goals,
      trackingLogs,
      consultations,
      supportTargets
    ] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          studentName: true,
          studentCode: true,
          class: { select: { id: true, className: true, grade: true } }
        }
      }),
      prisma.subjectGradeEntry.findMany({
        where: {
          studentId,
          ...(academicYearId ? { academicYearId } : {})
        },
        select: {
          subjectId: true,
          compositeScore: true,
          evaluationPeriod: true,
          subject: { select: { id: true, subjectName: true, subjectCode: true } }
        },
        orderBy: { updatedAt: "desc" },
        take: 25
      }).catch(() => []),
      prisma.studentGoal.findMany({
        where: {
          studentId,
          ...(academicYearId ? { academicYearId } : {})
        },
        select: {
          id: true,
          category: true,
          targetText: true,
          status: true,
          achievementLevel: true,
          actions: { select: { actionText: true, status: true }, take: 2 }
        },
        orderBy: { createdAt: "desc" },
        take: 10
      }).catch(() => []),
      prisma.studentGoalTrackingLog.findMany({
        where: {
          studentId,
          ...(academicYearId ? { academicYearId } : {})
        },
        select: {
          progressStatus: true,
          teacherNotes: true
        },
        orderBy: { createdAt: "desc" },
        take: 5
      }).catch(() => []),
      prisma.academicConsultationLog.findMany({
        where: {
          studentId,
          ...(academicYearId ? { academicYearId } : {})
        },
        select: {
          meetingDate: true,
          difficulties: true,
          content: true,
          status: true
        },
        orderBy: { meetingDate: "desc" },
        take: 3
      }).catch(() => []),
      prisma.learningSupportTarget.findMany({
        where: {
          studentId,
          ...(academicYearId ? { academicYearId } : {})
        },
        select: {
          id: true,
          supportType: true,
          reason: true,
          startDate: true,
          status: true
        },
        take: 3
      }).catch(() => [])
    ])

    if (!student) return jsonResponse({ error: "Không tìm thấy học sinh" }, 404)

    const gradeLevel = student.class?.grade || "K10"
    const isPrimary = ["K1", "K2", "K3", "K4", "K5", "Lớp 1", "Lớp 2", "Lớp 3", "Lớp 4", "Lớp 5"].some(k => gradeLevel.toUpperCase().includes(k))
    const isMiddleSchool = ["K6", "K7", "K8", "K9", "Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9"].some(k => gradeLevel.toUpperCase().includes(k))
    const isHighSchool = !isPrimary && !isMiddleSchool

    // 2. Tra cứu điểm KSCL đầu năm (nếu có studentCode, có circuit-breaker 1s để không chặn tiến trình)
    let baselineTotalScore: number | null = null
    if (student.studentCode) {
      try {
        const baseline = await Promise.race([
          prisma.inputAssessmentStudent.findFirst({
            where: { studentCode: student.studentCode },
            select: {
              mathScore: true,
              literatureScore: true,
              writtenEnglishScore: true,
              oralEnglishScore: true,
              psychologyScore: true
            }
          }),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 1000))
        ])
        if (baseline) {
          const validScores = [
            baseline.mathScore,
            baseline.literatureScore,
            baseline.writtenEnglishScore,
            baseline.oralEnglishScore
          ].filter((s): s is number => typeof s === "number")
          if (validScores.length > 0) {
            baselineTotalScore = Math.round(validScores.reduce((a, b) => a + b, 0) * 10) / 10
          }
        }
      } catch {}
    }

    // 3. Phân tích Dữ liệu Học thuật (Analytical & Pedagogical Rule Engine)
    await ensureTriPartyTables()
    const [
      classTeachingAssignments,
      fallbackSubjectTeachers,
      existingGvbmTasks,
      hollandAssessmentRows,
      studentFeedbackRows,
      orientationRecordRows
    ] = await Promise.all([
      student.class?.id
        ? prisma.teachingAssignment
            .findMany({
              where: {
                classId: student.class.id,
                ...(academicYearId && academicYearId !== "all" ? { academicYearId } : {})
              },
              include: {
                teacher: {
                  select: { id: true, teacherName: true, teacherCode: true, email: true }
                },
                subject: {
                  select: { id: true, subjectName: true, subjectCode: true }
                }
              }
            })
            .catch(() => [])
        : Promise.resolve([]),
      prisma.teacher
        .findMany({
          where: { status: "ACTIVE" },
          select: {
            id: true,
            teacherName: true,
            teacherCode: true,
            mainSubjectId: true,
            mainSubjectRel: { select: { id: true, subjectName: true, subjectCode: true } }
          },
          take: 80
        })
        .catch(() => []),
      prisma
        .$queryRawUnsafe<any[]>(
          `SELECT * FROM "SubjectTeacherAdvisoryTask" WHERE "studentId" = ? ORDER BY "createdAt" DESC`,
          studentId
        )
        .catch(() => []),
      prisma
        .$queryRawUnsafe<any[]>(
          `SELECT * FROM "StudentHollandAssessment" WHERE "studentId" = ? AND "status" = 'COMPLETED' ORDER BY "updatedAt" DESC LIMIT 1`,
          studentId
        )
        .catch(() => []),
      prisma
        .$queryRawUnsafe<any[]>(
          `SELECT * FROM "StudentAdvisoryFeedback" WHERE "studentId" = ? OR "studentCode" = ? ORDER BY "createdAt" DESC LIMIT 5`,
          studentId,
          student.studentCode || studentId
        )
        .catch(() => []),
      prisma
        .$queryRawUnsafe<any[]>(
          `SELECT * FROM "OrientationAdvisoryRecord" WHERE "studentId" = ? OR "studentCode" = ? ORDER BY "updatedAt" DESC LIMIT 1`,
          studentId,
          student.studentCode || studentId
        )
        .catch(() => [])
    ])

    let verifiedHolland: any = null
    if (hollandAssessmentRows?.[0]) {
      const hRow = hollandAssessmentRows[0]
      let hSummary: any = null
      try {
        hSummary = hRow.reportSummaryJson ? JSON.parse(hRow.reportSummaryJson) : null
      } catch {}
      verifiedHolland = {
        id: hRow.id,
        hollandCode: hRow.hollandCode || hSummary?.hollandCode || null,
        version: hRow.version || "SKL_PSYCH v2.6.1",
        reportSummary: hSummary,
        consultationRequested: Boolean(hRow.consultationRequested),
        consultationRequestTopic: hRow.consultationRequestTopic || ""
      }
    }

    const seenClassTeacherKeys = new Set<string>()
    const classTeachers = classTeachingAssignments
      .filter(ta => ta.teacher)
      .map(ta => ({
        teacherId: ta.teacher.id,
        teacherName: ta.teacher.teacherName,
        teacherCode: ta.teacher.teacherCode,
        subjectId: ta.subject?.id || ta.subjectId || "",
        subjectName: ta.subject?.subjectName || ""
      }))
      .filter(t => {
        const key = `${t.teacherId}_${t.subjectId || t.subjectName}`
        if (seenClassTeacherKeys.has(key)) return false
        seenClassTeacherKeys.add(key)
        return true
      })

    const dedupeByTeacherId = (
      list: Array<{
        teacherId: string
        teacherName: string
        teacherCode?: string | null
        subjectId?: string
        subjectName?: string
      }>
    ) => {
      const seen = new Set<string>()
      return list.filter(item => {
        if (!item.teacherId || seen.has(item.teacherId)) return false
        seen.add(item.teacherId)
        return true
      })
    }

    const resolveTeachersForSubject = (subjName: string, subjId?: string) => {
      const norm = (subjName || "").toLowerCase().trim()
      const matchedFromClass = dedupeByTeacherId(
        classTeachers.filter(
          t =>
            (subjId && t.subjectId === subjId) ||
            t.subjectName.toLowerCase().trim() === norm ||
            t.subjectName.toLowerCase().includes(norm) ||
            norm.includes(t.subjectName.toLowerCase().trim())
        )
      )
      if (matchedFromClass.length > 0) return matchedFromClass

      const matchedFallback = dedupeByTeacherId(
        fallbackSubjectTeachers
          .filter(t => {
            const msName = (t.mainSubjectRel?.subjectName || "").toLowerCase().trim()
            return (
              (subjId && t.mainSubjectId === subjId) ||
              (msName && (msName === norm || msName.includes(norm) || norm.includes(msName)))
            )
          })
          .map(t => ({
            teacherId: t.id,
            teacherName: t.teacherName,
            teacherCode: t.teacherCode,
            subjectId: t.mainSubjectId || subjId || "",
            subjectName: t.mainSubjectRel?.subjectName || subjName
          }))
      )

      if (matchedFallback.length > 0) return matchedFallback
      if (classTeachers.length > 0) return dedupeByTeacherId(classTeachers).slice(0, 5)
      return dedupeByTeacherId(
        fallbackSubjectTeachers.slice(0, 8).map(t => ({
          teacherId: t.id,
          teacherName: t.teacherName,
          teacherCode: t.teacherCode,
          subjectId: subjId || "",
          subjectName: subjName
        }))
      )
    }

    const subjectMap = new Map<string, { id?: string; name: string; score: number; period: string }>()
    gradeEntries.forEach((g: any) => {
      const sName = g.subject?.subjectName || "Môn học"
      if (g.compositeScore !== null && !subjectMap.has(sName)) {
        subjectMap.set(sName, {
          id: g.subject?.id || g.subjectId || "",
          name: sName,
          score: g.compositeScore,
          period: g.evaluationPeriod || "Học kỳ gần nhất"
        })
      }
    })

    const subjectsList = Array.from(subjectMap.values())
    const strongSubjects = subjectsList.filter(s => s.score >= 8.0)
    const lagSubjects = subjectsList.filter(s => s.score < 6.0)
    const avgScore = subjectsList.length > 0 
      ? (subjectsList.reduce((acc, s) => acc + s.score, 0) / subjectsList.length).toFixed(1)
      : null

    // Đánh giá khoảng cách mục tiêu
    const achievedGoals = goals.filter(g => g.status === "COMPLETED" || g.achievementLevel === "DAT" || g.achievementLevel === "VUOT")
    const pendingGoals = goals.filter(g => g.status !== "COMPLETED" && g.achievementLevel !== "DAT" && g.achievementLevel !== "VUOT")

    // Dữ liệu bằng chứng (Data Evidence)
    const dataEvidence: Array<{ metric: string; value: string; timepoint: string }> = []
    if (avgScore) {
      dataEvidence.push({
        metric: "Điểm trung bình các môn học",
        value: `${avgScore}/10`,
        timepoint: "Học kỳ gần nhất"
      })
    }
    if (strongSubjects.length > 0) {
      dataEvidence.push({
        metric: "Thế mạnh học thuật nổi trội",
        value: strongSubjects.map(s => `${s.name} (${s.score})`).join(", "),
        timepoint: strongSubjects[0].period
      })
    }
    if (lagSubjects.length > 0) {
      dataEvidence.push({
        metric: "Môn học cần cải thiện (dưới 6.0)",
        value: lagSubjects.map(s => `${s.name} (${s.score})`).join(", "),
        timepoint: lagSubjects[0].period
      })
    }
    if (baselineTotalScore != null) {
      dataEvidence.push({
        metric: "Kết quả Khảo sát Đầu năm (KSCL)",
        value: `${baselineTotalScore} điểm`,
        timepoint: "Đầu năm học"
      })
    }
    dataEvidence.push({
      metric: "Tình trạng mục tiêu SMART",
      value: `Đạt ${achievedGoals.length}/${goals.length} mục tiêu đã đăng ký`,
      timepoint: "Cập nhật hiện tại"
    })
    if (verifiedHolland?.hollandCode) {
      const topName = verifiedHolland.reportSummary?.primaryProfile?.nameVi || "RIASEC"
      dataEvidence.push({
        metric: "Khảo sát Holland & Định hướng phát triển",
        value: `Mã ${verifiedHolland.hollandCode} (${topName}) — Nguồn tham khảo sở thích (không tự động gán nghề)`,
        timepoint: "Minh chứng tham khảo đã xác thực"
      })
    }
    if (Array.isArray(studentFeedbackRows) && studentFeedbackRows.length > 0) {
      const latestFb = studentFeedbackRows[0]
      dataEvidence.push({
        metric: "Phản hồi & Tự đánh giá của học sinh",
        value: latestFb.feedbackType === "POST_CONSULTATION"
          ? `Sau tư vấn: "${latestFb.feelingAfter || "Đã phản hồi"}" (${latestFb.understoodNextStep || "Hiểu rõ"})`
          : `Tự đánh giá mục tiêu: "${latestFb.actionsTaken || "Đã cập nhật"}"`,
        timepoint: "Cập nhật từ học sinh"
      })
    }
    if (Array.isArray(existingGvbmTasks) && existingGvbmTasks.length > 0) {
      const completedSupport = existingGvbmTasks.filter((t: any) => t.status === "APPROVED" || t.status === "RESPONDED").length
      dataEvidence.push({
        metric: "Kết quả đồng hành & hỗ trợ (GVBM / Tổ TLHN)",
        value: `${completedSupport}/${existingGvbmTasks.length} nhiệm vụ hỗ trợ đã có báo cáo kết quả`,
        timepoint: "Phối hợp đồng hành"
      })
    }
    if (Array.isArray(orientationRecordRows) && orientationRecordRows[0]?.agreedGoalTitle) {
      dataEvidence.push({
        metric: "Tư vấn Tổ Tâm lý – Hướng nghiệp (TLHN)",
        value: `Mục tiêu thống nhất: ${orientationRecordRows[0].agreedGoalTitle}`,
        timepoint: "Hồ sơ TLHN"
      })
    }

    const hasSufficientData = Boolean(avgScore || goals.length > 0 || baselineTotalScore != null)
    const insufficientDataMessage = !hasSufficientData 
      ? "Chưa đủ dữ liệu để kết luận chuyên môn (Học sinh chưa có điểm số học kỳ hoặc phiếu mục tiêu)." 
      : null

    // 4. Xử lý phản hồi theo từng chế độ yêu cầu (Modes)
    
    // -------------------------------------------------------------
    // CHẾ ĐỘ 1: PROGRESS_ANALYSIS (3.2: AI Phân tích học sinh & tiến bộ)
    // -------------------------------------------------------------
    if (mode === "PROGRESS_ANALYSIS") {
      const strengths = strongSubjects.length > 0
        ? strongSubjects.map(s => `Có năng khiếu và tiếp thu vượt trội ở môn ${s.name} (Điểm: ${s.score})`)
        : ["Học sinh duy trì thái độ học tập đều đặn, không có môn nào bị điểm liệt."]

      const difficultiesRecorded: string[] = []
      if (lagSubjects.length > 0) {
        difficultiesRecorded.push(`Điểm số môn ${lagSubjects.map(s => s.name).join(", ")} đang dưới chuẩn benchmark 6.0`)
      }
      consultations.forEach(c => {
        if (c.difficulties) difficultiesRecorded.push(`Ghi nhận từ CVHT ngày ${new Date(c.meetingDate).toLocaleDateString("vi-VN")}: "${c.difficulties}"`)
      })
      if (difficultiesRecorded.length === 0) {
        difficultiesRecorded.push("Chưa ghi nhận khó khăn học thuật nghiêm trọng.")
      }

      const verifiedTopicsNeeded = [
        "Xác minh nguyên nhân kết quả kiểm tra gần đây (phương pháp học hay áp lực thời gian)",
        "Độ bám sát thời gian biểu tự học buổi tối tại nhà",
        "Mức độ tương tác và chủ động hỏi bài giáo viên bộ môn trên lớp"
      ]

      const progressTrends = subjectsList.map(s => {
        const candidates = resolveTeachersForSubject(s.name, s.id)
        const targetScore = Math.min(8.5, Math.max(6.5, Math.round((s.score + 1.2) * 10) / 10))
        return {
          subjectId: s.id || "",
          subject: s.name,
          currentScore: s.score,
          needsSupport: s.score < 6.5,
          status: s.score >= 8.0 ? "Tiến bộ vượt trội" : s.score >= 6.5 ? "Ổn định" : "Cần hỗ trợ",
          recommendation: s.score < 6.5 ? "Bồi dưỡng thêm kiến thức trọng tâm" : "Khuyến khích duy trì phong độ",
          assignedTeachers: candidates,
          aiSuggestedPrompt:
            s.score < 6.5
              ? `Nhờ Thầy/Cô GVBM môn ${s.name} nhận định nguyên nhân điểm số hiện tại (${s.score} đ), chỉ ra chuyên đề kiến thức học sinh ${student.studentName} còn hổng và đề xuất hướng dẫn phối hợp cho Gia đình.`
              : `Nhờ Thầy/Cô GVBM môn ${s.name} định hướng thêm tài liệu nâng cao và phương pháp phát huy thế mạnh (${s.score} đ) cho học sinh ${student.studentName}.`,
          aiSuggestedGoal:
            s.score < 6.5
              ? `Nâng điểm môn ${s.name} từ ${s.score} lên tối thiểu ${targetScore} đ trong kỳ kiểm tra định kỳ tiếp theo.`
              : `Duy trì điểm môn ${s.name} đạt mức Giỏi/Xuất sắc (>= ${Math.max(8.0, s.score)} đ).`
        }
      })

      return jsonResponse({
        mode,
        studentId,
        studentName: student.studentName,
        className: student.class?.className || "",
        gradeLevel,
        hasSufficientData,
        insufficientDataMessage,
        dataEvidence,
        strengths,
        achievedGoalsCount: achievedGoals.length,
        totalGoalsCount: goals.length,
        goalCompletionRate: goals.length > 0 ? Math.round((achievedGoals.length / goals.length) * 100) : 0,
        gapAnalysis: lagSubjects.length > 0 
          ? `Khoảng cách điểm số: Cần cải thiện tối thiểu 0.5 - 1.0 điểm ở ${lagSubjects.map(s => s.name).join(", ")} để đạt chuẩn an toàn.`
          : "Học sinh đang theo sát tiến độ mục tiêu đề ra.",
        progressTrends,
        classTeachers,
        existingGvbmTasks: existingGvbmTasks || [],
        difficultiesRecorded,
        verifiedTopicsNeeded,
        disclaimer: "Mọi nhận định AI dựa trên dữ liệu học thuật số hóa của SSM. Không thay thế chẩn đoán chuyên môn của GVCN."
      })
    }

    // -------------------------------------------------------------
    // CHẾ ĐỘ 2: CONSULTATION_TOPICS (3.3: AI Gợi ý nội dung trao đổi & câu hỏi)
    // -------------------------------------------------------------
    if (mode === "CONSULTATION_TOPICS") {
      const positivePoints = strongSubjects.length > 0
        ? `Học sinh có kết quả xuất sắc môn ${strongSubjects.map(s => s.name).join(", ")} (${strongSubjects.map(s => s.score).join(", ")} đ).`
        : `Học sinh duy trì chuyên cần và đã hoàn thành ${achievedGoals.length} mục tiêu học kỳ.`

      const pendingPoints = lagSubjects.length > 0
        ? `Cần hỗ trợ tháo gỡ điểm nghẽn môn ${lagSubjects.map(s => s.name).join(", ")} đang dưới chuẩn.`
        : pendingGoals.length > 0
        ? `Còn ${pendingGoals.length} mục tiêu SMART đang trong tiến trình cần tăng tốc thực hiện.`
        : `Cần xác lập thêm mục tiêu nâng cao cho giai đoạn tiếp theo.`

      // 3-5 câu hỏi gợi mở phù hợp từng cấp học (Mang tính khuyến khích, không tạo áp lực)
      const openQuestions: string[] = []
      if (isPrimary) {
        openQuestions.push("Tuần vừa rồi con thấy môn học nào vui nhất và con tự hào nhất về điều gì?")
        openQuestions.push(lagSubjects.length > 0 
          ? `Ở môn ${lagSubjects[0].name}, con có gặp bài tập nào làm con cảm thấy băn khoăn hay cần cô giảng lại không?`
          : "Con đã làm việc tốt nào để hoàn thành mục tiêu học tập của mình chưa?"
        )
        openQuestions.push("Mỗi ngày về nhà, con thích bố mẹ hoặc thầy cô giúp đỡ con ở việc gì nhất?")
      } else if (isMiddleSchool) {
        openQuestions.push(lagSubjects.length > 0
          ? `Thầy/Cô thấy môn ${lagSubjects[0].name} gần đây đang có chút thử thách. Theo em, điều gì đang là rào cản lớn nhất khi em tiếp thu bài học này trên lớp?`
          : "Trong các mục tiêu năm học đã đăng ký, mục tiêu nào em cảm thấy mình làm tốt nhất và thấy tự tin nhất?"
        )
        openQuestions.push("Khi gặp một bài tập khó hoặc chưa hiểu rõ bài giảng, em thường chọn cách tự giải quyết, hỏi bạn hay trao đổi với thầy cô?")
        openQuestions.push("Kế hoạch tuần tới của em là gì, và thầy cô có thể hỗ trợ em ở điểm cụ thể nào?")
        openQuestions.push("Em thấy thời gian tự học ở nhà hiện tại đã đủ để hoàn thành bài tập các môn chưa?")
      } else {
        // High school
        openQuestions.push(lagSubjects.length > 0
          ? `Môn ${lagSubjects[0].name} là một môn quan trọng. Em đang gặp khó khăn ở khối lượng kiến thức, phương pháp làm bài hay cách phân bổ thời gian ôn tập?`
          : "Với năng lực học thuật hiện tại, em đã bắt đầu tìm hiểu ngành học hoặc khối thi phù hợp với thế mạnh của mình chưa?"
        )
        openQuestions.push("Em quản lý sự tập trung như thế nào khi tự học ở nhà? Có yếu tố nào đang làm em dễ xao nhãng không?")
        openQuestions.push("Mục tiêu điểm số hoặc dự án học tập trọng tâm nhất mà em muốn bứt phá trong tháng tới là gì?")
        openQuestions.push("Thầy cô và nhà trường có thể tạo điều kiện gì tốt nhất để đồng hành cùng lộ trình của em?")
      }

      if (verifiedHolland?.hollandCode) {
        const hPrimary = verifiedHolland.reportSummary?.primaryProfile?.nameVi || "nổi trội"
        const hCluster =
          verifiedHolland.reportSummary?.recommendedCareerClusters?.[0] ||
          "nhóm ngành phù hợp"
        openQuestions.push(
          `[Dữ liệu Holland ${verifiedHolland.hollandCode}] Kết quả khảo sát sở thích nghề nghiệp cho thấy em nổi trội ở nhóm ${hPrimary} (gợi ý: ${hCluster}). Em thấy định hướng này khớp với ước mơ và các môn học thế mạnh của em ở mức độ nào?`
        )
      }

      const actionsSuggested = [
        {
          title: lagSubjects.length > 0 
            ? `Trao đổi với GV bộ môn ${lagSubjects[0].name} để nhờ hướng dẫn lại 2 dạng bài tập khó`
            : "Lập danh sách 3 nhiệm vụ học tập ưu tiên cho mỗi buổi tối",
          timeframe: "3 ngày tới",
          responsible: "Học sinh"
        },
        {
          title: "GVCN theo dõi và kiểm tra lại tiến độ vào buổi sinh hoạt lớp tuần sau",
          timeframe: "7 ngày tới",
          responsible: "GVCN / CVHT"
        }
      ]

      return jsonResponse({
        mode,
        studentId,
        studentName: student.studentName,
        gradeLevel,
        hasSufficientData,
        insufficientDataMessage,
        dataEvidence,
        positivePoints,
        pendingPoints,
        openQuestions,
        topicsToVerify: [
          "Mức độ tập trung khi làm bài kiểm tra",
          "Việc ghi chép bài đầy đủ trên lớp",
          "Tình hình phối hợp học tập từ phía gia đình"
        ],
        actionsSuggested,
        disclaimer: "Câu hỏi gợi ý mang tính chất khích lệ tinh thần tự giác của học sinh, không dùng để gây áp lực hoặc phán xét."
      })
    }

    // -------------------------------------------------------------
    // CHẾ ĐỘ 3: SMART_GOALS (3.4: AI Gợi ý mục tiêu SMART)
    // -------------------------------------------------------------
    if (mode === "SMART_GOALS") {
      const primaryTargetSubject = lagSubjects.length > 0 ? lagSubjects[0].name : "Toán"
      const smartGoalsProposed = [
        {
          title: lagSubjects.length > 0
            ? `Nâng cao điểm số môn ${primaryTargetSubject} lên mức an toàn`
            : `Đạt thành tích Xuất sắc môn ${strongSubjects[0]?.name || "Toán"}`,
          category: "HOC_TAP",
          specific: lagSubjects.length > 0
            ? `Hoàn thành 100% bài tập về nhà môn ${primaryTargetSubject} và ôn tập kỹ các chuyên đề chưa nắm chắc`
            : `Duy trì điểm số các bài kiểm tra thường xuyên đạt từ 8.5 trở lên`,
          measurable: `Điểm bài kiểm tra 15 phút hoặc Giữa kỳ đạt từ ${lagSubjects.length > 0 ? "6.5" : "8.5"} điểm`,
          achievable: `Mục tiêu tăng từ ${lagSubjects[0]?.score || "7.5"} lên ${lagSubjects.length > 0 ? "6.5" : "8.5"}, phù hợp với năng lực nếu tự học 45 phút mỗi ngày`,
          relevant: `Giúp cải thiện học lực chung và không bị điểm dưới chuẩn`,
          timeBound: "Trước thời điểm sơ kết Giữa học kỳ",
          concreteActions: [
            `Dành 45 phút mỗi tối thứ 3 và thứ 5 làm bài tập môn ${primaryTargetSubject}`,
            "Chủ động đánh dấu các bài chưa hiểu để hỏi giáo viên bộ môn trong tiết tự học"
          ],
          evaluationMetric: "Điểm bài kiểm tra định kỳ tiếp theo",
          recheckPlan: "CVHT kiểm tra lại vở ghi và bài kiểm tra sau 2 tuần",
          status: "DRAFT_AI_SUGGESTED"
        },
        {
          title: "Hình thành thói quen tự học và quản lý thời gian chủ động",
          category: isPrimary ? "THOI_QUEN" : "KY_NANG",
          specific: "Chuẩn bị sách vở và đọc trước bài mới 15 phút trước khi đến lớp mỗi ngày",
          measurable: "Thực hiện liên tục và tích vào sổ tay theo dõi tối thiểu 10/14 ngày",
          achievable: "Thời gian ngắn, dễ thực hiện, tạo lập thói quen kỷ luật",
          relevant: "Giúp giảm bớt sự bỡ ngỡ khi tiếp thu bài mới trên lớp",
          timeBound: "Trong 2 tuần tới",
          concreteActions: [
            "Lập bảng check-list việc cần làm dán tại góc học tập",
            "Nhờ bố mẹ hoặc GVCN ký xác nhận cuối mỗi tuần"
          ],
          evaluationMetric: "Tỷ lệ ngày hoàn thành check-list",
          recheckPlan: "Check-in định kỳ tại phiên cố vấn 1-1 tiếp theo",
          status: "DRAFT_AI_SUGGESTED"
        },
        ...(verifiedHolland?.hollandCode
          ? [
              {
                title: `[Định hướng Holland ${verifiedHolland.hollandCode}] Phát triển năng lực hướng nghiệp nhóm ${
                  verifiedHolland.reportSummary?.primaryProfile?.nameVi || "RIASEC"
                }`,
                category: "DINH_HUONG",
                specific:
                  verifiedHolland.reportSummary?.recommendedSmartGoals?.[0] ||
                  `Tìm hiểu chuyên sâu nhóm ngành ${
                    verifiedHolland.reportSummary?.recommendedCareerClusters?.[0] || "mục tiêu"
                  } và củng cố tổ hợp môn nền tảng`,
                measurable:
                  "Hoàn thành 01 sản phẩm trải nghiệm / hồ sơ tìm hiểu ngành nghề và duy trì điểm các môn nền tảng >= 8.0",
                achievable: `Phù hợp với kết quả khảo sát sở thích nghề nghiệp đã xác thực (Mã ${verifiedHolland.hollandCode})`,
                relevant:
                  "Liên kết trực tiếp kết quả Khảo sát Holland với lộ trình chọn tổ hợp môn và định hướng nghề nghiệp",
                timeBound: "Trong Học kỳ hiện tại",
                concreteActions: [
                  verifiedHolland.reportSummary?.recommendedSkylineActivities?.[0] ||
                    "Tham gia CLB hoặc dự án trải nghiệm phù hợp mã Holland tại trường",
                  "Trao đổi 1:1 cùng GVCN/CVHT để rà soát tiến độ định hướng"
                ],
                evaluationMetric: "Minh chứng hoạt động trải nghiệm & kết quả môn học định hướng",
                recheckPlan: "GVCN/CVHT kiểm duyệt và đánh giá tại kỳ rà soát tiến độ",
                status: "DRAFT_AI_SUGGESTED"
              }
            ]
          : [])
      ]

      return jsonResponse({
        mode,
        studentId,
        studentName: student.studentName,
        gradeLevel,
        hasSufficientData,
        insufficientDataMessage,
        dataEvidence,
        smartGoalsProposed,
        disclaimer: "Mục tiêu do AI tạo ra chỉ ở trạng thái Đề xuất (Draft). CVHT và học sinh cần trao đổi thống nhất trước khi chính thức áp dụng."
      })
    }

    // -------------------------------------------------------------
    // CHẾ ĐỘ 4: SUPPORT_SOLUTIONS (3.5: AI Đề xuất giải pháp & đánh giá sau hỗ trợ)
    // -------------------------------------------------------------
    if (mode === "SUPPORT_SOLUTIONS") {
      const activeSupport = supportTargets[0]
      const beforeScore = baselineTotalScore ? baselineTotalScore : 6.0
      const currentScoreVal = avgScore ? parseFloat(avgScore) : 7.2
      const delta = (currentScoreVal - beforeScore).toFixed(1)

      const solutionsProposed = [
        {
          solutionName: "Kèm cặp chuyên đề trọng tâm cùng Giáo viên Bộ môn",
          scope: lagSubjects.length > 0 ? lagSubjects[0].name : "Môn học cần hỗ trợ",
          durationWeeks: 4,
          format: "Phụ đạo nhóm nhỏ 2-3 học sinh vào tiết tự học",
          targetOutcome: "Nắm vững lý thuyết cơ bản và giải được các bài tập mức độ nhận biết - thông hiểu"
        },
        {
          solutionName: "Đôi bạn cùng tiến & Nhật ký đồng hành",
          scope: "Rèn luyện phương pháp học tập",
          durationWeeks: 6,
          format: "Ghép cặp cùng một bạn học sinh có học lực tốt trong lớp",
          targetOutcome: "Tăng tính tự tin và tinh thần hợp tác học tập"
        },
        ...(verifiedHolland?.hollandCode
          ? [
              {
                solutionName: `Hoạt động trải nghiệm theo mã Holland (${verifiedHolland.hollandCode})`,
                scope:
                  verifiedHolland.reportSummary?.recommendedSkylineActivities?.[0] ||
                  "CLB & Dự án trải nghiệm hướng nghiệp Sky-Line",
                durationWeeks: 8,
                format: "Tham gia dự án trải nghiệm thực tế kết hợp cố vấn hướng nghiệp 1:1 (GVCN/CVHT kiểm duyệt)",
                targetOutcome: `Khơi dậy động lực học tập nội tại gắn với nhóm sở thích ${
                  verifiedHolland.reportSummary?.primaryProfile?.nameVi || verifiedHolland.hollandCode
                }`
              }
            ]
          : [])
      ]

      const postSupportEvaluation = {
        initialGoal: activeSupport?.reason || "Cải thiện kết quả học tập và phương pháp tự học",
        implementedSolution: activeSupport?.supportType === "ACADEMIC" ? "Bồi dưỡng học thuật chuyên sâu" : "Đồng hành rèn luyện phương pháp học",
        applicationPeriod: activeSupport?.startDate ? `Từ ${new Date(activeSupport.startDate).toLocaleDateString("vi-VN")}` : "Giai đoạn học kỳ I",
        beforeResult: `${beforeScore}/10 (Thời điểm bắt đầu hỗ trợ)`,
        afterResult: `${currentScoreVal}/10 (Đánh giá học kỳ hiện tại)`,
        observedImprovement: parseFloat(delta) >= 0 ? `Tăng +${delta} điểm (Có chuyển biến tích cực)` : `Giảm ${delta} điểm (Cần điều chỉnh phương án)`,
        strategicRecommendation: parseFloat(delta) >= 0 
          ? "Duy trì phương pháp hỗ trợ hiện tại, giảm dần tần suất phụ đạo để khuyến khích học sinh tự lập."
          : "Điều chỉnh giải pháp: Thay đổi tài liệu học tập và tăng cường trao đổi trực tiếp cùng phụ huynh."
      }

      return jsonResponse({
        mode,
        studentId,
        studentName: student.studentName,
        gradeLevel,
        hasSufficientData,
        insufficientDataMessage,
        dataEvidence,
        solutionsProposed,
        postSupportEvaluation,
        disclaimer: "Lưu ý sư phạm: Sự tiến bộ quan sát được có thể đến từ nhiều yếu tố (sự nỗ lực của học sinh, gia đình, nhà trường), không mặc định quy toàn bộ cho riêng hoạt động hỗ trợ."
      })
    }

    // -------------------------------------------------------------
    // CHẾ ĐỘ 5: TERM_EVALUATION (3.1: AI Nhận xét tiến bộ theo rubric)
    // -------------------------------------------------------------
    if (mode === "TERM_EVALUATION") {
      let draftRubricComment = ""
      const goalRate = goals.length > 0 ? Math.round((achievedGoals.length / goals.length) * 100) : 0

      if (goalRate >= 80 && (avgScore ? parseFloat(avgScore) >= 8.0 : true)) {
        draftRubricComment = `Trong ${evalTerm === "HK1" ? "Học kỳ I" : "Học kỳ II"}, học sinh thể hiện tinh thần học tập xuất sắc và tính chủ động cao. Đã hoàn thành ${goalRate}% các mục tiêu SMART đề ra. Điểm sáng ở môn ${strongSubjects.map(s => s.name).join(", ") || "các môn chuyên môn"}. Đề nghị tiếp tục phát huy năng lực tự nghiên cứu và tích cực tham gia các dự án trải nghiệm của trường.`
      } else if (goalRate >= 50) {
        draftRubricComment = `Trong ${evalTerm === "HK1" ? "Học kỳ I" : "Học kỳ II"}, học sinh có nhiều cố gắng trong việc bám sát các mục tiêu cá nhân (đạt ${goalRate}%). Thái độ học tập tích cực, có tiến bộ ở một số môn học. Cần chú trọng phân bổ thời gian tự học hợp lý hơn để bứt phá ở các môn còn gặp khó khăn (${lagSubjects.map(s => s.name).join(", ") || "kiến thức nâng cao"}).`
      } else {
        draftRubricComment = `Học sinh có ý thức rèn luyện tốt, tuy nhiên tiến độ thực hiện mục tiêu năm học còn chậm (${goalRate}%). Cần sự đồng hành sát sao hơn từ CVHT, GVBM và gia đình để tháo gỡ các khó khăn học tập môn ${lagSubjects.map(s => s.name).join(", ") || "học thuật"}, giúp con lấy lại sự tự tin.`
      }

      return jsonResponse({
        mode,
        studentId,
        studentName: student.studentName,
        gradeLevel,
        evalTerm,
        hasSufficientData,
        insufficientDataMessage,
        dataEvidence,
        goalCompletionRate: goalRate,
        suggestedRubricScores: {
          goalCompletionLevel: goalRate >= 80 ? 5 : goalRate >= 60 ? 4 : goalRate >= 40 ? 3 : 2,
          initiativeLevel: strongSubjects.length >= 2 ? 5 : strongSubjects.length >= 1 ? 4 : 3,
          participationAttitude: 4
        },
        draftRubricComment,
        disclaimer: "Lời nhận xét do AI dự thảo dựa trên kết quả học tập và tỷ lệ mục tiêu. GVCN xem xét và điều chỉnh phù hợp với thực tế quan sát học sinh trên lớp."
      })
    }

    return jsonResponse({ error: "Chế độ (mode) không hợp lệ" }, 400)
  } catch (error: any) {
    console.error("POST /api/advisory/ai-advisor/suggest error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}
