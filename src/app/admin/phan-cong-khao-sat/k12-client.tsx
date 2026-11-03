"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  UserCheck, GraduationCap, BookOpen, Layers, Search, Trash2,
  Mail, Edit2, Loader2, Filter, Calendar, UserPlus, CheckCircle2,
  AlertCircle, X, Plus, RefreshCw, Users, ExternalLink, ArrowUpRight, Sparkles, Check, RotateCcw
} from "lucide-react"

// ─── Helpers ───
function getInitials(name?: string) {
  if (!name) return "GV"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

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

function Empty({ icon: Icon, text, sub }: { icon: any; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-teal-50/70 border border-teal-100 flex items-center justify-center mb-3 text-[#00736E]">
        <Icon className="w-7 h-7 opacity-75" />
      </div>
      <p className="font-bold text-slate-700 text-sm">{text}</p>
      {sub && <p className="text-xs text-slate-400 mt-1 font-normal">{sub}</p>}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 ml-0.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inp = "w-full bg-white border border-slate-200/90 rounded-xl pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-medium text-slate-800 outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cpath%20stroke%3D%27%2364748b%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%271.5%27%20d%3D%27m6%208%204%204%204-4%27%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] bg-[length:16px_16px] focus:ring-2 focus:ring-teal-500/20 focus:border-[#00736E] hover:border-slate-300 transition-all placeholder:text-slate-400 shadow-2xs"

interface ConfirmState { msg: string; fn: () => void }
function ConfirmDialog({ open, onClose, onConfirm, message }: { open:boolean; onClose:()=>void; onConfirm:()=>void; message:string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xl p-6 max-w-[360px] w-full text-center animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"><X className="w-4 h-4" /></button>
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-4 shadow-2xs"><Trash2 className="w-5 h-5" /></div>
        <h3 className="text-base font-bold text-slate-800 tracking-normal mb-1.5">Xác nhận xóa</h3>
        <p className="text-xs text-slate-500 font-normal leading-relaxed mb-5 px-1">{message}</p>
        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">Hủy</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-all cursor-pointer">Xóa</button>
        </div>
      </div>
    </div>
  )
}

// ─── Props ───
interface Props {
  academicYears: any[]
  initialPeriods: any[]
  teachers: any[]
  departments: any[]
  subjects: any[]
  eduSystems: any[]
  grades: string[]
  campuses: any[]
  currentUser?: { id: string; role: string; campusIds: string[]; fullName?: string } | null
  rolePermissions?: any[]
}

export function PhanCongK12Client({
  academicYears = [],
  initialPeriods = [],
  teachers = [],
  departments = [],
  subjects: initialSubjects = [],
  eduSystems = [],
  grades = [],
  campuses = [],
  currentUser = null,
  rolePermissions = []
}: Props) {
  const userRole = (currentUser?.role || "").toUpperCase()
  const isAdmin = userRole === "ADMIN" || userRole === "KT_DBCL"
  const canCreate = isAdmin || (rolePermissions.some(p => (p.module === "PHAN_CONG_K12" || p.module === "PHAN_CONG_KHAO_SAT" || p.module === "INPUT_ASSESSMENTS_ASSIGNMENTS" || p.module === "INPUT_ASSESSMENTS") && p.canCreate))
  const canUpdate = isAdmin || (rolePermissions.some(p => (p.module === "PHAN_CONG_K12" || p.module === "PHAN_CONG_KHAO_SAT" || p.module === "INPUT_ASSESSMENTS_ASSIGNMENTS" || p.module === "INPUT_ASSESSMENTS") && p.canUpdate))
  const canDelete = isAdmin || (rolePermissions.some(p => (p.module === "PHAN_CONG_K12" || p.module === "PHAN_CONG_KHAO_SAT" || p.module === "INPUT_ASSESSMENTS_ASSIGNMENTS" || p.module === "INPUT_ASSESSMENTS") && p.canDelete))

  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)
  const notify = (msg: string, type: "ok" | "err" = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200) }
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  // ─── Year ───
  const defaultYear = academicYears.find(y => !y.isOff) || academicYears[0]
  const [yearId, setYearId] = useState(defaultYear?.id || "")

  // ─── Grades ───
  const [activeGrades, setActiveGrades] = useState<string[]>(grades)

  useEffect(() => {
    setActiveGrades(grades)
  }, [grades])

  // ─── Periods ───
  const [periods, setPeriods] = useState<any[]>(initialPeriods)
  const [pLoading, setPLoading] = useState(false)

  const visiblePeriods = useMemo(() => {
    const activeBatchesPeriods = periods.map(p => ({
      ...p,
      batches: (p.batches || []).filter((b: any) => b.status === "ACTIVE")
    }))

    if (!currentUser?.role) return activeBatchesPeriods
    if (isAdmin) return activeBatchesPeriods
    if (["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes(userRole)) {
      const allowedIds = currentUser.campusIds || []
      return activeBatchesPeriods.map(p => ({
        ...p,
        batches: (p.batches || []).filter((b: any) => {
          if (!b.campusId) {
            return allowedIds.some((id: string) => {
              const campus = campuses.find((c: any) => c.id === id)
              if (!campus) return false
              return b.name.includes(campus.campusCode) || b.name.includes(campus.campusName)
            })
          }
          return allowedIds.includes(b.campusId)
        })
      }))
    }
    return activeBatchesPeriods
  }, [periods, currentUser, campuses, isAdmin, userRole])

  const fetchPeriods = useCallback(async () => {
    if (!yearId) return
    setPLoading(true)
    try {
      const [periodsRes, gradesRes] = await Promise.all([
        fetch(`/api/input-assessments?academicYearId=${yearId}&t=${Date.now()}`),
        fetch(`/api/input-assessments?getGrades=true&academicYearId=${yearId}&t=${Date.now()}`)
      ])
      if (periodsRes.ok) setPeriods(await periodsRes.json())
      if (gradesRes.ok) {
        const fetchedGrades = await gradesRes.json()
        setActiveGrades(fetchedGrades)
      }
    } catch (err) {
      console.error(err)
    } finally { setPLoading(false) }
  }, [yearId])

  useEffect(() => { fetchPeriods() }, [fetchPeriods])

  // ─── Assignments State ───
  const [assignments, setAssignments] = useState<any[]>([])
  const [asLoading, setAsLoading] = useState(false)
  const [asPeriodId, setAsPeriodId] = useState("")
  const [asBatchId, setAsBatchId] = useState("")
  const [asFilterBatchId, setAsFilterBatchId] = useState("")
  const [asNotifyingId, setAsNotifyingId] = useState<string | null>(null)
  const [asNotifyingAll, setAsNotifyingAll] = useState(false)

  // ─── Student stats state ───
  const [studentStats, setStudentStats] = useState<Record<string, any[]>>({})
  const [statsLoading, setStatsLoading] = useState(false)
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({})

  // ─── Filtered Batch Students (cho danh sách phân công và modal học sinh) ───
  const [filterBatchStudents, setFilterBatchStudents] = useState<any[]>([])
  const [filterStudentsLoading, setFilterStudentsLoading] = useState(false)
  const [viewingStudentAssignment, setViewingStudentAssignment] = useState<any | null>(null)

  const fetchStudentStats = useCallback(async () => {
    if (!asPeriodId) {
      setStudentStats({})
      return
    }
    setStatsLoading(true)
    try {
      let url = `/api/input-assessment-students?periodId=${asPeriodId}`
      if (asBatchId) url += `&batchId=${asBatchId}`
      const res = await fetch(url)
      if (res.ok) {
        const students = await res.json()
        const grouped: Record<string, any[]> = {}
        students.forEach((s: any) => {
          const g = s.grade || "Chưa xác định"
          if (!grouped[g]) grouped[g] = []
          grouped[g].push(s)
        })
        setStudentStats(grouped)
      } else {
        setStudentStats({})
      }
    } catch (e) {
      console.error(e)
      setStudentStats({})
    } finally {
      setStatsLoading(false)
    }
  }, [asPeriodId, asBatchId])

  useEffect(() => {
    fetchStudentStats()
  }, [fetchStudentStats])

  const fetchFilterBatchStudents = useCallback(async () => {
    if (!asPeriodId) {
      setFilterBatchStudents([])
      return
    }
    setFilterStudentsLoading(true)
    try {
      const activeBatchParam = asFilterBatchId && asFilterBatchId !== "all" 
        ? `&batchId=${asFilterBatchId}` 
        : (asBatchId ? `&batchId=${asBatchId}` : "")
      const res = await fetch(`/api/input-assessment-students?periodId=${asPeriodId}${activeBatchParam}&t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        setFilterBatchStudents(Array.isArray(data) ? data : [])
      } else {
        setFilterBatchStudents([])
      }
    } catch (e) {
      console.error(e)
      setFilterBatchStudents([])
    } finally {
      setFilterStudentsLoading(false)
    }
  }, [asPeriodId, asFilterBatchId, asBatchId])

  useEffect(() => {
    fetchFilterBatchStudents()
  }, [fetchFilterBatchStudents])

  const getAssignedStudentsForGroup = useCallback((a: any) => {
    if (!filterBatchStudents.length) return []
    const grades = (a.grades || []).map((g: any) => String(g))
    const systems = (a.educationSystems || []).map((s: string) => s.toUpperCase())
    
    return filterBatchStudents.filter((st: any) => {
      const matchGrade = grades.includes(String(st.grade || ""))
      if (!matchGrade) return false
      if (systems.length === 0) return true
      const stSys = (st.surveySystem || st.surveyFormType || "").toUpperCase()
      if (!stSys) return true
      return systems.some((sys: string) => stSys.includes(sys) || sys.includes(stSys))
    })
  }, [filterBatchStudents])

  const [asDeptId, setAsDeptId] = useState("")
  const [asTeacherId, setAsTeacherId] = useState("")
  const [asSelSubjects, setAsSelSubjects] = useState<string[]>([])
  const [asSelGrades, setAsSelGrades] = useState<string[]>([])
  const [asSelSystems, setAsSelSystems] = useState<string[]>([])
  const [asSubmitting, setAsSubmitting] = useState(false)

  const [showCustomBatch, setShowCustomBatch] = useState(false)
  const [teacherQuickSearch, setTeacherQuickSearch] = useState("")
  const [assignTableSearch, setAssignTableSearch] = useState("")

  // ─── Auto-set period ───
  useEffect(() => {
    if (visiblePeriods.length > 0 && !asPeriodId) {
      setAsPeriodId(visiblePeriods[0].id)
    }
  }, [visiblePeriods, asPeriodId])

  // ─── Computed ───
  const currentEduSystems = useMemo(() => eduSystems.filter((es: any) => es.academicYearId === yearId), [eduSystems, yearId])
  const filteredTeachers = useMemo(() => {
    let list = asDeptId ? teachers.filter(t => t.departmentId === asDeptId) : teachers
    if (teacherQuickSearch.trim()) {
      const q = teacherQuickSearch.trim().toLowerCase()
      list = list.filter(t =>
        (t.teacherName || "").toLowerCase().includes(q) ||
        (t.teacherCode || "").toLowerCase().includes(q)
      )
    }
    return list
  }, [teachers, asDeptId, teacherQuickSearch])
  const asSelPeriod = visiblePeriods.find(p => p.id === asPeriodId)

  // Tự động nhận diện Đợt khảo sát mới nhất của Kỳ
  const latestBatch = useMemo(() => {
    if (!asSelPeriod?.batches || asSelPeriod.batches.length === 0) return null
    const sorted = [...asSelPeriod.batches].sort((a: any, b: any) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0
      if (dateB !== dateA) return dateB - dateA
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      if (cb !== ca) return cb - ca
      return (b.id || "").localeCompare(a.id || "")
    })
    return sorted[0] || null
  }, [asSelPeriod])

  // Tự động gán Đợt mới nhất khi chọn Kỳ khảo sát
  useEffect(() => {
    if (latestBatch) {
      setAsBatchId(latestBatch.id)
      setAsFilterBatchId(latestBatch.id)
    } else {
      setAsBatchId("")
      setAsFilterBatchId("all")
    }
    setShowCustomBatch(false)
  }, [asPeriodId, latestBatch])

  const groupedAssignments = useMemo(() => {
    const groups: Record<string, any> = {}
    const targetAssignments = (!asFilterBatchId || asFilterBatchId === "all")
      ? assignments
      : assignments.filter(a => a.batchId === asFilterBatchId)
    targetAssignments.forEach(a => {
      const key = `${a.userId}_${a.batchId || "null"}`
      if (!groups[key]) {
        groups[key] = { ...a, ids: [a.id], subjects: a.subject ? [a.subject.name] : [], subjectIds: a.subjectId ? [a.subjectId] : [], grades: [a.grade], educationSystems: [a.educationSystem] }
      } else {
        groups[key].ids.push(a.id)
        if (a.subject && !groups[key].subjects.includes(a.subject.name)) groups[key].subjects.push(a.subject.name)
        if (a.subjectId && !groups[key].subjectIds.includes(a.subjectId)) groups[key].subjectIds.push(a.subjectId)
        if (!groups[key].grades.includes(a.grade)) groups[key].grades.push(a.grade)
        if (!groups[key].educationSystems.includes(a.educationSystem)) groups[key].educationSystems.push(a.educationSystem)
      }
    })
    const values = Object.values(groups)
    if (!assignTableSearch.trim()) return values
    const q = assignTableSearch.trim().toLowerCase()
    return values.filter((g: any) =>
      (g.user?.fullName || "").toLowerCase().includes(q) ||
      (g.subjects || []).some((s: string) => s.toLowerCase().includes(q)) ||
      (g.grades || []).some((gr: string) => String(gr).toLowerCase().includes(q))
    )
  }, [assignments, asFilterBatchId, assignTableSearch])

  // ─── Fetch Assignments ───
  const fetchAssignments = useCallback(async () => {
    if (!asPeriodId) return
    setAsLoading(true)
    try {
      const r = await fetch(`/api/input-assessment-assignments?periodId=${asPeriodId}`)
      if (r.ok) setAssignments(await r.json())
    } finally { setAsLoading(false) }
  }, [asPeriodId])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  // ─── Actions ───
  const [autoSendEmailOnAssign, setAutoSendEmailOnAssign] = useState(true)

  const submitAssignment = async () => {
    if (!canCreate) return
    if (!asPeriodId || !asTeacherId || !asSelSubjects.length || !asSelGrades.length || !asSelSystems.length) {
      return notify("Vui lòng chọn đầy đủ Kỳ, GV, Môn, Khối và Hệ học", "err")
    }
    setAsSubmitting(true)
    try {
      const payloads: any[] = []
      asSelSubjects.forEach(subjectId => {
        asSelGrades.forEach(grade => {
          asSelSystems.forEach(systemCode => {
            payloads.push({ teacherId: asTeacherId, subjectId, grade, educationSystem: systemCode })
          })
        })
      })
      const res = await fetch("/api/input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "BULK_ASSIGN", periodId: asPeriodId, batchId: asBatchId || null, assignments: payloads })
      })
      if (res.ok) {
        await res.json()
        fetchAssignments()
        if (fetchFilterBatchStudents) fetchFilterBatchStudents()
        setAsSelSubjects([]); setAsSelGrades([]); setAsSelSystems([])

        // Tự động kích hoạt gửi email thông báo kèm danh sách học sinh ngay lập tức
        if (autoSendEmailOnAssign) {
          try {
            const notifyRes = await fetch("/api/input-assessment-assignments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                action: "NOTIFY_SINGLE", 
                userId: asTeacherId, 
                periodId: asPeriodId, 
                batchId: asBatchId || null 
              })
            })
            if (notifyRes.ok) {
              const nData = await notifyRes.json()
              if (nData.success && nData.sentCount > 0) {
                notify("Đã lưu phân công và gửi email thông báo thành công cho Giáo viên!")
              } else {
                notify(`Đã lưu phân công (Email: ${nData.errors?.[0] || "Chưa gửi được mail"})`, "err")
              }
            } else {
              notify("Đã lưu phân công (Chưa gửi được email thông báo)", "err")
            }
          } catch (e: any) {
            notify(`Đã lưu phân công (Lỗi gửi email: ${e?.message})`, "err")
          }
        } else {
          notify("Đã hoàn tất lưu phân công môn thi cho giáo viên!")
        }
      } else {
        const j = await res.json()
        notify(j.error || "Lỗi phân công", "err")
      }
    } finally { setAsSubmitting(false) }
  }

  const sendTeacherNotification = async (a: any) => {
    if (!canUpdate || !a.userId || !asPeriodId) return
    setAsNotifyingId(a.id)
    try {
      const res = await fetch("/api/input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "NOTIFY_SINGLE", userId: a.userId, periodId: asPeriodId, batchId: a.batchId || null })
      })
      if (res.ok) {
        const result = await res.json()
        if (result.success && result.sentCount > 0) { notify(`Đã gửi email thông báo cho GV ${a.user?.fullName || ""}!`) }
        else { notify(`Gửi email thất bại: ${result.errors?.[0] || "Không gửi được email"}`, "err") }
      } else { notify("Lỗi khi kết nối gửi thông báo", "err") }
    } catch { notify("Có lỗi xảy ra", "err") }
    finally { setAsNotifyingId(null) }
  }

  const sendAllNotifications = async () => {
    if (!canUpdate || groupedAssignments.length === 0) return notify("Không có phân công nào để gửi thông báo", "err")
    setAsNotifyingAll(true)
    try {
      const res = await fetch("/api/input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "NOTIFY_ALL", periodId: asPeriodId, batchId: asFilterBatchId || null })
      })
      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          notify(`Đã gửi thông báo thành công cho ${result.sentCount} giáo viên!`)
          if (result.failedCount > 0) notify(`Gửi thất bại cho ${result.failedCount} giáo viên`, "err")
        } else { notify("Gửi thông báo hàng loạt thất bại", "err") }
      } else { notify("Lỗi kết nối", "err") }
    } catch { notify("Có lỗi xảy ra", "err") }
    finally { setAsNotifyingAll(false) }
  }

  const deleteAssignment = async (ids: string[]) => {
    if (!canDelete) return
    const res = await fetch(`/api/input-assessment-assignments?ids=${ids.join(",")}`, { method: "DELETE" })
    if (res.ok) { notify("Đã xóa phân công"); fetchAssignments() }
  }

  const openEditAssignment = (a: any) => {
    if (a.periodId) setAsPeriodId(a.periodId)
    if (a.batchId) setAsBatchId(a.batchId); else setAsBatchId("")
    if (a.user?.departmentId) setAsDeptId(a.user.departmentId); else setAsDeptId("")
    setAsTeacherId(a.userId)
    setAsSelSubjects(a.subjectIds || [])
    setAsSelGrades(a.grades || [])
    setAsSelSystems(a.educationSystems)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const [teacherAssignBatchMode, setTeacherAssignBatchMode] = useState<"current" | "all">("current")

  const getSystemBadgeStyle = (sys?: string) => {
    const s = (sys || "").toUpperCase()
    if (s.includes("HNS")) return "bg-amber-50 text-amber-700 border-amber-200"
    if (s.includes("HNG")) return "bg-teal-50 text-[#00736E] border-teal-200"
    if (s.includes("SB")) return "bg-emerald-50 text-emerald-700 border-emerald-200"
    if (s.includes("MNS") || s.includes("MNG")) return "bg-purple-50 text-purple-700 border-purple-200"
    return "bg-slate-100 text-slate-700 border-slate-200"
  }

  const loadAssignToForm = (assignList: any[]) => {
    const subjectIds = Array.from(new Set(assignList.map(a => a.subjectId).filter(Boolean)))
    const grades = Array.from(new Set(assignList.map(a => String(a.grade)).filter(Boolean)))
    const systems = Array.from(new Set(assignList.map(a => a.educationSystem).filter(Boolean)))
    
    if (subjectIds.length > 0) setAsSelSubjects(subjectIds)
    if (grades.length > 0) setAsSelGrades(grades)
    if (systems.length > 0) setAsSelSystems(systems)
    notify(`Đã nạp phạm vi phân công (${subjectIds.length} môn, ${grades.length} khối, ${systems.length} hệ) lên form!`)
  }

  const confirmDeleteAssigns = (ids: string[], label: string) => {
    if (!canDelete) return
    setConfirm({
      msg: `Bạn có chắc chắn muốn xóa ${label}? Thao tác này không thể hoàn tác.`,
      fn: async () => {
        await deleteAssignment(ids)
      }
    })
  }

  const totalStudentsInBatch = useMemo(() => {
    return Object.values(studentStats).reduce((acc, list) => acc + list.length, 0)
  }, [studentStats])

  const gradesWithStudents = useMemo(() => {
    return activeGrades.filter(g => (studentStats[g]?.length || 0) > 0)
  }, [activeGrades, studentStats])

  const totalCombinations = asSelSubjects.length * asSelGrades.length * asSelSystems.length

  // ─── RENDER ───
  return (
    <div className="space-y-5 font-sans max-w-[1440px] mx-auto pb-16">
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirm && <ConfirmDialog open={true} onClose={() => setConfirm(null)} onConfirm={confirm.fn} message={confirm.msg} />}

      {/* ─── TOP CONTEXT BAR: KỲ KHẢO SÁT, ĐỢT KHẢO SÁT & PHÂN BỔ HỌC SINH THEO KHỐI ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-[#003B3A]/5 via-[#00736E]/5 to-transparent border-b border-slate-200/70 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00736E] text-white flex items-center justify-center shadow-2xs">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-[#003B3A]">Ngữ cảnh Kỳ & Đợt Khảo sát K-12</h2>
                {asPeriodId && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00A19A]/15 text-[#005854] border border-[#00A19A]/25">
                    Tổng: {totalStudentsInBatch} học sinh
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPeriods}
              disabled={pLoading}
              title="Làm mới dữ liệu kỳ khảo sát"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#005854] bg-teal-50/70 hover:bg-teal-100/80 border border-teal-200/70 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00736E] ${pLoading ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Chọn Kỳ khảo sát */}
            <div className="lg:col-span-5">
              <Field label="Kỳ khảo sát áp dụng" required>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#00736E]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <select value={asPeriodId} onChange={e => setAsPeriodId(e.target.value)} className={inp + " pl-10"}>
                    <option value="">-- Chọn Kỳ khảo sát --</option>
                    {visiblePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </Field>
            </div>

            {/* Đợt khảo sát đang áp dụng */}
            <div className="lg:col-span-7">
              <Field label="Đợt khảo sát trong kỳ">
                {!asPeriodId ? (
                  <div className="h-[42px] px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center text-xs text-slate-400">
                    Vui lòng chọn Kỳ khảo sát để tự động nhận diện đợt mới nhất
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="min-h-[42px] px-3.5 py-2 bg-gradient-to-r from-teal-50/80 via-emerald-50/30 to-white border border-teal-200/80 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#00736E]/15 text-[#00736E] flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-3.5 h-3.5 text-[#00736E]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-[#003B3A] truncate">
                              {asBatchId ? (asSelPeriod?.batches?.find((b: any) => b.id === asBatchId)?.name || "Đợt khảo sát") : "Áp dụng Toàn kỳ / Khảo sát lẻ"}
                            </span>
                            {latestBatch && asBatchId === latestBatch.id && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00736E] text-white">
                                Mới nhất
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {asSelPeriod?.batches && asSelPeriod.batches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setShowCustomBatch(!showCustomBatch)}
                          className="px-3 py-1 text-xs font-bold text-[#005854] bg-white hover:bg-teal-50 border border-teal-200 rounded-lg transition-colors cursor-pointer flex-shrink-0 shadow-2xs"
                        >
                          {showCustomBatch ? "Đóng" : "Đổi đợt"}
                        </button>
                      )}
                    </div>

                    {showCustomBatch && asSelPeriod?.batches && asSelPeriod.batches.length > 0 && (
                      <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-1.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-600">Chuyển sang đợt khảo sát khác:</label>
                          {latestBatch && asBatchId !== latestBatch.id && (
                            <button
                              type="button"
                              onClick={() => setAsBatchId(latestBatch.id)}
                              className="text-xs font-bold text-[#00736E] hover:underline cursor-pointer"
                            >
                              &larr; Về đợt mới nhất ({latestBatch.name})
                            </button>
                          )}
                        </div>
                        <select
                          value={asBatchId}
                          onChange={e => setAsBatchId(e.target.value)}
                          className={inp}
                        >
                          <option value="">-- Áp dụng toàn kỳ / Khảo sát lẻ --</option>
                          {asSelPeriod.batches.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.name} {b.id === latestBatch?.id ? "(Mới nhất)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </Field>
            </div>
          </div>

          {/* Thanh chip phân bổ Học sinh theo Khối */}
          {asPeriodId && (
            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#003B3A]">
                  <Users className="w-4 h-4 text-[#00736E]" />
                  <span>Phân bổ Học sinh theo Khối trong đợt</span>
                  {statsLoading && <Loader2 className="w-3.5 h-3.5 text-[#00736E] animate-spin" />}
                </div>
                <div className="flex items-center gap-3">
                  {gradesWithStudents.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAsSelGrades(gradesWithStudents)
                        notify(`Đã chọn nhanh ${gradesWithStudents.length} khối có học sinh dự khảo sát!`)
                      }}
                      className="text-[11px] font-bold text-[#00736E] hover:text-[#003B3A] underline cursor-pointer"
                    >
                      + Chọn nhanh các khối có HS ({gradesWithStudents.length} khối)
                    </button>
                  )}
                  <span className="text-[11px] text-slate-400 font-normal">
                    Bấm vào từng khối để xem danh sách học sinh
                  </span>
                </div>
              </div>

              {Object.keys(studentStats).length === 0 ? (
                <div className="text-xs text-slate-400 font-normal text-center py-2">
                  {statsLoading ? "Đang tải dữ liệu học sinh..." : "Không có học sinh trong đợt khảo sát này"}
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(studentStats).map(([grade, studentsList]) => {
                      const isExpanded = !!expandedGrades[grade]
                      const isGradeInScope = asSelGrades.includes(String(grade))
                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => setExpandedGrades(prev => ({ ...prev, [grade]: !prev[grade] }))}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer border ${
                            isExpanded
                              ? "bg-[#003B3A] border-[#003B3A] text-white font-bold shadow-xs"
                              : isGradeInScope
                              ? "bg-teal-50 border-[#00A19A] text-[#005854] font-semibold"
                              : "bg-white border-slate-200/80 text-slate-700 hover:border-teal-300 hover:bg-teal-50/40"
                          }`}
                        >
                          <span>Khối {grade}</span>
                          <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
                            isExpanded
                              ? "bg-white/20 text-white"
                              : "bg-teal-50 text-[#00736E]"
                          }`}>
                            {studentsList.length}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Hiển thị danh sách nếu có khối được bấm mở */}
                  {Object.entries(studentStats).filter(([grade]) => expandedGrades[grade]).map(([grade, studentsList]) => (
                    <div key={grade} className="p-3 bg-white border border-teal-200/80 rounded-xl space-y-2 shadow-2xs animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs font-bold text-[#003B3A] pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span>Danh sách Học sinh Khối {grade} ({studentsList.length} HS)</span>
                          {!asSelGrades.includes(String(grade)) && (
                            <button
                              type="button"
                              onClick={() => setAsSelGrades(p => [...p, String(grade)])}
                              className="px-2 py-0.5 rounded-md bg-teal-50 text-[#00736E] border border-teal-200 text-[10px] font-bold hover:bg-teal-100 cursor-pointer"
                            >
                              + Chọn Khối {grade} vào phạm vi
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedGrades(prev => ({ ...prev, [grade]: false }))}
                          className="text-slate-400 hover:text-slate-700 text-[11px] font-semibold cursor-pointer"
                        >
                          Đóng ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1 text-xs">
                        {studentsList.map((st: any) => (
                          <div key={st.id} className="flex justify-between items-center py-1.5 px-2.5 bg-slate-50/70 hover:bg-teal-50/50 border border-slate-200/60 rounded-lg">
                            <span className="text-slate-800 font-medium truncate mr-2" title={st.fullName}>{st.fullName}</span>
                            <span className="text-[#00736E] font-mono text-[10px] font-semibold shrink-0">{st.studentCode}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN WORKSPACE: BƯỚC 1 (GIÁO VIÊN) & BƯỚC 2 (PHẠM VI + XÁC NHẬN) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column (5/12): Bước 1 - Chọn Giáo viên & Phân công hiện tại */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-[#003B3A] to-[#005854] px-5 py-3.5 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-[#00A19A] text-white flex items-center justify-center text-xs font-black shadow-2xs">1</span>
              <div>
                <h2 className="font-bold text-white text-sm">Người phụ trách & Hồ sơ GV</h2>
              </div>
            </div>
            <span className="text-[11px] text-teal-100/90 font-medium">
              {filteredTeachers.length} giáo viên
            </span>
          </div>

          <div className="p-5 space-y-4 flex-1 flex flex-col">
            {/* Bộ lọc Tổ chuyên môn & Chọn Giáo viên */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Lọc Tổ chuyên môn">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#00736E]">
                    <Users className="w-4 h-4" />
                  </div>
                  <select
                    value={asDeptId}
                    onChange={e => {
                      setAsDeptId(e.target.value)
                      setTeacherQuickSearch("")
                    }}
                    className={inp + " pl-10"}
                  >
                    <option value="">Tất cả Tổ chuyên môn</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </Field>

              <Field label="Giáo viên phụ trách" required>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#00736E]">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <select value={asTeacherId} onChange={e => setAsTeacherId(e.target.value)} className={inp + " pl-10"}>
                    <option value="">-- Chọn Giáo viên --</option>
                    {filteredTeachers.map(t => <option key={t.userId} value={t.userId}>{t.teacherName}</option>)}
                  </select>
                </div>
              </Field>
            </div>

            {/* Ô tìm nhanh & Danh sách chip chọn nhanh Giáo viên trong Tổ */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={teacherQuickSearch}
                  onChange={e => setTeacherQuickSearch(e.target.value)}
                  placeholder="Gõ tên hoặc mã GV để lọc nhanh..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200/80 text-xs text-slate-700 outline-none focus:border-[#00736E] focus:ring-2 focus:ring-teal-500/15 transition-all"
                />
                {teacherQuickSearch && (
                  <button
                    type="button"
                    onClick={() => setTeacherQuickSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {(asDeptId || teacherQuickSearch.trim()) && filteredTeachers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50/80 rounded-xl border border-slate-200/60 custom-scrollbar">
                  {filteredTeachers.map(t => {
                    const isSelected = asTeacherId === t.userId
                    const assignCount = assignments.filter(a => a.userId === t.userId && (!asBatchId || a.batchId === asBatchId)).length
                    return (
                      <button
                        key={t.userId}
                        type="button"
                        onClick={() => setAsTeacherId(t.userId)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-[#00736E] border-[#00736E] text-white font-bold shadow-2xs"
                            : "bg-white border-slate-200/80 text-slate-700 hover:border-teal-300 hover:bg-teal-50/40 font-medium"
                        }`}
                      >
                        <span>{t.teacherName}</span>
                        {assignCount > 0 && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            isSelected ? "bg-white/25 text-white" : "bg-teal-50 text-[#00736E]"
                          }`}>
                            {assignCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Hiển thị phân công hiện tại của giáo viên */}
            {!asTeacherId ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl text-center">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 text-[#00736E] flex items-center justify-center mb-2.5">
                  <UserCheck className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">Chưa chọn Giáo viên phụ trách</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Chọn Tổ chuyên môn và Giáo viên ở trên để xem hồ sơ phân công hiện tại hoặc giao môn khảo sát mới.
                </p>
              </div>
            ) : (() => {
              const allTeacherAssigns = assignments.filter(a => a.userId === asTeacherId)
              const batchTeacherAssigns = asBatchId ? allTeacherAssigns.filter(a => a.batchId === asBatchId) : allTeacherAssigns
              const isFilteringByBatch = asBatchId && teacherAssignBatchMode === "current"
              const displayedAssigns = isFilteringByBatch ? batchTeacherAssigns : allTeacherAssigns

              // Gom nhóm theo Môn học
              const map = new Map<string, { subjectId: string; subjectName: string; items: any[] }>()
              displayedAssigns.forEach(a => {
                const sId = a.subjectId || a.subject?.id || "unknown"
                const sName = a.subject?.name || "Môn khác"
                if (!map.has(sId)) {
                  map.set(sId, { subjectId: sId, subjectName: sName, items: [] })
                }
                map.get(sId)!.items.push(a)
              })

              // Sắp xếp các mục trong từng môn theo Khối và Hệ
              map.forEach(group => {
                group.items.sort((x, y) => {
                  const gX = parseInt(String(x.grade).replace(/\D/g, "")) || 0
                  const gY = parseInt(String(y.grade).replace(/\D/g, "")) || 0
                  if (gX !== gY) return gX - gY
                  return String(x.educationSystem || "").localeCompare(String(y.educationSystem || ""))
                })
              })

              const subjectGroups = Array.from(map.values())
              const currentTeacher = teachers.find(t => t.userId === asTeacherId)

              return (
                <div className="p-4 bg-teal-50/25 border border-teal-200/60 rounded-xl space-y-3 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/50 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#00736E] text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                        {getInitials(currentTeacher?.teacherName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#003B3A]">{currentTeacher?.teacherName || "Giáo viên"}</span>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-[#00736E]/15 text-[#005854]">
                            {displayedAssigns.length} nhiệm vụ
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-normal">
                          Phân công hiện tại của GV {subjectGroups.length > 0 && `• ${subjectGroups.length} môn`}
                        </span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    {displayedAssigns.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => loadAssignToForm(displayedAssigns)}
                          title="Nạp phân công lên form phạm vi bên phải"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#005854] bg-white hover:bg-teal-50 border border-teal-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          <ArrowUpRight className="w-3 h-3 text-[#00736E]" />
                          <span>Nạp tất cả</span>
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => confirmDeleteAssigns(
                              displayedAssigns.map(a => a.id),
                              isFilteringByBatch 
                                ? `toàn bộ ${displayedAssigns.length} phân công của GV trong đợt này` 
                                : `toàn bộ ${displayedAssigns.length} phân công của GV trong kỳ khảo sát`
                            )}
                            title="Xóa tất cả phân công đang hiển thị của giáo viên này"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200/70 rounded-lg transition-colors cursor-pointer shadow-2xs"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                            <span>Xóa hết</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Batch Filter Switch */}
                  {asBatchId && (
                    <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setTeacherAssignBatchMode("current")}
                        className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                          teacherAssignBatchMode === "current"
                            ? "bg-white text-[#003B3A] shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        Đợt đang chọn ({batchTeacherAssigns.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeacherAssignBatchMode("all")}
                        className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                          teacherAssignBatchMode === "all"
                            ? "bg-white text-[#003B3A] shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        Tất cả đợt của kỳ ({allTeacherAssigns.length})
                      </button>
                    </div>
                  )}

                  {/* Danh sách phân công gom theo Môn */}
                  {displayedAssigns.length === 0 ? (
                    <div className="py-6 text-center bg-white rounded-xl border border-dashed border-slate-200 p-3 flex-1 flex flex-col items-center justify-center">
                      {isFilteringByBatch && allTeacherAssigns.length > 0 ? (
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-600 font-medium">Chưa có phân công nào trong đợt này.</p>
                          <p className="text-xs text-amber-600 font-medium">
                            Giáo viên đang có {allTeacherAssigns.length} phân công ở các đợt khác của kỳ này.
                          </p>
                          <button
                            type="button"
                            onClick={() => setTeacherAssignBatchMode("all")}
                            className="text-xs font-bold text-[#00736E] hover:underline cursor-pointer"
                          >
                            Xem tất cả đợt ({allTeacherAssigns.length}) &rarr;
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 font-normal">
                          Giáo viên chưa được giao môn khảo sát nào trong kỳ này. Hãy chọn phạm vi ở khung bên phải (Mục 2).
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar flex-1">
                      {subjectGroups.map(group => (
                        <div
                          key={group.subjectId}
                          className="bg-white rounded-xl border border-slate-200/80 p-2.5 space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-[#00A19A] flex-shrink-0"></span>
                              <span className="font-bold text-xs text-[#003B3A] truncate" title={group.subjectName}>
                                {group.subjectName}
                              </span>
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-teal-50 text-[#00736E] border border-teal-200/60 flex-shrink-0">
                                {group.items.length}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => loadAssignToForm(group.items)}
                                title={`Nạp môn ${group.subjectName} lên form`}
                                className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-bold text-[#00736E] bg-teal-50 hover:bg-teal-100 rounded-md transition-colors cursor-pointer"
                              >
                                <ArrowUpRight className="w-3 h-3 text-[#00736E]" />
                                <span>Nạp</span>
                              </button>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => confirmDeleteAssigns(
                                    group.items.map((i: any) => i.id),
                                    `tất cả phân công môn "${group.subjectName}" của GV`
                                  )}
                                  title={`Xóa tất cả phân công môn ${group.subjectName}`}
                                  className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Chips danh sách khối và hệ */}
                          <div className="flex flex-wrap gap-1">
                            {group.items.map((item: any) => (
                              <div
                                key={item.id}
                                className="group/chip inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 bg-slate-50 border border-slate-200/70 rounded-lg text-xs text-slate-700 transition-all"
                              >
                                <span className="font-semibold text-slate-800">Khối {item.grade}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${getSystemBadgeStyle(item.educationSystem)}`}>
                                  {item.educationSystem}
                                </span>
                                {(!isFilteringByBatch || !asBatchId) && item.batch?.name && (
                                  <span className="text-[10px] text-slate-400 max-w-[80px] truncate" title={item.batch.name}>
                                    • {item.batch.name}
                                  </span>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => confirmDeleteAssigns(
                                      [item.id],
                                      `phân công ${group.subjectName} - Khối ${item.grade} (${item.educationSystem})`
                                    )}
                                    title="Xóa phân công này"
                                    className="p-0.5 text-slate-300 hover:text-rose-500 rounded transition-colors cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Right Column (7/12): Bước 2 - Phạm vi Phân công & Xác nhận */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-[#005854] to-[#00736E] px-5 py-3.5 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-white text-[#003B3A] flex items-center justify-center text-xs font-black shadow-2xs">2</span>
              <h2 className="font-bold text-white text-sm">Phạm vi Phân công & Xác nhận</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-xs text-white font-semibold">
                {asSelSubjects.length} môn • {asSelGrades.length} khối • {asSelSystems.length} hệ
              </span>
              {(asSelSubjects.length > 0 || asSelGrades.length > 0 || asSelSystems.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setAsSelSubjects([])
                    setAsSelGrades([])
                    setAsSelSystems([])
                  }}
                  title="Đặt lại lựa chọn phạm vi"
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="p-5 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-5">
              {/* 1. Môn khảo sát */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#003B3A] flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#00736E]" />
                    <span>Môn khảo sát</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setAsSelSubjects(asSelSubjects.length === initialSubjects.length ? [] : initialSubjects.map(s => s.id))}
                    className="text-xs font-bold text-[#00736E] hover:text-[#003B3A] hover:underline cursor-pointer"
                  >
                    {asSelSubjects.length === initialSubjects.length ? "Bỏ chọn tất cả" : "Chọn tất cả môn"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {initialSubjects.map(sub => {
                    const isSel = asSelSubjects.includes(sub.id)
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setAsSelSubjects(p => p.includes(sub.id) ? p.filter(x => x !== sub.id) : [...p, sub.id])}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer border ${
                          isSel
                            ? "bg-[#00736E] border-[#00736E] text-white font-bold shadow-xs"
                            : "bg-white border-slate-200/90 text-slate-700 hover:border-teal-300 hover:bg-teal-50/40 font-medium"
                        }`}
                      >
                        {isSel && <Check className="w-3.5 h-3.5 text-teal-200 shrink-0" />}
                        <span>{sub.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 2. Khối đăng ký & Hệ học */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
                {/* Grades (7/12) */}
                <div className="sm:col-span-7 p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#003B3A] flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#00736E]" />
                      <span>Khối lớp</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2.5">
                      {gradesWithStudents.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setAsSelGrades(gradesWithStudents)}
                          className="text-[11px] font-bold text-[#00A19A] hover:text-[#005854] hover:underline cursor-pointer"
                        >
                          Khối có HS ({gradesWithStudents.length})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setAsSelGrades(asSelGrades.length === activeGrades.length ? [] : activeGrades)}
                        className="text-xs font-bold text-[#00736E] hover:underline cursor-pointer"
                      >
                        {asSelGrades.length === activeGrades.length ? "Bỏ chọn" : "Chọn hết"}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {activeGrades.map(g => {
                      const isSel = asSelGrades.includes(g)
                      const count = studentStats[g]?.length || 0
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setAsSelGrades(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g])}
                          className={`relative py-2 px-1.5 rounded-xl text-xs transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                            isSel
                              ? "bg-[#00736E] border-[#00736E] text-white font-bold shadow-xs"
                              : count > 0
                              ? "bg-white border-teal-200/90 text-slate-800 hover:border-[#00736E] font-semibold"
                              : "bg-white/70 border-slate-200/70 text-slate-400 hover:border-slate-300 font-normal"
                          }`}
                        >
                          <span>Khối {g}</span>
                          {asPeriodId && (
                            <span className={`text-[10px] leading-none font-semibold ${
                              isSel ? "text-teal-100" : count > 0 ? "text-[#00736E]" : "text-slate-300"
                            }`}>
                              {count} HS
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Systems (5/12) */}
                <div className="sm:col-span-5 p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#003B3A] flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-[#00736E]" />
                        <span>Hệ đào tạo</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setAsSelSystems(asSelSystems.length === currentEduSystems.length ? [] : currentEduSystems.map((es: any) => es.code))}
                        className="text-xs font-bold text-[#00736E] hover:underline cursor-pointer"
                      >
                        {asSelSystems.length === currentEduSystems.length ? "Bỏ chọn" : "Chọn hết"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {currentEduSystems.map((es: any) => {
                        const isSel = asSelSystems.includes(es.code)
                        return (
                          <button
                            key={es.code}
                            type="button"
                            onClick={() => setAsSelSystems(p => p.includes(es.code) ? p.filter(x => x !== es.code) : [...p, es.code])}
                            className={`py-2.5 px-3 rounded-xl text-xs transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                              isSel
                                ? "bg-[#003B3A] border-[#003B3A] text-white font-bold shadow-xs"
                                : "bg-white border-slate-200/90 text-slate-700 hover:border-teal-300 hover:bg-teal-50/40 font-semibold"
                            }`}
                          >
                            {isSel && <Check className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />}
                            <span>{es.code}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Tóm tắt nhanh tổ hợp */}
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Tổ hợp tạo mới:</span>
                    <strong className="text-[#005854] font-bold">{totalCombinations} bản ghi</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Integrated Action Footer inside Right Card */}
            <div className="pt-4 mt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 hover:text-slate-900 transition-colors">
                <input 
                  type="checkbox" 
                  checked={autoSendEmailOnAssign} 
                  onChange={e => setAutoSendEmailOnAssign(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 focus:ring-teal-500 cursor-pointer accent-[#00736E]"
                />
                <Mail className="w-3.5 h-3.5 text-[#00736E] shrink-0" />
                <span>Tự động gửi email kèm DS học sinh sau khi lưu</span>
              </label>

              <button
                type="button"
                onClick={submitAssignment}
                disabled={asSubmitting || !canCreate}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#003B3A] via-[#005854] to-[#00736E] hover:from-[#005854] hover:to-[#00A19A] active:scale-[0.99] text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-teal-900/10 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {asSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                <span>Xác nhận Phân công {totalCombinations > 0 ? `(${totalCombinations})` : ""}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── BẢNG TỔNG HỢP DANH SÁCH ĐÃ PHÂN CÔNG ─── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Header Frame */}
        <div className="bg-gradient-to-r from-[#003B3A]/5 via-[#00736E]/5 to-transparent border-b border-slate-200/70 px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00736E] text-white flex items-center justify-center shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#003B3A]">Danh sách Giáo viên Đã Phân công</h3>
                {asPeriodId && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00A19A]/15 text-[#005854] border border-[#00A19A]/25">
                    {groupedAssignments.length} giáo viên
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-normal">Quản lý phạm vi chấm khảo sát, xem danh sách học sinh phụ trách và gửi thông báo</p>
            </div>
          </div>

          {asPeriodId && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Tìm nhanh trong bảng phân công */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={assignTableSearch}
                  onChange={e => setAssignTableSearch(e.target.value)}
                  placeholder="Tìm GV, môn học, khối..."
                  className="w-full bg-white border border-slate-200/80 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-700 outline-none focus:border-[#00736E] transition-colors shadow-2xs"
                />
                {assignTableSearch && (
                  <button
                    type="button"
                    onClick={() => setAssignTableSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#00736E]" />
                <span className="text-xs text-slate-600 font-semibold">Đợt:</span>
                <select
                  value={asFilterBatchId || "all"}
                  onChange={e => setAsFilterBatchId(e.target.value)}
                  className="bg-white border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[#00736E] transition-colors shadow-2xs cursor-pointer min-w-[160px]"
                >
                  <option value="all">-- Tất cả các đợt của kỳ --</option>
                  {asSelPeriod?.batches?.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.id === latestBatch?.id ? "(Mới nhất)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {(asFilterBatchId || groupedAssignments.length > 0) && (
                <button
                  type="button"
                  onClick={sendAllNotifications}
                  disabled={asNotifyingAll || groupedAssignments.length === 0 || !canUpdate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00736E] hover:bg-[#005854] active:scale-[0.99] text-white text-xs font-bold rounded-xl transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                  title="Gửi email thông báo phân công cho tất cả giáo viên"
                >
                  {asNotifyingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  <span>Gửi email hàng loạt</span>
                </button>
              )}
            </div>
          )}
        </div>

        {!asPeriodId ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6 text-[#00736E]" />
            </div>
            <p className="font-bold text-slate-700 text-sm">Vui lòng chọn Kỳ khảo sát</p>
            <p className="text-xs text-slate-400 mt-1 font-normal">Chọn một kỳ khảo sát ở phía trên để hiển thị danh sách phân công</p>
          </div>
        ) : asLoading ? (
          <Spin />
        ) : groupedAssignments.length === 0 ? (
          <Empty icon={UserPlus} text="Chưa có phân công nào phù hợp" sub="Sử dụng khung Phân công bên trên để giao nhiệm vụ cho giáo viên" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#003B3A]/[0.03] border-b border-slate-200/80 text-[#003B3A]">
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider w-12 text-center">#</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Giáo viên phụ trách</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Môn khảo sát</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Khối lớp</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Hệ đào tạo</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider text-center">Học sinh</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedAssignments.map((a, idx) => {
                  const assignedStudents = getAssignedStudentsForGroup(a)
                  const isCurrentSelectedTeacher = asTeacherId === a.userId
                  return (
                    <tr
                      key={a.id}
                      className={`transition-colors ${
                        isCurrentSelectedTeacher ? "bg-teal-50/40 hover:bg-teal-50/70" : "hover:bg-slate-50/70"
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-400 text-center font-semibold">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200/70 text-[#005854] flex items-center justify-center text-xs font-bold shrink-0">
                            {getInitials(a.user?.fullName)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{a.user?.fullName}</p>
                            <p className="text-[11px] text-slate-400 font-normal mt-0.5">{a.batch?.name || "Tất cả đợt"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {a.subjects.map((sub: string) => (
                            <span key={sub} className="px-2.5 py-0.5 bg-teal-50 border border-teal-200/70 text-[#005854] rounded-lg text-[11px] font-semibold">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {a.grades.map((g: string) => (
                            <span key={g} className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md">
                              Khối {g}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {a.educationSystems.map((sys: string) => (
                            <span key={sys} className={`text-[10px] font-bold uppercase border px-2 py-0.5 rounded-md ${getSystemBadgeStyle(sys)}`}>
                              {sys}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          type="button"
                          onClick={() => setViewingStudentAssignment(a)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 hover:bg-[#00736E] text-[#005854] hover:text-white border border-teal-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Xem danh sách học sinh theo đợt & Gửi mail"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{assignedStudents.length} HS</span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <a 
                            href={`/teacher/input-assessments?periodId=${asPeriodId}&batchId=${a.batchId || ""}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-[#00736E] hover:bg-teal-50 rounded-lg transition-colors" 
                            title="Mở giao diện chấm khảo sát của đợt này"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setViewingStudentAssignment(a)}
                            disabled={asNotifyingId === a.id || !canUpdate}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                            title="Xem danh sách học sinh & Gửi email thông báo"
                          >
                            {asNotifyingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditAssignment(a)}
                            disabled={!canUpdate}
                            className="p-1.5 text-slate-400 hover:text-[#00736E] hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                            title="Nạp lên form để chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirm({ msg: `Xóa phân công của GV ${a.user?.fullName}?`, fn: () => deleteAssignment(a.ids) })}
                            disabled={!canDelete}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                            title="Xóa phân công"
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

      {/* Modal Xem Danh Sách Học Sinh & Gửi Mail Phân Công */}
      {viewingStudentAssignment && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setViewingStudentAssignment(null)} />
          <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between bg-gradient-to-r from-[#003B3A] to-[#005854] text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">
                      Danh sách Học sinh phụ trách — {viewingStudentAssignment.user?.fullName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00A19A] text-white">
                      {getAssignedStudentsForGroup(viewingStudentAssignment).length} HS
                    </span>
                  </div>
                  <p className="text-xs text-teal-100/90 font-normal mt-0.5">
                    Đợt: <span className="text-white font-semibold">{viewingStudentAssignment.batch?.name || "Tất cả đợt"}</span> • 
                    Môn: <span className="text-teal-200 font-semibold">{viewingStudentAssignment.subjects.join(", ")}</span> • 
                    Khối: <span className="text-white font-semibold">{viewingStudentAssignment.grades.join(", ")}</span> • 
                    Hệ: <span className="text-white font-semibold">{viewingStudentAssignment.educationSystems.join(", ")}</span>
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setViewingStudentAssignment(null)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Action Bar */}
            <div className="px-6 py-3 bg-teal-50/50 border-b border-teal-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#00736E]" />
                Bấm <strong>Nhập kết quả</strong> để mở trực tiếp form chấm của học sinh, hoặc mở toàn bộ đợt khảo sát.
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`/teacher/input-assessments?periodId=${asPeriodId}&batchId=${viewingStudentAssignment.batchId || ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#00736E]" />
                  <span>Dẫn tới Đợt</span>
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    await sendTeacherNotification(viewingStudentAssignment)
                  }}
                  disabled={asNotifyingId === viewingStudentAssignment.id || !canUpdate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00736E] hover:bg-[#005854] text-white text-xs font-bold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {asNotifyingId === viewingStudentAssignment.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  <span>Gửi Email kèm DS</span>
                </button>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="p-5 overflow-y-auto flex-1">
              {getAssignedStudentsForGroup(viewingStudentAssignment).length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="font-bold text-slate-600 text-sm">Chưa có học sinh nào</p>
                  <p className="text-xs text-slate-400 mt-1">Không tìm thấy học sinh thuộc khối/hệ được phân công trong đợt này.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200/70 text-[#003B3A]">
                      <th className="px-3.5 py-2.5 font-bold text-[11px] uppercase tracking-wider w-10 text-center">#</th>
                      <th className="px-3.5 py-2.5 font-bold text-[11px] uppercase tracking-wider w-24">Mã HS</th>
                      <th className="px-3.5 py-2.5 font-bold text-[11px] uppercase tracking-wider">Họ và tên</th>
                      <th className="px-3.5 py-2.5 font-bold text-[11px] uppercase tracking-wider text-center w-24">Khối</th>
                      <th className="px-3.5 py-2.5 font-bold text-[11px] uppercase tracking-wider text-center w-24">Hệ</th>
                      <th className="px-3.5 py-2.5 font-bold text-[11px] uppercase tracking-wider text-right w-36">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getAssignedStudentsForGroup(viewingStudentAssignment).map((st: any, sIdx: number) => {
                      const sysCode = st.surveySystem || st.surveyFormType || "Tiêu chuẩn"
                      const directLink = `/teacher/input-assessments?periodId=${asPeriodId}&batchId=${viewingStudentAssignment.batchId || ""}&grade=${encodeURIComponent(st.grade || "")}&studentCode=${encodeURIComponent(st.studentCode)}&studentId=${st.id}&autoOpen=true`
                      return (
                        <tr key={st.id || sIdx} className="hover:bg-teal-50/30 transition-colors">
                          <td className="px-3.5 py-2.5 text-center text-slate-400 font-normal">{sIdx + 1}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[#00736E] font-bold">{st.studentCode}</td>
                          <td className="px-3.5 py-2.5 font-bold text-slate-800">{st.fullName}</td>
                          <td className="px-3.5 py-2.5 text-center text-slate-600 font-medium">Khối {st.grade || "—"}</td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[#005854] border border-teal-200/70 text-[10px] font-bold">
                              {sysCode}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <a
                              href={directLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-[#00736E] text-[#005854] hover:text-white border border-teal-200/80 rounded-lg text-xs font-bold transition-colors"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Nhập kết quả</span>
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-200/70 flex items-center justify-end">
              <button 
                type="button"
                onClick={() => setViewingStudentAssignment(null)}
                className="px-4 py-1.5 bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
