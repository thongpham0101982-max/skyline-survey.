"use client"

import { useState, useEffect } from "react"
import { Sparkles, Save, Heart, CheckCircle2, Compass, Send } from "lucide-react"

export default function StudentGoalPortalPage() {
  const [studentCommitment, setStudentCommitment] = useState("")
  const [savedSuccess, setSavedSuccess] = useState(false)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 font-sans text-slate-800">
      <div className="bg-gradient-to-r from-sky-500 to-teal-500 rounded-3xl p-6 text-white shadow-xl space-y-2">
        <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 uppercase tracking-wider">
          SKY-LINE STUDENT PORTAL
        </span>
        <h1 className="text-2xl font-black">Bảng Mục Tiêu Đầu Năm Học Của Em</h1>
        <p className="text-xs text-white/90 font-medium">Hãy dành thời gian suy nghĩ và viết những mục tiêu tuyệt vời nhất cho năm học này nhé!</p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-[#003B3A]">Lời Cam Kết Của Em</h3>
        <textarea
          rows={4}
          value={studentCommitment}
          onChange={(e) => setStudentCommitment(e.target.value)}
          placeholder="Viết lời cam kết của em (Ví dụ: Em cam kết sẽ cố gắng thực hiện mục tiêu mỗi ngày...)"
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
    </div>
  )
}
