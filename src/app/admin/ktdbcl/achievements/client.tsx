"use client"
import { useState, useEffect } from "react"
import { Plus, Trash2, Edit2, Check, X, Trophy, Medal, Hash, FileText } from "lucide-react"
import { 
  createAchievementCategoryAction, 
  updateAchievementCategoryAction, 
  deleteAchievementCategoryAction,
  createAchievementLevelAction,
  updateAchievementLevelAction,
  deleteAchievementLevelAction
} from "./actions"

interface AchievementsClientProps {
  initialCategories: any[]
  initialLevels: any[]
  academicYears: any[]
}

export function AchievementsClient({ 
  initialCategories, 
  initialLevels, 
  academicYears 
}: AchievementsClientProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [levels, setLevels] = useState(initialLevels)
  const [activeSubTab, setActiveSubTab] = useState<'categories' | 'levels'>('categories')
  
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

  // Category State
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatForm, setEditCatForm] = useState({ name: "", code: "", description: "" })
  const [creatingCat, setCreatingCat] = useState(false)
  const [newCatForm, setNewCatForm] = useState({ name: "", code: "", description: "" })

  // Level State
  const [editingLvlId, setEditingLvlId] = useState<string | null>(null)
  const [editLvlForm, setEditLvlForm] = useState({ name: "", code: "", description: "" })
  const [creatingLvl, setCreatingLvl] = useState(false)
  const [newLvlForm, setNewLvlForm] = useState({ name: "", code: "", description: "" })

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // --- Category Handlers ---
  
  const handleCreateCategory = async () => {
    if (!newCatForm.name.trim() || !newCatForm.code.trim()) {
      setErrorMsg("Vui lòng nhập Tên loại và Mã loại thành tích!")
      return
    }
    setSaving(true)
    setErrorMsg("")
    try {
      await createAchievementCategoryAction({ ...newCatForm, academicYearId: null })
      setCategories([...categories, { ...newCatForm, id: `temp_${Date.now()}`, academicYearId: null }])
      setNewCatForm({ name: "", code: "", description: "" })
      setCreatingCat(false)
      window.location.reload()
    } catch (e) {
      setErrorMsg("Mã loại thành tích đã tồn tại hoặc có lỗi xảy ra.")
    } finally {
      setSaving(false)
    }
  }

  const handleEditCategory = (cat: any) => {
    setEditingCatId(cat.id)
    setEditCatForm({ name: cat.name, code: cat.code, description: cat.description || "" })
  }

  const handleSaveEditCategory = async (id: string) => {
    if (!editCatForm.name.trim() || !editCatForm.code.trim()) return
    setSaving(true)
    try {
      await updateAchievementCategoryAction({ id, ...editCatForm, academicYearId: null })
      setCategories(categories.map((c) => c.id === id ? { ...c, ...editCatForm } : c))
      setEditingCatId(null)
    } catch (e) {
      alert("Mã loại thành tích đã tồn tại hoặc xảy ra lỗi.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Xóa loại thành tích "${name}"?`)) return
    try {
      await deleteAchievementCategoryAction(id)
      setCategories(categories.filter((c) => c.id !== id))
    } catch (e) {
      alert("Có lỗi xảy ra khi xóa loại thành tích.")
    }
  }

  // --- Level Handlers ---

  const handleCreateLevel = async () => {
    if (!newLvlForm.name.trim() || !newLvlForm.code.trim()) {
      setErrorMsg("Vui lòng nhập Tên mức giải và Mã mức giải!")
      return
    }
    setSaving(true)
    setErrorMsg("")
    try {
      await createAchievementLevelAction({ ...newLvlForm, academicYearId: null })
      setLevels([...levels, { ...newLvlForm, id: `temp_${Date.now()}`, academicYearId: null }])
      setNewLvlForm({ name: "", code: "", description: "" })
      setCreatingLvl(false)
      window.location.reload()
    } catch (e) {
      setErrorMsg("Mã mức giải đã tồn tại hoặc có lỗi xảy ra.")
    } finally {
      setSaving(false)
    }
  }

  const handleEditLevel = (lvl: any) => {
    setEditingLvlId(lvl.id)
    setEditLvlForm({ name: lvl.name, code: lvl.code, description: lvl.description || "" })
  }

  const handleSaveEditLevel = async (id: string) => {
    if (!editLvlForm.name.trim() || !editLvlForm.code.trim()) return
    setSaving(true)
    try {
      await updateAchievementLevelAction({ id, ...editLvlForm, academicYearId: null })
      setLevels(levels.map((l) => l.id === id ? { ...l, ...editLvlForm } : l))
      setEditingLvlId(null)
    } catch (e) {
      alert("Mã mức giải đã tồn tại hoặc xảy ra lỗi.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLevel = async (id: string, name: string) => {
    if (!confirm(`Xóa mức giải "${name}"?`)) return
    try {
      await deleteAchievementLevelAction(id)
      setLevels(levels.filter((l) => l.id !== id))
    } catch (e) {
      alert("Có lỗi xảy ra khi xóa mức giải.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs header */}
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => { setActiveSubTab('categories'); setErrorMsg(""); setCreatingCat(false); setCreatingLvl(false); }}
          className={`pb-3 text-xs font-black transition-all border-b-2 px-4 flex items-center gap-1.5 ${
            activeSubTab === 'categories' 
              ? 'border-[#00A99D] text-[#00A99D]' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Trophy className="w-4 h-4" />
          Loại Thành Tích
        </button>
        <button
          onClick={() => { setActiveSubTab('levels'); setErrorMsg(""); setCreatingCat(false); setCreatingLvl(false); }}
          className={`pb-3 text-xs font-black transition-all border-b-2 px-4 flex items-center gap-1.5 ${
            activeSubTab === 'levels' 
              ? 'border-[#00A99D] text-[#00A99D]' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Medal className="w-4 h-4" />
          Mức Giải thưởng
        </button>
      </div>

      {activeSubTab === 'categories' ? (
        // === CATEGORIES TAB ===
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-sm font-medium">Tạo và quản lý các loại thành tích học sinh (ví dụ: Giải thưởng, Huy chương, Chứng nhận...).</p>
            <button
              onClick={() => { setCreatingCat(true); setErrorMsg("") }}
              className="flex items-center gap-2 bg-[#00A99D] hover:bg-[#009085] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-[#00A99D]/20 transition-all text-xs"
            >
              <Plus className="w-4 h-4" />
              Thêm Loại Mới
            </button>
          </div>

          {creatingCat && (
            <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-md shadow-indigo-50 animate-fade-in">
              <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#00A99D]" />
                Thêm Loại Thành Tích Mới
              </h3>
              {errorMsg && (
                <div className="mb-4 text-red-700 bg-red-50 p-3 rounded-lg border border-red-100 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Tên Loại Thành Tích <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCatForm.name}
                    onChange={e => setNewCatForm({ ...newCatForm, name: e.target.value })}
                    placeholder="Ví dụ: Giải thưởng, Huy chương, Chứng nhận..."
                    className="w-full border border-slate-200 rounded-lg px-4 py-2 text-xs focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10 outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Mã (Code) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCatForm.code}
                    onChange={e => setNewCatForm({ ...newCatForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    placeholder="Ví dụ: GIAI_THUONG"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2 text-xs focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10 outline-none font-mono transition-all font-semibold"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Mô tả</label>
                <textarea
                  value={newCatForm.description}
                  onChange={e => setNewCatForm({ ...newCatForm, description: e.target.value })}
                  placeholder="Nhập mô tả chi tiết..."
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-xs focus:border-[#00A99D] outline-none font-semibold"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-slate-100">
                <button
                  onClick={handleCreateCategory}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#00A99D] hover:bg-[#009085] text-white rounded-lg font-bold text-xs shadow-md shadow-[#00A99D]/20 transition-all disabled:opacity-60"
                >
                  {saving ? "Đang lưu..." : "Lưu Lại"}
                </button>
                <button
                  onClick={() => { setCreatingCat(false); setErrorMsg("") }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-all"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200/80 border-2 border-slate-100 overflow-hidden">
            <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4">
              <span className="font-bold text-slate-700 text-sm">Danh Sách Loại Thành Tích ({categories.length})</span>
            </div>

            {categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Trophy className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-bold text-lg mb-1">Chưa có loại thành tích nào</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {categories.map((cat: any) => {
                  const isEditing = editingCatId === cat.id
                  return (
                    <div key={cat.id} className="flex flex-col p-6 hover:bg-slate-50/50 transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-teal-50 text-[#00A99D] rounded-xl flex items-center justify-center flex-shrink-0">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Tên Loại Thành Tích</label>
                                <input
                                  type="text"
                                  value={editCatForm.name}
                                  onChange={e => setEditCatForm({ ...editCatForm, name: e.target.value })}
                                  className="w-full border border-slate-200 rounded px-2.5 py-1 text-xs outline-none focus:border-[#00A99D] font-semibold"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Mã (Code)</label>
                                <input
                                  type="text"
                                  value={editCatForm.code}
                                  onChange={e => setEditCatForm({ ...editCatForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                  className="w-full border border-slate-200 rounded px-2.5 py-1 text-xs outline-none focus:border-[#00A99D] font-mono font-semibold"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Mô tả</label>
                                <textarea
                                  value={editCatForm.description}
                                  onChange={e => setEditCatForm({ ...editCatForm, description: e.target.value })}
                                  className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#00A99D] font-semibold"
                                  rows={2}
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-slate-800 text-sm">{cat.name}</h4>
                                <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 font-mono font-black px-2 py-0.5 rounded-full border border-slate-200">
                                  <Hash className="w-3 h-3 text-slate-400" />
                                  {cat.code}
                                </span>
                              </div>
                              <p className="text-slate-500 text-xs mt-1.5 flex items-start gap-1 font-semibold">
                                <FileText className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-shrink-0" />
                                <span>{cat.description || "Chưa có mô tả chi tiết."}</span>
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 self-start no-print">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEditCategory(cat.id)}
                                disabled={saving}
                                className="w-7 h-7 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg flex items-center justify-center transition-all shadow-xs border border-emerald-100"
                                title="Lưu thay đổi"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingCatId(null)}
                                className="w-7 h-7 bg-slate-50 text-slate-500 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-all border border-slate-200/60"
                                title="Hủy"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditCategory(cat)}
                                className="w-7 h-7 bg-slate-50 text-slate-400 hover:text-[#00A99D] hover:bg-[#00A99D]/5 rounded-lg flex items-center justify-center transition-all border border-slate-200/60"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className="w-7 h-7 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center transition-all border border-slate-200/60"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
      ) : (
        // === LEVELS TAB ===
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-sm font-medium">Tạo và quản lý các mức giải thưởng (ví dụ: Giải Nhất, Giải Nhì, Huy chương Vàng, Huy chương Bạc...).</p>
            <button
              onClick={() => { setCreatingLvl(true); setErrorMsg("") }}
              className="flex items-center gap-2 bg-[#00A99D] hover:bg-[#009085] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-[#00A99D]/20 transition-all text-xs"
            >
              <Plus className="w-4 h-4" />
              Thêm Mức giải Mới
            </button>
          </div>

          {creatingLvl && (
            <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-md shadow-indigo-50 animate-fade-in">
              <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                <Medal className="w-5 h-5 text-[#00A99D]" />
                Thêm Mức giải Mới
              </h3>
              {errorMsg && (
                <div className="mb-4 text-red-700 bg-red-50 p-3 rounded-lg border border-red-100 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Tên Mức giải <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newLvlForm.name}
                    onChange={e => setNewLvlForm({ ...newLvlForm, name: e.target.value })}
                    placeholder="Ví dụ: Giải Nhất, Huy chương Vàng..."
                    className="w-full border border-slate-200 rounded-lg px-4 py-2 text-xs focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10 outline-none transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Mã (Code) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newLvlForm.code}
                    onChange={e => setNewLvlForm({ ...newLvlForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    placeholder="Ví dụ: NHAT, VANG"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2 text-xs focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10 outline-none font-mono transition-all font-semibold"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Mô tả</label>
                <textarea
                  value={newLvlForm.description}
                  onChange={e => setNewLvlForm({ ...newLvlForm, description: e.target.value })}
                  placeholder="Nhập mô tả chi tiết..."
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-xs focus:border-[#00A99D] outline-none font-semibold"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-slate-100">
                <button
                  onClick={handleCreateLevel}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#00A99D] hover:bg-[#009085] text-white rounded-lg font-bold text-xs shadow-md shadow-[#00A99D]/20 transition-all disabled:opacity-60"
                >
                  {saving ? "Đang lưu..." : "Lưu Lại"}
                </button>
                <button
                  onClick={() => { setCreatingLvl(false); setErrorMsg("") }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-all"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200/80 border-2 border-slate-100 overflow-hidden">
            <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4">
              <span className="font-bold text-slate-700 text-sm">Danh Sách Mức giải ({levels.length})</span>
            </div>

            {levels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Medal className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-bold text-lg mb-1">Chưa có mức giải nào</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {levels.map((lvl: any) => {
                  const isEditing = editingLvlId === lvl.id
                  return (
                    <div key={lvl.id} className="flex flex-col p-6 hover:bg-slate-50/50 transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Medal className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Tên Mức giải</label>
                                <input
                                  type="text"
                                  value={editLvlForm.name}
                                  onChange={e => setEditLvlForm({ ...editLvlForm, name: e.target.value })}
                                  className="w-full border border-slate-200 rounded px-2.5 py-1 text-xs outline-none focus:border-[#00A99D] font-semibold"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Mã (Code)</label>
                                <input
                                  type="text"
                                  value={editLvlForm.code}
                                  onChange={e => setEditLvlForm({ ...editLvlForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                  className="w-full border border-slate-200 rounded px-2.5 py-1 text-xs outline-none focus:border-[#00A99D] font-mono font-semibold"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Mô tả</label>
                                <textarea
                                  value={editLvlForm.description}
                                  onChange={e => setEditLvlForm({ ...editLvlForm, description: e.target.value })}
                                  className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#00A99D] font-semibold"
                                  rows={2}
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-slate-800 text-sm">{lvl.name}</h4>
                                <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 font-mono font-black px-2 py-0.5 rounded-full border border-slate-200">
                                  <Hash className="w-3 h-3 text-slate-400" />
                                  {lvl.code}
                                </span>
                              </div>
                              <p className="text-slate-500 text-xs mt-1.5 flex items-start gap-1 font-semibold">
                                <FileText className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-shrink-0" />
                                <span>{lvl.description || "Chưa có mô tả chi tiết."}</span>
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 self-start no-print">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEditLevel(lvl.id)}
                                disabled={saving}
                                className="w-7 h-7 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg flex items-center justify-center transition-all shadow-xs border border-emerald-100"
                                title="Lưu thay đổi"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingLvlId(null)}
                                className="w-7 h-7 bg-slate-50 text-slate-500 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-all border border-slate-200/60"
                                title="Hủy"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditLevel(lvl)}
                                className="w-7 h-7 bg-slate-50 text-slate-400 hover:text-[#00A99D] hover:bg-[#00A99D]/5 rounded-lg flex items-center justify-center transition-all border border-slate-200/60"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLevel(lvl.id, lvl.name)}
                                className="w-7 h-7 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center transition-all border border-slate-200/60"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
      )}
    </div>
  )
}
