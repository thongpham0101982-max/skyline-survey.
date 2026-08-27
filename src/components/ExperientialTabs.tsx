"use client"
import Link from 'next/link'
import { Layers, ClipboardList, Settings, Award, Activity, BarChart3 } from 'lucide-react'

interface ExperientialTabsProps {
  activeTab: 'activities' | 'catalog' | 'categories' | 'config' | 'reports'
}

export function ExperientialTabs({ activeTab }: ExperientialTabsProps) {
  const tabs = [
    { id: 'activities', label: 'Quản lý Hoạt động & Đánh giá', href: '/teacher/experiential-activities', icon: Activity },
    { id: 'reports', label: 'Dashboard & Thống kê', href: '/admin/experiential-activities/reports', icon: BarChart3 },
    { id: 'categories', label: 'Danh mđược', href: '/admin/experiential-activities/categories', icon: Layers },
    { id: 'catalog', label: 'Hoạt động mẫu', href: '/admin/experiential-activities/catalog', icon: Award },
    { id: 'config', label: 'Cấu hình tiêu chí', href: '/admin/experiential-activities/config', icon: Settings }
  ]

  return (
    <div className="space-y-4 mb-6 no-print font-sans">
      <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-1.5 backdrop-blur-md">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={"flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-200 border " + (
                  isActive
                    ? 'bg-gradient-to-r from-[#003B3A] via-[#00A99D] to-[#48BFE3] text-white border-transparent shadow-md shadow-[#00A99D]/20'
                    : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className={"w-4 h-4 " + (isActive ? 'text-white' : 'text-slate-400')} />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
