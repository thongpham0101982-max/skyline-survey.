"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, PenTool, ShieldCheck, Stethoscope, X } from "lucide-react"

interface Props {
  student: any
  isLocked?: boolean
  onClose: () => void
  onSaved: () => Promise<void> | void
}

const PHYSICAL_STATUS_OPTIONS = [
  "Bình thường, đủ sức khỏe tham gia khảo sát",
  "Cần lưu ý sức khỏe / dinh dưỡng (vẫn tham gia khảo sát)",
  "Chưa đủ điều kiện sức khỏe — đề nghị dời lịch",
]

export default function PreschoolHealthForm({ student, isLocked = false, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [heightCm, setHeightCm] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [physicalStatus, setPhysicalStatus] = useState(PHYSICAL_STATUS_OPTIONS[0])
  const [physicalNote, setPhysicalNote] = useState("")
  const [existingSig, setExistingSig] = useState<any>(null)
  const [assignedMedicalName, setAssignedMedicalName] = useState("")

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetch(`/api/preschool-workflow/${student.id}`)
        const data = await res.json().catch(() => ({}))
        if (!active) return
        if (!res.ok) throw new Error(data?.error || "Không thể tải dữ liệu Y tế (B4A).")
        const rounds = Array.isArray(data?.rounds) ? data.rounds : []
        const latest = rounds[rounds.length - 1] || null
        const h = latest?.heightCm ?? data?.legacyDev?.heightCm ?? ""
        const w = latest?.weightKg ?? data?.legacyDev?.weightKg ?? ""
        setHeightCm(h !== null && h !== undefined && String(h) !== "" ? String(h) : "")
        setWeightKg(w !== null && w !== undefined && String(w) !== "" ? String(w) : "")
        if (latest?.physicalStatus) setPhysicalStatus(String(latest.physicalStatus))
        if (latest?.physicalNote) setPhysicalNote(String(latest.physicalNote))
        setAssignedMedicalName(
          latest?.assignedMedicalName ||
            (data?.legacyDev?.assignedMedicalFromBatch || []).join(", ") ||
            ""
        )
        setExistingSig(data?.stepSignatures?.B4A || null)
      } catch (e: any) {
        if (active) setError(e?.message || "Lỗi tải dữ liệu B4A.")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [student.id])

  const hNum = parseFloat(heightCm)
  const wNum = parseFloat(weightKg)
  const bmi =
    !isNaN(hNum) && !isNaN(wNum) && hNum > 30 && wNum > 2
      ? (wNum / ((hNum / 100) * (hNum / 100))).toFixed(1)
      : "—"

  const handleSave = async (withSign: boolean) => {
    if (!heightCm.trim() || !weightKg.trim()) {
      setError("Vui lòng nhập đầy đủ Chiều cao (cm) và Cân nặng (kg).")
      return
    }
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/preschool-workflow/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_HEALTH_CHECK",
          heightCm,
          weightKg,
          physicalStatus,
          physicalNote,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Không thể lưu kết quả Y tế (B4A).")

      if (withSign) {
        await fetch(`/api/preschool-workflow/${student.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "SIGN_AND_COMPLETE_STEP",
            stepCode: "B4A",
            stepLabel: "B4A: Y tế kiểm tra thể chất",
          }),
        }).catch(() => {})
      }

      await onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.message || "Lỗi lưu dữ liệu Y tế (B4A).")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#003B3A] text-white px-6 py-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-[#5EEAD4]" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#5EEAD4]">
              B4A · Y tế kiểm tra thể chất (Chiều cao · Cân nặng · Sức khỏe)
            </div>
            <h2 className="text-base font-bold leading-snug">
              {student.fullName}{" "}
              <span className="text-xs font-mono font-normal text-teal-100 ml-1">({student.studentCode})</span>
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <X className="w-4 h-4" /> Đóng
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
        {/* Summary strip */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs tabular-nums">
          <div>
            <span className="text-[11px] text-slate-500 block">Nhóm tuổi / Cơ sở</span>
            <strong className="text-[#003B3A]">
              {student.grade || "Mầm non"} · {student.admissionCampus || "Sky-Line"}
            </strong>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">NV Tổ Y tế phân công</span>
            <strong className="text-slate-800">{assignedMedicalName || "Nhân viên Y tế cơ sở"}</strong>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Trạng thái B4A</span>
            <strong className={heightCm && weightKg ? "text-emerald-700" : "text-amber-700"}>
              {heightCm && weightKg ? `✓ Đã đo (${heightCm} cm · ${weightKg} kg)` : "Chưa đo chiều cao / cân nặng"}
            </strong>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-6 h-6 text-[#00A19A] animate-spin" />
            Đang tải phiếu kiểm tra thể chất (B4A)...
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chiều cao (cm) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={heightCm}
                  disabled={isLocked}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="102.5"
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm font-semibold tabular-nums focus:border-[#00A19A] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cân nặng (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  disabled={isLocked}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="16.2"
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm font-semibold tabular-nums focus:border-[#00A19A] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chỉ số BMI (tự động)</label>
                <div className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm font-bold text-[#003B3A] tabular-nums">
                  {bmi}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kết quả kiểm tra thể chất</label>
              <select
                value={physicalStatus}
                disabled={isLocked}
                onChange={(e) => setPhysicalStatus(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 bg-white text-xs font-medium focus:border-[#00A19A] focus:outline-none"
              >
                {PHYSICAL_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ghi chú Y tế</label>
              <textarea
                rows={3}
                value={physicalNote}
                disabled={isLocked}
                onChange={(e) => setPhysicalNote(e.target.value)}
                placeholder="Ghi chú sức khỏe, dị ứng, lưu ý ăn uống / vận động..."
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs bg-white focus:border-[#00A19A] focus:outline-none"
              />
            </div>

            {existingSig && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
                <div className="flex items-center gap-2 text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Đã xác nhận &amp; ký số bởi <strong>{existingSig.signerName}</strong>{" "}
                    ({existingSig.signedAt ? new Date(existingSig.signedAt).toLocaleString("vi-VN") : "—"}) · Mã:{" "}
                    <code className="px-1.5 py-0.5 rounded bg-white border border-emerald-200 font-semibold">
                      {existingSig.signatureHash}
                    </code>
                  </span>
                </div>
                {existingSig.signatureImageUrl && (
                  <img
                    src={existingSig.signatureImageUrl}
                    alt="Chữ ký số"
                    className="h-9 max-w-[120px] object-contain rounded border border-emerald-200 bg-white px-1.5"
                  />
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
              >
                Đóng
              </button>
              {!isLocked && (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave(false)}
                    className="px-4 py-2 rounded-xl border border-[#00A19A] bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#003B3A] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#008B85]" />
                    Lưu nháp (B4A)
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave(true)}
                    className="px-5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4 text-[#5EEAD4]" />}
                    {saving ? "Đang lưu & ký số..." : "Xác nhận hoàn thành & Ký số (B4A)"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
