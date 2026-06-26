"use client"
import { useState, useEffect } from "react"
import { 
  Award, Search, Calendar, MapPin, Users, Edit3, Check, X, 
  Trash2, Plus, FileSpreadsheet, Printer, Download, Eye, BookOpen, AlertCircle
} from "lucide-react"
import * as XLSX from "xlsx"
import { 
  updateExamStudentScoreAction,
  createAchievementAction,
  updateAchievementAction,
  deleteAchievementAction,
  getStudentsWithResultsAction,
  getAchievementsReportAction,
  getStudentProfileWithAchievementsAction,
  searchStudentsByNameOrCodeAction
} from "./actions"

interface ResultsClientProps {
  exams: any[]
  academicYears: any[]
  teachers: any[]
  campuses: any[]
  classes: any[]
}

const CATEGORY_LABELS: Record<string, string> = {
  GIAI_THUONG: "Giải thưởng",
  HUY_CHUONG: "Huy chương",
  CHUNG_NHAN: "Chứng nhận",
  KHAC: "Khác"
}

const LEVEL_LABELS: Record<string, string> = {
  NHAT: "Giải Nhất",
  NHI: "Giải Nhì",
  BA: "Giải Ba",
  KHUYEN_KHICH: "Giải Khuyến khích",
  VANG: "Huy chương Vàng",
  BAC: "Huy chương Bạc",
  DONG: "Huy chương Đồng",
  KHAC: "Khác / Chứng nhận"
}

export function ResultsClient({ 
  exams, 
  academicYears, 
  teachers, 
  campuses, 
  classes 
}: ResultsClientProps) {
  // Academic Year State from localstorage (same as other components)
  const [yearId, setYearId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedAcademicYear")
      if (stored) return stored
    }
    const active = academicYears.find((y: any) => y.status === "ACTIVE")
    return active ? active.id : (academicYears[0]?.id || "")
  })

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

  // Sub-tabs state: 'input' | 'reports' | 'profiles'
  const [subTab, setSubTab] = useState<'input' | 'reports' | 'profiles'>('input')

  // --- Sub-Tab 1: Input state ---
  const [selectedExamId, setSelectedExamId] = useState("")
  const [students, setStudents] = useState<any[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null)
  const [editScoreForm, setEditScoreForm] = useState<{ score: string; notes: string }>({ score: "", notes: "" })
  const [showAchievementModal, setShowAchievementModal] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<any | null>(null)
  const [achievementForm, setAchievementForm] = useState({
    name: "",
    type: "CA_NHAN", // CA_NHAN, DONG_DOI
    category: "GIAI_THUONG",
    level: "NHAT",
    teacherId: "",
    teacherName: "",
    selectedStudentIds: [] as string[]
  })
  const [savingAchievement, setSavingAchievement] = useState(false)
  const [savingScore, setSavingScore] = useState(false)

  // --- Sub-Tab 2: Reports State ---
  const [reportFilter, setReportFilter] = useState({
    campusId: "",
    grade: "",
    classId: "",
    category: "",
    level: ""
  })
  const [reportData, setReportData] = useState<any[]>([])
  const [loadingReport, setLoadingReport] = useState(false)

  // --- Sub-Tab 3: Profiles State ---
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  // Filter exams based on yearId
  const filteredExams = exams.filter(e => e.academicYearId === yearId)

  // Automatically select the first exam in query or list
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const queryExamId = urlParams.get("examId")
      if (queryExamId && exams.some(e => e.id === queryExamId)) {
        setSelectedExamId(queryExamId)
        // Clean URL params to not get stuck on it if tab changes
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }
    }

    if (filteredExams.length > 0) {
      if (!filteredExams.some(e => e.id === selectedExamId)) {
        setSelectedExamId(filteredExams[0].id)
      }
    } else {
      setSelectedExamId("")
      setStudents([])
    }
  }, [filteredExams, yearId])

  // Load students when selectedExamId changes
  const loadExamStudents = async () => {
    if (!selectedExamId) return
    setLoadingStudents(true)
    try {
      const data = await getStudentsWithResultsAction(selectedExamId)
      setStudents(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStudents(false)
    }
  }

  useEffect(() => {
    loadExamStudents()
  }, [selectedExamId])

  // Save Score inline handler
  const handleStartEditScore = (student: any) => {
    setEditingScoreId(student.id)
    setEditScoreForm({
      score: student.score !== null && student.score !== undefined ? String(student.score) : "",
      notes: student.notes || ""
    })
  }

  const handleSaveScore = async (studentId: string) => {
    setSavingScore(true)
    const scoreVal = editScoreForm.score.trim() === "" ? null : parseFloat(editScoreForm.score)
    if (scoreVal !== null && isNaN(scoreVal)) {
      alert("Vui lòng nhập điểm số hợp lệ!")
      setSavingScore(false)
      return
    }

    try {
      await updateExamStudentScoreAction({
        examId: selectedExamId,
        studentId,
        score: scoreVal,
        notes: editScoreForm.notes
      })
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, score: scoreVal, notes: editScoreForm.notes } : s))
      setEditingScoreId(null)
    } catch (e) {
      alert("Lỗi khi lưu điểm số!")
    } finally {
      setSavingScore(false)
    }
  }

  // --- Achievement Modal handlers ---
  const handleOpenCreateAchievement = () => {
    setEditingAchievement(null)
    setAchievementForm({
      name: "",
      type: "CA_NHAN",
      category: "GIAI_THUONG",
      level: "NHAT",
      teacherId: "",
      teacherName: "",
      selectedStudentIds: []
    })
    setShowAchievementModal(true)
  }

  const handleOpenEditAchievement = (ach: any) => {
    setEditingAchievement(ach)
    setAchievementForm({
      name: ach.name,
      type: ach.type,
      category: ach.category,
      level: ach.level,
      teacherId: ach.teacherId || "",
      teacherName: ach.teacherName || "",
      selectedStudentIds: ach.studentIds || []
    })
    setShowAchievementModal(true)
  }

  const handleSaveAchievement = async () => {
    if (!achievementForm.name.trim()) {
      alert("Vui lòng nhập Tên thành tích!")
      return
    }
    if (achievementForm.selectedStudentIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 học sinh nhận thành tích này!")
      return
    }
    if (achievementForm.type === "CA_NHAN" && achievementForm.selectedStudentIds.length > 1) {
      alert("Thành tích cá nhân chỉ có thể gắn với 1 học sinh!")
      return
    }

    setSavingAchievement(true)
    const selectedTeacher = teachers.find(t => t.id === achievementForm.teacherId)
    const finalTeacherName = selectedTeacher ? selectedTeacher.teacherName : achievementForm.teacherName

    try {
      if (editingAchievement) {
        // Update
        await updateAchievementAction({
          id: editingAchievement.id,
          name: achievementForm.name,
          type: achievementForm.type,
          category: achievementForm.category,
          level: achievementForm.level,
          teacherId: achievementForm.teacherId || null,
          teacherName: finalTeacherName || null,
          studentIds: achievementForm.selectedStudentIds
        })
      } else {
        // Create
        await createAchievementAction({
          name: achievementForm.name,
          type: achievementForm.type,
          category: achievementForm.category,
          level: achievementForm.level,
          academicYearId: yearId,
          teacherId: achievementForm.teacherId || null,
          teacherName: finalTeacherName || null,
          examId: selectedExamId,
          studentIds: achievementForm.selectedStudentIds
        })
      }
      setShowAchievementModal(false)
      loadExamStudents()
    } catch (e) {
      alert("Lỗi khi lưu thành tích!")
    } finally {
      setSavingAchievement(false)
    }
  }

  const handleDeleteAchievement = async (id: string, name: string) => {
    if (!confirm(`Xóa thành tích "${name}"?`)) return
    try {
      await deleteAchievementAction(id)
      loadExamStudents()
    } catch (e) {
      alert("Lỗi khi xóa thành tích!")
    }
  }

  // --- Sub-Tab 2: Reports ---
  const handleLoadReport = async () => {
    setLoadingReport(true)
    try {
      const data = await getAchievementsReportAction({
        academicYearId: yearId,
        ...reportFilter
      })
      setReportData(data)
    } catch (e) {
      alert("Lỗi khi tạo báo cáo!")
    } finally {
      setLoadingReport(false)
    }
  }

  // Load report data automatically on year change or filter change in tab
  useEffect(() => {
    if (subTab === 'reports') {
      handleLoadReport()
    }
  }, [subTab, yearId, reportFilter.campusId, reportFilter.grade, reportFilter.classId, reportFilter.category, reportFilter.level])

  const handleExportExcel = () => {
    if (reportData.length === 0) {
      alert("Không có dữ liệu để xuất!")
      return
    }

    const exportRows = reportData.map((row, idx) => ({
      "STT": idx + 1,
      "Mã Học Sinh": row.studentCode,
      "Họ & Tên": row.studentName,
      "Lớp": row.className,
      "Cơ sở": row.campusName,
      "Khối": row.grade,
      "Kỳ thi / Cuộc thi": row.examName,
      "Thành tích đạt được": row.achievementName,
      "Loại thành tích": CATEGORY_LABELS[row.category] || row.category,
      "Mức thành tích": LEVEL_LABELS[row.level] || row.level,
      "Hình thức": row.type === "CA_NHAN" ? "Cá nhân" : "Đồng đội",
      "GV Bồi dưỡng": row.teacherName,
      "Năm học": row.academicYearName
    }))

    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Báo Cáo Thành Tích")

    // Set column widths
    const maxLens = Object.keys(exportRows[0]).map(key => 
      Math.max(key.length + 4, ...exportRows.map(row => String((row as any)[key] || '').length + 2))
    )
    ws['!cols'] = maxLens.map(w => ({ w: Math.min(w, 40) }))

    XLSX.writeFile(wb, `Bao_Cao_Thanh_Tich_HS_${academicYears.find(y => y.id === yearId)?.name || 'All'}.xlsx`)
  }

  // --- Sub-Tab 3: Profiles ---
  const handleSearchStudents = async (val: string) => {
    setSearchQuery(val)
    if (val.trim().length < 2) {
      setSearchResults([])
      return
    }
    setLoadingSearch(true)
    try {
      const res = await searchStudentsByNameOrCodeAction(val)
      setSearchResults(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingSearch(false)
    }
  }

  const handleSelectStudentProfile = async (studentId: string) => {
    setLoadingProfile(true)
    setSearchResults([])
    setSearchQuery("")
    try {
      const data = await getStudentProfileWithAchievementsAction(studentId)
      setSelectedStudentProfile(data)
    } catch (e) {
      alert("Lỗi khi tải hồ sơ học sinh!")
    } finally {
      setLoadingProfile(false)
    }
  }

  // Get unique list of achievements for the current exam to show in the list/table
  const currentExamAchievementsMap = new Map<string, any>()
  students.forEach(student => {
    student.achievements.forEach((ach: any) => {
      currentExamAchievementsMap.set(ach.id, ach)
    })
  })
  const currentExamAchievements = Array.from(currentExamAchievementsMap.values())

  // Report stats count
  const goldCount = reportData.filter(d => d.level === "VANG" || d.level === "NHAT").length
  const silverCount = reportData.filter(d => d.level === "BAC" || d.level === "NHI").length
  const bronzeCount = reportData.filter(d => d.level === "DONG" || d.level === "BA").length
  const consolCount = reportData.filter(d => d.level === "KHUYEN_KHICH").length

  return (
    <div className="space-y-6">
      {/* Sub tabs navigation */}
      <div className="flex gap-2 border-b border-slate-200 no-print pb-px">
        <button
          onClick={() => setSubTab('input')}
          className={`pb-3 text-xs font-black transition-all border-b-2 px-4 flex items-center gap-1.5 ${
            subTab === 'input' 
              ? 'border-[#00A19A] text-[#00A19A]' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          Nhập điểm & Kết quả theo Kỳ thi
        </button>
        <button
          onClick={() => setSubTab('reports')}
          className={`pb-3 text-xs font-black transition-all border-b-2 px-4 flex items-center gap-1.5 ${
            subTab === 'reports' 
              ? 'border-[#00A19A] text-[#00A19A]' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Báo cáo thành tích
        </button>
        <button
          onClick={() => setSubTab('profiles')}
          className={`pb-3 text-xs font-black transition-all border-b-2 px-4 flex items-center gap-1.5 ${
            subTab === 'profiles' 
              ? 'border-[#00A19A] text-[#00A19A]' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Hồ sơ thành tích Học sinh
        </button>
      </div>

      {/* --- SUB TAB 1: INPUT --- */}
      {subTab === 'input' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 no-print">
          {/* Left panel: Exam selection & Info */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs h-fit space-y-4">
            <h3 className="text-slate-800 font-bold text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Calendar className="w-4.5 h-4.5 text-[#00A19A]" />
              Chọn Kỳ Thi
            </h3>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Danh sách kỳ thi ({filteredExams.length})</label>
              {filteredExams.length === 0 ? (
                <p className="text-xs font-semibold text-slate-400">Không có kỳ thi nào trong năm học này.</p>
              ) : (
                <select
                  value={selectedExamId}
                  onChange={e => setSelectedExamId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700 bg-slate-50/50"
                >
                  {filteredExams.map(e => (
                    <option key={e.id} value={e.id}>
                      [{e.code}] {e.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedExamId && (
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs font-semibold text-slate-600 bg-slate-50/40 p-3.5 rounded-xl">
                <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1">Chi tiết kỳ thi</div>
                <div>Cấp học: <strong className="text-slate-800">{exams.find(e=>e.id===selectedExamId)?.grade || "Tất cả"}</strong></div>
                <div>Danh mục: <strong className="text-slate-800">{exams.find(e=>e.id===selectedExamId)?.category?.name}</strong></div>
              </div>
            )}
          </div>

          {/* Right panel: Exam candidate list */}
          <div className="lg:col-span-3 space-y-6">
            {!selectedExamId ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
                <Award className="w-16 h-16 mx-auto opacity-10 mb-3" />
                <h4 className="font-bold text-slate-700">Chưa chọn Kỳ thi</h4>
                <p className="text-xs mt-1">Vui lòng chọn hoặc tạo kỳ thi mới để tiến hành nhập điểm & kết quả.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                {/* Panel Header */}
                <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      Kết quả & Thành tích kỳ thi: {exams.find(e => e.id === selectedExamId)?.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      Thí sinh đăng ký dự thi: {students.length} em.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenCreateAchievement}
                    disabled={students.length === 0}
                    className="flex items-center justify-center gap-1.5 bg-[#00A19A] hover:bg-[#008c85] disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold shadow-md shadow-[#00A19A]/10 transition-all text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm Thành Tích
                  </button>
                </div>

                {/* Achievements created for this exam */}
                {currentExamAchievements.length > 0 && (
                  <div className="bg-teal-50/30 border-b border-teal-100/50 p-4 px-6 space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <Award className="w-4 h-4 text-[#00A19A]" />
                      Thành tích đã xếp giải ({currentExamAchievements.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {currentExamAchievements.map((ach) => (
                        <div key={ach.id} className="bg-white border border-teal-100 rounded-lg p-2 px-3 flex items-center justify-between gap-4 text-xs font-semibold shadow-xs">
                          <div>
                            <span className="text-[#00A19A] font-black">{ach.name}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md ml-2 font-bold uppercase">
                              {ach.type === 'CA_NHAN' ? 'Cá nhân' : `Đồng đội (${ach.studentIds.length} HS)`}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Mức: <strong className="text-slate-600">{LEVEL_LABELS[ach.level]}</strong> | GV: <strong className="text-slate-600">{ach.teacherName}</strong>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditAchievement(ach)}
                              className="p-1 hover:bg-slate-100 text-[#00A19A] rounded-md"
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAchievement(ach.id, ach.name)}
                              className="p-1 hover:bg-rose-50 text-rose-600 rounded-md"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Candidate list table */}
                {loadingStudents ? (
                  <div className="py-20 text-center text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent mx-auto mb-3"></div>
                    <p className="text-xs font-bold">Đang tải danh sách học sinh...</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-1">
                    <Users className="w-12 h-12 mx-auto opacity-15 mb-2" />
                    <h5 className="font-bold text-slate-600 text-sm">Chưa có học sinh đăng ký dự thi</h5>
                    <p className="text-xs max-w-xs mx-auto">Vui lòng đi qua tab "Đăng ký Dự thi" để xếp học sinh vào danh sách dự thi cho kỳ thi này.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-6 w-32">Mã HS</th>
                          <th className="py-3 px-6">Họ & Tên</th>
                          <th className="py-3 px-6 w-28">Lớp / Cơ sở</th>
                          <th className="py-3 px-6 w-28 text-center">Điểm số</th>
                          <th className="py-3 px-6">Giải thưởng / Huy chương đạt được</th>
                          <th className="py-3 px-6 w-24 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {students.map((student) => {
                          const isEditing = editingScoreId === student.id

                          return (
                            <tr key={student.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="py-3 px-6 font-mono text-slate-500">{student.studentCode}</td>
                              <td className="py-3 px-6">
                                <div className="font-bold text-slate-800">{student.studentName}</div>
                                <div className="text-[10px] text-slate-400 font-semibold">{student.gender}</div>
                              </td>
                              <td className="py-3 px-6">
                                <div className="font-bold text-slate-700">{student.className}</div>
                                <div className="text-[10px] text-slate-400 font-bold">{student.campusName}</div>
                              </td>
                              <td className="py-3 px-6 text-center">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editScoreForm.score}
                                    onChange={e => setEditScoreForm({ ...editScoreForm, score: e.target.value })}
                                    placeholder="Điểm số"
                                    className="w-16 border border-slate-200 rounded px-1.5 py-1 text-center text-xs font-bold outline-none focus:border-[#00A19A]"
                                  />
                                ) : (
                                  <span className={`px-2.5 py-1 rounded-md font-black ${
                                    student.score !== null ? 'bg-indigo-50 text-indigo-700 text-sm' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {student.score !== null ? student.score : "Chưa nhập"}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-6">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editScoreForm.notes}
                                    onChange={e => setEditScoreForm({ ...editScoreForm, notes: e.target.value })}
                                    placeholder="Nhập ghi chú thi..."
                                    className="w-full border border-slate-200 rounded px-2.5 py-1 text-xs font-semibold outline-none focus:border-[#00A19A]"
                                  />
                                ) : (
                                  <div className="space-y-1.5">
                                    {/* System structured achievements */}
                                    {student.achievements && student.achievements.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {student.achievements.map((ach: any) => (
                                          <span 
                                            key={ach.id} 
                                            className="inline-flex items-center gap-0.5 text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200/50 px-2 py-0.5 rounded"
                                            title={`GV bồi dưỡng: ${ach.teacherName}`}
                                          >
                                            <Award className="w-3 h-3 text-amber-600 fill-amber-500" />
                                            {ach.name} ({LEVEL_LABELS[ach.level]})
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">Chưa xếp giải</span>
                                    )}
                                    {/* Score notes if any */}
                                    {student.notes && (
                                      <div className="text-[10px] text-slate-400 bg-slate-50 p-1.5 rounded border border-slate-100 max-w-sm">
                                        Ghi chú: {student.notes}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-6 text-right">
                                {isEditing ? (
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => handleSaveScore(student.id)}
                                      disabled={savingScore}
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-all"
                                      title="Lưu"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingScoreId(null)}
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all"
                                      title="Hủy"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleStartEditScore(student)}
                                    className="p-1.5 hover:bg-slate-100 text-[#00A19A] rounded-lg transition-all"
                                    title="Nhập điểm & ghi chú"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
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
            )}
          </div>
        </div>
      )}

      {/* --- SUB TAB 2: REPORTS --- */}
      {subTab === 'reports' && (
        <div className="space-y-6">
          {/* Report Filters Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 no-print">
            <h3 className="text-slate-800 font-bold text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Search className="w-4.5 h-4.5 text-[#00A19A]" />
              Bộ lọc Báo cáo thành tích ({academicYears.find(y => y.id === yearId)?.name || 'Tất cả'})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              {/* Campus */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cơ sở</label>
                <select
                  value={reportFilter.campusId}
                  onChange={e => setReportFilter({ ...reportFilter, campusId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700 bg-slate-50/50"
                >
                  <option value="">-- Tất cả --</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>{c.campusName}</option>
                  ))}
                </select>
              </div>

              {/* Grade */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Khối</label>
                <select
                  value={reportFilter.grade}
                  onChange={e => setReportFilter({ ...reportFilter, grade: e.target.value, classId: "" })}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700 bg-slate-50/50"
                >
                  <option value="">-- Tất cả --</option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(g => (
                    <option key={g} value={g}>Khối {g}</option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Lớp học</label>
                <select
                  value={reportFilter.classId}
                  onChange={e => setReportFilter({ ...reportFilter, classId: e.target.value })}
                  disabled={!reportFilter.grade || !reportFilter.campusId}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700 bg-slate-50/50 disabled:opacity-50"
                >
                  <option value="">-- Tất cả --</option>
                  {classes
                    .filter(c => c.campusId === reportFilter.campusId && c.grade === reportFilter.grade && c.academicYearId === yearId)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.className}</option>
                    ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Loại thành tích</label>
                <select
                  value={reportFilter.category}
                  onChange={e => setReportFilter({ ...reportFilter, category: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700 bg-slate-50/50"
                >
                  <option value="">-- Tất cả --</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Level */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mức giải</label>
                <select
                  value={reportFilter.level}
                  onChange={e => setReportFilter({ ...reportFilter, level: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700 bg-slate-50/50"
                >
                  <option value="">-- Tất cả --</option>
                  {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Stats Summaries */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 no-print">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng thành tích</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{reportData.length}</div>
            </div>
            <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 shadow-xs">
              <div className="text-[10px] font-bold text-amber-800/60 uppercase tracking-wider">Nhất / Huy chương Vàng</div>
              <div className="text-2xl font-black text-amber-700 mt-1">{goldCount}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nhì / Huy chương Bạc</div>
              <div className="text-2xl font-black text-slate-700 mt-1">{silverCount}</div>
            </div>
            <div className="bg-orange-50/40 border border-orange-200/40 rounded-2xl p-4 shadow-xs">
              <div className="text-[10px] font-bold text-orange-800/60 uppercase tracking-wider">Ba / Huy chương Đồng</div>
              <div className="text-2xl font-black text-orange-700 mt-1">{bronzeCount}</div>
            </div>
            <div className="bg-teal-50/30 border border-teal-200/30 rounded-2xl p-4 shadow-xs">
              <div className="text-[10px] font-bold text-[#00A19A]/80 uppercase tracking-wider">Giải Khuyến khích</div>
              <div className="text-2xl font-black text-[#008c85] mt-1">{consolCount}</div>
            </div>
          </div>

          {/* Report Data Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden print-area">
            {/* Header print preview only */}
            <div className="hidden print-only py-8 text-center space-y-2 border-b border-slate-200 mb-6">
              <h2 className="text-xl font-bold text-slate-900 uppercase">HỆ THỐNG GIÁO DỤC SKY-LINE</h2>
              <h3 className="text-base font-bold text-slate-700 uppercase">BÁO CÁO THÀNH TÍCH HỌC SINH CHI TIẾT</h3>
              <p className="text-xs text-slate-500 font-semibold">
                Năm học: {academicYears.find(y => y.id === yearId)?.name || '---'} | Cơ sở: {campuses.find(c => c.id === reportFilter.campusId)?.campusName || 'Tất cả'}
              </p>
            </div>

            <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4 flex items-center justify-between no-print">
              <span className="font-bold text-slate-700 text-sm">Danh sách đạt giải ({reportData.length})</span>
              <div className="flex gap-2">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md shadow-emerald-600/10 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Xuất Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 bg-[#0A3230] hover:bg-[#061e1d] text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md shadow-slate-800/10 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  In / Xuất PDF
                </button>
              </div>
            </div>

            {loadingReport ? (
              <div className="py-20 text-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent mx-auto mb-3"></div>
                <p className="text-xs font-bold">Đang tổng hợp báo cáo...</p>
              </div>
            ) : reportData.length === 0 ? (
              <div className="py-20 text-center text-slate-400 space-y-1">
                <AlertCircle className="w-12 h-12 mx-auto opacity-15 mb-2" />
                <h5 className="font-bold text-slate-600 text-sm">Không tìm thấy thành tích nào</h5>
                <p className="text-xs">Thay đổi điều kiện lọc ở trên để xem kết quả.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-6 w-10">STT</th>
                      <th className="py-3 px-6 w-32">Mã HS</th>
                      <th className="py-3 px-6">Họ & Tên</th>
                      <th className="py-3 px-6 w-24">Lớp / Cơ sở</th>
                      <th className="py-3 px-6">Kỳ thi / Cuộc thi</th>
                      <th className="py-3 px-6">Thành tích đạt được</th>
                      <th className="py-3 px-6 w-28">Mức / Loại</th>
                      <th className="py-3 px-6">GV Bồi dưỡng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {reportData.map((row, idx) => (
                      <tr key={`${row.achievementId}-${row.studentId}`} className="hover:bg-slate-50/50 transition-all">
                        <td className="py-3 px-6 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-6 font-mono text-slate-500">{row.studentCode}</td>
                        <td className="py-3 px-6 font-bold text-slate-800">{row.studentName}</td>
                        <td className="py-3 px-6">
                          <div className="font-bold text-slate-700">{row.className}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{row.campusName}</div>
                        </td>
                        <td className="py-3 px-6 text-slate-600">{row.examName}</td>
                        <td className="py-3 px-6 text-[#00A19A] font-bold">{row.achievementName}</td>
                        <td className="py-3 px-6">
                          <div className="font-black text-amber-700">{LEVEL_LABELS[row.level] || row.level}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{CATEGORY_LABELS[row.category] || row.category} ({row.type === "CA_NHAN" ? "Cá nhân" : "Đồng đội"})</div>
                        </td>
                        <td className="py-3 px-6 text-slate-600">{row.teacherName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SUB TAB 3: PROFILES --- */}
      {subTab === 'profiles' && (
        <div className="space-y-6 max-w-4xl mx-auto no-print">
          {/* Profile lookup search bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-slate-800 font-bold text-sm flex items-center gap-1.5">
              <Search className="w-4.5 h-4.5 text-[#00A19A]" />
              Tra cứu hồ sơ thành tích cá nhân Học sinh
            </h3>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearchStudents(e.target.value)}
                placeholder="Nhập Mã học sinh hoặc Tên học sinh cần tra cứu..."
                className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700 shadow-sm"
              />
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>

            {/* Live Search dropdown results */}
            {searchResults.length > 0 && (
              <div className="border border-slate-100 rounded-xl bg-white shadow-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {searchResults.map(student => (
                  <button
                    key={student.id}
                    onClick={() => handleSelectStudentProfile(student.id)}
                    className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-all flex justify-between items-center text-xs font-semibold"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{student.studentName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Mã HS: {student.studentCode}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-600 font-bold">{student.className}</div>
                      <div className="text-[9px] text-slate-400 font-bold">{student.campusName}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.trim().length >= 2 && searchResults.length === 0 && !loadingSearch && (
              <p className="text-xs text-slate-400 italic">Không tìm thấy học sinh nào phù hợp.</p>
            )}
            {loadingSearch && (
              <p className="text-xs text-slate-400 animate-pulse font-semibold">Đang tìm kiếm...</p>
            )}
          </div>

          {/* Student Profile Card Display */}
          {loadingProfile ? (
            <div className="py-20 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent mx-auto mb-3"></div>
              <p className="text-xs font-bold">Đang tải hồ sơ học sinh...</p>
            </div>
          ) : selectedStudentProfile ? (
            <div className="space-y-6 animate-fade-in">
              {/* Candidate Bio Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-[#00A19A] flex-shrink-0">
                    <Users className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-800">{selectedStudentProfile.studentName}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-xs font-semibold">
                      <span className="font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold text-[10px]">
                        Mã HS: {selectedStudentProfile.studentCode}
                      </span>
                      <span>Giới tính: <strong>{selectedStudentProfile.gender}</strong></span>
                      {selectedStudentProfile.dateOfBirth && (
                        <span>Sinh ngày: <strong>{new Date(selectedStudentProfile.dateOfBirth).toLocaleDateString("vi-VN")}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right self-start md:self-center bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                  <div className="text-xs font-bold text-slate-700">Lớp hiện tại: <strong className="text-[#00A19A] font-black">{selectedStudentProfile.className}</strong></div>
                  <div className="text-[10px] text-slate-400 font-bold mt-0.5">{selectedStudentProfile.campusName}</div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">Năm học: {selectedStudentProfile.academicYearName}</div>
                </div>
              </div>

              {/* Achievements History */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4">
                  <span className="font-bold text-slate-800 text-sm">Hồ sơ Thành tích & Giải thưởng</span>
                </div>

                {selectedStudentProfile.achievements.length === 0 && selectedStudentProfile.exams.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-1">
                    <Award className="w-12 h-12 mx-auto opacity-10 mb-2" />
                    <h5 className="font-bold text-slate-600 text-sm">Học sinh chưa có thành tích</h5>
                    <p className="text-xs">Chưa có kết quả ghi nhận cho học sinh này trong hệ thống.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {/* Exam scores */}
                    {selectedStudentProfile.exams.length > 0 && (
                      <div className="p-6 space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Điểm số các kỳ thi đã tham gia</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedStudentProfile.exams.map((ex: any) => (
                            <div key={ex.examId} className="bg-slate-50/40 border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs font-semibold">
                              <div>
                                <div className="font-bold text-slate-700">{ex.examName}</div>
                                {ex.notes && <div className="text-[9px] text-slate-400 mt-0.5">{ex.notes}</div>}
                              </div>
                              <span className="bg-indigo-50 text-indigo-700 text-sm font-black px-2.5 py-1 rounded-lg">
                                {ex.score !== null ? `${ex.score} đ` : 'Chưa nhập'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Awards history */}
                    {selectedStudentProfile.achievements.length > 0 && (
                      <div className="p-6 space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Giải thưởng & Huy chương đạt được</h4>
                        <div className="space-y-3">
                          {selectedStudentProfile.achievements.map((ach: any) => (
                            <div key={ach.id} className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50/20 transition-all flex flex-col sm:flex-row justify-between gap-4 text-xs font-semibold">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                                    {LEVEL_LABELS[ach.level] || ach.level}
                                  </span>
                                  <h4 className="font-black text-sm text-slate-800">{ach.name}</h4>
                                </div>
                                <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4">
                                  <span>Kỳ thi: <strong className="text-slate-600">{ach.examName}</strong></span>
                                  <span>Loại: <strong className="text-slate-600">{CATEGORY_LABELS[ach.category]}</strong></span>
                                  <span>Hình thức: <strong className="text-slate-600">{ach.type === 'CA_NHAN' ? 'Cá nhân' : 'Đồng đội'}</strong></span>
                                </div>
                              </div>
                              <div className="sm:text-right space-y-0.5">
                                <div className="text-slate-500">GV bồi dưỡng: <strong className="text-[#00A19A] font-bold">{ach.teacherName}</strong></div>
                                <div className="text-[10px] text-slate-400 font-mono">Năm học: {ach.yearName}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
              <Award className="w-16 h-16 mx-auto opacity-10 mb-3" />
              <h4 className="font-bold text-slate-700">Chưa chọn Học sinh</h4>
              <p className="text-xs mt-1">Sử dụng ô tìm kiếm ở trên để tra cứu hồ sơ và lịch sử giải thưởng của học sinh.</p>
            </div>
          )}
        </div>
      )}

      {/* --- ADD / EDIT ACHIEVEMENT DIALOG MODAL --- */}
      {showAchievementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in no-print">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingAchievement ? "Cập Nhật Thành Tích" : "Thêm Thành Tích Mới"}
              </h3>
              <button 
                onClick={() => setShowAchievementModal(false)}
                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs font-semibold text-slate-700">
              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Tên thành tích <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={achievementForm.name}
                    onChange={e => setAchievementForm({ ...achievementForm, name: e.target.value })}
                    placeholder="Ví dụ: Giải Nhất, Huy chương Vàng, Giải Nhì Robocon..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-[#00A19A] outline-none font-semibold"
                  />
                </div>

                {/* Form Type */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hình thức</label>
                  <select
                    value={achievementForm.type}
                    onChange={e => setAchievementForm({ ...achievementForm, type: e.target.value, selectedStudentIds: [] })}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700 bg-slate-50/50"
                  >
                    <option value="CA_NHAN">Cá nhân</option>
                    <option value="DONG_DOI">Đồng đội (Nhóm)</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Loại thành tích</label>
                  <select
                    value={achievementForm.category}
                    onChange={e => setAchievementForm({ ...achievementForm, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700 bg-slate-50/50"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Level */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mức giải</label>
                  <select
                    value={achievementForm.level}
                    onChange={e => setAchievementForm({ ...achievementForm, level: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700 bg-slate-50/50"
                  >
                    {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Teacher Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Giáo viên bồi dưỡng</label>
                  <select
                    value={achievementForm.teacherId}
                    onChange={e => setAchievementForm({ ...achievementForm, teacherId: e.target.value, teacherName: "" })}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#00A19A] outline-none font-semibold text-slate-700 bg-slate-50/50"
                  >
                    <option value="">-- Chọn GV trong hệ thống --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.teacherName} ({t.teacherCode})</option>
                    ))}
                  </select>
                </div>

                {/* Manual Teacher Fallback */}
                {!achievementForm.teacherId && (
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hoặc nhập tay tên GV bồi dưỡng</label>
                    <input
                      type="text"
                      value={achievementForm.teacherName}
                      onChange={e => setAchievementForm({ ...achievementForm, teacherName: e.target.value })}
                      placeholder="Nhập tên giáo viên ngoài hệ thống..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-[#00A19A] outline-none font-semibold"
                    />
                  </div>
                )}
              </div>

              {/* Student checkboxes */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Chọn học sinh nhận giải <span className="text-red-500">*</span> 
                  {achievementForm.type === "CA_NHAN" ? " (Chọn tối đa 1 học sinh)" : " (Chọn nhiều học sinh)"}
                </label>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto bg-slate-50/20">
                  {students.map(s => {
                    const isChecked = achievementForm.selectedStudentIds.includes(s.id)

                    return (
                      <label 
                        key={s.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer select-none text-xs font-semibold"
                      >
                        <input
                          type={achievementForm.type === 'CA_NHAN' ? 'radio' : 'checkbox'}
                          name="selected_students"
                          checked={isChecked}
                          onChange={() => {
                            if (achievementForm.type === 'CA_NHAN') {
                              setAchievementForm({ ...achievementForm, selectedStudentIds: [s.id] })
                            } else {
                              if (isChecked) {
                                setAchievementForm({
                                  ...achievementForm,
                                  selectedStudentIds: achievementForm.selectedStudentIds.filter(id => id !== s.id)
                                })
                              } else {
                                setAchievementForm({
                                  ...achievementForm,
                                  selectedStudentIds: [...achievementForm.selectedStudentIds, s.id]
                                })
                              }
                            }
                          }}
                          className="rounded text-[#00A19A] focus:ring-[#00A19A]"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-slate-800">{s.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Lớp: {s.className} | Mã: {s.studentCode}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50/70 border-t border-slate-100 px-6 py-4 flex justify-end gap-2.5">
              <button
                onClick={() => setShowAchievementModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveAchievement}
                disabled={savingAchievement}
                className="bg-[#00A19A] hover:bg-[#008c85] disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold shadow-lg shadow-[#00A19A]/15 transition-all text-xs"
              >
                {savingAchievement ? "Đang lưu..." : "Lưu Kết Quả"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled Print Layout CSS */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-area {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #ddd !important;
            padding: 8px !important;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>
    </div>
  )
}
