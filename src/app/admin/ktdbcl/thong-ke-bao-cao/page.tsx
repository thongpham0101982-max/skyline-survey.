import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { resolveAccountGradebookScope } from "@/lib/gradebook/subjectPermissions"
import { ThongKeBaoCaoClient } from "./client"

export const metadata = {
  title: "Thống kê báo cáo - Sổ điểm - Nhận xét | Sky-Line",
  description: "Báo cáo thống kê ĐTB các môn, phân tích phổ điểm, giám sát tiến độ nhập điểm và tổng hợp phản hồi PHHS"
}

export default async function ThongKeBaoCaoPage() {
  const [session, academicYears, campuses, rawSubjects] = await Promise.all([
    auth().catch(() => null),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" } }),
    prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: "asc" },
      select: { id: true, campusCode: true, campusName: true }
    }),
    prisma.subject.findMany({
      where: { status: "ACTIVE" },
      orderBy: { subjectName: "asc" }
    })
  ])
  const activeYear = academicYears.find(y => y.status === "ACTIVE") || academicYears[0]

  const scope = await resolveAccountGradebookScope(
    (session?.user as any)?.id,
    (session?.user as any)?.role,
    activeYear?.id
  )

  const subjects =
    scope.isSubjectScoped && scope.allowedSubjectIds.length > 0
      ? rawSubjects.filter(
          (s: any) =>
            scope.allowedSubjectIds.includes(s.id) ||
            scope.allowedSubjectCodes.includes(String(s.subjectCode || "").toUpperCase().trim())
        )
      : rawSubjects

  const classes = await prisma.class.findMany({
    where: { status: "ACTIVE", ...(activeYear ? { academicYearId: activeYear.id } : {}) },
    include: {
      campus: { select: { id: true, campusCode: true, campusName: true } },
      teachingAssignments: {
        select: {
          id: true,
          subjectId: true,
          teacherId: true,
          teacher: { select: { id: true, teacherName: true, teacherCode: true } }
        }
      }
    },
    orderBy: { className: "asc" }
  })

  return (
    <ThongKeBaoCaoClient
      academicYears={JSON.parse(JSON.stringify(academicYears))}
      activeYearId={activeYear?.id || ""}
      campuses={JSON.parse(JSON.stringify(campuses))}
      classes={JSON.parse(JSON.stringify(classes))}
      subjects={JSON.parse(JSON.stringify(subjects))}
      isSubjectScoped={scope.isSubjectScoped}
    />
  )
}
