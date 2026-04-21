"use client"
import { useState, useMemo } from "react"
import { 
  Users, CheckCircle2, AlertCircle, ArrowLeft, 
  Send, Loader2, Info, ChevronRight, GraduationCap,
  MapPin, Filter, Search
} from "lucide-react"
import Link from "next/link"
import { dispatchSurveyAction } from "./actions"

export default function PublishSurveyClient({ initialSurvey, classes }: any) {
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState("")
  const [selectedCampus, setSelectedCampus] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  const isStudentSurvey = initialSurvey.targetAudience === "HocSinh" || initialSurvey.targetAudience === "Hoc sinh"

  // Extract unique campuses
  const campuses = useMemo(() => {
    const map = new Map()
    classes.forEach((c: any) => {
      if (c.campus) map.set(c.campus.id, c.campus.campusName)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [classes])

  const filteredClasses = useMemo(() => {
    return classes.filter((c: any) => {
      const matchCampus = selectedCampus === "ALL" || c.campusId === selectedCampus
      const matchSearch = c.className.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCampus && matchSearch
    })
  }, [classes, selectedCampus, searchQuery])

  const toggleClass = (id: string) => {
    setSelectedClasses(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredClasses.map((c: any) => c.id)
    const allInFilteredSelected = filteredIds.every(id => selectedClasses.includes(id))
    
    if (allInFilteredSelected) {
      setSelectedClasses(selectedClasses.filter(id => !filteredIds.includes(id)))
    } else {
      const newSelected = Array.from(new Set([...selectedClasses, ...filteredIds]))
      setSelectedClasses(newSelected)
    }
  }

  const handleDispatch = async () => {
    if (selectedClasses.length === 0) {
      setError("Vui lòng chọn ít nhất một lớp!")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await dispatchSurveyAction(initialSurvey.id, selectedClasses)
      setResults(res)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (results) {
    const hasMissing = !isStudentSurvey && (results.missingRequirementCount > 0)
    return (
      <div className="max-w-2xl mx-auto animate-in zoom-in duration-300">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
          <div className={`p-10 text-center ${hasMissing ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${hasMissing ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {hasMissing ? <AlertCircle className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
               {hasMissing ? "Phát hiện thiếu thông tin!" : "Phát hành thành công!"}
            </h2>
            <p className="text-slate-500 mt-2 font-medium">
               {isStudentSurvey ? "Phiếu khảo sát cho học sinh đã sẵn sàng." : "Phiếu khảo sát cho phụ huynh đã sẵn sàng."}
            </p>
          </div>
          <div className="p-10 space-y-4">
             <div className="grid grid-cols-2 gap-3">
                <ResultItem label="Đã tạo mới" value={results.created} />
                <ResultItem label="Đã có" value={results.alreadyExisted} />
             </div>
             <Link href="/admin/surveys" className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-bold mt-6">Quay về danh sách</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isStudentSurvey ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-[#BE1E2E]'}`}>
               {isStudentSurvey ? <GraduationCap className="w-6 h-6" /> : <Users className="w-6 h-6" />}
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Phát hành đợt</p>
               <h1 className="text-xl font-black text-slate-900 tracking-tight">{initialSurvey.name}</h1>
            </div>
         </div>
         <Link href="/admin/surveys" className="text-slate-400 hover:text-slate-900 font-bold text-sm flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Quay lại
         </Link>
      </div>

      <div className="grid md:grid-cols-[1fr,350px] gap-6">
         <div className="space-y-6">
            {/* Filter Bar - Premium */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
               <div className="flex bg-slate-100 p-1 rounded-xl items-center gap-1">
                  <button 
                    onClick={() => setSelectedCampus("ALL")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCampus === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  >
                     Tất cả
                  </button>
                  {campuses.map(c => (
                    <button 
                      key={c.id}
                      onClick={() => setSelectedCampus(c.id)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCampus === c.id ? "bg-white text-[#BE1E2E] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                       {c.name}
                    </button>
                  ))}
               </div>
               
               <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Tìm tên lớp..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none ring-1 ring-slate-200 focus:ring-indigo-500 transition-all"
                  />
               </div>
            </div>

            {/* Class Cards */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                     <GraduationCap className="w-4 h-4 text-[#BE1E2E]" /> Chọn lớp ({selectedClasses.length} đã chọn)
                  </h3>
                  <button onClick={handleSelectAllFiltered} className="text-xs font-black text-indigo-600 uppercase hover:underline">
                     {filteredClasses.every(c => selectedClasses.includes(c.id)) ? "Bỏ chọn các lớp đang hiện" : "Chọn các lớp đang hiện"}
                  </button>
               </div>
               
               <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 max-h-[550px] overflow-y-auto">
                  {filteredClasses.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-slate-400 font-bold">Không tìm thấy lớp nào phù hợp.</div>
                  ) : (
                    filteredClasses.map((cls: any) => (
                      <button
                        key={cls.id}
                        onClick={() => toggleClass(cls.id)}
                        className={`group p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${selectedClasses.includes(cls.id) ? 'bg-indigo-50/30 border-indigo-600' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}
                      >
                         <div className="flex items-center gap-4 relative z-10">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs ${selectedClasses.includes(cls.id) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>
                               {cls.className.charAt(0)}
                            </div>
                            <div>
                               <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">{cls.className}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5" /> {cls.campus?.campusName}
                               </p>
                            </div>
                         </div>
                         {selectedClasses.includes(cls.id) && (
                           <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                           </div>
                         )}
                      </button>
                    ))
                  )}
               </div>
            </div>
         </div>

         {/* Sidebar Actions */}
         <div className="space-y-6">
            <div className="bg-[#BE1E2E] p-8 rounded-[2.5rem] text-white shadow-2xl shadow-red-500/20 sticky top-28">
               <h4 className="font-black text-xl mb-6">Xác nhận</h4>
               <div className="space-y-4 mb-8">
                  <SummaryItem label="Tổng số lớp đã chọn" value={selectedClasses.length} />
                  <SummaryItem label="Đối tượng khảo sát" value={isStudentSurvey ? "Học sinh" : "Phụ huynh"} />
               </div>
               <button 
                  onClick={handleDispatch}
                  disabled={loading || selectedClasses.length === 0}
                  className="w-full py-5 bg-white text-[#BE1E2E] rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
               >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Phát hành ngay</>}
               </button>
            </div>
            
            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-3">
               <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
               <p className="text-xs text-amber-900 font-medium leading-relaxed">
                  Bạn nên lọc theo **Cơ sở** trước để dễ dàng quản lý danh sách lớp. Hệ thống sẽ bỏ qua những học sinh đã được tạo phiếu trước đó.
               </p>
            </div>
         </div>
      </div>

      {error && (
        <div className="fixed bottom-8 right-8 p-4 bg-red-600 text-white rounded-2xl font-bold shadow-2xl animate-in slide-in-from-right-full">
           {error}
        </div>
      )}
    </div>
  )
}

function SummaryItem({ label, value }: any) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
       <span className="text-xs font-bold opacity-80 uppercase tracking-widest">{label}</span>
       <span className="text-lg font-black">{value}</span>
    </div>
  )
}

function ResultItem({ label, value }: any) {
  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
       <p className="text-2xl font-black text-slate-800">{value}</p>
    </div>
  )
}
