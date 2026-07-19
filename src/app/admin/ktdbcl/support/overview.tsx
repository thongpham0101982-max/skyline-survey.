"use client"

import { useMemo } from "react"
import {
  Users, BookOpen, Brain, AlertTriangle,
  Clock, AlertCircle, UserCheck, BookOpenCheck, Bell,
  LayoutDashboard, TrendingUp, Shield, GraduationCap
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
}: OverviewDashboardProps) {

  // ===== KPI: Tổng số học sinh theo dõi (unique) =====
  const uniqueStudentIds = useMemo(() => new Set(targets.map(t => t.studentId)), [targets])
  const totalStudents = uniqueStudentIds.size

  // ===== KPI: Phân loại theo supportType =====
  const academicTargets = useMemo(() => targets.filter(t => t.supportType === "ACADEMIC"), [targets])
  const psychologyTargets = useMemo(() => targets.filter(t => t.supportType === "PSYCHOLOGICAL"), [targets])

  // ===== KPI: Học sinh có cả hai loại hỗ trợ =====
  const dualSupportCount = useMemo(() => {
    const acadIds = new Set(academicTargets.map(t => t.studentId))
    return psychologyTargets.filter(t => acadIds.has(t.studentId)).length
  }, [academicTargets, psychologyTargets])

  // ===== KPI: Tình trạng theo dõi =====
  const activeCount = useMemo(() => targets.filter(t => t.terminationStatus === "ACTIVE" && t.assignments && t.assignments.length > 0).length, [targets])
  const pendingApprovalCount = useMemo(() => targets.filter(t => t.terminationStatus === "ACTIVE" && (!t.assignments || t.assignments.length === 0)).length, [targets])
  const pendingTermCount = useMemo(() => targets.filter(t => t.terminationStatus === "PENDING_TERMINATION").length, [targets])
  const terminatedCount = useMemo(() => targets.filter(t => t.terminationStatus === "TERMINATED").length, [targets])

  // ===== Alert count: những trường hợp cần xử lý =====
  const alertCount = pendingApprovalCount + pendingTermCount

  // ===== GRADE BAR CHART: chỉ từ className (Ví dụ: "10A1" → Khối 10) =====
  const gradeBarData = useMemo(() => {
    const grades: Record<string, { academic: number; psychology: number }> = {}

    targets.forEach(t => {
      const className = t.student?.class?.className || ""
      const match = className.match(/^(\d+)/)
      const gradeNum = match ? match[1] : null
      if (!gradeNum) return

      const key = `Khối ${gradeNum}`
      if (!grades[key]) grades[key] = { academic: 0, psychology: 0 }

      if (t.supportType === "ACADEMIC") grades[key].academic++
      else if (t.supportType === "PSYCHOLOGICAL") grades[key].psychology++
    })

    return Object.entries(grades)
      .sort(([a], [b]) => {
        const nA = parseInt(a.replace(/\D/g, "")) || 99
        const nB = parseInt(b.replace(/\D/g, "")) || 99
        return nA - nB
      })
      .map(([name, vals]) => ({
        name,
        academic: vals.academic,
        psychology: vals.psychology,
        total: vals.academic + vals.psychology,
      }))
  }, [targets])

  const maxBar = Math.max(...gradeBarData.map(d => d.total), 1)

  // ===== PROGRESS DONUT: từ evaluations thực =====
  const progressData = useMemo(() => {
    const allEvals = targets.flatMap(t => t.evaluations || [])
    const total = allEvals.length
    if (total === 0) return null

    let good = 0, improving = 0, poor = 0, inactive = 0
    allEvals.forEach(ev => {
      const level = (ev.trackingLevel || "").toLowerCase()
      if (level.includes("tốt") || level.includes("đạt") || level.includes("giỏi")) good++
      else if (level.includes("khá") || level.includes("cải thiện") || level.includes("trung bình")) improving++
      else if (level.includes("yếu") || level.includes("chưa")) poor++
      else inactive++
    })

    return {
      good: Math.round((good / total) * 100),
      improving: Math.round((improving / total) * 100),
      poor: Math.round((poor / total) * 100),
      inactive: Math.round((inactive / total) * 100),
      goodCount: good,
      total,
    }
  }, [targets])

  // ===== TOP ALERTS: học sinh thực cần chú ý =====
  const topAlerts = useMemo(() => {
    return targets
      .filter(t => {
        const daysSince = (Date.now() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24)
        return t.terminationStatus === "PENDING_TERMINATION" ||
          (t.terminationStatus === "ACTIVE" && (!t.assignments || t.assignments.length === 0) && daysSince > 3)
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5)
      .map(t => {
        const daysSince = Math.round((Date.now() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24))
        const isPendingTerm = t.terminationStatus === "PENDING_TERMINATION"
        return {
          id: t.id,
          studentName: t.student?.studentName || "–",
          studentCode: t.student?.studentCode || "",
          className: t.student?.class?.className || "–",
          supportType: t.supportType === "ACADEMIC" ? "Phụ đạo" : "Tâm lý",
          reason: isPendingTerm
            ? "Chờ xét duyệt kết thúc"
            : `Chưa phân công sau ${daysSince} ngày`,
          alertType: isPendingTerm ? "warning" : "error",
          alertDate: new Date(t.startDate).toLocaleDateString("vi-VN"),
        }
      })
  }, [targets])

  // ===== PER-CAMPUS STATS =====
  const campusStats = useMemo(() => {
    return campuses.map(c => {
      const campusTargets = targets.filter(t => t.student?.class?.campusId === c.id)
      return {
        id: c.id,
        name: c.campusName,
        total: campusTargets.length,
        academic: campusTargets.filter(t => t.supportType === "ACADEMIC").length,
        psychology: campusTargets.filter(t => t.supportType === "PSYCHOLOGICAL").length,
        pending: campusTargets.filter(t => (!t.assignments || t.assignments.length === 0) && t.terminationStatus === "ACTIVE").length,
        active: campusTargets.filter(t => t.assignments && t.assignments.length > 0 && t.terminationStatus === "ACTIVE").length,
      }
    }).filter(c => c.total > 0)
  }, [targets, campuses])

  // ===== NO DATA STATE =====
  const hasNoData = targets.length === 0

  // ===== SUBJECT STATS: từ assignments[].subject =====
  const subjectStats = useMemo(() => {
    const map: Record<string, { name: string; students: Set<string>; academic: number; psychology: number; active: number; terminated: number }> = {}

    targets.forEach(t => {
      const subjectAssignments = (t.assignments || []).filter((a: any) => a.subject)
      if (subjectAssignments.length === 0) return
      subjectAssignments.forEach((a: any) => {
        const sId = a.subject.id
        const sName = a.subject.subjectName
        if (!map[sId]) map[sId] = { name: sName, students: new Set(), academic: 0, psychology: 0, active: 0, terminated: 0 }
        map[sId].students.add(t.studentId)
        if (t.supportType === "ACADEMIC") map[sId].academic++
        else if (t.supportType === "PSYCHOLOGICAL") map[sId].psychology++
        if (t.terminationStatus === "ACTIVE" || t.terminationStatus === "PENDING_TERMINATION") map[sId].active++
        else if (t.terminationStatus === "TERMINATED") map[sId].terminated++
      })
    })

    return Object.values(map)
      .map(v => ({ ...v, total: v.students.size }))
      .sort((a, b) => b.total - a.total)
  }, [targets])

  // ===== TEACHER STATS: từ assignments[].teacher =====
  const teacherStats = useMemo(() => {
    const map: Record<string, { name: string; students: Set<string>; academic: number; psychology: number; active: number; terminated: number; subjects: Set<string> }> = {}

    targets.forEach(t => {
      const teacherAssignments = (t.assignments || []).filter((a: any) => a.teacher)
      if (teacherAssignments.length === 0) return
      teacherAssignments.forEach((a: any) => {
        const tId = a.teacher.id
        const tName = a.teacher.teacherName
        if (!map[tId]) map[tId] = { name: tName, students: new Set(), academic: 0, psychology: 0, active: 0, terminated: 0, subjects: new Set() }
        map[tId].students.add(t.studentId)
        if (t.supportType === "ACADEMIC") map[tId].academic++
        else if (t.supportType === "PSYCHOLOGICAL") map[tId].psychology++
        if (t.terminationStatus === "ACTIVE" || t.terminationStatus === "PENDING_TERMINATION") map[tId].active++
        else if (t.terminationStatus === "TERMINATED") map[tId].terminated++
        if (a.subject?.subjectName) map[tId].subjects.add(a.subject.subjectName)
      })
    })

    return Object.values(map)
      .map(v => ({ ...v, total: v.students.size, subjectList: Array.from(v.subjects).join(", ") }))
      .sort((a, b) => b.total - a.total)
  }, [targets])

  const campusColors = [
    { from: "from-violet-500", to: "to-purple-600", shadow: "shadow-violet-100", badge: "bg-violet-100 text-violet-700", ring: "ring-violet-200" },
    { from: "from-sky-500", to: "to-cyan-600", shadow: "shadow-sky-100", badge: "bg-sky-100 text-sky-700", ring: "ring-sky-200" },
    { from: "from-teal-500", to: "to-emerald-600", shadow: "shadow-teal-100", badge: "bg-teal-100 text-teal-700", ring: "ring-teal-200" },
    { from: "from-rose-500", to: "to-pink-600", shadow: "shadow-rose-100", badge: "bg-rose-100 text-rose-700", ring: "ring-rose-200" },
    { from: "from-amber-500", to: "to-orange-600", shadow: "shadow-amber-100", badge: "bg-amber-100 text-amber-700", ring: "ring-amber-200" },
  ]

  return (
    <div className="space-y-5">

      {/* ===== NO DATA BANNER ===== */}
      {hasNoData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center gap-3 text-sm text-amber-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-500" />
          <span>Chưa có dữ liệu bồi dưỡng cho năm học này. Chọn năm học khác hoặc thêm học sinh vào danh sách theo dõi.</span>
        </div>
      )}

      {/* ===== KPI SUMMARY CARDS ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

        {/* Tổng học sinh */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-indigo-100 relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 w-20 h-20 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="p-2 bg-white/20 rounded-xl w-fit mb-3">
              <Users className="h-5 w-5" />
            </div>
            <div className="text-4xl font-black">{totalStudents}</div>
            <div className="text-xs text-indigo-100 mt-1 font-medium">Học sinh đang theo dõi</div>
          </div>
        </div>

        {/* Phụ đạo học tập */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-100 relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 w-20 h-20 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="p-2 bg-white/20 rounded-xl w-fit mb-3">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="text-4xl font-black">{academicTargets.length}</div>
            <div className="text-xs text-blue-100 mt-1 font-medium">Phụ đạo học tập</div>
          </div>
        </div>

        {/* Tâm lý */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-purple-100 relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 w-20 h-20 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="p-2 bg-white/20 rounded-xl w-fit mb-3">
              <Brain className="h-5 w-5" />
            </div>
            <div className="text-4xl font-black">{psychologyTargets.length}</div>
            <div className="text-xs text-purple-100 mt-1 font-medium">Hỗ trợ tâm lý</div>
          </div>
        </div>

        {/* Cả hai */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-100 relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 w-20 h-20 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="p-2 bg-white/20 rounded-xl w-fit mb-3">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="text-4xl font-black">{dualSupportCount}</div>
            <div className="text-xs text-orange-100 mt-1 font-medium">Theo dõi cả hai</div>
          </div>
        </div>

        {/* Cảnh báo */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg shadow-rose-100 relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 w-20 h-20 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="p-2 bg-white/20 rounded-xl w-fit mb-3">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="text-4xl font-black">{alertCount}</div>
            <div className="text-xs text-rose-100 mt-1 font-medium">Cần xử lý</div>
          </div>
        </div>
      </div>

      {/* ===== STATUS ROW ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Đang bồi dưỡng", value: activeCount, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
          { label: "Chờ phân công", value: pendingApprovalCount, color: "text-orange-600 bg-orange-50 border-orange-200" },
          { label: "Chờ kết thúc", value: pendingTermCount, color: "text-amber-600 bg-amber-50 border-amber-200" },
          { label: "Đã kết thúc", value: terminatedCount, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
        ].map((item, i) => (
          <div key={i} className={`border rounded-xl px-4 py-3 flex items-center justify-between ${item.color}`}>
            <span className="text-xs font-semibold">{item.label}</span>
            <span className="text-2xl font-black">{item.value}</span>
          </div>
        ))}
      </div>

      {/* ===== MAIN GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT: Bar Chart theo Khối */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-0.5">Thống kê theo khối</h2>
          <p className="text-xs text-slate-400 mb-5">Phân bổ học sinh cần hỗ trợ theo từng khối lớp</p>

          {gradeBarData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <LayoutDashboard className="h-8 w-8 mb-2 opacity-30" />
              <span className="text-xs">Chưa có dữ liệu theo khối</span>
            </div>
          ) : (
            <div className="space-y-3">
              {gradeBarData.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600 w-16">{item.name}</span>
                    <span className="text-xs font-black text-slate-800">{item.total}</span>
                  </div>
                  <div className="h-6 w-full rounded-lg overflow-hidden bg-slate-100 flex">
                    {item.academic > 0 && (
                      <div
                        style={{ width: `${(item.academic / maxBar) * 100}%` }}
                        className="bg-blue-500 h-full flex items-center justify-end transition-all duration-700"
                        title={`Phụ đạo: ${item.academic}`}
                      >
                        {item.academic > 2 && <span className="text-[10px] font-bold text-white pr-1">{item.academic}</span>}
                      </div>
                    )}
                    {item.psychology > 0 && (
                      <div
                        style={{ width: `${(item.psychology / maxBar) * 100}%` }}
                        className="bg-purple-500 h-full flex items-center justify-end transition-all duration-700"
                        title={`Tâm lý: ${item.psychology}`}
                      >
                        {item.psychology > 1 && <span className="text-[10px] font-bold text-white pr-1">{item.psychology}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mt-5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
              <span className="text-[11px] font-semibold text-slate-500">Phụ đạo học tập</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-500 inline-block" />
              <span className="text-[11px] font-semibold text-slate-500">Hỗ trợ tâm lý</span>
            </div>
          </div>
        </div>

        {/* CENTER: Alert Student List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-bold text-slate-800">Học sinh cần chú ý</h2>
            {topAlerts.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 animate-pulse uppercase tracking-wide">
                Cảnh báo
              </span>
            )}
          </div>

          {topAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <BookOpenCheck className="h-8 w-8 mb-2 opacity-30" />
              <span className="text-xs text-center">Tất cả học sinh đã được phân công hỗ trợ</span>
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
                    <span className="text-[10px] text-slate-400 block mt-0.5">Bắt đầu: {alert.alertDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Donut + Tasks */}
        <div className="flex flex-col gap-5">

          {/* Donut Chart tiến bộ */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1">
            <h2 className="text-base font-bold text-slate-800 mb-0.5">Tỷ lệ tiến bộ của học sinh</h2>
            <p className="text-xs text-slate-400 mb-4">Dựa trên kết quả đánh giá định kỳ đã ghi nhận</p>

            {!progressData ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <TrendingUp className="h-8 w-8 mb-2 opacity-30" />
                <span className="text-xs text-center">Chưa có đánh giá định kỳ nào được ghi nhận</span>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                {/* SVG Donut */}
                <div className="relative flex-shrink-0 w-28 h-28">
                  <svg viewBox="0 0 120 120" className="w-28 h-28 -rotate-90">
                    <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                    <circle cx="60" cy="60" r="46" fill="none" stroke="#10b981"
                      strokeWidth="14"
                      strokeDasharray={`${progressData.good * 2.89} ${(100 - progressData.good) * 2.89}`}
                      strokeDashoffset="0"
                    />
                    <circle cx="60" cy="60" r="46" fill="none" stroke="#8b5cf6"
                      strokeWidth="14"
                      strokeDasharray={`${progressData.improving * 2.89} ${(100 - progressData.improving) * 2.89}`}
                      strokeDashoffset={`${-progressData.good * 2.89}`}
                    />
                    <circle cx="60" cy="60" r="46" fill="none" stroke="#f59e0b"
                      strokeWidth="14"
                      strokeDasharray={`${progressData.poor * 2.89} ${(100 - progressData.poor) * 2.89}`}
                      strokeDashoffset={`${-(progressData.good + progressData.improving) * 2.89}`}
                    />
                    <circle cx="60" cy="60" r="46" fill="none" stroke="#f43f5e"
                      strokeWidth="14"
                      strokeDasharray={`${progressData.inactive * 2.89} ${(100 - progressData.inactive) * 2.89}`}
                      strokeDashoffset={`${-(progressData.good + progressData.improving + progressData.poor) * 2.89}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-800">{progressData.good}%</span>
                    <span className="text-[9px] text-slate-500 font-semibold">Tiến bộ</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-2 flex-1">
                  {[
                    { label: "Tiến bộ tốt", pct: progressData.good, color: "bg-emerald-500" },
                    { label: "Đang cải thiện", pct: progressData.improving, color: "bg-violet-500" },
                    { label: "Chưa cải thiện", pct: progressData.poor, color: "bg-amber-500" },
                    { label: "Chưa đánh giá", pct: progressData.inactive, color: "bg-rose-500" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.color}`} />
                      <span className="text-xs text-slate-500 flex-1">{item.label}</span>
                      <span className="text-xs font-bold text-slate-700">{item.pct}%</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-100 pt-2 mt-1">
                    <span className="text-[11px] text-slate-400">
                      Tổng: <span className="font-bold text-slate-600">{progressData.total} lượt đánh giá</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Công việc cần xử lý */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              Công việc cần xử lý
            </h2>
            <div className="space-y-3">
              {pendingApprovalCount > 0 && (
                <div className="flex items-start gap-3 group">
                  <div className="mt-0.5 p-1.5 bg-orange-100 rounded-lg flex-shrink-0">
                    <UserCheck className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                  <span className="text-xs text-slate-700">
                    <span className="text-orange-700 font-black">{pendingApprovalCount}</span> hồ sơ chờ phân công giáo viên phụ trách
                  </span>
                </div>
              )}
              {pendingTermCount > 0 && (
                <div className="flex items-start gap-3 group">
                  <div className="mt-0.5 p-1.5 bg-amber-100 rounded-lg flex-shrink-0">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <span className="text-xs text-slate-700">
                    <span className="text-amber-700 font-black">{pendingTermCount}</span> trường hợp đang chờ xét duyệt kết thúc bồi dưỡng
                  </span>
                </div>
              )}
              {(() => {
                const noEval = assignments.filter(a => {
                  const target = targets.find(t => t.id === a.targetId)
                  return target && (!target.evaluations || target.evaluations.length === 0)
                }).length
                return noEval > 0 ? (
                  <div className="flex items-start gap-3 group">
                    <div className="mt-0.5 p-1.5 bg-rose-100 rounded-lg flex-shrink-0">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                    </div>
                    <span className="text-xs text-slate-700">
                      <span className="text-rose-700 font-black">{noEval}</span> học sinh đã được phân công nhưng chưa có đánh giá nào
                    </span>
                  </div>
                ) : null
              })()}
              {pendingApprovalCount === 0 && pendingTermCount === 0 && (
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium">
                  <BookOpenCheck className="h-4 w-4" />
                  Không có công việc tồn đọng
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== CAMPUS STATS ===== */}
      {campusStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campusStats.map((c, i) => {
            const col = campusColors[i % campusColors.length]
            return (
              <div key={c.id} className={`bg-gradient-to-br ${col.from} ${col.to} rounded-2xl p-5 text-white shadow-lg ${col.shadow} relative overflow-hidden`}>
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <Shield className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-sm truncate">{c.name}</h3>
                  </div>
                  <div className="text-3xl font-black">{c.total}</div>
                  <p className="text-xs text-white/80 mt-0.5 mb-3">Học sinh đang theo dõi</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white/15 px-2 py-1 rounded-lg text-xs font-bold">
                      <BookOpen className="h-3 w-3" />
                      {c.academic} Phụ đạo
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/15 px-2 py-1 rounded-lg text-xs font-bold">
                      <Brain className="h-3 w-3" />
                      {c.psychology} Tâm lý
                    </div>
                    {c.pending > 0 && (
                      <div className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-lg text-xs font-bold border border-white/30">
                        <AlertTriangle className="h-3 w-3" />
                        {c.pending} chờ phân công
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {/* ===== SUBJECT & TEACHER STATS ===== */}
      {(subjectStats.length > 0 || teacherStats.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Thống kê theo Môn học */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Thống kê theo Môn học</h2>
                <p className="text-xs text-slate-400">Số học sinh phụ đạo phân theo từng môn</p>
              </div>
            </div>

            {subjectStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <BookOpen className="h-7 w-7 mb-2 opacity-25" />
                <span className="text-xs">Chưa có dữ liệu theo môn</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Môn học</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">HS Phụ đạo</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">HS Tâm lý</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Đang theo dõi</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Đã kết thúc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjectStats.map((s, i) => {
                      const maxTotal = subjectStats[0]?.total || 1
                      const pct = Math.round((s.total / maxTotal) * 100)
                      return (
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{s.name}</span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black">{s.academic}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {s.psychology > 0 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-black">{s.psychology}</span>
                            ) : (
                              <span className="text-slate-300">–</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-black">{s.active}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {s.terminated > 0 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-black">{s.terminated}</span>
                            ) : (
                              <span className="text-slate-300">–</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td className="px-4 py-2.5 font-bold text-slate-600 text-xs">Tổng cộng</td>
                      <td className="px-4 py-2.5 text-center font-black text-blue-700">{subjectStats.reduce((s, v) => s + v.academic, 0)}</td>
                      <td className="px-4 py-2.5 text-center font-black text-purple-700">{subjectStats.reduce((s, v) => s + v.psychology, 0)}</td>
                      <td className="px-4 py-2.5 text-center font-black text-indigo-700">{subjectStats.reduce((s, v) => s + v.active, 0)}</td>
                      <td className="px-4 py-2.5 text-center font-black text-emerald-700">{subjectStats.reduce((s, v) => s + v.terminated, 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Thống kê theo Giáo viên */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <GraduationCap className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Thống kê theo Giáo viên</h2>
                <p className="text-xs text-slate-400">Số học sinh được phân công theo từng giáo viên</p>
              </div>
            </div>

            {teacherStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <GraduationCap className="h-7 w-7 mb-2 opacity-25" />
                <span className="text-xs">Chưa có phân công giáo viên nào</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Giáo viên</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Môn phụ trách</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Phụ đạo</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Tâm lý</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Đang TĐ</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Hoàn thành</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teacherStats.map((t, i) => {
                      const maxTotal = teacherStats[0]?.total || 1
                      const pct = Math.round((t.total / maxTotal) * 100)
                      return (
                        <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{t.name}</div>
                            <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {t.subjectList ? (
                              <span className="text-slate-500 text-[11px]">{t.subjectList}</span>
                            ) : (
                              <span className="text-slate-300">–</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black">{t.academic}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {t.psychology > 0 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-black">{t.psychology}</span>
                            ) : (
                              <span className="text-slate-300">–</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-black">{t.active}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {t.terminated > 0 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-black">{t.terminated}</span>
                            ) : (
                              <span className="text-slate-300">–</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td className="px-4 py-2.5 font-bold text-slate-600 text-xs" colSpan={2}>Tổng cộng</td>
                      <td className="px-4 py-2.5 text-center font-black text-blue-700">{teacherStats.reduce((s, v) => s + v.academic, 0)}</td>
                      <td className="px-4 py-2.5 text-center font-black text-purple-700">{teacherStats.reduce((s, v) => s + v.psychology, 0)}</td>
                      <td className="px-4 py-2.5 text-center font-black text-indigo-700">{teacherStats.reduce((s, v) => s + v.active, 0)}</td>
                      <td className="px-4 py-2.5 text-center font-black text-emerald-700">{teacherStats.reduce((s, v) => s + v.terminated, 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
