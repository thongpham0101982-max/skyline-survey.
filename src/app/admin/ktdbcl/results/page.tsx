import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { ResultsClient } from "./client"
import { ExamTabs } from "@/components/ExamTabs"
import { getAdminSession } from "@/lib/session"

export const metadata = {
  title: "Nhập kết quả & Thành tích | Admin Portal",
  description: "Ghi nhận nhanh kết quả dự thi theo năm học, xét duyệt bổ sung và thống kê thành tích",
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  await getAdminSession()
  const params = await searchParams
  const cookieStore = await cookies()
  const selectedYearCookie = cookieStore.get("selectedAcademicYear")?.value

  const initialTab =
    params?.tab === "reports" || params?.tab === "profiles" || params?.tab === "requests"
      ? params.tab
      : "input"

  const activeNavTab =
    params?.tab === "reports"
      ? "reports"
      : params?.tab === "profiles"
      ? "profiles"
      : params?.tab === "requests"
      ? "requests"
      : "results"

  const [
    exams,
    academicYears,
    teachers,
    campuses,
    classes,
    achievementCategories,
    achievementLevels,
    examCategories,
    examRounds,
  ] = await Promise.all([
    prisma.exam.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        code: true,
        grade: true,
        academicYearId: true,
        academicYear: { select: { id: true, name: true } },
        startDate: true,
        endDate: true,
        category: { select: { id: true, name: true } },
        round: { select: { id: true, name: true } },
        _count: { select: { students: true, achievements: true } },
      },
    }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" } }),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      orderBy: { teacherName: "asc" },
      select: { id: true, teacherCode: true, teacherName: true },
    }),
    prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: "asc" },
      select: { id: true, campusName: true },
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
      },
    }),
    prisma.achievementCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.achievementLevel.findMany({ orderBy: { name: "asc" } }),
    prisma.examCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, academicYearId: true },
    }),
    prisma.examRound.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, academicYearId: true },
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
        activeTab={activeNavTab as any}
        pendingRequestsCount={pendingRequestsCount}
        academicYears={academicYears}
        initialYearId={initialYearId}
      />

      <ResultsClient
        exams={exams}
        academicYears={academicYears}
        teachers={teachers}
        campuses={campuses}
        classes={classes}
        achievementCategories={achievementCategories}
        achievementLevels={achievementLevels}
        examCategories={examCategories}
        examRounds={examRounds}
        initialTab={initialTab as "input" | "reports" | "profiles" | "requests"}
        initialYearId={initialYearId}
      />
    </div>
  )
}
