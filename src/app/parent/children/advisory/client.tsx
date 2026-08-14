"use client"

import { useState, useEffect } from "react"
import { 
  Heart, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  Compass, 
  FileText, 
  Users, 
  Target,
  BookOpen,
  Activity,
  Smile,
  Zap,
  Clock,
  AlertCircle
} from "lucide-react"
import Link from "next/link"

export default function ParentAdvisoryClient() {
  const [childrenList, setChildrenList] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [goalsData, setGoalsData] = useState<any>(null)
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

    async function loadData() {
      try {
        setLoading(true)
        const stCode = selectedStudent?.studentCode || ""
        const [res360, resGoals] = await Promise.all([
          fetch(`/api/advisory/profile-360?studentId=${selectedStudentId}&academicYearId=${academicYearId}&_t=${Date.now()}`, { cache: "no-store" }),
          fetch(`/api/advisory/goals?studentId=${selectedStudentId}&studentCode=${stCode}&academicYearId=${academicYearId}&_t=${Date.now()}`, { cache: "no-store" }).catch(() => null)
        ])
        
        let data360: any = null
        let dataGoals: any = null

        if (res360 && res360.ok) {
          data360 = await res360.json()
        }
        if (resGoals && resGoals.ok) {
          dataGoals = await resGoals.json()
        }

        if (data360) {
          setProfile(data360)
          setGoalsData(dataGoals)

          if (data360.learningCommitment) {
            setParentMessage(data360.learningCommitment.parentMessage || "")
            setSigned(!!data360.learningCommitment.signedByParent)
          } else if (dataGoals?.existingSheet) {
            setParentMessage(dataGoals.existingSheet.parentMessage || "")
            setSigned(!!dataGoals.existingSheet.signedByParent)
          } else {
            setParentMessage("")
            setSigned(false)
          }
        }
      } catch (e) {
        console.error("Error loading advisory data:", e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
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
  
  // Merge goals array from DB across all potential response payloads
  const allGoals: any[] = 
    (goalsData?.existingSheet?.goals && goalsData.existingSheet.goals.length > 0)
      ? goalsData.existingSheet.goals
      : (goalsData?.goals && goalsData.goals.length > 0)
      ? goalsData.goals
      : (profile?.goals && profile.goals.length > 0)
      ? profile.goals
      : []

  // Class & Grade info
  const classNameStr = student.class?.className || selectedStudent.class?.className || "8.3_CS1"
  let gradeNum = "8"
  const matchNum = classNameStr.match(/(?:KHỐI|LỚP|K)?\s*(\d{1,2})/)
  if (matchNum && matchNum[1]) gradeNum = matchNum[1]

  // 4 Target Categories matching exact Khối 6-8 Form Requirements
  const categoriesK68 = [
    {
      key: "HOC_TAP",
      number: "1",
      title: "1. Mục tiêu học tập",
      hint: "Gợi ý: Môn học, phương pháp học, điểm số...",
      altKeys: ["ACADEMIC", "HỌC TẬP"]
    },
    {
      key: "THOI_QUEN",
      number: "2",
      title: "2. Mục tiêu thói quen",
      hint: "Gợi ý: Kỷ luật, tự học, hoàn thành nhiệm vụ đúng thời hạn, thói quen ăn uống, nghỉ ngơi...",
      altKeys: ["THOI_QUEN_SUC_KHOE", "HEALTH", "SỨC KHỎE", "THÓI QUEN"]
    },
    {
      key: "KY_NANG_CAM_XUC",
      number: "3",
      title: "3. Mục tiêu kỹ năng, cảm xúc",
      hint: "Gợi ý: Giao tiếp, thuyết trình, làm việc nhóm, tư duy phản biện, quản lý cảm xúc...",
      altKeys: ["KY_NANG_SO_THICH", "SKILLS", "CẢM XÚC", "KỸ NĂNG"]
    },
    {
      key: "DINH_HUONG",
      number: "4",
      title: "4. Mục tiêu định hướng",
      hint: "Gợi ý: Khám phá bản thân, ngành nghề, lộ trình tương lai...",
      altKeys: ["DINH_HUONG_CAM_KET", "ORIENTATION", "ĐỊNH HƯỚNG"]
    }
  ]

  // Find goal item entered for category
  const findCategoryGoal = (catKey: string, altKeys: string[]) => {
    return allGoals.find((g: any) => {
      const c = (g.category || "").toUpperCase()
      return c === catKey.toUpperCase() || altKeys.some(k => c.includes(k.toUpperCase()))
    })
  }

  // Student Commitment Text
  const studentCommitmentText = goalsData?.existingSheet?.studentCommitment || 
    profile?.learningCommitment?.studentCommitment || 
    allGoals.find((g: any) => g.studentCommitment)?.studentCommitment || ""

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans text-slate-800 pb-16">
      
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A99D] rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-teal-100 uppercase tracking-wider">
          <Compass className="w-4 h-4 text-amber-300" />
          <span>PARENT PORTAL — SKYLINE ADVISORY</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
          Theo Dõi Cố Vấn & Mục Tiêu Đồng Hành
        </h1>
        <p className="text-xs sm:text-sm text-teal-100 font-medium max-w-3xl leading-relaxed">
          Theo dõi sát sao Form Đăng Ký Mục Tiêu Năm Học do con em nhập theo 4 Nhóm mục tiêu chuẩn Khối {gradeNum}, gửi lời nhắn & ký cam kết đồng hành từ Gia đình.
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
          <p>Đang nạp Phiếu Mục Tiêu Căn Bản Của Học Sinh...</p>
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
                TÍN HIỆU THEO DÕI TỰ HỌC & CỐ VẤN
              </span>
              <div className="flex items-center gap-3">
                <span className={"px-3.5 py-1 rounded-full text-xs font-black uppercase border " + (
                  statusColor === "RED" ? "bg-rose-100 text-rose-800 border-rose-300" :
                  statusColor === "YELLOW" ? "bg-amber-100 text-amber-800 border-amber-300" :
                  "bg-emerald-100 text-emerald-800 border-emerald-300"
                )}>
                  {statusColor === "RED" ? "🔴 Cần hỗ trợ đặc biệt" : statusColor === "YELLOW" ? "🟡 Cần theo dõi thêm" : "🟢 ỔN ĐỊNH & PHÁT TRIỂN TỐT"}
                </span>
              </div>
            </div>

            <div className="sm:text-right text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-0.5 min-w-[240px]">
              <p className="font-extrabold text-[#003B3A]">Học sinh: <strong className="text-slate-900">{student.studentName || selectedStudent.studentName || "N/A"}</strong></p>
              <p className="text-slate-500 font-semibold">Lớp: {classNameStr} • Mã HS: {student.studentCode || selectedStudent.studentCode || "N/A"}</p>
              <p className="text-teal-700 font-bold">GVCN: {homeroomTeacherName}</p>
            </div>
          </div>

          {/* Form Banner Header matching Student Grade Form */}
          <div className="bg-teal-50/60 rounded-3xl p-5 border border-teal-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00A99D] text-white flex items-center justify-center shrink-0 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase">
                  PHIẾU MỤC TIÊU NĂM HỌC — KHỐI {gradeNum}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Bảng lập mục tiêu năm học gồm đúng 4 Nhóm mục tiêu chuẩn theo biểu mẫu của Hệ thống Trường Sky-Line.
                </p>
              </div>
            </div>
            <div className="bg-[#003B3A] text-white text-[11px] font-extrabold px-3.5 py-1.5 rounded-full shrink-0">
              Mẫu biểu chuẩn Khối {gradeNum}
            </div>
          </div>

          {/* RENDER THE EXACT 4 CATEGORIES FORM FOR KHỐI 6 ĐẾN 8 */}
          <div className="space-y-6">
            {categoriesK68.map((catDef) => {
              const g = findCategoryGoal(catDef.key, catDef.altKeys)
              const actionTextStr = g?.actions && g.actions.length > 0 
                ? g.actions.map((a: any) => a.actionText).join("; ")
                : g?.actionText || ""

              return (
                <div key={catDef.key} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900 uppercase">
                        {catDef.title}
                      </h3>
                      <p className="text-xs text-slate-400 italic font-medium mt-0.5">
                        {catDef.hint}
                      </p>
                    </div>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase px-3 py-1 rounded-md tracking-wider">
                      NHÓM {catDef.number}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Field 1: Target */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-teal-500" />
                          <span>Các mục tiêu cụ thể của em:</span>
                        </label>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 leading-relaxed min-h-[90px]">
                          {g?.targetText ? (
                            <span>{g.targetText}</span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">(Học sinh chưa nhập nội dung mục tiêu này)</span>
                          )}
                        </div>
                      </div>

                      {/* Field 2: Actions */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>Em sẽ làm gì để đạt được những mục tiêu này?</span>
                        </label>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 leading-relaxed min-h-[90px]">
                          {actionTextStr ? (
                            <span>{actionTextStr}</span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">(Học sinh chưa nhập nội dung kế hoạch hành động)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Field 3: Teacher support */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#00A99D] flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>Em mong muốn thầy cô/ bạn bè hỗ trợ mình như thế nào?</span>
                        </label>
                        <div className="p-3.5 rounded-2xl bg-teal-50/40 border border-teal-100 text-xs font-semibold text-slate-800">
                          {g?.teacherSupportRequest ? (
                            <span>{g.teacherSupportRequest}</span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">(Học sinh chưa nhập yêu cầu hỗ trợ)</span>
                          )}
                        </div>
                      </div>

                      {/* Field 4: Parent support */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 fill-rose-100" />
                          <span>Em mong muốn ba mẹ hỗ trợ mình như thế nào?</span>
                        </label>
                        <div className="p-3.5 rounded-2xl bg-rose-50/40 border border-rose-100 text-xs font-semibold text-slate-800">
                          {g?.parentSupportRequest ? (
                            <span>{g.parentSupportRequest}</span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">(Học sinh chưa nhập yêu cầu hỗ trợ)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* LỜI CAM KẾT VÀ XÁC NHẬN CỦA HỌC SINH ✍️ */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#00A99D]" />
                <span>LỜI CAM KẾT VÀ XÁC NHẬN CỦA HỌC SINH ✍️</span>
              </h3>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  <span>Em cam kết sẽ:</span>
                </label>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 leading-relaxed">
                  {studentCommitmentText ? (
                    <span>{studentCommitmentText}</span>
                  ) : (
                    <span className="text-slate-400 font-normal italic">(Chưa có lời cam kết từ học sinh)</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* LỜI NHẮN GỬI & KÝ CAM KẾT ĐỒNG HÀNH TỪ GIA ĐÌNH */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-teal-200 shadow-sm space-y-4 font-sans">
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
              Gửi gắm những tình cảm, niềm tin và sự ủng hộ của Phụ huynh đến con em. Lời nhắn sẽ được lưu trữ trực tiếp trong Hồ sơ học tập 360° của con.
            </p>

            <textarea
              rows={4}
              placeholder="Ví dụ: Ba mẹ tin tưởng con sẽ nỗ lực hoàn thành xuất sắc mục tiêu học tập năm nay. Hãy luôn tự tin và vui vẻ con nhé! 💖"
              value={parentMessage}
              onChange={(e) => setParentMessage(e.target.value)}
              className="w-full p-4 rounded-2xl border border-slate-200 focus:border-[#00A99D] focus:ring-2 focus:ring-teal-100 outline-none text-xs font-semibold text-slate-800 leading-relaxed transition-all"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500 font-medium">
                Xác nhận đồng hành: <strong className="text-slate-800">{signed ? "✓ Đã ký số xác nhận" : "Chưa xác nhận cam kết đồng hành"}</strong>
              </div>
              <button
                type="button"
                onClick={handleSaveCommitment}
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md disabled:opacity-50 active:scale-95 transition-all"
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
