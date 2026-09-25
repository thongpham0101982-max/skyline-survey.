"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Sparkles, Building2, BookOpen, Layers, MapPin, Calendar, Clock, Award, Users, Check, Search, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { SHEET_CONFIGS, SheetCode, CTHSTeacherAssignment } from '@/lib/experiential/catalog-types';
import { normalizeActivityName } from '@/lib/experiential/name-normalizer';

interface CatalogAddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: any;
  activeSheetCode: SheetCode;
  academicYearId: string;
}

export function CatalogAddEditModal({
  isOpen,
  onClose,
  onSaved,
  initialData,
  activeSheetCode,
  academicYearId
}: CatalogAddEditModalProps) {
  const currentSheetCfg = SHEET_CONFIGS.find(s => s.code === activeSheetCode) || SHEET_CONFIGS[1];

  const [formData, setFormData] = useState<any>({
    name: '',
    code: '',
    sheetCode: activeSheetCode,
    educationLevel: currentSheetCfg.level,
    programType: currentSheetCfg.programType,
    grades: currentSheetCfg.defaultGrades,
    themeName: '',
    integratedSubjects: '',
    educationalContent: '',
    learningOutcomes: '',
    organizationFormat: 'Trải nghiệm',
    timeFrame: 'Tháng 10',
    semester: 1,
    expectedLocation: '',
    partners: '',
    primarySubjectName: '',
    coopSubjectNames: '',
    deliverables: '',
    notes: '',
    cthsTeachers: [] as CTHSTeacherAssignment[],
    cthsTeacherId: '',
    cthsTeacherCode: '',
    cthsTeacherName: '',
    cthsTeacherEmail: ''
  });

  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isTeacherPickerOpen, setIsTeacherPickerOpen] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [filterCTHSOnly, setFilterCTHSOnly] = useState(true);

  useEffect(() => {
    fetch('/api/admin/experiential-activities/catalogs/cths-teachers')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTeachers(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialData) {
      const meta = initialData.meta || {};
      
      // Khởi tạo danh sách cthsTeachers
      let initTeachers: CTHSTeacherAssignment[] = [];
      if (Array.isArray(meta.cthsTeachers) && meta.cthsTeachers.length > 0) {
        initTeachers = meta.cthsTeachers;
      } else if (meta.cthsTeacherId || meta.cthsTeacherName) {
        initTeachers = [{
          id: meta.cthsTeacherId || '',
          teacherCode: meta.cthsTeacherCode || '',
          teacherName: meta.cthsTeacherName || '',
          email: meta.cthsTeacherEmail || ''
        }];
      }

      setFormData({
        name: initialData.name || '',
        code: initialData.code || '',
        sheetCode: meta.sheetCode || activeSheetCode,
        educationLevel: meta.educationLevel || currentSheetCfg.level,
        programType: meta.programType || currentSheetCfg.programType,
        grades: meta.grades || currentSheetCfg.defaultGrades,
        themeName: meta.themeName || '',
        integratedSubjects: meta.integratedSubjects || '',
        educationalContent: meta.educationalContent || '',
        learningOutcomes: meta.learningOutcomes || '',
        organizationFormat: meta.organizationFormat || 'Trải nghiệm',
        timeFrame: meta.timeFrame || 'Tháng 10',
        semester: meta.semester || 1,
        expectedLocation: meta.expectedLocation || '',
        partners: meta.partners || '',
        primarySubjectName: meta.primarySubjectName || '',
        coopSubjectNames: meta.coopSubjectNames || '',
        deliverables: meta.deliverables || '',
        notes: meta.notes || '',
        cthsTeachers: initTeachers,
        cthsTeacherId: meta.cthsTeacherId || '',
        cthsTeacherCode: meta.cthsTeacherCode || '',
        cthsTeacherName: meta.cthsTeacherName || '',
        cthsTeacherEmail: meta.cthsTeacherEmail || ''
      });
    } else {
      setFormData({
        name: '',
        code: '',
        sheetCode: activeSheetCode,
        educationLevel: currentSheetCfg.level,
        programType: currentSheetCfg.programType,
        grades: currentSheetCfg.defaultGrades,
        themeName: '',
        integratedSubjects: '',
        educationalContent: '',
        learningOutcomes: '',
        organizationFormat: 'Trải nghiệm',
        timeFrame: 'Tháng 10',
        semester: 1,
        expectedLocation: '',
        partners: '',
        primarySubjectName: '',
        coopSubjectNames: '',
        deliverables: '',
        notes: '',
        cthsTeachers: [] as CTHSTeacherAssignment[],
        cthsTeacherId: '',
        cthsTeacherCode: '',
        cthsTeacherName: '',
        cthsTeacherEmail: ''
      });
    }
    setIsTeacherPickerOpen(false);
  }, [initialData, activeSheetCode, isOpen]);

  // Lọc giáo viên trong danh sách chọn
  const filteredTeachers = useMemo(() => {
    let list = teachers;
    if (filterCTHSOnly) {
      list = list.filter((t: any) => t.isCTHS);
      if (list.length === 0) list = teachers;
    }
    if (teacherSearch.trim()) {
      const q = teacherSearch.toLowerCase().trim();
      list = list.filter((t: any) =>
        t.teacherName?.toLowerCase().includes(q) ||
        t.teacherCode?.toLowerCase().includes(q) ||
        t.campusCode?.toLowerCase().includes(q) ||
        t.campusName?.toLowerCase().includes(q) ||
        t.departmentName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [teachers, filterCTHSOnly, teacherSearch]);

  if (!isOpen) return null;

  // Toggle thêm/bớt giáo viên Tổ CTHS
  const handleToggleTeacher = (t: any) => {
    const currentList: CTHSTeacherAssignment[] = Array.isArray(formData.cthsTeachers) ? [...formData.cthsTeachers] : [];
    const existsIndex = currentList.findIndex(item => item.id === t.id);

    let updatedList: CTHSTeacherAssignment[] = [];
    if (existsIndex >= 0) {
      updatedList = currentList.filter(item => item.id !== t.id);
    } else {
      updatedList = [
        ...currentList,
        {
          id: t.id,
          teacherCode: t.teacherCode || '',
          teacherName: t.teacherName || '',
          email: t.email || '',
          phone: t.phone || '',
          campusCode: t.campusCode || '',
          campusName: t.campusName || '',
          departmentName: t.departmentName || '',
          position: t.position || ''
        }
      ];
    }

    const combinedNames = updatedList.map(item => item.teacherName).filter(Boolean).join(', ');
    const primary = updatedList[0] || null;

    setFormData({
      ...formData,
      cthsTeachers: updatedList,
      cthsTeacherName: combinedNames,
      cthsTeacherId: primary ? primary.id : '',
      cthsTeacherCode: primary ? primary.teacherCode : '',
      cthsTeacherEmail: primary ? primary.email : ''
    });
  };

  // Gỡ bỏ 1 giáo viên khỏi danh sách đã chọn
  const handleRemoveTeacher = (teacherId: string) => {
    const currentList: CTHSTeacherAssignment[] = Array.isArray(formData.cthsTeachers) ? [...formData.cthsTeachers] : [];
    const updatedList = currentList.filter(item => item.id !== teacherId);
    const combinedNames = updatedList.map(item => item.teacherName).filter(Boolean).join(', ');
    const primary = updatedList[0] || null;

    setFormData({
      ...formData,
      cthsTeachers: updatedList,
      cthsTeacherName: combinedNames,
      cthsTeacherId: primary ? primary.id : '',
      cthsTeacherCode: primary ? primary.teacherCode : '',
      cthsTeacherEmail: primary ? primary.email : ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập Tên hoạt động ngoại khóa');
      return;
    }

    // Chuẩn hóa tên hoạt động theo Sentence Case
    const normalizedName = normalizeActivityName(formData.name);

    setSaving(true);
    try {
      const payload = {
        name: normalizedName,
        code: formData.code.trim() || undefined,
        meta: {
          ...formData,
          name: normalizedName,
          academicYearId
        }
      };

      const url = initialData?.id 
        ? `/api/admin/experiential-activities/catalogs/${initialData.id}`
        : '/api/admin/experiential-activities/catalogs';

      const method = initialData?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi lưu thông tin');
      }

      toast.success(initialData?.id ? 'Đã cập nhật hoạt động thành công' : 'Đã thêm mới hoạt động thành công');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50/70 to-emerald-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00A19A]/15 text-[#00A19A] flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800">
                {initialData ? 'Chỉnh sửa Hoạt động Ngoại khóa' : 'Thêm mới Hoạt động Ngoại khóa'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Phân hệ: <span className="font-bold text-[#00A19A]">{currentSheetCfg.title}</span> ({currentSheetCfg.sheetName})
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Thông tin cơ bản */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-[#00A19A]" />
              1. Thông tin chung về hoạt động
            </h3>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Tên hoạt động ngoại khóa <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  Tự động chuẩn hóa: Viết hoa đầu dòng, không viết hoa tất cả
                </span>
              </div>
              <input
                type="text"
                required
                placeholder="Ví dụ: Hành trình khám phá di sản - Khối 1"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                onBlur={e => {
                  const normalized = normalizeActivityName(e.target.value);
                  if (normalized !== formData.name) {
                    setFormData({ ...formData, name: normalized });
                  }
                }}
                className="w-full text-sm font-semibold text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã hoạt động (Tự tạo nếu trống)
                </label>
                <input
                  type="text"
                  placeholder="Để trống hệ thống tự sinh mã"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chủ đề giáo dục
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giáo dục giá trị di sản văn hóa..."
                  value={formData.themeName}
                  onChange={e => setFormData({ ...formData, themeName: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Học kỳ & Thời gian
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={formData.semester}
                    onChange={e => setFormData({ ...formData, semester: parseInt(e.target.value, 10) })}
                    className="w-1/2 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all bg-white"
                  >
                    <option value={1}>Học kỳ 1</option>
                    <option value={2}>Học kỳ 2</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Tháng 10..."
                    value={formData.timeFrame}
                    onChange={e => setFormData({ ...formData, timeFrame: e.target.value })}
                    className="w-1/2 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* GV Tổ CTHS Phụ trách (Chọn 1 hoặc nhiều) */}
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#00A19A]" />
                  <span>Giáo viên / Cán bộ Tổ CTHS phụ trách</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-[#003B3A]">
                    Chọn 1 hoặc nhiều
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsTeacherPickerOpen(!isTeacherPickerOpen)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#00A19A] hover:text-[#003B3A] bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isTeacherPickerOpen ? 'Đóng bộ chọn' : 'Thêm / Thay đổi GV phụ trách'}</span>
                </button>
              </div>

              {/* Badges danh sách GV đã chọn */}
              {Array.isArray(formData.cthsTeachers) && formData.cthsTeachers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formData.cthsTeachers.map((t: CTHSTeacherAssignment) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-teal-200 text-xs font-bold text-teal-950 shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00A19A]" />
                      <span>{t.teacherName}</span>
                      <span className="text-[10px] text-teal-700 font-mono font-normal">({t.teacherCode})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTeacher(t.id)}
                        className="ml-0.5 text-slate-400 hover:text-rose-600 rounded-full transition-colors"
                        title="Bỏ chọn GV này"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Chưa gán giáo viên Tổ CTHS phụ trách. Nhấn "Thêm / Thay đổi GV phụ trách" để chọn.
                </div>
              )}

              {/* Panel chọn GV (Multi-select popup/collapse) */}
              {isTeacherPickerOpen && (
                <div className="mt-3 p-3 bg-white rounded-2xl border border-teal-200 shadow-lg space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={teacherSearch}
                        onChange={e => setTeacherSearch(e.target.value)}
                        placeholder="Tìm GV CTHS theo tên, mã..."
                        className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#00A19A]"
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] shrink-0">
                      <button
                        type="button"
                        onClick={() => setFilterCTHSOnly(true)}
                        className={`px-2 py-1 font-bold rounded-md transition-all ${
                          filterCTHSOnly ? 'bg-white text-[#00A19A] shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Tổ CTHS
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterCTHSOnly(false)}
                        className={`px-2 py-1 font-bold rounded-md transition-all ${
                          !filterCTHSOnly ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Tất cả GV
                      </button>
                    </div>
                  </div>

                  {/* List teachers to pick */}
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {filteredTeachers.map((t: any) => {
                      const isPicked = (formData.cthsTeachers || []).some((item: any) => item.id === t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleToggleTeacher(t)}
                          className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all select-none ${
                            isPicked
                              ? 'border-[#00A19A] bg-teal-50/80 font-bold text-teal-950 ring-1 ring-[#00A19A]/30'
                              : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                              isPicked ? 'bg-[#00A19A] text-white' : 'border border-slate-300 bg-white'
                            }`}>
                              {isPicked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="font-semibold">{t.teacherName}</span>
                            <span className="text-[10px] font-mono text-slate-500">({t.teacherCode})</span>
                            {t.isCTHS && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800">
                                CTHS
                              </span>
                            )}
                          </div>
                          {t.campusCode && (
                            <span className="text-[10px] text-slate-400">CS {t.campusCode}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Chuyên môn & Tích hợp liên môn */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              2. Chuyên môn phụ trách & Tích hợp liên môn
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Môn chủ trì <span className="text-slate-400 font-normal">(Chấm điểm chính)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lịch sử & Địa lí, Khoa học..."
                  value={formData.primarySubjectName}
                  onChange={e => setFormData({ ...formData, primarySubjectName: e.target.value })}
                  className="w-full text-xs font-bold text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Môn phối hợp / TCM phối hợp
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Mỹ thuật, Tiếng Việt, GDTC..."
                  value={formData.coopSubjectNames}
                  onChange={e => setFormData({ ...formData, coopSubjectNames: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Các môn tích hợp
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lịch sử, Địa lí, Mỹ thuật, Tiếng Việt..."
                  value={formData.integratedSubjects}
                  onChange={e => setFormData({ ...formData, integratedSubjects: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Nội dung giáo dục & Yêu cầu cần đạt */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              3. Mục tiêu sư phạm & Yêu cầu cần đạt
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội dung giáo dục
                </label>
                <textarea
                  rows={4}
                  placeholder="- Khám phá Văn hóa - Lịch sử địa phương/dân tộc&#10;- Trải nghiệm Nghệ thuật & Thủ công truyền thống&#10;- Giáo dục ý thức bảo tồn..."
                  value={formData.educationalContent}
                  onChange={e => setFormData({ ...formData, educationalContent: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Yêu cầu cần đạt (Chuẩn đầu ra)
                </label>
                <textarea
                  rows={4}
                  placeholder="- Nhận diện và tái hiện được một số nét đặc trưng cơ bản của di sản&#10;- Hiểu được giá trị của di sản văn hóa đối với đời sống cộng đồng..."
                  value={formData.learningOutcomes}
                  onChange={e => setFormData({ ...formData, learningOutcomes: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sản phẩm học tập / Dự án của học sinh
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tranh Đông Hồ / Bài thu hoạch / Poster bảo vệ môi trường..."
                  value={formData.deliverables}
                  onChange={e => setFormData({ ...formData, deliverables: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hình thức tổ chức
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trải nghiệm, Tham quan dã ngoại, Sự kiện..."
                  value={formData.organizationFormat}
                  onChange={e => setFormData({ ...formData, organizationFormat: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Địa điểm & Đối tác phối hợp */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              4. Địa điểm, Đối tác & Ghi chú tổ chức
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa điểm (dự kiến)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bảo tàng Mỹ thuật Đà Nẵng, Hòa Phú Jungle..."
                  value={formData.expectedLocation}
                  onChange={e => setFormData({ ...formData, expectedLocation: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Đối tác / Đơn vị phối hợp
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bảo tàng, Doanh nghiệp, CLB ngoài..."
                  value={formData.partners}
                  onChange={e => setFormData({ ...formData, partners: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú chuyên môn
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chuẩn bị sổ tay ghi chép, trang phục thể thao..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="text-xs text-slate-500">
            {formData.cthsTeachers?.length > 0 && (
              <span>
                Phụ trách: <strong className="text-teal-800 font-black">{formData.cthsTeachers.length} GV Tổ CTHS</strong> ({formData.cthsTeacherName})
              </span>
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
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : (initialData ? 'Cập nhật hoạt động' : 'Tạo mới hoạt động')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
