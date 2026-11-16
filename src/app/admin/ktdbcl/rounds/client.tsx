"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Flag,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import {
  createExamRoundAction,
  updateExamRoundAction,
  deleteExamRoundAction,
} from "./actions"

interface ExamRoundClientProps {
  initialRounds: any[]
  academicYears: any[]
}

export function RoundsClient({ initialRounds, academicYears }: ExamRoundClientProps) {
  const [rounds, setRounds] = useState(initialRounds)
  const [searchQuery, setSearchQuery] = useState("")
  const [yearId, setYearId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedAcademicYear")
      if (stored) return stored
    }
    const active = academicYears.find((y: any) => y.status === "ACTIVE")
    return active ? active.id : academicYears[0]?.id || ""
  })

  useEffect(() => {
    const handleYearChange = () => {
      const stored = localStorage.getItem("selectedAcademicYear")
      if (stored && stored !== yearId) {
        setYearId(stored)
      }
    }
    window.addEventListener("academicYearChanged", handleYearChange)
    return () => window.removeEventListener("academicYearChanged", handleYearChange)
  }, [yearId])

  const [creating, setCreating] = useState(false)
  const [newForm, setNewForm] = useState({ name: "", code: "", description: "" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", code: "", description: "" })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text })
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev))
    }, 3200)
  }

  const handleCreate = async () => {
    if (!newForm.name.trim() || !newForm.code.trim()) {
      showToast("error", "Vui lòng nhập Tên vòng thi và Mã vòng thi.")
      return
    }
    setSaving(true)
    try {
      const created = await createExamRoundAction({ ...newForm, academicYearId: null })
      setRounds((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "vi"))
      )
      setNewForm({ name: "", code: "", description: "" })
      setCreating(false)
      showToast("success", `Đã thêm vòng thi "${created.name}".`)
    } catch (e: any) {
      showToast("error", e?.message || "Mã vòng thi đã tồn tại hoặc xảy ra lỗi.")
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (round: any) => {
    setEditingId(round.id)
    setEditForm({
      name: round.name,
      code: round.code,
      description: round.description || "",
    })
  }

  const handleSaveEdit = async (id: string) => {
    if (!editForm.name.trim() || !editForm.code.trim()) {
      showToast("error", "Tên vòng thi và Mã không được để trống.")
      return
    }
    setSaving(true)
    try {
      const updated = await updateExamRoundAction({ id, ...editForm, academicYearId: null })
      setRounds((prev) => prev.map((r) => (r.id === id ? updated : r)))
      setEditingId(null)
      showToast("success", "Đã cập nhật vòng thi.")
    } catch (e: any) {
      showToast("error", e?.message || "Không thể cập nhật vòng thi.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa vòng thi "${name}"?`)) return
    try {
      await deleteExamRoundAction(id)
      setRounds((prev) => prev.filter((r) => r.id !== id))
      showToast("success", `Đã xóa vòng thi "${name}".`)
    } catch (e: any) {
      showToast("error", e?.message || "Có lỗi xảy ra khi xóa vòng thi.")
    }
  }

  const displayRounds = useMemo(() => {
    return rounds
      .filter((r: any) => r.academicYearId === null || r.academicYearId === yearId)
      .filter((r: any) => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase().trim()
        return (
          (r.name || "").toLowerCase().includes(q) ||
          (r.code || "").toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q)
        )
      })
  }, [rounds, yearId, searchQuery])

  return (
    <div className="space-y-3">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold ${
            toast.type === "success"
              ? "bg-[#003B3A] text-white border-[#008B85]"
              : "bg-rose-600 text-white border-rose-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 1. Compact Toolbar & Inline Create */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
            <span className="font-semibold text-[#003B3A]">Từ điển vòng thi &amp; cấp độ thi</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              Tổng số vòng thi: <strong className="text-slate-900">{displayRounds.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc mã vòng..."
                className="w-full pl-8.5 pr-7 py-1.5 rounded-xl text-xs border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none text-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setCreating((v) => !v)
                setEditingId(null)
              }}
              className="inline-flex items-center gap-1.5 bg-[#003B3A] hover:bg-[#002928] text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span>Thêm vòng thi</span>
            </button>
          </div>
        </div>

        {creating && (
          <div className="pt-3 border-t border-[#F1F5F9] grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
            <div className="md:col-span-4 space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Tên vòng thi <span className="text-[#E11D48]">*</span>
              </label>
              <input
                type="text"
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="Ví dụ: Cấp Trường, Cấp Thành phố, Quốc gia..."
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none"
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Mã vòng thi <span className="text-[#E11D48]">*</span>
              </label>
              <input
                type="text"
                value={newForm.code}
                onChange={(e) =>
                  setNewForm({
                    ...newForm,
                    code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                  })
                }
                placeholder="CAP_TRUONG"
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs font-mono bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none"
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <label className="block text-xs font-medium text-slate-600">Mô tả</label>
              <input
                type="text"
                value={newForm.description}
                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                placeholder="Ghi chú phạm vi vòng thi..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate()
                }}
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none"
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="inline-flex items-center gap-1 bg-[#008B85] hover:bg-[#00736E] text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Lưu</span>
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Sky-Line Academic Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {displayRounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 px-4 text-center">
            <Flag className="w-9 h-9 mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">Chưa có vòng thi nào phù hợp</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Nhấn &ldquo;Thêm vòng thi&rdquo; để khởi tạo danh mục cấp độ thi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-3 px-3 text-white">Tên vòng thi</th>
                  <th className="py-3 px-3 text-teal-100">Mã vòng thi</th>
                  <th className="py-3 px-3 text-teal-100">Mô tả</th>
                  <th className="py-3 px-3 text-center text-[#5EEAD4]">Số kỳ thi</th>
                  <th className="py-3 px-3 text-right text-white">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {displayRounds.map((round: any) => {
                  const isEditing = editingId === round.id
                  const examCount = round.exams
                    ? round.exams.filter((e: any) => !yearId || e.academicYearId === yearId).length
                    : 0

                  return (
                    <tr
                      key={round.id}
                      className={`transition-colors align-middle ${
                        isEditing ? "bg-[#F0FDFA]/60" : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <td className="py-3 px-3 align-middle">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full border border-[#00A19A] rounded-lg px-2.5 py-1 text-xs font-semibold bg-white outline-none"
                          />
                        ) : (
                          <span className="font-semibold text-slate-900">{round.name}</span>
                        )}
                      </td>

                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.code}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                              })
                            }
                            className="w-36 border border-[#00A19A] rounded-lg px-2.5 py-1 text-xs font-mono bg-white outline-none"
                          />
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-[11px] text-slate-700">
                            {round.code}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 align-middle max-w-md text-slate-600">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) =>
                              setEditForm({ ...editForm, description: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(round.id)
                            }}
                            className="w-full border border-[#00A19A] rounded-lg px-2.5 py-1 text-xs bg-white outline-none"
                          />
                        ) : round.description ? (
                          <span className="line-clamp-2" title={round.description}>
                            {round.description}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            examCount > 0
                              ? "bg-[#F0FDFA] text-[#00736E] border-[#CCFBF1]"
                              : "bg-[#F8FAFC] text-slate-400 border-[#E2E8F0]"
                          }`}
                        >
                          {examCount} kỳ thi
                        </span>
                      </td>

                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(round.id)}
                              disabled={saving}
                              className="p-1.5 rounded-lg bg-[#003B3A] text-white hover:bg-[#00736E] transition-colors cursor-pointer"
                              title="Lưu thay đổi"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(round)}
                              className="p-1.5 text-slate-500 hover:text-[#003B3A] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(round.id, round.name)}
                              className="p-1.5 text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
