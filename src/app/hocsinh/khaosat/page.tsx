// @ts-nocheck
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { ClipboardList, ArrowRight, CalendarDays, CheckCircle2, Clock } from "lucide-react"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import Link from "next/link"

export default async function StudentSurveyPage() {
  const session = await auth()
  const userId = (session?.user as any)?.id

  // 1. Get student info
  const student = await prisma.student.findUnique({
    where: { userId },
    include: { class: true, campus: true, academicYear: true }
  })

  const defaultYear = await getDefaultAcademicYear();
  const activeYearId = defaultYear?.id || "";

  // 2. Get active student surveys for the default academic year
  const surveys = await prisma.surveyPeriod.findMany({
    where: {
      status: "ACTIVE",
      targetAudience: "HocSinh",
      academicYearId: activeYearId
    },
    orderBy: { endDate: "asc" }
  })

  // 3. Check which ones are already submitted (simplified check for now)
  const submissions = await prisma.surveyForm.findMany({
    where: { studentId: student?.id || "" },
    select: { surveyPeriodId: true }
  })
  const submittedIds = new Set(submissions.map(s => s.surveyPeriodId))

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Student Welcome Card */}
      <div className="bg-white rounded-[2.5rem] p-8 border-2 border-indigo-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 -mr-20 -mt-20 opacity-50 text-xs font-semibold" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Chào {student?.studentName || "bạn"}, 👋</h2>
            <p className="text-slate-500 mt-2 font-medium">Cùng đóng góp ý kiến để xây dựng môi trường học tập tuyệt vời hơn nhé!</p>
            
            <div className="flex flex-wrap gap-3 mt-6">
               <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[11px] font-bold text-slate-600 border border-slate-200 uppercase">Lớp {student?.class?.className}</div>
               <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[11px] font-bold text-slate-600 border border-slate-200 uppercase">{student?.campus?.campusName}</div>
            </div>
          </div>
          
          <div className="flex gap-4">
             <div className="p-4 text-center min-w-[100px] text-xs font-semibold">
                <p className="text-[10px] font-black text-[#00A99D] uppercase tracking-widest mb-1">Cần làm</p>
                <p className="text-2xl font-black text-[#00A99D]">{surveys.length - submittedIds.size}</p>
             </div>
             <div className="p-4 text-center min-w-[100px] text-xs font-semibold">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Hoàn thành</p>
                <p className="text-2xl font-black text-emerald-600">{submittedIds.size}</p>
             </div>
          </div>
        </div>
      </div>

      {/* Survey List Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-slate-800 ml-4 flex items-center gap-2">
           <ClipboardList className="w-5 h-5 text-[#00A99D]" />
           Danh sách khảo sát dành cho học sinh
        </h3>

        <div className="grid gap-4">
          {surveys.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-16 text-center border-2 border-emerald-100 border-dashed">
               <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4 text-xs font-semibold">
                  <Clock className="w-10 h-10 text-slate-300" />
               </div>
               <p className="text-slate-400 font-bold">Hiện tại không có đợt khảo sát nào đang diễn ra.</p>
            </div>
          ) : (
            surveys.map((s) => {
              const isDone = submittedIds.has(s.id)
              return (
                <div key={s.id} className={`group relative bg-white rounded-[2rem] p-6 border transition-all ${isDone ? 'opacity-80 border-slate-100 shadow-none' : 'border-slate-200 shadow-sm hover:shadow-xl hover:border-[#00A99D]/20'}`}>
                   <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-5 w-full">
                         <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-colors ${isDone ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400 group-hover:bg-[#00A99D]/10 group-hover:text-[#00A99D]'}`}>
                            {isDone ? <CheckCircle2 className="w-7 h-7" /> : <ClipboardList className="w-7 h-7" />}
                         </div>
                         <div className="flex-1">
                            <h4 className="text-lg font-black text-slate-800">{s.name}</h4>
                            <div className="flex items-center gap-4 mt-1 text-xs font-bold text-slate-400">
                               <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Hết hạn: {new Date(s.endDate).toLocaleDateString("vi-VN")}</span>
                            </div>
                         </div>
                      </div>

                      <div className="w-full sm:w-auto">
                        {isDone ? (
                           <div className="text-emerald-600 text-xs font-black uppercase tracking-widest text-center text-xs font-semibold">
                              Đã hoàn thành
                           </div>
                        ) : (
                           <Link 
                              href={`/Hocsinh/khaosat/${s.id}`}
                              className="flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#00A99D] transition-all hover:scale-105 active:scale-95"
                           >
                              Thực hiện ngay <ArrowRight className="w-4 h-4" />
                           </Link>
                        )}
                      </div>
                   </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
