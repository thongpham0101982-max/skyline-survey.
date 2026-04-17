import { getParentChildren } from "@/services/dashboard"
import { auth } from "@/lib/auth"
import { getActiveSurveyPeriod } from "@/services/survey"
import Link from "next/link"
export default async function ParentDashboard() {
  const session = await auth()
  const children = await getParentChildren((session?.user as any)?.id || '').catch(() => ([]))
  const surveyPeriod = await getActiveSurveyPeriod().catch(() => null)
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Parent Dashboard</h1>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold mb-4">My Children</h2>
        <div className="space-y-4">
          {children.length === 0 ? (
            <p className="text-slate-500">No linked children found.</p>
          ) : (
            children.map((child: any) => (
              <div key={child.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <p className="font-bold">{child.studentName}</p>
                  <p className="text-sm text-slate-500">{child.studentCode}</p>
                </div>
                {surveyPeriod && (
                  <Link href={`/parent/surveys/${(surveyPeriod as any).id}?studentId=${child.id}`} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Take Survey
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}