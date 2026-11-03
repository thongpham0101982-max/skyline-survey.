import { prisma } from "@/lib/db"
import { aggregateTeacherTasks } from "./index"
import { resolveTeacherAssignmentProfile } from "./assignmentMapper"
import { calculateTeacherProgressAndKPI } from "./kpiRulesEngine"

export type TaskAssistantQuestionType =
  | "TODAY_TASKS"
  | "OVERDUE_AND_DUE_SOON"
  | "MISSING_COMPETENCY"
  | "UNDER_BENCHMARK"
  | "OBSERVATION_KPI"
  | "UNRESOLVED_PARENT_OPINIONS"
  | "INCOMPLETE_EXPERIENTIAL"
  | "ADVISORY_PROFILES_UPDATE"
  | "MY_ASSIGNMENTS_AND_PERMISSIONS"
  | "CAREER_AND_SPECIAL_SUBJECTS"

export interface TaskAssistantAnswer {
  matched: boolean
  questionType?: TaskAssistantQuestionType
  markdown: string
  updatedAt: string
  deepLinks: Array<{ label: string; href: string }>
  metrics?: Record<string, any>
}

/**
 * Nhận diện câu hỏi thuộc phạm vi 8 câu hỏi trọng tâm của Sky-Line Task Assistant
 */
export function detectTaskAssistantQuestionType(query: string): TaskAssistantQuestionType | null {
  const q = query.toLowerCase().trim()

  // 1. Hôm nay tôi cần làm gì?
  if (
    q.includes("hôm nay tôi cần làm gì") ||
    q.includes("hôm nay cần làm gì") ||
    q.includes("việc hôm nay") ||
    q.includes("nhiệm vụ hôm nay") ||
    q.includes("ưu tiên làm gì") ||
    q.includes("tổng hợp công việc hôm nay")
  ) {
    return "TODAY_TASKS"
  }

  // 2. Những nhiệm vụ nào sắp quá hạn / quá hạn?
  if (
    q.includes("sắp quá hạn") ||
    q.includes("nhiệm vụ quá hạn") ||
    q.includes("việc quá hạn") ||
    q.includes("trễ hạn") ||
    q.includes("sắp đến hạn") ||
    q.includes("nhiệm vụ nào quá hạn")
  ) {
    return "OVERDUE_AND_DUE_SOON"
  }

  // 3. Tôi còn thiếu bao nhiêu đánh giá năng lực?
  if (
    q.includes("thiếu bao nhiêu đánh giá năng lực") ||
    q.includes("đánh giá năng lực") ||
    q.includes("đgnl") ||
    (q.includes("thiếu") && q.includes("năng lực"))
  ) {
    return "MISSING_COMPETENCY"
  }

  // 4. Các môn tôi phụ trách có bao nhiêu học sinh dưới chuẩn?
  if (
    (q.includes("môn") && q.includes("dưới chuẩn")) ||
    q.includes("bao nhiêu học sinh dưới chuẩn") ||
    q.includes("học sinh dưới chuẩn") ||
    q.includes("dưới điểm chuẩn") ||
    q.includes("dưới chuẩn benchmark")
  ) {
    return "UNDER_BENCHMARK"
  }

  // 5. Tôi còn thiếu bao nhiêu tiết dự giờ để đủ KPI?
  if (
    (q.includes("dự giờ") && (q.includes("kpi") || q.includes("thiếu") || q.includes("định mức") || q.includes("chỉ tiêu"))) ||
    q.includes("thiếu bao nhiêu tiết dự giờ")
  ) {
    return "OBSERVATION_KPI"
  }

  // 6. Ý kiến PHHS nào chưa được giải quyết?
  if (
    q.includes("ý kiến phhs") ||
    q.includes("ý kiến phụ huynh") ||
    q.includes("phản hồi phụ huynh") ||
    q.includes("phụ huynh nào chưa được giải quyết") ||
    (q.includes("phhs") && q.includes("chưa"))
  ) {
    return "UNRESOLVED_PARENT_OPINIONS"
  }

  // 7. Hoạt động trải nghiệm nào chưa hoàn thành?
  if (
    q.includes("hoạt động trải nghiệm") ||
    q.includes("hđtn") ||
    (q.includes("trải nghiệm") && (q.includes("chưa hoàn thành") || q.includes("chưa xong") || q.includes("còn thiếu")))
  ) {
    return "INCOMPLETE_EXPERIENTIAL"
  }

  // 8. Hồ sơ cố vấn học tập nào cần cập nhật?
  if (
    q.includes("hồ sơ cố vấn") ||
    q.includes("cố vấn học tập nào cần cập nhật") ||
    (q.includes("cố vấn") && (q.includes("cập nhật") || q.includes("cần xử lý") || q.includes("chưa ký") || q.includes("smart")))
  ) {
    return "ADVISORY_PROFILES_UPDATE"
  }

  // 9. Phân quyền & Phân công chuyên môn của tôi trên SSM?
  if (
    q.includes("phân công của tôi") ||
    q.includes("phân quyền của tôi") ||
    q.includes("phân công chuyên môn") ||
    q.includes("vai trò được gán") ||
    q.includes("lớp được gán") ||
    q.includes("tôi được phân công") ||
    q.includes("hồ sơ phân công")
  ) {
    return "MY_ASSIGNMENTS_AND_PERMISSIONS"
  }

  // 10. Sổ theo dõi hướng nghiệp & Môn đặc thù / KT&ĐBCL Connect?
  if (
    q.includes("sổ theo dõi hướng nghiệp") ||
    q.includes("hồ sơ hướng nghiệp") ||
    q.includes("môn đặc thù") ||
    q.includes("giáo dục hướng nghiệp") ||
    q.includes("kt&đbcl connect") ||
    q.includes("ktdbcl")
  ) {
    return "CAREER_AND_SPECIAL_SUBJECTS"
  }

  return null
}

/**
 * Sky-Line Task Assistant Engine
 * Trả lời chính xác 8 câu hỏi điều hành của Giáo viên dựa trên dữ liệu thực tế từ 9 phân hệ,
 * hiển thị mốc thời gian cập nhật và liên kết trực tiếp đến màn hình xử lý hoặc chứng cứ gốc.
 */
export async function answerTeacherTaskAssistantQuery(
  userId: string,
  query: string,
  options?: { fallbackToGeneral?: boolean }
): Promise<TaskAssistantAnswer> {
  const now = new Date()
  const timestampStr = now.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  const detectedType = detectTaskAssistantQuestionType(query)
  const qType = detectedType || (options?.fallbackToGeneral ? "TODAY_TASKS" : null)
  if (!qType) {
    return {
      matched: false,
      markdown: "",
      updatedAt: now.toISOString(),
      deepLinks: [],
    }
  }

  const profile = await resolveTeacherAssignmentProfile(userId)
  if (!profile) {
    return {
      matched: true,
      questionType: qType,
      markdown: `⚠️ **Thông báo**: Không tìm thấy hồ sơ phân công giáo viên gắn với tài khoản hiện tại. Vui lòng liên hệ Quản trị viên hệ thống.\n\n*🕒 Cập nhật lúc: ${timestampStr}*`,
      updatedAt: now.toISOString(),
      deepLinks: [{ label: "Mở Sổ Giáo Viên", href: "/teacher/tasks" }],
    }
  }

  const { tasks, counts } = await aggregateTeacherTasks(profile.userId, { includeCompleted: true })
  const kpi = await calculateTeacherProgressAndKPI(profile, tasks)

  // ============================================================================
  // CÂU HỎI 1: HÔM NAY TÔI CẦN LÀM GÌ?
  // ============================================================================
  if (qType === "TODAY_TASKS") {
    const actionableToday = tasks.filter(
      (t) =>
        t.status !== "COMPLETED" &&
        t.status !== "WAITING" &&
        (t.status === "OVERDUE" ||
          t.priority === "URGENT" ||
          t.priority === "HIGH" ||
          t.deadline.includes("Hôm nay") ||
          t.deadline.includes("24h"))
    )
    const waitingTasks = tasks.filter((t) => t.status === "WAITING")

    let md = `### 📋 Kế Hoạch Hành Động Hôm Nay — Thầy/Cô ${profile.teacherName}\n`
    md += `*🕒 Dữ liệu thực tế cập nhật lúc: **${timestampStr}** • Niên khóa ${profile.academicYearName}*\n\n`
    md += `- **Tổng nhiệm vụ đang mở**: **${counts.thisWeek}** việc (*Khẩn/Hôm nay: **${actionableToday.length}** | Quá hạn: **${counts.overdue}** | Đang chờ cấp trên duyệt: **${waitingTasks.length}***)\n`
    md += `- **Tiến độ khối lượng**: **${kpi.volumeProgress.completionRate}%** (${kpi.volumeProgress.completedTasks}/${kpi.volumeProgress.totalAssignedTasks} hạng mục)\n\n`

    if (actionableToday.length === 0) {
      md += `🎉 **Tuyệt vời!** Hôm nay Thầy/Cô không có nhiệm vụ khẩn cấp hay quá hạn nào tồn đọng.\n\n`
      if (tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "WAITING").length > 0) {
        md += `#### 📌 Các công việc định kỳ trong tuần/tháng (${tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "WAITING").length} việc):\n`
        tasks
          .filter((t) => t.status !== "COMPLETED" && t.status !== "WAITING")
          .slice(0, 5)
          .forEach((t, idx) => {
            md += `${idx + 1}. **[${t.metadata?.moduleLabel || t.sourceModule}]** ${t.title} — *Hạn: ${t.deadline}* ➔ [Xử lý ngay](${t.deepLink})\n`
          })
      }
    } else {
      md += `| # | Phân hệ | Nhiệm vụ cần ưu tiên xử lý | Hạn / Trạng thái | Điều hướng |\n`
      md += `| :---: | :--- | :--- | :---: | :---: |\n`
      actionableToday.slice(0, 8).forEach((t, idx) => {
        const badge = t.status === "OVERDUE" ? "🔴 Quá hạn" : t.priority === "URGENT" ? "🔥 Khẩn cấp" : "⚡ Ưu tiên"
        md += `| ${idx + 1} | **${t.metadata?.moduleLabel || t.sourceModule}** | ${t.title} | ${badge} (${t.deadline}) | [Mở màn hình](${t.deepLink}) |\n`
      })
    }

    if (waitingTasks.length > 0) {
      md += `\n> ⏳ **Lưu ý trạng thái chờ duyệt**: Có **${waitingTasks.length} hạng mục** Thầy/Cô đã hoàn thành gửi lên và đang chờ TTCM/BGH phê duyệt (hệ thống tự động tạm ngừng nhắc việc các mục này).\n`
    }

    md += `\n👉 Xem toàn bộ tại: [Trung tâm Nhiệm vụ - Sổ Giáo Viên](/teacher/tasks)`

    return {
      matched: true,
      questionType: qType,
      markdown: md,
      updatedAt: now.toISOString(),
      deepLinks: [
        { label: "Mở Sổ Giáo Viên", href: "/teacher/tasks" },
        ...actionableToday.slice(0, 3).map((t) => ({ label: t.title, href: t.deepLink })),
      ],
      metrics: { todayCount: actionableToday.length, overdueCount: counts.overdue },
    }
  }

  // ============================================================================
  // CÂU HỎI 2: NHỮNG NHIỆM VỤ NÀO SẮP QUÁ HẠN?
  // ============================================================================
  if (qType === "OVERDUE_AND_DUE_SOON") {
    const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000)
    const urgentOrOverdue = tasks.filter((t) => {
      if (t.status === "COMPLETED" || t.status === "WAITING") return false
      if (t.status === "OVERDUE" || t.priority === "URGENT" || t.priority === "HIGH") return true
      if (t.deadlineDate) {
        return new Date(t.deadlineDate) <= in72h
      }
      return false
    })

    let md = `### ⏰ Cảnh Báo Nhiệm Vụ Quá Hạn & Sắp Đến Hạn\n`
    md += `*🕒 Dữ liệu thực tế cập nhật lúc: **${timestampStr}***\n\n`
    md += `- **Nhiệm vụ đã quá hạn**: **${kpi.deadlineCompliance.overdueCount}** nhiệm vụ\n`
    md += `- **Nhiệm vụ sắp đến hạn (48h)**: **${kpi.deadlineCompliance.dueSoonCount}** nhiệm vụ\n`
    md += `- **Tỷ lệ tuân thủ thời hạn**: **${kpi.deadlineCompliance.complianceRate}%**\n\n`

    if (urgentOrOverdue.length === 0) {
      md += `✅ **An toàn tiến độ**: Hiện tại Thầy/Cô không có nhiệm vụ nào bị quá hạn hoặc sắp quá hạn trong 72 giờ tới.\n`
    } else {
      md += `| Mức độ | Phân hệ | Nội dung công việc & Điều kiện hoàn thành | Hạn chót | Thao tác |\n`
      md += `| :---: | :--- | :--- | :---: | :---: |\n`
      urgentOrOverdue.forEach((t) => {
        const statusTag = t.status === "OVERDUE" ? "🔴 Quá hạn" : "🟠 Sắp đến hạn"
        md += `| ${statusTag} | **${t.metadata?.moduleLabel || t.sourceModule}** | **${t.title}** | ${t.deadline} | [Xử lý](${t.deepLink}) |\n`
      })
    }

    return {
      matched: true,
      questionType: qType,
      markdown: md,
      updatedAt: now.toISOString(),
      deepLinks: [{ label: "Xem việc quá hạn trên Sổ Giáo Viên", href: "/teacher/tasks?filter=OVERDUE" }],
    }
  }

  // ============================================================================
  // CÂU HỎI 3: TÔI CÒN THIẾU BAO NHIÊU ĐÁNH GIÁ NĂNG LỰC?
  // ============================================================================
  if (qType === "MISSING_COMPETENCY") {
    let md = `### 🎯 Tiến Độ Đánh Giá Năng Lực (ĐGNL) — Thầy/Cô ${profile.teacherName}\n`
    md += `*🕒 Dữ liệu thực tế cập nhật lúc: **${timestampStr}***\n\n`

    const classBreakdown: Array<{
      className: string
      roleLabel: string
      totalStudents: number
      evaluatedCount: number
      missingCount: number
      link: string
    }> = []

    for (const hr of profile.homeroomClasses) {
      const evaluated = await prisma.studentSubjectCompetencySummary.findMany({
        where: { student: { classId: hr.id, status: "ACTIVE" } },
        select: { studentId: true },
        distinct: ["studentId"],
      }).catch(() => [])
      const evalCount = Math.min(hr.studentCount, evaluated.length)
      classBreakdown.push({
        className: hr.className,
        roleLabel: "Lớp chủ nhiệm",
        totalStudents: hr.studentCount,
        evaluatedCount: evalCount,
        missingCount: Math.max(0, hr.studentCount - evalCount),
        link: `/teacher/ho-so-nang-luc?classId=${hr.id}`,
      })
    }

    for (const ta of profile.teachingAssignments) {
      const [totalStudents, evaluated] = await Promise.all([
        prisma.student.count({ where: { classId: ta.classId, status: "ACTIVE" } }).catch(() => 0),
        prisma.studentSubjectCompetencySummary.count({
          where: {
            student: { classId: ta.classId, status: "ACTIVE" },
            subjectId: ta.subjectId,
          },
        }).catch(() => 0),
      ])
      const evalCount = Math.min(totalStudents, evaluated)
      classBreakdown.push({
        className: `${ta.className} (${ta.subjectName})`,
        roleLabel: "Bộ môn",
        totalStudents,
        evaluatedCount: evalCount,
        missingCount: Math.max(0, totalStudents - evalCount),
        link: `/teacher/so-diem-nhan-xet?classId=${ta.classId}&subjectId=${ta.subjectId}`,
      })
    }

    const totalMissing = classBreakdown.reduce((acc, r) => acc + r.missingCount, 0)
    const totalExpected = classBreakdown.reduce((acc, r) => acc + r.totalStudents, 0)
    const totalDone = classBreakdown.reduce((acc, r) => acc + r.evaluatedCount, 0)

    md += `- **Tổng số lượt học sinh cần ĐGNL**: **${totalExpected}** lượt\n`
    md += `- **Đã hoàn thành**: **${totalDone}** lượt\n`
    md += `- **Còn thiếu**: **${totalMissing} đánh giá năng lực**\n\n`

    if (classBreakdown.length === 0) {
      md += `Hiện tại tài khoản của Thầy/Cô chưa có lớp được phân công đánh giá năng lực.\n`
    } else {
      md += `| Lớp / Môn phụ trách | Vai trò | Sĩ số | Đã đánh giá | Còn thiếu | Điều hướng |\n`
      md += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`
      classBreakdown.forEach((row) => {
        md += `| **${row.className}** | ${row.roleLabel} | ${row.totalStudents} | ${row.evaluatedCount} | **${row.missingCount}** | [Cập nhật ĐGNL](${row.link}) |\n`
      })
    }

    return {
      matched: true,
      questionType: qType,
      markdown: md,
      updatedAt: now.toISOString(),
      deepLinks: classBreakdown.map((c) => ({ label: `ĐGNL ${c.className}`, href: c.link })),
      metrics: { totalMissing, totalDone, totalExpected },
    }
  }

  // ============================================================================
  // CÂU HỎI 4: CÁC MÔN TÔI PHỤ TRÁCH CÓ BAO NHIÊU HỌC SINH DƯỚI CHUẨN?
  // ============================================================================
  if (qType === "UNDER_BENCHMARK") {
    const tq = kpi.teachingQuality
    let md = `### 📉 Thống Kê Học Sinh Dưới Chuẩn Benchmark Các Môn Phụ Trách\n`
    md += `*🕒 Dữ liệu thực tế cập nhật lúc: **${timestampStr}***\n\n`
    md += `- **Tổng số học sinh đã chấm điểm**: **${tq.totalStudentsEvaluated}** học sinh\n`
    md += `- **Đạt chuẩn Benchmark**: **${tq.passBenchmarkCount}** học sinh (**${tq.passRate}%**)\n`
    md += `- **Dưới chuẩn cần hỗ trợ**: **${tq.underBenchmarkCount} học sinh**\n`
    md += `- **Tỷ lệ duy trì / tiến bộ qua các kỳ**: **${tq.progressRate}%**\n\n`

    if (tq.bySubjectClass.length === 0) {
      md += `Hiện tại Thầy/Cô chưa có dữ liệu phân công sổ điểm bộ môn.\n`
    } else {
      md += `| Lớp | Môn học | Chuẩn BM | ĐTB Lớp | Đạt chuẩn | Số HS dưới chuẩn | Hồ sơ chứng cứ |\n`
      md += `| :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n`
      tq.bySubjectClass.forEach((row) => {
        md += `| **${row.className}** | ${row.subjectName} | ${row.benchmarkScore} | ${row.averageScore ?? "Chưa có"} | ${row.passRate}% | **${row.underBenchmarkCount} HS** | [Xem danh sách](/teacher/phan-tich-chat-luong?classId=${row.classId}&subjectId=${row.subjectId}) |\n`
      })
    }

    md += `\n👉 Điều hướng nhanh: [Phân tích chất lượng môn giảng dạy](/teacher/phan-tich-chat-luong) • [Sổ Phụ đạo & Bồi dưỡng](/teacher/ho-tro-hoc-tap)`

    return {
      matched: true,
      questionType: qType,
      markdown: md,
      updatedAt: now.toISOString(),
      deepLinks: [
        { label: "Phân tích chất lượng bộ môn", href: "/teacher/phan-tich-chat-luong" },
        { label: "Sổ hỗ trợ học tập", href: "/teacher/ho-tro-hoc-tap" },
      ],
      metrics: { underBenchmarkCount: tq.underBenchmarkCount, passRate: tq.passRate },
    }
  }

  // ============================================================================
  // CÂU HỎI 5: TÔI CÒN THIẾU BAO NHIÊU TIẾT DỰ GIỜ ĐỂ ĐỦ KPI?
  // ============================================================================
  if (qType === "OBSERVATION_KPI") {
    const obsKpi = kpi.kpiAttainment.observationQuota
    let md = `### 🏫 Đối Chiếu Định Mức Dự Giờ & KPI Chuyên Môn (Tháng ${obsKpi.currentMonth}/${obsKpi.currentYear})\n`
    md += `*🕒 Dữ liệu thực tế cập nhật lúc: **${timestampStr}***\n\n`
    md += `- **Định mức dự giờ quy định**: **${obsKpi.requiredObservedQuota} tiết / tháng** (Chỉ tính phiếu đã được TTCM phê duyệt & hoàn thành đánh giá 11 tiêu chí)\n`
    md += `- **Số tiết hợp lệ đã thực hiện trong tháng ${obsKpi.currentMonth}**: **${obsKpi.observedValidCount} tiết**\n`
    md += `- **Số tiết đang chờ duyệt / chờ nhập phiếu**: **${kpi.approvalProgress.breakdown.observationsPending} lượt**\n`
    md += `- **Kết luận KPI Dự giờ tháng**: ${
      obsKpi.isObservationMet
        ? "✅ **ĐÃ ĐẠT ĐỊNH MỨC KPI THÁNG**"
        : `⏳ **CÒN THIẾU ${obsKpi.deficitPeriods} TIẾT DỰ GIỜ ĐỂ ĐỦ KPI**`
    }\n\n`

    if (!obsKpi.isObservationMet) {
      md += `> 💡 **Hành động tiếp theo**: Thầy/Cô cần đăng ký dự giờ thêm **${obsKpi.deficitPeriods} tiết** hoặc hoàn tất phiếu đánh giá cho các tiết đã đăng ký trước ngày cuối tháng.\n\n`
    }

    md += `👉 Liên kết xử lý trực tiếp: [Mở Sổ Dự Giờ & Đăng Ký Tiết Dự](/teacher/du-gio)`

    return {
      matched: true,
      questionType: qType,
      markdown: md,
      updatedAt: now.toISOString(),
      deepLinks: [{ label: "Mở Sổ Dự Giờ & KPI", href: "/teacher/du-gio" }],
      metrics: obsKpi,
    }
  }

  // ============================================================================
  // CÂU HỎI 6: Ý KIẾN PHHS NÀO CHƯA ĐƯỢC GIẢI QUYẾT?
  // ============================================================================
  if (qType === "UNRESOLVED_PARENT_OPINIONS") {
    const parentTasks = tasks.filter(
      (t) =>
        (t.sourceModule === "Y_KIEN_PHHS" || t.sourceModule === "NPS_PHHS") &&
        t.status !== "COMPLETED"
    )
    const supportEff = kpi.studentSupportEffectiveness
    const unresolvedCount = Math.max(
      parentTasks.length,
      supportEff.parentFeedbacksTotal - supportEff.parentFeedbacksResolvedCount
    )

    let md = `### 💬 Tình Trạng Tiếp Nhận & Giải Quyết Ý Kiến PHHS\n`
    md += `*🕒 Dữ liệu thực tế cập nhật lúc: **${timestampStr}***\n\n`
    md += `- **Tổng số lượt ý kiến PHHS ghi nhận**: **${supportEff.parentFeedbacksTotal}** ý kiến\n`
    md += `- **Đã phản hồi & xác nhận hoàn thành**: **${supportEff.parentFeedbacksResolvedCount}** ý kiến\n`
    md += `- **Chưa được giải quyết**: **${unresolvedCount} ý kiến**\n\n`

    if (parentTasks.length === 0) {
      md += `🎉 **Đã giải quyết 100%**: Hiện tại không có ý kiến Phụ huynh học sinh nào tồn đọng chưa phản hồi thuộc phạm vi phụ trách của Thầy/Cô.\n`
    } else {
      md += `| # | Lớp / Học sinh | Nội dung ý kiến PHHS / Khảo sát NPS | Trạng thái | Màn hình xử lý |\n`
      md += `| :---: | :--- | :--- | :---: | :---: |\n`
      parentTasks.forEach((t, idx) => {
        const stLabel =
          t.status === "WAITING"
            ? "⏳ Chờ GVBM phối hợp"
            : t.priority === "URGENT"
            ? "🔴 Cần phản hồi ngay"
            : "🟠 Đang xử lý"
        md += `| ${idx + 1} | **${t.metadata?.className || "Lớp phụ trách"}** | ${t.title}: *${t.description || ""}* | ${stLabel} | [Phản hồi ngay](${t.deepLink}) |\n`
      })
    }

    md += `\n👉 Điều hướng: [Trao đổi Ý kiến PHHS Lớp chủ nhiệm](/teacher/diem-lop-chu-nhiem) • [KT&ĐBCL Connect](/teacher/ktdbcl-connect)`

    return {
      matched: true,
      questionType: qType,
      markdown: md,
      updatedAt: now.toISOString(),
      deepLinks: [
        { label: "Sổ điểm & Ý kiến PHHS Lớp CN", href: "/teacher/diem-lop-chu-nhiem" },
        { label: "KT&ĐBCL Connect", href: "/teacher/ktdbcl-connect" },
      ],
      metrics: { unresolvedCount, total: supportEff.parentFeedbacksTotal },
    }
  }

  // ============================================================================
  // CÂU HỎI 7: HOẠT ĐỘNG TRẢI NGHIỆM NÀO CHƯA HOÀN THÀNH?
  // ============================================================================
  if (qType === "INCOMPLETE_EXPERIENTIAL") {
    const expTasks = tasks.filter(
      (t) => t.sourceModule === "TRAI_NGHIEM" && t.status !== "COMPLETED"
    )
    const expBreakdown = kpi.approvalProgress.breakdown

    let md = `### 🌱 Tiến Độ Hoạt Động Trải Nghiệm Được Giao\n`
    md += `*🕒 Dữ liệu thực tế cập nhật lúc: **${timestampStr}***\n\n`
    md += `- **Hoạt động đã được phê duyệt hoàn tất**: **${expBreakdown.activitiesApproved}** hoạt động\n`
    md += `- **Hoạt động đang thực hiện / chờ duyệt**: **${expTasks.length}** hoạt động\n\n`

    if (expTasks.length === 0) {
      md += `✅ **Hoàn tất 100%**: Tất cả các hoạt động trải nghiệm được gán cho Thầy/Cô đã hoàn thành đánh giá học sinh và phê duyệt hợp lệ.\n`
    } else {
      md += `| # | Hoạt động trải nghiệm | Lớp | Tiến độ đánh giá HS | Trạng thái | Điều hướng |\n`
      md += `| :---: | :--- | :---: | :---: | :---: | :---: |\n`
      expTasks.forEach((t, idx) => {
        const prog =
          t.metadata?.progressTotal !== undefined
            ? `${t.metadata.progressCurrent || 0}/${t.metadata.progressTotal} HS`
            : "Đang cập nhật"
        const st = t.status === "WAITING" ? "⏳ Chờ BGH duyệt" : "📝 Cần hoàn thiện đánh giá"
        md += `| ${idx + 1} | **${t.title}** | ${t.metadata?.className || "Chung"} | ${prog} | ${st} | [Mở hoạt động](${t.deepLink}) |\n`
      })
    }

    md += `\n👉 Mở danh sách đầy đủ tại: [Quản lý Hoạt động Trải nghiệm](/teacher/experiential-activities)`

    return {
      matched: true,
      questionType: qType,
      markdown: md,
      updatedAt: now.toISOString(),
      deepLinks: [{ label: "Quản lý Hoạt động Trải nghiệm", href: "/teacher/experiential-activities" }],
      metrics: { incompleteCount: expTasks.length, approvedCount: expBreakdown.activitiesApproved },
    }
  }

  // ============================================================================
  // CÂU HỎI 8: HỒ SƠ CỐ VẤN HỌC TẬP NÀO CẦN CẬP NHẬT?
  // ============================================================================
  if (qType === "ADVISORY_PROFILES_UPDATE") {
    const advisoryTasks = tasks.filter(
      (t) => t.sourceModule === "CO_VAN" && t.status !== "COMPLETED"
    )
    const eff = kpi.studentSupportEffectiveness
    const unsignedGoalsCount = Math.max(0, eff.smartGoalsTotal - eff.smartGoalsSignedCount)
    const unresolvedUnlocks = Math.max(0, eff.unlockBarriersTotal - eff.unlockBarriersResolvedCount)
    const pendingHelp = Math.max(0, eff.helpRequestsTotal - eff.helpRequestsResolvedCount)

    let md = `### 🤝 Rà Soát Hồ Sơ Cố Vấn Học Tập Cần Cập Nhật\n`
    md += `*🕒 Dữ liệu thực tế cập nhật lúc: **${timestampStr}***\n\n`
    md += `- **Học sinh diện Cảnh báo Đỏ / Vàng cần theo dõi sát**: **${eff.atRiskTotal}** HS (*Đỏ: ${eff.redAlertCount} | Vàng: ${eff.yellowAlertCount}*)\n`
    md += `- **Sổ mục tiêu SMART chưa ký xác nhận**: **${unsignedGoalsCount}** mục tiêu (Đã ký ${eff.smartGoalsSignedCount}/${eff.smartGoalsTotal})\n`
    md += `- **Kế hoạch 7 ngày gỡ rào cản đang mở**: **${unresolvedUnlocks}** kế hoạch\n`
    md += `- **Yêu cầu trợ giúp từ học sinh chờ phản hồi**: **${pendingHelp}** yêu cầu\n`
    md += `- **Hồ sơ bồi dưỡng/phụ đạo cần đánh giá định kỳ**: **${Math.max(0, eff.remedialTargetsTotal - eff.remedialEvaluatedCount)}** hồ sơ\n\n`

    if (advisoryTasks.length === 0) {
      md += `🎉 **Hoàn tất tốt**: Tất cả hồ sơ cố vấn học tập, sổ mục tiêu SMART và nhật ký hành động đều đã được cập nhật đầy đủ.\n`
    } else {
      md += `| # | Loại hồ sơ cố vấn | Nội dung cần cập nhật | Ưu tiên | Điều hướng |\n`
      md += `| :---: | :--- | :--- | :---: | :---: |\n`
      advisoryTasks.slice(0, 10).forEach((t, idx) => {
        const pBadge = t.priority === "URGENT" ? "🔴 Khẩn" : t.priority === "HIGH" ? "🟠 Cao" : "🟢 Thường"
        md += `| ${idx + 1} | **${t.taskType}** | ${t.title} — *${t.description || ""}* | ${pBadge} | [Cập nhật hồ sơ](${t.deepLink}) |\n`
      })
    }

    md += `\n👉 Truy cập phân hệ: [Sổ Cố vấn Học tập & Mục tiêu SMART](/teacher/co-van-hoc-tap) • [Phụ đạo & Hỗ trợ học tập](/teacher/ho-tro-hoc-tap)`

    return {
      matched: true,
      questionType: qType,
      markdown: md,
      updatedAt: now.toISOString(),
      deepLinks: [
        { label: "Sổ Cố vấn Học tập", href: "/teacher/co-van-hoc-tap" },
        { label: "Phụ đạo & Bồi dưỡng", href: "/teacher/ho-tro-hoc-tap" },
      ],
      metrics: eff,
    }
  }

  // ============================================================================
  // CÂU HỎI 9: PHÂN QUYỀN & PHÂN CÔNG CHUYÊN MÔN CỦA TÔI TRÊN SSM
  // ============================================================================
  if (qType === "MY_ASSIGNMENTS_AND_PERMISSIONS") {
    const roles: string[] = []
    if (profile.rolesDetected.isGVCN) {
      roles.push(`Chủ nhiệm (${profile.homeroomClasses.map((c) => c.className).join(", ")})`)
    }
    if (profile.rolesDetected.isGVBM) {
      roles.push(`Giảng dạy bộ môn (${profile.teachingAssignments.length + profile.ctqtAssignments.length} lớp)`)
    }
    if (profile.rolesDetected.isGVMonDacThu) {
      roles.push(`Môn đặc thù (${Array.from(new Set(profile.specialAssignments.map((s) => s.subjectName))).join(", ")})`)
    }
    if (profile.rolesDetected.isTTCM) {
      roles.push(`Tổ trưởng / Tổ phó CM (${profile.managedDepartmentNames.join(", ") || profile.departmentName || "Tổ CM"})`)
    }
    if (profile.rolesDetected.isTBP) {
      roles.push(`Trưởng bộ phận (${profile.managedDivisionNames.join(", ")})`)
    }
    if (profile.rolesDetected.isGDCS) {
      roles.push(`Ban Giám hiệu / GĐ Cơ sở`)
    }

    let md = `### 🛡️ Hồ Sơ Phân Quyền & Gán Chuyên Môn SSM — Thầy/Cô ${profile.teacherName}\n`
    md += `*🕒 Dữ liệu thực tế cập nhật lúc: **${timestampStr}** • Niên khóa ${profile.academicYearName}*\n\n`
    md += `- **Mã giáo viên**: \`${profile.teacherCode || "Chưa gán mã"}\` • **Vai trò hệ thống**: \`${profile.systemRole}\`\n`
    md += `- **Cơ sở công tác**: **${profile.campusNames.join(", ") || "Toàn hệ thống Sky-Line"}**\n`
    md += `- **Tổ chuyên môn**: **${profile.departmentName || "Chưa cập nhật"}**\n`
    md += `- **Vai trò nghiệp vụ được gán**: ${roles.length > 0 ? roles.map((r) => `**${r}**`).join(" • ") : "Giáo viên"}\n\n`

    if (profile.homeroomClasses.length > 0) {
      md += `#### 🏠 1. Lớp chủ nhiệm được gán (${profile.homeroomClasses.length} lớp):\n`
      profile.homeroomClasses.forEach((c) => {
        md += `- **Lớp ${c.className}** (Khối ${c.grade} • ${c.campusName || "Cơ sở"} • Sĩ số: **${c.studentCount} HS**) ➔ [Mở Lớp chủ nhiệm](/teacher/classes?classId=${c.id}) • [Sổ điểm lớp CN](/teacher/diem-lop-chu-nhiem?classId=${c.id})\n`
      })
      md += `\n`
    }

    if (profile.teachingAssignments.length > 0 || profile.ctqtAssignments.length > 0) {
      md += `#### 📚 2. Lớp & Môn giảng dạy được phân công (${profile.teachingAssignments.length + profile.ctqtAssignments.length} phân công):\n`
      profile.teachingAssignments.forEach((ta) => {
        md += `- **[MOET] Lớp ${ta.className}** — Môn **${ta.subjectName}** ➔ [Sổ điểm & Nhận xét](/teacher/so-diem-nhan-xet?classId=${ta.classId}&subjectId=${ta.subjectId})\n`
      })
      profile.ctqtAssignments.forEach((ca) => {
        md += `- **[CTQT] Lớp ${ca.className}** — Môn **${ca.subjectName}** ➔ [Sổ điểm CTQT](/teacher/ctqt-grades?classId=${ca.classId}&subjectId=${ca.subjectId})\n`
      })
      md += `\n`
    }

    if (profile.specialAssignments.length > 0) {
      md += `#### 🎨 3. Môn đặc thù được gán (${profile.specialAssignments.length} phân công):\n`
      profile.specialAssignments.forEach((sa) => {
        md += `- **${sa.subjectName} (${sa.subjectCode})** — ${sa.className ? `Lớp ${sa.className}` : `Khối ${sa.grade}`} ➔ [Đánh giá môn đặc thù](/teacher/special-subjects/eval?subject=${sa.subjectCode}${sa.classId ? `&classId=${sa.classId}` : ""})\n`
      })
      md += `\n`
    }

    return {
      matched: true,
      questionType: qType,
      markdown: md,
      updatedAt: now.toISOString(),
      deepLinks: [
        ...(profile.rolesDetected.isGVCN ? [{ label: "Lớp chủ nhiệm", href: "/teacher/classes" }] : []),
        ...(profile.rolesDetected.isGVBM ? [{ label: "Sổ điểm bộ môn", href: "/teacher/so-diem-nhan-xet" }] : []),
        ...(profile.rolesDetected.isGVMonDacThu ? [{ label: "Đánh giá Môn đặc thù", href: "/teacher/special-subjects/eval" }] : []),
      ],
    }
  }

  // ============================================================================
  // CÂU HỎI 10: SỔ THEO DÕI HƯỚNG NGHIỆP & MÔN ĐẶC THÙ / KT&ĐBCL CONNECT
  // ============================================================================
  if (qType === "CAREER_AND_SPECIAL_SUBJECTS") {
    const specialAndCareerTasks = tasks.filter(
      (t) =>
        t.sourceModule === "MON_DAC_THU" ||
        t.taskType === "CAREER_PROFILE_UPDATE" ||
        t.taskType === "KTDBCL_CONNECT_REPLY"
    )

    let md = `### 🧭 Tiến Độ Môn Đặc Thù, Sổ Hướng Nghiệp & KT&ĐBCL Connect\n`
    md += `*🕒 Dữ liệu thực tế cập nhật lúc: **${timestampStr}***\n\n`
    md += `- **Môn đặc thù được phân công**: **${profile.specialAssignments.length}** lớp/khối\n`
    md += `- **Công việc cần hoàn thiện**: **${specialAndCareerTasks.filter((t) => t.status !== "COMPLETED").length}** hạng mục\n\n`

    if (specialAndCareerTasks.length === 0) {
      md += `✅ **Hoàn tất**: Hiện không có nhiệm vụ tồn đọng ở phân hệ Môn đặc thù, Sổ theo dõi hướng nghiệp hoặc KT&ĐBCL Connect.\n`
    } else {
      md += `| # | Phân hệ | Nội dung công việc | Tiến độ / Trạng thái | Điều hướng |\n`
      md += `| :---: | :--- | :--- | :---: | :---: |\n`
      specialAndCareerTasks.forEach((t, idx) => {
        const prog =
          t.metadata?.progressTotal !== undefined
            ? `${t.metadata.progressCurrent || 0}/${t.metadata.progressTotal} HS (${t.metadata.progressPercent || 0}%)`
            : t.status === "WAITING"
            ? "⏳ Chờ duyệt"
            : "📝 Cần xử lý"
        md += `| ${idx + 1} | **${t.metadata?.moduleLabel || t.sourceModule}** | **${t.title}** | ${prog} | [Mở màn hình](${t.deepLink}) |\n`
      })
    }

    return {
      matched: true,
      questionType: qType,
      markdown: md,
      updatedAt: now.toISOString(),
      deepLinks: [
        { label: "Đánh giá Môn đặc thù", href: "/teacher/special-subjects/eval" },
        { label: "Sổ theo dõi Hướng nghiệp", href: "/teacher/special-subjects/career-profile" },
        { label: "KT&ĐBCL Connect", href: "/teacher/ktdbcl-connect" },
      ],
    }
  }

  return {
    matched: false,
    markdown: "",
    updatedAt: now.toISOString(),
    deepLinks: [],
  }
}
