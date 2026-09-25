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
  ExternalLink
} from "lucide-react"

interface Props {
  students: any[]
  totalCount: number
  countsByGroup: {
    belowSkyline: number
    belowMoet: number
    commitment: number
    psychological: number
    perfect10: number
  }
  selectedTargetType: string
  setSelectedTargetType: (t: string) => void
}

export function ThkqTargetStudentsTable({
  students = [],
  totalCount = 0,
  countsByGroup = { belowSkyline: 0, belowMoet: 0, commitment: 0, psychological: 0, perfect10: 0 },
  selectedTargetType = "ALL",
  setSelectedTargetType
}: Props) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredStudents = students.filter(s => {
    if (!searchTerm.trim()) return true
    const kw = searchTerm.toLowerCase().trim()
    return (
      s.studentName.toLowerCase().includes(kw) ||
      s.studentCode.toLowerCase().includes(kw) ||
      s.className.toLowerCase().includes(kw) ||
      s.subjectName.toLowerCase().includes(kw) ||
      s.campusName.toLowerCase().includes(kw)
    )
  })

  const tabs = [
    { id: "ALL", label: "Tất cả trọng tâm", count: totalCount, icon: Users, color: "text-slate-700" },
    {
      id: "BELOW_SKYLINE",
      label: "Dưới Chuẩn Sky-Line",
      count: countsByGroup.belowSkyline,
      icon: AlertCircle,
      color: "text-amber-600"
    },
    {
      id: "BELOW_MOET",
      label: "Dưới Chuẩn Bộ (<5.0)",
      count: countsByGroup.belowMoet,
      icon: AlertTriangle,
      color: "text-red-600"
    },
    {
      id: "COMMITMENT",
      label: "Cam kết đầu vào",
      count: countsByGroup.commitment,
      icon: HeartHandshake,
      color: "text-sky-600"
    },
    {
      id: "PSYCHOLOGICAL",
      label: "Theo dõi tâm lý",
      count: countsByGroup.psychological,
      icon: Brain,
      color: "text-purple-600"
    },
    {
      id: "PERFECT_10",
      label: "Điểm 10 Tuyệt đối",
      count: countsByGroup.perfect10,
      icon: Sparkles,
      color: "text-fuchsia-600"
    }
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800 tracking-tight">
                Danh sách Học sinh Trọng điểm & Phân nhóm Can thiệp
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                Focus Students
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Nhận diện sớm học sinh dưới chuẩn Sky-Line, chuẩn Bộ GD&ĐT, học sinh cam kết đầu vào và theo dõi tâm lý
            </p>
          </div>
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm tên HS, mã số, lớp..."
            className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      {/* Tabs phân nhóm học sinh */}
      <div className="flex flex-wrap gap-2 pt-4 pb-3 border-b border-slate-100">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = selectedTargetType === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTargetType(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-600"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-sky-400" : tab.color}`} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bảng danh sách chi tiết */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 mt-4 max-h-[500px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100/90 sticky top-0 z-20 backdrop-blur-xs">
            <tr className="divide-x divide-slate-200">
              <th className="py-2.5 px-3 font-bold text-slate-700">Mã HS</th>
              <th className="py-2.5 px-3 font-bold text-slate-700">Họ và Tên</th>
              <th className="py-2.5 px-3 font-bold text-slate-700">Lớp</th>
              <th className="py-2.5 px-3 font-bold text-slate-700">Cơ sở</th>
              <th className="py-2.5 px-3 font-bold text-slate-700">Môn học</th>
              <th className="py-2.5 px-3 font-bold text-center text-slate-700 bg-slate-200/50">Điểm số</th>
              <th className="py-2.5 px-3 font-bold text-center text-slate-700">Chuẩn Sky-Line</th>
              <th className="py-2.5 px-3 font-bold text-center text-slate-700">Chênh lệch (Δ)</th>
              <th className="py-2.5 px-3 font-bold text-slate-700">Diện theo dõi đặc thù</th>
              <th className="py-2.5 px-3 font-bold text-slate-700">GVCN</th>
              <th className="py-2.5 px-3 font-bold text-center text-slate-700">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-400">
                  Không tìm thấy học sinh nào thuộc diện này
                </td>
              </tr>
            ) : (
              filteredStudents.map((s, idx) => {
                const isBelowSkyline = s.isBelowSkyline
                const isBelowMoet = s.isBelowMoet
                const isPerfect10 = s.isPerfect10

                return (
                  <tr key={`${s.studentId}_${s.subjectId}_${idx}`} className="hover:bg-slate-50 transition divide-x divide-slate-100">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-600 whitespace-nowrap">
                      {s.studentCode}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      {s.studentName}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                      {s.className}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {s.campusName}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                      {s.subjectName}
                    </td>

                    {/* Điểm số */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-lg font-black text-xs ${
                          isBelowMoet
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : isBelowSkyline
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : isPerfect10
                            ? "bg-purple-100 text-purple-800 border border-purple-200 shadow-xs"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {s.score}
                      </span>
                    </td>

                    {/* Chuẩn Sky-Line */}
                    <td className="py-2.5 px-3 text-center text-slate-600 font-semibold">
                      {s.skylineBenchmark}
                    </td>

                    {/* Chênh lệch với chuẩn */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          s.deltaSkyline >= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                        }`}
                      >
                        {s.deltaSkyline >= 0 ? `+${s.deltaSkyline}` : s.deltaSkyline}
                      </span>
                    </td>

                    {/* Diện đối tượng */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {isBelowMoet && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                            <AlertTriangle className="h-2.5 w-2.5" /> Dưới TB (&lt;5)
                          </span>
                        )}
                        {isBelowSkyline && !isBelowMoet && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                            &lt; Chuẩn Sky-Line
                          </span>
                        )}
                        {s.isCommitment && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700">
                            <HeartHandshake className="h-2.5 w-2.5" /> Cam kết đầu vào
                          </span>
                        )}
                        {s.isPsychological && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                            <Brain className="h-2.5 w-2.5" /> Tâm lý
                          </span>
                        )}
                        {isPerfect10 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-fuchsia-100 text-fuchsia-700">
                            <Sparkles className="h-2.5 w-2.5" /> Điểm 10 ★
                          </span>
                        )}
                        {!isBelowSkyline && !s.isCommitment && !s.isPsychological && !isPerfect10 && (
                          <span className="text-[11px] text-slate-400">Đạt chuẩn</span>
                        )}
                      </div>
                    </td>

                    {/* GVCN */}
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {s.homeroomTeacher || "—"}
                    </td>

                    {/* Thao tác */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <a
                        href={`/admin/ktdbcl/support?studentId=${s.studentId}&yearId=${s.academicYearId || ""}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-semibold transition"
                        title="Mở hồ sơ hỗ trợ học tập / phụ đạo"
                      >
                        Hỗ trợ / Phụ đạo
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
