"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Check, CheckCircle2, ChevronRight, Save, Send, Plus, 
  Trash2, Layers, Calendar, Users, Building2, BookOpen, Clock, 
  Tag, Award, Sparkles, AlertCircle, Info, Shield, Compass, Leaf, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  ACTIVITY_STRANDS, SKYLINE_ACTIVITY_TYPES, ACTIVITY_SCALES,
  CRITERIA_LIBRARY, DEFAULT_1_CRITERION, DEFAULT_3_CRITERIA,
  DEFAULT_5_CRITERIA, DEFAULT_THRESHOLDS, EVAL_LEVELS
} from '@/lib/experiential/constants';

export default function CreateActivityWizard() {
  const router = useRouter();

  // Wizard Step (1 to 4)
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // System master data
  const [academicYears, setAcademicYears] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [classes, setClasses] = useState([]);

  // Step 1: Info & Classification
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    academicYearId: '',
    campusId: '',
    campusCode: '',
    campusName: '',
    educationLevel: 'Tieu hoc',
    grades: ['1'],
    date: new Date().toISOString().split('T')[0],
    timeRange: '08:00 - 11:30',
    location: '',
    description: '',
    objectives: '',
    evidenceUrls: [''],
    strand: 'BAN_THAN',
    activityTypeId: 'SU_KIEN',
    activityTypeName: 'S? ki?n / L? h?i',
    scale: 'KHOI',
    deadline: ''
  });

  // Step 2: Evaluation Settings
  const [evalMode, setEvalMode] = useState('CRITERIA'); // 'PARTICIPATION_ONLY' | 'CRITERIA'
  const [criteria, setCriteria] = useState(DEFAULT_3_CRITERIA);
  const [formulaType, setFormulaType] = useState('EQUAL_WEIGHT'); // 'EQUAL_WEIGHT' | 'WEIGHTED'
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [mandatoryRules, setMandatoryRules] = useState([]);
  const [criteriaPreset, setCriteriaPreset] = useState('3'); // '1' | '3' | '5' | 'custom'

  // Step 3: Class Assignment
  const [assignedClasses, setAssignedClasses] = useState([]);

  // Load Years, Campuses & Classes
  useEffect(() => {
    Promise.all([
      fetch('/api/academic-years').then(r => r.json()).catch(() => []),
      fetch('/api/campuses').then(r => r.json()).catch(() => [])
    ]).then(([years, camps]) => {
      if (Array.isArray(years) && years.length > 0) {
        setAcademicYears(years);
        const active = years.find(y => y.status === 'ACTIVE' && !y.isOff) || years[0];
        setFormData(prev => ({ ...prev, academicYearId: active?.id || '' }));
      }
      if (Array.isArray(camps) && camps.length > 0) {
        setCampuses(camps);
        setFormData(prev => ({
          ...prev,
          campusId: camps[0].id,
          campusCode: camps[0].campusCode,
          campusName: camps[0].campusName
        }));
      }
    });
  }, []);

  // Fetch classes when year or campus changes
  useEffect(() => {
    if (formData.academicYearId) {
      let url = `/api/classes?academicYearId=${formData.academicYearId}`;
      fetch(url)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setClasses(data);
          else setClasses([]);
        })
        .catch(() => setClasses([]));
    }
  }, [formData.academicYearId]);

  // Preset switch
  const handleSelectCriteriaPreset = (preset) => {
    setCriteriaPreset(preset);
    if (preset === '1') {
      setCriteria(DEFAULT_1_CRITERION);
      setFormulaType('EQUAL_WEIGHT');
    } else if (preset === '3') {
      setCriteria(DEFAULT_3_CRITERIA);
      setFormulaType('EQUAL_WEIGHT');
    } else if (preset === '5') {
      setCriteria(DEFAULT_5_CRITERIA);
      setFormulaType('EQUAL_WEIGHT');
    }
  };

  const handleAddCriterionFromLib = (item) => {
    if (criteria.some(c => c.id === item.id || c.name === item.name)) {
      toast.error('Ti�u ch� n�y �? c� trong danh s�ch');
      return;
    }
    const newCrit = {
      ...item,
      id: 'CRIT_' + Date.now().toString().slice(-4),
      order: criteria.length + 1
    };
    setCriteria(prev => [...prev, newCrit]);
    setCriteriaPreset('custom');
    toast.success(`�? th�m ti�u ch�: ${item.name}`);
  };

  const handleRemoveCriterion = (id) => {
    if (criteria.length <= 1) {
      toast.error('Ho?t �?ng c?n c� �t nh?t 1 ti�u ch� ��nh gi�');
      return;
    }
    setCriteria(prev => prev.filter(c => c.id !== id));
    setCriteriaPreset('custom');
  };

  const handleUpdateCriterion = (id, field, value) => {
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    setCriteriaPreset('custom');
  };

  // Toggle class selection in Step 3
  const handleToggleClass = (cls) => {
    const exists = assignedClasses.some(c => c.classId === cls.id);
    if (exists) {
      setAssignedClasses(prev => prev.filter(c => c.classId !== cls.id));
    } else {
      const campusObj = campuses.find(cp => cp.id === cls.campusId) || { campusCode: 'CS', campusName: 'Sky-Line' };
      const teacherObj = (cls.teachers || []).find(t => t.roleInClass === 'GVCN') || {};
      const newClassItem = {
        classId: cls.id,
        className: cls.className,
        campusId: cls.campusId,
        campusCode: campusObj.campusCode || '',
        campusName: campusObj.campusName || '',
        grade: cls.grade || '',
        level: cls.level || '',
        homeroomTeacherId: teacherObj.teacherId || cls.homeroomTeacherId || '',
        homeroomTeacherName: teacherObj.teacher?.teacherName || cls.homeroomTeacher?.teacherName || 'GVCN',
        totalStudents: cls._count?.students || (cls.students ? cls.students.length : 30),
        evaluatedStudents: 0,
        status: 'DRAFT'
      };
      setAssignedClasses(prev => [...prev, newClassItem]);
    }
  };

  const handleSelectAllClassesInGrade = (gradeClasses) => {
    const allSelected = gradeClasses.every(cls => assignedClasses.some(c => c.classId === cls.id));
    if (allSelected) {
      const gradeClassIds = new Set(gradeClasses.map(c => c.id));
      setAssignedClasses(prev => prev.filter(c => !gradeClassIds.has(c.classId)));
    } else {
      const newItems = [];
      gradeClasses.forEach(cls => {
        if (!assignedClasses.some(c => c.classId === cls.id)) {
          const campusObj = campuses.find(cp => cp.id === cls.campusId) || { campusCode: 'CS', campusName: 'Sky-Line' };
          const teacherObj = (cls.teachers || []).find(t => t.roleInClass === 'GVCN') || {};
          newItems.push({
            classId: cls.id,
            className: cls.className,
            campusId: cls.campusId,
            campusCode: campusObj.campusCode || '',
            campusName: campusObj.campusName || '',
            grade: cls.grade || '',
            level: cls.level || '',
            homeroomTeacherId: teacherObj.teacherId || cls.homeroomTeacherId || '',
            homeroomTeacherName: teacherObj.teacher?.teacherName || cls.homeroomTeacher?.teacherName || 'GVCN',
            totalStudents: cls._count?.students || (cls.students ? cls.students.length : 30),
            evaluatedStudents: 0,
            status: 'DRAFT'
          });
        }
      });
      setAssignedClasses(prev => [...prev, ...newItems]);
    }
  };

  // Submit handler
  const handleSubmit = async (isDraft = false) => {
    if (!formData.name.trim()) {
      toast.error('Vui l?ng nh?p T�n ho?t �?ng');
      setCurrentStep(1);
      return;
    }
    if (assignedClasses.length === 0) {
      toast.error('Vui l?ng g�n �t nh?t m?t l?p tham gia');
      setCurrentStep(3);
      return;
    }

    if (evalMode === 'CRITERIA' && formulaType === 'WEIGHTED') {
      const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        toast.error(`T?ng tr?ng s? c�c ti�u ch� ph?i b?ng 100% (Hi?n t?i: ${totalWeight}%)`);
        setCurrentStep(2);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        evalMode,
        criteria: evalMode === 'CRITERIA' ? criteria : [],
        formulaType,
        thresholds,
        mandatoryRules,
        status: isDraft ? 'DRAFT' : 'ASSIGNED',
        assignedClasses
      };

      const res = await fetch('/api/experiential-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(isDraft ? '�? l�u nh�p ho?t �?ng th�nh c�ng!' : '�? giao ho?t �?ng th�nh c�ng cho GVCN!');
        router.push('/teacher/experiential-activities');
      } else {
        const err = await res.json();
        toast.error(err.error || 'L?i khi l�u ho?t �?ng');
      }
    } catch {
      toast.error('L?i k?t n?i m�y ch?');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-sky-50/20 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* TOP HEADER */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/teacher/experiential-activities')}
            className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-[#003B3A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay l?i danh s�ch</span>
          </button>
          <div className="text-xs font-black text-slate-400">
            H? th?ng Qu?n tr? Ch?t l�?ng Gi�o d?c Sky-Line
          </div>
        </div>

        {/* WIZARD PROGRESS STEPPER */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md shadow-slate-200/40">
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, title: 'B�?c 1', desc: 'Th�ng tin ho?t �?ng' },
              { num: 2, title: 'B�?c 2', desc: 'Thi?t l?p ��nh gi�' },
              { num: 3, title: 'B�?c 3', desc: 'G�n l?p & GVCN' },
              { num: 4, title: 'B�?c 4', desc: 'Ki?m tra & Ph�t h�nh' }
            ].map(step => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <div
                  key={step.num}
                  onClick={() => setCurrentStep(step.num)}
                  className={`cursor-pointer p-3 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-[#00A99D]/10 border-[#00A99D] shadow-xs'
                      : isPast
                      ? 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50'
                      : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        isActive
                          ? 'bg-[#00A99D] text-white'
                          : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPast ? <Check className="w-3.5 h-3.5" /> : step.num}
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-[10px] font-black uppercase text-slate-400">{step.title}</div>
                      <div className="text-xs font-black text-slate-800 line-clamp-1">{step.desc}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 1: TH�NG TIN HO?T �?NG */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md shadow-slate-200/40 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-800">B�?c 1 � Th�ng tin & Ph�n lo?i Ho?t �?ng</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Nh?p c�c th�ng tin c� b?n, ch?n m?ch ho?t �?ng, lo?i ho?t �?ng v� quy m� t? ch?c
              </p>
            </div>

            {/* Basic fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  T�n ho?t �?ng tr?i nghi?m <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="V� d?: H?i ch? Xu�n K?t n?i Y�u th��ng 2026, STEM Kh�m ph� H? Sinh th�i..."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">N�m h?c</label>
                <select
                  value={formData.academicYearId}
                  onChange={e => setFormData({ ...formData, academicYearId: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                >
                  {academicYears.map(y => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">C� s? t? ch?c</label>
                <select
                  value={formData.campusId}
                  onChange={e => {
                    const c = campuses.find(cp => cp.id === e.target.value);
                    setFormData({
                      ...formData,
                      campusId: e.target.value,
                      campusCode: c?.campusCode || '',
                      campusName: c?.campusName || ''
                    });
                  }}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                >
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>{c.campusName || c.campusCode}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">C?p h?c</label>
                <select
                  value={formData.educationLevel}
                  onChange={e => setFormData({ ...formData, educationLevel: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                >
                  <option value="Tieu hoc">Ti?u h?c</option>
                  <option value="THCS">THCS</option>
                  <option value="THPT">THPT</option>
                  <option value="Mam non">M?m non</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">Quy m� ho?t �?ng</label>
                <select
                  value={formData.scale}
                  onChange={e => setFormData({ ...formData, scale: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                >
                  {ACTIVITY_SCALES.map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">Ng�y t? ch?c</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">Th?i gian th?c hi?n</label>
                <input
                  type="text"
                  placeholder="V� d?: 08:00 - 11:30 ho?c C? ng�y"
                  value={formData.timeRange}
                  onChange={e => setFormData({ ...formData, timeRange: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-700 mb-1.5">�?a �i?m t? ch?c</label>
                <input
                  type="text"
                  placeholder="V� d?: S�n tr�?ng Sky-Line Beach-D, Trung t�m V�n h�a TP �� N?ng..."
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                />
              </div>
            </div>

            {/* M?CH HO?T �?NG CARDS */}
            <div className="space-y-2 pt-3">
              <label className="block text-xs font-black text-slate-800">
                Ch?n M?ch ho?t �?ng tr?i nghi?m <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {ACTIVITY_STRANDS.map(strand => {
                  const isSelected = formData.strand === strand.id;
                  return (
                    <div
                      key={strand.id}
                      onClick={() => setFormData({ ...formData, strand: strand.id })}
                      className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#00A99D]/10 border-[#00A99D] shadow-sm'
                          : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">{strand.name}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#00A99D]" />}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{strand.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LO?I HO?T �?NG SKY-LINE */}
            <div className="space-y-2 pt-3">
              <label className="block text-xs font-black text-slate-800">
                Lo?i ho?t �?ng Sky-Line <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {SKYLINE_ACTIVITY_TYPES.map(type => {
                  const isSelected = formData.activityTypeId === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        activityTypeId: type.id,
                        activityTypeName: type.name
                      })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#003B3A] text-white border-[#003B3A] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      <span className="line-clamp-1">{type.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* M� t? & M?c ti�u */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">M� t? t�m t?t</label>
                <textarea
                  rows={3}
                  placeholder="N�u kh�i qu�t n?i dung ch�nh c?a ho?t �?ng..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">M?c ti�u c?n �?t</label>
                <textarea
                  rows={3}
                  placeholder="H?c sinh ph�t tri?n k? n�ng l�m vi?c nh�m, giao ti?p, s�ng t?o..."
                  value={formData.objectives}
                  onChange={e => setFormData({ ...formData, objectives: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                />
              </div>
            </div>

            {/* Navigation Button */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (!formData.name.trim()) { toast.error('Vui l?ng nh?p T�n ho?t �?ng'); return; }
                  setCurrentStep(2);
                }}
                className="px-6 py-3 bg-[#00A99D] hover:bg-[#008F85] text-white text-xs font-black rounded-2xl shadow-md shadow-[#00A99D]/20 flex items-center gap-2"
              >
                <span>Sang B�?c 2: Thi?t l?p ��nh gi�</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: THI?T L?P ��NH GI� */}
        {currentStep === 2 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md shadow-slate-200/40 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-800">B�?c 2 � Thi?t l?p Ti�u ch� & C�ng th?c ��nh gi�</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Ch?n h?nh th?c ghi nh?n, b? ti�u ch� ��nh gi�, thang 4 m?c v� quy t?c t�nh k?t qu?
              </p>
            </div>

            {/* H?nh th?c ��nh gi� */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-800">H?nh th?c ��nh gi�</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setEvalMode('PARTICIPATION_ONLY')}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                    evalMode === 'PARTICIPATION_ONLY'
                      ? 'bg-[#00A99D]/10 border-[#00A99D] shadow-xs'
                      : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">H?nh th?c 1: Ch? ghi nh?n tham gia</span>
                    {evalMode === 'PARTICIPATION_ONLY' && <CheckCircle2 className="w-4 h-4 text-[#00A99D]" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Kh�ng ch?m �i?m theo ti�u ch�. K?t qu? ph�n lo?i th�nh: Tham gia / Kh�ng tham gia / Mi?n.
                  </p>
                </div>

                <div
                  onClick={() => setEvalMode('CRITERIA')}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                    evalMode === 'CRITERIA'
                      ? 'bg-[#00A99D]/10 border-[#00A99D] shadow-xs'
                      : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">H?nh th?c 2: ��nh gi� theo ti�u ch� n�ng l?c</span>
                    {evalMode === 'CRITERIA' && <CheckCircle2 className="w-4 h-4 text-[#00A99D]" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ch?m �i?m theo 1, 3, 5 ti�u ch� ho?c t�y ch?nh. K?t qu? x?p lo?i: N?i b?t, T?t, �?t, C?n h? tr?.
                  </p>
                </div>
              </div>
            </div>

            {/* If Criteria Mode is selected */}
            {evalMode === 'CRITERIA' && (
              <div className="space-y-6 pt-2">
                {/* Preset Selector */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-800">Ch?n nhanh b? ti�u ch� chu?n:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleSelectCriteriaPreset('1')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          criteriaPreset === '1'
                            ? 'bg-[#003B3A] text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        [1 ti�u ch�]
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectCriteriaPreset('3')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          criteriaPreset === '3'
                            ? 'bg-[#003B3A] text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        [3 ti�u ch� chu?n]
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectCriteriaPreset('5')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          criteriaPreset === '5'
                            ? 'bg-[#003B3A] text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        [5 ti�u ch� n�ng cao]
                      </button>
                    </div>
                  </div>

                  {/* Criteria List */}
                  <div className="space-y-2.5 pt-2">
                    {criteria.map((crit, idx) => (
                      <div key={crit.id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 font-black text-xs text-slate-500 flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="space-y-1 flex-1">
                            <input
                              type="text"
                              value={crit.name}
                              onChange={e => handleUpdateCriterion(crit.id, 'name', e.target.value)}
                              className="w-full font-black text-xs text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#00A99D] outline-none"
                              placeholder="T�n ti�u ch�"
                            />
                            <input
                              type="text"
                              value={crit.description || ''}
                              onChange={e => handleUpdateCriterion(crit.id, 'description', e.target.value)}
                              className="w-full text-[11px] text-slate-500 font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#00A99D] outline-none"
                              placeholder="M� t? h�?ng d?n ch?m (hi?n th? tooltip)"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          {formulaType === 'WEIGHTED' && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400 font-bold">Tr?ng s?:</span>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={crit.weight}
                                onChange={e => handleUpdateCriterion(crit.id, 'weight', parseInt(e.target.value) || 0)}
                                className="w-16 py-1 px-2 text-center text-xs font-black bg-slate-50 border border-slate-200 rounded-lg outline-none"
                              />
                              <span className="text-xs text-slate-500">%</span>
                            </div>
                          )}

                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={crit.isRequired}
                              onChange={e => handleUpdateCriterion(crit.id, 'isRequired', e.target.checked)}
                              className="rounded text-[#00A99D] focus:ring-0"
                            />
                            <span className="text-[11px] font-bold text-slate-600">B?t bu?c</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveCriterion(crit.id)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                            title="X�a ti�u ch�"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* TH� VI?N TI�U CH� G?I ? (12 TI�U CH�) */}
                  <div className="pt-3 border-t border-slate-200">
                    <span className="block text-[11px] font-black text-slate-600 mb-2 uppercase tracking-wider">
                      Ch?n th�m t? th� vi?n ti�u ch� chu?n (12 ti�u ch�):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {CRITERIA_LIBRARY.map(libItem => (
                        <button
                          key={libItem.id}
                          type="button"
                          onClick={() => handleAddCriterionFromLib(libItem)}
                          className="px-2.5 py-1 bg-white hover:bg-[#00A99D]/10 hover:text-[#003B3A] text-slate-600 text-[11px] font-bold rounded-lg border border-slate-200 hover:border-[#00A99D]/40 transition-all flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-[#00A99D]" />
                          <span>{libItem.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* THANG ��NH GI� 4 M?C */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">Thang ��nh gi� 4 m?c th?ng nh?t:</span>
                    <span className="text-[11px] text-slate-400 font-bold">Hi?n th? t�n m?c tr?c quan cho GVCN</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {EVAL_LEVELS.map(lvl => (
                      <div key={lvl.level} className={`p-3 rounded-xl border bg-white shadow-2xs space-y-1 ${lvl.badgeCls}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">{lvl.level} � {lvl.name}</span>
                          <span className="text-[10px] font-black uppercase opacity-70">{lvl.points}�</span>
                        </div>
                        <p className="text-[10px] opacity-80 leading-tight">
                          {lvl.level === 4 ? 'V�?t tr?i, s�ng t?o xu?t s?c' : lvl.level === 3 ? 'Ho�n th�nh t?t, ch? �?ng' : lvl.level === 2 ? '�?t y�u c?u c� b?n' : 'C?n h�?ng d?n v� h? tr?'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* C�NG TH?C V� NG�?NG T�NH */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                    <span className="text-xs font-black text-slate-800 block">C�ng th?c t�nh k?t qu?:</span>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="formulaType"
                          value="EQUAL_WEIGHT"
                          checked={formulaType === 'EQUAL_WEIGHT'}
                          onChange={() => setFormulaType('EQUAL_WEIGHT')}
                          className="text-[#00A99D]"
                        />
                        <span className="text-xs font-bold text-slate-700">C�ng th?c A: �?ng tr?ng s? (T?ng �i?m / �i?m max * 100%)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="formulaType"
                          value="WEIGHTED"
                          checked={formulaType === 'WEIGHTED'}
                          onChange={() => setFormulaType('WEIGHTED')}
                          className="text-[#00A99D]"
                        />
                        <span className="text-xs font-bold text-slate-700">C�ng th?c B: Theo tr?ng s? ri�ng t?ng ti�u ch�</span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                    <span className="text-xs font-black text-slate-800 block">Ng�?ng x?p lo?i k?t qu?:</span>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">N?i b?t (? %)</span>
                        <input
                          type="number"
                          value={thresholds.outstanding}
                          onChange={e => setThresholds({ ...thresholds, outstanding: parseInt(e.target.value) || 85 })}
                          className="w-full py-1 px-2 bg-white border border-slate-200 rounded-lg font-black text-center"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">T?t (? %)</span>
                        <input
                          type="number"
                          value={thresholds.good}
                          onChange={e => setThresholds({ ...thresholds, good: parseInt(e.target.value) || 70 })}
                          className="w-full py-1 px-2 bg-white border border-slate-200 rounded-lg font-black text-center"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">�?t (? %)</span>
                        <input
                          type="number"
                          value={thresholds.pass}
                          onChange={e => setThresholds({ ...thresholds, pass: parseInt(e.target.value) || 50 })}
                          className="w-full py-1 px-2 bg-white border border-slate-200 rounded-lg font-black text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all"
              >
                Quay l?i B�?c 1
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 bg-[#00A99D] hover:bg-[#008F85] text-white text-xs font-black rounded-2xl shadow-md shadow-[#00A99D]/20 flex items-center gap-2"
              >
                <span>Sang B�?c 3: G�n l?p</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: G�N L?P & GVCN */}
        {currentStep === 3 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md shadow-slate-200/40 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">B�?c 3 � G�n L?p Tham Gia & Ph�n C�ng GVCN</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Ch?n c�c l?p theo C� s? ? Kh?i ? L?p. H? th?ng t? �?ng l?y danh s�ch GVCN v� h?c sinh.
                </p>
              </div>
              <div className="text-xs font-black text-[#003B3A] bg-[#00A99D]/10 px-3 py-1.5 rounded-xl border border-[#00A99D]/20">
                �? ch?n: {assignedClasses.length} l?p
              </div>
            </div>

            {/* Deadline Field */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-slate-800 block">Th?i h?n GVCN ho�n th�nh ��nh gi� (Deadline):</span>
                <span className="text-[11px] text-slate-500">GVCN s? nh?n ��?c th�ng b�o nh?c nh? khi �?n h?n</span>
              </div>
              <input
                type="date"
                value={formData.deadline}
                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#00A99D]/30 outline-none"
              />
            </div>

            {/* Class Tree List Grouped by Campus & Grade */}
            <div className="space-y-4">
              {campuses.map(campus => {
                const campusClasses = classes.filter(c => c.campusId === campus.id);
                if (campusClasses.length === 0) return null;

                const uniqueGrades = Array.from(new Set(campusClasses.map(c => c.grade).filter(Boolean))).sort((a, b) => parseInt(a) - parseInt(b));

                return (
                  <div key={campus.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <Building2 className="w-4 h-4 text-[#00A99D]" />
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        {campus.campusName || campus.campusCode}
                      </span>
                    </div>

                    <div className="space-y-3 pl-2">
                      {uniqueGrades.map(grade => {
                        const gradeClasses = campusClasses.filter(c => c.grade === grade);
                        const isGradeAllSelected = gradeClasses.every(cls => assignedClasses.some(c => c.classId === cls.id));

                        return (
                          <div key={grade} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-700">Kh?i {grade}</span>
                              <button
                                type="button"
                                onClick={() => handleSelectAllClassesInGrade(gradeClasses)}
                                className="text-[11px] font-black text-[#00A99D] hover:underline"
                              >
                                {isGradeAllSelected ? 'B? ch?n to�n kh?i' : 'Ch?n to�n kh?i'}
                              </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                              {gradeClasses.map(cls => {
                                const isSelected = assignedClasses.some(c => c.classId === cls.id);
                                return (
                                  <button
                                    key={cls.id}
                                    type="button"
                                    onClick={() => handleToggleClass(cls)}
                                    className={`p-2.5 rounded-xl border text-xs font-black text-center transition-all flex items-center justify-between ${
                                      isSelected
                                        ? 'bg-[#003B3A] text-white border-[#003B3A] shadow-xs'
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>{cls.className}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all"
              >
                Quay l?i B�?c 2
              </button>
              <button
                type="button"
                onClick={() => {
                  if (assignedClasses.length === 0) {
                    toast.error('Vui l?ng ch?n �t nh?t 1 l?p');
                    return;
                  }
                  setCurrentStep(4);
                }}
                className="px-6 py-3 bg-[#00A99D] hover:bg-[#008F85] text-white text-xs font-black rounded-2xl shadow-md shadow-[#00A99D]/20 flex items-center gap-2"
              >
                <span>Sang B�?c 4: Ki?m tra & Ph�t h�nh</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: KI?M TRA V� PH�T H�NH (PREVIEW & PUBLISH) */}
        {currentStep === 4 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md shadow-slate-200/40 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-800">B�?c 4 � Ki?m Tra & Ph�t H�nh Ho?t �?ng</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Xem l?i to�n b? th�ng tin c?u h?nh tr�?c khi l�u nh�p ho?c giao cho c�c Gi�o vi�n Ch? nhi?m
              </p>
            </div>

            {/* Summary Grid Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">Th�ng tin c� b?n</span>
                <div className="space-y-2 text-xs">
                  <div><span className="text-slate-400 font-bold">T�n ho?t �?ng:</span> <strong className="text-slate-800 text-sm block">{formData.name}</strong></div>
                  <div><span className="text-slate-400 font-bold">M?ch ho?t �?ng:</span> <strong className="text-slate-800">{ACTIVITY_STRANDS.find(s => s.id === formData.strand)?.name}</strong></div>
                  <div><span className="text-slate-400 font-bold">Lo?i ho?t �?ng:</span> <strong className="text-slate-800">{formData.activityTypeName}</strong></div>
                  <div><span className="text-slate-400 font-bold">Th?i gian:</span> <strong className="text-slate-800">{formData.date} ({formData.timeRange})</strong></div>
                  <div><span className="text-slate-400 font-bold">�?a �i?m:</span> <strong className="text-slate-800">{formData.location || 'Ch�a ghi'}</strong></div>
                  <div><span className="text-slate-400 font-bold">H?n n?p ��nh gi�:</span> <strong className="text-emerald-700">{formData.deadline || 'Theo k? ho?ch'}</strong></div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">Thi?t l?p ��nh gi� & L?p</span>
                <div className="space-y-2 text-xs">
                  <div><span className="text-slate-400 font-bold">H?nh th?c:</span> <strong className="text-slate-800">{evalMode === 'PARTICIPATION_ONLY' ? 'Ch? ghi nh?n tham gia' : '��nh gi� theo ti�u ch�'}</strong></div>
                  {evalMode === 'CRITERIA' && (
                    <>
                      <div><span className="text-slate-400 font-bold">S? ti�u ch�:</span> <strong className="text-slate-800">{criteria.length} ti�u ch� ({formulaType === 'EQUAL_WEIGHT' ? '�?ng tr?ng s?' : 'Theo tr?ng s?'})</strong></div>
                      <div>
                        <span className="text-slate-400 font-bold">Danh s�ch ti�u ch�:</span>
                        <ul className="list-disc pl-4 mt-1 text-[11px] text-slate-700 space-y-0.5">
                          {criteria.map((c, i) => (
                            <li key={c.id}>{c.name} {formulaType === 'WEIGHTED' ? `(${c.weight}%)` : ''} {c.isRequired ? '(B?t bu?c)' : ''}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-400 font-bold">L?p tham gia:</span>
                    <strong className="text-[#003B3A] ml-1">{assignedClasses.length} l?p</strong>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {assignedClasses.map(c => (
                        <span key={c.classId} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-black text-slate-700">
                          {c.className}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all"
              >
                Quay l?i B�?c 3
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(true)}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4 text-slate-500" />
                  <span>L�u b?n nh�p</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(false)}
                  className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-[#003B3A] via-[#00A99D] to-[#48BFE3] hover:from-[#002B2A] hover:to-[#008F85] text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-[#00A99D]/25 transition-all flex items-center justify-center gap-2.5 transform active:scale-95"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>Giao ho?t �?ng ngay</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
