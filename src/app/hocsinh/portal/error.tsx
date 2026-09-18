'use client'

import { useEffect } from 'react'
import { Sparkles, RefreshCcw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function StudentPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Student Portal Error Boundary:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 min-h-[420px] bg-white rounded-3xl border border-sky-100 shadow-sm max-w-lg mx-auto my-10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-sky-50 text-[#0284C7] flex items-center justify-center mb-4 border border-sky-100 shadow-inner">
        <Sparkles className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-black text-slate-800 mb-2 tracking-tight">
        Đang gặp trục trặc tải trang học sinh
      </h2>

      <p className="text-slate-500 text-xs sm:text-sm mb-6 max-w-sm leading-relaxed">
        Hệ thống không thể tải thông tin lúc này. Em hãy bấm &quot;Thử lại&quot; hoặc quay về trang chủ nhé.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold rounded-xl transition-all shadow-xs hover:shadow w-full sm:w-auto cursor-pointer"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Thử lại</span>
        </button>

        <Link
          href="/hocsinh/portal"
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Về trang chủ</span>
        </Link>
      </div>
    </div>
  )
}
