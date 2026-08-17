"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Settings, Save, Search, CheckSquare,
  CheckCircle2, Plus, X, Hash, Edit3, Loader2,
  Square, Users, BookOpen, Calendar, Tag, ChevronDown,
  CheckCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

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
        
        // Check year mismatch
        const match = document.cookie.match(/(?:^|; )selectedAcademicYear=([^;]*)/);
        const currentYearId = match ? decodeURIComponent(match[1]) : localStorage.getItem("selectedAcademicYear");
        if (currentYearId && data.academicYearId && data.academicYearId !== currentYearId) {
          toast.error("Hoạt động này không thuộc năm học đang chọn. Đang chuyển hướng...");
          setTimeout(() => {
            router.push('/teacher/experiential-activities');
          }, 1500);
          return;
        }

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
    } catch { toast.error('Lỗi kết nối'); }
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
    } catch { toast.error('Lỗi kết nối'); }
    finally { setSaving(false); }
  };

  const SelectArrow = () => (
    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
  );

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30 flex justify-center items-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-[#36E08F] animate-spin mx-auto mb-3" />
        <p className="text-slate-500 font-medium text-sm">Đang tải dữ liệu...</p>
      </div>
    </div>
  );

  const getSelectClass = (val: string) => {
    const base = "w-full appearance-none text-xs font-bold rounded-xl focus:ring-2 focus:ring-[#36E08F]/20 focus:border-[#36E08F] pl-3 pr-8 py-2.5 transition-all outline-none border ";
    if (val) {
      return base + "bg-emerald-50/40 border-emerald-200/80 text-emerald-700";
    }
    return base + "bg-slate-50/30 border-slate-200 text-slate-500";
  };

  const gradedCount = students.filter(s => s.roleId || s.evalLevelId || s.achievementId).length;

  const activityName = activity?.name || activity?.catalog?.name || 'Hoạt động trải nghiệm';
  const activityCode = activity?.code || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/20 py-6 px-4 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-5">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-[#36E08F] via-[#20C997] to-[#00BFB3]" />
          <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <button
                onClick={() => router.push('/teacher/experiential-activities')}
                className="text-xs font-semibold text-slate-400 hover:text-[#36E08F] flex items-center gap-1 mb-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Trở lại danh sách
              </button>

              <div className="flex items-center gap-3 flex-wrap">
                {activityCode && (
                  <span className="text-xs font-black text-white bg-[#36E08F] px-2.5 py-1 rounded-lg tracking-wide">
                    {activityCode}
                  </span>
                )}
                <h1 className="text-xl font-black text-slate-800">{activityName}</h1>
                {activity?.status === 'SUBMITTED' && (
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã nhập kết quả
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 font-medium flex-wrap">
                {activity?.catalog?.name && activity.catalog.name !== activityName && (
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#36E08F]" />
                    {activity.catalog.name}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#36E08F]" />
                  {activity?.date ? new Date(activity.date).toLocaleDateString('vi-VN') : '--'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#36E08F]" />
                  {students.length} học sinh
                </span>
                <span className="flex items-center gap-1 bg-teal-50/80 text-[#36E08F] border border-teal-200/60 px-2 py-0.5 rounded-lg text-xs font-black">
                  Tiến độ: {gradedCount}/{students.length} học sinh đã nhập
                </span>
                {students.length > 0 && students[0].class && (
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#36E08F]" />
                    {students[0].class}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" /> Hiệu chỉnh
              </button>
              <button
                onClick={() => { setEditConfig(config); setShowConfigModal(true); }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5"
              >
                <Settings className="w-4 h-4" /> Cấu hình Cột
              </button>
              <button
                onClick={handleSaveResults}
                disabled={saving}
                className="px-5 py-2 bg-gradient-to-r from-[#36E08F] to-[#20C997] hover:shadow-lg hover:shadow-[#36E08F]/25 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Đang lưu...' : 'Lưu kết quả'}
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm học sinh theo tên, mã số, lớp..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#36E08F]/20 focus:border-[#36E08F] outline-none transition-all shadow-sm"
          />
        </div>

        {/* BULK TOOLBAR */}
        {selectedIds.size > 0 && (
          <div className="bg-gradient-to-r from-[#36E08F]/10 to-teal-50 border border-[#36E08F]/25 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#36E08F] rounded-lg flex items-center justify-center">
                <CheckCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[#36E08F] text-sm">Đã chọn <span className="text-base">{selectedIds.size}</span> học sinh</span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-slate-500 hover:text-red-500 ml-2 underline transition-colors"
              >
                Bỏ chọn
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select className="appearance-none bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 pl-3 pr-8 py-2 outline-none" value={bulkRole} onChange={e => setBulkRole(e.target.value)}>
                  <option value="">-- Vai trò --</option>
                  {categories.role.map((o: any) => <option key={o.id} value={o.code}>{o.name}</option>)}
                </select>
                <SelectArrow />
              </div>
              <div className="relative">
                <select className="appearance-none bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 pl-3 pr-8 py-2 outline-none" value={bulkLevel} onChange={e => setBulkLevel(e.target.value)}>
                  <option value="">-- Mức đánh giá --</option>
                  {categories.result.map((o: any) => <option key={o.id} value={o.code}>{o.name}</option>)}
                </select>
                <SelectArrow />
              </div>
              <div className="relative">
                <select className="appearance-none bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 pl-3 pr-8 py-2 outline-none" value={bulkAchievement} onChange={e => setBulkAchievement(e.target.value)}>
                  <option value="">-- Thành tích --</option>
                  {categories.achievement.map((o: any) => <option key={o.id} value={o.code}>{o.name}</option>)}
                </select>
                <SelectArrow />
              </div>
              <button onClick={handleApplyBulk} className="px-4 py-2 bg-[#36E08F] hover:bg-[#009085] text-white text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm">
                <CheckCheck className="w-4 h-4" /> Áp dụng
              </button>
            </div>
          </div>
        )}

        {/* TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="text-sm text-slate-600 font-medium">
              <span className="font-bold">{filteredStudents.length}</span> học sinh
              {search && <span className="text-slate-400 ml-1">(lọc từ {students.length})</span>}
            </div>
            <button onClick={toggleAll} className="text-xs font-semibold text-slate-500 hover:text-[#36E08F] flex items-center gap-1.5 transition-colors">
              {allSelected
                ? <><CheckSquare className="w-4 h-4 text-[#36E08F]" /> Bỏ chọn tất cả</>
                : <><Square className="w-4 h-4" /> Chọn tất cả {filteredStudents.length} HS</>
              }
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="pl-5 pr-2 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-slate-300 text-[#36E08F] cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3.5 w-10 text-slate-400">#</th>
                  <th className="px-3 py-3.5 min-w-[220px]">Học sinh</th>
                  {config.visibleStandardColumns.map(colId => (
                    <th key={colId} className="px-3 py-3.5 min-w-[160px]">
                      {standardColumnsMeta.find(m => m.id === colId)?.name}
                    </th>
                  ))}
                  {config.customColumns.map(col => (
                    <th key={col.id} className="px-3 py-3.5 min-w-[140px] text-[#36E08F]">
                      <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{col.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => {
                  const isSelected = selectedIds.has(student.id);
                  return (
                    <tr key={student.id} className={`border-b border-slate-100 transition-colors ${isSelected ? 'bg-teal-50/60' : idx % 2 === 0 ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/30 hover:bg-slate-50/70'}`}>
                      <td className="pl-5 pr-2 py-3">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleStudent(student.id)} className="w-4 h-4 rounded border-slate-300 text-[#36E08F] cursor-pointer" />
                      </td>
                      <td className="px-3 py-3 text-sm font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${isSelected ? 'bg-[#36E08F]' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                            {(student.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm leading-tight">{student.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1 flex-wrap">
                              {student.code && <span>{student.code}</span>}
                              {student.code && student.class && <span className="text-slate-300">•</span>}
                              {student.class && <span>{student.class}</span>}
                              {student.gender && <span className="text-slate-400">({student.gender === 'male' ? 'Nam' : student.gender === 'female' ? 'Nữ' : student.gender})</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {config.visibleStandardColumns.includes('roleId') && (
                        <td className="px-3 py-3">
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
                        <td className="px-3 py-3">
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
                        <td className="px-3 py-3">
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
                        <td className="px-3 py-3">
                          <input type="text" placeholder="Lý do..." value={student.absenceReasonId || ''} onChange={e => handleChange(student.id, 'absenceReasonId', e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-[#36E08F]/20 focus:border-[#36E08F] px-3 py-2 transition-all outline-none placeholder:text-slate-400" />
                        </td>
                      )}

                      {config.visibleStandardColumns.includes('note') && (
                        <td className="px-3 py-3">
                          <input type="text" placeholder="Ghi chú..." value={student.note && !student.note.startsWith('{') ? student.note : ''}
                            onChange={e => handleChange(student.id, 'note', e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-[#36E08F]/20 focus:border-[#36E08F] px-3 py-2 transition-all outline-none placeholder:text-slate-400" />
                        </td>
                      )}

                      {config.customColumns.map(col => (
                        <td key={col.id} className="px-3 py-3">
                          <input type={col.type === 'number' ? 'number' : 'text'} value={getCustomValue(student.note, col.id)} onChange={e => handleChange(student.id, col.id, e.target.value, true)}
                            className="w-full bg-teal-50/50 border border-teal-100 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-[#36E08F]/30 focus:border-[#36E08F] px-3 py-2 transition-all outline-none" />
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-16 text-center">
                      <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium text-sm">{search ? 'Không tìm thấy học sinh phù hợp' : 'Không có học sinh nào.'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {students.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Tổng: <strong className="text-slate-700">{students.length}</strong> học sinh</span>
              {selectedIds.size > 0 && <span className="text-[#36E08F] font-bold">Đang chọn: {selectedIds.size} học sinh</span>}
            </div>
          )}
        </div>

      </div>

      {/* MODAL: CONFIG */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-black text-slate-800">Cấu hình Form nhập liệu</h2>
              <button onClick={() => setShowConfigModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#36E08F]" /> Cột chuẩn</h3>
                <div className="grid grid-cols-2 gap-2">
                  {standardColumnsMeta.map(col => (
                    <label key={col.id} className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-[#36E08F]/40 cursor-pointer bg-white">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-[#36E08F]"
                        checked={editConfig.visibleStandardColumns.includes(col.id)}
                        onChange={e => setEditConfig({ ...editConfig, visibleStandardColumns: e.target.checked ? [...editConfig.visibleStandardColumns, col.id] : editConfig.visibleStandardColumns.filter(id => id !== col.id) })}
                      />
                      <span className="text-sm font-semibold text-slate-700">{col.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Plus className="w-4 h-4 text-[#36E08F]" /> Cột tùy chỉnh</h3>
                  <button onClick={() => setEditConfig({ ...editConfig, customColumns: [...editConfig.customColumns, { id: `col_${Date.now()}`, name: 'Cột mới', type: 'text' }] })}
                    className="text-xs font-bold text-[#36E08F] bg-[#36E08F]/10 hover:bg-[#36E08F]/20 px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus className="w-3 h-3" /> Thêm cột</button>
                </div>
                <div className="space-y-2">
                  {editConfig.customColumns.map(col => (
                    <div key={col.id} className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                      <input type="text" value={col.name} onChange={e => setEditConfig({ ...editConfig, customColumns: editConfig.customColumns.map(c => c.id === col.id ? { ...c, name: e.target.value } : c) })}
                        className="flex-1 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg p-2 outline-none" placeholder="Tên cột..." />
                      <select value={col.type} onChange={e => setEditConfig({ ...editConfig, customColumns: editConfig.customColumns.map(c => c.id === col.id ? { ...c, type: e.target.value } : c) })}
                        className="w-28 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg p-2 outline-none">
                        <option value="text">Văn bản</option>
                        <option value="number">Chữ số</option>
                      </select>
                      <button onClick={() => setEditConfig({ ...editConfig, customColumns: editConfig.customColumns.filter(c => c.id !== col.id) })} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {editConfig.customColumns.length === 0 && <p className="text-sm text-slate-400 italic">Chưa có cột tùy chỉnh nào.</p>}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowConfigModal(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm">Hủy</button>
              <button onClick={() => { setConfig(editConfig); setShowConfigModal(false); }} className="px-5 py-2 bg-[#36E08F] text-white font-bold rounded-xl text-sm shadow-sm">Lưu cấu hình</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-black text-slate-800">Hiệu chỉnh Hoạt động</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Tên hoạt động</label>
                <input type="text" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })}
                  className="w-full bg-slate-50 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#36E08F] p-3.5 outline-none" placeholder="Tên hoạt động..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Ngày tổ chức</label>
                <input type="date" value={editData.date} onChange={e => setEditData({ ...editData, date: e.target.value })}
                  className="w-full bg-slate-50 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#36E08F] p-3.5 outline-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm">Hủy</button>
              <button onClick={handleUpdateActivity} disabled={saving} className="px-5 py-2 bg-[#36E08F] text-white font-bold rounded-xl text-sm shadow-sm flex items-center gap-2 disabled:opacity-70">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
