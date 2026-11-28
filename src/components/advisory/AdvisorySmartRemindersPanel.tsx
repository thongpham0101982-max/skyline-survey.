"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { BellRing, RefreshCw, ArrowRight, CheckCircle2 } from "lucide-react"

interface SmartReminderItem {
  id: string
  studentId: string
  studentName?: string
  classId?: string
  className?: string
  categoryLabel: string
  title: string
  message: string
  severity: "URGENT" | "HIGH" | "NORMAL" | "LOW" | string
  targetTab?: string
}

export default function AdvisorySmartRemindersPanel() {
  const [reminders, setReminders] = useState<SmartReminderItem[]>([])
  const [cooldownHours, setCooldownHours] = useState<number>(12)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncNotice, setSyncNotice] = useState("")
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "URGENT" | "HIGH">("ALL")
  const [hasHomeroomClasses, setHasHomeroomClasses] = useState<boolean>(false)

  const getAcademicYearId = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedAcademicYear") || ""
    }
    return ""
  }

  const loadReminders = useCallback(async () => {
    try {
      setLoading(true)
      const academicYearId = getAcademicYearId()
      const qs = new URLSearchParams()
      if (academicYearId) qs.set("academicYearId", academicYearId)
      const res = await fetch(`/api/advisory/journey?${qs.toString()}`, { cache: "no-store" })
      if (!res.ok) {
        setReminders([])
        return
      }
      const json = await res.json()
      const list: SmartReminderItem[] = Array.isArray(json?.smartReminders) ? json.smartReminders : []
      setReminders(list)
      if (json?.reminderConfig?.cooldownHours) {
        setCooldownHours(Number(json.reminderConfig.cooldownHours))
      }
      const totalTracked = Number(json?.summary?.totalStudents || 0)
      setHasHomeroomClasses(totalTracked > 0 || list.length > 0)
    } catch (err) {
      console.error("AdvisorySmartRemindersPanel load error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReminders()
    const handleYearChange = () => loadReminders()
    window.addEventListener("academicYearChanged", handleYearChange)
    return () => window.removeEventListener("academicYearChanged", handleYearChange)
  }, [loadReminders])

  const handleDispatchReminders = async () => {
    try {
      setSyncing(true)
      setSyncNotice("")
      const academicYearId = getAcademicYearId()
      const res = await fetch("/api/advisory/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISPATCH_REMINDERS",
          academicYearId: academicYearId || undefined
        })
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        setSyncNotice(
          data?.message ||
            `Đã đồng bộ ${data?.dispatchedCount ?? reminders.length} nhắc việc vào hộp thư thông báo.`
        )
        setTimeout(() => setSyncNotice(""), 5000)
      }
    } catch (err) {
      console.error("Dispatch reminders error:", err)
    } finally {
      setSyncing(false)
    }
  }

  const urgentCount = useMemo(
    () => reminders.filter(r => r.severity === "URGENT").length,
    [reminders]
  )
  const highCount = useMemo(
    () => reminders.filter(r => r.severity === "HIGH").length,
    [reminders]
  )

  const filtered = useMemo(() => {
    if (severityFilter === "URGENT") return reminders.filter(r => r.severity === "URGENT")
    if (severityFilter === "HIGH") return reminders.filter(r => r.severity === "HIGH")
    return reminders
  }, [reminders, severityFilter])

  // Ẩn gọn nếu giáo viên không phụ trách lớp cố vấn nào và không có nhắc việc
  if (!loading && !hasHomeroomClasses && reminders.length === 0) {
    return null
  }

  return (
    <section className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#008B85] shadow-2xs overflow-hidden tabular-nums">
      {/* Header */}
      <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#008B85] text-white flex items-center justify-center shrink-0">
            <BellRing className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-[#003B3A]">
                Nhắc việc thông minh — Cố vấn học tập
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200">
                {loading ? "…" : `${reminders.length} việc`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              Tự động phát hiện hạn sắp tới, quá hạn, phản hồi GVBM/HS và phiếu chờ duyệt (chống lặp {cooldownHours}h).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-white p-0.5 rounded-xl border border-[#E2E8F0] text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setSeverityFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                severityFilter === "ALL"
                  ? "bg-[#003B3A] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất cả ({reminders.length})
            </button>
            <button
              type="button"
              onClick={() => setSeverityFilter("URGENT")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                severityFilter === "URGENT"
                  ? "bg-rose-600 text-white"
                  : "text-rose-700 hover:bg-rose-50"
              }`}
            >
              Khẩn cấp ({urgentCount})
            </button>
            <button
              type="button"
              onClick={() => setSeverityFilter("HIGH")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                severityFilter === "HIGH"
                  ? "bg-amber-600 text-white"
                  : "text-amber-800 hover:bg-amber-50"
              }`}
            >
              Ưu tiên cao ({highCount})
            </button>
          </div>

          <button
            type="button"
            onClick={handleDispatchReminders}
            disabled={syncing || reminders.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-900 border border-amber-200 text-xs font-semibold transition-colors cursor-pointer"
            title="Gửi nhắc việc thông minh vào hộp thư thông báo"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-600" />
            <span>{syncing ? "Đang đồng bộ..." : "Đồng bộ nhắc việc"}</span>
          </button>

          <button
            type="button"
            onClick={loadReminders}
            disabled={loading}
            className="p-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Làm mới danh sách nhắc việc"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {syncNotice && (
        <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Body */}
      <div className="p-4">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Đang tải danh sách nhắc việc thông minh...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-[#E2E8F0] rounded-xl">
            Không có nhắc việc hoặc cảnh báo tồn đọng trong mục này.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
            {filtered.slice(0, 20).map(rem => {
              const qs = new URLSearchParams()
              if (rem.classId) qs.set("classId", rem.classId)
              if (rem.studentId) qs.set("studentId", rem.studentId)
              if (rem.targetTab) qs.set("tab", rem.targetTab)
              const href = `/teacher/co-van-hoc-tap${qs.toString() ? `?${qs.toString()}` : ""}`

              return (
                <div
                  key={rem.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                    rem.severity === "URGENT"
                      ? "bg-rose-50/40 border-rose-200/90"
                      : rem.severity === "HIGH"
                      ? "bg-amber-50/40 border-amber-200/90"
                      : "bg-[#F8FAFC] border-[#E2E8F0]"
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-slate-700">
                        {rem.categoryLabel}
                      </span>
                      {rem.className && (
                        <span className="text-[11px] font-medium text-slate-500">
                          Lớp {rem.className}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-900 leading-snug">
                      {rem.title}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {rem.message}
                    </p>
                  </div>

                  <Link
                    href={href}
                    className="px-2.5 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#008B85] text-white text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <span>Xử lý</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
