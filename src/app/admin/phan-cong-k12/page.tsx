import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { PhanCongK12Client } from "./client"

export const metadata = { title: "Phân công K-12 | Admin" }
export const dynamic = "force-dynamic";

export default async function PhanCongK12Page() {
  let session: any = null;
  try { session = await auth(); } catch (e) {}

  const user = session?.user as any;
  const pAny = prisma as any;

  let academicYears: any[] = [];
  let periods: any[] = [];
  let teachers: any[] = [];
  let departments: any[] = [];
  let subjects: any[] = [];
  let eduSystems: any[] = [];
  let grades: string[] = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  let campuses: any[] = [];

  try {
    if (pAny.academicYear) {
      academicYears = await pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => []);
    }

    if (pAny.campus) {
      campuses = await pAny.campus.findMany({
        where: { status: "ACTIVE" },
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
        periods = await pAny.inputAssessmentPeriod.findMany({
          where: { academicYearId: activeYear.id },
          include: { batches: { select: { id: true, name: true, campusId: true } } },
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
          grades = dbGrades.sort((a: any, b: any) => {
            const na = parseInt(a), nb = parseInt(b);
            if (isNaN(na) || isNaN(nb)) return String(a).localeCompare(String(b));
            return na - nb;
          });
        }
      }
    }
  } catch (error) {
    console.error("PhanCongK12Page fetch error:", error);
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
      <PhanCongK12Client
        academicYears={safeJson(academicYears)}
        initialPeriods={safeJson(periods)}
        teachers={safeJson(teachers)}
        departments={safeJson(departments)}
        subjects={safeJson(subjects)}
        eduSystems={safeJson(eduSystems)}
        grades={safeJson(grades)}
        campuses={safeJson(campuses)}
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
