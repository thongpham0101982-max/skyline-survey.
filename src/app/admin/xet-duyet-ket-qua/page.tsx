import { getDefaultAcademicYear } from "@/lib/academicYear"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { XetDuyetKetQuaClient } from "./client"

export const metadata = { title: "Xét duyệt Kết quả | Admin" }
export const dynamic = "force-dynamic";

export default async function XetDuyetKetQuaPage() {
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
  
  let academicYears: any[] = [];
  let campuses: any[] = [];
  let examBoardUsers: any[] = [];
  let giaoVuCSUsers: any[] = [];
  let gdcsUsers: any[] = [];
  let subjects: any[] = [];
  let eduSystems: any[] = [];
  let grades: string[] = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  let configs: any[] = [];
  let teachers: any[] = [];
  let departments: any[] = [];
  let mầmNonClasses: any[] = [];
  const preschoolGrades = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"];
  
  try {
    const pAny = prisma as any;
    if (pAny) {
      if (pAny.academicYear) {
        academicYears = await pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => []);
      }
      if (pAny.class) {
        mầmNonClasses = await pAny.class.findMany({
          where: { level: "Mầm non", status: "ACTIVE" },
          orderBy: { className: "asc" }
        }).catch(() => []);
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
        examBoardUsers = await pAny.user.findMany({ 
          where: { role: { in: ["KT_DBCL", "ADMIN"] } }, 
          select: { id: true, fullName: true } 
        }).catch(() => []);

        giaoVuCSUsers = await pAny.user.findMany({ 
          where: { role: { in: ["GĐ_CS", "GIAO_VU", "GDCS", "GIAO_VU_CS"] } }, 
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
              const dbGrades = uniqueGrades
                .map((g: any) => g.grade)
                .filter(Boolean)
                .filter((g: string) => /^(?:[1-9]|1[0-2])$/.test(String(g).trim()));
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
    }
  } catch (error) {
    console.error("Critical XetDuyetKetQuaPage fetch error:", error);
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
      <XetDuyetKetQuaClient
        classes={safeJson(mầmNonClasses)}
        academicYears={safeJson(academicYears)}
        campuses={safeJson(campuses)}
        examBoardUsers={safeJson(examBoardUsers)}
        giaoVuCSUsers={safeJson(giaoVuCSUsers)}
        gdcsUsers={safeJson(gdcsUsers)}
        subjects={safeJson(subjects)}
        eduSystems={safeJson(eduSystems)}
        k12Grades={safeJson(grades)}
        preschoolGrades={preschoolGrades}
        configs={safeJson(configs)}
        teachers={safeJson(teachers)}
        departments={safeJson(departments)}
        currentUser={session?.user ? { id: session.user.id, role: (session.user as any).role, campusIds: liveCampusIds, fullName: session.user.name || '' } : null}
        rolePermissions={await (async () => {
          try {
            const roleCode = (session?.user as any)?.role || "ADMIN";
            return await prisma.permission.findMany({
              where: { roleCode }
            });
          } catch (e) {
            console.error("Error fetching permissions for xet-duyet-ket-qua page:", e);
            return [];
          }
        })()}
      />
    </div>
  )
}
