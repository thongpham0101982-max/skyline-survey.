// @ts-nocheck
"use client";

import React from "react";
import { SubjectRadarChart, RadarItem } from "./SubjectRadarChart";
import { Award, BookOpen, AlertCircle, CheckCircle2, Info } from "lucide-react";

export interface SubjectCompetencyCardProps {
  subjectName: string;
  subjectCode?: string;
  subjectScore: number | null;
  evaluatedCount: number;
  totalCompetencies: number;
  radarData: RadarItem[];
  assessmentPeriodLabel?: string;
}

export const SubjectCompetencyCard: React.FC<SubjectCompetencyCardProps> = ({
  subjectName,
  subjectCode,
  subjectScore,
  evaluatedCount,
  totalCompetencies,
  radarData = [],
  assessmentPeriodLabel = "Đợt ĐGNL",
}) => {
  const isLegacyData = radarData.some((r) => r.calculationSource === "LEGACY_IMPORTED");

  const getBadge = (score: number | null) => {
    if (score === null) return { label: "Chưa hoàn tất", bg: "bg-slate-100 text-slate-500 border-slate-200" };
    if (score >= 85) return { label: "Xuất sắc", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (score >= 70) return { label: "Tốt", bg: "bg-teal-50 text-teal-700 border-teal-200" };
    if (score >= 50) return { label: "Đạt", bg: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "Cần rèn luyện", bg: "bg-rose-50 text-rose-700 border-rose-200" };
  };

  const badge = getBadge(subjectScore);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/70 to-white flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#003B3A] to-[#007A72] flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm leading-tight">{subjectName}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                {subjectCode || "MON"}
              </span>
              <span className="text-[10px] font-bold text-slate-500">• {assessmentPeriodLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={"text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border " + badge.bg}>
            {badge.label}
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

      <div className="p-4 flex flex-col items-center justify-center min-h-[300px]">
        <SubjectRadarChart data={radarData} size={280} subjectName={subjectName} />
      </div>

      <div className="p-4 bg-slate-50/60 border-t border-slate-100 space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-500">
            Tiến độ đánh giá:
          </span>
          <span className="font-bold text-slate-800">
            <span className="text-[#007A72] font-black">{evaluatedCount}</span> / {totalCompetencies} năng lực
          </span>
        </div>

        <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
          <span className="font-bold text-slate-700">Điểm TB Năng lực Môn:</span>
          <span className="text-base font-black text-[#007A72]">
            {subjectScore !== null ? (subjectScore + "%") : "—"}
          </span>
        </div>

        <div className="space-y-1.5 pt-1">
          {radarData.map((item, idx) => {
            const hasVal = item.percent !== null && item.percent !== undefined;
            return (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold text-slate-700 truncate max-w-[200px]" title={item.name}>
                    {item.name}
                  </span>
                  <span className="font-bold font-mono text-slate-800">
                    {hasVal ? (
                      item.achievedScore !== undefined && item.maxScore
                        ? (item.achievedScore + "/" + item.maxScore + " (" + item.percent + "%)")
                        : (item.percent + "%")
                    ) : (
                      <span className="text-slate-400 font-normal italic">Chưa có</span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={"h-full rounded-full transition-all duration-500 " + (
                      !hasVal
                        ? "bg-transparent"
                        : (item.percent || 0) >= 80
                        ? "bg-emerald-500"
                        : (item.percent || 0) >= 60
                        ? "bg-[#00A99D]"
                        : "bg-amber-500"
                    )}
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
