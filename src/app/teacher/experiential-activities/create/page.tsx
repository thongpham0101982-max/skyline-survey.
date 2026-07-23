"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { 
  Info, Users, Settings, UserMinus, CheckSquare, 
  ChevronRight, ChevronLeft, Save, Send, UploadCloud, 
  Link as LinkIcon, Plus, X, Search, Trash2, CheckCircle2
} from 'lucide-react';

// Định nghĩa mapping cho các loại danh mục
const STEP3_TYPES = ['ROLE', 'EVAL_LEVEL', 'ACHIEVEMENT'];
const STEP5_TYPES = ['EVIDENCE_TYPE'];
const IGNORED_TYPES = ['SYSTEM_CATEGORY_TYPE', 'GROUP', 'TYPE', 'THEME', 'ABSENCE_REASON'];











function getDefaultAcademicYearClient(years: any[]) {
  if (!years || years.length === 0) return null;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("selectedAcademicYear");
    if (stored) {
      const year = years.find(y => y.id === stored);
      if (year) return year;
    }
  }
  return years.find(y => y.status === 'ACTIVE' && !y.isOff) || years.find(y => !y.isOff) || years[0];
}

function getAbbreviation(str: string) {
  if (!str) return '';
  const noAccents = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStudentsData, setSelectedStudentsData] = useState<any[]>([]);



  const router = useRouter();
  const [step, setStep] = useState(1);
  const [catalogs, setCatalogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [systemTypes, setSystemTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dynamic form states
  const [info, setInfo] = useState<Record<string, any>>({ 
    name: '', academicYear: '2025-2026', date: '', semester: '1' 
  });
  const [targetMode, setTargetMode] = useState<'class' | 'student'>('class');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilterLevel, setStudentFilterLevel] = useState('');
  const [studentFilterClass, setStudentFilterClass] = useState('');
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [target, setTarget] = useState({
    levels: [] as string[],
    grades: [] as string[],
    classes: [] as string[],
    specificStudents: [] as string[]
  });
  const [defaults, setDefaults] = useState<Record<string, any>>({ 
    allParticipate: true 
  });
  const [exceptions, setExceptions] = useState({ outstanding: [], absent: [], achievements: [] });
  const [studentResults, setStudentResults] = useState<Record<string, Record<string, any>>>({});
  const [isAddingResult, setIsAddingResult] = useState(false);
  const [selectedResultStudent, setSelectedResultStudent] = useState<any>(null);
  const [currentStudentResult, setCurrentStudentResult] = useState<Record<string, any>>({});
  const [studentResultSearch, setStudentResultSearch] = useState('');
  const [resultSearchResults, setResultSearchResults] = useState<any[]>([]);
  const [isSearchingResult, setIsSearchingResult] = useState(false);

  useEffect(() => {
    if (studentResultSearch.length < 2 || !info.academicYear) {
      setResultSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearchingResult(true);
      fetch(`/api/students/search?academicYearId=${info.academicYear}&q=${encodeURIComponent(studentResultSearch)}`)
        .then(res => res.json())
        .then(data => setResultSearchResults(data || []))
        .catch(console.error)
        .finally(() => setIsSearchingResult(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [studentResultSearch, info.academicYear]);

  const saveStudentResult = () => {
    if (selectedResultStudent) {
      const step3Fields = systemTypes.filter((sys: any) => STEP3_TYPES.includes(sys.code));
      for (const sys of step3Fields) {
        const options = getOptionsForType(sys.code);
        if (options && options.length > 0) {
          if (!currentStudentResult[sys.code]) {
            alert(`Vui lòng chọn ${sys.name} cho học sinh!`);
            return;
          }
        }
      }
      setStudentResults({
        ...studentResults,
        [selectedResultStudent.id]: {
          student: selectedResultStudent,
          result: currentStudentResult
        }
      });
      setIsAddingResult(false);
      setSelectedResultStudent(null);
      setCurrentStudentResult({});
      setStudentResultSearch('');
    }
  };


  const [evidence, setEvidence] = useState<Record<string, any>>({ 
    photos: '', pdfs: '', oneDrive: '', gDrive: '', youtube: '', desc: '' 
  });

  const [generatedCode, setGeneratedCode] = useState('');

  useEffect(() => {
    fetch('/api/academic-years')
      .then(res => res.json())
      .then(data => {
        setAcademicYears(data || []);
        if (data && data.length > 0) {
          const defaultYear = getDefaultAcademicYearClient(data);
          setInfo(prev => ({ ...prev, academicYear: defaultYear ? defaultYear.id : data[0].id }));
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (info.academicYear) {
      fetch(`/api/classes?academicYearId=${info.academicYear}`)
        .then(res => res.json())
        .then(data => setAllClasses(data || []))
        .catch(console.error);
    }
  }, [info.academicYear]);

  useEffect(() => {
    if (!studentSearch || studentSearch.length < 2 || !info.academicYear) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/students/search?academicYearId=${info.academicYear}&q=${encodeURIComponent(studentSearch)}`)
        .then(res => res.json())
        .then(data => setSearchResults(data || []))
        .catch(console.error)
        .finally(() => setIsSearching(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [studentSearch, info.academicYear]);

  



  useEffect(() => {
    if (studentFilterClass && info.academicYear) {
      fetch(`/api/students/search?academicYearId=${info.academicYear}&classId=${studentFilterClass}`)
        .then(res => res.json())
        .then(data => setClassStudents(data || []))
        .catch(console.error);
    } else {
      setClassStudents([]);
    }
  }, [studentFilterClass, info.academicYear]);

  const uniqueLevels = Array.from(new Set(allClasses.map(c => c.level)));
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
    } else if (level && level.toLowerCase().includes('mầm non')) {
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

  const availableGrades = Array.from(new Set(allClasses.filter(c => target.levels.includes(c.level)).map(c => c.grade))).sort((a,b) => parseInt(a) - parseInt(b));
  const availableClasses = allClasses.filter(c => target.grades.includes(c.grade)).sort((a,b) => a.className.localeCompare(b.className));

  useEffect(() => {
    if (info.academicYear) {
      const yearParts = info.academicYear.split('-');
      if (yearParts.length === 2) {
        const endYear = yearParts[1].slice(-2);
        // Auto-generated by server
      }
    }
  }, [info.academicYear]);

  const infoName = info.name;
  const infoGrou = info.GROU;
  useEffect(() => {
    if (infoName && infoGrou && categories.length > 0) {
      const abbr = getAbbreviation(infoName);
      const grouCat = categories.find((c: any) => c.type === 'GROU' && c.code === infoGrou);
      if (grouCat) {
        const groupCat = categories.find((c: any) => c.type === 'GROUP' && c.name.trim().toLowerCase() === grouCat.name.trim().toLowerCase());
        const groupCode = groupCat ? groupCat.code : grouCat.code;
        const groupId = groupCat ? groupCat.id : null;
        
        if (groupId) {
          const countInGroup = catalogs.filter((cat: any) => cat.groupId === groupId).length;
          const stt = String(countInGroup + 1).padStart(2, '0');
          const code = `${abbr}-${groupCode}-${stt}`;
          setGeneratedCode(code);
          setInfo(prev => {
            if (prev.code === code) return prev;
            return { ...prev, code };
          });
        } else {
          const code = `${abbr}-${groupCode}-01`;
          setGeneratedCode(code);
          setInfo(prev => {
            if (prev.code === code) return prev;
            return { ...prev, code };
          });
        }
      }
    } else {
      setGeneratedCode('');
      setInfo(prev => {
        if (!prev.code) return prev;
        const { code, ...rest } = prev;
        return rest;
      });
    }
  }, [infoName, infoGrou, categories, catalogs]);


  useEffect(() => {
    Promise.all([
      fetch('/api/activities/catalog').then(r => r.json()),
      fetch('/api/activities/categories').then(r => r.json())
    ]).then(([catRes, catesRes]) => {
      if (catRes.success) setCatalogs(catRes.data);
      if (catesRes.success) {
        setCategories(catesRes.data);
        const sysTypes = catesRes.data
          .filter((c: any) => c.type === 'SYSTEM_CATEGORY_TYPE' && c.status === 'ACTIVE' && !c.name.toLowerCase().includes('mức độ') && !c.name.toLowerCase().includes('kết quả'))
          .sort((a: any, b: any) => a.sortOrder - b.sortOrder);
        setSystemTypes(sysTypes);
        
        // Initialize dynamic fields
        const newInfo = { ...info };
        const newDefaults = { ...defaults };
        const newEvidence = { ...evidence };

        sysTypes.forEach((sys: any) => {
          if (IGNORED_TYPES.includes(sys.code) || sys.name.toLowerCase().includes('mức độ') || sys.name.toLowerCase().includes('kết quả')) return;
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
    });
  }, []);

  const handleNext = () => {
    if (step === 1) {
      if (!info.GROU) {
        alert('Vui lòng chọn Nhóm hoạt động!');
        return;
      }
      if (!info.name || !info.name.trim()) {
        alert('Vui lòng nhập Tên hoạt động!');
        return;
      }
      if (!info.academicYear) {
        alert('Vui lòng chọn Năm học!');
        return;
      }
      if (!info.date) {
        alert('Vui lòng chọn Ngày tổ chức!');
        return;
      }

      const step1Fields = systemTypes.filter(
        (sys: any) => !IGNORED_TYPES.includes(sys.code) && !STEP3_TYPES.includes(sys.code) && !STEP5_TYPES.includes(sys.code) && sys.code !== 'GROU'
      );
      for (const sys of step1Fields) {
        const options = getOptionsForType(sys.code);
        if (options && options.length > 0) {
          if (!info[sys.code]) {
            alert(`Vui lòng chọn ${sys.name}!`);
            return;
          }
        }
      }
    } else if (step === 2) {
      if (targetMode === 'class') {
        if (!target.classes || target.classes.length === 0) {
          alert('Vui lòng chọn ít nhất một lớp học!');
          return;
        }
      } else if (targetMode === 'student') {
        if (!target.specificStudents || target.specificStudents.length === 0) {
          alert('Vui lòng chọn ít nhất một học sinh!');
          return;
        }
      }
    } else if (step === 3) {
      if (defaults.allParticipate) {
        const step3Fields = systemTypes.filter((sys: any) => STEP3_TYPES.includes(sys.code));
        for (const sys of step3Fields) {
          const options = getOptionsForType(sys.code);
          if (options && options.length > 0) {
            if (!defaults[sys.code]) {
              alert(`Vui lòng chọn ${sys.name} mặc định!`);
              return;
            }
          }
        }
      }
    }
    setStep(step + 1);
  };


  const handleSubmit = async (isDraft: boolean) => {
    if (!info.GROU) {
      alert('Vui lòng chọn Nhóm hoạt động!');
      setStep(1);
      return;
    }
    if (!info.name || !info.name.trim()) {
      alert('Vui lòng nhập Tên hoạt động!');
      setStep(1);
      return;
    }
    if (!info.academicYear) {
      alert('Vui lòng chọn Năm học!');
      setStep(1);
      return;
    }
    if (!info.date) {
      alert('Vui lòng chọn Ngày tổ chức!');
      setStep(1);
      return;
    }

    const step1Fields = systemTypes.filter(
      (sys: any) => !IGNORED_TYPES.includes(sys.code) && !STEP3_TYPES.includes(sys.code) && !STEP5_TYPES.includes(sys.code) && sys.code !== 'GROU'
    );
    for (const sys of step1Fields) {
      const options = getOptionsForType(sys.code);
      if (options && options.length > 0) {
        if (!info[sys.code]) {
          alert(`Vui lòng chọn ${sys.name}!`);
          setStep(1);
          return;
        }
      }
    }

    if (targetMode === 'class') {
      if (!target.classes || target.classes.length === 0) {
        alert('Vui lòng chọn ít nhất một lớp học ở bước đối tượng!');
        setStep(2);
        return;
      }
    } else if (targetMode === 'student') {
      if (!target.specificStudents || target.specificStudents.length === 0) {
        alert('Vui lòng chọn ít nhất một học sinh ở bước đối tượng!');
        setStep(2);
        return;
      }
    }

    if (defaults.allParticipate) {
      const step3Fields = systemTypes.filter((sys: any) => STEP3_TYPES.includes(sys.code));
      for (const sys of step3Fields) {
        const options = getOptionsForType(sys.code);
        if (options && options.length > 0) {
          if (!defaults[sys.code]) {
            alert(`Vui lòng chọn ${sys.name} mặc định ở bước thiết lập!`);
            setStep(3);
            return;
          }
        }
      }
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



  const steps = [
    { id: 1, title: 'Thông tin chung', icon: Info, desc: 'Kế hoạch & phân loại' },
    { id: 2, title: 'Đối tượng', icon: Users, desc: 'Phạm vi tham gia' },
    { id: 3, title: 'Thiết lập', icon: Settings, desc: 'Đánh giá mặc định' },
    { id: 4, title: 'Kết quả', icon: CheckSquare, desc: 'Kết quả cá nhân' },
    ];

  const getOptionsForType = (typeCode: string) => {
    return categories
      .filter((c: any) => c.type === typeCode && c.status === 'ACTIVE')
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  };

  const renderDynamicField = (sys: any, stateValue: string, onChange: (val: string) => void) => {
    const options = getOptionsForType(sys.code) as any[];
    return (
      <div key={sys.code} className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
        <label className="text-sm font-bold text-slate-700">{sys.name} <span className="text-rose-500">*</span></label>
        <select 
          className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
          value={stateValue || ''} 
          onChange={e => onChange(e.target.value)}
        >
          <option value="">-- Chọn {sys.name.toLowerCase()} --</option>
          {options.map((opt: any) => (
            <option key={opt.id} value={opt.code}>{opt.name}</option>
          ))}
        </select>
      </div>
    );
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00A99D]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#00A99D]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Thêm mới Hoạt động</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">Khai báo thông tin và minh chứng Hoạt động trải nghiệm</p>
          </div>
        </div>

        {/* STEPPER */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 overflow-x-auto scrollbar-hide">
          <div className="flex justify-between items-center min-w-[600px] px-2">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isPast = step > s.id;
              return (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center relative group w-24">
                    <button 
                      onClick={() => isPast && setStep(s.id)}
                      disabled={!isPast && !isActive}
                      className={"w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 z-10 " + (
                        isActive ? 'bg-[#00A99D] text-white shadow-lg shadow-[#00A99D]/30 scale-110' : 
                        isPast ? 'bg-[#00A99D]/20 text-[#00A99D] cursor-pointer hover:bg-[#00A99D]/30' : 
                        'bg-slate-100 text-slate-400 cursor-not-allowed'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                    <div className={"mt-3 text-center transition-all " + (isActive ? 'opacity-100 scale-100' : 'opacity-60 scale-95')}>
                      <div className={"text-xs font-black uppercase tracking-wider " + (isActive ? 'text-[#00A99D]' : 'text-slate-500')}>{s.title}</div>
                    </div>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="flex-1 h-1 bg-slate-100 rounded-full mx-2 relative overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-[#00A99D] transition-all duration-500 ease-in-out"
                        style={{ width: isPast ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* MAIN FORM AREA */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden relative min-h-[500px] flex flex-col">
          <div className="p-6 md:p-8 flex-1">
            
            {/* Step 1: Info */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-lg font-black text-slate-800">1. Thông tin chung</h2>
                  <p className="text-sm text-slate-500 font-medium">Chọn hoạt động và các thuộc tính phân loại</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Nhóm hoạt động <span className="text-rose-500">*</span></label>
                    <select 
                      className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
                      value={info.GROU || ''} 
                      onChange={e => setInfo({...info, GROU: e.target.value})}
                    >
                      <option value="">-- Chọn nhóm hoạt động --</option>
                      {getOptionsForType('GROU').map((opt: any) => (
                        <option key={opt.id} value={opt.code}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Tên hoạt động <span className="text-rose-500">*</span></label>
                    <input 
                      type="text"
                      placeholder="Nhập tên hoạt động cụ thể..."
                      className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-bold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
                      value={info.name || ''} 
                      onChange={e => setInfo({...info, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Năm học <span className="text-rose-500">*</span></label>
                    <select 
                      className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
                      value={info.academicYear} 
                      onChange={e => setInfo({...info, academicYear: e.target.value})}
                    >
                      {academicYears.length === 0 && <option value="">Đang tải...</option>}
                      {academicYears.map(year => (
                        <option key={year.id} value={year.id}>{year.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Mã hoạt động (Tự sinh)</label>
                    <input 
                      type="text" 
                      readOnly
                      className="w-full bg-slate-100 border-0 ring-1 ring-slate-200 text-[#00A99D] text-sm font-black rounded-xl block p-3.5 opacity-80 cursor-not-allowed"
                      value={generatedCode} 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Ngày tổ chức <span className="text-rose-500">*</span></label>
                    <input 
                      type="date" 
                      className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
                      value={info.date} 
                      onChange={e => setInfo({...info, date: e.target.value})} 
                    />
                  </div>

                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Học kỳ</label>
                    <select 
                      className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
                      value={info.semester} 
                      onChange={e => setInfo({...info, semester: e.target.value})}
                    >
                      <option value="1">Học kỳ 1</option>
                      <option value="2">Học kỳ 2</option>
                      <option value="3">Học kỳ Hè</option>
                    </select>
                  </div>

                  {/* DYNAMIC FIELDS cho Step 1 */}
                  {systemTypes
                    .filter((sys: any) => !IGNORED_TYPES.includes(sys.code) && !STEP3_TYPES.includes(sys.code) && !STEP5_TYPES.includes(sys.code) && sys.code !== 'GROU')
                    .map((sys: any) => renderDynamicField(sys, info[sys.code], (val) => setInfo({...info, [sys.code]: val})))}

                </div>
              </div>
            )}

            {/* Step 2: Target */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-lg font-black text-slate-800">2. Đối tượng tham gia</h2>
                  <p className="text-sm text-slate-500 font-medium">Phạm vi học sinh tham gia hoạt động này</p>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-full max-w-sm mb-6">
                  <button
                    onClick={() => setTargetMode('class')}
                    className={"flex-1 py-2 text-sm font-bold rounded-xl transition-all " + (targetMode === 'class' ? "bg-white text-[#00A99D] shadow-sm" : "text-slate-500 hover:text-slate-700")}
                  >
                    Theo Khối/Lớp
                  </button>
                  <button
                    onClick={() => setTargetMode('student')}
                    className={"flex-1 py-2 text-sm font-bold rounded-xl transition-all " + (targetMode === 'student' ? "bg-white text-[#00A99D] shadow-sm" : "text-slate-500 hover:text-slate-700")}
                  >
                    Theo Học sinh lẻ
                  </button>
                </div>

                {targetMode === 'class' && (
                  <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
                    {/* Bậc học */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">1. Chọn Bậc học</label>
                      <div className="flex flex-wrap gap-2">
                        {availableLevels.map(lvl => (
                          <button
                            key={lvl.id}
                            onClick={() => {
                              const isSelected = lvl.originalLevels.some((l: any) => target.levels.includes(l));
                              const newLevels = isSelected
                                ? target.levels.filter((l: any) => !lvl.originalLevels.includes(l))
                                : [...target.levels, ...lvl.originalLevels];
                              setTarget({ ...target, levels: newLevels, grades: [], classes: [] });
                            }}
                            className={"px-4 py-2 rounded-xl border text-sm font-bold transition-all " + (lvl.originalLevels.some((l: any) => target.levels.includes(l)) ? "bg-[#00A99D]/10 border-[#00A99D] text-[#00A99D] shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
                          >
                            {lvl.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Khối */}
                    <div className={"space-y-2 transition-all duration-300 " + (target.levels.length === 0 ? 'opacity-50 grayscale pointer-events-none' : '')}>
                      <label className="text-sm font-bold text-slate-700">2. Chọn Khối</label>
                      {target.levels.length === 0 ? (
                        <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">Vui lòng chọn Bậc học để xem danh sách Khối.</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {availableGrades.map(grade => (
                            <button
                              key={grade}
                              onClick={() => {
                                const newGrades = target.grades.includes(grade)
                                  ? target.grades.filter((g: any) => g !== grade)
                                  : [...target.grades, grade];
                                setTarget({ ...target, grades: newGrades, classes: [] });
                              }}
                              className={"px-4 py-2 rounded-xl border text-sm font-bold transition-all " + (target.grades.includes(grade) ? "bg-[#00A99D]/10 border-[#00A99D] text-[#00A99D] shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
                            >
                              Khối {grade}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Lớp */}
                    <div className={"space-y-2 transition-all duration-300 " + (target.grades.length === 0 ? 'opacity-50 grayscale pointer-events-none' : '')}>
                      <label className="text-sm font-bold text-slate-700 flex justify-between">
                        <span>3. Chọn Lớp</span>
                        {target.grades.length > 0 && (
                          <button 
                            className="text-[#00A99D] text-xs font-semibold hover:underline"
                            onClick={() => {
                              const allClasses = availableClasses.map(c => c.id);
                              setTarget({ ...target, classes: allClasses });
                            }}
                          >
                            Chọn tất cả lớp
                          </button>
                        )}
                      </label>
                      {target.grades.length === 0 ? (
                        <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">Vui lòng chọn Khối để xem danh sách Lớp.</div>
                      ) : (
                        <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                          {availableClasses.map(cls => (
                            <button
                              key={cls.id}
                              onClick={() => {
                                const newClasses = target.classes.includes(cls.id)
                                  ? target.classes.filter((c: any) => c !== cls.id)
                                  : [...target.classes, cls.id];
                                setTarget({ ...target, classes: newClasses });
                              }}
                              className={"px-3 py-1.5 rounded-lg border text-sm font-bold transition-all " + (target.classes.includes(cls.id) ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
                            >{cls.className}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {targetMode === 'student' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex gap-3">
                      <Info className="w-5 h-5 text-blue-500 shrink-0" />
                      <p className="text-sm text-blue-800 font-medium">Chế độ này cho phép bạn chọn đích danh học sinh tham gia từ bất kỳ lớp nào (thường dùng cho CLB, đội tuyển, ...). Học sinh được chọn ở đây sẽ ghi đè lên thiết lập Khối/Lớp bên tab kia.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Cột trái: Tìm kiếm */}
                      <div className="space-y-3">

                        {/* Chọn Khối / Lớp */}
                        <div className="flex gap-2 mb-2">
                          <select 
                            className="w-1/2 bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3 transition-all"
                            value={studentFilterLevel}
                            onChange={e => {
                              setStudentFilterLevel(e.target.value);
                              setStudentFilterClass('');
                            }}
                          >
                            <option value="">-- Chọn Khối --</option>
                            {availableLevels.map((lvl: any) => (
                              <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
                            ))}
                          </select>
                          <select 
                            className="w-1/2 bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3 transition-all"
                            value={studentFilterClass}
                            onChange={e => setStudentFilterClass(e.target.value)}
                            disabled={!studentFilterLevel}
                          >
                            <option value="">-- Chọn Lớp --</option>
                            {allClasses
                              .filter(c => {
                                const levelDef = availableLevels.find((l: any) => l.id === studentFilterLevel);
                                return levelDef && levelDef.originalLevels.includes(c.level);
                              })
                              .map(c => (
                                <option key={c.id} value={c.id}>{c.className}</option>
                              ))}
                          </select>
                        </div>
                        <label className="text-sm font-bold text-slate-700">Tìm và thêm học sinh</label>
                        <div className="relative">
                          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                          <input 
                            type="text"
                            placeholder="Gõ tên hoặc mã HS..."
                            className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 pl-11 transition-all"
                            value={studentSearch}
                            onChange={e => setStudentSearch(e.target.value)}
                          />
                        </div>
                        
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                          {(studentFilterClass ? classStudents : searchResults).map(student => (
                            <div key={student.id} className="flex items-center justify-between p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0">
                              <div>
                                <div className="text-sm font-bold text-slate-800">{student.name}</div>
                                <div className="text-xs font-medium text-slate-500">{student.code} • {student.class?.className}</div>
                              </div>
                              <button
                                onClick={() => {
                                  if (!target.specificStudents.includes(student.id)) {
                                    setTarget({...target, specificStudents: [...target.specificStudents, student.id]}); if (!selectedStudentsData.find(s => s.id === student.id)) setSelectedStudentsData([...selectedStudentsData, student]);
                                  }
                                }}
                                disabled={target.specificStudents.includes(student.id)}
                                className={"px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (target.specificStudents.includes(student.id) ? "bg-slate-100 text-slate-400" : "bg-[#00A99D]/10 text-[#00A99D] hover:bg-[#00A99D]/20")}
                              >
                                {target.specificStudents.includes(student.id) ? 'Đã thêm' : 'Thêm'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cột phải: Danh sách đã chọn */}
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 flex justify-between items-center">
                          <span>Danh sách đã chọn ({target.specificStudents.length})</span>
                          {target.specificStudents.length > 0 && (
                            <button onClick={() => { setTarget({...target, specificStudents: []}); setSelectedStudentsData([]); }} className="text-xs text-rose-500 hover:underline">Xóa tất cả</button>
                          )}
                        </label>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 min-h-[300px] flex flex-col gap-2">
                          {target.specificStudents.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-400 italic">Chưa có học sinh nào</div>
                          ) : (
                            target.specificStudents.map(id => {
                              const s = selectedStudentsData.find(x => x.id === id);
                              if (!s) return null;
                              return (
                                <div key={s.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                  <div>
                                    <div className="text-sm font-bold text-slate-700">{s.name}</div>
                                    <div className="text-xs font-medium text-slate-500">{s.code} • {s.class?.className || (typeof s.class === "string" ? s.class : "")}</div>
                                  </div>
                                  <button onClick={() => { setTarget({...target, specificStudents: target.specificStudents.filter(x => x !== s.id)}); setSelectedStudentsData(selectedStudentsData.filter(x => x.id !== s.id)); }} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
{/* Step 3: Defaults */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-lg font-black text-slate-800">3. Thiết lập kết quả mặc định</h2>
                  <p className="text-sm text-slate-500 font-medium">Gán kết quả tự động cho tất cả học sinh trong danh sách</p>
                </div>
                
                <div className="bg-[#00A99D]/5 border border-[#00A99D]/20 rounded-2xl p-5 mb-8">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-slate-300 text-[#00A99D] focus:ring-[#00A99D]"
                      checked={defaults.allParticipate} 
                      onChange={e => setDefaults({...defaults, allParticipate: e.target.checked})} 
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">Áp dụng mặc định cho tất cả</span>
                      <span className="text-xs text-slate-500 font-medium">Chỉ cần nhập những em có kết quả khác biệt ở Bước 4</span>
                    </div>
                  </label>
                </div>

                {defaults.allParticipate && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                    {/* DYNAMIC FIELDS cho Step 3 */}
                    {systemTypes
                      .filter((sys: any) => STEP3_TYPES.includes(sys.code))
                      .map((sys: any) => renderDynamicField(sys, defaults[sys.code], (val) => setDefaults({...defaults, [sys.code]: val})))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Exceptions */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-lg font-black text-slate-800">4. Kết quả cá nhân</h2>
                  <p className="text-sm text-slate-500 font-medium">Ghi nhận học sinh có kết quả khác biệt so với mặc định</p>
                </div>
                
                {!isAddingResult ? (
                  <>
                    {Object.keys(studentResults).length === 0 ? (
                      <div className="bg-slate-50/80 p-8 rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center">
                          <Users className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-700">Chưa có kết quả cá nhân nào</h3>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm">
                            Bạn có thể chọn từng học sinh để thay đổi đánh giá cá nhân.
                          </p>
                        </div>
                        <div className="flex gap-3 mt-2">
                          <button onClick={() => setIsAddingResult(true)} className="px-4 py-2 bg-white ring-1 ring-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-100 transition-all shadow-sm">
                            + Thêm kết quả
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <button onClick={() => setIsAddingResult(true)} className="px-4 py-2 bg-white ring-1 ring-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-100 transition-all shadow-sm">
                            + Thêm kết quả
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {Object.values(studentResults).map((item: any) => (
                            <div key={item.student.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                              <div>
                                <div className="font-bold text-slate-700">{item.student.name} <span className="text-xs text-slate-400 font-normal">({item.student.code})</span></div>
                                <div className="text-xs text-slate-500 mt-1 flex gap-2">
                                  {systemTypes.filter((sys: any) => STEP3_TYPES.includes(sys.code)).map((sys: any) => {
                                    const val = item.result[sys.code];
                                    if (!val) return null;
                                    const options = getOptionsForType(sys.code) as any[];
                                    const optName = options.find((o: any) => o.code === val)?.name || val;
                                    return <span key={sys.code} className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{sys.name}: {optName}</span>;
                                  })}
                                </div>
                              </div>
                              <button onClick={() => {
                                const newResults = {...studentResults};
                                delete newResults[item.student.id];
                                setStudentResults(newResults);
                              }} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <h3 className="font-bold text-slate-800">Thêm kết quả cá nhân</h3>
                      <button onClick={() => { setIsAddingResult(false); setSelectedResultStudent(null); }} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
                    </div>
                    
                    {!selectedResultStudent ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                          <input 
                            type="text"
                            placeholder="Gõ tên hoặc mã học sinh..."
                            className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 pl-11"
                            value={studentResultSearch}
                            onChange={e => setStudentResultSearch(e.target.value)}
                          />
                        </div>
                        {resultSearchResults.length > 0 && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
                            {resultSearchResults.map((student: any) => (
                              <div key={student.id} onClick={() => { setSelectedResultStudent(student); setCurrentStudentResult(defaults); }} className="p-3 border-b border-slate-100 hover:bg-slate-100 cursor-pointer flex justify-between items-center last:border-0">
                                <div>
                                  <div className="font-bold text-slate-700">{student.name}</div>
                                  <div className="text-xs text-slate-500">{student.code}</div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 p-3 bg-[#00A99D]/10 text-[#00A99D] rounded-xl">
                          <CheckCircle2 className="w-5 h-5" />
                          <div>
                            <div className="font-bold">{selectedResultStudent.name}</div>
                            <div className="text-xs opacity-80">{selectedResultStudent.code}</div>
                          </div>
                          <button onClick={() => setSelectedResultStudent(null)} className="ml-auto text-xs underline">Đổi HS</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {systemTypes
                            .filter((sys: any) => STEP3_TYPES.includes(sys.code))
                            .map((sys: any) => {
                              const options = getOptionsForType(sys.code) as any[];
                              return (
                                <div key={sys.code} className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
                                  <label className="text-sm font-bold text-slate-700">{sys.name}</label>
                                  <select 
                                    className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
                                    value={currentStudentResult[sys.code] || ''} 
                                    onChange={e => setCurrentStudentResult({...currentStudentResult, [sys.code]: e.target.value})}
                                  >
                                    <option value="">-- Chọn {sys.name.toLowerCase()} --</option>
                                    {options.map((opt: any) => (
                                      <option key={opt.id} value={opt.code}>{opt.name}</option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                          <button onClick={() => { setIsAddingResult(false); setSelectedResultStudent(null); }} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white ring-1 ring-slate-200 rounded-xl hover:bg-slate-50 transition-all">Hủy</button>
                          <button onClick={saveStudentResult} className="px-5 py-2.5 text-sm font-bold text-white bg-[#00A99D] rounded-xl hover:bg-[#009085] transition-all flex items-center gap-2">Lưu kết quả</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
            {/* FOOTER ACTIONS */}
          <div className="p-6 bg-slate-50/50 border-t border-slate-200/60 flex justify-between items-center rounded-b-3xl">
            <button 
              onClick={() => setStep(step - 1)} 
              disabled={step === 1}
              className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Quay lại
            </button>
            
            <div className="flex gap-3">
              {step === steps.length ? (
                <>
                  <button 
    onClick={() => handleSubmit(false)} 
    disabled={isSubmitting}
    className="px-8 py-2.5 text-sm font-bold text-white bg-[#00A99D] hover:bg-[#009085] hover:scale-105 active:scale-95 shadow-sm shadow-[#00A99D]/20 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Save className="w-4 h-4" /> {isSubmitting ? 'Đang lưu...' : 'Kết quả và lưu'}
  </button>
                </>
              ) : (
                <button 
                  onClick={handleNext} 
                  className="px-8 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 shadow-sm rounded-xl transition-all flex items-center gap-2"
                >
                  Tiếp tục <ChevronRight className="w-4 h-4" />
                </button>

              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
