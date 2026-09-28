"use client";
import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Edit2, Trash2, RotateCcw, Check, Sparkles, 
  Palette, BookOpen, AlertCircle, Info, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DEFAULT_EDUCATIONAL_THEMES, EducationalThemeItem } from '@/lib/experiential/catalog-types';

interface CatalogThemeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemesUpdated?: (themes: EducationalThemeItem[]) => void;
}

const PRESET_COLORS = [
  { tagColor: '#e11d48', badgeCls: 'bg-rose-50 text-rose-800 border-rose-200/80', borderCls: 'border-rose-400', label: 'Hồng đỏ' },
  { tagColor: '#d97706', badgeCls: 'bg-amber-50 text-amber-900 border-amber-200/80', borderCls: 'border-amber-400', label: 'Hổ phách' },
  { tagColor: '#0284c7', badgeCls: 'bg-sky-50 text-sky-800 border-sky-200/80', borderCls: 'border-sky-400', label: 'Xanh da trời' },
  { tagColor: '#059669', badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200/80', borderCls: 'border-emerald-400', label: 'Xanh lục' },
  { tagColor: '#ea580c', badgeCls: 'bg-orange-50 text-orange-900 border-orange-200/80', borderCls: 'border-orange-400', label: 'Cam đậm' },
  { tagColor: '#0d9488', badgeCls: 'bg-teal-50 text-teal-800 border-teal-200/80', borderCls: 'border-teal-400', label: 'Xanh teal' },
  { tagColor: '#0891b2', badgeCls: 'bg-cyan-50 text-cyan-800 border-cyan-200/80', borderCls: 'border-cyan-400', label: 'Xanh cyan' },
  { tagColor: '#9333ea', badgeCls: 'bg-purple-50 text-purple-800 border-purple-200/80', borderCls: 'border-purple-400', label: 'Tím mộng mơ' },
  { tagColor: '#4f46e5', badgeCls: 'bg-indigo-50 text-indigo-800 border-indigo-200/80', borderCls: 'border-indigo-400', label: 'Xanh chàm' },
  { tagColor: '#7c3aed', badgeCls: 'bg-violet-50 text-violet-800 border-violet-200/80', borderCls: 'border-violet-400', label: 'Tím violet' },
  { tagColor: '#db2777', badgeCls: 'bg-pink-50 text-pink-800 border-pink-200/80', borderCls: 'border-pink-400', label: 'Hồng fuchsia' },
  { tagColor: '#2563eb', badgeCls: 'bg-blue-50 text-blue-900 border-blue-200/80', borderCls: 'border-blue-400', label: 'Xanh dương' }
];

export function CatalogThemeConfigModal({
  isOpen,
  onClose,
  onThemesUpdated
}: CatalogThemeConfigModalProps) {
  const [themes, setThemes] = useState<EducationalThemeItem[]>(DEFAULT_EDUCATIONAL_THEMES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form thêm / sửa
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    colorIdx: 0
  });

  const loadThemes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/experiential-activities/catalogs/themes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setThemes(data);
        } else {
          setThemes(DEFAULT_EDUCATIONAL_THEMES);
        }
      }
    } catch {
      setThemes(DEFAULT_EDUCATIONAL_THEMES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadThemes();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      colorIdx: Math.floor(Math.random() * PRESET_COLORS.length)
    });
  };

  const handleStartEdit = (t: EducationalThemeItem) => {
    setEditingId(t.id);
    const foundColorIdx = PRESET_COLORS.findIndex(c => c.tagColor === t.tagColor);
    setFormData({
      name: t.name,
      description: t.description || '',
      colorIdx: foundColorIdx >= 0 ? foundColorIdx : 0
    });
  };

  const handleSaveItem = () => {
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên chủ đề giáo dục');
      return;
    }

    const selectedColor = PRESET_COLORS[formData.colorIdx] || PRESET_COLORS[0];

    if (editingId) {
      // Cập nhật chủ đề
      setThemes(prev => prev.map(t => {
        if (t.id === editingId) {
          return {
            ...t,
            name: formData.name.trim(),
            description: formData.description.trim(),
            badgeCls: selectedColor.badgeCls,
            borderCls: selectedColor.borderCls,
            tagColor: selectedColor.tagColor
          };
        }
        return t;
      }));
      toast.success('Đã cập nhật chủ đề');
    } else {
      // Thêm mới chủ đề
      const newTheme: EducationalThemeItem = {
        id: `theme_${Date.now()}`,
        code: formData.name.trim().toUpperCase().replace(/[\s–—-]+/g, '_'),
        name: formData.name.trim(),
        description: formData.description.trim(),
        badgeCls: selectedColor.badgeCls,
        borderCls: selectedColor.borderCls,
        tagColor: selectedColor.tagColor,
        isSystem: false
      };
      setThemes(prev => [...prev, newTheme]);
      toast.success('Đã thêm chủ đề mới');
    }
    resetForm();
  };

  const handleDeleteItem = (id: string) => {
    const item = themes.find(t => t.id === id);
    if (!confirm(`Bạn có chắc muốn xóa chủ đề "${item?.name}"?`)) return;
    setThemes(prev => prev.filter(t => t.id !== id));
    if (editingId === id) resetForm();
    toast.success('Đã xóa chủ đề');
  };

  const handleResetDefault = async () => {
    if (!confirm('Khôi phục danh mục về 12 chủ đề giáo dục chuẩn của trường?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/experiential-activities/catalogs/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_DEFAULT' })
      });
      const data = await res.json();
      if (res.ok) {
        setThemes(DEFAULT_EDUCATIONAL_THEMES);
        resetForm();
        toast.success('Đã khôi phục 12 chủ đề chuẩn');
        if (onThemesUpdated) onThemesUpdated(DEFAULT_EDUCATIONAL_THEMES);
      } else {
        toast.error(data.error || 'Lỗi khi khôi phục');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (themes.length === 0) {
      toast.error('Danh mục phải có ít nhất 1 chủ đề');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/experiential-activities/catalogs/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themes })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Đã lưu cấu hình danh mục chủ đề giáo dục thành công!');
        if (onThemesUpdated) onThemesUpdated(data.themes || themes);
        onClose();
      } else {
        toast.error(data.error || 'Lỗi khi lưu');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50/70 via-indigo-50/50 to-purple-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00A19A]/15 text-[#00A19A] flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-800">
                  Cấu Hình Chủ Đề Giáo Dục Riêng
                </h2>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-[#003B3A]">
                  {themes.length} Chủ đề
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Quản lý các trục chủ đề giáo dục cốt lõi áp dụng cho Hoạt động Trải nghiệm & Ngoại khóa
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Form Thêm / Chỉnh sửa nhanh chủ đề */}
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#00A19A]" />
                <span>{editingId ? 'Chỉnh sửa chủ đề giáo dục' : 'Thêm mới chủ đề giáo dục'}</span>
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Hủy sửa (chuyển sang thêm mới)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên chủ đề giáo dục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phẩm chất – Giá trị sống, STEM, ..."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs font-bold text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả / Mục tiêu giáo dục cốt lõi
                </label>
                <input
                  type="text"
                  placeholder="Tóm tắt mục tiêu hoặc các nội dung trọng tâm..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs text-slate-700 px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] bg-white transition-all"
                />
              </div>
            </div>

            {/* Màu sắc thẻ */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Màu sắc:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, colorIdx: idx })}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        formData.colorIdx === idx ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.tagColor }}
                      title={c.label}
                    >
                      {formData.colorIdx === idx && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nút lưu item */}
              <button
                type="button"
                onClick={handleSaveItem}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#00A19A] hover:bg-[#008f89] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {editingId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{editingId ? 'Cập nhật chủ đề' : 'Thêm vào danh sách'}</span>
              </button>
            </div>
          </div>

          {/* Danh sách chủ đề hiện hành */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>Danh sách {themes.length} chủ đề giáo dục hiện tại</span>
              </h3>
              <button
                type="button"
                onClick={handleResetDefault}
                disabled={saving}
                className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer transition-colors"
                title="Khôi phục lại danh sách 12 chủ đề chuẩn của trường"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Khôi phục 12 chủ đề chuẩn</span>
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Đang tải cấu hình chủ đề giáo dục...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {themes.map((t, idx) => {
                  const isEditingThis = editingId === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                        isEditingThis
                          ? 'border-[#00A19A] bg-teal-50/50 ring-2 ring-[#00A19A]/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-black text-slate-400">#{idx + 1}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${t.badgeCls}`}>
                            {t.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(t)}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Chỉnh sửa chủ đề"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(t.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa chủ đề"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                        {t.description || 'Chưa có mô tả mục tiêu giáo dục.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="text-xs text-slate-500">
            Tổng cộng: <strong className="text-slate-800">{themes.length} chủ đề giáo dục</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAll}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 rounded-xl shadow-md shadow-[#00A19A]/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu toàn bộ danh mục'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
