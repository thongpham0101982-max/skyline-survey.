"use client"

import { useState, useEffect } from "react"
import {
  X,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  User,
  Sparkles,
  BookOpen,
  AlertCircle
} from "lucide-react"

interface Props {
  isOpen: boolean
  onClose: () => void
  student: any
  coordinationInfo: any
  currentClass: any
  currentSubject: any
  selectedPeriod: string
  academicYearId: string
  onSaved: (studentId: string, responseData: any) => void
}

const ACTION_STATUS_OPTIONS = [
  {
    code: "STUDENT_GUIDED",
    label: "Đã kèm cặp & hướng dẫn riêng cho học sinh",
    desc: "Đã gặp trực tiếp học sinh trong giờ giải lao/tiết học để chỉ ra lỗ hổng kiến thức và hướng dẫn phương pháp làm bài."
  },
  {
    code: "ASSIGNMENT_GIVEN",
    label: "Đã giao thêm bài tập / chuyên đề củng cố",
    desc: "Đã giao thêm phiếu bài tập phân hóa theo năng lực và yêu cầu nộp lại để GVBM chấm, sửa bài."
  },
  {
    code: "PARENT_CONTACTED",
    label: "Đã liên hệ PHHS cùng phối hợp đôn đốc tại nhà",
    desc: "Đã trao đổi với PHHS để thống nhất biện pháp rèn luyện và nhắc nhở thời gian tự học của con."
  },
  {
    code: "IN_PROGRESS",
    label: "Đã tiếp nhận & đang quan sát, theo dõi trong các tiết học",
    desc: "Đang ưu tiên gọi phát biểu, kiểm tra bài cũ và theo dõi mức độ tiếp thu trong các buổi học."
  },
  {
    code: "COMPLETED",
    label: "Đã hoàn thành hỗ trợ - Học sinh có tiến bộ rõ rệt",
    desc: "Học sinh đã hiểu bài, cải thiện kết quả kiểm tra định kỳ và đạt chuẩn môn học."
  }
]

const QUICK_SUGGESTIONS = [
  "Cô đã gặp riêng em để chỉ ra các lỗi sai trong bài khảo sát và hướng dẫn phương pháp viết bài đạt điểm cao hơn.",
  "Em tiếp thu bài nhanh trên lớp, cô đã giao thêm 2 phiếu bài tập rèn luyện kỹ năng và sẽ chấm chữa vào thứ Sáu tuần này.",
  "Đã trao đổi trực tiếp với Phụ huynh, thống nhất gia đình sẽ đôn đốc em ôn bài 30 phút mỗi tối.",
  "Học sinh có tinh thần hợp tác tốt, cô sẽ tiếp tục bồi dưỡng và gọi em làm bài trên bảng trong các tiết tới.",
  "Em đã hoàn thành bài kiểm tra bù đạt chuẩn yêu cầu môn học, tinh thần học tập đã cải thiện rõ rệt."
]

export function GvbmResponseModal({
  isOpen,
  onClose,
  student,
  coordinationInfo,
  currentClass,
  currentSubject,
  selectedPeriod,
  academicYearId,
  onSaved
}: Props) {
  const [status, setStatus] = useState<string>("STUDENT_GUIDED")
  const [responseContent, setResponseContent] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const forwarded = coordinationInfo?.forwardedGvbm
  const existingResponse = coordinationInfo?.gvbmResponse

  useEffect(() => {
    if (existingResponse) {
      setStatus(existingResponse.status || "STUDENT_GUIDED")
      setResponseContent(existingResponse.responseContent || "")
    } else {
      setStatus("STUDENT_GUIDED")
      setResponseContent("")
    }
    setErrorMsg("")
  }, [existingResponse, isOpen])

  if (!isOpen || !student) return null

  const handleApplyQuick = (text: string) => {
    if (!responseContent.trim()) {
      setResponseContent(text)
    } else {
      setResponseContent(prev => `${prev}\n- ${text}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!responseContent.trim()) {
      setErrorMsg("Vui lòng nhập nội dung phản hồi kết quả gửi lại GVCN.")
      return
    }

    try {
      setSubmitting(true)
      setErrorMsg("")

      const selectedOption = ACTION_STATUS_OPTIONS.find(o => o.code === status)
      const statusText = selectedOption ? selectedOption.label : "Đã xử lý hỗ trợ"

      const res = await fetch("/api/teacher/grade-entries/respond-homeroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          classId: currentClass?.id,
          subjectId: currentSubject?.id,
          subjectName: currentSubject?.subjectName,
          evaluationPeriod: selectedPeriod,
          academicYearId,
          status,
          statusText,
          responseContent: responseContent.trim()
        })
      })

      const json = await res.json()
      if (json.success) {
        onSaved(student.id, json.gvbmResponse)
        onClose()
      } else {
        setErrorMsg(json.error || "Gửi phản hồi thất bại.")
      }
    } catch (err: any) {
      setErrorMsg("Lỗi kết nối: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-xs">
              <MessageSquare className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wide flex items-center gap-2">
                <span>Tiếp Nhận & Phản Hồi Kết Quả Đến GVCN</span>
                {existingResponse && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[10px] font-black">
                    Đã có phản hồi
                  </span>
                )}
              </h3>
              <p className="text-xs text-teal-200 font-medium">
                Học sinh: <strong className="text-white">{student.studentName}</strong> • Lớp: <strong className="text-white">{currentClass?.className}</strong> • Môn: <strong className="text-white">{currentSubject?.subjectName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Ý kiến PHHS */}
          {coordinationInfo?.parentFeedback && (
            <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-sky-900">
                <span className="flex items-center gap-1.5 uppercase tracking-wide">
                  <User className="w-4 h-4 text-sky-600" />
                  <span>Ý kiến phản hồi từ Phụ huynh học sinh:</span>
                </span>
                <span className="text-[11px] font-semibold text-sky-700">
                  {coordinationInfo.updatedAt ? new Date(coordinationInfo.updatedAt).toLocaleDateString("vi-VN") : ""}
                </span>
              </div>
              <blockquote className="text-xs text-slate-800 italic bg-white/80 p-3 rounded-xl border border-sky-200/80 leading-relaxed font-medium">
                "{coordinationInfo.parentFeedback}"
              </blockquote>
            </div>
          )}

          {/* Section 2: Đề xuất & Lời nhắn từ GVCN */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-purple-900">
              <span className="flex items-center gap-1.5 uppercase tracking-wide">
                <Send className="w-4 h-4 text-purple-600" />
                <span>Đề xuất / Lời nhắn từ Giáo viên Chủ nhiệm:</span>
              </span>
              <span className="text-[11px] font-semibold text-purple-700">
                {coordinationInfo?.homeroomTeacherName || "GVCN"}
              </span>
            </div>
            <div className="text-xs text-purple-950 bg-white/80 p-3 rounded-xl border border-purple-200/80 font-medium leading-relaxed">
              {forwarded?.message ? (
                <span>{forwarded.message}</span>
              ) : (
                <span className="italic text-slate-500">GVCN đã chuyển tiếp thông tin ý kiến của PHHS nhờ GVBM phối hợp theo dõi và hỗ trợ em trong các tiết học.</span>
              )}
            </div>
          </div>

          {/* Section 3: Phản hồi của GVBM */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Trạng thái & Biện pháp phối hợp của GVBM: <span className="text-rose-500">*</span></span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {ACTION_STATUS_OPTIONS.map(opt => (
                  <label
                    key={opt.code}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      status === opt.code
                        ? "bg-teal-50/80 border-teal-500 text-teal-950 ring-1 ring-teal-400"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="actionStatus"
                      value={opt.code}
                      checked={status === opt.code}
                      onChange={(e) => setStatus(e.target.value)}
                      className="mt-0.5 text-teal-600 focus:ring-teal-500 h-4 w-4"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-extrabold">{opt.label}</div>
                      <div className="text-[11px] text-slate-500 font-normal leading-relaxed">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>Nội dung phản hồi / Kết quả xử lý gửi lại GVCN: <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal normal-case">GVCN sẽ nhận được thông báo chuông (Notification)</span>
              </label>
              <textarea
                value={responseContent}
                onChange={(e) => setResponseContent(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none leading-relaxed text-slate-800 resize-none font-medium"
                placeholder="Nhập nội dung Thầy/Cô đã thực hiện hỗ trợ, kết quả tiếp thu hoặc kế hoạch bồi dưỡng tiếp theo cho học sinh..."
              />
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Gợi ý mẫu câu phản hồi nhanh:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((sug, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => handleApplyQuick(sug)}
                    className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 hover:border-teal-300 transition-all font-medium cursor-pointer"
                  >
                    + {sug.slice(0, 48)}...
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Sau khi Thầy/Cô bấm xác nhận, hệ thống sẽ lưu kết quả phản hồi vào sổ điểm và tự động gửi <strong>Thông báo chuông (Notification)</strong> đến tài khoản của Giáo viên Chủ nhiệm lớp {currentClass?.className}.
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? "Đang gửi phản hồi..." : "Xác nhận gửi phản hồi đến GVCN"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
