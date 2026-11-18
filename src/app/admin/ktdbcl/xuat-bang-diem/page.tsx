import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { resolveAccountGradebookScope } from "@/lib/gradebook/subjectPermissions"
import { XuatBangDiemAdminClient } from "./client"

export const metadata = {
  title: "Xuất bảng điểm - Sổ điểm - Nhận xét | Sky-Line",
}

export default async function XuatBangDiemAdminPage() {
  const [session, academicYears, campuses, teachers] = await Promise.all([
    auth().catch(() => null),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" } }),
    prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: "asc" },
      select: { id: true, campusCode: true, campusName: true },
    }),
    prisma.teacher
      .findMany({
        select: { id: true, teacherName: true, teacherCode: true },
      })
      .catch(() => []),
  ])

  const activeYear = academicYears.find((y) => y.status === "ACTIVE") || academicYears[0]

  const scope = await resolveAccountGradebookScope(
    (session?.user as any)?.id,
    (session?.user as any)?.role,
    activeYear?.id
  )

  const classes = await prisma.class.findMany({
    where: { status: "ACTIVE" },
    include: {
      campus: { select: { id: true, campusCode: true, campusName: true } },
      _count: { select: { students: true } },
    },
    orderBy: { className: "asc" },
  })

  const teacherById = new Map(teachers.map((t) => [t.id, t.teacherName]))
  const enrichedClasses = classes.map((cls: any) => ({
    id: cls.id,
    className: cls.className,
    grade: cls.grade || "",
    academicYearId: cls.academicYearId || "",
    campusId: cls.campusId || "",
    campus: cls.campus || null,
    homeroomTeacherId: cls.homeroomTeacherId || null,
    homeroomTeacherName: cls.homeroomTeacherId
      ? teacherById.get(cls.homeroomTeacherId) || "Chưa phân công GVCN"
      : "Chưa phân công GVCN",
    studentCount: cls._count?.students || 0,
  }))

  return (
    <XuatBangDiemAdminClient
      academicYears={JSON.parse(JSON.stringify(academicYears))}
      activeYearId={activeYear?.id || ""}
      campuses={JSON.parse(JSON.stringify(campuses))}
      classes={JSON.parse(JSON.stringify(enrichedClasses))}
      isSubjectScoped={scope.isSubjectScoped}
    />
  )
}
