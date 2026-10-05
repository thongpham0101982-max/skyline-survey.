import { prisma } from "@/lib/db";
import { DiemCtqtAdminClient } from "./client";
import { isCtqtClass } from "@/lib/ctqt/config";

export const metadata = {
  title: "Quản lý Điểm CTQT & Report Card | Sky-Line",
  description: "Cấu hình sổ điểm, phân công GVBM, gán GVTA ủy quyền, sổ điểm tổng hợp và xuất Report Card",
};

export default async function DiemCtqtAdminPage() {
  const [academicYears, campuses, teachers, rawClasses] = await Promise.all([
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" } }),
    prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: "asc" },
      select: { id: true, campusCode: true, campusName: true },
    }),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      orderBy: { teacherName: "asc" },
      select: { id: true, teacherName: true, teacherCode: true, campusId: true, departmentId: true },
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

  // Filter CTQT classes
  const ctqtClasses = rawClasses.filter(c => isCtqtClass(c.className, c.educationSystem || undefined));

  return (
    <DiemCtqtAdminClient
      academicYears={JSON.parse(JSON.stringify(academicYears))}
      activeYearId={activeYear?.id || ""}
      campuses={JSON.parse(JSON.stringify(campuses))}
      teachers={JSON.parse(JSON.stringify(teachers))}
      initialClasses={JSON.parse(JSON.stringify(ctqtClasses))}
    />
  );
}
