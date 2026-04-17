import { Sidebar } from "@/components/Sidebar"
import { NotificationBell } from "@/components/NotificationBell"
export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen bg-slate-50"><Sidebar role="PARENT" /><main className="flex-1 p-8 relative">
<NotificationBell />{children}</main></div>
}