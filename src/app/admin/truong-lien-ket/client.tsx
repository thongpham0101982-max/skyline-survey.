"use client"
import { useState, useTransition } from "react"
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Building2, 
  Sparkles, 
  GraduationCap, 
  Baby, 
  X, 
  Loader2 
} from "lucide-react"
import { 
  createDestinationSchoolAction, 
  updateDestinationSchoolAction, 
  deleteDestinationSchoolAction, 
  seedDestinationSchoolsAction,
  getDestinationSchoolsAction
} from "./actions"

export function DestinationSchoolsClient({ initialSchools }: { initialSchools: any[] }) {
  const [schools, setSchools] = useState<any[]>(initialSchools)
  const [search, setSearch] = useState("")
  const [levelFilter, setLevelFilter] = useState<"ALL" | "PHO_THONG" | "MAM_NON">("ALL")
  const [isPending, startTransition] = useTransition()
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingSchool, setEditingSchool] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    code: "",
    level: "PHO_THONG"
  })

  const loadSchools = async () => {
    const list = await getDestinationSchoolsAction()
    setSchools(list)
  }

  const handleOpenAdd = () => {
    setEditingSchool(null)
    setForm({
      name: "",
      code: "",
      level: "PHO_THONG"
    })
    setShowModal(true)
  }

  const handleOpenEdit = (school: any) => {
    setEditingSchool(school)
    setForm({
      name: school.name,
      code: school.code,
      level: school.level
    })
    setShowModal(true)
  }

  const handleSave = async (e: any) => {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) {
      alert("Vui lòng nhập đầy đủ Tên và Mã trường!")
      return
    }

    setSaving(true)
    let res;
    if (editingSchool) {
      res = await updateDestinationSchoolAction(editingSchool.id, form)
    } else {
      res = await createDestinationSchoolAction(form)
    }
    setSaving(false)

    if (res.success) {
      alert(editingSchool ? "Cập nhật trường thành công!" : "Thêm trường mới thành công!")
      setShowModal(false)
      loadSchools()
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa trường "${name}" khỏi danh mục?`)) {
      return
    }

    startTransition(async () => {
      const res = await deleteDestinationSchoolAction(id)
      if (res.success) {
        alert("Đã xóa trường học thành công!")
        loadSchools()
      } else {
        alert("Lỗi: " + res.error)
      }
    })
  }

  const handleSeedData = async () => {
    startTransition(async () => {
      const res = await seedDestinationSchoolsAction()
      if (res.success) {
        alert(`Đã khởi tạo thành công ${res.count} trường mẫu!`)
        loadSchools()
      } else {
        alert("Lỗi: " + res.error)
      }
    })
  }

  // Filter & Search logic
  const filteredSchools = schools.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    
    const matchesLevel = levelFilter === "ALL" || s.level === levelFilter;
    return matchesSearch && matchesLevel;
  })

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        
        {/* Left: Cấp học Filter Tabs */}
        <div className="flex gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl w-fit">
          <button 
            onClick={() => setLevelFilter("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              levelFilter === "ALL" 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Tất cả ({schools.length})
          </button>
          <button 
            onClick={() => setLevelFilter("PHO_THONG")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              levelFilter === "PHO_THONG" 
                ? "bg-[#00A99D]/10 text-[#00A99D] shadow-xs" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Phổ thông ({schools.filter(s => s.level === "PHO_THONG").length})
          </button>
          <button 
            onClick={() => setLevelFilter("MAM_NON")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              levelFilter === "MAM_NON" 
                ? "bg-emerald-100 text-emerald-700 shadow-xs" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Baby className="w-4 h-4" />
            Mầm non ({schools.filter(s => s.level === "MAM_NON").length})
          </button>
        </div>

        {/* Right: Search & Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm tên hoặc mã trường..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:border-[#00A99D] focus:ring-4 focus:ring-[#00A99D]/10 rounded-2xl font-medium outline-none transition-all text-xs text-slate-800" 
            />
          </div>

          <div className="flex gap-2">
            {schools.length === 0 && (
              <button 
                onClick={handleSeedData}
                disabled={isPending}
                className="px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded-2xl hover:bg-amber-100 transition-all flex items-center gap-1.5 shadow-sm text-xs cursor-pointer disabled:opacity-55"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Khởi tạo Trường mẫu
              </button>
            )}

            <button 
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-[#00A99D] text-white font-bold rounded-2xl hover:bg-[#009085] transition-all flex items-center gap-1.5 shadow-sm text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm trường mới
            </button>
          </div>
        </div>

      </div>

      {/* Main List Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        {filteredSchools.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-4 font-black w-12 text-center">STT</th>
                  <th className="px-6 py-4 font-black">Mã trường</th>
                  <th className="px-6 py-4 font-black">Tên đơn vị trường</th>
                  <th className="px-6 py-4 font-black">Phân loại cấp</th>
                  <th className="px-6 py-4 text-right font-black">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchools.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/40 text-xs font-semibold transition-colors">
                    <td className="px-6 py-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">
                      <span className="bg-slate-100 px-2 py-1 rounded-lg text-slate-700 border border-slate-200/60">
                        {s.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 text-sm">{s.name}</td>
                    <td className="px-6 py-4">
                      {s.level === "PHO_THONG" ? (
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          PHỔ THÔNG
                        </span>
                      ) : (
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1">
                          <Baby className="w-3.5 h-3.5" />
                          MẦM NON
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenEdit(s)}
                        className="p-2 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-2 border border-rose-200 hover:border-rose-350 hover:bg-rose-50 text-rose-600 rounded-xl transition-all cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-800 text-sm font-bold">Không tìm thấy trường học nào</p>
              <p className="text-slate-400 text-xs mt-1">Hãy thêm trường học mới hoặc nhấn nút khởi tạo dữ liệu mẫu.</p>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden border border-slate-100 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-850 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#00A99D]" />
                {editingSchool ? "Chỉnh sửa trường liên kết" : "Thêm trường liên kết mới"}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tên trường học</label>
                <input 
                  type="text"
                  required
                  placeholder="Ví dụ: THPT Quang Trung"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 focus:border-[#00A99D] focus:ring-4 focus:ring-[#00A99D]/10 rounded-xl font-medium outline-none transition-all text-xs text-slate-850 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Mã viết tắt</label>
                <input 
                  type="text"
                  required
                  placeholder="Ví dụ: QTR"
                  value={form.code}
                  onChange={e => setForm({...form, code: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 focus:border-[#00A99D] focus:ring-4 focus:ring-[#00A99D]/10 rounded-xl font-medium outline-none transition-all text-xs text-slate-855 font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Cấp bậc giáo dục</label>
                <div className="grid grid-cols-2 gap-3">
                  <label 
                    className={`flex items-center justify-center gap-2 border p-3.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      form.level === "PHO_THONG"
                        ? "border-[#00A99D] bg-[#00A99D]/5 text-[#00A99D] shadow-xs"
                        : "border-slate-250 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="level"
                      value="PHO_THONG"
                      checked={form.level === "PHO_THONG"}
                      onChange={() => setForm({...form, level: "PHO_THONG"})}
                      className="hidden"
                    />
                    <GraduationCap className="w-4 h-4" />
                    <span>Phổ thông</span>
                  </label>
                  <label 
                    className={`flex items-center justify-center gap-2 border p-3.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      form.level === "MAM_NON"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs"
                        : "border-slate-250 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="level"
                      value="MAM_NON"
                      checked={form.level === "MAM_NON"}
                      onChange={() => setForm({...form, level: "MAM_NON"})}
                      className="hidden"
                    />
                    <Baby className="w-4 h-4" />
                    <span>Mầm non</span>
                  </label>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 font-bold rounded-xl text-xs text-slate-500 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#00A99D] text-white font-bold rounded-xl hover:bg-[#009085] transition-all flex items-center gap-1.5 text-xs cursor-pointer shadow-xs disabled:opacity-55"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
