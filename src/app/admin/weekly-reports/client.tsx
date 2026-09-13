"use client"
import { getDefaultAcademicYearClient } from "@/lib/academicYear"
import { useState, useEffect, useMemo } from "react"
import { 
  Star, Target, BookmarkCheck, CheckCheck, FileText, Plus, Trash2, Save, Send, Calendar, MessageSquare, 
  CheckCircle2, Clock, AlertTriangle, MinusCircle, User, BarChart3, 
  Users, TrendingUp, ClipboardList, Table2, Bell, Download, Copy, History, Edit3, Eye, Search, Filter, X,
  UserCheck, AlertCircle, Sparkles, ChevronRight, Layers, ArrowRight, Check, Settings, UserPlus, Shield
} from "lucide-react"
import { 
  getWeeklyReport, getAllWeeklyReports, saveWeeklyReport, addManagerComment, 
  addManagerItemNote, getConsolidatedReports, getDashboardStats, sendWeeklyReportEmailReminders,
  getUserReportHistory, deleteWeeklyReport, getPersonalProgressCards,
  getDepartmentTeachers, assignTeachersToDepartment, removeTeacherFromDepartment,
  updateTeacherDepartmentPosition, getAllTeachersForAssignment, setTeacherPrimaryDepartment } from "./actions"
import * as XLSX from "xlsx"

function getWeeksOfMonth(month: number, year: number) {
  const weeks: { weekNum: number; start: string; end: string; label: string }[] = []
  const lastDay = new Date(year, month, 0)
  const current = new Date(year, month - 1, 1)
  while (current.getDay() !== 1 && current <= lastDay) current.setDate(current.getDate() + 1)
  let weekNum = 1
  while (current <= lastDay) {
    const start = new Date(current)
    const friday = new Date(current); friday.setDate(friday.getDate() + 4)
    const end = friday > lastDay ? new Date(lastDay) : friday
    weeks.push({ 
      weekNum, 
      start: start.toLocaleDateString("vi-VN"), 
      end: end.toLocaleDateString("vi-VN"),
      label: "Tuần " + weekNum + " (" + start.getDate() + "/" + (start.getMonth()+1) + " - " + end.getDate() + "/" + (end.getMonth()+1) + ")" 
    })
    weekNum++; current.setDate(current.getDate() + 7)
  }
  return weeks
}

const PROGRESS = [
  { value: "NOT_STARTED", label: "Chưa bắt đầu", color: "bg-slate-100 text-slate-600 border-slate-300", barColor: "#94a3b8" },
  { value: "DOING", label: "Đang thực hiện", color: "bg-blue-100 text-blue-700 border-blue-200", barColor: "#3b82f6" },
  { value: "COMPLETED", label: "Hoàn thành", color: "bg-emerald-100 text-emerald-700 border-emerald-200", barColor: "#10b981" },
  { value: "NOT_COMPLETED", label: "Chưa hoàn thành", color: "bg-amber-100 text-amber-700 border-amber-200", barColor: "#f59e0b" },
]

interface ReportItem { id?: string; mainTask: string; workContent: string; progress: string; proposedSolution: string; managerNote?: string }

export function WeeklyReportClient({ 
  currentRole, 
  currentUserId, 
  currentUserName, 
  years, 
  staffUsers, 
  roles,
  operationalScope,
  divisions,
  defaultDeptId = "",
  defaultDivisionCode = ""
}: any) {
  const now = new Date()
  
  // Scope permissions
  const isSuperAdmin = operationalScope?.isSuperAdmin || false
  const isHeadOfAcademic = operationalScope?.isHeadOfAcademic || false
  const isTBP = operationalScope?.isTBP || false
  const isDirectTBP = operationalScope?.isDirectTBP || false
  const isTTCM = operationalScope?.isTTCM || false
  const isDirectTTCM = operationalScope?.isDirectTTCM || false
  const isManager = operationalScope?.isManager ?? (currentRole === "ADMIN" || isTBP || isTTCM)

  // Default tab: "cards" if manager, otherwise "personal"
  const [activeTab, setActiveTab] = useState<"cards"|"dashboard"|"consolidated"|"config"|"personal"|"history">(
    isManager ? "cards" : "personal"
  )
  
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [academicYearId, setAcademicYearId] = useState(() => getDefaultAcademicYearClient(years)?.id || "")
  const [weeks, setWeeks] = useState<any[]>([])
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [items, setItems] = useState<ReportItem[]>([])
  const [reportId, setReportId] = useState("")
  const [reportStatus, setReportStatus] = useState("")
  const [managerComment, setManagerComment] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reminding, setReminding] = useState(false)
  const [remindingUserId, setRemindingUserId] = useState<string | null>(null)
  const [viewUserId, setViewUserId] = useState(currentUserId)
  const [mgmtComment, setMgmtComment] = useState("")
  const [editingItemNote, setEditingItemNote] = useState<string|null>(null)
  const [itemNoteText, setItemNoteText] = useState("")
  const [toastMsg, setToastMsg] = useState<{msg: string, type: string} | null>(null)

  // "Mặc định thì chỉ xuất hiện Tổ mặc định"
  const resolvedDefaultDeptId = defaultDeptId || (roles && roles.length > 0 ? (roles[0].id || roles[0].code) : "")
  const resolvedDefaultDivCode = defaultDivisionCode || 
    roles?.find((r: any) => r.id === resolvedDefaultDeptId || r.code === resolvedDefaultDeptId)?.divisionCode || 
    (divisions && divisions.length > 0 ? divisions[0].code : "")

  // Cascading Filter State: Theo mặc định thì CHỈ XUẤT HIỆN TỔ MẶC ĐỊNH
  const [filterDivisionCode, setFilterDivisionCode] = useState<string>(
    isDirectTBP && operationalScope?.managedDivisions?.length > 0 
      ? operationalScope.managedDivisions[0] 
      : (resolvedDefaultDivCode || "ALL")
  )
  const [filterDeptId, setFilterDeptId] = useState<string>(resolvedDefaultDeptId || "ALL")
  const [filterTeacherUserId, setFilterTeacherUserId] = useState<string>("ALL")

  // Personal Cards State
  const [personalCards, setPersonalCards] = useState<any[]>([])
  const [cardsSummary, setCardsSummary] = useState<any>({ totalStaff: 0, submittedCount: 0, pendingCount: 0, reviewedCount: 0 })
  const [cardSearch, setCardSearch] = useState("")
  const [cardStatusFilter, setCardStatusFilter] = useState<string>("ALL")
  const [selectedStaffForModal, setSelectedStaffForModal] = useState<any | null>(null)
  const [modalReportData, setModalReportData] = useState<any | null>(null)
  const [modalCommentInput, setModalCommentInput] = useState("")
  const [modalSavingComment, setModalSavingComment] = useState(false)

  // ================= CONFIGURATION TAB STATE =================
  const [configDivisionCode, setConfigDivisionCode] = useState<string>(
    isDirectTBP && operationalScope?.managedDivisions?.length > 0 
      ? operationalScope.managedDivisions[0] 
      : (resolvedDefaultDivCode || divisions?.[0]?.code || "BP_TRUNG_HOC")
  )
  const [configDeptId, setConfigDeptId] = useState<string>(resolvedDefaultDeptId || "")
  const [deptTeachers, setDeptTeachers] = useState<any[]>([])
  const [loadingDeptTeachers, setLoadingDeptTeachers] = useState(false)
  
  // Add Teachers Modal
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false)
  const [allAvailableTeachers, setAllAvailableTeachers] = useState<any[]>([])
  const [loadingAvailableTeachers, setLoadingAvailableTeachers] = useState(false)
  const [addTeacherSearch, setAddTeacherSearch] = useState("")
  const [selectedTeacherIdsToAdd, setSelectedTeacherIdsToAdd] = useState<string[]>([])
  const [defaultAddPosition, setDefaultAddPosition] = useState("GV")
  const [submittingAssign, setSubmittingAssign] = useState(false)

  // ================= DEFAULT DIVISION & DEPARTMENT PREFERENCE =================
  const [defaultDivCode, setDefaultDivCode] = useState<string>("")
  const [defaultDeptId, setDefaultDeptId] = useState<string>("")

  // Load saved default preferences from localStorage on mount: Mặc định luôn chỉ xuất hiện Tổ mặc định
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const savedDiv = localStorage.getItem("skyline_default_division_code")
        const savedDept = localStorage.getItem("skyline_default_dept_id")
        const targetDiv = savedDiv || resolvedDefaultDivCode
        const targetDept = savedDept || resolvedDefaultDeptId

        if (targetDiv) {
          setDefaultDivCode(targetDiv)
          setFilterDivisionCode(targetDiv)
          setConfigDivisionCode(targetDiv)
        }
        if (targetDept) {
          setDefaultDeptId(targetDept)
          setFilterDeptId(targetDept)
          setConfigDeptId(targetDept)
        }
      }
    } catch (e) {
      console.warn("Could not read localStorage defaults", e)
    }
  }, [resolvedDefaultDivCode, resolvedDefaultDeptId])

  // Handler: Set current selected Division & Department as user default
  const handleSetAsDefault = (divCode: string, deptId: string) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("skyline_default_division_code", divCode)
        localStorage.setItem("skyline_default_dept_id", deptId)
        setDefaultDivCode(divCode)
        setDefaultDeptId(deptId)
      }
      const divObj = divisions?.find((d: any) => d.code === divCode)
      const deptObj = roles?.find((r: any) => r.id === deptId || r.code === deptId)
      const divName = divObj?.name || divCode
      const deptName = deptObj?.name || deptId
      setToastMsg({
        msg: `⭐ Đã đặt "${divName} - ${deptName}" làm Bộ phận & Tổ CM mặc định của bạn!`,
        type: "success"
      })
      setTimeout(() => setToastMsg(null), 4000)
    } catch (e: any) {
      alert("Không thể lưu cài đặt mặc định: " + e.message)
    }
  }

  // Handler: 1-Click apply default Division & Department
  const handleApplyDefault = () => {
    try {
      let targetDiv = defaultDivCode || (typeof window !== "undefined" ? localStorage.getItem("skyline_default_division_code") : null)
      let targetDept = defaultDeptId || (typeof window !== "undefined" ? localStorage.getItem("skyline_default_dept_id") : null)

      // If no custom default set yet, find user's own department & division
      if (!targetDiv || !targetDept) {
        const curStaff = staffUsers?.find((u: any) => u.id === currentUserId)
        const userDept = curStaff?.teacher?.departmentRel
        if (userDept) {
          targetDiv = userDept.divisionCode || targetDiv
          targetDept = userDept.id || userDept.code || targetDept
        } else if (isDirectTBP && operationalScope?.managedDivisions?.length > 0) {
          targetDiv = operationalScope.managedDivisions[0]
        }
      }

      if (!targetDiv && divisions && divisions.length > 0) targetDiv = divisions[0].code
      if (!targetDept && roles && roles.length > 0) targetDept = roles[0].id || roles[0].code

      if (targetDiv) {
        setFilterDivisionCode(targetDiv)
        setConfigDivisionCode(targetDiv)
      }
      if (targetDept) {
        setFilterDeptId(targetDept)
        setConfigDeptId(targetDept)
      }
      setFilterTeacherUserId("ALL")

      const divObj = divisions?.find((d: any) => d.code === targetDiv)
      const deptObj = roles?.find((r: any) => r.id === targetDept || r.code === targetDept)
      const divName = divObj?.name || targetDiv || "Bộ phận"
      const deptName = deptObj?.name || targetDept || "Tổ CM"

      setToastMsg({
        msg: `🎯 Đã chọn mặc định: ${divName} - ${deptName}`,
        type: "success"
      })
      setTimeout(() => setToastMsg(null), 3000)
    } catch (e: any) {
      console.error(e)
    }
  }

  // Handler: Set teacher primary default department
  const handleSetPrimaryDept = async (teacherId: string, teacherName: string) => {
    if (!configDeptId) return
    const res = await setTeacherPrimaryDepartment(configDeptId, teacherId)
    if (res.success) {
      setToastMsg({
        msg: `⭐ Đã đặt tổ này làm Tổ CM mặc định cho GV ${teacherName}!`,
        type: "success"
      })
      setTimeout(() => setToastMsg(null), 3500)
      loadConfigDepartmentTeachers()
    } else {
      alert("Lỗi: " + res.error)
    }
  }


  // History State
  const [historyReports, setHistoryReports] = useState<any[]>([])
  const [historySearch, setHistorySearch] = useState("")
  const [viewingHistoryReport, setViewingHistoryReport] = useState<any|null>(null)

  // Consolidated State
  const [consolidatedData, setConsolidatedData] = useState<any[]>([])
  
  // Dashboard State
  const [stats, setStats] = useState<any>({ totalTasks: 0, completed: 0, overdue: 0, inProgress: 0, pending: 0 })
  const [chartData, setChartData] = useState<any>({})

  const getRoleName = (code: string) => {
    return roles?.find((r: any) => r.code === code || r.name === code || r.id === code)?.name || code;
  }

  // Filtered department list for cascading selection based on filterDivisionCode
  const availableDepts = useMemo(() => {
    if (!roles) return []
    if (filterDivisionCode === "ALL") return roles
    return roles.filter((r: any) => !r.divisionCode || r.divisionCode === filterDivisionCode)
  }, [roles, filterDivisionCode])

  // Filtered department list for Configuration Tab
  const configAvailableDepts = useMemo(() => {
    if (!roles) return []
    if (!configDivisionCode || configDivisionCode === "ALL") return roles
    return roles.filter((r: any) => !r.divisionCode || r.divisionCode === configDivisionCode)
  }, [roles, configDivisionCode])

  // Set default configDeptId when configAvailableDepts changes
  useEffect(() => {
    if (configAvailableDepts.length > 0) {
      if (!configDeptId || !configAvailableDepts.some(d => d.id === configDeptId || d.code === configDeptId)) {
        setConfigDeptId(configAvailableDepts[0].id || configAvailableDepts[0].code)
      }
    } else {
      setConfigDeptId("")
    }
  }, [configAvailableDepts])

  // Teachers filtered by selected Department for the cascading dropdown
  const teachersInSelectedDept = useMemo(() => {
    if (filterDeptId === "ALL") {
      // If no department is selected, filter by division if selected
      if (filterDivisionCode === "ALL") return staffUsers || []
      return (staffUsers || []).filter((u: any) => {
        const div = u.teacher?.departmentRel?.divisionCode
        return div === filterDivisionCode
      })
    }
    return (staffUsers || []).filter((u: any) => {
      const dId = u.teacher?.departmentRel?.id
      const dCode = u.teacher?.departmentRel?.code
      const dName = u.teacher?.departmentRel?.name
      return dId === filterDeptId || dCode === filterDeptId || dName === filterDeptId
    })
  }, [staffUsers, filterDeptId, filterDivisionCode])

  const groupedStaff = useMemo(() => {
    const groups: Record<string, any[]> = {};
    (staffUsers || []).forEach((u: any) => {
      const deptName = u.teacher?.departmentRel?.name || getRoleName(u.role);
      if (!groups[deptName]) groups[deptName] = [];
      groups[deptName].push(u);
    });
    return groups;
  }, [staffUsers, roles]);

  useEffect(() => { setWeeks(getWeeksOfMonth(month, year)) }, [month, year])
  
  // Load data based on tab
  useEffect(() => {
    if (activeTab === "cards") loadPersonalCards()
    else if (activeTab === "personal") loadReport()
    else if (activeTab === "consolidated") loadConsolidated()
    else if (activeTab === "dashboard") loadDashboard()
    else if (activeTab === "history") loadHistory()
    else if (activeTab === "config") loadConfigDepartmentTeachers()
  }, [selectedWeek, month, year, viewUserId, activeTab, filterDivisionCode, filterDeptId, filterTeacherUserId, academicYearId, configDeptId])

  const loadPersonalCards = async () => {
    setLoading(true)
    const res = await getPersonalProgressCards(
      selectedWeek, 
      month, 
      year, 
      academicYearId, 
      filterDivisionCode, 
      filterDeptId
    )
    if (res.success) {
      setPersonalCards(res.cards || [])
      setCardsSummary(res.summary || { totalStaff: 0, submittedCount: 0, pendingCount: 0, reviewedCount: 0 })
    }
    setLoading(false)
  }

  const loadReport = async () => {
    setLoading(true)
    const uid = isManager ? viewUserId : currentUserId
    const res = await getWeeklyReport(uid, selectedWeek, month, year)
    if (res.success && res.report) {
      setItems(res.report.items.map((i: any) => ({ 
        id: i.id, 
        mainTask: i.mainTask, 
        workContent: i.workContent, 
        progress: i.progress, 
        proposedSolution: i.proposedSolution || "", 
        managerNote: i.managerNote || "" 
      })))
      setReportId(res.report.id)
      setReportStatus(res.report.status)
      setManagerComment(res.report.managerComment || "")
    } else { 
      setItems([
        { mainTask: "", workContent: "", progress: "NOT_STARTED", proposedSolution: "" },
        { mainTask: "", workContent: "", progress: "NOT_STARTED", proposedSolution: "" },
        { mainTask: "", workContent: "", progress: "NOT_STARTED", proposedSolution: "" }
      ])
      setReportId("")
      setReportStatus("")
      setManagerComment("") 
    }
    setLoading(false)
  }

  const loadConsolidated = async () => {
    setLoading(true)
    const res = await getConsolidatedReports(filterDeptId, selectedWeek, month, year, filterDivisionCode)
    if (res.success) {
      // If a specific teacher is selected, filter by that teacher
      let data = res.reports || []
      if (filterTeacherUserId && filterTeacherUserId !== "ALL") {
        data = data.filter((r: any) => r.user?.id === filterTeacherUserId)
      }
      setConsolidatedData(data)
    }
    setLoading(false)
  }

  const loadDashboard = async () => {
    setLoading(true)
    const res = await getDashboardStats(month, year, filterDivisionCode, filterDeptId)
    if (res.success) { setStats(res.stats); setChartData(res.chartData) }
    setLoading(false)
  }

  const loadHistory = async () => {
    setLoading(true)
    const uid = isManager ? viewUserId : currentUserId
    const res = await getUserReportHistory(uid)
    if (res.success) setHistoryReports(res.reports)
    setLoading(false)
  }

  // Load Department Teachers for Configuration Tab
  const loadConfigDepartmentTeachers = async () => {
    if (!configDeptId) return
    setLoadingDeptTeachers(true)
    const res = await getDepartmentTeachers(configDeptId)
    if (res.success) {
      setDeptTeachers(res.teachers || [])
    } else {
      setDeptTeachers([])
    }
    setLoadingDeptTeachers(false)
  }

  // Open modal to add teachers to current department
  const handleOpenAddTeacherModal = async () => {
    setShowAddTeacherModal(true)
    setSelectedTeacherIdsToAdd([])
    setLoadingAvailableTeachers(true)
    const res = await getAllTeachersForAssignment()
    if (res.success) {
      setAllAvailableTeachers(res.teachers || [])
    }
    setLoadingAvailableTeachers(false)
  }

  const handleSaveAssignedTeachers = async () => {
    if (!configDeptId || selectedTeacherIdsToAdd.length === 0) {
      alert("Vui lòng chọn ít nhất 1 Giáo viên để gán vào Tổ!")
      return
    }
    setSubmittingAssign(true)
    const res = await assignTeachersToDepartment(configDeptId, selectedTeacherIdsToAdd, defaultAddPosition)
    setSubmittingAssign(false)
    if (res.success) {
      setToastMsg({ msg: `✅ Đã gán ${res.count} giáo viên vào Tổ thành công!`, type: "success" })
      setTimeout(() => setToastMsg(null), 3000)
      setShowAddTeacherModal(false)
      loadConfigDepartmentTeachers()
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleRemoveTeacher = async (teacherId: string, teacherName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn gỡ giáo viên "${teacherName}" khỏi Tổ này không?`)) return
    const res = await removeTeacherFromDepartment(configDeptId, teacherId)
    if (res.success) {
      setToastMsg({ msg: `🗑️ Đã gỡ ${teacherName} khỏi Tổ!`, type: "success" })
      setTimeout(() => setToastMsg(null), 3000)
      loadConfigDepartmentTeachers()
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleUpdatePosition = async (teacherId: string, position: string) => {
    const res = await updateTeacherDepartmentPosition(configDeptId, teacherId, position)
    if (res.success) {
      setToastMsg({ msg: "✅ Đã cập nhật chức vụ thành công!", type: "success" })
      setTimeout(() => setToastMsg(null), 2000)
      loadConfigDepartmentTeachers()
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleOpenCardReportModal = async (card: any) => {
    setSelectedStaffForModal(card)
    setModalCommentInput(card.managerComment || "")
    setModalReportData(null)
    if (card.reportId) {
      const res = await getWeeklyReport(card.userId, selectedWeek, month, year)
      if (res.success && res.report) {
        setModalReportData(res.report)
      }
    }
  }

  const handleSaveModalComment = async () => {
    if (!selectedStaffForModal?.reportId) {
      alert("Nhân sự này chưa nộp báo cáo tuần để nhận xét!")
      return
    }
    if (!modalCommentInput.trim()) return
    setModalSavingComment(true)
    const res = await addManagerComment(selectedStaffForModal.reportId, modalCommentInput.trim())
    setModalSavingComment(false)
    if (res.success) {
      setToastMsg({ msg: "✅ Đã lưu nhận xét chỉ đạo thành công!", type: "success" })
      setTimeout(() => setToastMsg(null), 3000)
      setSelectedStaffForModal(null)
      loadPersonalCards()
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleRemindSingleStaff = async (staffUserId: string, staffName: string) => {
    setRemindingUserId(staffUserId)
    const res = await sendWeeklyReportEmailReminders(selectedWeek, month, year, staffUserId)
    setRemindingUserId(null)
    if (res.success) {
      setToastMsg({ msg: `🔔 Đã gửi nhắc nộp báo cáo tuần cho ${staffName}!`, type: "success" })
      setTimeout(() => setToastMsg(null), 3500)
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleSendReminderAllPending = async () => {
    setReminding(true)
    const res = await sendWeeklyReportEmailReminders(selectedWeek, month, year)
    setReminding(false)
    if (res.success) {
      setToastMsg({ 
        msg: `🔔 Đã gửi nhắc nộp báo cáo cho ${res.remindedCount} nhân sự chưa nộp!`, 
        type: "success" 
      })
      setTimeout(() => setToastMsg(null), 4000)
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleEditPastReport = (report: any) => {
    setMonth(report.month)
    setYear(report.year)
    setSelectedWeek(report.weekNumber)
    setActiveTab("personal")
    setToastMsg({ 
      msg: `✏️ Đã mở báo cáo Tuần ${report.weekNumber} (Tháng ${report.month}/${report.year}) để hiệu chỉnh!`, 
      type: "success" 
    })
    setTimeout(() => setToastMsg(null), 4000)
  }

  const handleDeleteReport = async (rptId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa báo cáo này không?")) return
    const res = await deleteWeeklyReport(rptId)
    if (res.success) {
      setToastMsg({ msg: "🗑️ Đã xóa báo cáo thành công!", type: "success" })
      setTimeout(() => setToastMsg(null), 3000)
      loadHistory()
    } else alert("Lỗi: " + res.error)
  }

  const addRows = (count: number = 1) => {
    const newRows: ReportItem[] = Array.from({ length: count }, () => ({
      mainTask: "", workContent: "", progress: "NOT_STARTED", proposedSolution: ""
    }))
    setItems(prev => [...prev, ...newRows])
  }

  const removeRow = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, field: string, value: string) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const handleSave = async () => {
    const activeItems = items.filter(i => i.mainTask.trim() || i.workContent.trim())
    if (activeItems.length === 0) return alert("Vui lòng nhập ít nhất 1 công việc!")
    
    setSaving(true)
    const res = await saveWeeklyReport({ 
      weekNumber: selectedWeek, 
      month, 
      year, 
      academicYearId, 
      targetUserId: isManager ? viewUserId : undefined,
      items: activeItems.map(i => ({ 
        mainTask: i.mainTask, 
        workContent: i.workContent, 
        progress: i.progress, 
        proposedSolution: i.proposedSolution 
      })) 
    })
    setSaving(false)
    if (res.success) { 
      setToastMsg({ msg: "✅ Báo cáo tuần đã được lưu thành công!", type: "success" })
      setTimeout(() => setToastMsg(null), 3000)
      loadReport() 
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const exportToExcel = () => {
    if (consolidatedData.length === 0) return alert("Không có dữ liệu để xuất Excel!")
    const rows: any[] = []
    let stt = 1
    consolidatedData.forEach((report: any) => {
      report.items.forEach((item: any) => {
        rows.push({
          "STT": stt++,
          "Mã Email": report.user?.email || "",
          "Họ và Tên": report.user?.fullName || "",
          "Chức danh / Tổ": report.user?.teacher?.departmentRel?.name || getRoleName(report.user?.role),
          "Task Chính": item.mainTask,
          "Nội Dung Công Việc": item.workContent,
          "Tiến Độ": PROGRESS.find(p => p.value === item.progress)?.label || item.progress,
          "Đề Xuất Giải Pháp": item.proposedSolution || "",
          "Nhận Xét Của QL": item.managerNote || ""
        })
      })
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `BaoCaoTuan_${selectedWeek}_${month}_${year}`)
    XLSX.writeFile(wb, `BaoCaoTuan_Tuan${selectedWeek}_Thang${month}_${year}.xlsx`)
  }

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return personalCards.filter(card => {
      const q = cardSearch.trim().toLowerCase()
      const matchQuery = !q || 
        card.fullName.toLowerCase().includes(q) || 
        card.email.toLowerCase().includes(q) ||
        card.departmentName.toLowerCase().includes(q) ||
        card.position.toLowerCase().includes(q)

      const matchStatus = cardStatusFilter === "ALL" ||
        (cardStatusFilter === "PENDING" && (card.submissionStatus === "NOT_SUBMITTED" || card.submissionStatus === "DRAFT")) ||
        (cardStatusFilter === "SUBMITTED" && (card.submissionStatus === "SUBMITTED" || card.submissionStatus === "REVIEWED")) ||
        (cardStatusFilter === "REVIEWED" && card.submissionStatus === "REVIEWED") ||
        (cardStatusFilter === "OVERDUE" && card.tasks?.overdue > 0)

      const matchDept = filterDeptId === "ALL" || 
        card.departmentId === filterDeptId || 
        card.departmentCode === filterDeptId || 
        card.departmentName === filterDeptId

      const matchTeacher = filterTeacherUserId === "ALL" || card.userId === filterTeacherUserId

      return matchQuery && matchStatus && matchDept && matchTeacher
    })
  }, [personalCards, cardSearch, cardStatusFilter, filterDeptId, filterTeacherUserId])

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return historyReports
    const q = historySearch.toLowerCase()
    return historyReports.filter(r => 
      `tuần ${r.weekNumber}`.includes(q) ||
      `tháng ${r.month}`.includes(q) ||
      `${r.year}`.includes(q) ||
      r.items.some((i: any) => i.mainTask?.toLowerCase().includes(q) || i.workContent?.toLowerCase().includes(q))
    )
  }, [historyReports, historySearch])

  // Get current division label
  const currentDivisionLabel = useMemo(() => {
    if (isSuperAdmin || isHeadOfAcademic) return "Ban Điều Hành / Toàn Trường"
    if (isDirectTBP) {
      const divNames = operationalScope?.managedDivisions?.map((d: string) => {
        const found = divisions?.find((div: any) => div.code === d)
        return found?.name || d
      }).join(", ")
      return `Trưởng Bộ Phận (${divNames || 'Chuyên môn'})`
    }
    if (isDirectTTCM) {
      const deptNames = operationalScope?.scopedDepartments?.map((d: any) => d.name).join(", ")
      return `Tổ Trưởng Chuyên Môn (${deptNames || 'Tổ CM'})`
    }
    return "Giáo viên / Nhân viên"
  }, [isSuperAdmin, isHeadOfAcademic, isDirectTBP, isDirectTTCM, operationalScope, divisions])

  // Filtered available teachers in Add Modal
  const filteredAvailableTeachers = useMemo(() => {
    const assignedIds = new Set(deptTeachers.map(t => t.id))
    return allAvailableTeachers.filter(t => {
      if (assignedIds.has(t.id)) return false
      if (!addTeacherSearch.trim()) return true
      const q = addTeacherSearch.toLowerCase().trim()
      return (
        t.teacherName.toLowerCase().includes(q) ||
        t.teacherCode.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.campusName.toLowerCase().includes(q)
      )
    })
  }, [allAvailableTeachers, deptTeachers, addTeacherSearch])

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 bg-slate-50/50 min-h-screen">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border max-w-md animate-in slide-in-from-top-4 duration-300 ${
          toastMsg.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-600 border-red-500 text-white'
        }`}>
          <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-white" />
          <div className="flex-1">
            <p className="font-bold text-sm">Thông báo</p>
            <p className="text-xs opacity-95">{toastMsg.msg}</p>
          </div>
          <button onClick={() => setToastMsg(null)} className="p-1 hover:bg-white/20 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Modal: Add Teachers to Department */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#48BFE3] font-black">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">
                    Thêm Giáo viên vào Tổ Chuyên Môn
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tổ đang chọn: <strong>{roles?.find((r: any) => r.id === configDeptId || r.code === configDeptId)?.name}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddTeacherModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 border-b bg-white space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={addTeacherSearch}
                    onChange={e => setAddTeacherSearch(e.target.value)}
                    placeholder="Tìm theo tên, mã GV, cơ sở..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#48BFE3]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Chức vụ gán:</label>
                  <select
                    value={defaultAddPosition}
                    onChange={e => setDefaultAddPosition(e.target.value)}
                    className="p-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-slate-50"
                  >
                    <option value="GV">GV (Giáo viên)</option>
                    <option value="TTCM">TTCM (Tổ trưởng)</option>
                    <option value="TPTCM">TPTCM (Tổ phó)</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <p className="text-slate-500">
                  Đã chọn: <strong className="text-teal-700">{selectedTeacherIdsToAdd.length}</strong> giáo viên
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = filteredAvailableTeachers.map(t => t.id)
                      setSelectedTeacherIdsToAdd(allIds)
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-all"
                  >
                    ☑️ Chọn tất cả ({filteredAvailableTeachers.length})
                  </button>
                  {selectedTeacherIdsToAdd.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTeacherIdsToAdd([])}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 max-h-96">
              {loadingAvailableTeachers ? (
                <div className="py-12 text-center text-slate-400 text-xs">Đang tải danh sách giáo viên...</div>
              ) : filteredAvailableTeachers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Không tìm thấy giáo viên nào phù hợp hoặc tất cả đã thuộc tổ này!
                </div>
              ) : (
                <div className="divide-y border rounded-2xl overflow-hidden">
                  {filteredAvailableTeachers.map(t => {
                    const isSelected = selectedTeacherIdsToAdd.includes(t.id)
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTeacherIdsToAdd(prev => prev.filter(id => id !== t.id))
                          } else {
                            setSelectedTeacherIdsToAdd(prev => [...prev, t.id])
                          }
                        }}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? "bg-teal-50/70" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent div
                            className="rounded text-[#48BFE3] focus:ring-[#48BFE3] w-4 h-4"
                          />
                          <div>
                            <p className="font-extrabold text-xs text-slate-800">{t.teacherName}</p>
                            <p className="text-[11px] text-slate-400">
                              Mã: {t.teacherCode} &bull; {t.email} &bull; {t.campusName}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border">
                          Hiện tại: {t.currentDeptName}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
              <button
                onClick={() => setShowAddTeacherModal(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveAssignedTeachers}
                disabled={submittingAssign || selectedTeacherIdsToAdd.length === 0}
                className="bg-[#48BFE3] hover:bg-[#007A72] disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                {submittingAssign ? "Đang gán..." : `Gán ${selectedTeacherIdsToAdd.length} GV vào Tổ`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View & Quick Comment from Card */}
      {selectedStaffForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#48BFE3] font-black">
                  {selectedStaffForModal.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                    {selectedStaffForModal.fullName}
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">
                      {selectedStaffForModal.departmentName}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Báo cáo Tuần {selectedWeek} (Tháng {month}/{year}) &bull; {selectedStaffForModal.email}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStaffForModal(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {modalReportData && modalReportData.items?.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b text-slate-600 font-extrabold uppercase">
                        <th className="p-3 text-center w-10">STT</th>
                        <th className="p-3 min-w-[140px]">Task chính</th>
                        <th className="p-3 min-w-[240px]">Nội dung công việc</th>
                        <th className="p-3 w-28">Tiến độ</th>
                        <th className="p-3 min-w-[180px]">Đề xuất giải pháp</th>
                        <th className="p-3 min-w-[180px]">Nhận xét QL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium">
                      {modalReportData.items.map((item: any, idx: number) => {
                        const prog = PROGRESS.find(p => p.value === item.progress) || PROGRESS[0]
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-3 font-bold text-indigo-900">{item.mainTask}</td>
                            <td className="p-3 text-slate-700 leading-relaxed break-words">{item.workContent}</td>
                            <td className="p-3">
                              <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${prog.color}`}>
                                {prog.label}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 italic break-words">{item.proposedSolution || "-"}</td>
                            <td className="p-3 text-slate-700 break-words">{item.managerNote || "-"}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-amber-50/50 rounded-2xl border border-amber-200 text-amber-800">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="font-bold text-sm">Nhân sự chưa nộp báo cáo tuần {selectedWeek}!</p>
                  <p className="text-xs text-amber-600 mt-1">Hạn định kỳ nộp báo cáo là trước 14h00 Thứ 5 hàng tuần.</p>
                  <button
                    onClick={() => handleRemindSingleStaff(selectedStaffForModal.userId, selectedStaffForModal.fullName)}
                    className="mt-4 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Bell className="w-4 h-4" /> Gửi nhắc nhở ngay
                  </button>
                </div>
              )}

              {modalReportData && (
                <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-3">
                  <label className="block text-xs font-bold text-teal-900 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#48BFE3]" /> Nhận xét chỉ đạo của Ban Quản Lý (TBP / Trưởng Ban):
                  </label>
                  <textarea
                    rows={3}
                    value={modalCommentInput}
                    onChange={e => setModalCommentInput(e.target.value)}
                    placeholder="Nhập nhận xét, đánh giá kết quả và chỉ đạo công việc cho nhân sự này..."
                    className="w-full p-3 border border-teal-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#48BFE3] bg-white text-slate-800"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveModalComment}
                      disabled={modalSavingComment}
                      className="bg-[#48BFE3] hover:bg-[#007A72] text-white px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Save className="w-4 h-4" /> {modalSavingComment ? "Đang lưu..." : "Lưu nhận xét chỉ đạo"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
              <span className="text-xs text-slate-400">Trạng thái: <strong>{selectedStaffForModal.submissionStatus}</strong></span>
              <button
                onClick={() => setSelectedStaffForModal(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#48BFE3] shadow-sm">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                Báo cáo Tuần Giáo viên & Nhân sự
              </h1>
              <span className="text-[11px] px-3 py-1 bg-gradient-to-r from-teal-500/10 to-teal-700/10 text-teal-800 border border-teal-200 rounded-full font-extrabold">
                {currentDivisionLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cấu hình nhân sự theo Bộ phận & Tổ CM &bull; Chỉ thấy danh sách GV thuộc TCM đó &bull; Bám sát tiến độ & Thẻ cá nhân
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isManager && (
            <button
              onClick={handleSendReminderAllPending}
              disabled={reminding}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm font-bold text-xs"
            >
              <Bell className="w-4 h-4" /> 
              {reminding ? "Đang gửi nhắc nhở..." : `Nhắc nộp báo cáo (${cardsSummary.pendingCount} chưa nộp)`}
            </button>
          )}

          {activeTab === "consolidated" && isManager && (
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm font-bold text-xs"
            >
              <Download className="w-4 h-4" /> Xuất Excel Tổng hợp
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 gap-1.5 flex-wrap">
        {[
          ...(isManager ? [{ key: "cards", label: "📇 Thẻ Tiến Độ Cá Nhân", icon: Users }] : []),
          ...(isManager ? [{ key: "dashboard", label: "📊 Thống Kê & Bám Sát", icon: BarChart3 }] : []),
          ...(isManager ? [{ key: "consolidated", label: "📋 Tổng Hợp Báo Cáo", icon: Table2 }] : []),
          ...(isManager ? [{ key: "config", label: "⚙️ Cấu hình Nhân sự Tổ CM", icon: Settings }] : []),
          { key: "personal", label: "📝 Lập & Hiệu Chỉnh Báo Cáo", icon: Edit3 },
          { key: "history", label: "📜 Lịch Sử Đã Nộp", icon: History },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 min-w-[145px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === tab.key
                ? "bg-[#48BFE3] text-white shadow-md"
                : "text-slate-500 hover:text-teal-700 hover:bg-teal-50/50"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ============ 3-TIER CASCADING FILTER BAR (For Cards, Consolidated, Dashboard, Personal) ============ */}
      {activeTab !== "history" && activeTab !== "config" && (
        <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Tháng</label>
              <select
                value={month}
                onChange={e => setMonth(+e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-slate-50/50"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Năm</label>
              <select
                value={year}
                onChange={e => setYear(+e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-slate-50/50"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Năm học</label>
              <select
                value={academicYearId}
                onChange={e => setAcademicYearId(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-slate-50/50"
              >
                {(years || []).filter((y: any) => !y.isOff).map((y: any) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Tuần báo cáo</label>
              <select
                value={selectedWeek}
                onChange={e => setSelectedWeek(+e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-slate-50/50"
              >
                {weeks.map(w => (
                  <option key={w.weekNum} value={w.weekNum}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CASCADING FILTER: 1. Bộ Phận -> 2. Tổ CM -> 3. Chỉ thấy GV thuộc TCM đó */}
          {isManager && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 pb-1">
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#48BFE3]" /> Bộ lọc 3 cấp bám sát tổ chuyên môn
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyDefault}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 shadow-2xs transition-all active:scale-95"
                  title="Nhấp 1-click để đưa bộ lọc về đúng Bộ phận & Tổ CM mặc định"
                >
                  <Target className="w-3.5 h-3.5 text-[#48BFE3]" /> Chọn mặc định
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAsDefault(filterDivisionCode, filterDeptId)}
                  disabled={filterDivisionCode === "ALL" || filterDeptId === "ALL"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs transition-all disabled:opacity-40 active:scale-95"
                  title="Lưu bộ lọc hiện tại làm mặc định của bạn"
                >
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Đặt làm mặc định
                </button>
              </div>
            </div>
          )}
          {isManager && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-[#48BFE3]" /> 1. Chọn Bộ Phận Chuyên Môn
                </label>
                <select
                  disabled={isDirectTBP}
                  value={filterDivisionCode}
                  onChange={e => {
                    const newDiv = e.target.value
                    setFilterDivisionCode(newDiv)
                    const deptsInDiv = roles?.filter((r: any) => !r.divisionCode || r.divisionCode === newDiv) || []
                    const matchDef = deptsInDiv.find((d: any) => d.id === (defaultDeptId || resolvedDefaultDeptId) || d.code === (defaultDeptId || resolvedDefaultDeptId))
                    const targetDept = matchDef ? (matchDef.id || matchDef.code) : (deptsInDiv[0]?.id || deptsInDiv[0]?.code || "ALL")
                    setFilterDeptId(targetDept)
                    setFilterTeacherUserId("ALL")
                  }}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-slate-50/50 disabled:opacity-75"
                >
                  <option value="ALL">-- Tất cả Bộ phận --</option>
                  {(divisions || []).map((div: any) => (
                    <option key={div.code} value={div.code}>{div.name} ({div.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#48BFE3]" /> 2. Chọn Tổ Chuyên Môn (TCM)
                </label>
                <select
                  value={filterDeptId}
                  onChange={e => {
                    setFilterDeptId(e.target.value)
                    setFilterTeacherUserId("ALL")
                  }}
                  className="w-full p-2.5 border border-teal-200 rounded-xl text-xs font-extrabold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-teal-50/40 text-teal-900"
                >
                  {(isSuperAdmin || isHeadOfAcademic) && (
                    <option value="ALL">-- Tất cả Tổ Chuyên môn trong Bộ phận --</option>
                  )}
                  {availableDepts.map((d: any) => {
                    const isDef = (d.id === (defaultDeptId || resolvedDefaultDeptId) || d.code === (defaultDeptId || resolvedDefaultDeptId))
                    return (
                      <option key={d.id || d.code} value={d.id || d.code}>
                        {d.name} {isDef ? "⭐ (Tổ mặc định)" : ""}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#48BFE3]" /> 3. Chỉ thấy Danh sách GV thuộc TCM đó
                </label>
                <select
                  value={filterTeacherUserId}
                  onChange={e => {
                    setFilterTeacherUserId(e.target.value)
                    if (e.target.value !== "ALL") setViewUserId(e.target.value)
                  }}
                  className="w-full p-2.5 border border-teal-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-white text-teal-900 shadow-sm"
                >
                  <option value="ALL">
                    {filterDeptId !== "ALL" 
                      ? `-- Tất cả ${teachersInSelectedDept.length} GV thuộc tổ này --`
                      : "-- Tất cả GV trong phạm vi --"
                    }
                  </option>
                  {teachersInSelectedDept.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email || u.teacher?.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-[#48BFE3] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <>
          {/* ============ TAB: CẤU HÌNH NHÂN SỰ THEO TỔ CM & BỘ PHẬN ============ */}
          {activeTab === "config" && isManager && (
            <div className="space-y-6">
              {/* Configuration Header Box */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-[#48BFE3]" /> Cấu Hình Nhân Sự: Chọn Bộ Phận & Tổ Chuyên Môn
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Gán Giáo viên vào đúng Tổ CM để các chức năng Báo cáo, Điều hành chỉ hiển thị Giáo viên thuộc Tổ đó
                    </p>
                  </div>

                  {/* Nút Chọn Mặc Định & Đặt Làm Mặc Định */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleApplyDefault}
                      className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-3.5 py-2 rounded-xl text-xs font-black shadow-xs transition-all active:scale-95"
                      title="Chọn nhanh Bộ phận & Tổ CM mặc định của bạn"
                    >
                      <Target className="w-4 h-4 text-[#48BFE3]" /> Chọn mặc định
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAsDefault(configDivisionCode, configDeptId)}
                      className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-xs transition-all active:scale-95"
                      title="Lưu Bộ phận & Tổ CM đang chọn làm mặc định cho các lần sau"
                    >
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Đặt làm mặc định
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#48BFE3]" /> 1. Chọn Bộ Phận
                    </label>
                    <select
                      disabled={isDirectTBP}
                      value={configDivisionCode}
                      onChange={e => setConfigDivisionCode(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-slate-50 disabled:opacity-80"
                    >
                      {(divisions || []).map((div: any) => (
                        <option key={div.code} value={div.code}>{div.name} ({div.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#48BFE3]" /> 2. Chọn Tổ Chuyên Môn (TCM)
                    </label>
                    <select
                      value={configDeptId}
                      onChange={e => setConfigDeptId(e.target.value)}
                      className="w-full p-3 border border-teal-200 rounded-xl text-xs font-extrabold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-teal-50/50 text-teal-900"
                    >
                      {configAvailableDepts.map((d: any) => (
                        <option key={d.id || d.code} value={d.id || d.code}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Default badge indicator */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">Mặc định đã lưu:</span>
                    {defaultDivCode && defaultDeptId ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-100/80 text-teal-800 font-bold border border-teal-200">
                        <BookmarkCheck className="w-3 h-3 text-[#48BFE3]" />
                        {divisions?.find((d: any) => d.code === defaultDivCode)?.name || defaultDivCode} • {roles?.find((r: any) => r.id === defaultDeptId || r.code === defaultDeptId)?.name || defaultDeptId}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Chưa lưu (Bấm "Đặt làm mặc định" để lưu)</span>
                    )}
                  </div>
                  {configDivisionCode === defaultDivCode && configDeptId === defaultDeptId ? (
                    <span className="text-emerald-600 font-black flex items-center gap-1 text-[11px]">
                      <Check className="w-3 h-3" /> Đang xem đúng tổ mặc định
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyDefault}
                      className="text-[#48BFE3] hover:underline font-bold text-[11px]"
                    >
                      Bấm để chọn mặc định
                    </button>
                  )}
                </div>
              </div>

              {/* Department Teachers List Box */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                      <Users className="w-5 h-5 text-teal-600" />
                      Danh Sách Giáo Viên Thuộc: {roles?.find((r: any) => r.id === configDeptId || r.code === configDeptId)?.name || "Tổ chuyên môn"}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Hiện có <strong>{deptTeachers.length}</strong> giáo viên thuộc tổ này
                    </p>
                  </div>

                  <button
                    onClick={handleOpenAddTeacherModal}
                    className="flex items-center gap-2 bg-[#48BFE3] hover:bg-[#007A72] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
                  >
                    <UserPlus className="w-4 h-4" /> Thêm / Gán Giáo Viên Vào Tổ Này
                  </button>
                </div>

                {loadingDeptTeachers ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-bold">Đang tải danh sách giáo viên trong tổ...</div>
                ) : deptTeachers.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-600">Tổ này hiện chưa có giáo viên nào!</p>
                    <p className="text-xs mt-1">Bấm nút "Thêm / Gán Giáo Viên Vào Tổ Này" ở trên để đưa giáo viên vào tổ.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b text-slate-600 font-extrabold uppercase">
                          <th className="p-3 text-center w-12">STT</th>
                          <th className="p-3 min-w-[200px]">Họ và Tên Giáo viên</th>
                          <th className="p-3 min-w-[150px]">Email</th>
                          <th className="p-3 min-w-[120px]">Cơ sở</th>
                          <th className="p-3 w-44">Chức vụ trong Tổ</th>
                          <th className="p-3 text-center w-36">Tổ Mặc Định</th>
                          <th className="p-3 text-center w-24">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-medium">
                        {deptTeachers.map((t, idx) => (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-3 font-extrabold text-slate-800 flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#48BFE3] flex items-center justify-center font-black text-xs">
                                {t.teacherName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div>{t.teacherName}</div>
                                <div className="text-[10px] text-slate-400 font-normal">Mã: {t.teacherCode}</div>
                              </div>
                            </td>
                            <td className="p-3 text-slate-600">{t.email || "-"}</td>
                            <td className="p-3 text-slate-600">{t.campusName || "-"}</td>
                            <td className="p-3">
                              <select
                                value={t.position}
                                onChange={e => handleUpdatePosition(t.id, e.target.value)}
                                className="p-1.5 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-white w-full"
                              >
                                <option value="GV">GV (Thành viên)</option>
                                <option value="TTCM">TTCM (Tổ trưởng)</option>
                                <option value="TPTCM">TPTCM (Tổ phó)</option>
                              </select>
                            </td>
                            <td className="p-3 text-center">
                              {t.isPrimary ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                  <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-600" /> Mặc định
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryDept(t.id, t.teacherName)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-500 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition-all active:scale-95"
                                  title="Chọn tổ này làm Tổ Chuyên Môn chính (mặc định) cho giáo viên"
                                >
                                  <Star className="w-3.5 h-3.5 text-slate-400 hover:text-amber-500" /> Chọn mặc định
                                </button>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleRemoveTeacher(t.id, t.teacherName)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Gỡ khỏi tổ này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============ TAB: CARDS THEO DÕI TIẾN ĐỘ CÁ NHÂN ============ */}
          {activeTab === "cards" && isManager && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Tổng Nhân Sự</p>
                    <p className="text-2xl font-black text-slate-800">{cardsSummary.totalStaff}</p>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Đã Nộp Báo Cáo</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-black text-emerald-600">{cardsSummary.submittedCount}</p>
                      <span className="text-xs font-bold text-slate-400">
                        ({cardsSummary.totalStaff > 0 ? Math.round((cardsSummary.submittedCount / cardsSummary.totalStaff) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Chưa Nộp Báo Cáo</p>
                    <p className="text-2xl font-black text-amber-600">{cardsSummary.pendingCount}</p>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Đã Duyệt / Nhận Xét</p>
                    <p className="text-2xl font-black text-purple-600">{cardsSummary.reviewedCount}</p>
                  </div>
                </div>
              </div>

              {/* Cards Filter Bar */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={cardSearch}
                    onChange={e => setCardSearch(e.target.value)}
                    placeholder="Tìm theo họ tên, email, chức danh..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#48BFE3]"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={cardStatusFilter}
                    onChange={e => setCardStatusFilter(e.target.value)}
                    className="p-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-slate-50"
                  >
                    <option value="ALL">-- Tất cả trạng thái nộp --</option>
                    <option value="PENDING">🔴 Chưa nộp báo cáo</option>
                    <option value="SUBMITTED">🟢 Đã nộp báo cáo</option>
                    <option value="REVIEWED">🟣 Đã nhận xét / duyệt</option>
                    <option value="OVERDUE">⚠️ Có việc trễ hạn</option>
                  </select>
                </div>
              </div>

              {/* Cards Grid */}
              {filteredCards.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-3xl border border-slate-100 text-slate-400">
                  <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-bold text-sm text-slate-600">Không tìm thấy giáo viên phù hợp bộ lọc!</p>
                  <p className="text-xs mt-1">Vui lòng thay đổi từ khóa tìm kiếm hoặc chọn lại Bộ phận / Tổ CM.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredCards.map(card => {
                    const isSubmitted = card.submissionStatus === "SUBMITTED" || card.submissionStatus === "REVIEWED"
                    const isReviewed = card.submissionStatus === "REVIEWED"
                    const rateColor = card.completionRate >= 80 ? "bg-emerald-500" : card.completionRate >= 50 ? "bg-blue-500" : "bg-amber-500"

                    return (
                      <div
                        key={card.userId}
                        className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                      >
                        <div className="p-5 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-[#48BFE3] text-white flex items-center justify-center font-black text-sm shadow-sm">
                                {card.fullName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-sm text-slate-800 leading-snug group-hover:text-teal-700 transition-colors">
                                  {card.fullName}
                                </h4>
                                <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{card.email}</p>
                              </div>
                            </div>
                            
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 uppercase border">
                              {card.position}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 truncate max-w-[140px]">
                              <Layers className="w-3 h-3 text-[#48BFE3] flex-shrink-0" /> {card.departmentName}
                            </span>

                            {isReviewed ? (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-extrabold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Đã duyệt
                              </span>
                            ) : isSubmitted ? (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Đã nộp
                              </span>
                            ) : (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-extrabold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Chưa nộp
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-500 text-[11px]">Tiến độ công việc</span>
                              <span className="font-black text-slate-800 text-[11px]">{card.completionRate}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${rateColor}`} 
                                style={{ width: `${card.completionRate}%` }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-50 rounded-2xl text-center">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold">Xong</p>
                              <p className="text-xs font-black text-emerald-600">{card.reportCompleted}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold">Đang làm</p>
                              <p className="text-xs font-black text-blue-600">{card.reportDoing}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold">Chưa xong</p>
                              <p className="text-xs font-black text-amber-600">{card.reportNotCompleted}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold">Trễ hạn</p>
                              <p className="text-xs font-black text-red-600">{card.tasks?.overdue || 0}</p>
                            </div>
                          </div>

                          {card.managerComment && (
                            <div className="p-2.5 bg-teal-50/60 rounded-xl border border-teal-100 text-[11px] text-teal-900 line-clamp-2">
                              💬 <strong>QL:</strong> {card.managerComment}
                            </div>
                          )}
                        </div>

                        <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-1.5">
                          <button
                            onClick={() => handleOpenCardReportModal(card)}
                            className="flex-1 py-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs flex items-center justify-center gap-1 shadow-2xl transition-all"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#48BFE3]" /> Xem & Duyệt
                          </button>

                          {!isSubmitted && (
                            <button
                              onClick={() => handleRemindSingleStaff(card.userId, card.fullName)}
                              disabled={remindingUserId === card.userId}
                              className="py-1.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl font-bold text-xs flex items-center gap-1 transition-all"
                              title="Gửi nhắc nộp báo cáo riêng cho nhân sự này"
                            >
                              <Bell className="w-3.5 h-3.5" /> 
                              {remindingUserId === card.userId ? "..." : "Nhắc"}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============ TAB: DASHBOARD THỐNG KÊ ============ */}
          {activeTab === "dashboard" && isManager && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Tổng Task Giao</p>
                    <p className="text-2xl font-black text-slate-800">{stats.totalTasks}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Hoàn thành</p>
                    <p className="text-2xl font-black text-emerald-600">{stats.completed}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Đang thực hiện</p>
                    <p className="text-2xl font-black text-blue-600">{stats.inProgress}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Trễ hạn</p>
                    <p className="text-2xl font-black text-red-600">{stats.overdue}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-sm space-y-4">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#48BFE3]" /> Ma trận Tiến độ Báo cáo Tuần trong Tháng {month}/{year}
                </h3>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b text-slate-600 font-extrabold uppercase">
                        <th className="p-3 min-w-[200px]">Họ và Tên Nhân sự</th>
                        {weeks.map(w => (
                          <th key={w.weekNum} className="p-3 text-center min-w-[120px]">
                            Tuần {w.weekNum}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium">
                      {Object.entries(chartData as Record<string, any>).map(([uid, u]: any) => (
                        <tr key={uid} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">{u.name}</td>
                          {weeks.map(w => {
                            const st = u.weeks?.[w.weekNum]
                            if (!st) {
                              return (
                                <td key={w.weekNum} className="p-3 text-center text-slate-300">
                                  Chưa nộp
                                </td>
                              )
                            }
                            return (
                              <td key={w.weekNum} className="p-3 text-center">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  {st.completed}/{st.total} xong
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============ TAB: CONSOLIDATED TỔNG HỢP (From User Screenshot) ============ */}
          {activeTab === "consolidated" && isManager && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                      <Table2 className="w-5 h-5 text-[#48BFE3]" /> Tổng hợp báo cáo Tuần {selectedWeek} - Tháng {month}/{year}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {filterDeptId !== "ALL" 
                        ? `Đang lọc theo: ${roles?.find((r: any) => r.id === filterDeptId || r.code === filterDeptId)?.name} (${consolidatedData.length} báo cáo)`
                        : `Tổng cộng ${consolidatedData.length} báo cáo nộp trong tuần`
                      }
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b text-slate-600 font-extrabold uppercase">
                        <th className="p-3 text-center w-12">STT</th>
                        <th className="p-3 min-w-[150px]">Nhân sự / Tổ</th>
                        <th className="p-3 min-w-[140px]">Task chính</th>
                        <th className="p-3 min-w-[240px]">Nội dung công việc</th>
                        <th className="p-3 w-28">Tiến độ</th>
                        <th className="p-3 min-w-[180px]">Đề xuất giải pháp</th>
                        <th className="p-3 min-w-[180px]">Nhận xét QL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium">
                      {consolidatedData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            Chưa có báo cáo nào được nộp cho tuần này theo bộ lọc hiện tại!
                          </td>
                        </tr>
                      ) : (
                        consolidatedData.map((report: any, rIdx: number) => 
                          report.items.map((item: any, iIdx: number) => {
                            const prog = PROGRESS.find(p => p.value === item.progress) || PROGRESS[0]
                            return (
                              <tr key={`${report.id}_${item.id || iIdx}`} className="hover:bg-slate-50">
                                <td className="p-3 text-center text-slate-400 font-bold">{rIdx + 1}.{iIdx + 1}</td>
                                <td className="p-3 font-bold text-slate-800">
                                  <div>{report.user?.fullName}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">
                                    {report.user?.teacher?.departmentRel?.name || getRoleName(report.user?.role)}
                                  </div>
                                </td>
                                <td className="p-3 font-bold text-indigo-900">{item.mainTask}</td>
                                <td className="p-3 text-slate-700 leading-relaxed">{item.workContent}</td>
                                <td className="p-3">
                                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${prog.color}`}>
                                    {prog.label}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-500 italic">{item.proposedSolution || "-"}</td>
                                <td className="p-3 text-slate-700">{item.managerNote || report.managerComment || "-"}</td>
                              </tr>
                            )
                          })
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============ TAB: PERSONAL LẬP BÁO CÁO ============ */}
          {activeTab === "personal" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-[#48BFE3]" /> Nội dung Báo cáo Tuần {selectedWeek} (Tháng {month}/{year})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Người lập: <strong>{staffUsers.find((u: any) => u.id === (isManager ? viewUserId : currentUserId))?.fullName || currentUserName}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addRows(1)}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    <Plus className="w-4 h-4" /> Thêm dòng
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-[#48BFE3] hover:bg-[#007A72] text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu Báo Cáo"}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-600 font-extrabold uppercase">
                      <th className="p-3 text-center w-10">STT</th>
                      <th className="p-3 min-w-[160px]">Task chính</th>
                      <th className="p-3 min-w-[260px]">Nội dung công việc chi tiết</th>
                      <th className="p-3 w-36">Tiến độ</th>
                      <th className="p-3 min-w-[180px]">Đề xuất giải pháp (nếu có)</th>
                      <th className="p-3 text-center w-16">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.mainTask}
                            onChange={e => updateItem(idx, "mainTask", e.target.value)}
                            placeholder="Tên Task chính..."
                            className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#48BFE3] font-bold text-slate-800"
                          />
                        </td>
                        <td className="p-3">
                          <textarea
                            rows={2}
                            value={item.workContent}
                            onChange={e => updateItem(idx, "workContent", e.target.value)}
                            placeholder="Mô tả công việc thực hiện trong tuần..."
                            className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#48BFE3] text-slate-700"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={item.progress}
                            onChange={e => updateItem(idx, "progress", e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-white"
                          >
                            {PROGRESS.map(p => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.proposedSolution}
                            onChange={e => updateItem(idx, "proposedSolution", e.target.value)}
                            placeholder="Đề xuất giải pháp..."
                            className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#48BFE3] text-slate-600 italic"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => removeRow(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Xóa dòng này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {managerComment && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl">
                  <p className="text-xs font-bold text-teal-800 mb-1">💬 Nhận xét chỉ đạo của Ban Quản Lý (TBP / Trưởng Ban):</p>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{managerComment}</p>
                </div>
              )}
            </div>
          )}

          {/* ============ TAB: HISTORY ============ */}
          {activeTab === "history" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-[#48BFE3]" /> Lịch sử Báo cáo Tuần đã gửi
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tổng cộng {filteredHistory.length} báo cáo tuần đã lưu
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    placeholder="Tìm kiếm công việc, tuần..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#48BFE3]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-600 font-extrabold uppercase">
                      <th className="p-3 text-center w-12">STT</th>
                      <th className="p-3 min-w-[120px]">Thời gian</th>
                      <th className="p-3 min-w-[200px]">Task chính thực hiện</th>
                      <th className="p-3 w-28 text-center">Trạng thái</th>
                      <th className="p-3 min-w-[200px]">Nhận xét Ban Quản Lý</th>
                      <th className="p-3 text-center w-28">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium">
                    {filteredHistory.map((rpt, idx) => (
                      <tr key={rpt.id} className="hover:bg-slate-50">
                        <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-800">
                          Tuần {rpt.weekNumber} &bull; Tháng {rpt.month}/{rpt.year}
                        </td>
                        <td className="p-3 text-slate-700">
                          {rpt.items.map((i: any) => i.mainTask).filter(Boolean).join(", ") || "-"}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            rpt.status === "REVIEWED" ? "bg-purple-100 text-purple-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {rpt.status === "REVIEWED" ? "Đã duyệt" : "Đã nộp"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 italic">
                          {rpt.managerComment || "-"}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditPastReport(rpt)}
                              className="p-1.5 text-[#48BFE3] hover:bg-teal-50 rounded-lg"
                              title="Hiệu chỉnh báo cáo này"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {isManager && (
                              <button
                                onClick={() => handleDeleteReport(rpt.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                title="Xóa báo cáo này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
