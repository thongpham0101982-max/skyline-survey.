import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { FileText, Calendar, Users } from "lucide-react"

export default async function TeacherSurveysPage() {
  const session = await auth()
  const userId = session?.user?.id
  
  if (!userId) return notFound()

  const teacher = await prisma.teacher.findUnique({ where: { userId } })
  if (!teacher) return notFound()

  const classes = await prisma.class.findMany({
    where: {
      OR: [
        { homeroomTeacherId: teacher.id },
        { teachers: { some: { teacherId: teacher.id } } }
      ]
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Quản lý Khảo sát</h1>
        <p className="text-slate-500 mt-1">Các đợt khảo sát đang diễn ra hoặc đã hoàn thành liên quan đến lớp học của bạn.</p>
      </div>
      
      <div className="grid gap-4 mt-8">
        {surveys.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
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
              <div key={survey.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
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
                    
                    <div className="flex items-center gap-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">{submittedForms} <span className="text-base font-normal text-slate-500">/ {totalForms}</span></div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Đã nộp</div>
                      </div>
                      <div className="w-px h-12 bg-slate-200"></div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">{completionRate}%</div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Tỷ lệ nộp</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end">
                  <Link href="/teacher/classes" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
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
