"use client";
import React, { useState, useEffect } from 'react';
import { 
  X, Save, Award, CheckCircle2, Sliders, Plus, Trash2, 
  HelpCircle, Sparkles, Scale, Users, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  ActivityEvaluationConfig, 
  CriterionItem, 
  EvaluationMode,
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

const DEFAULT_ROLES = [
  'Trưởng nhóm / Điều phối viên học sinh',
  'Phó nhóm / Thư ký ghi chép',
  'Thành viên tích cực / Nòng cốt',
  'Thành viên tham gia'
];

export function CatalogEvaluationConfigModal({
  isOpen,
  onClose,
  onSaved,
  catalogItem
}: CatalogEvaluationConfigModalProps) {
  const [mode, setMode] = useState<EvaluationMode>('CRITERIA');
  const [hasRoleAssessment, setHasRoleAssessment] = useState<boolean>(true);
  const [criteria, setCriteria] = useState<CriterionItem[]>(DEFAULT_CRITERIA);
  const [formulaType, setFormulaType] = useState<'AVERAGE' | 'WEIGHTED' | 'HIGHEST' | 'PASS_ALL'>('WEIGHTED');
  const [completionBenchmark, setCompletionBenchmark] = useState<string>('Điểm TB >= 5.0');
  const [rolesList, setRolesList] = useState<string[]>(DEFAULT_ROLES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && catalogItem) {
      const cfg = catalogItem.meta?.evaluationConfig;
      if (cfg) {
        setMode(cfg.mode || 'CRITERIA');
        setHasRoleAssessment(cfg.hasRoleAssessment !== undefined ? cfg.hasRoleAssessment : true);
        setCriteria(Array.isArray(cfg.criteria) && cfg.criteria.length > 0 ? cfg.criteria : DEFAULT_CRITERIA);
        setFormulaType(cfg.formulaType || 'WEIGHTED');
        setCompletionBenchmark(cfg.completionBenchmark || 'Điểm TB >= 5.0');
        setRolesList(Array.isArray(cfg.rolesList) && cfg.rolesList.length > 0 ? cfg.rolesList : DEFAULT_ROLES);
      } else {
        setMode('CRITERIA');
        setHasRoleAssessment(true);
        setCriteria(DEFAULT_CRITERIA);
        setFormulaType('WEIGHTED');
        setCompletionBenchmark('Điểm TB >= 5.0');
        setRolesList(DEFAULT_ROLES);
      }
    }
  }, [isOpen, catalogItem]);

  if (!isOpen || !catalogItem) return null;

  // Tổng trọng số các tiêu chí
  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  const handleAddCriterion = () => {
    const newId = `crit-${Date.now()}`;
    setCriteria([
      ...criteria,
      { id: newId, name: 'Tiêu chí đánh giá mới', weight: 10, maxScore: 10, description: '' }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'CRITERIA' && formulaType === 'WEIGHTED' && totalWeight !== 100) {
      if (!confirm(`Tổng trọng số hiện tại là ${totalWeight}% (khác 100%). Bạn có chắc chắn muốn lưu cấu hình này?`)) {
        return;
      }
    }

    setSaving(true);
    try {
      const evaluationConfig: ActivityEvaluationConfig = {
        mode,
        modeTitle: mode === 'CRITERIA' ? 'Đánh giá theo Tiêu chí Rubric' 
          : mode === 'PASS_FAIL' ? 'Đánh giá Đạt / Chưa đạt' 
          : mode === 'ROLE_BASED' ? 'Đánh giá theo Vai trò học sinh' 
          : 'Đánh giá theo Thang điểm 10',
        hasRoleAssessment,
        criteria: mode === 'CRITERIA' ? criteria : [],
        formulaType,
        completionBenchmark,
        rolesList: hasRoleAssessment ? rolesList : []
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

      toast.success('Đã lưu Cấu hình & Tiêu chí đánh giá thành công!');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
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
            <div className="w-10 h-10 rounded-2xl bg-[#00A19A]/15 text-[#00A19A] flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span>Thiết Lập Cấu Hình & Tiêu Chí Đánh Giá</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Hoạt động: <strong className="text-[#00A19A]">{catalogItem.name}</strong> ({catalogItem.code})
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
          {/* Section 1: Chọn hình thức đánh giá chính */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#00A19A]" />
              1. Hình thức đánh giá cho hoạt động
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <div
                onClick={() => setMode('CRITERIA')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  mode === 'CRITERIA'
                    ? 'border-[#00A19A] bg-teal-50/80 ring-2 ring-[#00A19A]/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Tiêu chí Rubric</span>
                  {mode === 'CRITERIA' && <Check className="w-4 h-4 text-[#00A19A] stroke-[3]" />}
                </div>
                <p className="text-[11px] text-slate-500">Chấm điểm theo các tiêu chí năng lực (trọng số %)</p>
              </div>

              <div
                onClick={() => setMode('PASS_FAIL')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  mode === 'PASS_FAIL'
                    ? 'border-[#00A19A] bg-teal-50/80 ring-2 ring-[#00A19A]/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Đạt / Chưa đạt</span>
                  {mode === 'PASS_FAIL' && <Check className="w-4 h-4 text-[#00A19A] stroke-[3]" />}
                </div>
                <p className="text-[11px] text-slate-500">Đánh giá theo mức độ hoàn thành nội dung</p>
              </div>

              <div
                onClick={() => setMode('SCORE_10')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  mode === 'SCORE_10'
                    ? 'border-[#00A19A] bg-teal-50/80 ring-2 ring-[#00A19A]/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Thang điểm 10</span>
                  {mode === 'SCORE_10' && <Check className="w-4 h-4 text-[#00A19A] stroke-[3]" />}
                </div>
                <p className="text-[11px] text-slate-500">Chấm 1 cột điểm tổng kết chung từ 0 đến 10</p>
              </div>

              <div
                onClick={() => setMode('ROLE_BASED')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  mode === 'ROLE_BASED'
                    ? 'border-[#00A19A] bg-teal-50/80 ring-2 ring-[#00A19A]/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Theo Vai trò</span>
                  {mode === 'ROLE_BASED' && <Check className="w-4 h-4 text-[#00A19A] stroke-[3]" />}
                </div>
                <p className="text-[11px] text-slate-500">Đánh giá dựa trên vai trò nhiệm vụ trong nhóm</p>
              </div>
            </div>
          </div>

          {/* Section 2: Đánh giá vai trò học sinh (Có thể kết hợp với mọi hình thức) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00A19A]" />
                <span className="text-xs font-bold text-slate-800">
                  Tích hợp Đánh giá Vai trò Học sinh trong nhóm / hoạt động
                </span>
              </div>
              <input
                type="checkbox"
                checked={hasRoleAssessment}
                onChange={e => setHasRoleAssessment(e.target.checked)}
                className="w-4 h-4 rounded text-[#00A19A] focus:ring-[#00A19A]"
              />
            </label>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Khi bật tính năng này, GVCN và GVBM có thể phân loại và ghi nhận học sinh theo các vai trò: <em>Trưởng nhóm, Phó nhóm, Thành viên tích cực, Thành viên tham gia</em> để tính điểm cộng hoặc vinh danh.
            </p>
          </div>

          {/* Section 3: Bảng tiêu chí Rubric (Khi chọn mode === 'CRITERIA') */}
          {mode === 'CRITERIA' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-indigo-500" />
                    2. Thiết lập Danh sách Tiêu chí Đánh giá
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tổng trọng số hiện tại: <strong className={totalWeight === 100 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>{totalWeight}%</strong> (Khuyến nghị = 100%)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCriterion}
                  className="flex items-center gap-1 text-xs font-bold text-[#00A19A] hover:bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm tiêu chí</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {criteria.map((crit, idx) => (
                  <div
                    key={crit.id || idx}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row items-stretch md:items-center gap-3 shadow-2xs"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black shrink-0">
                      {idx + 1}
                    </div>

                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={crit.name}
                        onChange={e => handleUpdateCriterion(idx, 'name', e.target.value)}
                        placeholder="Tên tiêu chí (VD: Tinh thần hợp tác, Sáng tạo sản phẩm...)"
                        className="w-full text-xs font-bold text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#00A19A]"
                      />
                      <input
                        type="text"
                        value={crit.description || ''}
                        onChange={e => handleUpdateCriterion(idx, 'description', e.target.value)}
                        placeholder="Mô tả yêu cầu cần đạt của tiêu chí..."
                        className="w-full text-[11px] text-slate-500 px-2.5 py-1 rounded-lg border border-dashed border-slate-200 focus:outline-hidden focus:border-[#00A19A]"
                      />
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500 font-medium">Trọng số:</span>
                        <div className="relative w-16">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={crit.weight}
                            onChange={e => handleUpdateCriterion(idx, 'weight', parseInt(e.target.value, 10) || 0)}
                            className="w-full text-xs font-bold text-center py-1 px-1 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#00A19A]"
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-400">%</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500 font-medium">Điểm tối đa:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={crit.maxScore || 10}
                          onChange={e => handleUpdateCriterion(idx, 'maxScore', parseInt(e.target.value, 10) || 10)}
                          className="w-14 text-xs font-bold text-center py-1 px-1 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#00A19A]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa tiêu chí này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Công thức tính điểm & Chuẩn hoàn thành */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {mode === 'CRITERIA' ? '3.' : '2.'} Công thức tính kết quả & Chuẩn hoàn thành
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phương thức tổng hợp điểm
                </label>
                <select
                  value={formulaType}
                  onChange={e => setFormulaType(e.target.value as any)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#00A19A]"
                >
                  <option value="WEIGHTED">Bình quân gia quyền theo trọng số % (Khuyến nghị)</option>
                  <option value="AVERAGE">Trung bình cộng các tiêu chí</option>
                  <option value="PASS_ALL">Đạt tất cả tiêu chí mới tính là Hoàn thành</option>
                  <option value="HIGHEST">Lấy điểm cao nhất</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chuẩn đạt / Ngưỡng hoàn thành
                </label>
                <input
                  type="text"
                  value={completionBenchmark}
                  onChange={e => setCompletionBenchmark(e.target.value)}
                  placeholder="Ví dụ: Điểm TB >= 5.0, Hoàn thành đầy đủ..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A]"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="text-xs text-slate-500">
            Hình thức: <strong className="text-slate-800">{mode === 'CRITERIA' ? `Rubric (${criteria.length} tiêu chí)` : mode}</strong>
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
              <span>{saving ? 'Đang lưu...' : 'Lưu cấu hình đánh giá'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
