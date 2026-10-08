'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCcw, LogOut, ChevronDown, ChevronUp } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const isChunkError =
    error?.name === 'ChunkLoadError' ||
    error?.message?.includes('ChunkLoadError') ||
    error?.message?.includes('Failed to load chunk') ||
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('module factory is not available') ||
    error?.message?.includes('stale browser cache') ||
    error?.message?.includes('instantiated because it was required');

  useEffect(() => {
    console.error('Lỗi ứng dụng toàn cục (Root Error Boundary):', error);

    // Tự động tải lại trang nếu gặp lỗi ChunkLoadError hoặc cache mismatch do deploy code mới
    if (isChunkError && typeof window !== 'undefined') {
      const lastChunkReload = sessionStorage.getItem('last_chunk_reload');
      const now = Date.now();
      if (!lastChunkReload || now - parseInt(lastChunkReload, 10) > 10000) {
        sessionStorage.setItem('last_chunk_reload', now.toString());
        if (typeof window !== 'undefined' && 'caches' in window) {
          caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))).finally(() => {
            (window as any).location.reload();
          });
        } else if (typeof window !== 'undefined') {
          (window as any).location.reload();
        }
      }
    }
  }, [error, isChunkError]);

  const handleClearCacheAndRelogin = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }
    } catch (e) {
      console.error(e);
    }
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-white rounded-3xl border-2 border-red-100 shadow-xl max-w-xl w-full text-center">
        <div className={`p-4 rounded-full mb-4 border ${isChunkError ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
          <AlertTriangle className="w-10 h-10" />
        </div>
        
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {isChunkError ? 'Hệ thống vừa có bản cập nhật mới!' : 'Đã xảy ra lỗi tải dữ liệu!'}
        </h2>
        
        <p className="text-slate-500 text-xs sm:text-sm mb-6 max-w-md leading-relaxed">
          {isChunkError
            ? 'Trình duyệt đang lưu các tệp giao diện của phiên bản trước. Vui lòng bấm "Tải lại trang" hoặc nhấn phím F5 (Ctrl + F5) để tải tài nguyên mới nhất.'
            : 'Một phần của trang web đã gặp sự cố không mong muốn. Đừng lo lắng, phiên làm việc của bạn có thể chỉ cần được làm mới.'}
        </p>

        <div className="w-full mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            <span>Chi tiết lỗi kĩ thuật {error?.digest ? `(Mã: ${error.digest})` : ''}</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showDetails && (
            <div className="mt-2 p-3 bg-slate-950 text-emerald-400 rounded-xl text-left font-mono text-[11px] overflow-x-auto max-h-40 border border-slate-800">
              <p className="font-bold text-rose-400">{error?.name || 'Error'}: {error?.message || 'Không có mô tả chi tiết'}</p>
              {error?.digest && <p className="text-amber-400 mt-1">Digest: {error.digest}</p>}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <button
            onClick={() => { try { reset(); } catch(e){} window.location.reload(); }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-md hover:shadow-lg w-full sm:w-auto"
          >
            <RefreshCcw className="w-4 h-4" />
            Thử tải lại
          </button>

          <button
            onClick={handleClearCacheAndRelogin}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#48BFE3] hover:bg-[#009085] text-white text-xs font-bold rounded-xl transition shadow-md hover:shadow-lg w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4" />
            Xóa Cache & Đăng nhập lại
          </button>
        </div>
      </div>
    </div>
  );
}
