// @ts-nocheck
import { prisma } from "@/lib/db"
import { PhanTichThkqClient } from "./client"

export const metadata = {
  title: "Phân tích THKQ - Khảo thí & Đảm bảo Chất lượng Sky-Line",
  description: "Hệ thống phân tích tổng hợp kết quả khảo thí, đối chuẩn chất lượng và quản lý học sinh trọng điểm Sky-Line"
}

export default async function PhanTichThkqPage() {
  const [academicYears, campuses, subjects, gradeConfigs] = await Promise.all([
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, status: true }
    }),
    prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: "asc" },
      select: { id: true, campusCode: true, campusName: true }
    }),
    prisma.subject.findMany({
      where: { status: "ACTIVE" },
      orderBy: { subjectName: "asc" },
      select: { id: true, subjectCode: true, subjectName: true }
    }),
    prisma.subjectGradeConfig.findMany({
      where: { subjectId: { not: null } },
      select: {
        id: true,
        academicYearId: true,
        evaluationPeriod: true,
        grade: true,
        subjectId: true,
        subject: { select: { id: true, subjectCode: true, subjectName: true } }
      }
    })
  ])

  const activeYear = academicYears.find(y => y.status === "ACTIVE") || academicYears[0]

  const classes = await prisma.class.findMany({
    where: {
      status: "ACTIVE",
      ...(activeYear ? { academicYearId: activeYear.id } : {})
    },
    include: {
      campus: { select: { id: true, campusCode: true, campusName: true } }
    },
    orderBy: { className: "asc" }
  })

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <PhanTichThkqClient
        academicYears={JSON.parse(JSON.stringify(academicYears))}
        activeYearId={activeYear?.id || ""}
        campuses={JSON.parse(JSON.stringify(campuses))}
        subjects={JSON.parse(JSON.stringify(subjects))}
        gradeConfigs={JSON.parse(JSON.stringify(gradeConfigs))}
        classes={JSON.parse(JSON.stringify(classes))}
      />
    </div>
  )
}
