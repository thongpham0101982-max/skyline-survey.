"use client"

import { useState, useEffect } from "react"
import { Compass, Users, Layers, ShieldAlert, BarChart3, Search, Filter } from "lucide-react"

export default function AdminAdvisoryDashboard() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-slate-800">
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#00A99D] rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-white/15 border border-white/20 text-teal-100 uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-teal-300" />
            <span>QUẢN TRỊ CỐ VẤN HỌC TẬP - BAN GIÁM HIỆU</span>
          </div>
          <h1 className="text-2xl font-black text-white">Dashboard Giám Sát Đa Cấp Sky-Line</h1>
          <p className="text-xs text-teal-100/90 font-medium">Theo dõi chỉ số cảnh báo 🟢🟡🔴 toàn trường, quản lý thư viện mục tiêu mẫu K1-K3.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <p className="text-xs font-extrabold text-slate-400 uppercase">TỔNG THAM VẤN HÀNG THÁNG</p>
          <p className="text-3xl font-black text-[#003B3A]">128 Buổi</p>
          <p className="text-xs text-emerald-600 font-bold">↑ 12% so với tháng trước</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <p className="text-xs font-extrabold text-slate-400 uppercase">TỶ LỆ HOÀN THÀNH MỤC TIÊU</p>
          <p className="text-3xl font-black text-[#00A99D]">84.5%</p>
          <p className="text-xs text-slate-500 font-medium">Toàn hệ thống Sky-Line</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <p className="text-xs font-extrabold text-slate-400 uppercase">TRƯỜNG HỢP CẦN CỐ VẤN ĐẶC BIỆT (🔴)</p>
          <p className="text-3xl font-black text-rose-600">5 Học sinh</p>
          <p className="text-xs text-rose-600 font-bold">Đang được Ban Tâm lý đồng hành</p>
        </div>
      </div>
    </div>
  )
}
