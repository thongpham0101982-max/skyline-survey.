export const dynamic = 'force-dynamic';
import { requireStudentSession } from '@/lib/student-session'
import { prisma } from '@/lib/db'
import { ClipboardList, CheckCircle2, ArrowRight, CalendarDays, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default async function HsDanhSachPage() {
  const session = await requireStudentSession()

  const forms = await prisma.surveyForm.findMany({
    where: {
      studentId: session.studentId,
      surveyPeriod: { status: 'ACTIVE' }
    },
    include: { surveyPeriod: true },
    orderBy: { surveyPeriod: { endDate: 'asc' } }
  })

  const existingPeriodIds = forms.map(f => f.surveyPeriodId)
  
  const availablePeriods = await prisma.surveyPeriod.findMany({
    where: {
      status: 'ACTIVE',
      id: { notIn: existingPeriodIds },
      OR: [
        { targetAudience: 'HocSinh' },
        { targetAudience: 'HS' },
        { targetAudience: 'Học sinh' },
        { targetAudience: 'hocsinh' },
        { campusId: session.campusId }
      ]
    },
    orderBy: { endDate: 'asc' }
  })

  const pending = forms.filter(f => f.status === 'DRAFT')
  const done = forms.filter(f => f.status === 'SUBMITTED')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="rounded-3xl p-7 text-white relative overflow-hidden shadow-xl"
        style={{ background: 'linear-gradient(135deg,#BE1E2E 0%,#7a0010 100%)' }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="relative z-10">
          <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Xin chào</p>
          <h1 className="text-2xl font-black">{session.studentName}</h1>
          <div className="flex gap-2 mt-4 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.15)' }}>Lớp {session.className}</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.15)' }}>{session.campusName}</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.15)' }}>MS: {session.studentCode}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Cần hoàn thành</p>
          <p className="text-4xl font-black text-slate-800 mt-1">{pending.length + availablePeriods.length}</p>
          <p className="text-xs text-slate-400">phiếu khảo sát</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Đã hoàn thành</p>
          <p className="text-4xl font-black text-slate-800 mt-1">{done.length}</p>
          <p className="text-xs text-slate-400">phiếu khảo sát</p>
        </div>
      </div>

      {availablePeriods.length > 0 && (
        <div>
          <h2 className="text-base font-black text-slate-700 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Đợt khảo sát mới khả dụng
          </h2>
          <div className="space-y-4">
            {availablePeriods.map(period => (
              <div key={period.id} className="bg-white rounded-3xl border-2 border-indigo-50 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all p-6 relative group overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ClipboardList className="w-24 h-24 text-indigo-900" />
                 </div>
                 <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] font-black text-indigo-600 uppercase tracking-wider border border-indigo-100">Mới</span>
                        <p className="font-black text-slate-800 text-lg">{period.name}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                         <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Hết hạn: {new Date(period.endDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                    <Link href={'/hocsinh/hs-khaosat/lam/new?periodId=' + period.id}
                      className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-black text-white shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }}>
                      Bắt đầu khảo sát <ArrowRight className="w-4 h-4" />
                    </Link>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-black text-slate-700 mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" style={{ color: '#BE1E2E' }} />
          Phiếu đang thực hiện
        </h2>
        {pending.length === 0 && availablePeriods.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-100 p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-200 mx-auto mb-2" />
            <p className="font-black text-slate-400 text-sm">Bạn đã hoàn thành tất cả!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(form => {
              const end = new Date(form.surveyPeriod.endDate)
              const days = Math.ceil((end.getTime() - Date.now()) / 86400000)
              return (
                <div key={form.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-2xl" style={{ background: 'rgba(190,30,46,0.08)' }}>
                      <ClipboardList className="w-5 h-5" style={{ color: '#BE1E2E' }} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800">{form.surveyPeriod.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Hết: {end.toLocaleDateString('vi-VN')}</span>
                        {days > 0 && days <= 3 && <span className="font-black px-2 py-0.5 rounded-full text-[10px] animate-pulse" style={{ background: '#fef2f2', color: '#BE1E2E' }}>Còn {days} ngày!</span>}
                      </div>
                    </div>
                  </div>
                  <Link href={'/hocsinh/hs-khaosat/lam/' + form.id}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-black text-white uppercase tracking-wider transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                    style={{ background: '#0f172a' }}>
                    Tiếp tục <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {done.length > 0 && (
        <div>
          <h2 className="text-base font-black text-slate-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Đã hoàn thành
          </h2>
          <div className="space-y-2">
            {done.map(f => (
              <div key={f.id} className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <p className="font-bold text-slate-700 text-sm">{f.surveyPeriod.name}</p>
                </div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full uppercase">Đã nộp</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
