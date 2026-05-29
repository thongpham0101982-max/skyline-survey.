import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { ReportsClient } from "./client"

export const metadata = { title: "Xuất báo cáo KSNL | Admin" }
export const dynamic = "force-dynamic";

export default async function InputAssessmentReportsPage() {
  let session: any = null;
  try {
    session = await auth();
  } catch (e) {
    console.error("Auth error:", e);
  }
  
  const user = session?.user as any;
  const isGDCS = user?.role === 'GDCS';
  const allowedCampusIds = Array.isArray(user?.campusIds) ? user.campusIds : [];
  let liveCampusIds = [...allowedCampusIds];
  try {
    if (user?.id && prisma.userCampusAssignment) {
      const dbAssignments = await prisma.userCampusAssignment.findMany({
        where: { userId: user.id }
      });
      if (dbAssignments.length > 0) {
        liveCampusIds = dbAssignments.map(a => a.campusId);
      }
    }
  } catch (liveError) {
    console.error("Live campusIds fetch error handled:", liveError);
  }
  
  let academicYears: any[] = [];
  let campuses: any[] = [];
  let giaoVuCSUsers: any[] = [];
  let gdcsUsers: any[] = [];
  let teachers: any[] = [];
  let departments: any[] = [];
  let generalPeriods: any[] = [];
  let preschoolPeriods: any[] = [];
  
  try {
    const pAny = prisma as any;
    if (pAny) {
      if (pAny.academicYear) {
        academicYears = await pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => []);
      }
      if (pAny.campus) {
        campuses = await pAny.campus.findMany({ 
          where: isGDCS ? { id: { in: allowedCampusIds } } : { status: "ACTIVE" }, 
          include: { 
            manager: {
              include: {
                teacher: true
              }
            } 
          },
          orderBy: { campusName: "asc" } 
        }).catch(() => []);
      }

      if (pAny.user) {
        giaoVuCSUsers = await pAny.user.findMany({ 
          where: { role: { in: ["GĐ_CS", "GIAO_VU", "GDCS", "GIAO_VU_CS"] } }, 
          select: { id: true, fullName: true } 
        }).catch(() => []);

        gdcsUsers = await pAny.user.findMany({ 
          where: { role: { in: ["GDCS", "GĐCS", "GD_CS", "GĐ_CS"] } }, 
          select: { id: true, fullName: true, email: true } 
        }).catch(() => []);
      }

      if (pAny.department) {
        departments = await pAny.department.findMany({ 
          where: { status: "ACTIVE" }, orderBy: { name: "asc" } 
        }).catch(() => []);
      }

      if (pAny.teacher) {
        teachers = await pAny.teacher.findMany({
          where: { status: "ACTIVE" },
          include: {
            departmentRel: true,
            campus: true,
            user: true
          },
          orderBy: { teacherName: "asc" }
        }).catch(() => []);
      }

      if (pAny.inputAssessmentPeriod) {
        generalPeriods = await pAny.inputAssessmentPeriod.findMany({
          include: { batches: true },
          orderBy: { createdAt: 'desc' }
        }).catch(() => []);
      }

      if (pAny.preschoolInputAssessmentPeriod) {
        preschoolPeriods = await pAny.preschoolInputAssessmentPeriod.findMany({
          include: { batches: true },
          orderBy: { createdAt: 'desc' }
        }).catch(() => []);
      }
    }
  } catch (error) {
    console.error("InputAssessmentReportsPage fetch error:", error);
  }

  const safeJson = (data: any) => {
    try {
      if (!data) return [];
      return JSON.parse(JSON.stringify(data));
    } catch (e) {
      return [];
    }
  }

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
        currentUser={session?.user ? { id: session.user.id, role: (session.user as any).role, campusIds: liveCampusIds, fullName: session.user.name || '' } : null}
      />
    </div>
  );
}
