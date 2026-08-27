"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Legend 
} from 'recharts';
import { 
  BarChart3, Users, FileCheck, Layers, Calendar, 
  Building2, GraduationCap, Download, CheckCircle2, 
  Clock, AlertCircle, Sparkles, Filter, ChevronRight, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { ACTIVITY_STRANDS } from '@/lib/experiential/constants';
import { ExperientialTabs } from '@/components/ExperientialTabs';

const COLORS = ['#9333EA', '#059669', '#0284C7', '#D97706'];

export function ExperientialReportsClient(props?: { academicYears?: any[]; activeYearId?: string; activeYearName?: string }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Filters
  const [academicYears, setAcademicYears] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState(props?.activeYearId || '');
  const [selectedCampusId, setSelectedCampusId] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [selectedStrand, setSelectedStrand] = useState('ALL');

  useEffect(() => {
    Promise.all([
      fetch('/api/academic-years').then(r => r.json()).catch(() => []),
      fetch('/api/campuses').then(r => r.json()).catch(() => [])
    ]).then(([years, camps]) => {
      if (Array.isArray(years) && years.length > 0) {
        setAcademicYears(years);
        const active = years.find(y => y.status === 'ACTIVE' && !y.isOff) || years[0];
        setSelectedYearId(active?.id || '');
      }
      if (Array.isArray(camps)) setCampuses(camps);
    });
  }, []);

  const loadStats = useCallback(() => {
    if (!selectedYearId) return;
    setLoading(true);
    let url = `/api/admin/experiential-activities/stats?academicYearId=${selectedYearId}`;
    if (selectedCampusId !== 'ALL') url += `&campusId=${selectedCampusId}`;
    if (selectedLevel !== 'ALL') url += `&level=${encodeURIComponent(selectedLevel)}`;
    if (selectedGrade !== 'ALL') url += `&grade=${encodeURIComponent(selectedGrade)}`;
    if (selectedStrand !== 'ALL') url += `&strand=${selectedStrand}`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedYearId, selectedCampusId, selectedLevel, selectedGrade, selectedStrand]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleExportExcel = () => {
    if (!stats || !stats.classProgress || stats.classProgress.length === 0) {
      toast.error('Khng c d? li?u ? xu?t Excel');
      return;
    }
    try {
      const dataToExport = stats.classProgress.map((cp, idx) => ({
        'STT': idx + 1,
        'Cơ sở': cp.campusName || cp.campusCode || '',
        'Khối': cp.grade || '',
        'Lớp': cp.className || '',
        'GVCN': cp.homeroomTeacherName || '',
        'Hoạt động': cp.activityName || '',
        'Mạch': cp.strand || '',
        'Sĩ số HS': cp.totalStudents || 0,
        'Đã đánh giá': cp.evaluatedStudents || 0,
        'Tỷ lệ hoàn thành': `${cp.progressPercent || 0}%`,
        'Trạng thái': cp.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang thực hiện'
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tien_Do_Danh_Gia_HDTN');
      XLSX.writeFile(wb, `Bao_Cao_Tien_Do_HDTN_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Đã xuất báo cáo Excel thành công!');
    } catch {
      toast.error('Lỗi khi xuất file Excel');
    }
  };

  const kpis = stats?.kpis || { totalActivities: 0, totalClassesAssigned: 0, totalStudentsEvaluated: 0, overallCompletionRate: 0 };
  const ratingData = [
    { name: 'Nổi bật', value: stats?.ratingDistribution?.OUTSTANDING || 0, color: '#9333EA' },
    { name: 'Tốt', value: stats?.ratingDistribution?.GOOD || 0, color: '#059669' },
    { name: 'Đạt', value: stats?.ratingDistribution?.PASS || 0, color: '#0284C7' },
    { name: 'Cần hỗ trợ', value: stats?.ratingDistribution?.NEEDS_SUPPORT || 0, color: '#D97706' }
  ];

  const strandData = (stats?.strandDistribution || []).map(s => ({
    name: ACTIVITY_STRANDS.find(item => item.id === s.strand)?.name || s.strand,
    count: s.count,
    avg: s.avgScore
  }));

  const criteriaData = (stats?.criteriaAverages || []).map(c => ({
    criterion: c.name,
    avg: c.avgLevel,
    fullMark: 4
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/15 to-sky-50/20 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <ExperientialTabs activeTab="reports" />

        {/* HERO BANNER */}
        <div className="relative backdrop-blur-xl bg-white/90 rounded-3xl p-6 sm:p-8 border border-white shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#003B3A] via-[#00A99D] via-[#48BFE3] to-[#6366F1]" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#003B3A] via-[#00A99D] to-[#48BFE3] p-0.5 shadow-lg shadow-[#00A99D]/20 shrink-0">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-[#00A99D]" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#00A99D]/10 text-[#003B3A] border border-[#00A99D]/20">
                    Bo Co & Th?ng K
                  </span>
                  <span className="text-slate-300 text-xs"></span>
                  <span className="text-xs font-bold text-slate-500">Quản trị Ch?t l?ng Sky-Line</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#003B3A] via-[#005F5E] to-[#00A99D] bg-clip-text text-transparent tracking-tight">
                  Dashboard nh Gi Hoạt động Tr?i Nghi?m
                </h1>
                <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
                  Bo co a chi?u theo Năm học, Cơ sở, Khối, 4 Mạch hoạt động v gim st ti?n ? GVCN
                </p>
              </div>
            </div>

            <button
              onClick={handleExportExcel}
              className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black rounded-2xl border border-slate-200 shadow-2xs transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Xu?t Bo Co Excel</span>
            </button>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">T?ng Hoạt động</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{kpis.totalActivities}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Lớp Tham gia</p>
                <p className="text-2xl font-black text-sky-700 mt-1">{kpis.totalClassesAssigned}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#00A99D] uppercase tracking-wider">L?t HS đánh giá</p>
                <p className="text-2xl font-black text-[#003B3A] mt-1">{kpis.totalStudentsEvaluated}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#00A99D]/10 text-[#00A99D] flex items-center justify-center border border-[#00A99D]/30">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">T? l? Hon thnh</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{kpis.overallCompletionRate}%</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* MULTI-FILTER BAR */}
        <div className="bg-white/90 p-4 rounded-3xl border border-white shadow-md shadow-slate-200/40 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Năm học</label>
            <select
              value={selectedYearId}
              onChange={e => setSelectedYearId(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Cơ sở</label>
            <select
              value={selectedCampusId}
              onChange={e => setSelectedCampusId(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Tất cả cơ sở</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.campusName || c.campusCode}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Cấp học</label>
            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Tất cả cấp học</option>
              <option value="Tieu hoc">Tiểu học</option>
              <option value="THCS">THCS</option>
              <option value="THPT">THPT</option>
              <option value="Mam non">Mầm non</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Khối</label>
            <select
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Tất cả khối</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                <option key={g} value={String(g)}>Khối {g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Mạch hoạt động</label>
            <select
              value={selectedStrand}
              onChange={e => setSelectedStrand(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Tất cả 4 mạch</option>
              {ACTIVITY_STRANDS.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* CHARTS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CHART 1: RATING DISTRIBUTION */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md shadow-slate-200/40 space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              Phn b? X?p lo?i K?t qu? Học sinh (Thang 4 m?c)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ratingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {ratingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHART 2: 4-STRAND DISTRIBUTION */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md shadow-slate-200/40 space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00A99D]" />
              S? l?ng Hoạt động theo 4 Mạch Trải nghiệm
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={strandData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="S? hoạt động" fill="#00A99D" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHART 3: RADAR CHART OF COMPETENCIES */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md shadow-slate-200/40 space-y-4 lg:col-span-2">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              i?m đánh giá Trung b?nh theo 12 Tiu ch Nng l?c Sky-Line (Thang 4 m?c)
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={criteriaData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 4]} />
                  <Radar name="i?m TB" dataKey="avg" stroke="#6366F1" fill="#6366F1" fillOpacity={0.4} />
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* HOMEROOM CLASS PROGRESS MONITORING TABLE */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md shadow-slate-200/40 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800">Gim St Ti?n ? nh Gi C?a Gio Vin Ch? Nhi?m</h3>
              <p className="text-xs text-slate-500 font-medium">Theo d?i th?i gian th?c ti?n ? n?p sĐã đánh giá c?a t?ng l?p</p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              T?ng c?ng: {(stats?.classProgress || []).length} l?t phân công
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-12">#</th>
                  <th className="py-3.5 px-4 min-w-[120px]">Cơ sở / Khối</th>
                  <th className="py-3.5 px-4 min-w-[100px]">Lớp</th>
                  <th className="py-3.5 px-4 min-w-[160px]">GVCN Ph? trch</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Tn Hoạt động & Mạch</th>
                  <th className="py-3.5 px-4 text-center min-w-[120px]">Đã đánh giá</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Ti?n ? %</th>
                  <th className="py-3.5 px-4 min-w-[120px]">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {(stats?.classProgress || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                      Cha c l?p no ?c phân công hoạt động
                    </td>
                  </tr>
                ) : (
                  (stats?.classProgress || []).map((cp, idx) => {
                    const isCompleted = cp.status === 'COMPLETED' || cp.progressPercent === 100;

                    return (
                      <tr key={idx} className="hover:bg-teal-50/20 transition-colors">
                        <td className="py-3.5 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-800">{cp.campusName || cp.campusCode}</span>
                          <span className="text-[11px] text-slate-400 block">Khối {cp.grade}</span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            {cp.className}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-800">{cp.homeroomTeacherName || 'Cha gn'}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-800 line-clamp-1">{cp.activityName}</div>
                          <span className="text-[10px] text-slate-400 font-bold">{cp.strand}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="font-black text-slate-800">{cp.evaluatedStudents}</span> / {cp.totalStudents} HS
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-black">
                              <span>{cp.progressPercent}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-[#00A99D]'}`}
                                style={{ width: `${cp.progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                            <span>{isCompleted ? 'Hoàn thành' : 'Đang thực hiện'}</span>
                          </span>
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
    </div>
  );
}

export default ExperientialReportsClient;
