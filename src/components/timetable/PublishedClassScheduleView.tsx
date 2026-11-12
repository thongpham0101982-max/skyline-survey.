"use client"

import React, { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Printer } from "lucide-react"
import type { DayOfWeekCode, EffectivePeriodItem, PeriodTimeDef } from "@/lib/timetable/types"

const WORKING_DAYS: Array<{ code: DayOfWeekCode; label: string }> = [
  { code: "MONDAY", label: "Thứ Hai" },
  { code: "TUESDAY", label: "Thứ Ba" },
  { code: "WEDNESDAY", label: "Thứ Tư" },
  { code: "THURSDAY", label: "Thứ Năm" },
  { code: "FRIDAY", label: "Thứ Sáu" },
  { code: "SATURDAY", label: "Thứ Bảy" },
]

interface ChildOption {
  studentId: string
  studentCode: string
  studentName: string
  className: string
  campusName: string
}

interface PublishedClassScheduleViewProps {
  portalTitle: string
  portalSubtitle: string
  studentName: string
  studentCode: string
  className: string
  campusName: string
  weekDate: string
  childrenOptions?: ChildOption[]
  selectedStudentId?: string
  schedule: {
    version: {
      id: string
      code: string
      name: string
      effectiveFrom: string | null
      effectiveTo: string | null
      semester: number
    } | null
    weekParity: "EVEN" | "ODD" | "ALL"
    weekDates: Record<DayOfWeekCode, string>
    periodTimes: PeriodTimeDef[]
    items: EffectivePeriodItem[]
  }
}

export function PublishedClassScheduleView({
  portalTitle,
  portalSubtitle,
  studentName,
  studentCode,
  className,
  campusName,
  weekDate,
  childrenOptions,
  selectedStudentId,
  schedule,
}: PublishedClassScheduleViewProps) {
  const router = useRouter()
  const pathname = usePathname()

  const navigateParams = (nextWeekDate: string, nextStudentId?: string) => {
    const qs = new URLSearchParams()
    if (nextWeekDate) qs.set("weekDate", nextWeekDate)
    const stId = nextStudentId ?? selectedStudentId
    if (stId && childrenOptions && childrenOptions.length > 0) {
      qs.set("studentId", stId)
    }
    router.push(`${pathname}?${qs.toString()}`)
  }

  const periodRows = useMemo(() => {
    const timeMap = new Map(
      (schedule.periodTimes || []).map((pt) => [`${pt.session}_${pt.periodNumber}`, pt])
    )
    const maxMorning = Math.max(
      4,
      ...schedule.periodTimes
        .filter((p) => p.session === "MORNING")
        .map((p) => p.periodNumber),
      ...schedule.items.filter((i) => i.session === "MORNING").map((i) => i.periodNumber)
    )
    const maxAfternoon = Math.max(
      4,
      ...schedule.periodTimes
        .filter((p) => p.session === "AFTERNOON")
        .map((p) => p.periodNumber),
      ...schedule.items.filter((i) => i.session === "AFTERNOON").map((i) => i.periodNumber)
    )

    const rows: Array<{
      session: "MORNING" | "AFTERNOON"
      periodNumber: number
      label: string
      timeRange: string
    }> = []

    for (let p = 1; p <= maxMorning; p++) {
      const pt = timeMap.get(`MORNING_${p}`)
      rows.push({
        session: "MORNING",
        periodNumber: p,
        label: `Sáng • Tiết ${p}`,
        timeRange: pt ? `${pt.startTime}–${pt.endTime}` : "",
      })
    }
    for (let p = 1; p <= maxAfternoon; p++) {
      const pt = timeMap.get(`AFTERNOON_${p}`)
      rows.push({
        session: "AFTERNOON",
        periodNumber: p,
        label: `Chiều • Tiết ${p}`,
        timeRange: pt ? `${pt.startTime}–${pt.endTime}` : "",
      })
    }
    return rows
  }, [schedule.items, schedule.periodTimes])

  const cellMap = useMemo(() => {
    const map = new Map<string, EffectivePeriodItem>()
    for (const item of schedule.items) {
      map.set(`${item.dayOfWeek}_${item.session}_${item.periodNumber}`, item)
    }
    return map
  }, [schedule.items])

  const parityLabel =
    schedule.weekParity === "EVEN"
      ? "Tuần chẵn"
      : schedule.weekParity === "ODD"
      ? "Tuần lẻ"
      : "Lịch hàng tuần"

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 space-y-4 pb-12">
      {/* Masthead */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] px-5 py-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#003B3A] tracking-tight">
            {portalTitle}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">{portalSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#003B3A] text-xs font-semibold hover:bg-[#F8FAFC] transition-colors print:hidden cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          In thời khóa biểu
        </button>
      </div>

      {/* Controls & Student Info Strip */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 tabular-nums">
        <div className="flex flex-wrap items-center gap-3">
          {childrenOptions && childrenOptions.length > 1 ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Chọn học sinh
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => navigateParams(weekDate, e.target.value)}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#003B3A] focus:border-[#00A19A] focus:outline-none"
              >
                {childrenOptions.map((ch) => (
                  <option key={ch.studentId} value={ch.studentId}>
                    {ch.studentName} ({ch.studentCode}) — Lớp {ch.className}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-xs">
              <div className="text-[11px] font-semibold text-slate-500">Học sinh & Lớp học</div>
              <div className="font-bold text-[#003B3A] mt-0.5">
                {studentName} ({studentCode}) • Lớp {className} • {campusName}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <div className="px-3 py-1.5 rounded-xl bg-[#F0FDFA] border border-teal-200 text-xs font-semibold text-[#00736E]">
            {parityLabel}
            {schedule.version ? ` • HK${schedule.version.semester}` : ""}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Tuần xem:</label>
            <input
              type="date"
              value={weekDate}
              onChange={(e) => {
                if (e.target.value) navigateParams(e.target.value)
              }}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* Empty State when no PUBLISHED schedule exists yet */}
      {!schedule.version ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center shadow-xs">
          <p className="text-sm font-bold text-[#003B3A]">
            Chưa có thời khóa biểu chính thức được ban hành cho lớp {className}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Thời khóa biểu sẽ tự động hiển thị tại đây ngay khi Ban Giám hiệu phê duyệt và ban hành
            phiên bản chính thức.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 tabular-nums">
            <div className="text-xs font-bold text-[#003B3A]">
              Lớp {className} — {schedule.version.name}
            </div>
            <div className="text-[11px] text-slate-500">
              Hiệu lực từ {schedule.version.effectiveFrom || "đầu học kỳ"}
              {schedule.version.effectiveTo ? ` đến ${schedule.version.effectiveTo}` : ""}
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                <th className="sticky left-0 z-10 bg-[#003B3A] py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap w-36">
                  Buổi & Tiết
                </th>
                {WORKING_DAYS.map((d) => (
                  <th
                    key={d.code}
                    className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap min-w-[165px]"
                  >
                    <div>{d.label}</div>
                    <div className="text-[10px] font-normal text-[#5EEAD4] tabular-nums">
                      {schedule.weekDates[d.code] || ""}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {periodRows.map((pr, idx) => {
                const isAfternoonStart =
                  pr.session === "AFTERNOON" && pr.periodNumber === 1 && idx > 0
                return (
                  <tr
                    key={`${pr.session}_${pr.periodNumber}`}
                    className={`transition-colors align-middle hover:bg-[#F8FAFC] ${
                      isAfternoonStart ? "border-t-2 border-t-[#003B3A]/25" : ""
                    }`}
                  >
                    <td className="sticky left-0 z-10 bg-white py-3 px-3 align-middle border-r border-[#E2E8F0] whitespace-nowrap">
                      <div className="font-semibold text-[#003B3A]">{pr.label}</div>
                      {pr.timeRange && (
                        <div className="text-[11px] text-slate-500">{pr.timeRange}</div>
                      )}
                    </td>
                    {WORKING_DAYS.map((d) => {
                      const item = cellMap.get(`${d.code}_${pr.session}_${pr.periodNumber}`)
                      return (
                        <td
                          key={d.code}
                          className="py-2.5 px-3 align-top border-r border-[#F1F5F9] last:border-r-0"
                        >
                          {!item ? (
                            <span className="text-[11px] text-slate-300">—</span>
                          ) : (
                            <div
                              className={`rounded-xl border p-2.5 ${
                                item.isCancelledByLeave
                                  ? "bg-rose-50/70 border-rose-200 line-through opacity-75"
                                  : item.isSubstituted
                                  ? "bg-amber-50/60 border-amber-200"
                                  : "bg-[#F8FAFC] border-[#E2E8F0]"
                              }`}
                            >
                              <div className="font-semibold text-slate-900">
                                {item.subjectName || "Tiết học"}
                              </div>
                              <div className="text-[11px] text-slate-600 mt-0.5 space-y-0.5">
                                {item.teacherName && <div>GV: {item.teacherName}</div>}
                                {item.roomName && (
                                  <div className="text-[#00736E] font-medium">
                                    Phòng: {item.roomName}
                                  </div>
                                )}
                                {item.isSubstituted && (
                                  <div className="text-[#D97706] font-semibold">
                                    {item.isCancelledByLeave
                                      ? "Nghỉ tiết theo thông báo"
                                      : "Có điều chỉnh trong ngày"}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
