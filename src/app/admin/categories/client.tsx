"use client"
import { useState } from "react"
import {
  Plus, Trash2, Edit3, Check, X, Tag, Hash, Folder, CornerDownRight,
  Search, Info, FolderPlus, Layers, GitMerge, CheckCircle2, Eye, EyeOff,
  Sparkles, SlidersHorizontal, ArrowUpDown, CheckSquare, Square, RefreshCw,
  CornerUpRight, ChevronDown, ChevronRight, ChevronsUp, ChevronsDown
} from "lucide-react"
import {
  createCategoryAction, updateCategoryAction, deleteCategoryAction,
  bulkUpdateCategoriesAction, bulkDeleteCategoriesAction
} from "./actions"

export function CategoriesClient({ initialCategories }: { initialCategories: any[] }) {
  const [categories, setCategories] = useState(initialCategories)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTab, setFilterTab] = useState<"ALL" | "ROOT" | "CHILD" | "INACTIVE">("ALL")

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Collapse / Expand State for Root Categories
  const [collapsedRootIds, setCollapsedRootIds] = useState<string[]>([])

  // Modal State for Create, Edit, & Bulk Edit Parent
  const [modalMode, setModalMode] = useState<"NONE" | "CREATE" | "EDIT" | "BULK_PARENT">("NONE")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    sortOrder: 0,
    parentId: "",
    status: "ACTIVE"
  })
  const [bulkParentId, setBulkParentId] = useState("")
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Statistics
  const totalCategories = categories.length
  const rootCategories = categories.filter(c => !c.parentId)
  const childCategories = categories.filter(c => c.parentId)
  const activeCategories = categories.filter(c => c.status === "ACTIVE")
  const inactiveCategories = categories.filter(c => c.status === "INACTIVE")

  // Toggle Collapse / Expand for individual root category
  const toggleCollapseRoot = (id: string) => {
    setCollapsedRootIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // Global Collapse All / Expand All
  const rootsWithChildren = rootCategories.filter(r => categories.some(c => c.parentId === r.id)).map(r => r.id)
  const isAllCollapsed = rootsWithChildren.length > 0 && rootsWithChildren.every(id => collapsedRootIds.includes(id))

  const toggleCollapseAll = () => {
    if (isAllCollapsed) {
      setCollapsedRootIds([])
    } else {
      setCollapsedRootIds(rootsWithChildren)
    }
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

  // Toggle selection for a single category
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // Toggle select all visible items
  const isAllSelected = filteredCategories.length > 0 && filteredCategories.every(c => selectedIds.includes(c.id))
  
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredCategories.some(c => c.id === id)))
    } else {
      const visibleIds = filteredCategories.map(c => c.id)
      const merged = Array.from(new Set([...selectedIds, ...visibleIds]))
      setSelectedIds(merged)
    }
  }

  const clearSelection = () => setSelectedIds([])

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

  // Open modal for editing single item
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
      setSelectedIds(prev => prev.filter(item => item !== id))
    } catch (e) {}
  }

  // BULK ACTIONS
  const handleBulkStatusChange = async (targetStatus: string) => {
    if (selectedIds.length === 0) return
    setSaving(true)
    try {
      await bulkUpdateCategoriesAction({ ids: selectedIds, status: targetStatus })
      setCategories(prev => prev.map(c => selectedIds.includes(c.id) ? { ...c, status: targetStatus } : c))
    } catch (e) {}
    setSaving(false)
  }

  const handleBulkParentChange = async () => {
    if (selectedIds.length === 0) return
    setSaving(true)
    try {
      const parentVal = bulkParentId === "" ? null : bulkParentId
      await bulkUpdateCategoriesAction({ ids: selectedIds, parentId: parentVal })
      const parentObj = categories.find(c => c.id === parentVal) || null
      setCategories(prev => prev.map(c => selectedIds.includes(c.id) ? { ...c, parentId: parentVal, parent: parentObj } : c))
      closeModal()
    } catch (e) {}
    setSaving(false)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} danh mục đã chọn?\n\nCác danh mục con thuộc nhóm xóa sẽ tự động chuyển thành danh mục gốc.`)) return
    
    setSaving(true)
    try {
      await bulkDeleteCategoriesAction(selectedIds)
      setCategories(prev => prev
        .filter(c => !selectedIds.includes(c.id))
        .map(c => selectedIds.includes(c.parentId || "") ? { ...c, parentId: null, parent: null } : c)
      )
      clearSelection()
    } catch (e) {}
    setSaving(false)
  }

  return (
    <div className="space-y-6 pb-24 font-outfit">
      
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

        {/* Filter Pills & Global Collapse Toggle */}
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

          {/* Global Collapse All / Expand All Toggle Button */}
          {!isFiltering && rootsWithChildren.length > 0 && (
            <button
              onClick={toggleCollapseAll}
              className="ml-2 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1 cursor-pointer border border-slate-200"
              title={isAllCollapsed ? "Mở rộng tất cả danh mục con" : "Thu gọn tất cả danh mục con"}
            >
              {isAllCollapsed ? <ChevronsDown className="w-3.5 h-3.5 text-[#00A99D]" /> : <ChevronsUp className="w-3.5 h-3.5 text-[#00A99D]" />}
              <span>{isAllCollapsed ? "Mở rộng tất cả" : "Thu gọn tất cả"}</span>
            </button>
          )}
        </div>
      </div>

      {/* SELECT ALL TOOLBAR ROW */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200/70 px-4 py-2 rounded-xl text-xs font-extrabold text-slate-600">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded text-[#00A99D] focus:ring-0 cursor-pointer"
          />
          <span>{isAllSelected ? "Đã chọn tất cả" : "Chọn tất cả trên trang này"}</span>
        </label>
        {selectedIds.length > 0 && (
          <span className="text-teal-700 font-extrabold">Đã chọn {selectedIds.length} danh mục</span>
        )}
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

                const isCollapsed = collapsedRootIds.includes(root.id)

                return (
                  <div key={root.id} className="bg-white">
                    {/* Root Row Card */}
                    {renderCategoryRow(root, true, children.length, isCollapsed)}

                    {/* Children List (Hidden when collapsed) */}
                    {children.length > 0 && !isCollapsed && (
                      <div className="bg-slate-50/50 border-t border-slate-100/80 pl-6 md:pl-10 pr-4 py-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
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

      {/* FLOATING BULK ACTION TOOLBAR */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl z-50 flex flex-wrap items-center gap-4 animate-in slide-in-from-bottom-6 border border-slate-700/60 max-w-4xl w-[92%] justify-between">
          <div className="flex items-center gap-2 text-xs font-black">
            <span className="w-6 h-6 rounded-full bg-[#00A99D] flex items-center justify-center text-white text-[11px]">
              {selectedIds.length}
            </span>
            <span>Đã chọn {selectedIds.length} mục</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange("ACTIVE")}
              disabled={saving}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all border-none cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Đang dùng
            </button>

            <button
              onClick={() => handleBulkStatusChange("INACTIVE")}
              disabled={saving}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl transition-all border-none cursor-pointer flex items-center gap-1"
            >
              <EyeOff className="w-3.5 h-3.5" /> Tạm ẩn
            </button>

            <button
              onClick={() => { setBulkParentId(""); setModalMode("BULK_PARENT"); }}
              disabled={saving}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition-all border-none cursor-pointer flex items-center gap-1"
            >
              <CornerUpRight className="w-3.5 h-3.5" /> Đổi Mục Cha
            </button>

            <button
              onClick={handleBulkDelete}
              disabled={saving}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl transition-all border-none cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa
            </button>

            <div className="w-px h-5 bg-slate-700 mx-1" />

            <button
              onClick={clearSelection}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs rounded-xl transition-all border-none cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* CREATE & EDIT MODAL DIALOG */}
      {modalMode !== "NONE" && modalMode !== "BULK_PARENT" && (
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

      {/* MODAL BULK EDIT PARENT */}
      {modalMode === "BULK_PARENT" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CornerUpRight className="w-5 h-5 text-blue-600" />
                Gán Danh Mục Cha Hàng Loạt ({selectedIds.length} mục)
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5"/></button>
            </div>
            
            <p className="text-xs text-slate-500">
              Chọn danh mục cha mới cho <strong>{selectedIds.length}</strong> danh mục đã chọn. Tất cả các mục này sẽ được chuyển thành danh mục con thuộc mục cha được chọn.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Chọn Danh Mục Cha Mới
              </label>
              <select
                value={bulkParentId}
                onChange={(e) => setBulkParentId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] cursor-pointer"
              >
                <option value="">-- Chuyển thành Danh mục gốc (Không có cha) --</option>
                {parentOptions().map((opt: any) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button onClick={closeModal} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl">Hủy</button>
              <button
                onClick={handleBulkParentChange}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer border-none"
              >
                {saving ? "Đang áp dụng..." : "Áp Dụng Gán Mục Cha"}
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
            • <strong>Thu gọn / Mở rộng:</strong> Nhấp vào biểu tượng mũi tên <ChevronDown className="w-3.5 h-3.5 inline text-[#00A99D]" /> bên cạnh thư mục gốc để thu gọn hoặc mở rộng danh mục con.<br />
            • <strong>Thao tác hàng loạt:</strong> Đánh dấu checkbox ở đầu dòng để chọn 1 hoặc nhiều danh mục để chuyển trạng thái, gán mục cha hoặc xóa hàng loạt.
          </p>
        </div>
      </div>

    </div>
  )

  // Reusable Category Card Row Renderer
  function renderCategoryRow(cat: any, isRoot = true, childCount = 0, isCollapsed = false) {
    const isActive = cat.status === "ACTIVE"
    const questionsCount = cat._count?.questions || 0
    const isSelected = selectedIds.includes(cat.id)
    const hasChildren = isRoot && childCount > 0

    return (
      <div
        key={cat.id}
        className={`p-4 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
          isSelected
            ? "bg-teal-50/50 border-[#00A99D] shadow-xs"
            : (isRoot ? "bg-white border-slate-200/80 shadow-2xs hover:shadow-xs" : "bg-white/80 border-slate-200/60 hover:bg-white")
        }`}
      >
        {/* Left: Checkbox + Collapse Chevron + Folder icon + Name + Badges */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelect(cat.id)}
            className="w-4.5 h-4.5 rounded text-[#00A99D] focus:ring-0 cursor-pointer flex-shrink-0"
          />

          {/* Collapse / Expand Chevron Icon (for Root categories with children) */}
          {hasChildren ? (
            <button
              onClick={() => toggleCollapseRoot(cat.id)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#00A99D] transition-colors cursor-pointer border-none bg-transparent flex-shrink-0"
              title={isCollapsed ? "Mở rộng danh mục con" : "Thu gọn danh mục con"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4 text-[#00A99D]" /> : <ChevronDown className="w-4 h-4 text-[#00A99D]" />}
            </button>
          ) : (
            isRoot && <div className="w-6 flex-shrink-0" />
          )}

          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
            isRoot ? "bg-[#00A99D]/10 text-[#00A99D]" : "bg-slate-100 text-slate-500"
          }`}>
            {isRoot ? <Folder className="w-4.5 h-4.5" /> : <CornerDownRight className="w-4 h-4 text-slate-400" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                onClick={() => hasChildren && toggleCollapseRoot(cat.id)}
                className={`font-black truncate ${isRoot ? "text-slate-800 text-sm cursor-pointer hover:text-[#00A99D]" : "text-slate-700 text-xs"} ${!isActive && "line-through text-slate-400"}`}
              >
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
                <button
                  onClick={() => toggleCollapseRoot(cat.id)}
                  className="text-[10px] font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full transition-all cursor-pointer border-none flex items-center gap-1"
                >
                  <span>{childCount} danh mục con</span>
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
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
