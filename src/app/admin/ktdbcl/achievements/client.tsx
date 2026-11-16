"use client"

import { useState, useMemo } from "react"
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Trophy,
  Medal,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import {
  createAchievementCategoryAction,
  updateAchievementCategoryAction,
  deleteAchievementCategoryAction,
  createAchievementLevelAction,
  updateAchievementLevelAction,
  deleteAchievementLevelAction,
} from "./actions"

interface AchievementsClientProps {
  initialCategories: any[]
  initialLevels: any[]
  academicYears: any[]
}

export function AchievementsClient({
  initialCategories,
  initialLevels,
}: AchievementsClientProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [levels, setLevels] = useState(initialLevels)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("")

  // Category Form State
  const [creatingCat, setCreatingCat] = useState(false)
  const [newCatForm, setNewCatForm] = useState({ name: "", code: "", description: "" })
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatForm, setEditCatForm] = useState({ name: "", code: "", description: "" })

  // Level Form State
  const [creatingLvl, setCreatingLvl] = useState(false)
  const [newLvlForm, setNewLvlForm] = useState({
    name: "",
    code: "",
    description: "",
    categoryId: "",
  })
  const [editingLvlId, setEditingLvlId] = useState<string | null>(null)
  const [editLvlForm, setEditLvlForm] = useState({
    name: "",
    code: "",
    description: "",
    categoryId: "",
  })

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text })
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev))
    }, 3200)
  }

  // --- Category Handlers ---
  const handleCreateCategory = async () => {
    if (!newCatForm.name.trim() || !newCatForm.code.trim()) {
      showToast("error", "Vui lòng nhập Tên loại và Mã loại thành tích.")
      return
    }
    setSaving(true)
    try {
      const created = await createAchievementCategoryAction({
        ...newCatForm,
        academicYearId: null,
      })
      setCategories((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "vi"))
      )
      setNewCatForm({ name: "", code: "", description: "" })
      setCreatingCat(false)
      showToast("success", `Đã thêm loại thành tích "${created.name}".`)
    } catch (e: any) {
      showToast("error", e?.message || "Mã loại thành tích đã tồn tại.")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEditCategory = async (id: string) => {
    if (!editCatForm.name.trim() || !editCatForm.code.trim()) {
      showToast("error", "Tên và Mã loại thành tích không được để trống.")
      return
    }
    setSaving(true)
    try {
      const updated = await updateAchievementCategoryAction({
        id,
        ...editCatForm,
        academicYearId: null,
      })
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)))
      setEditingCatId(null)
      showToast("success", "Đã cập nhật loại thành tích.")
    } catch (e: any) {
      showToast("error", e?.message || "Không thể cập nhật loại thành tích.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Xóa loại thành tích "${name}"?`)) return
    try {
      await deleteAchievementCategoryAction(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
      if (selectedCategoryFilter === id) setSelectedCategoryFilter("")
      showToast("success", `Đã xóa loại thành tích "${name}".`)
    } catch (e: any) {
      showToast("error", e?.message || "Có lỗi xảy ra khi xóa loại thành tích.")
    }
  }

  // --- Level Handlers ---
  const handleCreateLevel = async () => {
    if (!newLvlForm.name.trim() || !newLvlForm.code.trim()) {
      showToast("error", "Vui lòng nhập Tên mức giải và Mã mức giải.")
      return
    }
    setSaving(true)
    try {
      const created = await createAchievementLevelAction({
        ...newLvlForm,
        categoryId: newLvlForm.categoryId || selectedCategoryFilter || null,
        academicYearId: null,
      })
      setLevels((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "vi"))
      )
      setNewLvlForm({ name: "", code: "", description: "", categoryId: "" })
      setCreatingLvl(false)
      showToast("success", `Đã thêm mức giải "${created.name}".`)
    } catch (e: any) {
      showToast("error", e?.message || "Mã mức giải đã tồn tại.")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEditLevel = async (id: string) => {
    if (!editLvlForm.name.trim() || !editLvlForm.code.trim()) {
      showToast("error", "Tên và Mã mức giải không được để trống.")
      return
    }
    setSaving(true)
    try {
      const updated = await updateAchievementLevelAction({
        id,
        name: editLvlForm.name,
        code: editLvlForm.code,
        description: editLvlForm.description,
        categoryId: editLvlForm.categoryId || null,
        academicYearId: null,
      })
      setLevels((prev) => prev.map((l) => (l.id === id ? updated : l)))
      setEditingLvlId(null)
      showToast("success", "Đã cập nhật mức giải thưởng.")
    } catch (e: any) {
      showToast("error", e?.message || "Không thể cập nhật mức giải.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLevel = async (id: string, name: string) => {
    if (!confirm(`Xóa mức giải "${name}"?`)) return
    try {
      await deleteAchievementLevelAction(id)
      setLevels((prev) => prev.filter((l) => l.id !== id))
      showToast("success", `Đã xóa mức giải "${name}".`)
    } catch (e: any) {
      showToast("error", e?.message || "Có lỗi xảy ra khi xóa mức giải.")
    }
  }

  const filteredLevels = useMemo(() => {
    if (!selectedCategoryFilter) return levels
    return levels.filter((l) => l.categoryId === selectedCategoryFilter)
  }, [levels, selectedCategoryFilter])

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

      {/* Side-by-side 2-Column Academic Ledger Dictionary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN (5/12): Loại thành tích */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 tabular-nums">
              <Trophy className="w-4 h-4 text-[#008B85]" />
              <span className="text-xs font-semibold text-[#003B3A]">
                Loại thành tích ({categories.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCreatingCat((v) => !v)
                setEditingCatId(null)
              }}
              className="inline-flex items-center gap-1 bg-[#003B3A] hover:bg-[#002928] text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span>Thêm loại</span>
            </button>
          </div>

          {creatingCat && (
            <div className="p-3 bg-[#F8FAFC] border-b border-[#E2E8F0] space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newCatForm.name}
                  onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })}
                  placeholder="Tên loại (VD: Giải thưởng) *"
                  className="border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white focus:border-[#00A19A] outline-none"
                />
                <input
                  type="text"
                  value={newCatForm.code}
                  onChange={(e) =>
                    setNewCatForm({
                      ...newCatForm,
                      code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                    })
                  }
                  placeholder="Mã (GIAI_THUONG) *"
                  className="border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 font-mono bg-white focus:border-[#00A19A] outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCatForm.description}
                  onChange={(e) => setNewCatForm({ ...newCatForm, description: e.target.value })}
                  placeholder="Mô tả ngắn (tùy chọn)..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCategory()
                  }}
                  className="flex-1 border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white focus:border-[#00A19A] outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={saving}
                  className="px-3 py-1.5 bg-[#008B85] hover:bg-[#00736E] text-white rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Lưu"}
                </button>
                <button
                  type="button"
                  onClick={() => setCreatingCat(false)}
                  className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] text-slate-600 rounded-lg font-medium cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {categories.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Chưa có loại thành tích nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 text-white">Tên loại</th>
                    <th className="py-3 px-3 text-teal-100">Mã</th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4]">Mức giải</th>
                    <th className="py-3 px-3 text-right text-white">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {categories.map((cat: any) => {
                    const isEditing = editingCatId === cat.id
                    const isSelected = selectedCategoryFilter === cat.id
                    const levelCount = levels.filter((l) => l.categoryId === cat.id).length

                    return (
                      <tr
                        key={cat.id}
                        onClick={() => {
                          if (!isEditing) {
                            setSelectedCategoryFilter((prev) => (prev === cat.id ? "" : cat.id))
                          }
                        }}
                        className={`transition-colors align-middle cursor-pointer ${
                          isSelected
                            ? "bg-[#F0FDFA]/80 hover:bg-[#F0FDFA]"
                            : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <td className="py-3 px-3 align-middle">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editCatForm.name}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                setEditCatForm({ ...editCatForm, name: e.target.value })
                              }
                              className="w-full border border-[#00A19A] rounded-lg px-2 py-1 text-xs font-semibold bg-white outline-none"
                            />
                          ) : (
                            <div>
                              <div className="font-semibold text-slate-900">{cat.name}</div>
                              {cat.description && (
                                <div className="text-[11px] text-slate-500 line-clamp-1">
                                  {cat.description}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editCatForm.code}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                setEditCatForm({
                                  ...editCatForm,
                                  code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                                })
                              }
                              className="w-28 border border-[#00A19A] rounded-lg px-2 py-1 text-xs font-mono bg-white outline-none"
                            />
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-[11px] text-slate-700">
                              {cat.code}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                            {levelCount}
                          </span>
                        </td>

                        <td
                          className="py-3 px-3 align-middle text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEditCategory(cat.id)}
                                className="p-1.5 rounded-lg bg-[#003B3A] text-white hover:bg-[#00736E] cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCatId(null)}
                                className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] text-slate-500 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCatId(cat.id)
                                  setEditCatForm({
                                    name: cat.name,
                                    code: cat.code,
                                    description: cat.description || "",
                                  })
                                }}
                                className="p-1.5 text-slate-500 hover:text-[#003B3A] hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className="p-1.5 text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 rounded-lg cursor-pointer"
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

        {/* RIGHT COLUMN (7/12): Mức giải thưởng */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 tabular-nums">
              <Medal className="w-4 h-4 text-[#008B85]" />
              <span className="text-xs font-semibold text-[#003B3A]">
                Mức giải thưởng ({filteredLevels.length})
              </span>
              {selectedCategoryFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("")}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-[11px] font-medium cursor-pointer"
                >
                  <span>
                    Lọc: {categories.find((c) => c.id === selectedCategoryFilter)?.name}
                  </span>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setCreatingLvl((v) => !v)
                setEditingLvlId(null)
                if (!creatingLvl && selectedCategoryFilter) {
                  setNewLvlForm((prev) => ({ ...prev, categoryId: selectedCategoryFilter }))
                }
              }}
              className="inline-flex items-center gap-1 bg-[#003B3A] hover:bg-[#002928] text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span>Thêm mức giải</span>
            </button>
          </div>

          {creatingLvl && (
            <div className="p-3 bg-[#F8FAFC] border-b border-[#E2E8F0] space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newLvlForm.name}
                  onChange={(e) => setNewLvlForm({ ...newLvlForm, name: e.target.value })}
                  placeholder="Tên mức giải (VD: Giải Nhất) *"
                  className="border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white focus:border-[#00A19A] outline-none"
                />
                <input
                  type="text"
                  value={newLvlForm.code}
                  onChange={(e) =>
                    setNewLvlForm({
                      ...newLvlForm,
                      code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                    })
                  }
                  placeholder="Mã (NHAT, VANG) *"
                  className="border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 font-mono bg-white focus:border-[#00A19A] outline-none"
                />
                <select
                  value={newLvlForm.categoryId}
                  onChange={(e) => setNewLvlForm({ ...newLvlForm, categoryId: e.target.value })}
                  className="border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white focus:border-[#00A19A] outline-none"
                >
                  <option value="">-- Thuộc loại thành tích --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLvlForm.description}
                  onChange={(e) => setNewLvlForm({ ...newLvlForm, description: e.target.value })}
                  placeholder="Mô tả thêm (tùy chọn)..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateLevel()
                  }}
                  className="flex-1 border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white focus:border-[#00A19A] outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateLevel}
                  disabled={saving}
                  className="px-3 py-1.5 bg-[#008B85] hover:bg-[#00736E] text-white rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Lưu"}
                </button>
                <button
                  type="button"
                  onClick={() => setCreatingLvl(false)}
                  className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] text-slate-600 rounded-lg font-medium cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {filteredLevels.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Chưa có mức giải thưởng nào phù hợp.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 text-white">Mức giải thưởng</th>
                    <th className="py-3 px-3 text-teal-100">Mã</th>
                    <th className="py-3 px-3 text-teal-100">Thuộc loại</th>
                    <th className="py-3 px-3 text-right text-white">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {filteredLevels.map((lvl: any) => {
                    const isEditing = editingLvlId === lvl.id
                    const associatedCategory = categories.find((c) => c.id === lvl.categoryId)

                    return (
                      <tr
                        key={lvl.id}
                        className={`transition-colors align-middle ${
                          isEditing ? "bg-[#F0FDFA]/60" : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <td className="py-3 px-3 align-middle">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editLvlForm.name}
                              onChange={(e) =>
                                setEditLvlForm({ ...editLvlForm, name: e.target.value })
                              }
                              className="w-full border border-[#00A19A] rounded-lg px-2 py-1 text-xs font-semibold bg-white outline-none"
                            />
                          ) : (
                            <div>
                              <div className="font-semibold text-slate-900">{lvl.name}</div>
                              {lvl.description && (
                                <div className="text-[11px] text-slate-500 line-clamp-1">
                                  {lvl.description}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editLvlForm.code}
                              onChange={(e) =>
                                setEditLvlForm({
                                  ...editLvlForm,
                                  code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                                })
                              }
                              className="w-28 border border-[#00A19A] rounded-lg px-2 py-1 text-xs font-mono bg-white outline-none"
                            />
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-[11px] text-slate-700">
                              {lvl.code}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          {isEditing ? (
                            <select
                              value={editLvlForm.categoryId}
                              onChange={(e) =>
                                setEditLvlForm({ ...editLvlForm, categoryId: e.target.value })
                              }
                              className="border border-[#00A19A] rounded-lg px-2 py-1 text-xs bg-white outline-none"
                            >
                              <option value="">-- Chưa phân loại --</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          ) : associatedCategory ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-[11px] font-medium">
                              {associatedCategory.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Chưa phân loại</span>
                          )}
                        </td>

                        <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEditLevel(lvl.id)}
                                className="p-1.5 rounded-lg bg-[#003B3A] text-white hover:bg-[#00736E] cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingLvlId(null)}
                                className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] text-slate-500 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLvlId(lvl.id)
                                  setEditLvlForm({
                                    name: lvl.name,
                                    code: lvl.code,
                                    description: lvl.description || "",
                                    categoryId: lvl.categoryId || "",
                                  })
                                }}
                                className="p-1.5 text-slate-500 hover:text-[#003B3A] hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLevel(lvl.id, lvl.name)}
                                className="p-1.5 text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 rounded-lg cursor-pointer"
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
    </div>
  )
}
