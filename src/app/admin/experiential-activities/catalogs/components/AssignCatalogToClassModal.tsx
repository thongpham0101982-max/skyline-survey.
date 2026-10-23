"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, Check, Sparkles, GraduationCap, Users, Calendar, MapPin, 
  BookOpen, Award, Compass, CheckCircle2, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SKYLINE_ACTIVITY_TYPES, STANDARD_STUDENT_ROLES_6 } from '@/lib/experiential/constants';

interface AssignCatalogToClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogItem: any;
  academicYearId?: string;
  onSuccess?: () => void;
}

export function AssignCatalogToClassModal({
  isOpen,
  onClose,
  catalogItem,
  academicYearId,
  onSuccess
}: AssignCatalogToClassModalProps) {
  const router = useRouter();

  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [semester, setSemester] = useState<number>(1);
  const [timeRange, setTimeRange] = useState<string>('');
  const [evalMode, setEvalMode] = useState<string>('ROLE_BASED');

  const meta = catalogItem?.meta || {};

  // Load teacher classes
  useEffect(() => {
    if (isOpen) {
      setLoadingClasses(true);
      fetch('/api/classes?scope=my_teaching_classes')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setMyClasses(data);
            // Default to first homeroom class
            const firstHomeroom = data.find((c: any) => c.isHomeroom || c.roleInClass === 'GVCN');
            setSelectedClassId(firstHomeroom?.id || data[0].id);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingClasses(false));

      // Preset from catalogItem
      setSemester(Number(meta.semester) || 1);
      setTimeRange(meta.timeFrame || 'Trong năm học');
      setEvalMode(meta.evalConfig?.mode || 'ROLE_BASED');
    }
  }, [isOpen, catalogItem, meta]);

  if (!isOpen || !catalogItem) return null;

  const targetClass = myClasses.find(c => c.id === selectedClassId) || myClasses[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClass) {
      toast.error('Vui lòng chọn lớp tiếp nhận hoạt động');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: catalogItem.name,
        catalogId: catalogItem.id,
        academicYearId: academicYearId || meta.academicYearId,
        educationLevel: targetClass.level || meta.educationLevel || 'PHO_THONG',
        grades: [targetClass.grade || '7'],
        themeName: meta.themeName || catalogItem.theme?.name || 'Văn hóa – Truyền thống',
        educationalContent: meta.educationalContent || meta.learningOutcomes || `Kế hoạch HĐTN cho lớp ${targetClass.className}`,
        description: meta.educationalContent || `Hoạt động trải nghiệm của lớp ${targetClass.className}`,
        integratedSubjects: meta.coopSubjectNames || meta.integratedSubjects || '',
        location: meta.expectedLocation || 'Theo kế hoạch của lớp',
        leadTeacherName: meta.subjectTeacherName || meta.cthsTeacherName || '',
        evalMode: evalMode || 'ROLE_BASED',
        criteria: meta.evalConfig?.criteria || [],
        activityTypeId: meta.activityTypeId || catalogItem.typeId || 'THAM_QUAN',
        activityTypeName: SKYLINE_ACTIVITY_TYPES.find(t => t.id === meta.activityTypeId)?.name || 'Hoạt động trải nghiệm',
        scale: 'LOP',
        semester: Number(semester) || 1,
        timeRange: timeRange || `Học kỳ ${semester}`,
        objectives: meta.learningOutcomes || meta.educationalContent || 'Rèn luyện phẩm chất và năng lực học sinh qua hoạt động thực tế',
        status: 'ASSIGNED',
        assignedClasses: [
          {
            classId: targetClass.id,
            className: targetClass.className,
            grade: targetClass.grade,
            level: targetClass.level,
            campusId: targetClass.campusId,
            campusCode: targetClass.campus?.campusCode || 'CS',
            subjectTeacherName: meta.subjectTeacherName || '',
            status: 'DRAFT',
            totalStudents: targetClass._count?.students || 0,
            evaluatedStudents: 0
          }
        ]
      };

      const res = await fetch('/api/experiential-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Lỗi khi thêm hoạt động vào lớp');
      }

      const created = await res.json();
      toast.success(`Đã thêm hoạt động vào lớp ${targetClass.className}! Đang chuyển sang bảng đánh giá vai trò học sinh...`);
      onClose();
      if (onSuccess) onSuccess();

      if (created?.id) {
        router.push(`/teacher/experiential-activities/${created.id}?classId=${targetClass.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối khi gán hoạt động');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A19A] p-5 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md font-bold text-teal-200 shadow-2xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Thêm Vào Lớp & Đánh Giá Vai Trò Học Sinh</span>
              </h2>
              <p className="text-xs text-teal-100 font-medium">
                Dành cho GVCN: Gán hoạt động từ Danh mục vào lớp và tiến hành đánh giá
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-sans flex-1">
          
          {/* Activity Info Summary Card */}
          <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200/90 space-y-2">
            <div className="flex items-center gap-2">
              {catalogItem.code && (
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-teal-900 border border-teal-200">
                  {catalogItem.code}
                </span>
              )}
              <h3 className="font-black text-sm text-[#003B3A]">
                {catalogItem.name}
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
              <div>
                <span className="text-slate-400 font-bold">Chủ đề:</span>{' '}
                <strong className="text-teal-900">{meta.themeName || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold">Môn học:</span>{' '}
                <strong className="text-indigo-900">{meta.primarySubjectName || 'HĐTN'}</strong>
              </div>
              {meta.timeFrame && (
                <div className="col-span-2">
                  <span className="text-slate-400 font-bold">Thời gian kế hoạch:</span>{' '}
                  <span className="font-semibold text-slate-800">{meta.timeFrame}</span> (Học kỳ {meta.semester || 1})
                </div>
              )}
            </div>
          </div>

          {/* Chọn Lớp Tiếp Nhận */}
          <div>
            <label className="block text-xs font-black text-slate-800 mb-1 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#00A19A]" />
              <span>Chọn Lớp tiếp nhận hoạt động:</span>
              <span className="text-red-500">*</span>
            </label>
            {loadingClasses ? (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                Đang tải danh sách lớp...
              </div>
            ) : myClasses.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                Không tìm thấy lớp học phụ trách của Thầy/Cô.
              </div>
            ) : (
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#00A19A] focus:outline-hidden font-bold bg-white text-slate-900 cursor-pointer shadow-2xs"
              >
                {myClasses.map(c => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.className} {c.isHomeroom ? '⭐ (GVCN)' : '(GVBM)'} — {c.campus?.campusName || `Khối ${c.grade}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Học kỳ & Thời gian */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                Học kỳ
              </label>
              <select
                value={semester}
                onChange={e => setSemester(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#00A19A] focus:outline-hidden font-bold bg-white cursor-pointer"
              >
                <option value={1}>Học kỳ 1</option>
                <option value={2}>Học kỳ 2</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                Thời gian dự kiến
              </label>
              <input
                type="text"
                value={timeRange}
                onChange={e => setTimeRange(e.target.value)}
                placeholder="Ví dụ: Tháng 10/2026, Tuần 8"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#00A19A] focus:outline-hidden font-medium"
              />
            </div>
          </div>

          {/* HÌNH THỨC ĐÁNH GIÁ (TRỌNG TÂM: 6 VAI TRÒ HỌC SINH) */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-300/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                Hình thức đánh giá học sinh trong lớp:
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                Bổ sung Hồ sơ học sinh cuối năm
              </span>
            </div>

            <select
              value={evalMode}
              onChange={e => setEvalMode(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-amber-300 focus:border-[#00A19A] focus:outline-hidden font-black text-slate-900 bg-white cursor-pointer"
            >
              <option value="ROLE_BASED">👥 Đánh giá theo 6 Vai trò Học sinh (Khuyên dùng cho GVCN)</option>
              <option value="CRITERIA">📊 Theo Rubric Tiêu chí Năng lực (4 Mức chuẩn)</option>
              <option value="PARTICIPATION_ONLY">✅ Điểm danh Tham gia (Đạt / Chưa đạt)</option>
            </select>

            {/* 6 vai trò học sinh preview */}
            {evalMode === 'ROLE_BASED' && (
              <div className="pt-1 space-y-1.5">
                <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                  <span>6 Vai trò Học sinh sẽ được dùng để phân công & ghi nhận:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {STANDARD_STUDENT_ROLES_6.map(r => (
                    <div key={r.name} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-amber-200 text-[11px]">
                      <span>{r.icon}</span>
                      <span className="font-bold text-slate-800">{r.name}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10.5px] text-amber-800 italic pt-0.5">
                  💡 Ngay sau khi bấm xác nhận, hệ thống sẽ tự động khởi tạo danh sách học sinh của lớp và đưa Thầy/Cô đến ngay bảng phân công & đánh giá vai trò học sinh.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={submitting || myClasses.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 shadow-md shadow-teal-700/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang khởi tạo...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" strokeWidth={3} />
                  <span>Thêm Vào Lớp & Đánh Giá Vai Trò Học Sinh Ngay &rarr;</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
