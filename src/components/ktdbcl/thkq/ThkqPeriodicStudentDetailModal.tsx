"use client"

import React, { useMemo, useState } from "react"
import { X, Search, Download, Users, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react"
import * as XLSX from "xlsx"
import { StudentReconciledItem } from "@/lib/ktdbcl/thkqPeriodicReportEngine"

interface Props {
  open: boolean
  onClose: () => void
  loading: boolean
  title: string
  subtitle: string
  students: StudentReconciledItem[]
  canExportDetail: boolean
}

export function ThkqPeriodicStudentDetailModal({
  open,
  onClose,
  loading,
  title,
  subtitle,
  students = [],
  canExportDetail = false,
}: Props) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter(
      (s) =>
        String(s.studentName || "").toLowerCase().includes(q) ||
        String(s.studentCode || "").toLowerCase().includes(q) ||
        String(s.vnEduCode || "").toLowerCase().includes(q) ||
        String(s.classDisplayCode || "").toLowerCase().includes(q)
    )
  }, [students, search])

  if (!open) return null

  const handleExportModalExcel = () => {
    if (!canExportDetail || filtered.length === 0) return
    const wb = XLSX.utils.book_new()
    const rows = filtered.map((st, idx) => ({
      STT: idx + 1,
      "Mã học sinh": st.studentCode,
      "Mã vnEdu": st.vnEduCode || "",
      "Họ và tên": st.studentName,
      Lớp: st.classDisplayCode,
      Khối: st.gradeLabel,
      "Cơ sở": st.campusName,
      "Hệ học": st.educationSystemLabel,
      "Trạng thái dự KT":
        st.statusInTest === "VALID_SCORE"
          ? "Đã có điểm"
          : st.statusInTest === "ABSENT_MAKEUP"
          ? "Vắng / Chờ bù"
          : st.statusInTest === "EXEMPT"
          ? "Được miễn"
          : "Chưa có điểm",
      "Điểm chính thức": st.officialScore !== null ? st.officialScore : st.rawScoreText || "—",
      "Chuẩn Sky-Line": st.skylineBenchmark,
      "Đạt chuẩn Sky-Line":
        st.officialScore !== null ? (st.isAboveSkyline ? "Đạt" : "Dưới chuẩn") : "—",
      "Nguồn điểm": st.configType === "VNEDU" ? "Sổ điểm vnEdu" : "Nội bộ SSM",
      "Ghi chú": st.remark || "",
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachChiTiet")
    XLSX.writeFile(wb, `DS_HocSinh_ChiTiet_THKQ.xlsx`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#003B3A] text-white flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#5EEAD4]" />
              <h3 className="text-sm font-bold tracking-tight">{title}</h3>
            </div>
            <p className="text-xs text-teal-100 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên học sinh, mã HS, mã vnEdu hoặc lớp..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E2E8F0] bg-white text-slate-800 focus:outline-none focus:border-[#008B85]"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 tabular-nums">
              Tổng số: <strong className="text-slate-900">{filtered.length}</strong> học sinh
            </span>
            {canExportDetail && filtered.length > 0 && (
              <button
                onClick={handleExportModalExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#004E4C] text-white text-xs font-semibold transition"
              >
                <Download className="h-3.5 w-3.5" />
                Xuất danh sách (.xlsx)
              </button>
            )}
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500">
              Đang tải danh sách học sinh cấu thành chỉ tiêu...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              Không có học sinh nào trong nhóm chỉ tiêu này.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-2.5 px-3 text-center text-white w-12">STT</th>
                    <th className="py-2.5 px-3 text-left text-white">Mã học sinh</th>
                    <th className="py-2.5 px-3 text-left text-white">Họ và tên học sinh</th>
                    <th className="py-2.5 px-3 text-left text-teal-100">Lớp</th>
                    <th className="py-2.5 px-3 text-left text-teal-100">Hệ học</th>
                    <th className="py-2.5 px-3 text-center text-[#5EEAD4]">Điểm KT</th>
                    <th className="py-2.5 px-3 text-center text-teal-100">Trạng thái</th>
                    <th className="py-2.5 px-3 text-center text-[#5EEAD4]">Đối chuẩn Sky-Line</th>
                    <th className="py-2.5 px-3 text-left text-teal-100">Nguồn / Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {filtered.map((st, idx) => (
                    <tr key={st.studentId} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        <div>{st.studentCode}</div>
                        {st.vnEduCode && st.vnEduCode !== st.studentCode && (
                          <div className="text-[11px] text-slate-400">vnEdu: {st.vnEduCode}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{st.studentName}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{st.classDisplayCode}</td>
                      <td className="py-2.5 px-3 text-slate-600">{st.educationSystemLabel}</td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        {st.officialScore !== null ? (
                          <span
                            className={
                              st.officialScore < 5
                                ? "text-[#E11D48]"
                                : st.officialScore >= 8
                                ? "text-[#059669]"
                                : "text-slate-900"
                            }
                          >
                            {st.officialScore}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {st.statusInTest === "VALID_SCORE" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-[#059669] font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Có kết quả
                          </span>
                        ) : st.statusInTest === "ABSENT_MAKEUP" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-[#D97706] font-medium">
                            Vắng / Chờ bù
                          </span>
                        ) : st.statusInTest === "EXEMPT" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                            Được miễn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-[#E11D48] font-medium">
                            <AlertCircle className="h-3 w-3" /> Chưa có điểm
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {st.officialScore !== null ? (
                          st.isAboveSkyline ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] font-medium">
                              <ShieldCheck className="h-3 w-3" /> Đạt (≥ {st.skylineBenchmark})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-[#D97706] font-medium">
                              Dưới chuẩn (&lt; {st.skylineBenchmark})
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={st.remark || ""}>
                        <span className="font-medium text-slate-700">
                          {st.configType === "VNEDU" ? "vnEdu" : "SSM"}
                        </span>
                        {st.remark ? ` • ${st.remark}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
