"use client"
export function normalizeSheetToClassCode(sheetName: string, availableClasses: any[] = []): string {
  if (!sheetName) return ""
  const sheetKey = sheetName.toLowerCase().replace(/[^a-z0-9]/g, "")

  if (Array.isArray(availableClasses) && availableClasses.length > 0) {
    const match = availableClasses.find(c => {
      const classKey = String(c.classCode || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      return classKey === sheetKey
    })
    if (match) return match.classCode
  }

  let converted = sheetName.replace(/^(\d+)_(\d+)_(.*)$/i, (m, g1, g2, g3) => `${g1}.${g2}_${g3.toUpperCase()}`)
  converted = converted.replace(/^(\d+)_(\d+)([a-zA-Z]+)_(.*)$/i, (m, g1, g2, g3, g4) => `${g1}.${g2}${g3.toUpperCase()}_${g4.toUpperCase()}`)
  converted = converted.replace(/^(\d+)([a-zA-Z]+)_(.*)$/i, (m, g1, g2, g3) => `${g1}${g2.toUpperCase()}_${g3.toUpperCase()}`)

  return converted
}

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  ChevronRight, 
  Users, 
  Layers, 
  Settings, 
  Check, 
  RefreshCw,
  Plus,
  HelpCircle,
  Play,
  Info,
  ArrowRight,
  FileText,
  Award,
  RotateCcw
} from "lucide-react"

interface ImportKQHTClientProps {
  academicYears: any[]
  campuses: any[]
  classes: any[]
  subjects: any[]
  activeYearId: string
}

export function ImportKQHTClient({ 
  academicYears, 
  campuses, 
  classes, 
  subjects: dbSubjects, 
  activeYearId 
}: ImportKQHTClientProps) {
  // Form states
  const [selectedYearId, setSelectedYearId] = useState(activeYearId || (academicYears[0]?.id || ""))
  const [level, setLevel] = useState<"PRIMARY" | "SECONDARY">("SECONDARY")
  const [semester, setSemester] = useState<"HK1" | "HK2" | "CN">("HK1")

  // File parsing states
  const [parsing, setParsing] = useState(false)
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  
  // Selection states
  const [selectedSheets, setSelectedSheets] = useState<Record<string, boolean>>({}) // key: sheetName, value: selected
  const [activeSheet, setActiveSheet] = useState<string>("")
  const [parsedData, setParsedData] = useState<Record<string, any>>({}) // key: sheetName, value: parsed data object

  // Field selection configurations
  const [updateProfile, setUpdateProfile] = useState(true)
  const [importAcademicRating, setImportAcademicRating] = useState(true)
  const [importConductRating, setImportConductRating] = useState(true)
  const [importAbsences, setImportAbsences] = useState(true)
  const [importReward, setImportReward] = useState(true)
  const [importPromotion, setImportPromotion] = useState(true)
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, boolean>>({}) // key: mappedSubjectCode, value: selected

  // Subject mapping configuration
  const [excelSubjects, setExcelSubjects] = useState<{ excelHeader: string; originalHeader: string; mappedSubjectCode: string; isNew: boolean; subType: "score" | "grade" }[]>([])
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [classMismatches, setClassMismatches] = useState<Record<string, any>>({})
  const [semesterMismatchWarning, setSemesterMismatchWarning] = useState<string | null>(null)
  const [statsClasses, setStatsClasses] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [filterSearch, setFilterSearch] = useState("")
  const [filterCampus, setFilterCampus] = useState("ALL")
  const [filterGrade, setFilterGrade] = useState("ALL")
  const [filterStatus, setFilterStatus] = useState("ALL")

  // Student row selection states
  const [selectedStudents, setSelectedStudents] = useState<Record<string, Record<string, boolean>>>({}) // key: sheetName, value: { studentCode: boolean }

  // Upload/Progress states
  const [importing, setImporting] = useState(false)
  const [currentProgressIndex, setCurrentProgressIndex] = useState(0)
  const [importLogs, setImportLogs] = useState<string[]>([])
  const [importResult, setImportResult] = useState<{
    studentsCount: number
    scoresCount: number
    summariesCount: number
    errors: string[]
    importedStudents?: { studentCode: string; studentName: string; classCode: string; status: "success" | "error"; errorMsg?: string }[]
  } | null>(null)

  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const detectedLevelRef = useRef<"PRIMARY" | "SECONDARY" | null>(null)
  const section2Ref = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  // Normalize semester options based on Level
  const fetchClassStats = async () => {
    try {
      setLoadingStats(true)
      const res = await fetch(`/api/admin/ktdbcl/import-kqht?academicYearId=${selectedYearId || activeYearId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setStatsClasses(data.classes || [])
        }
      }
    } catch (err) {
      console.warn("Lỗi tải thống kê lớp học: ", err)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    fetchClassStats()
  }, [selectedYearId])

  const uniqueCampuses = useMemo(() => {
    const campuses = new Set<string>()
    statsClasses.forEach((c: any) => {
      if (c.campusName) campuses.add(c.campusName.trim())
    })
    return Array.from(campuses).sort()
  }, [statsClasses])

  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>()
    statsClasses.forEach((c: any) => {
      const match = c.classCode?.match(/^(\d+)/)
      if (match) {
        grades.add(match[1])
      }
    })
    return Array.from(grades).sort((a, b) => parseInt(a) - parseInt(b))
  }, [statsClasses])

  const filteredStatsClasses = useMemo(() => {
    return statsClasses.filter((c: any) => {
      if (filterSearch) {
        const query = filterSearch.toLowerCase().trim()
        const codeMatch = c.classCode?.toLowerCase().includes(query)
        const nameMatch = c.className?.toLowerCase().includes(query)
        if (!codeMatch && !nameMatch) return false
      }
      if (filterCampus !== "ALL" && c.campusName?.trim() !== filterCampus) {
        return false
      }
      if (filterGrade !== "ALL") {
        const match = c.classCode?.match(/^(\d+)/)
        const grade = match ? match[1] : ""
        if (grade !== filterGrade) return false
      }
      if (filterStatus !== "ALL") {
        const isHk1Done = c.hk1 && c.hk1 !== "Trống"
        const isHk2Done = c.hk2 && c.hk2 !== "Trống"
        const isCnDone = c.cn && c.cn !== "Trống"
        if (filterStatus === "DONE") {
          const allDone = isHk1Done && isHk2Done && isCnDone
          if (!allDone) return false
        } else if (filterStatus === "PENDING") {
          const allDone = isHk1Done && isHk2Done && isCnDone
          if (allDone) return false
        }
      }
      return true
    })
  }, [statsClasses, filterSearch, filterCampus, filterGrade, filterStatus])

  const semesterOptions = useMemo(() => {
    if (level === "PRIMARY") {
      return [
        { value: "HK1", label: "Học kỳ 1" },
        { value: "CN", label: "Cả năm" }
      ]
    }
    return [
      { value: "HK1", label: "Học kỳ 1" },
      { value: "HK2", label: "Học kỳ 2" },
      { value: "CN", label: "Cả năm" }
    ]
  }, [level])

  // Handle Level Change
  const handleLevelChange = (newLevel: "PRIMARY" | "SECONDARY") => {
    setLevel(newLevel)
    if (newLevel === "PRIMARY" && semester === "HK2") {
      setSemester("HK1")
    }
  }

  // Parse Excel File
  // Parse Excel File (only loads the workbook into state)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setParsing(true)
    setWorkbook(null)
    setSheetNames([])
    setParsedData({})
    setExcelSubjects([])
    setClassMismatches({})
    setImportResult(null)
    setImportLogs([])

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array" })
      
      // Auto detect level from first sheet
      const firstSheetName = wb.SheetNames[0]
      const ws = wb.Sheets[firstSheetName]
      if (ws) {
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][]
        let fileText = ""
        for (let r = 0; r < Math.min(25, rawRows.length); r++) {
          fileText += " " + (rawRows[r] || []).join(" ")
        }
        // Normalize NFC to handle combined unicode characters from Excel
        fileText = fileText.normalize("NFC").toLowerCase()
        
        let detectedLevel: "PRIMARY" | "SECONDARY" = "PRIMARY"

        const isPrimaryFile = 
          /\b[1-5](\.|\_|\s|int|uk|s)/i.test(fileText) ||
          fileText.includes("tiểu học") || 
          fileText.includes("tieu hoc") ||
          fileText.includes("tiếng việt") || 
          fileText.includes("tieng viet") || 
          fileText.includes("mức đạt được") ||
          fileText.includes("muc dat duoc") ||
          fileText.includes("hoàn thành xuất sắc") ||
          fileText.includes("môn học và hoạt động giáo dục") ||
          fileText.includes("điểm ktđk") ||
          fileText.includes("khối 1") || fileText.includes("khối 2") || fileText.includes("khối 3") || fileText.includes("khối 4") || fileText.includes("khối 5")

        const isSecondaryFile = 
          /\b(6|7|8|9|10|11|12)(\.|\_|\s|s)/i.test(fileText) ||
          fileText.includes("khối 6") || fileText.includes("khoi 6") ||
          fileText.includes("khối 7") || fileText.includes("khoi 7") ||
          fileText.includes("khối 8") || fileText.includes("khoi 8") ||
          fileText.includes("khối 9") || fileText.includes("khoi 9") ||
          fileText.includes("khối 10") || fileText.includes("khoi 10") ||
          fileText.includes("khối 11") || fileText.includes("khoi 11") ||
          fileText.includes("khối 12") || fileText.includes("khoi 12") ||
          fileText.includes("(hs 1)") || fileText.includes("(hs 2)") ||
          fileText.includes("(n.xét)") || fileText.includes("(n.xet)") ||
          fileText.includes("khtn") || fileText.includes("ls&đl") ||
          fileText.includes("kết quả rèn luyện") || fileText.includes("ket qua ren luyen")

        if (isPrimaryFile) {
          detectedLevel = "PRIMARY"
        } else if (isSecondaryFile) {
          detectedLevel = "SECONDARY"
        }
        
        setLevel(detectedLevel)
        detectedLevelRef.current = detectedLevel
        console.log("Auto detected level:", detectedLevel)
      }

      setWorkbook(wb)
    } catch (err: any) {
      alert("Lỗi đọc file Excel: " + err.message)
      setParsing(false)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Reactive parsing effect - runs whenever workbook, level, or semester changes
  useEffect(() => {
    if (!workbook) return

    const parseWorkbookData = async () => {
      setParsing(true)
      try {
        const rawNames = workbook.SheetNames || []
        if (rawNames.length === 0) return

        // Map sheet names to official normalized DB class codes
        const rawToNormMap = new Map<string, string>()
        const names: string[] = []
        rawNames.forEach(rawName => {
          const normCode = normalizeSheetToClassCode(rawName, classes)
          rawToNormMap.set(rawName, normCode)
          names.push(normCode)
        })

        let effectiveLevel: "PRIMARY" | "SECONDARY" = detectedLevelRef.current || level
        
        // Cache sheet raw rows once to prevent repeated sheet_to_json calls
        const sheetRowsMap = new Map<string, any[][]>()
        let sheetScanText = names.join(" ") + " "

        rawNames.forEach(rawName => {
          const ws = workbook.Sheets[rawName]
          if (!ws) return
          const name = rawToNormMap.get(rawName) || rawName
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][]
          sheetRowsMap.set(name, rows)
          for (let r = 0; r < Math.min(12, rows.length); r++) {
            sheetScanText += " " + (rows[r] || []).join(" ")
          }
        })
        sheetScanText = sheetScanText.normalize("NFC").toLowerCase()

        const normScan = (sheetScanText + " " + names.join(" ")).normalize("NFC").toLowerCase()
        const isPrimaryPattern = 
          /\b[1-5](\.|\_|\s|int|uk|s)/i.test(normScan) ||
          normScan.includes("1.1_cs") || normScan.includes("1.2_cs") || normScan.includes("1.3_cs") || normScan.includes("1.4_cs") || normScan.includes("1.5_cs") || normScan.includes("1.6_cs") ||
          normScan.includes("2.1_cs") || normScan.includes("2.2_cs") || normScan.includes("3.1_cs") || normScan.includes("4.1_cs") || normScan.includes("5.1_cs") ||
          normScan.includes("khối 1") || normScan.includes("khối 2") || normScan.includes("khối 3") || normScan.includes("khối 4") || normScan.includes("khối 5") ||
          normScan.includes("tiếng việt") || normScan.includes("môn học và hoạt động giáo dục") || normScan.includes("mức đạt được") || normScan.includes("điểm ktđk")

        const isSecondaryPattern =
          /\b(6|7|8|9|10|11|12)[s_]/i.test(normScan) ||
          normScan.includes("khối 6") || normScan.includes("khối 7") || normScan.includes("khối 8") || normScan.includes("khối 9") || normScan.includes("khối 10") || normScan.includes("khối 11") || normScan.includes("khối 12") ||
          normScan.includes("khtn") || normScan.includes("ls&đl") || normScan.includes("gdcd") || normScan.includes("ndgđđợp") || normScan.includes("(hs 1)")

        if (isPrimaryPattern) {
          effectiveLevel = "PRIMARY"
          if (level !== "PRIMARY") setLevel("PRIMARY")
          detectedLevelRef.current = "PRIMARY"
        } else if (isSecondaryPattern) {
          effectiveLevel = "SECONDARY"
          if (level !== "SECONDARY") setLevel("SECONDARY")
          detectedLevelRef.current = "SECONDARY"
        }
        setSheetNames(names)
        
        // Default select all sheets
        setSelectedSheets(prev => {
          const next = { ...prev }
          names.forEach(name => {
            if (next[name] === undefined) {
              next[name] = true
            }
          })
          return next
        })
        
        if (!activeSheet || !names.includes(activeSheet)) {
          setActiveSheet(names[0])
        }

        // Parse data for each sheet
        const allParsed: Record<string, any> = {}
        const detectedExcelSubjectsMap = new Map<string, { originalHeader: string; mappedSubjectCode: string; isNew: boolean; subType: "score" | "grade" }>()
        const initialSelectedStudents: Record<string, Record<string, boolean>> = {}

        names.forEach(sheetName => {
          const rawRows = sheetRowsMap.get(sheetName) || []
          
          if (rawRows.length === 0) return

          // Semester title validation across all sheets and levels
          if (sheetName === names[0]) {
            let fileText = names.join(" ") + " "
            for (let r = 0; r < Math.min(10, rawRows.length); r++) {
              fileText += " " + (rawRows[r] || []).join(" ")
            }
            fileText = fileText.normalize("NFC").toLowerCase()

            const hasHK1 = fileText.includes("học kỳ 1") || fileText.includes("học kì 1") || fileText.includes("hk 1") || fileText.includes("hk1") || fileText.includes("học kỳ i") || fileText.includes("học kì i") || fileText.includes("hk i") || fileText.includes("giữa học kỳ i") || fileText.includes("cuối học kỳ i")
            const hasHK2 = fileText.includes("học kỳ 2") || fileText.includes("học kì 2") || fileText.includes("hk 2") || fileText.includes("hk2") || fileText.includes("học kỳ ii") || fileText.includes("học kì ii") || fileText.includes("hk ii") || fileText.includes("giữa học kỳ ii")
            const hasCN = fileText.includes("cả năm") || fileText.includes("ca nam") || fileText.includes("cuối năm") || fileText.includes("cuoi nam")

            let warning: string | null = null

            if (semester === "HK1" && (hasCN || (hasHK2 && !hasHK1))) {
              warning = '⚠️ CẢNH BÁO SAI THÔNG TIN FILE: Tệp Excel của bạn là điểm Học kỳ 2 / Cả năm, nhưng bạn đang chọn Định kỳ là "Học kỳ 1". Vui lòng kiểm tra lại!'
            } else if (semester === "HK2" && (hasHK1 && !hasHK2 && !hasCN)) {
              warning = '⚠️ CẢNH BÁO SAI THÔNG TIN FILE: Tệp Excel của bạn là điểm Học kỳ 1, nhưng bạn đang chọn Định kỳ là "Học kỳ 2". Vui lòng kiểm tra lại!'
            } else if (semester === "CN" && (hasHK1 || hasHK2) && !hasCN) {
              warning = '⚠️ CẢNH BÁO SAI THÔNG TIN FILE: Tệp Excel của bạn là điểm Học kỳ 1 / Học kỳ 2, nhưng bạn đang chọn Định kỳ là "Cả năm". Vui lòng kiểm tra lại!'
            }

            setSemesterMismatchWarning(warning)
          }

          // Locate main header row
          let mainHeaderRowIndex = -1
          for (let r = 0; r < rawRows.length; r++) {
            const row = rawRows[r]
            if (row && row.some(cell => {
              const s = String(cell).toLowerCase().normalize("NFC")
              return s.includes("mã học sinh") || 
                     s.includes("mã hs") || 
                     s.includes("họ và tên") || 
                     s.includes("họ tên") || 
                     s.includes("ngôn ngữ") || 
                     s.includes("ng.ngữ") || 
                     (s.includes("stt") && row.some(c => String(c).toLowerCase().normalize("NFC").includes("sinh")))
            })) {
              mainHeaderRowIndex = r
              break
            }
          }
          if (mainHeaderRowIndex === -1) {
            for (let r = 0; r < rawRows.length; r++) {
              const row = rawRows[r]
              if (row && row.some(cell => String(cell).toLowerCase().includes("họ và tên"))) {
                mainHeaderRowIndex = r
                break
              }
            }
          }

          if (mainHeaderRowIndex === -1) return

          let mainHeaderRow = rawRows[mainHeaderRowIndex]
          let subHeaderRow = rawRows[mainHeaderRowIndex + 1] || []

          const getMergedMainHeaderValue = (colIdx: number) => {
            for (let c = colIdx; c >= 0; c--) {
              const val = String(mainHeaderRow[c] || "").trim()
              if (val) return val
            }
            return ""
          }

          const getMergedGrandparentHeaderValue = (colIdx: number) => {
            if (mainHeaderRowIndex <= 0) return ""
            const grandparentRow = rawRows[mainHeaderRowIndex - 1]
            if (!grandparentRow) return ""
            for (let c = colIdx; c >= 0; c--) {
              const val = String(grandparentRow[c] || "").trim()
              if (val) return val
            }
            return ""
          }

          // Universal Header Row Detection for Primary (Tiểu học) & Secondary (Trung học)
          let subHeaderRowIndex = -1
          for (let r = mainHeaderRowIndex + 1; r < Math.min(mainHeaderRowIndex + 6, rawRows.length); r++) {
            const row = rawRows[r]
            if (row && row.some(cell => {
              const s = String(cell).toLowerCase()
              return s.includes("mức") || s.includes("điểm") || s.includes("ktđk") || s.includes("đạt") || s.includes("hs 1") || s.includes("n.xét") || s.includes("n.xet")
            })) {
              subHeaderRowIndex = r
              break
            }
          }

          if (subHeaderRowIndex === -1) {
            subHeaderRowIndex = mainHeaderRowIndex + 1
          }

          let mainHeaderRowIndexAdjusted = mainHeaderRowIndex
          const rowBelowCheck = rawRows[mainHeaderRowIndex + 1] || []
          const rowBelowCheckText = rowBelowCheck.join(" ").toLowerCase().normalize("NFC")

          if (
            rowBelowCheckText.includes("tiếng việt") || 
            rowBelowCheckText.includes("toán") || 
            rowBelowCheckText.includes("khoa học") || 
            rowBelowCheckText.includes("tiếng anh") ||
            rowBelowCheckText.includes("đạo đức") ||
            rowBelowCheckText.includes("lịch sử và địa lý") ||
            rowBelowCheckText.includes("lịch sử và địa lí") ||
            rowBelowCheckText.includes("môn học và hoạt động giáo dục")
          ) {
            mainHeaderRowIndexAdjusted = mainHeaderRowIndex + 1
          }

          let parentHeaderRowIndex = mainHeaderRowIndex
          mainHeaderRow = rawRows[mainHeaderRowIndex]
          subHeaderRow = rawRows[subHeaderRowIndex] || []
          
          let academicRatingCol = -1
          let conductRatingCol = -1
          let rewardUnexpectedCol = -1
          let rewardCol = -1
          let notesCol = -1
          const subjectMainRow = rawRows[mainHeaderRowIndexAdjusted]
          const subjectSubRow = rawRows[subHeaderRowIndex] || []

          const getMergedSubjectMainHeaderValue = (colIdx: number, minColBound: number = 5) => {
            const maxR = subHeaderRowIndex > mainHeaderRowIndex ? subHeaderRowIndex - 1 : mainHeaderRowIndex
            const minC = Math.max(minColBound, 5)
            
            // PRIORITY 1: Check exact colIdx in main row and sub row first!
            for (let r = maxR; r >= mainHeaderRowIndex; r--) {
              const row = rawRows[r]
              if (!row) continue
              const directVal = String(row[colIdx] || "").trim()
              const valLower = directVal.toLowerCase()
              if (
                directVal && 
                !valLower.includes("môn học và hoạt động giáo dục") && 
                !valLower.includes("môn học & hoạt động giáo dục") &&
                !valLower.includes("đánh giá kết quả giáo dục") &&
                !valLower.includes("số định danh") &&
                !valLower.includes("định danh") &&
                valLower !== "stt" &&
                !valLower.includes("mã học sinh") &&
                !valLower.includes("mã hs") &&
                !valLower.includes("họ và tên") &&
                !valLower.includes("ngày sinh") &&
                valLower !== "nữ" &&
                valLower !== "p" && valLower !== "k" && valLower !== "tổng"
              ) {
                return directVal
              }
            }

            // PRIORITY 2: Only if direct cell is empty, scan backwards within same row
            for (let r = maxR; r >= mainHeaderRowIndex; r--) {
              const row = rawRows[r]
              if (!row) continue
              for (let c = colIdx - 1; c >= minC; c--) {
                const val = String(row[c] || "").trim()
                const valLower = val.toLowerCase()
                if (
                  val && 
                  !valLower.includes("môn học và hoạt động giáo dục") && 
                  !valLower.includes("môn học & hoạt động giáo dục") &&
                  !valLower.includes("đánh giá kết quả giáo dục") &&
                  !valLower.includes("số định danh") &&
                  !valLower.includes("định danh") &&
                  valLower !== "stt" &&
                  !valLower.includes("mã học sinh") &&
                  !valLower.includes("mã hs") &&
                  !valLower.includes("họ và tên") &&
                  !valLower.includes("ngày sinh") &&
                  valLower !== "nữ"
                ) {
                  return val
                }
              }
            }
            return ""
          }

          const getMergedParentHeaderValue = (colIdx: number) => {
            if (parentHeaderRowIndex < 0) return ""
            const grandparentRow = rawRows[parentHeaderRowIndex]
            if (!grandparentRow) return ""
            for (let c = colIdx; c >= 0; c--) {
              const val = String(grandparentRow[c] || "").trim()
              if (val) return val
            }
            return ""
          }

          let studentCodeCol = -1
          let studentNameCol = -1
          let dobCol = -1
          let femaleCol = -1
          let genderCol = -1
          
          let absencesPermittedCol = -1
          let absencesUnpermittedCol = -1
          let absencesTotalCol = -1
          let promotedCol = -1

          interface RatingColumnMapping {
            colIndex: number
            label: string
          }

          const academicRatingCols: RatingColumnMapping[] = []
          const rewardCuoiNamCols: RatingColumnMapping[] = []
          const rewardDotXuatCols: RatingColumnMapping[] = []

          for (let c = 0; c < mainHeaderRow.length; c++) {
            const val = String(mainHeaderRow[c] || "").trim()
            const subVal = String(subHeaderRow[c] || "").trim()
            const combinedLower = (val + " " + subVal).toLowerCase().replace(/\s+/g, ' ').trim()
            const valLower = getMergedParentHeaderValue(c).toLowerCase().replace(/\s+/g, ' ').trim()
            const subLower = subVal.toLowerCase().replace(/\s+/g, ' ').trim()

            if (combinedLower.includes("mã học sinh") || combinedLower.includes("mã hs") || combinedLower === "ma hs" || combinedLower === "ma hoc sinh") {
              studentCodeCol = c
            } else if (
              (combinedLower.includes("họ tên") || 
               combinedLower.includes("họ và tên") || 
               combinedLower.includes("ho ten") || 
               combinedLower.includes("ho va ten") || 
               combinedLower.includes("tên học sinh") || 
               combinedLower.includes("ten hoc sinh") || 
               combinedLower.includes("tên hs") || 
               combinedLower.includes("ten hs") ||
               combinedLower === "họ" ||
               combinedLower.startsWith("họ ") ||
               combinedLower.startsWith("ho ")) &&
              !combinedLower.includes("học tập") &&
              !combinedLower.includes("học lực")
            ) {
              if (studentNameCol === -1) studentNameCol = c
            } else if (
              combinedLower.includes("ngày sinh") || 
              combinedLower.includes("ngay sinh") || 
              combinedLower.includes("ngày, tháng") || 
              combinedLower.includes("ngay, thang") ||
              combinedLower.includes("n.sinh") ||
              combinedLower.includes("ns") ||
              combinedLower.includes("năm sinh")
            ) {
              dobCol = c
            } else if (combinedLower.includes("giới tính") || combinedLower.includes("gioi tinh")) {
              genderCol = c
            } else if (combinedLower === "nữ" || combinedLower === "nu" || valLower === "nữ" || subLower === "nữ") {
              femaleCol = c
            } else if (
              (combinedLower.includes("kết quả học tập") ||
               combinedLower.includes("học lực") ||
               valLower.includes("đánh giá kqgd") ||
               valLower.includes("kết quả rèn luyện và học tập")) &&
              !valLower.includes("bảng tổng hợp") &&
              !valLower.includes("môn học và hoạt động giáo dục") &&
              !valLower.includes("môn học & hoạt động giáo dục")
            ) {
              if (effectiveLevel === "SECONDARY") {
                academicRatingCol = c
              } else {
                if (subLower.includes("xuất sắc") || subLower.includes("xuat sac")) {
                  academicRatingCols.push({ colIndex: c, label: "Hoàn thành xuất sắc" })
                } else if (subLower.includes("tốt") || subLower.includes("tot")) {
                  academicRatingCols.push({ colIndex: c, label: "Hoàn thành tốt" })
                } else if (subLower.includes("hoàn thành") || subLower.includes("hoan thanh")) {
                  if (!subLower.includes("chưa") && !subLower.includes("chua")) {
                    academicRatingCols.push({ colIndex: c, label: "Hoàn thành" })
                  } else {
                    academicRatingCols.push({ colIndex: c, label: "Chưa hoàn thành" })
                  }
                } else {
                  academicRatingCol = c
                }
              }
            } else if (
              combinedLower.includes("kết quả rèn luyện") ||
              combinedLower.includes("hạnh kiểm") ||
              valLower.includes("kết quả rèn luyện") ||
              valLower.includes("hạnh kiểm")
            ) {
              conductRatingCol = c
            } else if (
              combinedLower.includes("danh hiệu") ||
              combinedLower.includes("danh hieu") ||
              combinedLower.includes("khen thưởng") ||
              combinedLower.includes("khen thuong") ||
              valLower.includes("khen thưởng") ||
              valLower.includes("danh hiệu")
            ) {
              rewardCol = c
              if (subLower.includes("cuối năm") || subLower.includes("cuoi nam")) {
                rewardCuoiNamCols.push({ colIndex: c, label: "Cuối năm" })
              } else if (subLower.includes("đột xuất") || subLower.includes("dot xuat")) {
                rewardDotXuatCols.push({ colIndex: c, label: "Đột xuất" })
              } else {
                rewardCuoiNamCols.push({ colIndex: c, label: "Danh hiệu" })
              }
            } else if (
              combinedLower.includes("kqrl sau hè") ||
              combinedLower.includes("kqrl sau he") ||
              combinedLower.includes("rèn luyện sau hè")
            ) {
              rewardUnexpectedCol = c
              rewardDotXuatCols.push({ colIndex: c, label: "KQRL sau hè" })
            } else if (
              combinedLower.includes("danh hiệu") ||
              combinedLower.includes("danh hieu") ||
              combinedLower.includes("khen thưởng") ||
              combinedLower.includes("khen thuong") ||
              valLower.includes("khen thưởng") ||
              valLower.includes("danh hiệu")
            ) {
              rewardCol = c
              if (subLower.includes("cuối năm") || subLower.includes("cuoi nam")) {
                rewardCuoiNamCols.push({ colIndex: c, label: "Cuối năm" })
              } else if (subLower.includes("đột xuất") || subLower.includes("dot xuat")) {
                rewardDotXuatCols.push({ colIndex: c, label: "Đột xuất" })
              } else {
                rewardCuoiNamCols.push({ colIndex: c, label: "Danh hiệu" })
              }
            } else if (combinedLower.includes("ghi chú") || combinedLower.includes("ghi chu")) {
              notesCol = c
            } else if (combinedLower.includes("lên lớp") || combinedLower.includes("len lop")) {
              promotedCol = c
            } else if (
              subLower === "p" ||
              combinedLower === "p" ||
              combinedLower.includes("buổi nghỉ p") ||
              combinedLower.includes("nghỉ p")
            ) {
              absencesPermittedCol = c
            } else if (
              subLower === "k" ||
              combinedLower === "k" ||
              combinedLower.includes("buổi nghỉ k") ||
              combinedLower.includes("nghỉ k")
            ) {
              absencesUnpermittedCol = c
            } else if (
              subLower === "tổng" ||
              subLower === "tong" ||
              combinedLower.includes("buổi nghỉ tổng") ||
              combinedLower.includes("tổng số buổi")
            ) {
              absencesTotalCol = c
            }
          }

          if (studentNameCol === -1) {
            for (let c = 0; c < mainHeaderRow.length; c++) {
              const val = String(mainHeaderRow[c] || "").trim().toLowerCase();
              const subVal = String(subHeaderRow[c] || "").trim().toLowerCase();
              const combinedLower = (val + " " + subVal).toLowerCase();
              if (combinedLower.includes("tên") || combinedLower.includes("ten")) {
                if (!combinedLower.includes("mã") && !combinedLower.includes("ma")) {
                  studentNameCol = c;
                  break;
                }
              }
            }
            if (studentNameCol === -1 && studentCodeCol !== -1) {
              studentNameCol = studentCodeCol + 1;
            }
          if (studentCodeCol === -1 && studentNameCol !== -1) {
            let possibleCodeCol = -1
            for (let c = 0; c < studentNameCol; c++) {
              const sampleVal = String(rawRows[mainHeaderRowIndex + 2]?.[c] || "").trim()
              if (/^\d+$/.test(sampleVal) && sampleVal.length >= 6) {
                possibleCodeCol = c
                break
              }
            }
            if (possibleCodeCol !== -1) {
              studentCodeCol = possibleCodeCol
            } else {
              studentCodeCol = Math.max(0, studentNameCol - 2)
            }
          }
          }

          if (dobCol === -1) {
            for (let c = 0; c < mainHeaderRow.length; c++) {
              const val = String(mainHeaderRow[c] || "").trim().toLowerCase();
              const subVal = String(subHeaderRow[c] || "").trim().toLowerCase();
              const combinedLower = (val + " " + subVal).toLowerCase();
              if (combinedLower.includes("sinh") || combinedLower.includes("n.s") || combinedLower.includes("ns")) {
                dobCol = c;
                break;
              }
            }
            if (dobCol === -1 && studentNameCol !== -1) {
              dobCol = studentNameCol + 1;
            }
          }

          let firstStudentRowIndex = -1
          for (let r = 0; r < rawRows.length; r++) {
            const codeVal = String(rawRows[r]?.[studentCodeCol] || "").trim().toLowerCase()
            const nameVal = String(rawRows[r]?.[studentNameCol] || "").trim().toLowerCase()
            
            if (codeVal || nameVal) {
              const isHeader = 
                codeVal.includes("mã") || codeVal.includes("stt") || codeVal.includes("mức") || codeVal.includes("điểm") || codeVal.includes("học sinh") ||
                nameVal.includes("họ và tên") || nameVal.includes("hoạt động") || nameVal.includes("năng lực") || nameVal.includes("phẩm chất") || nameVal.includes("đánh giá") || nameVal.includes("môn học")
              
              if (!isHeader) {
                if (/\d{4,}/.test(codeVal) || (nameVal.length > 2 && !nameVal.includes("lớp"))) {
                  firstStudentRowIndex = r
                  break
                }
              }
            }
          }
          if (firstStudentRowIndex === -1) {
            firstStudentRowIndex = Math.max(subHeaderRowIndex + 1, 8)
          }

          const subjectsInSheet: { colIndex: number; subjectName: string; subType: "score" | "grade" }[] = []
          const startCol = Math.max(studentNameCol, dobCol, femaleCol, genderCol) + 1
          let endCol = mainHeaderRow.length
          const ratingIndices = [
            ...(effectiveLevel === "SECONDARY" ? academicRatingCols.map(x => x.colIndex) : []),
            effectiveLevel === "SECONDARY" ? academicRatingCol : -1,
            conductRatingCol,
            rewardUnexpectedCol,
            rewardCol,
            ...rewardCuoiNamCols.map(x => x.colIndex),
            ...rewardDotXuatCols.map(x => x.colIndex),
            absencesPermittedCol,
            absencesUnpermittedCol,
            absencesTotalCol,
            promotedCol,
            notesCol
          ].filter(idx => idx !== -1 && idx > startCol + 2)

          if (ratingIndices.length > 0) {
            endCol = Math.min(...ratingIndices)
          }

          for (let c = startCol; c < endCol; c++) {
            const mainHeaderVal = getMergedSubjectMainHeaderValue(c, startCol)
            const grandparentHeaderVal = getMergedParentHeaderValue(c)
            const subHeaderVal = String(subjectSubRow[c] || "").trim()

            let parentName = (mainHeaderVal || grandparentHeaderVal).normalize("NFC").trim()
            let subjectName = parentName
            let subType: "score" | "grade" = "score"

            const parentLower = parentName.toLowerCase()
            const subLower = subHeaderVal.toLowerCase()

            // Handle subheader when parent is a group title (like Nghệ thuật -> Âm nhạc / Mĩ thuật)
            if (subHeaderVal && !subLower.includes("mức") && !subLower.includes("điểm") && !subLower.includes("ktđk") && !subLower.includes("xếp loại") && !subLower.includes("đánh giá")) {
              subjectName = subHeaderVal
            }

            const searchNameLower = subjectName.toLowerCase().trim()
            const primaryTestSubjects = ["toán", "tiếng việt", "tiếng anh", "khoa học", "lịch sử", "địa lý", "địa lí", "tin học", "công nghệ"];

            if (effectiveLevel === "PRIMARY") {
              const isTestSubject = primaryTestSubjects.some(pts => searchNameLower.includes(pts) || parentLower.includes(pts));
              if (!isTestSubject) {
                subType = "grade"
              } else {
                if (parentLower.includes("mức") || searchNameLower.includes("mức") || subLower.includes("mức") || subLower.includes("đạt")) {
                  subType = "grade"
                } else if (parentLower.includes("điểm") || searchNameLower.includes("điểm") || subLower.includes("điểm") || subLower.includes("ktđk")) {
                  subType = "score"
                } else {
                  subType = "score"
                }
              }
            } else {
              if (subLower.includes("mức") || subLower.includes("đạt") || subLower.includes("xếp loại") || subLower.includes("đánh giá") || subLower.includes("n.xét") || subLower.includes("n.xet") || subLower.includes("nhận xét") || subLower.includes("nhan xet")) {
                subType = "grade"
              } else {
                subType = "score"
              }
            }

            const nameLower = subjectName.toLowerCase().trim()
            
            const skippedQualities = [
              "tự chủ và tự học",
              "giao tiếp và hợp tác",
              "gqvd và sáng tạo",
              "giải quyết vấn đề và sáng tạo",
              "ngôn ngữ",
              "tính toán",
              "thẩm mĩ",
              "thẩm mỹ",
              "yêu nước",
              "nhân ái",
              "chăm chỉ",
              "trung thực",
              "trách nhiệm",
              "kết quả học tập",
              "kết quả rèn luyện",
              "học lực",
              "hạnh kiểm",
              "hoàn thành xuất sắc",
              "hoàn thành tốt",
              "hoàn thành",
              "chưa hoàn thành",
              "xuất sắc",
              "tốt"
            ]

            if (
              skippedQualities.some(q => nameLower === q || nameLower.includes(q)) ||
              nameLower === "thể chất" ||
              nameLower === "the chat" ||
              nameLower.includes("năng lực") || 
              nameLower.includes("phẩm chất") || 
              nameLower === "môn học và hoạt động giáo dục" ||
              nameLower === "môn học & hoạt động giáo dục" ||
              nameLower.includes("hoạt động giáo dục") ||
              nameLower === "môn học"
            ) {
              continue
            }

            const cleanCheck = subjectName.trim().toLowerCase()
            const subCleanCheck = subHeaderVal.trim().toLowerCase()

            if (
              cleanCheck === "p" || 
              cleanCheck === "k" || 
              cleanCheck === "tổng" || 
              cleanCheck.includes("buổi nghỉ") || 
              cleanCheck === "cả năm" ||
              cleanCheck === "ca nam" ||
              subCleanCheck === "p" || 
              subCleanCheck === "k" || 
              subCleanCheck === "tổng"
            ) {
              continue
            }

            subjectsInSheet.push({
              colIndex: c,
              subjectName,
              subType
            })

            const baseSubjectName = subjectName
              .replace(/[\s\-_]+mức(\s*đạt\s*được)?/gi, "")
              .replace(/[\s\-_]+điểm(\s*ktđk)?/gi, "")
              .trim()
            const cleanName = (baseSubjectName || subjectName).normalize("NFC").toLowerCase().trim()

            // Comprehensive alias dictionary map for THPT, THCS & Primary
            let aliasKey = cleanName

            if (["lí", "vật lí", "vật lý", "ly", "vật ly", "physics"].includes(cleanName)) {
              aliasKey = "vật lí"
            } else if (["hóa", "hóa học", "hoa", "chemistry"].includes(cleanName)) {
              aliasKey = "hóa học"
            } else if (["sử", "lịch sử", "history"].includes(cleanName)) {
              aliasKey = "lịch sử"
            } else if (["địa", "địa lí", "địa lý", "geography"].includes(cleanName)) {
              aliasKey = "địa lí"
            } else if (["gdqp&an", "gdqp & an", "gdqp-an", "gdqp an", "gdqp", "giáo dục quốc phòng và an ninh", "giáo dục quốc phòng - an ninh", "giáo dục quốc phòng an ninh", "gd qp&an"].includes(cleanName)) {
              aliasKey = "giáo dục quốc phòng và an ninh"
            } else if (["gdkt&pl", "gdkt & pl", "gdkt_pl", "gdkt-pl", "gd kt&pl", "giáo dục kinh tế và pháp luật", "giáo dục kt&pl", "gd kinh tế và pháp luật"].includes(cleanName)) {
              aliasKey = "giáo dục kinh tế và pháp luật"
            } else if (["ndgđcđp", "ndgđcđp/gđđp", "ndgđđp", "gđđp", "ndgđđợp", "giáo dục địa phương", "nội dung giáo dục địa phương", "gđđp/ndgđcđp"].includes(cleanName)) {
              aliasKey = "giáo dục địa phương"
            } else if (["sinh", "sinh học", "biology"].includes(cleanName)) {
              aliasKey = "sinh học"
            } else if (["toán", "toan", "math", "mathematics"].includes(cleanName)) {
              aliasKey = "toán"
            } else if (["văn", "ngữ văn", "literature"].includes(cleanName)) {
              aliasKey = "ngữ văn"
            } else if (["ng.ngữ", "ng ngữ", "ng.ngữ 1", "ngoại ngữ", "tiếng anh", "anh", "english"].includes(cleanName)) {
              aliasKey = "tiếng anh"
            } else if (["tin", "tin học", "informatics", "it"].includes(cleanName)) {
              aliasKey = "tin học"
            } else if (["c.nghệ", "c nghệ", "công nghệ", "technology"].includes(cleanName)) {
              aliasKey = "công nghệ"
            } else if (["gdtc", "giáo dục thể chất", "thể chất", "pe"].includes(cleanName)) {
              aliasKey = "giáo dục thể chất"
            } else if (["ls&đl", "ls & đl", "ls/đl", "ls_dl", "lịch sử và địa lý", "lịch sử & địa lý", "lịch sử và địa lí", "lịch sử & địa lí", "ls va dl"].includes(cleanName)) {
              aliasKey = "lịch sử và địa lí"
            } else if (["khtn", "khoa học tự nhiên", "kh tự nhiên"].includes(cleanName)) {
              aliasKey = "khoa học tự nhiên"
            } else if (["gdcd", "giáo dục công dân"].includes(cleanName)) {
              aliasKey = "giáo dục công dân"
            } else if (["hđtn&hn", "hđtn & hn", "hđtn,hn", "hđtn", "hoạt động trải nghiệm", "hoạt động trải nghiệm, hướng nghiệp"].includes(cleanName)) {
              aliasKey = "hoạt động trải nghiệm"
            } else if (["tiếng việt", "t.việt", "t việt", "tv", "vietnamese"].includes(cleanName)) {
              aliasKey = "tiếng việt"
            } else if (["đạo đức", "đ.đức", "đ đức", "ethics"].includes(cleanName)) {
              aliasKey = "đạo đức"
            } else if (["tn-xh", "tn & xh", "tnxh", "tự nhiên và xã hội", "tự nhiên xã hội"].includes(cleanName)) {
              aliasKey = "tự nhiên và xã hội"
            } else if (["khoa học", "kh"].includes(cleanName)) {
              aliasKey = "khoa học"
            } else if (["âm nhạc", "nhạc", "music"].includes(cleanName)) {
              aliasKey = "âm nhạc"
            } else if (["mỹ thuật", "mĩ thuật", "art"].includes(cleanName)) {
              aliasKey = "mỹ thuật"
            }

            let match = dbSubjects.find(dbSub => {
              const dbNorm = dbSub.subjectName.normalize("NFC").toLowerCase().trim()
              const dbCode = dbSub.subjectCode.normalize("NFC").toLowerCase().trim()
              return dbNorm === aliasKey || dbCode === aliasKey || dbNorm === cleanName || dbCode === cleanName
            })

            if (!match) {
              const normAlias1 = aliasKey.replace(/lí/g, "lý").replace(/mĩ/g, "mỹ")
              const normAlias2 = aliasKey.replace(/lý/g, "lí").replace(/mỹ/g, "mĩ")
              match = dbSubjects.find(dbSub => {
                const dbNorm = dbSub.subjectName.normalize("NFC").toLowerCase().trim()
                return dbNorm === normAlias1 || dbNorm === normAlias2
              })
            }

            if (!match) {
              if (cleanName.includes("(tin học)") || cleanName.includes("(tin hoc)")) {
                match = dbSubjects.find(dbSub => dbSub.subjectName.normalize("NFC").toLowerCase().includes("tin học"))
              } else if (cleanName.includes("(công nghệ)") || cleanName.includes("(cong nghe)")) {
                match = dbSubjects.find(dbSub => dbSub.subjectName.normalize("NFC").toLowerCase().includes("công nghệ"))
              }
            }

            if (!match) {
              match = dbSubjects.find(dbSub => {
                const dbNorm = dbSub.subjectName.normalize("NFC").toLowerCase().trim()
                return aliasKey.includes(dbNorm) || dbNorm.includes(aliasKey) || cleanName.includes(dbNorm) || dbNorm.includes(cleanName)
              })
            }

            if (!match) {
              if (cleanName.includes("đạo đức") || cleanName.includes("dieu duc")) {
                match = dbSubjects.find(sub => {
                  const n = sub.subjectName.normalize("NFC").toLowerCase()
                  const c = sub.subjectCode.toLowerCase()
                  return n.includes("đạo đức") || n.includes("công dân") || c.includes("gdcd") || c.includes("dao_duc")
                })
              } else if (cleanName.includes("âm nhạc") || cleanName.includes("am nhac")) {
                match = dbSubjects.find(sub => {
                  const n = sub.subjectName.normalize("NFC").toLowerCase()
                  const c = sub.subjectCode.toLowerCase()
                  return n.includes("âm nhạc") || n.includes("nghệ thuật") || c.includes("am_nhac") || c.includes("nghe_thuat")
                })
              } else if (cleanName.includes("mĩ thuật") || cleanName.includes("mỹ thuật")) {
                match = dbSubjects.find(sub => {
                  const n = sub.subjectName.normalize("NFC").toLowerCase()
                  const c = sub.subjectCode.toLowerCase()
                  return n.includes("mĩ thuật") || n.includes("mỹ thuật") || n.includes("nghệ thuật") || c.includes("mi_thuat") || c.includes("nghe_thuat")
                })
              } else if (cleanName.includes("trải nghiệm") || cleanName.includes("hđtn")) {
                match = dbSubjects.find(sub => {
                  const n = sub.subjectName.normalize("NFC").toLowerCase()
                  const c = sub.subjectCode.toLowerCase()
                  return n.includes("trải nghiệm") || c.includes("hdtn")
                })
              }
            }
            const mappedCode = match ? match.subjectCode : ""
            
            const baseName = subjectName
              .replace(/[\s\-_]+mức(\s*đạt\s*được)?/gi, "")
              .replace(/[\s\-_]+điểm(\s*ktđk)?/gi, "")
              .trim()

            let headerLabel = subjectName
            if (effectiveLevel === "PRIMARY") {
              const primaryTestSubjects = ["toán", "tiếng việt", "tiếng anh", "khoa học", "lịch sử", "địa lý", "địa lí", "tin học", "công nghệ"];
              const isTestSubject = primaryTestSubjects.some(pts => (baseName || subjectName).toLowerCase().includes(pts))
              if (isTestSubject) {
                if (subjectName.toLowerCase().includes("mức") || subType === "grade") {
                  headerLabel = (baseName || subjectName) + " - Mức đạt được"
                } else if (subjectName.toLowerCase().includes("điểm") || subType === "score") {
                  headerLabel = (baseName || subjectName) + " - Điểm KTĐK"
                }
              }
            }

            detectedExcelSubjectsMap.set(headerLabel, {
              originalHeader: subjectName,
              mappedSubjectCode: mappedCode,
              isNew: false,
              subType
            })
          }

          // Parse students
          const parsedStudents: any[] = []
          const sheetSelectedStudents: Record<string, boolean> = {}

          for (let r = firstStudentRowIndex; r < rawRows.length; r++) {
            const row = rawRows[r]
            if (!row) continue
            
            const rawCode = String(row[studentCodeCol] || "").trim()
            const rawName = String(row[studentNameCol] || "").trim()
            
            if (!rawCode && !rawName) continue
            if (rawCode.toLowerCase().includes("lớp trưởng") || rawName.toLowerCase().includes("nhận xét") || rawName.toLowerCase().includes("giáo viên")) {
              continue
            }

            let dateOfBirth: string | null = null
            if (dobCol !== -1) {
              const rawDob = row[dobCol]
              if (rawDob) {
                if (typeof rawDob === "number") {
                  try {
                    const parsedDate = new Date(Math.round((rawDob - 25569) * 86400 * 1000))
                    if (!isNaN(parsedDate.getTime())) {
                      dateOfBirth = parsedDate.toISOString()
                    }
                  } catch (e) {
                    dateOfBirth = null
                  }
                } else {
                  const cleanedStr = String(rawDob).trim().replace(/\s+/g, '')
                  const parts = cleanedStr.split(/[\/\-.]/)
                  if (parts.length === 3) {
                    let d = parseInt(parts[0])
                    let m = parseInt(parts[1])
                    let y = parseInt(parts[2])
                    if (y < 100) y += 2000
                    const parsedDate = new Date(y, m - 1, d)
                    if (!isNaN(parsedDate.getTime())) {
                      dateOfBirth = parsedDate.toISOString()
                    }
                  }
                }
              }
            }

            let gender = "Nam"
            if (genderCol !== -1) {
              const genderVal = String(row[genderCol] || "").trim().toLowerCase()
              if (genderVal.includes("nữ") || genderVal === "nu" || genderVal === "f" || genderVal === "female") {
                gender = "Nữ"
              }
            } else if (femaleCol !== -1) {
              const femaleVal = String(row[femaleCol] || "").trim().toLowerCase()
              if (femaleVal && (femaleVal.includes("x") || femaleVal.includes("nữ") || femaleVal.includes("1") || femaleVal.includes("true"))) {
                gender = "Nữ"
              }
            }

            const studentSubjects: Record<string, { score: any; grade: any }> = {}
            subjectsInSheet.forEach(sub => {
              const cellVal = String(row[sub.colIndex] || "").trim()
              const subBaseName = sub.subjectName
                .replace(/[\s\-_]+mức(\s*đạt\s*được)?/gi, "")
                .replace(/[\s\-_]+điểm(\s*ktđk)?/gi, "")
                .trim()

              let headerLabel = sub.subjectName
              if (effectiveLevel === "PRIMARY") {
                const primaryTestSubjects = ["toán", "tiếng việt", "tiếng anh", "khoa học", "lịch sử", "địa lý", "địa lí", "tin học", "công nghệ"];
                const isTestSubject = primaryTestSubjects.some(pts => (subBaseName || sub.subjectName).toLowerCase().includes(pts))
                if (isTestSubject) {
                  if (sub.subjectName.toLowerCase().includes("mức") || sub.subType === "grade") {
                    headerLabel = (subBaseName || sub.subjectName) + " - Mức đạt được"
                  } else if (sub.subjectName.toLowerCase().includes("điểm") || sub.subType === "score") {
                    headerLabel = (subBaseName || sub.subjectName) + " - Điểm KTĐK"
                  }
                }
              }

              if (!studentSubjects[headerLabel]) {
                studentSubjects[headerLabel] = { score: null, grade: null }
              }

              const lowerVal = cellVal.toLowerCase()
              const isExempt = lowerVal === "miễn" || lowerVal === "m" || lowerVal.includes("miễn") || lowerVal === "mien"
              
              if (isExempt) {
                studentSubjects[headerLabel].grade = "Miễn"
                studentSubjects[headerLabel].score = null
              } else if (sub.subType === "score") {
                const num = parseFloat(cellVal.replace(',', '.'))
                if (!isNaN(num)) {
                  studentSubjects[headerLabel].score = cellVal
                  studentSubjects[headerLabel].grade = null
                } else if (cellVal && cellVal !== "-" && cellVal !== "—") {
                  studentSubjects[headerLabel].grade = cellVal
                  studentSubjects[headerLabel].score = null
                } else {
                  studentSubjects[headerLabel].score = null
                  studentSubjects[headerLabel].grade = null
                }
              } else {
                studentSubjects[headerLabel].grade = cellVal || null
              }
            })

            let academicRating = null
            if (academicRatingCol !== -1) {
              academicRating = String(row[academicRatingCol] || "").trim() || null
            }
            if (!academicRating && academicRatingCols.length > 0) {
              for (const colMap of academicRatingCols) {
                const val = String(row[colMap.colIndex] || "").trim().toLowerCase()
                if (val && val !== "-" && val !== "—") {
                  academicRating = colMap.label
                  break
                }
              }
            }

            let conductRating = null
            if (conductRatingCol !== -1) {
              conductRating = String(row[conductRatingCol] || "").trim() || null
            }

            // Universal fallback scanner: if academicRating or conductRating is still null, scan columns after last subject column
            if (!academicRating || !conductRating) {
              for (let c = Math.max(startCol + 5, studentNameCol + 5); c < row.length; c++) {
                const rawCellVal = String(row[c] || "").trim()
                const cellLower = rawCellVal.toLowerCase()
                if (["tốt", "tot", "khá", "kha", "đạt", "dat", "chưa đạt", "chua dat", "xuất sắc", "xuat sac"].includes(cellLower)) {
                  if (!academicRating && c !== conductRatingCol) {
                    academicRating = rawCellVal
                  } else if (!conductRating && c !== academicRatingCol) {
                    conductRating = rawCellVal
                  }
                }
              }
            }
            
            let reward = null
            if (rewardCol !== -1) {
              reward = String(row[rewardCol] || "").trim() || null
            }
            if (!reward) {
              for (const colMap of rewardCuoiNamCols) {
                const val = String(row[colMap.colIndex] || "").trim()
                if (val && val !== "-" && val !== "—") {
                  reward = colMap.label !== "Cuối năm" && colMap.label !== "Danh hiệu" ? colMap.label : val
                  break
                }
              }
            }

            let rewardUnexpected = null
            if (rewardUnexpectedCol !== -1) {
              rewardUnexpected = String(row[rewardUnexpectedCol] || "").trim() || null
            }
            if (!rewardUnexpected) {
              for (const colMap of rewardDotXuatCols) {
                const val = String(row[colMap.colIndex] || "").trim()
                if (val && val !== "-" && val !== "—") {
                  rewardUnexpected = colMap.label !== "Đột xuất" && colMap.label !== "KQRL sau hè" ? colMap.label : val
                  break
                }
              }
            }

            let notes = null
            if (notesCol !== -1) {
              notes = String(row[notesCol] || "").trim() || null
            }

            // For Primary: If notes contains reward content (e.g. "Học sinh Xuất sắc"), assign to reward
            if (effectiveLevel === "PRIMARY" && notes) {
              if (!reward || reward === "✓" || reward === "" || reward === "x") {
                reward = notes
              }
            }

            let absencesPermitted = 0
            let absencesUnpermitted = 0
            let absencesTotal = 0

            if (absencesPermittedCol !== -1) {
              absencesPermitted = parseInt(row[absencesPermittedCol]) || 0
            }
            if (absencesUnpermittedCol !== -1) {
              absencesUnpermitted = parseInt(row[absencesUnpermittedCol]) || 0
            }
            if (absencesTotalCol !== -1) {
              absencesTotal = parseInt(row[absencesTotalCol]) || 0
            } else {
              absencesTotal = absencesPermitted + absencesUnpermitted
            }

            let promoted: boolean | null = null
            if (promotedCol !== -1) {
              const promVal = String(row[promotedCol] || "").trim().toLowerCase()
              if (promVal && promVal !== "-" && promVal !== "—") {
                if (promVal === "1" || promVal === "true" || promVal.includes("lên lớp") || promVal.includes("len lop")) {
                  promoted = true
                } else {
                  promoted = false
                }
              }
            }

            parsedStudents.push({
              studentCode: rawCode,
              studentName: rawName,
              dateOfBirth,
              gender,
              subjects: studentSubjects,
              academicRating,
              conductRating,
              reward,
              rewardUnexpected,
              notes,
              absencesPermitted,
              absencesUnpermitted,
              absencesTotal,
              promoted
            })

            sheetSelectedStudents[rawCode] = true
          }

          allParsed[sheetName] = {
            students: parsedStudents,
            subjects: subjectsInSheet
          }

          initialSelectedStudents[sheetName] = sheetSelectedStudents
        })

        // Build mappingList
        const mappingList: { excelHeader: string; originalHeader: string; mappedSubjectCode: string; isNew: boolean; subType: "score" | "grade" }[] = []
        detectedExcelSubjectsMap.forEach((meta, excelHeader) => {
          mappingList.push({
            excelHeader,
            ...meta
          })
        })

        setParsedData(allParsed)
        setExcelSubjects(mappingList)
        setSelectedStudents(initialSelectedStudents)

        // Set initial selected subjects state immediately
        const initialSelectedSubjects: Record<string, boolean> = {}
        mappingList.forEach(item => {
          if (item.mappedSubjectCode) {
            initialSelectedSubjects[item.mappedSubjectCode] = true
          }
        })
        setSelectedSubjects(initialSelectedSubjects)

        // Perform class mismatches validation asynchronously without blocking UI
        try {
          const validationPayload = {
            academicYearId: selectedYearId || activeYearId,
            level,
            semester,
            importOptions: {
              updateProfile,
              importSummaryRatings,
              importAbsences: effectiveLevel === "PRIMARY" ? false : importAbsences,
              importRewardAndPromotion,
              selectedSubjects: Array.from(detectedExcelSubjectsMap.values()).map(m => m.mappedSubjectCode || m.originalHeader)
            },
            classesData: Object.keys(allParsed).map(sheetName => ({
              classCode: sheetName,
              students: allParsed[sheetName].students
            }))
          }

          fetch("/api/admin/ktdbcl/import-kqht?validate=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validationPayload)
          }).then(res => res.ok ? res.json() : null).then(valResult => {
            if (valResult && valResult.success && valResult.mismatches) {
              setClassMismatches(valResult.mismatches)
            }
          }).catch(err => console.warn("Validation warning:", err))
        } catch (e) {
          console.warn("Validation error:", e)
        }

      } catch (err: any) {
        console.error("Lỗi khi phân tích dữ liệu Excel: ", err)
      } finally {
        setParsing(false)
        setTimeout(() => {
          section2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 200)
      }
    }

    parseWorkbookData()
  }, [workbook, level, semester])
  // Toggle all sheets selection
  const handleToggleAllSheets = (select: boolean) => {
    const updated: Record<string, boolean> = {}
    sheetNames.forEach(name => {
      updated[name] = select
    })
    setSelectedSheets(updated)
  }

  // Toggle all subjects selection
  const handleToggleAllSubjects = (select: boolean) => {
    const updated: Record<string, boolean> = {}
    excelSubjects.forEach(item => {
      if (item.mappedSubjectCode) {
        updated[item.mappedSubjectCode] = select
      }
    })
    setSelectedSubjects(updated)
  }

  // Active Excel Subjects for Table Preview (Step 3) - Only validly mapped & checked subjects
  const activeExcelSubjects = useMemo(() => {
    return excelSubjects.filter(item => item.mappedSubjectCode && selectedSubjects[item.mappedSubjectCode])
  }, [excelSubjects, selectedSubjects])

  // Handle remapping of Excel subject column to DB subject
  const handleMapSubject = (excelHeader: string, value: string) => {
    setExcelSubjects(prev => prev.map(item => {
      if (item.excelHeader === excelHeader) {
        return { ...item, mappedSubjectCode: value, isNew: false }
      }
      return item
    }))
  }

  // Toggle sheet selection
  const handleToggleSheet = (sheetName: string) => {
    setSelectedSheets(prev => ({
      ...prev,
      [sheetName]: !prev[sheetName]
    }))
  }

  // Toggle student row selection
  const handleToggleStudent = (sheetName: string, studentCode: string) => {
    setSelectedStudents(prev => ({
      ...prev,
      [sheetName]: {
        ...prev[sheetName],
        [studentCode]: !prev[sheetName][studentCode]
      }
    }))
  }

  // Toggle subject selection
  const handleToggleSubject = (code: string) => {
    setSelectedSubjects(prev => ({
      ...prev,
      [code]: !prev[code]
    }))
  }

  // Run selective import
  const runImport = async () => {
    const selectedSheetsList = Object.keys(selectedSheets).filter(name => selectedSheets[name])
    if (selectedSheetsList.length === 0) {
      alert("Vui lòng chọn ít nhất một sheet/lớp học để import!")
      return
    }

    // Prepare dynamic mapping configurations
    const subjectsToSelect: string[] = []

    excelSubjects.forEach(item => {
      if (item.mappedSubjectCode && selectedSubjects[item.mappedSubjectCode]) {
        if (!subjectsToSelect.includes(item.mappedSubjectCode)) {
          subjectsToSelect.push(item.mappedSubjectCode)
        }
      }
    })

    setImporting(true)
    setImportLogs([])
    setImportResult(null)
    setCurrentProgressIndex(0)

    let totalStudents = 0
    let totalScores = 0
    let totalSummaries = 0
    const accumulatedErrors: string[] = []
    const importedStudentsList: { studentCode: string; studentName: string; classCode: string; status: "success" | "error"; errorMsg?: string }[] = []

    // Process classes sequentially in batches (sheet by sheet) to prevent DB locking
    for (let i = 0; i < selectedSheetsList.length; i++) {
      const sheetName = selectedSheetsList[i]
      setCurrentProgressIndex(i)
      
      const sheetData = parsedData[sheetName]
      if (!sheetData) continue

      // Filter only selected students in this sheet
      const sheetStudents = sheetData.students.filter((s: any) => selectedStudents[sheetName]?.[s.studentCode])
      if (sheetStudents.length === 0) {
        setImportLogs(prev => [...prev, "Lớp " + sheetName + ": Bỏ qua do không chọn học sinh nào."])
        continue
      }

      setImportLogs(prev => [...prev, "Đang xử lý lớp " + sheetName + " (" + sheetStudents.length + " học sinh)..."])

      // Map subject names to codes using our mapping list
      const mappedStudents = sheetStudents.map((s: any) => {
        const studentSubjectsMapped: Record<string, { score: any; grade: any }> = {}
        Object.keys(s.subjects).forEach(key => {
          const mapping = excelSubjects.find(m => m.excelHeader === key)
          if (mapping && mapping.mappedSubjectCode && selectedSubjects[mapping.mappedSubjectCode]) {
            const subjectCode = mapping.mappedSubjectCode

            if (!studentSubjectsMapped[subjectCode]) {
              studentSubjectsMapped[subjectCode] = { score: null, grade: null }
            }

            if (mapping.subType === "score") {
              studentSubjectsMapped[subjectCode].score = s.subjects[key].score
            } else {
              studentSubjectsMapped[subjectCode].grade = s.subjects[key].grade
            }
          }
        })

        return {
          ...s,
          subjects: studentSubjectsMapped
        }
      })

      const payload = {
        academicYearId: selectedYearId,
        level: detectedLevelRef.current || level,
        semester,
        importOptions: {
          updateProfile,
          importAcademicRating,
          importConductRating,
          importSummaryRatings: importAcademicRating || importConductRating,
          importAbsences: level === "PRIMARY" ? false : importAbsences,
          importReward,
          importPromotion,
          importRewardAndPromotion: importReward || importPromotion,
          selectedSubjects: subjectsToSelect
        },
        classesData: [
          {
            classCode: sheetName,
            students: mappedStudents
          }
        ]
      }

      try {
        const res = await fetch("/api/admin/ktdbcl/import-kqht", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        })

        const result = await res.json()
        if (res.ok && result.success) {
          totalStudents += result.studentsCount || 0
          totalScores += result.scoresCount || 0
          totalSummaries += result.summariesCount || 0
          if (Array.isArray(result.errors) && result.errors.length > 0) {
            accumulatedErrors.push(...result.errors)
          }
          sheetStudents.forEach((st: any) => {
            importedStudentsList.push({
              studentCode: st.studentCode,
              studentName: st.studentName,
              classCode: sheetName,
              status: "success"
            })
          })
          setImportLogs(prev => [...prev, "Lớp " + sheetName + ": Thành công! + " + result.studentsCount + " học sinh, + " + result.scoresCount + " điểm số, + " + result.summariesCount + " đánh giá."])
        } else {
          const errText = result.error || "Lỗi không xác định"
          accumulatedErrors.push("Lớp " + sheetName + ": " + errText)
          sheetStudents.forEach((st: any) => {
            importedStudentsList.push({
              studentCode: st.studentCode,
              studentName: st.studentName,
              classCode: sheetName,
              status: "error",
              errorMsg: errText
            })
          })
          setImportLogs(prev => [...prev, "Lớp " + sheetName + " thất bại: " + errText])
        }
      } catch (err: any) {
        accumulatedErrors.push("Lớp " + sheetName + ": " + err.message)
        sheetStudents.forEach((st: any) => {
          importedStudentsList.push({
            studentCode: st.studentCode,
            studentName: st.studentName,
            classCode: sheetName,
            status: "error",
            errorMsg: err.message
          })
        })
        setImportLogs(prev => [...prev, "Lớp " + sheetName + " lỗi kết nối: " + err.message])
      }

      // Add a small pause between batches to ease DB workload
      await new Promise(r => setTimeout(r, 150))
    }

    setImporting(false)
    fetchClassStats()
    setImportResult({
      studentsCount: totalStudents,
      scoresCount: totalScores,
      summariesCount: totalSummaries,
      errors: accumulatedErrors,
      importedStudents: importedStudentsList
    })
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 200)
  }

  // Dynamic validation helper for class mismatch
  const getStudentValidation = (studentCode: string, parsedStatus: string, parsedErrorMsg: string) => {
    if (parsedStatus === "ERROR" || parsedStatus === "DUPLICATE") {
      return { status: parsedStatus, errorMsg: parsedErrorMsg }
    }
    
    const mismatch = classMismatches[studentCode.toUpperCase()]
    if (mismatch) {
      if (mismatch.type === "MISSING_MAPPING") {
        return {
          status: "ERROR",
          errorMsg: `Chưa ánh xạ: Trên hệ thống là Mã HS ${mismatch.dbStudentCode} (${mismatch.dbClassCode}). Vui lòng cấu hình Ánh xạ.`
        }
      }
      if (updateProfile) {
        return { 
          status: "VALID", 
          warningMsg: `Lệch lớp: Trên hệ thống đang học lớp ${mismatch.dbClassCode} (Sẽ tự động chuyển lớp)` 
        }
      } else {
        return { 
          status: "ERROR", 
          errorMsg: `Lệch lớp: Trên hệ thống đang học lớp ${mismatch.dbClassCode} (Bật 'Cập nhật hồ sơ học sinh' để cho phép chuyển lớp)` 
        }
      }
    }
    
    return { status: "VALID", errorMsg: "" }
  }

  // Debug raw rows memo
  const debugActiveRawRows = useMemo(() => {
    if (!workbook || !activeSheet) return []
    const ws = workbook.Sheets[activeSheet]
    if (!ws) return []
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }).slice(0, 15) as any[][]
  }, [workbook, activeSheet])

  // Get active sheet data
  const activeSheetData = parsedData[activeSheet]
  const currentEffectiveLevel: "PRIMARY" | "SECONDARY" = detectedLevelRef.current || level

  return (
    <div className="space-y-6">
      {/* Configuration Header Panel */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#00A99D]" />
          1. Thiết lập Cấu hình Bảng điểm
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Year Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Năm học</label>
            <select 
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#00A99D]"
            >
              {academicYears.map((y: any) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          {/* Level Switcher */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cấp học</label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                type="button"
                onClick={() => handleLevelChange("SECONDARY")}
                className={"flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all " + (level === "SECONDARY" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800")}
              >
                Trung học (6-12)
              </button>
              <button 
                type="button"
                onClick={() => handleLevelChange("PRIMARY")}
                className={"flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all " + (level === "PRIMARY" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800")}
              >
                Tiểu học
              </button>
            </div>
          </div>

          {/* Semester Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Định kỳ</label>
            <select 
              value={semester}
              onChange={(e: any) => setSemester(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#00A99D]"
            >
              {semesterOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Excel Uploader Button */}
          <div className="flex flex-col justify-end">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing || importing}
              className="w-full bg-[#00A99D] hover:bg-[#008d83] text-white py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold shadow-md shadow-teal-500/10 cursor-pointer disabled:bg-slate-300 disabled:shadow-none"
            >
              {parsing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang phân tích Excel...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Tải lên File Excel (.xlsx)
                </>
              )}
            </button>
          </div>
        </div>

        {semesterMismatchWarning && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 font-bold animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>{semesterMismatchWarning}</span>
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Info className="w-4 h-4 text-[#00A99D]" />
            <span>Mã học sinh trong file điểm khác mã trong hệ thống?</span>
          </div>
          <a 
            href="/admin/ktdbcl/import-mapping" 
            target="_blank" 
            className="text-[#00A99D] hover:underline font-bold"
          >
            Cấu hình Ánh xạ mã học sinh &rarr;
          </a>
        </div>
      </div>

      {workbook && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
          {/* LEFT PANEL: Fields Configuration and Sheets selector */}
          <div className="space-y-6 lg:col-span-1">
            {/* Sheet Selector */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Chọn Lớp học (Sheets)</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sheetNames.map(name => (
                  <label 
                    key={name}
                    className={"flex items-center justify-between p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all " + (selectedSheets[name] ? "border-[#00A99D] bg-teal-50/20 text-[#00A99D]" : "border-slate-200 text-slate-500 hover:bg-slate-50")}
                  >
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={!!selectedSheets[name]}
                        onChange={() => handleToggleSheet(name)}
                        className="rounded accent-[#00A99D]"
                      />
                      <span>{name}</span>
                    </div>
                    {parsedData[name] && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-semibold">
                        {parsedData[name].students.length} HS
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Selective Columns (Field selector) */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Thông tin cần Import</h3>
              
              <div className="space-y-3">
                <label className="flex items-start gap-2.5 text-xs text-slate-600 font-semibold cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={updateProfile}
                    onChange={(e) => setUpdateProfile(e.target.checked)}
                    className="mt-0.5 rounded accent-[#00A99D]"
                  />
                  <div>
                    <span className="block font-bold text-slate-800">Cập nhật Hồ sơ học sinh</span>
                    <span className="text-[10px] text-slate-400 font-medium">Họ tên, Ngày sinh, Giới tính</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-600 font-semibold cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={importAcademicRating}
                    onChange={(e) => setImportAcademicRating(e.target.checked)}
                    className="mt-0.5 rounded accent-[#00A99D]"
                  />
                  <div>
                    <span className="block font-bold text-slate-800">
                      {level === "PRIMARY" ? "Đánh giá Kết quả Giáo dục (KQGD)" : "Học lực (Xếp loại học tập)"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {level === "PRIMARY" ? "Đánh giá kết quả giáo dục tổng hợp" : "Xếp loại Học lực định kỳ"}
                    </span>
                  </div>
                </label>

                {currentEffectiveLevel === "SECONDARY" && (
                  <label className="flex items-start gap-2.5 text-xs text-slate-600 font-semibold cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={importConductRating}
                      onChange={(e) => setImportConductRating(e.target.checked)}
                      className="mt-0.5 rounded accent-[#00A99D]"
                    />
                    <div>
                      <span className="block font-bold text-slate-800">Rèn luyện (Hạnh kiểm)</span>
                      <span className="text-[10px] text-slate-400 font-medium">Xếp loại Rèn luyện / Hạnh kiểm định kỳ</span>
                    </div>
                  </label>
                )}

                {currentEffectiveLevel === "SECONDARY" && (
                  <label className="flex items-start gap-2.5 text-xs text-slate-600 font-semibold cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={importAbsences}
                      onChange={(e) => setImportAbsences(e.target.checked)}
                      className="mt-0.5 rounded accent-[#00A99D]"
                    />
                    <div>
                      <span className="block font-bold text-slate-800">Chuyên cần (Số buổi nghỉ P/K)</span>
                      <span className="text-[10px] text-slate-400 font-medium">Nghỉ có phép (P), Không phép (K)</span>
                    </div>
                  </label>
                )}

                <label className="flex items-start gap-2.5 text-xs text-slate-600 font-semibold cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={importReward}
                    onChange={(e) => setImportReward(e.target.checked)}
                    className="mt-0.5 rounded accent-[#00A99D]"
                  />
                  <div>
                    <span className="block font-bold text-slate-800">Khen thưởng</span>
                    <span className="text-[10px] text-slate-400 font-medium">Danh hiệu thi đua / Khen thưởng</span>
                  </div>
                </label>

                {semester === "CN" && (
                  <label className="flex items-start gap-2.5 text-xs text-slate-600 font-semibold cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={importPromotion}
                      onChange={(e) => setImportPromotion(e.target.checked)}
                      className="mt-0.5 rounded accent-[#00A99D]"
                    />
                    <div>
                      <span className="block font-bold text-slate-800">Trạng thái Lên lớp</span>
                      <span className="text-[10px] text-slate-400 font-medium">Kết quả được lên lớp cả năm</span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Subjects Selection */}
            {excelSubjects.length > 0 && (
              <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Danh sách Môn học/Tiêu chí</h3>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button 
                      type="button" 
                      onClick={() => handleToggleAllSubjects(true)}
                      className="text-indigo-600 font-semibold hover:underline"
                    >
                      Tất cả
                    </button>
                    <span className="text-slate-300">|</span>
                    <button 
                      type="button" 
                      onClick={() => handleToggleAllSubjects(false)}
                      className="text-slate-500 font-semibold hover:underline"
                    >
                      Bỏ tất cả
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {excelSubjects.map(item => {
                    const code = item.mappedSubjectCode
                    const isMapped = !!code
                    const isChecked = isMapped ? !!selectedSubjects[code] : false
                    return (
                      <label 
                        key={item.excelHeader}
                        className={"flex items-start gap-2.5 p-2 rounded-xl border text-xs font-semibold transition-all " + 
                          (!isMapped 
                            ? "border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed" 
                            : (isChecked ? "border-indigo-500 bg-indigo-50/20 text-indigo-700 cursor-pointer" : "border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer")
                          )}
                      >
                        <input 
                          type="checkbox"
                          disabled={!isMapped}
                          checked={isChecked}
                          onChange={() => isMapped && handleToggleSubject(code)}
                          className="mt-0.5 rounded accent-indigo-650 disabled:opacity-40"
                        />
                        <div className="min-w-0">
                          <span className="block font-bold truncate">{item.excelHeader}</span>
                          {!isMapped ? (
                            <span className="text-[9px] text-amber-700 font-bold">⚠️ Chưa ánh xạ (Bỏ qua)</span>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-medium">Mã: {code}</span>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* MAIN PANEL: Subject Mapping Table & Data Preview grid */}
          <div className="lg:col-span-3 space-y-6">
            {/* Subject Mapping Configurations */}
            {excelSubjects.length > 0 && (
              <div ref={section2Ref} className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm scroll-mt-6">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  2. Ánh xạ Môn học từ Excel vào Database
                </h3>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <th className="p-3">Cột môn trong Excel</th>
                        <th className="p-3">Môn học trong hệ thống</th>
                        <th className="p-3 text-center">Trạng thái đối khớp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {excelSubjects.map(item => (
                        <tr key={item.excelHeader} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-707">{item.excelHeader}</td>
                          <td className="p-3">
                            <select
                              value={item.mappedSubjectCode || ""}
                              onChange={(e) => handleMapSubject(item.excelHeader, e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-indigo-500 font-medium"
                            >
                              <option value="">-- Chưa ánh xạ (Bỏ qua môn này) --</option>
                              {dbSubjects.map(sub => (
                                <option key={sub.id} value={sub.subjectCode}>{sub.subjectName} ({sub.subjectCode})</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 text-center">
                            {!item.mappedSubjectCode ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full font-bold">
                                <AlertTriangle className="w-3 h-3" />
                                ⚠️ Chưa ánh xạ (Sẽ bỏ qua)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                Đã khớp ({item.mappedSubjectCode})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Students Data Preview */}
            {activeSheetData && (
              <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="w-full">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-emerald-500" />
                      3. Xem trước Danh sách Lớp: {activeSheet} ({activeSheetData.students.length} học sinh)
                    </h3>
                    {debugInfo && (
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[11px] font-mono text-slate-600 w-full mb-4 space-y-1.5 shadow-inner">
                        <div>
                          <strong>📊 DEBUG COLUMNS:</strong> CodeCol: <span className="font-bold text-teal-600">{debugInfo.studentCodeCol}</span> | NameCol: <span className="font-bold text-teal-600">{debugInfo.studentNameCol}</span> | DobCol: <span className="font-bold text-teal-600">{debugInfo.dobCol}</span> | AcadCol: <span className="font-bold text-amber-600">{debugInfo.academicRatingCol}</span> | CondCol: <span className="font-bold text-amber-600">{debugInfo.conductRatingCol}</span> | StartCol: <span className="font-bold text-teal-600">{debugInfo.startCol}</span> | FirstRow: <span className="font-bold text-teal-600">{debugInfo.firstStudentRowIndex}</span> | SubjectsCount: <span className="font-bold text-teal-600">{debugInfo.subjectsCount}</span>
                        </div>
                        <div>
                          <strong>🏆 FIRST STUDENT RATINGS:</strong> Academic: <span className="font-bold text-indigo-600">{JSON.stringify(activeSheetData.students[0]?.academicRating)}</span> | Conduct: <span className="font-bold text-indigo-600">{JSON.stringify(activeSheetData.students[0]?.conductRating)}</span> | Notes: <span className="font-bold text-indigo-600">{JSON.stringify(activeSheetData.students[0]?.notes)}</span>
                        </div>
                        <div className="overflow-x-auto whitespace-nowrap bg-white border border-slate-100 p-1.5 rounded-lg text-slate-500">
                          <strong>👤 FIRST STUDENT CELLS (0-9):</strong> {JSON.stringify(debugInfo.firstRowCells)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Sheets tabs */}
                  <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {sheetNames.map(name => (
                      <button
                        key={name}
                        onClick={() => setActiveSheet(name)}
                        className={"px-3 py-1 rounded-lg text-xs font-bold transition-all " + (activeSheet === name ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table container */}
                <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[520px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10 whitespace-nowrap shadow-sm">
                        <th className="p-3 w-10 text-center">
                          <input 
                            type="checkbox"
                            checked={
                              activeSheetData.students.length > 0 &&
                              activeSheetData.students.every((s: any) => selectedStudents[activeSheet]?.[s.studentCode])
                            }
                            onChange={(e) => {
                              const checked = e.target.checked
                              const updated: Record<string, boolean> = {}
                              activeSheetData.students.forEach((s: any) => {
                                if (s.status === "VALID") updated[s.studentCode] = checked
                              })
                              setSelectedStudents(prev => ({
                                ...prev,
                                [activeSheet]: updated
                              }))
                            }}
                            className="rounded accent-emerald-500"
                          />
                        </th>
                        <th className="p-3">Mã học sinh</th>
                        <th className="p-3">Họ và tên</th>
                        <th className="p-3 text-center">Ngày sinh</th>
                        <th className="p-3 text-center">Giới tính</th>

                        {/* Dynamic Excel Subject Columns (Only active mapped & selected subjects) */}
                        {activeExcelSubjects.map(item => (
                          <th key={item.excelHeader} className="p-3 text-center bg-indigo-50/40 text-indigo-900 border-x border-slate-100 font-bold">
                            {item.excelHeader}
                            <div className="text-[10px] font-normal text-indigo-600">({item.mappedSubjectCode})</div>
                          </th>
                        ))}

                        {/* Dynamic Column Section */}
                        {currentEffectiveLevel === "SECONDARY" ? (
                          <>
                            {importAcademicRating && (
                              <th className="p-3 text-center bg-amber-50/50 text-amber-900">Học lực</th>
                            )}
                            {importConductRating && (
                              <th className="p-3 text-center bg-amber-50/50 text-amber-900">Rèn luyện</th>
                            )}
                            {importConductRating && semester === "CN" && (
                              <th className="p-3 text-center bg-amber-50/50 text-amber-900">KQRL sau hè</th>
                            )}
                            {importAbsences && (
                              <th className="p-3 text-center bg-teal-50/50 text-teal-900">Buổi nghỉ (P/K)</th>
                            )}
                            {importReward && (
                              <th className="p-3 text-center bg-purple-50/50 text-purple-900">Danh hiệu</th>
                            )}
                            {importPromotion && semester === "CN" && (
                              <th className="p-3 text-center bg-purple-50/50 text-purple-900">Lên lớp</th>
                            )}
                            <th className="p-3 text-center">Ghi chú</th>
                          </>
                        ) : (
                          <>
                            {importAcademicRating && (
                              <th className="p-3 text-center bg-amber-50/50 text-amber-900">Đánh giá KQGD</th>
                            )}
                            {importReward && (
                              <th className="p-3 text-center bg-purple-50/50 text-purple-900">Khen thưởng</th>
                            )}
                            <th className="p-3 text-center">Ghi chú</th>
                          </>
                        )}

                        <th className="p-3 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activeSheetData.students.map((s: any, idx: number) => {
                        const isSelected = !!selectedStudents[activeSheet]?.[s.studentCode]
                        const validation = getStudentValidation(s.studentCode, s.status, s.errorMsg)
                        const isError = validation.status === "ERROR" || validation.status === "DUPLICATE"
                        
                        return (
                          <tr 
                            key={s.studentCode + "_" + idx} 
                            className={"hover:bg-slate-50/60 transition-colors " + (isError ? "bg-red-50/30" : (isSelected ? "bg-emerald-50/10" : ""))}
                          >
                            <td className="p-3 text-center">
                              <input 
                                type="checkbox"
                                disabled={isError}
                                checked={isSelected}
                                onChange={() => handleToggleStudent(activeSheet, s.studentCode)}
                                className="rounded accent-emerald-500 disabled:opacity-30"
                              />
                            </td>
                            <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">{s.studentCode}</td>
                            <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{s.studentName}</td>
                            <td className="p-3 text-center text-slate-500 font-medium whitespace-nowrap">
                              {s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "-"}
                            </td>
                            <td className="p-3 text-center text-slate-500 font-medium">{s.gender || "-"}</td>
                            
                            {/* Subject grades for activeExcelSubjects */}
                            {activeExcelSubjects.map(subItem => {
                              const gradeObj = s.subjects[subItem.excelHeader] || { score: null, grade: null }
                              const displayVal = subItem.subType === "score" 
                                ? (gradeObj.score !== null ? gradeObj.score : (gradeObj.grade !== null ? gradeObj.grade : "-"))
                                : (gradeObj.grade !== null ? gradeObj.grade : "-")
                              return (
                                <td key={subItem.excelHeader} className="p-3 text-center font-bold text-slate-800 border-x border-slate-50">
                                  {displayVal}
                                </td>
                              )
                            })}

                            {/* Ratings & Absences & Rewards Body Row Section */}
                            {currentEffectiveLevel === "SECONDARY" ? (
                              <>
                                {importAcademicRating && (
                                  <td className="p-3 text-center text-slate-800 font-bold bg-amber-50/10">{s.academicRating || "-"}</td>
                                )}
                                {importConductRating && (
                                  <td className="p-3 text-center text-slate-800 font-bold bg-amber-50/10">{s.conductRating || "-"}</td>
                                )}
                                {importConductRating && semester === "CN" && (
                                  <td className="p-3 text-center text-indigo-700 font-bold bg-amber-50/10">{s.rewardUnexpected || "-"}</td>
                                )}
                                {importAbsences && (
                                  <td className="p-3 text-center text-slate-600 font-semibold whitespace-nowrap bg-teal-50/10">
                                    {(s.absencesPermitted !== undefined && s.absencesPermitted !== null && s.absencesPermitted !== "") ? s.absencesPermitted : 0} P / {(s.absencesUnpermitted !== undefined && s.absencesUnpermitted !== null && s.absencesUnpermitted !== "") ? s.absencesUnpermitted : 0} K
                                  </td>
                                )}
                                {importReward && (
                                  <td className="p-3 text-center text-purple-700 font-bold bg-purple-50/10">{s.reward || "-"}</td>
                                )}
                                {importPromotion && semester === "CN" && (
                                  <td className="p-3 text-center bg-purple-50/10">
                                    {s.promoted ? (
                                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Được lên lớp</span>
                                    ) : (
                                      <span className="text-slate-500 font-medium">-</span>
                                    )}
                                  </td>
                                )}
                                <td className="p-3 text-center text-slate-500 max-w-xs truncate" title={s.notes}>{s.notes || "-"}</td>
                              </>
                            ) : (
                              <>
                                {importAcademicRating && (
                                  <td className="p-3 text-center text-slate-800 font-bold bg-amber-50/10">{s.academicRating || "-"}</td>
                                )}
                                {importReward && (
                                  <td className="p-3 text-center text-purple-700 font-bold bg-purple-50/10">{s.reward || "-"}</td>
                                )}
                                <td className="p-3 text-center text-slate-500 max-w-xs truncate" title={s.notes}>{s.notes || "-"}</td>
                              </>
                            )}

                            {/* Status column */}
                            <td className="p-3 text-center whitespace-nowrap">
                              {validation.status === "VALID" ? (
                                validation.warningMsg ? (
                                  <span 
                                    title={validation.warningMsg}
                                    className="text-[10px] bg-amber-50 text-amber-705 px-2 py-0.5 rounded-md font-bold cursor-help"
                                  >
                                    Cảnh báo
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-707 px-2 py-0.5 rounded-md font-bold">Hợp lệ</span>
                                )
                              ) : (
                                <span 
                                  title={validation.errorMsg}
                                  className="text-[10px] bg-red-100 text-red-707 px-2 py-0.5 rounded-md font-bold cursor-help"
                                >
                                  {validation.status === "DUPLICATE" ? "Trùng" : "Lỗi"}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Submit button bar */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between border-t border-slate-101 pt-4 gap-4">
                  <div className="text-xs font-semibold text-slate-550">
                    * Chỉ những học sinh được tích chọn và hiển thị "Hợp lệ" mới được đồng bộ vào hệ thống.
                  </div>

                  <button
                    type="button"
                    onClick={runImport}
                    disabled={importing}
                    className="w-full sm:w-auto bg-[#00A99D] hover:bg-[#008d83] text-white font-bold py-2.5 px-8 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-teal-505/10 cursor-pointer disabled:bg-slate-300 disabled:shadow-none"
                  >
                    <Play className="w-4 h-4" />
                    Bắt đầu Import Kết quả Học tập
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress & Logs Modal Panel */}
      {importing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-101">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#00A99D] animate-spin" />
                Đang import dữ liệu bảng điểm học sinh...
              </h4>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-505 mb-1.5">
                  <span>Tiến trình xử lý các Sheet:</span>
                  <span>
                    {Math.round(((currentProgressIndex + 1) / Object.keys(selectedSheets).filter(n => selectedSheets[n]).length) * 100)}%
                    ({currentProgressIndex + 1}/{Object.keys(selectedSheets).filter(n => selectedSheets[n]).length} lớp)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: (((currentProgressIndex + 1) / Object.keys(selectedSheets).filter(n => selectedSheets[n]).length) * 100) + "%" }}
                    className="h-full bg-[#00A99D] transition-all duration-300"
                  />
                </div>
              </div>

              {/* Logs area */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nhật ký xử lý hệ thống</label>
                <div className="bg-slate-950 text-slate-300 font-mono text-[10px] p-4 rounded-xl h-48 overflow-y-auto space-y-1">
                  {importLogs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed border-b border-slate-900/50 pb-1">
                      <span className="text-[#00A99D]">&gt;</span> {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Result Summary Report */}
      {importResult && (
        <div ref={resultRef} className="bg-white border border-emerald-200/80 p-6 rounded-2xl shadow-lg shadow-emerald-500/5 animate-in zoom-in-95 duration-200 scroll-mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                Báo cáo kết quả hoàn thành Import Bảng điểm
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Dữ liệu bảng điểm đã được ghi nhận vào cơ sở dữ liệu hệ thống. Hãy chọn các thao tác điều hướng bên dưới:
              </p>
            </div>
            
            {/* Quick Action Navigation Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/admin/ktdbcl/results")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Award className="w-4 h-4" />
                Xem Kết quả Học tập
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => router.push("/admin/ktdbcl/students")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Users className="w-4 h-4" />
                Xem Danh sách Học sinh
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => router.push("/admin/ho-so-hoc-sinh")}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                In Học bạ Học sinh
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setWorkbook(null)
                  setExcelSubjects([])
                  setImportResult(null)
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Import File khác
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cập nhật Hồ sơ Học sinh</label>
              <div className="text-2xl font-black text-slate-800">{importResult.studentsCount} học sinh</div>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Điểm môn học đã lưu</label>
              <div className="text-2xl font-black text-indigo-650">{importResult.scoresCount} điểm số</div>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Đánh giá tổng hợp đã lưu</label>
              <div className="text-2xl font-black text-teal-650">{importResult.summariesCount} đánh giá</div>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mb-6">
              <label className="block text-xs font-bold text-red-600 mb-2">Danh sách lỗi/Cảnh báo trong quá trình Import ({importResult.errors.length}):</label>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 max-h-40 overflow-y-auto text-red-800 font-mono text-[10px] space-y-1">
                {importResult.errors.map((err, idx) => (
                  <div key={idx} className="pb-1 border-b border-red-100/40">{idx + 1}. {err}</div>
                ))}
              </div>
            </div>
          )}

          {importResult.importedStudents && importResult.importedStudents.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <label className="block text-xs font-bold text-slate-500 mb-3 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-500" />
                Danh sách Học sinh đã xử lý ({importResult.importedStudents.length}):
              </label>
              <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[320px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-550 font-bold border-b border-slate-100 sticky top-0 z-10">
                      <th className="p-3 w-12 text-center">STT</th>
                      <th className="p-3 w-28">Mã vnEdu</th>
                      <th className="p-3">Họ và tên</th>
                      <th className="p-3 w-28 text-center">Lớp</th>
                      <th className="p-3 w-32 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importResult.importedStudents.map((s, idx) => (
                      <tr key={s.studentCode + "_" + idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="p-3 font-semibold text-slate-700">{s.studentCode}</td>
                        <td className="p-3 font-bold text-slate-800">{s.studentName}</td>
                        <td className="p-3 text-center text-slate-600 font-bold">{s.classCode}</td>
                        <td className="p-3 text-center">
                          {s.status === "success" ? (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold">Thành công</span>
                          ) : (
                            <span 
                              title={s.errorMsg}
                              className="text-[10px] bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-bold cursor-help"
                            >
                              Lỗi
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Danh sách lớp đã cập nhật điểm */}
      <div className="mt-8 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#00A99D]" />
            Trạng thái cập nhật điểm số theo Lớp học ({filteredStatsClasses.length}/{statsClasses.length})
          </h3>
          <button
            type="button"
            onClick={fetchClassStats}
            className="text-xs text-[#00A99D] hover:underline font-bold cursor-pointer"
          >
            Làm mới
          </button>
        </div>

        {/* Bộ lọc tiến độ lớp */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/60 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Cơ sở</label>
            <select
              value={filterCampus}
              onChange={(e) => setFilterCampus(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 outline-none focus:border-[#00A99D] cursor-pointer"
            >
              <option value="ALL">Tất cả Cơ sở</option>
              {uniqueCampuses.map(campus => (
                <option key={campus} value={campus}>{campus}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Khối</label>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 outline-none focus:border-[#00A99D] cursor-pointer"
            >
              <option value="ALL">Tất cả Khối</option>
              {uniqueGrades.map(grade => (
                <option key={grade} value={grade}>Khối {grade}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Trạng thái nhập</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 outline-none focus:border-[#00A99D] cursor-pointer"
            >
              <option value="ALL">Tất cả Trạng thái</option>
              <option value="DONE">Đã hoàn thành tất cả</option>
              <option value="PENDING">Chưa hoàn thành (Còn trống)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Tìm kiếm lớp</label>
            <div className="relative">
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Nhập mã lớp hoặc tên lớp..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 font-semibold text-slate-700 outline-none focus:border-[#00A99D] placeholder-slate-350"
              />
              {filterSearch && (
                <button
                  type="button"
                  onClick={() => setFilterSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {loadingStats ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase animate-pulse">Đang tải thống kê các lớp...</span>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-550 font-bold border-b border-slate-100 sticky top-0 z-10">
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3">Cơ sở</th>
                  <th className="p-3">Mã lớp</th>
                  <th className="p-3">Tên lớp</th>
                  <th className="p-3 text-center">Học kỳ 1</th>
                  <th className="p-3 text-center">Học kỳ 2</th>
                  <th className="p-3 text-center">Cả năm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredStatsClasses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-slate-400 italic">Không có dữ liệu lớp học phù hợp với bộ lọc.</td>
                  </tr>
                ) : (
                  filteredStatsClasses.map((c: any, idx: number) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-3">{c.campusName}</td>
                      <td className="p-3 font-extrabold text-slate-800">{c.classCode}</td>
                      <td className="p-3">{c.className}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.hk1 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" 
                            : "bg-slate-50 text-slate-400 border border-slate-200/40"
                        }`}>
                          {c.hk1 ? "Đã nhập" : "Trống"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.hk2 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" 
                            : "bg-slate-50 text-slate-400 border border-slate-200/40"
                        }`}>
                          {c.hk2 ? "Đã nhập" : "Trống"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.cn 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" 
                            : "bg-slate-50 text-slate-400 border border-slate-200/40"
                        }`}>
                          {c.cn ? "Đã nhập" : "Trống"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {debugActiveRawRows.length > 0 && (
        <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-sm overflow-x-auto text-[10px] font-mono mt-6">
          <h4 className="text-xs font-bold text-slate-300 mb-2">DEBUG: Raw Excel Cells (First 15 rows of {activeSheet})</h4>
          <table className="border-collapse border border-slate-700 w-full text-left">
            <thead>
              <tr className="bg-slate-800">
                <th className="border border-slate-700 p-1">Row</th>
                {Array.from({ length: Math.max(...debugActiveRawRows.map(r => r.length), 0) }).map((_, idx) => (
                  <th key={idx} className="border border-slate-700 p-1">{String.fromCharCode(65 + idx)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {debugActiveRawRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  <td className="border border-slate-700 p-1 font-bold bg-slate-800 text-center">{rIdx + 1}</td>
                  {Array.from({ length: Math.max(...debugActiveRawRows.map(r => r.length), 0) }).map((_, cIdx) => (
                    <td key={cIdx} className="border border-slate-700 p-1 max-w-[150px] truncate" title={String(row[cIdx] || "")}>
                      {String(row[cIdx] || "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
