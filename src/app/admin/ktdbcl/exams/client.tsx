"use client"
const LEVEL_LABELS: Record<string, string> = {
  TIEU_HOC: "Tiểu học",
  THCS: "THCS",
  THPT: "THPT",
  TH_THCS: "Liên cấp TH-THCS",
  THCS_THPT: "Liên cấp THCS-THPT",
  ALL: "Mọi cấp học"
}

function getLevelLabel(val: string) {
  if (!val) return "";
  if (val.includes(",") || /^\d+$/.test(val)) {
    return val.split(",").map((g: any) => `Khối ${g}`).join(", ");
  }
  return LEVEL_LABELS[val] || val;
}

function matchesLevelFilter(examGrade: string, filterVal: string) {
  if (!filterVal) return true;
  if (!examGrade) return false;
  if (examGrade === filterVal) return true;

  const levelGradesMap: Record<string, string[]> = {
    TIEU_HOC: ["1", "2", "3", "4", "5"],
    THCS: ["6", "7", "8", "9"],
    THPT: ["10", "11", "12"],
    TH_THCS: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    THCS_THPT: ["6", "7", "8", "9", "10", "11", "12"],
    ALL: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
  };

  const allowedGrades = levelGradesMap[filterVal];
  if (!allowedGrades) return false;

  const examGradesList = examGrade.split(",");
  return examGradesList.some(g => allowedGrades.includes(g));
}

import { useState, useEffect } from "react"
import { Plus, Trash2, Edit2, Check, X, Calendar, Star, Tag, User, Layers, Search, Filter } from "lucide-react"
import { createExamAction, updateExamAction, deleteExamAction } from "./actions"

const generateNextExamCode = (existingExams: any[]) => {
  const currentYear = new Date().getFullYear() // e.g. 2026
  const yearSuffix = String(currentYear).slice(-2) // e.g. "26"
  const prefix = `CT-${yearSuffix}-`;
  
  // Find all existing exam codes matching CT-[yearSuffix]-XXXX
  const codes = existingExams
    .map(e => e.code || "")
    .filter(code => code.startsWith(prefix))
  
  let maxSeq = -1
  for (const code of codes) {
    const seqStr = code.slice(prefix.length)
    const seq = parseInt(seqStr, 10)
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq
    }
  }
  
  const nextSeq = maxSeq + 1
  const nextSeqStr = String(nextSeq).padStart(4, "0")
  return `${prefix}${nextSeqStr}`
}

const PLAN_LABELS: Record<string, string> = {
  HE_THONG: "Hệ thống",
  TRUONG: "Trường",
  PHUONG: "Phường",
  SO: "Sở GD&ĐT",
  BO: "Bộ GD&ĐT",
  TU_DANG_KY: "Tự đăng ký"
}

interface ExamsClientProps {
  initialExams: any[]
  categories: any[]
  rounds: any[]
  departments: any[]
  academicYears: any[]
}

export function ExamsClient({
  initialExams,
  categories,
  rounds,
  departments,
  academicYears
}: ExamsClientProps) {
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

  const [exams, setExams] = useState(initialExams)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const standardPlans = ["HE_THONG", "TRUONG", "PHUONG", "SO", "BO", "TU_DANG_KY"]
  const customPlansInDB = Array.from(
    new Set(
      exams
        .map((e) => e.plan)
        .filter((p) => p && !standardPlans.includes(p))
    )
  ) as string[]

  // Form states
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    startDate: "",
    endDate: "",
    categoryId: "",
    roundId: "",
    departmentId: "",
    plan: "HE_THONG",
    isPriority: false,
    grade: ""
  })

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterRound, setFilterRound] = useState("")
  const [filterDept, setFilterDept] = useState("")
  const [filterPriority, setFilterPriority] = useState("")
  const [filterGrade, setFilterGrade] = useState("")
  const [filterPlan, setFilterPlan] = useState("")
  const [customPlan, setCustomPlan] = useState("")

  const openCreate = () => {
    const autoCode = generateNextExamCode(exams)
    setEditingId(null)
    setForm({
      name: "",
      code: autoCode,
      description: "",
      startDate: "",
      endDate: "",
      categoryId: categories[0]?.id || "",
      roundId: "",
      departmentId: "",
      plan: "HE_THONG",
      isPriority: false,
      grade: ""
    })
    setCustomPlan("")
    setCreating(true)
    setErrorMsg("")
  }

  const openEdit = (exam: any) => {
    setEditingId(exam.id)
    const isStandard = exam.plan && standardPlans.includes(exam.plan)
    setForm({
      name: exam.name,
      code: exam.code,
      description: exam.description || "",
      startDate: exam.startDate ? new Date(exam.startDate).toISOString().slice(0, 16) : "",
      endDate: exam.endDate ? new Date(exam.endDate).toISOString().slice(0, 16) : "",
      categoryId: exam.categoryId,
      roundId: exam.roundId || "",
      departmentId: exam.departmentId || "",
      plan: isStandard ? exam.plan : (exam.plan ? "KHAC" : "HE_THONG"),
      isPriority: exam.isPriority || false,
      grade: exam.grade || ""
    })
    setCustomPlan(isStandard ? "" : (exam.plan || ""))
    setErrorMsg("")
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.categoryId) {
      setErrorMsg("Vui lòng nhập Tên, Mã kỳ thi và chọn Danh mục!")
      return
    }
    const finalPlan = form.plan === "KHAC" ? customPlan.trim() : form.plan
    if (form.plan === "KHAC" && !finalPlan) {
      setErrorMsg("Vui lòng nhập tên kế hoạch khác!")
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        plan: finalPlan,
        academicYearId: yearId
      }
      if (editingId) {
        await updateExamAction({ id: editingId, ...payload })
        alert("Cập nhật kỳ thi thành công!")
        window.location.reload()
      } else {
        await createExamAction(payload)
        alert("Tạo kỳ thi thành công!")
        window.location.reload()
      }
    } catch (e) {
      setErrorMsg("Mã kỳ thi đã tồn tại hoặc xảy ra lỗi. Vui lòng kiểm tra lại!")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa kỳ thi "${name}"? Hành động này không thể hoàn tác.`)) return
    try {
      await deleteExamAction(id)
      setExams(exams.filter((e) => e.id !== id))
    } catch (e) {
      alert("Có lỗi xảy ra khi xóa kỳ thi.")
    }
  }

  // Filter logic
  const filteredCategoriesForSelect = categories.filter(c => c.academicYearId === yearId || c.academicYearId === null)
  const filteredRoundsForSelect = rounds.filter(r => r.academicYearId === yearId || r.academicYearId === null)

  const filteredExams = exams.filter((exam) => {
    const matchesYear = exam.academicYearId === yearId
    const matchesSearch =
      exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory ? exam.categoryId === filterCategory : true
    const matchesRound = filterRound ? exam.roundId === filterRound : true
    const matchesDept = filterDept ? exam.departmentId === filterDept : true
    const matchesPriority =
      filterPriority === "yes"
        ? exam.isPriority === true
        : filterPriority === "no"
        ? exam.isPriority === false
        : true
    const matchesGrade = matchesLevelFilter(exam.grade || '', filterGrade)
    const matchesPlan = filterPlan ? exam.plan === filterPlan : true

    return matchesYear && matchesSearch && matchesCategory && matchesRound && matchesDept && matchesPriority && matchesGrade && matchesPlan
  })

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm kỳ thi theo tên, mã..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#00A19A] transition-all font-semibold"
            />
          </div>

          {/* Filters */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none text-slate-600 focus:border-[#00A19A]"
          >
            <option value="">Tất cả danh mục</option>
            {filteredCategoriesForSelect.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterRound}
            onChange={(e) => setFilterRound(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none text-slate-600 focus:border-[#00A19A]"
          >
            <option value="">Tất cả vòng thi</option>
            {filteredRoundsForSelect.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none text-slate-600 focus:border-[#00A19A]"
          >
            <option value="">Tất cả tổ chuyên môn</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none text-slate-600 focus:border-[#00A19A]"
          >
            <option value="">Mức độ ưu tiên</option>
            <option value="yes">Kỳ thi ưu tiên (*)</option>
            <option value="no">Kỳ thi thường</option>
          </select>

          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none text-slate-600 focus:border-[#00A19A]"
          >
            <option value="">Tất cả đối tượng</option>
            <option value="TIEU_HOC">Tiểu học</option>
            <option value="THCS">THCS</option>
            <option value="THPT">THPT</option>
            <option value="TH_THCS">Liên cấp TH-THCS</option>
            <option value="THCS_THPT">Liên cấp THCS-THPT</option>
            <option value="ALL">Mọi cấp học</option>
          </select>

          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none text-slate-600 focus:border-[#00A19A]"
          >
            <option value="">Tất cả kế hoạch</option>
            <option value="HE_THONG">Hệ thống</option>
            <option value="TRUONG">Trường</option>
            <option value="PHUONG">Phường</option>
            <option value="SO">Sở GD&ĐT</option>
            <option value="BO">Bộ GD&ĐT</option>
            <option value="TU_DANG_KY">Tự đăng ký</option>
            {customPlansInDB.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#00A19A] hover:bg-[#008c85] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-[#00A19A]/20 transition-all text-xs self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tạo Kỳ Thi Mới
        </button>
      </div>

      {/* Editor Modal / Container */}
      {(creating || editingId) && (
        <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-md shadow-indigo-50 animate-fade-in space-y-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#00A19A]" />
            {editingId ? "Cập Nhật Kỳ Thi" : "Tạo Kỳ Thi Mới"}
          </h3>
          {errorMsg && (
            <div className="text-red-700 bg-red-50 p-3 rounded-lg border border-red-100 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tên kỳ thi */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Tên Kỳ Thi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ví dụ: Kiểm tra học kỳ 1 Toán, Thi Olympic..."
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-xs focus:border-[#00A19A] outline-none font-semibold"
              />
            </div>

            {/* Mã kỳ thi */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Mã Kỳ Thi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                className="w-full border border-slate-200 bg-slate-100 rounded-lg px-4 py-2 text-xs focus:border-[#00A19A] outline-none font-mono font-bold text-slate-500 cursor-not-allowed"
                disabled={true}
                placeholder="Tự động sinh mã..."
              />
            </div>

            {/* Danh mục */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Danh mục <span className="text-red-500">*</span>
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700"
              >
                <option value="">-- Chọn danh mục --</option>
                {filteredCategoriesForSelect.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Vòng thi */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Vòng thi</label>
              <select
                value={form.roundId}
                onChange={(e) => setForm({ ...form, roundId: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700"
              >
                <option value="">-- Chọn vòng thi --</option>
                {filteredRoundsForSelect.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Đối tượng dự thi */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Đối tượng dự thi <span className="text-red-500">*</span>
              </label>
              <select
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700"
              >
                <option value="">-- Chọn đối tượng dự thi --</option>
                <option value="TIEU_HOC">Tiểu học</option>
                <option value="THCS">THCS</option>
                <option value="THPT">THPT</option>
                <option value="TH_THCS">Liên cấp TH-THCS</option>
                <option value="THCS_THPT">Liên cấp THCS-THPT</option>
                <option value="ALL">Mọi cấp học</option>
              </select>
            </div>

            {/* Tổ chuyên môn */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Tổ chuyên môn</label>
              <select
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700"
              >
                <option value="">-- Chọn tổ chuyên môn --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Kế hoạch */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Kế hoạch <span className="text-red-500">*</span>
              </label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700"
              >
                <option value="HE_THONG">Hệ thống</option>
                <option value="TRUONG">Trường</option>
                <option value="PHUONG">Phường</option>
                <option value="SO">Sở GD&ĐT</option>
                <option value="BO">Bộ GD&ĐT</option>
                <option value="TU_DANG_KY">Tự đăng ký</option>
                <option value="KHAC">Khác</option>
              </select>
            </div>

            {/* Kế hoạch khác */}
            {form.plan === "KHAC" && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Nhập kế hoạch khác <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customPlan}
                  onChange={(e) => setCustomPlan(e.target.value)}
                  placeholder="Ví dụ: Kế hoạch Cụm, Kế hoạch Tỉnh..."
                  className="w-full border border-slate-200 rounded-lg px-4 py-2 text-xs focus:border-[#00A19A] outline-none font-semibold"
                />
              </div>
            )}



            {/* Thời gian bắt đầu */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Bắt đầu</label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700"
              />
            </div>

            {/* Thời gian kết thúc */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Kết thúc</label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700"
              />
            </div>
          </div>

          {/* Mô tả / Nội dung */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Nội dung kỳ thi</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Chi tiết nội dung kiểm tra, phòng thi, hình thức tổ chức..."
              className="w-full border border-slate-200 rounded-lg px-4 py-2 text-xs focus:border-[#00A19A] outline-none font-semibold"
              rows={3}
            />
          </div>

          {/* Mức độ ưu tiên */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPriority"
              checked={form.isPriority}
              onChange={(e) => setForm({ ...form, isPriority: e.target.checked })}
              className="w-4 h-4 rounded text-[#00A19A] focus:ring-[#00A19A]"
            />
            <label htmlFor="isPriority" className="text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1 select-none">
              <Star className={`w-4 h-4 ${form.isPriority ? "text-amber-500 fill-amber-500" : "text-slate-400"}`} />
              Gán làm Kỳ thi ưu tiên (*)
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-[#00A19A] hover:bg-[#008c85] text-white rounded-lg font-bold text-xs shadow-md shadow-[#00A19A]/20 transition-all disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu Kỳ Thi"}
            </button>
            <button
              onClick={() => {
                setCreating(false)
                setEditingId(null)
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-all"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Main Grid List */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#00A19A]" />
              <span className="font-bold text-slate-700 text-sm">Danh Sách Kỳ Thi ({filteredExams.length})</span>
            </div>
          </div>

          {filteredExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Calendar className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-bold text-lg mb-1">Chưa có kỳ thi nào</p>
              <p className="text-xs font-medium">Nhấn "Tạo Kỳ Thi Mới" hoặc đổi bộ lọc để xem danh sách.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredExams.map((exam) => (
                <div key={exam.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-slate-50/50 transition-all group gap-4 text-xs font-semibold">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      exam.isPriority ? "bg-amber-50 text-amber-500" : "bg-teal-50 text-[#00A19A]"
                    }`}>
                      <Calendar className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {exam.isPriority && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold animate-pulse">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Ưu tiên
                          </span>
                        )}
                        <span className="font-bold text-slate-800 text-sm flex items-center gap-1">
                          {exam.name}
                        </span>
                        {exam.grade && (
                          <span className="text-[10px] bg-[#00A19A]/10 text-[#00A19A] px-2 py-0.5 rounded-md font-bold mr-1">
                            {getLevelLabel(exam.grade)}
                          </span>
                        )}
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">
                          {exam.code}
                        </span>
                      </div>

                      {exam.description && (
                        <p className="text-slate-500 text-xs font-semibold max-w-2xl line-clamp-2">{exam.description}</p>
                      )}

                      {/* Details Meta */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          Danh mục: <strong className="text-slate-600">{exam.category.name}</strong>
                        </span>

                        {exam.round && (
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            Vòng thi: <strong className="text-slate-600">{exam.round.name}</strong>
                          </span>
                        )}

                        {exam.grade && (
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            Đối tượng dự thi: <strong className="text-slate-600">{getLevelLabel(exam.grade)}</strong>
                          </span>
                        )}

                        {exam.department && (
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            Tổ chuyên môn: <strong className="text-slate-600">{exam.department.name}</strong>
                          </span>
                        )}

                        {exam.plan && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            Kế hoạch: <strong className="text-slate-600">{PLAN_LABELS[exam.plan] || exam.plan}</strong>
                          </span>
                        )}


                      </div>

                      {/* Time */}
                      {(exam.startDate || exam.endDate) && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Thời gian:{" "}
                          <span className="text-[#00A19A] font-bold">
                            {exam.startDate ? new Date(exam.startDate).toLocaleDateString("vi-VN", {
                              day: "numeric",
                              month: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            }) : "---"}{" "}
                            đến{" "}
                            {exam.endDate ? new Date(exam.endDate).toLocaleDateString("vi-VN", {
                              day: "numeric",
                              month: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            }) : "---"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-start md:self-center">
                    <button
                      onClick={() => openEdit(exam)}
                      className="p-2 hover:bg-teal-50 text-[#00A19A] rounded-xl transition-all"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(exam.id, exam.name)}
                      className="p-2 hover:bg-rose-50 text-rose-600 rounded-xl transition-all"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}