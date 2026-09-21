// @ts-nocheck
import { prisma } from "@/lib/db"
import { ScatterPlotClient } from "./client"

export const metadata = {
  title: "Phân tích Phân tán (Scatter Plot) - Khảo thí & ĐBCL Sky-Line",
}

export default async function ScatterPlotPage() {
  const [academicYears, campuses, subjects] = await Promise.all([
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" } }),
    prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: "asc" },
      select: { id: true, campusCode: true, campusName: true }
    }),
    prisma.subject.findMany({
      where: { status: "ACTIVE" },
      orderBy: { subjectName: "asc" },
      select: { id: true, subjectCode: true, subjectName: true }
    })
  ])

  const activeYear = academicYears.find(y => y.status === "ACTIVE") || academicYears[0]

  const classes = await prisma.class.findMany({
    where: { status: "ACTIVE", ...(activeYear ? { academicYearId: activeYear.id } : {}) },
    include: {
      campus: { select: { id: true, campusCode: true, campusName: true } }
    },
    orderBy: { className: "asc" }
  })

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <ScatterPlotClient
        academicYears={JSON.parse(JSON.stringify(academicYears))}
        activeYearId={activeYear?.id || ""}
        campuses={JSON.parse(JSON.stringify(campuses))}
        subjects={JSON.parse(JSON.stringify(subjects))}
        classes={JSON.parse(JSON.stringify(classes))}
      />
    </div>
  )
}
