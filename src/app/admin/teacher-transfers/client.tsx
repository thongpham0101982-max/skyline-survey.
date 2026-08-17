"use client"
import { useState, useEffect, useMemo } from "react"
import {
  ArrowRight, ArrowLeft, ChevronsRight, ChevronsLeft,
  Search, RefreshCw, Loader2, Users, UserCheck, CheckSquare,
  Square, ChevronDown, GraduationCap, Building2, AlertCircle,
  CheckCircle2, ArrowRightLeft, Filter
} from "lucide-react"
import {
  getTeacherTransferDataAction,
  transferTeachersToYearAction,
  removeTeacherTransferAction,
} from "./actions"

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const cleanStr = (s: string | null | undefined) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")

function PositionBadge({ position }: { position: string }) {
  const map: Record<string, string> = {
    TTCM: "bg-amber-100 text-amber-700",
    QLCM: "bg-indigo-100 text-indigo-700",
    GĐCS: "bg-rose-100 text-rose-700",
    GV: "bg-slate-100 text-slate-600",
  }
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${map[position] || map["GV"]}`}>
      {position || "GV"}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return status === "ACTIVE"
    ? <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">● On</span>
    : <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">○ Off</span>
}

// ─────────────────────────────────────────────
// YearSelector
// ─────────────────────────────────────────────
function YearSelector({ value, onChange, years, label }: {
  value: string; onChange: (id: string) => void; years: any[]; label: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none w-full pl-3 pr-8 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-800 focus:border-[#48BFE3] focus:outline-none transition-all"
        >
          <option value="">-- Chọn năm học --</option>
          {years.map(y => (
            <option key={y.id} value={y.id}>{y.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TeacherList panel
// ─────────────────────────────────────────────
function TeacherListPanel({
  title, subtitle, colorClass, icon: Icon,
  teachers, selectedIds, onToggle, onSelectAll, onDeselectAll,
  loading, emptyMsg, badge
}: {
  title: string; subtitle: string; colorClass: string; icon: any;
  teachers: any[]; selectedIds: Set<string>; onToggle: (id: string) => void;
  onSelectAll: () => void; onDeselectAll: () => void;
  loading: boolean; emptyMsg: string; badge?: React.ReactNode
}) {
  const [search, setSearch] = useState("")
  const [filterCampus, setFilterCampus] = useState("")

  const campuses = useMemo(() => {
    const set = new Set(teachers.map(t => t.campus).filter(Boolean))
    return Array.from(set).sort()
  }, [teachers])

  const filtered = useMemo(() => {
    const q = cleanStr(search)
    return teachers.filter(t => {
      const match = !q || cleanStr(t.teacherName).includes(q) || cleanStr(t.teacherCode).includes(q)
      const campusMatch = !filterCampus || t.campus === filterCampus
      return match && campusMatch
    })
  }, [teachers, search, filterCampus])

  const allSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id))
  const someSelected = filtered.some(t => selectedIds.has(t.id))

  return (
    <div className={`flex flex-col rounded-2xl border-2 ${colorClass} overflow-hidden`}>
      {/* Panel header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-current/10">
        <Icon className="w-5 h-5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">{title}</div>
          <div className="text-[11px] opacity-70 truncate">{subtitle}</div>
        </div>
        {badge}
      </div>

      {/* Search + filter */}
      <div className="px-3 py-2 bg-white/60 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-[#48BFE3] focus:outline-none bg-white"
            placeholder="Tìm tên, mã GV..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {campuses.length > 1 && (
          <div className="relative">
            <select
              value={filterCampus}
              onChange={e => setFilterCampus(e.target.value)}
              className="appearance-none pl-2 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-[#48BFE3] focus:outline-none"
            >
              <option value="">Tất cả CS</option>
              {campuses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Select all row */}
      <div className="px-3 py-1.5 bg-white/40 border-b border-slate-100 flex items-center gap-2">
        <button
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-[#48BFE3] transition-colors"
        >
          {allSelected
            ? <CheckSquare className="w-4 h-4 text-[#48BFE3]" />
            : someSelected
              ? <CheckSquare className="w-4 h-4 text-slate-400" />
              : <Square className="w-4 h-4" />
          }
          Chọn tất cả ({filtered.length})
        </button>
        {selectedIds.size > 0 && (
          <span className="ml-auto text-[11px] font-bold text-[#48BFE3]">
            Đã chọn: {[...selectedIds].filter(id => filtered.some(t => t.id === id)).length}
          </span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar" style={{ maxHeight: 480 }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#48BFE3]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <Users className="w-8 h-8 opacity-30" />
            <p className="text-xs">{emptyMsg}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map(t => {
              const selected = selectedIds.has(t.id)
              return (
                <li
                  key={t.id}
                  onClick={() => onToggle(t.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors select-none ${
                    selected ? "bg-[#48BFE3]/8 border-l-2 border-[#48BFE3]" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="shrink-0">
                    {selected
                      ? <CheckSquare className="w-4 h-4 text-[#48BFE3]" />
                      : <Square className="w-4 h-4 text-slate-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-800 truncate">{t.teacherName}</span>
                      <PositionBadge position={t.position} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-mono">{t.teacherCode}</span>
                      {t.campus && (
                        <span className="text-[10px] text-slate-400">· {t.campus}</span>
                      )}
                      {t.department && (
                        <span className="text-[10px] text-slate-400 truncate">· {t.department}</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Count footer */}
      <div className="px-4 py-2 border-t border-current/10 text-[11px] font-semibold opacity-60 text-right">
        {filtered.length} / {teachers.length} giáo viên
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main client component
// ─────────────────────────────────────────────
export function TeacherTransfersClient({
  years,
  defaultFromYearId,
  defaultToYearId,
}: {
  years: any[]
  defaultFromYearId: string | null
  defaultToYearId: string | null
}) {
  const [fromYearId, setFromYearId] = useState(defaultFromYearId || "")
  const [toYearId, setToYearId] = useState(defaultToYearId || "")

  const [sourceTeachers, setSourceTeachers] = useState<any[]>([])
  const [transferredTeachers, setTransferredTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  const [leftSelected, setLeftSelected] = useState<Set<string>>(new Set())
  const [rightSelected, setRightSelected] = useState<Set<string>>(new Set())

  // ── load data whenever year selection changes ──
  useEffect(() => {
    if (fromYearId && toYearId) {
      loadData()
    } else {
      setSourceTeachers([])
      setTransferredTeachers([])
    }
  }, [fromYearId, toYearId])

  async function loadData() {
    setLoading(true)
    setLeftSelected(new Set())
    setRightSelected(new Set())
    const data = await getTeacherTransferDataAction(fromYearId, toYearId)
    setSourceTeachers(data.sourceTeachers)
    setTransferredTeachers(data.transferredTeachers)
    setLoading(false)
  }

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Transfer selected (left → right) ──
  async function handleTransfer(ids: string[]) {
    if (!ids.length) { showToast("error", "Chưa chọn giáo viên nào để kết chuyển"); return }
    if (!toYearId) { showToast("error", "Chưa chọn năm học đích"); return }
    setTransferring(true)
    const res = await transferTeachersToYearAction(ids, toYearId)
    setTransferring(false)
    if (res.success) {
      showToast("success", `Đã kết chuyển ${res.transferred} giáo viên sang năm học mới`)
      await loadData()
    } else {
      showToast("error", res.error || "Lỗi kết chuyển")
    }
  }

  // ── Remove transfer (right → left) ──
  async function handleRemove(ids: string[]) {
    if (!ids.length) { showToast("error", "Chưa chọn giáo viên nào"); return }
    setRemoving(true)
    const res = await removeTeacherTransferAction(ids, toYearId)
    setRemoving(false)
    if (res.success) {
      showToast("success", "Đã hoàn tác kết chuyển")
      await loadData()
    } else {
      showToast("error", res.error || "Lỗi hoàn tác")
    }
  }

  // ── Toggle helpers ──
  const toggle = (set: Set<string>, id: string): Set<string> => {
    const s = new Set(set)
    s.has(id) ? s.delete(id) : s.add(id)
    return s
  }

  const totalTeachers = sourceTeachers.length + transferredTeachers.length

  const fromYearName = years.find(y => y.id === fromYearId)?.name || "—"
  const toYearName = years.find(y => y.id === toYearId)?.name || "—"

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border transition-all duration-300 text-sm font-semibold ${
          toast.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {toast.type === "success"
            ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            : <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          }
          {toast.msg}
        </div>
      )}

      {/* Year selector card */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <YearSelector
              label="Năm học nguồn"
              value={fromYearId}
              onChange={v => { setFromYearId(v); setLeftSelected(new Set()) }}
              years={years}
            />
          </div>
          <div className="flex items-center pb-1">
            <ArrowRightLeft className="w-5 h-5 text-slate-300" />
          </div>
          <div className="flex-1">
            <YearSelector
              label="Năm học đích"
              value={toYearId}
              onChange={v => { setToYearId(v); setRightSelected(new Set()) }}
              years={years}
            />
          </div>
          <button
            onClick={loadData}
            disabled={!fromYearId || !toYearId || loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Tải lại
          </button>
        </div>

        {/* Progress bar */}
        {totalTeachers > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2 text-xs font-semibold">
              <span className="text-slate-500">Tiến độ kết chuyển</span>
              <span className="text-[#48BFE3]">
                {transferredTeachers.length} / {totalTeachers} giáo viên đã kết chuyển
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#48BFE3] to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${totalTeachers > 0 ? (transferredTeachers.length / totalTeachers) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Two-column transfer UI */}
      {fromYearId && toYearId ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-start">
          {/* LEFT: source */}
          <TeacherListPanel
            title={`Năm học ${fromYearName}`}
            subtitle={`Chưa kết chuyển — ${sourceTeachers.length} GV`}
            colorClass="border-slate-200 bg-slate-50 text-slate-700"
            icon={Users}
            teachers={sourceTeachers}
            selectedIds={leftSelected}
            onToggle={id => setLeftSelected(toggle(leftSelected, id))}
            onSelectAll={() => setLeftSelected(new Set(sourceTeachers.map(t => t.id)))}
            onDeselectAll={() => setLeftSelected(new Set())}
            loading={loading}
            emptyMsg="Tất cả GV đã được kết chuyển"
            badge={
              <span className="text-2xl font-black text-slate-300">{sourceTeachers.length}</span>
            }
          />

          {/* CENTER: action buttons */}
          <div className="flex flex-col items-center justify-center gap-3 py-8 lg:py-0 lg:pt-24">
            {/* Transfer selected → */}
            <button
              onClick={() => handleTransfer([...leftSelected])}
              disabled={leftSelected.size === 0 || transferring || !toYearId}
              className="group flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl bg-[#48BFE3] text-white font-bold text-xs shadow-lg hover:bg-[#009088] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Kết chuyển GV đã chọn sang năm học mới"
            >
              {transferring
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <ArrowRight className="w-5 h-5" />
              }
              <span className="hidden sm:block">Kết chuyển</span>
              {leftSelected.size > 0 && (
                <span className="bg-white/30 rounded-full px-2 text-[10px]">
                  {leftSelected.size}
                </span>
              )}
            </button>

            {/* Transfer ALL → */}
            <button
              onClick={() => handleTransfer(sourceTeachers.map(t => t.id))}
              disabled={sourceTeachers.length === 0 || transferring || !toYearId}
              className="group flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-xs shadow-lg hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Kết chuyển toàn bộ GV sang năm học mới"
            >
              <ChevronsRight className="w-5 h-5" />
              <span className="hidden sm:block">Tất cả</span>
            </button>

            <div className="h-px w-8 bg-slate-200" />

            {/* ← Remove selected */}
            <button
              onClick={() => handleRemove([...rightSelected])}
              disabled={rightSelected.size === 0 || removing || !toYearId}
              className="group flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl bg-white border-2 border-slate-200 text-slate-600 font-bold text-xs shadow-sm hover:border-rose-300 hover:text-rose-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Hoàn tác kết chuyển GV đã chọn"
            >
              {removing
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <ArrowLeft className="w-5 h-5" />
              }
              <span className="hidden sm:block">Hoàn tác</span>
              {rightSelected.size > 0 && (
                <span className="bg-slate-100 rounded-full px-2 text-[10px]">
                  {rightSelected.size}
                </span>
              )}
            </button>

            {/* ← Remove ALL */}
            <button
              onClick={() => handleRemove(transferredTeachers.map(t => t.id))}
              disabled={transferredTeachers.length === 0 || removing || !toYearId}
              className="group flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl bg-white border-2 border-slate-200 text-slate-500 font-bold text-xs shadow-sm hover:border-rose-300 hover:text-rose-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Hoàn tác kết chuyển toàn bộ GV"
            >
              <ChevronsLeft className="w-5 h-5" />
              <span className="hidden sm:block">Tất cả</span>
            </button>
          </div>

          {/* RIGHT: transferred */}
          <TeacherListPanel
            title={`Năm học ${toYearName}`}
            subtitle={`Đã kết chuyển — ${transferredTeachers.length} GV`}
            colorClass="border-[#48BFE3]/30 bg-[#48BFE3]/5 text-[#48BFE3]"
            icon={UserCheck}
            teachers={transferredTeachers}
            selectedIds={rightSelected}
            onToggle={id => setRightSelected(toggle(rightSelected, id))}
            onSelectAll={() => setRightSelected(new Set(transferredTeachers.map(t => t.id)))}
            onDeselectAll={() => setRightSelected(new Set())}
            loading={loading}
            emptyMsg="Chưa có giáo viên nào được kết chuyển"
            badge={
              <span className="text-2xl font-black text-[#48BFE3]/40">{transferredTeachers.length}</span>
            }
          />
        </div>
      ) : (
        /* Placeholder when years not selected */
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <ArrowRightLeft className="w-12 h-12 opacity-30" />
          <p className="text-sm font-semibold">Vui lòng chọn năm học nguồn và năm học đích</p>
          <p className="text-xs opacity-70">để xem và thực hiện kết chuyển nhân sự</p>
        </div>
      )}

      {/* Legend / guide */}
      {fromYearId && toYearId && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-700 flex gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
          <div className="space-y-1">
            <p className="font-bold">Hướng dẫn:</p>
            <ul className="list-disc list-inside space-y-0.5 font-medium">
              <li>Chọn giáo viên ở cột trái, nhấn <strong>Kết chuyển →</strong> để chuyển sang năm học mới.</li>
              <li>Nhấn <strong>Tất cả ⇒</strong> để kết chuyển toàn bộ giáo viên.</li>
              <li>Chọn giáo viên ở cột phải, nhấn <strong>← Hoàn tác</strong> để đưa về danh sách chờ.</li>
              <li>Kết chuyển sẽ tạo bản ghi mục tiêu năm học mới và kích hoạt lại GV nếu đang tắt.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
