"use client"
import { useState, useEffect } from "react"
import { Plus, Trash2, Edit2, Check, X, Tag, Hash, FileText } from "lucide-react"
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
      // Reload page to get absolute db state
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
  }

  const handleSaveEdit = async (id: string) => {
    if (!editForm.name.trim() || !editForm.code.trim()) return
    setSaving(true)
    try {
      await updateExamCategoryAction({ id, ...editForm, academicYearId: null })
      setCategories(categories.map((c) => c.id === id ? { ...c, ...editForm } : c))
      setEditingId(null)
    } catch (e) {
      alert("Mã danh mục đã tồn tại hoặc xảy ra lỗi.")
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm font-medium">Tạo và quản lý các danh mục phân loại kỳ thi học sinh.</p>
        <button
          onClick={() => { setCreating(true); setErrorMsg("") }}
          className="flex items-center gap-2 bg-[#00A99D] hover:bg-[#009085] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-[#00A99D]/20 transition-all text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tạo Danh Mục Mới
        </button>
      </div>

      {/* Create Form */}
      {creating && (
        <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-md shadow-indigo-50 animate-fade-in">
          <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#00A99D]" />
            Tạo Danh Mục Mới
          </h3>
          {errorMsg && (
            <div className="mb-4 text-red-700 bg-red-50 p-3 rounded-lg border border-red-100 text-xs font-semibold">
              {errorMsg}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Tên Danh Mục <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newForm.name}
                onChange={e => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="Ví dụ: Kỳ thi Giữa học kỳ, Học sinh giỏi..."
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-xs focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10 outline-none transition-all font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Mã (Code) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newForm.code}
                onChange={e => setNewForm({ ...newForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                placeholder="Ví dụ: KY_THI_GIUA_KY"
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-xs focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10 outline-none font-mono transition-all font-semibold"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Mô tả danh mục</label>
            <textarea
              value={newForm.description}
              onChange={e => setNewForm({ ...newForm, description: e.target.value })}
              placeholder="Nhập mô tả chi tiết cho loại danh mục kỳ thi này..."
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-xs focus:border-[#00A99D] outline-none font-semibold"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-slate-100">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-6 py-2.5 bg-[#00A99D] hover:bg-[#009085] text-white rounded-lg font-bold text-xs shadow-md shadow-[#00A99D]/20 transition-all disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Đang lưu..." : "Lưu Danh Mục"}
            </button>
            <button
              onClick={() => { setCreating(false); setErrorMsg("") }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-all cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200/80 border-2 border-slate-100 overflow-hidden">
        <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag className="w-5 h-5 text-[#00A99D]" />
            <span className="font-bold text-slate-700 text-sm">Danh Sách Danh Mục Kỳ Thi ({displayCategories.length})</span>
          </div>
        </div>

        {displayCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Tag className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-bold text-lg mb-1">Chưa có danh mục nào</p>
            <p className="text-xs font-medium">Nhấn "Tạo Danh Mục Mới" để bắt đầu phân loại kỳ thi.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayCategories.map((cat: any) => {
              const isEditing = editingId === cat.id
              const examCount = cat.exams ? cat.exams.filter((e: any) => e.academicYearId === yearId).length : 0;
              return (
                <div key={cat.id} className="flex flex-col p-6 hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-teal-50 text-[#00A99D] rounded-xl flex items-center justify-center flex-shrink-0">
                      <Tag className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tên Danh Mục</label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-[#00A99D]/10 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Mã (Code)</label>
                            <input
                              type="text"
                              value={editForm.code}
                              onChange={e => setEditForm({ ...editForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:border-[#00A99D] outline-none"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Mô tả</label>
                            <textarea
                              value={editForm.description}
                              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none"
                              rows={2}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-bold text-slate-800 text-sm">{cat.name}</span>
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold">
                              <Hash className="w-3 h-3" />{cat.code}
                            </span>
                            <span className="text-[10px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold">
                              <FileText className="w-3 h-3" />
                              {examCount} kỳ thi
                            </span>
                          </div>
                          {cat.description ? (
                            <p className="text-slate-500 text-xs font-semibold line-clamp-2">{cat.description}</p>
                          ) : (
                            <p className="text-slate-400 text-xs italic font-semibold">Chưa có mô tả chi tiết.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-start md:self-center">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(cat.id)}
                            disabled={saving}
                            className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all cursor-pointer"
                            title="Lưu"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 hover:bg-rose-50 text-rose-600 rounded-xl transition-all cursor-pointer"
                            title="Hủy"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(cat)}
                            className="p-2 hover:bg-teal-50 text-[#00A99D] rounded-xl transition-all cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id, cat.name)}
                            className="p-2 hover:bg-rose-50 text-rose-600 rounded-xl transition-all cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
