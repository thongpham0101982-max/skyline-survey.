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
  Sparkles,
  Award,
  GraduationCap,
  Calendar,
  MessageSquare,
  Star,
  CheckSquare,
  AlertCircle
} from "lucide-react"
import Link from "next/link"

export default function ParentAdvisoryClient() {
  const [childrenList, setChildrenList] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [goalsData, setGoalsData] = useState<any>(null)
  const [trackingLogs, setTrackingLogs] = useState<any[]>([])
  const [consultations, setConsultations] = useState<any[]>([])
  const [termEvals, setTermEvals] = useState<any[]>([])
  
  const [activeTab, setActiveTab] = useState<"goals" | "tracking" | "evaluations">("goals")
  const [selectedCheckPoint, setSelectedCheckPoint] = useState("DAU_NAM")
  const [selectedTerm, setSelectedTerm] = useState("HK1")

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
        const currentChild = childrenList.find(c => c.id === selectedStudentId)
        const stCode = currentChild?.studentCode || ""
        const [res360, resGoals, resTracking, resConsult, resEval] = await Promise.all([
          fetch(`/api/advisory/profile-360?studentId=${selectedStudentId}&academicYearId=${academicYearId}&_t=${Date.now()}`, { cache: "no-store" }),
          fetch(`/api/advisory/goals?studentId=${selectedStudentId}&studentCode=${stCode}&academicYearId=${academicYearId}&_t=${Date.now()}`, { cache: "no-store" }).catch(() => null),
          fetch(`/api/advisory/tracking?studentId=${selectedStudentId}&academicYearId=${academicYearId}&_t=${Date.now()}`, { cache: "no-store" }).catch(() => null),
          fetch(`/api/advisory/consultations?studentId=${selectedStudentId}&academicYearId=${academicYearId}&_t=${Date.now()}`, { cache: "no-store" }).catch(() => null),
          fetch(`/api/advisory/term-evaluations?studentId=${selectedStudentId}&academicYearId=${academicYearId}&_t=${Date.now()}`, { cache: "no-store" }).catch(() => null)
        ])
        
        let data360: any = null
        let dataGoals: any = null

        if (res360 && res360.ok) data360 = await res360.json()
        if (resGoals && resGoals.ok) dataGoals = await resGoals.json()
        if (resTracking && resTracking.ok) setTrackingLogs(await resTracking.json())
        if (resConsult && resConsult.ok) setConsultations(await resConsult.json())
        if (resEval && resEval.ok) setTermEvals(await resEval.json())

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
  }, [selectedStudentId, academicYearId, childrenList])

  async function handleSaveCommitment() {
    if (!selectedStudentId) return
    try {
      setSaving(true)
      const res = await fetch("/api/advisory/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          parentMessage,
          signedByParent: true
        })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setSigned(true)
        alert("✓ Đã lưu lời nhắn & ký cam kết đồng hành cùng con thành công!")
      } else {
        alert(data.error || "Có lỗi khi lưu cam kết. Vui lòng thử lại sau.")
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

  // Class & Grade Parsing for 6 Separate Grade Form Types
  const classNameStr = student.class?.className || selectedStudent.class?.className || "8.3_CS1"
  let gradeNum = "8"
  const matchNum = classNameStr.match(/(?:KHỐI|LỚP|K)?\s*(\d{1,2})/)
  if (matchNum && matchNum[1]) gradeNum = matchNum[1]

  const gVal = parseInt(gradeNum, 10) || 8

  // Grade Form Configuration:
  let formType = "6-8"
  let formTitle = "PHIẾU MỤC TIÊU NĂM HỌC — KHỐI " + gradeNum
  let formSub = "Bảng lập mục tiêu năm học gồm đúng 4 Nhóm mục tiêu chuẩn theo biểu mẫu của Hệ thống Trường Sky-Line."

  if (gVal === 1) {
    formType = "1"
    formTitle = "PHIẾU MỤC TIÊU NĂM HỌC — KHỐI 1"
    formSub = "Bảng lập mục tiêu khởi đầu Tiểu học dành riêng cho học sinh Khối 1."
  } else if (gVal === 2) {
    formType = "2"
    formTitle = "PHIẾU MỤC TIÊU NĂM HỌC — KHỐI 2"
    formSub = "Bảng lập mục tiêu rèn luyện tự giác dành riêng cho học sinh Khối 2."
  } else if (gVal === 3) {
    formType = "3"
    formTitle = "PHIẾU MỤC TIÊU NĂM HỌC — KHỐI 3"
    formSub = "Bảng lập mục tiêu phát triển kỹ năng tự học dành riêng cho học sinh Khối 3."
  } else if (gVal === 4 || gVal === 5) {
    formType = "4-5"
    formTitle = "PHIẾU MỤC TIÊU NĂM HỌC — KHỐI " + gradeNum
    formSub = "Bảng lập mục tiêu nâng cao năng lực & tự học dành riêng cho Khối 4 - 5."
  } else if (gVal >= 9) {
    formType = "9-12"
    formTitle = "PHIẾU MỤC TIÊU NĂM HỌC (SMART) — KHỐI " + gradeNum
    formSub = "Bảng lập mục tiêu định hướng tương lai SMART dành riêng cho Khối 9 - 12."
  }

  // 6 Separate Form Definitions
  const getCategoriesForForm = () => {
    if (formType === "1") {
      return [
        { key: "HOC_TAP", number: "1", title: "1. Mục tiêu học tập 📚", hint: "Gợi ý: Học đọc, học viết, tính toán cơ bản, tập trung trên lớp...", altKeys: ["HOC_TAP", "ACADEMIC"] },
        { key: "THOI_QUEN", number: "2", title: "2. Mục tiêu thói quen ⏰", hint: "Gợi ý: Ngủ đúng giờ, chuẩn bị đồ dùng học tập, tự cất gọn gàng...", altKeys: ["THOI_QUEN", "HEALTH"] },
        { key: "KY_NANG_CAM_XUC", number: "3", title: "3. Mục tiêu kỹ năng, cảm xúc 🎨", hint: "Gợi ý: Lễ phép chào hỏi, biết cảm ơn, xin lỗi, hòa đồng với bạn...", altKeys: ["KY_NANG_CAM_XUC", "SKILLS"] },
        { key: "DINH_HUONG", number: "4", title: "4. Mục tiêu ước mơ & sở thích 🌟", hint: "Gợi ý: Môn học yêu thích, ước mơ nhỏ của bé...", altKeys: ["DINH_HUONG", "ORIENTATION"] }
      ]
    } else if (formType === "2") {
      return [
        { key: "HOC_TAP", number: "1", title: "1. Mục tiêu học tập 📚", hint: "Gợi ý: Rèn chữ đẹp, đọc hiểu tốt, làm bài tập đầy đủ...", altKeys: ["HOC_TAP", "ACADEMIC"] },
        { key: "THOI_QUEN", number: "2", title: "2. Mục tiêu thói quen ⏰", hint: "Gợi ý: Tự giác học bài, tập thể dục, ăn uống khoa học...", altKeys: ["THOI_QUEN", "HEALTH"] },
        { key: "KY_NANG_CAM_XUC", number: "3", title: "3. Mục tiêu kỹ năng, cảm xúc 🎨", hint: "Gợi ý: Giao tiếp tự tin, biết lắng nghe, giúp đỡ bạn bè...", altKeys: ["KY_NANG_CAM_XUC", "SKILLS"] },
        { key: "DINH_HUONG", number: "4", title: "4. Mục tiêu ước mơ & năng khiếu 🚀", hint: "Gợi ý: Phát triển môn năng khiếu, hoạt động trải nghiệm yêu thích...", altKeys: ["DINH_HUONG", "ORIENTATION"] }
      ]
    } else if (formType === "3") {
      return [
        { key: "HOC_TAP", number: "1", title: "1. Mục tiêu học tập 📚", hint: "Gợi ý: Nâng cao điểm số các môn, từ vựng Tiếng Anh, toán tư duy...", altKeys: ["HOC_TAP", "ACADEMIC"] },
        { key: "THOI_QUEN", number: "2", title: "2. Mục tiêu thói quen ⏰", hint: "Gợi ý: Tự lập kế hoạch học tập, thói quen đọc sách mỗi ngày...", altKeys: ["THOI_QUEN", "HEALTH"] },
        { key: "KY_NANG_CAM_XUC", number: "3", title: "3. Mục tiêu kỹ năng, cảm xúc 🎨", hint: "Gợi ý: Thuyết trình ngắn, làm việc nhóm nhỏ, quản lý cảm xúc...", altKeys: ["KY_NANG_CAM_XUC", "SKILLS"] },
        { key: "DINH_HUONG", number: "4", title: "4. Mục tiêu khám phá & định hướng 🚀", hint: "Gợi ý: Khám phá các lĩnh vực mới, dự án cá nhân nhỏ...", altKeys: ["DINH_HUONG", "ORIENTATION"] }
      ]
    } else if (formType === "4-5") {
      return [
        { key: "HOC_TAP", number: "1", title: "1. Mục tiêu học tập", hint: "Gợi ý: Môn học, phương pháp tự học, kết quả học tập kỳ vọng...", altKeys: ["HOC_TAP", "ACADEMIC"] },
        { key: "THOI_QUEN", number: "2", title: "2. Mục tiêu thói quen & tự học", hint: "Gợi ý: Kỷ luật tự học, quản lý thời gian, sinh hoạt điều độ...", altKeys: ["THOI_QUEN", "HEALTH"] },
        { key: "KY_NANG_CAM_XUC", number: "3", title: "3. Mục tiêu kỹ năng & cảm xúc", hint: "Gợi ý: Thuyết trình, làm việc nhóm, tư duy phản biện nhẹ...", altKeys: ["KY_NANG_CAM_XUC", "SKILLS"] },
        { key: "DINH_HUONG", number: "4", title: "4. Mục tiêu năng khiếu & trải nghiệm", hint: "Gợi ý: CLB ngoại khóa, năng khiếu, dự án học tập...", altKeys: ["DINH_HUONG", "ORIENTATION"] }
      ]
    } else if (formType === "9-12") {
      return [
        { key: "HOC_TAP", number: "1", title: "1. Mục tiêu học tập & Thi cử (SMART)", hint: "Gợi ý: Điểm thi IELTS/SAT, thi Chuyên/Đại học target, điểm TB môn...", altKeys: ["HOC_TAP", "ACADEMIC"] },
        { key: "THOI_QUEN", number: "2", title: "2. Mục tiêu rèn luyện & Thói quen SMART", hint: "Gợi ý: Quản lý thời gian, kỷ luật bản thân, thể chất & sức khỏe...", altKeys: ["THOI_QUEN", "HEALTH"] },
        { key: "KY_NANG_CAM_XUC", number: "3", title: "3. Mục tiêu kỹ năng & Hồ sơ ngoại khóa", hint: "Gợi ý: Dự án cộng đồng, vai trò lãnh đạo, kỹ năng mềm...", altKeys: ["KY_NANG_CAM_XUC", "SKILLS"] },
        { key: "DINH_HUONG", number: "4", title: "4. Mục tiêu định hướng nghề nghiệp & Lộ trình", hint: "Gợi ý: Chọn ngành, chọn trường Đại học, kế hoạch săn học bổng...", altKeys: ["DINH_HUONG", "ORIENTATION"] }
      ]
    } else {
      // Khối 6 đến 8
      return [
        { key: "HOC_TAP", number: "1", title: "1. Mục tiêu học tập", hint: "Gợi ý: Môn học, phương pháp học, điểm số...", altKeys: ["HOC_TAP", "ACADEMIC"] },
        { key: "THOI_QUEN", number: "2", title: "2. Mục tiêu thói quen", hint: "Gợi ý: Kỷ luật, tự học, hoàn thành nhiệm vụ đúng thời hạn, thói quen ăn uống, nghỉ ngơi...", altKeys: ["THOI_QUEN", "HEALTH"] },
        { key: "KY_NANG_CAM_XUC", number: "3", title: "3. Mục tiêu kỹ năng, cảm xúc", hint: "Gợi ý: Giao tiếp, thuyết trình, làm việc nhóm, tư duy phản biện, quản lý cảm xúc...", altKeys: ["KY_NANG_CAM_XUC", "SKILLS"] },
        { key: "DINH_HUONG", number: "4", title: "4. Mục tiêu định hướng", hint: "Gợi ý: Khám phá bản thân, ngành nghề, lộ trình tương lai...", altKeys: ["DINH_HUONG", "ORIENTATION"] }
      ]
    }
  }

  const currentCategories = getCategoriesForForm()

  // Filter ALL goal items entered for category (supports multiple goals)
  const filterCategoryGoals = (catKey: string, altKeys: string[]) => {
    return allGoals.filter((g: any) => {
      const c = (g.category || "").toUpperCase()
      return c === catKey.toUpperCase() || altKeys.some(k => c.includes(k.toUpperCase()))
    })
  }

  // Student Commitment Text
  const studentCommitmentText = goalsData?.existingSheet?.studentCommitment || 
    profile?.learningCommitment?.studentCommitment || 
    allGoals.find((g: any) => g.studentCommitment)?.studentCommitment || ""

  // Active Term Eval
  const activeTermEval = termEvals.find((e: any) => e.term === selectedTerm) || null

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
          Đồng bộ liên thông dữ liệu 3 chiều giữa Học Sinh ➔ Giáo Viên Cố Vấn ➔ Phụ Huynh. Theo dõi phiếu mục tiêu, bảng theo dõi tiến độ & nhật ký check-in từ Thầy Cô.
        </p>
      </div>

      {/* Child Switcher Selector */}
      {childrenList.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <span className="text-xs font-black text-slate-600 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00A99D]" />
            <span>Chọn con em theo dõi (Năm học hiện tại):</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
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
          <p>Đang liên thông dữ liệu Cố vấn học tập Của Học Sinh...</p>
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
          
          {/* Card Trạng Thái Tín Hiệu Cố Vấn & Tóm Tắt Học Sinh */}
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

          {/* 3-WAY SYNCHRONIZED TAB BAR NAVIGATION (PH ↔ TEACHER ↔ HS) */}
          <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              onClick={() => setActiveTab("goals")}
              className={"px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all " + (
                activeTab === "goals"
                  ? "bg-[#003B3A] text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              <FileText className="w-4 h-4 text-teal-400" />
              <span>1. Phiếu Mục Tiêu Năm Học</span>
            </button>

            <button
              onClick={() => setActiveTab("tracking")}
              className={"px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all " + (
                activeTab === "tracking"
                  ? "bg-[#003B3A] text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              <Target className="w-4 h-4 text-amber-400" />
              <span>2. Tiến Độ & Nhật Ký Check-in GVCN ({trackingLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("evaluations")}
              className={"px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all " + (
                activeTab === "evaluations"
                  ? "bg-[#003B3A] text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              <Award className="w-4 h-4 text-rose-400" />
              <span>3. Đánh Giá Định Kỳ & Nhật Ký Tham Vấn ({consultations.length})</span>
            </button>
          </div>

          {/* TAB 1: PHIẾU MỤC TIÊU NĂM HỌC */}
          {activeTab === "goals" && (
            <div className="space-y-6">
              {/* Form Banner Header matching Exact Student Grade Form */}
              <div className="bg-teal-50/60 rounded-3xl p-5 border border-teal-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#00A99D] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 uppercase">
                      {formTitle}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {formSub}
                    </p>
                  </div>
                </div>
                <div className="bg-[#003B3A] text-white text-[11px] font-extrabold px-3.5 py-1.5 rounded-full shrink-0">
                  Mẫu biểu chuẩn Khối {gradeNum}
                </div>
              </div>

              {/* RENDER THE EXACT CATEGORIES & ALL ENTERED GOALS FOR SPECIFIC GRADE */}
              <div className="space-y-6">
                {currentCategories.map((catDef) => {
                  const catGoalsList = filterCategoryGoals(catDef.key, catDef.altKeys)

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
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase px-3 py-1 rounded-md tracking-wider">
                            NHÓM {catDef.number}
                          </span>
                        </div>
                      </div>

                      {catGoalsList.length === 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-teal-500" />
                              <span>Các mục tiêu cụ thể của em:</span>
                            </label>
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-400 font-normal italic leading-relaxed min-h-[90px]">
                              (Học sinh chưa nhập nội dung mục tiêu này)
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <span>Em sẽ làm gì để đạt được những mục tiêu này?</span>
                            </label>
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-400 font-normal italic leading-relaxed min-h-[90px]">
                              (Học sinh chưa nhập nội dung kế hoạch hành động)
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {catGoalsList.map((g: any, gIdx: number) => {
                            const actionTextStr = g?.actions && g.actions.length > 0 
                              ? g.actions.map((a: any) => a.actionText).join("; ")
                              : g?.actionText || ""

                            return (
                              <div key={gIdx} className="space-y-4 pt-1 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
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
                            )
                          })}
                        </div>
                      )}
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

          {/* TAB 2: BẢNG THEO DÕI TIẾN ĐỘ & NHẬT KÝ CHECK-IN GVCN */}
          {activeTab === "tracking" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#00A99D]" />
                    <span>Bảng Theo Dõi Tiến Độ Mục Tiêu & Nhật Ký Check-in GVCN</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Liên thông dữ liệu đánh giá tiến độ thực tế trực tiếp từ Thầy Cô GVCN trong từng đợt Check-in.
                  </p>
                </div>

                {/* Filter CheckPoint */}
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl shrink-0 text-xs font-bold">
                  <span className="px-2 text-slate-500 text-[11px]">Đợt check-in:</span>
                  {[
                    { key: "DAU_NAM", label: "Đầu năm" },
                    { key: "GIUA_HK1", label: "Giữa HK1" },
                    { key: "CUOI_HK1", label: "Cuối HK1" },
                    { key: "GIUA_HK2", label: "Giữa HK2" },
                    { key: "CUOI_HK2", label: "Cuối HK2" }
                  ].map(cp => (
                    <button
                      key={cp.key}
                      onClick={() => setSelectedCheckPoint(cp.key)}
                      className={"px-3 py-1.5 rounded-xl transition-all " + (
                        selectedCheckPoint === cp.key
                          ? "bg-white text-[#003B3A] shadow-xs font-black"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      {cp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table / Card List of Goal Check-in Logs */}
              {trackingLogs.length === 0 ? (
                <div className="p-12 rounded-3xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Chưa có nhật ký check-in tiến độ từ GVCN</p>
                  <p className="text-[11px] text-slate-400">Thầy cô GVCN sẽ tiến hành check-in đánh giá mục tiêu định kỳ trong năm học.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentCategories.map(catDef => {
                    const catLogs = trackingLogs.filter((t: any) => {
                      const c = (t.category || "").toUpperCase()
                      return c === catDef.key.toUpperCase() || catDef.altKeys.some(k => c.includes(k.toUpperCase()))
                    })

                    return (
                      <div key={catDef.key} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center justify-between">
                          <span>{catDef.title}</span>
                          <span className="text-[10px] text-slate-500 font-bold bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                            {catLogs.length} Đánh giá Check-in
                          </span>
                        </h4>

                        {catLogs.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">GVCN chưa tạo bản ghi check-in cho nhóm này trong đợt chọn.</p>
                        ) : (
                          <div className="space-y-3">
                            {catLogs.map((log: any, lIdx: number) => {
                              const stPill = log.progressStatus === "DAT" 
                                ? { bg: "bg-emerald-100 text-emerald-800 border-emerald-300", label: "🟢 ĐẠT MỤC TIÊU" }
                                : log.progressStatus === "CAN_CO_GAN"
                                ? { bg: "bg-rose-100 text-rose-800 border-rose-300", label: "🔴 CẦN CỐ GẮNG THÊM" }
                                : { bg: "bg-amber-100 text-amber-800 border-amber-300", label: "🟡 ĐANG TIẾN TRIỂN TỐT" }

                              return (
                                <div key={lIdx} className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-900">{log.targetText || "Mục tiêu năm học"}</span>
                                    <span className={"px-2.5 py-0.5 rounded-full text-[10px] font-black border " + stPill.bg}>
                                      {stPill.label}
                                    </span>
                                  </div>
                                  {log.teacherNotes ? (
                                    <div className="p-3 rounded-lg bg-teal-50/50 border border-teal-100 text-xs font-medium text-slate-700 flex items-start gap-2">
                                      <MessageSquare className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                                      <div>
                                        <strong className="text-teal-900 block font-bold text-[11px]">Ghi chú Check-in của GVCN:</strong>
                                        <span>{log.teacherNotes}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-slate-400 italic">Chưa có ghi chú bổ sung từ GVCN.</p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ĐÁNH GIÁ ĐỊNH KỲ RUBRIC & NHẬT KÝ THAM VẤN CỐ VẤN */}
          {activeTab === "evaluations" && (
            <div className="space-y-6">
              
              {/* Card 1: Rubric Evaluation Stars */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      <span>Đánh Giá Kỳ Theo Rubric Của GVCN</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Đánh giá mức độ tự giác, hoàn thành mục tiêu & khuyến nghị từ Giáo Viên Chủ Nhiệm.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {["HK1", "HK2"].map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedTerm(t)}
                        className={"px-3.5 py-1.5 rounded-xl text-xs font-black transition-all " + (
                          selectedTerm === t ? "bg-[#003B3A] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        Học kỳ {t === "HK1" ? "I" : "II"}
                      </button>
                    ))}
                  </div>
                </div>

                {!activeTermEval ? (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1 text-xs text-slate-400">
                    <AlertCircle className="w-6 h-6 mx-auto text-slate-400" />
                    <p className="font-bold">Chưa có bản đánh giá Rubric cho Học kỳ {selectedTerm === "HK1" ? "I" : "II"}</p>
                    <p>GVCN sẽ cập nhật bảng tổng kết Rubric vào cuối mỗi học kỳ.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-1">
                        <span className="text-[11px] font-bold text-amber-900 block">Mức độ hoàn thành mục tiêu</span>
                        <div className="flex items-center gap-1 text-amber-500">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={"w-4 h-4 " + (star <= (activeTermEval.goalCompletionLevel || 4) ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                          ))}
                          <span className="text-xs font-black text-amber-900 ml-1">({activeTermEval.goalCompletionLevel || 4}/5)</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-1">
                        <span className="text-[11px] font-bold text-teal-900 block">Tính tự giác & chủ động</span>
                        <div className="flex items-center gap-1 text-teal-500">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={"w-4 h-4 " + (star <= (activeTermEval.initiativeLevel || 4) ? "fill-teal-500 text-teal-500" : "text-slate-200")} />
                          ))}
                          <span className="text-xs font-black text-teal-900 ml-1">({activeTermEval.initiativeLevel || 4}/5)</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                        <span className="text-[11px] font-bold text-emerald-900 block">Thái độ tham gia hoạt động</span>
                        <div className="flex items-center gap-1 text-emerald-500">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={"w-4 h-4 " + (star <= (activeTermEval.participationAttitude || 5) ? "fill-emerald-500 text-emerald-500" : "text-slate-200")} />
                          ))}
                          <span className="text-xs font-black text-emerald-900 ml-1">({activeTermEval.participationAttitude || 5}/5)</span>
                        </div>
                      </div>
                    </div>

                    {activeTermEval.recommendations && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-xs font-extrabold text-[#003B3A] block">Khuyến nghị & Định hướng của GVCN:</span>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed">{activeTermEval.recommendations}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card 2: Academic Consultation Logs */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-teal-600" />
                      <span>Nhật Ký Tham Vấn Cố Vấn (GVCN & Gia Đình)</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Lịch sử các buổi tham vấn trực tiếp 1-1 giữa GVCN, Học sinh và Phụ huynh.
                    </p>
                  </div>
                  <span className="bg-teal-100 text-teal-800 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                    {consultations.length} Buổi tham vấn
                  </span>
                </div>

                {consultations.length === 0 ? (
                  <div className="p-12 rounded-3xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                    <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">Chưa có nhật ký tham vấn cá nhân</p>
                    <p className="text-[11px] text-slate-400">Các buổi làm việc cố vấn trực tiếp với GVCN sẽ được lưu trữ tại đây.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consultations.map((c: any, cIdx: number) => (
                      <div key={cIdx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-teal-600" />
                            <span className="text-xs font-black text-slate-900">
                              Ngày tham vấn: {c.meetingDate ? new Date(c.meetingDate).toLocaleDateString('vi-VN') : 'N/A'}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-md">
                            GVCN: {c.teacher?.teacherName || homeroomTeacherName}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <strong className="text-slate-800 block">Nội dung trao đổi:</strong>
                            <p className="text-slate-600 font-medium">{c.content}</p>
                          </div>

                          {c.difficulties && (
                            <div>
                              <strong className="text-rose-700 block">Khó khăn ghi nhận:</strong>
                              <p className="text-slate-600 font-medium">{c.difficulties}</p>
                            </div>
                          )}

                          {c.nextActions && (
                            <div>
                              <strong className="text-emerald-800 block">Lộ trình & giải pháp tiếp theo:</strong>
                              <p className="text-slate-600 font-medium">{c.nextActions}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  )
}
