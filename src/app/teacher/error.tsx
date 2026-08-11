'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCcw, LayoutDashboard, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

export default function TeacherPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error('Teacher portal runtime error:', error);
  }, [error]);

  const handleClearCacheAndRelogin = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/login';
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 min-h-[450px] bg-white rounded-3xl border-2 border-red-100 shadow-xs max-w-2xl mx-auto my-6 text-center">
      <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-4 border border-red-100">
        <AlertTriangle className="w-10 h-10" />
      </div>
      
      <h2 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">
        Đã xảy ra lỗi khi tải dữ liệu Trang Giáo viên
      </h2>
      
      <p className="text-slate-500 text-xs sm:text-sm mb-4 max-w-md leading-relaxed">
        Hệ thống vừa gặp sự cố không mong muốn. Đừng lo lắng, dữ liệu của bạn hoàn toàn an toàn. Bạn có thể thử tải lại hoặc xóa bộ nhớ đệm.
      </p>

      <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left max-w-md w-full overflow-x-auto">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-mono text-slate-600 font-medium">
            Mã lỗi: {error.digest || 'UNCAUGHT_TEACHER_ERROR'}
          </p>
          <button 
            type="button" 
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] font-bold text-[#00A99D] flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>{showDetails ? "Ẩn chi tiết" : "Xem chi tiết"}</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
        {showDetails && error?.message && (
          <p className="mt-2 text-[10px] font-mono text-rose-600 bg-rose-50 p-2 rounded border border-rose-100 break-words">
            {error.message}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#00A99D] hover:bg-[#009085] text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow w-full sm:w-auto cursor-pointer"
        >
          <RefreshCcw className="w-4 h-4" />
          Thử tải lại
        </button>

        <button
          onClick={handleClearCacheAndRelogin}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow w-full sm:w-auto cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          Xóa Cache & Đăng nhập lại
        </button>

        <Link
          href="/teacher"
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all w-full sm:w-auto"
        >
          <LayoutDashboard className="w-4 h-4 text-slate-500" />
          Về Trang tổng quan
        </Link>
      </div>
    </div>
  );
}
