import { PageHeader } from "@/components/PageHeader"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertCircle, Home, BookOpen } from "lucide-react"
import { AdminClassStudentsClient } from "./client"
import { sortVietnameseStudents } from "@/lib/vietnameseSort"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminClassDetailPage({ params }: any) {
  const { id: rawClassId } = await params
  const classId = (rawClassId || '').trim()

  // 1. Direct query by class ID
  let classInfo = await prisma.class.findUnique({
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

  // 2. Fallback: match by classCode (e.g. C-26_27-18)
  if (!classInfo && classId) {
    const byCode = await prisma.class.findFirst({
      where: { classCode: classId },
      select: { id: true }
    })
    if (byCode) {
      redirect(`/admin/classes/${byCode.id}`)
    }
  }

  // 3. Fallback: match by className (e.g. 2.2INT_CS5 or 1.1_CS1)
  if (!classInfo && classId) {
    const byName = await prisma.class.findFirst({
      where: {
        OR: [
          { className: classId },
          { className: classId.replace(/_/g, ' ') },
          { className: classId.replace(/\s+/g, '_') }
        ]
      },
      select: { id: true }
    })
    if (byName) {
      redirect(`/admin/classes/${byName.id}`)
    }
  }

  // 4. Fuzzy / Typo recovery for CUIDs (e.g. cmrekxidq... vs cmrekxidg...)
  if (!classInfo && classId && classId.length >= 20) {
    const prefix = classId.substring(0, 8)
    const suffix = classId.substring(classId.length - 10)
    const candidateClasses = await prisma.class.findMany({
      where: {
        OR: [
          { id: { startsWith: prefix } },
          { id: { endsWith: suffix } }
        ]
      },
      select: { id: true }
    })

    for (const cand of candidateClasses) {
      let diff = 0
      const len = Math.min(cand.id.length, classId.length)
      for (let i = 0; i < len; i++) {
        if (cand.id[i] !== classId[i]) diff++
      }
      diff += Math.abs(cand.id.length - classId.length)
      if (diff <= 2) {
        redirect(`/admin/classes/${cand.id}`)
      }
    }
  }

  // 5. Graceful Fallback if class is truly not found
  if (!classInfo) {
    const sampleClasses = await prisma.class.findMany({
      take: 6,
      orderBy: { className: 'asc' },
      select: { id: true, className: true, classCode: true, grade: true }
    })

    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8 px-4">
        <PageHeader
          title="Không tìm thấy lớp học"
          description={`Mã lớp hoặc định danh: "${classId}"`}
          breadcrumbs={[
            { label: "Cấu hình hệ thống" },
            { label: "Lớp học", href: "/admin/classes" },
            { label: "Không tìm thấy" }
          ]}
        />

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800">Lớp học không tồn tại hoặc đã được cập nhật</h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              Hệ thống không tìm thấy lớp học có định danh <code className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-xs">{classId}</code>. Đường dẫn có thể chứa ký tự chưa chuẩn hoặc lớp học đã được sắp xếp lại.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/admin/classes"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại Danh sách Lớp học
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all"
            >
              <Home className="w-4 h-4" /> Về Trang Quản Trị
            </Link>
          </div>

          {sampleClasses.length > 0 && (
            <div className="pt-6 border-t border-slate-100 text-left">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Các lớp học gợi ý:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sampleClasses.map(sc => (
                  <Link
                    key={sc.id}
                    href={`/admin/classes/${sc.id}`}
                    className="p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs font-medium text-slate-700 flex justify-between items-center group"
                  >
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      Lớp {sc.className}
                    </span>
                    <span className="text-slate-400 group-hover:text-blue-600 text-[11px]">{sc.classCode}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const activeSurveys = await prisma.surveyPeriod.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { endDate: 'asc' }
  });

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
      select: { studentCode: true, enrollmentCode: true, fullName: true, enrollmentClassId: true, admissionResult: true }
    }),
    prisma.preschoolInputAssessmentStudent.findMany({
      where: {
        OR: [
          { enrollmentClassId: classId },
          { studentCode: { in: studentCodes } },
          { enrollmentCode: { in: studentCodes } }
        ]
      },
      select: { studentCode: true, enrollmentCode: true, fullName: true, enrollmentClassId: true, admissionResult: true }
    }),
    prisma.studentCodeMapping.findMany({
      where: {
        databaseCode: { in: studentCodes }
      },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  const allCandidates = [...generalCandidates, ...preschoolCandidates];
  
  // Ánh xạ mã vnEdu xuyên suốt: ưu tiên năm học hiện tại, sau đó đến năm học gần nhất
  const vnEduMap = new Map<string, string>();
  const syncToCurrentYear: { databaseCode: string; markFileCode: string }[] = [];

  for (const sCode of studentCodes) {
    const studentMaps = codeMappings.filter(m => m.databaseCode === sCode);
    if (studentMaps.length > 0) {
      const currentYearMap = studentMaps.find(m => m.academicYearId === classInfo.academicYearId);
      if (currentYearMap) {
        vnEduMap.set(sCode, currentYearMap.markFileCode);
      } else {
        // Chưa có ở năm học hiện tại -> kế thừa mã từ năm học khác
        const latestMap = studentMaps[0];
        vnEduMap.set(sCode, latestMap.markFileCode);
        syncToCurrentYear.push({
          databaseCode: sCode,
          markFileCode: latestMap.markFileCode
        });
      }
    }
  }

  // Tự động đồng bộ các mapping được kế thừa vào năm học hiện tại
  if (syncToCurrentYear.length > 0) {
    Promise.all(
      syncToCurrentYear.map(item =>
        prisma.studentCodeMapping.upsert({
          where: {
            academicYearId_databaseCode: {
              academicYearId: classInfo.academicYearId,
              databaseCode: item.databaseCode
            }
          },
          update: { markFileCode: item.markFileCode },
          create: {
            academicYearId: classInfo.academicYearId,
            databaseCode: item.databaseCode,
            markFileCode: item.markFileCode
          }
        }).catch(() => {})
      )
    ).catch(() => {});
  }

  const studentsWithEnrollmentType = (classInfo.students || []).map(student => {
    const hasTransferIn = student.studentTransfers && student.studentTransfers.some((t: any) => t.type === 'IN');
    
    const matchedCandidate = allCandidates.find(c => 
      (c.studentCode && (c.studentCode === student.studentCode || c.enrollmentCode === student.studentCode)) ||
      (c.enrollmentClassId === classId && c.fullName && c.fullName.trim().toLowerCase() === student.studentName.trim().toLowerCase())
    );

    const isFromSurvey = hasTransferIn || !!matchedCandidate;
    const mappedVnEdu = vnEduMap.get(student.studentCode);
    const vnEduCode = mappedVnEdu || null;

    return {
      ...student,
      vnEduCode,
      enrollmentType: isFromSurvey ? "KS" : "Trực tiếp",
      isSurveyStudent: isFromSurvey,
      candidateAdmissionResult: matchedCandidate?.admissionResult || null
    };
  });

  // Sort students by Vietnamese alphabetical order (Tên -> Họ & đệm)
  const sortedStudents = sortVietnameseStudents(studentsWithEnrollmentType);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Lớp ${classInfo.className}`}
        description={`Cơ sở: ${classInfo.campus?.campusName || "N/A"} • Mã lớp: ${classInfo.classCode}`}
        breadcrumbs={[
          { label: "Cấu hình hệ thống" },
          { label: "Lớp học", href: "/admin/classes" },
          { label: `Lớp ${classInfo.className}` }
        ]}
      />

      <AdminClassStudentsClient classId={classId} initialStudents={sortedStudents} activeSurveys={activeSurveys} />
    </div>
  )
}
