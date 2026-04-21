import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import PublishSurveyClient from "./client"

export default async function PublishSurveyPage({ params }: any) {
  const { id } = await params
  console.log('Publishing for survey:', id) PublishSurveyPage({ params }: any) {
  const { id } = await params
  
  try {
    const period = await prisma.surveyPeriod.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        targetAudience: true,
        status: true,
        isActive: true,
        startDate: true,
        endDate: true,
        academicYearId: true,
      }
    })
    if (!period) return notFound()

    const classes = await prisma.class.findMany({
      include: {
        campus: true,
        _count: { select: { students: true } }
      },
      orderBy: [{ campus: { campusName: "asc" } }, { className: "asc" }]
    })

    // Manual serialization to avoid Date object issues in Client components
    const cleanPeriod = {
      ...period,
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString()
    }

    const cleanClasses = JSON.parse(JSON.stringify(classes))

    return (
      <div className="animate-in fade-in duration-500">
        <PublishSurveyClient initialSurvey={cleanPeriod} classes={cleanClasses} />
      </div>
    )
  } catch (error: any) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-3xl text-red-600 font-bold">
        Lỗi tải dữ liệu: {error.message}
      </div>
    )
  }
}
