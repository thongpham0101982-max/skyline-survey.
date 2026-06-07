import { prisma } from "@/lib/db"
import { StudentInfoClient } from "./client"

export const metadata = { title: "Thông tin HS Khảo sát | Admin Portal" }
export const dynamic = "force-dynamic";

export default async function StudentInfoPage() {
  let generalStudents = [];
  let preschoolStudents = [];

  try {
    const pAny = prisma as any;
    generalStudents = await pAny.inputAssessmentStudent.findMany({
      include: {
        period: { select: { name: true } },
        batch: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    preschoolStudents = await pAny.preschoolInputAssessmentStudent.findMany({
      include: {
        period: { select: { name: true } },
        batch: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Fetch Student Info Error:", error);
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Thông tin HS Khảo sát</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">Tra cứu thông tin, kết quả khảo sát đầu vào của học sinh Phổ thông và Mầm non.</p>
      </div>
      <StudentInfoClient 
        initialGeneralStudents={generalStudents} 
        initialPreschoolStudents={preschoolStudents} 
      />
    </div>
  )
}
