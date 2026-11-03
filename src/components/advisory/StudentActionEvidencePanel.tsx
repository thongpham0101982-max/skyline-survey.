"use client"

import React, { useState, useEffect } from "react"
import {
  Zap,
  CheckCircle2,
  Clock,
  Plus,
  Save,
  FileCheck,
  ShieldCheck,
  AlertCircle,
  MessageSquare,
  Heart,
  UserCheck
} from "lucide-react"

interface StudentActionEvidencePanelProps {
  studentId: string
  academicYearId: string
  goals: any[]
  existingSheet?: any
  onUpdated?: () => void
}

export default function StudentActionEvidencePanel({
  studentId,
  academicYearId,
  goals = [],
  existingSheet,
  onUpdated
}: StudentActionEvidencePanelProps) {
  const [actionItems, setActionItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [newActionText, setNewActionText] = useState("")
  const [newActionDeadline, setNewActionDeadline] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split("T")[0]
  })
  const [addingAction, setAddingAction] = useState(false)

  // Evidence edit state per item
  const [editingId, setEditingId] = useState<string | null>(null)
  const [evidenceInput, setEvidenceInput] = useState("")
  const [statusInput, setStatusInput] = useState("COMPLETED")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState("")

  async function loadActionItems() {
    if (!studentId) return
    try {
      setLoading(true)
      const res = await fetch(
        `/api/advisory/action-items?studentId=${studentId}&academicYearId=${academicYearId || ""}&_t=${Date.now()}`,
        { cache: "no-store" }
      )
      if (res.ok) {
        const data = await res.json()
        setActionItems(Array.isArray(data.actionItems) ? data.actionItems : [])
      }
    } catch (e) {
      console.error("Load student action items error:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (studentId) {
      loadActionItems()
    }
  }, [studentId, academicYearId, goals.length])

  async function handleAdd7DayAction() {
    if (!newActionText.trim() || !studentId) return
    try {
      setAddingAction(true)
      const res = await fetch("/api/advisory/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          actionDescription: newActionText.trim(),
          assignedToRole: "STUDENT",
          deadline: newActionDeadline || undefined
        })
      })
      if (res.ok) {
        setNewActionText("")
        setToastMsg("✓ Đã thêm kế hoạch hành động 7 ngày mới vào nhật ký!")
        setTimeout(() => setToastMsg(""), 3500)
        await loadActionItems()
        if (onUpdated) onUpdated()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAddingAction(false)
    }
  }

  async function handleSaveActionProgress(item: any, nextStatus?: string, customEvidence?: string) {
    try {
      setSavingId(item.id)
      const effectiveStatus = nextStatus || statusInput
      const effectiveEvidence = customEvidence !== undefined ? customEvidence : evidenceInput

      const res = await fetch("/api/advisory/action-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status: effectiveStatus,
          evidenceNotes: effectiveEvidence
        })
      })
      if (res.ok) {
        setEditingId(null)
        setToastMsg("✓ Đã lưu tiến độ hành động và minh chứng kết quả thành công!")
        setTimeout(() => setToastMsg(""), 3500)
        await loadActionItems()
        if (onUpdated) onUpdated()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingId(null)
    }
  }

  const advisorReviewStatus =
    existingSheet?.advisorReviewStatus ||
    goals[0]?.advisorReviewStatus ||
    (existingSheet?.signedByTeacher ? "CONFIRMED" : existingSheet?.teacherComment ? "NEEDS_ADJUSTMENT" : "PENDING_REVIEW")

  const teacherComment =
    existingSheet?.teacherComment || goals.find(g => g?.teacherComment)?.teacherComment || ""
  const parentMessage =
    existingSheet?.parentMessage || goals.find(g => g?.parentMessage)?.parentMessage || ""

  return (
    <div className="space-y-5">
      {/* 1. KHỐI XEM PHẢN HỒI XÁC NHẬN TỪ GIÁO VIÊN CỐ VẤN & ĐỒNG HÀNH TỪ PHỤ HUYNH */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-teal-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#003B3A] text-white flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block">
                  Phản hồi từ Giáo viên Cố vấn (CVHT)
                </span>
                <h4 className="text-sm font-black text-slate-900">Trạng thái duyệt mục tiêu SMART</h4>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-[11px] font-black border ${
                advisorReviewStatus === "CONFIRMED"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : advisorReviewStatus === "NEEDS_ADJUSTMENT"
                  ? "bg-amber-50 text-amber-900 border-amber-300"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {advisorReviewStatus === "CONFIRMED"
                ? "✓ CVHT đã xác nhận"
                : advisorReviewStatus === "NEEDS_ADJUSTMENT"
                ? "⚡ Đề nghị điều chỉnh"
                : "⏳ Chờ CVHT xác nhận"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/70 text-xs text-teal-950 font-semibold leading-relaxed">
            {teacherComment ? (
              <p>“{teacherComment}”</p>
            ) : (
              <p className="text-slate-500 italic">
                Thầy/Cô Cố vấn học tập đang rà soát mục tiêu SMART của em và sẽ gửi nhận xét xác nhận tại đây.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-amber-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center">
                <Heart className="w-4 h-4 fill-slate-950" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                  Đồng hành từ Gia đình
                </span>
                <h4 className="text-sm font-black text-slate-900">Lời nhắn động viên của Ba Mẹ</h4>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-[11px] font-black border ${
                existingSheet?.signedByParent || parentMessage
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {existingSheet?.signedByParent || parentMessage ? "✓ Đã ký đồng hành" : "Chờ Ba Mẹ xác nhận"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 text-xs text-amber-950 font-semibold leading-relaxed">
            {parentMessage ? (
              <p>“{parentMessage}”</p>
            ) : (
              <p className="text-slate-500 italic">
                Ba Mẹ sẽ xem mục tiêu được chia sẻ của em và gửi lời nhắn động viên đồng hành tại đây.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. NHẬT KÝ HÀNH ĐỘNG 7 NGÀY & MINH CHỨNG KẾT QUẢ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Bước 3 • Theo dõi hành động 7 ngày & Minh chứng</span>
            </div>
            <h3 className="text-base font-black text-[#003B3A]">
              Nhật Ký Hành Động & Minh Chứng Thực Hiện Của Em
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Cập nhật tiến độ các hành động cụ thể trong 7 ngày và ghi lại minh chứng kết quả để đồng bộ trực tiếp tới Thầy/Cô CVHT.
            </p>
          </div>
        </div>

        {toastMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-black flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Form thêm nhanh hành động 7 ngày */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="text"
            value={newActionText}
            onChange={e => setNewActionText(e.target.value)}
            placeholder="Nhập việc cụ thể em cam kết thực hiện trong 7 ngày tới (VD: Hoàn thành 15 bài tập Toán, đọc 20 trang sách/ngày)..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-600"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newActionDeadline}
              onChange={e => setNewActionDeadline(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700"
              title="Hạn hoàn thành (7 ngày)"
            />
            <button
              type="button"
              onClick={handleAdd7DayAction}
              disabled={addingAction || !newActionText.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>{addingAction ? "Đang thêm..." : "Thêm hành động 7 ngày"}</span>
            </button>
          </div>
        </div>

        {/* Danh sách hành động & minh chứng */}
        {loading ? (
          <div className="py-8 text-center text-xs font-bold text-slate-400 animate-pulse">
            Đang tải nhật ký hành động...
          </div>
        ) : actionItems.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
            Chưa có hành động nào trong danh sách. Hãy thêm hành động 7 ngày ở trên hoặc lưu mục tiêu SMART của em nhé!
          </div>
        ) : (
          <div className="space-y-3">
            {actionItems.map(item => {
              const isDone = item.status === "COMPLETED"
              const isEditing = editingId === item.id

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isDone
                      ? "bg-emerald-50/40 border-emerald-200"
                      : item.isOverdue
                      ? "bg-rose-50/40 border-rose-200"
                      : "bg-white border-slate-200 hover:border-teal-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            isDone
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : item.status === "IN_PROGRESS"
                              ? "bg-sky-100 text-sky-800 border-sky-300"
                              : item.isOverdue
                              ? "bg-rose-100 text-rose-800 border-rose-300"
                              : "bg-amber-100 text-amber-900 border-amber-300"
                          }`}
                        >
                          {isDone
                            ? "✓ Đã hoàn thành"
                            : item.status === "IN_PROGRESS"
                            ? "⚡ Đang thực hiện"
                            : item.isOverdue
                            ? "⚠️ Quá hạn"
                            : "⏳ Cần thực hiện"}
                        </span>

                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.source === "CONSULTATION_LOG"
                            ? "Từ phiên cố vấn 1:1"
                            : item.source === "SMART_GOAL_ACTION"
                            ? "Hành động Mục tiêu SMART"
                            : "Kế hoạch 7 ngày"}
                        </span>

                        {item.deadline && (
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Hạn: {new Date(item.deadline).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-extrabold text-slate-900 leading-relaxed">
                        {item.actionDescription}
                      </p>

                      {item.evidenceNotes && !isEditing && (
                        <div className="p-2.5 rounded-xl bg-white border border-emerald-200 text-xs text-emerald-950 font-semibold flex items-start gap-2 mt-1">
                          <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-black uppercase text-emerald-700 block">
                              Minh chứng kết quả thực hiện:
                            </span>
                            <span>{item.evidenceNotes}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => handleSaveActionProgress(item, "COMPLETED", item.evidenceNotes || "Đã hoàn thành đúng kế hoạch")}
                          disabled={savingId === item.id}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đánh dấu Hoàn thành</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(isEditing ? null : item.id)
                          setEvidenceInput(item.evidenceNotes || "")
                          setStatusInput(item.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS")
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-teal-700" />
                        <span>{item.evidenceNotes ? "Sửa minh chứng" : "+ Nộp minh chứng"}</span>
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                            Trạng thái thực hiện:
                          </label>
                          <select
                            value={statusInput}
                            onChange={e => setStatusInput(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                          >
                            <option value="TODO">⏳ Chưa bắt đầu</option>
                            <option value="IN_PROGRESS">⚡ Đang thực hiện</option>
                            <option value="COMPLETED">✓ Đã hoàn thành</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                            Nhật ký kết quả / Minh chứng thực hiện (*):
                          </label>
                          <input
                            type="text"
                            value={evidenceInput}
                            onChange={e => setEvidenceInput(e.target.value)}
                            placeholder="VD: Đã giải xong 15 bài tập trang 42, đạt 9/10 điểm bài kiểm tra 15 phút..."
                            className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveActionProgress(item)}
                          disabled={savingId === item.id}
                          className="px-4 py-1.5 rounded-lg bg-[#003B3A] text-white text-xs font-black flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5 text-amber-300" />
                          <span>{savingId === item.id ? "Đang lưu..." : "Lưu tiến độ & Minh chứng"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
