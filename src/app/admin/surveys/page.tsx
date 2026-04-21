import { prisma } from "@/lib/db"
import { AdminSurveysClient } from "./client"
import { createSurveyPeriodAction, updateSurveyPeriodAction, deleteSurveyPeriodAction, deleteMultipleSurveysAction } from "./actions"

export const metadata = { title: "Quản lý Khảo sát | Skyline Academy" }

async function ensureDbReady() {
  try {
    // Attempt column check
    await prisma.$queryRawUnsafe("SELECT targetAudience FROM SurveyPeriod LIMIT 1");
  } catch (e) {
    try {
      await prisma.$executeRawUnsafe("ALTER TABLE SurveyPeriod ADD COLUMN targetAudience TEXT DEFAULT 'PHHS'");
    } catch (err) {}
  }
}

export default async function AdminSurveysPage() {
  // Ensure the database has the required columns before fetching
  await ensureDbReady();

  let surveys: any[] = []
  let years: any[] = []

  try {
    const [sResult, yResult] = await Promise.all([
      prisma.surveyPeriod.findMany({
        orderBy: { startDate: "desc" },
        include: { 
          academicYear: { select: { id: true, name: true } }
        }
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

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Quản lý Khảo sát</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#BE1E2E] animate-pulse" />
            Hệ thống quản lý và thu thập ý kiến Skyline Academy
          </p>
        </div>
        <div className="flex bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Năm học hiện tại</p>
            <p className="text-sm font-bold text-slate-700">{years.find(y => y.status === 'ACTIVE')?.name || "N/A"}</p>
          </div>
          <div className="w-[1px] h-8 bg-slate-100" />
          <CalendarDays className="w-5 h-5 text-[#BE1E2E]" />
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
