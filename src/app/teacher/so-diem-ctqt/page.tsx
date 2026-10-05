import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SoDiemCtqtTeacherClient } from "./client";
import { Suspense } from "react";
import { isCtqtClass } from "@/lib/ctqt/config";

export const metadata = {
  title: "Sổ điểm CTQT & Rà soát Song ngữ | Giáo viên",
  description: "Nhập điểm bộ môn CTQT, rà soát nhận xét tiếng Anh và xem sổ điểm tổng hợp",
};

export default async function TeacherSoDiemCtqtPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const userEmail = session?.user?.email || "";
  const userRole = ((session?.user as any)?.role || "").toUpperCase();
  const isSuperAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  let teacher = null;
  if (userId) {
    teacher = await prisma.teacher.findUnique({ where: { userId } });
  }
  if (!teacher && userEmail) {
    teacher = await prisma.teacher.findFirst({
      where: {
        OR: [{ email: userEmail }, { teacherCode: userEmail.split("@")[0] }],
      },
    });
  }

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
  });
  const activeYear = academicYears.find(y => y.status === "ACTIVE") || academicYears[0];

  // Fetch all CTQT classes for this academic year
  const rawClasses = await prisma.class.findMany({
    where: {
      status: "ACTIVE",
      ...(activeYear ? { academicYearId: activeYear.id } : {}),
    },
    include: {
      campus: { select: { id: true, campusName: true } },
    },
    orderBy: { className: "asc" },
  });

  const ctqtClasses = rawClasses.filter(c => isCtqtClass(c.className, c.educationSystem || undefined));

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-semibold">Đang tải Sổ điểm CTQT...</div>}>
      <SoDiemCtqtTeacherClient
        teacher={teacher ? JSON.parse(JSON.stringify(teacher)) : null}
        academicYears={JSON.parse(JSON.stringify(academicYears))}
        activeYearId={activeYear?.id || ""}
        ctqtClasses={JSON.parse(JSON.stringify(ctqtClasses))}
        isSuperAdmin={isSuperAdmin}
      />
    </Suspense>
  );
}
