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
  Target,
  Award,
  BookOpen,
  Activity,
  Smile,
  Zap,
  Check,
  Calendar,
  AlertCircle
} from "lucide-react"
import Link from "next/link"

export default function ParentAdvisoryPage() {
  const [childrenList, setChildrenList] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [parentMessage, setParentMessage] = useState("")
  const [signed, setSigned] = useState(false)

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
          if (data.learningCommitment) {
            setParentMessage(data.learningCommitment.parentMessage || "")
            setSigned(!!data.learningCommitment.signedByParent)
          } else {
            setParentMessage("")
            setSigned(false)
          }
        }
      } catch (e) {
        console.error("Error loading 360 profile:", e)
      } finally {
        setLoading(false)
      }
    }
    load360Profile()
  }, [selectedStudentId, academicYearId])

  async function handleSaveCommitment() {
    if (!selectedStudentId) return
    try {
      setSaving(true)
      const res = await fetch("/api/parent/commitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYearId,
          parentMessage,
          signedByParent: true
        })
      })
      if (res.ok) {
        setSigned(true)
        alert("Đã lưu lời nhắn & ký cam kết đồng hành cùng con thành công!")
      } else {
        alert("Có lỗi khi lưu cam kết. Vui lòng thử lại sau.")
      }
    } catch (e) {
      console.error(e)
      alert("Lỗi kết nối máy chủ.")
    } finally {
      setSaving(false)
    }
  }

  const selectedStudent = childrenList.find(c => c.id === selectedStudentId) || {}
  const student = profile?.student || selectedStudent
  const statusColor = profile?.currentStatusColor || "GREEN"
  const homeroomTeacherName = selectedStudent.homeroomTeacherName || student.homeroomTeacherName || (student.class?.homeroomTeacherId ? "Phụ trách chuyên môn" : "Chưa phân công")
  const goals: any[] = profile?.goals || []

  // Group goals into 4 standard categories matching Student Portal Form
  const goalCategories = [
    {
      id: "HOC_TAP",
      title: "Mục Tiêu Học Tập & Phát Triển Trí Tuệ",
      desc: "Mục tiêu điểm số các môn học, phương pháp tự học và rèn luyện kiến thức",
      icon: BookOpen,
      badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
      iconColor: "text-teal-600",
      accentBg: "bg-teal-50/40 border-teal-100",
      keyNames: ["HOC_TAP", "ACADEMIC", "HỌC TẬP"]
    },
    {
      id: "THOI_QUEN",
      title: "Mục Tiêu Thói Quen & Sức Khỏe",
      desc: "Rèn luyện thể dục thể thao, thói quen sinh hoạt khoa học & dinh dưỡng",
      icon: Activity,
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      iconColor: "text-emerald-600",
      accentBg: "bg-emerald-50/40 border-emerald-100",
      keyNames: ["THOI_QUEN", "THOI_QUEN_SUC_KHOE", "HEALTH", "THÓI QUEN", "SỨC KHỎE"]
    },
    {
      id: "KY_NANG_CAM_XUC",
      title: "Mục Tiêu Kỹ Năng & Quản Lý Cảm Xúc",
      desc: "Phát triển kỹ năng giao tiếp, tinh thần đồng đội và thói quen tích cực",
      icon: Smile,
      badgeColor: "bg-sky-50 text-sky-800 border-sky-200",
      iconColor: "text-sky-600",
      accentBg: "bg-sky-50/40 border-sky-100",
      keyNames: ["KY_NANG_CAM_XUC", "KY_NANG_SO_THICH", "SKILLS", "KỸ NĂNG", "CẢM XÚC"]
    },
    {
      id: "DINH_HUONG",
      title: "Mục Tiêu Định Hướng & Cam Kết Phát Triển",
      desc: "Định hướng ước mơ, dự án cá nhân và mục tiêu dài hạn",
      icon: Zap,
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      iconColor: "text-amber-600",
      accentBg: "bg-amber-50/40 border-amber-100",
      keyNames: ["DINH_HUONG", "DINH_HUONG_CAM_KET", "ORIENTATION", "ĐỊNH HƯỚNG"]
    }
  ]

  // Filter goals for category
  const getCategoryGoals = (catKeys: string[]) => {
    return goals.filter((g: any) => {
      const gCat = (g.category || "").toUpperCase()
      return catKeys.some(k => gCat.includes(k.toUpperCase()))
    })
  }

  // Student Commitment
  const studentCommitmentText = profile?.learningCommitment?.studentCommitment || goals.find(g => g.studentCommitment)?.studentCommitment || "Con cam kết nỗ lực thực hiện đúng các mục tiêu đã đặt ra trong năm học này."
  const signedByStudent = profile?.learningCommitment?.signedByStudent ?? goals.some(g => g.signedByStudent)

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans text-slate-800 pb-16">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A99D] rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-teal-100 uppercase tracking-wider">
          <Compass className="w-4 h-4 text-amber-300" />
          <span>PARENT PORTAL — SKYLINE ADVISORY</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
          Theo Dõi Cố Vấn & Bảng Mục Tiêu Đồng Hành
        </h1>
        <p className="text-xs sm:text-sm text-teal-100 font-medium max-w-3xl leading-relaxed">
          Theo dõi sát sao Form Đăng Ký Mục Tiêu do con em nhập theo từng nhóm mục tiêu cụ thể, hỗ trợ định hướng phát triển và gửi những lời động viên chân thành nhất từ Gia đình.
        </p>
      </div>

      {/* Child Switcher Selector */}
      {childrenList.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-4">
          <span className="text-xs font-black text-slate-600 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00A99D]" />
            <span>Chọn con em theo dõi (Năm học hiện tại):</span>
          </span>
          <div className="flex items-center gap-2">
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
          <p>Đang tải Form Mục tiêu Cố vấn của con...</p>
        </div>
      ) : childrenList.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Chưa có dữ liệu con em</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Tài khoản chưa có thông tin học sinh liên kết. Quý Phụ huynh vui lòng chuyển sang trang Tổng quan để liên kết học sinh.
          </p>
          <div className="pt-2 flex justify-center">
            <Link href="/parent" className="px-5 py-2.5 rounded-2xl bg-[#003B3A] text-white text-xs font-bold hover:bg-[#004D4A] transition-all">
              Chuyển sang trang Tổng quan
            </Link>
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

          {/* Form Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 pt-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#00A99D]" />
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                FORM ĐĂNG KÝ MỤC TIÊU NĂM HỌC CỦA HỌC SINH
              </h2>
            </div>
            <span className="text-xs font-bold bg-teal-100 text-teal-800 px-3 py-1 rounded-full">
              Tổng số: {goals.length} mục tiêu đã khởi tạo
            </span>
          </div>

          {/* 4 CATEGORIES FORM LIST */}
          <div className="space-y-6">
            {goalCategories.map((cat) => {
              const catGoals = getCategoryGoals(cat.keyNames)
              const IconComp = cat.icon

              return (
                <div key={cat.id} className={"bg-white rounded-3xl border p-6 shadow-sm space-y-4 " + cat.accentBg}>
                  {/* Category Header */}
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={"w-10 h-10 rounded-2xl flex items-center justify-center border " + cat.badgeColor}>
                        <IconComp className={"w-5 h-5 " + cat.iconColor} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase">{cat.title}</h3>
                        <p className="text-xs text-slate-500 font-medium">{cat.desc}</p>
                      </div>
                    </div>
                    <span className={"px-3 py-1 rounded-full text-xs font-black border uppercase " + cat.badgeColor}>
                      {catGoals.length} Mục tiêu
                    </span>
                  </div>

                  {/* Category Content */}
                  {catGoals.length === 0 ? (
                    <p className="text-xs text-slate-400 italic font-medium py-3 text-center">
                      Con chưa nhập mục tiêu cho nhóm này.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {catGoals.map((g: any, gIdx: number) => (
                        <div key={gIdx} className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
                          
                          {/* 1. Mục tiêu cụ thể */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                              Mục tiêu cụ thể của con:
                            </span>
                            <p className="text-xs font-black text-slate-900 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                              {g.targetText || "Chưa nhập chi tiết mục tiêu"}
                            </p>
                          </div>

                          {/* 2. Hành động thực hiện */}
                          {(g.actions && g.actions.length > 0) || g.actionText ? (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-black text-teal-700 uppercase tracking-wider block">
                                Kế hoạch hành động con sẽ làm:
                              </span>
                              <div className="space-y-1 pl-1">
                                {g.actions && g.actions.length > 0 ? (
                                  g.actions.map((act: any, aIdx: number) => (
                                    <div key={aIdx} className="flex items-start gap-2 text-xs text-slate-700 font-semibold">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                                      <span>{act.actionText}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex items-start gap-2 text-xs text-slate-700 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                                    <span>{g.actionText}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : null}

                          {/* 3. Mong muốn hỗ trợ từ Thầy cô & Gia đình */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                            <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100 space-y-0.5">
                              <span className="text-[9px] font-black text-teal-800 uppercase tracking-wider block">
                                Mong muốn Thầy Cô hỗ trợ:
                              </span>
                              <p className="text-xs font-semibold text-slate-800">
                                {g.teacherSupportRequest || "Theo dõi và nhắc nhở trên lớp"}
                              </p>
                            </div>

                            <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 space-y-0.5">
                              <span className="text-[9px] font-black text-rose-800 uppercase tracking-wider block">
                                Mong muốn Ba Mẹ / Gia đình hỗ trợ:
                              </span>
                              <p className="text-xs font-semibold text-slate-800">
                                {g.parentSupportRequest || "Động viên và tạo không gian tự học tại nhà"}
                              </p>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Student Commitment Display */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00A99D]" />
              <span>Lời Cam Kết Cá Nhân Của Con</span>
            </h3>
            <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-100 space-y-2">
              <p className="text-xs font-bold text-slate-800 italic leading-relaxed">
                "{studentCommitmentText}"
              </p>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1 border-t border-teal-100">
                <span>Dấu ấn vân tay / Chữ ký điện tử của con:</span>
                <span className={"px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase " + (
                  signedByStudent ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                )}>
                  {signedByStudent ? "✓ Đã ký số cam kết" : "Chưa hoàn tất ký số"}
                </span>
              </div>
            </div>
          </div>

          {/* Card Lời Nhắn & Cam Kết Đồng Hành Của Phụ Huynh */}
          <div className="bg-white rounded-3xl p-6 border border-teal-200 shadow-sm space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-teal-100 pb-4">
              <h3 className="text-base font-black text-[#003B3A] flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-100" />
                <span>Lời Nhắn Gửi & Ký Cam Kết Đồng Hành Từ Gia Đình</span>
              </h3>
              {signed && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đã ký đồng hành</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Gửi gắm những tình cảm, niềm tin và sự ủng hộ của Phụ huynh đến con em. Lời nhắn sẽ được gửi trực tiếp đến Thầy Cô GVCN và lưu giữ trong Hồ sơ 360° của con.
            </p>

            <textarea
              rows={4}
              placeholder="Nhập những lời dặn dò, động viên và cam kết từ Ba Mẹ gửi đến con..."
              value={parentMessage}
              onChange={(e) => setParentMessage(e.target.value)}
              className="w-full p-4 rounded-2xl border border-slate-200 focus:border-[#00A99D] focus:ring-2 focus:ring-teal-100 outline-none text-xs font-semibold text-slate-800 leading-relaxed transition-all"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500 font-medium">
                Ký tên điện tử đại diện Gia đình Phụ huynh: <strong className="text-slate-800">{student.studentName || selectedStudent.studentName ? `Phụ huynh em ${student.studentName || selectedStudent.studentName}` : "Phụ huynh"}</strong>
              </div>
              <button
                type="button"
                onClick={handleSaveCommitment}
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md disabled:opacity-50 active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Đang lưu cam kết..." : "Gửi Lời Nhắn & Ký Cam Kết Đồng Hành"}</span>
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
