"use client"

import React from "react"
import { Users, CheckCircle2, Award, AlertTriangle, TrendingUp } from "lucide-react"

export interface ExperienceResultSummaryProps {
  total: number
  presentCount: number
  attendanceRate: number
  xuatSacCount: number
  totCount: number
  datCount: number
  chuaDatCount: number
  completedRate: number
  className?: string
}

export function ExperienceResultSummary({
  total,
  presentCount,
  attendanceRate,
  xuatSacCount,
  totCount,
  datCount,
  chuaDatCount,
  completedRate,
  className = ""
}: ExperienceResultSummaryProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3.5 ${className}`}>
      {/* 1. Tổng số & Điểm danh */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-extrabold uppercase">Tham gia</span>
          <Users className="w-4 h-4 text-[#003B3A]" />
        </div>
        <div className="text-xl font-black text-slate-900">
          {presentCount} <span className="text-xs font-normal text-slate-400">/ {total}</span>
        </div>
        <div className="text-[11px] text-emerald-600 font-bold">
          {attendanceRate}% có mặt
        </div>
      </div>

      {/* 2. Xuất sắc & Tốt */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-extrabold uppercase">Tốt & Xuất sắc</span>
          <Award className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="text-xl font-black text-emerald-700">
          {xuatSacCount + totCount}
        </div>
        <div className="text-[11px] text-slate-500 font-medium">
          {xuatSacCount} xuất sắc, {totCount} tốt
        </div>
      </div>

      {/* 3. Đạt yêu cầu */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-extrabold uppercase">Đạt yêu cầu</span>
          <CheckCircle2 className="w-4 h-4 text-sky-600" />
        </div>
        <div className="text-xl font-black text-sky-700">
          {datCount}
        </div>
        <div className="text-[11px] text-slate-500 font-medium">
          Đạt mục tiêu rèn luyện
        </div>
      </div>

      {/* 4. Tiến độ đánh giá */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-extrabold uppercase">Tiến độ lớp</span>
          <TrendingUp className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="text-xl font-black text-indigo-700">
          {completedRate}%
        </div>
        <div className="text-[11px] text-slate-500 font-medium">
          {chuaDatCount > 0 ? `${chuaDatCount} chưa đạt` : "Hoàn thành đánh giá"}
        </div>
      </div>
    </div>
  )
}
