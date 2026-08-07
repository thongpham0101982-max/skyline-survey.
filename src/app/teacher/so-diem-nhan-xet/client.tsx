"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import * as XLSX from "xlsx"
import { 
  FileSpreadsheet, 
  Save, 
  Download, 
  Upload, 
  RefreshCw, 
  BookOpen, 
  Users, 
  Layers, 
  Award,
  CheckCircle2,
  Calendar,
  Sparkles
} from "lucide-react"

interface Props {
  academicYears: any[]
  activeYearId: string
  initialClasses: any[]
  initialSubjects: any[]
  teacherName: string
}

const EVAL_PERIODS = [
  { code: "KSĐN", name: "Khảo sát đầu năm (KSĐN)" },
  { code: "GK1", name: "Giữa kỳ 1 (GK1)" },
  { code: "CK1", name: "Cuối kỳ 1 (CK1)" },
  { code: "GK2", name: "Giữa kỳ 2 (GK2)" },
  { code: "CK2", name: "Cuối kỳ 2 (CK2)" }
]

export function DiemNhanXetTeacherClient({ academicYears, activeYearId, initialClasses, initialSubjects, teacherName }: Props) {
  const [selectedYearId, setSelectedYearId] = useState(activeYearId || (academicYears[0]?.id || ""))
  const [classes, setClasses] = useState<any[]>(initialClasses)
  const [subjects, setSubjects] = useState<any[]>(initialSubjects)

    // Level and Grade filters
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("ALL")
  const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL")
  const [selectedSystemFilter, setSelectedSystemFilter] = useState("ALL")

    const educationSystemOptions = useMemo(() => {
    const set = new Set<string>()
    classes.forEach(c => {
      if (c.educationSystem && c.educationSystem.trim()) {
        set.add(c.educationSystem.trim())
      }
    })
    return Array.from(set).sort()
  }, [classes])

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (selectedLevelFilter !== "ALL") {
        const cLevel = (c.level || "").toLowerCase()
        const cGrade = (c.grade || "").toLowerCase()
        const cName = (c.className || "").toLowerCase()

        if (selectedLevelFilter === "TieuHoc") {
          const isMatch = cLevel.includes("tiểu học") || cLevel.includes("tieu hoc") ||
            ["1", "2", "3", "4", "5"].some(g => cGrade === g || cGrade === `khối ${g}` || cName.startsWith(g))
          if (!isMatch) return false
        } else if (selectedLevelFilter === "THCS") {
          const isMatch = cLevel.includes("thcs") ||
            ["6", "7", "8", "9"].some(g => cGrade === g || cGrade === `khối ${g}` || cName.startsWith(g))
          if (!isMatch) return false
        } else if (selectedLevelFilter === "THPT") {
          const isMatch = cLevel.includes("thpt") ||
            ["10", "11", "12"].some(g => cGrade === g || cGrade === `khối ${g}` || cName.startsWith(g))
          if (!isMatch) return false
        } else if (selectedLevelFilter === "MamNon") {
          const isMatch = cLevel.includes("mầm non") || cLevel.includes("mam non") || cLevel.includes("nhà trẻ") || cLevel.includes("mẫu giáo")
          if (!isMatch) return false
        }
      }

      if (selectedGradeFilter !== "ALL") {
        const targetNum = selectedGradeFilter.replace(/\D/g, "")
        const cGrade = (c.grade || "").trim()
        const cName = (c.className || "").trim()
        const cGradeNum = cGrade.replace(/\D/g, "")
        const cNameNum = (cName.match(/^(\d+)/) || [])[1] || ""

        const isMatch = cGrade === selectedGradeFilter || (targetNum && (cGradeNum === targetNum || cNameNum === targetNum))
        if (!isMatch) return false
      }

      if (selectedSystemFilter !== "ALL") {
        const cSys = (c.educationSystem || "").trim().toLowerCase()
        const targetSys = selectedSystemFilter.trim().toLowerCase()
        if (cSys !== targetSys && !cSys.includes(targetSys)) return false
      }

      return true
    })
  }, [classes, selectedLevelFilter, selectedGradeFilter, selectedSystemFilter])

  useEffect(() => {
    if (filteredClasses.length > 0 && !filteredClasses.some(c => c.id === selectedClassId)) {
      setSelectedClassId(filteredClasses[0].id)
    }
  }, [filteredClasses])

  const [selectedClassId, setSelectedClassId] = useState(initialClasses[0]?.id || "")
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjects[0]?.id || "")
  const [selectedPeriod, setSelectedPeriod] = useState("KSĐN")

  const [gradeSheetData, setGradeSheetData] = useState<{
    config: any
    students: any[]
    entries: Record<string, { componentScores: Record<string, string>; compositeScore: string; remark: string }>
  }>({
    config: null,
    students: [],
    entries: {}
  })

  const [loadingSheet, setLoadingSheet] = useState(false)
  const [savingEntries, setSavingEntries] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch teaching assignments if academic year changes
  useEffect(() => {
    fetch(`/api/teacher/grade-entries?action=getAssignments&academicYearId=${selectedYearId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.classes && data.classes.length > 0) setClasses(data.classes)
          if (data.subjects && data.subjects.length > 0) setSubjects(data.subjects)
          if (data.classes && data.classes.length > 0 && !data.classes.some((c: any) => c.id === selectedClassId)) {
            setSelectedClassId(data.classes[0].id)
          }
          if (data.subjects && data.subjects.length > 0 && !data.subjects.some((s: any) => s.id === selectedSubjectId)) {
            setSelectedSubjectId(data.subjects[0].id)
          }
        }
      })
      .catch(console.error)
  }, [selectedYearId])

  const fetchGradeSheet = async () => {
    if (!selectedClassId || !selectedSubjectId) return
    try {
      setLoadingSheet(true)
      const res = await fetch(
        `api/teacher/grade-entries?academicYearId=${selectedYearId}&classId=${selectedClassId}&subjectId=${selectedSubjectId}&evaluationPeriod=${selectedPeriod}`.replace('api/', '/api/')
      )
      const data = await res.json()
      if (data.success) {
        const entryDict: Record<string, { componentScores: Record<string, string>; compositeScore: string; remark: string }> = {}
        if (Array.isArray(data.entries)) {
          data.entries.forEach((e: any) => {
            let parsedComp: Record<string, string> = {}
            if (e.componentScores) {
              try {
                parsedComp = typeof e.componentScores === "string" ? JSON.parse(e.componentScores) : e.componentScores
              } catch (_) {}
            }
            entryDict[e.studentId] = {
              componentScores: parsedComp,
              compositeScore: e.compositeScore !== null && e.compositeScore !== undefined ? String(e.compositeScore) : "",
              remark: e.remark || ""
            }
          })
        }
        setGradeSheetData({
          config: data.config,
          students: data.students || [],
          entries: entryDict
        })
      }
    } catch (err) {
      console.error("Lỗi tải bảng điểm:", err)
    } finally {
      setLoadingSheet(false)
    }
  }

  useEffect(() => {
    fetchGradeSheet()
  }, [selectedClassId, selectedSubjectId, selectedPeriod, selectedYearId])

  const activeColNames = useMemo(() => {
    if (!gradeSheetData.config) return ["Cột 1", "Cột 2", "Cột 3"]
    try {
      return typeof gradeSheetData.config.columnNames === "string"
        ? JSON.parse(gradeSheetData.config.columnNames)
        : gradeSheetData.config.columnNames || ["Cột 1"]
    } catch (_) {
      return ["Cột 1"]
    }
  }, [gradeSheetData.config])

  const handleScoreChange = (studentId: string, colIndex: number, val: string) => {
    setGradeSheetData(prev => {
      const studentEntry = prev.entries[studentId] || { componentScores: {}, compositeScore: "", remark: "" }
      const newCompScores = { ...studentEntry.componentScores, [`col${colIndex}`]: val }

      let computedComposite = studentEntry.compositeScore
      if (prev.config?.hasCompositeColumn !== false) {
        const validScores: number[] = []
        Object.values(newCompScores).forEach(s => {
          if (s !== "" && !isNaN(Number(s))) {
            validScores.push(Number(s))
          }
        })
        if (validScores.length > 0) {
          const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length
          computedComposite = (Math.round(avg * 10) / 10).toFixed(1)
        } else {
          computedComposite = ""
        }
      }

      return {
        ...prev,
        entries: {
          ...prev.entries,
          [studentId]: {
            ...studentEntry,
            componentScores: newCompScores,
            compositeScore: computedComposite
          }
        }
      }
    })
  }

  const handleRemarkChange = (studentId: string, val: string) => {
    setGradeSheetData(prev => {
      const studentEntry = prev.entries[studentId] || { componentScores: {}, compositeScore: "", remark: "" }
      return {
        ...prev,
        entries: {
          ...prev.entries,
          [studentId]: {
            ...studentEntry,
            remark: val
          }
        }
      }
    })
  }

  const handleSaveGradeSheet = async () => {
    try {
      setSavingEntries(true)
      const entriesList = Object.entries(gradeSheetData.entries).map(([studentId, data]) => ({
        studentId,
        componentScores: data.componentScores,
        compositeScore: data.compositeScore,
        remark: data.remark
      }))

      const res = await fetch("/api/teacher/grade-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          evaluationPeriod: selectedPeriod,
          entries: entriesList
        })
      })
      const data = await res.json()
      if (data.success) {
        alert("Đã lưu sổ điểm thành công!")
      } else {
        alert("Lỗi: " + (data.error || "Không thể lưu điểm"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setSavingEntries(false)
    }
  }

  const handleExportExcel = () => {
    const currentClass = classes.find(c => c.id === selectedClassId)
    const currentSubject = subjects.find(s => s.id === selectedSubjectId)

    const headers = ["STT", "Mã HS", "Họ tên", "Môn học"]
    activeColNames.forEach((colName: string) => headers.push(colName))
    if (gradeSheetData.config?.hasCompositeColumn !== false) headers.push("Điểm thành phần")
    if (gradeSheetData.config?.hasRemarkColumn !== false) headers.push("Nhận xét")

    const rows = gradeSheetData.students.map((st, idx) => {
      const entry = gradeSheetData.entries[st.id] || { componentScores: {}, compositeScore: "", remark: "" }
      const rowData: any[] = [idx + 1, st.studentCode, st.studentName, currentSubject?.subjectName || "Môn học"]
      activeColNames.forEach((_: any, i: number) => {
        rowData.push(entry.componentScores[`col${i}`] || "")
      })
      if (gradeSheetData.config?.hasCompositeColumn !== false) rowData.push(entry.compositeScore || "")
      if (gradeSheetData.config?.hasRemarkColumn !== false) rowData.push(entry.remark || "")
      return rowData
    })

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "BangDiem")

    const fileName = `SổĐiểm_${currentClass?.className || "Lớp"}_${currentSubject?.subjectCode || "Môn"}_${selectedPeriod}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: "binary" })
        const wsName = wb.SheetNames[0]
        const ws = wb.Sheets[wsName]
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

        if (!data || data.length < 2) {
          alert("File Excel không có dữ liệu hợp lệ")
          return
        }

        const headers = data[0].map(h => String(h || "").trim())
        const codeIdx = headers.findIndex(h => h.toLowerCase().includes("mã hs") || h.toLowerCase().includes("ma hs"))
        if (codeIdx === -1) {
          alert("Không tìm thấy cột 'Mã HS' trong tệp Excel!")
          return
        }

        const studentMapByCode = new Map<string, string>()
        gradeSheetData.students.forEach(st => {
          studentMapByCode.set(st.studentCode.trim().toLowerCase(), st.id)
        })

        const newEntries = { ...gradeSheetData.entries }
        let countImported = 0

        for (let r = 1; r < data.length; r++) {
          const row = data[r]
          if (!row || !row[codeIdx]) continue
          const stCode = String(row[codeIdx]).trim().toLowerCase()
          const stId = studentMapByCode.get(stCode)
          if (!stId) continue

          const compScores: Record<string, string> = {}
          activeColNames.forEach((colName: string, cIdx: number) => {
            const hIdx = headers.findIndex(h => h.toLowerCase() === colName.toLowerCase())
            if (hIdx !== -1 && row[hIdx] !== undefined && row[hIdx] !== null) {
              compScores[`col${cIdx}`] = String(row[hIdx])
            }
          })

          const compScoreIdx = headers.findIndex(h => h.toLowerCase().includes("thành phần") || h.toLowerCase().includes("tổng hợp"))
          let compVal = ""
          if (compScoreIdx !== -1 && row[compScoreIdx] !== undefined) {
            compVal = String(row[compScoreIdx])
          }

          const remIdx = headers.findIndex(h => h.toLowerCase().includes("nhận xét") || h.toLowerCase().includes("nhan xet"))
          let remVal = ""
          if (remIdx !== -1 && row[remIdx] !== undefined) {
            remVal = String(row[remIdx])
          }

          newEntries[stId] = {
            componentScores: compScores,
            compositeScore: compVal,
            remark: remVal
          }
          countImported++
        }

        setGradeSheetData(prev => ({ ...prev, entries: newEntries }))
        alert(`Đã đọc thành công dữ liệu điểm của ${countImported} học sinh từ file Excel!`)
      } catch (err: any) {
        alert("Lỗi đọc file Excel: " + err.message)
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ""
  }

  const currentClass = classes.find(c => c.id === selectedClassId)
  const currentSubject = subjects.find(s => s.id === selectedSubjectId)

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A99D] rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-teal-200 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              Công tác Giáo viên Bộ môn
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Sổ điểm & Nhận xét</h1>
            <p className="text-teal-100 text-xs md:text-sm mt-1">
              Xin chào <strong className="text-white">{teacherName}</strong>, vui lòng chọn Lớp học, Môn học và Kỳ đánh giá (KSĐN, GK1, CK1, GK2, CK2) để tiến hành nhập điểm và nhận xét.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id} className="text-slate-800">
                  Năm học: {y.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selection Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 mt-6 bg-black/20 p-4 rounded-xl backdrop-blur-md border border-white/10">
          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Bậc học:</label>
            <select
              value={selectedLevelFilter}
              onChange={(e) => {
                setSelectedLevelFilter(e.target.value)
                setSelectedGradeFilter("ALL")
              }}
              className="w-full bg-white text-slate-800 font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none"
            >
              <option value="ALL">-- Tất cả Bậc --</option>
              <option value="TieuHoc">Tiểu học (1-5)</option>
              <option value="THCS">THCS (6-9)</option>
              <option value="THPT">THPT (10-12)</option>
              <option value="MamNon">Mầm non</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Khối học:</label>
            <select
              value={selectedGradeFilter}
              onChange={(e) => setSelectedGradeFilter(e.target.value)}
              className="w-full bg-white text-slate-800 font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none"
            >
              <option value="ALL">-- Tất cả Khối --</option>
              {selectedLevelFilter === "TieuHoc" && ["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5"].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
              {selectedLevelFilter === "THCS" && ["Khối 6", "Khối 7", "Khối 8", "Khối 9"].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
              {selectedLevelFilter === "THPT" && ["Khối 10", "Khối 11", "Khối 12"].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
              {selectedLevelFilter === "ALL" && ["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5", "Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Hệ học:</label>
            <select
              value={selectedSystemFilter}
              onChange={(e) => setSelectedSystemFilter(e.target.value)}
              className="w-full bg-white text-slate-800 font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none"
            >
              <option value="ALL">-- Tất cả Hệ --</option>
              {educationSystemOptions.map(sys => (
                <option key={sys} value={sys}>{sys}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Lớp giảng dạy ({filteredClasses.length}):</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-white text-slate-800 font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none"
            >
              {filteredClasses.map(c => (
                <option key={c.id} value={c.id}>{c.className} ({c.grade || c.level})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Môn giảng dạy:</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-white text-slate-800 font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.subjectName} ({s.subjectCode})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Kỳ đánh giá:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-teal-100 text-teal-950 font-extrabold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none"
            >
              {EVAL_PERIODS.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Gradebook Container */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-[#00A99D]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Sổ điểm Lớp {currentClass?.className || "Lớp"} - Môn {currentSubject?.subjectName || "Môn"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Đang làm việc tại Kỳ: <strong className="text-teal-700">{selectedPeriod}</strong> | Tổng số học sinh: <strong>{gradeSheetData.students.length}</strong>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportExcel}
              accept=".xlsx, .xls"
              className="hidden"
            />

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất Excel Mẫu
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 rounded-xl text-xs font-bold transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Excel
            </button>

            <button
              type="button"
              onClick={handleSaveGradeSheet}
              disabled={savingEntries}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#00A99D] hover:bg-[#008c82] text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              {savingEntries ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Lưu Sổ Điểm
            </button>
          </div>
        </div>

        {/* Table view */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          {loadingSheet ? (
            <div className="text-center py-12 text-slate-400 text-xs">Đang tải dữ liệu sổ điểm...</div>
          ) : gradeSheetData.students.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">Chưa có danh sách học sinh cho lớp học này</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800 text-white font-bold">
                  <th className="py-3 px-3 w-12 text-center border-r border-slate-700">STT</th>
                  <th className="py-3 px-3 w-28 border-r border-slate-700">Mã HS</th>
                  <th className="py-3 px-3 w-48 border-r border-slate-700">Họ và tên</th>
                  <th className="py-3 px-3 w-32 border-r border-slate-700">Môn học</th>
                  
                  {activeColNames.map((colName: string, idx: number) => (
                    <th key={idx} className="py-3 px-3 text-center border-r border-slate-700 bg-slate-700/60 min-w-[90px]">
                      {colName}
                    </th>
                  ))}

                  {gradeSheetData.config?.hasCompositeColumn !== false && (
                    <th className="py-3 px-3 text-center border-r border-slate-700 bg-teal-800 min-w-[110px]">
                      Điểm thành phần
                    </th>
                  )}

                  {gradeSheetData.config?.hasRemarkColumn !== false && (
                    <th className="py-3 px-3 border-slate-700 bg-indigo-950 min-w-[200px]">
                      Nhận xét của GVBM
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {gradeSheetData.students.map((st, sIdx) => {
                  const entry = gradeSheetData.entries[st.id] || { componentScores: {}, compositeScore: "", remark: "" }

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-500 border-r border-slate-200">
                        {sIdx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 border-r border-slate-200">
                        {st.studentCode}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-200">
                        {st.studentName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium border-r border-slate-200">
                        {currentSubject?.subjectName || "Môn"}
                      </td>

                      {activeColNames.map((_: any, cIdx: number) => (
                        <td key={cIdx} className="py-2 px-2 text-center border-r border-slate-200">
                          <input
                            type="text"
                            value={entry.componentScores[`col${cIdx}`] ?? ""}
                            onChange={(e) => handleScoreChange(st.id, cIdx, e.target.value)}
                            className="w-16 text-center border border-slate-200 rounded-lg py-1 text-xs font-extrabold text-slate-800 focus:ring-2 focus:ring-[#00A99D] focus:border-[#00A99D] outline-none"
                            placeholder="0-10"
                          />
                        </td>
                      ))}

                      {gradeSheetData.config?.hasCompositeColumn !== false && (
                        <td className="py-2 px-2 text-center border-r border-slate-200 bg-teal-50/50">
                          <span className="font-black text-sm text-[#00A99D]">
                            {entry.compositeScore || "-"}
                          </span>
                        </td>
                      )}

                      {gradeSheetData.config?.hasRemarkColumn !== false && (
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={entry.remark ?? ""}
                            onChange={(e) => handleRemarkChange(st.id, e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none"
                            placeholder="Nhập nhận xét..."
                          />
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
