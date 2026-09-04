"use client"

import { useState } from "react"
import { Mail, X, AlertTriangle, Send, CheckCircle2, Users, Calendar } from "lucide-react"
import toast from "react-hot-toast"
import { ACADEMIC_MONTHS, MONTH_WEEKS_CONFIG } from "../academic-calendar"

interface Props {
  isOpen: boolean
  onClose: () => void
  academicYearId: string
  targets: any[]
  selectedTargetIds?: string[]
}

export function UrgentEmailModal({
  isOpen,
  onClose,
  academicYearId,
  targets,
  selectedTargetIds = []
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string>("Tháng 9")
  const [selectedWeek, setSelectedWeek] = useState<string>("Tuần 1")
  const [isMonthlySummary, setIsMonthlySummary] = useState(false)
  const [urgencyNotes, setUrgencyNotes] = useState("")
  const [phhsTopics, setPhhsTopics] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [sending, setSending] = useState(false)

  if (!isOpen) return null

  // Filter targets to send
  const targetList = selectedTargetIds.length > 0
    ? targets.filter(t => selectedTargetIds.includes(t.id))
    : targets

  const periodName = isMonthlySummary ? selectedMonth : `${selectedWeek} - ${selectedMonth}`
  const weeks = MONTH_WEEKS_CONFIG[selectedMonth] || ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"]

  const handleSendUrgentEmail = async () => {
    if (targetList.length === 0) {
      toast.error("Không có học sinh nào được chọn để gửi thông báo")
      return
    }

    setSending(true)
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendUrgentEmailToGVCN",
          academicYearId,
          targetIds: targetList.map(t => t.id),
          periodName,
          periodType: isMonthlySummary ? "MONTH" : "WEEK",
          urgencyNotes,
          phhsTopics,
          customMessage
        })
      })

      const data = await res.json()
      if (data.error) {
        toast.error("Gửi email thất bại: " + data.error)
      } else {
        toast.success(`Đã gửi email khẩn / phối hợp đến ${data.sentCount || 0} GVCN thành công!`, { duration: 5000 })
        onClose()
      }
    } catch (e: any) {
      toast.error("Lỗi khi gửi email: " + e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-rose-900 via-rose-800 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs">
              <Mail className="h-5 w-5 text-rose-200" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                Gửi Email Khẩn / Phối hợp đến GVCN
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">Ưu tiên cao</span>
              </h3>
              <p className="text-xs text-rose-100 font-medium">
                Gửi kết quả đánh giá Tuần/Tháng & Nội dung cần phối hợp với GVCN, PHHS
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
          {/* 1. Chọn Kỳ đánh giá (Tuần theo Tháng) */}
          <div className="space-y-2 bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
            <label className="text-xs font-black text-rose-950 uppercase tracking-tight flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-rose-700" />
              1. Chọn Kỳ đánh giá gửi thông báo:
            </label>

            {/* Months */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 pt-1">
              {ACADEMIC_MONTHS.map(m => {
                const isSelected = selectedMonth === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setSelectedMonth(m)
                      setSelectedWeek("Tuần 1")
                    }}
                    className={`py-1.5 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                      isSelected
                        ? "bg-rose-700 text-white border-transparent font-black shadow-xs scale-[1.03]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:border-rose-300"
                    }`}
                  >
                    {m.replace("Tháng ", "T")}
                  </button>
                )
              })}
            </div>

            {/* Weeks in selected month */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-rose-200/60 mt-2">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Chi tiết tuần:</span>
              {weeks.map(w => {
                const isSelected = !isMonthlySummary && selectedWeek === w
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setSelectedWeek(w)
                      setIsMonthlySummary(false)
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-rose-800 text-white border-transparent shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-rose-50"
                    }`}
                  >
                    {w}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setIsMonthlySummary(true)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  isMonthlySummary
                    ? "bg-gradient-to-r from-rose-800 to-red-700 text-white border-transparent shadow-xs"
                    : "bg-white text-rose-800 border-rose-300 hover:bg-rose-50"
                }`}
              >
                ⭐ Tổng kết {selectedMonth}
              </button>
            </div>

            <div className="text-xs font-bold text-rose-900 pt-1">
              Đang chọn gửi kết quả: <span className="underline">{periodName}</span>
            </div>
          </div>

          {/* 2. Danh sách học sinh gửi thông báo */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <Users className="h-4 w-4 text-rose-700" />
                2. Danh sách Học sinh đính kèm ({targetList.length} học sinh):
              </label>
              <span className="text-[11px] font-semibold text-slate-500">Tự động nhóm theo Lớp & GVCN</span>
            </div>
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50 p-2 text-xs divide-y divide-slate-200">
              {targetList.map((t, idx) => (
                <div key={t.id} className="py-1.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{idx + 1}. {t.student?.studentName || "N/A"}</span>
                    <span className="text-slate-500 ml-2">({t.student?.studentCode})</span>
                    <span className="font-extrabold text-indigo-700 ml-2">[{t.student?.class?.className || "Lớp"}]</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border">
                    {t.reason || (t.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Nội dung cần GVCN phối hợp trao đổi với PHHS */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              3. Nội dung cần trao đổi / phối hợp với Phụ huynh học sinh (PHHS):
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Nhờ PHHS đôn đốc việc làm bài tập môn Toán mỗi tối 30 phút, kiểm tra vở bài học..."
              value={phhsTopics}
              onChange={e => setPhhsTopics(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-600"
            />
          </div>

          {/* 4. Lưu ý khẩn cấp / Nội dung làm việc với GVCN */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 uppercase tracking-tight">
              4. Lưu ý khẩn cấp & Nội dung làm việc chuyên môn với GVCN:
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Đề nghị GVCN bố trí bạn ngồi kèm cặp trong giờ học, theo dõi biểu hiện tâm lý..."
              value={urgencyNotes}
              onChange={e => setUrgencyNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-600"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="border hover:bg-slate-100 py-2.5 px-5 rounded-xl text-xs font-bold transition-all text-slate-600 cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={handleSendUrgentEmail}
            className="bg-gradient-to-r from-rose-800 to-red-700 hover:from-rose-900 hover:to-red-800 text-white py-2.5 px-6 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? "Đang gửi email..." : "Gửi Email Khẩn đến GVCN"}
          </button>
        </div>
      </div>
    </div>
  )
}
