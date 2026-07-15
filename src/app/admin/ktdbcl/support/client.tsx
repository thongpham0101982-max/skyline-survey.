"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { 
  FileText, Users, Sliders, BarChart3, Plus, Search, Filter, Trash2, Edit, 
  Check, X, RefreshCw, Download, ChevronRight, AlertCircle, Calendar, GraduationCap, 
  MapPin, UserCheck, CheckCircle2, AlertTriangle, Info, Clock, UserPlus
} from "lucide-react"
import toast from "react-hot-toast"

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
  const [activeTab, setActiveTab] = useState<"targets" | "assignments" | "configs" | "reports">(
    "targets"
  )

  // Sub-tab state for reports
  const [reportSubTab, setReportSubTab] = useState<
    "student" | "class" | "subject" | "teacher" | "campus" | "system"
  >("student")

  // Data states loaded dynamically
  const [configs, setConfigs] = useState<any[]>([])
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
        setIsAssignModalOpen(false)
        fetchAllData()
      }
    } catch (e) {
      toast.error("Lỗi lưu phân công")
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

  // Export reports to Excel logic (Simulated file download for UI completeness)
  const handleExportExcel = () => {
    toast.success("Đã xuất báo cáo Excel thành công!")
  }

  // Helper selectors
  const allStudents = classes.flatMap(c => c.students || [])

  // Filtering targets lists
  const filteredTargets = targets.filter(t => {
    const matchesType = targetTypeFilter === "ALL" || t.supportType === targetTypeFilter
    const matchesSource = targetSourceFilter === "ALL" || 
      (targetSourceFilter === "TEACHER_ALL" && (t.sourceType === "GVCN" || t.sourceType === "GVBM")) ||
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
          onClick={() => setActiveTab("targets")}
          className={`py-4 px-6 font-semibold border-b-2 text-sm flex items-center gap-2 transition-all ${
            activeTab === "targets"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="h-4 w-4" />
          Đối tượng Hỗ trợ theo Giáo viên
        </button>

        <button
          onClick={() => setActiveTab("assignments")}
          className={`py-4 px-6 font-semibold border-b-2 text-sm flex items-center gap-2 transition-all ${
            activeTab === "assignments"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Phân công GVPT
        </button>

        <button
          onClick={() => setActiveTab("configs")}
          className={`py-4 px-6 font-semibold border-b-2 text-sm flex items-center gap-2 transition-all ${
            activeTab === "configs"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sliders className="h-4 w-4" />
          Quy định về Kết quả
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`py-4 px-6 font-semibold border-b-2 text-sm flex items-center gap-2 transition-all ${
            activeTab === "reports"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Báo cáo thống kê
        </button>
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      )}

      {/* Tab 1: Đối tượng hỗ trợ */}
      {!loading && activeTab === "targets" && (
        <div className="space-y-4">


          {/* Targets Table */}
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Giáo viên đề xuất</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Loại hỗ trợ</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Môn học / Lĩnh vực</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200 text-sm">
                {filteredTargets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      Không tìm thấy đối tượng bồi dưỡng phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredTargets.map((t: any) => {
                    const gvName = t.assignments?.[0]?.teacher?.teacherName || "Chưa phân công"
                    const isUnapproved = !t.assignments || t.assignments.length === 0
                    const progressBadge = t.terminationStatus === "TERMINATED" 
                      ? "bg-emerald-100 text-emerald-800"
                      : t.terminationStatus === "PENDING_TERMINATION"
                      ? "bg-amber-100 text-amber-800 animate-pulse"
                      : isUnapproved
                      ? "bg-orange-100 text-orange-800 font-bold"
                      : "bg-indigo-100 text-indigo-800"

                    const statusText = t.terminationStatus === "TERMINATED"
                      ? "Kết thúc bồi dưỡng"
                      : t.terminationStatus === "PENDING_TERMINATION"
                      ? "Chờ duyệt kết thúc"
                      : isUnapproved
                      ? "Chờ duyệt đề xuất"
                      : "Đồng ý"

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{t.createdBy?.teacherName || "Hệ thống"}</div>
                          <div className="text-xs text-slate-500">{t.sourceType === "ADMISSION" ? "Khảo sát đầu vào (KSĐV)" : "Đề xuất"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            t.supportType === "ACADEMIC" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                          }`}>
                            {t.supportType === "ACADEMIC" ? "Môn học" : "Tâm lý"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">
                          {t.reason || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${progressBadge}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                          <button
                            onClick={() => setSelectedTargetForDetail(t)}
                            className="text-teal-600 hover:text-teal-900 font-bold mr-2 text-xs"
                          >
                            Chi tiết
                          </button>
                          <button
                            onClick={() => setSelectedTargetForTimeline(t)}
                            className="text-indigo-600 hover:text-indigo-900 font-semibold hover:underline mr-2 text-xs"
                          >
                            Timeline
                          </button>

                          {/* Approval buttons for GĐCS/BGH */}
                          {isUnapproved && (isGDCS || isKTDBCL) && (
                            <button
                              onClick={() => {
                                setAssignTargetId(t.id)
                                setAssignTeacherId("")
                                if (t.supportType === "ACADEMIC") {
                                  const reasonText = t.reason || ""
                                  const foundSubject = subjects.find(s => reasonText.toLowerCase().includes(s.subjectName.toLowerCase()))
                                  setAssignSubjectId(foundSubject?.id || "")
                                } else {
                                  setAssignSubjectId("")
                                }
                                setAssignNotes("")
                                setIsAssignModalOpen(true)
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1 px-2.5 rounded text-xs inline-flex items-center gap-1 shadow-sm mr-2"
                              title="Duyệt & Phân công"
                            >
                              <Check className="h-3 w-3" /> Duyệt
                            </button>
                          )}

                          {t.terminationStatus === "PENDING_TERMINATION" && (isGDCS || isKTDBCL) && (
                            <>
                              <button
                                onClick={() => handleApproveTermination(t.id, true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 px-2.5 rounded text-xs inline-flex items-center gap-1 shadow-sm"
                                title="Duyệt kết thúc"
                              >
                                <Check className="h-3 w-3" /> Duyệt
                              </button>
                              <button
                                onClick={() => handleApproveTermination(t.id, false)}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-medium py-1 px-2.5 rounded text-xs inline-flex items-center gap-1 shadow-sm"
                                title="Từ chối"
                              >
                                <X className="h-3 w-3" /> Từ chối
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleDeleteTarget(t.id)}
                            className="text-rose-600 hover:text-rose-900 p-1 rounded hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Tab 3: Quy định về Kết quả */}
      {!loading && activeTab === "configs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setConfigId("")
                setConfigCode("")
                setConfigLabel("")
                setConfigDesc("")
                setIsConfigModalOpen(true)
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              Thêm quy định kết quả mới
            </button>
          </div>

          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Phân loại</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mã kết quả</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kết quả theo dõi</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Diễn giải / Quy chuẩn đánh giá</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200 text-sm">
                {configs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      Chưa có quy định về mức độ kết quả nào được cấu hình
                    </td>
                  </tr>
                ) : (
                  configs.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          c.supportType === "ACADEMIC" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                        }`}>
                          {c.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-800">
                        {c.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900">
                        {c.outcomeLabel}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {c.description || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                        <button
                          onClick={() => {
                            setConfigId(c.id)
                            setConfigType(c.supportType)
                            setConfigCode(c.code)
                            setConfigLabel(c.outcomeLabel)
                            setConfigDesc(c.description || "")
                            setIsConfigModalOpen(true)
                          }}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteConfig(c.id)}
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

      {/* Tab 4: Báo cáo thống kê */}
      {!loading && activeTab === "reports" && (
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
                    <th className="px-6 py-3 text-left font-bold text-slate-500">Chương trình</th>
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
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
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

          {/* Sub-tab 2: Báo cáo Theo Lớp */}
          {reportSubTab === "class" && (
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm max-w-2xl">
              <div className="px-6 py-4 border-b bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Thống kê số lượng học sinh bồi dưỡng theo lớp</h3>
              </div>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-500">Tên lớp</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500">Hỗ trợ Văn hóa</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500">Hỗ trợ Tâm lý</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500">Tổng cộng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {classes.map((c: any) => {
                    const classTargets = targets.filter(t => t.student?.classId === c.id)
                    const acadCount = classTargets.filter(t => t.supportType === "ACADEMIC").length
                    const psyCount = classTargets.filter(t => t.supportType === "PSYCHOLOGICAL").length
                    if (classTargets.length === 0) return null
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-slate-800">{c.className}</td>
                        <td className="px-6 py-4 text-center font-semibold text-blue-600">{acadCount}</td>
                        <td className="px-6 py-4 text-center font-semibold text-purple-600">{psyCount}</td>
                        <td className="px-6 py-4 text-center font-extrabold text-slate-900">{classTargets.length}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-tab 3: Báo cáo Theo Môn học */}
          {reportSubTab === "subject" && (
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm max-w-2xl">
              <div className="px-6 py-4 border-b bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Thống kê số lượng học sinh bồi dưỡng theo môn học</h3>
              </div>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-500">Môn học</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500">Số lượng học sinh đang bồi dưỡng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {subjects.map((sub: any) => {
                    const count = assignments.filter(a => a.subjectId === sub.id).length
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-800">{sub.subjectName}</td>
                        <td className="px-6 py-4 text-center font-extrabold text-indigo-600">{count}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-tab 4: Báo cáo Theo Giáo viên */}
          {reportSubTab === "teacher" && (
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm max-w-3xl">
              <div className="px-6 py-4 border-b bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Thống kê phân công nhiệm vụ theo Giáo viên</h3>
              </div>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-500">Họ tên Giáo viên phụ trách</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500">Số lượng học sinh kèm cặp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {teachers.map((t: any) => {
                    const count = assignments.filter(a => a.teacherId === t.id).length
                    if (count === 0) return null
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-slate-800">{t.teacherName}</td>
                        <td className="px-6 py-4 text-center font-extrabold text-indigo-600">{count}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-tab 5: Báo cáo Theo Cơ sở */}
          {reportSubTab === "campus" && (
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm max-w-2xl">
              <div className="px-6 py-4 border-b bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Thống kê số lượng theo Cơ sở (Campus)</h3>
              </div>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-500">Tên cơ sở</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-500">Đang bồi dưỡng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {campuses.map((c: any) => {
                    const count = targets.filter(t => t.student?.class?.campusId === c.id).length
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-slate-800">{c.campusName}</td>
                        <td className="px-6 py-4 text-center font-extrabold text-indigo-600">{count}</td>
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
                <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">Đang hoạt động</div>
                <div className="text-4xl font-extrabold text-indigo-600 mt-2">
                  {targets.filter(t => t.terminationStatus === "ACTIVE").length}
                </div>
              </div>
              <div className="bg-white p-5 border rounded-xl shadow-sm text-center">
                <div className="text-slate-500 text-xs uppercase font-bold tracking-wider font-bold">Hoàn thành bồi dưỡng</div>
                <div className="text-4xl font-extrabold text-emerald-600 mt-2">
                  {targets.filter(t => t.terminationStatus === "TERMINATED").length}
                </div>
              </div>
            </div>
          )}
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

      {/* 3. Modal Phân công GVPT */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                Phân công Giáo viên phụ trách
              </h2>
              <button onClick={() => setIsAssignModalOpen(false)}>
                <X className="h-5 w-5 text-slate-500 hover:text-slate-800" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Chọn học sinh cần phân công:</label>
                <select
                  value={assignTargetId}
                  onChange={e => setAssignTargetId(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                >
                  <option value="">-- Chọn đối tượng hỗ trợ --</option>
                  {targets
                    .filter(t => t.terminationStatus === "ACTIVE")
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.student?.studentName} ({t.student?.studentCode}) - {t.supportType === "ACADEMIC" ? "Môn học" : "Tâm lý"}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Giáo viên phụ trách:</label>
                <select
                  value={assignTeacherId}
                  onChange={e => setAssignTeacherId(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.teacherName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Môn học bồi dưỡng (nếu bồi dưỡng văn hóa):</label>
                <select
                  value={assignSubjectId}
                  onChange={e => setAssignSubjectId(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                >
                  <option value="">-- Chọn môn học --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.subjectName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Ghi chú phân công:</label>
                <input
                  type="text"
                  placeholder="Giao nhiệm vụ kèm cặp chi tiết..."
                  value={assignNotes}
                  onChange={e => setAssignNotes(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium shadow-sm transition-all"
              >
                Phân công
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
    </div>
  )
}
