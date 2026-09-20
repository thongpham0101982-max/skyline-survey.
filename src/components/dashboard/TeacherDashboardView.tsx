"use client"

import React from "react"
import { RoleDashboardData } from "@/lib/dashboard/dashboardAggregationService"
import { MetricCard } from "./MetricCard"
import { ActionCenter } from "./ActionCenter"
import Link from "next/link"
import { BookOpen, Users, Award, Calendar } from "lucide-react"

interface TeacherDashboardViewProps {
  data: RoleDashboardData
  onDrilldown: (metricId: string) => void
}

export function TeacherDashboardView({ data, onDrilldown }: TeacherDashboardViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Action Center: Việc cần làm của Giáo viên */}
      <ActionCenter title="Việc cần xử lý ngay" actions={data.actions} />

      {/* 2. Core KPIs: Tinh gọn 4 cards */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Chỉ số tiến độ & Trách nhiệm cá nhân
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.coreMetrics.map((m) => (
            <MetricCard key={m.metricId} data={m} onDrilldown={onDrilldown} />
          ))}
        </div>
      </div>

      {/* 3. Quick Portals: Lối tắt các module phụ trách */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Phân hệ chuyên môn phân công
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <Link
            href="/teacher/du-gio"
            className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-[#003B3A] shadow-2xs transition-all flex items-center gap-3 group"
          >
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg group-hover:bg-[#003B3A] group-hover:text-white transition-colors">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">Dự giờ chuyên môn</div>
              <div className="text-[11px] text-slate-400">Đăng ký & Xem lịch dự</div>
            </div>
          </Link>

          <Link
            href="/teacher/co-van-hoc-tap"
            className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-[#003B3A] shadow-2xs transition-all flex items-center gap-3 group"
          >
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg group-hover:bg-[#003B3A] group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">Cố vấn & Mục tiêu</div>
              <div className="text-[11px] text-slate-400">Theo dõi GAP học sinh</div>
            </div>
          </Link>

          <Link
            href="/teacher/du-an-trai-nghiem"
            className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-[#003B3A] shadow-2xs transition-all flex items-center gap-3 group"
          >
            <div className="p-2 bg-purple-50 text-purple-700 rounded-lg group-hover:bg-[#003B3A] group-hover:text-white transition-colors">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">Hoạt động trải nghiệm</div>
              <div className="text-[11px] text-slate-400">Điểm danh & Chấm rubric</div>
            </div>
          </Link>

          <Link
            href="/teacher/so-diem-nhan-xet"
            className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-[#003B3A] shadow-2xs transition-all flex items-center gap-3 group"
          >
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg group-hover:bg-[#003B3A] group-hover:text-white transition-colors">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">Sổ điểm bộ môn</div>
              <div className="text-[11px] text-slate-400">Nhập điểm & Nhận xét</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
