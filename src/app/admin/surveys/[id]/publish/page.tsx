import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import PublishSurveyClient from "./client"

export default async function PublishSurveyPage({ params }: any) {
  const { id } = await params
  
  if (!id) return notFound()

  try {
    const period = await prisma.surveyPeriod.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        targetAudience: true,
        startDate: true,
        endDate: true,
      }
    })
    
    if (!period) return notFound()

    const classes = await prisma.class.findMany({
      select: {
        id: true,
        className: true,
        campusId: true,
        campus: { select: { id: true, campusName: true } }
      },
      orderBy: { className: "asc" }
    })

    // Manual serialization to avoid Date object issues and hidden props
    const serializedPeriod = {
      id: period.id,
      name: period.name,
      targetAudience: (period as any).targetAudience || "PHHS",
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString()
    }

    const serializedClasses = classes.map(c => ({
      id: c.id,
      className: c.className,
      campusId: c.campusId,
      campus: c.campus
    }))

    return <PublishSurveyClient initialSurvey={serializedPeriod} classes={serializedClasses} />
  } catch (error: any) {
    return (
      <div className="p-20 text-center bg-slate-50 min-h-screen">
        <div className="max-w-md mx-auto bg-white p-10 rounded-[2.5rem] shadow-xl border border-red-100">
           <h1 className="text-xl font-black text-red-600 mb-4">Lỗi hệ thống</h1>
           <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Không thể tải dữ liệu khảo sát. Điều này có thể do database đang bận hoặc cấu trúc bị thay đổi.
           </p>
           <div className="bg-red-50 p-4 rounded-2xl text-[10px] font-mono text-red-400 mb-8 break-all">
              {error.message}
           </div>
           <a href="/admin/surveys" className="block w-full py-4 bg-slate-900 text-white rounded-2xl font-bold">Quay lại</a>
        </div>
      </div>
    )
  }
}
