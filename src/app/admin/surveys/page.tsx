import { prisma } from "@/lib/db"
import { AdminSurveysClient } from "./client"
import { createSurveyPeriodAction, updateSurveyPeriodAction, deleteSurveyPeriodAction, deleteMultipleSurveysAction } from "./actions"

export const metadata = { title: "Quản lý Khảo sát | Admin Portal" }

export default async function AdminSurveysPage() {
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
    surveys = sResult
    years = yResult
  } catch (e) {
    console.error("Survey Page Fetch Error:", e)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quản lý Khảo sát</h1>
          <p className="text-slate-500 mt-1 text-sm">Thiết lập và quản lý các đối tượng khảo sát theo từng đối tượng học sinh, phụ huynh và giáo viên.</p>
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
