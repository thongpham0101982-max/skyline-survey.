import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { StudentInfoClient } from "./client"

export const metadata = { title: "Tổng hợp KQ & Xử lý nhập học | Admin Portal" }
export const dynamic = "force-dynamic";

export default async function StudentInfoPage() {
  let generalStudents = [];
  let preschoolStudents = [];
  let generalPeriods = [];
  let preschoolPeriods = [];
  let activeYear = null;
  let configs = [];
  let preschoolConfigs = [];
  let eduSystems = [];
  let campuses = [];
  let grades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

  try {
    const pAny = prisma as any;
    activeYear = await getDefaultAcademicYear(pAny);
    const activeYearId = activeYear ? activeYear.id : null;

    if (pAny.assessmentConfig) {
      configs = await pAny.assessmentConfig.findMany({
        orderBy: [{ categoryType: "asc" }, { sortOrder: "asc" }]
      }).catch(() => []);
    }

    if (pAny.preschoolAssessmentConfig) {
      preschoolConfigs = await pAny.preschoolAssessmentConfig.findMany({
        where: {
          categoryType: {
            notIn: ["target", "LOAI_TUYEN_SINH", "DOI_TUONG_TS", "loai_tuyen_sinh", "doi_tuong_ts", "target_type", "TARGET_TYPE", "targetType"]
          }
        },
        orderBy: [{ categoryType: "asc" }, { sortOrder: "asc" }]
      }).catch(() => []);
    }

    if (pAny.educationSystem) {
      eduSystems = await pAny.educationSystem.findMany({
        orderBy: { createdAt: "asc" }
      }).catch(() => []);
    }

    if (pAny.campus) {
      campuses = await pAny.campus.findMany({
        where: { status: "ACTIVE" },
        orderBy: { campusName: "asc" }
      }).catch(() => []);
    }

    if (activeYearId) {
      generalStudents = await pAny.inputAssessmentStudent.findMany({
        where: {
          period: {
            academicYearId: activeYearId
          }
        },
        include: {
          period: { select: { id: true, name: true, academicYearId: true } },
          batch: { select: { id: true, name: true } },
          enrollmentClass: { select: { className: true } }
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
          batch: { select: { id: true, name: true } },
          enrollmentClass: { select: { className: true } }
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
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tổng hợp KQ & Xử lý nhập học</h1>
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
        activeYearId={activeYear ? activeYear.id : ""}
        configs={safeJson(configs)}
        preschoolConfigs={safeJson(preschoolConfigs)}
        eduSystems={safeJson(eduSystems)}
        campuses={safeJson(campuses)}
        grades={safeJson(grades)}
      />
    </div>
  )
}
