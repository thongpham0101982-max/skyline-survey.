import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import PublishSurveyClient from "./client"

export default async function PublishSurveyPage({ params }: any) {
  // Be VERY careful with params in Next.js 15
  const { id } = await params
  
  if (!id) return notFound()

  try {
    const period = await prisma.surveyPeriod.findUnique({
      where: { id },
      select: {
        id: true, name: true, targetAudience: true, status: true,
        startDate: true, endDate: true
      }
    })
    
    if (!period) return notFound()

    const classes = await prisma.class.findMany({
      include: { campus: true },
      orderBy: { className: "asc" }
    })

    // Simplest serialization
    const serializedPeriod = {
      ...period,
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString()
    }
    const serializedClasses = classes.map(c => ({
      id: c.id,
      className: c.className,
      campusId: c.campusId,
      campus: c.campus ? { id: c.campus.id, campusName: c.campus.campusName } : null
    }))

    return <PublishSurveyClient initialSurvey={serializedPeriod} classes={serializedClasses} />
  } catch (error: any) {
    console.error("Publish page crash:", error)
    return (
      <div className="p-20 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Lỗi tải dữ liệu</h1>
        <p className="text-slate-500">{error.message}</p>
        <a href="/admin/surveys" className="mt-8 inline-block px-6 py-2 bg-slate-900 text-white rounded-xl">Quay lại</a>
      </div>
    )
  }
}
