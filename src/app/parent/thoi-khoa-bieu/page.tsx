import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { getParentProfileWithStudents } from "@/lib/parentData"
import { getEffectiveClassWeekSchedule } from "@/lib/timetable/effectiveScheduleService"
import { formatCampusDisplayName } from "@/lib/timetable/scopeResolver"
import { PublishedClassScheduleView } from "@/components/timetable/PublishedClassScheduleView"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ParentTimetablePage(props: {
  searchParams: Promise<{ studentId?: string; weekDate?: string }>
}) {
  const session = await auth()
  const userId = (session?.user as any)?.id
  if (!userId) {
    redirect("/login")
  }

  const sp = await props.searchParams
  const weekDate = (sp.weekDate || new Date().toISOString()).slice(0, 10)

  const [parent, defaultYear] = await Promise.all([
    getParentProfileWithStudents(userId),
    getDefaultAcademicYear(prisma).catch(() => null),
  ])

  const rawChildren = (parent?.students || [])
    .map((s: any) => s.student)
    .filter((child: any) => Boolean(child && child.classId))

  const activeYearChildren = rawChildren.filter(
    (child: any) =>
      !defaultYear ||
      child.academicYearId === defaultYear.id ||
      child.class?.academicYearId === defaultYear.id
  )
  const allowedChildren = activeYearChildren.length > 0 ? activeYearChildren : rawChildren

  if (allowedChildren.length === 0) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-[#E2E8F0] text-center text-xs text-slate-600">
        Tài khoản phụ huynh hiện chưa liên kết với học sinh đang xếp lớp trong năm học này.
      </div>
    )
  }

  // Strictly enforce that requested studentId belongs to this parent's linked children
  const activeChild =
    allowedChildren.find((c: any) => c.id === sp.studentId) || allowedChildren[0]

  const schedule = await getEffectiveClassWeekSchedule({
    classId: activeChild.classId,
    referenceDateIso: weekDate,
    strictPublishedOnly: true,
  })

  return (
    <PublishedClassScheduleView
      portalTitle="Thời khóa biểu của con"
      portalSubtitle="Hiển thị lịch học chính thức Đã ban hành và các cập nhật dạy thay / đổi phòng thực tế trong tuần"
      studentName={activeChild.studentName}
      studentCode={activeChild.studentCode}
      className={activeChild.class?.className || ""}
      campusName={formatCampusDisplayName(activeChild.class?.campus)}
      weekDate={weekDate}
      selectedStudentId={activeChild.id}
      childrenOptions={allowedChildren.map((ch: any) => ({
        studentId: ch.id,
        studentCode: ch.studentCode,
        studentName: ch.studentName,
        className: ch.class?.className || "",
        campusName: formatCampusDisplayName(ch.class?.campus),
      }))}
      schedule={schedule}
    />
  )
}
