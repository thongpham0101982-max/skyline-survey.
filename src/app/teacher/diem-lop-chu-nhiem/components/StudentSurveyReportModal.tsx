"use client"

import { useState, useMemo } from "react"
import {
  Printer,
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Calendar,
  User,
  Users,
  BookOpen,
  ExternalLink
} from "lucide-react"
import * as XLSX from "xlsx"

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
  periodLabel
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

  // Generate clean HTML for an individual student scorecard (strictly 1 A4 portrait page)
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
        <!-- School Header -->
        <div class="header-row">
          <div class="school-brand">
            <div class="school-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
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

        <!-- 3-Column Table: STT | Môn học | Điểm KS -->
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">STT</th>
              <th>Môn học</th>
              <th class="text-center" style="width: 80px;">Điểm KS</th>
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
            Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh <b>${student.studentName}</b>. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh thần học tập tích cực.
          </div>
        </div>

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
      margin: 6mm 10mm 6mm 10mm;
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
      line-height: 1.35;
    }
    .page-card {
      width: 100%;
      max-width: 190mm;
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
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .school-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .school-logo {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: #005B58;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .school-title {
      font-size: 11.5px;
      font-weight: 900;
      color: #005B58;
      text-transform: uppercase;
      letter-spacing: -0.2px;
      line-height: 1.2;
    }
    .system-info {
      text-align: right;
    }
    .system-title {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #1e293b;
      letter-spacing: 0.5px;
    }
    .system-slogan {
      font-size: 9px;
      font-weight: 700;
      color: #008c82;
      font-style: italic;
    }
    .class-badge {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 1px;
    }
    .class-badge b {
      color: #0f172a;
    }
    .report-heading {
      text-align: center;
      margin-bottom: 8px;
    }
    .report-title {
      font-size: 14.5px;
      font-weight: 900;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: -0.2px;
      margin: 0 0 3px 0;
    }
    .year-badge {
      display: inline-block;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      color: #008c82;
      font-size: 9.5px;
      font-weight: 800;
      padding: 1.5px 8px;
      border-radius: 9999px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #ccfbf1;
      border-radius: 7px;
      padding: 5px 10px;
      margin-bottom: 7px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 16px;
    }
    .info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 2px;
      font-size: 10px;
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
      margin-bottom: 4px;
    }
    .section-title {
      font-size: 10.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #003B3A;
      letter-spacing: 0.3px;
    }
    .section-count {
      font-size: 9px;
      font-weight: 700;
      color: #008c82;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 7px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }
    th {
      background: #005B58;
      color: #ffffff;
      font-weight: 800;
      padding: 4px 8px;
      text-align: left;
      border-right: 1px solid #004745;
    }
    th.text-center {
      text-align: center;
    }
    td {
      padding: 2.8px 8px;
      border-bottom: 1px solid #f1f5f9;
      border-right: 1px solid #f1f5f9;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #fcfdfe;
    }
    tr:last-child td {
      border-bottom: none;
    }
    td.stt {
      text-align: center;
      font-weight: 700;
      color: #64748b;
      width: 38px;
    }
    td.subj-name {
      font-weight: 800;
      color: #003B3A;
    }
    td.subj-code {
      font-size: 8.5px;
      font-weight: normal;
      color: #94a3b8;
      margin-left: 4px;
    }
    td.score {
      text-align: center;
      width: 80px;
    }
    .score-badge {
      display: inline-block;
      min-width: 30px;
      padding: 0.5px 5px;
      border-radius: 4px;
      font-weight: 900;
      font-size: 9.5px;
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
      border-radius: 7px;
      padding: 4px 8px;
      margin-bottom: 7px;
    }
    .remarks-header {
      font-size: 9.5px;
      font-weight: 900;
      color: #005B58;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .remarks-content {
      font-size: 9px;
      color: #334155;
      line-height: 1.35;
    }
    .signature-section {
      font-size: 9.5px;
    }
    .signature-date {
      text-align: right;
      font-style: italic;
      color: #475569;
      margin-bottom: 2px;
      font-size: 9px;
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
      font-size: 9.5px;
    }
    .sig-sub {
      font-size: 8px;
      font-style: italic;
      color: #64748b;
    }
    .sig-space {
      height: 32px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .sig-name {
      font-weight: 900;
      color: #0f172a;
      font-size: 9.5px;
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
          `Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh ${st.studentName}. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh thần học tập tích cực.`
        ],
        [""],
        ["", "", "", "", `Đà Nẵng, ngày ..... tháng ..... năm 20.....`],
        [""],
        ["XÁC NHẬN CỦA CÁC BÊN"],
        ["PHỤ HUYNH HỌC SINH", "", "GIÁO VIÊN CHỦ NHIỆM", "", "BAN GIÁM HIỆU"],
        ["(Ký và ghi rõ họ tên)", "", "(Ký và ghi rõ họ tên)", "", "(Ký và đóng dấu)"],
        ["", "", teacherName, "", ""]
      ]

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
        className="bg-white p-5 sm:p-7 font-sans text-slate-900 mx-auto max-w-[700px] shadow-lg rounded-2xl border border-teal-100"
      >
        {/* Top Header with School Info */}
        <div className="flex items-start justify-between border-b-2 border-[#008c82] pb-2.5 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#003B3A] via-[#005B58] to-[#008c82] text-white flex items-center justify-center p-2 shadow-xs shrink-0">
              <GraduationCap className="w-6 h-6 text-teal-200" />
            </div>
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
        <div className="text-center my-3 space-y-0.5">
          <h2 className="text-base sm:text-lg font-black text-[#003B3A] uppercase tracking-tight">
            {reportMainTitle}
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-extrabold text-[#008c82]">
            <Calendar className="w-3 h-3 text-[#008c82]" />
            <span>{reportYearTitle}</span>
          </div>
        </div>

        {/* Student & Class Information Box */}
        <div className="bg-gradient-to-r from-teal-50/70 via-sky-50/50 to-teal-50/70 py-2 px-3.5 rounded-xl border border-teal-200/80 mb-3 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
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
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wide flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-teal-600" />
            Chi tiết Kết Quả Khảo Sát
          </h3>
          <span className="text-[10px] font-bold text-teal-800 italic">
            {subjects.length} môn học
          </span>
        </div>

        {/* 3-Column Table: STT | Môn học | Điểm KS */}
        <div className="overflow-x-auto rounded-lg border border-teal-600/30 shadow-xs mb-3">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-gradient-to-r from-[#005B58] to-[#008c82] text-white font-black">
                <th className="py-1.5 px-2.5 text-center w-12 border-r border-teal-700">STT</th>
                <th className="py-1.5 px-3 border-r border-teal-700">Môn học</th>
                <th className="py-1.5 px-3 text-center w-28">Điểm KS</th>
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
                    <td className="py-1 px-2.5 text-center font-bold text-slate-500 border-r border-teal-100">
                      {idx + 1}
                    </td>

                    <td className="py-1 px-3 font-extrabold text-[#003B3A] border-r border-teal-100">
                      <span>{sub.name}</span>
                      {sub.code && <span className="text-[9px] font-normal text-slate-400 ml-1.5">({sub.code})</span>}
                    </td>

                    <td className="py-1 px-3 text-center font-black">
                      {score !== null && !isNaN(score) ? (
                        <span
                          className={`inline-block px-2.5 py-0.2 rounded-md border text-[11px] font-black shadow-2xs ${
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
        <div className="border border-teal-200 rounded-xl p-2.5 bg-teal-50/20 mb-3 space-y-0.5">
          <div className="text-[11px] font-black text-[#005B58] uppercase flex items-center gap-1.5">
            <span>Ý kiến & Nhận xét của Giáo viên Chủ nhiệm (GVCN):</span>
          </div>
          <div className="text-[10.5px] text-slate-700 leading-snug font-medium min-h-[36px] pt-0.5">
            <p>
              Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh <strong className="text-teal-900">{student.studentName}</strong>. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh thần học tập tích cực.
            </p>
          </div>
        </div>

        {/* Signature Section (3 Columns) */}
        <div className="pt-0.5 text-[11px]">
          <div className="text-right text-slate-600 italic mb-1.5 text-[10px]">
            Đà Nẵng, ngày ...... tháng ...... năm 20......
          </div>

          <div className="grid grid-cols-3 text-center gap-3">
            <div className="space-y-0.5">
              <div className="font-extrabold text-slate-800 uppercase text-[10.5px]">
                Phụ Huynh Học Sinh
              </div>
              <div className="text-[9px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
              <div className="h-10 sm:h-12"></div>
            </div>

            <div className="space-y-0.5">
              <div className="font-extrabold text-slate-800 uppercase text-[10.5px]">
                Giáo Viên Chủ Nhiệm
              </div>
              <div className="text-[9px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
              <div className="h-10 sm:h-12 flex items-end justify-center">
                <span className="font-black text-slate-900 text-[11px]">{teacherName}</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="font-extrabold text-slate-800 uppercase text-[10.5px]">
                Ban Giám Hiệu
              </div>
              <div className="text-[9px] text-slate-500 italic">(Ký và đóng dấu)</div>
              <div className="h-10 sm:h-12"></div>
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
