import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { TextbookLibraryClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Thư viện Sách giáo khoa số | SSM Sky-Line",
  description: "Kho Sách giáo khoa số chuẩn dùng chung trên hệ thống SSM Sky-Line"
};

export default async function TextbooksPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = ((session.user as any).role || "").toUpperCase();
  const isAdmin = ["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "BAN_DHCM", "KT_DBCL"].includes(role);

  // Lấy dữ liệu danh mục ban đầu cho filters
  const [subjects, seriesList, publishers, academicYears] = await Promise.all([
    prisma.subject.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, subjectCode: true, subjectName: true },
      orderBy: { subjectName: "asc" }
    }),
    prisma.textbookSeries.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, code: true, publisherId: true },
      orderBy: { name: "asc" }
    }),
    prisma.textbookPublisher.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" }
    }),
    prisma.academicYear.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { startDate: "desc" }
    })
  ]);

  return (
    <TextbookLibraryClient
      user={session.user}
      isAdmin={isAdmin}
      initialSubjects={subjects}
      initialSeries={seriesList}
      initialPublishers={publishers}
      initialAcademicYears={academicYears}
    />
  );
}
