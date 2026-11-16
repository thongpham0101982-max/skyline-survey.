"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  Users,
} from "lucide-react"
import type { DashboardMetricCard } from "@/lib/workhub/dashboardAndAiEngine"
import { SourceDrilldownDrawer } from "./components/SourceDrilldownDrawer"

export default function WorkHubOverviewPage() {
  const now = new Date()
  const [periodType, setPeriodType] = useState<"WEEKLY" | "MONTHLY">("WEEKLY")
  const [year, setYear] = useState<number>(now.getFullYear())
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [weekNumber, setWeekNumber] = useState<number>(1)
  const [groupId, setGroupId] = useState<string>("ALL")
  const [userId, setUserId] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [dashData, setDashData] = useState<any | null>(null)

  const [drillCard, setDrillCard] = useState<DashboardMetricCard | null>(null)
  const [customDrillTitle, setCustomDrillTitle] = useState<string | null>(null)
  const [customDrillTaskIds, setCustomDrillTaskIds] = useState<string[] | null>(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const qs = new URLSearchParams({
        resource: "dashboard",
        periodType,
        year: String(year),
        month: String(month),
        weekNumber: String(weekNumber),
        groupId,
        userId,
        status: statusFilter,
      })
      const res = await fetch(`/api/workhub?${qs.toString()}`)
      const json = await res.json()
      if (!json.success) {
        setErrorMsg(json.error || "Không tải được dữ liệu tổng quan QA Workspace.")
      } else {
        setDashData(json.data)
        if (json.data?.period?.weekNumber && periodType === "WEEKLY" && weekNumber === 1) {
          // Sync initial weekNumber with resolved current week if needed
        }
      }
    } catch {
      setErrorMsg("Lỗi kết nối máy chủ khi tải dữ liệu tổng quan QA Workspace.")
    } finally {
      setLoading(false)
    }
  }, [periodType, year, month, weekNumber, groupId, userId, statusFilter])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const renderToneClasses = (tone: DashboardMetricCard["tone"]) => {
    switch (tone) {
      case "emerald":
        return "text-[#059669]"
      case "amber":
        return "text-[#D97706]"
      case "rose":
        return "text-[#E11D48]"
      case "teal":
        return "text-[#003B3A]"
      default:
        return "text-slate-800"
    }
  }

  if (loading && !dashData) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-2">
        <RefreshCw className="w-6 h-6 animate-spin text-[#00A19A] mx-auto" />
        <p className="text-xs font-semibold text-slate-600">
          Đang tổng hợp tiến độ công việc, báo cáo &amp; KPI của từng nhóm và cá nhân Ban KT&amp;ĐBCL...
        </p>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6 text-center space-y-3">
        <AlertCircle className="w-6 h-6 text-[#E11D48] mx-auto" />
        <p className="text-xs font-semibold text-[#E11D48]">{errorMsg}</p>
        <button
          type="button"
          onClick={fetchDashboard}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] text-white"
        >
          Thử lại
        </button>
      </div>
    )
  }

  const actor = dashData?.actor
  const isLeaderOrExec =
    actor?.isExecutive || actor?.isDepartmentHead || actor?.isCampusHead

  const allCatalogTasks = dashData?.drilldownCatalog?.tasks || []
  const drillTasks = customDrillTaskIds
    ? allCatalogTasks.filter((t: any) => customDrillTaskIds.includes(t.id))
    : drillCard
    ? allCatalogTasks.filter((t: any) => drillCard.sourceIds.includes(t.id))
    : []
  const drillReports = drillCard
    ? (dashData?.drilldownCatalog?.reports || []).filter((r: any) =>
        drillCard.sourceIds.includes(r.id)
      )
    : []
  const drillPlans = drillCard
    ? (dashData?.drilldownCatalog?.plans || []).filter((p: any) =>
        drillCard.sourceIds.includes(p.id)
      )
    : []

  const groupRows = dashData?.groupProgressMatrix || []
  const memberRows = dashData?.memberProgressMatrix || []
  const allWeeks = dashData?.period?.allWeeks || [
    { weekNum: 1, label: "Tuần 1" },
    { weekNum: 2, label: "Tuần 2" },
    { weekNum: 3, label: "Tuần 3" },
    { weekNum: 4, label: "Tuần 4" },
  ]

  return (
    <div className="space-y-5">
      {/* Bộ lọc đa chiều theo Kỳ, Nhóm chuyên môn & Cá nhân Ban KT&ĐBCL */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
          <div className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
            <button
              type="button"
              onClick={() => setPeriodType("WEEKLY")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                periodType === "WEEKLY"
                  ? "bg-[#003B3A] text-white"
                  : "text-slate-600 hover:text-[#003B3A]"
              }`}
            >
              Theo tuần
            </button>
            <button
              type="button"
              onClick={() => setPeriodType("MONTHLY")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                periodType === "MONTHLY"
                  ? "bg-[#003B3A] text-white"
                  : "text-slate-600 hover:text-[#003B3A]"
              }`}
            >
              Theo tháng
            </button>
          </div>

          {periodType === "WEEKLY" && (
            <select
              value={weekNumber}
              onChange={(e) => setWeekNumber(Number(e.target.value))}
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700"
            >
              {allWeeks.map((w: any) => (
                <option key={w.weekNum} value={w.weekNum}>
                  {w.label || `Tuần ${w.weekNum}`}
                </option>
              ))}
            </select>
          )}

          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>

          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="ALL">Tất cả nhóm chuyên môn KT&amp;ĐBCL</option>
            {(dashData?.filterOptions?.groups || []).map((g: any) => (
              <option key={g.id} value={g.id}>
                Nhóm: {g.name}
              </option>
            ))}
          </select>

          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700 max-w-[200px]"
          >
            <option value="ALL">Tất cả cá nhân Ban KT&amp;ĐBCL</option>
            {(dashData?.filterOptions?.users || []).map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="IN_PROGRESS">Việc đang thực hiện</option>
            <option value="PENDING_REVIEW">Việc chờ nghiệm thu</option>
            <option value="COMPLETED">Việc hoàn thành</option>
            <option value="OVERDUE">Việc quá hạn</option>
            <option value="MISSING_REPORT">Cá nhân chưa nộp báo cáo kỳ</option>
          </select>
        </div>

        <button
          type="button"
          onClick={fetchDashboard}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F8FAFC] border border-[#E2E8F0] text-slate-700 hover:border-[#00A19A]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* 1. Dải chỉ số tổng hợp toàn Ban KT&ĐBCL & Cá nhân (Bấm tra cứu công thức & nguồn) */}
      <div className="space-y-2.5">
        <div className="border-l-4 border-[#003B3A] pl-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#003B3A]">
              Chỉ số điều hành công việc, báo cáo &amp; kế hoạch ({dashData?.period?.periodLabel})
            </h2>
            <p className="text-xs text-slate-500">
              Không cộng trùng công việc cha – con và người phối hợp; bấm vào từng thẻ để xem công thức và danh sách dữ liệu gốc
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#F1F5F9] tabular-nums">
          {(isLeaderOrExec ? dashData?.managerCards || [] : dashData?.individualCards || []).map(
            (card: DashboardMetricCard) => (
              <button
                key={card.key}
                type="button"
                onClick={() => {
                  setCustomDrillTaskIds(null)
                  setCustomDrillTitle(null)
                  setDrillCard(card)
                }}
                className="p-4 text-left hover:bg-[#F8FAFC] transition-colors flex flex-col justify-between group"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">{card.label}</span>
                  <Calculator className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#00A19A] shrink-0" />
                </div>
                <div className={`text-xl font-bold mt-2 ${renderToneClasses(card.tone)}`}>
                  {card.displayValue}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate">{card.subtext}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#008B85] opacity-0 group-hover:opacity-100 shrink-0" />
                </div>
              </button>
            )
          )}
        </div>
      </div>

      {/* 2. BẢNG 1: THEO DÕI TIẾN ĐỘ CÔNG VIỆC & BÁO CÁO THEO NHÓM CHUYÊN MÔN BAN KT&ĐBCL */}
      <div className="space-y-2.5">
        <div className="border-l-4 border-[#003B3A] pl-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#003B3A] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#00A19A]" />
              Tiến độ công việc &amp; báo cáo theo Nhóm chuyên môn Ban KT&amp;ĐBCL ({groupRows.length} nhóm)
            </h2>
            <p className="text-xs text-slate-500">
              Đối chiếu đồng thời tiến độ thực hiện đầu việc được giao và kỷ luật nộp báo cáo công việc của từng nhóm chuyên môn
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/tasks"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F8FAFC] border border-[#E2E8F0] text-[#003B3A] hover:border-[#00A19A]"
            >
              <ClipboardList className="w-3.5 h-3.5 text-[#008B85]" />
              Giao việc theo nhóm
            </Link>
            <Link
              href={`/admin/weekly-reports?week=${weekNumber}&month=${month}&year=${year}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F0FDFA] border border-teal-200 text-[#00736E] hover:bg-teal-100"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Mở Báo cáo tuần &amp; tháng
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                    Nhóm chuyên môn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Nhân sự nhóm
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Tiến độ đầu việc giao
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                    Tỷ lệ đúng hạn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Quá hạn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                    Báo cáo công việc kỳ
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Xác nhận QL / GĐB
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {groupRows.map((g: any) => (
                  <tr
                    key={g.groupId}
                    className={`transition-colors align-middle hover:bg-[#F8FAFC] ${
                      groupId === g.groupId ? "bg-[#F0FDFA]/70" : ""
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#003B3A]">{g.groupName}</div>
                      <div className="text-[11px] text-slate-500">
                        Điều phối: {g.leaderName}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">
                      {g.memberCount} TV
                    </td>
                    <td className="py-3 px-3 min-w-[190px]">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-slate-800">
                          {g.completedTasks}/{g.totalTasks} hoàn thành
                        </span>
                        <span className="text-slate-500">
                          {g.inProgressTasks} đang làm • {g.pendingReviewTasks} chờ duyệt
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-[#00A19A] rounded-full transition-all"
                          style={{ width: `${g.taskCompletionPercent}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-[#00736E]">
                      {g.onTimeRateDisplay}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {g.overdueTasks > 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-rose-50 text-[#E11D48] border border-rose-200 font-bold text-[11px]">
                          {g.overdueTasks} trễ hạn
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="font-semibold text-slate-800">
                        <span className="text-[#059669]">{g.submittedMembersCount} đã nộp</span>
                        {" / "}
                        <span className={g.missingMembersCount > 0 ? "text-[#D97706]" : "text-slate-500"}>
                          {g.memberCount} TV
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {g.reportItemsCount} mục báo cáo ({g.completedReportItemsCount} hoàn thành)
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="font-semibold text-[#059669]">
                        {g.confirmedItemsCount}/{g.reportItemsCount} mục đã duyệt
                      </div>
                      {g.explanationRequiredCount > 0 && (
                        <div className="text-[11px] font-semibold text-[#E11D48] mt-0.5">
                          {g.explanationRequiredCount} mục chờ giải trình
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setGroupId(groupId === g.groupId ? "ALL" : g.groupId)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] hover:border-[#00A19A]"
                      >
                        {groupId === g.groupId ? "Bỏ lọc" : "Lọc nhóm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDrillCard(null)
                          setCustomDrillTitle(`Đầu việc của nhóm ${g.groupName}`)
                          setCustomDrillTaskIds(g.taskIds || [])
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200"
                      >
                        Xem việc
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. BẢNG 2: THEO DÕI TIẾN ĐỘ CÔNG VIỆC & BÁO CÁO CỦA TỪNG CÁ NHÂN BAN KT&ĐBCL */}
      <div className="space-y-2.5">
        <div className="border-l-4 border-[#003B3A] pl-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#003B3A] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#00A19A]" />
              Tiến độ công việc &amp; báo cáo của từng Cá nhân Ban KT&amp;ĐBCL ({memberRows.length} thành viên)
            </h2>
            <p className="text-xs text-slate-500">
              Sắp xếp theo họ tên khách quan; nhân sự chưa nộp báo cáo được gắn nhãn rõ ràng (không tự quy về kết quả 0%)
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                    Nhân sự &amp; Nhóm chuyên môn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Đầu việc tham gia
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                    Tỷ lệ đúng hạn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Quá hạn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                    Trạng thái nộp Báo cáo kỳ
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Xác nhận &amp; Giải trình
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {memberRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-slate-500">
                      Không có thành viên nào khớp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  memberRows.map((m: any) => (
                    <tr key={m.userId} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#003B3A] flex items-center gap-1.5 flex-wrap">
                          <span>{m.fullName}</span>
                          {m.isDirector && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#003B3A] text-white">
                              Giám đốc Ban
                            </span>
                          )}
                          {!m.isDirector && m.isManager && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200">
                              Quản lý
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {(m.specialistGroups || []).length > 0
                            ? m.specialistGroups.join(" • ")
                            : "Ban KT&ĐBCL"}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {m.completedTasks}/{m.totalTasks} hoàn thành
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {m.inProgressTasks} đang làm • {m.pendingReviewTasks} chờ duyệt
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-semibold text-[#00736E] whitespace-nowrap">
                        {m.onTimeRateDisplay}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {m.overdueTasks > 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-rose-50 text-[#E11D48] border border-rose-200 font-bold text-[11px]">
                            {m.overdueTasks} việc
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {m.hasSubmittedReport ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-[#059669] border border-emerald-200 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3 h-3" />
                              Đã nộp ({m.reportItemsCount} mục)
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Lũy kế tháng: {m.submittedWeeksCount}/{m.expectedWeeksCount} tuần
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-50 text-[#D97706] border border-amber-200 font-semibold text-[11px]">
                              Chưa nộp báo cáo kỳ
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Lũy kế tháng: {m.submittedWeeksCount}/{m.expectedWeeksCount} tuần
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {m.reportItemsCount > 0 ? (
                          <div className="font-semibold text-[#059669]">
                            {m.confirmedItemsCount}/{m.reportItemsCount} mục đã xác nhận
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {m.explanationRequiredCount > 0 && (
                          <div className="text-[11px] font-semibold text-[#E11D48] mt-0.5">
                            {m.explanationRequiredCount} mục chờ giải trình
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDrillCard(null)
                            setCustomDrillTitle(`Đầu việc của ${m.fullName}`)
                            setCustomDrillTaskIds(m.taskIds || [])
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0] hover:border-[#00A19A]"
                        >
                          Việc ({m.totalTasks})
                        </button>
                        <Link
                          href={`/admin/weekly-reports?tab=cards&week=${weekNumber}&month=${month}&year=${year}`}
                          className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200"
                        >
                          Báo cáo
                        </Link>
                        <Link
                          href={`/admin/workhub/kpis?targetScope=INDIVIDUAL&targetEntityId=${m.userId}`}
                          className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-slate-700 border border-[#E2E8F0] hover:border-[#00A19A]"
                        >
                          KPI
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Khối Hạng mục chờ quyết định / phê duyệt & KPI cá nhân */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 space-y-3">
          <div className="border-l-4 border-[#003B3A] pl-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#003B3A]">
                Hạng mục chờ nghiệm thu, giải trình &amp; quyết định
              </h3>
              <p className="text-xs text-slate-500">
                Tổng hợp công việc chờ nghiệm thu, đầu việc trễ hạn chờ giải trình và kiến nghị hỗ trợ
              </p>
            </div>
          </div>

          {(dashData?.decisionItems || []).length === 0 ? (
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-6 text-center text-xs text-slate-500">
              Không có hồ sơ nghiệm thu hay giải trình trễ hạn tồn đọng.
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {(dashData?.decisionItems || []).map((item: any, idx: number) => (
                <Link
                  key={idx}
                  href={item.linkHref || "/admin/tasks"}
                  className="block rounded-xl border border-[#E2E8F0] hover:border-[#00A19A] bg-[#F8FAFC]/70 p-3 text-xs space-y-1 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#003B3A]">{item.title}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-[#E2E8F0] text-[10px] font-semibold text-[#00736E] shrink-0">
                      {item.code}
                    </span>
                  </div>
                  <p className="text-slate-600 line-clamp-2">{item.detail}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="border-l-4 border-[#003B3A] pl-3">
              <h3 className="text-sm font-bold text-[#003B3A]">Chỉ tiêu &amp; KPI của tôi</h3>
              <p className="text-xs text-slate-500">Tự động liên thông từ công việc &amp; báo cáo</p>
            </div>
            <Link
              href="/admin/workhub/kpis"
              className="text-xs font-semibold text-[#00736E] hover:underline"
            >
              Chi tiết KPI →
            </Link>
          </div>

          {(dashData?.myKpis || []).length === 0 ? (
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-6 text-center text-xs text-slate-500">
              Chưa có chỉ số KPI nào được cấu hình cho tài khoản của bạn trong kỳ này.
            </div>
          ) : (
            <div className="space-y-2.5 tabular-nums">
              {(dashData?.myKpis || []).map((k: any) => (
                <div
                  key={k.kpiId}
                  className="rounded-xl border border-[#E2E8F0] p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-[#003B3A] truncate">
                      {k.kpiCode} • {k.kpiName}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Mục tiêu: {k.targetValue}
                      {k.unit === "%" ? "%" : ` ${k.unit}`} • Thực tế:{" "}
                      <strong>{k.actualDisplay}</strong>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 border ${
                      k.outcomeBand === "PASS"
                        ? "bg-emerald-50 text-[#059669] border-emerald-200"
                        : k.outcomeBand === "WARNING"
                        ? "bg-amber-50 text-[#D97706] border-amber-200"
                        : k.outcomeBand === "FAIL"
                        ? "bg-rose-50 text-[#E11D48] border-rose-200"
                        : "bg-slate-100 text-slate-600 border-slate-300"
                    }`}
                  >
                    {k.outcomeBand === "PASS"
                      ? "Đạt chuẩn"
                      : k.outcomeBand === "WARNING"
                      ? "Cảnh báo"
                      : k.outcomeBand === "FAIL"
                      ? "Chưa đạt"
                      : "Chưa đủ dữ liệu"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ngăn kéo tra cứu Công thức & Dữ liệu nguồn (Drill-down) */}
      <SourceDrilldownDrawer
        open={Boolean(drillCard || customDrillTaskIds)}
        onClose={() => {
          setDrillCard(null)
          setCustomDrillTaskIds(null)
          setCustomDrillTitle(null)
        }}
        title={customDrillTitle || drillCard?.label || ""}
        displayValue={drillCard?.displayValue || `${drillTasks.length} đầu việc`}
        formulaDescription={
          drillCard?.formulaDescription ||
          "Danh sách các đầu việc lá thuộc phạm vi Nhóm chuyên môn / Cá nhân đang kiểm tra."
        }
        sourceType={drillCard?.sourceType || "TASKS"}
        tasks={drillTasks}
        reports={drillReports}
        plans={drillPlans}
      />
    </div>
  )
}
