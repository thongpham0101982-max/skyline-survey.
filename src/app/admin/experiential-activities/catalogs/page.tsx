"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Download, UploadCloud, Layers, Sparkles, 
  Building2, BookOpen, Calendar, Clock, MapPin, Edit3, Trash2, 
  Send, CheckCircle2, AlertCircle, RefreshCw, Filter, Award, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ExperientialTabs } from '@/components/ExperientialTabs';
import { SHEET_CONFIGS, SheetCode, ActivityCatalogItem } from '@/lib/experiential/catalog-types';
import { CatalogAddEditModal } from './components/CatalogAddEditModal';
import { CatalogImportModal } from './components/CatalogImportModal';
import { CatalogAllocateModal } from './components/CatalogAllocateModal';

export default function ActivityCatalogsPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [activeSheetCode, setActiveSheetCode] = useState<SheetCode>('TH_S');
  const [catalogs, setCatalogs] = useState<ActivityCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<'ALL' | '1' | '2'>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [allocatingItem, setAllocatingItem] = useState<any>(null);

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
  }, [activeSheetCode, selectedYearId, search, semesterFilter, gradeFilter]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

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
            onClick={() => {
              setEditingItem(null);
              setIsAddEditOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 shadow-md shadow-[#00A19A]/25 transition-all"
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

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-3 w-16">Khối</th>
                <th className="py-3 px-4 min-w-[200px]">Tên hoạt động ngoại khóa</th>
                <th className="py-3 px-4 min-w-[180px]">Chủ đề giáo dục</th>
                <th className="py-3 px-3 min-w-[140px]">Môn chủ trì</th>
                <th className="py-3 px-3 min-w-[150px]">Môn phối hợp / Tích hợp</th>
                <th className="py-3 px-3 min-w-[130px]">Thời gian & HK</th>
                <th className="py-3 px-3 min-w-[150px]">Địa điểm dự kiến</th>
                <th className="py-3 px-3 min-w-[150px]">Cơ sở tiếp nhận (TLHN)</th>
                <th className="py-3 px-3 text-center min-w-[140px] sticky right-0 bg-slate-50">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00A19A]" />
                    Đang tải danh mục hoạt động...
                  </td>
                </tr>
              ) : catalogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    Chưa có hoạt động nào trong danh mục phân hệ <span className="font-bold text-slate-600">{currentSheetCfg.title}</span>.
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setIsImportOpen(true)}
                        className="text-xs font-bold text-[#00A19A] hover:underline"
                      >
                        Import từ Excel
                      </button>
                      <span>hoặc</span>
                      <button
                        onClick={() => { setEditingItem(null); setIsAddEditOpen(true); }}
                        className="text-xs font-bold text-[#00A19A] hover:underline"
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

                  return (
                    <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {Array.isArray(meta.grades) ? meta.grades.join(', ') : meta.grades || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-[#003B3A] text-[13px]">{act.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{act.code}</div>
                        {meta.deliverables && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 inline-flex">
                            <Award className="w-3 h-3 shrink-0" />
                            <span>SP: {meta.deliverables}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {meta.themeName || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded text-[11px] inline-block">
                          {meta.primarySubjectName || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {meta.coopSubjectNames || meta.integratedSubjects || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <div className="font-semibold">{meta.timeFrame || '—'}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Học kỳ {meta.semester || 1}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{meta.expectedLocation || '—'}</span>
                        </div>
                      </td>
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
                      <td className="py-3 px-3 text-center sticky right-0 bg-white shadow-l">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setAllocatingItem(act);
                              setIsAllocateOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#00A19A] hover:bg-[#00A19A]/10 transition-colors"
                            title="Đẩy hoạt động xuống cơ sở (Tổ TLHN)"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingItem(act);
                              setIsAddEditOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(act)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Xóa"
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
    </div>
  );
}
