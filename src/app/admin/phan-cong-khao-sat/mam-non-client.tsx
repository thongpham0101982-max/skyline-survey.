"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  UserCheck, Baby, Settings, Search, Trash2,
  Mail, Loader2, Filter, Calendar, CheckCircle2, Layers,
  AlertCircle, X, RefreshCw, Users, Info, PlusCircle, Check, HelpCircle, Sparkles
} from "lucide-react"

// ─── Helpers ───

const groupThemes: Record<string, { bg: string; hoverBg: string; border: string; borderActive: string; text: string; countColor: string; accent: string; iconBg: string }> = {
  "12 đến 18 tháng": { bg: "bg-orange-50/40", hoverBg: "hover:bg-orange-50/70", border: "border-orange-100", borderActive: "border-orange-500 ring-2 ring-orange-500/20", text: "text-orange-950", countColor: "text-orange-600", accent: "bg-orange-500", iconBg: "bg-orange-100/70" },
  "18 đến 24 tháng": { bg: "bg-rose-50/40", hoverBg: "hover:bg-rose-50/70", border: "border-rose-100", borderActive: "border-rose-500 ring-2 ring-rose-500/20", text: "text-rose-955", countColor: "text-rose-600", accent: "bg-rose-500", iconBg: "bg-rose-100/70" },
  "24 đến 36 tháng": { bg: "bg-indigo-50/40", hoverBg: "hover:bg-indigo-50/70", border: "border-indigo-100", borderActive: "border-indigo-500 ring-2 ring-indigo-500/20", text: "text-indigo-950", countColor: "text-indigo-600", accent: "bg-indigo-500", iconBg: "bg-indigo-100/70" },
  "3 đến 4 tuổi": { bg: "bg-emerald-50/40", hoverBg: "hover:bg-emerald-50/70", border: "border-emerald-100", borderActive: "border-emerald-500 ring-2 ring-emerald-500/20", text: "text-emerald-950", countColor: "text-emerald-600", accent: "bg-emerald-500", iconBg: "bg-emerald-100/70" },
  "4 đến 5 tuổi": { bg: "bg-violet-50/40", hoverBg: "hover:bg-violet-50/70", border: "border-violet-100", borderActive: "border-violet-500 ring-2 ring-violet-500/20", text: "text-violet-955", countColor: "text-violet-600", accent: "bg-violet-500", iconBg: "bg-violet-100/70" },
  "5 đến 6 tuổi": { bg: "bg-amber-50/40", hoverBg: "hover:bg-amber-50/70", border: "border-amber-100", borderActive: "border-amber-500 ring-2 ring-amber-500/20", text: "text-amber-955", countColor: "text-amber-600", accent: "bg-amber-500", iconBg: "bg-amber-100/70" },
  "Mẫu giáo bé": { bg: "bg-emerald-50/40", hoverBg: "hover:bg-emerald-50/70", border: "border-emerald-100", borderActive: "border-emerald-500 ring-2 ring-emerald-500/20", text: "text-emerald-950", countColor: "text-emerald-600", accent: "bg-emerald-500", iconBg: "bg-emerald-100/70" },
  "Mẫu giáo nhỡ": { bg: "bg-violet-50/40", hoverBg: "hover:bg-violet-50/70", border: "border-violet-100", borderActive: "border-violet-500 ring-2 ring-violet-500/20", text: "text-violet-955", countColor: "text-violet-600", accent: "bg-violet-500", iconBg: "bg-violet-100/70" },
  "Mẫu giáo lớn": { bg: "bg-amber-50/40", hoverBg: "hover:bg-amber-50/70", border: "border-amber-100", borderActive: "border-amber-500 ring-2 ring-amber-500/20", text: "text-amber-955", countColor: "text-amber-600", accent: "bg-amber-500", iconBg: "bg-amber-100/70" },
};
const defaultTheme = { bg: "bg-slate-50/60", hoverBg: "hover:bg-slate-50/90", border: "border-slate-100", borderActive: "border-slate-400 ring-2 ring-slate-400/20", text: "text-slate-900", countColor: "text-slate-600", accent: "bg-slate-500", iconBg: "bg-slate-200/70" };

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div className={`fixed top-5 right-5 z-[400] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold animate-in slide-in-from-top-3 duration-300 ${type === "ok" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
      {type === "ok" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      {msg}
    </div>
  )
}

function Spin() {
  return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-teal-500 animate-spin opacity-50" /></div>
}

function Empty({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
      <div className="w-16 h-16 flex items-center justify-center mb-4 rounded-full bg-slate-100 text-slate-400">
        <UserCheck className="w-8 h-8" />
      </div>
      <p className="font-bold text-slate-700 text-sm">{text}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function Field({ label, required, children, tooltip }: { label: string; required?: boolean; children: React.ReactNode; tooltip?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-xs font-bold text-slate-700 ml-1">
        {label}
        {required && <span className="text-rose-500">*</span>}
        {tooltip && (
          <span className="text-slate-400 hover:text-slate-650 cursor-help" title={tooltip}>
            <HelpCircle className="w-3.5 h-3.5" />
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

const inp = "w-full bg-white border border-slate-200 rounded-xl pl-4 pr-4 py-3 text-sm font-semibold text-slate-700 outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cpath%20stroke%3D%27%2394a3b8%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%271.5%27%20d%3D%27m6%208%204%204%204-4%27%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:18px_18px] pr-10 focus:ring-4 focus:ring-teal-50 focus:border-[#00A99D] hover:border-slate-350 hover:shadow-xs transition-all placeholder:text-slate-400 shadow-sm"
const TEAL = "#00A99D"

interface ConfirmState { msg: string; fn: () => void }
function ConfirmDialog({ open, onClose, onConfirm, message }: { open:boolean; onClose:()=>void; onConfirm:()=>void; message:string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose}/>
      <div className="relative bg-white rounded-[28px] border border-slate-100 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.15)] p-7 max-w-[360px] w-full text-center animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"><X className="w-4 h-4" /></button>
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border-4 border-rose-100/40 text-rose-500 flex items-center justify-center mx-auto mb-5 shadow-sm"><Trash2 className="w-6 h-6" /></div>
        <h3 className="text-base font-black text-slate-800 tracking-tight mb-2">Xác nhận xóa</h3>
        <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6 px-1">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer active:scale-[0.97]">Hủy</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md shadow-rose-500/10 hover:brightness-105 active:scale-[0.97] transition-all cursor-pointer" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>Xóa</button>
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

  // ─── Assignment State (All Default Empty/Blank) ───
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

  // ─── Computed ───
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
    "5 đến 6 tuổi",
    "Mẫu phiếu học thử"
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
    if (norm === "3 đến 4 tuổi") {
      return aGrades.includes("Mẫu giáo bé");
    }
    if (norm === "4 đến 5 tuổi") {
      return aGrades.includes("Mẫu giáo nhỡ");
    }
    if (norm === "5 đến 6 tuổi") {
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
        const counts = {}
        students.forEach((s) => {
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

  // ─── Toggle Teacher in Selection List (Fix Multi-select Bug) ───
  const toggleTeacher = (userId: string) => {
    setASelectedTeachers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  // Memoized Filtered Teacher List
  const filteredTeachers = useMemo(() => {
    if (!aDeptId) return [] // Mặc định trống khi chưa chọn Tổ chuyên môn
    return teachers
      .filter(t => t.user)
      .filter(t => t.departmentId === aDeptId)
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
        notify("Lưu phân công giáo viên thành công!")
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

  return (
    <div className="space-y-6 font-sans max-w-[1440px] mx-auto pb-16">
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirm && <ConfirmDialog open={true} onClose={() => setConfirm(null)} onConfirm={confirm.fn} message={confirm.msg} />}

      {/* Header card with teal styled accents */}
      <div className="bg-white border-t-4 border-[#00A99D] shadow-sm rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[#00A99D] shadow-md shadow-teal-100">
            <Baby className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              Phân công Mầm non
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-50 text-[#00A99D] border border-teal-100/50">Preschool</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Giao nhiệm vụ phụ trách khảo sát cho giáo viên mầm non</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button 
            onClick={fetchPeriods} 
            disabled={pLoading}
            title="Làm mới dữ liệu"
            className="p-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200/60 rounded-xl transition-all duration-200 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${pLoading ? "animate-spin text-teal-600" : ""}`} />
          </button>
          
          <button 
            onClick={sendAllNotifications} 
            disabled={aNotifyingAll || assignments.length === 0 || !canUpdate || !aPeriodId}
            className="flex items-center gap-2 px-5 py-3 text-xs font-black rounded-xl text-white shadow-md shadow-fuchsia-100 disabled:opacity-40 transition-all active:scale-95 duration-200"
            style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>
            {aNotifyingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Gửi thông báo tất cả
          </button>
        </div>
      </div>

      {/* Guidance Alert Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-100/60 rounded-2xl p-5 flex gap-4 text-amber-850 shadow-xs">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1.5">
          <p className="font-extrabold text-amber-900 text-sm">Hướng dẫn phân công nhanh:</p>
          <ol className="list-decimal list-inside space-y-1 text-amber-800 font-semibold leading-relaxed">
            <li>Chọn <strong className="text-amber-950 font-black">Kỳ khảo sát</strong> và <strong className="text-amber-950 font-black">Đợt khảo sát</strong> ở mục Cấu hình phân công.</li>
            <li>Chọn nhanh <strong className="text-amber-950 font-black">Nhóm tuổi</strong> trong bảng Thống kê (Khối học và Phiếu khảo sát sẽ được tự động ánh xạ tương ứng).</li>
            <li>Tích chọn một hoặc nhiều <strong className="text-amber-950 font-black">Giáo viên</strong> ở danh sách bên phải.</li>
            <li>Nhấn <strong className="text-[#00A99D] font-black">Lưu Phân công Giáo viên</strong> để hoàn thành.</li>
          </ol>
        </div>
      </div>

      {/* Main Grid: Row-Based Layout */}
      <div className="space-y-6">
        {/* Row 1: Cấu hình chung */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5 transition-all">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-slate-100">
            <Settings className="w-4 h-4 text-[#00A99D]" /> Cấu hình Phân công
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Field label="Kỳ Khảo sát" required>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <select 
                  value={aPeriodId} 
                  onChange={e => {
                    setAPeriodId(e.target.value)
                    setABatchId("")
                    setAGrades([])
                    setUiForm("")
                  }} 
                  className={`${inp} pl-10`}>
                  <option value="">-- Chọn kỳ khảo sát --</option>
                  {periods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
              </div>
            </Field>

            <Field label="Đợt Khảo sát" tooltip="Lọc theo đợt cụ thể để thống kê chính xác số lượng học sinh">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Filter className="w-4 h-4" />
                </div>
                <select 
                  value={aBatchId} 
                  disabled={!aPeriodId}
                  onChange={e => {
                    setABatchId(e.target.value)
                    setAGrades([])
                    setUiForm("")
                  }} 
                  className={`${inp} pl-10 disabled:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed`}>
                  <option value="">-- Chọn đợt khảo sát --</option>
                  <option value="all">Tất cả các đợt</option>
                  {aPeriodId && periods.find(p => p.id === aPeriodId)?.batches?.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label="Giai đoạn Đánh giá" tooltip="Lựa chọn giai đoạn thời gian để ánh xạ các mẫu phiếu khảo sát phù hợp">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "STAGE_1", name: "Giai đoạn 1" },
                  { id: "STAGE_2", name: "Giai đoạn 2" }
                ].map(s => {
                  const isSel = uiStage === s.id;
                  return (
                    <div 
                      key={s.id} 
                      onClick={() => toggleStageSelection(s.id as any)}
                      className={`flex items-center justify-center gap-2.5 px-3 py-3 rounded-xl border cursor-pointer transition-all duration-200 text-xs ${isSel ? "font-extrabold shadow-sm border-[#00A99D] bg-teal-50/30 text-[#00A99D]" : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50"}`}>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSel ? "border-[#00A99D]" : "border-slate-300"}`}>
                        {isSel && <div className="w-2.5 h-2.5 rounded-full bg-[#00A99D]" />}
                      </div>
                      <span className="truncate">{s.name}</span>
                    </div>
                  )
                })}
              </div>
            </Field>
          </div>
        </div>

        {/* Row 2: Thống kê Nhóm tuổi */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6 transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00A99D]" /> Thống kê Nhóm tuổi
            </h3>
            <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-teal-100/50 shadow-sm shadow-teal-50">
              Tổng: {Object.values(studentStats).reduce((a, b) => a + b, 0)} trẻ
            </span>
          </div>

          {!aPeriodId ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
              <Info className="w-5 h-5 text-slate-350 mb-2" />
              <p className="text-xs font-bold">Hãy chọn Kỳ khảo sát để hiển thị thống kê nhóm tuổi</p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              {statsLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs font-bold text-[#00A99D]">
                  <Loader2 className="w-4.5 h-4.5 animate-spin" /> Đang cập nhật dữ liệu trẻ...
                </div>
              ) : Object.keys(studentStats).length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold text-center py-4 bg-slate-50 rounded-2xl">Không tìm thấy danh sách trẻ trong kỳ này</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    {Object.entries(studentStats).map(([grade, count]) => {
                      const theme = groupThemes[grade] || defaultTheme;
                      const isStandard = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi", "12 đến 24 tháng", "18 đến 36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"].includes(grade);
                      const isActive = isStatsGroupSelected(grade);
                      const total = Object.values(studentStats).reduce((a, b) => a + b, 0) || 1;
                      const pct = Math.round((count / total) * 100);

                      return (
                        <div
                          key={grade}
                          onClick={() => isStandard && selectGradeFromStats(grade)}
                          className={`flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-300 relative overflow-hidden select-none ${
                            !isStandard 
                              ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed" 
                              : isActive 
                                ? `${theme.bg} ${theme.borderActive} shadow-md shadow-slate-100 cursor-pointer scale-[1.02]` 
                                : `bg-white ${theme.border} ${theme.hoverBg} hover:shadow-xs cursor-pointer hover:border-slate-300`
                          }`}
                        >
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${!isStandard ? "bg-slate-300" : theme.accent}`} />
                          
                          <div className="flex items-center justify-between mb-3 pl-2">
                            <span className={`text-xs font-extrabold ${!isStandard ? "text-slate-400" : theme.text} leading-tight truncate`}>
                              {grade}
                            </span>
                            {isActive && isStandard && (
                              <div className="w-4 h-4 rounded-full bg-[#00A99D] flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 text-white stroke-[3.5px]" />
                              </div>
                            )}
                          </div>

                          <div className="pl-2 space-y-2">
                            <div className="flex items-baseline gap-1.5">
                              <span className={`text-2xl font-black leading-none ${!isStandard ? "text-slate-400" : "text-slate-800"}`}>
                                {count}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                trẻ ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${!isStandard ? "bg-slate-300" : theme.accent}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {activeGroup && (
                    <div className="mt-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#00A99D]" />
                          Danh sách trẻ nhóm {activeGroup} ({filteredGroupStudents.length})
                        </span>
                        <button 
                          type="button" 
                          onClick={() => selectGradeFromStats(activeGroup)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {filteredGroupStudents.length === 0 ? (
                        <div className="text-[11px] text-slate-400 italic">Không có học sinh trong nhóm này.</div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                          {filteredGroupStudents.map((stud, idx) => (
                            <div key={stud.id || idx} className="bg-white px-3 py-2 rounded-xl border border-slate-150 text-[11px] font-bold text-slate-750 flex flex-col justify-center shadow-2xs hover:shadow-sm transition-all hover:border-slate-300">
                              <span className="text-slate-800 truncate" title={stud.fullName}>{stud.fullName}</span>
                              <span className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5">{stud.studentCode || "—"}</span>
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

        {/* Row 3: Phạm vi & Ánh xạ khảo sát */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5 transition-all">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-slate-100">
            <Layers className="w-4 h-4 text-[#00A99D]" /> Phạm vi & Ánh xạ khảo sát
          </h3>

          {!aPeriodId ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
              <Info className="w-5 h-5 text-slate-350 mb-2" />
              <p className="text-xs font-bold">Hãy chọn Kỳ khảo sát để hiển thị phạm vi & ánh xạ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
              <div className="lg:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 ml-1 flex items-center gap-1">
                  Khối tương ứng <span className="text-rose-500">*</span>
                  <span className="text-slate-400 hover:text-slate-655 cursor-help" title="Tự động lọc khối trong hệ thống dựa trên nhóm tuổi đã chọn"><HelpCircle className="w-3.5 h-3.5" /></span>
                </label>
                <div className="flex flex-wrap gap-2.5 mt-1">
                  {grades.map(g => {
                    const isChecked = aGrades.includes(g)
                    return (
                      <div 
                        key={g} 
                        onClick={() => toggleGradeSelection(g)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border cursor-pointer transition-all text-xs ${isChecked ? "font-extrabold shadow-md border-[#00A99D] bg-teal-50/30 text-[#00A99D] scale-[1.02]" : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50 hover:border-slate-300"}`}>
                        <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 ${isChecked ? "border-[#00A99D] bg-[#00A99D]" : "border-slate-300"}`}>
                          {isChecked && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                        </div>
                        <span>{g}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="lg:col-span-1 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 ml-1 flex items-center gap-1">
                    Mẫu Phiếu khảo sát tự động ánh xạ
                    <span className="text-slate-400 hover:text-slate-655 cursor-help" title="Mẫu khảo sát tâm lý tương ứng với Khối và Giai đoạn đánh giá"><HelpCircle className="w-3.5 h-3.5" /></span>
                  </label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Baby className="w-4 h-4" />
                    </div>
                    <select 
                      value={uiForm} 
                      disabled 
                      className={`${inp} pl-10 opacity-80 bg-slate-50 cursor-not-allowed border-slate-200/80 font-bold text-[#00A99D]`}>
                      <option value="">Chờ lựa chọn cấu hình...</option>
                      {formOptions.map(f => (
                        <option key={f} value={f}>Mẫu: {f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 ml-1 flex items-center gap-1">
                    Mẫu phiếu học thử tự động ánh xạ
                    <span className="text-slate-400 hover:text-slate-655 cursor-help" title="Mẫu phiếu khảo sát học thử tương ứng"><HelpCircle className="w-3.5 h-3.5" /></span>
                  </label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <select 
                      value={uiProbationForm} 
                      disabled 
                      className={`${inp} pl-10 opacity-80 bg-slate-50 cursor-not-allowed border-slate-200/80 font-bold text-emerald-600`}>
                      <option value="">Chờ lựa chọn cấu hình...</option>
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
            </div>
          )}
        </div>

        {/* Row 4: Phân công Giáo viên & Lưu */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#00A99D]" /> Phân công Giáo viên
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] px-3 py-1.5 rounded-full font-black bg-teal-50 text-[#00A99D] border border-teal-100/50">
                Đã chọn {aSelectedTeachers.length} Giáo viên
              </span>
              <button 
                onClick={saveAssignments} 
                disabled={aSaving || !canCreate}
                className="px-6 py-2.5 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-teal-50 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: TEAL }}>
                {aSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Xác nhận & Lưu Phân công
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Users className="w-4 h-4" />
                </div>
                <select value={aDeptId} onChange={e => setADeptId(e.target.value)} className={`${inp} pl-10 py-2.5`}>
                  <option value="">-- Lọc theo Tổ chuyên môn --</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            <div className="md:col-span-3 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Tìm tên hoặc mã giáo viên..."
                  value={aSearchTeacher} 
                  onChange={e => setASearchTeacher(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#00A99D] focus:ring-4 focus:ring-teal-50 transition-all shadow-xs" 
                />
                {aSearchTeacher && (
                  <button onClick={() => setASearchTeacher("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              
              <label className="flex items-center justify-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors shrink-0 w-full sm:w-auto">
                <input 
                  type="checkbox" 
                  checked={isAllFilteredSelected} 
                  onChange={toggleSelectAll} 
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-600">Chọn tất cả hiện thị ({filteredTeachers.length})</span>
              </label>
            </div>
          </div>

          {/* Grid of Teachers */}
          <div className="max-h-[420px] overflow-y-auto pr-1 border border-slate-100 p-4 rounded-2xl bg-slate-50/40 scrollbar-thin">
            {!aDeptId ? (
              <div className="text-center py-12 text-xs font-bold text-slate-400 flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-slate-300" />
                </div>
                <span>Vui lòng chọn Tổ chuyên môn để hiển thị danh sách giáo viên</span>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-10 text-xs font-bold text-slate-400">Không tìm thấy giáo viên phù hợp</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {filteredTeachers.map(t => {
                  const userId = t.user.id
                  const isChecked = aSelectedTeachers.includes(userId)
                  const teacherAssigns = assignments.filter(a => a.userId === userId)
                  const initials = getInitials(t.teacherName)

                  return (
                    <div 
                      key={t.id} 
                      onClick={() => toggleTeacher(userId)}
                      className={`flex flex-col p-4 rounded-xl cursor-pointer border transition-all duration-200 ${isChecked ? "border-[#00A99D] shadow-md bg-teal-50/20 scale-[1.02]" : "bg-white border-slate-200/80 hover:border-slate-350 hover:shadow-sm"}`}>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-extrabold text-[12px] ${isChecked ? "bg-[#00A99D] text-white shadow-sm" : "bg-slate-100 text-slate-500"}`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-extrabold text-slate-800 truncate" title={t.teacherName}>{t.teacherName}</div>
                            <div className="text-[10px] text-slate-450 font-semibold uppercase mt-0.5 truncate">{t.teacherCode}</div>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-2 ${isChecked ? "border-[#00A99D] bg-[#00A99D]" : "border-slate-300"}`}>
                          {isChecked && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100/80">
                        {t.departmentRel?.name && (
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50 truncate max-w-[120px]" title={t.departmentRel.name}>
                            {t.departmentRel.name}
                          </span>
                        )}
                        
                        {teacherAssigns.length > 0 && (
                          <span className="text-[9px] font-black uppercase text-[#00A99D] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100/50">
                            {teacherAssigns.length} Phân công
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

      {/* Bottom section: Assigned Teachers List (Full-Width) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#00A99D]" /> Danh sách Phân công hiện tại ({assignments.length})
          </h3>
          {assignments.length > 0 && (
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Preschool Assignments</span>
          )}
        </div>

        {assignLoading ? (
          <Spin />
        ) : assignments.length === 0 ? (
          <Empty
            text="Chưa có giáo viên nào được phân công"
            sub={!aPeriodId ? "Hãy chọn Kỳ khảo sát ở cấu hình trên để bắt đầu" : "Chọn giáo viên, chọn nhóm tuổi và bấm Lưu phân công để tạo cấu hình mới"}
          />
        ) : (
          <div className="overflow-x-auto animate-in fade-in duration-300">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                  <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giáo viên</th>
                  <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khối / Nhóm</th>
                  <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Đợt</th>
                  <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ủy quyền GV</th>
                  <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày giao</th>
                  <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assign: any, idx: number) => {
                  const t = teachers.find(teach => teach.user?.id === assign.userId)
                  const tName = t?.teacherName || assign.user?.fullName || "Chưa rõ danh tính"
                  const tCode = t?.teacherCode || "GV000"
                  const tEmail = t?.email || assign.user?.email || "—"
                  const isNotifying = aNotifyingId === assign.id
                  const initials = getInitials(tName)

                  return (
                    <tr key={assign.id} className="border-b border-slate-100 hover:bg-teal-50/20 transition-colors group">
                      <td className="px-4 py-2.5 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] text-white shrink-0 shadow-sm" style={{ background: TEAL }}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-black text-slate-700">{tName}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{tCode} • {tEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-teal-50 text-[#00A99D] border border-teal-100/50">
                          {assign.grade}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {assign.batch ? (
                          <span className="text-[10px] font-black uppercase text-fuchsia-600 bg-fuchsia-50/50 border border-fuchsia-200 px-2.5 py-1 rounded-full max-w-[160px] truncate inline-block" title={assign.batch.name}>
                            {assign.batch.name?.split(" | ")[0]}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold italic">Tất cả đợt</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={assign.delegatedUserId || ""}
                          onChange={(e) => updateDelegation(assign.id, e.target.value)}
                          disabled={!canUpdate}
                          className="block w-full min-w-[140px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 outline-none hover:border-[#00A99D]/50 focus:border-[#00A99D] focus:ring-1 focus:ring-teal-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                        >
                          <option value="">-- Chọn Giáo vụ CS --</option>
                          {giaoVuCSUsers.map((user) => (
                            <option key={user.id} value={user.id}>{user.fullName}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {assign.createdAt ? new Date(assign.createdAt).toLocaleDateString("vi-VN", {
                            year: "numeric", month: "2-digit", day: "2-digit"
                          }) : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => sendTeacherNotification(assign.id, tName)}
                            disabled={isNotifying || !canUpdate}
                            title="Gửi email thông báo phân công"
                            className="p-1.5 text-slate-300 hover:text-fuchsia-600 hover:bg-fuchsia-50 rounded-lg transition-all disabled:opacity-30">
                            {isNotifying ? <Loader2 className="w-3.5 h-3.5 animate-spin text-fuchsia-500" /> : <Mail className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setConfirm({ msg: `Bạn có chắc chắn muốn hủy phân công khảo sát của giáo viên ${tName}?`, fn: () => deleteAssignment(assign.id, tName) })}
                            disabled={!canDelete}
                            title="Hủy phân công"
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30">
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
