"use client";
import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles, Building2, BookOpen, Layers, MapPin, Calendar, Clock, Award, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { SHEET_CONFIGS, SheetCode } from '@/lib/experiential/catalog-types';

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
    cthsTeacherId: '',
    cthsTeacherCode: '',
    cthsTeacherName: '',
    cthsTeacherEmail: ''
  });

  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);

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
        cthsTeacherId: '',
        cthsTeacherCode: '',
        cthsTeacherName: '',
        cthsTeacherEmail: ''
      });
    }
  }, [initialData, activeSheetCode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập Tên hoạt động ngoại khóa');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        meta: {
          ...formData,
          academicYearId
        }
      };

      const url = initialData?.id 
        ? `/api/admin/experiential-activities/catalogs/${initialData.id}`
        : `/api/admin/experiential-activities/catalogs`;
      const method = initialData?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi lưu dữ liệu');
      }

      toast.success(initialData?.id ? 'Đã cập nhật hoạt động thành công' : 'Đã thêm hoạt động vào danh mục thành công');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi hệ thống');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00A19A]/10 text-[#00A19A] flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800">
                {initialData ? 'Chỉnh sửa Hoạt động Ngoại khóa' : 'Thêm mới Hoạt động vào Danh mục'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Phân hệ: <span className="font-bold text-[#00A19A]">{currentSheetCfg.title}</span> • Quản lý bởi Ban ĐHCM & Tổ CTHS
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
              1. Thông tin chung & Định danh hoạt động
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên hoạt động ngoại khóa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hành trình khám phá sắc màu di sản..."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã hoạt động (Tự sinh nếu trống)
                </label>
                <input
                  type="text"
                  placeholder="HDNK-THS-01..."
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full text-xs font-mono px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/20 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  Khối lớp áp dụng (phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 1, 2, 3 hoặc Khối 1..."
                  value={Array.isArray(formData.grades) ? formData.grades.join(', ') : formData.grades}
                  onChange={e => setFormData({ ...formData, grades: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Học kỳ & Thời gian
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.semester}
                    onChange={e => setFormData({ ...formData, semester: parseInt(e.target.value, 10) })}
                    className="w-1/2 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] bg-white font-medium"
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

            {/* GV Tổ CTHS Phụ trách */}
            <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80">
              <label className="block text-xs font-bold text-teal-900 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#00A19A]" />
                  Giáo viên / Cán bộ Tổ CTHS phụ trách hoạt động
                </span>
                {formData.cthsTeacherName && (
                  <span className="text-[11px] font-semibold text-[#00A19A]">
                    Đã chọn: {formData.cthsTeacherName} ({formData.cthsTeacherCode})
                  </span>
                )}
              </label>
              <select
                value={formData.cthsTeacherId || ''}
                onChange={e => {
                  const tId = e.target.value;
                  const t = teachers.find((x: any) => x.id === tId);
                  setFormData({
                    ...formData,
                    cthsTeacherId: t ? t.id : '',
                    cthsTeacherCode: t ? t.teacherCode : '',
                    cthsTeacherName: t ? t.teacherName : '',
                    cthsTeacherEmail: t ? t.email : ''
                  });
                }}
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-teal-200 bg-white focus:outline-hidden focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/20 transition-all text-slate-800"
              >
                <option value="">-- Chưa phân công (Để trống) --</option>
                {teachers.filter((t: any) => t.isCTHS).length > 0 && (
                  <optgroup label="⭐ Cán bộ / Giáo viên Tổ CTHS & HĐNG">
                    {teachers.filter((t: any) => t.isCTHS).map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.teacherName} ({t.teacherCode}) {t.campusCode ? `- CS ${t.campusCode}` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Tất cả cán bộ & Giáo viên">
                  {teachers.filter((t: any) => !t.isCTHS).map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.teacherName} ({t.teacherCode}) {t.campusCode ? `- CS ${t.campusCode}` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
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
                  placeholder="Chuẩn bị học cụ, tài liệu, lưu ý y tế..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#00A19A] hover:bg-[#008983] text-white shadow-md shadow-[#00A19A]/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu...' : (initialData ? 'Lưu cập nhật' : 'Thêm vào danh mục')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
