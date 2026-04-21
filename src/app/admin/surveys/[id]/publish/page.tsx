import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import PublishSurveyClient from "./client"

export const dynamic = "force-dynamic"

export default async function PublishSurveyPage({ params }: any) {
  const { id } = await params
  if (!id) return notFound()

  const period = await prisma.surveyPeriod.findUnique({
    where: { id },
    include: {
      academicYear: { select: { name: true } },
      campus: { select: { campusName: true } }
    }
  })
  if (!period) return notFound()

  const classes = await prisma.class.findMany({
    include: { campus: true },
    orderBy: { className: "asc" }
  })

  // Simple serialization
  const serializedPeriod = JSON.parse(JSON.stringify(period))
  const serializedClasses = JSON.parse(JSON.stringify(classes))

  return (
    <div className="p-4">
      <PublishSurveyClient initialSurvey={serializedPeriod} classes={serializedClasses} />
    </div>
  )
}