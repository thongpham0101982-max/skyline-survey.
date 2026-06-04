import { prisma } from "@/lib/db"
import Link from "next/link"
import { BarChart3, ArrowRight, ClipboardList, Sparkles } from "lucide-react"

export const dynamic = "force-dynamic"
export const metadata = { title: "Dashboard NPS - Skyline" }

export default async function NpsDashboardPage() {
  const periods = await prisma.surveyPeriod.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: {
        select: {
          surveyForms: true
        }
      }
    }
  })

  const submittedCounts = await Promise.all(
    periods.map(async (p) => {
      const count = await prisma.surveyForm.count({
        where: { surveyPeriodId: p.id, status: { in: ["SUBMITTED", "submitted"] } }
      })
      return { id: p.id, submitted: count }
    })
  )
  const submittedMap = Object.fromEntries(submittedCounts.map(x => [x.id, x.submitted]))

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="relative bg-white rounded-[2rem] p-8 border-2 border-rose-100 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#BE1E2E]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-[1.5rem] bg-[#BE1E2E]/10 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-[#BE1E2E]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3 h-3 text-[#BE1E2E]" />
              <span className="text-[10px] font-black text-[#BE1E2E] uppercase tracking-widest">Skyline Survey Analytics</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard NPS & Kết quả Khảo sát</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Chon dot khao sat de xem phan tich NPS, tu tieu chi theo Lop, Co so va Tong the.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {periods.map((p) => {
          const total = p._count.surveyForms
          const submitted = submittedMap[p.id] ?? 0
          const rate = total > 0 ? Math.round((submitted / total) * 100) : 0
          return (
            <div key={p.id} className="bg-white rounded-[2rem] border-2 border-indigo-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 p-6 group">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-14 h-14 rounded-[1.2rem] bg-indigo-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <ClipboardList className="w-7 h-7 text-indigo-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${p.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                      {p.status === "ACTIVE" ? "Dang tien hanh" : p.status}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">{p.code}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800">{p.name}</h3>
                  <div className="flex items-center gap-6 text-xs font-bold text-slate-400">
                    <span>Tong: {total} phieu</span>
                    <span className="text-emerald-600">Da nop: {submitted}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: rate + "%" }} />
                      </div>
                      <span>{rate}%</span>
                    </div>
                  </div>
                </div>
                <Link
                  href={"/admin/surveys/" + p.id + "/results"}
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-sm font-black text-white shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700"
                >
                  <BarChart3 className="w-4 h-4" /> Phan tich NPS <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )
        })}
        {periods.length === 0 && (
          <div className="text-center py-20 text-slate-400 font-bold">Chua co dot khao sat nao.</div>
        )}
      </div>
    </div>
  )
}

