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
  EDUCATION_LEVEL_OPTIONS,
  PROGRAM_TYPE_OPTIONS
} from '@/lib/experiential/catalog-types';
import { CatalogAddEditModal } from './components/CatalogAddEditModal';
import { CatalogImportModal } from './components/CatalogImportModal';
import { CatalogAllocateModal } from './components/CatalogAllocateModal';
import { CatalogAssignCTHSModal } from './components/CatalogAssignCTHSModal';
import { CatalogBulkDeleteModal } from './components/CatalogBulkDeleteModal';
import { CatalogEvaluationConfigModal } from './components/CatalogEvaluationConfigModal';

export default function ActivityCatalogsPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [activeSheetCode, setActiveSheetCode] = useState<SheetCode>('TH_S');
  const [catalogs, setCatalogs] = useState<ActivityCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

    fetch(url)
      .then(r => r.json())
      .then(data => {
        let list = Array.isArray(data) ? data : [];
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
  }, [activeSheetCode, selectedYearId, search, semesterFilter, gradeFilter, statusFilter]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  // Clear selected when sheet or filters change
  useEffect(() => {
    setSelectedIds([]);
  }, [activeSheetCode, selectedYearId, semesterFilter, gradeFilter, statusFilter]);

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

  const currentSheetCfg = SHEET_CONFIGS.find(s => s.code === activeSheetCode) || SHEET_CONFIGS[1];

  // Stats calculation
  const totalInSheet = catalogs.length;
  const allocatedCount = catalogs.filter(c => c.meta?.allocatedCampuses && c.meta.allocatedCampuses.length > 0).length;
  const hk1Count = catalogs.filter(c => c.meta?.semester === 1).length;
  const hk2Count = catalogs.filter(c => c.meta?.semester === 2).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans px-4 sm:px-6">
      {/* Page Title & Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#00A19A]/10 text-[#00A19A] border border-[#00A19A]/20">
              Tổ CTHS Phụ trách
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              Ban ĐHCM & BP NK&HĐNLLL
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-[#003B3A]" />
            Danh Mục Quản Lý HĐTN & Ngoại Khóa
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Cấu hình danh mục chuẩn theo bậc học, hỗ trợ import file tổng hợp năm học và đẩy hoạt động xuống cho GV Tổ TLHN cơ sở
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-all"
            title="Tải file mẫu Excel 7 sheet"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Tải mẫu Excel</span>
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={() => handleNormalizeNames()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 shadow-xs transition-all cursor-pointer"
            title="Chuẩn hóa lại tên tất cả hoạt động: Viết hoa đầu dòng, không viết hoa tất cả"
          >
            <Sparkles className="w-4 h-4 text-[#00A19A]" />
            <span>Chuẩn hóa tên HĐ</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsAddEditOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 shadow-md shadow-[#00A19A]/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm hoạt động</span>
          </button>
        </div>
      </div>

      {/* Experiential Navigation Tabs */}
      <ExperientialTabs activeTab="catalogs" />

      {/* Control Bar: Academic Year, Search, Semester & Grade Filters */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Năm học:</span>
            <select
              value={selectedYearId}
              onChange={e => setSelectedYearId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:border-[#00A19A]"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên HĐ, chủ đề, môn..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] bg-slate-50/50"
            />
          </div>

          {/* Semester Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSemesterFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                semesterFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cả năm
            </button>
            <button
              onClick={() => setSemesterFilter('1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                semesterFilter === '1' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Học kỳ 1
            </button>
            <button
              onClick={() => setSemesterFilter('2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                semesterFilter === '2' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Học kỳ 2
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đang áp dụng
            </button>
            <button
              onClick={() => setStatusFilter('CANCELLED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'CANCELLED' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã hủy
            </button>
          </div>
        </div>

        <button
          onClick={loadCatalogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Educational Level & Program Type Tabs (Matching Excel Sheets) */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 flex flex-wrap gap-1.5">
        {SHEET_CONFIGS.map(cfg => {
          const isActive = activeSheetCode === cfg.code;
          return (
            <button
              key={cfg.code}
              onClick={() => {
                setActiveSheetCode(cfg.code);
                setGradeFilter('ALL');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white text-[#003B3A] shadow-md shadow-slate-200 border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 ${isActive ? 'text-[#00A19A]' : 'text-slate-400'}`} />
              <span>{cfg.title}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-[#00A19A]/10 text-[#00A19A]' : 'bg-slate-200 text-slate-500'}`}>
                {cfg.sheetName}
              </span>
            </button>
          );
        })}
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng hoạt động phân hệ</div>
          <div className="text-xl font-black text-slate-800 mt-1">{totalInSheet} hoạt động</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#00A19A] uppercase tracking-wider">Đã đẩy xuống cơ sở</div>
          <div className="text-xl font-black text-[#00A19A] mt-1">{allocatedCount} hoạt động</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">Hoạt động Học kỳ 1</div>
          <div className="text-xl font-black text-indigo-700 mt-1">{hk1Count} hoạt động</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Hoạt động Học kỳ 2</div>
          <div className="text-xl font-black text-amber-700 mt-1">{hk2Count} hoạt động</div>
        </div>
      </div>

      {/* Bulk Action Bar (Hiển thị khi chọn 1 hoặc nhiều hoạt động) */}
      {selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-teal-900 via-[#003B3A] to-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-teal-500/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-400/20 border border-teal-300/30 flex items-center justify-center font-bold text-teal-300">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black tracking-wide flex items-center gap-2">
                <span>Đã chọn <strong className="text-teal-300 text-sm font-black">{selectedIds.length}</strong> / {catalogs.length} hoạt động</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-teal-200">
                  {currentSheetCfg.title}
                </span>
              </div>
              <div className="text-[11px] text-teal-200/80">
                Thao tác hàng loạt: Gán người phụ trách Tổ CTHS hoặc xóa các hoạt động đã chọn
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAssignCTHSOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-950 bg-gradient-to-r from-teal-300 to-emerald-300 hover:brightness-105 shadow-sm shadow-teal-400/20 transition-all cursor-pointer"
              title="Gán giáo viên/cán bộ Tổ CTHS phụ trách cho các hoạt động đã chọn"
            >
              <UserCheck className="w-4 h-4" />
              <span>Gán GV CTHS ({selectedIds.length})</span>
            </button>

            {/* Nút HỦY HÀNG LOẠT */}
            <button
              onClick={() => handleBulkUpdateStatus('CANCELLED')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-300 to-amber-400 hover:brightness-105 shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
              title="Chuyển các hoạt động đã chọn sang trạng thái HỦY (bảo toàn lịch sử đánh giá)"
            >
              <Ban className="w-4 h-4" />
              <span>Hủy hoạt động ({selectedIds.length})</span>
            </button>

            {/* Nút KÍCH HOẠT LẠI HÀNG LOẠT */}
            <button
              onClick={() => handleBulkUpdateStatus('ACTIVE')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-emerald-300 hover:bg-emerald-200 shadow-sm transition-all cursor-pointer"
              title="Kích hoạt lại các hoạt động đã hủy"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kích hoạt lại ({selectedIds.length})</span>
            </button>

            {/* Nút CHUẨN HÓA TÊN HÀNG LOẠT */}
            <button
              onClick={() => handleNormalizeNames(selectedIds)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-900 bg-teal-200 hover:bg-teal-100 shadow-sm transition-all cursor-pointer"
              title="Chuẩn hóa tên các hoạt động đã chọn (Viết hoa đầu dòng, không viết hoa tất cả)"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#003B3A]" />
              <span>Chuẩn hóa tên ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => setIsBulkDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-sm shadow-rose-600/20 transition-all cursor-pointer"
              title="Xóa vĩnh viễn các hoạt động đã chọn khỏi danh mục"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={catalogs.length > 0 && selectedIds.length === catalogs.length}
                    onChange={handleToggleSelectAll}
                    title="Chọn tất cả hoạt động trên bảng"
                    className="w-4 h-4 rounded text-[#00A19A] border-slate-300 focus:ring-[#00A19A] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-2 text-center w-10">STT</th>
                <th className="py-3 px-3 w-16">Khối</th>
                <th className="py-3 px-4 min-w-[200px]">Tên hoạt động ngoại khóa</th>
                <th className="py-3 px-3 min-w-[120px]">Bậc học</th>
                <th className="py-3 px-3 min-w-[110px]">Hệ học</th>
                <th className="py-3 px-4 min-w-[160px]">Chủ đề giáo dục</th>
                <th className="py-3 px-3 min-w-[140px]">Môn phối hợp / Tích hợp</th>
                <th className="py-3 px-3 min-w-[120px]">Thời gian & HK</th>
                <th className="py-3 px-3 min-w-[130px]">Địa điểm dự kiến</th>
                <th className="py-3 px-3 min-w-[160px]">GV Phụ trách Kế hoạch</th>
                <th className="py-3 px-3 min-w-[140px]">Sản phẩm / Dự án</th>
                <th className="py-3 px-3 min-w-[150px]">Cấu hình & Đánh giá</th>
                <th className="py-3 px-3 min-w-[140px]">Cơ sở tiếp nhận (TLHN)</th>
                <th className="py-3 px-3 text-center min-w-[130px] sticky right-0 bg-slate-50">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00A19A]" />
                    Đang tải danh mục hoạt động...
                  </td>
                </tr>
              ) : catalogs.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    Chưa có hoạt động nào trong danh mục phân hệ <span className="font-bold text-slate-600">{currentSheetCfg.title}</span>.
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

                  // Bậc học
                  const eduLevels = Array.isArray(meta.educationLevels) && meta.educationLevels.length > 0
                    ? meta.educationLevels
                    : [meta.educationLevel || currentSheetCfg.level];

                  // Hệ học
                  const progTypes = Array.isArray(meta.programTypes) && meta.programTypes.length > 0
                    ? meta.programTypes
                    : [meta.programType || currentSheetCfg.program];

                  // Cấu hình đánh giá
                  const evalCfg = meta.evaluationConfig;
                  const mode = evalCfg?.mode;
                  const critCount = (mode === 'CRITERIA' && Array.isArray(evalCfg?.criteria)) ? evalCfg.criteria.length : 0;

                  return (
                    <tr 
                      key={act.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-teal-50/50' : ''}`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(act.id)}
                          className="w-4 h-4 rounded text-[#00A19A] border-slate-300 focus:ring-[#00A19A] cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {Array.isArray(meta.grades) ? meta.grades.join(', ') : meta.grades || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-extrabold text-[13px] ${act.status === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-[#003B3A]'}`}>
                            {act.name}
                          </span>
                          {act.status === 'CANCELLED' ? (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200">
                              Đã hủy
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              Áp dụng
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{act.code}</div>
                      </td>

                      {/* Bậc học (1 hoặc nhiều bậc) */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {eduLevels.map((lvl: string) => {
                            const opt = EDUCATION_LEVEL_OPTIONS.find(o => o.id === lvl);
                            return (
                              <span
                                key={lvl}
                                className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/60 whitespace-nowrap"
                              >
                                {opt?.name || lvl}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Hệ học (1 hoặc nhiều hệ) */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {progTypes.map((prog: string) => {
                            const opt = PROGRAM_TYPE_OPTIONS.find(o => o.id === prog);
                            const isHeS = prog === 'HE_S';
                            const isSongNgu = prog === 'SONG_NGU';
                            const colorCls = isHeS
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                              : isSongNgu
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200/60'
                                : 'bg-purple-50 text-purple-800 border-purple-200/60';
                            return (
                              <span
                                key={prog}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border whitespace-nowrap ${colorCls}`}
                              >
                                {opt?.name || prog}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {meta.themeName || '—'}
                      </td>

                      {/* Môn phối hợp / Tích hợp (kèm Môn chủ trì) */}
                      <td className="py-3 px-3">
                        {meta.primarySubjectName && (
                          <div className="mb-1">
                            <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded text-[10px] inline-block">
                              Chủ trì: {meta.primarySubjectName}
                            </span>
                          </div>
                        )}
                        <div className="text-slate-600 text-[11px]">
                          {meta.coopSubjectNames || meta.integratedSubjects || '—'}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        <div className="font-semibold">{meta.timeFrame || '—'}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Học kỳ {meta.semester || 1}</div>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]" title={meta.expectedLocation || ''}>
                            {meta.expectedLocation || '—'}
                          </span>
                        </div>
                      </td>

                      {/* GV Phụ trách Kế hoạch (Tổ CTHS: 1 hoặc nhiều người) */}
                      <td className="py-3 px-3">
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
                              <div 
                                onClick={() => {
                                  setSelectedIds([act.id]);
                                  setIsAssignCTHSOpen(true);
                                }}
                                className="group cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-50/90 border border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-all shadow-2xs"
                                title={`Nhấn để quản lý GV Tổ CTHS phụ trách:\n${fullTooltip}`}
                              >
                                <div className="w-5 h-5 rounded-full bg-[#00A19A] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {firstTeacher?.teacherName?.split(' ').slice(-1)[0]?.charAt(0) || 'C'}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[11px] font-extrabold text-teal-950 group-hover:text-[#003B3A] truncate max-w-[120px] flex items-center gap-1">
                                    <span>{firstTeacher?.teacherName}</span>
                                    {extraCount > 0 && (
                                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-teal-200 text-[#003B3A] shrink-0">
                                        +{extraCount}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] font-mono text-teal-700 truncate max-w-[110px]">
                                    {firstTeacher?.teacherCode || 'Tổ CTHS'}
                                    {extraCount > 0 ? ` (${teacherList.length} GV)` : ''}
                                  </div>
                                </div>
                                <Edit3 className="w-3 h-3 text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-0.5" />
                              </div>
                            );
                          })()
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedIds([act.id]);
                              setIsAssignCTHSOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-[#00A19A] hover:bg-teal-50 border border-dashed border-slate-300 hover:border-teal-400 transition-all cursor-pointer"
                            title="Gán GV thuộc Tổ CTHS phụ trách"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span>+ Gán GV</span>
                          </button>
                        )}
                      </td>

                      {/* Sản phẩm / học tập dự án */}
                      <td className="py-3 px-3">
                        {meta.deliverables ? (
                          <div 
                            className="flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50/90 px-2 py-0.5 rounded-lg border border-emerald-200/70 inline-flex max-w-[150px] truncate"
                            title={meta.deliverables}
                          >
                            <Award className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{meta.deliverables}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">—</span>
                        )}
                      </td>

                      {/* Cấu hình & Hình thức đánh giá */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEvalConfigItem(act);
                            setIsConfigEvalOpen(true);
                          }}
                          className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            mode
                              ? 'bg-teal-50 border-teal-200 text-[#003B3A] hover:bg-teal-100 hover:border-teal-300 shadow-2xs'
                              : 'bg-slate-50 border-dashed border-slate-300 text-slate-500 hover:text-[#00A19A] hover:border-teal-300 hover:bg-teal-50'
                          }`}
                          title="Nhấn để thiết lập Tiêu chí Rubric & Công thức đánh giá"
                        >
                          <Award className={`w-3.5 h-3.5 ${mode ? 'text-[#00A19A]' : 'text-slate-400'}`} />
                          <span className="truncate max-w-[110px]">
                            {mode === 'CRITERIA'
                              ? `Rubric (${critCount} TC)`
                              : mode === 'PASS_FAIL'
                                ? 'Đạt / C.Đạt'
                                : mode === 'SCORE_10'
                                  ? 'Thang 10'
                                  : mode === 'ROLE_BASED'
                                    ? 'Theo Vai trò'
                                    : '+ Cấu hình'}
                          </span>
                          <Edit3 className="w-3 h-3 text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                      </td>

                      {/* Cơ sở tiếp nhận (TLHN) */}
                      <td className="py-3 px-3">
                        {allocatedCampuses.length === 0 ? (
                          <span className="text-[10px] text-slate-400 italic">Chưa đẩy cơ sở</span>
                        ) : (
                          <div className="space-y-1">
                            {allocatedCampuses.map((a: any) => {
                              const isDeployed = a.status === 'DA_TRIEN_KHAI';
                              const isAccepted = a.status === 'DA_TIEP_NHAN';
                              return (
                                <div key={a.campusId} className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${isDeployed ? 'bg-emerald-500' : isAccepted ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                  <span className="text-[11px] font-semibold text-slate-700">{a.campusCode || a.campusName}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {isDeployed ? '(Đã triển khai)' : isAccepted ? '(Đã nhận)' : '(Chờ)'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3 text-center sticky right-0 bg-white shadow-l">
                        <div className="flex items-center justify-center gap-1">
                          {/* Nút Đẩy cơ sở */}
                          <button
                            onClick={() => {
                              setAllocatingItem(act);
                              setIsAllocateOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#00A19A] hover:bg-[#00A19A]/10 transition-colors cursor-pointer"
                            title="Đẩy hoạt động xuống cơ sở (Tổ TLHN)"
                          >
                            <Send className="w-4 h-4" />
                          </button>

                          {/* Nút Chuyển HỦY / KHÔI PHỤC */}
                          {act.status === 'CANCELLED' ? (
                            <button
                              onClick={() => handleToggleSingleStatus(act)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Khôi phục / Kích hoạt lại hoạt động này"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleSingleStatus(act)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Chuyển hoạt động sang trạng thái HỦY (bảo toàn lịch sử đánh giá)"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {/* Nút Chỉnh sửa */}
                          <button
                            onClick={() => {
                              setEditingItem(act);
                              setIsAddEditOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Chỉnh sửa thông tin"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Nút Xóa */}
                          <button
                            onClick={() => handleDelete(act)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa hoạt động này"
                          >
                            <Trash2 className="w-4 h-4" />
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
