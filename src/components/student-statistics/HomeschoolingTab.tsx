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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  EducationLevelCode,
  Gk1OutcomeCode,
  HomeschoolingReportPayload,
} from "@/lib/student-statistics/types"
import {
  formatDeltaForDisplay,
  formatRateWithFraction,
  formatScoreForDisplay,
} from "@/lib/student-statistics/formatters"

interface HomeschoolingTabProps {
  data: HomeschoolingReportPayload
  onSelectCampus: (campusId: string) => void
}

const PAGE_SIZE = 25

function getOutcomeBadgeClasses(code: Gk1OutcomeCode): string {
  switch (code) {
    case "DAT_TIEN_BO":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "DAT_CHUAN_GIU_NGUYEN":
    case "DAT_CHUAN_GIAM":
      return "bg-teal-50 text-[#00736E] border-teal-200"
    case "TANG_CHUA_DAT_CHUAN":
    case "CHUA_DAT_CHUAN_GIU_NGUYEN":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "CHUA_DAT_CHUAN_GIAM":
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

export function HomeschoolingTab({ data, onSelectCampus }: HomeschoolingTabProps) {
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
      data.campusSummary.map((c) => ({
        name: c.campusCode || c.campusName,
        fullName: c.campusName,
        campusId: c.campusId,
        rate: c.progressRate ?? 0,
        hasDenominator: c.comparableRowCount > 0,
        progressCount: c.progressCount,
        comparableRowCount: c.comparableRowCount,
      })),
    [data.campusSummary]
  )

  return (
    <div className="space-y-5">
      {/* 1. Unified Ledger Strip */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0] tabular-nums">
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">HS Homeschooling</div>
            <div className="mt-1 text-2xl font-bold text-[#003B3A]">
              {data.summary.distinctStudentCount}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">học sinh nhập học</div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">HS có cam kết đầu vào</div>
            <div className="mt-1 text-2xl font-bold text-amber-700">
              {data.summary.committedStudentCount}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">học sinh</div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Số lượt theo dõi môn</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">
              {data.summary.trackedRowCount}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">lượt (cặp HS–môn)</div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Đạt chuẩn GK1</div>
            <div className="mt-1 text-2xl font-bold text-[#00736E]">
              {data.summary.gk1PassCount}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">lượt</div>
          </div>
          <div className="p-4 bg-[#F0FDFA]/50">
            <div className="text-xs font-medium text-[#003B3A]">Tỷ lệ đạt tiến bộ GK1</div>
            <div className="mt-1 text-xl font-bold text-emerald-700">
              {formatRateWithFraction(
                data.summary.progressCount,
                data.summary.comparableRowCount,
                data.summary.progressRate
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              lượt đạt chuẩn &amp; GK1 &gt; KSĐN
            </div>
          </div>
        </div>
        <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
            <span>
              Lọc từ hồ sơ Khảo sát đầu vào có Chương trình học tập trước đây là{" "}
              <strong>Homeschooling</strong>. Ngưỡng đạt chuẩn GK1: Tiểu học ≥ 7,0; THCS ≥ 5,0.
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
                <span className="text-slate-700">{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Biểu đồ & Bảng tổng hợp theo cơ sở */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {chartData.length > 1 && (
          <div className="xl:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-col">
            <div className="text-sm font-semibold text-[#003B3A]">
              Tỷ lệ đạt tiến bộ HS Homeschooling theo cơ sở
            </div>
            <div className="text-xs text-slate-500 mt-0.5 mb-3">
              Đơn vị: % lượt đạt tiến bộ trên tổng lượt đủ điểm đối chiếu
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
                    formatter={(
                      _val: unknown,
                      _name: unknown,
                      item: {
                        payload?: {
                          hasDenominator: boolean
                          progressCount: number
                          comparableRowCount: number
                          rate: number
                        }
                      }
                    ) => {
                      const p = item?.payload
                      if (!p || !p.hasDenominator) return ["—", "Tỷ lệ đạt tiến bộ"]
                      return [
                        `${p.progressCount}/${p.comparableRowCount} (${p.rate.toFixed(1).replace(".", ",")}%)`,
                        "Tỷ lệ đạt tiến bộ",
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
              Tổng hợp học sinh Homeschooling theo cơ sở
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
                  <th className="py-2.5 px-3 text-right text-teal-100">HS Homeschooling</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">HS có cam kết</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Lượt theo dõi</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Đạt chuẩn GK1</th>
                  <th className="py-2.5 px-3 text-right text-[#5EEAD4]">Tỷ lệ đạt tiến bộ</th>
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
                      key={row.key}
                      onClick={() => onSelectCampus(row.campusId)}
                      className="transition-colors align-middle hover:bg-[#F0FDFA]/70 cursor-pointer"
                    >
                      <td className="py-3 px-3 font-medium text-[#003B3A]">
                        {row.campusName}{" "}
                        <span className="text-slate-400 font-normal">({row.campusCode})</span>
                      </td>
                      <td className="py-3 px-3 text-right">{row.distinctStudentCount}</td>
                      <td className="py-3 px-3 text-right text-amber-700 font-medium">
                        {row.committedStudentCount}
                      </td>
                      <td className="py-3 px-3 text-right">{row.trackedRowCount}</td>
                      <td className="py-3 px-3 text-right">{row.gk1PassCount}</td>
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

      {/* 3. Bảng chi tiết theo dõi học sinh Homeschooling */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-[#003B3A]">
              Bảng chi tiết học sinh nhập học từ chương trình Homeschooling
            </div>
            <div className="text-xs text-slate-500 tabular-nums">
              {data.isSummaryOnly
                ? "Tài khoản chỉ có quyền xem số liệu tổng hợp."
                : `Hiển thị ${data.detailRows.length} lượt theo dõi môn của ${data.summary.distinctStudentCount} học sinh Homeschooling.`}
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
            <table className="w-full border-collapse min-w-[1180px]">
              <thead className="bg-[#003B3A] border-b border-[#003B3A] sticky top-0 z-20">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-2.5 px-3 text-center text-white w-12">STT</th>
                  <th className="py-2.5 px-3 text-left text-white sticky left-0 z-30 bg-[#003B3A] min-w-[190px]">
                    Học sinh &amp; Mã HS
                  </th>
                  <th className="py-2.5 px-3 text-left text-teal-100">Lớp / Cơ sở</th>
                  <th className="py-2.5 px-3 text-left text-teal-100">Cam kết</th>
                  <th className="py-2.5 px-3 text-left text-teal-100">Môn theo dõi</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">KSĐN</th>
                  <th className="py-2.5 px-3 text-right text-white">Giữa kỳ 1</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Cuối kỳ 1</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Giữa kỳ 2</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Cuối kỳ 2</th>
                  <th className="py-2.5 px-3 text-right text-[#5EEAD4]">
                    Chênh lệch GK1 − KSĐN
                  </th>
                  <th className="py-2.5 px-3 text-left text-[#5EEAD4]">Tiến bộ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-10 px-3 text-center text-slate-500">
                      Chưa có học sinh Homeschooling phù hợp với bộ lọc đang chọn.
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
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                            row.hasCommitment
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {row.commitmentSummary}
                        </span>
                        {row.learningModeLabel && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {row.learningModeLabel}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-[#003B3A]">{row.subjectName}</td>
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
                      <td className={`py-3 px-3 text-right ${getDeltaClasses(row.deltaGk1Ksdn)}`}>
                        {formatDeltaForDisplay(row.deltaGk1Ksdn)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${getOutcomeBadgeClasses(
                            row.gk1Outcome
                          )}`}
                        >
                          {row.gk1OutcomeLabel}
                        </span>
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
