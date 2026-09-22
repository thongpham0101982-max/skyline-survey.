"use client"

import { useState } from "react"
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  CheckCircle2, 
  Building2, 
  Award,
  ShieldCheck,
  Eye,
  EyeOff
} from "lucide-react"

interface Props {
  departmentData: any
  evaluationPeriod: string
  subjectName: string
}

export function DepartmentBenchmarkTab({
  departmentData,
  evaluationPeriod,
  subjectName
}: Props) {
  const [anonymizePeers, setAnonymizePeers] = useState(false)

  if (!departmentData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">Không có dữ liệu đối sánh Tổ chuyên môn</h3>
        <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
          Tài khoản chưa được liên kết với Tổ chuyên môn hoặc chưa có dữ liệu điểm của đồng nghiệp trong đợt này.
        </p>
      </div>
    )
  }

  const {
    departmentName,
    departmentAvg,
    systemAvg,
    systemByEdu = [],
    myOverallAvg,
    deltaVsDepartment,
    deltaVsSystem,
    peers = []
  } = departmentData

  return (
    <div className="space-y-6">
      {/* 3 Overview Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: My overall score */}
        <div className="bg-gradient-to-br from-teal-900 to-[#003B3A] text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute right-3 -bottom-2 text-white/10">
            <GraduationCap className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <span className="text-[11px] font-semibold text-teal-200 uppercase tracking-wider block mb-1">
              ĐTB của bạn ({subjectName})
            </span>
            <div className="text-3xl font-black tabular-nums tracking-tight">
              {myOverallAvg > 0 ? myOverallAvg.toFixed(2) : "—"}
            </div>
            <p className="text-xs text-teal-100/80 mt-2">
              Tính trên tất cả các lớp bạn phụ trách đợt {evaluationPeriod}
            </p>
          </div>
        </div>

        {/* Card 2: Department Avg */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Trung bình Tổ chuyên môn ({departmentName})
          </span>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-slate-900 tabular-nums">
              {departmentAvg > 0 ? departmentAvg.toFixed(2) : "—"}
            </span>
            {deltaVsDepartment !== undefined && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                deltaVsDepartment >= 0 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {deltaVsDepartment >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {deltaVsDepartment >= 0 ? `+${deltaVsDepartment.toFixed(1)}` : deltaVsDepartment.toFixed(1)} vs Tổ CM
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Mức trung bình của các GVBM trong cùng Tổ chuyên môn
          </p>
        </div>

        {/* Card 3: System Avg */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Trung bình Toàn Hệ thống Sky-Line
          </span>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-slate-900 tabular-nums">
              {systemAvg > 0 ? systemAvg.toFixed(2) : "—"}
            </span>
            {deltaVsSystem !== undefined && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                deltaVsSystem >= 0 
                  ? "bg-sky-50 text-sky-700 border border-sky-200" 
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                {deltaVsSystem >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {deltaVsSystem >= 0 ? `+${deltaVsSystem.toFixed(1)}` : deltaVsSystem.toFixed(1)} vs Hệ thống
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Tổng hợp dữ liệu toàn bộ các cơ sở (CS1, CS2, CS3, CS4, CS5)
          </p>
        </div>
      </div>

      {/* Peer Teachers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Đối sánh Giáo viên trong Tổ chuyên môn ({departmentName})
            </h4>
          </div>

          <button
            onClick={() => setAnonymizePeers(!anonymizePeers)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            {anonymizePeers ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{anonymizePeers ? "Hiện tên đồng nghiệp" : "Ẩn danh đồng nghiệp"}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 text-center">Xếp hạng</th>
                <th className="py-3 px-4">Giáo viên Bộ môn</th>
                <th className="py-3 px-3 text-center">Mã GV</th>
                <th className="py-3 px-3 text-center">Số lớp phụ trách</th>
                <th className="py-3 px-3 text-center">Số lượng đã chấm</th>
                <th className="py-3 px-3 text-center">ĐTB Môn ({subjectName})</th>
                <th className="py-3 px-3 text-center">So với TB Tổ (Δ)</th>
                <th className="py-3 px-3 text-center">Tỉ lệ Đạt chuẩn SKL</th>
                <th className="py-3 px-3 text-center">Tỉ lệ Khá - Giỏi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {peers.map((peer: any, idx: number) => {
                const isCurrent = peer.isCurrentTeacher
                const displayName = isCurrent 
                  ? `${peer.teacherName} (Bạn)` 
                  : anonymizePeers 
                  ? `Giáo viên ${String(idx + 1).padStart(2, '0')}` 
                  : peer.teacherName
                const displayCode = isCurrent 
                  ? peer.teacherCode 
                  : anonymizePeers 
                  ? `GV_${idx + 1}` 
                  : peer.teacherCode
                const deltaTổ = peer.avgScore > 0 && departmentAvg > 0
                  ? Math.round((peer.avgScore - departmentAvg) * 10) / 10
                  : 0

                return (
                  <tr 
                    key={peer.teacherId}
                    className={`transition-colors ${
                      isCurrent 
                        ? "bg-teal-50/50 hover:bg-teal-50/80 font-medium" 
                        : "hover:bg-slate-50/60 text-slate-600"
                    }`}
                  >
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold tabular-nums ${
                        idx === 0 
                          ? "bg-amber-100 text-amber-800 ring-2 ring-amber-300" 
                          : idx === 1 
                          ? "bg-slate-200 text-slate-700" 
                          : idx === 2 
                          ? "bg-amber-50 text-amber-700 border border-amber-200" 
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {idx + 1}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isCurrent ? "text-[#003B3A]" : "text-slate-800"}`}>
                          {displayName}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white shadow-2xs">
                            Bạn
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center tabular-nums text-slate-500 font-mono text-[11px]">
                      {displayCode}
                    </td>

                    <td className="py-3 px-3 text-center tabular-nums font-semibold">
                      {peer.classesCount} lớp
                    </td>

                    <td className="py-3 px-3 text-center tabular-nums text-slate-600">
                      {peer.gradedCount} bài
                    </td>

                    <td className="py-3 px-3 text-center tabular-nums">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg font-bold text-sm ${
                        peer.avgScore >= 8.0 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : peer.avgScore >= 6.5 
                          ? "bg-sky-50 text-sky-700 border border-sky-200" 
                          : peer.avgScore >= 5.0 
                          ? "bg-amber-50 text-amber-700 border border-amber-200" 
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {peer.avgScore > 0 ? peer.avgScore.toFixed(1) : "—"}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center tabular-nums">
                      {deltaTổ > 0 ? (
                        <span className="text-emerald-700 font-semibold text-xs">
                          +{deltaTổ.toFixed(1)}
                        </span>
                      ) : deltaTổ < 0 ? (
                        <span className="text-red-600 font-semibold text-xs">
                          {deltaTổ.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-400">0.0</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center tabular-nums font-semibold text-slate-800">
                      {peer.pctPassed}%
                    </td>

                    <td className="py-3 px-3 text-center tabular-nums font-semibold text-teal-700">
                      {peer.pctExcellent}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Comparison by Education System */}
      {systemByEdu.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-sky-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Đối sánh ĐTB theo Hệ đào tạo (Toàn Hệ thống Sky-Line)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {systemByEdu.map((sys: any) => (
              <div 
                key={sys.educationSystem}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-teal-300 transition-colors"
              >
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  {sys.educationSystem}
                </div>
                <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                  {sys.avgScore.toFixed(2)}đ
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Quy mô: {sys.count} học sinh toàn trường
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
