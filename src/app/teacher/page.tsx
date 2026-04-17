import { getTeacherMetrics } from "@/services/dashboard"
import { auth } from "@/lib/auth"
import { KPICard } from "@/components/KPICard"
import { Users, CheckCircle2, Award, ClipboardCheck, ArrowRight, Sparkles, BookOpen } from "lucide-react"
import Link from "next/link"

export default async function TeacherDashboard() {
  const session = await auth()
  const userName = session?.user?.name || "Thầy/Cô"
  const metrics = await getTeacherMetrics((session?.user as any)?.id || '').catch(() => ({ 
    totalStudents: 0, 
    surveyedStudents: 0, 
    notSurveyedStudents: 0, 
    completionRate: 0, 
    averageSatisfactionScore: 0, 
    nps: 0
  }))

  return (
    <div className="space-y-10 pb-10">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-200">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full -ml-32 -mb-32 blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold tracking-widest uppercase mb-6 border border-white/30 shadow-inner">
              <Sparkles size={14} className="text-amber-300 drop-shadow-sm"/> 
              Hệ thống khảo sát SQMS v4.0
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
              Chào buổi sáng, <br className="hidden lg:block"/> {userName}!
            </h1>
            <p className="text-indigo-50 text-lg font-medium opacity-90 max-w-xl leading-relaxed">
              Chúc Thầy/Cô một ngày làm việc hiệu quả. Đã đến lúc cập nhật kết quả khảo sát năng lực đầu vào cho các em học sinh.
            </p>
            
            <div className="mt-8 flex flex-wrap justify-center md:justify-start gap-4">
               <Link href="/teacher/input-assessments" className="bg-white text-indigo-700 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-900/10 hover:shadow-indigo-900/20 hover:-translate-y-1 transition-all flex items-center gap-3 active:scale-95 group">
                  Bắt đầu khảo sát
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
               </Link>
               <button className="bg-indigo-500/30 backdrop-blur-md text-white border border-indigo-400/30 px-8 py-4 rounded-2xl font-bold text-sm hover:bg-indigo-500/40 transition-all flex items-center gap-3">
                  <BookOpen size={18} />
                  Hướng dẫn sử dụng
               </button>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-6">
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 flex flex-col items-center">
               <div className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-2">Tỷ lệ hoàn thành</div>
               <div className="text-5xl font-black text-white">{metrics.completionRate.toFixed(0)}%</div>
               <div className="w-24 h-1.5 bg-white/20 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${metrics.completionRate}%` }}></div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 group hover:border-indigo-200 transition-colors">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
            <Users size={24} />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Tổng học sinh</p>
          <p className="text-3xl font-black text-slate-800">{metrics.totalStudents}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 group hover:border-emerald-200 transition-colors">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Đã khảo sát</p>
          <p className="text-3xl font-black text-slate-800">{metrics.surveyedStudents}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 group hover:border-amber-200 transition-colors">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-all duration-500">
            <Award size={24} />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">NPS Lớp học</p>
          <p className="text-3xl font-black text-slate-800">{metrics.nps.toFixed(1)}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 group hover:border-rose-200 transition-colors">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-rose-600 group-hover:text-white transition-all duration-500">
            <ClipboardCheck size={24} />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Hài lòng TB</p>
          <p className="text-3xl font-black text-slate-800">{metrics.averageSatisfactionScore.toFixed(1)}</p>
        </div>
      </div>

       {/* Quick Navigation / Next Task */}
       <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/40">
          <div className="flex flex-col md:flex-row items-center gap-8">
             <div className="w-full md:w-1/3 aspect-video bg-slate-50 rounded-2xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10"></div>
                <Users size={64} className="text-indigo-200" />
             </div>
             <div className="flex-1 space-y-4">
                <h3 className="text-2xl font-extrabold text-slate-800">Danh sách học sinh cần khảo sát</h3>
                <p className="text-slate-500 font-medium">Bạn có <span className="text-red-500 font-bold">{metrics.notSurveyedStudents} học sinh</span> chưa được nhập kết quả khảo sát đầu vào. Hãy hoàn thiện dữ liệu để hệ thống có thể tổng hợp báo cáo chính xác nhất.</p>
                <div className="pt-2">
                   <Link href="/teacher/input-assessments" className="inline-flex items-center gap-2 text-indigo-600 font-black text-sm uppercase tracking-widest hover:gap-4 transition-all">
                      Đến danh sách nhập điểm
                      <ArrowRight size={20} />
                   </Link>
                </div>
             </div>
          </div>
       </div>
    </div>
  )
}
