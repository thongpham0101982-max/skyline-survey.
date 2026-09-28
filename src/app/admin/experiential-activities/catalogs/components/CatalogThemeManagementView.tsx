"use client";
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Plus, Edit3, Trash2, RotateCcw, Search, 
  Tag, Check, AlertCircle, ArrowLeft, RefreshCw, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  EducationalThemeItem, 
  DEFAULT_EDUCATIONAL_THEMES 
} from '@/lib/experiential/catalog-types';

interface CatalogThemeManagementViewProps {
  onBackToCatalogs: () => void;
  catalogsCountByTheme?: Record<string, number>;
}

const PRESET_COLORS = [
  { name: 'Đỏ hồng (Rose)', tagColor: '#e11d48', badgeCls: 'bg-rose-50 text-rose-800 border-rose-200/80', borderCls: 'border-rose-400' },
  { name: 'Hổ phách (Amber)', tagColor: '#d97706', badgeCls: 'bg-amber-50 text-amber-900 border-amber-200/80', borderCls: 'border-amber-400' },
  { name: 'Xanh dương (Blue)', tagColor: '#2563eb', badgeCls: 'bg-blue-50 text-blue-900 border-blue-200/80', borderCls: 'border-blue-400' },
  { name: 'Xanh lá (Emerald)', tagColor: '#059669', badgeCls: 'bg-emerald-50 text-emerald-900 border-emerald-200/80', borderCls: 'border-emerald-400' },
  { name: 'Cam rực rỡ (Orange)', tagColor: '#ea580c', badgeCls: 'bg-orange-50 text-orange-900 border-orange-200/80', borderCls: 'border-orange-400' },
  { name: 'Xanh Teal Skyline', tagColor: '#0d9488', badgeCls: 'bg-teal-50 text-[#003B3A] border-teal-200/80', borderCls: 'border-teal-400' },
  { name: 'Tím chàm (Indigo)', tagColor: '#4f46e5', badgeCls: 'bg-indigo-50 text-indigo-900 border-indigo-200/80', borderCls: 'border-indigo-400' },
  { name: 'Tím hoa cà (Purple)', tagColor: '#7c3aed', badgeCls: 'bg-purple-50 text-purple-900 border-purple-200/80', borderCls: 'border-purple-400' },
  { name: 'Xanh Cyan (Cyan)', tagColor: '#0891b2', badgeCls: 'bg-cyan-50 text-cyan-900 border-cyan-200/80', borderCls: 'border-cyan-400' },
  { name: 'Xanh Chanh (Lime)', tagColor: '#65a30d', badgeCls: 'bg-lime-50 text-lime-900 border-lime-200/80', borderCls: 'border-lime-400' },
  { name: 'Hồng phấn (Fuchsia)', tagColor: '#c026d3', badgeCls: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200/80', borderCls: 'border-fuchsia-400' },
  { name: 'Xanh Da trời (Sky)', tagColor: '#0284c7', badgeCls: 'bg-sky-50 text-sky-900 border-sky-200/80', borderCls: 'border-sky-400' },
];

export function CatalogThemeManagementView({
  onBackToCatalogs,
  catalogsCountByTheme = {}
}: CatalogThemeManagementViewProps) {
  const [themes, setThemes] = useState<EducationalThemeItem[]>(DEFAULT_EDUCATIONAL_THEMES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadThemes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/experiential-activities/catalogs/themes');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setThemes(data);
      }
    } catch {
      setThemes(DEFAULT_EDUCATIONAL_THEMES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThemes();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(true);
    setEditId(null);
    setFormName('');
    setFormCode('');
    setFormDesc('');
    setSelectedColorIdx(Math.floor(Math.random() * PRESET_COLORS.length));
  };

  const handleOpenEdit = (item: EducationalThemeItem) => {
    setIsEditing(true);
    setEditId(item.id);
    setFormName(item.name);
    setFormCode(item.code);
    setFormDesc(item.description || '');

    const foundColorIdx = PRESET_COLORS.findIndex(c => c.tagColor === item.tagColor);
    setSelectedColorIdx(foundColorIdx >= 0 ? foundColorIdx : 0);
  };

  const handleCancelForm = () => {
    setIsEditing(false);
    setEditId(null);
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Vui lòng nhập tên chủ đề giáo dục');
      return;
    }

    const colorConfig = PRESET_COLORS[selectedColorIdx];
    const generatedCode = formCode.trim() 
      ? formCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
      : `THEME_${Date.now().toString().slice(-6)}`;

    let updatedList: EducationalThemeItem[] = [];

    if (editId) {
      // Cập nhật chủ đề hiện có
      updatedList = themes.map(t => {
        if (t.id === editId) {
          return {
            ...t,
            name: formName.trim(),
            code: generatedCode,
            description: formDesc.trim(),
            tagColor: colorConfig.tagColor,
            badgeCls: colorConfig.badgeCls,
            borderCls: colorConfig.borderCls
          };
        }
        return t;
      });
    } else {
      // Thêm mới
      const newItem: EducationalThemeItem = {
        id: `theme_${Date.now()}`,
        name: formName.trim(),
        code: generatedCode,
        description: formDesc.trim(),
        tagColor: colorConfig.tagColor,
        badgeCls: colorConfig.badgeCls,
        borderCls: colorConfig.borderCls,
        isSystem: false
      };
      updatedList = [...themes, newItem];
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/experiential-activities/catalogs/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themes: updatedList })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi lưu danh mục');
      
      toast.success(editId ? 'Đã cập nhật chủ đề giáo dục!' : 'Đã thêm chủ đề giáo dục mới!');
      setThemes(updatedList);
      setIsEditing(false);
      setEditId(null);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi hệ thống');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTheme = async (item: EducationalThemeItem) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa chủ đề "${item.name}"?`)) return;

    const updatedList = themes.filter(t => t.id !== item.id);
    try {
      const res = await fetch('/api/admin/experiential-activities/catalogs/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themes: updatedList })
      });
      if (!res.ok) throw new Error('Lỗi khi xóa chủ đề');
      toast.success('Đã xóa chủ đề thành công');
      setThemes(updatedList);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Khôi phục danh mục về 12 Trục Chủ đề Giáo dục chuẩn của Skyline?')) return;

    try {
      const res = await fetch('/api/admin/experiential-activities/catalogs/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_DEFAULT' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khôi phục');
      toast.success('Đã khôi phục 12 chủ đề giáo dục chuẩn!');
      setThemes(data.themes || DEFAULT_EDUCATIONAL_THEMES);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    }
  };

  const filteredThemes = themes.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return t.name.toLowerCase().includes(q) || 
           t.code.toLowerCase().includes(q) || 
           (t.description && t.description.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Top Banner Navigation & Actions */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToCatalogs}
            className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
            title="Quay lại Danh mục Hoạt động"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span>Quản Lý Danh Mục Chủ Đề Giáo Dục</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                {themes.length} chủ đề
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Thiết lập các trục chủ đề giáo dục cốt lõi, màu sắc badge nhận diện và mục tiêu phát triển học sinh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
            title="Đồng bộ lại 12 trục chủ đề giáo dục cốt lõi của Skyline"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Khôi phục 12 chủ đề chuẩn</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:brightness-105 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm chủ đề mới</span>
          </button>
        </div>
      </div>

      {/* Form Thêm / Sửa Chủ đề (Inline Collapse) */}
      {isEditing && (
        <div className="bg-white p-5 rounded-3xl border-2 border-purple-300 shadow-md animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                {editId ? <Edit3 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              </div>
              <h3 className="text-sm font-extrabold text-slate-800">
                {editId ? 'Chỉnh Sửa Chủ Đề Giáo Dục' : 'Thêm Mới Chủ Đề Giáo Dục'}
              </h3>
            </div>
            <button
              onClick={handleCancelForm}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Hủy bỏ
            </button>
          </div>

          <form onSubmit={handleSaveTheme} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Tên chủ đề giáo dục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Phẩm chất – Giá trị sống, Khoa học – STEM..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Mã chủ đề (Code viết hoa)
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: PHAM_CHAT_GIA_TRI_SONG, KHOA_HOC_STEM..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                Mô tả mục tiêu & Ý nghĩa giáo dục
              </label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={2}
                placeholder="Mô tả tóm tắt định hướng phát triển học sinh qua chủ đề này..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            {/* Bộ màu sắc Badge */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                Chọn Bộ Màu Nhận Diện Badge
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {PRESET_COLORS.map((color, idx) => {
                  const isSelected = selectedColorIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedColorIdx(idx)}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/70 shadow-xs ring-2 ring-purple-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: color.tagColor }} />
                      <span className="text-[11px] font-bold text-slate-700 truncate">{color.name.split(' (')[0]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Preview Badge */}
              <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Xem trước nhãn Badge:</span>
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${PRESET_COLORS[selectedColorIdx].badgeCls}`}>
                    {formName || 'Tên chủ đề giáo dục mẫu'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Đang lưu...' : (editId ? 'Cập nhật chủ đề' : 'Thêm chủ đề')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toolbar Tìm kiếm */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên chủ đề, mã, mô tả..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-slate-50/60"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Hiển thị <strong className="text-slate-800">{filteredThemes.length}</strong> / {themes.length} chủ đề
        </div>
      </div>

      {/* Bảng Danh mục Chủ đề Giáo dục */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xs overflow-hidden">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="py-3 px-3 text-center w-12">STT</th>
              <th className="py-3 px-4 min-w-[200px]">Tên Trục Chủ Đề Giáo Dục</th>
              <th className="py-3 px-3 min-w-[160px]">Nhãn Badge Hiển Thị</th>
              <th className="py-3 px-3 min-w-[180px]">Mã Định Danh (Code)</th>
              <th className="py-3 px-4 min-w-[280px]">Mục Tiêu & Định Hướng Giáo Dục</th>
              <th className="py-3 px-3 text-center min-w-[100px]">Số Hoạt Động</th>
              <th className="py-3 px-3 text-center w-28">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                  Đang tải danh mục chủ đề...
                </td>
              </tr>
            ) : filteredThemes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  Không tìm thấy chủ đề giáo dục nào phù hợp.
                </td>
              </tr>
            ) : (
              filteredThemes.map((theme, idx) => {
                const actCount = catalogsCountByTheme[theme.name.toLowerCase().trim()] || 0;

                return (
                  <tr key={theme.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-extrabold text-sm text-slate-800">
                        {theme.name}
                      </div>
                      {theme.isSystem && (
                        <span className="text-[10px] text-purple-700 font-semibold">
                          Chủ đề chuẩn Skyline
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className={`inline-block px-3 py-1 rounded-xl text-xs font-bold border ${theme.badgeCls}`}>
                        {theme.name}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600 font-bold">
                      {theme.code}
                    </td>

                    <td className="py-3 px-4 text-slate-600 leading-relaxed text-[11px]">
                      {theme.description || <span className="text-slate-400 italic">Chưa có mô tả</span>}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                        {actCount} hoạt động
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(theme)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                          title="Chỉnh sửa chủ đề"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTheme(theme)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa chủ đề"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
