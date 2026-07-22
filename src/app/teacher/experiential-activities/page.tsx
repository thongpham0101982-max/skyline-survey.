"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, Calendar, Users, ChevronRight, Activity, Trash2, Edit3, 
  Tag, CheckCircle2, Clock, Info, CheckSquare, Award, AlertCircle, RefreshCw
} from 'lucide-react';
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

  const fetchActivities = () => {
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
    fetchActivities();
  }, []);

  const filtered = activities.filter(a => {
    const matchesSearch = (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.catalogName || '').toLowerCase().includes(search.toLowerCase());
    const matchesYear = selectedYearId ? a.academicYearId === selectedYearId : true;
    return matchesSearch && matchesYear;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'SUBMITTED' || status === 'APPROVED') {
      return { 
        label: 'Đã xác nhận kết quả', 
        cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold', 
        dot: 'bg-emerald-500' 
      };
    }
    return { 
      label: 'Bản nháp', 
      cls: 'bg-amber-50 text-amber-700 border border-amber-200/60 font-bold', 
      dot: 'bg-amber-500' 
    };
  };

  // Stats calculation
  const totalCount = filtered.length;
  const draftCount = filtered.filter(a => a.status === 'DRAFT').length;
  const confirmedCount = filtered.filter(a => a.status === 'SUBMITTED' || a.status === 'APPROVED').length;
  const totalStudentsCount = filtered.reduce((acc, a) => acc + (a.participants || 0), 0);

  return (
    <div className="w-full font-sans antialiased text-slate-600 pb-12">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Dashboard Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/50 overflow-hidden relative">
          <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-indigo-500" />
          <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-500/10 to-teal-500/20 rounded-2xl flex items-center justify-center border border-teal-500/20 shadow-2xs">
                <Activity className="w-7 h-7 text-teal-600" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dự án & Hoạt động Trải nghiệm</h1>
                <p className="text-slate-400 font-medium text-xs md:text-sm">Đăng ký kế hoạch, phân công nhiệm vụ và cập nhật kết quả đánh giá năng lực học sinh.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={fetchActivities}
                className="p-3 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200/50 shadow-3xs"
                title="Làm mới"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push('/teacher/experiential-activities/create')}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 hover:shadow-md hover:shadow-teal-500/10 text-white text-xs font-black rounded-xl transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Tạo hoạt động mới
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-800">{totalCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng số hoạt động</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-800">{draftCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hoạt động nháp</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-800">{confirmedCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đã xác nhận</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-800">{totalStudentsCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng lượt HS tham gia</div>
            </div>
          </div>
        </div>

        {/* Regulation Notice Box */}
        <div className="bg-amber-50/50 border border-amber-200/60 rounded-3xl p-5 md:p-6 shadow-3xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/10 rounded-full -translate-y-1/3 translate-x-1/3 blur-xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <h3 className="text-xs font-black text-amber-850 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 text-amber-600" />
              Quy định thực hiện trên Hệ thống
            </h3>
            <ul className="text-xs text-amber-900/80 font-semibold space-y-2 list-disc pl-5 leading-relaxed">
              <li>GVCN/GVBM được tạo hoạt động trải nghiệm hoặc dự án học tập cho một hay nhiều lớp.</li>
              <li>Giáo viên khai báo mục tiêu, thời gian, lớp tham gia, nhiệm vụ, tiêu chí đánh giá và giáo viên phối hợp.</li>
              <li>Trong và sau hoạt động, giáo viên phụ trách cập nhật mức độ hoàn thành, quá trình, vai trò, nhận xét và minh chứng của từng học sinh.</li>
              <li>Với hoạt động có nhiều giáo viên, giáo viên phụ trách chính chịu trách nhiệm hoàn tất và xác nhận kết quả.</li>
              <li>Kết quả sau khi xác nhận được cập nhật vào Hồ sơ học sinh và tổng hợp gửi PHHS định kỳ theo học kỳ, năm học.</li>
            </ul>
          </div>
        </div>

        {/* Search Bar & Filter Summary */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc mã hoạt động..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all shadow-3xs text-slate-700"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200/50 rounded-3xl shadow-3xs">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-xs font-bold text-slate-400">Đang tải danh sách hoạt động...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl py-20 text-center border border-slate-200/60 shadow-3xs">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-slate-100">
              <Activity className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-black text-slate-700">{search ? 'Không tìm thấy kết quả' : 'Chưa có hoạt động nào'}</h3>
            <p className="text-slate-400 mt-1 text-xs font-semibold">
              {search ? `Không có hoạt động nào khớp với "${search}"` : 'Bắt đầu bằng cách tạo hoạt động mới.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((act) => {
              const badge = getStatusBadge(act.status);
              const isConfirmed = act.status === 'SUBMITTED' || act.status === 'APPROVED';

              return (
                <div
                  key={act.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-3xs hover:shadow-xs hover:border-teal-500/30 transition-all cursor-pointer group flex flex-col overflow-hidden relative"
                  onClick={() => router.push(`/teacher/experiential-activities/${act.id}`)}
                >
                  {/* Decorative Left bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isConfirmed ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                  <div className="p-6 flex flex-col flex-1 pl-7">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        {act.code && (
                          <span className="inline-block text-[10px] font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md mb-2 tracking-wide border border-teal-100/50">
                            {act.code}
                          </span>
                        )}
                        <h3 className="text-sm font-black text-slate-800 leading-snug line-clamp-2 group-hover:text-teal-600 transition-colors">
                          {act.name}
                        </h3>
                        {act.catalogName && act.catalogName !== act.name && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs text-slate-400 font-bold truncate">{act.catalogName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Meta stats */}
                    <div className="mt-auto pt-4 border-t border-slate-100/80 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-teal-600/70 flex-shrink-0" />
                        <span>Thời gian: {act.date ? new Date(act.date).toLocaleDateString('vi-VN') : 'Chưa định ngày'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                          <Users className="w-3.5 h-3.5 text-teal-600/70 flex-shrink-0" />
                          <span><strong className="text-slate-800">{act.participants || 0}</strong> học sinh</span>
                        </div>

                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${badge.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} ${isConfirmed ? 'animate-pulse' : ''}`} />
                          {badge.label}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            router.push(`/teacher/experiential-activities/${act.id}`); 
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-teal-50 text-xs font-bold text-slate-500 hover:text-teal-700 border border-slate-200/50 hover:border-teal-200/50 flex items-center gap-1.5 transition-all"
                          title="Đánh giá"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Đánh giá</span>
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, act.id)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/50 hover:border-rose-200/50 transition-all"
                          title="Xóa hoạt động"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
          <div className="text-center text-xs text-slate-400 font-bold py-4">
            Hiển thị {filtered.length}/{activities.length} hoạt động
          </div>
        )}
      </div>
    </div>
  );
}
