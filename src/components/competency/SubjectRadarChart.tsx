// @ts-nocheck
"use client";

import React, { useMemo, useState } from "react";
import { Sparkles, CheckCircle2, TrendingUp, AlertCircle, Info, Target } from "lucide-react";
import { getCompetencyLevel } from "./CompetencyOverviewChart";

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
  benchmark?: number;
  previousPercent?: number | null;
}

interface SubjectRadarChartProps {
  data: RadarItem[];
  size?: number;
  subjectName?: string;
  defaultBenchmark?: number;
}

export const SubjectRadarChart: React.FC<SubjectRadarChartProps> = ({
  data = [],
  size = 300,
  subjectName = "Môn học",
  defaultBenchmark = 75,
}) => {
  const [hoveredItem, setHoveredItem] = useState<{
    item: RadarItem;
    x: number;
    y: number;
  } | null>(null);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [data]);

  const numAxes = sortedData.length;
  const radius = size * 0.36;
  const center = size / 2;
  const levels = [0.25, 0.5, 0.75, 1.0];

  const getCoordinates = (index: number, valueRatio: number) => {
    if (numAxes === 0) return { x: center, y: center };
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    const r = radius * valueRatio;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Student Actual Points
  const studentPoints = sortedData
    .map((item, idx) => {
      if (item.percent === null || item.percent === undefined) return null;
      const ratio = Math.min(100, Math.max(0, item.percent)) / 100;
      return { ...getCoordinates(idx, ratio), item, idx };
    })
    .filter(Boolean) as Array<{ x: number; y: number; item: RadarItem; idx: number }>;

  const studentPolygonPath =
    studentPoints.length > 2
      ? studentPoints.map((p, i) => (i === 0 ? "M " : "L ") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ") + " Z"
      : "";

  // Benchmark Points (Dual Layer)
  const benchmarkRatio = (defaultBenchmark || 75) / 100;
  const benchmarkPolygonPoints = Array.from({ length: numAxes })
    .map((_, idx) => {
      const { x, y } = getCoordinates(idx, benchmarkRatio);
      return x.toFixed(1) + "," + y.toFixed(1);
    })
    .join(" ");

  // 1–2 Competencies: Clean Horizontal Progress Gauge
  if (numAxes < 3) {
    return (
      <div
        className="w-full flex flex-col justify-center gap-3.5 p-4 bg-gradient-to-b from-slate-50/80 to-teal-50/20 rounded-2xl border border-slate-100"
        style={{ minHeight: size }}
      >
        <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-teal-800 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Tiến độ Năng lực ({numAxes} tiêu chí)</span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            Chuẩn khối: {defaultBenchmark}%
          </span>
        </div>

        {sortedData.map((item, idx) => {
          const val = item.percent !== null && item.percent !== undefined ? Math.min(100, Math.max(0, item.percent)) : null;
          const level = getCompetencyLevel(val);
          const benchmark = item.benchmark || defaultBenchmark;

          return (
            <div key={idx} className="space-y-2 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex justify-between items-start text-xs font-extrabold text-slate-800 gap-2">
                <span className="leading-snug text-xs text-slate-700">{item.name}</span>
                <span className={"px-2 py-0.5 rounded-md text-[10px] font-black uppercase border " + level.bg + " " + level.color + " " + level.border}>
                  {val !== null ? val + "%" : "Chưa có"}
                </span>
              </div>

              {/* Progress bar with target indicator */}
              <div className="relative w-full bg-slate-100 rounded-full h-3 overflow-visible">
                {/* Target pin */}
                <div
                  className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-slate-500 z-10"
                  style={{ left: benchmark + "%" }}
                  title={"Chuẩn đạt: " + benchmark + "%"}
                />
                {/* Actual value */}
                <div
                  className={"bg-gradient-to-r " + level.barGradient + " h-full rounded-full transition-all duration-500 shadow-2xs"}
                  style={{ width: (val !== null ? val : 0) + "%" }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>Mức: <strong className={level.color}>{level.label}</strong></span>
                <span>Chuẩn: {benchmark}%</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // >= 3 Competencies: Dual-layer Radar Chart with Tooltip
  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Legend Top Bar */}
      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#007A72]" />
          <span>Học sinh đạt được</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-400" />
          <span>Chuẩn khối ({defaultBenchmark}%)</span>
        </div>
      </div>

      <svg width={size} height={size} className="overflow-visible">
        {/* Background Grid Levels */}
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

        {/* Axis Lines */}
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

        {/* Layer 1: Benchmark Polygon (Dashed Line) */}
        {numAxes >= 3 && (
          <polygon
            points={benchmarkPolygonPoints}
            fill="rgba(148, 163, 184, 0.08)"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}

        {/* Layer 2: Student Actual Score Polygon (Teal Gradient) */}
        {studentPolygonPath && (
          <path
            d={studentPolygonPath}
            fill="rgba(13, 148, 136, 0.25)"
            stroke="#0D9488"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}

        {/* Interactive Data Points */}
        {studentPoints.map((p, idx) => {
          const isHovered = hoveredItem?.item.competencyId === p.item.competencyId;
          return (
            <g
              key={idx}
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredItem({ item: p.item, x: p.x, y: p.y })}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? "6.5" : "4.5"}
                fill={isHovered ? "#003B3A" : "#0D9488"}
                stroke="#FFFFFF"
                strokeWidth="2"
                className="transition-all duration-200"
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
          );
        })}

        {/* Outer Axis Labels */}
        {sortedData.map((item, idx) => {
          const { x, y } = getCoordinates(idx, 1.18);
          let textAnchor = "middle";
          if (x < center - 15) textAnchor = "end";
          else if (x > center + 15) textAnchor = "start";

          const shortName =
            item.name.length > 20 ? item.name.slice(0, 18) + "..." : item.name;

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
              className="cursor-pointer hover:fill-teal-700 transition-colors"
              title={item.name}
            >
              {shortName}
            </text>
          );
        })}
      </svg>

      {/* Floating Interactive Tooltip */}
      {hoveredItem && (() => {
        const item = hoveredItem.item;
        const level = getCompetencyLevel(item.percent);
        const benchmark = item.benchmark || defaultBenchmark;
        const diff = item.percent !== null ? Math.round((item.percent - benchmark) * 10) / 10 : null;

        return (
          <div
            className="absolute z-20 bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-xs pointer-events-none backdrop-blur-md transition-all space-y-1.5 max-w-xs"
            style={{
              top: Math.max(10, hoveredItem.y - 65),
              left: Math.min(size - 140, Math.max(10, hoveredItem.x - 70)),
            }}
          >
            <div className="font-extrabold text-teal-300 text-[11px] leading-tight">
              {item.name}
            </div>
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-700 text-[10px]">
              <span>Điểm đạt: <strong className="text-white text-xs font-black">{item.percent}%</strong></span>
              <span className={"px-1.5 py-0.5 rounded font-black text-[9px] " + level.bg + " " + level.color}>
                {level.label}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Chuẩn khối: {benchmark}%</span>
              {diff !== null && (
                <span className={diff >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {diff >= 0 ? "+" : ""}{diff}%
                </span>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
