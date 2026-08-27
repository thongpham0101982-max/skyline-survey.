import { prisma } from "@/lib/db"
import { AdminSurveysClient } from "./client"
import { createSurveyPeriodAction, updateSurveyPeriodAction, deleteSurveyPeriodAction, deleteMultipleSurveysAction } from "./actions"
import { CalendarDays, Sparkles, AlertCircle } from "lucide-react"
import { SurveyTabs } from "@/components/SurveyTabs"

export const metadata = { title: "Hệ thống Khảo sát | Skyline Academy" }

export default async function AdminSurveysPage() {
  let surveys: any[] = []
  let years: any[] = []
  let campuses: any[] = []
  let error: string | null = null

  try {
    // 1. Fetch Years and Campuses first (Stable tables)
    years = await prisma.academicYear.findMany({
      select: { id: true, name: true, status: true },
      orderBy: { startDate: "desc" }
    })

    campuses = await prisma.campus.findMany({
      orderBy: { campusName: "asc" }
    })

    // 2. Fetch Surveys with defensive mapping
    const rawSurveys = await prisma.surveyPeriod.findMany({
       include: {
          academicYear: { select: { id: true, name: true } }
       },
       orderBy: { startDate: "desc" }
    })

    surveys = rawSurveys.map(s => ({
       id: s.id,
       code: s.code,
       name: s.name,
       targetAudience: (s as any).targetAudience || "PHHS",
       status: s.status,
       isActive: s.isActive,
       startDate: s.startDate.toISOString(),
       endDate: s.endDate.toISOString(),
       academicYear: s.academicYear
    }))

  } catch (e: any) {
    console.error("SURVEY_PAGE_ERROR:", e.message)
    error = e.message
  }

  const activeYear = years.find(y => y.status === "ACTIVE")?.name || ""

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#BE1E2E] font-black text-[10px] uppercase tracking-[0.2em]">
            <Sparkles className="w-3 h-3" /> Skyline Admin System
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý Khảo sát</h1>
          {error && (
            <div className="p-4 flex items-center gap-3 text-red-600 font-bold text-xs text-xs font-semibold">
               <AlertCircle className="w-4 h-4" /> Hệ thống đang bận hoặc có lỗi cấu trúc: {error}
            </div>
          )}
        </div>
        {activeYear && (
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <CalendarDays className="w-5 h-5 text-[#BE1E2E]" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Năm học</p>
              <p className="text-sm font-black text-slate-800">{activeYear}</p>
            </div>
          </div>
        )}
      </div>

      <SurveyTabs activeTab="surveys" />

      <AdminSurveysClient
        initialSurveys={JSON.parse(JSON.stringify(surveys))}
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
