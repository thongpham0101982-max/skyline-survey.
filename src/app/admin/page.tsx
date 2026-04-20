import { getAdminMetrics } from "@/services/dashboard"
import { KPICard } from "@/components/KPICard"
import { WelcomeAlert } from "@/components/WelcomeAlert"
import { auth } from "@/lib/auth"

export default async function AdminDashboard() {
  const session = await auth()
  const userName = session?.user?.name || "Thành viên"
  
  const metrics = await getAdminMetrics().catch(() => ({ 
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
