"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Calendar, Users, ChevronRight, Activity, Trash2, Edit3, Tag, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExperientialActivitiesList() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);

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

  const filtered = activities.filter(a => {
    const matchesSearch = (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.catalogName || '').toLowerCase().includes(search.toLowerCase());
    const matchesYear = (selectedYearId && !showAllYears) ? a.academicYearId === selectedYearId : true;
    return matchesSearch && matchesYear;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'SUBMITTED') return { label: 'Đã nhập kết quả', cls: 'bg-emerald-50 text-emerald-600 border border-emerald-200' };
    return { label: 'Nháp', cls: 'bg-amber-50 text-amber-600 border border-amber-200' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/20 py-8 px-4 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-[#00A99D] via-[#20C997] to-[#00BFB3]" />
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#00A99D]/20 to-teal-100 rounded-2xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-[#00A99D]" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800">Hoạt động trải nghiệm</h1>
                <p className="text-slate-500 font-medium text-sm">Quản lý và nhập kết quả đánh giá học sinh</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/teacher/experiential-activities/create')}
              className="px-5 py-2.5 bg-gradient-to-r from-[#00A99D] to-[#20C997] hover:shadow-lg hover:shadow-[#00A99D]/25 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 w-fit"
            >
              <Plus className="w-4 h-4" /> Tạo hoạt động mới
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã hoạt động..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none transition-all shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <button
            onClick={() => setShowAllYears(!showAllYears)}
            className={"px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm flex items-center justify-center gap-2 " + 
              (showAllYears ? "bg-[#00A99D] text-white border-[#00A99D]" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}
          >
            <Calendar className="w-4 h-4" />
            <span>{showAllYears ? 'Đang hiện tất cả năm học' : 'Lọc theo năm học chọn'}</span>
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#00A99D] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl py-16 text-center border border-slate-200/60 shadow-sm space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl mx-auto flex items-center justify-center">
              <Activity className="w-8 h-8 text-slate-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-700">{search ? 'Không tìm thấy kết quả' : 'Chưa có hoạt động nào trong năm học này'}</h3>
              <p className="text-slate-400 mt-1 text-sm font-medium">
                {search ? `Không có hoạt động nào khớp với "${search}"` : (activities.length > 0 ? `Có ${activities.length} hoạt động thuộc các năm học khác.` : 'Bắt đầu bằng cách tạo hoạt động mới.')}
              </p>
            </div>
            {activities.length > 0 && !showAllYears && (
              <button 
                onClick={() => setShowAllYears(true)}
                className="px-4 py-2 bg-[#00A99D]/10 text-[#00A99D] font-bold text-xs rounded-xl hover:bg-[#00A99D]/20 transition-all inline-flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4" />
                <span>Xem tất cả năm học (${activities.length} hoạt động)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((act) => {
              const badge = getStatusBadge(act.status);
              return (
                <div
                  key={act.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-[#00A99D]/30 transition-all cursor-pointer group flex flex-col overflow-hidden"
                  onClick={() => router.push(`/teacher/experiential-activities/${act.id}`)}
                >
                  {/* Card top color bar */}
                  <div className="h-1 w-full bg-gradient-to-r from-[#00A99D]/60 to-teal-300/60 group-hover:from-[#00A99D] group-hover:to-[#20C997] transition-all" />

                  <div className="p-5 flex flex-col flex-1">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        {act.code && (
                          <span className="inline-block text-xs font-black text-[#00A99D] bg-[#00A99D]/10 px-2 py-0.5 rounded-md mb-1.5 tracking-wide">
                            {act.code}
                          </span>
                        )}
                        <h3 className="text-sm font-black text-slate-800 leading-snug line-clamp-2">{act.name}</h3>
                        {act.catalogName && act.catalogName !== act.name && (
                          <div className="flex items-center gap-1 mt-1">
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span className="text-xs text-slate-400 font-medium truncate">{act.catalogName}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/teacher/experiential-activities/${act.id}`); }}
                          className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center hover:bg-[#00A99D]/10 text-slate-400 hover:text-[#00A99D] transition-colors"
                          title="Mở chi tiết"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, act.id)}
                          className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="Xóa hoạt động"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#00A99D] transition-colors ml-1" />
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="mt-auto pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#00A99D]/70 flex-shrink-0" />
                        <span>{act.date ? new Date(act.date).toLocaleDateString('vi-VN') : act.date}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <Users className="w-3.5 h-3.5 text-[#00A99D]/70 flex-shrink-0" />
                          <span><strong className="text-slate-700">{act.participants || 0}</strong> học sinh tham gia</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${badge.cls}`}>
                          {act.status === 'SUBMITTED'
                            ? <CheckCircle2 className="w-3 h-3" />
                            : <Clock className="w-3 h-3" />
                          }
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats footer */}
        {!loading && activities.length > 0 && (
          <div className="text-center text-xs text-slate-400 font-medium py-2">
            Hiển thị {filtered.length}/{activities.length} hoạt động
          </div>
        )}
      </div>
    </div>
  );
}
