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
  Compass,
  Users,
  Heart,
  Star,
  Layers,
  TrendingUp,
  Save,
  Printer,
  Check,
  MessageSquareText,
  School,
  BookOpen
} from "lucide-react"
import { getGradeCategoryWeights } from "@/lib/advisory/advisoryWeights"
import { useCampusTheme, resolveCampusTheme } from "@/hooks/useCampusTheme"
import TriPartyWorkflowBanner from "@/components/advisory/TriPartyWorkflowBanner"
import ParentExchangeWidget from "@/components/advisory/ParentExchangeWidget"
import ParentProgressTrackingTable from "@/components/advisory/ParentProgressTrackingTable"
import ParentGvbmAdvisorySection from "@/components/advisory/ParentGvbmAdvisorySection"
import { AcademicComparisonWidget } from "@/components/advisory/AcademicComparisonWidget"

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
  const [parentHelpRequests] = useState<any[]>([])
  const [consultations, setConsultations] = useState<any[]>([])
  const [termEvals, setTermEvals] = useState<any[]>([])

  const [activeTab, setActiveTab] = useState<
    "goals" | "tracking" | "evaluations" | "consultations" | "gvbm_advisory"
  >("goals")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const tabParam = (params.get("tab") || "").toLowerCase()
      if (tabParam === "tracking") {
        setActiveTab("tracking")
      } else if (tabParam === "evaluations") {
        setActiveTab("evaluations")
      } else if (tabParam === "consultations") {
        setActiveTab("consultations")
      } else if (tabParam === "gvbm_advisory") {
        setActiveTab("gvbm_advisory")
      }
    }
  }, [])
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
  }, [initialChildren.length])

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
      } catch (e) {
        console.error("Error loading advisory data:", e)
      } finally {
        setLoading(false)
      }
    }

    loadData()

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
  const homeroomTeacherName =
    selectedStudent.homeroomTeacherName ||
    student.homeroomTeacherName ||
    (student.class?.homeroomTeacherId ? "Phụ trách chuyên môn" : "Chưa phân công")

  const campusIdentifier =
    selectedStudent.class?.campus?.campusCode ||
    selectedStudent.class?.campus?.campusName ||
    selectedStudent.class?.className ||
    "CS1"
  const campusTheme = useCampusTheme(campusIdentifier)

  const rawGoalsList: any[] =
    goalsData?.existingSheet?.goals && goalsData.existingSheet.goals.length > 0
      ? goalsData.existingSheet.goals
      : goalsData?.goals && goalsData.goals.length > 0
      ? goalsData.goals
      : profile?.goals && profile.goals.length > 0
      ? profile.goals
      : []

  const allGoals = rawGoalsList.filter((g: any) => Boolean(g && (g.targetText || g.category)))

  const currentChild = childrenList.find(c => c.id === selectedStudentId) || selectedStudent
  const childGrade = currentChild?.grade || currentChild?.className || "K12"
  const dynamicWeightCats = getGradeCategoryWeights(childGrade, currentChild?.className)

  const currentCategories = dynamicWeightCats.map((cat, idx) => {
    const numberStr = `0${idx + 1}`
    const theme =
      idx === 0
        ? {
            border: "border-slate-200/80",
            badgeBg: "bg-sky-50 border-sky-200/70",
            badgeText: "text-sky-700",
            numberBadge: "bg-sky-600 text-white"
          }
        : idx === 1
        ? {
            border: "border-slate-200/80",
            badgeBg: "bg-emerald-50 border-emerald-200/70",
            badgeText: "text-emerald-700",
            numberBadge: "bg-emerald-600 text-white"
          }
        : idx === 2
        ? {
            border: "border-slate-200/80",
            badgeBg: "bg-teal-50 border-teal-200/70",
            badgeText: "text-teal-800",
            numberBadge: "bg-[#003B3A] text-white"
          }
        : {
            border: "border-slate-200/80",
            badgeBg: "bg-amber-50 border-amber-200/70",
            badgeText: "text-amber-800",
            numberBadge: "bg-amber-600 text-white"
          }

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

  const filterCategoryGoals = (catIndex: number, catKey: string, altKeys: string[]) => {
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
    if (allGoals[catIndex]) return [allGoals[catIndex]]
    return []
  }

  const dbCommitment =
    goalsData?.existingSheet?.studentCommitment ||
    profile?.learningCommitment?.studentCommitment ||
    allGoals.find((g: any) => g.studentCommitment)?.studentCommitment ||
    ""

  const studentCommitmentText = dbCommitment
    ? dbCommitment
    : "Học sinh chưa cập nhật lời cam kết cá nhân trên hệ thống."

  const RUBRIC_TEXTS = {
    goalCompletion: [
      "",
      "Mức 1: Chưa đạt được mục tiêu đề ra",
      "Mức 2: Đạt một phần nhỏ mục tiêu",
      "Mức 3: Đạt khoảng một nửa số mục tiêu",
      "Mức 4: Đạt phần lớn mục tiêu đề ra",
      "Mức 5: Đạt đầy đủ hoặc vượt mục tiêu"
    ],
    initiative: [
      "",
      "Mức 1: Thụ động, cần nhắc nhở liên tục",
      "Mức 2: Ít chủ động, thường cần nhắc nhở",
      "Mức 3: Chủ động trung bình",
      "Mức 4: Khá chủ động thực hiện kế hoạch",
      "Mức 5: Rất chủ động, tự giác cao"
    ],
    participation: [
      "",
      "Mức 1: Chưa hợp tác trao đổi",
      "Mức 2: Tham gia còn dè dặt",
      "Mức 3: Tham gia đầy đủ các buổi gặp",
      "Mức 4: Tích cực, cởi mở chia sẻ",
      "Mức 5: Rất tích cực, chủ động đóng góp"
    ]
  }

  const activeTermEval = termEvals.find((e: any) => e.term === selectedTerm) || null

  return (
    <div className="max-w-[1360px] mx-auto space-y-4 font-sans text-slate-800 pb-12">
      {/* 1. COMPACT MODERN HEADER BANNER */}
      <div
        className="rounded-2xl px-5 py-4 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 relative overflow-hidden"
        style={{ background: campusTheme.headerGradient }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-100 uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-amber-300" />
            <span>Parent Portal • Cố Vấn Học Tập 3 Bên</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            Theo Dõi Cố Vấn & Mục Tiêu Đồng Hành
          </h1>
          <p className="text-xs text-teal-100/90 max-w-2xl">
            Liên thông dữ liệu giữa <strong className="text-white">Gia Đình ⇄ CVCN ⇄ Học Sinh</strong>: Mục tiêu SMART, Sổ theo dõi tiến độ 1:1 & kế hoạch hành động.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-slate-900 shadow-2xs">
            <School className="w-3.5 h-3.5" style={{ color: campusTheme.primaryColor }} />
            <span>{campusTheme.name}</span>
          </div>
        </div>
      </div>

      {childrenList.length === 0 ? (
        loading ? (
          <div className="py-16 text-center text-xs font-semibold text-slate-400 animate-pulse space-y-2">
            <Compass className="w-7 h-7 mx-auto text-teal-500 animate-spin" />
            <p>Đang tải hồ sơ Cố vấn học tập...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-400" />
            <h3 className="text-sm font-bold text-slate-800">Chưa có dữ liệu con em</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tài khoản chưa liên kết học sinh. Quý Phụ huynh vui lòng liên hệ GVCN để đồng bộ.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {/* 2. UNIFIED SLIM STUDENT SWITCHER & STATUS BAR */}
          <div className="bg-white rounded-xl px-4 py-2.5 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            {/* Left: Child selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mr-1">
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>Học sinh:</span>
              </span>
              {childrenList.map((c: any) => {
                const isSelected = selectedStudentId === c.id
                const cTheme = resolveCampusTheme(
                  c.class?.campus?.campusName || c.class?.className || "Sky-Line"
                )
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedStudentId(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    }`}
                    style={isSelected ? { backgroundColor: campusTheme.darkColor } : {}}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: isSelected ? "#5EEAD4" : cTheme.primaryColor }}
                    />
                    <span>
                      {c.studentName} ({c.class?.className || "Chưa xếp lớp"})
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Right: Student metadata + Status Signal */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="text-slate-500 hidden sm:flex items-center gap-2">
                <span>
                  Mã HS:{" "}
                  <strong className="text-slate-700">
                    {student.studentCode || selectedStudent.studentCode}
                  </strong>
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  GVCN:{" "}
                  <strong className="text-teal-700">{homeroomTeacherName}</strong>
                </span>
              </div>

              <span
                className={
                  "px-2.5 py-0.5 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1.5 " +
                  (statusColor === "RED"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : statusColor === "YELLOW"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200")
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    statusColor === "RED"
                      ? "bg-rose-500"
                      : statusColor === "YELLOW"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                />
                {statusColor === "RED"
                  ? "Cần hỗ trợ đặc biệt"
                  : statusColor === "YELLOW"
                  ? "Cần theo dõi thêm"
                  : "Ổn định & phát triển tốt"}
              </span>
            </div>
          </div>

          {/* 3. SLIM 8-STEP WORKFLOW STEPPER */}
          <TriPartyWorkflowBanner
            goals={allGoals}
            consultations={consultations}
            reflections={profile?.reflections || []}
            termEvaluations={termEvals}
            parentExchanges={profile?.parentExchanges || []}
            viewerRole="PARENT"
            compact
            onStepClick={stepNum => {
              if (stepNum === 1 || stepNum === 2) setActiveTab("goals")
              else if (stepNum === 3 || stepNum === 4 || stepNum === 5) setActiveTab("tracking")
              else if (stepNum === 6 || stepNum === 7) setActiveTab("consultations")
              else if (stepNum === 8) setActiveTab("evaluations")
            }}
          />

          {/* 3B. THANH THAO TÁC PHỐI HỢP GIA ĐÌNH ⇄ NHÀ TRƯỜNG (MỤC X) */}
          {selectedStudentId && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#003B3A] mr-1">Phối hợp Gia đình ⇄ Nhà trường:</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("consultations")}
                  className="px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#00524F] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquareText className="w-3.5 h-3.5 text-teal-300" />
                  <span>Gửi ý kiến</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("consultations")}
                  className="px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-[#008B85] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cập nhật quan sát tại nhà</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("consultations")}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-[#008B85]" />
                  <span>Đề nghị trao đổi</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. SLEEK SEGMENTED TAB BAR (MỤC X - 5 TAB CHUẨN PHHS) */}
          <div className="bg-white rounded-xl p-1 border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-1">
            {[
              {
                id: "goals",
                label: "1. Tổng quan & Mục tiêu",
                icon: Compass
              },
              {
                id: "tracking",
                label: `2. Mục tiêu & Kế hoạch (${allGoals.length})`,
                icon: Target
              },
              {
                id: "consultations",
                label: `3. Con tự đánh giá & Phản hồi (${consultations.length})`,
                icon: MessageSquareText
              },
              {
                id: "gvbm_advisory",
                label: "4. Giáo viên đồng hành",
                icon: BookOpen
              },
              {
                id: "evaluations",
                label: "5. Kết quả tiến bộ",
                icon: Award
              }
            ].map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? "text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                  style={isActive ? { backgroundColor: campusTheme.darkColor } : {}}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-300" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: PHIẾU MỤC TIÊU NĂM HỌC & BẢNG THEO DÕI TIẾN ĐỘ 1:1 */}
          {/* ========================================================================= */}
          {activeTab === "goals" && (
            <div className="space-y-4">
              {/* BẢNG THEO DÕI TIẾN ĐỘ TỔNG HỢP: 4 KPI + NHẬT KÝ TƯ VẤN & 1:1 (9 CỘT) */}
              <ParentProgressTrackingTable
                studentId={selectedStudentId}
                studentName={student.studentName || selectedStudent.studentName || "Học sinh"}
                studentCode={student.studentCode || selectedStudent.studentCode || ""}
                academicYearId={academicYearId}
                homeroomTeacherName={homeroomTeacherName}
                goals={allGoals}
                consultations={consultations}
                trackingLogs={trackingLogs}
                signedByParent={signed}
                acknowledgedLogs={acknowledgedLogs}
                primaryColor={campusTheme.primaryColor}
                darkColor={campusTheme.darkColor}
              />

              {/* DANH MỤC TƯ VẤN & ĐỒNG HÀNH HỌC TẬP BỘ MÔN ĐÃ ĐƯỢC CVHT PHÊ DUYỆT */}
              <ParentGvbmAdvisorySection
                studentId={selectedStudentId}
                studentName={student.studentName || selectedStudent.studentName || "con"}
                academicYearId={academicYearId}
                homeroomTeacherName={homeroomTeacherName}
              />

              {/* Slim Toolbar: Mốc kiểm tra & Chế độ hiển thị mục tiêu */}
              <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">
                    Cam kết của con:
                  </span>
                  <span className="text-xs text-teal-800 italic truncate max-w-md">
                    “{studentCommitmentText}”
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Checkpoint selector */}
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/70">
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
                            ? "px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white text-slate-900 shadow-2xs cursor-pointer"
                            : "px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                        }
                      >
                        {cp.label}
                      </button>
                    ))}
                  </div>

                  {/* View Mode Switcher */}
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/70">
                    <button
                      type="button"
                      onClick={() => setViewMode("card")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                        viewMode === "card"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Layers className="w-3 h-3 text-teal-600" />
                      <span>Thẻ Mục Tiêu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                        viewMode === "table"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Table className="w-3 h-3" />
                      <span>Bảng Gọn</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => typeof window !== "undefined" && window.print()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-semibold cursor-pointer print:hidden"
                  >
                    <Printer className="w-3 h-3" />
                    <span>In PDF</span>
                  </button>
                </div>
              </div>

              {/* 4 NHÓM MỤC TIÊU SMART */}
              {viewMode === "card" ? (
                <div className="grid grid-cols-1 gap-4">
                  {currentCategories.map((catDef, catIdx) => {
                    const catGoalsList = filterCategoryGoals(catIdx, catDef.key, catDef.altKeys)
                    const theme = catDef.theme

                    return (
                      <div
                        key={catDef.key}
                        className={`bg-white rounded-xl border ${theme.border} shadow-2xs overflow-hidden p-4 space-y-3`}
                      >
                        <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-6 h-6 rounded-lg ${theme.numberBadge} flex items-center justify-center font-bold text-[11px] shrink-0`}
                            >
                              {catDef.number}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900">
                              {catDef.label}
                            </h4>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 ${theme.badgeBg} ${theme.badgeText} border rounded-full text-[11px] font-semibold`}
                          >
                            {catGoalsList.length} mục tiêu
                          </span>
                        </div>

                        {catIdx === 0 && selectedStudentId && (
                          <div className="pt-1">
                            <AcademicComparisonWidget
                              studentId={selectedStudentId}
                              studentCode={student.studentCode || selectedStudent.studentCode}
                              academicYearId={academicYearId}
                              defaultPeriod={selectedCheckPoint}
                              isTeacherView={false}
                            />
                          </div>
                        )}

                        {catGoalsList.length === 0 ? (
                          <div className="py-4 text-center text-slate-400 text-xs">
                            Học sinh chưa điền nội dung mục tiêu nhóm này
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {catGoalsList.map((gItem: any, gIdx: number) => {
                              const matchedLog = trackingLogs.find(
                                (t: any) =>
                                  (t.goalId && t.goalId === gItem.id) ||
                                  (t.targetText &&
                                    gItem.targetText &&
                                    t.targetText.trim() === gItem.targetText.trim())
                              )
                              const progressStatus = matchedLog?.progressStatus || "CHUA_DANH_GIA"
                              const teacherNotes = matchedLog?.teacherNotes || ""
                              const actionTextStr =
                                gItem?.actions && gItem.actions.length > 0
                                  ? gItem.actions.map((a: any) => a.actionText).join("; ")
                                  : gItem?.actionText || ""

                              return (
                                <div
                                  key={gItem.id || gIdx}
                                  className="p-3.5 rounded-xl bg-slate-50/50 border border-slate-200/70 space-y-2.5"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-700">
                                      Mục tiêu #{gIdx + 1}
                                    </span>
                                    <span
                                      className={
                                        "px-2 py-0.5 rounded-md font-semibold text-[11px] " +
                                        (progressStatus === "DAT"
                                          ? "bg-emerald-50 text-emerald-700"
                                          : progressStatus === "CHUA_DAT"
                                          ? "bg-rose-50 text-rose-700"
                                          : progressStatus === "TIEN_TRIEN"
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-slate-100 text-slate-600")
                                      }
                                    >
                                      {progressStatus === "DAT"
                                        ? "Đạt"
                                        : progressStatus === "CHUA_DAT"
                                        ? "Chưa đạt"
                                        : progressStatus === "TIEN_TRIEN"
                                        ? "Đang tiến triển"
                                        : "Chưa đánh giá"}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    <div className="space-y-2">
                                      <div>
                                        <span className="text-[11px] font-semibold text-slate-500 block">
                                          Mục tiêu cụ thể:
                                        </span>
                                        <p className="font-semibold text-slate-900 leading-relaxed">
                                          {gItem.targetText || "Chưa nhập nội dung"}
                                        </p>
                                      </div>
                                      {actionTextStr && (
                                        <div>
                                          <span className="text-[11px] font-semibold text-slate-500 block">
                                            Kế hoạch hành động:
                                          </span>
                                          <p className="text-slate-700 leading-relaxed">
                                            {actionTextStr}
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-200/70 pt-2 md:pt-0 md:pl-3">
                                      <div>
                                        <span className="text-[11px] font-semibold text-teal-700 block">
                                          Nhận xét từ GVCN:
                                        </span>
                                        <p className="text-slate-600 italic">
                                          {teacherNotes
                                            ? `“${teacherNotes}”`
                                            : "Chưa có nhận xét cho mốc này."}
                                        </p>
                                      </div>
                                      {gItem.parentSupportRequest && (
                                        <div>
                                          <span className="text-[11px] font-semibold text-rose-600 block">
                                            Mong muốn Ba Mẹ hỗ trợ:
                                          </span>
                                          <p className="text-slate-700">
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
                <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-500 text-[11px] font-semibold border-b border-slate-200/80">
                        <th className="py-2.5 px-3">Nhóm Mục Tiêu</th>
                        <th className="py-2.5 px-3">Mục Tiêu Cụ Thể</th>
                        <th className="py-2.5 px-3">Hành Động Cụ Thể</th>
                        <th className="py-2.5 px-3">Đề Nghị Hỗ Trợ</th>
                        <th className="py-2.5 px-3 w-32 text-center">Tiến Độ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentCategories.map((catDef, catIdx) => {
                        const catGoalsList = filterCategoryGoals(catIdx, catDef.key, catDef.altKeys)

                        if (catGoalsList.length === 0) {
                          return (
                            <tr key={catDef.key} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">{catDef.label}</td>
                              <td colSpan={4} className="py-2.5 px-3 text-slate-400">
                                Chưa nhập mục tiêu nhóm này
                              </td>
                            </tr>
                          )
                        }

                        return catGoalsList.map((gItem: any, gIdx: number) => {
                          const matchedLog = trackingLogs.find(
                            (t: any) =>
                              (t.goalId && t.goalId === gItem.id) ||
                              (t.targetText &&
                                gItem.targetText &&
                                t.targetText.trim() === gItem.targetText.trim())
                          )
                          const progressStatus = matchedLog?.progressStatus || "CHUA_DANH_GIA"
                          const actionTextStr =
                            gItem?.actions && gItem.actions.length > 0
                              ? gItem.actions.map((a: any) => a.actionText).join("; ")
                              : gItem?.actionText || ""

                          return (
                            <tr key={gItem.id || gIdx} className="hover:bg-slate-50/60 align-top">
                              {gIdx === 0 && (
                                <td
                                  rowSpan={catGoalsList.length}
                                  className="py-2.5 px-3 font-semibold text-slate-800 bg-slate-50/30"
                                >
                                  {catDef.label}
                                </td>
                              )}
                              <td className="py-2.5 px-3 font-medium text-slate-900">
                                {gItem.targetText || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{actionTextStr || "—"}</td>
                              <td className="py-2.5 px-3 space-y-0.5 text-[11px] text-slate-600">
                                {gItem.teacherSupportRequest && (
                                  <p>GV: {gItem.teacherSupportRequest}</p>
                                )}
                                {gItem.parentSupportRequest && (
                                  <p>PH: {gItem.parentSupportRequest}</p>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={
                                    "px-2 py-0.5 rounded-md text-[10px] font-semibold " +
                                    (progressStatus === "DAT"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : progressStatus === "CHUA_DAT"
                                      ? "bg-rose-50 text-rose-700"
                                      : progressStatus === "TIEN_TRIEN"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-slate-100 text-slate-600")
                                  }
                                >
                                  {progressStatus === "DAT"
                                    ? "Đạt"
                                    : progressStatus === "CHUA_DAT"
                                    ? "Chưa đạt"
                                    : progressStatus === "TIEN_TRIEN"
                                    ? "Tiến triển"
                                    : "Chưa đánh giá"}
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

              {/* SLIM PARENT COMMITMENT & SIGNATURE BOX */}
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Lời Nhắn & Xác Nhận Đồng Hành Của Phụ Huynh
                    </h3>
                  </div>
                  {signed && (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Đã ký xác nhận</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    type="text"
                    value={parentMessage}
                    onChange={e => setParentMessage(e.target.value)}
                    placeholder="Nhập lời nhắn động viên và cam kết đồng hành cùng con trong năm học..."
                    className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 bg-slate-50/60 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                  <button
                    onClick={handleSaveCommitment}
                    disabled={saving}
                    className="h-9 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? "Đang lưu..." : "Lưu & Ký Cam Kết"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: BẢNG THEO DÕI TIẾN ĐỘ 1:1 & CHECK-IN */}
          {/* ========================================================================= */}
          {activeTab === "tracking" && (
            <div className="space-y-4">
              <ParentProgressTrackingTable
                studentId={selectedStudentId}
                studentName={student.studentName || selectedStudent.studentName || "Học sinh"}
                studentCode={student.studentCode || selectedStudent.studentCode || ""}
                academicYearId={academicYearId}
                homeroomTeacherName={homeroomTeacherName}
                goals={allGoals}
                consultations={consultations}
                trackingLogs={trackingLogs}
                signedByParent={signed}
                acknowledgedLogs={acknowledgedLogs}
                primaryColor={campusTheme.primaryColor}
                darkColor={campusTheme.darkColor}
              />

              {trackingLogs.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Nhật Ký Check-in Định Kỳ 4 Mốc Kỳ ({trackingLogs.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {trackingLogs.map((log: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-50/70 border border-slate-200/70 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            Mốc: {log.checkPoint || "Giữa HK1"}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                            {log.progressStatus === "DAT"
                              ? "Đạt"
                              : log.progressStatus === "CHUA_DAT"
                              ? "Chưa đạt"
                              : "Đang tiến triển"}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800">{log.targetText}</p>
                        {log.teacherNotes && (
                          <p className="text-teal-700 italic">GVCN: “{log.teacherNotes}”</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parentHelpRequests.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>Yêu Cầu Hỗ Trợ Của Con ({parentHelpRequests.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {parentHelpRequests.map((req: any, idx: number) => (
                      <div
                        key={req.id || idx}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-xs space-y-1"
                      >
                        <p className="font-semibold text-slate-800">“{req.content}”</p>
                        {req.responseNotes && (
                          <p className="text-teal-700">Phản hồi GVCN: “{req.responseNotes}”</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ĐÁNH GIÁ ĐỊNH KỲ (RUBRIC) */}
          {/* ========================================================================= */}
          {activeTab === "evaluations" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Award className="w-4 h-4 text-rose-500" />
                      <span>Bảng Đánh Giá Định Kỳ Theo Rubric (Thang điểm 1 - 5)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Kết quả đánh giá 3 tiêu chí cốt lõi từ Giáo viên chủ nhiệm
                    </p>
                  </div>

                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/70">
                    {["HK1", "HK2"].map(term => (
                      <button
                        key={term}
                        onClick={() => setSelectedTerm(term as any)}
                        className={
                          selectedTerm === term
                            ? "px-3 py-1 rounded-md text-xs font-semibold bg-white text-slate-900 shadow-2xs cursor-pointer"
                            : "px-3 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                        }
                      >
                        Học kỳ {term === "HK1" ? "I" : "II"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3 Slim Rubric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      code: "Tiêu chí 01",
                      title: "Mức độ hoàn thành mục tiêu",
                      level: activeTermEval?.goalCompletionLevel,
                      desc: activeTermEval?.goalCompletionLevel
                        ? RUBRIC_TEXTS.goalCompletion[activeTermEval.goalCompletionLevel]
                        : "Chưa đánh giá"
                    },
                    {
                      code: "Tiêu chí 02",
                      title: "Mức độ chủ động & Tự học",
                      level: activeTermEval?.initiativeLevel,
                      desc: activeTermEval?.initiativeLevel
                        ? RUBRIC_TEXTS.initiative[activeTermEval.initiativeLevel]
                        : "Chưa đánh giá"
                    },
                    {
                      code: "Tiêu chí 03",
                      title: "Thái độ tham gia đồng hành",
                      level: activeTermEval?.participationAttitude,
                      desc: activeTermEval?.participationAttitude
                        ? RUBRIC_TEXTS.participation[activeTermEval.participationAttitude]
                        : "Chưa đánh giá"
                    }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/80 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {item.code}
                        </span>
                        <span className="text-xs font-bold text-teal-700">
                          {item.level ? `${item.level}/5 điểm` : "—"}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              item.level && s <= item.level
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-600">{item.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Slim 8-Column Rubric Table */}
                <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-500 text-[11px] font-semibold border-b border-slate-200/80">
                        <th className="py-2.5 px-3">1. Nhóm Mục Tiêu</th>
                        <th className="py-2.5 px-3">2. Nội Dung Mục Tiêu</th>
                        <th className="py-2.5 px-3 text-center">3. Kết Quả</th>
                        <th className="py-2.5 px-3 text-center">4. Hoàn Thành</th>
                        <th className="py-2.5 px-3 text-center">5. Chủ Động</th>
                        <th className="py-2.5 px-3 text-center">6. Thái Độ</th>
                        <th className="py-2.5 px-3">7. Khuyến Nghị Của GVCN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentCategories.map((catDef, catIdx) => {
                        const catGoalsList = filterCategoryGoals(catIdx, catDef.key, catDef.altKeys)
                        const firstGoal = catGoalsList[0] || {}
                        const matchedLog = trackingLogs.find(
                          (t: any) =>
                            t.category?.includes(catDef.key) || t.targetText === firstGoal?.targetText
                        )
                        const progressStatus = matchedLog?.progressStatus || "CHUA_DANH_GIA"
                        const goalLevel =
                          matchedLog?.goalCompletionLevel || activeTermEval?.goalCompletionLevel || null
                        const initiativeLevel =
                          matchedLog?.initiativeLevel || activeTermEval?.initiativeLevel || null
                        const attitudeLevel =
                          matchedLog?.participationAttitude ||
                          activeTermEval?.participationAttitude ||
                          null
                        const teacherNotes =
                          matchedLog?.teacherNotes ||
                          (catIdx === 0 ? activeTermEval?.recommendations : "") ||
                          ""

                        return (
                          <tr key={catDef.key} className="hover:bg-slate-50/60 align-top">
                            <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                              {catDef.label}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {firstGoal.targetText || "Chưa điền mục tiêu"}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  progressStatus === "DAT"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : progressStatus === "CHUA_DAT"
                                    ? "bg-rose-50 text-rose-700"
                                    : progressStatus === "TIEN_TRIEN"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {progressStatus === "DAT"
                                  ? "Đạt"
                                  : progressStatus === "CHUA_DAT"
                                  ? "Chưa đạt"
                                  : progressStatus === "TIEN_TRIEN"
                                  ? "Tiến triển"
                                  : "Chưa đánh giá"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                              {goalLevel ? `Mức ${goalLevel}/5` : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                              {initiativeLevel ? `Mức ${initiativeLevel}/5` : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                              {attitudeLevel ? `Mức ${attitudeLevel}/5` : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 italic">
                              {teacherNotes || "Đồng hành nhắc nhở con thực hiện kế hoạch."}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: NHẬT KÝ TƯ VẤN 1:1 & PHỐI HỢP GIA ĐÌNH ⇄ CVHT */}
          {/* ========================================================================= */}
          {activeTab === "consultations" && (
            <div className="space-y-4">
              <ParentProgressTrackingTable
                studentId={selectedStudentId}
                studentName={student.studentName || selectedStudent.studentName || "Học sinh"}
                studentCode={student.studentCode || selectedStudent.studentCode || ""}
                academicYearId={academicYearId}
                homeroomTeacherName={homeroomTeacherName}
                goals={allGoals}
                consultations={consultations}
                trackingLogs={trackingLogs}
                signedByParent={signed}
                acknowledgedLogs={acknowledgedLogs}
                primaryColor={campusTheme.primaryColor}
                darkColor={campusTheme.darkColor}
              />

              <ParentExchangeWidget
                studentId={selectedStudentId}
                studentName={student.studentName || selectedStudent.studentName || "con"}
                academicYearId={academicYearId}
                homeroomTeacherName={homeroomTeacherName}
                primaryColor={campusTheme.primaryColor}
                darkColor={campusTheme.darkColor}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: TƯ VẤN & ĐỒNG HÀNH HỌC TẬP (GVBM ĐÃ ĐƯỢC CVHT PHÊ DUYỆT) */}
          {/* ========================================================================= */}
          {activeTab === "gvbm_advisory" && (
            <div className="space-y-4">
              <ParentGvbmAdvisorySection
                studentId={selectedStudentId}
                studentName={student.studentName || selectedStudent.studentName || "con"}
                academicYearId={academicYearId}
                homeroomTeacherName={homeroomTeacherName}
              />

              <ParentExchangeWidget
                studentId={selectedStudentId}
                studentName={student.studentName || selectedStudent.studentName || "con"}
                academicYearId={academicYearId}
                homeroomTeacherName={homeroomTeacherName}
                primaryColor={campusTheme.primaryColor}
                darkColor={campusTheme.darkColor}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
