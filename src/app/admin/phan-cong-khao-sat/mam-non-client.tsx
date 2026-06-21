"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  UserCheck, Baby, Settings, Search, Trash2,
  Mail, Loader2, Filter, Calendar, CheckCircle2,
  AlertCircle, X, RefreshCw, Users, Info
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
  return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-teal-500 animate-spin opacity-50" /></div>
}

function Empty({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-5 border-2 border-dashed border-slate-200"><UserCheck className="w-10 h-10 text-slate-200" /></div>
      <p className="font-black text-slate-400 text-lg">{text}</p>
      {sub && <p className="text-xs text-slate-300 mt-1 font-bold uppercase tracking-widest">{sub}</p>}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inp = "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 transition-all placeholder:text-slate-300 shadow-sm"
const TEAL = "#00A99D"

interface ConfirmState { msg: string; fn: () => void }
function ConfirmDialog({ open, onClose, onConfirm, message }: { open: boolean; onClose: () => void; onConfirm: () => void; message: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-7 h-7 text-rose-600" /></div>
        <h3 className="text-base font-black text-slate-800 mb-2">Xác nhận</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50">Hủy</button>
          <button onClick={() => { onConfirm(); onClose() }} className="flex-1 py-3 bg-rose-600 text-white rounded-2xl text-sm font-bold hover:bg-rose-700 shadow-lg">Xác nhận</button>
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
  campuses: any[]
  grades: string[]
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
  const [aBatchId, setABatchId] = useState("all")
  const [aGrades, setAGrades] = useState<string[]>(["18 đến 24 tháng"])
  const [aDeptId, setADeptId] = useState("")
  const [aSelectedTeachers, setASelectedTeachers] = useState<string[]>([])
  const [aSearchTeacher, setASearchTeacher] = useState("")
  const [assignments, setAssignments] = useState<any[]>([])
  const [assignLoading, setAssignLoading] = useState(false)
  const [aSaving, setASaving] = useState(false)
  const [aNotifyingId, setANotifyingId] = useState<string | null>(null)
  const [aNotifyingAll, setANotifyingAll] = useState(false)

  // ─── Student stats state ───
  const [studentStats, setStudentStats] = useState<Record<string, number>>({})
  const [statsLoading, setStatsLoading] = useState(false)

  const fetchStudentStats = useCallback(async () => {
    if (!aPeriodId) {
      setStudentStats({})
      return
    }
    setStatsLoading(true)
    try {
      let url = `/api/preschool-input-assessment-students?periodId=${aPeriodId}`
      if (aBatchId && aBatchId !== "all") url += `&batchId=${aBatchId}`
      const res = await fetch(url)
      if (res.ok) {
        const students = await res.json()
        const counts = {}
        students.forEach((s) => {
          const g = s.grade || "Chưa xác định"
          counts[g] = (counts[g] || 0) + 1
        })
        setStudentStats(counts)
      } else {
        setStudentStats({})
      }
    } catch (e) {
      console.error(e)
      setStudentStats({})
    } finally {
      setStatsLoading(false)
    }
  }, [aPeriodId, aBatchId])

  useEffect(() => {
    fetchStudentStats()
  }, [fetchStudentStats])

  // ─── Auto-set period ───
  useEffect(() => {
    if (periods.length > 0 && !aPeriodId) {
      setAPeriodId(periods[0].id)
    }
  }, [periods, aPeriodId])

  // ─── Computed ───
  const aActiveBatch = useMemo(() => {
    if (!aPeriodId || !aBatchId || aBatchId === "all") return null
    return periods.find(p => p.id === aPeriodId)?.batches?.find((b: any) => b.id === aBatchId)
  }, [periods, aPeriodId, aBatchId])

  const aGradesStr = aGrades.join(",")

  // ─── Fetch Assignments ───
  const fetchAssignments = useCallback(async () => {
    if (!aPeriodId) return
    setAssignLoading(true)
    try {
      let url = `/api/preschool-input-assessment-assignments?periodId=${aPeriodId}`
      if (aBatchId && aBatchId !== "all") url += `&batchId=${aBatchId}`
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

  // ─── Actions ───
  const saveAssignments = async () => {
    if (!aPeriodId || aGrades.length === 0) return notify("Vui lòng chọn đầy đủ Kỳ khảo sát và ít nhất một Nhóm tuổi", "err")
    setASaving(true)
    try {
      const res = await fetch("/api/preschool-input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ASSIGN", periodId: aPeriodId, batchId: aBatchId, grade: aGrades, userIds: aSelectedTeachers })
      })
      if (res.ok) { notify("Lưu phân công giáo viên thành công!"); fetchAssignments() }
      else notify("Lỗi khi lưu phân công", "err")
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
    if (!canUpdate || assignments.length === 0) return notify("Không có giáo viên nào để gửi thông báo", "err")
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
      if (res.ok) { notify(`Đã hủy phân công cho GV ${teacherName}`); fetchAssignments() }
      else { notify("Lỗi khi hủy phân công", "err") }
    } catch { notify("Lỗi", "err") }
  }

  // Stage mapping
  const stageMappings = useMemo(() => {
    if (!aActiveBatch) return null
    const dateObj = new Date(aActiveBatch.startDate)
    const isStage2 = !isNaN(dateObj.getTime()) && dateObj.getMonth() >= 0 && dateObj.getMonth() <= 4
    const stageTitle = isStage2 ? "Giai đoạn 2 (01/01 - 31/05)" : "Giai đoạn 1 (01/06 - 31/12)"
    const mappings = isStage2 ? [
      { form: "12 đến 18 tháng", actual: "12 đến 18 tháng" },
      { form: "18 đến 24 tháng", actual: "18 đến 24 tháng" },
      { form: "24 đến 36 tháng", actual: "24 đến 36 tháng" },
      { form: "3 đến 4 tuổi", actual: "Mẫu giáo bé" },
      { form: "4 đến 5 tuổi", actual: "Mẫu giáo nhỡ" },
      { form: "5 đến 6 tuổi", actual: "Mẫu giáo lớn" },
    ] : [
      { form: "12 đến 18 tháng", actual: "12 đến 18 tháng" },
      { form: "18 đến 24 tháng", actual: "18 đến 24 tháng & 24 đến 36 tháng" },
      { form: "24 đến 36 tháng", actual: "Mẫu giáo bé" },
      { form: "3 đến 4 tuổi", actual: "Mẫu giáo nhỡ" },
      { form: "4 đến 5 tuổi", actual: "Mẫu giáo lớn" },
    ]
    return { stageTitle, mappings }
  }, [aActiveBatch])

  // ─── RENDER ───
  return (
    <div className="space-y-6 font-sans max-w-[1440px] mx-auto pb-16">
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirm && <ConfirmDialog open={true} onClose={() => setConfirm(null)} onConfirm={confirm.fn} message={confirm.msg} />}

      {/* Header */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: TEAL }}>
            <Baby className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800 tracking-tight">Phân công Mầm non</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Giao nhiệm vụ phụ trách khảo sát cho giáo viên mầm non</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchPeriods} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={sendAllNotifications} disabled={aNotifyingAll || assignments.length === 0 || !canUpdate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-black rounded-xl text-white disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(to right, #a855f7, #ec4899)" }}>
            {aNotifyingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Gửi thông báo tất cả
          </button>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select value={yearId} onChange={e => { setYearId(e.target.value); setAPeriodId(""); setAssignments([]) }}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer max-w-[160px]">
              {academicYears.filter(ay => !ay.isOff).map(ay => (
                <option key={ay.id} value={ay.id}>Năm học {ay.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">


        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Config + Teacher Selector */}
          <div className="lg:col-span-5 space-y-4">
            {/* Config Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Settings className="w-4 h-4" style={{ color: TEAL }} /> Cấu hình Phân công
              </h3>

              <div className="space-y-3">
                <Field label="Kỳ Khảo sát" required>
                  <select value={aPeriodId} onChange={e => setAPeriodId(e.target.value)} className={inp}>
                    <option value="">-- Chọn kỳ khảo sát --</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                  </select>
                </Field>

                <Field label="Đợt Khảo sát">
                  <select value={aBatchId} onChange={e => setABatchId(e.target.value)} className={inp}>
                    <option value="all">Tất cả các đợt</option>
                    {periods.find(p => p.id === aPeriodId)?.batches?.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </Field>

                {/* Thống kê Nhóm tuổi */}
                {aPeriodId && (
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 space-y-3 animate-in fade-in duration-350">
                    <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" style={{ color: TEAL }} />
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Thống kê Nhóm tuổi</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {statsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: TEAL }} />}
                        <span className="text-[10px] font-black text-slate-500">
                          Tổng: {Object.values(studentStats).reduce((a, b) => a + b, 0)} bé
                        </span>
                      </div>
                    </div>
                    {Object.keys(studentStats).length === 0 ? (
                      <div className="text-[11px] text-slate-400 font-semibold text-center py-2">
                        {statsLoading ? "Đang tải dữ liệu..." : "Không có học sinh trong đợt khảo sát này"}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(studentStats).map(([grade, count]) => (
                          <div key={grade} className="flex items-center justify-between bg-white border border-slate-100 px-3 py-2.5 rounded-xl text-xs shadow-sm">
                            <span className="font-bold text-slate-600 truncate mr-2" title={grade}>{grade}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${TEAL}12`, color: TEAL }}>
                              {count} bé
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Stage mapping display */}
                {stageMappings && (
                  <div className="rounded-xl p-4 space-y-3 border-l-4 border-y border-r border-slate-100 animate-in fade-in duration-300" style={{ borderLeftColor: TEAL, background: `${TEAL}08` }}>
                    <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: `${TEAL}20` }}>
                      <Calendar className="w-4 h-4" style={{ color: TEAL }} />
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Ánh xạ Nhóm tuổi ({stageMappings.stageTitle})</span>
                    </div>
                    <div className="space-y-1.5">
                      {stageMappings.mappings.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-100 text-xs">
                          <span className="font-bold text-slate-700 w-36">{m.form}</span>
                          <span className="text-slate-300">→</span>
                          <span className="font-black" style={{ color: TEAL }}>{m.actual}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!aActiveBatch && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-500 font-medium flex items-start gap-2">
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p>Chọn một Đợt Khảo sát cụ thể để hiển thị bảng ánh xạ nhóm tuổi tương ứng.</p>
                  </div>
                )}

                <Field label="Nhóm tuổi (Khối)" required>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {grades.map(g => {
                      const isChecked = aGrades.includes(g)
                      return (
                        <label key={g} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs ${isChecked ? "font-extrabold shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                          style={isChecked ? { background: `${TEAL}10`, borderColor: TEAL, color: TEAL } : {}}>
                          <input type="checkbox" checked={isChecked}
                            onChange={() => setAGrades(prev => isChecked ? prev.filter(x => x !== g) : [...prev, g])}
                            className="w-4 h-4 rounded cursor-pointer" />
                          <span>{g}</span>
                        </label>
                      )
                    })}
                  </div>
                </Field>
              </div>
            </div>

            {/* Teacher Selector */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Users className="w-4 h-4" style={{ color: TEAL }} /> Danh sách Giáo viên
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{ background: `${TEAL}10`, color: TEAL }}>
                  Đã chọn {aSelectedTeachers.length}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Lọc theo Tổ Chuyên môn</label>
                <select value={aDeptId} onChange={e => setADeptId(e.target.value)} className={inp}>
                  <option value="">Tất cả Tổ Chuyên môn</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Tìm theo tên hoặc mã GV..."
                  value={aSearchTeacher} onChange={e => setASearchTeacher(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none text-sm font-medium text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-teal-100 transition-all" />
                {aSearchTeacher && (
                  <button onClick={() => setASearchTeacher("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1.5">
                {teachers
                  .filter(t => t.user)
                  .filter(t => !aDeptId || t.departmentId === aDeptId)
                  .filter(t => !aSearchTeacher || (t.teacherName || "").toLowerCase().includes(aSearchTeacher.toLowerCase()) || (t.teacherCode || "").toLowerCase().includes(aSearchTeacher.toLowerCase()))
                  .map(t => {
                    const userId = t.user.id
                    const isChecked = aSelectedTeachers.includes(userId)
                    const teacherAssigns = assignments.filter(a => a.userId === userId)
                    return (
                      <label key={t.id} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${isChecked ? "border-slate-200/80 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/30"}`}
                        style={isChecked ? { background: `${TEAL}05` } : {}}>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={isChecked}
                            onChange={() => setASelectedTeachers(prev => isChecked ? prev.filter(id => id !== userId) : [...prev, userId])}
                            className="w-4 h-4 rounded cursor-pointer" />
                          <div>
                            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              <span>{t.teacherName}</span>
                              {t.departmentRel?.name && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider" style={{ background: `${TEAL}10`, color: TEAL }}>
                                  {t.departmentRel.name}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">{t.teacherCode} • {t.email || t.user.email}</div>
                            
                            {/* Hiển thị phân công hiện tại */}
                            {teacherAssigns.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {teacherAssigns.map((assign: any) => (
                                  <span key={assign.id} className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-slate-100 text-slate-500 bg-slate-50">
                                    {assign.grade}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {isChecked && <CheckCircle2 className="w-4 h-4 animate-in zoom-in-50 duration-200" style={{ color: TEAL }} />}
                      </label>
                    )
                  })}
              </div>

              <button onClick={saveAssignments} disabled={aSaving || !aPeriodId || !canCreate}
                className="w-full py-3.5 text-white font-black rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: TEAL }}>
                {aSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                Lưu Phân công Giáo viên
              </button>
            </div>
          </div>

          {/* Right: Assigned Teachers List */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4 h-full min-h-[500px]">
              <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <UserCheck className="w-4 h-4" style={{ color: TEAL }} /> Giáo viên đang được phân công ({assignments.length})
              </h3>

              {assignLoading ? <Spin /> : assignments.length === 0 ? (
                <Empty text="Chưa có giáo viên nào được phân công" sub="Chọn giáo viên bên trái và bấm Lưu Phân công để bắt đầu" />
              ) : (
                <div className="space-y-3">
                  {assignments.map((assign: any) => {
                    const t = teachers.find(teach => teach.user?.id === assign.userId)
                    const tName = t?.teacherName || assign.user?.fullName || "Chưa có tên"
                    const tCode = t?.teacherCode || "GV000"
                    const tEmail = t?.email || assign.user?.email || "—"
                    const isNotifying = aNotifyingId === assign.id

                    return (
                      <div key={assign.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-200 hover:bg-white hover:shadow-sm transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white" style={{ background: TEAL }}>
                            {tName.split(" ").slice(-1)[0].charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                              <span>{tName}</span>
                              {t?.departmentRel?.name && (
                                <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded tracking-wider">{t.departmentRel.name}</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-semibold">{tCode} • {tEmail}</div>
                            <div className="flex gap-1.5 mt-1 items-center">
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider" style={{ background: `${TEAL}10`, color: TEAL }}>
                                {assign.grade}
                              </span>
                              {assign.batch && (
                                <span className="text-[9px] font-black uppercase bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100 px-2 py-0.5 rounded-full tracking-wider max-w-[150px] truncate">
                                  {assign.batch.name?.split(" | ")[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => sendTeacherNotification(assign.id, tName)} disabled={isNotifying || !canUpdate}
                            title="Gửi email thông báo"
                            className="w-9 h-9 flex items-center justify-center bg-white text-slate-500 hover:text-fuchsia-600 hover:bg-fuchsia-50 rounded-xl border border-slate-200 hover:border-fuchsia-200 transition-all disabled:opacity-30">
                            {isNotifying ? <Loader2 className="w-4 h-4 animate-spin text-fuchsia-500" /> : <Mail className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setConfirm({ msg: `Hủy phân công khảo sát cho giáo viên ${tName}?`, fn: () => deleteAssignment(assign.id, tName) })}
                            disabled={!canDelete} title="Hủy phân công"
                            className="w-9 h-9 flex items-center justify-center bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 hover:border-rose-200 transition-all disabled:opacity-30">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
    </div>
  )
}
