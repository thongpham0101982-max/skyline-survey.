"use client"

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  TrendingUp,
  HeartHandshake,
  ArrowUpRight,
  BellRing,
  RefreshCw,
  ShieldCheck,
  BookOpen,
  Hourglass,
  ExternalLink,
} from "lucide-react"
import {
  SSMTask,
  TaskSummaryCounts,
  SeparatedProgressAndKPI,
  UnifiedTeacherAssignmentProfile,
} from "@/services/taskEngine/types"


export function TeacherWorkspaceOverviewPanel() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [triggeringReminder, setTriggeringReminder] = useState(false)
  const [profile, setProfile] = useState<UnifiedTeacherAssignmentProfile | null>(null)
  const [counts, setCounts] = useState<TaskSummaryCounts | null>(null)
  const [priorityIssues, setPriorityIssues] = useState<SSMTask[]>([])
  const [progressAndKPI, setProgressAndKPI] = useState<SeparatedProgressAndKPI | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string>("")

  const fetchWorkspace = useCallback(async (force = false) => {
    if (force) setRefreshing(true)
    try {
      const yearId =
        typeof window !== "undefined"
          ? localStorage.getItem("academicYearId") || localStorage.getItem("selectedAcademicYear") || ""
          : ""
      const res = await fetch(
        `/api/teacher/workspace?academicYearId=${encodeURIComponent(yearId)}${force ? "&refresh=true" : ""}`
      )
      if (res.ok) {
        const json = await res.json()
        setProfile(json.profile || null)
        setCounts(json.counts || null)
        setPriorityIssues(json.priorityIssues || [])
        setProgressAndKPI(json.progressAndKPI || null)
        setUpdatedAt(
          json.updatedAt
            ? new Date(json.updatedAt).toLocaleTimeString("vi-VN")
            : new Date().toLocaleTimeString("vi-VN")
        )
      }
    } catch (err) {
      console.error("[TeacherWorkspaceOverviewPanel] Load error:", err)
    } finally {
      setLoading(false)
      if (force) setTimeout(() => setRefreshing(false), 300)
    }
  }, [])

  useEffect(() => {
    fetchWorkspace(false)
    const onYearChanged = () => fetchWorkspace(true)
    window.addEventListener("academicYearChanged", onYearChanged)
    return () => window.removeEventListener("academicYearChanged", onYearChanged)
  }, [fetchWorkspace])

  const handleRunReminderCheck = async () => {
    setTriggeringReminder(true)
    try {
      await fetch("/api/teacher/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RUN_REMINDER_CHECK", forceDispatch: true }),
      })
      await fetchWorkspace(true)
    } catch (err) {
      console.error("Run reminder check error:", err)
    } finally {
      setTriggeringReminder(false)
    }
  }

  if (loading && !progressAndKPI) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs flex items-center justify-center gap-2 text-xs text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin text-[#00A19A]" />
        <span>Đang đồng bộ Sổ Giáo Viên & 9 phân hệ nghiệp vụ Sky-Line...</span>
      </div>
    )
  }

  if (!progressAndKPI || !counts) return null

  const kpiStatusBadge =
    progressAndKPI.kpiAttainment.overallStatus === "MET"
      ? { label: "Đạt chuẩn KPI", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" }
      : progressAndKPI.kpiAttainment.overallStatus === "PARTIAL"
      ? { label: "Đạt một phần KPI", bg: "bg-amber-50 text-amber-800 border-amber-200" }
      : { label: "Chưa đạt KPI", bg: "bg-rose-50 text-rose-700 border-rose-200" }

  return (
    <div className="space-y-5">
      {/* 1. SKY-LINE TASK ASSISTANT WIDGET TRÊN DASHBOARD */}


      {/* 2. BẢNG ĐIỀU HÀNH TRUNG TÂM SỔ GIÁO VIÊN (TEACHER WORKSPACE COMMAND CENTER) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#003B3A]/5 via-teal-50/40 to-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#003B3A] text-[#5EEAD4] flex items-center justify-center shadow-xs shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Sổ Giáo Viên — Trung Tâm Điều Hành Cá Nhân
                </h2>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${kpiStatusBadge.bg}`}>
                  {kpiStatusBadge.label} ({progressAndKPI.kpiAttainment.metCriteriaCount}/{progressAndKPI.kpiAttainment.totalCriteriaCount})
                </span>
                {profile && profile.campuses.length > 1 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    Đa cơ sở ({profile.campuses.length})
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Liên thông tự động 9 phân hệ SSM • Cập nhật lúc {updatedAt} • Một nguồn dữ liệu thống nhất
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleRunReminderCheck}
              disabled={triggeringReminder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
              title="Kiểm tra hạn & tổng hợp nhắc việc thông minh"
            >
              <BellRing className={`w-3.5 h-3.5 text-amber-600 ${triggeringReminder ? "animate-bounce" : ""}`} />
              <span>Rà soát nhắc hạn</span>
            </button>

            <Link
              href="/teacher/tasks"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#00A19A] hover:bg-[#008B85] text-white shadow-xs transition-all"
            >
              <span>Mở Task Center ({counts.thisWeek})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 5 Chỉ số tổng quan Nhiệm vụ (Tổng giao, Tiến độ, Đã hoàn thành, Chờ duyệt, Quá hạn) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/40 tabular-nums">
          <Link href="/teacher/tasks" className="p-3.5 hover:bg-white transition-colors">
            <div className="text-[11px] font-semibold text-slate-500">Tổng nhiệm vụ giao</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              {progressAndKPI.volumeProgress.totalAssignedTasks}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Đang thực hiện: {counts.thisWeek} việc
            </div>
          </Link>

          <Link href="/teacher/tasks" className="p-3.5 hover:bg-white transition-colors">
            <div className="text-[11px] font-semibold text-slate-500">Tiến độ khối lượng</div>
            <div className="text-xl font-black text-[#00A19A] mt-0.5">
              {progressAndKPI.volumeProgress.completionRate}%
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-[#00A19A] rounded-full transition-all"
                style={{ width: `${Math.min(100, progressAndKPI.volumeProgress.completionRate)}%` }}
              />
            </div>
          </Link>

          <Link href="/teacher/tasks?filter=COMPLETED" className="p-3.5 hover:bg-white transition-colors">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Đã hoàn thành</span>
            </div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">
              {progressAndKPI.volumeProgress.completedTasks}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Đã công nhận hợp lệ
            </div>
          </Link>

          <Link href="/teacher/tasks?filter=WAITING" className="p-3.5 hover:bg-white transition-colors">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Hourglass className="w-3 h-3 text-sky-600" />
              <span>Đang chờ duyệt</span>
            </div>
            <div className="text-xl font-black text-sky-600 mt-0.5">
              {counts.waitingApproval}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Tạm ngừng nhắc việc
            </div>
          </Link>

          <Link
            href="/teacher/tasks?filter=OVERDUE"
            className="p-3.5 hover:bg-white transition-colors col-span-2 sm:col-span-1"
          >
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>Nhiệm vụ quá hạn</span>
            </div>
            <div className="text-xl font-black text-rose-600 mt-0.5">
              {counts.overdue}
            </div>
            <div className="text-[10px] text-rose-500 font-medium mt-0.5">
              Sắp đến hạn 48h: {progressAndKPI.deadlineCompliance.dueSoonCount}
            </div>
          </Link>
        </div>

        {/* 6 Nhóm Chỉ số Tiến độ & KPI Độc Lập (Mục VII: Không gộp chung các chỉ số khác bản chất) */}
        <div className="p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00A19A]" />
                <span>6 Thước Đo Tiến Độ & KPI Độc Lập (Chuẩn Kiểm Toán Sky-Line)</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Định mức cấu hình động theo năm học {profile?.academicYearName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 tabular-nums">
              {/* 1. Tiến độ hoàn thành khối lượng */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">1. Tiến độ khối lượng</span>
                  <span className="text-xs font-black text-[#00736E] bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                    {progressAndKPI.volumeProgress.completionRate}%
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                  <div>
                    • Sổ điểm: <strong>{progressAndKPI.volumeProgress.gradebookEnteredCount}/{progressAndKPI.volumeProgress.gradebookTotalExpected}</strong> HS
                  </div>
                  <div>
                    • Đánh giá năng lực: <strong>{progressAndKPI.volumeProgress.competencyEvaluatedCount}/{progressAndKPI.volumeProgress.competencyTotalExpected}</strong> HS
                  </div>
                </div>
              </div>

              {/* 2. Tiến độ được phê duyệt / công nhận */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">2. Tỷ lệ được phê duyệt</span>
                  <span className="text-xs font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200">
                    {progressAndKPI.approvalProgress.approvalRate}%
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                  <div>
                    • Đã duyệt: <strong>{progressAndKPI.approvalProgress.approvedItems}</strong> | Chờ duyệt: <strong>{progressAndKPI.approvalProgress.waitingApprovalItems}</strong>
                  </div>
                  <div>
                    • Phiếu dự giờ hợp lệ: <strong>{progressAndKPI.approvalProgress.breakdown.observationsApproved}</strong> phiếu
                  </div>
                </div>
              </div>

              {/* 3. Mức độ tuân thủ thời hạn */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">3. Tuân thủ thời hạn</span>
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                      progressAndKPI.deadlineCompliance.overdueCount === 0
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : "text-rose-700 bg-rose-50 border-rose-200"
                    }`}
                  >
                    {progressAndKPI.deadlineCompliance.complianceRate}%
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                  <div>
                    • Đúng hạn: <strong>{progressAndKPI.deadlineCompliance.onTimeCount}</strong> | Quá hạn: <strong className="text-rose-600">{progressAndKPI.deadlineCompliance.overdueCount}</strong>
                  </div>
                  <div>
                    • Sắp đến hạn (trong 48h): <strong>{progressAndKPI.deadlineCompliance.dueSoonCount}</strong> việc
                  </div>
                </div>
              </div>

              {/* 4. Mức đạt KPI theo quy định */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>4. Định mức KPI quy định</span>
                  </span>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border ${kpiStatusBadge.bg}`}>
                    {progressAndKPI.kpiAttainment.metCriteriaCount}/{progressAndKPI.kpiAttainment.totalCriteriaCount} chỉ tiêu
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                  <div>
                    • KPI Dự giờ tháng {progressAndKPI.kpiAttainment.observationQuota.currentMonth}:{" "}
                    <strong>
                      {progressAndKPI.kpiAttainment.observationQuota.observedValidCount}/
                      {progressAndKPI.kpiAttainment.observationQuota.requiredObservedQuota} tiết
                    </strong>{" "}
                    ({progressAndKPI.kpiAttainment.observationQuota.isObservationMet ? "✅ Đạt" : `Thiếu ${progressAndKPI.kpiAttainment.observationQuota.deficitPeriods} tiết`})
                  </div>
                  <div>
                    • Hoàn thành sổ điểm lớp: <strong>{progressAndKPI.kpiAttainment.gradebookQuota.completedClassesCount}/{progressAndKPI.kpiAttainment.gradebookQuota.totalAssignedClassesCount}</strong> lớp
                  </div>
                </div>
              </div>

              {/* 5. Chỉ số chất lượng giảng dạy */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>5. Chất lượng giảng dạy</span>
                  </span>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    Đạt chuẩn {progressAndKPI.teachingQuality.passRate}%
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                  <div>
                    • ĐTB chung: <strong>{progressAndKPI.teachingQuality.averageScore ?? "N/A"}</strong> | Tiến bộ: <strong>{progressAndKPI.teachingQuality.progressRate}%</strong>
                  </div>
                  <div>
                    • Học sinh dưới chuẩn Benchmark: <strong className="text-amber-700">{progressAndKPI.teachingQuality.underBenchmarkCount} HS</strong>
                  </div>
                </div>
              </div>

              {/* 6. Hiệu quả hỗ trợ học sinh */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
                    <span>6. Hiệu quả hỗ trợ HS</span>
                  </span>
                  <span className="text-xs font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                    {progressAndKPI.studentSupportEffectiveness.supportCoverageRate}%
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                  <div>
                    • Mục tiêu SMART đã ký: <strong>{progressAndKPI.studentSupportEffectiveness.smartGoalsSignedCount}/{progressAndKPI.studentSupportEffectiveness.smartGoalsTotal}</strong> (Đạt: {progressAndKPI.studentSupportEffectiveness.smartGoalsAchievedCount})
                  </div>
                  <div>
                    • Giải quyết ý kiến PHHS: <strong>{progressAndKPI.studentSupportEffectiveness.parentFeedbacksResolvedCount}/{progressAndKPI.studentSupportEffectiveness.parentFeedbacksTotal}</strong> | Cảnh báo Đỏ/Vàng: <strong>{progressAndKPI.studentSupportEffectiveness.atRiskTotal}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bảng Chất Lượng Các Môn Được Phân Công & Những Vấn Đề Cần Ưu Tiên Xử Lý */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Chất lượng các môn được phân công (7 cột) */}
            <div className="lg:col-span-7 border border-slate-200/80 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/70 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#00A19A]" />
                  <span>Chất lượng các môn & lớp được phân công ({progressAndKPI.teachingQuality.bySubjectClass.length})</span>
                </span>
                <Link
                  href="/teacher/phan-tich-chat-luong"
                  className="text-[11px] font-bold text-[#00736E] hover:underline flex items-center gap-1"
                >
                  <span>Phân tích chi tiết</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {progressAndKPI.teachingQuality.bySubjectClass.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Chưa có dữ liệu phân công bộ môn trong năm học này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left tabular-nums">
                    <thead className="bg-slate-50/60 text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Lớp / Môn</th>
                        <th className="py-2 px-2.5 font-semibold text-center">Vào điểm</th>
                        <th className="py-2 px-2.5 font-semibold text-center">ĐTB</th>
                        <th className="py-2 px-2.5 font-semibold text-center">Đạt chuẩn</th>
                        <th className="py-2 px-2.5 font-semibold text-center">Dưới chuẩn</th>
                        <th className="py-2 px-3 font-semibold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {progressAndKPI.teachingQuality.bySubjectClass.slice(0, 6).map((item) => (
                        <tr key={`${item.classId}-${item.subjectId}`} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-800">{item.className}</div>
                            <div className="text-[11px] text-slate-500">{item.subjectName}</div>
                          </td>
                          <td className="py-2 px-2.5 text-center font-semibold">
                            {item.gradedStudents}/{item.totalStudents}
                          </td>
                          <td className="py-2 px-2.5 text-center font-bold text-slate-900">
                            {item.averageScore ?? "—"}
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.isQuotaMet
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-800"
                              }`}
                            >
                              {item.passRate}%
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            {item.underBenchmarkCount > 0 ? (
                              <span className="text-rose-600 font-bold">{item.underBenchmarkCount} HS</span>
                            ) : (
                              <span className="text-emerald-600 font-semibold">0</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Link
                              href={`/teacher/so-diem-nhan-xet?classId=${item.classId}&subjectId=${item.subjectId}`}
                              className="text-[11px] font-bold text-[#00A19A] hover:text-[#003B3A]"
                            >
                              Sổ điểm ↗
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Những vấn đề cần ưu tiên xử lý (5 cột) */}
            <div className="lg:col-span-5 border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-4 py-2.5 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Vấn đề cần ưu tiên xử lý ngay ({priorityIssues.length})</span>
                  </span>
                  <Link
                    href="/teacher/tasks"
                    className="text-[11px] font-bold text-rose-700 hover:underline"
                  >
                    Tất cả ↗
                  </Link>
                </div>

                {priorityIssues.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                    Không có công việc quá hạn hoặc khẩn cấp tồn đọng!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {priorityIssues.slice(0, 4).map((issue) => (
                      <Link
                        key={issue.taskId}
                        href={issue.deepLink}
                        className="p-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-2.5 group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                issue.status === "OVERDUE"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {issue.status === "OVERDUE" ? "QUÁ HẠN" : "ƯU TIÊN"}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 truncate">
                              {issue.metadata?.moduleLabel || issue.sourceModule}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-[#00A19A] line-clamp-1">
                            {issue.title}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Hạn: {issue.deadline}
                          </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#00A19A] shrink-0 mt-1" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">
                  Tự động đồng bộ từ 9 phân hệ nghiệp vụ
                </span>
                <Link href="/teacher/tasks" className="font-bold text-[#00736E] hover:underline">
                  Mở Trung tâm Nhiệm vụ →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
