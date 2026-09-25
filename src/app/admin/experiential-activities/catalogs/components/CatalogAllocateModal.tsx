"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { X, Send, Building2, CheckCircle2, Clock, AlertCircle, Sparkles, Mail, Users, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface CampusItem {
  id: string;
  campusCode: string;
  campusName: string;
}

interface TLHNTeacherItem {
  id: string;
  teacherCode: string;
  teacherName: string;
  email: string;
  campusId: string;
  campusCode?: string;
  isTLHN?: boolean;
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
  const [tlhnTeachers, setTlhnTeachers] = useState<TLHNTeacherItem[]>([]);
  const [selectedCampusIds, setSelectedCampusIds] = useState<string[]>([]);
  const [campusTeacherAssign, setCampusTeacherAssign] = useState<Record<string, string>>({}); // campusId -> teacherId
  const [sendEmailNotification, setSendEmailNotification] = useState<boolean>(true);
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Tải danh sách cơ sở
      fetch('/api/campuses')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setCampuses(data);
        })
        .catch(() => {});

      // Tải danh sách giáo viên Tổ TLHN
      fetch('/api/admin/experiential-activities/catalogs/cths-teachers')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Lọc ra các giáo viên Tổ TLHN hoặc chuyên môn liên quan
            const tlhnList = data.filter((t: any) => 
              t.departmentName?.includes('TLHN') || 
              t.position?.includes('TLHN') || 
              t.positions?.includes('TLHN') ||
              t.departmentName?.includes('Tâm lý') ||
              t.isCTHS
            );
            setTlhnTeachers(tlhnList.length > 0 ? tlhnList : data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (catalogItem) {
      const existingAllocated = catalogItem.meta?.allocatedCampuses || [];
      setSelectedCampusIds(existingAllocated.map((a: any) => a.campusId));

      const initialAssign: Record<string, string> = {};
      existingAllocated.forEach((a: any) => {
        if (a.campusId && a.tlhnTeacherId) {
          initialAssign[a.campusId] = a.tlhnTeacherId;
        }
      });
      setCampusTeacherAssign(initialAssign);
    } else {
      setSelectedCampusIds([]);
      setCampusTeacherAssign({});
    }
  }, [catalogItem, isOpen]);

  if (!isOpen || !catalogItem) return null;

  const currentAllocations = catalogItem.meta?.allocatedCampuses || [];

  const handleToggleCampus = (campusId: string) => {
    if (selectedCampusIds.includes(campusId)) {
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
      // Xây dựng mảng allocatedCampuses mới
      const newAllocatedCampuses = selectedCampusIds.map(cId => {
        const found = currentAllocations.find((a: any) => a.campusId === cId);
        const campusObj = campuses.find(c => c.id === cId);

        const assignedTeacherId = campusTeacherAssign[cId];
        const assignedTeacherObj = tlhnTeachers.find(t => t.id === assignedTeacherId);

        return {
          campusId: cId,
          campusCode: campusObj?.campusCode || cId,
          campusName: campusObj?.campusName || `Cơ sở ${cId}`,
          tlhnTeacherId: assignedTeacherObj?.id || found?.tlhnTeacherId || '',
          tlhnTeacherName: assignedTeacherObj?.teacherName || found?.tlhnTeacherName || '',
          tlhnTeacherEmail: assignedTeacherObj?.email || found?.tlhnTeacherEmail || '',
          status: found?.status || 'CHUA_TIEP_NHAN',
          receivedAt: found?.receivedAt || null,
          deployedAt: found?.deployedAt || null,
          assignedClassesCount: found?.assignedClassesCount || 0,
          recordId: found?.recordId || null
        };
      });

      const res = await fetch(`/api/admin/experiential-activities/catalogs/${catalogItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ALLOCATE_CAMPUSES',
          allocatedCampuses: newAllocatedCampuses,
          sendEmail: sendEmailNotification
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi phân bổ');
      }

      const data = await res.json();
      const emailCount = data.emailNotification?.count;
      if (sendEmailNotification && emailCount) {
        toast.success(`Đã đẩy hoạt động xuống ${newAllocatedCampuses.length} cơ sở và gửi email thông báo tới ${emailCount} GV Tổ TLHN thành công!`);
      } else {
        toast.success(`Đã đẩy hoạt động xuống ${newAllocatedCampuses.length} cơ sở cho GV Tổ TLHN tiếp nhận!`);
      }

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
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50/80 via-emerald-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00A19A]/15 text-[#00A19A] flex items-center justify-center font-bold">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span>Đẩy Hoạt Động Xuống Cơ Sở & Báo Mail GV Tổ TLHN</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                BP HĐNGLL - Tổ CTHS phân bổ kế hoạch cho GV Tổ TLHN tại các cơ sở tiếp nhận và triển khai
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
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* Target Activity Summary */}
          <div className="bg-[#003B3A]/5 border border-[#003B3A]/15 rounded-2xl p-4">
            <div className="text-[11px] font-black uppercase text-[#00A19A] tracking-wider mb-1 flex items-center justify-between">
              <span>Kế hoạch Hoạt động phân bổ</span>
              <span className="font-mono text-slate-500">{catalogItem.code}</span>
            </div>
            <h3 className="text-sm font-black text-slate-800 mb-1.5">
              {catalogItem.name}
            </h3>
            <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
              <span>Chủ đề: <strong className="text-slate-800">{catalogItem.meta?.themeName || '—'}</strong></span>
              <span>Khối: <strong className="text-slate-800">{Array.isArray(catalogItem.meta?.grades) ? catalogItem.meta.grades.join(', ') : catalogItem.meta?.grades || 'Tất cả'}</strong></span>
              <span>Môn chủ trì: <strong className="text-indigo-700">{catalogItem.meta?.primarySubjectName || '—'}</strong></span>
              <span>Thời gian: <strong className="text-slate-800">{catalogItem.meta?.timeFrame || 'Trong năm'} (HK {catalogItem.meta?.semester || 1})</strong></span>
            </div>
          </div>

          {/* Email Notification Option Banner */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/90 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmailNotification}
                onChange={e => setSendEmailNotification(e.target.checked)}
                className="mt-0.5 rounded text-[#00A19A] focus:ring-[#00A19A] w-4 h-4"
              />
              <div>
                <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#00A19A]" />
                  <span>Tự động gửi email thông báo kế hoạch cho GV Tổ TLHN tại các cơ sở</span>
                </div>
                <div className="text-[11px] text-teal-800 mt-1 bg-white/80 p-2.5 rounded-xl border border-teal-200/60 leading-relaxed">
                  <strong>Nội dung email sẽ gửi:</strong><br />
                  <em>"Các thầy cô vừa nhận được Kế hoạch hoạt động ngoại khóa/trải nghiệm từ BP HĐNGLL - Tổ CTHS. Kính nhờ các thầy cô vui lòng triển khai kế hoạch đến GVCN, GVBM liên quan tại cơ sở. Xin cảm ơn."</em>
                </div>
              </div>
            </label>
          </div>

          {/* Quick Select Buttons */}
          <div className="flex items-center justify-between pt-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00A19A]" />
              Chọn cơ sở tiếp nhận ({selectedCampusIds.length}/{campuses.length}):
            </label>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[#00A19A] hover:underline font-bold cursor-pointer"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-slate-400 hover:text-slate-700 hover:underline cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          {/* Campus List with TLHN Teacher Selection */}
          <div className="space-y-2.5 max-h-[36vh] overflow-y-auto pr-1">
            {campuses.map(campus => {
              const isSelected = selectedCampusIds.includes(campus.id);
              const foundAlloc = currentAllocations.find((a: any) => a.campusId === campus.id);
              const isDeployed = foundAlloc?.status === 'DA_TRIEN_KHAI';
              const isAccepted = foundAlloc?.status === 'DA_TIEP_NHAN';

              // Lọc các GV Tổ TLHN thuộc cơ sở này
              const campusTeachers = tlhnTeachers.filter(t => t.campusId === campus.id || t.campusCode === campus.campusCode);

              return (
                <div
                  key={campus.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-[#00A19A] bg-teal-50/40 ring-1 ring-[#00A19A]/30'
                      : 'border-slate-200/90 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleCampus(campus.id)}
                      className="mt-1 rounded text-[#00A19A] focus:ring-[#00A19A] w-4 h-4 cursor-pointer"
                    />

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div 
                          onClick={() => handleToggleCampus(campus.id)}
                          className="cursor-pointer"
                        >
                          <span className="text-xs font-bold text-slate-800">{campus.campusName}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-2">Mã: {campus.campusCode}</span>
                        </div>

                        {foundAlloc && (
                          <div className="flex items-center gap-1.5">
                            {isDeployed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Đã triển khai
                              </span>
                            ) : isAccepted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-2.5 h-2.5" /> Đã nhận ({foundAlloc.tlhnTeacherName || 'GV'})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Chưa tiếp nhận
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Dropdown / Tag chọn GV Tổ TLHN của cơ sở */}
                      {isSelected && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                            <Users className="w-3 h-3 text-[#00A19A]" />
                            GV Tổ TLHN tiếp nhận:
                          </span>

                          <select
                            value={campusTeacherAssign[campus.id] || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setCampusTeacherAssign(prev => ({
                                ...prev,
                                [campus.id]: val
                              }));
                            }}
                            className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[#00A19A]"
                          >
                            <option value="">-- Tất cả GV Tổ TLHN tại {campus.campusCode || 'cơ sở'} (Khuyến nghị) --</option>
                            {campusTeachers.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.teacherName} ({t.teacherCode})
                              </option>
                            ))}
                          </select>

                          {campusTeachers.length > 0 && !campusTeacherAssign[campus.id] && (
                            <span className="text-[10px] text-teal-700 italic">
                              (Hệ thống sẽ gửi email tới {campusTeachers.map(t => t.teacherName).join(', ')})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="text-xs text-slate-500">
            Đã chọn <strong className="text-slate-800">{selectedCampusIds.length} cơ sở</strong>
            {sendEmailNotification && selectedCampusIds.length > 0 && (
              <span className="text-teal-700 font-semibold ml-1.5">• Sẽ tự động gửi email thông báo</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={allocating || selectedCampusIds.length === 0}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 text-white shadow-md shadow-[#00A19A]/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{allocating ? 'Đang gửi thông báo...' : `Xác nhận & Báo mail (${selectedCampusIds.length} cơ sở)`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
