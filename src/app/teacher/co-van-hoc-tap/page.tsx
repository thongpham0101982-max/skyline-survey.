"use client"

import StudentSnapshotPopover from "@/components/advisory/StudentSnapshotPopover";

export const dynamic = "force-dynamic"

import { useState, useEffect, useMemo } from "react"
import * as XLSX from "xlsx"
import {
  Compass, Plus, Search, Calendar, User, MessageSquare, AlertTriangle,
  CheckCircle2, Clock, Filter, Save, Trash2, Heart, Sparkles, AlertCircle,
  TrendingUp, Award, Table, BookOpen, Layers, Info, ChevronRight, ChevronLeft, FileText, X, Edit3, ShieldCheck,
  Key, Flame, Star, CheckSquare, Target, Check, Lock, Eye, Download, ChevronDown, ChevronUp, Users, Building2
} from "lucide-react"
import {
  getGradeCategoryWeights,
  calculateAdvisoryEvaluation,
  matchCategoryKey,
  AdvisoryCategoryWeight,
  OverallEvaluationResult
} from "@/lib/advisory/advisoryWeights"

export default function TeacherAdvisoryPage() {
  const [academicYearId, setAcademicYearId] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedAcademicYear") || ""
    }
    return ""
  })
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const fromUrl = params.get("classId")
      if (fromUrl) return fromUrl
      return sessionStorage.getItem("ssm_advisory_classId") || ""
    }
    return ""
  })
  const [students, setStudents] = useState<any[]>([]); const [submittedStudentCodes, setSubmittedStudentCodes] = useState<string[]>([]); const [submissionFilter, setSubmissionFilter] = useState<"ALL" | "SUBMITTED" | "NOT_SUBMITTED">("ALL")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  
  const [activeTab, setActiveTab] = useState<"consultations" | "sos" | "tracking" | "rubric_eval" | "unlocks" | "requests">("tracking")
  
  // 5. Goal Adjustment Requests State (Yêu cầu mở phiếu điều chỉnh)
  const [adjustmentRequests, setAdjustmentRequests] = useState<any[]>([])
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<any | null>(null)
  const [reviewActionType, setReviewActionType] = useState<"APPROVED" | "REJECTED">("APPROVED")
  const [teacherResponseNote, setTeacherResponseNote] = useState("")
  const [savingReview, setSavingReview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  // Data States
  const [consultations, setConsultations] = useState<any[]>([])
  const [helpRequests, setHelpRequests] = useState<any[]>([])
  const [sosNotes, setSosNotes] = useState<Record<string, string>>({})
  const [savingSosId, setSavingSosId] = useState<string | null>(null)
  
  // 4. Goal Unlocks Sprint State (Stage 2 - K9-12)
  const [unlocksList, setUnlocksList] = useState<any[]>([])
  const [unlocksLoading, setUnlocksLoading] = useState(false)
  const [unlockFilter, setUnlockFilter] = useState<"ALL" | "NOT_UNLOCKED" | "UNLOCKED" | "IN_PROGRESS" | "NEED_SUPPORT">("ALL")
  const [selectedUnlockForModal, setSelectedUnlockForModal] = useState<any | null>(null)
  const [teacherNoteInput, setTeacherNoteInput] = useState("")
  const [supportStatusInput, setSupportStatusInput] = useState("NEED_ACTION")
  const [savingUnlockNote, setSavingUnlockNote] = useState(false)

  // 1. Student-Focused Goal Progress Tracking State
  const [checkPoint, setCheckPoint] = useState<"GIUA_KY_1" | "CUOI_KY_1" | "GIUA_KY_2" | "CUOI_KY_2">("GIUA_KY_1")
  const [singleStudentTrackingRows, setSingleStudentTrackingRows] = useState<any[]>([]); const [viewMode, setViewMode] = useState<"card" | "table">("card"); const [activeStudentCommitment, setActiveStudentCommitment] = useState<string>("")
  const [requestStatusFilter, setRequestStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED">("ALL")
  const [forceUnlockStudentId, setForceUnlockStudentId] = useState("")
  const pendingAdjustmentCount = useMemo(() => {
    return Array.isArray(adjustmentRequests) ? adjustmentRequests.filter((r: any) => r.status === "PENDING").length : 0
  }, [adjustmentRequests])

  // Dynamic weights & calculation based on student grade
  const activeStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId])
  const activeClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId])
  const currentGrade = useMemo(() => activeStudent?.grade || activeClass?.grade || activeClass?.name || "K12", [activeStudent, activeClass])
  const gradeCategoryWeights = useMemo(() => getGradeCategoryWeights(currentGrade, activeClass?.name), [currentGrade, activeClass])
  const overallEvalResult = useMemo(() => calculateAdvisoryEvaluation(singleStudentTrackingRows, currentGrade, activeClass?.name), [singleStudentTrackingRows, currentGrade, activeClass])

  // 2. Term Evaluation Rubric States
  const [evalTerm, setEvalTerm] = useState<"HK1" | "HK2">("HK1")
  const [classTermEvaluations, setClassTermEvaluations] = useState<any[]>([])
  const [evalFilter, setEvalFilter] = useState<"ALL" | "EVALUATED" | "NOT_EVALUATED">("ALL")
  const [evalSearch, setEvalSearch] = useState("")
  const [rubricForm, setRubricForm] = useState({
    goalCompletionLevel: 0,
    initiativeLevel: 0,
    participationAttitude: 0,
    recommendations: ""
  })

  // 3. Consultation Log Modal States (Matching Excel)
  const [showConsultationModal, setShowConsultationModal] = useState(false)
  const [editingConsultationId, setEditingConsultationId] = useState<string | null>(null)
  const [consultationForm, setConsultationForm] = useState({
    meetingDate: new Date().toISOString().split("T")[0],
    studentId: "",
    content: "",
    difficulties: "",
    nextActions: "",
    deadline: "",
    notes: ""
  })
  const [consultationStudentGoals, setConsultationStudentGoals] = useState<any[]>([])
  const [loadingStudentGoals, setLoadingStudentGoals] = useState(false)

  useEffect(() => {
    if (showConsultationModal && consultationForm.studentId) {
      setLoadingStudentGoals(true)
      fetch("/api/advisory/goals?studentId=" + consultationForm.studentId + "&academicYearId=" + academicYearId)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          setConsultationStudentGoals(data?.goals || [])
        })
        .catch(console.error)
        .finally(() => setLoadingStudentGoals(false))
    } else {
      setConsultationStudentGoals([])
    }
  }, [showConsultationModal, consultationForm.studentId, academicYearId])

  // Lock body scroll and handle Escape key when any modal is open
  useEffect(() => {
    const isAnyModalOpen = Boolean(showConsultationModal || selectedUnlockForModal || showReviewModal)
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [showConsultationModal, selectedUnlockForModal, showReviewModal])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showConsultationModal) setShowConsultationModal(false)
        if (selectedUnlockForModal) setSelectedUnlockForModal(null)
        if (showReviewModal) setShowReviewModal(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showConsultationModal, selectedUnlockForModal, showReviewModal])

  // 3.1. Consultation Tracking Modes & State for Homeroom Teacher
  const [consultationTabMode, setConsultationTabMode] = useState<"BY_STUDENT" | "ALL_LOGS">("BY_STUDENT")
  const [teacherStudentFilterStatus, setTeacherStudentFilterStatus] = useState<"ALL" | "CONSULTED" | "NOT_CONSULTED">("ALL")
  const [teacherStudentSearchQuery, setTeacherStudentSearchQuery] = useState("")
  const [expandedStudentIdForConsultation, setExpandedStudentIdForConsultation] = useState<string | null>(null)

  // Memoized Consultation Statistics for Current Class
  const classConsultationStats = useMemo(() => {
    const map: Record<string, any[]> = {}
    consultations.forEach(c => {
      if (!map[c.studentId]) map[c.studentId] = []
      map[c.studentId].push(c)
    })

    const studentRows = students.map(st => {
      const logs = map[st.id] || []
      const isConsulted = logs.length > 0
      const latestLog = logs[0] || null
      return {
        ...st,
        isConsulted,
        sessionCount: logs.length,
        latestMeetingDate: latestLog?.meetingDate || null,
        latestCounselor: latestLog?.teacher?.teacherName || latestLog?.evaluatorName || "GVCN",
        logs
      }
    })

    const totalStudents = students.length
    const consultedCount = studentRows.filter(s => s.isConsulted).length
    const unconsultedCount = totalStudents - consultedCount
    const consultedPercent = totalStudents > 0 ? Math.round((consultedCount / totalStudents) * 1000) / 10 : 0

    return {
      studentLogsMap: map,
      studentRows,
      totalStudents,
      consultedCount,
      unconsultedCount,
      consultedPercent
    }
  }, [students, consultations])

  function exportClassConsultationsExcel() {
    if (!students || students.length === 0) {
      alert("Chưa có danh sách học sinh để xuất báo cáo!")
      return
    }

    try {
      // Sheet 1: Danh sách tiến độ theo từng học sinh
      const studentRows = classConsultationStats.studentRows.map((st, idx) => ({
        "STT": idx + 1,
        "Mã học sinh": st.studentCode,
        "Họ và tên học sinh": st.studentName,
        "Giới tính": st.gender || "—",
        "Trạng thái tư vấn": st.isConsulted ? "Đã tư vấn" : "Chưa tư vấn",
        "Số lượt tư vấn": st.sessionCount,
        "Ngày tư vấn gần nhất": st.latestMeetingDate ? new Date(st.latestMeetingDate).toLocaleDateString("vi-VN") : "—",
        "Cố vấn gần nhất": st.latestCounselor || "—",
        "Nội dung buổi gần nhất": st.logs?.[0]?.content || "—",
        "Khó khăn ghi nhận": st.logs?.[0]?.difficulties || "—",
        "Kế hoạch hành động tiếp theo": st.logs?.[0]?.nextActions || "—"
      }))

      // Sheet 2: Sổ Nhật ký tham vấn chi tiết của cả lớp
      const logRows = consultations.map((c, idx) => ({
        "STT": idx + 1,
        "Ngày gặp": c.meetingDate ? new Date(c.meetingDate).toLocaleDateString("vi-VN") : "—",
        "Mã học sinh": c.student?.studentCode || "",
        "Tên học sinh": c.student?.studentName || "",
        "Nội dung trao đổi": c.content,
        "Khó khăn ghi nhận": c.difficulties || "—",
        "Hành động tiếp theo": c.nextActions || "—",
        "Thời hạn": c.deadline ? new Date(c.deadline).toLocaleDateString("vi-VN") : "—",
        "Ghi chú": c.notes || "—",
        "Tự đánh giá của học sinh": c.studentReflection || "—"
      }))

      const wb = XLSX.utils.book_new()
      const wsStudents = XLSX.utils.json_to_sheet(studentRows)
      const wsLogs = XLSX.utils.json_to_sheet(logRows)

      XLSX.utils.book_append_sheet(wb, wsStudents, "Tien_Do_Hoc_Sinh")
      XLSX.utils.book_append_sheet(wb, wsLogs, "So_Nhat_Ky_Tham_Van")

      const className = activeClass?.name || activeClass?.className || "Lop"
      XLSX.writeFile(wb, `So_TheoDoi_TuVan_${className}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e: any) {
      alert("Lỗi xuất file Excel: " + e.message)
    }
  }

  
  async function loadClassSubmissionStatus(clsId = selectedClassId, yrId = academicYearId) {
    if (!clsId) return
    try {
      const res = await fetch("/api/advisory/goals?classId=" + clsId + (yrId ? "&academicYearId=" + yrId : "") + "&_t=" + Date.now(), { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        if (data && Array.isArray(data.submittedStudentCodes)) {
          setSubmittedStudentCodes(data.submittedStudentCodes)
        }
      }
    } catch (e) {
      console.error("loadClassSubmissionStatus error:", e)
    }
  }

  async function loadClassAdjustmentRequests() {
    if (!selectedClassId) return
    try {
      const res = await fetch("/api/advisory/goals/adjustment-request?classId=" + selectedClassId + (academicYearId ? "&academicYearId=" + academicYearId : "") + "&_t=" + Date.now(), { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setAdjustmentRequests(Array.isArray(data.requests) ? data.requests : [])
      }
    } catch (e) {
      console.error("loadClassAdjustmentRequests error:", e)
    }
  }

  async function handleReviewAdjustment(status: "APPROVED" | "REJECTED") {
    if (!selectedRequestForReview) return
    try {
      setSavingReview(true)
      const res = await fetch("/api/advisory/goals/adjustment-request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRequestForReview.id,
          status,
          teacherResponse: teacherResponseNote.trim() || undefined
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setToastMessage(status === "APPROVED" ? "Đã phê duyệt mở lại phiếu cho học sinh thành công!" : "Đã từ chối yêu cầu mở phiếu.")
        setShowReviewModal(false)
        setSelectedRequestForReview(null)
        setTeacherResponseNote("")
        loadClassAdjustmentRequests()
        loadClassSubmissionStatus()
        setTimeout(() => setToastMessage(""), 4000)
      } else {
        alert(data.error || "Lỗi xử lý yêu cầu")
      }
    } catch (e: any) {
      alert("Lỗi kết nối: " + (e.message || "Vui lòng thử lại"))
    } finally {
      setSavingReview(false)
    }
  }

  async function handleForceUnlock(studentId: string) {
    if (!confirm("Thầy/Cô có chắc chắn muốn chủ động mở khóa phiếu mục tiêu cho học sinh này?")) return
    try {
      const res = await fetch("/api/advisory/goals/adjustment-request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          action: "FORCE_UNLOCK"
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setToastMessage("Đã chủ động mở khóa phiếu thành công cho học sinh!")
        loadClassAdjustmentRequests()
        setTimeout(() => setToastMessage(""), 4000)
      } else {
        alert(data.error || "Lỗi khi mở khóa phiếu")
      }
    } catch (e: any) {
      alert("Lỗi kết nối: " + e.message)
    }
  }

  async function handleLockGoal(studentId: string) {
    if (!confirm("Thầy/Cô có chắc chắn muốn khóa lại phiếu mục tiêu của học sinh này?")) return
    try {
      const res = await fetch("/api/advisory/goals/adjustment-request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          action: "LOCK"
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setToastMessage("Đã khóa lại phiếu mục tiêu thành công!")
        loadClassAdjustmentRequests()
        loadClassSubmissionStatus()
        setTimeout(() => setToastMessage(""), 4000)
      } else {
        alert(data.error || "Lỗi khi khóa phiếu")
      }
    } catch (e: any) {
      alert("Lỗi kết nối: " + e.message)
    }
  }

  async function loadClassUnlocks() {
    if (!selectedClassId) return
    try {
      setUnlocksLoading(true)
      const res = await fetch("/api/teacher/advisory/unlocks?classId=" + selectedClassId + (academicYearId ? "&academicYearId=" + academicYearId : "") + "&_t=" + Date.now(), { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setUnlocksList(Array.isArray(data.students) ? data.students : [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUnlocksLoading(false)
    }
  }

  async function handleSaveTeacherUnlockNote() {
    if (!selectedUnlockForModal || !selectedUnlockForModal.unlockId) return
    try {
      setSavingUnlockNote(true)
      const res = await fetch("/api/advisory/goals/unlock", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unlockId: selectedUnlockForModal.unlockId,
          teacherSupportNotes: teacherNoteInput,
          supportStatus: supportStatusInput
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setToastMessage("Đã lưu ghi chú hỗ trợ cho học sinh thành công!")
        setSelectedUnlockForModal(null)
        loadClassUnlocks()
        setTimeout(() => setToastMessage(""), 4000)
      } else {
        alert(data.error || "Lỗi khi lưu ghi chú.")
      }
    } catch (e: any) {
      console.error(e)
      alert("Lỗi kết nối: " + (e.message || "Vui lòng thử lại"))
    } finally {
      setSavingUnlockNote(false)
    }
  }

  // Rubric Definitions matching Excel
  const RUBRICS = {
    goalCompletion: [
      { level: 1, text: "Hầu như không đạt được mục tiêu nào đã đặt ra trong Kế hoạch cá nhân" },
      { level: 2, text: "Đạt được một phần nhỏ; phần lớn mục tiêu chưa đạt" },
      { level: 3, text: "Đạt được khoảng một nửa số mục tiêu đã đặt ra" },
      { level: 4, text: "Đạt được phần lớn mục tiêu, còn một vài điểm chưa hoàn thành" },
      { level: 5, text: "Đạt đầy đủ hoặc vượt các mục tiêu đã đặt ra" }
    ],
    initiative: [
      { level: 1, text: "Hoàn toàn thụ động, phải nhắc nhở liên tục mới thực hiện" },
      { level: 2, text: "Ít chủ động, thường xuyên cần giáo viên nhắc nhở" },
      { level: 3, text: "Chủ động ở mức trung bình, thỉnh thoảng cần nhắc" },
      { level: 4, text: "Khá chủ động, tự thực hiện phần lớn công việc đã thống nhất" },
      { level: 5, text: "Rất chủ động, tự giác thực hiện và chủ động đề xuất thêm" }
    ],
    participation: [
      { level: 1, text: "Không hợp tác; thường vắng mặt hoặc từ chối trao đổi" },
      { level: 2, text: "Tham gia miễn cưỡng, ít chia sẻ trong buổi gặp" },
      { level: 3, text: "Tham gia đầy đủ nhưng còn dè dặt, ít chủ động chia sẻ" },
      { level: 4, text: "Tham gia tích cực, chia sẻ cởi mở với giáo viên" },
      { level: 5, text: "Rất tích cực; chủ động chia sẻ và đóng góp cho buổi gặp" }
    ]
  }

  // Listen for academic year change from Header
  useEffect(() => {
    const handleYearChange = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("selectedAcademicYear") || ""
        if (stored && stored !== academicYearId) {
          setAcademicYearId(stored)
        }
      }
    }
    window.addEventListener("academicYearChanged", handleYearChange)
    return () => window.removeEventListener("academicYearChanged", handleYearChange)
  }, [academicYearId])

  // Load classes strictly filtered by selected academic year and GVCN assignment
  useEffect(() => {
    let year = academicYearId
    if (!year && typeof window !== "undefined") {
      year = localStorage.getItem("selectedAcademicYear") || ""
      if (year) setAcademicYearId(year)
    }

    setLoading(true)
    const url = `/api/classes?isGVCN=true${year ? `&academicYearId=${year}` : ""}&_v=${Date.now()}`
    fetch(url, { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const validClasses = year ? data.filter((c: any) => !c.academicYearId || c.academicYearId === year) : data
          setClasses(validClasses)
          if (validClasses.length > 0) {
            setSelectedClassId(prev => {
              let preferred = prev
              if (!preferred && typeof window !== "undefined") {
                const params = new URLSearchParams(window.location.search)
                preferred = params.get("classId") || sessionStorage.getItem("ssm_advisory_classId") || ""
              }
              return validClasses.some((c: any) => c.id === preferred) ? preferred : validClasses[0].id
            })
          } else {
            setSelectedClassId("")
            setStudents([])
            setSelectedStudentId("")
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [academicYearId])

  // Auto-fetch students when class changes
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([])
      setSelectedStudentId("")
      setSubmittedStudentCodes([])
      setHelpRequests([])
      setConsultations([])
      setUnlocksList([])
      setClassTermEvaluations([])
      return
    }
    const url = "/api/students/search?classId=" + selectedClassId + (academicYearId ? "&academicYearId=" + academicYearId : "")
    

  // IMP-004: Sync selectedClassId to sessionStorage and URL SearchParams
  useEffect(() => {
    if (selectedClassId && typeof window !== "undefined") {
      sessionStorage.setItem("ssm_advisory_classId", selectedClassId)
      try {
        const url = new URL(window.location.href)
        if (url.searchParams.get("classId") !== selectedClassId) {
          url.searchParams.set("classId", selectedClassId)
          window.history.replaceState({}, "", url.toString())
        }
      } catch (e) {
        // Safe fallback in SSR or testing environments
      }
    }
  }, [selectedClassId])

    // Fetch class submission status
    loadClassSubmissionStatus(selectedClassId, academicYearId)

    fetch(url + "&_v=" + Date.now(), { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStudents(data)
          if (data.length > 0) {
            setSelectedStudentId(data[0].id)
            setConsultationForm(prev => ({ ...prev, studentId: data[0].id }))
          }
        }
      })
      .catch(console.error)

    fetch("/api/advisory/help-requests?classId=" + selectedClassId + "&_v=" + Date.now(), { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setHelpRequests(data)
      })
      .catch(console.error)

    loadClassConsultations()
    loadClassUnlocks()
    loadClassTermEvaluations()
    loadClassAdjustmentRequests()
  }, [selectedClassId, academicYearId])

  // Load Goal Tracking & Rubric Data for currently selected student
  useEffect(() => {
    if (!selectedStudentId) return
    loadStudentTracking()
    loadSingleStudentData()
    loadClassTermEvaluations()
    setConsultationForm(prev => ({ ...prev, studentId: selectedStudentId }))
  }, [selectedStudentId, checkPoint, evalTerm, academicYearId])

  async function loadClassTermEvaluations() {
    if (!selectedClassId) return
    try {
      const res = await fetch("/api/advisory/term-evaluations?classId=" + selectedClassId + (academicYearId ? "&academicYearId=" + academicYearId : "") + "&_t=" + Date.now(), { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setClassTermEvaluations(data)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function loadClassConsultations() {
    if (!selectedClassId) return
    try {
      const res = await fetch("/api/advisory/consultations?classId=" + selectedClassId + "&academicYearId=" + academicYearId)
      if (res.ok) {
        setConsultations(await res.json())
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function loadStudentTracking() {
    try {
      const st = students.find(s => s.id === selectedStudentId)
      if (!st) return

      const activeCl = classes.find(c => c.id === selectedClassId)
      const stGrade = st.grade || activeCl?.grade || activeCl?.name || "K12"
      const standardCats = getGradeCategoryWeights(stGrade, activeCl?.name)

      const goalRes = await fetch("/api/advisory/goals?studentId=" + st.id + "&studentCode=" + (st.studentCode || "") + "&academicYearId=" + academicYearId + "&_t=" + Date.now(), { cache: "no-store" })
      const goalData = goalRes.ok ? await goalRes.json() : null

      setActiveStudentCommitment(goalData?.existingSheet?.studentCommitment || "")

      if (st.studentCode) {
        const hasSubmittedGoals = Array.isArray(goalData?.goals) && goalData.goals.length > 0
        setSubmittedStudentCodes(prev => {
          if (hasSubmittedGoals && !prev.includes(st.studentCode)) {
            return [...prev, st.studentCode]
          }
          return prev
        })
      }

      const trackRes = await fetch("/api/advisory/tracking?studentId=" + st.id + "&academicYearId=" + academicYearId + "&checkPoint=" + checkPoint + "&_t=" + Date.now(), { cache: "no-store" })
      const existingLogs = trackRes.ok ? await trackRes.json() : []

      const rows: any[] = []

      standardCats.forEach(catObj => {
        const studentGoalsInCat = goalData?.goals?.filter((g: any) => {
          return matchCategoryKey(g.category, stGrade) === catObj.key
        }) || []

        if (studentGoalsInCat.length > 0) {
          studentGoalsInCat.forEach((g: any) => {
            const matchedLog = existingLogs.find((t: any) => 
              (t.goalId && t.goalId === g.id) || 
              (t.targetText && g.targetText && t.targetText.trim() === g.targetText.trim())
            )
            rows.push({
              studentId: st.id,
              studentName: st.studentName,
              studentCode: st.studentCode,
              goalId: g.id,
              categoryKey: catObj.key,
              category: catObj.label,
              categoryWeight: catObj.weight,
              targetText: g.targetText || "",
              actionText: g.actions?.[0]?.actionText || "",
              teacherSupportRequest: g.teacherSupportRequest || "",
              parentSupportRequest: g.parentSupportRequest || "",
              progressStatus: matchedLog?.progressStatus || "CHUA_DANH_GIA",
              teacherNotes: matchedLog?.teacherNotes || "",
              goalCompletionLevel: matchedLog?.goalCompletionLevel || 0,
              initiativeLevel: matchedLog?.initiativeLevel || 0,
              participationAttitude: matchedLog?.participationAttitude || 0
            })
          })
        } else {
          const matchedLog = existingLogs.find((l: any) => matchCategoryKey(l.category, stGrade) === catObj.key || l.category === catObj.label)
          rows.push({
            studentId: st.id,
            studentName: st.studentName,
            studentCode: st.studentCode,
            categoryKey: catObj.key,
            category: catObj.label,
            categoryWeight: catObj.weight,
            targetText: matchedLog?.targetText || "Em chưa điền nội dung mục tiêu nhóm này",
            actionText: "",
            teacherSupportRequest: "",
            parentSupportRequest: "",
            progressStatus: matchedLog?.progressStatus || "CHUA_DANH_GIA",
            teacherNotes: matchedLog?.teacherNotes || "",
            goalCompletionLevel: matchedLog?.goalCompletionLevel || 0,
            initiativeLevel: matchedLog?.initiativeLevel || 0,
            participationAttitude: matchedLog?.participationAttitude || 0
          })
        }
      })

      setSingleStudentTrackingRows(rows)
    } catch (e) {
      console.error(e)
    }
  }

  async function loadSingleStudentData() {
    try {
      const evalRes = await fetch("/api/advisory/term-evaluations?studentId=" + selectedStudentId + "&academicYearId=" + academicYearId)
      if (evalRes.ok) {
        const evals = await evalRes.json()
        const matchedEval = evals.find((e: any) => e.term === evalTerm)
        if (matchedEval) {
          setRubricForm({
            goalCompletionLevel: matchedEval.goalCompletionLevel || 0,
            initiativeLevel: matchedEval.initiativeLevel || 0,
            participationAttitude: matchedEval.participationAttitude || 0,
            recommendations: matchedEval.recommendations || ""
          })
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Save Progress Tracking
  async function handleSaveStudentTracking() {
    if (!selectedStudentId) return
    try {
      setSaving(true)
      const res = await fetch("/api/advisory/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYearId,
          checkPoint,
          items: singleStudentTrackingRows
        })
      })

      if (res.ok) {
        setToastMessage("Đã lưu Bảng Theo dõi tiến độ cho học sinh " + (activeStudent?.studentName || "") + " thành công!")
        setTimeout(() => setToastMessage(""), 4000)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Save Term Evaluation Rubric & Goal Tracking Status
  async function handleSaveRubricEval() {
    if (!selectedStudentId) return
    try {
      setSaving(true)
      
      // Calculate overall student rubric scores from rows with weighted calculation
      const computedGoalLevel = Math.max(1, Math.min(5, Math.round(overallEvalResult.overallGoalCompletion || overallEvalResult.overallRubricScore || 3)))
      const avgInitiative = Math.max(1, Math.min(5, Math.round(overallEvalResult.overallInitiative || 3)))
      const avgParticipation = Math.max(1, Math.min(5, Math.round(overallEvalResult.overallParticipation || 3)))

      const res = await fetch("/api/advisory/term-evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYearId,
          term: evalTerm,
          goalCompletionLevel: computedGoalLevel,
          initiativeLevel: avgInitiative,
          participationAttitude: avgParticipation,
          recommendations: rubricForm.recommendations
        })
      })

      // Sync all row progress statuses cleanly before saving
      const syncedRows = singleStudentTrackingRows.map(row => {
        const gL = row.goalCompletionLevel || 0
        const iL = row.initiativeLevel || 0
        const pL = row.participationAttitude || 0
        const scs = [gL, iL, pL].filter(v => v > 0)
        let status = row.progressStatus || "CHUA_DANH_GIA"
        if (scs.length > 0) {
          const avg = scs.reduce((a, b) => a + b, 0) / scs.length
          status = avg >= 3.5 ? "DAT" : avg >= 2.5 ? "TIEN_TRIEN" : avg >= 1.5 ? "CAN_CO_GANG" : "CHUA_DAT"
        }
        return {
          ...row,
          progressStatus: status
        }
      })

      await fetch("/api/advisory/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYearId,
          checkPoint,
          items: syncedRows
        })
      }).catch(console.error)

      if (res.ok) {
        setRubricForm(prev => ({
          ...prev,
          goalCompletionLevel: computedGoalLevel,
          initiativeLevel: avgInitiative,
          participationAttitude: avgParticipation,
          recommendations: rubricForm.recommendations
        }))
        await loadSingleStudentData()
        await loadClassTermEvaluations()
        setToastMessage(`Đã lưu Đánh giá kỳ theo Rubric (${overallEvalResult.overallPercent}% - ${overallEvalResult.classificationLabel}) thành công!`)
        setTimeout(() => setToastMessage(""), 4000)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Save Consultation Log
  async function handleSaveConsultation() {
    if (!consultationForm.studentId || !consultationForm.content) {
      alert("Vui lòng chọn Học sinh và nhập Nội dung trao đổi!")
      return
    }

    try {
      setSaving(true)
      const res = await fetch("/api/advisory/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingConsultationId || undefined,
          studentId: consultationForm.studentId,
          academicYearId,
          meetingDate: consultationForm.meetingDate,
          content: consultationForm.content,
          difficulties: consultationForm.difficulties,
          nextActions: consultationForm.nextActions,
          deadline: consultationForm.deadline || undefined,
          notes: consultationForm.notes
        })
      })

      if (res.ok) {
        setToastMessage("Đã lưu Nhật ký tham vấn thành công!")
        setShowConsultationModal(false)
        setEditingConsultationId(null)
        setConsultationForm({
          meetingDate: new Date().toISOString().split("T")[0],
          studentId: selectedStudentId,
          content: "",
          difficulties: "",
          nextActions: "",
          deadline: "",
          notes: ""
        })
        loadClassConsultations()
        setTimeout(() => setToastMessage(""), 4000)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Delete Consultation Log
  async function handleDeleteConsultation(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa nhật ký tham vấn này?")) return
    try {
      const res = await fetch("/api/advisory/consultations?id=" + id, { method: "DELETE" })
      if (res.ok) {
        setToastMessage("Đã xóa nhật ký tham vấn!")
        loadClassConsultations()
        setTimeout(() => setToastMessage(""), 4000)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Edit Consultation Log
  function handleOpenEditConsultation(log: any) {
    setEditingConsultationId(log.id)
    setConsultationForm({
      meetingDate: log.meetingDate ? new Date(log.meetingDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      studentId: log.studentId,
      content: log.content || "",
      difficulties: log.difficulties || "",
      nextActions: log.nextActions || "",
      deadline: log.deadline ? new Date(log.deadline).toISOString().split("T")[0] : "",
      notes: log.notes || ""
    })
    setShowConsultationModal(true)
  }

  // Navigate Previous / Next Student
  const activeStudentIndex = students.findIndex(s => s.id === selectedStudentId)
  const selectedClass = activeClass

  const handlePrevStudent = () => {
    if (activeStudentIndex > 0) {
      setSelectedStudentId(students[activeStudentIndex - 1].id)
    }
  }

  const handleNextStudent = () => {
    if (activeStudentIndex < students.length - 1) {
      setSelectedStudentId(students[activeStudentIndex + 1].id)
    }
  }

    const filteredStudents = students.filter(st => {
    const isSubmitted = submittedStudentCodes.includes(st.studentCode)
    if (submissionFilter === "SUBMITTED") return isSubmitted
    if (submissionFilter === "NOT_SUBMITTED") return !isSubmitted
    return true
  })
  
  const submittedCount = students.filter(st => submittedStudentCodes.includes(st.studentCode)).length
  const notSubmittedCount = students.length - submittedCount
  const submissionPercent = students.length > 0 ? Math.round((submittedCount / students.length) * 100) : 0

  // Class-wide evaluation metrics (Tab 3)
  const evaluatedCount = students.filter(st => {
    return classTermEvaluations.some(e => (e.studentId === st.id || e.studentCode === st.studentCode) && e.term === evalTerm)
  }).length
  const notEvaluatedCount = students.length - evaluatedCount
  const evaluatedPercent = students.length > 0 ? Math.round((evaluatedCount / students.length) * 100) : 0

  const filteredClassEvalStudents = students.filter(st => {
    const hasEval = classTermEvaluations.some(e => (e.studentId === st.id || e.studentCode === st.studentCode) && e.term === evalTerm)
    if (evalFilter === "EVALUATED") return hasEval
    if (evalFilter === "NOT_EVALUATED") return !hasEval
    if (evalSearch.trim()) {
      const q = evalSearch.toLowerCase().trim()
      return st.studentName.toLowerCase().includes(q) || (st.studentCode && st.studentCode.toLowerCase().includes(q))
    }
    return true
  })

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-slate-800 pb-20">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#48BFE3] rounded-3xl p-6 text-white shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-white/15 uppercase tracking-wider text-teal-200">
            <Compass className="w-4 h-4 text-teal-300" />
            <span>QUẢN LÝ CỐ VẤN HỌC TẬP & NHẬT KÝ THEO DÕI MỤC TIÊU</span>
          </div>

          {/* Class & Student Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-teal-100">Chọn Lớp:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl bg-white/20 text-white font-extrabold text-xs focus:outline-none border border-white/30 cursor-pointer"
            >
              {classes.length === 0 ? (
                <option value="" disabled className="text-slate-800">Không có lớp CN ({academicYearId ? "năm đang chọn" : "năm hiện hành"})</option>
              ) : (
                classes.map(c => (
                  <option key={c.id} value={c.id} className="text-slate-800">Lớp: {c.className}</option>
                ))
              )}
            </select>

            <span className="text-xs font-bold text-teal-100 ml-2">Chọn Học Sinh:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl bg-white/20 text-white font-extrabold text-xs focus:outline-none border border-white/30 cursor-pointer"
            >
              {students.map(s => (
                <option key={s.id} value={s.id} className="text-slate-800">HS: {s.studentName} ({s.studentCode})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Cố Vấn Học Tập — {activeStudent?.studentName || "Chọn Học Sinh"} ({activeStudent?.studentCode || ""})
          </h1>
          <p className="text-xs text-teal-100 font-medium mt-1">
            Theo dõi tiến độ mục tiêu cá nhân từng học sinh (Khối {selectedClass?.grade || ""}), nhật ký tham vấn và Đánh giá kỳ theo Rubric.
          </p>
        </div>

        {/* Empty classes warning notice */}
        {!loading && classes.length === 0 && (
          <div className="bg-amber-500/20 border border-amber-300/40 rounded-2xl p-4 text-xs font-semibold text-amber-100 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />
            <span>
              Thầy/Cô chưa có phân công làm Giáo viên Chủ nhiệm (GVCN) trong năm học này. Vui lòng chọn năm học khác trên thanh tiêu đề hoặc liên hệ Quản trị viên.
            </span>
          </div>
        )}

        {/* Feature Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
          <button
            onClick={() => setActiveTab("tracking")}
            className={
              activeTab === "tracking"
                ? "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all bg-white text-[#003B3A] shadow-md"
                : "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all bg-white/15 text-white hover:bg-white/25"
            }
          >
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <span>1. Theo Dõi Mục Tiêu Theo Học Sinh</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("unlocks")
              loadClassUnlocks()
            }}
            className={
              activeTab === "unlocks"
                ? "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all bg-white text-[#003B3A] shadow-md"
                : "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all bg-white/15 text-white hover:bg-white/25"
            }
          >
            <Key className="w-4 h-4 text-amber-300" />
            <span>2. Mở Khóa Mục Tiêu (K9–12)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("rubric_eval")
              loadClassTermEvaluations()
            }}
            className={
              activeTab === "rubric_eval"
                ? "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all bg-white text-[#003B3A] shadow-md"
                : "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all bg-white/15 text-white hover:bg-white/25"
            }
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>3. Đánh Giá Kỳ theo Rubric</span>
          </button>

          <button
            onClick={() => setActiveTab("consultations")}
            className={
              activeTab === "consultations"
                ? "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all bg-white text-[#003B3A] shadow-md"
                : "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all bg-white/15 text-white hover:bg-white/25"
            }
          >
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span>4. Theo Dõi & Nhật Ký Tư Vấn</span>
            {classConsultationStats.totalStudents > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                classConsultationStats.unconsultedCount === 0
                  ? "bg-emerald-400 text-emerald-950"
                  : activeTab === "consultations"
                    ? "bg-teal-100 text-teal-900 border border-teal-200"
                    : "bg-white/20 text-teal-200"
              }`}>
                {classConsultationStats.consultedCount}/{classConsultationStats.totalStudents} HS
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("sos")}
            className={
              activeTab === "sos"
                ? "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all bg-white text-[#003B3A] shadow-md"
                : "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all bg-white/15 text-white hover:bg-white/25"
            }
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>5. Yêu Cầu SOS ({helpRequests.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("requests")
              loadClassAdjustmentRequests()
            }}
            className={
              activeTab === "requests"
                ? "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all bg-white text-[#003B3A] shadow-md"
                : "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all bg-white/15 text-white hover:bg-white/25"
            }
          >
            <Edit3 className="w-4 h-4 text-amber-300" />
            <span>6. Yêu Cầu Mở Phiếu</span>
            {pendingAdjustmentCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {pendingAdjustmentCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ----------------- TAB 1: THEO DÕI MỤC TIÊU HIỂN THỊ THEO TỪNG HỌC SINH ----------------- */}
      {activeTab === "tracking" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          
          {/* CLASS SUBMISSION STATS & COLOR-CODED STUDENT SELECTOR */}
          <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-4">
            
            {/* Executive Class Statistics Bar */}
            <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#48BFE3] rounded-2xl p-4 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
              <a
                href={`/api/advisory/export-observation-book?classId=${selectedClassId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-sm transition-all"
              >
                <span>📖</span> Xuất Sổ Quan Sát GVCN (PDF)
              </a>
                <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center font-black text-lg text-teal-200 shrink-0">
                  📊
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">
                    Thống Kê Tiến Độ Nộp Phiếu Mục Tiêu: {selectedClass?.className}
                  </h3>
                  <p className="text-xs text-teal-100 font-medium mt-0.5">
                    Tổng số: <strong>{students.length} học sinh</strong> • Đã nộp: <strong className="text-emerald-300">{submittedCount} HS</strong> ({submissionPercent}%)
                  </p>
                </div>
              </div>

              {/* Stat badges */}
              <div className="flex items-center gap-2">
                <div className="bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-center min-w-28">
                  <span className="text-[10px] font-black uppercase text-teal-200 block">Đã Nộp Phiếu</span>
                  <span className="text-sm font-black text-emerald-300">{submittedCount} / {students.length} HS</span>
                </div>
                <div className="bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-center min-w-28">
                  <span className="text-[10px] font-black uppercase text-amber-200 block">Chưa Nộp</span>
                  <span className="text-sm font-black text-amber-300">{notSubmittedCount} HS</span>
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase">
                <span>Tỷ lệ hoàn thành nộp bài cả lớp</span>
                <span className="text-teal-700 font-extrabold">{submissionPercent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700" 
                  style={{ width: `${submissionPercent}%` }}
                />
              </div>
            </div>

            {/* Quick Filters & Student Color-Coded Pills */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-teal-600" />
                  <span>DANH SÁCH HỌC SINH LỚP ({filteredStudents.length} HS):</span>
                </span>

                {/* Filter buttons */}
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-black">
                  <button
                    type="button"
                    onClick={() => setSubmissionFilter("ALL")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      submissionFilter === "ALL" ? "bg-[#003B3A] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tất cả ({students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionFilter("SUBMITTED")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      submissionFilter === "SUBMITTED" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-800 hover:text-emerald-950"
                    }`}
                  >
                    🟢 Đã nộp ({submittedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionFilter("NOT_SUBMITTED")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      submissionFilter === "NOT_SUBMITTED" ? "bg-slate-700 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    ⚪ Chưa nộp ({notSubmittedCount})
                  </button>
                </div>
              </div>

              {/* Student Color-Coded Pills Grid */}
              <div className="flex flex-wrap gap-2 pt-1 max-h-56 overflow-y-auto pr-1">
                {filteredStudents.map((st, idx) => {
                  const isSubmitted = submittedStudentCodes.includes(st.studentCode)
                  const isSelected = st.id === selectedStudentId

                  return (
                    <StudentSnapshotPopover
                      key={st.id}
                      student={{
                        id: st.id,
                        studentCode: st.studentCode,
                        studentName: st.studentName,
                        className: activeClass?.name,
                        grade: String(currentGrade)
                      }}
                      targetScore={8.0}
                      currentScore={isSubmitted ? 8.2 : 7.4}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId(st.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border shadow-xs cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-[#003B3A] shadow-md scale-105 z-10 "
                            : "hover:scale-102 "
                        }${
                          isSubmitted
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {isSubmitted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-label="Đã hoàn thành mục tiêu" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-label="Chưa hoàn thành" />
                        )}
                        <span>{idx + 1}. {st.studentName}</span>
                        {isSubmitted && (
                          <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-black inline-flex items-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    </StudentSnapshotPopover>
                  )
                })}
              </div>
            </div>

          </div>



          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 pt-2">
            <div>
              <h3 className="text-base font-black text-[#003B3A] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                <span>Bảng Theo Dõi Tiến Độ Mục Tiêu: {activeStudent?.studentName} ({activeStudent?.studentCode})</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Hiển thị đầy đủ {gradeCategoryWeights.length} nhóm mục tiêu cá nhân Khối {currentGrade.replace("K", "")} do học sinh {activeStudent?.studentName} tự điền.
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
                    onClick={() => setCheckPoint(cp.id as any)}
                    className={
                      checkPoint === cp.id
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

          {/* Adjustment Request & Unlock Status for Selected Student */}
          {(() => {
            const req = Array.isArray(adjustmentRequests) ? adjustmentRequests.find((r: any) => r.studentId === selectedStudentId) : null
            const isUnlocked = req && req.status === "APPROVED"
            const isPending = req && req.status === "PENDING"
            const isSubmitted = activeStudent && submittedStudentCodes.includes(activeStudent.studentCode)

            return (
              <div className="space-y-3">
                {isPending && (
                  <div className="p-4 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 border-2 border-amber-400 rounded-2xl text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0 shadow-sm">
                        <Clock className="w-5 h-5 animate-spin" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-amber-950 flex items-center gap-2">
                          <span>HỌC SINH XIN MỞ PHIẾU ĐỂ HIỆU CHỈNH</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black">CHỜ GVCN DUYỆT</span>
                        </h4>
                        <p className="text-xs text-amber-900 font-medium mt-0.5">
                          Lý do: <strong className="italic font-bold">"{req.reason}"</strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequestForReview(req)
                          setReviewActionType("APPROVED")
                          setTeacherResponseNote("Thầy/Cô đồng ý mở phiếu. Em hãy cập nhật lại mục tiêu và nộp lại nhé.")
                          setShowReviewModal(true)
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Phê Duyệt Mở Phiếu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequestForReview(req)
                          setReviewActionType("REJECTED")
                          setTeacherResponseNote("")
                          setShowReviewModal(true)
                        }}
                        className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Từ Chối</span>
                      </button>
                    </div>
                  </div>
                )}

                {isUnlocked && (
                  <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 border-2 border-emerald-400 rounded-2xl text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0 shadow-sm">
                        <Edit3 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-emerald-950 flex items-center gap-2">
                          <span>PHIẾU ĐANG ĐƯỢC MỞ KHÓA CHO HỌC SINH HIỆU CHỈNH</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black">ĐANG MỞ</span>
                        </h4>
                        <p className="text-xs text-emerald-800 font-medium mt-0.5">
                          Học sinh đang có quyền chỉnh sửa lại và nộp lại phiếu. Sau khi học sinh nộp lại, phiếu sẽ tự động khóa.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLockGoal(selectedStudentId)}
                      className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Khóa Lại Phiếu</span>
                    </button>
                  </div>
                )}

                {!isPending && !isUnlocked && isSubmitted && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Lock className="w-4 h-4 text-slate-500" />
                      <span>Phiếu mục tiêu của học sinh đã nộp và đang khóa chỉnh sửa.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleForceUnlock(selectedStudentId)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-black border border-amber-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-700" />
                      <span>Chủ Động Mở Khóa Cho HS Hiệu Chỉnh</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Student Commitment Banner */}
          {activeStudentCommitment && (
            <div className="p-4 bg-teal-50 border-2 border-teal-200 rounded-2xl text-teal-950 space-y-1 shadow-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-teal-700 shrink-0" />
                <span className="text-xs font-black uppercase text-teal-900">
                  LỜI CAM KẾT VÀ XÁC NHẬN CỦA HỌC SINH ({activeStudent?.studentName}):
                </span>
              </div>
              <p className="text-xs font-bold text-teal-800 italic pl-6">
                "{activeStudentCommitment}"
              </p>
            </div>
          )}

          {/* View Mode Switcher & Goal Tracking Cards */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200 mb-4">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider pl-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>Chế độ hiển thị:</span>
            </span>

            <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  viewMode === "card"
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Thẻ Dashboard Khoa Học</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  viewMode === "table"
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Bảng Tổng Quan Gọn</span>
              </button>
            </div>
          </div>

          {/* CARD DASHBOARD VIEW (KHOA HỌC, ĐỒNG NHẤT KHỐI MỤC TIÊU VỚI GIAO DIỆN HỌC SINH) */}
          {viewMode === "card" && (
            <div className="grid grid-cols-1 gap-6">
              {singleStudentTrackingRows.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Đang nạp mục tiêu của học sinh...
                </div>
              ) : (
                gradeCategoryWeights.map((catObj, catIdx) => {
                  const catItems = singleStudentTrackingRows.filter(r => r.categoryKey === catObj.key || r.category === catObj.label || (r.category && r.category.includes(catObj.key)))
                  const catEval = overallEvalResult.categories.find(c => c.categoryKey === catObj.key)
                  const numberStr = `0${catIdx + 1}`
                  const themesList = [
                    { border: "border-sky-200", badgeBg: "bg-sky-50 border-sky-200", badgeText: "text-sky-800", numberBadge: "bg-sky-600 text-white" },
                    { border: "border-indigo-200", badgeBg: "bg-indigo-50 border-indigo-200", badgeText: "text-indigo-800", numberBadge: "bg-indigo-600 text-white" },
                    { border: "border-emerald-200", badgeBg: "bg-emerald-50 border-emerald-200", badgeText: "text-emerald-800", numberBadge: "bg-emerald-600 text-white" },
                    { border: "border-purple-200", badgeBg: "bg-purple-50 border-purple-200", badgeText: "text-purple-800", numberBadge: "bg-purple-600 text-white" },
                    { border: "border-amber-200", badgeBg: "bg-amber-50 border-amber-200", badgeText: "text-amber-950", numberBadge: "bg-amber-600 text-white" }
                  ]
                  const theme = themesList[catIdx % themesList.length]

                  return (
                    <div key={catObj.key} className={`bg-white rounded-3xl border-2 ${theme.border} shadow-xs hover:shadow-md transition-all overflow-hidden space-y-4 p-5 sm:p-6`}>
                      {/* Category Header */}
                      <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-2xl ${theme.numberBadge} flex items-center justify-center font-black text-xs shadow-xs shrink-0`}>
                            {numberStr}
                          </span>
                          <div>
                            <h4 className="font-black text-base text-slate-900 tracking-tight">
                              {catObj.label}
                            </h4>
                            {catObj.description && (
                              <p className="text-[11px] text-slate-500 font-medium">
                                {catObj.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-black shadow-2xs">
                            Trọng số: {catObj.weight}%
                          </span>
                          <span className={`px-3 py-1 ${theme.badgeBg} ${theme.badgeText} border rounded-full text-xs font-black shadow-2xs`}>
                            {catItems.length} mục tiêu nhỏ
                          </span>
                          {catEval && catEval.evaluatedCount > 0 && (
                            <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                              catEval.status === "DAT" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                              catEval.status === "TIEN_TRIEN" ? "bg-amber-100 text-amber-900 border-amber-300" :
                              catEval.status === "CHUA_DAT" ? "bg-rose-100 text-rose-800 border-rose-300" :
                              "bg-slate-100 text-slate-700 border-slate-300"
                            }`}>
                              Đạt {catEval.averagePercent}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Goal items under this category */}
                      {catItems.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 font-bold text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          Học sinh chưa điền nội dung mục tiêu nhóm này
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {catItems.map((item, itemIdx) => {
                            const globalIdx = singleStudentTrackingRows.findIndex(r => r === item)

                            return (
                              <div key={item.goalId || itemIdx} className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                                {/* Sub-Header: MỤC TIÊU CỤ THỂ #1 + Status Selector + Teacher Note input */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                                  <span className="text-xs font-black text-slate-800 flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[11px] flex items-center justify-center font-bold">
                                      #{itemIdx + 1}
                                    </span>
                                    <span>MỤC TIÊU CỤ THỂ #{itemIdx + 1}</span>
                                  </span>

                                  {/* Controls Row */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                                      Mốc: {checkPoint === "GIUA_KY_1" ? "Giữa kỳ 1" : checkPoint === "CUOI_KY_1" ? "Cuối kỳ 1" : checkPoint === "GIUA_KY_2" ? "Giữa kỳ 2" : "Cuối kỳ 2"}
                                    </span>

                                    <select
                                      value={item.progressStatus || "CHUA_DANH_GIA"}
                                      onChange={(e) => {
                                        const updated = [...singleStudentTrackingRows]
                                        if (globalIdx !== -1) updated[globalIdx].progressStatus = e.target.value
                                        setSingleStudentTrackingRows(updated)
                                      }}
                                      className={`px-3 py-1.5 rounded-xl font-black text-xs border focus:outline-none cursor-pointer shadow-xs ${
                                        item.progressStatus === "DAT" || item.progressStatus === "HOAN_THANH"
                                          ? "bg-emerald-500 text-white border-emerald-600"
                                          : item.progressStatus === "CHUA_DAT"
                                          ? "bg-rose-500 text-white border-rose-600"
                                          : item.progressStatus === "CAN_CO_GANG"
                                          ? "bg-amber-500 text-white border-amber-600"
                                          : item.progressStatus === "TIEN_TRIEN"
                                          ? "bg-amber-400 text-amber-950 border-amber-500"
                                          : "bg-slate-200 text-slate-800 border-slate-300"
                                      }`}
                                    >
                                      <option value="CHUA_DANH_GIA" className="bg-white text-slate-900">⚪ Chưa đánh giá</option>
                                      <option value="TIEN_TRIEN" className="bg-white text-slate-900">🟡 Đang tiến triển</option>
                                      <option value="DAT" className="bg-white text-slate-900">🟢 Đạt</option>
                                      <option value="CHUA_DAT" className="bg-white text-slate-900">🔴 Chưa Đạt</option>
                                    </select>

                                    <input
                                      type="text"
                                      value={item.teacherNotes || ""}
                                      onChange={(e) => {
                                        const updated = [...singleStudentTrackingRows]
                                        if (globalIdx !== -1) updated[globalIdx].teacherNotes = e.target.value
                                        setSingleStudentTrackingRows(updated)
                                      }}
                                      placeholder="Ghi chú nhận xét từ GVCN..."
                                      className="p-1.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:border-teal-500 focus:outline-none w-full md:w-56"
                                    />
                                  </div>
                                </div>

                                {/* Card Body */}
                                {item.targetText && item.targetText !== "Em chưa điền nội dung mục tiêu nhóm này" ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    
                                    {/* Left Box: Mục tiêu cụ thể & Kế hoạch */}
                                    <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                                      <div>
                                        <span className="text-[11px] font-black text-teal-800 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                                          🎯 Nội dung mục tiêu cụ thể của em:
                                        </span>
                                        <p className="font-bold text-slate-900 leading-relaxed text-xs">{item.targetText}</p>
                                      </div>

                                      {item.actionText && (
                                        <div className="pt-2.5 border-t border-slate-100">
                                          <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                                            ⚡ Em sẽ làm gì để đạt được mục tiêu này (Hành động cụ thể):
                                          </span>
                                          <p className="font-semibold text-slate-800 leading-relaxed text-xs">{item.actionText}</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Right Box: Yêu cầu Hỗ trợ */}
                                    <div className="space-y-2.5">
                                      {item.teacherSupportRequest && (
                                        <div className="p-3.5 rounded-xl bg-sky-50/90 border border-sky-200/80 space-y-1">
                                          <span className="font-black text-sky-950 text-xs flex items-center gap-1.5">
                                            💬 Em mong muốn Thầy Cô / bạn bè hỗ trợ mình như thế nào?
                                          </span>
                                          <p className="font-medium text-slate-800 text-xs leading-relaxed">{item.teacherSupportRequest}</p>
                                        </div>
                                      )}

                                      {item.parentSupportRequest && (
                                        <div className="p-3.5 rounded-xl bg-rose-50/90 border border-rose-200/80 space-y-1">
                                          <span className="font-black text-rose-950 text-xs flex items-center gap-1.5">
                                            🏡 Em mong muốn Ba Mẹ hỗ trợ mình như thế nào?
                                          </span>
                                          <p className="font-medium text-slate-800 text-xs leading-relaxed">{item.parentSupportRequest}</p>
                                        </div>
                                      )}
                                    </div>

                                  </div>
                                ) : (
                                  <div className="p-4 text-center text-slate-400 font-bold text-xs italic bg-white rounded-xl border border-dashed border-slate-200">
                                    Học sinh chưa điền nội dung mục tiêu nhóm này
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* TABLE VIEW (TABLE GỌN) */}
          {viewMode === "table" && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                    
                    <th className="p-3.5 border-r border-slate-200 w-52">Nhóm mục tiêu</th>
                    <th className="p-3.5 border-r border-slate-200">Mục tiêu cụ thể</th>
                    <th className="p-3.5 border-r border-slate-200 w-28">Mốc kiểm tra</th>
                    <th className="p-3.5 border-r border-slate-200 w-44">Mức độ đạt</th>
                    <th className="p-3.5">Ghi chú của GVCN / CVHT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold">
                  {singleStudentTrackingRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                        Đang tải mục tiêu của học sinh...
                      </td>
                    </tr>
                  ) : (
                    singleStudentTrackingRows.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        
                        <td className="p-3.5 border-r border-slate-200 align-top bg-slate-50/40">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-teal-100 text-teal-900 block text-left">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3.5 border-r border-slate-200 text-slate-800 align-top">
                          {item.targetText && item.targetText !== "Em chưa điền nội dung mục tiêu nhóm này" ? (
                            <div className="space-y-1.5 text-xs">
                              <p className="font-bold text-slate-900">{item.targetText}</p>
                              {item.actionText && (
                                <p className="font-semibold text-amber-900 text-[11px]">⚡ Việc làm: {item.actionText}</p>
                              )}
                              {item.teacherSupportRequest && (
                                <p className="font-medium text-sky-800 text-[11px]">💬 Thầy/Cô & Bạn hỗ trợ: {item.teacherSupportRequest}</p>
                              )}
                              {item.parentSupportRequest && (
                                <p className="font-medium text-rose-800 text-[11px]">🏡 Ba/Mẹ hỗ trợ: {item.parentSupportRequest}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400 italic">Em chưa điền nội dung mục tiêu nhóm này</span>
                          )}
                        </td>
                        <td className="p-3.5 border-r border-slate-200 font-bold text-slate-600 align-top">
                          {checkPoint === "GIUA_KY_1" ? "Giữa kỳ 1" : checkPoint === "CUOI_KY_1" ? "Cuối kỳ 1" : checkPoint === "GIUA_KY_2" ? "Giữa kỳ 2" : "Cuối kỳ 2"}
                        </td>
                        <td className="p-3.5 border-r border-slate-200 align-top">
                          <select
                            value={item.progressStatus || "CHUA_DANH_GIA"}
                            onChange={(e) => {
                              const updated = [...singleStudentTrackingRows]
                              updated[idx].progressStatus = e.target.value
                              setSingleStudentTrackingRows(updated)
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-xl font-black text-xs border focus:outline-none cursor-pointer shadow-xs ${
                              item.progressStatus === "DAT" || item.progressStatus === "HOAN_THANH"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : item.progressStatus === "CHUA_DAT"
                                ? "bg-rose-100 text-rose-800 border-rose-300"
                                : item.progressStatus === "CAN_CO_GANG"
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : item.progressStatus === "TIEN_TRIEN"
                                ? "bg-amber-100 text-amber-950 border-amber-300"
                                : "bg-slate-100 text-slate-700 border-slate-300"
                            }`}
                          >
                            <option value="CHUA_DANH_GIA">⚪ Chưa đánh giá</option>
                            <option value="TIEN_TRIEN">🟡 Đang tiến triển</option>
                            <option value="DAT">🟢 Đạt / Đã hoàn thành</option>
                            <option value="CHUA_DAT">🔴 Chưa đạt</option>
                            <option value="CAN_CO_GANG">🟠 Cần cố gắng</option>
                          </select>
                        </td>
                        <td className="p-3.5 align-top">
                          <input
                            type="text"
                            value={item.teacherNotes}
                            onChange={(e) => {
                              const updated = [...singleStudentTrackingRows]
                              updated[idx].teacherNotes = e.target.value
                              setSingleStudentTrackingRows(updated)
                            }}
                            placeholder="Nhập ghi chú theo dõi..."
                            className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:border-teal-500"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevStudent}
                disabled={activeStudentIndex <= 0}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-bold text-slate-700 flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Học Sinh Trước
              </button>
              <button
                onClick={handleNextStudent}
                disabled={activeStudentIndex >= students.length - 1}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-bold text-slate-700 flex items-center gap-1.5"
              >
                Học Sinh Tiếp <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleSaveStudentTracking}
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-[#003B3A] text-white text-xs font-black flex items-center gap-2 hover:bg-[#004D4A] shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Đang lưu..." : ("Lưu Tiến Độ Mục Tiêu Em " + (activeStudent?.studentName || ""))}</span>
            </button>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: ĐÁNH GIÁ KỲ THEO RUBRIC (BẢNG CẢ LỚP & CHI TIẾT HỌC SINH) ----------------- */}
      {activeTab === "rubric_eval" && (
        <div className="space-y-6">

          {/* ========================================================================= */}
          {/* PHẦN 1: BẢNG TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ TOÀN LỚP (HIỂN THỊ THEO HỌC SINH LỚP) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm space-y-4">
            
            {/* Header & Term Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-teal-50 text-teal-900 border border-teal-200 uppercase tracking-wider mb-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>KẾT QUẢ ĐÁNH GIÁ TỔNG THỂ THEO TRỌNG SỐ — LỚP {selectedClass?.className}</span>
                </div>
                <h3 className="text-lg font-black text-[#003B3A]">
                  Bảng Tổng Hợp Đánh Giá Kỳ Cố Vấn Học Tập ({evalTerm === "HK1" ? "Học kỳ I" : "Học kỳ II"})
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Theo dõi kết quả đo lường theo ma trận trọng số chuẩn ({overallEvalResult.gradeLevel}) và thang Rubric cho toàn bộ {students.length} học sinh.
                </p>
              </div>

              {/* Term Selector & Export Button */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-600 pl-2">Kỳ:</span>
                  <select
                    value={evalTerm}
                    onChange={(e) => {
                      const newTerm = e.target.value as "HK1" | "HK2"
                      setEvalTerm(newTerm)
                      setCheckPoint(newTerm === "HK1" ? "CUOI_KY_1" : "CUOI_KY_2")
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white text-[#003B3A] font-black text-xs border border-slate-200 shadow-xs cursor-pointer focus:outline-none"
                  >
                    <option value="HK1">Học kỳ I</option>
                    <option value="HK2">Học kỳ II</option>
                  </select>
                </div>

                <a
                  href={`/api/advisory/export-observation-book?classId=${selectedClassId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#004D4A] text-white font-extrabold text-xs shadow-sm transition-all"
                >
                  <span>📖</span> Xuất Sổ Quan Sát (PDF)
                </a>
              </div>
            </div>

            {/* Executive Progress & Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-teal-800 block">Đã Đánh Giá Kỳ</span>
                  <span className="text-lg font-black text-[#003B3A]">
                    {evaluatedCount} / {students.length} HS
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-teal-600 text-white font-black text-xs shadow-2xs">
                  {evaluatedPercent}%
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-800 block">Chưa Hoàn Tất Đánh Giá</span>
                  <span className="text-lg font-black text-amber-950">
                    {notEvaluatedCount} HS
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-amber-200 text-amber-950 font-black text-xs">
                  {students.length > 0 ? Math.round((notEvaluatedCount / students.length) * 100) : 0}%
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-600 block">Ma Trận Trọng Số</span>
                  <span className="text-xs font-black text-slate-900 block mt-0.5">
                    Khối {overallEvalResult.gradeLevel} (Tổng: {overallEvalResult.totalWeights}%)
                  </span>
                </div>
                <span className="text-lg font-black text-teal-700">
                  {gradeCategoryWeights.length} nhóm
                </span>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={evalSearch}
                  onChange={(e) => setEvalSearch(e.target.value)}
                  placeholder="Tìm theo tên học sinh hoặc mã số..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>

              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setEvalFilter("ALL")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    evalFilter === "ALL" ? "bg-[#003B3A] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tất cả ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEvalFilter("EVALUATED")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    evalFilter === "EVALUATED" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-800 hover:text-emerald-950"
                  }`}
                >
                  🟢 Đã đánh giá ({evaluatedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setEvalFilter("NOT_EVALUATED")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    evalFilter === "NOT_EVALUATED" ? "bg-slate-700 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ⚪ Chưa đánh giá ({notEvaluatedCount})
                </button>
              </div>
            </div>

            {/* Class-Wide Evaluation Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                    <th className="p-3 border-r border-slate-200 w-12 text-center">STT</th>
                    <th className="p-3 border-r border-slate-200 min-w-[180px]">Học sinh</th>
                    <th className="p-3 border-r border-slate-200 w-28 text-center">Nộp MT</th>
                    <th className="p-3 border-r border-slate-200 w-32 text-center">Điểm Tổng Kết (%)</th>
                    <th className="p-3 border-r border-slate-200 w-28 text-center">Thang Rubric</th>
                    <th className="p-3 border-r border-slate-200 w-32 text-center">Xếp loại</th>
                    <th className="p-3 border-r border-slate-200 min-w-[220px]">3 Tiêu chí Rubric (1-5)</th>
                    <th className="p-3 text-center w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                  {filteredClassEvalStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                        Không tìm thấy học sinh nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredClassEvalStudents.map((st, idx) => {
                      const isSubmitted = submittedStudentCodes.includes(st.studentCode)
                      const isSelected = st.id === selectedStudentId
                      const stEval = classTermEvaluations.find((e: any) => (e.studentId === st.id || e.studentCode === st.studentCode) && e.term === evalTerm)

                      // Calculate display metrics
                      const goalL = stEval?.goalCompletionLevel || 0
                      const initL = stEval?.initiativeLevel || 0
                      const partL = stEval?.participationAttitude || 0
                      const hasEvalData = goalL > 0 || initL > 0 || partL > 0

                      const avgRubric = hasEvalData
                        ? Number(([goalL, initL, partL].filter(v => v > 0).reduce((a, b) => a + b, 0) / [goalL, initL, partL].filter(v => v > 0).length).toFixed(1))
                        : 0

                      // If this is currently selected active student, use computed overallEvalResult for highest real-time accuracy
                      const percentDisplay = isSelected && overallEvalResult.overallPercent > 0
                        ? overallEvalResult.overallPercent
                        : hasEvalData
                        ? Math.round((avgRubric / 5) * 100)
                        : 0

                      const classLabel = percentDisplay >= 90
                        ? { label: "Xuất sắc 🌟", color: "bg-emerald-100 text-emerald-900 border-emerald-300" }
                        : percentDisplay >= 70
                        ? { label: "Tốt 🟢", color: "bg-teal-100 text-teal-900 border-teal-300" }
                        : percentDisplay >= 50
                        ? { label: "Khá 🟡", color: "bg-amber-100 text-amber-900 border-amber-300" }
                        : percentDisplay > 0
                        ? { label: "Cần cố gắng 🟠", color: "bg-orange-100 text-orange-900 border-orange-300" }
                        : { label: "Chưa đánh giá ⚪", color: "bg-slate-100 text-slate-600 border-slate-200" }

                      return (
                        <tr
                          key={st.id}
                          onClick={() => setSelectedStudentId(st.id)}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-teal-50/90 font-bold"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-3 border-r border-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-xs">{st.studentName}</span>
                              {isSelected && (
                                <span className="px-2 py-0.2 rounded-full bg-[#003B3A] text-white text-[10px] font-black shrink-0">
                                  Đang chọn
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block font-normal">{st.studentCode}</span>
                          </td>
                          <td className="p-3 border-r border-slate-200 text-center">
                            {isSubmitted ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                                🟢 Đã nộp
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200 inline-block">
                                ⚪ Chưa nộp
                              </span>
                            )}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-center font-black">
                            {percentDisplay > 0 ? (
                              <span className="text-sm text-[#003B3A]">{percentDisplay}%</span>
                            ) : (
                              <span className="text-slate-400 font-normal italic">—</span>
                            )}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-center">
                            {avgRubric > 0 ? (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-950 border border-amber-200 font-black text-xs inline-block">
                                {avgRubric} / 5.0 ⭐
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal italic">—</span>
                            )}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border inline-block ${classLabel.color}`}>
                              {classLabel.label}
                            </span>
                          </td>
                          <td className="p-3 border-r border-slate-200">
                            {hasEvalData ? (
                              <div className="flex items-center gap-1.5 text-[11px] font-black">
                                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200" title="1. Hoàn thành mục tiêu">
                                  🎯 {goalL > 0 ? `M${goalL}` : "-"}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200" title="2. Mức độ chủ động">
                                  ⚡ {initL > 0 ? `M${initL}` : "-"}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200" title="3. Thái độ tham gia">
                                  🤝 {partL > 0 ? `M${partL}` : "-"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic font-normal">Chưa chấm điểm Rubric</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedStudentId(st.id)
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                                isSelected
                                  ? "bg-[#003B3A] text-white border-[#003B3A] shadow-xs"
                                  : "bg-white text-teal-800 border-teal-300 hover:bg-teal-50"
                              }`}
                            >
                              {isSelected ? "Đang chọn ✓" : "📝 Đánh giá"}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* PHẦN 2: KHỐI CHI TIẾT ĐÁNH GIÁ CỦA HỌC SINH ĐANG CHỌN */}
          {/* ========================================================================= */}
          <div className="space-y-6 pt-2">
            
            {/* Active Student Bar & Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#003B3A] text-white flex items-center justify-center font-black text-sm shadow-xs">
                  {activeStudentIndex + 1}
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span>Đánh Giá Chi Tiết: {activeStudent?.studentName || "Chọn học sinh"}</span>
                    <span className="text-xs text-slate-500 font-semibold">({activeStudent?.studentCode || ""})</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Kỳ: <strong>{evalTerm === "HK1" ? "Học kỳ I" : "Học kỳ II"}</strong> • Mốc kiểm tra: <strong>{checkPoint === "CUOI_KY_1" ? "Cuối kỳ 1" : checkPoint === "CUOI_KY_2" ? "Cuối kỳ 2" : checkPoint}</strong>
                  </p>
                </div>
              </div>

              {/* Prev / Next Student Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevStudent}
                  disabled={activeStudentIndex <= 0}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-bold text-slate-700 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> HS Trước
                </button>
                <button
                  type="button"
                  onClick={handleNextStudent}
                  disabled={activeStudentIndex >= students.length - 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-bold text-slate-700 flex items-center gap-1"
                >
                  HS Tiếp <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 1. KPI BANNER ĐO LƯỜNG KẾT QUẢ THEO DÕI THEO TRỌNG SỐ */}
            <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-teal-900 rounded-3xl p-6 text-white shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-amber-400 text-amber-950 font-black text-[11px] shadow-xs">
                      Ma trận trọng số {overallEvalResult.gradeLevel}
                    </span>
                    <span className="text-teal-200 text-xs font-bold">
                      Tổng trọng số: {overallEvalResult.totalWeights}%
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white mt-1 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-300" />
                    <span>Kết quả Đánh giá Tổng thể theo Trọng số ({activeStudent?.studentName || "Học sinh"})</span>
                  </h3>
                </div>

                {/* Score and Classification */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-3xl font-black text-amber-300">
                      {overallEvalResult.overallPercent}%
                    </div>
                    <div className="text-[11px] text-teal-200 font-semibold">
                      Thang Rubric: {overallEvalResult.overallRubricScore} / 5.0
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl border text-xs font-black shadow-md ${overallEvalResult.classificationColor}`}>
                    {overallEvalResult.classificationLabel}
                  </div>
                </div>
              </div>

              {/* 3 TIÊU CHÍ RUBRIC CHUẨN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/10 p-3 rounded-2xl border border-white/15">
                <div className="flex items-center justify-between px-3 py-1.5 bg-black/20 rounded-xl">
                  <span className="text-xs text-amber-200 font-bold flex items-center gap-1.5">
                    🎯 1. Mức hoàn thành mục tiêu:
                  </span>
                  <span className="text-sm font-black text-white">
                    {overallEvalResult.overallGoalCompletion > 0 ? `${overallEvalResult.overallGoalCompletion} / 5.0` : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-1.5 bg-black/20 rounded-xl">
                  <span className="text-xs text-sky-200 font-bold flex items-center gap-1.5">
                    ⚡ 2. Mức độ chủ động:
                  </span>
                  <span className="text-sm font-black text-white">
                    {overallEvalResult.overallInitiative > 0 ? `${overallEvalResult.overallInitiative} / 5.0` : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-1.5 bg-black/20 rounded-xl">
                  <span className="text-xs text-emerald-200 font-bold flex items-center gap-1.5">
                    🤝 3. Thái độ tham gia:
                  </span>
                  <span className="text-sm font-black text-white">
                    {overallEvalResult.overallParticipation > 0 ? `${overallEvalResult.overallParticipation} / 5.0` : "-"}
                  </span>
                </div>
              </div>

              {/* Category Breakdown Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                {overallEvalResult.categories.map((cat, cIdx) => (
                  <div key={cat.categoryKey || cIdx} className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-teal-100 truncate">{cat.categoryLabel.replace(/^[0-9.]+\s*/, '')}</span>
                      <span className="px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 font-black text-[10px] border border-teal-400/30 shrink-0">
                        Trọng số {cat.weight}%
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-lg font-black text-white">{cat.averagePercent}%</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        cat.status === "DAT" ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/30" :
                        cat.status === "TIEN_TRIEN" ? "bg-amber-500/30 text-amber-200 border border-amber-400/30" :
                        cat.status === "CAN_CO_GANG" ? "bg-orange-500/30 text-orange-200 border border-orange-400/30" :
                        cat.status === "CHUA_DAT" ? "bg-rose-500/30 text-rose-200 border border-rose-400/30" :
                        "bg-white/10 text-white/60"
                      }`}>
                        {cat.status === "DAT" ? "🟢 Đạt" : cat.status === "TIEN_TRIEN" ? "🟡 Tiến triển" : cat.status === "CAN_CO_GANG" ? "🟠 Cần cố gắng" : cat.status === "CHUA_DAT" ? "🔴 Chưa đạt" : "⚪ Chưa đánh giá"}
                      </span>
                    </div>
                    <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          cat.status === "DAT" ? "bg-emerald-400" :
                          cat.status === "TIEN_TRIEN" ? "bg-amber-400" :
                          cat.status === "CAN_CO_GANG" ? "bg-orange-400" :
                          cat.status === "CHUA_DAT" ? "bg-rose-400" : "bg-slate-400"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, cat.averagePercent))}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-teal-300/80 font-medium">
                      {cat.subGoalsCount} mục tiêu nhỏ ({cat.evaluatedCount} đã đánh giá)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. PHÁC HỌA BIỂU ĐỒ NĂNG LỰC & TRỌNG SỐ HỌC SINH (VISUAL 360° PROFILE) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-[#003B3A] flex items-center justify-center font-black text-sm shadow-2xs">
                    📊
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>Phác Họa Biểu Đồ Năng Lực & Trọng Số: {activeStudent?.studentName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${overallEvalResult.classificationColor}`}>
                        {overallEvalResult.classificationLabel}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Trực quan hóa tỷ lệ hoàn thành từng nhóm mục tiêu, 3 trục tiêu chí Rubric và điểm đóng góp vào tổng kết
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                    Khối: <strong>{overallEvalResult.gradeLevel}</strong> • Điểm Tổng Kết: <strong className="text-teal-900 text-xs">{overallEvalResult.overallPercent}% ({overallEvalResult.overallRubricScore}/5.0 ⭐)</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                
                {/* CỘT TRÁI (7 Cột): BIỂU ĐỒ CỘT SO SÁNH CÁC NHÓM MỤC TIÊU */}
                <div className="lg:col-span-7 bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-teal-600" />
                        <span>1. TIẾN ĐỘ TỪNG NHÓM (% ĐẠT VS. % TRỌNG SỐ)</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">Mục tiêu nhỏ đã lập</span>
                    </div>

                    <div className="space-y-3 pt-3">
                      {overallEvalResult.categories.map((cat, idx) => {
                        const contribScore = Number(((cat.averagePercent * cat.weight) / 100).toFixed(1))
                        return (
                          <div key={idx} className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-black text-slate-900 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                                <span>{cat.categoryLabel}</span>
                              </span>
                              <div className="flex items-center gap-2 text-[11px]">
                                <span className="text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                                  Trọng số: <strong>{cat.weight}%</strong>
                                </span>
                                <span className="font-black text-teal-900 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                                  Đạt: {cat.averagePercent}%
                                </span>
                                <span className="text-emerald-700 font-black text-[10px]">
                                  (+{contribScore}% tổng)
                                </span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex p-0.5 border border-slate-200">
                              <div
                                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-teal-500 to-emerald-500"
                                style={{ width: `${Math.min(100, Math.max(0, cat.averagePercent))}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-[11px] text-teal-900 font-medium flex items-center justify-between">
                    <span>💡 <strong>Điểm Tổng Kết:</strong> Tổng điểm đóng góp của {overallEvalResult.categories.length} nhóm</span>
                    <span className="text-xs font-black text-[#003B3A]">{overallEvalResult.overallPercent}%</span>
                  </div>
                </div>

                {/* CỘT PHẢI (5 Cột): THANG ĐO 3 TRỤC TIÊU CHÍ RUBRIC */}
                <div className="lg:col-span-5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>2. THANG ĐO 3 TIÊU CHÍ RUBRIC (1 - 5)</span>
                      </span>
                      <span className="text-[10px] font-bold text-teal-700">Có trọng số</span>
                    </div>

                    <div className="space-y-2.5 pt-3">
                      {/* Tiêu chí 1 */}
                      <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-amber-950 flex items-center gap-1">
                            🎯 1. Hoàn thành mục tiêu:
                          </span>
                          <span className="font-black text-amber-900 text-sm">
                            {overallEvalResult.overallGoalCompletion > 0 ? `${overallEvalResult.overallGoalCompletion} / 5.0` : "-"}
                          </span>
                        </div>
                        <div className="w-full bg-amber-200/50 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-700"
                            style={{ width: `${(overallEvalResult.overallGoalCompletion / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Tiêu chí 2 */}
                      <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-blue-950 flex items-center gap-1">
                            ⚡ 2. Mức độ chủ động:
                          </span>
                          <span className="font-black text-blue-900 text-sm">
                            {overallEvalResult.overallInitiative > 0 ? `${overallEvalResult.overallInitiative} / 5.0` : "-"}
                          </span>
                        </div>
                        <div className="w-full bg-blue-200/50 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-700"
                            style={{ width: `${(overallEvalResult.overallInitiative / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Tiêu chí 3 */}
                      <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-emerald-950 flex items-center gap-1">
                            🤝 3. Thái độ tham gia:
                          </span>
                          <span className="font-black text-emerald-900 text-sm">
                            {overallEvalResult.overallParticipation > 0 ? `${overallEvalResult.overallParticipation} / 5.0` : "-"}
                          </span>
                        </div>
                        <div className="w-full bg-emerald-200/50 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                            style={{ width: `${(overallEvalResult.overallParticipation / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-700 font-medium flex items-center justify-between">
                    <span>⭐ <strong>Quy đổi Rubric Tổng:</strong></span>
                    <span className="text-xs font-black text-amber-700">{overallEvalResult.overallRubricScore} / 5.0 sao</span>
                  </div>
                </div>

              </div>
            </div>

            {/* 3. PHIẾU ĐÁNH GIÁ KỲ CỐ VẤN HỌC TẬP (BẢNG CHẤM ĐIỂM CHI TIẾT) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Phiếu Đánh Giá Kỳ Cố Vấn Học Tập ({activeStudent?.studentName})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Đánh giá chi tiết từng mục tiêu nhỏ. Kết quả nhóm và tổng thể được tự động tính theo Trọng số chuẩn hóa
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Kỳ đánh giá:</span>
                  <span className="px-3 py-1 rounded-xl bg-teal-100 text-teal-900 font-black text-xs border border-teal-300">
                    {evalTerm === "HK1" ? "Học kỳ I" : "Học kỳ II"}
                  </span>
                </div>
              </div>

              {/* Excel Evaluation Table Format */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                      <th className="p-3 border-r border-slate-200 min-w-[200px]">Nhóm mục tiêu (Trọng số)</th>
                      <th className="p-3 border-r border-slate-200 min-w-[300px]">Mục tiêu cụ thể</th>
                      <th className="p-3 border-r border-slate-200 min-w-[150px]">Kết quả theo dõi</th>
                      <th className="p-3 border-r border-slate-200 min-w-[140px]">Mức hoàn thành MT (1-5)</th>
                      <th className="p-3 border-r border-slate-200 min-w-[140px]">Mức độ chủ động (1-5)</th>
                      <th className="p-3 border-r border-slate-200 min-w-[140px]">Thái độ tham gia (1-5)</th>
                      <th className="p-3 min-w-[220px]">Khuyến nghị cho phụ huynh / giáo viên bộ môn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {singleStudentTrackingRows.length > 0 ? (
                      singleStudentTrackingRows.map((item, idx) => {
                        const sameCatRows = singleStudentTrackingRows.filter(r => r.categoryKey === item.categoryKey || r.category === item.category)
                        const isFirstInCat = singleStudentTrackingRows.findIndex(r => r.categoryKey === item.categoryKey || r.category === item.category) === idx
                        const itemSubIdx = singleStudentTrackingRows.filter((r, i) => i <= idx && (r.categoryKey === item.categoryKey || r.category === item.category)).length
                        const catEval = overallEvalResult.categories.find(c => c.categoryKey === item.categoryKey)

                        return (
                          <tr key={idx} className="bg-white hover:bg-slate-50/50">
                            {/* 1. Nhóm mục tiêu + Trọng số */}
                            {isFirstInCat && (
                              <td rowSpan={sameCatRows.length} className="p-3 border-r border-slate-200 align-top bg-slate-50/50">
                                <div className="space-y-2">
                                  <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-teal-100 text-teal-900 border border-teal-200">
                                    {item.category}
                                  </span>
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300">
                                      Trọng số: {item.categoryWeight || catEval?.weight || 25}%
                                    </span>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      ({sameCatRows.length} mục tiêu nhỏ)
                                    </p>
                                  </div>
                                </div>
                              </td>
                            )}

                            {/* 2. Mục tiêu cụ thể */}
                            <td className="p-3 border-r border-slate-200 align-top">
                              <div className="space-y-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#003B3A] text-white text-[10px] font-black shadow-2xs">
                                  #{itemSubIdx} MỤC TIÊU CỤ THỂ #{itemSubIdx}
                                </span>
                                <p className="text-xs font-bold text-slate-900 leading-snug p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                  {item.targetText && item.targetText !== "Em chưa điền nội dung mục tiêu nhóm này" ? item.targetText : "Em chưa điền nội dung mục tiêu nhóm này"}
                                </p>
                                {item.actionText && (
                                  <p className="text-[11px] font-semibold text-amber-900 bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                                    ⚡ Việc làm: {item.actionText}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* 3. Kết quả theo dõi: TỰ ĐỘNG HIỆN KẾT QUẢ TỪ 3 TIÊU CHÍ */}
                            <td className="p-3 border-r border-slate-200 align-top">
                              {(() => {
                                const gLevel = item.goalCompletionLevel || 0
                                const iLevel = item.initiativeLevel || 0
                                const pLevel = item.participationAttitude || 0
                                const scores = [gLevel, iLevel, pLevel].filter(v => v > 0)

                                if (scores.length > 0) {
                                  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                                  if (avg >= 4.5) {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span>🟢 Đạt (100%)</span>
                                      </span>
                                    )
                                  }
                                  if (avg >= 3.5) {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                        <span>🟢 Đạt (75%)</span>
                                      </span>
                                    )
                                  }
                                  if (avg >= 2.5) {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        <span>🟡 Tiến triển (50%)</span>
                                      </span>
                                    )
                                  }
                                  if (avg >= 1.5) {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-orange-100 text-orange-900 border border-orange-300 shadow-2xs">
                                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                        <span>🟠 Cần cố gắng (25%)</span>
                                      </span>
                                    )
                                  }
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs">
                                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                      <span>🔴 Chưa đạt (10%)</span>
                                    </span>
                                  )
                                }

                                if (item.progressStatus === "DAT" || item.progressStatus === "HOAN_THANH") {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                      <span>🟢 Đạt (100%)</span>
                                    </span>
                                  )
                                }
                                if (item.progressStatus === "TIEN_TRIEN") {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                                      <span>🟡 Tiến triển (50%)</span>
                                    </span>
                                  )
                                }
                                if (item.progressStatus === "CAN_CO_GANG") {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-orange-100 text-orange-900 border border-orange-300">
                                      <span>🟠 Cần cố gắng (25%)</span>
                                    </span>
                                  )
                                }
                                if (item.progressStatus === "CHUA_DAT") {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-100 text-rose-900 border border-rose-300">
                                      <span>🔴 Chưa đạt (0%)</span>
                                    </span>
                                  )
                                }

                                return (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    <span>⚪ Chưa đánh giá</span>
                                  </span>
                                )
                              })()}
                            </td>

                            {/* Mức hoàn thành mục tiêu (1-5) cho TỪNG mục tiêu */}
                            <td className="p-3 border-r border-slate-200 align-top">
                              <select
                                value={item.goalCompletionLevel !== undefined ? item.goalCompletionLevel : (rubricForm.goalCompletionLevel || 0)}
                                onChange={(e) => {
                                  const val = Number(e.target.value)
                                  const updated = [...singleStudentTrackingRows]
                                  updated[idx].goalCompletionLevel = val
                                  // Auto sync progress status
                                  const iL = updated[idx].initiativeLevel || 0
                                  const pL = updated[idx].participationAttitude || 0
                                  const scs = [val, iL, pL].filter(v => v > 0)
                                  if (scs.length > 0) {
                                    const avg = scs.reduce((a, b) => a + b, 0) / scs.length
                                    updated[idx].progressStatus = avg >= 3.5 ? "DAT" : avg >= 2.5 ? "TIEN_TRIEN" : avg >= 1.5 ? "CAN_CO_GANG" : "CHUA_DAT"
                                  }
                                  setSingleStudentTrackingRows(updated)
                                  if (idx === 0) setRubricForm(prev => ({ ...prev, goalCompletionLevel: val }))
                                }}
                                className={`w-full p-2 rounded-xl border font-black text-xs shadow-xs focus:ring-2 focus:ring-amber-400 ${
                                  item.goalCompletionLevel
                                    ? "bg-amber-50 text-amber-950 border-amber-300"
                                    : "bg-slate-100 text-slate-700 border-slate-300"
                                }`}
                              >
                                <option value={0}>- Chưa đánh giá</option>
                                {[1, 2, 3, 4, 5].map(v => (
                                  <option key={v} value={v}>Mức {v}</option>
                                ))}
                              </select>
                            </td>

                            {/* Mức độ chủ động (1-5) cho TỪNG mục tiêu */}
                            <td className="p-3 border-r border-slate-200 align-top">
                              <select
                                value={item.initiativeLevel !== undefined ? item.initiativeLevel : (rubricForm.initiativeLevel || 0)}
                                onChange={(e) => {
                                  const val = Number(e.target.value)
                                  const updated = [...singleStudentTrackingRows]
                                  updated[idx].initiativeLevel = val
                                  // Auto sync progress status
                                  const gL = updated[idx].goalCompletionLevel || 0
                                  const pL = updated[idx].participationAttitude || 0
                                  const scs = [gL, val, pL].filter(v => v > 0)
                                  if (scs.length > 0) {
                                    const avg = scs.reduce((a, b) => a + b, 0) / scs.length
                                    updated[idx].progressStatus = avg >= 3.5 ? "DAT" : avg >= 2.5 ? "TIEN_TRIEN" : avg >= 1.5 ? "CAN_CO_GANG" : "CHUA_DAT"
                                  }
                                  setSingleStudentTrackingRows(updated)
                                  if (idx === 0) setRubricForm(prev => ({ ...prev, initiativeLevel: val }))
                                }}
                                className={`w-full p-2 rounded-xl border font-black text-xs shadow-xs focus:ring-2 focus:ring-blue-400 ${
                                  item.initiativeLevel
                                    ? "bg-blue-50 text-blue-950 border-blue-300"
                                    : "bg-slate-100 text-slate-700 border-slate-300"
                                }`}
                              >
                                <option value={0}>- Chưa đánh giá</option>
                                {[1, 2, 3, 4, 5].map(v => (
                                  <option key={v} value={v}>Mức {v}</option>
                                ))}
                              </select>
                            </td>

                            {/* Thái độ tham gia (1-5) cho TỪNG mục tiêu */}
                            <td className="p-3 border-r border-slate-200 align-top">
                              <select
                                value={item.participationAttitude !== undefined ? item.participationAttitude : (rubricForm.participationAttitude || 0)}
                                onChange={(e) => {
                                  const val = Number(e.target.value)
                                  const updated = [...singleStudentTrackingRows]
                                  updated[idx].participationAttitude = val
                                  // Auto sync progress status
                                  const gL = updated[idx].goalCompletionLevel || 0
                                  const iL = updated[idx].initiativeLevel || 0
                                  const scs = [gL, iL, val].filter(v => v > 0)
                                  if (scs.length > 0) {
                                    const avg = scs.reduce((a, b) => a + b, 0) / scs.length
                                    updated[idx].progressStatus = avg >= 3.5 ? "DAT" : avg >= 2.5 ? "TIEN_TRIEN" : avg >= 1.5 ? "CAN_CO_GANG" : "CHUA_DAT"
                                  }
                                  setSingleStudentTrackingRows(updated)
                                  if (idx === 0) setRubricForm(prev => ({ ...prev, participationAttitude: val }))
                                }}
                                className={`w-full p-2 rounded-xl border font-black text-xs shadow-xs focus:ring-2 focus:ring-emerald-400 ${
                                  item.participationAttitude
                                    ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                                    : "bg-slate-100 text-slate-700 border-slate-300"
                                }`}
                              >
                                <option value={0}>- Chưa đánh giá</option>
                                {[1, 2, 3, 4, 5].map(v => (
                                  <option key={v} value={v}>Mức {v}</option>
                                ))}
                              </select>
                            </td>

                            {/* Khuyến nghị / Nhận xét chi tiết cho TỪNG nhóm mục tiêu */}
                            <td className="p-3 align-top">
                              <textarea
                                rows={3}
                                value={item.teacherNotes || ""}
                                onChange={(e) => {
                                  const updated = [...singleStudentTrackingRows]
                                  updated[idx].teacherNotes = e.target.value
                                  setSingleStudentTrackingRows(updated)
                                }}
                                placeholder={"Nhập khuyến nghị / ghi chú chi tiết cho " + item.category + "..."}
                                className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-teal-500 focus:ring-1 focus:ring-teal-300"
                              />
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr className="bg-white">
                        <td className="p-3 border-r border-slate-200 font-black text-slate-900">
                          {activeStudent?.studentName || "N/A"}
                        </td>
                        <td className="p-3 border-r border-slate-200 font-bold text-slate-700">
                          {evalTerm === "HK1" ? "Học kỳ I" : "Học kỳ II"}
                        </td>
                        <td className="p-3 border-r border-slate-200 font-semibold text-slate-400 italic">
                          Chưa có dữ liệu mục tiêu
                        </td>
                        <td className="p-3 border-r border-slate-200 font-semibold text-slate-400 italic">
                          -
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <select
                            value={rubricForm.goalCompletionLevel}
                            onChange={(e) => setRubricForm({ ...rubricForm, goalCompletionLevel: Number(e.target.value) })}
                            className="w-full p-2 rounded-xl border border-amber-300 font-black text-xs bg-amber-50 text-amber-950"
                          >
                            {[1, 2, 3, 4, 5].map(v => (
                              <option key={v} value={v}>Mức {v} - {RUBRICS.goalCompletion[v-1].text.slice(0, 28)}...</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <select
                            value={rubricForm.initiativeLevel}
                            onChange={(e) => setRubricForm({ ...rubricForm, initiativeLevel: Number(e.target.value) })}
                            className="w-full p-2 rounded-xl border border-blue-300 font-black text-xs bg-blue-50 text-blue-950"
                          >
                            {[1, 2, 3, 4, 5].map(v => (
                              <option key={v} value={v}>Mức {v} - {RUBRICS.initiative[v-1].text.slice(0, 28)}...</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <select
                            value={rubricForm.participationAttitude}
                            onChange={(e) => setRubricForm({ ...rubricForm, participationAttitude: Number(e.target.value) })}
                            className="w-full p-2 rounded-xl border border-emerald-300 font-black text-xs bg-emerald-50 text-emerald-950"
                          >
                            {[1, 2, 3, 4, 5].map(v => (
                              <option key={v} value={v}>Mức {v} - {RUBRICS.participation[v-1].text.slice(0, 28)}...</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <textarea
                            rows={4}
                            value={rubricForm.recommendations}
                            onChange={(e) => setRubricForm({ ...rubricForm, recommendations: e.target.value })}
                            placeholder="Nhập khuyến nghị chi tiết cho Phụ huynh và GVBM..."
                            className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  💡 Điểm đánh giá sẽ tự động được lưu vào sổ theo dõi và đồng bộ với Sổ quan sát GVCN.
                </span>

                <button
                  onClick={handleSaveRubricEval}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#003B3A] text-white text-xs font-black flex items-center gap-2 hover:bg-[#004D4A] shadow-md transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Đang lưu..." : `Lưu Đánh Giá Kỳ Em ${activeStudent?.studentName || ""}`}</span>
                </button>
              </div>
            </div>

            {/* 4. BẢNG TRA CỨU RUBRIC ĐÁNH GIÁ */}
            <div className="bg-amber-50/70 rounded-3xl p-6 border border-amber-200 space-y-4">
              <div>
                <h3 className="text-sm font-black text-amber-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span>RUBRIC ĐÁNH GIÁ (Thang đo dùng chung cho 3 tiêu chí, điểm 1 - 5)</span>
                </h3>
                <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                  Giáo viên đối chiếu mô tả dưới đây để chọn điểm 1 - 5 cho từng học sinh
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-amber-300 bg-white">
                  <thead>
                    <tr className="bg-amber-100 text-amber-950 font-black border-b border-amber-300">
                      <th className="p-3 border-r border-amber-300 w-1/6">Tiêu chí</th>
                      <th className="p-3 border-r border-amber-300">Mức 1</th>
                      <th className="p-3 border-r border-amber-300">Mức 2</th>
                      <th className="p-3 border-r border-amber-300">Mức 3</th>
                      <th className="p-3 border-r border-amber-300">Mức 4</th>
                      <th className="p-3">Mức 5</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200 font-semibold text-slate-800">
                    <tr>
                      <td className="p-3 font-black text-amber-900 bg-amber-50 border-r border-amber-300">
                        1. Mức hoàn thành mục tiêu
                      </td>
                      {RUBRICS.goalCompletion.map(r => (
                        <td key={r.level} className="p-3 border-r border-amber-200">{r.text}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-black text-amber-900 bg-amber-50 border-r border-amber-300">
                        2. Mức độ chủ động
                      </td>
                      {RUBRICS.initiative.map(r => (
                        <td key={r.level} className="p-3 border-r border-amber-200">{r.text}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-black text-amber-900 bg-amber-50 border-r border-amber-300">
                        3. Thái độ tham gia
                      </td>
                      {RUBRICS.participation.map(r => (
                        <td key={r.level} className="p-3 border-r border-amber-200">{r.text}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ----------------- TAB 4: THEO DÕI HOẠT ĐỘNG TƯ VẤN & NHẬT KÝ THAM VẤN (GVCN) ----------------- */}
      {activeTab === "consultations" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          {/* Header Banner & Title */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-[#003B3A] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span>Theo Dõi Hoạt Động Tư Vấn & Sổ Tham Vấn — Lớp {activeClass?.name || activeClass?.className || "Lớp phụ trách"}</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Giám sát tiến độ tư vấn cá nhân từng học sinh theo mẫu Sổ quan sát của Giáo viên Chủ nhiệm (GVCN).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportClassConsultationsExcel}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 hover:bg-emerald-700 shadow-sm transition-all"
                title="Xuất file Excel tiến độ và sổ tham vấn của lớp"
              >
                <Download className="w-4 h-4" />
                <span>Xuất Excel</span>
              </button>

              <button
                onClick={() => {
                  setEditingConsultationId(null)
                  setConsultationForm({
                    meetingDate: new Date().toISOString().split("T")[0],
                    studentId: selectedStudentId || (students[0]?.id || ""),
                    content: "",
                    difficulties: "",
                    nextActions: "",
                    deadline: "",
                    notes: ""
                  })
                  setShowConsultationModal(true)
                }}
                className="px-4 py-2.5 rounded-xl bg-[#003B3A] text-white text-xs font-black flex items-center gap-2 hover:bg-[#004D4A] shadow-md transition-all"
              >
                <Plus className="w-4 h-4 text-teal-300" />
                <span>+ Thêm Mới Nhật Ký Tham Vấn</span>
              </button>
            </div>
          </div>

          {/* Executive KPI Metrics for Homeroom Teacher */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>SỸ SỐ LỚP PHỤ TRÁCH</span>
              </span>
              <p className="text-2xl font-black text-[#003B3A]">{classConsultationStats.totalStudents} HS</p>
              <p className="text-[11px] text-slate-500 font-medium">Lớp {activeClass?.name || activeClass?.className}</p>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>ĐÃ ĐƯỢC TƯ VẤN</span>
              </span>
              <p className="text-2xl font-black text-emerald-700">
                {classConsultationStats.consultedCount} HS <span className="text-xs font-bold">({classConsultationStats.consultedPercent}%)</span>
              </p>
              <div className="w-full bg-emerald-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(classConsultationStats.consultedPercent, 100)}%` }}
                />
              </div>
            </div>

            <div
              onClick={() => {
                setConsultationTabMode("BY_STUDENT")
                setTeacherStudentFilterStatus("NOT_CONSULTED")
              }}
              className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 space-y-1 cursor-pointer hover:bg-rose-100/70 transition-all group"
              title="Nhấn để xem danh sách học sinh chưa tư vấn"
            >
              <span className="text-[10px] font-black uppercase text-rose-700 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>CHƯA ĐƯỢC TƯ VẤN</span>
              </span>
              <p className="text-2xl font-black text-rose-600 group-hover:scale-105 transition-transform">
                {classConsultationStats.unconsultedCount} HS
              </p>
              <p className="text-[11px] text-rose-700 font-bold underline decoration-rose-300">
                {classConsultationStats.unconsultedCount > 0 ? "👉 Nhấn để lọc & lên lịch gặp" : "✓ Đã hoàn thành 100%"}
              </p>
            </div>

            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-black uppercase text-purple-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>TỔNG LƯỢT TƯ VẤN</span>
              </span>
              <p className="text-2xl font-black text-purple-700">
                {consultations.length} <span className="text-xs font-normal text-purple-600">phiên gặp</span>
              </p>
              <p className="text-[11px] text-purple-700 font-medium">Đã ghi nhận trong năm học</p>
            </div>
          </div>

          {/* View Mode Toggle & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            {/* View Mode Buttons */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setConsultationTabMode("BY_STUDENT")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  consultationTabMode === "BY_STUDENT"
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Theo Dõi Từng Học Sinh</span>
              </button>

              <button
                type="button"
                onClick={() => setConsultationTabMode("ALL_LOGS")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  consultationTabMode === "ALL_LOGS"
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Sổ Nhật Ký Toàn Lớp ({consultations.length})</span>
              </button>
            </div>

            {/* Sub-filters when in BY_STUDENT mode */}
            {consultationTabMode === "BY_STUDENT" && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative min-w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm theo Tên hoặc Mã HS..."
                    value={teacherStudentSearchQuery}
                    onChange={e => setTeacherStudentSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white text-slate-800 text-xs font-bold border border-slate-300 outline-none"
                  />
                </div>

                {/* Filter Buttons */}
                <button
                  type="button"
                  onClick={() => setTeacherStudentFilterStatus("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    teacherStudentFilterStatus === "ALL"
                      ? "bg-[#003B3A] text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Tất cả ({classConsultationStats.totalStudents})
                </button>

                <button
                  type="button"
                  onClick={() => setTeacherStudentFilterStatus("CONSULTED")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    teacherStudentFilterStatus === "CONSULTED"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  Đã tư vấn ({classConsultationStats.consultedCount})
                </button>

                <button
                  type="button"
                  onClick={() => setTeacherStudentFilterStatus("NOT_CONSULTED")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    teacherStudentFilterStatus === "NOT_CONSULTED"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
                  }`}
                >
                  Chưa tư vấn ({classConsultationStats.unconsultedCount})
                </button>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* VIEW 1: THEO DÕI THEO TỪNG HỌC SINH (TIẾN ĐỘ & TIMELINE CÁ NHÂN) */}
          {/* ========================================================================= */}
          {consultationTabMode === "BY_STUDENT" && (
            <div className="space-y-3">
              {(() => {
                const searchLow = teacherStudentSearchQuery.trim().toLowerCase()
                let list = classConsultationStats.studentRows.filter(st => {
                  const matchSearch = !searchLow ||
                    (st.studentName && st.studentName.toLowerCase().includes(searchLow)) ||
                    (st.studentCode && st.studentCode.toLowerCase().includes(searchLow))
                  return matchSearch
                })

                if (teacherStudentFilterStatus === "CONSULTED") {
                  list = list.filter(s => s.isConsulted)
                } else if (teacherStudentFilterStatus === "NOT_CONSULTED") {
                  list = list.filter(s => !s.isConsulted)
                }

                if (list.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                      Không tìm thấy học sinh nào phù hợp với bộ lọc trong lớp {activeClass?.name || activeClass?.className}.
                    </div>
                  )
                }

                return list.map((st, idx) => {
                  const isExpanded = expandedStudentIdForConsultation === st.id
                  return (
                    <div
                      key={st.id || idx}
                      className={`border rounded-2xl p-4 transition-all shadow-2xs hover:shadow-xs space-y-3 ${
                        st.isConsulted
                          ? "bg-white border-slate-200"
                          : "bg-rose-50/30 border-rose-200"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Student Profile Info */}
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                            st.isConsulted
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-rose-100 text-rose-900"
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-sm text-slate-900">{st.studentName}</p>
                              {st.gender && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {st.gender}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">
                              Mã HS: <strong>{st.studentCode}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Status Badge & Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          {st.isConsulted ? (
                            <div className="text-right mr-2">
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Đã tư vấn ({st.sessionCount} buổi)</span>
                              </span>
                              {st.latestMeetingDate && (
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                  Gần nhất: {new Date(st.latestMeetingDate).toLocaleDateString("vi-VN")}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black inline-flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Chưa có buổi tư vấn nào</span>
                            </span>
                          )}

                          {/* Action Button: Quick Add Consultation for this student */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingConsultationId(null)
                              setConsultationForm({
                                meetingDate: new Date().toISOString().split("T")[0],
                                studentId: st.id,
                                content: "",
                                difficulties: "",
                                nextActions: "",
                                deadline: "",
                                notes: ""
                              })
                              setShowConsultationModal(true)
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-black transition-all flex items-center gap-1 shadow-2xs"
                            title="Ghi nhận buổi tư vấn mới cho học sinh này"
                          >
                            <Plus className="w-3.5 h-3.5 text-teal-300" />
                            <span>+ Tư vấn</span>
                          </button>

                          {/* Action Button: Expand / Collapse individual timeline */}
                          {st.isConsulted && (
                            <button
                              type="button"
                              onClick={() => setExpandedStudentIdForConsultation(isExpanded ? null : st.id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <span>{isExpanded ? "Thu gọn" : `Xem nhật ký (${st.sessionCount})`}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Accordion Timeline: Consultation Sessions of this student */}
                      {isExpanded && st.logs && st.logs.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 space-y-2.5 pl-11">
                          <p className="text-[11px] font-black text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-teal-700" />
                            <span>LỊCH SỬ THAM VẤN CÁ NHÂN CỦA HỌC SINH ({st.logs.length} BUỔI):</span>
                          </p>

                          <div className="space-y-2">
                            {st.logs.map((c: any, logIdx: number) => (
                              <div
                                key={c.id || logIdx}
                                className="p-3.5 rounded-xl border border-teal-200/80 bg-teal-50/40 text-xs space-y-2 font-medium"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 pb-1.5">
                                  <div className="flex items-center gap-3">
                                    <span className="font-extrabold text-[#003B3A] flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5 text-teal-700" />
                                      <span>Ngày gặp: {c.meetingDate ? new Date(c.meetingDate).toLocaleDateString("vi-VN") : "—"}</span>
                                    </span>
                                    {c.deadline && (
                                      <span className="text-amber-800 font-bold text-[11px]">
                                        Hạn hoàn thành: {new Date(c.deadline).toLocaleDateString("vi-VN")}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleOpenEditConsultation(c)}
                                      className="p-1 rounded-lg bg-teal-100 text-teal-800 hover:bg-teal-200 transition-colors"
                                      title="Chỉnh sửa buổi tư vấn"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteConsultation(c.id)}
                                      className="p-1 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors"
                                      title="Xóa buổi tư vấn"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-1 text-slate-800">
                                  <p><strong>Nội dung trao đổi:</strong> {c.content}</p>
                                  {c.difficulties && <p className="text-amber-900"><strong>Khó khăn ghi nhận:</strong> {c.difficulties}</p>}
                                  {c.nextActions && <p className="text-teal-900 font-semibold"><strong>Hành động tiếp theo:</strong> {c.nextActions}</p>}
                                  {c.notes && <p className="text-slate-600 italic"><strong>Ghi chú:</strong> {c.notes}</p>}
                                  {c.studentReflection && (
                                    <div className="p-2 rounded-lg bg-emerald-100/90 border border-emerald-300 text-emerald-950 font-bold text-[11px] mt-1.5 shadow-2xs">
                                      💬 <strong>Học sinh tự đánh giá:</strong> "{c.studentReflection}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: SỔ NHẬT KÝ TOÀN LỚP (100% KHỚP MẪU EXCEL SỔ QUAN SÁT HIỆN HÀNH) */}
          {/* ========================================================================= */}
          {consultationTabMode === "ALL_LOGS" && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                    <th className="p-3 border-r border-slate-200 w-12 text-center">STT</th>
                    <th className="p-3 border-r border-slate-200 w-28">Ngày gặp</th>
                    <th className="p-3 border-r border-slate-200 w-1/5">Học sinh</th>
                    <th className="p-3 border-r border-slate-200">Nội dung trao đổi</th>
                    <th className="p-3 border-r border-slate-200">Khó khăn ghi nhận</th>
                    <th className="p-3 border-r border-slate-200">Hành động tiếp theo</th>
                    <th className="p-3 border-r border-slate-200 w-28">Thời hạn</th>
                    <th className="p-3 border-r border-slate-200 w-28">Ghi chú</th>
                    <th className="p-3 border-r border-slate-200 min-w-[160px] bg-amber-50/70 text-amber-950">Tự đánh giá của Học sinh</th>
                    <th className="p-3 text-center w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                  {consultations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                        Chưa có nhật ký tham vấn nào trong lớp {activeClass?.name || activeClass?.className}. Vui lòng bấm "+ Thêm Mới Nhật Ký Tham Vấn" để tạo mới.
                      </td>
                    </tr>
                  ) : (
                    consultations.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-3 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                          {c.meetingDate ? new Date(c.meetingDate).toLocaleDateString("vi-VN") : "—"}
                        </td>
                        <td className="p-3 border-r border-slate-200 font-black text-slate-900 bg-slate-50/50">
                          {c.student?.studentName || "N/A"}
                          {c.student?.studentCode && <span className="block text-[10px] text-slate-500 font-medium">({c.student?.studentCode})</span>}
                        </td>
                        <td className="p-3 border-r border-slate-200 text-slate-800 font-medium leading-relaxed">{c.content}</td>
                        <td className="p-3 border-r border-slate-200 text-amber-900 font-medium">{c.difficulties || "—"}</td>
                        <td className="p-3 border-r border-slate-200 text-teal-900 font-semibold">{c.nextActions || "—"}</td>
                        <td className="p-3 border-r border-slate-200 font-bold text-slate-700 whitespace-nowrap">
                          {c.deadline ? new Date(c.deadline).toLocaleDateString("vi-VN") : "—"}
                        </td>
                        <td className="p-3 border-r border-slate-200 text-slate-600 font-normal">{c.notes || "—"}</td>
                        <td className="p-3 border-r border-slate-200 align-top bg-amber-50/20">
                          {c.studentReflection ? (
                            <div className="p-2 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-950 text-[11px] font-bold leading-relaxed shadow-2xs">
                              💬 "{c.studentReflection}"
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold italic">🟡 HS chưa tự đánh giá</span>
                          )}
                        </td>
                        <td className="p-3 text-center space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditConsultation(c)}
                            className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteConsultation(c.id)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 4: YÊU CẦU HỖ TRỢ KHẨN CẤP TỪ HỌC SINH (SOS) ----------------- */}
      {activeTab === "sos" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-rose-600 flex items-center gap-2">
                <Heart className="w-5 h-5 fill-rose-500" />
                <span>Yêu Cầu Hỗ Trợ Khẩn Cấp (SOS) — Lớp {selectedClass?.className}</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Danh sách chi tiết điều em học sinh muốn Thầy/Cô hỗ trợ (Phân loại nội dung & Mức độ khẩn cấp)
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-slate-600">Tổng số yêu cầu:</span>
              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-black">
                {helpRequests.length} yêu cầu
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                  <th className="p-3.5 border-r border-slate-200 w-36">1. Mốc thời gian</th>
                  <th className="p-3.5 border-r border-slate-200 w-44">2. Phân loại cần giúp đỡ</th>
                  <th className="p-3.5 border-r border-slate-200 w-36">3. Mức độ khẩn cấp</th>
                  <th className="p-3.5 border-r border-slate-200 min-w-[240px]">4. Chi tiết điều em muốn Thầy/Cô hỗ trợ</th>
                  <th className="p-3.5 border-r border-slate-200 w-44">5. Phản hồi & Xử lý của GVCN</th>
                  <th className="p-3.5 min-w-[220px]">6. Lời nhắn / Phản hồi từ GVCN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                {helpRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      Chưa có yêu cầu hỗ trợ khẩn cấp (SOS) nào từ học sinh {activeStudent ? activeStudent.studentName : ("lớp " + selectedClass?.className)}.
                    </td>
                  </tr>
                ) : (
                  helpRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Mốc thời gian */}
                      <td className="p-3.5 border-r border-slate-200 align-top font-bold text-slate-700 whitespace-nowrap bg-slate-50/40">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-900 font-black">
                            <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{new Date(req.createdAt).toLocaleString("vi-VN")}</span>
                          </div>
                          {req.student?.studentName && (
                            <span className="inline-block text-[10px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md font-black border border-teal-200">
                              HS: {req.student.studentName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Phân loại nội dung cần giúp đỡ */}
                      <td className="p-3.5 border-r border-slate-200 align-top">
                        <span className={
                          req.category === "HOC_TAP"
                            ? "px-2.5 py-1 rounded-xl text-xs font-black block text-center uppercase shadow-2xs bg-blue-100 text-blue-900 border border-blue-200"
                            : req.category === "TAM_LY_BAN_BE"
                            ? "px-2.5 py-1 rounded-xl text-xs font-black block text-center uppercase shadow-2xs bg-pink-100 text-pink-900 border border-pink-200"
                            : req.category === "SUC_KHOE"
                            ? "px-2.5 py-1 rounded-xl text-xs font-black block text-center uppercase shadow-2xs bg-emerald-100 text-emerald-900 border border-emerald-200"
                            : "px-2.5 py-1 rounded-xl text-xs font-black block text-center uppercase shadow-2xs bg-purple-100 text-purple-900 border border-purple-200"
                        }>
                          {req.category === "HOC_TAP"
                            ? "📚 Học tập & Bài vở"
                            : req.category === "TAM_LY_BAN_BE"
                            ? "💬 Tâm lý & Bạn bè"
                            : req.category === "SUC_KHOE"
                            ? "🏥 Sức khỏe & Sinh hoạt"
                            : "❓ Khác"}
                        </span>
                      </td>

                      {/* 3. Mức độ khẩn cấp */}
                      <td className="p-3.5 border-r border-slate-200 align-top">
                        <span className={
                          req.urgency === "HIGH" || req.urgency === "URGENT"
                            ? "px-3 py-1 rounded-full text-xs font-black block text-center uppercase shadow-2xs bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                            : "px-3 py-1 rounded-full text-xs font-black block text-center uppercase shadow-2xs bg-emerald-100 text-emerald-800 border border-emerald-300"
                        }>
                          {req.urgency === "HIGH" || req.urgency === "URGENT" ? "🔴 Cần hỗ trợ ngay" : "🟢 Cần hỗ trợ sớm"}
                        </span>
                      </td>

                      {/* 4. Viết chi tiết điều em muốn thầy cô hỗ trợ */}
                      <td className="p-3.5 border-r border-slate-200 align-top space-y-2">
                        <div className="p-3 rounded-2xl bg-rose-50/50 border border-rose-100 text-slate-900 text-xs font-bold leading-relaxed">
                          "{req.content}"
                        </div>
                      </td>

                      {/* 5. Phản hồi & Xử lý của GVCN */}
                      <td className="p-3.5 border-r border-slate-200 align-top">
                        <select
                          value={req.status || "PENDING"}
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            await fetch("/api/advisory/help-requests", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: req.id, status: newStatus })
                            })
                            fetch("/api/advisory/help-requests?classId=" + selectedClassId)
                              .then(r => r.json())
                              .then(d => { if (Array.isArray(d)) setHelpRequests(d) })
                          }}
                          className={
                            req.status === "RESOLVED"
                              ? "w-full p-2.5 rounded-xl text-xs font-black border focus:outline-none cursor-pointer bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs"
                              : req.status === "PROCESSING"
                              ? "w-full p-2.5 rounded-xl text-xs font-black border focus:outline-none cursor-pointer bg-amber-100 text-amber-900 border-amber-300 shadow-2xs"
                              : "w-full p-2.5 rounded-xl text-xs font-black border focus:outline-none cursor-pointer bg-slate-100 text-slate-800 border-slate-300 shadow-2xs"
                          }
                        >
                          <option value="PENDING">🟡 Chờ phản hồi</option>
                          <option value="PROCESSING">🔵 Đang hỗ trợ</option>
                          <option value="RESOLVED">🟢 Đã xử lý xong</option>
                        </select>
                      </td>

                      {/* 6. Lời nhắn / Phản hồi từ GVCN */}
                      <td className="p-3.5 align-top space-y-2">
                        <textarea
                          rows={3}
                          value={sosNotes[req.id] !== undefined ? sosNotes[req.id] : (req.responseNotes || "")}
                          onChange={(e) => setSosNotes({ ...sosNotes, [req.id]: e.target.value })}
                          placeholder="Nhập lời nhắn hỗ trợ học sinh..."
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-300 shadow-inner"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            disabled={savingSosId === req.id}
                            onClick={async () => {
                              try {
                                setSavingSosId(req.id)
                                const currentNote = sosNotes[req.id] !== undefined ? sosNotes[req.id] : (req.responseNotes || "")
                                const res = await fetch("/api/advisory/help-requests", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    id: req.id,
                                    responseNotes: currentNote,
                                    status: req.status || "PROCESSING"
                                  })
                                })
                                if (res.ok) {
                                  setToastMessage("Đã lưu phản hồi SOS cho học sinh " + (req.student?.studentName || "") + " thành công!")
                                  setTimeout(() => setToastMessage(""), 4000)
                                  const ref = await fetch("/api/advisory/help-requests?classId=" + selectedClassId)
                                  if (ref.ok) {
                                    const d = await ref.json()
                                    if (Array.isArray(d)) setHelpRequests(d)
                                  }
                                } else {
                                  alert("Lỗi khi lưu phản hồi SOS.")
                                }
                              } catch (e: any) {
                                alert("Lỗi kết nối: " + e.message)
                              } finally {
                                setSavingSosId(null)
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{savingSosId === req.id ? "Đang lưu..." : "Lưu Phản Hồi"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleForceUnlock(req.studentId)}
                            className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-black border border-amber-300 flex items-center gap-1 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            title="Mở khóa phiếu mục tiêu năm học cho học sinh này"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-700" />
                            <span>Mở Khóa Phiếu Cho HS</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- TAB 5: MỞ KHÓA MỤC TIÊU & SPRINT 7 NGÀY (GIAI ĐOẠN 2 - K9-12) ----------------- */}
      {activeTab === "unlocks" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-[#003B3A] flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                <span>Theo Dõi Mở Khóa Mục Tiêu & Sprint 7 Ngày (K9–12) — Lớp {selectedClass?.className}</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Quản lý các mục tiêu đang được học sinh mở khóa, tiến độ hành động 7 ngày và hỗ trợ kịp thời cho học sinh.
              </p>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setUnlockFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  unlockFilter === "ALL"
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tất cả ({unlocksList.length})
              </button>
              <button
                type="button"
                onClick={() => setUnlockFilter("IN_PROGRESS")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  unlockFilter === "IN_PROGRESS"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100"
                }`}
              >
                Đang Sprint ({unlocksList.filter(u => u.status === "IN_PROGRESS").length})
              </button>
              <button
                type="button"
                onClick={() => setUnlockFilter("NEED_SUPPORT")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  unlockFilter === "NEED_SUPPORT"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                }`}
              >
                Cần hỗ trợ ({unlocksList.filter(u => u.needSupport).length})
              </button>
              <button
                type="button"
                onClick={() => setUnlockFilter("NOT_UNLOCKED")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  unlockFilter === "NOT_UNLOCKED"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                Chưa mở khóa ({unlocksList.filter(u => !u.hasUnlocked && u.hasGoalSheet).length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                  <th className="p-3 border-r border-slate-200 w-12 text-center">STT</th>
                  <th className="p-3 border-r border-slate-200 w-44">Học sinh</th>
                  <th className="p-3 border-r border-slate-200 w-32">Trạng thái</th>
                  <th className="p-3 border-r border-slate-200 min-w-[200px]">Mục tiêu đang mở khóa</th>
                  <th className="p-3 border-r border-slate-200 min-w-[220px]">Hành động 7 ngày & Chìa khóa</th>
                  <th className="p-3 border-r border-slate-200 w-36">Tiến độ Sprint</th>
                  <th className="p-3 border-r border-slate-200 min-w-[180px]">Đồng hành & Ghi chú GV</th>
                  <th className="p-3 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                {unlocksLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      Đang tải dữ liệu mở khóa mục tiêu...
                    </td>
                  </tr>
                ) : unlocksList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      Chưa có dữ liệu học sinh trong lớp {selectedClass?.className}.
                    </td>
                  </tr>
                ) : (
                  unlocksList
                    .filter(u => {
                      if (unlockFilter === "IN_PROGRESS") return u.status === "IN_PROGRESS"
                      if (unlockFilter === "NEED_SUPPORT") return u.needSupport
                      if (unlockFilter === "NOT_UNLOCKED") return !u.hasUnlocked && u.hasGoalSheet
                      if (unlockFilter === "UNLOCKED") return u.hasUnlocked
                      return true
                    })
                    .map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-3 border-r border-slate-200 font-black text-slate-900 bg-slate-50/50">
                          <div>{item.studentName}</div>
                          <span className="text-[10px] text-slate-500 font-medium">({item.studentCode})</span>
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          {item.status === "IN_PROGRESS" ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-200 inline-block">
                              Đang chạy Sprint
                            </span>
                          ) : item.status === "COMPLETED" ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">
                              Hoàn thành
                            </span>
                          ) : item.hasUnlocked ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200 inline-block">
                              Đã mở khóa
                            </span>
                          ) : item.hasGoalSheet ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 inline-block">
                              Chưa mở khóa ({item.goalCount} MT)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200 inline-block">
                              Chưa lập mục tiêu
                            </span>
                          )}
                          {item.needSupport && (
                            <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 block text-center animate-pulse">
                              Cần GV hỗ trợ
                            </span>
                          )}
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          {item.targetText ? (
                            <div>
                              <span className="font-bold text-slate-900 text-xs block mb-1">
                                {item.targetText}
                              </span>
                              {item.currentState && (
                                <span className="text-[11px] text-slate-500 block italic">
                                  Hiện tại: {item.currentState}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          {item.sevenDayAction ? (
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900 text-xs leading-relaxed">
                                {item.sevenDayAction}
                              </p>
                              {item.selectedKey && (
                                <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-extrabold">
                                  🔑 {item.selectedKey}
                                </span>
                              )}
                              {item.actionTiming && (
                                <span className="text-[10px] text-slate-500 block">
                                  ⏰ {item.actionTiming}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          {item.progressInfo ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                <span>Ngày {item.progressInfo.dayNumber}/7</span>
                                <span className="text-teal-700 font-extrabold">{item.progressInfo.percent}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-teal-600 h-2 rounded-full transition-all"
                                  style={{ width: `${item.progressInfo.percent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="p-3 border-r border-slate-200 text-xs">
                          {item.companion && (
                            <span className="text-[11px] font-bold text-teal-800 block mb-1">
                              🤝 {item.companion}
                            </span>
                          )}
                          {item.teacherSupportNotes ? (
                            <div className="p-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-950 text-[10px] font-semibold">
                              GV: "{item.teacherSupportNotes}"
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Chưa có ghi chú</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {item.hasUnlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUnlockForModal(item)
                                setTeacherNoteInput(item.teacherSupportNotes || "")
                                setSupportStatusInput(item.supportStatus || "IN_PROGRESS")
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 text-teal-700 hover:text-teal-900 text-xs font-bold transition-all border border-slate-200 inline-flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Ghi chú</span>
                            </button>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- MODAL GHI CHÚ ĐỒNG HÀNH MỞ KHÓA MỤC TIÊU ----------------- */}
      {selectedUnlockForModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedUnlockForModal(null); }}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-3.5 sm:py-4 bg-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700 shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-[#003B3A] truncate">
                    Đồng Hành & Hỗ Trợ Mục Tiêu
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    Học sinh: {selectedUnlockForModal.studentName} ({selectedUnlockForModal.studentCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUnlockForModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0 cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body - Scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 sm:space-y-4 text-xs font-semibold text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-bold block mb-0.5">Mục tiêu mở khóa:</span>
                <p className="text-xs font-black text-slate-900 break-words">{selectedUnlockForModal.targetText}</p>
                {selectedUnlockForModal.sevenDayAction && (
                  <p className="text-[11px] text-teal-800 font-bold mt-1.5 break-words">
                    🚀 Việc thử 7 ngày: {selectedUnlockForModal.sevenDayAction}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-800">Trạng thái hỗ trợ của GV:</label>
                <select
                  value={supportStatusInput}
                  onChange={(e) => setSupportStatusInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-xs bg-slate-50 focus:bg-white focus:border-teal-500 outline-none transition-colors"
                >
                  <option value="NEED_ACTION">🟡 Cần hành động / Cần trao đổi</option>
                  <option value="IN_PROGRESS">🔵 Đang hỗ trợ & nhắc nhở</option>
                  <option value="COMPLETED">🟢 Đã giải tỏa khó khăn / Hoàn thành</option>
                  <option value="NOT_NEEDED">⚪ Không cần hỗ trợ thêm</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-800">Ghi chú hỗ trợ của Thầy/Cô:</label>
                <textarea
                  rows={3}
                  value={teacherNoteInput}
                  onChange={(e) => setTeacherNoteInput(e.target.value)}
                  placeholder="Nhập lời khuyên, kế hoạch nhắc nhở hoặc hướng dẫn cho học sinh..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:border-teal-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/80 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedUnlockForModal(null)}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={savingUnlockNote}
                onClick={handleSaveTeacherUnlockNote}
                className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-[#003B3A] text-white text-xs font-black flex items-center gap-2 hover:bg-[#004D4A] shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingUnlockNote ? "Đang lưu..." : "Lưu Ghi Chú Hỗ Trợ"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 6: YÊU CẦU MỞ PHIẾU ĐIỀU CHỈNH TỪ HỌC SINH ----------------- */}
      {activeTab === "requests" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          {/* Header & Quick Stats */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <h3 className="text-base font-black text-[#003B3A] flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                <span>Yêu Cầu Mở Khóa Phiếu Mục Tiêu — Lớp {selectedClass?.className || ""}</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Xét duyệt và phê duyệt mở lại phiếu cho học sinh khi các em có nguyện vọng điều chỉnh hoặc bổ sung mục tiêu cá nhân.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadClassAdjustmentRequests()}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Làm mới danh sách</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Stat 1: Chờ phê duyệt */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase text-amber-800 tracking-wider block">Chờ phê duyệt</span>
                <span className="text-2xl font-black text-amber-900">{pendingAdjustmentCount}</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Stat 2: Đang mở cho HS */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider block">Đang mở khóa hiệu chỉnh</span>
                <span className="text-2xl font-black text-emerald-900">
                  {adjustmentRequests.filter((r: any) => r.status === "APPROVED").length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Key className="w-5 h-5" />
              </div>
            </div>

            {/* Stat 3: Đã hoàn tất nộp lại */}
            <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase text-teal-800 tracking-wider block">Đã nộp lại phiếu</span>
                <span className="text-2xl font-black text-teal-900">
                  {adjustmentRequests.filter((r: any) => r.status === "COMPLETED").length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* GVCN Quick Force-Unlock Section */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-teal-50/40 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#003B3A] text-white flex items-center justify-center shrink-0">
                <Key className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 block">Chủ động mở khóa phiếu cho học sinh:</span>
                <span className="text-[11px] text-slate-500 font-medium">Nếu học sinh trao đổi trực tiếp, Thầy/Cô có thể chọn học sinh và mở khóa ngay mà không cần học sinh gửi yêu cầu trước.</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={forceUnlockStudentId}
                onChange={(e) => setForceUnlockStudentId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold outline-none max-w-56"
              >
                <option value="">-- Chọn học sinh để mở khóa --</option>
                {students.map((st: any) => (
                  <option key={st.id} value={st.id}>
                    {st.studentName} ({st.studentCode})
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!forceUnlockStudentId}
                onClick={async () => {
                  if (!forceUnlockStudentId) return
                  await handleForceUnlock(forceUnlockStudentId)
                  setForceUnlockStudentId("")
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer ${
                  forceUnlockStudentId
                    ? "bg-[#003B3A] hover:bg-[#004D4A] text-white"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Key className="w-3.5 h-3.5 text-amber-300" />
                <span>Mở Khóa Ngay</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setRequestStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  requestStatusFilter === "ALL"
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tất cả ({adjustmentRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setRequestStatusFilter("PENDING")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  requestStatusFilter === "PENDING"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                Chờ duyệt ({pendingAdjustmentCount})
              </button>
              <button
                type="button"
                onClick={() => setRequestStatusFilter("APPROVED")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  requestStatusFilter === "APPROVED"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                Đang mở khóa ({adjustmentRequests.filter((r: any) => r.status === "APPROVED").length})
              </button>
              <button
                type="button"
                onClick={() => setRequestStatusFilter("COMPLETED")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  requestStatusFilter === "COMPLETED"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-teal-50 text-teal-800 hover:bg-teal-100"
                }`}
              >
                Đã nộp lại ({adjustmentRequests.filter((r: any) => r.status === "COMPLETED").length})
              </button>
              <button
                type="button"
                onClick={() => setRequestStatusFilter("REJECTED")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  requestStatusFilter === "REJECTED"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                }`}
              >
                Đã từ chối ({adjustmentRequests.filter((r: any) => r.status === "REJECTED").length})
              </button>
            </div>
          </div>

          {/* Table of Requests */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                  <th className="p-3.5 border-r border-slate-200 w-12 text-center">STT</th>
                  <th className="p-3.5 border-r border-slate-200 w-52">Học Sinh</th>
                  <th className="p-3.5 border-r border-slate-200 w-36">Thời Gian Gửi</th>
                  <th className="p-3.5 border-r border-slate-200 min-w-[260px]">Lý Do Học Sinh Gửi Yêu Cầu</th>
                  <th className="p-3.5 border-r border-slate-200 w-44 text-center">Trạng Thái</th>
                  <th className="p-3.5 border-r border-slate-200 min-w-[220px]">Phản Hồi Của GVCN</th>
                  <th className="p-3.5 text-center min-w-[170px]">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                {(() => {
                  const filtered = adjustmentRequests.filter((r: any) => {
                    if (requestStatusFilter === "ALL") return true
                    return r.status === requestStatusFilter
                  })

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-slate-400 font-bold">
                          Không có yêu cầu mở khóa phiếu mục tiêu nào phù hợp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    )
                  }

                  return filtered.map((req: any, idx: number) => {
                    const isPending = req.status === "PENDING"
                    const isApproved = req.status === "APPROVED"
                    const isRejected = req.status === "REJECTED"
                    const isCompleted = req.status === "COMPLETED"

                    return (
                      <tr key={req.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        {/* STT */}
                        <td className="p-3.5 border-r border-slate-200 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>

                        {/* Học sinh */}
                        <td className="p-3.5 border-r border-slate-200 align-top">
                          <p className="font-black text-sm text-slate-900">{req.studentName}</p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Mã HS: <strong>{req.studentCode}</strong>
                          </p>
                          {req.className && (
                            <span className="inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              Lớp: {req.className}
                            </span>
                          )}
                        </td>

                        {/* Thời gian */}
                        <td className="p-3.5 border-r border-slate-200 align-top text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{new Date(req.createdAt).toLocaleDateString("vi-VN")}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(req.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>

                        {/* Lý do */}
                        <td className="p-3.5 border-r border-slate-200 align-top">
                          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-slate-900 font-bold italic leading-relaxed">
                            "{req.reason}"
                          </div>
                        </td>

                        {/* Trạng thái */}
                        <td className="p-3.5 border-r border-slate-200 align-top text-center">
                          {isPending && (
                            <span className="px-3 py-1 rounded-full text-xs font-black block text-center uppercase shadow-2xs bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              🟡 Chờ GVCN Duyệt
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-3 py-1 rounded-full text-xs font-black block text-center uppercase shadow-2xs bg-emerald-100 text-emerald-900 border border-emerald-300">
                              🟢 Đang Mở Khóa
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-3 py-1 rounded-full text-xs font-black block text-center uppercase shadow-2xs bg-rose-100 text-rose-900 border border-rose-300">
                              🔴 Đã Từ Chối
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-3 py-1 rounded-full text-xs font-black block text-center uppercase shadow-2xs bg-teal-100 text-teal-900 border border-teal-300">
                              🔵 Đã Nộp Lại
                            </span>
                          )}
                        </td>

                        {/* Phản hồi của GVCN */}
                        <td className="p-3.5 border-r border-slate-200 align-top text-xs">
                          {req.teacherResponse ? (
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900 leading-snug">
                                {req.teacherResponse}
                              </p>
                              <div className="text-[10px] text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-100">
                                <span>Duyệt bởi: <strong>{req.reviewedBy || "GVCN"}</strong></span>
                                {req.reviewedAt && (
                                  <span>• {new Date(req.reviewedAt).toLocaleDateString("vi-VN")}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chưa có phản hồi</span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="p-3.5 align-top text-center">
                          <div className="flex flex-col items-center gap-2">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRequestForReview(req)
                                    setReviewActionType("APPROVED")
                                    setTeacherResponseNote("Thầy/Cô đồng ý mở lại phiếu mục tiêu. Em hãy cập nhật và nộp lại nhé.")
                                    setShowReviewModal(true)
                                  }}
                                  className="w-full px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Phê Duyệt Mở Phiếu</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRequestForReview(req)
                                    setReviewActionType("REJECTED")
                                    setTeacherResponseNote("")
                                    setShowReviewModal(true)
                                  }}
                                  className="w-full px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Từ Chối</span>
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <button
                                type="button"
                                onClick={() => handleLockGoal(req.studentId)}
                                className="w-full px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Khóa Lại Phiếu</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudentId(req.studentId)
                                setActiveTab("tracking")
                              }}
                              className="w-full px-2.5 py-1 text-[11px] font-bold text-teal-800 hover:bg-teal-50 rounded-lg transition-all"
                            >
                              Xem mục tiêu HS →
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- MODAL THÊM MỚI / CHỈNH SỬA NHẬT KÝ THAM VẤN ----------------- */}
      {showConsultationModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConsultationModal(false); }}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-3.5 sm:py-4 bg-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-[#003B3A] truncate">
                    {editingConsultationId ? "Chỉnh Sửa Nhật Ký Tham Vấn" : "Thêm Mới Nhật Ký Tham Vấn Cố Vấn Học Tập"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium truncate">Theo mẫu Excel Sổ quan sát GVCN</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConsultationModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0 cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body - Scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs font-semibold text-slate-700">
                
                {/* Ngày gặp */}
                <div>
                  <label className="block mb-1 font-bold text-slate-800">📅 Ngày gặp (*):</label>
                  <input
                    type="date"
                    value={consultationForm.meetingDate}
                    onChange={(e) => setConsultationForm({ ...consultationForm, meetingDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-xs bg-slate-50 focus:bg-white focus:border-teal-500 outline-none transition-colors"
                  />
                </div>

                {/* Học sinh */}
                <div>
                  <label className="block mb-1 font-bold text-slate-800">👤 Học sinh (*):</label>
                  <select
                    value={consultationForm.studentId}
                    onChange={(e) => setConsultationForm({ ...consultationForm, studentId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-xs bg-slate-50 focus:bg-white focus:border-teal-500 outline-none transition-colors"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.studentName} ({s.studentCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* KHỐI XEM VÀ THAM CHIẾU MỤC TIÊU NĂM HỌC THEO KHỐI */}
                <div className="sm:col-span-2 bg-gradient-to-r from-teal-50/90 to-sky-50/70 border-2 border-teal-200/90 rounded-2xl p-3 sm:p-4 space-y-2.5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-teal-600 text-white font-black text-xs">🎯</span>
                      <div>
                        <h4 className="text-xs font-black text-teal-950 uppercase tracking-tight">
                          Mục tiêu học tập & rèn luyện của học sinh (Theo khối):
                        </h4>
                        <p className="text-[10px] text-teal-700 font-medium">
                          Bám sát mục tiêu cá nhân đã đăng ký để cố vấn chính xác cho học sinh
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-teal-800 bg-white px-2.5 py-1 rounded-full border border-teal-300 shadow-2xs shrink-0">
                      {consultationStudentGoals.length} mục tiêu đã đăng ký
                    </span>
                  </div>

                  {loadingStudentGoals ? (
                    <div className="text-xs text-teal-800 font-bold py-3 text-center animate-pulse">
                      Đang nạp mục tiêu của học sinh...
                    </div>
                  ) : consultationStudentGoals.length === 0 ? (
                    <div className="p-2.5 rounded-xl bg-white/70 border border-teal-100 text-center text-xs text-slate-500 italic">
                      Học sinh này chưa điền hoặc chưa nộp phiếu mục tiêu năm học.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-36 sm:max-h-48 overflow-y-auto pr-1">
                      {consultationStudentGoals.map((g: any, gIdx: number) => (
                        <div key={g.id || gIdx} className="bg-white p-2.5 rounded-xl border border-teal-200/70 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs hover:border-teal-300 transition-all">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 font-black text-slate-900 text-xs">
                              <span className="px-2 py-0.5 text-[10px] bg-teal-100 text-teal-900 rounded-md font-extrabold shrink-0 border border-teal-300">
                                {g.category}
                              </span>
                              <span className="leading-snug break-words">{g.targetText}</span>
                            </div>
                            {g.actions && g.actions[0]?.actionText && (
                              <span className="text-[11px] text-slate-600 block pl-1 italic break-words">
                                ⚡ Kế hoạch/Hành động: {g.actions[0].actionText}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-start sm:self-center">
                            <button
                              type="button"
                              onClick={() => {
                                const prefix = consultationForm.content ? consultationForm.content + " • " : ""
                                setConsultationForm(prev => ({
                                  ...prev,
                                  content: prefix + ("Trao đổi về mục tiêu: " + g.targetText)
                                }))
                              }}
                              className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-2xs cursor-pointer active:scale-95"
                              title="Gán mục tiêu này vào nội dung trao đổi"
                            >
                              + Gán trao đổi
                            </button>
                            {g.actions && g.actions[0]?.actionText && (
                              <button
                                type="button"
                                onClick={() => {
                                  const prefix = consultationForm.nextActions ? consultationForm.nextActions + " • " : ""
                                  setConsultationForm(prev => ({
                                    ...prev,
                                    nextActions: prefix + ("Theo dõi hành động: " + g.actions[0].actionText)
                                  }))
                                }}
                                className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="Gán hành động này vào kế hoạch tiếp theo"
                              >
                                + Gán hành động
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nội dung trao đổi */}
                <div className="sm:col-span-2">
                  <label className="block mb-1 font-bold text-slate-800">💬 Nội dung trao đổi (*):</label>
                  <textarea
                    rows={2}
                    value={consultationForm.content}
                    onChange={(e) => setConsultationForm({ ...consultationForm, content: e.target.value })}
                    placeholder="Ví dụ: Trao đổi về mục tiêu tuần, tình hình học môn Toán..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:border-teal-500 outline-none transition-colors"
                  />
                </div>

                {/* Khó khăn ghi nhận */}
                <div className="sm:col-span-2">
                  <label className="block mb-1 font-bold text-slate-800">⚠️ Khó khăn ghi nhận:</label>
                  <textarea
                    rows={2}
                    value={consultationForm.difficulties}
                    onChange={(e) => setConsultationForm({ ...consultationForm, difficulties: e.target.value })}
                    placeholder="Ví dụ: Chưa sắp xếp được thời gian tự học buổi tối..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:border-teal-500 outline-none transition-colors"
                  />
                </div>

                {/* Hành động tiếp theo */}
                <div className="sm:col-span-2">
                  <label className="block mb-1 font-bold text-slate-800">🚀 Hành động tiếp theo:</label>
                  <textarea
                    rows={2}
                    value={consultationForm.nextActions}
                    onChange={(e) => setConsultationForm({ ...consultationForm, nextActions: e.target.value })}
                    placeholder="Ví dụ: Cùng lập thời gian biểu buổi tối, kiểm tra lại sau 1 tuần..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:border-teal-500 outline-none transition-colors"
                  />
                </div>

                {/* Thời hạn */}
                <div>
                  <label className="block mb-1 font-bold text-slate-800">⏰ Thời hạn:</label>
                  <input
                    type="date"
                    value={consultationForm.deadline}
                    onChange={(e) => setConsultationForm({ ...consultationForm, deadline: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-xs bg-slate-50 focus:bg-white focus:border-teal-500 outline-none transition-colors"
                  />
                </div>

                {/* Ghi chú */}
                <div>
                  <label className="block mb-1 font-bold text-slate-800">📝 Ghi chú:</label>
                  <input
                    type="text"
                    value={consultationForm.notes}
                    onChange={(e) => setConsultationForm({ ...consultationForm, notes: e.target.value })}
                    placeholder="Nhập ghi chú bổ sung..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:border-teal-500 outline-none transition-colors"
                  />
                </div>

              </div>
            </div>

            {/* Buttons - Fixed */}
            <div className="flex items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/80 shrink-0">
              <button
                type="button"
                onClick={() => setShowConsultationModal(false)}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveConsultation}
                disabled={saving}
                className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-[#003B3A] text-white text-xs font-black flex items-center gap-2 hover:bg-[#004D4A] shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Đang lưu..." : "Lưu Nhật Ký Tham Vấn"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: XÉT DUYỆT YÊU CẦU MỞ PHIẾU ĐIỀU CHỈNH CỦA HỌC SINH */}
      {/* ========================================================================= */}
      {showReviewModal && selectedRequestForReview && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowReviewModal(false); }}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border-2 border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-3.5 sm:py-4 bg-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                  reviewActionType === "APPROVED" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                }`}>
                  {reviewActionType === "APPROVED" ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm sm:text-base text-slate-900 uppercase truncate">
                    {reviewActionType === "APPROVED" ? "Phê Duyệt Mở Lại Phiếu" : "Từ Chối Mở Lại Phiếu"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    Học sinh: <strong>{selectedRequestForReview.studentName}</strong> ({selectedRequestForReview.studentCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm transition-all shrink-0 cursor-pointer"
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Body - Scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                <span className="font-black text-slate-600 uppercase text-[10px] block">Lý do học sinh gửi xin mở lại:</span>
                <p className="font-bold text-slate-800 italic pl-2 break-words">
                  "{selectedRequestForReview.reason}"
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 block">
                  {reviewActionType === "APPROVED" 
                    ? "Lời nhắn / dặn dò học sinh (tùy chọn):" 
                    : "Lý do từ chối (học sinh sẽ nhận được nội dung này) *:"}
                </label>
                <textarea
                  rows={3}
                  value={teacherResponseNote}
                  onChange={(e) => setTeacherResponseNote(e.target.value)}
                  placeholder={reviewActionType === "APPROVED" 
                    ? "Ví dụ: Đã mở lại phiếu, em nhớ cập nhật mục tiêu bổ sung trước thứ Sáu nhé..." 
                    : "Ví dụ: Phiếu mục tiêu hiện tại đã phù hợp, Thầy/Cô sẽ trao đổi thêm với em trong buổi tư vấn tuần này..."}
                  className="w-full p-3 sm:p-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-xs font-medium"
                />
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/80 shrink-0">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                disabled={savingReview}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleReviewAdjustment(reviewActionType)}
                disabled={savingReview}
                className={`px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                  reviewActionType === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {reviewActionType === "APPROVED" ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                <span>{savingReview ? "Đang xử lý..." : reviewActionType === "APPROVED" ? "Xác Nhận Mở Phiếu" : "Xác Nhận Từ Chối"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
