'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export default function TeacherPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Teacher portal runtime error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 min-h-[450px] bg-white rounded-3xl border-2 border-red-100 shadow-xs max-w-2xl mx-auto my-6 text-center">
      <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-4 border border-red-100">
        <AlertTriangle className="w-10 h-10" />
      </div>
      
      <h2 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">
        Đã xảy ra lỗi khi tải dữ liệu Trang Giáo viên
      </h2>
      
      <p className="text-slate-500 text-xs sm:text-sm mb-6 max-w-md leading-relaxed">
        Hệ thống vừa gặp sự cố không mong muốn. Đừng lo lắng, dữ liệu của bạn hoàn toàn an toàn. Bạn có thể thử tải lại hoặc quay về Trang tổng quan.
      </p>

      {error?.message && (
        <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left max-w-md w-full overflow-x-auto">
          <p className="text-[11px] font-mono text-slate-600 font-medium">
            Mã lỗi: {error.digest || 'UNCAUGHT_TEACHER_ERROR'}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#00A99D] hover:bg-[#009085] text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow w-full sm:w-auto"
        >
          <RefreshCcw className="w-4 h-4" />
          Thử tải lại
        </button>

        <Link
          href="/teacher"
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all w-full sm:w-auto"
        >
          <LayoutDashboard className="w-4 h-4 text-slate-500" />
          Về Trang tổng quan
        </Link>
      </div>
    </div>
  );
}
