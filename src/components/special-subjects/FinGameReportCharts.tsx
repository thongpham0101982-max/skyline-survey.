"use client";

import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type {
  GamificationMetricsSummary,
  GradeReportRow,
  StageReportRow
} from "@/lib/skyline-journey/reportService";

const SURVEY_COLORS = {
  VERY_LOVE: "#059669",
  LOVE: "#00A19A",
  NORMAL: "#D97706",
  NEED_SUPPORT: "#E11D48"
};

const STAGE_STATUS_COLORS = {
  COMPLETED: "#059669",
  WAITING: "#D97706",
  IN_PROGRESS: "#0284C7",
  NEEDS_REVISION: "#E11D48"
};

interface OverviewChartsProps {
  overview: GamificationMetricsSummary;
  gradeSummary: GradeReportRow[];
}

export function FinGameOverviewCharts({ overview, gradeSummary }: OverviewChartsProps) {
  const [barMode, setBarMode] = useState<"ACTIVITY" | "ENROLLMENT">("ACTIVITY");

  const gradeChartData = gradeSummary.map((g) => ({
    name: `Khối ${g.grade}`,
    enrolled: g.enrolledStudents,
    surveyed: g.surveyedStudents,
    played: g.playedStudents,
    completedStages: g.completedStages
  }));

  const dist = overview.surveyDistribution;
  const surveyPieData = [
    { name: "Rất yêu thích", value: dist.VERY_LOVE, color: SURVEY_COLORS.VERY_LOVE },
    { name: "Yêu thích", value: dist.LOVE, color: SURVEY_COLORS.LOVE },
    { name: "Bình thường", value: dist.NORMAL, color: SURVEY_COLORS.NORMAL },
    { name: "Cần hướng dẫn", value: dist.NEED_SUPPORT, color: SURVEY_COLORS.NEED_SUPPORT }
  ].filter((d) => d.value > 0);

  const stageStatusPieData = [
    { name: "Hoàn thành", value: overview.completedStages, color: STAGE_STATUS_COLORS.COMPLETED },
    {
      name: "Chờ GV duyệt",
      value: overview.waitingConfirmStages,
      color: STAGE_STATUS_COLORS.WAITING
    },
    { name: "Đang chơi", value: overview.inProgressStages, color: STAGE_STATUS_COLORS.IN_PROGRESS },
    {
      name: "Cần bổ sung",
      value: overview.needsRevisionStages,
      color: STAGE_STATUS_COLORS.NEEDS_REVISION
    }
  ].filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      {/* Left: Bar chart by Grade (7 cols) */}
      <div className="xl:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#003B3A]">
              Biểu đồ theo dõi trải nghiệm theo Khối lớp
            </h3>
            <p className="text-[11px] text-slate-500">
              {barMode === "ACTIVITY"
                ? "So sánh số HS khảo sát, số HS đã chơi game và số lượt bài game hoàn thành theo từng khối"
                : "So sánh quy mô HS tham gia học GD Tài chính và số HS đã hoàn thành khảo sát"}
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setBarMode("ACTIVITY")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                barMode === "ACTIVITY"
                  ? "bg-[#003B3A] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Khảo sát &amp; Game
            </button>
            <button
              type="button"
              onClick={() => setBarMode("ENROLLMENT")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                barMode === "ENROLLMENT"
                  ? "bg-[#003B3A] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Quy mô HS học
            </button>
          </div>
        </div>

        <div className="w-full h-[270px] tabular-nums">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={gradeChartData}
              margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                axisLine={{ stroke: "#CBD5E1" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "12px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)"
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                iconType="circle"
                iconSize={8}
              />
              {barMode === "ACTIVITY" ? (
                <>
                  <Bar
                    dataKey="surveyed"
                    name="HS khảo sát"
                    fill="#00A19A"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="played"
                    name="HS chơi game"
                    fill="#0284C7"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="completedStages"
                    name="Lượt bài hoàn thành"
                    fill="#059669"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={24}
                  />
                </>
              ) : (
                <>
                  <Bar
                    dataKey="enrolled"
                    name="HS tham gia học"
                    fill="#003B3A"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="surveyed"
                    name="HS khảo sát"
                    fill="#00A19A"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="played"
                    name="HS chơi game"
                    fill="#059669"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={28}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right: 2 Donut Charts (5 cols) */}
      <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Donut 1: Survey Interest */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#003B3A]">Khảo sát yêu thích</h3>
            <p className="text-[11px] text-slate-500 tabular-nums">
              {overview.surveyedStudents} HS phản hồi • {dist.positiveRatePercent.toFixed(1)}% tích
              cực
            </p>
          </div>

          <div className="w-full h-[175px] relative tabular-nums">
            {surveyPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu khảo sát
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={surveyPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={2}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    >
                      {surveyPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`${val} HS`, "Số lượng"]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: "10px",
                        fontSize: "11px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-[#059669]">
                    {dist.positiveRatePercent.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-slate-500">Tích cực</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#F1F5F9] text-[11px] tabular-nums">
            {[
              { label: "Rất yêu thích", val: dist.VERY_LOVE, color: SURVEY_COLORS.VERY_LOVE },
              { label: "Yêu thích", val: dist.LOVE, color: SURVEY_COLORS.LOVE },
              { label: "Bình thường", val: dist.NORMAL, color: SURVEY_COLORS.NORMAL },
              { label: "Cần hướng dẫn", val: dist.NEED_SUPPORT, color: SURVEY_COLORS.NEED_SUPPORT }
            ].map((row) => {
              const pct =
                overview.surveyedStudents > 0
                  ? Math.round((row.val / overview.surveyedStudents) * 1000) / 10
                  : 0;
              return (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span>{row.label}</span>
                  </div>
                  <span className="font-semibold text-slate-800">
                    {row.val} <span className="text-slate-400 font-normal">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Donut 2: Game Completion Status */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#003B3A]">Kết quả lượt bài game</h3>
            <p className="text-[11px] text-slate-500 tabular-nums">
              {overview.totalStagePlays} lượt • Điểm TB {overview.avgScorePercent.toFixed(1)}%
            </p>
          </div>

          <div className="w-full h-[175px] relative tabular-nums">
            {stageStatusPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có lượt chơi game
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stageStatusPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={2}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    >
                      {stageStatusPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`${val} lượt`, "Số lượt"]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: "10px",
                        fontSize: "11px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-[#003B3A]">
                    {overview.completionRatePercent.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-slate-500">Hoàn thành</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#F1F5F9] text-[11px] tabular-nums">
            {[
              {
                label: "Hoàn thành",
                val: overview.completedStages,
                color: STAGE_STATUS_COLORS.COMPLETED
              },
              {
                label: "Đang chơi",
                val: overview.inProgressStages,
                color: STAGE_STATUS_COLORS.IN_PROGRESS
              },
              {
                label: "Chờ GV duyệt",
                val: overview.waitingConfirmStages,
                color: STAGE_STATUS_COLORS.WAITING
              },
              {
                label: "Cần bổ sung",
                val: overview.needsRevisionStages,
                color: STAGE_STATUS_COLORS.NEEDS_REVISION
              }
            ].map((row) => {
              const pct =
                overview.totalStagePlays > 0
                  ? Math.round((row.val / overview.totalStagePlays) * 1000) / 10
                  : 0;
              return (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span>{row.label}</span>
                  </div>
                  <span className="font-semibold text-slate-800">
                    {row.val} <span className="text-slate-400 font-normal">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StagePerformanceChart({ stages }: { stages: StageReportRow[] }) {
  const activeStages = stages.filter((s) => s.totalPlayers > 0).slice(0, 15);
  if (activeStages.length === 0) return null;

  const chartData = activeStages.map((s) => ({
    label: `K${s.grade}-C${s.periodIndex}`,
    fullName: `Khối ${s.grade} • Chặng ${s.periodIndex}: ${s.lessonName}`,
    completionRate: s.completionRatePercent,
    avgScore: s.avgScorePercent,
    players: s.totalPlayers
  }));

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-[#003B3A]">
            So sánh Điểm trung bình (%) &amp; Tỷ lệ hoàn thành (%) theo từng Chặng game
          </h3>
          <p className="text-[11px] text-slate-500">
            Nhận diện nhanh các bài game học sinh hoàn thành tốt và các bài cần giáo viên hỗ trợ thêm.
          </p>
        </div>
      </div>
      <div className="w-full h-[240px] tabular-nums">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
              axisLine={{ stroke: "#CBD5E1" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
              unit="%"
            />
            <Tooltip
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.fullName ? String(payload[0].payload.fullName) : ""
              }
              formatter={(value, name) => [`${value}%`, name]}
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)"
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="avgScore"
              name="Điểm trung bình (%)"
              fill="#00A19A"
              radius={[5, 5, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="completionRate"
              name="Tỷ lệ hoàn thành (%)"
              fill="#059669"
              radius={[5, 5, 0, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
