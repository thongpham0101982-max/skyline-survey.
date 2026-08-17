"use client"
import { useState, useEffect } from "react"
import { Plus, Trash2, Edit2, Check, X, Tag, Hash, FileText, Cpu, BookOpen, Lightbulb, Trophy, Search, Layers, Sparkles } from "lucide-react"
import { createExamCategoryAction, updateExamCategoryAction, deleteExamCategoryAction } from "./actions"

interface ExamCategoryClientProps {
  initialCategories: any[]
  academicYears: any[]
}

const getCategoryIconAndColor = (code: string, name: string) => {
  const cleanCode = (code || "").toUpperCase()
  const cleanName = (name || "").toLowerCase()
  
  if (cleanCode.includes("CN_ST") || cleanCode.includes("CONG_NGHE") || cleanName.includes("công nghệ") || cleanName.includes("sáng tạo")) {
    return { Icon: Cpu, bg: "bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-md shadow-amber-500/20", badge: "bg-amber-50 text-amber-700 border-amber-200" }
  }
  if (cleanCode.includes("HOC_THUAT") || cleanCode.includes("ACADEMIC") || cleanName.includes("học thuật") || cleanName.includes("học tập")) {
    return { Icon: BookOpen, bg: "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20", badge: "bg-blue-50 text-blue-700 border-blue-200" }
  }
  if (cleanCode.includes("KY_NANG") || cleanCode.includes("SKILL") || cleanName.includes("kỹ năng")) {
    return { Icon: Lightbulb, bg: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" }
  }
  if (cleanCode.includes("NT_TT") || cleanCode.includes("THE_THAO") || cleanName.includes("nghệ thuật") || cleanName.includes("thể thao") || cleanName.includes("âm nhạc") || cleanName.includes("mỹ thuật")) {
    return { Icon: Trophy, bg: "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20", badge: "bg-rose-50 text-rose-700 border-rose-200" }
  }
  return { Icon: Tag, bg: "bg-gradient-to-br from-[#36E08F] to-[#008A81] text-white shadow-md shadow-teal-500/20", badge: "bg-teal-50 text-[#36E08F] border-teal-200" }
}

export function CategoriesClient({ initialCategories, academicYears }: ExamCategoryClientProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [searchQuery, setSearchQuery] = useState("")
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

  const displayCategories = categories
    .filter((c: any) => c.academicYearId === null || c.academicYearId === yearId)
    .filter((c: any) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (c.name || "").toLowerCase().includes(q) || (c.code || "").toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q)
    })

  const totalExams = displayCategories.reduce((acc, cat) => {
    const count = cat.exams ? cat.exams.filter((e: any) => e.academicYearId === yearId).length : 0
    return acc + count
  }, 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 4 Summary Vibrant KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 no-print">
        {/* Card 1: Tổng danh mục */}
        <div className="bg-gradient-to-br from-indigo-50/90 via-slate-50 to-indigo-100/60 p-5 rounded-2xl border border-indigo-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[10px] font-extrabold text-indigo-800 uppercase tracking-wider block mb-1">Tổng số danh mục</div>
          <div className="text-3xl font-black text-indigo-950 leading-none">{displayCategories.length}</div>
          <div className="text-[10px] text-indigo-600/80 font-bold mt-1.5">danh mục kỳ thi</div>
        </div>

        {/* Card 2: Tổng số Kỳ thi */}
        <div className="bg-gradient-to-br from-teal-50/90 via-cyan-50/40 to-teal-100/60 p-5 rounded-2xl border border-teal-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-[#36E08F] text-white rounded-xl shadow-md shadow-teal-500/20 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider block mb-1">Tổng kỳ thi được gán</div>
          <div className="text-3xl font-black text-teal-950 leading-none">{totalExams}</div>
          <div className="text-[10px] text-teal-600/80 font-bold mt-1.5">kỳ thi hiện tại</div>
        </div>

        {/* Card 3: Nhóm Học thuật & Công nghệ */}
        <div className="bg-gradient-to-br from-amber-50/90 via-yellow-50/40 to-amber-100/60 p-5 rounded-2xl border border-amber-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block mb-1">Công nghệ & Sáng tạo</div>
          <div className="text-3xl font-black text-amber-950 leading-none">
            {displayCategories.filter(c => (c.code || "").includes("CN") || (c.name || "").toLowerCase().includes("công nghệ")).length}
          </div>
          <div className="text-[10px] text-amber-600/80 font-bold mt-1.5">danh mục nhóm CNTT</div>
        </div>

        {/* Card 4: Trạng thái hệ thống */}
        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-emerald-100/60 p-5 rounded-2xl border border-emerald-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block mb-1">Năm học áp dụng</div>
          <div className="text-xl font-black text-emerald-950 leading-tight truncate">
            {academicYears.find(y => y.id === yearId)?.name || "Tất cả"}
          </div>
          <div className="text-[10px] text-emerald-600/80 font-bold mt-1.5">Trạng thái Hoạt động</div>
        </div>
      </div>

      {/* Header Bar with Search & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#36E08F]" />
            Danh Sách Danh Mục Kỳ Thi ({displayCategories.length})
          </h3>
          <p className="text-slate-500 text-xs font-medium">
            Phân loại các kỳ thi theo từng nhóm chủ đề để quản lý và theo dõi kết quả chuẩn xác.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Quick Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc mã..."
              className="w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#36E08F]/20 focus:border-[#36E08F] outline-none transition-all text-slate-700"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#36E08F] to-[#009085] hover:opacity-95 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-[#36E08F]/20 transition-all text-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tạo Danh Mục Mới
          </button>
        </div>
      </div>

      {/* Redesigned Table of Category Rows */}
      {displayCategories.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center py-20 text-slate-400 shadow-xs">
          <Tag className="w-16 h-16 mb-4 opacity-20 text-[#36E08F]" />
          <p className="font-bold text-slate-700 text-base mb-1">Không tìm thấy danh mục nào</p>
          <p className="text-xs text-slate-400 font-medium">Nhấn "Tạo Danh Mục Mới" để thêm danh mục mới vào hệ thống.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Tên Danh mục</th>
                  <th className="py-4 px-5">Mã (Code)</th>
                  <th className="py-4 px-5">Mô tả chi tiết</th>
                  <th className="py-4 px-5 text-center">Số lượng Kỳ thi</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-xs">
                {displayCategories.map((cat: any) => {
                  const examCount = cat.exams ? cat.exams.filter((e: any) => e.academicYearId === yearId).length : 0;
                  const { Icon, bg, badge } = getCategoryIconAndColor(cat.code, cat.name);
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-black text-slate-800 text-sm block">{cat.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Danh mục kỳ thi</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4.5 px-5">
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-md font-mono text-[11px] font-bold">
                          {cat.code}
                        </span>
                      </td>
                      <td className="py-4.5 px-5 text-slate-600 max-w-sm" title={cat.description || ''}>
                        {cat.description ? (
                          <span className="line-clamp-2 leading-relaxed">{cat.description}</span>
                        ) : (
                          <span className="text-slate-300 italic font-normal">Chưa có mô tả</span>
                        )}
                      </td>
                      <td className="py-4.5 px-5 text-center">
                        <span className="bg-teal-50 text-[#36E08F] border border-teal-200/80 px-3 py-1 rounded-full text-xs font-extrabold shadow-2xs">
                          {examCount} kỳ thi
                        </span>
                      </td>
                      <td className="py-4.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(cat)}
                            className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer border border-slate-200/60 shadow-2xs"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4 text-slate-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id, cat.name)}
                            className="p-2 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-xl transition-all cursor-pointer border border-rose-100 shadow-2xs"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
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
            <div className="bg-gradient-to-r from-[#003B3A] via-[#007A72] to-[#36E08F] text-white px-6 py-4.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Tag className="w-5 h-5 text-teal-200" />
                </div>
                <h3 className="font-black text-base">Tạo Danh Mục Mới</h3>
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
                <label className="block text-slate-600 uppercase tracking-wider font-extrabold">
                  Tên Danh Mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newForm.name}
                  onChange={e => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="Ví dụ: Công nghệ - Sáng tạo, Học thuật..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#36E08F] focus:ring-2 focus:ring-[#36E08F]/10 outline-none transition-all font-semibold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-600 uppercase tracking-wider font-extrabold">
                  Mã (Code) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newForm.code}
                  onChange={e => setNewForm({ ...newForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  placeholder="Ví dụ: CN_ST, HOC_THUAT..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#36E08F] focus:ring-2 focus:ring-[#36E08F]/10 outline-none font-mono transition-all font-semibold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-600 uppercase tracking-wider font-extrabold">Mô tả danh mục</label>
                <textarea
                  value={newForm.description}
                  onChange={e => setNewForm({ ...newForm, description: e.target.value })}
                  placeholder="Nhập mô tả chi tiết danh mục..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#36E08F] outline-none font-semibold text-slate-700 bg-slate-50/50"
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
                className="px-6 py-2.5 bg-gradient-to-r from-[#36E08F] to-[#009085] hover:opacity-95 text-white rounded-xl font-bold text-xs shadow-md shadow-[#36E08F]/20 transition-all disabled:opacity-60 cursor-pointer"
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
            <div className="bg-gradient-to-r from-[#003B3A] via-[#007A72] to-[#36E08F] text-white px-6 py-4.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Tag className="w-5 h-5 text-teal-200" />
                </div>
                <h3 className="font-black text-base">Chỉnh Sửa Danh Mục</h3>
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
                <label className="block text-slate-600 uppercase tracking-wider font-extrabold">Tên Danh Mục</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#36E08F] focus:ring-2 focus:ring-[#36E08F]/10 outline-none transition-all font-semibold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-600 uppercase tracking-wider font-extrabold">Mã (Code)</label>
                <input
                  type="text"
                  value={editForm.code}
                  onChange={e => setEditForm({ ...editForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#36E08F] focus:ring-2 focus:ring-[#36E08F]/10 outline-none font-mono transition-all font-semibold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-600 uppercase tracking-wider font-extrabold">Mô tả</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#36E08F] outline-none font-semibold text-slate-700 bg-slate-50/50"
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
                className="px-6 py-2.5 bg-gradient-to-r from-[#36E08F] to-[#009085] hover:opacity-95 text-white rounded-xl font-bold text-xs shadow-md shadow-[#36E08F]/20 transition-all disabled:opacity-60 cursor-pointer"
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
