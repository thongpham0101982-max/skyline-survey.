import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getParentChildren } from "@/services/dashboard"
import { LayoutGrid, Users, Settings2, ArrowRight, ClipboardList, Info, LogOut, GraduationCap, CalendarDays } from "lucide-react"
import Link from "next/link"

export default async function ParentDashboard() {
  const session = await auth()
  const userId = (session?.user as any)?.id
  
  if (!userId) {
    return <div className="p-10 text-center">Unauthorized. Please log in.</div>
  }

  // 1. Get Parent Info and linked Children (Students)
  const parent = await prisma.parent.findUnique({
    where: { userId },
    include: { 
      students: { 
        include: { 
          student: {
            include: { 
               class: { include: { campus: true } }, 
               academicYear: true,
               surveyForms: { select: { id: true, status: true, surveyPeriodId: true } }
            } 
          } 
        } 
      } 
    }
  })

  // 2. Get active PHHS surveys (Target = PHHS)
  const surveys = await prisma.surveyPeriod.findMany({
    where: { status: "ACTIVE", targetAudience: "PHHS" },
    orderBy: { endDate: "desc" }
  })

  const children = parent?.students.map(s => s.student) || []

  return (
    <div className="min-h-screen bg-slate-50 pb-20 animate-in fade-in duration-1000">
      {/* Header Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="bg-[#BE1E2E] p-2.5 rounded-2xl">
                  <Users className="w-6 h-6 text-white" />
               </div>
               <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Cổng Phụ Huynh</h1>
                  <p className="text-[10px] font-black text-[#BE1E2E] uppercase tracking-widest leading-none">Skyline Academy</p>
               </div>
            </div>
            <div className="flex items-center gap-6">
               <div className="hidden sm:block text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài khoản</p>
                  <p className="text-sm font-bold text-slate-800">{session?.user?.name}</p>
               </div>
               <Link href="/api/auth/signout" className="p-3 text-slate-400 hover:text-[#BE1E2E] hover:bg-red-50 rounded-2xl transition-all">
                  <LogOut className="w-5 h-5" />
               </Link>
            </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        {/* Welcome Section */}
        <div className="space-y-2">
           <h2 className="text-4xl font-black text-slate-900 tracking-tight">Chào {session?.user?.name?.split(' ').pop()}, 👋</h2>
           <p className="text-slate-500 font-medium text-lg">Vui lòng cập nhật các hoạt động và khảo sát của con em tại đây.</p>
        </div>

        {/* Children Selection Logic - Premium Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {children.map((child: any) => (
             <div key={child.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 hover:shadow-2xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-12 -mt-12 opacity-50 transition-transform group-hover:scale-110" />
                <div className="relative z-10">
                   <div className="flex justify-between items-start mb-6">
                      <div className="w-16 h-16 bg-blue-100 rounded-[1.5rem] flex items-center justify-center text-blue-600 transition-colors group-hover:bg-[#BE1E2E] group-hover:text-white">
                         <GraduationCap className="w-8 h-8" />
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mã Học sinh</span>
                         <span className="text-sm font-black text-slate-800">{child.studentCode}</span>
                      </div>
                   </div>

                   <h3 className="text-2xl font-black text-slate-900 mb-1 group-hover:text-[#BE1E2E] transition-colors">{child.studentName}</h3>
                   <div className="flex items-center gap-2 mb-8">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{child.class?.className}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{child.class?.campus?.campusName}</span>
                   </div>

                   <div className="space-y-4 pt-6 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đợt khảo sát đang diễn ra</p>
                      {surveys.length === 0 ? (
                        <p className="text-xs font-bold text-slate-300 italic">Hiện không có đợt khảo sát</p>
                      ) : (
                        surveys.map((s: any) => {
                          const form = child.surveyForms?.find((f: any) => f.surveyPeriodId === s.id)
                          const isDone = form?.status === 'COMPLETED'
                          return (
                            <Link 
                              key={s.id}
                              href={isDone ? "#" : `/parent/surveys/${s.id}?studentId=${child.id}`}
                              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isDone ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-blue-100 hover:border-[#BE1E2E] hover:shadow-md'}`}
                            >
                               <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDone ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-600'}`}>
                                     {isDone ? <CheckCircle2 className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
                                  </div>
                                  <div>
                                     <p className="text-xs font-black text-slate-800 line-clamp-1">{s.name}</p>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{isDone ? "Đã hoàn thành" : "Chưa hoàn thành"}</p>
                                  </div>
                               </div>
                               {!isDone && <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#BE1E2E] transition-colors" />}
                            </Link>
                          )
                        })
                      )}
                   </div>
                </div>
             </div>
           ))}
        </div>

        {children.length === 0 && (
          <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
             <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-slate-300" />
             </div>
             <h3 className="text-2xl font-black text-slate-900 mb-2">Chưa gán thông tin con em</h3>
             <p className="text-slate-400 max-w-md mx-auto font-medium">Vui lòng liên hệ văn phòng nhà trường để được hỗ trợ liên kết tài khoản.</p>
          </div>
        )}
      </main>

      <footer className="text-center py-20 px-6 opacity-30">
          <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">SQMS Skyline Education Group • 2026</p>
      </footer>
    </div>
  )
}

function CheckCircle2(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
    </svg>
  )
}
