"use client"

import { useState, useEffect } from "react"
import {
  X,
  MessageSquare,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  UserCheck,
  Users,
  Printer,
  Edit3,
  AlertCircle,
  Send
} from "lucide-react"
import toast from "react-hot-toast"

interface Props {
  isOpen: boolean
  onClose: () => void
  student: any
  academicYearId: string
  selectedPeriod: string
  periodLabel: string
  teacherName: string
  onSaved?: (updated: {
    studentId: string
    teacherRemark: string
    teacherRemarkDate: any
    parentFeedback: string
    parentFeedbackDate: any
  }) => void
  onOpenReport?: (studentId: string) => void
  onOpenForward?: (student: any) => void
}

export function HomeroomFeedbackModal({
  isOpen,
  onClose,
  student,
  academicYearId,
  selectedPeriod,
  periodLabel,
  teacherName,
  onSaved,
  onOpenReport,
  onOpenForward
}: Props) {
  const [teacherRemark, setTeacherRemark] = useState("")
  const [parentFeedback, setParentFeedback] = useState("")
  const [isEditingParent, setIsEditingParent] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (student) {
      setTeacherRemark(student.teacherRemark || "")
      setParentFeedback(student.parentFeedback || "")
      setIsEditingParent(false)
    }
  }, [student, isOpen])

  if (!isOpen || !student) return null

  const gpa = student.gpa !== null && student.gpa !== undefined ? Number(student.gpa) : null
  const studentName = student.studentName || "Học sinh"
  const defaultRemark = `Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh ${studentName}. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh thần học tập tích cực.`

  // Smart suggestions based on GPA & weaknesses
  const getSuggestions = () => {
    const list: string[] = []
    if (gpa !== null) {
      if (gpa >= 8.0) {
        list.push(
          "Con chăm ngoan, nắm vững kiến thức, phát huy rất tốt phong độ học tập.",
          "Kết quả xuất sắc, chủ động tích cực trong giờ học. Tiếp tục duy trì phong độ!",
          "Năng lực tiếp thu bài rất nhanh, hoàn thành xuất sắc các mục tiêu khảo sát."
        )
      } else if (gpa >= 6.5) {
        list.push(
          "Con có ý thức học tập tốt, cần rèn luyện thêm kỹ năng làm bài tự luận để nâng cao điểm số.",
          "Con tiến bộ rõ rệt, cần tập trung củng cố thêm các nội dung nâng cao.",
          "Thái độ học tập nghiêm túc, chú ý rèn tính cẩn thận khi tính toán và làm bài."
        )
      } else if (gpa >= 5.0) {
        list.push(
          "Con cơ bản hoàn thành bài thi, cần tăng cường ôn tập các phần kiến thức cốt lõi và làm bài tập về nhà đầy đủ hơn.",
          "Cần chủ động đặt câu hỏi khi chưa hiểu bài trên lớp và tăng thời lượng tự học tại nhà.",
          "Con cần nỗ lực hơn để bứt phá lên mức Khá trong các kỳ khảo sát tiếp theo."
        )
      } else {
        list.push(
          "Con cần tập trung hơn trong giờ học và tăng cường phụ đạo, gia đình phối hợp đôn đốc con tự học ở nhà.",
          "Điểm khảo sát chưa đạt chuẩn, đề nghị con tham gia đầy đủ các buổi bồi dưỡng/phụ đạo của trường.",
          "Gia đình và GVCN cần đồng hành chặt chẽ để hỗ trợ con lấp lỗ hổng kiến thức kịp thời."
        )
      }
    } else {
      list.push(
        "Con có tinh thần tham gia kỳ khảo sát đầy đủ.",
        "Cần tiếp tục cố gắng trong các môn học để đạt kết quả tốt nhất."
      )
    }
    return list
  }

  const suggestions = getSuggestions()

  const handleSave = async (andOpenReport = false) => {
    setSaving(true)
    try {
      const res = await fetch("/api/teacher/homeroom-grades/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.studentId,
          academicYearId,
          evaluationPeriod: selectedPeriod,
          teacherRemark: teacherRemark.trim(),
          parentFeedback: isEditingParent ? parentFeedback.trim() : student.parentFeedback || ""
        })
      })

      const json = await res.json()
      if (json.success) {
        toast.success(json.message || "Đã lưu nhận xét thành công!")
        if (onSaved) {
          onSaved({
            studentId: student.studentId,
            teacherRemark: json.teacherRemark,
            teacherRemarkDate: json.teacherRemarkDate,
            parentFeedback: json.parentFeedback,
            parentFeedbackDate: json.parentFeedbackDate
          })
        }
        if (andOpenReport) {
          onClose()
          if (onOpenReport) {
            onOpenReport(student.studentId)
          }
        } else {
          onClose()
        }
      } else {
        toast.error(json.error || "Lưu nhận xét thất bại")
      }
    } catch (e: any) {
      console.error("Lỗi lưu nhận xét:", e)
      toast.error("Lỗi kết nối khi lưu nhận xét")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#009085] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs">
              <MessageSquare className="h-5 w-5 text-teal-200" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Ý kiến & Nhận xét của GVCN • Trao đổi PHHS
              </h3>
              <p className="text-xs text-teal-100 font-medium">
                Học sinh: <strong className="text-white font-bold">{studentName}</strong> ({student.studentCode}) • Kỳ: <span className="font-semibold text-amber-200">{periodLabel}</span>
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
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-xs">
          
          {/* Student mini summary card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div>
              <span className="text-[10.5px] text-slate-500 font-bold block">ĐTB Lớp:</span>
              <span className="text-sm font-black text-[#009085]">
                {gpa !== null ? gpa.toFixed(1) : "-"}
              </span>
            </div>
            <div>
              <span className="text-[10.5px] text-slate-500 font-bold block">Môn &lt; TB (&lt;5):</span>
              <span className={`text-xs font-black ${student.belowAverageCount > 0 ? "text-rose-600" : "text-slate-700"}`}>
                {student.belowAverageCount} môn
              </span>
            </div>
            <div>
              <span className="text-[10.5px] text-slate-500 font-bold block">Môn &lt; Chuẩn:</span>
              <span className={`text-xs font-black ${student.belowBenchmarkCount > 0 ? "text-amber-600" : "text-slate-700"}`}>
                {student.belowBenchmarkCount} môn
              </span>
            </div>
            <div>
              <span className="text-[10.5px] text-slate-500 font-bold block">GVCN:</span>
              <span className="text-xs font-bold text-slate-800 truncate block">
                {teacherName}
              </span>
            </div>
          </div>

          {/* Section 1: Teacher Remark */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#005B58] uppercase tracking-wide flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-teal-600" />
                <span>1. Ý kiến & Nhận xét của GVCN:</span>
              </label>
              <button
                type="button"
                onClick={() => setTeacherRemark(defaultRemark)}
                className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors cursor-pointer"
                title="Áp dụng nhận xét chuẩn mực theo tên học sinh"
              >
                Dùng nhận xét chuẩn
              </button>
            </div>

            <textarea
              rows={4}
              value={teacherRemark}
              onChange={(e) => setTeacherRemark(e.target.value)}
              placeholder="Nhập ý kiến & nhận xét của Giáo viên Chủ nhiệm (thái độ học tập, nề nếp, điểm mạnh, định hướng khắc phục môn yếu...)"
              className="w-full bg-slate-50/70 border border-slate-300 rounded-2xl p-3.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-[#009085] leading-relaxed resize-none"
            />

            {/* Quick suggestions chips */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Gợi ý nhận xét nhanh theo năng lực:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setTeacherRemark((prev) => (prev.trim() ? `${prev.trim()} ${sug}` : sug))
                    }}
                    className="text-[11px] text-slate-700 bg-white hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200 px-3 py-1.5 rounded-xl transition-all text-left shadow-2xs cursor-pointer leading-snug"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Parent Feedback */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#0369a1] uppercase tracking-wide flex items-center gap-1.5">
                <Users className="h-4 w-4 text-sky-600" />
                <span>2. Ý kiến phản hồi của Phụ huynh (PHHS):</span>
              </label>
              
              {!isEditingParent && (
                <button
                  type="button"
                  onClick={() => setIsEditingParent(true)}
                  className="text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{parentFeedback ? "Sửa ý kiến PHHS" : "Ghi nhận ý kiến PHHS"}</span>
                </button>
              )}
            </div>

            {/* Display online feedback if exists and not editing */}
            {!isEditingParent && parentFeedback ? (
              <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-extrabold text-sky-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Đã nhận phản hồi từ Cổng Phụ huynh
                  </span>
                  {student.parentFeedbackDate && (
                    <span className="text-slate-500 font-medium">
                      {new Date(student.parentFeedbackDate).toLocaleDateString("vi-VN")}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-800 italic leading-relaxed bg-white/90 p-3 rounded-xl border border-sky-100">
                  &ldquo;{parentFeedback}&rdquo;
                </p>
              </div>
            ) : isEditingParent ? (
              <div className="space-y-2 bg-sky-50/40 p-3 rounded-2xl border border-sky-200">
                <textarea
                  rows={3}
                  value={parentFeedback}
                  onChange={(e) => setParentFeedback(e.target.value)}
                  placeholder="Ghi nhận ý kiến, chia sẻ của PHHS (qua Cổng phụ huynh, điện thoại, Zalo hoặc trao đổi trực tiếp)..."
                  className="w-full bg-white border border-sky-300 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 leading-relaxed resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setParentFeedback(student.parentFeedback || "")
                      setIsEditingParent(false)
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 px-3 py-1 cursor-pointer"
                  >
                    Hủy chỉnh sửa
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-slate-500 text-xs">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Chưa có phản hồi trực tuyến từ PHHS qua Cổng phụ huynh cho kỳ khảo sát này.</span>
              </div>
            )}
          </div>

          {/* Section 3: Forward to GVBM Status */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <label className="text-xs font-black text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
              <Send className="h-4 w-4 text-blue-600" />
              <span>3. Phối hợp & Trạng thái chuyển đến Giáo viên Bộ môn (GVBM):</span>
            </label>

            {student.forwardedGvbm ? (
              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-extrabold text-blue-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    Đã chuyển tiếp thông tin tới GVBM {student.forwardedGvbm.teacherName}
                  </span>
                  {student.forwardedGvbm.forwardedAt && (
                    <span className="text-slate-500 font-medium">
                      {new Date(student.forwardedGvbm.forwardedAt).toLocaleDateString("vi-VN")}
                    </span>
                  )}
                </div>

                <div className="bg-white/90 p-3 rounded-xl border border-blue-100 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-600">Bộ môn:</span>
                    <span className="font-extrabold text-blue-900">{student.forwardedGvbm.subjectName}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-slate-600">Giáo viên:</span>
                    <span className="font-extrabold text-slate-900">{student.forwardedGvbm.teacherName}</span>
                  </div>
                  {student.forwardedGvbm.message && (
                    <div className="text-xs text-slate-700 italic pt-0.5">
                      <span className="font-semibold text-slate-500 not-italic">Lời nhắn: </span>
                      &ldquo;{student.forwardedGvbm.message}&rdquo;
                    </div>
                  )}
                </div>

                {onOpenForward && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onOpenForward(student)
                      }}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Chuyển lại / Đổi môn khác</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-slate-600 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Chưa chuyển thông tin này cho Giáo viên Bộ môn.</span>
                </div>
                {onOpenForward && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onOpenForward(student)
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Chuyển đến GVBM</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-[#005B58] border border-teal-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Lưu & Xem Phiếu điểm</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="px-5 py-2 bg-gradient-to-r from-[#003B3A] to-[#009085] hover:from-teal-900 hover:to-[#005B58] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Đang lưu..." : "Lưu nhận xét"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
