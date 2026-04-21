import { prisma } from "@/lib/db"
import { AdminSurveysClient } from "./client"
import { createSurveyPeriodAction, updateSurveyPeriodAction, deleteSurveyPeriodAction, deleteMultipleSurveysAction } from "./actions"
import { CalendarDays, Sparkles } from "lucide-react"

export const metadata = { title: "Quan ly Khao sat | Skyline Academy" }

export default async function AdminSurveysPage() {
  let surveys: any[] = []
  let years: any[] = []
  let campuses: any[] = []

  try {
    // Self-heal: ensure columns exist in production DB
    try { await prisma.$executeRawUnsafe("ALTER TABLE SurveyPeriod ADD COLUMN targetAudience TEXT DEFAULT 'PHHS'") } catch {}
    try { await prisma.$executeRawUnsafe("ALTER TABLE SurveyPeriod ADD COLUMN campusId TEXT") } catch {}

    // Defensive query - no campus relation join on SurveyPeriod
    surveys = await prisma.surveyPeriod.findMany({
      include: { academicYear: { select: { id: true, name: true } } },
      orderBy: { startDate: "desc" }
    })

    years = await prisma.academicYear.findMany({
      select: { id: true, name: true, status: true },
      orderBy: { startDate: "desc" }
    })

    campuses = await prisma.campus.findMany({
      orderBy: { campusName: "asc" }
    })
  } catch (e: any) {
    console.error("AdminSurveysPage error:", e.message)
  }

  const activeYear = years.find(y => y.status === "ACTIVE")?.name || ""

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#BE1E2E] font-black text-[10px] uppercase tracking-[0.2em]">
            <Sparkles className="w-3 h-3" /> Skyline Admin System
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quan ly Khao sat</h1>
          <p className="text-slate-500 font-medium text-sm">He thong do luong chat luong giao duc Skyline Academy.</p>
        </div>
        {activeYear && (
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <CalendarDays className="w-5 h-5 text-[#BE1E2E]" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Nam hoc</p>
              <p className="text-sm font-black text-slate-800">{activeYear}</p>
            </div>
          </div>
        )}
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
