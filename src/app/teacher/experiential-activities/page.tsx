"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, Calendar, Users, ChevronRight, Activity, 
  Trash2, Edit3, Tag, CheckCircle2, Clock, List, LayoutGrid,
  Sparkles, Filter, FileCheck, Layers, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExperientialActivitiesList() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'DRAFT'>('ALL');

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa hoạt động này?')) return;
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
      toast.error('Lỗi kết nối');
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

  useEffect(() => {
    fetch('/api/experiential-activities')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setActivities(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const [showAllYears, setShowAllYears] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  useEffect(() => {
    const saved = localStorage.getItem('experientialViewMode');
    if (saved === 'list' || saved === 'grid') {
      setViewMode(saved);
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
        cls: 'bg-[#72EFDD]/20 text-[#6930C3] border border-[#72EFDD]/40 font-bold',
        dot: 'bg-[#48BFE3]'
      };
    }
    return { 
      label: 'Đang thực hiện (Nháp)', 
      cls: 'bg-[#80FFDB]/20 text-[#5E60CE] border border-[#80FFDB]/40 font-bold',
      dot: 'bg-[#5E60CE]'
    };
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Gradient Accent Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#7400B8] via-[#6930C3] via-[#5E60CE] via-[#48BFE3] to-[#80FFDB]" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6930C3] via-[#48BFE3] to-[#80FFDB] p-0.5 shadow-md shadow-[#48BFE3]/20 shrink-0">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                  <Activity className="w-7 h-7 text-[#6930C3]" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#48BFE3]/10 text-[#6930C3] border border-[#48BFE3]/20">
                    Công tác Giáo viên
                  </span>
                  <span className="text-slate-300 text-xs">•</span>
                  <span className="text-xs font-semibold text-slate-400">Skyline Survey 2026</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Hoạt động trải nghiệm</h1>
                <p className="text-slate-500 font-medium text-xs sm:text-sm mt-0.5">Quản lý các hoạt động ngoại khóa, dự án thực tế và kết quả đánh giá học sinh</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => router.push('/teacher/experiential-activities/create')}
                className="px-6 py-3 bg-gradient-to-r from-[#6930C3] to-[#48BFE3] hover:from-[#7400B8] hover:to-[#4EA8DE] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-[#6930C3]/20 hover:shadow-[#48BFE3]/30 transition-all flex items-center gap-2 group transform active:scale-95"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                <span>Tạo hoạt động mới</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng số hoạt động</p>
                <p className="text-xl font-black text-slate-800 mt-0.5">{totalCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#6930C3]/10 text-[#6930C3] flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#72EFDD]/10 p-4 rounded-2xl border border-[#72EFDD]/30 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#6930C3] uppercase tracking-wider">Đã hoàn thành</p>
                <p className="text-xl font-black text-[#6930C3] mt-0.5">{submittedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#48BFE3]/20 text-[#6930C3] flex items-center justify-center font-bold">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#80FFDB]/10 p-4 rounded-2xl border border-[#80FFDB]/30 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#5E60CE] uppercase tracking-wider">Đang thực hiện (Nháp)</p>
                <p className="text-xl font-black text-[#5E60CE] mt-0.5">{draftCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#5E60CE]/10 text-[#5E60CE] flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Học sinh tham gia</p>
                <p className="text-xl font-black text-slate-800 mt-0.5">{totalParticipants}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#48BFE3]/10 text-[#48BFE3] flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Control Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Status Filter Tabs */}
          <div className="flex bg-slate-100/80 p-1 rounded-xl items-center overflow-x-auto shrink-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-white text-[#6930C3] shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Tất cả ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('SUBMITTED')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'SUBMITTED'
                  ? 'bg-white text-[#6930C3] shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Đã hoàn thành ({submittedCount})
            </button>
            <button
              onClick={() => setStatusFilter('DRAFT')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'DRAFT'
                  ? 'bg-white text-[#6930C3] shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-700'
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
                placeholder="Tìm theo tên, mã hoạt động..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-[#48BFE3]/20 focus:border-[#48BFE3] outline-none transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
              <button
                onClick={() => setShowAllYears(!showAllYears)}
                className={"px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 " + 
                  (showAllYears 
                    ? "bg-[#6930C3] text-white border-[#6930C3] shadow-sm" 
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100")}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{showAllYears ? 'Hiện tất cả năm học' : 'Theo năm chọn'}</span>
              </button>

              <div className="flex bg-slate-100 p-1 rounded-xl items-center border border-slate-200">
                <button 
                  onClick={() => handleSetViewMode('grid')} 
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-[#6930C3] shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Dạng thẻ lưới"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleSetViewMode('list')} 
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-[#6930C3] shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Dạng hàng danh sách"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 border-4 border-[#48BFE3] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500">Đang tải danh sách hoạt động trải nghiệm...</p>
          </div>
        ) : filtered.length === 0 ? (
          /* Redesigned Premium Empty State */
          <div className="bg-white rounded-3xl py-16 px-6 text-center border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#6930C3]/10 via-[#48BFE3]/10 to-[#80FFDB]/20 mx-auto flex items-center justify-center border border-[#48BFE3]/20 shadow-inner">
                <Sparkles className="w-10 h-10 text-[#6930C3]" />
              </div>
              
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  {search ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có hoạt động trải nghiệm nào'}
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1 leading-relaxed">
                  {search 
                    ? `Không tìm thấy hoạt động nào khớp với từ khóa "${search}". Vui lòng thử tìm từ khóa khác.` 
                    : (activities.length > 0 
                        ? `Hiện chưa có hoạt động nào trong năm học đã chọn. Đang có ${activities.length} hoạt động ở các năm học khác.` 
                        : 'Bắt đầu khởi tạo các hoạt động ngoại khóa, chuyến đi thực tế hoặc dự án học tập cho học sinh ngay hôm nay.')
                  }
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => router.push('/teacher/experiential-activities/create')}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#6930C3] to-[#48BFE3] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-[#6930C3]/20 hover:shadow-[#48BFE3]/30 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo hoạt động mới ngay</span>
                </button>

                {activities.length > 0 && !showAllYears && (
                  <button
                    onClick={() => setShowAllYears(true)}
                    className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-[#6930C3]" />
                    <span>Xem tất cả các năm học ({activities.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Grid View Mode */
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {filtered.map((act) => {
                const badge = getStatusBadge(act.status);
                return (
                  <div
                    key={act.id}
                    onClick={() => router.push(`/teacher/experiential-activities/${act.id}`)}
                    className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-[#48BFE3]/40 transition-all duration-300 cursor-pointer group flex flex-col overflow-hidden relative"
                  >
                    {/* Top color bar */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-[#6930C3] via-[#48BFE3] to-[#80FFDB] group-hover:h-2 transition-all" />

                    <div className="p-6 flex flex-col flex-1 justify-between space-y-4">
                      {/* Top Code & Action bar */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          {act.code ? (
                            <span className="inline-block text-[11px] font-black text-[#6930C3] bg-[#6930C3]/10 border border-[#6930C3]/20 px-3 py-1 rounded-xl tracking-wide">
                              {act.code}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold">Mã tự động</span>
                          )}

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/teacher/experiential-activities/${act.id}`); }}
                              className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-[#48BFE3]/10 text-slate-400 hover:text-[#48BFE3] transition-colors"
                              title="Chỉnh sửa / Nhập điểm"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, act.id)}
                              className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                              title="Xóa hoạt động"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-black text-slate-800 leading-snug group-hover:text-[#6930C3] transition-colors line-clamp-2">
                          {act.name}
                        </h3>

                        {/* Catalog category */}
                        {act.catalogName && act.catalogName !== act.name && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-semibold bg-slate-50 px-2.5 py-1 rounded-lg w-fit">
                            <Tag className="w-3.5 h-3.5 text-[#48BFE3] shrink-0" />
                            <span className="truncate max-w-[220px]">{act.catalogName}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer Details */}
                      <div className="pt-4 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-[#48BFE3]" />
                            <span>{act.date ? new Date(act.date).toLocaleDateString('vi-VN') : '-'}</span>
                          </div>

                          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                            <Users className="w-4 h-4 text-[#5E60CE]" />
                            <span className="font-bold text-slate-700">{act.participants || 0}</span> HS
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className={`text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5 ${badge.cls}`}>
                            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                            <span>{badge.label}</span>
                          </span>

                          <span className="text-xs font-bold text-[#6930C3] group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                            Chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View Mode (Row Table) */
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs font-semibold">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-4 px-6 select-none">Mã</th>
                      <th className="py-4 px-6 select-none">Tên hoạt động</th>
                      <th className="py-4 px-6 select-none">Ngày tổ chức</th>
                      <th className="py-4 px-6 select-none text-center">Tham gia</th>
                      <th className="py-4 px-6 select-none">Trạng thái</th>
                      <th className="py-4 px-6 select-none text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((act) => {
                      const badge = getStatusBadge(act.status);
                      return (
                        <tr
                          key={act.id}
                          onClick={() => router.push(`/teacher/experiential-activities/${act.id}`)}
                          className="group hover:bg-[#72EFDD]/10 cursor-pointer transition-colors"
                        >
                          <td className="py-4 px-6 whitespace-nowrap">
                            {act.code ? (
                              <span className="inline-block text-[11px] font-black text-[#6930C3] bg-[#6930C3]/10 px-2.5 py-1 rounded-lg">
                                {act.code}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">-</span>
                            )}
                          </td>

                          <td className="py-4 px-6">
                            <div className="max-w-[350px]">
                              <h4 className="text-sm font-black text-slate-800 group-hover:text-[#6930C3] transition-colors line-clamp-1">
                                {act.name}
                              </h4>
                              {act.catalogName && act.catalogName !== act.name && (
                                <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                                  {act.catalogName}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Calendar className="w-4 h-4 text-[#48BFE3]" />
                              <span>{act.date ? new Date(act.date).toLocaleDateString('vi-VN') : '-'}</span>
                            </div>
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap text-center">
                            <span className="inline-flex items-center gap-1 text-slate-700 font-black bg-slate-50 px-2.5 py-1 rounded-lg">
                              <Users className="w-3.5 h-3.5 text-[#5E60CE]" />
                              <span>{act.participants || 0}</span>
                            </span>
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full ${badge.cls}`}>
                              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                              <span>{badge.label}</span>
                            </span>
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => router.push(`/teacher/experiential-activities/${act.id}`)}
                                className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-[#48BFE3]/10 text-slate-500 hover:text-[#6930C3] transition-colors"
                                title="Chi tiết / Nhập điểm"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleDelete(e, act.id)}
                                className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-rose-50 text-slate-500 hover:text-rose-500 transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#6930C3] transition-colors" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* Footer Statistics */}
        {!loading && activities.length > 0 && (
          <div className="text-center text-xs font-semibold text-slate-400 py-3">
            Đang hiển thị {filtered.length} trên tổng số {activities.length} hoạt động trải nghiệm
          </div>
        )}

      </div>
    </div>
  );
}
