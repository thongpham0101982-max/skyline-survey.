"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import {
  Award,
  Search,
  Users,
  Check,
  X,
  Trash2,
  Plus,
  FileSpreadsheet,
  Download,
  Trophy,
  RefreshCw,
  UserPlus,
  ClipboardPaste,
  CopyCheck,
  Loader2,
  Save,
} from "lucide-react"
import {
  upsertExamResultsAction,
  getStudentsWithResultsAction,
  quickSearchStudentsForExamAction,
  resolveStudentsByCodesAction,
  getStudentsByClassAction,
  removeStudentFromExamAction,
} from "./actions"
import { QuickCreateExamModal, DirectAwardModal } from "./quick-modals"
import { ReportsSubTab, ProfilesSubTab, RequestsSubTab } from "./secondary-tabs"

interface ResultsClientProps {
  exams: any[]
  academicYears: any[]
  teachers: any[]
  campuses: any[]
  classes: any[]
  achievementCategories: any[]
  achievementLevels: any[]
  examCategories?: any[]
  examRounds?: any[]
  initialTab?: "input" | "reports" | "profiles" | "requests"
  initialYearId?: string
}

interface AwardPreset {
  key: string
  shortLabel: string
  fullLabel: string
  category: string
  level: string
  tone: "gold" | "silver" | "bronze" | "teal"
}

function stripAccents(str: string) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
}

export function ResultsClient({
  exams: initialExams,
  academicYears,
  teachers,
  campuses,
  classes,
  achievementCategories,
  achievementLevels,
  examCategories = [],
  examRounds = [],
  initialTab = "input",
  initialYearId = "",
}: ResultsClientProps) {
  const router = useRouter()
  const [examsList, setExamsList] = useState<any[]>(initialExams)
  useEffect(() => {
    setExamsList(initialExams)
  }, [initialExams])

  // Academic Year Sync
  const [yearId, setYearId] = useState<string>(() => {
    if (initialYearId) return initialYearId
    const active = academicYears.find((y: any) => y.status === "ACTIVE")
    return active ? active.id : academicYears[0]?.id || ""
  })

  useEffect(() => {
    const syncYear = () => {
      try {
        const stored = localStorage.getItem("selectedAcademicYear")
        if (stored && academicYears.some((y: any) => y.id === stored)) {
          setYearId(stored)
        }
      } catch {}
    }
    syncYear()
    window.addEventListener("academicYearChanged", syncYear)
    return () => window.removeEventListener("academicYearChanged", syncYear)
  }, [academicYears])

  const activeYearName = useMemo(
    () => academicYears.find((y: any) => y.id === yearId)?.name || "",
    [academicYears, yearId]
  )

  const [subTab, setSubTab] = useState<"input" | "reports" | "profiles" | "requests">(initialTab)
  useEffect(() => {
    setSubTab(initialTab)
  }, [initialTab])

  // Non-blocking Toast Feedback
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const notify = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type })
  }, [])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3800)
    return () => clearTimeout(timer)
  }, [toast])

  // Labels & Quick Presets
  const CATEGORY_LABELS = useMemo(() => {
    const map: Record<string, string> = {}
    achievementCategories.forEach((c) => {
      map[c.code] = c.name
    })
    return map
  }, [achievementCategories])

  const LEVEL_LABELS = useMemo(() => {
    const map: Record<string, string> = {}
    achievementLevels.forEach((l) => {
      map[l.code] = l.name
    })
    return map
  }, [achievementLevels])

  const awardPresets = useMemo<AwardPreset[]>(() => {
    const presets: AwardPreset[] = []
    const getShort = (code: string, name: string) => {
      const u = (code || "").toUpperCase()
      if (u === "NHAT" || u === "1") return "Nhất"
      if (u === "NHI" || u === "2") return "Nhì"
      if (u === "BA" || u === "3") return "Ba"
      if (u === "KHUYEN_KHICH" || u === "KK") return "KK"
      if (u === "VANG" || u === "HCV") return "HCV"
      if (u === "BAC" || u === "HCB") return "HCB"
      if (u === "DONG" || u === "HCD") return "HCĐ"
      return name
        .replace(/^Giải\s+/i, "")
        .replace(/^Huy chương\s+/i, "HC ")
        .trim()
    }
    const getTone = (code: string): AwardPreset["tone"] => {
      const u = (code || "").toUpperCase()
      if (u.includes("NHAT") || u.includes("VANG") || u === "1") return "gold"
      if (u.includes("NHI") || u.includes("BAC") || u === "2") return "silver"
      if (u.includes("BA") || u.includes("DONG") || u === "3") return "bronze"
      return "teal"
    }

    const seenKeys = new Set<string>()
    for (const cat of achievementCategories) {
      const lvls = achievementLevels.filter((l) => l.categoryId === cat.id)
      if (lvls.length > 0) {
        for (const lvl of lvls) {
          const presetKey = `${cat.code}::${lvl.code}`
          if (seenKeys.has(presetKey)) continue
          seenKeys.add(presetKey)
          presets.push({
            key: presetKey,
            shortLabel: getShort(lvl.code, lvl.name),
            fullLabel: lvl.name,
            category: cat.code,
            level: lvl.code,
            tone: getTone(lvl.code),
          })
        }
      } else {
        const presetKey = `${cat.code}::`
        if (seenKeys.has(presetKey)) continue
        seenKeys.add(presetKey)
        presets.push({
          key: presetKey,
          shortLabel: cat.name.length > 12 ? cat.name.slice(0, 10) + "…" : cat.name,
          fullLabel: cat.name,
          category: cat.code,
          level: "",
          tone: "teal",
        })
      }
    }
    return presets.slice(0, 9)
  }, [achievementCategories, achievementLevels])

  // Modals State
  const [isQuickExamOpen, setIsQuickExamOpen] = useState(false)
  const [directAwardModal, setDirectAwardModal] = useState<{
    isOpen: boolean
    student: any | null
  }>({ isOpen: false, student: null })

  // --- TAB 1: RESULT ENTRY GRID STATE ---
  const filteredExams = useMemo(
    () => examsList.filter((e) => e.academicYearId === yearId),
    [examsList, yearId]
  )
  const [selectedExamId, setSelectedExamId] = useState("")
  const [examSearchFilter, setExamSearchFilter] = useState("")
  const currentExam = examsList.find((e) => e.id === selectedExamId)

  const [loadingStudents, setLoadingStudents] = useState(false)
  const [gridRows, setGridRows] = useState<any[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [changedStudentIds, setChangedStudentIds] = useState<Set<string>>(new Set())
  const [checkedRowIds, setCheckedRowIds] = useState<Set<string>>(new Set())
  const [savingGrid, setSavingGrid] = useState(false)

  // Grid Filters & Pagination
  const [gridSearch, setGridSearch] = useState("")
  const [gridClassFilter, setGridClassFilter] = useState("")
  const [gridStatusFilter, setGridStatusFilter] = useState<"all" | "awarded" | "none" | "dirty">(
    "all"
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Bulk Apply State
  const [bulkType, setBulkType] = useState("CA_NHAN")
  const [bulkCategory, setBulkCategory] = useState("")
  const [bulkLevel, setBulkLevel] = useState("")
  const [bulkTeacherId, setBulkTeacherId] = useState("")

  // Quick-Add Bar State (Collapsible on desktop to keep the table front-and-center)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showQuickChips, setShowQuickChips] = useState(true)
  const [quickMode, setQuickMode] = useState<"search" | "paste" | "class">("search")
  const [quickQuery, setQuickQuery] = useState("")
  const [quickResults, setQuickResults] = useState<any[]>([])
  const [quickSearching, setQuickSearching] = useState(false)
  const [quickPresetKey, setQuickPresetKey] = useState<string>("")
  const [quickType, setQuickType] = useState<"CA_NHAN" | "DONG_DOI">("CA_NHAN")
  const [quickTeacherId, setQuickTeacherId] = useState<string>("")
  const [quickPasteText, setQuickPasteText] = useState("")
  const [quickCampusId, setQuickCampusId] = useState("")
  const [quickClassId, setQuickClassId] = useState("")
  const quickInputRef = useRef<HTMLInputElement>(null)

  // Sync Exam Selection
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const queryExamId = urlParams.get("examId")
      if (queryExamId && examsList.some((e) => e.id === queryExamId)) {
        const targetExam = examsList.find((e) => e.id === queryExamId)
        if (targetExam?.academicYearId && targetExam.academicYearId !== yearId) {
          setYearId(targetExam.academicYearId)
          try {
            localStorage.setItem("selectedAcademicYear", targetExam.academicYearId)
            document.cookie = `selectedAcademicYear=${targetExam.academicYearId}; path=/; max-age=31536000; SameSite=Lax`
            window.dispatchEvent(new Event("academicYearChanged"))
          } catch {}
        }
        setSelectedExamId(queryExamId)
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }
    }

    if (filteredExams.length > 0) {
      if (!filteredExams.some((e) => e.id === selectedExamId)) {
        setSelectedExamId(filteredExams[0].id)
      }
    } else {
      if (selectedExamId !== "") setSelectedExamId("")
      if (gridRows.length > 0) setGridRows([])
      if (hasChanges) setHasChanges(false)
    }
  }, [filteredExams, yearId, selectedExamId, examsList])

  const loadExamStudents = useCallback(async (targetId?: string) => {
    const eid = targetId ?? selectedExamId
    if (!eid) return
    setLoadingStudents(true)
    try {
      const data = await getStudentsWithResultsAction(eid)
      const rows = data.map((s, idx) => ({
        gridRowId: s.achievementId
          ? `${s.id}__${s.achievementId}__${idx}`
          : `row-${s.id}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
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
        teacherName: s.teacherName || "",
      }))
      setGridRows(rows)
      setHasChanges(false)
      setChangedStudentIds(new Set())
      setCheckedRowIds(new Set())
    } catch (e) {
      console.error(e)
      notify("Lỗi khi tải danh sách học sinh dự thi.", "error")
    } finally {
      setLoadingStudents(false)
    }
  }, [selectedExamId, notify])

  useEffect(() => {
    if (selectedExamId) {
      loadExamStudents(selectedExamId)
      setCurrentPage(1)
      setGridClassFilter("")
      setGridSearch("")
      setGridStatusFilter("all")
    }
  }, [selectedExamId, loadExamStudents])

  // Mark student dirty helper
  const markStudentDirty = (studentId: string) => {
    setHasChanges(true)
    setChangedStudentIds((prev) => {
      const next = new Set(prev)
      next.add(studentId)
      return next
    })
  }

  // Insert or Update Students via Quick-Add Bar
  const insertStudentsIntoGrid = (studentsToAdd: any[]) => {
    if (!studentsToAdd || studentsToAdd.length === 0) return

    const preset = awardPresets.find((p) => p.key === quickPresetKey)
    const presetCat = preset?.category || ""
    const presetLvl = preset?.level || ""
    const presetName = preset?.fullLabel || ""
    const resolvedTeacherName = quickTeacherId
      ? teachers.find((t) => t.id === quickTeacherId)?.teacherName || ""
      : ""

    let addedCount = 0
    let updatedCount = 0

    setGridRows((prev) => {
      const next = [...prev]

      for (const stu of studentsToAdd) {
        const existingIndexes = next
          .map((r, i) => (r.studentId === stu.id ? i : -1))
          .filter((i) => i >= 0)

        if (existingIndexes.length === 0) {
          addedCount++
          next.unshift({
            gridRowId: `quick-${stu.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            studentId: stu.id,
            studentCode: stu.studentCode,
            studentName: stu.studentName,
            gender: stu.gender || "Chưa xác định",
            className: stu.className || "N/A",
            campusName: stu.campusName || "N/A",
            achievementId: null,
            name: presetName,
            type: quickType,
            category: presetCat,
            level: presetLvl,
            teacherId: quickTeacherId,
            teacherName: resolvedTeacherName,
          })
        } else if (presetCat) {
          const emptyIdx = existingIndexes.find((idx) => !next[idx].category)
          if (emptyIdx !== undefined) {
            updatedCount++
            next[emptyIdx] = {
              ...next[emptyIdx],
              type: quickType,
              category: presetCat,
              level: presetLvl,
              name: presetName,
              teacherId: quickTeacherId || next[emptyIdx].teacherId,
              teacherName: resolvedTeacherName || next[emptyIdx].teacherName,
            }
          } else {
            // Avoid exact duplicate preset on same student; add extra award row if distinct
            const alreadySame = existingIndexes.some(
              (idx) => next[idx].category === presetCat && next[idx].level === presetLvl
            )
            if (!alreadySame) {
              updatedCount++
              const lastIdx = existingIndexes[existingIndexes.length - 1]
              next.splice(lastIdx + 1, 0, {
                gridRowId: `quick-${stu.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                studentId: stu.id,
                studentCode: stu.studentCode,
                studentName: stu.studentName,
                gender: stu.gender || next[lastIdx].gender,
                className: stu.className || next[lastIdx].className,
                campusName: stu.campusName || next[lastIdx].campusName,
                achievementId: null,
                name: presetName,
                type: quickType,
                category: presetCat,
                level: presetLvl,
                teacherId: quickTeacherId,
                teacherName: resolvedTeacherName,
              })
            }
          }
        }
      }
      return next
    })

    setChangedStudentIds((prev) => {
      const next = new Set(prev)
      studentsToAdd.forEach((s) => next.add(s.id))
      return next
    })
    setHasChanges(true)
    setCurrentPage(1)

    if (addedCount > 0 || updatedCount > 0) {
      notify(
        preset
          ? `Đã thêm/gán "${preset.fullLabel}" cho ${addedCount + updatedCount} học sinh (Nhấn Lưu để hoàn tất).`
          : `Đã đưa ${addedCount} học sinh vào bảng kết quả.`
      )
    } else {
      notify("Học sinh đã có mặt trong bảng kết quả.")
    }
  }

  // Quick Search Handler
  const handleQuickSearchChange = async (val: string) => {
    setQuickQuery(val)
    if (val.trim().length < 2) {
      setQuickResults([])
      return
    }
    setQuickSearching(true)
    try {
      const res = await quickSearchStudentsForExamAction(val, yearId)
      setQuickResults(res)
    } finally {
      setQuickSearching(false)
    }
  }

  const handleQuickPasteSubmit = async () => {
    const codes = quickPasteText
      .split(/[\n,;\t\s]+/)
      .map((c) => c.trim())
      .filter(Boolean)
    if (codes.length === 0) return
    setQuickSearching(true)
    try {
      const matched = await resolveStudentsByCodesAction(codes, yearId)
      if (matched.length === 0) {
        notify("Không tìm thấy học sinh nào khớp với danh sách Mã HS đã dán.", "error")
        return
      }
      insertStudentsIntoGrid(matched)
      setQuickPasteText("")
    } finally {
      setQuickSearching(false)
    }
  }

  const handleQuickAddWholeClass = async () => {
    if (!quickClassId) return
    setQuickSearching(true)
    try {
      const list = await getStudentsByClassAction(quickClassId)
      if (list.length === 0) {
        notify("Lớp chưa có học sinh hoạt động.", "error")
        return
      }
      insertStudentsIntoGrid(list)
    } finally {
      setQuickSearching(false)
    }
  }

  // Row Cell & Quick-Preset Handlers
  const applyPresetToRow = (gridRowId: string, preset: AwardPreset) => {
    const target = gridRows.find((r) => r.gridRowId === gridRowId)
    if (!target) return
    markStudentDirty(target.studentId)

    setGridRows((prev) =>
      prev.map((row) => {
        if (row.gridRowId !== gridRowId) return row
        const isSame = row.category === preset.category && row.level === preset.level
        if (isSame) {
          return { ...row, category: "", level: "", name: "" }
        }
        return {
          ...row,
          category: preset.category,
          level: preset.level,
          name: preset.fullLabel,
        }
      })
    )
  }

  const handleCellChange = (gridRowId: string, field: string, value: any) => {
    const targetRow = gridRows.find((r) => r.gridRowId === gridRowId)
    if (targetRow) markStudentDirty(targetRow.studentId)

    setGridRows((prev) =>
      prev.map((row) => {
        if (row.gridRowId !== gridRowId) return row
        const updatedRow = { ...row, [field]: value }

        if (field === "category") {
          if (!value) {
            updatedRow.level = ""
            updatedRow.name = ""
          } else {
            updatedRow.level = ""
            const catObj = achievementCategories.find((c) => c.code === value)
            const catLevels = catObj
              ? achievementLevels.filter((l) => l.categoryId === catObj.id)
              : []
            if (catLevels.length === 0) {
              updatedRow.name = CATEGORY_LABELS[value] || catObj?.name || value
            } else {
              updatedRow.name = ""
            }
          }
        } else if (field === "level") {
          const cat = row.category
          if (!cat) {
            updatedRow.name = ""
          } else if (!value) {
            updatedRow.name = CATEGORY_LABELS[cat] || ""
          } else {
            updatedRow.name = LEVEL_LABELS[value] || value
          }
        }
        return updatedRow
      })
    )
  }

  // Copy Coach to all awarded rows without coach
  const handleCopyTeacherToAwarded = (sourceRow: any) => {
    if (!sourceRow.teacherId && !sourceRow.teacherName) return
    let count = 0
    setGridRows((prev) =>
      prev.map((r) => {
        if (!r.category) return r
        if (r.teacherId || r.teacherName) return r
        count++
        markStudentDirty(r.studentId)
        return {
          ...r,
          teacherId: sourceRow.teacherId,
          teacherName: sourceRow.teacherName,
        }
      })
    )
    if (count > 0) {
      notify(`Đã điền nhanh GV bồi dưỡng cho ${count} học sinh đạt giải chưa có GV.`)
    } else {
      notify("Tất cả học sinh đạt giải đều đã có thông tin GV bồi dưỡng.")
    }
  }

  const handleAddAwardRowForStudent = (studentId: string, indexInFull: number) => {
    markStudentDirty(studentId)
    setGridRows((prev) => {
      const next = [...prev]
      const parentRow = prev.find((r) => r.studentId === studentId)
      if (!parentRow) return prev

      const newRow = {
        gridRowId: `extra-${studentId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
        teacherId: parentRow.teacherId || "",
        teacherName: parentRow.teacherName || "",
      }

      let insertAfter = indexInFull >= 0 ? indexInFull : next.findIndex((r) => r.studentId === studentId)
      for (let i = insertAfter + 1; i < next.length; i++) {
        if (next[i].studentId === studentId) insertAfter = i
        else break
      }
      next.splice(insertAfter + 1, 0, newRow)
      return next
    })
  }

  const handleClearOrRemoveRow = async (row: any) => {
    const countForStudent = gridRows.filter((r) => r.studentId === row.studentId).length
    if (countForStudent > 1) {
      markStudentDirty(row.studentId)
      setGridRows((prev) => prev.filter((r) => r.gridRowId !== row.gridRowId))
      return
    }
    if (row.category || row.level || row.name) {
      markStudentDirty(row.studentId)
      setGridRows((prev) =>
        prev.map((r) =>
          r.gridRowId === row.gridRowId
            ? {
                ...r,
                achievementId: r.achievementId,
                name: "",
                type: "CA_NHAN",
                category: "",
                level: "",
                teacherId: "",
                teacherName: "",
              }
            : r
        )
      )
      return
    }
    // Row is already empty -> ask to remove student from exam registration
    if (confirm(`Xóa học sinh ${row.studentName} khỏi danh sách dự thi kỳ thi này?`)) {
      try {
        await removeStudentFromExamAction(selectedExamId, row.studentId)
        setGridRows((prev) => prev.filter((r) => r.studentId !== row.studentId))
        notify(`Đã gỡ ${row.studentName} khỏi danh sách kỳ thi.`)
      } catch {
        notify("Không thể gỡ học sinh khỏi kỳ thi.", "error")
      }
    }
  }

  // Bulk Apply to Checked Rows
  const handleBulkApply = () => {
    if (checkedRowIds.size === 0) return
    const count = checkedRowIds.size
    setHasChanges(true)

    setGridRows((prev) =>
      prev.map((row) => {
        if (!checkedRowIds.has(row.gridRowId)) return row
        setChangedStudentIds((c) => {
          const next = new Set(c)
          next.add(row.studentId)
          return next
        })

        const updated: any = { ...row, type: bulkType, category: bulkCategory }
        if (!bulkCategory) {
          updated.level = ""
          updated.name = ""
        } else {
          updated.level = bulkLevel
          updated.name = bulkLevel
            ? LEVEL_LABELS[bulkLevel] || bulkLevel
            : CATEGORY_LABELS[bulkCategory] || bulkCategory
        }
        if (bulkTeacherId) {
          updated.teacherId = bulkTeacherId
          updated.teacherName = teachers.find((t) => t.id === bulkTeacherId)?.teacherName || ""
        }
        return updated
      })
    )
    setCheckedRowIds(new Set())
    notify(`Đã áp dụng hàng loạt cho ${count} dòng đã chọn (Nhấn Lưu để hoàn tất).`)
  }

  // Save Grid Action
  const handleSaveGrid = useCallback(async () => {
    if (!selectedExamId || savingGrid) return
    const changedRowsToSave = gridRows.filter((r) => changedStudentIds.has(r.studentId))
    if (changedRowsToSave.length === 0) {
      notify("Chưa có thay đổi nào cần lưu.")
      return
    }

    setSavingGrid(true)
    try {
      const rowsPayload = changedRowsToSave.map((r) => {
        const catName = CATEGORY_LABELS[r.category] || r.category || "Thành tích"
        const lvlName = LEVEL_LABELS[r.level] || r.level || ""
        const autoFallback = lvlName || catName
        const finalName =
          r.name && r.name.trim() ? r.name.trim() : r.category ? autoFallback : ""

        return {
          achievementId: r.achievementId,
          studentId: r.studentId,
          name: finalName,
          type: r.type || "CA_NHAN",
          category: r.category || "",
          level: r.level || "",
          teacherId: r.teacherId === "KHAC" ? null : r.teacherId || null,
          teacherName:
            r.teacherId === "KHAC"
              ? r.teacherName || null
              : r.teacherId
              ? teachers.find((t) => t.id === r.teacherId)?.teacherName || null
              : r.teacherName || null,
        }
      })

      await upsertExamResultsAction(selectedExamId, yearId, rowsPayload)
      setHasChanges(false)
      setChangedStudentIds(new Set())
      notify("Đã lưu kết quả thành tích an toàn.")
      await loadExamStudents(selectedExamId)
    } catch (err: any) {
      notify(err?.message || "Lỗi khi lưu kết quả thành tích.", "error")
    } finally {
      setSavingGrid(false)
    }
  }, [
    selectedExamId,
    savingGrid,
    gridRows,
    changedStudentIds,
    CATEGORY_LABELS,
    LEVEL_LABELS,
    teachers,
    yearId,
    loadExamStudents,
    notify,
  ])

  // Keyboard Shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    if (subTab !== "input") return
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        if (hasChanges && !savingGrid) {
          handleSaveGrid()
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [subTab, hasChanges, savingGrid, handleSaveGrid])

  // Download Sample Excel & Smart Excel Import (with Auto-Resolve for Unregistered Students!)
  const handleDownloadSampleExcel = () => {
    const wb = XLSX.utils.book_new()
    const header = [
      "Mã HS",
      "Họ Tên",
      "Lớp",
      "Hình thức",
      "Loại giải",
      "Mức giải",
      "Tên giải thưởng",
      "GV Bồi dưỡng",
    ]
    const data: any[][] = [header]
    if (gridRows.length > 0) {
      gridRows.forEach((r) => {
        data.push([
          r.studentCode,
          r.studentName,
          r.className,
          r.type === "DONG_DOI" ? "Đồng đội" : "Cá nhân",
          CATEGORY_LABELS[r.category] || r.category || "",
          LEVEL_LABELS[r.level] || r.level || "",
          r.name || "",
          r.teacherName ||
            (r.teacherId ? teachers.find((t) => t.id === r.teacherId)?.teacherName || "" : ""),
        ])
      })
    } else {
      data.push([
        "0501030347",
        "Nguyễn Văn A",
        "6/1",
        "Cá nhân",
        achievementCategories[0]?.name || "Giải thưởng",
        achievementLevels[0]?.name || "Giải Nhất",
        "Giải Nhất cấp Thành phố",
        "",
      ])
    }
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws["!cols"] = [
      { wch: 15 },
      { wch: 24 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 28 },
      { wch: 22 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, "Nhap_Ket_Qua")
    XLSX.writeFile(wb, `Mau_Ket_Qua_${currentExam?.code || "KyThi"}.xlsx`)
  }

  const resolveExcelCategoryAndLevel = (rawCat: string, rawLvl: string) => {
    const normCat = stripAccents(rawCat)
    const normLvl = stripAccents(rawLvl)

    let matchedCat = achievementCategories.find(
      (c) =>
        stripAccents(c.code) === normCat ||
        stripAccents(c.name) === normCat ||
        (normCat && stripAccents(c.name).includes(normCat))
    )

    let matchedLvl = achievementLevels.find(
      (l) =>
        stripAccents(l.code) === normLvl ||
        stripAccents(l.name) === normLvl ||
        (normLvl && stripAccents(l.name).includes(normLvl))
    )

    // Smart inference if user only filled "Mức giải" (e.g. "Giải Nhất" or "Huy chương Vàng")
    if (!matchedCat && matchedLvl && matchedLvl.categoryId) {
      matchedCat = achievementCategories.find((c) => c.id === matchedLvl!.categoryId)
    }
    if (!matchedCat && normLvl) {
      if (normLvl.includes("vang") || normLvl.includes("bac") || normLvl.includes("dong") || normLvl.includes("hc")) {
        matchedCat = achievementCategories.find((c) => stripAccents(c.code).includes("huy_chuong") || stripAccents(c.name).includes("huy chuong"))
      } else if (normLvl.includes("chung nhan") || normLvl.includes("hoan thanh")) {
        matchedCat = achievementCategories.find((c) => stripAccents(c.code).includes("chung_nhan") || stripAccents(c.name).includes("chung nhan"))
      } else {
        matchedCat = achievementCategories[0]
      }
    }

    return {
      category: matchedCat?.code || rawCat.trim(),
      level: matchedLvl?.code || rawLvl.trim(),
      autoName: matchedLvl?.name || matchedCat?.name || "",
    }
  }

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: "binary" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rawRows: any[] = XLSX.utils.sheet_to_json(ws)

        const cleanCode = (c: any) => String(c || "").trim().replace(/^0+/, "").toUpperCase()
        const excelCodes = rawRows
          .map((r) => r["Mã HS"] || r["Mã học sinh"] || r["Mã Học Sinh"] || r["studentCode"])
          .filter(Boolean)
          .map((c) => String(c).trim())

        // Resolve any unregistered students directly from DB!
        const existingNormCodes = new Set(gridRows.map((r) => cleanCode(r.studentCode)))
        const missingCodes = excelCodes.filter((c) => !existingNormCodes.has(cleanCode(c)))
        const newlyResolved =
          missingCodes.length > 0
            ? await resolveStudentsByCodesAction(missingCodes, yearId)
            : []
        const resolvedMap = new Map<string, any>()
        newlyResolved.forEach((s) => resolvedMap.set(cleanCode(s.studentCode), s))

        let importedCount = 0
        const touchedIds = new Set<string>()

        setGridRows((prev) => {
          const next = [...prev]
          const processedCounts: Record<string, number> = {}

          for (const row of rawRows) {
            const rawStudentCode =
              row["Mã HS"] || row["Mã học sinh"] || row["Mã Học Sinh"] || row["studentCode"]
            if (!rawStudentCode) continue
            const normKey = cleanCode(rawStudentCode)

            const rawType = String(
              row["Hình thức (CA_NHAN/DONG_DOI)"] || row["Hình thức"] || "CA_NHAN"
            )
            const type = stripAccents(rawType).includes("dong doi") ? "DONG_DOI" : "CA_NHAN"
            const rawCat = String(
              row["Loại giải (GIAI_THUONG/HUY_CHUONG/CHUNG_NHAN/KHAC)"] ||
                row["Loại giải"] ||
                row["Loại thành tích"] ||
                ""
            ).trim()
            const rawLvl = String(
              row["Mức giải (NHAT/NHI/BA/KHUYEN_KHICH/VANG/BAC/DONG)"] ||
                row["Mức giải"] ||
                row["Mức thành tích"] ||
                ""
            ).trim()
            const rawName = String(
              row["Tên giải thưởng"] || row["Tên thành tích"] || row["Thành tích đạt được"] || ""
            ).trim()
            const rawTeacher = String(
              row["Mã GV Bồi dưỡng (Tùy chọn)"] || row["GV Bồi dưỡng"] || row["GV bồi dưỡng"] || ""
            ).trim()

            if (!rawCat && !rawLvl && !rawName) continue

            const { category, level, autoName } = resolveExcelCategoryAndLevel(rawCat, rawLvl)
            if (!category) continue
            const finalName = rawName || autoName

            let matchedTeacherId = ""
            let matchedTeacherName = ""
            if (rawTeacher) {
              const tObj = teachers.find(
                (t) =>
                  t.id === rawTeacher ||
                  stripAccents(t.teacherCode) === stripAccents(rawTeacher) ||
                  stripAccents(t.teacherName) === stripAccents(rawTeacher)
              )
              if (tObj) {
                matchedTeacherId = tObj.id
                matchedTeacherName = tObj.teacherName
              } else {
                matchedTeacherId = "KHAC"
                matchedTeacherName = rawTeacher
              }
            }

            const studentRowIndexes: number[] = []
            next.forEach((r, idx) => {
              if (cleanCode(r.studentCode) === normKey) studentRowIndexes.push(idx)
            })

            if (studentRowIndexes.length === 0) {
              const resolvedStu = resolvedMap.get(normKey)
              if (!resolvedStu) continue
              importedCount++
              touchedIds.add(resolvedStu.id)
              next.push({
                gridRowId: `imp-${resolvedStu.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                studentId: resolvedStu.id,
                studentCode: resolvedStu.studentCode,
                studentName: resolvedStu.studentName,
                gender: resolvedStu.gender,
                className: resolvedStu.className,
                campusName: resolvedStu.campusName,
                achievementId: null,
                name: finalName,
                type,
                category,
                level,
                teacherId: matchedTeacherId,
                teacherName: matchedTeacherName,
              })
              processedCounts[normKey] = 1
              continue
            }

            importedCount++
            const instanceIdx = processedCounts[normKey] || 0
            processedCounts[normKey] = instanceIdx + 1

            if (instanceIdx < studentRowIndexes.length) {
              const targetIdx = studentRowIndexes[instanceIdx]
              touchedIds.add(next[targetIdx].studentId)
              next[targetIdx] = {
                ...next[targetIdx],
                type,
                category,
                level,
                name: finalName,
                teacherId: matchedTeacherId || next[targetIdx].teacherId,
                teacherName: matchedTeacherName || next[targetIdx].teacherName,
              }
            } else {
              const lastIdx = studentRowIndexes[studentRowIndexes.length - 1]
              const base = next[lastIdx]
              touchedIds.add(base.studentId)
              next.splice(lastIdx + 1, 0, {
                gridRowId: `imp-${base.studentId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                studentId: base.studentId,
                studentCode: base.studentCode,
                studentName: base.studentName,
                gender: base.gender,
                className: base.className,
                campusName: base.campusName,
                achievementId: null,
                name: finalName,
                type,
                category,
                level,
                teacherId: matchedTeacherId,
                teacherName: matchedTeacherName,
              })
            }
          }
          return next
        })

        if (importedCount > 0) {
          setChangedStudentIds((prev) => {
            const next = new Set(prev)
            touchedIds.forEach((id) => next.add(id))
            return next
          })
          setHasChanges(true)
          notify(`Đã nạp ${importedCount} kết quả từ Excel (Nhấn Lưu kết quả để hoàn tất).`)
        } else {
          notify("Không tìm thấy dòng kết quả hợp lệ nào trong file Excel.", "error")
        }
      } catch (err) {
        console.error(err)
        notify("File Excel không đúng định dạng. Vui lòng tải file mẫu.", "error")
      } finally {
        if (e.target) e.target.value = ""
      }
    }
    reader.readAsBinaryString(file)
  }

  // Computed Grid Stats & Filtered Rows
  const totalUniqueStudents = useMemo(
    () => new Set(gridRows.map((r) => r.studentId)).size,
    [gridRows]
  )
  const awardedRowsCount = useMemo(
    () => gridRows.filter((r) => Boolean(r.category)).length,
    [gridRows]
  )
  const unawardedCount = useMemo(() => {
    const awardedStudents = new Set(
      gridRows.filter((r) => Boolean(r.category)).map((r) => r.studentId)
    )
    return Math.max(0, totalUniqueStudents - awardedStudents.size)
  }, [gridRows, totalUniqueStudents])

  const gridClasses = useMemo(
    () => Array.from(new Set(gridRows.map((r) => r.className).filter(Boolean))).sort(),
    [gridRows]
  )

  const filteredGridRows = useMemo(() => {
    return gridRows.filter((r) => {
      if (gridClassFilter && r.className !== gridClassFilter) return false
      if (gridStatusFilter === "awarded" && !r.category) return false
      if (gridStatusFilter === "none" && r.category) return false
      if (gridStatusFilter === "dirty" && !changedStudentIds.has(r.studentId)) return false
      if (gridSearch.trim()) {
        const q = gridSearch.trim().toLowerCase()
        if (
          !(r.studentName || "").toLowerCase().includes(q) &&
          !(r.studentCode || "").toLowerCase().includes(q) &&
          !(r.name || "").toLowerCase().includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [gridRows, gridClassFilter, gridStatusFilter, gridSearch, changedStudentIds])

  const uniqueFilteredStudentIds = useMemo(
    () => Array.from(new Set(filteredGridRows.map((r) => r.studentId))),
    [filteredGridRows]
  )
  const totalPages = Math.max(1, Math.ceil(uniqueFilteredStudentIds.length / rowsPerPage))
  const pagedStudentIds = useMemo(
    () =>
      new Set(
        uniqueFilteredStudentIds.slice(
          (currentPage - 1) * rowsPerPage,
          currentPage * rowsPerPage
        )
      ),
    [uniqueFilteredStudentIds, currentPage, rowsPerPage]
  )
  const pagedGridRows = useMemo(
    () => filteredGridRows.filter((r) => pagedStudentIds.has(r.studentId)),
    [filteredGridRows, pagedStudentIds]
  )

  const displayedExamsDropdown = useMemo(() => {
    const q = examSearchFilter.trim().toLowerCase()
    if (!q) return filteredExams
    return filteredExams.filter(
      (e) =>
        (e.name || "").toLowerCase().includes(q) || (e.code || "").toLowerCase().includes(q)
    )
  }, [filteredExams, examSearchFilter])

  return (
    <div className="space-y-4 relative">
      {/* Non-blocking Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
            toast.type === "error"
              ? "bg-rose-50 border-rose-200 text-[#E11D48]"
              : "bg-[#003B3A] border-[#003B3A] text-white"
          }`}
        >
          {toast.type === "error" ? (
            <X className="w-4 h-4 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-[#5EEAD4] shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* =====================================================================
       * SUB-TAB 1: NHẬP KẾT QUẢ NHANH (FAST RESULT ENTRY WORKSPACE)
       * =================================================================== */}
      {subTab === "input" && (
        <div className="space-y-3.5 no-print">
          {/* 1. Single-Row Desktop Exam Control Bar */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs px-4 py-3 space-y-3">
            <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-2.5">
              {/* Left: Exam Selector + Compact Actions */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 min-w-0">
                {activeYearName && (
                  <span
                    className="hidden 2xl:inline-flex items-center px-2.5 py-2 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#003B3A] text-xs font-bold shrink-0 tabular-nums whitespace-nowrap"
                    title="Danh sách kỳ thi được lọc theo Năm học đang chọn"
                  >
                    {filteredExams.length} kỳ thi
                  </span>
                )}
                {filteredExams.length > 8 && (
                  <div className="relative w-36 shrink-0 hidden lg:block">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={examSearchFilter}
                      onChange={(e) => setExamSearchFilter(e.target.value)}
                      placeholder="Lọc kỳ thi..."
                      className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] text-xs outline-none"
                    />
                  </div>
                )}

                <select
                  value={selectedExamId}
                  onChange={(e) => {
                    if (
                      hasChanges &&
                      !confirm(
                        "Bạn đang có thay đổi chưa lưu trên lưới kết quả. Chuyển sang kỳ thi khác sẽ hủy thay đổi này?"
                      )
                    ) {
                      return
                    }
                    setSelectedExamId(e.target.value)
                  }}
                  disabled={filteredExams.length === 0}
                  className="flex-1 min-w-[240px] max-w-xl border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-bold text-[#003B3A] bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none cursor-pointer truncate"
                >
                  {displayedExamsDropdown.length === 0 ? (
                    <option value="">-- Chưa có kỳ thi phù hợp trong năm học --</option>
                  ) : (
                    displayedExamsDropdown.map((e) => (
                      <option key={e.id} value={e.id}>
                        [{e.code}] {e.name}
                      </option>
                    ))
                  )}
                </select>

                <button
                  type="button"
                  onClick={() => setShowQuickAdd((v) => !v)}
                  disabled={!selectedExamId}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-40 ${
                    showQuickAdd || (selectedExamId && gridRows.length === 0)
                      ? "bg-[#003B3A] text-white border-[#003B3A]"
                      : "bg-white hover:bg-[#F8FAFC] text-[#003B3A] border-[#E2E8F0]"
                  }`}
                  title="Mở thanh thêm nhanh học sinh vào bảng kết quả"
                >
                  <UserPlus
                    className={`w-3.5 h-3.5 ${
                      showQuickAdd || (selectedExamId && gridRows.length === 0)
                        ? "text-[#5EEAD4]"
                        : "text-[#008B85]"
                    }`}
                  />
                  <span>Thêm HS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsQuickExamOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-700 hover:text-[#003B3A] text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                  title="Tạo nhanh kỳ thi mới và chọn nhập kết quả ngay"
                >
                  <Plus className="w-3.5 h-3.5 text-[#008B85]" />
                  <span>Kỳ thi mới</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDirectAwardModal({ isOpen: true, student: null })}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#CCFBF1] bg-[#F0FDFA] hover:bg-[#CCFBF1]/60 text-[#003B3A] text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                  title="Ghi nhận giải thưởng ngoài danh sách kỳ thi hoặc giấy khen lẻ"
                >
                  <Trophy className="w-3.5 h-3.5 text-[#008B85]" />
                  <span>Ghi nhận lẻ</span>
                </button>
              </div>

              {/* Right: Inline Metrics + Primary Save CTA */}
              <div className="flex items-center justify-end gap-3 shrink-0 tabular-nums">
                {selectedExamId && (
                  <div className="flex items-center gap-2.5 text-xs whitespace-nowrap">
                    <span className="text-slate-500">
                      Dự thi: <strong className="text-slate-900">{totalUniqueStudents}</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">
                      Đạt giải: <strong className="text-[#059669]">{awardedRowsCount}</strong>
                    </span>
                    {changedStudentIds.size > 0 && (
                      <>
                        <span className="text-slate-300">|</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[#D97706] font-semibold">
                          Chưa lưu: {changedStudentIds.size}
                        </span>
                      </>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveGrid}
                  disabled={savingGrid || !hasChanges || !selectedExamId}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    hasChanges
                      ? "bg-[#003B3A] hover:bg-[#005250] text-white shadow-sm"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                  title="Phím tắt: Ctrl + S"
                >
                  {savingGrid ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  )}
                  <span>{savingGrid ? "Đang lưu..." : "Lưu kết quả"}</span>
                </button>
              </div>
            </div>

            {/* 2. Collapsible Quick-Add Student & Direct Award Bar (Auto-open only if exam has 0 rows) */}
            {selectedExamId && (showQuickAdd || (!loadingStudents && gridRows.length === 0)) && (
              <div className="pt-3 border-t border-[#E2E8F0] bg-[#F8FAFC] -mx-4 -mb-3 px-4 py-3 rounded-b-2xl space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-[#003B3A] flex items-center gap-1.5 mr-1">
                      <UserPlus className="w-3.5 h-3.5 text-[#008B85]" />
                      <span>Thêm HS & Gán giải nhanh:</span>
                    </span>

                    <div className="inline-flex bg-white rounded-lg p-0.5 border border-[#E2E8F0]">
                      <button
                        type="button"
                        onClick={() => setQuickMode("search")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                          quickMode === "search"
                            ? "bg-[#003B3A] text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Tìm Mã / Tên HS
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickMode("paste")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                          quickMode === "paste"
                            ? "bg-[#003B3A] text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Dán danh sách Mã HS
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickMode("class")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                          quickMode === "class"
                            ? "bg-[#003B3A] text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Theo Lớp học
                      </button>
                    </div>
                  </div>

                  {/* Pre-selected Award & Coach when Quick-Adding */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-500">Gán sẵn khi thêm:</span>
                    <select
                      value={quickPresetKey}
                      onChange={(e) => setQuickPresetKey(e.target.value)}
                      className="border border-[#E2E8F0] bg-white rounded-lg px-2.5 py-1 text-xs font-semibold text-[#003B3A] focus:border-[#00A19A] outline-none"
                    >
                      <option value="">-- Chỉ đưa vào DS (Chưa chọn giải) --</option>
                      {awardPresets.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.fullLabel} ({CATEGORY_LABELS[p.category] || p.category})
                        </option>
                      ))}
                    </select>

                    <select
                      value={quickType}
                      onChange={(e) => setQuickType(e.target.value as "CA_NHAN" | "DONG_DOI")}
                      className="border border-[#E2E8F0] bg-white rounded-lg px-2 py-1 text-xs font-medium text-slate-700 focus:border-[#00A19A] outline-none"
                    >
                      <option value="CA_NHAN">Cá nhân</option>
                      <option value="DONG_DOI">Đồng đội</option>
                    </select>

                    <select
                      value={quickTeacherId}
                      onChange={(e) => setQuickTeacherId(e.target.value)}
                      className="border border-[#E2E8F0] bg-white rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:border-[#00A19A] outline-none max-w-[175px]"
                    >
                      <option value="">-- GV bồi dưỡng --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.teacherName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick-Add Input Row */}
                {quickMode === "search" && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={quickInputRef}
                      type="text"
                      value={quickQuery}
                      onChange={(e) => handleQuickSearchChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && quickResults.length > 0) {
                          e.preventDefault()
                          insertStudentsIntoGrid([quickResults[0]])
                          setQuickQuery("")
                          setQuickResults([])
                          quickInputRef.current?.focus()
                        }
                      }}
                      placeholder="Gõ Mã học sinh hoặc Họ tên (Nhấn Enter để thêm ngay học sinh đầu tiên vào bảng kết quả)..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#E2E8F0] bg-white focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 outline-none text-xs font-medium text-slate-800"
                    />
                    {quickSearching && (
                      <Loader2 className="w-3.5 h-3.5 text-[#00A19A] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                    )}

                    {quickResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-xl max-h-60 overflow-y-auto z-30 divide-y divide-[#F1F5F9]">
                        {quickResults.map((stu, idx) => {
                          const alreadyInGrid = gridRows.some((r) => r.studentId === stu.id)
                          return (
                            <button
                              key={stu.id}
                              type="button"
                              onClick={() => {
                                insertStudentsIntoGrid([stu])
                                setQuickQuery("")
                                setQuickResults([])
                                quickInputRef.current?.focus()
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-[#F0FDFA] flex items-center justify-between text-xs cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold text-slate-900 truncate">
                                  {stu.studentName}
                                </span>
                                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                                  {stu.studentCode}
                                </span>
                                {idx === 0 && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] font-semibold">
                                    Enter ↵
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {alreadyInGrid && (
                                  <span className="text-[10px] font-semibold text-[#059669]">
                                    Đã trong bảng
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] font-semibold text-[#003B3A]">
                                  {stu.className}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {quickMode === "paste" && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <ClipboardPaste className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={quickPasteText}
                        onChange={(e) => setQuickPasteText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleQuickPasteSubmit()
                          }
                        }}
                        placeholder="Dán danh sách Mã HS từ Excel/Word (cách nhau bởi dấu phẩy, khoảng trắng hoặc xuống dòng)..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] bg-white focus:border-[#00A19A] outline-none text-xs font-medium text-slate-800"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={quickSearching || !quickPasteText.trim()}
                      onClick={handleQuickPasteSubmit}
                      className="px-4 py-2 rounded-xl bg-[#008B85] hover:bg-[#00736E] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {quickSearching ? "Đang đối chiếu..." : "Đưa vào bảng kết quả"}
                    </button>
                  </div>
                )}

                {quickMode === "class" && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <select
                      value={quickCampusId}
                      onChange={(e) => {
                        setQuickCampusId(e.target.value)
                        setQuickClassId("")
                      }}
                      className="border border-[#E2E8F0] bg-white rounded-xl px-3 py-2 outline-none focus:border-[#00A19A] font-medium text-slate-700"
                    >
                      <option value="">-- Tất cả cơ sở --</option>
                      {campuses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.campusName}
                        </option>
                      ))}
                    </select>

                    <select
                      value={quickClassId}
                      onChange={(e) => setQuickClassId(e.target.value)}
                      className="border border-[#E2E8F0] bg-white rounded-xl px-3 py-2 outline-none focus:border-[#00A19A] font-medium text-slate-700 min-w-[180px]"
                    >
                      <option value="">-- Chọn lớp cần nạp --</option>
                      {classes
                        .filter(
                          (c) =>
                            c.academicYearId === yearId &&
                            (!quickCampusId || c.campusId === quickCampusId)
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            Lớp {c.className}
                          </option>
                        ))}
                    </select>

                    <button
                      type="button"
                      disabled={!quickClassId || quickSearching}
                      onClick={handleQuickAddWholeClass}
                      className="px-4 py-2 rounded-xl bg-[#008B85] hover:bg-[#00736E] text-white font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      {quickSearching ? "Đang nạp..." : "Nạp danh sách lớp vào bảng"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Main Result Grid Card */}
          {selectedExamId && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              {/* Grid Filter & Excel Toolbar */}
              <div className="px-4 py-3 border-b border-[#F1F5F9] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
                  {[
                    { id: "all", label: "Tất cả", count: gridRows.length },
                    { id: "awarded", label: "Đã có giải", count: awardedRowsCount },
                    { id: "none", label: "Chưa có giải", count: unawardedCount },
                    ...(changedStudentIds.size > 0
                      ? [{ id: "dirty", label: "Chưa lưu", count: changedStudentIds.size }]
                      : []),
                  ].map((pill) => {
                    const active = gridStatusFilter === pill.id
                    return (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => {
                          setGridStatusFilter(pill.id as any)
                          setCurrentPage(1)
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          active
                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                            : "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:text-[#003B3A]"
                        }`}
                      >
                        <span>{pill.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-white text-slate-600 border border-[#E2E8F0]"
                          }`}
                        >
                          {pill.count}
                        </span>
                      </button>
                    )
                  })}

                  {gridClasses.length > 1 && (
                    <select
                      value={gridClassFilter}
                      onChange={(e) => {
                        setGridClassFilter(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="border border-[#E2E8F0] bg-[#F8FAFC] rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-[#00A19A]"
                    >
                      <option value="">Tất cả lớp ({gridClasses.length})</option>
                      {gridClasses.map((c) => (
                        <option key={c} value={c}>
                          Lớp {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Right: Search in Grid + Quick Chips Toggle + Excel Import/Template */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickChips((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      showQuickChips
                        ? "bg-[#F0FDFA] text-[#003B3A] border-[#CCFBF1]"
                        : "bg-white text-slate-500 border-[#E2E8F0] hover:text-[#003B3A]"
                    }`}
                    title="Bật/tắt cột nút chọn nhanh mức giải 1 chạm"
                  >
                    <Award className="w-3.5 h-3.5 text-[#008B85]" />
                    <span>Chọn nhanh 1 chạm</span>
                  </button>

                  <div className="relative w-full sm:w-52">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={gridSearch}
                      onChange={(e) => {
                        setGridSearch(e.target.value)
                        setCurrentPage(1)
                      }}
                      placeholder="Lọc nhanh tên / mã HS..."
                      className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] text-xs outline-none"
                    />
                    {gridSearch && (
                      <button
                        type="button"
                        onClick={() => setGridSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadSampleExcel}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-600 text-xs font-semibold cursor-pointer"
                    title="Tải file Excel mẫu (kèm danh sách hiện tại)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>File mẫu</span>
                  </button>

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/70 text-[#059669] text-xs font-semibold cursor-pointer">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Nhập Excel</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleImportExcel}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        hasChanges &&
                        !confirm("Tải lại sẽ hủy các thay đổi chưa lưu. Bạn có chắc chắn?")
                      )
                        return
                      loadExamStudents(selectedExamId)
                    }}
                    className="p-1.5 rounded-lg border border-[#E2E8F0] text-slate-500 hover:text-[#003B3A] hover:bg-[#F8FAFC] cursor-pointer"
                    title="Làm mới danh sách"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Inline Batch Action Bar when rows are checked */}
              {checkedRowIds.size > 0 && (
                <div className="px-4 py-2.5 bg-[#F0FDFA] border-b border-[#CCFBF1] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#003B3A] tabular-nums">
                      Đã chọn {checkedRowIds.size} dòng
                    </span>
                    <button
                      type="button"
                      onClick={() => setCheckedRowIds(new Set())}
                      className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={bulkType}
                      onChange={(e) => setBulkType(e.target.value)}
                      className="border border-[#CCFBF1] bg-white rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none"
                    >
                      <option value="CA_NHAN">Cá nhân</option>
                      <option value="DONG_DOI">Đồng đội</option>
                    </select>

                    <select
                      value={bulkCategory}
                      onChange={(e) => {
                        setBulkCategory(e.target.value)
                        setBulkLevel("")
                      }}
                      className="border border-[#CCFBF1] bg-white rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none"
                    >
                      <option value="">-- Xóa giải / Không giải --</option>
                      {achievementCategories.map((c) => (
                        <option key={c.id || c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={bulkLevel}
                      onChange={(e) => setBulkLevel(e.target.value)}
                      disabled={!bulkCategory}
                      className="border border-[#CCFBF1] bg-white rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none disabled:opacity-50"
                    >
                      <option value="">-- Mức giải --</option>
                      {(() => {
                        const catObj = achievementCategories.find((c) => c.code === bulkCategory)
                        const list = catObj
                          ? achievementLevels.filter((l) => l.categoryId === catObj.id)
                          : []
                        return list.map((l) => (
                          <option key={l.id || l.code} value={l.code}>
                            {l.name}
                          </option>
                        ))
                      })()}
                    </select>

                    <select
                      value={bulkTeacherId}
                      onChange={(e) => setBulkTeacherId(e.target.value)}
                      className="border border-[#CCFBF1] bg-white rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none max-w-[165px]"
                    >
                      <option value="">-- Giữ nguyên GV --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.teacherName}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleBulkApply}
                      className="px-3.5 py-1 rounded-lg bg-[#003B3A] hover:bg-[#005250] text-white font-semibold cursor-pointer"
                    >
                      Áp dụng cho {checkedRowIds.size} dòng
                    </button>
                  </div>
                </div>
              )}

              {/* Sky-Line Academic Ledger Table */}
              {loadingStudents ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00A19A]" />
                  <span>Đang tải bảng nhập kết quả...</span>
                </div>
              ) : gridRows.length === 0 ? (
                <div className="py-14 px-4 text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#00736E] flex items-center justify-center mx-auto">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    Kỳ thi chưa có danh sách học sinh
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Gõ trực tiếp <strong>Mã HS / Họ tên</strong> ở thanh &ldquo;Thêm HS & Gán giải
                    nhanh&rdquo; bên trên, dán danh sách Mã HS, hoặc dùng nút{" "}
                    <strong>Nhập Excel</strong> — hệ thống tự động đăng ký dự thi và ghi nhận giải
                    trong 1 bước.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1100px] tabular-nums">
                    <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                      <tr className="text-[11px] font-semibold whitespace-nowrap">
                        <th className="py-3 px-2.5 w-9 text-center font-semibold">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded text-[#00A19A] cursor-pointer"
                            checked={
                              pagedGridRows.length > 0 &&
                              pagedGridRows.every((r) => checkedRowIds.has(r.gridRowId))
                            }
                            onChange={(e) => {
                              setCheckedRowIds((prev) => {
                                const next = new Set(prev)
                                pagedGridRows.forEach((r) => {
                                  if (e.target.checked) next.add(r.gridRowId)
                                  else next.delete(r.gridRowId)
                                })
                                return next
                              })
                            }}
                          />
                        </th>
                        <th className="py-3 px-2 w-10 text-center text-teal-100 font-semibold">
                          STT
                        </th>
                        <th className="py-3 px-3 min-w-[180px] font-semibold">Học sinh</th>
                        <th className="py-3 px-2.5 w-24 text-center text-teal-100 font-semibold">
                          Lớp
                        </th>
                        {showQuickChips && (
                          <th className="py-3 px-3 min-w-[215px] max-w-[245px] text-[#5EEAD4] font-semibold">
                            Chọn nhanh mức giải
                          </th>
                        )}
                        <th className="py-3 px-2.5 w-[118px] min-w-[118px] text-teal-100 font-semibold">
                          Hình thức
                        </th>
                        <th className="py-3 px-2.5 w-[180px] min-w-[180px] text-teal-100 font-semibold">
                          Loại &amp; Mức giải
                        </th>
                        <th className="py-3 px-3 min-w-[180px] text-teal-100 font-semibold">
                          Tên danh hiệu / Ghi chú
                        </th>
                        <th className="py-3 px-3 w-[205px] min-w-[205px] text-teal-100 font-semibold">
                          GV bồi dưỡng
                        </th>
                        <th className="py-3 px-2.5 w-20 text-right font-semibold">Thao tác</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                      {pagedGridRows.map((row, idx) => {
                        const isChecked = checkedRowIds.has(row.gridRowId)
                        const isDirty = changedStudentIds.has(row.studentId)
                        const hasAward = Boolean(row.category)

                        const catObj = achievementCategories.find((c) => c.code === row.category)
                        const rowLevels = catObj
                          ? achievementLevels.filter((l) => l.categoryId === catObj.id)
                          : []

                        return (
                          <tr
                            key={row.gridRowId}
                            className={`transition-colors align-middle ${
                              isChecked
                                ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                                : hasAward
                                ? "bg-[#F0FDFA]/25 hover:bg-[#F8FAFC]"
                                : "hover:bg-[#F8FAFC]"
                            }`}
                          >
                            {/* Checkbox + Dirty Dot */}
                            <td className="py-2.5 px-2.5 text-center relative">
                              {isDirty && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-[#D97706] absolute left-1 top-1/2 -translate-y-1/2"
                                  title="Dòng có thay đổi chưa lưu"
                                />
                              )}
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  setCheckedRowIds((prev) => {
                                    const next = new Set(prev)
                                    if (e.target.checked) next.add(row.gridRowId)
                                    else next.delete(row.gridRowId)
                                    return next
                                  })
                                }}
                                className="w-3.5 h-3.5 rounded text-[#00A19A] cursor-pointer"
                              />
                            </td>

                            {/* STT */}
                            <td className="py-2.5 px-2 text-center font-mono text-slate-400">
                              {(currentPage - 1) * rowsPerPage + idx + 1}
                            </td>

                            {/* Học sinh */}
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900 leading-snug">
                                {row.studentName}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500">
                                {row.studentCode}
                              </div>
                            </td>

                            {/* Lớp */}
                            <td className="py-2.5 px-2.5 text-center">
                              <span className="font-semibold text-[#003B3A]">{row.className}</span>
                            </td>

                            {/* 1-Click Preset Chips */}
                            {showQuickChips && (
                              <td className="py-2.5 px-3 max-w-[245px]">
                                <div className="flex flex-wrap items-center gap-1">
                                  {awardPresets.map((p) => {
                                    const active =
                                      row.category === p.category && row.level === p.level
                                    let activeCls =
                                      "bg-[#003B3A] text-white border-[#003B3A] shadow-2xs"
                                    if (active && p.tone === "gold")
                                      activeCls = "bg-[#D97706] text-white border-[#D97706]"
                                    else if (active && p.tone === "teal")
                                      activeCls = "bg-[#059669] text-white border-[#059669]"

                                    return (
                                      <button
                                        key={p.key}
                                        type="button"
                                        onClick={() => applyPresetToRow(row.gridRowId, p)}
                                        title={`Gán nhanh: ${p.fullLabel} (${
                                          CATEGORY_LABELS[p.category] || p.category
                                        })`}
                                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer leading-tight ${
                                          active
                                            ? activeCls
                                            : "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:border-[#008B85] hover:text-[#003B3A]"
                                        }`}
                                      >
                                        {p.shortLabel}
                                      </button>
                                    )
                                  })}
                                </div>
                              </td>
                            )}

                            {/* Hình thức */}
                            <td className="py-2.5 px-2.5">
                              <select
                                value={row.type}
                                onChange={(e) =>
                                  handleCellChange(row.gridRowId, "type", e.target.value)
                                }
                                className={`w-full border rounded-lg px-2 py-1.5 text-xs outline-none cursor-pointer ${
                                  row.type === "DONG_DOI"
                                    ? "bg-[#F0FDFA] border-[#00A19A]/40 text-[#003B3A] font-semibold"
                                    : "bg-[#F8FAFC] border-[#E2E8F0] text-slate-700"
                                }`}
                              >
                                <option value="CA_NHAN">Cá nhân</option>
                                <option value="DONG_DOI">Đồng đội</option>
                              </select>
                            </td>

                            {/* Loại & Mức giải (Compact Stacked / Paired) */}
                            <td className="py-2.5 px-2.5 space-y-1">
                              <select
                                value={row.category}
                                onChange={(e) =>
                                  handleCellChange(row.gridRowId, "category", e.target.value)
                                }
                                className={`w-full border rounded-lg px-2 py-1 text-[11px] outline-none cursor-pointer ${
                                  row.category
                                    ? "bg-white border-[#008B85]/50 text-[#003B3A] font-semibold"
                                    : "bg-[#F8FAFC] border-[#E2E8F0] text-slate-500"
                                }`}
                              >
                                <option value="">-- Không giải --</option>
                                {achievementCategories.map((c) => (
                                  <option key={c.id || c.code} value={c.code}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>

                              {row.category && rowLevels.length > 0 && (
                                <select
                                  value={row.level}
                                  onChange={(e) =>
                                    handleCellChange(row.gridRowId, "level", e.target.value)
                                  }
                                  className="w-full border border-amber-200 bg-amber-50/60 rounded-lg px-2 py-1 text-[11px] font-semibold text-amber-900 outline-none cursor-pointer"
                                >
                                  <option value="">-- Chọn mức giải --</option>
                                  {rowLevels.map((l) => (
                                    <option key={l.id || l.code} value={l.code}>
                                      {l.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>

                            {/* Tên giải thưởng */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) =>
                                  handleCellChange(row.gridRowId, "name", e.target.value)
                                }
                                disabled={!row.category}
                                placeholder={
                                  row.category
                                    ? "Tự động theo mức giải..."
                                    : "Chọn mức giải trước"
                                }
                                className="w-full border border-[#E2E8F0] disabled:bg-[#F8FAFC] disabled:text-slate-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:border-[#00A19A] outline-none"
                              />
                            </td>

                            {/* GV bồi dưỡng + Quick Copy */}
                            <td className="py-2.5 px-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <select
                                    value={row.teacherId}
                                    onChange={(e) => {
                                      handleCellChange(row.gridRowId, "teacherId", e.target.value)
                                      if (e.target.value !== "KHAC") {
                                        handleCellChange(row.gridRowId, "teacherName", "")
                                      }
                                    }}
                                    disabled={!row.category}
                                    className="flex-1 min-w-0 border border-[#E2E8F0] disabled:bg-[#F8FAFC] rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-[#00A19A]"
                                  >
                                    <option value="">-- Chọn GV --</option>
                                    {teachers.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.teacherName}
                                      </option>
                                    ))}
                                    <option value="KHAC">Khác (Nhập tay)...</option>
                                  </select>

                                  {(row.teacherId || row.teacherName) && row.category && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyTeacherToAwarded(row)}
                                      className="p-1.5 rounded-lg text-[#008B85] hover:bg-[#F0FDFA] border border-transparent hover:border-[#CCFBF1] cursor-pointer shrink-0"
                                      title="Điền nhanh GV này cho các học sinh đạt giải khác chưa có GV"
                                    >
                                      <CopyCheck className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {(row.teacherId === "KHAC" ||
                                  (!row.teacherId && row.teacherName)) && (
                                  <input
                                    type="text"
                                    value={row.teacherName}
                                    onChange={(e) =>
                                      handleCellChange(row.gridRowId, "teacherName", e.target.value)
                                    }
                                    disabled={!row.category}
                                    placeholder="Nhập tên GV bồi dưỡng..."
                                    className="w-full border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs outline-none focus:border-[#00A19A]"
                                  />
                                )}
                              </div>
                            </td>

                            {/* Thao tác */}
                            <td className="py-2.5 px-2.5 text-right">
                              <div className="inline-flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddAwardRowForStudent(
                                      row.studentId,
                                      gridRows.findIndex((g) => g.gridRowId === row.gridRowId)
                                    )
                                  }
                                  className="p-1.5 rounded-lg text-[#059669] hover:bg-emerald-50 cursor-pointer"
                                  title="Thêm giải thưởng thứ 2 cho học sinh này trong cùng kỳ thi"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleClearOrRemoveRow(row)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 cursor-pointer"
                                  title={
                                    hasAward
                                      ? "Xóa giải thưởng dòng này"
                                      : "Gỡ học sinh khỏi danh sách dự thi"
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Compact Pagination & Page Size Footer */}
              {uniqueFilteredStudentIds.length > 0 && (
                <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums">
                  <div className="flex items-center gap-3 text-slate-600">
                    <span>
                      Hiển thị{" "}
                      <strong>{(currentPage - 1) * rowsPerPage + 1}</strong>–
                      <strong>
                        {Math.min(currentPage * rowsPerPage, uniqueFilteredStudentIds.length)}
                      </strong>{" "}
                      / <strong>{uniqueFilteredStudentIds.length}</strong> học sinh
                    </span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="border border-[#E2E8F0] bg-white rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none"
                    >
                      <option value={25}>25 HS / trang</option>
                      <option value={50}>50 HS / trang</option>
                      <option value={100}>100 HS / trang</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      Trước
                    </button>
                    <span className="px-2.5 py-1 font-semibold text-[#003B3A]">
                      Trang {currentPage}/{totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
       * SUB-TAB 2: BÁO CÁO THÀNH TÍCH
       * =================================================================== */}
      {subTab === "reports" && (
        <ReportsSubTab
          yearId={yearId}
          academicYears={academicYears}
          exams={examsList}
          campuses={campuses}
          classes={classes}
          achievementCategories={achievementCategories}
          achievementLevels={achievementLevels}
          categoryLabels={CATEGORY_LABELS}
          levelLabels={LEVEL_LABELS}
          onOpenDirectAward={(stu) => setDirectAwardModal({ isOpen: true, student: stu || null })}
          onNotify={notify}
        />
      )}

      {/* =====================================================================
       * SUB-TAB 3: HỒ SƠ THÀNH TÍCH HỌC SINH
       * =================================================================== */}
      {subTab === "profiles" && (
        <ProfilesSubTab
          yearId={yearId}
          campuses={campuses}
          classes={classes}
          categoryLabels={CATEGORY_LABELS}
          levelLabels={LEVEL_LABELS}
          onOpenDirectAward={(stu) => setDirectAwardModal({ isOpen: true, student: stu || null })}
          onNotify={notify}
        />
      )}

      {/* =====================================================================
       * SUB-TAB 4: XÉT DUYỆT BỔ SUNG THÀNH TÍCH (GVCN)
       * =================================================================== */}
      {subTab === "requests" && (
        <RequestsSubTab
          yearId={yearId}
          exams={examsList}
          campuses={campuses}
          classes={classes}
          achievementCategories={achievementCategories}
          achievementLevels={achievementLevels}
          teachers={teachers}
          categoryLabels={CATEGORY_LABELS}
          levelLabels={LEVEL_LABELS}
          onNotify={notify}
          onAfterReview={(info) => {
            router.refresh()
            if (selectedExamId && (!info?.examId || info.examId === selectedExamId)) {
              loadExamStudents(selectedExamId)
            }
          }}
          onOpenExamGrid={(examId) => {
            const targetEx = examsList.find((e) => e.id === examId)
            if (targetEx?.academicYearId && targetEx.academicYearId !== yearId) {
              setYearId(targetEx.academicYearId)
              try {
                localStorage.setItem("selectedAcademicYear", targetEx.academicYearId)
                document.cookie = `selectedAcademicYear=${targetEx.academicYearId}; path=/; max-age=31536000; SameSite=Lax`
                window.dispatchEvent(new Event("academicYearChanged"))
              } catch {}
            }
            setSelectedExamId(examId)
            setSubTab("input")
            loadExamStudents(examId)
            if (typeof window !== "undefined") {
              window.history.replaceState({}, document.title, "/admin/ktdbcl/results")
            }
          }}
        />
      )}

      {/* Quick Create Exam Modal */}
      <QuickCreateExamModal
        isOpen={isQuickExamOpen}
        onClose={() => setIsQuickExamOpen(false)}
        yearId={yearId}
        academicYears={academicYears}
        examCategories={examCategories}
        examRounds={examRounds}
        onCreated={(newExam) => {
          setExamsList((prev) => [newExam, ...prev])
          if (newExam.academicYearId && newExam.academicYearId !== yearId) {
            setYearId(newExam.academicYearId)
            try {
              localStorage.setItem("selectedAcademicYear", newExam.academicYearId)
              document.cookie = `selectedAcademicYear=${newExam.academicYearId}; path=/; max-age=31536000; SameSite=Lax`
              window.dispatchEvent(new Event("academicYearChanged"))
            } catch {}
          }
          setSelectedExamId(newExam.id)
          notify(`Đã tạo kỳ thi "${newExam.name}" — sẵn sàng nhập kết quả.`)
        }}
      />

      {/* Direct / Standalone Award Modal */}
      {directAwardModal.isOpen && (
        <DirectAwardModal
          isOpen={directAwardModal.isOpen}
          onClose={() => setDirectAwardModal({ isOpen: false, student: null })}
          yearId={yearId}
          exams={examsList}
          defaultExamId={subTab === "input" ? selectedExamId : ""}
          preselectedStudent={directAwardModal.student}
          achievementCategories={achievementCategories}
          achievementLevels={achievementLevels}
          teachers={teachers}
          onSuccess={(msg) => {
            notify(msg)
            if (subTab === "input" && selectedExamId) {
              loadExamStudents(selectedExamId)
            }
          }}
        />
      )}

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
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th,
          td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 8px !important;
            color: #0f172a !important;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>
    </div>
  )
}
