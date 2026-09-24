"use client"
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react"
import { 
  X, CheckCircle2, XCircle, AlertCircle, Clock, Calendar, 
  User, Award, FileText, AlertTriangle, Send
} from "lucide-react"
import { reviewSupplementalEvaluation } from "../actions"

interface ReviewSupplementalModalProps {
  isOpen: boolean
  onClose: () => void
  slot: any
  registration: any
  currentTeacher: any
  onSuccess: () => void
}

export function ReviewSupplementalModal({
  isOpen,
  onClose,
  slot,
  registration,
  currentTeacher,
  onSuccess
}: ReviewSupplementalModalProps) {
  const [action, setAction] = useState<"APPROVE" | "REJECT" | "REQUEST_REVISION">("APPROVE")
  const [reviewNote, setReviewNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen || !slot || !registration) return null

  const evaluation = registration.evaluation
  const observerTeacher = registration.teacher

  const handleSubmit = async () => {
    setErrorMsg(null)
    if (action !== "APPROVE" && (!reviewNote || !reviewNote.trim())) {
      setErrorMsg(action === "REJECT" ? "Vui lòng nhập lý do từ chối phiếu bổ sung!" : "Vui lòng nhập nội dung hướng dẫn chỉnh sửa!")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await reviewSupplementalEvaluation({
        evaluationId: evaluation?.id,
        registrationId: registration?.id,
        action,
        reviewNote: reviewNote.trim()
      })

      if (res.success) {
        onSuccess()
        onClose()
      } else {
        setErrorMsg(res.error || "Có lỗi xảy ra khi xét duyệt phiếu bổ sung!")
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Lỗi xử lý hệ thống")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#008B82] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider">
                Phiếu dự giờ bổ sung
              </span>
              <h3 className="font-black text-base tracking-wide flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-amber-300" /> XÉT DUYỆT PHIẾU DỰ GIỜ BỔ SUNG
              </h3>
            </div>
            <p className="text-white/80 text-xs mt-1 font-medium">
              Tiết dạy: <strong>{slot.topic}</strong> • Người dự: <strong>{observerTeacher?.teacherName || "Giáo viên dự giờ"}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          
          {/* Thông tin tiết dạy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                Ngày dạy: <strong className="text-slate-900 font-bold">{new Date(slot.date).toLocaleDateString("vi-VN")}</strong> ({slot.startTime})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                Môn & Lớp: <strong className="text-slate-900 font-bold">{slot.subjectName}</strong> - Lớp {slot.className || slot.grade}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Thời gian nộp bổ sung: <strong className="text-slate-900 font-bold">
                  {evaluation?.supplementalSubmittedAt 
                    ? new Date(evaluation.supplementalSubmittedAt).toLocaleString("vi-VN")
                    : (evaluation?.submittedAt ? new Date(evaluation.submittedAt).toLocaleString("vi-VN") : "Gần đây")}
                </strong>
              </span>
            </div>
          </div>

          {/* LÝ DO NỘP BỔ SUNG CỦA GV DỰ GIỜ (Nổi bật) */}
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-black text-amber-900 uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Lý do xin nộp bổ sung từ Giáo viên dự giờ:
            </div>
            <p className="font-semibold text-xs leading-relaxed italic bg-white/80 p-3 rounded-xl border border-amber-200/70 text-slate-800">
              &ldquo;{evaluation?.supplementalReason || "Không có lý do chi tiết ghi nhận"}&rdquo;
            </p>
          </div>

          {/* TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ TRONG PHIẾU */}
          <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <span className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <Award className="w-4 h-4 text-teal-600" /> Kết quả đánh giá
              </span>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-teal-800">
                  {evaluation?.totalScore != null ? `${Number(evaluation.totalScore).toFixed(2).replace(/\.00$/, "")}đ` : "---"}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs">
                  {evaluation?.overallRating || "Đạt"}
                </span>
              </div>
            </div>

            {/* Chi tiết nhận xét */}
            <div className="space-y-2 text-xs">
              {evaluation?.strengths && (
                <div>
                  <span className="font-bold text-slate-700">✅ Ưu điểm / Điểm mạnh:</span>
                  <p className="mt-0.5 p-2 bg-white rounded-xl border border-slate-200 text-slate-800 whitespace-pre-line">
                    {evaluation.strengths}
                  </p>
                </div>
              )}
              {evaluation?.improvements && (
                <div>
                  <span className="font-bold text-rose-700">💡 Góp ý phát triển / Cần cải thiện:</span>
                  <p className="mt-0.5 p-2 bg-white rounded-xl border border-rose-200 text-slate-800 whitespace-pre-line">
                    {evaluation.improvements}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* LỰA CHỌN HÀNH ĐỘNG CỦA GV GIẢNG DẠY */}
          <div className="space-y-3 pt-1">
            <label className="block font-black text-slate-900 uppercase tracking-wide">
              Thầy/Cô chọn hành động xử lý:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setAction("APPROVE")}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  action === "APPROVE"
                    ? "border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-xs"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 ${action === "APPROVE" ? "text-emerald-600" : "text-slate-400"}`} />
                <span className="font-black text-xs">Duyệt phiếu</span>
                <span className="text-[10px] text-center opacity-80">Ghi nhận chính thức & gửi email</span>
              </button>

              <button
                type="button"
                onClick={() => setAction("REQUEST_REVISION")}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  action === "REQUEST_REVISION"
                    ? "border-amber-500 bg-amber-50/80 text-amber-900 shadow-xs"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                }`}
              >
                <AlertCircle className={`w-5 h-5 ${action === "REQUEST_REVISION" ? "text-amber-600" : "text-slate-400"}`} />
                <span className="font-black text-xs">Yêu cầu sửa</span>
                <span className="text-[10px] text-center opacity-80">Trả lại cho GV dự chỉnh sửa</span>
              </button>

              <button
                type="button"
                onClick={() => setAction("REJECT")}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  action === "REJECT"
                    ? "border-rose-500 bg-rose-50/80 text-rose-900 shadow-xs"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                }`}
              >
                <XCircle className={`w-5 h-5 ${action === "REJECT" ? "text-rose-600" : "text-slate-400"}`} />
                <span className="font-black text-xs">Từ chối</span>
                <span className="text-[10px] text-center opacity-80">Không tiếp nhận phiếu này</span>
              </button>
            </div>
          </div>

          {/* Ô NHẬP Ý KIẾN / PHẢN HỒI */}
          <div className="space-y-1.5">
            <label className="block font-black text-slate-800">
              {action === "APPROVE"
                ? "Ghi chú phản hồi của Giáo viên giảng dạy (Tùy chọn):"
                : action === "REQUEST_REVISION"
                ? "Nội dung yêu cầu chỉnh sửa (Bắt buộc) *"
                : "Lý do từ chối phiếu bổ sung (Bắt buộc) *"}
            </label>
            <textarea
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={
                action === "APPROVE"
                  ? "Cảm ơn đồng nghiệp đã dự giờ và đóng góp ý kiến chuyên môn bổ ích..."
                  : action === "REQUEST_REVISION"
                  ? "Ví dụ: Phiếu cần ghi cụ thể hơn phần nhận xét cải thiện về hoạt động nhóm..."
                  : "Ví dụ: Tiết dự giờ không đúng kế hoạch đã thỏa thuận hoặc lý do bổ sung không phù hợp..."
              }
              className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none resize-none"
            />
          </div>

          {/* Lời giải thích tự động theo hành động */}
          {action === "APPROVE" && (
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs font-medium leading-relaxed">
              📧 <strong>Khi Thầy/Cô bấm Duyệt:</strong> Hệ thống sẽ ghi nhận phiếu chính thức, tính vào thống kê chỉ tiêu và <strong>tự động gửi email thông báo kết quả chi tiết</strong> tới hòm thư của Thầy/Cô ({currentTeacher?.email || "Email của GV dạy"}).
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              action === "APPROVE"
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-700/20"
                : action === "REQUEST_REVISION"
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-700/20"
                : "bg-rose-600 hover:bg-rose-700 shadow-rose-700/20"
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  {action === "APPROVE" ? "Xác nhận Duyệt phiếu" : action === "REQUEST_REVISION" ? "Gửi yêu cầu sửa" : "Xác nhận Từ chối"}
                </span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
