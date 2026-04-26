import { getAdminMetrics } from "@/services/dashboard"
import { KPICard } from "@/components/KPICard"
import { WelcomeAlert } from "@/components/WelcomeAlert"
import { getAdminSession } from "@/lib/session"

export default async function AdminDashboard() {
  const session = await getAdminSession()
  const userName = (session as any)?.name || "Thành viên"
  
  // Use campus scoping for metrics
  const metrics = await getAdminMetrics(session.allowedCampusIds).catch(() => ({ 
    totalStudents: 0, 
    surveyedStudents: 0, 
    notSurveyedStudents: 0, 
    completionRate: 0, 
    systemAverageSatisfactionScore: 0, 
    systemNps: 0
  }))

  return (
    <div className="space-y-8">
      <WelcomeAlert name={userName} />
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
        {session.allowedCampusIds.length > 0 && (
          <span className="text-xs font-black bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase tracking-widest">
            Phạm vi: {session.allowedCampusIds.length} cơ sở
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Students" value={metrics.totalStudents.toLocaleString()} />
        <KPICard title="Completion Rate" value={`${metrics.completionRate.toFixed(1)}%`} />
        <KPICard title="System NPS" value={metrics.systemNps.toFixed(1)} />
        <KPICard title="Avg Satisfaction" value={metrics.systemAverageSatisfactionScore.toFixed(1)} />
      </div>
    </div>
  )
}
