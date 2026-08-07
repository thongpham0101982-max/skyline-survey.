"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import * as XLSX from "xlsx"
import { 
  FileSpreadsheet, 
  Settings, 
  Save, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Upload, 
  RefreshCw, 
  BookOpen, 
  Users, 
  Layers, 
  Award,
  Edit2,
  Trash2,
  Sliders,
  FileText
} from "lucide-react"

interface Props {
  academicYears: any[]
  activeYearId: string
  classes: any[]
  subjects: any[]
}

const EVAL_PERIODS = [
  { code: "KSĐN", name: "Khảo sát đầu năm (KSĐN)" },
  { code: "GK1", name: "Giữa kỳ 1 (GK1)" },
  { code: "CK1", name: "Cuối kỳ 1 (CK1)" },
  { code: "GK2", name: "Giữa kỳ 2 (GK2)" },
  { code: "CK2", name: "Cuối kỳ 2 (CK2)" }
]

const GRADES = [
  "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5",
  "Khối 6", "Khối 7", "Khối 8", "Khối 9",
  "Khối 10", "Khối 11", "Khối 12"
]

export function DiemNhanXetAdminClient({ academicYears, activeYearId, classes, subjects }: Props) {
  const [activeTab, setActiveTab] = useState<"config" | "grades">("config")

  // Common filters
  const [selectedYearId, setSelectedYearId] = useState(activeYearId || (academicYears[0]?.id || ""))

  // --- TAB 1: Config Form states ---
  const [configGrade, setConfigGrade] = useState("ALL")
  const [configSubjectId, setConfigSubjectId] = useState("ALL")
  const [configPeriod, setConfigPeriod] = useState("ALL")
  const [columnCount, setColumnCount] = useState(3)
  const [columnNames, setColumnNames] = useState<string[]>(["Điểm Miệng", "Điểm 15 Phút", "Điểm 1 Tiết"])
  const [hasComposite, setHasComposite] = useState(true)
  const [hasRemark, setHasRemark] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [savedConfigs, setSavedConfigs] = useState<any[]>([])
  const [loadingConfigs, setLoadingConfigs] = useState(false)

  // Sync columnNames length when columnCount changes
  useEffect(() => {
    setColumnNames(prev => {
      const next = [...prev]
      if (next.length < columnCount) {
        for (let i = next.length; i < columnCount; i++) {
          next.push(`Cột điểm ${i + 1}`)
        }
      } else if (next.length > columnCount) {
        return next.slice(0, columnCount)
      }
      return next
    })
  }, [columnCount])

  // Fetch saved configs
  const fetchConfigs = async () => {
    try {
      setLoadingConfigs(true)
      const res = await fetch(`/api/admin/ktdbcl/grade-configs?academicYearId=${selectedYearId}`)
      const data = await res.json()
      if (data.success) {
        setSavedConfigs(data.configs || [])
      }
    } catch (err) {
      console.error("Lỗi tải danh sách cấu hình:", err)
    } finally {
      setLoadingConfigs(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [selectedYearId])

  // Auto fill form if a config already exists for selected Khối + Môn + Kỳ
  useEffect(() => {
    if (!savedConfigs || savedConfigs.length === 0) return
    const match = savedConfigs.find(c => {
      const gMatch = c.grade === configGrade
      const sMatch = (c.subjectId || "ALL") === configSubjectId
      const pMatch = (c.evaluationPeriod || "ALL") === configPeriod
      return gMatch && sMatch && pMatch
    })
    if (match) {
      let cols: string[] = []
      try {
        cols = typeof match.columnNames === "string" ? JSON.parse(match.columnNames) : match.columnNames || []
      } catch (_) {}
      if (cols.length > 0) {
        setColumnCount(cols.length)
        setColumnNames(cols)
      }
      setHasComposite(match.hasCompositeColumn !== false)
      setHasRemark(match.hasRemarkColumn !== false)
    }
  }, [configGrade, configSubjectId, configPeriod, savedConfigs])

    const handleSelectConfig = (cfg: any) => {
    setConfigGrade(cfg.grade || "ALL")
    setConfigSubjectId(cfg.subjectId || "ALL")
    setConfigPeriod(cfg.evaluationPeriod || "ALL")
    let cols: string[] = []
    try {
      cols = typeof cfg.columnNames === "string" ? JSON.parse(cfg.columnNames) : cfg.columnNames || []
    } catch (_) {}
    if (cols.length > 0) {
      setColumnCount(cols.length)
      setColumnNames(cols)
    }
    setHasComposite(cfg.hasCompositeColumn !== false)
    setHasRemark(cfg.hasRemarkColumn !== false)
  }

  const handleDeleteConfig = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mẫu cấu hình này?")) return
    try {
      const res = await fetch(`/api/admin/ktdbcl/grade-configs?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        alert("Đã xóa cấu hình mẫu!")
        fetchConfigs()
      } else {
        alert("Lỗi: " + (data.error || "Không thể xóa"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    }
  }

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true)
      const res = await fetch("/api/admin/ktdbcl/grade-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          grade: configGrade,
          subjectId: configSubjectId === "ALL" ? null : configSubjectId,
          evaluationPeriod: configPeriod,
          columnCount,
          columnNames,
          hasCompositeColumn: hasComposite,
          hasRemarkColumn: hasRemark,
          formula: "AVERAGE"
        })
      })
      const data = await res.json()
      if (data.success) {
        alert("Đã lưu cấu hình cột điểm thành công!")
        fetchConfigs()
      } else {
        alert("Lỗi: " + (data.error || "Không thể lưu cấu hình"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setSavingConfig(false)
    }
  }

  // --- TAB 2: Grade Entry states ---
  // Level and Grade filters for Tab 2
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("ALL")
  const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL")

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

      return true
    })
  }, [classes, selectedLevelFilter, selectedGradeFilter])

  useEffect(() => {
    if (filteredClasses.length > 0 && !filteredClasses.some(c => c.id === selectedClassId)) {
      setSelectedClassId(filteredClasses[0].id)
    }
  }, [filteredClasses])
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || "")
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || "")
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
    if (activeTab === "grades") {
      fetchGradeSheet()
    }
  }, [activeTab, selectedClassId, selectedSubjectId, selectedPeriod, selectedYearId])

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

    const fileName = `BangDiem_${currentClass?.className || "Lop"}_${currentSubject?.subjectCode || "Mon"}_${selectedPeriod}.xlsx`
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

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A99D] rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-teal-200 mb-2">
              <Award className="w-3.5 h-3.5 text-teal-300" />
              Khảo thí & Đảm bảo Chất lượng
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Quản lý Điểm & Nhận xét</h1>
            <p className="text-teal-100 text-xs md:text-sm mt-1 max-w-2xl">
              Cấu hình mẫu file nhập điểm các môn học theo Khối (1-8 cột điểm tùy chỉnh), chọn Kỳ đánh giá (KSĐN, GK1, CK1, GK2, CK2) và quản lý sổ điểm học sinh.
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 border-t border-white/10 pt-4">
          <button
            onClick={() => setActiveTab("config")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "config"
                ? "bg-white text-[#003B3A] shadow-lg shadow-black/10 scale-105"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4" />
            1. Cấu hình Mẫu File & Cột điểm theo Khối
          </button>
          <button
            onClick={() => setActiveTab("grades")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "grades"
                ? "bg-white text-[#003B3A] shadow-lg shadow-black/10 scale-105"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            2. Quản lý & Nhập Sổ điểm Học sinh
          </button>
        </div>
      </div>

      {/* TAB 1: CONFIG FORM */}
      {activeTab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form setup */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#00A99D]" />
                Thiết lập Định dạng File nhập điểm
              </h2>
              <span className="text-xs text-slate-400 font-normal">Tối đa khoảng 8 cột điểm thành phần</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Áp dụng Khối:</label>
                <select
                  value={configGrade}
                  onChange={(e) => setConfigGrade(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#00A99D] outline-none"
                >
                  <option value="ALL">-- Tất cả các Khối --</option>
                  {GRADES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Áp dụng Môn học:</label>
                <select
                  value={configSubjectId}
                  onChange={(e) => setConfigSubjectId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#00A99D] outline-none"
                >
                  <option value="ALL">-- Tất cả môn (Mẫu chung) --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.subjectName} ({s.subjectCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kỳ đánh giá:</label>
                <select
                  value={configPeriod}
                  onChange={(e) => setConfigPeriod(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#00A99D] outline-none"
                >
                  <option value="ALL">-- Tất cả Kỳ đánh giá --</option>
                  {EVAL_PERIODS.map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Column count selection */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 block">Số lượng cột điểm thành phần (Tùy chọn linh động 1 hoặc nhiều cột):</label>
                  <span className="text-[11px] text-slate-500 font-normal">Có thể chọn nhanh từ 1 đến 8 cột hoặc nhấn Thêm/Bớt cột để điều chỉnh linh hoạt.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setColumnCount(num)}
                      className={`w-8 h-8 rounded-lg text-xs font-extrabold transition-all ${
                        columnCount === num
                          ? "bg-[#00A99D] text-white shadow-md shadow-teal-500/20 scale-110"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <div className="h-6 w-[1px] bg-slate-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => setColumnCount(prev => Math.max(1, prev - 1))}
                    disabled={columnCount <= 1}
                    className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                    title="Bớt cột điểm"
                  >
                    - Bớt cột
                  </button>
                  <button
                    type="button"
                    onClick={() => setColumnCount(prev => Math.min(12, prev + 1))}
                    disabled={columnCount >= 12}
                    className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                    title="Thêm cột điểm"
                  >
                    + Thêm cột
                  </button>
                </div>
              </div>

              {/* Dynamic Column Name Inputs */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700">Tên các cột điểm thành phần (Đặt tên tùy chỉnh):</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {columnNames.map((name, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400 w-12 shrink-0">Cột {idx + 1}:</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          const val = e.target.value
                          setColumnNames(prev => prev.map((n, i) => i === idx ? val : n))
                        }}
                        placeholder={`Tên cột ${idx + 1}`}
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-[#00A99D] outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={hasComposite}
                  onChange={(e) => setHasComposite(e.target.checked)}
                  className="w-4 h-4 text-[#00A99D] rounded border-slate-300 focus:ring-[#00A99D]"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Cột Điểm thành phần (Tổng hợp)</div>
                  <div className="text-[11px] text-slate-500 font-normal">Tự động tính điểm tổng hợp từ các cột điểm thành phần</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={hasRemark}
                  onChange={(e) => setHasRemark(e.target.checked)}
                  className="w-4 h-4 text-[#00A99D] rounded border-slate-300 focus:ring-[#00A99D]"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Cột Nhận xét của GVBM</div>
                  <div className="text-[11px] text-slate-500 font-normal">Cho phép GVBM nhập đánh giá/nhận xét cho từng học sinh</div>
                </div>
              </label>
            </div>

            {/* Live Excel Preview */}
            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200/60 space-y-2">
              <div className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Xem trước Cấu trúc Cột File nhập điểm Excel:
              </div>
              <div className="overflow-x-auto">
                <div className="inline-flex gap-1">
                  {["STT", "Mã HS", "Họ tên", "Môn học"].map(f => (
                    <span key={f} className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[11px] font-bold rounded-md border border-slate-300">
                      {f}
                    </span>
                  ))}
                  {columnNames.map((name, i) => (
                    <span key={i} className="px-2.5 py-1 bg-teal-100 text-teal-800 text-[11px] font-bold rounded-md border border-teal-300">
                      {name || `Cột ${i + 1}`}
                    </span>
                  ))}
                  {hasComposite && (
                    <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-[11px] font-bold rounded-md border border-indigo-300">
                      Điểm thành phần
                    </span>
                  )}
                  {hasRemark && (
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-[11px] font-bold rounded-md border border-purple-300">
                      Nhận xét
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#00A99D] hover:bg-[#008c82] text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
              >
                {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu Cấu Hình Mẫu File
              </button>
            </div>
          </div>

          {/* Saved Configs List */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#00A99D]" />
              Danh sách Cấu hình Mẫu đã lưu ({savedConfigs.length})
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 max-h-[550px] pr-1">
              {loadingConfigs ? (
                <div className="text-center py-8 text-slate-400 text-xs">Đang tải...</div>
              ) : savedConfigs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">Chưa có cấu hình nào được lưu</div>
              ) : (
                savedConfigs.map((cfg) => {
                  let cols: string[] = []
                  try {
                    cols = typeof cfg.columnNames === "string" ? JSON.parse(cfg.columnNames) : cfg.columnNames || []
                  } catch (_) {}

                  return (
                    <div key={cfg.id} className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-400/50 bg-slate-50/50 space-y-2 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          {cfg.grade === "ALL" ? "Tất cả các Khối" : cfg.grade}
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                          {cfg.evaluationPeriod === "ALL" ? "Tất cả Kỳ" : cfg.evaluationPeriod}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 font-medium">
                        Môn: <strong className="text-slate-800">{cfg.subject ? cfg.subject.subjectName : "Mẫu chung tất cả môn"}</strong>
                      </div>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {cols.map((colName, i) => (
                          <span key={i} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-medium">
                            {colName}
                          </span>
                        ))}
                      </div>

                      <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between border-t border-slate-100">
                        <span>Cột tổng hợp: {cfg.hasCompositeColumn ? "Có" : "Không"} | Nhận xét: {cfg.hasRemarkColumn ? "Có" : "Không"}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectConfig(cfg)}
                            className="px-2 py-0.5 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded font-bold transition-all"
                            title="Nạp cấu hình lên Form"
                          >
                            Xem / Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteConfig(cfg.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Xóa cấu hình"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GRADE ENTRY MANAGEMENT */}
      {activeTab === "grades" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          {/* Controls & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Bậc học:</label>
                <select
                  value={selectedLevelFilter}
                  onChange={(e) => {
                    setSelectedLevelFilter(e.target.value)
                    setSelectedGradeFilter("ALL")
                  }}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none bg-emerald-50/60 text-emerald-900 border-emerald-200"
                >
                  <option value="ALL">-- Tất cả Bậc học --</option>
                  <option value="TieuHoc">Tiểu học (Lớp 1-5)</option>
                  <option value="THCS">THCS (Lớp 6-9)</option>
                  <option value="THPT">THPT (Lớp 10-12)</option>
                  <option value="MamNon">Mầm non</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Khối học:</label>
                <select
                  value={selectedGradeFilter}
                  onChange={(e) => setSelectedGradeFilter(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none bg-sky-50/60 text-sky-900 border-sky-200"
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
                  {selectedLevelFilter === "ALL" && GRADES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Lớp học ({filteredClasses.length}):</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none"
                >
                  {filteredClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.className} ({c.grade || c.level})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Môn học:</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.subjectName} ({s.subjectCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Kỳ đánh giá:</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none bg-teal-50 text-teal-800 border-teal-200"
                >
                  {EVAL_PERIODS.map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchGradeSheet}
                className="mt-5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                title="Tải lại"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Action buttons: Export / Import / Save */}
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

          {/* Grade Sheet Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            {loadingSheet ? (
              <div className="text-center py-12 text-slate-400 text-xs">Đang tải sổ điểm...</div>
            ) : gradeSheetData.students.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">Không có học sinh nào trong lớp học đã chọn</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold">
                    <th className="py-3 px-3 w-12 text-center border-r border-slate-700">STT</th>
                    <th className="py-3 px-3 w-28 border-r border-slate-700">Mã HS</th>
                    <th className="py-3 px-3 w-48 border-r border-slate-700">Họ và tên</th>
                    <th className="py-3 px-3 w-32 border-r border-slate-700">Môn học</th>
                    
                    {/* Configured Component score columns */}
                    {activeColNames.map((colName: string, idx: number) => (
                      <th key={idx} className="py-3 px-3 text-center border-r border-slate-700 bg-slate-700/60 min-w-[90px]">
                        {colName}
                      </th>
                    ))}

                    {/* Composite Score Column */}
                    {gradeSheetData.config?.hasCompositeColumn !== false && (
                      <th className="py-3 px-3 text-center border-r border-slate-700 bg-teal-800 min-w-[110px]">
                        Điểm thành phần
                      </th>
                    )}

                    {/* Remark Column */}
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
                    const currentSubject = subjects.find(s => s.id === selectedSubjectId)

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

                        {/* Component Score Inputs */}
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

                        {/* Composite score input/display */}
                        {gradeSheetData.config?.hasCompositeColumn !== false && (
                          <td className="py-2 px-2 text-center border-r border-slate-200 bg-teal-50/50">
                            <span className="font-black text-sm text-[#00A99D]">
                              {entry.compositeScore || "-"}
                            </span>
                          </td>
                        )}

                        {/* Remark Input */}
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
      )}
    </div>
  )
}
