"use client"

import React, { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { ObservationTabPayload } from "@/lib/campus-quality/types"

interface ObservationTabProps {
  data: ObservationTabPayload
  onOpenDrilldown: (key: string) => void
}

export function ObservationTab({ data, onOpenDrilldown }: ObservationTabProps) {
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(
    data.departments[0]?.departmentId || null
  )
  const [showUnobservedOnly, setShowUnobservedOnly] = useState(false)

  return (
    <div className="space-y-5">
      {/* Tóm tắt Dự giờ theo tháng */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 tabular-nums">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <div className="text-xs text-slate-500">Tiết đã dự giờ / Kế hoạch</div>
          <div className="text-2xl font-bold text-[#003B3A] mt-1">
            {data.summary.observedLessons}/{data.summary.plannedLessons}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{data.monthLabel}</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <div className="text-xs text-slate-500">GV được dự giờ / Kế hoạch</div>
          <div className="text-2xl font-bold text-[#00736E] mt-1">
            {data.summary.observedTeachers}/{data.summary.plannedTeachers}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowUnobservedOnly((v) => !v)}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-4 text-left hover:border-amber-400 transition-colors"
        >
          <div className="text-xs text-slate-500">GV chưa được dự giờ</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {data.summary.unobservedTeachers}
          </div>
          <div className="text-[11px] text-amber-700 mt-1">
            {showUnobservedOnly ? "Đang lọc danh sách rà soát" : "Bấm rà soát kế hoạch"}
          </div>
        </button>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <div className="text-xs text-slate-500">GV dạy học theo quy định</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {data.summary.compliantTeachers}/{data.summary.evaluatedTeachers}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Theo phiếu đánh giá đã duyệt</div>
        </div>
        <button
          type="button"
          onClick={() => onOpenDrilldown("PENDING_OBSERVATION_FORMS")}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-4 text-left hover:border-rose-400 transition-colors"
        >
          <div className="text-xs text-slate-500">Phiếu chờ duyệt</div>
          <div className="text-2xl font-bold text-rose-700 mt-1">
            {data.summary.pendingReviewForms}
          </div>
          <div className="text-[11px] text-rose-700 mt-1">Mở danh sách chờ duyệt</div>
        </button>
      </div>

      {showUnobservedOnly ? (
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#003B3A]">
              Danh sách giáo viên chưa được dự giờ · {data.monthLabel}
            </h3>
            <button
              type="button"
              onClick={() => setShowUnobservedOnly(false)}
              className="text-xs font-medium text-[#00736E] hover:text-[#003B3A]"
            >
              Quay lại bảng theo tổ chuyên môn
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-[#003B3A]">
                <tr>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-white">Giáo viên</th>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100">Tổ chuyên môn</th>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100">Cơ sở</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100">Kế hoạch tiết</th>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-[#5EEAD4]">Người phụ trách rà soát</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {data.unobservedTeachersList.map((t) => (
                  <tr key={t.teacherId} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{t.teacherName}</div>
                      <div className="text-[11px] text-slate-500">{t.teacherCode}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{t.departmentName}</td>
                    <td className="py-3 px-3 text-slate-700">{t.campusName}</td>
                    <td className="py-3 px-3 text-right text-slate-700">{t.plannedLessons}</td>
                    <td className="py-3 px-3 text-slate-700">{t.ownerLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0]">
            <h3 className="text-sm font-semibold text-[#003B3A]">
              Tiến độ dự giờ theo tổ chuyên môn → giáo viên · {data.monthLabel}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-[#003B3A]">
                <tr>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-white">Tổ chuyên môn</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100">Tiết dự / KH</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100">GV đã dự / Tổng GV</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100">GV chưa dự</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4]">GV dạy theo QĐ</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100">Phiếu chờ duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {data.departments.map((d) => {
                  const open = expandedDeptId === d.departmentId
                  return (
                    <React.Fragment key={d.departmentId}>
                      <tr
                        onClick={() => setExpandedDeptId(open ? null : d.departmentId)}
                        className="hover:bg-[#F0FDFA]/70 cursor-pointer align-middle"
                      >
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          <div className="inline-flex items-center gap-2">
                            {open ? (
                              <ChevronDown className="w-4 h-4 text-[#003B3A]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                            {d.departmentName}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {d.observedLessons}/{d.plannedLessons}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {d.observedTeacherCount}/{d.teacherCount}
                        </td>
                        <td className="py-3 px-3 text-right text-amber-700 font-medium">
                          {d.unobservedTeacherCount}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                          {d.compliantTeachers}/{d.evaluatedTeachers}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-700">{d.pendingForms}</td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={6} className="bg-[#F8FAFC] p-4">
                            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead className="bg-[#003B3A]">
                                  <tr>
                                    <th className="py-2 px-3 text-left text-[11px] font-semibold text-white">Giáo viên</th>
                                    <th className="py-2 px-3 text-right text-[11px] font-semibold text-teal-100">Tiết dự / KH</th>
                                    <th className="py-2 px-3 text-left text-[11px] font-semibold text-[#5EEAD4]">Trạng thái dự giờ</th>
                                    <th className="py-2 px-3 text-left text-[11px] font-semibold text-[#5EEAD4]">Dạy học theo quy định</th>
                                    <th className="py-2 px-3 text-left text-[11px] font-semibold text-teal-100">Xếp loại gần nhất</th>
                                    <th className="py-2 px-3 text-right text-[11px] font-semibold text-teal-100">Phiếu chờ duyệt</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white">
                                  {d.teachers.map((t) => (
                                    <tr key={t.teacherId} className="hover:bg-[#F8FAFC]">
                                      <td className="py-2.5 px-3">
                                        <div className="font-medium text-slate-900">{t.teacherName}</div>
                                        <div className="text-[11px] text-slate-500">{t.teacherCode}</div>
                                      </td>
                                      <td className="py-2.5 px-3 text-right text-slate-700">
                                        {t.observedLessons}/{t.plannedLessons}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span
                                          className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-medium ${
                                            t.status === "OBSERVED"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : "bg-amber-50 text-amber-700 border-amber-200"
                                          }`}
                                        >
                                          {t.status === "OBSERVED" ? "Đã dự giờ" : "Chưa được dự giờ"}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3">
                                        {t.compliantStatus === "COMPLIANT" ? (
                                          <span className="text-emerald-700 font-medium">Đáp ứng quy định</span>
                                        ) : t.compliantStatus === "NON_COMPLIANT" ? (
                                          <span className="text-rose-700 font-medium">Cần hỗ trợ điều chỉnh</span>
                                        ) : (
                                          <span className="text-slate-400">Chưa có phiếu duyệt</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-700">{t.latestRating}</td>
                                      <td className="py-2.5 px-3 text-right text-rose-700">{t.pendingForms}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
