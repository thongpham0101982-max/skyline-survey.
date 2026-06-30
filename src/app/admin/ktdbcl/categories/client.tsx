"use client"
import { useState, useEffect } from "react"
import { Plus, Trash2, Edit2, Check, X, Tag, Hash, FileText, Calendar } from "lucide-react"
import { createExamCategoryAction, updateExamCategoryAction, deleteExamCategoryAction } from "./actions"

interface ExamCategoryClientProps {
  initialCategories: any[]
  academicYears: any[]
}

export function CategoriesClient({ initialCategories, academicYears }: ExamCategoryClientProps) {
  const [categories, setCategories] = useState(initialCategories)
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
      setErrorMsg("Vui lòng nhập Tên danh mục và Mã danh mục!")
      return
    }
    setSaving(true)
    setErrorMsg("")
    try {
      await createExamCategoryAction({ ...newForm, academicYearId: null })
      setCategories([...categories, { ...newForm, id: `temp_${Date.now()}`, academicYearId: null, exams: [] }])
      setNewForm({ name: "", code: "", description: "" })
      setCreating(false)
      window.location.reload()
    } catch (e) {
      setErrorMsg("Mã danh mục đã tồn tại hoặc có lỗi xảy ra. Vui lòng thử lại!")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (cat: any) => {
    setEditingId(cat.id)
    setEditForm({ name: cat.name, code: cat.code, description: cat.description || "" })
    setErrorMsg("")
  }

  const handleSaveEdit = async (id: string) => {
    if (!editForm.name.trim() || !editForm.code.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ tên và mã danh mục!")
      return
    }
    setSaving(true)
    try {
      await updateExamCategoryAction({ id, ...editForm, academicYearId: null })
      setCategories(categories.map((c) => c.id === id ? { ...c, ...editForm } : c))
      setEditingId(null)
    } catch (e) {
      setErrorMsg("Mã danh mục đã tồn tại hoặc xảy ra lỗi.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa danh mục "${name}"?\n\nLưu ý: Tất cả kỳ thi thuộc danh mục này sẽ bị xóa.`)) return
    try {
      await deleteExamCategoryAction(id)
      setCategories(categories.filter((c) => c.id !== id))
    } catch (e) {
      alert("Có lỗi xảy ra khi xóa danh mục.")
    }
  }

  const displayCategories = categories.filter(
    (c: any) => c.academicYearId === null || c.academicYearId === yearId
  )

  return (
    <div className="space-y-6">
      {/* Header and Add Button aligned cleanly */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-2xs">
        <div className="space-y-1">
          <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#00A99D]" />
            Danh Sách Danh Mục Kỳ Thi ({displayCategories.length})
          </h3>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            Phân loại các kỳ thi theo nhóm để dễ dàng quản lý
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 bg-[#00A99D] hover:bg-[#009085] text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-[#00A99D]/15 transition-all text-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tạo Danh Mục Mới
        </button>
      </div>

      {/* Grid of Redesigned Category Cards */}
      {displayCategories.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center py-20 text-slate-400 shadow-2xs">
          <Tag className="w-16 h-16 mb-4 opacity-20 text-[#00A99D]" />
          <p className="font-bold text-slate-700 text-base mb-1">Chưa có danh mục nào</p>
          <p className="text-xs text-slate-400 font-medium">Nhấn "Tạo Danh Mục Mới" để bắt đầu phân loại kỳ thi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayCategories.map((cat: any) => {
            const examCount = cat.exams ? cat.exams.filter((e: any) => e.academicYearId === yearId).length : 0;
            return (
              <div
                key={cat.id}
                className="bg-white rounded-2xl border border-slate-200/70 hover:border-[#00A99D]/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between overflow-hidden relative group"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <span className="text-[10px] font-mono font-black tracking-wider text-slate-400 uppercase flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {cat.code}
                      </span>
                      <h4 className="font-black text-slate-800 text-sm leading-snug group-hover:text-[#00A99D] transition-colors line-clamp-2" title={cat.name}>
                        {cat.name}
                      </h4>
                    </div>

                    <span className="bg-teal-50 text-[#00A99D] border border-teal-100/50 text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap font-black shrink-0 flex items-center gap-1.5 shadow-2xs">
                      <FileText className="w-3.5 h-3.5" />
                      {examCount} kỳ thi
                    </span>
                  </div>

                  {cat.description ? (
                    <p className="text-slate-500 text-xs line-clamp-3 font-semibold leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100/80">
                      {cat.description}
                    </p>
                  ) : (
                    <p className="text-slate-400 text-xs italic font-semibold bg-slate-50/50 p-3 rounded-lg border border-dashed border-slate-200">
                      Chưa có mô tả chi tiết cho danh mục này.
                    </p>
                  )}
                </div>

                {/* Footer with actions */}
                <div className="bg-slate-50/80 border-t border-slate-100 px-5 py-3.5 flex items-center justify-end gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-200/50 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-2xs"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-100 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-2xs"
                    title="Xóa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CREATE MODAL OVERLAY */}
      {creating && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-teal-300" />
                <h3 className="font-black text-sm">Tạo Danh Mục Mới</h3>
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
                  Tên Danh Mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newForm.name}
                  onChange={e => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="Ví dụ: Kỳ thi Giữa học kỳ, Học sinh giỏi..."
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
                  placeholder="Ví dụ: KY_THI_GIUA_KY"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10 outline-none font-mono transition-all font-semibold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-600 uppercase tracking-wider">Mô tả danh mục</label>
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
                {saving ? "Đang lưu..." : "Lưu Danh Mục"}
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
                <Tag className="w-5 h-5 text-teal-300" />
                <h3 className="font-black text-sm">Chỉnh Sửa Danh Mục</h3>
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
                <label className="block text-slate-600 uppercase tracking-wider">Tên Danh Mục</label>
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
