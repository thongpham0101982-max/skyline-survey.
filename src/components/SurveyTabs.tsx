"use client"
import Link from 'next/link'
import { FileSpreadsheet, Layers, BarChart3, PieChart, ClipboardCheck, MessageSquare } from 'lucide-react'

interface SurveyTabsProps {
  activeTab: 'surveys' | 'categories' | 'results' | 'nps' | 'reports' | 'feedback'
  role?: 'ADMIN' | 'TEACHER'
}

export function SurveyTabs({ activeTab, role = 'ADMIN' }: SurveyTabsProps) {
  const adminTabs = [
    { id: 'surveys', label: 'Quản lý Khảo sát', href: '/admin/surveys', icon: FileSpreadsheet },
    { id: 'categories', label: 'Danh mục Khảo sát', href: '/admin/categories', icon: Layers },
    { id: 'results', label: 'Kết quả KS', href: '/admin/surveys/results', icon: ClipboardCheck },
    { id: 'reports', label: 'Thống kê', href: '/admin/reports', icon: BarChart3 }
  ]

  const teacherTabs = [
    { id: 'surveys', label: 'Quản lý Khảo sát', href: '/teacher/surveys', icon: FileSpreadsheet },
    { id: 'feedback', label: 'Thống kê', href: '/teacher/feedback', icon: MessageSquare }
  ]

  const tabs = role === 'TEACHER' ? teacherTabs : adminTabs

  return (
    <div className="bg-white border border-[#48BFE3]/20 shadow-xs rounded-xl px-1.5 py-1.5 mb-6 no-print">
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
                  ? 'bg-[#48BFE3] text-white border-[#48BFE3] shadow-xs'
                  : 'text-slate-600 border-transparent hover:bg-[#48BFE3]/5 hover:text-[#48BFE3]'
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
