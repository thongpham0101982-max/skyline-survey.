import { prisma } from "@/lib/db"
import { AdminSurveysClient } from "./client"
import { createSurveyPeriodAction, updateSurveyPeriodAction, deleteSurveyPeriodAction, deleteMultipleSurveysAction } from "./actions"
import { CalendarDays, Sparkles, AlertCircle } from "lucide-react"

export const metadata = { title: "Quản lý Khảo sát | Skyline Academy" }

export default async function AdminSurveysPage() {
  let surveys: any[] = []
  let years: any[] = []
  let campuses: any[] = []
  let error: string | null = null

  try {
    const sResult = await prisma.surveyPeriod.findMany({
      include: { 
        academicYear: { select: { id: true, name: true } },
        campus: { select: { id: true, campusName: true } }
      },
      orderBy: { startDate: "desc" }
    })

    const yResult = await prisma.academicYear.findMany({
      select: { id: true, name: true, status: true },
      orderBy: { startDate: "desc" }
    })

    const cResult = await prisma.campus.findMany({
      orderBy: { campusName: "asc" }
    })

    surveys = sResult || []
    years = yResult || []
    campuses = cResult || []
  } catch (e: any) {
    error = e.message
  }

  const activeYear = years.find(y => y.status === "ACTIVE")?.name || "2023-2024"

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

      <AdminSurveysClient 
        initialSurveys={surveys}
        years={years}
        campuses={campuses}
        createAction={createSurveyPeriodAction}
        updateAction={updateSurveyPeriodAction}
        deleteAction={deleteSurveyPeriodAction}
        deleteMultipleAction={deleteMultipleSurveysAction}
      />
    </div>
  )
}
