"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, Calendar, Users, ChevronRight, Activity, 
  Trash2, Edit3, Tag, CheckCircle2, Clock, List, LayoutGrid,
  Sparkles, Filter, FileCheck, Layers, ArrowUpRight, CheckCircle,
  BarChart3, RefreshCw, X, Eye, FileSpreadsheet, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function ExperientialActivitiesList() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'DRAFT'>('ALL');
  const [showAllYears, setShowAllYears] = useState(true);
  // Default to 'list' for row-column table presentation
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa hoạt động trải nghiệm này?')) return;
    try {
      const res = await fetch(`/api/experiential-activities/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setActivities(prev => prev.filter(a => a.id !== id));
        toast.success('Đã xóa hoạt động thành công');
      } else {
        const errData = await res.json();
        toast.error('Lỗi khi xóa: ' + (errData.error || res.status));
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    }
  };

  useEffect(() => {
    const getYear = () => {
      const match = document.cookie.match(/(?:^|; )selectedAcademicYear=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : localStorage.getItem("selectedAcademicYear");
    };
    setSelectedYearId(getYear());

    const handleYearChange = () => {
      setSelectedYearId(getYear());
    };
    window.addEventListener("academicYearChanged", handleYearChange);
    return () => window.removeEventListener("academicYearChanged", handleYearChange);
  }, []);

  const loadActivities = () => {
    setLoading(true);
    fetch('/api/experiential-activities')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setActivities(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('experientialViewMode');
    if (saved === 'list' || saved === 'grid') {
      setViewMode(saved);
    } else {
      setViewMode('list');
    }
  }, []);

  const handleSetViewMode = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('experientialViewMode', mode);
  };

  const filtered = activities.filter(a => {
    const matchesSearch = (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.catalogName || '').toLowerCase().includes(search.toLowerCase());
    const matchesYear = (selectedYearId && !showAllYears) ? a.academicYearId === selectedYearId : true;
    const matchesStatus = statusFilter === 'ALL' ? true : (statusFilter === 'SUBMITTED' ? a.status === 'SUBMITTED' : a.status !== 'SUBMITTED');
    return matchesSearch && matchesYear && matchesStatus;
  });

  // Calculate metrics
  const totalCount = activities.length;
  const submittedCount = activities.filter(a => a.status === 'SUBMITTED').length;
  const draftCount = totalCount - submittedCount;
  const totalParticipants = activities.reduce((acc, curr) => acc + (curr.participants || 0), 0);

  const getStatusBadge = (status: string) => {
    if (status === 'SUBMITTED') {
      return { 
        label: 'Đã hoàn thành', 
        containerCls: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs',
        dot: 'bg-emerald-500 ring-2 ring-emerald-300'
      };
    }
    return { 
      label: 'Đang thực hiện (Nháp)', 
      containerCls: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs',
      dot: 'bg-indigo-500 ring-2 ring-indigo-300'
    };
  };

  // Export to Excel handler
  const handleExportExcel = () => {
    if (filtered.length === 0) {
      toast.error('Không có dữ liệu hoạt động để xuất file Excel');
      return;
    }
    try {
      const dataToExport = filtered.map((act, idx) => ({
        'STT': idx + 1,
        'Mã Hoạt Động': act.code || 'Tự động',
        'Tên Hoạt Động': act.name || '',
        'Nhóm / Danh Mục': act.catalogName || '',
        'Ngày Tổ Chức': act.date ? new Date(act.date).toLocaleDateString('vi-VN') : '',
        'Số HS Tham Gia': act.participants || 0,
        'Trạng Thái': act.status === 'SUBMITTED' ? 'Đã hoàn thành' : 'Đang thực hiện (Nháp)'
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 36 },
        { wch: 25 },
        { wch: 16 },
        { wch: 18 },
        { wch: 24 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Hoat_Dong_Trai_Nghiem');
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Danh_Sach_Hoat_Dong_Trai_Nghiem_${dateStr}.xlsx`);
      toast.success('Đã xuất file Excel thành công!');
    } catch (err) {
      console.error('Export excel error:', err);
      toast.error('Lỗi khi xuất file Excel');
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-indigo-50/20 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden">
      
      {/* Background Ambient Glow Orbs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-gradient-to-br from-indigo-300/30 via-purple-300/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/4 -right-24 w-96 h-96 bg-gradient-to-bl from-cyan-300/30 via-teal-300/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-12 left-1/3 w-96 h-96 bg-gradient-to-tr from-pink-200/20 via-sky-200/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-6">

        {/* TOP HERO BANNER (Glassmorphism & Vibrant Gradient) */}
        <div className="relative backdrop-blur-xl bg-white/85 rounded-3xl p-6 sm:p-8 border border-white/90 shadow-xl shadow-slate-200/50 overflow-hidden transition-all duration-300 hover:shadow-2xl">
          {/* Top Decorative Gradient Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#6366F1] via-[#06B6D4] via-[#10B981] to-[#EC4899]" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#6366F1] via-[#06B6D4] to-[#10B981] p-0.5 shadow-lg shadow-indigo-500/20 shrink-0 transform hover:rotate-3 transition-transform duration-300">
                <div className="w-full h-full bg-white/95 rounded-[14px] flex items-center justify-center backdrop-blur-md">
                  <Activity className="w-8 h-8 text-indigo-600 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 text-indigo-700 border border-indigo-200/60 shadow-xs">
                    Công tác Giáo viên
                  </span>
                  <span className="text-slate-300 text-xs">•</span>
                  <span className="text-xs font-bold text-slate-400">Skyline Survey 2026</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent tracking-tight">
                  Hoạt động trải nghiệm
                </h1>
                <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1 leading-relaxed">
                  Bảng tổng hợp theo hàng cột và quản lý kết quả đánh giá học sinh các hoạt động ngoại khóa, chuyến đi thực tế
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {/* Xuất File Excel Button */}
              <button
                onClick={handleExportExcel}
                className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-300 flex items-center gap-2 group transform active:scale-95"
                title="Xuất danh sách ra file Excel (.xlsx)"
              >
                <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                <span>Xuất File Excel</span>
              </button>

              {/* Tạo hoạt động mới Button */}
              <button
                onClick={() => router.push('/teacher/experiential-activities/create')}
                className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-cyan-600 to-teal-500 hover:from-indigo-700 hover:via-cyan-700 hover:to-teal-600 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all duration-300 flex items-center gap-2.5 group transform active:scale-95"
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                  <Plus className="w-3.5 h-3.5 text-white" />
                </div>
                <span>Tạo hoạt động mới</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Floating Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100/80">
            
            {/* Card 1: Total */}
            <div className="group relative backdrop-blur-md bg-white/70 hover:bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng số hoạt động</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{totalCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/60 border border-indigo-200/50 text-indigo-600 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: Completed */}
            <div className="group relative backdrop-blur-md bg-emerald-50/40 hover:bg-emerald-50/70 p-4 sm:p-5 rounded-2xl border border-emerald-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Đã hoàn thành</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{submittedCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-300/50 text-emerald-700 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
                <FileCheck className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Draft */}
            <div className="group relative backdrop-blur-md bg-indigo-50/40 hover:bg-indigo-50/70 p-4 sm:p-5 rounded-2xl border border-indigo-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Đang thực hiện (Nháp)</p>
                <p className="text-2xl font-black text-indigo-700 mt-1">{draftCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-300/50 text-indigo-700 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: Participants */}
            <div className="group relative backdrop-blur-md bg-cyan-50/40 hover:bg-cyan-50/70 p-4 sm:p-5 rounded-2xl border border-cyan-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-cyan-600 uppercase tracking-wider">Học sinh tham gia</p>
                <p className="text-2xl font-black text-cyan-800 mt-1">{totalParticipants}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-100 to-sky-100 border border-cyan-300/50 text-cyan-700 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
            </div>

          </div>
        </div>

        {/* FILTER & CONTROL TOOLBAR (Floating Glass Pill) */}
        <div className="backdrop-blur-xl bg-white/80 p-3 sm:p-4 rounded-2xl border border-white/90 shadow-md shadow-slate-200/40 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Status Filter Tabs (Floating Capsule) */}
          <div className="flex bg-slate-100/90 p-1.5 rounded-xl items-center overflow-x-auto shrink-0 shadow-inner">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 font-bold'
              }`}
            >
              Tất cả ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('SUBMITTED')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                statusFilter === 'SUBMITTED'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 font-bold'
              }`}
            >
              Đã hoàn thành ({submittedCount})
            </button>
            <button
              onClick={() => setStatusFilter('DRAFT')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                statusFilter === 'DRAFT'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 font-bold'
              }`}
            >
              Nháp / Đang xử lý ({draftCount})
            </button>
          </div>

          {/* Search Box & Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 justify-end">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên, mã hoạt động, danh mục..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50/90 border border-slate-200/90 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Export Button in toolbar */}
              <button
                onClick={handleExportExcel}
                className="p-2.5 bg-white border border-slate-200/90 rounded-xl text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                title="Xuất file Excel"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Xuất Excel</span>
              </button>

              <div className="flex bg-slate-100/90 p-1 rounded-xl items-center border border-slate-200/80 shadow-inner">
                <button 
                  onClick={() => handleSetViewMode('list')} 
                  className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Dạng bảng hàng cột"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Hàng cột</span>
                </button>
                <button 
                  onClick={() => handleSetViewMode('grid')} 
                  className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Dạng thẻ lưới"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Thẻ lưới</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT SECTION */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 backdrop-blur-xl bg-white/80 rounded-3xl border border-white/90 shadow-xl shadow-slate-200/40 space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <Activity className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto animate-pulse" />
            </div>
            <p className="text-xs font-black text-slate-600">Đang tải danh sách hoạt động trải nghiệm...</p>
          </div>
        ) : filtered.length === 0 ? (
          /* Redesigned Premium Glass Empty State */
          <div className="backdrop-blur-xl bg-white/85 rounded-3xl py-16 px-6 text-center border border-white/90 shadow-xl shadow-slate-200/40 relative overflow-hidden">
            <div className="max-w-md mx-auto space-y-5">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-500/15 via-cyan-500/15 to-emerald-500/20 mx-auto flex items-center justify-center border border-indigo-200/50 shadow-inner">
                <Sparkles className="w-12 h-12 text-indigo-600 animate-bounce" />
              </div>
              
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                  {search ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có hoạt động trải nghiệm nào'}
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm font-medium mt-2 leading-relaxed">
                  {search 
                    ? `Không tìm thấy hoạt động nào khớp với từ khóa "${search}". Quý thầy/cô vui lòng thử lại với từ khóa khác.` 
                    : (activities.length > 0 
                        ? `Hiện chưa có hoạt động nào trong năm học đã chọn. Đang có ${activities.length} hoạt động ở các năm học khác.` 
                        : 'Bắt đầu khởi tạo các hoạt động ngoại khóa, chuyến đi thực tế hoặc dự án học tập cho học sinh ngay hôm nay.')
                  }
                </p>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => router.push('/teacher/experiential-activities/create')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-cyan-600 to-teal-500 hover:from-indigo-700 hover:to-teal-600 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo hoạt động mới ngay</span>
                </button>

                {activities.length > 0 && !showAllYears && (
                  <button
                    onClick={() => setShowAllYears(true)}
                    className="w-full sm:w-auto px-5 py-3.5 bg-slate-100/90 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Xem tất cả các năm học ({activities.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* TABLE VIEW MODE (Dạng Hàng Cột) */
          viewMode === 'list' ? (
            <div className="backdrop-blur-xl bg-white/85 rounded-3xl border border-white/90 shadow-xl shadow-slate-200/40 overflow-hidden animate-in fade-in duration-300">
              <div className="px-6 py-4 border-b border-slate-100/80 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Danh sách Hoạt động ({filtered.length} bản ghi)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExportExcel}
                    className="text-xs font-black text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất Excel</span>
                  </button>
                  <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">
                    Nhấn vào hàng để xem chi tiết & nhập điểm
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs font-semibold">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-4 px-5 text-center w-12 select-none">#</th>
                      <th className="py-4 px-6 select-none min-w-[130px]">Mã Hoạt Động</th>
                      <th className="py-4 px-6 select-none min-w-[280px]">Tên Hoạt Động / Danh Mục</th>
                      <th className="py-4 px-6 select-none min-w-[140px]">Ngày Tổ Chức</th>
                      <th className="py-4 px-6 select-none text-center min-w-[120px]">Số HS Tham Gia</th>
                      <th className="py-4 px-6 select-none min-w-[160px]">Trạng Thái</th>
                      <th className="py-4 px-6 select-none text-right min-w-[140px]">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((act, index) => {
                      const badge = getStatusBadge(act.status);
                      return (
                        <tr
                          key={act.id}
                          onClick={() => router.push(`/teacher/experiential-activities/${act.id}`)}
                          className="group hover:bg-indigo-50/40 cursor-pointer transition-colors duration-150"
                        >
                          {/* STT */}
                          <td className="py-4 px-5 text-center font-black text-slate-400">
                            {index + 1}
                          </td>

                          {/* Mã */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            {act.code ? (
                              <span className="inline-block text-[11px] font-black text-indigo-700 bg-indigo-50/90 border border-indigo-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
                                {act.code}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium italic">Tự động</span>
                            )}
                          </td>

                          {/* Tên hoạt động & Danh mục */}
                          <td className="py-4 px-6">
                            <div className="space-y-1">
                              <h4 className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                {act.name}
                              </h4>
                              {act.catalogName && act.catalogName !== act.name && (
                                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-bold bg-slate-100/70 border border-slate-200/60 px-2 py-0.5 rounded-lg w-fit">
                                  <Tag className="w-3 h-3 text-cyan-600" />
                                  <span className="truncate max-w-[240px]">{act.catalogName}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Ngày tổ chức */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                              <Calendar className="w-4 h-4 text-cyan-600" />
                              <span>{act.date ? new Date(act.date).toLocaleDateString('vi-VN') : '-'}</span>
                            </div>
                          </td>

                          {/* Số HS tham gia */}
                          <td className="py-4 px-6 whitespace-nowrap text-center">
                            <span className="inline-flex items-center gap-1.5 text-slate-800 font-black bg-slate-100/90 border border-slate-200/70 px-3 py-1 rounded-xl shadow-2xs">
                              <Users className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{act.participants || 0} HS</span>
                            </span>
                          </td>

                          {/* Trạng thái */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-2 text-[11px] font-black px-3 py-1.5 rounded-full ${badge.containerCls}`}>
                              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                              <span>{badge.label}</span>
                            </span>
                          </td>

                          {/* Thao tác */}
                          <td className="py-4 px-6 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => router.push(`/teacher/experiential-activities/${act.id}`)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 border border-slate-200/70 text-slate-600 hover:text-indigo-600 font-bold text-xs transition-colors flex items-center gap-1"
                                title="Nhập điểm / Chi tiết"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Nhập điểm</span>
                              </button>
                              <button
                                onClick={(e) => handleDelete(e, act.id)}
                                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 border border-slate-200/70 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* GRID VIEW MODE (Thẻ Lưới) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {filtered.map((act) => {
                const badge = getStatusBadge(act.status);
                return (
                  <div
                    key={act.id}
                    onClick={() => router.push(`/teacher/experiential-activities/${act.id}`)}
                    className="group relative backdrop-blur-xl bg-white/85 rounded-3xl border border-white/90 shadow-md shadow-slate-200/40 hover:shadow-2xl hover:border-indigo-300/80 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col overflow-hidden"
                  >
                    {/* Top color accent bar */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-teal-400 group-hover:h-2 transition-all duration-300" />

                    <div className="p-6 flex flex-col flex-1 justify-between space-y-4">
                      {/* Top Code & Action bar */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          {act.code ? (
                            <span className="inline-block text-[11px] font-black text-indigo-700 bg-indigo-50/90 border border-indigo-200/80 px-3 py-1 rounded-xl tracking-wide shadow-2xs">
                              {act.code}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold">Mã tự động</span>
                          )}

                          <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/teacher/experiential-activities/${act.id}`); }}
                              className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 transition-colors shadow-2xs"
                              title="Chỉnh sửa / Nhập điểm"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, act.id)}
                              className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors shadow-2xs"
                              title="Xóa hoạt động"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-black text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {act.name}
                        </h3>

                        {/* Catalog category */}
                        {act.catalogName && act.catalogName !== act.name && (
                          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-600 font-bold bg-slate-50/90 border border-slate-200/60 px-3 py-1 rounded-xl w-fit shadow-2xs">
                            <Tag className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                            <span className="truncate max-w-[220px]">{act.catalogName}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer Details */}
                      <div className="pt-4 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-cyan-600" />
                            <span>{act.date ? new Date(act.date).toLocaleDateString('vi-VN') : '-'}</span>
                          </div>

                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-xl">
                            <Users className="w-4 h-4 text-indigo-600" />
                            <span className="font-black text-slate-800">{act.participants || 0}</span> HS
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className={`text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-2 shadow-2xs ${badge.containerCls}`}>
                            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                            <span>{badge.label}</span>
                          </span>

                          <span className="text-xs font-black text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                            Chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Footer Statistics */}
        {!loading && activities.length > 0 && (
          <div className="text-center text-xs font-bold text-slate-400 py-2">
            Đang hiển thị {filtered.length} trên tổng số {activities.length} hoạt động trải nghiệm
          </div>
        )}

      </div>
    </div>
  );
}
