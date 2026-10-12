"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Send, Building2, CheckCircle2, Clock, AlertCircle, Sparkles, 
  Mail, Users, Check, GraduationCap, ChevronDown, ChevronUp, Eye, 
  CheckSquare, Square, Info, School, BookOpen, MapPin, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CampusItem {
  id: string;
  campusCode: string;
  campusName: string;
}

interface TLHNTeacherItem {
  id: string;
  teacherCode: string;
  teacherName: string;
  email: string;
  campusId: string;
  campusCode?: string;
  isTLHN?: boolean;
}

interface ClassItem {
  id: string;
  className: string;
  grade: number;
  level: string;
  campusId: string;
  campus?: {
    id: string;
    campusCode: string;
    campusName: string;
  };
  homeroomTeacher?: {
    id: string;
    teacherName: string;
    email: string;
  };
}

interface CatalogAllocateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllocated: () => void;
  catalogItem: any;
}

export function CatalogAllocateModal({
  isOpen,
  onClose,
  onAllocated,
  catalogItem
}: CatalogAllocateModalProps) {
  const [campuses, setCampuses] = useState<CampusItem[]>([]);
  const [tlhnTeachers, setTlhnTeachers] = useState<TLHNTeacherItem[]>([]);
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  const [selectedCampusIds, setSelectedCampusIds] = useState<string[]>([]);
  const [campusTeacherAssign, setCampusTeacherAssign] = useState<Record<string, string>>({}); // campusId -> teacherId
  const [campusSelectedGrades, setCampusSelectedGrades] = useState<Record<string, number[]>>({}); // campusId -> number[]
  const [campusSelectedClassIds, setCampusSelectedClassIds] = useState<Record<string, string[]>>({}); // campusId -> classId[]

  const [sendEmailNotification, setSendEmailNotification] = useState<boolean>(true);
  const [showEmailPreview, setShowEmailPreview] = useState<boolean>(true);
  const [allocating, setAllocating] = useState(false);

  // Normalize target grades from catalogItem
  const catalogTargetGrades = useMemo<number[]>(() => {
    if (!catalogItem?.meta?.grades) return [];
    const g = catalogItem.meta.grades;
    if (Array.isArray(g)) {
      return g.map((item: any) => parseInt(String(item), 10)).filter((n: number) => !isNaN(n));
    }
    if (typeof g === 'string') {
      return g.split(',').map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n));
    }
    if (typeof g === 'number') return [g];
    return [];
  }, [catalogItem]);

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      setLoadingData(true);
      Promise.all([
        fetch('/api/campuses').then(r => r.json()).catch(() => []),
        fetch('/api/admin/experiential-activities/catalogs/cths-teachers').then(r => r.json()).catch(() => []),
        fetch('/api/classes').then(r => r.json()).catch(() => [])
      ]).then(([campusData, teacherData, classData]) => {
        if (Array.isArray(campusData)) setCampuses(campusData);
        
        if (Array.isArray(teacherData)) {
          const tlhnList = teacherData.filter((t: any) => 
            t.departmentName?.includes('TLHN') || 
            t.position?.includes('TLHN') || 
            t.positions?.includes('TLHN') ||
            t.departmentName?.includes('Tâm lý') ||
            t.isCTHS
          );
          setTlhnTeachers(tlhnList.length > 0 ? tlhnList : teacherData);
        }

        if (Array.isArray(classData)) {
          setAllClasses(classData);
        }
      }).finally(() => {
        setLoadingData(false);
      });
    }
  }, [isOpen]);

  // Initialize form state when catalogItem opens
  useEffect(() => {
    if (catalogItem && isOpen) {
      const existingAllocated = catalogItem.meta?.allocatedCampuses || [];
      const campusIds = existingAllocated.map((a: any) => a.campusId);
      setSelectedCampusIds(campusIds);

      const initialTeachers: Record<string, string> = {};
      const initialGrades: Record<string, number[]> = {};
      const initialClasses: Record<string, string[]> = {};

      existingAllocated.forEach((a: any) => {
        if (a.campusId) {
          if (a.tlhnTeacherId) initialTeachers[a.campusId] = a.tlhnTeacherId;
          
          if (Array.isArray(a.selectedGrades) && a.selectedGrades.length > 0) {
            initialGrades[a.campusId] = a.selectedGrades.map((g: any) => parseInt(String(g), 10));
          } else if (catalogTargetGrades.length > 0) {
            initialGrades[a.campusId] = catalogTargetGrades;
          }

          if (Array.isArray(a.assignedClasses) && a.assignedClasses.length > 0) {
            initialClasses[a.campusId] = a.assignedClasses.map((c: any) => c.classId || c.id);
          } else if (Array.isArray(a.selectedClassIds)) {
            initialClasses[a.campusId] = a.selectedClassIds;
          }
        }
      });

      setCampusTeacherAssign(initialTeachers);
      setCampusSelectedGrades(initialGrades);
      setCampusSelectedClassIds(initialClasses);
    } else {
      setSelectedCampusIds([]);
      setCampusTeacherAssign({});
      setCampusSelectedGrades({});
      setCampusSelectedClassIds({});
    }
  }, [catalogItem, isOpen, catalogTargetGrades]);

  const currentAllocations = catalogItem?.meta?.allocatedCampuses || [];

  // Toggle campus selection
  const handleToggleCampus = (campusId: string) => {
    if (selectedCampusIds.includes(campusId)) {
      const found = currentAllocations.find((a: any) => a.campusId === campusId);
      if (found && found.status === 'DA_TRIEN_KHAI' && (found.assignedClassesCount > 0)) {
        toast.error('Cơ sở này đã triển khai xuống các lớp, không thể hủy phân bổ!');
        return;
      }
      setSelectedCampusIds(selectedCampusIds.filter(id => id !== campusId));
    } else {
      setSelectedCampusIds([...selectedCampusIds, campusId]);
      
      // Auto-select target grades and matching classes for newly checked campus
      const campusClasses = allClasses.filter(c => c.campusId === campusId);
      const availableGradesInCampus = Array.from(new Set(campusClasses.map(c => c.grade))).sort((a, b) => a - b);
      
      const gradesToSelect = catalogTargetGrades.length > 0 
        ? catalogTargetGrades.filter(g => availableGradesInCampus.includes(g))
        : availableGradesInCampus;

      const effectiveGrades = gradesToSelect.length > 0 ? gradesToSelect : availableGradesInCampus;

      setCampusSelectedGrades(prev => ({
        ...prev,
        [campusId]: effectiveGrades
      }));

      // Auto-select all classes belonging to these grades
      const matchingClassIds = campusClasses
        .filter(c => effectiveGrades.includes(c.grade))
        .map(c => c.id);

      setCampusSelectedClassIds(prev => ({
        ...prev,
        [campusId]: matchingClassIds
      }));
    }
  };

  const handleSelectAllCampuses = () => {
    const allIds = campuses.map(c => c.id);
    setSelectedCampusIds(allIds);

    const newGrades: Record<string, number[]> = { ...campusSelectedGrades };
    const newClasses: Record<string, string[]> = { ...campusSelectedClassIds };

    campuses.forEach(campus => {
      const campusClasses = allClasses.filter(c => c.campusId === campus.id);
      const availableGrades = Array.from(new Set(campusClasses.map(c => c.grade))).sort((a, b) => a - b);
      const gradesToSelect = catalogTargetGrades.length > 0
        ? catalogTargetGrades.filter(g => availableGrades.includes(g))
        : availableGrades;
      const effectiveGrades = gradesToSelect.length > 0 ? gradesToSelect : availableGrades;

      newGrades[campus.id] = effectiveGrades;
      newClasses[campus.id] = campusClasses
        .filter(c => effectiveGrades.includes(c.grade))
        .map(c => c.id);
    });

    setCampusSelectedGrades(newGrades);
    setCampusSelectedClassIds(newClasses);
  };

  const handleClearAllCampuses = () => {
    const deployedIds = currentAllocations
      .filter((a: any) => a.status === 'DA_TRIEN_KHAI' && a.assignedClassesCount > 0)
      .map((a: any) => a.campusId);
    setSelectedCampusIds(deployedIds);
  };

  // Toggle grade for a campus
  const handleToggleGrade = (campusId: string, grade: number) => {
    const currentGrades = campusSelectedGrades[campusId] || [];
    let updatedGrades: number[];

    if (currentGrades.includes(grade)) {
      updatedGrades = currentGrades.filter(g => g !== grade);
      // Remove classes belonging to this grade from selected classes
      const campusClasses = allClasses.filter(c => c.campusId === campusId && c.grade === grade);
      const removedIds = new Set(campusClasses.map(c => c.id));
      setCampusSelectedClassIds(prev => ({
        ...prev,
        [campusId]: (prev[campusId] || []).filter(id => !removedIds.has(id))
      }));
    } else {
      updatedGrades = [...currentGrades, grade].sort((a, b) => a - b);
      // Auto-add all classes belonging to this new grade
      const campusClasses = allClasses.filter(c => c.campusId === campusId && c.grade === grade);
      const addedIds = campusClasses.map(c => c.id);
      setCampusSelectedClassIds(prev => ({
        ...prev,
        [campusId]: Array.from(new Set([...(prev[campusId] || []), ...addedIds]))
      }));
    }

    setCampusSelectedGrades(prev => ({
      ...prev,
      [campusId]: updatedGrades
    }));
  };

  // Toggle class selection for a campus
  const handleToggleClass = (campusId: string, classId: string) => {
    const currentList = campusSelectedClassIds[campusId] || [];
    if (currentList.includes(classId)) {
      setCampusSelectedClassIds(prev => ({
        ...prev,
        [campusId]: currentList.filter(id => id !== classId)
      }));
    } else {
      setCampusSelectedClassIds(prev => ({
        ...prev,
        [campusId]: [...currentList, classId]
      }));
    }
  };

  // Select/Deselect all classes in a campus
  const handleSelectAllClassesInCampus = (campusId: string) => {
    const grades = campusSelectedGrades[campusId] || [];
    const campusClasses = allClasses.filter(c => c.campusId === campusId && (grades.length === 0 || grades.includes(c.grade)));
    setCampusSelectedClassIds(prev => ({
      ...prev,
      [campusId]: campusClasses.map(c => c.id)
    }));
  };

  const handleClearClassesInCampus = (campusId: string) => {
    setCampusSelectedClassIds(prev => ({
      ...prev,
      [campusId]: []
    }));
  };

  // Calculate totals
  const totalSelectedClasses = useMemo(() => {
    let count = 0;
    selectedCampusIds.forEach(cId => {
      count += (campusSelectedClassIds[cId] || []).length;
    });
    return count;
  }, [selectedCampusIds, campusSelectedClassIds]);

  const totalGVCNs = useMemo(() => {
    const emailSet = new Set<string>();
    selectedCampusIds.forEach(cId => {
      const classIds = campusSelectedClassIds[cId] || [];
      allClasses
        .filter(c => c.campusId === cId && classIds.includes(c.id))
        .forEach(c => {
          if (c.homeroomTeacher?.email) {
            emailSet.add(c.homeroomTeacher.email.toLowerCase().trim());
          }
        });
    });
    return emailSet.size;
  }, [selectedCampusIds, campusSelectedClassIds, allClasses]);

  // Submit allocation
  const handleSubmit = async () => {
    if (selectedCampusIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một cơ sở để phân bổ hoạt động');
      return;
    }

    setAllocating(true);
    try {
      const newAllocatedCampuses = selectedCampusIds.map(cId => {
        const found = currentAllocations.find((a: any) => a.campusId === cId);
        const campusObj = campuses.find(c => c.id === cId);

        const assignedTeacherId = campusTeacherAssign[cId];
        const assignedTeacherObj = tlhnTeachers.find(t => t.id === assignedTeacherId);

        const selectedGrades = campusSelectedGrades[cId] || [];
        const selectedClassIds = campusSelectedClassIds[cId] || [];

        // Build list of assignedClasses with GVCN info
        const assignedClasses = allClasses
          .filter(c => c.campusId === cId && selectedClassIds.includes(c.id))
          .map(c => ({
            classId: c.id,
            className: c.className,
            grade: c.grade,
            level: c.level,
            homeroomTeacherId: c.homeroomTeacher?.id || '',
            homeroomTeacherName: c.homeroomTeacher?.teacherName || '',
            homeroomTeacherEmail: c.homeroomTeacher?.email || ''
          }));

        return {
          campusId: cId,
          campusCode: campusObj?.campusCode || cId,
          campusName: campusObj?.campusName || `Cơ sở ${cId}`,
          tlhnTeacherId: assignedTeacherObj?.id || found?.tlhnTeacherId || '',
          tlhnTeacherName: assignedTeacherObj?.teacherName || found?.tlhnTeacherName || '',
          tlhnTeacherEmail: assignedTeacherObj?.email || found?.tlhnTeacherEmail || '',
          selectedGrades,
          selectedClassIds,
          assignedClasses,
          assignedClassesCount: assignedClasses.length,
          status: assignedClasses.length > 0 ? 'DA_TRIEN_KHAI' : (found?.status || 'CHUA_TIEP_NHAN'),
          receivedAt: found?.receivedAt || null,
          deployedAt: found?.deployedAt || (assignedClasses.length > 0 ? new Date().toISOString() : null),
          recordId: found?.recordId || null
        };
      });

      const res = await fetch(`/api/admin/experiential-activities/catalogs/${catalogItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ALLOCATE_CAMPUSES',
          allocatedCampuses: newAllocatedCampuses,
          sendEmail: sendEmailNotification
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi phân bổ');
      }

      const data = await res.json();
      const emailCount = data.emailNotification?.count;
      
      if (sendEmailNotification) {
        toast.success(`Đã phân bổ kế hoạch xuống ${newAllocatedCampuses.length} cơ sở, ${totalSelectedClasses} lớp và gửi email thông báo tới GVCN và GV Tổ TLHN thành công!`);
      } else {
        toast.success(`Đã lưu phân bổ ${newAllocatedCampuses.length} cơ sở và ${totalSelectedClasses} lớp thành công!`);
      }

      onAllocated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối khi phân bổ');
    } finally {
      setAllocating(false);
    }
  };

  if (!isOpen || !catalogItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50/80 via-emerald-50/60 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00A19A]/15 text-[#00A19A] flex items-center justify-center font-bold shadow-2xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span>Đẩy Cơ Sở: Chọn Cơ Sở & Khối Lớp & Báo Mail GVCN</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                BP HĐNGLL - Tổ CTHS phân bổ kế hoạch trực tiếp đến Khối Lớp, GVCN và GV Tổ TLHN tiếp nhận
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          
          {/* Target Activity Summary Card */}
          <div className="bg-[#003B3A]/5 border border-[#003B3A]/15 rounded-2xl p-4 shadow-2xs">
            <div className="text-[11px] font-black uppercase text-[#00A19A] tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#00A19A]" />
                Kế hoạch Hoạt động trải nghiệm phân bổ
              </span>
              <span className="font-mono text-slate-600 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                {catalogItem.code}
              </span>
            </div>
            <h3 className="text-base font-black text-slate-800 mb-2">
              {catalogItem.name}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-600 pt-1 border-t border-[#003B3A]/10">
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Bậc học:</span>
                <span className="font-bold text-slate-700">{catalogItem.meta?.educationLevel || catalogItem.level || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Chủ đề giáo dục:</span>
                <span className="font-bold text-slate-700">{catalogItem.meta?.themeName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Môn chủ trì & Phối hợp:</span>
                <span className="font-bold text-indigo-700">
                  {catalogItem.meta?.primarySubjectName || '—'}
                  {catalogItem.meta?.coopSubjectNames ? ` + ${catalogItem.meta.coopSubjectNames}` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Thời gian & HK:</span>
                <span className="font-bold text-slate-700">{catalogItem.meta?.timeFrame || 'Trong năm'} (HK {catalogItem.meta?.semester || 1})</span>
              </div>
            </div>
          </div>

          {/* Email Notification Option & Preview Banner */}
          <div className="rounded-2xl bg-teal-50/70 border border-teal-200/90 overflow-hidden shadow-2xs">
            <div className="p-4 flex items-start justify-between gap-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmailNotification}
                  onChange={e => setSendEmailNotification(e.target.checked)}
                  className="mt-0.5 rounded text-[#00A19A] focus:ring-[#00A19A] w-4 h-4 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#00A19A]" />
                    <span>Tự động gửi email thông báo kế hoạch đến GVCN lớp & GV Tổ TLHN tiếp nhận</span>
                  </div>
                  <p className="text-[11px] text-teal-800 mt-0.5">
                    Hệ thống sẽ gửi bảng chi tiết hoạt động kèm lời nhắc GVCN hoàn tất nhập vai trò của Học sinh cho hồ sơ cuối năm.
                  </p>
                </div>
              </label>
              <button
                type="button"
                onClick={() => setShowEmailPreview(!showEmailPreview)}
                className="text-[11px] font-bold text-[#00A19A] hover:text-[#003B3A] flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-teal-200 shadow-2xs cursor-pointer shrink-0"
              >
                <Eye className="w-3 h-3" />
                <span>{showEmailPreview ? 'Ẩn xem trước' : 'Xem mẫu email'}</span>
                {showEmailPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Email Preview Card */}
            {showEmailPreview && (
              <div className="px-4 pb-4 pt-1 border-t border-teal-200/50">
                <div className="bg-white rounded-xl p-3.5 border border-teal-200 shadow-xs text-xs space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-600">Tiêu đề: </span>
                      <span className="font-medium text-slate-800 font-mono text-[10.5px]">
                        [Sky-Line HĐTN] Kế hoạch hoạt động ngoại khóa & Nhập vai trò học sinh lớp: {catalogItem.name}
                      </span>
                    </div>
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                      Email gửi GVCN
                    </span>
                  </div>

                  {/* Prominent Callout Banner */}
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 font-bold text-[11.5px] flex items-center gap-2">
                    <span className="text-base">📢</span>
                    <span>
                      "Kính nhờ Quý thầy/cô GVCN vui lòng hoàn tất nhập vai trò của Học sinh trong Hoạt động trải nghiệm để bổ sung Hồ sơ Học sinh cuối năm, GV Tổ TLHN tiếp nhận"
                    </span>
                  </div>

                  {/* Activity Details Table Preview */}
                  <div className="overflow-hidden border border-slate-200 rounded-lg text-[11px]">
                    <table className="w-full text-left border-collapse">
                      <tbody>
                        <tr className="border-b border-slate-100 bg-slate-50/70">
                          <td className="py-1.5 px-3 font-semibold text-slate-600 w-1/3">Tên hoạt động:</td>
                          <td className="py-1.5 px-3 font-bold text-slate-800">{catalogItem.name}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-1.5 px-3 font-semibold text-slate-600">Bậc học:</td>
                          <td className="py-1.5 px-3 font-medium text-slate-800">{catalogItem.meta?.educationLevel || catalogItem.level || '—'}</td>
                        </tr>
                        <tr className="border-b border-slate-100 bg-slate-50/70">
                          <td className="py-1.5 px-3 font-semibold text-slate-600">Hệ học:</td>
                          <td className="py-1.5 px-3 font-medium text-slate-800">{catalogItem.meta?.programType || 'Chất lượng cao / Song ngữ'}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-1.5 px-3 font-semibold text-slate-600">Chủ đề giáo dục:</td>
                          <td className="py-1.5 px-3 font-medium text-slate-800">{catalogItem.meta?.themeName || '—'}</td>
                        </tr>
                        <tr className="border-b border-slate-100 bg-slate-50/70">
                          <td className="py-1.5 px-3 font-semibold text-slate-600">Môn phối hợp:</td>
                          <td className="py-1.5 px-3 font-medium text-slate-800">
                            Chủ trì: {catalogItem.meta?.primarySubjectName || '—'}
                            {catalogItem.meta?.coopSubjectNames ? `; Phối hợp: ${catalogItem.meta.coopSubjectNames}` : ''}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-1.5 px-3 font-semibold text-slate-600">Thời gian & HK:</td>
                          <td className="py-1.5 px-3 font-medium text-slate-800">{catalogItem.meta?.timeFrame || 'Trong năm'} (HK {catalogItem.meta?.semester || 1})</td>
                        </tr>
                        <tr className="border-b border-slate-100 bg-slate-50/70">
                          <td className="py-1.5 px-3 font-semibold text-slate-600">Địa điểm:</td>
                          <td className="py-1.5 px-3 font-medium text-slate-800">{catalogItem.meta?.expectedLocation || 'Theo kế hoạch'}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 px-3 font-semibold text-slate-600">GV Tổ TLHN tiếp nhận:</td>
                          <td className="py-1.5 px-3 font-bold text-[#00A19A]">
                            Thầy/Cô GV Tổ TLHN tại Cơ sở
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-teal-800 pt-1">
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5 text-[#00A19A]" />
                      Dự kiến gửi đến: <strong>{totalGVCNs} GVCN</strong> & <strong>{selectedCampusIds.length} đại diện Tổ TLHN</strong>
                    </span>
                    <span className="italic text-[10px] text-slate-400">Kèm nút liên kết trực tiếp vào trang phân vai trò học sinh SSM</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Select Campuses Bar */}
          <div className="flex items-center justify-between pt-1">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00A19A]" />
              1. Chọn cơ sở tiếp nhận ({selectedCampusIds.length}/{campuses.length}):
            </label>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAllCampuses}
                className="text-[#00A19A] hover:underline font-bold cursor-pointer"
              >
                Chọn tất cả cơ sở
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleClearAllCampuses}
                className="text-slate-400 hover:text-slate-700 hover:underline cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          {/* CAMPUS CARDS WITH GRADE & CLASS SELECTION */}
          <div className="space-y-4">
            {campuses.map(campus => {
              const isSelected = selectedCampusIds.includes(campus.id);
              const foundAlloc = currentAllocations.find((a: any) => a.campusId === campus.id);
              const isDeployed = foundAlloc?.status === 'DA_TRIEN_KHAI';
              const isAccepted = foundAlloc?.status === 'DA_TIEP_NHAN';

              // Get all classes in this campus
              const campusClasses = allClasses.filter(c => c.campusId === campus.id);
              const campusGrades = Array.from(new Set(campusClasses.map(c => c.grade))).sort((a, b) => a - b);
              
              const selectedGrades = campusSelectedGrades[campus.id] || [];
              const selectedClassIds = campusSelectedClassIds[campus.id] || [];
              
              // Filter classes displayed for this campus based on selected grades
              const filteredClasses = campusClasses.filter(c => selectedGrades.includes(c.grade));

              // TLHN teachers in this campus
              const campusTeachers = tlhnTeachers.filter(t => t.campusId === campus.id || t.campusCode === campus.campusCode);

              return (
                <div
                  key={campus.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isSelected
                      ? 'border-[#00A19A] bg-teal-50/20 ring-1 ring-[#00A19A]/30 shadow-xs'
                      : 'border-slate-200/90 hover:border-slate-300 bg-white'
                  }`}
                >
                  {/* Campus Header Bar */}
                  <div className="p-3.5 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleCampus(campus.id)}
                        className="rounded text-[#00A19A] focus:ring-[#00A19A] w-4 h-4 cursor-pointer"
                      />
                      <div 
                        onClick={() => handleToggleCampus(campus.id)}
                        className="cursor-pointer"
                      >
                        <span className="text-sm font-black text-slate-800">{campus.campusName}</span>
                        <span className="text-[10px] text-slate-500 font-mono ml-2 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                          Mã: {campus.campusCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <span className="text-[11px] font-bold text-[#00A19A] bg-white px-2 py-0.5 rounded-full border border-teal-200">
                          {selectedClassIds.length} lớp được chọn
                        </span>
                      )}
                      {foundAlloc && (
                        <div>
                          {isDeployed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Đã triển khai ({foundAlloc.assignedClassesCount || 0} lớp)
                            </span>
                          ) : isAccepted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-2.5 h-2.5" /> Đã nhận ({foundAlloc.tlhnTeacherName || 'GV'})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Chưa tiếp nhận
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Campus Details when checked */}
                  {isSelected && (
                    <div className="p-4 space-y-4 bg-white/60">
                      
                      {/* TLHN Teacher Selector */}
                      <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/80 flex flex-wrap items-center gap-2.5 text-xs">
                        <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#00A19A]" />
                          GV Tổ TLHN tiếp nhận tại {campus.campusCode}:
                        </span>

                        <select
                          value={campusTeacherAssign[campus.id] || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setCampusTeacherAssign(prev => ({
                              ...prev,
                              [campus.id]: val
                            }));
                          }}
                          className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:outline-hidden focus:border-[#00A19A]"
                        >
                          <option value="">-- Tất cả GV Tổ TLHN tại {campus.campusCode} (Khuyến nghị) --</option>
                          {campusTeachers.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.teacherName} ({t.teacherCode}) {t.email ? `- ${t.email}` : ''}
                            </option>
                          ))}
                        </select>

                        {campusTeachers.length > 0 && !campusTeacherAssign[campus.id] && (
                          <span className="text-[10px] text-teal-700 italic">
                            (Hệ thống sẽ gửi email tới {campusTeachers.map(t => t.teacherName).join(', ')})
                          </span>
                        )}

                        {campusTeacherAssign[campus.id] && (() => {
                          const assignedT = tlhnTeachers.find(t => t.id === campusTeacherAssign[campus.id]);
                          if (!assignedT) return null;
                          return (
                            <div className="w-full mt-1 p-2 rounded-xl bg-white border border-teal-200 text-xs text-teal-950 flex items-center justify-between gap-2 shadow-2xs">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#00A19A] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {assignedT.teacherName?.split(' ').slice(-1)[0]?.charAt(0) || 'G'}
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-800">{assignedT.teacherName}</span>
                                  <span className="font-mono text-[10px] text-teal-700 ml-1.5 font-bold">({assignedT.teacherCode})</span>
                                  {assignedT.email && <span className="text-slate-500 font-mono text-[10px] ml-2">• {assignedT.email}</span>}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                                GV Tiếp nhận trực tiếp
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* GRADE SELECTION (Chọn Khối) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-[#00A19A]" />
                            <span>2. Chọn Khối áp dụng ({selectedGrades.length}/{campusGrades.length} khối):</span>
                          </label>
                          <span className="text-[11px] text-slate-500">
                            {catalogTargetGrades.length > 0 && `(Theo kế hoạch chung: Khối ${catalogTargetGrades.join(', ')})`}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {campusGrades.length === 0 ? (
                            <div className="text-xs text-slate-400 italic py-1">Không tìm thấy dữ liệu khối lớp cho cơ sở này</div>
                          ) : (
                            campusGrades.map(grade => {
                              const isGradeActive = selectedGrades.includes(grade);
                              const countInGrade = campusClasses.filter(c => c.grade === grade).length;
                              return (
                                <button
                                  key={grade}
                                  type="button"
                                  onClick={() => handleToggleGrade(campus.id, grade)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    isGradeActive
                                      ? 'bg-gradient-to-r from-[#003B3A] to-[#00A19A] text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                  }`}
                                >
                                  {isGradeActive && <Check className="w-3 h-3 text-emerald-300" />}
                                  <span>Khối {grade}</span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                                    isGradeActive ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                                  }`}>
                                    {countInGrade} lớp
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* CLASS SELECTION (Chọn Lớp) */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <School className="w-3.5 h-3.5 text-[#00A19A]" />
                            <span>3. Chọn Lớp & GVCN nhận thông báo ({selectedClassIds.length}/{filteredClasses.length} lớp đã chọn):</span>
                          </label>
                          <div className="flex gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => handleSelectAllClassesInCampus(campus.id)}
                              className="text-[#00A19A] hover:underline font-bold text-[11px] cursor-pointer"
                            >
                              Chọn tất cả lớp
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => handleClearClassesInCampus(campus.id)}
                              className="text-slate-400 hover:text-slate-700 hover:underline text-[11px] cursor-pointer"
                            >
                              Bỏ chọn lớp
                            </button>
                          </div>
                        </div>

                        {filteredClasses.length === 0 ? (
                          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-800 text-center">
                            Chưa chọn khối nào hoặc không có lớp phù hợp. Vui lòng bấm chọn ít nhất một Khối ở bước trên.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                            {filteredClasses.map(cls => {
                              const isClassSelected = selectedClassIds.includes(cls.id);
                              const gvcn = cls.homeroomTeacher;

                              return (
                                <div
                                  key={cls.id}
                                  onClick={() => handleToggleClass(campus.id, cls.id)}
                                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                                    isClassSelected
                                      ? 'border-[#00A19A] bg-teal-50/50 ring-1 ring-[#00A19A]/40 shadow-2xs'
                                      : 'border-slate-200 hover:border-slate-300 bg-white'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-1 mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isClassSelected}
                                        onChange={() => {}} // handled by parent onClick
                                        className="rounded text-[#00A19A] focus:ring-[#00A19A] w-3.5 h-3.5 pointer-events-none"
                                      />
                                      <span className="font-extrabold text-slate-800 text-xs">{cls.className}</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                      Khối {cls.grade}
                                    </span>
                                  </div>

                                  {/* GVCN info */}
                                  <div className="text-[11px] pt-1 border-t border-slate-100 flex items-center justify-between">
                                    {gvcn?.teacherName ? (
                                      <div className="truncate">
                                        <span className="font-semibold text-slate-700 block truncate">
                                          GVCN: {gvcn.teacherName}
                                        </span>
                                        {gvcn.email && (
                                          <span className="text-[10px] text-teal-700 font-mono block truncate">
                                            {gvcn.email}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-amber-700 italic">
                                        Chưa phân công GVCN
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* FOOTER */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            Tổng cộng: <strong className="text-slate-900">{selectedCampusIds.length} cơ sở</strong> • <strong className="text-[#00A19A]">{totalSelectedClasses} lớp</strong>
            {sendEmailNotification && (
              <span className="text-teal-700 font-semibold ml-2">
                (Sẽ gửi email đến {totalGVCNs} GVCN & GV Tổ TLHN)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={allocating || selectedCampusIds.length === 0}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 text-white shadow-md shadow-[#00A19A]/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>
                {allocating 
                  ? 'Đang gửi thông báo...' 
                  : `Xác nhận & Báo mail (${selectedCampusIds.length} cơ sở, ${totalSelectedClasses} lớp)`
                }
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
