import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { InputAssessmentsClient } from "./client"

export const metadata = { title: "Quản lý KSNL đầu vào | Admin" }
export const dynamic = "force-dynamic";

export default async function InputAssessmentsPage() {
  let session: any = null;
  try {
    session = await auth();
  } catch (e) {
    console.error("Auth error:", e);
  }
  
  const user = session?.user as any;
  const isGDCS = user?.role === 'GDCS';
  const allowedCampusIds = user?.campusIds || [];
  
  let academicYears: any[] = [];
  let campuses: any[] = [];
  let examBoardUsers: any[] = [];
  let giaoVuCSUsers: any[] = [];
  let subjects: any[] = [];
  let eduSystems: any[] = [];
  let grades: string[] = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  let configs: any[] = [];
  let teachers: any[] = [];
  let departments: any[] = [];
  
  try {
    const pAny = prisma as any;
    if (pAny) {
      if (pAny.academicYear) {
        academicYears = await pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => []);
      }
      if (pAny.campus) {
        campuses = await pAny.campus.findMany({ 
          where: isGDCS ? { id: { in: allowedCampusIds } } : { status: "ACTIVE" }, 
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
          select: { userId: true, teacherName: true, departmentId: true },
          orderBy: { teacherName: "asc" }
        }).catch(() => []);
      }
      if (pAny.academicYear) {
        const activeYear = await pAny.academicYear.findFirst({
          where: { status: "ACTIVE" },
          include: { educationSystems: true }
        }).catch(() => null);

        if (activeYear) {
          eduSystems = activeYear.educationSystems || [];
          if (pAny.class) {
            const uniqueGrades = await pAny.class.findMany({
              where: { academicYearId: activeYear.id },
              select: { grade: true },
              distinct: ["grade"],
              orderBy: { grade: "asc" }
            }).catch(() => []);
            
            const dbGrades = uniqueGrades.map((g: any) => g.grade).filter(Boolean);
            if (dbGrades.length > 0) {
              grades = dbGrades.sort((a: string, b: string) => {
                const na = parseInt(a);
                const nb = parseInt(b);
                if (isNaN(na) || isNaN(nb)) return a.localeCompare(b);
                return na - nb;
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Critical InputAssessmentsPage fetch error:", error);
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
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-2">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Quản lý KSNL Đầu vào</h1>
          <p className="text-slate-500 font-medium mt-1">Quản lý Kỳ khảo sát, Danh mục và Cấu hình Môn theo Khối - Hệ học.</p>
        </div>
      </div>
      <InputAssessmentsClient
        academicYears={safeJson(academicYears)}
        campuses={safeJson(campuses)}
        examBoardUsers={safeJson(examBoardUsers)}
        giaoVuCSUsers={safeJson(giaoVuCSUsers)}
        subjects={safeJson(subjects)}
        eduSystems={safeJson(eduSystems)}
        grades={safeJson(grades)}
        configs={safeJson(configs)}
        teachers={safeJson(teachers)}
        departments={safeJson(departments)}
      />
    </div>
  )
}
