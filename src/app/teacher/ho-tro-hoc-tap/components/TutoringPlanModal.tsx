"use client"

import { useState } from "react"
import { BookOpen, X, Save, Printer, Target, Calendar, Clock, User, CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"

interface Props {
  isOpen: boolean
  onClose: () => void
  target: any
  academicYearId: string
  onPlanSaved?: () => void
}

export function TutoringPlanModal({
  isOpen,
  onClose,
  target,
  academicYearId,
  onPlanSaved
}: Props) {
  // Parse existing plan from target?.notes if any
  let initialPlan: any = {}
  try {
    const notes = target?.notes || ""
    const match = notes.match(/\[PLAN:(.*?)\]/s)
    if (match && match[1]) {
      initialPlan = JSON.parse(match[1])
    }
  } catch (e) {}

  const [subject, setSubject] = useState(initialPlan.subject || target?.reason || "Môn Toán")
  const [weakKnowledgePoints, setWeakKnowledgePoints] = useState(initialPlan.weakKnowledgePoints || "")
  const [targetGoals, setTargetGoals] = useState(initialPlan.targetGoals || "")
  const [scheduleTime, setScheduleTime] = useState(initialPlan.scheduleTime || "Thứ 3 & Thứ 5 hàng tuần (16h30 - 17h15)")
  const [sessionsPerWeek, setSessionsPerWeek] = useState(initialPlan.sessionsPerWeek || "2 buổi / tuần")
  const [methodsAndMaterials, setMethodsAndMaterials] = useState(initialPlan.methodsAndMaterials || "Ôn tập kiến thức hổng theo chuyên đề, giải bài tập rèn kỹ năng")
  const [teacherName, setTeacherName] = useState(initialPlan.teacherName || "")
  const [saving, setSaving] = useState(false)
  const [showPrintPreview, setShowPrintPreview] = useState(false)

  if (!isOpen || !target) return null

  const studentName = target.student?.studentName || target.student?.fullName || "Học sinh"
  const studentCode = target.student?.studentCode || "N/A"
  const className = target.student?.class?.className || target.student?.className || "N/A"

  const handleSavePlan = async () => {
    if (!weakKnowledgePoints || !targetGoals) {
      toast.error("Vui lòng nhập kiến thức hổng và mục tiêu cần đạt")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveTutoringPlan",
          targetId: target.id,
          studentId: target.studentId || target.student?.id,
          academicYearId,
          subject,
          weakKnowledgePoints,
          targetGoals,
          scheduleTime,
          sessionsPerWeek,
          methodsAndMaterials,
          teacherName
        })
      })

      const data = await res.json()
      if (data.error) {
        toast.error("Lưu kế hoạch thất bại: " + data.error)
      } else {
        toast.success("Đã lưu Kế hoạch Phụ đạo & Bồi dưỡng thành công!")
        if (onPlanSaved) onPlanSaved()
      }
    } catch (e: any) {
      toast.error("Lỗi khi lưu kế hoạch: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-[#003B3A] via-teal-800 to-[#009085] text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs">
              <BookOpen className="h-5 w-5 text-[#48BFE3]" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Kế hoạch Chi tiết Phụ đạo & Bồi dưỡng Học sinh
              </h3>
              <p className="text-xs text-teal-200 font-medium">
                Học sinh: <strong className="text-white font-bold">{studentName}</strong> ({studentCode}) • Lớp: <strong>{className}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              In kế hoạch
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-xl transition-all text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable & Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto" id="tutoring-plan-print">
          {/* Printable Pedagogical Header for PDF/Print */}
          <div className="border-b pb-4 mb-2 text-center space-y-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-teal-800">
              HỆ THỐNG GIÁO DỤC SKY-LINE • TỔ CHUYÊN MÔN
            </div>
            <h2 className="text-base font-black text-slate-900 uppercase">
              KẾ HOẠCH PHỤ ĐẠO & BỒI DƯỠNG HỌC SINH
            </h2>
            <div className="text-xs text-slate-600 font-semibold">
              Học sinh: <strong className="text-slate-900 font-black">{studentName}</strong> — Lớp: <strong className="text-slate-900 font-black">{className}</strong> — Mã HS: <strong className="text-slate-900">{studentCode}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Môn bồi dưỡng */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-tight">Môn học bồi dưỡng:</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Ví dụ: Môn Toán, Tiếng Anh, Tiếng Việt..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            {/* Giáo viên phụ trách */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-tight">Giáo viên phụ trách:</label>
              <input
                type="text"
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                placeholder="Tên giáo viên trực tiếp bồi dưỡng..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            {/* Thời lượng / số buổi */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-tight">Thời lượng / Số buổi:</label>
              <input
                type="text"
                value={sessionsPerWeek}
                onChange={e => setSessionsPerWeek(e.target.value)}
                placeholder="Ví dụ: 2 buổi / tuần (45 phút / buổi)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            {/* Lịch kèm cặp */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-tight">Lịch & Địa điểm kèm cặp:</label>
              <input
                type="text"
                value={scheduleTime}
                onChange={e => setScheduleTime(e.target.value)}
                placeholder="Ví dụ: Chiều Thứ 3, Thứ 5 tại Phòng học 201..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
          </div>

          {/* Lỗ hổng kiến thức */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <Target className="h-4 w-4 text-rose-600" />
              1. Lỗ hổng kiến thức / Kỹ năng cần rèn luyện:
            </label>
            <textarea
              rows={3}
              value={weakKnowledgePoints}
              onChange={e => setWeakKnowledgePoints(e.target.value)}
              placeholder="Ghi rõ các nội dung học sinh bị mất gốc hoặc chưa nắm vững (Ví dụ: phép nhân chia phân số, kỹ năng đọc hiểu Tiếng Anh, khả năng tập trung...)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          {/* Mục tiêu cụ thể */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              2. Mục tiêu cụ thể cần đạt sau đợt bồi dưỡng:
            </label>
            <textarea
              rows={3}
              value={targetGoals}
              onChange={e => setTargetGoals(e.target.value)}
              placeholder="Mục tiêu cần đạt: Làm được bài tập cơ bản, kiểm tra đạt từ 6.5 trở lên, tự giác làm bài tập..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          {/* Phương pháp & Tài liệu */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-teal-600" />
              3. Phương pháp, hình thức & Tài liệu bồi dưỡng:
            </label>
            <textarea
              rows={2}
              value={methodsAndMaterials}
              onChange={e => setMethodsAndMaterials(e.target.value)}
              placeholder="Phương pháp giảng dạy, tài liệu bổ trợ, phiếu bài tập ôn luyện..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50 no-print">
          <button
            type="button"
            onClick={onClose}
            className="border hover:bg-slate-100 py-2 px-5 rounded-xl text-xs font-bold transition-all text-slate-600 cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSavePlan}
            className="bg-gradient-to-r from-[#003B3A] to-[#009085] hover:from-teal-900 hover:to-[#003B3A] text-white py-2 px-6 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Đang lưu kế hoạch..." : "Lưu Kế hoạch bồi dưỡng"}
          </button>
        </div>
      </div>
    </div>
  )
}
