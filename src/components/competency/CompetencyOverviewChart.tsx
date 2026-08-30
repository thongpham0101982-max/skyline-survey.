// @ts-nocheck
"use client";

import React from "react";
import { BarChart3, TrendingUp, Award, AlertCircle, CheckCircle2, Sparkles, Target } from "lucide-react";

export interface SubjectSummaryItem {
  id?: string;
  subjectId: string;
  subject?: {
    id: string;
    subjectCode: string;
    subjectName: string;
  };
  subjectScore: number | null;
  evaluatedCount: number;
  totalCompetencies: number;
  radarData: any[];
  benchmarkScore?: number;
  previousScore?: number | null;
}

interface CompetencyOverviewChartProps {
  summaries: SubjectSummaryItem[];
  benchmarkScore?: number;
  periodLabel?: string;
}

export const getCompetencyLevel = (score: number | null) => {
  if (score === null || score === undefined) {
    return {
      level: "UNASSESSED",
      label: "Chưa đánh giá",
      color: "text-slate-500",
      bg: "bg-slate-100",
      border: "border-slate-200",
      barGradient: "from-slate-300 to-slate-400",
      icon: AlertCircle,
    };
  }
  if (score >= 85) {
    return {
      level: "EXCEEDING",
      label: "Vượt kỳ vọng",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      barGradient: "from-emerald-500 to-teal-500",
      icon: Sparkles,
    };
  }
  if (score >= 70) {
    return {
      level: "PROFICIENT",
      label: "Đạt chuẩn",
      color: "text-teal-700",
      bg: "bg-teal-50",
      border: "border-teal-200",
      barGradient: "from-teal-500 to-cyan-500",
      icon: CheckCircle2,
    };
  }
  if (score >= 50) {
    return {
      level: "DEVELOPING",
      label: "Đang phát triển",
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      barGradient: "from-amber-400 to-amber-500",
      icon: TrendingUp,
    };
  }
  return {
    level: "NEEDS_SUPPORT",
    label: "Cần hỗ trợ",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    barGradient: "from-rose-500 to-red-500",
    icon: AlertCircle,
  };
};

export const CompetencyOverviewChart: React.FC<CompetencyOverviewChartProps> = ({
  summaries = [],
  benchmarkScore = 75,
  periodLabel = "Cuối Học kỳ I",
}) => {
  if (!summaries || summaries.length === 0) return null;

  // Calculate statistics
  const validScores = summaries
    .map((s) => s.subjectScore)
    .filter((s) => s !== null && s !== undefined) as number[];

  const avgScore =
    validScores.length > 0
      ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10
      : null;

  const exceedingCount = summaries.filter((s) => (s.subjectScore || 0) >= 85).length;
  const proficientCount = summaries.filter((s) => (s.subjectScore || 0) >= 70 && (s.subjectScore || 0) < 85).length;
  const developingCount = summaries.filter((s) => (s.subjectScore || 0) >= 50 && (s.subjectScore || 0) < 70).length;
  const needsSupportCount = summaries.filter((s) => s.subjectScore !== null && (s.subjectScore || 0) < 50).length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-6 p-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#003B3A] to-[#007A72] flex items-center justify-center text-white shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-850 text-base">
              Tổng Quan Năng Lực Tất Cả Môn Học
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              So sánh điểm đạt được từng môn với chuẩn kỳ vọng của khối lớp ({benchmarkScore}%)
            </p>
          </div>
        </div>

        {/* 4-Tier Distribution Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl font-bold">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Vượt kỳ vọng: <strong className="font-black">{exceedingCount}</strong></span>
          </span>
          <span className="flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-xl font-bold">
            <CheckCircle2 className="w-3 h-3 text-teal-600" />
            <span>Đạt chuẩn: <strong className="font-black">{proficientCount}</strong></span>
          </span>
          <span className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-xl font-bold">
            <TrendingUp className="w-3 h-3 text-amber-600" />
            <span>Đang phát triển: <strong className="font-black">{developingCount}</strong></span>
          </span>
          {needsSupportCount > 0 && (
            <span className="flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-xl font-bold">
              <AlertCircle className="w-3 h-3 text-rose-600" />
              <span>Cần hỗ trợ: <strong className="font-black">{needsSupportCount}</strong></span>
            </span>
          )}
        </div>
      </div>

      {/* Comparative Horizontal Bar List */}
      <div className="space-y-4">
        {summaries.map((item) => {
          const score = item.subjectScore;
          const levelInfo = getCompetencyLevel(score);
          const Icon = levelInfo.icon;
          const scoreVal = score !== null ? Math.min(100, Math.max(0, score)) : 0;
          const benchmark = item.benchmarkScore || benchmarkScore;

          return (
            <div
              key={item.id || item.subjectId}
              className="space-y-1.5 p-3 rounded-2xl hover:bg-slate-50/80 transition-all border border-slate-100/80"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-black text-slate-800 text-sm">
                    {item.subject?.subjectName || "Môn học"}
                  </span>
                  <span className="font-mono text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">
                    {item.subject?.subjectCode || "MON"}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    ({item.evaluatedCount}/{item.totalCompetencies} năng lực)
                  </span>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className={"flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border " + levelInfo.bg + " " + levelInfo.color + " " + levelInfo.border}>
                    <Icon className="w-3 h-3" />
                    {levelInfo.label}
                  </span>
                  <span className="font-black text-sm text-slate-850 w-14 text-right">
                    {score !== null ? score + "%" : "Chưa có"}
                  </span>
                </div>
              </div>

              {/* Progress Bar with Benchmark Target Marker */}
              <div className="relative w-full bg-slate-100/90 rounded-full h-3 overflow-visible">
                {/* Benchmark line */}
                <div
                  className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-slate-500 z-10"
                  style={{ left: benchmark + "%" }}
                  title={"Chuẩn kỳ vọng khối lớp: " + benchmark + "%"}
                >
                  <div className="absolute -top-3.5 -translate-x-1/2 text-[9px] font-extrabold text-slate-500 whitespace-nowrap bg-white px-1 rounded shadow-2xs border border-slate-200">
                    Chuẩn {benchmark}%
                  </div>
                </div>

                {/* Actual score bar */}
                <div
                  className={"bg-gradient-to-r " + levelInfo.barGradient + " h-full rounded-full transition-all duration-700 shadow-2xs"}
                  style={{ width: scoreVal + "%" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
