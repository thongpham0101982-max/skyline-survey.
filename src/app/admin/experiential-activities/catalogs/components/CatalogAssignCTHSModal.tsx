"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, UserCheck, Search, Users, Building2, Check, UserX, 
  Trash2, Mail, Phone, AlertCircle, Sparkles, Star, ShieldCheck, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ActivityCatalogItem, CTHSTeacherAssignment } from '@/lib/experiential/catalog-types';

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
  onSuccess?: () => void;
  onSaved?: () => void;
  selectedActivities: ActivityCatalogItem[];
  catalogIds?: string[];
}

export function CatalogAssignCTHSModal({
  isOpen,
  onClose,
  onSuccess,
  onSaved,
  selectedActivities = [],
  catalogIds
}: CatalogAssignCTHSModalProps) {
  const [teachers, setTeachers] = useState<CTHSTeacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCTHSOnly, setFilterCTHSOnly] = useState(true);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/admin/experiential-activities/catalogs/cths-teachers')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setTeachers(data);

            // Tìm kiếm các ID giáo viên đã được gán trước đó từ các hoạt động được chọn
            const matchedIds = new Set<string>();
            selectedActivities.forEach(act => {
              const meta = act?.meta || {};
              const list = Array.isArray(meta.cthsTeachers) && meta.cthsTeachers.length > 0
                ? meta.cthsTeachers
                : meta.cthsTeacherName ? [{ 
                    id: meta.cthsTeacherId, 
                    teacherCode: meta.cthsTeacherCode, 
                    teacherName: meta.cthsTeacherName 
                  }] : [];

              list.forEach((assigned: any) => {
                const match = data.find(t => 
                  (assigned.id && t.id === assigned.id) ||
                  (assigned.teacherCode && t.teacherCode && t.teacherCode.toLowerCase() === assigned.teacherCode.toLowerCase()) ||
                  (assigned.teacherName && t.teacherName && t.teacherName.toLowerCase().trim() === assigned.teacherName.toLowerCase().trim())
                );
                if (match) {
                  matchedIds.add(match.id);
                } else if (assigned.id) {
                  matchedIds.add(assigned.id);
                }
              });
            });
            setSelectedTeacherIds(Array.from(matchedIds));
          }
        })
        .catch(err => {
          toast.error('Không thể tải danh sách giáo viên: ' + err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, selectedActivities]);

  // Trích xuất danh sách giáo viên đã được gán hiện tại kèm chi tiết
  const currentlyAssignedList = useMemo(() => {
    const teacherMap = new Map<string, any>();
    selectedActivities.forEach(act => {
      const meta = act?.meta || {};
      const actInfo = { id: act.id, code: act.code, name: act.name };

      if (Array.isArray(meta.cthsTeachers) && meta.cthsTeachers.length > 0) {
        meta.cthsTeachers.forEach((t: any) => {
          const key = t.id || t.teacherCode || t.teacherName;
          if (key) {
            if (teacherMap.has(key)) {
              const existing = teacherMap.get(key);
              if (!existing.activities.some((a: any) => a.id === act.id)) {
                existing.activities.push(actInfo);
              }
            } else {
              teacherMap.set(key, {
                ...t,
                activities: [actInfo]
              });
            }
          }
        });
      } else if (meta.cthsTeacherName || meta.cthsTeacherId) {
        const key = meta.cthsTeacherId || meta.cthsTeacherCode || meta.cthsTeacherName;
        if (key) {
          if (teacherMap.has(key)) {
            const existing = teacherMap.get(key);
            if (!existing.activities.some((a: any) => a.id === act.id)) {
              existing.activities.push(actInfo);
            }
          } else {
            teacherMap.set(key, {
              id: meta.cthsTeacherId || '',
              teacherCode: meta.cthsTeacherCode || '',
              teacherName: meta.cthsTeacherName || '',
              email: meta.cthsTeacherEmail || '',
              phone: meta.cthsTeacherPhone || '',
              campusName: meta.cthsTeacherCampus || '',
              departmentName: 'Tổ CTHS',
              activities: [actInfo]
            });
          }
        }
      }
    });

    // Làm giàu dữ liệu với danh sách teachers đã load từ hệ thống
    const result = Array.from(teacherMap.values()).map(assigned => {
      const match = teachers.find(t => 
        (assigned.id && t.id === assigned.id) ||
        (assigned.teacherCode && t.teacherCode && t.teacherCode.toLowerCase() === assigned.teacherCode.toLowerCase()) ||
        (assigned.teacherName && t.teacherName && t.teacherName.toLowerCase().trim() === assigned.teacherName.toLowerCase().trim())
      );
      if (match) {
        return {
          ...match,
          activities: assigned.activities
        };
      }
      return assigned;
    });

    return result;
  }, [selectedActivities, teachers]);

  const currentlyAssignedIds = useMemo(() => {
    return new Set(currentlyAssignedList.map(t => t.id).filter(Boolean));
  }, [currentlyAssignedList]);

  const currentlyAssignedCodes = useMemo(() => {
    return new Set(currentlyAssignedList.map(t => (t.teacherCode || '').toLowerCase()).filter(Boolean));
  }, [currentlyAssignedList]);

  const filteredTeachers = useMemo(() => {
    let list = teachers;
    if (filterCTHSOnly) {
      list = list.filter(t => t.isCTHS);
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

  // Toggle 1 giáo viên
  const handleToggleTeacher = (teacherId: string) => {
    setSelectedTeacherIds(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId) 
        : [...prev, teacherId]
    );
  };

  // Chọn tất cả giáo viên đang hiển thị
  const handleSelectAllVisible = () => {
    const visibleIds = filteredTeachers.map(t => t.id);
    const newSelected = Array.from(new Set([...selectedTeacherIds, ...visibleIds]));
    setSelectedTeacherIds(newSelected);
  };

  // Bỏ chọn tất cả giáo viên
  const handleClearAll = () => {
    setSelectedTeacherIds([]);
  };

  // Danh sách các đối tượng GV đang được chọn
  const selectedTeacherObjects = teachers.filter(t => selectedTeacherIds.includes(t.id));

  const handleSubmit = async () => {
    if (selectedActivities.length === 0) {
      toast.error('Chưa có hoạt động nào được chọn');
      return;
    }

    setSaving(true);
    try {
      const teachersPayload: CTHSTeacherAssignment[] = selectedTeacherObjects.map(t => ({
        id: t.id,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
        email: t.email,
        phone: t.phone,
        campusCode: t.campusCode,
        campusName: t.campusName,
        departmentName: t.departmentName,
        position: t.position
      }));

      const payload = {
        action: 'BULK_ASSIGN_CTHS',
        ids: selectedActivities.map(a => a.id),
        teachers: teachersPayload
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
      if (onSaved) onSaved();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50/80 via-emerald-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00A19A]/15 text-[#00A19A] flex items-center justify-center font-bold shadow-2xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span>Phân Công Giáo Viên Tổ CTHS Phụ Trách</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-[#003B3A]">
                  {selectedTeacherIds.length > 0 ? `${selectedTeacherIds.length} GV đã chọn` : 'Chưa chọn'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Gán GV phụ trách điều phối, triển khai cho <span className="font-bold text-[#00A19A]">{selectedActivities.length} hoạt động</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected activities preview */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 truncate mr-2">
            <span className="font-bold text-slate-700 shrink-0">Hoạt động áp dụng:</span>
            <span className="truncate text-slate-500 font-medium">
              {selectedActivities.map(a => `${a.name} (${a.code})`).slice(0, 2).join(' • ')}
              {selectedActivities.length > 2 ? ` và ${selectedActivities.length - 2} hoạt động khác...` : ''}
            </span>
          </div>
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold">
            {selectedActivities.length} hoạt động
          </span>
        </div>

        {/* SECTION: THÔNG TIN GIÁO VIÊN ĐÃ ĐƯỢC GÁN PHỤ TRÁCH HIỆN TẠI */}
        <div className="px-6 pt-3 pb-1">
          <div className={`p-4 rounded-2xl border transition-all ${
            currentlyAssignedList.length > 0 
              ? 'bg-gradient-to-br from-amber-50/70 to-emerald-50/40 border-amber-200/90 shadow-2xs' 
              : 'bg-slate-50/70 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                  currentlyAssignedList.length > 0 ? 'bg-amber-500/20 text-amber-800' : 'bg-slate-200 text-slate-500'
                }`}>
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <span>Thông tin Giáo viên đã được gán hiện tại</span>
                  {currentlyAssignedList.length > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 lowercase">
                      {currentlyAssignedList.length} GV đang phụ trách
                    </span>
                  )}
                </h3>
              </div>
              {currentlyAssignedList.length > 0 && (
                <span className="text-[11px] text-slate-500 font-medium">
                  {selectedActivities.length === 1 ? 'Hoạt động hiện tại' : 'Tất cả hoạt động đã chọn'}
                </span>
              )}
            </div>

            {currentlyAssignedList.length > 0 ? (
              <div className="space-y-2 mt-2.5">
                {currentlyAssignedList.map((t, idx) => {
                  const isCheckedInForm = t.id && selectedTeacherIds.includes(t.id);
                  return (
                    <div 
                      key={t.id || t.teacherCode || idx} 
                      className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs hover:border-[#00A19A] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                          {t.teacherName?.split(' ').slice(-1)[0]?.charAt(0) || 'G'}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black text-slate-900">{t.teacherName}</span>
                            {t.teacherCode && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200">
                                {t.teacherCode}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Đang phụ trách
                            </span>
                            {t.isCTHS && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                                Tổ CTHS
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {(t.campusName || t.campusCode) && (
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                <Building2 className="w-3 h-3 text-[#00A19A]" />
                                {t.campusName || `Sky-Line ${t.campusCode}`}
                              </span>
                            )}
                            {t.departmentName && (
                              <span className="text-slate-600">
                                Tổ: <strong className="text-slate-800">{t.departmentName}</strong>
                              </span>
                            )}
                            {t.position && (
                              <span className="text-slate-600">
                                Chức vụ: <strong className="text-slate-800">{t.position}</strong>
                              </span>
                            )}
                            {t.phone && (
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                {t.phone}
                              </span>
                            )}
                            {t.email && (
                              <span className="inline-flex items-center gap-1 text-slate-500 font-mono text-[10px]">
                                <Mail className="w-3 h-3 text-sky-500" />
                                {t.email}
                              </span>
                            )}
                          </div>

                          {t.activities && t.activities.length > 0 && selectedActivities.length > 1 && (
                            <div className="text-[10px] text-teal-800 bg-teal-50/80 px-2 py-0.5 rounded-md inline-block font-medium">
                              Đã gán cho: {t.activities.map((a: any) => a.name).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {t.id && (
                          <button
                            type="button"
                            onClick={() => handleToggleTeacher(t.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isCheckedInForm
                                ? 'bg-teal-50 text-teal-800 border border-teal-300 hover:bg-teal-100'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            {isCheckedInForm ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-teal-600 stroke-[3]" />
                                <span>Đang giữ phân công</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                                <span>Chọn lại GV này</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200/80 flex items-center gap-2 mt-1">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  Hoạt động này hiện <strong>chưa có Giáo viên phụ trách</strong> được phân công. Hãy tìm kiếm và tích chọn giáo viên ở danh sách bên dưới để gán.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Selected Teachers Chips Bar (When new/existing teachers are selected) */}
        {selectedTeacherObjects.length > 0 && (
          <div className="px-6 py-2.5 bg-teal-50/50 border-y border-teal-100/70">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#00A19A]" />
                Giáo viên sẽ được lưu phân công ({selectedTeacherObjects.length} GV):
              </span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Bỏ chọn tất cả
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {selectedTeacherObjects.map(t => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-teal-200 text-xs font-bold text-teal-950 shadow-2xs group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00A19A]" />
                  <span>{t.teacherName}</span>
                  <span className="text-[10px] text-teal-700 font-mono font-normal">({t.teacherCode})</span>
                  {t.campusCode && (
                    <span className="text-[9px] px-1 rounded bg-teal-100 text-teal-900 font-semibold">{t.campusCode}</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTeacher(t.id);
                    }}
                    className="ml-0.5 text-slate-400 hover:text-rose-600 rounded-full transition-colors cursor-pointer"
                    title="Bỏ chọn GV này"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

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
                placeholder="Tìm GV theo họ tên, mã nhân sự, cơ sở, email, SĐT..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/20 transition-all bg-white"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setFilterCTHSOnly(true)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterCTHSOnly ? 'bg-white text-[#00A19A] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tổ CTHS / HĐNG
              </button>
              <button
                type="button"
                onClick={() => setFilterCTHSOnly(false)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !filterCTHSOnly ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả cán bộ/GV
              </button>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-medium">
              Tìm thấy <strong className="text-slate-700">{filteredTeachers.length}</strong> giáo viên
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-[11px] font-bold text-[#00A19A] hover:underline cursor-pointer"
              >
                + Chọn tất cả ({filteredTeachers.length})
              </button>
              {selectedTeacherIds.length > 0 && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Bỏ chọn tất cả
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Teachers Multi-select List */}
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
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
                const isSelected = selectedTeacherIds.includes(t.id);
                const isCurrentlyAssigned = currentlyAssignedIds.has(t.id) || currentlyAssignedCodes.has((t.teacherCode || '').toLowerCase());

                return (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTeacher(t.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                      isSelected
                        ? 'border-[#00A19A] bg-teal-50/70 ring-2 ring-[#00A19A]/30'
                        : isCurrentlyAssigned
                          ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-50/70'
                          : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox Icon */}
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 ${
                        isSelected 
                          ? 'bg-[#00A19A] text-white' 
                          : 'border-2 border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      {/* Avatar initial */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                        isSelected 
                          ? 'bg-[#003B3A] text-teal-200' 
                          : isCurrentlyAssigned
                            ? 'bg-amber-500 text-white'
                            : t.isCTHS 
                              ? 'bg-teal-100 text-teal-800' 
                              : 'bg-slate-100 text-slate-600'
                      }`}>
                        {t.teacherName.split(' ').slice(-1)[0]?.charAt(0) || 'G'}
                      </div>

                      {/* Teacher details */}
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">{t.teacherName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                            {t.teacherCode}
                          </span>
                          {isCurrentlyAssigned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                              Đang phụ trách hiện tại
                            </span>
                          )}
                          {t.isCTHS && (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                              Tổ CTHS
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {t.campusName && (
                            <span className="flex items-center gap-0.5 font-medium text-slate-700">
                              <Building2 className="w-3 h-3 text-[#00A19A]" />
                              {t.campusCode || t.campusName}
                            </span>
                          )}
                          {t.departmentName && <span className="text-slate-600">• {t.departmentName}</span>}
                          {t.phone && (
                            <span className="text-slate-600 flex items-center gap-0.5">
                              • <Phone className="w-2.5 h-2.5 text-emerald-600" /> {t.phone}
                            </span>
                          )}
                          {t.email && (
                            <span className="text-slate-400 font-mono text-[10px] truncate max-w-[170px]">
                              • {t.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isSelected ? (
                        <span className="text-[11px] font-bold text-[#00A19A] bg-teal-100/80 px-2 py-0.5 rounded-md">
                          Đã chọn
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 hover:text-slate-600">
                          Chọn
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="text-xs text-slate-500">
            {selectedTeacherIds.length > 0 ? (
              <span>
                Đang gán <strong className="text-teal-800 font-black">{selectedTeacherIds.length} giáo viên</strong> cho <strong className="text-slate-800">{selectedActivities.length} hoạt động</strong>
              </span>
            ) : (
              <span className="italic text-slate-400">Chưa chọn giáo viên nào (sẽ gỡ bỏ phụ trách)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 rounded-xl shadow-md shadow-[#00A19A]/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {saving 
                  ? 'Đang lưu...' 
                  : selectedTeacherIds.length > 0 
                    ? `Xác nhận gán (${selectedTeacherIds.length} GV)` 
                    : 'Gỡ bỏ phụ trách'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
