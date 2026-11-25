"use client"

import React, { useMemo, useState } from "react"
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  X,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  PsychCommitmentDetailRow,
  PsychologyCommitmentReportPayload,
  PsychTeacherEvalStatusCode,
  PsychWeekCell,
  PsychWeekStatusCode,
} from "@/lib/student-statistics/types"
import { formatRateWithFraction } from "@/lib/student-statistics/formatters"

interface PsychologyCommitmentTabProps {
  data: PsychologyCommitmentReportPayload
  onSelectCampus: (campusId: string) => void
  onSelectMonth: (monthValue: string) => void
}

const PAGE_SIZE = 25

function getWeekBadgeClasses(status: PsychWeekStatusCode): string {
  switch (status) {
    case "DA_DANH_GIA":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "DEN_HAN":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "QUA_HAN":
      return "bg-rose-50 text-rose-700 border-rose-200"
    case "CHUA_DEN_HAN":
      return "bg-slate-50 text-slate-600 border-slate-200"
    default:
      return "bg-slate-100 text-slate-500 border-slate-200"
  }
}

function getTeacherStatusBadgeClasses(status: PsychTeacherEvalStatusCode): string {
  switch (status) {
    case "DA_CAP_NHAT_DU":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "CON_LUOT_DEN_HAN":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "CO_DANH_GIA_QUA_HAN":
    case "CHUA_PHAN_CONG":
      return "bg-rose-50 text-rose-700 border-rose-200"
    default:
      return "bg-slate-100 text-slate-600 border-slate-200"
  }
}

export function PsychologyCommitmentTab({
  data,
  onSelectCampus,
  onSelectMonth,
}: PsychologyCommitmentTabProps) {
  const [page, setPage] = useState(1)
  const [showReconciliation, setShowReconciliation] = useState(false)
  const [selectedWeekModal, setSelectedWeekModal] = useState<{
    row: PsychCommitmentDetailRow
    cell: PsychWeekCell
  } | null>(null)

  const totalPages = Math.max(1, Math.ceil(data.detailRows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return data.detailRows.slice(start, start + PAGE_SIZE)
  }, [data.detailRows, safePage])

  const monthColTitle =
    data.viewMode === "YEAR_SUMMARY"
      ? `Tổng kết ${data.filters.monthLabel}`
      : `Tổng kết ${data.filters.month}`

  const chartData = useMemo(
    () =>
      data.campusSummary.map((c) => ({
        name: c.campusCode || c.campusName,
        fullName: c.campusName,
        campusId: c.campusId,
        rate: c.monthSummaryRate ?? 0,
        hasDenominator: c.totalStudents > 0,
        summarized: c.monthSummarizedStudents,
        total: c.totalStudents,
      })),
    [data.campusSummary]
  )

  return (
    <div className="space-y-5">
      {/* 1. Unified Ledger Strip — Chỉ số tổng hợp */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0] tabular-nums">
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">HS thuộc diện</div>
            <div className="mt-1 text-2xl font-bold text-[#003B3A]">
              {data.summary.totalStudents}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">học sinh (mã duy nhất)</div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Chưa phân công</div>
            <div className="mt-1 text-2xl font-bold text-rose-600">
              {data.summary.unassignedStudents}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">học sinh</div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Có đánh giá quá hạn</div>
            <div className="mt-1 text-2xl font-bold text-amber-600">
              {data.summary.overdueStudents}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">học sinh</div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Đã tổng kết tháng</div>
            <div className="mt-1 text-xl font-bold text-emerald-700">
              {formatRateWithFraction(
                data.summary.monthSummarizedStudents,
                data.summary.totalStudents,
                data.summary.monthSummaryRate
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">học sinh</div>
          </div>
          <div className="p-4 bg-[#F0FDFA]/50">
            <div className="text-xs font-medium text-[#003B3A]">Tiến độ lượt đánh giá</div>
            <div className="mt-1 text-xl font-bold text-[#00736E]">
              {data.summary.completedSessions}/{data.summary.totalScheduledSessions}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">lượt đánh giá tuần</div>
          </div>
        </div>
        {!data.isSummaryOnly && data.reconciliationItems.length > 0 && (
          <div className="px-4 py-2 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end text-xs">
            <button
              type="button"
              onClick={() => setShowReconciliation((v) => !v)}
              className="inline-flex items-center gap-1.5 text-amber-700 hover:text-amber-800 font-medium"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Danh sách đối soát &amp; thiếu phân công ({data.reconciliationItems.length})</span>
              {showReconciliation ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {showReconciliation && data.reconciliationItems.length > 0 && (
        <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-4 space-y-2">
          <div className="text-xs font-semibold text-amber-900">
            Ghi nhận đối soát ({data.reconciliationItems.length} mục)
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-amber-200/70 text-xs">
            {data.reconciliationItems.map((item) => (
              <div key={item.id} className="py-1.5 flex flex-wrap gap-x-2">
                <span className="font-semibold text-amber-900">
                  {item.studentName} ({item.studentCode || "—"})
                </span>
                {item.className && <span className="text-amber-700">• {item.className}</span>}
                <span className="text-slate-700">{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Chế độ Tổng hợp năm học (10 tháng) — cho phép bấm mở chi tiết từng tháng */}
      {data.viewMode === "YEAR_SUMMARY" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#003B3A]">
                Tổng hợp tiến độ theo từng tháng trong năm học {data.filters.academicYearName}
              </div>
              <div className="text-xs text-slate-500">
                Bấm vào một tháng để mở chi tiết theo dõi Tuần 1–4 của tháng đó
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-2.5 px-3 text-left text-white">Tháng</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">HS thuộc diện</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Chưa phân công</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Có ĐG quá hạn</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Còn lượt đến hạn</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Đã cập nhật đủ</th>
                  <th className="py-2.5 px-3 text-right text-[#5EEAD4]">Đã tổng kết tháng</th>
                  <th className="py-2.5 px-3 text-right text-white">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {data.yearMonthlySummary.map((m) => (
                  <tr
                    key={m.monthValue}
                    onClick={() => onSelectMonth(m.monthValue)}
                    className="transition-colors align-middle hover:bg-[#F0FDFA]/70 cursor-pointer"
                  >
                    <td className="py-3 px-3 font-medium text-[#003B3A] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#00A19A]" />
                      {m.label}
                    </td>
                    <td className="py-3 px-3 text-right">{m.totalStudents}</td>
                    <td className="py-3 px-3 text-right text-rose-600">{m.unassignedStudents}</td>
                    <td className="py-3 px-3 text-right text-amber-700">{m.overdueStudents}</td>
                    <td className="py-3 px-3 text-right">{m.duePendingStudents}</td>
                    <td className="py-3 px-3 text-right text-emerald-700">
                      {m.completedAllDueStudents}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#00736E]">
                      {formatRateWithFraction(
                        m.monthSummarizedStudents,
                        m.totalStudents,
                        m.monthSummaryRate
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-[#00736E] font-medium hover:underline">
                        Mở chi tiết tuần →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. So sánh cơ sở (1 biểu đồ cột) + Bảng tổng hợp theo cơ sở */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {chartData.length > 1 && (
          <div className="xl:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-col">
            <div className="text-sm font-semibold text-[#003B3A]">
              Tỷ lệ đã tổng kết tháng theo cơ sở
            </div>
            <div className="text-xs text-slate-500 mt-0.5 mb-3">
              Đơn vị: % học sinh thuộc diện đã tổng kết trong kỳ đang chọn
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#334155" }} />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    width={42}
                  />
                  <Tooltip
                    formatter={(_val: unknown, _name: unknown, item: { payload?: { hasDenominator: boolean; summarized: number; total: number; rate: number } }) => {
                      const p = item?.payload
                      if (!p || !p.hasDenominator) return ["—", "Đã tổng kết tháng"]
                      return [
                        `${p.summarized}/${p.total} (${p.rate.toFixed(1).replace(".", ",")}%)`,
                        "Đã tổng kết tháng",
                      ]
                    }}
                    labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || ""}
                  />
                  <Bar
                    dataKey="rate"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                    onClick={(entry: { campusId?: string }) => {
                      if (entry?.campusId) onSelectCampus(entry.campusId)
                    }}
                    className="cursor-pointer"
                  >
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={entry.campusId || idx}
                        fill={idx % 2 === 0 ? "#00A19A" : "#003B3A"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div
          className={
            chartData.length > 1
              ? "xl:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden"
              : "xl:col-span-12 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden"
          }
        >
          <div className="px-4 py-3 border-b border-[#E2E8F0]">
            <div className="text-sm font-semibold text-[#003B3A]">
              Tổng hợp Tâm lý cam kết đầu vào theo cơ sở
            </div>
            <div className="text-xs text-slate-500">
              Chọn cơ sở để mở chi tiết lớp và học sinh
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-2.5 px-3 text-left text-white">Cơ sở</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">HS thuộc diện</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Chưa phân công</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Có ĐG quá hạn</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Còn lượt đến hạn</th>
                  <th className="py-2.5 px-3 text-right text-[#5EEAD4]">Đã tổng kết tháng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {data.campusSummary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-3 text-center text-slate-500">
                      Chưa có dữ liệu phù hợp
                    </td>
                  </tr>
                ) : (
                  data.campusSummary.map((row) => (
                    <tr
                      key={row.campusId}
                      onClick={() => onSelectCampus(row.campusId)}
                      className="transition-colors align-middle hover:bg-[#F0FDFA]/70 cursor-pointer"
                    >
                      <td className="py-3 px-3 font-medium text-[#003B3A]">
                        {row.campusName}{" "}
                        <span className="text-slate-400 font-normal">({row.campusCode})</span>
                      </td>
                      <td className="py-3 px-3 text-right">{row.totalStudents}</td>
                      <td className="py-3 px-3 text-right text-rose-600">{row.unassignedStudents}</td>
                      <td className="py-3 px-3 text-right text-amber-700">{row.overdueStudents}</td>
                      <td className="py-3 px-3 text-right">{row.duePendingStudents}</td>
                      <td className="py-3 px-3 text-right font-semibold text-[#00736E]">
                        {formatRateWithFraction(
                          row.monthSummarizedStudents,
                          row.totalStudents,
                          row.monthSummaryRate
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Tổng hợp tiến độ tuần (Tuần 1–4) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0]">
          <div className="text-sm font-semibold text-[#003B3A]">
            Tổng hợp tiến độ theo tuần ({data.filters.monthLabel})
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-2.5 px-3 text-left text-white">Tuần</th>
                <th className="py-2.5 px-3 text-right text-teal-100">HS đến hạn</th>
                <th className="py-2.5 px-3 text-right text-[#5EEAD4]">HS đã đánh giá</th>
                <th className="py-2.5 px-3 text-right text-teal-100">HS quá hạn</th>
                <th className="py-2.5 px-3 text-right text-teal-100">HS chưa đến hạn</th>
                <th className="py-2.5 px-3 text-right text-teal-100">HS không có lịch</th>
                <th className="py-2.5 px-3 text-right text-white">Tiến độ lượt đánh giá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {data.weekSummary.map((w) => (
                <tr key={w.weekNumber} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-3 font-semibold text-[#003B3A]">{w.weekLabel}</td>
                  <td className="py-2.5 px-3 text-right text-amber-700 font-medium">
                    {w.dueStudentCount} học sinh
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                    {w.evaluatedStudentCount} học sinh
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-600 font-semibold">
                    {w.overdueStudentCount} học sinh
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    {w.notDueStudentCount} học sinh
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500">
                    {w.noScheduleStudentCount} học sinh
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                    {w.completedSessions}/{w.totalScheduledSessions} lượt
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Bảng chi tiết học sinh Tâm lý cam kết đầu vào */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-[#003B3A]">
              Bảng chi tiết học sinh Tâm lý cam kết đầu vào
            </div>
            <div className="text-xs text-slate-500 tabular-nums">
              {data.isSummaryOnly
                ? "Tài khoản chỉ có quyền xem số liệu tổng hợp."
                : `Hiển thị ${data.detailRows.length} học sinh thuộc đúng diện Tâm lý cam kết đầu vào. Bấm vào ô Tuần để xem chi tiết các lượt đánh giá.`}
            </div>
          </div>
          {!data.isSummaryOnly && totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs tabular-nums">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 disabled:opacity-40"
                aria-label="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-slate-600">
                Trang <strong>{safePage}</strong> / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 disabled:opacity-40"
                aria-label="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {!data.isSummaryOnly && (
          <div className="overflow-x-auto max-h-[620px]">
            <table className="w-full border-collapse min-w-[1320px]">
              <thead className="bg-[#003B3A] border-b border-[#003B3A] sticky top-0 z-20">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-2.5 px-3 text-center text-white w-12">STT</th>
                  <th className="py-2.5 px-3 text-left text-white sticky left-0 z-30 bg-[#003B3A] min-w-[190px]">
                    Học sinh &amp; Mã HS
                  </th>
                  <th className="py-2.5 px-3 text-left text-teal-100">Lớp / Cơ sở</th>
                  <th className="py-2.5 px-3 text-left text-teal-100">GV / Chuyên viên</th>
                  <th className="py-2.5 px-3 text-left text-teal-100">Diện</th>
                  <th className="py-2.5 px-3 text-center text-teal-100">Tuần 1</th>
                  <th className="py-2.5 px-3 text-center text-teal-100">Tuần 2</th>
                  <th className="py-2.5 px-3 text-center text-teal-100">Tuần 3</th>
                  <th className="py-2.5 px-3 text-center text-teal-100">Tuần 4</th>
                  <th className="py-2.5 px-3 text-left text-white">{monthColTitle}</th>
                  <th className="py-2.5 px-3 text-left text-[#5EEAD4]">Tình trạng GV ĐG</th>
                  <th className="py-2.5 px-3 text-left text-white min-w-[240px]">
                    Nhận xét &amp; Đánh giá gần nhất
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-10 px-3 text-center text-slate-500">
                      Chưa có dữ liệu phù hợp với bộ lọc đang chọn.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row) => (
                    <tr
                      key={row.rowKey}
                      className="transition-colors align-middle hover:bg-[#F8FAFC]"
                    >
                      <td className="py-3 px-3 text-center text-slate-500">{row.stt}</td>
                      <td className="py-3 px-3 sticky left-0 z-10 bg-white border-r border-[#F1F5F9]">
                        <div className="font-semibold text-slate-900">{row.studentName}</div>
                        <div className="text-[11px] text-slate-500">{row.studentCode}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{row.className}</div>
                        <div className="text-[11px] text-slate-500">{row.campusCode}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={
                            row.isUnassigned ? "text-rose-600 font-medium" : "text-slate-800"
                          }
                        >
                          {row.assignedTeacherName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {row.categoryLabel}
                      </td>
                      {row.weeks.map((cell) => (
                        <td key={cell.weekNumber} className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedWeekModal({ row, cell })}
                            className={`inline-flex flex-col items-center px-2 py-1 rounded-lg border text-[11px] font-medium transition-opacity hover:opacity-85 ${getWeekBadgeClasses(
                              cell.status
                            )}`}
                          >
                            <span className="whitespace-nowrap">{cell.statusLabel}</span>
                            {cell.totalScheduledSessions > 1 && (
                              <span className="text-[10px] opacity-80">
                                {cell.completedSessions}/{cell.totalScheduledSessions} lượt
                              </span>
                            )}
                          </button>
                        </td>
                      ))}
                      <td className="py-3 px-3">
                        <span
                          className={
                            row.hasMonthSummary
                              ? "font-medium text-emerald-700"
                              : "text-slate-500"
                          }
                        >
                          {row.monthSummaryResult}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${getTeacherStatusBadgeClasses(
                            row.teacherEvalStatus
                          )}`}
                        >
                          {row.teacherEvalStatusLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-[280px]">
                        {!row.canViewComments ? (
                          <span className="text-slate-400 italic">Ẩn theo phân quyền</span>
                        ) : row.latestEvaluationDate || row.latestCommentShort ? (
                          <div className="space-y-0.5">
                            {row.latestEvaluationDate && (
                              <div className="text-[11px] font-semibold text-[#003B3A]">
                                {row.latestEvaluationDate}
                              </div>
                            )}
                            {row.latestCommentShort && (
                              <div className="text-slate-700 line-clamp-2">
                                {row.latestCommentShort}
                              </div>
                            )}
                            {row.nextSupportDirection && (
                              <div className="text-[11px] text-[#00736E] line-clamp-2">
                                Hướng hỗ trợ: {row.nextSupportDirection}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Chưa có đánh giá</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal xem chi tiết các lượt đánh giá trong tuần */}
      {selectedWeekModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          onClick={() => setSelectedWeekModal(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-[#003B3A] text-white flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">
                  {selectedWeekModal.row.studentName} ({selectedWeekModal.row.studentCode})
                </div>
                <div className="text-xs text-teal-100">
                  {selectedWeekModal.cell.weekLabel} • {data.filters.monthLabel} • Trạng thái:{" "}
                  {selectedWeekModal.cell.statusLabel} (
                  {selectedWeekModal.cell.completedSessions}/
                  {selectedWeekModal.cell.totalScheduledSessions} lượt)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWeekModal(null)}
                className="p-1 rounded-lg hover:bg-white/10"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto text-xs">
              {!data.canViewPsychologyComments ? (
                <div className="text-slate-500">
                  Tài khoản không có quyền xem chi tiết nội dung nhận xét tâm lý.
                </div>
              ) : selectedWeekModal.cell.evaluations.length === 0 ? (
                <div className="text-slate-500">
                  Chưa có phiếu đánh giá nào được ghi nhận trong {selectedWeekModal.cell.weekLabel}.
                  {selectedWeekModal.cell.dueDate && (
                    <div className="mt-1">
                      Hạn cập nhật: <strong>{selectedWeekModal.cell.dueDate}</strong>
                    </div>
                  )}
                </div>
              ) : (
                selectedWeekModal.cell.evaluations.map((ev, idx) => (
                  <div
                    key={ev.id || idx}
                    className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#003B3A]">{ev.periodName}</span>
                      <span className="text-slate-500 tabular-nums">{ev.createdAt}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Người đánh giá: <strong>{ev.evaluatorName}</strong> • Mức độ:{" "}
                      <strong>{ev.trackingLevel}</strong>
                    </div>
                    {ev.comment && <div className="text-slate-800 pt-1">{ev.comment}</div>}
                    {ev.nextSupportDirection && (
                      <div className="text-[#00736E] pt-0.5">
                        Hướng hỗ trợ tiếp theo: {ev.nextSupportDirection}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
