import { getDefaultAcademicYear } from "@/lib/academicYear"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { SurveyConfigClient } from "./client"

export const metadata = { title: "Cấu hình Khảo sát | Admin" }
export const dynamic = "force-dynamic";

export default async function SurveyConfigPage({ searchParams }: { searchParams: { tab?: string } }) {
  let session: any = null;
  try {
    session = await auth();
  } catch (e) {
    console.error("Auth error:", e);
  }
  
  const user = session?.user as any;
  const isGDCS = user?.role === 'GDCS';
  const allowedCampusIds = user?.campusIds || [];
  let liveCampusIds = [...allowedCampusIds];
  try {
    if (user?.id) {
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

  // --- FETCH CHUNG ---
  let academicYears: any[] = [];
  let campuses: any[] = [];
  let giaoVuCSUsers: any[] = [];
  let teachers: any[] = [];
  let departments: any[] = [];

  // --- FETCH K12 RIÊNG ---
  let examBoardUsers: any[] = [];
  let gdcsUsers: any[] = [];
  let subjects: any[] = [];
  let eduSystems: any[] = [];
  let gradesK12: string[] = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  let configs: any[] = [];

  // --- FETCH MẦM NON RIÊNG ---
  const gradesPreschool = ["18 đến 24 tháng", "24 đến 36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn", "5 đến 6 tuổi"];

  try {
    const pAny = prisma as any;
    if (pAny) {
      // Bảng chung
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

      // Bảng K12
      if (pAny.user) {
        examBoardUsers = await pAny.user.findMany({ 
          where: { role: { in: ["KT_DBCL", "ADMIN"] } }, 
          select: { id: true, fullName: true } 
        }).catch(() => []);

        gdcsUsers = await pAny.user.findMany({ 
          where: { role: { in: ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "gdcs", "gđcs", "gđ_cs", "gd_cs"] } }, 
          select: { id: true, fullName: true, email: true } 
        }).catch(() => []);
      }
      if (pAny.assessmentSubject) {
        subjects = await pAny.assessmentSubject.findMany({ 
          where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } 
        }).catch(() => []);
      }
      if (pAny.assessmentConfig) {
        configs = await pAny.assessmentConfig.findMany({ 
          orderBy: [{ categoryType: "asc" }, { sortOrder: "asc" }] 
        }).catch(() => []);
      }
      if (pAny.educationSystem) {
        eduSystems = await pAny.educationSystem.findMany({
          orderBy: { createdAt: "asc" }
        }).catch(() => []);
      }
      if (pAny.academicYear) {
        const activeYear = await getDefaultAcademicYear(pAny);

        if (activeYear) {
          if (pAny.class) {
            const uniqueGrades = await pAny.class.findMany({
              where: { academicYearId: activeYear.id },
              select: { grade: true },
              distinct: ["grade"],
              orderBy: { grade: "asc" }
            }).catch(() => []);
            
            try {
              const dbGrades = uniqueGrades.map((g: any) => g.grade).filter(Boolean);
              if (dbGrades.length > 0) {
                gradesK12 = dbGrades.sort((a: any, b: any) => {
                  const na = parseInt(a);
                  const nb = parseInt(b);
                  if (isNaN(na) || isNaN(nb)) return String(a).localeCompare(String(b));
                  return na - nb;
                });
              }
            } catch (sortError) {
              console.error("Sorting grades error handled:", sortError);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Critical SurveyConfigPage fetch error:", error);
  }

  const safeJson = (data: any) => {
    try {
      if (!data) return [];
      return JSON.parse(JSON.stringify(data));
    } catch (e) {
      return [];
    }
  }

  // Lấy rolePermissions cho K12
  const rolePermissions = await (async () => {
    try {
      const roleCode = (session?.user as any)?.role || "ADMIN";
      return await prisma.permission.findMany({
        where: { roleCode }
      });
    } catch (e) {
      console.error("Error fetching permissions for survey-config page:", e);
      return [];
    }
  })();

  const currentUser = session?.user 
    ? { 
        id: session.user.id, 
        role: (session.user as any).role, 
        campusIds: liveCampusIds, 
        fullName: session.user.name || '' 
      } 
    : null;

  return (
    <SurveyConfigClient
      initialTab={searchParams?.tab || ""}
      academicYears={safeJson(academicYears)}
      campuses={safeJson(campuses)}
      giaoVuCSUsers={safeJson(giaoVuCSUsers)}
      teachers={safeJson(teachers)}
      departments={safeJson(departments)}
      
      // K12
      examBoardUsers={safeJson(examBoardUsers)}
      gdcsUsers={safeJson(gdcsUsers)}
      subjects={safeJson(subjects)}
      eduSystems={safeJson(eduSystems)}
      gradesK12={safeJson(gradesK12)}
      configs={safeJson(configs)}
      rolePermissions={safeJson(rolePermissions)}

      // Mầm non
      gradesPreschool={gradesPreschool}

      // User
      currentUser={currentUser}
    />
  )
}
