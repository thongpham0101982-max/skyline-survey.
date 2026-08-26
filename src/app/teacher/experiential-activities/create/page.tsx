"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { 
  Info, Users, Settings, CheckSquare, 
  ArrowLeft, Save, Send, Plus, X, Search, Loader2,
  Calendar, Layers, CheckCircle2, FileText, Check, ChevronRight, Sparkles, Filter,
  School, Award, BookOpen, Clock, Tag
} from 'lucide-react';

const STEP3_TYPES = ['ROLE', 'EVAL_LEVEL', 'ACHIEVEMENT'];
const STEP5_TYPES = ['EVIDENCE_TYPE'];
const IGNORED_TYPES = ['SYSTEM_CATEGORY_TYPE', 'GROUP', 'TYPE', 'THEME', 'ABSENCE_REASON', 'YEAR'];

function getDefaultAcademicYearClient(years: any[]) {
  if (!Array.isArray(years) || years.length === 0) return null;
  return years.find(y => y?.status === 'ACTIVE' && !y?.isOff) || years.find(y => y?.status === 'ACTIVE') || years.find(y => !y?.isOff) || years[0];
}

function getAbbreviation(str: string) {
  if (!str) return '';
  const noAccents = str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  const capitalized = noAccents
    .split(/\s+/)
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  return capitalized.replace(/[^A-Z]/g, '');
}

export default function CreateActivityWizard() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<number>(1);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [systemTypes, setSystemTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dynamic form states
  const [info, setInfo] = useState<Record<string, any>>({ 
    name: '', academicYear: '', date: '', semester: '1' 
  });
  const [targetMode, setTargetMode] = useState<'class' | 'student'>('class');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilterLevel, setStudentFilterLevel] = useState('');
  const [studentFilterClass, setStudentFilterClass] = useState('');
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [target, setTarget] = useState({
    levels: [] as string[],
    campuses: [] as string[],
    grades: [] as string[],
    classes: [] as string[],
    specificStudents: [] as string[]
  });
  const [defaults, setDefaults] = useState<Record<string, any>>({ 
    allParticipate: true 
  });
  const [exceptions, setExceptions] = useState({ outstanding: [], absent: [], achievements: [] });
  const [studentResults, setStudentResults] = useState<Record<string, Record<string, any>>>({});

  const [evidence, setEvidence] = useState<Record<string, any>>({ 
    photos: '', pdfs: '', oneDrive: '', gDrive: '', youtube: '', desc: '' 
  });

  const [generatedCode, setGeneratedCode] = useState('');

  // 1. Load Academic Years
  useEffect(() => {
    fetch('/api/academic-years')
      .then(res => res.json())
      .then(data => {
        const yearList = Array.isArray(data) ? data : [];
        setAcademicYears(yearList);
        if (yearList.length > 0) {
          const defaultActiveYear = getDefaultAcademicYearClient(yearList);
          const finalYearId = defaultActiveYear ? defaultActiveYear.id : yearList[0].id;
          setInfo(prev => ({ ...prev, academicYear: finalYearId }));
        }
      })
      .catch(console.error);
  }, []);

  // 2. Load Classes when academic year changes
  useEffect(() => {
    if (info.academicYear) {
      fetch(`/api/classes?academicYearId=${info.academicYear}`)
        .then(res => res.json())
        .then(data => {
          const list = Array.isArray(data) ? data : [];
          setAllClasses(list);
          if (list.length > 0) {
            const allOriginalLevels = Array.from(new Set(list.map(c => c?.level).filter(Boolean)));
            setTarget(prev => ({ ...prev, levels: allOriginalLevels }));
          }
        })
        .catch(console.error);
    }
  }, [info.academicYear]);

  // 3. Search students by text query
  useEffect(() => {
    if (!studentSearch || studentSearch.length < 2 || !info.academicYear) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/students/search?academicYearId=${info.academicYear}&q=${encodeURIComponent(studentSearch)}`)
        .then(res => res.json())
        .then(data => setSearchResults(Array.isArray(data) ? data : []))
        .catch(console.error)
        .finally(() => setIsSearching(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [studentSearch, info.academicYear]);

  // 4. Fetch class students when class or grade dropdown is selected
  useEffect(() => {
    if (studentFilterClass && info.academicYear) {
      fetch(`/api/students/search?academicYearId=${info.academicYear}&classId=${studentFilterClass}`)
        .then(res => res.json())
        .then(data => setClassStudents(Array.isArray(data) ? data : []))
        .catch(console.error);
    } else if (studentFilterLevel && info.academicYear) {
      fetch(`/api/students/search?academicYearId=${info.academicYear}&grade=${studentFilterLevel}`)
        .then(res => res.json())
        .then(data => setClassStudents(Array.isArray(data) ? data : []))
        .catch(console.error);
    } else {
      setClassStudents([]);
    }
  }, [studentFilterClass, studentFilterLevel, info.academicYear]);

  const getCampusCodeOfClass = (c: any) => {
    if (c?.campus?.campusCode) return c.campus.campusCode.toUpperCase();
    if (c?.campus?.code) return c.campus.code.toUpperCase();
    const match = (c?.className || '').match(/CS\d+/i);
    if (match) return match[0].toUpperCase();
    return 'CS1';
  };

  const getCampusNameOfClass = (c: any) => {
    if (c?.campus?.campusName) return c.campus.campusName;
    if (c?.campus?.name) return c.campus.name;
    const code = getCampusCodeOfClass(c);
    const names: Record<string, string> = {
      'CS1': 'Sky-Line Riverside (CS1)',
      'CS2': 'Sky-Line Central (CS2)',
      'CS3': 'Sky-Line Beach-D (CS3)',
      'CS4': 'Sky-Line Hill (CS4)',
      'CS5': 'Sky-Line International (CS5)'
    };
    if (names[code]) return names[code];
    return 'Cơ sở ' + code;
  };

  const safeClasses = Array.isArray(allClasses) ? allClasses : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeCatalogs = Array.isArray(catalogs) ? catalogs : [];

  const uniqueLevels = Array.from(new Set(safeClasses.map(c => c?.level).filter(Boolean)));
  const mappedLevelsMap = new Map();
  uniqueLevels.forEach(level => {
    let name = level || 'Chưa phân loại';
    let id = level || 'none';
    if (level === 'Tieu hoc' || level === 'Tiểu học') {
      name = 'Bậc Tiểu học';
      id = 'Tieu-hoc-group';
    } else if (level === 'THCS') {
      name = 'Bậc THCS';
    } else if (level === 'THPT') {
      name = 'Bậc THPT';
    } else if (level && String(level).toLowerCase().includes('mầm non')) {
      name = 'Mầm non';
      id = 'Mam-non-group';
    }
    if (!mappedLevelsMap.has(id)) {
      mappedLevelsMap.set(id, { id, name, originalLevels: [level] });
    } else {
      mappedLevelsMap.get(id).originalLevels.push(level);
    }
  });
  const availableLevels = Array.from(mappedLevelsMap.values());

  // Filter Campuses based on selected Levels
  const campusMap = new Map();
  safeClasses
    .filter(c => target.levels.length === 0 || target.levels.includes(c?.level))
    .forEach(c => {
      const code = getCampusCodeOfClass(c);
      const name = getCampusNameOfClass(c);
      if (!campusMap.has(code)) {
        campusMap.set(code, { code, name });
      }
    });
  const availableCampuses = Array.from(campusMap.values()).sort((a, b) => a.code.localeCompare(b.code));

  // Filter grades matching selected levels & campuses
  const availableGrades = Array.from(new Set(
    safeClasses
      .filter(c => target.levels.length === 0 || target.levels.includes(c?.level))
      .filter(c => target.campuses.length === 0 || target.campuses.includes(getCampusCodeOfClass(c)))
      .map(c => c?.grade)
      .filter(Boolean)
  )).sort((a: any, b: any) => parseInt(a) - parseInt(b));

  const availableClasses = safeClasses
    .filter(c => target.levels.length === 0 || target.levels.includes(c?.level))
    .filter(c => target.campuses.length === 0 || target.campuses.includes(getCampusCodeOfClass(c)))
    .filter(c => target.grades.length === 0 || target.grades.includes(c?.grade))
    .sort((a: any, b: any) => (a?.className || '').localeCompare(b?.className || ''));

  const displayedStudents = studentSearch.trim().length >= 2 ? searchResults : ((studentFilterClass || studentFilterLevel) ? classStudents : []);

  // Code auto generation
  const infoName = info.name;
  const infoGrou = info.GROU;
  useEffect(() => {
    if (infoName && infoGrou && safeCategories.length > 0) {
      const abbr = getAbbreviation(infoName);
      const grouCat = safeCategories.find((c: any) => c?.type === 'GROU' && c?.code === infoGrou);
      if (grouCat) {
        const grouName = (grouCat.name || '').trim().toLowerCase();
        const groupCat = safeCategories.find((c: any) => c?.type === 'GROUP' && (c?.name || '').trim().toLowerCase() === grouName);
        const groupCode = groupCat ? groupCat.code : grouCat.code;
        const groupId = groupCat ? groupCat.id : null;
        
        if (groupId) {
          const countInGroup = safeCatalogs.filter((cat: any) => cat?.groupId === groupId).length;
          const stt = String(countInGroup + 1).padStart(2, '0');
          const code = `${abbr}-${groupCode}-${stt}`;
          setGeneratedCode(code);
          setInfo(prev => ({ ...prev, code }));
        } else {
          const code = `${abbr}-${groupCode}-01`;
          setGeneratedCode(code);
          setInfo(prev => ({ ...prev, code }));
        }
      }
    } else {
      setGeneratedCode('');
    }
  }, [infoName, infoGrou, categories, catalogs]);

  // Load Catalogs & Categories
  useEffect(() => {
    Promise.all([
      fetch('/api/activities/catalog').then(r => r.json()).catch(() => ({ success: false, data: [] })),
      fetch('/api/activities/categories').then(r => r.json()).catch(() => ({ success: false, data: [] }))
    ]).then(([catRes, catesRes]) => {
      if (catRes?.success && Array.isArray(catRes.data)) setCatalogs(catRes.data);
      if (catesRes?.success && Array.isArray(catesRes.data)) {
        setCategories(catesRes.data);
        const sysTypes = catesRes.data
          .filter((c: any) => c?.type === 'SYSTEM_CATEGORY_TYPE' && c?.status === 'ACTIVE' && !(c?.name || '').toLowerCase().includes('mức độ') && !(c?.name || '').toLowerCase().includes('kết quả') && !(c?.name || '').toLowerCase().includes('năm học') && c?.code !== 'YEAR')
          .sort((a: any, b: any) => (a?.sortOrder || 0) - (b?.sortOrder || 0));
        setSystemTypes(sysTypes);
        
        const newInfo = { ...info };
        const newDefaults = { ...defaults };
        const newEvidence = { ...evidence };

        sysTypes.forEach((sys: any) => {
          if (!sys?.code) return;
          const sysName = (sys.name || '').toLowerCase();
          if (IGNORED_TYPES.includes(sys.code) || sysName.includes('mức độ') || sysName.includes('kết quả')) return;
          if (STEP3_TYPES.includes(sys.code)) {
            newDefaults[sys.code] = '';
          } else if (STEP5_TYPES.includes(sys.code)) {
            newEvidence[sys.code] = '';
          } else {
            newInfo[sys.code] = '';
          }
        });
        
        setInfo(newInfo);
        setDefaults(newDefaults);
        setEvidence(newEvidence);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const getOptionsForType = (typeCode: string) => {
    if (!Array.isArray(categories)) return [];
    return categories
      .filter((c: any) => c?.type === typeCode && c?.status === 'ACTIVE')
      .sort((a: any, b: any) => (a?.sortOrder || 0) - (b?.sortOrder || 0));
  };

  const renderDynamicField = (sys: any, stateValue: string, onChange: (val: string) => void) => {
    if (!sys || !sys.code) return null;
    const options = getOptionsForType(sys.code) as any[];
    return (
      <div key={sys.code} className="space-y-2">
        <label className="text-xs font-bold text-slate-700">{sys.name || sys.code} <span className="text-rose-500">*</span></label>
        <div className="relative">
          <select 
            className="w-full bg-slate-50/80 border border-slate-200/90 text-slate-800 text-xs font-bold rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-3.5 outline-none transition-all appearance-none"
            value={stateValue || ''} 
            onChange={e => onChange(e.target.value)}
          >
            <option value="">-- Chọn {(sys.name || sys.code).toLowerCase()} --</option>
            {options.map((opt: any) => (
              <option key={opt.id} value={opt.code}>{opt.name}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            ▼
          </div>
        </div>
      </div>
    );
  };

  const validateStep = (stepNumber: number) => {
    if (stepNumber === 1) {
      if (!info.GROU) {
        alert('Vui lòng chọn Nhóm hoạt động!');
        return false;
      }
      if (!info.name || !info.name.trim()) {
        alert('Vui lòng nhập Tên hoạt động!');
        return false;
      }
      if (!info.date) {
        alert('Vui lòng chọn Ngày tổ chức!');
        return false;
      }
    } else if (stepNumber === 2) {
      if (targetMode === 'class') {
        if (!target.classes || target.classes.length === 0) {
          alert('Vui lòng chọn ít nhất một lớp học!');
          return false;
        }
      } else if (targetMode === 'student') {
        if (!target.specificStudents || target.specificStudents.length === 0) {
          alert('Vui lòng chọn ít nhất một học sinh!');
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!isDraft) {
      if (!validateStep(1) || !validateStep(2)) return;
    }

    setIsSubmitting(true);
    try {
      const payload = { info, target, defaults, studentResults, exceptions, evidence, isDraft };
      const res = await fetch('/api/experiential-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Đã lưu dữ liệu thành công!');
        router.push('/teacher/experiential-activities');
      } else {
        alert('Có lỗi xảy ra: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi gửi dữ liệu!');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/80">
        <div className="flex flex-col items-center gap-4 backdrop-blur-xl bg-white/80 p-8 rounded-3xl border border-white/90 shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
          <span className="text-xs font-black text-slate-600">Đang khởi tạo biểu mẫu hoạt động...</span>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, title: 'Thông tin chung', sub: 'Tên, nhóm, học kỳ & ngày tổ chức' },
    { num: 2, title: 'Đối tượng tham gia', sub: 'Bậc, cơ sở, khối & lớp áp dụng' },
    { num: 3, title: 'Đánh giá & Hoàn tất', sub: 'Mức độ, vai trò & lưu kế hoạch' },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-indigo-50/20 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden">
      
      {/* Background Ambient Glow Orbs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-gradient-to-br from-indigo-300/30 via-purple-300/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/4 -right-24 w-96 h-96 bg-gradient-to-bl from-cyan-300/30 via-teal-300/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-12 left-1/3 w-96 h-96 bg-gradient-to-tr from-pink-200/20 via-sky-200/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* TOP HERO BANNER (Glassmorphism & Action Bar) */}
        <div className="backdrop-blur-xl bg-white/85 rounded-3xl p-5 sm:p-6 border border-white/90 shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/teacher/experiential-activities" 
              className="w-11 h-11 rounded-2xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors shrink-0 shadow-2xs group"
              title="Quay lại danh sách"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 text-indigo-700 border border-indigo-200/60">
                  Tạo kế hoạch mới
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent tracking-tight">
                Hoạt động trải nghiệm
              </h1>
              <p className="text-xs text-slate-400 font-bold mt-0.5">Quy trình 3 bước thiết lập kế hoạch & cấu hình đánh giá khoa học</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button 
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-slate-100/90 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>Lưu nháp</span>
            </button>
            <button 
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-cyan-600 to-teal-500 hover:from-indigo-700 hover:to-teal-600 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all flex items-center gap-2 transform active:scale-95"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Hoàn tất & Lưu</span>
            </button>
          </div>
        </div>

        {/* STEPPER PROGRESS INDICATOR BAR (Floating Glass Pills) */}
        <div className="backdrop-blur-xl bg-white/80 p-2.5 rounded-2xl border border-white/90 shadow-md shadow-slate-200/40">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {steps.map(s => {
              const isCurrent = activeStep === s.num;
              const isDone = activeStep > s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => {
                    if (s.num < activeStep || validateStep(activeStep)) {
                      setActiveStep(s.num);
                    }
                  }}
                  className={`p-3.5 rounded-xl transition-all text-left flex items-start gap-3 border ${
                    isCurrent
                      ? 'bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-teal-500/10 border-indigo-400 text-indigo-700 shadow-sm ring-1 ring-indigo-400/50'
                      : isDone
                        ? 'bg-emerald-50/50 border-emerald-200 text-slate-700'
                        : 'bg-white/50 border-slate-200/60 text-slate-400 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-transform duration-300 ${
                    isCurrent
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-500/30 scale-105'
                      : isDone
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isDone ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{s.title}</p>
                    <p className="text-[10px] font-semibold opacity-80 truncate hidden sm:block mt-0.5">{s.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 1: Thông tin chung */}
        {activeStep === 1 && (
          <div className="backdrop-blur-xl bg-white/85 rounded-3xl p-6 sm:p-8 border border-white/90 shadow-xl shadow-slate-200/40 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2.5">
                  <span className="w-7 h-7 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-xs">1</span>
                  <span>Thông tin chung về Hoạt động</span>
                </h2>
                <p className="text-xs text-slate-400 font-bold mt-1">Khai báo thông tin định danh, nhóm chủ đề và ngày tổ chức</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-slate-700">Nhóm hoạt động <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-50/80 border border-slate-200/90 text-slate-800 text-xs font-bold rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-3.5 outline-none transition-all appearance-none"
                    value={info.GROU || ''} 
                    onChange={e => setInfo({...info, GROU: e.target.value})}
                  >
                    <option value="">-- Chọn nhóm hoạt động --</option>
                    {getOptionsForType('GROU').map((opt: any) => (
                      <option key={opt.id} value={opt.code}>{opt.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-slate-700">Tên hoạt động <span className="text-rose-500">*</span></label>
                <input 
                  type="text"
                  placeholder="Ví dụ: Chuyến đi thực tế tìm hiểu di tích lịch sử..."
                  className="w-full bg-slate-50/80 border border-slate-200/90 text-slate-800 text-xs font-black rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-3.5 outline-none transition-all placeholder:text-slate-400"
                  value={info.name || ''} 
                  onChange={e => setInfo({...info, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700">Mã hoạt động (Tự sinh)</label>
                <input 
                  type="text" 
                  readOnly
                  className="w-full bg-slate-100/90 border border-slate-200 text-indigo-700 text-xs font-black rounded-2xl block p-3.5 cursor-not-allowed shadow-inner tracking-wide"
                  value={generatedCode || 'HĐ-TỰ-SINH'} 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700">Ngày tổ chức <span className="text-rose-500">*</span></label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50/80 border border-slate-200/90 text-slate-800 text-xs font-bold rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-3.5 outline-none transition-all"
                  value={info.date} 
                  onChange={e => setInfo({...info, date: e.target.value})} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700">Học kỳ</label>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-50/80 border border-slate-200/90 text-slate-800 text-xs font-bold rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-3.5 outline-none transition-all appearance-none"
                    value={info.semester} 
                    onChange={e => setInfo({...info, semester: e.target.value})}
                  >
                    <option value="1">Học kỳ 1</option>
                    <option value="2">Học kỳ 2</option>
                    <option value="3">Học kỳ Hè</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>

              {/* Dynamic fields */}
              {systemTypes
                .filter((sys: any) => !IGNORED_TYPES.includes(sys?.code) && !STEP3_TYPES.includes(sys?.code) && !STEP5_TYPES.includes(sys?.code) && sys?.code !== 'GROU')
                .map((sys: any) => renderDynamicField(sys, info[sys.code], (val) => setInfo({...info, [sys.code]: val})))}

            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  if (validateStep(1)) setActiveStep(2);
                }}
                className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-cyan-600 to-teal-500 hover:from-indigo-700 hover:to-teal-600 text-white text-xs font-black rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all flex items-center gap-2 transform active:scale-95"
              >
                <span>Tiếp theo: Chọn đối tượng</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Đối tượng tham gia */}
        {activeStep === 2 && (
          <div className="backdrop-blur-xl bg-white/85 rounded-3xl p-6 sm:p-8 border border-white/90 shadow-xl shadow-slate-200/40 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2.5">
                  <span className="w-7 h-7 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-xs">2</span>
                  <span>Đối tượng tham gia <span className="text-rose-500">*</span></span>
                </h2>
                <p className="text-xs text-slate-400 font-bold mt-1">Chọn phạm vi tổ chức theo Khối / Lớp hoặc chỉ định theo Đội nhóm</p>
              </div>
            </div>

            {/* Target Mode Segmented Capsule */}
            <div className="flex bg-slate-100/90 p-1.5 rounded-2xl max-w-sm border border-slate-200/80 shadow-inner">
              <button
                onClick={() => setTargetMode('class')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                  targetMode === 'class' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Theo Khối / Lớp
              </button>
              <button
                onClick={() => setTargetMode('student')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                  targetMode === 'student' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Theo Đội / Nhóm
              </button>
            </div>

            {targetMode === 'class' ? (
              <div className="space-y-6">
                
                {/* 1. Bậc học Selector */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                    <span>1. Chọn Bậc học</span>
                    {target.levels.length > 0 && (
                      <button type="button" onClick={() => setTarget({ ...target, levels: [], campuses: [], grades: [], classes: [] })} className="text-[11px] font-bold text-rose-500 hover:underline">Bỏ chọn tất cả</button>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {availableLevels.map(lvl => {
                      const isSelected = lvl.originalLevels.some((l: any) => target.levels.includes(l));
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => {
                            const newLevels = isSelected
                              ? target.levels.filter((l: any) => !lvl.originalLevels.includes(l))
                              : [...target.levels, ...lvl.originalLevels];
                            setTarget({ ...target, levels: newLevels, campuses: [], grades: [], classes: [] });
                          }}
                          className={"px-4 py-2.5 rounded-2xl text-xs font-black transition-all border flex items-center gap-2 " + (
                            isSelected 
                              ? 'bg-gradient-to-r from-indigo-500/15 to-cyan-500/15 border-indigo-400 text-indigo-700 shadow-sm ring-1 ring-indigo-400' 
                              : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          <Check className={"w-3.5 h-3.5 " + (isSelected ? 'opacity-100 text-indigo-600' : 'opacity-0')} />
                          <span>{lvl.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Cơ sở Selector */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                    <span>2. Chọn Cơ sở</span>
                    {target.campuses.length > 0 && (
                      <button type="button" onClick={() => setTarget({ ...target, campuses: [], grades: [], classes: [] })} className="text-[11px] font-bold text-rose-500 hover:underline">Bỏ chọn tất cả</button>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {availableCampuses.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Chọn Bậc học ở trên để hiển thị cơ sở.</p>
                    ) : (
                      availableCampuses.map(cs => {
                        const isSelected = target.campuses.includes(cs.code);
                        return (
                          <button
                            key={cs.code}
                            type="button"
                            onClick={() => {
                              const newCampuses = isSelected
                                ? target.campuses.filter((c: string) => c !== cs.code)
                                : [...target.campuses, cs.code];
                              setTarget({ ...target, campuses: newCampuses, grades: [], classes: [] });
                            }}
                            className={"px-4 py-2.5 rounded-2xl text-xs font-black transition-all border flex items-center gap-2 " + (
                              isSelected 
                                ? 'bg-gradient-to-r from-cyan-500/15 to-teal-500/15 border-cyan-400 text-cyan-800 shadow-sm ring-1 ring-cyan-400' 
                                : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-50'
                            )}
                          >
                            <Check className={"w-3.5 h-3.5 " + (isSelected ? 'opacity-100 text-cyan-600' : 'opacity-0')} />
                            <span>{cs.name}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 3. Khối học Selector */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                    <span>3. Chọn Khối học</span>
                    {target.grades.length > 0 && (
                      <button type="button" onClick={() => setTarget({ ...target, grades: [], classes: [] })} className="text-[11px] font-bold text-rose-500 hover:underline">Bỏ chọn tất cả</button>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {availableGrades.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Chọn Bậc học và Cơ sở ở trên để hiển thị khối học.</p>
                    ) : (
                      availableGrades.map(grade => {
                        const isSelected = target.grades.includes(grade);
                        return (
                          <button
                            key={grade}
                            type="button"
                            onClick={() => {
                              const newGrades = isSelected
                                ? target.grades.filter((g: any) => g !== grade)
                                : [...target.grades, grade];
                              setTarget({ ...target, grades: newGrades, classes: [] });
                            }}
                            className={"px-4 py-2 rounded-2xl text-xs font-black transition-all border flex items-center gap-1.5 " + (
                              isSelected 
                                ? 'bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border-indigo-400 text-indigo-700 shadow-sm ring-1 ring-indigo-400' 
                                : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-50'
                            )}
                          >
                            <span>Khối {grade}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 4. Lớp học cụ thể Selector */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700">4. Chọn Lớp cụ thể ({target.classes.length} đã chọn)</label>
                    {availableClasses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = availableClasses.map(c => c.id);
                          const isAllSelected = availableClasses.length > 0 && availableClasses.every(c => target.classes.includes(c.id));
                          setTarget({ ...target, classes: isAllSelected ? [] : Array.from(new Set([...target.classes, ...allIds])) });
                        }}
                        className="text-xs font-black text-indigo-600 hover:underline"
                      >
                        {availableClasses.length > 0 && availableClasses.every(c => target.classes.includes(c.id)) ? 'Bỏ chọn tất cả lớp' : 'Chọn tất cả lớp'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                    {availableClasses.length === 0 ? (
                      <div className="col-span-full py-6 text-center text-xs text-slate-400 font-medium">
                        Chọn Bậc học, Cơ sở và Khối học ở trên để hiển thị danh sách lớp.
                      </div>
                    ) : (
                      availableClasses.map(cls => {
                        const isChecked = target.classes.includes(cls.id);
                        return (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => {
                              const newClasses = isChecked
                                ? target.classes.filter((c: any) => c !== cls.id)
                                : [...target.classes, cls.id];
                              setTarget({ ...target, classes: newClasses });
                            }}
                            className={"p-3 rounded-2xl border text-xs font-black transition-all text-left flex items-center justify-between " + (
                              isChecked
                                ? 'bg-white border-indigo-400 text-indigo-700 shadow-sm ring-1 ring-indigo-400'
                                : 'bg-white/80 border-slate-200 text-slate-600 hover:border-slate-300'
                            )}
                          >
                            <span className="truncate">{cls.className}</span>
                            <span className={"w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ml-2 " + (
                              isChecked ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-xs' : 'border border-slate-300'
                            )}>
                              {isChecked && <Check className="w-3 h-3" />}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            ) : (
              /* Specific Students Search Mode */
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-teal-500/10 border border-indigo-200/60 rounded-2xl text-xs text-slate-700 font-semibold leading-relaxed">
                  Chọn danh sách học sinh theo Đội/Nhóm áp dụng cho các CLB, đội tuyển ngoại khóa hoặc dự án chuyên đề. Học sinh được chọn ở đây sẽ được lập danh sách riêng.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <select 
                        className="w-1/2 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-3 outline-none"
                        value={studentFilterLevel}
                        onChange={e => {
                          setStudentFilterLevel(e.target.value);
                          setStudentFilterClass('');
                        }}
                      >
                        <option value="">-- Tất cả Khối --</option>
                        {Array.from(new Set(safeClasses.map((c: any) => c?.grade).filter(Boolean)))
                          .sort((a: any, b: any) => Number(a) - Number(b))
                          .map((grade: any) => (
                            <option key={grade} value={grade}>Khối {grade}</option>
                          ))}
                      </select>

                      <select 
                        className="w-1/2 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-3 outline-none"
                        value={studentFilterClass}
                        onChange={e => setStudentFilterClass(e.target.value)}
                      >
                        <option value="">-- Tất cả Lớp --</option>
                        {safeClasses
                          .filter((c: any) => !studentFilterLevel || String(c?.grade) === String(studentFilterLevel))
                          .map((cls: any) => (
                            <option key={cls.id} value={cls.id}>{cls.className}</option>
                          ))}
                      </select>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Tìm tên hoặc mã học sinh..." 
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl pl-10 pr-4 py-3 outline-none focus:border-indigo-500"
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                      />
                    </div>

                    <div className="border border-slate-200 rounded-2xl max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
                      {displayedStudents.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 font-medium">
                          Nhập tên hoặc chọn lớp để hiển thị danh sách học sinh.
                        </div>
                      ) : (
                        displayedStudents.map(st => {
                          const isAdded = (target.specificStudents || []).includes(st.id);
                          return (
                            <div key={st.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-all text-xs">
                              <div>
                                <p className="font-bold text-slate-800">{st.fullName || st.studentName || st.name}</p>
                                <p className="text-[10px] text-slate-400 font-semibold">{st.studentCode || st.code} • {st.className || st.class?.className || 'Lớp'}</p>
                              </div>
                              <button 
                                type="button"
                                onClick={() => {
                                  if (isAdded) {
                                    setTarget({ ...target, specificStudents: target.specificStudents.filter((id: string) => id !== st.id) });
                                  } else {
                                    setTarget({ ...target, specificStudents: [...(target.specificStudents || []), st.id] });
                                  }
                                }}
                                className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                                  isAdded ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}
                              >
                                {isAdded ? 'Xóa' : '+ Chọn'}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <p className="text-xs font-black text-slate-700">Đã chọn ({target.specificStudents.length} học sinh)</p>
                    <div className="max-h-64 overflow-y-auto space-y-1.5">
                      {target.specificStudents.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4 text-center">Chưa chọn học sinh nào.</p>
                      ) : (
                        target.specificStudents.map(id => (
                          <div key={id} className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-bold shadow-2xs">
                            <span className="truncate">{id}</span>
                            <button
                              type="button"
                              onClick={() => setTarget({ ...target, specificStudents: target.specificStudents.filter(sId => sId !== id) })}
                              className="text-rose-500 hover:text-rose-700 text-xs font-black ml-2"
                            >
                              Xóa
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveStep(1)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-200 transition-all"
              >
                Quay lại
              </button>
              <button
                onClick={() => {
                  if (validateStep(2)) setActiveStep(3);
                }}
                className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-cyan-600 to-teal-500 hover:from-indigo-700 hover:to-teal-600 text-white text-xs font-black rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all flex items-center gap-2 transform active:scale-95"
              >
                <span>Tiếp theo: Thiết lập đánh giá</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Thiết lập đánh giá mặc định */}
        {activeStep === 3 && (
          <div className="backdrop-blur-xl bg-white/85 rounded-3xl p-6 sm:p-8 border border-white/90 shadow-xl shadow-slate-200/40 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2.5">
                  <span className="w-7 h-7 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-xs">3</span>
                  <span>Thiết lập kết quả & Đánh giá mặc định</span>
                </h2>
                <p className="text-xs text-slate-400 font-bold mt-1">Gán nhanh giá trị mặc định cho toàn bộ danh sách học sinh tham gia</p>
              </div>
            </div>

            <div className="p-5 bg-gradient-to-br from-slate-50/90 to-indigo-50/40 rounded-2xl border border-slate-200/80 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  className="w-5 h-5 accent-indigo-600 rounded-lg cursor-pointer"
                  checked={defaults.allParticipate}
                  onChange={e => setDefaults({...defaults, allParticipate: e.target.checked})}
                />
                <div>
                  <p className="text-xs font-black text-slate-800">Áp dụng kết quả mặc định cho tất cả học sinh</p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Tự động gán vai trò & mức độ đánh giá đồng loạt (có thể chỉnh sửa từng em sau)</p>
                </div>
              </label>

              {defaults.allParticipate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200/80">
                  {systemTypes
                    .filter((sys: any) => STEP3_TYPES.includes(sys?.code))
                    .map((sys: any) => renderDynamicField(sys, defaults[sys.code], (val) => setDefaults({...defaults, [sys.code]: val})))}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveStep(2)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-200 transition-all"
              >
                Quay lại
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="px-7 py-3.5 bg-gradient-to-r from-indigo-600 via-cyan-600 to-teal-500 text-white text-xs sm:text-sm font-black rounded-2xl shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all flex items-center gap-2 transform active:scale-95"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Hoàn tất & Lưu hoạt động</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
