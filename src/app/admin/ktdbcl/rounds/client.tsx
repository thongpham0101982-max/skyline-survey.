"use client"
import { useState, useEffect } from "react"
import { Plus, Trash2, Edit2, Check, X, Flag, Hash, FileText } from "lucide-react"
import { createExamRoundAction, updateExamRoundAction, deleteExamRoundAction } from "./actions"

interface ExamRoundClientProps {
  initialRounds: any[]
  academicYears: any[]
}

export function RoundsClient({ initialRounds, academicYears }: ExamRoundClientProps) {
  const [rounds, setRounds] = useState(initialRounds)
  const [yearId, setYearId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedAcademicYear")
      if (stored) return stored
    }
    const active = academicYears.find((y: any) => y.status === "ACTIVE")
    return active ? active.id : (academicYears[0]?.id || "")
  })

  // Listen to year change event
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

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", code: "", description: "" })
  const [creating, setCreating] = useState(false)
  const [newForm, setNewForm] = useState({ name: "", code: "", description: "" })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const openCreate = () => {
    setNewForm({ name: "", code: "", description: "" })
    setCreating(true)
    setErrorMsg("")
  }

  const handleCreate = async () => {
    if (!newForm.name.trim() || !newForm.code.trim()) {
      setErrorMsg("Vui lòng nhập Tên vòng thi và Mã vòng thi!")
      return
    }
    setSaving(true)
    setErrorMsg("")
    try {
      await createExamRoundAction({ ...newForm, academicYearId: null })
      setRounds([...rounds, { ...newForm, id: `temp_${Date.now()}`, academicYearId: null, exams: [] }])
      setNewForm({ name: "", code: "", description: "" })
      setCreating(false)
      window.location.reload()
    } catch (e) {
      setErrorMsg("Mã vòng thi đã tồn tại hoặc có lỗi xảy ra. Vui lòng thử lại!")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (round: any) => {
    setEditingId(round.id)
    setEditForm({ name: round.name, code: round.code, description: round.description || "" })
    setErrorMsg("")
  }

  const handleSaveEdit = async (id: string) => {
    if (!editForm.name.trim() || !editForm.code.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ thông tin!")
      return
    }
    setSaving(true)
    try {
      await updateExamRoundAction({ id, ...editForm, academicYearId: null })
      setRounds(rounds.map((r) => r.id === id ? { ...r, ...editForm } : r))
      setEditingId(null)
    } catch (e) {
      setErrorMsg("Mã vòng thi đã tồn tại hoặc xảy ra lỗi.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa vòng thi "${name}"?\n\nLưu ý: Tất cả kỳ thi thuộc vòng thi này sẽ bị ảnh hưởng.`)) return
    try {
      await deleteExamRoundAction(id)
      setRounds(rounds.filter((r) => r.id !== id))
    } catch (e) {
      alert("Có lỗi xảy ra khi xóa vòng thi.")
    }
  }

  const displayRounds = rounds.filter(
    (r: any) => r.academicYearId === null || r.academicYearId === yearId
  )

  return (
    <div className="space-y-6">
      {/* Header and Add Button aligned cleanly */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-2xs">
        <div className="space-y-1">
          <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
            <Flag className="w-4 h-4 text-[#00A99D]" />
            Danh Sách Vòng Thi ({displayRounds.length})
          </h3>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            Quản lý danh sách các vòng thi của học sinh
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 bg-[#00A99D] hover:bg-[#009085] text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-[#00A99D]/15 transition-all text-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tạo Vòng Thi Mới
        </button>
      </div>

      {/* Table of Redesigned Round Rows */}
      {displayRounds.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center py-20 text-slate-400 shadow-2xs">
          <Flag className="w-16 h-16 mb-4 opacity-20 text-[#00A99D]" />
          <p className="font-bold text-slate-700 text-base mb-1">Chưa có vòng thi nào</p>
          <p className="text-xs text-slate-400 font-medium">Nhấn "Tạo Vòng Thi Mới" để bắt đầu thiết lập.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/60 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Tên Vòng thi</th>
                  <th className="py-3.5 px-4">Mã (Code)</th>
                  <th className="py-3.5 px-4">Mô tả</th>
                  <th className="py-3.5 px-4 text-center">Số lượng Kỳ thi</th>
                  <th className="py-3.5 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRounds.map((round: any) => {
                  const examCount = round.exams ? round.exams.filter((e: any) => e.academicYearId === yearId).length : 0;
                  return (
                    <tr key={round.id} className="hover:bg-slate-50/40 transition-colors text-xs font-semibold">
                      <td className="py-4 px-5">
                        <span className="font-bold text-slate-800">{round.name}</span>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-500 font-bold">
                        {round.code}
                      </td>
                      <td className="py-4 px-4 text-slate-500 max-w-xs truncate" title={round.description || ''}>
                        {round.description || <span className="text-slate-300 italic font-normal">Chưa có mô tả</span>}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="bg-teal-50 text-[#00A99D] border border-teal-100/50 text-[10px] px-2.5 py-0.5 rounded-full font-black">
                          {examCount} kỳ thi
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(round)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-all cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(round.id, round.name)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE MODAL OVERLAY */}
      {creating && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-teal-300" />
                <h3 className="font-black text-sm">Tạo Vòng Thi Mới</h3>
              </div>
              <button
                onClick={() => setCreating(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-semibold">
              {errorMsg && (
                <div className="text-red-700 bg-red-50 p-3.5 rounded-xl border border-red-100 font-bold flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-slate-600 uppercase tracking-wider">
                  Tên Vòng Thi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newForm.name}
                  onChange={e => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="Ví dụ: Vòng trường, Vòng Quận, Vòng Thành phố..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10 outline-none transition-all font-semibold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-600 uppercase tracking-wider">
                  Mã (Code) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newForm.code}
                  onChange={e => setNewForm({ ...newForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  placeholder="Ví dụ: VONG_CS_TRUONG"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10 outline-none font-mono transition-all font-semibold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-600 uppercase tracking-wider">Mô tả vòng thi</label>
                <textarea
                  value={newForm.description}
                  onChange={e => setNewForm({ ...newForm, description: e.target.value })}
                  placeholder="Nhập mô tả chi tiết..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#00A99D] outline-none font-semibold text-slate-700 bg-slate-50/50"
                  rows={3}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setCreating(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-all shadow-2xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-[#00A99D] to-[#009085] hover:opacity-95 text-white rounded-xl font-bold text-xs shadow-md shadow-[#00A99D]/15 transition-all disabled:opacity-60 cursor-pointer"
              >
                {saving ? "Đang lưu..." : "Lưu Vòng Thi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL OVERLAY */}
      {editingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-teal-300" />
                <h3 className="font-black text-sm">Chỉnh Sửa Vòng Thi</h3>
              </div>
              <button
                onClick={() => setEditingId(null)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-semibold">
              {errorMsg && (
                <div className="text-red-700 bg-red-50 p-3.5 rounded-xl border border-red-100 font-bold flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-slate-600 uppercase tracking-wider">Tên Vòng Thi</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10 outline-none transition-all font-semibold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-600 uppercase tracking-wider">Mã (Code)</label>
                <input
                  type="text"
                  value={editForm.code}
                  onChange={e => setEditForm({ ...editForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10 outline-none font-mono transition-all font-semibold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-600 uppercase tracking-wider">Mô tả</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#00A99D] outline-none font-semibold text-slate-700 bg-slate-50/50"
                  rows={3}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setEditingId(null)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-all shadow-2xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => handleSaveEdit(editingId)}
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-[#00A99D] to-[#009085] hover:opacity-95 text-white rounded-xl font-bold text-xs shadow-md shadow-[#00A99D]/15 transition-all disabled:opacity-60 cursor-pointer"
              >
                {saving ? "Đang lưu..." : "Lưu Thay Đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
