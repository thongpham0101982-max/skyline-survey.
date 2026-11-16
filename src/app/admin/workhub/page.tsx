"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  Clock,
  FileWarning,
  Info,
  RefreshCw,
} from "lucide-react"
import type { DashboardMetricCard } from "@/lib/workhub/dashboardAndAiEngine"
import { SourceDrilldownDrawer } from "./components/SourceDrilldownDrawer"

export default function WorkHubOverviewPage() {
  const now = new Date()
  const [periodType, setPeriodType] = useState<"MONTHLY" | "WEEKLY">("MONTHLY")
  const [year, setYear] = useState<number>(now.getFullYear())
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [weekNumber, setWeekNumber] = useState<number>(1)
  const [campusId, setCampusId] = useState<string>("ALL")
  const [departmentId, setDepartmentId] = useState<string>("ALL")
  const [userId, setUserId] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [dashData, setDashData] = useState<any | null>(null)

  const [drillCard, setDrillCard] = useState<DashboardMetricCard | null>(null)

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
        campusId,
        departmentId,
        userId,
        status: statusFilter,
      })
      const res = await fetch(`/api/workhub?${qs.toString()}`)
      const json = await res.json()
      if (!json.success) {
        setErrorMsg(json.error || "Không tải được dữ liệu Tổng quan WorkHub.")
      } else {
        setDashData(json.data)
      }
    } catch {
      setErrorMsg("Lỗi kết nối máy chủ khi tải Dashboard WorkHub.")
    } finally {
      setLoading(false)
    }
  }, [periodType, year, month, weekNumber, campusId, departmentId, userId, statusFilter])

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
          Đang tổng hợp dữ liệu Tổng quan WorkHub theo phạm vi phân quyền...
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

  const drillTasks = drillCard
    ? (dashData?.drilldownCatalog?.tasks || []).filter((t: any) =>
        drillCard.sourceIds.includes(t.id)
      )
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

  return (
    <div className="space-y-5">
      {/* Bộ lọc đa chiều */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as any)}
            className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 font-semibold text-[#003B3A]"
          >
            <option value="MONTHLY">Kỳ Tháng</option>
            <option value="WEEKLY">Kỳ Tuần</option>
          </select>

          {periodType === "WEEKLY" && (
            <select
              value={weekNumber}
              onChange={(e) => setWeekNumber(Number(e.target.value))}
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700"
            >
              {[1, 2, 3, 4, 5].map((w) => (
                <option key={w} value={w}>
                  Tuần {w}
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

          {isLeaderOrExec && (
            <>
              <select
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700"
              >
                <option value="ALL">Mọi cơ sở trong phạm vi</option>
                {(dashData?.filterOptions?.campuses || []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.campusName}
                  </option>
                ))}
              </select>

              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700"
              >
                <option value="ALL">Mọi phòng ban / tổ CM</option>
                {(dashData?.filterOptions?.departments || []).map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700 max-w-[190px]"
              >
                <option value="ALL">Mọi nhân sự</option>
                {(dashData?.filterOptions?.users || []).map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="ALL">Mọi trạng thái việc</option>
            <option value="ASSIGNED">Đã giao</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="PENDING_REVIEW">Chờ nghiệm thu</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="OVERDUE">Quá hạn</option>
          </select>
        </div>

        <button
          type="button"
          onClick={fetchDashboard}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0] hover:bg-slate-100"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* Khối 1: Chỉ số Cá nhân của tôi (Luôn hiển thị cho mọi vai trò kèm cách tính & drill-down) */}
      <div className="space-y-2.5">
        <div className="border-l-4 border-[#003B3A] pl-3">
          <h2 className="text-sm font-bold text-[#003B3A]">
            Không gian cá nhân của bạn ({dashData?.period?.periodLabel})
          </h2>
          <p className="text-xs text-slate-500">
            Nhấn vào bất kỳ thẻ chỉ số nào để xem công thức tính và danh sách dữ liệu nguồn
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] tabular-nums">
            {(dashData?.individualCards || []).map((card: DashboardMetricCard) => (
              <button
                key={card.key}
                type="button"
                onClick={() => setDrillCard(card)}
                className="p-4 text-left hover:bg-[#F8FAFC] transition-colors flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">{card.label}</span>
                    <Calculator className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#00A19A]" />
                  </div>
                  <div className={`mt-1.5 text-xl font-bold ${renderToneClasses(card.tone)}`}>
                    {card.displayValue}
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                  <span className="truncate">{card.subtext}</span>
                  <span className="text-[#008B85] font-semibold shrink-0 ml-1">Nguồn →</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Khối 2 (Chỉ dành cho Trưởng bộ phận / Giám đốc Cơ sở / Ban điều hành): Quản trị Phạm vi Đơn vị */}
      {isLeaderOrExec && (
        <div className="space-y-2.5">
          <div className="border-l-4 border-[#003B3A] pl-3">
            <h2 className="text-sm font-bold text-[#003B3A]">
              Điều hành phạm vi quản lý ({actor.isExecutive ? "Toàn hệ thống / Ban điều hành" : "Phòng ban & Cơ sở phụ trách"})
            </h2>
            <p className="text-xs text-slate-500">
              Số liệu đã tự động khử trùng công việc cha–con và nhiệm vụ nhiều người phối hợp
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] tabular-nums">
              {(dashData?.managerCards || []).map((card: DashboardMetricCard) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setDrillCard(card)}
                  className="p-4 text-left hover:bg-[#F8FAFC] transition-colors flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500">{card.label}</span>
                      <Calculator className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#00A19A]" />
                    </div>
                    <div className={`mt-1.5 text-xl font-bold ${renderToneClasses(card.tone)}`}>
                      {card.displayValue}
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                    <span className="truncate">{card.subtext}</span>
                    <span className="text-[#008B85] font-semibold shrink-0 ml-1">Nguồn →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Khối 3: Việc ưu tiên của tôi & Vấn đề cần quyết định / KPI cá nhân */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="border-l-4 border-[#003B3A] pl-3">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Công việc cần thực hiện theo hạn hoàn thành
              </h3>
            </div>
            <Link
              href="/admin/workhub/my-tasks"
              className="text-xs font-semibold text-[#00736E] hover:underline inline-flex items-center gap-1"
            >
              Mở Công việc của tôi
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {(dashData?.myPriorityTasks || []).length === 0 ? (
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-6 text-center text-xs text-slate-500">
              Hiện tại bạn không có công việc tồn đọng cần xử lý.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                      <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                        Mã CV
                      </th>
                      <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">
                        Tên công việc
                      </th>
                      <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                        Tiến độ
                      </th>
                      <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap text-right">
                        Hạn chót
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {(dashData?.myPriorityTasks || []).map((t: any) => (
                      <tr key={t.id} className="hover:bg-[#F8FAFC] align-middle">
                        <td className="py-2.5 px-3 font-semibold text-[#003B3A] whitespace-nowrap">
                          {t.taskCode}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{t.title}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-[#00736E]">
                          {t.progressPercent}%
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-right">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                              t.isOverdue
                                ? "bg-rose-50 text-[#E11D48] border-rose-200"
                                : t.dueSoon
                                ? "bg-amber-50 text-[#D97706] border-amber-200"
                                : "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0]"
                            }`}
                          >
                            {new Date(t.endDate).toLocaleDateString("vi-VN")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Cột Phải: Vấn đề cần Lãnh đạo quyết định (đối với quản lý) hoặc KPI của tôi */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 sm:p-5 space-y-3">
          {isLeaderOrExec ? (
            <>
              <div className="border-l-4 border-[#003B3A] pl-3">
                <h3 className="text-sm font-bold text-[#003B3A]">
                  Hạng mục chờ quyết định & phê duyệt
                </h3>
                <p className="text-xs text-slate-500">
                  Kiến nghị hỗ trợ từ báo cáo & công việc chờ nghiệm thu
                </p>
              </div>

              {(dashData?.decisionItems || []).length === 0 ? (
                <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-6 text-center text-xs text-slate-500">
                  Không có kiến nghị hỗ trợ hay hồ sơ nghiệm thu tồn đọng.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {(dashData?.decisionItems || []).map((item: any, idx: number) => (
                    <Link
                      key={idx}
                      href={item.linkHref}
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
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="border-l-4 border-[#003B3A] pl-3">
                  <h3 className="text-sm font-bold text-[#003B3A]">Chỉ tiêu & KPI của tôi</h3>
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
                  Chưa áp dụng chỉ số KPI bắt buộc cho tài khoản của bạn trong kỳ này.
                </div>
              ) : (
                <div className="space-y-2 tabular-nums">
                  {(dashData?.myKpis || []).map((k: any) => (
                    <div
                      key={k.kpiId}
                      className="rounded-xl border border-[#E2E8F0] p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[#003B3A]">{k.kpiName}</div>
                        <div className="text-[11px] text-slate-500">
                          Mục tiêu: {k.targetValue}
                          {k.unit === "%" ? "%" : ` ${k.unit}`}
                        </div>
                      </div>
                      <span className="font-bold text-[#00736E]">{k.actualDisplay}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Khối 4 (Dành cho Ban điều hành / Trưởng bộ phận): Bảng tổng hợp theo Phòng ban */}
      {isLeaderOrExec && (dashData?.departmentBreakdown || []).length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="border-l-4 border-[#003B3A] pl-3">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Tổng hợp tiến độ & báo cáo theo Phòng ban / Tổ chuyên môn
              </h3>
            </div>
            <Link
              href="/admin/workhub/org-tracking"
              className="text-xs font-semibold text-[#00736E] hover:underline"
            >
              Xem Theo dõi Phòng ban & Cơ sở →
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                      Phòng ban / Tổ chuyên môn
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                      Hoàn thành / Tổng việc
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                      Tỷ lệ đúng hạn
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                      Quá hạn
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                      Việc phát sinh
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                      Báo cáo đã gửi / Chưa gửi
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {(dashData?.departmentBreakdown || []).slice(0, 15).map((d: any) => (
                    <tr key={d.departmentId} className="hover:bg-[#F8FAFC] align-middle">
                      <td className="py-3 px-3 font-semibold text-[#003B3A]">
                        {d.departmentName}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {d.completedTasks}/{d.totalTasks}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-[#00736E]">
                        {d.onTimeRateDisplay}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={
                            d.overdueTasks > 0 ? "font-bold text-[#E11D48]" : "text-slate-500"
                          }
                        >
                          {d.overdueTasks}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">{d.adhocTasks}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[#059669] font-semibold">
                          {d.submittedReportsCount} đã gửi
                        </span>{" "}
                        /{" "}
                        <span className="text-[#D97706] font-medium">
                          {d.missingReportsCount} chưa gửi
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setDrillCard({
                              key: `DEPT_${d.departmentId}`,
                              label: `Công việc thuộc ${d.departmentName}`,
                              displayValue: `${d.completedTasks}/${d.totalTasks} hoàn thành`,
                              subtext: d.onTimeRateDisplay,
                              tone: "teal",
                              formulaDescription:
                                "Danh sách các công việc lá thuộc phòng ban/tổ chuyên môn này (đã khử trùng công việc cha-con và người phối hợp).",
                              sourceType: "TASKS",
                              sourceIds: d.taskIds,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100"
                        >
                          Xem nguồn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <SourceDrilldownDrawer
        open={Boolean(drillCard)}
        onClose={() => setDrillCard(null)}
        title={drillCard?.label || ""}
        displayValue={drillCard?.displayValue || ""}
        formulaDescription={drillCard?.formulaDescription || ""}
        sourceType={drillCard?.sourceType || "TASKS"}
        tasks={drillTasks}
        reports={drillReports}
        plans={drillPlans}
      />
    </div>
  )
}
