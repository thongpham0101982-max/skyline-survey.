"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import {
  Compass, Plus, Search, Calendar, User, MessageSquare, AlertTriangle,
  CheckCircle2, Clock, Filter, Save, Trash2, Heart, Sparkles, AlertCircle,
  TrendingUp, Award, Table, BookOpen, Layers, Info, ChevronRight, ChevronLeft, FileText, X, Edit3, ShieldCheck
} from "lucide-react"

export default function TeacherAdvisoryPage() {
  const [academicYearId, setAcademicYearId] = useState("")
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [students, setStudents] = useState<any[]>([]); const [submittedStudentCodes, setSubmittedStudentCodes] = useState<string[]>([]); const [submissionFilter, setSubmissionFilter] = useState<"ALL" | "SUBMITTED" | "NOT_SUBMITTED">("ALL")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  
  const [activeTab, setActiveTab] = useState<"consultations" | "sos" | "tracking" | "rubric_eval">("tracking")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  // Data States
  const [consultations, setConsultations] = useState<any[]>([])
  const [helpRequests, setHelpRequests] = useState<any[]>([])
  
  // 1. Student-Focused Goal Progress Tracking State
  const [checkPoint, setCheckPoint] = useState<"GIUA_KY_1" | "CUOI_KY_1" | "GIUA_KY_2" | "CUOI_KY_2">("GIUA_KY_1")
  const [singleStudentTrackingRows, setSingleStudentTrackingRows] = useState<any[]>([]); const [viewMode, setViewMode] = useState<"card" | "table">("card"); const [activeStudentCommitment, setActiveStudentCommitment] = useState<string>("")

  // 2. Term Evaluation Rubric States
  const [evalTerm, setEvalTerm] = useState<"HK1" | "HK2">("HK1")
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedYear = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(storedYear)
    }

    fetch("/api/classes?isGVCN=true&_v=" + Date.now(), { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setClasses(data)
          setSelectedClassId(data[0].id)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Auto-fetch students when class changes
  useEffect(() => {
    if (!selectedClassId) return
    const url = "/api/students/search?classId=" + selectedClassId + (academicYearId ? "&academicYearId=" + academicYearId : "")
    
        // Fetch class submission status
    fetch("/api/advisory/goals?classId=" + selectedClassId + "&_t=" + Date.now(), { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.submittedStudentCodes)) {
          setSubmittedStudentCodes(data.submittedStudentCodes)
        }
      })
      .catch(console.error)

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
  }, [selectedClassId, academicYearId])

  // Load Goal Tracking & Rubric Data for currently selected student
  useEffect(() => {
    if (!selectedStudentId) return
    loadStudentTracking()
    loadSingleStudentData()
    setConsultationForm(prev => ({ ...prev, studentId: selectedStudentId }))
  }, [selectedStudentId, checkPoint, evalTerm, academicYearId])

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

      const standardCats = [
        { key: "HOC_TAP", label: "1. Mục tiêu học tập 📚" },
        { key: "THOI_QUEN", label: "2. Mục tiêu thói quen ⏰" },
        { key: "KY_NANG_CAM_XUC", label: "3. Mục tiêu kỹ năng, cảm xúc 🎨" },
        { key: "DINH_HUONG", label: "4. Mục tiêu định hướng 🚀" }
      ]

      const goalRes = await fetch("/api/advisory/goals?studentId=" + st.id + "&studentCode=" + (st.studentCode || "") + "&academicYearId=" + academicYearId + "&_t=" + Date.now(), { cache: "no-store" })
      const goalData = goalRes.ok ? await goalRes.json() : null

      setActiveStudentCommitment(goalData?.existingSheet?.studentCommitment || "")

      const trackRes = await fetch("/api/advisory/tracking?studentId=" + st.id + "&academicYearId=" + academicYearId + "&checkPoint=" + checkPoint + "&_t=" + Date.now(), { cache: "no-store" })
      const existingLogs = trackRes.ok ? await trackRes.json() : []

      const rows: any[] = []

      function getCategoryKey(cat: string): string {
        const c = String(cat || "").toUpperCase().trim()
        if (c.includes("HOC_TAP") || c.includes("HỌC TẬP")) return "HOC_TAP"
        if (c.includes("THOI_QUEN") || c.includes("THÓI QUEN") || c.includes("SUC_KHOE") || c.includes("SỨC KHỎE")) return "THOI_QUEN"
        if (c.includes("KY_NANG") || c.includes("KỸ NĂNG") || c.includes("CAM_XUC") || c.includes("CẢM XÚC") || c.includes("SO_THICH")) return "KY_NANG_CAM_XUC"
        if (c.includes("DINH_HUONG") || c.includes("ĐỊNH HƯỚNG") || c.includes("PHAM_CHAT") || c.includes("PHẨM CHẤT")) return "DINH_HUONG"
        return "HOC_TAP"
      }

      standardCats.forEach(catObj => {
        const studentGoalsInCat = goalData?.goals?.filter((g: any) => {
          return getCategoryKey(g.category) === catObj.key
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
          const matchedLog = existingLogs.find((l: any) => getCategoryKey(l.category) === catObj.key || l.category === catObj.label)
          rows.push({
            studentId: st.id,
            studentName: st.studentName,
            studentCode: st.studentCode,
            categoryKey: catObj.key,
            category: catObj.label,
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
      
      // Calculate overall student rubric scores from rows if present
      const validRows = singleStudentTrackingRows.filter(r => r.goalCompletionLevel)
      const avgGoalCompletion = validRows.length > 0
        ? Math.round(validRows.reduce((acc, r) => acc + (Number(r.goalCompletionLevel) || 4), 0) / validRows.length)
        : rubricForm.goalCompletionLevel
      const avgInitiative = validRows.length > 0
        ? Math.round(validRows.reduce((acc, r) => acc + (Number(r.initiativeLevel) || 4), 0) / validRows.length)
        : rubricForm.initiativeLevel
      const avgParticipation = validRows.length > 0
        ? Math.round(validRows.reduce((acc, r) => acc + (Number(r.participationAttitude) || 5), 0) / validRows.length)
        : rubricForm.participationAttitude

      const res = await fetch("/api/advisory/term-evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYearId,
          term: evalTerm,
          goalCompletionLevel: avgGoalCompletion,
          initiativeLevel: avgInitiative,
          participationAttitude: avgParticipation,
          recommendations: rubricForm.recommendations
        })
      })

      await fetch("/api/advisory/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYearId,
          checkPoint,
          items: singleStudentTrackingRows
        })
      }).catch(console.error)

      if (res.ok) {
        setToastMessage("Đã lưu Đánh giá kỳ theo Rubric & Tiến độ mục tiêu thành công!")
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
  const activeStudent = students[activeStudentIndex] || students[0]
  const selectedClass = classes.find(c => c.id === selectedClassId)

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
              {classes.map(c => (
                <option key={c.id} value={c.id} className="text-slate-800">Lớp: {c.className}</option>
              ))}
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
            onClick={() => setActiveTab("rubric_eval")}
            className={
              activeTab === "rubric_eval"
                ? "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all bg-white text-[#003B3A] shadow-md"
                : "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all bg-white/15 text-white hover:bg-white/25"
            }
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>2. Đánh Giá Kỳ theo Rubric</span>
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
            <span>3. Nhật Ký Tham Vấn ({consultations.length})</span>
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
            <span>4. Yêu Cầu SOS ({helpRequests.length})</span>
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
                    <button
                      key={st.id}
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
                      <span>{isSubmitted ? "🟢" : "⚪"}</span>
                      <span>{idx + 1}. {st.studentName}</span>
                      {isSubmitted && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-black">✓</span>}
                    </button>
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
                Hiển thị đầy đủ 4 nhóm mục tiêu cá nhân do học sinh {activeStudent?.studentName} tự điền.
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
                [
                  { key: "HOC_TAP", label: "1. Mục tiêu học tập 📚", number: "01", theme: { border: "border-sky-200", badgeBg: "bg-sky-50 border-sky-200", badgeText: "text-sky-800", numberBadge: "bg-sky-600 text-white" } },
                  { key: "THOI_QUEN", label: "2. Mục tiêu thói quen ⏰", number: "02", theme: { border: "border-emerald-200", badgeBg: "bg-emerald-50 border-emerald-200", badgeText: "text-emerald-800", numberBadge: "bg-emerald-600 text-white" } },
                  { key: "KY_NANG_CAM_XUC", label: "3. Mục tiêu kỹ năng, cảm xúc 🎨", number: "03", theme: { border: "border-purple-200", badgeBg: "bg-purple-50 border-purple-200", badgeText: "text-purple-800", numberBadge: "bg-purple-600 text-white" } },
                  { key: "DINH_HUONG", label: "4. Mục tiêu định hướng 🚀", number: "04", theme: { border: "border-amber-200", badgeBg: "bg-amber-50 border-amber-200", badgeText: "text-amber-950", numberBadge: "bg-amber-600 text-white" } }
                ].map((catObj) => {
                  const catItems = singleStudentTrackingRows.filter(r => r.categoryKey === catObj.key || r.category === catObj.label || (r.category && r.category.includes(catObj.key)))
                  const theme = catObj.theme

                  return (
                    <div key={catObj.key} className={`bg-white rounded-3xl border-2 ${theme.border} shadow-xs hover:shadow-md transition-all overflow-hidden space-y-4 p-5 sm:p-6`}>
                      {/* Category Header */}
                      <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-2xl ${theme.numberBadge} flex items-center justify-center font-black text-xs shadow-xs shrink-0`}>
                            {catObj.number}
                          </span>
                          <h4 className="font-black text-base text-slate-900 tracking-tight">
                            {catObj.label}
                          </h4>
                        </div>
                        <span className={`px-3 py-1 ${theme.badgeBg} ${theme.badgeText} border rounded-full text-xs font-black shadow-2xs`}>
                          {catItems.length} mục tiêu
                        </span>
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
                            {item.category.includes("phẩm chất") || item.category.includes("PHAM_CHAT") ? "4. Mục tiêu định hướng 🚀" : item.category}
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

      {/* ----------------- TAB 2: ĐÁNH GIÁ KỲ THEO RUBRIC ----------------- */}
      {activeTab === "rubric_eval" && (
        <div className="space-y-6">

          {/* Form Đánh Giá Kỳ */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Phiếu Đánh Giá Kỳ Cố Vấn Học Tập ({activeStudent?.studentName})</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Đánh giá 3 tiêu chí theo Thang điểm 1 - 5 dựa trên Rubric chuẩn bên dưới
                </p>
              </div>

              {/* Term selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Kỳ đánh giá:</span>
                <select
                  value={evalTerm}
                  onChange={(e) => {
                    const newTerm = e.target.value as "HK1" | "HK2"
                    setEvalTerm(newTerm)
                    setCheckPoint(newTerm === "HK1" ? "CUOI_KY_1" : "CUOI_KY_2")
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-900 font-black text-xs border border-teal-200"
                >
                  <option value="HK1">Học kỳ I</option>
                  <option value="HK2">Học kỳ II</option>
                </select>
              </div>
            </div>

            {/* Excel Evaluation Table Format */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                    <th className="p-3 border-r border-slate-200 min-w-[280px]">Mục tiêu năm học</th>
                    <th className="p-3 border-r border-slate-200 min-w-[170px]">Kết quả theo dõi</th>
                    <th className="p-3 border-r border-slate-200 min-w-[180px]">Mức hoàn thành mục tiêu (1-5)</th>
                    <th className="p-3 border-r border-slate-200 min-w-[180px]">Mức độ chủ động (1-5)</th>
                    <th className="p-3 border-r border-slate-200 min-w-[180px]">Thái độ tham gia (1-5)</th>
                    <th className="p-3 min-w-[220px]">Khuyến nghị cho phụ huynh / giáo viên bộ môn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {singleStudentTrackingRows.length > 0 ? (
                    singleStudentTrackingRows.map((item, idx) => (
                      <tr key={idx} className="bg-white hover:bg-slate-50/50">
                        {/* Mục tiêu năm học */}
                        <td className="p-3 border-r border-slate-200 align-top">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#003B3A] text-white text-[10px] font-black shadow-2xs">
                                #{singleStudentTrackingRows.filter((r, i) => i <= idx && (r.categoryKey === item.categoryKey || r.category === item.category)).length} MỤC TIÊU CỤ THỂ #{singleStudentTrackingRows.filter((r, i) => i <= idx && (r.categoryKey === item.categoryKey || r.category === item.category)).length}
                              </span>
                              <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black bg-teal-100 text-teal-900 border border-teal-200">
                                {item.category.includes("phẩm chất") || item.category.includes("PHAM_CHAT") ? "4. Mục tiêu định hướng 🚀" : item.category}
                              </span>
                            </div>
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

                        {/* Kết quả theo dõi */}
                        <td className="p-3 border-r border-slate-200 align-top">
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

                        {/* Mức hoàn thành mục tiêu (1-5) cho TỪNG mục tiêu */}
                        <td className="p-3 border-r border-slate-200 align-top">
                          <select
                            value={item.goalCompletionLevel !== undefined ? item.goalCompletionLevel : (rubricForm.goalCompletionLevel || 0)}
                            onChange={(e) => {
                              const updated = [...singleStudentTrackingRows]
                              updated[idx].goalCompletionLevel = Number(e.target.value)
                              setSingleStudentTrackingRows(updated)
                              if (idx === 0) setRubricForm(prev => ({ ...prev, goalCompletionLevel: Number(e.target.value) }))
                            }}
                            className={`w-full p-2 rounded-xl border font-black text-xs shadow-xs focus:ring-2 focus:ring-amber-400 ${
                              item.goalCompletionLevel
                                ? "bg-amber-50 text-amber-950 border-amber-300"
                                : "bg-slate-100 text-slate-700 border-slate-300"
                            }`}
                          >
                            <option value={0}>- (Chưa đánh giá)</option>
                            {[1, 2, 3, 4, 5].map(v => (
                              <option key={v} value={v}>Mức {v} - {RUBRICS.goalCompletion[v-1].text.slice(0, 28)}...</option>
                            ))}
                          </select>
                        </td>

                        {/* Mức độ chủ động (1-5) cho TỪNG mục tiêu */}
                        <td className="p-3 border-r border-slate-200 align-top">
                          <select
                            value={item.initiativeLevel !== undefined ? item.initiativeLevel : (rubricForm.initiativeLevel || 0)}
                            onChange={(e) => {
                              const updated = [...singleStudentTrackingRows]
                              updated[idx].initiativeLevel = Number(e.target.value)
                              setSingleStudentTrackingRows(updated)
                              if (idx === 0) setRubricForm(prev => ({ ...prev, initiativeLevel: Number(e.target.value) }))
                            }}
                            className={`w-full p-2 rounded-xl border font-black text-xs shadow-xs focus:ring-2 focus:ring-blue-400 ${
                              item.initiativeLevel
                                ? "bg-blue-50 text-blue-950 border-blue-300"
                                : "bg-slate-100 text-slate-700 border-slate-300"
                            }`}
                          >
                            <option value={0}>- (Chưa đánh giá)</option>
                            {[1, 2, 3, 4, 5].map(v => (
                              <option key={v} value={v}>Mức {v} - {RUBRICS.initiative[v-1].text.slice(0, 28)}...</option>
                            ))}
                          </select>
                        </td>

                        {/* Thái độ tham gia (1-5) cho TỪNG mục tiêu */}
                        <td className="p-3 border-r border-slate-200 align-top">
                          <select
                            value={item.participationAttitude !== undefined ? item.participationAttitude : (rubricForm.participationAttitude || 0)}
                            onChange={(e) => {
                              const updated = [...singleStudentTrackingRows]
                              updated[idx].participationAttitude = Number(e.target.value)
                              setSingleStudentTrackingRows(updated)
                              if (idx === 0) setRubricForm(prev => ({ ...prev, participationAttitude: Number(e.target.value) }))
                            }}
                            className={`w-full p-2 rounded-xl border font-black text-xs shadow-xs focus:ring-2 focus:ring-emerald-400 ${
                              item.participationAttitude
                                ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                                : "bg-slate-100 text-slate-700 border-slate-300"
                            }`}
                          >
                            <option value={0}>- (Chưa đánh giá)</option>
                            {[1, 2, 3, 4, 5].map(v => (
                              <option key={v} value={v}>Mức {v} - {RUBRICS.participation[v-1].text.slice(0, 28)}...</option>
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
                            placeholder={"Nhập khuyến nghị / ghi chú chi tiết cho " + (item.category.includes("phẩm chất") || item.category.includes("PHAM_CHAT") ? "Mục tiêu định hướng" : item.category) + "..."}
                            className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-teal-500 focus:ring-1 focus:ring-teal-300"
                          />
                        </td>
                      </tr>
                    ))
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

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveRubricEval}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#003B3A] text-white text-xs font-black flex items-center gap-2 hover:bg-[#004D4A] shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Đang lưu..." : "Lưu Đánh Giá Kỳ theo Rubric"}</span>
              </button>
            </div>
          </div>

          {/* Bảng Tra Cứu Rubric Đánh Giá */}
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
      )}

      {/* ----------------- TAB 3: NHẬT KÝ THAM VẤN (100% THEO MẪU EXCEL SỔ QUAN SÁT GVCN) ----------------- */}
      {activeTab === "consultations" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-[#003B3A] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span>Nhật Ký Tham Vấn Cố Vấn Học Tập — Lớp {selectedClass?.className}</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Nhật ký lưu trữ các buổi gặp tham vấn cá nhân (Khớp 100% theo mẫu Sổ quan sát GVCN).
              </p>
            </div>

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

          {/* Table matching Excel Sheet: Nhật ký tham vấn */}
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
                  <th className="p-3 border-r border-slate-200 w-32">Ghi chú</th>
                  <th className="p-3 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                {consultations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                      Chưa có nhật ký tham vấn nào trong lớp {selectedClass?.className}. Vui lòng bấm "+ Thêm Mới Nhật Ký Tham Vấn" để tạo mới.
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
                  <th className="p-3.5 border-r border-slate-200 w-12 text-center">STT</th>
                  <th className="p-3.5 border-r border-slate-200 w-1/5">1. Thông tin Học sinh</th>
                  <th className="p-3.5 border-r border-slate-200 w-44">2. Phân loại cần giúp đỡ</th>
                  <th className="p-3.5 border-r border-slate-200 w-36">3. Mức độ khẩn cấp</th>
                  <th className="p-3.5 border-r border-slate-200">4. Chi tiết điều em muốn Thầy/Cô hỗ trợ</th>
                  <th className="p-3.5 w-64">5. Phản hồi & Xử lý của GVCN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                {helpRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      Chưa có yêu cầu hỗ trợ khẩn cấp (SOS) nào từ học sinh trong lớp {selectedClass?.className}.
                    </td>
                  </tr>
                ) : (
                  helpRequests.map((req, idx) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 border-r border-slate-200 text-center font-bold text-slate-500 align-top">{idx + 1}</td>
                      
                      {/* 1. Học sinh */}
                      <td className="p-3.5 border-r border-slate-200 bg-slate-50/50 align-top space-y-1">
                        <span className="font-black text-slate-900 block text-sm">{req.student?.studentName || "Học sinh"}</span>
                        {req.student?.studentCode ? (
                          <span className="text-[11px] text-teal-800 font-bold block">Mã HS: {req.student?.studentCode}</span>
                        ) : null}
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-extrabold">
                          Lớp {req.student?.class?.className || selectedClass?.className}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium pt-1">
                          🕒 {new Date(req.createdAt).toLocaleString("vi-VN")}
                        </span>
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
                      <td className="p-3.5 align-top space-y-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">Trạng thái xử lý:</label>
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
                                ? "w-full p-2 rounded-xl text-xs font-black border focus:outline-none cursor-pointer bg-emerald-100 text-emerald-900 border-emerald-300"
                                : req.status === "PROCESSING"
                                ? "w-full p-2 rounded-xl text-xs font-black border focus:outline-none cursor-pointer bg-amber-100 text-amber-900 border-amber-300"
                                : "w-full p-2 rounded-xl text-xs font-black border focus:outline-none cursor-pointer bg-slate-100 text-slate-800 border-slate-300"
                            }
                          >
                            <option value="PENDING">🟡 Chờ phản hồi</option>
                            <option value="PROCESSING">🔵 Đang hỗ trợ</option>
                            <option value="RESOLVED">🟢 Đã xử lý xong</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">Lời nhắn / Phản hồi từ GVCN:</label>
                          <textarea
                            rows={2}
                            defaultValue={req.responseNotes || ""}
                            onBlur={async (e) => {
                              const noteVal = e.target.value
                              await fetch("/api/advisory/help-requests", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: req.id, responseNotes: noteVal, status: req.status || "PROCESSING" })
                              })
                              setToastMessage("Đã lưu lời nhắn phản hồi SOS cho học sinh!")
                              setTimeout(() => setToastMessage(""), 3000)
                            }}
                            placeholder="Nhập lời nhắn hỗ trợ học sinh..."
                            className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                          />
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

      {/* ----------------- MODAL THÊM MỚI / CHỈNH SỬA NHẬT KÝ THAM VẤN ----------------- */}
      {showConsultationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#003B3A]">
                    {editingConsultationId ? "Chỉnh Sửa Nhật Ký Tham Vấn" : "Thêm Mới Nhật Ký Tham Vấn Cố Vấn Học Tập"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Theo mẫu Excel Sổ quan sát GVCN</p>
                </div>
              </div>
              <button
                onClick={() => setShowConsultationModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
              
              {/* Ngày gặp */}
              <div>
                <label className="block mb-1 font-bold text-slate-800">📅 Ngày gặp (*):</label>
                <input
                  type="date"
                  value={consultationForm.meetingDate}
                  onChange={(e) => setConsultationForm({ ...consultationForm, meetingDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-xs bg-slate-50"
                />
              </div>

              {/* Học sinh */}
              <div>
                <label className="block mb-1 font-bold text-slate-800">👤 Học sinh (*):</label>
                <select
                  value={consultationForm.studentId}
                  onChange={(e) => setConsultationForm({ ...consultationForm, studentId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-xs bg-slate-50"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.studentName} ({s.studentCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nội dung trao đổi */}
              <div className="sm:col-span-2">
                <label className="block mb-1 font-bold text-slate-800">💬 Nội dung trao đổi (*):</label>
                <textarea
                  rows={2}
                  value={consultationForm.content}
                  onChange={(e) => setConsultationForm({ ...consultationForm, content: e.target.value })}
                  placeholder="Ví dụ: Trao đổi về mục tiêu tuần, tình hình học môn Toán..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs"
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
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs"
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
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs"
                />
              </div>

              {/* Thời hạn */}
              <div>
                <label className="block mb-1 font-bold text-slate-800">⏰ Thời hạn:</label>
                <input
                  type="date"
                  value={consultationForm.deadline}
                  onChange={(e) => setConsultationForm({ ...consultationForm, deadline: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-xs bg-slate-50"
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
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs"
                />
              </div>

            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowConsultationModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveConsultation}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#003B3A] text-white text-xs font-black flex items-center gap-2 hover:bg-[#004D4A] shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Đang lưu..." : "Lưu Nhật Ký Tham Vấn"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
