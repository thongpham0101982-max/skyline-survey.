"use client"

import React, { useState } from "react"
import {
  X, Printer, Download, FileSpreadsheet,
  CheckCircle2, Clock, Brain, GraduationCap,
  Sparkles, Loader2, HeartHandshake, ShieldCheck
} from "lucide-react"
import toast from "react-hot-toast"
import { exportTeacherProgressReportExcel } from "@/lib/support/exportTrackingBookExcel"

interface TeacherProgressPdfModalProps {
  isOpen: boolean
  onClose: () => void
  targets: any[]
  teacherStats: any[]
  selectedTeacherId?: string
  academicYearName?: string
  supportType?: "PSYCHOLOGICAL" | "ACADEMIC"
}

export function TeacherProgressPdfModal({
  isOpen,
  onClose,
  targets = [],
  teacherStats = [],
  selectedTeacherId = "ALL",
  academicYearName = "2026-2027",
  supportType = "PSYCHOLOGICAL"
}: TeacherProgressPdfModalProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape")

  if (!isOpen) return null

  const isAll = selectedTeacherId === "ALL"
  const currentTeacher = !isAll ? teacherStats.find(t => t.teacherId === selectedTeacherId) : null
  const teacherNameDisplay = currentTeacher ? currentTeacher.teacherName : "Tất cả Giáo viên / Chuyên viên"

  // Helper tìm GV của target
  const getTargetTeacherNames = (t: any): string => {
    if (t.assignments && Array.isArray(t.assignments) && t.assignments.length > 0) {
      const names = t.assignments
        .filter((a: any) => a.teacher)
        .map((a: any) => a.teacher.teacherName || a.teacherName || "")
        .filter(Boolean)
      if (names.length > 0) return names.join(", ")
    }
    if (t.createdBy?.teacherName) return t.createdBy.teacherName
    return "Chưa phân công"
  }

  // Danh sách học sinh theo phạm vi được chọn
  const displayTargets = isAll
    ? targets
    : targets.filter(t => {
        if (selectedTeacherId === "UNASSIGNED") {
          return !t.assignments || t.assignments.length === 0
        }
        return (t.assignments || []).some((a: any) => a.teacher?.id === selectedTeacherId || a.teacher?.teacherName === currentTeacher?.teacherName)
      })

  // Thống kê số liệu
  const totalStudents = displayTargets.length
  const totalActive = displayTargets.filter(t => t.terminationStatus === "ACTIVE").length
  const totalPending = displayTargets.filter(t => t.terminationStatus === "PENDING_TERMINATION").length
  const totalTerminated = displayTargets.filter(t => t.terminationStatus === "TERMINATED").length
  const termRate = totalStudents > 0 ? Math.round((totalTerminated / totalStudents) * 100) : 0
  const totalCommitment = displayTargets.filter(t => 
    t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết Khảo sát đầu vào")) || t.sourceType === "ASSESSMENT"
  ).length
  const totalEvaluations = displayTargets.reduce((acc, t) => acc + (t.evaluations?.length || 0), 0)

  // Danh sách giáo viên liên quan
  const relevantTeachers = isAll
    ? teacherStats
    : teacherStats.filter(t => t.teacherId === selectedTeacherId)

  // Xử lý tải PDF
  const handleDownloadPdf = async () => {
    const element = document.getElementById("teacher-progress-report-pdf")
    if (!element) {
      window.print()
      return
    }

    setIsDownloading(true)
    const toastId = toast.loading("Đang khởi tạo bản in PDF chuẩn...")

    try {
      const html2pdf = (await import("html2pdf.js")).default
      const safeTeacher = teacherNameDisplay.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, "_").slice(0, 30)
      const safeYear = academicYearName.replace(/[^a-zA-Z0-9_-]/g, "_")
      const filename = `Bao_Cao_Tien_Do_${supportType === "PSYCHOLOGICAL" ? "Tam_Ly" : "Hoc_Tap"}_${safeTeacher}_${safeYear}.pdf`

      const opt: any = {
        margin: [6, 8, 6, 8],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation }
      }

      await html2pdf().set(opt).from(element).save()
      toast.success(`Đã xuất thành công tệp PDF: ${filename}`, { id: toastId, duration: 4000 })
    } catch (err) {
      console.error("html2pdf error, fallback to window.print:", err)
      toast.dismiss(toastId)
      window.print()
    } finally {
      setIsDownloading(false)
    }
  }

  // Xử lý xuất Excel dự phòng
  const handleExportExcel = () => {
    try {
      const fileName = exportTeacherProgressReportExcel(targets, {
        teacherId: selectedTeacherId,
        teacherName: currentTeacher?.teacherName,
        academicYearName,
        selectedMonth: "Tháng 9",
        supportType
      })
      toast.success(`Đã xuất file Excel: ${fileName}`)
    } catch (e: any) {
      toast.error(e?.message || "Lỗi xuất file Excel")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #teacher-progress-report-pdf, #teacher-progress-report-pdf * {
            visibility: visible;
          }
          #teacher-progress-report-pdf {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 8mm;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 ${orientation};
            margin: 6mm;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* MODAL CONTROL HEADER (NO-PRINT) */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#135E5B] text-white flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
              <FileSpreadsheet className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h2 className="text-base font-black flex items-center gap-2">
                Bản In & Xuất Báo Cáo PDF Theo Dõi Tiến Độ
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30 text-xs font-bold">
                  {teacherNameDisplay}
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Xem trước văn bản A4 chính thức, chuẩn bị tải tệp PDF hoặc gửi lệnh in trực tiếp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bộ chọn khổ giấy */}
            <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10 text-xs font-bold text-slate-200">
              <button
                type="button"
                onClick={() => setOrientation("landscape")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  orientation === "landscape" ? "bg-white text-slate-900 shadow-xs font-black" : "hover:text-white"
                }`}
                title="Khổ giấy ngang (thích hợp cho bảng nhiều cột)"
              >
                Khổ Ngang (A4)
              </button>
              <button
                type="button"
                onClick={() => setOrientation("portrait")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  orientation === "portrait" ? "bg-white text-slate-900 shadow-xs font-black" : "hover:text-white"
                }`}
                title="Khổ giấy dọc"
              >
                Khổ Dọc (A4)
              </button>
            </div>

            {/* Nút Tải file PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="Tải ngay file PDF về máy tính"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Đang tạo PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Tải File PDF</span>
                </>
              )}
            </button>

            {/* Nút In ấn / Print to PDF */}
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
              title="Mở hộp thoại In hoặc Lưu dưới dạng PDF của trình duyệt"
            >
              <Printer className="w-4 h-4 text-teal-200" />
              <span>In / Lưu PDF</span>
            </button>

            {/* Nút Xuất Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Xuất sang file Excel .xlsx"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Xuất Excel</span>
            </button>

            {/* Nút Đóng */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all ml-1 cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY: DOCUMENT PREVIEW */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/60 flex justify-center">
          
          {/* A4 PRINT CONTAINER */}
          <div
            id="teacher-progress-report-pdf"
            className="bg-white text-slate-900 p-8 sm:p-10 shadow-lg rounded-2xl border border-slate-200 w-full max-w-5xl"
            style={{ minHeight: "297mm", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
          >
            {/* 1. DOCUMENT HEADER */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6 gap-6">
              <div className="space-y-0.5">
                <div className="text-[12px] font-black tracking-widest text-[#135E5B] uppercase">
                  HỆ THỐNG GIÁO DỤC SKY-LINE
                </div>
                <div className="text-[11px] font-extrabold text-slate-800 uppercase">
                  PHÒNG KIỂM TRA & ĐẢM BẢO CHẤT LƯỢNG (KT-ĐBCL)
                </div>
                <div className="text-[10px] text-slate-500 font-semibold">
                  TỔ TÂM LÝ HỌC ĐƯỜNG & HỖ TRỢ HỌC SINH
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="text-[10px] font-bold text-slate-700 italic">
                  Độc lập - Tự do - Hạnh phúc
                </div>
                <div className="text-[9px] text-slate-400 mt-1">
                  Đà Nẵng, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                </div>
              </div>
            </div>

            {/* 2. DOCUMENT TITLE */}
            <div className="text-center my-6">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                {supportType === "PSYCHOLOGICAL"
                  ? "BÁO CÁO TIẾN ĐỘ HỖ TRỢ TÂM LÝ HỌC ĐƯỜNG"
                  : "BÁO CÁO THEO DÕI TIẾN ĐỘ BỒI DƯỠNG HỌC TẬP"}
              </h1>
              <div className="text-sm font-black text-[#135E5B] uppercase mt-1 tracking-wider">
                {isAll ? "THEO DÕI TOÀN DIỆN PHÂN THEO TỪNG GIÁO VIÊN / CHUYÊN VIÊN PHỤ TRÁCH" : `CHUYÊN VIÊN / GIÁO VIÊN: ${currentTeacher?.teacherName}`}
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Năm học: <span className="font-extrabold text-slate-800">{academicYearName}</span> | Kỳ đánh giá: <span className="font-extrabold text-slate-800">Tháng 9</span> | Cơ sở: <span className="font-extrabold text-slate-800">{currentTeacher?.campusList || "Toàn hệ thống Sky-Line"}</span>
              </p>
            </div>

            {/* 3. TỔNG QUAN CHỈ SỐ KPI (SUMMARY CARDS) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-center p-2 rounded-xl bg-white border border-slate-100 shadow-xxs">
                <div className="text-xs text-slate-500 font-bold uppercase">Tổng số học sinh</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{totalStudents}</div>
                <div className="text-[10px] text-slate-400 font-medium">100% đối tượng</div>
              </div>

              <div className="text-center p-2 rounded-xl bg-white border border-amber-100 shadow-xxs">
                <div className="text-xs text-amber-800 font-bold uppercase">Diện Cam kết (CKĐV)</div>
                <div className="text-xl font-black text-amber-700 mt-0.5">{totalCommitment}</div>
                <div className="text-[10px] text-amber-600 font-medium">{Math.round((totalCommitment / (totalStudents || 1)) * 100)}% tổng số</div>
              </div>

              <div className="text-center p-2 rounded-xl bg-white border border-amber-100 shadow-xxs">
                <div className="text-xs text-[#92400E] font-bold uppercase">Đang theo dõi</div>
                <div className="text-xl font-black text-[#D49A3D] mt-0.5">{totalActive}</div>
                <div className="text-[10px] text-slate-400 font-medium">Tích cực can thiệp</div>
              </div>

              <div className="text-center p-2 rounded-xl bg-white border border-teal-100 shadow-xxs">
                <div className="text-xs text-[#135E5B] font-bold uppercase">Đã chấm dứt</div>
                <div className="text-xl font-black text-[#135E5B] mt-0.5">{totalTerminated}</div>
                <div className="text-[10px] text-teal-700 font-bold">{termRate}% hoàn thành</div>
              </div>

              <div className="text-center p-2 rounded-xl bg-white border border-indigo-100 shadow-xxs col-span-2 sm:col-span-1">
                <div className="text-xs text-indigo-800 font-bold uppercase">Tổng lượt đánh giá</div>
                <div className="text-xl font-black text-indigo-700 mt-0.5">{totalEvaluations}</div>
                <div className="text-[10px] text-indigo-500 font-medium">{totalStudents > 0 ? (totalEvaluations / totalStudents).toFixed(1) : 0} lượt/HS</div>
              </div>
            </div>

            {/* 4. PHẦN I: BẢNG TỔNG HỢP TIẾN ĐỘ THEO TỪNG GIÁO VIÊN */}
            <div className="mb-6">
              <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-2 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <GraduationCap className="w-4 h-4 text-[#135E5B]" />
                I. Bảng Thống kê Tiến độ Theo Từng Giáo viên / Chuyên viên Phụ trách
              </h2>
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase">
                    <th className="border border-slate-300 px-2 py-1.5 text-center w-8">STT</th>
                    <th className="border border-slate-300 px-2 py-1.5">Giáo viên / Chuyên viên</th>
                    <th className="border border-slate-300 px-2 py-1.5">Cơ sở</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center">Tổng ca</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center">Cam kết</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center">Đang theo dõi</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center">Đã kết thúc</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center">Tỷ lệ xong</th>
                    <th className="border border-slate-300 px-2 py-1.5">Đánh giá tiến độ chung</th>
                  </tr>
                </thead>
                <tbody>
                  {relevantTeachers.map((tch, idx) => {
                    const tTermRate = tch.count > 0 ? Math.round((tch.terminated / tch.count) * 100) : 0
                    return (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        <td className="border border-slate-300 px-2 py-1 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-300 px-2 py-1 font-bold text-slate-900">{tch.teacherName}</td>
                        <td className="border border-slate-300 px-2 py-1 text-slate-600">{tch.campusList || "Sky-Line"}</td>
                        <td className="border border-slate-300 px-2 py-1 text-center font-black">{tch.count}</td>
                        <td className="border border-slate-300 px-2 py-1 text-center font-bold text-amber-700">
                          {displayTargets.filter(t => (t.assignments || []).some((a: any) => a.teacher?.id === tch.teacherId) && (t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết")))).length}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-center font-bold text-[#92400E]">{tch.active}</td>
                        <td className="border border-slate-300 px-2 py-1 text-center font-black text-[#135E5B]">{tch.terminated}</td>
                        <td className="border border-slate-300 px-2 py-1 text-center font-extrabold text-[#135E5B]">{tTermRate}%</td>
                        <td className="border border-slate-300 px-2 py-1 text-slate-700">
                          {tch.terminated > 0 ? `Đã hoàn thành ${tch.terminated} ca, tiếp tục can thiệp` : "Đang tích cực theo dõi can thiệp"}
                        </td>
                      </tr>
                    )
                  })}
                  {isAll && (
                    <tr className="bg-slate-100/90 font-black text-slate-900">
                      <td colSpan={3} className="border border-slate-300 px-2 py-1.5 text-center uppercase tracking-wider">
                        TỔNG CỘNG TOÀN HỆ THỐNG
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-black">{totalStudents}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-amber-800">{totalCommitment}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-[#92400E]">{totalActive}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-[#135E5B]">{totalTerminated}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-[#135E5B]">{termRate}%</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-slate-700">Hoàn thành tốt kế hoạch đề ra</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 5. PHẦN II: DANH SÁCH HỌC SINH CHI TIẾT */}
            <div className="mb-8">
              <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-2 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <HeartHandshake className="w-4 h-4 text-violet-600" />
                II. Danh Sách Học Sinh Cần Can Thiệp & Mức Độ Đánh Giá Tiến Độ Gần Nhất
              </h2>
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase">
                    <th className="border border-slate-300 px-2 py-1.5 text-center w-8">STT</th>
                    <th className="border border-slate-300 px-2 py-1.5">Học sinh & Mã HS</th>
                    <th className="border border-slate-300 px-2 py-1.5">Lớp / Cơ sở</th>
                    <th className="border border-slate-300 px-2 py-1.5">GV / Chuyên viên</th>
                    <th className="border border-slate-300 px-2 py-1.5">Diện can thiệp</th>
                    <th className="border border-slate-300 px-2 py-1.5">Mốc thời gian</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center">Trạng thái</th>
                    <th className="border border-slate-300 px-2 py-1.5">Tiến độ & Nhận xét gần nhất</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTargets.slice(0, 100).map((t, idx) => {
                    const sName = t.student?.studentName || "Không rõ"
                    const sCode = t.student?.studentCode || "—"
                    const className = (t.student?.class?.className || "").split(/[_-]/)[0]
                    const campusName = t.student?.class?.campus?.campusName || "Sky-Line"
                    const teacherDisplay = getTargetTeacherNames(t)
                    const isTerm = t.terminationStatus === "TERMINATED"
                    const isCommitment = t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết Khảo sát đầu vào")) || t.sourceType === "ASSESSMENT"
                    const startDate = t.startDate ? new Date(t.startDate).toLocaleDateString("vi-VN") : "—"
                    const endDateObj = isTerm && t.endDate ? new Date(t.endDate) : (isTerm && t.updatedAt ? new Date(t.updatedAt) : null)
                    const endDate = endDateObj ? endDateObj.toLocaleDateString("vi-VN") : null

                    const evals = t.evaluations || []
                    const sortedEvals = [...evals].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    const latestEval = sortedEvals[0]
                    const latestLevel = latestEval ? latestEval.trackingLevel : (isTerm ? "Đã đạt mục tiêu" : "Đang theo dõi")
                    const latestComment = latestEval ? latestEval.comment : (t.reason || t.notes || "—")

                    return (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        <td className="border border-slate-300 px-2 py-1 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="border border-slate-300 px-2 py-1 font-bold text-slate-900">
                          {sName} <span className="font-normal text-slate-400">({sCode})</span>
                        </td>
                        <td className="border border-slate-300 px-2 py-1">
                          Lớp {className} - <span className="text-[#135E5B] font-semibold">{campusName}</span>
                        </td>
                        <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-800">
                          {teacherDisplay}
                        </td>
                        <td className="border border-slate-300 px-2 py-1">
                          {isCommitment ? (
                            <span className="font-bold text-amber-700">⭐️ Cam kết đầu vào</span>
                          ) : (
                            <span className="text-slate-600">Thường kỳ</span>
                          )}
                        </td>
                        <td className="border border-slate-300 px-2 py-1">
                          <div>BĐ: {startDate}</div>
                          {endDate && <div className="text-[#135E5B] font-bold">KT: {endDate}</div>}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-center">
                          {isTerm ? (
                            <span className="font-black text-[#135E5B] uppercase text-[9px]">Đã chấm dứt</span>
                          ) : t.terminationStatus === "PENDING_TERMINATION" ? (
                            <span className="font-black text-amber-700 uppercase text-[9px]">Chờ duyệt</span>
                          ) : (
                            <span className="font-black text-[#92400E] uppercase text-[9px]">Đang theo dõi</span>
                          )}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-slate-700">
                          <span className="font-bold text-indigo-900">[{latestLevel}]</span> {latestComment}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {displayTargets.length > 100 && (
                <div className="text-[10px] text-slate-400 italic text-right mt-1">
                  * Đã hiển thị 100 học sinh đầu tiên trong bản in tóm tắt. Tải file Excel để xem toàn bộ chi tiết.
                </div>
              )}
            </div>

            {/* 6. PHẦN KÝ TÊN VÀ PHÊ DUYỆT (SIGNATURES) */}
            <div className="grid grid-cols-3 gap-4 text-center mt-12 pt-6 border-t border-slate-300 text-xs page-break-inside-avoid">
              <div className="space-y-16">
                <div>
                  <div className="font-bold uppercase text-slate-800">Người Lập Báo Cáo</div>
                  <div className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</div>
                </div>
                <div className="font-extrabold text-slate-900">
                  {currentTeacher?.teacherName || "Bộ phận KT-ĐBCL"}
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <div className="font-bold uppercase text-slate-800">Tổ Trưởng Chuyên Môn</div>
                  <div className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</div>
                </div>
                <div className="font-extrabold text-slate-900">
                  Tổ Tâm lý Học đường
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <div className="font-bold uppercase text-slate-800">Ban Giám Hiệu Phê Duyệt</div>
                  <div className="text-[10px] text-slate-400 italic">(Ký tên, đóng dấu)</div>
                </div>
                <div className="font-extrabold text-[#135E5B] uppercase">
                  Hệ Thống Sky-Line
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
