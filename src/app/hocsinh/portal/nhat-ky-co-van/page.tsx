"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  BookOpen, Calendar, User, Clock, AlertCircle, CheckCircle2,
  Sparkles, ArrowRight, MessageSquare, ShieldCheck, RefreshCw, ChevronRight, HelpCircle,
  Table, LayoutGrid, Edit3, Save, X, Feather
} from "lucide-react"

export default function StudentConsultationDiaryPage() {
  const [studentId, setStudentId] = useState("")
  const [studentName, setStudentName] = useState("")
  const [studentCode, setStudentCode] = useState("")
  const [className, setClassName] = useState("")
  const [consultations, setConsultations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"table" | "cards">("table")

  // Modal Student Self-Reflection State
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [reflectionText, setReflectionText] = useState("")
  const [savingReflection, setSavingReflection] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  useEffect(() => {
    fetch("/api/hocsinh/me", { cache: "no-store" })
      .then(r => {
        if (!r.ok) {
          window.location.href = "/login"
          return null
        }
        return r.json()
      })
      .then(data => {
        if (data && data.studentCode) {
          const sId = data.id || data.studentId
          setStudentId(sId)
          setStudentName(data.studentName || "Học sinh")
          setStudentCode(data.studentCode || "")
          setClassName(data.className || "")
          localStorage.setItem("currentStudent", JSON.stringify(data))
          loadConsultationLogs(sId, data.studentCode)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function loadConsultationLogs(sId: string, sCode: string) {
    if (!sId && !sCode) return
    try {
      setLoading(true)
      const res = await fetch(`/api/advisory/consultations?studentId=${sId}&studentCode=${sCode}&_t=${Date.now()}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setConsultations(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenReflectionModal(log: any) {
    setSelectedLog(log)
    setReflectionText(log.studentReflection || "")
  }

  async function handleSaveReflection() {
    if (!selectedLog) return
    try {
      setSavingReflection(true)
      const res = await fetch("/api/advisory/consultations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedLog.id,
          studentReflection: reflectionText
        })
      })

      if (res.ok) {
        setToastMessage("Đã cập nhật tự đánh giá thành công! Kết quả đã tự động đồng bộ sang Nhật ký GVCN.")
        setTimeout(() => setToastMessage(""), 4000)
        setSelectedLog(null)
        loadConsultationLogs(studentId, studentCode)
      } else {
        alert("Cập nhật không thành công, vui lòng thử lại.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingReflection(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-slate-800 pb-20">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-black bg-white/15 text-teal-200 border border-white/20 uppercase tracking-widest backdrop-blur-md">
              <BookOpen className="w-3.5 h-3.5 text-amber-300" />
              <span>SỔ NHẬT KÝ THAM VẤN CỐ VẤN HỌC TẬP</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Nhật Ký Cố Vấn & Tự Đánh Giá Sau Buổi Gặp
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 font-medium max-w-2xl leading-relaxed">
              Theo dõi 6 nội dung từ GVCN và <strong>thực hiện Tự Đánh Giá Sau Buổi Cố Vấn</strong>. Kết quả tự đánh giá sẽ tự động cập nhật vào Nhật Ký Tham Vấn của Giáo viên Chủ nhiệm!
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-black text-xl shadow-md">
              💬
            </div>
            <div>
              <span className="text-[10px] text-teal-200 font-bold uppercase block">Tổng số buổi làm việc</span>
              <span className="text-xl font-black text-white">{consultations.length} Buổi tham vấn</span>
            </div>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-black flex items-center gap-3 animate-bounce shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="p-3 rounded-xl bg-teal-100 text-teal-800 font-black">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Học sinh thụ hưởng</span>
            <h4 className="text-xs font-black text-slate-900">{studentName || "N/A"}</h4>
            {studentCode && <span className="text-[11px] text-teal-700 font-bold">Mã HS: {studentCode}</span>}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="p-3 rounded-xl bg-amber-100 text-amber-800 font-black">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Mốc gặp gần nhất</span>
            <h4 className="text-xs font-black text-slate-900">
              {consultations.length > 0 && consultations[0].meetingDate
                ? new Date(consultations[0].meetingDate).toLocaleDateString("vi-VN")
                : "Chưa có buổi tham vấn"}
            </h4>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="p-3 rounded-xl bg-blue-100 text-blue-800 font-black">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Đồng bộ tự động</span>
            <h4 className="text-xs font-black text-slate-900">Sổ quan sát GVCN Lớp {className}</h4>
            <span className="text-[10px] text-teal-700 font-bold">Kết nối 2 chiều GV - Học sinh</span>
          </div>
        </div>
      </div>

      {/* Main List Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-[#003B3A] uppercase flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              <span>Bảng Nhật Ký Tham Vấn Chi Tiết & Tự Đánh Giá</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Học sinh có thể xem nội dung làm việc và viết <strong>Tự đánh giá sau buổi cố vấn</strong> để tự phản chiếu tiến độ.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                  viewMode === "table" ? "bg-[#003B3A] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Dạng Bảng</span>
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                  viewMode === "cards" ? "bg-[#003B3A] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Dạng Thẻ</span>
              </button>
            </div>

            <button
              onClick={() => loadConsultationLogs(studentId, studentCode)}
              className="p-2 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 transition-all"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-teal-800 font-extrabold animate-pulse space-y-2">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Đang tải dữ liệu nhật ký tham vấn cố vấn...</p>
          </div>
        ) : consultations.length === 0 ? (
          <div className="py-16 text-center space-y-3 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mx-auto text-2xl font-bold">
              📖
            </div>
            <h4 className="text-sm font-black text-slate-800">Chưa có nhật ký tham vấn nào được ghi nhận</h4>
            <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
              Hiện tại Thầy/Cô GVCN chưa lưu nhật ký tham vấn trực tiếp nào cho em. Khi có buổi gặp cố vấn, thông tin làm việc sẽ tự động hiển thị đầy đủ tại đây.
            </p>
          </div>
        ) : viewMode === "table" ? (
          
          /* 1. TABLE VIEW */
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                  <th className="p-3.5 border-r border-slate-200 w-12 text-center">STT</th>
                  <th className="p-3.5 border-r border-slate-200 w-32">1. Ngày gặp</th>
                  <th className="p-3.5 border-r border-slate-200 min-w-[180px]">2. Nội dung trao đổi</th>
                  <th className="p-3.5 border-r border-slate-200 min-w-[160px]">3. Khó khăn ghi nhận</th>
                  <th className="p-3.5 border-r border-slate-200 min-w-[180px]">4. Hành động tiếp theo</th>
                  <th className="p-3.5 border-r border-slate-200 w-28">5. Thời hạn</th>
                  <th className="p-3.5 border-r border-slate-200 min-w-[140px]">6. Ghi chú</th>
                  <th className="p-3.5 min-w-[200px] bg-amber-50/60 text-amber-950">7. Tự đánh giá sau buổi cố vấn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                {consultations.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 border-r border-slate-200 text-center font-black text-slate-500 align-top">
                      #{consultations.length - idx}
                    </td>
                    
                    {/* 1. Ngày gặp */}
                    <td className="p-3.5 border-r border-slate-200 font-black text-slate-900 align-top bg-slate-50/50">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{item.meetingDate ? new Date(item.meetingDate).toLocaleDateString("vi-VN") : "—"}</span>
                      </div>
                      <span className="text-[10px] text-teal-800 font-bold block mt-1">
                        GV: {item.evaluatorName || item.teacher?.teacherName || "GVCN"}
                      </span>
                    </td>

                    {/* 2. Nội dung trao đổi */}
                    <td className="p-3.5 border-r border-slate-200 align-top">
                      <div className="p-2.5 rounded-xl bg-teal-50/60 border border-teal-200/70 text-teal-950 font-bold leading-relaxed whitespace-pre-line">
                        {item.content || "Chưa ghi nhận nội dung"}
                      </div>
                    </td>

                    {/* 3. Khó khăn ghi nhận */}
                    <td className="p-3.5 border-r border-slate-200 align-top">
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-950 font-bold leading-relaxed whitespace-pre-line">
                        {item.difficulties || "Không có khó khăn phát sinh"}
                      </div>
                    </td>

                    {/* 4. Hành động tiếp theo */}
                    <td className="p-3.5 border-r border-slate-200 align-top">
                      <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 font-bold leading-relaxed whitespace-pre-line">
                        {item.nextActions || "Tiếp tục kế hoạch hiện tại"}
                      </div>
                    </td>

                    {/* 5. Thời hạn */}
                    <td className="p-3.5 border-r border-slate-200 align-top">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-[11px] font-black border border-rose-200 block text-center">
                        {item.deadline ? new Date(item.deadline).toLocaleDateString("vi-VN") : "Theo tiến độ"}
                      </span>
                    </td>

                    {/* 6. Ghi chú */}
                    <td className="p-3.5 border-r border-slate-200 align-top italic text-slate-700">
                      {item.notes ? '"' + item.notes + '"' : <span className="text-slate-400 font-normal">- Chưa có ghi chú</span>}
                    </td>

                    {/* 7. Tự đánh giá của Học sinh sau tham vấn */}
                    <td className="p-3.5 align-top space-y-2 bg-amber-50/20">
                      {item.studentReflection ? (
                        <div className="p-2.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-950 font-bold leading-relaxed space-y-1.5 shadow-2xs">
                          <span className="text-[10px] font-black text-emerald-900 uppercase block">💬 Đã tự đánh giá:</span>
                          <p className="text-xs font-bold">"{item.studentReflection}"</p>
                          <button
                            onClick={() => handleOpenReflectionModal(item)}
                            className="text-[10px] text-teal-800 hover:underline font-black flex items-center gap-1 pt-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Chỉnh sửa tự đánh giá</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenReflectionModal(item)}
                          className="w-full p-2.5 rounded-xl bg-amber-400 text-slate-950 font-black hover:bg-amber-500 transition-all text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <Feather className="w-4 h-4" />
                          <span>+ Tự Đánh Giá Sau Cố Vấn</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (

          /* 2. CARDS VIEW */
          <div className="space-y-6">
            {consultations.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-white rounded-3xl border-2 border-slate-200 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#003B3A] text-white text-xs font-black flex items-center justify-center shrink-0">
                      #{consultations.length - idx}
                    </span>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">1. NGÀY GẶP CỐ VẤN</span>
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        <span>{item.meetingDate ? new Date(item.meetingDate).toLocaleDateString("vi-VN") : "Chưa có ngày"}</span>
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-900 border border-teal-200 text-xs font-black flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-teal-600" />
                      <span>{item.evaluatorName || item.teacher?.teacherName || "Giáo Viên Chủ Nhiệm"}</span>
                    </span>
                  </div>
                </div>

                {/* 6 Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 2. Nội dung trao đổi */}
                  <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/70 space-y-1.5">
                    <span className="text-[10px] font-black text-teal-950 uppercase tracking-wider block">💬 2. NỘI DUNG TRAO ĐỔI:</span>
                    <p className="text-xs font-bold text-teal-950 leading-relaxed whitespace-pre-line">{item.content || "Chưa ghi nhận nội dung"}</p>
                  </div>

                  {/* 3. Khó khăn ghi nhận */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                    <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider block">⚠️ 3. KHÓ KHĂN GHI NHẬN:</span>
                    <p className="text-xs font-bold text-amber-950 leading-relaxed whitespace-pre-line">{item.difficulties || "Không có khó khăn phát sinh"}</p>
                  </div>

                  {/* 4. Hành động tiếp theo */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                    <span className="text-[10px] font-black text-emerald-950 uppercase tracking-wider block">🚀 4. HÀNH ĐỘNG TIẾP THEO:</span>
                    <p className="text-xs font-bold text-emerald-950 leading-relaxed whitespace-pre-line">{item.nextActions || "Tiếp tục duy trì kế hoạch"}</p>
                  </div>

                  {/* 5. Thời hạn & 6. Ghi chú */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">⏱️ 5. THỜI HẠN HOÀN THÀNH:</span>
                      <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-black border border-rose-200">
                        {item.deadline ? new Date(item.deadline).toLocaleDateString("vi-VN") : "Theo tiến độ"}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 text-xs text-slate-700 font-semibold italic">
                      📝 6. GHI CHÚ TỪ GVCN: {item.notes ? '"' + item.notes + '"' : <span className="text-slate-400 font-normal">- Chưa có ghi chú</span>}
                    </div>
                  </div>
                </div>

                {/* 7. Student Self Reflection Card */}
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Feather className="w-4 h-4 text-amber-600" />
                      <span>7. TỰ ĐÁNH GIÁ CỦA HỌC SINH SAU BUỔI CỐ VẤN:</span>
                    </span>

                    <button
                      onClick={() => handleOpenReflectionModal(item)}
                      className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 text-xs font-black hover:bg-amber-500 transition-all shadow-2xs flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{item.studentReflection ? "Chỉnh Sửa Đánh Giá" : "+ Tự Đánh Giá Sau Cố Vấn"}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs font-bold text-amber-950 leading-relaxed">
                    {item.studentReflection ? (
                      <p>"{item.studentReflection}"</p>
                    ) : (
                      <p className="text-slate-400 font-medium italic">
                        Em chưa tự đánh giá sau buổi gặp này. Hãy nhấn nút "+ Tự Đánh Giá Sau Cố Vấn" để phản chiếu tiến độ thực hiện nhé!
                      </p>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL THỰC HIỆN TỰ ĐÁNH GIÁ SAU BUỔI CỐ VẤN */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 font-black">
                  <Feather className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Tự Đánh Giá Sau Buổi Cố Vấn ({selectedLog.meetingDate ? new Date(selectedLog.meetingDate).toLocaleDateString("vi-VN") : ""})
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Kết quả sẽ tự động đồng bộ sang Sổ quan sát của Thầy/Cô GVCN</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Context */}
            <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200 text-xs font-semibold text-teal-950 space-y-1">
              <span className="text-[10px] font-black text-teal-800 uppercase block">🚀 Hành động GVCN giao:</span>
              <p className="font-bold">"{selectedLog.nextActions || "Tiếp tục duy trì kế hoạch học tập hiện tại"}"</p>
            </div>

            {/* Reflection Textarea */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                Nội dung em tự đánh giá / Kết quả tự rèn luyện (*):
              </label>
              <textarea
                rows={4}
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="Ví dụ: Em đã hoàn thành 80% thời gian biểu buổi tối, tự tin hơn trong các bài kiểm tra môn Toán và chủ động trao đổi với bạn..."
                className="w-full p-3 rounded-2xl border border-slate-300 text-xs font-semibold focus:border-amber-500 focus:ring-1 focus:ring-amber-300 bg-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-extrabold text-xs hover:bg-slate-50 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveReflection}
                disabled={savingReflection || !reflectionText.trim()}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingReflection ? "Đang lưu tự đánh giá..." : "Lưu & Đồng Bộ Sang GVCN"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
