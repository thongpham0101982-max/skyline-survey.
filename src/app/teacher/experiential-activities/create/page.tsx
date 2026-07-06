"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Info, Users, Settings, UserMinus, CheckSquare, 
  ChevronRight, ChevronLeft, Save, Send, UploadCloud, 
  Link as LinkIcon, Plus, X, Search 
} from 'lucide-react';

// Định nghĩa mapping cho các loại danh mục
const STEP3_TYPES = ['ROLE', 'EVAL_LEVEL', 'ACHIEVEMENT'];
const STEP5_TYPES = ['EVIDENCE_TYPE'];
const IGNORED_TYPES = ['SYSTEM_CATEGORY_TYPE', 'GROUP', 'TYPE', 'THEME', 'ABSENCE_REASON'];

export default function CreateActivityWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [catalogs, setCatalogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [systemTypes, setSystemTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dynamic form states
  const [info, setInfo] = useState<Record<string, any>>({ 
    catalogId: '', date: '', semester: '1' 
  });
  const [target, setTarget] = useState({ type: 'class', value: '' });
  const [defaults, setDefaults] = useState<Record<string, any>>({ 
    allParticipate: true 
  });
  const [exceptions, setExceptions] = useState({ outstanding: [], absent: [], achievements: [] });
  const [evidence, setEvidence] = useState<Record<string, any>>({ 
    photos: '', pdfs: '', oneDrive: '', gDrive: '', youtube: '', desc: '' 
  });

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

  const handleSubmit = async (isDraft: boolean) => {
    const payload = { info, target, defaults, exceptions, evidence, isDraft };
    console.log('Submitting data: ', payload);
    alert('Đã lưu dữ liệu thành công! (Mock Submit)');
    router.push('/teacher');
  };

  const steps = [
    { id: 1, title: 'Thông tin chung', icon: Info, desc: 'Kế hoạch & phân loại' },
    { id: 2, title: 'Đối tượng', icon: Users, desc: 'Phạm vi tham gia' },
    { id: 3, title: 'Thiết lập', icon: Settings, desc: 'Đánh giá mặc định' },
    { id: 4, title: 'Ngoại lệ', icon: UserMinus, desc: 'Vắng mặt, nổi bật' },
    { id: 5, title: 'Minh chứng', icon: CheckSquare, desc: 'Tài liệu & gửi duyệt' },
  ];

  const getOptionsForType = (typeCode: string) => {
    return categories
      .filter((c: any) => c.type === typeCode && c.status === 'ACTIVE')
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  };

  const renderDynamicField = (sys: any, stateValue: string, onChange: (val: string) => void) => {
    const options = getOptionsForType(sys.code);
    return (
      <div key={sys.code} className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
        <label className="text-sm font-bold text-slate-700">{sys.name}</label>
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
                    <label className="text-sm font-bold text-slate-700">Tên hoạt động (từ Danh mục) <span className="text-rose-500">*</span></label>
                    <select 
                      className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-bold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
                      value={info.catalogId} 
                      onChange={e => setInfo({...info, catalogId: e.target.value})}
                    >
                      <option value="">-- Chọn hoạt động có sẵn --</option>
                      {catalogs.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Ngày tổ chức</label>
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
                    .filter((sys: any) => !IGNORED_TYPES.includes(sys.code) && !STEP3_TYPES.includes(sys.code) && !STEP5_TYPES.includes(sys.code))
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
                
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Phạm vi áp dụng</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { id: 'class', label: 'Một lớp' },
                        { id: 'multi-class', label: 'Nhiều lớp' },
                        { id: 'grade', label: 'Cả khối' },
                        { id: 'school', label: 'Toàn trường' },
                        { id: 'specific', label: 'Danh sách HS cụ thể' },
                      ].map(opt => (
                        <div 
                          key={opt.id}
                          onClick={() => setTarget({...target, type: opt.id})}
                          className={"cursor-pointer px-4 py-3 rounded-xl border text-center text-sm font-bold transition-all " + (
                            target.type === opt.id 
                              ? 'bg-[#00A99D]/10 border-[#00A99D] text-[#00A99D] shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                          )}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 pt-4">
                    <label className="text-sm font-bold text-slate-700">Chi tiết (chọn Lớp/Khối tương ứng)</label>
                    <input 
                      type="text" 
                      placeholder={target.type === 'class' ? 'Ví dụ: 10A1' : 'Ví dụ: Khối 10'}
                      className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
                      value={target.value} 
                      onChange={e => setTarget({...target, value: e.target.value})} 
                    />
                  </div>
                </div>
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
                  <h2 className="text-lg font-black text-slate-800">4. Học sinh ngoại lệ</h2>
                  <p className="text-sm text-slate-500 font-medium">Ghi nhận học sinh vắng mặt hoặc có thành tích đặc biệt</p>
                </div>
                
                <div className="bg-slate-50/80 p-8 rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-700">Chưa có học sinh ngoại lệ nào</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Bạn có thể chọn từng học sinh để thay đổi đánh giá, hoặc upload file Excel danh sách ngoại lệ.
                    </p>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button className="px-4 py-2 bg-white ring-1 ring-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-100 transition-all shadow-sm">
                      + Thêm tay
                    </button>
                    <button className="px-4 py-2 bg-[#00A99D]/10 text-[#00A99D] font-bold text-xs rounded-lg hover:bg-[#00A99D]/20 transition-all flex items-center gap-1">
                      <UploadCloud className="w-4 h-4" /> Import Excel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Evidence */}
            {step === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-lg font-black text-slate-800">5. Minh chứng & Hoàn tất</h2>
                  <p className="text-sm text-slate-500 font-medium">Tải lên hoặc đính kèm link minh chứng cho hoạt động</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {systemTypes
                    .filter((sys: any) => STEP5_TYPES.includes(sys.code))
                    .map((sys: any) => renderDynamicField(sys, evidence[sys.code], (val) => setEvidence({...evidence, [sys.code]: val})))}
                    
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Tải tệp lên (Ảnh/PDF)</label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <UploadCloud className="w-8 h-8 text-slate-400 mb-3 group-hover:text-[#00A99D] transition-colors" />
                          <p className="mb-1 text-sm text-slate-500 font-medium"><span className="font-bold text-[#00A99D]">Nhấn để tải lên</span> hoặc kéo thả</p>
                          <p className="text-xs text-slate-400">PNG, JPG, PDF (MAX. 10MB)</p>
                        </div>
                        <input type="file" className="hidden" multiple />
                      </label>
                    </div> 
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><LinkIcon className="w-4 h-4 text-blue-500"/> Link OneDrive</label>
                    <input 
                      type="url" 
                      className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
                      placeholder="https://1drv.ms/..."
                      value={evidence.oneDrive} onChange={e => setEvidence({...evidence, oneDrive: e.target.value})} 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><LinkIcon className="w-4 h-4 text-rose-500"/> Link YouTube</label>
                    <input 
                      type="url" 
                      className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
                      placeholder="https://youtube.com/..."
                      value={evidence.youtube} onChange={e => setEvidence({...evidence, youtube: e.target.value})} 
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Mô tả thêm về minh chứng</label>
                    <textarea 
                      className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all min-h-[100px]"
                      placeholder="Ghi chú chi tiết về các tệp đính kèm..."
                      value={evidence.desc} onChange={e => setEvidence({...evidence, desc: e.target.value})}
                    ></textarea>
                  </div>
                </div>
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
              {step === 5 ? (
                <>
                  <button 
                    onClick={() => handleSubmit(true)} 
                    className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Lưu nháp
                  </button>
                  <button 
                    onClick={() => handleSubmit(false)} 
                    className="px-8 py-2.5 text-sm font-bold text-white bg-[#00A99D] hover:bg-[#009085] hover:scale-105 active:scale-95 shadow-sm shadow-[#00A99D]/20 rounded-xl transition-all flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Gửi duyệt
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setStep(step + 1)} 
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