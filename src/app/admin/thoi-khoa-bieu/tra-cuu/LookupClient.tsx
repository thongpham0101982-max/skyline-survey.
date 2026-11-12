"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { Download, Printer } from "lucide-react"
import { TimetableShell } from "@/components/timetable/TimetableShell"
import { TimetableFilterBar } from "@/components/timetable/TimetableFilterBar"
import { useTimetableFilterNavigation } from "@/components/timetable/useTimetableFilterNavigation"
import {
  exportTimetableLookupExcelAction,
  getTimetableLookupAction,
} from "../actions"
import type { DayOfWeekCode, TimetableFilterParams } from "@/lib/timetable/types"

type LookupData = Extract<
  Awaited<ReturnType<typeof getTimetableLookupAction>>,
  { success: true }
>

type LookupTab = "BY_CLASS" | "BY_TEACHER" | "BY_ROOM" | "MATRIX"

const DAY_LABELS: Record<DayOfWeekCode, string> = {
  MONDAY: "Thứ Hai",
  TUESDAY: "Thứ Ba",
  WEDNESDAY: "Thứ Tư",
  THURSDAY: "Thứ Năm",
  FRIDAY: "Thứ Sáu",
  SATURDAY: "Thứ Bảy",
}

const SHORT_DAY_LABELS: Record<string, string> = {
  MONDAY: "T2",
  TUESDAY: "T3",
  WEDNESDAY: "T4",
  THURSDAY: "T5",
  FRIDAY: "T6",
  SATURDAY: "T7",
}

function downloadBase64Excel(base64: string, fileName: string) {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function resolveDateInViewedWeek(viewedWeekDate: string, targetDay: DayOfWeekCode): string {
  const ref = new Date(`${viewedWeekDate.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(ref.getTime())) return viewedWeekDate.slice(0, 10)
  const jsDay = ref.getUTCDay()
  const offsetToMonday = jsDay === 0 ? -6 : 1 - jsDay
  const monday = new Date(ref.getTime() + offsetToMonday * 86400000)
  const dayOffsetMap: Record<DayOfWeekCode, number> = {
    MONDAY: 0,
    TUESDAY: 1,
    WEDNESDAY: 2,
    THURSDAY: 3,
    FRIDAY: 4,
    SATURDAY: 5,
  }
  const target = new Date(monday.getTime() + (dayOffsetMap[targetDay] || 0) * 86400000)
  return target.toISOString().slice(0, 10)
}

export function LookupClient({
  initialData,
  initialTab = "BY_CLASS",
  initialTeacherId = "ALL",
  initialRoomId = "ALL",
}: {
  initialData: LookupData
  initialTab?: LookupTab
  initialTeacherId?: string
  initialRoomId?: string
}) {
  const [lookupTab, setLookupTab] = useState<LookupTab>(initialTab)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeacherId)
  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialRoomId)
  const [exporting, setExporting] = useState(false)

  const customFetcher = React.useCallback(
    (params: TimetableFilterParams & { lookupTab?: LookupTab; teacherId?: string; roomId?: string }) =>
      getTimetableLookupAction({
        ...params,
        lookupTab: params.lookupTab ?? lookupTab,
        teacherId: params.teacherId ?? selectedTeacherId,
        roomId: params.roomId ?? selectedRoomId,
      }),
    [lookupTab, selectedRoomId, selectedTeacherId]
  )

  const { data, loading, errorMessage, reloadWithPatch } =
    useTimetableFilterNavigation<LookupData>(initialData, customFetcher)

  const {
    filterContext,
    config,
    viewedWeekDate,
    weekParity,
    slots,
    crossCampusTeacherSchedule,
    teachers,
    rooms,
  } = data

  const workingDays: DayOfWeekCode[] =
    config.workingDays && config.workingDays.length > 0
      ? config.workingDays
      : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]

  const periodRows = useMemo(() => {
    const rows: Array<{
      session: "MORNING" | "AFTERNOON"
      periodNumber: number
      label: string
      timeRange: string
    }> = []
    const timeMap = new Map(
      (config.periodTimes || []).map((pt) => [`${pt.session}_${pt.periodNumber}`, pt])
    )
    for (let p = 1; p <= (config.morningPeriods || 4); p++) {
      const pt = timeMap.get(`MORNING_${p}`)
      rows.push({
        session: "MORNING",
        periodNumber: p,
        label: `Sáng • Tiết ${p}`,
        timeRange: pt ? `${pt.startTime}–${pt.endTime}` : "",
      })
    }
    for (let p = 1; p <= (config.afternoonPeriods || 4); p++) {
      const pt = timeMap.get(`AFTERNOON_${p}`)
      rows.push({
        session: "AFTERNOON",
        periodNumber: p,
        label: `Chiều • Tiết ${p}`,
        timeRange: pt ? `${pt.startTime}–${pt.endTime}` : "",
      })
    }
    return rows
  }, [config])

  const handleSwitchTab = (nextTab: LookupTab) => {
    setLookupTab(nextTab)
    const patch: Record<string, any> = { lookupTab: nextTab }
    if (nextTab === "BY_CLASS" && filterContext.selectedClassId === "ALL" && filterContext.classes[0]) {
      patch.classId = filterContext.classes[0].id
    } else if (nextTab !== "BY_CLASS") {
      patch.classId = "ALL"
    }
    if (nextTab === "BY_TEACHER" && selectedTeacherId === "ALL" && teachers[0]) {
      setSelectedTeacherId(teachers[0].id)
      patch.teacherId = teachers[0].id
    } else if (nextTab !== "BY_TEACHER") {
      setSelectedTeacherId("ALL")
      patch.teacherId = "ALL"
    }
    if (nextTab === "BY_ROOM" && selectedRoomId === "ALL" && rooms[0]) {
      setSelectedRoomId(rooms[0].id)
      patch.roomId = rooms[0].id
    } else if (nextTab !== "BY_ROOM") {
      setSelectedRoomId("ALL")
      patch.roomId = "ALL"
    }
    reloadWithPatch(patch)
  }

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const res = await exportTimetableLookupExcelAction({
        academicYearId: filterContext.selectedYearId,
        semester: filterContext.semester,
        scopeGroup: filterContext.selectedScopeGroup,
        campusId: filterContext.selectedCampusId,
        levelCode: filterContext.selectedLevelCode,
        grade: filterContext.selectedGrade,
        classId: filterContext.selectedClassId,
        versionId: filterContext.selectedVersionId,
        viewedWeekDate,
        lookupTab,
        teacherId: selectedTeacherId,
        roomId: selectedRoomId,
      })
      if (res.success) {
        downloadBase64Excel(res.base64, res.fileName)
      } else {
        window.alert(res.error || "Không thể xuất file Excel.")
      }
    } finally {
      setExporting(false)
    }
  }

  const handlePrintPdf = () => {
    window.print()
  }

  // Group slots by cell key for single-entity views (BY_CLASS, BY_TEACHER, BY_ROOM)
  const slotGridMap = useMemo(() => {
    const map = new Map<string, typeof slots>()
    for (const s of slots) {
      const key = `${s.dayOfWeek}_${s.session}_${s.periodNumber}`
      const arr = map.get(key) || []
      arr.push(s)
      map.set(key, arr)
    }
    return map
  }, [slots])

  // Matrix view: classes x (day_session_period)
  const matrixMap = useMemo(() => {
    const map = new Map<string, (typeof slots)[number]>()
    for (const s of slots) {
      map.set(`${s.classId}_${s.dayOfWeek}_${s.session}_${s.periodNumber}`, s)
    }
    return map
  }, [slots])

  const parityLabel =
    weekParity === "EVEN"
      ? "Tuần chẵn"
      : weekParity === "ODD"
      ? "Tuần lẻ"
      : "Chu kỳ 1 tuần (Hàng tuần)"

  return (
    <TimetableShell
      title="Tra cứu thời khóa biểu"
      subtitle="Tra cứu lịch học theo lớp, giáo viên, phòng chức năng và ma trận tổng hợp (hỗ trợ xem Liên cấp, sáng/chiều và tuần luân phiên)"
      activeTabCode="LOOKUP"
      headerActions={
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            disabled={exporting || loading}
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold hover:bg-[#005250] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Đang xuất Excel..." : "Xuất Excel"}
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#003B3A] text-xs font-semibold hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            In / Xuất PDF
          </button>
        </div>
      }
    >
      <div className="print:hidden space-y-3">
        <TimetableFilterBar
          context={filterContext}
          loading={loading}
          showGradeAndClass={lookupTab === "BY_CLASS" || lookupTab === "MATRIX"}
          showVersion={filterContext.selectedScopeGroup !== "LIEN_CAP"}
          showViewedWeek={true}
          viewedWeekDate={viewedWeekDate}
          onChange={(patch) => reloadWithPatch(patch)}
          extraSlot={
            <div className="flex flex-wrap items-end gap-3">
              {lookupTab === "BY_TEACHER" && (
                <div className="min-w-[240px]">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Giáo viên tra cứu
                  </label>
                  <select
                    value={selectedTeacherId}
                    disabled={loading}
                    onChange={(e) => {
                      const nextId = e.target.value
                      setSelectedTeacherId(nextId)
                      reloadWithPatch({ teacherId: nextId } as any)
                    }}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
                  >
                    <option value="ALL">Tất cả giáo viên trong phạm vi</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        [{t.teacherCode}] {t.teacherName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {lookupTab === "BY_ROOM" && (
                <div className="min-w-[240px]">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Phòng học / Phòng chức năng
                  </label>
                  <select
                    value={selectedRoomId}
                    disabled={loading}
                    onChange={(e) => {
                      const nextId = e.target.value
                      setSelectedRoomId(nextId)
                      reloadWithPatch({ roomId: nextId } as any)
                    }}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
                  >
                    <option value="ALL">Tất cả phòng đã gắn tiết</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        [{r.roomCode}] {r.roomName} ({r.capacity} chỗ)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="px-3 py-2 rounded-xl bg-[#F0FDFA] border border-teal-200 text-xs text-[#00736E] font-semibold tabular-nums">
                Tuần đang xem ({viewedWeekDate}): {parityLabel} • {slots.length} tiết khớp bộ lọc
              </div>
            </div>
          }
        />

        {/* Lookup Sub-tabs */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1.5 shadow-xs flex flex-wrap items-center gap-1">
          {(
            [
              { code: "BY_CLASS", label: "Theo lớp" },
              { code: "BY_TEACHER", label: "Theo giáo viên" },
              { code: "BY_ROOM", label: "Theo phòng" },
              { code: "MATRIX", label: "Ma trận tổng hợp" },
            ] as Array<{ code: LookupTab; label: string }>
          ).map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => handleSwitchTab(t.code)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                lookupTab === t.code
                  ? "bg-[#00A19A] text-white"
                  : "text-slate-600 hover:text-[#003B3A] hover:bg-[#F8FAFC]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-[#E11D48] rounded-2xl px-4 py-3 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Print Header (Visible only on PDF/Print) */}
      <div className="hidden print:block border-b-2 border-[#003B3A] pb-3 mb-4">
        <h2 className="text-base font-bold text-[#003B3A]">
          Hệ thống Giáo dục Sky-Line — Thời khóa biểu ({parityLabel})
        </h2>
        <p className="text-xs text-slate-600 tabular-nums">
          Tuần tham chiếu: {viewedWeekDate} • Học kỳ {filterContext.semester}
        </p>
      </div>

      {/* Single-perspective Grid: BY_CLASS, BY_TEACHER, BY_ROOM */}
      {lookupTab !== "MATRIX" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-[#003B3A]">
              {lookupTab === "BY_CLASS" &&
                (filterContext.selectedClassId !== "ALL"
                  ? `Thời khóa biểu lớp ${
                      filterContext.classes.find((c) => c.id === filterContext.selectedClassId)
                        ?.className || ""
                    }`
                  : "Thời khóa biểu theo lớp (Tất cả lớp trong bộ lọc)")}
              {lookupTab === "BY_TEACHER" &&
                (selectedTeacherId !== "ALL"
                  ? `Lịch giảng dạy tại phạm vi đang chọn — ${
                      teachers.find((t) => t.id === selectedTeacherId)?.teacherName || ""
                    }`
                  : "Lịch giảng dạy theo giáo viên")}
              {lookupTab === "BY_ROOM" &&
                (selectedRoomId !== "ALL"
                  ? `Lịch sử dụng phòng — ${
                      rooms.find((r) => r.id === selectedRoomId)?.roomName || ""
                    }`
                  : "Lịch sử dụng phòng học & phòng chức năng")}
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">
              Hiển thị đầy đủ {config.morningPeriods} tiết sáng & {config.afternoonPeriods} tiết chiều
            </span>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                <th className="sticky left-0 z-10 bg-[#003B3A] py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap w-36">
                  Buổi & Tiết
                </th>
                {workingDays.map((day) => {
                  const dayIso = resolveDateInViewedWeek(viewedWeekDate, day)
                  return (
                    <th
                      key={day}
                      className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap min-w-[175px]"
                    >
                      <div>{DAY_LABELS[day]}</div>
                      <div className="text-[10px] font-normal text-[#5EEAD4] tabular-nums">
                        {dayIso}
                      </div>
                    </th>
                  )
                })}
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
                    {workingDays.map((day) => {
                      const cellSlots =
                        slotGridMap.get(`${day}_${pr.session}_${pr.periodNumber}`) || []
                      const dayIso = resolveDateInViewedWeek(viewedWeekDate, day)
                      return (
                        <td
                          key={day}
                          className="py-2.5 px-3 align-top border-r border-[#F1F5F9] last:border-r-0"
                        >
                          {cellSlots.length === 0 ? (
                            <span className="text-[11px] text-slate-300">—</span>
                          ) : (
                            <div className="space-y-1.5">
                              {cellSlots.map((s, sIdx) => {
                                const isInactiveWeek =
                                  (weekParity === "EVEN" && s.weekType === "ODD") ||
                                  (weekParity === "ODD" && s.weekType === "EVEN")
                                return (
                                  <div
                                    key={s.id || sIdx}
                                    className={`rounded-xl border p-2 ${
                                      isInactiveWeek
                                        ? "bg-slate-50 border-slate-200 opacity-60"
                                        : "bg-[#F8FAFC] border-[#E2E8F0]"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-1.5">
                                      <span className="font-semibold text-slate-900">
                                        {s.subjectName || "Chưa gắn môn"}
                                      </span>
                                      {s.weekType && s.weekType !== "ALL" && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-[#D97706] border border-amber-200 text-[10px] font-semibold shrink-0">
                                          {s.weekType === "EVEN" ? "Tuần chẵn" : "Tuần lẻ"}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-600 mt-0.5 space-y-0.5">
                                      {lookupTab !== "BY_CLASS" && (
                                        <div>
                                          Lớp:{" "}
                                          <span className="font-semibold text-[#003B3A]">
                                            {s.className}
                                          </span>
                                        </div>
                                      )}
                                      {s.teacherName && (
                                        <div>
                                          GV: {s.teacherName}{" "}
                                          {s.teacherCode ? `(${s.teacherCode})` : ""}
                                        </div>
                                      )}
                                      {s.coTeacherName && (
                                        <div className="text-slate-500">
                                          Đồng giảng: {s.coTeacherName}
                                        </div>
                                      )}
                                      {s.assistantTeacherName && (
                                        <div className="text-slate-500">
                                          Trợ giảng: {s.assistantTeacherName}
                                        </div>
                                      )}
                                      {s.roomName && (
                                        <div className="text-[#00736E] font-medium">
                                          Phòng: {s.roomName}
                                        </div>
                                      )}
                                      {s.altSubjectName && (
                                        <div className="pt-1 mt-1 border-t border-dashed border-slate-200 text-[#D97706]">
                                          Luân phiên: {s.altSubjectName}
                                          {s.altTeacherName ? ` — ${s.altTeacherName}` : ""}
                                        </div>
                                      )}
                                    </div>
                                    {s.id && (
                                      <div className="mt-1.5 pt-1 border-t border-slate-100 print:hidden">
                                        <Link
                                          href={`/teacher/du-gio?tkbSlotId=${s.id}&tkbDate=${dayIso}`}
                                          className="text-[11px] font-semibold text-[#008B85] hover:underline"
                                        >
                                          Đăng ký dự giờ tiết này
                                        </Link>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
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

      {/* Cross-campus & Cross-level Schedule Card when looking up a specific teacher */}
      {lookupTab === "BY_TEACHER" &&
        selectedTeacherId !== "ALL" &&
        crossCampusTeacherSchedule && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-[#003B3A]">
                  Lịch thực tế toàn hệ thống (Liên cấp • Liên cơ sở • Dạy thay trong tuần)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tổng hợp từ mọi phiên bản Đã ban hành và ngoại lệ dạy thay/nghỉ tiết của giáo viên
                  trên toàn bộ cơ sở Sky-Line ({crossCampusTeacherSchedule.weekDates.MONDAY} →{" "}
                  {crossCampusTeacherSchedule.weekDates.SATURDAY})
                </p>
              </div>
              <span className="text-xs font-semibold text-[#00736E] tabular-nums">
                {crossCampusTeacherSchedule.items.length} tiết thực tế trong tuần
              </span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                    Ngày & Thứ
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                    Buổi • Tiết • Giờ
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                    Cơ sở & Lớp
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                    Môn học
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                    Phòng
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">
                    Trạng thái thực tế
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {crossCampusTeacherSchedule.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 px-4 text-center text-slate-500">
                      Chưa có tiết dạy thuộc phiên bản Đã ban hành nào trong tuần đang xem.
                    </td>
                  </tr>
                ) : (
                  crossCampusTeacherSchedule.items.map((item, i) => (
                    <tr
                      key={`${item.date}_${item.session}_${item.periodNumber}_${item.classId}_${i}`}
                      className="transition-colors align-middle hover:bg-[#F8FAFC]"
                    >
                      <td className="py-3 px-3 align-middle font-medium text-slate-800 whitespace-nowrap">
                        {DAY_LABELS[item.dayOfWeek]} ({item.date})
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-700 whitespace-nowrap">
                        {item.session === "MORNING" ? "Sáng" : "Chiều"} • Tiết {item.periodNumber}{" "}
                        <span className="text-slate-500">
                          ({item.startTime}–{item.endTime})
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-700">
                        <span className="font-semibold text-[#003B3A]">{item.className}</span> •{" "}
                        {item.campusName} ({item.level})
                      </td>
                      <td className="py-3 px-3 align-middle font-semibold text-slate-900">
                        {item.subjectName || "—"}
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-600">
                        {item.roomName || "—"}
                      </td>
                      <td className="py-3 px-3 align-middle">
                        {item.isCancelledByLeave ? (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-[#E11D48] border border-rose-200 text-[11px] font-semibold">
                            Báo nghỉ ({item.substitutionReason || "Ngoại lệ ngày"})
                          </span>
                        ) : item.isSubstituted ? (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-[#D97706] border border-amber-200 text-[11px] font-semibold">
                            Điều chỉnh / Dạy thay
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-[#059669] border border-emerald-200 text-[11px] font-semibold">
                            Lịch chuẩn đang áp dụng
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      {/* Matrix Comprehensive View */}
      {lookupTab === "MATRIX" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#003B3A]">
              Ma trận tổng hợp toàn phạm vi ({filterContext.classes.length} lớp)
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">
              Cuộn ngang để xem đầy đủ các ngày trong tuần (cột Lớp được cố định)
            </span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                <th className="sticky left-0 z-20 bg-[#003B3A] py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap border-r border-teal-900">
                  Lớp học
                </th>
                {workingDays.map((day) =>
                  periodRows.map((pr) => (
                    <th
                      key={`${day}_${pr.session}_${pr.periodNumber}`}
                      className="py-2 px-2 text-[11px] font-semibold text-teal-100 whitespace-nowrap text-center border-r border-teal-900/50 min-w-[92px]"
                    >
                      <div>
                        {SHORT_DAY_LABELS[day]} • {pr.session === "MORNING" ? "S" : "C"}
                        {pr.periodNumber}
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {filterContext.classes.length === 0 ? (
                <tr>
                  <td
                    colSpan={1 + workingDays.length * periodRows.length}
                    className="py-8 px-4 text-center text-slate-500"
                  >
                    Không có lớp nào thuộc phạm vi bộ lọc đang chọn.
                  </td>
                </tr>
              ) : (
                filterContext.classes.map((cls) => (
                  <tr key={cls.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                    <td className="sticky left-0 z-10 bg-white py-2.5 px-3 font-bold text-[#003B3A] whitespace-nowrap border-r border-[#E2E8F0]">
                      {cls.className}
                    </td>
                    {workingDays.map((day) =>
                      periodRows.map((pr) => {
                        const cell = matrixMap.get(
                          `${cls.id}_${day}_${pr.session}_${pr.periodNumber}`
                        )
                        return (
                          <td
                            key={`${cls.id}_${day}_${pr.session}_${pr.periodNumber}`}
                            className="py-2 px-2 align-middle text-center border-r border-[#F1F5F9]"
                          >
                            {cell ? (
                              <div className="leading-tight">
                                <div className="font-semibold text-slate-900 truncate max-w-[96px]">
                                  {cell.subjectName}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate max-w-[96px]">
                                  {cell.teacherCode || cell.teacherName || ""}
                                </div>
                                {cell.weekType !== "ALL" && (
                                  <div className="text-[9px] text-[#D97706] font-semibold">
                                    {cell.weekType === "EVEN" ? "Chẵn" : "Lẻ"}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-200">·</span>
                            )}
                          </td>
                        )
                      })
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </TimetableShell>
  )
}
