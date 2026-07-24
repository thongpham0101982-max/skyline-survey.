"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { 
  Info, Users, Settings, CheckSquare, 
  ArrowLeft, Save, Send, Plus, X, Search, Loader2
} from 'lucide-react';

// Định nghĩa mapping cho các loại danh mục
const STEP3_TYPES = ['ROLE', 'EVAL_LEVEL', 'ACHIEVEMENT'];
const STEP5_TYPES = ['EVIDENCE_TYPE'];
const IGNORED_TYPES = ['SYSTEM_CATEGORY_TYPE', 'GROUP', 'TYPE', 'THEME', 'ABSENCE_REASON'];

function getDefaultAcademicYearClient(years: any[]) {
  if (!Array.isArray(years) || years.length === 0) return null;
  return years.find(y => y?.status === 'ACTIVE' && !y?.isOff) || years.find(y => y?.status === 'ACTIVE') || years.find(y => !y?.isOff) || years[0];
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
  const router = useRouter();
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStudentsData, setSelectedStudentsData] = useState<any[]>([]);

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
  const [selectedStudentForResult, setSelectedStudentForResult] = useState<any>(null);
  const [tempIndividualResults, setTempIndividualResults] = useState<Record<string, any>>({});

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

  // 4. Fetch class students when class dropdown is selected
  useEffect(() => {
    if (studentFilterClass && info.academicYear) {
      fetch(`/api/students/search?academicYearId=${info.academicYear}&classId=${studentFilterClass}`)
        .then(res => res.json())
        .then(data => setClassStudents(Array.isArray(data) ? data : []))
        .catch(console.error);
    } else {
      setClassStudents([]);
    }
  }, [studentFilterClass, info.academicYear]);

  // Safe data wrappers
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

  const availableGrades = Array.from(new Set(safeClasses.filter(c => target.levels.includes(c?.level)).map(c => c?.grade).filter(Boolean))).sort((a,b) => parseInt(a) - parseInt(b));
  const availableClasses = safeClasses.filter(c => target.grades.includes(c?.grade)).sort((a,b) => (a?.className || '').localeCompare(b?.className || ''));

  const displayedStudents = studentSearch.trim().length >= 2 ? searchResults : (studentFilterClass ? classStudents : []);

  // 5. Code auto generation
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

  // 6. Load Catalogs & Categories
  useEffect(() => {
    Promise.all([
      fetch('/api/activities/catalog').then(r => r.json()).catch(() => ({ success: false, data: [] })),
      fetch('/api/activities/categories').then(r => r.json()).catch(() => ({ success: false, data: [] }))
    ]).then(([catRes, catesRes]) => {
      if (catRes?.success && Array.isArray(catRes.data)) setCatalogs(catRes.data);
      if (catesRes?.success && Array.isArray(catesRes.data)) {
        setCategories(catesRes.data);
        const sysTypes = catesRes.data
          .filter((c: any) => c?.type === 'SYSTEM_CATEGORY_TYPE' && c?.status === 'ACTIVE' && !(c?.name || '').toLowerCase().includes('mức độ') && !(c?.name || '').toLowerCase().includes('kết quả'))
          .sort((a: any, b: any) => (a?.sortOrder || 0) - (b?.sortOrder || 0));
        setSystemTypes(sysTypes);
        
        // Initialize dynamic fields
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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
      <div key={sys.code} className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
        <label className="text-sm font-bold text-slate-700">{sys.name || sys.code} <span className="text-rose-500">*</span></label>
        <select 
          className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
          value={stateValue || ''} 
          onChange={e => onChange(e.target.value)}
        >
          <option value="">-- Chọn {(sys.name || sys.code).toLowerCase()} --</option>
          {options.map((opt: any) => (
            <option key={opt.id} value={opt.code}>{opt.name}</option>
          ))}
        </select>
      </div>
    );
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!isDraft) {
      if (!info.GROU) {
        alert('Vui lòng chọn Nhóm hoạt động!');
        scrollToSection('section-1');
        return;
      }
      if (!info.name || !info.name.trim()) {
        alert('Vui lòng nhập Tên hoạt động!');
        scrollToSection('section-1');
        return;
      }
      if (!info.academicYear) {
        alert('Vui lòng chọn Năm học!');
        scrollToSection('section-1');
        return;
      }
      if (!info.date) {
        alert('Vui lòng chọn Ngày tổ chức!');
        scrollToSection('section-1');
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
            scrollToSection('section-1');
            return;
          }
        }
      }

      if (targetMode === 'class') {
        if (!target.classes || target.classes.length === 0) {
          alert('Vui lòng chọn ít nhất một lớp học ở phần Đối tượng tham gia!');
          scrollToSection('section-2');
          return;
        }
      } else if (targetMode === 'student') {
        if (!target.specificStudents || target.specificStudents.length === 0) {
          alert('Vui lòng chọn ít nhất một học sinh ở phần Đối tượng tham gia!');
          scrollToSection('section-2');
          return;
        }
      }

      if (defaults.allParticipate) {
        const step3Fields = systemTypes.filter((sys: any) => STEP3_TYPES.includes(sys.code));
        for (const sys of step3Fields) {
          const options = getOptionsForType(sys.code);
          if (options && options.length > 0) {
            if (!defaults[sys.code]) {
              alert(`Vui lòng chọn ${sys.name} mặc định ở phần thiết lập!`);
              scrollToSection('section-3');
              return;
            }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00A99D]"></div>
          <span className="text-xs font-bold text-slate-500">Đang tải dữ liệu biểu mẫu...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 font-sans">
      
      {/* MAIN CONTAINER */}
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* TOP HEADER */}
        <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div>
            <Link 
              href="/teacher/experiential-activities" 
              className="text-xs font-bold text-[#00A99D] hover:underline flex items-center gap-1.5 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Trở về danh sách hoạt động</span>
            </Link>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Tạo Hoạt động Trải nghiệm & Dự án</h1>
            <p className="text-xs text-slate-500 font-medium">Khai báo đầy đủ thông tin kế hoạch, chọn đối tượng và thiết lập đánh giá</p>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button 
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Lưu nháp</span>
            </button>
            <button 
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#00A99D] text-white text-xs font-bold rounded-xl hover:bg-[#009085] transition-all shadow-md flex items-center gap-1.5"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Hoàn tất & Lưu</span>
            </button>
          </div>
        </div>

        {/* Sticky Section Quick Nav */}
        <div className="sticky top-4 z-20 bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button 
              onClick={() => scrollToSection('section-1')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-[#00A99D] transition-all flex items-center gap-2"
            >
              <Info className="w-4 h-4 text-[#00A99D]" />
              <span>1. Thông tin chung</span>
            </button>

            <button 
              onClick={() => scrollToSection('section-2')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-[#00A99D] transition-all flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-[#00A99D]" />
              <span>2. Đối tượng</span>
            </button>

            <button 
              onClick={() => scrollToSection('section-3')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-[#00A99D] transition-all flex items-center gap-2"
            >
              <Settings className="w-4 h-4 text-[#00A99D]" />
              <span>3. Thiết lập kết quả</span>
            </button>

            
          </div>

          <div className="flex items-center gap-2 ml-auto sm:hidden">
            <button 
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
            >
              Lưu nháp
            </button>
            <button 
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-[#00A99D] text-white text-xs font-bold rounded-xl"
            >
              Lưu
            </button>
          </div>
        </div>

        {/* SECTION 1: Thông tin chung */}
        <div id="section-1" className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6 scroll-mt-24">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#00A99D]/10 text-[#00A99D] rounded-lg flex items-center justify-center text-sm font-black">1</span>
              <span>Thông tin chung</span>
            </h2>
            <p className="text-sm text-slate-500 font-medium ml-9">Chọn hoạt động và các thuộc tính phân loại</p>
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
              .filter((sys: any) => !IGNORED_TYPES.includes(sys?.code) && !STEP3_TYPES.includes(sys?.code) && !STEP5_TYPES.includes(sys?.code) && sys?.code !== 'GROU')
              .map((sys: any) => renderDynamicField(sys, info[sys.code], (val) => setInfo({...info, [sys.code]: val})))}

          </div>
        </div>

        {/* SECTION 2: Đối tượng tham gia */}
        <div id="section-2" className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6 scroll-mt-24">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#00A99D]/10 text-[#00A99D] rounded-lg flex items-center justify-center text-sm font-black">2</span>
              <span>Đối tượng tham gia <span className="text-rose-500">*</span></span>
            </h2>
            <p className="text-sm text-slate-500 font-medium ml-9">Phạm vi học sinh tham gia hoạt động này</p>
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
                        const allClassesIds = availableClasses.map(c => c.id);
                        setTarget({ ...target, classes: allClassesIds });
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
                      <option value="">-- Tất cả Khối --</option>
                      {Array.from(new Set(safeClasses.map((c: any) => c?.grade).filter(Boolean)))
                        .sort((a: any, b: any) => Number(a) - Number(b))
                        .map((grade: any) => (
                          <option key={grade} value={grade}>Khối {grade}</option>
                        ))}
                    </select>

                    <select 
                      className="w-1/2 bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3 transition-all"
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
                      placeholder="Gõ tên hoặc mã học sinh để tìm..." 
                      className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block pl-10 pr-4 py-3 transition-all"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                    />
                    {isSearching && <Loader2 className="w-4 h-4 absolute right-3.5 top-3.5 text-[#00A99D] animate-spin" />}
                  </div>

                  <div className="border border-slate-200 rounded-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 bg-white">
                    {displayedStudents.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        {studentSearch.trim().length > 0 ? (isSearching ? 'Đang tìm kiếm...' : 'Không tìm thấy học sinh nào') : 'Chọn Lớp hoặc nhập từ khóa để tìm học sinh'}
                      </div>
                    ) : (
                      displayedStudents.map(st => {
                        const isAdded = (target.specificStudents || []).includes(st.id);
                        return (
                          <div key={st.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-all">
                            <div>
                              <div className="text-sm font-bold text-slate-700">{st.fullName}</div>
                              <div className="text-xs text-slate-400">{st.studentCode} • Lớp {st.className}</div>
                            </div>
                            <button 
                              onClick={() => {
                                if (isAdded) {
                                  setTarget({ ...target, specificStudents: target.specificStudents.filter((id: string) => id !== st.id) });
                                  setSelectedStudentsData(prev => prev.filter(s => s.id !== st.id));
                                } else {
                                  setTarget({ ...target, specificStudents: [...(target.specificStudents || []), st.id] });
                                  setSelectedStudentsData(prev => [...prev, st]);
                                }
                              }}
                              className={"px-3 py-1 rounded-lg text-xs font-bold transition-all " + (isAdded ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-[#00A99D]/10 text-[#00A99D] hover:bg-[#00A99D]/20")}
                            >
                              {isAdded ? 'Bỏ chọn' : '+ Chọn'}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Cột phải: Đã chọn */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex justify-between items-center">
                    <span>Đã chọn ({selectedStudentsData.length} học sinh)</span>
                    {selectedStudentsData.length > 0 && (
                      <button 
                        onClick={() => {
                          setTarget({ ...target, specificStudents: [] });
                          setSelectedStudentsData([]);
                        }} 
                        className="text-xs text-rose-500 hover:underline font-semibold"
                      >
                        Xóa tất cả
                      </button>
                    )}
                  </label>

                  <div className="border border-slate-200 rounded-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 bg-white">
                    {selectedStudentsData.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 italic">Chưa có học sinh nào được chọn.</div>
                    ) : (
                      selectedStudentsData.map(st => (
                        <div key={st.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-all">
                          <div>
                            <div className="text-sm font-bold text-slate-700">{st.fullName}</div>
                            <div className="text-xs text-slate-400">{st.studentCode} • Lớp {st.className}</div>
                          </div>
                          <button 
                            onClick={() => {
                              setTarget({ ...target, specificStudents: target.specificStudents.filter((id: string) => id !== st.id) });
                              setSelectedStudentsData(prev => prev.filter(s => s.id !== st.id));
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Thiết lập kết quả mặc định */}
        <div id="section-3" className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6 scroll-mt-24">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#00A99D]/10 text-[#00A99D] rounded-lg flex items-center justify-center text-sm font-black">3</span>
              <span>Thiết lập kết quả mặc định</span>
            </h2>
            <p className="text-sm text-slate-500 font-medium ml-9">Gán kết quả tự động cho tất cả học sinh trong danh sách</p>
          </div>
          
          <div className="bg-[#00A99D]/5 border border-[#00A99D]/20 rounded-2xl p-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-slate-300 text-[#00A99D] focus:ring-[#00A99D]"
                checked={defaults.allParticipate} 
                onChange={e => setDefaults({...defaults, allParticipate: e.target.checked})} 
              />
              <div>
                <span className="text-sm font-bold text-slate-800 block">Áp dụng mặc định cho tất cả học sinh</span>
                <span className="text-xs text-slate-500 font-medium">Tất cả học sinh thuộc đối tượng tham gia sẽ được áp dụng các kết quả này</span>
              </div>
            </label>
          </div>

          {defaults.allParticipate && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
              {/* DYNAMIC FIELDS cho Step 3 */}
              {systemTypes
                .filter((sys: any) => STEP3_TYPES.includes(sys?.code))
                .map((sys: any) => renderDynamicField(sys, defaults[sys.code], (val) => setDefaults({...defaults, [sys.code]: val})))}
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <Link href="/teacher/experiential-activities" className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all">
            Hủy bỏ
          </Link>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Lưu nháp</span>
            </button>
            <button 
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#00A99D] text-white text-sm font-bold rounded-xl hover:bg-[#009085] transition-all shadow-md flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Hoàn tất & Lưu hoạt động</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
