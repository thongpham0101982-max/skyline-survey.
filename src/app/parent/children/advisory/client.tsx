"use client"

import { useState, useEffect } from "react"
import { 
  FileText, 
  Target, 
  Award, 
  ShieldCheck, 
  Sparkles, 
  Table, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Compass, 
  Users, 
  Heart, 
  MessageSquare, 
  Star,
  Layers,
  TrendingUp,
  Save,
  Check
} from "lucide-react"

export default function ParentAdvisoryClient({ initialProfile }: { initialProfile?: any }) {
  const [academicYearId, setAcademicYearId] = useState("")
  const [childrenList, setChildrenList] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  
  const [profile, setProfile] = useState<any>(initialProfile || null)
  const [goalsData, setGoalsData] = useState<any>(null)
  const [trackingLogs, setTrackingLogs] = useState<any[]>([])
  const [consultations, setConsultations] = useState<any[]>([])
  const [termEvals, setTermEvals] = useState<any[]>([])
  
  const [activeTab, setActiveTab] = useState<"goals" | "tracking" | "evaluations">("goals")
  const [selectedCheckPoint, setSelectedCheckPoint] = useState<"GIUA_KY_1" | "CUOI_KY_1" | "GIUA_KY_2" | "CUOI_KY_2">("GIUA_KY_1")
  const [selectedTerm, setSelectedTerm] = useState<"HK1" | "HK2">("HK1")
  const [viewMode, setViewMode] = useState<"card" | "table">("card")

  const [parentMessage, setParentMessage] = useState("")
  const [signed, setSigned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let year = ""
    if (typeof window !== "undefined") {
      year = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(year)
    }

    async function loadChildren(yId: string) {
      try {
        setLoading(true)
        const res = await fetch("/api/parent/children?academicYearId=" + yId + "&_t=" + Date.now(), { cache: "no-store" })
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

  const [lastSyncedTime, setLastSyncedTime] = useState<string>("")

  useEffect(() => {
    if (!selectedStudentId) {
      setLoading(false)
      return
    }

    async function loadData() {
      try {
        const currentChild = childrenList.find(c => c.id === selectedStudentId)
        const stCode = currentChild?.studentCode || ""
        const [res360, resGoals, resTracking, resConsult, resEval] = await Promise.all([
          fetch("/api/advisory/profile-360?studentId=" + selectedStudentId + "&academicYearId=" + academicYearId + "&_t=" + Date.now(), { cache: "no-store" }),
          fetch("/api/advisory/goals?studentId=" + selectedStudentId + "&studentCode=" + stCode + "&academicYearId=" + academicYearId + "&_t=" + Date.now(), { cache: "no-store" }).catch(() => null),
          fetch("/api/advisory/tracking?studentId=" + selectedStudentId + "&academicYearId=" + academicYearId + "&checkPoint=" + selectedCheckPoint + "&_t=" + Date.now(), { cache: "no-store" }).catch(() => null),
          fetch("/api/advisory/consultations?studentId=" + selectedStudentId + "&academicYearId=" + academicYearId + "&_t=" + Date.now(), { cache: "no-store" }).catch(() => null),
          fetch("/api/advisory/term-evaluations?studentId=" + selectedStudentId + "&academicYearId=" + academicYearId + "&_t=" + Date.now(), { cache: "no-store" }).catch(() => null)
        ])
        
        let data360: any = null
        let dataGoals: any = null

        if (res360 && res360.ok) data360 = await res360.json()
        if (resGoals && resGoals.ok) dataGoals = await resGoals.json()
        if (resTracking && resTracking.ok) setTrackingLogs(await resTracking.json())
        if (resConsult && resConsult.ok) setConsultations(await resConsult.json())
        if (resEval && resEval.ok) setTermEvals(await resEval.json())

        if (data360) setProfile(data360)
        if (dataGoals) setGoalsData(dataGoals)

        const commitmentMsg = data360?.learningCommitment?.parentMessage || dataGoals?.existingSheet?.parentMessage || ""
        const isSigned = Boolean(data360?.learningCommitment?.signedByParent || dataGoals?.existingSheet?.signedByParent)
        setParentMessage(commitmentMsg)
        setSigned(isSigned)

        const now = new Date()
        setLastSyncedTime(now.toLocaleTimeString("vi-VN"))

      } catch (e) {
        console.error("Error loading advisory data:", e)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Realtime Auto-Sync Polling every 4 seconds
    const intervalId = setInterval(() => {
      loadData()
    }, 4000)

    const handleFocus = () => loadData()
    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleFocus)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleFocus)
    }
  }, [selectedStudentId, academicYearId, childrenList, selectedCheckPoint])

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
  const rawGoalsList: any[] = 
    (goalsData?.existingSheet?.goals && goalsData.existingSheet.goals.length > 0)
      ? goalsData.existingSheet.goals
      : (goalsData?.goals && goalsData.goals.length > 0)
      ? goalsData.goals
      : (profile?.goals && profile.goals.length > 0)
      ? profile.goals
      : []

  const allGoals = rawGoalsList.filter((g: any) => Boolean(g && (g.targetText || g.category)))

  // Class & Grade Parsing for 6 Separate Grade Form Types
  const classNameStr = student.class?.className || selectedStudent.class?.className || "8.3_CS1"
  let gradeNum = "8"
  const matchNum = classNameStr.match(/(?:KHỐI|LỚP|K)?s*(d{1,2})/)
  if (matchNum && matchNum[1]) gradeNum = matchNum[1]

  // Grade Form Title & Categories matching standard 4 categories
  const formTitle = "PHIẾU MỤC TIÊU NĂM HỌC — KHỐI " + gradeNum
  const formSub = "Hiển thị đầy đủ 4 nhóm mục tiêu cá nhân do học sinh " + (student.studentName || selectedStudent.studentName || "con em") + " tự điền."

  const getCategoriesForForm = () => {
    return [
      { key: "HOC_TAP", label: "1. Mục tiêu học tập 📚", number: "01", altKeys: ["HOC_TAP", "ACADEMIC", "HỌC TẬP", "NHÓM 1"] },
      { key: "THOI_QUEN", label: "2. Mục tiêu thói quen ⏰", number: "02", altKeys: ["THOI_QUEN", "HEALTH", "THOI_QUEN_SUC_KHOE", "THÓI QUEN", "NHÓM 2"] },
      { key: "KY_NANG_CAM_XUC", label: "3. Mục tiêu kỹ năng, cảm xúc 🎨", number: "03", altKeys: ["KY_NANG_CAM_XUC", "SKILLS", "KY_NANG_SO_THICH", "KỸ NĂNG", "CẢM XÚC", "NHÓM 3"] },
      { key: "DINH_HUONG", label: "4. Mục tiêu định hướng 🚀", number: "04", altKeys: ["DINH_HUONG", "ORIENTATION", "PHAM_CHAT", "ĐỊNH HƯỚNG", "PHẨM CHẤT", "NHÓM 4"] }
    ]
  }

  const currentCategories = getCategoriesForForm()

  // Flexible Multi-Strategy Matching for Goal Categories
  const filterCategoryGoals = (catIndex: number, catKey: string, altKeys: string[]) => {
    // 1. Strict category string matching
    const matched = allGoals.filter((g: any) => {
      const c = (g.category || "").toUpperCase().trim()
      if (c === catKey.toUpperCase()) return true
      if (altKeys.some(k => c.includes(k.toUpperCase()))) return true
      if (catIndex === 0 && (c.includes("HỌC TẬP") || c.includes("HOC TAP") || c.includes("NHÓM 1") || c.includes("1"))) return true
      if (catIndex === 1 && (c.includes("THÓI QUEN") || c.includes("THOI QUEN") || c.includes("SUC KHOE") || c.includes("NHÓM 2") || c.includes("2"))) return true
      if (catIndex === 2 && (c.includes("KỸ NĂNG") || c.includes("KY NANG") || c.includes("CẢM XÚC") || c.includes("CAM XUC") || c.includes("NHÓM 3") || c.includes("3"))) return true
      if (catIndex === 3 && (c.includes("ĐỊNH HƯỚNG") || c.includes("DINH HUONG") || c.includes("PHẨM CHẤT") || c.includes("PHAM CHAT") || c.includes("NHÓM 4") || c.includes("4"))) return true
      return false
    })

    if (matched.length > 0) return matched

    // 2. Index-based array fallback if 4 goals exist
    if (allGoals[catIndex]) {
      return [allGoals[catIndex]]
    }

    return []
  }

  // Student Commitment Text - Strictly from Database
  const dbCommitment = goalsData?.existingSheet?.studentCommitment || 
    profile?.learningCommitment?.studentCommitment || 
    allGoals.find((g: any) => g.studentCommitment)?.studentCommitment || ""

  const studentCommitmentText = dbCommitment ? dbCommitment : "Học sinh chưa cập nhật lời cam kết cá nhân trên hệ thống."


  // Rubric Level Text Definitions
  const RUBRIC_TEXTS = {
    goalCompletion: [
      "",
      "Level 1: Hầu như không đạt được mục tiêu nào đã đặt ra trong Kế hoạch cá nhân",
      "Level 2: Đạt được một phần nhỏ; phần lớn mục tiêu chưa đạt",
      "Level 3: Đạt được khoảng một nửa số mục tiêu đã đặt ra",
      "Level 4: Đạt được phần lớn mục tiêu, còn một vài điểm chưa hoàn thành",
      "Level 5: Đạt đầy đủ hoặc vượt các mục tiêu đã đặt ra"
    ],
    initiative: [
      "",
      "Level 1: Hoàn toàn thụ động, phải nhắc nhở liên tục mới thực hiện",
      "Level 2: Ít chủ động, thường xuyên cần giáo viên nhắc nhở",
      "Level 3: Chủ động ở mức trung bình, thỉnh thoảng cần nhắc",
      "Level 4: Khá chủ động, tự thực hiện phần lớn công việc đã thống nhất",
      "Level 5: Rất chủ động, tự giác thực hiện và chủ động đề xuất thêm"
    ],
    participation: [
      "",
      "Level 1: Không hợp tác; thường vắng mặt hoặc từ chối trao đổi",
      "Level 2: Tham gia miễn cưỡng, ít chia sẻ trong buổi gặp",
      "Level 3: Tham gia đầy đủ nhưng còn dè dặt, ít chủ động chia sẻ",
      "Level 4: Tham gia tích cực, chia sẻ cởi mở với giáo viên",
      "Level 5: Rất tích cực; chủ động chia sẻ và đóng góp cho buổi gặp"
    ]
  }

  // Active Term Eval
  const activeTermEval = termEvals.find((e: any) => e.term === selectedTerm) || null

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans text-slate-800 pb-16">
      
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#36E08F] rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-2">
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
            <Users className="w-4 h-4 text-[#36E08F]" />
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
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Executive Student Advisory Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TÍN HIỆU THEO DÕI TỰ HỌC & CỐ VẤN</span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <span className={"px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wide border shadow-xs " + (
                  statusColor === "RED" ? "bg-rose-100 text-rose-800 border-rose-200" :
                  statusColor === "YELLOW" ? "bg-amber-100 text-amber-800 border-amber-200" :
                  "bg-emerald-100 text-emerald-800 border-emerald-200"
                )}>
                  {statusColor === "RED" ? "🔴 CẦN HỖ TRỢ ĐẶC BIỆT" : statusColor === "YELLOW" ? "🟡 CẦN THEO DÕI THÊM" : "🟢 ỔN ĐỊNH & PHÁT TRIỂN TỐT"}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1 text-right sm:text-right w-full sm:w-auto">
              <p className="font-extrabold text-slate-900">Học sinh: {student.studentName || selectedStudent.studentName}</p>
              <p className="text-slate-500 font-semibold">Lớp: {student.class?.className || selectedStudent.class?.className || '8.3_CS1'} • Mã HS: {student.studentCode || selectedStudent.studentCode}</p>
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

          {/* ========================================================================= */}
          {/* TAB 1: PHIẾU MỤC TIÊU NĂM HỌC — ĐỒNG NHẤT VỚI GIAO DIỆN THEO DÕI CỦA TEACHER */}
          {/* ========================================================================= */}
          {activeTab === "goals" && (
            <div className="space-y-6">
              
              {/* Header Line matching Teacher Goal Tracking */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="text-base font-black text-[#003B3A] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                    <span>Bảng Theo Dõi Tiến Độ Mục Tiêu: {student.studentName || selectedStudent.studentName} ({student.studentCode || selectedStudent.studentCode})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {formSub}
                  </p>
                </div>

                {/* Checkpoint selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Mốc kiểm tra:</span>
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                    {[
                      { id: "GIUA_KY_1", label: "Giữa kỳ 1" },
                      { id: "CUOI_KY_1", label: "Cuối kỳ 1" },
                      { id: "GIUA_KY_2", label: "Giữa kỳ 2" },
                      { id: "CUOI_KY_2", label: "Cuối kỳ 2" }
                    ].map(cp => (
                      <button
                        key={cp.id}
                        onClick={() => setSelectedCheckPoint(cp.id as any)}
                        className={
                          selectedCheckPoint === cp.id
                            ? "px-3 py-1 rounded-lg text-xs font-black transition-all bg-[#003B3A] text-white shadow-xs"
                            : "px-3 py-1 rounded-lg text-xs font-black transition-all text-slate-600 hover:text-slate-900"
                        }
                      >
                        {cp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Student Commitment Banner */}
              <div className="p-4.5 bg-teal-50 border-2 border-teal-200 rounded-3xl text-teal-950 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wide text-teal-900">
                    LỜI CAM KẾT VÀ XÁC NHẬN CỦA HỌC SINH ({(student.studentName || selectedStudent.studentName || "HỌC SINH").toUpperCase()}):
                  </span>
                </div>
                <p className="text-xs font-bold text-teal-800 italic pl-7 leading-relaxed">
                  "{studentCommitmentText}"
                </p>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider pl-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span>CHẾ ĐỘ HIỂN THỊ:</span>
                </span>

                <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("card")}
                    className={"px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 " + (
                      viewMode === "card"
                        ? "bg-[#003B3A] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Thẻ Dashboard Khoa Học</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={"px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 " + (
                      viewMode === "table"
                        ? "bg-[#003B3A] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Bảng Tổng Quan Gọn</span>
                  </button>
                </div>
              </div>

              {/* CARD DASHBOARD VIEW (ĐỒNG NHẤT HOÀN TOÀN VỚI TEACHER VIEW) */}
              {viewMode === "card" ? (
                <div className="grid grid-cols-1 gap-5">
                  {currentCategories.map((catDef, catIdx) => {
                    const catGoalsList = filterCategoryGoals(catIdx, catDef.key, catDef.altKeys)
                    const firstGoal = catGoalsList[0] || {}
                    const matchedLog = trackingLogs.find((t: any) => t.category?.includes(catDef.key) || t.targetText === firstGoal?.targetText)
                    
                    const progressStatus = matchedLog?.progressStatus || "CHUA_DANH_GIA"
                    const teacherNotes = matchedLog?.teacherNotes || ""

                    const actionTextStr = firstGoal?.actions && firstGoal.actions.length > 0 
                      ? firstGoal.actions.map((a: any) => a.actionText).join("; ")
                      : firstGoal?.actionText || ""

                    return (
                      <div key={catDef.key} className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden font-sans">
                        {/* Card Header (Category Title + Progress Status + Teacher Note) */}
                        <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-2xl bg-[#003B3A] text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                              {catDef.number}
                            </span>
                            <h4 className="font-black text-sm text-slate-900">
                              {catDef.label}
                            </h4>
                          </div>

                          {/* Status Pill & Teacher Note */}
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-[11px] font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                              Mốc: {selectedCheckPoint === "GIUA_KY_1" ? "Giữa kỳ 1" : selectedCheckPoint === "CUOI_KY_1" ? "Cuối kỳ 1" : selectedCheckPoint === "GIUA_KY_2" ? "Giữa kỳ 2" : "Cuối kỳ 2"}
                            </span>

                            <span className={"px-3 py-1.5 rounded-xl font-black text-xs border shadow-xs flex items-center gap-1.5 " + (
                              progressStatus === "DAT" ? "bg-emerald-500 text-white border-emerald-600" :
                              progressStatus === "CHUA_DAT" ? "bg-rose-500 text-white border-rose-600" :
                              progressStatus === "TIEN_TRIEN" ? "bg-amber-400 text-amber-950 border-amber-500" :
                              "bg-slate-100 text-slate-700 border-slate-300"
                            )}>
                              {progressStatus === "DAT" ? "🟢 Đạt" : progressStatus === "CHUA_DAT" ? "🔴 Chưa Đạt" : progressStatus === "TIEN_TRIEN" ? "🟡 Đang tiến triển" : "🟣 Chưa đánh giá"}
                            </span>

                            {teacherNotes && (
                              <span className="text-xs font-semibold text-slate-700 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 max-w-xs truncate" title={teacherNotes}>
                                💬 GVCN: {teacherNotes}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-5 sm:p-6">
                          {firstGoal && (firstGoal.targetText || actionTextStr) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              
                              {/* Left Box: Mục tiêu cụ thể & Kế hoạch */}
                              <div className="space-y-4 bg-slate-50/90 p-5 rounded-2xl border border-slate-200/80">
                                <div>
                                  <span className="text-[11px] font-black text-teal-800 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                                    MỤC TIÊU CỤ THỂ:
                                  </span>
                                  <p className="font-bold text-slate-900 leading-relaxed text-xs">
                                    {firstGoal.targetText || "Chưa điền mục tiêu"}
                                  </p>
                                </div>

                                {actionTextStr && (
                                  <div className="pt-3 border-t border-slate-200">
                                    <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                                      EM SẼ LÀM GÌ ĐỂ ĐẠT MỤC TIÊU NÀY:
                                    </span>
                                    <p className="font-semibold text-slate-800 leading-relaxed text-xs">
                                      {actionTextStr}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Right Box: Yêu cầu Hỗ trợ */}
                              <div className="space-y-3">
                                {/* Dedicated GVCN Check-in Assessment Box */}
                                <div className="p-4 rounded-2xl bg-teal-50/90 border-2 border-teal-200/90 space-y-1 shadow-2xs">
                                  <span className="font-black text-teal-950 text-xs flex items-center gap-1.5 uppercase">
                                    📝 Đánh Giá & Ghi Chú Tiến Độ Từ GVCN:
                                  </span>
                                  <p className="font-semibold text-teal-900 text-xs leading-relaxed italic">
                                    {teacherNotes ? '"' + teacherNotes + '"' : "Chưa có ghi chú nhận xét từ GVCN cho mốc kiểm tra này."}
                                  </p>
                                </div>

                                {firstGoal.teacherSupportRequest && (
                                  <div className="p-4 rounded-2xl bg-sky-50/90 border border-sky-200/80 space-y-1">
                                    <span className="font-black text-sky-950 text-xs flex items-center gap-1.5">
                                      💬 Thầy/Cô & Bạn bè hỗ trợ:
                                    </span>
                                    <p className="font-medium text-slate-800 text-xs leading-relaxed">
                                      {firstGoal.teacherSupportRequest}
                                    </p>
                                  </div>
                                )}

                                {firstGoal.parentSupportRequest && (
                                  <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200/80 space-y-1">
                                    <span className="font-black text-rose-950 text-xs flex items-center gap-1.5">
                                      🏫 Ba/Mẹ hỗ trợ:
                                    </span>
                                    <p className="font-medium text-slate-800 text-xs leading-relaxed">
                                      {firstGoal.parentSupportRequest}
                                    </p>
                                  </div>
                                )}
                              </div>

                            </div>
                          ) : (
                            <div className="p-6 text-center text-slate-400 font-bold text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                              Học sinh chưa điền nội dung mục tiêu nhóm này
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* TABLE VIEW SUMMARY */
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                        <th className="p-4">Nhóm Mục Tiêu</th>
                        <th className="p-4">Mục Tiêu Cụ Thể</th>
                        <th className="p-4">Kế Hoạch Thực Hiện</th>
                        <th className="p-4">Tiến Độ Check-in</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {currentCategories.map((catDef, catIdx) => {
                        const catGoalsList = filterCategoryGoals(catIdx, catDef.key, catDef.altKeys)
                        const firstGoal = catGoalsList[0] || {}
                        const matchedLog = trackingLogs.find((t: any) => t.category?.includes(catDef.key) || t.targetText === firstGoal?.targetText)
                        const progressStatus = matchedLog?.progressStatus || "CHUA_DANH_GIA"

                        return (
                          <tr key={catDef.key} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4 font-black text-slate-900">{catDef.label}</td>
                            <td className="p-4 font-bold text-slate-800">{firstGoal.targetText || "Chưa nhập"}</td>
                            <td className="p-4 text-slate-700">{firstGoal.actionText || "Chưa nhập"}</td>
                            <td className="p-4">
                              <span className={"px-2.5 py-1 rounded-lg text-[11px] font-black border " + (
                                progressStatus === "DAT" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                                progressStatus === "CHUA_DAT" ? "bg-rose-100 text-rose-800 border-rose-300" :
                                "bg-amber-100 text-amber-900 border-amber-300"
                              )}>
                                {progressStatus === "DAT" ? "🟢 Đạt" : progressStatus === "CHUA_DAT" ? "🔴 Chưa Đạt" : "🟡 Đang tiến triển"}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PARENT COMMITMENT & SIGNATURE BOX */}
              <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/50 to-amber-100/40 rounded-3xl p-6 sm:p-8 border-2 border-amber-200/90 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-amber-600 fill-amber-500" />
                    <h3 className="text-base font-black text-amber-950 uppercase tracking-tight">
                      LỜI CAM KẾT & CHỮ KÝ ĐỒNG HÀNH CỦA PHỤ HUYNH
                    </h3>
                  </div>
                  {signed && (
                    <span className="bg-emerald-600 text-white text-[11px] font-black px-3.5 py-1 rounded-full shadow-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã ký cam kết đồng hành</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-amber-900 font-medium leading-relaxed">
                  Quý Phụ huynh xem lại mục tiêu của con ở trên, nhập lời nhắn động viên và nhấn nút bên dưới để ký xác nhận đồng hành cùng con trong năm học này.
                </p>

                <textarea
                  value={parentMessage}
                  onChange={(e) => setParentMessage(e.target.value)}
                  placeholder="Nhập lời nhắn động viên, cam kết hỗ trợ tạo điều kiện cho con học tập tốt nhất..."
                  rows={3}
                  className="w-full p-4 rounded-2xl border border-amber-300/80 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 placeholder-amber-700/40 shadow-inner"
                />

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSaveCommitment}
                    disabled={saving}
                    className="px-6 py-3 rounded-2xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-amber-300" />
                    <span>{saving ? "Đang lưu cam kết..." : "✓ Lưu & Xác Nhận Cam Kết Đồng Hành"}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: TIẾN ĐỘ & NHẬT KÝ CHECK-IN GVCN */}
          {/* ========================================================================= */}
          {activeTab === "tracking" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                    <Target className="w-5 h-5 text-amber-500" />
                    <span>Nhật Ký Check-in Tiến Độ Từ Giáo Viên Chủ Nhiệm</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Ghi nhận đánh giá tiến độ thực hiện mục tiêu của con qua 4 mốc kiểm tra trong năm học.
                  </p>
                </div>
              </div>

              {trackingLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-medium text-xs bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  Chưa có nhật ký Check-in tiến độ từ Giáo viên chủ nhiệm cho mốc kiểm tra này.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trackingLogs.map((log: any, idx: number) => (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 font-sans">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-400 uppercase">MỐC: {log.checkPoint || 'GIỮA HK1'}</span>
                        <span className={"px-2.5 py-0.5 rounded-full text-[10px] font-black border " + (
                          log.progressStatus === "DAT" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                          log.progressStatus === "CHUA_DAT" ? "bg-rose-100 text-rose-800 border-rose-200" :
                          "bg-amber-100 text-amber-800 border-amber-200"
                        )}>
                          {log.progressStatus === "DAT" ? "🟢 Đạt" : log.progressStatus === "CHUA_DAT" ? "🔴 Chưa Đạt" : "🟡 Đang tiến triển"}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900">{log.category || 'Mục tiêu cá nhân'}</h4>
                      <p className="text-xs text-slate-700 font-bold">{log.targetText}</p>
                      {log.teacherNotes && (
                        <div className="pt-2 border-t border-slate-200 text-xs text-teal-800 font-semibold italic">
                          💬 Ghi chú nhận xét GVCN: "{log.teacherNotes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ĐÁNH GIÁ ĐỊNH KỲ & NHẬT KÝ THAM VẤN */}
          {/* ========================================================================= */}
          {activeTab === "evaluations" && (
            <div className="space-y-6">
              
              {/* RUBRIC EVALUATION SECTION (READ-ONLY FOR PARENT) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                        <Award className="w-5 h-5 text-rose-500" />
                        <span>Bảng Đánh Giá Định Kỳ Theo Rubric</span>
                      </h3>
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-slate-200">
                        🔒 Chế độ xem Phụ huynh (Kết quả từ GVCN)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Đánh giá 3 tiêu chí cốt lõi (Thang điểm 1 - 5) & Tiến độ chi tiết do Giáo viên chủ nhiệm đánh giá cho {student.studentName || selectedStudent.studentName}.
                    </p>
                  </div>

                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                    {["HK1", "HK2"].map((term) => (
                      <button
                        key={term}
                        onClick={() => setSelectedTerm(term as any)}
                        className={"px-4 py-1.5 rounded-lg text-xs font-black transition-all " + (
                          selectedTerm === term
                            ? "bg-[#003B3A] text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        Học kỳ {term === "HK1" ? "I" : "II"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3 Core Criteria Cards */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    
                    {/* Criteria 1: Goal Completion */}
                    <div className="p-5 rounded-3xl bg-amber-50/80 border-2 border-amber-200/90 space-y-3 font-sans flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block">TIÊU CHÍ 01</span>
                        <h4 className="text-xs font-black text-slate-900">Mức độ hoàn thành mục tiêu</h4>
                        <div className="flex items-center gap-1 text-amber-500 py-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={"w-5 h-5 " + (activeTermEval?.goalCompletionLevel && s <= activeTermEval.goalCompletionLevel ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                          ))}
                        </div>
                        <p className="text-[11px] font-semibold text-amber-950 leading-relaxed bg-white/70 p-3 rounded-2xl border border-amber-200/60">
                          {activeTermEval?.goalCompletionLevel ? (RUBRIC_TEXTS.goalCompletion[activeTermEval.goalCompletionLevel] || "Mức " + activeTermEval.goalCompletionLevel) : "- (Chưa đánh giá)"}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-amber-200/60 text-right">
                        <span className="text-xs font-black text-amber-900 bg-amber-200/60 px-3 py-1 rounded-full inline-block">
                          {activeTermEval?.goalCompletionLevel ? activeTermEval.goalCompletionLevel + "/5 Điểm" : "Chưa đánh giá"}
                        </span>
                      </div>
                    </div>

                    {/* Criteria 2: Initiative */}
                    <div className="p-5 rounded-3xl bg-teal-50/80 border-2 border-teal-200/90 space-y-3 font-sans flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-teal-900 uppercase tracking-wider block">TIÊU CHÍ 02</span>
                        <h4 className="text-xs font-black text-slate-900">Mức độ chủ động & Tự học</h4>
                        <div className="flex items-center gap-1 text-teal-600 py-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={"w-5 h-5 " + (activeTermEval?.initiativeLevel && s <= activeTermEval.initiativeLevel ? "fill-teal-500 text-teal-500" : "text-slate-300")} />
                          ))}
                        </div>
                        <p className="text-[11px] font-semibold text-teal-950 leading-relaxed bg-white/70 p-3 rounded-2xl border border-teal-200/60">
                          {activeTermEval?.initiativeLevel ? (RUBRIC_TEXTS.initiative[activeTermEval.initiativeLevel] || "Mức " + activeTermEval.initiativeLevel) : "- (Chưa đánh giá)"}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-teal-200/60 text-right">
                        <span className="text-xs font-black text-teal-900 bg-teal-200/60 px-3 py-1 rounded-full inline-block">
                          {activeTermEval?.initiativeLevel ? activeTermEval.initiativeLevel + "/5 Điểm" : "Chưa đánh giá"}
                        </span>
                      </div>
                    </div>

                    {/* Criteria 3: Participation */}
                    <div className="p-5 rounded-3xl bg-sky-50/80 border-2 border-sky-200/90 space-y-3 font-sans flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-sky-900 uppercase tracking-wider block">TIÊU CHÍ 03</span>
                        <h4 className="text-xs font-black text-slate-900">Thái độ tham gia đồng hành</h4>
                        <div className="flex items-center gap-1 text-sky-600 py-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={"w-5 h-5 " + (activeTermEval?.participationAttitude && s <= activeTermEval.participationAttitude ? "fill-sky-500 text-sky-500" : "text-slate-300")} />
                          ))}
                        </div>
                        <p className="text-[11px] font-semibold text-sky-950 leading-relaxed bg-white/70 p-3 rounded-2xl border border-sky-200/60">
                          {activeTermEval?.participationAttitude ? (RUBRIC_TEXTS.participation[activeTermEval.participationAttitude] || "Mức " + activeTermEval.participationAttitude) : "- (Chưa đánh giá)"}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-sky-200/60 text-right">
                        <span className="text-xs font-black text-sky-900 bg-sky-200/60 px-3 py-1 rounded-full inline-block">
                          {activeTermEval?.participationAttitude ? activeTermEval.participationAttitude + "/5 Điểm" : "Chưa đánh giá"}
                        </span>
                      </div>
                    </div>

                  </div>

                  {activeTermEval?.recommendations && (
                    <div className="p-5 rounded-3xl bg-teal-50/80 border border-teal-200 space-y-2">
                      <span className="font-black text-xs text-teal-950 uppercase flex items-center gap-1.5">
                        💡 Đề xuất khuyến nghị từ Thầy Cô Cố Vấn:
                      </span>
                      <p className="text-teal-900 font-semibold text-xs leading-relaxed pl-5 italic">
                        "{activeTermEval.recommendations}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Detailed 4 Goal Categories Rubric Table matching Teacher View Exactly */}
                <div className="pt-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                      <Table className="w-4 h-4 text-teal-600" />
                      <span>Bảng Đánh Giá Chi Tiết Theo Rubric - Đầy Đủ 8 Cột (Kết quả từ GVCN)</span>
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 animate-pulse">
                        👉 Cuộn ngang sang phải để xem đủ 8 cột
                      </span>
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                        Chuẩn Giao Diện GVCN
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                          <th className="p-3 border-r border-slate-200 min-w-[130px]">Học sinh</th>
                          <th className="p-3 border-r border-slate-200 min-w-[90px]">Kỳ đánh giá</th>
                          <th className="p-3 border-r border-slate-200 min-w-[220px]">Mục tiêu học tập</th>
                          <th className="p-3 border-r border-slate-200 min-w-[150px]">Kết quả theo dõi</th>
                          <th className="p-3 border-r border-slate-200 min-w-[170px]">Mức hoàn thành mục tiêu (1-5)</th>
                          <th className="p-3 border-r border-slate-200 min-w-[170px]">Mức độ chủ động (1-5)</th>
                          <th className="p-3 border-r border-slate-200 min-w-[170px]">Thái độ tham gia (1-5)</th>
                          <th className="p-3 min-w-[220px]">Khuyến nghị cho phụ huynh / giáo viên bộ môn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {currentCategories.map((catDef, catIdx) => {
                          const catGoalsList = filterCategoryGoals(catIdx, catDef.key, catDef.altKeys)
                          const firstGoal = catGoalsList[0] || {}
                          const matchedLog = trackingLogs.find((t: any) => t.category?.includes(catDef.key) || t.targetText === firstGoal?.targetText)
                          const progressStatus = matchedLog?.progressStatus || "CHUA_DANH_GIA"
                          const goalLevel = matchedLog?.goalCompletionLevel || activeTermEval?.goalCompletionLevel || null
                          const initiativeLevel = matchedLog?.initiativeLevel || activeTermEval?.initiativeLevel || null
                          const attitudeLevel = matchedLog?.participationAttitude || activeTermEval?.participationAttitude || null
                          const teacherNotes = matchedLog?.teacherNotes || (catIdx === 0 ? activeTermEval?.recommendations : "") || ""

                          return (
                            <tr key={catDef.key} className="bg-white hover:bg-slate-50/70 transition-colors">
                              {catIdx === 0 && (
                                <td rowSpan={currentCategories.length} className="p-3 border-r border-slate-200 font-black text-slate-900 align-top bg-slate-50/50">
                                  <div>{student.studentName || selectedStudent.studentName}</div>
                                  {(student.studentCode || selectedStudent.studentCode) && (
                                    <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                                      MS: {student.studentCode || selectedStudent.studentCode}
                                    </div>
                                  )}
                                </td>
                              )}

                              {catIdx === 0 && (
                                <td rowSpan={currentCategories.length} className="p-3 border-r border-slate-200 font-bold text-slate-700 align-top bg-slate-50/50">
                                  {selectedTerm === "HK1" ? "Học kỳ I" : "Học kỳ II"}
                                </td>
                              )}

                              {/* Mục tiêu học tập */}
                              <td className="p-3 border-r border-slate-200 align-top">
                                <div className="space-y-1.5">
                                  <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-black bg-teal-100 text-teal-900 border border-teal-200">
                                    {catDef.label}
                                  </span>
                                  <p className="text-xs font-bold text-slate-800 leading-snug">
                                    {firstGoal.targetText || "Em chưa điền nội dung mục tiêu nhóm này"}
                                  </p>
                                </div>
                              </td>

                              {/* Kết quả theo dõi */}
                              <td className="p-3 border-r border-slate-200 align-top">
                                <span className={"px-2.5 py-1 rounded-xl text-[11px] font-black border shadow-xs inline-flex items-center gap-1 " + (
                                  progressStatus === "DAT" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                                  progressStatus === "CHUA_DAT" ? "bg-rose-100 text-rose-800 border-rose-300" :
                                  progressStatus === "TIEN_TRIEN" ? "bg-amber-100 text-amber-900 border-amber-300" :
                                  "bg-slate-100 text-slate-600 border-slate-300"
                                )}>
                                  {progressStatus === "DAT" ? "🟢 Đạt" : progressStatus === "CHUA_DAT" ? "🔴 Chưa đạt" : progressStatus === "TIEN_TRIEN" ? "🟡 Đang tiến triển" : "🟣 Chưa đánh giá"}
                                </span>
                              </td>

                              {/* Mức hoàn thành mục tiêu (1-5) */}
                              <td className="p-3 border-r border-slate-200 align-top">
                                {goalLevel ? (
                                  <div className="p-2 rounded-xl bg-amber-50 text-amber-950 border border-amber-200 font-bold text-xs">
                                    Mức {goalLevel} - {RUBRIC_TEXTS.goalCompletion[goalLevel]?.slice(0, 28)}...
                                  </div>
                                ) : (
                                  <div className="p-2 rounded-xl bg-slate-50 text-slate-500 border border-slate-200 font-medium text-xs">
                                    - (Chưa đánh giá)
                                  </div>
                                )}
                              </td>

                              {/* Mức độ chủ động (1-5) */}
                              <td className="p-3 border-r border-slate-200 align-top">
                                {initiativeLevel ? (
                                  <div className="p-2 rounded-xl bg-blue-50 text-blue-950 border border-blue-200 font-bold text-xs">
                                    Mức {initiativeLevel} - {RUBRIC_TEXTS.initiative[initiativeLevel]?.slice(0, 28)}...
                                  </div>
                                ) : (
                                  <div className="p-2 rounded-xl bg-slate-50 text-slate-500 border border-slate-200 font-medium text-xs">
                                    - (Chưa đánh giá)
                                  </div>
                                )}
                              </td>

                              {/* Thái độ tham gia (1-5) */}
                              <td className="p-3 border-r border-slate-200 align-top">
                                {attitudeLevel ? (
                                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200 font-bold text-xs">
                                    Mức {attitudeLevel} - {RUBRIC_TEXTS.participation[attitudeLevel]?.slice(0, 28)}...
                                  </div>
                                ) : (
                                  <div className="p-2 rounded-xl bg-slate-50 text-slate-500 border border-slate-200 font-medium text-xs">
                                    - (Chưa đánh giá)
                                  </div>
                                )}
                              </td>

                              {/* Khuyến nghị cho phụ huynh / giáo viên bộ môn */}
                              <td className="p-3 align-top">
                                <p className="text-xs text-slate-700 font-semibold italic">
                                  {teacherNotes ? "💬 " + teacherNotes : "Chưa có ghi chú"}
                                </p>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* CONSULTATION LOGS SECTION */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <span>Nhật Ký Lịch Sử Tham Vấn Cố Vấn 1-1 ({consultations.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Nhật ký ghi nhận các buổi trao đổi, tham vấn 1-1 trực tiếp giữa Thầy Cô Cố Vấn và học sinh.
                  </p>
                </div>

                {consultations.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 font-medium text-xs bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    Chưa có ghi nhận nhật ký buổi tham vấn 1-1 nào.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consultations.map((c: any, idx: number) => (
                      <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 font-sans">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                            <span>📅 Ngày trao đổi: {new Date(c.meetingDate).toLocaleDateString("vi-VN")}</span>
                          </span>
                          <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-3 py-0.5 rounded-full">
                            {c.evaluatorName || "GV Cố Vấn"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="font-black text-slate-800 block mb-0.5">💬 Nội dung trao đổi:</span>
                            <p className="text-slate-700 font-medium leading-relaxed">{c.content || 'N/A'}</p>
                          </div>

                          <div>
                            <span className="font-black text-amber-800 block mb-0.5">⚠️ Khó khăn vướng mắc:</span>
                            <p className="text-slate-700 font-medium leading-relaxed">{c.difficulties || 'Không có'}</p>
                          </div>
                        </div>

                        {(c.nextActions || c.deadline) && (
                          <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-bold text-teal-800">🎯 Giải pháp tiếp theo: {c.nextActions || 'N/A'}</span>
                            {c.deadline && (
                              <span className="font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
                                ⏰ Hạn hoàn thành: {new Date(c.deadline).toLocaleDateString("vi-VN")}
                              </span>
                            )}
                          </div>
                        )}
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
