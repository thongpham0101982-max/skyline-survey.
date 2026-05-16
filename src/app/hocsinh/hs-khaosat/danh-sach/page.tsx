// @ts-nocheck
export const dynamic = 'force-dynamic';
import { requireStudentSession } from '@/lib/student-session'
import { prisma } from '@/lib/db'
import { 
  ClipboardList, CheckCircle2, ArrowRight, CalendarDays, 
  Sparkles, Clock, AlertCircle, History, LayoutGrid, 
  Clock3, CheckCircle, Timer
} from 'lucide-react'
import Link from 'next/link'

export default async function HsDanhSachPage() {
  const session = await requireStudentSession()
  const now = new Date()

  // 1. Fetch Assigned Forms
  const forms = await prisma.surveyForm.findMany({
    where: {
      studentId: session.studentId,
      surveyPeriod: { OR: [{ status: 'ACTIVE' }, { isActive: true }] }
    },
    include: { surveyPeriod: true },
    orderBy: { surveyPeriod: { endDate: 'asc' } }
  })

  const existingPeriodIds = forms.map(f => f.surveyPeriodId)
  
  // 2. Fetch Available Self-Service Periods
  const availablePeriods = await prisma.surveyPeriod.findMany({
    where: {
      OR: [{ status: 'ACTIVE' }, { isActive: true }],
      id: { notIn: existingPeriodIds },
      OR: [
        { targetAudience: { contains: 'Hoc' } },
        { targetAudience: { contains: 'HS' } },
        { targetAudience: { contains: 'học' } },
        { targetAudience: { contains: 'HỌC' } }
      ],
      OR: [
        { campusId: session.campusId },
        { campusId: null }
      ]
    },
    orderBy: { endDate: 'asc' }
  })

  // 3. Process and Group Surveys
  const allItems: any[] = []

  // Add assigned forms
  forms.forEach(f => {
    const start = new Date(f.surveyPeriod.startDate)
    const end = new Date(f.surveyPeriod.endDate)
    const submitted = f.status === 'SUBMITTED' || f.status === 'submitted'
    
    let status = 'OPEN'
    let statusLabel = 'Đang tiến hành'
    let statusColor = 'emerald'
    
    if (submitted) {
      status = 'COMPLETED'
      statusLabel = 'Đã hoàn thành'
      statusColor = 'slate'
    } else if (now < start) {
      status = 'UPCOMING'
      statusLabel = 'Chưa đến thời gian'
      statusColor = 'amber'
    } else if (now > end) {
      status = 'EXPIRED'
      statusLabel = 'Đã hết hạn'
      statusColor = 'rose'
    }

    allItems.push({
      id: f.id,
      name: f.surveyPeriod.name,
      startDate: start,
      endDate: end,
      status,
      statusLabel,
      statusColor,
      isAssigned: true,
      href: '/hocsinh/hs-khaosat/lam/' + f.id
    })
  })

  // Add available periods
  availablePeriods.forEach(p => {
    const start = new Date(p.startDate)
    const end = new Date(p.endDate)
    
    let status = 'OPEN'
    let statusLabel = 'Đang tiến hành'
    let statusColor = 'emerald'
    
    if (now < start) {
      status = 'UPCOMING'
      statusLabel = 'Chưa đến thời gian'
      statusColor = 'amber'
    } else if (now > end) {
      status = 'EXPIRED'
      statusLabel = 'Đã hết hạn'
      statusColor = 'rose'
    }

    allItems.push({
      id: p.id,
      name: p.name,
      startDate: start,
      endDate: end,
      status,
      statusLabel,
      statusColor,
      isAssigned: false,
      href: '/hocsinh/hs-khaosat/lam/new?periodId=' + p.id
    })
  })

  // Sort: Upcoming -> Open -> Expired -> Completed
  const statusOrder: any = { 'UPCOMING': 0, 'OPEN': 1, 'EXPIRED': 2, 'COMPLETED': 3 }
  allItems.sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0) || a.endDate.getTime() - b.endDate.getTime())

  const pendingCount = allItems.filter(i => i.status === 'OPEN').length
  const upcomingCount = allItems.filter(i => i.status === 'UPCOMING').length
  const completedCount = allItems.filter(i => i.status === 'COMPLETED').length

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10 min-h-screen pb-20">
      {/* Premium Header Card */}
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl p-1" style={{ background: 'linear-gradient(135deg, #BE1E2E 0%, #7a0010 100%)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-10 -mb-10 blur-2xl" />
        
        <div className="relative z-10 bg-black/10 backdrop-blur-md rounded-[2.2rem] p-8 md:p-10 text-white border border-white/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/20 text-white/80 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Học sinh Skyline</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight">{session.studentName}</h1>
              <div className="flex items-center gap-4 flex-wrap text-white/70 font-bold text-sm pt-2">
                <span className="flex items-center gap-1.5"><LayoutGrid className="w-4 h-4 opacity-50" /> {session.className}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span className="flex items-center gap-1.5"><History className="w-4 h-4 opacity-50" /> {session.campusName}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span className="flex items-center gap-1.5">ID: {session.studentCode}</span>
              </div>
            </div>
            <div className="flex flex-row md:flex-col gap-3">
               <div className="bg-white/10 p-4 rounded-3xl border border-white/10 text-center min-w-[100px]">
                  <p className="text-[10px] uppercase font-black tracking-widest text-white/50 mb-1">Đang chờ</p>
                  <p className="text-2xl font-black">{pendingCount}</p>
               </div>
               <div className="bg-white/10 p-4 rounded-3xl border border-white/10 text-center min-w-[100px]">
                  <p className="text-[10px] uppercase font-black tracking-widest text-white/50 mb-1">Hoàn tất</p>
                  <p className="text-2xl font-black">{completedCount}</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main List Section */}
      <div className="space-y-8">
        
        {/* Current & Urgent Surveys */}
        {(pendingCount > 0 || upcomingCount > 0) && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100">
                    <Timer className="w-5 h-5 text-amber-500" />
                 </div>
                 Khảo sát cần thực hiện
              </h2>
            </div>

            <div className="grid gap-4">
              {allItems.filter(i => i.status === 'OPEN' || i.status === 'UPCOMING').map(item => (
                <div key={item.id} 
                  className="group bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 p-2 overflow-hidden relative"
                >
                  {/* Status Indicator */}
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                     <Sparkles className="w-24 h-24 text-indigo-900" />
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 md:p-6 relative z-10">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-300
                      ${item.status === 'OPEN' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                       <ClipboardList className="w-8 h-8" />
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border
                          ${item.status === 'OPEN' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {item.statusLabel}
                        </span>
                        {!item.isAssigned && <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">Tự chọn</span>}
                      </div>
                      <h3 className="text-xl font-black text-slate-800 leading-tight">{item.name}</h3>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                         <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 opacity-50" /> Bắt đầu: {item.startDate.toLocaleDateString('vi-VN')}</span>
                         <span className="flex items-center gap-1.5"><Clock3 className="w-4 h-4 opacity-50" /> Kết thúc: {item.endDate.toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>

                    <div className="pt-2 md:pt-0">
                      {item.status === 'OPEN' ? (
                        <Link href={item.href}
                          className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-sm font-black text-white shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700"
                        >
                          Bắt đầu ngay <ArrowRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <div className="px-8 py-4 rounded-2xl text-sm font-black text-slate-300 bg-slate-50 border border-slate-100 flex items-center gap-2 cursor-not-allowed">
                          Chưa mở <Clock className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expired or Completed Section */}
        <div className="grid md:grid-cols-2 gap-8">
           
           {/* Completed List */}
           <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
                 <CheckCircle className="w-4 h-4 text-emerald-500" /> Đã hoàn tất ({completedCount})
              </h3>
              <div className="space-y-3">
                 {completedCount === 0 && (
                   <div className="p-8 rounded-[2rem] border-2 border-dashed border-slate-100 text-center opacity-50">
                      <p className="text-xs font-bold text-slate-400">Chưa có khảo sát nào hoàn thành</p>
                   </div>
                 )}
                 {allItems.filter(i => i.status === 'COMPLETED').map(item => (
                   <div key={item.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between group hover:bg-emerald-50 transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-emerald-500 border border-slate-200">
                            <CheckCircle2 className="w-4 h-4" />
                         </div>
                         <p className="font-bold text-slate-700 text-sm line-clamp-1">{item.name}</p>
                      </div>
                      <span className="text-[9px] font-black text-emerald-600 bg-white border border-emerald-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">Đã nộp</span>
                   </div>
                 ))}
              </div>
           </div>

           {/* Expired List */}
           <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
                 <AlertCircle className="w-4 h-4 text-rose-500" /> Đã hết hạn
              </h3>
              <div className="space-y-3">
                 {allItems.filter(i => i.status === 'EXPIRED').length === 0 && (
                   <div className="p-8 rounded-[2rem] border-2 border-dashed border-slate-100 text-center opacity-50">
                      <p className="text-xs font-bold text-slate-400">Không có khảo sát nào quá hạn</p>
                   </div>
                 )}
                 {allItems.filter(i => i.status === 'EXPIRED').map(item => (
                   <div key={item.id} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between grayscale opacity-60">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-200">
                            <AlertCircle className="w-4 h-4" />
                         </div>
                         <p className="font-bold text-slate-500 text-sm line-clamp-1">{item.name}</p>
                      </div>
                      <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">Hết hạn</span>
                   </div>
                 ))}
              </div>
           </div>

        </div>

      </div>

      {/* Empty State */}
      {allItems.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100">
             <ClipboardList className="w-10 h-10 text-slate-200" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-800">Hiện không có đợt khảo sát nào</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">Vui lòng quay lại sau hoặc liên hệ quản trị viên để biết thêm thông tin.</p>
          </div>
        </div>
      )}
      
      {/* Footer Support */}
      <div className="text-center pt-10">
         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Skyline Academy Survey System</p>
      </div>
    </div>
  )
}
