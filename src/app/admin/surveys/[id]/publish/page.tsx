import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import PublishSurveyClient from "./client"

export const dynamic = "force-dynamic"

export default async function PublishSurveyPage({ params }: any) {
  const { id } = await params
  if (!id) return notFound()

  return (
    <Suspense fallback={<div className="p-20 text-center font-bold text-slate-400">Đang khởi tạo hệ thống phát hành...</div>}>
      <PublishSurveyPageContent id={id} />
    </Suspense>
  )
}

async function PublishSurveyPageContent({ id }: { id: string }) {
  try {
    const period = await prisma.surveyPeriod.findUnique({
      where: { id },
      include: {
        academicYear: { select: { name: true, id: true } },
        campus: { select: { campusName: true } }
      }
    })
    
    if (!period) return notFound()

    // Filter classes by the survey period's academic year
    const classes = await prisma.class.findMany({
      where: { academicYearId: period.academicYearId },
      include: { 
        campus: true,
        _count: {
          select: {
            surveyForms: {
              where: { surveyPeriodId: id }
            }
          }
        }
      },
      orderBy: { className: "asc" }
    })

    // Fetch education systems (Hệ học) for this academic year for tab filters
    const academicYear = await (prisma as any).academicYear.findUnique({
      where: { id: period.academicYearId },
      include: { educationSystems: { orderBy: { createdAt: "asc" } } }
    })
    const eduSystems = academicYear?.educationSystems || []

    const serializedPeriod = JSON.parse(JSON.stringify(period))
    const serializedClasses = JSON.parse(JSON.stringify(classes))
    const serializedEduSystems = JSON.parse(JSON.stringify(eduSystems))

    return <PublishSurveyClient initialSurvey={serializedPeriod} classes={serializedClasses} eduSystems={serializedEduSystems} />
  } catch (err: any) {
    return (
      <div className="p-20 text-center">
        <div className="bg-red-50 text-red-600 p-10 rounded-3xl border border-red-100 inline-block">
           <h2 className="text-xl font-bold mb-2">Lỗi tải dữ liệu</h2>
           <p className="text-sm opacity-70">Vui lòng kiểm tra lại kết nối cơ sở dữ liệu.</p>
           <p className="text-[10px] mt-4 opacity-30">{err.message}</p>
        </div>
      </div>
    )
  }
}
