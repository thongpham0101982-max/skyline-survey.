import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { auth } from "@/lib/auth"
import { StudentInfoClient } from "./client"

export const metadata = { title: "Nhập TT HS, KQKS | Admin Portal" }
export const dynamic = "force-dynamic";

export default async function StudentInfoPage() {
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
  let grades: string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  let configs: any[] = [];
  let preschoolConfigs: any[] = [];
  let rolePermissions: any[] = [];

  // --- FETCH STUDENT-INFO RIÊNG ---
  let generalStudents: any[] = [];
  let preschoolStudents: any[] = [];
  let generalPeriods: any[] = [];
  let preschoolPeriods: any[] = [];
  let destinationSchools: any[] = [];
  let activeYear: any = null;

  // --- FETCH MẦM NON RIÊNG ---
  const gradesPreschool = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"];

  try {
    const pAny = prisma as any;
    if (pAny) {
      const roleCode = user?.role || "ADMIN";
      activeYear = await getDefaultAcademicYear(pAny);
      const activeYearId = activeYear ? activeYear.id : null;

      // Trigger all fetches in parallel
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
        preschoolConfigsResult,
        eduSystemsResult,
        rolePermissionsResult,
        generalPeriodsResult,
        preschoolPeriodsResult
      ] = await Promise.all([
        // 1. dbAssignments
        user?.id && pAny.userCampusAssignment ? pAny.userCampusAssignment.findMany({ where: { userId: user.id } }).catch(() => []) : Promise.resolve([]),
        // 2. academicYears
        pAny.academicYear ? pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => []) : Promise.resolve([]),
        // 3. campuses
        pAny.campus ? pAny.campus.findMany({
          where: isGDCS ? { id: { in: allowedCampusIds } } : { status: "ACTIVE" },
          include: { manager: true },
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
          include: { departmentRel: true, campus: true, user: true },
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
        // 11. preschoolConfigs
        pAny.preschoolAssessmentConfig ? pAny.preschoolAssessmentConfig.findMany({
          where: {
            categoryType: {
              notIn: ["target", "LOAI_TUYEN_SINH", "DOI_TUONG_TS", "loai_tuyen_sinh", "doi_tuong_ts", "target_type", "TARGET_TYPE", "targetType"]
            }
          },
          orderBy: [{ categoryType: "asc" }, { sortOrder: "asc" }]
        }).catch(() => []) : Promise.resolve([]),
        // 12. eduSystems
        pAny.educationSystem ? pAny.educationSystem.findMany({
          orderBy: { createdAt: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        // 13. rolePermissions
        pAny.permission ? pAny.permission.findMany({ where: { roleCode } }).catch(() => []) : Promise.resolve([]),
        // 14. generalPeriods
        pAny.inputAssessmentPeriod ? pAny.inputAssessmentPeriod.findMany({
          where: activeYearId ? { academicYearId: activeYearId } : {},
          include: { batches: { select: { id: true, name: true, status: true } } },
          orderBy: { name: 'asc' }
        }).catch(() => []) : Promise.resolve([]),
        // 15. preschoolPeriods
        pAny.preschoolInputAssessmentPeriod ? pAny.preschoolInputAssessmentPeriod.findMany({
          where: activeYearId ? { academicYearId: activeYearId } : {},
          include: { batches: { select: { id: true, name: true, status: true } } },
          orderBy: { name: 'asc' }
        }).catch(() => []) : Promise.resolve([])
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
      preschoolConfigs = preschoolConfigsResult;
      eduSystems = eduSystemsResult;
      rolePermissions = rolePermissionsResult;
      generalPeriods = generalPeriodsResult;
      preschoolPeriods = preschoolPeriodsResult;
      destinationSchools = destinationSchoolsResult || [];

      if (dbAssignments && dbAssignments.length > 0) {
        liveCampusIds = dbAssignments.map((a: any) => a.campusId);
      }

      if (activeYearId) {
        generalStudents = await pAny.inputAssessmentStudent.findMany({
          where: {
            period: { academicYearId: activeYearId }
          },
          include: {
            period: { select: { id: true, name: true, academicYearId: true } },
            batch: { select: { id: true, name: true, startDate: true } },
            enrollmentClass: { select: { className: true } },
            scores: {
              include: {
                subject: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        preschoolStudents = await pAny.preschoolInputAssessmentStudent.findMany({
          where: {
            period: { academicYearId: activeYearId }
          },
          include: {
            period: { select: { id: true, name: true, academicYearId: true } },
            batch: { select: { id: true, name: true, startDate: true } },
            enrollmentClass: { select: { className: true } }
          },
          orderBy: { createdAt: 'desc' }
        });

        if (pAny.class) {
          const uniqueGrades = await pAny.class.findMany({
            where: { academicYearId: activeYearId },
            select: { grade: true },
            distinct: ["grade"],
            orderBy: { grade: "asc" }
          }).catch(() => []);
          
          try {
            const dbGrades = uniqueGrades.map((g: any) => g.grade).filter(Boolean);
            if (dbGrades.length > 0) {
              grades = dbGrades.sort((a: any, b: any) => {
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
  } catch (error) {
    console.error("Fetch Student Info Error:", error);
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
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Nhập TT HS, KQKS</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">
          Năm học đang hoạt động: <span className="text-[#00A99D] font-bold">{activeYear ? activeYear.name : "Không xác định"}</span>. 
          Tra cứu thông tin, kết quả khảo sát đầu vào của học sinh Phổ thông và Mầm non.
        </p>
      </div>
      <StudentInfoClient 
        initialGeneralStudents={safeJson(generalStudents)} 
        initialPreschoolStudents={safeJson(preschoolStudents)} 
        generalPeriods={safeJson(generalPeriods)}
        preschoolPeriods={safeJson(preschoolPeriods)}
        destinationSchools={safeJson(destinationSchools)}
        activeYearName={activeYear ? activeYear.name : ""}
        activeYearId={activeYear ? activeYear.id : ""}
        configs={safeJson(configs)}
        preschoolConfigs={safeJson(preschoolConfigs)}
        eduSystems={safeJson(eduSystems)}
        campuses={safeJson(campuses)}
        grades={safeJson(grades)}
        
        // NEW PROPS FOR EMBEDDING
        academicYears={safeJson(academicYears)}
        examBoardUsers={safeJson(examBoardUsers)}
        giaoVuCSUsers={safeJson(giaoVuCSUsers)}
        gdcsUsers={safeJson(gdcsUsers)}
        subjects={safeJson(subjects)}
        teachers={safeJson(teachers)}
        departments={safeJson(departments)}
        currentUser={currentUser}
        rolePermissions={safeJson(rolePermissions)}
        gradesPreschool={gradesPreschool}
      />
    </div>
  )
}
