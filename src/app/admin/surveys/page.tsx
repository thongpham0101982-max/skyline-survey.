import { prisma } from "@/lib/db"
import { AdminSurveysClient } from "./client"
import { createSurveyPeriodAction, updateSurveyPeriodAction, deleteSurveyPeriodAction, deleteMultipleSurveysAction } from "./actions"

export const metadata = { title: "Quản lý Khảo sát | Admin Portal" }

export default async function AdminSurveysPage() {
  let surveys: any[] = []
  let years: any[] = []
  let error: string | null = null

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
    surveys = sResult
    years = yResult
  } catch (e: any) {
    console.error("Survey Page DB Error:", e)
    error = e.message
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl mb-4">
          <p className="font-bold">Lỗi dữ liệu hệ thống:</p>
          <code className="text-xs">{error}</code>
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
