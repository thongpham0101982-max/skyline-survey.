"use client";
import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Plus, Search, Download, UploadCloud, Layers, Sparkles, 
  Building2, BookOpen, Calendar, MapPin, Edit3, Trash2, 
  RefreshCw, Award, Tag, Ban, RotateCcw, CheckSquare, 
  UserCheck, Users, Sliders, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ExperientialTabs } from '@/components/ExperientialTabs';
import { 
  ActivityCatalogItem,
  CatalogActivityCategory,
  EDUCATION_LEVEL_OPTIONS,
  PROGRAM_TYPE_OPTIONS,
  DEFAULT_EDUCATIONAL_THEMES,
  EducationalThemeItem,
  getEducationalThemeInfo,
  getEvaluationModeInfo
} from '@/lib/experiential/catalog-types';
import { CatalogAddEditModal } from './components/CatalogAddEditModal';
import { CatalogImportModal } from './components/CatalogImportModal';
import { CatalogAllocateModal } from './components/CatalogAllocateModal';
import { CatalogAssignCTHSModal } from './components/CatalogAssignCTHSModal';
import { CatalogBulkDeleteModal } from './components/CatalogBulkDeleteModal';
import { CatalogEvaluationConfigModal } from './components/CatalogEvaluationConfigModal';
import { CatalogThemeConfigModal } from './components/CatalogThemeConfigModal';
import { CatalogThemeManagementView } from './components/CatalogThemeManagementView';

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

// Helper format khối lớp thông minh
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
  const fullText = [...uniqueNums.map(n => `K${n}`), ...otherLabels].join(', ');
  const totalCount = uniqueNums.length + otherLabels.length;

  if (uniqueNums.length >= 10 && uniqueNums[0] === 1 && uniqueNums[uniqueNums.length - 1] === 12) {
    return { label: 'Toàn trường (K1 - K12)', fullText, isAll: true, count: totalCount };
  }

  if (uniqueNums.length >= 3 && otherLabels.length === 0) {
    const isConsecutive = uniqueNums.every((val, idx) => idx === 0 || val === uniqueNums[idx - 1] + 1);
    if (isConsecutive) {
      return { label: `K${uniqueNums[0]} - K${uniqueNums[uniqueNums.length - 1]}`, fullText, isAll: false, count: totalCount };
    }
  }

  if (uniqueNums.length > 0 && uniqueNums.length <= 3 && otherLabels.length === 0) {
    return { label: uniqueNums.map(n => `K${n}`).join(', '), fullText, isAll: false, count: totalCount };
  }

  if (uniqueNums.length > 3) {
    const preview = uniqueNums.slice(0, 2).map(n => `K${n}`).join(', ');
    return { label: `${preview} (+${uniqueNums.length - 2})`, fullText, isAll: false, count: totalCount };
  }

  if (otherLabels.length > 0 && uniqueNums.length === 0) {
    return { label: otherLabels.join(', '), fullText, isAll: false, count: totalCount };
  }

  return { label: arr.join(', '), fullText, isAll: false, count: totalCount };
}

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

function formatProgTypeName(prog: string): string {
  switch (prog) {
    case 'HE_S':
    case 'HI_S': return 'Hệ S';
    case 'SONG_NGU': return 'Song ngữ';
    case 'QUOC_TE': return 'Quốc tế';
    default: return prog;
  }
}

function ActivityCatalogsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get('tab') === 'themes' ? 'themes' : 'catalogs';

  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [catalogs, setCatalogs] = useState<ActivityCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Filters
  const [levelFilter, setLevelFilter] = useState<string>('ALL'); // 'ALL' | 'MN' | 'TIEU_HOC' | 'THCS' | 'THPT'
  const [programTypeFilter, setProgramTypeFilter] = useState<string>('ALL'); // 'ALL' | 'HE_S' | 'SONG_NGU' | 'QUOC_TE'
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'HOAT_DONG_SU_KIEN' | 'TRAI_NGHIEM_DU_AN'>('ALL');
  const [themeFilter, setThemeFilter] = useState<string>('ALL');
  const [themes, setThemes] = useState<EducationalThemeItem[]>(DEFAULT_EDUCATIONAL_THEMES);
  const [semesterFilter, setSemesterFilter] = useState<'ALL' | '1' | '2'>('ALL');
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
  const [isThemeConfigOpen, setIsThemeConfigOpen] = useState(false);

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

    fetch('/api/admin/experiential-activities/catalogs/themes')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setThemes(data);
      })
      .catch(() => {});
  }, []);

  const loadCatalogs = useCallback(() => {
    setLoading(true);
    let url = `/api/admin/experiential-activities/catalogs?sheetCode=ALL`;
    if (selectedYearId) url += `&academicYearId=${selectedYearId}`;
    if (levelFilter !== 'ALL') url += `&level=${levelFilter}`;
    if (programTypeFilter !== 'ALL') url += `&programType=${programTypeFilter}`;
    if (categoryFilter !== 'ALL') url += `&category=${categoryFilter}`;
    if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
    if (search.trim()) url += `&q=${encodeURIComponent(search.trim())}`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        let list = Array.isArray(data) ? data : [];
        if (categoryFilter !== 'ALL') {
          list = list.filter(item => getActivityCategory(item) === categoryFilter);
        }
        if (themeFilter !== 'ALL') {
          list = list.filter(item => {
            const itemTheme = (item.meta?.themeName || '').toLowerCase().trim();
            const filterTheme = themeFilter.toLowerCase().trim();
            return itemTheme === filterTheme || itemTheme.includes(filterTheme) || filterTheme.includes(itemTheme);
          });
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
  }, [selectedYearId, levelFilter, programTypeFilter, categoryFilter, themeFilter, semesterFilter, statusFilter, search]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    setSelectedIds([]);
  }, [selectedYearId, levelFilter, programTypeFilter, categoryFilter, themeFilter, semesterFilter, statusFilter]);

  // Thống kê số hoạt động theo từng chủ đề
  const catalogsCountByTheme = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of catalogs) {
      const t = (c.meta?.themeName || '').toLowerCase().trim();
      if (t) {
        map[t] = (map[t] || 0) + 1;
      }
    }
    return map;
  }, [catalogs]);

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

  const handleNormalizeNames = async (targetIds?: string[]) => {
    const isSelectedOnly = Array.isArray(targetIds) && targetIds.length > 0;
    const countText = isSelectedOnly ? `${targetIds.length} hoạt động đã chọn` : 'toàn bộ các hoạt động';
    if (!confirm(`Bạn có muốn chuẩn hóa tên ${countText}? (Viết hoa đầu dòng, không viết hoa tất cả, bảo tồn từ viết tắt STEM, CTHS...)`)) {
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

  const handleToggleSingleStatus = async (item: ActivityCatalogItem) => {
    const nextStatus = item.status === 'CANCELLED' ? 'ACTIVE' : 'CANCELLED';
    const actionLabel = nextStatus === 'CANCELLED' ? 'HỦY' : 'KÍCH HOẠT LẠI';
    if (!confirm(`Bạn có chắc chắn muốn chuyển hoạt động "${item.name}" sang trạng thái "${actionLabel}"?`)) return;

    try {
      const res = await fetch(`/api/admin/experiential-activities/catalogs/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
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

  // Stats calculation
  const totalActivities = catalogs.length;
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
              Ban ĐHCM & BP NK&HĐNGLL
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-[#003B3A]" />
            Danh Mục Hoạt Động Trải Nghiệm & Ngoại Khóa
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Quản lý kế hoạch chuẩn toàn hệ thống, cấu hình ma trận đánh giá 3 chế độ và bàn giao cơ sở
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
            title="Tải file mẫu Excel tổng hợp"
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
            title="Chuẩn hóa tên toàn bộ hoạt động (Sentence case)"
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

      {/* Experiential Navigation Tabs (Bao gồm tab Chủ đề giáo dục) */}
      <ExperientialTabs activeTab={currentTab === 'themes' ? 'themes' : 'catalogs'} />

      {/* ======================================================== */}
      {/* NẾU CHỌN TAB "CHỦ ĐỀ GIÁO DỤC" THÌ HIỂN THỊ VIEW CHỦ ĐỀ  */}
      {/* ======================================================== */}
      {currentTab === 'themes' ? (
        <CatalogThemeManagementView
          onBackToCatalogs={() => router.push('/admin/experiential-activities/catalogs')}
          catalogsCountByTheme={catalogsCountByTheme}
        />
      ) : (
        /* ======================================================== */
        /* VIEW DANH MỤC HOẠT ĐỘNG CHÍNH (ĐÃ BỎ PHÂN HỆ, TÁCH CỘT) */
        /* ======================================================== */
        <div className="space-y-4">
          
          {/* KPI & Quick Category Filter Cards */}
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
                <span className="text-2xl font-black text-slate-800">{totalActivities}</span>
                <span className="text-xs font-bold text-slate-400">hoạt động</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                Toàn bộ danh mục hoạt động trong hệ thống
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
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-700">2. Trải nghiệm / Dự án</span>
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${categoryFilter === 'TRAI_NGHIEM_DU_AN' ? 'bg-teal-200 text-teal-800' : 'bg-teal-100/60 text-[#00A19A]'}`}>
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-teal-950">{projectCount}</span>
                <span className="text-xs font-bold text-teal-600">hoạt động</span>
              </div>
              <p className="text-[11px] text-teal-700/80 mt-1 line-clamp-1">
                Thiết lập Rubric & Sản phẩm học tập
              </p>
              {categoryFilter === 'TRAI_NGHIEM_DU_AN' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#00A19A]" />
              )}
            </button>

            {/* Card 4: Đã bàn giao cơ sở */}
            <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Đã bàn giao cơ sở</span>
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">{allocatedCount}</span>
                <span className="text-xs font-bold text-slate-400">/ {totalActivities} hoạt động</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                Đã đẩy dữ liệu xuống Tổ TLHN cơ sở
              </p>
            </div>
          </div>

          {/* Toolbar Lọc nâng cao: Bậc học, Hệ học, Chủ đề, Học kỳ, Trạng thái, Tìm kiếm */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Năm học */}
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

              {/* BỘ LỌC BẬC HỌC (Dropdown độc lập) */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={levelFilter}
                  onChange={e => setLevelFilter(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Tất cả bậc học</option>
                  <option value="MN">Mầm non</option>
                  <option value="TIEU_HOC">Tiểu học</option>
                  <option value="THCS">THCS</option>
                  <option value="THPT">THPT</option>
                </select>
              </div>

              {/* BỘ LỌC HỆ HỌC (Dropdown độc lập) */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={programTypeFilter}
                  onChange={e => setProgramTypeFilter(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Tất cả hệ học</option>
                  <option value="HE_S">Hệ S (Chất lượng cao)</option>
                  <option value="SONG_NGU">Hệ Song ngữ</option>
                  <option value="QUOC_TE">Hệ Quốc tế</option>
                </select>
              </div>

              {/* BỘ LỌC CHỦ ĐỀ GIÁO DỤC */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={themeFilter}
                  onChange={e => setThemeFilter(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer max-w-[190px]"
                >
                  <option value="ALL">Tất cả chủ đề GD</option>
                  {themes.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Học kỳ */}
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
                  HK 1
                </button>
                <button
                  onClick={() => setSemesterFilter('2')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    semesterFilter === '2' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  HK 2
                </button>
              </div>

              {/* Trạng thái */}
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
                  Áp dụng
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

              {/* Tìm kiếm */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên HĐ, chủ đề, môn..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full text-xs pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] bg-slate-50/60"
                />
              </div>

            </div>

            {/* Nút làm mới & Đếm số */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Hiển thị <span className="font-bold text-slate-800">{catalogs.length}</span> hoạt động
              </span>

              <button
                onClick={loadCatalogs}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tải lại dữ liệu"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00A19A]' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="bg-gradient-to-r from-teal-950 via-[#003B3A] to-slate-900 text-white px-4 py-3 rounded-2xl shadow-lg border border-teal-500/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-teal-400/20 border border-teal-300/30 flex items-center justify-center font-bold text-teal-300">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div className="text-xs font-black tracking-wide">
                  Đã chọn <strong className="text-teal-300 text-sm font-black">{selectedIds.length}</strong> / {catalogs.length} hoạt động
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsAssignCTHSOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-950 bg-gradient-to-r from-teal-300 to-emerald-300 hover:brightness-105 shadow-2xs transition-all cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Gán GV CTHS ({selectedIds.length})</span>
                </button>

                <button
                  onClick={() => handleBulkUpdateStatus('CANCELLED')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-300 to-amber-400 hover:brightness-105 shadow-2xs transition-all cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Hủy ({selectedIds.length})</span>
                </button>

                <button
                  onClick={() => handleBulkUpdateStatus('ACTIVE')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-950 bg-emerald-300 hover:bg-emerald-200 shadow-2xs transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Kích hoạt ({selectedIds.length})</span>
                </button>

                <button
                  onClick={() => handleNormalizeNames(selectedIds)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-900 bg-teal-200 hover:bg-teal-100 shadow-2xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#003B3A]" />
                  <span>Chuẩn hóa ({selectedIds.length})</span>
                </button>

                <button
                  onClick={() => setIsBulkDeleteOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-2xs transition-all cursor-pointer"
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

          {/* Bảng Dữ liệu Danh mục: ĐÃ TÁCH CỘT BẬC HỌC VÀ HỆ HỌC */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={catalogs.length > 0 && selectedIds.length === catalogs.length}
                        onChange={handleToggleSelectAll}
                        title="Chọn tất cả hoạt động"
                        className="w-4 h-4 rounded text-[#00A19A] border-slate-300 focus:ring-[#00A19A] cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-2 text-center w-12 text-slate-500 font-bold">STT</th>
                    <th className="py-3 px-3 w-28 whitespace-nowrap">Khối áp dụng</th>
                    <th className="py-3 px-4 min-w-[220px]">Tên hoạt động</th>
                    
                    {/* TÁCH 2 CỘT RIÊNG: BẬC HỌC VÀ HỆ HỌC */}
                    <th className="py-3 px-3 min-w-[110px] whitespace-nowrap">Bậc học</th>
                    <th className="py-3 px-3 min-w-[110px] whitespace-nowrap">Hệ học</th>

                    <th className="py-3 px-3 min-w-[140px]">Chủ đề giáo dục</th>
                    <th className="py-3 px-3 min-w-[130px]">Môn phối hợp</th>
                    <th className="py-3 px-3 min-w-[100px] whitespace-nowrap">Thời gian & HK</th>
                    <th className="py-3 px-3 min-w-[110px]">Địa điểm</th>
                    <th className="py-3 px-3 min-w-[150px]">GV Phụ trách (CTHS)</th>
                    <th className="py-3 px-3 min-w-[160px]">Hình thức đánh giá</th>
                    <th className="py-3 px-3 min-w-[130px]">Cơ sở tiếp nhận</th>
                    <th className="py-3 px-3 text-center min-w-[110px] sticky right-0 bg-slate-50 border-l border-slate-200/80 shadow-xs">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00A19A]" />
                        Đang tải danh mục hoạt động...
                      </td>
                    </tr>
                  ) : catalogs.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        Chưa có hoạt động nào phù hợp với bộ lọc hiện tại.
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
                      const gradesInfo = formatGradesDisplay(meta.grades);

                      // Danh sách Bậc học
                      const eduLevels = Array.isArray(meta.educationLevels) && meta.educationLevels.length > 0
                        ? meta.educationLevels
                        : [meta.educationLevel || 'TIEU_HOC'];

                      // Danh sách Hệ học
                      const progTypes = Array.isArray(meta.programTypes) && meta.programTypes.length > 0
                        ? meta.programTypes
                        : [meta.programType || 'HE_S'];

                      const cat = getActivityCategory(act);
                      const isEvent = cat === 'HOAT_DONG_SU_KIEN';
                      const evalCfg = meta.evaluationConfig;

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

                          {/* Khối lớp */}
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
                                {isEvent ? (
                                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-purple-100/80 text-purple-800 border border-purple-200">
                                    Sự kiện (Vai trò HS)
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-teal-100/80 text-[#003B3A] border border-teal-200">
                                    Trải nghiệm / Dự án
                                  </span>
                                )}
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

                          {/* CỘT 1 TÁCH: BẬC HỌC */}
                          <td className="py-2.5 px-3 align-middle">
                            <div className="flex flex-wrap gap-1">
                              {eduLevels.map((lvl: string) => (
                                <span
                                  key={lvl}
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap"
                                >
                                  {formatEduLevelName(lvl)}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* CỘT 2 TÁCH: HỆ HỌC */}
                          <td className="py-2.5 px-3 align-middle">
                            <div className="flex flex-wrap gap-1">
                              {progTypes.map((prog: string) => (
                                <span
                                  key={prog}
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 whitespace-nowrap"
                                >
                                  {formatProgTypeName(prog)}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Chủ đề giáo dục */}
                          <td className="py-2.5 px-3 align-middle">
                            {meta.themeName ? (
                              (() => {
                                const themeInfo = getEducationalThemeInfo(meta.themeName);
                                return themeInfo ? (
                                  <span 
                                    className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-bold border leading-snug ${themeInfo.badgeCls}`}
                                    title={themeInfo.description}
                                  >
                                    {meta.themeName}
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {meta.themeName}
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="text-slate-400 font-normal italic">—</span>
                            )}
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
                              <span className="truncate max-w-[120px]" title={meta.expectedLocation || ''}>
                                {meta.expectedLocation || <span className="text-slate-400 font-normal italic">—</span>}
                              </span>
                            </div>
                          </td>

                          {/* GV Phụ trách (Tổ CTHS) */}
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
                                    title={`Quản lý GV Tổ CTHS:\n${fullTooltip}`}
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

                          {/* HÌNH THỨC ĐÁNH GIÁ (3 CHẾ ĐỘ RÕ RÀNG) */}
                          <td className="py-2.5 px-3 align-middle">
                            {(() => {
                              const rawMode = evalCfg?.mode || (isEvent ? 'PARTICIPATION_ONLY' : 'RUBRIC');
                              const evalInfo = getEvaluationModeInfo(rawMode);
                              const isRubric = evalInfo.value === 'RUBRIC';
                              const isCompletion = evalInfo.value === 'COMPLETION_LEVEL';
                              const isParticipation = evalInfo.value === 'PARTICIPATION_ONLY';
                              const critCount = Array.isArray(evalCfg?.criteria) ? evalCfg.criteria.length : 0;

                              let badgeText = 'Chưa thiết lập';
                              if (isParticipation) {
                                badgeText = `CĐ1: Ghi nhận (${evalCfg?.rolesList?.length || 6} VT)`;
                              } else if (isCompletion) {
                                badgeText = 'CĐ2: Mức hoàn thành';
                              } else if (isRubric) {
                                const fText = evalCfg?.formulaType === 'AVERAGE' ? 'Đồng trọng số' : 'Trọng số';
                                badgeText = critCount > 0 ? `CĐ3: Rubric (${critCount} TC - ${fText})` : 'CĐ3: Lập Rubric';
                              }

                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEvalConfigItem(act);
                                    setIsConfigEvalOpen(true);
                                  }}
                                  className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${evalInfo.badgeCls} hover:brightness-95`}
                                  title={`Ma trận đánh giá: ${evalInfo.name}\n${evalInfo.tagline}`}
                                >
                                  <Sliders className="w-3 h-3 shrink-0 opacity-80" />
                                  <span className="truncate max-w-[130px]">{badgeText}</span>
                                  <Edit3 className="w-3 h-3 opacity-50 group-hover:opacity-100 shrink-0" />
                                </button>
                              );
                            })()}
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
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Bàn giao / Đẩy hoạt động xuống cơ sở"
                              >
                                <Building2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Chỉnh sửa */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItem(act);
                                  setIsAddEditOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#00A19A] hover:bg-teal-50 transition-colors cursor-pointer"
                                title="Chỉnh sửa hoạt động"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Hủy / Kích hoạt lại */}
                              <button
                                type="button"
                                onClick={() => handleToggleSingleStatus(act)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  act.status === 'CANCELLED'
                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                    : 'text-amber-600 hover:bg-amber-50'
                                }`}
                                title={act.status === 'CANCELLED' ? 'Kích hoạt lại hoạt động' : 'Hủy hoạt động'}
                              >
                                {act.status === 'CANCELLED' ? <RotateCcw className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                              </button>

                              {/* Xóa */}
                              <button
                                type="button"
                                onClick={() => handleDelete(act)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Xóa hoạt động"
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
        </div>
      )}

      {/* Modals */}
      <CatalogAddEditModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setEditingItem(null);
        }}
        onSaved={loadCatalogs}
        editingItem={editingItem}
        defaultSheetCode="TH_S"
      />

      <CatalogImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={loadCatalogs}
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

      <CatalogAssignCTHSModal
        isOpen={isAssignCTHSOpen}
        onClose={() => setIsAssignCTHSOpen(false)}
        onSaved={() => {
          loadCatalogs();
          setSelectedIds([]);
        }}
        catalogIds={selectedIds}
        selectedActivities={catalogs.filter(c => selectedIds.includes(c.id))}
      />

      <CatalogBulkDeleteModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onDeleted={() => {
          loadCatalogs();
          setSelectedIds([]);
        }}
        selectedActivities={catalogs.filter(c => selectedIds.includes(c.id))}
      />

      <CatalogEvaluationConfigModal
        isOpen={isConfigEvalOpen}
        onClose={() => {
          setIsConfigEvalOpen(false);
          setEvalConfigItem(null);
        }}
        onSaved={loadCatalogs}
        catalogItem={evalConfigItem}
      />

      <CatalogThemeConfigModal
        isOpen={isThemeConfigOpen}
        onClose={() => setIsThemeConfigOpen(false)}
        onSaved={() => {
          fetch('/api/admin/experiential-activities/catalogs/themes')
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setThemes(data); })
            .catch(() => {});
        }}
      />
    </div>
  );
}

export default function ActivityCatalogsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[400px] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[#00A19A]" />
      </div>
    }>
      <ActivityCatalogsContent />
    </Suspense>
  );
}
