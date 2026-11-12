"use client"

import React, { useState } from "react"
import Link from "next/link"
import { TimetableShell, VERSION_STATUS_BADGE } from "@/components/timetable/TimetableShell"
import { TimetableFilterBar } from "@/components/timetable/TimetableFilterBar"
import { ValidationSummaryPanel } from "@/components/timetable/ValidationSummaryPanel"
import { useTimetableFilterNavigation } from "@/components/timetable/useTimetableFilterNavigation"
import { getTimetableOverviewAction } from "./actions"

type OverviewData = Extract<
  Awaited<ReturnType<typeof getTimetableOverviewAction>>,
  { success: true }
>

type DrilldownKey =
  | "VERSIONS"
  | "UNDER_SCHEDULED"
  | "MISSING_ASSIGNMENTS"
  | "CONFLICTS"
  | "LEGACY_AUDIT"

export function OverviewClient({ initialData }: { initialData: OverviewData }) {
  const { data, loading, errorMessage, reloadWithPatch } =
    useTimetableFilterNavigation<OverviewData>(initialData, getTimetableOverviewAction)
  const [activeDrilldown, setActiveDrilldown] = useState<DrilldownKey>("VERSIONS")

  const { metrics, filterContext, versionSummaries, drilldowns, validationReport } = data

  const buildPageHref = (subPath: string, versionId?: string) => {
    const qs = new URLSearchParams()
    if (filterContext.selectedYearId) qs.set("academicYearId", filterContext.selectedYearId)
    qs.set("semester", String(filterContext.semester))
    if (filterContext.selectedScopeGroup !== "LIEN_CAP") {
      qs.set("scopeGroup", filterContext.selectedScopeGroup)
    }
    if (filterContext.selectedCampusId) qs.set("campusId", filterContext.selectedCampusId)
    if (versionId || filterContext.selectedVersionId) {
      qs.set("versionId", versionId || filterContext.selectedVersionId)
    }
    return `${subPath}?${qs.toString()}`
  }

  return (
    <TimetableShell
      title="Tổng quan thời khóa biểu"
      subtitle="Theo dõi phiên bản hiệu lực, tiến độ xếp tiết theo định mức, xung đột ràng buộc và tính toàn vẹn dữ liệu thực tế"
      activeTabCode="OVERVIEW"
      headerActions={
        <>
          <Link
            href={buildPageHref("/admin/thoi-khoa-bieu/xep-lich")}
            className="px-3.5 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold hover:bg-[#005250] transition-colors"
          >
            Mở trang xếp lịch
          </Link>
          <Link
            href={buildPageHref("/admin/thoi-khoa-bieu/ban-hanh")}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#003B3A] text-xs font-semibold hover:bg-[#F8FAFC] transition-colors"
          >
            Duyệt & ban hành
          </Link>
        </>
      }
    >
      <TimetableFilterBar
        context={filterContext}
        onChange={reloadWithPatch}
        loading={loading}
        showGradeAndClass={false}
      />

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-[#E11D48] rounded-2xl px-4 py-3 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Unified Academic Ledger KPI Strip (Interactive Drill-down Selectors) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 tabular-nums">
        <button
          type="button"
          onClick={() => setActiveDrilldown("VERSIONS")}
          className={`text-left bg-white rounded-2xl border p-4 shadow-xs transition-colors cursor-pointer ${
            activeDrilldown === "VERSIONS"
              ? "border-[#00A19A] bg-[#F0FDFA]/50"
              : "border-[#E2E8F0] hover:bg-[#F8FAFC]"
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500">Phiên bản lịch toàn phạm vi</p>
          <p className="text-xl font-bold text-[#003B3A] mt-1">
            {metrics.publishedCount} đang áp dụng
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {metrics.draftCount} bản nháp • {metrics.pendingApprovalCount} chờ duyệt
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveDrilldown("UNDER_SCHEDULED")}
          className={`text-left bg-white rounded-2xl border p-4 shadow-xs transition-colors cursor-pointer ${
            activeDrilldown === "UNDER_SCHEDULED"
              ? "border-[#00A19A] bg-[#F0FDFA]/50"
              : "border-[#E2E8F0] hover:bg-[#F8FAFC]"
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500">Tiến độ xếp tiết / tuần</p>
          <p className="text-xl font-bold text-[#003B3A] mt-1">
            {metrics.scheduledWeeklyTotal} / {metrics.requiredWeeklyTotal} tiết
          </p>
          <p
            className={`text-xs font-semibold mt-1 ${
              metrics.missingWeeklyTotal > 0 ? "text-[#D97706]" : "text-[#059669]"
            }`}
          >
            {metrics.missingWeeklyTotal > 0
              ? `Còn thiếu ${metrics.missingWeeklyTotal} tiết/tuần`
              : "Đạt đủ định mức tuần"}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveDrilldown("MISSING_ASSIGNMENTS")}
          className={`text-left bg-white rounded-2xl border p-4 shadow-xs transition-colors cursor-pointer ${
            activeDrilldown === "MISSING_ASSIGNMENTS"
              ? "border-[#00A19A] bg-[#F0FDFA]/50"
              : "border-[#E2E8F0] hover:bg-[#F8FAFC]"
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500">Phân công giảng dạy</p>
          <p
            className={`text-xl font-bold mt-1 ${
              metrics.missingAssignmentCount > 0 ? "text-[#D97706]" : "text-[#059669]"
            }`}
          >
            {metrics.missingAssignmentCount} môn-lớp thiếu GV
          </p>
          <p className="text-xs text-slate-600 mt-1">Nhấn để mở danh sách bổ sung</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveDrilldown("CONFLICTS")}
          className={`text-left bg-white rounded-2xl border p-4 shadow-xs transition-colors cursor-pointer ${
            activeDrilldown === "CONFLICTS"
              ? "border-[#00A19A] bg-[#F0FDFA]/50"
              : "border-[#E2E8F0] hover:bg-[#F8FAFC]"
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500">Xung đột bắt buộc</p>
          <p
            className={`text-xl font-bold mt-1 ${
              metrics.conflictCount > 0 ? "text-[#E11D48]" : "text-[#059669]"
            }`}
          >
            {metrics.conflictCount} vi phạm
          </p>
          <p className="text-xs text-slate-600 mt-1">Kiểm tra GV, phòng, di chuyển, tiết khóa</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveDrilldown("LEGACY_AUDIT")}
          className={`text-left bg-white rounded-2xl border p-4 shadow-xs transition-colors cursor-pointer ${
            activeDrilldown === "LEGACY_AUDIT"
              ? "border-[#00A19A] bg-[#F0FDFA]/50"
              : "border-[#E2E8F0] hover:bg-[#F8FAFC]"
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500">Rà soát dữ liệu lịch cũ</p>
          <p
            className={`text-xl font-bold mt-1 ${
              metrics.legacyAnomalyCount > 0 ? "text-[#D97706]" : "text-[#059669]"
            }`}
          >
            {metrics.legacyAnomalyCount} cảnh báo
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Trên {drilldowns.totalLegacyUnversionedRows} bản ghi chưa gắn phiên bản
          </p>
        </button>
      </div>

      {/* Shared Validation Summary */}
      <ValidationSummaryPanel report={validationReport} />

      {/* Drill-down Table Section */}
      {activeDrilldown === "VERSIONS" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#003B3A]">
              Danh sách phiên bản lịch (Đang áp dụng, chờ duyệt & bản nháp)
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">
              Tổng cộng: {versionSummaries.length} phiên bản
            </span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                  Mã phiên bản
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                  Tên phiên bản
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                  Cơ sở & Bộ TKB
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                  Khoảng hiệu lực
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">
                  Trạng thái
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {versionSummaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-slate-500">
                    Chưa có phiên bản thời khóa biểu nào trong năm học và học kỳ này. Hãy mở trang{" "}
                    <Link
                      href={buildPageHref("/admin/thoi-khoa-bieu/xep-lich")}
                      className="text-[#008B85] font-semibold underline"
                    >
                      Xếp thời khóa biểu
                    </Link>{" "}
                    để khởi tạo phương án nháp đầu tiên.
                  </td>
                </tr>
              ) : (
                versionSummaries.map((v) => {
                  const st = VERSION_STATUS_BADGE[v.status] || {
                    label: v.status,
                    className: "bg-slate-100 text-slate-700",
                  }
                  return (
                    <tr key={v.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 align-middle font-mono text-[11px] text-slate-700">
                        {v.code}
                      </td>
                      <td className="py-3 px-3 align-middle font-semibold text-slate-900">
                        {v.name}
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-600">
                        {v.campusName} • {v.scopeGroup}
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-600">
                        {v.effectiveFrom || "Chưa đặt"} → {v.effectiveTo || "Cuối kỳ"}
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${st.className}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap space-x-2">
                        <Link
                          href={`/admin/thoi-khoa-bieu/xep-lich?academicYearId=${filterContext.selectedYearId}&semester=${filterContext.semester}&scopeGroup=${v.scopeGroup}&campusId=${v.campusId}&versionId=${v.id}`}
                          className="text-[#008B85] hover:text-[#003B3A] font-semibold"
                        >
                          Mở ma trận
                        </Link>
                        <Link
                          href={`/admin/thoi-khoa-bieu/ban-hanh?academicYearId=${filterContext.selectedYearId}&semester=${filterContext.semester}&scopeGroup=${v.scopeGroup}&campusId=${v.campusId}&versionId=${v.id}`}
                          className="text-slate-600 hover:text-[#003B3A] font-semibold"
                        >
                          Quy trình duyệt
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeDrilldown === "UNDER_SCHEDULED" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#003B3A]">
              Danh sách môn - lớp còn thiếu tiết so với định mức ({drilldowns.underScheduled.length})
            </h2>
            <Link
              href={buildPageHref("/admin/thoi-khoa-bieu/phan-cong")}
              className="text-xs font-semibold text-[#008B85] hover:underline"
            >
              Mở Định mức & Phân công
            </Link>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Lớp</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Hệ CT</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Môn học</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Giáo viên</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 text-right">
                  Yêu cầu / tuần
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 text-right">
                  Đã xếp
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] text-right">
                  Còn thiếu
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {drilldowns.underScheduled.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center text-[#059669] font-medium">
                    Không có môn - lớp nào thiếu tiết trong phạm vi đang chọn.
                  </td>
                </tr>
              ) : (
                drilldowns.underScheduled.map((u, idx) => (
                  <tr key={idx} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3 align-middle font-semibold text-slate-900">
                      {u.className}
                    </td>
                    <td className="py-3 px-3 align-middle text-slate-600">{u.studyProgram}</td>
                    <td className="py-3 px-3 align-middle text-slate-800">{u.subjectName}</td>
                    <td className="py-3 px-3 align-middle text-slate-600">
                      {u.primaryTeacherName ? (
                        `${u.primaryTeacherName} (${u.primaryTeacherCode})`
                      ) : (
                        <span className="text-[#E11D48] font-semibold">Chưa phân công GV</span>
                      )}
                    </td>
                    <td className="py-3 px-3 align-middle text-right">{u.weeklyQuota}</td>
                    <td className="py-3 px-3 align-middle text-right">
                      {u.scheduledWeeklyEquivalent}
                    </td>
                    <td className="py-3 px-3 align-middle text-right font-bold text-[#D97706]">
                      {u.missingWeeklyPeriods}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeDrilldown === "MISSING_ASSIGNMENTS" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#003B3A]">
              Danh sách môn có định mức nhưng chưa phân công giáo viên ({drilldowns.missingAssignments.length})
            </h2>
            <Link
              href={buildPageHref("/admin/thoi-khoa-bieu/phan-cong")}
              className="text-xs font-semibold text-[#008B85] hover:underline"
            >
              Gán giáo viên ngay
            </Link>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Lớp</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Khối</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Hệ đào tạo</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Môn học</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] text-right">
                  Định mức (tiết/tuần)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {drilldowns.missingAssignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-[#059669] font-medium">
                    Tất cả môn học có định mức trong phạm vi đã được phân công giáo viên.
                  </td>
                </tr>
              ) : (
                drilldowns.missingAssignments.map((m, idx) => (
                  <tr key={idx} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3 align-middle font-semibold text-slate-900">
                      {m.className}
                    </td>
                    <td className="py-3 px-3 align-middle text-slate-600">{m.grade}</td>
                    <td className="py-3 px-3 align-middle text-slate-600">{m.studyProgram}</td>
                    <td className="py-3 px-3 align-middle text-slate-800">{m.subjectName}</td>
                    <td className="py-3 px-3 align-middle text-right font-semibold text-[#D97706]">
                      {m.weeklyQuota}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeDrilldown === "CONFLICTS" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
          <div className="px-4 py-3 border-b border-[#E2E8F0]">
            <h2 className="text-xs font-bold text-[#003B3A]">
              Chi tiết xung đột và cảnh báo trên phiên bản đang chọn ({drilldowns.conflicts.length})
            </h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Mức độ</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Mã quy tắc</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Mô tả chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {drilldowns.conflicts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 px-4 text-center text-[#059669] font-medium">
                    Không phát hiện xung đột nào trên phiên bản đang chọn.
                  </td>
                </tr>
              ) : (
                drilldowns.conflicts.map((c, idx) => (
                  <tr key={idx} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3 align-middle whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          c.severity === "ERROR"
                            ? "bg-rose-50 text-[#E11D48] border border-rose-200"
                            : "bg-amber-50 text-[#D97706] border border-amber-200"
                        }`}
                      >
                        {c.severity === "ERROR" ? "Vi phạm bắt buộc" : "Cảnh báo"}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-middle font-mono text-[11px] text-slate-600">
                      {c.ruleCode}
                    </td>
                    <td className="py-3 px-3 align-middle text-slate-800">{c.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeDrilldown === "LEGACY_AUDIT" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
          <div className="px-4 py-3 border-b border-[#E2E8F0]">
            <h2 className="text-xs font-bold text-[#003B3A]">
              Rà soát dữ liệu lịch cũ chưa gắn phiên bản (Chỉ đọc — bảo toàn nguyên trạng, không tự suy đoán sửa)
            </h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Loại bất thường</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Diễn giải</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] text-right">
                  Số lượng
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Mẫu đối chiếu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {drilldowns.legacyAnomalies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center text-[#059669] font-medium">
                    Không có bất thường dữ liệu lịch cũ trong phạm vi quản lý.
                  </td>
                </tr>
              ) : (
                drilldowns.legacyAnomalies.map((an) => (
                  <tr key={an.anomalyType} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3 align-middle font-mono text-[11px] text-slate-700">
                      {an.anomalyType}
                    </td>
                    <td className="py-3 px-3 align-middle text-slate-800 font-medium">
                      {an.description}
                    </td>
                    <td className="py-3 px-3 align-middle text-right font-bold text-[#D97706]">
                      {an.count}
                    </td>
                    <td className="py-3 px-3 align-middle text-slate-600">
                      {an.sampleItems
                        .slice(0, 2)
                        .map((s) => `${s.className}: ${s.detail}`)
                        .join(" | ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </TimetableShell>
  )
}
