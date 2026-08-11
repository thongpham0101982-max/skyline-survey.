'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Tự động log lỗi ra console hoặc Sentry
    console.error('Đã xảy ra lỗi cục bộ:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[400px] bg-slate-50/50 rounded-2xl border border-red-100">
      <div className="bg-red-100 text-red-600 p-4 rounded-full mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Đã xảy ra lỗi tải dữ liệu!</h2>
      <p className="text-slate-500 mb-6 text-center max-w-md">
        Một phần của trang web đã gặp sự cố không mong muốn. Đừng lo lắng, các chức năng khác vẫn hoạt động bình thường.
      </p>
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all shadow-md hover:shadow-lg"
      >
        <RefreshCcw className="w-4 h-4" />
        Thử tải lại
      </button>
    </div>
  );
}
