import { prisma } from "@/lib/db"
import { requireStudentSession } from "@/lib/student-session"
import { getEffectiveClassWeekSchedule } from "@/lib/timetable/effectiveScheduleService"
import { formatCampusDisplayName } from "@/lib/timetable/scopeResolver"
import { PublishedClassScheduleView } from "@/components/timetable/PublishedClassScheduleView"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function StudentTimetablePage(props: {
  searchParams: Promise<{ weekDate?: string }>
}) {
  const studentSession = await requireStudentSession()
  const sp = await props.searchParams
  const weekDate = (sp.weekDate || new Date().toISOString()).slice(0, 10)

  // Always resolve the student's authoritative classId from DB — never trust client query params
  const studentRecord = await prisma.student.findUnique({
    where: { id: studentSession.studentId },
    include: {
      class: {
        include: { campus: true },
      },
    },
  })

  const authoritativeClassId = studentRecord?.classId || studentSession.classId
  const className = studentRecord?.class?.className || studentSession.className
  const campusName = studentRecord?.class?.campus
    ? formatCampusDisplayName(studentRecord.class.campus)
    : studentSession.campusName

  const schedule = await getEffectiveClassWeekSchedule({
    classId: authoritativeClassId,
    referenceDateIso: weekDate,
    strictPublishedOnly: true,
  })

  return (
    <PublishedClassScheduleView
      portalTitle="Thời khóa biểu lớp học"
      portalSubtitle="Lịch học sáng/chiều chính thức Đã ban hành và thông báo điều chỉnh theo ngày của lớp"
      studentName={studentRecord?.studentName || studentSession.studentName}
      studentCode={studentRecord?.studentCode || studentSession.studentCode}
      className={className}
      campusName={campusName}
      weekDate={weekDate}
      schedule={schedule}
    />
  )
}
