"use client";
import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
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
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (selectedActivities.length === 0) return;

    setDeleting(true);
    try {
      const res = await fetch('/api/admin/experiential-activities/catalogs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedActivities.map(a => a.id)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi xóa hoạt động');
      }

      toast.success(data.message || `Đã xóa thành công ${selectedActivities.length} hoạt động khỏi danh mục`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi hệ thống');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800">
                Xác nhận Xóa Hoạt Động
              </h2>
              <p className="text-xs text-rose-600 font-semibold">
                Thao tác này sẽ xóa vĩnh viễn dữ liệu khỏi danh mục
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
          <p className="text-xs text-slate-600 leading-relaxed">
            Bạn đang yêu cầu xóa <strong className="text-rose-600 font-bold">{selectedActivities.length} hoạt động ngoại khóa</strong> khỏi danh mục.
            Hành động này không thể hoàn tác.
          </p>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 max-h-48 overflow-y-auto space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Danh sách hoạt động sẽ xóa ({selectedActivities.length}):
            </div>
            {selectedActivities.map((act, index) => (
              <div key={act.id} className="flex items-start gap-2 text-xs text-slate-700">
                <span className="font-bold text-slate-400 shrink-0">{index + 1}.</span>
                <div>
                  <span className="font-semibold text-slate-800">{act.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono ml-1.5">({act.code})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? 'Đang xóa...' : `Xóa ${selectedActivities.length} hoạt động`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
