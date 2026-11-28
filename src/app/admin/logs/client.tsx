"use client"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Search, Filter, RefreshCw, Clock, User, Eye, X, Shield, Globe, Trash2, AlertTriangle, Calendar, Loader2, ClipboardList, BarChart3, FileText } from "lucide-react"
import { UsageStatsTab } from "./UsageStatsTab"
import {
  formatAuditLogSummary,
  formatAuditPrimitive,
  getAuditActionLabel,
  getAuditFieldLabel,
  getAuditTableLabel,
  safeParseAuditJson,
} from "@/lib/audit-format"

export function LogsClient({ initialTab = "logs", initialLogs, total, page, limit, search, selectedAction, selectedRole, actions, roles }: any) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<"logs" | "stats">(initialTab === "stats" ? "stats" : "logs")
  const [searchVal, setSearchVal] = useState(search)
  const [actionVal, setActionVal] = useState(selectedAction)
  const [roleVal, setRoleVal] = useState(selectedRole || "")
  const [detailsLog, setDetailsLog] = useState<any>(null)
  const [showCleanupModal, setShowCleanupModal] = useState(false)
  const [cleanupMode, setCleanupMode] = useState<"before_days" | "all">("before_days")
  const [cleanupDays, setCleanupDays] = useState<number>(30)
  const [previewTotal, setPreviewTotal] = useState<number>(0)
  const [previewBeforeCount, setPreviewBeforeCount] = useState<number>(0)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmChecked, setConfirmChecked] = useState(false)

  useEffect(() => {
    if (!showCleanupModal) return

    let active = true
    const fetchPreview = async () => {
      setIsLoadingPreview(true)
      try {
        const url = cleanupMode === "all" 
          ? "/api/admin/audit-logs" 
          : `/api/admin/audit-logs?days=${cleanupDays}`
        const res = await fetch(url)
        const data = await res.json()
        if (active) {
          setPreviewTotal(data.total || 0)
          setPreviewBeforeCount(cleanupMode === "all" ? (data.total || 0) : (data.beforeCount || 0))
        }
      } catch (err) {
        console.error("Lỗi khi tải thông tin xem trước:", err)
      } finally {
        if (active) setIsLoadingPreview(false)
      }
    }

    fetchPreview()
    return () => {
      active = false
    }
  }, [showCleanupModal, cleanupMode, cleanupDays])

  const handleDelete = async () => {
    if (cleanupMode === "all" && !confirmChecked) return
    
    setIsDeleting(true)
    try {
      const res = await fetch("/api/admin/audit-logs", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: cleanupMode,
          days: cleanupMode === "before_days" ? cleanupDays : undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message || "Đã dọn dẹp nhật ký hệ thống thành công")
        setShowCleanupModal(false)
        setConfirmChecked(false)
        router.refresh()
      } else {
        toast.error(data.error || "Có lỗi xảy ra khi dọn dẹp nhật ký")
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối: " + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFilter = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (searchVal) params.set("search", searchVal)
    else params.delete("search")
    
    if (actionVal) params.set("action", actionVal)
    else params.delete("action")

    if (roleVal) params.set("role", roleVal)
    else params.delete("role")

    params.set("page", "1")
    router.push(`${pathname}?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(newPage))
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleReset = () => {
    setSearchVal("")
    setActionVal("")
    setRoleVal("")
    router.push(pathname)
  }

  const renderStructuredPayload = (val: string | null) => {
    if (!val) return <p className="text-xs text-slate-400 italic">Không có dữ liệu</p>

    const parsed = safeParseAuditJson(val)
    if (!parsed || typeof parsed !== "object") {
      return (
        <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-xs text-slate-700 whitespace-pre-wrap break-words">
          {val}
        </div>
      )
    }

    const itemsArray = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as Record<string, unknown>).items)
        ? ((parsed as Record<string, unknown>).items as unknown[])
        : null

    const scalarEntries = !Array.isArray(parsed)
      ? Object.entries(parsed as Record<string, unknown>).filter(([k, v]) => k !== "items" && v !== null && v !== undefined && v !== "")
      : []

    return (
      <div className="space-y-3">
        {scalarEntries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
            {scalarEntries.map(([k, v]) => (
              <div key={k} className="text-xs">
                <span className="text-slate-500 font-medium">{getAuditFieldLabel(k)}: </span>
                <span className="text-slate-800 font-semibold break-words">
                  {formatAuditPrimitive(k, v)}
                </span>
              </div>
            ))}
          </div>
        )}

        {itemsArray && itemsArray.length > 0 && (
          <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="bg-[#F8FAFC] px-3 py-2 border-b border-[#E2E8F0] text-[11px] font-semibold text-[#003B3A]">
              Danh sách chi tiết ({itemsArray.length} mục)
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-[#E2E8F0] bg-white">
              {itemsArray.map((item, idx) => {
                if (!item || typeof item !== "object") {
                  return (
                    <div key={idx} className="px-3 py-2 text-xs text-slate-700 font-mono">
                      {String(item)}
                    </div>
                  )
                }
                const entries = Object.entries(item as Record<string, unknown>).filter(
                  ([, v]) => v !== null && v !== undefined && v !== ""
                )
                return (
                  <div key={idx} className="px-3 py-2.5 text-xs flex flex-wrap gap-x-4 gap-y-1">
                    <span className="text-[11px] font-bold text-[#00736E] tabular-nums">#{idx + 1}</span>
                    {entries.map(([k, v]) => (
                      <span key={k} className="text-slate-700">
                        <span className="text-slate-400">{getAuditFieldLabel(k)}:</span>{" "}
                        <span className="font-semibold text-slate-800">{formatAuditPrimitive(k, v)}</span>
                      </span>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <details className="group">
          <summary className="text-[11px] font-semibold text-[#00736E] hover:text-[#003B3A] cursor-pointer select-none">
            Xem dữ liệu JSON gốc
          </summary>
          <pre className="mt-2 bg-slate-50 p-3 rounded-lg border border-[#E2E8F0] font-mono text-[11px] text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        </details>
      </div>
    )
  }

  const handleTabChange = (nextTab: "logs" | "stats") => {
    setActiveTab(nextTab)
    const params = new URLSearchParams(searchParams.toString())
    if (nextTab === "stats") {
      params.set("tab", "stats")
    } else {
      params.delete("tab")
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Masthead Header - Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs border-l-4 border-l-[#003B3A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#003B3A] tracking-tight">
              Nhật ký Hệ thống (Audit Logs)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Theo dõi hoạt động đăng nhập, thay đổi dữ liệu và thống kê mức độ sử dụng của tài khoản nhân sự và giáo viên.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] w-fit">
            <button
              type="button"
              onClick={() => handleTabChange("logs")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "logs"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#003B3A] hover:bg-white"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Nhật ký hoạt động
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("stats")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "stats"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#003B3A] hover:bg-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Thống kê sử dụng
            </button>
          </div>
        </div>
      </div>

      {activeTab === "stats" ? (
        <UsageStatsTab roles={roles} />
      ) : (
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
      {/* Filters bar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo Email, Họ tên, Bảng dữ liệu, Hoạt động..." 
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFilter()}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none text-sm font-semibold transition-all bg-white"
          />
        </div>
        <div className="w-full lg:w-48">
          <select 
            value={roleVal} 
            onChange={e => setRoleVal(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none bg-white transition-all font-bold cursor-pointer"
          >
            <option value="">-- Nhóm quyền --</option>
            {roles.map((r: any) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="w-full lg:w-48">
          <select 
            value={actionVal} 
            onChange={e => setActionVal(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none bg-white transition-all font-bold cursor-pointer"
          >
            <option value="">-- Tất cả Hoạt động --</option>
            {actions.map((act: string) => {
              const label = getAuditActionLabel(act)
              return (
                <option key={act} value={act}>
                  {label !== act ? `${label} (${act})` : act}
                </option>
              )
            })}
          </select>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <button 
            onClick={handleFilter}
            className="px-5 py-2.5 bg-[#48BFE3] hover:bg-[#009186] text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Filter className="w-4 h-4" /> Lọc
          </button>
          <button 
            onClick={handleReset}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all flex items-center justify-center cursor-pointer"
            title="Xóa bộ lọc"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={() => {
              setCleanupMode("before_days")
              setCleanupDays(30)
              setShowCleanupModal(true)
            }}
            className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer whitespace-nowrap ml-auto lg:ml-0"
            title="Dọn dẹp nhật ký hệ thống"
          >
            <Trash2 className="w-4 h-4" /> Dọn dẹp
          </button>
        </div>
      </div>

      {/* Table - Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 font-semibold text-teal-100">Thời gian</th>
                <th className="py-3 px-3 font-semibold text-white">Người thực hiện</th>
                <th className="py-3 px-3 font-semibold text-teal-100">Nhóm quyền</th>
                <th className="py-3 px-3 font-semibold text-white">Thao tác</th>
                <th className="py-3 px-3 font-semibold text-[#5EEAD4]">Thông tin chi tiết</th>
                <th className="py-3 px-3 font-semibold text-teal-100">Địa chỉ IP</th>
                <th className="py-3 px-3 text-center font-semibold text-white">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {initialLogs.map((log: any) => {
                const isFailed = log.action.includes("FAILED")
                const isSuccess = log.action.includes("SUCCESS")
                const isDelete = log.action.includes("DELETE")
                const summary = formatAuditLogSummary(log)

                return (
                  <tr
                    key={log.id}
                    className="transition-colors align-middle hover:bg-[#F8FAFC]"
                  >
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-medium align-middle">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {new Date(log.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-middle">
                      <div className="font-semibold text-slate-800 leading-snug">
                        {log.userFullName}
                      </div>
                      <div className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]" title={log.userEmail}>
                          {log.userEmail}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap align-middle">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                        <Shield className="w-3.5 h-3.5 text-[#008B85] shrink-0" />
                        {log.roleName}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-middle max-w-[220px]">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold leading-tight ${
                            isFailed
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : isSuccess
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isDelete
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-[#F0FDFA] text-[#00736E] border border-[#99F6E4]"
                          }`}
                        >
                          {summary.actionLabel}
                        </span>
                        {summary.actionLabel !== log.action && (
                          <p className="text-[10px] font-mono text-slate-400 break-all leading-tight pl-1">
                            {log.action}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-middle min-w-[240px] max-w-[380px]">
                      <div className="space-y-1">
                        <p
                          className={`font-medium leading-snug break-words ${
                            isFailed ? "text-rose-700 font-semibold" : "text-slate-800"
                          }`}
                        >
                          {summary.title}
                        </p>
                        {summary.detailLines.length > 0 && (
                          <ul className="space-y-0.5 text-[11px] text-slate-600 pl-3 list-disc">
                            {summary.detailLines.map((line, idx) => (
                              <li key={idx} className="leading-snug break-words">
                                {line}
                              </li>
                            ))}
                          </ul>
                        )}
                        {summary.subtitle && (
                          <p className="text-[11px] text-slate-500 leading-snug break-words">
                            {summary.subtitle}
                          </p>
                        )}
                        {summary.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {summary.badges.map((b, i) => (
                              <span
                                key={`${b.label}-${i}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-slate-600"
                              >
                                <span className="text-slate-400">{b.label}:</span>
                                <span className="font-semibold text-slate-700">{b.value}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap align-middle">
                      <span className="inline-flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {log.ipAddress || "127.0.0.1"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap align-middle">
                      <button
                        type="button"
                        onClick={() => setDetailsLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#003B3A] bg-[#F0FDFA] hover:bg-[#CCFBF1] border border-[#99F6E4] transition-colors cursor-pointer"
                        title="Xem đầy đủ thông tin chi tiết"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Xem
                      </button>
                    </td>
                  </tr>
                )
              })}
              {initialLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-medium">
                    Không tìm thấy hoạt động nào được ghi nhận.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium">
            Hiển thị bản ghi {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} trên tổng số {total}
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
            >
              Trước
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pNum = idx + 1
              return (
                <button
                  key={pNum}
                  onClick={() => handlePageChange(pNum)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    page === pNum 
                      ? "bg-[#48BFE3] text-white" 
                      : "border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                  }`}
                >
                  {pNum}
                </button>
              )
            })}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* Cleanup Modal */}
      {showCleanupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" /> Dọn dẹp nhật ký hệ thống
              </h3>
              <button 
                onClick={() => setShowCleanupModal(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                disabled={isDeleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Auto Cleanup Info */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3 text-xs text-emerald-800 font-semibold leading-relaxed">
                <Clock className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900 mb-0.5">Tự động dọn dẹp hàng ngày</p>
                  <p className="font-medium text-emerald-700">Hệ thống đã cấu hình tự động xóa nhật ký cũ lúc <strong className="text-emerald-900 font-black">19:00 hàng ngày</strong> (chỉ lưu trữ 30 ngày gần nhất) để tối ưu bộ nhớ.</p>
                </div>
              </div>

              {/* Manual Cleanup Options */}
              <div className="space-y-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Xóa thủ công ngay lập tức</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCleanupMode("before_days");
                      setCleanupDays(7);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      cleanupMode === "before_days" && cleanupDays === 7
                        ? "border-[#48BFE3] bg-[#48BFE3]/5 text-[#48BFE3] font-bold"
                        : "border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                    }`}
                  >
                    Hơn 7 ngày trước
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCleanupMode("before_days");
                      setCleanupDays(30);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      cleanupMode === "before_days" && cleanupDays === 30
                        ? "border-[#48BFE3] bg-[#48BFE3]/5 text-[#48BFE3] font-bold"
                        : "border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                    }`}
                  >
                    Hơn 30 ngày trước
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCleanupMode("before_days");
                      setCleanupDays(90);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      cleanupMode === "before_days" && cleanupDays === 90
                        ? "border-[#48BFE3] bg-[#48BFE3]/5 text-[#48BFE3] font-bold"
                        : "border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                    }`}
                  >
                    Hơn 90 ngày trước
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCleanupMode("all");
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      cleanupMode === "all"
                        ? "border-rose-500 bg-rose-50/50 text-rose-600 font-bold"
                        : "border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                    }`}
                  >
                    Xóa toàn bộ
                  </button>
                </div>
              </div>

              {/* Dynamic Preview */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-semibold space-y-2 text-slate-700">
                {isLoadingPreview ? (
                  <div className="flex items-center gap-2 justify-center py-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-[#48BFE3]" />
                    <span>Đang tính toán số lượng bản ghi...</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Tổng số bản ghi hiện tại:</span>
                      <span className="font-bold text-slate-800">{previewTotal.toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                      <span className="text-slate-500 font-medium">Dự kiến sẽ xóa:</span>
                      <span className={`font-black ${previewBeforeCount > 0 ? "text-rose-600" : "text-slate-800"}`}>
                        {previewBeforeCount.toLocaleString('vi-VN')} bản ghi
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Warning and Checkbox for 'All' */}
              {cleanupMode === "all" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-250">
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 flex gap-2.5 text-[11px] text-rose-800 font-semibold leading-relaxed">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-900 mb-0.5">CẢNH BÁO QUAN TRỌNG</p>
                      <p className="font-medium text-rose-700">Hành động này sẽ xóa sạch hoàn toàn mọi thông tin hoạt động trong hệ thống. Dữ liệu sau khi xóa sẽ KHÔNG THỂ KHÔI PHỤC.</p>
                    </div>
                  </div>
                  <label className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-150 cursor-pointer select-none text-[11px] font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={confirmChecked}
                      onChange={(e) => setConfirmChecked(e.target.checked)}
                      className="mt-0.5 accent-rose-500 w-3.5 h-3.5"
                    />
                    <span>Tôi hiểu và đồng ý xóa vĩnh viễn toàn bộ nhật ký hệ thống.</span>
                  </label>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
              <button 
                onClick={() => setShowCleanupModal(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs"
                disabled={isDeleting}
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleDelete}
                className={`px-5 py-2 font-bold rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                  cleanupMode === "all"
                    ? "bg-rose-600 hover:bg-rose-750 text-white disabled:opacity-40"
                    : "bg-[#48BFE3] hover:bg-[#009186] text-white disabled:opacity-40"
                }`}
                disabled={isDeleting || (cleanupMode === "all" && !confirmChecked) || (cleanupMode === "before_days" && previewBeforeCount === 0)}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailsLog && (() => {
        const modalSummary = formatAuditLogSummary(detailsLog)
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-[#E2E8F0] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 bg-[#003B3A] text-white shrink-0">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#5EEAD4]" />
                  Thông tin chi tiết nhật ký hoạt động
                </h3>
                <button
                  type="button"
                  onClick={() => setDetailsLog(null)}
                  className="p-1.5 text-teal-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto tabular-nums">
                {/* Summary highlight */}
                <div className="bg-[#F0FDFA] border border-[#99F6E4] rounded-xl p-4 space-y-1.5">
                  <p className="text-[11px] font-semibold text-[#00736E]">Tóm tắt thao tác</p>
                  <p className="text-sm font-bold text-[#003B3A] leading-snug">{modalSummary.title}</p>
                  {modalSummary.detailLines.length > 0 && (
                    <ul className="space-y-0.5 text-xs text-slate-700 pl-4 list-disc">
                      {modalSummary.detailLines.map((line, idx) => (
                        <li key={idx} className="leading-snug break-words">{line}</li>
                      ))}
                    </ul>
                  )}
                  {modalSummary.subtitle && (
                    <p className="text-xs text-slate-600">{modalSummary.subtitle}</p>
                  )}
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-xs">
                  <div>
                    <p className="text-[11px] text-slate-500">Thời gian</p>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {new Date(detailsLog.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Người thực hiện</p>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {detailsLog.userFullName} ({detailsLog.userEmail})
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Nhóm quyền</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{detailsLog.roleName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Địa chỉ IP</p>
                    <p className="font-mono font-semibold text-slate-800 mt-0.5">
                      {detailsLog.ipAddress || "127.0.0.1"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Thao tác</p>
                    <p className="font-semibold text-[#003B3A] mt-0.5">{modalSummary.actionLabel}</p>
                    {modalSummary.actionLabel !== detailsLog.action && (
                      <p className="font-mono text-[10px] text-slate-400 break-all mt-0.5">
                        {detailsLog.action}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Bảng dữ liệu</p>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {getAuditTableLabel(detailsLog.targetTable)}{" "}
                      {detailsLog.targetTable && (
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({detailsLog.targetTable})
                        </span>
                      )}
                    </p>
                  </div>
                  {detailsLog.targetId && (
                    <div className="sm:col-span-2">
                      <p className="text-[11px] text-slate-500">Mã đối tượng</p>
                      <p className="font-mono text-[11px] text-slate-700 bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 mt-1 break-all">
                        {detailsLog.targetId}
                      </p>
                    </div>
                  )}
                </div>

                {detailsLog.oldValues && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#003B3A]">Dữ liệu cũ (Trước thay đổi / Đã xóa)</p>
                    {renderStructuredPayload(detailsLog.oldValues)}
                  </div>
                )}

                {detailsLog.newValues && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#003B3A]">Dữ liệu mới / Thông tin ghi nhận</p>
                    {renderStructuredPayload(detailsLog.newValues)}
                  </div>
                )}

                {!detailsLog.oldValues && !detailsLog.newValues && (
                  <div className="text-xs text-slate-500 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                    Bản ghi nhật ký này không lưu kèm dữ liệu thay đổi chi tiết (oldValues / newValues).
                  </div>
                )}
              </div>

              <div className="px-6 py-3.5 bg-[#F8FAFC] flex justify-end gap-2 border-t border-[#E2E8F0] shrink-0">
                <button
                  type="button"
                  onClick={() => setDetailsLog(null)}
                  className="px-5 py-2 bg-[#003B3A] hover:bg-[#005755] text-white font-semibold rounded-xl transition-colors cursor-pointer text-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      </div>
      )}
    </div>
  )
}
