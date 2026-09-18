'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function ParentPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Parent Portal Error Boundary:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 min-h-[420px] bg-white rounded-3xl border border-red-200/80 shadow-xs max-w-lg mx-auto my-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100 shadow-inner">
        <AlertCircle className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">
        Không thể tải dữ liệu cổng Phụ huynh
      </h2>

      <p className="text-slate-500 text-xs sm:text-sm mb-6 max-w-sm leading-relaxed">
        Đã có sự cố kết nối hoặc lỗi xử lý tạm thời. Xin Quý Phụ huynh vui lòng bấm &quot;Thử tải lại&quot;.
      </p>

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
          href="/parent"
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all w-full sm:w-auto"
        >
          <Home className="w-4 h-4 text-slate-500" />
          <span>Về trang chính</span>
        </Link>
      </div>
    </div>
  )
}
