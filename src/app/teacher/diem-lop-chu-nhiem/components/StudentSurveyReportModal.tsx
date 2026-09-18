"use client"

import { useState, useMemo } from "react"
import {
  Printer,
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  Award,
  CheckCircle2,
  AlertTriangle,
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

  // Helper score classification
  const getScoreClassification = (score: number | null, benchmark: number) => {
    if (score === null || score === undefined || isNaN(score)) {
      return { text: "Chưa có điểm", color: "text-slate-400 bg-slate-100 border-slate-200" }
    }
    if (score >= 8.0) {
      return { text: "Đạt chuẩn (Giỏi)", color: "text-emerald-700 bg-emerald-50 border-emerald-300" }
    }
    if (score >= benchmark) {
      return { text: "Đạt chuẩn", color: "text-teal-700 bg-teal-50 border-teal-300" }
    }
    return { text: `Dưới chuẩn (-${(benchmark - score).toFixed(1)}đ)`, color: "text-rose-700 bg-rose-50 border-rose-300" }
  }

  // Overall student performance classification
  const getOverallRanking = (gpa: number | null, belowCount: number) => {
    if (gpa === null) return "Chưa đủ dữ liệu"
    if (gpa >= 8.0 && belowCount === 0) return "Tốt / Xuất sắc"
    if (gpa >= 6.5 && belowCount === 0) return "Khá / Đạt chuẩn vững chắc"
    if (gpa >= 5.0 && belowCount <= 1) return "Trung bình / Đạt yêu cầu"
    return "Cần bồi dưỡng & hỗ trợ học tập"
  }

  // Excel Export for a single student or all students
  const handleExportExcel = (exportAll: boolean = false) => {
    const listToExport = exportAll ? students : [currentStudent]
    const wb = XLSX.utils.book_new()

    listToExport.forEach((st: any) => {
      const gpa = st.gpa !== null ? st.gpa.toFixed(1) : "-"
      const ranking = getOverallRanking(st.gpa, st.belowBenchmarkCount || 0)

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
        ["CHI TIẾT KẾT QUẢ KHẢO SÁT CÁC MÔN ĐỊNH KỲ"],
        ["STT", "Môn học", "Điểm khảo sát", "Điểm chuẩn môn", "Đánh giá kết quả", "Điểm thành phần", "Nhận xét của GVBM"]
      ]

      const subjectRows = subjects.map((sub: any, idx: number) => {
        const info = st.subjectGrades?.[sub.id]
        const score = info?.score !== null && info?.score !== undefined ? Number(info.score).toFixed(1) : "-"
        const bm = info?.benchmark !== undefined ? Number(info.benchmark).toFixed(1) : "6.0"
        const status = info?.score !== null && info?.score !== undefined
          ? (info.score >= info.benchmark ? "Đạt chuẩn" : `Dưới chuẩn (-${Math.abs(info.gap || 0).toFixed(1)}đ)`)
          : "Chưa khảo sát"
        
        let compText = ""
        if (info?.componentScores && typeof info.componentScores === "object") {
          compText = Object.entries(info.componentScores).map(([k, v]) => `${k}: ${v}`).join("; ")
        }
        const remark = info?.remark || ""

        return [idx + 1, sub.name, score, bm, status, compText, remark]
      })

      const footerData = [
        [""],
        ["TỔNG KẾT & ĐÁNH GIÁ"],
        [`Điểm trung bình chung (ĐTB): ${gpa}`],
        [`Số môn đạt chuẩn: ${subjects.length - (st.belowBenchmarkCount || 0)} / ${subjects.length} môn`],
        [`Số môn dưới chuẩn: ${st.belowBenchmarkCount || 0} môn`],
        [`Xếp loại kết quả khảo sát: ${ranking}`],
        [""],
        [`Ý kiến nhận xét của GVCN: ${teacherName} ghi nhận sự nỗ lực học tập của học sinh trong kỳ khảo sát này.`],
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
        { wch: 6 },
        { wch: 22 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 30 },
        { wch: 45 }
      ]

      const sheetName = (st.studentName || "HocSinh").replace(/[/\\?*\[\]]/g, "_").slice(0, 28)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    })

    const fileName = exportAll
      ? `BaoCaoKhaoSat_Lop_${currentClass?.className || "Lop"}_${selectedPeriod}.xlsx`
      : `PhieuDiem_${currentStudent?.studentName?.replace(/\s+/g, "_")}_${currentClass?.className}_${selectedPeriod}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Render a single student's printable report card
  const renderStudentReportCard = (student: any) => {
    const gpa = student.gpa !== null && student.gpa !== undefined ? Number(student.gpa).toFixed(1) : "-"
    const overallRanking = getOverallRanking(student.gpa, student.belowBenchmarkCount || 0)
    const passedCount = subjects.length - (student.belowBenchmarkCount || 0)

    return (
      <div
        key={student.studentId}
        className="student-report-page bg-white p-6 sm:p-10 font-sans text-slate-900 mx-auto max-w-[820px] shadow-lg rounded-2xl border border-teal-100 print:border-0 print:shadow-none print:p-0 print:m-0 print:max-w-none"
      >
        {/* Top Header with School Info & National Crest/Motto */}
        <div className="flex items-start justify-between border-b-2 border-[#008c82] pb-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#003B3A] via-[#005B58] to-[#008c82] text-white flex items-center justify-center p-2.5 shadow-md shrink-0">
              <GraduationCap className="w-9 h-9 text-teal-200" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-[#005B58] tracking-tight uppercase">
                {schoolTitle}
              </div>
              <div className="text-[11px] font-bold text-teal-800">
                Cơ sở: {currentClass?.campus?.campusName || currentClass?.campus?.name || currentClass?.campusName || "Sky-Line System"}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                Ban Đảm bảo Chất lượng & Đào tạo Sky-Line
              </div>
            </div>
          </div>

          <div className="text-right hidden sm:block shrink-0">
            <div className="text-[11px] font-extrabold uppercase text-slate-800 tracking-wider">
              HỆ THỐNG GIÁO DỤC SKY-LINE
            </div>
            <div className="text-[10px] font-bold text-teal-700 italic">
              Nơi khởi đầu của những ước mơ
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Mã lớp: <span className="font-bold text-slate-800">{currentClass?.className}</span>
            </div>
          </div>
        </div>

        {/* Report Main Title */}
        <div className="text-center my-6 space-y-1">
          <h2 className="text-lg sm:text-2xl font-black text-[#003B3A] uppercase tracking-tight">
            {reportMainTitle}
          </h2>
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs sm:text-sm font-extrabold text-[#008c82]">
            <Calendar className="w-3.5 h-3.5 text-[#008c82]" />
            <span>{reportYearTitle}</span>
          </div>
        </div>

        {/* Student & Class Information Box */}
        <div className="bg-gradient-to-r from-teal-50/70 via-sky-50/50 to-teal-50/70 p-4 sm:p-5 rounded-2xl border border-teal-200/80 mb-6 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-teal-100 pb-1.5">
              <span className="text-slate-600 font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                Họ và tên học sinh:
              </span>
              <strong className="text-sm font-black text-[#003B3A]">{student.studentName}</strong>
            </div>

            <div className="flex items-center justify-between border-b border-teal-100 pb-1.5">
              <span className="text-slate-600 font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-teal-600" />
                Lớp chủ nhiệm:
              </span>
              <strong className="text-sm font-black text-teal-900">{currentClass?.className}</strong>
            </div>

            <div className="flex items-center justify-between border-b border-teal-100 pb-1.5">
              <span className="text-slate-600 font-bold">Mã số học sinh:</span>
              <span className="font-extrabold text-slate-800 tracking-wider">{student.studentCode}</span>
            </div>

            <div className="flex items-center justify-between border-b border-teal-100 pb-1.5">
              <span className="text-slate-600 font-bold">Giáo viên chủ nhiệm (GVCN):</span>
              <span className="font-extrabold text-slate-800">{teacherName}</span>
            </div>

            <div className="flex items-center justify-between border-b border-teal-100 pb-1.5 sm:border-b-0">
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

        {/* Section Heading: Chi tiết kết quả theo kỳ */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs sm:text-sm font-black text-[#003B3A] uppercase tracking-wide flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-600" />
            Chi tiết Kết Quả Các Môn Định Kỳ
          </h3>
          <span className="text-[11px] font-bold text-teal-800 italic">
            Tổng cộng: {subjects.length} môn học
          </span>
        </div>

        {/* BEAUTIFUL BLUE/TEAL TABLE */}
        <div className="overflow-x-auto rounded-xl border border-teal-600/30 shadow-xs mb-6 print:border-slate-300">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#005B58] to-[#008c82] text-white font-black print:bg-[#005B58]">
                <th className="py-2.5 px-2.5 text-center w-10 border-r border-teal-700">STT</th>
                <th className="py-2.5 px-3 min-w-[140px] border-r border-teal-700">Môn học</th>
                <th className="py-2.5 px-2.5 text-center w-24 border-r border-teal-700">Điểm KS</th>
                <th className="py-2.5 px-2.5 text-center w-24 border-r border-teal-700">Chuẩn môn</th>
                <th className="py-2.5 px-3 text-center min-w-[110px] border-r border-teal-700">Đánh giá kết quả</th>
                <th className="py-2.5 px-3 min-w-[130px] border-r border-teal-700">Điểm thành phần</th>
                <th className="py-2.5 px-3 min-w-[170px]">Nhận xét của Giáo viên Bộ môn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-100">
              {subjects.map((sub: any, idx: number) => {
                const info = student.subjectGrades?.[sub.id]
                const score = info?.score !== null && info?.score !== undefined ? Number(info.score) : null
                const benchmark = info?.benchmark || 6.0
                const evalResult = getScoreClassification(score, benchmark)

                // Component scores
                let compEntries: [string, any][] = []
                if (info?.componentScores && typeof info.componentScores === "object") {
                  compEntries = Object.entries(info.componentScores)
                }

                const isEven = idx % 2 === 0

                return (
                  <tr
                    key={sub.id}
                    className={`transition-colors ${isEven ? "bg-white" : "bg-teal-50/25"} hover:bg-teal-50/60`}
                  >
                    <td className="py-2.5 px-2.5 text-center font-bold text-slate-500 border-r border-teal-100">
                      {idx + 1}
                    </td>

                    <td className="py-2.5 px-3 font-extrabold text-[#003B3A] border-r border-teal-100">
                      <div>{sub.name}</div>
                      {sub.code && <div className="text-[10px] font-normal text-slate-400">{sub.code}</div>}
                    </td>

                    <td className="py-2.5 px-2.5 text-center font-black text-sm border-r border-teal-100">
                      {score !== null ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg border text-xs font-black shadow-2xs ${
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
                        <span className="text-slate-300 italic font-semibold">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-2.5 text-center font-extrabold text-teal-800 bg-teal-50/40 border-r border-teal-100">
                      {benchmark.toFixed(1)}đ
                    </td>

                    <td className="py-2.5 px-3 text-center border-r border-teal-100">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${evalResult.color}`}
                      >
                        {evalResult.text}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 border-r border-teal-100 text-[11px]">
                      {compEntries.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {compEntries.map(([k, v]) => (
                            <span
                              key={k}
                              className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold border border-slate-200"
                            >
                              <strong>{k}:</strong> {String(v)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-[11px] text-slate-700 leading-relaxed font-medium">
                      {info?.remark ? (
                        <div className="bg-slate-50/80 p-1.5 rounded-lg border border-slate-200/80 italic text-slate-800">
                          "{info.remark}"
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa có nhận xét</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Summary KPI Cards & Performance Evaluation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-teal-50/80 border border-teal-200 p-3 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-teal-800 uppercase">Điểm TB Chung (ĐTB)</div>
              <div className="text-lg font-black text-[#005B58]">
                {gpa} <span className="text-xs font-normal text-slate-500">/ 10</span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-800 uppercase">Môn Đạt Chuẩn</div>
              <div className="text-lg font-black text-emerald-800">
                {passedCount} / {subjects.length} <span className="text-xs font-semibold text-emerald-600">môn</span>
              </div>
            </div>
          </div>

          <div className="bg-sky-50/80 border border-sky-200 p-3 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black text-sm shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-sky-800 uppercase">Xếp Loại Khảo Sát</div>
              <div className="text-xs sm:text-sm font-black text-sky-950 truncate max-w-[170px]" title={overallRanking}>
                {overallRanking}
              </div>
            </div>
          </div>
        </div>

        {/* Teacher's General Remarks & Recommendations */}
        <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/20 mb-8 space-y-1.5">
          <div className="text-xs font-black text-[#005B58] uppercase flex items-center gap-1.5">
            <span>Ý kiến & Nhận xét Tổng Quát của Giáo viên Chủ nhiệm (GVCN):</span>
          </div>
          <div className="text-xs text-slate-700 leading-relaxed font-medium min-h-[48px] pt-1">
            {student.belowBenchmarkCount === 0 ? (
              <p>
                Học sinh <strong className="text-teal-900">{student.studentName}</strong> hoàn thành xuất sắc kỳ khảo sát với 100% môn học đạt chuẩn chất lượng. Đề nghị tiếp tục duy trì phương pháp học tập tích cực, phát huy năng lực tư duy sáng tạo trong các giai đoạn học tập tiếp theo.
              </p>
            ) : (
              <p>
                Học sinh <strong className="text-teal-900">{student.studentName}</strong> cần tập trung củng cố kiến thức các môn còn dưới chuẩn, phối hợp chặt chẽ với Giáo viên Bộ môn và tham gia đầy đủ các buổi phụ đạo, bồi dưỡng định hướng của Nhà trường để nâng cao chất lượng học tập.
              </p>
            )}
          </div>
        </div>

        {/* Signature Section (3 Columns) */}
        <div className="pt-2 text-xs">
          <div className="text-right text-slate-600 italic mb-4">
            Đà Nẵng, ngày ...... tháng ...... năm 20......
          </div>

          <div className="grid grid-cols-3 text-center gap-4">
            <div className="space-y-1">
              <div className="font-extrabold text-slate-800 uppercase text-[11px]">
                Phụ Huynh Học Sinh
              </div>
              <div className="text-[10px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
              <div className="h-16"></div>
            </div>

            <div className="space-y-1">
              <div className="font-extrabold text-slate-800 uppercase text-[11px]">
                Giáo Viên Chủ Nhiệm
              </div>
              <div className="text-[10px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
              <div className="h-16 flex items-end justify-center">
                <span className="font-black text-slate-900 text-xs">{teacherName}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-extrabold text-slate-800 uppercase text-[11px]">
                Ban Giám Hiệu
              </div>
              <div className="text-[10px] text-slate-500 italic">(Ký và đóng dấu)</div>
              <div className="h-16"></div>
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
      {/* Print Specific Stylesheet for Clean A4 Output */}
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
            padding: 8mm 12mm !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 100vh !important;
            page-break-after: always !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `
        }}
      />

      {/* Modal Container */}
      <div
        className="bg-slate-100 rounded-3xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-slate-300 animate-scaleUp my-auto"
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
              title="In phiếu điểm cho học sinh hiện tại"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Phiếu Điểm (PDF)</span>
            </button>

            {/* Print Entire Class */}
            <button
              onClick={() => handlePrint("all")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="In phiếu điểm toàn bộ học sinh trong lớp (mỗi học sinh 1 trang A4)"
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
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 space-y-6 print:p-0 print:m-0 print:overflow-visible">
          {printMode === "all" ? (
            <div className="space-y-6 print:space-y-0">
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
