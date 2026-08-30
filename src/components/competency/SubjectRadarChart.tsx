// @ts-nocheck
"use client";

import React, { useMemo } from "react";
import { CheckCircle2, TrendingUp, Sparkles } from "lucide-react";

export interface RadarItem {
  competencyId: string;
  code: string;
  name: string;
  displayOrder: number;
  weight: number;
  percent: number | null;
  achievedScore?: number | null;
  maxScore?: number | null;
  calculationSource?: string | null;
}

interface SubjectRadarChartProps {
  data: RadarItem[];
  size?: number;
  subjectName?: string;
}

export const SubjectRadarChart: React.FC<SubjectRadarChartProps> = ({
  data = [],
  size = 280,
  subjectName = "Môn học",
}) => {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [data]);

  const numAxes = sortedData.length;
  const radius = size * 0.38;
  const center = size / 2;
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const getCoordinates = (index: number, valueRatio: number) => {
    if (numAxes === 0) return { x: center, y: center };
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    const r = radius * valueRatio;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const validPoints = sortedData
    .map((item, idx) => {
      if (item.percent === null || item.percent === undefined) return null;
      const ratio = Math.min(100, Math.max(0, item.percent)) / 100;
      return { ...getCoordinates(idx, ratio), item, idx };
    })
    .filter(Boolean) as Array<{ x: number; y: number; item: RadarItem; idx: number }>;

  const polygonPath =
    validPoints.length > 2
      ? validPoints.map((p, i) => (i === 0 ? "M " : "L ") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ") + " Z"
      : "";

  // For subjects with 1 or 2 competencies (e.g. Tiếng Việt, Âm nhạc, Tin học):
  // Render a clean, modern Competency Gauge Bar Chart instead of a blank box
  if (numAxes < 3) {
    return (
      <div
        className="w-full flex flex-col justify-center gap-3.5 p-4 bg-gradient-to-b from-slate-50/70 to-teal-50/30 rounded-2xl border border-slate-100"
        style={{ minHeight: size }}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-black text-teal-800 uppercase tracking-wider pb-1 border-b border-teal-100/60">
          <Sparkles className="w-3 h-3 text-teal-600" />
          <span>Chỉ số Đánh giá Năng lực ({numAxes} trục)</span>
        </div>

        {sortedData.map((item, idx) => {
          const val = item.percent !== null && item.percent !== undefined ? Math.min(100, Math.max(0, item.percent)) : null;
          const getBarColor = (p: number | null) => {
            if (p === null) return "from-slate-300 to-slate-400";
            if (p >= 85) return "from-emerald-500 to-teal-500";
            if (p >= 70) return "from-teal-500 to-cyan-500";
            if (p >= 50) return "from-amber-400 to-amber-500";
            return "from-rose-400 to-rose-500";
          };

          return (
            <div key={idx} className="space-y-1.5 bg-white/90 p-3 rounded-xl border border-slate-200/70 shadow-2xs">
              <div className="flex justify-between items-start text-xs font-extrabold text-slate-800 gap-2">
                <span className="leading-snug text-[11px] text-slate-700">{item.name}</span>
                <span className="font-black text-xs text-[#007A72] flex-shrink-0">
                  {val !== null ? (val + "%") : "Chưa có"}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={"bg-gradient-to-r " + getBarColor(val) + " h-full rounded-full transition-all duration-500"}
                  style={{ width: (val !== null ? val : 0) + "%" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} className="overflow-visible select-none">
        {levels.map((level, lIdx) => {
          const gridPoints = Array.from({ length: numAxes }).map((_, aIdx) => {
            const { x, y } = getCoordinates(aIdx, level);
            return x.toFixed(1) + "," + y.toFixed(1);
          }).join(" ");

          return (
            <g key={lIdx}>
              <polygon
                points={gridPoints}
                fill={lIdx === levels.length - 1 ? "#F8FAFC" : "none"}
                stroke="#E2E8F0"
                strokeWidth={lIdx === levels.length - 1 ? "1.5" : "1"}
                strokeDasharray={lIdx < levels.length - 1 ? "3 3" : undefined}
              />
              <text
                x={center + 3}
                y={center - radius * level - 2}
                fontSize="8"
                fontWeight="700"
                fill="#94A3B8"
              >
                {Math.round(level * 100)}%
              </text>
            </g>
          );
        })}

        {sortedData.map((_, aIdx) => {
          const { x, y } = getCoordinates(aIdx, 1.0);
          return (
            <line
              key={aIdx}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#CBD5E1"
              strokeWidth="1"
            />
          );
        })}

        {polygonPath && (
          <path
            d={polygonPath}
            fill="rgba(13, 148, 136, 0.22)"
            stroke="#0D9488"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}

        {validPoints.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="#0D9488"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <text
              x={p.x}
              y={p.y - 8}
              fontSize="9"
              fontWeight="900"
              fill="#0F766E"
              textAnchor="middle"
            >
              {Math.round(p.item.percent)}%
            </text>
          </g>
        ))}

        {sortedData.map((item, idx) => {
          const { x, y } = getCoordinates(idx, 1.18);
          let textAnchor = "middle";
          if (x < center - 10) textAnchor = "end";
          else if (x > center + 10) textAnchor = "start";

          const shortName =
            item.name.length > 18 ? item.name.slice(0, 16) + "..." : item.name;

          return (
            <text
              key={idx}
              x={x}
              y={y}
              fontSize="9"
              fontWeight="700"
              fill="#334155"
              textAnchor={textAnchor}
              dominantBaseline="middle"
              className="cursor-pointer hover:fill-teal-700"
            >
              {shortName}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
