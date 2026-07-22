"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Info, Users, Settings, UserMinus, CheckSquare, 
  ChevronRight, ChevronLeft, Save, Send, UploadCloud, 
  Link as LinkIcon, Plus, X, Search, BookOpen, ShieldAlert, Award
} from 'lucide-react';
import toast from 'react-hot-toast';

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

export default function CreateActivityWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Foundational data
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [catalogs, setCatalogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [systemTypes, setSystemTypes] = useState([]);

  // Form states
  const [info, setInfo] = useState<Record<string, any>>({ 
    name: '', academicYear: '', date: '', semester: '1',
    objectives: '', tasks: '', criteria: '', activityName: ''
  });
  
  // Co-teachers selection
  const [coTeacherSearch, setCoTeacherSearch] = useState('');
  const [selectedCoTeachers, setSelectedCoTeachers] = useState<string[]>([]);
  const [showCoTeacherDropdown, setShowCoTeacherDropdown] = useState(false);

  // Target options
  const [targetMode, setTargetMode] = useState<'class' | 'student'>('class');
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudentsData, setSelectedStudentsData] = useState<any[]>([]);
  
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

  const [studentResults, setStudentResults] = useState<Record<string, Record<string, any>>>({});
  const [studentResultSearch, setStudentResultSearch] = useState('');
  const [resultSearchResults, setResultSearchResults] = useState<any[]>([]);
  const [isSearchingResult, setIsSearchingResult] = useState(false);
  const [selectedResultStudent, setSelectedResultStudent] = useState<any>(null);
  const [currentStudentResult, setCurrentStudentResult] = useState<Record<string, any>>({});

  const [evidence, setEvidence] = useState<Record<string, any>>({ 
    photos: '', pdfs: '', oneDrive: '', gDrive: '', youtube: '', desc: '' 
  });

  const [generatedCode, setGeneratedCode] = useState('');

  // Fetch initial configuration data
  useEffect(() => {
    Promise.all([
      fetch('/api/academic-years').then(res => res.json()),
      fetch('/api/teachers').then(res => res.json()),
      fetch('/api/activities/catalog').then(r => r.json()),
      fetch('/api/activities/categories').then(r => r.json())
    ]).then(([years, teachers, catRes, catesRes]) => {
      setAcademicYears(years || []);
      setTeachersList(teachers || []);
      
      const defaultYear = getDefaultAcademicYearClient(years || []);
      const defaultYearId = defaultYear ? defaultYear.id : (years?.[0]?.id || '');
      
      setInfo(prev => ({ 
        ...prev, 
        academicYear: defaultYearId,
        date: new Date().toISOString().substring(0, 10)
      }));

      if (catRes.success) setCatalogs(catRes.data);
      if (catesRes.success) {
        setCategories(catesRes.data);
        const sysTypes = catesRes.data
          .filter((c: any) => c.type === 'SYSTEM_CATEGORY_TYPE' && c.status === 'ACTIVE' && !c.name.toLowerCase().includes('mức độ') && !c.name.toLowerCase().includes('kết quả'))
          .sort((a: any, b: any) => a.sortOrder - b.sortOrder);
        setSystemTypes(sysTypes);
        
        // Initialize dynamic fields
        const newInfo = { 
          name: '', academicYear: defaultYearId, date: new Date().toISOString().substring(0, 10), semester: '1',
          objectives: '', tasks: '', criteria: '', activityName: ''
        } as any;
        const newDefaults = { allParticipate: true } as any;
        const newEvidence = { photos: '', pdfs: '', oneDrive: '', gDrive: '', youtube: '', desc: '' } as any;

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
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, []);

  // Fetch classes dynamically based on academic year
  useEffect(() => {
    if (info.academicYear) {
      fetch(`/api/classes?academicYearId=${info.academicYear}`)
        .then(res => res.json())
        .then(data => setAllClasses(data || []))
        .catch(console.error);
    }
  }, [info.academicYear]);

  // Student search for student-based selection
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

  // Fetch class students when class filter is selected
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

  // Search individual student result exceptions
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

  // Generate code suggestion client side
  useEffect(() => {
    if (info.academicYear) {
      const yearParts = info.academicYear.split('-');
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setGeneratedCode(`HĐ-${yearParts[0] || '2026'}-${randomSuffix}`);
    }
  }, [info.academicYear]);

  const saveStudentResult = () => {
    if (selectedResultStudent) {
      setStudentResults({
        ...studentResults,
        [selectedResultStudent.id]: {
          student: selectedResultStudent,
          result: currentStudentResult
        }
      });
      setSelectedResultStudent(null);
      setCurrentStudentResult({});
      setStudentResultSearch('');
    }
  };

  const removeStudentResult = (studentId: string) => {
    const newResults = { ...studentResults };
    delete newResults[studentId];
    setStudentResults(newResults);
  };

  const handleClassToggle = (classId: string) => {
    const newClasses = target.classes.includes(classId)
      ? target.classes.filter(c => c !== classId)
      : [...target.classes, classId];
    setTarget({ ...target, classes: newClasses });
  };

  const handleStudentSelect = (student: any) => {
    if (selectedStudentsData.some(s => s.id === student.id)) return;
    setSelectedStudentsData([...selectedStudentsData, student]);
    setTarget({
      ...target,
      specificStudents: [...target.specificStudents, student.id]
    });
    setStudentSearch('');
    setSearchResults([]);
  };

  const handleRemoveStudent = (sid: string) => {
    setSelectedStudentsData(selectedStudentsData.filter(s => s.id !== sid));
    setTarget({
      ...target,
      specificStudents: target.specificStudents.filter(id => id !== sid)
    });
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!info.name || !info.activityName) {
      toast.error("Vui lòng điền đầy đủ Nhóm hoạt động và Tên hoạt động");
      setStep(1);
      return;
    }

    if (targetMode === 'class' && target.classes.length === 0) {
      toast.error("Vui lòng chọn ít nhất một lớp tham gia ở Bước 2");
      setStep(2);
      return;
    }

    if (targetMode === 'student' && target.specificStudents.length === 0) {
      toast.error("Vui lòng chọn ít nhất một học sinh tham gia ở Bước 2");
      setStep(2);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        info: {
          ...info,
          code: generatedCode,
          objectives: info.objectives || '',
          tasks: info.tasks || '',
          criteria: info.criteria || '',
          coTeachers: selectedCoTeachers.join(', '),
        },
        target: {
          classes: targetMode === 'class' ? target.classes : [],
          students: targetMode === 'student' ? target.specificStudents : []
        },
        defaults,
        studentResults,
        isDraft
      };

      const res = await fetch('/api/experiential-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(isDraft ? 'Đã lưu bản nháp thành công!' : 'Đã tạo hoạt động thành công!');
        router.push('/teacher/experiential-activities');
      } else {
        toast.error('Lỗi khi lưu: ' + (resData.error || res.statusText));
      }
    } catch (e: any) {
      toast.error('Lỗi kết nối: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Class filtering logic
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

  const steps = [
    { id: 1, title: 'Thông tin chung', icon: Info, desc: 'Kế hoạch & phân loại' },
    { id: 2, title: 'Đối tượng', icon: Users, desc: 'Phạm vi tham gia' },
    { id: 3, title: 'Thiết lập', icon: Settings, desc: 'Đánh giá mặc định' },
    { id: 4, title: 'Ngoại lệ & Lưu', icon: CheckSquare, desc: 'Lưu & Hoàn tất' },
  ];

  const getOptionsForType = (typeCode: string) => {
    return categories
      .filter((c: any) => c.type === typeCode && c.status === 'ACTIVE')
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  };

  const renderDynamicField = (sys: any, stateValue: string, onChange: (val: string) => void) => {
    const options = getOptionsForType(sys.code) as any[];
    return (
      <div key={sys.code} className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{sys.name}</label>
        <select 
          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 block p-3.5 transition-all outline-none"
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

  // Co-teacher filtering
  const filteredTeachers = teachersList.filter(t => 
    t.teacherName.toLowerCase().includes(coTeacherSearch.toLowerCase()) ||
    t.teacherCode.toLowerCase().includes(coTeacherSearch.toLowerCase())
  );

  const toggleCoTeacher = (tName: string) => {
    if (selectedCoTeachers.includes(tName)) {
      setSelectedCoTeachers(selectedCoTeachers.filter(t => t !== tName));
    } else {
      setSelectedCoTeachers([...selectedCoTeachers, tName]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent mb-4"></div>
        <span className="text-xs font-bold text-slate-400">Đang tải cấu hình hoạt động...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 font-sans antialiased text-slate-600">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Khai báo Hoạt động Trải nghiệm mới</h1>
              <p className="text-slate-400 font-semibold text-xs md:text-sm">Lập mục tiêu học tập, danh sách lớp tham gia, phân công nhiệm vụ và giáo viên phối hợp.</p>
            </div>
            <button
              onClick={() => router.push('/teacher/experiential-activities')}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Quay lại
            </button>
          </div>
        </div>

        {/* STEPPER */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/50 overflow-x-auto scrollbar-hide">
          <div className="flex justify-between items-center min-w-[700px] px-2">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isPast = step > s.id;
              return (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center relative w-36">
                    <button 
                      onClick={() => isPast && setStep(s.id)}
                      disabled={!isPast && !isActive}
                      className={"w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 z-10 border " + (
                        isActive ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-500/20 scale-110' : 
                        isPast ? 'bg-teal-55 border-teal-200 text-teal-700 cursor-pointer hover:bg-teal-100/80' : 
                        'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                    <div className={"mt-3 text-center transition-all " + (isActive ? 'opacity-100 scale-100' : 'opacity-60 scale-95')}>
                      <div className={"text-[10px] font-black uppercase tracking-wider " + (isActive ? 'text-teal-700' : 'text-slate-500')}>{s.title}</div>
                      <div className="text-[9px] font-bold text-slate-400 mt-0.5">{s.desc}</div>
                    </div>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="flex-1 h-0.5 bg-slate-100 rounded-full mx-2 relative overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-teal-600 transition-all duration-500 ease-in-out"
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
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/50 overflow-hidden relative min-h-[500px] flex flex-col">
          <div className="p-6 md:p-8 flex-1">
            
            {/* Step 1: Basic Info, Objectives, Tasks, Criteria & Co-teachers */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-base font-black text-slate-800">1. Thông tin chung & Quy định thực hiện</h2>
                  <p className="text-xs text-slate-400 font-semibold">Khai báo mục tiêu năng lực, thời gian tổ chức, nội dung đánh giá và giáo viên phối hợp.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nhóm hoạt động <span className="text-rose-500">*</span></label>
                    <input 
                      type="text"
                      placeholder="Ví dụ: Hoạt động Trải nghiệm sáng tạo, STEM, Dự án Học tập..."
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 block p-3.5 transition-all outline-none"
                      value={info.name} 
                      onChange={e => setInfo({...info, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tên hoạt động / Tên dự án học tập <span className="text-rose-500">*</span></label>
                    <input 
                      type="text"
                      placeholder="Ví dụ: Thiết kế hệ thống tưới cây tự động lớp 11..."
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 block p-3.5 transition-all outline-none"
                      value={info.activityName || ''} 
                      onChange={e => setInfo({...info, activityName: e.target.value})}
                    />
                  </div>

                  {/* New required fields: Mục tiêu, nhiệm vụ, tiêu chí */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mục tiêu hoạt động (Năng lực / Kỹ năng cần đạt)</label>
                    <textarea 
                      rows={3}
                      placeholder="- Học sinh biết vận dụng kiến thức vật lý vào thiết kế chế tạo&#10;- Phát triển kỹ năng làm việc nhóm, thuyết trình"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 block p-3.5 transition-all outline-none"
                      value={info.objectives || ''}
                      onChange={e => setInfo({...info, objectives: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nhiệm vụ học tập / Nội dung thực hiện</label>
                    <textarea 
                      rows={3}
                      placeholder="- Thiết kế bản vẽ sơ đồ hệ thống&#10;- Lắp đặt mô hình thực tế và báo cáo kết quả trước lớp"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 block p-3.5 transition-all outline-none"
                      value={info.tasks || ''}
                      onChange={e => setInfo({...info, tasks: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tiêu chí đánh giá kết quả (Rubrics)</label>
                    <textarea 
                      rows={3}
                      placeholder="- Tiêu chí 1: Bản vẽ rõ ràng, khả thi (30%)&#10;- Tiêu chí 2: Sản phẩm hoạt động tốt (50%)&#10;- Tiêu chí 3: Thuyết trình tự tin, mạch lạc (20%)"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 block p-3.5 transition-all outline-none"
                      value={info.criteria || ''}
                      onChange={e => setInfo({...info, criteria: e.target.value})}
                    />
                  </div>

                  {/* Co-operating Teachers Multi-select dropdown */}
                  <div className="space-y-1.5 md:col-span-2 relative">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Giáo viên phối hợp thực hiện</label>
                    <div className="flex flex-wrap gap-1.5 min-h-[44px] p-2 bg-slate-50 border border-slate-200 rounded-xl items-center">
                      {selectedCoTeachers.length === 0 ? (
                        <span className="text-slate-400 text-xs font-semibold px-2">Bấm vào ô tìm kiếm bên dưới để chọn giáo viên phối hợp...</span>
                      ) : (
                        selectedCoTeachers.map(tName => (
                          <span key={tName} className="inline-flex items-center gap-1 bg-teal-55 text-teal-700 border border-teal-200/60 text-xs font-bold px-2.5 py-1 rounded-lg">
                            {tName}
                            <button type="button" onClick={() => toggleCoTeacher(tName)} className="hover:text-red-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    
                    <div className="mt-2 flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Tìm và thêm giáo viên phối hợp..."
                          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-teal-500 bg-white"
                          value={coTeacherSearch}
                          onChange={e => {
                            setCoTeacherSearch(e.target.value);
                            setShowCoTeacherDropdown(true);
                          }}
                          onFocus={() => setShowCoTeacherDropdown(true)}
                        />
                      </div>
                      {showCoTeacherDropdown && (
                        <button
                          type="button"
                          onClick={() => setShowCoTeacherDropdown(false)}
                          className="text-xs font-bold text-teal-600 hover:text-teal-700 px-2"
                        >
                          Đóng
                        </button>
                      )}
                    </div>

                    {showCoTeacherDropdown && (
                      <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1">
                        {filteredTeachers.length === 0 ? (
                          <div className="text-xs text-slate-400 italic p-3 text-center">Không tìm thấy giáo viên nào</div>
                        ) : (
                          filteredTeachers.map(t => {
                            const isSel = selectedCoTeachers.includes(t.teacherName);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => toggleCoTeacher(t.teacherName)}
                                className={"w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between " + (isSel ? 'bg-teal-50 text-teal-700' : 'hover:bg-slate-55 text-slate-700')}
                              >
                                <span>{t.teacherName} ({t.teacherCode})</span>
                                {isSel && <CheckSquare className="w-3.5 h-3.5 text-teal-600" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Năm học <span className="text-rose-500">*</span></label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 block p-3.5 transition-all outline-none"
                      value={info.academicYear} 
                      onChange={e => setInfo({...info, academicYear: e.target.value})}
                    >
                      {academicYears.map(year => (
                        <option key={year.id} value={year.id}>{year.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mã hoạt động (Hệ thống tự tạo)</label>
                    <input 
                      type="text" 
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 text-teal-700 text-xs font-black rounded-xl block p-3.5 opacity-80 cursor-not-allowed outline-none"
                      value={generatedCode} 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ngày tổ chức</label>
                    <input 
                      type="date" 
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 block p-3.5 transition-all outline-none"
                      value={info.date} 
                      onChange={e => setInfo({...info, date: e.target.value})} 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Học kỳ</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 block p-3.5 transition-all outline-none"
                      value={info.semester} 
                      onChange={e => setInfo({...info, semester: e.target.value})}
                    >
                      <option value="1">Học kỳ 1</option>
                      <option value="2">Học kỳ 2</option>
                      <option value="3">Học kỳ Hè</option>
                    </select>
                  </div>

                  {systemTypes
                    .filter((sys: any) => !IGNORED_TYPES.includes(sys.code) && !STEP3_TYPES.includes(sys.code) && !STEP5_TYPES.includes(sys.code))
                    .map((sys: any) => renderDynamicField(sys, info[sys.code], (val) => setInfo({...info, [sys.code]: val})))}
                </div>
              </div>
            )}

            {/* Step 2: Target Selection */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-base font-black text-slate-800">2. Chọn Lớp / Học sinh tham gia</h2>
                  <p className="text-xs text-slate-400 font-semibold">Xác định phạm vi học sinh tham gia dự án trải nghiệm này (một hoặc nhiều lớp, hoặc học sinh lẻ).</p>
                </div>
                
                <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-full max-w-sm mb-6">
                  <button
                    onClick={() => setTargetMode('class')}
                    className={"flex-1 py-2 text-xs font-bold rounded-xl transition-all " + (targetMode === 'class' ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                  >
                    Theo Khối/Lớp
                  </button>
                  <button
                    onClick={() => setTargetMode('student')}
                    className={"flex-1 py-2 text-xs font-bold rounded-xl transition-all " + (targetMode === 'student' ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                  >
                    Theo Học sinh lẻ
                  </button>
                </div>

                {targetMode === 'class' && (
                  <div className="space-y-6 max-w-3xl animate-in fade-in duration-300">
                    {/* Bậc học */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">1. Bậc học</label>
                      <div className="flex flex-wrap gap-2">
                        {availableLevels.map(lvl => {
                          const isSel = lvl.originalLevels.some((l: any) => target.levels.includes(l));
                          return (
                            <button
                              key={lvl.id}
                              type="button"
                              onClick={() => {
                                const newLevels = isSel
                                  ? target.levels.filter((l: any) => !lvl.originalLevels.includes(l))
                                  : [...target.levels, ...lvl.originalLevels];
                                setTarget({ ...target, levels: newLevels, grades: [], classes: [] });
                              }}
                              className={"px-4 py-2.5 rounded-xl border text-xs font-black transition-all " + (isSel ? "bg-teal-50 border-teal-200 text-teal-700 shadow-3xs" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}
                            >
                              {lvl.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Khối */}
                    <div className={"space-y-2.5 transition-all duration-300 " + (target.levels.length === 0 ? 'opacity-40 pointer-events-none' : '')}>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">2. Khối học</label>
                      {target.levels.length === 0 ? (
                        <div className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-100/60 max-w-md">Vui lòng chọn bậc học trước.</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {availableGrades.map(grade => {
                            const isSel = target.grades.includes(grade);
                            return (
                              <button
                                key={grade}
                                type="button"
                                onClick={() => {
                                  const newGrades = isSel
                                    ? target.grades.filter((g: any) => g !== grade)
                                    : [...target.grades, grade];
                                  setTarget({ ...target, grades: newGrades, classes: [] });
                                }}
                                className={"px-4 py-2.5 rounded-xl border text-xs font-black transition-all " + (isSel ? "bg-teal-50 border-teal-200 text-teal-700 shadow-3xs" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}
                              >
                                Khối {grade}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Lớp */}
                    <div className={"space-y-2.5 transition-all duration-300 " + (target.grades.length === 0 ? 'opacity-40 pointer-events-none' : '')}>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">3. Danh sách Lớp học</label>
                      {target.grades.length === 0 ? (
                        <div className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-100/60 max-w-md">Vui lòng chọn Khối học để xem các Lớp.</div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {availableClasses.map(cls => {
                            const isSel = target.classes.includes(cls.id);
                            return (
                              <button
                                key={cls.id}
                                type="button"
                                onClick={() => handleClassToggle(cls.id)}
                                className={"p-4 rounded-2xl border text-left transition-all flex items-center justify-between " + (
                                  isSel 
                                    ? "bg-teal-50/50 border-teal-300 text-teal-700 font-extrabold shadow-3xs" 
                                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50/50 hover:border-slate-300"
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-black">{cls.className.split(/[_-]/)[0]}</div>
                                  <div className="text-[9px] text-slate-400 font-bold mt-0.5">{cls.campus?.campusName || 'Cơ sở 1'}</div>
                                </div>
                                <div className={"w-5 h-5 rounded-md border flex items-center justify-center transition-all " + (isSel ? "bg-teal-600 border-teal-600 text-white" : "border-slate-200")}>
                                  {isSel && <Plus className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {targetMode === 'student' && (
                  <div className="space-y-6 max-w-3xl animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Search & Add */}
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tìm kiếm học sinh</label>
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input 
                            type="text"
                            placeholder="Nhập họ tên hoặc mã học sinh..."
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-teal-500 bg-white"
                            value={studentSearch}
                            onChange={e => setStudentSearch(e.target.value)}
                          />
                        </div>

                        {/* Search results list */}
                        {isSearching ? (
                          <div className="text-xs text-slate-400 italic py-2">Đang tìm kiếm...</div>
                        ) : searchResults.length > 0 ? (
                          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white max-h-48 overflow-y-auto shadow-2xs">
                            {searchResults.map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => handleStudentSelect(s)}
                                className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                              >
                                <span>{s.studentName} - {s.studentCode} ({s.class?.className || 'Lớp chưa rõ'})</span>
                                <Plus className="w-3.5 h-3.5 text-teal-600" />
                              </button>
                            ))}
                          </div>
                        ) : studentSearch.length >= 2 && (
                          <div className="text-xs text-slate-400 italic py-1">Không tìm thấy kết quả phù hợp.</div>
                        )}
                      </div>

                      {/* Selected list */}
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách học sinh đã chọn ({selectedStudentsData.length})</label>
                        <div className="border border-slate-200/60 p-3 rounded-2xl bg-slate-50/50 min-h-[120px] max-h-52 overflow-y-auto flex flex-wrap gap-2">
                          {selectedStudentsData.length === 0 ? (
                            <span className="text-xs text-slate-400 italic font-semibold p-2">Chưa có học sinh nào được chọn.</span>
                          ) : (
                            selectedStudentsData.map(s => (
                              <span key={s.id} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-xl shadow-3xs">
                                <span>{s.studentName} ({s.class?.className?.split(/[_-]/)[0]})</span>
                                <button type="button" onClick={() => handleRemoveStudent(s.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Default setup */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-base font-black text-slate-800">3. Thiết lập thông số Đánh giá Mặc định</h2>
                  <p className="text-xs text-slate-400 font-semibold">Tự động áp dụng các tiêu chí mặc định này cho toàn bộ học sinh được chọn tham gia.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                  {systemTypes
                    .filter((sys: any) => STEP3_TYPES.includes(sys.code))
                    .map((sys: any) => renderDynamicField(sys, defaults[sys.code], (val) => setDefaults({...defaults, [sys.code]: val})))}

                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex items-center gap-2.5 bg-slate-50/50 border border-slate-200/60 p-4 rounded-2xl max-w-md">
                      <input 
                        type="checkbox" 
                        id="allParticipate"
                        className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                        checked={defaults.allParticipate || false} 
                        onChange={e => setDefaults({...defaults, allParticipate: e.target.checked})}
                      />
                      <label htmlFor="allParticipate" className="text-xs font-bold text-slate-700 cursor-pointer">Tất cả các học sinh đều tham gia đầy đủ (Mặc định)</label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Exceptions, results, evidence & submit */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-base font-black text-slate-800">4. Thống kê Minh chứng & Lưu kết quả</h2>
                  <p className="text-xs text-slate-400 font-semibold">Khai báo hồ sơ minh chứng hoạt động của lớp và nhấn Lưu kết quả để lưu nháp hoặc trình duyệt kết quả.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Evidence inputs */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-teal-600" />
                      Minh chứng hoạt động chung
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Liên kết Ảnh minh chứng (Photos URL)</label>
                        <input
                          type="text"
                          placeholder="Nhập đường dẫn Google Photos, OneDrive..."
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg p-2.5 outline-none focus:border-teal-500"
                          value={evidence.photos || ''}
                          onChange={e => setEvidence({ ...evidence, photos: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">OneDrive / Google Drive Folder</label>
                        <input
                          type="text"
                          placeholder="Nhập đường dẫn thư mục lưu trữ tài liệu..."
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg p-2.5 outline-none focus:border-teal-500"
                          value={evidence.oneDrive || ''}
                          onChange={e => setEvidence({ ...evidence, oneDrive: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">YouTube Link (Video báo cáo)</label>
                        <input
                          type="text"
                          placeholder="Nhập link video thuyết trình, báo cáo hoạt động..."
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg p-2.5 outline-none focus:border-teal-500"
                          value={evidence.youtube || ''}
                          onChange={e => setEvidence({ ...evidence, youtube: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary before submit */}
                  <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-teal-600" />
                      Thông tin tóm tắt hoạt động
                    </h3>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Tên hoạt động:</span>
                        <span className="font-bold text-slate-800">{info.activityName || '(Chưa nhập)'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Mã hoạt động:</span>
                        <span className="font-bold text-teal-700">{generatedCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Học sinh tham gia:</span>
                        <span className="font-bold text-slate-800">
                          {targetMode === 'class' 
                            ? `Từ ${target.classes.length} lớp học được chọn` 
                            : `${target.specificStudents.length} học sinh riêng lẻ`
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Giáo viên phối hợp:</span>
                        <span className="font-bold text-slate-800 truncate max-w-xs">{selectedCoTeachers.join(', ') || 'Không có'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Đánh giá mặc định:</span>
                        <span className="font-bold text-slate-800">
                          {defaults.ROLE || '(Chưa chọn vai trò)'} / {defaults.EVAL_LEVEL || '(Chưa chọn mức)'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-amber-50 text-amber-700 border border-amber-100 p-3 rounded-xl flex items-start gap-2 text-xs font-semibold mt-4">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Sau khi lưu chính thức (SUBMIT), kết quả này sẽ được hiển thị trên học bạ học sinh và gửi PHHS. Vui lòng chọn Lưu bản nháp (DRAFT) nếu cần đánh giá thêm.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* FOOTER ACTIONS */}
          <div className="bg-slate-50 border-t border-slate-200/50 p-5 flex items-center justify-between gap-4">
            <button
              onClick={() => setStep(p => Math.max(p - 1, 1))}
              disabled={step === 1 || saving}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 text-xs font-black rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Quay lại
            </button>
            
            <div className="flex items-center gap-3">
              {step < steps.length ? (
                <button
                  onClick={() => setStep(p => Math.min(p + 1, steps.length))}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/10"
                >
                  Tiếp theo <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={saving}
                    className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" /> Lưu nháp (Draft)
                  </button>
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/10"
                  >
                    <Send className="w-4 h-4" /> Hoàn thành & Lưu
                  </button>
                </>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
