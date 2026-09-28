"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Download, UploadCloud, Layers, Sparkles, 
  Building2, BookOpen, Calendar, Clock, MapPin, Edit3, Trash2, 
  Send, CheckCircle2, AlertCircle, RefreshCw, Filter, Award, Tag,
  Ban, RotateCcw, CheckSquare, Square, UserCheck, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ExperientialTabs } from '@/components/ExperientialTabs';
import { 
  SHEET_CONFIGS, 
  SheetCode, 
  ActivityCatalogItem,
  CatalogActivityCategory,
  EDUCATION_LEVEL_OPTIONS,
  PROGRAM_TYPE_OPTIONS
} from '@/lib/experiential/catalog-types';
import { CatalogAddEditModal } from './components/CatalogAddEditModal';
import { CatalogImportModal } from './components/CatalogImportModal';
import { CatalogAllocateModal } from './components/CatalogAllocateModal';
import { CatalogAssignCTHSModal } from './components/CatalogAssignCTHSModal';
import { CatalogBulkDeleteModal } from './components/CatalogBulkDeleteModal';
import { CatalogEvaluationConfigModal } from './components/CatalogEvaluationConfigModal';

export function getActivityCategory(item: ActivityCatalogItem): CatalogActivityCategory {
  const meta = item.meta || {};
  if (meta.activityCategory) return meta.activityCategory;
  const name = (item.name || meta.name || '').toLowerCase();
  const format = (meta.organizationFormat || '').toLowerCase();
  if (
    name.includes('khai mạc') ||
    name.includes('trung thu') ||
    name.includes('lễ hội') ||
    name.includes('ngày hội') ||
    name.includes('sport day') ||
    name.includes('bế mạc') ||
    format.includes('sự kiện') ||
    format.includes('hội thi')
  ) {
    return 'HOAT_DONG_SU_KIEN';
  }
  return 'TRAI_NGHIEM_DU_AN';
}

export default function ActivityCatalogsPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [activeSheetCode, setActiveSheetCode] = useState<SheetCode>('TH_S');
  const [catalogs, setCatalogs] = useState<ActivityCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'HOAT_DONG_SU_KIEN' | 'TRAI_NGHIEM_DU_AN'>('ALL');
  const [semesterFilter, setSemesterFilter] = useState<'ALL' | '1' | '2'>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELLED'>('ALL');

  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAssignCTHSOpen, setIsAssignCTHSOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [allocatingItem, setAllocatingItem] = useState<any>(null);
  const [isConfigEvalOpen, setIsConfigEvalOpen] = useState(false);
  const [evalConfigItem, setEvalConfigItem] = useState<any>(null);

  useEffect(() => {
    fetch('/api/academic-years')
      .then(r => r.json())
      .then(years => {
        if (Array.isArray(years) && years.length > 0) {
          setAcademicYears(years);
          const active = years.find((y: any) => y.status === 'ACTIVE' && !y.isOff) || years[0];
          setSelectedYearId(active?.id || '');
        }
      })
      .catch(() => {});
  }, []);

  const loadCatalogs = useCallback(() => {
    setLoading(true);
    let url = `/api/admin/experiential-activities/catalogs?sheetCode=${activeSheetCode}`;
    if (selectedYearId) url += `&academicYearId=${selectedYearId}`;
    if (search.trim()) url += `&q=${encodeURIComponent(search.trim())}`;
    if (gradeFilter !== 'ALL') url += `&grade=${encodeURIComponent(gradeFilter)}`;
    if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
    if (categoryFilter !== 'ALL') url += `&category=${categoryFilter}`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        let list = Array.isArray(data) ? data : [];
        if (categoryFilter !== 'ALL') {
          list = list.filter(item => getActivityCategory(item) === categoryFilter);
        }
        if (semesterFilter !== 'ALL') {
          list = list.filter(item => item.meta?.semester === parseInt(semesterFilter, 10));
        }
        setCatalogs(list);
        setLoading(false);
      })
      .catch(() => {
        setCatalogs([]);
        setLoading(false);
      });
  }, [activeSheetCode, selectedYearId, search, categoryFilter, semesterFilter, gradeFilter, statusFilter]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  // Clear selected when sheet or filters change
  useEffect(() => {
    setSelectedIds([]);
  }, [activeSheetCode, selectedYearId, categoryFilter, semesterFilter, gradeFilter, statusFilter]);

  const handleToggleSelectAll = () => {
    if (selectedIds.length === catalogs.length && catalogs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(catalogs.map(c => c.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedActivities = catalogs.filter(c => selectedIds.includes(c.id));

  // Chuyển trạng thái hàng loạt (HỦY hoặc KÍCH HOẠT LẠI)
  const handleBulkUpdateStatus = async (targetStatus: 'ACTIVE' | 'CANCELLED') => {
    if (selectedIds.length === 0) return;
    const actionLabel = targetStatus === 'CANCELLED' ? 'HỦY' : 'KÍCH HOẠT LẠI';
    if (!confirm(`Bạn có chắc chắn muốn chuyển ${selectedIds.length} hoạt động sang trạng thái "${actionLabel}"?`)) return;

    try {
      const res = await fetch('/api/admin/experiential-activities/catalogs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BULK_UPDATE_STATUS',
          ids: selectedIds,
          status: targetStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi cập nhật trạng thái');
      toast.success(data.message || `Đã chuyển ${selectedIds.length} hoạt động sang trạng thái ${actionLabel}`);
      setSelectedIds([]);
      loadCatalogs();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi hệ thống');
    }
  };

  // Chuẩn hóa tên hoạt động (Sentence Case: Viết hoa đầu dòng, không viết hoa tất cả)
  const handleNormalizeNames = async (targetIds?: string[]) => {
    const isSelectedOnly = Array.isArray(targetIds) && targetIds.length > 0;
    const countText = isSelectedOnly ? `${targetIds.length} hoạt động đã chọn` : 'toàn bộ các hoạt động';
    if (!confirm(`Bạn có muốn chuẩn hóa tên ${countText}? (Quy chuẩn: Viết hoa đầu dòng, không viết hoa tất cả, bảo tồn các từ viết tắt chuyên môn như CTHS, STEM, Sky-Line...)`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/experiential-activities/catalogs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'NORMALIZE_NAMES',
          ids: isSelectedOnly ? targetIds : []
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi chuẩn hóa tên');
      toast.success(data.message || 'Chuẩn hóa tên hoạt động thành công');
      loadCatalogs();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi hệ thống');
    }
  };

  // Đổi trạng thái 1 hoạt động
  const handleToggleSingleStatus = async (item: ActivityCatalogItem) => {
    const nextStatus = item.status === 'CANCELLED' ? 'ACTIVE' : 'CANCELLED';
    const actionLabel = nextStatus === 'CANCELLED' ? 'HỦY' : 'KÍCH HOẠT LẠI';
    if (!confirm(`Bạn có chắc chắn muốn chuyển hoạt động "${item.name}" sang trạng thái "${actionLabel}"?`)) return;

    try {
      const res = await fetch(`/api/admin/experiential-activities/catalogs/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật');
      toast.success(`Đã chuyển hoạt động sang trạng thái ${actionLabel}`);
      loadCatalogs();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi hệ thống');
    }
  };

  const handleDelete = async (item: ActivityCatalogItem) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa hoạt động "${item.name}" khỏi danh mục?`)) return;

    try {
      const res = await fetch(`/api/admin/experiential-activities/catalogs/${item.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi xóa');
      }
      toast.success('Đã xóa hoạt động thành công');
      loadCatalogs();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    }
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/admin/experiential-activities/catalogs/template';
  };

// Helper format khối lớp thông minh, ngăn chặn vỡ hàng và kéo dãn bảng
function formatGradesDisplay(grades: any): { label: string; fullText: string; isAll: boolean; count: number } {
  if (!grades) return { label: '—', fullText: '', isAll: false, count: 0 };
  let arr: string[] = [];
  if (Array.isArray(grades)) {
    arr = grades;
  } else if (typeof grades === 'string') {
    arr = grades.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (arr.length === 0) return { label: '—', fullText: '', isAll: false, count: 0 };

  const cleanNums: number[] = [];
  const otherLabels: string[] = [];

  for (const item of arr) {
    const raw = String(item).trim();
    const numMatch = raw.match(/\d+/);
    if (numMatch) {
      cleanNums.push(parseInt(numMatch[0], 10));
    } else if (raw) {
      otherLabels.push(raw);
    }
  }

  cleanNums.sort((a, b) => a - b);
  const uniqueNums = Array.from(new Set(cleanNums));

  const fullText = [
    ...uniqueNums.map(n => `Khối ${n}`),
    ...otherLabels
  ].join(', ');

  const totalCount = uniqueNums.length + otherLabels.length;

  // Kiểm tra nếu là toàn trường hoặc phổ thông (từ 1 đến 12)
  if (uniqueNums.length >= 10 && uniqueNums[0] === 1 && uniqueNums[uniqueNums.length - 1] === 12) {
    return { label: 'Toàn trường (K1 - K12)', fullText, isAll: true, count: totalCount };
  }

  // Kiểm tra dải liên tiếp (vd K1-K5, K6-K9, K10-K12)
  if (uniqueNums.length >= 3 && otherLabels.length === 0) {
    const isConsecutive = uniqueNums.every((val, idx) => idx === 0 || val === uniqueNums[idx - 1] + 1);
    if (isConsecutive) {
      return { label: `K${uniqueNums[0]} - K${uniqueNums[uniqueNums.length - 1]}`, fullText, isAll: false, count: totalCount };
    }
  }

  // Nếu <= 3 khối
  if (uniqueNums.length > 0 && uniqueNums.length <= 3 && otherLabels.length === 0) {
    return { label: uniqueNums.map(n => `K${n}`).join(', '), fullText, isAll: false, count: totalCount };
  }

  // Nếu nhiều khối rời rạc
  if (uniqueNums.length > 3) {
    const preview = uniqueNums.slice(0, 2).map(n => `K${n}`).join(', ');
    return { label: `${preview} (+${uniqueNums.length - 2})`, fullText, isAll: false, count: totalCount };
  }

  if (otherLabels.length > 0 && uniqueNums.length === 0) {
    return { label: otherLabels.join(', '), fullText, isAll: false, count: totalCount };
  }

  return { label: arr.join(', '), fullText, isAll: false, count: totalCount };
}

// Helper chuyển mã bậc học sang tiếng Việt gọn gàng
function formatEduLevelName(lvl: string): string {
  switch (lvl) {
    case 'MN': return 'Mầm non';
    case 'TIEU_HOC': return 'Tiểu học';
    case 'THCS': return 'THCS';
    case 'THPT': return 'THPT';
    case 'PHO_THONG': return 'Phổ thông';
    default: return lvl;
  }
}

// Helper chuyển mã hệ học sang tiếng Việt gọn gàng
function formatProgTypeName(prog: string): string {
  switch (prog) {
    case 'HE_S':
    case 'HI_S': return 'Hệ S';
    case 'SONG_NGU': return 'Song ngữ';
    case 'QUOC_TE': return 'Quốc tế';
    default: return prog;
  }
}

  const currentSheetCfg = SHEET_CONFIGS.find(s => s.code === activeSheetCode) || SHEET_CONFIGS[1];

  // Stats calculation
  const totalInSheet = catalogs.length;
  const eventCount = catalogs.filter(c => getActivityCategory(c) === 'HOAT_DONG_SU_KIEN').length;
  const projectCount = catalogs.filter(c => getActivityCategory(c) === 'TRAI_NGHIEM_DU_AN').length;
  const allocatedCount = catalogs.filter(c => c.meta?.allocatedCampuses && c.meta.allocatedCampuses.length > 0).length;

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12 font-sans px-4 sm:px-6">
      {/* Page Title & Main Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-50 text-[#00A19A] border border-teal-200">
              Tổ CTHS Phụ trách
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              Ban ĐHCM & BP NK&HĐNLLL
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-[#003B3A]" />
            Danh Mục Hoạt Động Trải Nghiệm & Ngoại Khóa
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Cấu hình danh mục chuẩn phân hệ, thiết lập tiêu chí Rubric và đẩy hoạt động xuống Tổ TLHN các cơ sở
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
            title="Tải file mẫu Excel 7 sheet tổng hợp"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Tải mẫu Excel</span>
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 shadow-2xs transition-all cursor-pointer"
            title="Import dữ liệu danh mục từ file Excel"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={() => handleNormalizeNames()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 shadow-2xs transition-all cursor-pointer"
            title="Chuẩn hóa tên toàn bộ hoạt động (Sentence case, bảo toàn từ viết tắt CTHS, STEM...)"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00A19A]" />
            <span>Chuẩn hóa tên</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsAddEditOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 shadow-md shadow-[#00A19A]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm hoạt động mới</span>
          </button>
        </div>
      </div>

      {/* Experiential Navigation Tabs */}
      <ExperientialTabs activeTab="catalogs" />

      {/* Sheet Tabs: Phân hệ / Bậc học gọn gàng & chuyên nghiệp */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full lg:w-auto">
          <span className="text-[11px] font-black uppercase text-slate-400 px-2 shrink-0 hidden sm:inline">Phân hệ:</span>
          {SHEET_CONFIGS.map(cfg => {
            const isActive = activeSheetCode === cfg.code;
            return (
              <button
                key={cfg.code}
                onClick={() => {
                  setActiveSheetCode(cfg.code);
                  setGradeFilter('ALL');
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#003B3A] text-white shadow-sm ring-1 ring-[#003B3A]'
                    : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200/70'
                }`}
              >
                <BookOpen className={`w-3.5 h-3.5 ${isActive ? 'text-teal-300' : 'text-slate-400'}`} />
                <span>{cfg.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {cfg.sheetName}
                </span>
              </button>
            );
          })}
        </div>

        {/* Nút làm mới */}
        <button
          onClick={loadCatalogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors ml-auto cursor-pointer"
          title="Tải lại dữ liệu"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00A19A]' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* KPI & Quick Category Filter Cards (Gộp Thống kê & Phân loại vào 1 cụm tương tác tinh tế) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Tất cả */}
        <button
          type="button"
          onClick={() => setCategoryFilter('ALL')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            categoryFilter === 'ALL'
              ? 'bg-white border-[#00A19A] shadow-md ring-2 ring-[#00A19A]/20'
              : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Tất cả danh mục</span>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${categoryFilter === 'ALL' ? 'bg-[#00A19A]/10 text-[#00A19A]' : 'bg-slate-100 text-slate-500'}`}>
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{totalInSheet}</span>
            <span className="text-xs font-bold text-slate-400">hoạt động</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            Toàn bộ hoạt động trong {currentSheetCfg.title}
          </p>
          {categoryFilter === 'ALL' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#00A19A]" />
          )}
        </button>

        {/* Card 2: Hoạt động sự kiện (Vai trò HS) */}
        <button
          type="button"
          onClick={() => setCategoryFilter(categoryFilter === 'HOAT_DONG_SU_KIEN' ? 'ALL' : 'HOAT_DONG_SU_KIEN')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            categoryFilter === 'HOAT_DONG_SU_KIEN'
              ? 'bg-purple-50/60 border-purple-500 shadow-md ring-2 ring-purple-400/25'
              : 'bg-white border-slate-200/90 hover:border-purple-200 hover:bg-purple-50/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-700">1. Hoạt động sự kiện</span>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${categoryFilter === 'HOAT_DONG_SU_KIEN' ? 'bg-purple-200 text-purple-800' : 'bg-purple-100/60 text-purple-600'}`}>
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-950">{eventCount}</span>
            <span className="text-xs font-bold text-purple-600">hoạt động</span>
          </div>
          <p className="text-[11px] text-purple-700/80 mt-1 line-clamp-1">
            Vai trò HS & Điểm danh • Không lập Rubric
          </p>
          {categoryFilter === 'HOAT_DONG_SU_KIEN' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
          )}
        </button>

        {/* Card 3: Trải nghiệm / Dự án (Rubric) */}
        <button
          type="button"
          onClick={() => setCategoryFilter(categoryFilter === 'TRAI_NGHIEM_DU_AN' ? 'ALL' : 'TRAI_NGHIEM_DU_AN')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            categoryFilter === 'TRAI_NGHIEM_DU_AN'
              ? 'bg-teal-50/60 border-teal-600 shadow-md ring-2 ring-teal-500/25'
              : 'bg-white border-slate-200/90 hover:border-teal-200 hover:bg-teal-50/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-teal-800">2. Trải nghiệm / Dự án</span>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${categoryFilter === 'TRAI_NGHIEM_DU_AN' ? 'bg-teal-200 text-teal-900' : 'bg-teal-100/60 text-teal-700'}`}>
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#003B3A]">{projectCount}</span>
            <span className="text-xs font-bold text-teal-700">hoạt động</span>
          </div>
          <p className="text-[11px] text-teal-700/80 mt-1 line-clamp-1">
            Thiết lập Rubric & Sản phẩm học tập
          </p>
          {categoryFilter === 'TRAI_NGHIEM_DU_AN' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#00A19A]" />
          )}
        </button>

        {/* Card 4: Đã bàn giao cơ sở */}
        <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white text-left relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Đã bàn giao cơ sở</span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700">{allocatedCount}</span>
            <span className="text-xs font-bold text-slate-400">/ {totalInSheet} hoạt động</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            Đã đẩy dữ liệu xuống Tổ TLHN cơ sở
          </p>
        </div>
      </div>

      {/* Filter Toolbar (Năm học, Tìm kiếm, Học kỳ, Trạng thái) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-500">Năm học:</span>
            <select
              value={selectedYearId}
              onChange={e => setSelectedYearId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên HĐ, chủ đề, môn..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] bg-slate-50/60"
            />
          </div>

          {/* Semester Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSemesterFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                semesterFilter === 'ALL' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cả năm
            </button>
            <button
              onClick={() => setSemesterFilter('1')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                semesterFilter === '1' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Học kỳ 1
            </button>
            <button
              onClick={() => setSemesterFilter('2')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                semesterFilter === '2' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Học kỳ 2
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đang áp dụng
            </button>
            <button
              onClick={() => setStatusFilter('CANCELLED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'CANCELLED' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã hủy
            </button>
          </div>
        </div>

        {/* Đếm số kết quả */}
        <div className="text-xs text-slate-500 font-medium">
          Hiển thị <span className="font-bold text-slate-800">{catalogs.length}</span> hoạt động
        </div>
      </div>

      {/* Bulk Action Bar (Hiển thị khi chọn 1 hoặc nhiều hoạt động) */}
      {selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-teal-950 via-[#003B3A] to-slate-900 text-white px-4 py-3 rounded-2xl shadow-lg border border-teal-500/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-teal-400/20 border border-teal-300/30 flex items-center justify-center font-bold text-teal-300">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black tracking-wide flex items-center gap-2">
                <span>Đã chọn <strong className="text-teal-300 text-sm font-black">{selectedIds.length}</strong> / {catalogs.length} hoạt động</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-teal-200">
                  {currentSheetCfg.title}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAssignCTHSOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-950 bg-gradient-to-r from-teal-300 to-emerald-300 hover:brightness-105 shadow-2xs transition-all cursor-pointer"
              title="Gán giáo viên/cán bộ Tổ CTHS phụ trách cho các hoạt động đã chọn"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Gán GV CTHS ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => handleBulkUpdateStatus('CANCELLED')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-300 to-amber-400 hover:brightness-105 shadow-2xs transition-all cursor-pointer"
              title="Chuyển các hoạt động đã chọn sang trạng thái HỦY (bảo toàn lịch sử đánh giá)"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Hủy ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => handleBulkUpdateStatus('ACTIVE')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-950 bg-emerald-300 hover:bg-emerald-200 shadow-2xs transition-all cursor-pointer"
              title="Kích hoạt lại các hoạt động đã hủy"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kích hoạt ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => handleNormalizeNames(selectedIds)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-900 bg-teal-200 hover:bg-teal-100 shadow-2xs transition-all cursor-pointer"
              title="Chuẩn hóa tên các hoạt động đã chọn"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#003B3A]" />
              <span>Chuẩn hóa ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => setIsBulkDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-2xs transition-all cursor-pointer"
              title="Xóa các hoạt động đã chọn khỏi danh mục"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={catalogs.length > 0 && selectedIds.length === catalogs.length}
                    onChange={handleToggleSelectAll}
                    title="Chọn tất cả hoạt động trên bảng"
                    className="w-4 h-4 rounded text-[#00A19A] border-slate-300 focus:ring-[#00A19A] cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-2 text-center w-12 text-slate-500 font-bold">STT</th>
                <th className="py-2.5 px-3 w-28 whitespace-nowrap">Khối áp dụng</th>
                <th className="py-2.5 px-4 min-w-[240px]">Tên hoạt động</th>
                <th className="py-2.5 px-3 min-w-[110px]">Bậc & Hệ học</th>
                <th className="py-2.5 px-3 min-w-[140px]">Chủ đề giáo dục</th>
                <th className="py-2.5 px-3 min-w-[140px]">Môn phối hợp</th>
                <th className="py-2.5 px-3 min-w-[110px] whitespace-nowrap">Thời gian & HK</th>
                <th className="py-2.5 px-3 min-w-[120px]">Địa điểm</th>
                <th className="py-2.5 px-3 min-w-[150px]">GV Phụ trách (CTHS)</th>
                <th className="py-2.5 px-3 min-w-[130px]">Hình thức đánh giá</th>
                <th className="py-2.5 px-3 min-w-[140px]">Cơ sở tiếp nhận</th>
                <th className="py-2.5 px-3 text-center min-w-[120px] sticky right-0 bg-slate-50 border-l border-slate-200/80 shadow-xs">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00A19A]" />
                    Đang tải danh mục hoạt động...
                  </td>
                </tr>
              ) : catalogs.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    Chưa có hoạt động nào trong danh mục <span className="font-bold text-slate-600">{currentSheetCfg.title}</span>.
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setIsImportOpen(true)}
                        className="text-xs font-bold text-[#00A19A] hover:underline cursor-pointer"
                      >
                        Import từ Excel
                      </button>
                      <span>hoặc</span>
                      <button
                        onClick={() => { setEditingItem(null); setIsAddEditOpen(true); }}
                        className="text-xs font-bold text-[#00A19A] hover:underline cursor-pointer"
                      >
                        Thêm thủ công
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                catalogs.map((act, idx) => {
                  const meta = act.meta || {};
                  const allocatedCampuses = meta.allocatedCampuses || [];
                  const isSelected = selectedIds.includes(act.id);

                  // Khối lớp gọn gàng
                  const gradesInfo = formatGradesDisplay(meta.grades);

                  // Bậc học
                  const eduLevels = Array.isArray(meta.educationLevels) && meta.educationLevels.length > 0
                    ? meta.educationLevels
                    : [meta.educationLevel || currentSheetCfg.level];

                  // Hệ học
                  const progTypes = Array.isArray(meta.programTypes) && meta.programTypes.length > 0
                    ? meta.programTypes
                    : [meta.programType || currentSheetCfg.program];

                  // Cấu hình đánh giá
                  const cat = getActivityCategory(act);
                  const isEvent = cat === 'HOAT_DONG_SU_KIEN';
                  const evalCfg = meta.evaluationConfig;
                  const mode = evalCfg?.mode;
                  const critCount = (mode === 'CRITERIA' && Array.isArray(evalCfg?.criteria)) ? evalCfg.criteria.length : 0;

                  return (
                    <tr 
                      key={act.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-teal-50/40' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(act.id)}
                          className="w-4 h-4 rounded text-[#00A19A] border-slate-300 focus:ring-[#00A19A] cursor-pointer"
                        />
                      </td>

                      {/* STT */}
                      <td className="py-2.5 px-2 text-center text-slate-400 font-semibold align-middle">{idx + 1}</td>

                      {/* Khối lớp: Gọn gàng không vỡ hàng */}
                      <td className="py-2.5 px-3 align-middle">
                        <span 
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-extrabold whitespace-nowrap ${
                            gradesInfo.isAll 
                              ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                          title={`Danh sách khối: ${gradesInfo.fullText || gradesInfo.label}`}
                        >
                          {gradesInfo.label}
                        </span>
                      </td>

                      {/* Tên hoạt động & Phân loại */}
                      <td className="py-2.5 px-4 align-middle">
                        <div>
                          <div className={`font-bold text-[13px] leading-snug ${act.status === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-slate-900 hover:text-[#00A19A] transition-colors'}`}>
                            {act.name}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <span className="text-[10px] font-mono text-slate-400">{act.code}</span>
                            {/* Badge loại hình */}
                            {isEvent ? (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-purple-100/80 text-purple-800 border border-purple-200">
                                Sự kiện (Vai trò HS)
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-teal-100/80 text-[#003B3A] border border-teal-200">
                                Trải nghiệm / Dự án
                              </span>
                            )}
                            {/* Trạng thái */}
                            {act.status === 'CANCELLED' ? (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Đã hủy
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Áp dụng
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Bậc & Hệ học gộp gọn gàng */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap gap-1">
                            {eduLevels.map((lvl: string) => (
                              <span
                                key={lvl}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 whitespace-nowrap"
                              >
                                {formatEduLevelName(lvl)}
                              </span>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {progTypes.map((prog: string) => (
                              <span
                                key={prog}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 whitespace-nowrap"
                              >
                                {formatProgTypeName(prog)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Chủ đề giáo dục */}
                      <td className="py-2.5 px-3 text-slate-600 align-middle">
                        <span className="line-clamp-2" title={meta.themeName || ''}>
                          {meta.themeName || <span className="text-slate-400 font-normal italic">—</span>}
                        </span>
                      </td>

                      {/* Môn phối hợp / Tích hợp */}
                      <td className="py-2.5 px-3 align-middle">
                        {meta.primarySubjectName && (
                          <div className="mb-0.5">
                            <span className="font-bold text-indigo-700 bg-indigo-50/80 border border-indigo-200 px-1.5 py-0.2 rounded text-[10px] inline-block">
                              Chủ trì: {meta.primarySubjectName}
                            </span>
                          </div>
                        )}
                        <div className="text-slate-600 text-[11px] line-clamp-1" title={meta.coopSubjectNames || meta.integratedSubjects || ''}>
                          {meta.coopSubjectNames || meta.integratedSubjects || <span className="text-slate-400 font-normal italic">—</span>}
                        </div>
                      </td>

                      {/* Thời gian & HK */}
                      <td className="py-2.5 px-3 text-slate-600 align-middle whitespace-nowrap">
                        <div className="font-bold text-slate-800">{meta.timeFrame || '—'}</div>
                        <div className="text-[10px] text-slate-400">Học kỳ {meta.semester || 1}</div>
                      </td>

                      {/* Địa điểm */}
                      <td className="py-2.5 px-3 text-slate-600 align-middle">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]" title={meta.expectedLocation || ''}>
                            {meta.expectedLocation || <span className="text-slate-400 font-normal italic">—</span>}
                          </span>
                        </div>
                      </td>

                      {/* GV Phụ trách Kế hoạch (Tổ CTHS) */}
                      <td className="py-2.5 px-3 align-middle">
                        {meta.cthsTeacherName || (Array.isArray(meta.cthsTeachers) && meta.cthsTeachers.length > 0) ? (
                          (() => {
                            const teacherList = Array.isArray(meta.cthsTeachers) && meta.cthsTeachers.length > 0
                              ? meta.cthsTeachers
                              : [{
                                  id: meta.cthsTeacherId || '',
                                  teacherCode: meta.cthsTeacherCode || '',
                                  teacherName: meta.cthsTeacherName || ''
                                }];
                            const firstTeacher = teacherList[0];
                            const extraCount = teacherList.length - 1;
                            const fullTooltip = teacherList.map((t: any) => `${t.teacherName} (${t.teacherCode || 'GV'})`).join('\n');

                            return (
                              <button 
                                type="button"
                                onClick={() => {
                                  setSelectedIds([act.id]);
                                  setIsAssignCTHSOpen(true);
                                }}
                                className="group cursor-pointer inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-all text-left"
                                title={`Nhấn để quản lý GV Tổ CTHS:\n${fullTooltip}`}
                              >
                                <div className="w-5 h-5 rounded-full bg-[#00A19A] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {firstTeacher?.teacherName?.split(' ').slice(-1)[0]?.charAt(0) || 'C'}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[11px] font-bold text-teal-950 truncate max-w-[110px] flex items-center gap-1">
                                    <span>{firstTeacher?.teacherName}</span>
                                    {extraCount > 0 && (
                                      <span className="text-[9px] font-bold px-1 rounded-full bg-teal-200 text-[#003B3A]">
                                        +{extraCount}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Edit3 className="w-3 h-3 text-teal-600 opacity-60 group-hover:opacity-100 shrink-0" />
                              </button>
                            );
                          })()
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIds([act.id]);
                              setIsAssignCTHSOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-[#00A19A] hover:bg-teal-50 border border-dashed border-slate-300 hover:border-teal-400 transition-all cursor-pointer"
                            title="Gán GV thuộc Tổ CTHS phụ trách"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span>+ Gán GV</span>
                          </button>
                        )}
                      </td>

                      {/* Cấu hình Đánh giá & Rubric */}
                      <td className="py-2.5 px-3 align-middle">
                        {isEvent ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEvalConfigItem(act);
                              setIsConfigEvalOpen(true);
                            }}
                            className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-xl border border-purple-200 text-[11px] font-bold bg-purple-50 text-purple-900 hover:bg-purple-100 hover:border-purple-300 transition-all cursor-pointer"
                            title="Hoạt động sự kiện: Tính vai trò tham gia của học sinh & điểm danh"
                          >
                            <Users className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="truncate max-w-[110px]">
                              Vai trò ({evalCfg?.rolesList?.length || 5})
                            </span>
                            <Edit3 className="w-3 h-3 text-purple-600 opacity-60 group-hover:opacity-100 shrink-0" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEvalConfigItem(act);
                              setIsConfigEvalOpen(true);
                            }}
                            className={`group inline-flex items-center gap-1.5 px-2 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                              mode
                                ? 'bg-teal-50 border-teal-200 text-[#003B3A] hover:bg-teal-100 hover:border-teal-300'
                                : 'bg-slate-50 border-dashed border-slate-300 text-slate-500 hover:text-[#00A19A] hover:border-teal-300 hover:bg-teal-50'
                            }`}
                            title="Thiết lập tiêu chí đánh giá Rubric & Sản phẩm học tập"
                          >
                            <Award className={`w-3.5 h-3.5 shrink-0 ${mode ? 'text-[#00A19A]' : 'text-slate-400'}`} />
                            <span className="truncate max-w-[110px]">
                              {mode === 'CRITERIA'
                                ? `Rubric (${critCount} TC)`
                                : mode === 'PASS_FAIL'
                                  ? 'Đạt / C.Đạt'
                                  : mode === 'SCORE_10'
                                    ? 'Thang 10'
                                    : '+ Lập Rubric'}
                            </span>
                            <Edit3 className="w-3 h-3 text-teal-600 opacity-60 group-hover:opacity-100 shrink-0" />
                          </button>
                        )}
                      </td>

                      {/* Cơ sở tiếp nhận */}
                      <td className="py-2.5 px-3 align-middle">
                        {allocatedCampuses.length === 0 ? (
                          <span className="text-[10px] text-slate-400 italic">Chưa đẩy cơ sở</span>
                        ) : (
                          <div className="space-y-0.5">
                            {allocatedCampuses.map((a: any) => {
                              const isDeployed = a.status === 'DA_TRIEN_KHAI';
                              const isAccepted = a.status === 'DA_TIEP_NHAN';
                              return (
                                <div key={a.campusId} className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDeployed ? 'bg-emerald-500' : isAccepted ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                  <span className="text-[11px] font-bold text-slate-700">{a.campusCode || a.campusName}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {isDeployed ? '(Triển khai)' : isAccepted ? '(Đã nhận)' : '(Chờ)'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Thao tác (Sticky right) */}
                      <td className="py-2.5 px-2 text-center sticky right-0 bg-white/95 backdrop-blur-xs border-l border-slate-200/80 shadow-xs align-middle">
                        <div className="flex items-center justify-center gap-1">
                          {/* Đẩy cơ sở */}
                          <button
                            type="button"
                            onClick={() => {
                              setAllocatingItem(act);
                              setIsAllocateOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#00A19A] hover:bg-[#00A19A]/10 transition-colors cursor-pointer"
                            title="Đẩy hoạt động xuống Tổ TLHN cơ sở"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Đổi trạng thái HỦY / KHÔI PHỤC */}
                          {act.status === 'CANCELLED' ? (
                            <button
                              type="button"
                              onClick={() => handleToggleSingleStatus(act)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Khôi phục / Kích hoạt lại hoạt động này"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleSingleStatus(act)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Hủy hoạt động này (bảo toàn lịch sử)"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Sửa */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(act);
                              setIsAddEditOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Chỉnh sửa thông tin"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Xóa */}
                          <button
                            type="button"
                            onClick={() => handleDelete(act)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa hoạt động này"
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

      {/* Modals */}
      <CatalogAddEditModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setEditingItem(null);
        }}
        onSaved={loadCatalogs}
        initialData={editingItem}
        activeSheetCode={activeSheetCode}
        academicYearId={selectedYearId}
      />

      <CatalogImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={loadCatalogs}
        academicYearId={selectedYearId}
      />

      <CatalogAllocateModal
        isOpen={isAllocateOpen}
        onClose={() => {
          setIsAllocateOpen(false);
          setAllocatingItem(null);
        }}
        onAllocated={loadCatalogs}
        catalogItem={allocatingItem}
      />

      {/* Modal gán GV Tổ CTHS cho 1 hoặc nhiều hoạt động */}
      <CatalogAssignCTHSModal
        isOpen={isAssignCTHSOpen}
        onClose={() => setIsAssignCTHSOpen(false)}
        onSuccess={() => {
          setSelectedIds([]);
          loadCatalogs();
        }}
        selectedActivities={selectedActivities}
      />

      {/* Modal xác nhận xóa hàng loạt 1 hoặc nhiều hoạt động */}
      <CatalogBulkDeleteModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onSuccess={() => {
          setSelectedIds([]);
          loadCatalogs();
        }}
        selectedActivities={selectedActivities}
      />

      {/* Modal thiết lập tiêu chí & công thức đánh giá trực tiếp */}
      <CatalogEvaluationConfigModal
        isOpen={isConfigEvalOpen}
        onClose={() => {
          setIsConfigEvalOpen(false);
          setEvalConfigItem(null);
        }}
        onSaved={loadCatalogs}
        catalogItem={evalConfigItem}
      />
    </div>
  );
}
