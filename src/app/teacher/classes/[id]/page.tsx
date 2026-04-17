import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { Users, Info, TrendingUp, ThumbsUp } from "lucide-react"

export default async function TeacherClassDetailPage({ params }: any) {
  const { id: classId } = await params
  
  const classInfo = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      campus: true,
      academicYear: true,
      students: {
        include: {
          parents: true
        }
      }
    }
  })

  if (!classInfo) return notFound()

  // Calculate metrics
  const totalStudents = classInfo.students.length
  
  const forms = await prisma.surveyForm.findMany({
    where: { classId }
  })
  
  const submittedForms = forms.filter(f => f.status === "SUBMITTED")
  
  // Total parents is sum of all parent links for students in this class
  const totalParents = classInfo.students.reduce((acc, s) => acc + s.parents.length, 0)
  const completionRate = totalParents > 0 ? (submittedForms.length / totalParents) * 100 : 0
  
  const npsScores = submittedForms.map(f => f.npsScoreRaw).filter(s => s !== null) as number[]
  const promoters = npsScores.filter(s => s >= 9).length
  const detractors = npsScores.filter(s => s <= 6).length
  const nps = npsScores.length > 0 ? Math.round(((promoters - detractors) / npsScores.length) * 100) : 0

  const avgScores = submittedForms.map(f => f.overallAverageScore).filter(s => s !== null) as number[]
  const averageSatisfaction = avgScores.length > 0 ? (avgScores.reduce((a,b) => a+b, 0) / avgScores.length) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{classInfo.className}</h1>
          <p className="text-slate-500 mt-1">Class Code: {classInfo.classCode} • {classInfo.campus?.campusName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="text-sm font-medium text-slate-500 mb-2">Total Students</h3>
           <div className="text-3xl font-bold text-slate-900">{totalStudents}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="text-sm font-medium text-slate-500 mb-2">Survey Completion</h3>
           <div className="text-3xl font-bold text-slate-900">{completionRate > 100 ? 100 : completionRate.toFixed(1)}%</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="text-sm font-medium text-slate-500 mb-2">Avg Satisfaction</h3>
           <div className="text-3xl font-bold text-slate-900">{averageSatisfaction.toFixed(1)} / 5.0</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="text-sm font-medium text-slate-500 mb-2">Net Promoter Score</h3>
           <div className="text-3xl font-bold text-slate-900">{nps}</div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col mt-8">
        <h3 className="text-xl font-bold mb-4">Student Survey Status</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-tl-lg">Student Code</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Parents Linked</th>
                <th className="px-4 py-3 font-semibold rounded-tr-lg">Survey Status</th>
              </tr>
            </thead>
            <tbody>
              {classInfo.students.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-500">No students found.</td></tr>
              ) : (
                classInfo.students.map((student) => {
                  const studentForms = forms.filter(f => f.studentId === student.id)
                  const hasSubmitted = studentForms.some(f => f.status === "SUBMITTED")
                  
                  return (
                    <tr key={student.id} className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-medium text-slate-900">{student.studentCode}</td>
                      <td className="px-4 py-4 font-medium text-slate-700">{student.studentName}</td>
                      <td className="px-4 py-4">{student.parents.length}</td>
                      <td className="px-4 py-4">
                        {hasSubmitted ? (
                          <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide">SUBMITTED</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide">PENDING</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}