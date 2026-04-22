import { requireStudentSession } from '@/lib/student-session'
import { prisma } from '@/lib/db'
import { GraduationCap, ClipboardList, CheckCircle2, Clock, ArrowRight, LogOut, CalendarDays } from 'lucide-react'
import Link from 'next/link'

export default async function HsDanhSachPage() {
  const session = await requireStudentSession()

  const forms = await prisma.surveyForm.findMany({
    where: {
      studentId: session.studentId,
      surveyPeriod: { targetAudience: 'HocSinh', status: 'ACTIVE', isActive: true }
    },
    include: { surveyPeriod: true },
    orderBy: { surveyPeriod: { endDate: 'asc' } }
  })

  const pending = forms.filter(f => f.status === 'DRAFT')
  const done = forms.filter(f => f.status === 'SUBMITTED')

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl" style={{ background: '#BE1E2E' }}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skyline Academy</p>
              <p className="text-sm font-black text-slate-800">Khao sat Hoc sinh</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-black text-slate-800 truncate max-w-[160px]">{session.studentName}</p>
              <p className="text-[10px] text-slate-400">Lop {session.className}</p>
            </div>
            <form action="/api/hocsinh/logout" method="post">
              <button className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-600 transition-colors px-3 py-2 rounded-xl hover:bg-red-50">
                <LogOut className="w-4 h-4" /> Dang xuat
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-3xl p-7 text-white relative overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(135deg,#BE1E2E 0%,#7a0010 100%)' }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="relative z-10">
            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Xin chao</p>
            <h1 className="text-2xl font-black">{session.studentName}</h1>
            <div className="flex gap-2 mt-4 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.15)' }}>Lop {session.className}</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.15)' }}>{session.campusName}</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.15)' }}>MS: {session.studentCode}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Can hoan thanh</p>
            <p className="text-4xl font-black text-slate-800 mt-1">{pending.length}</p>
            <p className="text-xs text-slate-400">phieu khao sat</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Da hoan thanh</p>
            <p className="text-4xl font-black text-slate-800 mt-1">{done.length}</p>
            <p className="text-xs text-slate-400">phieu khao sat</p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-black text-slate-700 mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" style={{ color: '#BE1E2E' }} />
            Phieu chua lam
          </h2>
          {pending.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-100 p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-200 mx-auto mb-2" />
              <p className="font-black text-slate-400 text-sm">Ban da hoan thanh tat ca!</p>
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
                          <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Het: {end.toLocaleDateString('vi-VN')}</span>
                          {days <= 3 && <span className="font-black px-2 py-0.5 rounded-full text-[10px] animate-pulse" style={{ background: '#fef2f2', color: '#BE1E2E' }}>Con {days} ngay!</span>}
                        </div>
                      </div>
                    </div>
                    <Link href={'/hocsinh/hs-khaosat/lam/' + form.id}
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-black text-white uppercase tracking-wider transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                      style={{ background: '#0f172a' }}>
                      Lam ngay <ArrowRight className="w-4 h-4" />
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
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Da hoan thanh
            </h2>
            <div className="space-y-2">
              {done.map(f => (
                <div key={f.id} className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <p className="font-bold text-slate-700 text-sm">{f.surveyPeriod.name}</p>
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full uppercase">Da nop</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {forms.length === 0 && (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-100 p-16 text-center">
            <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-black text-slate-400">Chua co phieu khao sat nao</p>
            <p className="text-xs text-slate-300 mt-1">Lop cua ban chua duoc gan vao dot khao sat.</p>
          </div>
        )}
      </main>
    </div>
  )
}
