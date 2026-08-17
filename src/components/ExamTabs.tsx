"use client"
import Link from 'next/link'
import { Layers, ClipboardList, UserCheck, Award, GitCommit, Trophy, FileSpreadsheet, BookOpen } from 'lucide-react'

interface ExamTabsProps {
  activeTab: 'categories' | 'rounds' | 'achievements' | 'exams' | 'students' | 'results' | 'reports' | 'profiles'
}

export function ExamTabs({ activeTab }: ExamTabsProps) {
  const isConfigTab = activeTab === 'categories' || activeTab === 'rounds' || activeTab === 'achievements'

  const mainTabs = [
    { id: 'config', label: 'Cấu hình kỳ thi', href: '/admin/ktdbcl/categories', isActive: isConfigTab, icon: Layers },
    { id: 'results', label: 'Theo dõi kết quả', href: '/admin/ktdbcl/exams', isActive: !isConfigTab, icon: ClipboardList }
  ]

  const subTabs = isConfigTab
    ? [
        { id: 'categories', label: 'Quản lý danh mục', href: '/admin/ktdbcl/categories', icon: Layers },
        { id: 'rounds', label: 'Vòng thi', href: '/admin/ktdbcl/rounds', icon: GitCommit },
        { id: 'achievements', label: 'Thành tích', href: '/admin/ktdbcl/achievements', icon: Trophy }
      ]
    : [
        { id: 'exams', label: 'Danh sách Kỳ thi', href: '/admin/ktdbcl/exams', icon: ClipboardList },
        { id: 'students', label: 'Đăng ký Dự thi', href: '/admin/ktdbcl/students', icon: UserCheck },
        { id: 'results', label: 'Nhập điểm & Kết quả', href: '/admin/ktdbcl/results', icon: Award },
        { id: 'reports', label: 'Báo cáo thành tích', href: '/admin/ktdbcl/results?tab=reports', icon: FileSpreadsheet },
        { id: 'profiles', label: 'Hồ sơ thành tích Học sinh', href: '/admin/ktdbcl/results?tab=profiles', icon: BookOpen }
      ]

  return (
    <div className="space-y-4 mb-6 no-print">
      {/* Level 1: Main Tabs */}
      <div className="flex border-b border-slate-200">
        {mainTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 font-black text-xs transition-all duration-200 uppercase tracking-wider ${
                tab.isActive
                  ? 'border-[#36E08F] text-[#36E08F]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Level 2: Sub Tabs */}
      <div className="bg-white border border-slate-200/60 shadow-2xs rounded-xl px-1.5 py-1.5">
        <div className="flex flex-wrap gap-1">
          {subTabs.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all duration-200 border ${
                  isActive
                    ? 'bg-[#36E08F] text-white border-[#36E08F] shadow-xs'
                    : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
