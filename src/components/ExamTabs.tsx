"use client"
import Link from 'next/link'
import { Layers, ClipboardList, UserCheck, Award } from 'lucide-react'

interface ExamTabsProps {
  activeTab: 'categories' | 'exams' | 'students' | 'results'
}

export function ExamTabs({ activeTab }: ExamTabsProps) {
  const tabs = [
    { id: 'categories', label: 'Quản lý danh mục', href: '/admin/ktdbcl/categories', icon: Layers },
    { id: 'exams', label: 'Danh sách Kỳ thi', href: '/admin/ktdbcl/exams', icon: ClipboardList },
    { id: 'students', label: 'Đăng ký Dự thi', href: '/admin/ktdbcl/students', icon: UserCheck },
    { id: 'results', label: 'Nhập điểm & Kết quả', href: '/admin/ktdbcl/results', icon: Award }
  ]

  return (
    <div className="bg-white border border-[#00A99D]/20 shadow-xs rounded-xl px-1.5 py-1.5 mb-6 no-print">
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
                  ? 'bg-[#00A99D] text-white border-[#00A99D] shadow-xs'
                  : 'text-slate-600 border-transparent hover:bg-[#00A99D]/5 hover:text-[#00A99D]'
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
