import { prisma } from "@/lib/db"
import { DiemNhanXetAdminClient } from "./client"

export const metadata = {
  title: "QL Điểm / Nhận xét - Khảo thí & ĐBCL",
}

export default async function DiemNhanXetAdminPage() {
  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })
  const activeYear = academicYears.find(y => y.status === "ACTIVE") || academicYears[0]

  const classes = await prisma.class.findMany({
    where: { status: "ACTIVE" },
    orderBy: { className: "asc" }
  })

  const subjects = await prisma.subject.findMany({
    where: { status: "ACTIVE" },
    orderBy: { subjectName: "asc" }
  })

  return (
    <DiemNhanXetAdminClient
      academicYears={JSON.parse(JSON.stringify(academicYears))}
      activeYearId={activeYear?.id || ""}
      classes={JSON.parse(JSON.stringify(classes))}
      subjects={JSON.parse(JSON.stringify(subjects))}
    />
  )
}
