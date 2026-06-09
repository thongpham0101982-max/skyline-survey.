import { getDefaultAcademicYear } from "@/lib/academicYear"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { NhapHsKhaoSatClient } from "./client"

export const metadata = { title: "Nhập HS Khảo sát | Admin" }
export const dynamic = "force-dynamic";

export default async function NhapHsKhaoSatPage({ searchParams }: { searchParams: { tab?: string } }) {
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
  let rolePermissions: any[] = [];

  // --- FETCH MẦM NON RIÊNG ---
  const gradesPreschool = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"];

  try {
    const pAny = prisma as any;
    if (pAny) {
      const roleCode = user?.role || "ADMIN";

      // Trigger all fetches in parallel using Promise.all
      const [
        dbAssignments,
        academicYearsResult,
        campusesResult,
        giaoVuCSUsersResult,
        departmentsResult,
        teachersResult,
        examBoardUsersResult,
        gdcsUsersResult,
        subjectsResult,
        configsResult,
        eduSystemsResult,
        activeYearResult,
        rolePermissionsResult
      ] = await Promise.all([
        // 1. dbAssignments
        user?.id && pAny.userCampusAssignment ? pAny.userCampusAssignment.findMany({ where: { userId: user.id } }).catch(() => []) : Promise.resolve([]),
        // 2. academicYears
        pAny.academicYear ? pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => []) : Promise.resolve([]),
        // 3. campuses
        pAny.campus ? pAny.campus.findMany({
          where: isGDCS ? { id: { in: allowedCampusIds } } : { status: "ACTIVE" },
          include: {
            manager: {
              include: {
                teacher: true
              }
            }
          },
          orderBy: { campusName: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        // 4. giaoVuCSUsers
        pAny.user ? pAny.user.findMany({
          where: { role: { in: ["GĐ_CS", "GIAO_VU", "GDCS", "GIAO_VU_CS"] } },
          select: { id: true, fullName: true }
        }).catch(() => []) : Promise.resolve([]),
        // 5. departments
        pAny.department ? pAny.department.findMany({
          where: { status: "ACTIVE" }, orderBy: { name: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        // 6. teachers
        pAny.teacher ? pAny.teacher.findMany({
          where: { status: "ACTIVE" },
          include: {
            departmentRel: true,
            campus: true,
            user: true
          },
          orderBy: { teacherName: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        // 7. examBoardUsers
        pAny.user ? pAny.user.findMany({
          where: { role: { in: ["KT_DBCL", "ADMIN"] } },
          select: { id: true, fullName: true }
        }).catch(() => []) : Promise.resolve([]),
        // 8. gdcsUsers
        pAny.user ? pAny.user.findMany({
          where: { role: { in: ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "gdcs", "gđcs", "gđ_cs", "gd_cs"] } },
          select: { id: true, fullName: true, email: true }
        }).catch(() => []) : Promise.resolve([]),
        // 9. subjects
        pAny.assessmentSubject ? pAny.assessmentSubject.findMany({
          where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        // 10. configs
        pAny.assessmentConfig ? pAny.assessmentConfig.findMany({
          orderBy: [{ categoryType: "asc" }, { sortOrder: "asc" }]
        }).catch(() => []) : Promise.resolve([]),
        // 11. eduSystems
        pAny.educationSystem ? pAny.educationSystem.findMany({
          orderBy: { createdAt: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        // 12. activeYear
        pAny.academicYear ? getDefaultAcademicYear(pAny).catch(() => null) : Promise.resolve(null),
        // 13. rolePermissions
        pAny.permission ? pAny.permission.findMany({ where: { roleCode } }).catch(() => []) : Promise.resolve([])
      ]);

      // Assign results
      academicYears = academicYearsResult;
      campuses = campusesResult;
      giaoVuCSUsers = giaoVuCSUsersResult;
      departments = departmentsResult;
      teachers = teachersResult;
      examBoardUsers = examBoardUsersResult;
      gdcsUsers = gdcsUsersResult;
      subjects = subjectsResult;
      configs = configsResult;
      eduSystems = eduSystemsResult;
      rolePermissions = rolePermissionsResult;

      if (dbAssignments && dbAssignments.length > 0) {
        liveCampusIds = dbAssignments.map((a: any) => a.campusId);
      }

      // Fetch gradesK12 if activeYear exists
      if (activeYearResult && pAny.class) {
        const uniqueGrades = await pAny.class.findMany({
          where: { academicYearId: activeYearResult.id },
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
  } catch (error) {
    console.error("Critical NhapHsKhaoSatPage fetch error:", error);
  }

  const safeJson = (data: any) => {
    try {
      if (!data) return [];
      return JSON.parse(JSON.stringify(data));
    } catch (e) {
      return [];
    }
  }

  const currentUser = session?.user 
    ? { 
        id: session.user.id, 
        role: (session.user as any).role, 
        campusIds: liveCampusIds, 
        fullName: session.user.name || '' 
      } 
    : null;

  return (
    <NhapHsKhaoSatClient
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
