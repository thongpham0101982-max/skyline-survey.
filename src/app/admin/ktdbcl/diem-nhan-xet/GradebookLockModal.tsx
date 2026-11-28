"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Lock,
  Unlock,
  X,
  Search,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckSquare,
  Square,
} from "lucide-react"

interface GradebookLockRecord {
  id: string
  academicYearId: string
  evaluationPeriod: string
  classId: string
  subjectId: string
  isLocked: boolean
  lockedBy?: string | null
  lockedAt?: string | null
  lockReason?: string | null
}

export interface GradebookLockModalProps {
  open: boolean
  onClose: () => void
  academicYearId: string
  academicYearName?: string
  evaluationPeriod: string
  evaluationPeriodLabel: string
  campuses: any[]
  classes: any[]
  subjects: any[]
  initialCampusId?: string
  initialGrade?: string
  initialClassId?: string
  initialSubjectId?: string
  onLockChanged?: () => void
}

const GRADES = [
  "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5",
  "Khối 6", "Khối 7", "Khối 8", "Khối 9",
  "Khối 10", "Khối 11", "Khối 12",
]

function normalizeGradeNum(raw?: string | null): string {
  const m = String(raw || "").match(/(\d+)/)
  return m ? m[1] : ""
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—"
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}

export function GradebookLockModal({
  open,
  onClose,
  academicYearId,
  academicYearName,
  evaluationPeriod,
  evaluationPeriodLabel,
  campuses,
  classes,
  subjects,
  initialCampusId = "ALL",
  initialGrade = "ALL",
  initialClassId = "",
  initialSubjectId = "",
  onLockChanged,
}: GradebookLockModalProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [locks, setLocks] = useState<GradebookLockRecord[]>([])
  const [isPeriodLocked, setIsPeriodLocked] = useState(false)
  const [periodLockRecord, setPeriodLockRecord] = useState<GradebookLockRecord | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [campusFilter, setCampusFilter] = useState<string>(initialCampusId || "ALL")
  const [gradeFilter, setGradeFilter] = useState<string>(initialGrade || "ALL")
  const [classFilter, setClassFilter] = useState<string>("ALL")
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "LOCKED" | "OPEN">("ALL")
  const [searchKeyword, setSearchKeyword] = useState("")
  const [lockReason, setLockReason] = useState("")
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  const subjectMap = useMemo(() => {
    const m = new Map<string, any>()
    subjects.forEach((s) => m.set(s.id, s))
    return m
  }, [subjects])

  const fetchLocks = async () => {
    if (!academicYearId || !evaluationPeriod) return
    try {
      setLoading(true)
      const res = await fetch(
        `/api/admin/ktdbcl/gradebook-lock?academicYearId=${encodeURIComponent(academicYearId)}&evaluationPeriod=${encodeURIComponent(evaluationPeriod)}`
      )
      const data = await res.json()
      if (data.success) {
        const list: GradebookLockRecord[] = Array.isArray(data.locks) ? data.locks : []
        setLocks(list)
        const pLock = list.find(
          (l) => l.classId === "ALL" && l.subjectId === "ALL" && Boolean(l.isLocked)
        )
        setIsPeriodLocked(Boolean(pLock))
        setPeriodLockRecord(pLock || null)
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Không thể tải trạng thái khóa điểm" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      setCampusFilter(initialCampusId || "ALL")
      setGradeFilter(initialGrade || "ALL")
      setClassFilter("ALL")
      setSubjectFilter("ALL")
      setStatusFilter("ALL")
      setSearchKeyword("")
      setLockReason("")
      setSelectedKeys(new Set())
      setFeedback(null)
      fetchLocks()
    }
  }, [open, academicYearId, evaluationPeriod])

  // Build rows from teaching assignments + any existing explicit lock records + current class/subject
  const allRows = useMemo(() => {
    const lockMap = new Map<string, GradebookLockRecord>()
    locks.forEach((l) => {
      if (l.classId !== "ALL" && l.subjectId !== "ALL") {
        lockMap.set(`${l.classId}__${l.subjectId}`, l)
      }
    })

    const rowMap = new Map<
      string,
      {
        key: string
        classId: string
        className: string
        campusId: string
        campusName: string
        gradeNum: string
        subjectId: string
        subjectName: string
        subjectCode: string
        teacherName: string
        effectiveLocked: boolean
        lockedViaPeriod: boolean
        explicitRecord: GradebookLockRecord | null
      }
    >()

    const classMap = new Map<string, any>()
    classes.forEach((c) => classMap.set(c.id, c))

    const addRow = (cls: any, subId: string, teacherName?: string) => {
      if (!cls || !subId) return
      const sub = subjectMap.get(subId)
      if (!sub) return
      const key = `${cls.id}__${subId}`
      if (rowMap.has(key)) return

      const explicit = lockMap.get(key) || null
      let effectiveLocked = false
      let lockedViaPeriod = false
      if (explicit !== null) {
        effectiveLocked = Boolean(explicit.isLocked)
      } else if (isPeriodLocked) {
        effectiveLocked = true
        lockedViaPeriod = true
      }

      rowMap.set(key, {
        key,
        classId: cls.id,
        className: cls.className || "",
        campusId: cls.campusId || cls.campus?.id || "",
        campusName: cls.campus?.campusName || cls.campus?.campusCode || "—",
        gradeNum: normalizeGradeNum(cls.grade || cls.className),
        subjectId: sub.id,
        subjectName: sub.subjectName || "",
        subjectCode: sub.subjectCode || "",
        teacherName: teacherName || "Chưa phân công",
        effectiveLocked,
        lockedViaPeriod,
        explicitRecord: explicit,
      })
    }

    classes.forEach((cls) => {
      const tas = Array.isArray(cls.teachingAssignments) ? cls.teachingAssignments : []
      tas.forEach((ta: any) => {
        if (ta.subjectId) {
          addRow(cls, ta.subjectId, ta.teacher?.teacherName)
        }
      })
    })

    // Ensure currently selected class + subject is always visible
    if (initialClassId && initialSubjectId) {
      const curCls = classMap.get(initialClassId)
      if (curCls) {
        const ta = curCls.teachingAssignments?.find((t: any) => t.subjectId === initialSubjectId)
        addRow(curCls, initialSubjectId, ta?.teacher?.teacherName)
      }
    }

    // Ensure any explicitly locked/unlocked records are visible
    locks.forEach((l) => {
      if (l.classId !== "ALL" && l.subjectId !== "ALL") {
        const cls = classMap.get(l.classId)
        if (cls) {
          const ta = cls.teachingAssignments?.find((t: any) => t.subjectId === l.subjectId)
          addRow(cls, l.subjectId, ta?.teacher?.teacherName)
        }
      }
    })

    return Array.from(rowMap.values()).sort((a, b) => {
      const clsCmp = a.className.localeCompare(b.className, "vi", { numeric: true })
      if (clsCmp !== 0) return clsCmp
      return a.subjectName.localeCompare(b.subjectName, "vi")
    })
  }, [classes, subjectMap, locks, isPeriodLocked, initialClassId, initialSubjectId])

  const filteredClassesForSelect = useMemo(() => {
    return classes.filter((c) => {
      if (campusFilter !== "ALL" && (c.campusId || c.campus?.id) !== campusFilter) return false
      if (gradeFilter !== "ALL" && normalizeGradeNum(c.grade || c.className) !== normalizeGradeNum(gradeFilter)) {
        return false
      }
      return true
    })
  }, [classes, campusFilter, gradeFilter])

  const filteredRows = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase()
    const targetGradeNum = gradeFilter === "ALL" ? "" : normalizeGradeNum(gradeFilter)
    return allRows.filter((r) => {
      if (campusFilter !== "ALL" && r.campusId !== campusFilter) return false
      if (targetGradeNum && r.gradeNum !== targetGradeNum) return false
      if (classFilter !== "ALL" && r.classId !== classFilter) return false
      if (subjectFilter !== "ALL" && r.subjectId !== subjectFilter) return false
      if (statusFilter === "LOCKED" && !r.effectiveLocked) return false
      if (statusFilter === "OPEN" && r.effectiveLocked) return false
      if (kw) {
        const hay = `${r.className} ${r.subjectName} ${r.subjectCode} ${r.teacherName} ${r.campusName}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
  }, [allRows, campusFilter, gradeFilter, classFilter, subjectFilter, statusFilter, searchKeyword])

  const summary = useMemo(() => {
    const total = filteredRows.length
    const locked = filteredRows.filter((r) => r.effectiveLocked).length
    return { total, locked, open: total - locked }
  }, [filteredRows])

  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selectedKeys.has(r.key))

  const toggleSelectAllFiltered = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        filteredRows.forEach((r) => next.delete(r.key))
      } else {
        filteredRows.forEach((r) => next.add(r.key))
      }
      return next
    })
  }

  const toggleSelectRow = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleTogglePeriodLock = async () => {
    const nextLocked = !isPeriodLocked
    const actionLabel = nextLocked ? "Khóa điểm TOÀN KỲ" : "Mở điểm TOÀN KỲ"
    if (
      !window.confirm(
        `Xác nhận ${actionLabel} cho "${evaluationPeriodLabel}"?\n${
          nextLocked
            ? "Toàn bộ giáo viên sẽ không thể chỉnh sửa điểm trong kỳ này (trừ các lớp/môn được mở riêng)."
            : "Cho phép giáo viên nhập và chỉnh sửa điểm trở lại (trừ các lớp/môn bị khóa riêng)."
        }`
      )
    ) {
      return
    }
    try {
      setSubmitting(true)
      setFeedback(null)
      const res = await fetch("/api/admin/ktdbcl/gradebook-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId,
          evaluationPeriod,
          classId: "ALL",
          subjectId: "ALL",
          isLocked: nextLocked,
          lockReason:
            lockReason.trim() ||
            (nextLocked ? `Khóa toàn kỳ ${evaluationPeriod}` : `Mở khóa toàn kỳ ${evaluationPeriod}`),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setFeedback({ type: "success", text: data.message || "Đã cập nhật trạng thái khóa toàn kỳ." })
        await fetchLocks()
        onLockChanged?.()
      } else {
        setFeedback({ type: "error", text: data.error || "Không thể cập nhật khóa toàn kỳ." })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Lỗi kết nối máy chủ." })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleSingle = async (row: (typeof allRows)[number]) => {
    const nextLocked = !row.effectiveLocked
    try {
      setSubmitting(true)
      setFeedback(null)
      const res = await fetch("/api/admin/ktdbcl/gradebook-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId,
          evaluationPeriod,
          classId: row.classId,
          subjectId: row.subjectId,
          isLocked: nextLocked,
          lockReason:
            lockReason.trim() ||
            (nextLocked
              ? `Khóa điểm lớp ${row.className} - ${row.subjectName}`
              : `Mở điểm lớp ${row.className} - ${row.subjectName}`),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setFeedback({
          type: "success",
          text: `${nextLocked ? "Đã khóa điểm" : "Đã mở điểm"} lớp ${row.className} - ${row.subjectName}.`,
        })
        await fetchLocks()
        onLockChanged?.()
      } else {
        setFeedback({ type: "error", text: data.error || "Không thể cập nhật trạng thái khóa." })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Lỗi kết nối máy chủ." })
    } finally {
      setSubmitting(false)
    }
  }

  const handleBatchUpdate = async (lockState: boolean) => {
    const targets = allRows.filter((r) => selectedKeys.has(r.key))
    if (targets.length === 0) return
    const actionLabel = lockState ? "Khóa điểm" : "Mở điểm"
    if (
      !window.confirm(
        `Xác nhận ${actionLabel} cho ${targets.length} phân công lớp - môn trong kỳ "${evaluationPeriodLabel}"?`
      )
    ) {
      return
    }
    try {
      setSubmitting(true)
      setFeedback(null)
      const res = await fetch("/api/admin/ktdbcl/gradebook-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId,
          evaluationPeriod,
          isLocked: lockState,
          lockReason:
            lockReason.trim() ||
            (lockState ? `Khóa điểm hàng loạt (${evaluationPeriod})` : `Mở điểm hàng loạt (${evaluationPeriod})`),
          batchItems: targets.map((t) => ({ classId: t.classId, subjectId: t.subjectId })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setFeedback({ type: "success", text: data.message || `Đã cập nhật ${targets.length} phân công.` })
        setSelectedKeys(new Set())
        await fetchLocks()
        onLockChanged?.()
      } else {
        setFeedback({ type: "error", text: data.error || "Không thể cập nhật hàng loạt." })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Lỗi kết nối máy chủ." })
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] border-l-4 border-l-[#003B3A] bg-white flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#003B3A]" />
              <h2 className="text-base font-bold text-[#003B3A]">
                Quản lý Khóa điểm &amp; Mở điểm
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[#003B3A] border border-teal-200 text-xs font-semibold">
                {evaluationPeriodLabel}
              </span>
              {academicYearName && (
                <span className="text-xs text-slate-500 font-medium">• {academicYearName}</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Khóa hoặc mở sổ điểm theo toàn kỳ khảo sát, từng lớp - môn học, hoặc hàng loạt theo bộ lọc.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-[#F8FAFC]">
          {/* Feedback banner */}
          {feedback && (
            <div
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
                feedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-[#059669]"
                  : "bg-rose-50 border-rose-200 text-[#E11D48]"
              }`}
            >
              <span>{feedback.text}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Period-wide lock control strip */}
          <div
            className={`rounded-xl border p-3.5 flex flex-wrap items-center justify-between gap-3 ${
              isPeriodLocked
                ? "bg-rose-50/70 border-rose-200"
                : "bg-white border-[#E2E8F0]"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isPeriodLocked ? (
                <AlertTriangle className="w-4 h-4 text-[#E11D48] mt-0.5 shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-[#059669] mt-0.5 shrink-0" />
              )}
              <div className="text-xs space-y-0.5">
                <div className="font-semibold text-slate-900">
                  Trạng thái toàn kỳ ({evaluationPeriod}):{" "}
                  <span className={isPeriodLocked ? "text-[#E11D48]" : "text-[#059669]"}>
                    {isPeriodLocked ? "Đang khóa toàn kỳ" : "Đang mở toàn kỳ"}
                  </span>
                </div>
                <div className="text-slate-500">
                  {isPeriodLocked && periodLockRecord
                    ? `Khóa bởi ${periodLockRecord.lockedBy || "Quản trị viên"} lúc ${formatDateTime(periodLockRecord.lockedAt)}${periodLockRecord.lockReason ? ` • ${periodLockRecord.lockReason}` : ""}`
                    : "Giáo viên được phép nhập điểm ở các phân công chưa bị khóa riêng."}
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={submitting || loading}
              onClick={handleTogglePeriodLock}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${
                isPeriodLocked
                  ? "bg-[#059669] hover:bg-emerald-700 text-white"
                  : "bg-[#E11D48] hover:bg-rose-700 text-white"
              }`}
            >
              {isPeriodLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {isPeriodLocked ? `Mở điểm toàn kỳ (${evaluationPeriod})` : `Khóa điểm toàn kỳ (${evaluationPeriod})`}
            </button>
          </div>

          {/* Filters + Reason */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cơ sở</label>
                <select
                  value={campusFilter}
                  onChange={(e) => {
                    setCampusFilter(e.target.value)
                    setClassFilter("ALL")
                  }}
                  className="w-full border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:ring-2 focus:ring-[#003B3A] outline-none"
                >
                  <option value="ALL">Tất cả cơ sở</option>
                  {campuses.map((cp) => (
                    <option key={cp.id} value={cp.id}>{cp.campusName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Khối</label>
                <select
                  value={gradeFilter}
                  onChange={(e) => {
                    setGradeFilter(e.target.value)
                    setClassFilter("ALL")
                  }}
                  className="w-full border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:ring-2 focus:ring-[#003B3A] outline-none"
                >
                  <option value="ALL">Tất cả khối</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lớp</label>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:ring-2 focus:ring-[#003B3A] outline-none"
                >
                  <option value="ALL">Tất cả lớp</option>
                  {filteredClassesForSelect.map((c) => (
                    <option key={c.id} value={c.id}>{c.className}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Môn học</label>
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:ring-2 focus:ring-[#003B3A] outline-none"
                >
                  <option value="ALL">Tất cả môn</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.subjectName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Trạng thái</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:ring-2 focus:ring-[#003B3A] outline-none"
                >
                  <option value="ALL">Tất cả ({summary.total})</option>
                  <option value="LOCKED">Đã khóa ({summary.locked})</option>
                  <option value="OPEN">Đang mở ({summary.open})</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tìm kiếm</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Lớp, môn, GV..."
                    className="w-full border border-[#E2E8F0] rounded-lg pl-7 pr-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[#003B3A] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9]">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <label className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                  Ghi chú / Lý do:
                </label>
                <input
                  type="text"
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="Ví dụ: Hết hạn nhập điểm GK1, hoặc Mở bổ sung theo đề nghị GV..."
                  className="flex-1 border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[#003B3A] outline-none"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 tabular-nums">
                  Đã chọn: <strong className="text-[#003B3A]">{selectedKeys.size}</strong>
                </span>
                <button
                  type="button"
                  disabled={selectedKeys.size === 0 || submitting}
                  onClick={() => handleBatchUpdate(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#E11D48] border border-rose-200 text-xs font-semibold transition-colors disabled:opacity-40"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Khóa đã chọn
                </button>
                <button
                  type="button"
                  disabled={selectedKeys.size === 0 || submitting}
                  onClick={() => handleBatchUpdate(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#059669] border border-emerald-200 text-xs font-semibold transition-colors disabled:opacity-40"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Mở đã chọn
                </button>
                <button
                  type="button"
                  onClick={fetchLocks}
                  disabled={loading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                  title="Tải lại"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Academic Ledger Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#003B3A] border-b border-[#003B3A] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3 text-center w-10 text-white text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={toggleSelectAllFiltered}
                        className="inline-flex items-center justify-center text-white hover:text-[#5EEAD4]"
                        title={allFilteredSelected ? "Bỏ chọn tất cả" : "Chọn tất cả theo bộ lọc"}
                      >
                        {allFilteredSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#5EEAD4]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3 text-white text-[11px] font-semibold whitespace-nowrap">Lớp</th>
                    <th className="py-3 px-3 text-teal-100 text-[11px] font-semibold whitespace-nowrap">Cơ sở</th>
                    <th className="py-3 px-3 text-white text-[11px] font-semibold whitespace-nowrap">Môn học</th>
                    <th className="py-3 px-3 text-teal-100 text-[11px] font-semibold whitespace-nowrap">Giáo viên</th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4] text-[11px] font-semibold whitespace-nowrap">
                      Trạng thái
                    </th>
                    <th className="py-3 px-3 text-teal-100 text-[11px] font-semibold whitespace-nowrap">
                      Cập nhật gần nhất
                    </th>
                    <th className="py-3 px-3 text-right text-white text-[11px] font-semibold whitespace-nowrap">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1.5 text-[#003B3A]" />
                        Đang tải trạng thái khóa điểm...
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        Không có phân công lớp - môn phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const isSelected = selectedKeys.has(row.key)
                      const metaRec = row.explicitRecord || (row.lockedViaPeriod ? periodLockRecord : null)
                      return (
                        <tr
                          key={row.key}
                          className={`transition-colors align-middle ${
                            isSelected ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]" : "hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => toggleSelectRow(row.key)}
                              className="inline-flex items-center justify-center text-slate-400 hover:text-[#003B3A]"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#008B85]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap align-middle">
                            {row.className}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap align-middle">
                            {row.campusName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium align-middle">
                            {row.subjectName}
                            {row.subjectCode && (
                              <span className="ml-1 text-slate-400 text-[11px]">({row.subjectCode})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 align-middle">{row.teacherName}</td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap align-middle">
                            {row.effectiveLocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-[#E11D48] border border-rose-200 text-[11px] font-semibold">
                                <Lock className="w-3 h-3" />
                                {row.lockedViaPeriod ? "Đã khóa (Toàn kỳ)" : "Đã khóa"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200 text-[11px] font-semibold">
                                <Unlock className="w-3 h-3" />
                                Đang mở
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] align-middle">
                            {metaRec ? (
                              <div>
                                <div className="font-medium text-slate-700">
                                  {metaRec.lockedBy || "Quản trị viên"}
                                </div>
                                <div>{formatDateTime(metaRec.lockedAt)}</div>
                                {metaRec.lockReason && (
                                  <div className="text-slate-400 truncate max-w-[200px]" title={metaRec.lockReason}>
                                    {metaRec.lockReason}
                                  </div>
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap align-middle">
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleToggleSingle(row)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-50 ${
                                row.effectiveLocked
                                  ? "bg-emerald-50 hover:bg-emerald-100 text-[#059669] border-emerald-200"
                                  : "bg-rose-50 hover:bg-rose-100 text-[#E11D48] border-rose-200"
                              }`}
                            >
                              {row.effectiveLocked ? (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  Mở điểm
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" />
                                  Khóa điểm
                                </>
                              )}
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
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E2E8F0] bg-white flex items-center justify-between text-xs text-slate-500 tabular-nums">
          <div>
            Hiển thị <strong className="text-slate-800">{summary.total}</strong> phân công •{" "}
            <span className="text-[#E11D48] font-semibold">{summary.locked} đã khóa</span> •{" "}
            <span className="text-[#059669] font-semibold">{summary.open} đang mở</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
