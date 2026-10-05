"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock3,
  User,
  Plus,
  RefreshCw,
  X,
  Star,
  Send,
  Building2,
  ChevronRight,
  BookOpen,
  Sparkles,
  Award,
  Layers,
  Check,
  RotateCcw,
  GraduationCap,
  Globe
} from "lucide-react"
import { PwaBottomNav } from "@/components/pwa/PwaBottomNav"

export interface ObservationSlotItem {
  id: string
  date: string
  slotIndex: number | string
  time: string
  teacherName: string
  teacherId: string
  subjectName: string
  className: string
  room: string
  level?: string
  departmentName?: string
  requestOrigin?: string
  topic?: string
  roleType: "TEACHING" | "OBSERVING"
  status: string
  hasEvaluated: boolean
  myEvaluation?: {
    id: string
    totalScore: number
    rating: string
    feedback?: string
  } | null
  observersCount: number
}

interface ObservationMobileViewProps {
  initialSlots?: any[]
  currentTeacher?: any
}

// ==========================================
// 1. CRITERIA CONFIGURATIONS
// ==========================================

// --- Phổ thông (K-12): 11 Tiêu chí theo chuẩn Sky-Line (Thang 20 điểm) ---
export const K12_CRITERIA = [
  { id: "Y1", label: "Y1. Chuẩn bị giáo án, bám sát kiến thức kỹ năng", max: 1.5, isKey: true, options: [0, 0.5, 1.0, 1.25, 1.5] },
  { id: "Y2", label: "Y2. Đồ dùng, thiết bị dạy học phù hợp", max: 1.5, isKey: false, options: [0, 0.5, 1.0, 1.25, 1.5] },
  { id: "Y3", label: "Y3. Nội dung bài giảng chính xác, khoa học", max: 2.0, isKey: true, options: [0, 0.5, 1.0, 1.5, 2.0] },
  { id: "Y4", label: "Y4. Tính hệ thống, trọng tâm bài dạy", max: 2.0, isKey: false, options: [0, 0.5, 1.0, 1.5, 2.0] },
  { id: "Y5", label: "Y5. Liên hệ thực tế đời sống, tính giáo dục", max: 1.0, isKey: false, options: [0, 0.25, 0.5, 0.75, 1.0] },
  { id: "Y6", label: "Y6. Không đọc chép, hỗ trợ kịp thời học sinh", max: 2.0, isKey: true, options: [0, 0.5, 1.0, 1.5, 2.0] },
  { id: "Y7", label: "Y7. Tổ chức học tập chủ động, hợp tác nhóm", max: 3.0, isKey: true, options: [0, 1.0, 1.5, 2.0, 2.5, 3.0] },
  { id: "Y8", label: "Y8. Linh hoạt các khâu, phân phối thời gian hợp lý", max: 2.0, isKey: false, options: [0, 0.5, 1.0, 1.5, 2.0] },
  { id: "Y9", label: "Y9. Kết hợp phương pháp, khuyến khích tư duy", max: 2.0, isKey: false, options: [0, 0.5, 1.0, 1.5, 2.0] },
  { id: "Y10", label: "Y10. Đánh giá quá trình học, học sinh nắm vững bài", max: 2.0, isKey: false, options: [0, 0.5, 1.0, 1.5, 2.0] },
  { id: "Y11", label: "Y11. Tiết dạy nhuần nhuyễn, sinh động, sáng tạo", max: 1.0, isKey: false, options: [0, 0.25, 0.5, 0.75, 1.0] }
]

// --- Mầm non: 5 Tiêu chí cốt lõi (Thang 10 điểm) ---
export const MAMNON_CRITERIA = [
  { id: "T1", label: "T1. Nội dung bài dạy phù hợp, chính xác", max: 2.0, options: [0.5, 1.0, 1.5, 2.0] },
  { id: "T2", label: "T2. Phương pháp giảng dạy hiệu quả, sáng tạo", max: 2.0, options: [0.5, 1.0, 1.5, 2.0] },
  { id: "T3", label: "T3. Tổ chức hoạt động học tập tích cực", max: 2.0, options: [0.5, 1.0, 1.5, 2.0] },
  { id: "T4", label: "T4. Sử dụng CNTT và đồ chơi, học liệu", max: 2.0, options: [0.5, 1.0, 1.5, 2.0] },
  { id: "T5", label: "T5. Kết quả học tập và tương tác của trẻ", max: 2.0, options: [0.5, 1.0, 1.5, 2.0] }
]

// --- GVNN (Foreign Teachers Walkthrough): 6 Tiêu chuẩn ESL cốt lõi (Thang 4 mức) ---
export const GVNN_CRITERIA = [
  { id: "D14", label: "D14. Appropriate Content Level (Nội dung phù hợp trình độ)", max: 4 },
  { id: "D15", label: "D15. Realistic Lesson Pacing (Khối lượng & thời lượng tiết dạy)", max: 4 },
  { id: "D16", label: "D16. Effective Teaching Media & Realia (Học liệu & đồ dùng trực quan)", max: 4 },
  { id: "D17", label: "D17. Curriculum Implementation & CLT (Định hướng chương trình & CLT)", max: 4 },
  { id: "E18", label: "E18. Formative Assessment & Checks (Đánh giá thường xuyên & CCQs/ICQs)", max: 4 },
  { id: "E19", label: "E19. Meaningful & Timely Feedback (Nhận xét phản hồi học sinh)", max: 4 }
]

// Feedback Presets
const PRESET_STRENGTHS = [
  "Chuẩn bị bài chu đáo, phương tiện trực quan sinh động",
  "Học sinh hào hứng, tích cực tham gia tương tác",
  "Phương pháp linh hoạt, phân bổ thời gian hợp lý",
  "Ứng dụng CNTT và học liệu hiệu quả",
  "Lớp học nề nếp, giáo viên quan sát bao quát tốt"
]

const PRESET_IMPROVEMENTS = [
  "Bao quát và hỗ trợ học sinh ở các góc lớp kỹ hơn",
  "Dành thêm 3-5 phút cho phần củng cố và dặn dò",
  "Tăng cường hoạt động thảo luận nhóm cho học sinh",
  "Điều chỉnh nhịp độ giảng dạy cho học sinh tiếp thu chậm",
  "Phân hóa bài tập phù hợp hơn với từng nhóm năng lực"
]

// Helper: Auto-detect evaluation type
function detectEvaluationType(slot: ObservationSlotItem | null): "K12" | "MAM_NON" | "GVNN" {
  if (!slot) return "K12"
  const lvl = (slot.level || "").toLowerCase()
  const cls = (slot.className || "").toLowerCase()
  const subj = (slot.subjectName || "").toLowerCase()
  const origin = (slot.requestOrigin || "").toUpperCase()
  const dept = (slot.departmentName || "").toLowerCase()

  // 1. GVNN / Foreign Walkthrough
  if (
    origin === "FOREIGN_WALKTHROUGH" ||
    subj.includes("esl") ||
    subj.includes("gvnn") ||
    subj.includes("nước ngoài") ||
    subj.includes("nuoc ngoai") ||
    subj.includes("foreign") ||
    dept.includes("tiếng anh nước ngoài") ||
    dept.includes("gvnn")
  ) {
    return "GVNN"
  }

  // 2. Mầm non
  if (
    lvl.includes("mầm non") ||
    lvl.includes("mam non") ||
    lvl.includes("preschool") ||
    cls.startsWith("mầm") ||
    cls.startsWith("chồi") ||
    cls.startsWith("lá") ||
    cls.startsWith("mam") ||
    cls.startsWith("choi") ||
    cls.startsWith("la") ||
    cls.includes("pre-k") ||
    cls.includes("kindergarten") ||
    dept.includes("mầm non") ||
    dept.includes("mam non")
  ) {
    return "MAM_NON"
  }

  // 3. Phổ thông K-12
  return "K12"
}

export function ObservationMobileView({ initialSlots, currentTeacher }: ObservationMobileViewProps) {
  const [activeTab, setActiveTab] = useState<"MY_SLOTS" | "QUICK_EVAL" | "BROWSE">("MY_SLOTS")
  const [mySlots, setMySlots] = useState<ObservationSlotItem[]>([])
  const [availableSlots, setAvailableSlots] = useState<ObservationSlotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Evaluation Sheet state
  const [evaluatingSlot, setEvaluatingSlot] = useState<ObservationSlotItem | null>(null)
  const [evalType, setEvalType] = useState<"K12" | "MAM_NON" | "GVNN">("K12")
  const [scores, setScores] = useState<number[]>([])
  const [strengths, setStrengths] = useState("")
  const [weaknesses, setWeaknesses] = useState("")
  const [savingEval, setSavingEval] = useState(false)
  const [evalSuccess, setEvalSuccess] = useState(false)
  const [registeringId, setRegisteringId] = useState<string | null>(null)

  // Format helper for initialSlots
  const parseRawSlots = useCallback((rawList: any[], teacherId?: string) => {
    if (!Array.isArray(rawList)) return { my: [], avail: [] }
    const my: ObservationSlotItem[] = []
    const avail: ObservationSlotItem[] = []

    rawList.forEach((s: any) => {
      const isMyTeaching = teacherId && s.teacherId === teacherId
      const myReg = teacherId ? s.registrations?.find((r: any) => r.teacherId === teacherId) : null
      const myEval = myReg?.evaluation || null

      let dateStr = ""
      if (s.date instanceof Date) {
        dateStr = s.date.toISOString().split("T")[0]
      } else if (typeof s.date === "string") {
        dateStr = s.date.split("T")[0]
      }

      const item: ObservationSlotItem = {
        id: s.id,
        date: dateStr,
        slotIndex: s.startTime || "Tiết học",
        time: (s.startTime && s.endTime) ? `${s.startTime} - ${s.endTime}` : (s.startTime || "Trong ngày"),
        teacherName: s.teacher?.teacherName || "Giáo viên",
        teacherId: s.teacherId,
        subjectName: s.subjectName || "Môn học",
        className: s.className || "Lớp học",
        room: s.room || "Phòng học",
        level: s.level || "",
        departmentName: s.teacher?.departmentRel?.name || "",
        requestOrigin: s.requestOrigin || "",
        topic: s.topic || "",
        roleType: isMyTeaching ? "TEACHING" : "OBSERVING",
        status: myReg ? (myReg.isApproved ? "Đã duyệt" : "Đã đăng ký") : (s.status || "ACTIVE"),
        hasEvaluated: Boolean(myEval),
        myEvaluation: myEval ? {
          id: myEval.id,
          totalScore: myEval.totalScore || 0,
          rating: myEval.overallRating || "Đạt",
          feedback: myEval.generalComment || myEval.strengths || ""
        } : null,
        observersCount: s.registrations?.length || 0
      }

      if (isMyTeaching || myReg) {
        my.push(item)
      } else {
        avail.push(item)
      }
    })

    return { my, avail }
  }, [])

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const res = await fetch("/api/pwa/observations")
      if (res.ok) {
        const json = await res.json()
        setMySlots(json.mySlots || [])
        setAvailableSlots(json.availableSlots || [])
      } else if (initialSlots) {
        const parsed = parseRawSlots(initialSlots, currentTeacher?.id)
        setMySlots(parsed.my)
        setAvailableSlots(parsed.avail)
      }
    } catch (err) {
      if (initialSlots) {
        const parsed = parseRawSlots(initialSlots, currentTeacher?.id)
        setMySlots(parsed.my)
        setAvailableSlots(parsed.avail)
      }
    } finally {
      setLoading(false)
      if (isManual) setTimeout(() => setRefreshing(false), 300)
    }
  }, [initialSlots, currentTeacher?.id, parseRawSlots])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Open evaluation sheet and initialize scores
  const handleOpenEvaluate = (slot: ObservationSlotItem) => {
    setEvaluatingSlot(slot)
    const detected = detectEvaluationType(slot)
    setEvalType(detected)

    // Set initial scores
    if (detected === "MAM_NON") {
      setScores(MAMNON_CRITERIA.map(c => c.max))
    } else if (detected === "GVNN") {
      setScores(GVNN_CRITERIA.map(() => 4))
    } else {
      setScores(K12_CRITERIA.map(c => c.max))
    }

    setStrengths("")
    setWeaknesses("")
    setEvalSuccess(false)
  }

  // Switch type manually
  const handleSwitchEvalType = (type: "K12" | "MAM_NON" | "GVNN") => {
    setEvalType(type)
    if (type === "MAM_NON") {
      setScores(MAMNON_CRITERIA.map(c => c.max))
    } else if (type === "GVNN") {
      setScores(GVNN_CRITERIA.map(() => 4))
    } else {
      setScores(K12_CRITERIA.map(c => c.max))
    }
  }

  // Handle single score change
  const handleScoreChange = (index: number, val: number) => {
    setScores(prev => {
      const next = [...prev]
      next[index] = val
      return next
    })
  }

  // Quick Max
  const handleSetMaxScores = () => {
    if (evalType === "MAM_NON") {
      setScores(MAMNON_CRITERIA.map(c => c.max))
    } else if (evalType === "GVNN") {
      setScores(GVNN_CRITERIA.map(() => 4))
    } else {
      setScores(K12_CRITERIA.map(c => c.max))
    }
  }

  // Reset 0
  const handleResetScores = () => {
    if (evalType === "MAM_NON") {
      setScores(MAMNON_CRITERIA.map(() => 0))
    } else if (evalType === "GVNN") {
      setScores(GVNN_CRITERIA.map(() => 1))
    } else {
      setScores(K12_CRITERIA.map(() => 0))
    }
  }

  // Computed Rankings & Details
  const rankingDetails = useMemo(() => {
    if (evalType === "MAM_NON") {
      const sum = Math.round(scores.reduce((a, b) => a + b, 0) * 100) / 100
      if (sum === 0) return { rating: "Chưa xếp loại", scoreStr: "0.00/10đ", color: "slate", reason: "Vui lòng chọn điểm các tiêu chí" }
      if (sum >= 9.0) return { rating: "Tốt", scoreStr: `${sum.toFixed(2)}/10đ`, color: "emerald", reason: "Từ 9.0đ trở lên - Đạt chuẩn TỐT Mầm non" }
      if (sum >= 8.0) return { rating: "Khá", scoreStr: `${sum.toFixed(2)}/10đ`, color: "sky", reason: "Từ 8.0đ đến dưới 9.0đ - Đạt chuẩn KHÁ Mầm non" }
      if (sum >= 7.0) return { rating: "Đạt", scoreStr: `${sum.toFixed(2)}/10đ`, color: "amber", reason: "Từ 7.0đ đến dưới 8.0đ - Đạt chuẩn ĐẠT Mầm non" }
      return { rating: "Không đạt", scoreStr: `${sum.toFixed(2)}/10đ`, color: "rose", reason: "Dưới 7.0đ - Chưa đạt chuẩn Mầm non" }
    } else if (evalType === "GVNN") {
      const avg = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : 0
      if (avg >= 3.5) return { rating: "Strong Practice", scoreStr: `${avg.toFixed(2)}/4.0`, color: "emerald", reason: "ĐTB ≥ 3.5 - Xuất sắc / Vượt chuẩn" }
      if (avg >= 2.8) return { rating: "Effective", scoreStr: `${avg.toFixed(2)}/4.0`, color: "sky", reason: "ĐTB ≥ 2.8 - Đạt chuẩn giảng dạy hiệu quả" }
      if (avg >= 2.0) return { rating: "Developing", scoreStr: `${avg.toFixed(2)}/4.0`, color: "amber", reason: "ĐTB ≥ 2.0 - Đang phát triển / Cần cải thiện" }
      return { rating: "Needs Support", scoreStr: `${avg.toFixed(2)}/4.0`, color: "rose", reason: "ĐTB < 2.0 - Cần hỗ trợ chuyên môn" }
    } else {
      // K12
      const sum = Math.round(scores.reduce((a, b) => a + b, 0) * 100) / 100
      if (sum === 0) return { rating: "Chưa xếp loại", scoreStr: "0.00/20đ", color: "slate", reason: "Vui lòng chọn điểm các tiêu chí" }

      const y1 = scores[0] || 0
      const y3 = scores[2] || 0
      const y6 = scores[5] || 0
      const y7 = scores[6] || 0

      const maxArr = [1.5, 1.5, 2.0, 2.0, 1.0, 2.0, 3.0, 2.0, 2.0, 2.0, 1.0]
      const hasSub50 = scores.some((s, idx) => s < maxArr[idx] * 0.5)
      const hasZero = scores.some(s => s === 0)

      if (sum >= 17.0 && y1 === 1.5 && y3 === 2.0 && y6 === 2.0 && y7 === 3.0 && !hasSub50) {
        return { rating: "Giỏi", scoreStr: `${sum.toFixed(2)}/20đ`, color: "emerald", reason: "Tổng ≥ 17.0đ & đạt Max 4 tiêu chí then chốt (Y1, Y3, Y6, Y7)" }
      }
      if (sum >= 14.0 && y1 === 1.5 && y3 === 2.0 && y6 === 2.0 && !hasSub50) {
        return { rating: "Khá", scoreStr: `${sum.toFixed(2)}/20đ`, color: "sky", reason: "Tổng ≥ 14.0đ & đạt Max 3 tiêu chí then chốt (Y1, Y3, Y6)" }
      }
      if (sum >= 10.0 && y1 === 1.5 && y3 === 2.0 && !hasZero) {
        return { rating: "Đạt", scoreStr: `${sum.toFixed(2)}/20đ`, color: "amber", reason: "Tổng ≥ 10.0đ & đạt Max 2 tiêu chí then chốt (Y1, Y3)" }
      }
      return { rating: "Chưa đạt", scoreStr: `${sum.toFixed(2)}/20đ`, color: "rose", reason: "Tổng < 10.0đ hoặc chưa đạt Max tiêu chí bắt buộc" }
    }
  }, [evalType, scores])

  const handleSaveEvaluation = async () => {
    if (!evaluatingSlot) return
    setSavingEval(true)
    try {
      const totalScoreNum = evalType === "GVNN"
        ? Math.round((scores.reduce((a, b) => a + b, 0) / (scores.length || 1)) * 100) / 100
        : Math.round(scores.reduce((a, b) => a + b, 0) * 100) / 100

      const res = await fetch("/api/pwa/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: evaluatingSlot.id,
          evaluationType: evalType,
          scores,
          totalScore: totalScoreNum,
          rating: rankingDetails.rating,
          strengths,
          weaknesses
        })
      })

      if (res.ok) {
        setEvalSuccess(true)
        setTimeout(() => {
          setEvaluatingSlot(null)
          loadData()
        }, 800)
      }
    } catch (err) {
      console.error("[ObservationMobileView] Error saving evaluation:", err)
    } finally {
      setSavingEval(false)
    }
  }

  const handleRegisterSlot = async (slotId: string) => {
    setRegisteringId(slotId)
    try {
      const res = await fetch("/api/pwa/observations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId })
      })
      if (res.ok) {
        loadData()
      }
    } catch (err) {
      console.error("[ObservationMobileView] Error registering slot:", err)
    } finally {
      setRegisteringId(null)
    }
  }

  const needsEvalSlots = mySlots.filter(s => s.roleType === "OBSERVING" && !s.hasEvaluated)

  return (
    <div className="min-h-screen bg-[#F6F8F7] pb-24 font-sans text-slate-800">
      {/* 1. TOP APP BAR */}
      <div className="bg-[#003B3A] text-white px-4 pt-4 pb-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/teacher"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>Dự Giờ & Thao Giảng</span>
              </h1>
              <p className="text-[11px] text-[#5EEAD4] font-medium">SSM Mobile Workspace</p>
            </div>
          </div>

          <button
            onClick={() => loadData(true)}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#5EEAD4]" : ""}`} />
          </button>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 mt-3.5 bg-black/20 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("MY_SLOTS")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
              activeTab === "MY_SLOTS"
                ? "bg-[#00A19A] text-white shadow-xs"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Lịch của tôi ({mySlots.length})
          </button>
          <button
            onClick={() => setActiveTab("QUICK_EVAL")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center relative ${
              activeTab === "QUICK_EVAL"
                ? "bg-[#00A19A] text-white shadow-xs"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Cần đánh giá
            {needsEvalSlots.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black">
                {needsEvalSlots.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("BROWSE")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
              activeTab === "BROWSE"
                ? "bg-[#00A19A] text-white shadow-xs"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Đăng ký dự ({availableSlots.length})
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT LIST */}
      <div className="p-4 space-y-3.5 max-w-lg mx-auto">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00A19A]" />
            <p className="text-xs font-medium">Đang tải danh sách tiết dự giờ...</p>
          </div>
        ) : activeTab === "MY_SLOTS" ? (
          mySlots.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-2xs">
              <Eye className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">Chưa có lịch dự giờ</h4>
              <p className="text-xs text-slate-400 mt-1">
                Chuyển qua tab "Đăng ký dự" để tìm tiết thao giảng phù hợp.
              </p>
            </div>
          ) : (
            mySlots.map(slot => (
              <div
                key={slot.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3 transition-all hover:border-[#00A19A]/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 inline-block mb-1">
                      {slot.roleType === "TEACHING" ? "👤 Tiết dạy của tôi" : "👁️ Tôi đi dự giờ"}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 leading-snug">
                      {slot.subjectName} · {slot.className}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      GV: {slot.teacherName} {slot.level && `(${slot.level})`}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      slot.status === "Đã duyệt" || slot.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {slot.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#00A19A]" />
                    <span>{slot.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#00A19A]" />
                    <span>{slot.time}</span>
                  </div>
                </div>

                {slot.roleType === "OBSERVING" && !slot.hasEvaluated && (
                  <button
                    onClick={() => handleOpenEvaluate(slot)}
                    className="w-full py-2.5 rounded-xl bg-[#00A19A] hover:bg-[#008B85] active:bg-[#00736E] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>Chấm điểm & Đánh giá ngay</span>
                  </button>
                )}

                {slot.hasEvaluated && slot.myEvaluation && (
                  <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-emerald-900 block">Đã hoàn thành đánh giá</span>
                      <span className="text-[11px] text-emerald-700">
                        Xếp loại: {slot.myEvaluation.rating} ({slot.myEvaluation.totalScore}đ)
                      </span>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                )}
              </div>
            ))
          )
        ) : activeTab === "QUICK_EVAL" ? (
          needsEvalSlots.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-2xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">Đã hoàn thành đánh giá!</h4>
              <p className="text-xs text-slate-400 mt-1">
                Bạn không còn tiết dự giờ nào đang chờ gửi phiếu đánh giá.
              </p>
            </div>
          ) : (
            needsEvalSlots.map(slot => (
              <div
                key={slot.id}
                className="bg-white rounded-2xl p-4 border border-amber-200 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {slot.subjectName} · {slot.className}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Giáo viên: {slot.teacherName}
                    </p>
                    <p className="text-[11px] text-amber-700 font-bold mt-1">
                      📅 {slot.date} • ⏰ {slot.time}
                    </p>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                    Chờ đánh giá
                  </span>
                </div>

                <button
                  onClick={() => handleOpenEvaluate(slot)}
                  className="w-full py-2.5 rounded-xl bg-[#00A19A] hover:bg-[#008B85] active:bg-[#00736E] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Mở phiếu chấm điểm</span>
                </button>
              </div>
            ))
          )
        ) : (
          availableSlots.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-2xs">
              <Clock3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">Chưa có tiết mở đăng ký</h4>
              <p className="text-xs text-slate-400 mt-1">
                Các tiết dự giờ mở đăng ký của đồng nghiệp sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            availableSlots.map(slot => (
              <div
                key={slot.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {slot.subjectName} · {slot.className}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      GV đứng lớp: {slot.teacherName}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Mở đăng ký
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#00A19A]" />
                    <span>{slot.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#00A19A]" />
                    <span>{slot.time}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRegisterSlot(slot.id)}
                  disabled={registeringId === slot.id}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {registeringId === slot.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Đăng ký tham gia dự giờ</span>
                </button>
              </div>
            ))
          )
        )}
      </div>

      {/* 3. MULTI-RUBRIC EVALUATION BOTTOM SHEET */}
      {evaluatingSlot && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-[#E6ECEA] max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-[#003B3A]">
                  Đánh Giá Tiết Dự Giờ
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {evaluatingSlot.subjectName} · {evaluatingSlot.className} ({evaluatingSlot.teacherName})
                </p>
              </div>

              <button
                onClick={() => setEvaluatingSlot(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rubric Selector Tabs (Phổ thông | Mầm non | GVNN) */}
            <div className="pt-3">
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">
                Đối tượng & Bộ tiêu chí đánh giá:
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleSwitchEvalType("K12")}
                  className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 ${
                    evalType === "K12"
                      ? "bg-white text-[#003B3A] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-[#00A19A]" />
                  <span>Phổ thông</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchEvalType("MAM_NON")}
                  className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 ${
                    evalType === "MAM_NON"
                      ? "bg-white text-[#003B3A] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>🧸 Mầm non</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchEvalType("GVNN")}
                  className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 ${
                    evalType === "GVNN"
                      ? "bg-white text-[#003B3A] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>GVNN (ESL)</span>
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-3.5">
              {/* Score & Ranking Header Card */}
              <div className={`p-4 rounded-2xl border flex flex-col gap-2 ${
                rankingDetails.color === "emerald"
                  ? "bg-emerald-50/80 border-emerald-200"
                  : rankingDetails.color === "sky"
                  ? "bg-sky-50/80 border-sky-200"
                  : rankingDetails.color === "amber"
                  ? "bg-amber-50/80 border-amber-200"
                  : "bg-rose-50/80 border-rose-200"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                      {evalType === "K12" ? "Thang điểm chuẩn Phổ thông (20đ)" : evalType === "MAM_NON" ? "Thang điểm chuẩn Mầm non (10đ)" : "Thang điểm chuẩn GVNN (4.0)"}
                    </span>
                    <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                      {rankingDetails.scoreStr}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black shadow-xs ${
                      rankingDetails.color === "emerald"
                        ? "bg-emerald-600 text-white"
                        : rankingDetails.color === "sky"
                        ? "bg-sky-600 text-white"
                        : rankingDetails.color === "amber"
                        ? "bg-amber-500 text-white"
                        : "bg-rose-600 text-white"
                    }`}>
                      Xếp loại: {rankingDetails.rating}
                    </span>
                  </div>
                </div>

                {/* Reason Explanation */}
                <p className="text-[11px] text-slate-700 font-medium leading-relaxed border-t border-black/5 pt-2">
                  <strong>Quy chuẩn: </strong>{rankingDetails.reason}
                </p>

                {/* Quick Max / Reset Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSetMaxScores}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-white/90 hover:bg-white text-slate-800 text-[11px] font-bold border border-slate-200/80 flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Chấm nhanh Max</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetScores}
                    className="py-1.5 px-3 rounded-lg bg-white/90 hover:bg-white text-slate-600 text-[11px] font-bold border border-slate-200/80 flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                    <span>Đặt lại</span>
                  </button>
                </div>
              </div>

              {/* CRITERIA LIST BASED ON SELECTED RUBRIC */}
              <div className="space-y-3">
                {evalType === "K12" ? (
                  // --- K-12: 11 Tiêu chí ---
                  K12_CRITERIA.map((crit, idx) => (
                    <div key={crit.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800">{crit.label}</span>
                          {crit.isKey && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                              Bắt buộc
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-black text-[#00A19A] shrink-0">
                          {scores[idx] ?? 0}/{crit.max}đ
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-1">
                        {crit.options.map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleScoreChange(idx, val)}
                            className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              scores[idx] === val
                                ? "bg-[#00A19A] text-white shadow-xs"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {val}đ
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : evalType === "MAM_NON" ? (
                  // --- Mầm non: 5 Tiêu chí ---
                  MAMNON_CRITERIA.map((crit, idx) => (
                    <div key={crit.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-800">{crit.label}</span>
                        <span className="text-xs font-black text-amber-700 shrink-0">
                          {scores[idx] ?? 0}/{crit.max}đ
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {crit.options.map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleScoreChange(idx, val)}
                            className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              scores[idx] === val
                                ? "bg-amber-600 text-white shadow-xs"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {val}đ
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  // --- GVNN: 6 Tiêu chuẩn ESL Walkthrough (Thang 4 mức) ---
                  GVNN_CRITERIA.map((crit, idx) => (
                    <div key={crit.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-800">{crit.label}</span>
                        <span className="text-xs font-black text-blue-700 shrink-0">
                          {scores[idx] === 4 ? "4 (Strong)" : scores[idx] === 3 ? "3 (Effective)" : scores[idx] === 2 ? "2 (Developing)" : "1 (Needs)"}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { val: 1, label: "1 (Needs)" },
                          { val: 2, label: "2 (Dev)" },
                          { val: 3, label: "3 (Effect)" },
                          { val: 4, label: "4 (Strong)" }
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => handleScoreChange(idx, opt.val)}
                            className={`h-8 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              scores[idx] === opt.val
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* COMMENTS & PRESETS */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Ưu điểm nổi bật:</label>
                    <span className="text-[10px] text-slate-400">Chọn nhanh gợi ý:</span>
                  </div>
                  {/* Preset Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-1.5 scrollbar-none">
                    {PRESET_STRENGTHS.map((ps, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setStrengths(prev => prev ? `${prev}. ${ps}` : ps)}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg shrink-0 border border-slate-200 cursor-pointer"
                      >
                        + {ps.slice(0, 25)}...
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={strengths}
                    onChange={e => setStrengths(e.target.value)}
                    placeholder="Ghi nhận điểm sáng của tiết dạy..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00A19A] min-h-[60px]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Góp ý hoàn thiện:</label>
                    <span className="text-[10px] text-slate-400">Chọn nhanh gợi ý:</span>
                  </div>
                  {/* Preset Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-1.5 scrollbar-none">
                    {PRESET_IMPROVEMENTS.map((pi, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setWeaknesses(prev => prev ? `${prev}. ${pi}` : pi)}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg shrink-0 border border-slate-200 cursor-pointer"
                      >
                        + {pi.slice(0, 25)}...
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={weaknesses}
                    onChange={e => setWeaknesses(e.target.value)}
                    placeholder="Khuyến nghị cho đồng nghiệp..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00A19A] min-h-[60px]"
                  />
                </div>
              </div>

              {evalSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Đã lưu kết quả đánh giá thành công!</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSaveEvaluation}
                disabled={savingEval || evalSuccess}
                className="w-full py-3 rounded-xl bg-[#00A19A] hover:bg-[#008B85] active:bg-[#00736E] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {savingEval ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Hoàn tất & Gửi kết quả đánh giá</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. BOTTOM NAVIGATION */}
      <PwaBottomNav role={currentTeacher?.user?.role || "TEACHER"} />
    </div>
  )
}
