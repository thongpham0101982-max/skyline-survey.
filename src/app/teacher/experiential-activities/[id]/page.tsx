"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
import { 
  ArrowLeft, Settings, Save, Search, CheckSquare,
  CheckCircle2, Plus, X, Hash, Edit3, Loader2,
  Square, Users, BookOpen, Calendar, Tag, ChevronDown,
  CheckCheck, Sparkles, Award, Filter, ShieldCheck, CheckCircle, 
  Download, Upload, FileSpreadsheet, Send, AlertTriangle,
  Info, Clock, Lock, Unlock, Check, Printer, FileText, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { 
  ATTENDANCE_OPTIONS, STUDENT_ROLES, EVAL_LEVELS, QUICK_REMARKS,
  STRAND_QUICK_REMARKS, ACTIVITY_STRANDS
} from '@/lib/experiential/constants';
import { 
  calculateStudentResult, getRatingBadgeProps, getRatingLabel 
} from '@/lib/experiential/formula';

export default function ActivityResultInput() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const basePath = pathname.startsWith("/admin") ? "/admin/experiential-activities" : "/teacher/experiential-activities";
  const params = useParams();
  const searchParams = useSearchParams();
  const { id } = params;
  const initialClassId = searchParams.get('classId') || '';

  const fileInputRef = useRef(null);

  // States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [filterAttendance, setFilterAttendance] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Activity Master Data
  const [activity, setActivity] = useState(null);
  const [students, setStudents] = useState([]);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCriterionId, setBulkCriterionId] = useState('ALL');
  const [bulkLevel, setBulkLevel] = useState(3);
  const [bulkRole, setBulkRole] = useState('');
  const [bulkAttendance, setBulkAttendance] = useState('');

  // Quick Remark Modal
  const [remarkStudentId, setRemarkStudentId] = useState(null);
  const [remarkTab, setRemarkTab] = useState<'STRAND' | 'GENERAL' | 'ALL'>('STRAND');

  // Certificate / Student Report Modal
  const [certificateStudent, setCertificateStudent] = useState<any>(null);

  // Pre-submission validation modal
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false);
  const [uncompletedStudents, setUncompletedStudents] = useState([]);

  // Load Activity & Students
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/experiential-activities/${id}`);
      if (!res.ok) throw new Error('Không thể tải hoạt động');
      const data = await res.json();
      setActivity(data);

      const assignedList = data.assignedClasses || [];
      const currentCId = selectedClassId || (assignedList[0]?.classId || '');
      setSelectedClassId(currentCId);

      const studentList = (data.students || []).map((st) => {
        const formulaRes = calculateStudentResult({
          attendance: st.attendance || 'PRESENT',
          evalMode: data.evalMode || 'CRITERIA',
          criteriaConfig: data.criteria || [],
          criteriaScores: st.criteriaScores || {},
          formulaType: data.formulaType || 'EQUAL_WEIGHT',
          thresholds: data.thresholds,
          mandatoryRules: data.mandatoryRules
        });

        return {
          ...st,
          calculatedPercent: formulaRes.percentage,
          finalResult: formulaRes.rating,
          isCompleted: formulaRes.isCompleted
        };
      });

      setStudents(studentList);
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải thông tin hoạt động');
      setLoading(false);
    }
  }, [id, selectedClassId]);

  useEffect(() => {
    if (id) loadData();
  }, [id, loadData]);

  // Update a student field and re-calculate results
  const updateStudent = (studentId, changes) => {
    if (!activity || activity.status === 'LOCKED') return;

    setStudents(prev => prev.map(st => {
      if (st.id !== studentId) return st;
      const updated = { ...st, ...changes };

      // If attendance changed to absent, clear scores or keep based on mode
      const isAbsent = updated.attendance === 'ABSENT_PERMITTED' || updated.attendance === 'ABSENT_UNPERMITTED' || updated.attendance === 'NOT_PARTICIPATED' || updated.attendance === 'EXEMPTED';

      const formulaRes = calculateStudentResult({
        attendance: updated.attendance,
        evalMode: activity.evalMode || 'CRITERIA',
        criteriaConfig: activity.criteria || [],
        criteriaScores: isAbsent ? {} : (updated.criteriaScores || {}),
        formulaType: activity.formulaType || 'EQUAL_WEIGHT',
        thresholds: activity.thresholds,
        mandatoryRules: activity.mandatoryRules
      });

      return {
        ...updated,
        criteriaScores: isAbsent ? {} : (updated.criteriaScores || {}),
        calculatedPercent: formulaRes.percentage,
        finalResult: formulaRes.rating,
        isCompleted: formulaRes.isCompleted
      };
    }));
  };

  // Set Criterion Score for student
  const handleSetScore = (studentId, criterionId, level) => {
    const st = students.find(s => s.id === studentId);
    if (!st) return;
    const currentScores = { ...(st.criteriaScores || {}) };
    if (currentScores[criterionId] === level) {
      delete currentScores[criterionId]; // toggle off
    } else {
      currentScores[criterionId] = level;
    }
    updateStudent(studentId, { criteriaScores: currentScores });
  };

  // Save changes to API
  const handleSave = async (isSubmittingFinal = false) => {
    if (!activity) return;
    setSaving(true);
    try {
      const payload = {
        classId: selectedClassId,
        isCompleted: isSubmittingFinal,
        students: students.filter(s => !selectedClassId || s.classId === selectedClassId)
      };

      const res = await fetch(`/api/experiential-activities/${id}/results`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setLastSavedTime(new Date().toLocaleTimeString('vi-VN'));
        if (isSubmittingFinal) {
          toast.success('đã nộp kết quả đánh giá thành công!');
          router.push(basePath);
        } else {
          toast.success('Đã lưu kết quả thành công');
        }
      } else {
        const err = await res.json();
        toast.error(err.error || 'Lỗi khi lưu kết quả');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  // Pre-submission validation
  const handleRequestSubmit = () => {
    const currentClassStudents = students.filter(s => !selectedClassId || s.classId === selectedClassId);
    const uncompleted = currentClassStudents.filter(s => {
      if (s.attendance === 'PRESENT') {
        const scores = s.criteriaScores || {};
        return (activity?.criteria || []).some(c => !scores[c.id]);
      }
      return false;
    });

    setUncompletedStudents(uncompleted);
    setShowConfirmSubmitModal(true);
  };

  // Bulk Evaluation Handler
  const handleApplyBulk = () => {
    if (selectedIds.size === 0) {
      toast.error('Vui lòng chọn ít nhất một học sinh');
      return;
    }

    setStudents(prev => prev.map(st => {
      if (!selectedIds.has(st.id)) return st;

      let newAttendance = bulkAttendance || st.attendance || 'PRESENT';
      let newRoles = bulkRole ? [bulkRole] : (st.roles || []);
      let newScores = { ...(st.criteriaScores || {}) };

      if (bulkCriterionId === 'ALL') {
        (activity?.criteria || []).forEach(c => {
          newScores[c.id] = bulkLevel;
        });
      } else if (bulkCriterionId) {
        newScores[bulkCriterionId] = bulkLevel;
      }

      const isAbsent = newAttendance === 'ABSENT_PERMITTED' || newAttendance === 'ABSENT_UNPERMITTED' || newAttendance === 'NOT_PARTICIPATED' || newAttendance === 'EXEMPTED';

      const formulaRes = calculateStudentResult({
        attendance: newAttendance,
        evalMode: activity.evalMode || 'CRITERIA',
        criteriaConfig: activity.criteria || [],
        criteriaScores: isAbsent ? {} : newScores,
        formulaType: activity.formulaType || 'EQUAL_WEIGHT',
        thresholds: activity.thresholds,
        mandatoryRules: activity.mandatoryRules
      });

      return {
        ...st,
        attendance: newAttendance,
        roles: newRoles,
        criteriaScores: isAbsent ? {} : newScores,
        calculatedPercent: formulaRes.percentage,
        finalResult: formulaRes.rating,
        isCompleted: formulaRes.isCompleted
      };
    }));

    setShowBulkModal(false);
    toast.success(`Đã chấm hàng loạt cho ${selectedIds.size} học sinh`);
  };

  // Toggle selection
  const toggleSelectStudent = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredStudents.map(s => s.id);
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    const dataToExport = filteredStudents.map((st, idx) => {
      const row = {
        'STT': idx + 1,
        'Mã HĐđược Sinh': st.studentCode || '',
        'Họ và Tên': st.fullName || '',
        'Lớp': st.className || '',
        'Điểm danh': ATTENDANCE_OPTIONS.find(a => a.id === st.attendance)?.name || 'Có mặt',
        'Vai trò': (st.roles || []).join(', ') || 'Thành viên'
      };

      (activity?.criteria || []).forEach(c => {
        const score = st.criteriaScores?.[c.id];
        const lvlName = EVAL_LEVELS.find(l => l.level === score)?.name || score || '';
        row[c.name] = lvlName;
      });

      row['Điểm %'] = st.calculatedPercent !== null ? `${st.calculatedPercent}%` : '';
      row['X?p Lo?i'] = getRatingLabel(st.finalResult);
      row['Nhận xét'] = [...(st.remarksQuick || []), st.remarksCustom].filter(Boolean).join('; ');

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ket_Qua_Danh_Gia');
    XLSX.writeFile(wb, `So_Danh_Gia_${activity?.code || 'HDTN'}_${selectedClassId || 'TatCa'}.xlsx`);
    toast.success('? xuất file Excel thành công!');
  };

  // Excel Import
  const handleImportExcel = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (!Array.isArray(rawData) || rawData.length === 0) {
          toast.error('File Excel không có dữ liệu');
          return;
        }

        let updatedCount = 0;
        setStudents(prev => prev.map(st => {
          const matched = rawData.find(row => 
            (row['Mã HĐđược Sinh'] && String(row['Mã HĐđược Sinh']).trim() === String(st.studentCode).trim()) ||
            (row['Họ và Tên'] && String(row['Họ và Tên']).trim().toLowerCase() === String(st.fullName).trim().toLowerCase())
          );

          if (!matched) return st;

          updatedCount++;
          const newScores = { ...(st.criteriaScores || {}) };
          (activity?.criteria || []).forEach(c => {
            if (matched[c.name] !== undefined) {
              const val = String(matched[c.name]).trim();
              const foundLvl = EVAL_LEVELS.find(l => l.name.toLowerCase() === val.toLowerCase() || String(l.level) === val);
              if (foundLvl) newScores[c.id] = foundLvl.level;
            }
          });

          const formulaRes = calculateStudentResult({
            attendance: st.attendance || 'PRESENT',
            evalMode: activity?.evalMode || 'CRITERIA',
            criteriaConfig: activity?.criteria || [],
            criteriaScores: newScores,
            formulaType: activity?.formulaType || 'EQUAL_WEIGHT',
            thresholds: activity?.thresholds,
            mandatoryRules: activity?.mandatoryRules
          });

          return {
            ...st,
            criteriaScores: newScores,
            calculatedPercent: formulaRes.percentage,
            finalResult: formulaRes.rating,
            isCompleted: formulaRes.isCompleted
          };
        }));

        toast.success(`? import Điểm thành công cho ${updatedCount} học sinh!`);
      } catch (err) {
        console.error(err);
        toast.error('Lỗi khi được file Excel');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Filtered Students
  const filteredStudents = students.filter(st => {
    const matchClass = !selectedClassId || st.classId === selectedClassId;
    const matchSearch = !search.trim() || 
      (st.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (st.studentCode || '').toLowerCase().includes(search.toLowerCase());
    const matchAttendance = filterAttendance === 'ALL' || st.attendance === filterAttendance;
    const matchStatus = filterStatus === 'ALL' || 
      (filterStatus === 'COMPLETED' ? st.isCompleted : !st.isCompleted);
    return matchClass && matchSearch && matchAttendance && matchStatus;
  });

  const isLocked = activity?.status === 'LOCKED';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <div className="w-10 h-10 border-4 border-[#00A99D]/20 border-t-[#00A99D] rounded-full animate-spin" />
        <p className="text-xs font-black text-slate-600">ang t?i s? theo dõi đánh giá hoạt động...</p>
      </div>
    );
  }

  const assignedClassesList = activity?.assignedClasses || [];
  const currentClassObj = assignedClassesList.find(c => c.classId === selectedClassId) || assignedClassesList[0] || {};

  const totalCurrentClass = filteredStudents.length;
  const completedCurrentClass = filteredStudents.filter(s => s.isCompleted).length;
  const percentClass = totalCurrentClass > 0 ? Math.round((completedCurrentClass / totalCurrentClass) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100/60 pb-16 font-sans">
      
      {/* STICKY TOP APP BAR */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push(basePath)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
              title="Quay lại danh sách"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#003B3A] bg-[#00A99D]/10 px-2.5 py-0.5 rounded-lg border border-[#00A99D]/20">
                  {activity?.code || 'HDTN'}
                </span>
                <span className="text-xs text-slate-400 font-bold hidden sm:inline"></span>
                <span className="text-xs font-bold text-slate-500 hidden sm:inline">{activity?.activityTypeName}</span>
              </div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 truncate">
                {activity?.name}
              </h1>
            </div>
          </div>

          {/* Autosave Indicator & Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {lastSavedTime && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <Check className="w-3 h-3" /> Đã lưu lúc {lastSavedTime}
              </span>
            )}

            {activity?.canManage && (
              <button
                onClick={() => router.push(`${basePath}/create?editId=${id}`)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-teal-50 hover:text-[#003B3A] border border-slate-200 text-slate-700 text-xs font-black rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
                title="Hiệu chỉnh thông tin, tiêu chí hoặc lớp gán"
              >
                <Settings className="w-3.5 h-3.5 text-[#00A99D]" />
                <span>Hiệu chỉnh kế hoạch</span>
              </button>
            )}

            <button
              onClick={() => handleSave(false)}
              disabled={saving || isLocked}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-slate-500" />}
              <span>Lưu tạm</span>
            </button>

            <button
              onClick={handleRequestSubmit}
              disabled={saving || isLocked}
              className="px-5 py-2.5 bg-[#00A99D] hover:bg-[#008F85] text-white text-xs font-black rounded-xl shadow-md shadow-[#00A99D]/20 transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp kết quả</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 pt-6 space-y-4">
        
        {/* BANNER WITH CLASS STATS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Chọn Lớp đánh giá</label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-[#003B3A] focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 outline-none"
              >
                {assignedClassesList.map(c => (
                  <option key={c.classId} value={c.classId}>
                    {c.className} ({c.campusCode} - {c.homeroomTeacherName || 'GVCN'})
                  </option>
                ))}
              </select>
            </div>

            <div className="border-l border-slate-200 pl-4 space-y-0.5 hidden sm:block">
              <span className="text-[11px] text-slate-400 font-bold block">GV phụ trách:</span>
              <strong className="text-xs text-slate-800 font-black">{currentClassObj.homeroomTeacherName || 'Chưa gán'}</strong>
            </div>

            <div className="border-l border-slate-200 pl-4 space-y-0.5 hidden sm:block">
              <span className="text-[11px] text-slate-400 font-bold block">Hạn hoàn thành:</span>
              <strong className="text-xs text-rose-600 font-black">{activity?.deadline || 'Theo kế hoạch'}</strong>
            </div>
          </div>

          {/* Progress Mini Bar */}
          <div className="flex items-center gap-4">
            <div className="w-48 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-black">
                <span className="text-slate-600">Tiến độ lớp:</span>
                <span className="text-[#00A99D]">{completedCurrentClass}/{totalCurrentClass} HS ({percentClass}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${percentClass === 100 ? 'bg-emerald-500' : 'bg-[#00A99D]'}`}
                  style={{ width: `${percentClass}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH, FILTERS, BATCH GRADING, EXCEL */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên, mã học sinh..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 outline-none"
              />
            </div>

            <select
              value={filterAttendance}
              onChange={e => setFilterAttendance(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Tất cả Điểm danh</option>
              {ATTENDANCE_OPTIONS.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="COMPLETED">Đã chấm xong</option>
              <option value="INCOMPLETE">Chưa chấm xong</option>
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Chấm hàng loạt ({selectedIds.size})</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportExcel}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-black rounded-xl border border-slate-200 flex items-center gap-1.5"
              title="Nhập điểm từ file Excel"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import Excel</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black rounded-xl border border-emerald-200 flex items-center gap-1.5"
              title="Xuất bảng đánh giá ra file Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* EVALUATION SPREADSHEET TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-20 bg-slate-50 shadow-xs border-b border-slate-200">
                <tr className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.has(s.id))}
                      onChange={handleSelectAllVisible}
                      className="rounded text-[#00A99D] focus:ring-0"
                    />
                  </th>
                  <th className="py-3.5 px-2 text-center w-10">#</th>
                  <th className="py-3.5 px-3 min-w-[90px]">Mã HS</th>
                  
                  {/* STICKY STUDENT NAME COLUMN */}
                  <th className="py-3.5 px-4 min-w-[190px] sticky left-0 z-20 bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                    Họ và Tên
                  </th>

                  <th className="py-3.5 px-3 min-w-[130px]">Điểm danh</th>
                  <th className="py-3.5 px-3 min-w-[130px]">Vai trò</th>

                  {/* CRITERIA HEADERS */}
                  {(activity?.criteria || []).map((crit, idx) => (
                    <th key={crit.id} className="py-3.5 px-3 min-w-[180px] text-center border-l border-slate-100 bg-slate-50/90" title={crit.description || crit.name}>
                      <div className="font-black text-slate-800 line-clamp-1">{crit.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        {activity?.formulaType === 'WEIGHTED' ? `${crit.weight}%` : `Tiêu chí ${idx + 1}`} {crit.isRequired ? '(Bắt buộc)' : ''}
                      </div>
                    </th>
                  ))}

                  {/* SUMMARY & REMARK */}
                  <th className="py-3.5 px-3 min-w-[100px] text-center border-l border-slate-200">Điểm %</th>
                  <th className="py-3.5 px-3 min-w-[130px] text-center">Xếp loại</th>
                  <th className="py-3.5 px-4 min-w-[220px]">Nhận xét & Phiếu cá nhân</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7 + (activity?.criteria?.length || 0)} className="py-12 text-center text-slate-400 font-bold">
                      Không tìm thấy học sinh nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, index) => {
                    const isSelected = selectedIds.has(st.id);
                    const isAbsent = st.attendance === 'ABSENT_PERMITTED' || st.attendance === 'ABSENT_UNPERMITTED' || st.attendance === 'NOT_PARTICIPATED' || st.attendance === 'EXEMPTED';
                    const ratingBadge = getRatingBadgeProps(st.finalResult);

                    return (
                      <tr key={st.id} className={`hover:bg-teal-50/20 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectStudent(st.id)}
                            className="rounded text-[#00A99D] focus:ring-0"
                          />
                        </td>
                        <td className="py-3 px-2 text-center text-slate-400 font-bold">{index + 1}</td>
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500 font-bold">
                          {st.studentCode}
                        </td>

                        {/* STICKY STUDENT NAME */}
                        <td className="py-3 px-4 whitespace-nowrap sticky left-0 z-10 bg-white group-hover:bg-teal-50/20 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                          <span className="font-black text-slate-900">{st.fullName}</span>
                        </td>

                        {/* ATTENDANCE */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <select
                            value={st.attendance || 'PRESENT'}
                            disabled={isLocked}
                            onChange={e => updateStudent(st.id, { attendance: e.target.value })}
                            className={`py-1 px-2 rounded-lg text-xs font-bold border outline-none ${
                              st.attendance === 'PRESENT'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {ATTENDANCE_OPTIONS.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                          </select>
                        </td>

                        {/* ROLES */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <select
                            value={st.roles?.[0] || 'THANH_VIEN'}
                            disabled={isLocked || isAbsent}
                            onChange={e => updateStudent(st.id, { roles: [e.target.value] })}
                            className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
                          >
                            {STUDENT_ROLES.map(role => (
                              <option key={role.id} value={role.name}>{role.name}</option>
                            ))}
                          </select>
                        </td>

                        {/* DYNAMIC CRITERIA 4-LEVEL BUTTONS */}
                        {(activity?.criteria || []).map(crit => {
                          const currentScore = st.criteriaScores?.[crit.id];

                          if (isAbsent) {
                            return (
                              <td key={crit.id} className="py-3 px-3 text-center border-l border-slate-100 bg-slate-50/50">
                                <span className="text-[11px] text-slate-400 italic">Vắng / Miễn</span>
                              </td>
                            );
                          }

                          return (
                            <td key={crit.id} className="py-3 px-2 text-center border-l border-slate-100">
                              <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                {[1, 2, 3, 4].map(lvl => {
                                  const isLevelActive = currentScore === lvl;
                                  const lvlInfo = EVAL_LEVELS.find(l => l.level === lvl);

                                  return (
                                    <button
                                      key={lvl}
                                      type="button"
                                      disabled={isLocked}
                                      onClick={() => handleSetScore(st.id, crit.id, lvl)}
                                      className={`w-6 h-6 rounded text-[11px] font-black transition-all flex items-center justify-center ${
                                        isLevelActive
                                          ? lvl === 4 ? 'bg-purple-600 text-white shadow-xs'
                                            : lvl === 3 ? 'bg-emerald-600 text-white shadow-xs'
                                            : lvl === 2 ? 'bg-sky-600 text-white shadow-xs'
                                            : 'bg-amber-500 text-white shadow-xs'
                                          : 'text-slate-500 hover:bg-white hover:text-slate-900'
                                      }`}
                                      title={`Mức ${lvl}  ${lvlInfo?.name}`}
                                    >
                                      {lvl}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}

                        {/* CALCULATED PERCENT */}
                        <td className="py-3 px-3 text-center border-l border-slate-200 whitespace-nowrap">
                          {st.calculatedPercent !== null ? (
                            <span className="font-black text-xs text-slate-900">{st.calculatedPercent}%</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* FINAL RATING BADGE */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${ratingBadge.containerCls}`}>
                            <span>{ratingBadge.label}</span>
                          </span>
                        </td>

                        {/* REMARK INPUT */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={st.remarksCustom || ''}
                              disabled={isLocked}
                              onChange={e => updateStudent(st.id, { remarksCustom: e.target.value })}
                              placeholder="Nhận xét học sinh..."
                              className="w-full py-1 px-2 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#00A99D] text-xs font-semibold outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setRemarkStudentId(st.id)}
                              className="p-1 rounded-md bg-slate-100 hover:bg-[#00A99D]/10 text-slate-500 hover:text-[#003B3A] shrink-0 transition-colors"
                              title="Chọn nhận xét nhanh theo mạch"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCertificateStudent(st)}
                              className="p-1 rounded-md bg-teal-50 hover:bg-[#00A99D] text-[#00A99D] hover:text-white border border-teal-200 shrink-0 transition-colors"
                              title="Xem & In phiếu ghi nhận kết quả cá nhân (A4)"
                            >
                              <Printer className="w-3.5 h-3.5" />
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

        {/* QUICK REMARK PRESET MODAL */}
        {remarkStudentId && (() => {
          const st = students.find(s => s.id === remarkStudentId);
          const actStrand = activity?.strand || 'BAN_THAN';
          const strandObj = ACTIVITY_STRANDS.find(s => s.id === actStrand);
          const currentStrandRemarks = STRAND_QUICK_REMARKS[actStrand] || [];

          return (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Ngân hàng Nhận xét Nhanh</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Học sinh: <span className="font-bold text-slate-800">{st?.fullName}</span> ({st?.studentCode})
                    </p>
                  </div>
                  <button onClick={() => setRemarkStudentId(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setRemarkTab('STRAND')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${
                      remarkTab === 'STRAND'
                        ? 'bg-white text-[#00A99D] shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Theo Mạch ({strandObj?.name || actStrand})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemarkTab('GENERAL')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${
                      remarkTab === 'GENERAL'
                        ? 'bg-white text-[#00A99D] shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Dùng chung ({QUICK_REMARKS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemarkTab('ALL')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${
                      remarkTab === 'ALL'
                        ? 'bg-white text-[#00A99D] shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả mạch
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {remarkTab === 'STRAND' && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        Gợi ý chuyên sâu theo mạch "{strandObj?.name}":
                      </div>
                      {currentStrandRemarks.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const current = st?.remarksCustom ? `${st.remarksCustom}; ${preset}` : preset;
                            updateStudent(remarkStudentId, { remarksCustom: current });
                            setRemarkStudentId(null);
                            toast.success('Đã thêm nhận xét');
                          }}
                          className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-[#00A99D]/10 hover:text-[#003B3A] text-xs font-bold text-slate-700 transition-colors border border-transparent hover:border-[#00A99D]/30"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  )}

                  {remarkTab === 'GENERAL' && (
                    <div className="space-y-1.5">
                      {QUICK_REMARKS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const current = st?.remarksCustom ? `${st.remarksCustom}; ${preset}` : preset;
                            updateStudent(remarkStudentId, { remarksCustom: current });
                            setRemarkStudentId(null);
                            toast.success('Đã thêm nhận xét');
                          }}
                          className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-[#00A99D]/10 hover:text-[#003B3A] text-xs font-bold text-slate-700 transition-colors border border-transparent hover:border-[#00A99D]/30"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  )}

                  {remarkTab === 'ALL' && (
                    <div className="space-y-3">
                      {Object.entries(STRAND_QUICK_REMARKS).map(([stKey, remarksList]) => {
                        const sObj = ACTIVITY_STRANDS.find(s => s.id === stKey);
                        return (
                          <div key={stKey} className="space-y-1">
                            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">
                              Mạch {sObj?.name || stKey}
                            </div>
                            {remarksList.map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  const current = st?.remarksCustom ? `${st.remarksCustom}; ${preset}` : preset;
                                  updateStudent(remarkStudentId, { remarksCustom: current });
                                  setRemarkStudentId(null);
                                  toast.success('Đã thêm nhận xét');
                                }}
                                className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-[#00A99D]/10 hover:text-[#003B3A] text-xs font-bold text-slate-700 transition-colors"
                              >
                                + {preset}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400">
                  <span>* Click vào nhận xét để tự động bổ sung vào học sinh</span>
                  <button
                    type="button"
                    onClick={() => setRemarkStudentId(null)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* STUDENT CERTIFICATE / REPORT CARD MODAL */}
        {certificateStudent && (() => {
          const st = certificateStudent;
          const currentClassObj = (activity?.assignedClasses || []).find(c => c.classId === selectedClassId) || {};
          const actStrand = activity?.strand || 'BAN_THAN';
          const strandObj = ACTIVITY_STRANDS.find(s => s.id === actStrand);
          const ratingBadge = getRatingBadgeProps(st.finalResult);
          const roleObj = STUDENT_ROLES.find(r => r.id === (st.roles?.[0] || 'THANH_VIEN'));
          const attendanceObj = ATTENDANCE_OPTIONS.find(a => a.id === (st.attendance || 'PRESENT'));

          return (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="relative w-full max-w-3xl my-8">
                {/* Modal Actions Bar (Not printed) */}
                <div className="flex items-center justify-between bg-slate-900 text-white px-6 py-3 rounded-t-2xl shadow-md print:hidden">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-black">Phiếu Ghi Nhận Kết Quả Hoạt Động Trải Nghiệm Cá Nhân</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#00A99D] hover:bg-[#008F85] text-white text-xs font-black rounded-xl shadow-xs transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      In Phiếu (A4)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCertificateStudent(null)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Printable Certificate Sheet (A4 Layout) */}
                <div
                  id="printable-certificate"
                  className="bg-white rounded-b-2xl print:rounded-none p-8 sm:p-10 border-4 border-double border-teal-800/80 shadow-2xl text-slate-800 space-y-6"
                >
                  {/* Certificate Header */}
                  <div className="flex items-start justify-between border-b-2 border-teal-700/60 pb-4">
                    <div>
                      <div className="text-[11px] font-black uppercase text-teal-800 tracking-wider">
                        HỆ THỐNG GIÁO DỤC SKY-LINE
                      </div>
                      <div className="text-xs font-black text-slate-800">
                        BAN CÔNG TÁC HỌC SINH - BAN CHUYÊN MÔN
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Cơ sở: {currentClassObj.campusName || activity?.campusName || 'Sky-Line Schools'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mã hồ sơ trải nghiệm</div>
                      <div className="text-xs font-mono font-black text-teal-800">
                        EXP-{st.studentCode}-{new Date().getFullYear()}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Ngày in: {new Date().toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                      Sky-Line Experiential Learning Assessment
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-teal-900 uppercase tracking-tight">
                      PHIẾU GHI NHẬN KẾT QUẢ TRẢI NGHIỆM
                    </h1>
                    <p className="text-xs font-bold text-slate-500">
                      Chương trình Hoạt động Trải nghiệm, Hướng nghiệp & Kỹ năng Sống
                    </p>
                  </div>

                  {/* Student & Activity Meta Grid */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-xs">
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black uppercase text-slate-400">Thông tin Học sinh</div>
                      <div>Họ và tên: <span className="font-black text-sm text-slate-900">{st.fullName}</span></div>
                      <div className="flex gap-4">
                        <span>Mã HS: <span className="font-mono font-bold text-slate-800">{st.studentCode}</span></span>
                        <span>Lớp: <span className="font-black text-teal-800">{currentClassObj.className || 'Sky-Line'}</span></span>
                      </div>
                      <div>Vai trò tham gia: <span className="font-bold text-slate-800">{roleObj?.name || 'Thành viên'}</span></div>
                      <div>Trạng thái: <span className="font-bold text-slate-800">{attendanceObj?.name || 'Có mặt'}</span></div>
                    </div>

                    <div className="space-y-1.5 border-l border-slate-200 pl-4">
                      <div className="text-[10px] font-black uppercase text-slate-400">Thông tin Hoạt động</div>
                      <div>Tên hoạt động: <span className="font-black text-slate-900">{activity?.name}</span></div>
                      <div>Mạch hoạt động: <span className="font-bold text-teal-800">{strandObj?.name || actStrand}</span></div>
                      <div>Thời gian: <span className="font-bold text-slate-800">{activity?.date} ({activity?.timeRange || 'Cả ngày'})</span></div>
                      <div>Địa điểm: <span className="font-bold text-slate-800">{activity?.location || 'Trường Sky-Line'}</span></div>
                    </div>
                  </div>

                  {/* Criteria Results Table */}
                  <div className="space-y-2">
                    <div className="text-xs font-black uppercase text-teal-900 tracking-wider">
                      Kết quả Đánh giá theo Tiêu chí Chuẩn:
                    </div>
                    <table className="w-full border-collapse text-xs border border-slate-200">
                      <thead>
                        <tr className="bg-teal-50/80 text-teal-900 font-black border-b border-slate-200 text-[11px]">
                          <th className="py-2 px-2 text-center w-8 border-r border-slate-200">#</th>
                          <th className="py-2 px-3 text-left border-r border-slate-200">Tiêu chí đánh giá</th>
                          <th className="py-2 px-2 text-center w-20 border-r border-slate-200">Trọng số</th>
                          <th className="py-2 px-2 text-center w-24 border-r border-slate-200">Mức đạt</th>
                          <th className="py-2 px-3 text-left">Đánh giá / Năng lực thể hiện</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {(activity?.criteria || []).map((crit, idx) => {
                          const level = st.criteriaScores?.[crit.id];
                          const lvlInfo = EVAL_LEVELS.find(l => l.level === level);
                          return (
                            <tr key={crit.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-2 text-center font-bold text-slate-400 border-r border-slate-200">{idx + 1}</td>
                              <td className="py-2 px-3 border-r border-slate-200">
                                <div className="font-bold text-slate-900">{crit.name}</div>
                                <div className="text-[10px] text-slate-500 line-clamp-1">{crit.description}</div>
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-slate-600 border-r border-slate-200">
                                {activity?.formulaType === 'WEIGHTED' ? `${crit.weight}%` : 'Đồng đều'}
                              </td>
                              <td className="py-2 px-2 text-center border-r border-slate-200">
                                {level ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    level === 4 ? 'bg-purple-100 text-purple-800' :
                                    level === 3 ? 'bg-emerald-100 text-emerald-800' :
                                    level === 2 ? 'bg-sky-100 text-sky-800' :
                                    'bg-amber-100 text-amber-800'
                                  }`}>
                                    Mức {level}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-[11px] text-slate-600">
                                {lvlInfo ? (
                                  <span className="font-semibold">{lvlInfo.name}</span>
                                ) : (
                                  <span className="italic text-slate-400">Chưa ghi nhận</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-teal-50/50 font-black border-t-2 border-teal-700/50">
                          <td colSpan={3} className="py-2.5 px-3 text-right text-teal-900 uppercase text-[11px]">
                            Tổng kết kết quả trải nghiệm:
                          </td>
                          <td className="py-2.5 px-2 text-center text-sm font-black text-teal-900">
                            {st.calculatedPercent !== null ? `${st.calculatedPercent}%` : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border ${ratingBadge.containerCls}`}>
                              <span>Xếp loại: {ratingBadge.label}</span>
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Teacher's Remarks Box */}
                  <div className="space-y-1.5 bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/80">
                    <div className="text-[11px] font-black uppercase text-amber-900 tracking-wider">
                      Lời Nhận xét & Đánh giá của Giáo viên Hướng dẫn / GVCN:
                    </div>
                    <p className="text-xs italic text-slate-800 font-medium leading-relaxed">
                      "{st.remarksCustom || 'Học sinh tích cực tham gia các nội dung hoạt động, thể hiện tốt tinh thần tập thể, kỷ luật và trách nhiệm cao.'}"
                    </p>
                  </div>

                  {/* Signature Section */}
                  <div className="grid grid-cols-2 pt-4 text-center text-xs">
                    <div className="space-y-12">
                      <div>
                        <div className="font-black text-slate-800 uppercase">GIÁO VIÊN HƯỚNG DẪN / GVCN</div>
                        <div className="text-[10px] text-slate-400 italic">(Ký và ghi rõ họ tên)</div>
                      </div>
                      <div className="font-bold text-slate-700">
                        {currentClassObj.homeroomTeacher?.teacherName || 'Giáo viên phụ trách'}
                      </div>
                    </div>

                    <div className="space-y-12">
                      <div>
                        <div className="text-[10px] text-slate-500 italic">Đà Nẵng, ngày ... tháng ... năm 2026</div>
                        <div className="font-black text-slate-800 uppercase">BAN CÔNG TÁC HỌC SINH / BGH</div>
                        <div className="text-[10px] text-slate-400 italic">(Ký duyệt và đóng dấu)</div>
                      </div>
                      <div className="font-bold text-slate-700">
                        Ban Giám hiệu Sky-Line
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* BATCH GRADING MODAL */}
        {showBulkModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Chấm điểm Hng LoĐạt</h3>
                  <p className="text-xs text-slate-500 font-medium">ááp dụng cho {selectedIds.size} học sinh ? ch?n</p>
                </div>
                <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-black text-slate-700 mb-1">Chọn tiêu chí ááp dụng:</label>
                  <select
                    value={bulkCriterionId}
                    onChange={e => setBulkCriterionId(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                  >
                    <option value="ALL">Tốt cđủ tiêu chí</option>
                    {(activity?.criteria || []).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">Chọn Mức điểm:</label>
                  <div className="grid grid-cols-4 gap-2">
                    {EVAL_LEVELS.map(lvl => (
                      <button
                        key={lvl.level}
                        type="button"
                        onClick={() => setBulkLevel(lvl.level)}
                        className={`p-3 rounded-xl border text-center font-black transition-all ${
                          bulkLevel === lvl.level
                            ? 'bg-[#003B3A] text-white border-[#003B3A] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div>Mức {lvl.level}</div>
                        <div className="text-[10px] opacity-80">{lvl.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulk}
                  className="px-5 py-2 bg-[#00A99D] hover:bg-[#008F85] text-white font-black rounded-xl shadow-md"
                >
                  ááp dụng ngay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT CONFIRMATION MODAL */}
        {showConfirmSubmitModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Xác nhận nộp kết quả đánh giá</h3>
                  <p className="text-xs text-slate-500 font-medium">Lớp: {currentClassObj.className}</p>
                </div>
              </div>

              {uncompletedStudents.length > 0 ? (
                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 space-y-2 text-xs">
                  <div className="font-black text-amber-800">
                    Cảnh báo: Còn {uncompletedStudents.length} học sinh có mặt nhưng chưa chấm đủ tiêu chí!
                  </div>
                  <div className="max-h-32 overflow-y-auto text-[11px] text-amber-900 font-medium space-y-0.5">
                    {uncompletedStudents.map(s => (
                      <div key={s.id}> {s.fullName} ({s.studentCode})</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-xs text-emerald-800 font-bold">
                  Tuyệt vời! Tất cả học sinh trong lớp đã được đánh giá đầy đủ.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmitModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Kiểm tra lỗi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmSubmitModal(false);
                    handleSave(true);
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-600/20"
                >
                  Xác nhận nộp ngay
                </button>
              </div>
            </div>
          </div>
        )}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-certificate,
            #printable-certificate * {
              visibility: visible !important;
            }
            #printable-certificate {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              min-height: 100vh !important;
              margin: 0 !important;
              padding: 24px !important;
              border: 3px double #0f766e !important;
              box-shadow: none !important;
              background: white !important;
            }
          }
        ` }} />
      </div>
    </div>
  );
}
