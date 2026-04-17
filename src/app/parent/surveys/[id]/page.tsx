import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { SurveyFormClient } from "./client"
import { CheckCircle2, ArrowLeft, Calendar, BookOpen } from "lucide-react"
import Link from "next/link"

export default async function SurveyPage({ params, searchParams }: any) {
  const { id: periodId } = await params
  const { studentId } = await searchParams

  const session = await auth()
  if (!session?.user) return redirect("/login")
  if (!periodId || !studentId) return notFound()

  const period = await prisma.surveyPeriod.findUnique({ where: { id: periodId } })
  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { class: true } })
  const parent = await prisma.parent.findUnique({ where: { userId: session.user.id as string } })

  if (!period || !student || !parent) return notFound()

  const form = await prisma.surveyForm.findFirst({
    where: { parentId: parent.id, studentId: student.id, surveyPeriodId: period.id }
  })
  const isDone = form && (form.status === "SUBMITTED" || form.status === "COMPLETED")

  if (isDone) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="bg-white p-12 text-center rounded-3xl shadow-xl shadow-emerald-100/50 border border-emerald-100 flex flex-col items-center max-w-lg w-full">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <CheckCircle2 className="w-12 h-12" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-3">Da ghi nhan Phan hoi!</h1>
          <p className="text-slate-500 text-base mb-8 max-w-sm leading-relaxed">
            Cam on Quy Phu huynh da tham gia danh gia chat luong cho hoc sinh <strong className="text-slate-800">{student.studentName}</strong>.
          </p>
          <Link href="/parent/surveys" className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30">
            <ArrowLeft className="w-5 h-5" /> Ve Man hinh chinh
          </Link>
        </div>
      </div>
    )
  }

  const questions = await prisma.surveyQuestion.findMany({
    where: { isActive: true },
    orderBy: [{ sectionId: "asc" }, { sortOrder: "asc" }]
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <Link href="/parent/surveys" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-600 transition-colors font-medium mb-2">
          <ArrowLeft className="w-4 h-4" />Quay lai
        </Link>
        <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5" />{period.name}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
          Phieu Khao sat Chat luong
        </h1>
        <p className="text-slate-500 text-sm sm:text-base">
          Hoc sinh: <span className="font-bold text-slate-800">{student.studentName}</span>
          {student.class && <> &bull; Lop <span className="font-bold text-slate-800">{student.class.className}</span></>}
        </p>
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
          <Calendar className="w-3.5 h-3.5" />
          Han: {new Date(period.endDate).toLocaleDateString("vi-VN")}
        </div>
      </div>

      {/* Survey form */}
      <SurveyFormClient periodId={period.id} student={student} questions={questions} />
    </div>
  )
}