"use client"

import { useState, useEffect } from "react"
import { Feather, Save, CheckCircle2, Heart, Compass, Star, Sparkles } from "lucide-react"
import Link from "next/link"

export default function StudentReflectionPortalPage() {
  const [studentId, setStudentId] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  const [reflections, setReflections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  const [feeling, setFeeling] = useState("HAPPY")
  const [selfRating, setSelfRating] = useState(5)
  const [reflectionText, setReflectionText] = useState("")
  const [difficulties, setDifficulties] = useState("")
  const [helpNeededText, setHelpNeededText] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedYear = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(storedYear)
      const storedStudent = localStorage.getItem("currentStudent")
      if (storedStudent) {
        try {
          const parsed = JSON.parse(storedStudent)
          setStudentId(parsed.id || "")
        } catch (e) {}
      }
    }
  }, [])

  useEffect(() => {
    if (studentId) {
      loadReflections()
    }
  }, [studentId])

  async function loadReflections() {
    if (!studentId) return
    try {
      setLoading(true)
      const res = await fetch("/api/advisory/reflections?studentId=" + studentId)
      if (res.ok) setReflections(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveReflection() {
    if (!reflectionText.trim()) {
      alert("Vui lòng nhập nội dung tự đánh giá của em nhé!")
      return
    }
    try {
      setSaving(true)
      const res = await fetch("/api/advisory/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          feeling,
          selfRating,
          reflectionText,
          difficulties,
          helpNeededText
        })
      })

      if (res.ok) {
        setReflectionText("")
        setDifficulties("")
        setHelpNeededText("")
        setToastMessage("Đã lưu nhật ký tự đánh giá thành công!")
        setTimeout(() => setToastMessage(""), 4000)
        loadReflections()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-slate-800 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-teal-500 to-[#003B3A] rounded-3xl p-6 text-white shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 uppercase tracking-wider">
            SKY-LINE STUDENT REFLECTION
          </span>

          <Link
            href="/hocsinh/portal/ho-tro"
            className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md"
          >
            <Heart className="w-4 h-4 fill-white" />
            <span>Nút "Em Cần Hỗ Trợ"</span>
          </Link>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Nhật Ký Tự Đánh Giá (Reflection)</h1>
          <p className="text-xs text-amber-100 font-medium mt-1">
            Dành ít phút để nhìn lại chặng đường học tập, ghi nhận sự tiến bộ và chia sẻ cảm xúc của mình nhé!
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* New Reflection Input */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-[#003B3A]">Viết Nhật Ký Tự Đánh Giá Mới</h3>

        {/* Emotion Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-slate-700">1. Hôm nay em cảm thấy thế nào?</label>
          <div className="flex items-center gap-3">
            {[
              { id: "HAPPY", label: "😄 Vui vẻ & Hào hứng" },
              { id: "NORMAL", label: "😊 Bình thường" },
              { id: "STRESSED", label: "😰 Lo lắng / Căng thẳng" },
              { id: "TIRED", label: "😴 Mệt mỏi" }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFeeling(item.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  feeling === item.id
                    ? "bg-amber-100 border-amber-400 text-amber-900 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-extrabold text-slate-700 block mb-1">
            2. Nội dung tự đánh giá (Điều em đã làm tốt nhất & bài học rút ra) *:
          </label>
          <textarea
            rows={3}
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            placeholder="Ví dụ: Tuần này em đã hoàn thành đúng hạn các bài tập, học thêm được 10 từ vựng tiếng Anh..."
            className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-semibold focus:border-amber-500"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveReflection}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#003B3A] text-white text-xs font-black flex items-center gap-2 hover:bg-[#004D4A] shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Đang lưu..." : "Lưu Nhật Ký Reflection"}</span>
          </button>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-[#003B3A]">Lịch Sử Reflection Của Em</h3>
        {reflections.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium text-center py-6">Chưa có nhật ký reflection nào.</p>
        ) : (
          <div className="space-y-3">
            {reflections.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Cảm xúc: {r.feeling === "HAPPY" ? "😄 Vui vẻ" : "😊 Bình thường"}</span>
                  <span>{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800">{r.reflectionText}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
