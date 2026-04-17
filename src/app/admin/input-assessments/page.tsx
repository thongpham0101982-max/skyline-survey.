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
  let grades: string[] = [];
  let configs: any[] = [];
  let teachers: any[] = [];
  let departments: any[] = [];
  
  try {
    campuses = await prisma.campus.findMany({ orderBy: { campusName: "asc" } });
    examBoardUsers = await prisma.user.findMany({ where: { role: "KT_DBCL" }, select: { id: true, fullName: true } });
    academicYears = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });
    subjects = await (prisma as any).assessmentSubject.findMany({ where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } });
    configs = await (prisma as any).assessmentConfig.findMany({ orderBy: [{ categoryType: "asc" }, { sortOrder: "asc" }] });
    
    // Fetch teachers and departments for the new assignment logic
    departments = await prisma.department.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } });
    teachers = await prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: { userId: true, teacherName: true, departmentId: true },
      orderBy: { teacherName: "asc" }
    });

    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" },
      include: { educationSystems: true }
    });
    eduSystems = activeYear?.educationSystems || [];
    const uniqueGrades = await prisma.class.findMany({
      where: { academicYearId: activeYear?.id },
      select: { grade: true },
      distinct: ["grade"],
      orderBy: { grade: "asc" }
    });
    grades = uniqueGrades.map(g => g.grade).filter(Boolean).sort((a, b) => parseInt(a) - parseInt(b));
  } catch (error) {
    console.error("Error:", error);
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý KSNL đầu vào</h1>
        <p className="text-slate-500 mt-1">Quản lý Kỳ khảo sát, Danh mục và Cấu hình Môn theo Khối - Hệ học.</p>
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
