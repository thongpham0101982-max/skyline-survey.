// @ts-nocheck
"use client";

import React, { useMemo } from "react";

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

  if (numAxes < 3) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100" style={{ height: size }}>
        <p className="font-semibold">Cần tối thiểu 3 năng lực để vẽ biểu đồ Radar ({numAxes}/3)</p>
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
            fill="rgba(0, 169, 157, 0.25)"
            stroke="#00A99D"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}

        {validPoints.map((p, idx) => (
          <g key={idx} className="group cursor-pointer">
            <circle
              cx={p.x}
              cy={p.y}
              r={p.item.calculationSource === "LEGACY_IMPORTED" ? 4.5 : 4}
              fill={p.item.calculationSource === "LEGACY_IMPORTED" ? "#F59E0B" : "#007A72"}
              stroke="#FFFFFF"
              strokeWidth="2"
              className="transition-transform group-hover:scale-125"
            />
          </g>
        ))}

        {sortedData.map((item, aIdx) => {
          const { x, y } = getCoordinates(aIdx, 1.22);
          const hasValue = item.percent !== null && item.percent !== undefined;
          
          let textAnchor: "middle" | "start" | "end" = "middle";
          if (x < center - 15) textAnchor = "end";
          else if (x > center + 15) textAnchor = "start";

          return (
            <g key={aIdx} className="text-[10px]">
              <text
                x={x}
                y={y}
                textAnchor={textAnchor}
                fontSize="9.5"
                fontWeight="700"
                fill={hasValue ? "#1E293B" : "#94A3B8"}
                className="transition-colors hover:fill-[#007A72]"
              >
                {item.name.length > 20 ? item.name.slice(0, 18) + "..." : item.name}
              </text>
              <text
                x={x}
                y={y + 11}
                textAnchor={textAnchor}
                fontSize="8.5"
                fontWeight="800"
                fill={
                  !hasValue
                    ? "#94A3B8"
                    : item.calculationSource === "LEGACY_IMPORTED"
                    ? "#D97706"
                    : "#007A72"
                }
              >
                {hasValue ? item.percent + "%" : "Chưa ĐG"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
