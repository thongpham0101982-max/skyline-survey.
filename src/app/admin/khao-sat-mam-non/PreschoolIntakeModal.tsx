"use client"

import { useState } from "react"
import { X, Loader2, Calendar, UserPlus, AlertTriangle } from "lucide-react"
import { suggestPreschoolForm } from "@/lib/preschool-workflow"

const PRESCHOOL_GRADES = [
  "Nhà trẻ 12-18 tháng",
  "Nhà trẻ 18-24 tháng",
  "Nhà trẻ 24-36 tháng",
  "Mẫu giáo bé",
  "Mẫu giáo nhỡ",
  "Mẫu giáo lớn",
]

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (newId: string) => void
  campuses: Array<{ id: string; code: string; name: string }>
  periods: Array<{ id: string; code: string; name: string }>
  staffUsers: Array<{ id: string; fullName: string; email: string; role: string }>
}

export function PreschoolIntakeModal({
  open,
  onClose,
  onCreated,
  campuses,
  periods,
  staffUsers,
}: Props) {
  const [fullName, setFullName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [gender, setGender] = useState("Nam")
  const [campus, setCampus] = useState(campuses[0]?.name || "Sky-Line Riverside")
  const [grade, setGrade] = useState("Mẫu giáo bé")
  const [surveySystem, setSurveySystem] = useState("Hệ S")
  const [intakeMode, setIntakeMode] = useState<"KHAO_SAT_MOI" | "HOC_TRAI_NGHIEM">("KHAO_SAT_MOI")
  const [appointmentAt, setAppointmentAt] = useState(() => {
    const d = new Date()
    d.setMinutes(0, 0, 0)
    return d.toISOString().slice(0, 16)
  })
  const [periodId, setPeriodId] = useState(periods[0]?.id || "")
  const [ownerUserId, setOwnerUserId] = useState("")
  const [assignedTeacherId, setAssignedTeacherId] = useState("")
  const [assignedMedicalId, setAssignedMedicalId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const suggestion = suggestPreschoolForm({
    dateOfBirth: dateOfBirth || null,
    surveyDate: appointmentAt || new Date(),
    grade,
    surveySystem,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setError("Vui lòng nhập họ tên trẻ.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const owner = staffUsers.find((u) => u.id === ownerUserId)
      const teacher = staffUsers.find((u) => u.id === assignedTeacherId)
      const medical = staffUsers.find((u) => u.id === assignedMedicalId)

      const res = await fetch("/api/preschool-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          dateOfBirth: dateOfBirth || null,
          gender,
          registeredCampus: campus,
          grade,
          surveySystem,
          intakeMode,
          appointmentAt,
          periodId: periodId || periods[0]?.id || undefined,
          ownerUserId: owner?.id || undefined,
          ownerUserName: owner?.fullName || undefined,
          assignedTeacherId: teacher?.id || undefined,
          assignedTeacherName: teacher?.fullName || undefined,
          assignedMedicalId: medical?.id || undefined,
          assignedMedicalName: medical?.fullName || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Không thể tiếp nhận hồ sơ.")
      onCreated(data.id)
      onClose()
    } catch (err: any) {
      setError(err?.message || "Lỗi kết nối máy chủ.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-[#003B3A] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#5EEAD4] font-medium">Bước B1–B3 · Tiếp nhận & chuẩn bị</p>
            <h2 className="text-base font-bold mt-0.5 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#5EEAD4]" />
              Tiếp nhận lịch khảo sát đầu vào Mầm non
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-100 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-sm">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Họ tên trẻ <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Minh An"
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:border-[#00A19A]"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ngày sinh</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#00A19A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Giới tính</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cơ sở đăng ký</label>
              <select
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#00A19A]"
              >
                {campuses.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.code ? `${c.code} — ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nhóm tuổi / Lớp đăng ký</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#00A19A]"
              >
                {PRESCHOOL_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hệ đăng ký</label>
              <div className="grid grid-cols-2 gap-2">
                {(["Hệ S", "Hệ Global"] as const).map((sys) => (
                  <button
                    key={sys}
                    type="button"
                    onClick={() => setSurveySystem(sys)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      surveySystem === sys
                        ? "bg-[#003B3A] text-white border-[#003B3A]"
                        : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50"
                    }`}
                  >
                    {sys}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hình thức dự kiến</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIntakeMode("KHAO_SAT_MOI")}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    intakeMode === "KHAO_SAT_MOI"
                      ? "bg-[#00A19A] text-white border-[#00A19A]"
                      : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50"
                  }`}
                >
                  Khảo sát mới
                </button>
                <button
                  type="button"
                  onClick={() => setIntakeMode("HOC_TRAI_NGHIEM")}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    intakeMode === "HOC_TRAI_NGHIEM"
                      ? "bg-[#00A19A] text-white border-[#00A19A]"
                      : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50"
                  }`}
                >
                  Học trải nghiệm
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00736E]" />
                Lịch khảo sát
              </label>
              <input
                type="datetime-local"
                value={appointmentAt}
                onChange={(e) => setAppointmentAt(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#00A19A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kỳ khảo sát</label>
              <select
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#00A19A]"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Người phụ trách hồ sơ</label>
              <select
                value={ownerUserId}
                onChange={(e) => setOwnerUserId(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#00A19A]"
              >
                <option value="">Mặc định người tạo</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">GV phụ trách đánh giá (tùy chọn)</label>
              <select
                value={assignedTeacherId}
                onChange={(e) => setAssignedTeacherId(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#00A19A]"
              >
                <option value="">Phân công sau</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nhân sự Y tế phụ trách B4A (tùy chọn)</label>
              <select
                value={assignedMedicalId}
                onChange={(e) => setAssignedMedicalId(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#00A19A]"
              >
                <option value="">Phân công sau</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Smart form preview */}
          <div
            className={`rounded-xl border px-4 py-3 text-xs ${
              suggestion.isAgeBoundary
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-[#F0FDFA] border-teal-200 text-[#005854]"
            }`}
          >
            <div className="font-semibold flex items-center gap-2">
              {suggestion.isAgeBoundary && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
              <span>
                Gợi ý biểu mẫu tự động: <strong>{suggestion.suggestedFormCode}</strong> (v{suggestion.formVersion})
                {suggestion.ageMonths !== null ? ` · Tuổi tại ngày hẹn: ${suggestion.ageMonths} tháng` : ""}
              </span>
            </div>
            {suggestion.boundaryReason && (
              <p className="mt-1 text-[11px] leading-relaxed">{suggestion.boundaryReason}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Lưu lịch tiếp nhận (B1–B3)
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
