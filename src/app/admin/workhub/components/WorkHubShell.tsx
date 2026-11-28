"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react"
import type { WorkHubActorScope } from "@/lib/workhub/types"

interface WorkHubShellProps {
  actor: WorkHubActorScope
  children: React.ReactNode
}

const ROLE_TIER_LABELS: Record<WorkHubActorScope["roleTier"], string> = {
  INDIVIDUAL: "Chuyên viên Ban KT&ĐBCL",
  DEPARTMENT_HEAD: "Quản lý Nhóm / Tổ KT&ĐBCL",
  CAMPUS_HEAD: "Lãnh đạo phụ trách",
  EXECUTIVE: "Giám đốc Ban / Quản trị hệ thống",
}

export function WorkHubShell({ actor, children }: WorkHubShellProps) {
  const pathname = usePathname() || ""

  // 4 trụ cột nghiệp vụ hợp nhất trong QA Workspace • KT&ĐBCL
  const navItems = [
    {
      href: "/admin/workhub",
      label: "Tổng quan tiến độ & KPI",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/admin/tasks",
      label: "Điều hành & giao việc",
      icon: ClipboardList,
    },
    {
      href: "/admin/weekly-reports",
      label: "Báo cáo tuần & tháng",
      icon: FileSpreadsheet,
    },
    {
      href: "/admin/workhub/kpis",
      label: "Chỉ tiêu & đánh giá KPI",
      icon: BarChart3,
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-3 sm:p-5 space-y-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="border-l-4 border-[#003B3A] pl-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-[#003B3A]">
                QA Workspace • KT&amp;ĐBCL — Quản lý công việc
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                {ROLE_TIER_LABELS[actor.roleTier]}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {actor.userName} • Không gian điều hành công việc, báo cáo tiến độ nhóm/cá nhân &amp; KPI chuyên biệt Ban KT&amp;ĐBCL
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
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
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
