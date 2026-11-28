"use client"

import React, { useMemo, useState } from "react"
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  BarChart,
  Cell,
} from "recharts"
import {
  Award,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  Filter,
  Layers,
  Search,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  X,
  ArrowUpDown,
  AlertCircle,
} from "lucide-react"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"

interface AdminObservationDashboardProps {
  slots: any[]
  departments: any[]
  campuses: any[]
  teachers: any[]
  isPreschool?: boolean
  academicYearName?: string
  scopeLabel?: string
  onNavigateToSlots?: (opts?: {
    deptId?: string
    campusId?: string
    month?: string
    searchQuery?: string
  }) => void
  onNavigateToTTCMReport?: () => void
}

interface CriterionMeta {
  index: number
  code: string
  shortLabel: string
  fullLabel: string
  standardIdx: number
  standardName: string
  max: number
  scoreKey: string
}

const K12_STANDARDS = [
  { idx: 0, code: "TC1", name: "Phương tiện", fullName: "TC1. Phương tiện & Giáo án", max: 3.0 },
  { idx: 1, code: "TC2", name: "Nội dung", fullName: "TC2. Nội dung bài dạy", max: 5.0 },
  { idx: 2, code: "TC3", name: "Phương pháp", fullName: "TC3. Phương pháp & Tổ chức", max: 9.0 },
  { idx: 3, code: "TC4", name: "Kết quả", fullName: "TC4. Kết quả & Sáng tạo", max: 3.0 },
]

const K12_CRITERIA: CriterionMeta[] = [
  { index: 0, code: "YC1", shortLabel: "Giáo án & KHBD", fullLabel: "YC1. Chuẩn bị giáo án, bám sát chuẩn KTKN", standardIdx: 0, standardName: "Phương tiện", max: 1.5, scoreKey: "score1" },
  { index: 1, code: "YC2", shortLabel: "Thiết bị dạy học", fullLabel: "YC2. Sử dụng đồ dùng, thiết bị dạy học phù hợp", standardIdx: 0, standardName: "Phương tiện", max: 1.5, scoreKey: "score2" },
  { index: 2, code: "YC3", shortLabel: "Chính xác, hấp dẫn", fullLabel: "YC3. Nội dung chính xác, khoa học, hấp dẫn", standardIdx: 1, standardName: "Nội dung", max: 2.0, scoreKey: "score3" },
  { index: 3, code: "YC4", shortLabel: "Hệ thống, trọng tâm", fullLabel: "YC4. Đảm bảo tính hệ thống, làm rõ trọng tâm", standardIdx: 1, standardName: "Nội dung", max: 2.0, scoreKey: "score4" },
  { index: 4, code: "YC5", shortLabel: "Liên hệ thực tế", fullLabel: "YC5. Liên hệ thực tế đời sống, tính giáo dục", standardIdx: 1, standardName: "Nội dung", max: 1.0, scoreKey: "score5" },
  { index: 5, code: "YC6", shortLabel: "Phát hiện khó khăn", fullLabel: "YC6. Không đọc chép, phát hiện kịp thời khó khăn HS", standardIdx: 2, standardName: "Phương pháp", max: 2.0, scoreKey: "score6" },
  { index: 6, code: "YC7", shortLabel: "HS tích cực, hợp tác", fullLabel: "YC7. Tổ chức HS học tập chủ động, hợp tác nhóm", standardIdx: 2, standardName: "Phương pháp", max: 3.0, scoreKey: "score7" },
  { index: 7, code: "YC8", shortLabel: "Linh hoạt thời gian", fullLabel: "YC8. Linh hoạt các khâu lên lớp, phân phối thời gian", standardIdx: 2, standardName: "Phương pháp", max: 2.0, scoreKey: "score8" },
  { index: 8, code: "YC9", shortLabel: "Kết hợp phương pháp", fullLabel: "YC9. Kết hợp tốt phương pháp, HS sáng tạo thảo luận", standardIdx: 2, standardName: "Phương pháp", max: 2.0, scoreKey: "score9" },
  { index: 9, code: "YC10", shortLabel: "Đánh giá & Hiểu bài", fullLabel: "YC10. Kiểm tra đánh giá phù hợp, HS nắm vững bài", standardIdx: 3, standardName: "Kết quả", max: 2.0, scoreKey: "score10" },
  { index: 10, code: "YC11", shortLabel: "Nhuần nhuyễn, sáng tạo", fullLabel: "YC11. Tiết dạy nhuần nhuyễn, ấn tượng, sáng tạo", standardIdx: 3, standardName: "Kết quả", max: 1.0, scoreKey: "score11" },
]

const PRESCHOOL_STANDARDS = [
  { idx: 0, code: "TC1", name: "Nội dung", fullName: "TC1. Nội dung phù hợp", max: 2.0 },
  { idx: 1, code: "TC2", name: "Phương pháp", fullName: "TC2. Phương pháp tổ chức", max: 2.0 },
  { idx: 2, code: "TC3", name: "Học liệu", fullName: "TC3. Sử dụng học liệu trực quan", max: 2.0 },
  { idx: 3, code: "TC4", name: "Chăm sóc", fullName: "TC4. An toàn & Chăm sóc trẻ", max: 2.0 },
  { idx: 4, code: "TC5", name: "Tương tác", fullName: "TC5. Không khí & Tương tác trẻ", max: 2.0 },
]

const PRESCHOOL_CRITERIA: CriterionMeta[] = [
  { index: 0, code: "T1", shortLabel: "Nội dung phù hợp", fullLabel: "T1. Nội dung bài dạy phù hợp, chính xác", standardIdx: 0, standardName: "Nội dung", max: 2.0, scoreKey: "criterion1" },
  { index: 1, code: "T2", shortLabel: "Phương pháp tích cực", fullLabel: "T2. Phương pháp tổ chức hoạt động tích cực", standardIdx: 1, standardName: "Phương pháp", max: 2.0, scoreKey: "criterion2" },
  { index: 2, code: "T3", shortLabel: "Học liệu trực quan", fullLabel: "T3. Sử dụng học liệu, đồ chơi sinh động", standardIdx: 2, standardName: "Học liệu", max: 2.0, scoreKey: "criterion3" },
  { index: 3, code: "T4", shortLabel: "An toàn, chăm sóc", fullLabel: "T4. Đảm bảo an toàn, chăm sóc chu đáo trẻ", standardIdx: 3, standardName: "Chăm sóc", max: 2.0, scoreKey: "criterion4" },
  { index: 4, code: "T5", shortLabel: "Không khí tương tác", fullLabel: "T5. Không khí vui tươi, kích thích tương tác", standardIdx: 4, standardName: "Tương tác", max: 2.0, scoreKey: "criterion5" },
]

function isSurpriseSlot(slot: any): boolean {
  if (!slot) return false
  return (
    slot.requestOrigin === "SURPRISE" ||
    (typeof slot.description === "string" &&
      (slot.description.includes("[SURPRISE]") ||
        slot.description.toLowerCase().includes("dự giờ đột xuất"))) ||
    (typeof slot.topic === "string" && slot.topic.toLowerCase().includes("đột xuất"))
  )
}

function classifyRating(ratingRaw: string | null | undefined): "GOOD" | "FAIR" | "AVERAGE" | "POOR" {
  const r = (ratingRaw || "").toLowerCase().trim()
  if (
    r.includes("giỏi") ||
    r.includes("tốt") ||
    r.includes("strong practice") ||
    r.includes("proficient") ||
    r.includes("effective")
  ) {
    return "GOOD"
  }
  if (r.includes("khá") || r.includes("developing")) return "FAIR"
  if (r.includes("trung bình") || r.includes("đạt")) return "AVERAGE"
  return "POOR"
}

function extractEvaluationCriteriaScores(ev: any, isPreschool: boolean): number[] | null {
  if (!ev) return null
  if (!isPreschool) {
    const vals = K12_CRITERIA.map((c) => {
      const v = ev[c.scoreKey]
      return v != null && !Number.isNaN(Number(v)) ? Number(v) : null
    })
    if (vals.some((v) => v !== null && v > 0)) {
      return vals.map((v) => (v === null ? 0 : v))
    }
    return null
  } else {
    const vals = PRESCHOOL_CRITERIA.map((c) => {
      const v = ev[c.scoreKey]
      return v != null && !Number.isNaN(Number(v)) ? Number(v) : null
    })
    if (vals.some((v) => v !== null && v > 0)) {
      return vals.map((v) => (v === null ? 0 : v))
    }
    return null
  }
}

function getHeatBadgeClass(pct: number | null): string {
  if (pct === null) return "bg-slate-50 text-slate-400 border-slate-200"
  if (pct >= 90) return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (pct >= 80) return "bg-teal-50 text-[#00736E] border-teal-200"
  if (pct >= 70) return "bg-amber-50 text-amber-700 border-amber-200"
  return "bg-rose-50 text-rose-700 border-rose-200"
}

function getBarColor(pct: number): string {
  if (pct >= 90) return "#059669" // Emerald
  if (pct >= 80) return "#00A19A" // Brand Teal
  if (pct >= 70) return "#D97706" // Amber
  return "#E11D48" // Rose
}

export function AdminObservationDashboard({
  slots = [],
  departments = [],
  campuses = [],
  teachers = [],
  isPreschool = false,
  academicYearName = "",
  scopeLabel = "Toàn trường",
  onNavigateToSlots,
  onNavigateToTTCMReport,
}: AdminObservationDashboardProps) {
  const [filterCampus, setFilterCampus] = useState<string>("all")
  const [filterDept, setFilterDept] = useState<string>("all")
  const [filterMonth, setFilterMonth] = useState<string>("all")
  const [filterOrigin, setFilterOrigin] = useState<"ALL" | "PLAN" | "SURPRISE" | "ASSIGNED">("ALL")
  const [filterLevel, setFilterLevel] = useState<string>("all")

  const [radarGranularity, setRadarGranularity] = useState<"standards" | "criteria">("standards")
  const [matrixMode, setMatrixMode] = useState<"departments" | "teachers">("departments")
  const [selectedDeptCompareId, setSelectedDeptCompareId] = useState<string | null>(null)
  const [selectedTeacherProfileId, setSelectedTeacherProfileId] = useState<string | null>(null)
  const [teacherSearch, setTeacherSearch] = useState<string>("")
  const [teacherSortBy, setTeacherSortBy] = useState<"avgScore" | "taughtEvalCount" | "tc0" | "tc1" | "tc2" | "tc3">("avgScore")
  const [teacherSortAsc, setTeacherSortAsc] = useState<boolean>(false)

  const criteriaMeta = isPreschool ? PRESCHOOL_CRITERIA : K12_CRITERIA
  const standardsMeta = isPreschool ? PRESCHOOL_STANDARDS : K12_STANDARDS
  const maxScale = isPreschool ? 10 : 20

  // Map helpers for fast lookup
  const deptMap = useMemo(() => {
    const m = new Map<string, any>()
    departments.forEach((d) => m.set(d.id, d))
    return m
  }, [departments])

  const campusMap = useMemo(() => {
    const m = new Map<string, any>()
    campuses.forEach((c) => {
      m.set(c.id, c)
      if (c.campusCode) m.set(c.campusCode, c)
    })
    return m
  }, [campuses])

  // Available months sorted desc
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    slots.forEach((s) => {
      if (!s?.date) return
      const d = new Date(s.date)
      if (Number.isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      set.add(key)
    })
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [slots])

  // Filtered slots
  const filteredSlots = useMemo(() => {
    return slots.filter((s) => {
      if (filterCampus !== "all") {
        const sCampusId = s.campusId || s.teacher?.campusId
        const cObj = campusMap.get(filterCampus)
        if (sCampusId !== filterCampus && (!cObj || sCampusId !== cObj.campusCode)) {
          return false
        }
      }
      if (filterDept !== "all") {
        const sDeptId = s.targetDeptId || s.teacher?.departmentId
        const inAssign = (s.teacher?.departmentAssignments || []).some(
          (da: any) => da.departmentId === filterDept
        )
        if (sDeptId !== filterDept && !inAssign) return false
      }
      if (filterMonth !== "all" && s.date) {
        const d = new Date(s.date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        if (key !== filterMonth) return false
      }
      if (filterLevel !== "all" && s.level !== filterLevel) {
        return false
      }
      if (filterOrigin === "SURPRISE" && !isSurpriseSlot(s)) return false
      if (filterOrigin === "ASSIGNED" && s.requestOrigin !== "ASSIGNED") return false
      if (filterOrigin === "PLAN" && (isSurpriseSlot(s) || s.requestOrigin === "ASSIGNED")) return false
      return true
    })
  }, [slots, filterCampus, filterDept, filterMonth, filterLevel, filterOrigin, campusMap])

  // School-wide baseline competency (unfiltered by selectedDeptCompareId, so radar always has reference)
  const analytics = useMemo(() => {
    let totalRegistrations = 0
    let evaluatedCount = 0
    let pendingCount = 0
    let totalScoreSum = 0
    let scoredCount = 0

    const ratings = { GOOD: 0, FAIR: 0, AVERAGE: 0, POOR: 0 }
    const origins = { PLAN: 0, ASSIGNED: 0, SURPRISE: 0, REQUEST: 0 }

    const critSums = new Array(criteriaMeta.length).fill(0)
    const critCounts = new Array(criteriaMeta.length).fill(0)

    const monthlyMap = new Map<
      string,
      { monthKey: string; label: string; slots: number; evaluated: number; pending: number; scoreSum: number; scored: number }
    >()

    // Per-department aggregation
    const deptAgg = new Map<
      string,
      {
        deptId: string
        deptName: string
        slotCount: number
        regCount: number
        evalCount: number
        pendingCount: number
        scoreSum: number
        scoredCount: number
        goodCount: number
        critSums: number[]
        critCounts: number[]
        teacherIds: Set<string>
      }
    >()

    // Per-teacher aggregation
    const teacherAgg = new Map<
      string,
      {
        teacherId: string
        teacherName: string
        teacherCode: string
        deptId: string
        deptName: string
        campusName: string
        taughtSlots: number
        taughtEvalCount: number
        observedEvalCount: number
        scoreSum: number
        scoredCount: number
        goodCount: number
        critSums: number[]
        critCounts: number[]
        recentFeedback: Array<{
          date: string
          topic: string
          subjectName: string
          evaluatorName: string
          totalScore: number | null
          overallRating: string | null
          strengths: string | null
          improvements: string | null
        }>
      }
    >()

    const ensureTeacher = (tObj: any, fallbackId: string, fallbackDeptName: string, fallbackDeptId: string, fallbackCampus: string) => {
      let rec = teacherAgg.get(fallbackId)
      if (!rec) {
        rec = {
          teacherId: fallbackId,
          teacherName: tObj?.teacherName || "Giáo viên",
          teacherCode: tObj?.teacherCode || "",
          deptId: fallbackDeptId,
          deptName: fallbackDeptName,
          campusName: fallbackCampus,
          taughtSlots: 0,
          taughtEvalCount: 0,
          observedEvalCount: 0,
          scoreSum: 0,
          scoredCount: 0,
          goodCount: 0,
          critSums: new Array(criteriaMeta.length).fill(0),
          critCounts: new Array(criteriaMeta.length).fill(0),
          recentFeedback: [],
        }
        teacherAgg.set(fallbackId, rec)
      }
      return rec
    }

    filteredSlots.forEach((slot) => {
      // Origin counts
      if (isSurpriseSlot(slot)) origins.SURPRISE++
      else if (slot.requestOrigin === "ASSIGNED") origins.ASSIGNED++
      else if (slot.requestOrigin === "OBSERVER_REQUEST") origins.REQUEST++
      else origins.PLAN++

      // Month key
      let monthKey = "unknown"
      let monthLabel = "Khác"
      if (slot.date) {
        const d = new Date(slot.date)
        if (!Number.isNaN(d.getTime())) {
          monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
          monthLabel = `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`
        }
      }
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { monthKey, label: monthLabel, slots: 0, evaluated: 0, pending: 0, scoreSum: 0, scored: 0 })
      }
      const mRec = monthlyMap.get(monthKey)!
      mRec.slots++

      // Department resolution
      const hostDeptId =
        slot.teacher?.departmentId ||
        slot.targetDeptId ||
        slot.teacher?.departmentAssignments?.[0]?.departmentId ||
        "UNASSIGNED"
      const deptObj = deptMap.get(hostDeptId)
      const hostDeptName =
        slot.teacher?.departmentRel?.name ||
        deptObj?.name ||
        "Chưa phân tổ"
      const hostCampusName =
        slot.campusName ||
        slot.teacher?.campus?.campusName ||
        campusMap.get(slot.campusId || slot.teacher?.campusId)?.campusName ||
        "—"

      if (!deptAgg.has(hostDeptId)) {
        deptAgg.set(hostDeptId, {
          deptId: hostDeptId,
          deptName: hostDeptName,
          slotCount: 0,
          regCount: 0,
          evalCount: 0,
          pendingCount: 0,
          scoreSum: 0,
          scoredCount: 0,
          goodCount: 0,
          critSums: new Array(criteriaMeta.length).fill(0),
          critCounts: new Array(criteriaMeta.length).fill(0),
          teacherIds: new Set<string>(),
        })
      }
      const dRec = deptAgg.get(hostDeptId)!
      dRec.slotCount++
      if (slot.teacherId) dRec.teacherIds.add(slot.teacherId)

      const hostTeacherRec = slot.teacherId
        ? ensureTeacher(slot.teacher, slot.teacherId, hostDeptName, hostDeptId, hostCampusName)
        : null
      if (hostTeacherRec) hostTeacherRec.taughtSlots++

      const regs = Array.isArray(slot.registrations) ? slot.registrations : []
      totalRegistrations += regs.length
      dRec.regCount += regs.length

      regs.forEach((reg: any) => {
        const ev = reg?.evaluation
        const isEvaluated = Boolean(
          ev && (ev.totalScore != null || extractEvaluationCriteriaScores(ev, isPreschool) !== null)
        )

        if (isEvaluated) {
          evaluatedCount++
          mRec.evaluated++
          dRec.evalCount++
          if (hostTeacherRec) hostTeacherRec.taughtEvalCount++

          // Observer count
          if (reg.teacherId) {
            const obsDeptId = reg.teacher?.departmentId || "UNASSIGNED"
            const obsDeptName = deptMap.get(obsDeptId)?.name || "Chưa phân tổ"
            const obsCampus = reg.teacher?.campus?.campusName || "—"
            const obsRec = ensureTeacher(reg.teacher, reg.teacherId, obsDeptName, obsDeptId, obsCampus)
            obsRec.observedEvalCount++
          }

          const score = Number(ev.totalScore || 0)
          if (score > 0) {
            totalScoreSum += score
            scoredCount++
            mRec.scoreSum += score
            mRec.scored++
            dRec.scoreSum += score
            dRec.scoredCount++
            if (hostTeacherRec) {
              hostTeacherRec.scoreSum += score
              hostTeacherRec.scoredCount++
            }
          }

          const rClass = classifyRating(ev.overallRating)
          ratings[rClass]++
          if (rClass === "GOOD") {
            dRec.goodCount++
            if (hostTeacherRec) hostTeacherRec.goodCount++
          }

          const cScores = extractEvaluationCriteriaScores(ev, isPreschool)
          if (cScores) {
            cScores.forEach((val, idx) => {
              critSums[idx] += val
              critCounts[idx]++
              dRec.critSums[idx] += val
              dRec.critCounts[idx]++
              if (hostTeacherRec) {
                hostTeacherRec.critSums[idx] += val
                hostTeacherRec.critCounts[idx]++
              }
            })
          }

          if (hostTeacherRec) {
            hostTeacherRec.recentFeedback.push({
              date: slot.date ? new Date(slot.date).toLocaleDateString("vi-VN") : "—",
              topic: slot.topic || "Tiết dự giờ",
              subjectName: slot.subjectName || "",
              evaluatorName: reg.teacher?.teacherName || "Người dự",
              totalScore: ev.totalScore != null ? Number(ev.totalScore) : null,
              overallRating: ev.overallRating || null,
              strengths: ev.strengths || null,
              improvements: ev.improvements || null,
            })
          }
        } else {
          pendingCount++
          mRec.pending++
          dRec.pendingCount++
        }
      })
    })

    // Build criteria & standards summaries
    const criteriaStats = criteriaMeta.map((c, idx) => {
      const cnt = critCounts[idx]
      const avg = cnt > 0 ? critSums[idx] / cnt : 0
      const pct = cnt > 0 ? Math.min(100, Math.round((avg / c.max) * 1000) / 10) : 0
      return {
        ...c,
        count: cnt,
        avg: Number(avg.toFixed(2)),
        pct,
      }
    })

    const standardStats = standardsMeta.map((st) => {
      const members = criteriaStats.filter((c) => c.standardIdx === st.idx && c.count > 0)
      const avgSum = members.reduce((acc, m) => acc + m.avg, 0)
      const maxSum = members.reduce((acc, m) => acc + m.max, 0)
      const pct = maxSum > 0 ? Math.min(100, Math.round((avgSum / maxSum) * 1000) / 10) : 0
      return {
        ...st,
        avg: Number(avgSum.toFixed(2)),
        pct,
      }
    })

    const activeCriteria = criteriaStats.filter((c) => c.count > 0)
    const sortedByPct = [...activeCriteria].sort((a, b) => b.pct - a.pct)
    const topCriterion = sortedByPct[0] || null
    const bottomCriterion = sortedByPct[sortedByPct.length - 1] || null

    // Monthly trend sorted chronologically
    const monthlyTrend = Array.from(monthlyMap.values())
      .filter((m) => m.monthKey !== "unknown")
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((m) => ({
        monthKey: m.monthKey,
        label: m.label,
        evaluated: m.evaluated,
        pending: m.pending,
        avgScore: m.scored > 0 ? Number((m.scoreSum / m.scored).toFixed(2)) : null,
      }))

    // Department rows
    const deptRows = Array.from(deptAgg.values())
      .map((d) => {
        const cPcts = criteriaMeta.map((c, idx) => {
          const cnt = d.critCounts[idx]
          if (cnt === 0) return null
          return Math.min(100, Math.round((d.critSums[idx] / cnt / c.max) * 1000) / 10)
        })
        const sPcts = standardsMeta.map((st) => {
          let sumAvg = 0
          let sumMax = 0
          criteriaMeta.forEach((c, idx) => {
            if (c.standardIdx === st.idx && d.critCounts[idx] > 0) {
              sumAvg += d.critSums[idx] / d.critCounts[idx]
              sumMax += c.max
            }
          })
          return sumMax > 0 ? Math.min(100, Math.round((sumAvg / sumMax) * 1000) / 10) : null
        })

        const validCrit = criteriaMeta
          .map((c, idx) => ({ code: c.code, shortLabel: c.shortLabel, pct: cPcts[idx] }))
          .filter((x) => x.pct !== null) as Array<{ code: string; shortLabel: string; pct: number }>
        validCrit.sort((a, b) => b.pct - a.pct)

        return {
          deptId: d.deptId,
          deptName: d.deptName,
          slotCount: d.slotCount,
          regCount: d.regCount,
          evalCount: d.evalCount,
          pendingCount: d.pendingCount,
          teacherCount: d.teacherIds.size,
          completionRate: d.regCount > 0 ? Math.round((d.evalCount / d.regCount) * 100) : 0,
          avgScore: d.scoredCount > 0 ? Number((d.scoreSum / d.scoredCount).toFixed(2)) : null,
          goodRate: d.evalCount > 0 ? Math.round((d.goodCount / d.evalCount) * 100) : 0,
          standardPcts: sPcts,
          criteriaPcts: cPcts,
          topCriterion: validCrit[0] || null,
          weakCriterion: validCrit.length > 1 ? validCrit[validCrit.length - 1] : null,
        }
      })
      .sort((a, b) => (b.evalCount || 0) - (a.evalCount || 0))

    // Teacher rows
    const teacherRows = Array.from(teacherAgg.values())
      .map((t) => {
        const cPcts = criteriaMeta.map((c, idx) => {
          const cnt = t.critCounts[idx]
          if (cnt === 0) return null
          return Math.min(100, Math.round((t.critSums[idx] / cnt / c.max) * 1000) / 10)
        })
        const cAvgs = criteriaMeta.map((_, idx) => {
          const cnt = t.critCounts[idx]
          return cnt > 0 ? Number((t.critSums[idx] / cnt).toFixed(2)) : null
        })
        const sPcts = standardsMeta.map((st) => {
          let sumAvg = 0
          let sumMax = 0
          criteriaMeta.forEach((c, idx) => {
            if (c.standardIdx === st.idx && t.critCounts[idx] > 0) {
              sumAvg += t.critSums[idx] / t.critCounts[idx]
              sumMax += c.max
            }
          })
          return sumMax > 0 ? Math.min(100, Math.round((sumAvg / sumMax) * 1000) / 10) : null
        })

        const validCrit = criteriaMeta
          .map((c, idx) => ({ code: c.code, shortLabel: c.shortLabel, pct: cPcts[idx] }))
          .filter((x) => x.pct !== null) as Array<{ code: string; shortLabel: string; pct: number }>
        validCrit.sort((a, b) => b.pct - a.pct)

        return {
          ...t,
          avgScore: t.scoredCount > 0 ? Number((t.scoreSum / t.scoredCount).toFixed(2)) : null,
          goodRate: t.taughtEvalCount > 0 ? Math.round((t.goodCount / t.taughtEvalCount) * 100) : 0,
          standardPcts: sPcts,
          criteriaPcts: cPcts,
          criteriaAvgs: cAvgs,
          topCriterion: validCrit[0] || null,
          weakCriterion: validCrit.length > 1 ? validCrit[validCrit.length - 1] : null,
        }
      })

    const avgScore = scoredCount > 0 ? Number((totalScoreSum / scoredCount).toFixed(2)) : null
    const completionRate = totalRegistrations > 0 ? Math.round((evaluatedCount / totalRegistrations) * 100) : 0
    const goodRate = evaluatedCount > 0 ? Math.round((ratings.GOOD / evaluatedCount) * 100) : 0

    return {
      totalSlots: filteredSlots.length,
      totalRegistrations,
      evaluatedCount,
      pendingCount,
      completionRate,
      avgScore,
      goodRate,
      ratings,
      origins,
      criteriaStats,
      standardStats,
      topCriterion,
      bottomCriterion,
      monthlyTrend,
      deptRows,
      teacherRows,
    }
  }, [filteredSlots, criteriaMeta, standardsMeta, isPreschool, deptMap, campusMap])

  // Radar Chart comparison data (Baseline vs Selected Department)
  const selectedDeptCompare = useMemo(
    () => analytics.deptRows.find((d) => d.deptId === selectedDeptCompareId) || null,
    [analytics.deptRows, selectedDeptCompareId]
  )

  const radarData = useMemo(() => {
    if (radarGranularity === "standards") {
      return analytics.standardStats.map((st, idx) => ({
        subject: st.name,
        fullName: st.fullName,
        baseline: st.pct,
        compared: selectedDeptCompare ? selectedDeptCompare.standardPcts[idx] ?? 0 : undefined,
      }))
    }
    return analytics.criteriaStats.map((c, idx) => ({
      subject: c.code,
      fullName: c.fullLabel,
      baseline: c.pct,
      compared: selectedDeptCompare ? selectedDeptCompare.criteriaPcts[idx] ?? 0 : undefined,
    }))
  }, [radarGranularity, analytics.standardStats, analytics.criteriaStats, selectedDeptCompare])

  // Filtered & sorted teachers for the Teacher Competency table
  const displayedTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase()
    const list = analytics.teacherRows.filter((t) => {
      if (t.taughtEvalCount === 0 && t.observedEvalCount === 0 && t.taughtSlots === 0) return false
      if (!q) return true
      return (
        t.teacherName.toLowerCase().includes(q) ||
        t.teacherCode.toLowerCase().includes(q) ||
        t.deptName.toLowerCase().includes(q)
      )
    })

    list.sort((a, b) => {
      let va = -1
      let vb = -1
      if (teacherSortBy === "avgScore") {
        va = a.avgScore ?? -1
        vb = b.avgScore ?? -1
      } else if (teacherSortBy === "taughtEvalCount") {
        va = a.taughtEvalCount
        vb = b.taughtEvalCount
      } else if (teacherSortBy === "tc0") {
        va = a.standardPcts[0] ?? -1
        vb = b.standardPcts[0] ?? -1
      } else if (teacherSortBy === "tc1") {
        va = a.standardPcts[1] ?? -1
        vb = b.standardPcts[1] ?? -1
      } else if (teacherSortBy === "tc2") {
        va = a.standardPcts[2] ?? -1
        vb = b.standardPcts[2] ?? -1
      } else if (teacherSortBy === "tc3") {
        va = a.standardPcts[3] ?? -1
        vb = b.standardPcts[3] ?? -1
      }
      return teacherSortAsc ? va - vb : vb - va
    })
    return list
  }, [analytics.teacherRows, teacherSearch, teacherSortBy, teacherSortAsc])

  // Selected Teacher profile for slide-over drawer
  const selectedTeacherProfile = useMemo(() => {
    if (!selectedTeacherProfileId) return null
    return analytics.teacherRows.find((t) => t.teacherId === selectedTeacherProfileId) || null
  }, [selectedTeacherProfileId, analytics.teacherRows])

  const selectedTeacherDeptRow = useMemo(() => {
    if (!selectedTeacherProfile) return null
    return analytics.deptRows.find((d) => d.deptId === selectedTeacherProfile.deptId) || null
  }, [selectedTeacherProfile, analytics.deptRows])

  const teacherProfileRadarData = useMemo(() => {
    if (!selectedTeacherProfile) return []
    return analytics.standardStats.map((st, idx) => ({
      subject: st.name,
      teacher: selectedTeacherProfile.standardPcts[idx] ?? 0,
      dept: selectedTeacherDeptRow?.standardPcts[idx] ?? 0,
      school: st.pct,
    }))
  }, [selectedTeacherProfile, selectedTeacherDeptRow, analytics.standardStats])

  const handleSortTeacher = (col: typeof teacherSortBy) => {
    if (teacherSortBy === col) {
      setTeacherSortAsc(!teacherSortAsc)
    } else {
      setTeacherSortBy(col)
      setTeacherSortAsc(false)
    }
  }

  const handleExportDashboardExcel = () => {
    try {
      const wb = XLSX.utils.book_new()

      // Sheet 1: Criteria Overview
      const s1Rows = analytics.criteriaStats.map((c) => ({
        "Mã tiêu chí": c.code,
        "Tiêu chuẩn": c.standardName,
        "Nội dung tiêu chí": c.fullLabel,
        "Điểm tối đa": c.max,
        "Điểm trung bình": c.avg,
        "Tỷ lệ đạt (%)": c.pct,
        "Số lượt chấm": c.count,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s1Rows), "TieuChi_NangLuc")

      // Sheet 2: Department Competency
      const s2Rows = analytics.deptRows.map((d, i) => {
        const row: Record<string, any> = {
          STT: i + 1,
          "Tổ chuyên môn": d.deptName,
          "Số tiết mở": d.slotCount,
          "Phiếu đã chấm": d.evalCount,
          "Phiếu chưa nộp": d.pendingCount,
          "Tỷ lệ nộp (%)": d.completionRate,
          "Điểm TB": d.avgScore ?? "—",
          "Tỷ lệ Tốt/Giỏi (%)": d.goodRate,
        }
        standardsMeta.forEach((st, idx) => {
          row[`${st.code}: ${st.name} (%)`] = d.standardPcts[idx] ?? "—"
        })
        row["Điểm mạnh nổi bật"] = d.topCriterion ? `${d.topCriterion.code} (${d.topCriterion.pct}%)` : "—"
        row["Cần bồi dưỡng"] = d.weakCriterion ? `${d.weakCriterion.code} (${d.weakCriterion.pct}%)` : "—"
        return row
      })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s2Rows), "NangLuc_TCM")

      // Sheet 3: Teacher Competency
      const s3Rows = analytics.teacherRows
        .filter((t) => t.taughtEvalCount > 0 || t.observedEvalCount > 0)
        .map((t, i) => {
          const row: Record<string, any> = {
            STT: i + 1,
            "Mã GV": t.teacherCode,
            "Họ và tên": t.teacherName,
            "Tổ chuyên môn": t.deptName,
            "Cơ sở": t.campusName,
            "Tiết dạy (đã chấm)": t.taughtEvalCount,
            "Tiết đi dự": t.observedEvalCount,
            "Điểm TB": t.avgScore ?? "—",
          }
          standardsMeta.forEach((st, idx) => {
            row[`${st.code}: ${st.name} (%)`] = t.standardPcts[idx] ?? "—"
          })
          row["Thế mạnh đặc thù"] = t.topCriterion ? `${t.topCriterion.code} - ${t.topCriterion.shortLabel} (${t.topCriterion.pct}%)` : "—"
          row["Gợi ý bồi dưỡng"] = t.weakCriterion ? `${t.weakCriterion.code} - ${t.weakCriterion.shortLabel} (${t.weakCriterion.pct}%)` : "—"
          return row
        })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s3Rows), "NangLuc_GiaoVien")

      const dateTag = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `BaoCao_NangLuc_DuGio_${dateTag}.xlsx`)
      toast.success("Đã xuất báo cáo năng lực dự giờ ra file Excel.")
    } catch (err) {
      console.error(err)
      toast.error("Không thể xuất file Excel. Vui lòng thử lại.")
    }
  }

  const hasActiveFilter =
    filterCampus !== "all" ||
    filterDept !== "all" ||
    filterMonth !== "all" ||
    filterOrigin !== "ALL" ||
    filterLevel !== "all"

  const resetFilters = () => {
    setFilterCampus("all")
    setFilterDept("all")
    setFilterMonth("all")
    setFilterOrigin("ALL")
    setFilterLevel("all")
    setSelectedDeptCompareId(null)
  }

  const totalRatings =
    analytics.ratings.GOOD +
    analytics.ratings.FAIR +
    analytics.ratings.AVERAGE +
    analytics.ratings.POOR

  return (
    <div className="space-y-5">
      {/* 1. COMPACT GLOBAL FILTER BAR */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3.5 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#003B3A] pr-1">
            <Filter className="w-3.5 h-3.5 text-[#00A19A]" />
            <span>Bộ lọc báo cáo</span>
          </div>

          <select
            value={filterCampus}
            onChange={(e) => setFilterCampus(e.target.value)}
            className="text-xs font-medium rounded-xl border border-slate-200 px-3 py-1.5 bg-slate-50/70 hover:bg-white text-slate-800 outline-none focus:border-[#00A19A] focus:ring-1 focus:ring-[#00A19A] cursor-pointer"
          >
            <option value="all">Tất cả cơ sở</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.campusName}
              </option>
            ))}
          </select>

          <select
            value={filterDept}
            onChange={(e) => {
              setFilterDept(e.target.value)
              setSelectedDeptCompareId(null)
            }}
            className="text-xs font-medium rounded-xl border border-slate-200 px-3 py-1.5 bg-slate-50/70 hover:bg-white text-slate-800 outline-none focus:border-[#00A19A] focus:ring-1 focus:ring-[#00A19A] cursor-pointer max-w-[200px]"
          >
            <option value="all">Tất cả Tổ chuyên môn</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="text-xs font-medium rounded-xl border border-slate-200 px-3 py-1.5 bg-slate-50/70 hover:bg-white text-slate-800 outline-none focus:border-[#00A19A] focus:ring-1 focus:ring-[#00A19A] cursor-pointer"
          >
            <option value="all">Toàn năm học {academicYearName ? `(${academicYearName})` : ""}</option>
            {availableMonths.map((m) => {
              const [y, mon] = m.split("-")
              return (
                <option key={m} value={m}>
                  Tháng {mon}/{y}
                </option>
              )
            })}
          </select>

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="text-xs font-medium rounded-xl border border-slate-200 px-3 py-1.5 bg-slate-50/70 hover:bg-white text-slate-800 outline-none focus:border-[#00A19A] focus:ring-1 focus:ring-[#00A19A] cursor-pointer"
          >
            <option value="all">Tất cả bậc học</option>
            <option value="Tiểu học">Tiểu học</option>
            <option value="THCS">THCS</option>
            <option value="THPT">THPT</option>
            <option value="Mầm non">Mầm non</option>
          </select>

          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 text-xs">
            {(
              [
                { key: "ALL", label: "Tất cả" },
                { key: "PLAN", label: "Kế hoạch" },
                { key: "ASSIGNED", label: "Chỉ định" },
                { key: "SURPRISE", label: "Đột xuất" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFilterOrigin(opt.key)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filterOrigin === opt.key
                    ? "bg-white text-[#003B3A] shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline px-1.5 cursor-pointer"
            >
              Đặt lại
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportDashboardExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#003B3A] bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#059669]" />
            <span>Xuất báo cáo Excel</span>
          </button>
        </div>
      </div>

      {/* 2. UNIFIED ACADEMIC LEDGER KPI STRIP (4 HEADLINE METRICS) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] tabular-nums">
          {/* Metric 1: Tiến độ hoàn thành */}
          <div className="p-4 sm:p-5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Tiến độ hoàn thành đánh giá</span>
              <CheckCircle2 className="w-4 h-4 text-[#00A19A]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-[#003B3A]">
                {analytics.completionRate}%
              </span>
              <span className="text-xs font-medium text-slate-500">
                ({analytics.evaluatedCount.toLocaleString("vi-VN")} / {analytics.totalRegistrations.toLocaleString("vi-VN")} lượt)
              </span>
            </div>
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00A19A] rounded-full transition-all"
                  style={{ width: `${analytics.completionRate}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Tổng {analytics.totalSlots.toLocaleString("vi-VN")} tiết dạy mở · {scopeLabel}
              </p>
            </div>
          </div>

          {/* Metric 2: Điểm trung bình & Tốt/Giỏi */}
          <div className="p-4 sm:p-5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Điểm đánh giá trung bình</span>
              <Award className="w-4 h-4 text-[#059669]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-[#003B3A]">
                {analytics.avgScore !== null ? analytics.avgScore.toFixed(2) : "—"}
              </span>
              <span className="text-xs font-medium text-slate-400">/ {maxScale.toFixed(2)}đ</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[#059669]">
                {analytics.goodRate}% xếp loại Tốt / Giỏi
              </span>
              <span className="text-slate-500">
                {analytics.ratings.GOOD.toLocaleString("vi-VN")} phiếu
              </span>
            </div>
          </div>

          {/* Metric 3: Tiêu chí nổi bật & Cần bồi dưỡng */}
          <div className="p-4 sm:p-5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Tín hiệu năng lực tiêu chí</span>
              <Target className="w-4 h-4 text-[#00736E]" />
            </div>
            {analytics.topCriterion ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 truncate" title={analytics.topCriterion.fullLabel}>
                    Mạnh: <strong className="text-[#059669]">{analytics.topCriterion.code}</strong> {analytics.topCriterion.shortLabel}
                  </span>
                  <span className="font-bold text-[#059669] shrink-0">{analytics.topCriterion.pct}%</span>
                </div>
                {analytics.bottomCriterion && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600 truncate" title={analytics.bottomCriterion.fullLabel}>
                      Cần chú ý: <strong className="text-[#D97706]">{analytics.bottomCriterion.code}</strong> {analytics.bottomCriterion.shortLabel}
                    </span>
                    <span className="font-bold text-[#D97706] shrink-0">{analytics.bottomCriterion.pct}%</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Chưa có dữ liệu điểm theo tiêu chí</p>
            )}
            <p className="text-[11px] text-slate-500">
              Tính trên {criteriaMeta.length} tiêu chí đánh giá chuyên môn
            </p>
          </div>

          {/* Metric 4: Phiếu chưa nộp */}
          <div className="p-4 sm:p-5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Phiếu dự giờ chưa nộp</span>
              <Clock className={`w-4 h-4 ${analytics.pendingCount > 0 ? "text-[#E11D48]" : "text-[#059669]"}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-3xl font-bold ${
                  analytics.pendingCount > 0 ? "text-[#E11D48]" : "text-[#059669]"
                }`}
              >
                {analytics.pendingCount.toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-medium text-slate-400">phiếu</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className={analytics.pendingCount > 0 ? "text-rose-700 font-medium" : "text-emerald-700 font-medium"}>
                {analytics.pendingCount > 0 ? "Cần đôn đốc GV hoàn thiện phiếu" : "Đã hoàn tất toàn bộ phiếu"}
              </span>
              {onNavigateToSlots && analytics.pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigateToSlots({ deptId: filterDept !== "all" ? filterDept : undefined })}
                  className="text-[#00736E] hover:underline font-semibold inline-flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  Xem ds
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. PROGRESS TREND & QUALITY DISTRIBUTION (2-COLUMN ROW) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Monthly Trend ComposedChart */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#003B3A]">
                Tiến độ dự giờ & Diễn biến điểm chất lượng theo tháng
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Số lượt đã hoàn thành đánh giá, chưa nộp phiếu (cột) và điểm trung bình (đường)
              </p>
            </div>
          </div>

          <div className="h-[260px] w-full tabular-nums">
            {analytics.monthlyTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                Chưa có dữ liệu dự giờ theo tháng trong phạm vi lọc
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analytics.monthlyTrend} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#CBD5E1" }} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, maxScale]}
                    tick={{ fontSize: 11, fill: "#003B3A" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E2E8F0",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 4px 16px rgba(0, 59, 58, 0.08)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar yAxisId="left" dataKey="evaluated" name="Đã đánh giá" stackId="a" fill="#00A19A" radius={[0, 0, 0, 0]} maxBarSize={32} />
                  <Bar yAxisId="left" dataKey="pending" name="Chưa nộp phiếu" stackId="a" fill="#FCA5A5" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgScore"
                    name={`Điểm TB (/${maxScale})`}
                    stroke="#003B3A"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: "#003B3A", strokeWidth: 2, stroke: "#FFFFFF" }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Rating & Origin Breakdown */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between gap-4 tabular-nums">
          <div>
            <h3 className="text-sm font-bold text-[#003B3A]">Cơ cấu xếp loại & Hình thức dự giờ</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân bố chất lượng trên {totalRatings.toLocaleString("vi-VN")} phiếu đã đánh giá
            </p>
          </div>

          <div className="space-y-3">
            {[
              { label: "Tốt / Giỏi", count: analytics.ratings.GOOD, color: "bg-[#059669]", text: "text-[#059669]" },
              { label: "Khá", count: analytics.ratings.FAIR, color: "bg-[#00A19A]", text: "text-[#00736E]" },
              { label: "Trung bình / Đạt", count: analytics.ratings.AVERAGE, color: "bg-[#D97706]", text: "text-[#D97706]" },
              { label: "Chưa đạt / Không XL", count: analytics.ratings.POOR, color: "bg-[#E11D48]", text: "text-[#E11D48]" },
            ].map((item) => {
              const pct = totalRatings > 0 ? Math.round((item.count / totalRatings) * 1000) / 10 : 0
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="font-semibold text-slate-800">
                      <span className={item.text}>{item.count.toLocaleString("vi-VN")}</span>{" "}
                      <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Kế hoạch", val: analytics.origins.PLAN },
              { label: "Chỉ định", val: analytics.origins.ASSIGNED },
              { label: "Đột xuất", val: analytics.origins.SURPRISE },
              { label: "Xin dự giờ", val: analytics.origins.REQUEST },
            ].map((o) => (
              <div key={o.label} className="bg-slate-50 rounded-xl px-2.5 py-2 border border-slate-200/70">
                <div className="text-[11px] text-slate-500">{o.label}</div>
                <div className="text-sm font-bold text-[#003B3A] mt-0.5">{o.val.toLocaleString("vi-VN")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. TEACHING COMPETENCY PROFILE (RADAR + 11 CRITERIA BAR CHART) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Radar Chart (4 Standards or 11 Criteria) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#003B3A]">
                Bản đồ năng lực theo tiêu chuẩn dự giờ
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tỷ lệ % đạt điểm tối đa {selectedDeptCompare ? `· Đối chiếu ${selectedDeptCompare.deptName}` : "· Chọn một Tổ CM bên dưới để đối chiếu"}
              </p>
            </div>
            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
              <button
                type="button"
                onClick={() => setRadarGranularity("standards")}
                className={`px-2 py-1 rounded-md font-medium cursor-pointer ${
                  radarGranularity === "standards" ? "bg-white text-[#003B3A] shadow-2xs font-semibold" : "text-slate-600"
                }`}
              >
                {standardsMeta.length} Tiêu chuẩn
              </button>
              <button
                type="button"
                onClick={() => setRadarGranularity("criteria")}
                className={`px-2 py-1 rounded-md font-medium cursor-pointer ${
                  radarGranularity === "criteria" ? "bg-white text-[#003B3A] shadow-2xs font-semibold" : "text-slate-600"
                }`}
              >
                {criteriaMeta.length} Tiêu chí
              </button>
            </div>
          </div>

          {selectedDeptCompare && (
            <div className="flex items-center justify-between bg-teal-50/70 border border-teal-200 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-[#003B3A] font-medium">
                Đang đối chiếu: <strong>{selectedDeptCompare.deptName}</strong> vs Trung bình chung
              </span>
              <button
                type="button"
                onClick={() => setSelectedDeptCompareId(null)}
                className="text-slate-500 hover:text-rose-600 p-0.5 cursor-pointer"
                title="Bỏ đối chiếu"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="h-[290px] w-full tabular-nums">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="74%" data={radarData}>
                <PolarGrid stroke="#CBD5E1" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} tickCount={5} />
                <Radar
                  name="Trung bình chung (%)"
                  dataKey="baseline"
                  stroke="#003B3A"
                  fill="#003B3A"
                  fillOpacity={selectedDeptCompare ? 0.1 : 0.22}
                  strokeWidth={2}
                  strokeDasharray={selectedDeptCompare ? "4 3" : undefined}
                />
                {selectedDeptCompare && (
                  <Radar
                    name={`${selectedDeptCompare.deptName} (%)`}
                    dataKey="compared"
                    stroke="#00A19A"
                    fill="#00A19A"
                    fillOpacity={0.28}
                    strokeWidth={2.5}
                  />
                )}
                <Tooltip
                  formatter={(value: any) => [`${value}%`, ""]}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E2E8F0",
                    borderRadius: "10px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* 4 Standards Quick Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 tabular-nums">
            {analytics.standardStats.map((st) => (
              <div key={st.code} className="bg-slate-50 rounded-xl px-2.5 py-2 border border-slate-200/70">
                <div className="text-[11px] font-medium text-slate-500 truncate" title={st.fullName}>
                  {st.name}
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-sm font-bold text-[#003B3A]">{st.pct}%</span>
                  <span className="text-[10px] text-slate-400">
                    {st.avg}/{st.max}đ
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Detailed Criteria Horizontal Bar Chart */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#003B3A]">
                Mức độ đạt chuẩn theo từng tiêu chí dự giờ ({criteriaMeta.length} tiêu chí)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Phân loại tự động: Xanh lá ≥90% (Thế mạnh) · Xanh ngọc 80–89% (Đạt tốt) · Vàng/Đỏ &lt;80% (Cần bồi dưỡng)
              </p>
            </div>
          </div>

          <div className="h-[340px] w-full tabular-nums">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.criteriaStats.map((c) => ({
                  name: `${c.code} · ${c.shortLabel}`,
                  fullLabel: c.fullLabel,
                  pct: c.pct,
                  avg: c.avg,
                  max: c.max,
                }))}
                layout="vertical"
                margin={{ top: 4, right: 28, left: 10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748B" }} unit="%" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={158}
                  tick={{ fontSize: 11, fill: "#334155", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: any, _name: any, item: any) => [
                    `${value}% (${item.payload.avg}/${item.payload.max}đ)`,
                    item.payload.fullLabel,
                  ]}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E2E8F0",
                    borderRadius: "10px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="pct" radius={[0, 6, 6, 0]} maxBarSize={20}>
                  {analytics.criteriaStats.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={getBarColor(entry.pct)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. INTERACTIVE COMPETENCY MATRIX: DEPARTMENTS VS TEACHERS */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#003B3A]">
              Ma trận năng lực đặc thù Tổ chuyên môn & Giáo viên
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {matrixMode === "departments"
                ? "Nhấn vào một Tổ chuyên môn để đối chiếu biểu đồ Radar phía trên hoặc lọc giáo viên trong tổ"
                : "Nhấn vào một Giáo viên để xem Hồ sơ năng lực chi tiết, đối chiếu với Tổ chuyên môn & góp ý gần nhất"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setMatrixMode("departments")}
                className={`px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  matrixMode === "departments"
                    ? "bg-[#003B3A] text-white shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tổ chuyên môn ({analytics.deptRows.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMatrixMode("teachers")}
                className={`px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  matrixMode === "teachers"
                    ? "bg-[#003B3A] text-white shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Năng lực Giáo viên ({displayedTeachers.length})</span>
              </button>
            </div>

            {matrixMode === "teachers" && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Tìm tên, mã GV hoặc Tổ..."
                  className="pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white outline-none focus:border-[#00A19A] w-52"
                />
                {teacherSearch && (
                  <button
                    type="button"
                    onClick={() => setTeacherSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* VIEW A: DEPARTMENT COMPETENCY MATRIX TABLE */}
        {matrixMode === "departments" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-3 px-4 text-white">Tổ chuyên môn</th>
                  <th className="py-3 px-3 text-center text-teal-100">Tiết / Phiếu</th>
                  <th className="py-3 px-3 text-center text-teal-100">Tỷ lệ nộp</th>
                  {standardsMeta.map((st) => (
                    <th key={st.code} className="py-3 px-3 text-center text-teal-100" title={st.fullName}>
                      {st.code}: {st.name}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center text-[#5EEAD4]">Điểm TB</th>
                  <th className="py-3 px-3 text-teal-100">Thế mạnh nổi bật</th>
                  <th className="py-3 px-3 text-teal-100">Cần bồi dưỡng</th>
                  <th className="py-3 px-4 text-right text-white">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {analytics.deptRows.length === 0 ? (
                  <tr>
                    <td colSpan={standardsMeta.length + 7} className="py-10 text-center text-slate-400">
                      Chưa có dữ liệu Tổ chuyên môn trong bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  analytics.deptRows.map((d) => {
                    const isSelected = selectedDeptCompareId === d.deptId
                    return (
                      <tr
                        key={d.deptId}
                        onClick={() => setSelectedDeptCompareId(isSelected ? null : d.deptId)}
                        className={`transition-colors align-middle cursor-pointer ${
                          isSelected ? "bg-[#F0FDFA]/80 hover:bg-[#F0FDFA]" : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#003B3A]">{d.deptName}</div>
                          <div className="text-[11px] text-slate-500">{d.teacherCount} GV có tiết dạy</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="font-semibold text-slate-800">{d.evalCount} / {d.regCount}</div>
                          <div className="text-[11px] text-slate-400">{d.slotCount} tiết mở</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getHeatBadgeClass(
                              d.regCount > 0 ? d.completionRate : null
                            )}`}
                          >
                            {d.completionRate}%
                          </span>
                        </td>
                        {d.standardPcts.map((pct, idx) => (
                          <td key={idx} className="py-3 px-2.5 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getHeatBadgeClass(pct)}`}
                            >
                              {pct !== null ? `${pct}%` : "—"}
                            </span>
                          </td>
                        ))}
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-[#003B3A]">
                            {d.avgScore !== null ? d.avgScore.toFixed(2) : "—"}
                          </span>
                          {d.evalCount > 0 && (
                            <div className="text-[10px] text-emerald-700">{d.goodRate}% Tốt/Giỏi</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {d.topCriterion ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <TrendingUp className="w-3 h-3 shrink-0" />
                              <span>{d.topCriterion.code}: {d.topCriterion.shortLabel} ({d.topCriterion.pct}%)</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {d.weakCriterion ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              <TrendingDown className="w-3 h-3 shrink-0" />
                              <span>{d.weakCriterion.code}: {d.weakCriterion.shortLabel} ({d.weakCriterion.pct}%)</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setFilterDept(d.deptId)
                              setMatrixMode("teachers")
                            }}
                            className="text-xs font-semibold text-[#00736E] hover:text-[#003B3A] hover:underline cursor-pointer"
                          >
                            Xem GV
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* VIEW B: TEACHER COMPETENCY PROFILE TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-3 px-4 text-white">Giáo viên & Tổ chuyên môn</th>
                  <th
                    className="py-3 px-3 text-center text-teal-100 cursor-pointer hover:text-white"
                    onClick={() => handleSortTeacher("taughtEvalCount")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Tiết dạy (ĐG)
                      <ArrowUpDown className="w-3 h-3 opacity-70" />
                    </span>
                  </th>
                  <th className="py-3 px-3 text-center text-teal-100">Tiết đi dự</th>
                  {standardsMeta.map((st, idx) => (
                    <th
                      key={st.code}
                      className="py-3 px-3 text-center text-teal-100 cursor-pointer hover:text-white"
                      onClick={() => idx < 4 && handleSortTeacher(`tc${idx}` as any)}
                      title={st.fullName}
                    >
                      {st.code}: {st.name}
                    </th>
                  ))}
                  <th
                    className="py-3 px-3 text-center text-[#5EEAD4] cursor-pointer hover:text-white"
                    onClick={() => handleSortTeacher("avgScore")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Điểm TB
                      <ArrowUpDown className="w-3 h-3 opacity-80" />
                    </span>
                  </th>
                  <th className="py-3 px-3 text-teal-100">Thế mạnh đặc thù</th>
                  <th className="py-3 px-3 text-teal-100">Gợi ý bồi dưỡng</th>
                  <th className="py-3 px-4 text-right text-white">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {displayedTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={standardsMeta.length + 7} className="py-10 text-center text-slate-400">
                      Không tìm thấy giáo viên phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  displayedTeachers.slice(0, 100).map((t) => (
                    <tr
                      key={t.teacherId}
                      onClick={() => setSelectedTeacherProfileId(t.teacherId)}
                      className="transition-colors align-middle hover:bg-[#F8FAFC] cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#003B3A]">{t.teacherName}</div>
                        <div className="text-[11px] text-slate-500">
                          {t.teacherCode ? `${t.teacherCode} · ` : ""}
                          {t.deptName} · {t.campusName}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-800">
                        {t.taughtEvalCount}
                        <span className="text-slate-400 font-normal"> / {t.taughtSlots}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {t.observedEvalCount}
                      </td>
                      {t.standardPcts.map((pct, idx) => (
                        <td key={idx} className="py-3 px-2.5 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getHeatBadgeClass(pct)}`}
                          >
                            {pct !== null ? `${pct}%` : "—"}
                          </span>
                        </td>
                      ))}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-[#003B3A]">
                          {t.avgScore !== null ? t.avgScore.toFixed(2) : "—"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {t.topCriterion ? (
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block">
                            {t.topCriterion.code}: {t.topCriterion.shortLabel} ({t.topCriterion.pct}%)
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {t.weakCriterion ? (
                          <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                            {t.weakCriterion.code}: {t.weakCriterion.shortLabel} ({t.weakCriterion.pct}%)
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTeacherProfileId(t.teacherId)
                          }}
                          className="text-xs font-semibold text-[#00736E] hover:text-[#003B3A] hover:underline cursor-pointer"
                        >
                          Hồ sơ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {displayedTeachers.length > 100 && (
              <div className="px-4 py-2.5 text-[11px] text-slate-500 bg-slate-50 border-t border-slate-200">
                Đang hiển thị 100 / {displayedTeachers.length} giáo viên. Vui lòng dùng ô tìm kiếm hoặc lọc theo Tổ chuyên môn để xem cụ thể hơn.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. TEACHER COMPETENCY PROFILE SLIDE-OVER DRAWER */}
      {selectedTeacherProfile && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[2px] flex justify-end"
          onClick={() => setSelectedTeacherProfileId(null)}
        >
          <div
            className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 bg-[#003B3A] text-white flex items-start justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-base font-bold">{selectedTeacherProfile.teacherName}</h3>
                <p className="text-xs text-teal-100 mt-0.5">
                  {selectedTeacherProfile.teacherCode ? `${selectedTeacherProfile.teacherCode} · ` : ""}
                  {selectedTeacherProfile.deptName} · {selectedTeacherProfile.campusName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeacherProfileId(null)}
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 tabular-nums">
              {/* Quick Stats Strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Điểm TB tiết dạy</div>
                  <div className="text-xl font-bold text-[#003B3A] mt-0.5">
                    {selectedTeacherProfile.avgScore !== null ? selectedTeacherProfile.avgScore.toFixed(2) : "—"}
                    <span className="text-xs font-normal text-slate-400"> / {maxScale}đ</span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Tiết dạy đã đánh giá</div>
                  <div className="text-xl font-bold text-[#00736E] mt-0.5">
                    {selectedTeacherProfile.taughtEvalCount}
                    <span className="text-xs font-normal text-slate-400"> ({selectedTeacherProfile.goodRate}% Tốt)</span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Số tiết đã đi dự</div>
                  <div className="text-xl font-bold text-slate-800 mt-0.5">
                    {selectedTeacherProfile.observedEvalCount}
                  </div>
                </div>
              </div>

              {/* Radar Comparison: Teacher vs Dept vs School */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="text-xs font-bold text-[#003B3A]">
                  Đối chiếu năng lực: Giáo viên vs Tổ chuyên môn vs Toàn trường (%)
                </h4>
                <div className="h-[240px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="72%" data={teacherProfileRadarData}>
                      <PolarGrid stroke="#CBD5E1" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} />
                      <Radar name="Giáo viên" dataKey="teacher" stroke="#00A19A" fill="#00A19A" fillOpacity={0.3} strokeWidth={2.5} />
                      <Radar name="Tổ CM" dataKey="dept" stroke="#D97706" fill="none" strokeWidth={1.8} strokeDasharray="4 3" />
                      <Radar name="Toàn trường" dataKey="school" stroke="#003B3A" fill="none" strokeWidth={1.5} strokeDasharray="2 2" />
                      <Tooltip formatter={(v: any) => [`${v}%`, ""]} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 11 Criteria Detail Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
                <h4 className="text-xs font-bold text-[#003B3A]">
                  Chi tiết điểm theo {criteriaMeta.length} tiêu chí dự giờ
                </h4>
                <div className="space-y-2">
                  {criteriaMeta.map((c, idx) => {
                    const pct = selectedTeacherProfile.criteriaPcts[idx]
                    const avg = selectedTeacherProfile.criteriaAvgs[idx]
                    const deptPct = selectedTeacherDeptRow?.criteriaPcts[idx] ?? null
                    const diff = pct !== null && deptPct !== null ? Math.round((pct - deptPct) * 10) / 10 : null
                    return (
                      <div key={c.code} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-700 truncate" title={c.fullLabel}>
                            <strong className="text-[#003B3A]">{c.code}</strong> · {c.shortLabel}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {diff !== null && (
                              <span
                                className={`text-[10px] font-semibold ${
                                  diff >= 0 ? "text-emerald-700" : "text-rose-600"
                                }`}
                              >
                                {diff >= 0 ? `+${diff}%` : `${diff}%`} vs Tổ
                              </span>
                            )}
                            <span className="font-semibold text-slate-800">
                              {avg !== null ? `${avg}/${c.max}đ` : "—"} ({pct !== null ? `${pct}%` : "—"})
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct ?? 0}%`,
                              backgroundColor: pct !== null ? getBarColor(pct) : "#CBD5E1",
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recent Qualitative Feedback */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-[#003B3A]">
                  Nhận xét chuyên môn gần đây ({selectedTeacherProfile.recentFeedback.length} phiếu)
                </h4>
                {selectedTeacherProfile.recentFeedback.length === 0 ? (
                  <p className="text-xs text-slate-400">Chưa có phiếu nhận xét chi tiết.</p>
                ) : (
                  selectedTeacherProfile.recentFeedback.slice(0, 5).map((fb, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#003B3A] truncate">{fb.topic}</span>
                        <span className="font-bold text-[#00736E] shrink-0">
                          {fb.totalScore != null ? `${fb.totalScore}đ` : "—"} {fb.overallRating ? `· ${fb.overallRating}` : ""}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {fb.date} · {fb.subjectName} · Người dự: {fb.evaluatorName}
                      </div>
                      {fb.strengths && (
                        <p className="text-slate-700">
                          <strong className="text-emerald-700">Điểm mạnh:</strong> {fb.strengths}
                        </p>
                      )}
                      {fb.improvements && (
                        <p className="text-slate-700">
                          <strong className="text-amber-700">Góp ý:</strong> {fb.improvements}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
