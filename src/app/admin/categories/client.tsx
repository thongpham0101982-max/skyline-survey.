"use client"
import { useState } from "react"
import { Plus, Trash2, Edit2, Check, X, Tag, GripVertical, Hash } from "lucide-react"
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "./actions"

export function CategoriesClient({ initialCategories }) {
  const [categories, setCategories] = useState(initialCategories)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [creating, setCreating] = useState(false)
  const [newForm, setNewForm] = useState({ name: "", code: "", sortOrder: 0 })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleCreate = async () => {
    if (!newForm.name.trim() || !newForm.code.trim()) {
      setErrorMsg("Vui long nhap Ten danh muc va Ma danh muc!")
      return
    }
    setSaving(true)
    setErrorMsg("")
    try {
      await createCategoryAction(newForm)
      setCategories([...categories, { ...newForm, id: `temp_${Date.now()}`, status: "ACTIVE", _count: { questions: 0 } }])
      setNewForm({ name: "", code: "", sortOrder: 0 })
      setCreating(false)
    } catch (e) {
      setErrorMsg("Ma danh muc da ton tai hoac co loi xay ra. Vui long thu lai!")
    }
    setSaving(false)
  }

  const handleEdit = (cat) => {
    setEditingId(cat.id)
    setEditForm({ name: cat.name, code: cat.code, sortOrder: cat.sortOrder })
  }

  const handleSaveEdit = async (id) => {
    if (!editForm.name.trim() || !editForm.code.trim()) return
    setSaving(true)
    try {
      await updateCategoryAction({ id, ...editForm })
      setCategories(categories.map((c) => c.id === id ? { ...c, ...editForm } : c))
      setEditingId(null)
    } catch (e) {}
    setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Xóa danh muc "${name}"?\n\nLuu y: Cac cau hoi thuoc danh muc nay se khong bi xoa, chi khong con thuoc danh muc nao.`)) return
    try {
      await deleteCategoryAction(id)
      setCategories(categories.filter((c) => c.id !== id))
    } catch (e) {}
  }

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      await updateCategoryAction({ id, status: newStatus })
      setCategories(categories.map((c) => c.id === id ? { ...c, status: newStatus } : c))
    } catch (e) {}
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">Tao va quan ly cac nhom de phan loai cau hoi khao sat theo chu de.</p>
        <button
          onClick={() => { setCreating(true); setErrorMsg("") }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/30 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Tao Danh Muc Moi
        </button>
      </div>

      {/* Create Form */}
      {creating && (
        <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-lg shadow-indigo-50">
          <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600" />
            Tao Danh Muc Moi
          </h3>
          {errorMsg && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm font-medium">
              {errorMsg}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                Ten Danh Muc <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newForm.name}
                onChange={e => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="Ex: Chat luong giang day, Co so vat chat..."
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                Ma (Code) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newForm.code}
                onChange={e => setNewForm({ ...newForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                placeholder="Ex: GIANG_DAY"
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none font-mono transition-all"
              />
            </div>
          </div>
          <div className="mt-4 max-w-[140px]">
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Thu tu hien thi</label>
            <input
              type="number"
              value={newForm.sortOrder}
              onChange={e => setNewForm({ ...newForm, sortOrder: parseInt(e.target.value) || 0 })}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 outline-none text-center"
              min={0}
            />
          </div>
          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-slate-100">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md shadow-indigo-500/20 transition-all disabled:opacity-60"
            >
              {saving ? "Dang luu..." : "Luu Danh Muc"}
            </button>
            <button
              onClick={() => { setCreating(false); setErrorMsg("") }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-all"
            >
              Huy
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
          <Tag className="w-5 h-5 text-indigo-500" />
          <span className="font-bold text-slate-700">Danh Sach Danh Muc ({categories.length})</span>
        </div>

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Tag className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-semibold text-lg mb-1">Chua co danh muc nao</p>
            <p className="text-sm">Nhan "Tao Danh Muc Moi" de bat dau phan loai cau hoi khao sat.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {categories.map((cat) => {
              const isEditing = editingId === cat.id
              return (
                <div key={cat.id} className="px-6 py-5 flex items-center gap-4 hover:bg-slate-50/70 transition-colors group">
                  <GripVertical className="w-5 h-5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Tag className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="border border-indigo-300 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 outline-none"
                        />
                        <input
                          type="text"
                          value={editForm.code}
                          onChange={e => setEditForm({ ...editForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:border-indigo-500 outline-none"
                        />
                        <input
                          type="number"
                          value={editForm.sortOrder}
                          onChange={e => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) || 0 })}
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none w-24"
                          min={0}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="font-semibold text-slate-800 text-base truncate">{cat.name}</span>
                        <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Hash className="w-3 h-3" />{cat.code}
                        </span>
                        <span className="text-xs text-slate-400">Thu tu: {cat.sortOrder}</span>
                        {cat._count && (
                          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                            {cat._count.questions} cau hoi
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {!isEditing && (
                    <button onClick={() => handleToggleStatus(cat.id, cat.status)} className="flex-shrink-0">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                        cat.status === "ACTIVE"
                          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                      }`}>
                        {cat.status === "ACTIVE" ? "Dang dung" : "Tam an"}
                      </span>
                    </button>
                  )}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSaveEdit(cat.id)} disabled={saving} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-60" title="Luu">
                          <Check className="w-5 h-5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="Huy">
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(cat)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Sua">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cat.id, cat.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Xoa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 flex items-start gap-3">
        <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">i</div>
        <div>
          <span className="font-semibold">Huong dan:</span> Sau khi tao danh muc, hay vao{" "}
          <strong>Manage Surveys &rarr; Bo cau hoi</strong> de gan tung cau hoi vao danh muc tuong ung.
        </div>
      </div>
    </div>
  )
}
