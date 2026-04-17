import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { PublishSurveyClient } from "./client"

export default async function PublishSurveyPage({ params }: any) {
  const { id } = await params
  
  const period = await prisma.surveyPeriod.findUnique({
    where: { id }
  })
  if (!period) return notFound()

  // Find all classes (perhaps filtered by academicYearId in the future, for MVP we show all active)
  const classes = await prisma.class.findMany({
    include: {
      campus: true,
      _count: {
        select: { students: true }
      }
    },
    orderBy: [{ campus: { campusName: 'asc' } }, { className: 'asc' }]
  })

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900">Phát hành Form Đánh giá</h1>
        <p className="text-sm font-medium text-indigo-600 bg-indigo-50 inline-block px-3 py-1 rounded-full border border-indigo-200 uppercase tracking-wider mt-2">Target: {period.name}</p>
      </div>

      <PublishSurveyClient period={period} classes={classes} />
    </div>
  )
}