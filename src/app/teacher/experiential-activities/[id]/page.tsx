"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Settings, Save, Search, CheckSquare,
  CheckCircle2, Plus, X, Hash, Edit3, Loader2,
  Square, Users, BookOpen, Calendar, Tag, ChevronDown,
  CheckCheck, Sparkles, Award, Filter, ShieldCheck, CheckCircle, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function ActivityResultInput() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [search, setSearch] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState('');
  const [bulkLevel, setBulkLevel] = useState('');
  const [bulkAchievement, setBulkAchievement] = useState('');

  // Data
  const [activity, setActivity] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ role: any[]; result: any[]; achievement: any[] }>({ role: [], result: [], achievement: [] });
  const [editData, setEditData] = useState({ name: '', date: '' });

  const [config, setConfig] = useState({
    visibleStandardColumns: ['roleId', 'evalLevelId', 'achievementId', 'note'],
    customColumns: [] as { id: string; name: string; type: string }[]
  });
  const [editConfig, setEditConfig] = useState(config);

  const standardColumnsMeta = [
    { id: 'roleId', name: 'Vai trò tham gia' },
    { id: 'evalLevelId', name: 'Mức đánh giá' },
    { id: 'achievementId', name: 'Thành tích' },
    { id: 'absenceReasonId', name: 'Lý do vắng' },
    { id: 'note', name: 'Ghi chú chung' }
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [actRes, catRes] = await Promise.all([
        fetch(`/api/experiential-activities/${id}`),
        fetch('/api/activities/categories')
      ]);

      if (actRes.ok) {
        const data = await actRes.json();
        setActivity(data);
        setEditData({
          name: data.name || data.catalog?.name || '',
          date: data.date ? new Date(data.date).toISOString().substring(0, 10) : ''
        });
        if (data.participants) {
          setStudents(data.participants.map((p: any) => ({
            ...p,
            id: p.id,
            studentId: p.studentId,
            code: p.student?.studentCode || '',
            name: p.student?.studentName || '(Chưa có tên)',
            class: p.student?.class?.className || p.student?.class?.name || '',
            gender: p.student?.gender || '',
            roleId: p.roleId || '',
            evalLevelId: p.evalLevelId || '',
            achievementId: p.achievementId || '',
            absenceReasonId: p.absenceReasonId || '',
            note: p.note || '{}'
          })));
        }
      } else {
        const errText = await actRes.text();
        toast.error('API Error: ' + actRes.status + ' - ' + errText);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData.success) {
          setCategories({
            role: catData.data.filter((c: any) => c.type === 'ROLE' && c.status === 'ACTIVE'),
            result: catData.data.filter((c: any) => c.type === 'KQUA' && c.status === 'ACTIVE'),
            achievement: catData.data.filter((c: any) => c.type === 'ACHIEVEMENT' && c.status === 'ACTIVE')
          });
        }
      }
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase()) ||
    s.class?.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.has(s.id));
  const someSelected = filteredStudents.some(s => selectedIds.has(s.id));

  const toggleAll = () => {
    if (allSelected) {
      const newSet = new Set(selectedIds);
      filteredStudents.forEach(s => newSet.delete(s.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      filteredStudents.forEach(s => newSet.add(s.id));
      setSelectedIds(newSet);
    }
  };

  const toggleStudent = (sid: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(sid)) newSet.delete(sid);
    else newSet.add(sid);
    setSelectedIds(newSet);
  };

  const handleApplyBulk = () => {
    if (selectedIds.size === 0) return;
    setStudents(prev => prev.map(s => {
      if (!selectedIds.has(s.id)) return s;
      return {
        ...s,
        ...(bulkRole ? { roleId: bulkRole } : {}),
        ...(bulkLevel ? { evalLevelId: bulkLevel } : {}),
        ...(bulkAchievement ? { achievementId: bulkAchievement } : {})
      };
    }));
    setBulkRole(''); setBulkLevel(''); setBulkAchievement('');
    setSelectedIds(new Set());
    toast.success(`Đã áp dụng cho ${selectedIds.size} học sinh`);
  };

  const handleChange = (sid: string, field: string, value: string, isCustom = false) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== sid) return s;
      if (isCustom) {
        let obj: any = {};
        try { obj = JSON.parse(s.note || '{}'); } catch {}
        obj[field] = value;
        return { ...s, note: JSON.stringify(obj) };
      }
      return { ...s, [field]: value };
    }));
  };

  const getCustomValue = (note: string, colId: string) => {
    try { return JSON.parse(note || '{}')[colId] || ''; } catch { return ''; }
  };

  const handleSaveResults = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/experiential-activities/${id}/results`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students })
      });
      if (res.ok) {
        toast.success('Đã lưu kết quả thành công!');
        fetchData();
      } else toast.error('Lỗi khi lưu kết quả');
    } catch { toast.error('Lỗi kết nối máy chủ'); }
    finally { setSaving(false); }
  };

  const handleUpdateActivity = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/experiential-activities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: editData.date, name: editData.name })
      });
      if (res.ok) {
        toast.success('Cập nhật thành công!');
        setShowEditModal(false);
        fetchData();
      } else toast.error('Lỗi khi cập nhật');
    } catch { toast.error('Lỗi kết nối máy chủ'); }
    finally { setSaving(false); }
  };

  const SelectArrow = () => (
    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
  );

  const handleExportExcel = () => {
    if (students.length === 0) {
      toast.error('Không có dữ liệu học sinh để xuất file Excel');
      return;
    }
    try {
      const dataToExport = filteredStudents.map((s, idx) => {
        const roleObj = categories.role.find((c: any) => c.code === s.roleId);
        const levelObj = categories.result.find((c: any) => c.code === s.evalLevelId);
        const achObj = categories.achievement.find((c: any) => c.code === s.achievementId);

        const row: any = {
          'STT': idx + 1,
          'Mã Học Sinh': s.code || '',
          'Họ và Tên': s.name || '',
          'Lớp': s.class || '',
          'Giới Tính': s.gender === 'male' ? 'Nam' : (s.gender === 'female' ? 'Nữ' : s.gender || ''),
          'Vai Trò Tham Gia': roleObj ? roleObj.name : (s.roleId || ''),
          'Mức Đánh Giá': levelObj ? levelObj.name : (s.evalLevelId || ''),
          'Thành Tích': achObj ? achObj.name : (s.achievementId || ''),
          'Lý Do Vắng': s.absenceReasonId || '',
          'Ghi Chú': s.note && !s.note.startsWith('{') ? s.note : ''
        };

        config.customColumns.forEach(col => {
          row[col.name] = getCustomValue(s.note, col.id);
        });

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 15 },
        { wch: 25 },
        { wch: 12 },
        { wch: 10 },
        { wch: 22 },
        { wch: 20 },
        { wch: 20 },
        { wch: 16 },
        { wch: 25 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ket_Qua_Danh_Gia');
      const safeName = (activityName || 'Hoat_Dong').replace(/[^a-zA-Z0-9_À-ỹ]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Ket_Qua_${safeName}_${dateStr}.xlsx`);
      toast.success('Đã xuất file Excel kết quả thành công!');
    } catch (err) {
      console.error('Export excel error:', err);
      toast.error('Lỗi khi xuất file Excel');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50/80 flex justify-center items-center">
      <div className="flex flex-col items-center gap-4 backdrop-blur-xl bg-white/80 p-8 rounded-3xl border border-white/90 shadow-xl">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-600 font-bold text-xs">Đang tải dữ liệu hoạt động...</p>
      </div>
    </div>
  );

  const getSelectClass = (val: string) => {
    const base = "w-full appearance-none text-xs font-bold rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pl-3 pr-8 py-2.5 transition-all outline-none border ";
    if (val) {
      return base + "bg-emerald-50/80 border-emerald-300/80 text-emerald-800 shadow-2xs";
    }
    return base + "bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-white";
  };

  const gradedCount = students.filter(s => s.roleId || s.evalLevelId || s.achievementId).length;
  const progressPercent = students.length > 0 ? Math.round((gradedCount / students.length) * 100) : 0;

  const activityName = activity?.name || activity?.catalog?.name || 'Hoạt động trải nghiệm';
  const activityCode = activity?.code || '';

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-indigo-50/20 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden">
      
      {/* Background Ambient Glow Orbs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-gradient-to-br from-indigo-300/30 via-purple-300/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/4 -right-24 w-96 h-96 bg-gradient-to-bl from-cyan-300/30 via-teal-300/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-12 left-1/3 w-96 h-96 bg-gradient-to-tr from-pink-200/20 via-sky-200/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-[1440px] mx-auto space-y-6">

        {/* HERO BANNER & METADATA (Glassmorphism) */}
        <div className="backdrop-blur-xl bg-white/85 rounded-3xl border border-white/90 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-cyan-500 to-teal-400" />
          
          <div className="p-6 sm:p-7 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-3 flex-1">
              <button
                onClick={() => router.push('/teacher/experiential-activities')}
                className="text-xs font-black text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Trở lại danh sách hoạt động
              </button>

              <div className="flex items-center gap-3 flex-wrap">
                {activityCode && (
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-3 py-1 rounded-xl tracking-wide shadow-2xs">
                    {activityCode}
                  </span>
                )}
                <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">
                  {activityName}
                </h1>
                {activity?.status === 'SUBMITTED' ? (
                  <span className="text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã hoàn thành
                  </span>
                ) : (
                  <span className="text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Đang đánh giá
                  </span>
                )}
              </div>

              {/* Detail Chips */}
              <div className="flex items-center gap-3 text-xs text-slate-600 font-bold flex-wrap pt-1">
                {activity?.catalog?.name && activity.catalog.name !== activityName && (
                  <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 px-3 py-1 rounded-xl">
                    <Tag className="w-3.5 h-3.5 text-cyan-600" />
                    {activity.catalog.name}
                  </span>
                )}
                <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 px-3 py-1 rounded-xl">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  {activity?.date ? new Date(activity.date).toLocaleDateString('vi-VN') : '--'}
                </span>
                <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 px-3 py-1 rounded-xl">
                  <Users className="w-3.5 h-3.5 text-teal-600" />
                  {students.length} học sinh tham gia
                </span>
                {students.length > 0 && students[0].class && (
                  <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 px-3 py-1 rounded-xl">
                    <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                    {students[0].class}
                  </span>
                )}
              </div>

              {/* Progress Bar Indicator */}
              <div className="pt-2 max-w-md space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-black text-slate-500">
                  <span>Tiến độ nhập kết quả:</span>
                  <span className="text-indigo-600 font-black">{gradedCount}/{students.length} HS ({progressPercent}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap self-end lg:self-center shrink-0">
              <button
                onClick={handleExportExcel}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                title="Xuất kết quả đánh giá ra file Excel"
              >
                <Download className="w-3.5 h-3.5" /> Xuất Excel
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2.5 bg-slate-100/90 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5" /> Hiệu chỉnh
              </button>
              <button
                onClick={() => { setEditConfig(config); setShowConfigModal(true); }}
                className="px-4 py-2.5 bg-slate-100/90 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5" /> Cấu hình Cột
              </button>
              <button
                onClick={handleSaveResults}
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-cyan-600 to-teal-500 hover:from-indigo-700 hover:to-teal-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all flex items-center gap-2 disabled:opacity-70 transform active:scale-95"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{saving ? 'Đang lưu...' : 'Lưu kết quả'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH & BULK TOOLBAR CONTAINER */}
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm học sinh theo tên, mã số, lớp..."
              className="w-full pl-10 pr-9 py-2.5 bg-white/90 border border-slate-200/90 rounded-2xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:text-slate-400"
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

          {/* BULK ACTION BAR (Floating Glass Pill) */}
          {selectedIds.size > 0 && (
            <div className="backdrop-blur-xl bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-teal-500/10 border border-indigo-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-xs">
                  <CheckCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-black text-indigo-800 text-xs">Đã chọn <span className="text-sm font-black text-indigo-900">{selectedIds.size}</span> học sinh</span>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-700 ml-2.5 underline transition-colors"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <select className="appearance-none bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs" value={bulkRole} onChange={e => setBulkRole(e.target.value)}>
                    <option value="">-- Gán Vai trò --</option>
                    {categories.role.map((o: any) => <option key={o.id} value={o.code}>{o.name}</option>)}
                  </select>
                  <SelectArrow />
                </div>

                <div className="relative">
                  <select className="appearance-none bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs" value={bulkLevel} onChange={e => setBulkLevel(e.target.value)}>
                    <option value="">-- Gán Mức đánh giá --</option>
                    {categories.result.map((o: any) => <option key={o.id} value={o.code}>{o.name}</option>)}
                  </select>
                  <SelectArrow />
                </div>

                <div className="relative">
                  <select className="appearance-none bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs" value={bulkAchievement} onChange={e => setBulkAchievement(e.target.value)}>
                    <option value="">-- Gán Thành tích --</option>
                    {categories.achievement.map((o: any) => <option key={o.id} value={o.code}>{o.name}</option>)}
                  </select>
                  <SelectArrow />
                </div>

                <button onClick={handleApplyBulk} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transform active:scale-95">
                  <CheckCheck className="w-4 h-4" /> Áp dụng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* EVALUATION TABLE (Glassmorphism Table) */}
        <div className="backdrop-blur-xl bg-white/85 rounded-3xl border border-white/90 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="text-xs font-bold text-slate-600">
              Danh sách: <span className="font-black text-slate-800">{filteredStudents.length}</span> học sinh
              {search && <span className="text-slate-400 ml-1.5">(lọc từ tổng số {students.length})</span>}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportExcel}
                className="text-xs font-black text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel</span>
              </button>
              <button onClick={toggleAll} className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors">
                {allSelected
                  ? <><CheckSquare className="w-4 h-4 text-indigo-600" /> Bỏ chọn tất cả</>
                  : <><Square className="w-4 h-4" /> Chọn tất cả ({filteredStudents.length} HS)</>
                }
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="pl-6 pr-2 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer accent-indigo-600"
                    />
                  </th>
                  <th className="px-3 py-4 w-10 text-slate-400">#</th>
                  <th className="px-4 py-4 min-w-[220px]">Học sinh</th>
                  {config.visibleStandardColumns.map(colId => (
                    <th key={colId} className="px-3 py-4 min-w-[160px]">
                      {standardColumnsMeta.find(m => m.id === colId)?.name}
                    </th>
                  ))}
                  {config.customColumns.map(col => (
                    <th key={col.id} className="px-3 py-4 min-w-[140px] text-cyan-700">
                      <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{col.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => {
                  const isSelected = selectedIds.has(student.id);
                  return (
                    <tr key={student.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/40' : idx % 2 === 0 ? 'bg-white hover:bg-slate-50/60' : 'bg-slate-50/30 hover:bg-slate-50/60'}`}>
                      <td className="pl-6 pr-2 py-3.5">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleStudent(student.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer accent-indigo-600" />
                      </td>
                      <td className="px-3 py-3.5 text-xs font-black text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black text-white shrink-0 shadow-2xs ${isSelected ? 'bg-gradient-to-r from-indigo-600 to-cyan-600' : 'bg-gradient-to-br from-slate-500 to-slate-600'}`}>
                            {(student.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-black text-slate-800 text-xs leading-tight">{student.name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 font-bold flex items-center gap-1.5 flex-wrap">
                              {student.code && <span className="text-indigo-600">{student.code}</span>}
                              {student.code && student.class && <span>•</span>}
                              {student.class && <span>{student.class}</span>}
                              {student.gender && <span className="text-slate-400">({student.gender === 'male' ? 'Nam' : student.gender === 'female' ? 'Nữ' : student.gender})</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {config.visibleStandardColumns.includes('roleId') && (
                        <td className="px-3 py-3.5">
                          <div className="relative">
                            <select value={student.roleId || ''} onChange={e => handleChange(student.id, 'roleId', e.target.value)}
                              className={getSelectClass(student.roleId)}>
                              <option value="">-- Chọn --</option>
                              {categories.role.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                            </select>
                            <SelectArrow />
                          </div>
                        </td>
                      )}

                      {config.visibleStandardColumns.includes('evalLevelId') && (
                        <td className="px-3 py-3.5">
                          <div className="relative">
                            <select value={student.evalLevelId || ''} onChange={e => handleChange(student.id, 'evalLevelId', e.target.value)}
                              className={getSelectClass(student.evalLevelId)}>
                              <option value="">-- Chọn --</option>
                              {categories.result.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                            </select>
                            <SelectArrow />
                          </div>
                        </td>
                      )}

                      {config.visibleStandardColumns.includes('achievementId') && (
                        <td className="px-3 py-3.5">
                          <div className="relative">
                            <select value={student.achievementId || ''} onChange={e => handleChange(student.id, 'achievementId', e.target.value)}
                              className={getSelectClass(student.achievementId)}>
                              <option value="">-- Chọn --</option>
                              {categories.achievement.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                            </select>
                            <SelectArrow />
                          </div>
                        </td>
                      )}

                      {config.visibleStandardColumns.includes('absenceReasonId') && (
                        <td className="px-3 py-3.5">
                          <input type="text" placeholder="Lý do..." value={student.absenceReasonId || ''} onChange={e => handleChange(student.id, 'absenceReasonId', e.target.value)}
                            className="w-full bg-white/90 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-3 py-2.5 transition-all outline-none placeholder:text-slate-400" />
                        </td>
                      )}

                      {config.visibleStandardColumns.includes('note') && (
                        <td className="px-3 py-3.5">
                          <input type="text" placeholder="Ghi chú..." value={student.note && !student.note.startsWith('{') ? student.note : ''}
                            onChange={e => handleChange(student.id, 'note', e.target.value)}
                            className="w-full bg-white/90 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 px-3 py-2.5 transition-all outline-none placeholder:text-slate-400" />
                        </td>
                      )}

                      {config.customColumns.map(col => (
                        <td key={col.id} className="px-3 py-3.5">
                          <input type={col.type === 'number' ? 'number' : 'text'} value={getCustomValue(student.note, col.id)} onChange={e => handleChange(student.id, col.id, e.target.value, true)}
                            className="w-full bg-cyan-50/50 border border-cyan-100 text-slate-700 text-xs font-bold rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 px-3 py-2.5 transition-all outline-none" />
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-16 text-center">
                      <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-bold text-xs">{search ? 'Không tìm thấy học sinh phù hợp' : 'Không có học sinh nào trong danh sách.'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {students.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500 font-bold">
              <span>Tổng số: <strong className="text-slate-800">{students.length}</strong> học sinh</span>
              {selectedIds.size > 0 && <span className="text-indigo-600 font-black">Đang chọn: {selectedIds.size} học sinh</span>}
            </div>
          )}
        </div>

      </div>

      {/* MODAL: CONFIG COLUMNS (Glassmorphism Modal) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
          <div className="backdrop-blur-xl bg-white/95 rounded-3xl w-full max-w-2xl border border-white/90 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <span>Cấu hình Cột hiển thị bảng</span>
              </h2>
              <button onClick={() => setShowConfigModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Cột tiêu chuẩn
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {standardColumnsMeta.map(col => (
                    <label key={col.id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/80 hover:border-indigo-300 cursor-pointer bg-white transition-all shadow-2xs">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 accent-indigo-600"
                        checked={editConfig.visibleStandardColumns.includes(col.id)}
                        onChange={e => setEditConfig({ ...editConfig, visibleStandardColumns: e.target.checked ? [...editConfig.visibleStandardColumns, col.id] : editConfig.visibleStandardColumns.filter(id => id !== col.id) })}
                      />
                      <span className="text-xs font-bold text-slate-700">{col.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-600" /> Cột tùy chỉnh thêm
                  </h3>
                  <button onClick={() => setEditConfig({ ...editConfig, customColumns: [...editConfig.customColumns, { id: `col_${Date.now()}`, name: 'Cột mới', type: 'text' }] })}
                    className="text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"><Plus className="w-3.5 h-3.5" /> Thêm cột</button>
                </div>
                <div className="space-y-2.5">
                  {editConfig.customColumns.map(col => (
                    <div key={col.id} className="flex items-center gap-2.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <input type="text" value={col.name} onChange={e => setEditConfig({ ...editConfig, customColumns: editConfig.customColumns.map(c => c.id === col.id ? { ...c, name: e.target.value } : c) })}
                        className="flex-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl p-2.5 outline-none" placeholder="Tên cột..." />
                      <select value={col.type} onChange={e => setEditConfig({ ...editConfig, customColumns: editConfig.customColumns.map(c => c.id === col.id ? { ...c, type: e.target.value } : c) })}
                        className="w-28 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl p-2.5 outline-none">
                        <option value="text">Văn bản</option>
                        <option value="number">Chữ số</option>
                      </select>
                      <button onClick={() => setEditConfig({ ...editConfig, customColumns: editConfig.customColumns.filter(c => c.id !== col.id) })} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {editConfig.customColumns.length === 0 && <p className="text-xs text-slate-400 italic py-2">Chưa tạo thêm cột tùy chỉnh nào.</p>}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2.5 bg-slate-50/50">
              <button onClick={() => setShowConfigModal(false)} className="px-4 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-xs transition-colors">Hủy</button>
              <button onClick={() => { setConfig(editConfig); setShowConfigModal(false); }} className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-black rounded-xl text-xs shadow-md shadow-indigo-500/20">Lưu cấu hình</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ACTIVITY (Glassmorphism Modal) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
          <div className="backdrop-blur-xl bg-white/95 rounded-3xl w-full max-w-md border border-white/90 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <span>Hiệu chỉnh Hoạt động</span>
              </h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700">Tên hoạt động</label>
                <input type="text" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-black rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 p-3.5 outline-none" placeholder="Tên hoạt động..." />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700">Ngày tổ chức</label>
                <input type="date" value={editData.date} onChange={e => setEditData({ ...editData, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 p-3.5 outline-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2.5 bg-slate-50/50">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-xs transition-colors">Hủy</button>
              <button onClick={handleUpdateActivity} disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-black rounded-xl text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-70">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
