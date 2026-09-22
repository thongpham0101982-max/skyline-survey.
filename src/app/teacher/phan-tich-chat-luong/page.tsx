import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { SubjectAnalyticsClient } from "./client"

export const metadata = {
  title: "Phân tích chất lượng môn học - Giáo viên Bộ môn | SQMS",
  description: "Theo dõi tổng hợp phân tích chất lượng các môn học, đối sánh khối/cơ sở và tổ chuyên môn dành cho GVBM"
}

export default async function SubjectAnalyticsPage() {
  const session = await auth()
  const userId = (session?.user as any)?.id || ""

  const [teacher, academicYears] = await Promise.all([
    userId ? prisma.teacher.findUnique({
      where: { userId },
      include: {
        departmentRel: true,
        campus: true
      }
    }).catch(() => null) : Promise.resolve(null),
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" }
    })
  ])

  const cookieStore = await cookies()
  const selectedYearCookie = cookieStore.get("selectedAcademicYear")?.value
  const activeYear = academicYears.find(y => y.id === selectedYearCookie) 
    || academicYears.find(y => y.status === "ACTIVE") 
    || academicYears[0]

  return (
    <SubjectAnalyticsClient
      academicYears={JSON.parse(JSON.stringify(academicYears))}
      activeYearId={activeYear?.id || ""}
      teacherProfile={teacher ? JSON.parse(JSON.stringify(teacher)) : null}
      userRole={(session?.user as any)?.role || "TEACHER"}
    />
  )
}
