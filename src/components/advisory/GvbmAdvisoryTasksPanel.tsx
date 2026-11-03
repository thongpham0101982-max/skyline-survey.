"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Send,
  Sparkles,
  Target,
  UserCheck,
  RefreshCw,
  Share2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check
} from "lucide-react"

interface GvbmAdvisoryTasksPanelProps {
  mode: "GVBM" | "CVHT"
  academicYearId?: string
  classId?: string
  studentId?: string
  compact?: boolean
}

export default function GvbmAdvisoryTasksPanel({
  mode,
  academicYearId = "",
  classId = "",
  studentId = "",
  compact = false
}: GvbmAdvisoryTasksPanelProps) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  // Form states cho GVBM
  const [assessmentInput, setAssessmentInput] = useState<Record<string, string>>({})
  const [solutionsInput, setSolutionsInput] = useState<Record<string, string>>({})
  const [parentAdviceInput, setParentAdviceInput] = useState<Record<string, string>>({})
  const [goalInput, setGoalInput] = useState<Record<string, string>>({})

  // Form states cho CVHT duyệt
  const [publishAdviceInput, setPublishAdviceInput] = useState<Record<string, string>>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string>("")

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (studentId) params.set("studentId", studentId)
      if (classId) params.set("classId", classId)
      if (academicYearId) params.set("academicYearId", academicYearId)
      if (mode === "GVBM" && !studentId) params.set("myTasks", "true")
      if (mode === "CVHT" && !studentId) params.set("assignedByMe", "true")
      params.set("_t", String(Date.now()))

      const res = await fetch(`/api/advisory/gvbm-tasks?${params.toString()}`, {
        cache: "no-store"
      })
      if (res.ok) {
        const json = await res.json()
        const list = Array.isArray(json.tasks) ? json.tasks : []
        setTasks(list)
        if (list.length > 0 && !expandedTaskId) {
          const firstPending = list.find(
            (t: any) =>
              (mode === "GVBM" && t.status === "ASSIGNED") ||
              (mode === "CVHT" && t.status === "GVBM_RESPONDED")
          )
          if (firstPending) setExpandedTaskId(firstPending.id)
        }
      }
    } catch (e) {
      console.error("Load GVBM tasks error:", e)
    } finally {
      setLoading(false)
    }
  }, [mode, academicYearId, classId, studentId, expandedTaskId])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleGvbmSubmit = async (task: any) => {
    const assessment = (
      assessmentInput[task.id] ??
      task.gvbmProfessionalAssessment ??
      ""
    ).trim()
    const solutions = (
      solutionsInput[task.id] ??
      task.gvbmProposedSolutions ??
      ""
    ).trim()
    const parentAdvice = (
      parentAdviceInput[task.id] ??
      task.gvbmParentAdvice ??
      ""
    ).trim()
    const supportGoal = (goalInput[task.id] ?? task.supportGoal ?? "").trim()

    if (!assessment && !solutions && !parentAdvice) {
      alert("Vui lòng nhập nhận định chuyên môn, đề xuất giải pháp và nội dung tư vấn dành cho PHHS.")
      return
    }

    try {
      setSubmittingId(task.id)
      const res = await fetch("/api/advisory/gvbm-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          action: "GVBM_RESPOND",
          gvbmProfessionalAssessment: assessment,
          gvbmProposedSolutions: solutions,
          gvbmParentAdvice: parentAdvice,
          supportGoal
        })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        setToastMsg(json.message || "Đã gửi nhận định chuyên môn và tư vấn về CVHT để rà soát!")
        setTimeout(() => setToastMsg(""), 4000)
        loadTasks()
      } else {
        alert(json.error || "Không thể gửi phản hồi.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmittingId(null)
    }
  }

  const handleCvhtApprove = async (task: any) => {
    const publishedParentAdvice = (
      publishAdviceInput[task.id] ??
      task.publishedParentAdvice ??
      task.gvbmParentAdvice ??
      task.gvbmProposedSolutions ??
      ""
    ).trim()

    if (!publishedParentAdvice) {
      alert("Vui lòng kiểm tra Nội dung tư vấn dành cho PHHS trước khi phê duyệt công bố.")
      return
    }

    try {
      setSubmittingId(task.id)
      const res = await fetch("/api/advisory/gvbm-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          action: "CVHT_APPROVE_PUBLISH",
          publishedParentAdvice
        })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        setToastMsg(json.message || "Đã phê duyệt và công bố tư vấn bộ môn tới PHHS!")
        setTimeout(() => setToastMsg(""), 4000)
        loadTasks()
      } else {
        alert(json.error || "Không thể phê duyệt.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmittingId(null)
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (statusFilter === "ALL") return true
    return t.status === statusFilter
  })

  const pendingGvbmCount = tasks.filter(t => t.status === "ASSIGNED").length
  const pendingCvhtReviewCount = tasks.filter(t => t.status === "GVBM_RESPONDED").length

  if (compact && tasks.length === 0 && !loading) {
    return null
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/85 shadow-2xs overflow-hidden">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-teal-50/40 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#003B3A] text-amber-300 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {mode === "GVBM"
                  ? "Nhiệm Vụ Tư Vấn Học Sinh Từ CVHT (Sổ Giáo Viên Bộ Môn)"
                  : "Theo Dõi Phân Công GVBM & Phê Duyệt Tư Vấn Gửi PHHS"}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200/70 text-slate-800">
                {tasks.length} nhiệm vụ
              </span>
              {mode === "GVBM" && pendingGvbmCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  {pendingGvbmCount} cần tư vấn
                </span>
              )}
              {mode === "CVHT" && pendingCvhtReviewCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                  {pendingCvhtReviewCount} chờ CVHT duyệt gửi PHHS
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {mode === "GVBM"
                ? "Xem dữ liệu học tập liên quan, nhập nhận định chuyên môn, giải pháp và nội dung tư vấn dành cho PHHS"
                : "Rà soát phản hồi chuyên môn từ GVBM và phê duyệt nội dung công bố sang Cổng Phụ huynh"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/70 text-[11px]">
            {[
              { id: "ALL", label: "Tất cả" },
              { id: "ASSIGNED", label: "Chờ GVBM" },
              { id: "GVBM_RESPONDED", label: "Chờ CVHT duyệt" },
              { id: "APPROVED_FOR_PARENT", label: "Đã gửi PHHS" }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                  statusFilter === tab.id
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={loadTasks}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="mx-4 mt-3 px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {filteredTasks.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400">
          Hiện chưa có nhiệm vụ tư vấn bộ môn nào ở trạng thái này.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filteredTasks.map(task => {
            const isExpanded = expandedTaskId === task.id
            const isPublished =
              task.status === "APPROVED_FOR_PARENT" || task.status === "PARENT_ACKNOWLEDGED"

            return (
              <div key={task.id} className="p-4 hover:bg-slate-50/40 transition-colors space-y-3 text-xs">
                {/* Summary Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#003B3A] text-white font-semibold text-[11px]">
                      {task.subjectName}
                    </span>
                    <span className="font-bold text-slate-900">
                      HS: {task.studentName || "Học sinh"}{" "}
                      {task.className ? `(${task.className})` : ""}
                    </span>
                    {typeof task.currentScore === "number" && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                        Điểm hiện tại: {task.currentScore} đ
                      </span>
                    )}
                    <span className="text-slate-500 text-[11px]">
                      • {mode === "GVBM" ? `CVHT giao: ${task.assignedByTeacherName || "GVCN"}` : `GVBM: ${task.assignedToTeacherName || "GVBM"}`}
                    </span>
                    {task.dueDate && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-teal-600" />
                        Hạn: {new Date(task.dueDate).toLocaleDateString("vi-VN")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        task.status === "PARENT_ACKNOWLEDGED"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : task.status === "APPROVED_FOR_PARENT"
                          ? "bg-teal-50 text-teal-700 border-teal-200"
                          : task.status === "GVBM_RESPONDED"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {task.status === "PARENT_ACKNOWLEDGED"
                        ? "✓ PHHS Đã Xác Nhận"
                        : task.status === "APPROVED_FOR_PARENT"
                        ? "🟢 Đã Công Bố PHHS"
                        : task.status === "GVBM_RESPONDED"
                        ? "🔵 GVBM Đã Tư Vấn (Chờ CVHT Duyệt)"
                        : "⏳ Chờ GVBM Tư Vấn"}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTaskId(prev => (prev === task.id ? null : task.id))
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? "Thu gọn" : "Chi tiết & Xử lý"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Detail & Form */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    {/* Khối dữ liệu học tập liên quan (RBAC cho GVBM) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <span className="text-[11px] font-bold text-slate-600 uppercase block">
                          1. Nội dung CVHT đề nghị tư vấn & Mục tiêu:
                        </span>
                        <p className="font-semibold text-teal-800">
                          🎯 Mục tiêu: {task.supportGoal}
                        </p>
                        <p className="text-slate-700 leading-relaxed">{task.consultationPrompt}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <span className="text-[11px] font-bold text-slate-600 uppercase block">
                          2. Dữ liệu Mục tiêu SMART của Học sinh (Theo phân quyền):
                        </span>
                        {Array.isArray(task.studentGoals) && task.studentGoals.length > 0 ? (
                          <ul className="space-y-1 text-[11px] text-slate-700">
                            {task.studentGoals.slice(0, 3).map((g: any, i: number) => (
                              <li key={i} className="truncate">
                                • <strong>{g.category}:</strong> {g.targetText}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            Điểm hiện tại môn {task.subjectName}:{" "}
                            {typeof task.currentScore === "number"
                              ? `${task.currentScore} đ`
                              : "Đang cập nhật"}
                          </p>
                        )}
                      </div>
                    </div>

                    {mode === "GVBM" ? (
                      /* FORM DÀNH CHO GVBM NHẬP NHẬN ĐỊNH, GIẢI PHÁP & NỘI DUNG PHHS */
                      <div className="p-3.5 rounded-xl bg-teal-50/40 border border-teal-200/80 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                            <span>Phản hồi Chuyên môn của Giáo viên Bộ môn ({task.subjectName})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const sName = task.studentName || "em"
                              const subj = task.subjectName
                              setAssessmentInput(prev => ({
                                ...prev,
                                [task.id]:
                                  prev[task.id] ||
                                  `Qua theo dõi trên lớp, ${sName} nắm được lý thuyết cơ bản môn ${subj} nhưng còn mất điểm ở phần vận dụng và phân bổ thời gian làm bài.`
                              }))
                              setSolutionsInput(prev => ({
                                ...prev,
                                [task.id]:
                                  prev[task.id] ||
                                  `GVBM giao thêm phiếu bài tập chuyên đề trọng tâm môn ${subj} mỗi tuần và kèm cặp trực tiếp 15 phút trong giờ tự học.`
                              }))
                              setParentAdviceInput(prev => ({
                                ...prev,
                                [task.id]:
                                  prev[task.id] ||
                                  `Kính nhờ Gia đình đồng hành nhắc nhở con dành 30 phút mỗi tối ôn lại các dạng bài tập môn ${subj} đã sửa trên lớp và hoàn thành phiếu bài tập tuần.`
                              }))
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-teal-700 text-[11px] font-semibold hover:bg-teal-50 cursor-pointer"
                          >
                            ✨ Điền nhanh gợi ý mẫu
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-slate-700">
                              1. Nhận định chuyên môn (Lưu nội bộ giữa GVBM & CVHT) *
                            </label>
                            <textarea
                              rows={2}
                              value={
                                assessmentInput[task.id] ??
                                task.gvbmProfessionalAssessment ??
                                ""
                              }
                              onChange={e =>
                                setAssessmentInput(prev => ({
                                  ...prev,
                                  [task.id]: e.target.value
                                }))
                              }
                              placeholder="Đánh giá mức độ tiếp thu, lỗ hổng kiến thức hoặc kỹ năng làm bài của học sinh..."
                              className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-slate-700">
                              2. Đề xuất giải pháp & Mục tiêu hỗ trợ học tập *
                            </label>
                            <textarea
                              rows={2}
                              value={
                                solutionsInput[task.id] ??
                                task.gvbmProposedSolutions ??
                                ""
                              }
                              onChange={e =>
                                setSolutionsInput(prev => ({
                                  ...prev,
                                  [task.id]: e.target.value
                                }))
                              }
                              placeholder="Biện pháp bồi dưỡng trên lớp, tài liệu giao thêm và mục tiêu điểm số..."
                              className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-teal-900">
                            3. Nội dung tư vấn dành riêng cho PHHS (Sẽ gửi PHHS sau khi CVHT phê duyệt) *
                          </label>
                          <textarea
                            rows={2}
                            value={
                              parentAdviceInput[task.id] ?? task.gvbmParentAdvice ?? ""
                            }
                            onChange={e =>
                              setParentAdviceInput(prev => ({
                                ...prev,
                                [task.id]: e.target.value
                              }))
                            }
                            placeholder="Nhập hướng dẫn phối hợp cụ thể tại nhà dành cho Phụ huynh (ngôn từ tích cực, rõ ràng, dễ thực hiện)..."
                            className="w-full p-2.5 rounded-lg bg-white border border-teal-300 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={submittingId === task.id}
                            onClick={() => handleGvbmSubmit(task)}
                            className="px-4 py-2 rounded-lg bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5 text-amber-300" />
                            <span>
                              {submittingId === task.id
                                ? "Đang gửi..."
                                : "Gửi phản hồi về CVHT rà soát"}
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* KHỐI RÀ SOÁT & PHÊ DUYỆT DÀNH CHO CVHT */
                      <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-200/80 space-y-2.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                          <div>
                            <span className="font-semibold text-slate-500 block">
                              Nhận định chuyên môn từ GVBM (Nội bộ):
                            </span>
                            <p className="text-slate-800 font-medium">
                              {task.gvbmProfessionalAssessment || "Chưa có nhận định"}
                            </p>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500 block">
                              Đề xuất giải pháp của GVBM:
                            </span>
                            <p className="text-slate-800 font-medium">
                              {task.gvbmProposedSolutions || "Chưa có giải pháp"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-teal-200/60">
                          <label className="block text-[11px] font-bold text-teal-900">
                            Nội dung tư vấn công bố cho PHHS (CVHT kiểm duyệt):
                          </label>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              value={
                                publishAdviceInput[task.id] ??
                                task.publishedParentAdvice ??
                                task.gvbmParentAdvice ??
                                task.gvbmProposedSolutions ??
                                ""
                              }
                              onChange={e =>
                                setPublishAdviceInput(prev => ({
                                  ...prev,
                                  [task.id]: e.target.value
                                }))
                              }
                              placeholder="Nội dung tư vấn và hướng dẫn phối hợp tại nhà gửi tới PHHS..."
                              className="flex-1 h-8 px-2.5 rounded-lg bg-white border border-teal-300 text-xs text-slate-800"
                            />
                            <button
                              type="button"
                              disabled={submittingId === task.id}
                              onClick={() => handleCvhtApprove(task)}
                              className="h-8 px-3.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>
                                {isPublished ? "Cập nhật công bố PHHS" : "Phê duyệt & Gửi PHHS"}
                              </span>
                            </button>
                          </div>
                        </div>

                        {task.parentFeedback && (
                          <div className="p-2.5 rounded-lg bg-white border border-emerald-200 text-[11px] text-emerald-900">
                            <strong>🏡 Phản hồi từ PHHS:</strong> “{task.parentFeedback}”
                            {task.parentRequestFollowUp && (
                              <span className="ml-2 px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">
                                Đề nghị trao đổi thêm
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
