import { prisma } from "@/lib/db"
import { AdminSurveysClient } from "./client"
import { createSurveyPeriodAction, updateSurveyPeriodAction, deleteSurveyPeriodAction, deleteMultipleSurveysAction } from "./actions"

export const metadata = { title: "Quản lý Khảo sát | Admin Portal" }

export default async function AdminSurveysPage() {
  let surveys: any[] = []
  let years: any[] = []
  let error: string | null = null

  try {
    // Try simplest query possible to test DB health
    const sResult = await prisma.surveyPeriod.findMany({
      include: { 
        academicYear: { select: { id: true, name: true } }
      }
    });
    const yResult = await prisma.academicYear.findMany({
      select: { id: true, name: true, status: true }
    });
    
    surveys = sResult;
    years = yResult;
  } catch (e: any) {
    error = e.message;
    console.error(e);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quản lý Khảo sát</h1>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-200 text-red-700 rounded-xl mb-4">
          <p className="font-bold">Lỗi truy xuất dữ liệu:</p>
          <code className="text-xs break-all">{error}</code>
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
