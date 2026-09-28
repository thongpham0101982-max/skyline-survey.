"use client";
import React, { useState, useEffect } from 'react';
import { 
  X, Save, Award, CheckCircle2, Sliders, Plus, Trash2, 
  Sparkles, Users, AlertCircle, Info, Calculator, Check, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  ActivityEvaluationConfig, 
  CriterionItem, 
  EvaluationMode,
  EVALUATION_MODE_OPTIONS,
  ActivityCatalogItem 
} from '@/lib/experiential/catalog-types';

interface CatalogEvaluationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  catalogItem: ActivityCatalogItem | null;
}

const DEFAULT_CRITERIA: CriterionItem[] = [
  { id: 'crit-1', name: 'Tính chủ động & Tinh thần tham gia hoạt động', weight: 40, maxScore: 10, description: 'Chủ động, tích cực tham gia các nội dung trải nghiệm' },
  { id: 'crit-2', name: 'Kỹ năng hợp tác, giao tiếp & Làm việc nhóm', weight: 30, maxScore: 10, description: 'Biết lắng nghe, phối hợp cùng đồng đội hoàn thành nhiệm vụ' },
  { id: 'crit-3', name: 'Chất lượng sản phẩm học tập / Dự án trải nghiệm', weight: 30, maxScore: 10, description: 'Sản phẩm sáng tạo, chỉn chu, đạt yêu cầu của bài học' },
];

const DEFAULT_EVENT_ROLES = [
  'Trưởng nhóm / Điều phối viên học sinh',
  'Phó ban / Thư ký ghi chép',
  'Ban tổ chức / Tiết mục văn nghệ',
  'Hậu cần / Kỹ thuật sự kiện',
  'Thành viên tích cực / Nòng cốt',
  'Thành viên tham gia'
];

const PRESET_EVENT_ROLES = [
  'MC / Dẫn chương trình',
  'Đội trưởng thi đấu',
  'Diễn viên văn nghệ',
  'Thuyết minh viên',
  'Tình nguyện viên hỗ trợ'
];

const DEFAULT_COMPLETION_LEVELS = [
  'Hoàn thành tốt',
  'Hoàn thành',
  'Chưa hoàn thành'
];

export function CatalogEvaluationConfigModal({
  isOpen,
  onClose,
  onSaved,
  catalogItem
}: CatalogEvaluationConfigModalProps) {
  const isEventActivity = catalogItem?.meta?.activityCategory === 'HOAT_DONG_SU_KIEN';

  const [mode, setMode] = useState<EvaluationMode>('RUBRIC');
  const [hasRoleAssessment, setHasRoleAssessment] = useState<boolean>(true);
  const [criteria, setCriteria] = useState<CriterionItem[]>(DEFAULT_CRITERIA);
  const [formulaType, setFormulaType] = useState<'AVERAGE' | 'WEIGHTED'>('WEIGHTED');
  const [completionBenchmark, setCompletionBenchmark] = useState<string>('Điểm TB >= 5.0');
  const [rolesList, setRolesList] = useState<string[]>(DEFAULT_EVENT_ROLES);
  const [completionLevels, setCompletionLevels] = useState<string[]>(DEFAULT_COMPLETION_LEVELS);
  const [newRoleInput, setNewRoleInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && catalogItem) {
      const cfg = catalogItem.meta?.evaluationConfig;
      const isEvent = catalogItem.meta?.activityCategory === 'HOAT_DONG_SU_KIEN';

      if (cfg) {
        // Chuẩn hóa mode cũ sang 3 chế độ chuẩn
        const rawMode = String(cfg.mode || '').toUpperCase();
        if (rawMode === 'ROLE_BASED' || rawMode === 'PARTICIPATION_ONLY') {
          setMode('PARTICIPATION_ONLY');
        } else if (rawMode === 'PASS_FAIL' || rawMode === 'COMPLETION_LEVEL') {
          setMode('COMPLETION_LEVEL');
        } else {
          setMode('RUBRIC');
        }

        setHasRoleAssessment(cfg.hasRoleAssessment !== undefined ? cfg.hasRoleAssessment : true);
        setCriteria(Array.isArray(cfg.criteria) && cfg.criteria.length > 0 ? cfg.criteria : DEFAULT_CRITERIA);
        setFormulaType(cfg.formulaType === 'AVERAGE' ? 'AVERAGE' : 'WEIGHTED');
        setCompletionBenchmark(cfg.completionBenchmark || (isEvent ? 'Tham gia đầy đủ sự kiện' : 'Điểm TB >= 5.0'));
        setRolesList(Array.isArray(cfg.rolesList) && cfg.rolesList.length > 0 ? cfg.rolesList : DEFAULT_EVENT_ROLES);
        setCompletionLevels(Array.isArray(cfg.completionLevels) && cfg.completionLevels.length > 0 ? cfg.completionLevels : DEFAULT_COMPLETION_LEVELS);
      } else {
        if (isEvent) {
          setMode('PARTICIPATION_ONLY');
          setCompletionBenchmark('Tham gia đầy đủ sự kiện');
        } else {
          setMode('RUBRIC');
          setCompletionBenchmark('Điểm TB >= 5.0');
        }
        setHasRoleAssessment(true);
        setCriteria(DEFAULT_CRITERIA);
        setFormulaType('WEIGHTED');
        setRolesList(DEFAULT_EVENT_ROLES);
        setCompletionLevels(DEFAULT_COMPLETION_LEVELS);
      }
    }
  }, [isOpen, catalogItem]);

  if (!isOpen || !catalogItem) return null;

  // Tính tổng trọng số
  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isWeightValid = mode !== 'RUBRIC' || formulaType !== 'WEIGHTED' || totalWeight === 100;

  // Cân bằng đều trọng số sao cho tổng đúng 100%
  const handleAutoBalanceWeights = () => {
    if (criteria.length === 0) return;
    const baseWeight = Math.floor(100 / criteria.length);
    const remainder = 100 - baseWeight * criteria.length;

    const updated = criteria.map((c, idx) => ({
      ...c,
      weight: idx === 0 ? baseWeight + remainder : baseWeight
    }));
    setCriteria(updated);
    toast.success('Đã tự động cân bằng đều các tiêu chí tổng đúng 100%!');
  };

  const handleAddCriterion = () => {
    const newId = `crit-${Date.now()}`;
    const newWeight = Math.max(0, 100 - totalWeight);
    setCriteria([
      ...criteria,
      { id: newId, name: 'Tiêu chí đánh giá mới', weight: newWeight > 0 ? newWeight : 10, maxScore: 10, description: '' }
    ]);
  };

  const handleUpdateCriterion = (index: number, field: keyof CriterionItem, value: any) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  };

  const handleRemoveCriterion = (index: number) => {
    if (criteria.length <= 1) {
      toast.error('Phải giữ lại ít nhất 1 tiêu chí đánh giá');
      return;
    }
    setCriteria(criteria.filter((_, idx) => idx !== index));
  };

  // Quản lý vai trò
  const handleAddRole = (roleName: string) => {
    const trimmed = roleName.trim();
    if (!trimmed) return;
    if (rolesList.includes(trimmed)) {
      toast.error('Vai trò này đã có trong danh sách');
      return;
    }
    setRolesList([...rolesList, trimmed]);
    setNewRoleInput('');
  };

  const handleRemoveRole = (roleIndex: number) => {
    if (rolesList.length <= 1) {
      toast.error('Phải giữ lại ít nhất 1 vai trò');
      return;
    }
    setRolesList(rolesList.filter((_, idx) => idx !== roleIndex));
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
        rolesList: rolesList,
        completionLevels: mode === 'COMPLETION_LEVEL' ? completionLevels : []
      };

      const res = await fetch(`/api/admin/experiential-activities/catalogs/${catalogItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta: {
            ...catalogItem.meta,
            evaluationConfig
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi lưu cấu hình');
      }

      toast.success('Đã lưu Ma trận Hình thức Đánh giá thành công!');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50/90 via-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00A19A]/15 text-[#00A19A] flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-800">
                  Ma Trận Hình Thức Đánh Giá Hoạt Động
                </h2>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isEventActivity 
                    ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                    : 'bg-teal-100 text-[#003B3A] border border-teal-200'
                }`}>
                  {isEventActivity ? 'Hoạt động sự kiện' : 'Trải nghiệm / Dự án'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Hoạt động: <strong className="text-slate-800">{catalogItem.name}</strong> ({catalogItem.code})
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
          
          {/* ======================================================== */}
          {/* 1. CHỌN 1 TRONG 3 CHẾ ĐỘ ĐÁNH GIÁ (MA TRẬN HÌNH THỨC)    */}
          {/* ======================================================== */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#00A19A]" />
                <span>1. Lựa chọn Chế độ Đánh giá</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Chọn 1 trong 3 ma trận đánh giá chuẩn</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {EVALUATION_MODE_OPTIONS.map((opt) => {
                const isSelected = mode === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setMode(opt.value)}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? `${opt.bgCls} ${opt.borderCls} border-2 shadow-md ring-2 ring-slate-900/5`
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${opt.badgeCls}`}>
                          {opt.shortLabel}
                        </span>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      <h4 className="text-xs font-black text-slate-800 leading-snug mb-1">
                        {opt.name}
                      </h4>
                      <div className="text-[11px] font-bold text-slate-600 mb-2">
                        {opt.tagline}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[10px] text-slate-400 font-medium space-y-0.5">
                      {opt.components.map((comp, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-slate-600">
                          <span className="w-1 h-1 rounded-full bg-slate-400" />
                          <span>{comp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. CẤU HÌNH CHI TIẾT THEO CHẾ ĐỘ ĐÃ CHỌN                 */}
          {/* ======================================================== */}

          {/* --- CHẾ ĐỘ 1: CHỈ GHI NHẬN THAM GIA --- */}
          {mode === 'PARTICIPATION_ONLY' && (
            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-purple-900 font-extrabold text-xs">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Quy cách vận hành Chế độ 1: Ghi nhận Tham gia & Vai trò</span>
              </div>
              <ul className="text-xs text-purple-800/90 space-y-1.5 list-disc pl-4 font-medium">
                <li><strong>Điểm danh:</strong> Ghi nhận tình trạng Có mặt, Vắng có phép, Vắng không phép, Miễn tham gia.</li>
                <li><strong>Vai trò học sinh:</strong> Đánh giá mức độ tích cực thông qua vai trò đảm nhận trong sự kiện.</li>
                <li><strong>Nhận xét:</strong> Giáo viên nhập nhận xét hoặc đính kèm ảnh/minh chứng khen ngợi.</li>
                <li><strong>Không áp dụng:</strong> Không chấm điểm số định lượng, không bắt buộc rubric.</li>
              </ul>
            </div>
          )}

          {/* --- CHẾ ĐỘ 2: ĐÁNH GIÁ MỨC HOÀN THÀNH --- */}
          {mode === 'COMPLETION_LEVEL' && (
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                <span>Cấu hình các Mức hoàn thành đánh giá</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {completionLevels.map((lvl, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white border border-amber-200/70 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{idx + 1}. {lvl}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Mức {3 - idx}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-amber-800 font-medium">
                * Giáo viên chỉ cần chọn 1 trong các mức trên cho từng học sinh cùng với điểm danh và vai trò.
              </p>
            </div>
          )}

          {/* --- CHẾ ĐỘ 3: ĐÁNH GIÁ THEO RUBRIC --- */}
          {mode === 'RUBRIC' && (
            <div className="space-y-4 p-4 rounded-2xl bg-teal-50/40 border border-teal-200/80 animate-in fade-in duration-200">
              
              {/* Chọn công thức tính điểm: Đồng trọng số vs Dùng trọng số */}
              <div className="bg-white p-3.5 rounded-2xl border border-teal-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-[#00A19A]" />
                    <span className="text-xs font-black text-slate-800">Công thức tính điểm kết quả Rubric:</span>
                  </div>

                  <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFormulaType('AVERAGE')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        formulaType === 'AVERAGE'
                          ? 'bg-[#003B3A] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Đồng trọng số (Chia đều)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormulaType('WEIGHTED')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        formulaType === 'WEIGHTED'
                          ? 'bg-[#003B3A] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Dùng trọng số (Tổng = 100%)
                    </button>
                  </div>
                </div>

                {/* Mô tả công thức trực quan */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                  {formulaType === 'AVERAGE' ? (
                    <div className="flex items-center gap-2 font-mono text-slate-700">
                      <span className="font-bold text-[#003B3A]">Điểm TB</span>
                      <span>=</span>
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                        (Tổng điểm các tiêu chí) / {criteria.length} tiêu chí
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 font-mono text-slate-700 flex-wrap">
                      <span className="font-bold text-[#003B3A]">Điểm kết quả</span>
                      <span>=</span>
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                        Σ(Điểm tiêu chí × Trọng số %)
                      </span>
                      <span className="text-slate-400 text-[11px] font-sans font-normal">(Yêu cầu tổng trọng số phải = 100%)</span>
                    </div>
                  )}

                  {formulaType === 'WEIGHTED' && (
                    <button
                      type="button"
                      onClick={handleAutoBalanceWeights}
                      className="px-2.5 py-1 rounded-lg bg-teal-100 hover:bg-teal-200 text-[#003B3A] text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Tự động chia đều 100%
                    </button>
                  )}
                </div>

                {/* Thanh kiểm soát tổng trọng số khi dùng WEIGHTED */}
                {formulaType === 'WEIGHTED' && (
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    totalWeight === 100
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {totalWeight === 100 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>
                        Tổng trọng số hiện tại: <strong>{totalWeight}%</strong>
                        {totalWeight === 100 ? ' (Hợp lệ)' : ' — Bắt buộc phải bằng đúng 100% mới được lưu'}
                      </span>
                    </div>
                    {totalWeight !== 100 && (
                      <span className="text-[11px] font-normal underline cursor-pointer" onClick={handleAutoBalanceWeights}>
                        Bấm để sửa ngay
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Danh sách tiêu chí Rubric */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Danh sách Tiêu chí Rubric ({criteria.length} tiêu chí)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#00A19A] hover:bg-[#003B3A] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm tiêu chí</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {criteria.map((crit, idx) => (
                    <div key={crit.id || idx} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={crit.name}
                          onChange={(e) => handleUpdateCriterion(idx, 'name', e.target.value)}
                          placeholder="Tên tiêu chí đánh giá..."
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00A19A]"
                        />

                        {formulaType === 'WEIGHTED' && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[11px] font-bold text-slate-500">Trọng số:</span>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={crit.weight}
                                onChange={(e) => handleUpdateCriterion(idx, 'weight', parseInt(e.target.value, 10) || 0)}
                                className="w-16 px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00A19A]"
                              />
                              <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">%</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] font-bold text-slate-500">Thang:</span>
                          <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700">10</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCriterion(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa tiêu chí"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={crit.description || ''}
                        onChange={(e) => handleUpdateCriterion(idx, 'description', e.target.value)}
                        placeholder="Mô tả yêu cầu cần đạt hoặc hướng dẫn chấm..."
                        className="w-full px-3 py-1 rounded-lg border border-slate-100 text-[11px] text-slate-500 focus:outline-none focus:border-slate-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. THIẾT LẬP DANH SÁCH VAI TRÒ HỌC SINH (CHUNG)          */}
          {/* ======================================================== */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>2. Danh mục Vai trò Học sinh ({rolesList.length} vai trò)</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">GV lựa chọn khi chấm điểm danh & tham gia</span>
            </div>

            {/* Tags vai trò */}
            <div className="flex flex-wrap gap-1.5">
              {rolesList.map((role, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200/90 shadow-2xs"
                >
                  <span>{role}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(idx)}
                    className="text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Thêm vai trò mới */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newRoleInput}
                onChange={(e) => setNewRoleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRole(newRoleInput);
                  }
                }}
                placeholder="Nhập vai trò học sinh mới..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00A19A]"
              />
              <button
                type="button"
                onClick={() => handleAddRole(newRoleInput)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                + Thêm vai trò
              </button>
            </div>

            {/* Gợi ý nhanh */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-bold text-slate-400">Gợi ý nhanh:</span>
              {PRESET_EVENT_ROLES.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddRole(r)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200/60 hover:bg-slate-200 text-slate-600 font-medium transition-colors"
                >
                  + {r}
                </button>
              ))}
            </div>
          </div>

          {/* ======================================================== */}
          {/* NÚT LƯU & THÔNG BÁO                                      */}
          {/* ======================================================== */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500 font-medium">
              {!isWeightValid && (
                <span className="text-rose-600 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Tổng trọng số phải bằng 100% để hoàn tất lưu!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={saving || !isWeightValid}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                  saving || !isWeightValid
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 shadow-md shadow-[#00A19A]/20'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
