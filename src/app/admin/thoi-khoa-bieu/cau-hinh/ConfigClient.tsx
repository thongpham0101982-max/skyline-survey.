"use client"

import React, { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { TimetableShell } from "@/components/timetable/TimetableShell"
import { TimetableFilterBar } from "@/components/timetable/TimetableFilterBar"
import { useTimetableFilterNavigation } from "@/components/timetable/useTimetableFilterNavigation"
import {
  ALL_DAYS,
  buildDefaultPeriodTimes,
  DAY_LABELS,
  SHORT_DAY_LABELS,
} from "@/lib/timetable/scopeResolver"
import type {
  BlockRule,
  DayOfWeekCode,
  FixedSlotRule,
  ManageableScopeGroup,
  PeriodTimeDef,
} from "@/lib/timetable/types"
import {
  deleteTimetableBusySlotAction,
  deleteTimetableRoomAction,
  deleteTimetableTravelRuleAction,
  getTimetableConfigPageAction,
  saveTimetableBusySlotAction,
  saveTimetableConfigAction,
  saveTimetableRoomAction,
  saveTimetableTravelRuleAction,
} from "../actions"

type ConfigPageData = Extract<
  Awaited<ReturnType<typeof getTimetableConfigPageAction>>,
  { success: true }
>

export function ConfigClient({ initialData }: { initialData: ConfigPageData }) {
  const { data, loading, errorMessage, reloadWithPatch } =
    useTimetableFilterNavigation<ConfigPageData>(initialData, getTimetableConfigPageAction)

  const [section, setSection] = useState<"FRAME" | "RULES" | "ROOMS" | "BUSY_TRAVEL">("FRAME")
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  // Editable config state synced when filter changes
  const [workingDays, setWorkingDays] = useState<DayOfWeekCode[]>(data.config.workingDays)
  const [morningPeriods, setMorningPeriods] = useState<number>(data.config.morningPeriods)
  const [afternoonPeriods, setAfternoonPeriods] = useState<number>(data.config.afternoonPeriods)
  const [periodTimes, setPeriodTimes] = useState<PeriodTimeDef[]>(data.config.periodTimes)
  const [cycleWeeks, setCycleWeeks] = useState<number>(data.config.cycleWeeks)
  const [cycleAnchorDate, setCycleAnchorDate] = useState<string>(
    data.config.cycleAnchorDate || ""
  )
  const [effectiveFrom, setEffectiveFrom] = useState<string>(data.config.effectiveFrom || "")
  const [effectiveTo, setEffectiveTo] = useState<string>(data.config.effectiveTo || "")
  const [fixedSlots, setFixedSlots] = useState<FixedSlotRule[]>(data.config.fixedSlots)
  const [blockRules, setBlockRules] = useState<BlockRule[]>(data.config.blockRules)
  const [maxSubPerDay, setMaxSubPerDay] = useState<number>(
    data.config.limitsAndPriorities.maxPeriodsPerDayPerSubject || 2
  )
  const [maxTeacherConsecutive, setMaxTeacherConsecutive] = useState<number>(
    data.config.limitsAndPriorities.maxConsecutivePeriodsPerTeacher || 4
  )
  const [maxTeacherPerDay, setMaxTeacherPerDay] = useState<number>(
    data.config.limitsAndPriorities.maxPeriodsPerDayPerTeacher || 7
  )

  useEffect(() => {
    setWorkingDays(data.config.workingDays)
    setMorningPeriods(data.config.morningPeriods)
    setAfternoonPeriods(data.config.afternoonPeriods)
    setPeriodTimes(data.config.periodTimes)
    setCycleWeeks(data.config.cycleWeeks)
    setCycleAnchorDate(data.config.cycleAnchorDate || "")
    setEffectiveFrom(data.config.effectiveFrom || "")
    setEffectiveTo(data.config.effectiveTo || "")
    setFixedSlots(data.config.fixedSlots)
    setBlockRules(data.config.blockRules)
    setMaxSubPerDay(data.config.limitsAndPriorities.maxPeriodsPerDayPerSubject || 2)
    setMaxTeacherConsecutive(
      data.config.limitsAndPriorities.maxConsecutivePeriodsPerTeacher || 4
    )
    setMaxTeacherPerDay(data.config.limitsAndPriorities.maxPeriodsPerDayPerTeacher || 7)
    setDirty(false)
  }, [data.config])

  // New Room form state
  const [roomCode, setRoomCode] = useState("")
  const [roomName, setRoomName] = useState("")
  const [roomType, setRoomType] = useState("FUNCTIONAL")
  const [roomCapacity, setRoomCapacity] = useState(35)
  const [roomSubjectId, setRoomSubjectId] = useState("")

  // New Busy Slot form state
  const [busyTargetType, setBusyTargetType] = useState<"TEACHER" | "ROOM" | "CLASS">("TEACHER")
  const [busyTargetId, setBusyTargetId] = useState("")
  const [busyDay, setBusyDay] = useState<DayOfWeekCode>("MONDAY")
  const [busySession, setBusySession] = useState<"MORNING" | "AFTERNOON">("MORNING")
  const [busyPeriod, setBusyPeriod] = useState(1)
  const [busyReason, setBusyReason] = useState("")

  // New Travel Rule form state
  const [toCampusId, setToCampusId] = useState("")
  const [minTravelMinutes, setMinTravelMinutes] = useState(40)
  const [allowSameSession, setAllowSameSession] = useState(false)
  const [allowSameDay, setAllowSameDay] = useState(true)

  const handleRebuildPeriodGrid = (nextMorning: number, nextAfternoon: number) => {
    setMorningPeriods(nextMorning)
    setAfternoonPeriods(nextAfternoon)
    const defaults = buildDefaultPeriodTimes(
      data.filterContext.selectedScopeGroup,
      nextMorning,
      nextAfternoon
    )
    const merged = defaults.map((def) => {
      const existing = periodTimes.find(
        (p) => p.session === def.session && p.periodNumber === def.periodNumber
      )
      return existing ? { ...existing } : def
    })
    setPeriodTimes(merged)
    setDirty(true)
  }

  const handleSaveConfig = async () => {
    if (!data.filterContext.selectedCampusId) {
      toast.error("Vui lòng chọn cơ sở trước khi lưu cấu hình.")
      return
    }
    setSaving(true)
    const res = await saveTimetableConfigAction({
      academicYearId: data.filterContext.selectedYearId,
      semester: data.filterContext.semester,
      campusId: data.filterContext.selectedCampusId,
      scopeGroup: data.filterContext.selectedScopeGroup as ManageableScopeGroup,
      workingDays,
      morningPeriods,
      afternoonPeriods,
      periodTimes,
      cycleWeeks,
      cycleAnchorDate: cycleAnchorDate || null,
      fixedSlots,
      blockRules,
      limitsAndPriorities: {
        maxPeriodsPerDayPerSubject: maxSubPerDay,
        maxConsecutivePeriodsPerTeacher: maxTeacherConsecutive,
        maxPeriodsPerDayPerTeacher: maxTeacherPerDay,
      },
      effectiveFrom: effectiveFrom || null,
      effectiveTo: effectiveTo || null,
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success("Đã lưu cấu hình thời khóa biểu.")
    setDirty(false)
    await reloadWithPatch({})
  }

  const handleAddFixedSlot = () => {
    const firstSub = data.subjects[0]
    setFixedSlots((prev) => [
      ...prev,
      {
        id: `FX_${Date.now()}`,
        label: "Tiết cố định",
        subjectId: firstSub?.id || "",
        subjectName: firstSub?.subjectName || "Chào cờ",
        dayOfWeek: "MONDAY",
        session: "MORNING",
        periodNumber: 1,
        assignHomeroomTeacher: true,
        weekType: "ALL",
      },
    ])
    setDirty(true)
  }

  const handleAddBlockRule = () => {
    const firstSub = data.subjects[0]
    setBlockRules((prev) => [
      ...prev,
      {
        id: `BL_${Date.now()}`,
        subjectId: firstSub?.id || "",
        subjectName: firstSub?.subjectName || "",
        minConsecutive: 2,
        maxConsecutive: 2,
        requireSameSession: true,
      },
    ])
    setDirty(true)
  }

  return (
    <TimetableShell
      title="Cấu hình thời khóa biểu"
      subtitle="Thiết lập khung ngày học, giờ vào/ra từng tiết theo cơ sở - cấp học, chu kỳ chẵn/lẻ, tiết cố định, phòng chức năng và thời gian di chuyển"
      activeTabCode="CONFIG"
      hasUnsavedChanges={dirty}
      headerActions={
        <button
          type="button"
          onClick={handleSaveConfig}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold hover:bg-[#005250] disabled:opacity-50 transition-colors cursor-pointer"
        >
          {saving ? "Đang lưu..." : "Lưu cấu hình phạm vi này"}
        </button>
      }
    >
      <TimetableFilterBar
        context={data.filterContext}
        onChange={reloadWithPatch}
        hasUnsavedChanges={dirty}
        loading={loading}
        showGradeAndClass={false}
        showVersion={false}
      />

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-[#E11D48] rounded-2xl px-4 py-3 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Section Segmented Switcher */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1.5 shadow-xs inline-flex flex-wrap gap-1">
        {[
          { code: "FRAME", label: "Khung ngày, giờ tiết & chu kỳ tuần" },
          { code: "RULES", label: "Tiết cố định, khối tiết & giới hạn" },
          { code: "ROOMS", label: `Phòng chức năng (${data.rooms.length})` },
          {
            code: "BUSY_TRAVEL",
            label: `Lịch bận (${data.busySlots.length}) & Di chuyển (${data.travelRules.length})`,
          },
        ].map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => setSection(item.code as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              section === item.code
                ? "bg-[#00A19A] text-white"
                : "text-slate-600 hover:bg-[#F8FAFC] hover:text-[#003B3A]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === "FRAME" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#003B3A]">
              Khung ngày học, số tiết sáng/chiều và chu kỳ tuần
            </h2>

            {/* Working Days */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Ngày học trong tuần
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map((day) => {
                  const checked = workingDays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setWorkingDays((prev) =>
                          checked ? prev.filter((d) => d !== day) : [...prev, day]
                        )
                        setDirty(true)
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        checked
                          ? "bg-[#F0FDFA] border-[#00A19A] text-[#003B3A]"
                          : "bg-white border-[#E2E8F0] text-slate-500"
                      }`}
                    >
                      {DAY_LABELS[day]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 tabular-nums">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Số tiết buổi sáng (mặc định 4)
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={morningPeriods}
                  onChange={(e) =>
                    handleRebuildPeriodGrid(Number(e.target.value || 4), afternoonPeriods)
                  }
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Số tiết buổi chiều (mặc định 4)
                </label>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={afternoonPeriods}
                  onChange={(e) =>
                    handleRebuildPeriodGrid(morningPeriods, Number(e.target.value || 0))
                  }
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Chu kỳ tuần
                </label>
                <select
                  value={cycleWeeks}
                  onChange={(e) => {
                    setCycleWeeks(Number(e.target.value))
                    setDirty(true)
                  }}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-semibold"
                >
                  <option value={1}>1 tuần (cố định hàng tuần)</option>
                  <option value={2}>2 tuần (luân phiên tuần lẻ / chẵn)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mốc Thứ Hai tuần 1 (Tuần lẻ)
                </label>
                <input
                  type="date"
                  value={cycleAnchorDate}
                  onChange={(e) => {
                    setCycleAnchorDate(e.target.value)
                    setDirty(true)
                  }}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Hiệu lực từ ngày
                </label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => {
                    setEffectiveFrom(e.target.value)
                    setDirty(true)
                  }}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={effectiveTo}
                  onChange={(e) => {
                    setEffectiveTo(e.target.value)
                    setDirty(true)
                  }}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Bell Times Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
            <div className="px-4 py-3 border-b border-[#E2E8F0]">
              <h3 className="text-xs font-bold text-[#003B3A]">
                Khung giờ thực tế từng tiết (dùng để đối chiếu trùng lịch liên cấp và thời gian di chuyển liên cơ sở)
              </h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Buổi</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Tiết thứ</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Nhãn hiển thị</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4]">
                    Giờ bắt đầu
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4]">
                    Giờ kết thúc
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {periodTimes.map((pt, idx) => (
                  <tr key={`${pt.session}_${pt.periodNumber}`} className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {pt.session === "MORNING" ? "Buổi sáng" : "Buổi chiều"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">Tiết {pt.periodNumber}</td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={pt.label}
                        onChange={(e) => {
                          const next = [...periodTimes]
                          next[idx] = { ...pt, label: e.target.value }
                          setPeriodTimes(next)
                          setDirty(true)
                        }}
                        className="rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs w-44"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="time"
                        value={pt.startTime}
                        onChange={(e) => {
                          const next = [...periodTimes]
                          next[idx] = { ...pt, startTime: e.target.value }
                          setPeriodTimes(next)
                          setDirty(true)
                        }}
                        className="rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="time"
                        value={pt.endTime}
                        onChange={(e) => {
                          const next = [...periodTimes]
                          next[idx] = { ...pt, endTime: e.target.value }
                          setPeriodTimes(next)
                          setDirty(true)
                        }}
                        className="rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === "RULES" && (
        <div className="space-y-4">
          {/* Limits */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số tiết tối đa / ngày / môn trên 1 lớp
              </label>
              <input
                type="number"
                min={1}
                max={4}
                value={maxSubPerDay}
                onChange={(e) => {
                  setMaxSubPerDay(Number(e.target.value || 2))
                  setDirty(true)
                }}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số tiết dạy liên tiếp tối đa của GV / buổi
              </label>
              <input
                type="number"
                min={1}
                max={6}
                value={maxTeacherConsecutive}
                onChange={(e) => {
                  setMaxTeacherConsecutive(Number(e.target.value || 4))
                  setDirty(true)
                }}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tổng số tiết dạy tối đa / ngày của GV
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxTeacherPerDay}
                onChange={(e) => {
                  setMaxTeacherPerDay(Number(e.target.value || 7))
                  setDirty(true)
                }}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Fixed Slots */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#003B3A]">
                Tiết cố định theo cấu hình (Chào cờ, Sinh hoạt lớp, HĐTN...)
              </h3>
              <button
                type="button"
                onClick={handleAddFixedSlot}
                className="px-3 py-1.5 rounded-xl bg-[#00A19A] text-white text-xs font-semibold hover:bg-[#008B85] cursor-pointer"
              >
                Thêm tiết cố định
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Môn / Hoạt động</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Thứ</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Buổi</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Tiết</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4]">
                      Gán GV chủ nhiệm
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {fixedSlots.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 px-4 text-center text-slate-500">
                        Chưa cấu hình tiết cố định nào (hệ thống không tự ý khóa cứng Thứ Hai Tiết 1).
                      </td>
                    </tr>
                  ) : (
                    fixedSlots.map((fs, idx) => (
                      <tr key={fs.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3">
                          <select
                            value={fs.subjectId || ""}
                            onChange={(e) => {
                              const sub = data.subjects.find((s) => s.id === e.target.value)
                              const next = [...fixedSlots]
                              next[idx] = {
                                ...fs,
                                subjectId: sub?.id || "",
                                subjectName: sub?.subjectName || fs.subjectName,
                              }
                              setFixedSlots(next)
                              setDirty(true)
                            }}
                            className="rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs w-56"
                          >
                            {data.subjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.subjectName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={fs.dayOfWeek}
                            onChange={(e) => {
                              const next = [...fixedSlots]
                              next[idx] = { ...fs, dayOfWeek: e.target.value as DayOfWeekCode }
                              setFixedSlots(next)
                              setDirty(true)
                            }}
                            className="rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-xs"
                          >
                            {ALL_DAYS.map((d) => (
                              <option key={d} value={d}>
                                {SHORT_DAY_LABELS[d]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={fs.session}
                            onChange={(e) => {
                              const next = [...fixedSlots]
                              next[idx] = { ...fs, session: e.target.value as any }
                              setFixedSlots(next)
                              setDirty(true)
                            }}
                            className="rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-xs"
                          >
                            <option value="MORNING">Sáng</option>
                            <option value="AFTERNOON">Chiều</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min={1}
                            max={6}
                            value={fs.periodNumber}
                            onChange={(e) => {
                              const next = [...fixedSlots]
                              next[idx] = { ...fs, periodNumber: Number(e.target.value || 1) }
                              setFixedSlots(next)
                              setDirty(true)
                            }}
                            className="rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-xs w-16"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={Boolean(fs.assignHomeroomTeacher)}
                            onChange={(e) => {
                              const next = [...fixedSlots]
                              next[idx] = { ...fs, assignHomeroomTeacher: e.target.checked }
                              setFixedSlots(next)
                              setDirty(true)
                            }}
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setFixedSlots((prev) => prev.filter((_, i) => i !== idx))
                              setDirty(true)
                            }}
                            className="text-[#E11D48] hover:underline font-semibold cursor-pointer"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Block Rules */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#003B3A]">
                Ràng buộc khối tiết liên tiếp (Tiết đôi cùng buổi)
              </h3>
              <button
                type="button"
                onClick={handleAddBlockRule}
                className="px-3 py-1.5 rounded-xl bg-[#00A19A] text-white text-xs font-semibold hover:bg-[#008B85] cursor-pointer"
              >
                Thêm quy tắc tiết đôi
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Môn học</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">
                      Số tiết liên tiếp
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4]">
                      Bắt buộc cùng buổi
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {blockRules.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 px-4 text-center text-slate-500">
                        Chưa khai báo quy tắc khối tiết đôi.
                      </td>
                    </tr>
                  ) : (
                    blockRules.map((br, idx) => (
                      <tr key={br.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3">
                          <select
                            value={br.subjectId || ""}
                            onChange={(e) => {
                              const sub = data.subjects.find((s) => s.id === e.target.value)
                              const next = [...blockRules]
                              next[idx] = {
                                ...br,
                                subjectId: sub?.id || "",
                                subjectName: sub?.subjectName || "",
                              }
                              setBlockRules(next)
                              setDirty(true)
                            }}
                            className="rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs w-64"
                          >
                            {data.subjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.subjectName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min={2}
                            max={4}
                            value={br.minConsecutive}
                            onChange={(e) => {
                              const v = Number(e.target.value || 2)
                              const next = [...blockRules]
                              next[idx] = { ...br, minConsecutive: v, maxConsecutive: v }
                              setBlockRules(next)
                              setDirty(true)
                            }}
                            className="rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-xs w-20"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={br.requireSameSession}
                            onChange={(e) => {
                              const next = [...blockRules]
                              next[idx] = { ...br, requireSameSession: e.target.checked }
                              setBlockRules(next)
                              setDirty(true)
                            }}
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setBlockRules((prev) => prev.filter((_, i) => i !== idx))
                              setDirty(true)
                            }}
                            className="text-[#E11D48] hover:underline font-semibold cursor-pointer"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {section === "ROOMS" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mã phòng</label>
              <input
                type="text"
                placeholder="VD: LAB-TIN-01"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tên phòng</label>
              <input
                type="text"
                placeholder="VD: Phòng Tin học 1"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Loại phòng</label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
              >
                <option value="FUNCTIONAL">Phòng chức năng / Lab</option>
                <option value="SPORT">Sân bãi / Thể chất</option>
                <option value="CLASSROOM">Phòng học tiêu chuẩn</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Môn chuyên dụng
              </label>
              <select
                value={roomSubjectId}
                onChange={(e) => setRoomSubjectId(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
              >
                <option value="">Tất cả môn</option>
                {data.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subjectName}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={async () => {
                const res = await saveTimetableRoomAction({
                  campusId: data.filterContext.selectedCampusId,
                  roomCode,
                  roomName,
                  roomType,
                  capacity: roomCapacity,
                  allowedSubjectIds: roomSubjectId ? [roomSubjectId] : [],
                })
                if (!res.success) {
                  toast.error(res.error)
                  return
                }
                toast.success("Đã lưu phòng học.")
                setRoomCode("")
                setRoomName("")
                await reloadWithPatch({})
              }}
              className="px-3.5 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold hover:bg-[#005250] cursor-pointer"
            >
              Lưu phòng
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Mã phòng</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Tên phòng</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Loại</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 text-right">
                    Sức chứa
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-white text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {data.rooms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 px-4 text-center text-slate-500">
                      Chưa khai báo phòng chức năng cho cơ sở này.
                    </td>
                  </tr>
                ) : (
                  data.rooms.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                        {r.roomCode}
                      </td>
                      <td className="py-3 px-3 text-slate-800">{r.roomName}</td>
                      <td className="py-3 px-3 text-slate-600">{r.roomType}</td>
                      <td className="py-3 px-3 text-right">{r.capacity}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await deleteTimetableRoomAction(r.id)
                            if (res.success) await reloadWithPatch({})
                          }}
                          className="text-[#E11D48] hover:underline font-semibold cursor-pointer"
                        >
                          Ngưng dùng
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === "BUSY_TRAVEL" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Busy Slots */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-[#003B3A]">Khai báo lịch bận (Giáo viên / Phòng / Lớp)</h3>
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={busyTargetType}
                  onChange={(e) => {
                    setBusyTargetType(e.target.value as any)
                    setBusyTargetId("")
                  }}
                  className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
                >
                  <option value="TEACHER">Giáo viên</option>
                  <option value="ROOM">Phòng học</option>
                  <option value="CLASS">Lớp học</option>
                </select>

                <select
                  value={busyTargetId}
                  onChange={(e) => setBusyTargetId(e.target.value)}
                  className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
                >
                  <option value="">-- Chọn đối tượng --</option>
                  {busyTargetType === "TEACHER" &&
                    data.teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teacherName} ({t.teacherCode})
                      </option>
                    ))}
                  {busyTargetType === "ROOM" &&
                    data.rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roomName} ({r.roomCode})
                      </option>
                    ))}
                  {busyTargetType === "CLASS" &&
                    data.filterContext.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Lớp {c.className}
                      </option>
                    ))}
                </select>

                <select
                  value={busyDay}
                  onChange={(e) => setBusyDay(e.target.value as DayOfWeekCode)}
                  className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
                >
                  {ALL_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {DAY_LABELS[d]}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <select
                    value={busySession}
                    onChange={(e) => setBusySession(e.target.value as any)}
                    className="rounded-xl border border-[#E2E8F0] px-2.5 py-2 text-xs flex-1"
                  >
                    <option value="MORNING">Sáng</option>
                    <option value="AFTERNOON">Chiều</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={busyPeriod}
                    onChange={(e) => setBusyPeriod(Number(e.target.value || 1))}
                    className="rounded-xl border border-[#E2E8F0] px-2.5 py-2 text-xs w-20 tabular-nums"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Lý do bận (VD: Họp chuyên môn)"
                  value={busyReason}
                  onChange={(e) => setBusyReason(e.target.value)}
                  className="col-span-2 rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!busyTargetId) {
                    toast.error("Vui lòng chọn đối tượng báo bận.")
                    return
                  }
                  const res = await saveTimetableBusySlotAction({
                    academicYearId: data.filterContext.selectedYearId,
                    semester: data.filterContext.semester,
                    campusId: data.filterContext.selectedCampusId,
                    targetType: busyTargetType,
                    targetId: busyTargetId,
                    dayOfWeek: busyDay,
                    session: busySession,
                    periodNumber: busyPeriod,
                    reason: busyReason,
                  })
                  if (!res.success) {
                    toast.error(res.error)
                    return
                  }
                  toast.success("Đã thêm khung giờ bận.")
                  setBusyReason("")
                  await reloadWithPatch({})
                }}
                className="px-3.5 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer"
              >
                Thêm lịch bận
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Đối tượng</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Khung giờ</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Lý do</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {data.busySlots.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 px-3 text-center text-slate-500">
                        Chưa có lịch bận nào.
                      </td>
                    </tr>
                  ) : (
                    data.busySlots.map((bs) => {
                      const label =
                        bs.targetType === "TEACHER"
                          ? data.teachers.find((t) => t.id === bs.targetId)?.teacherName || bs.targetId
                          : bs.targetType === "ROOM"
                          ? data.rooms.find((r) => r.id === bs.targetId)?.roomName || bs.targetId
                          : data.filterContext.classes.find((c) => c.id === bs.targetId)?.className ||
                            bs.targetId
                      return (
                        <tr key={bs.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{label}</td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {SHORT_DAY_LABELS[bs.dayOfWeek]} •{" "}
                            {bs.session === "MORNING" ? "Sáng" : "Chiều"} T{bs.periodNumber}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{bs.reason || "—"}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await deleteTimetableBusySlotAction(bs.id)
                                if (res.success) await reloadWithPatch({})
                              }}
                              className="text-[#E11D48] hover:underline font-semibold cursor-pointer"
                            >
                              Xóa
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

          {/* Inter-Campus Travel Rules */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-[#003B3A]">
                Quy tắc thời gian di chuyển liên cơ sở (từ cơ sở đang chọn)
              </h3>
              <div className="grid grid-cols-2 gap-2.5 tabular-nums">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Cơ sở đến
                  </label>
                  <select
                    value={toCampusId}
                    onChange={(e) => setToCampusId(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
                  >
                    <option value="">-- Chọn cơ sở đến --</option>
                    {data.filterContext.permittedCampuses
                      .filter((c) => c.id !== data.filterContext.selectedCampusId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.displayName}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Thời gian di chuyển tối thiểu (phút)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={minTravelMinutes}
                    onChange={(e) => setMinTravelMinutes(Number(e.target.value || 40))}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowSameSession}
                    onChange={(e) => setAllowSameSession(e.target.checked)}
                  />
                  <span>Cho phép di chuyển trong cùng buổi</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowSameDay}
                    onChange={(e) => setAllowSameDay(e.target.checked)}
                  />
                  <span>Cho phép di chuyển khác buổi cùng ngày</span>
                </label>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!toCampusId) {
                    toast.error("Vui lòng chọn cơ sở đến.")
                    return
                  }
                  const res = await saveTimetableTravelRuleAction({
                    academicYearId: data.filterContext.selectedYearId,
                    fromCampusId: data.filterContext.selectedCampusId,
                    toCampusId,
                    minTravelMinutes,
                    allowSameSession,
                    allowSameDay,
                  })
                  if (!res.success) {
                    toast.error(res.error)
                    return
                  }
                  toast.success("Đã lưu quy tắc di chuyển liên cơ sở.")
                  await reloadWithPatch({})
                }}
                className="px-3.5 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer"
              >
                Lưu quy tắc di chuyển
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Chặng cơ sở</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 text-right">
                      Tối thiểu (phút)
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4]">
                      Quy định buổi
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {data.travelRules.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 px-3 text-center text-slate-500">
                        Đang áp dụng mặc định toàn trường (tối thiểu 40 phút giữa 2 buổi khác cơ sở).
                      </td>
                    </tr>
                  ) : (
                    data.travelRules.map((tr) => {
                      const fromName =
                        data.filterContext.permittedCampuses.find((c) => c.id === tr.fromCampusId)
                          ?.campusCode || tr.fromCampusId
                      const toName =
                        data.filterContext.permittedCampuses.find((c) => c.id === tr.toCampusId)
                          ?.campusCode || tr.toCampusId
                      return (
                        <tr key={tr.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {fromName} → {toName}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold">
                            {tr.minTravelMinutes} phút
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {!tr.allowSameDay
                              ? "Cấm cùng ngày"
                              : tr.allowSameSession
                              ? "Cho phép cùng buổi"
                              : "Chỉ khác buổi"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await deleteTimetableTravelRuleAction(tr.id)
                                if (res.success) await reloadWithPatch({})
                              }}
                              className="text-[#E11D48] hover:underline font-semibold cursor-pointer"
                            >
                              Xóa
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
      )}
    </TimetableShell>
  )
}
