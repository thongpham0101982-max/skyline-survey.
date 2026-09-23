"use client"

import { useState, useMemo } from "react"
import {
  Printer,
  Edit3,
  MessageSquare,
  UserCheck,
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Users,
  BookOpen,
  ExternalLink,
  Send
} from "lucide-react"
import * as XLSX from "xlsx"

const SKYLINE_LOGO_BASE64 = "data:image/png;base64,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"

interface StudentSurveyReportModalProps {
  isOpen: boolean
  onClose: () => void
  initialStudentId?: string
  students: any[]
  subjects: any[]
  currentClass: any
  teacherName: string
  academicYearName: string
  selectedPeriod: string
  periodLabel: string
  onOpenEditFeedback?: (student: any) => void
}

export function StudentSurveyReportModal({
  isOpen,
  onClose,
  initialStudentId,
  students,
  subjects,
  currentClass,
  teacherName,
  academicYearName,
  selectedPeriod,
  periodLabel,
  onOpenEditFeedback
}: StudentSurveyReportModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || (students && students[0]?.studentId) || ""
  )
  const [isPrinting, setIsPrinting] = useState<boolean>(false)

  // Update selected student when initialStudentId changes
  useMemo(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId)
    } else if (students && students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].studentId)
    }
  }, [initialStudentId, students])

  if (!isOpen || !students || students.length === 0) return null

  // Current selected student
  const currentIndex = students.findIndex((s) => s.studentId === selectedStudentId)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0
  const currentStudent = students[safeIndex] || students[0]

  // Rule for Campus Header Title:
  // CS4: TRƯỜNG TH, THCS HPT SKY-LINE HILL
  // CS1, CS2, CS3, CS5: TRƯỜNG TH, THCS HPT SKY-LINE
  const getSchoolTitle = () => {
    const campusCode = (currentClass?.campus?.campusCode || currentClass?.campusCode || "").toUpperCase()
    const campusName = (currentClass?.campus?.campusName || currentClass?.campus?.name || currentClass?.campusName || "").toUpperCase()
    const className = (currentClass?.className || "").toUpperCase()
    const combined = `${campusCode} ${campusName} ${className}`

    if (combined.includes("CS4") || combined.includes("HILL")) {
      return "TRƯỜNG TH, THCS HPT SKY-LINE HILL"
    }
    return "TRƯỜNG TH, THCS HPT SKY-LINE"
  }

  const schoolTitle = getSchoolTitle()

  // Full dynamic report title
  const cleanPeriodLabel = periodLabel || selectedPeriod || "Khảo sát"
  const reportMainTitle = `BÁO CÁO KẾT QUẢ KHẢO SÁT - ${cleanPeriodLabel.toUpperCase()}`
  const reportYearTitle = `NĂM HỌC: ${academicYearName || "2024 - 2025"}`

  // Next / Previous student handlers
  const handlePrev = () => {
    if (safeIndex > 0) {
      setSelectedStudentId(students[safeIndex - 1].studentId)
    }
  }

  const handleNext = () => {
    if (safeIndex < students.length - 1) {
      setSelectedStudentId(students[safeIndex + 1].studentId)
    }
  }

  // Generate clean HTML for an individual student scorecard (proportional & spacious 1 A4 portrait page)
  const generateStudentHtml = (student: any) => {
    const dob = student.dateOfBirth
      ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN")
      : "-"

    const rowsHtml = subjects
      .map((sub: any, idx: number) => {
        const info = student.subjectGrades?.[sub.id]
        const score = info?.score !== null && info?.score !== undefined ? Number(info.score) : null
        
        let scoreBadgeHtml = '<span class="score-empty">-</span>'
        if (score !== null && !isNaN(score)) {
          let scoreClass = "score-weak"
          if (score >= 8.0) scoreClass = "score-good"
          else if (score >= 6.5) scoreClass = "score-fair"
          else if (score >= 5.0) scoreClass = "score-avg"
          scoreBadgeHtml = `<span class="score-badge ${scoreClass}">${score.toFixed(1)}</span>`
        }

        const subCode = sub.code ? `<span class="subj-code">(${sub.code})</span>` : ""

        return `
          <tr>
            <td class="stt">${idx + 1}</td>
            <td class="subj-name">${sub.name} ${subCode}</td>
            <td class="score">${scoreBadgeHtml}</td>
          </tr>
        `
      })
      .join("")

    return `
      <div class="page-card">
        <!-- School Header with Official Sky-Line Logo -->
        <div class="header-row">
          <div class="school-brand">
            <img src="${SKYLINE_LOGO_BASE64}" alt="Sky-Line" class="school-logo-img" />
            <div class="school-divider"></div>
            <div>
              <div class="school-title">${schoolTitle}</div>
            </div>
          </div>
          <div class="system-info">
            <div class="system-title">HỆ THỐNG GIÁO DỤC SKY-LINE</div>
            <div class="system-slogan">Nơi Khởi nguồn hạnh phúc</div>
            <div class="class-badge">Mã lớp: <b>${currentClass?.className || ""}</b></div>
          </div>
        </div>

        <!-- Report Main Title -->
        <div class="report-heading">
          <h1 class="report-title">${reportMainTitle}</h1>
          <div class="year-badge">📅 ${reportYearTitle}</div>
        </div>

        <!-- Student Info Box (2 columns) -->
        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Họ và tên học sinh:</span>
            <span class="info-val-highlight">${student.studentName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Lớp:</span>
            <span class="info-val">${currentClass?.className || ""}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Mã số học sinh:</span>
            <span class="info-val">${student.studentCode || "-"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Giáo viên chủ nhiệm (GVCN):</span>
            <span class="info-val">${teacherName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Ngày sinh:</span>
            <span class="info-val">${dob}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Kỳ khảo sát:</span>
            <span class="info-val-blue">${cleanPeriodLabel}</span>
          </div>
        </div>

        <!-- Section Bar -->
        <div class="section-bar">
          <div class="section-title">CHI TIẾT KẾT QUẢ KHẢO SÁT</div>
          <div class="section-count">${subjects.length} môn học</div>
        </div>

        <!-- 3-Column Table: Spacious & Legible -->
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 46px;">STT</th>
              <th>Môn học</th>
              <th class="text-center" style="width: 95px;">Điểm KS</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- GVCN Remarks -->
        <div class="remarks-box">
          <div class="remarks-header">Ý kiến & Nhận xét của Giáo viên Chủ nhiệm (GVCN):</div>
          <div class="remarks-content">
            ${student.teacherRemark || `Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh <b>${student.studentName}</b>. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh thần học tập tích cực.`}
          </div>
        </div>

        ${student.parentFeedback ? `
        <!-- Parent Feedback -->
        <div class="remarks-box" style="margin-top: 8px; border-color: #7dd3fc; background-color: #f0f9ff;">
          <div class="remarks-header" style="color: #0369a1;">Ý kiến & Phản hồi của Phụ huynh học sinh (PHHS):</div>
          <div class="remarks-content" style="font-style: italic; color: #1e293b;">
            "${student.parentFeedback}"
          </div>
        </div>
        ` : ''}

        ${student.forwardedGvbm ? `
        <!-- Forward to GVBM Status -->
        <div class="remarks-box" style="margin-top: 8px; border-color: #93c5fd; background-color: #eff6ff;">
          <div class="remarks-header" style="color: #1d4ed8;">Phối hợp Giáo viên Bộ môn (GVBM):</div>
          <div class="remarks-content" style="color: #1e293b;">
            Đã chuyển thông tin phối hợp tới GVBM <b>${student.forwardedGvbm.teacherName}</b> (Môn <b>${student.forwardedGvbm.subjectName}</b>)${student.forwardedGvbm.message ? `: <i>"${student.forwardedGvbm.message}"</i>` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Signatures (3 columns) -->
        <div class="signature-section">
          <div class="signature-date">Đà Nẵng, ngày ...... tháng ...... năm 20......</div>
          <div class="signature-grid">
            <div>
              <div class="sig-title">Phụ Huynh Học Sinh</div>
              <div class="sig-sub">(Ký và ghi rõ họ tên)</div>
              <div class="sig-space"></div>
            </div>
            <div>
              <div class="sig-title">Giáo Viên Chủ Nhiệm</div>
              <div class="sig-sub">(Ký và ghi rõ họ tên)</div>
              <div class="sig-space">
                <span class="sig-name">${teacherName}</span>
              </div>
            </div>
            <div>
              <div class="sig-title">Ban Giám Hiệu</div>
              <div class="sig-sub">(Ký và đóng dấu)</div>
              <div class="sig-space"></div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  // Generate full HTML page for printing / viewing
  const getFullPrintHtml = (list: any[], docTitle: string) => {
    const bodyCards = list.map((st) => generateStudentHtml(st)).join("")
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${docTitle}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 12mm 8mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.38;
    }
    .page-card {
      width: 100%;
      max-width: 186mm;
      margin: 0 auto;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: always !important;
      break-after: page !important;
      background: #ffffff;
      padding: 2mm 0;
      box-sizing: border-box;
    }
    .page-card:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #008c82;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .school-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .school-logo-img {
      height: 38px;
      width: auto;
      max-width: 155px;
      object-fit: contain;
    }
    .school-divider {
      width: 1.5px;
      height: 28px;
      background: #cbd5e1;
    }
    .school-title {
      font-size: 12px;
      font-weight: 900;
      color: #005B58;
      text-transform: uppercase;
      letter-spacing: -0.1px;
      line-height: 1.25;
    }
    .system-info {
      text-align: right;
    }
    .system-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #1e293b;
      letter-spacing: 0.5px;
    }
    .system-slogan {
      font-size: 9.5px;
      font-weight: 700;
      color: #008c82;
      font-style: italic;
    }
    .class-badge {
      font-size: 9px;
      color: #64748b;
      margin-top: 1.5px;
    }
    .class-badge b {
      color: #0f172a;
    }
    .report-heading {
      text-align: center;
      margin-bottom: 10px;
    }
    .report-title {
      font-size: 15px;
      font-weight: 900;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: -0.2px;
      margin: 0 0 4px 0;
    }
    .year-badge {
      display: inline-block;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      color: #008c82;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 10px;
      border-radius: 9999px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #ccfbf1;
      border-radius: 8px;
      padding: 6px 12px;
      margin-bottom: 9px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 18px;
    }
    .info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 2.5px;
      font-size: 10.5px;
    }
    .info-row:nth-last-child(-n+2) {
      border-bottom: none;
      padding-bottom: 0;
    }
    .info-label {
      color: #475569;
      font-weight: 600;
    }
    .info-val {
      font-weight: 800;
      color: #0f172a;
    }
    .info-val-highlight {
      font-weight: 900;
      color: #003B3A;
    }
    .info-val-blue {
      font-weight: 900;
      color: #0284c7;
      text-transform: uppercase;
    }
    .section-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      color: #003B3A;
      letter-spacing: 0.3px;
    }
    .section-count {
      font-size: 9.5px;
      font-weight: 700;
      color: #008c82;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin-bottom: 10px;
      border: 1px solid #94a3b8;
      border-radius: 6px;
      overflow: hidden;
    }
    th {
      background: #005B58;
      color: #ffffff;
      font-weight: 800;
      padding: 5.5px 10px;
      text-align: left;
      border-right: 1px solid #004745;
      font-size: 11px;
    }
    th.text-center {
      text-align: center;
    }
    td {
      padding: 4.5px 10px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #f1f5f9;
      color: #1e293b;
      font-size: 10.5px;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    tr:last-child td {
      border-bottom: none;
    }
    td.stt {
      text-align: center;
      font-weight: 700;
      color: #475569;
      width: 46px;
    }
    td.subj-name {
      font-weight: 800;
      color: #003B3A;
    }
    td.subj-code {
      font-size: 9px;
      font-weight: normal;
      color: #64748b;
      margin-left: 5px;
    }
    td.score {
      text-align: center;
      width: 95px;
    }
    .score-badge {
      display: inline-block;
      min-width: 34px;
      padding: 1px 7px;
      border-radius: 4px;
      font-weight: 900;
      font-size: 10.5px;
      border: 1px solid transparent;
    }
    .score-good {
      background: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }
    .score-fair {
      background: #f0f9ff;
      color: #0284c7;
      border-color: #bae6fd;
    }
    .score-avg {
      background: #fffbeb;
      color: #b45309;
      border-color: #fde68a;
    }
    .score-weak {
      background: #fef2f2;
      color: #b91c1c;
      border-color: #fecaca;
    }
    .score-empty {
      color: #94a3b8;
      font-weight: bold;
    }
    .remarks-box {
      border: 1px solid #99f6e4;
      background: #f0fdfa;
      border-radius: 8px;
      padding: 6px 12px;
      margin-bottom: 10px;
    }
    .remarks-header {
      font-size: 10.5px;
      font-weight: 900;
      color: #005B58;
      text-transform: uppercase;
      margin-bottom: 2.5px;
    }
    .remarks-content {
      font-size: 10px;
      color: #334155;
      line-height: 1.4;
    }
    .signature-section {
      font-size: 10.5px;
    }
    .signature-date {
      text-align: right;
      font-style: italic;
      color: #475569;
      margin-bottom: 3px;
      font-size: 10px;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      text-align: center;
    }
    .sig-title {
      font-weight: 800;
      text-transform: uppercase;
      color: #1e293b;
      font-size: 10px;
    }
    .sig-sub {
      font-size: 8.5px;
      font-style: italic;
      color: #64748b;
    }
    .sig-space {
      height: 42px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .sig-name {
      font-weight: 900;
      color: #0f172a;
      font-size: 10.5px;
    }
  </style>
</head>
<body>
  ${bodyCards}
</body>
</html>`
  }

  // Pure Isolated Iframe Print: Guaranteed 100% no screen capture, exactly 1 A4 portrait page
  const handlePrint = (mode: "single" | "all") => {
    setIsPrinting(true)
    const listToPrint = mode === "all" ? students : [currentStudent]
    const docTitle = mode === "all"
      ? `Bao_Cao_Khao_Sat_${currentClass?.className || "Lop"}_${selectedPeriod}`
      : `Phieu_Diem_${currentStudent?.studentName?.replace(/\s+/g, "_")}_${currentClass?.className}_${selectedPeriod}`

    const htmlContent = getFullPrintHtml(listToPrint, docTitle)

    // Remove old print iframe if present
    const oldIframe = document.getElementById("student-report-print-iframe")
    if (oldIframe) {
      oldIframe.remove()
    }

    const iframe = document.createElement("iframe")
    iframe.id = "student-report-print-iframe"
    iframe.style.position = "fixed"
    iframe.style.left = "-9999px"
    iframe.style.top = "0"
    iframe.style.width = "210mm"
    iframe.style.height = "297mm"
    iframe.style.opacity = "0"
    iframe.style.border = "none"
    iframe.style.zIndex = "-9999"
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) {
      setIsPrinting(false)
      return
    }

    iframeDoc.open()
    iframeDoc.write(htmlContent)
    iframeDoc.close()

    setTimeout(() => {
      setIsPrinting(false)
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        iframe.remove()
      }, 3000)
    }, 250)
  }

  // Open clean printable HTML scorecard in a new browser tab
  const handleOpenHtmlTab = (mode: "single" | "all") => {
    const listToPrint = mode === "all" ? students : [currentStudent]
    const docTitle = mode === "all"
      ? `Bao_Cao_Khao_Sat_${currentClass?.className || "Lop"}_${selectedPeriod}`
      : `Phieu_Diem_${currentStudent?.studentName?.replace(/\s+/g, "_")}_${currentClass?.className}_${selectedPeriod}`

    const htmlContent = getFullPrintHtml(listToPrint, docTitle)
    const printWin = window.open("", "_blank")
    if (printWin) {
      printWin.document.open()
      printWin.document.write(htmlContent)
      printWin.document.close()
    }
  }

  // Excel Export: ONLY STT, Môn học, Điểm KS (No ĐTB, no Môn đạt, no Xếp loại)
  const handleExportExcel = (exportAll: boolean = false) => {
    const listToExport = exportAll ? students : [currentStudent]
    const wb = XLSX.utils.book_new()

    listToExport.forEach((st: any) => {
      const headerData = [
        [schoolTitle],
        ["HỆ THỐNG GIÁO DỤC SKY-LINE - Nơi Khởi nguồn hạnh phúc"],
        [""],
        [reportMainTitle],
        [reportYearTitle],
        [""],
        ["Họ và tên học sinh:", st.studentName, "", "Lớp:", currentClass?.className],
        ["Mã số học sinh:", st.studentCode, "", "GVCN:", teacherName],
        [
          "Ngày sinh:",
          st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString("vi-VN") : "-",
          "",
          "Kỳ khảo sát:",
          cleanPeriodLabel
        ],
        [""],
        ["BẢNG KẾT QUẢ KHẢO SÁT CHI TIẾT"],
        ["STT", "Môn học", "Điểm KS"]
      ]

      const subjectRows = subjects.map((sub: any, idx: number) => {
        const info = st.subjectGrades?.[sub.id]
        const score = info?.score !== null && info?.score !== undefined ? Number(info.score) : null
        return [
          idx + 1,
          sub.code ? `${sub.name} (${sub.code})` : sub.name,
          score !== null && !isNaN(score) ? score : "-"
        ]
      })

      const footerData = [
        [""],
        ["Ý KIẾN & NHẬN XÉT CỦA GIÁO VIÊN CHỦ NHIỆM (GVCN)"],
        [
          st.teacherRemark || `Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh ${st.studentName}. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh thần học tập tích cực.`
        ]
      ]

      if (st.parentFeedback) {
        footerData.push(
          [""],
          ["Ý KIẾN & PHẢN HỒI CỦA PHỤ HUYNH HỌC SINH (PHHS)"],
          [st.parentFeedback]
        )
      }

      footerData.push(
        [""],
        ["", "", "", "", `Đà Nẵng, ngày ..... tháng ..... năm 20.....`],
        [""],
        ["XÁC NHẬN CỦA CÁC BÊN"],
        ["PHỤ HUYNH HỌC SINH", "", "GIÁO VIÊN CHỦ NHIỆM", "", "BAN GIÁM HIỆU"],
        ["(Ký và ghi rõ họ tên)", "", "(Ký và ghi rõ họ tên)", "", "(Ký và đóng dấu)"],
        ["", "", teacherName, "", ""]
      )

      const sheetData = [...headerData, ...subjectRows, ...footerData]
      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      
      // Auto column width
      ws["!cols"] = [
        { wch: 8 },
        { wch: 28 },
        { wch: 18 }
      ]

      const sheetName = (st.studentName || "HocSinh").replace(/[/\\?*\[\]]/g, "_").slice(0, 28)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    })

    const fileName = exportAll
      ? `BaoCaoKhaoSat_Lop_${currentClass?.className || "Lop"}_${selectedPeriod}.xlsx`
      : `PhieuDiem_${currentStudent?.studentName?.replace(/\s+/g, "_")}_${currentClass?.className}_${selectedPeriod}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Render on-screen preview card for the modal viewer
  const renderPreviewCard = (student: any) => {
    return (
      <div
        key={student.studentId}
        className="bg-white p-5 sm:p-7 font-sans text-slate-900 mx-auto max-w-[720px] shadow-lg rounded-2xl border border-teal-100"
      >
        {/* Top Header with Sky-Line Logo */}
        <div className="flex items-start justify-between border-b-2 border-[#008c82] pb-3 gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Sky-Line"
              className="h-10 w-auto object-contain shrink-0"
            />
            <div className="w-[1.5px] h-8 bg-slate-200 hidden sm:block"></div>
            <div>
              <div className="text-xs sm:text-sm font-black text-[#005B58] tracking-tight uppercase leading-tight">
                {schoolTitle}
              </div>
            </div>
          </div>

          <div className="text-right hidden sm:block shrink-0">
            <div className="text-[10px] font-extrabold uppercase text-slate-800 tracking-wider">
              HỆ THỐNG GIÁO DỤC SKY-LINE
            </div>
            <div className="text-[9px] font-bold text-teal-700 italic">
              Nơi Khởi nguồn hạnh phúc
            </div>
            <div className="text-[9px] text-slate-500 font-medium mt-0.5">
              Mã lớp: <span className="font-bold text-slate-800">{currentClass?.className}</span>
            </div>
          </div>
        </div>

        {/* Report Main Title */}
        <div className="text-center my-3.5 space-y-0.5">
          <h2 className="text-base sm:text-lg font-black text-[#003B3A] uppercase tracking-tight">
            {reportMainTitle}
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-extrabold text-[#008c82]">
            <Calendar className="w-3 h-3 text-[#008c82]" />
            <span>{reportYearTitle}</span>
          </div>
        </div>

        {/* Student & Class Information Box */}
        <div className="bg-gradient-to-r from-teal-50/70 via-sky-50/50 to-teal-50/70 py-2.5 px-4 rounded-xl border border-teal-200/80 mb-3.5 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
            <div className="flex items-center justify-between border-b border-teal-100/60 pb-0.5">
              <span className="text-slate-600 font-bold flex items-center gap-1">
                <User className="w-3 h-3 text-teal-600" />
                Họ và tên học sinh:
              </span>
              <strong className="font-black text-[#003B3A]">{student.studentName}</strong>
            </div>

            <div className="flex items-center justify-between border-b border-teal-100/60 pb-0.5">
              <span className="text-slate-600 font-bold flex items-center gap-1">
                <Users className="w-3 h-3 text-teal-600" />
                Lớp:
              </span>
              <strong className="font-black text-teal-900">{currentClass?.className}</strong>
            </div>

            <div className="flex items-center justify-between border-b border-teal-100/60 pb-0.5">
              <span className="text-slate-600 font-bold">Mã số học sinh:</span>
              <span className="font-extrabold text-slate-800 tracking-wider">{student.studentCode}</span>
            </div>

            <div className="flex items-center justify-between border-b border-teal-100/60 pb-0.5">
              <span className="text-slate-600 font-bold">Giáo viên chủ nhiệm (GVCN):</span>
              <span className="font-extrabold text-slate-800">{teacherName}</span>
            </div>

            <div className="flex items-center justify-between border-b border-teal-100/60 pb-0.5 sm:border-b-0">
              <span className="text-slate-600 font-bold">Ngày sinh:</span>
              <span className="font-semibold text-slate-700">
                {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "-"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-bold">Kỳ khảo sát:</span>
              <span className="font-black text-[#0284C7] uppercase">{cleanPeriodLabel}</span>
            </div>
          </div>
        </div>

        {/* Section Heading */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wide flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-teal-600" />
            Chi tiết Kết Quả Khảo Sát
          </h3>
          <span className="text-[10px] font-bold text-teal-800 italic">
            {subjects.length} môn học
          </span>
        </div>

        {/* 3-Column Table: STT | Môn học | Điểm KS */}
        <div className="overflow-x-auto rounded-lg border border-teal-600/30 shadow-xs mb-3.5">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-gradient-to-r from-[#005B58] to-[#008c82] text-white font-black">
                <th className="py-2 px-3 text-center w-12 border-r border-teal-700">STT</th>
                <th className="py-2 px-3.5 border-r border-teal-700">Môn học</th>
                <th className="py-2 px-3.5 text-center w-28">Điểm KS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-100">
              {subjects.map((sub: any, idx: number) => {
                const info = student.subjectGrades?.[sub.id]
                const score = info?.score !== null && info?.score !== undefined ? Number(info.score) : null
                const isEven = idx % 2 === 0

                return (
                  <tr
                    key={sub.id}
                    className={`transition-colors ${isEven ? "bg-white" : "bg-teal-50/20"} hover:bg-teal-50/50`}
                  >
                    <td className="py-1.5 px-3 text-center font-bold text-slate-500 border-r border-teal-100">
                      {idx + 1}
                    </td>

                    <td className="py-1.5 px-3.5 font-extrabold text-[#003B3A] border-r border-teal-100">
                      <span>{sub.name}</span>
                      {sub.code && <span className="text-[9.5px] font-normal text-slate-400 ml-1.5">({sub.code})</span>}
                    </td>

                    <td className="py-1.5 px-3.5 text-center font-black">
                      {score !== null && !isNaN(score) ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md border text-[11px] font-black shadow-2xs ${
                            score >= 8.0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : score >= 6.5
                              ? "bg-sky-50 text-sky-700 border-sky-300"
                              : score >= 5.0
                              ? "bg-amber-50 text-amber-700 border-amber-300"
                              : "bg-rose-50 text-rose-700 border-rose-300 font-black"
                          }`}
                        >
                          {score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold text-xs">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Teacher's Remarks */}
        <div className="border border-teal-200 rounded-xl p-3 bg-teal-50/20 mb-3 space-y-0.5">
          <div className="text-[11px] font-black text-[#005B58] uppercase flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Ý kiến & Nhận xét của Giáo viên Chủ nhiệm (GVCN):</span>
            </span>
            {onOpenEditFeedback && (
              <button
                type="button"
                onClick={() => onOpenEditFeedback(student)}
                className="text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-white hover:bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 cursor-pointer flex items-center gap-1 transition-colors shadow-2xs"
                title="Chỉnh sửa nhận xét GVCN"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>Chỉnh sửa</span>
              </button>
            )}
          </div>
          <div className="text-[10.5px] text-slate-700 leading-snug font-medium min-h-[38px] pt-0.5">
            <p>
              {student.teacherRemark ? (
                <span>{student.teacherRemark}</span>
              ) : (
                <span>
                  Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh <strong className="text-teal-900">{student.studentName}</strong>. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh thần học tập tích cực.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Parent's Feedback (if available) */}
        {student.parentFeedback && (
          <div className="border border-sky-200 rounded-xl p-3 bg-sky-50/30 mb-3 space-y-0.5">
            <div className="text-[11px] font-black text-[#0369a1] uppercase flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
              <span>Ý kiến & Phản hồi của Phụ huynh học sinh (PHHS):</span>
            </div>
            <div className="text-[10.5px] text-slate-700 leading-snug font-medium pt-0.5 italic">
              &ldquo;{student.parentFeedback}&rdquo;
            </div>
          </div>
        )}

        {/* Forward to GVBM Status (if available) */}
        {student.forwardedGvbm && (
          <div className="border border-blue-200 rounded-xl p-3 bg-blue-50/40 mb-3 space-y-1">
            <div className="text-[11px] font-black text-blue-900 uppercase flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-blue-600" />
              <span>Phối hợp Giáo viên Bộ môn (GVBM):</span>
            </div>
            <div className="text-[10.5px] text-slate-800 leading-snug font-medium pt-0.5">
              Đã chuyển tiếp thông tin tới GVBM <strong className="text-blue-950 font-bold">{student.forwardedGvbm.teacherName}</strong> (Môn <strong className="text-blue-700 font-extrabold">{student.forwardedGvbm.subjectName}</strong>)
              {student.forwardedGvbm.message && (
                <span className="italic text-slate-600"> &mdash; &ldquo;{student.forwardedGvbm.message}&rdquo;</span>
              )}
            </div>
          </div>
        )}

        {/* Signature Section (3 Columns) */}
        <div className="pt-1 text-[11px]">
          <div className="text-right text-slate-600 italic mb-2 text-[10px]">
            Đà Nẵng, ngày ...... tháng ...... năm 20......
          </div>

          <div className="grid grid-cols-3 text-center gap-3">
            <div className="space-y-0.5">
              <div className="font-extrabold text-slate-800 uppercase text-[10.5px]">
                Phụ Huynh Học Sinh
              </div>
              <div className="text-[9px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
              <div className="h-12"></div>
            </div>

            <div className="space-y-0.5">
              <div className="font-extrabold text-slate-800 uppercase text-[10.5px]">
                Giáo Viên Chủ Nhiệm
              </div>
              <div className="text-[9px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
              <div className="h-12 flex items-end justify-center">
                <span className="font-black text-slate-900 text-[11px]">{teacherName}</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="font-extrabold text-slate-800 uppercase text-[10.5px]">
                Ban Giám Hiệu
              </div>
              <div className="text-[9px] text-slate-500 italic">(Ký và đóng dấu)</div>
              <div className="h-12"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Modal Container */}
      <div
        className="bg-slate-100 rounded-3xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-slate-300 animate-scaleUp my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                <span>Xuất Báo Cáo & Phiếu Điểm Khảo Sát Học Sinh</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 text-[10px] font-bold">
                  {cleanPeriodLabel}
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Lớp <strong className="text-teal-300">{currentClass?.className}</strong> • GVCN: <strong className="text-teal-200">{teacherName}</strong>
              </p>
            </div>
          </div>

          {/* Controls: Student Selector & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Student Dropdown */}
            <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 border border-white/15 text-xs">
              <button
                onClick={handlePrev}
                disabled={safeIndex <= 0}
                className="p-1 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent text-white transition-all cursor-pointer"
                title="Học sinh trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="bg-transparent text-white font-extrabold text-xs outline-none py-1 px-1 cursor-pointer max-w-[180px] truncate"
              >
                {students.map((st, idx) => (
                  <option key={st.studentId} value={st.studentId} className="text-slate-900">
                    {idx + 1}. {st.studentName} ({st.studentCode})
                  </option>
                ))}
              </select>

              <button
                onClick={handleNext}
                disabled={safeIndex >= students.length - 1}
                className="p-1 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent text-white transition-all cursor-pointer"
                title="Học sinh tiếp theo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Print Single Student (Guaranteed 1 A4 Page) */}
            <button
              onClick={() => handlePrint("single")}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#008c82] hover:bg-[#00746b] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="In trực tiếp phiếu điểm học sinh (chuẩn 1 trang A4 dọc, không dính nền web)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrinting ? "Đang xử lý..." : "In Phiếu Điểm (PDF)"}</span>
            </button>

            {/* Print Entire Class (1 Page per student) */}
            <button
              onClick={() => handlePrint("all")}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="In toàn bộ phiếu điểm học sinh trong lớp (mỗi học sinh đúng 1 trang A4)"
            >
              <Users className="w-3.5 h-3.5" />
              <span>In Cả Lớp ({students.length} HS)</span>
            </button>

            {/* Open Clean HTML Tab */}
            <button
              onClick={() => handleOpenHtmlTab("single")}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Mở phiếu điểm HTML độc lập trong tab mới"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Xem Tab In HTML</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={() => handleExportExcel(false)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Xuất file Excel phiếu điểm học sinh này"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content (On-Screen Preview) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {renderPreviewCard(currentStudent)}
        </div>
      </div>
    </div>
  )
}
