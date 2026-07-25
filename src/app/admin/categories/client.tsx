"use client"
import { useState } from "react"
import { Plus, Trash2, Edit2, Check, X, Tag, Hash, Folder, CornerDownRight, Search, Info, FolderPlus } from "lucide-react"
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "./actions"

export function CategoriesClient({ initialCategories }) {
  const [categories, setCategories] = useState(initialCategories)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: "", code: "", sortOrder: 0, parentId: "" })
  const [creating, setCreating] = useState(false)
  const [newForm, setNewForm] = useState({ name: "", code: "", sortOrder: 0, parentId: "" })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // Filter root categories
  const rootCategories = categories
    .filter(c => !c.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const parentOptions = (currentId = null) => {
    return categories.filter(c => !c.parentId && c.id !== currentId && c.status === "ACTIVE")
  }

  const handleCreate = async () => {
    if (!newForm.name.trim() || !newForm.code.trim()) {
      setErrorMsg("Vui lòng nhập Tên danh mục và Mã danh mục!")
      return
    }
    setSaving(true)
    setErrorMsg("")
    try {
      const parentIdVal = newForm.parentId === "" ? null : newForm.parentId
      const newCat = await createCategoryAction({
        name: newForm.name,
        code: newForm.code,
        sortOrder: newForm.sortOrder,
        parentId: parentIdVal
      })
      setCategories([...categories, newCat])
      setNewForm({ name: "", code: "", sortOrder: 0, parentId: "" })
      setCreating(false)
    } catch (e) {
      setErrorMsg("Mã danh mục đã tồn tại hoặc có lỗi xảy ra. Vui lòng thử lại!")
    }
    setSaving(false)
  }

  const handleEdit = (cat) => {
    setEditingId(cat.id)
    setEditForm({
      name: cat.name,
      code: cat.code,
      sortOrder: cat.sortOrder,
      parentId: cat.parentId || ""
    })
  }

  const handleSaveEdit = async (id) => {
    if (!editForm.name.trim() || !editForm.code.trim()) return
    setSaving(true)
    try {
      const parentIdVal = editForm.parentId === "" ? null : editForm.parentId
      const updatedCat = await updateCategoryAction({
        id,
        name: editForm.name,
        code: editForm.code,
        sortOrder: editForm.sortOrder,
        parentId: parentIdVal
      })
      setCategories(categories.map((c) => c.id === id ? updatedCat : c))
      setEditingId(null)
    } catch (e) {
      setErrorMsg("Mã danh mục đã tồn tại hoặc có lỗi xảy ra.")
    }
    setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Xóa danh mục "${name}"?\n\nLưu ý: Các danh mục con sẽ chuyển thành danh mục gốc. Câu hỏi thuộc danh mục này sẽ không bị xóa, chỉ tạm thời không thuộc danh mục nào.`)) return
    try {
      await deleteCategoryAction(id)
      setCategories(categories
        .filter((c) => c.id !== id)
        .map((c) => c.parentId === id ? { ...c, parentId: null, parent: null } : c)
      )
    } catch (e) {}
  }

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      await updateCategoryAction({ id, status: newStatus })
      setCategories(categories.map((c) => c.id === id ? { ...c, status: newStatus } : c))
    } catch (e) {}
  }

  // Filter categories by search query
  const matchesSearch = (cat) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return cat.name.toLowerCase().includes(q) || cat.code.toLowerCase().includes(q)
  }

  const isSearching = searchQuery.trim() !== ""
  const filteredCategories = categories.filter(matchesSearch)

  // Count active / inactive
  const totalActive = categories.filter(c => c.status === "ACTIVE").length
  const totalInactive = categories.filter(c => c.status === "INACTIVE").length

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-400">Tổng danh mục</div>
            <div className="text-2xl font-bold text-slate-800">{categories.length}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-400">Đang hoạt động</div>
            <div className="text-2xl font-bold text-slate-800">{totalActive}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <X className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-400">Tạm ẩn</div>
            <div className="text-2xl font-bold text-slate-800">{totalInactive}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm danh mục theo tên hoặc mã..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          )}
        </div>

        {/* Create Button */}
        <button
          onClick={() => { setCreating(true); setErrorMsg("") }}
          className="flex items-center justify-center gap-2 bg-[#00A99D] hover:bg-[#009085] text-white px-6 py-2.5 rounded-xl font-bold shadow-md shadow-teal-500/10 hover:shadow-lg hover:shadow-teal-500/20 active:scale-95 transition-all text-sm border-none cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5" />
          Tạo Danh Mục Mới
        </button>
      </div>

      {/* Create Form */}
      {creating && (
        <div className="bg-white border border-teal-100 rounded-2xl p-6 shadow-md shadow-teal-500/5 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-[#00A99D]" />
              Tạo Danh Mục Mới
            </h3>
            <button
              onClick={() => { setCreating(false); setErrorMsg("") }}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {errorMsg && (
            <div className="mb-4 bg-red-50 text-red-700 text-sm font-semibold p-3.5 rounded-xl border border-red-100">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Tên Danh Mục <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newForm.name}
                onChange={e => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="Ví dụ: Cơ sở vật chất, Học tập..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Mã (Code) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newForm.code}
                onChange={e => setNewForm({ ...newForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                placeholder="Ví dụ: CS_VAT_CHAT"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none font-mono transition-all"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Danh Mục Cha
              </label>
              <select
                value={newForm.parentId}
                onChange={e => setNewForm({ ...newForm, parentId: e.target.value })}
                className="w-full border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
              >
                <option value="">-- Danh mục gốc --</option>
                {parentOptions().map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Thứ tự hiển thị
              </label>
              <input
                type="number"
                value={newForm.sortOrder}
                onChange={e => setNewForm({ ...newForm, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-center"
                min={0}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-50">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-6 py-2.5 bg-[#00A99D] hover:bg-[#009085] text-white rounded-xl font-bold text-sm shadow-md shadow-teal-500/10 transition-all disabled:opacity-60 border-none cursor-pointer"
            >
              {saving ? "Đang lưu..." : "Lưu Danh Mục"}
            </button>
            <button
              onClick={() => { setCreating(false); setErrorMsg("") }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm border-none transition-all cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* List Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Flat list (when searching) */}
        {isSearching ? (
          <div className="p-4">
            <div className="px-4 py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-500 mb-4">
              KẾT QUẢ TÌM KIẾM ({filteredCategories.length})
            </div>
            {filteredCategories.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                Không tìm thấy danh mục nào phù hợp với từ khóa.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCategories.map(cat => renderListItem(cat))}
              </div>
            )}
          </div>
        ) : (
          /* Hierarchical tree structure */
          <div>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Folder className="w-5 h-5 text-teal-600" />
                Danh Sách Cấu Trúc Danh Mục ({categories.length})
              </span>
            </div>

            {rootCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Folder className="w-16 h-16 mb-4 opacity-20 text-teal-600" />
                <p className="font-bold text-lg mb-1">Chưa có danh mục nào</p>
                <p className="text-sm">Nhấn "Tạo Danh Mục Mới" để bắt đầu phân loại câu hỏi.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rootCategories.map((root) => {
                  const children = categories
                    .filter((c) => c.parentId === root.id)
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                  
                  return (
                    <div key={root.id} className="bg-white">
                      {/* Root Row */}
                      {renderListItem(root, true, children.length)}

                      {/* Child Rows */}
                      {children.length > 0 && (
                        <div className="bg-slate-50/20 border-t border-slate-50">
                          {children.map((child) => renderListItem(child, false))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helper Guidelines */}
      <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100/50 text-sm text-teal-800 flex items-start gap-3">
        <Info className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-bold">Hướng dẫn cấu trúc:</span> 
          <ul className="list-disc pl-5 mt-1 space-y-1 text-teal-700/90 text-xs">
            <li><strong>Danh mục cha (gốc):</strong> Đóng vai trò là nhóm lớn chính (ví dụ: <em>Cơ sở vật chất</em>, <em>Chương trình học</em>).</li>
            <li><strong>Danh mục con:</strong> Thuộc về danh mục cha để chia nhỏ nội dung (ví dụ: <em>Lớp học</em> thuộc <em>Cơ sở vật chất</em>).</li>
            <li>Sau khi tạo/phân cấp, vào trang <strong>Quản lý Khảo sát &rarr; Bộ câu hỏi</strong> để gán từng câu hỏi vào danh mục con/cha tương ứng.</li>
          </ul>
        </div>
      </div>
    </div>
  )

  // Reusable row renderer
  function renderListItem(cat, isRoot = true, childCount = 0) {
    const isEditing = editingId === cat.id

    return (
      <div
        key={cat.id}
        className={`flex items-center gap-4 px-5 py-4 transition-all hover:bg-slate-50/60 group ${
          isRoot ? "bg-white" : "pl-12 bg-slate-50/10 border-l-2 border-slate-200/60"
        }`}
      >
        {/* Left Icon / Tree Indicator */}
        <div className="flex items-center justify-center flex-shrink-0 text-slate-400">
          {isRoot ? (
            <Folder className={`w-5 h-5 ${cat.status === "ACTIVE" ? "text-teal-600" : "text-slate-400"}`} />
          ) : (
            <CornerDownRight className="w-4 h-4 text-slate-400 mr-1" />
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            /* Editing State Form */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-teal-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-teal-100 outline-none"
                  placeholder="Tên danh mục"
                />
              </div>
              <div className="md:col-span-3">
                <input
                  type="text"
                  value={editForm.code}
                  onChange={e => setEditForm({ ...editForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:border-teal-500 outline-none"
                  placeholder="Mã (Code)"
                />
              </div>
              <div className="md:col-span-3">
                <select
                  value={editForm.parentId}
                  onChange={e => setEditForm({ ...editForm, parentId: e.target.value })}
                  className="w-full border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-sm focus:border-teal-500 outline-none"
                >
                  <option value="">-- Danh mục gốc --</option>
                  {parentOptions(cat.id).map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <input
                  type="number"
                  value={editForm.sortOrder}
                  onChange={e => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none text-center"
                  min={0}
                  placeholder="Thứ tự"
                />
              </div>
            </div>
          ) : (
            /* Display State Info */
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className={`font-bold truncate ${
                isRoot ? "text-slate-800 text-[15px]" : "text-slate-700 text-sm"
              } ${cat.status !== "ACTIVE" && "text-slate-400 line-through font-medium"}`}>
                {cat.name}
              </span>
              
              {/* Code Badge */}
              <span className="text-[10px] font-bold font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200/50">
                <Hash className="w-3 h-3 text-slate-400" />{cat.code}
              </span>
              
              {/* Info Badges */}
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <span>Thứ tự: {cat.sortOrder}</span>
                {cat._count && cat._count.questions > 0 && (
                  <span className="text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {cat._count.questions} câu hỏi
                  </span>
                )}
                {isRoot && childCount > 0 && (
                  <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {childCount} danh mục con
                  </span>
                )}
                {!isRoot && cat.parent && (
                  <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-medium">
                    Cha: {cat.parent.name}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Status & Actions */}
        {!isEditing && (
          <button
            onClick={() => handleToggleStatus(cat.id, cat.status)}
            className="flex-shrink-0 border-none bg-transparent p-0 cursor-pointer"
          >
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
              cat.status === "ACTIVE"
                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100/80"
                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
            }`}>
              {cat.status === "ACTIVE" ? "Đang dùng" : "Tạm ẩn"}
            </span>
          </button>
        )}

        {/* Action Button Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={() => handleSaveEdit(cat.id)}
                disabled={saving}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg border-none bg-transparent cursor-pointer transition-all disabled:opacity-60"
                title="Lưu"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg border-none bg-transparent cursor-pointer transition-all"
                title="Hủy"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleEdit(cat)}
                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg border-none bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                title="Sửa"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(cat.id, cat.name)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg border-none bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                title="Xóa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    )
  }
}
