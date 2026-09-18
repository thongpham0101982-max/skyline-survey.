'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCcw, LayoutDashboard, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

export default function AdminPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    console.error('Admin Portal Error Boundary caught:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 min-h-[450px] bg-white rounded-3xl border border-red-200/80 shadow-xs max-w-xl mx-auto my-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100 shadow-inner">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-black text-slate-800 mb-2 tracking-tight">
        Đã xảy ra sự cố khi tải trang Quản trị
      </h2>

      <p className="text-slate-500 text-xs sm:text-sm mb-6 max-w-md leading-relaxed">
        Hệ thống không thể tải dữ liệu cho trang này do lỗi tạm thời. Dữ liệu của bạn không bị ảnh hưởng.
      </p>

      <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left max-w-md w-full">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-mono text-slate-600 font-medium">
            Mã lỗi: {error.digest || 'UNCAUGHT_ADMIN_ERROR'}
          </p>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] font-bold text-[#0284C7] flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>{showDetails ? 'Ẩn chi tiết' : 'Xem chi tiết'}</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
        {showDetails && (
          <div className="mt-2 text-[10px] font-mono text-rose-600 bg-rose-50 p-2.5 rounded border border-rose-100 break-words max-h-32 overflow-y-auto">
            {error.message || 'Không có mô tả chi tiết lỗi'}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold rounded-xl transition-all shadow-xs hover:shadow w-full sm:w-auto cursor-pointer"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Thử tải lại</span>
        </button>

        <Link
          href="/admin"
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all w-full sm:w-auto"
        >
          <LayoutDashboard className="w-4 h-4 text-slate-500" />
          <span>Về Dashboard</span>
        </Link>
      </div>
    </div>
  )
}
