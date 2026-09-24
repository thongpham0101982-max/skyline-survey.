"use client";
import React, { useState, useEffect } from 'react';
import { X, Send, Building2, CheckCircle2, Clock, AlertCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface CampusItem {
  id: string;
  campusCode: string;
  campusName: string;
}

interface CatalogAllocateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllocated: () => void;
  catalogItem: any;
}

export function CatalogAllocateModal({
  isOpen,
  onClose,
  onAllocated,
  catalogItem
}: CatalogAllocateModalProps) {
  const [campuses, setCampuses] = useState<CampusItem[]>([]);
  const [selectedCampusIds, setSelectedCampusIds] = useState<string[]>([]);
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    fetch('/api/campuses')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCampuses(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (catalogItem) {
      const existingAllocated = catalogItem.meta?.allocatedCampuses || [];
      setSelectedCampusIds(existingAllocated.map((a: any) => a.campusId));
    } else {
      setSelectedCampusIds([]);
    }
  }, [catalogItem, isOpen]);

  if (!isOpen || !catalogItem) return null;

  const currentAllocations = catalogItem.meta?.allocatedCampuses || [];

  const handleToggleCampus = (campusId: string) => {
    if (selectedCampusIds.includes(campusId)) {
      // Check if already deployed
      const found = currentAllocations.find((a: any) => a.campusId === campusId);
      if (found && found.status === 'DA_TRIEN_KHAI') {
        toast.error('Cơ sở này đã triển khai xuống các lớp, không thể hủy phân bổ!');
        return;
      }
      setSelectedCampusIds(selectedCampusIds.filter(id => id !== campusId));
    } else {
      setSelectedCampusIds([...selectedCampusIds, campusId]);
    }
  };

  const handleSelectAll = () => {
    setSelectedCampusIds(campuses.map(c => c.id));
  };

  const handleClearAll = () => {
    // Keep deployed ones
    const deployedIds = currentAllocations
      .filter((a: any) => a.status === 'DA_TRIEN_KHAI')
      .map((a: any) => a.campusId);
    setSelectedCampusIds(deployedIds);
  };

  const handleSubmit = async () => {
    if (selectedCampusIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một cơ sở để phân bổ hoạt động');
      return;
    }

    setAllocating(true);
    try {
      // Build new allocatedCampuses array preserving existing states
      const newAllocatedCampuses = selectedCampusIds.map(cId => {
        const found = currentAllocations.find((a: any) => a.campusId === cId);
        if (found) return found;

        const campusObj = campuses.find(c => c.id === cId);
        return {
          campusId: cId,
          campusCode: campusObj?.campusCode || cId,
          campusName: campusObj?.campusName || `Cơ sở ${cId}`,
          status: 'CHUA_TIEP_NHAN',
          receivedAt: null,
          deployedAt: null
        };
      });

      const res = await fetch(`/api/admin/experiential-activities/catalogs/${catalogItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ALLOCATE_CAMPUSES',
          allocatedCampuses: newAllocatedCampuses
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi phân bổ');
      }

      toast.success(`Đã đẩy hoạt động xuống ${newAllocatedCampuses.length} cơ sở cho GV Tổ TLHN tiếp nhận!`);
      onAllocated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    } finally {
      setAllocating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#003B3A]/10 text-[#003B3A] flex items-center justify-center font-bold">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800">
                Đẩy Hoạt Động Xuống Cơ Sở (Campus Dispatch)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Ban ĐHCM / Tổ CTHS phân bổ cho GV Tổ TLHN tại các cơ sở tiếp nhận và triển khai
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

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Target Activity Summary */}
          <div className="bg-[#003B3A]/5 border border-[#003B3A]/15 rounded-2xl p-4">
            <div className="text-[11px] font-black uppercase text-[#00A19A] tracking-wider mb-1">
              Hoạt động được phân bổ
            </div>
            <h3 className="text-sm font-black text-slate-800 mb-1">
              {catalogItem.name}
            </h3>
            <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
              <span>Chủ đề: <strong className="text-slate-800">{catalogItem.meta?.themeName || '—'}</strong></span>
              <span>Khối: <strong className="text-slate-800">{Array.isArray(catalogItem.meta?.grades) ? catalogItem.meta.grades.join(', ') : catalogItem.meta?.grades || 'Tất cả'}</strong></span>
              <span>Môn chủ trì: <strong className="text-indigo-700">{catalogItem.meta?.primarySubjectName || '—'}</strong></span>
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00A19A]" />
              Chọn cơ sở áp dụng ({selectedCampusIds.length}/{campuses.length}):
            </label>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[#00A19A] hover:underline font-bold"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-slate-400 hover:text-slate-700 hover:underline"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          {/* Campus List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[35vh] overflow-y-auto pr-1">
            {campuses.map(campus => {
              const isSelected = selectedCampusIds.includes(campus.id);
              const foundAlloc = currentAllocations.find((a: any) => a.campusId === campus.id);
              const isDeployed = foundAlloc?.status === 'DA_TRIEN_KHAI';
              const isAccepted = foundAlloc?.status === 'DA_TIEP_NHAN';

              return (
                <div
                  key={campus.id}
                  onClick={() => handleToggleCampus(campus.id)}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-[#00A19A] bg-[#00A19A]/5 ring-1 ring-[#00A19A]/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-[#00A19A] focus:ring-[#00A19A]"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-800">{campus.campusName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">Mã: {campus.campusCode}</div>
                    {foundAlloc && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {isDeployed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Đã triển khai
                          </span>
                        ) : isAccepted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-2.5 h-2.5" /> Đã tiếp nhận
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Chưa tiếp nhận
                          </span>
                        )}
                        {foundAlloc.tlhnTeacherName && (
                          <span className="text-[10px] text-slate-500 italic">
                            ({foundAlloc.tlhnTeacherName})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={allocating || selectedCampusIds.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#003B3A] hover:bg-[#002b2a] text-white shadow-md transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{allocating ? 'Đang phân bổ...' : `Xác nhận đẩy xuống ${selectedCampusIds.length} cơ sở`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
