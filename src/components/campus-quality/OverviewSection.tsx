"use client"

import React, { useState } from "react"
import {
  AlertCircle,
  ArrowUpRight,
  Award,
  BookOpen,
  ClipboardCheck,
  Globe,
  HeartHandshake,
  Lock,
  UserPlus,
  Users,
} from "lucide-react"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { DashboardTabKey, OverviewPayload } from "@/lib/campus-quality/types"

interface OverviewSectionProps {
  data: OverviewPayload
  onNavigateTab: (tab: DashboardTabKey, opts?: { focus?: string }) => void
  onOpenDrilldown: (drilldownKey: string) => void
}

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("vi-VN")
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "Chưa cấu hình ngưỡng"
  return `${n.toFixed(1).replace(".", ",")}%`
}

export function OverviewSection({
  data,
  onNavigateTab,
  onOpenDrilldown,
}: OverviewSectionProps) {
  const [mobilityView, setMobilityView] = useState<"CHART" | "TABLE">("CHART")
  const {
    scaleAndMobility: sm,
    academicQuality: aq,
    admissionsAndEntrance: ae,
    achievementsAndCerts: ac,
    observationAndGrowth: ob,
    psychologyTracking: psy,
    actionQueue: q,
  } = data

  return (
    <div className="space-y-5">
      {/* Khu vực 1: Quy mô và biến động học sinh */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#003B3A]" />
            <h2 className="text-sm font-semibold text-[#003B3A]">Quy mô và biến động học sinh</h2>
          </div>
          <span className="text-xs text-slate-500">
            Mốc dữ liệu: Trong năm học {data.timeContext.academicYearLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0] tabular-nums">
          <button
            type="button"
            onClick={() => onNavigateTab("admissions")}
            className="p-4 text-left hover:bg-[#F8FAFC] transition-colors"
          >
            <div className="text-xs text-slate-500">Sĩ số hiện tại</div>
            <div className="text-2xl font-bold text-[#003B3A] mt-1">{fmtNum(sm.activeStudents)}</div>
            <div className="text-[11px] text-slate-500 mt-1">Học sinh đang học</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("academic")}
            className="p-4 text-left hover:bg-[#F8FAFC] transition-colors"
          >
            <div className="text-xs text-slate-500">Số lớp</div>
            <div className="text-2xl font-bold text-[#003B3A] mt-1">{fmtNum(sm.totalClasses)}</div>
            <div className="text-[11px] text-slate-500 mt-1">Lớp hoạt động</div>
          </button>

          <button
            type="button"
            onClick={() => onOpenDrilldown("ENTRANCE_ENROLLED")}
            className="p-4 text-left hover:bg-[#F8FAFC] transition-colors"
          >
            <div className="text-xs text-slate-500">Nhập học mới</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">+{fmtNum(sm.newEnrollments)}</div>
            <div className="text-[11px] text-slate-500 mt-1">Đã xác nhận nhập học</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("admissions")}
            className="p-4 text-left hover:bg-[#F8FAFC] transition-colors"
          >
            <div className="text-xs text-slate-500">Chuyển đến</div>
            <div className="text-2xl font-bold text-[#00736E] mt-1">+{fmtNum(sm.transferredIn)}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Nội bộ {sm.transferredInInternal} · Ngoài {sm.transferredInExternal}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("admissions")}
            className="p-4 text-left hover:bg-[#F8FAFC] transition-colors"
          >
            <div className="text-xs text-slate-500">Chuyển đi</div>
            <div className="text-2xl font-bold text-rose-700 mt-1">-{fmtNum(sm.transferredOut)}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Nội bộ {sm.transferredOutInternal} · Ngoài {sm.transferredOutExternal}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("support", { focus: "commitment" })}
            className="p-4 text-left hover:bg-[#F8FAFC] transition-colors"
          >
            <div className="text-xs text-slate-500">HS cam kết đầu vào</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{fmtNum(sm.commitmentStudents)}</div>
            <div className="text-[11px] text-[#00736E] mt-1 inline-flex items-center gap-0.5">
              Xem lộ trình cam kết <ArrowUpRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      </section>

      {/* Hàng 2: Chất lượng học tập + Cần xử lý */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Khu vực 2: Chất lượng học tập */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#003B3A]" />
              <h2 className="text-sm font-semibold text-[#003B3A]">Chất lượng học tập</h2>
              <span className="text-xs text-slate-500">· {aq.periodLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("academic", { focus: "international" })}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#00736E] hover:text-[#003B3A] px-2.5 py-1 rounded-lg bg-[#F0FDFA] border border-[#99F6E4]"
            >
              <Globe className="w-3.5 h-3.5" />
              Môn học Quốc tế ({fmtNum(aq.internationalSubjectsCount)})
            </button>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums flex-1">
            <button
              type="button"
              onClick={() => onNavigateTab("academic")}
              className="rounded-xl border border-[#E2E8F0] p-4 text-left hover:border-[#00A19A] transition-colors"
            >
              <div className="text-xs text-slate-500">Tỷ lệ đạt chuẩn Sky-Line</div>
              <div className="text-2xl font-bold text-[#003B3A] mt-1.5">
                {aq.skylinePassRate !== null ? fmtPct(aq.skylinePassRate) : "—"}
              </div>
              {aq.skylinePassRate === null ? (
                <div className="text-[11px] text-amber-700 mt-1">Chưa cấu hình ngưỡng</div>
              ) : (
                <div className="text-[11px] text-slate-600 mt-1">
                  Hệ thống: {fmtPct(aq.systemSkylinePassRate)}
                  {aq.skylineDiffPp !== null && (
                    <span
                      className={`ml-1.5 font-semibold ${
                        aq.skylineDiffPp >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      ({aq.skylineDiffPp >= 0 ? "+" : ""}
                      {aq.skylineDiffPp.toFixed(1).replace(".", ",")} đpt)
                    </span>
                  )}
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenDrilldown("ACADEMIC_BELOW_BENCHMARK")}
              className="rounded-xl border border-[#E2E8F0] p-4 text-left hover:border-amber-400 transition-colors"
            >
              <div className="text-xs text-slate-500">Số HS dưới chuẩn</div>
              <div className="text-2xl font-bold text-amber-700 mt-1.5">
                {fmtNum(aq.belowBenchmarkStudents)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Đếm mỗi HS một lần · Bấm xem DS
              </div>
            </button>

            <button
              type="button"
              onClick={() => onOpenDrilldown("ACADEMIC_BELOW_5")}
              className="rounded-xl border border-[#E2E8F0] p-4 text-left hover:border-rose-400 transition-colors"
            >
              <div className="text-xs text-slate-500">Số HS dưới trung bình</div>
              <div className="text-2xl font-bold text-rose-700 mt-1.5">
                {fmtNum(aq.belowAverageStudents)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Điểm &lt; 5,0 · Bấm xem DS
              </div>
            </button>
          </div>
          <div className="px-5 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 tabular-nums">
            <span>
              Kết quả hợp lệ: <strong>{fmtNum(aq.validScoreCount)}</strong> / {fmtNum(aq.expectedScoreCount)} dự kiến · Vắng: {fmtNum(aq.absentCount)} · Miễn: {fmtNum(aq.exemptCount)}
            </span>
            {aq.unconfiguredBenchmarkSubjects > 0 && (
              <span className="text-amber-700 font-medium">
                {aq.unconfiguredBenchmarkSubjects} môn chưa cấu hình ngưỡng
              </span>
            )}
          </div>
        </section>

        {/* Khu vực 7: Cần xử lý */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-semibold text-[#003B3A]">Cần xử lý</h2>
            </div>
            <span className="text-xs text-slate-500">Trong phạm vi phụ trách</span>
          </div>
          <div className="divide-y divide-[#E2E8F0] flex-1 tabular-nums">
            <button
              type="button"
              onClick={() => onOpenDrilldown("ENTRANCE_PENDING_CURRENT_MONTH")}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors text-left"
            >
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  Đầu vào chờ xét duyệt · {q.pendingEntranceCurrentMonth.monthLabel}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Hồ sơ khảo sát tháng hiện tại còn ở trạng thái chờ duyệt
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  q.pendingEntranceCurrentMonth.count > 0
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {fmtNum(q.pendingEntranceCurrentMonth.count)} hồ sơ
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenDrilldown("INCOMPLETE_GRADE_CLASSES")}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors text-left"
            >
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  Lớp chưa đủ điểm · {aq.periodLabel}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Còn thiếu {fmtNum(q.incompleteGradeClasses.missingEntries)} lượt điểm chưa nhập
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  q.incompleteGradeClasses.count > 0
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {fmtNum(q.incompleteGradeClasses.count)} lớp
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenDrilldown("UNOBSERVED_TEACHERS")}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors text-left"
            >
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  GV chưa được dự giờ · {q.unobservedTeachers.monthLabel}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Rà soát kế hoạch dự giờ theo tổ chuyên môn
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  q.unobservedTeachers.count > 0
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {fmtNum(q.unobservedTeachers.count)} GV
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* Hàng 3: Tuyển sinh & đầu vào + Thành tích & chứng chỉ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Khu vực 3: Tuyển sinh và đầu vào */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#003B3A]" />
              <h2 className="text-sm font-semibold text-[#003B3A]">Tuyển sinh và đầu vào</h2>
            </div>
            <span className="text-xs text-slate-500">Lũy kế · {ae.scopeLabel}</span>
          </div>
          <div className="p-5 grid grid-cols-3 gap-3 tabular-nums">
            <button
              type="button"
              onClick={() => onOpenDrilldown("ENTRANCE_SURVEYED")}
              className="rounded-xl border border-[#E2E8F0] p-3.5 text-left hover:border-[#00A19A] transition-colors"
            >
              <div className="text-xs text-slate-500">Số HS khảo sát</div>
              <div className="text-xl font-bold text-[#003B3A] mt-1">{fmtNum(ae.surveyedCount)}</div>
              <div className="text-[11px] text-[#00736E] mt-1">Xem danh sách</div>
            </button>

            <button
              type="button"
              onClick={() => onOpenDrilldown("ENTRANCE_PASSED")}
              className="rounded-xl border border-[#E2E8F0] p-3.5 text-left hover:border-emerald-400 transition-colors"
            >
              <div className="text-xs text-slate-500">Đạt (đã duyệt)</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">{fmtNum(ae.passedCount)}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {ae.passRate !== null ? `${ae.passRate.toFixed(1).replace(".", ",")}% đạt` : "—"}
              </div>
            </button>

            <button
              type="button"
              onClick={() => onOpenDrilldown("ENTRANCE_ENROLLED")}
              className="rounded-xl border border-[#E2E8F0] p-3.5 text-left hover:border-[#00A19A] transition-colors"
            >
              <div className="text-xs text-slate-500">Nhập học</div>
              <div className="text-xl font-bold text-[#00736E] mt-1">{fmtNum(ae.enrolledCount)}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {ae.enrollmentRate !== null
                  ? `${ae.enrollmentRate.toFixed(1).replace(".", ",")}% trên số đạt`
                  : "—"}
              </div>
            </button>
          </div>
        </section>

        {/* Khu vực 4: Thành tích và chứng chỉ */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#003B3A]" />
              <h2 className="text-sm font-semibold text-[#003B3A]">Thành tích và chứng chỉ</h2>
            </div>
            <span className="text-xs text-slate-500">{ac.scopeLabel}</span>
          </div>
          <div className="p-5 grid grid-cols-3 gap-3 tabular-nums">
            <button
              type="button"
              onClick={() => onNavigateTab("achievements")}
              className="rounded-xl border border-[#E2E8F0] p-3.5 text-left hover:border-[#00A19A] transition-colors"
            >
              <div className="text-xs text-slate-500">Số HS dự thi</div>
              <div className="text-xl font-bold text-[#003B3A] mt-1">{fmtNum(ac.examParticipants)}</div>
              <div className="text-[11px] text-slate-500 mt-1">{fmtNum(ac.examSittings)} lượt thi</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("achievements")}
              className="rounded-xl border border-[#E2E8F0] p-3.5 text-left hover:border-emerald-400 transition-colors"
            >
              <div className="text-xs text-slate-500">Số HS đạt giải</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">{fmtNum(ac.awardedStudents)}</div>
              <div className="text-[11px] text-slate-500 mt-1">{fmtNum(ac.totalAwards)} giải / đạt mục tiêu</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("achievements")}
              className="rounded-xl border border-[#E2E8F0] p-3.5 text-left hover:border-[#00A19A] transition-colors"
            >
              <div className="text-xs text-slate-500">Chứng chỉ đã cấp</div>
              <div className="text-xl font-bold text-[#00736E] mt-1">{fmtNum(ac.certificatesIssued)}</div>
              <div className="text-[11px] text-[#00736E] mt-1">Chi tiết theo kỳ thi</div>
            </button>
          </div>
        </section>
      </div>

      {/* Hàng 4: Dự giờ & PTCM + Theo dõi tâm lý */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Khu vực 5: Dự giờ và phát triển chuyên môn */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-[#003B3A]" />
              <h2 className="text-sm font-semibold text-[#003B3A]">
                Dự giờ và phát triển chuyên môn
              </h2>
            </div>
            <span className="text-xs text-slate-500">{ob.monthLabel}</span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-5 gap-3 tabular-nums">
            <button
              type="button"
              onClick={() => onNavigateTab("observation")}
              className="rounded-xl border border-[#E2E8F0] p-3 text-left hover:border-[#00A19A]"
            >
              <div className="text-[11px] text-slate-500">Tiết dự giờ / KH</div>
              <div className="text-lg font-bold text-[#003B3A] mt-1">
                {fmtNum(ob.observedLessons)}/{fmtNum(ob.plannedLessons)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab("observation")}
              className="rounded-xl border border-[#E2E8F0] p-3 text-left hover:border-[#00A19A]"
            >
              <div className="text-[11px] text-slate-500">GV được dự / KH</div>
              <div className="text-lg font-bold text-[#003B3A] mt-1">
                {fmtNum(ob.observedTeachers)}/{fmtNum(ob.plannedTeachers)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onOpenDrilldown("UNOBSERVED_TEACHERS")}
              className="rounded-xl border border-[#E2E8F0] p-3 text-left hover:border-amber-400"
            >
              <div className="text-[11px] text-slate-500">GV chưa được dự</div>
              <div className="text-lg font-bold text-amber-700 mt-1">
                {fmtNum(ob.unobservedTeachers)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab("observation")}
              className="rounded-xl border border-[#E2E8F0] p-3 text-left hover:border-emerald-400"
            >
              <div className="text-[11px] text-slate-500">GV dạy theo QĐ</div>
              <div className="text-lg font-bold text-emerald-700 mt-1">
                {fmtNum(ob.compliantTeachers)}/{fmtNum(ob.evaluatedTeachers)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onOpenDrilldown("PENDING_OBSERVATION_FORMS")}
              className="rounded-xl border border-[#E2E8F0] p-3 text-left hover:border-rose-400"
            >
              <div className="text-[11px] text-slate-500">Phiếu chờ duyệt</div>
              <div className="text-lg font-bold text-rose-700 mt-1">
                {fmtNum(ob.pendingReviewForms)}
              </div>
            </button>
          </div>
        </section>

        {/* Khu vực 6: Theo dõi tâm lý */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-[#003B3A]" />
              <h2 className="text-sm font-semibold text-[#003B3A]">Theo dõi tâm lý</h2>
              <span className="text-xs text-slate-500">· {psy.monthLabel}</span>
            </div>
            {psy.canView && (
              <button
                type="button"
                onClick={() => onNavigateTab("support", { focus: "psychology-owner" })}
                className="text-xs font-medium text-[#00736E] hover:text-[#003B3A]"
              >
                Xem theo người phụ trách
              </button>
            )}
          </div>
          {!psy.canView ? (
            <div className="p-6 flex items-center gap-3 text-xs text-slate-500">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Hồ sơ tâm lý áp dụng phân quyền riêng của phân hệ. Tài khoản hiện tại không có quyền xem.</span>
            </div>
          ) : (
            <div className="p-5 grid grid-cols-3 gap-3 tabular-nums">
              <button
                type="button"
                onClick={() => onOpenDrilldown("PSYCHOLOGY_ACTIVE")}
                className="rounded-xl border border-[#E2E8F0] p-3 text-left hover:border-[#00A19A]"
              >
                <div className="text-[11px] text-slate-500">HS đang theo dõi</div>
                <div className="text-lg font-bold text-[#003B3A] mt-1">
                  {fmtNum(psy.activeTracking)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => onOpenDrilldown("PSYCHOLOGY_DUE")}
                className="rounded-xl border border-[#E2E8F0] p-3 text-left hover:border-amber-400"
              >
                <div className="text-[11px] text-slate-500">Đến hạn rà soát</div>
                <div className="text-lg font-bold text-amber-700 mt-1">
                  {fmtNum(psy.dueForReview)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => onOpenDrilldown("PSYCHOLOGY_ACHIEVED")}
                className="rounded-xl border border-[#E2E8F0] p-3 text-left hover:border-emerald-400"
              >
                <div className="text-[11px] text-slate-500">Đạt mục tiêu</div>
                <div className="text-lg font-bold text-emerald-700 mt-1">
                  {fmtNum(psy.achievedGoal)}
                </div>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Cuối trang: Biểu đồ / Bảng nhập học, chuyển đến và chuyển đi theo tháng kèm lũy kế */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#003B3A]">
              Biến động nhập học, chuyển đến và chuyển đi theo tháng
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Lũy kế năm học {data.timeContext.academicYearLabel}: Nhập mới +{fmtNum(sm.newEnrollments)} · Chuyển đến +{fmtNum(sm.transferredIn)} · Chuyển đi -{fmtNum(sm.transferredOut)}
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-[#E2E8F0] p-0.5 bg-[#F8FAFC] text-xs">
            <button
              type="button"
              onClick={() => setMobilityView("CHART")}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                mobilityView === "CHART" ? "bg-[#003B3A] text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Biểu đồ
            </button>
            <button
              type="button"
              onClick={() => setMobilityView("TABLE")}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                mobilityView === "TABLE" ? "bg-[#003B3A] text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bảng chi tiết & lũy kế
            </button>
          </div>
        </div>

        {mobilityView === "CHART" ? (
          <div className="p-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sm.monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 11, fill: "#475569" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, borderColor: "#E2E8F0" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="newEnrollments" name="Nhập học mới" fill="#003B3A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalIn" name="Chuyển đến" fill="#00A19A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalOut" name="Chuyển đi" fill="#E11D48" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="cumulativeNew"
                  name="Lũy kế nhập mới"
                  stroke="#D97706"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-white whitespace-nowrap">Tháng</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Nhập học mới</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Chuyển đến</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Chuyển đi</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">Biến động ròng</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Lũy kế nhập mới</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Lũy kế chuyển đến</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-teal-100 whitespace-nowrap">Lũy kế chuyển đi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {sm.monthlySeries.map((m) => (
                  <tr key={m.monthKey} className="hover:bg-[#F8FAFC] transition-colors align-middle">
                    <td className="py-3 px-3 font-medium text-slate-900">{m.monthLabel}</td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-medium">+{fmtNum(m.newEnrollments)}</td>
                    <td className="py-3 px-3 text-right text-[#00736E]">+{fmtNum(m.totalIn)}</td>
                    <td className="py-3 px-3 text-right text-rose-700">-{fmtNum(m.totalOut)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-[#003B3A]">
                      {m.netChange >= 0 ? `+${fmtNum(m.netChange)}` : fmtNum(m.netChange)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">{fmtNum(m.cumulativeNew)}</td>
                    <td className="py-3 px-3 text-right text-slate-700">{fmtNum(m.cumulativeIn)}</td>
                    <td className="py-3 px-3 text-right text-slate-700">{fmtNum(m.cumulativeOut)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
