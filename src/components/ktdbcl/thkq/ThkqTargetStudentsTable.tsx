// @ts-nocheck
"use client"

import React, { useState } from "react"
import {
  Users,
  AlertTriangle,
  AlertCircle,
  HeartHandshake,
  Brain,
  Sparkles,
  Search,
  ExternalLink,
} from "lucide-react"

interface Props {
  students?: any[]
  targetStudents?: any[]
  totalCount: number
  countsByGroup?: {
    allFocus?: number
    belowSkyline: number
    belowMoet: number
    commitment: number
    psychological: number
    perfect10: number
    score8To10?: number
    totalAll?: number
  }
  countsByTargetGroup?: {
    allFocus?: number
    belowSkyline: number
    belowMoet: number
    commitment: number
    psychological: number
    perfect10: number
    score8To10?: number
    totalAll?: number
  }
  selectedTargetType: string
  setSelectedTargetType?: (t: string) => void
  onSelectTargetType?: (t: string) => void
}

export function ThkqTargetStudentsTable({
  students,
  targetStudents,
  totalCount = 0,
  countsByGroup,
  countsByTargetGroup,
  selectedTargetType = "ALL",
  setSelectedTargetType,
  onSelectTargetType,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("")

  const studentList = students || targetStudents || []
  const groupCounts = countsByGroup ||
    countsByTargetGroup || {
      belowSkyline: 0,
      belowMoet: 0,
      commitment: 0,
      psychological: 0,
      perfect10: 0,
    }
  const handleSelect = setSelectedTargetType || onSelectTargetType || (() => {})

  const filteredStudents = studentList.filter((s) => {
    if (!searchTerm.trim()) return true
    const kw = searchTerm.toLowerCase().trim()
    return (
      String(s.studentName || "").toLowerCase().includes(kw) ||
      String(s.studentCode || "").toLowerCase().includes(kw) ||
      String(s.className || "").toLowerCase().includes(kw) ||
      String(s.subjectName || "").toLowerCase().includes(kw) ||
      String(s.campusName || "").toLowerCase().includes(kw)
    )
  })

  const tabs = [
    {
      id: "ALL",
      label: "Tất cả diện theo dõi",
      count: groupCounts.allFocus !== undefined ? groupCounts.allFocus : totalCount,
      icon: Users,
      color: "text-slate-700",
    },
    {
      id: "BELOW_MOET",
      label: "Dưới chuẩn Bộ (< 5.0)",
      count: groupCounts.belowMoet ?? 0,
      icon: AlertTriangle,
      color: "text-[#E11D48]",
    },
    {
      id: "BELOW_SKYLINE",
      label: "Dưới chuẩn Sky-Line",
      count: groupCounts.belowSkyline ?? 0,
      icon: AlertCircle,
      color: "text-[#D97706]",
    },
    {
      id: "COMMITMENT",
      label: "Cam kết đầu vào",
      count: groupCounts.commitment ?? 0,
      icon: HeartHandshake,
      color: "text-[#00736E]",
    },
    {
      id: "PSYCHOLOGICAL",
      label: "Theo dõi tâm lý",
      count: groupCounts.psychological ?? 0,
      icon: Brain,
      color: "text-[#003B3A]",
    },
    {
      id: "PERFECT_10",
      label: "Điểm 10 tuyệt đối",
      count: groupCounts.perfect10 ?? 0,
      icon: Sparkles,
      color: "text-[#059669]",
    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
        <div className="border-l-4 border-[#003B3A] pl-3">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Danh sách học sinh theo ngưỡng điểm &amp; diện hỗ trợ học tập
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi học sinh dưới chuẩn Bộ GD&amp;ĐT (&lt; 5.0), dưới chuẩn Sky-Line, diện cam kết đầu vào và đạt điểm 10 tuyệt đối.
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên HS, mã số, lớp, môn học..."
            className="w-full text-xs rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:border-[#008B85]"
          />
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      {/* Tabs phân nhóm học sinh */}
      <div className="flex flex-wrap gap-2 pt-3.5 pb-3 border-b border-[#F1F5F9]">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = selectedTargetType === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelect(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? "bg-[#003B3A] text-white"
                  : "bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-100 text-slate-700"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#5EEAD4]" : tab.color}`} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "bg-white text-slate-700 border border-[#E2E8F0]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bảng danh sách chuẩn Sky-Line Academic Ledger */}
      <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] shadow-xs mt-3.5 max-h-[500px]">
        <table className="w-full text-left border-collapse text-xs tabular-nums">
          <thead className="bg-[#003B3A] sticky top-0 z-20 text-white border-b border-[#003B3A]">
            <tr className="text-[11px] font-semibold whitespace-nowrap">
              <th className="py-3 px-3 text-white">Mã học sinh</th>
              <th className="py-3 px-3 text-white">Họ và tên</th>
              <th className="py-3 px-3 text-teal-100">Lớp</th>
              <th className="py-3 px-3 text-teal-100">Cơ sở</th>
              <th className="py-3 px-3 text-teal-100">Kỳ kiểm tra</th>
              <th className="py-3 px-3 text-teal-100">Môn học</th>
              <th className="py-3 px-3 text-center text-[#5EEAD4]">Điểm số</th>
              <th className="py-3 px-3 text-center text-teal-100">Chuẩn Sky-Line</th>
              <th className="py-3 px-3 text-center text-teal-100">Chênh lệch (Δ)</th>
              <th className="py-3 px-3 text-teal-100">Phân nhóm theo dõi</th>
              <th className="py-3 px-3 text-teal-100">GVCN</th>
              <th className="py-3 px-3 text-center text-white">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] bg-white tabular-nums">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-10 text-center text-slate-400">
                  Không tìm thấy học sinh nào thuộc nhóm điều kiện đang chọn.
                </td>
              </tr>
            ) : (
              filteredStudents.map((s, idx) => {
                const isBelowSkyline = s.isBelowSkyline
                const isBelowMoet = s.isBelowMoet
                const isPerfect10 = s.isPerfect10

                return (
                  <tr
                    key={`${s.studentId}_${s.subjectId}_${s.evaluationPeriod}_${idx}`}
                    className="hover:bg-[#F8FAFC] transition-colors align-middle"
                  >
                    <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                      {s.studentCode}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {s.studentName}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {s.className}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {s.campusName}
                    </td>
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-slate-700 text-[11px] font-medium">
                        {s.evaluationPeriod || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {s.subjectName}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg font-bold text-xs ${
                          isBelowMoet
                            ? "bg-rose-50 text-[#E11D48] border border-rose-200"
                            : isBelowSkyline
                            ? "bg-amber-50 text-[#D97706] border border-amber-200"
                            : isPerfect10
                            ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {s.score}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 font-medium">
                      {s.skylineBenchmark}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-[11px] ${
                          s.deltaSkyline >= 0
                            ? "text-[#059669] bg-emerald-50 border border-emerald-200"
                            : "text-[#E11D48] bg-rose-50 border border-rose-200"
                        }`}
                      >
                        {s.deltaSkyline >= 0 ? `+${s.deltaSkyline}` : s.deltaSkyline}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {isBelowMoet && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-[#E11D48] border border-rose-200">
                            Dưới 5.0
                          </span>
                        )}
                        {isBelowSkyline && !isBelowMoet && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-[#D97706] border border-amber-200">
                            Dưới chuẩn SL
                          </span>
                        )}
                        {s.isCommitment && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                            Cam kết đầu vào
                          </span>
                        )}
                        {s.isPsychological && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                            Tâm lý
                          </span>
                        )}
                        {isPerfect10 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-[#059669] border border-emerald-200">
                            Điểm 10
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {s.homeroomTeacher || "—"}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <a
                        href={`/admin/ktdbcl/support?studentId=${s.studentId}&yearId=${
                          s.academicYearId || ""
                        }`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0FDFA] hover:bg-[#CCFBF1]/60 text-[#00736E] border border-[#CCFBF1] text-[11px] font-semibold transition"
                      >
                        Hỗ trợ học tập
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
