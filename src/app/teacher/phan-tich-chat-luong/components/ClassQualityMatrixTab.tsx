"use client"

import { useState } from "react"
import { 
  Users, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Eye,
  BookOpen,
  HelpCircle,
  Clock,
  Layers
} from "lucide-react"
import Link from "next/link"

interface Props {
  classAnalytics: any[]
  trendMatrix: any[]
  evaluationPeriod: string
  onOpenTracking: (classItem: any) => void
}

export function ClassQualityMatrixTab({
  classAnalytics,
  trendMatrix,
  evaluationPeriod,
  onOpenTracking
}: Props) {
  const [subView, setSubView] = useState<"snapshot" | "longitudinal">("snapshot")

  if (!classAnalytics || classAnalytics.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <BookOpen className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">Không có dữ liệu lớp phụ trách</h3>
        <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
          Không tìm thấy lớp học được phân công giảng dạy cho môn học và năm học đang chọn.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sub navigation toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/70 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
          <button
            onClick={() => setSubView("snapshot")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              subView === "snapshot"
                ? "bg-white text-[#003B3A] shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span>Chi tiết Đợt {evaluationPeriod} (5 Dải phổ điểm)</span>
          </button>
          <button
            onClick={() => setSubView("longitudinal")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              subView === "longitudinal"
                ? "bg-white text-[#003B3A] shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#6930C3]" />
            <span>Tiến trình Đa kỳ (KSĐN → GK1 → CK1 → GK2 → CK2)</span>
          </button>
        </div>

        {/* Legend for 5 dải phổ điểm */}
        {subView === "snapshot" && (
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-500">Chuẩn SQMS:</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6930C3]"></span> Xuất sắc (9-10)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span> Giỏi (8-8.9)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]"></span> Khá (7-7.9)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span> TB (5-6.9)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span> Chưa đạt (&lt;5)
            </span>
          </div>
        )}
      </div>

      {subView === "snapshot" ? (
        /* Snapshot Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Lớp phụ trách</th>
                  <th className="py-3 px-3 text-center">Sĩ số / Đã chấm</th>
                  <th className="py-3 px-3 text-center">ĐTB Môn</th>
                  <th className="py-3 px-3 text-center">Trung vị</th>
                  <th className="py-3 px-3 text-center">Min - Max</th>
                  <th className="py-3 px-3 text-center">Độ lệch (σ)</th>
                  <th className="py-3 px-3 min-w-[170px] text-center">Cơ cấu Phổ điểm (5 Dải)</th>
                  <th className="py-3 px-3 text-center">Đạt Chuẩn SKL</th>
                  <th className="py-3 px-3 text-center">Chỉ tiêu Quota</th>
                  <th className="py-3 px-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {classAnalytics.map((c) => {
                  const b = c.bands || {}
                  const excPct = b.excellent?.pct || 0
                  const goodPct = b.good?.pct || 0
                  const satPct = b.satisfactory?.pct || 0
                  const avgPct = b.average?.pct || 0
                  const poorPct = b.poor?.pct || 0

                  return (
                    <tr key={c.classId} className="hover:bg-teal-50/20 transition-colors group">
                      {/* Class Name & System */}
                      <td className="py-3 px-4 font-medium">
                        <div className="flex flex-col">
                          <span className="text-slate-900 font-bold text-sm flex items-center gap-1.5">
                            {c.className}
                            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              Khối {c.grade || c.className.replace(/\D/g, "")}
                            </span>
                          </span>
                          <span className="text-[11px] text-slate-500 font-normal">
                            {c.educationSystem} • {c.campusName}
                          </span>
                        </div>
                      </td>

                      {/* Total / Graded */}
                      <td className="py-3 px-3 text-center tabular-nums">
                        <span className="font-semibold text-slate-800">{c.gradedCount}</span>
                        <span className="text-slate-400"> / {c.totalStudents}</span>
                        {c.missingCount > 0 && (
                          <div className="text-[10px] text-amber-600 font-medium">
                            Thiếu {c.missingCount}
                          </div>
                        )}
                      </td>

                      {/* ĐTB Môn */}
                      <td className="py-3 px-3 text-center tabular-nums">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg font-bold text-sm ${
                          c.avgScore >= 8.0 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : c.avgScore >= 6.5 
                            ? "bg-sky-50 text-sky-700 border border-sky-200" 
                            : c.avgScore >= 5.0 
                            ? "bg-amber-50 text-amber-700 border border-amber-200" 
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                          {c.avgScore > 0 ? c.avgScore.toFixed(1) : "—"}
                        </span>
                      </td>

                      {/* Median */}
                      <td className="py-3 px-3 text-center tabular-nums text-slate-600">
                        {c.median > 0 ? c.median.toFixed(1) : "—"}
                      </td>

                      {/* Min - Max */}
                      <td className="py-3 px-3 text-center tabular-nums text-xs">
                        <span className="text-red-600 font-medium">{c.minScore > 0 ? c.minScore : "0"}</span>
                        <span className="text-slate-400 mx-1">-</span>
                        <span className="text-emerald-600 font-semibold">{c.maxScore > 0 ? c.maxScore : "0"}</span>
                      </td>

                      {/* StdDev */}
                      <td className="py-3 px-3 text-center tabular-nums text-slate-500">
                        {c.stdDev > 0 ? c.stdDev.toFixed(2) : "0.00"}
                      </td>

                      {/* 5 Dải Phổ điểm Mini Stacked Bar */}
                      <td className="py-3 px-3 min-w-[170px]">
                        {c.gradedCount > 0 ? (
                          <div className="space-y-1">
                            {/* Stacked mini bar */}
                            <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden shadow-inner">
                              {excPct > 0 && <div style={{ width: `${excPct}%` }} className="bg-[#6930C3]" title={`Xuất sắc: ${excPct}% (${b.excellent?.count} HS)`} />}
                              {goodPct > 0 && <div style={{ width: `${goodPct}%` }} className="bg-[#10B981]" title={`Giỏi: ${goodPct}% (${b.good?.count} HS)`} />}
                              {satPct > 0 && <div style={{ width: `${satPct}%` }} className="bg-[#0284C7]" title={`Khá: ${satPct}% (${b.satisfactory?.count} HS)`} />}
                              {avgPct > 0 && <div style={{ width: `${avgPct}%` }} className="bg-[#F59E0B]" title={`Trung bình: ${avgPct}% (${b.average?.count} HS)`} />}
                              {poorPct > 0 && <div style={{ width: `${poorPct}%` }} className="bg-[#EF4444]" title={`Chưa đạt: ${poorPct}% (${b.poor?.count} HS)`} />}
                            </div>
                            {/* Labels */}
                            <div className="flex justify-between text-[10px] tabular-nums text-slate-500">
                              <span className="text-[#6930C3] font-medium" title="Xuất sắc">{b.excellent?.count || 0} XS</span>
                              <span className="text-[#10B981] font-medium" title="Giỏi">{b.good?.count || 0} G</span>
                              <span className="text-[#0284C7] font-medium" title="Khá">{b.satisfactory?.count || 0} K</span>
                              <span className="text-[#F59E0B] font-medium" title="Trung bình">{b.average?.count || 0} TB</span>
                              <span className="text-[#EF4444] font-medium" title="Chưa đạt">{b.poor?.count || 0} Y</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px] block text-center">Chưa có điểm</span>
                        )}
                      </td>

                      {/* Đạt chuẩn sàn SKL */}
                      <td className="py-3 px-3 text-center tabular-nums">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-800 text-xs">
                            {c.pctPassed}%
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({c.countPassed}/{c.gradedCount})
                          </span>
                          <span className="text-[9px] text-teal-700 bg-teal-50 px-1 rounded mt-0.5">
                            Sàn ≥ {c.benchmark}đ
                          </span>
                        </div>
                      </td>

                      {/* Quota Status */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[11px] text-slate-500 tabular-nums">Mục tiêu: {c.targetQuota}%</span>
                          {c.isMeetingQuota ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Đạt Quota
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-3 h-3" /> Chưa đạt
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenTracking(c)}
                            className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors"
                            title={`Xem ${c.trackingStudents?.length || 0} học sinh cần theo dõi trọng điểm`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/teacher/so-diem-nhan-xet`}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Mở sổ điểm chi tiết"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Longitudinal Trend Matrix */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Lớp phụ trách</th>
                  <th className="py-3 px-3 text-center">Sĩ số</th>
                  <th className="py-3 px-3 text-center">KSĐN</th>
                  <th className="py-3 px-3 text-center">GK1</th>
                  <th className="py-3 px-3 text-center">Δ (GK1 - KSĐN)</th>
                  <th className="py-3 px-3 text-center">CK1</th>
                  <th className="py-3 px-3 text-center">Δ (CK1 - GK1)</th>
                  <th className="py-3 px-3 text-center">GK2</th>
                  <th className="py-3 px-3 text-center">CK2</th>
                  <th className="py-3 px-3 text-center">Đánh giá Tiến trình</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {trendMatrix.map((t) => {
                  const p = t.periodStats || {}
                  const d = t.deltas || {}

                  const renderScore = (periodCode: string) => {
                    const st = p[periodCode]
                    if (!st || st.gradedCount === 0) return <span className="text-slate-400 italic">—</span>
                    return (
                      <span className="font-bold tabular-nums text-slate-800">
                        {st.avg.toFixed(1)}
                      </span>
                    )
                  }

                  const renderDelta = (deltaVal: number | null) => {
                    if (deltaVal === null || deltaVal === undefined) return <span className="text-slate-300">—</span>
                    if (deltaVal > 0) {
                      return (
                        <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] tabular-nums">
                          <TrendingUp className="w-3 h-3" /> +{deltaVal.toFixed(1)}
                        </span>
                      )
                    } else if (deltaVal < 0) {
                      return (
                        <span className="inline-flex items-center gap-0.5 text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded text-[11px] tabular-nums">
                          <TrendingDown className="w-3 h-3" /> {deltaVal.toFixed(1)}
                        </span>
                      )
                    }
                    return <span className="text-slate-500 font-medium tabular-nums">0.0</span>
                  }

                  return (
                    <tr key={t.classId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div className="font-bold text-sm">{t.className}</div>
                        <div className="text-[11px] text-slate-500 font-normal">{t.educationSystem}</div>
                      </td>
                      <td className="py-3 px-3 text-center tabular-nums font-semibold">{t.totalStudents}</td>
                      <td className="py-3 px-3 text-center bg-slate-50/40">{renderScore("KSĐN")}</td>
                      <td className="py-3 px-3 text-center">{renderScore("GK1")}</td>
                      <td className="py-3 px-3 text-center">{renderDelta(d.delta_gk1_ksdn)}</td>
                      <td className="py-3 px-3 text-center bg-slate-50/40">{renderScore("CK1")}</td>
                      <td className="py-3 px-3 text-center">{renderDelta(d.delta_ck1_gk1)}</td>
                      <td className="py-3 px-3 text-center">{renderScore("GK2")}</td>
                      <td className="py-3 px-3 text-center bg-slate-50/40">{renderScore("CK2")}</td>
                      <td className="py-3 px-3 text-center">
                        {d.delta_ck1_gk1 !== null && d.delta_ck1_gk1 >= 0.3 ? (
                          <span className="text-emerald-700 text-[11px] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            🟢 Tăng trưởng tốt
                          </span>
                        ) : d.delta_ck1_gk1 !== null && d.delta_ck1_gk1 < 0 ? (
                          <span className="text-red-700 text-[11px] font-semibold bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            🔴 Cần can thiệp
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px] font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                            🟡 Duy trì ổn định
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
