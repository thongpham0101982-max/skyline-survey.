"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { X, UserCheck, Search, Users, ShieldCheck, AlertCircle, Sparkles, Building2, Check, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { ActivityCatalogItem } from '@/lib/experiential/catalog-types';

interface CTHSTeacher {
  id: string;
  teacherCode: string;
  teacherName: string;
  email: string;
  phone: string;
  position: string;
  positions: string;
  campusId: string;
  campusCode: string;
  campusName: string;
  departmentName: string;
  isCTHS: boolean;
}

interface CatalogAssignCTHSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedActivities: ActivityCatalogItem[];
}

export function CatalogAssignCTHSModal({
  isOpen,
  onClose,
  onSuccess,
  selectedActivities
}: CatalogAssignCTHSModalProps) {
  const [teachers, setTeachers] = useState<CTHSTeacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCTHSOnly, setFilterCTHSOnly] = useState(true);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/admin/experiential-activities/catalogs/cths-teachers')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setTeachers(data);
          }
        })
        .catch(err => {
          toast.error('Không thể tải danh sách giáo viên: ' + err.message);
        })
        .finally(() => setLoading(false));

      // Preset selected if all selected activities have the same CTHS teacher
      if (selectedActivities.length > 0) {
        const firstId = selectedActivities[0]?.meta?.cthsTeacherId;
        const allSame = selectedActivities.every(a => a?.meta?.cthsTeacherId === firstId);
        if (allSame && firstId) {
          setSelectedTeacherId(firstId);
        } else {
          setSelectedTeacherId('');
        }
      }
    }
  }, [isOpen, selectedActivities]);

  const filteredTeachers = useMemo(() => {
    let list = teachers;
    if (filterCTHSOnly) {
      list = list.filter(t => t.isCTHS);
      // If none found in strict filter, show all so user isn't stuck
      if (list.length === 0) list = teachers;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(t => 
        t.teacherName.toLowerCase().includes(q) ||
        t.teacherCode.toLowerCase().includes(q) ||
        t.campusCode.toLowerCase().includes(q) ||
        t.campusName.toLowerCase().includes(q) ||
        t.departmentName.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [teachers, filterCTHSOnly, search]);

  if (!isOpen) return null;

  const currentSelectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  const handleSubmit = async () => {
    if (selectedActivities.length === 0) {
      toast.error('Chưa có hoạt động nào được chọn');
      return;
    }

    setSaving(true);
    try {
      const teacher = teachers.find(t => t.id === selectedTeacherId);
      const payload = {
        action: 'BULK_ASSIGN_CTHS',
        ids: selectedActivities.map(a => a.id),
        cthsTeacherId: teacher ? teacher.id : '',
        cthsTeacherCode: teacher ? teacher.teacherCode : '',
        cthsTeacherName: teacher ? teacher.teacherName : '',
        cthsTeacherEmail: teacher ? teacher.email : ''
      };

      const res = await fetch('/api/admin/experiential-activities/catalogs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi gán giáo viên');
      }

      const data = await res.json();
      toast.success(data.message || 'Đã phân công giáo viên Tổ CTHS thành công');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50/70 to-emerald-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00A19A]/15 text-[#00A19A] flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800">
                Gán Giáo Viên Tổ CTHS Phụ Trách
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Áp dụng cho <span className="font-bold text-[#00A19A]">{selectedActivities.length} hoạt động ngoại khóa</span> đã chọn
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

        {/* Selected activities preview */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 truncate mr-2">
            <span className="font-bold text-slate-700">Các hoạt động:</span>
            <span className="truncate text-slate-500">
              {selectedActivities.map(a => a.name).slice(0, 3).join(', ')}
              {selectedActivities.length > 3 ? ` và ${selectedActivities.length - 3} hoạt động khác...` : ''}
            </span>
          </div>
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold">
            {selectedActivities.length} mục
          </span>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm GV theo họ tên, mã nhân sự, cơ sở..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setFilterCTHSOnly(true)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  filterCTHSOnly ? 'bg-white text-[#00A19A] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tổ CTHS / HĐNG
              </button>
              <button
                type="button"
                onClick={() => setFilterCTHSOnly(false)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  !filterCTHSOnly ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả cán bộ/GV
              </button>
            </div>
          </div>

          {/* Quick Clear option */}
          <div 
            onClick={() => setSelectedTeacherId('')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              selectedTeacherId === '' 
                ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-300/40' 
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <UserX className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Không phân công / Gỡ bỏ phụ trách</div>
                <div className="text-[11px] text-slate-400">Để trống thông tin người phụ trách Tổ CTHS cho các hoạt động đã chọn</div>
              </div>
            </div>
            {selectedTeacherId === '' && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            )}
          </div>

          {/* Teachers List */}
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Đang tải danh sách giáo viên...
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Không tìm thấy giáo viên nào phù hợp với từ khóa "{search}".
              </div>
            ) : (
              filteredTeachers.map(t => {
                const isSelected = selectedTeacherId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTeacherId(t.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#00A19A] bg-teal-50/70 ring-2 ring-[#00A19A]/30'
                        : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                        isSelected 
                          ? 'bg-[#00A19A] text-white' 
                          : t.isCTHS 
                            ? 'bg-teal-100 text-teal-800' 
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {t.teacherName.split(' ').slice(-1)[0]?.charAt(0) || 'G'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{t.teacherName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                            {t.teacherCode}
                          </span>
                          {t.isCTHS && (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                              Tổ CTHS
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          {t.campusName && (
                            <span className="flex items-center gap-0.5">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {t.campusCode || t.campusName}
                            </span>
                          )}
                          {t.departmentName && <span>• {t.departmentName}</span>}
                          {t.email && <span className="text-slate-400">• {t.email}</span>}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#00A19A] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="text-xs text-slate-500">
            {currentSelectedTeacher ? (
              <span>Đang chọn: <strong className="text-slate-800">{currentSelectedTeacher.teacherName}</strong> ({currentSelectedTeacher.teacherCode})</span>
            ) : (
              <span className="italic text-slate-400">Chưa chọn người phụ trách (sẽ xóa phụ trách hiện tại)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 rounded-xl shadow-md shadow-[#00A19A]/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : `Xác nhận gán cho ${selectedActivities.length} HĐ`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
