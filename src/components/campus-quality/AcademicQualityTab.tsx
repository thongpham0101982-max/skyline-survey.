"use client"

import React, { useState } from "react"
import { ArrowUpRight, Globe } from "lucide-react"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AcademicQualityTabPayload, DashboardTabKey } from "@/lib/campus-quality/types"

interface AcademicQualityTabProps {
  data: AcademicQualityTabPayload
  matchedCohortOnly: boolean
  onToggleMatchedCohort: (val: boolean) => void
  onOpenCellDrilldown: (opts: { classId?: string; subjectId?: string; key?: string }) => void
  onNavigateTab: (tab: DashboardTabKey) => void
  initialSubView?: "GENERAL" | "INTERNATIONAL"
}

function fmtScore(v: number | null): string {
  if (v === null || v === undefined) return "—"
  return v.toFixed(2).replace(".", ",")
}

function fmtPct(v: number | null): string {
  if (v === null || v === undefined) return "—"
  return `${v.toFixed(1).replace(".", ",")}%`
}

export function AcademicQualityTab({
  data,
  matchedCohortOnly,
  onToggleMatchedCohort,
  onOpenCellDrilldown,
  onNavigateTab,
  initialSubView = "GENERAL",
}: AcademicQualityTabProps) {
  const [subView, setSubView] = useState<"GENERAL" | "INTERNATIONAL">(initialSubView)

  const cellLookup = new Map(data.heatmap.cells.map((c) => [`${c.classId}::${c.subjectId}`, c]))

  const heatmapTone = (rate: number | null, status: "CONFIGURED" | "UNCONFIGURED") => {
    if (status === "UNCONFIGURED" || rate === null) return "bg-slate-100 text-slate-600 border-slate-200"
    if (rate >= 80) return "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
    if (rate >= 65) return "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
    return "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
  }

  return (
    <div className="space-y-5">
      {/* Sub-navigation: Kiểm tra định kỳ nội bộ vs Môn học Quốc tế */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[#E2E8F0] bg-white p-1 text-xs">
          <button
            type="button"
            onClick={() => setSubView("GENERAL")}
            className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
              subView === "GENERAL" ? "bg-[#003B3A] text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Kết quả kiểm tra định kỳ ({data.periodLabel})
          </button>
          <button
            type="button"
            onClick={() => setSubView("INTERNATIONAL")}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium transition-colors ${
              subView === "INTERNATIONAL"
                ? "bg-[#003B3A] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Môn học Quốc tế ({data.internationalSubjects.length})
          </button>
        </div>
        <span className="text-xs text-slate-500">
          Điểm 0 hợp lệ được tính vào phổ điểm · Vắng, miễn tách trạng thái riêng
        </span>
      </div>

      {subView === "INTERNATIONAL" ? (
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#003B3A]">
                Môn học Quốc tế theo chương trình × môn × khối
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Giữ nguyên thang điểm hoặc mức đánh giá gốc, kèm kết quả theo kỹ năng thành phần
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-white whitespace-nowrap">Chương trình · Môn</th>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Khối</th>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Thang đánh giá gốc</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">HS có kết quả</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">Tỷ lệ đạt mục tiêu</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">HS dưới mục tiêu</th>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Kỹ năng / Thành phần</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-white whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {data.internationalSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      Chưa có dữ liệu môn học Quốc tế hoặc chứng chỉ trong phạm vi lọc.
                    </td>
                  </tr>
                ) : (
                  data.internationalSubjects.map((row) => (
                    <tr key={row.rowKey} className="hover:bg-[#F8FAFC] transition-colors align-middle">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{row.subjectName}</div>
                        <div className="text-[11px] text-slate-500">{row.program}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">Khối {row.grade}</td>
                      <td className="py-3 px-3 text-slate-600">
                        <div>{row.scaleLabel}</div>
                        <div className="text-[11px] text-slate-500">Mục tiêu: {row.targetRuleLabel}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-900">
                        {row.resultCount} / {row.expectedCount}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                        {fmtPct(row.meetTargetRate)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-rose-700">
                        {row.belowTargetCount}
                      </td>
                      <td className="py-3 px-3">
                        {row.skillsBreakdown.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {row.skillsBreakdown.slice(0, 4).map((sk) => (
                              <span
                                key={sk.skill}
                                className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-slate-700"
                              >
                                {sk.label}: <strong>{sk.averageOrPass}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {row.sourceType === "INTL_EXAM_CERT" ? (
                          <button
                            type="button"
                            onClick={() => onNavigateTab("achievements")}
                            className="inline-flex items-center gap-1 text-[#00736E] hover:text-[#003B3A] font-medium whitespace-nowrap"
                          >
                            Mở Thành tích & CC <ArrowUpRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSubView("GENERAL")}
                            className="inline-flex items-center gap-1 text-[#00736E] hover:text-[#003B3A] font-medium whitespace-nowrap"
                          >
                            Bảng chất lượng môn <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <>
          {/* 1. Bảng theo Môn × Khối */}
          <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#003B3A]">
                Chất lượng theo môn × khối · {data.periodLabel}
              </h3>
              <span className="text-xs text-slate-500">
                Bấm vào một dòng môn để mở danh sách học sinh & giáo viên phụ trách
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr>
                    <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-white whitespace-nowrap">Môn học · Khối</th>
                    <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Có điểm / Dự kiến</th>
                    <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">ĐTB</th>
                    <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Trung vị</th>
                    <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Dưới 5,0</th>
                    <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Dưới chuẩn SKL</th>
                    <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">Đạt chuẩn SKL</th>
                    <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">So với hệ thống</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {data.subjectGradeRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500">
                        Chưa có dữ liệu điểm hợp lệ cho kỳ {data.periodLabel} theo bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    data.subjectGradeRows.map((row) => (
                      <tr
                        key={row.rowKey}
                        onClick={() => onOpenCellDrilldown({ subjectId: row.subjectId })}
                        className="hover:bg-[#F0FDFA]/60 transition-colors cursor-pointer align-middle"
                      >
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{row.subjectName}</div>
                          <div className="text-[11px] text-slate-500">
                            Khối {row.grade} · Vắng {row.absentCount} · Miễn {row.exemptCount}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {row.validCount} / {row.expectedCount}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-[#003B3A]">
                          {fmtScore(row.average)}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">{fmtScore(row.median)}</td>
                        <td className="py-3 px-3 text-right text-rose-700">
                          {row.below5Count} ({fmtPct(row.below5Rate)})
                        </td>
                        <td className="py-3 px-3 text-right">
                          {row.benchmarkStatus === "UNCONFIGURED" ? (
                            <span className="text-amber-700">Chưa cấu hình ngưỡng</span>
                          ) : (
                            <span className="text-amber-700">
                              {row.belowBenchmarkCount} ({fmtPct(row.belowBenchmarkRate)})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                          {row.benchmarkStatus === "UNCONFIGURED"
                            ? "Chưa cấu hình ngưỡng"
                            : `${row.meetBenchmarkCount} (${fmtPct(row.meetBenchmarkRate)})`}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {row.diffPp === null ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span
                              className={`font-semibold ${
                                row.diffPp >= 0 ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {row.diffPp >= 0 ? "+" : ""}
                              {row.diffPp.toFixed(1).replace(".", ",")} đpt
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2. Phổ điểm đối sánh 3 lớp & Xu hướng qua các kỳ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Phổ điểm đối sánh */}
            <section className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E2E8F0]">
                <h3 className="text-sm font-semibold text-[#003B3A]">
                  Phổ điểm đối sánh: {data.distributionComparison.selectedClassLabel} ·{" "}
                  {data.distributionComparison.selectedSubjectLabel}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tỷ lệ học sinh (%) theo khoảng điểm so với {data.distributionComparison.selectedGradeLabel} tại cơ sở và toàn hệ thống
                </p>
              </div>
              <div className="p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.distributionComparison.buckets}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#475569" }} />
                    <YAxis unit="%" tick={{ fontSize: 11, fill: "#475569" }} />
                    <Tooltip
                      formatter={(val: any) => `${val}%`}
                      contentStyle={{ fontSize: 12, borderRadius: 10, borderColor: "#E2E8F0" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="classPct"
                      name={data.distributionComparison.selectedClassLabel}
                      fill="#003B3A"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="campusGradePct"
                      name="Cùng khối tại cơ sở"
                      stroke="#00A19A"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                    <Line
                      type="monotone"
                      dataKey="systemGradePct"
                      name="Cùng khối toàn hệ thống"
                      stroke="#D97706"
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto border-t border-[#E2E8F0]">
                <table className="w-full border-collapse">
                  <thead className="bg-[#003B3A]">
                    <tr>
                      <th className="py-2 px-3 text-left text-[11px] font-semibold text-white">Phạm vi đối sánh</th>
                      <th className="py-2 px-3 text-right text-[11px] font-semibold text-teal-100">ĐTB</th>
                      <th className="py-2 px-3 text-right text-[11px] font-semibold text-teal-100">Trung vị</th>
                      <th className="py-2 px-3 text-right text-[11px] font-semibold text-[#5EEAD4]">Phổ biến (Mode)</th>
                      <th className="py-2 px-3 text-right text-[11px] font-semibold text-teal-100">Tỷ lệ ≥ 7,0</th>
                      <th className="py-2 px-3 text-right text-[11px] font-semibold text-teal-100">Điểm 10</th>
                      <th className="py-2 px-3 text-right text-[11px] font-semibold text-teal-100">Độ lệch chuẩn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {data.distributionComparison.statsComparison.map((st) => (
                      <tr key={st.scopeLabel} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {st.scopeLabel} <span className="text-slate-400">({st.validCount})</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[#003B3A]">{fmtScore(st.average)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">{fmtScore(st.median)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[#00736E]">{fmtScore(st.mode)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">{fmtPct(st.rateGte7)}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-medium">{st.count10}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{fmtScore(st.stdDev)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Xu hướng qua các kỳ + Chế độ Matched Cohort */}
            <section className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col">
              <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[#003B3A]">Xu hướng qua các kỳ</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {matchedCohortOnly
                      ? `Chỉ tính nhóm HS có điểm hợp lệ ở ≥ 2 kỳ (${data.periodTrend.matchedPairCount} cặp HS × môn)`
                      : "Toàn bộ kết quả hợp lệ từng kỳ"}
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={matchedCohortOnly}
                    onChange={(e) => onToggleMatchedCohort(e.target.checked)}
                    className="rounded border-slate-300 text-[#003B3A] focus:ring-[#00A19A]"
                  />
                  Nhóm HS có điểm cả hai kỳ
                </label>
              </div>
              <div className="p-4 h-72 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.periodTrend.points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="periodLabel" tick={{ fontSize: 11, fill: "#475569" }} />
                    <YAxis yAxisId="left" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#475569" }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 10]} tick={{ fontSize: 11, fill: "#475569" }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, borderColor: "#E2E8F0" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="meetBenchmarkRate"
                      name="% Đạt chuẩn SKL"
                      stroke="#059669"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="average"
                      name="Điểm trung bình"
                      stroke="#003B3A"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* 3. Bản đồ Lớp × Môn (Heatmap) */}
          {data.heatmap.classes.length > 0 && data.heatmap.subjects.length > 0 && (
            <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#003B3A]">
                  Bản đồ chất lượng lớp × môn · {data.periodLabel}
                </h3>
                <span className="text-xs text-slate-500">
                  Bấm vào từng ô để mở danh sách HS và GV phụ trách
                </span>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="w-full border-collapse tabular-nums">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-[11px] font-semibold text-[#003B3A] bg-[#F8FAFC] border border-[#E2E8F0]">
                        Lớp
                      </th>
                      {data.heatmap.subjects.map((s) => (
                        <th
                          key={s.id}
                          className="p-2 text-center text-[11px] font-semibold text-[#003B3A] bg-[#F8FAFC] border border-[#E2E8F0] whitespace-nowrap"
                        >
                          {s.subjectName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.heatmap.classes.slice(0, 30).map((cls) => (
                      <tr key={cls.id}>
                        <td className="p-2 text-xs font-semibold text-slate-900 bg-[#F8FAFC] border border-[#E2E8F0] whitespace-nowrap">
                          {cls.className}
                        </td>
                        {data.heatmap.subjects.map((s) => {
                          const cell = cellLookup.get(`${cls.id}::${s.id}`)
                          if (!cell) {
                            return (
                              <td
                                key={s.id}
                                className="p-2 text-center text-[11px] text-slate-300 border border-[#E2E8F0]"
                              >
                                —
                              </td>
                            )
                          }
                          return (
                            <td key={s.id} className="p-1 border border-[#E2E8F0]">
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenCellDrilldown({ classId: cls.id, subjectId: s.id })
                                }
                                title={`GV: ${cell.teacherName} · Có điểm ${cell.validCount}/${cell.expectedCount}`}
                                className={`w-full rounded-lg border px-2 py-1.5 text-center transition-colors ${heatmapTone(
                                  cell.meetBenchmarkRate,
                                  cell.benchmarkStatus
                                )}`}
                              >
                                <div className="text-xs font-bold">
                                  {cell.benchmarkStatus === "CONFIGURED" && cell.meetBenchmarkRate !== null
                                    ? `${cell.meetBenchmarkRate.toFixed(0)}%`
                                    : fmtScore(cell.average)}
                                </div>
                                <div className="text-[10px] opacity-80">
                                  ĐTB {fmtScore(cell.average)}
                                </div>
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 4. Kết quả theo GV × Môn × Lớp */}
          <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-semibold text-[#003B3A]">
                Kết quả theo giáo viên × môn × lớp · {data.periodLabel}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr>
                    <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-white whitespace-nowrap">Giáo viên phụ trách</th>
                    <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Môn học</th>
                    <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Lớp</th>
                    <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Có điểm / Dự kiến</th>
                    <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">ĐTB</th>
                    <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">Đạt chuẩn SKL</th>
                    <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Dưới 5,0</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {data.teacherRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Chưa có dữ liệu phân công giảng dạy gắn điểm cho kỳ này.
                      </td>
                    </tr>
                  ) : (
                    data.teacherRows.slice(0, 100).map((r) => (
                      <tr
                        key={r.rowKey}
                        onClick={() =>
                          onOpenCellDrilldown({ classId: r.classId, subjectId: r.subjectId })
                        }
                        className="hover:bg-[#F8FAFC] transition-colors cursor-pointer align-middle"
                      >
                        <td className="py-3 px-3 font-medium text-slate-900">{r.teacherName}</td>
                        <td className="py-3 px-3 text-slate-700">{r.subjectName}</td>
                        <td className="py-3 px-3 text-slate-700">{r.className}</td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          {r.validCount} / {r.expectedCount}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-[#003B3A]">
                          {fmtScore(r.average)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                          {r.benchmarkStatus === "UNCONFIGURED"
                            ? "Chưa cấu hình ngưỡng"
                            : fmtPct(r.meetBenchmarkRate)}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-700">{r.below5Count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
