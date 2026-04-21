import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import PublishSurveyClient from "./client"

export default async function PublishSurveyPage({ params }: any) {
  const { id } = await params
  
  const period = await prisma.surveyPeriod.findUnique({
    where: { id }
  })
  if (!period) return notFound()

  // Find all classes
  const classes = await prisma.class.findMany({
    include: {
      campus: true,
      _count: {
        select: { students: true }
      }
    },
    orderBy: [{ campus: { campusName: "asc" } }, { className: "asc" }]
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <PublishSurveyClient initialSurvey={period} classes={classes} />
    </div>
  )
}
