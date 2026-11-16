"use client"

import React, { useCallback, useEffect, useState } from "react"
import toast from "react-hot-toast"
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Unlock,
  X,
} from "lucide-react"
import type {
  WorkHubReportRecord,
  WorkHubReportScope,
  WorkHubReportSnapshotMetrics,
} from "@/lib/workhub/types"
import { exportWorkHubReportClient } from "@/lib/workhub/exportUtils"

const REPORT_STATUS_META: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Nháp", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  SUBMITTED: { label: "Đã gửi (Đã chốt nguồn)", cls: "bg-[#F0FDFA] text-[#00736E] border-teal-200" },
  NEEDS_REVISION: { label: "Yêu cầu bổ sung", cls: "bg-amber-50 text-[#D97706] border-amber-200" },
  APPROVED: { label: "Đã duyệt & Khóa", cls: "bg-emerald-50 text-[#059669] border-emerald-200" },
}

export default function WorkHubReportsPage() {
  const now = new Date()
  const [activeMode, setActiveMode] = useState<"LIST" | "COMPOSE">("LIST")
  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<any | null>(null)

  // Composer state
  const [editingReport, setEditingReport] = useState<WorkHubReportRecord | null>(null)
  const [reportScope, setReportScope] = useState<WorkHubReportScope>("INDIVIDUAL")
  const [periodType, setPeriodType] = useState<"WEEKLY" | "MONTHLY">("WEEKLY")
  const [year, setYear] = useState<number>(now.getFullYear())
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [weekNumber, setWeekNumber] = useState<number>(1)
  const [deptId, setDeptId] = useState<string>("")
  const [campusId, setCampusId] = useState<string>("")

  const [liveSnapshot, setLiveSnapshot] = useState<WorkHubReportSnapshotMetrics | null>(null)
  const [loadingSnapshot, setLoadingSnapshot] = useState<boolean>(false)

  // Qualitative fields (User cannot edit source counts!)
  const [executiveCommentary, setExecutiveCommentary] = useState<string>("")
  const [blockersAndCauses, setBlockersAndCauses] = useState<string>("")
  const [supportRequests, setSupportRequests] = useState<string>("")
  const [nextPeriodPlan, setNextPeriodPlan] = useState<string>("")
  const [savingReport, setSavingReport] = useState<boolean>(false)

  // AI Assist state
  const [aiLoading, setAiLoading] = useState<boolean>(false)
  const [aiAssistResult, setAiAssistResult] = useState<any | null>(null)

  // Review / New Version Modal
  const [selectedReport, setSelectedReport] = useState<WorkHubReportRecord | null>(null)
  const [reviewFeedbackInput, setReviewFeedbackInput] = useState<string>("")

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/workhub?resource=reports")
      const json = await res.json()
      if (json.success) {
        setData(json)
        if (!deptId && json.actor?.primaryDepartmentId) {
          setDeptId(json.actor.primaryDepartmentId)
        }
        if (!campusId && json.actor?.primaryCampusId) {
          setCampusId(json.actor.primaryCampusId)
        }
      } else {
        toast.error(json.error || "Không tải được danh sách báo cáo")
      }
    } finally {
      setLoading(false)
    }
  }, [deptId, campusId])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const loadLivePreview = useCallback(async () => {
    if (activeMode !== "COMPOSE") return
    setLoadingSnapshot(true)
    try {
      const qs = new URLSearchParams({
        resource: "report-preview",
        reportScope,
        periodType,
        year: String(year),
        month: String(month),
        weekNumber: String(weekNumber),
        departmentId: deptId,
        campusId,
      })
      const res = await fetch(`/api/workhub?${qs.toString()}`)
      const json = await res.json()
      if (json.success) {
        setLiveSnapshot(json.snapshot)
      }
    } finally {
      setLoadingSnapshot(false)
    }
  }, [activeMode, reportScope, periodType, year, month, weekNumber, deptId, campusId])

  useEffect(() => {
    loadLivePreview()
  }, [loadLivePreview])

  const handleOpenNewCompose = () => {
    setEditingReport(null)
    setExecutiveCommentary("")
    setBlockersAndCauses("")
    setSupportRequests("")
    setNextPeriodPlan("")
    setAiAssistResult(null)
    setActiveMode("COMPOSE")
  }

  const handleEditReport = (rep: WorkHubReportRecord) => {
    setEditingReport(rep)
    setReportScope(rep.reportScope)
    setPeriodType(rep.periodType)
    setYear(rep.year)
    setMonth(rep.month)
    setWeekNumber(rep.weekNumber || 1)
    setDeptId(rep.departmentId || "")
    setCampusId(rep.campusId || "")
    setExecutiveCommentary(rep.executiveCommentary)
    setBlockersAndCauses(rep.blockersAndCauses)
    setSupportRequests(rep.supportRequests)
    setNextPeriodPlan(rep.nextPeriodPlan)
    setLiveSnapshot(rep.snapshot)
    setAiAssistResult(null)
    setActiveMode("COMPOSE")
  }

  const handleSaveOrSubmit = async (submitNow: boolean) => {
    setSavingReport(true)
    try {
      const res = await fetch("/api/workhub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_OR_SUBMIT_REPORT",
          payload: {
            reportId: editingReport?.id,
            reportScope,
            periodType,
            year,
            month,
            weekNumber: periodType === "WEEKLY" ? weekNumber : null,
            academicYearId: data?.academicYears?.[0]?.id || null,
            departmentId: deptId || null,
            campusId: campusId || null,
            executiveCommentary,
            blockersAndCauses,
            supportRequests,
            nextPeriodPlan,
            submitNow,
          },
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(
          submitNow
            ? "Đã gửi báo cáo và đóng băng ảnh chụp số liệu nguồn tại thời điểm chốt"
            : "Đã lưu bản nháp báo cáo"
        )
        setActiveMode("LIST")
        await loadReports()
      } else {
        toast.error(json.error || "Không lưu được báo cáo")
      }
    } finally {
      setSavingReport(false)
    }
  }

  const handleRunAiAssist = async () => {
    setAiLoading(true)
    try {
      const res = await fetch("/api/workhub/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportScope,
          periodType,
          year,
          month,
          weekNumber,
          departmentId: deptId,
          campusId,
          executiveCommentary,
          blockersAndCauses,
          supportRequests,
          nextPeriodPlan,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setAiAssistResult(json)
        toast.success("Đã hoàn tất kiểm tra dữ liệu nguồn & gợi ý dự thảo")
      } else {
        toast.error(json.error || "Lỗi chạy AI hỗ trợ")
      }
    } finally {
      setAiLoading(false)
    }
  }

  const handleReviewOrRevise = async (
    reportId: string,
    action: "APPROVE" | "REQUEST_REVISION" | "CREATE_NEW_VERSION"
  ) => {
    const res = await fetch("/api/workhub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "REVIEW_OR_REVISE_REPORT",
        payload: {
          reportId,
          action,
          feedbackOrReason: reviewFeedbackInput,
        },
      }),
    })
    const json = await res.json()
    if (json.success) {
      toast.success(
        action === "APPROVE"
          ? "Đã phê duyệt và khóa báo cáo"
          : action === "REQUEST_REVISION"
          ? "Đã gửi yêu cầu bổ sung báo cáo"
          : `Đã tạo phiên bản điều chỉnh mới v${json.versionNumber}`
      )
      setSelectedReport(null)
      setReviewFeedbackInput("")
      await loadReports()
    } else {
      toast.error(json.error || "Không thực hiện được thao tác")
    }
  }

  const reports: WorkHubReportRecord[] = data?.reports || []
  const actor = data?.actor
  const canApprove =
    actor?.isExecutive || actor?.isDepartmentHead || actor?.isCampusHead

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="border-l-4 border-[#003B3A] pl-3">
          <h2 className="text-sm font-bold text-[#003B3A]">
            Báo cáo công việc Tuần / Tháng (Cá nhân & Phòng ban / Cơ sở)
          </h2>
          <p className="text-xs text-slate-500">
            Số liệu tự động tổng hợp từ nguồn thực tế (không sửa tay số liệu), lưu ảnh chụp khi gửi, khóa khi duyệt và xuất Word / PDF / Excel chuẩn tiếng Việt
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {activeMode === "COMPOSE" ? (
            <button
              type="button"
              onClick={() => setActiveMode("LIST")}
              className="px-3.5 py-2 rounded-xl font-semibold border border-[#E2E8F0] text-slate-700 bg-white"
            >
              ← Danh sách báo cáo
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenNewCompose}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold bg-[#003B3A] text-white hover:bg-[#005250]"
            >
              <Plus className="w-3.5 h-3.5" />
              Lập báo cáo mới
            </button>
          )}
        </div>
      </div>

      {activeMode === "LIST" ? (
        loading && !data ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-xs text-slate-500">
            Đang tải danh sách báo cáo...
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-2">
            <p className="text-sm font-bold text-[#003B3A]">Chưa có báo cáo tuần/tháng nào</p>
            <p className="text-xs text-slate-500">
              Nhấn &quot;Lập báo cáo mới&quot; để hệ thống tự động đề xuất dữ liệu công việc và KPI trong kỳ.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                      Mã & Cấp báo cáo
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                      Kỳ báo cáo & Người lập
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                      Số liệu chốt nguồn
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                      Trạng thái & Phiên bản
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                      Xuất tệp tiếng Việt
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {reports.map((rep) => {
                    const st = REPORT_STATUS_META[rep.status] || REPORT_STATUS_META.DRAFT
                    return (
                      <tr key={rep.id} className="hover:bg-[#F8FAFC] align-middle">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-bold text-[#003B3A] flex items-center gap-1.5">
                            {rep.reportCode}
                            {rep.isLocked && <Lock className="w-3 h-3 text-[#059669]" />}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {rep.reportScope === "INDIVIDUAL"
                              ? "Cá nhân"
                              : rep.reportScope === "DEPARTMENT"
                              ? `Phòng ban: ${rep.departmentName || ""}`
                              : `Cơ sở: ${rep.campusName || ""}`}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{rep.periodLabel}</div>
                          <div className="text-[11px] text-slate-500">Người lập: {rep.ownerName}</div>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="font-semibold text-[#059669]">
                            {rep.snapshot.completedInPeriodCount} HT
                          </span>{" "}
                          •{" "}
                          <span className="text-slate-700">
                            {rep.snapshot.inProgressAtCutoffCount} đang làm
                          </span>{" "}
                          •{" "}
                          <span
                            className={
                              rep.snapshot.overdueCount > 0
                                ? "font-bold text-[#E11D48]"
                                : "text-slate-400"
                            }
                          >
                            {rep.snapshot.overdueCount} quá hạn
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${st.cls}`}
                          >
                            {st.label} (v{rep.versionNumber})
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => exportWorkHubReportClient(rep, "WORD")}
                              className="px-2 py-1 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] font-semibold text-[#003B3A] hover:border-[#00A19A]"
                            >
                              Word
                            </button>
                            <button
                              type="button"
                              onClick={() => exportWorkHubReportClient(rep, "PDF")}
                              className="px-2 py-1 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] font-semibold text-[#003B3A] hover:border-[#00A19A]"
                            >
                              PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => exportWorkHubReportClient(rep, "EXCEL")}
                              className="px-2 py-1 rounded-md bg-[#F0FDFA] border border-teal-200 text-[11px] font-semibold text-[#00736E]"
                            >
                              Excel
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                          {!rep.isLocked && rep.ownerUserId === actor?.userId && (
                            <button
                              type="button"
                              onClick={() => handleEditReport(rep)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200"
                            >
                              Soạn / Gửi
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedReport(rep)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0]"
                          >
                            Xem & Duyệt
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Màn hình Soạn thảo Báo cáo + Snapshot tự động + AI Hỗ trợ 3 lớp */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 text-xs">
          <div className="xl:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Cấp báo cáo</label>
                <select
                  value={reportScope}
                  onChange={(e) => setReportScope(e.target.value as WorkHubReportScope)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-1.5 font-semibold text-[#003B3A]"
                >
                  <option value="INDIVIDUAL">Cá nhân</option>
                  {actor?.canViewOrgTracking && (
                    <>
                      <option value="DEPARTMENT">Phòng ban / Tổ CM</option>
                      <option value="CAMPUS">Cơ sở</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Loại kỳ</label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as any)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-1.5"
                >
                  <option value="WEEKLY">Báo cáo Tuần</option>
                  <option value="MONTHLY">Báo cáo Tháng</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Tháng / Năm</label>
                <div className="flex gap-1">
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="w-1/2 rounded-xl border border-[#E2E8F0] px-2 py-1.5"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        T{m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-1/2 rounded-xl border border-[#E2E8F0] px-2 py-1.5"
                  />
                </div>
              </div>

              {periodType === "WEEKLY" && (
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Tuần</label>
                  <select
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-1.5"
                  >
                    {[1, 2, 3, 4, 5].map((w) => (
                      <option key={w} value={w}>
                        Tuần {w}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Khối Dữ liệu Nguồn Tự động (Chỉ đọc - Không cho sửa tay) */}
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 space-y-2.5 tabular-nums">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#003B3A]">
                  Số liệu đề xuất tự động từ dữ liệu nguồn (Khóa sửa trực tiếp)
                </span>
                {loadingSnapshot && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00A19A]" />}
              </div>
              <p className="text-[11px] text-slate-500">
                Muốn cập nhật con số thống kê, vui lòng cập nhật trạng thái/nghiệm thu ngay trên công việc gốc.
              </p>

              {liveSnapshot && (
                <>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="rounded-lg bg-white border border-[#E2E8F0] p-2">
                      <div className="text-[10px] text-slate-500">Tổng việc lá</div>
                      <div className="text-sm font-bold text-[#003B3A]">
                        {liveSnapshot.totalCanonicalTasks}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white border border-[#E2E8F0] p-2">
                      <div className="text-[10px] text-slate-500">Hoàn thành</div>
                      <div className="text-sm font-bold text-[#059669]">
                        {liveSnapshot.completedInPeriodCount}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white border border-[#E2E8F0] p-2">
                      <div className="text-[10px] text-slate-500">Đang làm</div>
                      <div className="text-sm font-bold text-slate-700">
                        {liveSnapshot.inProgressAtCutoffCount}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white border border-[#E2E8F0] p-2">
                      <div className="text-[10px] text-slate-500">Quá hạn</div>
                      <div className="text-sm font-bold text-[#E11D48]">
                        {liveSnapshot.overdueCount}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white border border-[#E2E8F0] p-2">
                      <div className="text-[10px] text-slate-500">Phát sinh</div>
                      <div className="text-sm font-bold text-[#D97706]">
                        {liveSnapshot.adhocCount}
                      </div>
                    </div>
                  </div>

                  {liveSnapshot.submissionRollup && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-slate-800">
                      <strong>Tình hình gửi báo cáo đơn vị:</strong> Đã gửi{" "}
                      {liveSnapshot.submissionRollup.submittedUsersCount}/
                      {liveSnapshot.submissionRollup.expectedUsersCount} nhân sự.{" "}
                      {liveSnapshot.submissionRollup.missingUsers.length > 0 && (
                        <span>
                          Chưa gửi (không quy về 0):{" "}
                          <strong>
                            {liveSnapshot.submissionRollup.missingUsers
                              .map((u) => u.fullName)
                              .join(", ")}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Phần diễn giải của người lập báo cáo */}
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  1. Diễn giải kết quả thực hiện & sản phẩm đầu ra nổi bật
                </label>
                <textarea
                  rows={3}
                  value={executiveCommentary}
                  onChange={(e) => setExecutiveCommentary(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  placeholder="Bổ sung thuyết minh cho các công việc đã thực hiện..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  2. Vướng mắc & Nguyên nhân
                </label>
                <textarea
                  rows={2}
                  value={blockersAndCauses}
                  onChange={(e) => setBlockersAndCauses(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  3. Nội dung kiến nghị Lãnh đạo hỗ trợ / tháo gỡ
                </label>
                <textarea
                  rows={2}
                  value={supportRequests}
                  onChange={(e) => setSupportRequests(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  4. Kế hoạch trọng tâm kỳ tiếp theo
                </label>
                <textarea
                  rows={3}
                  value={nextPeriodPlan}
                  onChange={(e) => setNextPeriodPlan(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                disabled={savingReport}
                onClick={() => handleSaveOrSubmit(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0]"
              >
                <Save className="w-3.5 h-3.5" />
                Lưu bản nháp
              </button>

              <button
                type="button"
                disabled={savingReport}
                onClick={() => handleSaveOrSubmit(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold bg-[#003B3A] text-white hover:bg-[#005250]"
              >
                <Send className="w-3.5 h-3.5" />
                Gửi báo cáo & Chốt ảnh chụp dữ liệu
              </button>
            </div>
          </div>

          {/* Cột Phải (5/12): AI Hỗ trợ Báo cáo & Kiểm tra Minh chứng / Số liệu (Section 9) */}
          <div className="xl:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-3.5">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#003B3A] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#003B3A]">
                    AI Hỗ trợ dự thảo & Kiểm tra minh chứng
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tách biệt rõ Dữ kiện nguồn, Nhận xét người dùng & Gợi ý của AI
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={aiLoading}
                onClick={handleRunAiAssist}
                className="px-3 py-1.5 rounded-xl font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100 shrink-0"
              >
                {aiLoading ? "Đang kiểm tra..." : "Soạn & Kiểm tra"}
              </button>
            </div>

            {!aiAssistResult ? (
              <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-6 text-center text-slate-500">
                Nhấn &quot;Soạn & Kiểm tra&quot; để đối chiếu thiếu minh chứng, kiểm tra lệch số liệu và tạo gợi ý dự thảo bám sát công việc nguồn.
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 text-[11px] text-slate-600">
                  <strong>Trạng thái AI:</strong> {aiAssistResult.aiStatusMessage}
                </div>

                {/* Cảnh báo thiếu minh chứng / lệch số liệu */}
                {(aiAssistResult.auditAlerts || []).length > 0 && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 space-y-1.5">
                    <div className="font-bold text-[#E11D48] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Phát hiện thiếu minh chứng / số liệu chưa khớp ({aiAssistResult.auditAlerts.length})
                    </div>
                    {aiAssistResult.auditAlerts.map((al: any, idx: number) => (
                      <div key={idx} className="text-[11px] text-slate-800">
                        • <strong>[{al.refCode}]</strong> {al.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Lớp 1: Dữ kiện hệ thống */}
                <div className="rounded-xl border border-[#E2E8F0] p-3 space-y-1">
                  <div className="font-bold text-[#003B3A]">1. Dữ kiện nguồn từ hệ thống</div>
                  {(aiAssistResult.systemFacts || []).map((f: any, idx: number) => (
                    <div key={idx} className="text-[11px] text-slate-600">
                      • {f.factText}
                    </div>
                  ))}
                </div>

                {/* Lớp 2: Nhận xét người dùng hiện tại */}
                <div className="rounded-xl border border-[#E2E8F0] p-3 space-y-1 bg-[#F8FAFC]/60">
                  <div className="font-bold text-slate-700">2. Nhận xét do người dùng nhập</div>
                  <p className="text-[11px] text-slate-600">
                    {aiAssistResult.userNarrativeEcho?.executiveCommentary ||
                      "(Người dùng chưa nhập diễn giải)"}
                  </p>
                </div>

                {/* Lớp 3: Gợi ý của AI (Người dùng bấm mới chèn, AI không tự duyệt/gửi) */}
                <div className="rounded-xl border border-teal-200 bg-[#F0FDFA] p-3 space-y-2">
                  <div className="font-bold text-[#003B3A]">
                    3. Gợi ý dự thảo từ AI (Kiểm tra trước khi sử dụng)
                  </div>
                  <p className="text-[11px] text-slate-700">
                    <strong>Tóm tắt kết quả:</strong>{" "}
                    {aiAssistResult.aiSuggestions?.suggestedSummary}
                  </p>
                  <p className="text-[11px] text-slate-700">
                    <strong>Vướng mắc:</strong>{" "}
                    {aiAssistResult.aiSuggestions?.suggestedBlockersSummary}
                  </p>
                  <p className="text-[11px] text-slate-700">
                    <strong>Kế hoạch kỳ tới:</strong>{" "}
                    {aiAssistResult.aiSuggestions?.suggestedNextPeriodPlan}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setExecutiveCommentary(
                        aiAssistResult.aiSuggestions?.suggestedSummary || ""
                      )
                      setBlockersAndCauses(
                        aiAssistResult.aiSuggestions?.suggestedBlockersSummary || ""
                      )
                      setNextPeriodPlan(
                        aiAssistResult.aiSuggestions?.suggestedNextPeriodPlan || ""
                      )
                      toast.success("Đã chèn nội dung gợi ý vào khung soạn thảo để bạn rà soát")
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#003B3A] text-white text-[11px] font-semibold"
                  >
                    Chèn gợi ý vào bản nháp để rà soát
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Xem Chi tiết Báo cáo, Phê duyệt Khóa hoặc Tạo Phiên bản Điều chỉnh */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-2xl w-full p-5 space-y-4 text-xs my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div>
                <h3 className="text-sm font-bold text-[#003B3A]">
                  {selectedReport.reportCode} • {selectedReport.periodLabel} (v
                  {selectedReport.versionNumber})
                </h3>
                <p className="text-slate-500">
                  Người lập: {selectedReport.ownerName} • Trạng thái:{" "}
                  {REPORT_STATUS_META[selectedReport.status]?.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="p-1 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 tabular-nums">
              <div className="font-bold text-[#003B3A]">
                Số liệu chốt nguồn: {selectedReport.snapshot.completedInPeriodCount} Hoàn thành /{" "}
                {selectedReport.snapshot.totalCanonicalTasks} Tổng việc •{" "}
                {selectedReport.snapshot.overdueCount} Quá hạn •{" "}
                {selectedReport.snapshot.adhocCount} Phát sinh
              </div>
              <p className="text-slate-700">
                <strong>Diễn giải:</strong> {selectedReport.executiveCommentary || "—"}
              </p>
              <p className="text-slate-700">
                <strong>Vướng mắc:</strong> {selectedReport.blockersAndCauses || "—"}
              </p>
              <p className="text-slate-700">
                <strong>Kiến nghị hỗ trợ:</strong> {selectedReport.supportRequests || "—"}
              </p>
              <p className="text-slate-700">
                <strong>Kế hoạch kỳ tới:</strong> {selectedReport.nextPeriodPlan || "—"}
              </p>
            </div>

            {(canApprove || selectedReport.isLocked) && (
              <div className="space-y-2.5 pt-2 border-t border-[#F1F5F9]">
                <input
                  type="text"
                  value={reviewFeedbackInput}
                  onChange={(e) => setReviewFeedbackInput(e.target.value)}
                  placeholder="Nhập nhận xét phê duyệt, yêu cầu bổ sung hoặc lý do mở phiên bản điều chỉnh mới..."
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                />

                <div className="flex flex-wrap justify-end gap-2">
                  {canApprove && selectedReport.status === "SUBMITTED" && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleReviewOrRevise(selectedReport.id, "REQUEST_REVISION")
                        }
                        className="px-3.5 py-2 rounded-xl font-semibold bg-amber-50 text-[#D97706] border border-amber-200"
                      >
                        Yêu cầu bổ sung
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewOrRevise(selectedReport.id, "APPROVE")}
                        className="px-4 py-2 rounded-xl font-semibold bg-[#059669] text-white"
                      >
                        Phê duyệt & Khóa báo cáo
                      </button>
                    </>
                  )}

                  {selectedReport.isLocked && (
                    <button
                      type="button"
                      onClick={() =>
                        handleReviewOrRevise(selectedReport.id, "CREATE_NEW_VERSION")
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold bg-[#003B3A] text-white"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Tạo phiên bản điều chỉnh mới (v{selectedReport.versionNumber + 1})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
