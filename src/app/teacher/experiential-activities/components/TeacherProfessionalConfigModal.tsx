"use client";
import React, { useState, useEffect } from 'react';
import { 
  X, Save, Sparkles, BookOpen, Layers, Award, CheckCircle2, 
  Sliders, Plus, Trash2, GraduationCap, Check, AlertCircle, 
  MapPin, Clock, Users, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  ActivityEvaluationConfig, 
  CriterionItem, 
  EvaluationMode, 
  EVALUATION_MODE_OPTIONS 
} from '@/lib/experiential/catalog-types';

interface TeacherProfessionalConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  activityId: string;
  initialData: any;
}

const DEFAULT_CRITERIA: CriterionItem[] = [
  { id: 'crit-1', name: 'Tính chủ động & Tinh thần tham gia hoạt động', weight: 40, maxScore: 10, description: 'Chủ động, tích cực tham gia các nội dung trải nghiệm' },
  { id: 'crit-2', name: 'Kỹ năng hợp tác, giao tiếp & Làm việc nhóm', weight: 30, maxScore: 10, description: 'Biết lắng nghe, phối hợp cùng đồng đội hoàn thành nhiệm vụ' },
  { id: 'crit-3', name: 'Chất lượng sản phẩm học tập / Dự án trải nghiệm', weight: 30, maxScore: 10, description: 'Sản phẩm sáng tạo, chỉn chu, đạt yêu cầu của bài học' },
];

export const DEFAULT_EVENT_ROLES = [
  'Trưởng nhóm / Điều phối viên học sinh',
  'Phó ban / Thư ký ghi chép',
  'Ban tổ chức / Tiết mục văn nghệ',
  'Hậu cần / Kỹ thuật sự kiện',
  'Thành viên tích cực / Nòng cốt',
  'Thành viên tham gia'
];

export function TeacherProfessionalConfigModal({
  isOpen,
  onClose,
  onSaved,
  activityId,
  initialData
}: TeacherProfessionalConfigModalProps) {
  const [saving, setSaving] = useState(false);

  // 4 Core Professional Fields + Nội dung giáo dục
  const [educationalContent, setEducationalContent] = useState('');
  const [learningOutcomes, setLearningOutcomes] = useState('');
  const [organizationFormat, setOrganizationFormat] = useState('Trải nghiệm');
  const [deliverables, setDeliverables] = useState('');
  const [expectedLocation, setExpectedLocation] = useState('');
  const [primarySubjectName, setPrimarySubjectName] = useState('');
  const [coopSubjectNames, setCoopSubjectNames] = useState('');

  // Evaluation Config fields
  const [mode, setMode] = useState<EvaluationMode>('RUBRIC');
  const [criteria, setCriteria] = useState<CriterionItem[]>(DEFAULT_CRITERIA);
  const [formulaType, setFormulaType] = useState<'AVERAGE' | 'WEIGHTED'>('WEIGHTED');
  const [completionBenchmark, setCompletionBenchmark] = useState<string>('Điểm TB >= 5.0');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(DEFAULT_EVENT_ROLES);
  const [newRoleInput, setNewRoleInput] = useState('');

  useEffect(() => {
    if (!isOpen || !initialData) return;

    setEducationalContent(initialData.educationalContent || initialData.description || '');
    setLearningOutcomes(initialData.objectives || initialData.learningOutcomes || '');
    setOrganizationFormat(initialData.organizationFormat || 'Trải nghiệm');
    setDeliverables(initialData.deliverables || '');
    setExpectedLocation(initialData.location || initialData.expectedLocation || '');
    setPrimarySubjectName(initialData.subjectName || initialData.primarySubjectName || '');
    setCoopSubjectNames(initialData.integratedSubjects || initialData.coopSubjectNames || '');

    const cfg = initialData.evaluationConfig || {};
    const rawMode = String(cfg.mode || initialData.evalMode || '').toUpperCase();
    if (rawMode === 'ROLE_BASED' || rawMode === 'PARTICIPATION_ONLY') {
      setMode('PARTICIPATION_ONLY');
    } else if (rawMode === 'PASS_FAIL' || rawMode === 'COMPLETION_LEVEL') {
      setMode('COMPLETION_LEVEL');
    } else {
      setMode('RUBRIC');
    }

    if (Array.isArray(cfg.criteria) && cfg.criteria.length > 0) {
      setCriteria(cfg.criteria);
    } else if (Array.isArray(initialData.criteria) && initialData.criteria.length > 0) {
      setCriteria(initialData.criteria);
    } else {
      setCriteria(DEFAULT_CRITERIA);
    }

    setFormulaType(cfg.formulaType === 'AVERAGE' || initialData.formulaType === 'EQUAL_WEIGHT' ? 'AVERAGE' : 'WEIGHTED');
    setCompletionBenchmark(cfg.completionBenchmark || initialData.completionBenchmark || 'Điểm TB >= 5.0');

    if (Array.isArray(cfg.rolesList) && cfg.rolesList.length > 0) {
      setSelectedRoles(cfg.rolesList);
    } else if (Array.isArray(initialData.rolesList) && initialData.rolesList.length > 0) {
      setSelectedRoles(initialData.rolesList);
    } else {
      setSelectedRoles(DEFAULT_EVENT_ROLES);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  const handleAddCriterion = () => {
    const newId = `crit-${Date.now()}`;
    const newCrit: CriterionItem = {
      id: newId,
      name: `Tiêu chí ${criteria.length + 1}`,
      weight: 20,
      maxScore: 10,
      description: 'Mô tả tiêu chí đánh giá...'
    };
    setCriteria(prev => [...prev, newCrit]);
  };

  const handleUpdateCriterion = (index: number, field: keyof CriterionItem, val: any) => {
    setCriteria(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleRemoveCriterion = (index: number) => {
    if (criteria.length <= 1) {
      toast.error('Hoạt động cần tối thiểu 1 tiêu chí đánh giá');
      return;
    }
    setCriteria(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddRole = (role: string) => {
    const trimmed = role.trim();
    if (!trimmed) return;
    if (!selectedRoles.includes(trimmed)) {
      setSelectedRoles(prev => [...prev, trimmed]);
      setNewRoleInput('');
      toast.success(`Đã thêm: ${trimmed}`);
    }
  };

  const handleRemoveRole = (role: string) => {
    if (selectedRoles.length <= 1) {
      toast.error('Cần ít nhất 1 vai trò học sinh');
      return;
    }
    setSelectedRoles(prev => prev.filter(r => r !== role));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'RUBRIC' && formulaType === 'WEIGHTED' && totalWeight !== 100) {
      toast.error(`Tổng trọng số hiện tại là ${totalWeight}%. Yêu cầu tổng trọng số các tiêu chí phải đúng 100%!`);
      return;
    }

    setSaving(true);
    try {
      const modeOption = EVALUATION_MODE_OPTIONS.find(m => m.value === mode) || EVALUATION_MODE_OPTIONS[2];

      const evaluationConfig: ActivityEvaluationConfig = {
        mode,
        modeTitle: modeOption.name,
        hasRoleAssessment: true,
        criteria: mode === 'RUBRIC' ? criteria : [],
        formulaType: mode === 'RUBRIC' ? formulaType : 'AVERAGE',
        completionBenchmark,
        rolesList: selectedRoles,
        completionLevels: mode === 'COMPLETION_LEVEL' ? ['Hoàn thành tốt', 'Hoàn thành', 'Chưa hoàn thành'] : []
      };

      const payload = {
        name: initialData?.name,
        code: initialData?.code,
        academicYearId: initialData?.academicYearId,
        campusId: initialData?.campusId,
        educationLevel: initialData?.educationLevel,
        grades: initialData?.grades,
        educationalContent,
        description: educationalContent,
        learningOutcomes,
        objectives: learningOutcomes,
        organizationFormat,
        deliverables,
        location: expectedLocation,
        locationText: expectedLocation,
        subjectName: primarySubjectName,
        primarySubjectName,
        integratedSubjects: coopSubjectNames,
        coopSubjectNames,
        evaluationConfig,
        evalMode: mode === 'PARTICIPATION_ONLY' ? 'ROLE_BASED' : (mode === 'COMPLETION_LEVEL' ? 'PASS_FAIL' : 'CRITERIA'),
        criteria: mode === 'RUBRIC' ? criteria : [],
        formulaType: formulaType === 'AVERAGE' ? 'EQUAL_WEIGHT' : 'WEIGHTED',
        rolesList: selectedRoles,
        completionBenchmark,
        syncCatalog: true
      };

      const res = await fetch(`/api/experiential-activities/${activityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi lưu thông tin');
      }

      toast.success('Đã lưu Cấu hình Chuyên môn & Tiêu chí thành công!');
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50/80 via-emerald-50/70 to-indigo-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00A19A] text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  Cấu hình Chuyên môn & Tiêu chí Đánh giá
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-[#003B3A] border border-teal-200">
                  GV Phụ trách / TCM
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {initialData?.name || 'Hoạt động trải nghiệm & ngoại khóa'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Banner hướng dẫn */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950 leading-relaxed font-medium">
              <strong className="font-extrabold text-indigo-900">Nhiệm vụ của Giáo viên Phụ trách: </strong>
              Kính nhờ Thầy/Cô hoàn tất cấu hình: <strong>Nội dung giáo dục</strong>, <strong>Yêu cầu cần đạt</strong>, <strong>Hình thức tổ chức</strong>, <strong>Sản phẩm học tập dự án</strong> và <strong>Cấu hình & Tiêu chí đánh giá</strong> để phục vụ quá trình triển khai và bổ sung Hồ sơ Học sinh cuối năm.
            </div>
          </div>

          {/* 1. NỘI DUNG GIÁO DỤC */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#00A19A]" />
                <span>Nội dung giáo dục</span>
                <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Hiển thị trên cột Danh mục HĐTN & Ngoại khóa
              </span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Mô tả tóm tắt nội dung giáo dục trải nghiệm (Ví dụ: Xem phim tại rạp, tham gia thảo luận nhóm, giải quyết tình huống văn hóa giao tiếp bằng tiếng Anh...)"
              value={educationalContent}
              onChange={e => setEducationalContent(e.target.value)}
              className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/20 transition-all resize-none"
            />
          </div>

          {/* 2. YÊU CẦU CẦN ĐẠT */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                <span>1. Yêu cầu cần đạt (Chuẩn đầu ra)</span>
                <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                Phẩm chất, năng lực, kỹ năng mong đợi
              </span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Mô tả chuẩn đầu ra, thái độ, kỹ năng học sinh cần đạt được sau khi tham gia hoạt động..."
              value={learningOutcomes}
              onChange={e => setLearningOutcomes(e.target.value)}
              className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
            />
          </div>

          {/* 3. HÌNH THỨC TỔ CHỨC & SẢN PHẨM HỌC TẬP DỰ ÁN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                <span>2. Hình thức tổ chức</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Trải nghiệm thực địa, Tham quan dã ngoại, CLB, Dự án..."
                value={organizationFormat}
                onChange={e => setOrganizationFormat(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. Sản phẩm học tập dự án</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Bài thu hoạch nhóm, Poster bảo vệ môi trường, Video..."
                value={deliverables}
                onChange={e => setDeliverables(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* MÔN PHỐI HỢP & ĐỊA ĐIỂM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Môn phối hợp / Tích hợp
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Lịch sử & Địa lí, Mỹ thuật, Tiếng Anh..."
                value={coopSubjectNames}
                onChange={e => setCoopSubjectNames(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Địa điểm dự kiến</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Đại Nội Huế / Rạp Metiz Cinema..."
                value={expectedLocation}
                onChange={e => setExpectedLocation(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] transition-all"
              />
            </div>
          </div>

          {/* 4. CẤU HÌNH & TIÊU CHÍ ĐÁNH GIÁ */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>4. Cấu hình & Tiêu chí đánh giá</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-500">
                Chọn chế độ đánh giá phù hợp
              </span>
            </div>

            {/* Chế độ đánh giá */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {EVALUATION_MODE_OPTIONS.map(opt => {
                const isSelected = mode === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setMode(opt.value)}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#00A19A] bg-teal-50/70 shadow-xs'
                        : 'border-slate-100 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-slate-900">{opt.name}</span>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-[#00A19A] text-white' : 'border border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{opt.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Chi tiết cho RUBRIC */}
            {mode === 'RUBRIC' && (
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-black text-amber-950 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-600" />
                    <span>Thiết lập các tiêu chí Rubric</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      formulaType === 'WEIGHTED' && totalWeight !== 100
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {formulaType === 'WEIGHTED' ? `Tổng trọng số: ${totalWeight}% / 100%` : 'Đồng trọng số'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={formulaType}
                      onChange={e => setFormulaType(e.target.value as any)}
                      className="text-xs font-bold px-2.5 py-1 bg-white border border-amber-300 rounded-xl"
                    >
                      <option value="WEIGHTED">Có tính trọng số (%)</option>
                      <option value="AVERAGE">Tính trung bình (Đồng trọng số)</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddCriterion}
                      className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm tiêu chí</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {criteria.map((crit, idx) => (
                    <div key={crit.id} className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={crit.name}
                          onChange={e => handleUpdateCriterion(idx, 'name', e.target.value)}
                          placeholder="Tên tiêu chí năng lực..."
                          className="flex-1 text-xs font-bold text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-amber-500"
                        />
                        {formulaType === 'WEIGHTED' && (
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={crit.weight}
                              onChange={e => handleUpdateCriterion(idx, 'weight', parseInt(e.target.value, 10) || 0)}
                              className="w-16 text-xs font-bold text-center px-1 py-1.5 rounded-lg border border-slate-200"
                            />
                            <span className="text-xs font-bold text-slate-600">%</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveCriterion(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Xóa tiêu chí này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={crit.description || ''}
                        onChange={e => handleUpdateCriterion(idx, 'description', e.target.value)}
                        placeholder="Mô tả tiêu chuẩn đạt tiêu chí..."
                        className="w-full text-[11px] text-slate-600 px-2.5 py-1 rounded-lg border border-slate-100 bg-slate-50"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="text-xs font-bold text-amber-950">Chuẩn hoàn thành hoạt động:</label>
                  <input
                    type="text"
                    value={completionBenchmark}
                    onChange={e => setCompletionBenchmark(e.target.value)}
                    placeholder="Ví dụ: Điểm TB >= 5.0"
                    className="text-xs font-bold px-3 py-1 bg-white border border-amber-300 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Chi tiết cho DANH SÁCH VAI TRÒ HỌC SINH */}
            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-700" />
                  <span>Danh sách Vai trò Học sinh (Dành cho GVCN ghi nhận)</span>
                </label>
                <span className="text-[10px] text-purple-700 font-bold">
                  {selectedRoles.length} vai trò khả dụng
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedRoles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-purple-200 text-xs font-bold text-purple-900 shadow-2xs"
                  >
                    <span>{role}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(role)}
                      className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Thêm vai trò mới (Ví dụ: Thuyết trình viên, Thủ quỹ nhóm...)"
                  value={newRoleInput}
                  onChange={e => setNewRoleInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRole(newRoleInput);
                    }
                  }}
                  className="flex-1 text-xs px-3 py-1.5 bg-white border border-purple-200 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => handleAddRole(newRoleInput)}
                  className="text-xs font-bold px-3 py-1.5 bg-purple-600 text-white rounded-xl shadow-2xs hover:bg-purple-700 transition-all cursor-pointer"
                >
                  Thêm vai trò
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <span className="text-xs text-slate-500 font-medium">
            Tự động đồng bộ với Danh mục gốc toàn hệ thống
          </span>
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
              <span>{saving ? 'Đang lưu...' : 'Lưu Cấu hình Chuyên môn'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
