// @ts-nocheck
"use client"

import React, { useMemo } from "react"
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ReferenceArea
} from "recharts"
import { Sparkles, User, AlertTriangle, CheckCircle2 } from "lucide-react"

interface Props {
  points: any[]
  benchmarks: any
  meta: any
  activeQuadrant: string
  selectedStudentId: string | null
  onSelectStudent: (student: any) => void
}

const QUADRANT_COLORS = {
  Q1: "#059669", // Emerald - Honor
  Q2: "#0284C7", // Sky - Rising
  Q3: "#DC2626", // Rose - Priority Support
  Q4: "#D97706"  // Amber - Attention
}

export function ScatterPlotCanvas({
  points = [],
  benchmarks,
  meta,
  activeQuadrant = "ALL",
  selectedStudentId = null,
  onSelectStudent
}: Props) {
  const benchX = benchmarks?.benchX || 6.0
  const benchY = benchmarks?.benchY || 6.0

  // Filter points according to active quadrant if selected
  const displayedPoints = useMemo(() => {
    if (activeQuadrant === "ALL") return points
    return points.filter(p => p.quadrant === activeQuadrant)
  }, [points, activeQuadrant])

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-2 max-w-xs backdrop-blur-sm z-50 animate-fadeIn pointer-events-none">
          <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1.5">
            <div className="font-black text-sm text-teal-300 truncate">
              {data.studentName}
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              {data.studentCode}
            </span>
          </div>

          <div className="text-[11px] text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Lớp & Cơ sở:</span>
              <span className="font-bold text-white">{data.className} ({data.campusName || "Sky-Line"})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Giáo viên:</span>
              <span className="text-slate-200">{data.teacherName}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <div>
              <div className="text-[10px] text-slate-400 truncate">{meta?.labelX || "Trục X"}</div>
              <div className="text-base font-black text-white">{data.x}đ</div>
            </div>
            <div>
              <div className="text-[10px] text-teal-400 truncate">{meta?.labelY || "Trục Y"}</div>
              <div className="text-base font-black text-teal-300 flex items-baseline gap-1">
                <span>{data.y}đ</span>
                <span className={`text-[10px] font-bold ${data.delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  ({data.delta >= 0 ? `+${data.delta}` : data.delta})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-[10px]">
            <span className={`font-black px-2 py-0.5 rounded text-white`} style={{ backgroundColor: QUADRANT_COLORS[data.quadrant] || "#64748b" }}>
              {data.quadrant === "Q1" ? "Góc I: Vượt trội" : data.quadrant === "Q2" ? "Góc II: Tiến bộ" : data.quadrant === "Q3" ? "Góc III: Cần can thiệp" : "Góc IV: Sa sút"}
            </span>

            {data.hasAdmissionCommitment && (
              <span className="text-amber-300 font-bold flex items-center gap-0.5">
                <Sparkles className="w-3 h-3" /> Cam kết ĐV
              </span>
            )}
            {data.hasLearningCommitment && (
              <span className="text-purple-300 font-bold flex items-center gap-0.5">
                ● Đang cam kết HT
              </span>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800">
            Biểu đồ Phân tán 2D (Scatter Canvas)
          </span>
          <span className="text-[11px] text-slate-500">
            [{displayedPoints.length} học sinh hiển thị]
          </span>
        </div>

        {/* Chú giải nhãn trục và mốc chuẩn */}
        <div className="flex items-center gap-3 text-[11px] font-semibold flex-wrap">
          <div className="flex items-center gap-1 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-[#003B3A] inline-block" />
            <span>Chuẩn Sky-Line: <strong>{benchY}đ</strong></span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Sàn Đạt Bộ GD&ĐT: <strong>5.0đ</strong></span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <span className="w-3 h-0.5 bg-purple-500 inline-block" />
            <span>Đường cân bằng (Y = X)</span>
          </div>
        </div>
      </div>

      <div className="h-[480px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />

            {/* 4 Vùng nền phân chia 4 góc phần tư */}
            {/* Q1: Góc trên phải (X >= benchX, Y >= benchY) */}
            <ReferenceArea x1={benchX} x2={10} y1={benchY} y2={10} fill="#ecfdf5" fillOpacity={0.6} />
            {/* Q2: Góc trên trái (X < benchX, Y >= benchY) */}
            <ReferenceArea x1={0} x2={benchX} y1={benchY} y2={10} fill="#f0f9ff" fillOpacity={0.6} />
            {/* Q3: Góc dưới trái (X < benchX, Y < benchY) */}
            <ReferenceArea x1={0} x2={benchX} y1={0} y2={benchY} fill="#fff1f2" fillOpacity={0.6} />
            {/* Q4: Góc dưới phải (X >= benchX, Y < benchY) */}
            <ReferenceArea x1={benchX} x2={10} y1={0} y2={benchY} fill="#fffbeb" fillOpacity={0.6} />

            {/* Trục X: 0 đến 10 */}
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 10]}
              ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
              tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
              label={{
                value: meta?.labelX || "Trục X",
                position: "insideBottom",
                offset: -15,
                fill: "#0f172a",
                fontSize: 12,
                fontWeight: 700
              }}
            />

            {/* Trục Y: 0 đến 10 */}
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 10]}
              ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
              tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
              label={{
                value: meta?.labelY || "Trục Y",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                fill: "#0f172a",
                fontSize: 12,
                fontWeight: 700
              }}
            />

            <ZAxis type="number" range={[45, 90]} />

            {/* Đường tham chiếu: Chuẩn Sky-Line trục Y */}
            <ReferenceLine
              y={benchY}
              stroke="#003B3A"
              strokeWidth={2}
              label={{ value: `Chuẩn Sky-Line (${benchY}đ)`, fill: "#003B3A", fontSize: 10, fontWeight: 800, position: "right" }}
            />

            {/* Đường tham chiếu: Chuẩn Sky-Line trục X */}
            <ReferenceLine
              x={benchX}
              stroke="#003B3A"
              strokeWidth={2}
              label={{ value: `Chuẩn (${benchX}đ)`, fill: "#003B3A", fontSize: 10, fontWeight: 800, position: "top" }}
            />

            {/* Đường sàn Bộ GD&ĐT: 5.0đ */}
            <ReferenceLine y={5.0} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} />
            <ReferenceLine x={5.0} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} />

            {/* Đường cân bằng Y = X (Điểm tiến bộ) */}
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 10, y: 10 }]}
              stroke="#8b5cf6"
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />

            <Tooltip content={<CustomTooltip />} />

            <Scatter
              name="Học sinh"
              data={displayedPoints}
              onClick={(data) => {
                if (data && data.payload && onSelectStudent) {
                  onSelectStudent(data.payload)
                }
              }}
              cursor="pointer"
            >
              {displayedPoints.map((entry, index) => {
                const isSelected = selectedStudentId === entry.studentId
                const baseColor = QUADRANT_COLORS[entry.quadrant] || "#005B58"
                return (
                  <Cell
                    key={`cell-${entry.id}-${index}`}
                    fill={baseColor}
                    fillOpacity={isSelected ? 1 : 0.85}
                    stroke={isSelected ? "#0f172a" : entry.isOutlier ? "#e11d48" : "#ffffff"}
                    strokeWidth={isSelected ? 3 : entry.isOutlier ? 2 : 1}
                  />
                )
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
