// @ts-nocheck
"use client";

import React, { useMemo } from "react";
import { SubjectRadarChart, RadarItem } from "./SubjectRadarChart";
import { getCompetencyLevel } from "./CompetencyOverviewChart";
import { Award, BookOpen, AlertCircle, CheckCircle2, Info, Sparkles, TrendingUp, Target, ArrowUpRight, ArrowDownRight } from "lucide-react";

export interface SubjectCompetencyCardProps {
  subjectName: string;
  subjectCode?: string;
  subjectScore: number | null;
  evaluatedCount: number;
  totalCompetencies: number;
  radarData: RadarItem[];
  assessmentPeriodLabel?: string;
  previousScore?: number | null;
  benchmarkScore?: number;
}

export const SubjectCompetencyCard: React.FC<SubjectCompetencyCardProps> = ({
  subjectName,
  subjectCode,
  subjectScore,
  evaluatedCount,
  totalCompetencies,
  radarData = [],
  assessmentPeriodLabel = "Đợt ĐGNL",
  previousScore = null,
  benchmarkScore = 75,
}) => {
  const isLegacyData = radarData.some((r) => r.calculationSource === "LEGACY_IMPORTED");
  const levelInfo = getCompetencyLevel(subjectScore);
  const LevelIcon = levelInfo.icon;

  // Calculate Top Strength and Growth Area
  const { topStrength, growthArea } = useMemo(() => {
    const valid = radarData
      .filter((r) => r.percent !== null && r.percent !== undefined)
      .sort((a, b) => (b.percent || 0) - (a.percent || 0));

    if (valid.length === 0) return { topStrength: null, growthArea: null };

    const top = valid[0];
    const bottom = valid.length > 1 ? valid[valid.length - 1] : null;

    return {
      topStrength: top,
      growthArea: bottom && bottom.percent !== top.percent ? bottom : null,
    };
  }, [radarData]);

  // Delta score from previous period
  const progressDelta =
    subjectScore !== null && previousScore !== null
      ? Math.round((subjectScore - previousScore) * 10) / 10
      : null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between print:break-inside-avoid">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#003B3A] to-[#007A72] flex items-center justify-center text-white shadow-xs flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-slate-850 text-base leading-tight">{subjectName}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60 uppercase">
                {subjectCode || "MON"}
              </span>
              <span className="text-[11px] font-bold text-slate-400">• {assessmentPeriodLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={"flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border " + levelInfo.bg + " " + levelInfo.color + " " + levelInfo.border}>
            <LevelIcon className="w-3 h-3" />
            {levelInfo.label}
          </span>
          {isLegacyData && (
            <span
              title="Dữ liệu chuyển tiếp lịch sử 2025-2026 từ cột %_ThucTe_Radar"
              className="flex items-center gap-1 text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md"
            >
              <Info className="w-2.5 h-2.5" /> Lịch sử 25-26
            </span>
          )}
        </div>
      </div>

      {/* 3 Core Insights Bar (Top Strength, Growth Focus, Progress Delta) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50/60 border-b border-slate-100 text-[11px]">
        {/* Top Strength */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 uppercase">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Mạnh nhất</span>
          </div>
          <div className="font-extrabold text-slate-800 truncate" title={topStrength?.name || "Chưa có"}>
            {topStrength?.name || "—"}
          </div>
          <div className="text-[10px] font-black text-emerald-700">
            {topStrength ? topStrength.percent + "%" : ""}
          </div>
        </div>

        {/* Growth Focus */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 uppercase">
            <Target className="w-3 h-3 text-amber-600" />
            <span>Cần rèn luyện</span>
          </div>
          <div className="font-extrabold text-slate-800 truncate" title={growthArea?.name || "Tất cả đồng đều"}>
            {growthArea?.name || "Đạt chuẩn"}
          </div>
          <div className="text-[10px] font-black text-amber-700">
            {growthArea ? growthArea.percent + "%" : ""}
          </div>
        </div>

        {/* Progress Delta vs Previous Period */}
        <div className="col-span-2 sm:col-span-1 bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
            <TrendingUp className="w-3 h-3 text-slate-400" />
            <span>So kỳ trước</span>
          </div>
          <div className="font-black text-xs flex items-center gap-1">
            {progressDelta !== null ? (
              progressDelta >= 0 ? (
                <span className="text-emerald-700 flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                  +{progressDelta}%
                </span>
              ) : (
                <span className="text-rose-700 flex items-center">
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                  {progressDelta}%
                </span>
              )
            ) : (
              <span className="text-slate-400 font-bold text-[10px]">Kỳ đầu tiên</span>
            )}
          </div>
          <div className="text-[9px] font-semibold text-slate-400">
            {previousScore !== null ? "Trước: " + previousScore + "%" : "Chưa có kỳ trước"}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="p-4 flex flex-col items-center justify-center min-h-[300px]">
        <SubjectRadarChart
          data={radarData}
          size={290}
          subjectName={subjectName}
          defaultBenchmark={benchmarkScore}
        />
      </div>

      {/* Footer KPI & Individual Competencies Breakdown */}
      <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-500">
            Tiến độ hoàn tất:
          </span>
          <span className="font-extrabold text-slate-800">
            <span className="text-[#007A72] font-black">{evaluatedCount}</span> / {totalCompetencies} năng lực
          </span>
        </div>

        <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
          <span className="font-bold text-slate-700">Điểm Năng Lực Môn:</span>
          <span className="text-lg font-black text-[#007A72]">
            {subjectScore !== null ? subjectScore + "%" : "—"}
          </span>
        </div>

        {/* Competencies Progress Pills */}
        <div className="space-y-1.5 pt-1">
          {radarData.map((item, idx) => {
            const hasVal = item.percent !== null && item.percent !== undefined;
            const itemLevel = getCompetencyLevel(item.percent);

            return (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between text-[11px] items-center">
                  <span className="font-semibold text-slate-700 truncate max-w-[200px]" title={item.name}>
                    {item.name}
                  </span>
                  <span className={"font-mono font-bold text-[10px] px-1.5 py-0.5 rounded " + (hasVal ? itemLevel.bg + " " + itemLevel.color : "text-slate-400 bg-slate-100")}>
                    {hasVal ? item.percent + "%" : "—"}
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={"bg-gradient-to-r " + itemLevel.barGradient + " h-full rounded-full transition-all duration-500"}
                    style={{ width: (hasVal ? item.percent : 0) + "%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
