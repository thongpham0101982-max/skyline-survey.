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
  Printer,
  Check,
  MessageSquareText,
  School,
  CalendarCheck,
  Lightbulb
} from "lucide-react"
import {
  getGradeCategoryWeights,
  calculateAdvisoryEvaluation,
  matchCategoryKey
} from "@/lib/advisory/advisoryWeights"
import { useCampusTheme, resolveCampusTheme } from "@/hooks/useCampusTheme"

export default function ParentAdvisoryClient({ 
  initialChildren = [], 
  initialProfile = null 
}: { 
  initialChildren?: any[]
  initialProfile?: any 
}) {
  const [academicYearId, setAcademicYearId] = useState("")
  const [childrenList, setChildrenList] = useState<any[]>(initialChildren)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialChildren[0]?.id || "")
  
  const [profile, setProfile] = useState<any>(initialProfile || null)
  const [goalsData, setGoalsData] = useState<any>(null)
  const [trackingLogs, setTrackingLogs] = useState<any[]>([])
  const [parentHelpRequests, setParentHelpRequests] = useState<any[]>([])
  const [consultations, setConsultations] = useState<any[]>([])
  const [termEvals, setTermEvals] = useState<any[]>([])
  
  const [activeTab, setActiveTab] = useState<"goals" | "tracking" | "evaluations" | "consultations">("goals")
  const [acknowledgedLogs, setAcknowledgedLogs] = useState<Record<string, boolean>>({})
  const [selectedCheckPoint, setSelectedCheckPoint] = useState<"GIUA_KY_1" | "CUOI_KY_1" | "GIUA_KY_2" | "CUOI_KY_2">("GIUA_KY_1")
  const [selectedTerm, setSelectedTerm] = useState<"HK1" | "HK2">("HK1")
  const [viewMode, setViewMode] = useState<"card" | "table">("card")

  const [parentMessage, setParentMessage] = useState("")
  const [signed, setSigned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(initialChildren.length === 0)

  useEffect(() => {
    let year = ""
    if (typeof window !== "undefined") {
      year = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(year)
    }

    async function loadChildren(yId: string) {
      try {
        const res = await fetch("/api/parent/children?academicYearId=" + yId + "&_t=" + Date.now(), { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setChildrenList(data)
            setSelectedStudentId(prev => {
              if (prev && data.some((c: any) => c.id === prev)) return prev
              return data[0].id
            })
          } else if (!initialChildren.length) {
            setChildrenList([])
            setSelectedStudentId("")
          }
        }
      } catch (e) {
        console.error("Error loading parent children:", e)
      }
    }

    if (year) {
      loadChildren(year)
    }

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
      if (childrenList.length === 0) {
        setLoading(false)
      }
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

    // Smart Auto-Sync Polling (every 25 seconds)
    const intervalId = setInterval(() => {
      loadData()
    }, 25000)

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
  
  // Theme nhận diện theo cơ sở của con đang chọn
  const campusIdentifier = selectedStudent.class?.campus?.campusCode || 
    selectedStudent.class?.campus?.campusName || 
    selectedStudent.class?.className || 
    "CS1"
  const campusTheme = useCampusTheme(campusIdentifier)
  
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

  const currentChild = childrenList.find(c => c.id === selectedStudentId) || selectedStudent
  const childGrade = currentChild?.grade || currentChild?.className || "K12"
  const dynamicWeightCats = getGradeCategoryWeights(childGrade, currentChild?.className)

  const getCategoriesForForm = () => {
    return dynamicWeightCats.map((cat, idx) => {
      const numberStr = `0${idx + 1}`
      const theme = idx === 0 
        ? { border: "border-sky-200 hover:border-sky-300", badgeBg: "bg-sky-50 border-sky-200", badgeText: "text-sky-800", numberBadge: "bg-sky-600 text-white" }
        : idx === 1
        ? { border: "border-emerald-200 hover:border-emerald-300", badgeBg: "bg-emerald-50 border-emerald-200", badgeText: "text-emerald-800", numberBadge: "bg-emerald-600 text-white" }
        : idx === 2
        ? { border: "border-purple-200 hover:border-purple-300", badgeBg: "bg-purple-50 border-purple-200", badgeText: "text-purple-800", numberBadge: "bg-purple-600 text-white" }
        : { border: "border-amber-200 hover:border-amber-300", badgeBg: "bg-amber-50 border-amber-200", badgeText: "text-amber-950", numberBadge: "bg-amber-600 text-white" }

      return {
        key: cat.key,
        label: cat.label,
        weight: cat.weight,
        description: cat.description,
        number: numberStr,
        altKeys: [cat.key, cat.label],
        theme
      }
    })
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
      
      {/* Header Info Banner — Bám sát màu sắc Brandname Cơ sở Sky-Line */}
      <div 
        className="rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-3 transition-all duration-500 relative overflow-hidden"
        style={{ background: campusTheme.headerGradient }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-100 uppercase tracking-wider">
            <Compass className="w-4 h-4 text-amber-300" />
            <span>PARENT PORTAL — SKY-LINE ADVISORY</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-white text-slate-900 shadow-xs">
            <School className="w-3.5 h-3.5" style={{ color: campusTheme.primaryColor }} />
            <span>{campusTheme.name}</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
          Theo Dõi Cố Vấn & Mục Tiêu Đồng Hành
        </h1>
        <p className="text-xs sm:text-sm text-teal-100 font-medium max-w-3xl leading-relaxed">
          Đồng bộ liên thông dữ liệu 3 chiều giữa <strong className="text-white">Gia Đình ⇄ Thầy Cô GVCN ⇄ Học Sinh</strong>. Theo dõi phiếu mục tiêu, bảng theo dõi tiến độ & sổ nhật ký cố vấn từ Thầy Cô.
        </p>
      </div>

      {/* Child Switcher Selector */}
      {childrenList.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <span className="text-xs font-black text-slate-600 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#48BFE3]" />
            <span>Chọn con em theo dõi:</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {childrenList.map((c: any) => {
              const isSelected = selectedStudentId === c.id
              const cTheme = resolveCampusTheme(c.class?.campus?.campusName || c.class?.className || "Sky-Line")
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedStudentId(c.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected 
                      ? "text-white shadow-sm" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  style={isSelected ? { backgroundColor: campusTheme.darkColor } : {}}
                >
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: cTheme.primaryColor }}
                  />
                  <span>{c.studentName} ({c.class?.className || 'Chưa xếp lớp'})</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {childrenList.length === 0 ? (
        loading ? (
          <div className="py-20 text-center text-xs font-extrabold text-slate-400 animate-pulse space-y-2">
            <Compass className="w-8 h-8 mx-auto text-teal-500 animate-spin" />
            <p>Đang liên thông dữ liệu Cố vấn học tập Của Học Sinh...</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Chưa có dữ liệu con em</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              Tài khoản chưa có thông tin học sinh liên kết. Quý Phụ huynh vui lòng liên hệ Ban Giám hiệu hoặc GVCN để được hỗ trợ đồng bộ dữ liệu.
            </p>
          </div>
        )
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
              <p className="font-bold" style={{ color: campusTheme.primaryColor }}>GVCN: {homeroomTeacherName}</p>
            </div>
          </div>

          {/* 4-WAY SYNCHRONIZED TAB BAR NAVIGATION (PH ↔ TEACHER ↔ HS) */}
          <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              onClick={() => setActiveTab("goals")}
              className={"px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer " + (
                activeTab === "goals"
                  ? "text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
              style={activeTab === "goals" ? { backgroundColor: campusTheme.darkColor } : {}}
            >
              <FileText className="w-4 h-4 text-teal-400" />
              <span>1. Phiếu Mục Tiêu Năm Học</span>
            </button>

            <button
              onClick={() => setActiveTab("tracking")}
              className={"px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer " + (
                activeTab === "tracking"
                  ? "text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
              style={activeTab === "tracking" ? { backgroundColor: campusTheme.darkColor } : {}}
            >
              <Target className="w-4 h-4 text-amber-400" />
              <span>2. Tiến Độ & Check-in GVCN ({trackingLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("evaluations")}
              className={"px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer " + (
                activeTab === "evaluations"
                  ? "text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
              style={activeTab === "evaluations" ? { backgroundColor: campusTheme.darkColor } : {}}
            >
              <Award className="w-4 h-4 text-rose-400" />
              <span>3. Đánh Giá Định Kỳ</span>
            </button>

            <button
              onClick={() => setActiveTab("consultations")}
              className={"px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer " + (
                activeTab === "consultations"
                  ? "text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
              style={activeTab === "consultations" ? { backgroundColor: campusTheme.darkColor } : {}}
            >
              <MessageSquareText className="w-4 h-4 text-sky-400" />
              <span>4. Nhật Ký Cố Vấn Từ GVCN ({consultations.length})</span>
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
                  <button
                    type="button"
                    onClick={() => typeof window !== 'undefined' && window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs active:scale-95 mr-2 print:hidden"
                    title="In phiếu hoặc lưu PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>In / Tải PDF</span>
                  </button>
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

              {/* CARD DASHBOARD VIEW (ĐỒNG NHẤT HOÀN TOÀN VỚI HỌC SINH & TEACHER VIEW) */}
              {viewMode === "card" ? (
                <div className="grid grid-cols-1 gap-6">
                  {currentCategories.map((catDef, catIdx) => {
                    const catGoalsList = filterCategoryGoals(catIdx, catDef.key, catDef.altKeys)
                    const theme = catDef.theme

                    return (
                      <div key={catDef.key} className={`bg-white rounded-3xl border-2 ${theme.border} shadow-xs hover:shadow-md transition-all overflow-hidden font-sans space-y-4 p-5 sm:p-6`}>
                        {/* Category Header */}
                        <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-2xl ${theme.numberBadge} flex items-center justify-center font-black text-xs shadow-xs shrink-0`}>
                              {catDef.number}
                            </span>
                            <h4 className="font-black text-base text-slate-900 tracking-tight">
                              {catDef.label}
                            </h4>
                          </div>

                          <span className={`px-3 py-1 ${theme.badgeBg} ${theme.badgeText} border rounded-full text-xs font-black shadow-2xs`}>
                            {catGoalsList.length} mục tiêu đã tạo
                          </span>
                        </div>

                        {/* List of Goals under this Category */}
                        {catGoalsList.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 font-bold text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            Học sinh chưa điền nội dung mục tiêu nhóm này
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {catGoalsList.map((gItem: any, gIdx: number) => {
                              const matchedLog = trackingLogs.find((t: any) => 
                                (t.goalId && t.goalId === gItem.id) || 
                                (t.targetText && gItem.targetText && t.targetText.trim() === gItem.targetText.trim())
                              )
                              const progressStatus = matchedLog?.progressStatus || "CHUA_DANH_GIA"
                              const teacherNotes = matchedLog?.teacherNotes || ""
                              const actionTextStr = gItem?.actions && gItem.actions.length > 0 
                                ? gItem.actions.map((a: any) => a.actionText).join("; ")
                                : gItem?.actionText || ""

                              return (
                                <div key={gItem.id || gIdx} className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                                  {/* Sub-Header: Item Index & Progress Status Pill */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                                    <span className="text-xs font-black text-slate-800 flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[11px] flex items-center justify-center font-bold">
                                        #{gIdx + 1}
                                      </span>
                                      <span>MỤC TIÊU CỤ THỂ #{gIdx + 1}</span>
                                    </span>

                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                                        Mốc: {selectedCheckPoint === "GIUA_KY_1" ? "Giữa kỳ 1" : selectedCheckPoint === "CUOI_KY_1" ? "Cuối kỳ 1" : selectedCheckPoint === "GIUA_KY_2" ? "Giữa kỳ 2" : "Cuối kỳ 2"}
                                      </span>

                                      <span className={"px-3 py-1 rounded-xl font-black text-xs border shadow-xs flex items-center gap-1.5 " + (
                                        progressStatus === "DAT" ? "bg-emerald-500 text-white border-emerald-600" :
                                        progressStatus === "CHUA_DAT" ? "bg-rose-500 text-white border-rose-600" :
                                        progressStatus === "TIEN_TRIEN" ? "bg-amber-400 text-amber-950 border-amber-500" :
                                        "bg-slate-200 text-slate-700 border-slate-300"
                                      )}>
                                        {progressStatus === "DAT" ? "🟢 Đạt" : progressStatus === "CHUA_DAT" ? "🔴 Chưa Đạt" : progressStatus === "TIEN_TRIEN" ? "🟡 Đang tiến triển" : "⚪ Chưa đánh giá"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Content Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Left: Target & Action */}
                                    <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                                      <div>
                                        <span className="text-[11px] font-black text-teal-800 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                                          🎯 Nội dung mục tiêu cụ thể của em:
                                        </span>
                                        <p className="font-bold text-slate-900 leading-relaxed text-xs">
                                          {gItem.targetText || "Chưa nhập nội dung"}
                                        </p>
                                      </div>

                                      {actionTextStr && (
                                        <div className="pt-2.5 border-t border-slate-100">
                                          <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                                            ⚡ Em sẽ làm gì để đạt được mục tiêu này (Hành động cụ thể):
                                          </span>
                                          <p className="font-semibold text-slate-800 leading-relaxed text-xs">
                                            {actionTextStr}
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Right: GVCN Evaluation & Support Requests */}
                                    <div className="space-y-3">
                                      {/* GVCN Check-in Note */}
                                      <div className="p-3.5 rounded-xl bg-teal-50/90 border border-teal-200/90 space-y-1 shadow-2xs">
                                        <span className="font-black text-teal-950 text-xs flex items-center gap-1.5 uppercase">
                                          📝 Đánh Giá & Ghi Chú Từ GVCN:
                                        </span>
                                        <p className="font-semibold text-teal-900 text-xs leading-relaxed italic">
                                          {teacherNotes ? '"' + teacherNotes + '"' : "Chưa có ghi chú nhận xét từ GVCN cho mốc kiểm tra này."}
                                        </p>
                                      </div>

                                      {gItem.teacherSupportRequest && (
                                        <div className="p-3.5 rounded-xl bg-sky-50/90 border border-sky-200/80 space-y-1">
                                          <span className="font-black text-sky-950 text-xs flex items-center gap-1.5">
                                            💬 Em mong muốn Thầy Cô / bạn bè hỗ trợ mình như thế nào?
                                          </span>
                                          <p className="font-medium text-slate-800 text-xs leading-relaxed">
                                            {gItem.teacherSupportRequest}
                                          </p>
                                        </div>
                                      )}

                                      {gItem.parentSupportRequest && (
                                        <div className="p-3.5 rounded-xl bg-rose-50/90 border border-rose-200/80 space-y-1">
                                          <span className="font-black text-rose-950 text-xs flex items-center gap-1.5">
                                            🏡 Em mong muốn Ba Mẹ hỗ trợ mình như thế nào?
                                          </span>
                                          <p className="font-medium text-slate-800 text-xs leading-relaxed">
                                            {gItem.parentSupportRequest}
                                          </p>
                                        </div>
                                      )}
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
                </div>
              ) : (
                /* TABLE VIEW SUMMARY */
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                        <th className="p-4">Nhóm Mục Tiêu</th>
                        <th className="p-4">Mục Tiêu Cụ Thể</th>
                        <th className="p-4">Hành Động Cụ Thể</th>
                        <th className="p-4">Nội Dung Hỗ Trợ</th>
                        <th className="p-4">Tiến Độ Check-in</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {currentCategories.map((catDef, catIdx) => {
                        const catGoalsList = filterCategoryGoals(catIdx, catDef.key, catDef.altKeys)

                        if (catGoalsList.length === 0) {
                          return (
                            <tr key={catDef.key} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-4 font-black text-slate-900">{catDef.label}</td>
                              <td colSpan={4} className="p-4 text-slate-400 italic">Chưa nhập mục tiêu nhóm này</td>
                            </tr>
                          )
                        }

                        return catGoalsList.map((gItem: any, gIdx: number) => {
                          const matchedLog = trackingLogs.find((t: any) => 
                            (t.goalId && t.goalId === gItem.id) || 
                            (t.targetText && gItem.targetText && t.targetText.trim() === gItem.targetText.trim())
                          )
                          const progressStatus = matchedLog?.progressStatus || "CHUA_DANH_GIA"
                          const actionTextStr = gItem?.actions && gItem.actions.length > 0 
                            ? gItem.actions.map((a: any) => a.actionText).join("; ")
                            : gItem?.actionText || ""

                          return (
                            <tr key={gItem.id || gIdx} className="hover:bg-slate-50/80 transition-colors">
                              {gIdx === 0 && (
                                <td rowSpan={catGoalsList.length} className="p-4 font-black text-slate-900 bg-slate-50/40 align-top">
                                  {catDef.label}
                                </td>
                              )}
                              <td className="p-4 font-bold text-slate-800">{gItem.targetText || "Chưa nhập"}</td>
                              <td className="p-4 text-slate-700">{actionTextStr || "Chưa nhập"}</td>
                              <td className="p-4 space-y-1 text-[11px]">
                                {gItem.teacherSupportRequest && (
                                  <p className="text-sky-800 font-semibold">💬 GV: {gItem.teacherSupportRequest}</p>
                                )}
                                {gItem.parentSupportRequest && (
                                  <p className="text-rose-800 font-semibold">🏡 Ba/Mẹ: {gItem.parentSupportRequest}</p>
                                )}
                              </td>
                              <td className="p-4">
                                <span className={"px-2.5 py-1 rounded-lg text-[11px] font-black border " + (
                                  progressStatus === "DAT" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                                  progressStatus === "CHUA_DAT" ? "bg-rose-100 text-rose-800 border-rose-300" :
                                  progressStatus === "TIEN_TRIEN" ? "bg-amber-100 text-amber-950 border-amber-300" :
                                  "bg-slate-100 text-slate-700 border-slate-200"
                                )}>
                                  {progressStatus === "DAT" ? "🟢 Đạt" : progressStatus === "CHUA_DAT" ? "🔴 Chưa Đạt" : progressStatus === "TIEN_TRIEN" ? "🟡 Tiến triển" : "⚪ Chưa đánh giá"}
                                </span>
                              </td>
                            </tr>
                          )
                        })
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

              {/* SECTION: YÊU CẦU SOS CỦA CON & PHẢN HỒI GVCN */}
              <div className="pt-6 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    <span>Yêu Cầu Hỗ Trợ Khẩn Cấp (SOS) Của Con & Phản Hồi Từ GVCN ({parentHelpRequests.length})</span>
                  </h4>
                </div>

                {parentHelpRequests.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 font-medium text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Con chưa gửi yêu cầu hỗ trợ khẩn cấp (SOS) nào trong thời gian này.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {parentHelpRequests.map((req: any, idx: number) => (
                      <div key={req.id || idx} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={"px-3 py-1 rounded-full text-[11px] font-black border " + (
                            req.status === "RESOLVED" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                            req.status === "PROCESSING" ? "bg-amber-100 text-amber-900 border-amber-300" :
                            "bg-slate-100 text-slate-700 border-slate-300"
                          )}>
                            {req.status === "RESOLVED" ? "🟢 GVCN Đã Xử Lý Xong" : req.status === "PROCESSING" ? "🔵 GVCN Đang Hỗ Trợ / Xử Lý" : "🟡 Chờ Phản Hồi"}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            Mốc gửi: {new Date(req.createdAt).toLocaleString("vi-VN")}
                          </span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900">
                          <span className="text-[10px] font-black text-rose-600 uppercase block mb-1">Nội dung con cần giúp đỡ:</span>
                          "{req.content}"
                        </div>

                        {req.responseNotes && (
                          <div className="p-3.5 bg-teal-50 rounded-xl border border-teal-200 text-xs text-teal-950 font-bold space-y-1">
                            <span className="text-[10px] font-black text-teal-900 uppercase block">💬 Lời nhắn / Phản hồi từ Thầy/Cô GVCN:</span>
                            <p>"{req.responseNotes}"</p>
                            <span className="text-[10px] font-semibold text-teal-700 block pt-1 border-t border-teal-200/60 mt-1">
                              Nhật ký ngày giờ xử lý: {new Date(req.updatedAt || req.resolvedAt || req.createdAt).toLocaleString("vi-VN")}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

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

                  <div className="bg-white rounded-3xl border border-slate-200/90 overflow-x-auto shadow-md">
                    <table className="w-full text-left border-collapse text-xs table-auto">
                      <thead>
                        <tr className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#01A49D] text-white font-black border-b border-teal-800 shadow-xs">
                          <th className="p-3.5 border-r border-white/15 w-[130px] min-w-[120px] text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-teal-200" />
                              <span>1. Học sinh</span>
                            </div>
                          </th>
                          <th className="p-3.5 border-r border-white/15 w-[95px] min-w-[85px] text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-300" />
                              <span>2. Học kỳ</span>
                            </div>
                          </th>
                          <th className="p-3.5 border-r border-white/15 min-w-[280px] max-w-[420px]">
                            <div className="flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-emerald-300" />
                              <span>3. Nhóm & Mục tiêu cụ thể</span>
                            </div>
                          </th>
                          <th className="p-3.5 border-r border-white/15 w-[145px] min-w-[135px] text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-200" />
                              <span>4. Kết quả theo dõi</span>
                            </div>
                          </th>
                          <th className="p-3.5 border-r border-white/15 w-[155px] min-w-[145px] text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                              <span>5. Mức hoàn thành</span>
                            </div>
                          </th>
                          <th className="p-3.5 border-r border-white/15 w-[155px] min-w-[145px] text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-sky-200" />
                              <span>6. Mức độ chủ động</span>
                            </div>
                          </th>
                          <th className="p-3.5 border-r border-white/15 w-[155px] min-w-[145px] text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <Heart className="w-3.5 h-3.5 text-rose-300" />
                              <span>7. Thái độ tham gia</span>
                            </div>
                          </th>
                          <th className="p-3.5 min-w-[240px]">
                            <div className="flex items-center gap-1.5">
                              <MessageSquareText className="w-3.5 h-3.5 text-amber-300" />
                              <span>8. Khuyến nghị & Lời dặn GVCN</span>
                            </div>
                          </th>
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

                          // Bảng màu rực rỡ phân cấp theo từng nhóm mục tiêu
                          const CATEGORY_STYLE_MAP = [
                            {
                              borderLeft: "border-l-4 border-l-blue-600",
                              cardBg: "bg-blue-50/70 border-blue-200/90",
                              badgeBg: "bg-blue-600 text-white shadow-xs",
                              numBadge: "bg-[#003B3A] text-white",
                              iconColor: "text-blue-600",
                              textColor: "text-blue-950"
                            },
                            {
                              borderLeft: "border-l-4 border-l-emerald-600",
                              cardBg: "bg-emerald-50/70 border-emerald-200/90",
                              badgeBg: "bg-emerald-600 text-white shadow-xs",
                              numBadge: "bg-[#003B3A] text-white",
                              iconColor: "text-emerald-600",
                              textColor: "text-emerald-950"
                            },
                            {
                              borderLeft: "border-l-4 border-l-purple-600",
                              cardBg: "bg-purple-50/70 border-purple-200/90",
                              badgeBg: "bg-purple-600 text-white shadow-xs",
                              numBadge: "bg-[#003B3A] text-white",
                              iconColor: "text-purple-600",
                              textColor: "text-purple-950"
                            },
                            {
                              borderLeft: "border-l-4 border-l-amber-600",
                              cardBg: "bg-amber-50/70 border-amber-200/90",
                              badgeBg: "bg-amber-600 text-white shadow-xs",
                              numBadge: "bg-[#003B3A] text-white",
                              iconColor: "text-amber-600",
                              textColor: "text-amber-950"
                            }
                          ]

                          const catStyle = CATEGORY_STYLE_MAP[catIdx % CATEGORY_STYLE_MAP.length]

                          return (
                            <tr key={catDef.key} className={`bg-white hover:bg-slate-50/80 transition-colors ${catStyle.borderLeft}`}>
                              {/* 1. Học sinh */}
                              {catIdx === 0 && (
                                <td rowSpan={currentCategories.length} className="p-3.5 border-r border-slate-200 align-top bg-gradient-to-b from-slate-50 to-slate-100/60 text-center">
                                  <div className="space-y-2">
                                    <div 
                                      className="w-10 h-10 rounded-2xl mx-auto flex items-center justify-center font-black text-white text-sm shadow-md"
                                      style={{ backgroundColor: campusTheme.primaryColor }}
                                    >
                                      {(student.studentName || selectedStudent.studentName || "S").charAt(0)}
                                    </div>
                                    <div className="font-black text-slate-900 text-xs leading-snug">
                                      {student.studentName || selectedStudent.studentName}
                                    </div>
                                    {(student.studentCode || selectedStudent.studentCode) && (
                                      <div className="text-[11px] font-bold text-amber-900 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-lg inline-block shadow-2xs">
                                        MS: {student.studentCode || selectedStudent.studentCode}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              )}

                              {/* 2. Học kỳ */}
                              {catIdx === 0 && (
                                <td rowSpan={currentCategories.length} className="p-3.5 border-r border-slate-200 align-top bg-gradient-to-b from-slate-50 to-slate-100/60 text-center whitespace-nowrap">
                                  <span className="inline-block px-3 py-1.5 rounded-xl bg-slate-900 text-white shadow-xs font-black text-xs">
                                    {selectedTerm === "HK1" ? "Học kỳ I" : "Học kỳ II"}
                                  </span>
                                </td>
                              )}

                              {/* 3. Nhóm & Mục tiêu học tập cụ thể — BẮT MẮT & DỄ ĐỌC */}
                              <td className="p-3.5 border-r border-slate-200 align-top">
                                <div className={`p-3.5 rounded-2xl border ${catStyle.cardBg} space-y-2 transition-all hover:shadow-xs`}>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md ${catStyle.numBadge} text-[10px] font-black shadow-2xs`}>
                                      # MỤC TIÊU CỤ THỂ #{catIdx + 1}
                                    </span>
                                    <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black ${catStyle.badgeBg}`}>
                                      {catDef.label}
                                    </span>
                                  </div>
                                  <p className={`text-xs font-bold ${catStyle.textColor} leading-relaxed break-words`}>
                                    {firstGoal.targetText || "Em chưa điền nội dung mục tiêu nhóm này."}
                                  </p>
                                </div>
                              </td>

                              {/* 4. Kết quả theo dõi — TẠO ĐIỂM NHẤN TRẠNG THÁI */}
                              <td className="p-3.5 border-r border-slate-200 align-top text-center">
                                <span className={"px-3 py-1.5 rounded-xl text-xs font-black shadow-xs inline-flex items-center gap-1.5 whitespace-nowrap " + (
                                  progressStatus === "DAT" ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/25 border border-emerald-400" :
                                  progressStatus === "CHUA_DAT" ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-rose-500/25 border border-rose-400" :
                                  progressStatus === "TIEN_TRIEN" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/25 border border-amber-400" :
                                  "bg-purple-100 text-purple-900 border border-purple-200 font-bold"
                                )}>
                                  {progressStatus === "DAT" ? "🟢 Đạt Mục Tiêu" : 
                                   progressStatus === "CHUA_DAT" ? "🔴 Chưa Đạt" : 
                                   progressStatus === "TIEN_TRIEN" ? "🟡 Đang Tiến Triển" : 
                                   "🟣 Chưa Đánh Giá"}
                                </span>
                              </td>

                              {/* 5. Mức hoàn thành mục tiêu (1-5) */}
                              <td className="p-3.5 border-r border-slate-200 align-top text-center">
                                {goalLevel ? (
                                  <div className={`p-2.5 rounded-2xl border font-bold text-xs leading-snug shadow-2xs ${
                                    goalLevel >= 4 
                                      ? "bg-emerald-50 text-emerald-950 border-emerald-300 font-black" 
                                      : goalLevel === 3 
                                      ? "bg-amber-50 text-amber-950 border-amber-300" 
                                      : "bg-rose-50 text-rose-950 border-rose-200"
                                  }`}>
                                    <div className="font-black text-amber-700 mb-0.5">
                                      {goalLevel >= 4 ? "⭐ Mức " + goalLevel : "Mức " + goalLevel}
                                    </div>
                                    <div className="text-[11px] font-semibold text-slate-700">
                                      {RUBRIC_TEXTS.goalCompletion[goalLevel]?.slice(0, 32)}...
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-2 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 font-bold text-xs whitespace-nowrap">
                                    - Chưa ghi nhận -
                                  </div>
                                )}
                              </td>

                              {/* 6. Mức độ chủ động (1-5) */}
                              <td className="p-3.5 border-r border-slate-200 align-top text-center">
                                {initiativeLevel ? (
                                  <div className={`p-2.5 rounded-2xl border font-bold text-xs leading-snug shadow-2xs ${
                                    initiativeLevel >= 4 
                                      ? "bg-blue-50 text-blue-950 border-blue-300 font-black" 
                                      : initiativeLevel === 3 
                                      ? "bg-amber-50 text-amber-950 border-amber-300" 
                                      : "bg-rose-50 text-rose-950 border-rose-200"
                                  }`}>
                                    <div className="font-black text-blue-700 mb-0.5">
                                      {initiativeLevel >= 4 ? "⭐ Mức " + initiativeLevel : "Mức " + initiativeLevel}
                                    </div>
                                    <div className="text-[11px] font-semibold text-slate-700">
                                      {RUBRIC_TEXTS.initiative[initiativeLevel]?.slice(0, 32)}...
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-2 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 font-bold text-xs whitespace-nowrap">
                                    - Chưa ghi nhận -
                                  </div>
                                )}
                              </td>

                              {/* 7. Thái độ tham gia (1-5) */}
                              <td className="p-3.5 border-r border-slate-200 align-top text-center">
                                {attitudeLevel ? (
                                  <div className={`p-2.5 rounded-2xl border font-bold text-xs leading-snug shadow-2xs ${
                                    attitudeLevel >= 4 
                                      ? "bg-emerald-50 text-emerald-950 border-emerald-300 font-black" 
                                      : attitudeLevel === 3 
                                      ? "bg-amber-50 text-amber-950 border-amber-300" 
                                      : "bg-rose-50 text-rose-950 border-rose-200"
                                  }`}>
                                    <div className="font-black text-emerald-700 mb-0.5">
                                      {attitudeLevel >= 4 ? "⭐ Mức " + attitudeLevel : "Mức " + attitudeLevel}
                                    </div>
                                    <div className="text-[11px] font-semibold text-slate-700">
                                      {RUBRIC_TEXTS.participation[attitudeLevel]?.slice(0, 32)}...
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-2 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 font-bold text-xs whitespace-nowrap">
                                    - Chưa ghi nhận -
                                  </div>
                                )}
                              </td>

                              {/* 8. Khuyến nghị cho phụ huynh / giáo viên bộ môn — HỘP THẺ LỜI DẶN */}
                              <td className="p-3.5 align-top">
                                <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-yellow-50/70 border border-amber-200/90 rounded-2xl p-3 shadow-xs space-y-1">
                                  <div className="flex items-center gap-1.5 font-black text-amber-900 text-[11px]">
                                    <MessageSquareText className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Lời dặn của GVCN:</span>
                                  </div>
                                  <p className="text-xs text-amber-950 font-bold italic leading-relaxed break-words">
                                    {teacherNotes ? `“${teacherNotes}”` : "“Kính mong Gia đình tiếp tục nhắc nhở và tạo điều kiện cho con thực hiện tốt mục tiêu.”"}
                                  </p>
                                </div>
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

          {/* ========================================================================= */}
          {/* TAB 4: NHẬT KÝ CỐ VẤN TỪ GVCN — THEO DÕI CÁC BUỔI CỐ VẤN & LỜI DẶN DÒ */}
          {/* ========================================================================= */}
          {activeTab === "consultations" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: campusTheme.lightAccentBg,
                        color: campusTheme.primaryColor,
                        borderColor: campusTheme.borderSubtle
                      }}
                    >
                      ĐỒNG HÀNH 3 CHIỀU: GIA ĐÌNH ⇄ GVCN ⇄ HỌC SINH
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 pt-1">
                    <MessageSquareText className="w-5 h-5 text-sky-600" />
                    <span>Sổ Nhật Ký Cố Vấn & Trao Đổi Từ GVCN</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Ghi nhận chi tiết các buổi tư vấn, hướng dẫn phương pháp học tập, rèn luyện nề nếp và kế hoạch hành động giữa Thầy/Cô và Con.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs shrink-0 flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-xs"
                    style={{ backgroundColor: campusTheme.primaryColor }}
                  >
                    {consultations.length}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng số buổi cố vấn</div>
                    <div className="font-black text-slate-800">Đã lưu trong năm học</div>
                  </div>
                </div>
              </div>

              {consultations.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 shadow-xs space-y-4">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-inner border"
                    style={{
                      backgroundColor: campusTheme.lightAccentBg,
                      borderColor: campusTheme.borderSubtle
                    }}
                  >
                    <CalendarCheck className="w-8 h-8" style={{ color: campusTheme.primaryColor }} />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h4 className="text-base font-black text-slate-900">
                      Chưa có biên bản cố vấn nào được ghi nhận
                    </h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Thầy Cô GVCN sẽ tổ chức các phiên cố vấn 1-1 định kỳ (học kỳ, tháng, sau các đợt kiểm tra) để đồng hành cùng con. Nhật ký và lời dặn dò sẽ tự động hiển thị tại đây ngay sau mỗi buổi gặp.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {consultations.map((c: any, idx: number) => {
                    const logDate = c.meetingDate ? new Date(c.meetingDate).toLocaleDateString("vi-VN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    }) : "Chưa xác định"
                    const teacherName = c.teacher?.teacherName || c.evaluatorName || homeroomTeacherName
                    const isAcknowledged = Boolean(acknowledgedLogs[c.id || idx])

                    return (
                      <div 
                        key={c.id || idx}
                        className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-5 relative overflow-hidden"
                      >
                        {/* Top Accent Strip */}
                        <div 
                          className="absolute top-0 left-0 right-0 h-1.5"
                          style={{ backgroundColor: campusTheme.primaryColor }}
                        />

                        {/* Header card */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs"
                              style={{ backgroundColor: campusTheme.darkColor }}
                            >
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 capitalize">
                                  {logDate}
                                </span>
                                {c.category && (
                                  <span 
                                    className="text-[10px] font-black px-2 py-0.5 rounded-full border uppercase"
                                    style={{
                                      backgroundColor: campusTheme.lightAccentBg,
                                      color: campusTheme.primaryColor,
                                      borderColor: campusTheme.borderSubtle
                                    }}
                                  >
                                    {c.category}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                Cố vấn phụ trách: <strong className="text-slate-800">{teacherName}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Đã hoàn thành</span>
                            </span>
                          </div>
                        </div>

                        {/* Grid Thông tin buổi cố vấn */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                          
                          {/* 1. Nội dung trao đổi */}
                          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
                            <div className="flex items-center gap-1.5 font-black text-slate-900">
                              <MessageSquareText className="w-4 h-4 text-sky-600" />
                              <span>1. Nội dung trao đổi & Hướng dẫn:</span>
                            </div>
                            <p className="text-slate-700 font-medium leading-relaxed pl-5 whitespace-pre-line">
                              {c.content || "Chưa có nội dung ghi nhận."}
                            </p>
                          </div>

                          {/* 2. Khó khăn vướng mắc của học sinh */}
                          <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/70 space-y-1.5">
                            <div className="flex items-center gap-1.5 font-black text-amber-900">
                              <Lightbulb className="w-4 h-4 text-amber-600" />
                              <span>2. Khó khăn / Điểm cần rèn luyện:</span>
                            </div>
                            <p className="text-slate-700 font-medium leading-relaxed pl-5 whitespace-pre-line">
                              {c.difficulties || "Không có khó khăn vướng mắc đáng kể."}
                            </p>
                          </div>

                          {/* 3. Kế hoạch hành động / Giải pháp tiếp theo */}
                          <div className="bg-teal-50/40 p-4 rounded-2xl border border-teal-200/70 space-y-1.5">
                            <div className="flex items-center gap-1.5 font-black text-teal-900">
                              <Target className="w-4 h-4 text-teal-600" />
                              <span>3. Kế hoạch hành động & Giải pháp:</span>
                            </div>
                            <p className="text-slate-700 font-medium leading-relaxed pl-5 whitespace-pre-line">
                              {c.nextActions || "Duy trì phong độ học tập và nề nếp hiện tại."}
                            </p>
                            {c.deadline && (
                              <div className="pl-5 pt-1">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200">
                                  <Clock className="w-3 h-3" />
                                  <span>Hạn mốc theo dõi: {new Date(c.deadline).toLocaleDateString("vi-VN")}</span>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* 4. Lời dặn dò của GVCN gửi cho Phụ Huynh */}
                          <div 
                            className="p-4 rounded-2xl border space-y-1.5"
                            style={{
                              backgroundColor: campusTheme.lightBg,
                              borderColor: campusTheme.borderSubtle
                            }}
                          >
                            <div 
                              className="flex items-center gap-1.5 font-black"
                              style={{ color: campusTheme.darkColor }}
                            >
                              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                              <span>4. Lời dặn của GVCN gửi Quý Phụ Huynh:</span>
                            </div>
                            <p className="text-slate-700 font-medium leading-relaxed pl-5 italic">
                              {c.notes ? `“${c.notes}”` : "“Kính mong Quý Phụ huynh tiếp tục đồng hành và nhắc nhở con theo kế hoạch trên.”"}
                            </p>
                          </div>

                        </div>

                        {/* Footer Xác Nhận Của Phụ Huynh */}
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <span className="text-slate-500 font-medium">
                            {isAcknowledged 
                              ? "✓ Quý Phụ huynh đã xác nhận đã đọc và phối hợp cùng GVCN."
                              : "Quý Phụ huynh vui lòng bấm xác nhận sau khi xem lời dặn của Thầy/Cô."}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setAcknowledgedLogs(prev => ({ ...prev, [c.id || idx]: true }))
                              alert("✓ Đã gửi xác nhận phối hợp đến GVCN thành công!")
                            }}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              isAcknowledged
                                ? "bg-emerald-600 text-white shadow-xs cursor-default"
                                : "bg-slate-900 hover:bg-slate-800 text-white shadow-xs active:scale-95"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isAcknowledged ? "Đã xác nhận phối hợp" : "Xác nhận đã đọc & Phối hợp"}</span>
                          </button>
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  )
}
