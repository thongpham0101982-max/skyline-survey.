import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { FileText, Calendar, Users } from "lucide-react"
import { SurveyTabs } from "@/components/SurveyTabs"
import { getDefaultAcademicYear } from "@/lib/academicYear"

export default async function TeacherSurveysPage() {
  const session = await auth()
  const userId = session?.user?.id
  
  if (!userId) return notFound()

  const teacher = await prisma.teacher.findUnique({ where: { userId } })
  if (!teacher) return notFound()

  const activeYear = await getDefaultAcademicYear();
  const activeYearId = activeYear?.id || "";

  const classes = await prisma.class.findMany({
    where: {
      OR: [
        { homeroomTeacherId: teacher.id },
        { homeroomTeacherId: { contains: teacher.id } },
        { teachers: { some: { teacherId: teacher.id } } }
      ],
      academicYearId: activeYearId
    },
    select: { id: true }
  })
  
  const classIds = classes.map(c => c.id)

  const surveys = await prisma.surveyPeriod.findMany({
    where: {
      surveyForms: { some: { classId: { in: classIds } } }
    },
    include: {
      academicYear: true,
      surveyForms: {
        where: { classId: { in: classIds } }
      }
    },
    orderBy: { startDate: 'desc' }
  })

  // Thống kê học sinh khảo sát theo khối trong năm học active
  const studentForms = await prisma.surveyForm.findMany({
    where: {
      classId: { in: classIds },
      academicYearId: activeYearId
    },
    select: {
      studentId: true,
      class: {
        select: {
          grade: true
        }
      }
    }
  })

  const uniqueStudentsMap = new Map();
  studentForms.forEach(f => {
    uniqueStudentsMap.set(f.studentId, f.class.grade || "Khác");
  });

  const gradeCounts = {};
  uniqueStudentsMap.forEach((grade) => {
    const displayGrade = grade ? `Khối ${grade}` : "Khác";
    gradeCounts[displayGrade] = (gradeCounts[displayGrade] || 0) + 1;
  });

  const totalStudents = uniqueStudentsMap.size;
  const sortedGrades = Object.entries(gradeCounts).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Quản lý Khảo sát</h1>
        <p className="text-slate-500 mt-1">Các đợt khảo sát thuộc năm học mặc định: <span className="font-bold text-[#00A99D]">{activeYear?.name || 'N/A'}</span></p>
      </div>
      
      <SurveyTabs activeTab="surveys" role="TEACHER" />

      {/* Thống kê số học sinh khảo sát theo khối */}
      <div className="bg-white border-2 border-teal-100 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-50 text-[#00A99D] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Thống kê Học sinh Khảo sát trong năm</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tổng số học sinh được phân công khảo sát: <span className="font-black text-[#00A99D] text-sm">${totalStudents}</span> học sinh</p>
          </div>
        </div>
        
        {sortedGrades.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {sortedGrades.map(([grade, count]) => (
              <span key={grade} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-teal-50 text-[#00A99D] border border-teal-100 hover:bg-[#00A99D]/5 transition-colors">
                ${grade}: <span className="text-slate-800 font-extrabold">${count} HS</span>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-medium italic pt-2 border-t border-slate-100">
            Chưa có thông tin phân khối học sinh khảo sát.
          </div>
        )}
      </div>
      
      <div className="grid gap-4 mt-8">
        {surveys.length === 0 ? (
          <div className="p-12 text-center text-xs font-semibold">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Chưa có dữ liệu khảo sát</h3>
            <p className="text-slate-500 mt-1">Hiện tại không có đợt khảo sát nào được giao cho các lớp bạn phụ trách.</p>
          </div>
        ) : (
          surveys.map(survey => {
            const totalForms = survey.surveyForms.length;
            const submittedForms = survey.surveyForms.filter(f => f.status === 'SUBMITTED' || f.status === 'ĐÃ HOÀN THÀNH').length;
            const completionRate = totalForms > 0 ? Math.round((submittedForms / totalForms) * 100) : 0;
            const isActive = survey.isActive;

            return (
              <div key={survey.id} className="bg-white rounded-xl shadow-sm border-2 border-teal-100 overflow-hidden hover:shadow-md transition-shadow group">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 group-hover:text-[#00A99D] transition-colors">
                          {survey.name}
                        </h2>
                        {isActive ? (
                          <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide border border-green-200">ĐANG MỞ</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide border border-slate-200">ĐÃ ĐÓNG</span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mt-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {new Date(survey.startDate).toLocaleDateString('vi-VN')} - {new Date(survey.endDate).toLocaleDateString('vi-VN')}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          Đối tượng: {survey.targetAudience === 'HS' ? 'Học sinh' : 'Phụ huynh'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8 p-4 text-xs font-semibold">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">{submittedForms} <span className="text-base font-normal text-slate-500">/ {totalForms}</span></div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Đã nộp</div>
                      </div>
                      <div className="w-px h-12 bg-slate-200"></div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-[#00A99D]">{completionRate}%</div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Tỷ lệ nộp</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end text-xs font-semibold">
                  <Link href="/teacher/classes" className="text-sm font-bold text-[#00A99D] hover:text-[#009085] flex items-center gap-1">
                    Xem chi tiết tại danh sách lớp &rarr;
                  </Link>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
