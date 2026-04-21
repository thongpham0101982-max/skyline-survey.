import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import PublishSurveyClient from "./client"

export default async function PublishSurveyPage({ params }: any) {
  const { id } = await params
  if (!id) return notFound()

  try {
    const period = await prisma.surveyPeriod.findUnique({
      where: { id },
      include: {
        academicYear: { select: { name: true } },
        campus: { select: { campusName: true } }
      }
    })
    
    if (!period) return notFound()

    const classes = await prisma.class.findMany({
      include: { 
        campus: true
      },
      orderBy: { className: "asc" }
    })

    // Serialization for Client Components (Dates to strings)
    const serializedPeriod = JSON.parse(JSON.stringify({
      ...period,
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString()
    }))

    const serializedClasses = JSON.parse(JSON.stringify(classes))

    return <PublishSurveyClient initialSurvey={serializedPeriod} classes={serializedClasses} />
  } catch (error: any) {
    return (
      <div className="p-20 text-center bg-slate-50 min-h-screen">
        <div className="max-w-md mx-auto bg-white p-10 rounded-[2.5rem] shadow-xl border border-red-100">
           <h1 className="text-xl font-black text-red-600 mb-4">Hệ thống đang bảo trì</h1>
           <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Vui lòng quay lại sau ít phút hoặc liên hệ quản trị viên.
           </p>
           <div className="bg-red-50 p-4 rounded-2xl text-[10px] font-mono text-red-300 mb-8 break-all">
              {error.message}
           </div>
           <a href="/admin/surveys" className="block w-full py-4 bg-slate-900 text-white rounded-2xl font-bold">Xong</a>
        </div>
      </div>
    )
  }
}
