"use client"

import { useState, useEffect } from "react"
import { Sparkles, Save, Heart, CheckCircle2, Compass, Send, BookOpen, User } from "lucide-react"
import Link from "next/link"

export default function StudentGoalPortalPage() {
  const [studentCommitment, setStudentCommitment] = useState("")
  const [savedSuccess, setSavedSuccess] = useState(false)

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-slate-800 pb-16">
      {/* Top Header Banner with Navigation */}
      <div className="bg-gradient-to-r from-sky-500 via-teal-500 to-[#003B3A] rounded-3xl p-6 text-white shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 uppercase tracking-wider">
            SKY-LINE STUDENT PORTAL
          </span>

          <Link
            href="/hocsinh/portal/ho-tro"
            className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all animate-pulse"
          >
            <Heart className="w-4 h-4 fill-white" />
            <span>Nút "Em Cần Hỗ Trợ"</span>
          </Link>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Bảng Mục Tiêu Đầu Năm Học Của Em</h1>
          <p className="text-xs text-white/90 font-medium mt-1">Hãy dành thời gian suy nghĩ và viết những mục tiêu tuyệt vời nhất cho năm học này nhé!</p>
        </div>

        {/* Portal Nav Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/15">
          <Link
            href="/hocsinh/portal/muc-tieu"
            className="px-4 py-1.5 rounded-xl bg-white text-[#003B3A] text-xs font-black flex items-center gap-1.5 shadow-xs"
          >
            <Compass className="w-3.5 h-3.5 text-teal-600" />
            <span>Mục Tiêu Cá Nhân</span>
          </Link>
          <Link
            href="/hocsinh/portal/ho-tro"
            className="px-4 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold flex items-center gap-1.5"
          >
            <Heart className="w-3.5 h-3.5 text-rose-300" />
            <span>Yêu Cầu Hỗ Trợ (SOS)</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-[#003B3A]">Lời Cam Kết Của Em</h3>
        <textarea
          rows={4}
          value={studentCommitment}
          onChange={(e) => setStudentCommitment(e.target.value)}
          placeholder="Viết lời cam kết của em (Ví dụ: Em cam kết sẽ cố gắng thực hiện mục tiêu mỗi ngày, rèn luyện 5 trụ cột Sky-Line...)"
          className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-semibold focus:border-teal-500"
        />
        <button
          onClick={() => {
            setSavedSuccess(true)
            setTimeout(() => setSavedSuccess(false), 3000)
          }}
          className="px-6 py-2.5 rounded-xl bg-[#003B3A] text-white text-xs font-black flex items-center gap-2 hover:bg-[#004D4A]"
        >
          <Save className="w-4 h-4" />
          <span>Lưu & Gửi Phiếu Mục Tiêu</span>
        </button>
        {savedSuccess && <p className="text-xs font-bold text-emerald-600 animate-pulse">Đã lưu phiếu mục tiêu thành công!</p>}
      </div>

      {/* Floating SOS Quick Button Fixed at Bottom Right */}
      <Link
        href="/hocsinh/portal/ho-tro"
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-black text-xs shadow-2xl flex items-center gap-2.5 transition-all transform hover:scale-105 border-2 border-white group"
      >
        <span className="p-1.5 rounded-full bg-white/20 group-hover:scale-110 transition-transform">
          <Heart className="w-4 h-4 fill-white" />
        </span>
        <span className="pr-1">Em Cần Hỗ Trợ</span>
      </Link>
    </div>
  )
}
