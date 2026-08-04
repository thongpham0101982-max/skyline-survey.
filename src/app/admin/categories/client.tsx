"use client"
import { useState } from "react"
import {
  Plus, Trash2, Edit3, Check, X, Tag, Hash, Folder, CornerDownRight,
  Search, Info, FolderPlus, Layers, GitMerge, CheckCircle2, Eye, EyeOff,
  Sparkles, SlidersHorizontal, ArrowUpDown
} from "lucide-react"
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "./actions"

export function CategoriesClient({ initialCategories }: { initialCategories: any[] }) {
  const [categories, setCategories] = useState(initialCategories)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTab, setFilterTab] = useState<"ALL" | "ROOT" | "CHILD" | "INACTIVE">("ALL")

  // Modal State for Create & Edit
  const [modalMode, setModalMode] = useState<"NONE" | "CREATE" | "EDIT">("NONE")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    sortOrder: 0,
    parentId: "",
    status: "ACTIVE"
  })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Statistics
  const totalCategories = categories.length
  const rootCategories = categories.filter(c => !c.parentId)
  const childCategories = categories.filter(c => c.parentId)
  const activeCategories = categories.filter(c => c.status === "ACTIVE")
  const inactiveCategories = categories.filter(c => c.status === "INACTIVE")

  // Parent options list for dropdown
  const parentOptions = (currentId: string | null = null) => {
    return categories.filter(c => !c.parentId && c.id !== currentId && c.status === "ACTIVE")
  }

  // Open modal for new root or sub category
  const openCreateModal = (parentId = "") => {
    setFormData({
      name: "",
      code: "",
      sortOrder: categories.length + 1,
      parentId: parentId,
      status: "ACTIVE"
    })
    setErrorMsg("")
    setModalMode("CREATE")
  }

  // Open modal for editing
  const openEditModal = (cat: any) => {
    setEditingId(cat.id)
    setFormData({
      name: cat.name || "",
      code: cat.code || "",
      sortOrder: cat.sortOrder ?? 0,
      parentId: cat.parentId || "",
      status: cat.status || "ACTIVE"
    })
    setErrorMsg("")
    setModalMode("EDIT")
  }

  const closeModal = () => {
    setModalMode("NONE")
    setEditingId(null)
    setErrorMsg("")
  }

  // Submit Create
  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      setErrorMsg("Vui lòng nhập Tên danh mục và Mã danh mục!")
      return
    }
    setSaving(true)
    setErrorMsg("")
    try {
      const newCat = await createCategoryAction({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase().replace(/\s+/g, '_'),
        sortOrder: formData.sortOrder,
        parentId: formData.parentId || null
      })
      setCategories(prev => [...prev, newCat])
      closeModal()
    } catch (e: any) {
      setErrorMsg("Mã danh mục đã tồn tại hoặc có lỗi xảy ra. Vui lòng kiểm tra lại!")
    }
    setSaving(false)
  }

  // Submit Edit
  const handleSaveEdit = async () => {
    if (!editingId || !formData.name.trim() || !formData.code.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ Tên và Mã danh mục!")
      return
    }
    setSaving(true)
    setErrorMsg("")
    try {
      const updatedCat = await updateCategoryAction({
        id: editingId,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase().replace(/\s+/g, '_'),
        sortOrder: formData.sortOrder,
        parentId: formData.parentId || null,
        status: formData.status
      })
      setCategories(prev => prev.map(c => c.id === editingId ? updatedCat : c))
      closeModal()
    } catch (e: any) {
      setErrorMsg("Không thể cập nhật danh mục. Mã danh mục bị trùng hoặc có lỗi.")
    }
    setSaving(false)
  }

  // Toggle status directly
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      await updateCategoryAction({ id, status: newStatus })
      setCategories(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
    } catch (e) {}
  }

  // Delete Category
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa danh mục "${name}"?\n\nLưu ý: Các danh mục con sẽ chuyển thành danh mục gốc. Các câu hỏi đang gán danh mục này sẽ giữ nguyên nội dung nhưng bỏ gán danh mục.`)) return
    try {
      await deleteCategoryAction(id)
      setCategories(prev => prev
        .filter(c => c.id !== id)
        .map(c => c.parentId === id ? { ...c, parentId: null, parent: null } : c)
      )
    } catch (e) {}
  }

  // Search & Filter Logic
  const matchesSearch = (cat: any) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return cat.name.toLowerCase().includes(q) || cat.code.toLowerCase().includes(q)
  }

  const matchesTab = (cat: any) => {
    if (filterTab === "ROOT") return !cat.parentId
    if (filterTab === "CHILD") return !!cat.parentId
    if (filterTab === "INACTIVE") return cat.status === "INACTIVE"
    return true
  }

  const isFiltering = searchQuery.trim() !== "" || filterTab !== "ALL"
  const filteredCategories = categories.filter(c => matchesSearch(c) && matchesTab(c))

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Danh Mục Khảo Sát</h1>
            <span className="bg-[#00A99D]/10 text-[#00A99D] text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {totalCategories} Phân mục
            </span>
          </div>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Tổ chức danh mục khảo sát theo chủ đề để quản lý bộ câu hỏi và phân tích báo cáo trực quan.
          </p>
        </div>

        <button
          onClick={() => openCreateModal("")}
          className="inline-flex items-center justify-center gap-2 bg-[#00A99D] hover:bg-[#009085] text-white px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-md shadow-teal-500/20 active:scale-95 transition-all cursor-pointer border-none"
        >
          <Plus className="w-4 h-4" /> Tạo Danh Mục Mới
        </button>
      </div>

      {/* OVERVIEW STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#00A99D] flex items-center justify-center font-black">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng danh mục</div>
            <div className="text-xl font-black text-slate-800">{totalCategories}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Danh mục gốc</div>
            <div className="text-xl font-black text-slate-800">{rootCategories.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <GitMerge className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Danh mục con</div>
            <div className="text-xl font-black text-slate-800">{childCategories.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đang hoạt động</div>
            <div className="text-xl font-black text-slate-800">{activeCategories.length}</div>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc mã danh mục (#CSVC, #HOC_TAP...)"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-8 py-2 text-xs font-bold text-slate-800 focus:border-[#00A99D] focus:bg-white outline-none transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
          <button
            onClick={() => setFilterTab("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${filterTab === "ALL" ? "bg-[#00A99D] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            Tất cả ({categories.length})
          </button>
          <button
            onClick={() => setFilterTab("ROOT")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${filterTab === "ROOT" ? "bg-[#00A99D] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            Danh mục gốc ({rootCategories.length})
          </button>
          <button
            onClick={() => setFilterTab("CHILD")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${filterTab === "CHILD" ? "bg-[#00A99D] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            Danh mục con ({childCategories.length})
          </button>
          {inactiveCategories.length > 0 && (
            <button
              onClick={() => setFilterTab("INACTIVE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${filterTab === "INACTIVE" ? "bg-amber-500 text-white shadow-xs" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
            >
              Tạm ẩn ({inactiveCategories.length})
            </button>
          )}
        </div>
      </div>

      {/* CATEGORY TREE CARDS CONTAINER */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        
        {isFiltering ? (
          /* Filtered Flat List View */
          <div className="p-4 space-y-2">
            <div className="px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
              Kết quả lọc ({filteredCategories.length})
            </div>
            {filteredCategories.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-bold">
                Không tìm thấy danh mục nào phù hợp với bộ lọc.
              </div>
            ) : (
              filteredCategories.map(cat => renderCategoryRow(cat, !cat.parentId))
            )}
          </div>
        ) : (
          /* Hierarchical Tree Structure View */
          <div className="divide-y divide-slate-100">
            {rootCategories.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-3">
                <Folder className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="font-extrabold text-slate-700 text-base">Chưa có danh mục nào được tạo</p>
                <p className="text-xs text-slate-400">Bấm nút "Tạo Danh Mục Mới" ở trên để bắt đầu tổ chức bộ câu hỏi.</p>
              </div>
            ) : (
              rootCategories.map((root) => {
                const children = categories
                  .filter((c: any) => c.parentId === root.id)
                  .sort((a: any, b: any) => a.sortOrder - b.sortOrder)

                return (
                  <div key={root.id} className="bg-white">
                    {/* Root Row Card */}
                    {renderCategoryRow(root, true, children.length)}

                    {/* Children List */}
                    {children.length > 0 && (
                      <div className="bg-slate-50/50 border-t border-slate-100/80 pl-6 md:pl-10 pr-4 py-2 space-y-2">
                        {children.map(child => renderCategoryRow(child, false))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

      </div>

      {/* CREATE & EDIT MODAL DIALOG */}
      {modalMode !== "NONE" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#00A99D]" />
                {modalMode === "CREATE" ? "Tạo Danh Mục Khảo Sát Mới" : "Chỉnh Sửa Danh Mục"}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5"/></button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl border border-red-100">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Tên Danh Mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Cơ sở vật chất, Học tập, NPS..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] focus:bg-white transition-all"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Mã Danh Mục (Code) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    placeholder="VD: CS_VAT_CHAT"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-[#00A99D] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Danh Mục Cha (Thuộc nhóm)
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] focus:bg-white cursor-pointer transition-all"
                  >
                    <option value="">-- Danh mục gốc (Cấp cao nhất) --</option>
                    {parentOptions(editingId).map((opt: any) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] focus:bg-white transition-all"
                    min="0"
                  />
                </div>

                {modalMode === "EDIT" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Trạng thái
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] focus:bg-white cursor-pointer transition-all"
                    >
                      <option value="ACTIVE">Hoạt động (Đang dùng)</option>
                      <option value="INACTIVE">Tạm ẩn (Tắt)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button onClick={closeModal} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all">
                Hủy
              </button>
              <button
                onClick={modalMode === "CREATE" ? handleCreate : handleSaveEdit}
                disabled={saving}
                className="px-6 py-2 bg-[#00A99D] hover:bg-[#009085] text-white font-extrabold text-xs rounded-xl shadow-md shadow-teal-500/20 transition-all cursor-pointer border-none"
              >
                {saving ? "Đang lưu..." : (modalMode === "CREATE" ? "Tạo Danh Mục" : "Cập Nhật")}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* HELPER GUIDELINES FOOTER */}
      <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-100 text-xs text-teal-800 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#00A99D] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-extrabold text-teal-900">Hướng dẫn phân cấp Danh Mục:</span>
          <p className="text-teal-800/90 leading-relaxed">
            • <strong>Danh mục gốc:</strong> Nhóm chủ đề chính (Ví dụ: <em>Cơ sở vật chất</em>, <em>Học tập</em>).<br />
            • <strong>Danh mục con:</strong> Phân loại chi tiết (Ví dụ: <em>[HS] Học tập</em> thuộc nhóm gốc <em>Học tập</em>).<br />
            • Khi soạn thảo Form, bạn có thể dễ dàng lọc và gán câu hỏi vào bất kỳ mục nào.
          </p>
        </div>
      </div>

    </div>
  )

  // Reusable Category Card Row Renderer
  function renderCategoryRow(cat: any, isRoot = true, childCount = 0) {
    const isActive = cat.status === "ACTIVE"
    const questionsCount = cat._count?.questions || 0

    return (
      <div
        key={cat.id}
        className={`p-4 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
          isRoot 
            ? "bg-white border-slate-200/80 shadow-2xs hover:shadow-xs" 
            : "bg-white/80 border-slate-200/60 hover:bg-white"
        }`}
      >
        {/* Left: Folder icon, Name, Code badge, Info pills */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
            isRoot ? "bg-[#00A99D]/10 text-[#00A99D]" : "bg-slate-100 text-slate-500"
          }`}>
            {isRoot ? <Folder className="w-4.5 h-4.5" /> : <CornerDownRight className="w-4 h-4 text-slate-400" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-black truncate ${isRoot ? "text-slate-800 text-sm" : "text-slate-700 text-xs"} ${!isActive && "line-through text-slate-400"}`}>
                {cat.name}
              </span>

              {/* Code Pill Badge */}
              <span className="text-[10px] font-mono font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/60">
                #{cat.code}
              </span>

              {/* Questions count badge */}
              {questionsCount > 0 && (
                <span className="text-[10px] font-extrabold bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full">
                  {questionsCount} câu hỏi
                </span>
              )}

              {/* Sub-categories count badge */}
              {isRoot && childCount > 0 && (
                <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                  {childCount} danh mục con
                </span>
              )}
            </div>

            <div className="text-[11px] font-bold text-slate-400 mt-0.5 flex items-center gap-3">
              <span>Thứ tự: {cat.sortOrder}</span>
              {!isRoot && cat.parent && (
                <span>Thuộc: <strong className="text-slate-600">{cat.parent.name}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Direct Visible Action Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
          
          {/* Status Toggle Button */}
          <button
            onClick={() => handleToggleStatus(cat.id, cat.status)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer ${
              isActive 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
            }`}
            title={isActive ? "Bấm để ẩn danh mục" : "Bấm để kích hoạt danh mục"}
          >
            {isActive ? "Đang dùng" : "Tạm ẩn"}
          </button>

          {/* Add Sub Category (for Root categories) */}
          {isRoot && (
            <button
              onClick={() => openCreateModal(cat.id)}
              className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-[#00A99D] border border-teal-200/60 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer"
              title="Thêm danh mục con thuộc mục này"
            >
              <Plus className="w-3.5 h-3.5" /> + Con
            </button>
          )}

          {/* Edit Button */}
          <button
            onClick={() => openEditModal(cat)}
            className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-lg transition-all cursor-pointer"
            title="Chỉnh sửa danh mục"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => handleDelete(cat.id, cat.name)}
            className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-all cursor-pointer"
            title="Xóa danh mục"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

        </div>
      </div>
    )
  }
}
