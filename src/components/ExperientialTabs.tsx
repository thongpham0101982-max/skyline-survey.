"use client"
import Link from 'next/link'
import { Layers, ClipboardList, Settings, Award } from 'lucide-react'

interface ExperientialTabsProps {
  activeTab: 'catalog' | 'categories' | 'config' | 'reports'
}

export function ExperientialTabs({ activeTab }: ExperientialTabsProps) {
  const tabs = [
    { id: 'categories', label: 'Danh mục', href: '/admin/experiential-activities/categories', icon: Layers },
    { id: 'catalog', label: 'Hoạt động mẫu', href: '/admin/experiential-activities/catalog', icon: Award },
    { id: 'config', label: 'Cấu hình', href: '/admin/experiential-activities/config', icon: Settings },
    { id: 'reports', label: 'Thống kê', href: '/admin/experiential-activities/reports', icon: ClipboardList }
  ]

  return (
    <div className="space-y-4 mb-6 no-print">
      <div className="bg-white border border-slate-200/60 shadow-2xs rounded-xl px-1.5 py-1.5">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={"flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all duration-200 border " + (
                  isActive
                    ? 'bg-[#00A99D] text-white border-[#00A99D] shadow-xs'
                    : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-800'
                )}
              >
                <Icon className={"w-3.5 h-3.5 " + (isActive ? 'text-white' : 'text-slate-400')} />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
