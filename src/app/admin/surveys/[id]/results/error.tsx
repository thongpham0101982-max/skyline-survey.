'use client'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('SURVEY_RESULTS_ERROR:', error)
  }, [error])

  return (
    <div className="p-20 text-center bg-white min-h-screen flex flex-col items-center justify-center">
      <div className="bg-red-50 p-10 rounded-3xl border border-red-100 max-w-2xl">
        <h2 className="text-2xl font-black text-red-600 tracking-tight">Đã xảy ra lỗi hệ thống</h2>
        <p className="text-slate-600 mt-4 font-medium">{error.message || 'Lỗi không xác định'}</p>
        <div className="mt-8 p-6 bg-white rounded-2xl text-left overflow-auto text-[10px] font-mono text-slate-400 border border-slate-100 shadow-sm">
          {error.stack}
        </div>
        <button
          onClick={() => reset()}
          className="mt-8 px-6 py-3 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all"
        >
          Thử tải lại trang
        </button>
      </div>
    </div>
  )
}