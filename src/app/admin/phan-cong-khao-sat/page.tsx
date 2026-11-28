import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { PhanCongKhaoSatClient } from "./client"
import { EntranceWorkflowStepper } from "@/components/entrance/EntranceWorkflowStepper"

export const metadata = { title: "Phân công khảo sát | Admin" }
export const dynamic = "force-dynamic";

export default async function PhanCongKhaoSatPage() {
  let session: any = null;
  try { session = await auth(); } catch (e) {}

  const pAny = prisma as any;

  let academicYears: any[] = [];
  let k12Periods: any[] = [];
  let preschoolPeriods: any[] = [];
  let teachers: any[] = [];
  let departments: any[] = [];
  let subjects: any[] = [];
  let eduSystems: any[] = [];
  let k12Grades: string[] = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  let preschoolGrades: string[] = ["Nhà trẻ 12-18 tháng", "Nhà trẻ 18-24 tháng", "Nhà trẻ 24-36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"];
  let campuses: any[] = [];
  let giaoVuCSUsers: any[] = [];

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

    if (pAny.user) {
      giaoVuCSUsers = await pAny.user.findMany({
        where: { role: { in: ["GĐ_CS", "GIAO_VU", "GDCS", "GIAO_VU_CS"] } },
        select: { id: true, fullName: true, email: true },
        orderBy: { fullName: "asc" }
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

    if (pAny.assessmentSubject) {
      subjects = await pAny.assessmentSubject.findMany({
        where: { status: "ACTIVE" },
        orderBy: { sortOrder: "asc" }
      }).catch(() => []);
    }

    if (pAny.educationSystem) {
      eduSystems = await pAny.educationSystem.findMany({
        orderBy: { createdAt: "asc" }
      }).catch(() => []);
    }

    const activeYear = await getDefaultAcademicYear(pAny);
    if (activeYear) {
      if (pAny.inputAssessmentPeriod) {
        k12Periods = await pAny.inputAssessmentPeriod.findMany({
          where: { academicYearId: activeYear.id },
          include: { batches: { select: { id: true, name: true, status: true, campusId: true } } },
          orderBy: { name: "asc" }
        }).catch(() => []);
      }

      if (pAny.preschoolInputAssessmentPeriod) {
        preschoolPeriods = await pAny.preschoolInputAssessmentPeriod.findMany({
          where: { academicYearId: activeYear.id },
          include: { batches: { select: { id: true, name: true, status: true, startDate: true, campusId: true } } },
          orderBy: { name: "asc" }
        }).catch(() => []);
      }

      if (pAny.class) {
        const uniqueGrades = await pAny.class.findMany({
          where: { academicYearId: activeYear.id },
          select: { grade: true },
          distinct: ["grade"],
          orderBy: { grade: "asc" }
        }).catch(() => []);
        const dbGrades = uniqueGrades
          .map((g: any) => g.grade)
          .filter(Boolean)
          .filter((g: string) => /^(?:[1-9]|1[0-2])$/.test(String(g).trim()));
        if (dbGrades.length > 0) {
          k12Grades = dbGrades.sort((a: any, b: any) => {
            const na = parseInt(a), nb = parseInt(b);
            if (isNaN(na) || isNaN(nb)) return String(a).localeCompare(String(b));
            return na - nb;
          });
        }
      }
    }
  } catch (error) {
    console.error("PhanCongKhaoSatPage fetch error:", error);
  }

  const safeJson = (data: any) => {
    try { if (!data) return []; return JSON.parse(JSON.stringify(data)); } catch { return []; }
  };

  let rolePermissions: any[] = [];
  if (!session?.user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  try {
    const roleCode = (session?.user as any)?.role || "";
    const { getRolePermissions } = await import("@/lib/permissions");
    rolePermissions = roleCode ? await getRolePermissions(roleCode) : [];
  } catch {}

  // Resolve full campus scope & primary campus from the logged-in Teacher/User account
  const sessionCampusIds: string[] = Array.isArray((session?.user as any)?.campusIds)
    ? (session.user as any).campusIds
    : [];
  let mergedCampusIds = [...sessionCampusIds];
  let primaryCampus: { id: string; campusCode: string; campusName: string } | null = null;
  let resolvedUserName = session?.user?.name || "";
  let resolvedUserEmail = session?.user?.email || "";

  try {
    const userId = (session?.user as any)?.id;
    if (userId && pAny.user) {
      const dbUser = await pAny.user.findUnique({
        where: { id: userId },
        select: {
          fullName: true,
          email: true,
          teacher: {
            select: {
              teacherName: true,
              email: true,
              campusId: true,
              campus: { select: { id: true, campusCode: true, campusName: true } },
            },
          },
          campusAssignments: {
            select: {
              campusId: true,
              campus: { select: { id: true, campusCode: true, campusName: true } },
            },
          },
          managedCampuses: {
            select: { id: true, campusCode: true, campusName: true },
          },
        },
      }).catch(() => null);

      if (dbUser) {
        resolvedUserName = dbUser.teacher?.teacherName || dbUser.fullName || resolvedUserName;
        resolvedUserEmail = dbUser.teacher?.email || dbUser.email || resolvedUserEmail;
        const extraIds = [
          dbUser.teacher?.campusId,
          ...(dbUser.managedCampuses || []).map((c: any) => c.id),
          ...(dbUser.campusAssignments || []).map((ca: any) => ca.campusId),
        ].filter(Boolean);
        mergedCampusIds = Array.from(new Set([...mergedCampusIds, ...extraIds]));
        primaryCampus =
          dbUser.teacher?.campus ||
          dbUser.managedCampuses?.[0] ||
          dbUser.campusAssignments?.[0]?.campus ||
          campuses.find((c: any) => mergedCampusIds.includes(c.id)) ||
          null;
      }
    }
  } catch {}

  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-4">
      <EntranceWorkflowStepper activeStep="assign" />
      <PhanCongKhaoSatClient
        academicYears={safeJson(academicYears)}
        k12Periods={safeJson(k12Periods)}
        preschoolPeriods={safeJson(preschoolPeriods)}
        giaoVuCSUsers={safeJson(giaoVuCSUsers)}
        teachers={safeJson(teachers)}
        departments={safeJson(departments)}
        subjects={safeJson(subjects)}
        eduSystems={safeJson(eduSystems)}
        k12Grades={safeJson(k12Grades)}
        preschoolGrades={safeJson(preschoolGrades)}
        campuses={safeJson(campuses)}
        currentUser={session?.user ? {
          id: (session.user as any).id,
          role: (session.user as any).role,
          campusIds: mergedCampusIds,
          fullName: resolvedUserName,
          email: resolvedUserEmail,
          primaryCampus: primaryCampus ? {
            id: primaryCampus.id,
            campusCode: primaryCampus.campusCode,
            campusName: primaryCampus.campusName,
          } : null,
        } : null}
        rolePermissions={safeJson(rolePermissions)}
      />
    </div>
  );
}
