import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AdminClassStudentsClient } from "./client"
import { sortVietnameseStudents } from "@/lib/vietnameseSort"

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
          surveyForms: true
        }
      }
    }
  })

  if (!classInfo) return notFound()

  // Sort students by Vietnamese alphabetical order (Tên -> Họ & đệm)
  const sortedStudents = sortVietnameseStudents(classInfo.students || []);

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
