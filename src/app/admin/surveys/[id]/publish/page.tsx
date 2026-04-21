import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import PublishSurveyClient from "./client"

export default async function PublishSurveyPage({ params }: any) {
  const { id } = await params
  
  // Defensive query - no campus include to avoid migration issues
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

  return (
    <div className="animate-in fade-in duration-500">
      <PublishSurveyClient initialSurvey={period} classes={classes} />
    </div>
  )
}
