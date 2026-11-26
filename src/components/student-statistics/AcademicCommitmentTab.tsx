"use client"

import React, { useMemo, useState } from "react"
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Info,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AcademicCommitmentReportPayload,
  EducationLevelCode,
  StandardClassificationCode,
} from "@/lib/student-statistics/types"
import {
  formatDeltaForDisplay,
  formatRateWithFraction,
  formatScoreForDisplay,
} from "@/lib/student-statistics/formatters"
import { AcademicHierarchyBreakdownTable } from "./HierarchyBreakdownTable"

interface AcademicCommitmentTabProps {
  data: AcademicCommitmentReportPayload
  onSelectCampus: (campusId: string) => void
  onSelectClass?: (campusId: string, classId: string) => void
}

const PAGE_SIZE = 25

function getStandardBadgeClasses(code: StandardClassificationCode): string {
  switch (code) {
    case "TIEN_BO_VUOT_BAC":
      return "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
    case "DAT_CHUAN":
      return "bg-teal-50 text-[#00736E] border-teal-200"
    case "CHUA_DAT_CHUAN":
      return "bg-rose-50 text-rose-700 border-rose-200"
    default:
      return "bg-slate-100 text-slate-600 border-slate-200"
  }
}

function getDeltaClasses(delta: number | null): string {
  if (delta === null) return "text-slate-400"
  if (delta > 1e-9) return "text-emerald-700 font-semibold"
  if (delta < -1e-9) return "text-rose-600 font-semibold"
  return "text-slate-700 font-medium"
}

export function AcademicCommitmentTab({
  data,
  onSelectCampus,
  onSelectClass,
}: AcademicCommitmentTabProps) {
  const [page, setPage] = useState(1)
  const [showReconciliation, setShowReconciliation] = useState(false)

  const totalPages = Math.max(1, Math.ceil(data.detailRows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return data.detailRows.slice(start, start + PAGE_SIZE)
  }, [data.detailRows, safePage])

  const chartData = useMemo(
    () =>
      (data.hierarchy.children || []).map((cp) => ({
        name: cp.code || cp.label,
        fullName: cp.label,
        campusId: cp.campusId || cp.id,
        rate: cp.standardRate ?? 0,
        hasDenominator: cp.eligibleRowCount > 0,
        metCount: cp.totalStandardMetCount,
        eligibleCount: cp.eligibleRowCount,
        studentCount: cp.distinctStudentCount,
      })),
    [data.hierarchy.children]
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderRateLabel = (props: any) => {
    const { x, y, width, index } = props
    const row = chartData[index]
    if (!row) return null
    const cx = Number(x ?? 0) + Number(width ?? 0) / 2
    const topY = Number(y ?? 0)
    if (!row.hasDenominator) {
      return (
        <text x={cx} y={topY - 6} textAnchor="middle" fill="#94A3B8" fontSize={10} fontWeight={600}>
          —
        </text>
      )
    }
    return (
      <g>
        <text x={cx} y={topY - 16} textAnchor="middle" fill="#003B3A" fontSize={10.5} fontWeight={700}>
          {row.rate.toFixed(1).replace(".", ",")}%
        </text>
        <text x={cx} y={topY - 4} textAnchor="middle" fill="#475569" fontSize={9.5} fontWeight={500}>
          {row.metCount}/{row.eligibleCount}
        </text>
      </g>
    )
  }

  return (
    <div className="space-y-5">
      {/* 1. Unified Ledger Strip — Chỉ số tổng hợp */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0] tabular-nums">
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Số HS cam kết</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#003B3A]">
                {data.summary.distinctStudentCount}
              </span>
              {data.summary.enrolledShareRate !== null && (
                <span className="text-xs font-semibold text-[#00736E]">
                  ({data.summary.enrolledShareRate.toFixed(1).replace(".", ",")}%)
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              so với {data.summary.enrolledStudentCount} HS nhập học
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Số lượt cam kết theo môn</div>
            <div className="mt-1 text-2xl font-bold text-[#003B3A]">
              {data.summary.commitmentRowCount}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              đủ điểm xét chuẩn: {data.summary.eligibleStandardRowCount} lượt
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Đạt chuẩn (7–8 / 5–7)</div>
            <div className="mt-1 text-2xl font-bold text-[#00736E]">
              {data.summary.standardBandCount}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">lượt theo kỳ gần nhất</div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Tiến bộ vượt bậc (9–10 / 8–10)</div>
            <div className="mt-1 text-2xl font-bold text-emerald-700">
              {data.summary.outstandingCount}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              {formatRateWithFraction(
                data.summary.outstandingCount,
                data.summary.eligibleStandardRowCount,
                data.summary.outstandingRate
              )}
            </div>
          </div>
          <div className="p-4 bg-[#F0FDFA]/50">
            <div className="text-xs font-medium text-[#003B3A]">Tỷ lệ đạt chuẩn (Kỳ gần nhất)</div>
            <div className="mt-1 text-xl font-bold text-emerald-700">
              {formatRateWithFraction(
                data.summary.totalStandardMetCount,
                data.summary.eligibleStandardRowCount,
                data.summary.standardRate
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              gồm Đạt chuẩn + Tiến bộ vượt bậc
            </div>
          </div>
        </div>
        <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
            <span>
              <strong>Chuẩn quy định (căn cứ kỳ định kỳ gần nhất KSĐN → GK1 → CK1 → GK2 → CK2):</strong>{" "}
              Tiểu học: 7–8 Đạt chuẩn, 9–10 Tiến bộ vượt bậc · THCS: 5–7 Đạt chuẩn, 8–10 Tiến bộ vượt bậc.
            </span>
          </div>
          {!data.isSummaryOnly && data.reconciliationItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowReconciliation((v) => !v)}
              className="inline-flex items-center gap-1.5 text-amber-700 hover:text-amber-800 font-medium"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Danh sách đối soát ({data.reconciliationItems.length})</span>
              {showReconciliation ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Danh sách đối soát (nếu mở) */}
      {showReconciliation && data.reconciliationItems.length > 0 && (
        <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-4 space-y-2">
          <div className="text-xs font-semibold text-amber-900">
            Ghi nhận đối soát dữ liệu ({data.reconciliationItems.length} mục)
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-amber-200/70 text-xs">
            {data.reconciliationItems.map((item) => (
              <div key={item.id} className="py-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-semibold text-amber-900">
                  {item.studentName ? `${item.studentName} (${item.studentCode || "—"})` : item.subject || "Hệ thống"}
                </span>
                {item.className && (
                  <span className="text-amber-700">• {item.className}</span>
                )}
                <span className="text-slate-700">{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Phân rã Toàn hệ thống -> Cơ sở -> Khối -> Lớp */}
      <AcademicHierarchyBreakdownTable
        title="Thống kê theo Toàn hệ thống → Cơ sở → Khối → Lớp"
        root={data.hierarchy}
        onSelectCampus={onSelectCampus}
        onSelectClass={onSelectClass}
      />

      {/* 3. Biểu đồ cột so sánh các cơ sở (chỉ hiển thị khi có từ 2 cơ sở trở lên) + Bảng tổng hợp theo cơ sở */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {chartData.length > 1 && (
          <div className="xl:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-col">
            <div className="text-sm font-semibold text-[#003B3A]">
              So sánh tỷ lệ đạt chuẩn (Kỳ gần nhất) giữa các cơ sở
            </div>
            <div className="text-xs text-slate-500 mt-0.5 mb-3">
              Hiển thị % và số lượt đạt chuẩn / tổng lượt xét chuẩn (gồm Đạt chuẩn + Tiến bộ vượt bậc)
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 34, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    width={42}
                  />
                  <Tooltip
                    formatter={(_val: unknown, _name: unknown, item: { payload?: { hasDenominator: boolean; metCount: number; eligibleCount: number; rate: number } }) => {
                      const p = item?.payload
                      if (!p || !p.hasDenominator) return ["—", "Tỷ lệ đạt chuẩn"]
                      return [
                        `${p.metCount}/${p.eligibleCount} (${p.rate.toFixed(1).replace(".", ",")}%)`,
                        "Tỷ lệ đạt chuẩn",
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
                    <LabelList dataKey="rate" content={renderRateLabel} />
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
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#003B3A]">
                Tổng hợp theo cơ sở
              </div>
              <div className="text-xs text-slate-500">
                Chọn cơ sở để mở chi tiết theo lớp và học sinh
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-2.5 px-3 text-left text-white">Cơ sở</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Số HS cam kết</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Số lượt cam kết</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Đủ điểm đối chiếu</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Đạt chuẩn GK1</th>
                  <th className="py-2.5 px-3 text-right text-[#5EEAD4]">Đạt tiến bộ</th>
                  <th className="py-2.5 px-3 text-right text-[#5EEAD4]">Tỷ lệ đạt tiến bộ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {data.campusSummary.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-3 text-center text-slate-500">
                      Chưa có dữ liệu phù hợp
                    </td>
                  </tr>
                ) : (
                  data.campusSummary.map((row) => (
                    <tr
                      key={row.key}
                      onClick={() => onSelectCampus(row.campusId)}
                      className="transition-colors align-middle hover:bg-[#F0FDFA]/70 cursor-pointer"
                    >
                      <td className="py-3 px-3 font-medium text-[#003B3A]">
                        {row.campusName}{" "}
                        <span className="text-slate-400 font-normal">({row.campusCode})</span>
                      </td>
                      <td className="py-3 px-3 text-right">{row.distinctStudentCount}</td>
                      <td className="py-3 px-3 text-right">{row.commitmentRowCount}</td>
                      <td className="py-3 px-3 text-right">{row.comparableRowCount}</td>
                      <td className="py-3 px-3 text-right">{row.gk1PassCount}</td>
                      <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                        {row.progressCount}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-[#00736E]">
                        {formatRateWithFraction(
                          row.progressCount,
                          row.comparableRowCount,
                          row.progressRate
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

      {/* 3. Bảng tổng hợp theo cơ sở, bậc học và môn học */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0]">
          <div className="text-sm font-semibold text-[#003B3A]">
            Bảng tổng hợp theo cơ sở, bậc học và môn cam kết
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-2.5 px-3 text-left text-white">Cơ sở</th>
                <th className="py-2.5 px-3 text-left text-teal-100">Bậc học</th>
                <th className="py-2.5 px-3 text-left text-teal-100">Môn cam kết</th>
                <th className="py-2.5 px-3 text-right text-teal-100">Số HS cam kết</th>
                <th className="py-2.5 px-3 text-right text-teal-100">Số lượt cam kết theo môn</th>
                <th className="py-2.5 px-3 text-right text-teal-100">Số lượt đủ điểm đối chiếu</th>
                <th className="py-2.5 px-3 text-right text-teal-100">Số lượt đạt chuẩn GK1</th>
                <th className="py-2.5 px-3 text-right text-[#5EEAD4]">Số lượt đạt tiến bộ</th>
                <th className="py-2.5 px-3 text-right text-[#5EEAD4]">Tỷ lệ đạt tiến bộ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {data.campusLevelSubjectSummary.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 px-3 text-center text-slate-500">
                    Chưa có dữ liệu phù hợp
                  </td>
                </tr>
              ) : (
                data.campusLevelSubjectSummary.map((row) => (
                  <tr key={row.key} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {row.campusName}{" "}
                      <span className="text-slate-400 font-normal">({row.campusCode})</span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{row.levelLabel}</td>
                    <td className="py-3 px-3 font-medium text-[#003B3A]">{row.subject}</td>
                    <td className="py-3 px-3 text-right">{row.distinctStudentCount}</td>
                    <td className="py-3 px-3 text-right">{row.commitmentRowCount}</td>
                    <td className="py-3 px-3 text-right">{row.comparableRowCount}</td>
                    <td className="py-3 px-3 text-right">{row.gk1PassCount}</td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                      {row.progressCount}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#00736E]">
                      {formatRateWithFraction(
                        row.progressCount,
                        row.comparableRowCount,
                        row.progressRate
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Bảng chi tiết học sinh cam kết đầu vào theo môn học */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-[#003B3A]">
              Bảng chi tiết học sinh cam kết đầu vào theo môn học
            </div>
            <div className="text-xs text-slate-500 tabular-nums">
              {data.isSummaryOnly
                ? "Tài khoản chỉ có quyền xem số liệu tổng hợp."
                : `Hiển thị ${data.detailRows.length} lượt cam kết (Xuất PDF sẽ bao gồm toàn bộ bản ghi phù hợp bộ lọc).`}
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
            <table className="w-full border-collapse min-w-[1060px]">
              <thead className="bg-[#003B3A] border-b border-[#003B3A] sticky top-0 z-20">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-2.5 px-3 text-center text-white w-12">STT</th>
                  <th className="py-2.5 px-3 text-left text-white sticky left-0 z-30 bg-[#003B3A] min-w-[200px]">
                    Học sinh &amp; Mã HS
                  </th>
                  <th className="py-2.5 px-3 text-left text-teal-100">Lớp / Cơ sở</th>
                  <th className="py-2.5 px-3 text-left text-teal-100">Môn cam kết</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">KSĐN</th>
                  <th className="py-2.5 px-3 text-right text-white">Giữa kỳ 1</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Cuối kỳ 1</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Giữa kỳ 2</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Cuối kỳ 2</th>
                  <th className="py-2.5 px-3 text-right text-[#5EEAD4]">
                    Chênh lệch (Kỳ gần nhất − KSĐN)
                  </th>
                  <th className="py-2.5 px-3 text-left text-[#5EEAD4]">Đánh giá chuẩn (Kỳ gần nhất)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 px-3 text-center text-slate-500">
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
                      <td className="py-3 px-3 font-medium text-[#003B3A]">
                        {row.committedSubject}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">
                        {formatScoreForDisplay(row.ksdnScore, row.level as EducationLevelCode)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900">
                        {formatScoreForDisplay(row.gk1Score, row.level as EducationLevelCode)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">
                        {formatScoreForDisplay(row.ck1Score, row.level as EducationLevelCode)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">
                        {formatScoreForDisplay(row.gk2Score, row.level as EducationLevelCode)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">
                        {formatScoreForDisplay(row.ck2Score, row.level as EducationLevelCode)}
                      </td>
                      <td className={`py-3 px-3 text-right ${getDeltaClasses(row.deltaLatestVsKsdn)}`}>
                        {formatDeltaForDisplay(row.deltaLatestVsKsdn)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${getStandardBadgeClasses(
                            row.standardClassification
                          )}`}
                        >
                          {row.standardClassificationLabel}
                        </span>
                        {row.latestPeriod && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Căn cứ: {row.latestPeriodLabel}
                          </div>
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
    </div>
  )
}
