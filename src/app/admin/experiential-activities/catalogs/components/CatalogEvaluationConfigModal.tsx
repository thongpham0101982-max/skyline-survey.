"use client";
import React, { useState, useEffect } from 'react';
import { 
  X, Save, Award, CheckCircle2, Sliders, Plus, Trash2, 
  HelpCircle, Sparkles, Scale, Users, Check, AlertCircle, Tag
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

export function CatalogEvaluationConfigModal({
  isOpen,
  onClose,
  onSaved,
  catalogItem
}: CatalogEvaluationConfigModalProps) {
  const isEventActivity = catalogItem?.meta?.activityCategory === 'HOAT_DONG_SU_KIEN';

  const [mode, setMode] = useState<EvaluationMode>('CRITERIA');
  const [hasRoleAssessment, setHasRoleAssessment] = useState<boolean>(true);
  const [criteria, setCriteria] = useState<CriterionItem[]>(DEFAULT_CRITERIA);
  const [formulaType, setFormulaType] = useState<'AVERAGE' | 'WEIGHTED' | 'HIGHEST' | 'PASS_ALL'>('WEIGHTED');
  const [completionBenchmark, setCompletionBenchmark] = useState<string>('Điểm TB >= 5.0');
  const [rolesList, setRolesList] = useState<string[]>(DEFAULT_EVENT_ROLES);
  const [newRoleInput, setNewRoleInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && catalogItem) {
      const cfg = catalogItem.meta?.evaluationConfig;
      const isEvent = catalogItem.meta?.activityCategory === 'HOAT_DONG_SU_KIEN';

      if (isEvent) {
        setMode('ROLE_BASED');
        setHasRoleAssessment(true);
        setRolesList(Array.isArray(cfg?.rolesList) && cfg.rolesList.length > 0 ? cfg.rolesList : DEFAULT_EVENT_ROLES);
        setCompletionBenchmark(cfg?.completionBenchmark || 'Tham gia đầy đủ sự kiện');
      } else {
        if (cfg) {
          setMode(cfg.mode || 'CRITERIA');
          setHasRoleAssessment(cfg.hasRoleAssessment !== undefined ? cfg.hasRoleAssessment : true);
          setCriteria(Array.isArray(cfg.criteria) && cfg.criteria.length > 0 ? cfg.criteria : DEFAULT_CRITERIA);
          setFormulaType(cfg.formulaType || 'WEIGHTED');
          setCompletionBenchmark(cfg.completionBenchmark || 'Điểm TB >= 5.0');
          setRolesList(Array.isArray(cfg.rolesList) && cfg.rolesList.length > 0 ? cfg.rolesList : DEFAULT_EVENT_ROLES);
        } else {
          setMode('CRITERIA');
          setHasRoleAssessment(true);
          setCriteria(DEFAULT_CRITERIA);
          setFormulaType('WEIGHTED');
          setCompletionBenchmark('Điểm TB >= 5.0');
          setRolesList(DEFAULT_EVENT_ROLES);
        }
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

  // Quản lý vai trò học sinh
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

    if (!isEventActivity && mode === 'CRITERIA' && formulaType === 'WEIGHTED' && totalWeight !== 100) {
      if (!confirm(`Tổng trọng số hiện tại là ${totalWeight}% (khác 100%). Bạn có chắc chắn muốn lưu cấu hình này?`)) {
        return;
      }
    }

    setSaving(true);
    try {
      let evaluationConfig: ActivityEvaluationConfig;

      if (isEventActivity) {
        // Hoạt động sự kiện: Chỉ tính vai trò tham gia, không thiết lập tiêu chí rubric
        evaluationConfig = {
          mode: 'ROLE_BASED',
          modeTitle: 'Ghi nhận tham gia & Vai trò học sinh',
          hasRoleAssessment: true,
          criteria: [],
          formulaType: 'AVERAGE',
          completionBenchmark: completionBenchmark || 'Tham gia đầy đủ sự kiện',
          rolesList: rolesList
        };
      } else {
        // Trải nghiệm ngoại khóa / Dự án: Có danh sách tiêu chí Rubric
        evaluationConfig = {
          mode,
          modeTitle: mode === 'CRITERIA' ? 'Đánh giá theo Tiêu chí Rubric' 
            : mode === 'PASS_FAIL' ? 'Đạt / Chưa đạt' 
            : mode === 'ROLE_BASED' ? 'Đánh giá theo Vai trò học sinh' 
            : 'Đánh giá theo Thang điểm 10',
          hasRoleAssessment,
          criteria: mode === 'CRITERIA' ? criteria : [],
          formulaType,
          completionBenchmark,
          rolesList: hasRoleAssessment ? rolesList : []
        };
      }

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

      toast.success(isEventActivity ? 'Đã lưu Danh sách Vai trò học sinh tham gia!' : 'Đã lưu Cấu hình & Tiêu chí đánh giá thành công!');
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
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-100 ${
          isEventActivity 
            ? 'bg-gradient-to-r from-purple-50/90 via-indigo-50/70 to-white' 
            : 'bg-gradient-to-r from-teal-50/80 via-emerald-50/60 to-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
              isEventActivity ? 'bg-purple-100 text-purple-700' : 'bg-[#00A19A]/15 text-[#00A19A]'
            }`}>
              {isEventActivity ? <Users className="w-5 h-5" /> : <Award className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-800">
                  {isEventActivity ? 'Thiết Lập Vai Trò Tham Gia Của Học Sinh' : 'Thiết Lập Danh Sách Tiêu Chí Đánh Giá'}
                </h2>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
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
          {/* TRƯỜNG HỢP 1: HOẠT ĐỘNG SỰ KIỆN                          */}
          {/* CHỈ TÍNH VAI TRÒ THAM GIA, KHÔNG THIẾT LẬP KẾT QUẢ / RUBRIC */}
          {/* ======================================================== */}
          {isEventActivity ? (
            <div className="space-y-5">
              {/* Event Banner */}
              <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200/80 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-950 leading-relaxed">
                  <div className="font-extrabold text-[13px] text-purple-900 mb-1">
                    Đặc thù Đánh giá Hoạt động Sự kiện:
                  </div>
                  <div>
                    Đối với <strong>Hoạt động sự kiện</strong> (Khai mạc, Lễ hội, Trung thu, Sport Day,...), hệ thống chỉ ghi nhận <strong>Điểm danh có mặt</strong> và <strong>Vai trò tham gia của Học sinh</strong> (Trưởng nhóm, Ban tổ chức, Diễn viên, Thành viên tích cực,...).
                  </div>
                  <div className="mt-1 text-purple-700 font-bold">
                    ✓ Không tính điểm số xếp loại & Không cần thiết lập bộ tiêu chí Rubric phức tạp.
                  </div>
                </div>
              </div>

              {/* Quản lý danh sách vai trò học sinh trong sự kiện */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    Danh sách các vai trò học sinh tham gia sự kiện ({rolesList.length} vai trò):
                  </label>
                </div>

                {/* Danh sách vai trò hiện tại */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {rolesList.map((role, idx) => (
                    <div 
                      key={idx}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs hover:border-purple-300 transition-all"
                    >
                      <div className="flex items-center gap-2.5 flex-1">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={role}
                          onChange={e => {
                            const updated = [...rolesList];
                            updated[idx] = e.target.value;
                            setRolesList(updated);
                          }}
                          className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden focus:border-purple-500 py-0.5"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa vai trò này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Thêm vai trò mới */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newRoleInput}
                    onChange={e => setNewRoleInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRole(newRoleInput);
                      }
                    }}
                    placeholder="Nhập tên vai trò mới (VD: Ban truyền thông, MC, Cổ động viên...)"
                    className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddRole(newRoleInput)}
                    className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm vai trò</span>
                  </button>
                </div>

                {/* Gợi ý vai trò phổ biến */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-500 mb-1.5 block">
                    Gợi ý vai trò sự kiện thường dùng:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_EVENT_ROLES.map(preset => {
                      const isAdded = rolesList.includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleAddRole(preset)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            isAdded
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50 hover:border-purple-300'
                          }`}
                        >
                          + {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Chuẩn hoàn thành tham gia sự kiện */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Yêu cầu hoàn thành sự kiện:
                </label>
                <input
                  type="text"
                  value={completionBenchmark}
                  onChange={e => setCompletionBenchmark(e.target.value)}
                  placeholder="Ví dụ: Tham gia đầy đủ sự kiện, Có mặt đúng giờ..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-500 bg-white"
                />
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* TRƯỜNG HỢP 2: TRẢI NGHIỆM NGOẠI KHÓA / DỰ ÁN             */
            /* CÓ THIẾT LẬP DANH SÁCH TIÊU CHÍ ĐÁNH GIÁ (RUBRIC)        */
            /* ======================================================== */
            <div className="space-y-6">
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
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="text-xs text-slate-500">
            Loại: <strong className={isEventActivity ? 'text-purple-700' : 'text-[#003B3A]'}>
              {isEventActivity ? 'Hoạt động sự kiện (Chỉ tính vai trò)' : `Trải nghiệm / Dự án (${criteria.length} tiêu chí)`}
            </strong>
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
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                isEventActivity 
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20' 
                  : 'bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 shadow-[#00A19A]/20'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : (isEventActivity ? 'Lưu vai trò học sinh' : 'Lưu tiêu chí đánh giá')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
