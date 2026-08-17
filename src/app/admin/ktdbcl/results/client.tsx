"use client"
import { useState, useEffect, useMemo } from "react"
import { 
  Award, Search, Calendar, MapPin, Users, Edit3, Check, X, 
  Trash2, Plus, FileSpreadsheet, Printer, Download, Eye, BookOpen, AlertCircle, UserCheck,
  Trophy, Medal, Ribbon, Sparkles, RefreshCw
} from "lucide-react"
import * as XLSX from "xlsx"
import { 
  saveExamResultsGridAction, upsertExamResultsAction,
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



const getSelectStyle = (val: string) => {
  if (val === "VANG" || val === "NHAT") {
    return "bg-amber-50/80 border-amber-300 text-amber-700 font-black shadow-2xs";
  }
  if (val === "BAC" || val === "NHI") {
    return "bg-slate-100/80 border-slate-300 text-slate-700 font-black shadow-2xs";
  }
  if (val === "DONG" || val === "BA") {
    return "bg-orange-50/80 border-orange-300 text-orange-700 font-black shadow-2xs";
  }
  if (val && val !== "") {
    return "bg-indigo-50/80 border-indigo-200 text-indigo-700 font-black shadow-2xs";
  }
  return "bg-slate-50 border-slate-200 text-slate-600 font-bold";
}

const getCategorySelectStyle = (val: string) => {
  if (val && val !== "") {
    return "bg-teal-50/80 border-teal-200 text-[#009085] font-black shadow-2xs";
  }
  return "bg-slate-50 border-slate-200 text-slate-600 font-bold";
}

const getTypeSelectStyle = (val: string) => {
  if (val === "DONG_DOI") {
    return "bg-violet-50/80 border-violet-200 text-violet-700 font-black shadow-2xs";
  }
  return "bg-slate-50 border-slate-200 text-slate-600 font-bold";
}

export function ResultsClient({ 
  exams, 
  academicYears, 
  teachers, 
  campuses, 
  classes,
  achievementCategories,
  achievementLevels,
  initialTab = 'input'
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

  const [subTab, setSubTab] = useState<'input' | 'reports' | 'profiles'>(initialTab)

  // Sync subTab with initialTab (from URL search param)
  useEffect(() => {
    setSubTab(initialTab)
  }, [initialTab])

  // --- Sub-Tab 1: Excel Grid State ---
  const [selectedExamId, setSelectedExamId] = useState("")
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [gridRows, setGridRows] = useState<any[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [changedStudentIds, setChangedStudentIds] = useState<Set<string>>(new Set())
  const [checkedRowIds, setCheckedRowIds] = useState<Set<string>>(new Set())
  const [bulkType, setBulkType] = useState("CA_NHAN")
  const [bulkCategory, setBulkCategory] = useState("")
  const [bulkLevel, setBulkLevel] = useState("")

  const [savingGrid, setSavingGrid] = useState(false)
  const [gridClassFilter, setGridClassFilter] = useState("")
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  const handleDownloadSampleExcel = () => {
    const wb = XLSX.utils.book_new()
    const header = [
      "Mã HS", "Họ Tên", "Hình thức (CA_NHAN/DONG_DOI)", 
      "Loại giải (GIAI_THUONG/HUY_CHUONG/CHUNG_NHAN/KHAC)", 
      "Mức giải (NHAT/NHI/BA/KHUYEN_KHICH/VANG/BAC/DONG)", 
      "Tên giải thưởng", "Mã GV Bồi dưỡng (Tùy chọn)"
    ]
    const data = [header]
    
    if (gridRows.length > 0) {
      gridRows.forEach(r => {
        data.push([
          r.studentCode, 
          r.studentName, 
          r.type || "CA_NHAN", 
          r.category || "", 
          r.level || "", 
          r.name || "", 
          r.teacherId === "KHAC" ? (r.teacherName || "") : (r.teacherId || "")
        ])
      })
    } else {
      data.push(["0501030347", "Nguyễn Văn A", "CA_NHAN", "GIAI_THUONG", "NHAT", "Giải Nhất", ""])
    }

    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, "Mau_Nhap_Thanh_Tich")
    XLSX.writeFile(wb, "Mau_Nhap_Thanh_Tich.xlsx")
  }

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: "binary" })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = XLSX.utils.sheet_to_json(ws)
      
      let importedCount = 0;
      const cleanCode = (c: any) => String(c || "").trim().replace(/^0+/, "")

      setGridRows(prev => {
        const newRows = [...prev]
        const processedCounts = {}

        data.forEach((row: any) => {
          const rawStudentCode = row["Mã HS"] || row["Mã học sinh"] || row["studentCode"]
          if (!rawStudentCode) return
          const studentCode = String(rawStudentCode).trim()
          
          const type = row["Hình thức (CA_NHAN/DONG_DOI)"] || row["Hình thức"] || "CA_NHAN"
          const category = row["Loại giải (GIAI_THUONG/HUY_CHUONG/CHUNG_NHAN/KHAC)"] || row["Loại giải"] || ""
          const level = row["Mức giải (NHAT/NHI/BA/KHUYEN_KHICH/VANG/BAC/DONG)"] || row["Mức giải"] || ""
          const name = row["Tên giải thưởng"] || row["Tên thành tích"] || getAutoName(category, level)
          
          if (!category) return;
          importedCount++;

          const studentRowIndexes = []
          newRows.forEach((r, idx) => {
            if (cleanCode(r.studentCode) === cleanCode(studentCode)) {
              studentRowIndexes.push(idx)
            }
          })

          if (studentRowIndexes.length === 0) return

          if (!processedCounts[studentCode]) {
            processedCounts[studentCode] = 0
          }
          const instanceIdx = processedCounts[studentCode]
          processedCounts[studentCode]++

          if (instanceIdx < studentRowIndexes.length) {
            const targetIdx = studentRowIndexes[instanceIdx]
            newRows[targetIdx] = { 
              ...newRows[targetIdx], 
              type, 
              category, 
              level, 
              name 
            }
          } else {
            const lastIdx = studentRowIndexes[studentRowIndexes.length - 1]
            const student = newRows[lastIdx]
            newRows.splice(lastIdx + 1, 0, {
              gridRowId: `temp-${student.studentId}-${Date.now()}-${Math.random()}`,
              studentId: student.studentId,
              studentCode: student.studentCode,
              studentName: student.studentName,
              gender: student.gender,
              className: student.className,
              campusName: student.campusName,
              achievementId: null,
              name, type, category, level, teacherId: "", teacherName: ""
            })
          }
        })
        return newRows
      })
      setHasChanges(true)
      alert(`Đã import ${importedCount} thành tích thành công!`)
      if (e.target) e.target.value = ''
    }
    reader.readAsBinaryString(file)
  }
  
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
    const targetRow = gridRows.find(r => r.gridRowId === gridRowId)
    if (targetRow) {
      setChangedStudentIds(prev => {
        const next = new Set(prev)
        next.add(targetRow.studentId)
        return next
      })
    }
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
    setChangedStudentIds(prev => {
      const next = new Set(prev)
      next.add(studentId)
      return next
    })
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

  
  const handleBulkApply = () => {
    if (checkedRowIds.size === 0) return;
    
    setHasChanges(true);
    setGridRows(prev => prev.map(row => {
      if (!checkedRowIds.has(row.gridRowId)) return row;

      const updatedRow = { ...row, type: bulkType, category: bulkCategory };
      
      if (bulkCategory === "") {
        updatedRow.level = "";
        updatedRow.name = "";
      } else {
        updatedRow.level = bulkLevel;
        if (bulkLevel === "") {
           updatedRow.name = "";
        } else if (row.name === "" || row.name === getAutoName(row.category, row.level) || row.name === getAutoName(bulkCategory, bulkLevel)) {
           updatedRow.name = getAutoName(bulkCategory, bulkLevel);
        }
      }
      
      setChangedStudentIds(c => {
        const next = new Set(c);
        next.add(row.studentId);
        return next;
      });
      
      return updatedRow;
    }));
    
    // Clear selection after apply
    setCheckedRowIds(new Set());
    alert(`Đã áp dụng hàng loạt cho ${checkedRowIds.size} học sinh!`);
  }

  const handleDeleteAll = () => {
    if (!confirm("Bạn có chắc chắn muốn xóa TẤT CẢ dữ liệu thành tích đang hiển thị trên lưới không? (Cần bấm Lưu để áp dụng)")) return;
    
    setHasChanges(true);
    setGridRows(prev => {
      return prev.map(r => {
        setChangedStudentIds(c => {
          const next = new Set(c);
          next.add(r.studentId);
          return next;
        });
        
        return {
          ...r,
          name: "",
          category: "",
          level: ""
        };
      });
    });
  }

  const handleRemoveRow = (gridRowId: string, studentId: string) => {
    setChangedStudentIds(prev => {
      const next = new Set(prev)
      next.add(studentId)
      return next
    })
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

    const changedRowsToSave = gridRows.filter(r => changedStudentIds.has(r.studentId))
    
    if (changedRowsToSave.length === 0) {
      alert("Chưa có thay đổi nào để lưu!")
      setSavingGrid(false)
      return
    }

    const invalidRow = changedRowsToSave.find(r => r.category !== "" && r.level !== "" && r.name.trim() === "")
    if (invalidRow) {
      alert(`Vui lòng nhập Tên thành tích cho học sinh ${invalidRow.studentName}!`)
      setSavingGrid(false)
      return
    }

    try {
      const rowsPayload = changedRowsToSave.map(r => ({
        achievementId: r.achievementId,
        studentId: r.studentId,
        name: r.name,
        type: r.type,
        category: r.category,
        level: r.level,
        teacherId: r.teacherId === "KHAC" ? null : (r.teacherId || null),
        teacherName: r.teacherId === "KHAC" ? (r.teacherName || null) : (r.teacherId ? (teachers.find(t => t.id === r.teacherId)?.teacherName || null) : (r.teacherName || null))
      }))

      await upsertExamResultsAction(selectedExamId, yearId, rowsPayload)
      setHasChanges(false)
      setChangedStudentIds(new Set())
      alert("Đã cập nhật dữ liệu thành tích an toàn thành công!")
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
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:border-[#36E08F] outline-none font-black text-slate-700 bg-slate-50/50"
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
                    <span className="text-[10px] font-bold bg-[#36E08F]/10 text-[#36E08F] px-2.5 py-1 rounded-md border border-[#36E08F]/20">
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
                  className="flex items-center gap-1.5 bg-[#36E08F] hover:bg-[#009085] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-[#36E08F]/15 transition-all text-xs"
                >
                  <Check className="w-4 h-4" />
                  {savingGrid ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Card: Excel Grid Table */}
          {selectedExamId && (() => {
            
            const gridClasses = Array.from(new Set(gridRows.map(r => r.className).filter(Boolean))).sort()
            const filteredGridRows = gridClassFilter ? gridRows.filter(r => r.className === gridClassFilter) : gridRows
            const uniqueStudentIds = Array.from(new Set(filteredGridRows.map(r => r.studentId)))
            const totalPages = Math.ceil(uniqueStudentIds.length / rowsPerPage) || 1
            const pagedStudentIds = uniqueStudentIds.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
            const pagedGridRows = filteredGridRows.filter(r => pagedStudentIds.includes(r.studentId))
            
            return (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6 animate-fade-in">
              <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#36E08F]" />
                    Bảng Thành Tích Kỳ Thi: <span className="text-indigo-700">{currentExam?.name}</span>
                  </h3>
                                    <div className="flex items-center gap-4 mt-1">
                    <p className="text-xs text-slate-500 font-medium">
                      Tổng số: <strong className="text-slate-700">{uniqueStudentIds.length}</strong> em. 
                    </p>
                    <select 
                      value={gridClassFilter} 
                      onChange={e => { setGridClassFilter(e.target.value); setCurrentPage(1); }} 
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:border-[#36E08F] outline-none font-semibold text-slate-700"
                    >
                      <option value="">-- Tất cả các lớp --</option>
                      {gridClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleDeleteAll} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all hover:scale-105 border border-red-200">
                    <Trash2 className="w-4 h-4" /> Xóa tất cả
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm("Hành động này sẽ tải lại danh sách học sinh từ Danh sách đăng ký dự thi và hủy tất cả các thay đổi chưa lưu. Bạn có chắc chắn không?")) {
                        loadExamStudents()
                      }
                    }} 
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all hover:scale-105 border border-indigo-200 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" /> Lấy dữ liệu từ DS dự thi
                  </button>
                  <button onClick={handleDownloadSampleExcel} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all hover:scale-105">
                    <Download className="w-4 h-4" /> Tải File Mẫu
                  </button>
                  <label className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow hover:-translate-y-0.5">
                    <FileSpreadsheet className="w-4 h-4" /> Nhập từ Excel
                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
                  </label>
                </div>
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
                <>
                  {checkedRowIds.size > 0 && (
                    <div className="bg-slate-900/95 text-white border border-slate-800 rounded-2xl shadow-xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-50 fixed bottom-6 left-1/2 -translate-x-1/2 max-w-4xl w-[90%] backdrop-blur-md transition-all duration-300 ease-out transform scale-100 animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex items-center gap-3">
                        <span className="bg-[#36E08F]/15 border border-[#36E08F]/20 text-[#00E5D5] px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5">
                          <Check className="w-4 h-4" /> Đã chọn {checkedRowIds.size} học sinh
                        </span>
                        <button
                          onClick={() => setCheckedRowIds(new Set())}
                          className="text-xs text-slate-400 hover:text-white transition-colors underline cursor-pointer"
                        >
                          Bỏ chọn tất cả
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={bulkType}
                          onChange={e => setBulkType(e.target.value)}
                          className="border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-slate-800 focus:border-[#36E08F] font-bold text-white transition-all cursor-pointer"
                        >
                          <option value="CA_NHAN">Cá nhân</option>
                          <option value="DONG_DOI">Đồng đội</option>
                        </select>
                        <select
                          value={bulkCategory}
                          onChange={e => {
                            setBulkCategory(e.target.value)
                            setBulkLevel("")
                          }}
                          className="border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-slate-800 focus:border-[#36E08F] font-bold text-white transition-all cursor-pointer"
                        >
                          <option value="">-- Loại giải --</option>
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <select
                          value={bulkLevel}
                          onChange={e => setBulkLevel(e.target.value)}
                          disabled={bulkCategory === ""}
                          className="border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-slate-800 focus:border-[#36E08F] font-bold text-white transition-all disabled:opacity-50 disabled:bg-slate-800/40 cursor-pointer"
                        >
                          <option value="">-- Mức giải --</option>
                          {(() => {
                            const catObj = achievementCategories.find((c) => c.code === bulkCategory)
                            const filtered = catObj ? achievementLevels.filter((l) => l.categoryId === catObj.id) : []
                            return filtered.map((lvl) => (
                              <option key={lvl.code} value={lvl.code}>{lvl.name}</option>
                            ))
                          })()}
                        </select>
                        <button 
                          onClick={handleBulkApply}
                          className="px-5 py-1.5 bg-[#36E08F] hover:bg-[#009085] text-white rounded-lg text-xs font-black transition-all shadow-md shadow-[#36E08F]/20 cursor-pointer"
                        >
                          Áp dụng hàng loạt
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="w-full overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4 w-12 text-center">
                          <input 
                            type="checkbox" 
                            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                            checked={pagedGridRows.length > 0 && pagedGridRows.every(r => checkedRowIds.has(r.gridRowId))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCheckedRowIds(prev => {
                                  const next = new Set(prev)
                                  pagedGridRows.forEach(r => next.add(r.gridRowId))
                                  return next
                                })
                              } else {
                                setCheckedRowIds(prev => {
                                  const next = new Set(prev)
                                  pagedGridRows.forEach(r => next.delete(r.gridRowId))
                                  return next
                                })
                              }
                            }}
                          />
                        </th>
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
                      {pagedGridRows.map((row, idx) => {
                        const hasAward = row.category !== "" && row.level !== ""
                        const isGold = row.level === "VANG" || row.level === "NHAT"
                        const isSilver = row.level === "BAC" || row.level === "NHI"
                        const isBronze = row.level === "DONG" || row.level === "BA"

                        let rowBg = "hover:bg-slate-50/80 bg-white"
                        if (isGold) rowBg = "bg-amber-50/20 hover:bg-amber-50/40"
                        else if (isSilver) rowBg = "bg-slate-50/60 hover:bg-slate-100/60"
                        else if (isBronze) rowBg = "bg-orange-50/20 hover:bg-orange-50/40"
                        else if (hasAward) rowBg = "bg-indigo-50/10 hover:bg-indigo-50/30"

                        let levelColor = ""
                        if (isGold) levelColor = "text-amber-700 font-extrabold bg-amber-50 border-amber-300 shadow-sm"
                        else if (isSilver) levelColor = "text-slate-700 font-extrabold bg-slate-100 border-slate-300 shadow-sm"
                        else if (isBronze) levelColor = "text-orange-700 font-extrabold bg-orange-50 border-orange-300 shadow-sm"
                        else if (hasAward) levelColor = "text-indigo-700 font-bold bg-indigo-50 border-indigo-200"

                        return (
                          <tr key={row.gridRowId} className={`transition-all ${rowBg}`}>
                            {/* Checkbox */}
                            <td className="py-2.5 px-4 text-center relative">
                              {changedStudentIds.has(row.studentId) && (
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute left-1 top-1/2 -translate-y-1/2" title="Chưa lưu thay đổi" />
                              )}
                              <input 
                                type="checkbox" 
                                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                checked={checkedRowIds.has(row.gridRowId)}
                                onChange={(e) => {
                                  setCheckedRowIds(prev => {
                                    const next = new Set(prev)
                                    if (e.target.checked) next.add(row.gridRowId)
                                    else next.delete(row.gridRowId)
                                    return next
                                  })
                                }}
                              />
                            </td>
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
                                className={`w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer ${getTypeSelectStyle(row.type)}`}
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
                                className={`w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer ${getCategorySelectStyle(row.category)}`}
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
                                className={`w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/30 ${getSelectStyle(row.level)}`}
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
                                className="w-full border border-slate-200 disabled:bg-slate-50/50 rounded px-2.5 py-1 text-xs outline-none focus:border-[#36E08F] font-semibold text-slate-800 transition-all"
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
                                  className="w-full border border-slate-200 disabled:bg-slate-50/50 rounded px-1.5 py-1 text-xs outline-none bg-white focus:border-[#36E08F] transition-colors"
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
                                    className="w-full border border-slate-200 disabled:bg-slate-50/50 rounded px-2.5 py-1 text-xs outline-none focus:border-[#36E08F] font-semibold text-slate-800 transition-all"
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
                </>
              )}

              {/* Pagination Footer */}
              {uniqueStudentIds.length > 0 && (
                <div className="bg-slate-50/80 border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs font-bold text-slate-500">
                    Hiển thị <strong className="text-indigo-700">{(currentPage - 1) * rowsPerPage + 1}</strong> đến <strong className="text-indigo-700">{Math.min(currentPage * rowsPerPage, uniqueStudentIds.length)}</strong> trong tổng số <strong className="text-slate-800">{uniqueStudentIds.length}</strong> học sinh
                  </p>
                  <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                    >
                      Trước
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .map((p, idx, arr) => (
                          <div key={p} className="flex items-center">
                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                              <span className="px-1.5 text-slate-400 font-bold">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(p)}
                              className={`w-7 h-7 mx-0.5 flex items-center justify-center rounded-md text-xs font-bold transition-all ${
                                currentPage === p
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        ))}
                    </div>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
            )
          })()}
        </div>
      )}

      {/* --- SUB TAB 2: REPORTS --- */}
      {subTab === 'reports' && (
        <div className="space-y-6">
          {/* Report Filters Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 no-print animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-slate-800 font-bold text-sm flex items-center gap-2">
                <div className="w-7 h-7 bg-[#36E08F]/10 rounded-lg flex items-center justify-center">
                  <Search className="w-4 h-4 text-[#36E08F]" />
                </div>
                Bộ lọc Báo cáo thành tích
              </h3>
              <span className="text-[10px] font-black bg-[#36E08F]/10 text-[#36E08F] px-3 py-1.5 rounded-lg border border-[#36E08F]/20 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Năm học: {academicYears.find(y => y.id === yearId)?.name || 'Tất cả'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cơ sở</label>
                <select
                  value={reportFilter.campusId}
                  onChange={e => setReportFilter({ ...reportFilter, campusId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#36E08F] outline-none font-semibold text-slate-700 bg-slate-50/50"
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
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#36E08F] outline-none font-semibold text-slate-700 bg-slate-50/50"
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
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#36E08F] outline-none font-semibold text-slate-700 bg-slate-50/50 disabled:opacity-50"
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
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#36E08F] outline-none font-semibold text-slate-700 bg-slate-50/50"
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
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#36E08F] outline-none font-semibold text-slate-700 bg-slate-50/50"
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

          {/* Stats Summaries - Premium Vibrant KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 no-print animate-fade-in">
            {/* Card 1: Tổng thành tích */}
            <div className="bg-gradient-to-br from-indigo-50/90 via-slate-50 to-indigo-100/60 p-5 rounded-2xl border border-indigo-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[10px] font-extrabold text-indigo-800 uppercase tracking-wider block mb-1">Tổng thành tích</div>
              <div className="text-3xl font-black text-indigo-950 leading-none">{reportData.length}</div>
              <div className="text-[10px] text-indigo-600/80 font-bold mt-1.5">giải thưởng</div>
            </div>

            {/* Card 2: Nhất / Vàng */}
            <div className="bg-gradient-to-br from-amber-50/90 via-yellow-50/40 to-amber-100/60 p-5 rounded-2xl border border-amber-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block mb-1">Nhất / Vàng</div>
              <div className="text-3xl font-black text-amber-950 leading-none">{goldCount}</div>
              <div className="text-[10px] text-amber-600/80 font-bold mt-1.5">giải thưởng</div>
            </div>

            {/* Card 3: Nhì / Bạc */}
            <div className="bg-gradient-to-br from-slate-100/90 via-blue-50/40 to-slate-200/60 p-5 rounded-2xl border border-slate-300/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-slate-600 text-white rounded-xl shadow-md shadow-slate-500/20 group-hover:scale-110 transition-transform">
                  <Medal className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">Nhì / Bạc</div>
              <div className="text-3xl font-black text-slate-900 leading-none">{silverCount}</div>
              <div className="text-[10px] text-slate-500 font-bold mt-1.5">giải thưởng</div>
            </div>

            {/* Card 4: Ba / Đồng */}
            <div className="bg-gradient-to-br from-orange-50/90 via-amber-50/40 to-orange-100/60 p-5 rounded-2xl border border-orange-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-orange-600 text-white rounded-xl shadow-md shadow-orange-500/20 group-hover:scale-110 transition-transform">
                  <Medal className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[10px] font-extrabold text-orange-800 uppercase tracking-wider block mb-1">Ba / Đồng</div>
              <div className="text-3xl font-black text-orange-950 leading-none">{bronzeCount}</div>
              <div className="text-[10px] text-orange-600/80 font-bold mt-1.5">giải thưởng</div>
            </div>

            {/* Card 5: Khuyến khích */}
            <div className="bg-gradient-to-br from-teal-50/90 via-cyan-50/40 to-teal-100/60 p-5 rounded-2xl border border-teal-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-[#36E08F] text-white rounded-xl shadow-md shadow-teal-500/20 group-hover:scale-110 transition-transform">
                  <Ribbon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider block mb-1">Khuyến khích</div>
              <div className="text-3xl font-black text-teal-950 leading-none">{consolCount}</div>
              <div className="text-[10px] text-teal-600/80 font-bold mt-1.5">giải thưởng</div>
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

            <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 px-6 py-4 flex items-center justify-between no-print">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#36E08F]/10 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="w-4.5 h-4.5 text-[#36E08F]" />
                </div>
                <div>
                  <div className="font-black text-slate-800 text-sm">Danh sách đạt giải</div>
                  <div className="text-[10px] text-slate-400 font-semibold">{reportData.length} kết quả</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-emerald-600/15 transition-all hover:-translate-y-0.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Xuất Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-slate-800/15 transition-all hover:-translate-y-0.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In / PDF
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
                        <td className="py-3 px-6 text-[#36E08F] font-bold">{row.achievementName}</td>
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
        // Compute achievements grouped by Exam or Category
        const achievementsByExam: Record<string, any[]> = {};
        const achievementsByCategory: Record<string, any[]> = {};

        if (selectedStudentProfile?.achievements) {
          selectedStudentProfile.achievements.forEach((ach: any) => {
            const examKey = ach.examName || "Kỳ thi khác";
            const catKey = ach.examCategoryName || "Lĩnh vực khác";

            if (!achievementsByExam[examKey]) achievementsByExam[examKey] = [];
            achievementsByExam[examKey].push(ach);

            if (!achievementsByCategory[catKey]) achievementsByCategory[catKey] = [];
            achievementsByCategory[catKey].push(ach);
          });
        }

        const renderGroupedContent = () => {
          const groupedData = viewGroup === 'exam' ? achievementsByExam : achievementsByCategory;
          const noData = Object.keys(groupedData).length === 0;

          if (noData) {
            return (
              <div className="bg-white border border-slate-200/80 rounded-2xl py-16 text-center text-slate-400 space-y-1 shadow-xs">
                <Award className="w-12 h-12 mx-auto opacity-20 text-slate-400 mb-2" />
                <h5 className="font-extrabold text-slate-600 text-sm">Chưa ghi nhận thành tích nào</h5>
                <p className="text-xs text-slate-400 font-medium">Học sinh chưa có giải thưởng hoặc kết quả khen thưởng trong hệ thống.</p>
              </div>
            );
          }

          return (
            <div className="space-y-6">
              {Object.entries(groupedData).map(([groupName, achList]: [string, any[]]) => (
                <div key={groupName} className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs animate-fade-in hover:shadow-md transition-all duration-300">
                  {/* Group Header */}
                  <div className="bg-gradient-to-r from-slate-50 via-teal-50/20 to-slate-50 border-b border-slate-200/80 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#36E08F]/10 text-[#36E08F] rounded-xl flex items-center justify-center border border-[#36E08F]/20 shadow-2xs">
                        {viewGroup === 'exam' ? (
                          <Sparkles className="w-5 h-5" />
                        ) : (
                          <Award className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-sm sm:text-base">{groupName}</h4>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">
                          {viewGroup === 'exam' ? 'Kỳ thi chính thức' : 'Lĩnh vực thành tích'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-black bg-[#36E08F]/10 text-[#36E08F] px-3 py-1 rounded-full border border-[#36E08F]/20 uppercase">
                      {achList.length} giải thưởng
                    </span>
                  </div>

                  {/* Achievements Grid */}
                  <div className="p-5 bg-slate-50/30 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achList.map((ach) => renderAchievementCard(ach))}
                  </div>
                </div>
              ))}
            </div>
          );
        };

        return (
          <div className="space-y-6 max-w-6xl mx-auto no-print animate-fade-in">
            {/* Search Banner Container */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
              {/* Card Banner Header */}
              <div className="bg-gradient-to-r from-[#003B3A] via-[#007A72] to-[#36E08F] text-white p-5 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs shadow-inner">
                    <BookOpen className="w-6 h-6 text-teal-200" />
                  </div>
                  <div>
                    <h3 className="font-black text-base tracking-wide">Tra Cứu Hồ Sơ Thành Tích Học Sinh</h3>
                    <p className="text-teal-100 text-xs font-medium">Tìm kiếm học sinh theo Mã/Tên hoặc chọn theo danh sách Lớp học</p>
                  </div>
                </div>
                {selectedStudentProfile && (
                  <button
                    onClick={() => {
                      setSelectedStudentProfile(null);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer border border-white/20"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Tra cứu HS khác
                  </button>
                )}
              </div>

              {/* 2 Search Method Panel */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Method 1: Quick Search */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-teal-50 text-[#36E08F] border border-teal-200/80 flex items-center justify-center text-[10px] font-black">1</span>
                    CÁCH 1: Tìm nhanh bằng Mã hoặc Tên học sinh
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        handleSearchStudents(e.target.value);
                        setProfileCampusId("");
                        setProfileGrade("");
                        setProfileClassId("");
                        setClassStudents([]);
                      }}
                      placeholder="Nhập Mã học sinh hoặc Tên học sinh..."
                      className="w-full border border-slate-200 rounded-xl pl-10 pr-9 py-3 text-xs focus:ring-2 focus:ring-[#36E08F]/20 focus:border-[#36E08F] outline-none font-semibold text-slate-700 bg-slate-50/50 shadow-2xs transition-all"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Live Results */}
                  {searchResults.length > 0 && (
                    <div className="border border-slate-200/80 rounded-xl bg-white shadow-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      {searchResults.map(student => (
                        <button
                          key={student.id}
                          onClick={() => {
                            handleSelectStudentProfile(student.id);
                            setSearchResults([]);
                            setSearchQuery("");
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-teal-50/40 transition-all flex justify-between items-center text-xs font-semibold group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#36E08F] to-[#008A81] text-white flex items-center justify-center font-black text-xs uppercase shadow-2xs">
                              {student.studentName.split(" ").pop()?.charAt(0) || "H"}
                            </div>
                            <div>
                              <div className="font-black text-slate-800 group-hover:text-[#36E08F] transition-colors">{student.studentName}</div>
                              <div className="text-[10px] text-slate-400 font-mono font-bold">Mã HS: {student.studentCode}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded text-[10px]">{student.className}</div>
                            <div className="text-[9px] text-slate-400 font-semibold mt-0.5">{student.campusName}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery.trim().length >= 2 && searchResults.length === 0 && !loadingSearch && (
                    <p className="text-xs text-rose-500 italic font-semibold">Không tìm thấy học sinh nào phù hợp.</p>
                  )}
                  {loadingSearch && (
                    <p className="text-xs text-[#36E08F] animate-pulse font-bold">Đang tìm kiếm dữ liệu học sinh...</p>
                  )}
                </div>

                {/* Method 2: Browse by Class */}
                <div className="space-y-3 border-t lg:border-t-0 lg:border-l border-slate-200/80 pt-6 lg:pt-0 lg:pl-8">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center text-[10px] font-black">2</span>
                    CÁCH 2: Chọn học sinh theo Danh sách Lớp học
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Cơ sở</label>
                      <select
                        value={profileCampusId}
                        onChange={e => {
                          setProfileCampusId(e.target.value);
                          setProfileClassId("");
                          setClassStudents([]);
                        }}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#36E08F]/20 focus:border-[#36E08F] outline-none font-semibold text-slate-700 bg-slate-50/50 shadow-2xs"
                      >
                        <option value="">-- Chọn Cơ sở --</option>
                        {campuses.map(c => (
                          <option key={c.id} value={c.id}>{c.campusName}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Khối lớp</label>
                      <select
                        value={profileGrade}
                        onChange={e => {
                          setProfileGrade(e.target.value);
                          setProfileClassId("");
                          setClassStudents([]);
                        }}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#36E08F]/20 focus:border-[#36E08F] outline-none font-semibold text-slate-700 bg-slate-50/50 shadow-2xs"
                      >
                        <option value="">-- Chọn Khối --</option>
                        {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(g => (
                          <option key={g} value={g}>Khối {g}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Lớp học</label>
                      <select
                        value={profileClassId}
                        onChange={e => setProfileClassId(e.target.value)}
                        disabled={!profileCampusId || !profileGrade}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#36E08F]/20 focus:border-[#36E08F] outline-none font-semibold text-slate-700 bg-slate-50/50 disabled:opacity-50 shadow-2xs"
                      >
                        <option value="">-- Chọn Lớp --</option>
                        {classes
                          .filter(c => c.campusId === profileCampusId && c.grade === profileGrade && c.academicYearId === yearId)
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.className}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {profileClassId && (
                    <div className="pt-3 border-t border-slate-100 animate-fade-in space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        <span>Danh sách Học sinh ({classStudents.length})</span>
                        <span className="text-[#36E08F]">Nhấp chọn để tra cứu</span>
                      </div>
                      {loadingClassStudents ? (
                        <p className="text-xs text-[#36E08F] animate-pulse py-2 font-bold">Đang tải danh sách học sinh...</p>
                      ) : classStudents.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">Không tìm thấy học sinh nào thuộc lớp này.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                          {classStudents.map(student => (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => handleSelectStudentProfile(student.id)}
                              className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between text-xs cursor-pointer ${
                                selectedStudentProfile?.id === student.id 
                                  ? 'bg-teal-50/80 border-[#36E08F] text-[#36E08F] shadow-xs' 
                                  : 'bg-slate-50/60 hover:bg-slate-100/60 border-slate-200/80 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] uppercase flex-shrink-0 ${
                                  selectedStudentProfile?.id === student.id ? 'bg-[#36E08F] text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {student.studentName.split(" ").pop()?.charAt(0) || "H"}
                                </div>
                                <div className="truncate">
                                  <div className="font-bold truncate text-slate-800 text-xs">{student.studentName}</div>
                                  <div className="text-[9px] text-slate-400 font-mono">Mã: {student.studentCode}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Content Display */}
            {loadingProfile ? (
              <div className="py-20 text-center text-slate-400 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <div className="animate-spin rounded-full h-9 w-9 border-3 border-[#36E08F] border-t-transparent mx-auto mb-3"></div>
                <p className="text-xs font-black text-slate-600">Đang tải hồ sơ thành tích học sinh...</p>
              </div>
            ) : selectedStudentProfile ? (
              <div className="space-y-6 animate-fade-in">
                {/* Candidate Bio Header Card */}
                <div className="bg-gradient-to-br from-teal-50/80 via-white to-slate-50 border border-teal-200/80 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#36E08F]/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex items-start gap-5 relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#36E08F] to-[#007B73] rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-[#36E08F]/20 border border-white/20 font-black text-2xl uppercase">
                      {selectedStudentProfile.studentName.split(" ").pop()?.charAt(0) || "H"}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-slate-800">{selectedStudentProfile.studentName}</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono bg-white text-slate-700 px-3 py-1 rounded-lg font-black text-xs border border-slate-200 shadow-2xs">
                          Mã HS: {selectedStudentProfile.studentCode}
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-extrabold text-xs border border-blue-100">
                          {selectedStudentProfile.gender || "Chưa rõ"}
                        </span>
                        {selectedStudentProfile.dateOfBirth && (
                          <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg font-extrabold text-xs border border-purple-100">
                            Ngày sinh: {new Date(selectedStudentProfile.dateOfBirth).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="self-start md:self-center bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs text-right min-w-[180px] relative z-10">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Đơn vị & Lớp học</div>
                    <div className="text-2xl font-black text-[#36E08F]">{selectedStudentProfile.className}</div>
                    <div className="text-xs text-slate-600 font-extrabold mt-0.5">{selectedStudentProfile.campusName}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60 inline-block font-bold">
                      Năm học: {selectedStudentProfile.academicYearName}
                    </div>
                  </div>
                </div>

                {/* Achievements List Display Header & View Group Toggle */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-200/80 shadow-2xs">
                        <Award className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="text-slate-800 font-black text-base">Lịch Sử Thành Tích &amp; Khen Thưởng</h3>
                        <p className="text-xs text-slate-400 font-medium">Toàn bộ giải thưởng đã đạt được trong quá trình học tập</p>
                      </div>
                      <span className="text-xs font-black bg-[#36E08F] text-white px-3 py-1 rounded-full shadow-2xs ml-1">
                        {selectedStudentProfile.achievements.length} giải
                      </span>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 no-print self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setViewGroup('exam')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          viewGroup === 'exam' 
                            ? 'bg-white text-[#36E08F] shadow-xs' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Xem theo Kỳ thi
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewGroup('category')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          viewGroup === 'category' 
                            ? 'bg-white text-[#36E08F] shadow-xs' 
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
              <div className="bg-gradient-to-br from-slate-50 via-teal-50/20 to-indigo-50/20 border border-slate-200/80 rounded-2xl p-16 text-center text-slate-400 shadow-xs animate-fade-in">
                <div className="w-20 h-20 bg-[#36E08F]/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#36E08F]/20 shadow-2xs">
                  <BookOpen className="w-10 h-10 text-[#36E08F]" />
                </div>
                <h4 className="font-black text-slate-800 text-lg">Chưa Chọn Học Sinh Để Tra Cứu</h4>
                <p className="text-xs mt-2 text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
                  Vui lòng nhập Mã học sinh / Tên ở Cách 1 hoặc chọn theo Lớp học ở Cách 2 bên trên để xem đầy đủ hồ sơ lịch sử thành tích.
                </p>
                <div className="flex items-center justify-center gap-6 mt-6">
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                    <Search className="w-4 h-4 text-[#36E08F]" />
                    <span className="text-xs font-bold text-slate-700">Tìm nhanh mã/tên</span>
                  </div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">hoặc</span>
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-700">Duyệt danh sách lớp</span>
                  </div>
                </div>
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
