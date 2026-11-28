// @ts-nocheck
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { resolveThkqAccessScope } from "@/lib/ktdbcl/thkqPermissions"
import { GiamSatTienDoClient } from "./client"

export const metadata = {
  title: "Giám sát tiến độ nhập điểm - Sổ điểm - Nhận xét | Sky-Line",
  description:
    "Thống kê học sinh thiếu điểm, thống kê tình hình nhập điểm theo lớp, môn, cơ sở, giáo viên và quản lý khóa sổ điểm Sky-Line",
}

export default async function GiamSatTienDoPage() {
  const [session, academicYears, rawCampuses, rawSubjects] = await Promise.all([
    auth().catch(() => null),
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, status: true },
    }),
    prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusCode: "asc" },
      select: { id: true, campusCode: true, campusName: true },
    }),
    prisma.subject.findMany({
      where: { status: "ACTIVE" },
      orderBy: { subjectName: "asc" },
      select: { id: true, subjectCode: true, subjectName: true, category: true, level: true },
    }),
  ])

  const activeYear = academicYears.find((y) => y.status === "ACTIVE") || academicYears[0]

  const accessScope = await resolveThkqAccessScope(
    (session?.user as any)?.id,
    (session?.user as any)?.role,
    activeYear?.id
  )

  const campuses =
    accessScope.isCampusRestricted && accessScope.allowedCampusIds.length > 0
      ? rawCampuses.filter((c: any) => accessScope.allowedCampusIds.includes(c.id))
      : rawCampuses

  const subjects =
    accessScope.isSubjectRestricted && accessScope.allowedSubjectIds.length > 0
      ? rawSubjects.filter(
          (s: any) =>
            accessScope.allowedSubjectIds.includes(s.id) ||
            accessScope.allowedSubjectCodes.includes(String(s.subjectCode || "").toUpperCase().trim())
        )
      : rawSubjects

  const classes = await prisma.class.findMany({
    where: {
      status: "ACTIVE",
      ...(activeYear ? { academicYearId: activeYear.id } : {}),
      ...(accessScope.isCampusRestricted && accessScope.allowedCampusIds.length > 0
        ? { campusId: { in: accessScope.allowedCampusIds } }
        : {}),
      ...(accessScope.isClassRestricted && accessScope.allowedClassIds.length > 0
        ? { id: { in: accessScope.allowedClassIds } }
        : {}),
    },
    include: {
      campus: { select: { id: true, campusCode: true, campusName: true } },
      teachingAssignments: {
        select: {
          id: true,
          subjectId: true,
          teacherId: true,
          teacher: { select: { id: true, teacherName: true, teacherCode: true } },
        },
      },
    },
    orderBy: { className: "asc" },
  })

  return (
    <div className="container mx-auto px-4 py-6 max-w-[1600px]">
      <GiamSatTienDoClient
        academicYears={JSON.parse(JSON.stringify(academicYears))}
        activeYearId={activeYear?.id || ""}
        campuses={JSON.parse(JSON.stringify(campuses))}
        subjects={JSON.parse(JSON.stringify(subjects))}
        classes={JSON.parse(JSON.stringify(classes))}
        isSubjectScoped={accessScope.isSubjectRestricted}
        accessScope={JSON.parse(JSON.stringify(accessScope))}
      />
    </div>
  )
}
