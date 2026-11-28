"use client"

import React, { useMemo, useState } from "react"
import * as XLSX from "xlsx"
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Users,
} from "lucide-react"
import type {
  ComplianceStatusItem,
  MonthlyTeacherObservationRow,
  ObservationDetailItem,
  TeacherQualityWorkspaceResponse,
} from "@/lib/teacher-quality/types"
import { DrilldownTabKey, ObservationDrilldownDrawer } from "./ObservationDrilldownDrawer"

interface MonthlyObservationTabProps {
  data: TeacherQualityWorkspaceResponse | null
  loading: boolean
  month: string
  observingStatusFilter: string
  teachingStatusFilter: string
  onChangeMonth: (v: string) => void
  onChangeObservingStatusFilter: (v: string) => void
  onChangeTeachingStatusFilter: (v: string) => void
  onCreateCoaching: (item: ObservationDetailItem) => void
  onOpenCoachingTab: () => void
  onOpenProfileById: (teacherId: string) => void
}

function toneClass(tone: ComplianceStatusItem["tone"]): string {
  switch (tone) {
    case "emerald":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "amber":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "rose":
      return "bg-rose-50 text-rose-700 border-rose-200"
    default:
      return "bg-slate-100 text-slate-600 border-slate-200"
  }
}

export function MonthlyObservationTab({
  data,
  loading,
  month,
  observingStatusFilter,
  teachingStatusFilter,
  onChangeMonth,
  onChangeObservingStatusFilter,
  onChangeTeachingStatusFilter,
  onCreateCoaching,
  onOpenCoachingTab,
  onOpenProfileById,
}: MonthlyObservationTabProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTeacherId, setDrawerTeacherId] = useState<string | null>(null)
  const [drawerTab, setDrawerTab] = useState<DrilldownTabKey>("observed")

  const rows = data?.monthlyRows || []
  const summary = data?.monthlySummary

  const selectedTeacherRow: MonthlyTeacherObservationRow | null = useMemo(() => {
    if (!drawerTeacherId) return null
    return rows.find((r) => r.teacherId === drawerTeacherId) || null
  }, [drawerTeacherId, rows])

  const openDrilldown = (row: MonthlyTeacherObservationRow, tab: DrilldownTabKey) => {
    setDrawerTeacherId(row.teacherId)
    setDrawerTab(tab)
    setDrawerOpen(true)
  }

  const handleExportExcel = () => {
    if (!data || rows.length === 0) return
    const exportRows = rows.map((r, idx) => ({
      STT: idx + 1,
      "Mã GV": r.teacherCode,
      "Họ tên GV": r.teacherName,
      "Thâm niên Sky-Line": r.seniorityLabel,
      "Cơ sở": r.campusName,
      "Tổ chuyên môn": r.departmentName,
      [`Số tiết dạy (${data.periodSourceSummary.columnHeaderNote})`]: r.monthlyTeachingPeriods,
      "Nguồn số tiết": r.teachingPeriodSourceLabel,
      "Số tiết GV dạy được dự": r.taughtObservedOfficial,
      "Số tiết GV đi dự": r.observedQuotaDisplay,
      "Phiếu chờ duyệt": r.pendingFormsCount,
      "Tình trạng đi dự giờ": r.observingCompliance.label,
      "Dạy học theo quy định": r.teachingCompliance.label,
    }))
    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Du_Gio_Thang")
    XLSX.writeFile(wb, `Du_gio_theo_thang_${data.month}.xlsx`)
  }

  return (
    <div className="space-y-4">
      {/* Month selector & Dual Compliance Filters */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Tháng thống kê (theo ngày dự thực tế)
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  if (e.target.value) onChangeMonth(e.target.value)
                }}
                className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-slate-800 tabular-nums focus:border-[#00A19A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Lọc Tình trạng đi dự giờ
              </label>
              <select
                value={observingStatusFilter}
                onChange={(e) => onChangeObservingStatusFilter(e.target.value)}
                className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#00A19A] focus:outline-none"
              >
                <option value="ALL">Tất cả tình trạng đi dự giờ</option>
                <option value="UNOBSERVED">Chưa dự giờ</option>
                <option value="SHORTFALL">Còn thiếu tiết</option>
                <option value="COMPLIANT">Đủ định mức</option>
                <option value="NO_QUOTA">Chưa có định mức</option>
                <option value="HAS_PENDING">Có phiếu chờ duyệt</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Lọc Dạy học theo quy định
              </label>
              <select
                value={teachingStatusFilter}
                onChange={(e) => onChangeTeachingStatusFilter(e.target.value)}
                className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#00A19A] focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái dạy học</option>
                <option value="TEACHING_COMPLIANT">Đạt quy định</option>
                <option value="NEEDS_IMPROVEMENT">Cần bồi dưỡng</option>
                <option value="TAUGHT_UNOBSERVED">Chưa có tiết dạy được dự</option>
                <option value="NO_EVAL_YET">Chưa có phiếu đánh giá</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#003B3A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#005250] disabled:opacity-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-[#5EEAD4]" />
            Xuất Excel tháng
          </button>
        </div>

        <div className="text-[11px] text-slate-500 border-t border-[#F1F5F9] pt-2">
          Căn cứ đối chiếu: <strong>Quyết định 06/2026/QĐ-SKL</strong> về Quy định dự giờ chuyên môn (đồng bộ định mức đã cấu hình tại phân hệ Dự giờ; nhóm chưa cấu hình hiển thị <strong>Chưa có định mức</strong>).
        </div>
      </div>

      {/* Ledger Summary Strip */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0] rounded-2xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden tabular-nums">
          <div className="p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Users className="h-3.5 w-3.5 text-[#008B85]" />
              <span>Tổng GV trong tháng</span>
            </div>
            <div className="mt-1 text-lg font-bold text-[#003B3A]">{summary.totalTeachers}</div>
          </div>
          <div className="p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Đủ định mức đi dự</span>
            </div>
            <div className="mt-1 text-lg font-bold text-emerald-700">
              {summary.observedCompliantCount}
            </div>
          </div>
          <div className="p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
              <span>Chưa dự / Còn thiếu</span>
            </div>
            <div className="mt-1 text-lg font-bold text-rose-700">
              {summary.unobservedCount}
              <span className="text-xs font-semibold text-amber-700 ml-1.5">
                +{summary.shortfallCount} thiếu
              </span>
            </div>
          </div>
          <div className="p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>Phiếu chờ duyệt</span>
            </div>
            <div className="mt-1 text-lg font-bold text-amber-700">{summary.totalPendingForms}</div>
          </div>
          <div className="p-3.5">
            <div className="text-[11px] text-slate-500">Tiết ghi nhận chính thức</div>
            <div className="mt-1 text-lg font-bold text-[#003B3A]">
              {summary.totalTaughtObservedPeriods}
              <span className="text-xs font-normal text-slate-500 ml-1">dạy · </span>
              {summary.totalObservedPeriods}
              <span className="text-xs font-normal text-slate-500 ml-1">đi dự</span>
            </div>
          </div>
        </div>
      )}

      {/* Academic Ledger Table (7 exact columns) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                  Họ tên GV · Thâm niên Sky-Line
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-right">
                  <div>Số tiết dạy</div>
                  {data?.periodSourceSummary.columnHeaderNote && (
                    <div className="text-[10px] font-normal text-teal-200/90">
                      ({data.periodSourceSummary.columnHeaderNote})
                    </div>
                  )}
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                  Số tiết GV dạy được dự
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                  Số tiết GV đi dự
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                  Phiếu chờ duyệt
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4]">
                  Tình trạng đi dự giờ
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4]">
                  Dạy học theo quy định
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin text-[#00A19A] mx-auto mb-2" />
                    Đang tổng hợp dữ liệu dự giờ từ phân hệ Dự giờ...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Không có giáo viên nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.teacherId}
                    className={`transition-colors align-middle hover:bg-[#F8FAFC] ${
                      drawerTeacherId === row.teacherId && drawerOpen
                        ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                        : ""
                    }`}
                  >
                    {/* 1. Họ tên GV · Thâm niên Sky-Line */}
                    <td className="py-3 px-3 align-middle min-w-[225px]">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenProfileById(row.teacherId)}
                          className="font-semibold text-[#003B3A] hover:text-[#008B85] hover:underline text-left"
                        >
                          {row.teacherName}
                        </button>
                        <span className="rounded bg-[#F0FDFA] border border-[#CCFBF1] px-1.5 py-0.5 text-[10px] font-medium text-[#00736E]">
                          {row.seniorityLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {row.teacherCode} · {row.campusName} · {row.departmentName}
                      </div>
                    </td>

                    {/* 2. Số tiết dạy */}
                    <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        {row.monthlyTeachingPeriods > 0 ? `${row.monthlyTeachingPeriods} tiết` : "—"}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {row.teachingPeriodSource === "TIMETABLE"
                          ? "Số tiết theo TKB"
                          : row.teachingPeriodSource === "TEACHING_LOG"
                            ? "Dữ liệu giảng dạy"
                            : "Chưa có TKB"}
                      </div>
                    </td>

                    {/* 3. Số tiết GV dạy được dự */}
                    <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openDrilldown(row, "taught")}
                        className="inline-flex flex-col items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 hover:border-[#00A19A] hover:bg-[#F0FDFA] transition-colors"
                      >
                        <span className="font-semibold text-[#003B3A]">
                          {row.taughtObservedOfficial} tiết
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {row.taughtDetails.length > 0
                            ? `${row.taughtDetails.length} phiếu`
                            : "Chi tiết"}
                        </span>
                      </button>
                    </td>

                    {/* 4. Số tiết GV đi dự */}
                    <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openDrilldown(row, "observed")}
                        className="inline-flex flex-col items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 hover:border-[#00A19A] hover:bg-[#F0FDFA] transition-colors"
                      >
                        <span className="font-semibold text-[#003B3A]">
                          {row.observedQuotaDisplay}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {row.observedDetails.length > 0
                            ? `${row.observedDetails.length} lượt`
                            : "Chi tiết"}
                        </span>
                      </button>
                    </td>

                    {/* 5. Phiếu chờ duyệt */}
                    <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openDrilldown(row, "pending")}
                        className={`inline-flex items-center justify-center rounded-xl border px-3 py-1.5 font-semibold transition-colors ${
                          row.pendingFormsCount > 0
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border-[#E2E8F0] bg-white text-slate-400 hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {row.pendingFormsCount > 0 ? `${row.pendingFormsCount} phiếu` : "0"}
                      </button>
                    </td>

                    {/* 6. Tình trạng đi dự giờ */}
                    <td className="py-3 px-3 align-middle whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${toneClass(
                          row.observingCompliance.tone
                        )}`}
                        title={row.observingCompliance.detail}
                      >
                        {row.observingCompliance.label}
                      </span>
                    </td>

                    {/* 7. Dạy học theo quy định */}
                    <td className="py-3 px-3 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${toneClass(
                            row.teachingCompliance.tone
                          )}`}
                          title={row.teachingCompliance.detail}
                        >
                          {row.teachingCompliance.label}
                        </span>
                        {row.coachingPlansCount > 0 && (
                          <span className="rounded bg-[#F0FDFA] border border-[#99F6E4] px-1.5 py-0.5 text-[10px] font-medium text-[#00736E]">
                            {row.coachingPlansCount} BD
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[#008B85]" />
            <span>
              Bấm số tiết để mở danh sách tiết & phiếu dự giờ gốc. Từ phiếu đã duyệt, TTCM có thể chọn <strong>Tạo nội dung bồi dưỡng</strong>.
            </span>
          </div>
          <span className="tabular-nums font-medium text-slate-600">{rows.length} giáo viên</span>
        </div>
      </div>

      {/* Drilldown Drawer */}
      <ObservationDrilldownDrawer
        open={drawerOpen}
        teacherRow={selectedTeacherRow}
        initialTab={drawerTab}
        monthLabel={data?.monthLabel || month}
        canCreateCoaching={Boolean(data?.scope.canAssignCoaching)}
        onClose={() => setDrawerOpen(false)}
        onCreateCoaching={(item) => onCreateCoaching(item)}
        onOpenCoachingTab={() => {
          setDrawerOpen(false)
          onOpenCoachingTab()
        }}
      />
    </div>
  )
}
