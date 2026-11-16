"use client"

import { useState, useEffect, useMemo } from "react"
import * as XLSX from "xlsx"
import {
  Award,
  Search,
  Trophy,
  Medal,
  FileSpreadsheet,
  Printer,
  BookOpen,
  Check,
  X,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Filter,
  UserCheck,
} from "lucide-react"
import {
  getAchievementsReportAction,
  getStudentProfileWithAchievementsAction,
  searchStudentsByNameOrCodeAction,
  getStudentsByClassAction,
  getAchievementRequestsAction,
  reviewAchievementRequestAction,
  batchReviewAchievementRequestsAction,
  getAchievementRequestStatsAction,
  deleteStudentAchievementRecordAction,
} from "./actions"

/* ============================================================================
 * 1. BÁO CÁO THÀNH TÍCH (REPORTS SUB-TAB)
 * ========================================================================== */
export function ReportsSubTab({
  yearId,
  academicYears,
  exams = [],
  campuses,
  classes,
  achievementCategories,
  achievementLevels,
  categoryLabels,
  levelLabels,
  onOpenDirectAward,
  onNotify,
}: {
  yearId: string
  academicYears: any[]
  exams?: any[]
  campuses: any[]
  classes: any[]
  achievementCategories: any[]
  achievementLevels: any[]
  categoryLabels: Record<string, string>
  levelLabels: Record<string, string>
  onOpenDirectAward: (student?: any) => void
  onNotify: (msg: string, type?: "success" | "error") => void
}) {
  const [reportFilter, setReportFilter] = useState({
    examId: "",
    campusId: "",
    grade: "",
    classId: "",
    category: "",
    level: "",
    search: "",
  })
  const [reportData, setReportData] = useState<any[]>([])
  const [loadingReport, setLoadingReport] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 25

  const availableExams = useMemo(
    () => exams.filter((ex) => !yearId || ex.academicYearId === yearId),
    [exams, yearId]
  )

  useEffect(() => {
    if (
      reportFilter.examId &&
      reportFilter.examId !== "__EXTERNAL__" &&
      !availableExams.some((ex) => ex.id === reportFilter.examId)
    ) {
      setReportFilter((p) => ({ ...p, examId: "" }))
    }
  }, [availableExams, reportFilter.examId])

  const loadReport = async () => {
    setLoadingReport(true)
    try {
      const data = await getAchievementsReportAction({
        academicYearId: yearId,
        examId: reportFilter.examId,
        campusId: reportFilter.campusId,
        grade: reportFilter.grade,
        classId: reportFilter.classId,
        category: reportFilter.category,
        level: reportFilter.level,
      })
      setReportData(data)
    } catch {
      onNotify("Không thể tải dữ liệu báo cáo thành tích.", "error")
    } finally {
      setLoadingReport(false)
    }
  }

  useEffect(() => {
    loadReport()
    setPage(1)
  }, [
    yearId,
    reportFilter.examId,
    reportFilter.campusId,
    reportFilter.grade,
    reportFilter.classId,
    reportFilter.category,
    reportFilter.level,
  ])

  const filteredData = useMemo(() => {
    const q = reportFilter.search.trim().toLowerCase()
    if (!q) return reportData
    return reportData.filter(
      (r) =>
        (r.studentName || "").toLowerCase().includes(q) ||
        (r.studentCode || "").toLowerCase().includes(q) ||
        (r.examName || "").toLowerCase().includes(q) ||
        (r.achievementName || "").toLowerCase().includes(q) ||
        (r.className || "").toLowerCase().includes(q)
    )
  }, [reportData, reportFilter.search])

  const goldCount = filteredData.filter((d) => d.level === "VANG" || d.level === "NHAT").length
  const silverCount = filteredData.filter((d) => d.level === "BAC" || d.level === "NHI").length
  const bronzeCount = filteredData.filter((d) => d.level === "DONG" || d.level === "BA").length
  const otherCount = Math.max(0, filteredData.length - goldCount - silverCount - bronzeCount)

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const pagedData = filteredData.slice((page - 1) * pageSize, page * pageSize)

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      onNotify("Không có dữ liệu để xuất Excel.", "error")
      return
    }
    const exportRows = filteredData.map((row, idx) => ({
      STT: idx + 1,
      "Mã HS": row.studentCode,
      "Họ và tên": row.studentName,
      Lớp: row.className,
      "Cơ sở": row.campusName,
      Khối: row.grade,
      "Kỳ thi / Cuộc thi": row.examName,
      "Thành tích đạt được": row.achievementName,
      "Loại thành tích": categoryLabels[row.category] || row.category,
      "Mức giải": levelLabels[row.level] || row.level || "—",
      "Hình thức": row.type === "CA_NHAN" ? "Cá nhân" : "Đồng đội",
      "GV bồi dưỡng": row.teacherName,
      "Năm học": row.academicYearName,
    }))

    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Bao_Cao_Thanh_Tich")
    const maxLens = Object.keys(exportRows[0]).map((key) =>
      Math.max(
        key.length + 4,
        ...exportRows.map((row) => String((row as any)[key] || "").length + 2)
      )
    )
    ws["!cols"] = maxLens.map((w) => ({ wch: Math.min(w, 42) }))
    const yrName = academicYears.find((y) => y.id === yearId)?.name || "NamHoc"
    XLSX.writeFile(wb, `Bao_Cao_Thanh_Tich_HS_${yrName}.xlsx`)
  }

  const handleDeleteRecord = async (row: any) => {
    if (
      !confirm(
        `Xóa thành tích "${row.achievementName}" của học sinh ${row.studentName} (${row.studentCode})?`
      )
    )
      return
    try {
      await deleteStudentAchievementRecordAction(row.achievementId, row.studentId)
      setReportData((prev) =>
        prev.filter(
          (r) => !(r.achievementId === row.achievementId && r.studentId === row.studentId)
        )
      )
      onNotify("Đã xóa bản ghi thành tích.")
    } catch {
      onNotify("Không thể xóa bản ghi thành tích.", "error")
    }
  }

  const availableClasses = classes.filter(
    (c) =>
      c.academicYearId === yearId &&
      (!reportFilter.campusId || c.campusId === reportFilter.campusId) &&
      (!reportFilter.grade || c.grade === reportFilter.grade)
  )

  return (
    <div className="space-y-4">
      {/* Unified Ledger Strip */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-xs grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] tabular-nums no-print">
        <div className="p-3.5 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">Tổng giải thưởng</p>
            <p className="text-xl font-bold text-[#003B3A] mt-0.5">{filteredData.length}</p>
          </div>
          <div className="p-2 rounded-xl bg-[#F0FDFA] text-[#003B3A] border border-[#CCFBF1]">
            <Trophy className="w-4 h-4 text-[#008B85]" />
          </div>
        </div>

        <div className="p-3.5 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">Nhất / Huy chương Vàng</p>
            <p className="text-xl font-bold text-[#D97706] mt-0.5">{goldCount}</p>
          </div>
          <div className="p-2 rounded-xl bg-amber-50 text-[#D97706] border border-amber-200/70">
            <Award className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">Nhì / Huy chương Bạc</p>
            <p className="text-xl font-bold text-slate-700 mt-0.5">{silverCount}</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
            <Medal className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">Ba / Huy chương Đồng</p>
            <p className="text-xl font-bold text-amber-800 mt-0.5">{bronzeCount}</p>
          </div>
          <div className="p-2 rounded-xl bg-amber-50/70 text-amber-800 border border-amber-200/60">
            <Medal className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 flex items-center justify-between gap-2 col-span-2 sm:col-span-1">
          <div>
            <p className="text-xs font-semibold text-slate-500">Khuyến khích & Khác</p>
            <p className="text-xl font-bold text-[#059669] mt-0.5">{otherCount}</p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 text-[#059669] border border-emerald-200/70">
            <Award className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Compact Filter & Action Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-xs font-bold text-[#003B3A]">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#00A19A]" />
              <span>Bộ lọc báo cáo thành tích</span>
            </div>
            {(reportFilter.examId ||
              reportFilter.campusId ||
              reportFilter.grade ||
              reportFilter.classId ||
              reportFilter.category ||
              reportFilter.level ||
              reportFilter.search) && (
              <button
                type="button"
                onClick={() => {
                  setReportFilter({
                    examId: "",
                    campusId: "",
                    grade: "",
                    classId: "",
                    category: "",
                    level: "",
                    search: "",
                  })
                  setPage(1)
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-[#E11D48] bg-rose-50 hover:bg-rose-100 border border-rose-200/70 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenDirectAward()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0FDFA] hover:bg-[#CCFBF1]/60 text-[#003B3A] border border-[#CCFBF1] text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#008B85]" />
              <span>Ghi nhận bổ sung</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span>Xuất Excel</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In / PDF</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1.5fr_1.6fr_1fr_0.85fr_1fr_0.95fr_0.95fr] gap-2.5 text-xs tabular-nums">
          <div className="relative sm:col-span-2 lg:col-span-2 xl:col-span-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={reportFilter.search}
              onChange={(e) => {
                setReportFilter((p) => ({ ...p, search: e.target.value }))
                setPage(1)
              }}
              placeholder="Tìm tên HS, mã HS, lớp hoặc kỳ thi..."
              className="w-full pl-8.5 pr-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-700"
            />
          </div>

          <select
            value={reportFilter.examId}
            onChange={(e) => setReportFilter((p) => ({ ...p, examId: e.target.value }))}
            title={
              reportFilter.examId === "__EXTERNAL__"
                ? "Ngoài hệ thống (Ghi nhận trực tiếp)"
                : availableExams.find((ex) => ex.id === reportFilter.examId)?.name ||
                  "Lọc theo kỳ thi"
            }
            className="sm:col-span-2 lg:col-span-2 xl:col-span-1 border border-[#E2E8F0] rounded-xl px-2.5 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-700 truncate"
          >
            <option value="">Tất cả kỳ thi ({availableExams.length})</option>
            <option value="__EXTERNAL__">Ngoài hệ thống</option>
            {availableExams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>

          <select
            value={reportFilter.campusId}
            onChange={(e) =>
              setReportFilter((p) => ({ ...p, campusId: e.target.value, classId: "" }))
            }
            className="border border-[#E2E8F0] rounded-xl px-2.5 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-700 truncate"
          >
            <option value="">Tất cả cơ sở</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.campusName}
              </option>
            ))}
          </select>

          <select
            value={reportFilter.grade}
            onChange={(e) =>
              setReportFilter((p) => ({ ...p, grade: e.target.value, classId: "" }))
            }
            className="border border-[#E2E8F0] rounded-xl px-2.5 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-700 truncate"
          >
            <option value="">Tất cả khối</option>
            {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((g) => (
              <option key={g} value={g}>
                Khối {g}
              </option>
            ))}
          </select>

          <select
            value={reportFilter.classId}
            onChange={(e) => setReportFilter((p) => ({ ...p, classId: e.target.value }))}
            className="border border-[#E2E8F0] rounded-xl px-2.5 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-700 truncate"
          >
            <option value="">Tất cả lớp ({availableClasses.length})</option>
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.className}
              </option>
            ))}
          </select>

          <select
            value={reportFilter.category}
            onChange={(e) =>
              setReportFilter((p) => ({ ...p, category: e.target.value, level: "" }))
            }
            className="border border-[#E2E8F0] rounded-xl px-2.5 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-700 truncate"
          >
            <option value="">Tất cả loại giải</option>
            {achievementCategories.map((c) => (
              <option key={c.id || c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={reportFilter.level}
            onChange={(e) => setReportFilter((p) => ({ ...p, level: e.target.value }))}
            className="border border-[#E2E8F0] rounded-xl px-2.5 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-700 truncate"
          >
            <option value="">Tất cả mức giải</option>
            {(() => {
              const catObj = achievementCategories.find((c) => c.code === reportFilter.category)
              const rawList = catObj
                ? achievementLevels.filter((l) => l.categoryId === catObj.id)
                : achievementLevels
              const seenCodes = new Set<string>()
              const list = rawList.filter((l) => {
                if (!l.code || seenCodes.has(l.code)) return false
                seenCodes.add(l.code)
                return true
              })
              return list.map((l) => (
                <option key={l.id || l.code} value={l.code}>
                  {l.name}
                </option>
              ))
            })()}
          </select>
        </div>
      </div>

      {/* Sky-Line Academic Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden print-area">
        <div className="hidden print-only py-6 text-center space-y-1 border-b border-[#E2E8F0] mb-4">
          <h2 className="text-lg font-bold text-slate-900">Hệ thống Giáo dục Sky-Line</h2>
          <h3 className="text-sm font-bold text-slate-700">Báo cáo tổng hợp thành tích học sinh</h3>
          <p className="text-xs text-slate-500">
            Năm học: {academicYears.find((y) => y.id === yearId)?.name || "—"} | Cơ sở:{" "}
            {campuses.find((c) => c.id === reportFilter.campusId)?.campusName || "Toàn hệ thống"}
            {reportFilter.examId
              ? ` | Kỳ thi: ${
                  reportFilter.examId === "__EXTERNAL__"
                    ? "Ngoài hệ thống"
                    : availableExams.find((ex) => ex.id === reportFilter.examId)?.name || "—"
                }`
              : ""}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse tabular-nums">
            <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 w-12 text-center text-teal-100 font-semibold">STT</th>
                <th className="py-3 px-3 text-teal-100 font-semibold">Mã HS</th>
                <th className="py-3 px-3 font-semibold">Học sinh</th>
                <th className="py-3 px-3 text-teal-100 font-semibold">Lớp & Cơ sở</th>
                <th className="py-3 px-3 text-teal-100 font-semibold">Kỳ thi / Cuộc thi</th>
                <th className="py-3 px-3 font-semibold">Thành tích đạt được</th>
                <th className="py-3 px-3 text-center text-[#5EEAD4] font-semibold">Mức giải</th>
                <th className="py-3 px-3 text-teal-100 font-semibold">GV bồi dưỡng</th>
                <th className="py-3 px-3 text-right font-semibold no-print">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {loadingReport ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00A19A]" />
                    <span>Đang tổng hợp sổ cái thành tích...</span>
                  </td>
                </tr>
              ) : pagedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-500">
                    <p className="font-bold text-slate-700">Chưa có bản ghi thành tích phù hợp</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Điều chỉnh bộ lọc hoặc nhấn &ldquo;Ghi nhận bổ sung&rdquo; để thêm mới.
                    </p>
                  </td>
                </tr>
              ) : (
                pagedData.map((row, idx) => {
                  const isTop = row.level === "NHAT" || row.level === "VANG"
                  const isSecond = row.level === "NHI" || row.level === "BAC"
                  const isThird = row.level === "BA" || row.level === "DONG"
                  return (
                    <tr
                      key={`${row.achievementId}-${row.studentId}-${idx}`}
                      className="transition-colors align-middle hover:bg-[#F8FAFC]"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{row.studentCode}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{row.studentName}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-[#003B3A]">{row.className}</span>
                        <span className="block text-[11px] text-slate-400">{row.campusName}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-[240px]">
                        <span className="line-clamp-2">{row.examName}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900">{row.achievementName}</span>
                        <span className="block text-[11px] text-slate-400">
                          {categoryLabels[row.category] || row.category} ·{" "}
                          {row.type === "DONG_DOI" ? "Đồng đội" : "Cá nhân"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isTop
                              ? "bg-amber-50 text-[#D97706] border-amber-200"
                              : isSecond
                              ? "bg-slate-100 text-slate-700 border-slate-300"
                              : isThird
                              ? "bg-amber-50/60 text-amber-800 border-amber-200"
                              : "bg-emerald-50 text-[#059669] border-emerald-200"
                          }`}
                        >
                          {levelLabels[row.level] ||
                            row.level ||
                            categoryLabels[row.category] ||
                            "Đạt giải"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{row.teacherName}</td>
                      <td className="py-3 px-3 text-right no-print">
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(row)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa bản ghi này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredData.length > pageSize && (
          <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs tabular-nums no-print">
            <span className="text-slate-500">
              Hiển thị <strong>{(page - 1) * pageSize + 1}</strong>–
              <strong>{Math.min(page * pageSize, filteredData.length)}</strong> /{" "}
              <strong>{filteredData.length}</strong> giải thưởng
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-slate-600 disabled:opacity-40 cursor-pointer"
              >
                Trước
              </button>
              <span className="px-2.5 py-1 font-semibold text-[#003B3A]">
                Trang {page}/{totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-slate-600 disabled:opacity-40 cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================================
 * 2. HỒ SƠ HỌC SINH (PROFILES SUB-TAB)
 * ========================================================================== */
export function ProfilesSubTab({
  yearId,
  campuses,
  classes,
  categoryLabels,
  levelLabels,
  onOpenDirectAward,
  onNotify,
}: {
  yearId: string
  campuses: any[]
  classes: any[]
  categoryLabels: Record<string, string>
  levelLabels: Record<string, string>
  onOpenDirectAward: (student?: any) => void
  onNotify: (msg: string, type?: "success" | "error") => void
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [viewMode, setViewMode] = useState<"ledger" | "cards">("ledger")

  const [profileCampusId, setProfileCampusId] = useState("")
  const [profileGrade, setProfileGrade] = useState("")
  const [profileClassId, setProfileClassId] = useState("")
  const [classStudents, setClassStudents] = useState<any[]>([])
  const [loadingClassStudents, setLoadingClassStudents] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!profileClassId) {
        setClassStudents([])
        return
      }
      setLoadingClassStudents(true)
      try {
        const data = await getStudentsByClassAction(profileClassId)
        setClassStudents(data)
      } finally {
        setLoadingClassStudents(false)
      }
    }
    load()
  }, [profileClassId])

  const handleSearch = async (val: string) => {
    setSearchQuery(val)
    if (val.trim().length < 2) {
      setSearchResults([])
      return
    }
    setLoadingSearch(true)
    try {
      const res = await searchStudentsByNameOrCodeAction(val)
      setSearchResults(res)
    } finally {
      setLoadingSearch(false)
    }
  }

  const selectStudent = async (studentId: string) => {
    setLoadingProfile(true)
    setSearchResults([])
    try {
      const data = await getStudentProfileWithAchievementsAction(studentId)
      setSelectedStudentProfile(data)
    } catch {
      onNotify("Không thể tải hồ sơ thành tích học sinh.", "error")
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleDeleteFromProfile = async (achId: string, achStudentId?: string) => {
    if (!selectedStudentProfile) return
    if (!confirm("Xóa thành tích này khỏi hồ sơ học sinh?")) return
    try {
      await deleteStudentAchievementRecordAction(
        achId,
        achStudentId || selectedStudentProfile.id
      )
      await selectStudent(selectedStudentProfile.id)
      onNotify("Đã cập nhật hồ sơ học sinh.")
    } catch {
      onNotify("Không thể xóa thành tích.", "error")
    }
  }

  const availableClasses = classes.filter(
    (c) =>
      c.academicYearId === yearId &&
      (!profileCampusId || c.campusId === profileCampusId) &&
      (!profileGrade || c.grade === profileGrade)
  )

  return (
    <div className="space-y-4">
      {/* Compact Lookup Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end text-xs">
          {/* Quick Search */}
          <div className="lg:col-span-5 relative">
            <label className="block font-semibold text-slate-700 mb-1">
              Tra cứu nhanh theo Mã HS hoặc Họ tên
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Nhập Mã học sinh hoặc Tên học sinh..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    setSearchResults([])
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-xl max-h-60 overflow-y-auto z-30 divide-y divide-[#F1F5F9]">
                {searchResults.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      selectStudent(s.id)
                      setSearchQuery("")
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-[#F0FDFA] flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{s.studentName}</span>
                      <span className="ml-2 font-mono text-[11px] text-slate-500 tabular-nums">
                        {s.studentCode}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-[#003B3A] bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 rounded-md text-[11px]">
                        {s.className}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {loadingSearch && (
              <p className="text-[11px] text-[#008B85] mt-1">Đang tìm học sinh...</p>
            )}
          </div>

          {/* Class Browse */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cơ sở</label>
              <select
                value={profileCampusId}
                onChange={(e) => {
                  setProfileCampusId(e.target.value)
                  setProfileClassId("")
                }}
                className="w-full border border-[#E2E8F0] rounded-xl px-2.5 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-700"
              >
                <option value="">-- Tất cả cơ sở --</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.campusName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Khối</label>
              <select
                value={profileGrade}
                onChange={(e) => {
                  setProfileGrade(e.target.value)
                  setProfileClassId("")
                }}
                className="w-full border border-[#E2E8F0] rounded-xl px-2.5 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-700"
              >
                <option value="">-- Tất cả khối --</option>
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((g) => (
                  <option key={g} value={g}>
                    Khối {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Chọn lớp</label>
              <select
                value={profileClassId}
                onChange={(e) => setProfileClassId(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-xl px-2.5 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-700"
              >
                <option value="">-- Chọn lớp ({availableClasses.length}) --</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {profileClassId && (
          <div className="pt-2.5 border-t border-[#F1F5F9]">
            {loadingClassStudents ? (
              <p className="text-xs text-slate-500">Đang tải danh sách lớp...</p>
            ) : classStudents.length === 0 ? (
              <p className="text-xs text-slate-400">Lớp chưa có học sinh hoạt động.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {classStudents.map((stu) => {
                  const active = selectedStudentProfile?.id === stu.id
                  return (
                    <button
                      key={stu.id}
                      type="button"
                      onClick={() => selectStudent(stu.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer tabular-nums ${
                        active
                          ? "bg-[#003B3A] text-white border-[#003B3A]"
                          : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] hover:border-[#008B85]"
                      }`}
                    >
                      {stu.studentName}{" "}
                      <span className={active ? "text-teal-200" : "text-slate-400"}>
                        ({stu.studentCode})
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Student Profile */}
      {loadingProfile ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] py-16 text-center text-slate-500 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00A19A]" />
          <span>Đang tải hồ sơ thành tích học sinh...</span>
        </div>
      ) : !selectedStudentProfile ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] py-14 text-center text-slate-500">
          <BookOpen className="w-9 h-9 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">Chưa chọn học sinh</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Tìm nhanh bằng Mã HS / Họ tên hoặc chọn lớp học phía trên để xem toàn bộ lịch sử thành tích.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Student Bio Strip */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 tabular-nums">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#003B3A] text-white flex items-center justify-center font-bold text-base shrink-0">
                {selectedStudentProfile.studentName.split(" ").pop()?.charAt(0) || "H"}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedStudentProfile.studentName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs font-semibold text-slate-600">
                    {selectedStudentProfile.studentCode}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#F0FDFA] border border-[#CCFBF1] text-xs font-semibold text-[#003B3A]">
                    Lớp {selectedStudentProfile.className}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedStudentProfile.campusName} · Năm học:{" "}
                  {selectedStudentProfile.academicYearName} · Tổng cộng:{" "}
                  <strong className="text-[#059669]">
                    {selectedStudentProfile.achievements.length} giải thưởng
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("ledger")}
                  className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                    viewMode === "ledger" ? "bg-[#003B3A] text-white" : "text-slate-600"
                  }`}
                >
                  Bảng sổ cái
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                    viewMode === "cards" ? "bg-[#003B3A] text-white" : "text-slate-600"
                  }`}
                >
                  Thẻ giải thưởng
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  onOpenDirectAward({
                    id: selectedStudentProfile.id,
                    studentCode: selectedStudentProfile.studentCode,
                    studentName: selectedStudentProfile.studentName,
                    className: selectedStudentProfile.className,
                    campusName: selectedStudentProfile.campusName,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#5EEAD4]" />
                <span>Thêm thành tích</span>
              </button>
            </div>
          </div>

          {selectedStudentProfile.achievements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] py-12 text-center text-slate-500">
              <p className="text-sm font-bold text-slate-700">Chưa ghi nhận thành tích nào</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhấn &ldquo;Thêm thành tích&rdquo; để bổ sung giải thưởng cho học sinh này.
              </p>
            </div>
          ) : viewMode === "ledger" ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse tabular-nums">
                  <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      <th className="py-3 px-3 w-12 text-center text-teal-100 font-semibold">STT</th>
                      <th className="py-3 px-3 font-semibold">Thành tích đạt được</th>
                      <th className="py-3 px-3 text-teal-100 font-semibold">Kỳ thi / Cuộc thi</th>
                      <th className="py-3 px-3 text-teal-100 font-semibold">Loại & Hình thức</th>
                      <th className="py-3 px-3 text-center text-[#5EEAD4] font-semibold">Mức giải</th>
                      <th className="py-3 px-3 text-teal-100 font-semibold">GV bồi dưỡng</th>
                      <th className="py-3 px-3 text-center text-teal-100 font-semibold">Năm học</th>
                      <th className="py-3 px-3 text-right font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {selectedStudentProfile.achievements.map((ach: any, idx: number) => (
                      <tr
                        key={ach.linkId || `${ach.id}-${idx}`}
                        className="transition-colors align-middle hover:bg-[#F8FAFC]"
                      >
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{ach.name}</td>
                        <td className="py-3 px-3 text-slate-700">{ach.examName}</td>
                        <td className="py-3 px-3 text-slate-600">
                          {categoryLabels[ach.category] || ach.category} ·{" "}
                          {ach.type === "DONG_DOI" ? "Đồng đội" : "Cá nhân"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                            {levelLabels[ach.level] || ach.level || "Đạt giải"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{ach.teacherName}</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">
                          {ach.yearName}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteFromProfile(ach.id, ach.studentId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 cursor-pointer"
                            title="Xóa thành tích này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedStudentProfile.achievements.map((ach: any, idx: number) => (
                <div
                  key={ach.linkId || `${ach.id}-${idx}`}
                  className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                        {categoryLabels[ach.category] || ach.category}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                        {ach.yearName}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{ach.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{ach.examName}</p>
                  </div>
                  <div className="pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-slate-500">
                    <span>GVHD: {ach.teacherName}</span>
                    {ach.level && (
                      <span className="font-semibold text-[#D97706]">
                        {levelLabels[ach.level] || ach.level}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ============================================================================
 * 3. XÉT DUYỆT BỔ SUNG TỪ GVCN (REQUESTS SUB-TAB)
 * ========================================================================== */
export function RequestsSubTab({
  yearId,
  exams = [],
  campuses,
  classes,
  achievementCategories = [],
  achievementLevels = [],
  teachers = [],
  categoryLabels,
  levelLabels,
  onNotify,
  onAfterReview,
  onOpenExamGrid,
}: {
  yearId: string
  exams?: any[]
  campuses: any[]
  classes: any[]
  achievementCategories?: any[]
  achievementLevels?: any[]
  teachers?: any[]
  categoryLabels: Record<string, string>
  levelLabels: Record<string, string>
  onNotify: (msg: string, type?: "success" | "error") => void
  onAfterReview?: (info?: { examId?: string | null }) => void
  onOpenExamGrid?: (examId: string) => void
}) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [filter, setFilter] = useState({
    examName: "all",
    campusId: "all",
    classId: "all",
    status: "PENDING",
    searchQuery: "",
  })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchSubmitting, setBatchSubmitting] = useState(false)

  const examsInActiveYear = useMemo(
    () => exams.filter((ex) => !yearId || ex.academicYearId === yearId),
    [exams, yearId]
  )

  const examFilterOptions = useMemo(() => {
    const names = new Set<string>()
    examsInActiveYear.forEach((ex) => {
      if (ex.name) names.add(ex.name)
    })
    requests.forEach((r) => {
      if (r.examName) names.add(r.examName)
    })
    return Array.from(names)
  }, [examsInActiveYear, requests])

  useEffect(() => {
    setFilter((p) => ({ ...p, examName: "all" }))
  }, [yearId])

  const [reviewDialog, setReviewDialog] = useState<{
    isOpen: boolean
    request: any | null
    status: "APPROVED" | "REJECTED"
    targetExamId: string
    examName: string
    achievementName: string
    type: string
    category: string
    level: string
    teacherId: string
    teacherName: string
    note: string
    submitting: boolean
  }>({
    isOpen: false,
    request: null,
    status: "APPROVED",
    targetExamId: "__EXTERNAL__",
    examName: "",
    achievementName: "",
    type: "CA_NHAN",
    category: "GIAI_THUONG",
    level: "",
    teacherId: "",
    teacherName: "",
    note: "",
    submitting: false,
  })

  const openReviewModal = (req: any, status: "APPROVED" | "REJECTED") => {
    const matchedExamId = req.matchedExam?.id || "__EXTERNAL__"
    const rawCoach = req.coachTeacher ? String(req.coachTeacher).trim() : ""
    const matchedTeacher = rawCoach
      ? teachers.find(
          (t: any) =>
            String(t.teacherName || "")
              .trim()
              .toLowerCase() === rawCoach.toLowerCase()
        )
      : null

    setReviewDialog({
      isOpen: true,
      request: req,
      status,
      targetExamId: matchedExamId,
      examName: req.matchedExam?.name || req.examName || "",
      achievementName: req.achievementName || "",
      type: req.type || "CA_NHAN",
      category: req.category || achievementCategories[0]?.code || "GIAI_THUONG",
      level: req.level || "",
      teacherId: matchedTeacher?.id || "",
      teacherName: matchedTeacher?.teacherName || rawCoach,
      note:
        status === "APPROVED"
          ? matchedExamId !== "__EXTERNAL__"
            ? "Đã xét duyệt, đổ kết quả vào kỳ thi và cập nhật Hồ sơ học sinh"
            : "Đã xét duyệt và cập nhật Thành tích lớp & Hồ sơ học sinh"
          : "",
      submitting: false,
    })
  }

  const closeReviewModal = () => {
    setReviewDialog((p) => ({ ...p, isOpen: false, request: null, submitting: false }))
  }

  const loadRequests = async () => {
    setLoading(true)
    try {
      const [data, st] = await Promise.all([
        getAchievementRequestsAction({
          academicYearId: yearId,
          campusId: filter.campusId,
          classId: filter.classId,
          status: filter.status,
        }),
        getAchievementRequestStatsAction(yearId),
      ])
      setRequests(data || [])
      setStats(st)
      setSelectedIds([])
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("achievementRequestsUpdated", { detail: st }))
      }
    } catch {
      onNotify("Không thể tải danh sách đề xuất bổ sung.", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [yearId, filter.campusId, filter.classId, filter.status])

  const filteredRequests = useMemo(() => {
    const q = filter.searchQuery.trim().toLowerCase()
    return requests.filter((r) => {
      if (filter.examName !== "all" && (r.examName || "") !== filter.examName) {
        return false
      }
      if (!q) return true
      return (
        (r.student?.studentName || "").toLowerCase().includes(q) ||
        (r.student?.studentCode || "").toLowerCase().includes(q) ||
        (r.examName || "").toLowerCase().includes(q) ||
        (r.achievementName || "").toLowerCase().includes(q) ||
        (r.teacherName || "").toLowerCase().includes(q) ||
        (r.student?.class?.className || "").toLowerCase().includes(q)
      )
    })
  }, [requests, filter.examName, filter.searchQuery])

  const pendingInView = filteredRequests.filter((r) => r.status === "PENDING")

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return
    if (
      !confirm(
        `Phê duyệt ${selectedIds.length} đề xuất đã chọn? Hệ thống sẽ tự động đổ kết quả vào kỳ thi tương ứng và cập nhật Thành tích HS (GVCN) & Hồ sơ học sinh.`
      )
    )
      return
    setBatchSubmitting(true)
    try {
      const res = await batchReviewAchievementRequestsAction({
        requestIds: selectedIds,
        status: "APPROVED",
      })
      const examPart =
        res.pouredIntoExamCount && res.pouredIntoExamCount > 0
          ? ` (đổ ${res.pouredIntoExamCount} kết quả vào bảng kỳ thi)`
          : ""
      onNotify(
        `Đã phê duyệt ${res.processed} đề xuất${examPart} và cập nhật Hồ sơ học sinh.`
      )
      await loadRequests()
      onAfterReview?.()
    } catch (err: any) {
      onNotify(err?.message || "Lỗi khi phê duyệt hàng loạt.", "error")
    } finally {
      setBatchSubmitting(false)
    }
  }

  const handleExecuteReview = async () => {
    if (!reviewDialog.request) return
    setReviewDialog((p) => ({ ...p, submitting: true }))
    try {
      const result = await reviewAchievementRequestAction({
        requestId: reviewDialog.request.id,
        status: reviewDialog.status,
        reviewNote: reviewDialog.note,
        overrides:
          reviewDialog.status === "APPROVED"
            ? {
                examId: reviewDialog.targetExamId,
                examName: reviewDialog.examName,
                achievementName: reviewDialog.achievementName,
                type: reviewDialog.type,
                category: reviewDialog.category,
                level: reviewDialog.level,
                teacherId: reviewDialog.teacherId || null,
                teacherName: reviewDialog.teacherName || null,
              }
            : undefined,
      })

      if (reviewDialog.status === "APPROVED") {
        const pouredExamName = result?.poured?.examId ? result.poured.examName : null
        onNotify(
          pouredExamName
            ? `Đã phê duyệt, đổ kết quả vào kỳ thi "${pouredExamName}" và đồng bộ Thành tích HS & Hồ sơ học sinh.`
            : "Đã phê duyệt và cập nhật lên Thành tích HS (GVCN) & Hồ sơ học sinh."
        )
      } else {
        onNotify("Đã từ chối yêu cầu bổ sung thành tích.")
      }

      closeReviewModal()
      await loadRequests()
      onAfterReview?.({ examId: result?.poured?.examId || null })
    } catch (err: any) {
      onNotify(err?.message || "Lỗi khi xét duyệt.", "error")
      setReviewDialog((p) => ({ ...p, submitting: false }))
    }
  }

  // Levels matching selected category in Review Modal
  const dialogAvailableLevels = useMemo(() => {
    if (!achievementLevels.length) return []
    const matchedCat = achievementCategories.find(
      (c: any) => c.code === reviewDialog.category
    )
    if (!matchedCat) return achievementLevels
    const scoped = achievementLevels.filter((l: any) => l.categoryId === matchedCat.id)
    return scoped.length > 0 ? scoped : achievementLevels
  }, [achievementCategories, achievementLevels, reviewDialog.category])

  const dialogExamsForRequestYear = useMemo(() => {
    const reqYearId = reviewDialog.request?.academicYearId || yearId
    const list = exams.filter((e) => !reqYearId || e.academicYearId === reqYearId)
    return list.length > 0 ? list : exams
  }, [exams, reviewDialog.request?.academicYearId, yearId])

  return (
    <div className="space-y-4">
      {/* Unified Ledger Strip */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-xs grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] tabular-nums">
        <div className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Tổng đề xuất GVCN</p>
            <p className="text-xl font-bold text-[#003B3A] mt-0.5">{stats.total}</p>
          </div>
          <UserCheck className="w-4 h-4 text-[#008B85]" />
        </div>
        <div className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Chờ xét duyệt</p>
            <p className="text-xl font-bold text-[#D97706] mt-0.5">{stats.pending}</p>
          </div>
          <Clock className="w-4 h-4 text-[#D97706]" />
        </div>
        <div className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Đã duyệt & đổ kết quả</p>
            <p className="text-xl font-bold text-[#059669] mt-0.5">{stats.approved}</p>
          </div>
          <CheckCircle2 className="w-4 h-4 text-[#059669]" />
        </div>
        <div className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Đã từ chối</p>
            <p className="text-xl font-bold text-[#E11D48] mt-0.5">{stats.rejected}</p>
          </div>
          <XCircle className="w-4 h-4 text-[#E11D48]" />
        </div>
      </div>

      {/* Filter & Batch Action Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
            {[
              { id: "all", label: "Tất cả", count: stats.total },
              { id: "PENDING", label: "Chờ xét duyệt", count: stats.pending },
              { id: "APPROVED", label: "Đã phê duyệt", count: stats.approved },
              { id: "REJECTED", label: "Đã từ chối", count: stats.rejected },
            ].map((pill) => {
              const active = filter.status === pill.id
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFilter((p) => ({ ...p, status: pill.id }))}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                    active
                      ? "bg-[#003B3A] text-white border-[#003B3A]"
                      : "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:text-[#003B3A]"
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-white text-slate-600 border border-[#E2E8F0]"
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              )
            })}
          </div>

          {selectedIds.length > 0 && (
            <button
              type="button"
              disabled={batchSubmitting}
              onClick={handleBatchApprove}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white font-semibold shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Duyệt & đổ kết quả đã chọn ({selectedIds.length})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 tabular-nums">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filter.searchQuery}
              onChange={(e) => setFilter((p) => ({ ...p, searchQuery: e.target.value }))}
              placeholder="Tìm tên HS, mã HS, kỳ thi, GVCN..."
              className="w-full pl-8.5 pr-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-700"
            />
          </div>

          <select
            value={filter.examName}
            onChange={(e) => setFilter((p) => ({ ...p, examName: e.target.value }))}
            title={filter.examName === "all" ? "Lọc theo kỳ thi" : filter.examName}
            className="border border-[#E2E8F0] rounded-xl px-3 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-700 truncate"
          >
            <option value="all">Tất cả kỳ thi ({examFilterOptions.length})</option>
            {examFilterOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={filter.campusId}
            onChange={(e) =>
              setFilter((p) => ({ ...p, campusId: e.target.value, classId: "all" }))
            }
            className="border border-[#E2E8F0] rounded-xl px-3 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-700 truncate"
          >
            <option value="all">Tất cả cơ sở</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.campusName}
              </option>
            ))}
          </select>

          <select
            value={filter.classId}
            onChange={(e) => setFilter((p) => ({ ...p, classId: e.target.value }))}
            className="border border-[#E2E8F0] rounded-xl px-3 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-700 truncate"
          >
            <option value="all">Tất cả lớp học</option>
            {classes
              .filter(
                (c) =>
                  c.academicYearId === yearId &&
                  (filter.campusId === "all" || c.campusId === filter.campusId)
              )
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1080px] tabular-nums">
            <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 w-10 text-center font-semibold">
                  <input
                    type="checkbox"
                    checked={
                      pendingInView.length > 0 &&
                      pendingInView.every((r) => selectedIds.includes(r.id))
                    }
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? pendingInView.map((r) => r.id) : [])
                    }
                    className="w-3.5 h-3.5 rounded text-[#00A19A] cursor-pointer"
                    title="Chọn tất cả yêu cầu chờ duyệt"
                  />
                </th>
                <th className="py-3 px-3 font-semibold text-white">Học sinh</th>
                <th className="py-3 px-3 text-teal-100 font-semibold">Lớp & Cơ sở</th>
                <th className="py-3 px-3 text-teal-100 font-semibold">GVCN đề xuất</th>
                <th className="py-3 px-3 text-teal-100 font-semibold">
                  Kỳ thi & Đích đổ kết quả
                </th>
                <th className="py-3 px-3 font-semibold text-white">Thành tích & Mức giải</th>
                <th className="py-3 px-3 text-teal-100 font-semibold">GV bồi dưỡng & Minh chứng</th>
                <th className="py-3 px-3 text-center text-[#5EEAD4] font-semibold">Trạng thái</th>
                <th className="py-3 px-3 text-right font-semibold text-white">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00A19A]" />
                    <span>Đang tải danh sách đề xuất...</span>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-500">
                    <p className="font-bold text-slate-700">Không có đề xuất bổ sung nào</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Chưa có yêu cầu phù hợp với trạng thái hoặc bộ lọc hiện tại.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const isPending = req.status === "PENDING"
                  const isApproved = req.status === "APPROVED"
                  const isChecked = selectedIds.includes(req.id)
                  const matchedExam = req.matchedExam

                  return (
                    <tr
                      key={req.id}
                      className={`transition-colors align-middle ${
                        isChecked ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]" : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        {isPending ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setSelectedIds((prev) =>
                                e.target.checked
                                  ? [...prev, req.id]
                                  : prev.filter((id) => id !== req.id)
                              )
                            }
                            className="w-3.5 h-3.5 rounded text-[#00A19A] cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 block">
                          {req.student?.studentName || "N/A"}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {req.student?.studentCode}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-[#003B3A] block">
                          {req.student?.class?.className || "N/A"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {req.student?.campus?.campusName || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800 block">
                          {req.teacherName || req.teacher?.teacherName || "GVCN"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-[240px] space-y-1">
                        <span className="font-semibold text-slate-900 line-clamp-2 block">
                          {req.examName}
                        </span>
                        {matchedExam ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-[10.5px] font-semibold">
                            <span>[{matchedExam.code}]</span>
                            <span>{isApproved ? "Đã đổ vào kỳ thi" : "Kỳ thi hệ thống"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-[#E2E8F0] text-[10.5px] font-medium">
                            Ngoài danh mục kỳ thi
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 block">
                          {req.achievementName}
                        </span>
                        <span className="text-[11px] text-[#00736E] font-semibold">
                          {categoryLabels[req.category] || req.category}
                          {req.level ? ` · ${levelLabels[req.level] || req.level}` : ""}
                          {" · "}
                          {req.type === "DONG_DOI" ? "Đồng đội" : "Cá nhân"}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-[190px] space-y-0.5">
                        {req.coachTeacher && (
                          <p className="text-[11px] font-medium text-slate-700 truncate">
                            GVBD: {req.coachTeacher}
                          </p>
                        )}
                        {req.evidenceUrl && (
                          <a
                            href={req.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#008B85] hover:underline font-semibold text-[11px]"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span>Xem minh chứng</span>
                          </a>
                        )}
                        {req.note ? (
                          <p className="text-[11px] text-slate-500 truncate" title={req.note}>
                            {req.note}
                          </p>
                        ) : !req.evidenceUrl && !req.coachTeacher ? (
                          <span className="text-[11px] text-slate-400">—</span>
                        ) : null}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Chờ duyệt</span>
                          </span>
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đã duyệt</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-[#E11D48] border border-rose-200"
                            title={req.reviewNote || "Từ chối"}
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Từ chối</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openReviewModal(req, "APPROVED")}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-semibold cursor-pointer"
                            >
                              <Check className="w-3 h-3 text-[#5EEAD4]" />
                              <span>Duyệt & đổ KQ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openReviewModal(req, "REJECTED")}
                              className="p-1.5 rounded-lg border border-rose-200 text-[#E11D48] hover:bg-rose-50 cursor-pointer"
                              title="Từ chối"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-end gap-1">
                            {isApproved && matchedExam?.id && onOpenExamGrid && (
                              <button
                                type="button"
                                onClick={() => onOpenExamGrid(matchedExam.id)}
                                className="px-2 py-0.5 rounded-md bg-[#F0FDFA] hover:bg-[#003B3A] text-[#00736E] hover:text-white border border-[#CCFBF1] hover:border-[#003B3A] text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Mở bảng kết quả của kỳ thi này"
                              >
                                Mở bảng kết quả
                              </button>
                            )}
                            <span className="text-[11px] text-slate-400">
                              {req.reviewedBy || "Đã xử lý"}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Result Pouring Modal */}
      {reviewDialog.isOpen && reviewDialog.request && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-xl w-full overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold">
                  {reviewDialog.status === "APPROVED"
                    ? "Xét duyệt & Đổ kết quả thành tích học sinh"
                    : "Từ chối đề xuất bổ sung thành tích"}
                </h3>
                <p className="text-[11px] text-teal-100/90 mt-0.5">
                  {reviewDialog.status === "APPROVED"
                    ? "Kiểm tra, chuẩn hóa thông tin trước khi đổ vào bảng kết quả kỳ thi & Hồ sơ học sinh"
                    : "Gửi phản hồi rõ lý do để GVCN kiểm tra hoặc bổ sung lại minh chứng"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                className="p-1 rounded-lg text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto">
              {/* Student & Submitter Summary */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 tabular-nums">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Học sinh được đề xuất:</span>
                  <strong className="text-slate-900">
                    {reviewDialog.request.student?.studentName} (
                    {reviewDialog.request.student?.studentCode}) · Lớp{" "}
                    {reviewDialog.request.student?.class?.className}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">GVCN đề xuất:</span>
                  <span className="font-semibold text-slate-700">
                    {reviewDialog.request.teacherName || "GVCN"} ·{" "}
                    {new Date(reviewDialog.request.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                {reviewDialog.request.evidenceUrl && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E2E8F0]">
                    <span className="text-slate-500">Minh chứng đính kèm:</span>
                    <a
                      href={reviewDialog.request.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#008B85] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở xem minh chứng</span>
                    </a>
                  </div>
                )}
                {reviewDialog.request.note && (
                  <div className="pt-1 text-slate-600">
                    <span className="text-slate-500">Ghi chú GVCN: </span>
                    <span>{reviewDialog.request.note}</span>
                  </div>
                )}
              </div>

              {reviewDialog.status === "APPROVED" && (
                <div className="space-y-3.5">
                  {/* Target Exam Mapping */}
                  <div className="p-3.5 rounded-xl bg-[#F0FDFA]/60 border border-[#CCFBF1] space-y-2.5">
                    <div>
                      <label className="block font-semibold text-[#003B3A] mb-1">
                        Đổ kết quả vào Kỳ thi hệ thống
                      </label>
                      <select
                        value={reviewDialog.targetExamId}
                        onChange={(e) => {
                          const nextId = e.target.value
                          const found = dialogExamsForRequestYear.find((ex) => ex.id === nextId)
                          setReviewDialog((p) => ({
                            ...p,
                            targetExamId: nextId,
                            examName:
                              nextId === "__EXTERNAL__"
                                ? p.request?.examName || p.examName
                                : found?.name || p.examName,
                          }))
                        }}
                        className="w-full border border-[#99F6E4] rounded-xl px-3 py-2 bg-white focus:border-[#00A19A] outline-none font-semibold text-[#003B3A]"
                      >
                        <option value="__EXTERNAL__">
                          [Ngoài danh mục] Ghi nhận thành tích độc lập (không gắn kỳ thi hệ thống)
                        </option>
                        {dialogExamsForRequestYear.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            [{ex.code}] {ex.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {reviewDialog.targetExamId === "__EXTERNAL__" ? (
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Tên cuộc thi / sự kiện hiển thị trên Hồ sơ học sinh
                        </label>
                        <input
                          type="text"
                          value={reviewDialog.examName}
                          onChange={(e) =>
                            setReviewDialog((p) => ({ ...p, examName: e.target.value }))
                          }
                          placeholder="Nhập tên cuộc thi..."
                          className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 bg-white focus:border-[#00A19A] outline-none font-medium text-slate-800"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          Kết quả sẽ được cập nhật trực tiếp lên Thành tích lớp GVCN và Hồ sơ học sinh.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#00736E] font-medium">
                        Tự động ghi danh học sinh vào kỳ thi, đổ kết quả vào tab Nhập kết quả, đồng thời cập nhật ngay lên Thành tích HS (GVCN) và Hồ sơ học sinh.
                      </p>
                    )}
                  </div>

                  {/* Award Standardization Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Loại thành tích
                      </label>
                      {achievementCategories.length > 0 ? (
                        <select
                          value={reviewDialog.category}
                          onChange={(e) => {
                            const nextCat = e.target.value
                            const catObj = achievementCategories.find(
                              (c: any) => c.code === nextCat
                            )
                            const lvls = catObj
                              ? achievementLevels.filter((l: any) => l.categoryId === catObj.id)
                              : []
                            setReviewDialog((p) => ({
                              ...p,
                              category: nextCat,
                              level: lvls[0]?.code || "",
                            }))
                          }}
                          className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-semibold text-slate-800"
                        >
                          {!achievementCategories.some(
                            (c: any) => c.code === reviewDialog.category
                          ) &&
                            reviewDialog.category && (
                              <option value={reviewDialog.category}>
                                {categoryLabels[reviewDialog.category] || reviewDialog.category}
                              </option>
                            )}
                          {achievementCategories.map((c: any) => (
                            <option key={c.id} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={reviewDialog.category}
                          onChange={(e) =>
                            setReviewDialog((p) => ({ ...p, category: e.target.value }))
                          }
                          className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 bg-[#F8FAFC] outline-none font-semibold text-slate-800"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Mức giải / Hạng giải
                      </label>
                      {dialogAvailableLevels.length > 0 ? (
                        <select
                          value={reviewDialog.level}
                          onChange={(e) => {
                            const nextLvl = e.target.value
                            const lvlObj = dialogAvailableLevels.find(
                              (l: any) => l.code === nextLvl
                            )
                            setReviewDialog((p) => ({
                              ...p,
                              level: nextLvl,
                              achievementName: lvlObj?.name || p.achievementName,
                            }))
                          }}
                          className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-semibold text-slate-800"
                        >
                          <option value="">-- Không phân bậc / Mặc định --</option>
                          {reviewDialog.level &&
                            !dialogAvailableLevels.some(
                              (l: any) => l.code === reviewDialog.level
                            ) && (
                              <option value={reviewDialog.level}>
                                {levelLabels[reviewDialog.level] || reviewDialog.level}
                              </option>
                            )}
                          {dialogAvailableLevels.map((l: any) => (
                            <option key={l.id} value={l.code}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={reviewDialog.level}
                          onChange={(e) =>
                            setReviewDialog((p) => ({ ...p, level: e.target.value }))
                          }
                          placeholder="Mã mức giải (nếu có)..."
                          className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 bg-[#F8FAFC] outline-none font-medium text-slate-800"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tên danh hiệu / Giải thưởng ghi nhận
                      </label>
                      <input
                        type="text"
                        value={reviewDialog.achievementName}
                        onChange={(e) =>
                          setReviewDialog((p) => ({ ...p, achievementName: e.target.value }))
                        }
                        placeholder="Vd: Giải Ba, Huy chương Vàng..."
                        className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Hình thức tham gia
                      </label>
                      <select
                        value={reviewDialog.type}
                        onChange={(e) =>
                          setReviewDialog((p) => ({ ...p, type: e.target.value }))
                        }
                        className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-semibold text-slate-800"
                      >
                        <option value="CA_NHAN">Cá nhân</option>
                        <option value="DONG_DOI">Đồng đội / Tập thể</option>
                      </select>
                    </div>
                  </div>

                  {/* Coach Teacher */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Chọn GV bồi dưỡng trong trường
                      </label>
                      <select
                        value={reviewDialog.teacherId}
                        onChange={(e) => {
                          const tid = e.target.value
                          const tObj = teachers.find((t: any) => t.id === tid)
                          setReviewDialog((p) => ({
                            ...p,
                            teacherId: tid,
                            teacherName: tObj ? tObj.teacherName : p.teacherName,
                          }))
                        }}
                        className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-800"
                      >
                        <option value="">-- Nhập tay hoặc để trống --</option>
                        {teachers.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.teacherName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tên GV bồi dưỡng hiển thị
                      </label>
                      <input
                        type="text"
                        value={reviewDialog.teacherName}
                        onChange={(e) =>
                          setReviewDialog((p) => ({
                            ...p,
                            teacherId: "",
                            teacherName: e.target.value,
                          }))
                        }
                        placeholder="Tên giáo viên hướng dẫn (nếu có)..."
                        className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none font-medium text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {reviewDialog.status === "APPROVED"
                    ? "Ghi chú phản hồi cho GVCN (tùy chọn)"
                    : "Lý do từ chối (bắt buộc)"}
                </label>
                <textarea
                  rows={2}
                  value={reviewDialog.note}
                  onChange={(e) => setReviewDialog((p) => ({ ...p, note: e.target.value }))}
                  placeholder={
                    reviewDialog.status === "APPROVED"
                      ? "Nhập ghi chú xác nhận..."
                      : "Nhập lý do để GVCN chỉnh sửa hoặc bổ sung minh chứng..."
                  }
                  className="w-full border border-[#E2E8F0] rounded-xl p-2.5 text-xs focus:border-[#00A19A] outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={closeReviewModal}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-slate-600 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={
                    reviewDialog.submitting ||
                    (reviewDialog.status === "REJECTED" && !reviewDialog.note.trim()) ||
                    (reviewDialog.status === "APPROVED" &&
                      !reviewDialog.achievementName.trim())
                  }
                  onClick={handleExecuteReview}
                  className={`px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50 cursor-pointer ${
                    reviewDialog.status === "APPROVED"
                      ? "bg-[#003B3A] hover:bg-[#005250]"
                      : "bg-[#E11D48] hover:bg-rose-700"
                  }`}
                >
                  {reviewDialog.submitting
                    ? "Đang xử lý..."
                    : reviewDialog.status === "APPROVED"
                    ? "Phê duyệt, Đổ kết quả & Cập nhật Hồ sơ"
                    : "Xác nhận từ chối"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
