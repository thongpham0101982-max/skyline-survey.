"use client"
import { useState, useMemo } from "react"
import { 
  Users, CheckCircle2, AlertCircle, ArrowLeft, 
  Send, Loader2, Info, ChevronRight, GraduationCap,
  MapPin, Filter, Search, RotateCcw, Trash2
} from "lucide-react"
import Link from "next/link"
import { dispatchSurveyAction, revokeSurveyAction } from "./actions"

export default function PublishSurveyClient({ initialSurvey, classes }: any) {
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState("")
  const [selectedCampus, setSelectedCampus] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  const isStudentSurvey = initialSurvey?.targetAudience === "HocSinh" || initialSurvey?.targetAudience === "Hoc sinh"

  const campuses = useMemo(() => {
    if (!classes) return []
    const map = new Map()
    classes.forEach((c: any) => {
      if (c.campus) map.set(c.campus.id, c.campus.campusName)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [classes])

  const filteredClasses = useMemo(() => {
    if (!classes) return []
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
    if (!initialSurvey?.id) return
    if (selectedClasses.length === 0) {
      setError("Vui lòng chọn ít nhất một lớp!")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await dispatchSurveyAction(initialSurvey.id, selectedClasses)
      setResults({ ...res, type: 'DISPATCH' })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async () => {
    if (!initialSurvey?.id) return
    if (!confirm("Xác nhận thu hồi các phiếu khảo sát chưa thực hiện của các lớp đã chọn?")) return
    setLoading(true)
    try {
      const res = await revokeSurveyAction(initialSurvey.id, selectedClasses)
      setResults({ ...res, type: 'REVOKE' })
    } finally {
      setLoading(false)
    }
  }

  if (results) {
    const isRevoke = results.type === 'REVOKE'
    return (
      <div className="max-w-2xl mx-auto animate-in zoom-in duration-300">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
          <div className={`p-10 text-center ${isRevoke ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${isRevoke ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {isRevoke ? <RotateCcw className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
               {isRevoke ? "Đã thu hồi!" : "Phát hành thành công!"}
            </h2>
            <p className="text-slate-500 mt-2 font-medium">
               {isRevoke ? `Đã thu hồi ${results.count} phiếu khảo sát đang chờ.` : "Dữ liệu đã được cập nhật vào portal."}
            </p>
          </div>
          <div className="p-10">
             <button onClick={() => setResults(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold">Xong</button>
          </div>
        </div>
      </div>
    )
  }

  if (!initialSurvey) return <div className="p-20 text-center font-black">Loading survey data...</div>

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isStudentSurvey ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-[#BE1E2E]'}`}>
               {isStudentSurvey ? <GraduationCap className="w-6 h-6" /> : <Users className="w-6 h-6" />}
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Cấu hình phát hành</p>
               <h1 className="text-xl font-black text-slate-900 tracking-tight">{initialSurvey.name}</h1>
            </div>
         </div>
         <Link href="/admin/surveys" className="text-slate-400 hover:text-slate-900 font-bold text-sm flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Quay lại
         </Link>
      </div>

      <div className="grid md:grid-cols-[1fr,360px] gap-8">
         <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
               <div className="flex bg-slate-100 p-1 rounded-xl items-center gap-1">
                  <button onClick={() => setSelectedCampus("ALL")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedCampus === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>Tất cả</button>
                  {campuses.map(c => <button key={c.id} onClick={() => setSelectedCampus(c.id)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedCampus === c.id ? "bg-white text-[#BE1E2E] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>{c.name}</button>)}
               </div>
               <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Tìm tên lớp..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none ring-1 ring-slate-100" />
               </div>
            </div>

            {/* Class Selection */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-black text-slate-800 text-sm tracking-tight flex items-center gap-2">Chọn lớp tham gia <span className="px-2 py-0.5 bg-slate-200 rounded-lg text-[10px]">{selectedClasses.length}</span></h3>
                  <button onClick={handleSelectAllFiltered} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Chọn/Bỏ hiển thị</button>
               </div>
               <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {filteredClasses.map((cls: any) => (
                    <button key={cls.id} onClick={() => toggleClass(cls.id)} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${selectedClasses.includes(cls.id) ? 'bg-indigo-50/30 border-indigo-600' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${selectedClasses.includes(cls.id) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}>{cls.className.charAt(0)}</div>
                       <div>
                          <p className="font-black text-slate-900 leading-none mb-1 text-sm">{cls.className}</p>
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{cls.campus?.campusName}</p>
                       </div>
                    </button>
                  ))}
               </div>
            </div>
         </div>

         {/* Actions Side */}
         <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20 space-y-8">
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Thao tác</h3>
               <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                     <span className="text-xs font-bold text-slate-400 italic">Đã chọn</span>
                     <span className="text-xl font-black text-slate-900">{selectedClasses.length} lớp</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                     <span className="text-xs font-bold text-slate-400 italic">Đối tượng</span>
                     <span className="text-xs font-black text-[#BE1E2E] uppercase tracking-widest">{isStudentSurvey ? "Học sinh" : "Phụ huynh"}</span>
                  </div>
               </div>

               <div className="space-y-3">
                  <button onClick={handleDispatch} disabled={loading || selectedClasses.length === 0} className="w-full py-5 bg-[#BE1E2E] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-3 disabled:opacity-30">
                     {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Phát hành ngay</>}
                  </button>
                  <button onClick={handleRevoke} disabled={loading || selectedClasses.length === 0} className="w-full py-4 text-slate-400 hover:text-red-600 font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                     <RotateCcw className="w-4 h-4" /> Thu hồi / Hủy phiếu
                  </button>
               </div>
            </div>
            
            <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white">
               <h4 className="font-black text-sm mb-3 flex items-center gap-2"><Info className="w-4 h-4 text-indigo-400" /> Hướng dẫn</h4>
               <p className="text-xs font-medium text-slate-400 leading-relaxed italic">
                  Chọn các lớp cần thực hiện khảo sát rồi nhấn "Phát hành". Nếu muốn hủy phiếu đã phát (trạng thái chờ), hãy nhấn "Thu hồi".
               </p>
            </div>
         </div>
      </div>
    </div>
  )
}
