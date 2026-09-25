"use client";
import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Ban, ShieldCheck, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ActivityCatalogItem } from '@/lib/experiential/catalog-types';

interface CatalogBulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedActivities: ActivityCatalogItem[];
}

export function CatalogBulkDeleteModal({
  isOpen,
  onClose,
  onSuccess,
  selectedActivities
}: CatalogBulkDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [canCancelInstead, setCanCancelInstead] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);

  if (!isOpen) return null;

  // Xử lý chuyển sang trạng thái HỦY (Khuyên dùng khi có dữ liệu)
  const handleCancelInstead = async () => {
    if (selectedActivities.length === 0) return;

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/admin/experiential-activities/catalogs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BULK_UPDATE_STATUS',
          ids: selectedActivities.map(a => a.id),
          status: 'CANCELLED'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi chuyển trạng thái Hủy');
      }

      toast.success(data.message || `Đã chuyển ${selectedActivities.length} hoạt động sang trạng thái HỦY thành công`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi hệ thống');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý xóa vĩnh viễn
  const handleDeletePermanently = async () => {
    if (selectedActivities.length === 0) return;

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/admin/experiential-activities/catalogs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedActivities.map(a => a.id),
          forceDelete
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.canCancelInstead) {
          setCanCancelInstead(true);
        }
        setErrorMessage(data.error || 'Lỗi khi xóa hoạt động');
        return;
      }

      toast.success(data.message || `Đã xóa thành công ${selectedActivities.length} hoạt động khỏi danh mục`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800">
                Xử Lý Hoạt Động Ngoại Khóa
              </h2>
              <p className="text-xs text-rose-600 font-semibold">
                Lựa chọn: Chuyển sang trạng thái HỦY hoặc Xóa vĩnh viễn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Cảnh báo lỗi nếu có */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Cảnh báo dữ liệu liên quan:</span>
              </div>
              <p className="leading-relaxed">{errorMessage}</p>
              {canCancelInstead && (
                <div className="pt-2 border-t border-amber-200/60 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelInstead}
                    disabled={loading}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Chuyển tất cả sang trạng thái HỦY ngay</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            Bạn đang thao tác với <strong className="text-slate-900 font-bold">{selectedActivities.length} hoạt động ngoại khóa</strong>.
            Nếu hoạt động đã có học sinh tham gia đánh giá, bạn nên chọn <strong>"Chuyển sang trạng thái HỦY"</strong> để bảo toàn lịch sử hồ sơ học sinh.
          </p>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 max-h-44 overflow-y-auto space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Danh sách hoạt động ({selectedActivities.length}):
            </div>
            {selectedActivities.map((act, index) => (
              <div key={act.id} className="flex items-start gap-2 text-xs text-slate-700">
                <span className="font-bold text-slate-400 shrink-0">{index + 1}.</span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800">{act.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono ml-1.5">({act.code})</span>
                  {act.status === 'CANCELLED' && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                      Đã hủy
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tuỳ chọn force delete nếu admin muốn xoá sạch */}
          {errorMessage && (
            <label className="flex items-start gap-2 p-3 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-900 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forceDelete}
                onChange={e => setForceDelete(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 border-rose-300 focus:ring-rose-500 mt-0.5"
              />
              <span className="leading-snug">
                <strong>Tôi hiểu rủi ro:</strong> Bắt buộc xóa vĩnh viễn hoạt động và dọn sạch toàn bộ kết quả đánh giá của học sinh liên quan (chỉ dùng khi dọn dữ liệu nhập thử nghiệm / import nhầm).
              </span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {/* Nút 1: Chuyển sang trạng thái HỦY */}
            <button
              type="button"
              disabled={loading}
              onClick={handleCancelInstead}
              className="px-4 py-2 text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:brightness-105 rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="Chuyển sang trạng thái Hủy, giữ lại lịch sử đánh giá học sinh"
            >
              <Ban className="w-4 h-4" />
              <span>Chuyển sang HỦY ({selectedActivities.length})</span>
            </button>

            {/* Nút 2: Xóa vĩnh viễn */}
            <button
              type="button"
              disabled={loading}
              onClick={handleDeletePermanently}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="Xóa vĩnh viễn khỏi cơ sở dữ liệu"
            >
              <Trash2 className="w-4 h-4" />
              <span>{loading ? 'Đang xử lý...' : (forceDelete ? 'Xóa vĩnh viễn (Bắt buộc)' : `Xóa vĩnh viễn (${selectedActivities.length})`)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
