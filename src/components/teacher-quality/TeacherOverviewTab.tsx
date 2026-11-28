"use client"

import React from "react"
import {
  AlertTriangle,
  Award,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Users,
} from "lucide-react"
import type {
  ComplianceStatusItem,
  TeacherOverviewRow,
  TeacherQualityWorkspaceResponse,
} from "@/lib/teacher-quality/types"

interface TeacherOverviewTabProps {
  data: TeacherQualityWorkspaceResponse | null
  loading: boolean
  onOpenProfile: (teacher: TeacherOverviewRow) => void
  onJumpToUnobserved: () => void
  onJumpToShortfall: () => void
  onJumpToOverdueCoaching: () => void
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

export function TeacherOverviewTab({
  data,
  loading,
  onOpenProfile,
  onJumpToUnobserved,
  onJumpToShortfall,
  onJumpToOverdueCoaching,
}: TeacherOverviewTabProps) {
  const summary = data?.overviewSummary
  const rows = data?.overviewRows || []

  return (
    <div className="space-y-4">
      {/* Unified Ledger Summary Strip */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0] rounded-2xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden tabular-nums">
          <div className="p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <Users className="h-3.5 w-3.5 text-[#008B85]" />
              <span>Giáo viên theo dõi</span>
            </div>
            <div className="mt-1 text-xl font-bold text-[#003B3A]">{summary.totalTeachers}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Năm học {data?.academicYear.name}
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <Award className="h-3.5 w-3.5 text-[#00A19A]" />
              <span>Vinh danh & Ghi nhận</span>
            </div>
            <div className="mt-1 text-xl font-bold text-[#003B3A]">{summary.totalRecognitions}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {summary.dedupStudentCompetitions} kết quả HS (đã lọc trùng)
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Đủ định mức dự giờ</span>
            </div>
            <div className="mt-1 text-xl font-bold text-emerald-700">
              {summary.observedCompliantCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {data?.monthLabel} · {summary.noQuotaCount} chưa có ĐM
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <ClipboardCheck className="h-3.5 w-3.5 text-rose-600" />
              <span>Chưa dự / Còn thiếu tiết</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <button
                type="button"
                onClick={onJumpToUnobserved}
                className="text-xl font-bold text-rose-700 hover:underline"
                title="Xem danh sách GV chưa dự giờ"
              >
                {summary.unobservedCount}
              </button>
              <button
                type="button"
                onClick={onJumpToShortfall}
                className="text-xs font-semibold text-amber-700 hover:underline"
                title="Xem danh sách GV còn thiếu tiết"
              >
                +{summary.shortfallCount} thiếu tiết
              </button>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Bấm số để lọc nhanh</div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <BookOpenCheck className="h-3.5 w-3.5 text-[#008B85]" />
              <span>Bồi dưỡng chuyên môn</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-[#00736E]">{summary.coachingActiveCount}</span>
              <span className="text-[11px] text-slate-500">đang mở</span>
              {summary.coachingOverdueCount > 0 && (
                <button
                  type="button"
                  onClick={onJumpToOverdueCoaching}
                  className="inline-flex items-center gap-0.5 rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {summary.coachingOverdueCount} quá hạn
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {summary.coachingCompletedCount} đã hoàn thành
            </div>
          </div>
        </div>
      )}

      {/* Sky-Line Academic Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                  Họ tên GV · Thâm niên Sky-Line
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                  Cơ sở · Tổ chuyên môn
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                  Tóm tắt thành tích & NPS
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4]">
                  Tình trạng dự giờ ({data?.monthLabel || "Tháng hiện tại"})
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4]">
                  Bồi dưỡng đang thực hiện
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin text-[#00A19A] mx-auto mb-2" />
                    Đang tải hồ sơ giáo viên...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Không tìm thấy giáo viên phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.teacherId} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                    {/* Họ tên GV + Thâm niên Sky-Line ngay sau họ tên */}
                    <td className="py-3 px-3 align-middle min-w-[240px]">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenProfile(row)}
                          className="font-semibold text-[#003B3A] hover:text-[#008B85] hover:underline text-left"
                        >
                          {row.teacherName}
                        </button>
                        <span className="rounded-md bg-[#F0FDFA] border border-[#CCFBF1] px-1.5 py-0.5 text-[10px] font-medium text-[#00736E]">
                          {row.seniorityLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {row.teacherCode} · {row.positions.join(", ")}
                      </div>
                    </td>

                    {/* Cơ sở · Tổ CM */}
                    <td className="py-3 px-3 align-middle min-w-[170px]">
                      <div className="font-medium text-slate-800">{row.campusName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{row.departmentName}</div>
                    </td>

                    {/* Tóm tắt thành tích 5 nhóm */}
                    <td className="py-3 px-3 align-middle min-w-[210px]">
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 text-slate-700">
                          Khen thưởng:{" "}
                          <strong className="text-[#003B3A]">
                            {row.deptAwardCount + row.systemAwardCount}
                          </strong>
                        </span>
                        <span className="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 text-slate-700">
                          BD HS thi:{" "}
                          <strong className="text-[#003B3A]">{row.studentCompetitionCount}</strong>
                        </span>
                        <span className="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 text-slate-700">
                          AI/CN: <strong className="text-[#003B3A]">{row.aiTechCount}</strong>
                        </span>
                      </div>
                      {(row.npsGvcnScore !== null || row.npsGvbmScore !== null) && (
                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[#00736E]">
                          {row.npsGvcnScore !== null && (
                            <span>
                              NPS GVCN: <strong>{row.npsGvcnScore > 0 ? `+${row.npsGvcnScore}` : row.npsGvcnScore}</strong> ({row.npsGvcnResponses})
                            </span>
                          )}
                          {row.npsGvbmScore !== null && (
                            <span>
                              NPS GVBM: <strong>{row.npsGvbmScore > 0 ? `+${row.npsGvbmScore}` : row.npsGvbmScore}</strong> ({row.npsGvbmResponses})
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Tình trạng dự giờ tháng */}
                    <td className="py-3 px-3 align-middle min-w-[220px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${toneClass(
                            row.observingCompliance.tone
                          )}`}
                        >
                          Đi dự: {row.observingCompliance.label}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({row.monthObservedDisplay})
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${toneClass(
                            row.teachingCompliance.tone
                          )}`}
                        >
                          Dạy học: {row.teachingCompliance.label}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({row.monthTaughtObserved} tiết được dự)
                        </span>
                      </div>
                    </td>

                    {/* Bồi dưỡng đang thực hiện */}
                    <td className="py-3 px-3 align-middle min-w-[180px]">
                      {row.coachingTotalCount === 0 ? (
                        <span className="text-slate-400">Chưa có nhiệm vụ</span>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-[#003B3A]">
                              {row.coachingActiveCount} đang mở
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-emerald-700 font-medium">
                              {row.coachingCompletedCount} hoàn thành
                            </span>
                          </div>
                          {row.coachingOverdueCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                              <AlertTriangle className="h-3 w-3" />
                              {row.coachingOverdueCount} quá hạn
                            </span>
                          )}
                          {row.coachingOverdueCount === 0 && row.coachingDueSoonCount > 0 && (
                            <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              {row.coachingDueSoonCount} sắp đến hạn
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Bấm vào tên giáo viên để mở Hồ sơ giáo viên theo năm học.</span>
          <span className="tabular-nums font-medium text-slate-600">{rows.length} giáo viên</span>
        </div>
      </div>
    </div>
  )
}
