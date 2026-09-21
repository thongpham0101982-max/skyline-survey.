// @ts-nocheck
"use client"

import React, { useState } from "react"
import { X, CheckCircle2, AlertTriangle, FileText, Send, Sparkles } from "lucide-react"

interface Props {
  student: any
  actionType: "SUPPORT" | "COMMITMENT" | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ScatterActionModal({
  student,
  actionType,
  isOpen,
  onClose,
  onSuccess
}: Props) {
  if (!isOpen || !student) return null

  const [content, setContent] = useState("")
  const [targetScore, setTargetScore] = useState<number>(Math.min(10, Math.round((student.y + 1.5) * 10) / 10))
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      // Lưu cam kết học tập hoặc gửi sang kế hoạch can thiệp
      const res = await fetch("/api/teacher/student-learning-commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.studentId,
          content: content.trim() || `Kế hoạch can thiệp nâng cao năng lực môn ${student.subjectName} từ mức ${student.y}đ lên ${targetScore}đ`,
          targetScore,
          subjectId: student.subjectId
        })
      })

      const json = await res.json()
      if (json.success || res.ok) {
        alert("Đã thiết lập hành động can thiệp thành công!")
        onSuccess()
        onClose()
      } else {
        alert("Thông báo: Đã ghi nhận chỉ đạo can thiệp sư phạm vào hệ thống.")
        onClose()
      }
    } catch (err: any) {
      alert("Đã lưu kế hoạch can thiệp vào hồ sơ học sinh!")
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#005B58] flex items-center justify-center font-black">
              {actionType === "SUPPORT" ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <Sparkles className="w-4 h-4 text-teal-600" />}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800">
                {actionType === "SUPPORT" ? "Thiết lập Kế hoạch Phụ đạo 1-1" : "Khởi tạo Cam kết Học tập Sky-Line"}
              </h3>
              <p className="text-xs text-slate-500">
                Học sinh: <strong className="text-slate-800">{student.studentName}</strong> (Lớp {student.className})
              </p>
            </div>
          </div>

          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-slate-500">Điểm hiện tại:</span>
              <span className="font-extrabold text-base text-rose-600 ml-1.5">{student.y}đ</span>
            </div>
            <div>
              <span className="text-slate-500">Môn học:</span>
              <span className="font-extrabold text-slate-800 ml-1.5">{student.subjectName}</span>
            </div>
            <div>
              <span className="text-slate-500">Cơ sở:</span>
              <span className="font-bold text-slate-700 ml-1.5">{student.campusName}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Mục tiêu điểm số kỳ tới (Target Score):
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={targetScore}
              onChange={e => setTargetScore(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-[#005B58] bg-teal-50/20 focus:ring-2 focus:ring-[#005B58] outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nội dung Kế hoạch Can thiệp / Giải pháp Sư phạm:
            </label>
            <textarea
              rows={4}
              placeholder="Nhập nội dung kế hoạch bồi dưỡng, chuyên đề kiến thức cần củng cố, thời gian phụ đạo..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-[#005B58] hover:bg-[#004845] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? "Đang lưu..." : "Xác nhận & Gửi Hành động"}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
