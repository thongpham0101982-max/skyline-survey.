"use client"

import React, { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Award, Loader2, Plus, Trash2, X } from "lucide-react"
import type { RecognitionGroupType, RecognitionRecordItem } from "@/lib/teacher-quality/types"

interface TeacherOption {
  id: string
  teacherCode: string
  teacherName: string
}

interface RecognitionModalProps {
  open: boolean
  groupType: Exclude<RecognitionGroupType, "PARENT_NPS">
  academicYearId: string
  teachers: TeacherOption[]
  defaultTeacherId?: string | null
  lockTeacher?: boolean
  editingRecord?: RecognitionRecordItem | null
  onClose: () => void
  onSaved: () => void
}

const GROUP_TITLES: Record<Exclude<RecognitionGroupType, "PARENT_NPS">, string> = {
  DEPT_AWARD: "Khen thưởng Sở, ngành",
  SYSTEM_AWARD: "Khen thưởng hệ thống",
  STUDENT_COMPETITION: "Bồi dưỡng HS các kỳ thi",
  AI_TECH: "Ứng dụng AI và công nghệ",
}

export function RecognitionModal({
  open,
  groupType,
  academicYearId,
  teachers,
  defaultTeacherId,
  lockTeacher = false,
  editingRecord,
  onClose,
  onSaved,
}: RecognitionModalProps) {
  const [teacherEntries, setTeacherEntries] = useState<Array<{ teacherId: string; teacherRole: string }>>([
    { teacherId: "", teacherRole: "" },
  ])
  const [title, setTitle] = useState("")
  const [issuingAuthority, setIssuingAuthority] = useState("")
  const [awardScope, setAwardScope] = useState("")
  const [eventBatch, setEventBatch] = useState("")
  const [participantCount, setParticipantCount] = useState("")
  const [resultSummary, setResultSummary] = useState("")
  const [recordedDate, setRecordedDate] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editingRecord) {
      setTeacherEntries([
        { teacherId: editingRecord.teacherId, teacherRole: editingRecord.teacherRole || "" },
      ])
      setTitle(editingRecord.title || "")
      setIssuingAuthority(editingRecord.issuingAuthority || "")
      setAwardScope(editingRecord.awardScope || "")
      setEventBatch(editingRecord.eventBatch || "")
      setParticipantCount(
        editingRecord.participantCount !== null && editingRecord.participantCount !== undefined
          ? String(editingRecord.participantCount)
          : ""
      )
      setResultSummary(editingRecord.resultSummary || "")
      setRecordedDate(editingRecord.recordedDate || "")
      setNotes(editingRecord.notes || "")
    } else {
      const initialTid =
        defaultTeacherId && defaultTeacherId !== "ALL"
          ? defaultTeacherId
          : teachers[0]?.id || ""
      setTeacherEntries([
        {
          teacherId: initialTid,
          teacherRole: groupType === "STUDENT_COMPETITION" ? "GV bồi dưỡng chính" : "",
        },
      ])
      setTitle("")
      setIssuingAuthority("")
      setAwardScope(groupType === "SYSTEM_AWARD" ? "Cấp hệ thống" : "")
      setEventBatch("")
      setParticipantCount("")
      setResultSummary("")
      setRecordedDate(new Date().toISOString().slice(0, 10))
      setNotes("")
    }
  }, [open, editingRecord, defaultTeacherId, teachers, groupType])

  if (!open) return null

  const isEdit = Boolean(editingRecord)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Vui lòng nhập nội dung / danh hiệu")
      return
    }
    const validEntries = teacherEntries.filter((x) => x.teacherId)
    if (validEntries.length === 0) {
      toast.error("Vui lòng chọn ít nhất một giáo viên")
      return
    }

    setSaving(true)
    try {
      if (isEdit && editingRecord) {
        const res = await fetch(`/api/admin/teacher-quality/recognitions/${editingRecord.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            issuingAuthority: issuingAuthority.trim() || null,
            awardScope: awardScope.trim() || null,
            eventBatch: eventBatch.trim() || null,
            teacherRole: validEntries[0].teacherRole.trim() || null,
            participantCount: participantCount ? Number(participantCount) : null,
            resultSummary: resultSummary.trim() || null,
            recordedDate: recordedDate.trim() || null,
            notes: notes.trim() || null,
          }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || "Không thể cập nhật")
        toast.success("Đã cập nhật bản ghi")
      } else {
        const res = await fetch("/api/admin/teacher-quality/recognitions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupType,
            academicYearId,
            teacherEntries: validEntries,
            title: title.trim(),
            issuingAuthority: issuingAuthority.trim() || null,
            awardScope: awardScope.trim() || null,
            eventBatch: eventBatch.trim() || null,
            participantCount: participantCount ? Number(participantCount) : null,
            resultSummary: resultSummary.trim() || null,
            recordedDate: recordedDate.trim() || null,
            notes: notes.trim() || null,
          }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || "Không thể lưu bản ghi")
        toast.success("Đã lưu ghi nhận trực tiếp")
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi lưu")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-xl rounded-2xl border border-[#E2E8F0] bg-white shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-[#003B3A] bg-[#003B3A] px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#5EEAD4]" />
            <div>
              <h3 className="text-sm font-semibold">
                {isEdit ? "Chỉnh sửa ghi nhận" : "Thêm mới ghi nhận"} · {GROUP_TITLES[groupType]}
              </h3>
              <p className="text-[11px] text-teal-100 mt-0.5">
                Lưu trực tiếp vào hồ sơ năm học, không yêu cầu minh chứng hay xét duyệt riêng.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-teal-100 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-3.5 text-xs">
          {/* Teacher selection (multi-teacher supported for STUDENT_COMPETITION) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">
                Giáo viên ghi nhận <span className="text-rose-600">*</span>
              </label>
              {!isEdit && groupType === "STUDENT_COMPETITION" && !lockTeacher && (
                <button
                  type="button"
                  onClick={() =>
                    setTeacherEntries((prev) => [
                      ...prev,
                      { teacherId: "", teacherRole: "GV đồng hướng dẫn" },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#008B85] hover:text-[#003B3A]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm GV cùng phụ trách
                </button>
              )}
            </div>

            {teacherEntries.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={entry.teacherId}
                  disabled={isEdit || lockTeacher}
                  onChange={(e) =>
                    setTeacherEntries((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, teacherId: e.target.value } : x))
                    )
                  }
                  className="flex-1 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-slate-800 disabled:bg-slate-50 focus:border-[#00A19A] focus:outline-none"
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teacherName} ({t.teacherCode})
                    </option>
                  ))}
                </select>

                {groupType === "STUDENT_COMPETITION" && (
                  <input
                    type="text"
                    value={entry.teacherRole}
                    onChange={(e) =>
                      setTeacherEntries((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, teacherRole: e.target.value } : x))
                      )
                    }
                    placeholder="Vai trò GV (VD: GV bồi dưỡng chính)"
                    className="w-44 rounded-xl border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-[#00A19A] focus:outline-none"
                  />
                )}

                {teacherEntries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setTeacherEntries((prev) => prev.filter((_, i) => i !== idx))}
                    className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {groupType === "STUDENT_COMPETITION" && teacherEntries.length > 1 && (
              <p className="text-[11px] text-[#00736E]">
                Hồ sơ từng GV sẽ hiển thị vai trò tương ứng; báo cáo tổng hợp tự động chỉ đếm kết quả HS này một lần.
              </p>
            )}
          </div>

          {/* Group-specific fields */}
          {groupType === "DEPT_AWARD" && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Danh hiệu hoặc hình thức khen thưởng <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Giáo viên dạy giỏi cấp Thành phố, Giấy khen Giám đốc Sở GD&ĐT..."
                  className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cơ quan khen thưởng</label>
                  <input
                    type="text"
                    value={issuingAuthority}
                    onChange={(e) => setIssuingAuthority(e.target.value)}
                    placeholder="VD: Sở GD&ĐT Đà Nẵng, UBND Quận..."
                    className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thời điểm ghi nhận</label>
                  <input
                    type="date"
                    value={recordedDate}
                    onChange={(e) => setRecordedDate(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs tabular-nums focus:border-[#00A19A] focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {groupType === "SYSTEM_AWARD" && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Danh hiệu khen thưởng <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Giáo viên tiêu biểu tháng, Chiến sĩ thi đua cơ sở Sky-Line..."
                  className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đợt khen thưởng</label>
                  <input
                    type="text"
                    value={eventBatch}
                    onChange={(e) => setEventBatch(e.target.value)}
                    placeholder="VD: Đợt 20/11, Cuối HK1..."
                    className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cấp khen thưởng</label>
                  <select
                    value={awardScope}
                    onChange={(e) => setAwardScope(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                  >
                    <option value="Cấp cơ sở">Cấp cơ sở</option>
                    <option value="Cấp hệ thống">Cấp hệ thống</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thời điểm</label>
                  <input
                    type="date"
                    value={recordedDate}
                    onChange={(e) => setRecordedDate(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs tabular-nums focus:border-[#00A19A] focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {groupType === "STUDENT_COMPETITION" && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên kỳ thi <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Kỳ thi HSG cấp Thành phố, Olympic Toán SASMO, VEX Robotics..."
                  className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cấp thi</label>
                  <input
                    type="text"
                    value={issuingAuthority}
                    onChange={(e) => setIssuingAuthority(e.target.value)}
                    placeholder="VD: Thành phố, Quốc gia, Quốc tế"
                    className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Môn / Lĩnh vực</label>
                  <input
                    type="text"
                    value={eventBatch}
                    onChange={(e) => setEventBatch(e.target.value)}
                    placeholder="VD: Toán, Tiếng Anh, STEM"
                    className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số HS dự thi</label>
                  <input
                    type="number"
                    min={0}
                    value={participantCount}
                    onChange={(e) => setParticipantCount(e.target.value)}
                    placeholder="VD: 5"
                    className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs tabular-nums focus:border-[#00A19A] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kết quả đạt được</label>
                <input
                  type="text"
                  value={resultSummary}
                  onChange={(e) => setResultSummary(e.target.value)}
                  placeholder="VD: 1 Giải Nhất, 2 Giải Nhì cấp Thành phố"
                  className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                />
              </div>
            </>
          )}

          {groupType === "AI_TECH" && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nội dung AI / công nghệ đã áp dụng <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Ứng dụng Gemini tạo bài tập phân hóa, thiết kế học liệu tương tác..."
                  className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mục đích</label>
                  <input
                    type="text"
                    value={issuingAuthority}
                    onChange={(e) => setIssuingAuthority(e.target.value)}
                    placeholder="VD: Cá nhân hóa bài tập"
                    className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phạm vi áp dụng</label>
                  <input
                    type="text"
                    value={awardScope}
                    onChange={(e) => setAwardScope(e.target.value)}
                    placeholder="VD: Khối 6, Tổ Toán"
                    className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thời điểm</label>
                  <input
                    type="date"
                    value={recordedDate}
                    onChange={(e) => setRecordedDate(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs tabular-nums focus:border-[#00A19A] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi nhận ngắn về kết quả</label>
                <textarea
                  rows={2}
                  value={resultSummary}
                  onChange={(e) => setResultSummary(e.target.value)}
                  placeholder="VD: Giảm 30% thời gian chấm bài, học sinh tương tác tích cực hơn..."
                  className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-[#F8FAFC]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#003B3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005250] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Lưu cập nhật" : "Lưu ghi nhận"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
