import { prisma } from "@/lib/db"
import { AdminSurveysClient } from "./client"
import { createSurveyPeriodAction, updateSurveyPeriodAction, deleteSurveyPeriodAction, deleteMultipleSurveysAction } from "./actions"

export const metadata = { title: "Quan ly Khao sat | Admin Portal" }

export default async function AdminSurveysPage() {
  const [surveys, years] = await Promise.all([
    prisma.surveyPeriod.findMany({
      orderBy: { startDate: "desc" },
      include: { academicYear: { select: { id: true, name: true } } }
    }),
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, status: true }
    })
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quan ly Khao sat</h1>
        <p className="text-slate-500 mt-1 text-sm">Tao va quan ly cac dot khao sat phu huynh theo nam hoc.</p>
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
