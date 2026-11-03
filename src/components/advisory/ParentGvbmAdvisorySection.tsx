"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  BookOpen,
  CheckCircle2,
  Send,
  Target,
  UserCheck,
  RefreshCw,
  Home,
  MessageSquarePlus,
  Check,
  Sparkles
} from "lucide-react"

interface ParentGvbmAdvisorySectionProps {
  studentId: string
  studentName?: string
  academicYearId?: string
  homeroomTeacherName?: string
}

export default function ParentGvbmAdvisorySection({
  studentId,
  studentName = "con",
  academicYearId = "",
  homeroomTeacherName = "GVCN"
}: ParentGvbmAdvisorySectionProps) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({})
  const [followUpChecks, setFollowUpChecks] = useState<Record<string, boolean>>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string>("")

  const loadApprovedTasks = useCallback(async () => {
    if (!studentId) return
    try {
      setLoading(true)
      const res = await fetch(
        `/api/advisory/gvbm-tasks?studentId=${studentId}&academicYearId=${academicYearId || ""}&_t=${Date.now()}`,
        { cache: "no-store" }
      )
      if (res.ok) {
        const json = await res.json()
        setTasks(Array.isArray(json.tasks) ? json.tasks : [])
      }
    } catch (e) {
      console.error("Failed to load approved GVBM tasks:", e)
    } finally {
      setLoading(false)
    }
  }, [studentId, academicYearId])

  useEffect(() => {
    loadApprovedTasks()
  }, [loadApprovedTasks])

  const handleParentConfirm = async (task: any, requestMore = false) => {
    const fb = (feedbackInputs[task.id] ?? task.parentFeedback ?? "").trim()
    const wantFollowUp = requestMore || Boolean(followUpChecks[task.id])

    try {
      setSubmittingId(task.id)
      const res = await fetch("/api/advisory/gvbm-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          action: "PARENT_FEEDBACK",
          parentAcknowledged: true,
          parentFeedback: fb,
          parentRequestFollowUp: wantFollowUp
        })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        setToastMsg(
          json.message || "Đã lưu xác nhận & phản hồi đồng hành của Gia đình vào Hồ sơ học sinh!"
        )
        setTimeout(() => setToastMsg(""), 4000)
        loadApprovedTasks()
      } else {
        alert(json.error || "Không thể gửi phản hồi lúc này.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-teal-50/50 via-white to-slate-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Tư Vấn & Đồng Hành Học Tập Bộ Môn
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200/70">
                {tasks.length} khuyến nghị từ GVBM & CVHT
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Nội dung tư vấn chuyên môn của Giáo viên Bộ môn đã được Thầy/Cô CVHT ({homeroomTeacherName}) phê duyệt gửi Gia đình {studentName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadApprovedTasks}
          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {toastMsg && (
        <div className="mx-4 mt-3 px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="p-8 text-center space-y-1.5">
          <p className="text-xs font-semibold text-slate-600">
            Hiện chưa có nội dung tư vấn bộ môn mới nào được công bố cho {studentName}.
          </p>
          <p className="text-[11px] text-slate-400 max-w-lg mx-auto">
            Khi Thầy/Cô Giáo viên Bộ môn và Cố vấn học tập thống nhất kế hoạch bồi dưỡng hoặc hướng dẫn ôn tập tại nhà cho từng môn học, nội dung sẽ hiển thị tại mục này.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {tasks.map(task => {
            const isAck = Boolean(task.parentAcknowledged || task.status === "PARENT_ACKNOWLEDGED")
            return (
              <div key={task.id} className="p-4 space-y-3 text-xs hover:bg-slate-50/40 transition-colors">
                {/* Top bar: Subject + GVBM + Status */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#003B3A] text-white font-bold text-[11px]">
                      Môn: {task.subjectName}
                    </span>
                    <span className="font-semibold text-slate-800">
                      GVBM tư vấn: {task.assignedToTeacherName || "Giáo viên Bộ môn"}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-[11px] text-teal-700 font-medium flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      CVHT phê duyệt: {task.assignedByTeacherName || homeroomTeacherName}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isAck
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {isAck ? "✓ Gia đình đã xác nhận xem" : "Mới công bố — Chờ Gia đình xác nhận"}
                  </span>
                </div>

                {/* 3 Khối thông tin: Mục tiêu + Biện pháp tại trường + Hướng dẫn phối hợp tại nhà */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-teal-600" />
                      <span>1. Mục tiêu hỗ trợ bộ môn</span>
                    </span>
                    <p className="font-semibold text-slate-900 leading-relaxed">
                      {task.supportGoal || "Cải thiện kiến thức trọng tâm và kết quả học tập"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>2. Biện pháp hỗ trợ của GVBM</span>
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {task.gvbmProposedSolutions ||
                        "Bồi dưỡng chuyên đề trọng tâm và theo dõi sát trên lớp."}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1">
                      <Home className="w-3.5 h-3.5 text-teal-600" />
                      <span>3. Hướng dẫn phối hợp tại nhà</span>
                    </span>
                    <p className="font-semibold text-teal-950 leading-relaxed">
                      “{task.publishedParentAdvice}”
                    </p>
                  </div>
                </div>

                {/* Phản hồi đã lưu của Phụ huynh (nếu có) */}
                {task.parentFeedback && (
                  <div className="px-3 py-2 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong>🏡 Phản hồi của Gia đình:</strong> “{task.parentFeedback}”
                    </div>
                    {task.parentRequestFollowUp && (
                      <span className="px-2 py-0.5 rounded bg-white text-teal-800 border border-teal-200 text-[10px] font-semibold">
                        Đã gửi đề nghị trao đổi thêm cùng GVBM/CVHT
                      </span>
                    )}
                  </div>
                )}

                {/* Thanh thao tác của Phụ huynh: Xác nhận đã xem, gửi phản hồi & đề nghị trao đổi thêm */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={feedbackInputs[task.id] ?? ""}
                      onChange={e =>
                        setFeedbackInputs(prev => ({ ...prev, [task.id]: e.target.value }))
                      }
                      placeholder={
                        task.parentFeedback
                          ? "Bổ sung phản hồi hoặc câu hỏi gửi GVBM & CVHT..."
                          : "Nhập phản hồi của Gia đình về việc phối hợp hỗ trợ con tại nhà..."
                      }
                      className="flex-1 h-8 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600"
                    />

                    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer shrink-0 px-1">
                      <input
                        type="checkbox"
                        checked={
                          followUpChecks[task.id] ?? Boolean(task.parentRequestFollowUp)
                        }
                        onChange={e =>
                          setFollowUpChecks(prev => ({
                            ...prev,
                            [task.id]: e.target.checked
                          }))
                        }
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <MessageSquarePlus className="w-3.5 h-3.5 text-teal-600" />
                      <span>Đề nghị trao đổi thêm</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={submittingId === task.id}
                    onClick={() => handleParentConfirm(task)}
                    className={`h-8 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                      isAck && !feedbackInputs[task.id]?.trim()
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        : "bg-teal-700 hover:bg-teal-800 text-white"
                    }`}
                  >
                    {isAck && !feedbackInputs[task.id]?.trim() ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã xác nhận xem</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {submittingId === task.id
                            ? "Đang gửi..."
                            : "Xác nhận đã xem & Gửi phản hồi"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
