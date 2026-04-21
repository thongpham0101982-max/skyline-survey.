import { prisma } from "@/lib/db"
import { AdminSurveysClient } from "./client"
import { createSurveyPeriodAction, updateSurveyPeriodAction, deleteSurveyPeriodAction, deleteMultipleSurveysAction } from "./actions"

export const metadata = { title: "Quản lý Khảo sát | Admin Portal" }

export default async function AdminSurveysPage() {
  let surveys: any[] = []
  let years: any[] = []
  let debugInfo: string = ""

  try {
    const rawSurveys = await prisma.surveyPeriod.findMany();
    debugInfo = "Raw Count: " + rawSurveys.length;

    const [sResult, yResult] = await Promise.all([
      prisma.surveyPeriod.findMany({
        include: { 
          academicYear: { select: { id: true, name: true } }
        }
      }),
      prisma.academicYear.findMany({
        select: { id: true, name: true, status: true }
      })
    ])
    surveys = sResult;
    years = yResult;
    debugInfo += " | Included Count: " + surveys.length;
  } catch (e: any) {
    debugInfo = "Error: " + e.message;
  }

  return (
    <div className="space-y-6">
      <div className="p-2 bg-slate-800 text-white text-[10px] rounded opacity-50">
        Debug: {debugInfo}
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quản lý Khảo sát</h1>
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
