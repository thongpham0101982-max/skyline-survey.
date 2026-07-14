"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  FileText, Users, Plus, Search, Check, RefreshCw, X, Calendar, 
  MessageSquare, TrendingUp, CheckCircle, AlertTriangle, AlertCircle, Clock
} from "lucide-react"
import toast from "react-hot-toast"

interface Props {
  teacher: any
  academicYears: any[]
  homeroomClasses: any[]
  subjects: any[]
}

export function TeacherSupportClient({
  teacher,
  academicYears,
  homeroomClasses,
  subjects
}: Props) {
  const router = useRouter()

  // Select Year State
  const [selectedYearId, setSelectedYearId] = useState(
    academicYears[0]?.id || ""
  )
  const [activeSubTab, setActiveSubTab] = useState<"assigned" | "history">("assigned")

  // Data states loaded dynamically
  const [configs, setConfigs] = useState<any[]>([])
  const [targets, setTargets] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Filters for teacher page
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"ALL" | "HOMEROOM" | "ASSIGNED">("ALL")

  // Modal Open States
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false)
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false)
  const [isRequestTermModalOpen, setIsRequestTermModalOpen] = useState(false)

  // Propose Form States
  const [proposeClassId, setProposeClassId] = useState("")
  const [assignedClasses, setAssignedClasses] = useState<any[]>([])
  const [classStudents, setClassStudents] = useState<any[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [loadingClassesOfTeacher, setLoadingClassesOfTeacher] = useState(false)
  const [loadingStudentsOfClass, setLoadingStudentsOfClass] = useState(false)
  const [proposeType, setProposeType] = useState("ACADEMIC")
  const [proposeReason, setProposeReason] = useState("")
  const [proposeNotes, setProposeNotes] = useState("")

  // Evaluation Form States
  const [evalTargetId, setEvalTargetId] = useState("")
  const [evalTargetName, setEvalTargetName] = useState("")
  const [evalTargetType, setEvalTargetType] = useState("")
  const [evalPeriodType, setEvalPeriodType] = useState("WEEK")
  const [evalPeriodName, setEvalPeriodName] = useState("Tuần 1")
  const [evalTrackingLevel, setEvalTrackingLevel] = useState("")
  const [evalComment, setEvalComment] = useState("")
  const [evalUpdatedStatus, setEvalUpdatedStatus] = useState("TIẾP TỤC THEO TUẦN")

  // Request Termination Form States
  const [termTargetId, setTermTargetId] = useState("")
  const [termOutcome, setTermOutcome] = useState("Học sinh tiến bộ vượt bậc, đạt yêu cầu")
  const [termNotes, setTermNotes] = useState("")

  const fetchAssignedClasses = async () => {
    setLoadingClassesOfTeacher(true)
    try {
      const res = await fetch(`/api/teacher-student-records?action=getAssignedClasses&academicYearId=${selectedYearId}`)
      const data = await res.json()
      if (!data.error) {
        setAssignedClasses(data)
        if (data.length > 0) {
          setProposeClassId(data[0].id)
          fetchClassStudents(data[0].id, data)
        } else {
          setProposeClassId("")
          setClassStudents([])
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingClassesOfTeacher(false)
    }
  }

  const fetchClassStudents = async (classId: string, currentClasses = assignedClasses) => {
    if (!classId) return
    setLoadingStudentsOfClass(true)
    setSelectedStudentIds([])
    try {
      const res = await fetch(`/api/teacher-student-records?action=getClassStudents&classId=${classId}`)
      const data = await res.json()
      if (!data.error) {
        setClassStudents(data)
      }
      
      // Auto-populate default subject
      const selectedClassObj = currentClasses.find(c => c.id === classId)
      const classSubjects = selectedClassObj?.subjects || []
      if (classSubjects.length > 0) {
        setProposeReason(classSubjects[0].subjectName || classSubjects[0].name || "")
      } else {
        setProposeReason("")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStudentsOfClass(false)
    }
  }

  // Fetch initial configs & targets on selectYearId change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedYear = localStorage.getItem("academicYearId")
      if (storedYear && academicYears.some(y => y.id === storedYear)) {
        setSelectedYearId(storedYear)
      }
    }
  }, [academicYears])

  const fetchTeacherData = async () => {
    if (!selectedYearId) return
    setLoading(true)
    try {
      // 1. Fetch configs
      const resConfig = await fetch(
        `/api/ktdbcl/support?action=getConfigs&academicYearId=${selectedYearId}`
      )
      const dataConfig = await resConfig.json()
      if (!dataConfig.error) setConfigs(dataConfig)

      // 2. Fetch targets
      const resTargets = await fetch(
        `/api/ktdbcl/support?action=getTargets&academicYearId=${selectedYearId}`
      )
      const dataTargets = await resTargets.json()
      if (!dataTargets.error) setTargets(dataTargets)
    } catch (e: any) {
      toast.error("Lỗi tải dữ liệu: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeacherData()
  }, [selectedYearId])

  // Local storage year sync listener
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

  // Submit new learning support proposal for multiple selected students
  const handlePropose = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một học sinh để đề xuất")
      return
    }
    if (!proposeReason) {
      toast.error("Vui lòng điền môn học hoặc lý do bồi dưỡng")
      return
    }
    setLoading(true)
    try {
      let successCount = 0
      let failCount = 0
      for (const studentId of selectedStudentIds) {
        try {
          const res = await fetch("/api/ktdbcl/support", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "saveTarget",
              academicYearId: selectedYearId,
              studentId,
              supportType: proposeType,
              sourceType: proposeType === "ACADEMIC" ? "GVBM" : "TAM_LY",
              reason: proposeReason,
              notes: proposeNotes,
              status: "TIẾP TỤC THEO TUẦN"
            })
          })
          const data = await res.json()
          if (data.error) {
            failCount++
          } else {
            successCount++
          }
        } catch (e) {
          failCount++
        }
      }

      if (successCount > 0) {
        toast.success(`Đề xuất thành công ${successCount} học sinh!`)
      }
      if (failCount > 0) {
        toast.error(`Đề xuất thất bại ${failCount} học sinh.`)
      }

      setIsProposeModalOpen(false)
      fetchTeacherData()
    } catch (e) {
      toast.error("Gửi đề xuất bồi dưỡng học sinh thất bại")
    } finally {
      setLoading(false)
    }
  }

  // Submit weekly/monthly evaluation
  const handleSaveEvaluation = async () => {
    if (!evalTrackingLevel || !evalComment) {
      toast.error("Vui lòng chọn mức độ kết quả theo dõi và nhập nhận xét chi tiết")
      return
    }
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveEvaluation",
          academicYearId: selectedYearId,
          targetId: evalTargetId,
          periodType: evalPeriodType,
          periodName: evalPeriodName,
          trackingLevel: evalTrackingLevel,
          comment: evalComment,
          updatedStatus: evalUpdatedStatus
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success("Ghi nhận đánh giá thành công!")
        setIsEvaluationModalOpen(false)
        fetchTeacherData()
      }
    } catch (e) {
      toast.error("Lưu nhận xét thất bại")
    }
  }

  // Request termination of support
  const handleRequestTermination = async () => {
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "requestTermination",
          academicYearId: selectedYearId,
          id: termTargetId,
          outcome: termOutcome,
          notes: termNotes
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success("Đã gửi yêu cầu kết thúc bồi dưỡng đến Giám đốc Cơ sở!")
        setIsRequestTermModalOpen(false)
        fetchTeacherData()
      }
    } catch (e) {
      toast.error("Gửi yêu cầu thất bại")
    }
  }

  // Filter students related to this teacher
  const filteredTargets = targets.filter(t => {
    // Check if homeroom or assigned
    const isHomeroomStudent = homeroomClasses.some(c => c.students.some((s: any) => s.id === t.studentId))
    const isAssigned = t.assignments?.some((a: any) => a.teacherId === teacher.id)

    // Apply role filter
    if (roleFilter === "HOMEROOM" && !isHomeroomStudent) return false
    if (roleFilter === "ASSIGNED" && !isAssigned) return false
    if (roleFilter === "ALL" && !isHomeroomStudent && !isAssigned) return false

    // Apply search query
    const name = t.student?.studentName || ""
    const code = t.student?.studentCode || ""
    const matchesSearch = searchQuery === "" || 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  // Proposal history filter
  const historyTargets = targets.filter(t => {
    const isProposedByMe = t.createdById === teacher.id
    if (!isProposedByMe) return false
    const name = t.student?.studentName || ""
    const code = t.student?.studentCode || ""
    return searchQuery === "" || 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Options for tracking level loaded dynamically based on configs
  const dynamicLevelOptions = configs.filter(c => c.supportType === evalTargetType)

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="h-9 w-9 text-indigo-600" />
            Cổng Hỗ trợ học tập (Giáo viên)
          </h1>
          <p className="text-slate-500 mt-1">
            Đề xuất học sinh cần bồi dưỡng, ghi nhận đánh giá tuần/tháng và đề xuất kết thúc
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
        </div>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveSubTab("assigned")}
          className={`py-3 px-1 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "assigned"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          Học sinh được phân công phụ đạo / chủ nhiệm
        </button>
        <button
          onClick={() => setActiveSubTab("history")}
          className={`py-3 px-1 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "history"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="h-4 w-4" />
          Lược sử đề xuất bồi dưỡng
        </button>
      </div>

      {/* Action panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setProposeClassId("")
              setClassStudents([])
              setSelectedStudentIds([])
              setProposeReason("")
              setProposeNotes("")
              setIsProposeModalOpen(true)
              fetchAssignedClasses()
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            Đề xuất Bổ sung Học sinh hỗ trợ
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeSubTab === "assigned" && (
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as any)}
              className="rounded-lg border-slate-300 border py-1.5 px-3 focus:outline-none text-xs"
            >
              <option value="ALL">Toàn bộ học sinh phụ trách</option>
              <option value="HOMEROOM">Học sinh lớp Chủ nhiệm</option>
              <option value="ASSIGNED">Học sinh kèm phụ đạo</option>
            </select>
          )}

          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm học sinh..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="rounded-lg border-slate-300 border py-1.5 pl-8 pr-3 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Main Student Target List Taught/Assigned */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      ) : activeSubTab === "assigned" ? (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Học sinh</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Lớp</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Chương trình hỗ trợ</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái bồi dưỡng</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mức độ theo dõi hiện tại</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredTargets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Không tìm thấy học sinh nào thuộc danh sách bồi dưỡng của bạn
                  </td>
                </tr>
              ) : (
                filteredTargets.map((t: any) => {
                  const isAssigned = t.assignments?.some((a: any) => a.teacherId === teacher.id)
                  const isTerminated = t.terminationStatus === "TERMINATED"
                  const isPending = t.terminationStatus === "PENDING_TERMINATION"

                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{t.student?.studentName}</div>
                        <div className="text-xs text-slate-500">{t.student?.studentCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {t.student?.class?.className}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                          t.supportType === "ACADEMIC" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}>
                          {t.supportType === "ACADEMIC" ? t.reason : "Tâm lý học đường"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          isTerminated ? "bg-emerald-100 text-emerald-800" : isPending ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                        }`}>
                          {isTerminated ? "Hoàn thành bồi dưỡng" : isPending ? "Chờ duyệt kết thúc" : t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-semibold">
                        {isTerminated ? t.outcome : t.status}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                        {isAssigned && !isTerminated && !isPending && (
                          <>
                            <button
                              onClick={() => {
                                setEvalTargetId(t.id)
                                setEvalTargetName(t.student?.studentName)
                                setEvalTargetType(t.supportType)
                                setEvalComment("")
                                // Pick first config option as default
                                const options = configs.filter(c => c.supportType === t.supportType)
                                setEvalTrackingLevel(options[0]?.outcomeLabel || "")
                                setIsEvaluationModalOpen(true)
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1 px-3 rounded-lg text-xs transition-all shadow-xs"
                            >
                              Nhận xét & Đánh giá
                            </button>

                            <button
                              onClick={() => {
                                setTermTargetId(t.id)
                                setTermNotes("")
                                setIsRequestTermModalOpen(true)
                              }}
                              className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium py-1 px-3 rounded-lg text-xs transition-all"
                            >
                              Đề xuất kết thúc
                            </button>
                          </>
                        )}
                        {(isTerminated || isPending) && (
                          <span className="text-xs text-slate-400 font-medium">Không thể thao tác</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Học sinh</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Lớp</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Chương trình hỗ trợ</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Môn/Lý do đề xuất</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày đề xuất</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái bồi dưỡng</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">GV Phụ trách (GVPT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {historyTargets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Bạn chưa gửi đề xuất bồi dưỡng nào trong năm học này.
                  </td>
                </tr>
              ) : (
                historyTargets.map((t: any) => {
                  const isTerminated = t.terminationStatus === "TERMINATED"
                  const isPending = t.terminationStatus === "PENDING_TERMINATION"
                  const gvName = t.assignments?.map((a: any) => a.teacher?.teacherName).join(', ') || "Chưa phân công"

                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{t.student?.studentName}</div>
                        <div className="text-xs text-slate-500">{t.student?.studentCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {t.student?.class?.className}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                          t.supportType === "ACADEMIC" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}>
                          {t.supportType === "ACADEMIC" ? "Bồi dưỡng Văn hóa" : "Hỗ trợ Tâm lý"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-semibold">
                        {t.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs">
                        {new Date(t.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          isTerminated ? "bg-emerald-100 text-emerald-800" : isPending ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                        }`}>
                          {isTerminated ? "Hoàn thành bồi dưỡng" : isPending ? "Chờ duyệt kết thúc" : t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-xs">
                        {gvName}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- TEACHER MODALS SECTION --- */}

      {/* 1. Modal Đề xuất học sinh bồi dưỡng */}
      {isProposeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                Đề xuất Học sinh cần Hỗ trợ học tập
              </h2>
              <button onClick={() => setIsProposeModalOpen(false)}>
                <X className="h-5 w-5 text-slate-500 hover:text-slate-800" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Select class */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Chọn lớp được phân công giảng dạy/chủ nhiệm:</label>
                {loadingClassesOfTeacher ? (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 py-1">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Đang tải danh sách lớp...
                  </div>
                ) : (
                  <select
                    value={proposeClassId}
                    onChange={e => {
                      setProposeClassId(e.target.value)
                      fetchClassStudents(e.target.value)
                    }}
                    className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {assignedClasses.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.className} {c.isHomeroom ? "(Lớp chủ nhiệm)" : "(Lớp giảng dạy)"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Multiple selection of students */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 flex justify-between items-center">
                  <span>Chọn học sinh cần hỗ trợ (Chọn một hoặc nhiều em):</span>
                  {classStudents.length > 0 && (() => {
                    const eligibleStudents = classStudents.filter(s => {
                      return !targets.some(t => t.studentId === s.id && t.supportType === proposeType)
                    })
                    if (eligibleStudents.length === 0) return null
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedStudentIds.length === eligibleStudents.length) {
                            setSelectedStudentIds([])
                          } else {
                            setSelectedStudentIds(eligibleStudents.map(s => s.id))
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold"
                      >
                        {selectedStudentIds.length === eligibleStudents.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                      </button>
                    )
                  })()}
                </label>

                {loadingStudentsOfClass ? (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 py-1">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Đang tải danh sách học sinh...
                  </div>
                ) : classStudents.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-2">
                    {proposeClassId ? "Không có học sinh nào trong lớp này." : "Vui lòng chọn lớp học trước."}
                  </div>
                ) : (
                  <div className="border rounded-lg max-h-36 overflow-y-auto p-2 space-y-1.5 bg-slate-50">
                    {classStudents.map((s: any) => {
                      const isAlreadyTarget = targets.some(t => t.studentId === s.id && t.supportType === proposeType)
                      const isChecked = selectedStudentIds.includes(s.id)
                      return (
                        <label 
                          key={s.id} 
                          className={`flex items-center gap-2 text-xs font-medium p-1 rounded ${
                            isAlreadyTarget ? "opacity-50 cursor-not-allowed bg-slate-100/60" : "text-slate-700 cursor-pointer hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAlreadyTarget ? false : isChecked}
                            disabled={isAlreadyTarget}
                            onChange={() => {
                              if (isAlreadyTarget) return
                              if (isChecked) {
                                setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id))
                              } else {
                                setSelectedStudentIds([...selectedStudentIds, s.id])
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 disabled:opacity-50"
                          />
                          <span>
                            {s.studentName} ({s.studentCode})
                            {isAlreadyTarget && (
                              <span className="ml-1.5 text-[10px] text-amber-600 font-extrabold">
                                ({proposeType === "ACADEMIC" ? "Đang bồi dưỡng môn học" : "Đang được hỗ trợ tâm lý"})
                              </span>
                            )}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Loại bồi dưỡng:</label>
                <select
                  value={proposeType}
                  onChange={e => setProposeType(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                >
                  <option value="ACADEMIC">Văn hóa (Môn học)</option>
                  <option value="PSYCHOLOGICAL">Hỗ trợ Tâm lý</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Môn học bồi dưỡng (Lý do cụ thể):</label>
                {proposeType === "ACADEMIC" ? (
                  <div className="space-y-1">
                    {/* If teacher teaches subjects in this class, show a dropdown with those subjects */}
                    {(() => {
                      const selClassObj = assignedClasses.find(c => c.id === proposeClassId)
                      const classSubjects = selClassObj?.subjects || []
                      if (classSubjects.length > 0) {
                        return (
                          <select
                            value={proposeReason}
                            onChange={e => setProposeReason(e.target.value)}
                            className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                          >
                            {classSubjects.map((sub: any) => (
                              <option key={sub.id} value={sub.subjectName || sub.name}>
                                {sub.subjectName || sub.name}
                              </option>
                            ))}
                            <option value="Khác">Khác...</option>
                          </select>
                        )
                      }
                      return (
                        <input
                          type="text"
                          placeholder="Ví dụ: Môn Toán, môn Tiếng Anh..."
                          value={proposeReason}
                          onChange={e => setProposeReason(e.target.value)}
                          className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                        />
                      )
                    })()}
                    
                    {proposeReason === "Khác" && (
                      <input
                        type="text"
                        placeholder="Nhập tên môn học khác..."
                        onChange={e => setProposeReason(e.target.value)}
                        className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none mt-1.5"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Mô tả lý do tâm lý..."
                    value={proposeReason}
                    onChange={e => setProposeReason(e.target.value)}
                    className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Ghi chú bồi dưỡng ban đầu:</label>
                <textarea
                  placeholder="Mô tả các biểu hiện học lực, tâm lý cần hỗ trợ..."
                  value={proposeNotes}
                  onChange={e => setProposeNotes(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none h-20"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsProposeModalOpen(false)}
                className="border hover:bg-slate-100 py-2 px-4 rounded-lg text-sm font-medium transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handlePropose}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium shadow-sm transition-all"
              >
                Gửi đề xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Nhận xét & Đánh giá tuần/tháng */}
      {isEvaluationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-slate-800">
                Đánh giá định kỳ: {evalTargetName}
              </h2>
              <button onClick={() => setIsEvaluationModalOpen(false)}>
                <X className="h-5 w-5 text-slate-500 hover:text-slate-800" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Kỳ đánh giá:</label>
                  <select
                    value={evalPeriodType}
                    onChange={e => setEvalPeriodType(e.target.value)}
                    className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                  >
                    <option value="WEEK">Tuần</option>
                    <option value="MONTH">Tháng</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Tên kỳ (Ví dụ: Tuần 1, Tháng 10):</label>
                  <input
                    type="text"
                    value={evalPeriodName}
                    onChange={e => setEvalPeriodName(e.target.value)}
                    className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Mức độ kết quả theo dõi (Cấu hình động):</label>
                <select
                  value={evalTrackingLevel}
                  onChange={e => setEvalTrackingLevel(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                >
                  <option value="">-- Chọn kết quả --</option>
                  {dynamicLevelOptions.map(c => (
                    <option key={c.id} value={c.outcomeLabel}>{c.outcomeLabel} ({c.description})</option>
                  ))}
                  {dynamicLevelOptions.length === 0 && (
                    <>
                      <option value="Cần theo dõi sát">Cần theo dõi sát</option>
                      <option value="Có tiến bộ">Có tiến bộ</option>
                      <option value="Đạt yêu cầu">Đạt yêu cầu</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Nhận xét chi tiết học lực/tâm lý:</label>
                <textarea
                  placeholder="Ghi cụ thể các nội dung đã kèm cặp và biểu hiện của học sinh..."
                  value={evalComment}
                  onChange={e => setEvalComment(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none h-24"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Trạng thái bồi dưỡng tiếp theo:</label>
                <select
                  value={evalUpdatedStatus}
                  onChange={e => setEvalUpdatedStatus(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                >
                  <option value="TIẾP TỤC THEO TUẦN">Tiếp tục bồi dưỡng theo Tuần</option>
                  <option value="TIẾP TỤC THEO THÁNG">Tiếp tục bồi dưỡng theo Tháng</option>
                  <option value="TIẾP TỤC THEO HỌC KỲ">Tiếp tục bồi dưỡng theo Học kỳ</option>
                  <option value="TIẾP TỤC THEO NĂM HỌC">Tiếp tục bồi dưỡng theo Năm học</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsEvaluationModalOpen(false)}
                className="border hover:bg-slate-100 py-2 px-4 rounded-lg text-sm font-medium transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveEvaluation}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium shadow-sm transition-all"
              >
                Lưu Đánh giá
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Đề xuất kết thúc bồi dưỡng */}
      {isRequestTermModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-50">
              <h2 className="text-lg font-bold text-slate-800">
                Đề xuất Kết thúc bồi dưỡng
              </h2>
              <button onClick={() => setIsRequestTermModalOpen(false)}>
                <X className="h-5 w-5 text-slate-500 hover:text-slate-800" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Kết quả bồi dưỡng:</label>
                <input
                  type="text"
                  value={termOutcome}
                  onChange={e => setTermOutcome(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Ghi chú bổ sung:</label>
                <textarea
                  placeholder="Ghi nhận các điểm nổi bật hoặc lý do đề xuất hoàn thành kèm cặp..."
                  value={termNotes}
                  onChange={e => setTermNotes(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none h-24"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsRequestTermModalOpen(false)}
                className="border hover:bg-slate-100 py-2 px-4 rounded-lg text-sm font-medium transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleRequestTermination}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium shadow-sm transition-all"
              >
                Gửi đề xuất kết thúc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
