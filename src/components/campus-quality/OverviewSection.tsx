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
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  Pie,
  PieChart,
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
  if (n === null || n === undefined) return "—"
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

  // 1. Academic Quality Donut Data
  const passPct = aq.skylinePassRate ?? 0
  const academicDonutData =
    aq.skylinePassRate !== null
      ? [
          { name: "Đạt chuẩn Sky-Line", value: passPct, color: "#059669" },
          {
            name: "Chưa đạt chuẩn",
            value: Math.max(0, Number((100 - passPct).toFixed(1))),
            color: "#E11D48",
          },
        ]
      : [{ name: "Chưa cấu hình ngưỡng", value: 100, color: "#CBD5E1" }]

  // 2. Admissions Funnel Bar Data
  const admissionsChartData = [
    {
      name: "Khảo sát",
      value: ae.surveyedCount,
      color: "#003B3A",
      drillKey: "ENTRANCE_SURVEYED",
    },
    {
      name: "Đạt duyệt",
      value: ae.passedCount,
      color: "#059669",
      drillKey: "ENTRANCE_PASSED",
    },
    {
      name: "Nhập học",
      value: ae.enrolledCount,
      color: "#00A19A",
      drillKey: "ENTRANCE_ENROLLED",
    },
  ]

  // 3. Achievements Bar Data
  const achievementsChartData = [
    { name: "HS dự thi", value: ac.examParticipants, color: "#003B3A" },
    { name: "HS đạt giải", value: ac.awardedStudents, color: "#059669" },
    { name: "Chứng chỉ", value: ac.certificatesIssued, color: "#00A19A" },
  ]

  // 4. Observation Progress vs Plan Data
  const observationCompareData = [
    {
      metric: "Tiết dự giờ",
      actual: ob.observedLessons,
      plan: ob.plannedLessons,
    },
    {
      metric: "GV được dự",
      actual: ob.observedTeachers,
      plan: ob.plannedTeachers,
    },
  ]

  const compliantRate =
    ob.evaluatedTeachers > 0
      ? Math.round((ob.compliantTeachers / ob.evaluatedTeachers) * 100)
      : 0

  const compliantDonutData =
    ob.evaluatedTeachers > 0
      ? [
          { name: "Đáp ứng QĐ", value: ob.compliantTeachers, color: "#059669" },
          {
            name: "Cần hỗ trợ",
            value: Math.max(0, ob.evaluatedTeachers - ob.compliantTeachers),
            color: "#D97706",
          },
        ]
      : [{ name: "Chưa có phiếu", value: 1, color: "#E2E8F0" }]

  // 5. Psychology Status Donut Data
  const psychTotal = psy.activeTracking + psy.achievedGoal
  const psychChartData =
    psychTotal > 0
      ? [
          {
            name: "Đang theo dõi (trong hạn)",
            value: Math.max(0, psy.activeTracking - psy.dueForReview),
            color: "#003B3A",
          },
          { name: "Đến hạn rà soát", value: psy.dueForReview, color: "#D97706" },
          { name: "Đạt mục tiêu", value: psy.achievedGoal, color: "#059669" },
        ].filter((d) => d.value > 0)
      : [{ name: "Chưa có hồ sơ", value: 1, color: "#E2E8F0" }]

  return (
    <div className="space-y-5">
      {/* Khu vực 1: Thanh tổng quan Quy mô & biến động học sinh (Unified Academic Ledger Strip) */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
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
              Lộ trình cam kết <ArrowUpRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      </section>

      {/* Hàng 2: Biểu đồ Chất lượng học tập (Donut + Đối sánh) & Hàng đợi Cần xử lý */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Khu vực 2: Chất lượng học tập dạng biểu đồ */}
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

          <div className="p-5 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center flex-1 tabular-nums">
            {/* Donut tỷ lệ đạt chuẩn */}
            <div className="sm:col-span-5 relative h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={academicDonutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
                    startAngle={90}
                    endAngle={-270}
                    strokeWidth={2}
                  >
                    {academicDonutData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => `${val}%`}
                    contentStyle={{ fontSize: 12, borderRadius: 10, borderColor: "#E2E8F0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <button
                type="button"
                onClick={() => onNavigateTab("academic")}
                className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-auto"
              >
                <span className="text-xl font-bold text-[#003B3A]">
                  {aq.skylinePassRate !== null ? fmtPct(aq.skylinePassRate) : "—"}
                </span>
                <span className="text-[11px] text-slate-500">
                  {aq.skylinePassRate !== null ? "Đạt chuẩn SKL" : "Chưa cấu hình"}
                </span>
              </button>
            </div>

            {/* Đối sánh thanh ngang & 2 chỉ số HS cần lưu ý */}
            <div className="sm:col-span-7 space-y-3.5">
              {/* Thanh đối sánh Cơ sở vs Toàn hệ thống */}
              <div className="space-y-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Đối sánh tỷ lệ đạt chuẩn</span>
                  {aq.skylineDiffPp !== null && (
                    <span
                      className={`font-semibold ${
                        aq.skylineDiffPp >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {aq.skylineDiffPp >= 0 ? "+" : ""}
                      {aq.skylineDiffPp.toFixed(1).replace(".", ",")} đpt
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                      <span>Phạm vi đang xem</span>
                      <span className="font-semibold text-[#003B3A]">
                        {aq.skylinePassRate !== null ? fmtPct(aq.skylinePassRate) : "Chưa cấu hình ngưỡng"}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#003B3A] transition-all"
                        style={{ width: `${Math.min(100, aq.skylinePassRate ?? 0)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                      <span>Toàn hệ thống</span>
                      <span className="font-semibold text-[#00736E]">
                        {aq.systemSkylinePassRate !== null ? fmtPct(aq.systemSkylinePassRate) : "—"}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#00A19A] transition-all"
                        style={{ width: `${Math.min(100, aq.systemSkylinePassRate ?? 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2 nút mở danh sách HS dưới chuẩn / dưới trung bình */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onOpenDrilldown("ACADEMIC_BELOW_BENCHMARK")}
                  className="rounded-xl border border-[#E2E8F0] p-3 text-left hover:border-amber-400 transition-colors"
                >
                  <div className="text-[11px] text-slate-500">Số HS dưới chuẩn</div>
                  <div className="text-xl font-bold text-amber-700 mt-0.5">
                    {fmtNum(aq.belowBenchmarkStudents)}
                  </div>
                  <div className="text-[10px] text-slate-500">Đếm 1 lần/HS · Xem DS</div>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDrilldown("ACADEMIC_BELOW_5")}
                  className="rounded-xl border border-[#E2E8F0] p-3 text-left hover:border-rose-400 transition-colors"
                >
                  <div className="text-[11px] text-slate-500">Số HS dưới trung bình</div>
                  <div className="text-xl font-bold text-rose-700 mt-0.5">
                    {fmtNum(aq.belowAverageStudents)}
                  </div>
                  <div className="text-[10px] text-slate-500">Điểm &lt; 5,0 · Xem DS</div>
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 tabular-nums">
            <span>
              Hợp lệ: <strong>{fmtNum(aq.validScoreCount)}</strong> / {fmtNum(aq.expectedScoreCount)} dự kiến · Vắng: {fmtNum(aq.absentCount)} · Miễn: {fmtNum(aq.exemptCount)}
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

      {/* Hàng 3: Biểu đồ Phễu Tuyển sinh & Biểu đồ Thành tích - Chứng chỉ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Khu vực 3: Phễu Tuyển sinh & đầu vào */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#003B3A]" />
              <h2 className="text-sm font-semibold text-[#003B3A]">Tuyển sinh và đầu vào</h2>
            </div>
            <span className="text-xs text-slate-500">Lũy kế · {ae.scopeLabel}</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={admissionsChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 36, left: 10, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={72}
                    tick={{ fontSize: 11, fill: "#0F172A", fontWeight: 500 }}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, borderColor: "#E2E8F0" }} />
                  <Bar
                    dataKey="value"
                    name="Số học sinh"
                    radius={[0, 6, 6, 0]}
                    barSize={24}
                    onClick={(d: any) => d?.drillKey && onOpenDrilldown(d.drillKey)}
                    className="cursor-pointer"
                  >
                    {admissionsChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                    <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 600, fill: "#003B3A" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-[#F1F5F9] tabular-nums text-xs">
              <button
                type="button"
                onClick={() => onOpenDrilldown("ENTRANCE_SURVEYED")}
                className="rounded-lg bg-[#F8FAFC] hover:bg-[#F0FDFA] p-2.5 text-left transition-colors"
              >
                <div className="text-[11px] text-slate-500">HS khảo sát</div>
                <div className="text-base font-bold text-[#003B3A]">{fmtNum(ae.surveyedCount)}</div>
              </button>
              <button
                type="button"
                onClick={() => onOpenDrilldown("ENTRANCE_PASSED")}
                className="rounded-lg bg-[#F8FAFC] hover:bg-emerald-50 p-2.5 text-left transition-colors"
              >
                <div className="text-[11px] text-slate-500">Đạt ({fmtPct(ae.passRate)})</div>
                <div className="text-base font-bold text-emerald-700">{fmtNum(ae.passedCount)}</div>
              </button>
              <button
                type="button"
                onClick={() => onOpenDrilldown("ENTRANCE_ENROLLED")}
                className="rounded-lg bg-[#F8FAFC] hover:bg-[#F0FDFA] p-2.5 text-left transition-colors"
              >
                <div className="text-[11px] text-slate-500">Nhập học ({fmtPct(ae.enrollmentRate)})</div>
                <div className="text-base font-bold text-[#00736E]">{fmtNum(ae.enrolledCount)}</div>
              </button>
            </div>
          </div>
        </section>

        {/* Khu vực 4: Biểu đồ Thành tích và chứng chỉ */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#003B3A]" />
              <h2 className="text-sm font-semibold text-[#003B3A]">Thành tích và chứng chỉ</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("achievements")}
              className="text-xs font-medium text-[#00736E] hover:text-[#003B3A]"
            >
              Xem theo kỳ thi
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={achievementsChartData} margin={{ top: 14, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#0F172A", fontWeight: 500 }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, borderColor: "#E2E8F0" }} />
                  <Bar
                    dataKey="value"
                    name="Số lượng"
                    radius={[6, 6, 0, 0]}
                    barSize={40}
                    onClick={() => onNavigateTab("achievements")}
                    className="cursor-pointer"
                  >
                    {achievementsChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                    <LabelList dataKey="value" position="top" style={{ fontSize: 11, fontWeight: 600, fill: "#003B3A" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-[#F1F5F9] tabular-nums text-xs">
              <div className="rounded-lg bg-[#F8FAFC] p-2.5">
                <div className="text-[11px] text-slate-500">Tổng lượt dự thi</div>
                <div className="text-base font-bold text-[#003B3A]">{fmtNum(ac.examSittings)}</div>
              </div>
              <div className="rounded-lg bg-[#F8FAFC] p-2.5">
                <div className="text-[11px] text-slate-500">Tổng giải thưởng</div>
                <div className="text-base font-bold text-emerald-700">{fmtNum(ac.totalAwards)}</div>
              </div>
              <div className="rounded-lg bg-[#F8FAFC] p-2.5">
                <div className="text-[11px] text-slate-500">Chứng chỉ đã cấp</div>
                <div className="text-base font-bold text-[#00736E]">{fmtNum(ac.certificatesIssued)}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Hàng 4: Biểu đồ Dự giờ & PTCM + Biểu đồ Theo dõi tâm lý */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Khu vực 5: Dự giờ & PTCM */}
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
          <div className="p-5 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center tabular-nums">
            {/* Biểu đồ cột Thực hiện vs Kế hoạch */}
            <div className="sm:col-span-7 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={observationCompareData} margin={{ top: 10, right: 10, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "#0F172A" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, borderColor: "#E2E8F0" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="actual" name="Đã thực hiện" fill="#003B3A" radius={[4, 4, 0, 0]} barSize={26} />
                  <Bar dataKey="plan" name="Kế hoạch" fill="#CBD5E1" radius={[4, 4, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Donut GV dạy theo quy định + 2 nút hành động */}
            <div className="sm:col-span-5 space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3">
                <div className="w-16 h-16 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={compliantDonutData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={29}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {compliantDonutData.map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#003B3A]">
                    {compliantRate}%
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">GV dạy theo quy định</div>
                  <div className="text-lg font-bold text-emerald-700">
                    {fmtNum(ob.compliantTeachers)}/{fmtNum(ob.evaluatedTeachers)}
                  </div>
                  <div className="text-[10px] text-slate-500">Theo phiếu đã duyệt</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onOpenDrilldown("UNOBSERVED_TEACHERS")}
                  className="rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-50 p-2.5 text-left"
                >
                  <div className="text-[10px] text-amber-800">GV chưa dự giờ</div>
                  <div className="text-base font-bold text-amber-700">{fmtNum(ob.unobservedTeachers)}</div>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDrilldown("PENDING_OBSERVATION_FORMS")}
                  className="rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-50 p-2.5 text-left"
                >
                  <div className="text-[10px] text-rose-800">Phiếu chờ duyệt</div>
                  <div className="text-base font-bold text-rose-700">{fmtNum(ob.pendingReviewForms)}</div>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Khu vực 6: Biểu đồ Theo dõi tâm lý */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col">
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
            <div className="p-6 flex items-center gap-3 text-xs text-slate-500 flex-1">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Hồ sơ tâm lý áp dụng phân quyền riêng của phân hệ. Tài khoản hiện tại không có quyền xem.</span>
            </div>
          ) : (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center flex-1 tabular-nums">
              <div className="sm:col-span-5 h-40 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={psychChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={60}
                      strokeWidth={2}
                    >
                      {psychChartData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, borderColor: "#E2E8F0" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-[#003B3A]">{fmtNum(psy.activeTracking)}</span>
                  <span className="text-[10px] text-slate-500">Đang theo dõi</span>
                </div>
              </div>
              <div className="sm:col-span-7 space-y-2">
                <button
                  type="button"
                  onClick={() => onOpenDrilldown("PSYCHOLOGY_ACTIVE")}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[#E2E8F0] hover:border-[#00A19A] text-xs"
                >
                  <span className="text-slate-600">HS đang theo dõi</span>
                  <span className="font-bold text-[#003B3A]">{fmtNum(psy.activeTracking)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDrilldown("PSYCHOLOGY_DUE")}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-xs"
                >
                  <span className="text-amber-800">HS đến hạn rà soát</span>
                  <span className="font-bold text-amber-700">{fmtNum(psy.dueForReview)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDrilldown("PSYCHOLOGY_ACHIEVED")}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-xs"
                >
                  <span className="text-emerald-800">HS đạt mục tiêu</span>
                  <span className="font-bold text-emerald-700">{fmtNum(psy.achievedGoal)}</span>
                </button>
              </div>
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
