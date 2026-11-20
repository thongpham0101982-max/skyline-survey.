"use client"

import React, { useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AdmissionsMobilityTabPayload } from "@/lib/campus-quality/types"

interface AdmissionsMobilityTabProps {
  data: AdmissionsMobilityTabPayload
  onOpenDrilldown: (key: string) => void
}

export function AdmissionsMobilityTab({ data, onOpenDrilldown }: AdmissionsMobilityTabProps) {
  const [mobilityFilter, setMobilityFilter] = useState<string>("ALL")

  const filteredMobility = data.mobilityRows.filter((r) =>
    mobilityFilter === "ALL" ? true : r.movementType === mobilityFilter
  )

  const batchChartData = data.batchGradeRows.slice(0, 12).map((r) => ({
    label: `${r.batchName} (K${r.targetGrade})`,
    surveyed: r.surveyedCount,
    passed: r.passedCount,
    enrolled: r.enrolledCount,
  }))

  const mobilityBreakdownChart = [
    { name: "Nhập mới", value: data.mobilitySummary.newEnrollments, color: "#003B3A" },
    { name: "Ngoài đến", value: data.mobilitySummary.externalIn, color: "#059669" },
    { name: "Nội bộ đến", value: data.mobilitySummary.internalIn, color: "#00A19A" },
    { name: "Ngoài đi", value: data.mobilitySummary.externalOut, color: "#E11D48" },
    { name: "Nội bộ đi", value: data.mobilitySummary.internalOut, color: "#D97706" },
  ]

  const badgeTone = (type: string) => {
    if (type === "NEW_ENROLLMENT") return "bg-emerald-50 text-emerald-700 border-emerald-200"
    if (type === "EXTERNAL_IN" || type === "INTERNAL_IN")
      return "bg-[#F0FDFA] text-[#00736E] border-[#99F6E4]"
    return "bg-rose-50 text-rose-700 border-rose-200"
  }

  return (
    <div className="space-y-5">
      {/* Tóm tắt Tuyển sinh & Đầu vào */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <button
          type="button"
          onClick={() => onOpenDrilldown("ENTRANCE_SURVEYED")}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-4 text-left hover:border-[#00A19A] transition-colors"
        >
          <div className="text-xs text-slate-500">Đã khảo sát (năm học)</div>
          <div className="text-2xl font-bold text-[#003B3A] mt-1">
            {data.summary.surveyedCount.toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-[#00736E] mt-1">Mở danh sách học sinh</div>
        </button>
        <button
          type="button"
          onClick={() => onOpenDrilldown("ENTRANCE_PASSED")}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-4 text-left hover:border-emerald-400 transition-colors"
        >
          <div className="text-xs text-slate-500">Đạt (theo kết luận đã duyệt)</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {data.summary.passedCount.toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Bấm xem hồ sơ đã duyệt</div>
        </button>
        <button
          type="button"
          onClick={() => onOpenDrilldown("ENTRANCE_ENROLLED")}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-4 text-left hover:border-[#00A19A] transition-colors"
        >
          <div className="text-xs text-slate-500">Đã nhập học (đã xác nhận)</div>
          <div className="text-2xl font-bold text-[#00736E] mt-1">
            {data.summary.enrolledCount.toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Hồ sơ nhập học đã xác nhận</div>
        </button>
        <button
          type="button"
          onClick={() => onOpenDrilldown("ENTRANCE_PENDING_CURRENT_MONTH")}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-4 text-left hover:border-amber-400 transition-colors"
        >
          <div className="text-xs text-slate-500">
            Đầu vào chờ xét duyệt · {data.summary.currentMonthLabel}
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {data.summary.pendingCurrentMonthCount.toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-amber-700 mt-1">Tháng hiện tại cần xử lý</div>
        </button>
      </div>

      {/* Biểu đồ trực quan Tuyển sinh & Cơ cấu Biến động */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5">
          <h3 className="text-sm font-semibold text-[#003B3A] mb-3">
            Biểu đồ tuyển sinh theo đợt & khối dự kiến
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={batchChartData} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, borderColor: "#E2E8F0" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="surveyed" name="Đã khảo sát" fill="#003B3A" radius={[3, 3, 0, 0]} />
                <Bar dataKey="passed" name="Đạt (đã duyệt)" fill="#059669" radius={[3, 3, 0, 0]} />
                <Bar dataKey="enrolled" name="Đã nhập học" fill="#00A19A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5">
          <h3 className="text-sm font-semibold text-[#003B3A] mb-3">
            Cơ cấu biến động (Nhập mới · Ngoài · Nội bộ Sky-Line)
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mobilityBreakdownChart} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, borderColor: "#E2E8F0" }} />
                <Bar dataKey="value" name="Lượt biến động" radius={[4, 4, 0, 0]} barSize={32}>
                  {mobilityBreakdownChart.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Bảng theo Đợt tuyển sinh × Khối dự kiến */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0]">
          <h3 className="text-sm font-semibold text-[#003B3A]">
            Kết quả tuyển sinh theo đợt và khối dự kiến
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr>
                <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-white whitespace-nowrap">Đợt tuyển sinh</th>
                <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Khối dự kiến</th>
                <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Đã khảo sát</th>
                <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">Đạt (đã duyệt)</th>
                <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Trong đó cam kết</th>
                <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">Đã nhập học</th>
                <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Chờ xét duyệt</th>
                <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Tỷ lệ đạt / Nhập học</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {data.batchGradeRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Chưa có hồ sơ khảo sát đầu vào trong phạm vi lọc.
                  </td>
                </tr>
              ) : (
                data.batchGradeRows.map((row) => (
                  <tr key={row.rowKey} className="hover:bg-[#F8FAFC] transition-colors align-middle">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{row.batchName}</div>
                      <div className="text-[11px] text-slate-500">
                        {row.blockType === "MAM_NON" ? "Mầm non" : "Phổ thông K-12"}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">Khối {row.targetGrade}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-900">{row.surveyedCount}</td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-700">{row.passedCount}</td>
                    <td className="py-3 px-3 text-right text-amber-700">{row.committedCount}</td>
                    <td className="py-3 px-3 text-right font-semibold text-[#00736E]">{row.enrolledCount}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{row.pendingCount}</td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {row.passRate !== null ? `${row.passRate.toFixed(1).replace(".", ",")}%` : "—"} /{" "}
                      {row.enrollmentRate !== null
                        ? `${row.enrollmentRate.toFixed(1).replace(".", ",")}%`
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Khu vực biến động tách riêng Nhập mới / Ngoài hệ thống / Nội bộ Sky-Line */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#003B3A]">
              Chi tiết biến động học sinh theo ngày hiệu lực
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Nhập mới: {data.mobilitySummary.newEnrollments} · Trường ngoài đến/đi: +{data.mobilitySummary.externalIn} / -{data.mobilitySummary.externalOut} · Chuyển nội bộ Sky-Line đến/đi: +{data.mobilitySummary.internalIn} / -{data.mobilitySummary.internalOut} (Ròng nội bộ toàn hệ thống: {data.mobilitySummary.systemInternalNet})
            </p>
          </div>
          <select
            value={mobilityFilter}
            onChange={(e) => setMobilityFilter(e.target.value)}
            className="text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-slate-700 focus:outline-none focus:border-[#00A19A]"
          >
            <option value="ALL">Tất cả loại biến động</option>
            <option value="NEW_ENROLLMENT">Nhập học mới</option>
            <option value="EXTERNAL_IN">Chuyển đến (Trường ngoài)</option>
            <option value="EXTERNAL_OUT">Chuyển đi (Trường ngoài)</option>
            <option value="INTERNAL_IN">Chuyển đến (Nội bộ Sky-Line)</option>
            <option value="INTERNAL_OUT">Chuyển đi (Nội bộ Sky-Line)</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr>
                <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-white whitespace-nowrap">Học sinh</th>
                <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Lớp · Cơ sở</th>
                <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">Loại biến động</th>
                <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Ngày hiệu lực</th>
                <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Trường / Cơ sở liên quan</th>
                <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Ghi chú / Lý do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {filteredMobility.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Không có bản ghi biến động học sinh trong phạm vi lọc.
                  </td>
                </tr>
              ) : (
                filteredMobility.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors align-middle">
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{row.studentName}</div>
                      <div className="text-[11px] text-slate-500">{row.studentCode}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {row.className} · {row.campusName}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-medium ${badgeTone(
                          row.movementType
                        )}`}
                      >
                        {row.movementLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">{row.effectiveDate}</td>
                    <td className="py-3 px-3 text-slate-700">{row.counterpartySchoolOrCampus}</td>
                    <td className="py-3 px-3 text-slate-600">{row.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
