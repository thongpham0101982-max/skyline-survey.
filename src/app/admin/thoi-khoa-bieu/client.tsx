"use client"

import React, { useState, useTransition, useMemo, Fragment } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  Calendar, 
  Grid, 
  Layers, 
  Plus, 
  Download, Save, CheckCircle, 
  Trash2, 
  Sparkles, 
  AlertCircle, 
  BookOpen, 
  UserCheck, 
  Building2, 
  Info, 
  Edit3, 
  Check, 
  X,
  Search,
  Filter
} from "lucide-react"
import { saveTimetableSlot, clearTimetableSlot, batchSaveAllTimetableSlots } from "./actions"
import * as XLSX from "xlsx"

const DAYS = [
  { key: "MONDAY", label: "Thứ 2" },
  { key: "TUESDAY", label: "Thứ 3" },
  { key: "WEDNESDAY", label: "Thứ 4" },
  { key: "THURSDAY", label: "Thứ 5" },
  { key: "FRIDAY", label: "Thứ 6" }
]

const PERIODS = [
  { session: "MORNING", period: 1, label: "Sáng - Tiết 1" },
  { session: "MORNING", period: 2, label: "Sáng - Tiết 2" },
  { session: "MORNING", period: 3, label: "Sáng - Tiết 3" },
  { session: "MORNING", period: 4, label: "Sáng - Tiết 4" },
  { session: "AFTERNOON", period: 1, label: "Chiều - Tiết 1" },
  { session: "AFTERNOON", period: 2, label: "Chiều - Tiết 2" },
  { session: "AFTERNOON", period: 3, label: "Chiều - Tiết 3" },
  { session: "AFTERNOON", period: 4, label: "Chiều - Tiết 4" }
]

const SUBJECT_COLORS: Record<string, string> = {
  "Toán": "#FEF08A", // Yellow
  "Toán học": "#FEF08A",
  "TV": "#E0E7FF", // Blue/Indigo
  "Tiếng Việt": "#E0E7FF",
  "Ngoại ngữ": "#FBCFE8", // Pink
  "ESL": "#FBCFE8",
  "Tiếng Anh": "#FBCFE8",
  "STEM": "#D1FAE5", // Emerald
  "Khoa học": "#D1FAE5",
  "Mỹ thuật": "#FDE68A", // Amber
  "Âm nhạc": "#FED7AA", // Orange
  "GDTC": "#CFFAFE", // Cyan
  "Lịch sử": "#E9D5FF", // Purple
  "Địa lý": "#E9D5FF"
}

export default function TimetableClient({ initialData }: { initialData: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const {
    campuses = [],
    selectedCampusId = "",
    classes = [],
    subjects = [],
    teachers = [],
    timetableSlots: serverSlots = [],
    academicYear
  } = initialData || {}

  const [activeLevel, setActiveLevel] = useState<string>(searchParams.get("level") || "TIEU_HOC")
  const [currentCampusId, setCurrentCampusId] = useState<string>(selectedCampusId)
  const [slots, setSlots] = useState<any[]>(serverSlots)
  const [activeTab, setActiveTab] = useState<"SUBJECTS" | "TEACHERS">("SUBJECTS")
  const [searchSubject, setSearchSubject] = useState("")
  const [searchTeacher, setSearchTeacher] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Main View Mode: MATRIX vs TEACHER_LOOKUP
  const [mainViewMode, setMainViewMode] = useState<"MATRIX" | "CLASS_LOOKUP" | "TEACHER_LOOKUP">("MATRIX")
  const [lookupCampusId, setLookupCampusId] = useState<string>("")
  const [lookupClassId, setLookupClassId] = useState<string>("")
  const [lookupDept, setLookupDept] = useState<string>("ALL")
  const [lookupTeacherId, setLookupTeacherId] = useState<string>("")
  const [lookupSearchQuery, setLookupSearchQuery] = useState<string>("")

  const handleSaveAll = async () => {
    setIsSaving(true)
    try {
      const res = await batchSaveAllTimetableSlots(currentCampusId, activeLevel, slots)
      if (res.success) {
        showToast("Đã lưu toàn bộ Thời khóa biểu thành công!", "success")
      } else {
        showToast(res.error || "Có lỗi xảy ra khi lưu!", "error")
      }
    } catch (e: any) {
      showToast(e.message || "Không thể kết nối đến máy chủ!", "error")
    } finally {
      setIsSaving(false)
    }
  }
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" | "warning" } | null>(null)

  // Edit Modal State
  const [editingCell, setEditingCell] = useState<{
    classId: string
    className: string
    dayOfWeek: string
    session: string
    periodNumber: number
    slot?: any
  } | null>(null)

  const [editSubjectName, setEditSubjectName] = useState("")
  const [editTeacherName, setEditTeacherName] = useState("")
  const [editWeekType, setEditWeekType] = useState("ALL")
  const [editAltSubjectName, setEditAltSubjectName] = useState("")
  const [editAltTeacherName, setEditAltTeacherName] = useState("")
  const [editColorCode, setEditColorCode] = useState("#FEF08A")

  const showToast = (msg: string, type: "success" | "error" | "info" | "warning") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Handle Switch Level / Campus
  const handleSwitchLevel = (lvl: string) => {
    setActiveLevel(lvl)
    startTransition(() => {
      router.push(`/admin/thoi-khoa-bieu?campusId=${currentCampusId}&level=${lvl}`)
    })
  }

  const handleSwitchCampus = (cId: string) => {
    setCurrentCampusId(cId)
    startTransition(() => {
      router.push(`/admin/thoi-khoa-bieu?campusId=${cId}&level=${activeLevel}`)
    })
  }

  // Deduplicate classes strictly by unique className
  const displayClasses = useMemo(() => {
    if (!Array.isArray(classes)) return []
    const seenNames = new Set<string>()
    return classes.filter((c: any) => {
      const nameKey = (c?.className || "").trim().toLowerCase()
      if (!nameKey || seenNames.has(nameKey)) return false
      seenNames.add(nameKey)
      return true
    })
  }, [classes])

  // Group classes by Grade
  const groupedClasses = useMemo(() => {
    const map: Record<string, any[]> = {}
    displayClasses.forEach((c: any) => {
      const g = c.grade || "Khác"
      if (!map[g]) map[g] = []
      map[g].push(c)
    })
    return map
  }, [displayClasses])

  // Get Slot for a specific cell
  const getSlot = (classId: string, dayOfWeek: string, session: string, periodNumber: number) => {
    return slots.find(
      s => s.classId === classId && s.dayOfWeek === dayOfWeek && s.session === session && s.periodNumber === periodNumber
    )
  }

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, type: "SUBJECT" | "TEACHER", item: any) => {
    e.dataTransfer.setData("type", type)
    e.dataTransfer.setData("data", JSON.stringify(item))
  }

  const handleDropCell = (
    e: React.DragEvent,
    targetClass: any,
    dayOfWeek: string,
    session: string,
    periodNumber: number
  ) => {
    e.preventDefault()
    const type = e.dataTransfer.getData("type")
    const itemDataStr = e.dataTransfer.getData("data")
    if (!itemDataStr) return

    const item = JSON.parse(itemDataStr)
    const existingSlot = getSlot(targetClass.id, dayOfWeek, session, periodNumber)

    let updatedSubjectName = existingSlot?.subjectName || ""
    let updatedTeacherName = existingSlot?.teacherName || ""
    let color = existingSlot?.colorCode || "#FEF08A"

    if (type === "SUBJECT") {
      updatedSubjectName = item.subjectName
      color = SUBJECT_COLORS[item.subjectName] || "#FEF08A"
    } else if (type === "TEACHER") {
      updatedTeacherName = item.teacherName
    }

    // Call server action to save
    startTransition(async () => {
      const res = await saveTimetableSlot({
        campusId: currentCampusId,
        level: activeLevel,
        classId: targetClass.id,
        className: targetClass.className,
        dayOfWeek,
        session,
        periodNumber,
        subjectName: updatedSubjectName,
        teacherName: updatedTeacherName,
        colorCode: color
      })

      if (res.success && res.savedSlot) {
        setSlots(prev => {
          const idx = prev.findIndex(s => s.id === res.savedSlot.id)
          if (idx >= 0) {
            const copy = [...prev]
            copy[idx] = res.savedSlot
            return copy
          }
          return [...prev, res.savedSlot]
        })

        if (res.conflictNotice) {
          showToast(res.conflictNotice, "warning")
        } else {
          showToast(`Đã gắn ${type === "SUBJECT" ? item.subjectName : item.teacherName} vào ${targetClass.className}!`, "success")
        }
      } else {
        showToast(res.error || "Không thể lưu tiết học!", "error")
      }
    })
  }

  // Edit Modal Open
  const handleOpenEditCell = (targetClass: any, dayOfWeek: string, session: string, periodNumber: number) => {
    const slot = getSlot(targetClass.id, dayOfWeek, session, periodNumber)
    setEditingCell({
      classId: targetClass.id,
      className: targetClass.className,
      dayOfWeek,
      session,
      periodNumber,
      slot
    })

    setEditSubjectName(slot?.subjectName || "")
    setEditTeacherName(slot?.teacherName || "")
    setEditWeekType(slot?.weekType || "ALL")
    setEditAltSubjectName(slot?.altSubjectName || "")
    setEditAltTeacherName(slot?.altTeacherName || "")
    setEditColorCode(slot?.colorCode || SUBJECT_COLORS[slot?.subjectName || ""] || "#FEF08A")
  }

  // Save Edit Cell
  const handleSaveEditModal = async () => {
    if (!editingCell) return

    startTransition(async () => {
      const res = await saveTimetableSlot({
        campusId: currentCampusId,
        level: activeLevel,
        classId: editingCell.classId,
        className: editingCell.className,
        dayOfWeek: editingCell.dayOfWeek,
        session: editingCell.session,
        periodNumber: editingCell.periodNumber,
        subjectName: editSubjectName,
        teacherName: editTeacherName,
        weekType: editWeekType,
        altSubjectName: editAltSubjectName,
        altTeacherName: editAltTeacherName,
        colorCode: editColorCode
      })

      if (res.success && res.savedSlot) {
        setSlots(prev => {
          const idx = prev.findIndex(s => s.id === res.savedSlot.id)
          if (idx >= 0) {
            const copy = [...prev]
            copy[idx] = res.savedSlot
            return copy
          }
          return [...prev, res.savedSlot]
        })

        if (res.conflictNotice) {
          showToast(res.conflictNotice, "warning")
        } else {
          showToast("Đã cập nhật tiết học thành công!", "success")
        }
        setEditingCell(null)
      } else {
        showToast(res.error || "Không thể lưu!", "error")
      }
    })
  }

  // Delete Slot
  const handleClearCell = async () => {
    if (!editingCell || !editingCell.slot) return
    startTransition(async () => {
      const res = await clearTimetableSlot(editingCell.slot.id)
      if (res.success) {
        setSlots(prev => prev.filter(s => s.id !== editingCell.slot.id))
        showToast("Đã xóa tiết học!", "info")
        setEditingCell(null)
      }
    })
  }

  // Export to Excel
  const handleExportExcel = () => {
    const campusName = campuses.find((c: any) => c.id === currentCampusId)?.campusName || "Truong"
    const wb = XLSX.utils.book_new()

    // Build worksheet data matching template
    const wsData: any[][] = []

    // Header Row 1: Title
    wsData.push([`THỜI KHÓA BIỂU ${activeLevel === "TIEU_HOC" ? "TIỂU HỌC" : activeLevel === "TRUNG_HOC" ? "TRUNG HỌC" : "LIÊN CẤP"} - ${campusName.toUpperCase()}`])
    wsData.push([])

    // Header Row 3: Class Names
    const headerRowClassNames = ["Thứ", "Buổi", "Tiết"]
    const headerRowSubHeaders = ["", "", ""]

    classes.forEach((cls: any) => {
      headerRowClassNames.push(`Lớp ${cls.className}`, "")
      headerRowSubHeaders.push("MÔN", "GVGD")
    })

    wsData.push(headerRowClassNames)
    wsData.push(headerRowSubHeaders)

    // Populate rows
    DAYS.forEach(d => {
      PERIODS.forEach(p => {
        const row: any[] = [d.label, p.session === "MORNING" ? "Sáng" : "Chiều", p.period]

        classes.forEach((cls: any) => {
          const slot = getSlot(cls.id, d.key, p.session, p.period)
          if (slot) {
            let subjStr = slot.subjectName || ""
            let teacherStr = slot.teacherName || ""

            if (slot.weekType === "EVEN") {
              subjStr += " (chẵn)"
            } else if (slot.weekType === "ODD") {
              subjStr += " (lẻ)"
            } else if (slot.weekType === "SPLIT") {
              subjStr = `${slot.subjectName} (chẵn) / ${slot.altSubjectName || ""} (lẻ)`
              teacherStr = `${slot.teacherName || ""} / ${slot.altTeacherName || ""}`
            }

            row.push(subjStr, teacherStr)
          } else {
            row.push("", "")
          }
        })

        wsData.push(row)
      })
    })

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, "ThoiKhoaBieu")
    XLSX.writeFile(wb, `ThoiKhoaBieu_${campusName}_${activeLevel}.xlsx`)
    showToast("Đã xuất file Excel Thời khóa biểu thành công!", "success")
  }

  // Filtered lists for sidebar
  const filteredSubjects = useMemo(() => {
    if (!Array.isArray(subjects)) return [];
    return subjects.filter((s: any) => 
      (s?.subjectName || "").toLowerCase().includes((searchSubject || "").toLowerCase())
    )
  }, [subjects, searchSubject])


  
  // Filtered classes by Campus in Admin lookup
  const campusFilteredClasses = useMemo(() => {
    if (!Array.isArray(classes)) return []
    if (!lookupCampusId) return classes
    return classes.filter((c: any) => c.campusId === lookupCampusId || !c.campusId)
  }, [classes, lookupCampusId])

  // Active selected class object in Admin lookup
  const selectedClassObj = useMemo(() => {
    if (lookupClassId) {
      return classes.find((c: any) => c.id === lookupClassId || c.className === lookupClassId) || null
    }
    if (campusFilteredClasses.length > 0) {
      return campusFilteredClasses[0]
    }
    return null
  }, [classes, lookupClassId, campusFilteredClasses])

  // Class Weekly Schedule Matrix & Stats in Admin lookup
  const { classWeeklyMatrix, classScheduleStats } = useMemo(() => {
    const matrix: Record<string, any> = {}
    const slotsList: any[] = []
    if (!selectedClassObj) return { classWeeklyMatrix: matrix, classScheduleStats: { totalPeriods: 0, slotsList } }

    const targetClassId = selectedClassObj.id
    const targetClassName = (selectedClassObj.className || "").trim().toLowerCase()

    slots.forEach((s: any) => {
      const idMatch = s.classId && s.classId === targetClassId
      const nameMatch = s.className && s.className.trim().toLowerCase() === targetClassName

      if (idMatch || nameMatch) {
        const key = `${s.dayOfWeek}_${s.session}_${s.periodNumber}`
        matrix[key] = s
        
        const dayObj = DAYS.find(d => d.key === s.dayOfWeek)
        slotsList.push({
          ...s,
          dayLabel: dayObj?.label || s.dayOfWeek,
          sessionLabel: s.session === "MORNING" ? "Sáng" : "Chiều"
        })
      }
    })

    return {
      classWeeklyMatrix: matrix,
      classScheduleStats: {
        totalPeriods: slotsList.length,
        slotsList
      }
    }
  }, [selectedClassObj, slots])


  // Unique Departments for filter dropdown
  const uniqueDepartments = useMemo(() => {
    if (!Array.isArray(teachers)) return []
    const set = new Set<string>()
    teachers.forEach((t: any) => {
      const deptName = t.departmentRel?.name || t.departmentName
      if (deptName && typeof deptName === 'string') {
        set.add(deptName.trim())
      }
    })
    return Array.from(set).sort()
  }, [teachers])

  // Filtered teachers by Department & Search query
  const deptFilteredTeachers = useMemo(() => {
    if (!Array.isArray(teachers)) return []
    return teachers.filter((t: any) => {
      const deptName = t.departmentRel?.name || t.departmentName || ""
      const matchesDept = lookupDept === "ALL" || deptName.trim().toLowerCase() === lookupDept.trim().toLowerCase()
      const matchesQuery = !lookupSearchQuery.trim() || 
        (t.teacherName || "").toLowerCase().includes(lookupSearchQuery.toLowerCase()) ||
        (t.teacherCode || "").toLowerCase().includes(lookupSearchQuery.toLowerCase())
      return matchesDept && matchesQuery
    })
  }, [teachers, lookupDept, lookupSearchQuery])

  // Active selected teacher object
  const selectedTeacherObj = useMemo(() => {
    if (lookupTeacherId) {
      return teachers.find((t: any) => t.id === lookupTeacherId) || null
    }
    if (lookupSearchQuery.trim() && deptFilteredTeachers.length > 0) {
      return deptFilteredTeachers[0]
    }
    return null
  }, [teachers, lookupTeacherId, lookupSearchQuery, deptFilteredTeachers])

  // Teacher Weekly Schedule Matrix & Stats
  const { teacherWeeklyMatrix, teacherScheduleStats } = useMemo(() => {
    const matrix: Record<string, any> = {}
    const slotsList: any[] = []
    if (!selectedTeacherObj) return { teacherWeeklyMatrix: matrix, teacherScheduleStats: { totalPeriods: 0, slotsList } }

    const targetName = (selectedTeacherObj.teacherName || "").trim().toLowerCase()

    slots.forEach((s: any) => {
      const mainMatch = (s.teacherName || "").trim().toLowerCase() === targetName
      const altMatch = (s.altTeacherName || "").trim().toLowerCase() === targetName

      if (mainMatch || altMatch) {
        const key = `${s.dayOfWeek}_${s.session}_${s.periodNumber}`
        matrix[key] = s
        
        const dayObj = DAYS.find(d => d.key === s.dayOfWeek)
        slotsList.push({
          ...s,
          dayLabel: dayObj?.label || s.dayOfWeek,
          sessionLabel: s.session === "MORNING" ? "Sáng" : "Chiều"
        })
      }
    })

    return {
      teacherWeeklyMatrix: matrix,
      teacherScheduleStats: {
        totalPeriods: slotsList.length,
        slotsList
      }
    }
  }, [selectedTeacherObj, slots])

    const filteredTeachers = useMemo(() => {
    if (!Array.isArray(teachers)) return [];
    return teachers.filter((t: any) => 
      (t?.teacherName || "").toLowerCase().includes((searchTeacher || "").toLowerCase()) ||
      (t?.teacherCode || "").toLowerCase().includes((searchTeacher || "").toLowerCase())
    )
  }, [teachers, searchTeacher])

  return (
    <div className="min-h-screen bg-slate-100/70 p-4 sm:p-6 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-bounce ${
          toast.type === "success" ? "bg-emerald-600 text-white border-emerald-500" :
          toast.type === "warning" ? "bg-amber-500 text-white border-amber-400" :
          toast.type === "error" ? "bg-rose-600 text-white border-rose-500" :
          "bg-slate-800 text-white border-slate-700"
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#003B3A] to-[#00A99D] text-white flex items-center justify-center font-black shadow-md">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-850 uppercase tracking-wide flex items-center gap-2">
              QUẢN LÝ & THIẾT KẾ THỜI KHÓA BIỂU
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Hệ thống ma trận Kéo - Thả tiết học, tự động cảnh báo trùng giờ Giáo viên & Cấu hình Tuần Chẵn/Lẻ
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 bg-[#00A99D] hover:bg-[#008b82] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Đang lưu toàn bộ..." : "LƯU THỜI KHÓA BIỂU"}
          </button>
          
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Xuất Excel Mẫu Trường
          </button>
        </div>
      </div>

      {/* MAIN VIEW MODE NAVIGATION TABS */}
      <div className="bg-white rounded-2xl p-2 shadow-xs border border-slate-200 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setMainViewMode("MATRIX")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            mainViewMode === "MATRIX"
              ? "bg-[#003B3A] text-white shadow-md"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Grid className="w-4 h-4 text-[#00A99D]" />
          1. MA TRẬN KÉO & THẢ LỚP HỌC
        </button>

        <button
          onClick={() => setMainViewMode("CLASS_LOOKUP")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            mainViewMode === "CLASS_LOOKUP"
              ? "bg-[#00A99D] text-white shadow-md"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-300" />
          2. TRA CỨU THEO CƠ SỞ & LỚP HỌC
        </button>

        <button
          onClick={() => setMainViewMode("TEACHER_LOOKUP")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            mainViewMode === "TEACHER_LOOKUP"
              ? "bg-[#00A99D] text-white shadow-md"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          3. TRA CỨU THEO GIÁO VIÊN & TỔ CM
        </button>
      </div>

      {/* LEVEL & CAMPUS TABS */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Level Selectors */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
          <button
            onClick={() => handleSwitchLevel("TIEU_HOC")}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeLevel === "TIEU_HOC" ? "bg-white text-[#003B3A] shadow-xs" : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            Tiểu học (Khối 1 - 5)
          </button>
          <button
            onClick={() => handleSwitchLevel("TRUNG_HOC")}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeLevel === "TRUNG_HOC" ? "bg-white text-[#003B3A] shadow-xs" : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            Trung học (Khối 6 - 12)
          </button>
          <button
            onClick={() => handleSwitchLevel("LIEN_CAP")}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeLevel === "LIEN_CAP" ? "bg-white text-[#003B3A] shadow-xs" : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Layers className="w-4 h-4 text-amber-600" />
            Liên cấp
          </button>
        </div>

        {/* Campus Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Building2 className="w-4 h-4 text-slate-400 mr-1" />
          {campuses.map((c: any) => (
            <button
              key={c.id}
              onClick={() => handleSwitchCampus(c.id)}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${
                currentCampusId === c.id
                  ? "bg-[#003B3A] text-white border-transparent shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {c.campusName}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT GRID: MATRIX TABLE + DRAWER */}
      {mainViewMode === "MATRIX" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* TIMETABLE MATRIX TABLE */}
        <div className="lg:col-span-9 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Grid className="w-4 h-4 text-[#00A99D]" />
              MA TRẬN THỜI KHÓA BIỂU LỚP HỌC (THỨ 2 - THỨ 6)
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              Kéo môn học/Giáo viên từ danh mục bên phải và thả trực tiếp vào ô tiết học
            </span>
          </div>

          <div className="overflow-x-auto max-h-[750px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[900px]">
              <thead>
                {/* Header Row 1: Class Headers */}
                <tr className="bg-[#003B3A] text-white font-black uppercase text-[11px] tracking-wider sticky top-0 z-20">
                  <th className="p-3 border-r border-teal-800 text-center w-16 sticky left-0 bg-[#003B3A] z-30">Thứ</th>
                  <th className="p-3 border-r border-teal-800 text-center w-16 sticky left-16 bg-[#003B3A] z-30">Buổi</th>
                  <th className="p-3 border-r border-teal-800 text-center w-14 sticky left-32 bg-[#003B3A] z-30">Tiết</th>
                  {displayClasses.map((cls: any) => (
                    <th key={cls.id} colSpan={2} className="p-3 text-center border-r border-teal-800 min-w-[170px]">
                      <div>{cls.className?.startsWith("Lớp") ? cls.className : `Lớp ${cls.className}`}</div>
                      <div className="text-[9px] font-medium text-teal-200 lowercase mt-0.5">{cls.level || cls.grade}</div>
                    </th>
                  ))}
                </tr>
                {/* Header Row 2: MÔN / GVGD Sub-headers */}
                <tr className="bg-teal-900 text-teal-100 font-extrabold uppercase text-[10px] tracking-wider sticky top-[41px] z-20 border-b border-teal-800">
                  <th className="p-2 border-r border-teal-800 text-center sticky left-0 bg-teal-900 z-30"></th>
                  <th className="p-2 border-r border-teal-800 text-center sticky left-16 bg-teal-900 z-30"></th>
                  <th className="p-2 border-r border-teal-800 text-center sticky left-32 bg-teal-900 z-30"></th>
                  {displayClasses.map((cls: any) => (
                    <Fragment key={cls.id}>
                      <th className="p-2 text-center border-r border-teal-800 bg-teal-950/40">MÔN</th>
                      <th className="p-2 text-center border-r border-teal-800 bg-teal-950/20">GVGD</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-xs font-semibold">
                {DAYS.map(day => (
                  PERIODS.map((period, pIdx) => {
                    const isFirstPeriodOfDay = pIdx === 0
                    const isMorningEnd = period.session === "MORNING" && period.period === 4

                    return (
                      <tr 
                        key={`${day.key}-${period.session}-${period.period}`}
                        className={`hover:bg-slate-50/80 transition-colors ${isMorningEnd ? "border-b-2 border-b-slate-300" : ""}`}
                      >
                        {/* Day Cell */}
                        {isFirstPeriodOfDay && (
                          <td 
                            rowSpan={8}
                            className="p-3 text-center font-black text-slate-800 bg-slate-100 border-r border-slate-300 align-middle sticky left-0 z-10 text-xs uppercase tracking-wider"
                          >
                            {day.label}
                          </td>
                        )}

                        {/* Session Cell */}
                        {period.period === 1 && (
                          <td 
                            rowSpan={4}
                            className={`p-2 text-center font-extrabold text-[11px] border-r border-slate-300 align-middle sticky left-16 z-10 ${
                              period.session === "MORNING" ? "bg-amber-50/80 text-amber-900" : "bg-sky-50/80 text-sky-900"
                            }`}
                          >
                            {period.session === "MORNING" ? "Sáng" : "Chiều"}
                          </td>
                        )}

                        {/* Period Number Cell */}
                        <td className="p-2 text-center font-black text-slate-700 bg-slate-50 border-r border-slate-300 sticky left-32 z-10 text-xs">
                          {period.period}
                        </td>

                        {/* Class Slot Cells */}
                        {displayClasses.map((cls: any) => {
                          const slot = getSlot(cls.id, day.key, period.session, period.period)
                          const hasSlot = !!slot && (!!slot.subjectName || !!slot.teacherName)
                          const bgColor = slot?.colorCode || SUBJECT_COLORS[slot?.subjectName || ""] || "#FFFFFF"

                          return (
                            <Fragment key={cls.id}>
                              {/* Subject Cell */}
                              <td
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => handleDropCell(e, cls, day.key, period.session, period.period)}
                                onDoubleClick={() => handleOpenEditCell(cls, day.key, period.session, period.period)}
                                title="Nhấp kép để chỉnh sửa chi tiết tiết học"
                                style={{ backgroundColor: hasSlot ? bgColor : "#FFFFFF" }}
                                className="p-2 border-r border-slate-200 cursor-pointer hover:opacity-90 transition-all font-black text-slate-850 text-center min-w-[85px] max-w-[110px] truncate"
                              >
                                {slot?.weekType === "SPLIT" ? (
                                  <div className="flex flex-col gap-0.5 text-[9px]">
                                    <span className="bg-amber-100 text-amber-900 px-1 rounded truncate">C: {slot.subjectName}</span>
                                    <span className="bg-indigo-100 text-indigo-900 px-1 rounded truncate">L: {slot.altSubjectName || "-"}</span>
                                  </div>
                                ) : (
                                  <span>
                                    {slot?.subjectName || <span className="text-slate-300 font-normal italic text-[10px]">+ Môn</span>}
                                    {slot?.weekType === "EVEN" && <span className="text-[9px] text-amber-800 block font-bold">(Chẵn)</span>}
                                    {slot?.weekType === "ODD" && <span className="text-[9px] text-indigo-800 block font-bold">(Lẻ)</span>}
                                  </span>
                                )}
                              </td>

                              {/* Teacher Cell */}
                              <td
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => handleDropCell(e, cls, day.key, period.session, period.period)}
                                onDoubleClick={() => handleOpenEditCell(cls, day.key, period.session, period.period)}
                                title="Nhấp kép để chỉnh sửa chi tiết tiết học"
                                style={{ backgroundColor: hasSlot ? bgColor : "#FFFFFF" }}
                                className="p-2 border-r border-slate-300 cursor-pointer hover:opacity-90 transition-all font-extrabold text-slate-700 text-center min-w-[85px] max-w-[110px] truncate"
                              >
                                {slot?.weekType === "SPLIT" ? (
                                  <div className="flex flex-col gap-0.5 text-[9px] font-bold text-slate-600">
                                    <span className="truncate">{slot.teacherName || "-"}</span>
                                    <span className="truncate">{slot.altTeacherName || "-"}</span>
                                  </div>
                                ) : (
                                  <span>
                                    {slot?.teacherName || <span className="text-slate-300 font-normal italic text-[10px]">+ GV</span>}
                                  </span>
                                )}
                              </td>
                            </Fragment>
                          )
                        })}
                      </tr>
                    )
                  })
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SIDEBAR DRAWER: DRAG & DROP SOURCE (MÔN HỌC & GIÁO VIÊN) */}
        <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-200 p-4 space-y-4 sticky top-6">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab("SUBJECTS")}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "SUBJECTS" ? "bg-white text-[#003B3A] shadow-xs" : "text-slate-600"
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#00A99D]" />
              Môn học ({subjects.length})
            </button>
            <button
              onClick={() => setActiveTab("TEACHERS")}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "TEACHERS" ? "bg-white text-[#003B3A] shadow-xs" : "text-slate-600"
              }`}
            >
              <UserCheck className="w-4 h-4 text-indigo-600" />
              Giáo viên ({teachers.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={activeTab === "SUBJECTS" ? "Tìm môn học..." : "Tìm tên hoặc Mã GV..."}
              value={activeTab === "SUBJECTS" ? searchSubject : searchTeacher}
              onChange={e => activeTab === "SUBJECTS" ? setSearchSubject(e.target.value) : setSearchTeacher(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#00A99D]"
            />
          </div>

          <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 shrink-0 text-[#00A99D]" />
            <span>Kéo thẻ bên dưới và thả vào ô tiết học trong bảng</span>
          </div>

          {/* Subjects List */}
          {activeTab === "SUBJECTS" && (
            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {filteredSubjects.map((s: any) => {
                const bg = SUBJECT_COLORS[s.subjectName] || "#FEF08A"
                return (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={e => handleDragStart(e, "SUBJECT", s)}
                    style={{ backgroundColor: bg }}
                    className="p-3 rounded-2xl border border-slate-200/80 font-black text-xs text-slate-850 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-2"
                  >
                    <span>{s.subjectName}</span>
                    <span className="text-[9px] font-bold bg-white/60 px-2 py-0.5 rounded-full text-slate-700">Kéo</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Teachers List */}
          {activeTab === "TEACHERS" && (
            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {filteredTeachers.map((t: any) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={e => handleDragStart(e, "TEACHER", t)}
                  className="p-3 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 font-bold text-xs text-indigo-950 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-extrabold text-indigo-950">{t.teacherName}</p>
                    <p className="text-[9px] text-indigo-600 mt-0.5">Mã: {t.teacherCode} • {t.departmentRel?.name || "Bộ môn"}</p>
                  </div>
                  <span className="text-[9px] font-bold bg-indigo-100 px-2 py-0.5 rounded-full text-indigo-800 shrink-0">GV</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      )}

      {/* TAB: CLASS SCHEDULE LOOKUP VIEW */}
      {mainViewMode === "CLASS_LOOKUP" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          {/* FILTER CONTROLS */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* 1. CHỌN CƠ SỞ */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#00A99D]" />
                1. Chọn Cơ Sở Trực Thuộc
              </label>
              <select
                value={lookupCampusId}
                onChange={e => {
                  setLookupCampusId(e.target.value);
                  setLookupClassId("");
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/20 transition-all"
              >
                <option value="">-- Tất cả các Cơ sở --</option>
                {campuses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.campusName}</option>
                ))}
              </select>
            </div>

            {/* 2. CHỌN LỚP HỌC */}
            <div className="md:col-span-7 space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00A99D]" />
                2. Chọn Lớp Học Cần Tra Cứu TKB
              </label>
              <select
                value={lookupClassId}
                onChange={e => setLookupClassId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/20 transition-all"
              >
                <option value="">-- Chọn Lớp học trong danh sách --</option>
                {campusFilteredClasses.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.className?.startsWith("Lớp") ? cls.className : `Lớp ${cls.className}`} - {cls.level || cls.grade || "Khối"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CLASS INFO BADGE */}
          {selectedClassObj ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl text-white">
                    {selectedClassObj.className?.charAt(0) || "L"}
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-wide flex items-center gap-2">
                      {selectedClassObj.className?.startsWith("Lớp") ? selectedClassObj.className : `Lớp ${selectedClassObj.className}`}
                      <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-mono normal-case">
                        {selectedClassObj.level || selectedClassObj.grade || "Cấp học"}
                      </span>
                    </h2>
                    <p className="text-xs text-teal-100 font-semibold mt-0.5">
                      Cơ sở: <span className="font-bold text-white">{campuses.find((c: any) => c.id === selectedClassObj.campusId)?.campusName || "Tất cả Cơ sở"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-right">
                    <div className="text-[10px] text-teal-200 uppercase font-black">Tổng số tiết học trong tuần</div>
                    <div className="text-lg font-black text-white">{classScheduleStats.totalPeriods} tiết / tuần</div>
                  </div>
                </div>
              </div>

              {/* WEEKLY TIMETABLE TABLE MATRIX FOR CLASS */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#003B3A] text-white font-black uppercase text-[11px] tracking-wider">
                      <th className="p-3 text-center w-24 border-r border-teal-800">Buổi</th>
                      <th className="p-3 text-center w-20 border-r border-teal-800">Tiết</th>
                      {DAYS.map(d => (
                        <th key={d.key} className="p-3 text-center border-r border-teal-800 min-w-[150px]">
                          {d.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map((p, idx) => (
                      <tr key={`${p.session}-${p.period}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        {p.period === 1 && (
                          <td rowSpan={4} className="p-3 font-black text-center border-r border-slate-200 bg-slate-100 text-slate-700 uppercase tracking-wide">
                            {p.session === "MORNING" ? "☀️ SÁNG" : "🌙 CHIỀU"}
                          </td>
                        )}
                        <td className="p-3 font-bold text-center border-r border-slate-200 text-slate-600 bg-slate-50">
                          Tiết {p.period}
                        </td>
                        {DAYS.map(d => {
                          const assignedSlot = classWeeklyMatrix[`${d.key}_${p.session}_${p.period}`];
                          return (
                            <td key={d.key} className="p-2 border-r border-slate-200 text-center vertical-top">
                              {assignedSlot ? (
                                <div
                                  style={{ backgroundColor: assignedSlot.colorCode || "#FEF08A" }}
                                  className="p-2.5 rounded-xl border border-slate-300 shadow-xs space-y-1 text-slate-900 font-bold"
                                >
                                  <div className="text-xs font-black uppercase text-[#003B3A]">
                                    {assignedSlot.subjectName}
                                  </div>
                                  <div className="text-[11px] text-slate-800 bg-white/70 px-2 py-0.5 rounded-md inline-block font-mono">
                                    {assignedSlot.teacherName || "Chưa xếp GV"}
                                  </div>
                                  {assignedSlot.weekType && assignedSlot.weekType !== "ALL" && (
                                    <div className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                      {assignedSlot.weekType === "EVEN" ? "Tuần Chẵn" : assignedSlot.weekType === "ODD" ? "Tuần Lẻ" : "Thay đổi"}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 italic text-[11px]">Trống</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CHRONOLOGICAL LIST OF CLASS PERIODS */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#00A99D]" />
                  Danh Sách Môn Học & GVGD Trong Tuần Của Lớp
                </h3>
                {classScheduleStats.slotsList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {classScheduleStats.slotsList.map((item: any, i: number) => (
                      <div key={i} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-50 text-[#00A99D] mr-2">
                            {item.dayLabel} - {item.sessionLabel} Tiết {item.periodNumber}
                          </span>
                          <h4 className="text-xs font-black text-slate-800 mt-1">{item.subjectName}</h4>
                          <p className="text-[11px] font-bold text-slate-500">GVGD: {item.teacherName || "Chưa chọn"}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400">Trạng thái</span>
                          <div className="text-xs font-black text-emerald-600">Đã xếp lịch</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 text-center">Lớp học chưa có tiết học nào được xếp lịch trong thời khóa biểu hiện tại.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400 font-semibold text-xs space-y-2">
              <Building2 className="w-8 h-8 mx-auto text-slate-300" />
              <p>Vui lòng chọn Cơ sở và Lớp học ở trên để tra cứu thời khóa biểu toàn bộ các tiết học trong tuần.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEACHER SCHEDULE LOOKUP VIEW */}
      {mainViewMode === "TEACHER_LOOKUP" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          {/* FILTER CONTROLS */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* 1. CHỌN TỔ CHUYÊN MÔN */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#00A99D]" />
                1. Lọc Theo Tổ Chuyên Môn
              </label>
              <select
                value={lookupDept}
                onChange={e => {
                  setLookupDept(e.target.value);
                  setLookupTeacherId("");
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/20 transition-all"
              >
                <option value="ALL">-- Tất cả các Tổ chuyên môn --</option>
                {uniqueDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* 2. CHỌN / TRA CỨU GIÁO VIÊN */}
            <div className="md:col-span-7 space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#00A99D]" />
                2. Chọn Giáo Viên Hoặc Nhập Tên Tra Cứu
              </label>
              <div className="flex gap-2">
                <select
                  value={lookupTeacherId}
                  onChange={e => setLookupTeacherId(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/20 transition-all"
                >
                  <option value="">-- Chọn Giáo viên trong danh sách --</option>
                  {deptFilteredTeachers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.teacherName} {t.teacherCode ? `(${t.teacherCode})` : ''} - {t.departmentRel?.name || t.departmentName || 'GV'}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Hoặc gõ tên GV..."
                  value={lookupSearchQuery}
                  onChange={e => setLookupSearchQuery(e.target.value)}
                  className="w-48 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] transition-all"
                />
              </div>
            </div>
          </div>

          {/* TEACHER INFO BADGE */}
          {selectedTeacherObj ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl text-white">
                    {selectedTeacherObj.teacherName?.charAt(0) || "GV"}
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-wide flex items-center gap-2">
                      {selectedTeacherObj.teacherName}
                      <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-mono normal-case">
                        {selectedTeacherObj.teacherCode || "GV"}
                      </span>
                    </h2>
                    <p className="text-xs text-teal-100 font-semibold mt-0.5">
                      Tổ chuyên môn: <span className="font-bold text-white">{selectedTeacherObj.departmentRel?.name || selectedTeacherObj.departmentName || "Tổ chuyên môn"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-right">
                    <div className="text-[10px] text-teal-200 uppercase font-black">Tổng tiết dạy trong tuần</div>
                    <div className="text-lg font-black text-white">{teacherScheduleStats.totalPeriods} tiết / tuần</div>
                  </div>
                </div>
              </div>

              {/* WEEKLY TIMETABLE TABLE MATRIX FOR TEACHER */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#003B3A] text-white font-black uppercase text-[11px] tracking-wider">
                      <th className="p-3 text-center w-24 border-r border-teal-800">Buổi</th>
                      <th className="p-3 text-center w-20 border-r border-teal-800">Tiết</th>
                      {DAYS.map(d => (
                        <th key={d.key} className="p-3 text-center border-r border-teal-800 min-w-[150px]">
                          {d.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map((p, idx) => (
                      <tr key={`${p.session}-${p.period}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        {p.period === 1 && (
                          <td rowSpan={4} className="p-3 font-black text-center border-r border-slate-200 bg-slate-100 text-slate-700 uppercase tracking-wide">
                            {p.session === "MORNING" ? "☀️ SÁNG" : "🌙 CHIỀU"}
                          </td>
                        )}
                        <td className="p-3 font-bold text-center border-r border-slate-200 text-slate-600 bg-slate-50">
                          Tiết {p.period}
                        </td>
                        {DAYS.map(d => {
                          const assignedSlot = teacherWeeklyMatrix[`${d.key}_${p.session}_${p.period}`];
                          return (
                            <td key={d.key} className="p-2 border-r border-slate-200 text-center vertical-top">
                              {assignedSlot ? (
                                <div
                                  style={{ backgroundColor: assignedSlot.colorCode || "#FEF08A" }}
                                  className="p-2.5 rounded-xl border border-slate-300 shadow-xs space-y-1 text-slate-900 font-bold"
                                >
                                  <div className="text-xs font-black uppercase text-[#003B3A]">
                                    {assignedSlot.subjectName}
                                  </div>
                                  <div className="text-[11px] text-slate-800 bg-white/70 px-2 py-0.5 rounded-md inline-block font-mono">
                                    {assignedSlot.className}
                                  </div>
                                  {assignedSlot.weekType && assignedSlot.weekType !== "ALL" && (
                                    <div className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                      {assignedSlot.weekType === "EVEN" ? "Tuần Chẵn" : assignedSlot.weekType === "ODD" ? "Tuần Lẻ" : "Thay đổi"}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 italic text-[11px]">Trống</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CHRONOLOGICAL LIST OF TEACHING PERIODS */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#00A99D]" />
                  Danh Sách Tiết Dạy Trong Tuần (Chi Tiết)
                </h3>
                {teacherScheduleStats.slotsList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {teacherScheduleStats.slotsList.map((item: any, i: number) => (
                      <div key={i} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-50 text-[#00A99D] mr-2">
                            {item.dayLabel} - {item.sessionLabel} Tiết {item.periodNumber}
                          </span>
                          <h4 className="text-xs font-black text-slate-800 mt-1">{item.subjectName}</h4>
                          <p className="text-[11px] font-bold text-slate-500">Lớp: {item.className}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400">Trạng thái</span>
                          <div className="text-xs font-black text-emerald-600">Đã xếp lịch</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 text-center">Giáo viên chưa có tiết dạy nào được xếp lịch trong thời khóa biểu hiện tại.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400 font-semibold text-xs space-y-2">
              <UserCheck className="w-8 h-8 mx-auto text-slate-300" />
              <p>Vui lòng chọn Tổ chuyên môn hoặc chọn/gõ tên Giáo viên ở trên để tra cứu toàn bộ lịch dạy trong tuần.</p>
            </div>
          )}
        </div>
      )}

      {/* EDIT CELL MODAL */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#00A99D]" />
                <h3 className="font-black text-sm text-slate-850 uppercase tracking-wide">
                  CHỈNH SỬA TIẾT HỌC
                </h3>
              </div>
              <button onClick={() => setEditingCell(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
              <span>Lớp: <span className="text-[#00A99D] font-black">{editingCell.className}</span></span>
              <span>{DAYS.find(d => d.key === editingCell.dayOfWeek)?.label}</span>
              <span>{editingCell.session === "MORNING" ? "Sáng" : "Chiều"} - Tiết {editingCell.periodNumber}</span>
            </div>

            {/* Week Type Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Chế độ Tuần học</label>
              <select
                value={editWeekType}
                onChange={e => setEditWeekType(e.target.value)}
                className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#00A99D]"
              >
                <option value="ALL">Tất cả các tuần (Cố định)</option>
                <option value="EVEN">Chỉ học Tuần chẵn</option>
                <option value="ODD">Chỉ học Tuần lẻ</option>
                <option value="SPLIT">Chia đôi Tuần Chẵn / Tuần Lẻ</option>
              </select>
            </div>

            {/* Main Subject & Teacher */}
            <div className="space-y-3 p-3 rounded-2xl bg-amber-50/50 border border-amber-200">
              <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block">
                {editWeekType === "SPLIT" ? "1. Môn học & GV Tuần Chẵn" : "Môn học & Giáo viên chính"}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-500">Môn học</label>
                  <select
                    value={editSubjectName}
                    onChange={e => {
                      setEditSubjectName(e.target.value)
                      setEditColorCode(SUBJECT_COLORS[e.target.value] || "#FEF08A")
                    }}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="">-- Chọn môn --</option>
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.subjectName}>{s.subjectName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500">Giáo viên</label>
                  <select
                    value={editTeacherName}
                    onChange={e => setEditTeacherName(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="">-- Chọn GV --</option>
                    {teachers.map((t: any) => (
                      <option key={t.id} value={t.teacherName}>{t.teacherName} ({t.teacherCode})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Alternate Subject & Teacher for SPLIT week mode */}
            {editWeekType === "SPLIT" && (
              <div className="space-y-3 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-200">
                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider block">
                  2. Môn học & GV Tuần Lẻ
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500">Môn học (Tuần Lẻ)</label>
                    <select
                      value={editAltSubjectName}
                      onChange={e => setEditAltSubjectName(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="">-- Chọn môn --</option>
                      {subjects.map((s: any) => (
                        <option key={s.id} value={s.subjectName}>{s.subjectName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500">Giáo viên (Tuần Lẻ)</label>
                    <select
                      value={editAltTeacherName}
                      onChange={e => setEditAltTeacherName(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="">-- Chọn GV --</option>
                      {teachers.map((t: any) => (
                        <option key={t.id} value={t.teacherName}>{t.teacherName} ({t.teacherCode})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {editingCell.slot ? (
                <button
                  type="button"
                  onClick={handleClearCell}
                  className="px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa tiết
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditModal}
                  className="px-5 py-2.5 bg-[#00A99D] hover:bg-[#008b82] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
