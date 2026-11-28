"use client"

import React, { useState } from "react"
import * as XLSX from "xlsx"
import { Building2, Download, FileSpreadsheet, Users, Users2 } from "lucide-react"
import type {
  GroupReportSummaryRow,
  TeacherOverviewRow,
  TeacherQualityWorkspaceResponse,
} from "@/lib/teacher-quality/types"
import { coachingStatusLabelVi } from "@/lib/teacher-quality/recognitionEngine"

interface ReportsTabProps {
  data: TeacherQualityWorkspaceResponse | null
  onOpenProfile: (teacher: TeacherOverviewRow) => void
}

type ReportViewMode = "by-teacher" | "by-campus" | "by-department"

export function ReportsTab({ data, onOpenProfile }: ReportsTabProps) {
  const [mode, setMode] = useState<ReportViewMode>("by-teacher")

  const overviewRows = data?.overviewRows || []
  const byCampus = data?.reports.byCampus || []
  const byDepartment = data?.reports.byDepartment || []

  const handleExportWorkbook = () => {
    if (!data) return
    const wb = XLSX.utils.book_new()

    // Sheet 1: Báo cáo chi tiết theo GV (Cuối năm)
    const sheetTeacher = overviewRows.map((r, idx) => ({
      STT: idx + 1,
      "Mã GV": r.teacherCode,
      "Họ tên GV": r.teacherName,
      "Thâm niên Sky-Line": r.seniorityLabel,
      "Cơ sở": r.campusName,
      "Tổ chuyên môn": r.departmentName,
      "Khen thưởng Sở, ngành": r.deptAwardCount,
      "Khen thưởng hệ thống": r.systemAwardCount,
      "Bồi dưỡng HS các kỳ thi": r.studentCompetitionCount,
      "NPS GVCN": r.npsGvcnScore !== null ? `${r.npsGvcnScore} (${r.npsGvcnResponses} PH)` : "—",
      "NPS GVBM": r.npsGvbmScore !== null ? `${r.npsGvbmScore} (${r.npsGvbmResponses} PH)` : "—",
      "Ứng dụng AI & CN": r.aiTechCount,
      [`Dự giờ ${data.monthLabel} (Dạy được dự)`]: r.monthTaughtObserved,
      [`Dự giờ ${data.monthLabel} (Đi dự)`]: r.monthObservedDisplay,
      "Tình trạng đi dự giờ": r.observingCompliance.label,
      "Dạy học theo quy định": r.teachingCompliance.label,
      "Lịch sử dự giờ năm học": r.monthlyHistory
        .map((h) => `${h.monthLabel}: dạy ${h.taughtObserved}, dự ${h.observed}`)
        .join(" | "),
      "Bồi dưỡng (Hoàn thành / Tổng)": `${r.coachingCompletedCount}/${r.coachingTotalCount}`,
      "Bồi dưỡng quá hạn": r.coachingOverdueCount,
      "Ghi nhận áp dụng sau bồi dưỡng": r.latestApplicationSummary || "—",
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetTeacher), "Chi_tiet_GV")

    // Sheet 2: Tổng hợp theo Cơ sở
    const mapGroupRows = (rows: GroupReportSummaryRow[], label: string) =>
      rows.map((g, idx) => ({
        STT: idx + 1,
        [label]: g.groupName,
        "Số GV": g.teacherCount,
        "Khen thưởng Sở/ngành": g.deptAwardCount,
        "Khen thưởng hệ thống": g.systemAwardCount,
        "Kết quả BD HS thi (đã lọc trùng)": g.dedupStudentCompetitionCount,
        "Ứng dụng AI & CN": g.aiTechCount,
        "NPS TB": g.avgNpsScore !== null ? g.avgNpsScore : "—",
        "Đủ ĐM đi dự": g.observedCompliantCount,
        "Chưa dự giờ": g.observedUnobservedCount,
        "Còn thiếu tiết": g.observedShortfallCount,
        "Chưa có ĐM": g.observedNoQuotaCount,
        "Dạy học cần bồi dưỡng": g.teachingNeedsCoachingCount,
        "Bồi dưỡng hoàn thành / Tổng": `${g.coachingCompleted}/${g.coachingTotal}`,
        "Bồi dưỡng quá hạn": g.coachingOverdue,
      }))

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(mapGroupRows(byCampus, "Cơ sở")),
      "Tong_hop_Co_so"
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(mapGroupRows(byDepartment, "Tổ chuyên môn")),
      "Tong_hop_To_CM"
    )

    // Sheet 4: Danh sách Bồi dưỡng & Áp dụng
    const sheetCoaching = (data.coachingPlans || []).map((c, idx) => ({
      STT: idx + 1,
      "Mã GV": c.teacherCode,
      "Họ tên GV": c.teacherName,
      "Cơ sở": c.campusName,
      "Tổ chuyên môn": c.departmentName,
      "Hình thức": c.activityType || "—",
      "Nhu cầu": c.improvementNeeds,
      "Hoạt động bồi dưỡng": c.developmentActivity,
      "Người hỗ trợ": c.mentorName || "—",
      "Thời hạn": c.dueDate ? new Date(c.dueDate).toLocaleDateString("vi-VN") : "—",
      "Trạng thái": coachingStatusLabelVi(c.status),
      "Áp dụng vào dạy học": c.applicationNotes || "—",
      "Cần hỗ trợ tiếp": c.nextSupportNeeds || "—",
      "Phiếu dự giờ tiếp theo": c.followUpObservation
        ? `${c.followUpObservation.actualDateVi} (${c.followUpObservation.overallRating || "Đã dự"})`
        : "—",
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetCoaching), "Boi_duong_Ap_dung")

    const fileName = `Bao_cao_Thanh_tich_Boi_duong_GV_${data.academicYear.name.replace(/[^a-zA-Z0-9-]/g, "_")}_${data.month}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const renderGroupTable = (rows: GroupReportSummaryRow[], groupHeader: string) => (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[#003B3A] border-b border-[#003B3A]">
            <tr>
              <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                {groupHeader}
              </th>
              <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                Số GV
              </th>
              <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                Khen thưởng (Sở / HT)
              </th>
              <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                BD HS thi (lọc trùng)
              </th>
              <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                AI & CN
              </th>
              <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                NPS TB
              </th>
              <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                Dự giờ tháng (Đủ / Chưa / Thiếu)
              </th>
              <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                Bồi dưỡng (HT / Tổng / Quá hạn)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500">
                  Chưa có dữ liệu tổng hợp theo bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              rows.map((g) => (
                <tr key={g.groupId} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                  <td className="py-3 px-3 font-semibold text-[#003B3A]">{g.groupName}</td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-800">
                    {g.teacherCount}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-700">
                    {g.deptAwardCount} / {g.systemAwardCount}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-[#00736E]">
                    {g.dedupStudentCompetitionCount}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-700">{g.aiTechCount}</td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-800">
                    {g.avgNpsScore !== null
                      ? g.avgNpsScore > 0
                        ? `+${g.avgNpsScore}`
                        : g.avgNpsScore
                      : "—"}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-semibold text-emerald-700">{g.observedCompliantCount}</span>
                    <span className="text-slate-400"> / </span>
                    <span className="font-semibold text-rose-700">{g.observedUnobservedCount}</span>
                    <span className="text-slate-400"> / </span>
                    <span className="font-semibold text-amber-700">{g.observedShortfallCount}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-semibold text-emerald-700">{g.coachingCompleted}</span>
                    <span className="text-slate-400"> / {g.coachingTotal}</span>
                    {g.coachingOverdue > 0 && (
                      <span className="ml-1.5 rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                        {g.coachingOverdue} quá hạn
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Report Mode Switcher & Excel Export */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "by-teacher" as const, label: "Báo cáo chi tiết theo GV (Cuối năm)", icon: Users },
            { key: "by-campus" as const, label: "Tổng hợp theo cơ sở", icon: Building2 },
            { key: "by-department" as const, label: "Tổng hợp theo tổ chuyên môn", icon: Users2 },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMode(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === tab.key
                    ? "bg-[#003B3A] text-white"
                    : "bg-[#F8FAFC] text-slate-600 border border-[#E2E8F0] hover:bg-[#F0FDFA] hover:text-[#00736E]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={handleExportWorkbook}
          disabled={!data || overviewRows.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#003B3A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#005250] disabled:opacity-50 transition-colors"
        >
          <Download className="h-3.5 w-3.5 text-[#5EEAD4]" />
          Xuất Excel báo cáo (4 sheet)
        </button>
      </div>

      {mode === "by-teacher" ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                    Họ tên GV · Thâm niên Sky-Line
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    5 nhóm Vinh danh & Ghi nhận
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Lịch sử dự giờ theo tháng
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4]">
                    Kết quả áp dụng sau bồi dưỡng
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {overviewRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500">
                      Không có dữ liệu báo cáo cho bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  overviewRows.map((row) => (
                    <tr key={row.teacherId} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 align-middle min-w-[210px]">
                        <button
                          type="button"
                          onClick={() => onOpenProfile(row)}
                          className="font-semibold text-[#003B3A] hover:text-[#008B85] hover:underline text-left"
                        >
                          {row.teacherName}
                        </button>
                        <div className="text-[11px] text-[#00736E] font-medium mt-0.5">
                          Thâm niên: {row.seniorityLabel}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {row.campusName} · {row.departmentName}
                        </div>
                      </td>

                      <td className="py-3 px-3 align-middle min-w-[230px]">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-slate-700">
                          <span>Sở, ngành: <strong>{row.deptAwardCount}</strong></span>
                          <span>Hệ thống: <strong>{row.systemAwardCount}</strong></span>
                          <span>BD HS thi: <strong>{row.studentCompetitionCount}</strong></span>
                          <span>AI & CN: <strong>{row.aiTechCount}</strong></span>
                          <span>
                            NPS GVCN:{" "}
                            <strong>
                              {row.npsGvcnScore !== null ? `${row.npsGvcnScore}` : "—"}
                            </strong>
                          </span>
                          <span>
                            NPS GVBM:{" "}
                            <strong>
                              {row.npsGvbmScore !== null ? `${row.npsGvbmScore}` : "—"}
                            </strong>
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 align-middle min-w-[240px]">
                        {row.monthlyHistory.length === 0 ? (
                          <span className="text-slate-400">Chưa có lượt dự giờ</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {row.monthlyHistory.slice(-4).map((h) => (
                              <span
                                key={h.monthKey}
                                className="rounded bg-[#F8FAFC] border border-[#E2E8F0] px-1.5 py-0.5 text-[10px] text-slate-700"
                              >
                                <strong>{h.monthLabel}:</strong> dạy {h.taughtObserved} · dự {h.observed}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 align-middle min-w-[220px]">
                        <div className="text-[11px] text-slate-700">
                          Hoàn thành: <strong className="text-emerald-700">{row.coachingCompletedCount}</strong>/
                          <strong>{row.coachingTotalCount}</strong> nhiệm vụ
                        </div>
                        {row.latestApplicationSummary ? (
                          <div className="mt-1 text-[11px] text-slate-600 line-clamp-2">
                            {row.latestApplicationSummary}
                          </div>
                        ) : (
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            Chưa có ghi nhận áp dụng
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-[11px] text-slate-500 flex items-center gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#008B85]" />
            <span>
              Các chỉ số được trình bày riêng biệt nhằm phục vụ nhận xét cuối năm về chất lượng dạy học và sự tiến bộ chuyên môn của giáo viên.
            </span>
          </div>
        </div>
      ) : mode === "by-campus" ? (
        renderGroupTable(byCampus, "Cơ sở")
      ) : (
        renderGroupTable(byDepartment, "Tổ chuyên môn")
      )}
    </div>
  )
}
