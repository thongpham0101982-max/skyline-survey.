"use client"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Search, Filter, RefreshCw, Clock, User, Eye, X, Shield, Globe, Trash2, AlertTriangle, Calendar, Loader2 } from "lucide-react"

export function LogsClient({ initialLogs, total, page, limit, search, selectedAction, selectedRole, actions, roles }: any) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

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

  const formatJSON = (val: string | null) => {
    if (!val) return "—"
    try {
      const parsed = JSON.parse(val)
      return <pre className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-xs text-slate-700 max-h-40 overflow-y-auto whitespace-pre-wrap">{JSON.stringify(parsed, null, 2)}</pre>
    } catch {
      return <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-xs text-slate-700 max-h-40 overflow-y-auto whitespace-pre-wrap">{val}</div>
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
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
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10 outline-none text-sm font-semibold transition-all bg-white"
          />
        </div>
        <div className="w-full lg:w-48">
          <select 
            value={roleVal} 
            onChange={e => setRoleVal(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10 outline-none bg-white transition-all font-bold cursor-pointer"
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
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10 outline-none bg-white transition-all font-bold cursor-pointer"
          >
            <option value="">-- Tất cả Hoạt động --</option>
            {actions.map((act: string) => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <button 
            onClick={handleFilter}
            className="px-5 py-2.5 bg-[#00A99D] hover:bg-[#009186] text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer whitespace-nowrap"
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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-150">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
              <th className="px-6 py-4 font-black">Thời gian</th>
              <th className="px-6 py-4 font-black">Tài khoản</th>
              <th className="px-6 py-4 font-black">Họ và tên</th>
              <th className="px-6 py-4 font-black">Nhóm quyền</th>
              <th className="px-6 py-4 font-black">Thao tác</th>
              <th className="px-6 py-4 font-black">Thông tin chi tiết</th>
              <th className="px-6 py-4 font-black">Địa chỉ IP</th>
              <th className="px-6 py-4 text-center font-black">Dữ liệu gốc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initialLogs.map((log: any) => {
              const isFailed = log.action.includes("FAILED");
              const isSuccess = log.action.includes("SUCCESS");

              return (
                <tr key={log.id} className="hover:bg-slate-50/40 transition-colors font-semibold">
                  <td className="px-6 py-3.5 whitespace-nowrap text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {log.userEmail}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-755 font-bold">
                    {log.userFullName}
                  </td>
                  <td className="px-6 py-3.5 text-slate-700 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-650">{log.roleName}</span>
                    </span>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                      isFailed ? "bg-rose-50 text-rose-700 border border-rose-200" :
                      isSuccess ? "bg-emerald-50 text-emerald-700 border border-emerald-250" :
                      log.action.includes("DELETE") ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600 font-medium">
                    {log.newValues && !log.newValues.startsWith("{") && !log.newValues.startsWith("[") ? (
                      <span className={isFailed ? "text-rose-600 font-bold" : ""}>{log.newValues}</span>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">{log.targetTable || "System"}: {log.targetId || "SYSTEM"}</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-slate-550 font-mono text-[11px]">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      {log.ipAddress || "127.0.0.1"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-center whitespace-nowrap">
                    {(log.oldValues || (log.newValues && (log.newValues.startsWith("{") || log.newValues.startsWith("[")))) ? (
                      <button 
                        onClick={() => setDetailsLog(log)}
                        className="p-1 text-slate-400 hover:text-[#00A99D] hover:bg-slate-100 rounded transition-all cursor-pointer inline-flex items-center justify-center"
                        title="Xem chi tiết thay đổi"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    ) : "—"}
                  </td>
                </tr>
              )
            })}
            {initialLogs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-slate-400 font-medium">
                  Không tìm thấy hoạt động nào được ghi nhận.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                      ? "bg-[#00A99D] text-white" 
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
                        ? "border-[#00A99D] bg-[#00A99D]/5 text-[#00A99D] font-bold"
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
                        ? "border-[#00A99D] bg-[#00A99D]/5 text-[#00A99D] font-bold"
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
                        ? "border-[#00A99D] bg-[#00A99D]/5 text-[#00A99D] font-bold"
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
                    <Loader2 className="w-4 h-4 animate-spin text-[#00A99D]" />
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
                    : "bg-[#00A99D] hover:bg-[#009186] text-white disabled:opacity-40"
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
      {detailsLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                Chi tiết dữ liệu hoạt động
              </h3>
              <button 
                onClick={() => setDetailsLog(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Hoạt động / Đối tượng</p>
                <div className="flex gap-2">
                  <span className="bg-blue-50 text-blue-700 font-bold border border-blue-200 px-2 py-0.5 rounded text-[10px] uppercase font-black">{detailsLog.action}</span>
                  {detailsLog.targetTable && (
                    <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px] font-mono">{detailsLog.targetTable} ({detailsLog.targetId})</span>
                  )}
                </div>
              </div>
              
              {detailsLog.oldValues && (
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Dữ liệu cũ (Trước thay đổi)</p>
                  {formatJSON(detailsLog.oldValues)}
                </div>
              )}
              
              {detailsLog.newValues && (
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Dữ liệu mới / Thông tin chi tiết</p>
                  {formatJSON(detailsLog.newValues)}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
              <button 
                onClick={() => setDetailsLog(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
