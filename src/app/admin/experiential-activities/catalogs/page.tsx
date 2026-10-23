"use client";
import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Plus, Search, Download, UploadCloud, Layers, Sparkles, 
  Building2, BookOpen, Calendar, MapPin, Edit3, Trash2, 
  RefreshCw, Award, Tag, Ban, RotateCcw, CheckSquare, 
  UserCheck, Users, Sliders, CheckCircle2, Send, ArrowUpDown, Eye
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
import { formatTimeFrameAndSemester } from '@/lib/experiential/timeframe-helper';
import { CatalogAddEditModal } from './components/CatalogAddEditModal';
import { CatalogImportModal } from './components/CatalogImportModal';
import { CatalogAllocateModal } from './components/CatalogAllocateModal';
import { CatalogAssignCTHSModal } from './components/CatalogAssignCTHSModal';
import { CatalogBulkDeleteModal } from './components/CatalogBulkDeleteModal';
import { CatalogEvaluationConfigModal } from './components/CatalogEvaluationConfigModal';
import { CatalogThemeConfigModal } from './components/CatalogThemeConfigModal';
import { CatalogThemeManagementView } from './components/CatalogThemeManagementView';
import { CatalogQuickViewDrawer } from './components/CatalogQuickViewDrawer';
import { AssignCatalogToClassModal } from './components/AssignCatalogToClassModal';

export function getActivityCategory(item: ActivityCatalogItem): CatalogActivityCategory {
  const meta: any = item.meta || {};
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
  const [allCatalogs, setAllCatalogs] = useState<ActivityCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Filters
  const [levelFilter, setLevelFilter] = useState<string>('ALL'); // 'ALL' | 'MN' | 'TIEU_HOC' | 'THCS' | 'THPT'
  const [programTypeFilter, setProgramTypeFilter] = useState<string>('ALL'); // 'ALL' | 'HE_S' | 'SONG_NGU' | 'QUOC_TE'
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'HOAT_DONG_SU_KIEN' | 'TRAI_NGHIEM_DU_AN'>('ALL');
  const [themeFilter, setThemeFilter] = useState<string>('ALL');
  const [themes, setThemes] = useState<EducationalThemeItem[]>(DEFAULT_EDUCATIONAL_THEMES);
  const [semesterFilter, setSemesterFilter] = useState<'ALL' | '1' | '2'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ALLOCATED' | 'UNALLOCATED' | 'CANCELLED'>('ALL');
  const [timeSortOrder, setTimeSortOrder] = useState<'desc' | 'asc'>('desc');

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
  const [isSyncingMaster, setIsSyncingMaster] = useState(false);
  const [isThemeConfigOpen, setIsThemeConfigOpen] = useState(false);
  const [quickViewItem, setQuickViewItem] = useState<ActivityCatalogItem | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isAssignToClassOpen, setIsAssignToClassOpen] = useState(false);
  const [assignToClassItem, setAssignToClassItem] = useState<any>(null);

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
    if (statusFilter === 'ACTIVE' || statusFilter === 'CANCELLED') url += `&status=${statusFilter}`;
    if (search.trim()) url += `&q=${encodeURIComponent(search.trim())}`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        const rawList = Array.isArray(data) ? data : [];
        setAllCatalogs(rawList);
        let list = [...rawList];
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
          const targetSem = parseInt(semesterFilter, 10);
          list = list.filter(item => {
            const timeInfo = formatTimeFrameAndSemester(item.meta?.timeFrame, '2026-2027', item.meta?.semester);
            return timeInfo.semester === targetSem;
          });
        }
        if (statusFilter === 'ALLOCATED') {
          list = list.filter(item => item.meta?.allocatedCampuses && item.meta.allocatedCampuses.length > 0);
        } else if (statusFilter === 'UNALLOCATED') {
          list = list.filter(item => !item.meta?.allocatedCampuses || item.meta.allocatedCampuses.length === 0);
        }

        // Sắp xếp theo Thời gian & HK (mặc định Giảm dần theo yêu cầu)
        const getTimeSortValue = (item: any): number => {
          const meta = item?.meta || {};
          const timeInfo = formatTimeFrameAndSemester(meta.timeFrame, '2026-2027', meta.semester);
          const year = timeInfo.year || 2026;
          const month = timeInfo.month !== null ? timeInfo.month : (timeInfo.semester === 2 ? 6 : 9);
          const sem = timeInfo.semester || 1;
          return year * 1000 + month * 10 + sem;
        };

        list.sort((a, b) => {
          const valA = getTimeSortValue(a);
          const valB = getTimeSortValue(b);
          if (valA !== valB) {
            return timeSortOrder === 'desc' ? valB - valA : valA - valB;
          }
          return (a.code || '').localeCompare(b.code || '');
        });

        setCatalogs(list);
        setLoading(false);
      })
      .catch(() => {
        setAllCatalogs([]);
        setCatalogs([]);
        setLoading(false);
      });
  }, [selectedYearId, levelFilter, programTypeFilter, categoryFilter, themeFilter, semesterFilter, statusFilter, search, timeSortOrder]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  // Tự động mở modal Đẩy Hoạt Động Xuống Cơ Sở nếu có query param allocateId hoặc editId
  const allocateParamId = searchParams.get('allocateId') || searchParams.get('editId');
  useEffect(() => {
    if (allocateParamId && catalogs.length > 0) {
      const target = catalogs.find(c => c.id === allocateParamId || c.code === allocateParamId);
      if (target) {
        setAllocatingItem(target);
        setIsAllocateOpen(true);
      }
    }
  }, [allocateParamId, catalogs]);

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
        let errData: any = null;
        try {
          const text = await res.text();
          errData = text ? JSON.parse(text) : {};
        } catch {}
        throw new Error(errData?.error || `Lỗi khi xóa (Mã lỗi: ${res.status})`);
      }
      toast.success('Đã xóa hoạt động thành công');
      loadCatalogs();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    }
  };

  const handleSyncMasterPlan = async () => {
    if (!confirm('Bạn có chắc chắn muốn nạp và đồng bộ 29 hoạt động chuẩn từ 7 Phụ lục Kế hoạch tổng thể 2026-2027 vào hệ thống?')) return;
    setIsSyncingMaster(true);
    try {
      const res = await fetch('/api/admin/experiential-activities/catalogs/sync-master', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi đồng bộ Master Catalog');
      toast.success(data.message || 'Đồng bộ 7 Phụ lục Kế hoạch 2026-2027 thành công!');
      loadCatalogs();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi hệ thống');
    } finally {
      setIsSyncingMaster(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/admin/experiential-activities/catalogs/template';
  };

  // Stats calculation
  const sourceList = allCatalogs.length > 0 ? allCatalogs : catalogs;
  const totalActivities = sourceList.length;
  const eventCount = sourceList.filter(c => getActivityCategory(c) === 'HOAT_DONG_SU_KIEN').length;
  const projectCount = sourceList.filter(c => getActivityCategory(c) === 'TRAI_NGHIEM_DU_AN').length;
  const allocatedCount = sourceList.filter(c => c.meta?.allocatedCampuses && c.meta.allocatedCampuses.length > 0).length;

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
            onClick={handleSyncMasterPlan}
            disabled={isSyncingMaster}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 hover:bg-amber-100 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Nạp chuẩn hóa danh mục 7 Phụ lục từ Kế hoạch tổng thể 2026-2027"
          >
            <BookOpen className={`w-3.5 h-3.5 text-amber-700 ${isSyncingMaster ? 'animate-spin' : ''}`} />
            <span>{isSyncingMaster ? 'Đang đồng bộ...' : 'Đồng bộ 7 Phụ lục 2026-2027'}</span>
          </button>

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

            {/* Card 4: Đã bàn giao cơ sở & Gán lớp */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'ALLOCATED' ? 'ALL' : 'ALLOCATED')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                statusFilter === 'ALLOCATED'
                  ? 'bg-blue-50/70 border-blue-500 shadow-md ring-2 ring-blue-400/25'
                  : 'bg-white border-slate-200/90 hover:border-blue-200 hover:bg-blue-50/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] font-black uppercase tracking-wider ${statusFilter === 'ALLOCATED' ? 'text-blue-800' : 'text-slate-500'}`}>
                  Đã bàn giao cơ sở
                </span>
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${statusFilter === 'ALLOCATED' ? 'bg-blue-200 text-blue-800' : 'bg-blue-50 text-blue-600'}`}>
                  <Building2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${statusFilter === 'ALLOCATED' ? 'text-blue-950' : 'text-slate-800'}`}>
                  {allocatedCount}
                </span>
                <span className="text-xs font-bold text-slate-400">/ {totalActivities} hoạt động</span>
              </div>
              <p className={`text-[11px] mt-1 line-clamp-1 ${statusFilter === 'ALLOCATED' ? 'text-blue-700 font-bold' : 'text-slate-400'}`}>
                {statusFilter === 'ALLOCATED' ? 'Đang lọc: Đã gán lớp' : 'Đã đẩy phân bổ cơ sở & lớp'}
              </p>
              {statusFilter === 'ALLOCATED' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
              )}
            </button>
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

              {/* Trạng thái / Tình trạng */}
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
                  onClick={() => setStatusFilter('ALLOCATED')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'ALLOCATED' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Chỉ hiển thị các hoạt động đã được gán lớp & cơ sở"
                >
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                    <span>Đã gán lớp</span>
                    {allocatedCount > 0 && (
                      <span className="text-[10px] font-black text-blue-800 bg-blue-100 px-1 rounded-sm">
                        {allocatedCount}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setStatusFilter('UNALLOCATED')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'UNALLOCATED' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Chỉ hiển thị các hoạt động chưa được gán lớp"
                >
                  Chưa gán lớp
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                Hiển thị <span className="font-bold text-slate-800">{catalogs.length}</span> hoạt động
              </span>

              {/* Nút chuyển đổi thứ tự sắp xếp Thời gian & HK */}
              <button
                type="button"
                onClick={() => setTimeSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#003B3A] bg-teal-50 hover:bg-teal-100 border border-teal-200 shadow-2xs transition-all cursor-pointer"
                title="Bấm để đổi chiều sắp xếp Thời gian & HK: Giảm dần ⇄ Tăng dần"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-[#00A19A]" />
                <span>Thời gian: {timeSortOrder === 'desc' ? 'Giảm dần' : 'Tăng dần'}</span>
              </button>

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
                  <span>Gán GVBM (TCM) ({selectedIds.length})</span>
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

          {/* Bảng Dữ liệu Danh mục: 8 CỘT TINH GỌN, HIỆN ĐẠI, KHÔNG TRÀN MÀN HÌNH */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    {/* Cột 1: STT & Checkbox */}
                    <th className="py-3 px-2 text-center w-14 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={catalogs.length > 0 && selectedIds.length === catalogs.length}
                          onChange={handleToggleSelectAll}
                          title="Chọn tất cả hoạt động"
                          className="w-4 h-4 rounded text-[#00A19A] border-slate-300 focus:ring-[#00A19A] cursor-pointer"
                        />
                        <span className="text-slate-500 font-bold text-[11px]">STT</span>
                      </div>
                    </th>

                    {/* Cột 2: Hoạt động & Khối lớp / Bậc / Hệ */}
                    <th className="py-3 px-3 min-w-[260px]">Hoạt động & Đối tượng</th>

                    {/* Cột 3: Chủ đề giáo dục */}
                    <th className="py-3 px-3 min-w-[130px]">Chủ đề giáo dục</th>

                    {/* Cột 4: Môn học & Phụ trách */}
                    <th className="py-3 px-3 min-w-[170px]">Môn học & Phụ trách</th>

                    {/* Cột 5: Thời gian & Địa điểm (Sortable) */}
                    <th 
                      onClick={() => setTimeSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                      className="py-3 px-3 min-w-[145px] whitespace-nowrap cursor-pointer select-none hover:bg-teal-50/70 transition-colors group"
                      title="Bấm để đổi chiều sắp xếp theo Thời gian & HK: Giảm dần ⇄ Tăng dần"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Thời gian & Địa điểm</span>
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                          timeSortOrder === 'desc' 
                            ? 'bg-teal-100 text-[#003B3A] border border-teal-300' 
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {timeSortOrder === 'desc' ? '↓ Giảm dần' : '↑ Tăng dần'}
                        </span>
                      </div>
                    </th>

                    {/* Cột 6: Hình thức đánh giá */}
                    <th className="py-3 px-3 min-w-[150px]">Hình thức đánh giá</th>

                    {/* Cột 7: Cơ sở & Lớp tiếp nhận */}
                    <th className="py-3 px-3 min-w-[150px]">Cơ sở & Lớp tiếp nhận</th>

                    {/* Cột 8: Thao tác (Sticky right) */}
                    <th className="py-3 px-3 text-center min-w-[130px] sticky right-0 bg-slate-50 border-l border-slate-200/80 shadow-xs">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00A19A]" />
                        Đang tải danh mục hoạt động...
                      </td>
                    </tr>
                  ) : catalogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
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
                      const meta: any = act.meta || {};
                      const allocatedCampuses = meta.allocatedCampuses || [];
                      const isSelected = selectedIds.includes(act.id);
                      const gradesInfo = formatGradesDisplay(meta.grades);
                      const isAllocated = allocatedCampuses.length > 0;
                      const totalAssignedClasses = allocatedCampuses.reduce((acc: number, a: any) => {
                        const count = a.assignedClassesCount || (Array.isArray(a.assignedClasses) ? a.assignedClasses.length : 0) || (Array.isArray(a.selectedClassIds) ? a.selectedClassIds.length : 0);
                        return acc + count;
                      }, 0);
                      const allocatedTooltip = isAllocated
                        ? `Đã gán cho ${totalAssignedClasses > 0 ? `${totalAssignedClasses} lớp ` : ''}thuộc ${allocatedCampuses.map((a: any) => a.campusCode || a.campusName).join(', ')}`
                        : 'Hoạt động này chưa được phân bổ xuống cơ sở và lớp';

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
                          className={`hover:bg-teal-50/20 transition-colors ${isSelected ? 'bg-teal-50/40' : ''}`}
                        >
                          {/* Cột 1: Checkbox & STT */}
                          <td className="py-2.5 px-2 text-center align-top">
                            <div className="flex items-center justify-center gap-1.5 pt-0.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectOne(act.id)}
                                className="w-4 h-4 rounded text-[#00A19A] border-slate-300 focus:ring-[#00A19A] cursor-pointer"
                              />
                              <span className="text-slate-400 font-semibold text-[11px] w-5 text-center">{idx + 1}</span>
                            </div>
                          </td>

                          {/* Cột 2: Tên hoạt động & Khối / Bậc / Hệ - Click mở QuickView */}
                          <td className="py-2.5 px-3 align-top">
                            <div className="space-y-1.5">
                              {/* Tên hoạt động */}
                              <div 
                                className="group cursor-pointer inline-flex items-start gap-1.5"
                                onClick={() => {
                                  setQuickViewItem(act);
                                  setIsQuickViewOpen(true);
                                }}
                                title="Bấm để xem nhanh toàn bộ thông tin chi tiết (Nội dung, Mục tiêu, Tiêu chí)"
                              >
                                <span className={`font-bold text-[13px] leading-snug group-hover:text-[#00A19A] transition-colors ${act.status === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                  {act.name}
                                </span>
                                <Eye className="w-3.5 h-3.5 text-[#00A19A] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                              </div>

                              {/* Badges: Mã, Khối, Bậc, Hệ, Phân loại, Trạng thái (KHÔNG có badge gán lớp ở đây) */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                  {act.code}
                                </span>

                                {/* Khối lớp */}
                                <span 
                                  className={`inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                    gradesInfo.isAll 
                                      ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                                  }`}
                                  title={`Danh sách khối: ${gradesInfo.fullText || gradesInfo.label}`}
                                >
                                  {gradesInfo.label}
                                </span>

                                {/* Bậc học */}
                                {eduLevels.map((lvl: string) => (
                                  <span
                                    key={lvl}
                                    className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap"
                                  >
                                    {formatEduLevelName(lvl)}
                                  </span>
                                ))}

                                {/* Hệ học */}
                                {progTypes.map((prog: string) => (
                                  <span
                                    key={prog}
                                    className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 whitespace-nowrap"
                                  >
                                    {formatProgTypeName(prog)}
                                  </span>
                                ))}

                                {/* Phân loại */}
                                {isEvent ? (
                                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-purple-100/80 text-purple-800 border border-purple-200">
                                    Sự kiện
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-teal-100/80 text-[#003B3A] border border-teal-200">
                                    Trải nghiệm
                                  </span>
                                )}

                                {/* Trạng thái nếu Hủy */}
                                {act.status === 'CANCELLED' && (
                                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    Đã hủy
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Cột 3: Chủ đề giáo dục */}
                          <td className="py-2.5 px-3 align-top">
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

                          {/* Cột 4: Môn học & Phụ trách (Môn chủ trì, tích hợp, GVBM TCM) */}
                          <td className="py-2.5 px-3 align-top">
                            <div className="space-y-1.5">
                              {/* Môn chủ trì & Môn phối hợp */}
                              <div>
                                {meta.primarySubjectName && (
                                  <div className="mb-0.5">
                                    <span className="font-bold text-indigo-700 bg-indigo-50/90 border border-indigo-200 px-1.5 py-0.2 rounded text-[10px] inline-block">
                                      Chủ trì: {meta.primarySubjectName}
                                    </span>
                                  </div>
                                )}
                                {(meta.coopSubjectNames || meta.integratedSubjects) && (
                                  <div className="text-slate-600 text-[10px] line-clamp-1" title={meta.coopSubjectNames || meta.integratedSubjects}>
                                    <span className="text-slate-500">Phối hợp: </span>
                                    <span className="font-medium text-slate-700">{meta.coopSubjectNames || meta.integratedSubjects}</span>
                                  </div>
                                )}
                              </div>

                              {/* GVBM Phụ trách / TCM */}
                              <div>
                                {meta.subjectTeacherName || meta.cthsTeacherName || (Array.isArray(meta.assignedTeachers) && meta.assignedTeachers.length > 0) || (Array.isArray(meta.cthsTeachers) && meta.cthsTeachers.length > 0) ? (
                                  (() => {
                                    const teacherList = (Array.isArray(meta.assignedTeachers) && meta.assignedTeachers.length > 0)
                                      ? meta.assignedTeachers
                                      : (Array.isArray(meta.cthsTeachers) && meta.cthsTeachers.length > 0)
                                        ? meta.cthsTeachers
                                        : [{
                                            id: meta.subjectTeacherId || meta.cthsTeacherId || '',
                                            teacherCode: meta.subjectTeacherCode || meta.cthsTeacherCode || '',
                                            teacherName: meta.subjectTeacherName || meta.cthsTeacherName || '',
                                            departmentName: meta.departmentName || '',
                                            campusCode: meta.cthsTeacherCampus || '',
                                            phone: meta.cthsTeacherPhone || '',
                                            email: meta.subjectTeacherEmail || meta.cthsTeacherEmail || ''
                                          }];
                                    const firstTeacher = teacherList[0];
                                    const extraCount = teacherList.length - 1;
                                    const deptLabel = firstTeacher?.departmentName || meta.departmentName || '';
                                    const fullTooltip = teacherList.map((t: any) => 
                                      `• ${t.teacherName} (Mã: ${t.teacherCode || '—'})${t.departmentName ? ` - TCM: ${t.departmentName}` : ''}${t.campusCode ? ` - CS: ${t.campusCode}` : ''}${t.phone ? ` - SĐT: ${t.phone}` : ''}${t.email ? ` - Email: ${t.email}` : ''}`
                                    ).join('\n');

                                    return (
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          setSelectedIds([act.id]);
                                          setIsAssignCTHSOpen(true);
                                        }}
                                        className="group cursor-pointer inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-all text-left shadow-2xs w-full max-w-[180px]"
                                        title={`GVBM Phụ trách theo Tổ chuyên môn:\n${fullTooltip}\n(Bấm để xem chi tiết / thay đổi)`}
                                      >
                                        <div className="w-5 h-5 rounded-full bg-[#00A19A] text-white flex items-center justify-center text-[9px] font-black shrink-0">
                                          {firstTeacher?.teacherName?.split(' ').slice(-1)[0]?.charAt(0) || 'G'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="text-[11px] font-bold text-teal-950 truncate flex items-center gap-1 leading-tight">
                                            <span>{firstTeacher?.teacherName}</span>
                                            {extraCount > 0 && (
                                              <span className="text-[8px] font-bold px-1 rounded-full bg-teal-200 text-[#003B3A]">
                                                +{extraCount}
                                              </span>
                                            )}
                                          </div>
                                          {deptLabel ? (
                                            <div className="text-[9px] text-[#003B3A] font-medium truncate">
                                              TCM: {deptLabel}
                                            </div>
                                          ) : null}
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
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-slate-500 hover:text-[#00A19A] hover:bg-teal-50 border border-dashed border-slate-300 hover:border-teal-400 transition-all cursor-pointer shadow-2xs"
                                    title="Bấm để phân công GVBM theo Tổ chuyên môn phụ trách"
                                  >
                                    <UserCheck className="w-3 h-3 text-slate-400" />
                                    <span>+ Gán GVBM</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Cột 5: Thời gian & Địa điểm (Sạch sẽ, không badge thừa) */}
                          <td className="py-2.5 px-3 align-top whitespace-nowrap">
                            {(() => {
                              const timeInfo = formatTimeFrameAndSemester(meta.timeFrame, '2026-2027', meta.semester);
                              return (
                                <div className="space-y-1">
                                  <div className="font-extrabold text-[12px] text-slate-800 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
                                    <span>{timeInfo.formattedTime}</span>
                                    {timeInfo.semester === 1 ? (
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                                        HK1
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                        HK2
                                      </span>
                                    )}
                                  </div>
                                  {meta.expectedLocation && (
                                    <div className="flex items-center gap-1 text-slate-600 text-[11px]" title={meta.expectedLocation}>
                                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="truncate max-w-[130px]">{meta.expectedLocation}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>

                          {/* Cột 6: Hình thức đánh giá (3 Chế độ rõ ràng) */}
                          <td className="py-2.5 px-3 align-top">
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
                                  title={`Ma trận đánh giá: ${evalInfo.name}\n${evalInfo.tagline}\n(Bấm để cấu hình)`}
                                >
                                  <Sliders className="w-3 h-3 shrink-0 opacity-80" />
                                  <span className="truncate max-w-[125px]">{badgeText}</span>
                                  <Edit3 className="w-3 h-3 opacity-50 group-hover:opacity-100 shrink-0" />
                                </button>
                              );
                            })()}
                          </td>

                          {/* Cột 7: Cơ sở & Lớp tiếp nhận (Nơi duy nhất hiển thị tình trạng gán lớp) */}
                          <td className="py-2.5 px-3 align-top">
                            {allocatedCampuses.length === 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setAllocatingItem(act);
                                  setIsAllocateOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200 hover:bg-teal-50 hover:text-[#00A19A] hover:border-teal-300 transition-colors cursor-pointer"
                                title="Bấm để phân bổ cơ sở & gán lớp"
                              >
                                <span>Chưa gán lớp</span>
                              </button>
                            ) : (
                              <div 
                                className="space-y-1 cursor-pointer group"
                                onClick={() => {
                                  setAllocatingItem(act);
                                  setIsAllocateOpen(true);
                                }}
                                title="Bấm để xem hoặc chỉnh sửa danh sách lớp tiếp nhận"
                              >
                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs group-hover:bg-blue-100 transition-colors">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                  <span>Đã gán {totalAssignedClasses > 0 ? `${totalAssignedClasses} lớp` : 'lớp'}</span>
                                </div>
                                <div className="space-y-0.5">
                                  {allocatedCampuses.map((a: any) => {
                                    const isDeployed = a.status === 'DA_TRIEN_KHAI';
                                    const isAccepted = a.status === 'DA_TIEP_NHAN';
                                    const classCount = a.assignedClassesCount || (Array.isArray(a.assignedClasses) ? a.assignedClasses.length : 0) || (Array.isArray(a.selectedClassIds) ? a.selectedClassIds.length : 0);
                                    return (
                                      <div key={a.campusId} className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDeployed ? 'bg-emerald-500' : isAccepted ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                        <span className="text-[11px] font-bold text-slate-700">{a.campusCode || a.campusName}</span>
                                        <span className="text-[10px] text-slate-500">
                                          {classCount > 0 ? `(${classCount} lớp)` : isDeployed ? '(Triển khai)' : isAccepted ? '(Đã nhận)' : '(Chờ)'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Cột 8: Thao tác (Sticky right) */}
                          <td className="py-2.5 px-2 text-center sticky right-0 bg-white/95 backdrop-blur-xs border-l border-slate-200/80 shadow-xs align-top">
                            <div className="flex items-center justify-center gap-1">
                              {/* Đẩy cơ sở & Gán lớp */}
                              <button
                                type="button"
                                onClick={() => {
                                  setAllocatingItem(act);
                                  setIsAllocateOpen(true);
                                }}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl font-bold text-[11px] transition-all cursor-pointer shadow-2xs shrink-0 ${
                                  isAllocated
                                    ? 'bg-blue-100 hover:bg-blue-200/80 text-blue-800 border border-blue-300'
                                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80'
                                }`}
                                title={isAllocated ? `Đã gán ${totalAssignedClasses > 0 ? `${totalAssignedClasses} lớp` : ''} - Bấm để chỉnh sửa phân bổ hoặc gửi email` : "Đẩy Hoạt Động Xuống Cơ Sở & Gán lớp"}
                              >
                                {isAllocated ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span>Đã gán</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span>Đẩy CS</span>
                                  </>
                                )}
                              </button>

                              {/* Thêm vào lớp của tôi (Dành cho GVCN để đánh giá vai trò học sinh) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignToClassItem(act);
                                  setIsAssignToClassOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-950 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Dành cho GVCN: Thêm hoạt động này vào lớp của tôi để đánh giá vai trò của Học sinh"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              </button>

                              {/* Xem nhanh Quick-View */}
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickViewItem(act);
                                  setIsQuickViewOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-[#00A19A] hover:bg-teal-50 transition-colors cursor-pointer"
                                title="Xem nhanh toàn diện thông tin (Quick-View Drawer)"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Chỉnh sửa */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItem(act);
                                  setIsAddEditOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#00A19A] hover:bg-teal-50 transition-colors cursor-pointer"
                                title="Chỉnh sửa toàn bộ thông tin hoạt động"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Cấu hình Tiêu chí & Rubric Đánh giá */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEvalConfigItem(act);
                                  setIsConfigEvalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
                                title="Cấu hình Chuyên môn & Tiêu chí Đánh giá"
                              >
                                <Sliders className="w-3.5 h-3.5" />
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
        initialData={editingItem}
        defaultSheetCode="TH_S"
        activeSheetCode="TH_S"
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
        academicYearId={selectedYearId}
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
        onSuccess={() => {
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
        onThemesUpdated={(updatedThemes) => {
          if (Array.isArray(updatedThemes)) setThemes(updatedThemes);
        }}
      />

      <CatalogQuickViewDrawer
        open={isQuickViewOpen}
        onClose={() => {
          setIsQuickViewOpen(false);
          setQuickViewItem(null);
        }}
        item={quickViewItem}
        onOpenAllocate={(item) => {
          setAllocatingItem(item);
          setIsAllocateOpen(true);
        }}
        onOpenEdit={(item) => {
          setEditingItem(item);
          setIsAddEditOpen(true);
        }}
        onOpenEvalConfig={(item) => {
          setEvalConfigItem(item);
          setIsConfigEvalOpen(true);
        }}
        onOpenAssignToClass={(item) => {
          setAssignToClassItem(item);
          setIsAssignToClassOpen(true);
        }}
      />

      <AssignCatalogToClassModal
        isOpen={isAssignToClassOpen}
        onClose={() => {
          setIsAssignToClassOpen(false);
          setAssignToClassItem(null);
        }}
        catalogItem={assignToClassItem}
        academicYearId={selectedYearId}
        onSuccess={loadCatalogs}
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
