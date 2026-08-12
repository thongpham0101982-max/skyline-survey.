import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AdminClassStudentsClient } from "./client"
import { sortVietnameseStudents } from "@/lib/vietnameseSort"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminClassDetailPage({ params }: any) {
  const { id: classId } = await params
  
  const activeSurveys = await prisma.surveyPeriod.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { endDate: 'asc' }
  });

  const classInfo = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      campus: true,
      students: {
        where: { status: 'ACTIVE' },
        include: {
          surveyForms: true,
          studentTransfers: true
        }
      }
    }
  })

  if (!classInfo) return notFound()

  // Pre-fetch candidate student codes from Input Assessment tables
  const studentCodes = (classInfo.students || []).map(s => s.studentCode).filter(Boolean);

  const [generalCandidates, preschoolCandidates, codeMappings] = await Promise.all([
    prisma.inputAssessmentStudent.findMany({
      where: {
        OR: [
          { enrollmentClassId: classId },
          { studentCode: { in: studentCodes } },
          { enrollmentCode: { in: studentCodes } }
        ]
      },
      select: { studentCode: true, enrollmentCode: true, fullName: true, enrollmentClassId: true }
    }),
    prisma.preschoolInputAssessmentStudent.findMany({
      where: {
        OR: [
          { enrollmentClassId: classId },
          { studentCode: { in: studentCodes } },
          { enrollmentCode: { in: studentCodes } }
        ]
      },
      select: { studentCode: true, enrollmentCode: true, fullName: true, enrollmentClassId: true }
    }),
    prisma.studentCodeMapping.findMany({
      where: {
        academicYearId: classInfo.academicYearId,
        databaseCode: { in: studentCodes }
      }
    })
  ]);

  const allCandidates = [...generalCandidates, ...preschoolCandidates];
  const vnEduMap = new Map(codeMappings.map(m => [m.databaseCode, m.markFileCode]));

  const studentsWithEnrollmentType = (classInfo.students || []).map(student => {
    const hasTransferIn = student.studentTransfers && student.studentTransfers.some((t: any) => t.type === 'IN');
    
    const matchedCandidate = allCandidates.find(c => 
      (c.studentCode && (c.studentCode === student.studentCode || c.enrollmentCode === student.studentCode)) ||
      (c.enrollmentClassId === classId && c.fullName && c.fullName.trim().toLowerCase() === student.studentName.trim().toLowerCase())
    );

    const isFromSurvey = hasTransferIn || !!matchedCandidate;
    const vnEduCode = vnEduMap.get(student.studentCode) || matchedCandidate?.enrollmentCode || "—";

    return {
      ...student,
      vnEduCode,
      enrollmentType: isFromSurvey ? "KS" : "Trực tiếp",
      isSurveyStudent: isFromSurvey
    };
  });

  // Sort students by Vietnamese alphabetical order (Tên -> Họ & đệm)
  const sortedStudents = sortVietnameseStudents(studentsWithEnrollmentType);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <Link href="/admin/classes" className="p-2 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Lớp {classInfo.className}</h1>
          <p className="text-slate-500 mt-1">Cơ sở: {classInfo.campus?.campusName || "N/A"} • Mã lớp: {classInfo.classCode}</p>
        </div>
      </div>

      <AdminClassStudentsClient classId={classId} initialStudents={sortedStudents} activeSurveys={activeSurveys} />
    </div>
  )
}
