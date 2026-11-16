"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UserCheck,
} from "lucide-react"
import type { WorkHubActorScope } from "@/lib/workhub/types"

interface WorkHubShellProps {
  actor: WorkHubActorScope
  children: React.ReactNode
}

const ROLE_TIER_LABELS: Record<WorkHubActorScope["roleTier"], string> = {
  INDIVIDUAL: "Cá nhân thực hiện",
  DEPARTMENT_HEAD: "Trưởng bộ phận / Tổ chuyên môn",
  CAMPUS_HEAD: "Ban Giám hiệu / Giám đốc Cơ sở",
  EXECUTIVE: "Ban điều hành / Quản trị hệ thống",
}

export function WorkHubShell({ actor, children }: WorkHubShellProps) {
  const pathname = usePathname() || ""

  const navItems = [
    {
      href: "/admin/workhub",
      label: "Tổng quan",
      icon: LayoutDashboard,
      visible: true,
      exact: true,
    },
    {
      href: "/admin/workhub/my-tasks",
      label: "Công việc của tôi",
      icon: ClipboardList,
      visible: true,
    },
    {
      href: "/admin/workhub/assigned-tasks",
      label: "Công việc đã giao",
      icon: UserCheck,
      visible: actor.canAssignTasks,
    },
    {
      href: "/admin/workhub/plans",
      label: "Kế hoạch công tác",
      icon: Calendar,
      visible: true,
    },
    {
      href: "/admin/workhub/reports",
      label: "Báo cáo tuần/tháng",
      icon: FileText,
      visible: true,
    },
    {
      href: "/admin/workhub/kpis",
      label: "Chỉ tiêu và KPI",
      icon: BarChart3,
      visible: true,
    },
    {
      href: "/admin/workhub/org-tracking",
      label: "Theo dõi phòng ban/cơ sở",
      icon: Building2,
      visible: actor.canViewOrgTracking,
    },
    {
      href: "/admin/workhub/settings",
      label: "Cấu hình",
      icon: Settings,
      visible: actor.canManageSettings || actor.canManageKpiDefinitions,
    },
  ].filter((item) => item.visible)

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-3 sm:p-5 space-y-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="border-l-4 border-[#003B3A] pl-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-[#003B3A]">
                WorkHub • Quản lý công việc, báo cáo & KPI
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                {ROLE_TIER_LABELS[actor.roleTier]}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {actor.userName}
              {actor.primaryDepartmentName ? ` • ${actor.primaryDepartmentName}` : ""}
              {actor.primaryCampusName ? ` • ${actor.primaryCampusName}` : ""}
            </p>
          </div>
        </div>

        <nav className="mt-4 pt-3.5 border-t border-[#F1F5F9] flex items-center gap-1.5 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] hover:border-[#00A19A] hover:text-[#003B3A]"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div>{children}</div>
    </div>
  )
}
