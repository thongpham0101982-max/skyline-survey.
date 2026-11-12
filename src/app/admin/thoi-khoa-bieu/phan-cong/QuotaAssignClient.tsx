"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import { TimetableShell } from "@/components/timetable/TimetableShell"
import { TimetableFilterBar } from "@/components/timetable/TimetableFilterBar"
import { useTimetableFilterNavigation } from "@/components/timetable/useTimetableFilterNavigation"
import type { ManageableScopeGroup } from "@/lib/timetable/types"
import {
  assignTeacherToClassSubjectAction,
  getTimetableQuotaPageAction,
  updateSubjectGradeQuotaAction,
} from "../actions"

type QuotaPageData = Extract<
  Awaited<ReturnType<typeof getTimetableQuotaPageAction>>,
  { success: true }
>

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  OK: {
    label: "Đủ định mức & GV",
    className: "bg-emerald-50 text-[#059669] border border-emerald-200",
  },
  MISSING_TEACHER: {
    label: "Thiếu phân công GV",
    className: "bg-rose-50 text-[#E11D48] border border-rose-200",
  },
  UNDER_SCHEDULED: {
    label: "Chưa xếp đủ tiết",
    className: "bg-amber-50 text-[#D97706] border border-amber-200",
  },
  OVER_SCHEDULED: {
    label: "Vượt định mức",
    className: "bg-rose-50 text-[#E11D48] border border-rose-200",
  },
  NO_QUOTA_DEFINED: {
    label: "Chưa khai định mức",
    className: "bg-slate-100 text-slate-700 border border-slate-200",
  },
}

export function QuotaAssignClient({ initialData }: { initialData: QuotaPageData }) {
  const { data, loading, errorMessage, reloadWithPatch } =
    useTimetableFilterNavigation<QuotaPageData>(initialData, getTimetableQuotaPageAction)

  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const filteredItems = useMemo(() => {
    return data.items.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase()
        const hay = `${item.className} ${item.subjectName} ${item.primaryTeacherName || ""} ${item.primaryTeacherCode || ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [data.items, statusFilter, searchTerm])

  const counts = useMemo(() => {
    return {
      total: data.items.length,
      missingTeacher: data.items.filter((i) => i.status === "MISSING_TEACHER").length,
      underScheduled: data.items.filter((i) => i.status === "UNDER_SCHEDULED").length,
      ok: data.items.filter((i) => i.status === "OK").length,
    }
  }, [data.items])

  const handleQuotaBlur = async (
    subjectId: string,
    studyProgram: string,
    grade: string,
    currentVal: number,
    nextRaw: string
  ) => {
    const parsed = Number(nextRaw)
    if (Number.isNaN(parsed) || parsed < 0 || parsed === currentVal) return
    const key = `Q_${subjectId}_${studyProgram}_${grade}`
    setSavingKey(key)
    const res = await updateSubjectGradeQuotaAction({
      academicYearId: data.filterContext.selectedYearId,
      campusId: data.filterContext.selectedCampusId,
      subjectId,
      studyProgram,
      grade,
      weeklyQuota: parsed,
    })
    setSavingKey(null)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(`Đã cập nhật định mức khối ${grade} (${studyProgram}): ${parsed} tiết/tuần.`)
    await reloadWithPatch({})
  }

  const handleTeacherChange = async (
    classId: string,
    subjectId: string,
    teacherId: string
  ) => {
    const key = `T_${classId}_${subjectId}`
    setSavingKey(key)
    const res = await assignTeacherToClassSubjectAction({
      academicYearId: data.filterContext.selectedYearId,
      semester: data.filterContext.semester,
      campusId: data.filterContext.selectedCampusId,
      scopeGroup: data.filterContext.selectedScopeGroup as ManageableScopeGroup,
      classId,
      subjectId,
      teacherId,
    })
    setSavingKey(null)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success("Đã cập nhật phân công giảng dạy đồng bộ hệ thống.")
    await reloadWithPatch({})
  }

  return (
    <TimetableShell
      title="Định mức & Phân công giảng dạy"
      subtitle="Đối chiếu trực tiếp bảng SubjectQuota và TeachingAssignment hiện hữu theo năm học - học kỳ (không tạo nguồn phân công thứ hai)"
      activeTabCode="QUOTA"
      headerActions={
        <>
          <Link
            href="/admin/subjects"
            className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 text-xs font-semibold hover:bg-[#F8FAFC]"
          >
            Danh mục môn & khung CT
          </Link>
          <Link
            href="/admin/teaching-assignments"
            className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 text-xs font-semibold hover:bg-[#F8FAFC]"
          >
            Phân công toàn trường
          </Link>
        </>
      }
    >
      <TimetableFilterBar
        context={data.filterContext}
        onChange={reloadWithPatch}
        loading={loading}
      />

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-[#E11D48] rounded-2xl px-4 py-3 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Status Filter Strip */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 tabular-nums">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { code: "ALL", label: `Tất cả (${counts.total})` },
            { code: "MISSING_TEACHER", label: `Thiếu phân công GV (${counts.missingTeacher})` },
            { code: "UNDER_SCHEDULED", label: `Thiếu tiết (${counts.underScheduled})` },
            { code: "OK", label: `Đạt chuẩn (${counts.ok})` },
          ].map((f) => (
            <button
              key={f.code}
              type="button"
              onClick={() => setStatusFilter(f.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === f.code
                  ? "bg-[#003B3A] text-white"
                  : "bg-[#F8FAFC] text-slate-600 hover:text-[#003B3A]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Tìm theo lớp, môn học hoặc mã GV..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs w-64 focus:border-[#00A19A] focus:outline-none"
        />
      </div>

      {/* Main Reconciliation Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003B3A] border-b border-[#003B3A]">
              <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                Lớp học
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                Hệ chương trình
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                Môn học
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap text-right">
                Định mức / tuần
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap text-right">
                Chu kỳ ({data.cycleWeeks} tuần)
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap text-right">
                Đã xếp / Thiếu
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                Giáo viên giảng dạy (Mã GV)
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                Đồng giảng / CTQT
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap text-right">
                Trạng thái đối chiếu
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 px-4 text-center text-slate-500">
                  Không có dòng định mức - phân công nào khớp bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              filteredItems.map((row) => {
                const st = STATUS_BADGES[row.status] || STATUS_BADGES.OK
                const isSavingRow =
                  savingKey === `T_${row.classId}_${row.subjectId}` ||
                  savingKey === `Q_${row.subjectId}_${row.studyProgram}_${row.grade}`

                return (
                  <tr
                    key={`${row.classId}_${row.subjectId}`}
                    className={`transition-colors align-middle hover:bg-[#F8FAFC] ${
                      isSavingRow ? "opacity-60" : ""
                    }`}
                  >
                    <td className="py-3 px-3 align-middle font-semibold text-slate-900 whitespace-nowrap">
                      {row.className}
                      <span className="ml-1.5 text-[11px] text-slate-500 font-normal">
                        ({row.grade})
                      </span>
                    </td>
                    <td className="py-3 px-3 align-middle text-slate-600 whitespace-nowrap">
                      {row.studyProgram}
                    </td>
                    <td className="py-3 px-3 align-middle font-medium text-slate-800">
                      {row.subjectName}
                    </td>
                    <td className="py-3 px-3 align-middle text-right">
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        max={20}
                        defaultValue={row.weeklyQuota}
                        onBlur={(e) =>
                          handleQuotaBlur(
                            row.subjectId,
                            row.studyProgram,
                            row.grade,
                            row.weeklyQuota,
                            e.target.value
                          )
                        }
                        title={`Sửa định mức môn ${row.subjectName} cho toàn khối ${row.grade} (${row.studyProgram})`}
                        className="w-16 text-right rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs font-semibold text-slate-800 focus:border-[#00A19A] focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-3 align-middle text-right text-slate-600">
                      {row.cycleQuota} tiết
                    </td>
                    <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                      <span className="font-semibold text-slate-800">
                        {row.scheduledWeeklyEquivalent}
                      </span>
                      {row.missingWeeklyPeriods > 0 && (
                        <span className="ml-1.5 text-[#D97706] font-semibold">
                          (-{row.missingWeeklyPeriods})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 align-middle min-w-[230px]">
                      <select
                        value={row.primaryTeacherId || ""}
                        onChange={(e) =>
                          handleTeacherChange(row.classId, row.subjectId, e.target.value)
                        }
                        className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${
                          !row.primaryTeacherId
                            ? "border-rose-300 bg-rose-50/40 text-[#E11D48] font-semibold"
                            : "border-[#E2E8F0] bg-white text-slate-800"
                        }`}
                      >
                        <option value="">-- Chưa phân công giáo viên --</option>
                        {data.teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.teacherName} ({t.teacherCode})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3 align-middle text-slate-600 whitespace-nowrap">
                      {row.coTeacherName
                        ? `${row.coTeacherName} (${row.coTeacherCode || ""})`
                        : "—"}
                    </td>
                    <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${st.className}`}
                      >
                        {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </TimetableShell>
  )
}
