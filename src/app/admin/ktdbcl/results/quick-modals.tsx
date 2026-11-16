"use client"

import { useState, useEffect } from "react"
import { X, Plus, Search, Check, Trophy, Calendar, Users, Loader2, Trash2 } from "lucide-react"
import { createExamAction } from "../exams/actions"
import {
  quickSearchStudentsForExamAction,
  resolveStudentsByCodesAction,
  createDirectAchievementAction,
} from "./actions"

interface QuickCreateExamModalProps {
  isOpen: boolean
  onClose: () => void
  yearId: string
  academicYears?: any[]
  examCategories: any[]
  examRounds: any[]
  onCreated: (createdExam: any) => void
}

export function QuickCreateExamModal({
  isOpen,
  onClose,
  yearId,
  academicYears = [],
  examCategories,
  examRounds,
  onCreated,
}: QuickCreateExamModalProps) {
  const [name, setName] = useState("")
  const [targetYearId, setTargetYearId] = useState(yearId)
  const [categoryId, setCategoryId] = useState(examCategories[0]?.id || "")
  const [roundId, setRoundId] = useState("")
  const [grade, setGrade] = useState("ALL")
  const [plan, setPlan] = useState("HE_THONG")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isOpen && yearId) {
      setTargetYearId(yearId)
    }
  }, [isOpen, yearId])

  if (!isOpen) return null

  const effectiveYearId = targetYearId || yearId

  const availableCategories = examCategories.filter(
    (c) => !c.academicYearId || c.academicYearId === effectiveYearId
  )
  const availableRounds = examRounds.filter(
    (r) => !r.academicYearId || r.academicYearId === effectiveYearId
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Vui lòng nhập tên kỳ thi hoặc cuộc thi.")
      return
    }
    const targetCat = categoryId || availableCategories[0]?.id || examCategories[0]?.id || ""
    if (!targetCat) {
      setError("Hệ thống chưa có danh mục kỳ thi. Vui lòng tạo danh mục trước.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const res = await createExamAction({
        name: name.trim(),
        categoryId: targetCat,
        roundId: roundId || undefined,
        grade,
        plan,
        academicYearId: effectiveYearId,
      })
      if (res?.exam) {
        const catObj = examCategories.find((c) => c.id === res.exam.categoryId)
        const roundObj = examRounds.find((r) => r.id === res.exam.roundId)
        onCreated({
          ...res.exam,
          category: catObj ? { id: catObj.id, name: catObj.name } : { name: "Danh mục" },
          round: roundObj ? { id: roundObj.id, name: roundObj.name } : null,
          _count: { students: 0, achievements: 0 },
        })
        setName("")
        onClose()
      }
    } catch (err: any) {
      setError(err?.message || "Không thể tạo kỳ thi. Vui lòng kiểm tra lại.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full overflow-hidden">
        <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#5EEAD4]" />
            <h3 className="text-sm font-bold">Tạo nhanh kỳ thi / cuộc thi</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tên kỳ thi / sân chơi <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Olympic Tiếng Anh trên Internet (IOE) cấp Thành phố..."
              className="w-full border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {academicYears.length > 0 && (
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Năm học áp dụng <span className="text-rose-600">*</span>
                </label>
                <select
                  value={effectiveYearId}
                  onChange={(e) => setTargetYearId(e.target.value)}
                  className="w-full border border-[#00A19A]/40 rounded-xl px-3 py-2 text-xs font-bold text-[#003B3A] bg-[#F0FDFA]/60 focus:bg-white focus:border-[#00A19A] outline-none tabular-nums"
                >
                  {academicYears.map((y: any) => (
                    <option key={y.id} value={y.id}>
                      Năm học {y.name} {y.status === "ACTIVE" ? "(Hiện hành)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Danh mục</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none"
              >
                {(availableCategories.length > 0 ? availableCategories : examCategories).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vòng thi (tùy chọn)</label>
              <select
                value={roundId}
                onChange={(e) => setRoundId(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none"
              >
                <option value="">-- Không chọn --</option>
                {availableRounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Đối tượng dự thi</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none"
              >
                <option value="ALL">Mọi cấp học</option>
                <option value="TIEU_HOC">Tiểu học</option>
                <option value="THCS">THCS</option>
                <option value="THPT">THPT</option>
                <option value="TH_THCS">Liên cấp TH-THCS</option>
                <option value="THCS_THPT">Liên cấp THCS-THPT</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cấp kế hoạch</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none"
              >
                <option value="HE_THONG">Hệ thống</option>
                <option value="TRUONG">Trường</option>
                <option value="PHUONG">Quận / Phường</option>
                <option value="SO">Sở GD&ĐT</option>
                <option value="BO">Bộ GD&ĐT</option>
                <option value="TU_DANG_KY">Tự đăng ký</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-slate-600 hover:bg-[#F8FAFC] font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Tạo & Chọn nhập kết quả</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface DirectAwardModalProps {
  isOpen: boolean
  onClose: () => void
  yearId: string
  exams: any[]
  defaultExamId?: string
  preselectedStudent?: {
    id: string
    studentCode: string
    studentName: string
    className: string
    campusName?: string
  } | null
  achievementCategories: any[]
  achievementLevels: any[]
  teachers: any[]
  onSuccess: (message: string) => void
}

export function DirectAwardModal({
  isOpen,
  onClose,
  yearId,
  exams,
  defaultExamId = "",
  preselectedStudent = null,
  achievementCategories,
  achievementLevels,
  teachers,
  onSuccess,
}: DirectAwardModalProps) {
  const [selectedStudents, setSelectedStudents] = useState<any[]>(
    preselectedStudent ? [preselectedStudent] : []
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [pasteCodes, setPasteCodes] = useState("")
  const [showPasteBox, setShowPasteBox] = useState(false)

  const [examMode, setExamMode] = useState<"exam" | "external">(defaultExamId ? "exam" : "external")
  const [examId, setExamId] = useState(defaultExamId)
  const [externalExamTitle, setExternalExamTitle] = useState("")

  const [type, setType] = useState<"CA_NHAN" | "DONG_DOI">("CA_NHAN")
  const [category, setCategory] = useState(achievementCategories[0]?.code || "")
  const [level, setLevel] = useState("")
  const [customName, setCustomName] = useState("")
  const [teacherId, setTeacherId] = useState("")
  const [teacherName, setTeacherName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen) return null

  const activeStudentsList =
    preselectedStudent && selectedStudents.length === 0 ? [preselectedStudent] : selectedStudents

  const selectedCatObj = achievementCategories.find((c) => c.code === category)
  const filteredLevels = selectedCatObj
    ? achievementLevels.filter((l) => l.categoryId === selectedCatObj.id)
    : []

  const handleSearch = async (val: string) => {
    setSearchQuery(val)
    if (val.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await quickSearchStudentsForExamAction(val, yearId)
      setSearchResults(res)
    } finally {
      setSearching(false)
    }
  }

  const addStudent = (stu: any) => {
    setSelectedStudents((prev) => {
      const base = preselectedStudent && prev.length === 0 ? [preselectedStudent] : prev
      if (base.some((s) => s.id === stu.id)) return base
      return [...base, stu]
    })
    setSearchQuery("")
    setSearchResults([])
  }

  const removeStudent = (id: string) => {
    setSelectedStudents((prev) => {
      const base = preselectedStudent && prev.length === 0 ? [preselectedStudent] : prev
      return base.filter((s) => s.id !== id)
    })
  }

  const handleResolvePastedCodes = async () => {
    const codes = pasteCodes
      .split(/[\n,;\t\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (codes.length === 0) return
    setSearching(true)
    try {
      const found = await resolveStudentsByCodesAction(codes, yearId)
      setSelectedStudents((prev) => {
        const base = preselectedStudent && prev.length === 0 ? [preselectedStudent] : prev
        const existing = new Set(base.map((s) => s.id))
        const merged = [...base]
        for (const f of found) {
          if (!existing.has(f.id)) merged.push(f)
        }
        return merged
      })
      setPasteCodes("")
      setShowPasteBox(false)
    } finally {
      setSearching(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (activeStudentsList.length === 0) {
      setError("Vui lòng chọn ít nhất 1 học sinh.")
      return
    }
    if (!category) {
      setError("Vui lòng chọn loại thành tích.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const lvlObj = achievementLevels.find((l) => l.code === level)
      const baseAwardLabel = customName.trim() || lvlObj?.name || selectedCatObj?.name || "Đạt giải"
      const finalName =
        examMode === "external" && externalExamTitle.trim()
          ? `${baseAwardLabel} — ${externalExamTitle.trim()}`
          : baseAwardLabel

      const resolvedTeacherName =
        teacherId === "KHAC"
          ? teacherName.trim() || null
          : teacherId
          ? teachers.find((t) => t.id === teacherId)?.teacherName || null
          : null

      const res = await createDirectAchievementAction({
        academicYearId: yearId,
        examId: examMode === "exam" ? examId || null : null,
        studentIds: activeStudentsList.map((s) => s.id),
        name: finalName,
        type,
        category,
        level,
        teacherId: teacherId === "KHAC" ? null : teacherId || null,
        teacherName: resolvedTeacherName,
      })

      onSuccess(`Đã ghi nhận thành tích cho ${res.count} học sinh.`)
      onClose()
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi lưu thành tích.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#5EEAD4]" />
            <h3 className="text-sm font-bold">Ghi nhận nhanh thành tích học sinh</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {error}
            </div>
          )}

          {/* 1. Chọn học sinh */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#008B85]" />
                <span>Học sinh đạt thành tích ({activeStudentsList.length})</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPasteBox((v) => !v)}
                className="text-[11px] font-semibold text-[#00736E] hover:underline cursor-pointer"
              >
                {showPasteBox ? "Ẩn ô dán mã HS" : "Dán danh sách mã HS"}
              </button>
            </div>

            {showPasteBox ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pasteCodes}
                  onChange={(e) => setPasteCodes(e.target.value)}
                  placeholder="Dán nhiều Mã HS cách nhau bởi dấu phẩy, khoảng trắng hoặc xuống dòng..."
                  className="flex-1 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00A19A]"
                />
                <button
                  type="button"
                  onClick={handleResolvePastedCodes}
                  disabled={searching}
                  className="px-3.5 py-2 rounded-xl bg-[#008B85] text-white font-semibold cursor-pointer shrink-0"
                >
                  {searching ? "Đang dò..." : "Thêm HS"}
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Tìm và chọn thêm học sinh theo Mã HS hoặc Họ tên..."
                  className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-xl text-xs bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none"
                />
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg max-h-48 overflow-y-auto z-20 divide-y divide-[#F1F5F9]">
                    {searchResults.map((stu) => (
                      <button
                        key={stu.id}
                        type="button"
                        onClick={() => addStudent(stu)}
                        className="w-full px-3.5 py-2 text-left hover:bg-[#F0FDFA] flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{stu.studentName}</span>
                          <span className="ml-2 font-mono text-[11px] text-slate-500 tabular-nums">
                            {stu.studentCode}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-[#00736E] bg-[#F0FDFA] px-2 py-0.5 rounded-md border border-[#CCFBF1]">
                          {stu.className}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeStudentsList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeStudentsList.map((stu) => (
                  <span
                    key={stu.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F0FDFA] border border-[#CCFBF1] text-[#003B3A] font-semibold text-xs tabular-nums"
                  >
                    <span>{stu.studentName}</span>
                    <span className="text-[11px] text-[#00736E]">({stu.className})</span>
                    <button
                      type="button"
                      onClick={() => removeStudent(stu.id)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 2. Nguồn kỳ thi */}
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExamMode("external")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  examMode === "external"
                    ? "bg-[#003B3A] text-white"
                    : "bg-white text-slate-600 border border-[#E2E8F0]"
                }`}
              >
                Cuộc thi / Giải thưởng tự do (Ngoài danh sách)
              </button>
              <button
                type="button"
                onClick={() => setExamMode("exam")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  examMode === "exam"
                    ? "bg-[#003B3A] text-white"
                    : "bg-white text-slate-600 border border-[#E2E8F0]"
                }`}
              >
                Thuộc kỳ thi trong hệ thống
              </button>
            </div>

            {examMode === "external" ? (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên cuộc thi / sân chơi
                </label>
                <input
                  type="text"
                  value={externalExamTitle}
                  onChange={(e) => setExternalExamTitle(e.target.value)}
                  placeholder="Ví dụ: Giải Cờ vua trẻ Toàn quốc 2026, Cuộc thi Vẽ tranh Quốc tế..."
                  className="w-full border border-[#E2E8F0] bg-white rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn kỳ thi</label>
                <select
                  value={examId}
                  onChange={(e) => setExamId(e.target.value)}
                  className="w-full border border-[#E2E8F0] bg-white rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] outline-none"
                >
                  <option value="">-- Chọn kỳ thi --</option>
                  {exams
                    .filter((e) => e.academicYearId === yearId)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        [{e.code}] {e.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* 3. Chi tiết giải thưởng */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hình thức</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "CA_NHAN" | "DONG_DOI")}
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-800 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none"
              >
                <option value="CA_NHAN">Cá nhân</option>
                <option value="DONG_DOI">Đồng đội / Tập thể</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Loại thành tích <span className="text-rose-600">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setLevel("")
                }}
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-800 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none"
              >
                <option value="">-- Chọn loại --</option>
                {achievementCategories.map((c) => (
                  <option key={c.id || c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mức giải</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                disabled={filteredLevels.length === 0}
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-800 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none disabled:opacity-50"
              >
                <option value="">
                  {filteredLevels.length > 0 ? "-- Chọn mức giải --" : "-- Không phân mức --"}
                </option>
                {filteredLevels.map((l) => (
                  <option key={l.id || l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tên danh hiệu / Giải thưởng cụ thể
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Bỏ trống để tự lấy theo Mức giải (VD: Giải Nhất)..."
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Giáo viên bồi dưỡng (tùy chọn)
              </label>
              <div className="flex gap-2">
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="flex-1 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-800 bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none"
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teacherName}
                    </option>
                  ))}
                  <option value="KHAC">Khác (Nhập tên)...</option>
                </select>
                {teacherId === "KHAC" && (
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Tên GV..."
                    className="w-36 border border-[#E2E8F0] rounded-xl px-2.5 py-2 text-xs outline-none focus:border-[#00A19A]"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-slate-600 hover:bg-[#F8FAFC] font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Lưu vào hồ sơ thành tích</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
