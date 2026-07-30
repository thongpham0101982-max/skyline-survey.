import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
// unused dynamic import removed

import { ReportsClient } from "./client"

export const metadata = { title: "Xuat bao cao KSNL | Admin" }
export const dynamic = "force-dynamic"

export default async function InputAssessmentReportsPage() {
  let session: any = null;
  try { session = await auth(); } catch (e) { console.error("Auth error:", e); }
  const user = session?.user as any;
  const isGDCS = user?.role === "GDCS";
  const allowedCampusIds = Array.isArray(user?.campusIds) ? user.campusIds : [];
  let liveCampusIds = [...allowedCampusIds];
  try {
    const pAny = prisma as any;
    if (user?.id && pAny?.userCampusAssignment) {
      const dbAssignments = await pAny.userCampusAssignment.findMany({ where: { userId: user.id } });
      if (dbAssignments.length > 0) liveCampusIds = dbAssignments.map((a: any) => a.campusId);
    }
  } catch (e) { console.error("Live campusIds:", e); }

  let academicYears: any[] = [], campuses: any[] = [], giaoVuCSUsers: any[] = [], gdcsUsers: any[] = [];
  let teachers: any[] = [], departments: any[] = [], generalPeriods: any[] = [], preschoolPeriods: any[] = [];

  try {
    const pAny = prisma as any;
    if (pAny) {
      if (pAny.academicYear) academicYears = await pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => []);
      if (pAny.campus) campuses = await pAny.campus.findMany({
        where: isGDCS ? { id: { in: allowedCampusIds } } : { status: "ACTIVE" },
        include: { manager: { include: { teacher: true } } },
        orderBy: { campusName: "asc" }
      }).catch(() => []);
      if (pAny.user) {
        giaoVuCSUsers = await pAny.user.findMany({ where: { role: { in: ["GD_CS", "GIAO_VU", "GDCS", "GIAO_VU_CS"] } }, select: { id: true, fullName: true } }).catch(() => []);
        gdcsUsers = await pAny.user.findMany({ where: { role: { in: ["GDCS", "GD_CS"] } }, select: { id: true, fullName: true, email: true } }).catch(() => []);
      }
      if (pAny.department) departments = await pAny.department.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }).catch(() => []);
      if (pAny.teacher) teachers = await pAny.teacher.findMany({ where: { status: "ACTIVE" }, include: { departmentRel: true, campus: true, user: true }, orderBy: { teacherName: "asc" } }).catch(() => []);
      if (pAny.inputAssessmentPeriod) generalPeriods = await pAny.inputAssessmentPeriod.findMany({ include: { batches: true }, orderBy: { createdAt: "desc" } }).catch(() => []);
      if (pAny.preschoolInputAssessmentPeriod) preschoolPeriods = await pAny.preschoolInputAssessmentPeriod.findMany({ include: { batches: true }, orderBy: { createdAt: "desc" } }).catch(() => []);
    }
  } catch (error) { console.error("ReportsPage fetch error:", error); }

  const safeJson = (data: any) => { try { if (!data) return []; return JSON.parse(JSON.stringify(data)); } catch (e) { return []; } };

  return (
    <div className="p-3 sm:p-4 lg:p-5">
      <ReportsClient
        academicYears={safeJson(academicYears)}
        campuses={safeJson(campuses)}
        giaoVuCSUsers={safeJson(giaoVuCSUsers)}
        gdcsUsers={safeJson(gdcsUsers)}
        teachers={safeJson(teachers)}
        departments={safeJson(departments)}
        generalPeriods={safeJson(generalPeriods)}
        preschoolPeriods={safeJson(preschoolPeriods)}
        currentUser={session?.user ? { id: session.user.id, role: (session.user as any).role, campusIds: liveCampusIds, fullName: session.user.name || "" } : null}
      />
    </div>
  );
}