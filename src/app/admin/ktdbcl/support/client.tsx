"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Building2, ChevronDown, Mail, Send, Sparkles, CheckSquare, Square, FileText, Users, Sliders, BarChart3, Plus, Search, Filter, Trash2, Edit, 
  Check, X, RefreshCw, Download, ChevronRight, AlertCircle, Calendar, GraduationCap, 
  MapPin, UserCheck, CheckCircle2, AlertTriangle, Info, Clock, UserPlus, LayoutDashboard, Bell
} from "lucide-react"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"
import { OverviewDashboard } from "./overview"

interface Props {
  academicYears: any[]
  campuses: any[]
  classes: any[]
  subjects: any[]
  teachers: any[]
  currentUser: any
  userRole: string
}

export function SupportClient({
  academicYears,
  campuses,
  classes,
  subjects,
  teachers,
  currentUser,
  userRole
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isGDCS = ["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes(userRole)
  const isKTDBCL = ["ADMIN", "KT_DBCL", "KTDBCL"].includes(userRole)

  // Local storage synchronized active year
  const [selectedYearId, setSelectedYearId] = useState(
    academicYears[0]?.id || ""
  )
  const [selectedCampusId, setSelectedCampusId] = useState(
    campuses[0]?.id || ""
  )

  // Tabs state
  const [activeTab, setActiveTab] = useState<"overview" | "academic" | "psychology" | "configs" | "reports" | "assignments" | "commitments">(
    "overview"
  )

  // Sub-tab state for reports
  const [reportSubTab, setReportSubTab] = useState<
    "student" | "grade" | "class" | "subject" | "teacher" | "campus" | "system"
  >("student")

  // Data states loaded dynamically
  const [configs, setConfigs] = useState<any[]>([])
    // Commitment candidates states
  const [commitmentCandidates, setCommitmentCandidates] = useState<any[]>([])
  const [commitmentLoading, setCommitmentLoading] = useState(false)
  const [commitmentSearch, setCommitmentSearch] = useState("")
  const [commitmentCampusFilter, setCommitmentCampusFilter] = useState("ALL")
  const [commitmentStatusFilter, setCommitmentStatusFilter] = useState("ALL")
  const [commitmentSubjectFilter, setCommitmentSubjectFilter] = useState("ALL")
  const [commitmentGradeFilter, setCommitmentGradeFilter] = useState("ALL")
  const [commitmentLevelFilter, setCommitmentLevelFilter] = useState("ALL")
  // Commitment multi-select states
  const [selectedCommitmentSubjects, setSelectedCommitmentSubjects] = useState<string[]>([])
  const [selectedCommitmentGrades, setSelectedCommitmentGrades] = useState<string[]>([])
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false)
  const [isGradeDropdownOpen, setIsGradeDropdownOpen] = useState(false)
  const [commitmentPage, setCommitmentPage] = useState(1)
  const commitmentPageSize = 10

  // TTCM Email Modal states
  const [isEmailTTCMModalOpen, setIsEmailTTCMModalOpen] = useState(false)
  const [emailTTCMSubject, setEmailTTCMSubject] = useState("ALL")
  const [ttcmList, setTtcmList] = useState<any[]>([])
  const [selectedTTCMIds, setSelectedTTCMIds] = useState<string[]>([])
  const [customTTCMMessage, setCustomTTCMMessage] = useState("")
  const [additionalTTCMCc, setAdditionalTTCMCc] = useState("")
  const [sendingTTCMEmall, setSendingTTCMEmall] = useState(false)
  // QLCM Email Modal states
  const [isEmailQLCMModalOpen, setIsEmailQLCMModalOpen] = useState(false)
  const [emailQLCMCampus, setEmailQLCMCampus] = useState("ALL")
  const [qlcmList, setQlcmList] = useState<any[]>([])
  const [selectedQLCMIds, setSelectedQLCMIds] = useState<string[]>([])
  const [customQLCMMessage, setCustomQLCMMessage] = useState("")
  const [additionalQLCMCc, setAdditionalQLCMCc] = useState("")
  const [sendingQLCMEmail, setSendingQLCMEmail] = useState(false)

  useEffect(() => {
    setCommitmentPage(1)
  }, [commitmentSearch, commitmentCampusFilter, commitmentStatusFilter, selectedCommitmentSubjects, selectedCommitmentGrades, commitmentLevelFilter])
  const [targets, setTargets] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Filtering states for targets tab
  const [targetTypeFilter, setTargetTypeFilter] = useState("ALL")
  const [targetSourceFilter, setTargetSourceFilter] = useState("TEACHER_ALL")
  const [targetStatusFilter, setTargetStatusFilter] = useState("ALL")
  const [targetSearch, setTargetSearch] = useState("")

  // Timeline Drawer state
  const [selectedTargetForTimeline, setSelectedTargetForTimeline] = useState<any>(null)
  const [selectedTargetForDetail, setSelectedTargetForDetail] = useState<any>(null)
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<any>(null)

  // Modal Open states
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [isAddTargetModalOpen, setIsAddTargetModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [isDuyetModalOpen, setIsDuyetModalOpen] = useState(false)

  // Sync Modal Form States
  const [syncClassId, setSyncClassId] = useState("")
  const [syncCandidates, setSyncCandidates] = useState<any[]>([])
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([])
  const [syncSubjectMap, setSyncSubjectMap] = useState<Record<string, string>>({})
  const [syncTeacherMap, setSyncTeacherMap] = useState<Record<string, string>>({})

  // Manual Target Form States
  const [newTargetStudentId, setNewTargetStudentId] = useState("")
  const [newTargetType, setNewTargetType] = useState("ACADEMIC")
  const [newTargetSource, setNewTargetSource] = useState("GVCN")
  const [newTargetReason, setNewTargetReason] = useState("")
  const [newTargetNotes, setNewTargetNotes] = useState("")
  const [newTargetStartDate, setNewTargetStartDate] = useState(
    new Date().toISOString().substring(0, 10)
  )

  // Assignment Form States
  const [assignTargetId, setAssignTargetId] = useState("")
  const [assignTeacherId, setAssignTeacherId] = useState("")
  const [assignSubjectId, setAssignSubjectId] = useState("")
  const [assignNotes, setAssignNotes] = useState("")
  const [selectedDuyetIds, setSelectedDuyetIds] = useState<string[]>([])
  const [isBulkApproveModalOpen, setIsBulkApproveModalOpen] = useState(false)

  // Outcome Config Form States
  const [configId, setConfigId] = useState("")
  const [configType, setConfigType] = useState("ACADEMIC")
  const [configCode, setConfigCode] = useState("")
  const [configLabel, setConfigLabel] = useState("")
  const [configDesc, setConfigDesc] = useState("")

  // Duyet Modal Form States
  const [duyetTargetId, setDuyetTargetId] = useState("")
  const [duyetOutcome, setDuyetOutcome] = useState("Hoàn thành bồi dưỡng")

  // Load configuration & targets on selectYearId change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedYear = localStorage.getItem("academicYearId")
      if (storedYear && academicYears.some(y => y.id === storedYear)) {
        setSelectedYearId(storedYear)
      }
    }
  }, [academicYears])

  const fetchAllData = async () => {
    if (!selectedYearId) return
    setLoading(true)
    try {
      // 1. Fetch outcome configs
      const resConfig = await fetch(
        `/api/ktdbcl/support?action=getConfigs&academicYearId=${selectedYearId}&_=${Date.now()}`
      )
      const dataConfig = await resConfig.json()
      if (!dataConfig.error) setConfigs(dataConfig)

      // 2. Fetch targets
      const resTargets = await fetch(
        `/api/ktdbcl/support?action=getTargets&academicYearId=${selectedYearId}&_=${Date.now()}`
      )
      const dataTargets = await resTargets.json()
      if (!dataTargets.error) setTargets(dataTargets)

      // 3. Fetch assignments
      const resAssignments = await fetch(
        `/api/ktdbcl/support?action=getAssignments&academicYearId=${selectedYearId}&_=${Date.now()}`
      )
      const dataAssignments = await resAssignments.json()
      if (!dataAssignments.error) setAssignments(dataAssignments)
    } catch (e: any) {
      toast.error("Không thể tải dữ liệu: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCommitmentCandidates = async () => {
    if (!selectedYearId) return
    setCommitmentLoading(true)
    try {
      const res = await fetch(
        `/api/ktdbcl/support?action=getCommitmentCandidates&academicYearId=${selectedYearId}&_=${Date.now()}`
      )
      const data = await res.json()
      if (data && !data.error) {
        setCommitmentCandidates(data)
      } else {
        toast.error("Không thể tải danh sách học sinh cam kết: " + (data.error || "Lỗi không xác định"))
      }
    } catch (e: any) {
      toast.error("Lỗi mạng: " + e.message)
    } finally {
      setCommitmentLoading(false)
    }
  }

    const fetchQLCMList = async () => {
    try {
      const res = await fetch(`/api/ktdbcl/support?action=getCommitmentQLCMList&academicYearId=${selectedYearId}&_=${Date.now()}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setQlcmList(data)
      }
    } catch (e) {
      console.error("Failed to load QLCM list", e)
    }
  }

    const handleSendQLCMCommitmentEmail = async () => {
    if (selectedQLCMIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một Quản lý Chuyên môn Cơ sở")
      return
    }

    const targetStudents = (emailQLCMCampus && emailQLCMCampus !== "ALL")
      ? filteredCommitments.filter(c => c.campusName?.includes(emailQLCMCampus) || (c.className && c.className.includes(emailQLCMCampus)))
      : filteredCommitments

    const finalStudents = targetStudents.length > 0 ? targetStudents : flattenedCommitments

    if (finalStudents.length === 0) {
      toast.error("Không có học sinh nào phù hợp cơ sở đã chọn")
      return
    }

    const chosenQLCM = qlcmList.filter(t => selectedQLCMIds.includes(t.id)).map(t => ({
      id: t.id,
      teacherName: t.teacherName,
      email: t.email,
      campusName: emailQLCMCampus !== "ALL" ? emailQLCMCampus : (t.campus?.campusName || "Cơ sở")
    }))

    const payloadStudents = finalStudents.map(item => {
      let scoreText = ""
      const isPri = (item.level === "Tiểu học") || /^[1-5][._\s]|lớp\s*[1-5]/i.test(item.className || "")
      const litName = isPri ? "Tiếng Việt" : "Ngữ Văn"

      if (item.committedSubject === "Toán" && item.mathScore !== null) {
        scoreText = `Toán: ${item.mathScore}`
      } else if ((item.committedSubject === "Tiếng Việt" || item.committedSubject === "Ngữ Văn") && item.literatureScore !== null) {
        scoreText = `${litName}: ${item.literatureScore}`
      } else if (item.committedSubject === "Tiếng Anh") {
        const parts = []
        if (item.writtenEnglishScore !== null) parts.push(`Viết: ${item.writtenEnglishScore}`)
        if (item.oralEnglishScore !== null) parts.push(`Nói: ${item.oralEnglishScore}`)
        scoreText = parts.length > 0 ? `Anh (${parts.join(", ")})` : ""
      } else if (item.committedSubject === "Tâm lý" && item.psychologyScore !== null) {
        scoreText = `Tâm lý: ${item.psychologyScore}`
      }

      return {
        fullName: item.fullName,
        studentCode: item.studentCode,
        level: item.level || (isPri ? "Tiểu học" : "Trung học"),
        grade: item.grade || ((item.className || "").match(/^(\d+)/) ? "Khối " + (item.className || "").match(/^(\d+)/)[1] : "-"),
        className: item.className || "-",
        campusName: item.campusName || "Sky-Line",
        subject: item.committedSubject,
        scores: scoreText,
        note: item.directorNote || item.admissionResult || "",
        isProposed: item.isProposed
      }
    })

    setSendingQLCMEmail(true)
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendCommitmentEmailToQLCM",
          academicYearId: selectedYearId,
          campusName: emailQLCMCampus,
          recipients: chosenQLCM,
          customMessage: customQLCMMessage,
          additionalCc: additionalQLCMCc,
          students: payloadStudents
        })
      })
      const data = await res.json()
      if (data.success && data.sentCount > 0) {
        toast.success(`Đã gửi thành công email cho ${data.sentCount} QLCM Cơ sở!`)
        setIsEmailQLCMModalOpen(false)
        setCustomQLCMMessage("")
        setAdditionalQLCMCc("")
      } else if (data.success && data.sentCount === 0) {
        toast.error("Không có email nào được gửi thành công. Vui lòng kiểm tra địa chỉ email người nhận.")
      } else {
        toast.error(data.error || "Gửi email thất bại")
      }
    } catch (e: any) {
      toast.error("Lỗi khi gửi email: " + e.message)
    } finally {
      setSendingQLCMEmail(false)
    }
  }

  const fetchTTCMList = async () => {
    try {
      const res = await fetch(`/api/ktdbcl/support?action=getCommitmentTTCMList&academicYearId=${selectedYearId}&_=${Date.now()}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setTtcmList(data)
      }
    } catch (e) {
      console.error("Failed to load TTCM list", e)
    }
  }

  useEffect(() => {
    if (activeTab === "commitments") {
      fetchTTCMList()
      fetchQLCMList()
    }
  }, [activeTab, selectedYearId])


  useEffect(() => {
    if (activeTab === "commitments") {
      fetchCommitmentCandidates()
    }
  }, [activeTab, selectedYearId])

  useEffect(() => {
    fetchAllData()
  }, [selectedYearId])

  // Local storage change listener
  useEffect(() => {
    const handleYearChange = () => {
      if (typeof window !== "undefined") {
        const storedYear = localStorage.getItem("academicYearId")
        if (storedYear && storedYear !== selectedYearId) {
          setSelectedYearId(storedYear)
        }
      }
    }
    window.addEventListener("academicYearChanged", handleYearChange)
    return () => window.removeEventListener("academicYearChanged", handleYearChange)
  }, [selectedYearId])

  // Get synchronized list of candidates when syncClassId changes
  const fetchSyncCandidates = async () => {
    if (!syncClassId) return
    try {
      const res = await fetch(
        `/api/ktdbcl/support?action=getClassSyncCandidates&classId=${syncClassId}&academicYearId=${selectedYearId}&_=${Date.now()}`
      )
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        setSyncCandidates(data)
        // Select all candidates by default
        setSelectedCandidateIds(data.map((c: any) => c.id))
      }
    } catch (e) {
      toast.error("Không thể tải danh sách học sinh khảo sát")
    }
  }

  useEffect(() => {
    fetchSyncCandidates()
  }, [syncClassId])

  // Save Outcome Config
  const handleSaveConfig = async () => {
    if (!configCode || !configLabel) {
      toast.error("Vui lòng điền mã và kết quả theo dõi")
      return
    }
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveConfig",
          academicYearId: selectedYearId,
          id: configId || undefined,
          supportType: configType,
          code: configCode.toUpperCase().trim(),
          outcomeLabel: configLabel.trim(),
          description: configDesc.trim()
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success("Đã lưu quy định kết quả!")
        setIsConfigModalOpen(false)
        fetchAllData()
      }
    } catch (e) {
      toast.error("Đã xảy ra lỗi khi lưu cấu hình")
    }
  }

  // Delete Outcome Config
  const handleDeleteConfig = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa quy định kết quả này?")) return
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteConfig", id, academicYearId: selectedYearId })
      })
      const data = await res.json()
      if (data.error) toast.error(data.error)
      else {
        toast.success("Đã xóa quy định kết quả")
        fetchAllData()
      }
    } catch (e) {
      toast.error("Lỗi xóa cấu hình")
    }
  }

  // Save Manual Target
  const handleSaveTarget = async () => {
    if (!newTargetStudentId) {
      toast.error("Vui lòng chọn học sinh")
      return
    }
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveTarget",
          academicYearId: selectedYearId,
          studentId: newTargetStudentId,
          supportType: newTargetType,
          sourceType: newTargetSource,
          reason: newTargetReason,
          notes: newTargetNotes,
          startDate: newTargetStartDate
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success("Đã thêm đối tượng hỗ trợ!")
        setIsAddTargetModalOpen(false)
        fetchAllData()
      }
    } catch (e) {
      toast.error("Lỗi thêm đối tượng hỗ trợ")
    }
  }

  // Delete Target
  const handleDeleteTarget = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa đối tượng hỗ trợ này?")) return
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteTarget", id, academicYearId: selectedYearId })
      })
      const data = await res.json()
      if (data.error) toast.error(data.error)
      else {
        toast.success("Đã xóa đối tượng hỗ trợ")
        fetchAllData()
      }
    } catch (e) {
      toast.error("Lỗi xóa đối tượng")
    }
  }

  // Bulk sync from Input Assessment
  const handleSyncAdmission = async () => {
    if (selectedCandidateIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một học sinh")
      return
    }

    const candsToSync: any[] = []
    for (const cid of selectedCandidateIds) {
      const cand = syncCandidates.find(c => c.id === cid)
      if (!cand) continue
      
      // If Math checked, sync Math
      if (cand.mathTarget) {
        candsToSync.push({
          studentId: cand.id,
          supportType: "ACADEMIC",
          reason: "Môn Toán (Cam kết Khảo sát đầu vào)",
          notes: cand.notes
        })
      }
      // If Lit checked, sync Lit
      if (cand.literatureTarget) {
        candsToSync.push({
          studentId: cand.id,
          supportType: "ACADEMIC",
          reason: "Môn Ngữ Văn (Cam kết Khảo sát đầu vào)",
          notes: cand.notes
        })
      }
      // If Eng checked, sync Eng
      if (cand.englishTarget) {
        candsToSync.push({
          studentId: cand.id,
          supportType: "ACADEMIC",
          reason: "Môn Tiếng Anh (Cam kết Khảo sát đầu vào)",
          notes: cand.notes
        })
      }
      // If Psychology checked
      if (cand.psychologyTarget) {
        candsToSync.push({
          studentId: cand.id,
          supportType: "PSYCHOLOGICAL",
          reason: "Hỗ trợ Tâm lý (Đề xuất Khảo sát đầu vào)",
          notes: cand.notes
        })
      }
    }

    if (candsToSync.length === 0) {
      toast.error("Không tìm thấy cam kết nào từ các học sinh đã chọn")
      return
    }

    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "syncAdmission",
          academicYearId: selectedYearId,
          candidates: candsToSync
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success(`Đã đồng bộ thành công ${data.count} đối tượng hỗ trợ!`)
        setIsSyncModalOpen(false)
        fetchAllData()
      }
    } catch (e) {
      toast.error("Lỗi đồng bộ dữ liệu")
    }
  }

  // Save Assignment
  const handleSaveAssignment = async () => {
    if (!assignTargetId || !assignTeacherId) {
      toast.error("Vui lòng chọn đối tượng và giáo viên phụ trách")
      return
    }
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveAssignment",
          academicYearId: selectedYearId,
          targetId: assignTargetId,
          teacherId: assignTeacherId,
          subjectId: assignSubjectId || null,
          notes: assignNotes
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success("Đã phân công giáo viên phụ trách!")
        setIsBulkApproveModalOpen(false)
        fetchAllData()
      }
    } catch (e) {
      toast.error("Lỗi lưu phân công")
    }
  }

  // Duyet De Xuat
  const handleBulkApprove = async (approve: boolean) => {
    if (selectedDuyetIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một học sinh")
      return
    }
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulkApproveTargets",
          academicYearId: selectedYearId,
          targetIds: selectedDuyetIds,
          approve
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success(approve ? "Đã duyệt đề xuất thành công!" : "Đã từ chối đề xuất thành công!")
        setIsAssignModalOpen(false)
        fetchAllData()
      }
    } catch (e) {
      toast.error("Lỗi xử lý")
    }
  }

  // Delete Assignment
  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phân công này?")) return
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteAssignment", id, academicYearId: selectedYearId })
      })
      const data = await res.json()
      if (data.error) toast.error(data.error)
      else {
        toast.success("Đã xóa phân công")
        fetchAllData()
      }
    } catch (e) {
      toast.error("Lỗi xóa phân công")
    }
  }

  // Approve termination (completion) of support
  const handleApproveTermination = async (id: string, approve: boolean) => {
    if (approve) {
      setDuyetTargetId(id)
      setDuyetOutcome("Đã tiến bộ vượt bậc, hoàn thành chương trình bồi dưỡng")
      setIsDuyetModalOpen(true)
    } else {
      if (!confirm("Từ chối kết thúc bồi dưỡng cho học sinh này?")) return
      try {
        const res = await fetch("/api/ktdbcl/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approveTermination",
            academicYearId: selectedYearId,
            id,
            approve: false
          })
        })
        const data = await res.json()
        if (data.error) toast.error(data.error)
        else {
          toast.success("Từ chối thành công")
          fetchAllData()
        }
      } catch (e) {
        toast.error("Lỗi xử lý")
      }
    }
  }

  const handleConfirmDuyet = async () => {
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approveTermination",
          academicYearId: selectedYearId,
          id: duyetTargetId,
          approve: true,
          outcome: duyetOutcome
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success("Đã duyệt kết thúc bồi dưỡng thành công!")
        setIsDuyetModalOpen(false)
        fetchAllData()
      }
    } catch (e) {
      toast.error("Lỗi phê duyệt")
    }
  }

  // Export Commitment candidates to Excel with full fields including Bậc Học and separate score columns
  const handleExportCommitmentsExcel = () => {
    if (filteredCommitments.length === 0) {
      toast.error("Không có dữ liệu học sinh cam kết để xuất Excel")
      return
    }

    const exportRows = filteredCommitments.map((row, idx) => {
      const isPrimary = /^[1-5][._\s]|lớp\s*[1-5]/i.test(row.className || "")
      const num = parseInt((row.grade || "").replace(/\D/g, ""), 10)
      let rowLevel = row.level
      if (!rowLevel) {
        if (num >= 1 && num <= 5) rowLevel = "Tiểu học"
        else if (num >= 6 && num <= 12) rowLevel = "Trung học"
        else if (row.grade === "Mầm non" || (row.className || "").includes("Mầm")) rowLevel = "Mầm non"
        else rowLevel = isPrimary ? "Tiểu học" : "Trung học"
      }
      const gradeStr = row.grade ? (row.grade.startsWith("Khối") ? row.grade : "Khối " + row.grade) : ((row.className || "").match(/^(\d+)/) ? "Khối " + (row.className || "").match(/^(\d+)/)[1] : (row.className?.includes("Mầm") ? "Mầm non" : "-"))
      const campusStr = row.campusName ? row.campusName : (row.className && row.className.includes("CS") ? "CS" + row.className.split("CS")[1].split(/[_ -]/)[0] : "CS1")

      const proposedDetails = row.allTargets && row.allTargets.length > 0 
        ? row.allTargets.map((st: any) => `${st.supportType === "ACADEMIC" ? "Phụ đạo" : "Tâm lý"} (${st.status || "Đang hỗ trợ"})`).join("; ")
        : ""

      return {
        "STT": idx + 1,
        "Họ tên": row.fullName || "",
        "Giới tính": row.gender || "",
        "Mã HS": row.studentCode || "",
        "Bậc học": rowLevel,
        "Khối": gradeStr,
        "Lớp": row.className || "",
        "Cơ sở": campusStr,
        "Môn Cam kết": row.committedSubject || "",
        "Tình trạng": row.isProposed ? "Đã đề xuất" : "Chưa đề xuất",
        "Điểm Toán": row.mathScore !== null && row.mathScore !== undefined ? row.mathScore : "",
        "Điểm Tiếng Việt / Ngữ Văn": row.literatureScore !== null && row.literatureScore !== undefined ? row.literatureScore : "",
        "Điểm Anh (Viết)": row.writtenEnglishScore !== null && row.writtenEnglishScore !== undefined ? row.writtenEnglishScore : "",
        "Điểm Anh (Nói)": row.oralEnglishScore !== null && row.oralEnglishScore !== undefined ? row.oralEnglishScore : "",
        "Điểm Tâm lý": row.psychologyScore !== null && row.psychologyScore !== undefined ? row.psychologyScore : "",
        "Kết quả Khảo sát & Ghi chú": row.directorNote || row.admissionResult || "",
        "Chi tiết đề xuất": proposedDetails
      }
    })

    const ws = XLSX.utils.json_to_sheet(exportRows)
    
    // Explicit standard column widths in characters (wch)
    ws['!cols'] = [
      { wch: 6 },   // STT
      { wch: 22 },  // Họ tên
      { wch: 10 },  // Giới tính
      { wch: 14 },  // Mã HS
      { wch: 12 },  // Bậc học
      { wch: 10 },  // Khối
      { wch: 12 },  // Lớp
      { wch: 10 },  // Cơ sở
      { wch: 16 },  // Môn Cam kết
      { wch: 15 },  // Tình trạng
      { wch: 12 },  // Điểm Toán
      { wch: 26 },  // Điểm Tiếng Việt / Ngữ Văn
      { wch: 18 },  // Điểm Anh (Viết)
      { wch: 18 },  // Điểm Anh (Nói)
      { wch: 14 },  // Điểm Tâm lý
      { wch: 55 },  // Kết quả Khảo sát & Ghi chú
      { wch: 35 },  // Chi tiết đề xuất
    ]
    ws['!views'] = [{ topLeftCell: 'A1', activeCell: 'A1', state: 'normal' }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Cam_Ket")

    const yearName = academicYears.find(y => y.id === selectedYearId)?.name || "NamHoc"
    XLSX.writeFile(wb, `Danh_Sach_HS_Cam_Ket_${yearName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success(`Đã xuất thành công ${exportRows.length} lượt cam kết ra file Excel!`)
  }

  // Export Academic / Psychology targets to Excel
  const handleExportTargetsExcel = (type?: string) => {
    const list = filteredTargets.filter((t: any) => !type || type === "ALL" || t.supportType === type)
    if (list.length === 0) {
      toast.error("Không có dữ liệu để xuất Excel")
      return
    }

    const exportRows = list.map((t: any, idx: number) => {
      const cls = t.student?.class
      const num = parseInt((cls?.grade || "").replace(/\D/g, ""), 10)
      let rowLevel = cls?.level
      if (!rowLevel) {
        if (num >= 1 && num <= 5) rowLevel = "Tiểu học"
        else if (num >= 6 && num <= 12) rowLevel = "Trung học"
        else if (cls?.grade === "Mầm non" || (cls?.className || "").includes("Mầm")) rowLevel = "Mầm non"
        else rowLevel = "Tiểu học"
      }
      const assignedTeachers = t.assignments?.map((a: any) => `${a.teacher?.teacherName || ""} (${a.subject?.subjectName || ""})`).filter(Boolean).join("; ") || "Chưa phân công"

      return {
        "STT": idx + 1,
        "Mã HS": t.student?.studentCode || "",
        "Họ tên": t.student?.studentName || "",
        "Bậc học": rowLevel,
        "Khối": cls?.grade ? (cls.grade.startsWith("Khối") ? cls.grade : "Khối " + cls.grade) : "-",
        "Lớp": cls?.className || "",
        "Cơ sở": cls?.campus?.campusName || "",
        "Loại hỗ trợ": t.supportType === "ACADEMIC" ? "Bồi dưỡng học tập" : "Hỗ trợ Tâm lý",
        "Nguồn đề xuất": t.sourceType === "GVCN" || t.sourceType === "TAM_LY" ? "GV Chủ nhiệm" : t.sourceType === "GVBM" ? "GV Bộ môn" : "Khảo sát đầu vào",
        "Chương trình / Lý do": t.reason || "",
        "Cam kết đầu vào": t.commitmentNote || "",
        "Giáo viên phụ trách": assignedTeachers,
        "Thời gian bắt đầu": t.startDate ? new Date(t.startDate).toLocaleDateString("vi-VN") : "",
        "Thời gian kết thúc": t.endDate ? new Date(t.endDate).toLocaleDateString("vi-VN") : "Đang theo dõi",
        "Trạng thái": t.terminationStatus === "TERMINATED" ? (t.outcome || "Đã kết thúc") : t.status,
        "Ghi chú": t.notes || ""
      }
    })

    const ws = XLSX.utils.json_to_sheet(exportRows)
    ws['!cols'] = [
      { wch: 6 },   // STT
      { wch: 14 },  // Mã HS
      { wch: 22 },  // Họ tên
      { wch: 12 },  // Bậc học
      { wch: 10 },  // Khối
      { wch: 12 },  // Lớp
      { wch: 10 },  // Cơ sở
      { wch: 18 },  // Loại hỗ trợ
      { wch: 18 },  // Nguồn đề xuất
      { wch: 28 },  // Chương trình / Lý do
      { wch: 22 },  // Cam kết đầu vào
      { wch: 30 },  // Giáo viên phụ trách
      { wch: 16 },  // Thời gian bắt đầu
      { wch: 16 },  // Thời gian kết thúc
      { wch: 18 },  // Trạng thái
      { wch: 30 },  // Ghi chú
    ]
    ws['!views'] = [{ topLeftCell: 'A1', activeCell: 'A1', state: 'normal' }]

    const wb = XLSX.utils.book_new()
    const sheetName = type === "PSYCHOLOGICAL" ? "Ho_Tro_Tam_Ly" : type === "ACADEMIC" ? "Boi_Duong_Hoc_Tap" : "Danh_Sach_Ho_Tro"
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    const yearName = academicYears.find(y => y.id === selectedYearId)?.name || "NamHoc"
    XLSX.writeFile(wb, `${sheetName}_${yearName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success(`Đã xuất thành công ${exportRows.length} hồ sơ ra file Excel!`)
  }

  // Export reports to Excel logic based on active subtab
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()
    const yearName = academicYears.find(y => y.id === selectedYearId)?.name || "NamHoc"

    if (reportSubTab === "student") {
      if (!targets || targets.length === 0) {
        toast.error("Không có dữ liệu để xuất Excel")
        return
      }
      const exportRows = targets.map((t: any, idx: number) => {
        const cls = t.student?.class
        const num = parseInt((cls?.grade || "").replace(/\D/g, ""), 10)
        let rowLevel = cls?.level
        if (!rowLevel) {
          if (num >= 1 && num <= 5) rowLevel = "Tiểu học"
          else if (num >= 6 && num <= 12) rowLevel = "Trung học"
          else if (cls?.grade === "Mầm non" || (cls?.className || "").includes("Mầm")) rowLevel = "Mầm non"
          else rowLevel = "Tiểu học"
        }
        return {
          "STT": idx + 1,
          "Mã HS": t.student?.studentCode || "",
          "Họ tên": t.student?.studentName || "",
          "Bậc học": rowLevel,
          "Lớp": cls?.className || "",
          "Cơ sở": cls?.campus?.campusName || "",
          "Loại hỗ trợ": t.supportType === "ACADEMIC" ? "Bồi dưỡng học tập" : "Hỗ trợ Tâm lý",
          "Chương trình / Lý do": t.reason || "",
          "Thời gian bắt đầu": t.startDate ? new Date(t.startDate).toLocaleDateString("vi-VN") : "",
          "Thời gian kết thúc": t.endDate ? new Date(t.endDate).toLocaleDateString("vi-VN") : "Đang theo dõi",
          "Mức tiến bộ / Kết quả": t.terminationStatus === "TERMINATED" ? (t.outcome || "Đã kết thúc") : t.status
        }
      })
      const ws = XLSX.utils.json_to_sheet(exportRows)
      ws['!views'] = [{ topLeftCell: 'A1', activeCell: 'A1', state: 'normal' }]
      XLSX.utils.book_append_sheet(wb, ws, "Theo_Hoc_Sinh")
      XLSX.writeFile(wb, `Bao_Cao_Theo_Hoc_Sinh_${yearName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } else if (reportSubTab === "grade") {
      const exportRows = gradeStats.filter((g: any) => g.totalCount > 0).map((g: any, idx: number) => ({
        "STT": idx + 1,
        "Tên Khối": g.name,
        "Tổng số HS bồi dưỡng": g.totalCount,
        "Học tập (Môn học)": g.academicCount,
        "Hỗ trợ Tâm lý": g.psychologyCount,
        "Chờ duyệt": g.pendingCount,
        "Đang bồi dưỡng": g.approvedCount,
        "Chờ kết thúc": g.pendingTerminationCount,
        "Đã kết thúc": g.terminatedCount
      }))
      const ws = XLSX.utils.json_to_sheet(exportRows)
      ws['!views'] = [{ topLeftCell: 'A1', activeCell: 'A1', state: 'normal' }]
      XLSX.utils.book_append_sheet(wb, ws, "Theo_Khoi")
      XLSX.writeFile(wb, `Bao_Cao_Theo_Khoi_${yearName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } else if (reportSubTab === "class") {
      const exportRows = classStats.filter((c: any) => c.totalCount > 0).map((c: any, idx: number) => ({
        "STT": idx + 1,
        "Tên lớp": c.name,
        "Tổng số HS": c.totalCount,
        "Hỗ trợ Văn hóa (Môn)": c.academicCount,
        "Hỗ trợ Tâm lý": c.psychologyCount,
        "Chờ duyệt": c.pendingCount,
        "Đang bồi dưỡng": c.approvedCount,
        "Chờ kết thúc": c.pendingTerminationCount,
        "Đã kết thúc": c.terminatedCount
      }))
      const ws = XLSX.utils.json_to_sheet(exportRows)
      ws['!views'] = [{ topLeftCell: 'A1', activeCell: 'A1', state: 'normal' }]
      XLSX.utils.book_append_sheet(wb, ws, "Theo_Lop")
      XLSX.writeFile(wb, `Bao_Cao_Theo_Lop_${yearName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } else {
      // General report
      const exportRows = targets.map((t: any, idx: number) => ({
        "STT": idx + 1,
        "Mã HS": t.student?.studentCode || "",
        "Họ tên": t.student?.studentName || "",
        "Lớp": t.student?.class?.className || "",
        "Cơ sở": t.student?.class?.campus?.campusName || "",
        "Chương trình / Lý do": t.reason || "",
        "Trạng thái": t.status
      }))
      const ws = XLSX.utils.json_to_sheet(exportRows)
      ws['!views'] = [{ topLeftCell: 'A1', activeCell: 'A1', state: 'normal' }]
      XLSX.utils.book_append_sheet(wb, ws, "Bao_Cao")
      XLSX.writeFile(wb, `Bao_Cao_Tong_Hop_${yearName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    toast.success("Đã xuất báo cáo Excel thành công!")
  }

  // Count pending targets requiring review/approval for Academic and Psychology
  const academicPendingCount = useMemo(() => {
    return targets.filter((t: any) => 
      t.supportType === "ACADEMIC" && (
        (t.terminationStatus === "ACTIVE" && (!t.assignments || t.assignments.length === 0)) ||
        t.terminationStatus === "PENDING_TERMINATION"
      )
    ).length
  }, [targets])

  const psychologyPendingCount = useMemo(() => {
    return targets.filter((t: any) => 
      t.supportType === "PSYCHOLOGICAL" && (
        (t.terminationStatus === "ACTIVE" && (!t.assignments || t.assignments.length === 0)) ||
        t.terminationStatus === "PENDING_TERMINATION"
      )
    ).length
  }, [targets])

  // Helper selectors
  const allStudents = classes.flatMap(c => c.students || [])

  // Filtering targets lists
  const filteredTargets = targets.filter(t => {
    const matchesType = targetTypeFilter === "ALL" || t.supportType === targetTypeFilter
    const matchesSource = targetSourceFilter === "ALL" || 
      (targetSourceFilter === "TEACHER_ALL" && (t.sourceType === "GVCN" || t.sourceType === "GVBM" || t.sourceType === "TAM_LY")) ||
      (targetSourceFilter === "GVCN" && (t.sourceType === "GVCN" || t.sourceType === "TAM_LY")) ||
      t.sourceType === targetSourceFilter
    const matchesStatus = targetStatusFilter === "ALL" || 
      (targetStatusFilter === "TERMINATED" && t.terminationStatus === "TERMINATED") ||
      (targetStatusFilter === "ACTIVE" && t.terminationStatus === "ACTIVE" && t.assignments && t.assignments.length > 0) ||
      (targetStatusFilter === "PENDING" && t.terminationStatus === "PENDING_TERMINATION") ||
      (targetStatusFilter === "UNAPPROVED" && t.terminationStatus === "ACTIVE" && (!t.assignments || t.assignments.length === 0))

    const name = t.student?.studentName || ""
    const code = t.student?.studentCode || ""
    const matchesSearch = targetSearch === "" || 
      name.toLowerCase().includes(targetSearch.toLowerCase()) ||
      code.toLowerCase().includes(targetSearch.toLowerCase())

    return matchesType && matchesSource && matchesStatus && matchesSearch
  })

  // Group targets by teacher (createdBy) and filter by activeTab if applicable
  const groupedTargets = filteredTargets
    .filter((t: any) => {
      if (activeTab === "academic") return t.supportType === "ACADEMIC"
      if (activeTab === "psychology") return t.supportType === "PSYCHOLOGICAL"
      return true
    })
    .reduce((acc: any[], target: any) => {
      const teacherId = target.createdBy?.id || "SYSTEM"
      const teacherName = target.createdBy?.teacherName || "Hệ thống"
      
      let group = acc.find(g => g.teacherId === teacherId)
      if (!group) {
        group = {
          teacherId,
          teacherName,
          targets: [],
          academicCount: 0,
          psychologyCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          terminatedCount: 0,
          pendingTerminationCount: 0,
        }
        acc.push(group)
      }
      
      group.targets.push(target)
      
      if (target.supportType === "ACADEMIC") {
        group.academicCount++
      } else {
        group.psychologyCount++
      }
      
      const isUnapproved = (!target.assignments || target.assignments.length === 0) && target.status !== "ĐÃ DUYỆT"
      if (target.terminationStatus === "TERMINATED") {
        group.terminatedCount++
      } else if (target.terminationStatus === "PENDING_TERMINATION") {
        group.pendingTerminationCount++
      } else if (isUnapproved) {
        group.pendingCount++
      } else {
        group.approvedCount++
      }
      
      return acc
    }, [])

  // Grouping classes by grade for Grade Report
  const gradeStats = classes.reduce((acc: any[], c: any) => {
    const gradeName = c.grade ? `Khối ${c.grade}` : (parseInt(c.className) ? `Khối ${parseInt(c.className)}` : "Khác")
    let gradeGroup = acc.find(g => g.name === gradeName)
    if (!gradeGroup) {
      gradeGroup = {
        name: gradeName,
        academicCount: 0,
        psychologyCount: 0,
        pendingCount: 0,
        approvedCount: 0,
        terminatedCount: 0,
        pendingTerminationCount: 0,
        totalCount: 0,
      }
      acc.push(gradeGroup)
    }
    
    // Find targets for students in this class
    const classTargets = targets.filter(t => t.student?.classId === c.id)
    classTargets.forEach(t => {
      gradeGroup.totalCount++
      if (t.supportType === "ACADEMIC") {
        gradeGroup.academicCount++
      } else {
        gradeGroup.psychologyCount++
      }
      
      const isUnapproved = (!t.assignments || t.assignments.length === 0) && t.status !== "ĐÃ DUYỆT"
      if (t.terminationStatus === "TERMINATED") {
        gradeGroup.terminatedCount++
      } else if (t.terminationStatus === "PENDING_TERMINATION") {
        gradeGroup.pendingTerminationCount++
      } else if (isUnapproved) {
        gradeGroup.pendingCount++
      } else {
        gradeGroup.approvedCount++
      }
    })
    
    return acc
  }, [])
  
  // Sort gradeStats logically
  gradeStats.sort((a: any, b: any) => {
    const numA = parseInt(a.name.replace(/\D/g, "")) || 99
    const numB = parseInt(b.name.replace(/\D/g, "")) || 99
    return numA - numB
  })

  // Calculate monthly evaluations for progress chart
  const allEvaluations = targets.flatMap((t: any) => 
    (t.evaluations || []).map((ev: any) => ({
      ...ev,
      target: t
    }))
  )

  const evalByMonth = allEvaluations.reduce((acc: any, ev: any) => {
    const date = new Date(ev.createdAt)
    const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
    
    if (!acc[monthYear]) {
      acc[monthYear] = {
        month: monthYear,
        good: 0,
        average: 0,
        weak: 0,
        total: 0
      }
    }
    
    const level = ev.trackingLevel?.toLowerCase() || ""
    if (
      level.includes("tốt") || 
      level.includes("đạt") || 
      level.includes("tiến bộ tốt") || 
      level.includes("giỏi") || 
      level.includes("good") || 
      level.includes("excellent")
    ) {
      acc[monthYear].good++
    } else if (
      level.includes("trung bình") || 
      level.includes("cần cố gắng") || 
      level.includes("khá") || 
      level.includes("tb") || 
      level.includes("average") || 
      level.includes("medium")
    ) {
      acc[monthYear].average++
    } else {
      acc[monthYear].weak++
    }
    
    acc[monthYear].total++
    return acc
  }, {})
  
  // Sort monthly data chronologically
  const sortedMonths = Object.keys(evalByMonth).sort((a: any, b: any) => {
    const [mA, yA] = a.split("/").map(Number)
    const [mB, yB] = b.split("/").map(Number)
    return yA === yB ? mA - mB : yA - yB
  }).map(key => ({
    month: `Tháng ${key}`,
    ...evalByMonth[key]
  }))

  const hasRealData = sortedMonths.length > 0
  const chartData = hasRealData ? sortedMonths : [
    { month: "Tháng 03/2026", good: 5, average: 3, weak: 2, total: 10 },
    { month: "Tháng 04/2026", good: 8, average: 5, weak: 1, total: 14 },
    { month: "Tháng 05/2026", good: 14, average: 4, weak: 2, total: 20 },
    { month: "Tháng 06/2026", good: 19, average: 6, weak: 1, total: 26 },
  ]
      // Tách học sinh theo từng môn cam kết (Flattened commitment list)
  const flattenedCommitments = useMemo(() => {
    const list: any[] = []
    commitmentCandidates.forEach((c) => {
      // Loại bỏ hoàn toàn các học sinh chưa xếp lớp
      const cName = (c.className || "").trim().toLowerCase()
      if (!cName || cName === "chưa xếp lớp" || cName.includes("chưa xếp") || cName === "null" || cName === "undefined") {
        return
      }

      const isPrimary = /^[1-5][._\s]|lớp\s*[1-5]/i.test(c.className || "")
      const rawSubs = (c.committedSubjects && c.committedSubjects.length > 0) ? c.committedSubjects : []
      const unifiedSubs: string[] = []
      
      rawSubs.forEach((s: string) => {
        const lower = s.toLowerCase()
        if (lower.includes("anh") || lower.includes("english") || lower.includes("esl")) {
          if (!unifiedSubs.includes("Tiếng Anh")) unifiedSubs.push("Tiếng Anh")
        } else if (lower.includes("toán") || lower.includes("math")) {
          if (!unifiedSubs.includes("Toán")) unifiedSubs.push("Toán")
        } else if (lower.includes("tiếng việt") || lower.includes("tieng viet") || lower === "tv") {
          if (!unifiedSubs.includes("Tiếng Việt")) unifiedSubs.push("Tiếng Việt")
        } else if (lower.includes("ngữ văn") || lower.includes("ngu van") || lower.includes("literature") || lower === "văn" || lower.includes("văn")) {
          const correctSub = isPrimary ? "Tiếng Việt" : "Ngữ Văn"
          if (!unifiedSubs.includes(correctSub)) unifiedSubs.push(correctSub)
        } else if (lower.includes("tâm lý") || lower.includes("tam ly") || lower.includes("psychology")) {
          if (!unifiedSubs.includes("Tâm lý")) unifiedSubs.push("Tâm lý")
        } else {
          if (!unifiedSubs.includes(s)) unifiedSubs.push(s)
        }
      })

      const finalSubs = unifiedSubs.length > 0 ? unifiedSubs : ["Chưa xác định môn"]

      finalSubs.forEach((subName, subIdx) => {
        const isPsychology = subName.toLowerCase().includes("lý") || subName.toLowerCase().includes("tâm")
        const matchingTargets = targets.filter(t => t.studentId === c.systemStudentId)
        
        const specificTarget = matchingTargets.find(t => {
          if (isPsychology) return t.supportType === "PSYCHOLOGY" || t.supportType === "PSYCHOLOGICAL"
          const hasSubjectAssignment = t.assignments?.some((a: any) => {
            const aSub = (a.subject?.subjectName || "").toLowerCase()
            const sSub = subName.toLowerCase()
            return aSub.includes(sSub) || sSub.includes(aSub) || (subName === "Tiếng Anh" && aSub.includes("anh"))
          })
          return hasSubjectAssignment || t.supportType === "ACADEMIC"
        })

        const isProposed = !!specificTarget || matchingTargets.length > 0

        list.push({
          ...c,
          uniqueKey: `${c.id}_${subName}_${subIdx}`,
          committedSubject: subName,
          isProposed,
          specificTarget,
          allTargets: matchingTargets
        })
      })
    })
    return list
  }, [commitmentCandidates, targets])

  // Dynamic Subject Counts
  const commitmentSubjectCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    flattenedCommitments.forEach(item => {
      const s = item.committedSubject || "Khác"
      counts[s] = (counts[s] || 0) + 1
    })
    return counts
  }, [flattenedCommitments])

  const uniqueCommitmentSubjects = useMemo(() => {
    return Object.keys(commitmentSubjectCounts).sort((a, b) => {
      // Prioritize common subjects
      const order = ["Tiếng Anh", "Toán", "Tiếng Việt", "Ngữ Văn", "Tâm lý"]
      const idxA = order.indexOf(a)
      const idxB = order.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.localeCompare(b)
    })
  }, [commitmentSubjectCounts])

      // Dynamic Level Counts
  const commitmentLevelCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    flattenedCommitments.forEach(item => {
      const num = parseInt((item.grade || "").replace(/\D/g, ""), 10)
      let lvl = item.level
      if (!lvl) {
        if (num >= 1 && num <= 5) lvl = "Tiểu học"
        else if (num >= 6 && num <= 12) lvl = "Trung học"
        else if (item.grade === "Mầm non" || (item.className || "").includes("Mầm")) lvl = "Mầm non"
        else lvl = "Tiểu học"
      }
      counts[lvl] = (counts[lvl] || 0) + 1
    })
    return counts
  }, [flattenedCommitments])

  const uniqueCommitmentLevels = useMemo(() => {
    const order = ["Tiểu học", "Trung học", "Mầm non"]
    return Object.keys(commitmentLevelCounts).sort((a, b) => {
      const idxA = order.indexOf(a)
      const idxB = order.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.localeCompare(b)
    })
  }, [commitmentLevelCounts])

  // Dynamic Grade Counts
  const commitmentGradeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    flattenedCommitments.forEach(item => {
      const g = item.grade ? (item.grade.startsWith("Khối") ? item.grade : "Khối " + item.grade) : ((item.className || "").match(/^(\d+)/) ? "Khối " + (item.className || "").match(/^(\d+)/)[1] : (item.className?.includes("Mầm") ? "Mầm non" : "Khác"))
      counts[g] = (counts[g] || 0) + 1
    })
    return counts
  }, [flattenedCommitments])

  const uniqueCommitmentGrades = useMemo(() => {
    return Object.keys(commitmentGradeCounts).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10) || 99
      const numB = parseInt(b.replace(/\D/g, ""), 10) || 99
      return numA - numB
    })
  }, [commitmentGradeCounts])

    // Paginated commitments logic
  const filteredCommitments = useMemo(() => {
    return flattenedCommitments.filter(c => {
      const searchLower = commitmentSearch.toLowerCase().trim()
      const matchesSearch = !searchLower || 
        (c.studentCode && c.studentCode.toLowerCase().includes(searchLower)) ||
        (c.fullName && c.fullName.toLowerCase().includes(searchLower))

      const matchesCampus = commitmentCampusFilter === "ALL" || 
        (c.className && c.className.includes(commitmentCampusFilter)) || 
        (c.campusName && c.campusName.includes(commitmentCampusFilter)) ||
        (c.directorNote || "").includes(commitmentCampusFilter) ||
        (c.admissionResult || "").includes(commitmentCampusFilter)

      const matchesStatus = commitmentStatusFilter === "ALL" || 
        (commitmentStatusFilter === "PROPOSED" && c.isProposed) ||
        (commitmentStatusFilter === "NOT_PROPOSED" && !c.isProposed)

      // Multi-subject matching
      const matchesSubject = selectedCommitmentSubjects.length === 0 || 
        selectedCommitmentSubjects.includes(c.committedSubject) ||
        (selectedCommitmentSubjects.includes("Tiếng Anh") && c.committedSubject?.includes("Anh"))

      const num = parseInt((c.grade || "").replace(/\D/g, ""), 10)
      let rowLevel = c.level
      if (!rowLevel) {
        if (num >= 1 && num <= 5) rowLevel = "Tiểu học"
        else if (num >= 6 && num <= 12) rowLevel = "Trung học"
        else if (c.grade === "Mầm non" || (c.className || "").includes("Mầm")) rowLevel = "Mầm non"
        else rowLevel = "Tiểu học"
      }
      const matchesLevel = commitmentLevelFilter === "ALL" || rowLevel === commitmentLevelFilter

      const rowGrade = c.grade ? (c.grade.startsWith("Khối") ? c.grade : "Khối " + c.grade) : ((c.className || "").match(/^(\d+)/) ? "Khối " + (c.className || "").match(/^(\d+)/)[1] : (c.className?.includes("Mầm") ? "Mầm non" : "Khác"))
      
      // Multi-grade matching
      const matchesGrade = selectedCommitmentGrades.length === 0 || selectedCommitmentGrades.includes(rowGrade)

      return matchesSearch && matchesCampus && matchesStatus && matchesSubject && matchesGrade && matchesLevel
    })
  }, [flattenedCommitments, commitmentSearch, commitmentCampusFilter, commitmentStatusFilter, selectedCommitmentSubjects, selectedCommitmentGrades, commitmentLevelFilter])

  const totalCommitmentPages = Math.ceil(filteredCommitments.length / commitmentPageSize) || 1

  const paginatedCommitments = useMemo(() => {
    const startIndex = (commitmentPage - 1) * commitmentPageSize
    return filteredCommitments.slice(startIndex, startIndex + commitmentPageSize)
  }, [filteredCommitments, commitmentPage])

    const getSubjectBadge = (subName: string) => {
    const nameLower = (subName || "").toLowerCase()
    if (nameLower.includes("toán") || nameLower.includes("math")) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 font-bold text-[11px] inline-block">
          Toán
        </span>
      )
    }
    if (nameLower.includes("ngữ văn") || nameLower.includes("ngu van") || nameLower === "văn" || nameLower.includes("literature")) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 border border-teal-200/60 font-bold text-[11px] inline-block">
          Ngữ Văn
        </span>
      )
    }
    if (nameLower.includes("tiếng việt") || nameLower.includes("tieng viet") || nameLower === "tv" || nameLower.includes("viet")) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold text-[11px] inline-block">
          Tiếng Việt
        </span>
      )
    }
    if (nameLower.includes("anh") || nameLower.includes("english") || nameLower.includes("esl")) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 font-bold text-[11px] inline-block">
          Tiếng Anh
        </span>
      )
    }
    if (nameLower.includes("lý") || nameLower.includes("tâm") || nameLower.includes("psychology")) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 font-bold text-[11px] inline-block">
          Tâm lý
        </span>
      )
    }
    return (
      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 font-bold text-[11px] inline-block">
        {subName}
      </span>
    )
  }

  const getScoreTag = (label: string, val: number | null) => {
    if (val === null) return null
    let colorClass = "bg-slate-55 text-slate-600 border-slate-200"
    if (val >= 8) colorClass = "bg-emerald-55 text-emerald-700 border-emerald-200/60"
    else if (val >= 5) colorClass = "bg-blue-55 text-blue-700 border-blue-200/60"
    else colorClass = "bg-rose-55 text-rose-700 border-rose-200/60"
    
    return (
      <span className={`px-2 py-0.5 rounded-md border font-black text-[9px] ${colorClass}`}>
        {label}: {val}
      </span>
    )
  }

  // Send Commitment Email to TTCM
  const handleSendCommitmentEmail = async () => {
    if (selectedTTCMIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một Tổ trưởng chuyên môn (TTCM)")
      return
    }

    const selectedTeachers = ttcmList.filter(t => selectedTTCMIds.includes(t.id))
    if (selectedTeachers.length === 0) {
      toast.error("Không tìm thấy thông tin giáo viên đã chọn")
      return
    }

    // Filter relevant students for the email
    const studentsToSend = filteredCommitments.map(item => {
      let scoreText = ""
      if (item.committedSubject === "Toán" && item.mathScore !== null) scoreText = `Toán: ${item.mathScore}`
      else if (item.committedSubject === "Tiếng Anh") {
        const parts: string[] = []
        if (item.writtenEnglishScore !== null) parts.push(`Anh viết: ${item.writtenEnglishScore}`)
        if (item.oralEnglishScore !== null) parts.push(`Anh nói: ${item.oralEnglishScore}`)
        scoreText = parts.join(", ")
      } else if ((item.committedSubject === "Tiếng Việt" || item.committedSubject === "Ngữ Văn") && item.literatureScore !== null) {
        scoreText = `Văn/TV: ${item.literatureScore}`
      } else if (item.committedSubject === "Tâm lý" && item.psychologyScore !== null) {
        scoreText = `Tâm lý: ${item.psychologyScore}`
      }

      return {
        fullName: item.fullName,
        studentCode: item.studentCode,
        grade: item.grade || ((item.className || "").match(/^(\d+)/) ? "Khối " + (item.className || "").match(/^(\d+)/)[1] : "-"),
        className: item.className || "-",
        campusName: item.campusName || "Sky-Line",
        subject: item.committedSubject,
        scores: scoreText,
        note: item.directorNote || item.admissionResult || "",
        isProposed: item.isProposed
      }
    })

    if (studentsToSend.length === 0) {
      toast.error("Danh sách học sinh cam kết đang trống")
      return
    }

    setSendingTTCMEmall(true)
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendCommitmentEmailToTTCM",
          academicYearId: selectedYearId,
          subjectName: emailTTCMSubject === "ALL" ? "Tất cả các môn" : emailTTCMSubject,
          recipients: selectedTeachers.map(t => ({
            teacherId: t.id,
            teacherName: t.teacherName,
            email: t.email,
            subjectName: emailTTCMSubject === "ALL" ? (t.mainSubjectRel?.subjectName || t.departmentRel?.name || "Tất cả") : emailTTCMSubject,
            campusName: t.campus?.campusName || ""
          })),
          customMessage: customTTCMMessage,
          additionalCc: additionalTTCMCc,
          students: studentsToSend
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`Đã gửi thành công email cho ${data.sentCount} TTCM!`)
        setIsEmailTTCMModalOpen(false)
        setCustomTTCMMessage("")
        setAdditionalTTCMCc("")
      } else {
        toast.error(data.error || "Không thể gửi email")
      }
    } catch (e: any) {
      toast.error("Lỗi khi gửi email: " + e.message)
    } finally {
      setSendingTTCMEmall(false)
    }
  }

  // Auto-select TTCMs when email subject changes
  useEffect(() => {
    if (!isEmailTTCMModalOpen || ttcmList.length === 0) return

    if (emailTTCMSubject === "ALL") {
      setSelectedTTCMIds(ttcmList.map(t => t.id))
    } else {
      const matched = ttcmList.filter(t => {
        const subLower = emailTTCMSubject.toLowerCase()
        const mainSub = (t.mainSubjectRel?.subjectName || "").toLowerCase()
        const deptName = (t.departmentRel?.name || "").toLowerCase()
        const assignedDepts = (t.departmentAssignments || []).map((da: any) => (da.department?.name || "").toLowerCase()).join(" ")

        if (subLower.includes("anh")) {
          return mainSub.includes("anh") || deptName.includes("anh") || deptName.includes("ngoại ngữ") || assignedDepts.includes("anh") || assignedDepts.includes("ngoại ngữ")
        }
        if (subLower.includes("toán")) {
          return mainSub.includes("toán") || deptName.includes("toán") || assignedDepts.includes("toán")
        }
        if (subLower.includes("việt") || subLower.includes("văn")) {
          return mainSub.includes("văn") || mainSub.includes("việt") || deptName.includes("văn") || deptName.includes("việt") || deptName.includes("tiểu học") || assignedDepts.includes("văn")
        }
        if (subLower.includes("lý") || subLower.includes("tâm")) {
          return mainSub.includes("tâm lý") || deptName.includes("tâm lý") || deptName.includes("hỗ trợ") || assignedDepts.includes("tâm lý")
        }
        return mainSub.includes(subLower) || deptName.includes(subLower)
      })
      setSelectedTTCMIds(matched.length > 0 ? matched.map(m => m.id) : ttcmList.slice(0, 1).map(m => m.id))
    }
  }, [emailTTCMSubject, isEmailTTCMModalOpen, ttcmList])


  return (
    <div className="space-y-6">
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="h-9 w-9 text-indigo-600" />
            Hỗ trợ học tập & Tâm lý
          </h1>
          <p className="text-slate-500 mt-1">
            Quản lý danh sách bồi dưỡng, phân công giáo viên phụ trách và theo dõi định kỳ học sinh
          </p>
        </div>

        {/* Global Year Switcher */}
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <label className="text-sm font-semibold text-slate-700">Năm học:</label>
          <select
            value={selectedYearId}
            onChange={(e) => {
              setSelectedYearId(e.target.value)
              localStorage.setItem("academicYearId", e.target.value)
              window.dispatchEvent(new Event("academicYearChanged"))
            }}
            className="rounded-lg border-slate-300 border py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
          >
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
          
          <button 
            onClick={fetchAllData}
            className="p-2 border rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("overview")}
          className={`py-4 px-6 font-semibold border-b-2 text-sm flex items-center gap-2 transition-all ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          Tổng quan
        </button>

        <button
          onClick={() => setActiveTab("academic")}
          className={`py-4 px-6 font-semibold border-b-2 text-sm flex items-center gap-2 transition-all relative ${
            activeTab === "academic"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Hỗ trợ Học tập</span>
          {academicPendingCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs animate-pulse">
              <Bell className="h-3 w-3 fill-white animate-bounce" />
              <span>{academicPendingCount} mới</span>
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("psychology")}
          className={`py-4 px-6 font-semibold border-b-2 text-sm flex items-center gap-2 transition-all relative ${
            activeTab === "psychology"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Hỗ trợ Tâm lý</span>
          {psychologyPendingCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs animate-pulse">
              <Bell className="h-3 w-3 fill-white animate-bounce" />
              <span>{psychologyPendingCount} mới</span>
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("commitments")}
          className={`py-4 px-6 font-semibold border-b-2 text-sm flex items-center gap-2 transition-all ${
            activeTab === "commitments"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Số HS Cam kết/Theo dõi
        </button>



      </div>

      {/* Tab 0: Tổng quan */}
      {activeTab === "overview" && (
        <OverviewDashboard
          targets={targets}
          assignments={assignments}
          classes={classes}
          campuses={campuses}
          teachers={teachers}
          academicYears={academicYears}
          selectedYearId={selectedYearId}
        />
      )}

      {/* Tab 4.5: Số HS Cam kết/Theo dõi */}
      {activeTab === "commitments" && (
        <div className="space-y-6">
          {/* Header & Overview Stats */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-200/50 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-amber-500" />
                Học sinh Cam kết & Theo dõi theo Môn học
              </h2>
              <p className="text-xs text-slate-500 font-medium font-sans">
                Danh sách học sinh diện cam kết được phân tách chi tiết theo từng môn học, hỗ trợ lọc và gửi Email thông báo trực tiếp cho Tổ trưởng chuyên môn (TTCM).
              </p>
            </div>
            
            {/* KPI summary */}
            <div className="flex flex-wrap items-center gap-4 bg-white/80 border border-slate-200/60 p-3 rounded-xl shadow-2xs backdrop-blur-xs">
              <div className="text-center px-4 border-r border-slate-100">
                <div className="text-sm font-black text-slate-800">{flattenedCommitments.length}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tổng lượt cam kết</div>
              </div>
              <div className="text-center px-4 border-r border-slate-100">
                <div className="text-sm font-black text-emerald-600">
                  {flattenedCommitments.filter(c => c.isProposed).length}
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Đã đề xuất</div>
              </div>
              <div className="text-center px-4">
                <div className="text-sm font-black text-rose-500">
                  {flattenedCommitments.filter(c => !c.isProposed).length}
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Chưa đề xuất</div>
              </div>
            </div>
          </div>

          {/* Quick Subject Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => setSelectedCommitmentSubjects([])}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCommitmentSubjects.length === 0
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>Tất cả môn</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCommitmentSubjects.length === 0 ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                {flattenedCommitments.length}
              </span>
            </button>

            {uniqueCommitmentSubjects.map((sub) => {
              const count = commitmentSubjectCounts[sub] || 0
              const isActive = selectedCommitmentSubjects.includes(sub)

              return (
                <button
                  key={sub}
                  onClick={() => {
                    setSelectedCommitmentSubjects(prev => 
                      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
                    )
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{sub}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Filters & Actions Bar */}
          <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-xxs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo mã học sinh hoặc họ tên..."
                value={commitmentSearch}
                onChange={(e) => setCommitmentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Select filters */}
            <div className="flex flex-wrap items-center gap-3">
                            {/* Multi-select Subject Popover */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Môn cam kết:</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubjectDropdownOpen(prev => !prev)
                      setIsGradeDropdownOpen(false)
                    }}
                    className="rounded-lg border-slate-200 border py-1.5 px-3 text-xs font-semibold text-slate-700 bg-slate-50/50 hover:bg-white flex items-center gap-2 transition-all min-w-[140px] justify-between"
                  >
                    <span className="truncate max-w-[130px]">
                      {selectedCommitmentSubjects.length === 0
                        ? `Tất cả môn (${flattenedCommitments.length})`
                        : selectedCommitmentSubjects.length === 1
                        ? selectedCommitmentSubjects[0]
                        : `Đã chọn ${selectedCommitmentSubjects.length} môn`}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </button>
                </div>

                {isSubjectDropdownOpen && (
                  <div className="absolute z-30 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-[10px] font-bold">
                      <button
                        onClick={() => setSelectedCommitmentSubjects(uniqueCommitmentSubjects)}
                        className="text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        onClick={() => setSelectedCommitmentSubjects([])}
                        className="text-slate-400 hover:text-slate-600 underline"
                      >
                        Xóa chọn
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {uniqueCommitmentSubjects.map(sub => {
                        const isChecked = selectedCommitmentSubjects.includes(sub)
                        return (
                          <label
                            key={sub}
                            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedCommitmentSubjects(prev =>
                                    prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
                                  )
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                              />
                              <span>{sub}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">
                              {commitmentSubjectCounts[sub] || 0}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Level filter */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Bậc học:</label>
                <select
                  value={commitmentLevelFilter}
                  onChange={(e) => setCommitmentLevelFilter(e.target.value)}
                  className="rounded-lg border-slate-200 border py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-700 bg-slate-50/50"
                >
                  <option value="ALL">Tất cả Bậc học ({flattenedCommitments.length})</option>
                  {uniqueCommitmentLevels.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl} ({commitmentLevelCounts[lvl]})</option>
                  ))}
                </select>
              </div>

              {/* Multi-select Grade Popover */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Khối:</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGradeDropdownOpen(prev => !prev)
                      setIsSubjectDropdownOpen(false)
                    }}
                    className="rounded-lg border-slate-200 border py-1.5 px-3 text-xs font-semibold text-slate-700 bg-slate-50/50 hover:bg-white flex items-center gap-2 transition-all min-w-[130px] justify-between"
                  >
                    <span className="truncate max-w-[120px]">
                      {selectedCommitmentGrades.length === 0
                        ? `Tất cả Khối (${flattenedCommitments.length})`
                        : selectedCommitmentGrades.length === 1
                        ? selectedCommitmentGrades[0]
                        : `Đã chọn ${selectedCommitmentGrades.length} khối`}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </button>
                </div>

                {isGradeDropdownOpen && (
                  <div className="absolute z-30 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-[10px] font-bold">
                      <button
                        onClick={() => setSelectedCommitmentGrades(uniqueCommitmentGrades)}
                        className="text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        onClick={() => setSelectedCommitmentGrades([])}
                        className="text-slate-400 hover:text-slate-600 underline"
                      >
                        Xóa chọn
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {uniqueCommitmentGrades.map(g => {
                        const isChecked = selectedCommitmentGrades.includes(g)
                        return (
                          <label
                            key={g}
                            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedCommitmentGrades(prev =>
                                    prev.includes(g) ? prev.filter(item => item !== g) : [...prev, g]
                                  )
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                              />
                              <span>{g}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">
                              {commitmentGradeCounts[g] || 0}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Campus filter */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cơ sở:</label>
                <select
                  value={commitmentCampusFilter}
                  onChange={(e) => setCommitmentCampusFilter(e.target.value)}
                  className="rounded-lg border-slate-200 border py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-700 bg-slate-50/50"
                >
                  <option value="ALL">Tất cả Cơ sở</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.campusName}>{c.campusName}</option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tình trạng:</label>
                <select
                  value={commitmentStatusFilter}
                  onChange={(e) => setCommitmentStatusFilter(e.target.value)}
                  className="rounded-lg border-slate-200 border py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-700 bg-slate-50/50"
                >
                  <option value="ALL">Tất cả tình trạng</option>
                  <option value="PROPOSED">Đã đề xuất</option>
                  <option value="NOT_PROPOSED">Chưa đề xuất</option>
                </select>
              </div>

                            {/* Export to Excel Button */}
              <button
                onClick={handleExportCommitmentsExcel}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Xuất danh sách học sinh cam kết kèm Bậc học ra file Excel"
              >
                <Download className="h-4 w-4" />
                <span>Xuất Excel</span>
              </button>

              {/* Send Email to QLCM Button */}
              <button
                onClick={() => {
                  setEmailQLCMCampus(commitmentCampusFilter === "ALL" ? "ALL" : commitmentCampusFilter)
                  setIsEmailQLCMModalOpen(true)
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-teal-700 to-cyan-700 hover:from-teal-800 hover:to-cyan-800 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Gửi Email danh sách học sinh cam kết cho Quản lý Chuyên môn Cơ sở"
              >
                <Building2 className="h-4 w-4" />
                <span>Gửi Email QLCM Cơ sở</span>
              </button>

              {/* Send Email to TTCM Button */}
              <button
                onClick={() => {
                  setEmailTTCMSubject(commitmentSubjectFilter === "ALL" ? "ALL" : commitmentSubjectFilter)
                  setIsEmailTTCMModalOpen(true)
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                title="Gửi Email danh sách học sinh cam kết cho Tổ trưởng chuyên môn"
              >
                <Mail className="h-4 w-4" />
                <span>Gửi Email cho TTCM</span>
              </button>
            </div>
          </div>

          {/* Data Table */}
          {commitmentLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/60 rounded-2xl">
              <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
              <span className="text-xs font-bold text-slate-400">Đang tải danh sách học sinh cam kết theo môn...</span>
            </div>
          ) : (() => {
            if (filteredCommitments.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                  <Users className="h-8 w-8 mb-2 text-slate-300" />
                  <span className="text-xs font-bold">Không tìm thấy học sinh cam kết nào phù hợp bộ lọc</span>
                </div>
              )
            }

            return (
              <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-xxs flex flex-col justify-between min-h-[300px]">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-xs">
                    <thead className="bg-slate-50/75 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3.5 text-center w-12">STT</th>
                        <th className="px-4 py-3.5 text-left">Họ tên</th>
                        <th className="px-4 py-3.5 text-left">Mã HS</th>
                        <th className="px-4 py-3.5 text-left">Bậc học</th>
                        <th className="px-4 py-3.5 text-left">Khối</th>
                        <th className="px-4 py-3.5 text-left">Lớp</th>
                        <th className="px-4 py-3.5 text-left">Cơ sở</th>
                        <th className="px-4 py-3.5 text-left">Môn Cam kết</th>
                        <th className="px-4 py-3.5 text-left">Tình trạng</th>
                        <th className="px-4 py-3.5 text-left">Kết quả Khảo sát & Ghi chú</th>
                        <th className="px-4 py-3.5 text-center w-24">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-600 bg-white">
                                            {paginatedCommitments.map((row, idx) => {
                        const sttNumber = (commitmentPage - 1) * commitmentPageSize + idx + 1
                        const isPrimary = /^[1-5][._\s]|lớp\s*[1-5]/i.test(row.className || "")
                        const litLabel = isPrimary ? "Tiếng Việt" : "Ngữ Văn"
                        const isEnglish = row.committedSubject?.toLowerCase().includes("anh")
                        const isMath = row.committedSubject?.toLowerCase().includes("toán")
                        const isLiterature = row.committedSubject?.toLowerCase().includes("văn") || row.committedSubject?.toLowerCase().includes("việt")
                        const isPsychology = row.committedSubject?.toLowerCase().includes("lý") || row.committedSubject?.toLowerCase().includes("tâm")

                        const num = parseInt((row.grade || "").replace(/\D/g, ""), 10)
                        let rowLevel = row.level
                        if (!rowLevel) {
                          if (num >= 1 && num <= 5) rowLevel = "Tiểu học"
                          else if (num >= 6 && num <= 12) rowLevel = "Trung học"
                          else if (row.grade === "Mầm non" || (row.className || "").includes("Mầm")) rowLevel = "Mầm non"
                          else rowLevel = isPrimary ? "Tiểu học" : "Trung học"
                        }

                        return (
                          <tr key={row.uniqueKey || `${row.id}_${idx}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3.5 text-center text-slate-400 font-bold">{sttNumber}</td>
                            <td className="px-4 py-3.5">
                              <div className="font-extrabold text-slate-800 text-[12px]">{row.fullName}</div>
                              {row.gender && (
                                <div className="text-[10px] text-slate-400 font-medium mt-0.5">{row.gender}</div>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="font-mono font-bold text-slate-600 text-[11px]">{row.studentCode}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border inline-block ${
                                rowLevel === "Tiểu học" 
                                  ? "bg-sky-50 text-sky-700 border-sky-200" 
                                  : rowLevel === "Trung học" 
                                  ? "bg-purple-50 text-purple-700 border-purple-200" 
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}>
                                {rowLevel}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                                {row.grade ? (row.grade.startsWith("Khối") ? row.grade : "Khối " + row.grade) : ((row.className || "").match(/^(\d+)/) ? "Khối " + (row.className || "").match(/^(\d+)/)[1] : (row.className?.includes("Mầm") ? "Mầm non" : "-"))}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="font-extrabold text-slate-800 text-[12px]">{row.className}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="text-[11px] text-indigo-600 font-bold">
                                {row.campusName ? (row.campusName.includes("CS") ? row.campusName : row.campusName) : (row.className && row.className.includes("CS") ? "CS" + row.className.split("CS")[1].split(/[_ -]/)[0] : "CS1")}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              {getSubjectBadge(row.committedSubject)}
                            </td>
                            <td className="px-4 py-3.5">
                              {row.isProposed ? (
                                <div className="space-y-1">
                                  <div className="font-extrabold text-emerald-600 text-[12px] flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Đã đề xuất
                                  </div>
                                  {row.allTargets && row.allTargets.map((st: any, stIdx: number) => (
                                    <div key={stIdx} className="text-[10px] text-slate-500 font-medium pl-3">
                                      • {st.supportType === "ACADEMIC" ? "Phụ đạo" : "Tâm lý"} ({st.status})
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="font-extrabold text-rose-500 text-[12px] flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  Chưa đề xuất
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="text-[10px] text-slate-500 font-bold mb-1.5 flex flex-wrap gap-x-2 gap-y-1">
                                {isMath && row.mathScore !== null && (
                                  <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-amber-100 text-amber-800 border-2 border-amber-300 shadow-2xs">
                                    Toán: {row.mathScore} ★
                                  </span>
                                )}
                                {isLiterature && row.literatureScore !== null && (
                                  <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-emerald-100 text-emerald-800 border-2 border-emerald-300 shadow-2xs">
                                    {litLabel}: {row.literatureScore} ★
                                  </span>
                                )}
                                {isEnglish && (
                                  <>
                                    {row.writtenEnglishScore !== null && (
                                      <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-blue-100 text-blue-800 border-2 border-blue-300 shadow-2xs">
                                        Anh viết: {row.writtenEnglishScore} ★
                                      </span>
                                    )}
                                    {row.oralEnglishScore !== null && (
                                      <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-blue-100 text-blue-800 border-2 border-blue-300 shadow-2xs">
                                        Anh nói: {row.oralEnglishScore} ★
                                      </span>
                                    )}
                                  </>
                                )}
                                {isPsychology && row.psychologyScore !== null && (
                                  <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-purple-100 text-purple-800 border-2 border-purple-300 shadow-2xs">
                                    Tâm lý: {row.psychologyScore} ★
                                  </span>
                                )}

                                {/* Other non-focused scores */}
                                {!isMath && getScoreTag("Toán", row.mathScore)}
                                {!isLiterature && getScoreTag(litLabel, row.literatureScore)}
                                {!isEnglish && getScoreTag("Anh viết", row.writtenEnglishScore)}
                                {!isEnglish && getScoreTag("Anh nói", row.oralEnglishScore)}
                                {!isPsychology && getScoreTag("Tâm lý", row.psychologyScore)}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium max-w-sm line-clamp-2" title={row.directorNote || ""}>
                                {row.directorNote || <span className="italic text-slate-300">Không có ghi chú khảo sát</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => {
                                  setEmailTTCMSubject(row.committedSubject || "ALL")
                                  setIsEmailTTCMModalOpen(true)
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 text-slate-500 transition-all shadow-2xs inline-flex items-center gap-1 text-[11px] font-bold"
                                title={`Gửi email cho TTCM môn ${row.committedSubject}`}
                              >
                                <Mail className="h-3.5 w-3.5" />
                                <span>Gửi TTCM</span>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="bg-slate-50/75 border-t border-slate-100 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
                  <div>
                    Hiển thị từ <span className="font-extrabold text-slate-700">{Math.min((commitmentPage - 1) * commitmentPageSize + 1, filteredCommitments.length)}</span> đến <span className="font-extrabold text-slate-700">{Math.min(commitmentPage * commitmentPageSize, filteredCommitments.length)}</span> trong tổng số <span className="font-extrabold text-slate-700">{filteredCommitments.length}</span> lượt cam kết
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={commitmentPage === 1}
                      onClick={() => setCommitmentPage(p => Math.max(p - 1, 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Trước
                    </button>
                    
                    {Array.from({ length: totalCommitmentPages }, (_, i) => i + 1).map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => setCommitmentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                          commitmentPage === pageNum
                            ? "bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-sm"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    
                    <button
                      disabled={commitmentPage === totalCommitmentPages}
                      onClick={() => setCommitmentPage(p => Math.min(p + 1, totalCommitmentPages))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}      {/* Loading state indicator */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      )}

      {/* Tab 1 & Tab 2: Hỗ trợ Học tập & Hỗ trợ Tâm lý */}
      {!loading && (activeTab === "academic" || activeTab === "psychology") && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeTab === "academic"
                    ? "Tìm kiếm theo tên hoặc mã học sinh cần hỗ trợ học tập..."
                    : "Tìm kiếm theo tên hoặc mã học sinh cần hỗ trợ tâm lý..."
                }
                value={targetSearch}
                onChange={e => setTargetSearch(e.target.value)}
                className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nguồn:</span>
                <select
                  value={targetSourceFilter}
                  onChange={e => setTargetSourceFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium bg-white"
                >
                  <option value="ALL">Tất cả nguồn</option>
                  <option value="TEACHER_ALL">Đề xuất Giáo viên</option>
                  <option value="ADMISSION">Khảo sát đầu vào (KSĐV)</option>
                  <option value="GVCN">Giáo viên Chủ nhiệm</option>
                  <option value="GVBM">Giáo viên Bộ môn</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái:</span>
                <select
                  value={targetStatusFilter}
                  onChange={e => setTargetStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium bg-white"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="UNAPPROVED">Cần can thiệp</option>
                  <option value="ACTIVE">Đang hỗ trợ</option>
                  <option value="PENDING">Hoàn thành</option>
                  <option value="TERMINATED">Đã kết thúc</option>
                </select>
              </div>

              <button
                onClick={() => handleExportTargetsExcel(activeTab === "psychology" ? "PSYCHOLOGICAL" : "ACADEMIC")}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs hover:shadow transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Xuất danh sách ra file Excel"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>

          {/* Grouped Teacher Table */}
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Giáo viên đề xuất</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Số lượng HS đề xuất</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {activeTab === "academic" ? "Môn học hỗ trợ" : "Lĩnh vực tâm lý"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái tổng quan</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200 text-sm">
                {groupedTargets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      {activeTab === "academic"
                        ? "Không tìm thấy đề xuất hỗ trợ học tập nào"
                        : "Không tìm thấy đề xuất hỗ trợ tâm lý nào"}
                    </td>
                  </tr>
                ) : (
                  groupedTargets.map((group: any) => {
                    const subjectsList = Array.from(
                      new Set(
                        group.targets.map((t: any) => {
                          if (t.supportType === "PSYCHOLOGICAL") return "Tâm lý"
                          return t.reason?.split(" (")?.[0] || t.reason || "Môn học"
                        })
                      )
                    ).filter(Boolean)

                    return (
                      <tr key={group.teacherId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-xs border border-white">
                              {group.teacherName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{group.teacherName}</div>
                              <div className="text-xs text-slate-500">
                                {group.teacherId === "SYSTEM" ? "Khảo sát tự động" : "Đề xuất hỗ trợ"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-700">
                            {group.targets.length} học sinh
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {subjectsList.map((sub: any, idx: number) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
                                  activeTab === "academic"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-purple-50 text-purple-700 border-purple-200"
                                }`}
                              >
                                {sub}
                              </span>
                            ))}
                            {subjectsList.length === 0 && <span className="text-slate-400">-</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1.5">
                            {group.pendingCount > 0 && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 inline-flex items-center gap-1">
                                <Bell className="h-3 w-3 text-orange-600 animate-bounce fill-orange-600" />
                                {group.pendingCount} Chờ duyệt
                              </span>
                            )}
                            {group.approvedCount > 0 && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                {group.approvedCount} Đang bồi dưỡng
                              </span>
                            )}
                            {group.pendingTerminationCount > 0 && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse inline-flex items-center gap-1">
                                <Bell className="h-3 w-3 text-amber-600 animate-bounce fill-amber-600" />
                                {group.pendingTerminationCount} Chờ kết thúc
                              </span>
                            )}
                            {group.terminatedCount > 0 && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {group.terminatedCount} Đã kết thúc
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => setSelectedTeacherForDetail(group)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-1.5 px-4 rounded-lg text-xs transition-colors border border-indigo-200/50 shadow-xs"
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Phân công GVPT */}
      {!loading && activeTab === "assignments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setAssignTargetId("")
                setAssignTeacherId("")
                setAssignSubjectId("")
                setAssignNotes("")
                setIsAssignModalOpen(true)
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              Thêm Phân công GVPT
            </button>
          </div>

          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Học sinh được hỗ trợ</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Loại bồi dưỡng</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Môn bồi dưỡng</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Giáo viên phụ đạo (GVPT)</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ghi chú</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200 text-sm">
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      Chưa có phân công giáo viên phụ đạo nào được thiết lập
                    </td>
                  </tr>
                ) : (
                  assignments.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{a.target?.student?.studentName}</div>
                        <div className="text-xs text-slate-500">{a.target?.student?.studentCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          a.target?.supportType === "ACADEMIC" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                        }`}>
                          {a.target?.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-medium">
                        {a.subject?.subjectName || "Hỗ trợ Tâm lý"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{a.teacher?.teacherName}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {a.notes || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleDeleteAssignment(a.id)}
                          className="text-rose-600 hover:text-rose-900 p-1.5 rounded hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* Tab 4: Báo cáo thống kê - Đã bỏ */}
      {false && (
        <div className="space-y-6">
          {/* Sub-tab navigation for reports */}
          <div className="flex flex-wrap border-b border-slate-200 gap-1 bg-slate-50 p-1 rounded-lg">
            <button
              onClick={() => setReportSubTab("student")}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-colors ${
                reportSubTab === "student" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Theo học sinh
            </button>
            <button
              onClick={() => setReportSubTab("grade")}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-colors ${
                reportSubTab === "grade" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Theo khối
            </button>
            <button
              onClick={() => setReportSubTab("class")}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-colors ${
                reportSubTab === "class" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Theo lớp
            </button>
            <button
              onClick={() => setReportSubTab("subject")}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-colors ${
                reportSubTab === "subject" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Theo môn học
            </button>
            <button
              onClick={() => setReportSubTab("teacher")}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-colors ${
                reportSubTab === "teacher" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Theo giáo viên
            </button>
            <button
              onClick={() => setReportSubTab("campus")}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-colors ${
                reportSubTab === "campus" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Theo cơ sở
            </button>
            <button
              onClick={() => setReportSubTab("system")}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-colors ${
                reportSubTab === "system" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Toàn hệ thống
            </button>
          </div>

          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border">
            <span className="text-sm font-semibold text-slate-700">Dữ liệu được cập nhật tự động</span>
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download className="h-3.5 w-3.5" /> Xuất Excel báo cáo
            </button>
          </div>

          {/* Sub-tab 1: Báo cáo Theo Học Sinh */}
          {reportSubTab === "student" && (
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Lược sử theo dõi bồi dưỡng chi tiết</h3>
              </div>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-500">Mã HS</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-500">Họ và tên</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-500">Lớp</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-500">Chương trình / Môn</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-500">Thời gian bắt đầu</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-500">Thời gian kết thúc</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-500">Mức tiến bộ / Kết quả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {targets.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">{t.student?.studentCode}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{t.student?.studentName}</td>
                      <td className="px-6 py-4">{t.student?.class?.className}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          t.supportType === "ACADEMIC" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}>
                          {t.supportType === "ACADEMIC" ? t.reason : "Tâm lý học đường"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{new Date(t.startDate).toLocaleDateString("vi-VN")}</td>
                      <td className="px-6 py-4 text-slate-600">{t.endDate ? new Date(t.endDate).toLocaleDateString("vi-VN") : "Đang theo dõi"}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{t.terminationStatus === "TERMINATED" ? t.outcome : t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-tab 1.5: Báo cáo Theo Khối */}
          {reportSubTab === "grade" && (
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Thống kê theo dõi theo Khối</h3>
                <span className="text-xs font-medium text-slate-500">Khảo sát & Đề xuất bồi dưỡng</span>
              </div>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Tên Khối</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Tổng số HS bồi dưỡng</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Học tập (Môn học)</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Hỗ trợ Tâm lý</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Tình trạng theo dõi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {gradeStats.map((item: any, idx: number) => {
                    if (item.totalCount === 0) return null
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                        <td className="px-6 py-4 text-center font-extrabold text-slate-900">{item.totalCount}</td>
                        <td className="px-6 py-4 text-center font-semibold text-blue-600 bg-blue-50/30">{item.academicCount}</td>
                        <td className="px-6 py-4 text-center font-semibold text-purple-600 bg-purple-50/30">{item.psychologyCount}</td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          <div className="flex flex-wrap gap-1.5">
                            {item.pendingCount > 0 && <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">Chờ duyệt: {item.pendingCount}</span>}
                            {item.approvedCount > 0 && <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">Đang bồi dưỡng: {item.approvedCount}</span>}
                            {item.pendingTerminationCount > 0 && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">Chờ kết thúc: {item.pendingTerminationCount}</span>}
                            {item.terminatedCount > 0 && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">Đã kết thúc: {item.terminatedCount}</span>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-tab 2: Báo cáo Theo Lớp */}
          {reportSubTab === "class" && (
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Thống kê số lượng học sinh bồi dưỡng theo lớp</h3>
              </div>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Tên lớp</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Tổng số HS</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Hỗ trợ Văn hóa (Môn)</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Hỗ trợ Tâm lý</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Tình trạng theo dõi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {classes.map((c: any) => {
                    const classTargets = targets.filter(t => t.student?.classId === c.id)
                    const acadCount = classTargets.filter(t => t.supportType === "ACADEMIC").length
                    const psyCount = classTargets.filter(t => t.supportType === "PSYCHOLOGICAL").length
                    const pending = classTargets.filter(t => t.terminationStatus === "ACTIVE" && (!t.assignments || t.assignments.length === 0) && t.status !== "ĐÃ DUYỆT").length
                    const approved = classTargets.filter(t => t.terminationStatus === "ACTIVE" && t.assignments && t.assignments.length > 0).length
                    const pendingTerm = classTargets.filter(t => t.terminationStatus === "PENDING_TERMINATION").length
                    const term = classTargets.filter(t => t.terminationStatus === "TERMINATED").length
                    
                    if (classTargets.length === 0) return null
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{c.className}</td>
                        <td className="px-6 py-4 text-center font-extrabold text-slate-900">{classTargets.length}</td>
                        <td className="px-6 py-4 text-center font-semibold text-blue-600 bg-blue-50/30">{acadCount}</td>
                        <td className="px-6 py-4 text-center font-semibold text-purple-600 bg-purple-50/30">{psyCount}</td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          <div className="flex flex-wrap gap-1.5">
                            {pending > 0 && <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">Chờ duyệt: {pending}</span>}
                            {approved > 0 && <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">Đang bồi dưỡng: {approved}</span>}
                            {pendingTerm > 0 && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">Chờ kết thúc: {pendingTerm}</span>}
                            {term > 0 && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">Đã kết thúc: {term}</span>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-tab 3: Báo cáo Theo Môn học */}
          {reportSubTab === "subject" && (
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Thống kê theo dõi theo Môn học</h3>
              </div>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Tên môn học / Lý do</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Tổng số HS</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Học tập (Môn học)</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Hỗ trợ Tâm lý</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Tình trạng theo dõi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {subjects.map((sub: any) => {
                    const subTargets = targets.filter(t => 
                      t.supportType === "ACADEMIC" && 
                      (t.reason?.toLowerCase().includes(sub.subjectName.toLowerCase()) || 
                       t.assignments.some((a: any) => a.subjectId === sub.id))
                    )
                    const pending = subTargets.filter(t => t.terminationStatus === "ACTIVE" && (!t.assignments || t.assignments.length === 0) && t.status !== "ĐÃ DUYỆT").length
                    const approved = subTargets.filter(t => t.terminationStatus === "ACTIVE" && t.assignments && t.assignments.length > 0).length
                    const pendingTerm = subTargets.filter(t => t.terminationStatus === "PENDING_TERMINATION").length
                    const term = subTargets.filter(t => t.terminationStatus === "TERMINATED").length
                    
                    if (subTargets.length === 0) return null
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">{sub.subjectName}</td>
                        <td className="px-6 py-4 text-center font-extrabold text-slate-900">{subTargets.length}</td>
                        <td className="px-6 py-4 text-center font-semibold text-blue-600 bg-blue-50/30">{subTargets.length}</td>
                        <td className="px-6 py-4 text-center font-semibold text-purple-600 bg-purple-50/30">0</td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          <div className="flex flex-wrap gap-1.5">
                            {pending > 0 && <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">Chờ duyệt: {pending}</span>}
                            {approved > 0 && <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">Đang bồi dưỡng: {approved}</span>}
                            {pendingTerm > 0 && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">Chờ kết thúc: {pendingTerm}</span>}
                            {term > 0 && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">Đã kết thúc: {term}</span>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-tab 4: Báo cáo Theo Giáo viên */}
          {reportSubTab === "teacher" && (
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Thống kê phân công bồi dưỡng theo Giáo viên</h3>
              </div>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Họ tên Giáo viên phụ trách</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Tổng số HS</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Hỗ trợ Văn hóa (Môn)</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Hỗ trợ Tâm lý</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Tình trạng theo dõi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {teachers.map((t: any) => {
                    const teacherAssignments = assignments.filter(a => a.teacherId === t.id)
                    const teacherTargets = targets.filter(target => teacherAssignments.some(a => a.targetId === target.id))
                    
                    const acadCount = teacherTargets.filter(target => target.supportType === "ACADEMIC").length
                    const psyCount = teacherTargets.filter(target => target.supportType === "PSYCHOLOGICAL").length
                    
                    const pending = teacherTargets.filter(target => target.terminationStatus === "ACTIVE" && (!target.assignments || target.assignments.length === 0) && target.status !== "ĐÃ DUYỆT").length
                    const approved = teacherTargets.filter(target => target.terminationStatus === "ACTIVE" && target.assignments && target.assignments.length > 0).length
                    const pendingTerm = teacherTargets.filter(target => target.terminationStatus === "PENDING_TERMINATION").length
                    const term = teacherTargets.filter(target => target.terminationStatus === "TERMINATED").length

                    if (teacherTargets.length === 0) return null
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{t.teacherName}</td>
                        <td className="px-6 py-4 text-center font-extrabold text-slate-900">{teacherTargets.length}</td>
                        <td className="px-6 py-4 text-center font-semibold text-blue-600 bg-blue-50/30">{acadCount}</td>
                        <td className="px-6 py-4 text-center font-semibold text-purple-600 bg-purple-50/30">{psyCount}</td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          <div className="flex flex-wrap gap-1.5">
                            {pending > 0 && <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">Chờ duyệt: {pending}</span>}
                            {approved > 0 && <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">Đang bồi dưỡng: {approved}</span>}
                            {pendingTerm > 0 && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">Chờ kết thúc: {pendingTerm}</span>}
                            {term > 0 && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">Đã kết thúc: {term}</span>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-tab 5: Báo cáo Theo Cơ sở */}
          {reportSubTab === "campus" && (
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Thống kê số lượng học sinh bồi dưỡng theo Cơ sở</h3>
              </div>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Tên cơ sở</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Tổng số HS</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Hỗ trợ Văn hóa (Môn)</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Hỗ trợ Tâm lý</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Tình trạng theo dõi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {campuses.map((c: any) => {
                    const campusTargets = targets.filter(t => t.student?.class?.campusId === c.id)
                    const acadCount = campusTargets.filter(t => t.supportType === "ACADEMIC").length
                    const psyCount = campusTargets.filter(t => t.supportType === "PSYCHOLOGICAL").length
                    
                    const pending = campusTargets.filter(t => t.terminationStatus === "ACTIVE" && (!t.assignments || t.assignments.length === 0) && t.status !== "ĐÃ DUYỆT").length
                    const approved = campusTargets.filter(t => t.terminationStatus === "ACTIVE" && t.assignments && t.assignments.length > 0).length
                    const pendingTerm = campusTargets.filter(t => t.terminationStatus === "PENDING_TERMINATION").length
                    const term = campusTargets.filter(t => t.terminationStatus === "TERMINATED").length

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{c.campusName}</td>
                        <td className="px-6 py-4 text-center font-extrabold text-slate-900">{campusTargets.length}</td>
                        <td className="px-6 py-4 text-center font-semibold text-blue-600 bg-blue-50/30">{acadCount}</td>
                        <td className="px-6 py-4 text-center font-semibold text-purple-600 bg-purple-50/30">{psyCount}</td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          <div className="flex flex-wrap gap-1.5">
                            {pending > 0 && <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">Chờ duyệt: {pending}</span>}
                            {approved > 0 && <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">Đang bồi dưỡng: {approved}</span>}
                            {pendingTerm > 0 && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">Chờ kết thúc: {pendingTerm}</span>}
                            {term > 0 && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">Đã kết thúc: {term}</span>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-tab 6: Báo cáo Toàn hệ thống */}
          {reportSubTab === "system" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 border rounded-xl shadow-sm text-center">
                <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">Tổng bồi dưỡng môn học</div>
                <div className="text-4xl font-extrabold text-blue-600 mt-2">
                  {targets.filter(t => t.supportType === "ACADEMIC").length}
                </div>
              </div>
              <div className="bg-white p-5 border rounded-xl shadow-sm text-center">
                <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">Tổng hỗ trợ Tâm lý</div>
                <div className="text-4xl font-extrabold text-purple-600 mt-2">
                  {targets.filter(t => t.supportType === "PSYCHOLOGICAL").length}
                </div>
              </div>
              <div className="bg-white p-5 border rounded-xl shadow-sm text-center">
                <div className="text-slate-500 text-xs uppercase font-bold tracking-wider font-bold">Đang hoạt động</div>
                <div className="text-4xl font-extrabold text-indigo-600 mt-2">
                  {targets.filter(t => t.terminationStatus === "ACTIVE").length}
                </div>
              </div>
              <div className="bg-white p-5 border rounded-xl shadow-sm text-center">
                <div className="text-slate-500 text-xs uppercase font-bold tracking-wider font-bold">Đã kết thúc</div>
                <div className="text-4xl font-extrabold text-emerald-600 mt-2">
                  {targets.filter(t => t.terminationStatus === "TERMINATED").length}
                </div>
              </div>
            </div>
          )}
          
          {/* Monthly Progress Chart section */}
          <div className="bg-white border rounded-xl p-6 shadow-sm mt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  Biểu đồ Tiến bộ của Học sinh theo Tháng
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Thống kê kết quả đánh giá định kỳ theo các cấp độ tiến bộ ghi nhận từng tháng
                </p>
              </div>
              {!hasRealData && (
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide">
                  Dữ liệu minh họa (Demo)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
              {/* SVG Chart */}
              <div className="lg:col-span-3 h-[300px] flex items-end justify-between border-b border-l pb-6 pl-4 relative">
                {/* Y-axis helper gridlines */}
                <div className="absolute left-0 right-0 top-0 border-t border-slate-100 text-[10px] text-slate-400 pt-1">
                  100%
                </div>
                <div className="absolute left-0 right-0 top-1/4 border-t border-slate-100 text-[10px] text-slate-400 pt-1">
                  75%
                </div>
                <div className="absolute left-0 right-0 top-2/4 border-t border-slate-100 text-[10px] text-slate-400 pt-1">
                  50%
                </div>
                <div className="absolute left-0 right-0 top-3/4 border-t border-slate-100 text-[10px] text-slate-400 pt-1">
                  25%
                </div>

                {chartData.map((item: any, index: number) => {
                  const goodPercent = item.total ? (item.good / item.total) * 100 : 0
                  const avgPercent = item.total ? (item.average / item.total) * 100 : 0
                  const weakPercent = item.total ? (item.weak / item.total) * 100 : 0

                  return (
                    <div key={index} className="flex flex-col items-center flex-1 group relative mx-2 max-w-[80px]">
                      {/* Bar Stack */}
                      <div className="w-12 h-48 flex flex-col justify-end rounded-t-md overflow-hidden bg-slate-50 border border-slate-200 shadow-inner">
                        {/* Weak Bar */}
                        {weakPercent > 0 && (
                          <div 
                            style={{ height: `${weakPercent}%` }} 
                            className="bg-rose-500/90 hover:bg-rose-600 transition-all duration-300"
                            title={`Chưa tiến bộ: ${item.weak} học sinh (${Math.round(weakPercent)}%)`}
                          />
                        )}
                        {/* Average Bar */}
                        {avgPercent > 0 && (
                          <div 
                            style={{ height: `${avgPercent}%` }} 
                            className="bg-amber-400/90 hover:bg-amber-500 transition-all duration-300"
                            title={`Có tiến bộ: ${item.average} học sinh (${Math.round(avgPercent)}%)`}
                          />
                        )}
                        {/* Good Bar */}
                        {goodPercent > 0 && (
                          <div 
                            style={{ height: `${goodPercent}%` }} 
                            className="bg-emerald-500/90 hover:bg-emerald-600 transition-all duration-300"
                            title={`Tiến bộ Tốt / Đạt: ${item.good} học sinh (${Math.round(goodPercent)}%)`}
                          />
                        )}
                      </div>
                      
                      {/* X-axis label */}
                      <span className="text-[10px] font-bold text-slate-500 mt-2 truncate w-full text-center" title={item.month}>
                        {item.month}
                      </span>
                      
                      {/* Floating tooltip on hover */}
                      <div className="absolute bottom-full mb-2 bg-slate-900 text-white rounded-lg p-2.5 shadow-xl border border-slate-700 text-xs hidden group-hover:block z-10 w-44 pointer-events-none">
                        <div className="font-bold border-b border-slate-700 pb-1 mb-1.5">{item.month}</div>
                        <div className="flex justify-between items-center text-emerald-400">
                          <span>Tiến bộ tốt:</span>
                          <span className="font-bold">{item.good} HS ({Math.round(goodPercent)}%)</span>
                        </div>
                        <div className="flex justify-between items-center text-amber-400 mt-1">
                          <span>Có tiến bộ:</span>
                          <span className="font-bold">{item.average} HS ({Math.round(avgPercent)}%)</span>
                        </div>
                        <div className="flex justify-between items-center text-rose-400 mt-1">
                          <span>Chưa tiến bộ:</span>
                          <span className="font-bold">{item.weak} HS ({Math.round(weakPercent)}%)</span>
                        </div>
                        <div className="border-t border-slate-700 pt-1 mt-1.5 font-bold flex justify-between items-center text-slate-300">
                          <span>Tổng đánh giá:</span>
                          <span>{item.total} lượt</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend & Stats Details */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Chú thích biểu đồ</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2 border rounded-lg hover:bg-slate-50">
                    <span className="h-4 w-4 bg-emerald-500 rounded-md shadow-xs"></span>
                    <div>
                      <div className="text-xs font-bold text-slate-700">Tiến bộ Tốt / Đạt</div>
                      <p className="text-[10px] text-slate-500 leading-normal">Đánh giá ở mức Tốt, Đạt, Giỏi hoặc có sự tiến bộ vượt bậc</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2 border rounded-lg hover:bg-slate-50">
                    <span className="h-4 w-4 bg-amber-400 rounded-md shadow-xs"></span>
                    <div>
                      <div className="text-xs font-bold text-slate-700">Có tiến bộ / Khá</div>
                      <p className="text-[10px] text-slate-500 leading-normal">Có chuyển biến tốt, mức trung bình khá hoặc cần nỗ lực thêm</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2 border rounded-lg hover:bg-slate-50">
                    <span className="h-4 w-4 bg-rose-500 rounded-md shadow-xs"></span>
                    <div>
                      <div className="text-xs font-bold text-slate-700">Chưa tiến bộ / Yếu</div>
                      <p className="text-[10px] text-slate-500 leading-normal">Kết quả còn yếu, chưa có nhiều tiến bộ sau khi theo dõi</p>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mt-4 text-[11px] text-indigo-800 leading-relaxed font-medium">
                  💡 Thầy/cô có thể hover (di chuột) lên từng cột trong biểu đồ để xem chi tiết số lượng và tỷ lệ % phân loại học sinh trong tháng đó.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS SECTION --- */}

      {/* 1. Modal Đồng bộ nhanh từ Khảo sát đầu vào */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-indigo-600" />
                Đồng bộ nhanh từ Khảo sát đầu vào
              </h2>
              <button onClick={() => setIsSyncModalOpen(false)}>
                <X className="h-5 w-5 text-slate-500 hover:text-slate-800" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700">Chọn lớp bồi dưỡng:</label>
                <select
                  value={syncClassId}
                  onChange={e => setSyncClassId(e.target.value)}
                  className="rounded-lg border-slate-300 border py-2 px-4 focus:outline-none text-sm w-64"
                >
                  <option value="">-- Chọn lớp học --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.className}</option>
                  ))}
                </select>
              </div>

              {syncClassId && syncCandidates.length === 0 ? (
                <div className="p-10 border rounded-lg text-center text-slate-400">
                  Lớp này không có học sinh nào có cam kết bồi dưỡng môn học hoặc có kết quả cần hỗ trợ trong khảo sát đầu vào.
                </div>
              ) : syncClassId && (
                <div className="border rounded-lg overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left">
                          <input
                            type="checkbox"
                            checked={selectedCandidateIds.length === syncCandidates.length}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCandidateIds(syncCandidates.map(c => c.id))
                              else setSelectedCandidateIds([])
                            }}
                          />
                        </th>
                        <th className="px-4 py-2 text-left">Học sinh</th>
                        <th className="px-4 py-2 text-center">Toán</th>
                        <th className="px-4 py-2 text-center">Văn</th>
                        <th className="px-4 py-2 text-center">Anh</th>
                        <th className="px-4 py-2 text-center">Tâm lý</th>
                        <th className="px-4 py-2 text-left">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {syncCandidates.map(cand => (
                        <tr key={cand.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selectedCandidateIds.includes(cand.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCandidateIds([...selectedCandidateIds, cand.id])
                                else setSelectedCandidateIds(selectedCandidateIds.filter(id => id !== cand.id))
                              }}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <div className="font-bold text-slate-800">{cand.studentName}</div>
                            <div className="text-xs text-slate-500">{cand.studentCode}</div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {cand.mathTarget ? (
                              <span className="bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded text-xs">
                                Cam kết ({cand.mathScore})
                              </span>
                            ) : cand.mathScore || "-"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {cand.literatureTarget ? (
                              <span className="bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded text-xs">
                                Cam kết ({cand.literatureScore})
                              </span>
                            ) : cand.literatureScore || "-"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {cand.englishTarget ? (
                              <span className="bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded text-xs">
                                Cam kết ({cand.englishScore})
                              </span>
                            ) : cand.englishScore || "-"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {cand.psychologyTarget ? (
                              <span className="bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded text-xs">
                                Có đề xuất
                              </span>
                            ) : "-"}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500 max-w-xs truncate" title={cand.notes}>
                            {cand.notes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsSyncModalOpen(false)}
                className="border hover:bg-slate-100 py-2 px-4 rounded-lg text-sm font-medium transition-all"
              >
                Đóng
              </button>
              {syncCandidates.length > 0 && (
                <button
                  onClick={handleSyncAdmission}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium shadow-sm transition-all"
                >
                  Xác nhận thêm bồi dưỡng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Thêm đối tượng thủ công */}
      {isAddTargetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                Thêm đối tượng bồi dưỡng thủ công
              </h2>
              <button onClick={() => setIsAddTargetModalOpen(false)}>
                <X className="h-5 w-5 text-slate-500 hover:text-slate-800" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Học sinh:</label>
                <select
                  value={newTargetStudentId}
                  onChange={e => setNewTargetStudentId(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                >
                  <option value="">-- Chọn học sinh --</option>
                  {allStudents.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.studentName} ({s.studentCode})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Loại bồi dưỡng:</label>
                  <select
                    value={newTargetType}
                    onChange={e => setNewTargetType(e.target.value)}
                    className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                  >
                    <option value="ACADEMIC">Văn hóa (Môn học)</option>
                    <option value="PSYCHOLOGICAL">Hỗ trợ Tâm lý</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Nguồn đề xuất:</label>
                  <select
                    value={newTargetSource}
                    onChange={e => setNewTargetSource(e.target.value)}
                    className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                  >
                    <option value="GVCN">Giáo viên chủ nhiệm</option>
                    <option value="GVBM">Giáo viên bộ môn</option>
                    <option value="TAM_LY">Chuyên viên tâm lý</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Môn học / Lý do bồi dưỡng:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Môn Toán, Môn Ngữ Văn hoặc Lý do cụ thể"
                  value={newTargetReason}
                  onChange={e => setNewTargetReason(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Ghi chú bồi dưỡng:</label>
                <textarea
                  placeholder="Nội dung cần theo dõi đặc biệt..."
                  value={newTargetNotes}
                  onChange={e => setNewTargetNotes(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none h-24"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Ngày bắt đầu bồi dưỡng:</label>
                <input
                  type="date"
                  value={newTargetStartDate}
                  onChange={e => setNewTargetStartDate(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsAddTargetModalOpen(false)}
                className="border hover:bg-slate-100 py-2 px-4 rounded-lg text-sm font-medium transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveTarget}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium shadow-sm transition-all"
              >
                Xác nhận lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Duyệt Đề xuất */}
      {isBulkApproveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                Duyệt Đề xuất bồi dưỡng
              </h2>
              <button onClick={() => setIsBulkApproveModalOpen(false)}>
                <X className="h-5 w-5 text-slate-500 hover:text-slate-800" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex justify-between items-center">
                  <span>Chọn học sinh cần duyệt:</span>
                  <button 
                    onClick={() => {
                      const allPendingIds = targets.filter((t: any) => t.terminationStatus === "ACTIVE" && (!t.assignments || t.assignments.length === 0) && t.status !== "ĐÃ DUYỆT").map((t: any) => t.id)
                      if (selectedDuyetIds.length === allPendingIds.length && allPendingIds.length > 0) setSelectedDuyetIds([])
                      else setSelectedDuyetIds(allPendingIds)
                    }}
                    className="text-indigo-600 text-xs hover:underline"
                  >
                    Chọn tất cả
                  </button>
                </label>
                <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {targets
                    .filter((t: any) => t.terminationStatus === "ACTIVE" && (!t.assignments || t.assignments.length === 0) && t.status !== "ĐÃ DUYỆT")
                    .map((t: any) => (
                      <label key={t.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer border-b last:border-0 border-slate-100">
                        <input
                          type="checkbox"
                          checked={selectedDuyetIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedDuyetIds([...selectedDuyetIds, t.id])
                            else setSelectedDuyetIds(selectedDuyetIds.filter(id => id !== t.id))
                          }}
                          className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-sm text-slate-800">{t.student?.studentName} <span className="text-slate-500 font-normal">({t.student?.studentCode})</span></div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            <span className="font-semibold">{t.supportType === "ACADEMIC" ? "Môn học" : "Tâm lý"}</span>: {t.reason}
                          </div>
                        </div>
                      </label>
                    ))}
                  {targets.filter((t: any) => t.terminationStatus === "ACTIVE" && (!t.assignments || t.assignments.length === 0) && t.status !== "ĐÃ DUYỆT").length === 0 && (
                    <div className="text-center py-4 text-sm text-slate-500">Không có đề xuất nào chờ duyệt.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsBulkApproveModalOpen(false)}
                className="border hover:bg-slate-100 py-2 px-4 rounded-lg text-sm font-medium transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleBulkApprove(false)}
                className="bg-rose-100 text-rose-700 hover:bg-rose-200 py-2 px-4 rounded-lg text-sm font-bold transition-all shadow-sm"
              >
                Không Duyệt
              </button>
              <button
                onClick={() => handleBulkApprove(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg text-sm font-bold shadow-sm transition-all"
              >
                Duyệt Đề xuất
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* 3.5. Modal Phân công GVPT (For Tab 2) */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                Phân công Giáo viên phụ trách
              </h2>
              <button onClick={() => setIsAssignModalOpen(false)}>
                <X className="h-5 w-5 text-slate-500 hover:text-slate-800" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Chọn đối tượng cần hỗ trợ <span className="text-rose-500">*</span></label>
                <select
                  value={assignTargetId}
                  onChange={e => setAssignTargetId(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50"
                >
                  <option value="">-- Chọn đối tượng hỗ trợ --</option>
                  {targets
                    .filter((t: any) => t.terminationStatus === "ACTIVE")
                    .map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.student?.studentName} - {t.student?.studentCode} ({t.supportType === "ACADEMIC" ? "Môn học" : "Tâm lý"})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Giáo viên phụ trách <span className="text-rose-500">*</span></label>
                <select
                  value={assignTeacherId}
                  onChange={e => setAssignTeacherId(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Ghi chú phân công</label>
                <textarea
                  value={assignNotes}
                  onChange={e => setAssignNotes(e.target.value)}
                  placeholder="Nhập ghi chú, nhiệm vụ cụ thể cho giáo viên..."
                  className="w-full rounded-lg border-slate-300 border py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[80px]"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="border hover:bg-slate-100 py-2 px-4 rounded-lg text-sm font-medium transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveAssignment}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-bold shadow-sm transition-all"
              >
                Lưu Phân công
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Quy định Kết quả */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-indigo-600" />
                Thiết lập Quy định Kết quả
              </h2>
              <button onClick={() => setIsConfigModalOpen(false)}>
                <X className="h-5 w-5 text-slate-500 hover:text-slate-800" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Loại bồi dưỡng:</label>
                <select
                  value={configType}
                  onChange={e => setConfigType(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                >
                  <option value="ACADEMIC">Văn hóa (Môn học)</option>
                  <option value="PSYCHOLOGICAL">Hỗ trợ Tâm lý</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Mã kết quả:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: THEO_DOI_SAT, TIEN_BO, DAT_YEU_CAU"
                  value={configCode}
                  onChange={e => setConfigCode(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none font-mono"
                  disabled={!!configId}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Kết quả theo dõi:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cần theo dõi sát, Có tiến bộ, Đạt yêu cầu"
                  value={configLabel}
                  onChange={e => setConfigLabel(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Diễn giải / Ý nghĩa chi tiết:</label>
                <textarea
                  placeholder="Diễn giải quy chuẩn đánh giá..."
                  value={configDesc}
                  onChange={e => setConfigDesc(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none h-24"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="border hover:bg-slate-100 py-2 px-4 rounded-lg text-sm font-medium transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveConfig}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium shadow-sm transition-all"
              >
                Xác nhận lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Phê duyệt kết thúc */}
      {isDuyetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-slate-800">
                Phê duyệt Kết thúc Bồi dưỡng
              </h2>
              <button onClick={() => setIsDuyetModalOpen(false)}>
                <X className="h-5 w-5 text-slate-500 hover:text-slate-800" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-600 text-sm">
                Xác nhận đồng ý kết thúc bồi dưỡng cho học sinh này. Hệ thống sẽ chính thức ẩn học sinh khỏi danh sách kèm cặp hoạt động sau khi phê duyệt.
              </p>
              
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Ghi nhận Kết quả / Diễn giải:</label>
                <textarea
                  value={duyetOutcome}
                  onChange={e => setDuyetOutcome(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none h-24"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsDuyetModalOpen(false)}
                className="border hover:bg-slate-100 py-2 px-4 rounded-lg text-sm font-medium transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDuyet}
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg text-sm font-medium shadow-sm transition-all"
              >
                Xác nhận Duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Dòng thời gian Timeline Đánh giá định kỳ */}
      {selectedTargetForTimeline && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end animate-fade-in">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-slide-in">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Nhật ký Theo dõi chi tiết</h3>
                <p className="text-xs text-slate-500">
                  {selectedTargetForTimeline.student?.studentName} - Lớp {selectedTargetForTimeline.student?.class?.className}
                </p>
              </div>
              <button onClick={() => setSelectedTargetForTimeline(null)}>
                <X className="h-5 w-5 text-slate-500 hover:text-slate-800" />
              </button>
            </div>

            {/* Support target metadata details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-2">
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Chương trình:</span>
                <span className="font-bold text-slate-700">{selectedTargetForTimeline.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý"}</span>
              </div>
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Lý do/Môn:</span>
                <span className="font-semibold text-slate-700">{selectedTargetForTimeline.reason}</span>
              </div>
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Ngày bắt đầu:</span>
                <span className="text-slate-700">{new Date(selectedTargetForTimeline.startDate).toLocaleDateString("vi-VN")}</span>
              </div>
            </div>

            <h4 className="font-bold text-sm text-slate-800 mb-4">Lược sử đánh giá hàng Tuần/Tháng</h4>

            {selectedTargetForTimeline.evaluations?.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Chưa có nhận xét định kỳ nào từ giáo viên phụ trách
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-200 pl-6 space-y-6">
                {selectedTargetForTimeline.evaluations.map((ev: any) => (
                  <div key={ev.id} className="relative">
                    <span className="absolute -left-[31px] top-0.5 bg-indigo-600 rounded-full h-4 w-4 border-2 border-white flex items-center justify-center shadow-xs"></span>
                    <div className="text-xs text-slate-400 font-medium">
                      {new Date(ev.createdAt).toLocaleDateString("vi-VN")} - {ev.periodType === "WEEK" ? "Đánh giá Tuần" : "Đánh giá Tháng"}
                    </div>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">{ev.periodName}</div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
                      <div className="text-xs font-bold text-indigo-700">Mức độ tiến bộ: {ev.trackingLevel}</div>
                      <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">{ev.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawer/Modal: Chi tiết đề xuất theo Giáo viên */}
      {selectedTeacherForDetail && (() => {
        // Filter targets to match current tab's program type in detail view
        const modalTargets = selectedTeacherForDetail.targets.filter((t: any) => {
          if (activeTab === "academic") return t.supportType === "ACADEMIC"
          if (activeTab === "psychology") return t.supportType === "PSYCHOLOGICAL"
          return true
        })

        const pendingModalTargets = modalTargets.filter((t: any) => {
          const isUnapproved = (!t.assignments || t.assignments.length === 0) && t.status !== "ĐÃ DUYỆT"
          return isUnapproved && t.terminationStatus === "ACTIVE"
        })

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-50/50">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-600" />
                    Đề xuất hỗ trợ {activeTab === "academic" ? "Học tập" : "Tâm lý"} từ Giáo viên: {selectedTeacherForDetail.teacherName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tổng số {modalTargets.length} học sinh cần hỗ trợ {activeTab === "academic" ? "học tập" : "tâm lý"}
                  </p>
                </div>
                <button onClick={() => setSelectedTeacherForDetail(null)}>
                  <X className="h-5 w-5 text-slate-500 hover:text-slate-800" />
                </button>
              </div>

              {/* Quick action bar */}
              <div className="px-6 py-3 bg-slate-50 border-b flex justify-between items-center gap-4 flex-wrap">
                <div className="text-sm text-slate-600 font-medium">
                  Tìm thấy {modalTargets.length} đề xuất.
                </div>
                <div className="flex items-center gap-2">
                  {pendingModalTargets.length > 0 && (isGDCS || isKTDBCL) && (
                    <button
                      onClick={async () => {
                        const pendingTargetIds = pendingModalTargets.map((t: any) => t.id)
                        
                        if (pendingTargetIds.length === 0) return
                        if (!confirm(`Bạn có chắc chắn muốn duyệt nhanh tất cả ${pendingTargetIds.length} đề xuất này?`)) return
                        
                        try {
                          setLoading(true)
                          const res = await fetch("/api/ktdbcl/support", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "bulkApproveTargets",
                              academicYearId: selectedYearId,
                              targetIds: pendingTargetIds,
                              approve: true
                            })
                          })
                          const data = await res.json()
                          if (data.error) {
                            toast.error(data.error)
                          } else {
                            toast.success("Đã duyệt tất cả đề xuất thành công!")
                            // Refresh data
                            await fetchAllData()
                            // Close or update modal state
                            setSelectedTeacherForDetail(null)
                          }
                        } catch (e) {
                          toast.error("Lỗi khi duyệt đề xuất")
                        } finally {
                          setLoading(false)
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" /> Duyệt nhanh tất cả ({pendingModalTargets.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Body: Proposals list table */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="border rounded-xl overflow-hidden shadow-xs">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Học sinh</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nguồn đề xuất</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cam kết đầu vào</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Chương trình / Môn</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">GV Phân công</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200 text-xs">
                      {modalTargets.map((t: any) => {
                        const isUnapproved = (!t.assignments || t.assignments.length === 0) && t.status !== "ĐÃ DUYỆT"
                        const progressBadge = t.terminationStatus === "TERMINATED" 
                          ? "bg-emerald-100 text-emerald-800"
                          : t.terminationStatus === "PENDING_TERMINATION"
                          ? "bg-amber-100 text-amber-800 animate-pulse"
                          : isUnapproved
                          ? "bg-blue-50 text-blue-600 border border-blue-200"
                          : "bg-indigo-100 text-indigo-800"

                        const statusText = t.terminationStatus === "TERMINATED"
                          ? "Đã kết thúc"
                          : t.terminationStatus === "PENDING_TERMINATION"
                          ? "Hoàn thành"
                          : isUnapproved
                          ? "Đang đề xuất"
                          : "Đang hỗ trợ"

                        const assignedTeachers = t.assignments?.map((a: any) => a.teacher?.teacherName).filter(Boolean) || []

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                            {/* 1. Học sinh */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-bold text-slate-800">{t.student?.studentName}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {t.student?.studentCode} • Lớp {t.student?.class?.className}
                              </div>
                              <div className="text-[9px] text-slate-400 font-medium">
                                Cơ sở: {t.student?.class?.campus?.campusName || "-"} • Khối {t.student?.class?.className?.match(/^\d+/)?.[0] || t.student?.class?.className || "-"}
                              </div>
                            </td>

                            {/* 2. Nguồn đề xuất */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.sourceType === "GVCN" || t.sourceType === "TAM_LY"
                                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                                  : t.sourceType === "GVBM"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-slate-50 text-slate-700 border border-slate-200"
                              }`}>
                                {t.sourceType === "GVCN" || t.sourceType === "TAM_LY" ? "GV Chủ nhiệm" : t.sourceType === "GVBM" ? "GV Bộ môn" : "Khảo sát đầu vào"}
                              </span>
                            </td>

                            {/* 3. Cam kết đầu vào */}
                            <td className="px-4 py-3">
                              {t.commitmentNote ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                  ⭐ {t.commitmentNote}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">Không có</span>
                              )}
                            </td>

                            {/* 4. Chương trình / Môn */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit ${
                                  t.supportType === "ACADEMIC" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                                }`}>
                                  {t.supportType === "ACADEMIC" ? "Bồi dưỡng học tập" : "Hỗ trợ Tâm lý"}
                                </span>
                                <span className="font-semibold text-slate-700 text-[10px] max-w-[150px] truncate" title={t.reason}>
                                  {t.reason || "-"}
                                </span>
                              </div>
                            </td>

                            {/* 5. GV Phân công */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {assignedTeachers.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[150px]">
                                  {assignedTeachers.map((name, index) => (
                                    <span key={index} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">Chưa phân công</span>
                              )}
                            </td>

                            {/* 6. Trạng thái */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${progressBadge}`}>
                                {statusText}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Approval buttons for GĐCS/BGH */}
                                {isUnapproved && (isGDCS || isKTDBCL) && (
                                  <button
                                    onClick={() => {
                                      setSelectedDuyetIds([t.id])
                                      setIsBulkApproveModalOpen(true)
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded text-[10px] flex items-center gap-0.5 shadow-xs"
                                    title="Duyệt & Phân công"
                                  >
                                    <Check className="h-3 w-3" /> Duyệt
                                  </button>
                                )}

                                {t.terminationStatus === "PENDING_TERMINATION" && (isGDCS || isKTDBCL) && (
                                  <>
                                    <button
                                      onClick={() => handleApproveTermination(t.id, true)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded text-[10px] flex items-center gap-0.5 shadow-xs"
                                      title="Duyệt kết thúc"
                                    >
                                      <Check className="h-3 w-3" /> Duyệt KT
                                    </button>
                                    <button
                                      onClick={() => handleApproveTermination(t.id, false)}
                                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-2 rounded text-[10px] flex items-center gap-0.5 shadow-xs"
                                      title="Từ chối kết thúc"
                                    >
                                      <X className="h-3 w-3" /> Từ chối KT
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() => setSelectedTargetForTimeline(t)}
                                  className="border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-1 px-2.5 rounded text-[10px]"
                                >
                                  Timeline
                                </button>

                                {(isGDCS || isKTDBCL) && (
                                  <button
                                    onClick={() => handleDeleteTarget(t.id)}
                                    className="border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-rose-600 p-1 rounded transition-colors"
                                    title="Xóa đề xuất"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
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
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
                <button
                  onClick={() => setSelectedTeacherForDetail(null)}
                  className="border bg-white hover:bg-slate-100 py-2 px-5 rounded-lg text-sm font-medium transition-all"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    
      {/* Modal: Gửi Email cho Tổ trưởng Chuyên môn (TTCM) */}
      {isEmailTTCMModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#003B3A] to-[#009085] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl">
                  <Mail className="h-6 w-6 text-[#48BFE3]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Gửi Email Danh sách Học sinh Cam kết cho TTCM
                  </h3>
                  <p className="text-xs text-teal-100 mt-0.5">
                    Thông báo danh sách học sinh diện cam kết & theo dõi đầu vào tới Tổ trưởng chuyên môn
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailTTCMModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Select subject to send */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Môn học thông báo:
                  </label>
                  <select
                    value={emailTTCMSubject}
                    onChange={(e) => setEmailTTCMSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  >
                    <option value="ALL">-- Tất cả các môn ({filteredCommitments.length} lượt cam kết) --</option>
                    {uniqueCommitmentSubjects.map(sub => (
                      <option key={sub} value={sub}>
                        Môn {sub} ({filteredCommitments.filter(c => c.committedSubject === sub).length} lượt)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Gửi thêm (CC Emails - cách nhau bởi dấu phẩy):
                  </label>
                  <input
                    type="text"
                    placeholder="vd: bgh@skylineschool.edu.vn, khaothi@skylineschool.edu.vn"
                    value={additionalTTCMCc}
                    onChange={(e) => setAdditionalTTCMCc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* TTCM Recipient List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Chọn Tổ trưởng Chuyên môn (TTCM) người nhận:</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTTCMIds(ttcmList.map(t => t.id))}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold underline"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      onClick={() => setSelectedTTCMIds([])}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-bold underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-48 overflow-y-auto space-y-2">
                  {ttcmList.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 italic">
                      Đang tải hoặc chưa có TTCM nào trong hệ thống...
                    </div>
                  ) : (
                    ttcmList.map((t) => {
                      const isChecked = selectedTTCMIds.includes(t.id)
                      const deptName = t.departmentRel?.name || (t.departmentAssignments?.[0]?.department?.name) || "Tổ chuyên môn"
                      const subName = t.mainSubjectRel?.subjectName || ""

                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedTTCMIds(prev => 
                              prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                            )
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isChecked 
                              ? "bg-white border-emerald-500 shadow-xs ring-1 ring-emerald-500/20" 
                              : "bg-white/60 border-slate-200 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                            />
                            <div>
                              <div className="font-bold text-slate-800 flex items-center gap-2">
                                <span>{t.teacherName}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 font-bold">
                                  {t.position || "TTCM"}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {deptName} {subName ? `• Môn ${subName}` : ""} {t.campus?.campusName ? `• ${t.campus.campusName}` : ""}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-[11px] text-indigo-600 font-semibold">{t.email || "Chưa có email"}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Custom Message */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Ghi chú & Lời nhắn bổ sung từ BGH / Ban Khảo thí (Tùy chọn):
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập hướng dẫn hoặc lưu ý gửi kèm cho TTCM (vd: Kính đề nghị Quý Thầy Cô rà soát và lập kế hoạch phụ đạo cho học sinh trước ngày 15 hàng tháng...)"
                  value={customTTCMMessage}
                  onChange={(e) => setCustomTTCMMessage(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Preview info banner */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-emerald-900">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Số lượng người nhận:</span> <span className="font-extrabold">{selectedTTCMIds.length} TTCM</span> | 
                    <span className="font-bold ml-2">Số lượng HS đính kèm:</span> <span className="font-extrabold">{filteredCommitments.length} lượt</span>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-700 italic">
                  Template chuẩn giao diện Sky-Line
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEmailTTCMModalOpen(false)}
                disabled={sendingTTCMEmall}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSendCommitmentEmail}
                disabled={sendingTTCMEmall || selectedTTCMIds.length === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {sendingTTCMEmall ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Đang gửi email...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>🚀 Xác nhận Gửi Email cho TTCM</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

</div>
  )
}
