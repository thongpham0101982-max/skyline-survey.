"use client"

import { useState, useEffect } from "react"
import { Heart, Save, CheckCircle2, ShieldCheck, Compass, FileText, UserCheck, Sparkles } from "lucide-react"

export default function ParentAdvisoryPortalPage() {
  const [studentId, setStudentId] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [parentMessage, setParentMessage] = useState("")
  const [signedByParent, setSignedByParent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedYear = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(storedYear)
    }
    // Search first student
    fetch("/api/students/search?limit=1")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setStudentId(data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!studentId) return
    async function load360Profile() {
      try {
        setLoading(true)
        const res = await fetch(`/api/advisory/profile-360?studentId=${studentId}&academicYearId=${academicYearId}`)
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
          if (data.goals && data.goals.length > 0) {
            setParentMessage(data.goals[0].parentMessage || "")
            setSignedByParent(data.goals[0].signedByParent || false)
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
    if (!studentId || !profile?.goals) return
    try {
      setSaving(true)
      const res = await fetch("/api/advisory/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          gradeLevel: profile.student?.class?.grade || "K1",
          goals: profile.goals.map((g: any) => ({
            category: g.category,
            targetText: g.targetText
          })),
          parentMessage,
          signedByParent: true
        })
      })

      if (res.ok) {
        setSignedByParent(true)
        setToastMessage("Đã gửi Lời nhắn & Ký cam kết đồng hành Phụ huynh thành công!")
        setTimeout(() => setToastMessage(""), 4000)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-xs font-extrabold text-slate-400 animate-pulse">
        Đang tải thông tin Cố vấn học tập của con...
      </div>
    )
  }

  const student = profile?.student || {}
  const statusColor = profile?.currentStatusColor || "GREEN"

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-slate-800 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#00A99D] rounded-3xl p-6 text-white shadow-xl space-y-2">
        <span className="px-3 py-1 rounded-full text-xs font-black bg-white/15 uppercase tracking-wider text-teal-200">
          PARENT PORTAL — SKY-LINE ADVISORY
        </span>
        <h1 className="text-2xl font-black">Đồng Hành Mục Tiêu & Cố Vấn Học Tập</h1>
        <p className="text-xs text-teal-100 font-medium">
          Xem Bảng Mục Tiêu của con <strong>{student.studentName}</strong>, theo dõi tiến độ và gửi lời nhắn gửi đồng hành từ Gia đình.
        </p>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Warning Status Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Trạng Thái Đồng Hành Tự Học</p>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
              statusColor === "RED" ? "bg-rose-100 text-rose-800 border border-rose-300" :
              statusColor === "YELLOW" ? "bg-amber-100 text-amber-800 border border-amber-300" :
              "bg-emerald-100 text-emerald-800 border border-emerald-300"
            }`}>
              {statusColor === "RED" ? "🔴 Cần hỗ trợ đặc biệt" : statusColor === "YELLOW" ? "🟡 Cần theo dõi thêm" : "🟢 Ổn định & Phát triển tốt"}
            </span>
          </div>
        </div>

        <div className="text-right text-xs">
          <p className="font-extrabold text-[#003B3A]">Lớp: {student.class?.className || "N/A"}</p>
          <p className="text-slate-400 font-medium">GVCN: {student.class?.homeroomTeacherId ? "Phụ trách chuyên môn" : "Thầy/Cô Chủ Nhiệm"}</p>
        </div>
      </div>

      {/* Goal List View */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
          <Compass className="w-4 h-4 text-teal-600" />
          <span>Bảng Mục Tiêu Năm Học Của Con</span>
        </h3>

        {(!profile?.goals || profile.goals.length === 0) ? (
          <p className="text-xs text-slate-400 font-medium text-center py-6">Con chưa điền phiếu mục tiêu năm học.</p>
        ) : (
          <div className="space-y-3">
            {profile.goals.map((g: any, idx: number) => (
              <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-teal-100 text-teal-800 uppercase">
                  {g.category}
                </span>
                <h4 className="text-xs font-bold text-slate-900 mt-1">{g.targetText}</h4>
                {g.actions && g.actions.length > 0 && (
                  <p className="text-[11px] text-slate-600 font-medium">
                    Hành động: {g.actions.map((a: any) => a.actionText).join(" • ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Parent Commitment Box */}
      <div className="bg-white rounded-3xl p-6 border border-teal-200 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-teal-600" />
          <span>Lời Nhắn Gửi & Ký Cam Kết Đồng Hành Của Phụ Huynh</span>
        </h3>

        <textarea
          rows={4}
          value={parentMessage}
          onChange={(e) => setParentMessage(e.target.value)}
          placeholder="Nhập lời nhắn gửi, động viên của Phụ huynh dành cho con..."
          className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-semibold focus:border-teal-500"
        />

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {signedByParent ? (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1 border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã Ký Xác Nhận Cam Kết Đồng Hành</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-bold">Chưa ký xác nhận</span>
            )}
          </div>

          <button
            onClick={handleSaveParentCommitment}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#003B3A] text-white text-xs font-black flex items-center gap-2 hover:bg-[#004D4A] shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Đang lưu..." : "Ký & Gửi Lời Nhắn Phụ Huynh"}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
