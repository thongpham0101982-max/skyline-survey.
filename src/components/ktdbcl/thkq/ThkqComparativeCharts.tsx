// @ts-nocheck
"use client"

import React, { useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from "recharts"
import { BarChart3 } from "lucide-react"

interface Props {
  charts: {
    byCampusGrade: any[]
    bySubjectSystem: any[]
    distribution: any[]
  }
  selectedCampusName?: string
  selectedLevel?: string
}

const CAMPUS_COLORS = [
  "#0EA5E9", // sky-500
  "#F59E0B", // amber-500
  "#10B981", // emerald-500
  "#8B5CF6", // purple-500
  "#EC4899", // pink-500
  "#6366F1"  // indigo-500
]

export function ThkqComparativeCharts({ charts, selectedCampusName = "Cơ sở", selectedLevel = "THCS" }: Props) {
  const [activeTab, setActiveTab] = useState<"CAMPUS_GRADE" | "SUBJECT_SYSTEM" | "DISTRIBUTION">("CAMPUS_GRADE")

  if (!charts) return null

  // Tìm danh sách cơ sở có trong dữ liệu byCampusGrade
  const sampleRow = charts.byCampusGrade?.[0] || {}
  const campusKeys = Object.keys(sampleRow).filter(k => k !== "grade" && k !== "gradeLabel" && k !== "Hệ thống")

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-6">
      {/* Header Biểu đồ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800 tracking-tight">
                Phân tích So sánh Đối chuẩn Chất lượng Đa tầng
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                Comparative Analytics
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Đối chiếu ĐTB môn theo Khối giữa các Cơ sở và với Chuẩn Toàn Hệ thống Sky-Line
            </p>
          </div>
        </div>

        {/* Tab chuyển đổi biểu đồ */}
        <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/80 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("CAMPUS_GRADE")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "CAMPUS_GRADE" ? "bg-white text-sky-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cơ sở vs Khối & Hệ thống
          </button>
          <button
            onClick={() => setActiveTab("SUBJECT_SYSTEM")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "SUBJECT_SYSTEM" ? "bg-white text-sky-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Đối chuẩn Môn học
          </button>
          <button
            onClick={() => setActiveTab("DISTRIBUTION")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "DISTRIBUTION" ? "bg-white text-sky-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Phổ điểm (Distribution)
          </button>
        </div>
      </div>

      {/* Nội dung Biểu đồ */}
      <div className="mt-4">
        {/* TAB 1: So sánh Chất lượng Môn theo Khối giữa từng Cơ sở với Hệ thống */}
        {activeTab === "CAMPUS_GRADE" && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 px-1">
              <span>Đơn vị tính: Điểm trung bình (ĐTB) trên thang điểm 10.0</span>
              <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-800" />
                Cột màu đen sẫm đại diện cho Mặt bằng Chung Toàn Hệ thống
              </span>
            </div>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.byCampusGrade} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="gradeLabel" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke="#64748B" fontSize={11} tickLine={false} ticks={[0, 2, 4, 6, 8, 10]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      color: "#F8FAFC",
                      borderRadius: "12px",
                      border: "none",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />

                  {/* Chuẩn Sky-Line Benchmark */}
                  <ReferenceLine
                    y={selectedLevel === "TIEU_HOC" ? 7.0 : 6.0}
                    label={{
                      value: `Chuẩn Sky-Line (${selectedLevel === "TIEU_HOC" ? "7.0" : "6.0"})`,
                      fill: "#0284C7",
                      fontSize: 10,
                      position: "insideTopRight"
                    }}
                    stroke="#0284C7"
                    strokeDasharray="4 4"
                  />

                  {/* Chuẩn Bộ MOET */}
                  <ReferenceLine
                    y={5.0}
                    label={{ value: "Chuẩn Bộ (5.0)", fill: "#EF4444", fontSize: 10, position: "insideBottomRight" }}
                    stroke="#EF4444"
                    strokeDasharray="3 3"
                  />

                  {/* Render từng Campus */}
                  {campusKeys.map((cName, idx) => (
                    <Bar
                      key={cName}
                      dataKey={cName}
                      fill={CAMPUS_COLORS[idx % CAMPUS_COLORS.length]}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  ))}

                  {/* Toàn Hệ Thống */}
                  <Bar dataKey="Hệ thống" fill="#1E293B" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB 2: So sánh Chất lượng Môn học Cơ sở với Hệ thống */}
        {activeTab === "SUBJECT_SYSTEM" && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 px-1">
              <span>So sánh điểm trung bình từng môn của {selectedCampusName} so với Chuẩn Hệ thống</span>
              <span className="text-[11px] font-semibold text-emerald-600">
                Xanh lá: Vượt mặt bằng (+) | Đỏ: Tụt hậu (-)
              </span>
            </div>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.bySubjectSystem} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="subjectName" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke="#64748B" fontSize={11} tickLine={false} ticks={[0, 2, 4, 6, 8, 10]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      color: "#F8FAFC",
                      borderRadius: "12px",
                      border: "none",
                      fontSize: "12px"
                    }}
                    formatter={(val, name) => {
                      if (name === "campusAvg") return [`${val} đ`, `ĐTB ${selectedCampusName}`]
                      if (name === "systemAvg") return [`${val} đ`, `ĐTB Hệ thống`]
                      return [val, name]
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <ReferenceLine y={5.0} stroke="#EF4444" strokeDasharray="3 3" />
                  <Bar dataKey="campusAvg" name={`ĐTB ${selectedCampusName}`} fill="#0EA5E9" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="systemAvg" name="ĐTB Toàn Hệ thống" fill="#64748B" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB 3: Phân bổ phổ điểm (Distribution) */}
        {activeTab === "DISTRIBUTION" && (
          <div>
            <div className="text-xs text-slate-500 mb-2 px-1">
              Số lượng bài khảo sát / học sinh phân bổ theo các dải điểm chuẩn SSM
            </div>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.distribution} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="range" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      color: "#F8FAFC",
                      borderRadius: "12px",
                      border: "none",
                      fontSize: "12px"
                    }}
                    formatter={val => [`${val} bài`, "Số lượng"]}
                  />
                  <Bar dataKey="count" name="Số bài thi / khảo sát" radius={[6, 6, 0, 0]} maxBarSize={55}>
                    {charts.distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
