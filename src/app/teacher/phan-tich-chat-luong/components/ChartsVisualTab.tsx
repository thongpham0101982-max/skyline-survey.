"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
  LineChart,
  Line
} from "recharts"
import { BarChart3, TrendingUp, Layers, Users, Award } from "lucide-react"

interface Props {
  classAnalytics: any[]
  trendMatrix: any[]
  departmentData: any
  evaluationPeriod: string
  subjectName: string
}

export function ChartsVisualTab({
  classAnalytics,
  trendMatrix,
  departmentData,
  evaluationPeriod,
  subjectName
}: Props) {
  // 1. Data for Chart 1: Class Avg vs Benchmark
  const classAvgData = classAnalytics.map(c => ({
    name: c.className,
    "ĐTB Lớp": c.avgScore,
    "Chuẩn sàn SKL": c.benchmark,
    "Mục tiêu Quota (%)": c.targetQuota
  }))

  // 2. Data for Chart 2: 5 Bands Distribution
  const distributionData = classAnalytics.map(c => {
    const b = c.bands || {}
    return {
      name: c.className,
      "Xuất sắc (9-10)": b.excellent?.count || 0,
      "Giỏi (8-8.9)": b.good?.count || 0,
      "Khá (7-7.9)": b.satisfactory?.count || 0,
      "Trung bình (5-6.9)": b.average?.count || 0,
      "Chưa đạt (<5)": b.poor?.count || 0
    }
  })

  // 3. Data for Chart 3: Department Peers
  const peers = departmentData?.peers || []
  const peersChartData = peers.map((p: any) => ({
    name: p.isCurrentTeacher ? `${p.teacherName} (Bạn)` : p.teacherName,
    "ĐTB Môn": p.avgScore,
    "Tỉ lệ Đạt chuẩn (%)": p.pctPassed,
    isCurrent: p.isCurrentTeacher
  }))

  // 4. Data for Chart 4: Longitudinal Multi-Line Trend
  const PERIODS = ["KSĐN", "GK1", "CK1", "GK2", "CK2"]
  const trendLineData = PERIODS.map(pCode => {
    const point: any = { period: pCode }
    trendMatrix.forEach(t => {
      const pStat = t.periodStats?.[pCode]
      if (pStat && pStat.gradedCount > 0) {
        point[t.className] = pStat.avg
      } else {
        point[t.className] = null
      }
    })
    return point
  })

  // Distinct colors for up to 10 classes
  const CLASS_COLORS = [
    "#003B3A",
    "#0284C7",
    "#6930C3",
    "#10B981",
    "#F59E0B",
    "#EC4899",
    "#8B5CF6",
    "#14B8A6",
    "#F97316",
    "#64748B"
  ]

  return (
    <div className="space-y-6">
      {/* Row 1: Charts 1 & 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Class Avg Comparison */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  So sánh ĐTB các lớp phụ trách ({subjectName})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Điểm trung bình đợt {evaluationPeriod} so với Chuẩn sàn SKL
                </p>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classAvgData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fill: "#475569" }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(val: any) => [`${val} điểm`, "ĐTB"]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <ReferenceLine 
                  y={departmentData?.departmentAvg || 6.5} 
                  stroke="#F59E0B" 
                  strokeDasharray="4 4" 
                  label={{ value: `TB Tổ CM: ${departmentData?.departmentAvg?.toFixed(1) || 6.5}`, position: "top", fill: "#B45309", fontSize: 10 }} 
                />
                <ReferenceLine 
                  y={classAnalytics[0]?.benchmark || 6.0} 
                  stroke="#EF4444" 
                  strokeDasharray="3 3" 
                  label={{ value: `Chuẩn sàn: ${classAnalytics[0]?.benchmark || 6.0}`, position: "bottom", fill: "#B91C1C", fontSize: 10 }} 
                />
                <Bar dataKey="ĐTB Lớp" fill="#0284C7" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Stacked Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 text-[#6930C3]">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Cơ cấu Phổ điểm 5 Dải Sky-Line
                </h4>
                <p className="text-[11px] text-slate-500">
                  Số lượng học sinh từng dải điểm theo lớp đợt {evaluationPeriod}
                </p>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 11, fill: "#475569" }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(val: any, name: any) => [`${val} học sinh`, name]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar dataKey="Chưa đạt (<5)" stackId="a" fill="#EF4444" />
                <Bar dataKey="Trung bình (5-6.9)" stackId="a" fill="#F59E0B" />
                <Bar dataKey="Khá (7-7.9)" stackId="a" fill="#0284C7" />
                <Bar dataKey="Giỏi (8-8.9)" stackId="a" fill="#10B981" />
                <Bar dataKey="Xuất sắc (9-10)" stackId="a" fill="#6930C3" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Charts 3 & 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Department Peers */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Đối sánh GVBM trong Tổ chuyên môn
                </h4>
                <p className="text-[11px] text-slate-500">
                  So sánh ĐTB môn giữa các giáo viên cùng tổ
                </p>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peersChartData} margin={{ top: 10, right: 10, left: -20, bottom: 35 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: "#475569" }} 
                  interval={0} 
                  angle={-15} 
                  textAnchor="end"
                />
                <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fill: "#475569" }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(val: any, name: any) => [`${val} điểm`, name]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "15px" }} />
                <ReferenceLine 
                  y={departmentData?.departmentAvg || 6.5} 
                  stroke="#F59E0B" 
                  strokeDasharray="4 4" 
                  label={{ value: `TB Tổ: ${departmentData?.departmentAvg?.toFixed(1) || 6.5}`, position: "top", fill: "#B45309", fontSize: 10 }} 
                />
                <Bar dataKey="ĐTB Môn" fill="#003B3A" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Multi-line Longitudinal Trend */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Tiến trình Biến động Chất lượng Đa kỳ
                </h4>
                <p className="text-[11px] text-slate-500">
                  Xu hướng ĐTB các lớp từ KSĐN qua GK1, CK1, GK2, CK2
                </p>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendLineData} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis domain={[4, 10]} ticks={[4, 5, 6, 7, 8, 9, 10]} tick={{ fontSize: 11, fill: "#475569" }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(val: any, name: any) => [`${val !== null ? val.toFixed(1) : "—"} điểm`, `Lớp ${name}`]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <ReferenceLine 
                  y={classAnalytics[0]?.benchmark || 6.0} 
                  stroke="#EF4444" 
                  strokeDasharray="3 3" 
                  label={{ value: `Sàn SKL: ${classAnalytics[0]?.benchmark || 6.0}`, position: "bottom", fill: "#B91C1C", fontSize: 10 }} 
                />
                {trendMatrix.map((t, idx) => (
                  <Line
                    key={t.classId}
                    type="monotone"
                    dataKey={t.className}
                    stroke={CLASS_COLORS[idx % CLASS_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
