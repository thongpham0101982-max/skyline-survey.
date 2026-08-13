"use client"

import { useState, useEffect } from "react"
import { Heart, Send, CheckCircle2, Clock, AlertCircle, MessageSquare, Sparkles, X, Plus, ShieldCheck, ArrowRight } from "lucide-react"

export default function StudentHelpPortalPage() {
  const [studentId, setStudentId] = useState("")
  const [studentName, setStudentName] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal create state
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    category: "HOC_TAP",
    urgency: "MEDIUM",
    content: ""
  })
  const [toastMessage, setToastMessage] = useState("")

  useEffect(() => {
    // Attempt to load student info from localStorage or session
    if (typeof window !== "undefined") {
      const storedStudent = localStorage.getItem("currentStudent")
      const storedYear = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(storedYear)

      if (storedStudent) {
        try {
          const parsed = JSON.parse(storedStudent)
          setStudentId(parsed.id || parsed.studentId || "")
          setStudentName(parsed.studentName || parsed.fullName || "Học sinh")
        } catch (e) {}
      }
    }
  }, [])

  useEffect(() => {
    if (!studentId) {
      // Fallback search if studentId not in localStorage
      fetch("/api/students/search?limit=1")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setStudentId(data[0].id)
            setStudentName(data[0].studentName)
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      loadRequests()
    }
  }, [studentId])

  async function loadRequests() {
    if (!studentId) return
    try {
      setLoading(true)
      const res = await fetch("/api/advisory/help-requests?studentId=" + studentId)
      if (res.ok) {
        setRequests(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitRequest() {
    if (!form.content.trim()) {
      alert("Vui lòng nhập nội dung em cần thầy cô hỗ trợ nhé!")
      return
    }
    if (!studentId) {
      alert("Chưa xác định được thông tin học sinh. Vui lòng đăng nhập lại.")
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch("/api/advisory/help-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          category: form.category,
          urgency: form.urgency,
          content: form.content
        })
      })

      if (res.ok) {
        setShowModal(false)
        setForm({ category: "HOC_TAP", urgency: "MEDIUM", content: "" })
        setToastMessage("Đã gửi yêu cầu thành công! Thầy/Cô GVCN sẽ nhận được thông báo ngay.")
        setTimeout(() => setToastMessage(""), 4000)
        loadRequests()
      } else {
        const err = await res.json()
        alert(err.error || "Gửi không thành công")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-slate-800 pb-16">
      {/* Banner Slogan */}
      <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-teal-500 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black bg-white/20 text-white uppercase tracking-wider backdrop-blur-md">
              <Heart className="w-3.5 h-3.5 text-rose-200 fill-rose-200 animate-pulse" />
              <span>GÓC TÂM SỰ & HỖ TRỢ HỌC SINH SKY-LINE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">Em Cần Thầy Cô Hỗ Trợ?</h1>
            <p className="text-xs sm:text-sm text-pink-100 font-medium max-w-xl leading-relaxed">
              Dù là khó khăn trong học tập, thắc mắc bài vở hay cần lắng nghe chia sẻ cảm xúc, Thầy Cô GVCN & Ban Tâm lý luôn ở đây đồng hành cùng em!
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 rounded-2xl bg-white text-rose-600 hover:bg-rose-50 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5 shrink-0"
          >
            <Plus className="w-4 h-4 text-rose-600" />
            <span>Gửi Yêu Cầu Hỗ Trợ Mới</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 font-black">📚</div>
          <div>
            <h4 className="text-xs font-black text-slate-800">Hỗ trợ Học tập</h4>
            <p className="text-[10px] text-slate-500 font-medium">Giải đáp bài tập, phương pháp học</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-pink-50 text-pink-600 font-black">💬</div>
          <div>
            <h4 className="text-xs font-black text-slate-800">Tâm lý & Cảm xúc</h4>
            <p className="text-[10px] text-slate-500 font-medium">Lắng nghe, tháo gỡ lo lắng</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-teal-50 text-teal-600 font-black">🛡️</div>
          <div>
            <h4 className="text-xs font-black text-slate-800">Bảo mật 100%</h4>
            <p className="text-[10px] text-slate-500 font-medium">Chỉ GVCN & Thầy cô xử lý</p>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-rose-500" />
            <span>Danh Sách Yêu Cầu Hỗ Trợ Đã Gửi ({requests.length})</span>
          </h3>
          <button onClick={loadRequests} className="text-xs font-bold text-teal-600 hover:underline">
            Làm mới
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-bold animate-pulse">
            Đang tải danh sách yêu cầu...
          </div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto text-xl font-bold">
              ❤️
            </div>
            <p className="text-xs font-extrabold text-slate-700">Em chưa gửi yêu cầu hỗ trợ nào.</p>
            <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto">
              Khi gặp bất kỳ khó khăn gì trong học tập hay sinh hoạt tại trường, em hãy tự tin nhấn nút "Gửi Yêu Cầu Hỗ Trợ Mới" nhé!
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-black hover:bg-[#004D4A] transition-all"
            >
              Gửi Yêu Cầu Ngay
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {requests.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      item.category === "HOC_TAP"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : item.category === "TAM_LY_BAN_BE"
                        ? "bg-pink-100 text-pink-800 border border-pink-200"
                        : "bg-teal-100 text-teal-800 border border-teal-200"
                    }`}>
                      {item.category === "HOC_TAP" ? "📚 Học tập" : item.category === "TAM_LY_BAN_BE" ? "💬 Tâm lý" : "❓ Khác"}
                    </span>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      item.urgency === "HIGH" || item.urgency === "URGENT"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-200 text-slate-700"
                    }`}>
                      {item.urgency === "HIGH" ? "🔴 Cần gấp" : "🟢 Bình thường"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === "RESOLVED" ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>GVCN Đã Phản Hồi</span>
                      </span>
                    ) : item.status === "PROCESSING" ? (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black flex items-center gap-1 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Thầy Cô Đang Xử Lý</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Đã Gửi Tới GVCN</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed">{item.content}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                    Thời gian gửi: {new Date(item.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>

                {/* Teacher Response Box */}
                {item.responseNotes && (
                  <div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200 space-y-1">
                    <p className="text-[11px] font-black text-[#003B3A] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Phản Hồi Từ Thầy/Cô {item.teacher?.teacherName || "GVCN"}:</span>
                    </p>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{item.responseNotes}</p>
                    {item.resolvedAt && (
                      <p className="text-[10px] text-teal-600 font-semibold mt-1">
                        Xác nhận ngày: {new Date(item.resolvedAt).toLocaleDateString("vi-VN")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form Gửi Yêu Cầu Hỗ Trợ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600 font-black">
                  <Heart className="w-5 h-5 fill-rose-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Em Cần Thầy Cô Hỗ Trợ Điều Gì?</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Yêu cầu sẽ gửi riêng cho GVCN phụ trách lớp em</p>
                </div>
              </div>

              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">1. Phân loại nội dung em cần giúp đỡ:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, category: "HOC_TAP" })}
                    className={`p-2.5 rounded-xl border text-left font-bold flex items-center gap-2 transition-all ${
                      form.category === "HOC_TAP"
                        ? "border-blue-500 bg-blue-50 text-blue-900 shadow-xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span>📚 Học tập & Bài vở</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, category: "TAM_LY_BAN_BE" })}
                    className={`p-2.5 rounded-xl border text-left font-bold flex items-center gap-2 transition-all ${
                      form.category === "TAM_LY_BAN_BE"
                        ? "border-pink-500 bg-pink-50 text-pink-900 shadow-xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span>💬 Tâm lý & Bạn bè</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, category: "SUC_KHOE" })}
                    className={`p-2.5 rounded-xl border text-left font-bold flex items-center gap-2 transition-all ${
                      form.category === "SUC_KHOE"
                        ? "border-teal-500 bg-teal-50 text-teal-900 shadow-xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span>🏥 Sức khỏe & Sinh hoạt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, category: "KHAC" })}
                    className={`p-2.5 rounded-xl border text-left font-bold flex items-center gap-2 transition-all ${
                      form.category === "KHAC"
                        ? "border-purple-500 bg-purple-50 text-purple-900 shadow-xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span>❓ Khác</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">2. Mức độ khẩn cấp:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, urgency: "MEDIUM" })}
                    className={`flex-1 py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      form.urgency === "MEDIUM"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    🟢 Bình thường (Trong tuần)
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, urgency: "HIGH" })}
                    className={`flex-1 py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      form.urgency === "HIGH"
                        ? "border-rose-500 bg-rose-50 text-rose-900"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    🔴 Cần giúp gấp
                  </button>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">3. Viết chi tiết điều em muốn thầy cô hỗ trợ *:</label>
                <textarea
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Ví dụ: Em chưa hiểu rõ phần bài tập môn Toán / Em cảm thấy lo lắng trước kỳ thi / Em cần thầy cô chia sẻ..."
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitRequest}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? "Đang gửi..." : "Gửi Cho GVCN Ngay"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
