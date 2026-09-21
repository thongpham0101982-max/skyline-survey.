"use client"

import { useState, useEffect } from "react"
import {
  X,
  Send,
  BookOpen,
  UserCheck,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle
} from "lucide-react"
import toast from "react-hot-toast"

interface Props {
  isOpen: boolean
  onClose: () => void
  student: any
  academicYearId: string
  selectedPeriod: string
  periodLabel: string
  currentClass: any
  teachingAssignments: any[]
  onForwarded?: (studentId: string, forwardData: any) => void
}

export function ForwardToGvbmModal({
  isOpen,
  onClose,
  student,
  academicYearId,
  selectedPeriod,
  periodLabel,
  currentClass,
  teachingAssignments = [],
  onForwarded
}: Props) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("")
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("")
  const [forwardMessage, setForwardMessage] = useState<string>("")
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Auto-detect subject when student opens
  useEffect(() => {
    if (student && isOpen) {
      // Find candidate subjects (subjects where student is below benchmark)
      let candidateSubId = ""
      if (student.subjectGrades) {
        for (const [subId, info] of Object.entries<any>(student.subjectGrades)) {
          if (info.isBelowBenchmark || info.isBelowAverage) {
            candidateSubId = subId
            break
          }
        }
      }

      // If no weak subject found, check if parent feedback mentions a subject name
      if (!candidateSubId && student.parentFeedback) {
        const lowerFeedback = student.parentFeedback.toLowerCase()
        const matchTa = teachingAssignments.find(ta =>
          ta.subjectName && lowerFeedback.includes(ta.subjectName.toLowerCase())
        )
        if (matchTa) {
          candidateSubId = matchTa.subjectId
        }
      }

      const initialSubId = candidateSubId || teachingAssignments[0]?.subjectId || ""
      setSelectedSubjectId(initialSubId)

      const ta = teachingAssignments.find(t => t.subjectId === initialSubId)
      setSelectedTeacherId(ta?.teacherId || "")
      setForwardMessage("")
    }
  }, [student, isOpen, teachingAssignments])

  // When selectedSubjectId changes, update selectedTeacherId
  const handleSubjectChange = (subId: string) => {
    setSelectedSubjectId(subId)
    const ta = teachingAssignments.find(t => t.subjectId === subId)
    setSelectedTeacherId(ta?.teacherId || "")
  }

  if (!isOpen || !student) return null

  const studentName = student.studentName || "Học sinh"
  const selectedAssignment = teachingAssignments.find(t => t.subjectId === selectedSubjectId)
  const gvbmName = selectedAssignment?.teacherName || "Chưa có phân công"

  const quickMessageSuggestions = [
    "Nhờ Thầy/Cô lưu ý hỗ trợ và phụ đạo thêm cho học sinh trong các tiết học tới.",
    "Phụ huynh mong muốn được trao đổi thêm về phương pháp tự học môn này tại nhà.",
    "Đề nghị Thầy/Cô đôn đốc học sinh hoàn thành bài tập bộ môn và kiểm tra bài cũ.",
    "Học sinh có điểm khảo sát chưa đạt chuẩn, nhờ Thầy/Cô kèm cặp thêm trong giờ bài tập."
  ]

  const handleSubmit = async () => {
    if (!selectedSubjectId || !selectedTeacherId) {
      toast.error("Vui lòng chọn môn học và Giáo viên bộ môn để chuyển tiếp")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/teacher/homeroom-grades/forward-gvbm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.studentId,
          classId: currentClass?.id,
          academicYearId,
          evaluationPeriod: selectedPeriod,
          action: "FORWARD_GVBM",
          subjectId: selectedSubjectId,
          subjectName: selectedAssignment?.subjectName || "Bộ môn",
          teacherId: selectedTeacherId,
          teacherName: gvbmName,
          message: forwardMessage.trim()
        })
      })

      const json = await res.json()
      if (json.success) {
        toast.success(json.message || "Đã chuyển thông tin đến GVBM thành công!")
        if (onForwarded) {
          onForwarded(student.studentId, json.forwardedGvbm)
        }
        onClose()
      } else {
        toast.error(json.error || "Chuyển thông tin thất bại")
      }
    } catch (e: any) {
      console.error("Lỗi chuyển thông tin GVBM:", e)
      toast.error("Lỗi kết nối khi gửi thông tin")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-blue-900 via-sky-900 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs">
              <Send className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Chuyển Thông Tin Ý Kiến PHHS Đến GVBM
              </h3>
              <p className="text-xs text-sky-200 font-medium">
                Học sinh: <strong className="text-white font-bold">{studentName}</strong> • Lớp: <strong>{currentClass?.className}</strong>
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
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          
          {/* Box: Ý kiến PHHS gốc */}
          <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black text-sky-900 uppercase">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                <span>Ý kiến phản hồi từ Phụ huynh:</span>
              </span>
              {student.parentFeedbackDate && (
                <span className="text-slate-500 font-normal">
                  {new Date(student.parentFeedbackDate).toLocaleDateString("vi-VN")}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-800 leading-relaxed italic bg-white/90 p-3 rounded-xl border border-sky-100">
              {student.parentFeedback ? `“${student.parentFeedback}”` : "(Chưa có nội dung phản hồi cụ thể, chuyển tiếp yêu cầu phối hợp hỗ trợ)"}
            </p>
          </div>

          {/* Form Select: Môn học liên quan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Môn học cần phối hợp hỗ trợ: <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              {teachingAssignments.map((ta) => {
                const gradeInfo = student.subjectGrades?.[ta.subjectId]
                const scoreStr = gradeInfo?.score !== null && gradeInfo?.score !== undefined ? ` (${gradeInfo.score}đ)` : ""
                const isWeak = gradeInfo?.isBelowBenchmark || gradeInfo?.isBelowAverage
                return (
                  <option key={ta.subjectId} value={ta.subjectId}>
                    {ta.subjectName}{scoreStr} {isWeak ? "• [Dưới chuẩn môn]" : ""}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Box: Giáo viên bộ môn nhận thông tin */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-black text-xs">
                GV
              </div>
              <div>
                <span className="text-[10.5px] text-slate-500 font-bold block">Giáo viên bộ môn giảng dạy:</span>
                <span className="text-xs font-extrabold text-slate-900">{gvbmName}</span>
              </div>
            </div>
            <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full font-bold">
              Phụ trách lớp {currentClass?.className}
            </span>
          </div>

          {/* Form Input: Lời nhắn điều phối của GVCN */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Lời nhắn / Đề xuất phối hợp của GVCN gửi GVBM:
            </label>
            <textarea
              rows={3}
              value={forwardMessage}
              onChange={(e) => setForwardMessage(e.target.value)}
              placeholder="Nhập nội dung GVCN muốn trao đổi hoặc nhờ Thầy/Cô GVBM hỗ trợ em học sinh này..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 leading-relaxed resize-none"
            />

            {/* Quick chips */}
            <div className="space-y-1">
              <div className="text-[10.5px] font-bold text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Gợi ý lời nhắn điều phối nhanh:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickMessageSuggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForwardMessage(sug)}
                    className="text-[10.5px] text-slate-700 bg-white hover:bg-sky-50 hover:text-sky-800 border border-slate-200 hover:border-sky-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-left shadow-2xs leading-tight"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* System Notification hint */}
          <div className="p-3 bg-blue-50/60 border border-blue-200/70 rounded-xl flex items-start gap-2 text-[11px] text-blue-800">
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Khi bấm xác nhận, hệ thống sẽ tự động gửi <strong>Thông báo chuông (Notification)</strong> đến tài khoản của Giáo viên bộ môn trên hệ thống.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>

          <button
            type="button"
            disabled={submitting || !selectedSubjectId || !selectedTeacherId}
            onClick={handleSubmit}
            className="px-5 py-2 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? "Đang gửi..." : "Xác nhận chuyển đến GVBM"}</span>
          </button>
        </div>

      </div>
    </div>
  )
}
