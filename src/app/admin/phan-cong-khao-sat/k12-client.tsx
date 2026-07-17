"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  UserCheck, GraduationCap, BookOpen, Layers, Search, Trash2,
  Mail, Edit2, Loader2, Filter, Calendar, UserPlus, CheckCircle2,
  AlertCircle, X, Plus, RefreshCw, Users
} from "lucide-react"

// ─── Helpers ───
function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div className={`fixed top-5 right-5 z-[400] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold animate-in slide-in-from-top-3 duration-300 ${type === "ok" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
      {type === "ok" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      {msg}
    </div>
  )
}

function Spin() {
  return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin opacity-50" /></div>
}

function Empty({ icon: Icon, text, sub }: { icon: any; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 flex items-center justify-center mb-5 text-xs font-semibold"><Icon className="w-10 h-10 text-slate-200" /></div>
      <p className="font-black text-slate-400 text-lg">{text}</p>
      {sub && <p className="text-xs text-slate-300 mt-1 font-bold uppercase tracking-widest">{sub}</p>}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-0.5 text-xs font-semibold text-slate-600 ml-1">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inp = "w-full bg-white border border-slate-200 rounded-xl pl-4 pr-4 py-3 text-sm font-semibold text-slate-700 outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cpath%20stroke%3D%27%2394a3b8%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%271.5%27%20d%3D%27m6%208%204%204%204-4%27%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:18px_18px] pr-10 focus:ring-4 focus:ring-teal-50 focus:border-[#00A99D] hover:border-slate-300 transition-all placeholder:text-slate-400 shadow-sm"

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
  const canCreate = isAdmin || (rolePermissions.some(p => p.module === "PHAN_CONG_K12" && p.canCreate))
  const canUpdate = isAdmin || (rolePermissions.some(p => p.module === "PHAN_CONG_K12" && p.canUpdate))
  const canDelete = isAdmin || (rolePermissions.some(p => p.module === "PHAN_CONG_K12" && p.canDelete))

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
        const grouped = {}
        students.forEach((s) => {
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
  const [asDeptId, setAsDeptId] = useState("")
  const [asTeacherId, setAsTeacherId] = useState("")
  const [asSelSubjects, setAsSelSubjects] = useState<string[]>([])
  const [asSelGrades, setAsSelGrades] = useState<string[]>([])
  const [asSelSystems, setAsSelSystems] = useState<string[]>([])
  const [asSubmitting, setAsSubmitting] = useState(false)

  // ─── Auto-set period ───
  useEffect(() => {
    if (visiblePeriods.length > 0 && !asPeriodId) {
      setAsPeriodId(visiblePeriods[0].id)
    }
  }, [visiblePeriods, asPeriodId])

  useEffect(() => { setAsFilterBatchId("") }, [asPeriodId])
  useEffect(() => { if (asBatchId) setAsFilterBatchId(asBatchId) }, [asBatchId])

  // ─── Computed ───
  const currentEduSystems = useMemo(() => eduSystems.filter((es: any) => es.academicYearId === yearId), [eduSystems, yearId])
  const filteredTeachers = useMemo(() => asDeptId ? teachers.filter(t => t.departmentId === asDeptId) : teachers, [teachers, asDeptId])
  const asSelPeriod = visiblePeriods.find(p => p.id === asPeriodId)

  const groupedAssignments = useMemo(() => {
    const groups: Record<string, any> = {}
    const targetAssignments = asFilterBatchId ? assignments.filter(a => a.batchId === asFilterBatchId) : []
    targetAssignments.forEach(a => {
      const key = `${a.userId}_${a.batchId}`
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
    return Object.values(groups)
  }, [assignments, asFilterBatchId])

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
  const submitAssignment = async () => {
    if (!canCreate) return
    if (!asPeriodId || !asBatchId || !asTeacherId || !asSelSubjects.length || !asSelGrades.length || !asSelSystems.length) {
      return notify("Vui lòng chọn đầy đủ Kỳ, Đợt, GV, Môn, Khối và Hệ học", "err")
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
        const j = await res.json()
        if (j.emailError) { notify(`Phân công thành công NHƯNG gửi mail thất bại: ${j.emailError}`, "err") } else { notify("Đã hoàn tất phân công và gửi email") }
        fetchAssignments()
        setAsSelSubjects([]); setAsSelGrades([]); setAsSelSystems([])
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

  // ─── RENDER ───
  return (
    <div className="space-y-6 font-sans max-w-[1440px] mx-auto pb-16">
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirm && <ConfirmDialog open={true} onClose={() => setConfirm(null)} onConfirm={confirm.fn} message={confirm.msg} />}

      {/* Header */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0 text-xs font-semibold shadow-md shadow-teal-100">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800 tracking-tight">Phân công K-12</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Giao nhiệm vụ phụ trách môn thi cho giáo viên</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchPeriods} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Config */}
          <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-50/60 border-b border-slate-100 px-6 py-4 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-indigo-100">1</div>
              <h2 className="font-bold text-slate-800 text-sm tracking-tight">Kỳ Khảo sát & Người phụ trách</h2>
            </div>
            <div className="p-6 space-y-6 flex-1">
              <div>
                <div className="space-y-5">
                  <Field label="Kỳ khảo sát" required>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <select value={asPeriodId} onChange={e => { setAsPeriodId(e.target.value); setAsBatchId("") }} className={inp + " pl-10"}>
                        <option value="">-- Chọn Kỳ --</option>
                        {visiblePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </Field>
                  <Field label="Đợt khảo sát" required>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Layers className="w-4 h-4" />
                      </div>
                      <select value={asBatchId} onChange={e => setAsBatchId(e.target.value)} className={inp + " pl-10"} disabled={!asPeriodId}>
                        <option value="">-- Chọn Đợt --</option>
                        {visiblePeriods.find(p => p.id === asPeriodId)?.batches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </Field>

                  {/* Thống kê theo Khối */}
                  {asPeriodId && (
                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/70 space-y-3 animate-in fade-in duration-350">
                      <div className="flex items-center justify-between border-b border-slate-200/40 pb-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#00A99D]" />
                          <span className="text-xs font-bold text-slate-800">Thống kê theo Khối</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {statsLoading && <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin" />}
                          <span className="text-xs font-bold text-slate-500">
                            Tổng: {Object.values(studentStats).reduce((a, b) => a + b.length, 0)} HS
                          </span>
                        </div>
                      </div>
                      {Object.keys(studentStats).length === 0 ? (
                        <div className="text-xs text-slate-400 font-medium text-center py-2">
                          {statsLoading ? "Đang tải dữ liệu..." : "Không có học sinh trong đợt khảo sát này"}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(studentStats).map(([grade, studentsList]) => {
                            const isExpanded = !!expandedGrades[grade];
                            return (
                              <div key={grade} className="border border-slate-200/60 rounded-xl overflow-hidden shadow-sm bg-white">
                                <div 
                                  onClick={() => setExpandedGrades(prev => ({ ...prev, [grade]: !prev[grade] }))}
                                  className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors text-xs"
                                >
                                  <span className="font-bold text-slate-700">Khối {grade}</span>
                                  <div className="flex items-center gap-1.5 font-extrabold text-[#00A99D]">
                                    <span>{studentsList.length} HS</span>
                                    <span className="text-slate-400 font-bold text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                                  </div>
                                </div>
                                {isExpanded && (
                                  <div className="border-t border-slate-100 bg-slate-50/50 p-2.5 max-h-[160px] overflow-y-auto divide-y divide-slate-100/60 text-[11px] animate-in slide-in-from-top-2 duration-200">
                                    {studentsList.map((student: any) => (
                                      <div key={student.id} className="flex justify-between items-center py-1.5 px-1 hover:bg-white rounded transition-colors">
                                        <span className="font-semibold text-slate-700">{student.fullName}</span>
                                        <span className="text-slate-400 font-mono">{student.studentCode}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  <Field label="Lọc theo Tổ chuyên môn (Không bắt buộc)">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Users className="w-4 h-4" />
                      </div>
                      <select value={asDeptId} onChange={e => setAsDeptId(e.target.value)} className={inp + " pl-10"}>
                        <option value="">Tất cả Tổ chuyên môn</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </Field>
                  <Field label="Giáo viên phụ trách" required>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <select value={asTeacherId} onChange={e => setAsTeacherId(e.target.value)} className={inp + " pl-10 bg-slate-50/20 hover:border-teal-300 focus:bg-white"}>
                        <option value="">-- Chọn Giáo viên --</option>
                        {filteredTeachers.map(t => <option key={t.userId} value={t.userId}>{t.teacherName}</option>)}
                      </select>
                    </div>
                  </Field>

                  {/* Hiển thị phân công hiện tại của giáo viên */}
                  {asTeacherId && (() => {
                    const currentTeacherAssigns = assignments.filter(a => a.userId === asTeacherId)
                    return (
                      <div className="p-4 bg-teal-50/30 border border-teal-100/50 rounded-2xl space-y-2.5 animate-in fade-in duration-300">
                        <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-[#00A99D]" /> 
                          <span>Phân công hiện tại của GV</span>
                        </div>
                        {currentTeacherAssigns.length === 0 ? (
                          <div className="text-xs text-slate-400 italic pl-5">Chưa có phân công nào trong đợt này.</div>
                        ) : (
                          <div className="flex flex-wrap gap-2 pl-5">
                            {currentTeacherAssigns.map((a) => (
                              <span key={a.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-teal-100/80 rounded-xl text-xs font-semibold text-slate-700 shadow-sm">
                                <span className="font-bold text-[#00A99D]">{a.subject?.name}</span>
                                <span className="text-slate-300">•</span>
                                <span>Khối {a.grade}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-amber-600 text-[10px] font-bold uppercase">{a.educationSystem}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Scope */}
          <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-50/60 border-b border-slate-100 px-6 py-4 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-emerald-100">2</div>
              <h2 className="font-bold text-slate-800 text-sm tracking-tight">Phạm vi Phân công</h2>
            </div>
            <div className="p-6 space-y-6 flex-1">
              <div>
                <div className="space-y-8">
                  {/* Subjects */}
                  <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" /> Môn khảo sát *</label>
                      <button onClick={() => setAsSelSubjects(asSelSubjects.length === initialSubjects.length ? [] : initialSubjects.map(s => s.id))} className="text-[10px] font-black text-indigo-500 hover:bg-indigo-50 uppercase tracking-wider transition-colors text-xs font-semibold">
                        {asSelSubjects.length === initialSubjects.length ? "Bỏ chọn hết" : "Chọn tất cả"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {initialSubjects.map(sub => (
                        <button key={sub.id} onClick={() => setAsSelSubjects(p => p.includes(sub.id) ? p.filter(x => x !== sub.id) : [...p, sub.id])}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${asSelSubjects.includes(sub.id) ? "bg-[#00A99D] border-[#00A99D] text-white shadow-md shadow-teal-100/40" : "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-800"}`}>
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Grades */}
                    <div className="p-6 text-xs font-semibold">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers className="w-3.5 h-3.5" /> Khối *</label>
                        <button onClick={() => setAsSelGrades(asSelGrades.length === activeGrades.length ? [] : activeGrades)} className="text-[9px] font-black text-emerald-600 text-xs font-semibold">Chọn hết</button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {activeGrades.map(g => (
                          <button key={g} onClick={() => setAsSelGrades(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g])}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all ${asSelGrades.includes(g) ? "bg-[#00A99D] border-[#00A99D] text-white shadow-md shadow-teal-100/40" : "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-800"}`}>
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Systems */}
                    <div className="p-6 text-xs font-semibold">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" /> Hệ học *</label>
                        <button onClick={() => setAsSelSystems(asSelSystems.length === currentEduSystems.length ? [] : currentEduSystems.map((es: any) => es.code))} className="text-[9px] font-black text-amber-600 text-xs font-semibold">Chọn hết</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentEduSystems.map((es: any) => (
                          <button key={es.code} onClick={() => setAsSelSystems(p => p.includes(es.code) ? p.filter(x => x !== es.code) : [...p, es.code])}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${asSelSystems.includes(es.code) ? "bg-slate-800 border-slate-800 text-white shadow-md shadow-slate-200" : "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-800"}`}>
                            {es.code}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center -mt-3">
          <button onClick={submitAssignment} disabled={asSubmitting || !canCreate}
            className="group flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-[#00A99D] to-[#009085] text-white rounded-[2rem] font-black text-base hover:from-[#009085] hover:to-[#007068] hover:scale-105 transition-all shadow-2xl shadow-teal-100 disabled:opacity-50 cursor-pointer">
            {asSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserPlus className="w-6 h-6 group-hover:rotate-12 transition-all" />}
            Xác nhận Phân công cho Giáo viên
          </button>
        </div>

        {/* Assignment List */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Search className="w-5 h-5 text-indigo-500" /> Danh sách đã Phân công</h3>
              {asFilterBatchId && <span className="text-indigo-600 text-xs font-black text-xs font-semibold">{groupedAssignments.length} nhóm phân công</span>}
            </div>
            {asPeriodId && (
              <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lọc đợt:</span>
                  <select value={asFilterBatchId} onChange={e => setAsFilterBatchId(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm cursor-pointer min-w-[150px]">
                    <option value="">-- Chọn Đợt --</option>
                    {asSelPeriod?.batches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                {asFilterBatchId && (
                  <button onClick={sendAllNotifications} disabled={asNotifyingAll || groupedAssignments.length === 0 || !canUpdate}
                    className="flex items-center gap-1.5 text-white text-xs font-black hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 text-xs font-semibold"
                    title="Gửi email thông báo phân công cho tất cả giáo viên">
                    {asNotifyingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    Gửi email hàng loạt
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
            {!asFilterBatchId ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 flex items-center justify-center mb-4 text-xs font-semibold"><Filter className="w-8 h-8 text-[#00A99D]" /></div>
                <p className="font-black text-slate-500 text-sm">Vui lòng chọn Đợt lọc</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Chọn một Đợt ở bộ lọc phía trên để hiển thị danh sách giáo viên đã được phân công</p>
              </div>
            ) : asLoading ? <Spin /> : assignments.length === 0 ? (
              <Empty icon={UserPlus} text="Chưa có phân công nào" sub="Sử dụng form bên trên để tiến hành phân công GV" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                      <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                      <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giáo viên</th>
                      <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Môn học</th>
                      <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khối</th>
                      <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hệ học</th>
                      <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedAssignments.map((a, idx) => (
                      <tr key={a.id} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                        <td className="px-3 py-2 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <p className="font-black text-slate-700">{a.user?.fullName}</p>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{a.batch?.name || "Tất cả đợt"}</p>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {a.subjects.map((sub: string) => (
                              <span key={sub} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[10px] font-black text-indigo-600">{sub}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {a.grades.map((g: string) => (
                              <span key={g} className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{g}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {a.educationSystems.map((sys: string) => (
                              <span key={sys} className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">{sys}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => sendTeacherNotification(a)} disabled={asNotifyingId === a.id || !canUpdate}
                              className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-30" title="Gửi email thông báo">
                              {asNotifyingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => openEditAssignment(a)} disabled={!canUpdate}
                              className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setConfirm({ msg: `Xóa phân công của GV ${a.user?.fullName}?`, fn: () => deleteAssignment(a.ids) })} disabled={!canDelete}
                              className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
