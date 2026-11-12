"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { Printer } from "lucide-react"
import { fetchTeacherPortalScheduleAction } from "./actions"
import type { DayOfWeekCode, EffectivePeriodItem } from "@/lib/timetable/types"

const WORKING_DAYS: Array<{ code: DayOfWeekCode; label: string }> = [
  { code: "MONDAY", label: "Thứ Hai" },
  { code: "TUESDAY", label: "Thứ Ba" },
  { code: "WEDNESDAY", label: "Thứ Tư" },
  { code: "THURSDAY", label: "Thứ Năm" },
  { code: "FRIDAY", label: "Thứ Sáu" },
  { code: "SATURDAY", label: "Thứ Bảy" },
]

interface TeacherTimetablePortalProps {
  currentTeacher: {
    id: string
    teacherCode: string
    teacherName: string
  } | null
  initialWeekDate: string
  initialMySchedule: {
    weekDates: Record<DayOfWeekCode, string>
    items: EffectivePeriodItem[]
    campusesInvolved: Array<{ id: string; name: string }>
  }
  campuses: Array<{ id: string; displayName: string }>
  classes: Array<{
    id: string
    className: string
    grade: string
    level: string
    campusId: string
  }>
  teachers: Array<{
    id: string
    teacherCode: string
    teacherName: string
    departmentName: string
  }>
}

export default function TeacherTimetableLookupClient({
  currentTeacher,
  initialWeekDate,
  initialMySchedule,
  campuses,
  classes,
  teachers,
}: TeacherTimetablePortalProps) {
  const [activeTab, setActiveTab] = useState<"MY_SCHEDULE" | "CLASS_LOOKUP" | "COLLEAGUE_LOOKUP">(
    currentTeacher ? "MY_SCHEDULE" : "CLASS_LOOKUP"
  )
  const [weekDate, setWeekDate] = useState<string>(initialWeekDate)
  const [loading, setLoading] = useState(false)

  // Personal schedule state
  const [mySchedule, setMySchedule] = useState(initialMySchedule)

  // Class lookup state
  const [selectedCampusId, setSelectedCampusId] = useState<string>(campuses[0]?.id || "ALL")
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "")
  const [classSchedule, setClassSchedule] = useState<{
    weekParity: string
    weekDates: Record<DayOfWeekCode, string>
    items: EffectivePeriodItem[]
  } | null>(null)

  // Colleague lookup state
  const [colleagueSearch, setColleagueSearch] = useState("")
  const [selectedColleagueId, setSelectedColleagueId] = useState<string>(
    teachers[0]?.id || ""
  )
  const [colleagueSchedule, setColleagueSchedule] = useState<{
    weekDates: Record<DayOfWeekCode, string>
    items: EffectivePeriodItem[]
    campusesInvolved: Array<{ id: string; name: string }>
  } | null>(null)

  const filteredClasses = useMemo(() => {
    if (!selectedCampusId || selectedCampusId === "ALL") return classes
    return classes.filter((c) => c.campusId === selectedCampusId)
  }, [classes, selectedCampusId])

  const filteredTeachers = useMemo(() => {
    if (!colleagueSearch.trim()) return teachers
    const q = colleagueSearch.trim().toLowerCase()
    return teachers.filter(
      (t) =>
        t.teacherName.toLowerCase().includes(q) ||
        t.teacherCode.toLowerCase().includes(q) ||
        t.departmentName.toLowerCase().includes(q)
    )
  }, [colleagueSearch, teachers])

  const loadForCurrentTab = async (
    tab: "MY_SCHEDULE" | "CLASS_LOOKUP" | "COLLEAGUE_LOOKUP",
    targetWeek: string,
    overrideTargetId?: string
  ) => {
    setLoading(true)
    try {
      if (tab === "MY_SCHEDULE" && currentTeacher) {
        const res = await fetchTeacherPortalScheduleAction({
          mode: "TEACHER",
          targetId: currentTeacher.id,
          weekDate: targetWeek,
        })
        if (res.success && res.mode === "TEACHER") {
          setMySchedule(res.teacherSchedule)
        }
      } else if (tab === "CLASS_LOOKUP") {
        const cId = overrideTargetId ?? selectedClassId
        if (!cId) return
        const res = await fetchTeacherPortalScheduleAction({
          mode: "CLASS",
          targetId: cId,
          weekDate: targetWeek,
        })
        if (res.success && res.mode === "CLASS") {
          setClassSchedule({
            weekParity: res.classSchedule.weekParity,
            weekDates: res.classSchedule.weekDates,
            items: res.classSchedule.items,
          })
        }
      } else if (tab === "COLLEAGUE_LOOKUP") {
        const tId = overrideTargetId ?? selectedColleagueId
        if (!tId) return
        const res = await fetchTeacherPortalScheduleAction({
          mode: "TEACHER",
          targetId: tId,
          weekDate: targetWeek,
        })
        if (res.success && res.mode === "TEACHER") {
          setColleagueSchedule(res.teacherSchedule)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const activeItems =
    activeTab === "MY_SCHEDULE"
      ? mySchedule.items
      : activeTab === "CLASS_LOOKUP"
      ? classSchedule?.items || []
      : colleagueSchedule?.items || []

  const activeWeekDates =
    activeTab === "MY_SCHEDULE"
      ? mySchedule.weekDates
      : activeTab === "CLASS_LOOKUP"
      ? classSchedule?.weekDates || mySchedule.weekDates
      : colleagueSchedule?.weekDates || mySchedule.weekDates

  const maxMorning = Math.max(
    4,
    ...activeItems.filter((i) => i.session === "MORNING").map((i) => i.periodNumber)
  )
  const maxAfternoon = Math.max(
    4,
    ...activeItems.filter((i) => i.session === "AFTERNOON").map((i) => i.periodNumber)
  )

  const periodRows = useMemo(() => {
    const rows: Array<{ session: "MORNING" | "AFTERNOON"; periodNumber: number; label: string }> = []
    for (let p = 1; p <= maxMorning; p++) {
      rows.push({ session: "MORNING", periodNumber: p, label: `Sáng • Tiết ${p}` })
    }
    for (let p = 1; p <= maxAfternoon; p++) {
      rows.push({ session: "AFTERNOON", periodNumber: p, label: `Chiều • Tiết ${p}` })
    }
    return rows
  }, [maxAfternoon, maxMorning])

  const cellMap = useMemo(() => {
    const map = new Map<string, EffectivePeriodItem[]>()
    for (const item of activeItems) {
      const k = `${item.dayOfWeek}_${item.session}_${item.periodNumber}`
      const arr = map.get(k) || []
      arr.push(item)
      map.set(k, arr)
    }
    return map
  }, [activeItems])

  const activeTeachingCount = activeItems.filter((i) => !i.isCancelledByLeave).length
  const substitutedCount = activeItems.filter((i) => i.isSubstituted).length

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 space-y-4 pb-10">
      {/* Masthead */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] px-5 py-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#003B3A] tracking-tight">
            Thời khóa biểu & Lịch giảng dạy thực tế
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Tổng hợp tự động lịch giảng dạy liên cấp (Tiểu học, Trung học, Hill), liên cơ sở, đồng
            giảng và ngoại lệ dạy thay theo tuần
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#003B3A] text-xs font-semibold hover:bg-[#F8FAFC] transition-colors print:hidden cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          In lịch tuần
        </button>
      </div>

      {/* Navigation & Week Selector Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-1">
          {currentTeacher && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("MY_SCHEDULE")
                loadForCurrentTab("MY_SCHEDULE", weekDate)
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "MY_SCHEDULE"
                  ? "bg-[#003B3A] text-white"
                  : "text-slate-600 hover:text-[#003B3A] hover:bg-[#F8FAFC]"
              }`}
            >
              Lịch dạy của tôi ({currentTeacher.teacherCode})
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setActiveTab("CLASS_LOOKUP")
              loadForCurrentTab("CLASS_LOOKUP", weekDate, selectedClassId)
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "CLASS_LOOKUP"
                ? "bg-[#003B3A] text-white"
                : "text-slate-600 hover:text-[#003B3A] hover:bg-[#F8FAFC]"
            }`}
          >
            Tra cứu theo lớp
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("COLLEAGUE_LOOKUP")
              loadForCurrentTab("COLLEAGUE_LOOKUP", weekDate, selectedColleagueId)
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "COLLEAGUE_LOOKUP"
                ? "bg-[#003B3A] text-white"
                : "text-slate-600 hover:text-[#003B3A] hover:bg-[#F8FAFC]"
            }`}
          >
            Tra cứu lịch đồng nghiệp
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 tabular-nums">
          <label className="text-xs font-semibold text-slate-600">Tuần đang xem:</label>
          <input
            type="date"
            value={weekDate}
            disabled={loading}
            onChange={(e) => {
              const nextDate = e.target.value
              setWeekDate(nextDate)
              if (nextDate) loadForCurrentTab(activeTab, nextDate)
            }}
            className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
          />
        </div>
      </div>

      {/* Contextual Lookup Pickers */}
      {activeTab === "CLASS_LOOKUP" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Cơ sở đào tạo
            </label>
            <select
              value={selectedCampusId}
              onChange={(e) => {
                const cId = e.target.value
                setSelectedCampusId(cId)
                const firstCls = classes.find((c) => cId === "ALL" || c.campusId === cId)
                if (firstCls) {
                  setSelectedClassId(firstCls.id)
                  loadForCurrentTab("CLASS_LOOKUP", weekDate, firstCls.id)
                }
              }}
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none"
            >
              <option value="ALL">Tất cả cơ sở</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Lớp học (chỉ hiển thị lịch Đã ban hành có hiệu lực)
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                const clsId = e.target.value
                setSelectedClassId(clsId)
                loadForCurrentTab("CLASS_LOOKUP", weekDate, clsId)
              }}
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
            >
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  Lớp {c.className} (Khối {c.grade} • {c.level})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {activeTab === "COLLEAGUE_LOOKUP" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Tìm nhanh theo họ tên, mã giáo viên hoặc tổ bộ môn
            </label>
            <input
              type="text"
              value={colleagueSearch}
              onChange={(e) => setColleagueSearch(e.target.value)}
              placeholder="Nhập tên hoặc mã GV..."
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-slate-800 focus:border-[#00A19A] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Chọn giáo viên
            </label>
            <select
              value={selectedColleagueId}
              onChange={(e) => {
                const tId = e.target.value
                setSelectedColleagueId(tId)
                loadForCurrentTab("COLLEAGUE_LOOKUP", weekDate, tId)
              }}
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
            >
              {filteredTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.teacherCode}] {t.teacherName} {t.departmentName ? `— ${t.departmentName}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Compact Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">Tổng số tiết thực tế / tuần</div>
          <div className="text-lg font-bold text-[#003B3A] mt-0.5">{activeTeachingCount} tiết</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">Cơ sở tham gia giảng dạy</div>
          <div className="text-sm font-bold text-[#00736E] mt-1">
            {activeTab === "MY_SCHEDULE"
              ? mySchedule.campusesInvolved.map((c) => c.name).join(" • ") || "Chưa phát sinh tiết"
              : activeTab === "COLLEAGUE_LOOKUP"
              ? colleagueSchedule?.campusesInvolved.map((c) => c.name).join(" • ") || "—"
              : "Lịch chuẩn theo lớp"}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">Điều chỉnh / Dạy thay trong tuần</div>
          <div
            className={`text-lg font-bold mt-0.5 ${
              substitutedCount > 0 ? "text-[#D97706]" : "text-[#059669]"
            }`}
          >
            {substitutedCount} tiết thay đổi
          </div>
        </div>
      </div>

      {/* Main Academic Ledger Timetable Grid */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003B3A] border-b border-[#003B3A]">
              <th className="sticky left-0 z-10 bg-[#003B3A] py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap w-32">
                Buổi & Tiết
              </th>
              {WORKING_DAYS.map((d) => (
                <th
                  key={d.code}
                  className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap min-w-[175px]"
                >
                  <div>{d.label}</div>
                  <div className="text-[10px] font-normal text-[#5EEAD4] tabular-nums">
                    {activeWeekDates[d.code] || ""}
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
                  <td className="sticky left-0 z-10 bg-white py-3 px-3 align-middle font-semibold text-[#003B3A] border-r border-[#E2E8F0] whitespace-nowrap">
                    {pr.label}
                  </td>
                  {WORKING_DAYS.map((d) => {
                    const cells = cellMap.get(`${d.code}_${pr.session}_${pr.periodNumber}`) || []
                    return (
                      <td
                        key={d.code}
                        className="py-2.5 px-3 align-top border-r border-[#F1F5F9] last:border-r-0"
                      >
                        {cells.length === 0 ? (
                          <span className="text-slate-300 text-[11px]">—</span>
                        ) : (
                          <div className="space-y-1.5">
                            {cells.map((item, cIdx) => (
                              <div
                                key={`${item.slotId || cIdx}_${item.classId}`}
                                className={`rounded-xl border p-2.5 ${
                                  item.isCancelledByLeave
                                    ? "bg-rose-50/60 border-rose-200 line-through opacity-75"
                                    : item.isSubstituted
                                    ? "bg-amber-50/60 border-amber-200"
                                    : "bg-[#F8FAFC] border-[#E2E8F0]"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-semibold text-slate-900">
                                    {item.subjectName || "Tiết học"}
                                  </span>
                                  <span className="text-[10px] font-semibold text-[#00736E] whitespace-nowrap">
                                    {item.startTime}–{item.endTime}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                                  <div>
                                    Lớp:{" "}
                                    <span className="font-bold text-[#003B3A]">
                                      {item.className}
                                    </span>{" "}
                                    • {item.campusName}
                                  </div>
                                  {activeTab === "CLASS_LOOKUP" && item.teacherName && (
                                    <div>
                                      GV: {item.teacherName}{" "}
                                      {item.teacherCode ? `(${item.teacherCode})` : ""}
                                    </div>
                                  )}
                                  {item.coTeacherName && (
                                    <div className="text-slate-500">
                                      Đồng giảng: {item.coTeacherName}
                                    </div>
                                  )}
                                  {item.assistantTeacherName && (
                                    <div className="text-slate-500">
                                      Trợ giảng: {item.assistantTeacherName}
                                    </div>
                                  )}
                                  {item.roomName && (
                                    <div className="text-[#00736E] font-medium">
                                      Phòng: {item.roomName}
                                    </div>
                                  )}
                                  {item.isSubstituted && (
                                    <div className="text-[#D97706] font-semibold">
                                      {item.isCancelledByLeave
                                        ? `Báo nghỉ: ${item.substitutionReason || ""}`
                                        : `Điều chỉnh ngày (${item.substitutionAction})`}
                                    </div>
                                  )}
                                </div>

                                {item.slotId && !item.isCancelledByLeave && (
                                  <div className="mt-1.5 pt-1 border-t border-slate-200/70 print:hidden">
                                    <Link
                                      href={`/teacher/du-gio?tkbSlotId=${item.slotId}&tkbDate=${item.date}`}
                                      className="text-[11px] font-semibold text-[#008B85] hover:underline"
                                    >
                                      {activeTab === "MY_SCHEDULE"
                                        ? "Mở đăng ký dự giờ tiết này"
                                        : "Đề xuất dự giờ tiết này"}
                                    </Link>
                                  </div>
                                )}
                              </div>
                            ))}
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
    </div>
  )
}
