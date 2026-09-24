"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Compass, CheckCircle2, Clock, AlertCircle, Send, Users, 
  BookOpen, Building2, RefreshCw, ChevronRight, Layers, ArrowRight, X, Sparkles
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

    try {
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

      setCampusClasses(filtered.length > 0 ? filtered : classesList);
      // Default select all matching classes
      setSelectedClassIds(filtered.map((c: any) => c.id));
    } catch {
      toast.error('Lỗi khi tải danh sách lớp học');
    } finally {
      setLoadingClasses(false);
    }
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
          subjectTeacherId: '',
          subjectTeacherName: '',
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
    <div className="space-y-4">
      {/* Filter and stats banner */}
      <div className="bg-white/90 p-4 rounded-3xl border border-white shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Nhiệm vụ GV Tổ TLHN Tiếp nhận & Triển khai Cơ sở
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Các hoạt động do Ban ĐHCM & Tổ CTHS đẩy xuống cơ sở để gán lớp và phân công GVCN/GVBM
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
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  {isPending && (
                    <button
                      onClick={() => handleAccept(act)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Tiếp nhận hoạt động</span>
                    </button>
                  )}

                  {isAccepted && (
                    <button
                      onClick={() => handleOpenDeploy(act)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#00A19A] hover:bg-[#008983] text-white shadow-md shadow-[#00A19A]/20 transition-all"
                    >
                      <Users className="w-4 h-4" />
                      <span>Gán lớp & Triển khai</span>
                    </button>
                  )}

                  {isDeployed && (
                    <button
                      onClick={() => handleOpenDeploy(act)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
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
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00A19A]/10 text-[#00A19A] flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Gán Lớp & Triển Khai Hoạt Động
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Cơ sở: <strong className="text-slate-700">{deployingItem.campusName || deployingItem.campusCode}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeployingItem(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-800">{deployingItem.activityName}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Môn chủ trì: <strong className="text-indigo-700">{deployingItem.primarySubjectName || '—'}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Chọn các lớp tham gia của cơ sở ({selectedClassIds.length}/{campusClasses.length}):
                </label>
                {loadingClasses ? (
                  <div className="py-6 text-center text-xs text-slate-400">Đang tải danh sách lớp...</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[30vh] overflow-y-auto pr-1">
                    {campusClasses.map(c => {
                      const isChecked = selectedClassIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            if (isChecked) setSelectedClassIds(selectedClassIds.filter(id => id !== c.id));
                            else setSelectedClassIds([...selectedClassIds, c.id]);
                          }}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'border-[#00A19A] bg-[#00A19A]/5 font-bold text-[#003B3A]'
                              : 'border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <input type="checkbox" checked={isChecked} onChange={() => {}} className="rounded text-[#00A19A]" />
                          <div>
                            <div>{c.className}</div>
                            {c.homeroomTeacher?.teacherName && (
                              <div className="text-[10px] text-slate-400 font-normal">GVCN: {c.homeroomTeacher.teacherName}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setDeployingItem(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDeploy}
                disabled={deploying || selectedClassIds.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#00A19A] hover:bg-[#008983] text-white shadow-md shadow-[#00A19A]/20 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{deploying ? 'Đang triển khai...' : `Xác nhận triển khai cho ${selectedClassIds.length} lớp`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
