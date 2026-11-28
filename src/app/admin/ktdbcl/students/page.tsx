import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { StudentsClient } from "./client"
import { ExamTabs } from "@/components/ExamTabs"
import { getAdminSession } from "@/lib/session"

export const metadata = {
  title: "Đăng ký dự thi | Admin Portal",
  description: "Quản lý danh sách học sinh đăng ký dự thi theo năm học",
}

export default async function StudentsPage() {
  await getAdminSession()
  const cookieStore = await cookies()
  const selectedYearCookie = cookieStore.get("selectedAcademicYear")?.value

  const [exams, campuses, classes, academicYears] = await Promise.all([
    prisma.exam.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        name: true,
        grade: true,
        academicYearId: true,
        academicYear: { select: { id: true, name: true } },
        _count: {
          select: { students: true, achievements: true },
        },
      },
    }),
    prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: "asc" },
      select: {
        id: true,
        campusName: true,
      },
    }),
    prisma.class.findMany({
      where: { status: "ACTIVE" },
      orderBy: { className: "asc" },
      select: {
        id: true,
        className: true,
        grade: true,
        campusId: true,
        academicYearId: true,
        campus: {
          select: { campusCode: true },
        },
        _count: {
          select: { students: true },
        },
      },
    }),
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
    }),
  ])

  const activeYear = academicYears.find((y) => y.status === "ACTIVE")
  const initialYearId =
    selectedYearCookie && academicYears.some((y) => y.id === selectedYearCookie)
      ? selectedYearCookie
      : activeYear?.id || academicYears[0]?.id || ""

  const pendingRequestsCount = await prisma.studentAchievementRequest.count({
    where: {
      status: "PENDING",
      ...(initialYearId ? { academicYearId: initialYearId } : {}),
    },
  })

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <ExamTabs
        activeTab="students"
        pendingRequestsCount={pendingRequestsCount}
        academicYears={academicYears}
        initialYearId={initialYearId}
      />

      <StudentsClient
        exams={exams}
        campuses={campuses}
        classes={classes}
        academicYears={academicYears}
        initialYearId={initialYearId}
      />
    </div>
  )
}
