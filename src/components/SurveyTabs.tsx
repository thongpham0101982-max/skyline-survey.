"use client"
import Link from 'next/link'
import { FileSpreadsheet, Layers, BarChart3, PieChart, ClipboardCheck } from 'lucide-react'

interface SurveyTabsProps {
  activeTab: 'surveys' | 'categories' | 'results' | 'nps' | 'reports'
}

export function SurveyTabs({ activeTab }: SurveyTabsProps) {
  const tabs = [
    { id: 'surveys', label: 'Quản lý Khảo sát', href: '/admin/surveys', icon: FileSpreadsheet },
    { id: 'categories', label: 'Danh mục Khảo sát', href: '/admin/categories', icon: Layers },
    { id: 'results', label: 'Kết quả KS', href: '/admin/surveys/results', icon: ClipboardCheck },
    { id: 'nps', label: 'Phân tích NPS', href: '/admin/nps', icon: PieChart },
    { id: 'reports', label: 'Theo dõi Phản hồi', href: '/admin/reports', icon: BarChart3 }
  ]

  return (
    <div className="bg-white border border-[#00A19A]/20 shadow-xs rounded-xl px-1.5 py-1.5 mb-6 no-print">
      <div className="flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition-all duration-200 border ${
                isActive
                  ? 'bg-[#00A19A] text-white border-[#00A19A] shadow-xs'
                  : 'text-slate-600 border-transparent hover:bg-[#00A19A]/5 hover:text-[#00A19A]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
