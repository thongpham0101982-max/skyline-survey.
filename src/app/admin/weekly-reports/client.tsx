"use client"

import React, { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"
import {
  ArrowUpRight,
  BarChart3,
  CheckSquare,
  ClipboardEdit,
  LayoutGrid,
  RefreshCw,
  Settings,
  ShieldCheck,
} from "lucide-react"
import {
  confirmKtdbclReportItems,
  EnrichedWeeklyReportItem,
  flagOverdueAndRequestExplanationAction,
  getKtdbclWorkspaceSnapshot,
  MemberAssignmentContext,
  saveKtdbclWeeklyReport,
  scanAndRequestOverdueExplanationsAction,
  sendKtdbclDirectorReportNowAction,
  submitStaffOverdueExplanationAction,
  syncQaWorkspaceTasksToReportDraft,
  triggerKtdbclReminderNowAction,
  triggerKtdbclSaturdayPlanReminderNowAction,
  triggerOverdueAndDoingProgressRemindersAction,
  updateKtdbclAutomationSettingsAction,
  updateKtdbclSpecialistGroupMembersAction,
} from "./ktdbcl_actions"
import type {
  KtdbclMemberProfile,
  KtdbclWeeklyAutomationConfig,
  MonthWeekDefinition,
  WeeklyAutomationLogRecord,
} from "@/lib/qa-workspace/weeklyReportSchema"
import type { KtdbclAiQualityReport } from "@/lib/qa-workspace/weeklyAiQualityAgent"
import { QualityDashboardTab } from "./components/QualityDashboardTab"
import { ReviewAndConfirmTab } from "./components/ReviewAndConfirmTab"
import { MemberAndGroupCardsTab } from "./components/MemberAndGroupCardsTab"
import { ComposeAndExplainTab, DraftReportRow } from "./components/ComposeAndExplainTab"
import { AutomationAndRosterTab } from "./components/AutomationAndRosterTab"

type ActiveTabKey = "dashboard" | "review" | "cards" | "compose" | "automation"

interface SnapshotData {
  success: boolean
  period: {
    weekNumber: number
    month: number
    year: number
    allWeeks: MonthWeekDefinition[]
  }
  authority: {
    userId: string
    userName: string
    isLeadership: boolean
    isDirectorAuthority: boolean
  }
  department: {
    id: string
    code: string
    name: string
    divisionCode: string
  }
  members: KtdbclMemberProfile[]
  directorCandidates: KtdbclMemberProfile[]
  taskGroups: Array<{
    id: string
    name: string
    code: string | null
    leaderUserId: string | null
    memberUserIds: string[]
  }>
  specialistGroupNames: string[]
  taskCategories: Array<{ id: string; name: string; weight?: number }>
  weekItems: EnrichedWeeklyReportItem[]
  monthItems: EnrichedWeeklyReportItem[]
  memberWeeklyTimeline: any[]
  memberAssignmentMap?: Record<string, MemberAssignmentContext>
  weeklyAnalysis: KtdbclAiQualityReport
  monthlyAnalysis: KtdbclAiQualityReport
  automationConfig: KtdbclWeeklyAutomationConfig
  automationLogs: WeeklyAutomationLogRecord[]
}

interface WeeklyReportClientProps {
  currentUserId: string
  currentUserName: string
  years: Array<{ id: string; name: string; isOff: boolean }>
  initialSnapshot: SnapshotData
  initialTab?: string
}

function normalizeInitialTab(raw?: string): ActiveTabKey {
  if (raw === "review") return "review"
  if (raw === "cards") return "cards"
  if (raw === "compose") return "compose"
  if (raw === "automation") return "automation"
  return "dashboard"
}

export function WeeklyReportClient({
  currentUserId,
  currentUserName,
  years,
  initialSnapshot,
  initialTab,
}: WeeklyReportClientProps) {
  const [snapshot, setSnapshot] = useState<SnapshotData>(initialSnapshot)
  const [activeTab, setActiveTab] = useState<ActiveTabKey>(() =>
    normalizeInitialTab(initialTab)
  )
  const [scopeMode, setScopeMode] = useState<"WEEKLY" | "MONTHLY">("WEEKLY")

  const [weekNumber, setWeekNumber] = useState<number>(
    initialSnapshot?.period?.weekNumber || 1
  )
  const [month, setMonth] = useState<number>(
    initialSnapshot?.period?.month || new Date().getMonth() + 1
  )
  const [year, setYear] = useState<number>(
    initialSnapshot?.period?.year || new Date().getFullYear()
  )
  const activeAcademicYear = useMemo(
    () => years.find((y) => !y.isOff) || years[0] || null,
    [years]
  )
  const [academicYearId, setAcademicYearId] = useState<string>(
    activeAcademicYear?.id || ""
  )

  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState<boolean>(false)
  const [isRefreshingAi, setIsRefreshingAi] = useState<boolean>(false)
  const [actionBusyKey, setActionBusyKey] = useState<string | null>(null)

  // Shared review filters
  const [reviewGroupFilter, setReviewGroupFilter] = useState<string>("ALL")
  const [reviewMemberFilter, setReviewMemberFilter] = useState<string>("ALL")

  // Compose target member
  const defaultComposeUserId = useMemo(() => {
    const inKt = initialSnapshot?.members?.find((m) => m.id === currentUserId)
    return inKt?.id || initialSnapshot?.members?.[0]?.id || currentUserId
  }, [currentUserId, initialSnapshot])
  const [composeTargetUserId, setComposeTargetUserId] =
    useState<string>(defaultComposeUserId)

  const reloadSnapshot = useCallback(
    async (nextWeek = weekNumber, nextMonth = month, nextYear = year) => {
      setIsLoadingSnapshot(true)
      try {
        const res = await getKtdbclWorkspaceSnapshot({
          weekNumber: nextWeek,
          month: nextMonth,
          year: nextYear,
        })
        if (res.success) {
          setSnapshot(res as unknown as SnapshotData)
          if (res.period?.weekNumber) setWeekNumber(res.period.weekNumber)
        } else {
          toast.error(res.error || "Không thể tải dữ liệu Ban KT&ĐBCL")
        }
      } finally {
        setIsLoadingSnapshot(false)
      }
    },
    [weekNumber, month, year]
  )

  const handlePeriodChange = async (
    nextWeek: number,
    nextMonth: number,
    nextYear: number
  ) => {
    setWeekNumber(nextWeek)
    setMonth(nextMonth)
    setYear(nextYear)
    await reloadSnapshot(nextWeek, nextMonth, nextYear)
  }

  const handleRefreshAiAnalysis = async (scope: "WEEKLY" | "MONTHLY") => {
    setIsRefreshingAi(true)
    try {
      const resp = await fetch("/api/admin/weekly-reports/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scopeType: scope,
          weekNumber,
          month,
          year,
          useCache: false,
        }),
      })
      const json = await resp.json()
      if (json.success && json.aiReport) {
        setSnapshot((prev) => ({
          ...prev,
          ...(scope === "WEEKLY"
            ? { weeklyAnalysis: json.aiReport }
            : { monthlyAnalysis: json.aiReport }),
        }))
        toast.success(
          `AI Agent đã phân tích xong chất lượng ${
            scope === "WEEKLY" ? `Tuần ${weekNumber}` : `Tháng ${month}/${year}`
          }`
        )
      } else {
        toast.error(json.error || "Không chạy được phân tích AI Agent")
      }
    } catch {
      toast.error("Lỗi kết nối tới dịch vụ AI Agent")
    } finally {
      setIsRefreshingAi(false)
    }
  }

  const handleRemindSaturdayPlan = async (targetUserId?: string) => {
    setActionBusyKey("REMIND_SAT_PLAN")
    try {
      const res: any = await triggerKtdbclSaturdayPlanReminderNowAction({
        targetUserId,
      })
      if (res.success) {
        toast.success(
          `Đã gửi nhắc lập Kế hoạch Tuần ${res.nextWeekNumber}/T${res.nextMonth} (${res.remindedCount} thông báo, ${res.emailSentCount} email)`
        )
        await reloadSnapshot()
      } else {
        toast.error(res.error || "Không gửi được thông báo nhắc lập Kế hoạch Tuần")
      }
    } finally {
      setActionBusyKey(null)
    }
  }

  const handleRemindUnsubmitted = async (targetUserId?: string) => {
    setActionBusyKey(targetUserId ? `REMIND_${targetUserId}` : "REMIND_ALL")
    try {
      const res: any = await triggerKtdbclReminderNowAction({
        weekNumber,
        month,
        year,
        targetUserId,
      })
      if (res.success) {
        toast.success(
          `Đã gửi nhắc báo cáo (${res.remindedCount} thông báo, ${res.emailSentCount} email)`
        )
        await reloadSnapshot()
      } else {
        toast.error(res.error || "Không gửi được thông báo nhắc việc")
      }
    } finally {
      setActionBusyKey(null)
    }
  }

  const handleSendDirectorReport = async (scope: "WEEKLY" | "MONTHLY") => {
    setActionBusyKey("SEND_DIRECTOR")
    try {
      const res: any = await sendKtdbclDirectorReportNowAction({
        scopeType: scope,
        weekNumber,
        month,
        year,
      })
      if (res.success) {
        const emailList = Array.isArray(res.recipientEmails) ? res.recipientEmails.join(", ") : "Giám đốc Ban"
        toast.success(
          `Đã gửi Báo cáo ${scope === "WEEKLY" ? "Tuần" : "Tháng"} cho Giám đốc Ban (${emailList})`
        )
        await reloadSnapshot()
      } else {
        toast.error(res.error || "Không gửi được báo cáo cho Giám đốc Ban")
      }
    } finally {
      setActionBusyKey(null)
    }
  }

  const handleRemindOverdueAndDoing = async (itemIds?: string[]) => {
    setActionBusyKey("REMIND_PROGRESS")
    try {
      const res: any = await triggerOverdueAndDoingProgressRemindersAction({
        weekNumber,
        month,
        year,
        scopeType: scopeMode,
        itemIds,
      })
      if (res.success) {
        if (res.totalTargetItems === 0) {
          toast.success("Không có đầu việc Quá hạn hoặc Đang thực hiện nào cần nhắc.")
        } else {
          toast.success(
            `Đã gửi nhắc tiến độ & xác nhận HT cho ${res.remindedUsersCount} nhân sự (${res.overdueCount} quá hạn · ${res.doingCount} đang TH · ${res.emailSentCount} email)`
          )
          await reloadSnapshot()
        }
      } else {
        toast.error(res.error || "Không gửi được email nhắc tiến độ")
      }
    } finally {
      setActionBusyKey(null)
    }
  }

  const handleScanOverdue = async () => {
    setActionBusyKey("SCAN_OVERDUE")
    try {
      const res: any = await scanAndRequestOverdueExplanationsAction({
        weekNumber,
        month,
        year,
        scopeType: scopeMode,
      })
      if (res.success) {
        if (res.flaggedCount === 0) {
          toast.success(res.message || "Không có đầu việc quá hạn mới cần yêu cầu giải trình.")
        } else {
          toast.success(
            `Đã gắn cờ ${res.flaggedCount} việc trễ hạn & gửi ${res.emailSentCount} email yêu cầu giải trình`
          )
          await reloadSnapshot()
        }
      } else {
        toast.error(res.error || "Lỗi quét đầu việc quá hạn")
      }
    } finally {
      setActionBusyKey(null)
    }
  }

  const handleExportExcel = () => {
    const activeItems =
      scopeMode === "WEEKLY" ? snapshot.weekItems : snapshot.monthItems
    const activeAi =
      scopeMode === "WEEKLY" ? snapshot.weeklyAnalysis : snapshot.monthlyAnalysis

    const wb = XLSX.utils.book_new()

    // Sheet 1: Tổng hợp đầu việc Ban KT&ĐBCL
    const itemSheetRows = activeItems.map((it, idx) => ({
      STT: idx + 1,
      "Tuần": `Tuần ${it.weekNumber}`,
      "Nhân sự thực hiện": it.userFullName,
      "Vị trí": it.userPosition,
      "Nhóm chuyên môn": it.taskGroup,
      "Đầu việc chính": it.mainTask,
      "Nội dung chi tiết": it.workContent,
      "Dự kiến HT": it.expectedCompletion || "",
      "Tiến độ":
        it.progress === "COMPLETED"
          ? "Hoàn thành"
          : it.progress === "DOING"
          ? "Đang thực hiện"
          : "Chưa bắt đầu",
      "Trạng thái xác nhận":
        it.meta.confirmStatus === "DIRECTOR_CONFIRMED"
          ? "Giám đốc Ban đã xác nhận"
          : it.meta.confirmStatus === "MANAGER_CONFIRMED"
          ? "Quản lý đã xác nhận"
          : it.meta.confirmStatus === "OVERDUE_EXPLANATION_REQUIRED"
          ? "Yêu cầu giải trình"
          : it.meta.confirmStatus === "EXPLANATION_SUBMITTED"
          ? "Đã nộp giải trình"
          : "Chờ xác nhận",
      "Điểm chất lượng (/10)": it.computedQualityScore,
      "Giải pháp / Giải trình":
        it.meta.staffExplanation || it.proposedSolution || "",
      "Nhận xét Quản lý / GĐB": it.directorNote || it.managerNote || "",
    }))
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(itemSheetRows),
      "Dau_Viec_KTDBCL"
    )

    // Sheet 2: Hiệu suất & KPI từng Cá nhân
    const kpiRows = activeAi.individualAnalyses.map((ind, idx) => ({
      STT: idx + 1,
      "Họ và tên": ind.fullName,
      "Vị trí": ind.position,
      "Nhóm chuyên môn": ind.specialistGroups.join(", "),
      "Tuần đã nộp": `${ind.submittedWeeksCount}/${ind.expectedWeeksCount}`,
      "Đầu việc hoàn thành": `${ind.completedItems}/${ind.totalItems}`,
      "Tỷ lệ hoàn thành (%)": ind.completionRate,
      "Đã xác nhận HT": ind.confirmedByLeadershipCount,
      "Việc trễ hạn": ind.overdueCount,
      "Chỉ số hiệu suất (%)": ind.efficiencyScore,
      "Điểm chất lượng (/10)": ind.avgQualityScore,
      "Xếp loại KPI": `Hạng ${ind.kpiGrade} (${ind.kpiGradeLabel})`,
      "Đánh giá AI Agent": ind.aiCoachingRecommendation,
    }))
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(kpiRows),
      "Hieu_Suat_Ca_Nhan"
    )

    const fileName =
      scopeMode === "WEEKLY"
        ? `BaoCaoTuan_BanKTDBCL_Tuan${weekNumber}_T${month}_${year}.xlsx`
        : `BaoCaoThang_BanKTDBCL_Thang${month}_${year}.xlsx`

    XLSX.writeFile(wb, fileName)
  }

  const activeAiReport =
    scopeMode === "WEEKLY" ? snapshot.weeklyAnalysis : snapshot.monthlyAnalysis
  const activeReviewItems =
    scopeMode === "WEEKLY" ? snapshot.weekItems : snapshot.monthItems

  // Count pending items needing leadership confirmation or staff explanation
  const pendingConfirmCount = useMemo(
    () =>
      snapshot.weekItems.filter(
        (i) =>
          i.progress === "COMPLETED" &&
          i.meta.confirmStatus !== "MANAGER_CONFIRMED" &&
          i.meta.confirmStatus !== "DIRECTOR_CONFIRMED"
      ).length,
    [snapshot.weekItems]
  )

  const myPendingExplanationCount = useMemo(
    () =>
      snapshot.monthItems.filter(
        (i) =>
          i.userId === currentUserId &&
          i.meta.confirmStatus === "OVERDUE_EXPLANATION_REQUIRED"
      ).length,
    [snapshot.monthItems, currentUserId]
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 space-y-5">
      {/* Masthead Sổ cái Học thuật — Gói gọn chuyên biệt trong Bộ phận chuyên môn: Ban KT&ĐBCL */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="border-l-4 border-[#003B3A] pl-4 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold text-[#003B3A]">
                Quản trị Chất lượng Công việc & Báo cáo Tuần
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Bộ phận chuyên môn: Ban KT&ĐBCL
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Lập Kế hoạch Tuần định kỳ Sáng Thứ Bảy (08:30) • Báo cáo công việc định kỳ Thứ Tư (14:00) • Tự động gửi GĐB Tuần &amp; Tháng • AI Agent phân tích hiệu suất
            </p>
          </div>

          {/* Thanh chọn Kỳ báo cáo gọn gàng (Đã loại bỏ hoàn toàn bộ lọc đa bộ phận toàn trường rườm rà) */}
          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <select
              value={month}
              onChange={(e) => handlePeriodChange(1, Number(e.target.value), year)}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#003B3A] focus:outline-none focus:border-[#00A19A]"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => handlePeriodChange(1, month, Number(e.target.value))}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#003B3A] focus:outline-none focus:border-[#00A19A]"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>

            <select
              value={weekNumber}
              onChange={(e) => handlePeriodChange(Number(e.target.value), month, year)}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#003B3A] focus:outline-none focus:border-[#00A19A]"
            >
              {(snapshot.period.allWeeks || []).map((w) => (
                <option key={w.weekNum} value={w.weekNum}>
                  {w.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={isLoadingSnapshot}
              onClick={() => reloadSnapshot()}
              className="p-2 rounded-xl border border-[#E2E8F0] bg-white text-slate-600 hover:text-[#003B3A] hover:bg-[#F8FAFC] transition-colors"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingSnapshot ? "animate-spin" : ""}`} />
            </button>

            <Link
              href="/admin/workhub"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0] hover:border-[#00A19A] transition-colors"
            >
              Tổng quan &amp; KPI
              <ArrowUpRight className="w-3.5 h-3.5 text-[#008B85]" />
            </Link>

            <Link
              href="/admin/tasks"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100 transition-colors"
            >
              Điều hành &amp; giao việc
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Segmented Navigation 5 Tab trực quan */}
        <div className="mt-4 pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center gap-1.5 tabular-nums">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "dashboard"
                ? "bg-[#003B3A] text-white shadow-xs"
                : "bg-[#F8FAFC] text-slate-700 hover:bg-slate-100 border border-[#E2E8F0]"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Dashboard chất lượng & hiệu suất
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "review"
                ? "bg-[#003B3A] text-white shadow-xs"
                : "bg-[#F8FAFC] text-slate-700 hover:bg-slate-100 border border-[#E2E8F0]"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Xác nhận hoàn thành & giải trình
            {pendingConfirmCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#00A19A] text-white">
                {pendingConfirmCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cards")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "cards"
                ? "bg-[#003B3A] text-white shadow-xs"
                : "bg-[#F8FAFC] text-slate-700 hover:bg-slate-100 border border-[#E2E8F0]"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Tiến độ Nhóm & Cá nhân ({snapshot.members.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("compose")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "compose"
                ? "bg-[#003B3A] text-white shadow-xs"
                : "bg-[#F8FAFC] text-slate-700 hover:bg-slate-100 border border-[#E2E8F0]"
            }`}
          >
            <ClipboardEdit className="w-3.5 h-3.5" />
            Lập báo cáo tuần & giải trình
            {myPendingExplanationCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#E11D48] text-white">
                {myPendingExplanationCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("automation")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "automation"
                ? "bg-[#003B3A] text-white shadow-xs"
                : "bg-[#F8FAFC] text-slate-700 hover:bg-slate-100 border border-[#E2E8F0]"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Tự động hóa & cấu hình Ban
          </button>
        </div>
      </div>

      {/* Nội dung Tab đang chọn */}
      {activeTab === "dashboard" && (
        <QualityDashboardTab
          scopeMode={scopeMode}
          onChangeScopeMode={setScopeMode}
          weekNumber={weekNumber}
          month={month}
          year={year}
          isLeadership={snapshot.authority.isLeadership}
          aiReport={activeAiReport}
          isRefreshingAi={isRefreshingAi}
          onRefreshAiAnalysis={handleRefreshAiAnalysis}
          onRemindSaturdayPlan={handleRemindSaturdayPlan}
          onRemindUnsubmitted={handleRemindUnsubmitted}
          onSendDirectorReport={handleSendDirectorReport}
          onScanOverdueAndRequestExplanation={handleScanOverdue}
          onExportExcel={handleExportExcel}
          onSelectGroupToReview={(gName) => {
            setReviewGroupFilter(gName)
            setReviewMemberFilter("ALL")
            setActiveTab("review")
          }}
          onSelectMemberToReview={(uid) => {
            setReviewMemberFilter(uid)
            setReviewGroupFilter("ALL")
            setActiveTab("review")
          }}
          wednesdayReminderEnabled={
            snapshot.automationConfig.wednesdayReminderEnabled
          }
          weeklyDirectorEnabled={
            snapshot.automationConfig.weeklyDirectorReportEnabled
          }
          monthlyDirectorEnabled={
            snapshot.automationConfig.monthlyDirectorReportEnabled
          }
          actionBusyKey={actionBusyKey}
        />
      )}

      {activeTab === "review" && (
        <ReviewAndConfirmTab
          scopeMode={scopeMode}
          onChangeScopeMode={setScopeMode}
          weekNumber={weekNumber}
          month={month}
          year={year}
          items={activeReviewItems}
          specialistGroups={snapshot.specialistGroupNames}
          members={snapshot.members}
          selectedGroup={reviewGroupFilter}
          onSelectGroup={setReviewGroupFilter}
          selectedMemberId={reviewMemberFilter}
          onSelectMemberId={setReviewMemberFilter}
          isLeadership={snapshot.authority.isLeadership}
          isDirectorAuthority={snapshot.authority.isDirectorAuthority}
          currentUserId={currentUserId}
          onConfirmItems={async (payload) => {
            const res = await confirmKtdbclReportItems(payload)
            if (res.success) {
              toast.success(
                `Đã xác nhận hoàn thành ${res.confirmedCount} đầu việc (${res.emailSentCount} email đã gửi)`
              )
              await reloadSnapshot()
            } else {
              toast.error(res.error || "Lỗi xác nhận hoàn thành")
            }
          }}
          onFlagOverdueItems={async (payload) => {
            const res = await flagOverdueAndRequestExplanationAction(payload)
            if (res.success) {
              toast.success(
                `Đã gửi cảnh báo trễ hạn & yêu cầu giải trình (${res.emailSentCount} email)`
              )
              await reloadSnapshot()
            } else {
              toast.error(res.error || "Lỗi gửi yêu cầu giải trình")
            }
          }}
          onSubmitExplanation={async (payload) => {
            const res = await submitStaffOverdueExplanationAction(payload)
            if (res.success) {
              toast.success("Đã gửi giải trình tiến độ đến Quản lý & Giám đốc Ban")
              await reloadSnapshot()
            } else {
              toast.error(res.error || "Lỗi gửi giải trình")
            }
          }}
          onRemindOverdueAndDoing={handleRemindOverdueAndDoing}
          remindingProgress={actionBusyKey === "REMIND_PROGRESS"}
          overdueAutoEnabled={snapshot.automationConfig.overdueAutoFlagEnabled}
        />
      )}

      {activeTab === "cards" && (
        <MemberAndGroupCardsTab
          weekNumber={weekNumber}
          month={month}
          year={year}
          aiReport={activeAiReport}
          memberTimeline={snapshot.memberWeeklyTimeline}
          isLeadership={snapshot.authority.isLeadership}
          currentUserId={currentUserId}
          onOpenMemberReview={(uid) => {
            setReviewMemberFilter(uid)
            setReviewGroupFilter("ALL")
            setActiveTab("review")
          }}
          onOpenComposeForMember={async (uid, wk) => {
            setComposeTargetUserId(uid)
            if (wk && wk !== weekNumber) {
              await handlePeriodChange(wk, month, year)
            }
            setActiveTab("compose")
          }}
          onRemindMember={(uid) => handleRemindUnsubmitted(uid)}
          onOpenGroupReview={(gName) => {
            setReviewGroupFilter(gName)
            setReviewMemberFilter("ALL")
            setActiveTab("review")
          }}
        />
      )}

      {activeTab === "compose" && (
        <ComposeAndExplainTab
          weekNumber={weekNumber}
          month={month}
          year={year}
          allWeeks={snapshot.period.allWeeks}
          onChangeWeek={(wk) => handlePeriodChange(wk, month, year)}
          currentUserId={currentUserId}
          isLeadership={snapshot.authority.isLeadership}
          members={snapshot.members}
          specialistGroups={snapshot.specialistGroupNames}
          taskCategories={snapshot.taskCategories}
          targetUserId={composeTargetUserId}
          onChangeTargetUserId={setComposeTargetUserId}
          existingWeekItems={snapshot.weekItems.filter(
            (i) => i.userId === composeTargetUserId
          )}
          allMonthItemsForTarget={snapshot.monthItems.filter(
            (i) => i.userId === composeTargetUserId
          )}
          assignmentContext={snapshot.memberAssignmentMap?.[composeTargetUserId] || null}
          onSyncFromQaWorkspace={async (targetUid) => {
            const res = await syncQaWorkspaceTasksToReportDraft({
              targetUserId: targetUid,
              weekNumber,
              month,
              year,
            })
            if (res.success) {
              if (res.draftItems.length === 0) {
                toast("Không có nhiệm vụ nào trên QA Workspace của nhân sự này.")
              } else {
                toast.success(
                  `Đã đồng bộ ${res.draftItems.length} nhiệm vụ từ QA Workspace`
                )
              }
              return res.draftItems
            }
            toast.error(res.error || "Lỗi đồng bộ QA Workspace")
            return []
          }}
          onSaveReport={async (targetUid, rows: DraftReportRow[]) => {
            const res = await saveKtdbclWeeklyReport({
              weekNumber,
              month,
              year,
              academicYearId: academicYearId || undefined,
              targetUserId: targetUid,
              items: rows,
            })
            if (res.success) {
              toast.success(`Đã lưu & nộp Báo cáo Tuần ${weekNumber} thành công`)
              await reloadSnapshot()
            } else {
              toast.error(res.error || "Không thể lưu báo cáo tuần")
            }
          }}
          onSubmitExplanation={async (payload) => {
            const res = await submitStaffOverdueExplanationAction(payload)
            if (res.success) {
              toast.success("Đã gửi giải trình trễ tiến độ thành công")
              await reloadSnapshot()
            } else {
              toast.error(res.error || "Lỗi gửi giải trình")
            }
          }}
        />
      )}

      {activeTab === "automation" && (
        <AutomationAndRosterTab
          config={snapshot.automationConfig}
          logs={snapshot.automationLogs}
          members={snapshot.members}
          directorCandidates={snapshot.directorCandidates}
          taskGroups={snapshot.taskGroups}
          specialistGroupNames={snapshot.specialistGroupNames}
          isLeadership={snapshot.authority.isLeadership}
          onSaveConfig={async (patch) => {
            const res = await updateKtdbclAutomationSettingsAction(patch)
            if (res.success) {
              toast.success("Đã lưu cấu hình tự động hóa Ban KT&ĐBCL")
              await reloadSnapshot()
            } else {
              toast.error(res.error || "Lỗi lưu cấu hình")
            }
          }}
          onSaveSpecialistGroup={async (payload) => {
            const res = await updateKtdbclSpecialistGroupMembersAction(payload)
            if (res.success) {
              toast.success(`Đã cập nhật nhân sự nhóm ${payload.groupName}`)
              await reloadSnapshot()
            } else {
              toast.error(res.error || "Lỗi cập nhật nhóm")
            }
          }}
          onTriggerSaturdayPlanReminderNow={() => handleRemindSaturdayPlan()}
          onTriggerWednesdayReminderNow={() => handleRemindUnsubmitted()}
          onTriggerDirectorReportNow={(scope) => handleSendDirectorReport(scope)}
        />
      )}
    </div>
  )
}
