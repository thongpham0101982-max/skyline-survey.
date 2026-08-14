"use client"

import { useState, useEffect } from "react"
import { 
  Heart, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  Compass, 
  FileText, 
  UserCheck, 
  Sparkles, 
  GraduationCap, 
  Users, 
  MessageSquare,
  AlertCircle
} from "lucide-react"

export default function ParentAdvisoryPortalPage() {
  const [childrenList, setChildrenList] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [parentMessage, setParentMessage] = useState("")
  const [signedByParent, setSignedByParent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  // 1. Fetch academic year and parent's linked children for the selected academic year
  useEffect(() => {
    let year = ""
    if (typeof window !== "undefined") {
      year = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(year)
    }

    async function loadChildren(targetYearId: string) {
      try {
        setLoading(true)
        const url = targetYearId ? `/api/parent/children?academicYearId=${targetYearId}` : "/api/parent/children"
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setChildrenList(data)
            setSelectedStudentId(data[0].id)
          } else {
            setChildrenList([])
            setSelectedStudentId("")
            setLoading(false)
          }
        } else {
          setChildrenList([])
          setSelectedStudentId("")
          setLoading(false)
        }
      } catch (e) {
        console.error("Error loading parent children:", e)
        setChildrenList([])
        setSelectedStudentId("")
        setLoading(false)
      }
    }

    loadChildren(year)

    const handleYearChange = () => {
      if (typeof window !== "undefined") {
        const newYear = localStorage.getItem("selectedAcademicYear") || ""
        setAcademicYearId(newYear)
        loadChildren(newYear)
      }
    }
    window.addEventListener("academicYearChanged", handleYearChange)

    return () => {
      window.removeEventListener("academicYearChanged", handleYearChange)
    }
  }, [])

  // 2. Fetch 360 profile when selectedStudentId or academicYearId changes
  useEffect(() => {
    if (!selectedStudentId) {
      setLoading(false)
      return
    }

    async function load360Profile() {
      try {
        setLoading(true)
        const res = await fetch(`/api/advisory/profile-360?studentId=${selectedStudentId}&academicYearId=${academicYearId}`)
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
          if (data.goals && data.goals.length > 0) {
            setParentMessage(data.goals[0].parentMessage || "")
            setSignedByParent(data.goals[0].signedByParent || false)
          } else {
            setParentMessage("")
            setSignedByParent(false)
          }
        }
      } catch (e) {
        console.error("Error loading profile-360:", e)
      } finally {
        setLoading(false)
      }
    }
    load360Profile()
  }, [selectedStudentId, academicYearId])

  async function handleSaveParentCommitment() {
    if (!selectedStudentId) return
    try {
      setSaving(true)
      const res = await fetch("/api/advisory/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYearId,
          gradeLevel: profile?.student?.class?.grade || "K1",
          goals: (profile?.goals || []).map((g: any) => ({
            category: g.category,
            targetText: g.targetText
          })),
          parentMessage,
          signedByParent: true
        })
      })

      if (res.ok) {
        setSignedByParent(true)
        setToastMessage("Đã ký xác nhận Cam kết đồng hành & Gửi lời nhắn tới con thành công!")
        setTimeout(() => setToastMessage(""), 4000)
      }
    } catch (e) {
      console.error("Error saving parent commitment:", e)
    } finally {
      setSaving(false)
    }
  }

  const selectedStudent = childrenList.find(c => c.id === selectedStudentId) || {}
  const student = profile?.student || selectedStudent
  const statusColor = profile?.currentStatusColor || "GREEN"
  const homeroomTeacherName = selectedStudent.homeroomTeacherName || student.homeroomTeacherName || (student.class?.homeroomTeacherId ? "Phụ trách chuyên môn" : "Chưa phân công")

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans text-slate-800 pb-16">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A99D] p-8 text-white shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-white/15 backdrop-blur-md uppercase tracking-wider text-teal-200 border border-white/20">
          <Compass className="w-3.5 h-3.5" />
          <span>PARENT PORTAL — SKYLINE ADVISORY</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight">Theo Dõi Cố Vấn & Mục Tiêu Đồng Hành</h1>
        <p className="text-xs sm:text-sm text-teal-100 font-medium max-w-2xl leading-relaxed">
          Theo dõi sát sao tình hình học tập tự chủ của con, tham gia định hướng mục tiêu phát triển và gửi những lời động viên chân thành nhất từ Gia đình.
        </p>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-black flex items-center gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Child Switcher Dropdown / Pills if multiple children */}
      {childrenList.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-4">
          <span className="text-xs font-black text-slate-600 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00A99D]" />
            <span>Chọn con em theo dõi (Năm học hiện tại):</span>
          </span>
          <div className="flex items-center gap-2">
            <LinkStudentModal onSuccess={() => window.location.reload()} />
            {childrenList.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedStudentId(c.id)}
                className={"px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all " + (
                  selectedStudentId === c.id 
                    ? "bg-[#003B3A] text-white shadow-sm" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {c.studentName} ({c.class?.className || 'Chưa xếp lớp'})
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs font-extrabold text-slate-400 animate-pulse space-y-2">
          <Compass className="w-8 h-8 mx-auto text-teal-500 animate-spin" />
          <p>Đang tải dữ liệu Cố vấn học tập của con...</p>
        </div>
      ) : childrenList.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Chưa gắn thông tin con em</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Tài khoản Phụ huynh hiện chưa được liên kết với mã học sinh. Vui lòng bổ sung mã học sinh hoặc liên hệ Văn phòng Nhà trường để hỗ trợ kích hoạt liên kết.
          </p>
          <div className="pt-2 flex justify-center">
            <LinkStudentModal onSuccess={() => window.location.reload()} buttonText="Bổ sung mã Học sinh ngay" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card Trạng Thái Tín Hiệu Cố Vấn */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Tín hiệu Theo Dõi Tự Học & Cố Vấn
              </span>
              <div className="flex items-center gap-3">
                <span className={"px-3.5 py-1 rounded-full text-xs font-black uppercase border " + (
                  statusColor === "RED" ? "bg-rose-100 text-rose-800 border-rose-300" :
                  statusColor === "YELLOW" ? "bg-amber-100 text-amber-800 border-amber-300" :
                  "bg-emerald-100 text-emerald-800 border-emerald-300"
                )}>
                  {statusColor === "RED" ? "🔴 Cần hỗ trợ đặc biệt" : statusColor === "YELLOW" ? "🟡 Cần theo dõi thêm" : "🟢 Ổn định & Phát triển tốt"}
                </span>
              </div>
            </div>

            <div className="sm:text-right text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-0.5 min-w-[240px]">
              <p className="font-extrabold text-[#003B3A]">Học sinh: {student.studentName || selectedStudent.studentName || "N/A"}</p>
              <p className="text-slate-500 font-semibold">Lớp: {student.class?.className || selectedStudent.class?.className || "N/A"} • Mã HS: {student.studentCode || selectedStudent.studentCode || "N/A"}</p>
              <p className="text-teal-700 font-bold">GVCN: {homeroomTeacherName}</p>
            </div>
          </div>

          {/* Card Bảng Mục Tiêu Năm Học */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-[#003B3A] flex items-center gap-2">
                <Compass className="w-5 h-5 text-teal-600" />
                <span>Bảng Mục Tiêu Năm Học Của Con</span>
              </h3>
              <span className="text-xs font-bold text-slate-400">
                {(profile?.goals?.length || 0)} mục tiêu đã đăng ký
              </span>
            </div>

            {(!profile?.goals || profile.goals.length === 0) ? (
              <div className="py-10 text-center text-slate-400 text-xs font-medium space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p>Con chưa khởi tạo bảng mục tiêu cá nhân cho năm học này.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.goals.map((g: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 hover:border-teal-300 transition-colors">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-teal-100 text-teal-800 uppercase inline-block">
                      {g.category}
                    </span>
                    <h4 className="text-xs font-black text-slate-900 leading-snug">{g.targetText}</h4>
                    {g.actions && g.actions.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 font-semibold space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kế hoạch hành động:</span>
                        {g.actions.map((a: any, aIdx: number) => (
                          <p key={aIdx} className="flex items-start gap-1">
                            <span className="text-teal-600 font-bold">•</span>
                            <span>{a.actionText}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card Lời Nhắn & Cam Kết Đồng Hành Của Phụ Huynh */}
          <div className="bg-white rounded-3xl p-6 border border-teal-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-teal-100 pb-4">
              <h3 className="text-base font-black text-[#003B3A] flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-100" />
                <span>Lời Nhắn Gửi & Ký Cam Kết Đồng Hành Từ Gia Đình</span>
              </h3>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Gửi gắm những tình cảm, niềm tin và sự ủng hộ của Phụ huynh đến con em. Lời nhắn sẽ được lưu trữ trực tiếp trong Hồ sơ học tập 360° của con.
            </p>

            <textarea
              rows={4}
              value={parentMessage}
              onChange={(e) => setParentMessage(e.target.value)}
              placeholder="Ví dụ: Ba mẹ tin tưởng con sẽ nỗ lực hoàn thành xuất sắc mục tiêu học tập năm nay. Hãy luôn tự tin và vui vẻ con nhé! ❤️"
              className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none leading-relaxed transition-all"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <div>
                {signedByParent ? (
                  <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1.5 border border-emerald-300 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Đã Ký Số Cam Kết Đồng Hành</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                    <UserCheck className="w-4 h-4 text-slate-300" />
                    <span>Chưa xác nhận cam kết đồng hành</span>
                  </span>
                )}
              </div>

              <button
                onClick={handleSaveParentCommitment}
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#003B3A] text-white text-xs font-black flex items-center justify-center gap-2 hover:bg-[#004D4A] shadow-md transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Đang lưu..." : "Ký & Gửi Lời Nhắn Phụ Huynh"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
