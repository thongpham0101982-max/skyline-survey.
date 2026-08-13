"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Heart, Save, CheckCircle2, ShieldCheck, Compass, FileText, UserCheck, Sparkles, BookOpen, AlertCircle, ArrowLeft, Award, CheckSquare, MessageCircle } from "lucide-react"
import Link from "next/link"

function ParentAdvisoryContent() {
  const searchParams = useSearchParams()
  const studentIdParam = searchParams.get("studentId")

  const [studentId, setStudentId] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [parentMessage, setParentMessage] = useState("")
  const [signedByParent, setSignedByParent] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedYear = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(storedYear)
    }

    if (studentIdParam) {
      setStudentId(studentIdParam)
    } else {
      fetch("/api/students/search?limit=1")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setStudentId(data[0].id)
          }
        })
        .catch(() => {})
    }
  }, [studentIdParam])

  useEffect(() => {
    if (!studentId) return
    async function load360Profile() {
      try {
        setLoading(true)
        const res = await fetch(`/api/advisory/profile-360?studentId=${studentId}&academicYearId=${academicYearId}&_t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
          if (data.goals && data.goals.length > 0) {
            setParentMessage(data.goals[0].parentMessage || "")
            setSignedByParent(data.goals[0].signedByParent || false)
            if (data.goals[0].signedByParent) setAgreeTerms(true)
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load360Profile()
  }, [studentId, academicYearId])

  async function handleSaveParentCommitment() {
    if (!studentId) return
    if (!agreeTerms && !signedByParent) {
      alert("Vui lòng tích chọn xác nhận đồng hành trước khi ký cam kết!")
      return
    }

    try {
      setSaving(true)
      const res = await fetch("/api/advisory/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          parentMessage,
          signedByParent: true
        })
      })

      if (res.ok) {
        setSignedByParent(true)
        setToastMessage("🎉 Đã gửi Lời nhắn & Ký cam kết đồng hành Phụ huynh thành công!")
        setTimeout(() => setToastMessage(""), 5000)
      } else {
        const errData = await res.json()
        alert(errData.error || "Không thể lưu cam kết Phụ huynh")
      }
    } catch (e) {
      console.error(e)
      alert("Có lỗi kết nối hệ thống!")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Đang nạp Sổ Tiến Độ & Cam Kết Đồng Hành Của Con...
          </p>
        </div>
      </div>
    )
  }

  const student = profile?.student || {}
  const statusColor = profile?.currentStatusColor || "GREEN"
  const trackingLogs = profile?.trackingLogs || []

  const standardCategories = [
    { key: "HOC_TAP", label: "1. Mục tiêu học tập 📚", color: "border-teal-200 bg-teal-50/50" },
    { key: "THOI_QUEN", label: "2. Mục tiêu thói quen ⏰", color: "border-amber-200 bg-amber-50/50" },
    { key: "KY_NANG_CAM_XUC", label: "3. Mục tiêu kỹ năng, cảm xúc 🎨", color: "border-sky-200 bg-sky-50/50" },
    { key: "DINH_HUONG", label: "4. Mục tiêu định hướng 🚀", color: "border-purple-200 bg-purple-50/50" }
  ]

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 pb-24">
      
      {/* Header Banner Navbar */}
      <div className="bg-[#003B3A] text-white shadow-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/parent"
            className="flex items-center gap-2 text-xs font-black text-teal-200 hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-xl border border-white/15"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Cổng Phụ Huynh</span>
          </Link>

          <span className="text-xs font-black uppercase tracking-widest text-teal-100 hidden sm:inline-block">
            CỔNG THÔNG TIN PHỤ HUYNH 360° — SKY-LINE ACADEMY
          </span>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-white">Trực Tuyến</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 pt-6">

        {/* Student Profile Overview Card */}
        <div className="bg-gradient-to-br from-white via-teal-50/30 to-slate-50 rounded-3xl p-6 border-2 border-teal-100 shadow-md space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#003B3A] text-white flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                {student.studentName ? student.studentName.charAt(0) : "H"}
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-900 uppercase tracking-wider">
                  HỌC SINH SKY-LINE
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  {student.studentName}
                </h1>
                <p className="text-xs text-slate-500 font-bold flex items-center gap-2 mt-1">
                  <span>Mã HS: <strong className="text-teal-700">{student.studentCode}</strong></span>
                  <span>•</span>
                  <span>Lớp: <strong className="text-slate-800">{student.class?.className || "N/A"}</strong></span>
                  <span>•</span>
                  <span>Cơ sở: <strong className="text-slate-800">{student.class?.campus?.campusName || "Sky-Line"}</strong></span>
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-1 text-left md:text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Trạng Thái Theo Dõi Học Tập
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase shadow-xs ${
                statusColor === "RED" ? "bg-rose-100 text-rose-900 border border-rose-300" :
                statusColor === "YELLOW" ? "bg-amber-100 text-amber-900 border border-amber-300" :
                "bg-emerald-100 text-emerald-900 border border-emerald-300"
              }`}>
                {statusColor === "RED" ? "🔴 Cần hỗ trợ đặc biệt" : statusColor === "YELLOW" ? "🟡 Cần theo dõi thêm" : "🟢 Ổn định & Phát triển tốt"}
              </span>
            </div>
          </div>
        </div>

        {toastMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-between shadow-lg animate-bounce">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage("")} className="text-white hover:text-emerald-100 font-bold">✕</button>
          </div>
        )}

        {/* SECTION 1: SỔ XEM TIẾN ĐỘ MỤC TIÊU 360° */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border-2 border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-900 flex items-center justify-center font-black">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Sổ Theo Dõi Tiến Độ Mục Tiêu
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  Xem chi tiết 4 nhóm mục tiêu con đã đăng ký và kết quả đánh giá từ GVCN
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200">
              Năm học 2026 - 2027
            </span>
          </div>

          {(!profile?.goals || profile.goals.length === 0) ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-400 font-bold">Con chưa hoàn thành nộp phiếu mục tiêu năm học.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {standardCategories.map((catObj, idx) => {
                const goalInCat = profile.goals.find((g: any) => {
                  if (g.category === catObj.key) return true
                  if (catObj.key === "THOI_QUEN" && (g.category === "THOI_QUEN" || g.category === "THOI_QUEN_SUC_KHOE")) return true
                  if (catObj.key === "KY_NANG_CAM_XUC" && (g.category === "KY_NANG_CAM_XUC" || g.category === "KY_NANG_SO_THICH")) return true
                  if (catObj.key === "DINH_HUONG" && (g.category === "DINH_HUONG" || g.category === "PHAM_CHAT")) return true
                  return false
                })

                const logInCat = trackingLogs.find((l: any) => l.goalId === goalInCat?.id || l.category?.includes(catObj.key))

                return (
                  <div key={idx} className={`rounded-3xl border-2 p-5 shadow-xs transition-all ${catObj.color}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3 mb-3">
                      <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <span>{catObj.label}</span>
                      </h3>

                      {/* Status evaluation from Teacher */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase">Đánh giá GVCN:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                          logInCat?.progressStatus === "DAT" ? "bg-emerald-100 text-emerald-900 border-emerald-300" :
                          logInCat?.progressStatus === "CHUA_DAT" ? "bg-rose-100 text-rose-900 border-rose-300" :
                          "bg-amber-100 text-amber-900 border-amber-300"
                        }`}>
                          {logInCat?.progressStatus === "DAT" ? "🟢 Đạt" : logInCat?.progressStatus === "CHUA_DAT" ? "🔴 Chưa Đạt" : "🟡 Đang tiến triển"}
                        </span>
                      </div>
                    </div>

                    {goalInCat ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Left: Target & Actions */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                          <div>
                            <span className="text-[11px] font-black text-teal-800 uppercase tracking-wider block mb-0.5">
                              📌 Các mục tiêu cụ thể của con:
                            </span>
                            <p className="font-bold text-slate-900 leading-relaxed text-xs">{goalInCat.targetText}</p>
                          </div>

                          {goalInCat.actions && goalInCat.actions.length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider block mb-0.5">
                                ⚡ Con sẽ làm gì để đạt mục tiêu này:
                              </span>
                              <p className="font-semibold text-slate-700 leading-relaxed text-xs">
                                {goalInCat.actions.map((a: any) => a.actionText).join(" • ")}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Right: Parent Support Request & Teacher Notes */}
                        <div className="space-y-2.5">
                          {goalInCat.parentSupportRequest && (
                            <div className="p-3.5 rounded-2xl bg-rose-100/70 border border-rose-200/90 text-rose-950 space-y-0.5">
                              <span className="font-black text-xs block">🏡 Mong muốn con gửi gắm Ba/Mẹ hỗ trợ:</span>
                              <p className="font-medium text-xs leading-relaxed text-slate-800">{goalInCat.parentSupportRequest}</p>
                            </div>
                          )}

                          {logInCat?.teacherNotes && (
                            <div className="p-3.5 rounded-2xl bg-sky-100/70 border border-sky-200/90 text-sky-950 space-y-0.5">
                              <span className="font-black text-xs block">💬 Nhận xét của Thầy/Cô GVCN:</span>
                              <p className="font-medium text-xs leading-relaxed text-slate-800">{logInCat.teacherNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-slate-400 italic py-2">Con chưa điền mục tiêu nhóm này</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: STUDENT COMMITMENT CARD */}
        {profile?.goals?.[0]?.studentCommitment && (
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-200 rounded-3xl p-5 sm:p-6 text-teal-950 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-teal-900">
              <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider">
                LỜI CAM KẾT VÀ XÁC NHẬN CỦA CON ({student.studentName}):
              </span>
            </div>
            <p className="text-xs font-bold text-teal-900 italic pl-7 leading-relaxed">
              "{profile.goals[0].studentCommitment}"
            </p>
          </div>
        )}

        {/* SECTION 3: KÝ CAM KẾT VÀ LỜI DẶN ĐỒNG HÀNH CỦA GIA ĐÌNH */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-200 shadow-md space-y-5">
          <div className="flex items-center gap-3 border-b border-amber-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">
              <Heart className="w-5 h-5 fill-amber-500 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Lời Dặn & Ký Cam Kết Đồng Hành Của Gia Đình
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Gửi lời nhắn động viên con và xác nhận đồng hành cùng Nhà trường trong năm học 2026 - 2027
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-amber-600" />
              <span>Lời dặn dò, nhắn gửi động viên của Ba Mẹ dành cho con:</span>
            </label>
            <textarea
              rows={4}
              value={parentMessage}
              onChange={(e) => setParentMessage(e.target.value)}
              placeholder="Ví dụ: Ba mẹ tự hào về các mục tiêu con đã đặt ra. Ba mẹ cam kết tạo điều kiện tối đa về thời gian, không gian học tập và luôn đồng hành, lắng nghe con mỗi ngày..."
              className="w-full p-4 rounded-2xl border-2 border-slate-200 text-xs font-semibold focus:border-amber-500 focus:outline-none leading-relaxed bg-amber-50/30"
            />
          </div>

          {/* Digital Signature Confirmation Checkbox */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800 leading-relaxed">
                ✍️ <strong>XÁC NHẬN PHỤ HUYNH:</strong> Tôi xác nhận là Phụ huynh học sinh <strong>{student.studentName}</strong>, đã đọc toàn bộ mục tiêu của con và cam kết luôn đồng hành, hợp tác chặt chẽ cùng Nhà trường & Thầy Cô GVCN trong năm học 2026 - 2027.
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div>
              {signedByParent ? (
                <span className="px-4 py-2 rounded-2xl bg-emerald-100 text-emerald-900 text-xs font-black inline-flex items-center gap-2 border border-emerald-300 shadow-xs">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                  <span>ĐÃ KÝ VÀ XÁC NHẬN CAM KẾT ĐỒNG HÀNH GIA ĐÌNH</span>
                </span>
              ) : (
                <span className="text-xs font-extrabold text-amber-700 bg-amber-100/60 px-3 py-1.5 rounded-xl border border-amber-200 inline-block">
                  ⚠️ Chưa hoàn thành ký cam kết đồng hành
                </span>
              )}
            </div>

            <button
              onClick={handleSaveParentCommitment}
              disabled={saving}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white text-xs font-black flex items-center justify-center gap-2 hover:opacity-95 shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-4.5 h-4.5" />
              <span>{saving ? "Đang lưu chữ ký..." : "✍️ KÝ VÀ GỬI CAM KẾT ĐỒNG HÀNH"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function ParentAdvisoryPortalPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-xs font-black text-slate-400">Đang khởi tạo Cổng Phụ Huynh...</p>
      </div>
    }>
      <ParentAdvisoryContent />
    </Suspense>
  )
}
