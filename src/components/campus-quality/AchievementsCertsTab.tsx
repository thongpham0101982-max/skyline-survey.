"use client"

import React, { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AchievementsCertsTabPayload } from "@/lib/campus-quality/types"

interface AchievementsCertsTabProps {
  data: AchievementsCertsTabPayload
}

export function AchievementsCertsTab({ data }: AchievementsCertsTabProps) {
  const [expandedExamId, setExpandedExamId] = useState<string | null>(
    data.exams[0]?.examId || null
  )
  const [expandedClassKey, setExpandedClassKey] = useState<string | null>(null)

  const examChartData = data.exams.slice(0, 10).map((ex) => ({
    name: ex.examName.length > 26 ? `${ex.examName.slice(0, 26)}…` : ex.examName,
    sat: ex.satCount,
    awarded: ex.awardedCount,
    certs: ex.certificatesIssuedCount,
  }))

  return (
    <div className="space-y-5">
      {/* Tóm tắt đúng đơn vị đếm */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 tabular-nums">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <div className="text-xs text-slate-500">HS dự thi (duy nhất)</div>
          <div className="text-2xl font-bold text-[#003B3A] mt-1">
            {data.summary.uniqueParticipants.toLocaleString("vi-VN")}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <div className="text-xs text-slate-500">Tổng lượt dự thi</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">
            {data.summary.totalSittings.toLocaleString("vi-VN")}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <div className="text-xs text-slate-500">HS đạt giải / đạt mục tiêu</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {data.summary.uniqueAwarded.toLocaleString("vi-VN")}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <div className="text-xs text-slate-500">Tổng số giải thưởng</div>
          <div className="text-2xl font-bold text-[#00736E] mt-1">
            {data.summary.totalAwards.toLocaleString("vi-VN")}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <div className="text-xs text-slate-500">Chứng chỉ đã cấp</div>
          <div className="text-2xl font-bold text-[#003B3A] mt-1">
            {data.summary.certificatesIssued.toLocaleString("vi-VN")}
          </div>
        </div>
      </div>

      {/* Biểu đồ tổng quan theo kỳ thi */}
      {examChartData.length > 0 && (
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5">
          <h3 className="text-sm font-semibold text-[#003B3A] mb-3">
            Biểu đồ dự thi, đạt giải và chứng chỉ theo kỳ thi
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={examChartData} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, borderColor: "#E2E8F0" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="sat" name="Dự thi" fill="#003B3A" radius={[3, 3, 0, 0]} />
                <Bar dataKey="awarded" name="Đạt giải / Mục tiêu" fill="#059669" radius={[3, 3, 0, 0]} />
                <Bar dataKey="certs" name="Chứng chỉ đã cấp" fill="#00A19A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Bảng phân cấp: Kỳ thi → Khối/Lớp → Học sinh */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0]">
          <h3 className="text-sm font-semibold text-[#003B3A]">
            Chi tiết theo kỳ thi → khối/lớp → học sinh
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr>
                <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-white whitespace-nowrap">Kỳ thi / Đợt khảo thí</th>
                <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Phân loại</th>
                <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Đăng ký</th>
                <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Dự thi</th>
                <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Có kết quả</th>
                <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">Đạt giải / Mục tiêu</th>
                <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">Chứng chỉ đã cấp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {data.exams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Chưa có dữ liệu kỳ thi hoặc chứng chỉ trong phạm vi lọc.
                  </td>
                </tr>
              ) : (
                data.exams.map((ex) => {
                  const isOpen = expandedExamId === ex.examId
                  return (
                    <React.Fragment key={ex.examId}>
                      <tr
                        onClick={() => setExpandedExamId(isOpen ? null : ex.examId)}
                        className="hover:bg-[#F0FDFA]/70 transition-colors cursor-pointer align-middle"
                      >
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          <div className="inline-flex items-center gap-2">
                            {isOpen ? (
                              <ChevronDown className="w-4 h-4 text-[#003B3A]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                            {ex.examName}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{ex.categoryLabel}</td>
                        <td className="py-3 px-3 text-right text-slate-700">{ex.registeredCount}</td>
                        <td className="py-3 px-3 text-right text-slate-700">{ex.satCount}</td>
                        <td className="py-3 px-3 text-right text-slate-700">{ex.hasResultCount}</td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                          {ex.awardedCount}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-[#00736E]">
                          {ex.certificatesIssuedCount}
                        </td>
                      </tr>

                      {isOpen && (
                        <tr>
                          <td colSpan={7} className="bg-[#F8FAFC] p-4">
                            <div className="space-y-3">
                              {ex.gradeClassBreakdown.map((gc) => {
                                const gcKey = `${ex.examId}::${gc.grade}::${gc.className}`
                                const gcOpen = expandedClassKey === gcKey
                                return (
                                  <div
                                    key={gcKey}
                                    className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setExpandedClassKey(gcOpen ? null : gcKey)}
                                      className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[#F8FAFC]"
                                    >
                                      <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#003B3A]">
                                        {gcOpen ? (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                        )}
                                        Khối {gc.grade} · Lớp {gc.className}
                                      </div>
                                      <div className="text-[11px] text-slate-600 space-x-3">
                                        <span>Dự thi: {gc.satCount}</span>
                                        <span className="text-emerald-700 font-medium">
                                          Đạt: {gc.awardedCount}
                                        </span>
                                        <span className="text-[#00736E] font-medium">
                                          Chứng chỉ: {gc.certificatesIssuedCount}
                                        </span>
                                      </div>
                                    </button>
                                    {gcOpen && (
                                      <div className="border-t border-[#E2E8F0] overflow-x-auto">
                                        <table className="w-full border-collapse">
                                          <thead className="bg-[#003B3A]">
                                            <tr>
                                              <th className="py-2 px-3 text-left text-[11px] font-semibold text-white">Học sinh</th>
                                              <th className="py-2 px-3 text-left text-[11px] font-semibold text-[#5EEAD4]">Giải thưởng / Mức</th>
                                              <th className="py-2 px-3 text-left text-[11px] font-semibold text-teal-100">Điểm / Band</th>
                                              <th className="py-2 px-3 text-left text-[11px] font-semibold text-teal-100">Chứng chỉ</th>
                                              <th className="py-2 px-3 text-left text-[11px] font-semibold text-teal-100">GV bồi dưỡng / Phụ trách</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white">
                                            {gc.students.map((st, idx) => (
                                              <tr key={`${st.studentId}_${idx}`} className="hover:bg-[#F8FAFC]">
                                                <td className="py-2.5 px-3">
                                                  <div className="font-medium text-slate-900">{st.studentName}</div>
                                                  <div className="text-[11px] text-slate-500">{st.studentCode}</div>
                                                </td>
                                                <td className="py-2.5 px-3 font-medium text-emerald-700">{st.awardOrLevel}</td>
                                                <td className="py-2.5 px-3 font-semibold text-[#003B3A]">{st.scoreOrBand}</td>
                                                <td className="py-2.5 px-3 text-slate-700">{st.certificateStatus}</td>
                                                <td className="py-2.5 px-3 text-slate-600">{st.ownerTeacher}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
