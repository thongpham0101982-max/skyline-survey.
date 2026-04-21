import { prisma } from "@/lib/db"
import { AdminSurveysClient } from "./client"
import { createSurveyPeriodAction, updateSurveyPeriodAction, deleteSurveyPeriodAction, deleteMultipleSurveysAction } from "./actions"

export const metadata = { title: "Quản lý Khảo sát | Admin Portal" }

async function migrateProductionDb() {
  try {
    // Check if column exists
    await prisma.$queryRawUnsafe("SELECT targetAudience FROM SurveyPeriod LIMIT 1");
    return "Column detected";
  } catch (e) {
    try {
      await prisma.$executeRawUnsafe("ALTER TABLE SurveyPeriod ADD COLUMN targetAudience TEXT DEFAULT 'PHHS'");
      return "Migration Success: Added targetAudience";
    } catch (err: any) {
      return "Migration Failed: " + err.message;
    }
  }
}

export default async function AdminSurveysPage() {
  let surveys: any[] = []
  let years: any[] = []
  let debugInfo: string = ""

  // FORCE MIGRATION IN PRODUCTION
  debugInfo = await migrateProductionDb();

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
    debugInfo += " | Loaded: " + surveys.length + " surveys";
  } catch (e: any) {
    debugInfo += " | Fetch Error: " + e.message;
  }

  return (
    <div className="space-y-6">
      <div className="p-2 bg-slate-800 text-white text-[10px] rounded flex justify-between">
        <span>System Status: {debugInfo}</span>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quản lý Khảo sát</h1>
          <p className="text-slate-500 mt-1 text-sm">Thiết lập và quản lý các đợt khảo sát theo từng đối tượng.</p>
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
