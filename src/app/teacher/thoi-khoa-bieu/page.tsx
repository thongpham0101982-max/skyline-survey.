import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getEffectiveTeacherWeekSchedule } from "@/lib/timetable/effectiveScheduleService"
import { formatCampusDisplayName, getDatesOfWeek } from "@/lib/timetable/scopeResolver"
import TeacherTimetableLookupClient from "./client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function TeacherTimetablePage(props: {
  searchParams: Promise<{ weekDate?: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const sp = await props.searchParams
  const weekDate = (sp.weekDate || new Date().toISOString()).slice(0, 10)

  const [teacherById, teacherByEmail, activeYear, campuses, teachers] = await Promise.all([
    prisma.teacher.findUnique({ where: { userId: session.user.id } }).catch(() => null),
    session.user.email
      ? prisma.teacher
          .findFirst({
            where: {
              OR: [
                { email: session.user.email },
                { teacherCode: session.user.email },
                { teacherCode: session.user.email.split("@")[0] },
              ],
            },
          })
          .catch(() => null)
      : Promise.resolve(null),
    prisma.academicYear.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { startDate: "desc" },
    }),
    prisma.campus.findMany({ orderBy: { campusCode: "asc" } }),
    prisma.teacher.findMany({
      include: { departmentRel: { select: { name: true } } },
      orderBy: { teacherName: "asc" },
    }),
  ])

  const currentTeacher = teacherById || teacherByEmail || null

  const [classes, mySchedule] = await Promise.all([
    activeYear
      ? prisma.class.findMany({
          where: { academicYearId: activeYear.id },
          orderBy: [{ grade: "asc" }, { className: "asc" }],
          select: {
            id: true,
            className: true,
            grade: true,
            level: true,
            campusId: true,
          },
        })
      : Promise.resolve([]),
    currentTeacher
      ? getEffectiveTeacherWeekSchedule({
          teacherId: currentTeacher.id,
          referenceDateIso: weekDate,
        })
      : Promise.resolve({
          weekDates: getDatesOfWeek(weekDate),
          items: [],
          campusesInvolved: [],
        }),
  ])

  return (
    <TeacherTimetableLookupClient
      currentTeacher={
        currentTeacher
          ? {
              id: currentTeacher.id,
              teacherCode: currentTeacher.teacherCode,
              teacherName: currentTeacher.teacherName,
            }
          : null
      }
      initialWeekDate={weekDate}
      initialMySchedule={mySchedule}
      campuses={campuses.map((c) => ({
        id: c.id,
        displayName: formatCampusDisplayName(c),
      }))}
      classes={classes}
      teachers={teachers.map((t) => ({
        id: t.id,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
        departmentName: t.departmentRel?.name || "",
      }))}
    />
  )
}
