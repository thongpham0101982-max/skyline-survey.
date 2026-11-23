"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import * as XLSX from "xlsx"
import {
  Plus,
  Search,
  Download,
  RefreshCw,
  FolderOpen,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react"
import {
  PRESCHOOL_WORKFLOW_STATUSES,
  PRESCHOOL_WORKFLOW_STATUS_META,
  PreschoolWorkflowStatus,
} from "@/lib/preschool-workflow"
import { PreschoolIntakeModal } from "./PreschoolIntakeModal"
import { PreschoolDossierDrawer } from "./PreschoolDossierDrawer"

export default function PreschoolWorkflowClient() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({
    total: 0,
    statusCounts: {},
    approvedPass: 0,
    approvedFail: 0,
    passRate: 0,
  })
  const [meta, setMeta] = useState<any>({
    campuses: [],
    periods: [],
    staffUsers: [],
    docTt02PendingRules: [],
    viewer: null,
  })
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [campus, setCampus] = useState("ALL")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [system, setSystem] = useState("ALL")
  const [intakeMode, setIntakeMode] = useState("ALL")
  const [status, setStatus] = useState("ALL")
  const [search, setSearch] = useState("")

  // Modals / Drawers
  const [intakeOpen, setIntakeOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [showDocRules, setShowDocRules] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (campus !== "ALL") qs.set("campus", campus)
      if (fromDate) qs.set("fromDate", fromDate)
      if (toDate) qs.set("toDate", toDate)
      if (system !== "ALL") qs.set("system", system)
      if (intakeMode !== "ALL") qs.set("intakeMode", intakeMode)
      if (status !== "ALL") qs.set("status", status)
      if (search.trim()) qs.set("search", search.trim())

      const res = await fetch(`/api/preschool-workflow?${qs.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Không thể tải danh sách khảo sát Mầm non.")
      setItems(data.items || [])
      setSummary(data.summary || { total: 0, statusCounts: {}, approvedPass: 0, approvedFail: 0, passRate: 0 })
      setMeta(data.meta || { campuses: [], periods: [], staffUsers: [], docTt02PendingRules: [] })
    } catch (err: any) {
      setError(err?.message || "Lỗi kết nối máy chủ.")
    } finally {
      setLoading(false)
    }
  }, [campus, fromDate, toDate, system, intakeMode, status, search])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-open dossier from deep link (?studentId=...)
  useEffect(() => {
    const sid = searchParams?.get("studentId")
    if (sid) {
      setSelectedStudentId(sid)
    }
  }, [searchParams])

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Executive Summary by Status & Outcome
    const summaryRows = [
      { "Chỉ tiêu": "Tổng hồ sơ khảo sát Mầm non", "Số lượng": summary.total, "Tỷ lệ": "100%" },
      ...PRESCHOOL_WORKFLOW_STATUSES.map((st) => {
        const cnt = summary.statusCounts?.[st] || 0
        const pct = summary.total > 0 ? `${Math.round((cnt / summary.total) * 1000) / 10}%` : "0%"
        return {
          "Chỉ tiêu": `Tiến độ: ${PRESCHOOL_WORKFLOW_STATUS_META[st].label}`,
          "Số lượng": cnt,
          "Tỷ lệ": pct,
        }
      }),
      { "Chỉ tiêu": "Đã phê duyệt Đạt (B10)", "Số lượng": summary.approvedPass, "Tỷ lệ": `${summary.passRate}%` },
      { "Chỉ tiêu": "Đã phê duyệt Chưa đạt (B10)", "Số lượng": summary.approvedFail, "Tỷ lệ": summary.approvedPass + summary.approvedFail > 0 ? `${Math.round((summary.approvedFail / (summary.approvedPass + summary.approvedFail)) * 1000) / 10}%` : "0%" },
    ]
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
    XLSX.utils.book_append_sheet(wb, wsSummary, "TongHop_KPI")

    // Sheet 2: Detailed Dossier List
    const detailRows = items.map((it, idx) => ({
      STT: idx + 1,
      "Mã hồ sơ": it.studentCode,
      "Họ tên trẻ": it.fullName,
      "Ngày sinh": it.dateOfBirth ? new Date(it.dateOfBirth).toLocaleDateString("vi-VN") : "",
      "Cơ sở": it.campus || "",
      "Nhóm tuổi": it.grade || "",
      "Hệ đăng ký": it.surveySystem || "",
      "Lịch hẹn": it.appointmentAt ? new Date(it.appointmentAt).toLocaleString("vi-VN") : "",
      "Hình thức": it.intakeMode === "HOC_TRAI_NGHIEM" ? "Học trải nghiệm" : "Khảo sát mới",
      "Biểu mẫu": it.suggestedFormCode || "",
      "Số lần KS": it.roundCount || 1,
      "Người phụ trách": it.ownerUserName || "",
      "Tiến độ": PRESCHOOL_WORKFLOW_STATUS_META[it.workflowStatus as PreschoolWorkflowStatus]?.label || it.workflowStatus,
      "Kết quả": it.approvedOutcome === "DAT" ? "Đạt" : it.approvedOutcome === "CHUA_DAT" ? "Chưa đạt" : "Chưa phê duyệt",
    }))
    const wsDetail = XLSX.utils.json_to_sheet(detailRows)
    XLSX.utils.book_append_sheet(wb, wsDetail, "DanhSach_HoSo")

    const dateTag = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `Bao_Cao_Khao_Sat_Mam_Non_${dateTag}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 space-y-5">
      {/* Masthead */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#00736E]">
            Phân hệ Khảo sát đầu vào · Quy trình Mầm non 2026 (B1–B13)
          </p>
          <h1 className="text-xl font-bold text-[#003B3A] mt-0.5">
            Điều phối Khảo sát Mầm non
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Quản lý trọn vòng đời từ tiếp nhận lịch (B1–B3), Y tế (B4A), đánh giá BM.KTĐBCL (B5/B4B), sàng lọc tâm lý BM.KTĐBCL.09 & hẹn trải nghiệm (B7–B8), phê duyệt B10 đến xuất thư BM.KTĐBCL.17/04 & lưu hồ sơ (B11–B13).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowDocRules((v) => !v)}
            className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-[#00A19A]" />
            Lưu ý DOC.TT.02
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#003B3A] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#00A19A]" />
            Xuất Excel tổng hợp
          </button>
          <button
            type="button"
            onClick={() => setIntakeOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tiếp nhận trẻ mới (B1–B3)
          </button>
        </div>
      </div>

      {/* DOC.TT.02 Transparency Banner */}
      {showDocRules && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 text-xs text-amber-950 space-y-1.5">
          <div className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Quy tắc xét tuyển theo DOC.TT.02 đang ở chế độ người có thẩm quyền kết luận trên SSM
          </div>
          <p className="text-amber-900">
            Do tài liệu DOC.TT.02 bản phê duyệt chưa được nạp vào hệ thống, Nhóm trưởng Mầm non (B6/B9A) và Giám đốc Điều hành Cơ sở (B10) trực tiếp rà soát và kết luận Đạt / Chưa đạt. Các quy tắc chưa tự động hóa:
          </p>
          <ul className="list-disc pl-5 space-y-0.5 text-amber-900">
            {(meta.docTt02PendingRules || []).map((rule: string, idx: number) => (
              <li key={idx}>{rule}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Unified Executive Ledger Strip (8 Statuses + Pass Rate) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3 tabular-nums">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#F1F5F9]">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-slate-600">
              Tổng hồ sơ: <strong className="text-[#003B3A] text-sm">{summary.total}</strong>
            </span>
            <span className="text-emerald-700">
              Đã duyệt Đạt: <strong className="text-sm">{summary.approvedPass}</strong> ({summary.passRate}%)
            </span>
            <span className="text-rose-700">
              Đã duyệt Chưa đạt: <strong className="text-sm">{summary.approvedFail}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="text-xs font-semibold text-[#00736E] hover:text-[#003B3A] flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatus("ALL")}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              status === "ALL"
                ? "bg-[#003B3A] text-white border-[#003B3A]"
                : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] hover:bg-slate-100"
            }`}
          >
            Tất cả ({summary.total})
          </button>
          {PRESCHOOL_WORKFLOW_STATUSES.map((st) => {
            const count = summary.statusCounts?.[st] || 0
            const active = status === st
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatus(active ? "ALL" : st)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? "bg-[#00A19A] text-white border-[#00A19A]"
                    : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                }`}
              >
                {PRESCHOOL_WORKFLOW_STATUS_META[st].shortLabel} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm họ tên trẻ, mã hồ sơ, người phụ trách..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#00A19A]"
          />
        </div>
        <select
          value={campus}
          onChange={(e) => setCampus(e.target.value)}
          className="rounded-xl border border-[#E2E8F0] px-3 py-2 bg-white focus:outline-none focus:border-[#00A19A]"
        >
          <option value="ALL">Tất cả cơ sở</option>
          {(meta.campuses || []).map((c: any) => (
            <option key={c.id} value={c.name}>
              {c.code ? `${c.code} — ${c.name}` : c.name}
            </option>
          ))}
        </select>
        <select
          value={system}
          onChange={(e) => setSystem(e.target.value)}
          className="rounded-xl border border-[#E2E8F0] px-3 py-2 bg-white focus:outline-none focus:border-[#00A19A]"
        >
          <option value="ALL">Tất cả hệ</option>
          <option value="HE_S">Hệ S</option>
          <option value="HE_GLOBAL">Hệ Global</option>
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          title="Từ ngày"
          className="rounded-xl border border-[#E2E8F0] px-3 py-2 tabular-nums focus:outline-none focus:border-[#00A19A]"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          title="Đến ngày"
          className="rounded-xl border border-[#E2E8F0] px-3 py-2 tabular-nums focus:outline-none focus:border-[#00A19A]"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Sky-Line Academic Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 text-white">Họ tên trẻ</th>
                <th className="py-3 px-3 text-teal-100">Cơ sở</th>
                <th className="py-3 px-3 text-teal-100">Nhóm tuổi</th>
                <th className="py-3 px-3 text-teal-100">Hệ</th>
                <th className="py-3 px-3 text-teal-100">Lịch hẹn</th>
                <th className="py-3 px-3 text-teal-100">Hình thức</th>
                <th className="py-3 px-3 text-teal-100">Người phụ trách</th>
                <th className="py-3 px-3 text-[#5EEAD4]">Tiến độ</th>
                <th className="py-3 px-3 text-[#5EEAD4]">Kết quả</th>
                <th className="py-3 px-3 text-white text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#00A19A]" />
                      Đang tải dữ liệu khảo sát Mầm non...
                    </span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    Chưa có hồ sơ trẻ nào khớp bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const stMeta =
                    PRESCHOOL_WORKFLOW_STATUS_META[item.workflowStatus as PreschoolWorkflowStatus] ||
                    PRESCHOOL_WORKFLOW_STATUS_META.DA_HEN
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedStudentId(item.id)}
                      className="transition-colors align-middle hover:bg-[#F8FAFC] cursor-pointer"
                    >
                      <td className="py-3 px-3 align-middle">
                        <div className="font-semibold text-slate-900">{item.fullName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{item.studentCode}</span>
                          {item.suggestedFormCode && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                              {item.suggestedFormCode}
                            </span>
                          )}
                          {item.roundCount > 1 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                              {item.roundCount} lần
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-700">{item.campus || "—"}</td>
                      <td className="py-3 px-3 align-middle text-slate-700">{item.grade || "—"}</td>
                      <td className="py-3 px-3 align-middle">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            item.systemCode === "HE_GLOBAL"
                              ? "bg-teal-50 text-[#00736E] border-teal-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {item.surveySystem}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-700 whitespace-nowrap">
                        {item.appointmentAt ? new Date(item.appointmentAt).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-700 whitespace-nowrap">
                        {item.intakeMode === "HOC_TRAI_NGHIEM" ? "Học trải nghiệm" : "Khảo sát mới"}
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-700">{item.ownerUserName || "—"}</td>
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${stMeta.badgeClass}`}>
                          {stMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        {item.approvedOutcome === "DAT" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đạt
                          </span>
                        ) : item.approvedOutcome === "CHUA_DAT" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" />
                            Chưa đạt
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedStudentId(item.id)
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#005854] text-white text-[11px] font-semibold cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          Xử lý hồ sơ
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Intake Modal */}
      <PreschoolIntakeModal
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        onCreated={(newId) => {
          loadData()
          setSelectedStudentId(newId)
        }}
        campuses={meta.campuses || []}
        periods={meta.periods || []}
        staffUsers={meta.staffUsers || []}
      />

      {/* Dossier Detail Drawer */}
      <PreschoolDossierDrawer
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        onUpdated={loadData}
        staffUsers={meta.staffUsers || []}
      />
    </div>
  )
}
