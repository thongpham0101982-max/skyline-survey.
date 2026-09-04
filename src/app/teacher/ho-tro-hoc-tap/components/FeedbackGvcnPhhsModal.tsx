"use client"

import { useState, useEffect } from "react"
import { MessageSquare, X, Save, Clock, UserCheck, Users, Calendar, AlertCircle } from "lucide-react"
import toast from "react-hot-toast"

interface Props {
  isOpen: boolean
  onClose: () => void
  target: any
  academicYearId: string
}

export function FeedbackGvcnPhhsModal({
  isOpen,
  onClose,
  target,
  academicYearId
}: Props) {
  const [meetingDate, setMeetingDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [feedbackGvcn, setFeedbackGvcn] = useState("")
  const [feedbackPhhs, setFeedbackPhhs] = useState("")
  const [followUpPlan, setFollowUpPlan] = useState("")
  const [saving, setSaving] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const studentId = target?.studentId || target?.student?.id

  const fetchLogs = async () => {
    if (!studentId) return
    setLoadingLogs(true)
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getFeedbackLogs",
          studentId,
          academicYearId
        })
      })
      const data = await res.json()
      if (Array.isArray(data)) {
        setLogs(data)
      }
    } catch (e) {
      console.error("Failed to load feedback logs", e)
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    if (isOpen && studentId) {
      fetchLogs()
    }
  }, [isOpen, studentId])

  if (!isOpen || !target) return null

  const studentName = target.student?.studentName || target.student?.fullName || "Học sinh"
  const studentCode = target.student?.studentCode || "N/A"
  const className = target.student?.class?.className || target.student?.className || "N/A"

  const handleSaveFeedback = async () => {
    if (!feedbackGvcn && !feedbackPhhs) {
      toast.error("Vui lòng nhập ít nhất ý kiến GVCN hoặc ý kiến PHHS")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveFeedbackGVCN_PHHS",
          targetId: target.id,
          studentId,
          academicYearId,
          meetingDate,
          feedbackGvcn,
          feedbackPhhs,
          followUpPlan
        })
      })

      const data = await res.json()
      if (data.error) {
        toast.error("Ghi nhận ý kiến thất bại: " + data.error)
      } else {
        toast.success("Đã lưu ý kiến GVCN & PHHS vào Sổ theo dõi phát triển học sinh!")
        setFeedbackGvcn("")
        setFeedbackPhhs("")
        setFollowUpPlan("")
        fetchLogs()
      }
    } catch (e: any) {
      toast.error("Lỗi khi lưu ý kiến: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-teal-900 via-[#003B3A] to-[#009085] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs">
              <MessageSquare className="h-5 w-5 text-[#48BFE3]" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Ghi nhận Ý kiến GVCN & PHHS vào Sổ theo dõi
              </h3>
              <p className="text-xs text-teal-200 font-medium">
                Học sinh: <strong className="text-white font-bold">{studentName}</strong> ({studentCode}) • Lớp: <strong>{className}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition-all text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Ngày ghi nhận */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <Calendar className="h-4 w-4 text-[#009085]" />
            <label className="text-xs font-bold text-slate-700">Ngày trao đổi / Ghi nhận:</label>
            <input
              type="date"
              value={meetingDate}
              onChange={e => setMeetingDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
            />
          </div>

          {/* Form input 1: Ý kiến GVCN */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-[#009085]" />
              1. Ý kiến & Nhận xét của Giáo viên Chủ nhiệm (GVCN):
            </label>
            <textarea
              rows={3}
              placeholder="Ghi nhận phản hồi của GVCN về thái độ, sự tập trung, tiến độ làm bài tập trên lớp..."
              value={feedbackGvcn}
              onChange={e => setFeedbackGvcn(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-[#009085]"
            />
          </div>

          {/* Form input 2: Ý kiến PHHS */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <Users className="h-4 w-4 text-amber-600" />
              2. Ý kiến & Trao đổi của Phụ huynh học sinh (PHHS):
            </label>
            <textarea
              rows={3}
              placeholder="Ghi nhận phản hồi của Phụ huynh: việc tự học ở nhà, khó khăn tâm lý, mong muốn hỗ trợ..."
              value={feedbackPhhs}
              onChange={e => setFeedbackPhhs(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-[#009085]"
            />
          </div>

          {/* Form input 3: Kế hoạch phối hợp */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 uppercase tracking-tight">
              3. Kế hoạch / Giải pháp phối hợp tiếp theo:
            </label>
            <input
              type="text"
              placeholder="Ví dụ: GVCN kiểm tra vở hàng ngày, PHHS kèm môn Toán 30p mỗi tối..."
              value={followUpPlan}
              onChange={e => setFollowUpPlan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-[#009085]"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveFeedback}
              className="bg-gradient-to-r from-[#003B3A] to-[#009085] hover:from-teal-900 hover:to-[#003B3A] text-white py-2 px-5 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Đang lưu..." : "Lưu Ý kiến vào Sổ theo dõi"}
            </button>
          </div>

          {/* Lịch sử ý kiến đã ghi nhận */}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500" />
              Lịch sử ghi nhận ý kiến GVCN & PHHS:
            </label>
            {loadingLogs ? (
              <div className="text-center py-4 text-xs text-slate-400 font-semibold">Đang tải lịch sử...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400 font-medium italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Chưa có bản ghi ý kiến GVCN / PHHS nào trước đây.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {logs.map((item, idx) => (
                  <div key={item.id || idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-[#003B3A]">
                        Ngày: {new Date(item.meetingDate || item.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        Người ghi: {item.teacher?.teacherName || "Giáo viên"}
                      </span>
                    </div>
                    {item.content && (
                      <div className="text-slate-700 font-semibold">{item.content}</div>
                    )}
                    {item.difficulties && (
                      <div className="text-amber-800 font-semibold">{item.difficulties}</div>
                    )}
                    {item.nextActions && (
                      <div className="text-[11px] text-teal-700 font-bold">
                        👉 Kế hoạch tiếp theo: {item.nextActions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t flex justify-end bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="border hover:bg-slate-100 py-2 px-5 rounded-xl text-xs font-bold transition-all text-slate-600 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
