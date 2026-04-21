import { prisma } from "@/lib/db"
import { AdminSurveysClient } from "./client"
import { createSurveyPeriodAction, updateSurveyPeriodAction, deleteSurveyPeriodAction, deleteMultipleSurveysAction } from "./actions"
import { CalendarDays, Sparkles, AlertCircle } from "lucide-react"

export const metadata = { title: "Quản lý Khảo sát | Skyline Academy" }

export default async function AdminSurveysPage() {
  let surveys: any[] = []
  let years: any[] = []
  let error: string | null = null

  try {
    // 1. Ensure DB Column exists (Self-healing)
    try {
      await prisma.$executeRawUnsafe("ALTER TABLE SurveyPeriod ADD COLUMN targetAudience TEXT DEFAULT 'PHHS'");
    } catch (e) {
      // Column probably already exists, ignore
    }

    // 2. Fetch data with extreme caution
    const sResult = await prisma.surveyPeriod.findMany({
      include: { academicYear: { select: { id: true, name: true } } },
      orderBy: { startDate: "desc" }
    }).catch(async (e) => {
       console.error("Survey Fetch Failed:", e.message);
       // Fallback: try without include
       return await prisma.surveyPeriod.findMany({ orderBy: { startDate: "desc" } });
    });

    const yResult = await prisma.academicYear.findMany({
      select: { id: true, name: true, status: true },
      orderBy: { startDate: "desc" }
    }).catch(() => []);

    surveys = sResult || [];
    years = yResult || [];
  } catch (e: any) {
    error = e.message;
  }

  const activeYear = years.find(y => y.status === 'ACTIVE')?.name || "2023-2024"

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#BE1E2E] font-black text-[10px] uppercase tracking-[0.2em]">
            <Sparkles className="w-3 h-3" /> Skyline Admin System
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý Khảo sát</h1>
          <p className="text-slate-500 font-medium text-sm">Hệ thống đo lường chất lượng giáo dục Skyline Academy.</p>
        </div>

        <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
           <CalendarDays className="w-5 h-5 text-[#BE1E2E]" />
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Năm học</p>
              <p className="text-sm font-black text-slate-800">{activeYear}</p>
           </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span>Lỗi truy xuất hệ thống: {error}. Vui lòng thử lại sau.</span>
        </div>
      )}

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
