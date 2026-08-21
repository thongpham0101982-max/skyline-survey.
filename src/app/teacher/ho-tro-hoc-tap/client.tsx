"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  FileText, Users, Plus, Search, Check, RefreshCw, X, Calendar, 
  MessageSquare, TrendingUp, CheckCircle, AlertTriangle, AlertCircle, Clock, Printer, GraduationCap, School, BookOpen, Heart, Award, Info, Bell, CheckCircle2
} from "lucide-react"
import toast from "react-hot-toast"

interface Props {
  teacher: any
  academicYears: any[]
  homeroomClasses: any[]
  subjects: any[]
}

const getCompactScore = (val: any) => {
  if (val == null) return "Chưa có";
  if (Array.isArray(val)) {
    const sum = val.reduce((a: number, b: number) => a + Number(b || 0), 0);
    return `${sum} (Tổng)`;
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        const sum = parsed.reduce((a: number, b: number) => a + Number(b || 0), 0);
        return `${sum} (Tổng)`;
      }
    } catch (e: any) {
      // Not a JSON array string
    }
    if (val.startsWith("[") && val.endsWith("]")) {
      try {
        const parsed = JSON.parse(val.replace(/'/g, '"'));
        if (Array.isArray(parsed)) {
          const sum = parsed.reduce((a: number, b: number) => a + Number(b || 0), 0);
          return `${sum} (Tổng)`;
        }
      } catch(e) {}
    }
  }
  return String(val);
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
  const [activeSubTab, setActiveSubTab] = useState<"assigned" | "commitments" | "history">("commitments")
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
  const [proposePsychReason, setProposePsychReason] = useState("Tâm lý")
  const [proposeNotes, setProposeNotes] = useState("")
  const [commitmentCandidates, setCommitmentCandidates] = useState<any[]>([])
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  // Month and Level Filters
  const [monthFilter, setMonthFilter] = useState("ALL")
  const [levelFilter, setLevelFilter] = useState("ALL")

  // Student Profile / Result Book Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [selectedProfileStudentId, setSelectedProfileStudentId] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [activeProfileTab, setActiveProfileTab] = useState("overview")
  const [proposeMonth, setProposeMonth] = useState("Tháng 9")
  const [loadingCommitmentCandidates, setLoadingCommitmentCandidates] = useState(false)

  const getStartDateForMonth = (monthName: string, startYear: number) => {
    const monthMap = {
      "Tháng 8": { month: 7, yearOffset: 0 },
      "Tháng 9": { month: 8, yearOffset: 0 },
      "Tháng 10": { month: 9, yearOffset: 0 },
      "Tháng 11": { month: 10, yearOffset: 0 },
      "Tháng 12": { month: 11, yearOffset: 0 },
      "Tháng 1": { month: 0, yearOffset: 1 },
      "Tháng 2": { month: 1, yearOffset: 1 },
      "Tháng 3": { month: 2, yearOffset: 1 },
      "Tháng 4": { month: 3, yearOffset: 1 },
      "Tháng 5": { month: 4, yearOffset: 1 },
    }
    const info = (monthMap as Record<string, any>)[monthName] || { month: new Date().getMonth(), yearOffset: 0 }
    return new Date(startYear + info.yearOffset, info.month, 1).toISOString()
  }

  const handleOpenProfile = async (studentId: string) => {
    setSelectedProfileStudentId(studentId)
    setProfileData(null)
    setLoadingProfile(true)
    setIsProfileModalOpen(true)
    setActiveProfileTab("overview")
    try {
      const res = await fetch(`/api/teacher-student-records?action=getStudentRecord&studentId=${studentId}&academicYearId=${selectedYearId}&_=${Date.now()}`)
      const data = await res.json()
      if (data.error) {
        toast.error("Không thể tải hồ sơ học sinh: " + data.error)
      } else {
        setProfileData(data)
      }
    } catch (e) {
      toast.error("Lỗi kết nối khi tải hồ sơ: " + (e as any).message)
    } finally {
      setLoadingProfile(false)
    }
  }

  // Evaluation Form States
  const [evalTargetId, setEvalTargetId] = useState("")
  const [evalTargetName, setEvalTargetName] = useState("")
  const [evalTargetType, setEvalTargetType] = useState("")
  const [evalPeriodType, setEvalPeriodType] = useState("MONTH")
  const [evalPeriodName, setEvalPeriodName] = useState("")
  const [evalTrackingLevel, setEvalTrackingLevel] = useState("")
  const [evalComment, setEvalComment] = useState("")
  const [evalUpdatedStatus, setEvalUpdatedStatus] = useState("TIẾP TỤC THEO TUẦN")
  const [evalStudent, setEvalStudent] = useState<any>(null)
  const [evalTargetObj, setEvalTargetObj] = useState<any>(null)
  const [selectedEvalTargetIds, setSelectedEvalTargetIds] = useState<string[]>([])

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
        `/api/teacher-student-records?action=getCommitmentCandidates&classId=${classId}&subjects=${encodeURIComponent(subjectsParam)}&academicYearId=${selectedYearId}&teacherId=${teacher?.id || ""}&_=${Date.now()}`
      )
      const data = await res.json()
      if (!data.error) {
        setCommitmentCandidates(data)
        // Automatically check/select commitment students and subjects
        if (data.length > 0) {
          const eligibleFromCommitment = data
            .filter((c: any) => {
              const existingAcademic = targets.find(t => t.studentId === c.id && t.supportType === "ACADEMIC")
              return !existingAcademic || existingAcademic.createdById === null
            })
            .map((c: any) => c.id)

          if (eligibleFromCommitment.length > 0) {
            setSelectedStudentIds(prev => Array.from(new Set([...prev, ...eligibleFromCommitment])))
            
            // Collect all matched subjects from eligible students
            const matchedSubs = data
              .filter((c: any) => eligibleFromCommitment.includes(c.id))
              .flatMap((c: any) => c.matchedSubjects || [])
            
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

  // Auto-fill Psychological Support program and reason when student with psychological commitment is selected
  useEffect(() => {
    if (selectedStudentIds.length > 0 && commitmentCandidates.length > 0) {
      const selectedCommitments = commitmentCandidates.filter(c => selectedStudentIds.includes(c.id));
      const hasPsychCommitment = selectedCommitments.some(c => 
        (c.matchedSubjects || []).some((s: any) => s.toLowerCase().includes("tâm lý"))
      );
      if (hasPsychCommitment) {
        setProposePsychological(true);
        setProposeAcademic(false);
        if (!proposePsychReason || proposePsychReason === "Hỗ trợ Tâm lý" || proposePsychReason === "Môn Tâm lý") {
          setProposePsychReason("Tâm lý");
        }
      }
    }
  }, [selectedStudentIds, commitmentCandidates, proposePsychReason]);

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
            if (data.error) {
              failCount++
            } else {
              successCount++
              const studentInfo = classStudents.find(s => s.id === studentId)
              if (studentInfo) {
                const newTarget = {
                  ...data,
                  student: {
                    ...studentInfo,
                    class: assignedClasses.find(c => c.id === proposeClassId)
                  },
                  assignments: [],
                  evaluations: []
                }
                setTargets(prev => {
                  const exists = prev.findIndex(t => t.id === data.id)
                  if (exists >= 0) {
                    const newTargets = [...prev]
                    newTargets[exists] = newTarget
                    return newTargets
                  }
                  return [newTarget, ...prev]
                })
              }
            }
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
                reason: proposePsychReason || "Tâm lý",
                notes: proposeNotes,
                status: "TIẾP TỤC THEO TUẦN"
              })
            })
            const data = await res.json()
            if (data.error) {
              failCount++
            } else {
              successCount++
              const studentInfo = classStudents.find(s => s.id === studentId)
              if (studentInfo) {
                const newTarget = {
                  ...data,
                  student: {
                    ...studentInfo,
                    class: assignedClasses.find(c => c.id === proposeClassId)
                  },
                  assignments: [],
                  evaluations: []
                }
                setTargets(prev => {
                  const exists = prev.findIndex(t => t.id === data.id)
                  if (exists >= 0) {
                    const newTargets = [...prev]
                    newTargets[exists] = newTarget
                    return newTargets
                  }
                  return [newTarget, ...prev]
                })
              }
            }
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
      setActiveSubTab("assigned")
      
      // Delay fetching to allow for DB replication
      await new Promise(r => setTimeout(r, 1500))
      
      await fetchTeacherData()
      await fetchEntranceCommitments()
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
    const shouldTerminate = evalUpdatedStatus === "Đề xuất kết thúc bồi dưỡng" || evalUpdatedStatus === "Kết thúc theo dõi";
    try {
      const targetIds = selectedEvalTargetIds.length > 0 ? selectedEvalTargetIds : (evalTargetId ? [evalTargetId] : []);
      if (targetIds.length === 0) return;

      const promises = targetIds.map(id => 
        fetch("/api/ktdbcl/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "saveEvaluation",
            academicYearId: selectedYearId,
            targetId: id,
            periodType: evalPeriodType,
            periodName: evalPeriodName,
            trackingLevel: evalTrackingLevel,
            comment: evalComment,
            updatedStatus: evalUpdatedStatus
          })
        }).then(r => r.json())
      );
      
      await Promise.all(promises);

      if (shouldTerminate) {
        const termPromises = targetIds.map(id =>
          fetch("/api/ktdbcl/support", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "requestTermination",
              academicYearId: selectedYearId,
              id: id,
              outcome: evalTrackingLevel,
              notes: evalComment
            })
          }).then(r => r.json())
        );
        await Promise.all(termPromises);
      }

      toast.success("Ghi nhận đánh giá thành công!");
      setIsEvaluationModalOpen(false);
      setSelectedEvalTargetIds([]);
      setActiveSubTab("assigned");
      fetchTeacherData();
    } catch (e) {
      toast.error("Lưu nhận xét thất bại");
    }
  }

  // Delete a proposed target
  const handleDeleteTarget = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa đề xuất này?")) return
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteTarget",
          academicYearId: selectedYearId,
          id
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success("Xóa đề xuất thành công!")
        setTargets(prev => prev.filter(t => t.id !== id))
      }
    } catch (e: any) {
      toast.error("Lỗi xóa đề xuất: " + e.message)
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
    // Check if created by teacher, homeroom, assigned, or class teacher
    const isCreatedByMe = t.createdById === teacher?.id
    const isHomeroomStudent = homeroomClasses.some(c => c.students.some((s: any) => s.id === t.studentId))
    const isAssigned = t.assignments?.some((a: any) => a.teacherId === teacher?.id)
    const isClassTeacher = assignedClasses.some((c: any) => c.id === t.student?.classId)

    // Apply role filter
    if (roleFilter === "HOMEROOM" && !isHomeroomStudent) return false
    if (roleFilter === "ASSIGNED" && !isAssigned && !isCreatedByMe) return false
    if (roleFilter === "ALL" && !isHomeroomStudent && !isAssigned && !isCreatedByMe && !isClassTeacher) return false

    // Apply Month filter
    if (monthFilter !== "ALL") {
      const hasEvalInMonth = t.evaluations?.some((e: any) => e.periodName === monthFilter)
      if (!hasEvalInMonth) return false
    }

    // Apply Level filter
    const sortedEvals = t.evaluations ? [...t.evaluations].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : []
    const latestEval = sortedEvals[0]
    const currentLevel = latestEval ? latestEval.trackingLevel : "Đang hỗ trợ"
    if (levelFilter !== "ALL" && currentLevel !== levelFilter) return false

    // Apply search query
    const name = t.student?.studentName || ""
    const code = t.student?.studentCode || ""
    const matchesSearch = searchQuery === "" || 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  // Count approved proposals submitted by this teacher
  const approvedHistoryCount = useMemo(() => {
    return targets.filter((t: any) => 
      t.createdById === teacher?.id && (
        (t.assignments && t.assignments.length > 0) || 
        t.status === "ĐÃ DUYỆT" || 
        t.terminationStatus === "TERMINATED" || 
        t.terminationStatus === "PENDING_TERMINATION"
      )
    ).length
  }, [targets, teacher?.id])

  // Proposal history filter - server already filters by teacher visibility
  // Only apply local search filter here
  const historyTargets = targets.filter(t => {
    if (t.createdById !== teacher?.id) return false

    const name = t.student?.studentName || ""
    const code = t.student?.studentCode || ""
    return searchQuery === "" || 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const groupedHistoryTargets = (() => {
    const groups: Record<string, any> = {};
    historyTargets.forEach((t) => {
      const studentId = t.studentId;
      if (!groups[studentId]) {
        groups[studentId] = {
          studentId,
          student: t.student,
          class: t.student?.class,
          targets: []
        };
      }
      groups[studentId].targets.push(t);
    });
    return Object.values(groups);
  })();

  // Options for tracking level loaded dynamically based on configs
  const dynamicLevelOptions = configs.filter(c => c.supportType === evalTargetType)

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="h-9 w-9 text-indigo-600" />
            Phụ đạo, bồi dưỡng Học sinh
          </h1>
          <p className="text-slate-500 mt-1">
            Giao diện hỗ trợ, theo dõi mức độ tiến bộ và cập nhật đánh giá của học sinh.
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

      {/* Statistical Dashboard Cards */}
      {activeSubTab === "assigned" && (() => {
        const teacherTargets = targets.filter(t => {
          const isHR = homeroomClasses.some(c => c.students.some((s: any) => s.id === t.studentId));
          const isAS = t.assignments?.some((a: any) => a.teacherId === teacher?.id);
          return isHR || isAS;
        });

        const activeTargetsCount = teacherTargets.filter(t => t.terminationStatus !== "TERMINATED" && t.terminationStatus !== "PENDING_TERMINATION").length;
        const pendingTermCount = teacherTargets.filter(t => t.terminationStatus === "PENDING_TERMINATION").length;
        const completedCount = teacherTargets.filter(t => t.terminationStatus === "TERMINATED").length;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200/60 p-5 rounded-2xl shadow-xs transition-all hover:scale-[1.02] duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Học sinh phụ trách</p>
                  <p className="text-3xl font-black text-indigo-900 mt-1">{teacherTargets.length}</p>
                </div>
                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-600">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-indigo-500 mt-2 font-medium">Tổng số học sinh được phân công hoặc chủ nhiệm</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/60 p-5 rounded-2xl shadow-xs transition-all hover:scale-[1.02] duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Đang hỗ trợ</p>
                  <p className="text-3xl font-black text-emerald-900 mt-1">{activeTargetsCount}</p>
                </div>
                <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-emerald-500 mt-2 font-medium">Học sinh đang nhận hỗ trợ trong tiến trình</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 p-5 rounded-2xl shadow-xs transition-all hover:scale-[1.02] duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Hoàn thành</p>
                  <p className="text-3xl font-black text-amber-900 mt-1">{pendingTermCount}</p>
                </div>
                <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-200/20 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-amber-500 mt-2 font-medium">Đã gửi đề xuất kết thúc chờ cấp trên duyệt</p>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 border border-teal-200/60 p-5 rounded-2xl shadow-xs transition-all hover:scale-[1.02] duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">Đã kết thúc</p>
                  <p className="text-3xl font-black text-teal-900 mt-1">{completedCount}</p>
                </div>
                <div className="p-2.5 bg-teal-500/10 rounded-xl border border-teal-200/20 text-teal-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-teal-500 mt-2 font-medium">Học sinh đã hoàn thành chương trình hỗ trợ</p>
            </div>
          </div>
        );
      })()}

      {/* Sub tabs navigation */}

      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveSubTab("commitments")}
          className={`py-3 px-1 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "commitments"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>1. Cam kết đầu vào</span>
        </button>
        <button
          onClick={() => setActiveSubTab("assigned")}
          className={`py-3 px-1 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "assigned"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>2. Sổ theo dõi đánh giá</span>
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
              setProposePsychReason("Tâm lý")
              setProposeNotes("")
              setIsProposeModalOpen(true)
              fetchAssignedClasses()
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Đề xuất HS Theo dõi
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeSubTab === "assigned" && (
            <>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as any)}
                className="rounded-lg border-slate-300 border py-1.5 px-3 focus:outline-none text-xs font-semibold bg-white cursor-pointer hover:border-slate-450"
              >
                <option value="ALL">Toàn bộ học sinh phụ trách</option>
                <option value="HOMEROOM">Học sinh lớp Chủ nhiệm</option>
                <option value="ASSIGNED">Học sinh kèm phụ đạo</option>
              </select>

              <select
                value={monthFilter}
                onChange={e => setMonthFilter(e.target.value)}
                className="rounded-lg border-slate-300 border py-1.5 px-3 focus:outline-none text-xs font-semibold bg-white cursor-pointer hover:border-slate-450"
              >
                <option value="ALL">Tất cả các Tháng</option>
                {["Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5"].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value)}
                className="rounded-lg border-slate-300 border py-1.5 px-3 focus:outline-none text-xs font-semibold bg-white cursor-pointer hover:border-slate-450"
              >
                <option value="ALL">Tất cả Mức độ</option>
                <option value="Đang hỗ trợ">Đang hỗ trợ (Mặc định)</option>
                {Array.from(new Set(configs.map(c => c.outcomeLabel))).filter(Boolean).map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </>
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              disabled={selectedEvalTargetIds.length === 0}
              onClick={() => {
                if (selectedEvalTargetIds.length === 0) return;
                setEvalTargetId("")
                setEvalTargetName("Nhiều học sinh")
                const firstSelected = targets.find((t:any) => t.id === selectedEvalTargetIds[0])
                setEvalTargetType(firstSelected?.supportType || "ACADEMIC")
                setEvalPeriodType("MONTH")
                const curMonth = "Tháng " + (new Date().getMonth() + 1)
                setEvalPeriodName(curMonth)
                setEvalComment("")
                setEvalStudent(null)
                setEvalTargetObj(null)
                const options = configs.filter((c:any) => c.supportType === (firstSelected?.supportType || "ACADEMIC"))
                setEvalTrackingLevel(options[0]?.outcomeLabel || "")
                setIsEvaluationModalOpen(true)
              }}
              className="bg-indigo-600 disabled:bg-slate-300 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all"
            >
              Đánh giá nhiều Học sinh
            </button>
          </div>
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" onChange={e => {
                      if (e.target.checked) {
                        const allIds = filteredTargets
                          .filter((t:any) => {
                            const isAssigned = t.assignments?.some((a:any) => a.teacherId === teacher?.id);
                            const matchedClass = assignedClasses.find((c: any) => c.id === t.student?.classId);
                            const isHomeroomTeacherOfThisClass = matchedClass ? matchedClass.isHomeroom : false;
                            const canEval = t.supportType === "PSYCHOLOGICAL"
                              ? (isAssigned && !isHomeroomTeacherOfThisClass)
                              : isAssigned;
                            return canEval && t.terminationStatus !== "TERMINATED" && t.terminationStatus !== "PENDING_TERMINATION";
                          })
                          .map((t:any) => t.id);
                        setSelectedEvalTargetIds(allIds);
                      } else setSelectedEvalTargetIds([]);
                    }} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"/>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">TT</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mã HS</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Họ và tên</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Lớp</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày nhập học</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Đối tượng</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Môn Cam kết</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mức hiện tại</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredTargets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400">
                      Không tìm thấy học sinh nào thuộc danh sách bồi dưỡng của bạn
                    </td>
                  </tr>
                ) : (
                  filteredTargets.map((t: any, index: number) => {
                    const isCreatedByMe = t.createdById === teacher?.id
                    const isAssigned = t.assignments?.some((a: any) => a.teacherId === teacher?.id)
                    const isTerminated = t.terminationStatus === "TERMINATED"
                    const isPending = t.terminationStatus === "PENDING_TERMINATION"
                    
                    const matchedClass = assignedClasses.find((c: any) => c.id === t.student?.classId)
                    const isHomeroomTeacherOfThisClass = matchedClass ? matchedClass.isHomeroom : false
                    const canEvaluate = isCreatedByMe || isAssigned || (matchedClass != null && t.supportType === "ACADEMIC")
                    
                    const evals = t.evaluations || [];
                    const sortedEvals = [...evals].sort((a:any, b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    const latestEval = sortedEvals[0];
                    const currentLevel = latestEval ? latestEval.trackingLevel : "Đang hỗ trợ";

                    const isCommitmentTarget = t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết Khảo sát đầu vào"));
                    const enrollmentDateFormatted = t.student?.enrollmentDate
                      ? new Date(t.student.enrollmentDate).toLocaleDateString("vi-VN")
                      : (t.createdAt ? new Date(t.createdAt).toLocaleDateString("vi-VN") : "N/A");

                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          {canEvaluate && !isTerminated && !isPending && (
                            <input 
                              type="checkbox" 
                              checked={selectedEvalTargetIds.includes(t.id)} 
                              onChange={e => {
                                if (e.target.checked) setSelectedEvalTargetIds([...selectedEvalTargetIds, t.id]);
                                else setSelectedEvalTargetIds(selectedEvalTargetIds.filter(id => id !== t.id));
                              }} 
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-slate-500 font-medium">{index + 1}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-slate-600 font-semibold">{t.student?.studentCode || t.student?.code || "N/A"}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button onClick={() => handleOpenProfile(t.studentId)} className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-left transition-all cursor-pointer">{t.student?.studentName || t.student?.fullName}</button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-slate-600 font-bold">
                          {t.student?.class?.className || t.student?.className}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-slate-600 font-semibold text-xs">
                          {enrollmentDateFormatted}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {isCommitmentTarget ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300" title="Cam kết đầu vào">
                              CKĐV
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-900 border border-indigo-300" title="Bổ sung theo dõi">
                              BSTD
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-xs font-bold border border-slate-200 bg-slate-50 text-slate-700">
                            {Array.from(new Set((t.reason || "").split(",").map((s: any) => s.trim()).filter(Boolean))).join(", ") || (t.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý")}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-slate-800 font-bold">
                          {isTerminated ? t.outcome : currentLevel}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center space-x-2">
                          {canEvaluate && !isTerminated && !isPending && (
                            <button
                              onClick={() => {
                                setSelectedEvalTargetIds([t.id])
                                setEvalTargetId(t.id)
                                setEvalTargetName(t.student?.studentName)
                                setEvalTargetType(t.supportType)
                                setEvalComment("")
                                setEvalStudent(t.student)
                                setEvalTargetObj(t)
                                setEvalPeriodType("MONTH")
                                const curMonth = "Tháng " + (new Date().getMonth() + 1)
                                setEvalPeriodName(curMonth)
                                const options = configs.filter((c:any) => c.supportType === t.supportType)
                                setEvalTrackingLevel(options[0]?.outcomeLabel || "")
                                setIsEvaluationModalOpen(true)
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 px-3 rounded-lg text-xs transition-all shadow-sm"
                            >
                              Nhận xét & Đánh giá
                            </button>
                          )}
                          {(isTerminated || isPending) && (
                            <span className="text-[11px] text-slate-400 font-medium">Không thể thao tác</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubTab === "commitments" ? (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-12">TT</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mã HS</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Họ và tên</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Lớp</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày nhập học</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Môn Cam kết</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Điểm KS</th>
                
                <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Add Sổ Theo dõi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loadingEntranceCommitments ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin inline-block mr-2 text-indigo-600" /> Đang tải danh sách học sinh cam kết đầu vào...
                  </td>
                </tr>
              ) : entranceCommitmentStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 font-medium">
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
                      <td colSpan={8} className="text-center py-10 text-slate-400">
                        Không tìm thấy học sinh nào khớp với từ khóa tìm kiếm.
                      </td>
                    </tr>
                  );
                }

                return filtered.map((s: any, index: number) => {
                  const hasPsychology = s.committedSubjects.some((sub: string) => sub.toLowerCase().includes("tâm lý"))
                  const existingTarget = targets.find(t => 
                    t.studentId === s.id && 
                    (hasPsychology ? t.supportType === "PSYCHOLOGICAL" : t.supportType === "ACADEMIC")
                  )
                  const isApproved = existingTarget?.assignments && existingTarget.assignments.length > 0
                  const isTerminated = existingTarget?.terminationStatus === "TERMINATED"
                  const isPending = existingTarget?.terminationStatus === "PENDING_TERMINATION"

                  const isAssigned = existingTarget?.assignments?.some((a: any) => a.teacherId === teacher?.id)
                  const matchedClass = assignedClasses.find((c: any) => c.id === s.classId)
                  const isHomeroomTeacherOfThisClass = matchedClass ? matchedClass.isHomeroom : false
                  const canEvaluateCommitment = existingTarget?.supportType === "PSYCHOLOGICAL"
                    ? (isAssigned && !isHomeroomTeacherOfThisClass)
                    : isAssigned

                  let statusText = "Chưa đề xuất hỗ trợ"
                  let statusClass = "bg-slate-100 text-slate-600 border border-slate-200"

                  if (existingTarget) {
                    if (isTerminated) {
                      statusText = "Đã kết thúc"
                      statusClass = "bg-emerald-100 text-emerald-800"
                    } else if (isPending) {
                      statusText = "Hoàn thành"
                      statusClass = "bg-amber-100 text-amber-800"
                    } else if (isApproved || existingTarget.status === "ĐÃ DUYỆT" || existingTarget.status === "ACTIVE") {
                      statusText = "Đang hỗ trợ"
                      statusClass = "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    } else {
                      statusText = "Đang đề xuất"
                      statusClass = "bg-blue-50 text-blue-700 border border-blue-200"
                    }
                  }

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                        {s.studentCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => handleOpenProfile(s.id)} className="font-bold text-[#48BFE3] hover:text-[#008f85] hover:underline text-left transition-all cursor-pointer">{s.studentName}</button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-bold text-xs">
                        {s.className}
                        {s.isHomeroom && <span className="text-[10px] text-indigo-600 font-black block mt-0.5">(Lớp chủ nhiệm)</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-xs font-medium">
                        {s.enrollmentDate ? new Date(s.enrollmentDate).toLocaleDateString("vi-VN") : "Chưa có"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {s.committedSubjects.map((sub: string, index: number) => {
                            const isMatched = s.matchedSubjects?.includes(sub)
                            return (
                              <span 
                                key={index} 
                                className={`w-max px-2 py-0.5 rounded text-[11px] font-bold border ${
                                  isMatched 
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {sub}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {s.committedSubjects.map((sub: string, index: number) => {
                            let scoreDisplay = "Chưa có";
                            const subLower = sub.toLowerCase();
                            if (subLower.includes("toán")) {
                              if (s.mathScore != null) scoreDisplay = `${s.mathScore}`;
                              else {
                                const sc = s.scores?.find((x:any) => x.subject?.name?.toLowerCase().includes("toán"));
                                if (sc?.scores) scoreDisplay = `${sc.scores}`;
                              }
                            } else if (subLower.includes("văn") || subLower.includes("tiếng việt")) {
                              if (s.literatureScore != null) scoreDisplay = `${s.literatureScore}`;
                              else {
                                const sc = s.scores?.find((x:any) => {
                                  const n = x.subject?.name?.toLowerCase() || "";
                                  return n.includes("văn") || n.includes("tiếng việt");
                                });
                                if (sc?.scores) scoreDisplay = `${sc.scores}`;
                              }
                            } else if (subLower.includes("anh")) {
                              const write = s.writtenEnglishScore;
                              const oral = s.oralEnglishScore;
                              if (write != null || oral != null) {
                                scoreDisplay = `${write ?? "-"} viết, ${oral ?? "-"} nói`;
                              } else {
                                const sc = s.scores?.find((x:any) => x.subject?.name?.toLowerCase().includes("anh"));
                                if (sc?.scores) scoreDisplay = `${sc.scores}`;
                              }
                            } else if (subLower.includes("tâm lý")) {
                              if (s.psychologyScore != null) scoreDisplay = `${s.psychologyScore}`;
                              else {
                                const sc = s.scores?.find((x:any) => x.subject?.name?.toLowerCase().includes("tâm lý"));
                                if (sc?.scores) scoreDisplay = `${sc.scores}`;
                              }
                            } else {
                              if (s.scores && s.scores.length > 0) {
                                const sc = s.scores.find((x:any) => {
                                  const n = x.subject?.name?.toLowerCase() || "";
                                  return subLower.includes(n) || n.includes(subLower.replace("môn ", ""));
                                });
                                if (sc?.scores) scoreDisplay = `${sc.scores}`;
                              }
                            }
                            return (
                              <span key={index} className="text-[11px] font-bold text-slate-600 block whitespace-nowrap">
                                <span className="text-slate-400 font-normal">{sub}:</span> <span className="text-indigo-600 font-black">{getCompactScore(scoreDisplay)}</span>
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => {
                            if (existingTarget) {
                              setActiveSubTab("assigned")
                            } else {
                              setProposeClassId(s.classId)
                              setIsProposeModalOpen(true)
                              setSelectedStudentIds([s.id])
                              const activeSubs = s.matchedSubjects?.length > 0 
                                ? s.matchedSubjects 
                                : [s.committedSubjects[0]]
                              setSelectedSubjects(activeSubs)
                              const scoreDetails = s.committedSubjects.map((sub: string) => {
                                let scoreDisplay = "Chưa có";
                                const subLower = sub.toLowerCase();
                                if (subLower.includes("toán")) {
                                  if (s.mathScore != null) scoreDisplay = `${s.mathScore}`;
                                  else {
                                    const sc = s.scores?.find((x:any) => x.subject?.name?.toLowerCase().includes("toán"));
                                    if (sc?.scores) scoreDisplay = `${sc.scores}`;
                                  }
                                } else if (subLower.includes("văn") || subLower.includes("tiếng việt")) {
                                  if (s.literatureScore != null) scoreDisplay = `${s.literatureScore}`;
                                  else {
                                    const sc = s.scores?.find((x:any) => {
                                      const n = x.subject?.name?.toLowerCase() || "";
                                      return n.includes("văn") || n.includes("tiếng việt");
                                    });
                                    if (sc?.scores) scoreDisplay = `${sc.scores}`;
                                  }
                                } else if (subLower.includes("anh")) {
                                  const write = s.writtenEnglishScore;
                                  const oral = s.oralEnglishScore;
                                  if (write != null || oral != null) {
                                    scoreDisplay = `${write ?? "-"} viết, ${oral ?? "-"} nói`;
                                  } else {
                                    const sc = s.scores?.find((x:any) => x.subject?.name?.toLowerCase().includes("anh"));
                                    if (sc?.scores) scoreDisplay = `${sc.scores}`;
                                  }
                                } else if (subLower.includes("tâm lý")) {
                                  if (s.psychologyScore != null) scoreDisplay = `${s.psychologyScore}`;
                                  else {
                                    const sc = s.scores?.find((x:any) => x.subject?.name?.toLowerCase().includes("tâm lý"));
                                    if (sc?.scores) scoreDisplay = `${sc.scores}`;
                                  }
                                } else {
                                  if (s.scores && s.scores.length > 0) {
                                    const sc = s.scores.find((x:any) => {
                                      const n = x.subject?.name?.toLowerCase() || "";
                                      return subLower.includes(n) || n.includes(subLower.replace("môn ", ""));
                                    });
                                    if (sc?.scores) scoreDisplay = `${sc.scores}`;
                                  }
                                }
                                return `${sub}: ${getCompactScore(scoreDisplay)}`;
                              }).join(", ");
                              setProposeNotes(`[Đề xuất từ Cam kết Khảo sát đầu vào]: Học sinh có cam kết môn ${s.committedSubjects.join(", ")} tại kỳ khảo sát đầu vào. Điểm khảo sát: ${scoreDetails}`)
                              fetchClassStudents(s.classId)
                            }
                          }}
                          className="bg-[#48BFE3] hover:bg-[#009085] text-white font-bold py-1.5 px-3 rounded-xl text-xs transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                          title="Chuyển sang Sổ theo dõi đánh giá"
                        >
                          <Plus className="h-3.5 w-3.5" /> Sổ theo dõi
                        </button>
                      </td>
                    </tr>
                  )
                });
              })()}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {approvedHistoryCount > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
              <div className="p-2 bg-emerald-500 text-white rounded-lg animate-bounce shrink-0">
                <Bell className="h-4 w-4 fill-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-900">
                  Thông báo kết quả xét duyệt: Có {approvedHistoryCount} đề xuất bồi dưỡng của bạn đã được BGH / KTĐBCL xét duyệt và phân công giáo viên phụ trách.
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Các đề xuất đã duyệt sẽ được chuyển sang trạng thái &quot;Đang hỗ trợ&quot; hoặc &quot;Hoàn thành&quot;.
                </div>
              </div>
            </div>
          )}
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Học sinh</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Lớp</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Chương trình hỗ trợ</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Môn học cần bồi dưỡng</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày đề xuất</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái bồi dưỡng</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {groupedHistoryTargets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Bạn chưa gửi đề xuất bồi dưỡng nào trong năm học này.
                  </td>
                </tr>
              ) : (
                groupedHistoryTargets.map((group: any) => {
                  return (
                    <tr key={group.studentId} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => handleOpenProfile(group.studentId)} className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-left transition-all cursor-pointer">{group.student?.studentName}</button>
                        <div className="text-xs text-slate-500">{group.student?.studentCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-semibold">
                        {group.class?.className}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2.5">
                          {group.targets.map((t: any) => (
                            <div key={t.id} className="h-6 flex items-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                t.supportType === "ACADEMIC" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}>
                                {t.supportType === "ACADEMIC" ? "Bồi dưỡng Văn hóa" : "Hỗ trợ Tâm lý"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2.5">
                          {group.targets.map((t: any) => {
                            const cleanedReason = Array.from(new Set((t.reason || "").split(",").map((s: any) => s.trim()).filter(Boolean))).join(", ");
                            return (
                              <div key={t.id} className="h-6 flex items-center text-slate-700 font-semibold text-xs">
                                {cleanedReason || "N/A"}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2.5">
                          {group.targets.map((t: any) => (
                            <div key={t.id} className="h-6 flex items-center text-slate-500 text-xs">
                              {new Date(t.createdAt).toLocaleDateString("vi-VN")}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2.5">
                          {group.targets.map((t: any) => {
                            const isApproved = t.assignments && t.assignments.length > 0
                            const isTerminated = t.terminationStatus === "TERMINATED"
                            const isPending = t.terminationStatus === "PENDING_TERMINATION"
                            return (
                              <div key={t.id} className="h-6 flex items-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  isTerminated 
                                    ? "bg-emerald-100 text-emerald-800" 
                                    : isPending 
                                    ? "bg-amber-100 text-amber-800" 
                                    : isApproved 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}>
                                  {isTerminated 
                                    ? "Đã kết thúc" 
                                    : isPending 
                                    ? "Hoàn thành" 
                                    : isApproved 
                                    ? "Đang hỗ trợ" 
                                    : "Đang đề xuất"}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2.5">
                          {group.targets.map((t: any) => {
                            const isApproved = t.assignments && t.assignments.length > 0
                            return (
                              <div key={t.id} className="h-6 flex items-center justify-center">
                                {!isApproved ? (
                                  <button
                                    onClick={() => handleDeleteTarget(t.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3.5 rounded-lg text-[10px] transition-all shadow-xs"
                                  >
                                    Xóa
                                  </button>
                                ) : (
                                  <span className="text-emerald-600 font-bold text-[10px] inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-xs"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Đã duyệt</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* --- TEACHER MODALS SECTION --- */}

      {/* 1. Modal Đề xuất học sinh bồi dưỡng */}
      {isProposeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col transition-all duration-300">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-600 text-white shadow-xs">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Đề xuất HS Theo dõi
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
                        const newClassId = e.target.value
                        setProposeClassId(newClassId)
                        setStudentSearchQuery("")
                        fetchClassStudents(newClassId)
                        
                        // Cập nhật loại hỗ trợ dựa theo vai trò (GVCN vs GVBM vs GVBM Tâm lý)
                        const selectedClass = assignedClasses.find((c: any) => c.id === newClassId)
                        if (selectedClass) {
                          const teachesPsych = selectedClass.subjects?.some((sub: any) => 
                            (sub?.subjectName || sub?.name || "").toLowerCase().includes("tâm lý")
                          ) || false;
                          const teachesAcad = selectedClass.subjects?.some((sub: any) => 
                            !(sub?.subjectName || sub?.name || "").toLowerCase().includes("tâm lý")
                          ) || false;

                          if (selectedClass.isHomeroom || (teachesPsych && !teachesAcad)) {
                            setProposePsychological(true)
                            setProposeAcademic(false)
                            setSelectedSubjects([])
                            setProposePsychReason("Tâm lý")
                          } else {
                            setProposePsychological(false)
                            setProposeAcademic(true)
                            // Tự động chọn các môn học GV đang phụ trách tại lớp này (loại trừ Tâm lý)
                            const academicSubjects = selectedClass.subjects?.filter((s: any) => 
                              !(s.subjectName || s.name || "").toLowerCase().includes("tâm lý")
                            ) || []
                            setSelectedSubjects(academicSubjects.map((s: any) => s.subjectName || s.name))
                          }
                        } else {
                           setProposePsychological(false)
                           setProposeAcademic(false)
                           setSelectedSubjects([])
                        }
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
                      {(() => {
                        const selectedClassObj = assignedClasses.find((c: any) => c.id === proposeClassId)
                        const isHomeroom = selectedClassObj?.isHomeroom || false
                        const teachesPsychology = selectedClassObj?.subjects?.some((sub: any) => 
                          (sub?.subjectName || sub?.name || "").toLowerCase().includes("tâm lý")
                        ) || false
                        const teachesAcademic = selectedClassObj?.subjects?.some((sub: any) => 
                          !(sub?.subjectName || sub?.name || "").toLowerCase().includes("tâm lý")
                        ) || false
                        const canProposePsych = proposeClassId && (isHomeroom || teachesPsychology)
                        const canProposeAcademic = proposeClassId && (teachesAcademic || !isHomeroom)

                        return (
                          <>
                            <label className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                              proposeAcademic 
                                ? "bg-indigo-50 border-indigo-500 text-indigo-900 shadow-3xs" 
                                : "bg-slate-50 border-slate-200 text-slate-500"
                            } ${canProposeAcademic ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}>
                              <input
                                type="checkbox"
                                checked={proposeAcademic}
                                disabled={!canProposeAcademic}
                                onChange={e => {
                                  const val = e.target.checked;
                                  setProposeAcademic(val);
                                  if (val) setProposePsychological(false);
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 disabled:opacity-50"
                              />
                              Bồi dưỡng Văn hóa
                            </label>
                            <label className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                              proposePsychological 
                                ? "bg-indigo-50 border-indigo-500 text-indigo-900 shadow-3xs" 
                                : "bg-slate-50 border-slate-200 text-slate-500"
                            } ${canProposePsych ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}>
                              <input
                                type="checkbox"
                                checked={proposePsychological}
                                disabled={!canProposePsych}
                                onChange={e => {
                                  const val = e.target.checked;
                                  setProposePsychological(val);
                                  if (val) setProposeAcademic(false);
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 disabled:opacity-50"
                              />
                              Hỗ trợ Tâm lý
                            </label>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Môn học bồi dưỡng */}
                  {proposeAcademic && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Môn học cần bồi dưỡng:</label>
                      <div className="border border-slate-100 rounded-xl max-h-36 overflow-y-auto p-2 space-y-1 bg-slate-50/50">
                        {((): any => {
                          const selClassObj = assignedClasses.find(c => c.id === proposeClassId)
                          const assignedSubs = (selClassObj?.subjects || []).filter(
                            (sub: any) => !(sub.subjectName || sub.name || "").toLowerCase().includes("tâm lý")
                          )

                          if (assignedSubs.length === 0) {
                            return (
                              <div className="p-3 text-xs text-amber-700 bg-amber-50 rounded-lg border border-amber-200 font-medium">
                                Giáo viên chưa được phân công giảng dạy môn văn hóa nào tại lớp này.
                              </div>
                            )
                          }

                          return assignedSubs.map((sub: any) => {
                            const name = sub.subjectName || sub.name
                            const isChecked = selectedSubjects.includes(name)

                            return (
                              <label 
                                key={sub.id || name} 
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
                                  <span className="text-[9px] bg-indigo-100 text-indigo-700 font-black px-1.5 py-0.5 rounded-md shrink-0">Môn giảng dạy</span>
                                </span>
                              </label>
                            )
                          })
                        })()}
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

                  {/* Tháng đề xuất bồi dưỡng */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tháng bắt đầu hỗ trợ:</label>
                    <select
                      value={proposeMonth}
                      onChange={e => setProposeMonth(e.target.value)}
                      className="w-full rounded-xl border-slate-200 border py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-slate-50 cursor-pointer"
                    >
                      {["Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

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

      {/* 2. Modal Nhận xét & Đánh giá định kỳ */}
      {isEvaluationModalOpen && (() => {
        const isCommitment = activeSubTab === "commitments" || evalTargetObj?.notes?.includes("Cam kết Khảo sát đầu vào");
        
        const targetLabel = isCommitment ? "Cam kết đầu vào" : "Đề xuất hỗ trợ";
        const targetColor = isCommitment ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
        
        const startDateLabel = isCommitment ? "Ngày nhập học:" : "Ngày duyệt đề xuất:";
        let startDateValue = "Chưa có dữ liệu";
        
        if (isCommitment && evalStudent?.enrollmentDate) {
          startDateValue = new Date(evalStudent.enrollmentDate).toLocaleDateString("vi-VN");
        } else if (!isCommitment && evalTargetObj?.approvedAt) {
          startDateValue = new Date(evalTargetObj.approvedAt).toLocaleDateString("vi-VN");
        }

        

        const months = ["Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5"];

        const historyEvals = evalTargetObj?.evaluations ? [...evalTargetObj.evaluations].sort((a:any, b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b flex justify-between items-center bg-emerald-50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" /> Form Đánh giá định kỳ
                </h2>
                <button onClick={() => setIsEvaluationModalOpen(false)}>
                  <X className="h-5 w-5 text-slate-500 hover:text-slate-800" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Phần 1: Thông tin học sinh tĩnh */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  {selectedEvalTargetIds.length > 1 ? (
                    <div className="font-bold text-slate-800">
                      Đang đánh giá hàng loạt {selectedEvalTargetIds.length} học sinh
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-4 mb-3 pb-3 border-b border-slate-200">
                        <div>
                          <span className="text-xs text-slate-500 font-bold block">Mã HS</span>
                          <span className="text-sm font-semibold text-slate-800">{evalStudent?.studentCode || evalStudent?.code || "N/A"}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-xs text-slate-500 font-bold block">Họ và tên</span>
                          <span className="text-sm font-black text-slate-800">{evalStudent?.studentName || evalStudent?.fullName || evalTargetName}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="text-xs text-slate-500 font-bold block">Lớp</span>
                          <span className="text-sm font-semibold text-slate-800">{evalStudent?.className || evalStudent?.class?.className || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 font-bold block mb-1">Đối tượng</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${targetColor}`}>{targetLabel}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 font-bold block">{startDateLabel}</span>
                          <span className="text-sm font-semibold text-slate-800">{startDateValue}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Phần 2: Lược sử (nếu chỉ 1 HS) */}
                {selectedEvalTargetIds.length <= 1 && historyEvals.length > 0 && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-indigo-800 mb-2 uppercase">Lược sử đánh giá gần đây</h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {historyEvals.map((ev:any) => (
                        <div key={ev.id} className="text-sm bg-white border border-slate-200 rounded p-2 shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-800">{ev.periodName} ({ev.periodType === "MONTH" ? "Tháng" : "Tuần"})</span>
                            <span className="text-[11px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-600">{new Date(ev.createdAt).toLocaleDateString("vi-VN")}</span>
                          </div>
                          <div className="font-bold text-indigo-700 text-xs mb-1">Mức độ: {ev.trackingLevel}</div>
                          <div className="text-slate-600 text-xs italic">{ev.comment}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phần 3: Đánh giá */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-slate-700">Kỳ đánh giá:</label>
                      <select
                        value={evalPeriodType}
                        onChange={e => setEvalPeriodType(e.target.value)}
                        className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="MONTH">Tháng</option>
                        <option value="WEEK">Tuần</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-bold text-slate-700">Tên kỳ (Ví dụ: Tháng 9):</label>
                      {evalPeriodType === "MONTH" ? (
                        <select
                          value={evalPeriodName}
                          onChange={e => setEvalPeriodName(e.target.value)}
                          className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">-- Chọn tháng --</option>
                          {months.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={evalPeriodName}
                          onChange={e => setEvalPeriodName(e.target.value)}
                          placeholder="Tuần 1..."
                          className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">Kết quả (Mức độ đạt được):</label>
                    <select
                      value={evalTrackingLevel}
                      onChange={e => {
                        const val = e.target.value;
                        setEvalTrackingLevel(val);
                        if (val === "Đạt mục tiêu" || val === "Đã ổn định" || val === "Có tiến bộ" || val === "Có cải thiện") {
                          setEvalUpdatedStatus("Đề xuất kết thúc bồi dưỡng");
                        } else if (val === "Chưa tiến bộ" || val === "Chưa cải thiện" || val === "Giảm sút" || val === "Diễn biến phức tạp" || val === "Chuyển hỗ trợ chuyên sâu") {
                          setEvalUpdatedStatus("Xây dựng kế hoạch hỗ trợ chuyên sâu");
                        } else if (val) {
                          setEvalUpdatedStatus("Tiếp tục theo dõi");
                        } else {
                          setEvalUpdatedStatus("");
                        }
                      }}
                      className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold bg-white"
                    >
                      <option value="">-- Chọn kết quả --</option>
                      {evalTargetType === "ACADEMIC" ? (
                        <>
                          <option value="Đạt mục tiêu">Đạt mục tiêu</option>
                          <option value="Có tiến bộ">Có tiến bộ</option>
                          <option value="Duy trì">Duy trì</option>
                          <option value="Chưa tiến bộ">Chưa tiến bộ</option>
                          <option value="Giảm sút">Giảm sút</option>
                          <option value="Chưa đủ dữ liệu">Chưa đủ dữ liệu</option>
                        </>
                      ) : (
                        <>
                          <option value="Đã ổn định">Đã ổn định</option>
                          <option value="Có cải thiện">Có cải thiện</option>
                          <option value="Duy trì theo dõi">Duy trì theo dõi</option>
                          <option value="Chưa cải thiện">Chưa cải thiện</option>
                          <option value="Diễn biến phức tạp">Diễn biến phức tạp</option>
                          <option value="Chuyển hỗ trợ chuyên sâu">Chuyển hỗ trợ chuyên sâu</option>
                          <option value="Chưa đủ dữ liệu">Chưa đủ dữ liệu</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">Đề xuất hành động:</label>
                    <select
                      value={evalUpdatedStatus}
                      onChange={e => setEvalUpdatedStatus(e.target.value)}
                      className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-slate-50 text-indigo-700"
                    >
                      <option value="">-- Chọn đề xuất --</option>
                      <option value="Đề xuất kết thúc bồi dưỡng">Đề xuất hoàn thành (Kết thúc hỗ trợ)</option>
                      <option value="Xây dựng kế hoạch hỗ trợ chuyên sâu">Yêu cầu can thiệp / hỗ trợ chuyên sâu</option>
                      <option value="Tiếp tục theo dõi">Tiếp tục hỗ trợ theo kế hoạch</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">Nhật ký nhận xét chi tiết (Học lực/Tâm lý):</label>
                    <textarea
                      placeholder="Ghi cụ thể các nội dung đã kèm cặp, biểu hiện của học sinh và kế hoạch sắp tới..."
                      value={evalComment}
                      onChange={e => setEvalComment(e.target.value)}
                      className="w-full rounded-lg border-slate-300 border py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-28 resize-none bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
                <button
                  onClick={() => setIsEvaluationModalOpen(false)}
                  className="border hover:bg-slate-100 py-2.5 px-5 rounded-lg text-sm font-bold transition-all text-slate-600"
                >
                  Hủy bỏ
                </button>
                {selectedEvalTargetIds.length <= 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTermTargetId(evalTargetId || (selectedEvalTargetIds[0] || ""));
                      setTermOutcome(evalTrackingLevel);
                      setTermNotes(evalComment);
                      setIsEvaluationModalOpen(false);
                      setIsRequestTermModalOpen(true);
                    }}
                    className="border border-slate-300 hover:bg-slate-100 text-slate-750 py-2.5 px-5 rounded-lg text-sm font-bold transition-all"
                  >
                    Đề xuất kết thúc
                  </button>
                )}
                <button
                  onClick={handleSaveEvaluation}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-6 rounded-lg text-sm font-bold shadow-sm transition-all"
                >
                  Lưu Đánh giá
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 4. Sổ theo dõi kết quả từng Học sinh Modal (Học bạ điện tử bồi dưỡng) */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-900 text-white shadow-sm no-print">
              <h2 className="text-base font-bold flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                SỔ THEO DÕI KẾT QUẢ BỒI DƯỠNG & PHÁT TRIỂN HỌC SINH
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl border border-indigo-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  In học bạ
                </button>
                <button 
                  onClick={() => setIsProfileModalOpen(false)}
                  className="rounded-lg p-1 hover:bg-white/20 transition-all"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {loadingProfile ? (
              <div className="flex flex-col justify-center items-center py-24 space-y-4 flex-1">
                <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-500 font-bold">Đang tải học bạ điện tử học sinh...</p>
              </div>
            ) : !profileData ? (
              <div className="p-8 text-center text-rose-500 font-bold flex-1">
                Không thể tải dữ liệu học sinh này hoặc hồ sơ bị lỗi.
              </div>
            ) : (() => {
              const student = profileData.student || {};
              const entrance = profileData.entranceSurvey || {};
              const supportTargets = profileData.learningSupportTargets || [];
              const achievements = profileData.achievements || [];
              const highlights = profileData.highlightComments || [];
              const orientation = profileData.orientation || {};

              // Split initials
              const nameParts = (student.studentName || "Học Sinh").split(" ");
              const initials = nameParts.length > 1 ? nameParts[nameParts.length - 2][0] + nameParts[nameParts.length - 1][0] : nameParts[0].substring(0, 2);

              return (
                <div className="flex-1 overflow-y-auto flex flex-col p-6 space-y-6 bg-slate-50/50" id="print-student-record">
                  {/* Style block for print layout customization */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      body {
                        background: white !important;
                        color: black !important;
                      }
                      .no-print {
                        display: none !important;
                      }
                      #print-student-record {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 99999;
                        background: white;
                        padding: 20px;
                        overflow: visible !important;
                        display: block !important;
                      }
                      .print-page-break {
                        page-break-before: always;
                      }
                    }
                  `}} />

                  {/* Profile Header Info Card */}
                  <div className="bg-gradient-to-r from-indigo-900 to-slate-800 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center gap-6 border border-indigo-950">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-400 to-indigo-600 flex items-center justify-center font-extrabold text-lg text-white shadow-inner shrink-0 shadow-black/20 uppercase">
                      {initials}
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <h3 className="text-xl font-black">{student.studentName}</h3>
                        <span className="bg-indigo-500/25 border border-indigo-400/30 text-indigo-200 text-[10px] font-black px-2 py-0.5 rounded-full w-max mx-auto sm:mx-0">
                          #{student.studentCode}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-xs text-indigo-100">
                        <div><span className="text-indigo-300 font-medium">Lớp:</span> <strong className="text-white font-bold">{student.class?.className || "N/A"}</strong></div>
                        <div><span className="text-indigo-300 font-medium">Cơ sở:</span> <strong className="text-white font-bold">{student.campus?.name || "N/A"}</strong></div>
                        <div><span className="text-indigo-300 font-medium">Ngày sinh:</span> <strong className="text-white font-bold">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "N/A"}</strong></div>
                        <div><span className="text-indigo-300 font-medium">Giới tính:</span> <strong className="text-white font-bold">{student.gender || "N/A"}</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* Inner Navigation Tabs */}
                  <div className="flex border-b border-slate-200 gap-4 no-print">
                    <button
                      type="button"
                      onClick={() => setActiveProfileTab("overview")}
                      className={`py-2.5 px-1.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                        activeProfileTab === "overview"
                          ? "border-indigo-600 text-indigo-600 font-extrabold"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <School className="h-4 w-4" />
                      Khảo sát Đầu vào & Cam kết
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveProfileTab("timeline")}
                      className={`py-2.5 px-1.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                        activeProfileTab === "timeline"
                          ? "border-indigo-600 text-indigo-600 font-extrabold"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <TrendingUp className="h-4 w-4" />
                      Tiến trình Hỗ trợ bồi dưỡng
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveProfileTab("achievements")}
                      className={`py-2.5 px-1.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                        activeProfileTab === "achievements"
                          ? "border-indigo-600 text-indigo-600 font-extrabold"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Award className="h-4 w-4" />
                      Thành tích & Nhận xét nổi bật
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="space-y-6">
                    {/* Tab 1: Entrance & Commitments */}
                    {(activeProfileTab === "overview" || typeof window === "undefined") && (
                      <div className={`space-y-6 ${activeProfileTab !== "overview" ? "print-only hidden" : ""}`}>
                        {/* KSĐV K12 */}
                        {entrance && entrance.type === "K12" && (
                          <div className="bg-white rounded-2xl border p-5 shadow-xs space-y-4">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                              <BookOpen className="h-4.5 w-4.5 text-indigo-600" />
                              Kết quả khảo sát đầu vào (Khối Phổ thông)
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Môn Toán</span>
                                <span className="text-xl font-black text-slate-800 mt-1 block">{entrance.mathScore != null ? entrance.mathScore : "N/A"}</span>
                              </div>
                              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Môn Ngữ văn</span>
                                <span className="text-xl font-black text-slate-800 mt-1 block">{entrance.literatureScore != null ? entrance.literatureScore : "N/A"}</span>
                              </div>
                              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Tiếng Anh viết</span>
                                <span className="text-xl font-black text-slate-800 mt-1 block">{entrance.writtenEnglishScore != null ? entrance.writtenEnglishScore : "N/A"}</span>
                              </div>
                              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Tiếng Anh nói</span>
                                <span className="text-xl font-black text-slate-800 mt-1 block">{entrance.oralEnglishScore != null ? entrance.oralEnglishScore : "N/A"}</span>
                              </div>
                            </div>

                            {/* Detail Subjects scores if any */}
                            {entrance.scores && entrance.scores.length > 0 && (
                              <div className="space-y-2 mt-4">
                                <span className="text-xs text-slate-500 font-bold block">Chi tiết khảo sát môn chuyên biệt:</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {entrance.scores.map((s: any, i: number) => (
                                    <div key={i} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex justify-between items-center text-xs">
                                      <span className="font-bold text-slate-700">{s.subjectName}</span>
                                      <span className="font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                        Điểm: {typeof s.scores === 'object' ? JSON.stringify(s.scores) : s.scores}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Cam kết đầu vào */}
                            <div className="bg-amber-50/40 border border-amber-200/50 rounded-xl p-4.5 space-y-2.5">
                              <div className="flex items-center gap-2 text-amber-900">
                                <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />
                                <span className="text-xs font-black uppercase tracking-wider">Môn Học Cam Kết Bồi Dưỡng:</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  const parseCommittedSubjects = (note: any, resultStr?: any) => {
                                    if (!note) return []
                                    const match = note.match(/Môn cam kết:\s*\[([^\]]+)\]/i)
                                    if (match && match[1]) {
                                      return match[1].split(",").map((s: any) => s.trim())
                                    }
                                    return []
                                  }
                                  const committed = parseCommittedSubjects(entrance.directorNote || "");
                                  if (committed.length === 0) return <span className="text-xs text-slate-500 font-semibold italic">Không có môn cam kết nào được ghi nhận</span>;
                                  return committed.map((c: any, idx: number) => (
                                    <span key={idx} className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold px-3 py-1 rounded-lg">
                                      {c}
                                    </span>
                                  ));
                                })()}
                              </div>
                              {entrance.directorNote && (
                                <div className="text-xs text-amber-950/80 bg-white border border-amber-100 rounded-lg p-3 mt-2">
                                  <strong>Ghi chú Ban giám hiệu:</strong> {entrance.directorNote}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* KSĐV Preschool */}
                        {entrance && entrance.type === "PRESCHOOL" && (
                          <div className="bg-white rounded-2xl border p-5 shadow-xs space-y-4">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                              <Heart className="h-4.5 w-4.5 text-rose-500" />
                              Kết quả khảo sát đầu vào (Khối Mầm non)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              {entrance.devProfessionalComment && (
                                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                                  <strong className="text-slate-800 block mb-1">Nhận xét chuyên môn phát triển:</strong>
                                  <p className="text-slate-600 font-medium leading-relaxed italic">{entrance.devProfessionalComment}</p>
                                </div>
                              )}
                              {entrance.devPsychologyComment && (
                                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                                  <strong className="text-slate-800 block mb-1">Nhận xét tâm lý & kỹ năng:</strong>
                                  <p className="text-slate-600 font-medium leading-relaxed italic">{entrance.devPsychologyComment}</p>
                                </div>
                              )}
                              {entrance.devImportantNote && (
                                <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl md:col-span-2">
                                  <strong className="text-amber-900 block mb-1">Lưu ý quan trọng:</strong>
                                  <p className="text-amber-800 font-medium leading-relaxed">{entrance.devImportantNote}</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Preschool area scores list */}
                            {entrance.scores && entrance.scores.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <span className="text-xs text-slate-500 font-bold block">Bảng điểm đánh giá năng lực mầm non:</span>
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                                    <thead className="bg-slate-50">
                                      <tr>
                                        <th className="px-4 py-2.5 text-left font-bold text-slate-500">Lĩnh vực phát triển</th>
                                        <th className="px-4 py-2.5 text-left font-bold text-slate-500">Tiêu chí đánh giá</th>
                                        <th className="px-4 py-2.5 text-center font-bold text-slate-500">Kết quả</th>
                                        <th className="px-4 py-2.5 text-left font-bold text-slate-500">Ghi chú tiêu chí</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white">
                                      {entrance.scores.map((s: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                          <td className="px-4 py-2 font-bold text-slate-700 whitespace-nowrap">{s.areaName}</td>
                                          <td className="px-4 py-2 text-slate-600 font-medium">{s.criterionName}</td>
                                          <td className="px-4 py-2 text-center whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                              s.result === 'Đạt' || s.result === '3' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                                            }`}>
                                              {s.result === '3' ? 'Đạt (Cần hỗ trợ ít)' : s.result === '2' ? 'Cần hỗ trợ vừa' : s.result === '1' ? 'Cần hỗ trợ nhiều' : s.result}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-slate-400 font-medium italic">{s.note || "-"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {!entrance && (
                          <div className="bg-white rounded-2xl border p-8 text-center text-slate-400 italic text-xs font-semibold">
                            Không tìm thấy dữ liệu khảo sát đầu vào của học sinh này trên hệ thống.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: Tutoring Progress Timeline */}
                    {(activeProfileTab === "timeline" || typeof window === "undefined") && (
                      <div className={`space-y-6 ${activeProfileTab !== "timeline" ? "print-only hidden" : ""}`}>
                        {supportTargets.length === 0 ? (
                          <div className="bg-white rounded-2xl border p-8 text-center text-slate-400 italic text-xs font-semibold">
                            Chưa có chương trình bồi dưỡng phụ đạo nào được phê duyệt cho học sinh này trong năm học hiện tại.
                          </div>
                        ) : (
                          supportTargets.map((target: any, tIdx: number) => {
                            const evals = target.evaluations || [];
                            const sorted = [...evals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                            const proposerName = target.createdBy?.teacherName || "KTDBCL/BGH";
                            const supportTypeLabel = target.supportType === "ACADEMIC" ? "Bồi dưỡng Văn hóa" : "Hỗ trợ Tâm lý";
                            const statusColor = target.terminationStatus === "TERMINATED" ? "bg-emerald-100 text-emerald-800" : target.terminationStatus === "PENDING_TERMINATION" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800";
                            const statusText = target.terminationStatus === "TERMINATED" ? "Hoàn thành bồi dưỡng" : target.terminationStatus === "PENDING_TERMINATION" ? "Chờ duyệt kết thúc" : "Đang bồi dưỡng";
                            const cleanedReason = Array.from(new Set((target.reason || "").split(",").map((x: any) => x.trim()).filter(Boolean))).join(", ");

                            return (
                              <div key={target.id} className={`bg-white rounded-2xl border p-5 shadow-xs space-y-4 ${tIdx > 0 ? "print-page-break" : ""}`}>
                                {/* Target info banner */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3.5">
                                  <div>
                                    <h4 className="text-sm font-black text-slate-800">
                                      Chương trình: {supportTypeLabel} ({cleanedReason || "N/A"})
                                    </h4>
                                    <p className="text-slate-400 text-[10px] mt-0.5 font-semibold">
                                      Đề xuất bởi: <strong className="text-slate-600">{proposerName}</strong> • Bắt đầu: {new Date(target.startDate || target.createdAt).toLocaleDateString("vi-VN")}
                                    </p>
                                  </div>
                                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${statusColor}`}>
                                    {statusText}
                                  </span>
                                </div>

                                {/* Timeline */}
                                <div className="space-y-4">
                                  <span className="text-xs text-slate-500 font-bold block">Lịch sử đánh giá định kỳ theo tháng/tuần:</span>
                                  {sorted.length === 0 ? (
                                    <div className="text-center py-6 text-slate-400 italic text-xs border border-dashed rounded-xl bg-slate-50/50 font-semibold">
                                      Chưa có bản ghi nhận xét/đánh giá định kỳ nào được ghi nhận cho chương trình này.
                                    </div>
                                  ) : (
                                    <div className="relative pl-6 border-l border-slate-200 space-y-6 py-2 ml-3">
                                      {sorted.map((ev) => {
                                        // Level colors
                                        const lvl = ev.trackingLevel || "";
                                        const lvlBg = lvl.includes("Vượt yêu cầu") || lvl.includes("Tốt") || lvl.includes("Tiến bộ")
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                          : lvl.includes("Chưa đạt") || lvl.includes("Cần hỗ trợ") || lvl.includes("Yếu")
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : "bg-blue-50 text-blue-700 border-blue-200";

                                        return (
                                          <div key={ev.id} className="relative">
                                            {/* Circular timeline node indicator */}
                                            <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-indigo-600 bg-white shadow-2xs">
                                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                                            </span>

                                            {/* Card detail body */}
                                            <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-4 shadow-3xs flex flex-col space-y-2 hover:bg-slate-50 transition-all duration-300">
                                              <div className="flex justify-between items-center flex-wrap gap-2">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-extrabold text-slate-800 text-xs">
                                                    {ev.periodName} ({ev.periodType === "MONTH" ? "Đánh giá Tháng" : "Đánh giá Tuần"})
                                                  </span>
                                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${lvlBg}`}>
                                                    Mức độ: {lvl}
                                                  </span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                  {new Date(ev.createdAt).toLocaleDateString("vi-VN")}
                                                </span>
                                              </div>
                                              <p className="text-slate-600 text-xs font-semibold leading-relaxed italic bg-white p-3 rounded-lg border border-slate-100">
                                                &ldquo;{ev.comment}&rdquo;
                                              </p>
                                              {ev.updatedStatus && (
                                                <div className="text-[10px] font-black text-indigo-700">
                                                  📌 Đề xuất tiếp theo: {ev.updatedStatus}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Tab 3: Achievements & Highlights */}
                    {(activeProfileTab === "achievements" || typeof window === "undefined") && (
                      <div className={`space-y-6 ${activeProfileTab !== "achievements" ? "print-only hidden" : ""}`}>
                        {/* Achievements Grid */}
                        <div className="bg-white rounded-2xl border p-5 shadow-xs space-y-3">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                            <Award className="h-4.5 w-4.5 text-indigo-600" />
                            Danh sách thành tích học sinh đạt được
                          </h4>
                          {achievements.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2 text-center font-semibold">Chưa có bản ghi thành tích nào được lập trong năm học</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              {achievements.map((a: any) => (
                                <div key={a.id} className="border border-slate-100 p-3.5 rounded-xl bg-slate-50/50 flex flex-col gap-1 text-xs">
                                  <strong className="text-slate-800 text-sm font-black">{a.achievement?.title || "Khen tặng học tập"}</strong>
                                  <span className="text-[10px] text-slate-400 font-bold">{a.achievement?.date ? new Date(a.achievement.date).toLocaleDateString("vi-VN") : "Học kỳ"}</span>
                                  <p className="text-slate-500 font-medium italic mt-1">{a.notes || a.achievement?.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Highlight Comments */}
                        <div className="bg-white rounded-2xl border p-5 shadow-xs space-y-3">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                            <MessageSquare className="h-4.5 w-4.5 text-indigo-600" />
                            Ghi nhận nhận xét nổi bật từ GVCN / GVBM
                          </h4>
                          {highlights.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2 text-center font-semibold">Chưa có nhận xét nổi bật đặc biệt nào được ghi nhận</p>
                          ) : (
                            <div className="space-y-3">
                              {highlights.map((h: any) => (
                                <div key={h.id} className="border border-slate-100 p-3.5 rounded-xl bg-slate-50/50 flex flex-col gap-1.5 text-xs">
                                  <div className="flex justify-between items-center flex-wrap gap-2">
                                    <span className="font-bold text-slate-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                      Phân loại: {h.category || "Ý thức học tập"}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                      Ghi nhận bởi: {h.teacherName || "Giáo viên"} ({new Date(h.createdAt).toLocaleDateString("vi-VN")})
                                    </span>
                                  </div>
                                  <p className="text-slate-600 font-medium leading-relaxed italic bg-white p-3 rounded-lg border border-slate-100">
                                    &ldquo;{h.comment}&rdquo;
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Career Orientation */}
                        <div className="bg-white rounded-2xl border p-5 shadow-xs space-y-3">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                            <GraduationCap className="h-4.5 w-4.5 text-indigo-600" />
                            Định hướng nghề nghiệp sớm (Khối Trung học)
                          </h4>
                          {orientation && orientation.result ? (
                            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-xs">
                              <div><span className="text-slate-400 font-semibold">Hướng nghiệp định xuất:</span> <strong className="text-indigo-800 font-black">{orientation.result}</strong></div>
                              {orientation.notes && <div className="mt-2 text-slate-600 font-medium leading-relaxed italic bg-white p-3 rounded-lg border border-slate-100"><strong>Ghi chú giáo viên:</strong> {orientation.notes}</div>}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic py-2 text-center font-semibold">Chưa thiết lập thông tin định hướng nghề nghiệp cho học sinh này</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Footer buttons */}
            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50 no-print">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="border hover:bg-slate-100 py-2.5 px-6 rounded-xl text-xs font-bold transition-all text-slate-600 cursor-pointer"
              >
                Đóng học bạ
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



// Redesigned and updated at 2026-07-19T13:25:40.803Z
