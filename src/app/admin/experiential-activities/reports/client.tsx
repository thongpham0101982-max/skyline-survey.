"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';
import { 
  BarChart3, Users, FileCheck, Layers, Calendar, 
  Building2, GraduationCap, Download, CheckCircle2, 
  Clock, AlertCircle, Sparkles, Filter, ChevronRight, Activity,
  Search, Eye, BookOpen, UserCheck, CheckCircle, AlertTriangle,
  RotateCcw, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { ExperientialTabs } from '@/components/ExperientialTabs';

const EVAL_COLORS = {
  COMPLETED: '#059669', // Emerald
  IN_PROGRESS: '#0284C7', // Sky blue
  NOT_STARTED: '#F59E0B' // Amber
};

export function ExperientialReportsClient(props?: { academicYears?: any[]; activeYearId?: string; activeYearName?: string }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState(props?.activeYearId || '');
  const [selectedCampusId, setSelectedCampusId] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedEvalStatus, setSelectedEvalStatus] = useState('ALL');
  const [selectedClassId, setSelectedClassId] = useState('ALL');

  // Search & Tab View State
  const [activeTab, setActiveTab] = useState<'CLASS_SUMMARY' | 'ACTIVITY_DETAIL' | 'CAMPUS_TLHN'>('CLASS_SUMMARY');
  const [classSearch, setClassSearch] = useState('');
  const [detailSearch, setDetailSearch] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/academic-years').then(r => r.json()).catch(() => []),
      fetch('/api/campuses').then(r => r.json()).catch(() => [])
    ]).then(([years, camps]) => {
      if (Array.isArray(years) && years.length > 0) {
        setAcademicYears(years);
        const active = years.find((y: any) => y.status === 'ACTIVE' && !y.isOff) || years[0];
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
    if (selectedMonth !== 'ALL') url += `&month=${selectedMonth}`;
    if (selectedEvalStatus !== 'ALL') url += `&evalStatus=${selectedEvalStatus}`;
    if (selectedClassId !== 'ALL') url += `&classId=${encodeURIComponent(selectedClassId)}`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedYearId, selectedCampusId, selectedLevel, selectedGrade, selectedMonth, selectedEvalStatus, selectedClassId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Filtered Class Summary
  const filteredClassSummary = useMemo(() => {
    const list: any[] = stats?.classSummary || [];
    if (!classSearch.trim()) return list;
    const q = classSearch.toLowerCase().trim();
    return list.filter(c => 
      c.className?.toLowerCase().includes(q) ||
      c.campusName?.toLowerCase().includes(q) ||
      c.campusCode?.toLowerCase().includes(q) ||
      c.homeroomTeacherName?.toLowerCase().includes(q) ||
      c.subjectTeachersText?.toLowerCase().includes(q)
    );
  }, [stats?.classSummary, classSearch]);

  // Filtered Detail Progress
  const filteredClassProgress = useMemo(() => {
    let list: any[] = stats?.classProgress || [];
    if (selectedClassId !== 'ALL') {
      list = list.filter(item => item.classId === selectedClassId || item.className === selectedClassId);
    }
    if (selectedMonth !== 'ALL') {
      const targetM = Number(selectedMonth.replace(/\D/g, ''));
      list = list.filter(item => item.monthNumber === targetM);
    }
    if (selectedEvalStatus !== 'ALL') {
      list = list.filter(item => item.evalStatus === selectedEvalStatus);
    }
    if (detailSearch.trim()) {
      const q = detailSearch.toLowerCase().trim();
      list = list.filter(item =>
        item.activityName?.toLowerCase().includes(q) ||
        item.className?.toLowerCase().includes(q) ||
        item.homeroomTeacherName?.toLowerCase().includes(q) ||
        item.subjectTeacherName?.toLowerCase().includes(q) ||
        item.themeName?.toLowerCase().includes(q) ||
        item.integratedSubjects?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [stats?.classProgress, selectedClassId, selectedMonth, selectedEvalStatus, detailSearch]);

  // Export Excel
  const handleExportExcel = () => {
    if (!stats || !stats.classProgress || stats.classProgress.length === 0) {
      toast.error('Không có dữ liệu để xuất Excel');
      return;
    }
    try {
      // Sheet 1: Chi tiết từng hoạt động theo lớp
      const detailExport = stats.classProgress.map((cp: any, idx: number) => ({
        'STT': idx + 1,
        'Tháng': cp.month || '',
        'Cơ sở': cp.campusName || cp.campusCode || '',
        'Khối': cp.grade || '',
        'Lớp': cp.className || '',
        'GVCN (Chủ nhiệm)': cp.homeroomTeacherName || '',
        'GVBM / TCM Phụ trách': cp.subjectTeacherName || '',
        'Tên Hoạt động': cp.activityName || '',
        'Chủ đề giáo dục': cp.themeName || '',
        'Môn phối hợp': cp.integratedSubjects || '',
        'Địa điểm': cp.location || '',
        'Sĩ số HS': cp.totalStudents || 0,
        'Đã đánh giá': cp.evaluatedStudents || 0,
        'Tỷ lệ hoàn thành': `${cp.progressPercent || 0}%`,
        'Tình trạng đánh giá': cp.evalStatus === 'DA_DANH_GIA' ? 'Đã hoàn thành (100%)' : (cp.evalStatus === 'DANG_DANH_GIA' ? 'Đang đánh giá' : 'Chưa đánh giá'),
        'Hình thức đánh giá': cp.evalMode || 'Bảng kiểm quan sát'
      }));

      // Sheet 2: Tổng hợp theo từng lớp
      const summaryExport = (stats.classSummary || []).map((cs: any, idx: number) => ({
        'STT': idx + 1,
        'Cơ sở': cs.campusName || cs.campusCode || '',
        'Khối': cs.grade || '',
        'Lớp': cs.className || '',
        'GVCN': cs.homeroomTeacherName || '',
        'GVBM Phụ trách': cs.subjectTeachersText || '',
        'Số HĐ đã gán': cs.totalAssigned || 0,
        'Định mức chuẩn': cs.target || 2,
        'Trạng thái định mức': cs.isTargetMet ? 'Đạt chuẩn' : `Thiếu ${cs.missingCount} HĐ`,
        'HĐ Đã hoàn thành (100%)': cs.completedCount || 0,
        'HĐ Đang đánh giá': cs.inProgressCount || 0,
        'HĐ Chưa đánh giá': cs.notStartedCount || 0,
        'Tỷ lệ hoàn thành chung': `${cs.overallProgressPercent || 0}%`
      }));

      const wb = XLSX.utils.book_new();
      const wsDetail = XLSX.utils.json_to_sheet(detailExport);
      const wsSummary = XLSX.utils.json_to_sheet(summaryExport);

      XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi_Tiet_HD_Theo_Lop');
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Tong_Hop_Theo_Lop');
      XLSX.writeFile(wb, `Bao_Cao_HDTN_Chi_Tiet_Theo_Lop_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Đã xuất báo cáo Excel thành công (2 Sheet: Chi tiết & Tổng hợp)!');
    } catch {
      toast.error('Lỗi khi xuất file Excel');
    }
  };

  const kpis = stats?.kpis || { 
    totalActivities: 0, 
    totalClassesAssigned: 0, 
    totalStudentsEvaluated: 0, 
    overallCompletionRate: 0,
    totalCompletedAssignments: 0,
    totalInProgressAssignments: 0,
    totalNotStartedAssignments: 0
  };

  const evalStats = stats?.evaluationStats || {
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    total: 0,
    completedRate: 0,
    inProgressRate: 0,
    notStartedRate: 0
  };

  const evalPieData = [
    { name: 'Đã hoàn thành (100%)', value: evalStats.completed, color: EVAL_COLORS.COMPLETED },
    { name: 'Đang đánh giá', value: evalStats.inProgress, color: EVAL_COLORS.IN_PROGRESS },
    { name: 'Chưa đánh giá', value: evalStats.notStarted, color: EVAL_COLORS.NOT_STARTED }
  ];

  const monthlyChartData = (stats?.monthlyStats || []).map((m: any) => ({
    name: m.month,
    monthNumber: m.monthNumber,
    'Đã hoàn thành': m.completedCount,
    'Đang đánh giá': m.inProgressCount,
    'Chưa đánh giá': m.notStartedCount,
    'Tổng số gán': m.totalClassesAssigned,
    rate: m.completionRate
  }));

  const themeAxisData = (stats?.themeAxisDistribution || []).map((t: any) => ({
    name: t.name,
    count: t.count,
    color: t.color
  }));

  const handleDrilldownClass = (className: string) => {
    setSelectedClassId(className);
    setActiveTab('ACTIVITY_DETAIL');
    toast(`Đang hiển thị hoạt động của lớp ${className}`);
  };

  const handleResetFilters = () => {
    setSelectedCampusId('ALL');
    setSelectedLevel('ALL');
    setSelectedGrade('ALL');
    setSelectedMonth('ALL');
    setSelectedEvalStatus('ALL');
    setSelectedClassId('ALL');
    setClassSearch('');
    setDetailSearch('');
    toast.success('Đã làm mới các bộ lọc');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/15 to-sky-50/20 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <ExperientialTabs activeTab="reports" />

        {/* HERO BANNER */}
        <div className="relative backdrop-blur-xl bg-white/90 rounded-3xl p-6 sm:p-8 border border-white shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#003B3A] via-[#00A19A] via-[#48BFE3] to-[#6366F1]" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#003B3A] via-[#00A19A] to-[#48BFE3] p-0.5 shadow-lg shadow-[#00A19A]/20 shrink-0">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-[#00A19A]" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#00A19A]/10 text-[#003B3A] border border-[#00A19A]/20">
                    Báo Cáo &amp; Thống Kê Chi Tiết
                  </span>
                  <span className="text-xs font-bold text-slate-500">Giám Sát Toàn Diện HĐTN Sky-Line</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#003B3A] via-[#005F5E] to-[#00A19A] bg-clip-text text-transparent tracking-tight">
                  Thống Kê Hoạt Động Theo Từng Tháng &amp; Chi Tiết Theo Lớp
                </h1>
                <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
                  Kiểm soát tiến độ theo Tháng (T8 - T5), định mức gán theo Lớp (MN ≥ 5, K12 ≥ 2), phân định GVCN &amp; GVBM và tình trạng đánh giá
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleExportExcel}
                className="px-5 py-3 bg-[#003B3A] hover:bg-[#002B2A] text-white text-xs font-black rounded-2xl shadow-md shadow-[#003B3A]/20 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-300" />
                <span>Xuất Excel Đầy Đủ</span>
              </button>
            </div>
          </div>

          {/* 5 KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-6 pt-6 border-t border-slate-100">
            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Hoạt động</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{kpis.totalActivities}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Toàn hệ thống</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Lượt Gán Theo Lớp</p>
                <p className="text-2xl font-black text-sky-700 mt-1">{kpis.totalClassesAssigned}</p>
                <p className="text-[10px] text-sky-600 mt-0.5 font-medium">{stats?.targetCompliance?.totalClasses || 0} lớp tham gia</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">
                <Building2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/70 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Đã Hoàn Thành (100%)</p>
                <p className="text-2xl font-black text-emerald-800 mt-1">{evalStats.completed}</p>
                <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">Chiếm {evalStats.completedRate}% lượt gán</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/70 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Đang / Chưa Đánh Giá</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <p className="text-2xl font-black text-amber-800">{evalStats.inProgress + evalStats.notStarted}</p>
                  <span className="text-[10px] font-bold text-amber-700">({evalStats.inProgress} đang / {evalStats.notStarted} chưa)</span>
                </div>
                <p className="text-[10px] text-amber-600 mt-0.5 font-medium">{kpis.totalStudentsEvaluated} lượt HS đã chấm</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-[#00A19A]/10 p-3.5 rounded-2xl border border-[#00A19A]/30 flex items-center justify-between col-span-2 sm:col-span-1">
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] font-black text-[#003B3A] uppercase tracking-wider">Đạt Chuẩn Định Mức</p>
                  <span className="text-[9px] text-[#00A19A] font-bold">(MN≥5, K12≥2)</span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-2xl font-black text-[#003B3A]">{stats?.targetCompliance?.targetComplianceRate || 0}%</p>
                  <span className="text-[11px] font-bold text-[#005F5E]">({stats?.targetCompliance?.classesMeetingTarget || 0}/{stats?.targetCompliance?.totalClasses || 0} lớp)</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Tỷ lệ lớp đủ số HĐ</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#00A19A]/20 text-[#003B3A] flex items-center justify-center border border-[#00A19A]/40">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* MULTI-FILTER BAR WITH MONTH & STATUS */}
        <div className="bg-white/95 p-4 rounded-3xl border border-white shadow-md shadow-slate-200/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#00A19A]" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">Bộ Lọc Thống Kê Đa Chiều</span>
            </div>
            {(selectedCampusId !== 'ALL' || selectedLevel !== 'ALL' || selectedGrade !== 'ALL' || selectedMonth !== 'ALL' || selectedEvalStatus !== 'ALL' || selectedClassId !== 'ALL') && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại tất cả bộ lọc</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Năm học</label>
              <select
                value={selectedYearId}
                onChange={e => setSelectedYearId(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#00A19A]"
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
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#00A19A]"
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
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#00A19A]"
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
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#00A19A]"
              >
                <option value="ALL">Tất cả khối</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                  <option key={g} value={String(g)}>Khối {g}</option>
                ))}
              </select>
            </div>

            {/* MONTH FILTER (T8 -> T5) */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#003B3A] mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#00A19A]" />
                <span>Theo Tháng</span>
              </label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full py-2 px-3 bg-teal-50/50 border border-[#00A19A]/40 rounded-xl text-xs font-extrabold text-[#003B3A] outline-none focus:border-[#00A19A]"
              >
                <option value="ALL">Tất cả các tháng (T8 - T5)</option>
                <option value="8">Tháng 8</option>
                <option value="9">Tháng 9</option>
                <option value="10">Tháng 10</option>
                <option value="11">Tháng 11</option>
                <option value="12">Tháng 12</option>
                <option value="1">Tháng 1</option>
                <option value="2">Tháng 2</option>
                <option value="3">Tháng 3</option>
                <option value="4">Tháng 4</option>
                <option value="5">Tháng 5</option>
              </select>
            </div>

            {/* EVAL STATUS FILTER */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tình trạng ĐG</label>
              <select
                value={selectedEvalStatus}
                onChange={e => setSelectedEvalStatus(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#00A19A]"
              >
                <option value="ALL">Tất cả tình trạng</option>
                <option value="DA_DANH_GIA">Đã hoàn thành (100%)</option>
                <option value="DANG_DANH_GIA">Đang đánh giá (1-99%)</option>
                <option value="CHUA_DANH_GIA">Chưa đánh giá (0%)</option>
              </select>
            </div>
          </div>

          {/* Active Class Filter Chip */}
          {selectedClassId !== 'ALL' && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-semibold">Đang lọc theo lớp:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                <span>{selectedClassId}</span>
                <button 
                  onClick={() => setSelectedClassId('ALL')} 
                  className="hover:text-indigo-900 rounded-full p-0.5"
                  title="Xóa lọc theo lớp"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          )}
        </div>

        {/* 2 MAIN CHARTS: MONTHLY DISTRIBUTION & EVALUATION STATUS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CHART 1: MONTHLY PROGRESS (THÁNG 8 -> THÁNG 5) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md shadow-slate-200/40 space-y-4 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#00A19A]" />
                  Phân Bổ Hoạt Động &amp; Tiến Độ Đánh Giá Theo Từng Tháng (Năm Học {props?.activeYearName || '2026-2027'})
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Theo dõi số lượng hoạt động được triển khai và hoàn thành theo tiến độ thời gian thực từng tháng (T8 - T5)
                </p>
              </div>
              <span className="text-[11px] font-black text-[#003B3A] bg-[#00A19A]/10 px-3 py-1 rounded-full border border-[#00A19A]/20">
                Chu kỳ 10 Tháng
              </span>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} stroke="#64748B" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(val: any, name: any) => [`${val} lượt gán`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '8px' }} />
                  <Bar dataKey="Đã hoàn thành" fill={EVAL_COLORS.COMPLETED} stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Đang đánh giá" fill={EVAL_COLORS.IN_PROGRESS} stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Chưa đánh giá" fill={EVAL_COLORS.NOT_STARTED} stackId="a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-center">
              {monthlyChartData.slice(0, 5).map((m: any, idx: number) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedMonth(String(m.monthNumber))}
                  className={`p-2 rounded-xl border text-xs cursor-pointer transition-all ${selectedMonth === String(m.monthNumber) ? 'bg-[#00A19A]/15 border-[#00A19A] font-black' : 'bg-slate-50 border-slate-200/70 hover:bg-slate-100'}`}
                >
                  <p className="font-bold text-slate-700">{m.name}</p>
                  <p className="text-[13px] font-black text-slate-900 mt-0.5">{m['Tổng số gán']} <span className="text-[10px] font-medium text-slate-400">lượt</span></p>
                  <p className="text-[10px] font-bold text-emerald-600">Xong: {m.rate}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* CHART 2: EVALUATION STATUS PIE CHART */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md shadow-slate-200/40 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Tình Trạng Đánh Giá Toàn Hệ Thống
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Tổng cộng: <strong className="text-slate-800">{evalStats.total} lượt gán</strong> hoạt động cho các lớp
              </p>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={evalPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {evalPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val} lượt gán`, 'Số lượng']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Status Breakdown Legend Cards */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div 
                onClick={() => setSelectedEvalStatus(selectedEvalStatus === 'DA_DANH_GIA' ? 'ALL' : 'DA_DANH_GIA')}
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selectedEvalStatus === 'DA_DANH_GIA' ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200' : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-950">Đã hoàn thành (100%)</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-800">{evalStats.completed}</span>
                  <span className="text-[10px] text-emerald-600 ml-1 font-bold">({evalStats.completedRate}%)</span>
                </div>
              </div>

              <div 
                onClick={() => setSelectedEvalStatus(selectedEvalStatus === 'DANG_DANH_GIA' ? 'ALL' : 'DANG_DANH_GIA')}
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selectedEvalStatus === 'DANG_DANH_GIA' ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-200' : 'bg-sky-50/50 border-sky-200 hover:bg-sky-50'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-500" />
                  <span className="text-xs font-bold text-sky-950">Đang đánh giá (1-99%)</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-sky-800">{evalStats.inProgress}</span>
                  <span className="text-[10px] text-sky-600 ml-1 font-bold">({evalStats.inProgressRate}%)</span>
                </div>
              </div>

              <div 
                onClick={() => setSelectedEvalStatus(selectedEvalStatus === 'CHUA_DANH_GIA' ? 'ALL' : 'CHUA_DANH_GIA')}
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selectedEvalStatus === 'CHUA_DANH_GIA' ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200' : 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-amber-950">Chưa đánh giá (0%)</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-800">{evalStats.notStarted}</span>
                  <span className="text-[10px] text-amber-600 ml-1 font-bold">({evalStats.notStartedRate}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 CORE THEMES DISPLAY */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md shadow-slate-200/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Phân Bổ Hoạt Động Theo 4 Trục Chủ Đề Giáo Dục Cốt Lõi
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Kiểm soát sự cân bằng liên môn: Di sản &amp; Lịch sử, Môi trường xanh, Khoa học &amp; STEM, Ngôn ngữ &amp; Hội nhập
              </p>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Chủ Đề Cốt Lõi
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {themeAxisData.map((axis: any, idx: number) => (
              <div key={idx} className="p-3.5 rounded-2xl border bg-slate-50/50 hover:bg-white transition-all space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black" style={{ color: axis.color }}>{axis.name}</span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: axis.color }} />
                </div>
                <div className="text-2xl font-black text-slate-800">{axis.count} <span className="text-xs font-medium text-slate-400">HĐ</span></div>
                <div className="text-[10px] text-slate-500 font-medium">Chiếm {kpis.totalActivities > 0 ? Math.round((axis.count / kpis.totalActivities) * 100) : 0}% tổng HĐ</div>
              </div>
            ))}
          </div>
        </div>

        {/* AT-RISK CLASSES WARNING (UNDER-TARGET) */}
        {stats?.targetCompliance?.atRiskClasses && stats.targetCompliance.atRiskClasses.length > 0 && (
          <div className="bg-amber-50/70 rounded-3xl border border-amber-200 shadow-md shadow-amber-900/5 p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-950">
                    Cảnh Báo Định Mức: {stats.targetCompliance.atRiskClassesCount} Lớp Chưa Đạt Đủ Định Mức Hoạt Động (MN &lt; 5, K12 &lt; 2)
                  </h3>
                  <p className="text-xs text-amber-800 font-medium">
                    KT&amp;ĐBCL và BGH cơ sở cần nhắc nhở GV phụ trách gán bổ sung hoạt động ngoại khóa theo quy chuẩn
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-900 bg-white px-3 py-1 rounded-full border border-amber-300">
                Cần bổ sung hoạt động
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              {stats.targetCompliance.atRiskClasses.map((cls: any, idx: number) => (
                <div 
                  key={idx} 
                  onClick={() => handleDrilldownClass(cls.className)}
                  className="bg-white p-3 rounded-2xl border border-amber-200/80 shadow-2xs space-y-1.5 cursor-pointer hover:border-amber-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-900">{cls.className}</span>
                    <span className="text-[10px] font-bold text-slate-400">{cls.campusCode}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">GVCN: {cls.homeroomTeacherName || '—'}</div>
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-amber-700">Đã gán: {cls.totalAssigned}/{cls.target} HĐ</span>
                    <span className="text-rose-600 font-black">Thiếu {cls.missingCount}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.round((cls.totalAssigned / cls.target) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NAVIGATION TABS FOR TABLES */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('CLASS_SUMMARY')}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${activeTab === 'CLASS_SUMMARY' ? 'bg-[#003B3A] text-white shadow-md shadow-[#003B3A]/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            <Building2 className="w-4 h-4 text-emerald-300" />
            <span>1. Thống Kê Số Hoạt Động Đã Gán Theo Lớp</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
              {filteredClassSummary.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ACTIVITY_DETAIL')}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${activeTab === 'ACTIVITY_DETAIL' ? 'bg-[#003B3A] text-white shadow-md shadow-[#003B3A]/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            <Eye className="w-4 h-4 text-sky-300" />
            <span>2. Chi Tiết Hoạt Động Theo Từng Lớp (Drill-Down)</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
              {filteredClassProgress.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('CAMPUS_TLHN')}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${activeTab === 'CAMPUS_TLHN' ? 'bg-[#003B3A] text-white shadow-md shadow-[#003B3A]/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            <Users className="w-4 h-4 text-amber-300" />
            <span>3. Tiến Độ Cán Bộ Tổ TLHN Cơ Sở</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
              {(stats?.campusTLHNProgress || []).length}
            </span>
          </button>
        </div>

        {/* TAB 1: CLASS SUMMARY TABLE */}
        {activeTab === 'CLASS_SUMMARY' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md shadow-slate-200/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <h3 className="text-sm font-black text-slate-800">
                    Bảng Thống Kê Tổng Hợp Số Hoạt Động Đã Gán &amp; Tình Trạng Đánh Giá Theo Từng Lớp
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  So sánh số lượng HĐ đã gán với định mức chuẩn (MN ≥ 5, K12 ≥ 2), tỷ lệ hoàn thành đánh giá và danh sách GV phụ trách
                </p>
              </div>

              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm lớp, GVCN, GVBM..."
                  value={classSearch}
                  onChange={e => setClassSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#00A19A]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-12">#</th>
                    <th className="py-3.5 px-4 min-w-[120px]">Cơ sở / Khối</th>
                    <th className="py-3.5 px-4 min-w-[110px]">Lớp</th>
                    <th className="py-3.5 px-4 min-w-[150px]">GVCN (Chủ nhiệm)</th>
                    <th className="py-3.5 px-4 min-w-[180px]">GVBM / TCM Phụ trách</th>
                    <th className="py-3.5 px-4 text-center min-w-[130px]">Số HĐ Đã Gán / Chuẩn</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Đã Hoàn Thành</th>
                    <th className="py-3.5 px-4 text-center min-w-[110px]">Đang ĐG</th>
                    <th className="py-3.5 px-4 text-center min-w-[110px]">Chưa ĐG</th>
                    <th className="py-3.5 px-4 min-w-[150px]">Tiến độ ĐG (%)</th>
                    <th className="py-3.5 px-4 text-center min-w-[110px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredClassSummary.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-bold">
                        Không có lớp nào phù hợp với bộ lọc hiện tại
                      </td>
                    </tr>
                  ) : (
                    filteredClassSummary.map((cs: any, idx: number) => {
                      const isComplete = cs.overallProgressPercent === 100 && cs.totalAssigned > 0;
                      return (
                        <tr key={idx} className="hover:bg-teal-50/20 transition-colors">
                          <td className="py-3.5 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-bold text-slate-800">{cs.campusName || cs.campusCode}</span>
                            <span className="text-[11px] text-slate-400 block">Khối {cs.grade}</span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {cs.className}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="font-bold text-indigo-950">{cs.homeroomTeacherName || '—'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-[11px] font-semibold text-slate-600 line-clamp-2">
                              {cs.subjectTeachersText || '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="text-sm font-black text-slate-900">{cs.totalAssigned}</span>
                              <span className="text-slate-400">/{cs.target} HĐ</span>
                              {cs.isTargetMet ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Đạt
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                  Thiếu {cs.missingCount}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {cs.completedCount} HĐ
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                              {cs.inProgressCount} HĐ
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                              {cs.notStartedCount} HĐ
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-black">
                                <span className={isComplete ? 'text-emerald-700' : 'text-[#00A19A]'}>
                                  {cs.overallProgressPercent}%
                                </span>
                                <span className="text-[10px] text-slate-400">{cs.completedCount}/{cs.totalAssigned} hoàn tất</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-[#00A19A]'}`}
                                  style={{ width: `${cs.overallProgressPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDrilldownClass(cs.className)}
                              className="px-2.5 py-1 text-[11px] font-bold text-[#003B3A] hover:bg-[#00A19A]/15 rounded-lg border border-[#00A19A]/30 transition-all flex items-center gap-1 mx-auto"
                            >
                              <Eye className="w-3 h-3 text-[#00A19A]" />
                              <span>Xem HĐ</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITY DETAIL TABLE (DRILL-DOWN) */}
        {activeTab === 'ACTIVITY_DETAIL' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md shadow-slate-200/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                  <h3 className="text-sm font-black text-slate-800">
                    Bảng Chi Tiết Hoạt Động Trải Nghiệm Theo Từng Lớp
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Hiển thị đầy đủ Tháng, Tên hoạt động, Chủ đề giáo dục, Môn phối hợp, Địa điểm, GVCN &amp; GVBM và tình trạng đánh giá
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm tên HĐ, môn, GV..."
                    value={detailSearch}
                    onChange={e => setDetailSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#00A19A]"
                  />
                </div>
                {selectedClassId !== 'ALL' && (
                  <button
                    onClick={() => setSelectedClassId('ALL')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Xem tất cả lớp</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-12">#</th>
                    <th className="py-3.5 px-4 min-w-[100px]">Tháng</th>
                    <th className="py-3.5 px-4 min-w-[120px]">Lớp (Cơ sở)</th>
                    <th className="py-3.5 px-4 min-w-[220px]">Tên Hoạt Động Trải Nghiệm</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Chủ Đề &amp; Môn Phối Hợp</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Địa Điểm</th>
                    <th className="py-3.5 px-4 min-w-[140px]">GVCN</th>
                    <th className="py-3.5 px-4 min-w-[160px]">GVBM / TCM Phụ trách</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Tiến Độ HS</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Tình Trạng Đánh Giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredClassProgress.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-bold">
                        Không có dữ liệu hoạt động chi tiết phù hợp với điều kiện tìm kiếm
                      </td>
                    </tr>
                  ) : (
                    filteredClassProgress.map((cp: any, idx: number) => {
                      const isCompleted = cp.evalStatus === 'DA_DANH_GIA';
                      const isInProgress = cp.evalStatus === 'DANG_DANH_GIA';

                      return (
                        <tr key={idx} className="hover:bg-teal-50/20 transition-colors">
                          <td className="py-3.5 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-teal-50 text-[#003B3A] border border-[#00A19A]/30">
                              <Calendar className="w-3 h-3 text-[#00A19A]" />
                              {cp.month || 'Trong năm'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {cp.className}
                            </span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">{cp.campusCode} - K{cp.grade}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-black text-slate-900 text-[13px]">{cp.activityName}</div>
                            {cp.educationalContent && (
                              <p className="text-[11px] text-slate-500 font-normal line-clamp-1 mt-0.5">{cp.educationalContent}</p>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-200 mb-1">
                              {cp.themeName || 'Chủ đề giáo dục'}
                            </span>
                            <div className="text-[11px] text-indigo-700 font-bold flex items-center gap-1">
                              <BookOpen className="w-3 h-3 shrink-0" />
                              <span className="line-clamp-1">{cp.integratedSubjects || 'Liên môn'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-slate-700 font-medium text-[11px] line-clamp-1">
                              {cp.location || 'Tại trường'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-800">{cp.homeroomTeacherName || '—'}</div>
                            <span className="text-[10px] text-slate-400 font-semibold">Chủ nhiệm</span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-extrabold text-indigo-900">{cp.subjectTeacherName || '—'}</div>
                            <span className="text-[10px] text-indigo-500 font-semibold">GVBM / TCM Phụ trách</span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="font-black text-slate-800 text-xs">
                                <span>{cp.evaluatedStudents}</span> / <span className="text-slate-500">{cp.totalStudents} HS</span>
                              </div>
                              <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden mx-auto">
                                <div
                                  className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-[#00A19A]'}`}
                                  style={{ width: `${cp.progressPercent}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">{cp.progressPercent}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Đã hoàn thành (100%)
                              </span>
                            ) : isInProgress ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                                <Clock className="w-3.5 h-3.5 text-sky-600" />
                                Đang đánh giá ({cp.progressPercent}%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                Chưa đánh giá (0%)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CAMPUS TLHN PROGRESS */}
        {activeTab === 'CAMPUS_TLHN' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md shadow-slate-200/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00A19A]" />
                  <h3 className="text-sm font-black text-slate-800">
                    Giám Sát Tiến Độ Tiếp Nhận &amp; Triển Khai Của Cán Bộ Tổ TLHN Theo Cơ Sở
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Theo dõi tình trạng tiếp nhận hoạt động được phân bổ và tiến độ gán lớp tại từng cơ sở
                </p>
              </div>
              <span className="text-xs font-bold text-[#003B3A] bg-[#00A19A]/10 px-3 py-1 rounded-full border border-[#00A19A]/20">
                Tổng: {(stats?.campusTLHNProgress || []).length} cơ sở
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-12">#</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Cơ sở</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Cán bộ Tổ TLHN</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Tổng HĐ phân bổ</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Chưa tiếp nhận</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Đã tiếp nhận</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Đã triển khai</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Tỷ lệ triển khai lớp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {(stats?.campusTLHNProgress || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                        Chưa có dữ liệu phân bổ hoạt động về cơ sở nào trong năm học được chọn
                      </td>
                    </tr>
                  ) : (
                    (stats?.campusTLHNProgress || []).map((cp: any, idx: number) => {
                      const isFullyDeployed = cp.deployRate === 100 && cp.totalDispatched > 0;
                      return (
                        <tr key={idx} className="hover:bg-teal-50/20 transition-colors">
                          <td className="py-3.5 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-extrabold text-slate-800 text-[13px]">{cp.campusName || cp.campusCode}</span>
                            <span className="text-[11px] text-slate-400 font-mono block">Mã: {cp.campusCode}</span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-bold text-[#003B3A]">{cp.tlhnTeacherName || 'GV Tổ TLHN'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="font-black text-slate-800 text-[13px]">{cp.totalDispatched}</span> hoạt động
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {cp.pendingCount}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              {cp.receivedCount}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {cp.deployedCount} ({cp.totalClassesDeployed} lớp)
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-black">
                                <span className={isFullyDeployed ? 'text-emerald-700' : 'text-[#00A19A]'}>{cp.deployRate}%</span>
                                <span className="text-[10px] text-slate-400">{cp.deployedCount}/{cp.totalDispatched} HĐ</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${isFullyDeployed ? 'bg-emerald-500' : 'bg-[#00A19A]'}`}
                                  style={{ width: `${cp.deployRate}%` }}
                                />
                              </div>
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
        )}

      </div>
    </div>
  );
}

export default ExperientialReportsClient;
