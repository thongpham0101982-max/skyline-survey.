import { auth } from "@/lib/auth"
import { getParentChildren } from "@/services/dashboard"
import { getActiveSurveyPeriod } from "@/services/survey"
import Link from 'next/link'

export default async function ChildrenPage() {
  const session = await auth()
  if (!session) return null
  
  const children = await getParentChildren(session.user.id)
  const activePeriod = await getActiveSurveyPeriod()

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <h1 className="text-3xl font-bold">My Children</h1>
      
      <div className="grid gap-6">
        {children.map(child => (
          <div key={child.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold">{child.studentName}</h2>
            <p className="text-slate-500 mt-1">Class: {child.class.className}</p>
            <p className="text-slate-500">Campus: {child.campus.campusName}</p>
            
            {activePeriod && (
              <div className="mt-4 pt-4 border-t">
                <p className="mb-3 text-sm font-medium text-slate-800">Active Survey: {activePeriod.name}</p>
                <Link 
                  href={`/parent/surveys/${activePeriod.id}/${child.id}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium inline-block text-sm transition-colors"
                >
                  Take Survey
                </Link>
              </div>
            )}
          </div>
        ))}
        {children.length === 0 && <p className="text-slate-500">No children linked to your account.</p>}
      </div>
    </div>
  )
}