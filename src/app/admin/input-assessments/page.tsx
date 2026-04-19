import { prisma } from "@/lib/db"
import { InputAssessmentsClient } from "./client"

export const metadata = { title: "Quản lý KSNL đầu vào | Admin" }
export const dynamic = "force-dynamic";

export default async function InputAssessmentsPage() {
  let academicYears: any[] = [];
  let campuses: any[] = [];
  let examBoardUsers: any[] = [];
  let subjects: any[] = [];
  let eduSystems: any[] = [];
  let grades: string[] = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  let configs: any[] = [];
  let teachers: any[] = [];
  let departments: any[] = [];
  
  try {
    console.log("InputAssessmentsPage: Starting data fetch");
    const pAny = prisma as any;

    academicYears = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(e => { console.error("AY fetch", e); return []; });
    campuses = await prisma.campus.findMany({ where: { status: "ACTIVE" }, orderBy: { campusName: "asc" } }).catch(() => []);
    examBoardUsers = await prisma.user.findMany({ 
      where: { role: { in: ["ADMIN", "KT_DBCL"] }, status: "ACTIVE" }, 
      select: { id: true, fullName: true } 
    }).catch(() => []);
    
    if (typeof pAny.assessmentSubject?.findMany === "function") {
      subjects = await pAny.assessmentSubject.findMany({ 
        where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } 
      }).catch(() => []);
    } else {
      console.warn("assessmentSubject model not found on prisma client");
    }

    if (typeof pAny.assessmentConfig?.findMany === "function") {
      configs = await pAny.assessmentConfig.findMany({ 
        orderBy: [{ categoryType: "asc" }, { sortOrder: "asc" }] 
      }).catch(() => []);
    } else {
      console.warn("assessmentConfig model not found on prisma client");
    }
    
    departments = await prisma.department.findMany({ 
      where: { status: "ACTIVE" }, orderBy: { name: "asc" } 
    }).catch(() => []);
    
    teachers = await prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: { userId: true, teacherName: true, departmentId: true },
      orderBy: { teacherName: "asc" }
    }).catch(() => []);

    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" },
      include: { educationSystems: true }
    }).catch(() => null);

    if (activeYear) {
      eduSystems = activeYear.educationSystems || [];
      const uniqueGrades = await prisma.class.findMany({
        where: { academicYearId: activeYear.id },
        select: { grade: true },
        distinct: ["grade"],
        orderBy: { grade: "asc" }
      }).catch(() => []);
      
      const dbGrades = uniqueGrades.map((g: any) => g.grade).filter(Boolean);
      if (dbGrades.length > 0) {
        grades = dbGrades.sort((a: string, b: string) => parseInt(a) - parseInt(b));
      }
    }
  } catch (error) {
    console.error("Critical InputAssessmentsPage error:", error);
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
        academicYears={academicYears}
        campuses={campuses}
        examBoardUsers={examBoardUsers}
        subjects={subjects}
        eduSystems={eduSystems}
        grades={grades}
        configs={configs}
        teachers={teachers}
        departments={departments}
      />
    </div>
  )
}
