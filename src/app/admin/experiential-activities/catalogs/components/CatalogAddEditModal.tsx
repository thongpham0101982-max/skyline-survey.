"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Save, Sparkles, Building2, BookOpen, Layers, MapPin, 
  Calendar, Clock, Award, Users, Check, Search, Plus, Sliders, GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  SHEET_CONFIGS, 
  SheetCode, 
  CTHSTeacherAssignment,
  CatalogEducationLevel,
  ProgramType,
  EDUCATION_LEVEL_OPTIONS,
  PROGRAM_TYPE_OPTIONS,
  ActivityEvaluationConfig,
  CatalogActivityCategory,
  ACTIVITY_CATEGORY_OPTIONS
} from '@/lib/experiential/catalog-types';
import { normalizeActivityName } from '@/lib/experiential/name-normalizer';
import { CatalogEvaluationConfigModal } from './CatalogEvaluationConfigModal';

interface CatalogAddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: any;
  activeSheetCode: SheetCode;
  academicYearId: string;
}

const ALL_GRADES = [
  'Mầm non', 
  'Khối 1', 'Khối 2', 'Khối 3', 'Khối 4', 'Khối 5',
  'Khối 6', 'Khối 7', 'Khối 8', 'Khối 9',
  'Khối 10', 'Khối 11', 'Khối 12'
];

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
    activityCategory: 'TRAI_NGHIEM_DU_AN' as CatalogActivityCategory,
    sheetCode: activeSheetCode,
    educationLevel: currentSheetCfg.level,
    educationLevels: [currentSheetCfg.level] as CatalogEducationLevel[],
    programType: currentSheetCfg.programType,
    programTypes: [currentSheetCfg.programType] as ProgramType[],
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
    cthsTeacherEmail: '',
    evaluationConfig: undefined as ActivityEvaluationConfig | undefined
  });

  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isTeacherPickerOpen, setIsTeacherPickerOpen] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [filterCTHSOnly, setFilterCTHSOnly] = useState(true);
  const [isEvalConfigModalOpen, setIsEvalConfigModalOpen] = useState(false);

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

      const initEduLevels: CatalogEducationLevel[] = Array.isArray(meta.educationLevels) && meta.educationLevels.length > 0
        ? meta.educationLevels
        : [meta.educationLevel || currentSheetCfg.level];

      const initProgramTypes: ProgramType[] = Array.isArray(meta.programTypes) && meta.programTypes.length > 0
        ? meta.programTypes
        : [meta.programType || currentSheetCfg.programType];

      const initCategory: CatalogActivityCategory = meta.activityCategory || (
        (meta.name && (meta.name.toLowerCase().includes('khai mạc') || meta.name.toLowerCase().includes('trung thu') || meta.name.toLowerCase().includes('lễ hội') || meta.name.toLowerCase().includes('ngày hội') || meta.name.toLowerCase().includes('sport day'))) ||
        (meta.organizationFormat && (meta.organizationFormat.toLowerCase().includes('sự kiện') || meta.organizationFormat.toLowerCase().includes('hội thi')))
          ? 'HOAT_DONG_SU_KIEN'
          : 'TRAI_NGHIEM_DU_AN'
      );

      setFormData({
        name: initialData.name || '',
        code: initialData.code || '',
        activityCategory: initCategory,
        sheetCode: meta.sheetCode || activeSheetCode,
        educationLevel: initEduLevels[0] || currentSheetCfg.level,
        educationLevels: initEduLevels,
        programType: initProgramTypes[0] || currentSheetCfg.programType,
        programTypes: initProgramTypes,
        grades: Array.isArray(meta.grades) && meta.grades.length > 0 ? meta.grades : currentSheetCfg.defaultGrades,
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
        cthsTeacherEmail: meta.cthsTeacherEmail || '',
        evaluationConfig: meta.evaluationConfig
      });
    } else {
      setFormData({
        name: '',
        code: '',
        activityCategory: 'TRAI_NGHIEM_DU_AN' as CatalogActivityCategory,
        sheetCode: activeSheetCode,
        educationLevel: currentSheetCfg.level,
        educationLevels: [currentSheetCfg.level],
        programType: currentSheetCfg.programType,
        programTypes: [currentSheetCfg.programType],
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
        cthsTeacherEmail: '',
        evaluationConfig: undefined
      });
    }
    setIsTeacherPickerOpen(false);
  }, [initialData, activeSheetCode, isOpen]);

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

  // Toggle Bậc học (multi-select)
  const handleToggleEduLevel = (level: CatalogEducationLevel) => {
    const current: CatalogEducationLevel[] = formData.educationLevels || [];
    let updated: CatalogEducationLevel[];
    if (current.includes(level)) {
      if (current.length <= 1) {
        toast.error('Phải chọn ít nhất 1 bậc học');
        return;
      }
      updated = current.filter(l => l !== level);
    } else {
      updated = [...current, level];
    }
    setFormData({
      ...formData,
      educationLevels: updated,
      educationLevel: updated[0] || 'TIEU_HOC'
    });
  };

  // Toggle Hệ học (multi-select)
  const handleToggleProgramType = (prog: ProgramType) => {
    const current: ProgramType[] = formData.programTypes || [];
    let updated: ProgramType[];
    if (current.includes(prog)) {
      if (current.length <= 1) {
        toast.error('Phải chọn ít nhất 1 hệ học');
        return;
      }
      updated = current.filter(p => p !== prog);
    } else {
      updated = [...current, prog];
    }
    setFormData({
      ...formData,
      programTypes: updated,
      programType: updated[0] || 'HE_S'
    });
  };

  // Toggle Khối lớp
  const handleToggleGrade = (gradeStr: string) => {
    const current: string[] = formData.grades || [];
    let updated: string[];
    if (current.includes(gradeStr)) {
      if (current.length <= 1) {
        toast.error('Phải chọn ít nhất 1 khối lớp');
        return;
      }
      updated = current.filter(g => g !== gradeStr);
    } else {
      updated = [...current, gradeStr];
    }
    setFormData({ ...formData, grades: updated });
  };

  // Toggle GV Tổ CTHS
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
    <>
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
                  Hệ thống quản lý HĐTN • Cấu hình Đa bậc học, Đa hệ học & Thiết lập tiêu chí đánh giá
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
            {/* Section 1: Thông tin chung về hoạt động */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-[#00A19A]" />
                1. Thông tin chung về hoạt động
              </h3>

              {/* Phân loại danh mục hoạt động */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-gradient-to-r from-teal-50/70 via-purple-50/50 to-indigo-50/60 border border-teal-200/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#00A19A]" />
                    Phân loại danh mục hoạt động <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    formData.activityCategory === 'HOAT_DONG_SU_KIEN' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-teal-100 text-[#003B3A]'
                  }`}>
                    {formData.activityCategory === 'HOAT_DONG_SU_KIEN' ? 'Chỉ tính vai trò & tham gia' : 'Có thiết lập tiêu chí Rubric'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ACTIVITY_CATEGORY_OPTIONS.map(opt => {
                    const isSelected = formData.activityCategory === opt.value;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => {
                          const updatedEval = opt.value === 'HOAT_DONG_SU_KIEN'
                            ? {
                                mode: 'ROLE_BASED' as const,
                                modeTitle: 'Ghi nhận tham gia & Vai trò học sinh',
                                hasRoleAssessment: true,
                                criteria: [],
                                rolesList: formData.evaluationConfig?.rolesList || [
                                  'Trưởng nhóm / Điều phối viên học sinh',
                                  'Phó nhóm / Thư ký ghi chép',
                                  'Ban tổ chức / Tiết mục văn nghệ',
                                  'Thành viên tích cực / Nòng cốt',
                                  'Thành viên tham gia'
                                ],
                                completionBenchmark: 'Tham gia đầy đủ sự kiện'
                              }
                            : formData.evaluationConfig;
                          setFormData({ 
                            ...formData, 
                            activityCategory: opt.value,
                            evaluationConfig: updatedEval
                          });
                        }}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#00A19A] bg-white ring-2 ring-[#00A19A]/20 shadow-xs'
                            : 'border-slate-200/90 bg-white/70 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-extrabold ${isSelected ? 'text-[#003B3A]' : 'text-slate-800'}`}>
                            {opt.label}
                          </span>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isSelected ? 'bg-[#00A19A] text-white' : 'border border-slate-300'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {opt.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

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
                  placeholder="Ví dụ: Hành trình khám phá di sản văn hóa - Cấp Khối"
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

              {/* BẬC HỌC (CHỌN 1 HOẶC NHIỀU) & HỆ HỌC (CHỌN 1 HOẶC NHIỀU) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                {/* Chọn Bậc học */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Bậc học (chọn 1 hay nhiều bậc học):</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EDUCATION_LEVEL_OPTIONS.map(opt => {
                      const isSelected = (formData.educationLevels || []).includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleToggleEduLevel(opt.value)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300/40'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'border border-slate-300'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chọn Hệ học */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-teal-600" />
                    <span>Hệ học (chọn 1 hay nhiều hệ):</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PROGRAM_TYPE_OPTIONS.map(opt => {
                      const isSelected = (formData.programTypes || []).includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleToggleProgramType(opt.value)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                            isSelected
                              ? 'bg-[#00A19A] text-white shadow-xs ring-2 ring-[#00A19A]/30'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-teal-300'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'border border-slate-300'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                          <span>{opt.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Chọn Khối lớp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Khối lớp áp dụng (chọn 1 hoặc nhiều khối):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_GRADES.map(g => {
                    const isSelected = (formData.grades || []).includes(g) || (formData.grades || []).includes(g.replace('Khối ', ''));
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleToggleGrade(g)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 text-white font-bold shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
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
                    Thời gian & Học kỳ
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

              {/* GV PHỤ TRÁCH KẾ HOẠCH (TỔ CTHS) */}
              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#00A19A]" />
                    <span>GV Phụ trách Kế hoạch (Tổ CTHS / BP HĐNGLL)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-[#003B3A]">
                      Chọn 1 hoặc nhiều GV
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
                    Chưa gán GV phụ trách kế hoạch. Nhấn "Thêm / Thay đổi GV phụ trách" để chọn.
                  </div>
                )}

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

            {/* Section 2: Chuyên môn phối hợp & Sản phẩm học tập */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                2. Chuyên môn phụ trách & Sản phẩm học tập
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Môn phối hợp / Tích hợp <span className="text-slate-400 font-normal">(Môn chủ trì & phối hợp)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Lịch sử & Địa lí, Mỹ thuật, Tiếng Việt, GDTC..."
                    value={formData.coopSubjectNames || formData.integratedSubjects}
                    onChange={e => setFormData({ 
                      ...formData, 
                      coopSubjectNames: e.target.value,
                      integratedSubjects: e.target.value,
                      primarySubjectName: e.target.value.split(/[,;\/]/)[0]?.trim() || formData.primarySubjectName
                    })}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sản phẩm / Học tập dự án của học sinh
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Tranh Đông Hồ / Bài thu hoạch / Poster bảo vệ môi trường / Video..."
                    value={formData.deliverables}
                    onChange={e => setFormData({ ...formData, deliverables: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Địa điểm dự kiến
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
                    Hình thức tổ chức
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Trải nghiệm, Tham quan dã ngoại, Hội thi..."
                    value={formData.organizationFormat}
                    onChange={e => setFormData({ ...formData, organizationFormat: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Thiết lập Cấu hình & Hình thức đánh giá */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  3. {formData.activityCategory === 'HOAT_DONG_SU_KIEN' ? 'Vai trò học sinh tham gia sự kiện' : 'Cấu hình & Tiêu chí đánh giá'}
                </h3>
                {initialData?.id && (
                  <button
                    type="button"
                    onClick={() => setIsEvalConfigModalOpen(true)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      formData.activityCategory === 'HOAT_DONG_SU_KIEN'
                        ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200'
                        : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{formData.activityCategory === 'HOAT_DONG_SU_KIEN' ? 'Tùy chỉnh danh sách vai trò HS' : 'Thiết lập chi tiết tiêu chí Rubric'}</span>
                  </button>
                )}
              </div>

              {formData.activityCategory === 'HOAT_DONG_SU_KIEN' ? (
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-1.5">
                  <div className="text-xs font-bold text-purple-950 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-700" />
                    <span>Hoạt động sự kiện: Chỉ tính vai trò tham gia của học sinh & điểm danh</span>
                  </div>
                  <p className="text-[11px] text-purple-900 leading-relaxed">
                    Học sinh tham gia sự kiện sẽ được GVCN / Ban tổ chức ghi nhận vai trò (Trưởng ban, Diễn viên, Thành viên tích cực...) và điểm danh tham gia. Hệ thống không tính điểm số hay xếp loại kết quả qua Rubric.
                  </p>
                  <div className="pt-1 flex flex-wrap gap-1">
                    {(formData.evaluationConfig?.rolesList || [
                      'Trưởng nhóm', 'Phó ban', 'Ban tổ chức', 'Thành viên tích cực', 'Thành viên tham gia'
                    ]).map((r: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-purple-800 border border-purple-200">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-amber-950 flex items-center gap-2">
                      <span>Hình thức:</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold text-[11px]">
                        {formData.evaluationConfig?.mode === 'PASS_FAIL' ? 'Đạt / Chưa đạt' 
                          : formData.evaluationConfig?.mode === 'ROLE_BASED' ? 'Theo Vai trò học sinh'
                          : formData.evaluationConfig?.mode === 'SCORE_10' ? 'Thang điểm 10'
                          : `Tiêu chí Rubric (${formData.evaluationConfig?.criteria?.length || 3} tiêu chí)`}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-800 mt-1">
                      Chuẩn đạt: <strong>{formData.evaluationConfig?.completionBenchmark || 'Điểm TB >= 5.0'}</strong>
                      {formData.evaluationConfig?.hasRoleAssessment && (
                        <span className="ml-2 font-medium">• Có đánh giá vai trò (Trưởng nhóm / Thành viên)</span>
                      )}
                    </div>
                  </div>

                  {!initialData?.id && (
                    <span className="text-[11px] text-slate-400 italic">
                      (Có thể cấu hình tiêu chí chuyên sâu sau khi tạo)
                    </span>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Yêu cầu cần đạt & Ghi chú thực hiện
                </label>
                <textarea
                  rows={3}
                  placeholder="Yêu cầu chuẩn đầu ra và hướng dẫn phối hợp thực hiện..."
                  value={formData.learningOutcomes}
                  onChange={e => setFormData({ ...formData, learningOutcomes: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all resize-none"
                />
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
            <div className="text-xs text-slate-500">
              Phạm vi: <strong className="text-slate-800">{(formData.educationLevels || []).length} bậc học</strong> • <strong className="text-slate-800">{(formData.programTypes || []).length} hệ</strong>
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

      {/* Sub-modal: Thiết lập Tiêu chí & Công thức đánh giá */}
      {isEvalConfigModalOpen && initialData && (
        <CatalogEvaluationConfigModal
          isOpen={isEvalConfigModalOpen}
          onClose={() => setIsEvalConfigModalOpen(false)}
          onSaved={() => {
            setIsEvalConfigModalOpen(false);
            onSaved();
          }}
          catalogItem={initialData}
        />
      )}
    </>
  );
}
