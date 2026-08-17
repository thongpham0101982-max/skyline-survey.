"use client"
import { useState, useTransition, useRef } from "react"
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
import * as xlsx from "xlsx"
import { 
  createDestinationSchoolAction, 
  updateDestinationSchoolAction, 
  deleteDestinationSchoolAction, 
  seedDestinationSchoolsAction,
  getDestinationSchoolsAction,
  importDestinationSchoolsAction
} from "./actions"

export function DestinationSchoolsClient({ initialSchools }: { initialSchools: any[] }) {
  const [schools, setSchools] = useState<any[]>(initialSchools)
  const [search, setSearch] = useState("")
  const [levelFilter, setLevelFilter] = useState<"ALL" | "PHO_THONG" | "MAM_NON">("ALL")
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PUBLIC" | "PRIVATE">("ALL")
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingSchool, setEditingSchool] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    code: "",
    level: "PHO_THONG",
    schoolType: "PRIVATE"
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
      level: "PHO_THONG",
      schoolType: "PRIVATE"
    })
    setShowModal(true)
  }

  const handleOpenEdit = (school: any) => {
    setEditingSchool(school)
    setForm({
      name: school.name,
      code: school.code,
      level: school.level,
      schoolType: school.schoolType || "PRIVATE"
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
        alert("Đã khởi tạo và đồng bộ loại hình trường thành công!")
        loadSchools()
      } else {
        alert("Lỗi: " + res.error)
      }
    })
  }

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Mã trường*": "QTR",
        "Tên trường*": "THPT Quang Trung",
        "Cấp bậc*": "Phổ thông",
        "Loại hình*": "Công lập"
      },
      {
        "Mã trường*": "KTR",
        "Tên trường*": "THPT Khai Trí",
        "Cấp bậc*": "Phổ thông",
        "Loại hình*": "Tư thục"
      },
      {
        "Mã trường*": "MAM_NON_TEST",
        "Tên trường*": "Mầm non Sao Mai",
        "Cấp bậc*": "Mầm non",
        "Loại hình*": "Tư thục"
      }
    ]
    const ws = xlsx.utils.json_to_sheet(templateData)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Danh_sach_truong")
    xlsx.writeFile(wb, "Mau_Import_Truong_Hoc.xlsx")
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = xlsx.read(bstr, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rawData = xlsx.utils.sheet_to_json(ws) as any[]

        if (rawData.length === 0) {
          alert("File Excel trống hoặc không đúng định dạng!")
          return
        }

        const payload = rawData.map((row: any) => {
          const rawLevel = (row["Cấp bậc*"] || row["Cap bac*"] || row["Cấp bậc"] || row["Cap bac"] || "").toString().trim()
          const rawType = (row["Loại hình*"] || row["Loai hinh*"] || row["Loại hình"] || row["Loai hinh"] || "").toString().trim()

          return {
            code: (row["Mã trường*"] || row["Ma truong*"] || row["Mã trường"] || row["Ma truong"] || "").toString().trim().toUpperCase(),
            name: (row["Tên trường*"] || row["Ten truong*"] || row["Tên trường"] || row["Ten truong"] || "").toString().trim(),
            level: rawLevel.includes("Mầm") || rawLevel.toLowerCase().includes("mam") ? "MAM_NON" : "PHO_THONG",
            schoolType: rawType.includes("Công") || rawType.toLowerCase().includes("cong") ? "PUBLIC" : "PRIVATE"
          }
        }).filter(item => item.code && item.name)

        if (payload.length === 0) {
          alert("Không tìm thấy dữ liệu hợp lệ trong file Excel!")
          return
        }

        startTransition(async () => {
          const res = await importDestinationSchoolsAction(payload)
          if (res.success) {
            alert(`Đã import thành công ${res.count} trường học mới!`)
            loadSchools()
          } else {
            alert("Lỗi: " + res.error)
          }
        })
      } catch (err) {
        console.error(err)
        alert("Lỗi đọc file Excel!")
      }
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
    reader.readAsBinaryString(file)
  }

  // Filter & Search logic
  const filteredSchools = schools.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    
    const matchesLevel = levelFilter === "ALL" || s.level === levelFilter;
    const matchesType = typeFilter === "ALL" || s.schoolType === typeFilter;
    return matchesSearch && matchesLevel && matchesType;
  })

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Cấp học Filter Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
              <button 
                onClick={() => setLevelFilter("ALL")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  levelFilter === "ALL" 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Tất cả Cấp học
              </button>
              <button 
                onClick={() => setLevelFilter("PHO_THONG")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  levelFilter === "PHO_THONG" 
                    ? "bg-[#36E08F]/10 text-[#36E08F]" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                Phổ thông
              </button>
              <button 
                onClick={() => setLevelFilter("MAM_NON")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  levelFilter === "MAM_NON" 
                    ? "bg-emerald-100 text-emerald-700" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Baby className="w-4 h-4" />
                Mầm non
              </button>
            </div>

            {/* Loại hình Filter Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
              <button 
                onClick={() => setTypeFilter("ALL")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  typeFilter === "ALL" 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Tất cả Loại hình
              </button>
              <button 
                onClick={() => setTypeFilter("PUBLIC")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  typeFilter === "PUBLIC" 
                    ? "bg-amber-100 text-amber-800" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Công lập
              </button>
              <button 
                onClick={() => setTypeFilter("PRIVATE")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  typeFilter === "PRIVATE" 
                    ? "bg-sky-100 text-sky-800" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Tư thục
              </button>
            </div>
          </div>

          {/* Right: Search & Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm tên hoặc mã trường..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:border-[#36E08F] focus:ring-4 focus:ring-[#36E08F]/10 rounded-2xl font-medium outline-none transition-all text-xs text-slate-800" 
              />
            </div>

            <div className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
              
              <button 
                onClick={handleDownloadTemplate}
                className="px-4 py-2.5 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 font-bold rounded-2xl text-xs text-slate-650 cursor-pointer flex items-center gap-1.5"
                title="Tải mẫu Excel để điền thông tin"
              >
                Tải mẫu Excel
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-700 transition-all flex items-center gap-1.5 shadow-sm text-xs cursor-pointer"
              >
                Nhập từ Excel
              </button>

              <button 
                onClick={handleOpenAdd}
                className="px-4 py-2.5 bg-[#36E08F] text-white font-bold rounded-2xl hover:bg-[#009085] transition-all flex items-center gap-1.5 shadow-sm text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Thêm trường mới
              </button>
            </div>
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
                  <th className="px-6 py-4 font-black">Phân loại / Loại hình</th>
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
                      <div className="flex gap-2">
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
                        {s.schoolType === "PUBLIC" ? (
                          <span className="bg-amber-50 border border-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black inline-flex items-center">
                            CÔNG LẬP
                          </span>
                        ) : (
                          <span className="bg-sky-50 border border-sky-100 text-sky-700 px-3 py-1 rounded-full text-[10px] font-black inline-flex items-center">
                            TƯ THỤC
                          </span>
                        )}
                      </div>
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
                <Building2 className="w-5 h-5 text-[#36E08F]" />
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
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 focus:border-[#36E08F] focus:ring-4 focus:ring-[#36E08F]/10 rounded-xl font-medium outline-none transition-all text-xs text-slate-855 font-semibold"
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
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 focus:border-[#36E08F] focus:ring-4 focus:ring-[#36E08F]/10 rounded-xl font-medium outline-none transition-all text-xs text-slate-855 font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Cấp bậc giáo dục</label>
                <div className="grid grid-cols-2 gap-3">
                  <label 
                    className={`flex items-center justify-center gap-2 border p-3.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      form.level === "PHO_THONG"
                        ? "border-[#36E08F] bg-[#36E08F]/5 text-[#36E08F] shadow-xs"
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

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Loại hình trường</label>
                <div className="grid grid-cols-2 gap-3">
                  <label 
                    className={`flex items-center justify-center gap-2 border p-3.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      form.schoolType === "PUBLIC"
                        ? "border-amber-500 bg-amber-55/65 text-amber-700 shadow-xs"
                        : "border-slate-250 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="schoolType"
                      value="PUBLIC"
                      checked={form.schoolType === "PUBLIC"}
                      onChange={() => setForm({...form, schoolType: "PUBLIC"})}
                      className="hidden"
                    />
                    <span>Công lập</span>
                  </label>
                  <label 
                    className={`flex items-center justify-center gap-2 border p-3.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      form.schoolType === "PRIVATE"
                        ? "border-[#36E08F] bg-[#36E08F]/5 text-[#36E08F] shadow-xs"
                        : "border-slate-250 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="schoolType"
                      value="PRIVATE"
                      checked={form.schoolType === "PRIVATE"}
                      onChange={() => setForm({...form, schoolType: "PRIVATE"})}
                      className="hidden"
                    />
                    <span>Tư thục</span>
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
                  Hủy bộ
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#36E08F] text-white font-bold rounded-xl hover:bg-[#009085] transition-all flex items-center gap-1.5 text-xs cursor-pointer shadow-xs disabled:opacity-55"
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
