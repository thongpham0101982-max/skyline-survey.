import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { PhanCongKhaoSatClient } from "./client"

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
  let preschoolGrades: string[] = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"];
  let campuses: any[] = [];

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
          include: { batches: { select: { id: true, name: true, campusId: true } } },
          orderBy: { name: "asc" }
        }).catch(() => []);
      }

      if (pAny.preschoolInputAssessmentPeriod) {
        preschoolPeriods = await pAny.preschoolInputAssessmentPeriod.findMany({
          where: { academicYearId: activeYear.id },
          include: { batches: { select: { id: true, name: true, startDate: true, campusId: true } } },
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
        const dbGrades = uniqueGrades.map((g: any) => g.grade).filter(Boolean);
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
  try {
    const roleCode = (session?.user as any)?.role || "ADMIN";
    rolePermissions = await prisma.permission.findMany({ where: { roleCode } });
  } catch {}

  return (
    <div className="p-3 sm:p-4 lg:p-5">
      <PhanCongKhaoSatClient
        academicYears={safeJson(academicYears)}
        k12Periods={safeJson(k12Periods)}
        preschoolPeriods={safeJson(preschoolPeriods)}
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
          campusIds: (session.user as any).campusIds || [],
          fullName: session.user.name || ""
        } : null}
        rolePermissions={safeJson(rolePermissions)}
      />
    </div>
  );
}
