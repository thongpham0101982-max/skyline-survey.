"use client"
import { useState, useEffect, useMemo } from "react"
import { 
  Award, Search, Calendar, MapPin, Users, Edit3, Check, X, 
  Trash2, Plus, FileSpreadsheet, Printer, Download, Eye, BookOpen, AlertCircle, UserCheck,
  Trophy, Medal, Ribbon, Sparkles
} from "lucide-react"
import * as XLSX from "xlsx"
import { 
  saveExamResultsGridAction,
  getStudentsWithResultsAction,
  getAchievementsReportAction,
  getStudentProfileWithAchievementsAction,
  searchStudentsByNameOrCodeAction,
  getStudentsByClassAction
} from "./actions"

interface ResultsClientProps {
  exams: any[]
  academicYears: any[]
  teachers: any[]
  campuses: any[]
  classes: any[]
  achievementCategories: any[]
  achievementLevels: any[]
}



export function ResultsClient({ 
  exams, 
  academicYears, 
  teachers, 
  campuses, 
  classes,
  achievementCategories,
  achievementLevels
}: ResultsClientProps) {
  const CATEGORY_LABELS = useMemo(() => {
    const labels: Record<string, string> = {}
    achievementCategories.forEach((c) => {
      labels[c.code] = c.name
    })
    return labels
  }, [achievementCategories])

  const LEVEL_LABELS = useMemo(() => {
    const labels: Record<string, string> = {}
    achievementLevels.forEach((l) => {
      labels[l.code] = l.name
    })
    return labels
  }, [achievementLevels])
  // Academic Year State
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

  const [subTab, setSubTab] = useState<'input' | 'reports' | 'profiles'>('input')

  // --- Sub-Tab 1: Excel Grid State ---
  const [selectedExamId, setSelectedExamId] = useState("")
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [gridRows, setGridRows] = useState<any[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [savingGrid, setSavingGrid] = useState(false)

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
  const [viewGroup, setViewGroup] = useState<'exam' | 'category'>('exam')

  // Class lookup for profiles state
  const [profileCampusId, setProfileCampusId] = useState("")
  const [profileGrade, setProfileGrade] = useState("")
  const [profileClassId, setProfileClassId] = useState("")
  const [classStudents, setClassStudents] = useState<any[]>([])
  const [loadingClassStudents, setLoadingClassStudents] = useState(false)

  // Effect to load students when class changes
  useEffect(() => {
    const fetchClassStudents = async () => {
      if (!profileClassId) {
        setClassStudents([])
        return
      }
      setLoadingClassStudents(true)
      try {
        const data = await getStudentsByClassAction(profileClassId)
        setClassStudents(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingClassStudents(false)
      }
    }
    fetchClassStudents()
  }, [profileClassId])

  const filteredExams = useMemo(() => {
    return exams.filter(e => e.academicYearId === yearId)
  }, [exams, yearId])
  const currentExam = exams.find(e => e.id === selectedExamId)

  // Auto-select exam
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const queryExamId = urlParams.get("examId")
      if (queryExamId && exams.some(e => e.id === queryExamId)) {
        setSelectedExamId(queryExamId)
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }
    }

    if (filteredExams.length > 0) {
      if (!filteredExams.some(e => e.id === selectedExamId)) {
        setSelectedExamId(filteredExams[0].id)
      }
    } else {
      if (selectedExamId !== "") {
        setSelectedExamId("")
      }
      if (gridRows.length > 0) {
        setGridRows([])
      }
      if (hasChanges) {
        setHasChanges(false)
      }
    }
  }, [filteredExams, yearId, selectedExamId, gridRows.length, hasChanges, exams])

  // Fetch students
  const loadExamStudents = async () => {
    if (!selectedExamId) return
    setLoadingStudents(true)
    try {
      const data = await getStudentsWithResultsAction(selectedExamId)
      
      const rows = data.map((s, idx) => ({
        gridRowId: s.achievementId || `temp-${s.id}-${idx}-${Math.random()}`,
        studentId: s.id,
        studentCode: s.studentCode,
        studentName: s.studentName,
        gender: s.gender,
        className: s.className,
        campusName: s.campusName,
        achievementId: s.achievementId,
        name: s.achievementName || "",
        type: s.type || "CA_NHAN",
        category: s.category || "",
        level: s.level || "",
        teacherId: s.teacherId || "",
        teacherName: s.teacherName || ""
      }))

      setGridRows(rows)
      setHasChanges(false)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStudents(false)
    }
  }

  useEffect(() => {
    loadExamStudents()
  }, [selectedExamId])

  // Cell change handler
  const handleCellChange = (gridRowId: string, field: string, value: any) => {
    setHasChanges(true)
    setGridRows(prev => prev.map(row => {
      if (row.gridRowId !== gridRowId) return row

      const updatedRow = { ...row, [field]: value }

      if (field === "category") {
        updatedRow.level = ""
        updatedRow.name = ""
      } else if (field === "level") {
        const cat = row.category
        const lvl = value

        if (cat === "" || lvl === "") {
          updatedRow.name = ""
        } else if (row.name === "" || row.name === getAutoName(row.category, row.level) || row.name === getAutoName(cat, lvl)) {
          updatedRow.name = getAutoName(cat, lvl)
        }
      }

      return updatedRow
    }))
  }

  const handleAddRow = (studentId: string, index: number) => {
    setHasChanges(true)
    setGridRows(prev => {
      const newRows = [...prev]
      const parentRow = prev.find(r => r.studentId === studentId)
      if (!parentRow) return prev

      const newRow = {
        gridRowId: `temp-${studentId}-${Date.now()}-${Math.random()}`,
        studentId: parentRow.studentId,
        studentCode: parentRow.studentCode,
        studentName: parentRow.studentName,
        gender: parentRow.gender,
        className: parentRow.className,
        campusName: parentRow.campusName,
        achievementId: null,
        name: "",
        type: "CA_NHAN",
        category: "",
        level: "",
        teacherId: "",
        teacherName: ""
      }

      let lastIndex = index
      for (let i = index + 1; i < newRows.length; i++) {
        if (newRows[i].studentId === studentId) {
          lastIndex = i
        } else {
          break
        }
      }
      newRows.splice(lastIndex + 1, 0, newRow)
      return newRows
    })
  }

  const handleRemoveRow = (gridRowId: string, studentId: string) => {
    setHasChanges(true)
    setGridRows(prev => {
      const studentRowsCount = prev.filter(r => r.studentId === studentId).length
      if (studentRowsCount <= 1) {
        return prev.map(r => {
          if (r.gridRowId !== gridRowId) return r
          return {
            ...r,
            achievementId: null,
            name: "",
            type: "CA_NHAN",
            category: "",
            level: "",
            teacherId: "",
            teacherName: ""
          }
        })
      }
      return prev.filter(r => r.gridRowId !== gridRowId)
    })
  }

  const getAutoName = (cat: string, lvl: string) => {
    if (!cat || !lvl) return ""
    return LEVEL_LABELS[lvl] || ""
  }

  // Save grid
  const handleSaveGrid = async () => {
    if (!selectedExamId) return
    setSavingGrid(true)

    const invalidRow = gridRows.find(r => r.category !== "" && r.level !== "" && r.name.trim() === "")
    if (invalidRow) {
      alert(`Vui lòng nhập Tên thành tích cho học sinh ${invalidRow.studentName}!`)
      setSavingGrid(false)
      return
    }

    try {
      const rowsPayload = gridRows.map(r => ({
        studentId: r.studentId,
        name: r.name,
        type: r.type,
        category: r.category,
        level: r.level,
        teacherId: r.teacherId || null,
        teacherName: r.teacherId ? (teachers.find(t => t.id === r.teacherId)?.teacherName || null) : (r.teacherName || null)
      }))

      await saveExamResultsGridAction(selectedExamId, yearId, rowsPayload)
      setHasChanges(false)
      alert("Đã lưu toàn bộ thành tích thành công!")
      loadExamStudents()
    } catch (e) {
      alert("Lỗi khi lưu thành tích!")
    } finally {
      setSavingGrid(false)
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
      alert("Lỗi khi tải báo cáo!")
    } finally {
      setLoadingReport(false)
    }
  }

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
              ? 'border-[#00A99D] text-[#00A99D]' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          Nhập Kết quả & Thành tích (UI Excel)
        </button>
        <button
          onClick={() => setSubTab('reports')}
          className={`pb-3 text-xs font-black transition-all border-b-2 px-4 flex items-center gap-1.5 ${
            subTab === 'reports' 
              ? 'border-[#00A99D] text-[#00A99D]' 
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
              ? 'border-[#00A99D] text-[#00A99D]' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Hồ sơ thành tích Học sinh
        </button>
      </div>

      {/* --- SUB TAB 1: EXCEL INPUT --- */}
      {subTab === 'input' && (
        <div className="space-y-4 no-print">
          {/* Top Horizontal Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
                <div className="w-full sm:w-80 flex flex-col gap-1.5 flex-shrink-0">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chọn Kỳ Thi để nhập thành tích</label>
                  {filteredExams.length === 0 ? (
                    <p className="text-xs font-semibold text-slate-400">Không có kỳ thi nào trong năm học này.</p>
                  ) : (
                    <select
                      value={selectedExamId}
                      onChange={e => {
                        if (hasChanges && !confirm("Bạn có thay đổi chưa lưu! Rời đi sẽ làm mất dữ liệu. Tiếp tục?")) {
                          return
                        }
                        setSelectedExamId(e.target.value)
                      }}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:border-[#00A99D] outline-none font-black text-slate-700 bg-slate-50/50"
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
                  <div className="flex flex-wrap gap-2 items-center pt-2 sm:pt-4">
                    <span className="text-[10px] font-bold bg-[#00A99D]/10 text-[#00A99D] px-2.5 py-1 rounded-md border border-[#00A99D]/20">
                      Cấp học: <strong className="font-extrabold">{currentExam?.grade || "Tất cả"}</strong>
                    </span>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100">
                      Danh mục: <strong className="font-extrabold">{currentExam?.category?.name || "N/A"}</strong>
                    </span>
                    {currentExam?.startDate && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
                        Bắt đầu: {new Date(currentExam.startDate).toLocaleDateString("vi-VN")}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                {hasChanges && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200/50 px-2.5 py-1.5 rounded-lg font-bold animate-pulse">
                    Có thay đổi chưa lưu
                  </span>
                )}
                <button
                  onClick={handleSaveGrid}
                  disabled={savingGrid || gridRows.length === 0 || !hasChanges}
                  className="flex items-center gap-1.5 bg-[#00A99D] hover:bg-[#009085] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-[#00A99D]/15 transition-all text-xs"
                >
                  <Check className="w-4 h-4" />
                  {savingGrid ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Card: Excel Grid Table */}
          {selectedExamId && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4">
                <h3 className="font-bold text-slate-800 text-sm">
                  Bảng Thành Tích Kỳ Thi: {currentExam?.name}
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Tổng số học sinh đăng ký dự thi: <strong className="text-slate-700">{new Set(gridRows.map(r => r.studentId)).size}</strong> em. Nhập thông tin trực tiếp vào ô tương ứng.
                </p>
              </div>

              {/* Table Grid Wrapper with custom scrollbar */}
              {loadingStudents ? (
                <div className="py-20 text-center text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent mx-auto mb-3"></div>
                  <p className="text-xs font-bold">Đang tải bảng thành tích học sinh...</p>
                </div>
              ) : gridRows.length === 0 ? (
                <div className="py-20 text-center text-slate-400 space-y-1">
                  <Users className="w-12 h-12 mx-auto opacity-15 mb-2" />
                  <h5 className="font-bold text-slate-600 text-sm">Chưa có học sinh đăng ký dự thi</h5>
                  <p className="text-xs max-w-xs mx-auto">Vui lòng đi qua tab "Đăng ký Dự thi" để xếp học sinh vào danh sách dự thi cho kỳ thi này.</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4 w-12 text-center">STT</th>
                        <th className="py-3 px-4 w-32 min-w-[110px]">Mã HS</th>
                        <th className="py-3 px-4 w-56 min-w-[180px]">Họ & Tên</th>
                        <th className="py-3 px-4 w-24 min-w-[80px]">Lớp</th>
                        <th className="py-3 px-4 w-32 min-w-[115px]">Hình thức</th>
                        <th className="py-3 px-4 w-36 min-w-[130px]">Loại giải</th>
                        <th className="py-3 px-4 w-36 min-w-[130px]">Mức giải</th>
                        <th className="py-3 px-4 min-w-[280px]">Tên giải thưởng / Huy chương</th>
                        <th className="py-3 px-4 w-64 min-w-[220px]">GV Bồi dưỡng</th>
                        <th className="py-3 px-4 w-28 min-w-[100px] text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                      {gridRows.map((row, idx) => {
                        const hasAward = row.category !== "" && row.level !== ""

                        return (
                          <tr key={row.gridRowId} className={`hover:bg-slate-50/50 transition-all ${
                            hasAward ? 'bg-amber-50/20' : ''
                          }`}>
                            {/* STT */}
                            <td className="py-2.5 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                            
                            {/* Mã HS */}
                            <td className="py-2.5 px-4 font-mono text-slate-500">{row.studentCode}</td>
                            
                            {/* Tên */}
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-slate-800">{row.studentName}</div>
                              <div className="text-[9px] text-slate-400 font-bold">{row.campusName}</div>
                            </td>
                            
                            {/* Lớp */}
                            <td className="py-2.5 px-4 text-slate-600 font-bold">{row.className}</td>
                            
                            {/* Hình thức */}
                            <td className="py-2.5 px-4">
                              <select
                                value={row.type}
                                onChange={e => handleCellChange(row.gridRowId, "type", e.target.value)}
                                className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs outline-none bg-white focus:border-[#00A99D] transition-colors"
                              >
                                <option value="CA_NHAN">Cá nhân</option>
                                <option value="DONG_DOI">Đồng đội</option>
                              </select>
                            </td>
                            
                            {/* Loại giải */}
                            <td className="py-2.5 px-4">
                              <select
                                value={row.category}
                                onChange={e => handleCellChange(row.gridRowId, "category", e.target.value)}
                                className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs outline-none bg-white focus:border-[#00A99D] transition-colors"
                              >
                                <option value="">-- Không giải --</option>
                                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                                  <option key={k} value={k}>{v}</option>
                                ))}
                              </select>
                            </td>
                            
                            {/* Mức giải */}
                            <td className="py-2.5 px-4">
                              <select
                                value={row.level}
                                onChange={e => handleCellChange(row.gridRowId, "level", e.target.value)}
                                disabled={row.category === ""}
                                className="w-full border border-slate-200 disabled:opacity-50 disabled:bg-slate-50/50 rounded px-1.5 py-1 text-xs outline-none bg-white focus:border-[#00A99D] transition-colors"
                              >
                                <option value="">-- Không --</option>
                                {(() => {
                                  const catObj = achievementCategories.find((c) => c.code === row.category)
                                  const filtered = catObj ? achievementLevels.filter((l) => l.categoryId === catObj.id) : []
                                  return filtered.map((lvl) => (
                                    <option key={lvl.code} value={lvl.code}>{lvl.name}</option>
                                  ))
                                })()}
                              </select>
                            </td>
                            
                            {/* Tên thành tích */}
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                value={row.name}
                                onChange={e => handleCellChange(row.gridRowId, "name", e.target.value)}
                                disabled={row.category === "" || row.level === ""}
                                placeholder="Tự sinh nếu để trống..."
                                className="w-full border border-slate-200 disabled:bg-slate-50/50 rounded px-2.5 py-1 text-xs outline-none focus:border-[#00A99D] font-semibold text-slate-800 transition-all"
                              />
                            </td>
                            
                            {/* GV Bồi dưỡng */}
                            <td className="py-2.5 px-4">
                              <div className="space-y-1">
                                <select
                                  value={row.teacherId}
                                  onChange={e => {
                                    handleCellChange(row.gridRowId, "teacherId", e.target.value)
                                    if (e.target.value !== "") {
                                      handleCellChange(row.gridRowId, "teacherName", "")
                                    }
                                  }}
                                  disabled={row.category === "" || row.level === ""}
                                  className="w-full border border-slate-200 disabled:bg-slate-50/50 rounded px-1.5 py-1 text-xs outline-none bg-white focus:border-[#00A99D] transition-colors"
                                >
                                  <option value="">-- Chọn GV hệ thống --</option>
                                  {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.teacherName}</option>
                                  ))}
                                  <option value="KHAC">Khác (Nhập tay...)</option>
                                </select>

                                {(row.teacherId === "KHAC" || (!row.teacherId && row.teacherName)) && (
                                  <input
                                    type="text"
                                    value={row.teacherName}
                                    onChange={e => handleCellChange(row.gridRowId, "teacherName", e.target.value)}
                                    disabled={row.category === "" || row.level === ""}
                                    placeholder="Nhập tên GV..."
                                    className="w-full border border-slate-200 disabled:bg-slate-50/50 rounded px-2.5 py-1 text-xs outline-none focus:border-[#00A99D] font-semibold text-slate-800 transition-all"
                                  />
                                )}
                              </div>
                            </td>
                            {/* Thao tác */}
                            <td className="py-2.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAddRow(row.studentId, idx)}
                                  title="Thêm thành tích/môn thi khác cho học sinh này"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-transparent hover:border-emerald-200 transition-all cursor-pointer"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                
                                {(gridRows.filter(r => r.studentId === row.studentId).length > 1 || row.category !== "" || row.level !== "") && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRow(row.gridRowId, row.studentId)}
                                    title="Xóa giải này"
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
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
      )}

      {/* --- SUB TAB 2: REPORTS --- */}
      {subTab === 'reports' && (
        <div className="space-y-6">
          {/* Report Filters Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 no-print animate-fade-in">
            <h3 className="text-slate-800 font-bold text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Search className="w-4.5 h-4.5 text-[#00A99D]" />
              Bộ lọc Báo cáo thành tích ({academicYears.find(y => y.id === yearId)?.name || 'Tất cả'})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cơ sở</label>
                <select
                  value={reportFilter.campusId}
                  onChange={e => setReportFilter({ ...reportFilter, campusId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#00A99D] outline-none font-semibold text-slate-700 bg-slate-50/50"
                >
                  <option value="">-- Tất cả --</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>{c.campusName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Khối</label>
                <select
                  value={reportFilter.grade}
                  onChange={e => setReportFilter({ ...reportFilter, grade: e.target.value, classId: "" })}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#00A99D] outline-none font-semibold text-slate-700 bg-slate-50/50"
                >
                  <option value="">-- Tất cả --</option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(g => (
                    <option key={g} value={g}>Khối {g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Lớp học</label>
                <select
                  value={reportFilter.classId}
                  onChange={e => setReportFilter({ ...reportFilter, classId: e.target.value })}
                  disabled={!reportFilter.grade || !reportFilter.campusId}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#00A99D] outline-none font-semibold text-slate-700 bg-slate-50/50 disabled:opacity-50"
                >
                  <option value="">-- Tất cả --</option>
                  {classes
                    .filter(c => c.campusId === reportFilter.campusId && c.grade === reportFilter.grade && c.academicYearId === yearId)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.className}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Loại thành tích</label>
                <select
                  value={reportFilter.category}
                  onChange={e => setReportFilter({ ...reportFilter, category: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#00A99D] outline-none font-semibold text-slate-700 bg-slate-50/50"
                >
                  <option value="">-- Tất cả --</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mức giải</label>
                <select
                  value={reportFilter.level}
                  onChange={e => setReportFilter({ ...reportFilter, level: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#00A99D] outline-none font-semibold text-slate-700 bg-slate-50/50"
                >
                  <option value="">-- Tất cả --</option>
                  {(() => {
                    const catObj = achievementCategories.find((c) => c.code === reportFilter.category)
                    const filtered = catObj ? achievementLevels.filter((l) => l.categoryId === catObj.id) : achievementLevels
                    return filtered.map((lvl) => (
                      <option key={lvl.code} value={lvl.code}>{lvl.name}</option>
                    ))
                  })()}
                </select>
              </div>
            </div>
          </div>

          {/* Stats Summaries */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 no-print animate-fade-in">
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
              <div className="text-[10px] font-bold text-[#00A99D]/80 uppercase tracking-wider">Giải Khuyến khích</div>
              <div className="text-2xl font-black text-[#009085] mt-1">{consolCount}</div>
            </div>
          </div>

          {/* Report Data Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden print-area animate-fade-in">
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
                  className="flex items-center gap-1 bg-[#003B3A] hover:bg-[#061e1d] text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md shadow-slate-800/10 transition-all"
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
                        <td className="py-3 px-6 text-[#00A99D] font-bold">{row.achievementName}</td>
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
      {subTab === 'profiles' && (() => {
        // Grouping logic based on viewGroup state
        const achievementsByExam = {};
        const achievementsByCategory = {};
        
        if (selectedStudentProfile && selectedStudentProfile.achievements) {
          selectedStudentProfile.achievements.forEach((ach) => {
            // Group by Exam
            const exam = ach.examName || "Ngoài hệ thống / Kỳ thi khác";
            if (!achievementsByExam[exam]) {
              achievementsByExam[exam] = [];
            }
            achievementsByExam[exam].push(ach);
            
            // Group by Category (Lĩnh vực của kỳ thi)
            const field = ach.examCategoryName || "Khác";
            if (!achievementsByCategory[field]) {
              achievementsByCategory[field] = [];
            }
            achievementsByCategory[field].push(ach);
          });
        }

        // Helper to get styled badge details
        const getAwardIconAndStyle = (category, level) => {
          let bgClass = "bg-amber-50";
          let textClass = "text-amber-700";
          let borderClass = "border-amber-200/60";
          let gradientClass = "from-amber-400 to-amber-600 text-white";
          let glowClass = "shadow-amber-500/20";
          let badgeName = "Giải thưởng";
          let IconComponent = Award;

          if (category === "HUY_CHUONG") {
            IconComponent = Medal;
            if (level === "VANG") {
              badgeName = "Huy chương Vàng";
              gradientClass = "from-amber-300 via-yellow-400 to-amber-500 text-amber-950";
              glowClass = "shadow-yellow-500/30";
              bgClass = "bg-amber-50";
              textClass = "text-amber-700";
              borderClass = "border-yellow-200";
              IconComponent = Trophy;
            } else if (level === "BAC") {
              badgeName = "Huy chương Bạc";
              gradientClass = "from-slate-200 via-slate-100 to-slate-400 text-slate-800";
              glowClass = "shadow-slate-400/20";
              bgClass = "bg-slate-50";
              textClass = "text-slate-700";
              borderClass = "border-slate-300/60";
            } else if (level === "DONG") {
              badgeName = "Huy chương Đồng";
              gradientClass = "from-amber-600 via-orange-400 to-amber-700 text-white";
              glowClass = "shadow-orange-500/20";
              bgClass = "bg-orange-50/50";
              textClass = "text-orange-800";
              borderClass = "border-orange-200";
            } else {
              badgeName = "Huy chương";
              gradientClass = "from-teal-400 to-teal-600 text-white";
              glowClass = "shadow-teal-500/20";
              bgClass = "bg-teal-50";
              textClass = "text-teal-700";
              borderClass = "border-teal-200";
            }
          } else if (category === "GIAI_THUONG") {
            if (level === "NHAT") {
              badgeName = "Giải Nhất";
              gradientClass = "from-red-400 via-rose-500 to-red-600 text-white";
              glowClass = "shadow-rose-500/30";
              bgClass = "bg-red-50";
              textClass = "text-red-700";
              borderClass = "border-red-200";
              IconComponent = Trophy;
            } else if (level === "NHI") {
              badgeName = "Giải Nhì";
              gradientClass = "from-blue-400 via-indigo-500 to-blue-600 text-white";
              glowClass = "shadow-blue-500/20";
              bgClass = "bg-blue-50";
              textClass = "text-blue-700";
              borderClass = "border-blue-200";
              IconComponent = Medal;
            } else if (level === "BA") {
              badgeName = "Giải Ba";
              gradientClass = "from-emerald-400 via-teal-500 to-emerald-600 text-white";
              glowClass = "shadow-emerald-500/20";
              bgClass = "bg-emerald-50";
              textClass = "text-[#009085]";
              borderClass = "border-emerald-200";
              IconComponent = Medal;
            } else if (level === "KHUYEN_KHICH") {
              badgeName = "Giải Khuyến khích";
              gradientClass = "from-purple-400 via-fuchsia-500 to-purple-600 text-white";
              glowClass = "shadow-purple-500/20";
              bgClass = "bg-purple-50";
              textClass = "text-purple-700";
              borderClass = "border-purple-200";
              IconComponent = Ribbon;
            } else {
              badgeName = "Giải thưởng";
              gradientClass = "from-indigo-400 to-indigo-600 text-white";
              glowClass = "shadow-indigo-500/20";
              bgClass = "bg-indigo-50";
              textClass = "text-indigo-700";
              borderClass = "border-indigo-200";
              IconComponent = Award;
            }
          } else if (category === "CHUNG_NHAN") {
            badgeName = "Chứng nhận";
            gradientClass = "from-sky-300 via-cyan-400 to-sky-500 text-white";
            glowClass = "shadow-sky-400/20";
            bgClass = "bg-sky-50/50";
            textClass = "text-sky-700";
            borderClass = "border-sky-200";
            IconComponent = Ribbon;
          } else {
            badgeName = "Khác";
            gradientClass = "from-slate-400 to-slate-500 text-white";
            glowClass = "shadow-slate-400/10";
            bgClass = "bg-slate-50";
            textClass = "text-slate-600";
            borderClass = "border-slate-200";
            IconComponent = Award;
          }

          return { bgClass, textClass, borderClass, badgeName, gradientClass, glowClass, IconComponent };
        };

        const renderAchievementCard = (ach) => {
          const style = getAwardIconAndStyle(ach.category, ach.level);
          const IconComponent = style.IconComponent;
          return (
            <div 
              key={ach.id} 
              className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-[#00A99D]/40 transition-all duration-300 flex items-start gap-4 shadow-sm hover:shadow-md relative overflow-hidden group shine-effect"
            >
              {/* Shine glow decoration */}
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${style.gradientClass} opacity-5 blur-xl group-hover:opacity-10 transition-opacity pointer-events-none`} />

              {/* Beautiful Award Icon Container */}
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${style.gradientClass} flex items-center justify-center ${style.glowClass} shadow-lg flex-shrink-0 border border-black/5 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                <IconComponent className="w-6 h-6 drop-shadow-sm text-white" />
              </div>

              <div className="flex-1 min-w-0 space-y-1 z-10">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase border ${style.bgClass} ${style.textClass} ${style.borderClass}`}>
                    {style.badgeName}
                  </span>
                  {ach.type === 'DONG_DOI' && (
                    <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black bg-teal-50 text-[#009085] border border-teal-200/50 tracking-wider uppercase flex items-center gap-0.5">
                      <Users className="w-3 h-3" /> Đồng đội
                    </span>
                  )}
                  {/* Category / Lĩnh vực Badge */}
                  <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/50 tracking-wider uppercase">
                    {ach.examCategoryName || "Chung"}
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-800 leading-snug group-hover:text-[#00A99D] transition-colors">Giải thưởng: {ach.name.includes(" - ") ? ach.name.split(" - ")[0] : (ach.name || style.badgeName)}</h4>
                
                {/* Secondary group metadata if grouped by Category */}
                {viewGroup === 'category' && (
                  <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit">
                    <Sparkles className="w-3 h-3 text-[#00A99D]" /> {ach.examName}
                  </p>
                )}

                <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-0.5 pt-0.5">
                  <span>GV bồi dưỡng: <strong className="text-[#00A99D] font-bold">{ach.teacherName}</strong></span>
                  <span>Năm học: <strong className="text-slate-500 font-mono">{ach.yearName}</strong></span>
                </div>
              </div>
            </div>
          );
        };

        const renderGroupedContent = () => {
          const groupedData = viewGroup === 'exam' ? achievementsByExam : achievementsByCategory;
          const noData = Object.keys(groupedData).length === 0;

          if (noData) {
            return (
              <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center text-slate-400 space-y-1 shadow-xs">
                <Award className="w-12 h-12 mx-auto opacity-10 mb-2" />
                <h5 className="font-bold text-slate-600 text-sm">Chưa có thành tích trong nhóm này</h5>
                <p className="text-xs">Chưa có kết quả ghi nhận phù hợp trong hệ thống.</p>
              </div>
            );
          }

          return (
            <div className="space-y-6">
              {Object.entries(groupedData).map(([groupName, achList]: [string, any[]]) => (
                <div key={groupName} className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs animate-fade-in hover:shadow-md transition-all duration-300">
                  {/* Group Header */}
                  <div className="bg-slate-50/80 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-teal-50 text-[#00A99D] rounded-xl flex items-center justify-center border border-teal-100/50">
                        {viewGroup === 'exam' ? (
                          <Sparkles className="w-4 h-4" />
                        ) : (
                          <Award className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-xs sm:text-sm">{groupName}</h4>
                        <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          {viewGroup === 'exam' ? 'Kỳ thi học sinh' : 'Lĩnh vực thành tích'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black bg-[#00A99D]/10 text-[#00A99D] px-2.5 py-1 rounded-lg border border-[#00A99D]/20 uppercase">
                      {achList.length} giải thưởng
                    </span>
                  </div>

                  {/* Achievements Grid */}
                  <div className="p-5 bg-slate-50/20 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achList.map((ach) => renderAchievementCard(ach))}
                  </div>
                </div>
              ))}
            </div>
          );
        };

        return (
          <div className="space-y-6 max-w-4xl mx-auto no-print animate-fade-in">
            {/* Lookup Card with 2 Options: Quick search vs Class browse */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <h3 className="text-slate-800 font-bold text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <Search className="w-4.5 h-4.5 text-[#00A99D]" />
                Tra cứu hồ sơ thành tích cá nhân Học sinh
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Option 1: Quick Search */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cách 1: Tìm nhanh bằng Mã hoặc Tên</h4>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        handleSearchStudents(e.target.value);
                        // Reset class browsing when quick searching
                        setProfileCampusId("");
                        setProfileGrade("");
                        setProfileClassId("");
                        setClassStudents([]);
                      }}
                      placeholder="Nhập Mã học sinh hoặc Tên học sinh..."
                      className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-[#00A99D] outline-none font-semibold text-slate-700 shadow-sm bg-slate-50/20"
                    />
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  </div>

                  {/* Live Search dropdown results */}
                  {searchResults.length > 0 && (
                    <div className="border border-slate-100 rounded-xl bg-white shadow-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {searchResults.map(student => (
                        <button
                          key={student.id}
                          onClick={() => {
                            handleSelectStudentProfile(student.id);
                            setSearchResults([]);
                            setSearchQuery("");
                          }}
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

                {/* Option 2: Browse by Class */}
                <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-6">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cách 2: Chọn học sinh theo Lớp học</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cơ sở</label>
                      <select
                        value={profileCampusId}
                        onChange={e => {
                          setProfileCampusId(e.target.value);
                          setProfileClassId("");
                          setClassStudents([]);
                        }}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] focus:border-[#00A99D] outline-none font-semibold text-slate-700 bg-slate-50/50"
                      >
                        <option value="">-- Cơ sở --</option>
                        {campuses.map(c => (
                          <option key={c.id} value={c.id}>{c.campusName}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Khối</label>
                      <select
                        value={profileGrade}
                        onChange={e => {
                          setProfileGrade(e.target.value);
                          setProfileClassId("");
                          setClassStudents([]);
                        }}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] focus:border-[#00A99D] outline-none font-semibold text-slate-700 bg-slate-50/50"
                      >
                        <option value="">-- Khối --</option>
                        {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(g => (
                          <option key={g} value={g}>Khối {g}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lớp</label>
                      <select
                        value={profileClassId}
                        onChange={e => setProfileClassId(e.target.value)}
                        disabled={!profileCampusId || !profileGrade}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] focus:border-[#00A99D] outline-none font-semibold text-slate-700 bg-slate-50/50 disabled:opacity-50"
                      >
                        <option value="">-- Lớp --</option>
                        {classes
                          .filter(c => c.campusId === profileCampusId && c.grade === profileGrade && c.academicYearId === yearId)
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.className}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {profileClassId && (
                    <div className="pt-3 border-t border-slate-100 animate-fade-in">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Danh sách học sinh của lớp ({classStudents.length})</label>
                      {loadingClassStudents ? (
                        <p className="text-[11px] text-slate-400 animate-pulse py-2">Đang tải danh sách học sinh...</p>
                      ) : classStudents.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-2">Không có học sinh trong lớp này.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                          {classStudents.map(student => (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => handleSelectStudentProfile(student.id)}
                              className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between text-xs font-semibold ${
                                selectedStudentProfile?.id === student.id 
                                  ? 'bg-[#E6F6F5] border-[#00A99D] text-[#00A99D]' 
                                  : 'bg-slate-50/50 hover:bg-slate-100/50 border-slate-200/60 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] uppercase ${
                                  selectedStudentProfile?.id === student.id ? 'bg-[#00A99D] text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {student.studentName.split(" ").pop()?.charAt(0) || "HS"}
                                </div>
                                <div className="truncate max-w-[150px]">
                                  <div className="font-bold truncate">{student.studentName}</div>
                                  <div className="text-[9px] text-slate-400 font-mono">Mã: {student.studentCode}</div>
                                </div>
                              </div>
                              <span className="text-[9px] font-bold bg-white/80 border border-slate-100 px-1.5 py-0.5 rounded text-slate-400">
                                {student.className}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile display section */}
            {loadingProfile ? (
              <div className="py-20 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent mx-auto mb-3"></div>
                <p className="text-xs font-bold">Đang tải hồ sơ học sinh...</p>
              </div>
            ) : selectedStudentProfile ? (
              <div className="space-y-6 animate-fade-in">
                {/* Candidate bio card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-[#00A99D] flex-shrink-0">
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
                    <div className="text-xs font-bold text-slate-700">Lớp hiện tại: <strong className="text-[#00A99D] font-black">{selectedStudentProfile.className}</strong></div>
                    <div className="text-[10px] text-slate-400 font-bold mt-0.5">{selectedStudentProfile.campusName}</div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">Năm học: {selectedStudentProfile.academicYearName}</div>
                  </div>
                </div>

                {/* Achievements List Display */}
                <div className="space-y-4">
                  {/* View mode toggle bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      <h3 className="text-slate-800 font-black text-sm">
                        Lịch sử Thành tích &amp; Giải thưởng
                      </h3>
                      <span className="text-[10px] font-bold bg-[#00A99D]/10 text-[#00A99D] px-2.5 py-0.5 rounded-md border border-[#00A99D]/20">
                        {selectedStudentProfile.achievements.length} giải
                      </span>
                    </div>

                    <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50 no-print self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setViewGroup('exam')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          viewGroup === 'exam' 
                            ? 'bg-white text-[#00A99D] shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Xem theo Kỳ thi
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewGroup('category')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          viewGroup === 'category' 
                            ? 'bg-white text-[#00A99D] shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Xem theo Lĩnh vực
                      </button>
                    </div>
                  </div>

                  {renderGroupedContent()}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 shadow-xs animate-fade-in">
                <Award className="w-16 h-16 mx-auto opacity-10 mb-3" />
                <h4 className="font-bold text-slate-700">Chưa chọn Học sinh để tra cứu</h4>
                <p className="text-xs mt-1">Vui lòng sử dụng ô tìm nhanh hoặc bộ lọc lớp học ở trên để tra cứu lịch sử giải thưởng.</p>
              </div>
            )}
          </div>
        );
      })()}


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

        /* Custom scrollbar for grid */
        .custom-scrollbar::-webkit-scrollbar {
          height: 10px;
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 6px;
          border: 2px solid #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      
        .shine-effect {
          position: relative;
          overflow: hidden;
        }
        .shine-effect::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0) 40%,
            rgba(255, 255, 255, 0.3) 50%,
            rgba(255, 255, 255, 0) 60%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: rotate(-45deg);
          transition: none;
          pointer-events: none;
        }
        .shine-effect:hover::after {
          transform: translate(100%, 100%) rotate(-45deg);
          transition: all 0.8s ease;
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
