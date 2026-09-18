import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { SurveyFormClient } from "./client"
import { CheckCircle2, ArrowLeft, Calendar, BookOpen, GraduationCap, School, UserCheck } from "lucide-react"
import Link from "next/link"

export default async function SurveyPage({ params, searchParams }: any) {
  const { id: periodId } = await params
  const { studentId } = await searchParams

  const session = await auth()
  if (!session?.user) return redirect("/login")
  if (!periodId || !studentId) return notFound()

  const period = await prisma.surveyPeriod.findUnique({ where: { id: periodId } })
  const student = await prisma.student.findUnique({ 
    where: { id: studentId }, 
    include: { 
      class: {
        include: {
          campus: true,
          teachers: {
            include: {
              teacher: true
            }
          }
        }
      } 
    } 
  })
  const parent = await prisma.parent.findUnique({ where: { userId: session.user.id as string } })

  if (!period || !student || !parent) return notFound()

  // Homeroom teacher (GVCN) lookup
  let gvcnName = "Chưa phân công"
  if (student.class) {
    if (student.class.homeroomTeacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { id: student.class.homeroomTeacherId },
            { teacherCode: student.class.homeroomTeacherId },
            { userId: student.class.homeroomTeacherId }
          ]
        },
        select: { teacherName: true }
      }).catch(() => null)
      if (teacher?.teacherName) gvcnName = teacher.teacherName
    }
    if (gvcnName === "Chưa phân công" && student.class.teachers && student.class.teachers.length > 0) {
      const hrAss = student.class.teachers.find((t: any) => t.roleInClass === 'HOMEROOM' || t.roleInClass === 'GVCN') || student.class.teachers[0]
      if (hrAss?.teacher?.teacherName) gvcnName = hrAss.teacher.teacherName
    }
  }

  const form = await prisma.surveyForm.findFirst({
    where: { parentId: parent.id, studentId: student.id, surveyPeriodId: period.id }
  })
  const isDone = form && (form.status === "SUBMITTED" || form.status === "COMPLETED")

  if (isDone) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 font-sans animate-in fade-in duration-300">
        <div className="bg-white p-10 sm:p-14 text-center rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col items-center max-w-lg w-full space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 shadow-inner border border-emerald-100">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Đã ghi nhận Phản hồi!</h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-md font-medium">
            Trân trọng cảm ơn Quý Phụ huynh đã dành thời gian hoàn thành phiếu khảo sát chất lượng dành cho học sinh <strong className="text-slate-800">{student.studentName}</strong>.
          </p>
          <div className="pt-4 w-full">
            <Link 
              href="/parent/surveys" 
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-[#003B3A] hover:bg-[#004D4A] text-white font-black text-xs rounded-2xl transition-all shadow-md active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> 
              <span>Trở về Danh sách Khảo sát</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const questions = await prisma.surveyQuestion.findMany({
    where: { isActive: true },
    orderBy: [{ sectionId: "asc" }, { sortOrder: "asc" }]
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8 font-sans">
      {/* Header Back Link */}
      <div>
        <Link 
          href="/parent/surveys" 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#003B3A] transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200/80 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Danh sách Khảo sát</span>
        </Link>
      </div>

      {/* Header Info Card */}
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#48BFE3]" />

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-black text-[#003B3A] bg-teal-50 px-3.5 py-1 rounded-full border border-teal-100 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-[#003B3A]" />
            <span>{period.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            Phiếu Khảo Sát Đóng Góp Ý Kiến Phụ Huynh
          </h1>
        </div>

        {/* 3-Column Info Box: Con em, Lớp, GVCN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#003B3A]" />
              <span>Học sinh</span>
            </span>
            <p className="font-extrabold text-slate-900 text-sm line-clamp-1">{student.studentName}</p>
            <p className="text-[11px] font-mono text-slate-400">{student.studentCode}</p>
          </div>

          <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-3">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-sky-600" />
              <span>Lớp & Cơ sở</span>
            </span>
            <p className="font-extrabold text-slate-800 text-sm line-clamp-1">{student.class?.className || "N/A"}</p>
            <p className="text-[11px] text-slate-500 line-clamp-1">{student.class?.campus?.campusName || "Skyline"}</p>
          </div>

          <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-3">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>GVCN Chủ nhiệm</span>
            </span>
            <p className="font-extrabold text-[#003B3A] text-sm line-clamp-1">{gvcnName}</p>
            <p className="text-[11px] text-slate-400">Đồng hành lớp học</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 pt-1 border-t border-slate-100">
          <Calendar className="w-4 h-4 text-amber-500" />
          <span>Hạn nộp phản hồi: <strong className="text-slate-800">{new Date(period.endDate).toLocaleDateString("vi-VN")}</strong></span>
        </div>
      </div>

      {/* Survey form */}
      <SurveyFormClient periodId={period.id} student={student} questions={questions} />
    </div>
  )
}
