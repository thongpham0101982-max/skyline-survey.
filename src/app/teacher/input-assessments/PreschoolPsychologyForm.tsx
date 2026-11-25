"use client"

import { useEffect, useState } from "react"
import { Brain, CheckCircle2, Loader2, Save, X } from "lucide-react"
import { PRESCHOOL_FORM_REGISTRY } from "@/lib/preschool-workflow"

interface PreschoolPsychologyFormProps {
  student: any
  user: any
  onSaved: () => Promise<void> | void
  onClose: () => void
  isLocked?: boolean
}

export default function PreschoolPsychologyForm({
  student,
  user,
  onSaved,
  onClose,
  isLocked = false,
}: PreschoolPsychologyFormProps) {
  const psyFormDef = PRESCHOOL_FORM_REGISTRY["BM.KTĐBCL.09"]
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ratings, setRatings] = useState<Record<string, { result: string; note: string }>>({})
  const [conclusionCode, setConclusionCode] = useState<string>(student?.trialPsychologyConclusion || "")
  const [conclusionNote, setConclusionNote] = useState<string>(
    student?.trialPsychologyFeedback || student?.devPsychologyComment || ""
  )
  const [roundId, setRoundId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/preschool-workflow/${student.id}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Không thể tải hồ sơ khảo sát tâm lý.")
        if (cancelled) return

        const activeRound = data.activeRound || data.rounds?.[data.rounds.length - 1] || null
        setRoundId(activeRound?.id || null)

        const parsed: Record<string, { result: string; note: string }> = {}
        let noteFromRound = ""
        if (activeRound?.psychologyPayloadJson) {
          try {
            const p = JSON.parse(activeRound.psychologyPayloadJson)
            for (const c of p.criteria || []) {
              parsed[c.code] = { result: c.result || "", note: c.note || "" }
            }
            noteFromRound = p.conclusionNote || ""
          } catch {}
        }
        setRatings(parsed)
        setConclusionCode(data.student?.trialPsychologyConclusion || student?.trialPsychologyConclusion || "")
        setConclusionNote(
          noteFromRound ||
            data.student?.trialPsychologyFeedback ||
            data.student?.devPsychologyComment ||
            student?.trialPsychologyFeedback ||
            ""
        )
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Lỗi tải dữ liệu.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (student?.id) load()
    return () => {
      cancelled = true
    }
  }, [student?.id])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const criteriaList = psyFormDef.defaultCriteria.map((c) => ({
        code: c.code,
        area: c.area,
        name: c.name,
        result: ratings[c.code]?.result || "",
        note: ratings[c.code]?.note || "",
      }))
      const res = await fetch(`/api/preschool-workflow/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_PSYCHOLOGY",
          roundId,
          criteria: criteriaList,
          psychologyConclusion: conclusionCode,
          conclusionNote,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Không thể lưu kết quả khảo sát tâm lý.")
      await fetch(`/api/preschool-workflow/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SIGN_AND_COMPLETE_STEP",
          stepCode: "B7_PSYCHOLOGY",
          stepLabel: "B7: Giáo viên Tâm lý khảo sát (BM.KTĐBCL.09)",
        }),
      }).catch(() => {})
      await onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || "Lỗi lưu dữ liệu.")
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
            <Brain className="w-5 h-5 text-[#5EEAD4]" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#5EEAD4]">
              B7 · Khảo sát Tâm lý Mầm non (BM.KTĐBCL.09)
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
        {/* Student info strip */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums border-l-4 border-l-[#003B3A]">
          <div>
            <span className="text-[11px] text-slate-500 block">Nhóm tuổi / Khối</span>
            <strong className="text-[#003B3A]">{student.grade || "Mầm non"}</strong>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Cơ sở</span>
            <strong className="text-slate-800">{student.admissionCampus || "Sky-Line"}</strong>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">GV Tâm lý phụ trách</span>
            <strong className="text-[#00736E]">{student.trialPsychologistName || user?.fullName || "Tổ Tâm lý"}</strong>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Lớp / GV trải nghiệm</span>
            <strong className="text-slate-800">
              {student.probationaryClass || student.probationaryTeacher
                ? `${student.probationaryClass || "—"} · ${student.probationaryTeacher || "—"}`
                : "Không phát sinh"}
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
            Đang tải Phiếu sàng lọc tâm lý BM.KTĐBCL.09...
          </div>
        ) : (
          <>
            {/* Criteria Table */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#003B3A]">
                  Nội dung quan sát / phỏng vấn tâm lý ({psyFormDef.defaultCriteria.length} hạng mục)
                </h3>
                <span className="text-[11px] text-slate-500">Biểu mẫu chuẩn BM.KTĐBCL.09</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs tabular-nums">
                  <thead className="bg-[#003B3A] text-white text-[11px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-teal-100 w-[24%]">Hạng mục</th>
                      <th className="py-2.5 px-3 text-white w-[42%]">Nội dung quan sát / phỏng vấn</th>
                      <th className="py-2.5 px-3 text-[#5EEAD4] w-[18%]">Đánh giá</th>
                      <th className="py-2.5 px-3 text-teal-100 w-[16%]">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] bg-white">
                    {psyFormDef.defaultCriteria.map((c) => {
                      const cur = ratings[c.code] || { result: "", note: "" }
                      return (
                        <tr key={c.code} className="hover:bg-[#F8FAFC]">
                          <td className="py-3 px-3 font-semibold text-slate-700 align-middle">{c.area}</td>
                          <td className="py-3 px-3 text-slate-800 align-middle">{c.name}</td>
                          <td className="py-3 px-3 align-middle">
                            <select
                              value={cur.result}
                              disabled={isLocked}
                              onChange={(e) =>
                                setRatings((prev) => ({
                                  ...prev,
                                  [c.code]: { ...cur, result: e.target.value },
                                }))
                              }
                              className="w-full rounded-lg border border-[#E2E8F0] px-2 py-1.5 bg-white text-xs font-medium"
                            >
                              <option value="">-- Chọn --</option>
                              {c.options.map((o) => (
                                <option key={o.key} value={o.label}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-3 align-middle">
                            <input
                              type="text"
                              value={cur.note}
                              disabled={isLocked}
                              onChange={(e) =>
                                setRatings((prev) => ({
                                  ...prev,
                                  [c.code]: { ...cur, note: e.target.value },
                                }))
                              }
                              placeholder="Ghi chú..."
                              className="w-full rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-xs bg-white"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Conclusion & Feedback */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#003B3A] mb-2">
                  Kết luận khảo sát tâm lý <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      k: "BINH_THUONG",
                      label: "Phát triển tâm lý bình thường",
                      active: "bg-emerald-600 text-white border-emerald-600",
                      idle: "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50",
                    },
                    {
                      k: "CAN_THEO_DOI",
                      label: "Cần theo dõi thêm",
                      active: "bg-amber-600 text-white border-amber-600",
                      idle: "bg-white text-amber-800 border-amber-200 hover:bg-amber-50",
                    },
                    {
                      k: "CAN_CAN_THIEP",
                      label: "Cần hỗ trợ / can thiệp chuyên sâu",
                      active: "bg-rose-600 text-white border-rose-600",
                      idle: "bg-white text-rose-700 border-rose-200 hover:bg-rose-50",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.k}
                      type="button"
                      disabled={isLocked}
                      onClick={() => setConclusionCode(opt.k)}
                      className={`px-3 py-2.5 rounded-xl border font-semibold text-center cursor-pointer transition-colors ${
                        conclusionCode === opt.k ? opt.active : opt.idle
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#003B3A] mb-1.5">
                  Nhận xét &amp; khuyến nghị từ GV Tâm lý
                </label>
                <textarea
                  rows={4}
                  value={conclusionNote}
                  disabled={isLocked}
                  onChange={(e) => setConclusionNote(e.target.value)}
                  placeholder="Ghi nhận kết quả phỏng vấn tâm lý, tương tác của trẻ và khuyến nghị đồng hành cho giáo viên / gia đình..."
                  className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2.5 text-xs bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                >
                  Đóng
                </button>
                {!isLocked && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="px-5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-[#5EEAD4]" />}
                    {saving ? "Đang lưu & ký số..." : "Xác nhận hoàn thành & Ký số (B7)"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
