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
  BookOpen
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
  const [printMode, setPrintMode] = useState<"single" | "all">("single")

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

  // Print trigger
  const handlePrint = (mode: "single" | "all") => {
    setPrintMode(mode)
    setTimeout(() => {
      window.print()
    }, 150)
  }

  // Excel Export: ONLY STT, Môn học, Điểm KS (No ĐTB, no Môn đạt, no Xếp loại)
  const handleExportExcel = (exportAll: boolean = false) => {
    const listToExport = exportAll ? students : [currentStudent]
    const wb = XLSX.utils.book_new()

    listToExport.forEach((st: any) => {
      const headerData = [
        [schoolTitle],
        [`Cơ sở: ${currentClass?.campus?.campusName || currentClass?.campus?.name || currentClass?.campusName || "Sky-Line"}`],
        [""],
        [`${reportMainTitle} - ${reportYearTitle}`],
        [""],
        ["THÔNG TIN HỌC SINH"],
        [`Họ và tên học sinh: ${st.studentName}`, "", `Mã số học sinh: ${st.studentCode}`],
        [`Lớp: ${currentClass?.className}`, "", `Giáo viên chủ nhiệm: ${teacherName}`],
        [`Ngày sinh: ${st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString("vi-VN") : "-"}`, "", `Kỳ đánh giá: ${cleanPeriodLabel}`],
        [""],
        ["CHI TIẾT KẾT QUẢ KHẢO SÁT"],
        ["STT", "Môn học", "Điểm KS"]
      ]

      const subjectRows = subjects.map((sub: any, idx: number) => {
        const info = st.subjectGrades?.[sub.id]
        const score = info?.score !== null && info?.score !== undefined ? Number(info.score).toFixed(1) : "-"
        return [idx + 1, sub.name, score]
      })

      const footerData = [
        [""],
        [`Ý kiến nhận xét của GVCN: ${teacherName} ghi nhận kết quả rèn luyện và học tập của học sinh trong kỳ khảo sát này.`],
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

  // Render a single student's printable report card - OPTIMIZED FOR 1-PAGE A4 PORTRAIT
  const renderStudentReportCard = (student: any) => {
    return (
      <div
        key={student.studentId}
        className="student-report-page bg-white p-4 sm:p-7 font-sans text-slate-900 mx-auto max-w-[700px] shadow-lg rounded-2xl border border-teal-100 print:border-0 print:shadow-none print:p-0 print:m-0 print:max-w-none print:h-auto"
      >
        {/* Top Header with School Info - Compact */}
        <div className="flex items-start justify-between border-b-2 border-[#008c82] pb-2.5 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#003B3A] via-[#005B58] to-[#008c82] text-white flex items-center justify-center p-2 shadow-xs shrink-0">
              <GraduationCap className="w-6 h-6 text-teal-200" />
            </div>
            <div>
              <div className="text-xs sm:text-[13px] font-black text-[#005B58] tracking-tight uppercase leading-tight">
                {schoolTitle}
              </div>
              <div className="text-[10px] font-bold text-teal-800 leading-tight">
                Cơ sở: {currentClass?.campus?.campusName || currentClass?.campus?.name || currentClass?.campusName || "Sky-Line System"}
              </div>
              <div className="text-[9px] text-slate-500 font-medium">
                Ban Đảm bảo Chất lượng & Đào tạo Sky-Line
              </div>
            </div>
          </div>

          <div className="text-right hidden sm:block shrink-0">
            <div className="text-[10px] font-extrabold uppercase text-slate-800 tracking-wider">
              HỆ THỐNG GIÁO DỤC SKY-LINE
            </div>
            <div className="text-[9px] font-bold text-teal-700 italic">
              Nơi khởi đầu của những ước mơ
            </div>
            <div className="text-[9px] text-slate-500 font-medium mt-0.5">
              Mã lớp: <span className="font-bold text-slate-800">{currentClass?.className}</span>
            </div>
          </div>
        </div>

        {/* Report Main Title - Compact */}
        <div className="text-center my-2.5 space-y-0.5">
          <h2 className="text-base sm:text-lg font-black text-[#003B3A] uppercase tracking-tight">
            {reportMainTitle}
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-extrabold text-[#008c82]">
            <Calendar className="w-3 h-3 text-[#008c82]" />
            <span>{reportYearTitle}</span>
          </div>
        </div>

        {/* Student & Class Information Box - Compact 2-column Grid */}
        <div className="bg-gradient-to-r from-teal-50/70 via-sky-50/50 to-teal-50/70 py-2 px-3.5 rounded-xl border border-teal-200/80 mb-2.5 shadow-2xs">
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

        {/* Section Heading - Compact */}
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wide flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-teal-600" />
            Chi tiết Kết Quả Khảo Sát
          </h3>
          <span className="text-[10px] font-bold text-teal-800 italic">
            {subjects.length} môn học
          </span>
        </div>

        {/* BEAUTIFUL BLUE/TEAL TABLE: CHỈ GỒM STT | MÔN HỌC | ĐIỂM KS - COMPACT ROW HEIGHT */}
        <div className="overflow-x-auto rounded-lg border border-teal-600/30 shadow-xs mb-2.5 print:border-slate-300">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-gradient-to-r from-[#005B58] to-[#008c82] text-white font-black print:bg-[#005B58]">
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

        {/* Teacher's Remarks - Compact */}
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

        {/* Signature Section (3 Columns) - Compact Height */}
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
      {/* Print Specific Stylesheet for Guaranteed 1-Page A4 Portrait Output */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print-layout {
            display: none !important;
          }
          .student-report-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            padding: 6mm 10mm !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: 280mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: hidden !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
        }
      `
        }}
      />

      {/* Modal Container */}
      <div
        className="bg-slate-100 rounded-3xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-slate-300 animate-scaleUp my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print-layout bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 shadow-md">
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

            {/* Print Single Student */}
            <button
              onClick={() => handlePrint("single")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#008c82] hover:bg-[#00746b] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="In phiếu điểm cho học sinh hiện tại (chuẩn 1 trang A4)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Phiếu Điểm (PDF)</span>
            </button>

            {/* Print Entire Class */}
            <button
              onClick={() => handlePrint("all")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="In phiếu điểm toàn bộ học sinh trong lớp (mỗi học sinh đúng 1 trang A4)"
            >
              <Users className="w-3.5 h-3.5" />
              <span>In Cả Lớp ({students.length} HS)</span>
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

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 print:p-0 print:m-0 print:overflow-visible">
          {printMode === "all" ? (
            <div className="space-y-4 print:space-y-0">
              {students.map((st) => renderStudentReportCard(st))}
            </div>
          ) : (
            renderStudentReportCard(currentStudent)
          )}
        </div>
      </div>
    </div>
  )
}
