import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { StudentInfoClient } from "./client"

export const metadata = { title: "Thông tin HS Khảo sát | Admin Portal" }
export const dynamic = "force-dynamic";

export default async function StudentInfoPage() {
  let generalStudents = [];
  let preschoolStudents = [];
  let generalPeriods = [];
  let preschoolPeriods = [];
  let activeYear = null;

  try {
    const pAny = prisma as any;
    activeYear = await getDefaultAcademicYear(pAny);
    const activeYearId = activeYear ? activeYear.id : null;

    if (activeYearId) {
      generalStudents = await pAny.inputAssessmentStudent.findMany({
        where: {
          period: {
            academicYearId: activeYearId
          }
        },
        include: {
          period: { select: { id: true, name: true, academicYearId: true } },
          batch: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      preschoolStudents = await pAny.preschoolInputAssessmentStudent.findMany({
        where: {
          period: {
            academicYearId: activeYearId
          }
        },
        include: {
          period: { select: { id: true, name: true, academicYearId: true } },
          batch: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      generalPeriods = await pAny.inputAssessmentPeriod.findMany({
        where: { academicYearId: activeYearId },
        include: { batches: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' }
      });

      preschoolPeriods = await pAny.preschoolInputAssessmentPeriod.findMany({
        where: { academicYearId: activeYearId },
        include: { batches: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' }
      });
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

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Thông tin HS Khảo sát</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">
          Năm học đang hoạt động: <span className="text-[#00A6A9] font-bold">{activeYear ? activeYear.name : "Không xác định"}</span>. 
          Tra cứu thông tin, kết quả khảo sát đầu vào của học sinh Phổ thông và Mầm non.
        </p>
      </div>
      <StudentInfoClient 
        initialGeneralStudents={safeJson(generalStudents)} 
        initialPreschoolStudents={safeJson(preschoolStudents)} 
        generalPeriods={safeJson(generalPeriods)}
        preschoolPeriods={safeJson(preschoolPeriods)}
        activeYearName={activeYear ? activeYear.name : ""}
      />
    </div>
  )
}
