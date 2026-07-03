"use client"
import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Search, Filter, RefreshCw, Clock, User, Eye, X, Shield } from "lucide-react"

export function LogsClient({ initialLogs, total, page, limit, search, selectedAction, selectedRole, actions, roles }: any) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchVal, setSearchVal] = useState(search)
  const [actionVal, setActionVal] = useState(selectedAction)
  const [roleVal, setRoleVal] = useState(selectedRole || "")
  const [detailsLog, setDetailsLog] = useState<any>(null)

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
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo Email, Bảng dữ liệu, Hoạt động..." 
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
        <div className="flex gap-2">
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
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-150">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
              <th className="px-6 py-4 font-black">Thời gian</th>
              <th className="px-6 py-4 font-black">Tài khoản</th>
              <th className="px-6 py-4 font-black">Nhóm quyền</th>
              <th className="px-6 py-4 font-black">Hoạt động</th>
              <th className="px-6 py-4 font-black">Bảng dữ liệu</th>
              <th className="px-6 py-4 font-black">Mã đối tượng</th>
              <th className="px-6 py-4 font-black">Chi tiết thông tin</th>
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
                  <td className="px-6 py-3.5 text-slate-700 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-600">{log.roleName}</span>
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
                  <td className="px-6 py-3.5 text-slate-650 font-mono text-[11px]">{log.targetTable || "—"}</td>
                  <td className="px-6 py-3.5 text-slate-400 font-mono text-[11px] max-w-[150px] truncate" title={log.targetId}>
                    {log.targetId || "—"}
                  </td>
                  <td className="px-6 py-3.5 text-slate-600 font-medium">
                    {log.newValues && !log.newValues.startsWith("{") && !log.newValues.startsWith("[") ? (
                      <span className={isFailed ? "text-rose-600 font-bold" : ""}>{log.newValues}</span>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">IP: {log.ipAddress || "N/A"}</span>
                    )}
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
