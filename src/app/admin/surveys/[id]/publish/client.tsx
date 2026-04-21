"use client"
import { useState } from "react"
import { 
  Users, CheckCircle2, AlertCircle, ArrowLeft, 
  Send, Loader2, Info, ChevronRight, GraduationCap 
} from "lucide-react"
import Link from "next/link"
import { dispatchSurveyAction } from "./actions"

export default function PublishSurveyClient({ initialSurvey, classes }: any) {
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState("")

  const isStudentSurvey = initialSurvey.targetAudience === "HocSinh" || initialSurvey.targetAudience === "Hoc sinh"

  const toggleClass = (id: string) => {
    setSelectedClasses(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
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
    const hasMissing = !isStudentSurvey && results.missingRequirementCount > 0

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
               {isStudentSurvey 
                 ? "Hệ thống đã chuẩn bị phiếu khảo sát cho học sinh." 
                 : "Hệ thống đã chuẩn bị phiếu khảo sát cho phụ huynh."}
            </p>
          </div>

          <div className="p-10 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <ResultCard label="Tổng học sinh" value={results.totalStudents} sub="Trong các lớp đã chọn" />
              <ResultCard label="Phiếu đã tạo" value={results.created} sub="Sẵn sàng khảo sát" color="text-[#BE1E2E]" />
              <ResultCard label="Đã có trước đó" value={results.alreadyExisted} sub="Không tạo trùng" />
              <ResultCard 
                label={isStudentSurvey ? "Hợp lệ" : "Có Phụ huynh"} 
                value={results.eligibleCount} 
                sub={isStudentSurvey ? "Học sinh được gán" : "Hs có liên kết PH"} 
              />
            </div>

            {hasMissing && (
              <div className="p-5 bg-red-50 border border-red-100 rounded-3xl flex gap-4 items-start">
                 <Info className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                 <div>
                    <p className="text-red-700 font-bold text-sm">{results.missingRequirementCount} học sinh chưa được gán Phụ huynh.</p>
                    <p className="text-red-600/70 text-xs mt-1 leading-relaxed">Vì đây là khảo sát cho Phụ huynh, những học sinh này sẽ không nhận được phiếu. Vui lòng kiểm tra lại danh mục tài khoản PHHS.</p>
                 </div>
              </div>
            )}

            <div className="pt-6">
              <Link 
                href="/admin/surveys"
                className="w-full flex items-center justify-center gap-2 py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:shadow-xl transition-all"
              >
                Hoàn tất & Quay về <ArrowLeft className="w-5 h-5 rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16" />
        <div className="relative z-10 flex items-center gap-6">
           <div className="w-16 h-16 bg-[#BE1E2E]/10 rounded-[1.5rem] flex items-center justify-center">
              {isStudentSurvey ? <GraduationCap className="w-8 h-8 text-[#BE1E2E]" /> : <Users className="w-8 h-8 text-[#BE1E2E]" />}
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cấu hình phát hành</p>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{initialSurvey.name}</h1>
              <div className="flex gap-2 mt-2">
                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isStudentSurvey ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                    Đối tượng: {initialSurvey.targetAudience}
                 </span>
              </div>
           </div>
        </div>
        <Link href="/admin/surveys" className="text-slate-400 hover:text-slate-900 font-bold text-sm flex items-center gap-2 transition-colors">
           <ArrowLeft className="w-4 h-4" /> Quay lại
        </Link>
      </div>

      <div className="grid md:grid-cols-[1fr,320px] gap-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
           <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-lg">Chọn lớp tham gia</h3>
              <button 
                onClick={() => setSelectedClasses(selectedClasses.length === classes.length ? [] : classes.map((c:any)=>c.id))}
                className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                {selectedClasses.length === classes.length ? "Bỏ chọn hết" : "Chọn tất cả"}
              </button>
           </div>
           
           <div className="p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {classes.map((cls: any) => (
                    <button
                      key={cls.id}
                      onClick={() => toggleClass(cls.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedClasses.includes(cls.id) ? 'bg-indigo-50/50 border-indigo-600 ring-2 ring-indigo-600/10' : 'bg-slate-50 border-transparent border-slate-200'}`}
                    >
                       <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${selectedClasses.includes(cls.id) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>
                             {cls.className.charAt(0)}
                          </div>
                          <div className="text-left">
                             <p className={`font-black text-sm ${selectedClasses.includes(cls.id) ? 'text-indigo-900' : 'text-slate-700'}`}>{cls.className}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase">{cls.campus?.campusName}</p>
                          </div>
                       </div>
                       {selectedClasses.includes(cls.id) && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                    </button>
                 ))}
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-[#BE1E2E] p-8 rounded-[2rem] text-white shadow-xl shadow-red-500/20">
              <h4 className="font-black text-xl mb-4">Tổng hợp</h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-sm font-medium opacity-80">Số lớp đã chọn</span>
                    <span className="text-xl font-black">{selectedClasses.length}</span>
                 </div>
                 <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium opacity-80">Đối tượng phát</span>
                    <span className="text-sm font-black uppercase tracking-widest">{isStudentSurvey ? "Học sinh" : "Phụ huynh"}</span>
                 </div>
              </div>
              <button 
                onClick={handleDispatch}
                disabled={loading || selectedClasses.length === 0}
                className="w-full mt-8 bg-white text-[#BE1E2E] py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Phát hành ngay</>}
              </button>
           </div>

           <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
              <h5 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                 <Info className="w-4 h-4 text-slate-400" /> Lưu ý
              </h5>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                 {isStudentSurvey 
                   ? "Mỗi học sinh trong lớp đã chọn sẽ được cấp một phiếu khảo sát riêng biệt. Họ có thể đăng nhập bằng Mã Học sinh để thực hiện."
                   : "Mỗi Phụ huynh có liên kết với học sinh trong các lớp này sẽ nhận được lời mời khảo sát. Đảm bảo dữ liệu PHHS đã được gán đầy đủ."}
              </p>
           </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-200 text-red-700 rounded-2xl text-sm font-bold animate-shake text-center">
           {error}
        </div>
      )}
    </div>
  )
}

function ResultCard({ label, value, sub, color = "text-slate-900" }: any) {
  return (
    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
       <p className={`text-2xl font-black ${color}`}>{value}</p>
       <p className="text-[10px] font-medium text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}
