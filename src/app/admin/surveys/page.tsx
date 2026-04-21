import { prisma } from "@/lib/db"
import { AdminSurveysClient } from "./client"
import { createSurveyPeriodAction, updateSurveyPeriodAction, deleteSurveyPeriodAction, deleteMultipleSurveysAction } from "./actions"
import { CalendarDays, Sparkles } from "lucide-react"

export const metadata = { title: "Quản lý Khảo sát | Skyline Academy" }

async function ensureDbReady() {
  try {
    await prisma.$queryRawUnsafe("SELECT targetAudience FROM SurveyPeriod LIMIT 1");
  } catch (e) {
    try {
      await prisma.$executeRawUnsafe("ALTER TABLE SurveyPeriod ADD COLUMN targetAudience TEXT DEFAULT 'PHHS'");
    } catch (err) {}
  }
}

export default async function AdminSurveysPage() {
  await ensureDbReady();

  let surveys: any[] = []
  let years: any[] = []

  try {
    const [sResult, yResult] = await Promise.all([
      prisma.surveyPeriod.findMany({
        orderBy: { startDate: "desc" },
        include: { academicYear: { select: { id: true, name: true } } }
      }),
      prisma.academicYear.findMany({
        orderBy: { startDate: "desc" },
        select: { id: true, name: true, status: true }
      })
    ])
    surveys = sResult;
    years = yResult;
  } catch (e: any) {
    console.error("Survey Page Fetch Error:", e.message);
  }

  const activeYear = years.find(y => y.status === 'ACTIVE')?.name || "2023-2024"

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#BE1E2E] font-black text-xs uppercase tracking-[0.2em] animate-pulse">
            <Sparkles className="w-3 h-3" /> Skyline Admin System
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Quản lý Khảo sát</h1>
          <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
            Hệ thống quản lý và đo lường sự hài lòng của cộng đồng Skyline.
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
           <div className="w-10 h-10 bg-[#BE1E2E]/5 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-[#BE1E2E]" />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Năm học triển khai</p>
              <p className="text-sm font-black text-slate-800">{activeYear}</p>
           </div>
        </div>
      </div>

      <AdminSurveysClient
        initialSurveys={surveys}
        years={years}
        createAction={createSurveyPeriodAction}
        updateAction={updateSurveyPeriodAction}
        deleteAction={deleteSurveyPeriodAction}
        deleteMultipleAction={deleteMultipleSurveysAction}
      />
    </div>
  )
}
