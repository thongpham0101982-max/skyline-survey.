import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { ClipboardList, CheckCircle2, Clock } from "lucide-react"

async function getParentSurveys(userId: string) {
  const parent = await prisma.parent.findUnique({
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

  if (!parent) return { parent: null, surveyTasks: [] }

  // Get active survey periods
  const activePeriods = await prisma.surveyPeriod.findMany({
    where: { isActive: true },
    orderBy: { endDate: 'asc' }
  })

  // Get existing forms for this parent
  const existingForms = await prisma.surveyForm.findMany({
    where: { parentId: parent.id }
  })

  // Build a list of survey assignments (Pending or Completed)
  const surveyTasks = []
  
  for (const studentLink of parent.students) {
    const student = studentLink.student
    for (const period of activePeriods) {
      const existingForm = existingForms.find(
        f => f.studentId === student.id && f.surveyPeriodId === period.id
      )
      
      surveyTasks.push({
        student,
        period,
        form: existingForm || null,
        status: existingForm?.status === "SUBMITTED" ? "COMPLETED" : "PENDING"
      })
    }
  }

  return { parent, surveyTasks }
}

export default async function ParentSurveysPage() {
  const session = await auth()
  const userId = (session?.user as any)?.id || ''
  const { parent, surveyTasks } = await getParentSurveys(userId)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Surveys</h1>
      <p className="text-slate-500">Please complete the feedback surveys for your children.</p>
      
      {(surveyTasks ?? []).length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center border border-slate-100 flex items-center justify-center flex-col">
          <ClipboardList className="h-10 w-10 text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">No active surveys require your attention at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(surveyTasks ?? []).map((task: any, idx: number) => {
            const isCompleted = task.status === "COMPLETED";
            return (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className="p-6 flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-xl text-slate-900 mb-1">{task.period.name}</h3>
                      <p className="text-sm font-medium text-slate-600">Student: <span className="font-bold text-slate-800">{task.student.studentName}</span></p>
                      <p className="text-sm text-slate-500">Class: {task.student.class?.className || 'N/A'}</p>
                    </div>
                    {isCompleted ? (
                      <span className="flex items-center bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                      </span>
                    ) : (
                      <span className="flex items-center bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200">
                        <Clock className="w-3 h-3 mr-1" /> Pending
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-slate-500 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p>Deadline: <span className="font-medium text-slate-700">{new Date(task.period.endDate).toLocaleDateString()}</span></p>
                  </div>
                </div>
                
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
                  {isCompleted ? (
                    <button disabled className="text-sm font-medium text-slate-400 cursor-not-allowed">
                      Submitted on {task.form?.submissionDateTime ? new Date(task.form.submissionDateTime).toLocaleDateString() : 'N/A'}
                    </button>
                  ) : (
                    <Link 
                      href={`/parent/surveys/${task.period.id}?studentId=${task.student.id}`} 
                      className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-colors"
                    >
                      Start Survey
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
