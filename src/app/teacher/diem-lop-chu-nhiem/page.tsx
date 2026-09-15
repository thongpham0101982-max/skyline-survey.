// @ts-nocheck
export const dynamic = "force-dynamic"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { HomeroomGradesClient } from "./client"

export const metadata = {
  title: "Xem Điểm Lớp Chủ Nhiệm & Đối Sánh Khối | Sky-Line",
  description: "Bảng điểm tổng hợp các môn của lớp chủ nhiệm và phân tích đối sánh mặt bằng khối"
}

export default async function HomeroomGradesPage() {
  let session = null
  try {
    session = await auth()
  } catch (err) {
    console.error("Auth error in HomeroomGradesPage:", err)
  }

  if (!session) {
    redirect("/login")
  }

  const userId = (session?.user as any)?.id || ""
  const userEmail = session?.user?.email || ""
  const userRole = (session?.user as any)?.role || "TEACHER"

  let teacher = null
  if (userId) {
    teacher = await prisma.teacher.findUnique({ where: { userId } }).catch(() => null)
  }
  if (!teacher && userEmail) {
    teacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { email: userEmail },
          { teacherCode: userEmail },
          { teacherCode: userEmail.split("@")[0] }
        ]
      }
    }).catch(() => null)
  }

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })
  const activeYear = academicYears.find(y => y.status === "ACTIVE") || academicYears[0]

  const cookieStore = await cookies()
  const activeYearCookie = cookieStore.get("selectedAcademicYear")?.value
  const targetYearId = activeYearCookie || activeYear?.id || ""

  let homeroomClasses: any[] = []
  if (teacher) {
    homeroomClasses = await prisma.class.findMany({
      where: {
        academicYearId: targetYearId,
        OR: [
          { homeroomTeacherId: teacher.id },
          { homeroomTeacherId: { contains: teacher.id } }
        ]
      },
      include: {
        campus: true,
        academicYear: true,
        _count: { select: { students: true } }
      },
      orderBy: { className: "asc" }
    }).catch(() => [])

    // Failsafe: if no classes in target year, check all years
    if (homeroomClasses.length === 0) {
      homeroomClasses = await prisma.class.findMany({
        where: {
          OR: [
            { homeroomTeacherId: teacher.id },
            { homeroomTeacherId: { contains: teacher.id } }
          ]
        },
        include: {
          campus: true,
          academicYear: true,
          _count: { select: { students: true } }
        },
        orderBy: { className: "asc" }
      }).catch(() => [])
    }
  } else if (["SUPERADMIN", "ADMIN", "BGH", "KTDBCL"].includes(userRole.toUpperCase())) {
    // Admin preview: load all classes with homeroom teachers
    homeroomClasses = await prisma.class.findMany({
      where: {
        academicYearId: targetYearId,
        homeroomTeacherId: { not: null }
      },
      include: {
        campus: true,
        academicYear: true,
        _count: { select: { students: true } }
      },
      orderBy: { className: "asc" },
      take: 20
    }).catch(() => [])
  }

  return (
    <HomeroomGradesClient
      academicYears={JSON.parse(JSON.stringify(academicYears))}
      activeYearId={targetYearId}
      homeroomClasses={JSON.parse(JSON.stringify(homeroomClasses))}
      teacherName={teacher?.teacherName || session?.user?.name || "Giáo viên"}
    />
  )
}
