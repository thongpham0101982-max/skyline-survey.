"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  UserCheck, Baby, Settings, Search, Trash2,
  Mail, Loader2, Filter, Calendar, CheckCircle2, Layers,
  AlertCircle, X, RefreshCw, Users, Info, PlusCircle, Check, HelpCircle
} from "lucide-react"

// â”€â”€â”€ Helpers â”€â”€â”€
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
        <h3 className="text-base font-black text-slate-800 tracking-tight mb-2">XĂ¡c nháº­n xĂ³a</h3>
        <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6 px-1">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer active:scale-[0.97]">Há»§y</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md shadow-rose-500/10 hover:brightness-105 active:scale-[0.97] transition-all cursor-pointer" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>XĂ³a</button>
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

// â”€â”€â”€ Props â”€â”€â”€
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

  // â”€â”€â”€ Year â”€â”€â”€
  const defaultYear = academicYears.find(y => !y.isOff) || academicYears[0]
  const [yearId, setYearId] = useState(defaultYear?.id || "")

  // â”€â”€â”€ Periods â”€â”€â”€
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

  // â”€â”€â”€ Assignment State (All Default Empty/Blank) â”€â”€â”€
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

  // â”€â”€â”€ Computed â”€â”€â”€
  const aActiveBatch = useMemo(() => {
    if (!aPeriodId || !aBatchId || aBatchId === "all") return null
    return periods.find(p => p.id === aPeriodId)?.batches?.find((b: any) => b.id === aBatchId)
  }, [periods, aPeriodId, aBatchId])

  const [uiStage, setUiStage] = useState<"STAGE_1" | "STAGE_2" | "">("")
  const [uiForm, setUiForm] = useState<string>("")

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
    "12 Ä‘áº¿n 18 thĂ¡ng",
    "18 Ä‘áº¿n 24 thĂ¡ng",
    "24 Ä‘áº¿n 36 thĂ¡ng",
    "3 Ä‘áº¿n 4 tuá»•i",
    "4 Ä‘áº¿n 5 tuá»•i",
    "5 Ä‘áº¿n 6 tuá»•i"
  ]

  // Map Selected Grade and Stage to Survey Form
  useEffect(() => {
    const grade = aGrades[0]
    if (grade && uiStage) {
      let targetForm = ""
      if (uiStage === "STAGE_2") {
        if (grade === "NhĂ  tráº» 12-18 thĂ¡ng") targetForm = "12 Ä‘áº¿n 18 thĂ¡ng"
        else if (grade === "NhĂ  tráº» 18-24 thĂ¡ng") targetForm = "18 Ä‘áº¿n 24 thĂ¡ng"
        else if (grade === "NhĂ  tráº» 24-36 thĂ¡ng") targetForm = "24 Ä‘áº¿n 36 thĂ¡ng"
        else if (grade === "Máº«u giĂ¡o bĂ©") targetForm = "3 Ä‘áº¿n 4 tuá»•i"
        else if (grade === "Máº«u giĂ¡o nhá»¡") targetForm = "4 Ä‘áº¿n 5 tuá»•i"
        else if (grade === "Máº«u giĂ¡o lá»›n") targetForm = "5 Ä‘áº¿n 6 tuá»•i"
      } else {
        if (grade === "NhĂ  tráº» 12-18 thĂ¡ng") targetForm = "12 Ä‘áº¿n 18 thĂ¡ng"
        else if (grade === "NhĂ  tráº» 18-24 thĂ¡ng") targetForm = "18 Ä‘áº¿n 24 thĂ¡ng"
        else if (grade === "NhĂ  tráº» 24-36 thĂ¡ng") targetForm = "18 Ä‘áº¿n 24 thĂ¡ng"
        else if (grade === "Máº«u giĂ¡o bĂ©") targetForm = "24 Ä‘áº¿n 36 thĂ¡ng"
        else if (grade === "Máº«u giĂ¡o nhá»¡") targetForm = "3 Ä‘áº¿n 4 tuá»•i"
        else if (grade === "Máº«u giĂ¡o lá»›n") targetForm = "4 Ä‘áº¿n 5 tuá»•i"
      }
      if (targetForm && targetForm !== uiForm) {
        setUiForm(targetForm)
      }
    } else if (!grade) {
      setUiForm("")
    }
  }, [aGrades, uiStage, uiForm])

  // Select Grade / Form mapping from Statistics Panel click
  const selectGradeFromStats = (grade: string) => {
    const normalized = (grade || "").trim()
    if (!normalized) return

    let targetGrade = "";
    let targetForm = "";

    if (normalized === "12 Ä‘áº¿n 18 thĂ¡ng") {
      targetGrade = "NhĂ  tráº» 12-18 thĂ¡ng";
      targetForm = "12 Ä‘áº¿n 18 thĂ¡ng";
    } else if (normalized === "18 Ä‘áº¿n 24 thĂ¡ng") {
      targetGrade = "NhĂ  tráº» 18-24 thĂ¡ng";
      targetForm = "18 Ä‘áº¿n 24 thĂ¡ng";
    } else if (normalized === "24 Ä‘áº¿n 36 thĂ¡ng") {
      targetGrade = "NhĂ  tráº» 24-36 thĂ¡ng";
      targetForm = uiStage === "STAGE_2" ? "24 Ä‘áº¿n 36 thĂ¡ng" : "18 Ä‘áº¿n 24 thĂ¡ng";
    } else if (normalized === "3 Ä‘áº¿n 4 tuá»•i" || normalized === "Máº«u giĂ¡o bĂ©") {
      targetGrade = "Máº«u giĂ¡o bĂ©";
      targetForm = uiStage === "STAGE_2" ? "3 Ä‘áº¿n 4 tuá»•i" : "24 Ä‘áº¿n 36 thĂ¡ng";
    } else if (normalized === "4 Ä‘áº¿n 5 tuá»•i" || normalized === "Máº«u giĂ¡o nhá»¡") {
      targetGrade = "Máº«u giĂ¡o nhá»¡";
      targetForm = uiStage === "STAGE_2" ? "4 Ä‘áº¿n 5 tuá»•i" : "3 Ä‘áº¿n 4 tuá»•i";
    } else if (normalized === "5 Ä‘áº¿n 6 tuá»•i" || normalized === "Máº«u giĂ¡o lá»›n") {
      targetGrade = "Máº«u giĂ¡o lá»›n";
      targetForm = uiStage === "STAGE_2" ? "5 Ä‘áº¿n 6 tuá»•i" : "4 Ä‘áº¿n 5 tuá»•i";
    }

    if (targetGrade) {
      // Toggle selection support
      if (aGrades.includes(targetGrade) && uiForm === targetForm) {
        setAGrades([])
        setUiForm("")
        notify("ÄĂ£ bá» chá»n NhĂ³m tuá»•i")
      } else {
        setAGrades([targetGrade]);
        if (targetForm) setUiForm(targetForm);
        notify(`ÄĂ£ chá»n Khá»‘i: ${targetGrade}`);
      }
    }
  }

  const isStatsGroupSelected = (g: string) => {
    const norm = (g || "").trim();
    if (norm === "12 Ä‘áº¿n 18 thĂ¡ng") {
      return aGrades.includes("NhĂ  tráº» 12-18 thĂ¡ng") && uiForm === "12 Ä‘áº¿n 18 thĂ¡ng";
    }
    if (norm === "18 Ä‘áº¿n 24 thĂ¡ng") {
      return aGrades.includes("NhĂ  tráº» 18-24 thĂ¡ng") && uiForm === "18 Ä‘áº¿n 24 thĂ¡ng";
    }
    if (norm === "24 Ä‘áº¿n 36 thĂ¡ng") {
      return (aGrades.includes("NhĂ  tráº» 24-36 thĂ¡ng") && ((uiStage === "STAGE_1" && uiForm === "18 Ä‘áº¿n 24 thĂ¡ng") || (uiStage === "STAGE_2" && uiForm === "24 Ä‘áº¿n 36 thĂ¡ng"))) || (aGrades.includes("Máº«u giĂ¡o bĂ©") && uiStage === "STAGE_1");
    }
    if (norm === "3 Ä‘áº¿n 4 tuá»•i") {
      return (aGrades.includes("Máº«u giĂ¡o bĂ©") && uiStage === "STAGE_2") || (aGrades.includes("Máº«u giĂ¡o nhá»¡") && uiStage === "STAGE_1");
    }
    if (norm === "4 Ä‘áº¿n 5 tuá»•i") {
      return (aGrades.includes("Máº«u giĂ¡o nhá»¡") && uiStage === "STAGE_2") || (aGrades.includes("Máº«u giĂ¡o lá»›n") && uiStage === "STAGE_1");
    }
    if (norm === "5 Ä‘áº¿n 6 tuá»•i") {
      return aGrades.includes("Máº«u giĂ¡o lá»›n") && uiStage === "STAGE_2";
    }
    return false;
  }

  // â”€â”€â”€ Student stats state â”€â”€â”€
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
          const g = s.grade || "ChÆ°a xĂ¡c Ä‘á»‹nh"
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

  // â”€â”€â”€ Fetch Assignments â”€â”€â”€
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
      notify("Lá»—i khi táº£i danh sĂ¡ch phĂ¢n cĂ´ng", "err")
    } finally { setAssignLoading(false) }
  }, [aPeriodId, aBatchId, aGradesStr])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  // â”€â”€â”€ Toggle Teacher in Selection List (Fix Multi-select Bug) â”€â”€â”€
  const toggleTeacher = (userId: string) => {
    setASelectedTeachers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  // Memoized Filtered Teacher List
  const filteredTeachers = useMemo(() => {
    if (!aDeptId) return [] // Máº·c Ä‘á»‹nh trá»‘ng khi chÆ°a chá»n Tá»• chuyĂªn mĂ´n
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
      notify("ÄĂ£ bá» chá»n giĂ¡o viĂªn Ä‘Ă£ lá»c")
    } else {
      const filteredIds = filteredTeachers.map(t => t.user.id)
      setASelectedTeachers(prev => {
        const newIds = filteredIds.filter(id => !prev.includes(id))
        return [...prev, ...newIds]
      })
      notify("ÄĂ£ chá»n toĂ n bá»™ giĂ¡o viĂªn Ä‘Ă£ lá»c")
    }
  }

  // â”€â”€â”€ Save / Notify / Delete Actions â”€â”€â”€
  const saveAssignments = async () => {
    if (!aPeriodId) return notify("Vui lĂ²ng chá»n Ká»³ kháº£o sĂ¡t", "err")
    if (aGrades.length === 0) return notify("Vui lĂ²ng chá»n NhĂ³m tuá»•i/Khá»‘i há»c cáº§n phĂ¢n cĂ´ng", "err")
    if (aSelectedTeachers.length === 0) return notify("Vui lĂ²ng chá»n Ă­t nháº¥t má»™t GiĂ¡o viĂªn Ä‘á»ƒ phĂ¢n cĂ´ng", "err")
    
    setASaving(true)
    try {
      const res = await fetch("/api/preschool-input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ASSIGN", periodId: aPeriodId, batchId: aBatchId, grade: aGrades, userIds: aSelectedTeachers })
      })
      if (res.ok) { 
        notify("LÆ°u phĂ¢n cĂ´ng giĂ¡o viĂªn thĂ nh cĂ´ng!")
        fetchAssignments() 
      } else {
        notify("Lá»—i khi lÆ°u phĂ¢n cĂ´ng", "err")
      }
    } catch { notify("CĂ³ lá»—i xáº£y ra", "err") }
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
        if (result.success && result.sentCount > 0) { notify(`ÄĂ£ gá»­i email thĂ´ng bĂ¡o cho GV ${teacherName}!`) }
        else { notify(`Lá»—i gá»­i email: ${result.errors?.[0] || "KhĂ´ng gá»­i Ä‘Æ°á»£c email"}`, "err") }
      } else { notify("Lá»—i káº¿t ná»‘i gá»­i thĂ´ng bĂ¡o", "err") }
    } catch { notify("Lá»—i gá»­i thĂ´ng bĂ¡o", "err") }
    finally { setANotifyingId(null) }
  }

  const sendAllNotifications = async () => {
    if (!canUpdate) return
    if (assignments.length === 0) return notify("KhĂ´ng cĂ³ giĂ¡o viĂªn nĂ o Ä‘Æ°á»£c phĂ¢n cĂ´ng Ä‘á»ƒ gá»­i thĂ´ng bĂ¡o", "err")
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
          notify(`ÄĂ£ gá»­i thĂ´ng bĂ¡o thĂ nh cĂ´ng cho ${result.sentCount} giĂ¡o viĂªn!`)
          if (result.failedCount > 0) notify(`Gá»­i tháº¥t báº¡i cho ${result.failedCount} giĂ¡o viĂªn`, "err")
        } else { notify("Gá»­i thĂ´ng bĂ¡o hĂ ng loáº¡t tháº¥t báº¡i", "err") }
      } else { notify("Lá»—i káº¿t ná»‘i", "err") }
    } catch { notify("Lá»—i gá»­i thĂ´ng bĂ¡o", "err") }
    finally { setANotifyingAll(false) }
  }

  const deleteAssignment = async (id: string, teacherName: string) => {
    if (!canDelete) return
    try {
      const res = await fetch(`/api/preschool-input-assessment-assignments?id=${id}`, { method: "DELETE" })
      if (res.ok) { 
        notify(`ÄĂ£ há»§y phĂ¢n cĂ´ng cho GV ${teacherName}`)
        fetchAssignments() 
      } else { 
        notify("Lá»—i khi há»§y phĂ¢n cĂ´ng", "err") 
      }
    } catch { notify("Lá»—i há»‡ thá»‘ng", "err") }
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
        notify("Cáº­p nháº­t á»§y quyá»n thĂ nh cĂ´ng!")
        fetchAssignments()
      } else {
        notify("Lá»—i khi cáº­p nháº­t á»§y quyá»n", "err")
      }
    } catch {
      notify("CĂ³ lá»—i xáº£y ra", "err")
    }
  }

  const toggleGradeSelection = (g: string) => {
    if (aGrades.includes(g)) {
      setAGrades([])
      setUiForm("")
      notify(`ÄĂ£ bá» chá»n Khá»‘i ${g}`)
    } else {
      setAGrades([g])
      notify(`ÄĂ£ chá»n Khá»‘i ${g}`)
    }
  }

  const toggleStageSelection = (stage: "STAGE_1" | "STAGE_2") => {
    if (uiStage === stage) {
      setUiStage("")
      notify("ÄĂ£ bá» chá»n Giai Ä‘oáº¡n")
    } else {
      setUiStage(stage)
      notify(`ÄĂ£ chá»n ${stage === "STAGE_1" ? "Giai Ä‘oáº¡n 1" : "Giai Ä‘oáº¡n 2"}`)
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
              PhĂ¢n cĂ´ng Máº§m non
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-50 text-[#00A99D] border border-teal-100/50">Preschool</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Giao nhiá»‡m vá»¥ phá»¥ trĂ¡ch kháº£o sĂ¡t cho giĂ¡o viĂªn máº§m non</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button 
            onClick={fetchPeriods} 
            disabled={pLoading}
            title="LĂ m má»›i dá»¯ liá»‡u"
            className="p-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200/60 rounded-xl transition-all duration-200 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${pLoading ? "animate-spin text-teal-600" : ""}`} />
          </button>
          
          <button 
            onClick={sendAllNotifications} 
            disabled={aNotifyingAll || assignments.length === 0 || !canUpdate || !aPeriodId}
            className="flex items-center gap-2 px-5 py-3 text-xs font-black rounded-xl text-white shadow-md shadow-fuchsia-100 disabled:opacity-40 transition-all active:scale-95 duration-200"
            style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>
            {aNotifyingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Gá»­i thĂ´ng bĂ¡o táº¥t cáº£
          </button>
        </div>
      </div>

      {/* Guidance Alert Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-100/60 rounded-2xl p-5 flex gap-4 text-amber-850 shadow-xs">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1.5">
          <p className="font-extrabold text-amber-900 text-sm">HÆ°á»›ng dáº«n phĂ¢n cĂ´ng nhanh:</p>
          <ol className="list-decimal list-inside space-y-1 text-amber-800 font-semibold leading-relaxed">
            <li>Chá»n <strong className="text-amber-950 font-black">Ká»³ kháº£o sĂ¡t</strong> vĂ  <strong className="text-amber-950 font-black">Äá»£t kháº£o sĂ¡t</strong> á»Ÿ má»¥c Cáº¥u hĂ¬nh phĂ¢n cĂ´ng.</li>
            <li>Chá»n nhanh <strong className="text-amber-950 font-black">NhĂ³m tuá»•i</strong> trong báº£ng Thá»‘ng kĂª (Khá»‘i há»c vĂ  Phiáº¿u kháº£o sĂ¡t sáº½ Ä‘Æ°á»£c tá»± Ä‘á»™ng Ă¡nh xáº¡ tÆ°Æ¡ng á»©ng).</li>
            <li>TĂ­ch chá»n má»™t hoáº·c nhiá»u <strong className="text-amber-950 font-black">GiĂ¡o viĂªn</strong> á»Ÿ danh sĂ¡ch bĂªn pháº£i.</li>
            <li>Nháº¥n <strong className="text-[#00A99D] font-black">LÆ°u PhĂ¢n cĂ´ng GiĂ¡o viĂªn</strong> Ä‘á»ƒ hoĂ n thĂ nh.</li>
          </ol>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Span 7/12) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Configuration */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5 transition-all">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-slate-100">
              <Settings className="w-4 h-4 text-[#00A99D]" /> Cáº¥u hĂ¬nh PhĂ¢n cĂ´ng
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Ká»³ Kháº£o sĂ¡t" required>
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
                    <option value="">-- Chá»n ká»³ kháº£o sĂ¡t --</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                  </select>
                </div>
              </Field>

              <Field label="Äá»£t Kháº£o sĂ¡t" tooltip="Lá»c theo Ä‘á»£t cá»¥ thá»ƒ Ä‘á»ƒ thá»‘ng kĂª chĂ­nh xĂ¡c sá»‘ lÆ°á»£ng há»c sinh">
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
                    <option value="">-- Chá»n Ä‘á»£t kháº£o sĂ¡t --</option>
                    <option value="all">Táº¥t cáº£ cĂ¡c Ä‘á»£t</option>
                    {aPeriodId && periods.find(p => p.id === aPeriodId)?.batches?.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>

            <Field label="Giai Ä‘oáº¡n ÄĂ¡nh giĂ¡" tooltip="Lá»±a chá»n giai Ä‘oáº¡n thá»i gian Ä‘á»ƒ Ă¡nh xáº¡ cĂ¡c máº«u phiáº¿u kháº£o sĂ¡t phĂ¹ há»£p">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "STAGE_1", name: "Giai Ä‘oáº¡n 1 (01/06 - 31/12)" },
                  { id: "STAGE_2", name: "Giai Ä‘oáº¡n 2 (01/01 - 31/05)" }
                ].map(s => {
                  const isSel = uiStage === s.id;
                  return (
                    <div 
                      key={s.id} 
                      onClick={() => toggleStageSelection(s.id as any)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 text-xs ${isSel ? "font-extrabold shadow-sm border-[#00A99D] bg-teal-50/30 text-[#00A99D]" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center ${isSel ? "border-[#00A99D]" : "border-slate-300"}`}>
                        {isSel && <div className="w-2.5 h-2.5 rounded-full bg-[#00A99D]" />}
                      </div>
                      <span>{s.name}</span>
                    </div>
                  )
                })}
              </div>
            </Field>
          </div>

          {/* Card 2: Scope & Auto Mapping */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5 transition-all">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-slate-100">
              <Layers className="w-4 h-4 text-[#00A99D]" /> Pháº¡m vi & Ănh xáº¡ kháº£o sĂ¡t
            </h3>

            {!aPeriodId ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
                <Info className="w-6 h-6 text-slate-350 mb-2" />
                <p className="text-xs font-bold">HĂ£y chá»n Ká»³ kháº£o sĂ¡t á»Ÿ cáº¥u hĂ¬nh phĂ¢n cĂ´ng Ä‘á»ƒ hiá»ƒn thá»‹ pháº¡m vi & Ă¡nh xáº¡</p>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in duration-300">
                {/* Thá»‘ng kĂª NhĂ³m tuá»•i */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Thá»‘ng kĂª NhĂ³m tuá»•i</span>
                    <span className="text-[10px] font-extrabold text-[#00A99D] bg-teal-50/50 px-2 py-0.5 rounded-full">
                      Tá»•ng sá»‘: {Object.values(studentStats).reduce((a, b) => a + b, 0)} tráº»
                    </span>
                  </div>

                  {statsLoading ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-xs font-bold text-[#00A99D]">
                      <Loader2 className="w-4 h-4 animate-spin" /> Äang cáº­p nháº­t dá»¯ liá»‡u tráº»...
                    </div>
                  ) : Object.keys(studentStats).length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold text-center py-4 bg-slate-50 rounded-xl">KhĂ´ng tĂ¬m tháº¥y danh sĂ¡ch tráº» trong ká»³/Ä‘á»£t nĂ y</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2.5">
                        {Object.entries(studentStats).map(([grade, count]) => {
                          const isStandard = ["12 Ä‘áº¿n 18 thĂ¡ng", "18 Ä‘áº¿n 24 thĂ¡ng", "24 Ä‘áº¿n 36 thĂ¡ng", "3 Ä‘áº¿n 4 tuá»•i", "4 Ä‘áº¿n 5 tuá»•i", "5 Ä‘áº¿n 6 tuá»•i", "12 Ä‘áº¿n 24 thĂ¡ng", "18 Ä‘áº¿n 36 thĂ¡ng", "Máº«u giĂ¡o bĂ©", "Máº«u giĂ¡o nhá»¡", "Máº«u giĂ¡o lá»›n"].includes(grade)
                          const isSelected = isStatsGroupSelected(grade)
                          return (
                            <button key={grade}
                              onClick={() => isStandard && selectGradeFromStats(grade)}
                              disabled={!isStandard}
                              type="button"
                              className={`flex items-center justify-between border px-3.5 py-3 rounded-xl text-xs shadow-xs transition-all text-left ${
                                isStandard 
                                  ? isSelected
                                    ? "bg-teal-50/40 border-[#00A99D] text-[#00A99D] font-extrabold ring-1 ring-[#00A99D]"
                                    : "bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50/50 cursor-pointer"
                                  : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                              }`}>
                              <span className="flex items-center gap-2 truncate mr-2">
                                {isStandard && (
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? "border-[#00A99D] bg-[#00A99D]" : "border-slate-300"}`}>
                                    {isSelected && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                                  </div>
                                )}
                                <span className="font-bold truncate text-slate-700" title={grade}>{grade}</span>
                              </span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: isSelected ? "#00A99D20" : "#94a3b815", color: isSelected ? "#00A99D" : "#64748b" }}>
                                {count} tráº»
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Danh sĂ¡ch há»c sinh thuá»™c nhĂ³m tuá»•i Ä‘ang chá»n */}
                      {activeGroup && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2.5 animate-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-[#00A99D]" />
                              Danh sĂ¡ch tráº» nhĂ³m {activeGroup} ({filteredGroupStudents.length})
                            </span>
                          </div>
                          {filteredGroupStudents.length === 0 ? (
                            <div className="text-[11px] text-slate-400 italic">KhĂ´ng cĂ³ há»c sinh trong nhĂ³m nĂ y.</div>
                          ) : (
                            <div className="max-h-[220px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                              {filteredGroupStudents.map((stud, idx) => (
                                <div key={stud.id || idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-150 text-[11px] font-medium text-slate-700 hover:shadow-2xs transition-all">
                                  <span className="font-bold text-slate-800">{stud.fullName}</span>
                                  <span className="text-[10px] text-slate-450 font-bold uppercase">{stud.studentCode || "â€”"}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Ănh xáº¡ tá»± Ä‘á»™ng */}
                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <div className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Káº¿t quáº£ Ă¡nh xáº¡ tá»± Ä‘á»™ng</div>
                  
                  {/* Khá»‘i */}
                  <Field label="Khá»‘i tÆ°Æ¡ng á»©ng" required tooltip="Tá»± Ä‘á»™ng lá»c khá»‘i trong há»‡ thá»‘ng dá»±a trĂªn nhĂ³m tuá»•i Ä‘Ă£ chá»n">
                    <div className="grid grid-cols-2 gap-2">
                      {grades.map(g => {
                        const isChecked = aGrades.includes(g)
                        return (
                          <div 
                            key={g} 
                            onClick={() => toggleGradeSelection(g)}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs ${isChecked ? "font-extrabold shadow-sm border-[#00A99D] bg-teal-50/30 text-[#00A99D]" : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50"}`}>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isChecked ? "border-[#00A99D] bg-[#00A99D]" : "border-slate-300"}`}>
                              {isChecked && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                            </div>
                            <span>{g}</span>
                          </div>
                        )
                      })}
                    </div>
                  </Field>

                  {/* Phiáº¿u kháº£o sĂ¡t */}
                  <Field label="Máº«u Phiáº¿u kháº£o sĂ¡t tá»± Ä‘á»™ng Ă¡nh xáº¡" tooltip="Máº«u kháº£o sĂ¡t tĂ¢m lĂ½ tÆ°Æ¡ng á»©ng vá»›i Khá»‘i vĂ  Giai Ä‘oáº¡n Ä‘Ă¡nh giĂ¡">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Baby className="w-4 h-4" />
                      </div>
                      <select 
                        value={uiForm} 
                        disabled 
                        className={`${inp} pl-10 opacity-80 bg-slate-50 cursor-not-allowed border-slate-200/80`}>
                        <option value="">Chá» lá»±a chá»n cáº¥u hĂ¬nh phĂ¹ há»£p...</option>
                        {formOptions.map(f => (
                          <option key={f} value={f}>Máº«u Phiáº¿u kháº£o sĂ¡t: {f}</option>
                        ))}
                      </select>
                    </div>
                  </Field>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Teacher Selector (Span 5/12) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00A99D]" /> Chá»n GiĂ¡o viĂªn
              </h3>
              <span className="text-[10px] px-2.5 py-1 rounded-full font-black bg-teal-50 text-[#00A99D]">
                ÄĂ£ chá»n {aSelectedTeachers.length} GV
              </span>
            </div>

            {/* Department Filter */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 ml-1">Lá»c theo Tá»• ChuyĂªn mĂ´n</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Users className="w-4 h-4" />
                </div>
                <select value={aDeptId} onChange={e => setADeptId(e.target.value)} className={`${inp} pl-10`}>
                  <option value="">-- Chá»n Tá»• chuyĂªn mĂ´n --</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="TĂ¬m tĂªn hoáº·c mĂ£ giĂ¡o viĂªn..."
                value={aSearchTeacher} 
                onChange={e => setASearchTeacher(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#00A99D] focus:ring-4 focus:ring-teal-50 transition-all shadow-xs" 
              />
              {aSearchTeacher && (
                <button onClick={() => setASearchTeacher("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Select All / Deselect All Toggle bar */}
            <div className="flex items-center justify-between px-1 py-2 bg-slate-50/70 border border-slate-100 rounded-lg text-xs font-bold text-slate-550 select-none">
              <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 ml-1">
                <input 
                  type="checkbox" 
                  checked={isAllFilteredSelected} 
                  onChange={toggleSelectAll} 
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <span>{isAllFilteredSelected ? "Bá» chá»n táº¥t cáº£" : "Chá»n táº¥t cáº£"}</span>
              </label>
              <span className="text-[10px] text-slate-400 font-extrabold mr-1 uppercase">Hiá»ƒn thá»‹ {filteredTeachers.length} GV</span>
            </div>

            {/* Scrollable Teacher List */}
            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2 border border-slate-100 p-1.5 rounded-xl bg-slate-50/30">
              {!aDeptId ? (
                <div className="text-center py-16 text-xs font-bold text-slate-450 flex flex-col items-center justify-center gap-2">
                  <Users className="w-8 h-8 text-slate-300" />
                  <span>Vui lĂ²ng chá»n Tá»• chuyĂªn mĂ´n Ä‘á»ƒ hiá»ƒn thá»‹ danh sĂ¡ch giĂ¡o viĂªn</span>
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="text-center py-10 text-xs font-bold text-slate-400">KhĂ´ng tĂ¬m tháº¥y giĂ¡o viĂªn phĂ¹ há»£p</div>
              ) : (
                filteredTeachers.map(t => {
                  const userId = t.user.id
                  const isChecked = aSelectedTeachers.includes(userId)
                  const teacherAssigns = assignments.filter(a => a.userId === userId)
                  const initials = getInitials(t.teacherName)

                  return (
                    <div 
                      key={t.id} 
                      onClick={() => toggleTeacher(userId)}
                      className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer border transition-all duration-200 ${isChecked ? "border-[#00A99D] shadow-xs bg-teal-50/15" : "bg-white border-slate-200/80 hover:border-slate-350 hover:shadow-2xs"}`}>
                      
                      <div className="flex items-center gap-3 min-w-0">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          readOnly
                          className="w-4.5 h-4.5 rounded text-teal-655 focus:ring-teal-500 cursor-pointer shrink-0" 
                        />
                        
                        {/* Initials Avatar Icon */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-extrabold text-[11px] ${isChecked ? "bg-[#00A99D] text-white shadow-sm" : "bg-slate-100 text-slate-500"}`}>
                          {initials}
                        </div>
                        
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-slate-800 flex items-center gap-2 flex-wrap">
                            <span className="truncate">{t.teacherName}</span>
                            {t.departmentRel?.name && (
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider bg-slate-100 text-slate-600 border border-slate-200/50">
                                {t.departmentRel.name}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5 truncate">{t.teacherCode} â€¢ {t.email || t.user.email}</div>
                          
                          {/* Hiá»ƒn thá»‹ phĂ¢n cĂ´ng hiá»‡n táº¡i */}
                          {teacherAssigns.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {teacherAssigns.map((assign: any) => (
                                <span key={assign.id} className="text-[8px] font-black uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/40">
                                  {assign.grade}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {isChecked && <CheckCircle2 className="w-4 h-4 shrink-0 animate-in zoom-in-50 duration-200 text-[#00A99D]" />}
                    </div>
                  )
                })
              )}
            </div>

            {/* Submit Action */}
            <button 
              onClick={saveAssignments} 
              disabled={aSaving || !canCreate}
              className="w-full py-4 text-white font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-teal-50 active:scale-98 shadow-md"
              style={{ background: TEAL }}>
              {aSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
              LÆ°u PhĂ¢n cĂ´ng GiĂ¡o viĂªn
            </button>
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
