import { Sidebar } from "@/components/Sidebar"
import { NotificationBell } from "@/components/NotificationBell"
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen bg-slate-50"><Sidebar role="TEACHER" /><main className="flex-1 p-8 relative">
<NotificationBell />{children}</main></div>
}