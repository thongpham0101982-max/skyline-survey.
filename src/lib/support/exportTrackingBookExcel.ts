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

export interface ExportTeacherProgressReportOptions {
  teacherId?: string
  teacherName?: string
  campusId?: string
  campusName?: string
  academicYearName?: string
  selectedMonth?: string
  supportType?: "PSYCHOLOGICAL" | "ACADEMIC" | "ALL"
  fileNamePrefix?: string
}

/**
 * Helper kiểm tra bản ghi đánh giá có khớp với Tuần w trong Tháng m hay không
 */
export function findWeekEvaluation(evals: any[], weekLabel: string, monthLabel: string) {
  if (!evals || evals.length === 0) return null
  const monthNumMatch = monthLabel.match(/\d+/)
  const monthNum = monthNumMatch ? parseInt(monthNumMatch[0], 10) : null
  const weekNumMatch = weekLabel.match(/\d+/)
  const weekNum = weekNumMatch ? parseInt(weekNumMatch[0], 10) : 1

  // 1. Ưu tiên khớp chính xác periodName có chứa cả Tuần và Tháng
  const exact = evals.find(
    (e: any) =>
      e.periodName === `${weekLabel} - ${monthLabel}` ||
      (e.periodName && e.periodName.includes(weekLabel) && e.periodName.includes(monthLabel))
  )
  if (exact) return exact

  // 2. Khớp periodType === "WEEK" và periodName === weekLabel trong cùng tháng createdAt
  const byWeekType = evals.find((e: any) => {
    if (e.periodName === weekLabel || (e.periodName && e.periodName.includes(weekLabel) && !e.periodName.includes("Tháng"))) {
      if (!monthNum || !e.createdAt) return true
      const d = new Date(e.createdAt)
      return !isNaN(d.getTime()) && d.getMonth() + 1 === monthNum
    }
    return false
  })
  if (byWeekType) return byWeekType

  // 3. Nếu đánh giá có periodType === "WEEK" trong tháng đó và ngày tạo rơi vào tuần tương ứng
  const byDateWeek = evals.find((e: any) => {
    if (e.periodType !== "WEEK" || !e.createdAt || !monthNum) return false
    const d = new Date(e.createdAt)
    if (isNaN(d.getTime()) || d.getMonth() + 1 !== monthNum) return false
    const wOfDate = Math.min(Math.ceil(d.getDate() / 7), 5)
    return wOfDate === weekNum
  })
  return byDateWeek || null
}

/**
 * Helper kiểm tra bản ghi đánh giá của Tháng m (bao gồm cả đánh giá tổng kết tháng hoặc đánh giá tuần trong tháng)
 */
export function findMonthEvaluations(evals: any[], monthLabel: string) {
  if (!evals || evals.length === 0) return []
  const monthNumMatch = monthLabel.match(/\d+/)
  const monthNum = monthNumMatch ? parseInt(monthNumMatch[0], 10) : null

  return evals.filter((e: any) => {
    if (e.periodName === monthLabel || (e.periodName && e.periodName.includes(monthLabel))) {
      return true
    }
    if (monthNum && e.createdAt) {
      const d = new Date(e.createdAt)
      if (!isNaN(d.getTime()) && d.getMonth() + 1 === monthNum) {
        return true
      }
    }
    return false
  })
}

/**
 * Xuất Báo Cáo Theo Dõi Tiến Độ Theo Cơ Sở & Theo Từng Giáo Viên (Định kỳ Tuần & Tháng)
 * Hỗ trợ xuất riêng cho từng cơ sở / từng giáo viên hoặc xuất tổng hợp toàn hệ thống kèm sheet đối chiếu
 */
export function exportTeacherProgressReportExcel(
  rawTargets: any[],
  options: ExportTeacherProgressReportOptions = {}
) {
  if (!rawTargets || rawTargets.length === 0) {
    throw new Error("Không có dữ liệu học sinh để xuất báo cáo tiến độ.")
  }

  const academicYear = options.academicYearName || "2026-2027"
  const activeMonth = options.selectedMonth && options.selectedMonth !== "ALL" ? options.selectedMonth : "Tháng 10"
  const targetTeacherId = options.teacherId || "ALL"
  const targetCampusId = options.campusId || "ALL"
  const exportTimestamp = new Date().toLocaleString("vi-VN")

  // Lọc theo Cơ sở nếu có chọn Cơ sở
  const targets = rawTargets.filter(t => {
    if (targetCampusId === "ALL") return true
    const cId = t.student?.class?.campusId || t.student?.campusId || t.campusId
    const cName = t.student?.class?.campus?.campusName || t.student?.campus?.campusName || t.campusName || ""
    return cId === targetCampusId || cName === targetCampusId || (options.campusName && cName === options.campusName)
  })

  if (targets.length === 0) {
    throw new Error("Không có học sinh nào thuộc phạm vi cơ sở đã chọn.")
  }

  // Helper trích xuất danh sách GV phân công của target
  const getAssignedTeachers = (t: any): { id: string; name: string }[] => {
    if (t.assignments && Array.isArray(t.assignments) && t.assignments.length > 0) {
      const list = t.assignments
        .filter((a: any) => a.teacher)
        .map((a: any) => ({
          id: a.teacher.id,
          name: a.teacher.teacherName || a.teacherName || "Chưa rõ"
        }))
      if (list.length > 0) return list
    }
    if (t.createdBy?.teacherName) {
      return [{ id: t.createdBy.id || "CREATOR", name: t.createdBy.teacherName }]
    }
    if (t.counselorName) {
      return [{ id: t.counselorName, name: t.counselorName }]
    }
    return [{ id: "UNASSIGNED", name: "Chưa phân công GV" }]
  }

  // TRƯỜNG HỢP 1: Xuất báo cáo riêng cho MỘT giáo viên
  if (targetTeacherId !== "ALL") {
    const teacherTargets = targets.filter(t => {
      const tList = getAssignedTeachers(t)
      return tList.some(item => item.id === targetTeacherId || item.name === options.teacherName)
    })

    if (teacherTargets.length === 0) {
      throw new Error(`Không tìm thấy học sinh nào thuộc giáo viên "${options.teacherName || targetTeacherId}".`)
    }

    const tName = options.teacherName || getAssignedTeachers(teacherTargets[0])[0]?.name || "Giao_Vien"
    const prefix = options.fileNamePrefix || (options.supportType === "PSYCHOLOGICAL" ? "So_Theo_Doi_Tam_Ly_GV" : "So_Theo_Doi_Hoc_Tap_GV")

    return exportTrackingBookExcel(teacherTargets, {
      teacherName: tName,
      academicYearName: academicYear,
      selectedMonth: activeMonth,
      exportScope: "FULL",
      fileNamePrefix: prefix
    })
  }

  // TRƯỜNG HỢP 2: Xuất Sổ Theo Dõi Đánh Giá Định Kỳ TỔNG HỢP THEO CƠ SỞ & THEO GIÁO VIÊN (TUẦN & THÁNG)
  const workbook = XLSX.utils.book_new()
  const weeksList = MONTH_WEEKS_CONFIG[activeMonth] || ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"]

  // -------------------------------------------------------------------------
  // SHEET 1: THỐNG KÊ THEO CƠ SỞ & TÌNH TRẠNG ĐÁNH GIÁ ĐỊNH KỲ TUẦN / THÁNG
  // -------------------------------------------------------------------------
  const campusMap: Record<string, {
    campusName: string
    targets: any[]
    teachers: Set<string>
    activeCount: number
    termCount: number
    commitmentCount: number
    weekEvalCounts: number[]
    monthEvaluatedStudents: number
    totalEvals: number
  }> = {}

  targets.forEach(t => {
    const campusName = t.student?.class?.campus?.campusName || t.student?.campus?.campusName || t.campusName || "Chưa rõ Cơ sở"
    if (!campusMap[campusName]) {
      campusMap[campusName] = {
        campusName,
        targets: [],
        teachers: new Set(),
        activeCount: 0,
        termCount: 0,
        commitmentCount: 0,
        weekEvalCounts: weeksList.map(() => 0),
        monthEvaluatedStudents: 0,
        totalEvals: 0
      }
    }
    const cGroup = campusMap[campusName]
    cGroup.targets.push(t)
    getAssignedTeachers(t).forEach(tch => {
      if (tch.id !== "UNASSIGNED") cGroup.teachers.add(tch.name)
    })

    const isTerm = t.terminationStatus === "TERMINATED"
    if (isTerm) cGroup.termCount++
    else cGroup.activeCount++

    const isCommitment = t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết")) || t.hasPsychCommitment
    if (isCommitment) cGroup.commitmentCount++

    const evals = t.evaluations || []
    cGroup.totalEvals += evals.length

    weeksList.forEach((w, wIdx) => {
      if (findWeekEvaluation(evals, w, activeMonth)) {
        cGroup.weekEvalCounts[wIdx]++
      }
    })

    if (findMonthEvaluations(evals, activeMonth).length > 0) {
      cGroup.monthEvaluatedStudents++
    }
  })

  const campusList = Object.values(campusMap).sort((a, b) => b.targets.length - a.targets.length)

  const campusHeader = [
    ["HỆ THỐNG GIÁO DỤC SKY-LINE"],
    ["SỔ THEO DÕI ĐÁNH GIÁ TÂM LÝ THEO CƠ SỞ & TÌNH TRẠNG ĐÁNH GIÁ ĐỊNH KỲ TUẦN - THÁNG"],
    [`Năm học: ${academicYear} | Kỳ đối chiếu: ${activeMonth} | Xuất ngày: ${exportTimestamp}`],
    [],
    [
      "STT",
      "Cơ sở",
      "Tổng số HS",
      "Diện Cam kết",
      "Đang theo dõi",
      "Đã chấm dứt",
      "Số GV phụ trách",
      ...weeksList.map(w => `ĐG ${w} (${activeMonth})`),
      `Đã ĐG trong ${activeMonth}`,
      `Chưa ĐG trong ${activeMonth}`,
      "Tỷ lệ ĐG định kỳ (%)",
      "Tổng lượt ĐG tích lũy",
      "Tình trạng đánh giá tại Cơ sở"
    ]
  ]

  const campusRows = campusList.map((c, idx) => {
    const total = c.targets.length
    const pendingEval = Math.max(0, c.activeCount - c.monthEvaluatedStudents)
    const evalRate = c.activeCount > 0 ? Math.round((c.monthEvaluatedStudents / c.activeCount) * 100) : 100
    let evalStatus = "Đã hoàn thành 100% ĐG định kỳ"
    if (c.monthEvaluatedStudents === 0 && c.activeCount > 0) evalStatus = `Chưa cập nhật ĐG ${activeMonth} (${c.activeCount} HS chờ ĐG)`
    else if (pendingEval > 0) evalStatus = `Đang đánh giá (${c.monthEvaluatedStudents}/${c.activeCount} HS đang theo dõi)`

    return [
      idx + 1,
      c.campusName,
      total,
      c.commitmentCount,
      c.activeCount,
      c.termCount,
      c.teachers.size,
      ...c.weekEvalCounts.map(cnt => `${cnt}/${c.activeCount} HS`),
      `${c.monthEvaluatedStudents} HS`,
      `${pendingEval} HS`,
      `${evalRate}%`,
      c.totalEvals,
      evalStatus
    ]
  })

  const wsCampus = XLSX.utils.aoa_to_sheet([...campusHeader, ...campusRows])
  wsCampus["!cols"] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
    ...weeksList.map(() => ({ wch: 16 })),
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 36 }
  ]
  XLSX.utils.book_append_sheet(workbook, wsCampus, "Theo_Co_So_Tuan_Thang")

  // Gom nhóm học sinh theo từng Giáo viên
  const teacherMap: Record<string, {
    teacherId: string
    teacherName: string
    targets: any[]
    campusNames: Set<string>
    grades: Set<string>
    activeCount: number
    pendingCount: number
    termCount: number
    commitmentCount: number
    evalCount: number
    goodCount: number
    weekEvalCounts: number[]
    monthEvaluatedCount: number
  }> = {}

  targets.forEach(t => {
    const assignedTeachers = getAssignedTeachers(t)
    const isTerm = t.terminationStatus === "TERMINATED"
    const isPending = t.terminationStatus === "PENDING_TERMINATION"
    const isCommitment = t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết Khảo sát đầu vào")) || t.sourceType === "ASSESSMENT" || t.hasPsychCommitment
    const campus = t.student?.class?.campus?.campusName || t.student?.campus?.campusName || t.campusName || ""
    const className = t.student?.class?.className || t.className || ""
    const match = className.match(/^(\d+)/)
    const grade = match ? `Khối ${match[1]}` : className
    const evals = t.evaluations || []

    assignedTeachers.forEach(tch => {
      if (!teacherMap[tch.id]) {
        teacherMap[tch.id] = {
          teacherId: tch.id,
          teacherName: tch.name,
          targets: [],
          campusNames: new Set(),
          grades: new Set(),
          activeCount: 0,
          pendingCount: 0,
          termCount: 0,
          commitmentCount: 0,
          evalCount: 0,
          goodCount: 0,
          weekEvalCounts: weeksList.map(() => 0),
          monthEvaluatedCount: 0
        }
      }
      const group = teacherMap[tch.id]
      group.targets.push(t)
      if (campus) group.campusNames.add(campus)
      if (grade) group.grades.add(grade)
      if (isTerm) group.termCount++
      else if (isPending) group.pendingCount++
      else group.activeCount++

      if (isCommitment) group.commitmentCount++
      group.evalCount += evals.length

      weeksList.forEach((w, wIdx) => {
        if (findWeekEvaluation(evals, w, activeMonth)) {
          group.weekEvalCounts[wIdx]++
        }
      })

      if (findMonthEvaluations(evals, activeMonth).length > 0) {
        group.monthEvaluatedCount++
      }

      evals.forEach((ev: any) => {
        const lvl = (ev.trackingLevel || "").toLowerCase()
        if (lvl.includes("đạt") || lvl.includes("tốt") || lvl.includes("ổn định") || lvl.includes("tiến bộ")) {
          group.goodCount++
        }
      })
    })
  })

  const teacherList = Object.values(teacherMap).sort((a, b) => b.targets.length - a.targets.length)

  // -------------------------------------------------------------------------
  // SHEET 2: TÌNH TRẠNG ĐÁNH GIÁ ĐỊNH KỲ CỦA GV THEO TUẦN & THÁNG
  // -------------------------------------------------------------------------
  const summaryHeader = [
    ["HỆ THỐNG GIÁO DỤC SKY-LINE"],
    [options.supportType === "PSYCHOLOGICAL" 
      ? "TÌNH TRẠNG ĐÁNH GIÁ TÂM LÝ ĐỊNH KỲ THEO TUẦN & THÁNG CỦA TỪNG GIÁO VIÊN / CHUYÊN VIÊN"
      : "BÁO CÁO THEO DÕI TIẾN ĐỘ BỒI DƯỠNG HỌC TẬP ĐỊNH KỲ THEO TỪNG GIÁO VIÊN"
    ],
    [`Năm học: ${academicYear} | Kỳ theo dõi: ${activeMonth} | Xuất ngày: ${exportTimestamp} | Tổng số nhân sự phụ trách: ${teacherList.length}`],
    [],
    [
      "STT",
      "Họ và tên Giáo viên / Chuyên viên",
      "Cơ sở phụ trách",
      "Khối lớp",
      "Tổng số HS phụ trách",
      "Diện Cam kết (CKĐV)",
      "Đang theo dõi (🟡)",
      "Đã chấm dứt (🏁)",
      ...weeksList.map(w => `ĐG ${w}`),
      `Đã ĐG trong ${activeMonth}`,
      `Chưa ĐG trong ${activeMonth}`,
      "Tỷ lệ ĐG kỳ này (%)",
      "Tổng lượt ghi nhận năm",
      "Tình trạng đánh giá định kỳ của GV"
    ]
  ]

  const summaryRows = teacherList.map((t, idx) => {
    const total = t.targets.length
    const campusStr = Array.from(t.campusNames).join(", ") || "Toàn trường"
    const gradeStr = Array.from(t.grades).join(", ") || "—"
    const pendingEval = Math.max(0, t.activeCount - t.monthEvaluatedCount)
    const evalRateNum = t.activeCount > 0 ? Math.round((t.monthEvaluatedCount / t.activeCount) * 100) : 100

    let statusText = "Đã hoàn thành đánh giá định kỳ"
    if (t.activeCount === 0 && t.termCount > 0) statusText = "Đã hoàn thành 100% ca theo dõi"
    else if (t.monthEvaluatedCount === 0) statusText = `Chưa cập nhật ĐG ${activeMonth} (Cần ĐG ${t.activeCount} HS)`
    else if (pendingEval > 0) statusText = `Đang đánh giá định kỳ (${t.monthEvaluatedCount}/${t.activeCount} HS, còn ${pendingEval} HS)`

    return [
      idx + 1,
      t.teacherName,
      campusStr,
      gradeStr,
      total,
      t.commitmentCount,
      t.activeCount,
      t.termCount,
      ...t.weekEvalCounts.map(cnt => `${cnt}/${t.activeCount}`),
      t.monthEvaluatedCount,
      pendingEval,
      `${evalRateNum}%`,
      t.evalCount,
      statusText
    ]
  })

  // Dòng tổng cộng
  const grandTotalStudents = targets.length
  const grandTerminated = targets.filter(t => t.terminationStatus === "TERMINATED").length
  const grandActive = targets.filter(t => t.terminationStatus !== "TERMINATED").length
  const grandEvalMonth = targets.filter(t => findMonthEvaluations(t.evaluations || [], activeMonth).length > 0).length
  const grandPendingMonth = Math.max(0, grandActive - grandEvalMonth)
  const grandEvalRate = grandActive > 0 ? `${Math.round((grandEvalMonth / grandActive) * 100)}%` : "100%"
  const grandEvals = targets.reduce((sum, t) => sum + (t.evaluations?.length || 0), 0)

  const summaryFooter = [
    [],
    [
      "TỔNG CỘNG HỆ THỐNG",
      "",
      "",
      "",
      grandTotalStudents,
      targets.filter(t => t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết")) || t.hasPsychCommitment).length,
      grandActive,
      grandTerminated,
      ...weeksList.map(w => {
        const cnt = targets.filter(t => findWeekEvaluation(t.evaluations || [], w, activeMonth)).length
        return `${cnt}/${grandActive}`
      }),
      grandEvalMonth,
      grandPendingMonth,
      grandEvalRate,
      grandEvals,
      "Tổng hợp tình trạng đánh giá định kỳ theo Tuần & Tháng"
    ]
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet([...summaryHeader, ...summaryRows, ...summaryFooter])
  wsSummary["!cols"] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    ...weeksList.map(() => ({ wch: 12 })),
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 38 }
  ]
  XLSX.utils.book_append_sheet(workbook, wsSummary, "Tinh_Trang_DG_Giao_Vien")

  // -------------------------------------------------------------------------
  // SHEET 3: MA TRẬN ĐÁNH GIÁ ĐỊNH KỲ THEO TUẦN TRONG THÁNG
  // -------------------------------------------------------------------------
  const weekMatrixHeader = [
    ["HỆ THỐNG GIÁO DỤC SKY-LINE"],
    [`SỔ THEO DÕI ĐÁNH GIÁ ĐỊNH KỲ THEO TUẦN (${activeMonth.toUpperCase()})`],
    [`Năm học: ${academicYear} | Xuất ngày: ${exportTimestamp}`],
    [],
    [
      "STT",
      "Cơ sở",
      "Giáo viên / Chuyên viên",
      "Mã HS",
      "Họ và tên học sinh",
      "Lớp",
      "Diện can thiệp",
      ...weeksList.map(w => `📅 ${w}`),
      `⭐ Tổng kết ${activeMonth}`,
      "Tình trạng ĐG của GV",
      "Trạng thái hồ sơ",
      "Nhận xét / Ghi chú mới nhất"
    ]
  ]

  const weekMatrixRows: any[][] = []
  let wmStt = 1
  teacherList.forEach(tch => {
    tch.targets.forEach((t: any) => {
      const isCommitment = t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết")) || t.hasPsychCommitment
      const student = t.student || {}
      const stName = student.studentName || student.fullName || t.studentName || "—"
      const stCode = student.studentCode || student.code || t.studentCode || "—"
      const className = student.class?.className || t.className || "—"
      const campusName = student.class?.campus?.campusName || student.campus?.campusName || t.campusName || "—"
      const evals = t.evaluations || []
      const isTerminated = t.terminationStatus === "TERMINATED"

      const weekVals = weeksList.map(w => {
        const wEv = findWeekEvaluation(evals, w, activeMonth)
        return wEv ? (wEv.trackingLevel || "Đã ĐG") : "Chưa ĐG"
      })

      const monthEvals = findMonthEvaluations(evals, activeMonth)
      const monthSummaryEv = monthEvals.find((e: any) => e.periodType === "MONTH" || !e.periodName?.includes("Tuần")) || monthEvals[0]
      const monthSummaryText = monthSummaryEv ? (monthSummaryEv.trackingLevel || "Đã ĐG") : "Chưa ĐG"

      const evaluatedWeeksCount = weekVals.filter(v => v !== "Chưa ĐG").length
      let gvEvalStatus = "Chưa cập nhật ĐG"
      if (isTerminated && monthEvals.length === 0) gvEvalStatus = "Đã kết thúc theo dõi"
      else if (evaluatedWeeksCount > 0 && monthSummaryEv) gvEvalStatus = `Đã ĐG (${evaluatedWeeksCount} tuần & Tháng)`
      else if (evaluatedWeeksCount > 0) gvEvalStatus = `Đã ĐG ${evaluatedWeeksCount}/${weeksList.length} tuần`
      else if (monthSummaryEv) gvEvalStatus = `Đã ĐG định kỳ ${activeMonth}`

      const sortedEvals = [...evals].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const latestEval = sortedEvals[0]
      const latestComment = latestEval ? latestEval.comment : (t.reason || t.notes || "—")

      weekMatrixRows.push([
        wmStt++,
        campusName,
        tch.teacherName,
        stCode,
        stName,
        className,
        isCommitment ? "⭐️ Cam kết" : "Thường kỳ",
        ...weekVals,
        monthSummaryText,
        gvEvalStatus,
        isTerminated ? "Đã chấm dứt" : "Đang theo dõi",
        latestComment
      ])
    })
  })

  const wsWeekMatrix = XLSX.utils.aoa_to_sheet([...weekMatrixHeader, ...weekMatrixRows])
  wsWeekMatrix["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 26 },
    { wch: 14 },
    { wch: 24 },
    { wch: 10 },
    { wch: 14 },
    ...weeksList.map(() => ({ wch: 16 })),
    { wch: 18 },
    { wch: 24 },
    { wch: 16 },
    { wch: 45 }
  ]
  XLSX.utils.book_append_sheet(workbook, wsWeekMatrix, `DG_Tuan_${activeMonth.replace(/\s+/g, "_")}`)

  // -------------------------------------------------------------------------
  // SHEET 2: DANH SÁCH CHI TIẾT HỌC SINH THEO TỪNG GIÁO VIÊN
  // -------------------------------------------------------------------------
  const detailHeader = [
    ["HỆ THỐNG GIÁO DỤC SKY-LINE"],
    ["DANH SÁCH HỌC SINH CHI TIẾT PHÂN THEO TỪNG GIÁO VIÊN / CHUYÊN VIÊN PHỤ TRÁCH"],
    [`Năm học: ${academicYear} | Xuất ngày: ${exportTimestamp}`],
    [],
    [
      "STT",
      "Giáo viên / Chuyên viên",
      "Mã HS",
      "Họ và tên học sinh",
      "Lớp",
      "Cơ sở",
      "Diện can thiệp",
      "Lý do / Môn hỗ trợ",
      "Ngày bắt đầu",
      "Ngày chấm dứt",
      "Tháng kết thúc",
      "Trạng thái hiện tại",
      "Số lần đánh giá",
      "Mức độ tiến độ gần nhất",
      "Nhận xét / Ghi chú mới nhất"
    ]
  ]

  const detailRows: any[][] = []
  let detailStt = 1

  teacherList.forEach(tch => {
    tch.targets.forEach((t: any) => {
      const isCommitment = t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết Khảo sát đầu vào")) || t.sourceType === "ASSESSMENT"
      const student = t.student || {}
      const stName = student.studentName || student.fullName || "—"
      const stCode = student.studentCode || student.code || "—"
      const className = student.class?.className || student.className || "—"
      const campusName = student.class?.campus?.campusName || student.campus?.campusName || "—"
      const reasonDisplay = t.reason || t.notes || (t.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý định kỳ")
      const startDate = t.startDate ? new Date(t.startDate).toLocaleDateString("vi-VN") : "—"
      const isTerminated = t.terminationStatus === "TERMINATED"
      const endDateObj = isTerminated && t.endDate ? new Date(t.endDate) : (isTerminated && t.updatedAt ? new Date(t.updatedAt) : null)
      const endDate = endDateObj ? endDateObj.toLocaleDateString("vi-VN") : "—"
      const endMonth = endDateObj ? `Tháng ${endDateObj.getMonth() + 1}/${endDateObj.getFullYear()}` : "—"

      const evals = t.evaluations || []
      const sortedEvals = [...evals].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const latestEval = sortedEvals[0]
      const latestLevel = latestEval ? latestEval.trackingLevel : (isTerminated ? "Đã đạt mục tiêu" : "Đang theo dõi")
      const latestComment = latestEval ? latestEval.comment : (t.notes || "—")

      let statusDisplay = "Đang theo dõi"
      if (isTerminated) statusDisplay = "Đã chấm dứt theo dõi"
      else if (t.terminationStatus === "PENDING_TERMINATION") statusDisplay = "Chờ duyệt kết thúc"

      detailRows.push([
        detailStt++,
        tch.teacherName,
        stCode,
        stName,
        className,
        campusName,
        isCommitment ? "⭐️ Cam kết đầu vào" : "Thường kỳ",
        reasonDisplay,
        startDate,
        endDate,
        endMonth,
        statusDisplay,
        evals.length,
        latestLevel,
        latestComment
      ])
    })
  })

  const wsDetail = XLSX.utils.aoa_to_sheet([...detailHeader, ...detailRows])
  wsDetail["!cols"] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 14 },
    { wch: 24 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 26 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 45 }
  ]
  XLSX.utils.book_append_sheet(workbook, wsDetail, "Danh_Sach_HS_Theo_GV")

  // -------------------------------------------------------------------------
  // SHEET 3: TIẾN ĐỘ 10 THÁNG NĂM HỌC
  // -------------------------------------------------------------------------
  const monthHeader = [
    ["HỆ THỐNG GIÁO DỤC SKY-LINE"],
    ["MA TRẬN TIẾN TRÌNH THEO DÕI 10 THÁNG CỦA HỌC SINH THEO TỪNG GIÁO VIÊN"],
    [`Năm học: ${academicYear} | Xuất ngày: ${exportTimestamp}`],
    [],
    [
      "STT",
      "Giáo viên phụ trách",
      "Mã HS",
      "Họ và tên",
      "Lớp",
      "Cơ sở",
      "Diện can thiệp",
      ...ACADEMIC_MONTHS,
      "Đánh giá chung",
      "Trạng thái"
    ]
  ]

  const monthRows: any[][] = []
  let monthStt = 1

  teacherList.forEach(tch => {
    tch.targets.forEach((t: any) => {
      const isCommitment = t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết Khảo sát đầu vào")) || t.sourceType === "ASSESSMENT"
      const student = t.student || {}
      const stName = student.studentName || student.fullName || "—"
      const stCode = student.studentCode || student.code || "—"
      const className = student.class?.className || student.className || "—"
      const campusName = student.class?.campus?.campusName || student.campus?.campusName || "—"
      const evals = t.evaluations || []

      const monthValues = ACADEMIC_MONTHS.map((m) => {
        const monthEvals = findMonthEvaluations(evals, m)
        if (monthEvals.length === 0) return "—"
        const ev = monthEvals[monthEvals.length - 1]
        return ev.trackingLevel || "Đạt"
      })

      const sortedEvals = [...evals].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const latestEval = sortedEvals[0]
      const overallEvaluation = latestEval ? latestEval.trackingLevel : (t.terminationStatus === "TERMINATED" ? "Đã đạt mục tiêu" : "Đang theo dõi")

      monthRows.push([
        monthStt++,
        tch.teacherName,
        stCode,
        stName,
        className,
        campusName,
        isCommitment ? "⭐️ Cam kết" : "Thường kỳ",
        ...monthValues,
        overallEvaluation,
        t.terminationStatus === "TERMINATED" ? "Đã chấm dứt" : "Đang theo dõi"
      ])
    })
  })

  const wsMonth = XLSX.utils.aoa_to_sheet([...monthHeader, ...monthRows])
  wsMonth["!cols"] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 14 },
    { wch: 24 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    ...ACADEMIC_MONTHS.map(() => ({ wch: 13 })),
    { wch: 18 },
    { wch: 16 }
  ]
  XLSX.utils.book_append_sheet(workbook, wsMonth, "Tien_Do_10_Thang")

  // Tên file xuất ra
  const sanitizedYear = academicYear.replace(/[^a-zA-Z0-9_-]/g, "_")
  const typeTag = options.supportType === "PSYCHOLOGICAL" ? "Tam_Ly" : "Hoc_Tap"
  const campusTag = options.campusName && options.campusId !== "ALL"
    ? `_${options.campusName.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, "_")}`
    : "_Theo_Co_So_GV"
  const fileName = `So_Theo_Doi_Danh_Gia_${typeTag}${campusTag}_${sanitizedYear}.xlsx`

  XLSX.writeFile(workbook, fileName)
  return fileName
}

