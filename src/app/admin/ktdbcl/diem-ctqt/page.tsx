import { prisma } from "@/lib/db";
import { DiemCtqtAdminClient } from "./client";
import { isCtqtClass, compareCtqtClasses } from "@/lib/ctqt/config";

export const metadata = {
  title: "Quản lý Điểm CTQT & Report Card | Sky-Line",
  description: "Cấu hình sổ điểm, phân công GVBM, gán GVTA ủy quyền, sổ điểm tổng hợp và xuất Report Card",
};

export default async function DiemCtqtAdminPage() {
  const [academicYears, campuses, departments, teachers, rawClasses] = await Promise.all([
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" } }),
    prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: "asc" },
      select: { id: true, campusCode: true, campusName: true },
    }),
    prisma.department.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        divisionCode: true,
        blockCM: true,
      },
    }),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      orderBy: { teacherName: "asc" },
      select: {
        id: true,
        teacherName: true,
        teacherCode: true,
        email: true,
        campusId: true,
        departmentId: true,
        position: true,
        user: { select: { email: true } },
        campus: { select: { id: true, campusCode: true, campusName: true } },
        departmentRel: { select: { id: true, code: true, name: true, divisionCode: true } },
        departmentAssignments: {
          select: {
            departmentId: true,
            position: true,
            isPrimary: true,
            department: { select: { id: true, code: true, name: true, divisionCode: true } },
          },
        },
        divisionAssignments: {
          select: {
            divisionCode: true,
            roleInDivision: true,
          },
        },
      },
    }),
    prisma.class.findMany({
      where: { status: "ACTIVE" },
      include: {
        campus: { select: { id: true, campusCode: true, campusName: true } },
      },
      orderBy: { className: "asc" },
    }),
  ]);

  const activeYear = academicYears.find(y => y.status === "ACTIVE") || academicYears[0];

  // Filter CTQT classes and sort naturally by grade (Khối 1 -> 12)
  const ctqtClasses = rawClasses
    .filter(c => isCtqtClass(c.className, c.educationSystem || undefined, c.level, c.grade))
    .sort(compareCtqtClasses);

  return (
    <DiemCtqtAdminClient
      academicYears={JSON.parse(JSON.stringify(academicYears))}
      activeYearId={activeYear?.id || ""}
      campuses={JSON.parse(JSON.stringify(campuses))}
      departments={JSON.parse(JSON.stringify(departments))}
      teachers={JSON.parse(JSON.stringify(teachers))}
      initialClasses={JSON.parse(JSON.stringify(ctqtClasses))}
    />
  );
}
