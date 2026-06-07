import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { PhanCongMamNonClient } from "./client"

export const metadata = { title: "Phân công Mầm non | Admin" }
export const dynamic = "force-dynamic";

export default async function PhanCongMamNonPage() {
  let session: any = null;
  try { session = await auth(); } catch (e) {}

  const pAny = prisma as any;

  let academicYears: any[] = [];
  let periods: any[] = [];
  let teachers: any[] = [];
  let departments: any[] = [];
  let campuses: any[] = [];

  const grades = ["18 đến 24 tháng", "24 đến 36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn", "5 đến 6 tuổi"];

  try {
    if (pAny.academicYear) {
      academicYears = await pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => []);
    }

    if (pAny.campus) {
      campuses = await pAny.campus.findMany({
        where: { status: "ACTIVE" },
        include: { manager: true },
        orderBy: { campusName: "asc" }
      }).catch(() => []);
    }

    if (pAny.teacher) {
      teachers = await pAny.teacher.findMany({
        where: { status: "ACTIVE" },
        include: { departmentRel: true, campus: true, user: true },
        orderBy: { teacherName: "asc" }
      }).catch(() => []);
    }

    if (pAny.department) {
      departments = await pAny.department.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" }
      }).catch(() => []);
    }

    const activeYear = await getDefaultAcademicYear(pAny);
    if (activeYear && pAny.preschoolInputAssessmentPeriod) {
      periods = await pAny.preschoolInputAssessmentPeriod.findMany({
        where: { academicYearId: activeYear.id },
        include: { batches: { select: { id: true, name: true, startDate: true, campusId: true } } },
        orderBy: { name: "asc" }
      }).catch(() => []);
    }
  } catch (error) {
    console.error("PhanCongMamNonPage fetch error:", error);
  }

  const safeJson = (data: any) => {
    try { if (!data) return []; return JSON.parse(JSON.stringify(data)); } catch { return []; }
  };

  let rolePermissions: any[] = [];
  try {
    const roleCode = (session?.user as any)?.role || "ADMIN";
    rolePermissions = await prisma.permission.findMany({ where: { roleCode } });
  } catch {}

  return (
    <div className="p-3 sm:p-4 lg:p-5">
      <PhanCongMamNonClient
        academicYears={safeJson(academicYears)}
        initialPeriods={safeJson(periods)}
        teachers={safeJson(teachers)}
        departments={safeJson(departments)}
        campuses={safeJson(campuses)}
        grades={grades}
        currentUser={session?.user ? {
          id: (session.user as any).id,
          role: (session.user as any).role,
          campusIds: (session.user as any).campusIds || [],
          fullName: session.user.name || ""
        } : null}
        rolePermissions={rolePermissions}
      />
    </div>
  );
}
