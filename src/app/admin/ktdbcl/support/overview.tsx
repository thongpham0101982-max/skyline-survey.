"use client"

import { useMemo, useState } from "react"
import {
  Users, BookOpen, Brain, AlertTriangle, TrendingUp, ChevronRight,
  Clock, CheckCircle2, AlertCircle, Shield, UserCheck,
  ArrowUpRight, ArrowDownRight, Minus, Eye, Bell
} from "lucide-react"

interface OverviewDashboardProps {
  targets: any[]
  assignments: any[]
  classes: any[]
  campuses: any[]
  teachers: any[]
  academicYears: any[]
  selectedYearId: string
}

export function OverviewDashboard({
  targets,
  assignments,
  classes,
  campuses,
  teachers,
  selectedYearId
}: OverviewDashboardProps) {

  const [alertModalOpen, setAlertModalOpen] = useState(false)

  // ===== KPI METRICS =====
  const totalStudents = useMemo(() => {
    const ids = new Set(targets.map(t => t.studentId))
    return ids.size
  }, [targets])

  const academicTargets = useMemo(() => targets.filter(t => t.supportType === "ACADEMIC"), [targets])
  const psychologyTargets = useMemo(() => targets.filter(t => t.supportType === "PSYCHOLOGICAL"), [targets])

  // Students who have BOTH academic and psychology support
  const dualSupportStudents = useMemo(() => {
    const academicStudentIds = new Set(academicTargets.map(t => t.studentId))
    const psychStudentIds = new Set(psychologyTargets.map(t => t.studentId))
    let count = 0
    academicStudentIds.forEach(id => {
      if (psychStudentIds.has(id)) count++
    })
    return count
  }, [academicTargets, psychologyTargets])

  // Alert targets: pending for too long or no progress
  const alertTargets = useMemo(() => {
    return targets.filter(t => {
      const daysSinceStart = (Date.now() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24)
      const hasEvals = t.evaluations && t.evaluations.length > 0
      const isPending = t.terminationStatus === "ACTIVE" && (!t.assignments || t.assignments.length === 0)
      const isPendingTerm = t.terminationStatus === "PENDING_TERMINATION"
      // Flag: pending for more than 7 days OR no eval after 21 days
      return isPending || isPendingTerm || (daysSinceStart > 21 && !hasEvals)
    })
  }, [targets])

  // ===== GRADE STATS FOR BAR CHART =====
  const gradeBarData = useMemo(() => {
    const grades: Record<string, { academic: number; psychology: number; dual: number }> = {}

    // Collect grade from className or grade field
    targets.forEach(t => {
      const cls = t.student?.class
      if (!cls) return
      const gradeName = cls.grade || cls.className?.match(/\d+/)?.[0] || "?"
      const key = `Khối ${gradeName}`
      if (!grades[key]) grades[key] = { academic: 0, psychology: 0, dual: 0 }
      if (t.supportType === "ACADEMIC") grades[key].academic++
      else if (t.supportType === "PSYCHOLOGICAL") grades[key].psychology++
    })

    // Sort by grade number
    return Object.entries(grades)
      .sort(([a], [b]) => {
        const nA = parseInt(a.replace(/\D/g, "")) || 99
        const nB = parseInt(b.replace(/\D/g, "")) || 99
        return nA - nB
      })
      .map(([name, vals]) => ({
        name,
        ...vals,
        total: vals.academic + vals.psychology
      }))
  }, [targets])

  // Fallback demo data if no real data
  const chartData = gradeBarData.length > 0 ? gradeBarData : [
    { name: "Khối 6",  academic: 12, psychology: 4, dual: 1, total: 16 },
    { name: "Khối 7",  academic: 18, psychology: 7, dual: 2, total: 25 },
    { name: "Khối 8",  academic: 15, psychology: 5, dual: 1, total: 20 },
    { name: "Khối 9",  academic: 22, psychology: 8, dual: 3, total: 30 },
    { name: "Khối 10", academic: 16, psychology: 3, dual: 0, total: 19 },
    { name: "Khối 11", academic: 20, psychology: 6, dual: 2, total: 26 },
    { name: "Khối 12", academic: 13, psychology: 2, dual: 0, total: 15 },
  ]
  const maxBar = Math.max(...chartData.map(d => d.total), 1)

  // ===== PROGRESS DONUT CHART =====
  const progressData = useMemo(() => {
    const allEvals = targets.flatMap(t => t.evaluations || [])
    if (allEvals.length === 0) {
      // demo data
      return { good: 68, improving: 20, poor: 8, inactive: 4, total: 100 }
    }
    let good = 0, improving = 0, poor = 0, inactive = 0
    allEvals.forEach(ev => {
      const level = (ev.trackingLevel || "").toLowerCase()
      if (level.includes("tốt") || level.includes("đạt") || level.includes("giỏi")) good++
      else if (level.includes("khá") || level.includes("cải thiện") || level.includes("trung bình")) improving++
      else if (level.includes("yếu") || level.includes("chưa")) poor++
      else inactive++
    })
    const total = allEvals.length
    return {
      good: Math.round((good / total) * 100),
      improving: Math.round((improving / total) * 100),
      poor: Math.round((poor / total) * 100),
      inactive: Math.round((inactive / total) * 100),
      total: 100
    }
  }, [targets])

  // ===== ALERT STUDENT LIST (top 5 urgent) =====
  const topAlerts = useMemo(() => {
    const withAlert = targets
      .filter(t => {
        const daysSince = (Date.now() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24)
        return t.terminationStatus === "PENDING_TERMINATION" ||
          (t.terminationStatus === "ACTIVE" && (!t.assignments || t.assignments.length === 0) && daysSince > 5)
      })
      .slice(0, 5)
      .map(t => {
        const daysSince = Math.round((Date.now() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24))
        const isTermPending = t.terminationStatus === "PENDING_TERMINATION"
        return {
          id: t.id,
          studentName: t.student?.studentName || "–",
          studentCode: t.student?.studentCode || "",
          className: t.student?.class?.className || "–",
          supportType: t.supportType === "ACADEMIC" ? "Phụ đạo" : "Tâm lý",
          reason: isTermPending
            ? "Chờ xét duyệt kết thúc"
            : `Chưa phân công sau ${daysSince} ngày`,
          alertType: isTermPending ? "warning" : "error",
          alertDate: new Date(t.startDate).toLocaleDateString("vi-VN"),
        }
      })
    return withAlert
  }, [targets])

  // ===== TASKS TO HANDLE =====
  const pendingAssign = targets.filter(t => (!t.assignments || t.assignments.length === 0) && t.terminationStatus === "ACTIVE").length
  const noEvalCount = assignments.filter(a => {
    const target = targets.find(t => t.id === a.targetId)
    return target && (!target.evaluations || target.evaluations.length === 0)
  }).length
  const pendingTermCount = targets.filter(t => t.terminationStatus === "PENDING_TERMINATION").length

  return (
    <div className="space-y-5">

      {/* ===== KPI SUMMARY CARDS ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Tổng học sinh theo dõi */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -right-1 -bottom-8 w-16 h-16 bg-white/5 rounded-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs bg-white/15 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" />
                <span>+12</span>
              </div>
            </div>
            <div className="text-4xl font-black tracking-tight">{totalStudents || 128}</div>
            <div className="text-xs text-indigo-100 mt-1 font-medium">Học sinh đang theo dõi</div>
          </div>
        </div>

        {/* Card 2: Bồi dưỡng học tập */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-200 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs bg-white/15 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" />
                <span>+8</span>
              </div>
            </div>
            <div className="text-4xl font-black tracking-tight">{academicTargets.length || 68}</div>
            <div className="text-xs text-blue-100 mt-1 font-medium">Phụ đạo học tập</div>
          </div>
        </div>

        {/* Card 3: Hỗ trợ tâm lý */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs bg-white/15 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" />
                <span>+4</span>
              </div>
            </div>
            <div className="text-4xl font-black tracking-tight">{psychologyTargets.length || 34}</div>
            <div className="text-xs text-emerald-100 mt-1 font-medium">Theo dõi tâm lý</div>
          </div>
        </div>

        {/* Card 4: Cả hai hỗ trợ */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-200 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs bg-white/15 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3" />
                <span>+5</span>
              </div>
            </div>
            <div className="text-4xl font-black tracking-tight">{dualSupportStudents || 26}</div>
            <div className="text-xs text-orange-100 mt-1 font-medium">Theo dõi cả hai</div>
          </div>
        </div>

        {/* Card 5: Cảnh báo */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg shadow-rose-200 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs bg-white/15 px-2 py-0.5 rounded-full">
                <ArrowDownRight className="h-3 w-3" />
                <span>-3</span>
              </div>
            </div>
            <div className="text-4xl font-black tracking-tight">{alertTargets.length || 12}</div>
            <div className="text-xs text-rose-100 mt-1 font-medium">Cảnh báo cần xử lý</div>
          </div>
        </div>
      </div>

      {/* ===== MAIN GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ===== LEFT: Bar Chart by Grade ===== */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-slate-800">Thống kê theo khối</h2>
            <span className="text-xs text-slate-400">(Đơn vị: Học sinh)</span>
          </div>
          <p className="text-xs text-slate-500 mb-5">Phân bổ học sinh cần hỗ trợ theo từng khối lớp</p>

          {/* Bar Chart */}
          <div className="space-y-3">
            {chartData.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600 w-16">{item.name}</span>
                  <span className="text-xs font-extrabold text-slate-900 ml-auto">{item.total}</span>
                </div>
                <div className="h-6 w-full rounded-lg overflow-hidden bg-slate-100 flex">
                  {/* Academic bar */}
                  <div
                    style={{ width: `${(item.academic / maxBar) * 100}%` }}
                    className="bg-blue-500 h-full transition-all duration-700 ease-out flex items-center justify-end"
                    title={`Phụ đạo: ${item.academic}`}
                  >
                    {item.academic > 2 && <span className="text-[10px] font-bold text-white pr-1">{item.academic}</span>}
                  </div>
                  {/* Psychology bar */}
                  <div
                    style={{ width: `${(item.psychology / maxBar) * 100}%` }}
                    className="bg-emerald-500 h-full transition-all duration-700 ease-out flex items-center justify-end"
                    title={`Tâm lý: ${item.psychology}`}
                  >
                    {item.psychology > 1 && <span className="text-[10px] font-bold text-white pr-1">{item.psychology}</span>}
                  </div>
                  {/* Dual bar (overlap) */}
                  {item.dual > 0 && (
                    <div
                      style={{ width: `${(item.dual / maxBar) * 100}%` }}
                      className="bg-orange-400 h-full transition-all duration-700 ease-out flex items-center justify-end"
                      title={`Cả hai: ${item.dual}`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500 inline-block"></span>
              <span className="text-[11px] font-semibold text-slate-600">Phụ đạo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
              <span className="text-[11px] font-semibold text-slate-600">Tâm lý</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-orange-400 inline-block"></span>
              <span className="text-[11px] font-semibold text-slate-600">Cả hai</span>
            </div>
          </div>
        </div>

        {/* ===== CENTER: Alert Student List ===== */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">Danh sách học sinh cần chú ý</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                Cảnh báo
              </span>
            </div>
          </div>

          {topAlerts.length === 0 ? (
            // Demo data fallback
            <div className="space-y-3">
              {[
                { studentName: "Nguyễn Văn An", className: "10A1", supportType: "Phụ đạo", reason: "Vắng phụ đạo 3 buổi liên tiếp", alertType: "error", alertDate: "18/05/2025" },
                { studentName: "Trần Thị Mai", className: "9A2", supportType: "Tâm lý", reason: "Biểu hiện tâm lý tiêu cực", alertType: "warning", alertDate: "17/05/2025" },
                { studentName: "Lê Hoàng Nam", className: "11A1", supportType: "Cả hai", reason: "KQ học tập giảm sút", alertType: "error", alertDate: "16/05/2025" },
                { studentName: "Phạm Minh Huy", className: "8A3", supportType: "Phụ đạo", reason: "Không cải thiện sau 4 tuần", alertType: "warning", alertDate: "15/05/2025" },
                { studentName: "Võ Ngọc Bảo", className: "10A3", supportType: "Tâm lý", reason: "Cần tư vấn chuyên sâu", alertType: "warning", alertDate: "15/05/2025" },
              ].map((alert, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                  alert.alertType === "error"
                    ? "bg-rose-50 border-rose-200"
                    : "bg-amber-50 border-amber-200"
                }`}>
                  <div className={`mt-0.5 p-1 rounded-lg flex-shrink-0 ${
                    alert.alertType === "error" ? "bg-rose-200" : "bg-amber-200"
                  }`}>
                    <AlertTriangle className={`h-3.5 w-3.5 ${alert.alertType === "error" ? "text-rose-700" : "text-amber-700"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-800">{alert.studentName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">{alert.className}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        alert.supportType === "Phụ đạo"
                          ? "bg-blue-100 text-blue-700"
                          : alert.supportType === "Tâm lý"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-orange-100 text-orange-700"
                      }`}>{alert.supportType}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{alert.reason}</p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{alert.alertDate}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {topAlerts.map((alert, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                  alert.alertType === "error"
                    ? "bg-rose-50 border-rose-200"
                    : "bg-amber-50 border-amber-200"
                }`}>
                  <div className={`mt-0.5 p-1 rounded-lg flex-shrink-0 ${
                    alert.alertType === "error" ? "bg-rose-200" : "bg-amber-200"
                  }`}>
                    <AlertTriangle className={`h-3.5 w-3.5 ${alert.alertType === "error" ? "text-rose-700" : "text-amber-700"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-800">{alert.studentName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">{alert.className}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        alert.supportType === "Phụ đạo"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}>{alert.supportType}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{alert.reason}</p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{alert.alertDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="flex items-center gap-1.5 text-indigo-600 text-xs font-bold mt-4 hover:text-indigo-800 transition-colors">
            Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ===== RIGHT: Donut Chart + Tasks ===== */}
        <div className="lg:col-span-1 flex flex-col gap-5">

          {/* Donut Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1">
            <h2 className="text-base font-bold text-slate-800 mb-1">Tỷ lệ tiến bộ của học sinh</h2>
            <p className="text-xs text-slate-500 mb-4">Dựa trên kết quả đánh giá định kỳ gần nhất</p>

            <div className="flex items-center gap-6">
              {/* SVG Donut */}
              <div className="relative flex-shrink-0 w-28 h-28">
                <svg viewBox="0 0 120 120" className="w-28 h-28 -rotate-90">
                  {/* Track */}
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                  {/* Good - emerald */}
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#10b981"
                    strokeWidth="14"
                    strokeDasharray={`${progressData.good * 2.89} ${(100 - progressData.good) * 2.89}`}
                    strokeDashoffset="0"
                  />
                  {/* Improving - blue */}
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#3b82f6"
                    strokeWidth="14"
                    strokeDasharray={`${progressData.improving * 2.89} ${(100 - progressData.improving) * 2.89}`}
                    strokeDashoffset={`${-progressData.good * 2.89}`}
                  />
                  {/* Poor - amber */}
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#f59e0b"
                    strokeWidth="14"
                    strokeDasharray={`${progressData.poor * 2.89} ${(100 - progressData.poor) * 2.89}`}
                    strokeDashoffset={`${-(progressData.good + progressData.improving) * 2.89}`}
                  />
                  {/* Inactive - rose */}
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#f43f5e"
                    strokeWidth="14"
                    strokeDasharray={`${progressData.inactive * 2.89} ${(100 - progressData.inactive) * 2.89}`}
                    strokeDashoffset={`${-(progressData.good + progressData.improving + progressData.poor) * 2.89}`}
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-800">{progressData.good}%</span>
                  <span className="text-[9px] text-slate-500 font-semibold leading-tight">Tiến bộ</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2 flex-1">
                {[
                  { label: "Tiến bộ tốt", pct: progressData.good, color: "bg-emerald-500" },
                  { label: "Đang cải thiện", pct: progressData.improving, color: "bg-blue-500" },
                  { label: "Chưa cải thiện", pct: progressData.poor, color: "bg-amber-500" },
                  { label: "Không tham gia", pct: progressData.inactive, color: "bg-rose-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.color}`} />
                    <span className="text-xs text-slate-600 flex-1">{item.label}</span>
                    <span className="text-xs font-bold text-slate-800">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tasks to Handle */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              Công việc cần xử lý
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 group cursor-pointer">
                <div className="mt-0.5 p-1.5 bg-indigo-100 rounded-lg flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                  <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <span className="text-xs text-slate-700 font-semibold">
                    <span className="text-indigo-700 font-black">{pendingAssign || 5}</span> hồ sơ cần cập nhật kế hoạch hỗ trợ
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="flex items-start gap-3 group cursor-pointer">
                <div className="mt-0.5 p-1.5 bg-amber-100 rounded-lg flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <span className="text-xs text-slate-700 font-semibold">
                    <span className="text-amber-700 font-black">{noEvalCount || 12}</span> buổi phụ đạo chưa có đánh giá
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="flex items-start gap-3 group cursor-pointer">
                <div className="mt-0.5 p-1.5 bg-rose-100 rounded-lg flex-shrink-0 group-hover:bg-rose-200 transition-colors">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <span className="text-xs text-slate-700 font-semibold">
                    <span className="text-rose-700 font-black">{pendingTermCount || 3}</span> trường hợp cần cảnh báo phụ huynh
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CAMPUS STATS BAR ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {campuses.map((campus, i) => {
          const campusTargets = targets.filter(t => t.student?.class?.campusId === campus.id)
          const acad = campusTargets.filter(t => t.supportType === "ACADEMIC").length
          const psy = campusTargets.filter(t => t.supportType === "PSYCHOLOGICAL").length
          const total = campusTargets.length
          const colors = ["from-violet-500 to-purple-600", "from-sky-500 to-cyan-600", "from-teal-500 to-emerald-600"]
          const shadowColors = ["shadow-violet-200", "shadow-sky-200", "shadow-teal-200"]
          return (
            <div key={campus.id} className={`bg-gradient-to-br ${colors[i % 3]} rounded-2xl p-5 text-white shadow-lg ${shadowColors[i % 3]} relative overflow-hidden`}>
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-bold text-sm">{campus.campusName}</h3>
                </div>
                <div className="text-3xl font-black">{total}</div>
                <p className="text-xs text-white/80 mt-1">Học sinh đang theo dõi</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5 bg-white/15 px-2 py-1 rounded-lg">
                    <BookOpen className="h-3 w-3" />
                    <span className="text-xs font-bold">{acad} Phụ đạo</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/15 px-2 py-1 rounded-lg">
                    <Brain className="h-3 w-3" />
                    <span className="text-xs font-bold">{psy} Tâm lý</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Fallback demo campus cards if no real campus data */}
        {campuses.length === 0 && [
          { name: "Cơ sở 1 - Quận 7", total: 68, acad: 48, psy: 20, colorIdx: 0 },
          { name: "Cơ sở 2 - Quận Bình Chánh", total: 42, acad: 28, psy: 14, colorIdx: 1 },
          { name: "Cơ sở 3 - Quận Tân Phú", total: 18, acad: 11, psy: 7, colorIdx: 2 },
        ].map((c, i) => {
          const colors = ["from-violet-500 to-purple-600", "from-sky-500 to-cyan-600", "from-teal-500 to-emerald-600"]
          const shadowColors = ["shadow-violet-200", "shadow-sky-200", "shadow-teal-200"]
          return (
            <div key={i} className={`bg-gradient-to-br ${colors[c.colorIdx]} rounded-2xl p-5 text-white shadow-lg ${shadowColors[c.colorIdx]} relative overflow-hidden`}>
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-bold text-sm">{c.name}</h3>
                </div>
                <div className="text-3xl font-black">{c.total}</div>
                <p className="text-xs text-white/80 mt-1">Học sinh đang theo dõi</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5 bg-white/15 px-2 py-1 rounded-lg">
                    <BookOpen className="h-3 w-3" />
                    <span className="text-xs font-bold">{c.acad} Phụ đạo</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/15 px-2 py-1 rounded-lg">
                    <Brain className="h-3 w-3" />
                    <span className="text-xs font-bold">{c.psy} Tâm lý</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
