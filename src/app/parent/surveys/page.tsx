export const dynamic = "force-dynamic"
export const revalidate = 0

import { getDefaultAcademicYear } from "@/lib/academicYear"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { ClipboardList, CheckCircle2, Clock, Calendar, ArrowRight, Sparkles, UserCheck } from "lucide-react"

async function getParentSurveys(userId: string) {
  if (!userId) return { parent: null, surveyTasks: [], defaultYear: null }

  let parent = null
  try {
    parent = await prisma.parent.findUnique({
      where: { userId },
      include: {
        students: {
          include: {
            student: {
              include: {
                class: true,
                campus: true
              }
            }
          }
        }
      }
    })
  } catch (e) {
    console.error("Error loading parent surveys profile:", e)
  }

  if (!parent) return { parent: null, surveyTasks: [], defaultYear: null }

  let defaultYear = null
  try {
    defaultYear = await getDefaultAcademicYear(prisma)
  } catch (e) {
    console.error("Error loading default academic year:", e)
  }

  let activePeriods: any[] = []
  try {
    activePeriods = await prisma.surveyPeriod.findMany({
      where: { 
        status: "ACTIVE",
        targetAudience: "PHHS",
        ...(defaultYear ? { academicYearId: defaultYear.id } : {})
      },
      orderBy: { endDate: 'asc' }
    })
  } catch (e) {
    console.error("Error loading active survey periods:", e)
  }

  let existingForms: any[] = []
  try {
    existingForms = await prisma.surveyForm.findMany({
      where: { parentId: parent.id }
    })
  } catch (e) {
    console.error("Error loading existing survey forms:", e)
  }

  const surveyTasks = []
  
  for (const studentLink of (parent.students || [])) {
    const student = studentLink?.student
    if (!student) continue

    if (defaultYear && student.academicYearId !== defaultYear.id && student.class?.academicYearId !== defaultYear.id) {
      continue
    }
    for (const period of activePeriods) {
      const existingForm = existingForms.find(
        f => f.studentId === student.id && f.surveyPeriodId === period.id
      )
      
      surveyTasks.push({
        student,
        period,
        form: existingForm || null,
        status: (existingForm?.status === "SUBMITTED" || existingForm?.status === "COMPLETED") ? "COMPLETED" : "PENDING"
      })
    }
  }

  return { parent, surveyTasks, defaultYear }
}

export default async function ParentSurveysPage() {
  const session = await auth()
  const userId = (session?.user as any)?.id || ''
  const { parent, surveyTasks, defaultYear } = await getParentSurveys(userId)

  const pendingTasks = surveyTasks.filter(t => t.status === "PENDING")
  const completedTasks = surveyTasks.filter(t => t.status === "COMPLETED")

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 font-sans">
      {/* Banner Top */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 p-8 text-white shadow-xl">
        <div className="relative z-10 space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 uppercase tracking-wider text-amber-100 border border-white/20">
            PARENT PORTAL — KHẢO SÁT ĐỊNH KỲ
          </span>
          <h1 className="text-3xl font-black tracking-tight">Khảo Sát Đóng Góp Ý Kiến Phụ Huynh</h1>
          <p className="text-xs sm:text-sm text-amber-50 font-medium">
            Ý kiến đóng góp quý báu của Quý Phụ huynh là cơ sở để Skyline nâng cao chất lượng dạy học & dịch vụ trường học ({defaultYear?.name || 'Năm học hiện tại'}).
          </p>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng đợt khảo sát</p>
            <p className="text-2xl font-black text-slate-800">{surveyTasks.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Cần thực hiện</p>
            <p className="text-2xl font-black text-amber-600">{pendingTasks.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Đã hoàn thành</p>
            <p className="text-2xl font-black text-emerald-600">{completedTasks.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-amber-500" />
          <span>Danh sách phiếu khảo sát dành cho Phụ huynh</span>
        </h2>

        {surveyTasks.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <ClipboardList className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Không có đợt khảo sát nào</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hiện tại nhà trường chưa mở đợt khảo sát mới dành cho Phụ huynh trong học kỳ này.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {surveyTasks.map((task: any, idx: number) => {
              const isCompleted = task.status === "COMPLETED"
              const endDateStr = new Date(task.period.endDate).toLocaleDateString('vi-VN')

              return (
                <div 
                  key={idx}
                  className={"bg-white rounded-3xl border p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden " + (
                    isCompleted ? "border-slate-200 bg-slate-50/50" : "border-amber-200 ring-1 ring-amber-100"
                  )}
                >
                  <div>
                    {/* Header Item */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={"px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 inline-block " + (
                          isCompleted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800 animate-pulse"
                        )}>
                          {isCompleted ? "✓ Đã hoàn thành" : "⚡ Đang mở khảo sát"}
                        </span>
                        <h3 className="text-lg font-black text-slate-900 leading-snug">
                          {task.period.name}
                        </h3>
                      </div>
                    </div>

                    {/* Student Info */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 mb-4 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-700 font-bold">
                        <span>Học sinh:</span>
                        <span className="text-[#48BFE3] font-extrabold">{task.student?.studentName || 'Học sinh'}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 font-semibold">
                        <span>Lớp & Cơ sở:</span>
                        <span>{task.student?.class?.className || 'N/A'} • {task.student?.class?.campus?.campusName || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Deadline */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      <span>Hạn chót gửi phản hồi: <strong className="text-slate-800">{endDateStr}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    {isCompleted ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Đã nộp bài khảo sát</span>
                      </span>
                    ) : (
                      <Link
                        href={`/parent/surveys/${task.period.id}?studentId=${task.student?.id}`}
                        className="w-full py-3 rounded-2xl bg-amber-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-amber-600 transition-all shadow-md shadow-amber-200"
                      >
                        <span>Thực hiện khảo sát ngay</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
