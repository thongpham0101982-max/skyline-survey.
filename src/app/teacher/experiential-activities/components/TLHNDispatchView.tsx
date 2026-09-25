"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Compass, CheckCircle2, Clock, AlertCircle, Send, Users, 
  BookOpen, Building2, RefreshCw, ChevronRight, Layers, ArrowRight, X, Sparkles,
  UserCheck, Mail, CheckSquare, Square, Award
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TLHNDispatchViewProps {
  selectedYearId: string;
  onRefreshParent?: () => void;
}

export function TLHNDispatchView({ selectedYearId, onRefreshParent }: TLHNDispatchViewProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CHUA_TIEP_NHAN' | 'DA_TIEP_NHAN' | 'DA_TRIEN_KHAI'>('ALL');
  
  // Deploy modal state
  const [deployingItem, setDeployingItem] = useState<any>(null);
  const [campusClasses, setCampusClasses] = useState<any[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [deploying, setDeploying] = useState(false);

  // Departments & Teachers for assignment
  const [departments, setDepartments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classAssignments, setClassAssignments] = useState<Record<string, {
    departmentId: string;
    departmentName: string;
    subjectTeacherId: string;
    subjectTeacherName: string;
    subjectTeacherEmail: string;
  }>>({});

  // Batch assign controls
  const [batchDeptId, setBatchDeptId] = useState('');
  const [batchTeacherId, setBatchTeacherId] = useState('');

  const loadDispatched = useCallback(() => {
    setLoading(true);
    let url = `/api/experiential-activities/campus-dispatch?academicYearId=${selectedYearId}`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setActivities(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setActivities([]);
        setLoading(false);
      });
  }, [selectedYearId]);

  useEffect(() => {
    loadDispatched();
  }, [loadDispatched]);

  const handleAccept = async (act: any) => {
    try {
      const res = await fetch('/api/experiential-activities/campus-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACCEPT',
          catalogId: act.catalogId,
          campusId: act.campusId
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi tiếp nhận');
      }

      toast.success(`Đã tiếp nhận hoạt động "${act.activityName}" thành công!`);
      loadDispatched();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    }
  };

  const handleOpenDeploy = async (act: any) => {
    setDeployingItem(act);
    setLoadingClasses(true);
    setSelectedClassIds([]);
    setBatchDeptId('');
    setBatchTeacherId('');

    try {
      // 1. Fetch classes
      const res = await fetch(`/api/classes?academicYearId=${selectedYearId}`);
      const data = await res.json();
      const classesList = Array.isArray(data) ? data : (data.classes || []);

      // Filter classes by campus and matching grades
      const filtered = classesList.filter((c: any) => {
        const matchCampus = !act.campusId || c.campusId === act.campusId || c.campusCode === act.campusCode;
        if (!matchCampus) return false;

        if (act.grades && act.grades.length > 0) {
          const cGrade = String(c.grade || '').trim();
          const hasMatch = act.grades.some((g: string) => String(g).trim() === cGrade || cGrade.includes(String(g).trim()));
          return hasMatch;
        }
        return true;
      });

      const targetClasses = filtered.length > 0 ? filtered : classesList;
      setCampusClasses(targetClasses);

      // Default select all matching classes
      setSelectedClassIds(targetClasses.map((c: any) => c.id));

      // 2. Fetch departments
      try {
        const dRes = await fetch('/api/departments');
        const dData = await dRes.json();
        setDepartments(Array.isArray(dData.departments) ? dData.departments : []);
      } catch {}

      // 3. Fetch teachers
      try {
        const tRes = await fetch('/api/admin/experiential-activities/catalogs/cths-teachers');
        const tData = await tRes.json();
        if (Array.isArray(tData)) {
          setTeachers(tData);
        }
      } catch {}

      // 4. Prepopulate class assignments if already assigned before
      const initialAssignments: Record<string, any> = {};
      if (Array.isArray(act.assignedClasses)) {
        act.assignedClasses.forEach((ac: any) => {
          if (ac.classId) {
            initialAssignments[ac.classId] = {
              departmentId: ac.departmentId || '',
              departmentName: ac.departmentName || '',
              subjectTeacherId: ac.subjectTeacherId || '',
              subjectTeacherName: ac.subjectTeacherName || '',
              subjectTeacherEmail: ac.subjectTeacherEmail || ''
            };
          }
        });
      }
      setClassAssignments(initialAssignments);
    } catch {
      toast.error('Lỗi khi tải danh sách lớp học');
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleApplyBatch = () => {
    if (!batchDeptId && !batchTeacherId) {
      toast.error('Vui lòng chọn Tổ chuyên môn hoặc GVBM phối hợp để áp dụng');
      return;
    }
    const deptObj = departments.find(d => d.id === batchDeptId);
    const teacherObj = teachers.find(t => t.id === batchTeacherId);

    const updated = { ...classAssignments };
    selectedClassIds.forEach(cId => {
      updated[cId] = {
        ...(updated[cId] || {}),
        departmentId: batchDeptId ? batchDeptId : (updated[cId]?.departmentId || ''),
        departmentName: deptObj ? deptObj.name : (updated[cId]?.departmentName || ''),
        subjectTeacherId: batchTeacherId ? batchTeacherId : (updated[cId]?.subjectTeacherId || ''),
        subjectTeacherName: teacherObj ? teacherObj.teacherName : (updated[cId]?.subjectTeacherName || ''),
        subjectTeacherEmail: teacherObj ? teacherObj.email : (updated[cId]?.subjectTeacherEmail || '')
      };
    });
    setClassAssignments(updated);
    toast.success(`Đã áp dụng thông tin cho ${selectedClassIds.length} lớp đã chọn`);
  };

  const handleUpdateSingleClass = (classId: string, field: string, value: any) => {
    setClassAssignments(prev => {
      const current = prev[classId] || {
        departmentId: '',
        departmentName: '',
        subjectTeacherId: '',
        subjectTeacherName: '',
        subjectTeacherEmail: ''
      };

      if (field === 'departmentId') {
        const dept = departments.find(d => d.id === value);
        return {
          ...prev,
          [classId]: {
            ...current,
            departmentId: value,
            departmentName: dept ? dept.name : ''
          }
        };
      }

      if (field === 'subjectTeacherId') {
        const t = teachers.find(item => item.id === value);
        return {
          ...prev,
          [classId]: {
            ...current,
            subjectTeacherId: value,
            subjectTeacherName: t ? t.teacherName : '',
            subjectTeacherEmail: t ? t.email : ''
          }
        };
      }

      return prev;
    });
  };

  const handleConfirmDeploy = async () => {
    if (selectedClassIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 lớp học để triển khai hoạt động');
      return;
    }

    setDeploying(true);
    try {
      const assignedClasses = selectedClassIds.map(classId => {
        const clsObj = campusClasses.find(c => c.id === classId);
        const assign = classAssignments[classId] || {};
        return {
          classId,
          className: clsObj?.className || classId,
          campusId: clsObj?.campusId || deployingItem.campusId,
          campusCode: clsObj?.campus?.campusCode || clsObj?.campusCode || deployingItem.campusCode,
          campusName: clsObj?.campus?.campusName || clsObj?.campusName || deployingItem.campusName,
          grade: clsObj?.grade || '',
          level: clsObj?.level || deployingItem.educationLevel,
          homeroomTeacherId: clsObj?.homeroomTeacherId || '',
          homeroomTeacherName: clsObj?.homeroomTeacher?.teacherName || clsObj?.homeroomTeacherName || '',
          homeroomTeacherEmail: clsObj?.homeroomTeacher?.email || clsObj?.homeroomTeacher?.user?.email || '',
          departmentId: assign.departmentId || '',
          departmentName: assign.departmentName || '',
          subjectTeacherId: assign.subjectTeacherId || '',
          subjectTeacherName: assign.subjectTeacherName || '',
          subjectTeacherEmail: assign.subjectTeacherEmail || '',
          subjectName: deployingItem.primarySubjectName || '',
          totalStudents: clsObj?._count?.students || clsObj?.studentCount || 30,
          evaluatedStudents: 0
        };
      });

      const res = await fetch('/api/experiential-activities/campus-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DEPLOY',
          catalogId: deployingItem.catalogId,
          campusId: deployingItem.campusId,
          assignedClasses
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi triển khai');
      }

      toast.success(`Đã triển khai hoạt động xuống ${assignedClasses.length} lớp và tự động gửi email đến GVCN & GVBM!`);
      setDeployingItem(null);
      loadDispatched();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    } finally {
      setDeploying(false);
    }
  };

  const filtered = activities.filter(a => {
    if (statusFilter === 'ALL') return true;
    return a.tlhnStatus === statusFilter;
  });

  return (
    <div className="space-y-4 font-sans">
      {/* Filter and stats banner */}
      <div className="bg-white/90 p-4 rounded-3xl border border-white shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#00A19A] flex items-center justify-center font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Nhiệm Vụ GV Tổ TLHN Tiếp Nhận & Triển Khai Cơ Sở
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Tiếp nhận kế hoạch từ Tổ CTHS, gán cho GVCN các lớp kèm Tổ chuyên môn & GVBM phối hợp
            </p>
          </div>
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({activities.length})
          </button>
          <button
            onClick={() => setStatusFilter('CHUA_TIEP_NHAN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'CHUA_TIEP_NHAN' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chưa nhận ({activities.filter(a => a.tlhnStatus === 'CHUA_TIEP_NHAN').length})
          </button>
          <button
            onClick={() => setStatusFilter('DA_TIEP_NHAN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'DA_TIEP_NHAN' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đã nhận ({activities.filter(a => a.tlhnStatus === 'DA_TIEP_NHAN').length})
          </button>
          <button
            onClick={() => setStatusFilter('DA_TRIEN_KHAI')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'DA_TRIEN_KHAI' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đã triển khai ({activities.filter(a => a.tlhnStatus === 'DA_TRIEN_KHAI').length})
          </button>
        </div>
      </div>

      {/* Activities Grid */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00A19A]" />
          Đang tải danh sách hoạt động phân bổ về cơ sở...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
          <Compass className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          Không có hoạt động nào trong mục này
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(act => {
            const isDeployed = act.tlhnStatus === 'DA_TRIEN_KHAI';
            const isAccepted = act.tlhnStatus === 'DA_TIEP_NHAN';
            const isPending = act.tlhnStatus === 'CHUA_TIEP_NHAN';

            return (
              <div
                key={act.catalogId + '-' + act.campusId}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Status & Campus badge */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      <Building2 className="w-3 h-3 text-[#00A19A]" />
                      {act.campusName || act.campusCode}
                    </span>

                    {isDeployed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Đã triển khai ({act.totalClassesCount} lớp)
                      </span>
                    ) : isAccepted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" /> Đã tiếp nhận
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3 h-3" /> Chưa tiếp nhận
                      </span>
                    )}
                  </div>

                  {/* Title and Theme */}
                  <div>
                    <h4 className="text-sm font-black text-slate-800 line-clamp-1">{act.activityName}</h4>
                    <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                      Chủ đề: <strong className="text-slate-700">{act.themeName || '—'}</strong>
                    </p>
                  </div>

                  {/* Details row */}
                  <div className="text-xs text-slate-600 space-y-1 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Khối lớp:</span>
                      <span className="font-bold text-slate-800">{Array.isArray(act.grades) ? act.grades.join(', ') : act.grades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Môn chủ trì:</span>
                      <span className="font-bold text-indigo-700">{act.primarySubjectName || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Thời gian:</span>
                      <span className="font-semibold text-slate-700">{act.timeFrame || `HK${act.semester}`}</span>
                    </div>
                    {act.expectedLocation && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Địa điểm:</span>
                        <span className="font-semibold text-slate-700">{act.expectedLocation}</span>
                      </div>
                    )}
                    {act.deliverables && (
                      <div className="flex justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400">Sản phẩm:</span>
                        <span className="font-bold text-emerald-700 truncate max-w-[200px]">{act.deliverables}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  {isPending && (
                    <button
                      onClick={() => handleAccept(act)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Tiếp nhận hoạt động</span>
                    </button>
                  )}

                  {isAccepted && (
                    <button
                      onClick={() => handleOpenDeploy(act)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#00A19A] hover:bg-[#008983] text-white shadow-md shadow-[#00A19A]/20 transition-all cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      <span>Gán lớp & Triển khai</span>
                    </button>
                  )}

                  {isDeployed && (
                    <button
                      onClick={() => handleOpenDeploy(act)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <span>Cập nhật lớp ({act.totalClassesCount} lớp)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deploy to classes modal */}
      {deployingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50/80 via-emerald-50/60 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00A19A]/15 text-[#00A19A] flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Triển Khai Hoạt Động & Gán Lớp Cho GVCN, TCM, GVBM
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Cơ sở: <strong className="text-[#00A19A]">{deployingItem.campusName || deployingItem.campusCode}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeployingItem(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {/* Activity Info Banner */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-800">{deployingItem.activityName}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Môn chủ trì: <strong className="text-indigo-700">{deployingItem.primarySubjectName || '—'}</strong>
                    {deployingItem.coopSubjectNames && (
                      <span> • Môn phối hợp: <strong className="text-slate-700">{deployingItem.coopSubjectNames}</strong></span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-medium bg-white px-3 py-1 rounded-xl border border-slate-200">
                  Thời gian: <strong className="text-slate-800">{deployingItem.timeFrame || `HK${deployingItem.semester}`}</strong>
                </div>
              </div>

              {/* Batch Assignment Controls Bar */}
              <div className="bg-teal-50/60 p-3.5 rounded-2xl border border-teal-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#00A19A]" />
                    Áp dụng nhanh cho các lớp đã chọn ({selectedClassIds.length} lớp):
                  </span>
                  <div className="text-[11px] text-teal-800 font-medium">
                    (Có thể điều chỉnh riêng từng lớp bên dưới)
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tổ chuyên môn (TCM) phối hợp:
                    </label>
                    <select
                      value={batchDeptId}
                      onChange={e => setBatchDeptId(e.target.value)}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-teal-200 bg-white focus:outline-hidden focus:border-[#00A19A]"
                    >
                      <option value="">-- Chọn Tổ Chuyên Môn --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      GVBM phối hợp đánh giá:
                    </label>
                    <select
                      value={batchTeacherId}
                      onChange={e => setBatchTeacherId(e.target.value)}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-teal-200 bg-white focus:outline-hidden focus:border-[#00A19A]"
                    >
                      <option value="">-- Chọn GVBM nếu có --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.teacherName} ({t.teacherCode}) {t.departmentName ? `• ${t.departmentName}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleApplyBatch}
                      className="w-full px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#00A19A] hover:bg-[#008983] shadow-xs transition-all cursor-pointer"
                    >
                      Áp dụng cho {selectedClassIds.length} lớp
                    </button>
                  </div>
                </div>
              </div>

              {/* Class Selection & Detailed Assignment List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Danh sách các lớp tham gia ({selectedClassIds.length}/{campusClasses.length} lớp):
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedClassIds(campusClasses.map(c => c.id))}
                      className="text-[11px] font-bold text-[#00A19A] hover:underline cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedClassIds([])}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                </div>

                {loadingClasses ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Đang tải danh sách lớp học...
                  </div>
                ) : campusClasses.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Không tìm thấy lớp học nào thuộc khối này tại cơ sở.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
                    {campusClasses.map(c => {
                      const isChecked = selectedClassIds.includes(c.id);
                      const assign = classAssignments[c.id] || {
                        departmentId: '',
                        departmentName: '',
                        subjectTeacherId: '',
                        subjectTeacherName: '',
                        subjectTeacherEmail: ''
                      };

                      return (
                        <div
                          key={c.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isChecked
                              ? 'border-[#00A19A] bg-teal-50/40 ring-1 ring-[#00A19A]/20'
                              : 'border-slate-200 bg-white opacity-60'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Class checkbox & basic info */}
                            <div 
                              onClick={() => {
                                if (isChecked) setSelectedClassIds(selectedClassIds.filter(id => id !== c.id));
                                else setSelectedClassIds([...selectedClassIds, c.id]);
                              }}
                              className="flex items-center gap-2.5 cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 rounded text-[#00A19A] focus:ring-[#00A19A] cursor-pointer"
                              />
                              <div>
                                <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                                  <span>Lớp {c.className}</span>
                                  {c.grade && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                      Khối {c.grade}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-teal-800 font-semibold mt-0.5 flex items-center gap-1">
                                  <UserCheck className="w-3 h-3 text-[#00A19A]" />
                                  <span>GVCN: {c.homeroomTeacher?.teacherName || c.homeroomTeacherName || 'Chưa phân công GVCN'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Select TCM & GVBM for this class */}
                            {isChecked && (
                              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                                <div className="min-w-[150px]">
                                  <select
                                    value={assign.departmentId}
                                    onChange={e => handleUpdateSingleClass(c.id, 'departmentId', e.target.value)}
                                    className="w-full text-xs font-semibold px-2 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#00A19A]"
                                  >
                                    <option value="">-- Tổ Chuyên Môn --</option>
                                    {departments.map(d => (
                                      <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="min-w-[170px]">
                                  <select
                                    value={assign.subjectTeacherId}
                                    onChange={e => handleUpdateSingleClass(c.id, 'subjectTeacherId', e.target.value)}
                                    className="w-full text-xs font-semibold px-2 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#00A19A]"
                                  >
                                    <option value="">-- GVBM phối hợp --</option>
                                    {teachers.map(t => (
                                      <option key={t.id} value={t.id}>
                                        {t.teacherName} ({t.teacherCode})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Email Notification Notice */}
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Thông báo tự động:</strong> Khi bấm xác nhận, hệ thống sẽ tự động gửi email thông báo nhiệm vụ đánh giá đến <strong>GVCN các lớp</strong> và <strong>GVBM phối hợp</strong>. GVCN/GVBM đăng nhập cổng Giáo viên sẽ thấy ngay lớp được phân công và nhập kết quả đánh giá theo đúng thiết lập tiêu chí.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
              <div className="text-xs text-slate-500">
                Đã chọn <strong className="text-[#00A19A] font-bold">{selectedClassIds.length}</strong> lớp tham gia
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeployingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmDeploy}
                  disabled={deploying || selectedClassIds.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 text-white shadow-md shadow-[#00A19A]/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{deploying ? 'Đang triển khai...' : `Xác nhận triển khai cho ${selectedClassIds.length} lớp`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
