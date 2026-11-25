import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { ReportsClient } from "./client"
import { EntranceWorkflowStepper } from "@/components/entrance/EntranceWorkflowStepper"
import { isCampusScopedEntranceRole } from "@/lib/entrance-progress/constants"

export const metadata = { title: "Văn bản & Xuất báo cáo KSĐV | Admin" }
export const dynamic = "force-dynamic"

export default async function InputAssessmentReportsPage() {
  let session: any = null;
  try { session = await auth(); } catch (e) { console.error("Auth error:", e); }
  const user = session?.user as any;
  const isCampusScoped = isCampusScopedEntranceRole(user?.role);
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
        where: isCampusScoped && liveCampusIds.length > 0 ? { id: { in: liveCampusIds }, status: "ACTIVE" } : { status: "ACTIVE" },
        include: { manager: { include: { teacher: true } } },
        orderBy: { campusName: "asc" }
      }).catch(() => []);
      if (pAny.user) {
        giaoVuCSUsers = await pAny.user.findMany({ where: { role: { in: ["GD_CS", "GIAO_VU", "GDCS", "GIAO_VU_CS"] } }, select: { id: true, fullName: true } }).catch(() => []);
        gdcsUsers = await pAny.user.findMany({
          where: { OR: [{ role: { in: ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "gdcs", "gđcs", "gđ_cs", "gd_cs"] } }, { teacher: { position: { in: ["GĐCS", "GDCS", "GĐ_CS", "GD_CS"] } } }, { teacher: { positions: { contains: "GĐCS" } } }, { teacher: { positions: { contains: "GDCS" } } }] },
          select: { id: true, fullName: true, email: true, teacher: { select: { id: true, teacherCode: true, teacherName: true, email: true, campusId: true } } }
        }).catch(async () => {
          return await pAny.user.findMany({ where: { role: { in: ["GDCS", "GD_CS"] } }, select: { id: true, fullName: true, email: true } }).catch(() => []);
        });
      }
      if (pAny.department) departments = await pAny.department.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }).catch(() => []);
      if (pAny.teacher) teachers = await pAny.teacher.findMany({ where: { status: "ACTIVE" }, include: { departmentRel: true, campus: true, user: true }, orderBy: { teacherName: "asc" } }).catch(() => []);
      if (pAny.teacherSignatureProfile) {
        const sigProfiles = await pAny.teacherSignatureProfile.findMany().catch(() => []);
        if (Array.isArray(sigProfiles) && sigProfiles.length > 0) {
          const sigByTeacherId = new Map<string, any>(sigProfiles.map((sp: any) => [sp.teacherId, sp]));
          teachers = teachers.map((t: any) => ({ ...t, signatureProfile: sigByTeacherId.get(t.id) || null }));
          campuses = campuses.map((c: any) => {
            if (c?.manager?.teacher?.id) {
              return {
                ...c,
                manager: {
                  ...c.manager,
                  teacher: {
                    ...c.manager.teacher,
                    signatureProfile: sigByTeacherId.get(c.manager.teacher.id) || null
                  }
                }
              };
            }
            return c;
          });
          gdcsUsers = gdcsUsers.map((u: any) => {
            if (u?.teacher?.id) {
              return {
                ...u,
                teacher: {
                  ...u.teacher,
                  signatureProfile: sigByTeacherId.get(u.teacher.id) || null
                }
              };
            }
            return u;
          });
        }
      }
      if (pAny.inputAssessmentPeriod) generalPeriods = await pAny.inputAssessmentPeriod.findMany({ include: { batches: true }, orderBy: { createdAt: "desc" } }).catch(() => []);
      if (pAny.preschoolInputAssessmentPeriod) preschoolPeriods = await pAny.preschoolInputAssessmentPeriod.findMany({ include: { batches: true }, orderBy: { createdAt: "desc" } }).catch(() => []);
    }
  } catch (error) { console.error("ReportsPage fetch error:", error); }

  const safeJson = (data: any) => { try { if (!data) return []; return JSON.parse(JSON.stringify(data)); } catch (e) { return []; } };

  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-4">
      <EntranceWorkflowStepper activeStep="reports" />
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
