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
  const [activeSubTab, setActiveSubTab] = useState<"assigned" | "commitments" | "history">("assigned")
  const [entranceCommitmentStudents, setEntranceCommitmentStudents] = useState<any[]>([])
  const [loadingEntranceCommitments, setLoadingEntranceCommitments] = useState(false)

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
  const [proposeAcademic, setProposeAcademic] = useState(true)
  const [proposePsychological, setProposePsychological] = useState(false)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [proposePsychReason, setProposePsychReason] = useState("Hỗ trợ Tâm lý")
  const [proposeNotes, setProposeNotes] = useState("")
  const [commitmentCandidates, setCommitmentCandidates] = useState<any[]>([])
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [loadingCommitmentCandidates, setLoadingCommitmentCandidates] = useState(false)

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
      const res = await fetch(`/api/teacher-student-records?action=getAssignedClasses&academicYearId=${selectedYearId}&_=${Date.now()}`)
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
    setCommitmentCandidates([])
    try {
      const res = await fetch(`/api/teacher-student-records?action=getClassStudents&classId=${classId}&_=${Date.now()}`)
      const data = await res.json()
      if (!data.error) {
        setClassStudents(data)
      }
      
      // Auto-populate default subject
      const selectedClassObj = currentClasses.find(c => c.id === classId)
      const classSubjects = selectedClassObj?.subjects || []
      if (classSubjects.length > 0) {
        const defaultSubs = classSubjects.map((s: any) => s.subjectName || s.name || "")
        setSelectedSubjects([defaultSubs[0]])
        // Pre-fetch commitment candidates for this class based on teacher's subjects
        fetchCommitmentCandidates(classId, defaultSubs)
      } else {
        setSelectedSubjects([])
        fetchCommitmentCandidates(classId, [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStudentsOfClass(false)
    }
  }

  // Fetch commitment candidates for a class (students with learning commitments matching assigned subjects)
  const fetchCommitmentCandidates = async (classId: string, subjectNames: string[]) => {
    if (!classId || !selectedYearId) return
    setLoadingCommitmentCandidates(true)
    try {
      const subjectsParam = subjectNames.join(",")
      const res = await fetch(
        `/api/teacher-student-records?action=getCommitmentCandidates&classId=${classId}&subjects=${encodeURIComponent(subjectsParam)}&academicYearId=${selectedYearId}&_=${Date.now()}`
      )
      const data = await res.json()
      if (!data.error) {
        setCommitmentCandidates(data)
        // Automatically check/select commitment students and subjects
        if (data.length > 0) {
          const eligibleFromCommitment = data
            .filter(c => {
              const existingAcademic = targets.find(t => t.studentId === c.id && t.supportType === "ACADEMIC")
              return !existingAcademic || existingAcademic.createdById === null
            })
            .map(c => c.id)

          if (eligibleFromCommitment.length > 0) {
            setSelectedStudentIds(prev => Array.from(new Set([...prev, ...eligibleFromCommitment])))
            
            // Collect all matched subjects from eligible students
            const matchedSubs = data
              .filter(c => eligibleFromCommitment.includes(c.id))
              .flatMap(c => c.matchedSubjects || [])
            
            if (matchedSubs.length > 0) {
              setSelectedSubjects(prev => Array.from(new Set([...prev, ...matchedSubs])))
            }
          }
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingCommitmentCandidates(false)
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

  const fetchEntranceCommitments = async () => {
    if (!selectedYearId || !teacher?.id) return
    setLoadingEntranceCommitments(true)
    try {
      const res = await fetch(`/api/teacher-student-records?action=getEntranceCommitments&teacherId=${teacher.id}&academicYearId=${selectedYearId}&_=${Date.now()}`)
      const data = await res.json()
      if (!data.error) {
        setEntranceCommitmentStudents(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingEntranceCommitments(false)
    }
  }

  const fetchTeacherData = async () => {
    if (!selectedYearId) return
    setLoading(true)
    try {
      // 1. Fetch configs
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
    } catch (e: any) {
      toast.error("Lỗi tải dữ liệu: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeacherData()
    fetchAssignedClasses()
    fetchEntranceCommitments()
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
    if (!proposeAcademic && !proposePsychological) {
      toast.error("Vui lòng chọn ít nhất một loại bồi dưỡng (Văn hóa hoặc Tâm lý)")
      return
    }
    if (proposeAcademic && selectedSubjects.length === 0) {
      toast.error("Vui lòng chọn ít nhất một môn học bồi dưỡng")
      return
    }
    setLoading(true)
    try {
      let successCount = 0
      let failCount = 0
      for (const studentId of selectedStudentIds) {
        const existingAcademic = targets.find(t => t.studentId === studentId && t.supportType === "ACADEMIC")
        const existingPsych = targets.find(t => t.studentId === studentId && t.supportType === "PSYCHOLOGICAL")

        const blockAcademic = existingAcademic && existingAcademic.createdById !== null
        const blockPsych = existingPsych && existingPsych.createdById !== null

        // 1. Propose Academic support if chosen and not already proposed by a teacher
        if (proposeAcademic && !blockAcademic) {
          try {
            const res = await fetch("/api/ktdbcl/support", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "saveTarget",
                academicYearId: selectedYearId,
                studentId,
                supportType: "ACADEMIC",
                sourceType: "GVBM",
                reason: selectedSubjects.join(", "),
                notes: proposeNotes,
                status: "TIẾP TỤC THEO TUẦN"
              })
            })
            const data = await res.json()
            if (data.error) failCount++
            else successCount++
          } catch (e) {
            failCount++
          }
        }

        // 2. Propose Psychological support if chosen and not already proposed by a teacher
        if (proposePsychological && !blockPsych) {
          try {
            const res = await fetch("/api/ktdbcl/support", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "saveTarget",
                academicYearId: selectedYearId,
                studentId,
                supportType: "PSYCHOLOGICAL",
                sourceType: "TAM_LY",
                reason: proposePsychReason || "Hỗ trợ Tâm lý",
                notes: proposeNotes,
                status: "TIẾP TỤC THEO TUẦN"
              })
            })
            const data = await res.json()
            if (data.error) failCount++
            else successCount++
          } catch (e) {
            failCount++
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Đề xuất thành công ${successCount} lượt bồi dưỡng!`)
      }
      if (failCount > 0) {
        toast.error(`Đề xuất thất bại ${failCount} lượt bồi dưỡng.`)
      }

      setIsProposeModalOpen(false)
      fetchTeacherData()
      fetchEntranceCommitments()
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
    // Only show active targets that are approved (have assigned teachers)
    if (!t.assignments || t.assignments.length === 0) return false

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

  // Proposal history filter - server already filters by teacher visibility
  // Only apply local search filter here
  const historyTargets = targets.filter(t => {
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
          className={`py-3 px-1 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "assigned"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          Học sinh được phân công phụ đạo / chủ nhiệm
        </button>
        <button
          onClick={() => setActiveSubTab("commitments")}
          className={`py-3 px-1 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "commitments"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Cam kết Khảo sát đầu vào
        </button>
        <button
          onClick={() => setActiveSubTab("history")}
          className={`py-3 px-1 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
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
              setSelectedSubjects([])
              setProposePsychReason("Hỗ trợ Tâm lý")
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
      ) : activeSubTab === "commitments" ? (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Học sinh</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Lớp</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cam kết Khảo sát đầu vào (KSĐV)</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái bồi dưỡng hiện tại</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loadingEntranceCommitments ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin inline-block mr-2 text-indigo-600" /> Đang tải danh sách học sinh cam kết đầu vào...
                  </td>
                </tr>
              ) : entranceCommitmentStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 font-medium">
                    Không tìm thấy học sinh nào có môn học cam kết từ khảo sát đầu vào trong các lớp phụ trách.
                  </td>
                </tr>
              ) : (() => {
                const query = searchQuery.trim().toLowerCase();
                const filtered = entranceCommitmentStudents.filter(s => 
                  (s.studentName || "").toLowerCase().includes(query) || 
                  (s.studentCode || "").toLowerCase().includes(query) ||
                  (s.className || "").toLowerCase().includes(query)
                );

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400">
                        Không tìm thấy học sinh nào khớp với từ khóa tìm kiếm.
                      </td>
                    </tr>
                  );
                }

                return filtered.map((s: any) => {
                  const existingAcademic = targets.find(t => t.studentId === s.id && t.supportType === "ACADEMIC")
                  const isApproved = existingAcademic?.assignments && existingAcademic.assignments.length > 0
                  const isTerminated = existingAcademic?.terminationStatus === "TERMINATED"
                  const isPending = existingAcademic?.terminationStatus === "PENDING_TERMINATION"

                  let statusText = "Chưa đề xuất bồi dưỡng"
                  let statusClass = "bg-slate-100 text-slate-600 border border-slate-200"

                  if (existingAcademic) {
                    if (isTerminated) {
                      statusText = "Hoàn thành bồi dưỡng"
                      statusClass = "bg-emerald-100 text-emerald-800"
                    } else if (isPending) {
                      statusText = "Chờ duyệt kết thúc"
                      statusClass = "bg-amber-100 text-amber-800"
                    } else if (isApproved) {
                      statusText = "Đang bồi dưỡng (Đã duyệt)"
                      statusClass = "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    } else {
                      statusText = "Đang bồi dưỡng (Chờ duyệt)"
                      statusClass = "bg-amber-50 text-amber-700 border border-amber-200"
                    }
                  }

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{s.studentName}</div>
                        <div className="text-xs text-slate-500">#{s.studentCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-bold text-xs">
                        {s.className}
                        {s.isHomeroom && <span className="text-[10px] text-indigo-600 font-black block mt-0.5">(Lớp chủ nhiệm)</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {s.committedSubjects.map((sub: string, index: number) => {
                            const isMatched = s.matchedSubjects?.includes(sub)
                            return (
                              <span 
                                key={index} 
                                className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                  isMatched 
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {sub} {isMatched && "✓"}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${statusClass}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {existingAcademic ? (
                          <span className="text-xs text-slate-400 font-medium">Đã tạo đề xuất</span>
                        ) : (
                          <button
                            onClick={() => {
                              setProposeClassId(s.classId)
                              setIsProposeModalOpen(true)
                              setSelectedStudentIds([s.id])
                              const activeSubs = s.matchedSubjects?.length > 0 
                                ? s.matchedSubjects 
                                : [s.committedSubjects[0]]
                              setSelectedSubjects(activeSubs)
                              setProposeNotes(`[Đề xuất từ Cam kết Khảo sát đầu vào]: Học sinh có cam kết môn ${s.committedSubjects.join(", ")} tại kỳ khảo sát đầu vào.`)
                              fetchClassStudents(s.classId)
                            }}
                            className="bg-[#00A99D] hover:bg-[#009085] text-white font-bold py-1.5 px-3 rounded-xl text-xs transition-all shadow-xs"
                          >
                            Đề xuất bồi dưỡng
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                });
              })()}
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
                  const isApproved = t.assignments && t.assignments.length > 0
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
                          isTerminated 
                            ? "bg-emerald-100 text-emerald-800" 
                            : isPending 
                            ? "bg-amber-100 text-amber-800" 
                            : isApproved 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {isTerminated 
                            ? "Hoàn thành bồi dưỡng" 
                            : isPending 
                            ? "Chờ duyệt kết thúc" 
                            : isApproved 
                            ? "Đã duyệt" 
                            : "Chờ xét duyệt"}
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col transition-all duration-300">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-600 text-white shadow-xs">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Đề xuất Học sinh cần Hỗ trợ học tập
              </h2>
              <button 
                onClick={() => setIsProposeModalOpen(false)}
                className="rounded-lg p-1 hover:bg-white/20 transition-all"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto bg-slate-50/50">
              {/* Cột trái: Thông tin lớp & Chọn học sinh */}
              <div className="space-y-4 bg-white p-5 rounded-2xl border shadow-2xs flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Bước 1: Chọn Lớp & Học sinh
                </h3>

                {/* Select class */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Lớp học phụ trách:</label>
                  {loadingClassesOfTeacher ? (
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 py-1">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Đang tải danh sách lớp...
                    </div>
                  ) : (
                    <select
                      value={proposeClassId}
                      onChange={e => {
                        setProposeClassId(e.target.value)
                        setStudentSearchQuery("")
                        fetchClassStudents(e.target.value)
                      }}
                      className="w-full rounded-xl border-slate-200 border py-2.5 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold bg-slate-50 hover:bg-slate-100/50 cursor-pointer"
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

                {/* Auto-select from Commitment (KSĐV) button */}
                {proposeClassId && proposeAcademic && (
                  <div className={`flex items-center justify-between border rounded-xl px-4 py-2.5 transition-all duration-300 ${
                    commitmentCandidates.length > 0 ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}>
                    <div className="text-[11px] leading-snug">
                      <span className="font-bold">Khảo sát đầu vào:</span>{" "}
                      {loadingCommitmentCandidates ? (
                        <span className="italic text-slate-400">Đang tìm...</span>
                      ) : commitmentCandidates.length > 0 ? (
                        <span>Tìm thấy <strong>{commitmentCandidates.length}</strong> học sinh có cam kết môn phù hợp</span>
                      ) : (
                        <span className="text-slate-400 italic">Không có học sinh cam kết môn này</span>
                      )}
                    </div>
                    {commitmentCandidates.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const eligibleFromCommitment = commitmentCandidates
                            .filter(c => {
                              const existingAcademic = targets.find(t => t.studentId === c.id && t.supportType === "ACADEMIC")
                              return !existingAcademic || existingAcademic.createdById === null
                            })
                            .map(c => c.id)
                          setSelectedStudentIds(prev => Array.from(new Set([...prev, ...eligibleFromCommitment])))
                          setSelectedSubjects(commitmentCandidates[0]?.matchedSubjects?.length > 0 
                            ? commitmentCandidates[0].matchedSubjects 
                            : selectedSubjects)
                        }}
                        className="ml-2 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg whitespace-nowrap transition-all shadow-xs"
                      >
                        Chọn nhanh
                      </button>
                    )}
                  </div>
                )}

                {/* Multiple selection of students */}
                {proposeClassId && (
                  <div className="space-y-2 flex-1 flex flex-col">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Danh sách học sinh ({classStudents.length > 0 ? `Đang chọn: ${selectedStudentIds.length}/${classStudents.length}` : "0"}):
                      </label>
                      {classStudents.length > 0 && (() => {
                        const eligibleStudents = classStudents.filter(s => {
                          const existingAcademic = targets.find(t => t.studentId === s.id && t.supportType === "ACADEMIC")
                          const existingPsych = targets.find(t => t.studentId === s.id && t.supportType === "PSYCHOLOGICAL")
                          
                          const hasAcademicBlock = proposeAcademic && existingAcademic && existingAcademic.createdById !== null
                          const hasPsychBlock = proposePsychological && existingPsych && existingPsych.createdById !== null

                          const isBlocked = (proposeAcademic && proposePsychological)
                            ? (hasAcademicBlock && hasPsychBlock)
                            : (proposeAcademic ? hasAcademicBlock : hasPsychBlock)

                          return !isBlocked
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
                            className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black transition-all"
                          >
                            {selectedStudentIds.length === eligibleStudents.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                          </button>
                        )
                      })()}
                    </div>

                    {/* Student search input */}
                    {classStudents.length > 0 && (
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Tìm kiếm học sinh theo tên, mã số..."
                          value={studentSearchQuery}
                          onChange={e => setStudentSearchQuery(e.target.value)}
                          className="w-full rounded-xl border-slate-200 border py-2 pl-9 pr-3 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 font-semibold"
                        />
                      </div>
                    )}

                    {loadingStudentsOfClass ? (
                      <div className="text-xs text-slate-500 flex items-center justify-center gap-1.5 py-8">
                        <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" /> Đang tải danh sách học sinh...
                      </div>
                    ) : classStudents.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                        Không có học sinh nào trong lớp này.
                      </div>
                    ) : (() => {
                      const filteredList = classStudents.filter((s) => {
                        const nameMatch = (s.studentName || "").toLowerCase().includes(studentSearchQuery.toLowerCase());
                        const codeMatch = (s.studentCode || "").toLowerCase().includes(studentSearchQuery.toLowerCase());
                        return nameMatch || codeMatch;
                      });

                      if (filteredList.length === 0) {
                        return (
                          <div className="text-xs text-slate-400 italic py-8 text-center bg-slate-50/30 rounded-xl">
                            Không tìm thấy học sinh nào khớp với từ khóa tìm kiếm.
                          </div>
                        );
                      }

                      return (
                        <div className="border border-slate-100 rounded-xl max-h-56 overflow-y-auto p-2 space-y-1.5 bg-slate-50/50">
                          {filteredList.map((s: any) => {
                            const existingAcademic = targets.find(t => t.studentId === s.id && t.supportType === "ACADEMIC")
                            const existingPsych = targets.find(t => t.studentId === s.id && t.supportType === "PSYCHOLOGICAL")
                            const hasCommitment = commitmentCandidates.some(c => c.id === s.id)
                            const commitmentCandidate = commitmentCandidates.find(c => c.id === s.id)

                            const hasAcademicBlock = proposeAcademic && existingAcademic && existingAcademic.createdById !== null
                            const hasPsychBlock = proposePsychological && existingPsych && existingPsych.createdById !== null

                            const isAlreadyProposed = (proposeAcademic && proposePsychological)
                              ? (hasAcademicBlock && hasPsychBlock)
                              : (proposeAcademic ? hasAcademicBlock : hasPsychBlock)

                            const isChecked = selectedStudentIds.includes(s.id)
                            return (
                              <label 
                                key={s.id} 
                                className={`flex items-start gap-2.5 text-xs font-semibold p-2 rounded-xl transition-all border ${
                                  isAlreadyProposed 
                                    ? "opacity-50 cursor-not-allowed bg-slate-100/60 border-transparent" 
                                    : isChecked
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-900 cursor-pointer shadow-3xs"
                                    : hasCommitment 
                                    ? "text-amber-900 cursor-pointer bg-amber-50 hover:bg-amber-100 border-amber-200" 
                                    : "text-slate-700 cursor-pointer hover:bg-white border-transparent hover:border-slate-200"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAlreadyProposed ? false : isChecked}
                                  disabled={isAlreadyProposed}
                                  onChange={() => {
                                    if (isAlreadyProposed) return
                                    if (isChecked) {
                                      setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id))
                                    } else {
                                      setSelectedStudentIds([...selectedStudentIds, s.id])
                                    }
                                  }}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 disabled:opacity-50 mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold flex items-center justify-between">
                                    <span className="truncate">{s.studentName}</span>
                                    <span className="text-[10px] text-slate-400 font-medium ml-1.5 shrink-0">#{s.studentCode}</span>
                                  </div>
                                  {hasAcademicBlock && (
                                    <span className="text-[10px] text-rose-500 font-bold block mt-0.5">
                                      (Đã đề xuất bồi dưỡng Văn hóa{existingAcademic?.createdBy?.teacherName ? ` bởi ${existingAcademic.createdBy.teacherName}` : ""})
                                    </span>
                                  )}
                                  {hasPsychBlock && (
                                    <span className="text-[10px] text-rose-500 font-bold block mt-0.5">
                                      (Đã đề xuất hỗ trợ Tâm lý{existingPsych?.createdBy?.teacherName ? ` bởi ${existingPsych.createdBy.teacherName}` : ""})
                                    </span>
                                  )}
                                  {hasCommitment && (
                                    <span className="text-[10px] text-amber-700 font-extrabold flex items-center gap-1 mt-0.5">
                                      ⭐ Cam kết đầu vào{commitmentCandidate?.matchedSubjects?.length > 0 ? ': ' + commitmentCandidate.matchedSubjects.join(', ') : ''}
                                    </span>
                                  )}
                                  {existingAcademic && !hasAcademicBlock && proposeAcademic && (
                                    <span className="text-[10px] text-amber-600 font-extrabold block mt-0.5">
                                      (Đang bồi dưỡng Văn hóa - Chưa liên kết người đề xuất)
                                    </span>
                                  )}
                                  {existingPsych && !hasPsychBlock && proposePsychological && (
                                    <span className="text-[10px] text-amber-600 font-extrabold block mt-0.5">
                                      (Đang hỗ trợ Tâm lý - Chưa liên kết người đề xuất)
                                    </span>
                                  )}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Cột phải: Loại bồi dưỡng, Môn bồi dưỡng, Ghi chú */}
              <div className="space-y-4 bg-white p-5 rounded-2xl border shadow-2xs flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    Bước 2: Cấu hình Đề xuất
                  </h3>

                  {/* Loại bồi dưỡng */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Loại chương trình hỗ trợ:</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        proposeAcademic 
                          ? "bg-indigo-50 border-indigo-500 text-indigo-900 shadow-3xs" 
                          : "hover:bg-slate-50 border-slate-200 text-slate-700"
                      }`}>
                        <input
                          type="checkbox"
                          checked={proposeAcademic}
                          onChange={e => setProposeAcademic(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        Bồi dưỡng Văn hóa
                      </label>
                      <label className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        proposePsychological 
                          ? "bg-indigo-50 border-indigo-500 text-indigo-900 shadow-3xs" 
                          : "hover:bg-slate-50 border-slate-200 text-slate-700"
                      }`}>
                        <input
                          type="checkbox"
                          checked={proposePsychological}
                          onChange={e => setProposePsychological(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        Hỗ trợ Tâm lý
                      </label>
                    </div>
                  </div>

                  {/* Môn học bồi dưỡng */}
                  {proposeAcademic && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Môn học cần bồi dưỡng:</label>
                      <div className="border border-slate-100 rounded-xl max-h-36 overflow-y-auto p-2 space-y-1 bg-slate-50/50">
                        {subjects.map((sub: any) => {
                          const name = sub.subjectName || sub.name
                          const isChecked = selectedSubjects.includes(name)
                          const selClassObj = assignedClasses.find(c => c.id === proposeClassId)
                          const isTeacherSubject = selClassObj?.subjects?.some((s: any) => (s.subjectName || s.name) === name)

                          return (
                            <label 
                              key={sub.id} 
                              className={`flex items-center gap-2 text-xs font-semibold p-1.5 rounded-lg transition-all cursor-pointer ${
                                isChecked 
                                  ? "bg-indigo-50 text-indigo-900 font-bold" 
                                  : "text-slate-700 hover:bg-white"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedSubjects(selectedSubjects.filter(s => s !== name))
                                  } else {
                                    setSelectedSubjects([...selectedSubjects, name])
                                  }
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                              />
                              <span className="flex-1 min-w-0 flex items-center justify-between">
                                <span>{name}</span>
                                {isTeacherSubject && (
                                  <span className="text-[9px] bg-indigo-100 text-indigo-700 font-black px-1.5 py-0.5 rounded-md shrink-0">Môn giảng dạy</span>
                                )}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Lý do hỗ trợ tâm lý */}
                  {proposePsychological && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Lý do hỗ trợ tâm lý:</label>
                      <input
                        type="text"
                        placeholder="Mô tả lý do tâm lý..."
                        value={proposePsychReason}
                        onChange={e => setProposePsychReason(e.target.value)}
                        className="w-full rounded-xl border-slate-200 border py-2.5 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 font-semibold"
                      />
                    </div>
                  )}

                  {/* Ghi chú bồi dưỡng ban đầu */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ý kiến / Ghi chú ban đầu:</label>
                    <textarea
                      placeholder="Mô tả các biểu hiện học lực, kỹ năng, tâm lý của học sinh cần hỗ trợ..."
                      value={proposeNotes}
                      onChange={e => setProposeNotes(e.target.value)}
                      className="w-full rounded-xl border-slate-200 border py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 h-24 resize-none font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsProposeModalOpen(false)}
                className="border hover:bg-slate-100 py-2 px-4 rounded-xl text-sm font-medium transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handlePropose}
                disabled={selectedStudentIds.length === 0 || (!proposeAcademic && !proposePsychological) || (proposeAcademic && selectedSubjects.length === 0)}
                className={`py-2 px-5 rounded-xl text-sm font-bold shadow-xs transition-all text-white ${
                  selectedStudentIds.length === 0 || (!proposeAcademic && !proposePsychological) || (proposeAcademic && selectedSubjects.length === 0)
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
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
