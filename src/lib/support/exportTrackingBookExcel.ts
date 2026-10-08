import * as XLSX from "xlsx"
import { ACADEMIC_MONTHS, MONTH_WEEKS_CONFIG } from "@/app/teacher/ho-tro-hoc-tap/academic-calendar"

export interface ExportTrackingBookOptions {
  teacherName?: string
  academicYearName?: string
  selectedMonth?: string // e.g. "Tháng 9", "Tháng 10" or "ALL"
  exportScope?: "FULL" | "WEEK_MATRIX" | "MONTH_MATRIX" | "EVALUATION_LOG"
  fileNamePrefix?: string
}

export const parseEvaluationCommentSafe = (fullComment: string) => {
  if (!fullComment) return { mainComment: "", gvcnFeedback: "", phhsFeedback: "" }
  let mainComment = fullComment
  let gvcnFeedback = ""
  let phhsFeedback = ""

  const gvcnMatch = mainComment.match(/(?:📌\s*Ý KIẾN GV(?:CN)?(?:\s*\/\s*GVBM)?:\s*)([\s\S]*?)(?=(?:👨‍👩‍👧\s*Ý KIẾN PH(?:HS|Ụ HUYNH)?)|$)/i)
  if (gvcnMatch) {
    gvcnFeedback = gvcnMatch[1].trim()
    mainComment = mainComment.replace(gvcnMatch[0], "")
  }

  const phhsMatch = mainComment.match(/(?:👨‍👩‍👧\s*Ý KIẾN PH(?:HS|Ụ HUYNH)?(?:\s*\(PHHS\))?:\s*)([\s\S]*?)$/i)
  if (phhsMatch) {
    phhsFeedback = phhsMatch[1].trim()
    mainComment = mainComment.replace(phhsMatch[0], "")
  }

  return {
    mainComment: mainComment.trim(),
    gvcnFeedback: gvcnFeedback.trim(),
    phhsFeedback: phhsFeedback.trim()
  }
}

/**
 * Xuất Sổ Theo Dõi - Theo dõi tiến độ đánh giá theo Học sinh, theo Tuần & Tháng của từng Học sinh GV phụ trách
 */
export function exportTrackingBookExcel(
  targets: any[],
  options: ExportTrackingBookOptions = {}
) {
  if (!targets || targets.length === 0) {
    throw new Error("Không có dữ liệu học sinh để xuất sổ theo dõi.")
  }

  const teacherName = options.teacherName || "Giáo viên phụ trách"
  const academicYear = options.academicYearName || "2026-2027"
  const activeMonth = options.selectedMonth && options.selectedMonth !== "ALL" ? options.selectedMonth : "Tháng 9"
  const scope = options.exportScope || "FULL"

  const workbook = XLSX.utils.book_new()
  const exportTimestamp = new Date().toLocaleString("vi-VN")

  // Helper lấy tên GV phụ trách của target
  const getAssignedTeacherName = (t: any): string => {
    if (t.assignments && Array.isArray(t.assignments) && t.assignments.length > 0) {
      const names = t.assignments
        .map((a: any) => a.teacher?.teacherName || a.teacherName || "")
        .filter(Boolean)
      if (names.length > 0) return names.join(", ")
    }
    if (t.createdBy?.teacherName) return t.createdBy.teacherName
    return teacherName
  }

  // =========================================================================
  // SHEET 1: TIẾN ĐỘ THEO DÕI THEO TUẦN (WEEK MATRIX)
  // =========================================================================
  if (scope === "FULL" || scope === "WEEK_MATRIX") {
    const weeksList = MONTH_WEEKS_CONFIG[activeMonth] || ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"]

    const weekRows: any[][] = [
      ["HỆ THỐNG GIÁO DỤC SKY-LINE"],
      ["SỔ THEO DÕI TIẾN ĐỘ ĐÁNH GIÁ HỌC SINH THEO TUẦN"],
      [
        `Kỳ theo dõi: ${activeMonth} | Năm học: ${academicYear} | Giáo viên phụ trách: ${teacherName} | Xuất ngày: ${exportTimestamp}`
      ],
      [],
      [
        "STT",
        "Mã HS",
        "Họ và tên",
        "Lớp",
        "Cơ sở",
        "Đối tượng",
        "Môn bồi dưỡng",
        "Giáo viên phụ trách",
        ...weeksList.map((w) => `📅 ${w}`),
        `⭐ Tổng kết ${activeMonth}`,
        "Mức độ hiện tại",
        "Tình trạng",
        "Ghi chú / Nhận xét gần nhất"
      ]
    ]

    targets.forEach((target: any, idx: number) => {
      const isCommitment =
        target.sourceType === "ADMISSION" ||
        (target.notes && target.notes.includes("Cam kết Khảo sát đầu vào"))
      const targetEvals = target.evaluations || []
      const subjectDisplay =
        target.reason || (target.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý")
      const student = target.student || {}
      const stName = student.studentName || student.fullName || "—"
      const stCode = student.studentCode || student.code || "—"
      const className = student.class?.className || student.className || "—"
      const campusName = student.campus?.campusName || student.campus?.name || "—"
      const gvpt = getAssignedTeacherName(target)

      // Đánh giá từng tuần trong activeMonth
      const weekValues = weeksList.map((w: string) => {
        const wEval = targetEvals.find(
          (e: any) =>
            e.periodName === `${w} - ${activeMonth}` ||
            (e.periodName && e.periodName.includes(w) && e.periodName.includes(activeMonth)) ||
            (e.periodType === "WEEK" && e.periodName === w)
        )
        if (!wEval) return "—"
        return wEval.trackingLevel || "Đã ghi nhận"
      })

      // Đánh giá tổng kết tháng
      const monthlySummaryEval = targetEvals.find(
        (e: any) =>
          (e.periodType === "MONTH" &&
            (e.periodName === activeMonth || e.periodName?.includes(activeMonth))) ||
          e.periodName === activeMonth ||
          e.periodName === `Tổng kết ${activeMonth}` ||
          (e.periodName?.includes(activeMonth) && !e.periodName?.includes("Tuần"))
      )
      const monthlySummaryText = monthlySummaryEval ? monthlySummaryEval.trackingLevel : "Chưa đánh giá"

      // Mức độ mới nhất và nhận xét mới nhất
      const sortedEvals = [...targetEvals].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const latestEval = sortedEvals[0]
      const latestLevel = latestEval ? latestEval.trackingLevel : "Đang theo dõi"
      const latestComment = latestEval ? latestEval.comment : (target.notes || "—")

      weekRows.push([
        idx + 1,
        stCode,
        stName,
        className,
        campusName,
        isCommitment ? "Cam kết đầu vào (CKĐV)" : "Bồi dưỡng thường xuyên (BSTD)",
        subjectDisplay,
        gvpt,
        ...weekValues,
        monthlySummaryText,
        latestLevel,
        target.status || "Đang hỗ trợ",
        latestComment
      ])
    })

    const wsWeek = XLSX.utils.aoa_to_sheet(weekRows)

    // Set column widths
    wsWeek["!cols"] = [
      { wch: 6 }, // STT
      { wch: 14 }, // Mã HS
      { wch: 24 }, // Họ và tên
      { wch: 10 }, // Lớp
      { wch: 12 }, // Cơ sở
      { wch: 26 }, // Đối tượng
      { wch: 18 }, // Môn bồi dưỡng
      { wch: 22 }, // GV phụ trách
      ...weeksList.map(() => ({ wch: 16 })), // Các tuần
      { wch: 20 }, // Tổng kết tháng
      { wch: 18 }, // Mức độ hiện tại
      { wch: 16 }, // Tình trạng
      { wch: 45 } // Nhận xét gần nhất
    ]

    XLSX.utils.book_append_sheet(workbook, wsWeek, `Tien_Do_Tuan_${activeMonth.replace(/\s+/g, "_")}`)
  }

  // =========================================================================
  // SHEET 2: TIẾN ĐỘ THEO DÕI 10 THÁNG (MONTH MATRIX)
  // =========================================================================
  if (scope === "FULL" || scope === "MONTH_MATRIX") {
    const monthRows: any[][] = [
      ["HỆ THỐNG GIÁO DỤC SKY-LINE"],
      ["SỔ THEO DÕI TIẾN TRÌNH ĐÁNH GIÁ HỌC SINH 10 THÁNG NĂM HỌC"],
      [
        `Năm học: ${academicYear} | Giáo viên phụ trách: ${teacherName} | Xuất ngày: ${exportTimestamp}`
      ],
      [],
      [
        "STT",
        "Mã HS",
        "Họ và tên",
        "Lớp",
        "Cơ sở",
        "Đối tượng",
        "Môn bồi dưỡng",
        "Giáo viên phụ trách",
        ...ACADEMIC_MONTHS,
        "Đánh giá chung",
        "Trạng thái mục tiêu"
      ]
    ]

    targets.forEach((target: any, idx: number) => {
      const isCommitment =
        target.sourceType === "ADMISSION" ||
        (target.notes && target.notes.includes("Cam kết Khảo sát đầu vào"))
      const targetEvals = target.evaluations || []
      const subjectDisplay =
        target.reason || (target.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý")
      const student = target.student || {}
      const stName = student.studentName || student.fullName || "—"
      const stCode = student.studentCode || student.code || "—"
      const className = student.class?.className || student.className || "—"
      const campusName = student.campus?.campusName || student.campus?.name || "—"
      const gvpt = getAssignedTeacherName(target)

      // Giá trị của 10 tháng
      const monthValues = ACADEMIC_MONTHS.map((m) => {
        const monthEvals = targetEvals.filter(
          (e: any) => e.periodName === m || (e.periodName && e.periodName.includes(m))
        )
        if (monthEvals.length === 0) return "—"
        const ev = monthEvals[monthEvals.length - 1]
        return ev.trackingLevel || "Đạt"
      })

      // Đánh giá chung
      const sortedEvals = [...targetEvals].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const latestEval = sortedEvals[0]
      const overallEvaluation = latestEval ? latestEval.trackingLevel : "Đang theo dõi"

      monthRows.push([
        idx + 1,
        stCode,
        stName,
        className,
        campusName,
        isCommitment ? "Cam kết đầu vào (CKĐV)" : "Bồi dưỡng thường xuyên (BSTD)",
        subjectDisplay,
        gvpt,
        ...monthValues,
        overallEvaluation,
        target.status || "Đang hỗ trợ"
      ])
    })

    const wsMonth = XLSX.utils.aoa_to_sheet(monthRows)
    wsMonth["!cols"] = [
      { wch: 6 }, // STT
      { wch: 14 }, // Mã HS
      { wch: 24 }, // Họ và tên
      { wch: 10 }, // Lớp
      { wch: 12 }, // Cơ sở
      { wch: 26 }, // Đối tượng
      { wch: 18 }, // Môn bồi dưỡng
      { wch: 22 }, // GV phụ trách
      ...ACADEMIC_MONTHS.map(() => ({ wch: 14 })), // 10 tháng
      { wch: 20 }, // Đánh giá chung
      { wch: 18 } // Trạng thái
    ]

    XLSX.utils.book_append_sheet(workbook, wsMonth, "Tien_Do_10_Thang")
  }

  // =========================================================================
  // SHEET 3: NHẬT KÝ CHI TIẾT CÁC LẦN ĐÁNH GIÁ (EVALUATION LOG)
  // =========================================================================
  if (scope === "FULL" || scope === "EVALUATION_LOG") {
    const logRows: any[][] = [
      ["HỆ THỐNG GIÁO DỤC SKY-LINE"],
      ["NHẬT KÝ CHI TIẾT ĐÁNH GIÁ & TIẾN ĐỘ BỒI DƯỠNG TỪNG HỌC SINH"],
      [
        `Năm học: ${academicYear} | Giáo viên phụ trách: ${teacherName} | Xuất ngày: ${exportTimestamp}`
      ],
      [],
      [
        "STT",
        "Mã HS",
        "Họ và tên",
        "Lớp",
        "Cơ sở",
        "Đối tượng",
        "Môn bồi dưỡng",
        "Giáo viên phụ trách",
        "Loại kỳ",
        "Kỳ đánh giá",
        "Mức độ đánh giá",
        "Nhận xét của Giáo viên",
        "Ý kiến GVCN",
        "Ý kiến PHHS",
        "Đề xuất hành động",
        "Ngày đánh giá",
        "Người ghi nhận"
      ]
    ]

    let logCounter = 1
    targets.forEach((target: any) => {
      const isCommitment =
        target.sourceType === "ADMISSION" ||
        (target.notes && target.notes.includes("Cam kết Khảo sát đầu vào"))
      const targetEvals = target.evaluations || []
      const subjectDisplay =
        target.reason || (target.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý")
      const student = target.student || {}
      const stName = student.studentName || student.fullName || "—"
      const stCode = student.studentCode || student.code || "—"
      const className = student.class?.className || student.className || "—"
      const campusName = student.campus?.campusName || student.campus?.name || "—"
      const gvpt = getAssignedTeacherName(target)

      const sortedEvals = [...targetEvals].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      if (sortedEvals.length === 0) {
        logRows.push([
          logCounter++,
          stCode,
          stName,
          className,
          campusName,
          isCommitment ? "CKĐV" : "BSTD",
          subjectDisplay,
          gvpt,
          "Chưa đánh giá",
          "—",
          "Chưa có",
          target.notes || "Chưa có nhận xét",
          "—",
          "—",
          target.status || "Đang theo dõi",
          target.createdAt ? new Date(target.createdAt).toLocaleDateString("vi-VN") : "—",
          gvpt
        ])
      } else {
        sortedEvals.forEach((ev: any) => {
          const parsed = parseEvaluationCommentSafe(ev.comment || "")
          const evalDate = ev.createdAt ? new Date(ev.createdAt).toLocaleDateString("vi-VN") : "—"
          const periodTypeDisplay = ev.periodType === "WEEK" ? "Theo Tuần" : "Theo Tháng"

          logRows.push([
            logCounter++,
            stCode,
            stName,
            className,
            campusName,
            isCommitment ? "CKĐV" : "BSTD",
            subjectDisplay,
            gvpt,
            periodTypeDisplay,
            ev.periodName || "—",
            ev.trackingLevel || "—",
            parsed.mainComment || ev.comment || "—",
            parsed.gvcnFeedback || "—",
            parsed.phhsFeedback || "—",
            ev.updatedStatus || "Tiếp tục theo dõi",
            evalDate,
            ev.evaluator?.name || gvpt
          ])
        })
      }
    })

    const wsLog = XLSX.utils.aoa_to_sheet(logRows)
    wsLog["!cols"] = [
      { wch: 6 }, // STT
      { wch: 14 }, // Mã HS
      { wch: 24 }, // Họ và tên
      { wch: 10 }, // Lớp
      { wch: 12 }, // Cơ sở
      { wch: 12 }, // Đối tượng
      { wch: 18 }, // Môn bồi dưỡng
      { wch: 22 }, // GV phụ trách
      { wch: 14 }, // Loại kỳ
      { wch: 18 }, // Kỳ đánh giá
      { wch: 18 }, // Mức độ
      { wch: 45 }, // Nhận xét
      { wch: 25 }, // Ý kiến GVCN
      { wch: 25 }, // Ý kiến PHHS
      { wch: 20 }, // Đề xuất
      { wch: 14 }, // Ngày
      { wch: 22 } // Người ghi
    ]

    XLSX.utils.book_append_sheet(workbook, wsLog, "Nhat_Ky_Chi_Tiet")
  }

  // =========================================================================
  // SHEET 4: BÁO CÁO THỐNG KÊ TỔNG HỢP (SUMMARY DASHBOARD)
  // =========================================================================
  if (scope === "FULL") {
    let totalEvals = 0
    let countPositive = 0
    let countImproving = 0
    let countMaintaining = 0
    let countCritical = 0

    const subjectMap: Record<string, number> = {}
    let ckdvCount = 0
    let bstdCount = 0

    targets.forEach((t: any) => {
      const isCommitment =
        t.sourceType === "ADMISSION" ||
        (t.notes && t.notes.includes("Cam kết Khảo sát đầu vào"))
      if (isCommitment) ckdvCount++
      else bstdCount++

      const sub = t.reason || (t.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý")
      subjectMap[sub] = (subjectMap[sub] || 0) + 1

      const evals = t.evaluations || []
      evals.forEach((e: any) => {
        totalEvals++
        const lvl = (e.trackingLevel || "").toLowerCase()
        if (lvl.includes("đạt") || lvl.includes("tốt") || lvl.includes("ổn định")) {
          countPositive++
        } else if (lvl.includes("tiến bộ") || lvl.includes("cải thiện") || lvl.includes("khá")) {
          countImproving++
        } else if (lvl.includes("duy trì") || lvl.includes("theo dõi")) {
          countMaintaining++
        } else {
          countCritical++
        }
      })
    })

    const summaryRows: any[][] = [
      ["HỆ THỐNG GIÁO DỤC SKY-LINE"],
      ["BÁO CÁO TỔNG HỢP TIẾN ĐỘ ĐÁNH GIÁ SỔ THEO DÕI HỌC SINH"],
      [`Năm học: ${academicYear} | Giáo viên phụ trách: ${teacherName} | Xuất ngày: ${exportTimestamp}`],
      [],
      ["CHỈ SỐ TỔNG HỢP", "GIÁ TRỊ", "TỶ LỆ / GHI CHÚ"],
      ["Tổng số học sinh GV phụ trách theo dõi", targets.length, "100%"],
      ["Học sinh diện Cam kết đầu vào (CKĐV)", ckdvCount, `${Math.round((ckdvCount / (targets.length || 1)) * 100)}%`],
      ["Học sinh diện Bồi dưỡng thường xuyên (BSTD)", bstdCount, `${Math.round((bstdCount / (targets.length || 1)) * 100)}%`],
      ["Tổng số lượt ghi nhận đánh giá (Tuần & Tháng)", totalEvals, `${targets.length > 0 ? (totalEvals / targets.length).toFixed(1) : 0} lượt/HS`],
      ["Lượt đánh giá Đạt mục tiêu (Ổn định)", countPositive, totalEvals > 0 ? `${Math.round((countPositive / totalEvals) * 100)}%` : "0%"],
      ["Lượt đánh giá Có tiến bộ", countImproving, totalEvals > 0 ? `${Math.round((countImproving / totalEvals) * 100)}%` : "0%"],
      ["Lượt đánh giá Duy trì", countMaintaining, totalEvals > 0 ? `${Math.round((countMaintaining / totalEvals) * 100)}%` : "0%"],
      ["Lượt đánh giá Chưa tiến bộ / Cần hỗ trợ sâu", countCritical, totalEvals > 0 ? `${Math.round((countCritical / totalEvals) * 100)}%` : "0%"],
      [],
      ["PHÂN BỔ THEO MÔN HỌC BỒI DƯỠNG", "SỐ HỌC SINH", "TỶ LỆ"],
      ...Object.entries(subjectMap).map(([sub, count]) => [
        sub,
        count,
        `${Math.round((count / (targets.length || 1)) * 100)}%`
      ])
    ]

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
    wsSummary["!cols"] = [{ wch: 45 }, { wch: 20 }, { wch: 25 }]
    XLSX.utils.book_append_sheet(workbook, wsSummary, "Tong_Hop_Thong_Ke")
  }

  // Tên file chuẩn đẹp
  const sanitizedTeacher = teacherName.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, "_").slice(0, 30)
  const sanitizedYear = academicYear.replace(/[^a-zA-Z0-9_-]/g, "_")
  const filePrefix = options.fileNamePrefix || "So_Theo_Doi_Tien_Do_Danh_Gia"
  const fileName = `${filePrefix}_${sanitizedTeacher}_${sanitizedYear}.xlsx`

  XLSX.writeFile(workbook, fileName)
  return fileName
}
