"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  UserCheck, Baby, Settings, Search, Trash2,
  Mail, Loader2, Filter, Calendar, CheckCircle2, Layers,
  AlertCircle, X, RefreshCw, Users, Info, PlusCircle, Check, HelpCircle, Sparkles
} from "lucide-react"

// ─── Helpers ───

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div className={`fixed top-5 right-5 z-[400] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-xs sm:text-sm font-bold animate-in slide-in-from-top-3 duration-300 ${type === "ok" ? "bg-[#003B3A] text-white border-[#00736E]" : "bg-rose-600 text-white border-rose-500"}`}>
      {type === "ok" ? <CheckCircle2 className="w-5 h-5 text-[#00A19A]" /> : <AlertCircle className="w-5 h-5" />}
      {msg}
    </div>
  )
}

function Spin() {
  return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-[#00736E] animate-spin opacity-60" /></div>
}

function Empty({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center bg-slate-50/40 rounded-2xl border border-dashed border-slate-200 p-6 m-4">
      <div className="w-14 h-14 flex items-center justify-center mb-3 rounded-2xl bg-teal-50 border border-teal-100 text-[#00736E]">
        <UserCheck className="w-7 h-7" />
      </div>
      <p className="font-bold text-slate-700 text-sm">{text}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function Field({ label, required, children, tooltip }: { label: string; required?: boolean; children: React.ReactNode; tooltip?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
        {label}
        {required && <span className="text-rose-500">*</span>}
        {tooltip && (
          <span className="text-slate-400 hover:text-slate-600 cursor-help" title={tooltip}>
            <HelpCircle className="w-3.5 h-3.5" />
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

const inp = "w-full bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800 outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cpath%20stroke%3D%27%2364748b%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%271.5%27%20d%3D%27m6%208%204%204%204-4%27%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] bg-[length:16px_16px] pr-9 focus:border-[#00736E] focus:ring-2 focus:ring-teal-500/20 transition-colors placeholder:text-slate-400 shadow-2xs"

interface ConfirmState { msg: string; fn: () => void }
function ConfirmDialog({ open, onClose, onConfirm, message }: { open:boolean; onClose:()=>void; onConfirm:()=>void; message:string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xl p-6 max-w-[360px] w-full text-center animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4"><Trash2 className="w-5 h-5" /></div>
        <h3 className="text-sm font-bold text-slate-800 mb-1.5">Xác nhận xóa</h3>
        <p className="text-xs text-slate-500 font-normal leading-relaxed mb-5 px-1">{message}</p>
        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-2 px-3 rounded-xl border border-slate-200/70 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">Hủy</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer shadow-2xs">Xóa</button>
        </div>
      </div>
    </div>
  )
}

// Helper to get name initials
function getInitials(name: string) {
  if (!name) return "GV"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// ─── Props ───
interface Props {
  academicYears: any[]
  initialPeriods: any[]
  teachers: any[]
  departments: any[]
  campuses: any[]
  grades: string[]
  giaoVuCSUsers?: any[]
  currentUser?: { id: string; role: string; campusIds: string[]; fullName?: string } | null
  rolePermissions?: any[]
}

export function PhanCongMamNonClient({
  academicYears = [],
  initialPeriods = [],
  teachers = [],
  departments = [],
  campuses = [],
  grades = [],
  giaoVuCSUsers = [],
  currentUser = null,
  rolePermissions = []
}: Props) {
  const userRole = (currentUser?.role || "").toUpperCase()
  const isAdmin = userRole === "ADMIN" || userRole === "KT_DBCL"
  const canCreate = isAdmin || (rolePermissions.some(p => p.module === "PHAN_CONG_MAM_NON" && p.canCreate))
  const canUpdate = isAdmin || (rolePermissions.some(p => p.module === "PHAN_CONG_MAM_NON" && p.canUpdate))
  const canDelete = isAdmin || (rolePermissions.some(p => p.module === "PHAN_CONG_MAM_NON" && p.canDelete))

  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)
  const notify = (msg: string, type: "ok" | "err" = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200) }
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  // ─── Year ───
  const defaultYear = academicYears.find(y => !y.isOff) || academicYears[0]
  const [yearId, setYearId] = useState(defaultYear?.id || "")

  // ─── Periods ───
  const [periods, setPeriods] = useState<any[]>(() => {
    return initialPeriods.map(p => ({
      ...p,
      batches: (p.batches || []).filter((b: any) => b.status === "ACTIVE")
    }))
  })
  const [pLoading, setPLoading] = useState(false)

  const fetchPeriods = useCallback(async () => {
    if (!yearId) return
    setPLoading(true)
    try {
      const r = await fetch(`/api/preschool-input-assessments?academicYearId=${yearId}`)
      if (r.ok) {
        const data = await r.json()
        setPeriods(data.map((p: any) => ({
          ...p,
          batches: (p.batches || []).filter((b: any) => b.status === "ACTIVE")
        })))
      }
    } finally { setPLoading(false) }
  }, [yearId])

  useEffect(() => { fetchPeriods() }, [fetchPeriods])

  // ─── Assignment State ───
  const [aPeriodId, setAPeriodId] = useState("")
  const [aBatchId, setABatchId] = useState("")
  const [aGrades, setAGrades] = useState<string[]>([])
  const [aDeptId, setADeptId] = useState("")
  const [aSelectedTeachers, setASelectedTeachers] = useState<string[]>([])
  const [aSearchTeacher, setASearchTeacher] = useState("")
  const [assignments, setAssignments] = useState<any[]>([])
  const [assignLoading, setAssignLoading] = useState(false)
  const [aSaving, setASaving] = useState(false)
  const [aNotifyingId, setANotifyingId] = useState<string | null>(null)
  const [aNotifyingAll, setANotifyingAll] = useState(false)

  // Auto-set default period when available
  useEffect(() => {
    if (periods.length > 0 && !aPeriodId) {
      setAPeriodId(periods[0].id)
    }
  }, [periods, aPeriodId])

  // ─── Computed ───
  const aSelPeriod = useMemo(() => periods.find(p => p.id === aPeriodId), [periods, aPeriodId])

  const aLatestBatch = useMemo(() => {
    if (!aSelPeriod?.batches || aSelPeriod.batches.length === 0) return null
    const sorted = [...aSelPeriod.batches].sort((a: any, b: any) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0
      if (dateB !== dateA) return dateB - dateA
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      if (cb !== ca) return cb - ca
      return (b.id || "").localeCompare(a.id || "")
    })
    return sorted[0] || null
  }, [aSelPeriod])

  const [showCustomBatch, setShowCustomBatch] = useState(false)

  // Auto-sync batch when period changes
  useEffect(() => {
    if (aLatestBatch) {
      setABatchId(aLatestBatch.id)
    } else {
      setABatchId("")
    }
    setShowCustomBatch(false)
  }, [aPeriodId, aLatestBatch])

  const aActiveBatch = useMemo(() => {
    if (!aPeriodId || !aBatchId || aBatchId === "all") return null
    return periods.find(p => p.id === aPeriodId)?.batches?.find((b: any) => b.id === aBatchId)
  }, [periods, aPeriodId, aBatchId])

  const [uiStage, setUiStage] = useState<"STAGE_1" | "STAGE_2" | "">("")
  const [uiForm, setUiForm] = useState<string>("")
  const [uiProbationForm, setUiProbationForm] = useState<string>("")

  // Auto-detect stage based on batch start date or default to empty on load
  useEffect(() => {
    if (aActiveBatch) {
      const dateObj = new Date(aActiveBatch.startDate)
      const isStage2 = !isNaN(dateObj.getTime()) && dateObj.getMonth() >= 0 && dateObj.getMonth() <= 4
      setUiStage(isStage2 ? "STAGE_2" : "STAGE_1")
    } else if (aPeriodId) {
      const now = new Date()
      const isStage2 = now.getMonth() >= 0 && now.getMonth() <= 4
      setUiStage(isStage2 ? "STAGE_2" : "STAGE_1")
    } else {
      setUiStage("")
    }
  }, [aActiveBatch, aPeriodId])

  const formOptions = [
    "12 đến 18 tháng",
    "18 đến 24 tháng",
    "24 đến 36 tháng",
    "3 đến 4 tuổi",
    "4 đến 5 tuổi",
    "5 đến 6 tuổi"
  ]

  // Map Selected Grade and Stage to Survey Form
  useEffect(() => {
    const grade = aGrades[0]
    if (grade) {
      // Map Probation form statically
      if (grade === "Nhà trẻ 12-18 tháng") setUiProbationForm("Mẫu phiếu học thử 12_18")
      else if (grade === "Nhà trẻ 18-24 tháng") setUiProbationForm("Mẫu phiếu học thử 18 đến 24 tháng")
      else if (grade === "Nhà trẻ 24-36 tháng") setUiProbationForm("Mẫu phiếu học thử 24 đến 36")
      else if (grade === "Mẫu giáo bé") setUiProbationForm("Mẫu phiếu 3 đến 4 tuổi")
      else if (grade === "Mẫu giáo nhỡ") setUiProbationForm("Mẫu phiếu 4 đến 5 tuổi")
      else if (grade === "Mẫu giáo lớn") setUiProbationForm("Mẫu phiếu 5 đến 6 tuổi")
      else setUiProbationForm("")

      if (grade === "Mẫu phiếu học thử") {
        setUiForm("Mẫu phiếu học thử")
        return
      }
      if (uiStage) {
        let targetForm = ""
        if (uiStage === "STAGE_2") {
          if (grade === "Nhà trẻ 12-18 tháng") targetForm = "12 đến 18 tháng"
          else if (grade === "Nhà trẻ 18-24 tháng") targetForm = "18 đến 24 tháng"
          else if (grade === "Nhà trẻ 24-36 tháng") targetForm = "24 đến 36 tháng"
          else if (grade === "Mẫu giáo bé") targetForm = "3 đến 4 tuổi"
          else if (grade === "Mẫu giáo nhỡ") targetForm = "4 đến 5 tuổi"
          else if (grade === "Mẫu giáo lớn") targetForm = "5 đến 6 tuổi"
        } else {
          if (grade === "Nhà trẻ 12-18 tháng") targetForm = "12 đến 18 tháng"
          else if (grade === "Nhà trẻ 18-24 tháng") targetForm = "18 đến 24 tháng"
          else if (grade === "Nhà trẻ 24-36 tháng") targetForm = "18 đến 24 tháng"
          else if (grade === "Mẫu giáo bé") targetForm = "24 đến 36 tháng"
          else if (grade === "Mẫu giáo nhỡ") targetForm = "3 đến 4 tuổi"
          else if (grade === "Mẫu giáo lớn") targetForm = "4 đến 5 tuổi"
        }
        if (targetForm && targetForm !== uiForm) {
          setUiForm(targetForm)
        }
      }
    } else if (!grade) {
      setUiForm("")
      setUiProbationForm("")
    }
  }, [aGrades, uiStage, uiForm])

  // Select Grade / Form mapping from Statistics Panel click
  const selectGradeFromStats = (grade: string) => {
    const normalized = (grade || "").trim()
    if (!normalized) return

    let targetGrade = "";
    let targetForm = "";

    if (normalized === "12 đến 18 tháng") {
      targetGrade = "Nhà trẻ 12-18 tháng";
      targetForm = "12 đến 18 tháng";
    } else if (normalized === "18 đến 24 tháng") {
      targetGrade = "Nhà trẻ 18-24 tháng";
      targetForm = "18 đến 24 tháng";
    } else if (normalized === "24 đến 36 tháng") {
      targetGrade = "Nhà trẻ 24-36 tháng";
      targetForm = uiStage === "STAGE_2" ? "24 đến 36 tháng" : "18 đến 24 tháng";
    } else if (normalized === "3 đến 4 tuổi" || normalized === "Mẫu giáo bé") {
      targetGrade = "Mẫu giáo bé";
      targetForm = uiStage === "STAGE_2" ? "3 đến 4 tuổi" : "24 đến 36 tháng";
    } else if (normalized === "4 đến 5 tuổi" || normalized === "Mẫu giáo nhỡ") {
      targetGrade = "Mẫu giáo nhỡ";
      targetForm = uiStage === "STAGE_2" ? "4 đến 5 tuổi" : "3 đến 4 tuổi";
    } else if (normalized === "5 đến 6 tuổi" || normalized === "Mẫu giáo lớn") {
      targetGrade = "Mẫu giáo lớn";
      targetForm = uiStage === "STAGE_2" ? "5 đến 6 tuổi" : "4 đến 5 tuổi";
    }

    if (targetGrade) {
      // Toggle selection support
      if (aGrades.includes(targetGrade) && uiForm === targetForm) {
        setAGrades([])
        setUiForm("")
        notify("Đã bỏ chọn Nhóm tuổi")
      } else {
        setAGrades([targetGrade]);
        if (targetForm) setUiForm(targetForm);
        notify(`Đã chọn Khối: ${targetGrade}`);
      }
    }
  }

  const isStatsGroupSelected = (g: string) => {
    const norm = (g || "").trim();
    if (norm === "12 đến 18 tháng") {
      return aGrades.includes("Nhà trẻ 12-18 tháng");
    }
    if (norm === "18 đến 24 tháng") {
      return aGrades.includes("Nhà trẻ 18-24 tháng");
    }
    if (norm === "24 đến 36 tháng") {
      return aGrades.includes("Nhà trẻ 24-36 tháng");
    }
    if (norm === "3 đến 4 tuổi" || norm === "Mẫu giáo bé") {
      return aGrades.includes("Mẫu giáo bé");
    }
    if (norm === "4 đến 5 tuổi" || norm === "Mẫu giáo nhỡ") {
      return aGrades.includes("Mẫu giáo nhỡ");
    }
    if (norm === "5 đến 6 tuổi" || norm === "Mẫu giáo lớn") {
      return aGrades.includes("Mẫu giáo lớn");
    }
    return false;
  }

  // ─── Student stats state ───
  const [studentStats, setStudentStats] = useState<Record<string, number>>({})
  const [studentsList, setStudentsList] = useState<any[]>([])
  const [statsLoading, setStatsLoading] = useState(false)

  const fetchStudentStats = useCallback(async () => {
    if (!aPeriodId) {
      setStudentStats({})
      setStudentsList([])
      return
    }
    setStatsLoading(true)
    try {
      let url = `/api/preschool-input-assessment-students?periodId=${aPeriodId}`
      if (aBatchId && aBatchId !== "all" && aBatchId !== "") url += `&batchId=${aBatchId}`
      const res = await fetch(url)
      if (res.ok) {
        const students = await res.json()
        setStudentsList(students)
        const counts: Record<string, number> = {}
        students.forEach((s: any) => {
          const g = s.grade || "Chưa xác định"
          counts[g] = (counts[g] || 0) + 1
        })
        setStudentStats(counts)
      } else {
        setStudentsList([])
        setStudentStats({})
      }
    } catch (e) {
      console.error(e)
      setStudentsList([])
      setStudentStats({})
    } finally {
      setStatsLoading(false)
    }
  }, [aPeriodId, aBatchId])

  useEffect(() => {
    fetchStudentStats()
  }, [fetchStudentStats])

  // Find currently active age group based on selection state
  const activeGroup = useMemo(() => {
    return Object.keys(studentStats).find(g => isStatsGroupSelected(g))
  }, [studentStats, aGrades, uiForm, uiStage])

  // Filter students by active group
  const filteredGroupStudents = useMemo(() => {
    if (!activeGroup) return []
    return studentsList.filter((s) => (s.grade || "").trim() === activeGroup.trim())
  }, [activeGroup, studentsList])

  const aGradesStr = aGrades.join(",")

  // ─── Fetch Assignments ───
  const fetchAssignments = useCallback(async () => {
    if (!aPeriodId) {
      setAssignments([])
      return
    }
    setAssignLoading(true)
    try {
      let url = `/api/preschool-input-assessment-assignments?periodId=${aPeriodId}`
      if (aBatchId && aBatchId !== "all" && aBatchId !== "") url += `&batchId=${aBatchId}`
      else if (aBatchId === "all") url += `&batchId=all`
      if (aGradesStr) url += `&grade=${encodeURIComponent(aGradesStr)}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setAssignments(data)
        setASelectedTeachers(data.map((a: any) => a.userId))
      }
    } catch (e) {
      notify("Lỗi khi tải danh sách phân công", "err")
    } finally { setAssignLoading(false) }
  }, [aPeriodId, aBatchId, aGradesStr])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  // ─── Toggle Teacher in Selection List ───
  const toggleTeacher = (userId: string) => {
    setASelectedTeachers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  // Memoized Filtered Teacher List
  const filteredTeachers = useMemo(() => {
    if (!aDeptId && !aSearchTeacher.trim()) return []
    return teachers
      .filter(t => t.user)
      .filter(t => !aDeptId || t.departmentId === aDeptId)
      .filter(t => {
        if (!aSearchTeacher) return true
        const search = aSearchTeacher.toLowerCase()
        return (t.teacherName || "").toLowerCase().includes(search) || 
               (t.teacherCode || "").toLowerCase().includes(search)
      })
  }, [teachers, aDeptId, aSearchTeacher])

  // Check if all filtered teachers are selected
  const isAllFilteredSelected = useMemo(() => {
    if (filteredTeachers.length === 0) return false
    return filteredTeachers.every(t => aSelectedTeachers.includes(t.user.id))
  }, [filteredTeachers, aSelectedTeachers])

  // Toggle All filtered teachers selection
  const toggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const filteredIds = filteredTeachers.map(t => t.user.id)
      setASelectedTeachers(prev => prev.filter(id => !filteredIds.includes(id)))
      notify("Đã bỏ chọn giáo viên đã lọc")
    } else {
      const filteredIds = filteredTeachers.map(t => t.user.id)
      setASelectedTeachers(prev => {
        const newIds = filteredIds.filter(id => !prev.includes(id))
        return [...prev, ...newIds]
      })
      notify("Đã chọn toàn bộ giáo viên đã lọc")
    }
  }

  // ─── Save / Notify / Delete Actions ───
  const saveAssignments = async () => {
    if (!aPeriodId) return notify("Vui lòng chọn Kỳ khảo sát", "err")
    if (aGrades.length === 0) return notify("Vui lòng chọn Nhóm tuổi/Khối học cần phân công", "err")
    if (aSelectedTeachers.length === 0) return notify("Vui lòng chọn ít nhất một Giáo viên để phân công", "err")
    
    setASaving(true)
    try {
      const res = await fetch("/api/preschool-input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ASSIGN", periodId: aPeriodId, batchId: aBatchId, grade: aGrades, userIds: aSelectedTeachers })
      })
      if (res.ok) { 
        notify("Lưu phân công giáo viên mầm non thành công!")
        fetchAssignments() 
      } else {
        notify("Lỗi khi lưu phân công", "err")
      }
    } catch { notify("Có lỗi xảy ra", "err") }
    finally { setASaving(false) }
  }

  const sendTeacherNotification = async (assignmentId: string, teacherName: string) => {
    if (!canUpdate) return
    setANotifyingId(assignmentId)
    try {
      const res = await fetch("/api/preschool-input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "NOTIFY_SINGLE", assignmentId })
      })
      if (res.ok) {
        const result = await res.json()
        if (result.success && result.sentCount > 0) { notify(`Đã gửi email thông báo cho GV ${teacherName}!`) }
        else { notify(`Lỗi gửi email: ${result.errors?.[0] || "Không gửi được email"}`, "err") }
      } else { notify("Lỗi kết nối gửi thông báo", "err") }
    } catch { notify("Lỗi gửi thông báo", "err") }
    finally { setANotifyingId(null) }
  }

  const sendAllNotifications = async () => {
    if (!canUpdate) return
    if (assignments.length === 0) return notify("Không có giáo viên nào được phân công để gửi thông báo", "err")
    setANotifyingAll(true)
    try {
      const res = await fetch("/api/preschool-input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "NOTIFY_ALL", periodId: aPeriodId, batchId: aBatchId, grade: aGrades })
      })
      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          notify(`Đã gửi thông báo thành công cho ${result.sentCount} giáo viên!`)
          if (result.failedCount > 0) notify(`Gửi thất bại cho ${result.failedCount} giáo viên`, "err")
        } else { notify("Gửi thông báo hàng loạt thất bại", "err") }
      } else { notify("Lỗi kết nối", "err") }
    } catch { notify("Lỗi gửi thông báo", "err") }
    finally { setANotifyingAll(false) }
  }

  const deleteAssignment = async (id: string, teacherName: string) => {
    if (!canDelete) return
    try {
      const res = await fetch(`/api/preschool-input-assessment-assignments?id=${id}`, { method: "DELETE" })
      if (res.ok) { 
        notify(`Đã hủy phân công cho GV ${teacherName}`)
        fetchAssignments() 
      } else { 
        notify("Lỗi khi hủy phân công", "err") 
      }
    } catch { notify("Lỗi hệ thống", "err") }
  }

  const updateDelegation = async (assignmentId: string, delegatedUserId: string) => {
    if (!canUpdate) return
    try {
      const res = await fetch("/api/preschool-input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_DELEGATION", assignmentId, delegatedUserId: delegatedUserId || null })
      })
      if (res.ok) {
        notify("Cập nhật ủy quyền thành công!")
        fetchAssignments()
      } else {
        notify("Lỗi khi cập nhật ủy quyền", "err")
      }
    } catch {
      notify("Có lỗi xảy ra", "err")
    }
  }

  const toggleGradeSelection = (g: string) => {
    if (aGrades.includes(g)) {
      setAGrades([])
      setUiForm("")
      notify(`Đã bỏ chọn Khối ${g}`)
    } else {
      setAGrades([g])
      notify(`Đã chọn Khối ${g}`)
    }
  }

  const toggleStageSelection = (stage: "STAGE_1" | "STAGE_2") => {
    if (uiStage === stage) {
      setUiStage("")
      notify("Đã bỏ chọn Giai đoạn")
    } else {
      setUiStage(stage)
      notify(`Đã chọn ${stage === "STAGE_1" ? "Giai đoạn 1" : "Giai đoạn 2"}`)
    }
  }

  const totalPreschoolChildren = useMemo(() => {
    return Object.values(studentStats).reduce((a, b) => a + b, 0)
  }, [studentStats])

  return (
    <div className="space-y-5 font-sans max-w-[1440px] mx-auto pb-16">
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirm && <ConfirmDialog open={true} onClose={() => setConfirm(null)} onConfirm={confirm.fn} message={confirm.msg} />}

      {/* ─── TOP CONTEXT CARD: CẤU HÌNH KỲ, ĐỢT, GIAI ĐOẠN & THỐNG KÊ NHÓM TUỔI MẦM NON ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-[#003B3A]/5 via-[#00736E]/5 to-transparent border-b border-slate-200/70 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00736E] text-white flex items-center justify-center shadow-2xs">
              <Baby className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-[#003B3A]">Ngữ cảnh Kỳ Khảo sát & Thống kê Nhóm tuổi Mầm non</h2>
              {aPeriodId && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00A19A]/15 text-[#005854] border border-[#00A19A]/25">
                  Tổng: {totalPreschoolChildren} trẻ
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={fetchPeriods} 
              disabled={pLoading}
              title="Làm mới dữ liệu"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#005854] bg-teal-50/70 hover:bg-teal-100/80 border border-teal-200/70 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00736E] ${pLoading ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* 3 cột: Kỳ khảo sát | Đợt khảo sát | Giai đoạn đánh giá */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-4">
              <Field label="Kỳ Khảo sát Mầm non" required>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#00736E]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <select 
                    value={aPeriodId} 
                    onChange={e => {
                      setAPeriodId(e.target.value)
                      setAGrades([])
                      setUiForm("")
                    }} 
                    className={`${inp} pl-10`}
                  >
                    <option value="">-- Chọn kỳ khảo sát --</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                  </select>
                </div>
              </Field>
            </div>

            <div className="md:col-span-5">
              <Field label="Đợt Khảo sát" tooltip="Hệ thống tự động kích hoạt đợt khảo sát mới nhất của kỳ">
                {!aPeriodId ? (
                  <div className="h-[42px] px-3.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs font-medium text-slate-400 flex items-center">
                    Vui lòng chọn Kỳ khảo sát trước
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="min-h-[42px] px-3.5 py-2 bg-gradient-to-r from-teal-50/80 via-emerald-50/30 to-white border border-teal-200/80 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Sparkles className="w-4 h-4 text-[#00736E] flex-shrink-0" />
                        <span className="font-bold text-xs text-[#003B3A] truncate">
                          {aBatchId && aBatchId !== "all" 
                            ? (aSelPeriod?.batches?.find((b: any) => b.id === aBatchId)?.name || "Đợt khảo sát")
                            : (aBatchId === "all" ? "Tất cả các đợt" : "Áp dụng Toàn kỳ / Khảo sát lẻ")}
                        </span>
                        {aLatestBatch && aBatchId === aLatestBatch.id && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#00736E] text-white flex-shrink-0">
                            Mới nhất
                          </span>
                        )}
                      </div>
                      {aSelPeriod?.batches && aSelPeriod.batches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setShowCustomBatch(!showCustomBatch)}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#005854] bg-white hover:bg-teal-50 border border-teal-200 rounded-lg cursor-pointer flex-shrink-0"
                        >
                          {showCustomBatch ? "Đóng" : "Đổi đợt"}
                        </button>
                      )}
                    </div>

                    {showCustomBatch && aSelPeriod?.batches && aSelPeriod.batches.length > 0 && (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 shadow-2xs animate-in fade-in duration-200">
                        <select
                          value={aBatchId}
                          onChange={e => {
                            setABatchId(e.target.value)
                            setAGrades([])
                            setUiForm("")
                          }}
                          className={`${inp} text-xs py-2`}
                        >
                          <option value="">-- Áp dụng toàn kỳ --</option>
                          <option value="all">Tất cả các đợt</option>
                          {aSelPeriod.batches.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.name} {b.id === aLatestBatch?.id ? "(Mới nhất)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </Field>
            </div>

            <div className="md:col-span-3">
              <Field label="Giai đoạn Đánh giá" tooltip="Lựa chọn giai đoạn thời gian để ánh xạ các mẫu phiếu khảo sát phù hợp">
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "STAGE_1", name: "Giai đoạn 1" },
                    { id: "STAGE_2", name: "Giai đoạn 2" }
                  ].map(s => {
                    const isSel = uiStage === s.id;
                    return (
                      <button
                        type="button"
                        key={s.id} 
                        onClick={() => toggleStageSelection(s.id as any)}
                        className={`h-[42px] flex items-center justify-center gap-2 px-3 rounded-xl border cursor-pointer transition-all duration-200 text-xs ${
                          isSel
                            ? "font-bold shadow-2xs border-[#00736E] bg-[#00736E] text-white"
                            : "bg-white border-slate-200/90 text-slate-700 hover:border-teal-300 hover:bg-teal-50/40 font-medium"
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${isSel ? "border-white bg-white text-[#00736E]" : "border-slate-300"}`}>
                          {isSel && <Check className="w-2.5 h-2.5" />}
                        </div>
                        <span className="truncate">{s.name}</span>
                      </button>
                    )
                  })}
                </div>
              </Field>
            </div>
          </div>

          {/* Thống kê Nhóm tuổi Mầm non */}
          {aPeriodId && (
            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#003B3A]">
                  <Users className="w-4 h-4 text-[#00736E]" />
                  <span>Thống kê Trẻ theo Nhóm tuổi (Bấm vào thẻ nhóm tuổi để tự động chọn Khối & Mẫu phiếu)</span>
                </div>
                {statsLoading && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#00736E]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải...
                  </span>
                )}
              </div>

              {Object.keys(studentStats).length === 0 ? (
                <p className="text-xs text-slate-400 font-normal text-center py-3 bg-white rounded-xl border border-dashed border-slate-200">
                  {statsLoading ? "Đang cập nhật dữ liệu trẻ..." : "Không tìm thấy danh sách trẻ trong đợt này"}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {Object.entries(studentStats).map(([grade, count]) => {
                      const isStandard = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi", "12 đến 24 tháng", "18 đến 36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"].includes(grade);
                      const isActive = isStatsGroupSelected(grade);
                      const total = totalPreschoolChildren || 1;
                      const pct = Math.round((count / total) * 100);

                      return (
                        <div
                          key={grade}
                          onClick={() => isStandard && selectGradeFromStats(grade)}
                          className={`flex flex-col justify-between p-3 rounded-xl border transition-all select-none ${
                            !isStandard 
                              ? "bg-slate-50 border-slate-200/50 text-slate-400 cursor-not-allowed" 
                              : isActive 
                                ? "bg-[#003B3A] border-[#003B3A] text-white shadow-sm cursor-pointer" 
                                : "bg-white border-slate-200/80 hover:border-teal-300 hover:bg-teal-50/40 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs font-bold leading-tight truncate ${isActive ? "text-white" : "text-slate-700"}`}>
                              {grade}
                            </span>
                            {isActive && isStandard && (
                              <div className="w-4 h-4 rounded-full bg-[#00A19A] flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-baseline gap-1.5">
                              <span className={`text-lg font-black leading-none ${isActive ? "text-white" : "text-[#003B3A]"}`}>
                                {count}
                              </span>
                              <span className={`text-[11px] font-medium ${isActive ? "text-teal-200" : "text-slate-400"}`}>
                                trẻ ({pct}%)
                              </span>
                            </div>
                            <div className={`w-full h-1 rounded-full overflow-hidden ${isActive ? "bg-white/20" : "bg-slate-100"}`}>
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${isActive ? "bg-[#00A19A]" : "bg-[#00736E]"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {activeGroup && (
                    <div className="mt-2 p-3 bg-white rounded-xl border border-teal-200/80 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                        <span className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#00736E]" />
                          Danh sách trẻ nhóm {activeGroup} ({filteredGroupStudents.length})
                        </span>
                        <button 
                          type="button" 
                          onClick={() => selectGradeFromStats(activeGroup)}
                          className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {filteredGroupStudents.length === 0 ? (
                        <div className="text-xs text-slate-400 font-normal">Không có học sinh trong nhóm này.</div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[130px] overflow-y-auto pr-1 custom-scrollbar">
                          {filteredGroupStudents.map((stud, idx) => (
                            <div key={stud.id || idx} className="bg-slate-50/70 px-2.5 py-1.5 rounded-lg border border-slate-200/60 text-xs text-slate-700 flex flex-col justify-center">
                              <span className="font-semibold truncate" title={stud.fullName}>{stud.fullName}</span>
                              <span className="text-[10px] text-[#00736E] font-mono font-semibold mt-0.5">{stud.studentCode || "—"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN WORKSPACE: BƯỚC 1 (KHỐI & MẪU PHIẾU) & BƯỚC 2 (CHỌN GIÁO VIÊN & LƯU) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column (5/12): Phạm vi & Ánh xạ khảo sát */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-[#003B3A] to-[#005854] px-5 py-3.5 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-[#00A19A] text-white flex items-center justify-center text-xs font-black">1</span>
              <h2 className="font-bold text-white text-sm">Phạm vi Khối & Ánh xạ Mẫu phiếu</h2>
            </div>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between space-y-5">
            {!aPeriodId ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-4">
                <Info className="w-6 h-6 text-slate-300 mb-2" />
                <p className="text-xs font-medium">Vui lòng chọn Kỳ khảo sát để hiển thị phạm vi & ánh xạ</p>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#003B3A] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#00736E]" />
                    <span>Khối tương ứng</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {grades.map(g => {
                      const isChecked = aGrades.includes(g)
                      return (
                        <button 
                          key={g} 
                          type="button"
                          onClick={() => toggleGradeSelection(g)}
                          className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-xs text-left ${
                            isChecked 
                              ? "bg-[#00736E] border-[#00736E] text-white font-bold shadow-xs" 
                              : "bg-white border-slate-200/90 text-slate-700 hover:border-teal-300 hover:bg-teal-50/40 font-medium"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isChecked ? "border-white bg-white text-[#00736E]" : "border-slate-300"}`}>
                            {isChecked && <Check className="w-2.5 h-2.5" />}
                          </div>
                          <span className="truncate">{g}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="p-4 bg-teal-50/30 border border-teal-200/60 rounded-xl space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#005854] flex items-center gap-1">
                      Mẫu Phiếu khảo sát tự động
                      <span className="text-slate-400 hover:text-slate-600 cursor-help" title="Mẫu khảo sát tâm lý tương ứng với Khối và Giai đoạn đánh giá"><HelpCircle className="w-3.5 h-3.5" /></span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#00736E]">
                        <Baby className="w-4 h-4" />
                      </div>
                      <select 
                        value={uiForm} 
                        disabled 
                        className={`${inp} pl-9 bg-white cursor-not-allowed border-teal-200 font-bold text-[#005854]`}>
                        <option value="">Chờ lựa chọn Khối khảo sát...</option>
                        {formOptions.map(f => (
                          <option key={f} value={f}>Mẫu: {f}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                      Mẫu phiếu học thử tự động
                      <span className="text-slate-400 hover:text-slate-600 cursor-help" title="Mẫu phiếu khảo sát học thử tương ứng"><HelpCircle className="w-3.5 h-3.5" /></span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#00736E]">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <select 
                        value={uiProbationForm} 
                        disabled 
                        className={`${inp} pl-9 bg-white cursor-not-allowed border-slate-200 font-semibold text-slate-700`}>
                        <option value="">Chờ lựa chọn Khối khảo sát...</option>
                        <option value="Mẫu phiếu học thử 12_18">Mẫu: Mẫu phiếu học thử 12_18</option>
                        <option value="Mẫu phiếu học thử 18 đến 24 tháng">Mẫu: Mẫu phiếu học thử 18 đến 24 tháng</option>
                        <option value="Mẫu phiếu học thử 24 đến 36">Mẫu: Mẫu phiếu học thử 24 đến 36</option>
                        <option value="Mẫu phiếu 3 đến 4 tuổi">Mẫu: Mẫu phiếu 3 đến 4 tuổi</option>
                        <option value="Mẫu phiếu 4 đến 5 tuổi">Mẫu: Mẫu phiếu 4 đến 5 tuổi</option>
                        <option value="Mẫu phiếu 5 đến 6 tuổi">Mẫu: Mẫu phiếu 5 đến 6 tuổi</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column (7/12): Phân công Giáo viên & Lưu */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-[#005854] to-[#00736E] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-white text-[#003B3A] flex items-center justify-center text-xs font-black">2</span>
              <h2 className="font-bold text-white text-sm">Chọn Giáo viên Phụ trách Mầm non</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-xs text-white font-semibold">
                Đã chọn {aSelectedTeachers.length} Giáo viên
              </span>
              <button 
                type="button"
                onClick={saveAssignments} 
                disabled={aSaving || !canCreate}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-[#003B3A] text-xs font-black rounded-xl bg-white hover:bg-teal-50 active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {aSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00736E]" /> : <CheckCircle2 className="w-3.5 h-3.5 text-[#00A19A]" />}
                <span>Xác nhận & Lưu Phân công</span>
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4 flex-1 flex flex-col">
            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#00736E]">
                    <Users className="w-4 h-4" />
                  </div>
                  <select value={aDeptId} onChange={e => setADeptId(e.target.value)} className={`${inp} pl-9`}>
                    <option value="">-- Chọn Tổ chuyên môn --</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-7 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Tìm tên hoặc mã giáo viên..."
                    value={aSearchTeacher} 
                    onChange={e => setASearchTeacher(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200/90 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#00736E] transition-colors shadow-2xs" 
                  />
                  {aSearchTeacher && (
                    <button type="button" onClick={() => setASearchTeacher("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                
                {filteredTeachers.length > 0 && (
                  <label className="flex items-center gap-1.5 cursor-pointer bg-teal-50/60 border border-teal-200/80 px-3 py-2.5 rounded-xl hover:bg-teal-100/70 transition-colors shrink-0 text-xs font-bold text-[#005854]">
                    <input 
                      type="checkbox" 
                      checked={isAllFilteredSelected} 
                      onChange={toggleSelectAll} 
                      className="w-3.5 h-3.5 rounded focus:ring-teal-500 cursor-pointer accent-[#00736E]"
                    />
                    <span>Chọn hết ({filteredTeachers.length})</span>
                  </label>
                )}
              </div>
            </div>

            {/* Grid of Teachers */}
            <div className="max-h-[300px] overflow-y-auto pr-1 border border-slate-200/70 p-3 rounded-xl bg-slate-50/40 custom-scrollbar flex-1">
              {!aDeptId && !aSearchTeacher.trim() ? (
                <div className="text-center py-10 text-xs text-slate-400 flex flex-col items-center justify-center gap-2 h-full">
                  <div className="w-11 h-11 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center text-[#00736E]">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-600">Chọn Tổ chuyên môn hoặc gõ tìm kiếm tên Giáo viên</span>
                  <span className="text-[11px] text-slate-400">Danh sách giáo viên sẽ xuất hiện tại đây để bạn tích chọn nhiều người cùng lúc</span>
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-normal">Không tìm thấy giáo viên phù hợp</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {filteredTeachers.map(t => {
                    const userId = t.user.id
                    const isChecked = aSelectedTeachers.includes(userId)
                    const teacherAssigns = assignments.filter(a => a.userId === userId)
                    const initials = getInitials(t.teacherName)

                    return (
                      <div 
                        key={t.id} 
                        onClick={() => toggleTeacher(userId)}
                        className={`flex flex-col p-3 rounded-xl cursor-pointer border transition-all ${
                          isChecked 
                            ? "border-[#00736E] bg-teal-50/60 shadow-2xs" 
                            : "bg-white border-slate-200/80 hover:border-teal-300 hover:bg-teal-50/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                              isChecked ? "bg-[#00736E] text-white" : "bg-teal-50 text-[#005854]"
                            }`}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate" title={t.teacherName}>{t.teacherName}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{t.teacherCode}</div>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-1.5 ${
                            isChecked ? "border-[#00736E] bg-[#00736E] text-white" : "border-slate-300"
                          }`}>
                            {isChecked && <Check className="w-2.5 h-2.5" />}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                          {t.departmentRel?.name && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded truncate max-w-[110px]" title={t.departmentRel.name}>
                              {t.departmentRel.name}
                            </span>
                          )}
                          
                          {teacherAssigns.length > 0 && (
                            <span className="text-[10px] font-bold text-[#005854] bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200/70">
                              {teacherAssigns.length} phân công
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── BẢNG TỔNG HỢP DANH SÁCH ĐÃ PHÂN CÔNG MẦM NON ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200/70 bg-gradient-to-r from-[#003B3A]/5 via-[#00736E]/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00736E] text-white flex items-center justify-center shadow-2xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#003B3A]">
                  Danh sách Phân công Mầm non Hiện tại
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00A19A]/15 text-[#005854] border border-[#00A19A]/25">
                  {assignments.length} bản ghi
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">Quản lý giáo viên phụ trách khảo sát mầm non, ủy quyền giáo vụ và gửi thông báo</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={sendAllNotifications} 
            disabled={aNotifyingAll || assignments.length === 0 || !canUpdate || !aPeriodId}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl text-white bg-[#00736E] hover:bg-[#005854] active:scale-[0.99] transition-all shadow-2xs disabled:opacity-40 cursor-pointer"
          >
            {aNotifyingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            <span>Gửi thông báo tất cả</span>
          </button>
        </div>

        {assignLoading ? (
          <Spin />
        ) : assignments.length === 0 ? (
          <Empty
            text="Chưa có giáo viên nào được phân công"
            sub={!aPeriodId ? "Hãy chọn Kỳ khảo sát ở cấu hình trên để bắt đầu" : "Chọn nhóm tuổi, chọn giáo viên và bấm Lưu phân công để tạo cấu hình mới"}
          />
        ) : (
          <div className="overflow-x-auto animate-in fade-in duration-300">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#003B3A]/[0.03] border-b border-slate-200/80 text-[#003B3A]">
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider w-12 text-center">#</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Giáo viên phụ trách</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Khối / Nhóm tuổi</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Đợt khảo sát</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Ủy quyền Giáo vụ CS</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Ngày giao</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((assign: any, idx: number) => {
                  const t = teachers.find(teach => teach.user?.id === assign.userId)
                  const tName = t?.teacherName || assign.user?.fullName || "Chưa rõ danh tính"
                  const tCode = t?.teacherCode || "GV000"
                  const tEmail = t?.email || assign.user?.email || "—"
                  const isNotifying = aNotifyingId === assign.id
                  const initials = getInitials(tName)

                  return (
                    <tr key={assign.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="px-4 py-2.5 text-slate-400 text-center font-semibold">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold bg-teal-50 border border-teal-200/70 text-[#005854] shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{tName}</div>
                            <div className="text-[11px] text-slate-400 font-normal">{tCode} • {tEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-teal-50 text-[#005854] border border-teal-200/70">
                          {assign.grade}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {assign.batch ? (
                          <span className="text-[10px] font-semibold uppercase text-slate-700 bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-md max-w-[160px] truncate inline-block" title={assign.batch.name}>
                            {assign.batch.name?.split(" | ")[0]}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-normal italic">Tất cả đợt</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={assign.delegatedUserId || ""}
                          onChange={(e) => updateDelegation(assign.id, e.target.value)}
                          disabled={!canUpdate}
                          className="block w-full min-w-[140px] rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[#00736E] transition-colors shadow-2xs disabled:opacity-50"
                        >
                          <option value="">-- Giáo vụ CS --</option>
                          {giaoVuCSUsers.map((user) => (
                            <option key={user.id} value={user.id}>{user.fullName}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="text-xs text-slate-500 font-normal">
                          {assign.createdAt ? new Date(assign.createdAt).toLocaleDateString("vi-VN", {
                            year: "numeric", month: "2-digit", day: "2-digit"
                          }) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => sendTeacherNotification(assign.id, tName)}
                            disabled={isNotifying || !canUpdate}
                            title="Gửi email thông báo phân công"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            {isNotifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirm({ msg: `Bạn có chắc chắn muốn hủy phân công khảo sát của giáo viên ${tName}?`, fn: () => deleteAssignment(assign.id, tName) })}
                            disabled={!canDelete}
                            title="Hủy phân công"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
