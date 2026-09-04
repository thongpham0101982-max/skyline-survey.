"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  FileText, Users, Plus, Mail, Send, Search, Check, RefreshCw, X, Calendar, RotateCcw, 
  MessageSquare, TrendingUp, CheckCircle, AlertTriangle, AlertCircle, Clock, Printer, GraduationCap, School, BookOpen, Heart, Award, Info, Bell, CheckCircle2, Layers, List, LayoutGrid, Filter,
  Eye, Sparkles, ChevronRight, ArrowUpRight, BarChart3, HelpCircle, CheckSquare, Target, UserCheck, ChevronDown, CheckCheck, SlidersHorizontal, Quote, Activity, ExternalLink, Compass, ClipboardCheck, History, Edit3, Save
} from "lucide-react"

export const ACADEMIC_MONTHS = ["Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5"];

export const formatDateSafe = (dateVal: any, fallback = "Chưa có dữ liệu") => {
  if (!dateVal) return fallback;
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
      return trimmed;
    }
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return typeof dateVal === "string" ? dateVal : fallback;
    return d.toLocaleDateString("vi-VN");
  } catch {
    return typeof dateVal === "string" ? dateVal : fallback;
  }
};

export const parseEvaluationComment = (fullComment: string) => {
  if (!fullComment) return { mainComment: "", gvcnFeedback: "", phhsFeedback: "" };
  let mainComment = fullComment;
  let gvcnFeedback = "";
  let phhsFeedback = "";

  const gvcnMatch = mainComment.match(/(?:📌\s*Ý KIẾN GV(?:CN)?(?:\s*\/\s*GVBM)?:\s*)([\s\S]*?)(?=(?:👨‍👩‍👧\s*Ý KIẾN PH(?:HS|Ụ HUYNH)?)|$)/i);
  if (gvcnMatch) {
    gvcnFeedback = gvcnMatch[1].trim();
    mainComment = mainComment.replace(gvcnMatch[0], "");
  }

  const phhsMatch = mainComment.match(/(?:👨‍👩‍👧\s*Ý KIẾN PH(?:HS|Ụ HUYNH)?(?:\s*\(PHHS\))?:\s*)([\s\S]*?)$/i);
  if (phhsMatch) {
    phhsFeedback = phhsMatch[1].trim();
    mainComment = mainComment.replace(phhsMatch[0], "");
  }

  return {
    mainComment: mainComment.trim(),
    gvcnFeedback: gvcnFeedback.trim(),
    phhsFeedback: phhsFeedback.trim()
  };
};


export const getTrackingLevelBadge = (level: string) => {
  const l = (level || "").trim().toLowerCase();
  if (
    l.includes("chưa") ||
    l.includes("giảm") ||
    l.includes("phức tạp") ||
    l.includes("chuyên sâu") ||
    l.includes("can thiệp") ||
    l.includes("kém") ||
    l.includes("yếu")
  ) {
    return {
      bg: "bg-rose-50 text-rose-800 border-rose-300 ring-rose-500/20",
      badge: "bg-rose-100 text-rose-800 border-rose-200",
      pill: "bg-rose-500 text-white",
      dot: "bg-rose-500",
      icon: AlertCircle,
      shortLabel: "Chưa TB",
      colorName: "rose",
      category: "CRITICAL"
    };
  }
  if (
    l.includes("đạt mục tiêu") ||
    l.includes("đã ổn định") ||
    l.includes("hoàn thành") ||
    l.includes("xuất sắc") ||
    l.includes("tốt")
  ) {
    return {
      bg: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-500/20",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      pill: "bg-emerald-500 text-white",
      dot: "bg-emerald-500",
      icon: CheckCircle2,
      shortLabel: "Đạt MT",
      colorName: "emerald",
      category: "POSITIVE"
    };
  }
  if (l.includes("tiến bộ") || l.includes("cải thiện") || l.includes("khá")) {
    return {
      bg: "bg-sky-50 text-sky-800 border-sky-300 ring-sky-500/20",
      badge: "bg-sky-100 text-sky-800 border-sky-200",
      pill: "bg-sky-500 text-white",
      dot: "bg-sky-500",
      icon: TrendingUp,
      shortLabel: "Có TB",
      colorName: "sky",
      category: "IMPROVING"
    };
  }
  if (l.includes("duy trì") || l.includes("theo dõi") || l.includes("đang")) {
    return {
      bg: "bg-amber-50 text-amber-800 border-amber-300 ring-amber-500/20",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      pill: "bg-amber-500 text-white",
      dot: "bg-amber-500",
      icon: Clock,
      shortLabel: "Duy trì",
      colorName: "amber",
      category: "MAINTAINING"
    };
  }
  return {
    bg: "bg-slate-50 text-slate-700 border-slate-300 ring-slate-500/20",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    pill: "bg-slate-500 text-white",
    dot: "bg-slate-400",
    icon: Info,
    shortLabel: level || "KĐG",
    colorName: "slate",
    category: "OTHER"
  };
};
import toast from "react-hot-toast"
import { UrgentEmailModal } from "./components/UrgentEmailModal"
import { FeedbackGvcnPhhsModal } from "./components/FeedbackGvcnPhhsModal"
import { MONTH_WEEKS_CONFIG } from "./academic-calendar"


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


const normalizeSubjectNameClient = (sub: string, className?: string): string => {
  const clean = (sub || "").trim().replace(/^môn\s+/i, "");
  const lower = clean.toLowerCase();
  if (lower.includes("anh") || lower.includes("english") || lower.includes("tav")) {
    return "Tiếng Anh";
  }
  if (lower.includes("toán") || lower.includes("math")) {
    return "Môn Toán";
  }
  if (lower.includes("tiếng việt") || lower === "tv") {
    return "Tiếng Việt";
  }
  if (lower.includes("ngữ văn") || lower.includes("ngu van") || lower.includes("literature")) {
    return "Ngữ Văn";
  }
  if (lower === "văn" || lower.includes("văn")) {
    // If student is in primary school (grade 1 to 5), it is Tiếng Việt
    if (className && /^[1-5][._\s]|lớp\s*[1-5]/i.test(className)) {
      return "Tiếng Việt";
    }
    return "Ngữ Văn";
  }
  if (lower.includes("tâm lý") || lower.includes("psychology")) {
    return "Tâm lý";
  }
  return clean;
};

const getScoreForSubject = (s: any, subjectName: string) => {
  let scoreDisplay = "Chưa có";
  const subLower = (subjectName || "").toLowerCase();
  if (subLower.includes("toán")) {
    if (s.mathScore != null) scoreDisplay = `${s.mathScore}`;
    else {
      const sc = s.scores?.find((x: any) => x.subject?.name?.toLowerCase().includes("toán"));
      if (sc?.scores) scoreDisplay = `${sc.scores}`;
    }
  } else if (subLower.includes("tiếng việt")) {
    if (s.literatureScore != null) scoreDisplay = `${s.literatureScore}`;
    else if (s.vietnameseScore != null) scoreDisplay = `${s.vietnameseScore}`;
    else {
      const sc = s.scores?.find((x: any) => {
        const n = (x.subject?.name || x.subject?.code || "").toLowerCase();
        return n.includes("tiếng việt") || n.includes("văn");
      });
      if (sc?.scores) scoreDisplay = `${sc.scores}`;
    }
  } else if (subLower.includes("ngữ văn") || subLower.includes("văn")) {
    if (s.literatureScore != null) scoreDisplay = `${s.literatureScore}`;
    else {
      const sc = s.scores?.find((x: any) => {
        const n = (x.subject?.name || x.subject?.code || "").toLowerCase();
        return n.includes("ngữ văn") || n.includes("văn") || n.includes("tiếng việt");
      });
      if (sc?.scores) scoreDisplay = `${sc.scores}`;
    }
  } else if (subLower.includes("anh") || subLower.includes("tav") || subLower.includes("english")) {
    const write = s.writtenEnglishScore;
    const oral = s.oralEnglishScore;
    if (write != null || oral != null) {
      if (write != null && oral != null) {
        scoreDisplay = `${write} viết, ${oral} nói`;
      } else if (write != null) {
        scoreDisplay = `${write} viết`;
      } else {
        scoreDisplay = `${oral} nói`;
      }
    } else {
      const sc = s.scores?.find((x: any) => {
        const n = (x.subject?.name || x.subject?.code || "").toLowerCase();
        return n.includes("anh") || n.includes("tav") || n.includes("english");
      });
      if (sc?.scores) scoreDisplay = `${sc.scores}`;
    }
  } else if (subLower.includes("tâm lý")) {
    if (s.psychologyScore != null) scoreDisplay = `${s.psychologyScore}`;
    else {
      const sc = s.scores?.find((x: any) => x.subject?.name?.toLowerCase().includes("tâm lý"));
      if (sc?.scores) scoreDisplay = `${sc.scores}`;
    }
  } else {
    if (s.scores && s.scores.length > 0) {
      const sc = s.scores.find((x: any) => {
        const n = x.subject?.name?.toLowerCase() || "";
        return subLower.includes(n) || n.includes(subLower.replace("môn ", ""));
      });
      if (sc?.scores) scoreDisplay = `${sc.scores}`;
    }
  }
  return getCompactScore(scoreDisplay);
};


const getSubjectBadgeStyle = (subjectName: string) => {
  const sub = (subjectName || "").toLowerCase();
  if (sub.includes("toán")) {
    return "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100/80";
  }
  if (sub.includes("tiếng việt")) {
    return "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/80";
  }
  if (sub.includes("ngữ văn") || sub.includes("văn")) {
    return "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100/80";
  }
  if (sub.includes("anh") || sub.includes("tav") || sub.includes("english")) {
    return "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100/80";
  }
  if (sub.includes("tâm lý")) {
    return "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/80";
  }
  return "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70";
};

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
  const [activeSubTab, setActiveSubTab] = useState<"assigned" | "commitments" | "history" | "summary">("commitments")
  const [entranceCommitmentStudents, setEntranceCommitmentStudents] = useState<any[]>([])
  const [loadingEntranceCommitments, setLoadingEntranceCommitments] = useState(false)
  const [selectedCommitmentRowIds, setSelectedCommitmentRowIds] = useState<string[]>([])

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
  const [subjectFilter, setSubjectFilter] = useState("ALL")
  const [classFilter, setClassFilter] = useState("ALL")
  const [viewMode, setViewMode] = useState<"LIST" | "GROUPED">("LIST")

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

  // Tab 3 Summary States
  const [summaryMonthFilter, setSummaryMonthFilter] = useState<string>("ALL")
  const [summaryLevelFilter, setSummaryLevelFilter] = useState<string>("ALL")
  const [summaryCategoryFilter, setSummaryCategoryFilter] = useState<string>("ALL")
  const [summaryViewMode, setSummaryViewMode] = useState<"MATRIX" | "TABLE" | "CARDS">("MATRIX")
  const [selectedDetailEval, setSelectedDetailEval] = useState<any>(null)
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null)
  const [selectedStudentJourneyTarget, setSelectedStudentJourneyTarget] = useState<any>(null)

  // Email Reminder Modal States
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false)
  const [reminderMonth, setReminderMonth] = useState<string>("Tháng " + (new Date().getMonth() + 1))
  const [reminderTargetOption, setReminderTargetOption] = useState<"ME" | "ALL">("ALL")
  const [reminderDeadline, setReminderDeadline] = useState<string>("")
  const [reminderNote, setReminderNote] = useState<string>("")
  const [sendingReminder, setSendingReminder] = useState(false)

  // New Feature Modals States
  const [isUrgentEmailModalOpen, setIsUrgentEmailModalOpen] = useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [selectedFeedbackTarget, setSelectedFeedbackTarget] = useState<any>(null)
const [evalSelectedMonth, setEvalSelectedMonth] = useState<string>("Tháng 9")
  const [evalSelectedWeek, setEvalSelectedWeek] = useState<string>("Tuần 1")
  const [evalIsMonthlySummary, setEvalIsMonthlySummary] = useState(false)



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

  // Bulk Add Commitments To Tracking (Per Subject - Self Contained)
  const handleBulkAddCommitmentsToTracking = async () => {
    if (selectedCommitmentRowIds.length === 0) return;
    setLoading(true);
    let addedCount = 0;
    try {
      for (const rowId of selectedCommitmentRowIds) {
        const parts = rowId.split("___");
        const studentId = parts[0];
        const sub = parts.slice(1).join("___") || "Văn hóa";
        const s = entranceCommitmentStudents.find((st: any) => st.id === studentId);
        if (!s) continue;
        const score = getScoreForSubject(s, sub);
        const isPsych = sub.toLowerCase().includes("tâm lý");
        const supportType = isPsych ? "PSYCHOLOGICAL" : "ACADEMIC";
        const sourceType = isPsych ? "TAM_LY" : "ADMISSION";

        await fetch("/api/ktdbcl/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "saveTarget",
            academicYearId: selectedYearId,
            studentId: s.id,
            supportType,
            sourceType,
            reason: sub,
            notes: `[Cam kết Khảo sát đầu vào]: Học sinh có cam kết môn ${sub} tại kỳ khảo sát đầu vào. Điểm KS: ${score}`,
            status: "TIẾP TỤC THEO TUẦN"
          })
        });
        addedCount++;
      }

      toast.success(`Thêm thành công ${addedCount} lượt bồi dưỡng theo môn vào 2. Sổ theo dõi đánh giá`);
      setSelectedCommitmentRowIds([]);
      setActiveSubTab("assigned");
      await fetchTeacherData();
      await fetchEntranceCommitments();
    } catch (e: any) {
      toast.error("Thêm vào Sổ theo dõi thất bại");
    } finally {
      setLoading(false);
    }
  };

  // Add Single Student-Subject Commitment to Tracking
  const handleAddSingleCommitmentToTracking = async (row: any) => {
    if (row.existingTarget) {
      setActiveSubTab("assigned");
      return;
    }
    setLoading(true);
    try {
      const isPsych = (row.subject || "").toLowerCase().includes("tâm lý");
      const supportType = isPsych ? "PSYCHOLOGICAL" : "ACADEMIC";
      const sourceType = isPsych ? "TAM_LY" : "ADMISSION";

      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveTarget",
          academicYearId: selectedYearId,
          studentId: row.studentId,
          supportType,
          sourceType,
          reason: row.subject,
          notes: `[Cam kết Khảo sát đầu vào]: Học sinh có cam kết môn ${row.subject} tại kỳ khảo sát đầu vào. Điểm KS: ${row.score}`,
          status: "TIẾP TỤC THEO TUẦN"
        })
      });
      const data = await res.json();
      if (data.error) {
        toast.error("Thêm vào Sổ theo dõi thất bại: " + data.error);
      } else {
        toast.success(`Thêm thành công học sinh ${row.studentName} (môn ${row.subject}) vào 2. Sổ theo dõi đánh giá`);
        setActiveSubTab("assigned");
        await fetchTeacherData();
        await fetchEntranceCommitments();
      }
    } catch (e: any) {
      toast.error("Thêm vào Sổ theo dõi thất bại");
    } finally {
      setLoading(false);
    }
  };

  // Single Return Target
  const handleReturnTarget = async (id: string, studentName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn hoàn trả học sinh ${studentName || "này"} khỏi Sổ theo dõi đánh giá?`)) return
    setLoading(true)
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteTarget",
          academicYearId: selectedYearId,
          ids: [id]
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error("Hoàn trả thất bại: " + data.error)
      } else {
        toast.success(`Đã hoàn trả thành công học sinh ${studentName || ""}!`)
        setSelectedEvalTargetIds(prev => prev.filter(x => x !== id))
        await fetchTeacherData()
        await fetchEntranceCommitments()
      }
    } catch (e: any) {
      toast.error("Hoàn trả thất bại")
    } finally {
      setLoading(false)
    }
  }

  // Bulk Return Targets
  const handleBulkReturnTargets = async () => {
    if (selectedEvalTargetIds.length === 0) return
    if (!confirm(`Bạn có chắc chắn muốn hoàn trả ${selectedEvalTargetIds.length} học sinh đã chọn khỏi Sổ theo dõi đánh giá?`)) return
    setLoading(true)
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteTarget",
          academicYearId: selectedYearId,
          ids: selectedEvalTargetIds
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error("Hoàn trả thất bại: " + data.error)
      } else {
        toast.success(`Đã hoàn trả thành công ${selectedEvalTargetIds.length} học sinh!`)
        setSelectedEvalTargetIds([])
        await fetchTeacherData()
        await fetchEntranceCommitments()
      }
    } catch (e: any) {
      toast.error("Hoàn trả thất bại")
    } finally {
      setLoading(false)
    }
  }

  


  // Mở modal đánh giá định kỳ cho 1 học sinh
  const handleOpenEvaluationForSpecificPeriod = (t: any, month: string, week?: string) => {
    if (!t) return;
    try {
      setSelectedEvalTargetIds([t.id]);
      setEvalTargetId(t.id);
      setEvalTargetName(t.student?.studentName || t.student?.fullName || "Học sinh");
      setEvalTargetType(t.supportType || "ACADEMIC");
      setEvalComment("");
      setEvalStudent(t.student || null);
      setEvalTargetObj(t);
      setEditingEvalId(null);

      setEvalSelectedMonth(month);
      if (week) {
        setEvalSelectedWeek(week);
        setEvalIsMonthlySummary(false);
        setEvalPeriodType("WEEK");
        setEvalPeriodName(`${week} - ${month}`);
      } else {
        setEvalIsMonthlySummary(true);
        setEvalPeriodType("MONTH");
        setEvalPeriodName(month);
      }

      const options = Array.isArray(configs) ? configs.filter((c: any) => c.supportType === t.supportType) : [];
      if (t.supportType === "ACADEMIC") {
        setEvalTrackingLevel(options[0]?.outcomeLabel || "Duy trì");
      } else {
        setEvalTrackingLevel(options[0]?.outcomeLabel || "Duy trì theo dõi");
      }
      setEvalUpdatedStatus("Tiếp tục theo dõi");
      setIsEvaluationModalOpen(true);
    } catch (err: any) {
      console.error("Error opening specific evaluation modal:", err);
      toast.error("Lỗi khi mở form đánh giá: " + err.message);
    }
  };

  const handleOpenEvaluationModal = (t: any) => {
    if (!t) return;
    try {
      setSelectedEvalTargetIds([t.id]);
      setEvalTargetId(t.id);
      setEvalTargetName(t.student?.studentName || t.student?.fullName || "Học sinh");
      setEvalTargetType(t.supportType || "ACADEMIC");
      setEvalComment("");
      setEvalStudent(t.student || null);
      setEvalTargetObj(t);
      setEditingEvalId(null);

      const curMonth = "Tháng " + (new Date().getMonth() + 1);
      const validMonth = ACADEMIC_MONTHS.includes(curMonth) ? curMonth : "Tháng 9";
      setEvalSelectedMonth(validMonth);
      setEvalSelectedWeek("Tuần 1");
      setEvalIsMonthlySummary(false);
      setEvalPeriodType("WEEK");
      setEvalPeriodName(`Tuần 1 - ${validMonth}`);

      const options = Array.isArray(configs) ? configs.filter((c: any) => c.supportType === t.supportType) : [];
      if (t.supportType === "ACADEMIC") {
        setEvalTrackingLevel(options[0]?.outcomeLabel || "Duy trì");
      } else {
        setEvalTrackingLevel(options[0]?.outcomeLabel || "Duy trì theo dõi");
      }
      setEvalUpdatedStatus("Tiếp tục theo dõi");
      setIsEvaluationModalOpen(true);
    } catch (err: any) {
      console.error("Error opening evaluation modal:", err);
      toast.error("Lỗi khi mở form đánh giá: " + err.message);
    }
  };

  // Mở modal đánh giá hàng loạt cho các học sinh đã chọn
  const handleOpenBatchEvaluation = () => {
    if (selectedEvalTargetIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 học sinh để đánh giá");
      return;
    }
    try {
      const selectedTargets = filteredTargets.filter((t: any) => selectedEvalTargetIds.includes(t.id));
      const firstSelected = selectedTargets[0] || filteredTargets.find((t: any) => t.id === selectedEvalTargetIds[0]) || targets.find((t: any) => t.id === selectedEvalTargetIds[0]);

      if (!firstSelected) return;

      if (selectedEvalTargetIds.length === 1) {
        handleOpenEvaluationModal(firstSelected);
        return;
      }

      setEvalTargetId(firstSelected.id);
      setEvalTargetName(`Danh sách ${selectedEvalTargetIds.length} học sinh`);
      setEvalTargetType(firstSelected.supportType || "ACADEMIC");
      setEditingEvalId(null);
      setEvalStudent(firstSelected.student || null);
      setEvalTargetObj(firstSelected);
      setEvalComment("");

      const curMonth = "Tháng " + (new Date().getMonth() + 1);
      const validMonth = ACADEMIC_MONTHS.includes(curMonth) ? curMonth : "Tháng 9";
      setEvalSelectedMonth(validMonth);
      setEvalSelectedWeek("Tuần 1");
      setEvalIsMonthlySummary(false);
      setEvalPeriodType("WEEK");
      setEvalPeriodName(`Tuần 1 - ${validMonth}`);

      const options = Array.isArray(configs) ? configs.filter((c: any) => c.supportType === firstSelected.supportType) : [];
      if (firstSelected.supportType === "ACADEMIC") {
        setEvalTrackingLevel(options[0]?.outcomeLabel || "Duy trì");
      } else {
        setEvalTrackingLevel(options[0]?.outcomeLabel || "Duy trì theo dõi");
      }
      setEvalUpdatedStatus("Tiếp tục theo dõi");
      setIsEvaluationModalOpen(true);
    } catch (err: any) {
      console.error("Error opening batch evaluation modal:", err);
      toast.error("Lỗi khi mở form đánh giá hàng loạt: " + err.message);
    }
  };

  // Edit evaluation handler
  const handleEditEvaluation = (evalItem: any) => {
    const target = evalItem.target || targets.find((t: any) => t.id === evalItem.targetId);
    if (target) {
      setSelectedEvalTargetIds([target.id]);
      setEvalTargetId(target.id);
      setEvalTargetName(target.student?.studentName || evalItem.studentName);
      setEvalTargetType(target.supportType);
      setEvalStudent(target.student);
      setEvalTargetObj(target);
    }
    setEditingEvalId(evalItem.id);
    setEvalPeriodType(evalItem.periodType || "MONTH");
    setEvalPeriodName(evalItem.periodName);

    const matchedMonth = ACADEMIC_MONTHS.find(m => evalItem.periodName.includes(m)) || "Tháng 9";
    setEvalSelectedMonth(matchedMonth);
    if (evalItem.periodName.includes("Tuần")) {
      const matchW = evalItem.periodName.match(/Tuần \d+/);
      if (matchW) setEvalSelectedWeek(matchW[0]);
      setEvalIsMonthlySummary(false);
    } else {
      setEvalIsMonthlySummary(true);
    }

    setEvalTrackingLevel(evalItem.trackingLevel);
    setEvalComment(evalItem.comment || "");
    setEvalUpdatedStatus(evalItem.updatedStatus || "Tiếp tục theo dõi");
    setSelectedDetailEval(null);
    setIsEvaluationModalOpen(true);
  };

  // Delete evaluation handler
  const handleDeleteEvaluation = async (evalId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bản ghi đánh giá này? Dữ liệu đã xóa sẽ không thể phục hồi.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteEvaluation",
          academicYearId: selectedYearId,
          id: evalId
        })
      });
      const data = await res.json();
      if (data.error) {
        toast.error("Xóa đánh giá thất bại: " + data.error);
      } else {
        toast.success("Đã xóa bản ghi đánh giá thành công!");
        setSelectedDetailEval(null);
        await fetchTeacherData();
      }
    } catch (e: any) {
      toast.error("Lỗi khi xóa đánh giá: " + e.message);
    } finally {
      setLoading(false);
    }
  };

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
            id: editingEvalId || undefined,
            academicYearId: selectedYearId,
            targetId: id,
            periodType: evalPeriodType,
            periodName: evalPeriodName,
            trackingLevel: evalTrackingLevel,
            comment: evalComment.trim(),
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

      toast.success("Lưu đánh giá thành công! Dữ liệu đã được chuyển vào 3. Tổng hợp kết quả");
      setIsEvaluationModalOpen(false);
      setEditingEvalId(null);
      setSelectedEvalTargetIds([]);
      setActiveSubTab("summary");
      fetchTeacherData();
    } catch (e) {
      toast.error("Lưu nhận xét thất bại");
    }
  }

  // Send Email Reminder for Monthly Evaluation
  const handleSendEmailReminder = async () => {
    if (!reminderMonth) {
      toast.error("Vui lòng chọn tháng cần nhắc nhở");
      return;
    }
    setSendingReminder(true);
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendMonthlyReminder",
          academicYearId: selectedYearId,
          monthName: reminderMonth,
          targetTeacherId: reminderTargetOption === "ME" ? teacher?.id : "ALL",
          deadlineDate: reminderDeadline,
          customMessage: reminderNote
        })
      });
      const data = await res.json();
      if (data.error) {
        toast.error("Gửi email nhắc nhở thất bại: " + data.error);
      } else {
        if (data.sentCount > 0) {
          toast.success(`Đã gửi thành công email nhắc lịch ${reminderMonth} đến ${data.sentCount} Giáo viên!`, { duration: 5000 });
        } else {
          toast.success(data.message || `Tất cả học sinh đã được đánh giá xong cho ${reminderMonth}!`);
        }
        setIsReminderModalOpen(false);
        setReminderNote("");
      }
    } catch (e: any) {
      toast.error("Lỗi khi gửi email: " + e.message);
    } finally {
      setSendingReminder(false);
    }
  };

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



  // 1. Flatten / Split each student by their committed subjects (Unified Tiếng Anh - TAV)
  const flattenedCommitmentRows = useMemo(() => {
    const rows: any[] = [];
    (entranceCommitmentStudents || []).forEach((s: any) => {
      const rawSubs = s.committedSubjects && s.committedSubjects.length > 0
        ? s.committedSubjects
        : ["Văn hóa"];

      // Normalize keeping Tiếng Việt and Ngữ Văn distinct, passing student's className
      const normalizedSubs = Array.from(new Set(rawSubs.map((sub: string) => normalizeSubjectNameClient(sub, s.className))));

      normalizedSubs.forEach((sub: string) => {
        const rowId = `${s.id}___${sub}`;
        const isMatchedTeacher = (s.matchedSubjects || []).some((ms: string) => normalizeSubjectNameClient(ms, s.className) === sub);
        const score = getScoreForSubject(s, sub);
        const hasPsych = (sub || "").toLowerCase().includes("tâm lý");
        const existingTarget = (targets || []).find((t: any) => 
          t.studentId === s.id && (
            (t.reason && (
              t.reason.toLowerCase().includes(sub.toLowerCase()) || 
              normalizeSubjectNameClient(t.reason, s.className) === sub ||
              (sub === "Tiếng Việt" && (t.reason.toLowerCase().includes("tiếng việt") || t.reason.toLowerCase().includes("văn"))) ||
              (sub === "Ngữ Văn" && (t.reason.toLowerCase().includes("ngữ văn") || t.reason.toLowerCase().includes("văn")))
            )) ||
            (hasPsych && t.supportType === "PSYCHOLOGICAL")
          )
        );

        rows.push({
          rowId,
          studentId: s.id,
          studentName: s.studentName,
          studentCode: s.studentCode,
          className: s.className,
          classId: s.classId,
          isHomeroom: s.isHomeroom,
          enrollmentDate: s.enrollmentDate,
          subject: sub,
          score,
          isMatchedTeacher,
          existingTarget,
          rawStudent: s
        });
      });
    });
    return rows;
  }, [entranceCommitmentStudents, targets]);

  // 2. Extract Available Subjects with Counts for Tab 1
  const availableCommitmentSubjects = useMemo(() => {
    const map = new Map<string, number>();
    flattenedCommitmentRows.forEach((r: any) => {
      const sub = r.subject || "Văn hóa";
      map.set(sub, (map.get(sub) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [flattenedCommitmentRows]);

  // 3. Extract Available Classes
  const availableClasses = useMemo(() => {
    const map = new Map<string, string>();
    assignedClasses.forEach((c: any) => {
      map.set(c.id, c.className || c.name);
    });
    entranceCommitmentStudents.forEach((s: any) => {
      if (s.classId && s.className) {
        map.set(s.classId, s.className);
      }
    });
    targets.forEach((t: any) => {
      const cid = t.student?.classId || t.student?.class?.id;
      const cname = t.student?.class?.className || t.student?.className;
      if (cid && cname) {
        map.set(cid, cname);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignedClasses, entranceCommitmentStudents, targets]);

  // 4. Filtered Flattened Commitment Rows for Tab 1
  const filteredFlattenedCommitments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return flattenedCommitmentRows.filter((row: any) => {
      if (query) {
        const matchName = (row.studentName || "").toLowerCase().includes(query);
        const matchCode = (row.studentCode || "").toLowerCase().includes(query);
        const matchClass = (row.className || "").toLowerCase().includes(query);
        const matchSub = (row.subject || "").toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchClass && !matchSub) return false;
      }

      if (classFilter !== "ALL" && row.classId !== classFilter && row.className !== classFilter) {
        return false;
      }

      if (subjectFilter !== "ALL") {
        const cleanFilter = subjectFilter.toLowerCase();
        const cleanSub = (row.subject || "").toLowerCase();
        if (!cleanSub.includes(cleanFilter) && !cleanFilter.includes(cleanSub)) {
          return false;
        }
      }

      return true;
    });
  }, [flattenedCommitmentRows, searchQuery, classFilter, subjectFilter]);

  // 5. Grouped Commitment Rows by Subject for Tab 1
  const groupedCommitmentsBySubject = useMemo(() => {
    const groups: { subject: string; rows: any[] }[] = [];
    const subjectList = availableCommitmentSubjects.map(s => s.name);

    const targetSubjects = subjectFilter === "ALL" ? subjectList : subjectList.filter(s => {
      const cleanSub = s.toLowerCase();
      const cleanFilter = subjectFilter.toLowerCase();
      return cleanSub.includes(cleanFilter) || cleanFilter.includes(cleanSub);
    });

    targetSubjects.forEach(subjectName => {
      const cleanSub = subjectName.toLowerCase();
      const matched = filteredFlattenedCommitments.filter((row: any) => {
        const cs = (row.subject || "").toLowerCase();
        return cs.includes(cleanSub) || cleanSub.includes(cs);
      });
      if (matched.length > 0) {
        groups.push({ subject: subjectName, rows: matched });
      }
    });

    return groups;
  }, [availableCommitmentSubjects, filteredFlattenedCommitments, subjectFilter]);

  // 6. Filtered Targets for Tab 2
  const filteredTargets = useMemo(() => {
    const seenKeys = new Set<string>();
    return targets.filter(t => {
      const isCommitmentTarget = t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết Khảo sát đầu vào"));
      const isCreatedByMe = t.createdById === teacher?.id;
      const isAssignedToMe = t.assignments?.some((a: any) => a.teacherId === teacher?.id);
      const isHomeroomStudent = homeroomClasses.some(c => c.students?.some((s: any) => s.id === t.studentId));
      const isClassTeacher = assignedClasses.some((c: any) => c.id === t.student?.classId);

      const isCKDV = isCommitmentTarget && (isHomeroomStudent || isClassTeacher);
      const isBSTD = !isCommitmentTarget && (isCreatedByMe || isAssignedToMe);

      if (!isCKDV && !isBSTD) return false;

      const targetCategory = isCommitmentTarget ? "CKDV" : "BSTD";
      const dedupeKey = `${t.studentId}_${t.supportType}_${targetCategory}`;
      if (seenKeys.has(dedupeKey)) return false;
      seenKeys.add(dedupeKey);

      if (roleFilter === "HOMEROOM" && !isHomeroomStudent) return false;
      if (roleFilter === "ASSIGNED" && !isAssignedToMe && !isCreatedByMe) return false;

      if (classFilter !== "ALL") {
        const studentClassId = t.student?.classId || t.student?.class?.id;
        const studentClassName = t.student?.class?.className || t.student?.className;
        if (studentClassId !== classFilter && studentClassName !== classFilter) return false;
      }

      if (subjectFilter !== "ALL") {
        const reason = (t.reason || (t.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý")).toLowerCase();
        const cleanFilter = subjectFilter.toLowerCase();
        if (!reason.includes(cleanFilter) && !cleanFilter.includes(reason)) return false;
      }

      if (monthFilter !== "ALL") {
        const hasEvalInMonth = t.evaluations?.some((e: any) => e.periodName === monthFilter);
        if (!hasEvalInMonth) return false;
      }

      const sortedEvals = t.evaluations ? [...t.evaluations].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
      const latestEval = sortedEvals[0];
      const currentLevel = latestEval ? latestEval.trackingLevel : "Đang hỗ trợ";
      if (levelFilter !== "ALL") {
        const badgeInfo = getTrackingLevelBadge(currentLevel);
        const match =
          currentLevel === levelFilter ||
          (levelFilter === "Đạt mục tiêu" && badgeInfo.category === "POSITIVE") ||
          (levelFilter === "Có tiến bộ" && badgeInfo.category === "IMPROVING") ||
          (levelFilter === "Duy trì" && badgeInfo.category === "MAINTAINING") ||
          (levelFilter === "Chưa tiến bộ" && badgeInfo.category === "CRITICAL") ||
          (levelFilter === "Đang hỗ trợ" && currentLevel === "Đang hỗ trợ");
        if (!match) return false;
      }

      const name = t.student?.studentName || t.student?.fullName || "";
      const code = t.student?.studentCode || t.student?.code || "";
      const matchesSearch = searchQuery === "" || 
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [targets, teacher?.id, homeroomClasses, assignedClasses, roleFilter, classFilter, subjectFilter, monthFilter, levelFilter, searchQuery]);

  // 7. Extract Available Subjects for Tab 2
  const availableAssignedSubjects = useMemo(() => {
    const map = new Map<string, number>();
    targets.forEach((t: any) => {
      const rawSubjects = (t.reason || (t.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý")).split(",");
      rawSubjects.forEach((sub: string) => {
        const clean = sub.trim();
        if (clean) {
          map.set(clean, (map.get(clean) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [targets]);

  // 8. Dynamic Subjects for Current Active Tab
  const currentTabAvailableSubjects = useMemo(() => {
    if (activeSubTab === "commitments") return availableCommitmentSubjects;
    if (activeSubTab === "assigned") return availableAssignedSubjects;
    return availableCommitmentSubjects;
  }, [activeSubTab, availableCommitmentSubjects, availableAssignedSubjects]);

  // 9. Grouped Targets by Subject for Tab 2
  const groupedTargetsBySubject = useMemo(() => {
    const groups: { subject: string; targets: any[] }[] = [];
    const subjectList = availableAssignedSubjects.map(s => s.name);

    const targetSubjects = subjectFilter === "ALL" ? subjectList : subjectList.filter(s => {
      const cleanSub = s.toLowerCase();
      const cleanFilter = subjectFilter.toLowerCase();
      return cleanSub.includes(cleanFilter) || cleanFilter.includes(cleanSub);
    });

    targetSubjects.forEach(subjectName => {
      const cleanSub = subjectName.toLowerCase();
      const matched = filteredTargets.filter(t => {
        const reason = (t.reason || (t.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý")).toLowerCase();
        return reason.includes(cleanSub) || cleanSub.includes(reason);
      });
      if (matched.length > 0) {
        groups.push({ subject: subjectName, targets: matched });
      }
    });

    return groups;
  }, [availableAssignedSubjects, filteredTargets, subjectFilter]);

  // Filter students related to this teacher - ONLY 2 SOURCES: CKĐV & BSTD
  const summaryEvaluations = useMemo(() => {
    const list: any[] = [];
    (filteredTargets || []).forEach((t: any) => {
      const isCommitment = t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết Khảo sát đầu vào"));
      const evals = t.evaluations || [];
      evals.forEach((ev: any) => {
        list.push({
          evalId: ev.id,
          targetId: t.id,
          studentId: t.studentId,
          studentCode: t.student?.studentCode || t.student?.code || "N/A",
          studentName: t.student?.studentName || t.student?.fullName || "N/A",
          className: t.student?.class?.className || t.student?.className || "N/A",
          category: isCommitment ? "CKĐV" : "BSTD",
          subject: t.reason || (t.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý"),
          supportType: t.supportType,
          periodName: ev.periodName || "Tháng",
          periodType: "MONTH",
          trackingLevel: ev.trackingLevel || "N/A",
          comment: ev.comment || "Không có nhận xét",
          updatedStatus: ev.updatedStatus || "Tiếp tục theo dõi",
          createdAt: ev.createdAt,
          evaluatorName: ev.evaluator?.name || teacher?.name || "Giáo viên",
          target: t
        });
      });
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredTargets, teacher]);

  // Tab 3 Filtered Evaluations
  const filteredSummaryEvaluations = useMemo(() => {
    return summaryEvaluations.filter((ev) => {
      if (summaryMonthFilter !== "ALL" && ev.periodName !== summaryMonthFilter) {
        return false;
      }
      if (summaryLevelFilter !== "ALL") {
        const badgeInfo = getTrackingLevelBadge(ev.trackingLevel);
        if (summaryLevelFilter === "POSITIVE" && badgeInfo.category !== "POSITIVE") return false;
        if (summaryLevelFilter === "IMPROVING" && badgeInfo.category !== "IMPROVING") return false;
        if (summaryLevelFilter === "MAINTAINING" && badgeInfo.category !== "MAINTAINING") return false;
        if (summaryLevelFilter === "CRITICAL" && badgeInfo.category !== "CRITICAL") return false;
      }
      if (summaryCategoryFilter !== "ALL" && ev.category !== summaryCategoryFilter) {
        return false;
      }
      return true;
    });
  }, [summaryEvaluations, summaryMonthFilter, summaryLevelFilter, summaryCategoryFilter]);

  // Tab 3 Monthly Evaluation Counts
  const evalCountByMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    ACADEMIC_MONTHS.forEach(m => { counts[m] = 0; });
    summaryEvaluations.forEach(ev => {
      if (ev.periodName && counts[ev.periodName] !== undefined) {
        counts[ev.periodName]++;
      }
    });
    return counts;
  }, [summaryEvaluations]);

  // Tab 3 KPI Stats
  const summaryKpiStats = useMemo(() => {
    const total = summaryEvaluations.length;
    const uniqueStudents = new Set(summaryEvaluations.map(e => e.studentId)).size;
    let positive = 0;
    let improving = 0;
    let maintaining = 0;
    let critical = 0;

    summaryEvaluations.forEach(e => {
      const b = getTrackingLevelBadge(e.trackingLevel);
      if (b.category === "POSITIVE") positive++;
      else if (b.category === "IMPROVING") improving++;
      else if (b.category === "MAINTAINING") maintaining++;
      else if (b.category === "CRITICAL") critical++;
    });

    return {
      total,
      uniqueStudents,
      positive,
      improving,
      maintaining,
      critical,
      positiveRate: total > 0 ? Math.round(((positive + improving) / total) * 100) : 0
    };
  }, [summaryEvaluations]);

  // Tab 3 Matrix rows (Filtered targets that match search & filters)
  const matrixTargets = useMemo(() => {
    return (filteredTargets || []).filter((t: any) => {
      const isCommitment = t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết Khảo sát đầu vào"));
      const cat = isCommitment ? "CKĐV" : "BSTD";
      if (summaryCategoryFilter !== "ALL" && cat !== summaryCategoryFilter) return false;

      if (summaryMonthFilter !== "ALL") {
        const hasMonth = (t.evaluations || []).some((e: any) => e.periodName === summaryMonthFilter);
        if (!hasMonth) return false;
      }

      if (summaryLevelFilter !== "ALL") {
        const hasLevel = (t.evaluations || []).some((e: any) => {
          const b = getTrackingLevelBadge(e.trackingLevel);
          return (
            (summaryLevelFilter === "POSITIVE" && b.category === "POSITIVE") ||
            (summaryLevelFilter === "IMPROVING" && b.category === "IMPROVING") ||
            (summaryLevelFilter === "MAINTAINING" && b.category === "MAINTAINING") ||
            (summaryLevelFilter === "CRITICAL" && b.category === "CRITICAL")
          );
        });
        if (!hasLevel) return false;
      }

      return true;
    });
  }, [filteredTargets, summaryCategoryFilter, summaryMonthFilter, summaryLevelFilter]);

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
          const isHR = homeroomClasses.some(c => c.students?.some((s: any) => s.id === t.studentId));
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

      {/* 3 Main Sub-Tabs / Feature Tags with vibrant colors, distinct highlights & live badges */}
      <div className="bg-slate-100/90 p-1.5 sm:p-2 rounded-3xl border border-slate-200/90 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Tab 1: HS Cam kết Học tập/Tâm lý */}
        <button
          type="button"
          onClick={() => setActiveSubTab("commitments")}
          className={`relative flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl transition-all cursor-pointer text-left ${
            activeSubTab === "commitments"
              ? "bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/25 scale-[1.01] ring-2 ring-amber-400/40"
              : "bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/70 hover:border-amber-300 shadow-2xs hover:shadow-xs"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl transition-colors shrink-0 ${
              activeSubTab === "commitments"
                ? "bg-white/20 text-white shadow-inner"
                : "bg-amber-100 text-amber-700"
            }`}>
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-black tracking-tight ${
                  activeSubTab === "commitments" ? "text-white" : "text-slate-900"
                }`}>
                  1. HS Cam kết Học tập/Tâm lý
                </span>
              </div>
              <p className={`text-[10px] font-medium leading-none mt-1 ${
                activeSubTab === "commitments" ? "text-amber-100" : "text-slate-500"
              }`}>
                Dữ liệu khảo sát & cam kết đầu vào
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ${
            activeSubTab === "commitments"
              ? "bg-white text-amber-800 shadow-sm"
              : "bg-amber-100 text-amber-900 border border-amber-200"
          }`}>
            {flattenedCommitmentRows.length}
          </span>
        </button>

        {/* Tab 2: Sổ theo dõi đánh giá */}
        <button
          type="button"
          onClick={() => setActiveSubTab("assigned")}
          className={`relative flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl transition-all cursor-pointer text-left ${
            activeSubTab === "assigned"
              ? "bg-gradient-to-r from-teal-900 via-[#003B3A] to-[#009085] text-white shadow-lg shadow-[#003B3A]/25 scale-[1.01] ring-2 ring-teal-400/40"
              : "bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/70 hover:border-teal-300 shadow-2xs hover:shadow-xs"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl transition-colors shrink-0 ${
              activeSubTab === "assigned"
                ? "bg-white/20 text-white shadow-inner"
                : "bg-teal-100 text-[#003B3A]"
            }`}>
              <Users className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-black tracking-tight ${
                  activeSubTab === "assigned" ? "text-white" : "text-slate-900"
                }`}>
                  2. Sổ theo dõi đánh giá
                </span>
              </div>
              <p className={`text-[10px] font-medium leading-none mt-1 ${
                activeSubTab === "assigned" ? "text-teal-100" : "text-slate-500"
              }`}>
                Ghi nhận & nhận xét định kỳ theo tháng
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ${
            activeSubTab === "assigned"
              ? "bg-white text-[#003B3A] shadow-sm"
              : "bg-teal-100 text-[#003B3A] border border-teal-200"
          }`}>
            {filteredTargets.length}
          </span>
        </button>

        {/* Tab 3: Tổng hợp kết quả */}
        <button
          type="button"
          onClick={() => setActiveSubTab("summary")}
          className={`relative flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl transition-all cursor-pointer text-left ${
            activeSubTab === "summary"
              ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-600/25 scale-[1.01] ring-2 ring-emerald-400/40"
              : "bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/70 hover:border-emerald-300 shadow-2xs hover:shadow-xs"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl transition-colors shrink-0 ${
              activeSubTab === "summary"
                ? "bg-white/20 text-white shadow-inner"
                : "bg-emerald-100 text-emerald-800"
            }`}>
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-black tracking-tight ${
                  activeSubTab === "summary" ? "text-white" : "text-slate-900"
                }`}>
                  3. Tổng hợp kết quả
                </span>
              </div>
              <p className={`text-[10px] font-medium leading-none mt-1 ${
                activeSubTab === "summary" ? "text-emerald-100" : "text-slate-500"
              }`}>
                Ma trận tiến trình 10 tháng & thống kê
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ${
            activeSubTab === "summary"
              ? "bg-white text-emerald-800 shadow-sm"
              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
          }`}>
            {summaryEvaluations.length}
          </span>
        </button>
      </div>

      {/* Action panel & Multi-Dimension Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Action buttons on the left */}
          <div className="flex flex-wrap items-center gap-2.5">
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
              className="bg-gradient-to-r from-[#003B3A] to-[#009085] hover:from-[#002a29] hover:to-[#007a70] text-white py-2.5 px-4 rounded-xl font-black text-xs flex items-center gap-2 shadow-md shadow-[#003B3A]/20 transition-all transform active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 text-[#48BFE3]" />
              Đề xuất HS Theo dõi
            </button>

            

            
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[210px] flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="Tìm tên, mã HS, môn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-7 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48BFE3]/30 focus:border-[#009085] transition-all"
              />
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Subject Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
              <BookOpen className="h-3.5 w-3.5 text-[#009085] shrink-0" />
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer pr-1"
              >
                <option value="ALL">Tất cả môn học</option>
                {currentTabAvailableSubjects.map((sub: any) => (
                  <option key={sub.name} value={sub.name}>
                    {sub.name} ({sub.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Class Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
              <Layers className="h-3.5 w-3.5 text-[#009085] shrink-0" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer pr-1"
              >
                <option value="ALL">Tất cả lớp học</option>
                {availableClasses.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Month & Level Filters for Assigned Tab */}
            {activeSubTab === "assigned" && (
              <>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer shadow-2xs"
                >
                  <option value="ALL">Tất cả các tháng</option>
                  {["Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer shadow-2xs"
                >
                  <option value="ALL">Tất cả mức độ</option>
                  <option value="Đạt mục tiêu">🟢 Đạt mục tiêu / Đã ổn định</option>
                  <option value="Có tiến bộ">🔵 Có tiến bộ / Cải thiện</option>
                  <option value="Duy trì">🟡 Duy trì / Tiếp tục theo dõi</option>
                  <option value="Chưa tiến bộ">🔴 Chưa tiến bộ / Hỗ trợ chuyên sâu</option>
                  <option value="Đang hỗ trợ">⚪ Đang hỗ trợ</option>
                </select>
              </>
            )}

            {/* View Mode Switcher (List vs Grouped) */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode("LIST")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "LIST"
                    ? "bg-white text-[#003B3A] shadow-xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Xem dạng danh sách tổng hợp"
              >
                <List className="h-3.5 w-3.5" />
                <span>Danh sách</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("GROUPED")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "GROUPED"
                    ? "bg-white text-[#003B3A] shadow-xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Gom nhóm theo từng Môn học"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Gom theo môn</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Subject Filter Chips */}
        {currentTabAvailableSubjects.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">
              Môn học:
            </span>
            <button
              onClick={() => setSubjectFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                subjectFilter === "ALL"
                  ? "bg-gradient-to-r from-[#003B3A] to-[#009085] text-white shadow-sm shadow-[#003B3A]/20 scale-[1.02]"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 border border-slate-200/60"
              }`}
            >
              Tất cả môn ({activeSubTab === "commitments" ? flattenedCommitmentRows.length : (activeSubTab === "assigned" ? filteredTargets.length : summaryEvaluations.length)})
            </button>
            {currentTabAvailableSubjects.map((sub: any) => {
              const isSelected = subjectFilter === sub.name;
              return (
                <button
                  key={sub.name}
                  onClick={() => setSubjectFilter(isSelected ? "ALL" : sub.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                    isSelected
                      ? "bg-gradient-to-r from-[#003B3A] to-[#009085] text-white border-transparent shadow-sm shadow-[#003B3A]/20 scale-[1.02]"
                      : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <span>{sub.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {sub.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Student Target List Taught/Assigned */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      ) : activeSubTab === "assigned" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={selectedEvalTargetIds.length === 0}
                onClick={handleOpenBatchEvaluation}
                className="bg-indigo-600 disabled:bg-slate-300 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Đánh giá nhiều Học sinh
              </button>
              <button
                disabled={selectedEvalTargetIds.length === 0}
                onClick={handleBulkReturnTargets}
                className="bg-amber-500 disabled:bg-slate-300 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                title="Hoàn trả các học sinh đã chọn"
              >
                <RotateCcw className="h-4 w-4" />
                Hoàn trả {selectedEvalTargetIds.length > 0 ? `(${selectedEvalTargetIds.length})` : ""}
              </button>
            </div>
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
                    const canEvaluate = true
                    
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
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEvaluationModal(t)}
                                className="bg-gradient-to-r from-[#003B3A] to-[#009085] hover:from-[#002a29] hover:to-[#007a70] text-white font-bold py-1.5 px-4 rounded-xl text-xs transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer transform active:scale-95"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-[#48BFE3]" />
                                <span>Nhận xét & Đánh giá</span>
                              </button>
                            </>
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
      ) : activeSubTab === "summary" ? (
        <div className="space-y-6">
          {/* Header Banner & Live KPI Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* KPI 1: Tổng lượt đánh giá */}
            <div className="bg-gradient-to-br from-teal-900 via-[#003B3A] to-[#009085] text-white p-4 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-3 -bottom-3 opacity-15 group-hover:opacity-25 transition-opacity">
                <FileText className="w-16 h-16" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-200">Tổng lượt đánh giá</span>
                <span className="p-1.5 bg-white/10 rounded-lg backdrop-blur-xs">
                  <Activity className="w-3.5 h-3.5 text-teal-200" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight">{summaryKpiStats.total}</div>
                <div className="text-[11px] text-teal-100 font-medium mt-0.5">Tất cả các tháng</div>
              </div>
            </div>

            {/* KPI 2: Số HS đã đánh giá */}
            <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Học sinh theo dõi</span>
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Users className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-indigo-900">{summaryKpiStats.uniqueStudents}</div>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Đã ghi nhận kết quả</div>
              </div>
            </div>

            {/* KPI 3: Đạt mục tiêu / Ổn định */}
            <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between hover:border-emerald-400 transition-all group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Đạt mục tiêu</span>
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-emerald-900">{summaryKpiStats.positive}</span>
                  {summaryKpiStats.total > 0 && (
                    <span className="text-[11px] font-extrabold text-emerald-700">
                      ({Math.round((summaryKpiStats.positive / summaryKpiStats.total) * 100)}%)
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-emerald-700/80 font-semibold mt-0.5">Hoàn thành kế hoạch</div>
              </div>
            </div>

            {/* KPI 4: Có tiến bộ */}
            <div className="bg-sky-50/60 border border-sky-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between hover:border-sky-400 transition-all group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-700">Có tiến bộ</span>
                <span className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-sky-900">{summaryKpiStats.improving}</span>
                  {summaryKpiStats.total > 0 && (
                    <span className="text-[11px] font-extrabold text-sky-700">
                      ({Math.round((summaryKpiStats.improving / summaryKpiStats.total) * 100)}%)
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-sky-700/80 font-semibold mt-0.5">Tiếp tục cải thiện</div>
              </div>
            </div>

            {/* KPI 5: Duy trì theo dõi */}
            <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Duy trì / Theo dõi</span>
                <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                  <Clock className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-amber-900">{summaryKpiStats.maintaining}</span>
                  {summaryKpiStats.total > 0 && (
                    <span className="text-[11px] font-extrabold text-amber-700">
                      ({Math.round((summaryKpiStats.maintaining / summaryKpiStats.total) * 100)}%)
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-amber-700/80 font-semibold mt-0.5">Tiếp tục theo dõi</div>
              </div>
            </div>

            {/* KPI 6: Cần hỗ trợ thêm */}
            <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between hover:border-rose-400 transition-all group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">Hỗ trợ chuyên sâu</span>
                <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-rose-900">{summaryKpiStats.critical}</span>
                  {summaryKpiStats.total > 0 && (
                    <span className="text-[11px] font-extrabold text-rose-700">
                      ({Math.round((summaryKpiStats.critical / summaryKpiStats.total) * 100)}%)
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-rose-700/80 font-semibold mt-0.5">Cần can thiệp thêm</div>
              </div>
            </div>
          </div>

          {/* Month Quick-Select Ribbon (Dải chọn Tháng nhanh) */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-[#003B3A] to-[#009085] text-white rounded-xl">
                  <Calendar className="h-4 w-4 text-[#48BFE3]" />
                </div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  Xem kết quả đánh giá theo từng Tháng trong năm học
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">
                  {summaryMonthFilter === "ALL" ? "Đang hiển thị toàn bộ 10 tháng" : `Đang lọc: ${summaryMonthFilter}`}
                </span>
                {summaryMonthFilter !== "ALL" && (
                  <button
                    onClick={() => setSummaryMonthFilter("ALL")}
                    className="text-[11px] font-extrabold text-teal-700 hover:text-teal-900 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200 transition-all cursor-pointer"
                  >
                    Xem tất cả
                  </button>
                )}
              </div>
            </div>

            {/* Month Buttons Bar */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSummaryMonthFilter("ALL")}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                  summaryMonthFilter === "ALL"
                    ? "bg-gradient-to-r from-[#003B3A] to-[#009085] text-white border-transparent shadow-md shadow-[#003B3A]/20 scale-[1.02]"
                    : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-teal-50/50 hover:border-teal-300"
                }`}
              >
                <span>Tất cả các tháng</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  summaryMonthFilter === "ALL" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {summaryEvaluations.length}
                </span>
              </button>

              {ACADEMIC_MONTHS.map((m) => {
                const count = evalCountByMonth[m] || 0;
                const isSelected = summaryMonthFilter === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSummaryMonthFilter(isSelected ? "ALL" : m)}
                    className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-md shadow-emerald-600/20 scale-[1.02] font-black"
                        : count > 0
                        ? "bg-white text-slate-800 border-teal-200/90 hover:bg-teal-50 hover:border-teal-400 font-bold"
                        : "bg-slate-50/80 text-slate-400 border-slate-200/60 hover:bg-slate-100"
                    }`}
                  >
                    <span>{m}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : count > 0
                        ? "bg-teal-100 text-teal-800"
                        : "bg-slate-200/70 text-slate-400"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-Filters & View Mode Toolbar */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            {/* Left Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter Category (CKĐV / BSTD) */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
                <span className="text-[11px] font-bold text-slate-500">Đối tượng:</span>
                <select
                  value={summaryCategoryFilter}
                  onChange={(e) => setSummaryCategoryFilter(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Tất cả đối tượng</option>
                  <option value="CKĐV">Cam kết đầu vào (CKĐV)</option>
                  <option value="BSTD">Bổ sung theo dõi (BSTD)</option>
                </select>
              </div>

              {/* Filter Outcome Level */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
                <span className="text-[11px] font-bold text-slate-500">Kết quả:</span>
                <select
                  value={summaryLevelFilter}
                  onChange={(e) => setSummaryLevelFilter(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Tất cả mức độ</option>
                  <option value="POSITIVE">🟢 Đạt mục tiêu / Đã ổn định</option>
                  <option value="IMPROVING">🔵 Có tiến bộ / Cải thiện</option>
                  <option value="MAINTAINING">🟡 Duy trì / Tiếp tục theo dõi</option>
                  <option value="CRITICAL">🔴 Chưa tiến bộ / Hỗ trợ chuyên sâu</option>
                </select>
              </div>

              {(summaryMonthFilter !== "ALL" || summaryCategoryFilter !== "ALL" || summaryLevelFilter !== "ALL" || searchQuery || subjectFilter !== "ALL" || classFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSummaryMonthFilter("ALL");
                    setSummaryCategoryFilter("ALL");
                    setSummaryLevelFilter("ALL");
                    setSearchQuery("");
                    setSubjectFilter("ALL");
                    setClassFilter("ALL");
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Đặt lại bộ lọc
                </button>
              )}
            </div>

            {/* Right: View Mode Toggle */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setSummaryViewMode("MATRIX")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    summaryViewMode === "MATRIX"
                      ? "bg-white text-[#003B3A] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Ma trận tiến trình đánh giá theo 10 tháng"
                >
                  <LayoutGrid className="h-3.5 w-3.5 text-[#009085]" />
                  <span>Ma trận theo Tháng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryViewMode("TABLE")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    summaryViewMode === "TABLE"
                      ? "bg-white text-[#003B3A] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Bảng danh sách chi tiết các bản ghi"
                >
                  <List className="h-3.5 w-3.5 text-[#009085]" />
                  <span>Bảng chi tiết</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryViewMode("CARDS")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    summaryViewMode === "CARDS"
                      ? "bg-white text-[#003B3A] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Xem dạng thẻ học sinh sinh động"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#009085]" />
                  <span>Thẻ học sinh</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-2 rounded-xl shadow-xs transition-all cursor-pointer no-print"
                title="In kết quả tổng hợp"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: MA TRẬN TIẾN TRÌNH THEO 10 THÁNG */}
          {summaryViewMode === "MATRIX" && (
            <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
              <div className="bg-gradient-to-r from-teal-50/80 via-slate-50 to-white px-5 py-3.5 border-b border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-gradient-to-br from-[#003B3A] to-[#009085] text-white rounded-xl shadow-xs">
                    <BarChart3 className="h-4 w-4 text-[#48BFE3]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#003B3A] uppercase tracking-tight">
                      Ma trận theo dõi kết quả đánh giá 10 tháng năm học ({matrixTargets.length} học sinh)
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Nhấp vào từng ô tháng để xem chi tiết nhận xét & đề xuất của tháng đó
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Đạt MT</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span> Có TB</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Duy trì</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Hỗ trợ sâu</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200/80 text-left">
                  <thead className="bg-slate-50/90 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-3 text-center w-10 sticky left-0 bg-slate-50 z-10">TT</th>
                      <th className="px-3 py-3 whitespace-nowrap sticky left-10 bg-slate-50 z-10">Mã HS</th>
                      <th className="px-4 py-3 whitespace-nowrap sticky left-24 bg-slate-50 z-10">Họ và tên</th>
                      <th className="px-3 py-3 text-center whitespace-nowrap">Lớp</th>
                      <th className="px-3 py-3 text-center whitespace-nowrap">Đối tượng</th>
                      <th className="px-3 py-3 whitespace-nowrap">Môn bồi dưỡng</th>

                      {/* 10 Month Columns */}
                      {ACADEMIC_MONTHS.map((m) => {
                        const isFilteredMonth = summaryMonthFilter === m;
                        return (
                          <th
                            key={m}
                            className={`px-2 py-3 text-center text-xs whitespace-nowrap transition-colors ${
                              isFilteredMonth
                                ? "bg-teal-100/90 text-[#003B3A] font-black border-b-2 border-teal-600"
                                : "text-slate-700"
                            }`}
                          >
                            {m.replace("Tháng ", "T")}
                          </th>
                        );
                      })}

                      <th className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-slate-50 z-10">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {matrixTargets.length === 0 ? (
                      <tr>
                        <td colSpan={17} className="text-center py-12 text-slate-400 font-medium">
                          Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      matrixTargets.map((target: any, idx: number) => {
                        const isCommitment = target.sourceType === "ADMISSION" || (target.notes && target.notes.includes("Cam kết Khảo sát đầu vào"));
                        const targetEvals = target.evaluations || [];
                        const subjectDisplay = target.reason || (target.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý");

                        return (
                          <tr key={target.id} className="hover:bg-teal-50/30 transition-colors group">
                            <td className="px-3 py-3 text-center font-bold text-slate-400 sticky left-0 bg-white group-hover:bg-teal-50/30 z-10">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-3 font-semibold text-slate-600 whitespace-nowrap sticky left-10 bg-white group-hover:bg-teal-50/30 z-10">
                              {target.student?.studentCode || target.student?.code || "N/A"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap sticky left-24 bg-white group-hover:bg-teal-50/30 z-10">
                              <button
                                onClick={() => handleOpenProfile(target.studentId)}
                                className="font-extrabold text-[#003B3A] hover:text-[#009085] hover:underline text-left cursor-pointer transition-colors block"
                              >
                                {target.student?.studentName || target.student?.fullName || "N/A"}
                              </button>
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-slate-700 whitespace-nowrap">
                              {target.student?.class?.className || target.student?.className || "N/A"}
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                isCommitment
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-indigo-100 text-indigo-900 border border-indigo-300"
                              }`}>
                                {isCommitment ? "CKĐV" : "BSTD"}
                              </span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${getSubjectBadgeStyle(subjectDisplay)}`}>
                                {subjectDisplay}
                              </span>
                            </td>

                            {/* 10 Monthly Cells */}
                            {ACADEMIC_MONTHS.map((m) => {
                              const monthEvals = targetEvals.filter((e: any) => e.periodName === m || (e.periodName && e.periodName.includes(m)));
                              const ev = monthEvals.length > 0 ? monthEvals[monthEvals.length - 1] : null;
                              const isFilteredMonth = summaryMonthFilter === m;

                              if (!ev) {
                                return (
                                  <td
                                    key={m}
                                    className={`px-2 py-3 text-center text-slate-300 font-medium ${
                                      isFilteredMonth ? "bg-teal-50/40" : ""
                                    }`}
                                  >
                                    <span className="text-slate-300">-</span>
                                  </td>
                                );
                              }

                              const badgeInfo = getTrackingLevelBadge(ev.trackingLevel);
                              const IconComponent = badgeInfo.icon;

                              return (
                                <td
                                  key={m}
                                  className={`px-1.5 py-2.5 text-center whitespace-nowrap ${
                                    isFilteredMonth ? "bg-teal-50/70" : ""
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDetailEval({
                                      ...ev,
                                      targetId: target.id,
                                      studentId: target.studentId,
                                      studentCode: target.student?.studentCode || target.student?.code,
                                      studentName: target.student?.studentName || target.student?.fullName,
                                      className: target.student?.class?.className || target.student?.className,
                                      category: isCommitment ? "CKĐV" : "BSTD",
                                      subject: subjectDisplay,
                                      evaluatorName: ev.evaluator?.name || teacher?.name || "Giáo viên",
                                      target
                                    })}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-black border transition-all transform hover:scale-105 cursor-pointer shadow-2xs ${badgeInfo.badge}`}
                                    title={`${m}: ${ev.trackingLevel} - ${ev.comment || ""}`}
                                  >
                                    <IconComponent className="h-3 w-3 shrink-0" />
                                    <span>{badgeInfo.shortLabel}</span>
                                  </button>
                                </td>
                              );
                            })}

                            {/* Actions column */}
                            <td className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-teal-50/30 z-10">
                              <button
                                type="button"
                                onClick={() => setSelectedStudentJourneyTarget(target)}
                                className="text-xs font-bold text-[#003B3A] hover:text-white hover:bg-[#003B3A] bg-teal-50 border border-teal-200/90 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                title="Xem toàn bộ hành trình tiến trình các tháng của học sinh này"
                              >
                                <Compass className="h-3 w-3 text-[#009085]" />
                                <span>Tiến trình</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: BẢNG CHI TIẾT ĐẦY ĐỦ CÁC BẢN GHI */}
          {summaryViewMode === "TABLE" && (
            <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
              <div className="bg-gradient-to-r from-teal-50/80 via-slate-50 to-white px-5 py-3.5 border-b border-teal-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-gradient-to-br from-[#003B3A] to-[#009085] text-white rounded-xl shadow-xs">
                    <List className="h-4 w-4 text-[#48BFE3]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#003B3A] uppercase tracking-tight">
                      Danh sách chi tiết các lượt đánh giá ({filteredSummaryEvaluations.length} bản ghi)
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Tổng hợp từng tháng kèm nhận xét chi tiết và đề xuất hành động
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">STT</th>
                      <th className="px-4 py-3 whitespace-nowrap">Mã HS</th>
                      <th className="px-5 py-3 whitespace-nowrap">Họ và tên</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">Lớp</th>
                      <th className="px-3 py-3 text-center whitespace-nowrap">Đối tượng</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">Kỳ đánh giá</th>
                      <th className="px-4 py-3 whitespace-nowrap">Kết quả (Mức độ)</th>
                      <th className="px-6 py-3">Nhật ký nhận xét chi tiết</th>
                      <th className="px-5 py-3 whitespace-nowrap">Đề xuất hành động</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">Ngày ghi</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredSummaryEvaluations.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-12 text-slate-400 font-medium">
                          Chưa có bản ghi đánh giá nào khớp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredSummaryEvaluations.map((item, index) => {
                        const badgeInfo = getTrackingLevelBadge(item.trackingLevel);
                        const IconComponent = badgeInfo.icon;

                        return (
                          <tr key={`${item.evalId}-${index}`} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3.5 text-center text-slate-400 font-bold">{index + 1}</td>
                            <td className="px-4 py-3.5 font-semibold text-slate-600 whitespace-nowrap">{item.studentCode}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <button
                                onClick={() => handleOpenProfile(item.studentId)}
                                className="font-extrabold text-[#003B3A] hover:text-[#009085] hover:underline text-left cursor-pointer transition-colors"
                              >
                                {item.studentName}
                              </button>
                            </td>
                            <td className="px-4 py-3.5 text-center font-bold text-slate-700 whitespace-nowrap">{item.className}</td>
                            <td className="px-3 py-3.5 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                item.category === "CKĐV"
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-indigo-100 text-indigo-900 border border-indigo-300"
                              }`}>
                                {item.category}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-teal-50 text-[#003B3A] border border-teal-200">
                                {item.periodName}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${badgeInfo.badge}`}>
                                <IconComponent className="h-3.5 w-3.5 shrink-0" />
                                <span>{item.trackingLevel}</span>
                              </span>
                            </td>
                            <td className="px-6 py-3.5 max-w-sm">
                              <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-200/60 text-slate-700 text-xs italic line-clamp-2">
                                "{item.comment}"
                              </div>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl block text-center">
                                {item.updatedStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center text-slate-500 font-medium whitespace-nowrap">
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : "N/A"}
                            </td>
                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedDetailEval(item)}
                                  className="text-xs font-bold text-teal-700 hover:text-white hover:bg-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Xem chi tiết nhận xét & đánh giá"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Chi tiết</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleEditEvaluation(item)}
                                  className="text-xs font-bold text-indigo-700 hover:text-white hover:bg-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Hiệu chỉnh nhận xét / kết quả đánh giá"
                                >
                                  <SlidersHorizontal className="h-3.5 w-3.5" />
                                  <span>Hiệu chỉnh</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteEvaluation(item.id)}
                                  className="text-xs font-bold text-rose-700 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Xóa bản ghi đánh giá này"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Xóa</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 3: THẺ HỌC SINH SINH ĐỘNG (CARDS GRID) */}
          {summaryViewMode === "CARDS" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matrixTargets.length === 0 ? (
                <div className="col-span-full bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-medium">
                  Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.
                </div>
              ) : (
                matrixTargets.map((target: any) => {
                  const isCommitment = target.sourceType === "ADMISSION" || (target.notes && target.notes.includes("Cam kết Khảo sát đầu vào"));
                  const targetEvals = target.evaluations || [];
                  const subjectDisplay = target.reason || (target.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý");
                  const latestEval = targetEvals.length > 0 ? targetEvals[0] : null;

                  return (
                    <div
                      key={target.id}
                      className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#003B3A] to-[#009085] text-white flex items-center justify-center font-black text-sm shadow-xs">
                              {(target.student?.studentName || "HS").charAt(0)}
                            </div>
                            <div>
                              <button
                                onClick={() => handleOpenProfile(target.studentId)}
                                className="font-black text-sm text-[#003B3A] hover:text-[#009085] hover:underline text-left cursor-pointer transition-colors block"
                              >
                                {target.student?.studentName || target.student?.fullName || "N/A"}
                              </button>
                              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mt-0.5">
                                <span>{target.student?.studentCode || target.student?.code}</span>
                                <span>•</span>
                                <span className="font-bold text-slate-700">{target.student?.class?.className || target.student?.className}</span>
                              </div>
                            </div>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                            isCommitment
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-indigo-100 text-indigo-900 border border-indigo-300"
                          }`}>
                            {isCommitment ? "CKĐV" : "BSTD"}
                          </span>
                        </div>

                        {/* Subject Badge */}
                        <div className="mb-3">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${getSubjectBadgeStyle(subjectDisplay)}`}>
                            {subjectDisplay}
                          </span>
                        </div>

                        {/* 10-Month Mini Progression Strip */}
                        <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/70 space-y-1.5">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                            Tiến trình 10 tháng năm học:
                          </span>
                          <div className="grid grid-cols-10 gap-1">
                            {ACADEMIC_MONTHS.map((m) => {
                              const monthEvals = targetEvals.filter((e: any) => e.periodName === m || (e.periodName && e.periodName.includes(m)));
                              const ev = monthEvals.length > 0 ? monthEvals[monthEvals.length - 1] : null;
                              if (!ev) {
                                return (
                                  <div
                                    key={m}
                                    className="h-6 rounded-lg bg-slate-200/70 text-[9px] font-bold text-slate-400 flex items-center justify-center"
                                    title={`${m}: Chưa đánh giá`}
                                  >
                                    {m.replace("Tháng ", "")}
                                  </div>
                                );
                              }
                              const badgeInfo = getTrackingLevelBadge(ev.trackingLevel);
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setSelectedDetailEval({
                                    ...ev,
                                    targetId: target.id,
                                    studentId: target.studentId,
                                    studentCode: target.student?.studentCode || target.student?.code,
                                    studentName: target.student?.studentName || target.student?.fullName,
                                    className: target.student?.class?.className || target.student?.className,
                                    category: isCommitment ? "CKĐV" : "BSTD",
                                    subject: subjectDisplay,
                                    evaluatorName: ev.evaluator?.name || teacher?.name || "Giáo viên",
                                    target
                                  })}
                                  className={`h-6 rounded-lg ${badgeInfo.dot} text-white text-[9px] font-black flex items-center justify-center transition-transform hover:scale-110 shadow-2xs cursor-pointer`}
                                  title={`${m}: ${ev.trackingLevel} - ${ev.comment}`}
                                >
                                  {m.replace("Tháng ", "")}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Latest evaluation comment snippet */}
                        {latestEval && (
                          <div className="mt-3 bg-teal-50/50 p-2.5 rounded-2xl border border-teal-100 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-extrabold text-[#003B3A]">{latestEval.periodName}</span>
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.2 rounded-full">
                                {latestEval.trackingLevel}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px] italic line-clamp-2">
                              "{latestEval.comment}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentJourneyTarget(target)}
                          className="flex-1 text-xs font-bold text-[#003B3A] bg-teal-50 hover:bg-teal-100/80 border border-teal-200 py-2 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Compass className="h-3.5 w-3.5 text-[#009085]" />
                          <span>Xem toàn bộ tiến trình</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenProfile(target.studentId)}
                          className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 py-2 px-3 rounded-xl transition-all cursor-pointer"
                        >
                          Hồ sơ
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* MODAL 1: XEM CHI TIẾT BẢN GHI ĐÁNH GIÁ THÁNG */}
          {selectedDetailEval && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all">
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="px-6 py-4.5 bg-gradient-to-r from-teal-900 via-[#003B3A] to-[#009085] text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
                      <FileText className="h-5 w-5 text-[#48BFE3]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight">Chi tiết Kết quả Đánh giá định kỳ</h3>
                      <p className="text-xs text-teal-200 font-medium">Bản ghi kết quả đánh giá học sinh theo từng tháng</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDetailEval(null)}
                    className="p-1.5 hover:bg-white/20 rounded-xl transition-all text-white cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5 overflow-y-auto">
                  {/* Student Info Card */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#003B3A] to-[#009085] text-white flex items-center justify-center font-black text-lg shadow-sm">
                        {(selectedDetailEval.studentName || "H").charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-slate-900">{selectedDetailEval.studentName}</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            selectedDetailEval.category === "CKĐV"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-indigo-100 text-indigo-900 border border-indigo-300"
                          }`}>
                            {selectedDetailEval.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold mt-1">
                          <span>Mã: <strong className="text-slate-800">{selectedDetailEval.studentCode}</strong></span>
                          <span>•</span>
                          <span>Lớp: <strong className="text-slate-800">{selectedDetailEval.className}</strong></span>
                          <span>•</span>
                          <span>Môn: <strong className="text-slate-800">{selectedDetailEval.subject}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Highlight Block */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Kỳ đánh giá & Mức độ */}
                    <div className="bg-teal-50/60 border border-teal-200 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">Kỳ đánh giá</span>
                      <div className="text-lg font-black text-[#003B3A] flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-[#009085]" />
                        <span>{selectedDetailEval.periodName}</span>
                      </div>
                      <div className="pt-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Mức độ đạt được:</span>
                        {(() => {
                          const badge = getTrackingLevelBadge(selectedDetailEval.trackingLevel);
                          const IconComp = badge.icon;
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border shadow-2xs ${badge.badge}`}>
                              <IconComp className="h-4 w-4" />
                              <span>{selectedDetailEval.trackingLevel}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Đề xuất hành động & Thời gian */}
                    <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider block">Đề xuất hành động</span>
                      <div className="text-sm font-extrabold text-indigo-900 pt-1">
                        {selectedDetailEval.updatedStatus || "Tiếp tục theo dõi"}
                      </div>
                      <div className="pt-3 text-[11px] text-slate-500 space-y-0.5">
                        <div>Người đánh giá: <strong className="text-slate-800">{selectedDetailEval.evaluatorName}</strong></div>
                        <div>Ngày ghi nhận: <strong className="text-slate-800">{selectedDetailEval.createdAt ? new Date(selectedDetailEval.createdAt).toLocaleString("vi-VN") : "N/A"}</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* Comment Block */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                      <Quote className="h-4 w-4 text-[#009085]" />
                      Nhận xét chi tiết (Học lực / Tâm lý)
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 text-xs sm:text-sm leading-relaxed font-medium whitespace-pre-line">
                      {selectedDetailEval.comment || "Không có nhận xét"}
                    </div>
                  </div>

                  {/* 10-Month Progression Track for this student */}
                  {selectedDetailEval.target?.evaluations && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-tight flex items-center gap-1.5">
                          <Compass className="h-3.5 w-3.5 text-[#009085]" />
                          Tiến trình đánh giá qua các tháng
                        </label>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {selectedDetailEval.target.evaluations.length}/10 tháng đã đánh giá
                        </span>
                      </div>
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                        {ACADEMIC_MONTHS.map((m) => {
                          const monthEvals = (selectedDetailEval.target?.evaluations || []).filter((e: any) => e.periodName === m || (e.periodName && e.periodName.includes(m)));
                          const ev = monthEvals.length > 0 ? monthEvals[monthEvals.length - 1] : null;
                          const isCurrentModal = selectedDetailEval.periodName === m || selectedDetailEval.periodName?.includes(m);

                          if (!ev) {
                            return (
                              <div
                                key={m}
                                className="p-2 rounded-xl bg-slate-100 border border-slate-200/60 text-center text-[10px] text-slate-400 font-bold"
                              >
                                <div>{m.replace("Tháng ", "T")}</div>
                                <div className="text-[9px] mt-0.5">-</div>
                              </div>
                            );
                          }

                          const badgeInfo = getTrackingLevelBadge(ev.trackingLevel);

                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setSelectedDetailEval({
                                ...ev,
                                targetId: selectedDetailEval.targetId,
                                studentId: selectedDetailEval.studentId,
                                studentCode: selectedDetailEval.studentCode,
                                studentName: selectedDetailEval.studentName,
                                className: selectedDetailEval.className,
                                category: selectedDetailEval.category,
                                subject: selectedDetailEval.subject,
                                evaluatorName: ev.evaluator?.name || teacher?.name || "Giáo viên",
                                target: selectedDetailEval.target
                              })}
                              className={`p-2 rounded-xl border text-center text-[10px] transition-all cursor-pointer ${
                                isCurrentModal
                                  ? "ring-2 ring-[#003B3A] shadow-sm scale-105 " + badgeInfo.badge
                                  : badgeInfo.badge + " hover:scale-102"
                              }`}
                            >
                              <div className="font-black">{m.replace("Tháng ", "T")}</div>
                              <div className="font-extrabold text-[9px] mt-0.5 truncate">{badgeInfo.shortLabel}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDetailEval(null);
                      handleOpenProfile(selectedDetailEval.studentId);
                    }}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Xem toàn bộ học bạ học sinh</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditEvaluation(selectedDetailEval)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>Hiệu chỉnh</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteEvaluation(selectedDetailEval.id)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Xóa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDetailEval(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 2: XEM TOÀN BỘ TIẾN TRÌNH 10 THÁNG CỦA HỌC SINH */}
          {selectedStudentJourneyTarget && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all">
              <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4.5 bg-gradient-to-r from-teal-900 via-[#003B3A] to-[#009085] text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
                      <Compass className="h-5 w-5 text-[#48BFE3]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight">
                        Hành trình tiến trình 10 tháng: {selectedStudentJourneyTarget.student?.studentName || selectedStudentJourneyTarget.student?.fullName}
                      </h3>
                      <p className="text-xs text-teal-200 font-medium">
                        Lớp {selectedStudentJourneyTarget.student?.class?.className || selectedStudentJourneyTarget.student?.className} • Môn {selectedStudentJourneyTarget.reason || "Bồi dưỡng"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStudentJourneyTarget(null)}
                    className="p-1.5 hover:bg-white/20 rounded-xl transition-all text-white cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Timeline Body */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[72vh]">
                  <div className="relative pl-6 border-l-2 border-teal-300 space-y-6">
                    {ACADEMIC_MONTHS.map((m) => {
                      const allEvals = selectedStudentJourneyTarget.evaluations || [];
                      const monthEvals = allEvals.filter((e: any) => 
                        e.periodName === m || (e.periodName && e.periodName.includes(m))
                      );
                      const weeksInMonth = MONTH_WEEKS_CONFIG[m] || ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"];
                      const monthlySummaryEval = monthEvals.find((e: any) => e.periodType === "MONTH" || e.periodName === m || e.periodName === `Tổng kết ${m}` || (!e.periodName?.includes("Tuần") && e.periodName?.includes(m)));

                      const monthHasEvals = monthEvals.length > 0;

                      return (
                        <div key={m} className="relative group">
                          {/* Month Node Bullet */}
                          <div className={`absolute -left-[35px] top-1 w-6 h-6 rounded-full border-2 border-white shadow-xs flex items-center justify-center text-white text-[10px] font-black ${
                            monthHasEvals 
                              ? "bg-gradient-to-tr from-[#003B3A] to-[#009085]" 
                              : "bg-slate-300 text-slate-600"
                          }`}>
                            {m.replace("Tháng ", "T")}
                          </div>

                          <div className={`border rounded-2xl p-4 shadow-xs space-y-3.5 transition-all ${
                            monthHasEvals 
                              ? "bg-white border-teal-200/90 hover:border-teal-400" 
                              : "bg-slate-50/60 border-slate-200"
                          }`}>
                            {/* Month Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-[#003B3A]">{m}</span>
                                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                  monthHasEvals 
                                    ? "bg-teal-50 border-teal-200 text-[#003B3A]" 
                                    : "bg-slate-100 border-slate-200 text-slate-500"
                                }`}>
                                  {monthEvals.length} / {weeksInMonth.length + 1} mốc đánh giá
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-slate-400">
                                  {weeksInMonth.length} tuần học
                                </span>
                              </div>
                            </div>

                            {/* Danh sách các Tuần trong Tháng */}
                            <div className="space-y-2">
                              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                                <span>Tiến trình từng tuần:</span>
                              </div>

                              <div className="grid grid-cols-1 gap-2">
                                {weeksInMonth.map((w: string) => {
                                  const wEval = monthEvals.find((e: any) => 
                                    (e.periodName && e.periodName.includes(w)) || 
                                    e.periodName === w || 
                                    e.periodName === `${w} - ${m}`
                                  );

                                  if (wEval) {
                                    const badgeInfo = getTrackingLevelBadge(wEval.trackingLevel);
                                    const IconComp = badgeInfo.icon;
                                    return (
                                      <div
                                        key={w}
                                        className="p-3 rounded-xl border border-teal-200 bg-teal-50/40 space-y-2 transition-all hover:bg-teal-50/70"
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-teal-100 text-[#003B3A] border border-teal-300 flex items-center gap-1">
                                              {w}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${badgeInfo.badge}`}>
                                              <IconComp className="w-3 h-3" />
                                              <span>{wEval.trackingLevel}</span>
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-semibold text-slate-500">
                                              {formatDateSafe(wEval.createdAt, "N/A")}
                                            </span>
                                            <button
                                              onClick={() => {
                                                setSelectedStudentJourneyTarget(null);
                                                handleEditEvaluation(wEval);
                                              }}
                                              className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                                            >
                                              Sửa
                                            </button>
                                          </div>
                                        </div>

                                        {wEval.comment && (
                                          <div className="bg-white p-2.5 rounded-lg border border-teal-100 text-slate-800 text-xs leading-relaxed font-medium whitespace-pre-line">
                                            "{wEval.comment}"
                                          </div>
                                        )}

                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
                                          {wEval.updatedStatus ? (
                                            <div className="font-bold text-indigo-700 flex items-center gap-1.5">
                                              <span className="text-slate-500 font-medium">Đề xuất:</span>
                                              <span className="bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                                {wEval.updatedStatus}
                                              </span>
                                            </div>
                                          ) : <div />}

                                          {wEval.evaluator?.name && (
                                            <div className="text-slate-500 font-medium">
                                              GV đánh giá: <strong className="text-slate-700 font-bold">{wEval.evaluator.name}</strong>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Chưa có đánh giá cho tuần này
                                  return (
                                    <div
                                      key={w}
                                      className="p-2.5 rounded-xl border border-dashed border-slate-200 bg-white flex items-center justify-between text-xs hover:border-teal-300 transition-all group/item"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                          {w}
                                        </span>
                                        <span className="text-slate-400 italic text-[11px]">Chưa đánh giá</span>
                                      </div>
                                      <button
                                        onClick={() => {
                                          setSelectedStudentJourneyTarget(null);
                                          handleOpenEvaluationForSpecificPeriod(selectedStudentJourneyTarget, m, w);
                                        }}
                                        className="text-[11px] font-bold text-teal-600 hover:text-teal-800 opacity-80 group-hover/item:opacity-100 inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-teal-50 border border-transparent hover:border-teal-200 transition-all cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Đánh giá {w}</span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* ⭐ Tổng kết Tháng */}
                            <div className="pt-2 border-t border-slate-100">
                              {monthlySummaryEval ? (
                                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2 shadow-2xs">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                        ⭐ Tổng kết {m}
                                      </span>
                                      {(() => {
                                        const bInfo = getTrackingLevelBadge(monthlySummaryEval.trackingLevel);
                                        const IconComp = bInfo.icon;
                                        return (
                                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${bInfo.badge}`}>
                                            <IconComp className="w-3 h-3" />
                                            <span>{monthlySummaryEval.trackingLevel}</span>
                                          </span>
                                        );
                                      })()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-semibold text-slate-500">
                                        {formatDateSafe(monthlySummaryEval.createdAt, "N/A")}
                                      </span>
                                      <button
                                        onClick={() => {
                                          setSelectedStudentJourneyTarget(null);
                                          handleEditEvaluation(monthlySummaryEval);
                                        }}
                                        className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                                      >
                                        Sửa
                                      </button>
                                    </div>
                                  </div>
                                  {monthlySummaryEval.comment && (
                                    <div className="bg-white p-2.5 rounded-lg border border-amber-100 text-slate-800 text-xs leading-relaxed font-medium whitespace-pre-line">
                                      "{monthlySummaryEval.comment}"
                                    </div>
                                  )}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
                                    {monthlySummaryEval.updatedStatus ? (
                                      <div className="font-bold text-indigo-700 flex items-center gap-1.5">
                                        <span className="text-slate-500 font-medium">Đề xuất tổng kết:</span>
                                        <span className="bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                          {monthlySummaryEval.updatedStatus}
                                        </span>
                                      </div>
                                    ) : <div />}
                                    {monthlySummaryEval.evaluator?.name && (
                                      <div className="text-slate-500 font-medium">
                                        GV đánh giá: <strong className="text-slate-700 font-bold">{monthlySummaryEval.evaluator.name}</strong>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-2.5 rounded-xl border border-dashed border-amber-200 bg-amber-50/30 flex items-center justify-between text-xs hover:bg-amber-50/60 transition-all group/sum">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                      ⭐ Tổng kết {m}
                                    </span>
                                    <span className="text-slate-400 italic text-[11px]">Chưa có đánh giá tổng kết tháng</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedStudentJourneyTarget(null);
                                      handleOpenEvaluationForSpecificPeriod(selectedStudentJourneyTarget, m);
                                    }}
                                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900 opacity-80 group-hover/sum:opacity-100 inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-amber-100 border border-transparent hover:border-amber-300 transition-all cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Tổng kết {m}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentJourneyTarget(null)}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#003B3A] hover:bg-[#002a29] text-white transition-all cursor-pointer shadow-xs"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeSubTab === "commitments" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              disabled={selectedCommitmentRowIds.length === 0}
              onClick={handleBulkAddCommitmentsToTracking}
              className="bg-gradient-to-r from-[#003B3A] to-[#009085] disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 hover:from-[#002a29] hover:to-[#007a70] text-white font-black py-2.5 px-4.5 rounded-2xl shadow-md shadow-[#003B3A]/20 transition-all cursor-pointer inline-flex items-center gap-2 text-xs transform active:scale-95"
            >
              <Plus className="h-4 w-4 text-[#48BFE3]" />
              Thêm vào Sổ theo dõi {selectedCommitmentRowIds.length > 0 ? `(${selectedCommitmentRowIds.length} mục đã chọn)` : ""}
            </button>
          </div>

          {loadingEntranceCommitments ? (
            <div className="bg-white border rounded-2xl p-12 text-center text-slate-400">
              <RefreshCw className="h-7 w-7 animate-spin inline-block mb-2 text-indigo-600" />
              <p className="text-sm font-medium">Đang tải danh sách học sinh cam kết đầu vào...</p>
            </div>
          ) : flattenedCommitmentRows.length === 0 ? (
            <div className="bg-white border rounded-2xl p-12 text-center text-slate-400 font-medium">
              Không tìm thấy học sinh nào có môn học cam kết từ khảo sát đầu vào trong các lớp phụ trách.
            </div>
          ) : viewMode === "GROUPED" ? (
            /* GROUPED BY SUBJECT VIEW */
            <div className="space-y-6">
              {groupedCommitmentsBySubject.length === 0 ? (
                <div className="bg-white border rounded-2xl p-10 text-center text-slate-400 font-medium">
                  Không tìm thấy học sinh nào khớp với bộ lọc môn học hiện tại.
                </div>
              ) : (
                groupedCommitmentsBySubject.map((group) => {
                  const isAllGroupSelected = group.rows.length > 0 && group.rows.every((r: any) => selectedCommitmentRowIds.includes(r.rowId));
                  return (
                    <div key={group.subject} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                      {/* Subject Group Header */}
                      <div className="bg-gradient-to-r from-teal-50/90 via-slate-50 to-white border-b border-teal-100/90 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div className="p-2.5 bg-gradient-to-br from-[#003B3A] to-[#009085] text-white rounded-2xl shadow-sm">
                            <BookOpen className="h-5 w-5 text-[#48BFE3]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5">
                              <h3 className="font-black text-[#003B3A] text-sm tracking-tight">{group.subject}</h3>
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-teal-100/80 text-[#003B3A] border border-teal-200/90 shadow-2xs">
                                {group.rows.length} học sinh
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Danh sách học sinh có cam kết cần phụ đạo, bồi dưỡng môn {group.subject}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const ids = group.rows.map((r: any) => r.rowId);
                            if (isAllGroupSelected) {
                              setSelectedCommitmentRowIds(prev => prev.filter(id => !ids.includes(id)));
                            } else {
                              setSelectedCommitmentRowIds(prev => Array.from(new Set([...prev, ...ids])));
                            }
                          }}
                          className="text-xs font-bold text-[#003B3A] hover:text-[#009085] bg-white border border-teal-200/90 hover:border-teal-300 px-3.5 py-1.5 rounded-xl shadow-xs hover:bg-teal-50/50 transition-all cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
                        >
                          <Check className="h-3.5 w-3.5 text-[#009085]" />
                          {isAllGroupSelected ? "Bỏ chọn nhóm này" : `Chọn tất cả ${group.rows.length} HS`}
                        </button>
                      </div>

                      {/* Subject Students Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50/70">
                            <tr>
                              <th className="px-4 py-3 w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={isAllGroupSelected}
                                  onChange={e => {
                                    const ids = group.rows.map((r: any) => r.rowId);
                                    if (e.target.checked) setSelectedCommitmentRowIds(prev => Array.from(new Set([...prev, ...ids])));
                                    else setSelectedCommitmentRowIds(prev => prev.filter(id => !ids.includes(id)));
                                  }}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </th>
                              <th className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-12">TT</th>
                              <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mã HS</th>
                              <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Họ và tên</th>
                              <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Lớp</th>
                              <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày nhập học</th>
                              <th className="px-5 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Môn cam kết</th>
                              <th className="px-5 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Điểm KS</th>
                              <th className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-sm">
                            {group.rows.map((row: any, index: number) => {
                              return (
                                <tr key={row.rowId} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="px-4 py-3.5 whitespace-nowrap text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedCommitmentRowIds.includes(row.rowId)}
                                      onChange={e => {
                                        if (e.target.checked) setSelectedCommitmentRowIds([...selectedCommitmentRowIds, row.rowId]);
                                        else setSelectedCommitmentRowIds(selectedCommitmentRowIds.filter(id => id !== row.rowId));
                                      }}
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap text-center text-sm font-medium text-slate-500">
                                    {index + 1}
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-slate-600">
                                    {row.studentCode}
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap">
                                    <button onClick={() => handleOpenProfile(row.studentId)} className="font-bold text-[#48BFE3] hover:text-[#008f85] hover:underline text-left transition-all cursor-pointer">
                                      {row.studentName}
                                    </button>
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 font-bold text-xs">
                                    {row.className}
                                    {row.isHomeroom && <span className="text-[10px] text-indigo-600 font-black block mt-0.5">(Lớp chủ nhiệm)</span>}
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 text-xs font-medium">
                                    {row.enrollmentDate ? new Date(row.enrollmentDate).toLocaleDateString("vi-VN") : "Chưa có"}
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap">
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-indigo-600 text-white shadow-xs">
                                      {row.subject}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
                                      {row.score}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                    <button
                                      onClick={() => handleAddSingleCommitmentToTracking(row)}
                                      className="bg-[#48BFE3] hover:bg-[#009085] text-white font-bold py-1.5 px-3 rounded-xl text-xs transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                                      title="Chuyển sang Sổ theo dõi đánh giá"
                                    >
                                      <Plus className="h-3.5 w-3.5" /> {row.existingTarget ? "Sổ theo dõi" : "Thêm Sổ theo dõi"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* LIST VIEW TABLE (SEPARATED BY SUBJECT PER ROW) */
            <div className="bg-white border rounded-2xl overflow-hidden shadow-xs">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">
                      <input 
                        type="checkbox" 
                        checked={filteredFlattenedCommitments.length > 0 && filteredFlattenedCommitments.every((r: any) => selectedCommitmentRowIds.includes(r.rowId))} 
                        onChange={e => {
                          if (e.target.checked) setSelectedCommitmentRowIds(filteredFlattenedCommitments.map((r: any) => r.rowId));
                          else setSelectedCommitmentRowIds([]);
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-12">TT</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mã HS</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Họ và tên</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Lớp</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày nhập học</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Môn Cam kết</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Điểm KS</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredFlattenedCommitments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        Không tìm thấy học sinh nào khớp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredFlattenedCommitments.map((row: any, index: number) => {
                      const isSelectedSub = subjectFilter !== "ALL" && (row.subject.toLowerCase().includes(subjectFilter.toLowerCase()) || subjectFilter.toLowerCase().includes(row.subject.toLowerCase()));

                      return (
                        <tr key={row.rowId} className="hover:bg-teal-50/20 transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap text-center">
                            <input 
                              type="checkbox" 
                              checked={selectedCommitmentRowIds.includes(row.rowId)} 
                              onChange={e => {
                                if (e.target.checked) setSelectedCommitmentRowIds([...selectedCommitmentRowIds, row.rowId]);
                                else setSelectedCommitmentRowIds(selectedCommitmentRowIds.filter(id => id !== row.rowId));
                              }} 
                              className="rounded-md border-slate-300 text-[#009085] focus:ring-[#48BFE3] cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-center text-xs font-semibold text-slate-400">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold text-slate-600">
                            {row.studentCode}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#003B3A] to-[#009085] text-white font-black text-[11px] flex items-center justify-center shadow-xs shrink-0">
                                {(row.studentName || "H").charAt(0).toUpperCase()}
                              </div>
                              <button onClick={() => handleOpenProfile(row.studentId)} className="font-extrabold text-slate-800 hover:text-[#009085] hover:underline text-left transition-all cursor-pointer text-xs">
                                {row.studentName}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-extrabold text-slate-700 text-xs">{row.className}</span>
                            {row.isHomeroom && (
                              <span className="text-[10px] text-teal-700 font-bold block mt-0.5 bg-teal-50 border border-teal-200/80 px-1.5 py-0.2 rounded-md w-max">
                                Lớp chủ nhiệm
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 text-xs font-medium">
                            {row.enrollmentDate ? new Date(row.enrollmentDate).toLocaleDateString("vi-VN") : "Chưa có"}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span 
                              className={`w-max px-3 py-1 rounded-xl text-xs font-extrabold border transition-all inline-flex items-center gap-1.5 shadow-2xs ${getSubjectBadgeStyle(row.subject)}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {row.subject}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="text-xs font-black text-slate-800 bg-slate-100/90 border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                              {row.score}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-center">
                            {row.existingTarget ? (
                              <button
                                onClick={() => handleAddSingleCommitmentToTracking(row)}
                                className="bg-emerald-50 text-emerald-700 border border-emerald-300/80 hover:bg-emerald-100 font-bold py-1.5 px-3 rounded-xl text-xs transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                                title="Đã có trong Sổ theo dõi. Bấm để chuyển đến trang theo dõi."
                              >
                                <Check className="h-3.5 w-3.5 text-emerald-600" /> Sổ theo dõi
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAddSingleCommitmentToTracking(row)}
                                className="bg-gradient-to-r from-[#003B3A] to-[#009085] hover:from-[#002a29] hover:to-[#007a70] text-white font-bold py-1.5 px-3.5 rounded-xl text-xs transition-all shadow-xs inline-flex items-center gap-1.5 transform active:scale-95 cursor-pointer"
                                title="Thêm học sinh này vào Sổ theo dõi đánh giá"
                              >
                                <Plus className="h-3.5 w-3.5 text-[#48BFE3]" /> Thêm Sổ theo dõi
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
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
        const curTarget = evalTargetObj || filteredTargets.find((t: any) => t.id === selectedEvalTargetIds[0] || t.id === evalTargetId);
        const curStudent = evalStudent || curTarget?.student;
        const months = ACADEMIC_MONTHS;
        const historyEvals = curTarget?.evaluations
          ? [...curTarget.evaluations].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          : [];

        const isMulti = selectedEvalTargetIds.length > 1;
        const isCommitment = activeSubTab === "commitments" || curTarget?.notes?.includes("Cam kết Khảo sát đầu vào") || curTarget?.sourceType === "ADMISSION";

        const nameParts = ((curStudent?.studentName || curStudent?.fullName || evalTargetName || "Học Sinh")).split(" ");
        const initials = nameParts.length > 1 ? (nameParts[nameParts.length - 2][0] + nameParts[nameParts.length - 1][0]).toUpperCase() : nameParts[0].substring(0, 2).toUpperCase();

        const enrollmentDateStr = curStudent?.enrollmentDate
          ? formatDateSafe(curStudent.enrollmentDate, "N/A")
          : (curTarget?.createdAt ? formatDateSafe(curTarget.createdAt, "N/A") : "N/A");

        const dobStr = curStudent?.dateOfBirth ? formatDateSafe(curStudent.dateOfBirth, "Chưa cập nhật") : "Chưa cập nhật";
        const classNameStr = curStudent?.className || curStudent?.class?.className || curTarget?.className || "N/A";
        const campusNameStr = curStudent?.campus?.name || curStudent?.campusName || "Skyline System";
        const subjectStr = curTarget?.subject || (curTarget?.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý học đường");
        const reasonStr = curTarget?.reason || (isCommitment ? "Cam kết Khảo sát đầu vào" : "Bổ sung theo dõi học tập");
        const notesStr = curTarget?.notes || curTarget?.plan || "Chưa có ghi chú mục tiêu";

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[60] transition-all">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
              {/* Modal Header */}
              <div className="px-6 py-4.5 bg-gradient-to-r from-[#003B3A] via-[#005F56] to-[#009085] text-white flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs shadow-inner">
                    <ClipboardCheck className="h-6 w-6 text-[#48BFE3]" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                      {isMulti
                        ? `ĐÁNH GIÁ ĐỊNH KỲ HÀNG LOẠT (${selectedEvalTargetIds.length} HỌC SINH)`
                        : "PHIẾU ĐÁNH GIÁ & THEO DÕI TIẾN ĐỘ HỌC SINH"}
                    </h2>
                    <p className="text-xs text-teal-100/90 font-medium">
                      Ghi nhận kết quả bồi dưỡng, tiến độ phát triển và đề xuất kế hoạch theo từng kỳ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEvaluationModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-slate-50/40">
                {/* 1. KHỐI THÔNG TIN HỌC SINH (Hiển thị đầy đủ tất cả các trường) */}
                {isMulti ? (
                  <div className="bg-white border border-indigo-100 rounded-2xl p-4 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-950 uppercase flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-indigo-600" />
                        Danh sách học sinh được chọn ({selectedEvalTargetIds.length} học sinh):
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        Đánh giá hàng loạt
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                          <tr>
                            <th className="p-2.5 text-center w-12">STT</th>
                            <th className="p-2.5">Mã HS</th>
                            <th className="p-2.5">Họ và tên</th>
                            <th className="p-2.5">Lớp</th>
                            <th className="p-2.5">Môn/Lĩnh vực</th>
                            <th className="p-2.5 text-center">Đối tượng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {selectedEvalTargetIds.map((tid, idx) => {
                            const tObj = filteredTargets.find((t: any) => t.id === tid);
                            const isComm = tObj?.sourceType === "ADMISSION" || (tObj?.notes && tObj?.notes.includes("Cam kết Khảo sát đầu vào"));
                            return (
                              <tr key={tid} className="hover:bg-indigo-50/40 transition-colors">
                                <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                                <td className="p-2.5 font-bold text-indigo-900">{tObj?.student?.studentCode || tObj?.student?.code || "N/A"}</td>
                                <td className="p-2.5 font-black text-slate-900">{tObj?.student?.studentName || tObj?.student?.fullName}</td>
                                <td className="p-2.5 font-bold text-slate-700">{tObj?.student?.class?.className || tObj?.student?.className}</td>
                                <td className="p-2.5 font-medium text-slate-600">{tObj?.subject || (tObj?.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý")}</td>
                                <td className="p-2.5 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${isComm ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-indigo-100 text-indigo-900 border border-indigo-300"}`}>
                                    {isComm ? "CKĐV" : "BSTD"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-3.5">
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#003B3A] to-[#009085] flex items-center justify-center font-black text-base text-white shadow-inner shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-black text-slate-900">
                              {curStudent?.studentName || curStudent?.fullName || evalTargetName}
                            </h3>
                            <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                              #{curStudent?.studentCode || curStudent?.code || "N/A"}
                            </span>
                            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${isCommitment ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-indigo-100 text-indigo-900 border border-indigo-300"}`}>
                              {isCommitment ? "Cam kết đầu vào (CKĐV)" : "Bổ sung theo dõi (BSTD)"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            Lớp: <strong className="text-slate-800 font-bold">{classNameStr}</strong> • Cơ sở: <strong className="text-slate-800 font-bold">{campusNameStr}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                          Đã đánh giá: <strong className="text-emerald-700 font-black">{historyEvals.length}/10</strong> tháng
                        </span>
                      </div>
                    </div>

                    {/* Grid Full Information Fields */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Môn / Lĩnh vực:</span>
                        <span className="font-extrabold text-[#003B3A]">{subjectStr}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Ngày nhập học / bắt đầu:</span>
                        <span className="font-bold text-slate-800">{enrollmentDateStr}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Giới tính & Ngày sinh:</span>
                        <span className="font-bold text-slate-800">{curStudent?.gender || "N/A"} • {dobStr}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Mức độ hiện tại:</span>
                        <span className="font-black text-indigo-700">{historyEvals[0]?.trackingLevel || "Đang hỗ trợ"}</span>
                      </div>
                    </div>

                    {/* Additional Notes / Baseline reason */}
                    <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-amber-900 block text-[11px] uppercase">Lý do & Nội dung theo dõi ban đầu:</span>
                        <p className="text-slate-700 font-medium mt-0.5">{reasonStr}</p>
                      </div>
                      {notesStr && notesStr !== "Chưa có ghi chú mục tiêu" && (
                        <div className="sm:border-l sm:border-amber-200 sm:pl-3 sm:max-w-xs">
                          <span className="font-bold text-amber-900 block text-[11px] uppercase">Ghi chú mục tiêu:</span>
                          <p className="text-slate-600 italic mt-0.5 line-clamp-2">{notesStr}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. LƯỢC SỬ ĐÁNH GIÁ GẦN ĐÂY (Nếu đánh giá 1 HS và đã có lịch sử) */}
                {!isMulti && historyEvals.length > 0 && (
                  <div className="bg-white border border-indigo-100 rounded-2xl p-4 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-indigo-950 uppercase flex items-center gap-1.5">
                        <History className="h-4 w-4 text-indigo-600" />
                        Lược sử tiến trình đánh giá ({historyEvals.length} bản ghi):
                      </h4>
                      <span className="text-[11px] text-slate-500 font-semibold">Theo dõi sự tiến bộ qua các kỳ</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-36 overflow-y-auto pr-1">
                      {historyEvals.map((ev: any) => (
                        <div key={ev.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs space-y-1 hover:border-indigo-300 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-800">{ev.periodName}</span>
                            <span className="text-[10px] font-semibold text-slate-500">{formatDateSafe(ev.createdAt, "N/A")}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500">Mức:</span>
                            <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.2 rounded border border-indigo-200">{ev.trackingLevel}</span>
                          </div>
                          {ev.comment && (
                            <p className="text-slate-600 text-[11px] italic line-clamp-2 bg-white p-1 rounded border border-slate-100">
                              "{ev.comment}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. KHỐI NHẬP LIỆU ĐÁNH GIÁ KỲ NÀY */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                  {/* 1. KỲ ĐÁNH GIÁ: TÁCH BIỆT 2 TAB (ĐÁNH GIÁ THEO TUẦN VÀ ĐÁNH GIÁ TỔNG KẾT THÁNG) */}
                  <div className="space-y-3.5 bg-emerald-50/50 p-4 sm:p-5 rounded-2xl border border-emerald-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/70 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-700 text-white rounded-xl shadow-xs">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <label className="text-xs font-black text-slate-800 uppercase block">
                            1. Chọn Kỳ Đánh Giá
                          </label>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Chọn kỳ đánh giá theo Tuần hoặc Tổng kết Tháng
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-950 bg-emerald-100/90 px-3 py-1 rounded-xl border border-emerald-300 shadow-2xs">
                          Đang chọn: <strong className="font-black text-emerald-900">{evalPeriodName || "Chưa chọn"}</strong>
                        </span>
                      </div>
                    </div>

                    {/* NÚT CHUYỂN ĐỔI CHẾ ĐỘ (TAB SWITCHER: THEO TUẦN / THEO THÁNG) */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => {
                          setEvalIsMonthlySummary(false);
                          setEvalPeriodType("WEEK");
                          setEvalPeriodName(`${evalSelectedWeek} - ${evalSelectedMonth}`);
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          !evalIsMonthlySummary
                            ? "bg-white text-emerald-950 shadow-md shadow-slate-300/60 scale-[1.01]"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                        }`}
                      >
                        <Calendar className={`w-4 h-4 ${!evalIsMonthlySummary ? "text-emerald-600" : "text-slate-500"}`} />
                        <span>📅 1. ĐÁNH GIÁ THEO TUẦN</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEvalIsMonthlySummary(true);
                          setEvalPeriodType("MONTH");
                          setEvalPeriodName(evalSelectedMonth);
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          evalIsMonthlySummary
                            ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/30 scale-[1.01]"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                        }`}
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>⭐ 2. ĐÁNH GIÁ TỔNG KẾT THÁNG</span>
                      </button>
                    </div>

                    {/* NỘI DUNG CHỌN KỲ THEO TỪNG CHẾ ĐỘ */}
                    {!evalIsMonthlySummary ? (
                      /* === CHẾ ĐỘ 1: ĐÁNH GIÁ THEO TUẦN === */
                      <div className="space-y-3 bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
                        {/* Bước 1: Chọn Tháng */}
                        <div>
                          <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black">1</span>
                            Bước 1: Chọn Tháng
                          </span>
                          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                            {months.map(m => {
                              const isMonthActive = evalSelectedMonth === m;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => {
                                    setEvalSelectedMonth(m);
                                    setEvalPeriodName(`${evalSelectedWeek} - ${m}`);
                                  }}
                                  className={`py-2 px-1 text-xs font-black rounded-xl border transition-all cursor-pointer text-center ${
                                    isMonthActive
                                      ? "bg-gradient-to-r from-[#003B3A] to-[#009085] text-white border-transparent shadow-sm shadow-[#003B3A]/30 scale-105"
                                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300"
                                  }`}
                                >
                                  {m.replace("Tháng ", "T")}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Bước 2: Chọn Tuần học */}
                        <div className="pt-1 border-t border-slate-100">
                          <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black">2</span>
                            Bước 2: Chọn Tuần học ({evalSelectedMonth})
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {(MONTH_WEEKS_CONFIG[evalSelectedMonth] || ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"]).map(w => {
                              const isWeekActive = evalSelectedWeek === w || evalPeriodName.startsWith(w);
                              return (
                                <button
                                  key={w}
                                  type="button"
                                  onClick={() => {
                                    setEvalSelectedWeek(w);
                                    setEvalPeriodType("WEEK");
                                    setEvalPeriodName(`${w} - ${evalSelectedMonth}`);
                                  }}
                                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center gap-2 ${
                                    isWeekActive
                                      ? "bg-emerald-700 text-white border-emerald-800 shadow-md shadow-emerald-700/25 scale-105"
                                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300"
                                  }`}
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{w} ({evalSelectedMonth.replace("Tháng ", "T")})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* === CHẾ ĐỘ 2: ĐÁNH GIÁ TỔNG KẾT THÁNG === */
                      <div className="space-y-3 bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-600" />
                            Chọn Tháng cần Đánh giá Tổng kết:
                          </span>
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                            10 tháng năm học
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                          {months.map(m => {
                            const isMonthActive = evalSelectedMonth === m;
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  setEvalSelectedMonth(m);
                                  setEvalPeriodName(m);
                                  setEvalPeriodType("MONTH");
                                }}
                                className={`py-3 px-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-between ${
                                  isMonthActive
                                    ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-800 shadow-md shadow-amber-600/30 scale-[1.03]"
                                    : "bg-white text-slate-800 border-amber-200 hover:bg-amber-100/80 hover:border-amber-400"
                                }`}
                              >
                                <span>⭐ Tổng kết {m}</span>
                                {isMonthActive && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Kết quả đánh giá (Mức độ đạt được) - TÁCH BIỆT THEO TUẦN & THEO THÁNG */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                        <Award className="h-4 w-4 text-indigo-600" />
                        {evalIsMonthlySummary
                          ? "2. Kết quả đánh giá (Mức độ đạt được) theo Tháng:"
                          : "2. Kết quả đánh giá (Mức độ đạt được) theo Tuần:"}
                      </label>
                      {evalIsMonthlySummary ? (
                        <span className="text-xs font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-xl border border-amber-300 shadow-2xs flex items-center gap-1.5">
                          ⭐ Đánh giá Tổng kết {evalSelectedMonth}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-xl border border-emerald-300 shadow-2xs flex items-center gap-1.5">
                          📅 Đánh giá {evalSelectedWeek} ({evalSelectedMonth.replace("Tháng ", "T")})
                        </span>
                      )}
                    </div>

                    {/* HIỂN THỊ CÁC THẺ LỰA CHỌN THEO ĐÚNG CHẾ ĐỘ THÁNG HOẶC TUẦN */}
                    {evalIsMonthlySummary ? (
                      /* ====== 1. GIAO DIỆN THEO THÁNG (TỔNG KẾT THÁNG) ====== */
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {/* Tháng - Mức 1: Đạt mục tiêu / Đã ổn định */}
                          {(() => {
                            const isSelected =
                              evalTrackingLevel === "Đạt mục tiêu / Đã ổn định" ||
                              evalTrackingLevel === "Đạt mục tiêu" ||
                              evalTrackingLevel === "Đã ổn định" ||
                              (evalTrackingLevel && getTrackingLevelBadge(evalTrackingLevel).category === "POSITIVE");
                            const val = evalTargetType === "PSYCHOLOGICAL" ? "Đã ổn định" : "Đạt mục tiêu";
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setEvalTrackingLevel(val);
                                  setEvalUpdatedStatus("Đề xuất kết thúc bồi dưỡng");
                                }}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                                  isSelected
                                    ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs scale-[1.02]"
                                    : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className="text-xs font-black text-emerald-800 flex items-center gap-1">
                                    🌟 Đạt mục tiêu / Đã ổn định
                                  </span>
                                  {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                </div>
                                <span className="text-[10px] text-emerald-700/90 font-medium leading-tight">
                                  Hoàn thành mục tiêu tháng, tiến bộ vượt bậc
                                </span>
                              </button>
                            );
                          })()}

                          {/* Tháng - Mức 2: Có tiến bộ / Cải thiện */}
                          {(() => {
                            const isSelected =
                              evalTrackingLevel === "Có tiến bộ / Cải thiện" ||
                              evalTrackingLevel === "Có tiến bộ" ||
                              evalTrackingLevel === "Có cải thiện" ||
                              evalTrackingLevel === "Cải thiện" ||
                              (evalTrackingLevel && getTrackingLevelBadge(evalTrackingLevel).category === "IMPROVING");
                            const val = evalTargetType === "PSYCHOLOGICAL" ? "Có cải thiện" : "Có tiến bộ";
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setEvalTrackingLevel(val);
                                  setEvalUpdatedStatus("Tiếp tục theo dõi");
                                }}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                                  isSelected
                                    ? "bg-sky-50 border-sky-500 ring-2 ring-sky-500/30 shadow-xs scale-[1.02]"
                                    : "bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/40"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className="text-xs font-black text-sky-800 flex items-center gap-1">
                                    📈 Có tiến bộ / Cải thiện
                                  </span>
                                  {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />}
                                </div>
                                <span className="text-[10px] text-sky-700/90 font-medium leading-tight">
                                  Có chuyển biến tích cực trong tháng
                                </span>
                              </button>
                            );
                          })()}

                          {/* Tháng - Mức 3: Duy trì / Tiếp tục theo dõi */}
                          {(() => {
                            const isSelected =
                              evalTrackingLevel === "Duy trì / Tiếp tục theo dõi" ||
                              evalTrackingLevel === "Duy trì" ||
                              evalTrackingLevel === "Tiếp tục theo dõi" ||
                              evalTrackingLevel === "Duy trì theo dõi" ||
                              (evalTrackingLevel && getTrackingLevelBadge(evalTrackingLevel).category === "MAINTAINING");
                            const val = evalTargetType === "PSYCHOLOGICAL" ? "Tiếp tục theo dõi" : "Duy trì";
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setEvalTrackingLevel(val);
                                  setEvalUpdatedStatus("Tiếp tục theo dõi");
                                }}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                                  isSelected
                                    ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/30 shadow-xs scale-[1.02]"
                                    : "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/40"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className="text-xs font-black text-amber-800 flex items-center gap-1">
                                    🔄 Duy trì / Tiếp tục theo dõi
                                  </span>
                                  {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />}
                                </div>
                                <span className="text-[10px] text-amber-700/90 font-medium leading-tight">
                                  Chưa có nhiều thay đổi đáng kể, tiếp tục đồng hành
                                </span>
                              </button>
                            );
                          })()}

                          {/* Tháng - Mức 4: Chưa tiến bộ / Hỗ trợ chuyên sâu */}
                          {(() => {
                            const isSelected =
                              evalTrackingLevel === "Chưa tiến bộ / Hỗ trợ chuyên sâu" ||
                              evalTrackingLevel === "Chưa tiến bộ" ||
                              evalTrackingLevel === "Hỗ trợ chuyên sâu" ||
                              evalTrackingLevel === "Chưa cải thiện" ||
                              evalTrackingLevel === "Giảm sút" ||
                              evalTrackingLevel === "Diễn biến phức tạp" ||
                              (evalTrackingLevel && getTrackingLevelBadge(evalTrackingLevel).category === "CRITICAL");
                            const val = evalTargetType === "PSYCHOLOGICAL" ? "Hỗ trợ chuyên sâu" : "Chưa tiến bộ";
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setEvalTrackingLevel(val);
                                  setEvalUpdatedStatus("Xây dựng kế hoạch hỗ trợ chuyên sâu");
                                }}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                                  isSelected
                                    ? "bg-rose-50 border-rose-500 ring-2 ring-rose-500/30 shadow-xs scale-[1.02]"
                                    : "bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/40"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className="text-xs font-black text-rose-800 flex items-center gap-1">
                                    ⚠️ Chưa tiến bộ / Hỗ trợ chuyên sâu
                                  </span>
                                  {isSelected && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                                </div>
                                <span className="text-[10px] text-rose-700/90 font-medium leading-tight">
                                  Cần tăng cường kèm cặp / can thiệp chuyên sâu
                                </span>
                              </button>
                            );
                          })()}
                        </div>

                        {/* Dropdown chi tiết theo Tháng */}
                        <select
                          value={evalTrackingLevel}
                          onChange={e => {
                            const val = e.target.value;
                            setEvalTrackingLevel(val);
                            if (
                              val === "Đạt mục tiêu" ||
                              val === "Đã ổn định" ||
                              val === "Có tiến bộ" ||
                              val === "Có cải thiện" ||
                              val === "Cải thiện" ||
                              val.includes("Đạt mục tiêu") ||
                              val.includes("Đã ổn định") ||
                              val.includes("Có tiến bộ") ||
                              val.includes("Cải thiện")
                            ) {
                              setEvalUpdatedStatus("Đề xuất kết thúc bồi dưỡng");
                            } else if (
                              val === "Chưa tiến bộ" ||
                              val === "Chưa cải thiện" ||
                              val === "Giảm sút" ||
                              val === "Diễn biến phức tạp" ||
                              val === "Chuyển hỗ trợ chuyên sâu" ||
                              val === "Hỗ trợ chuyên sâu" ||
                              val.includes("Chưa tiến bộ") ||
                              val.includes("Hỗ trợ chuyên sâu") ||
                              val.includes("Chưa cải thiện")
                            ) {
                              setEvalUpdatedStatus("Xây dựng kế hoạch hỗ trợ chuyên sâu");
                            } else if (val) {
                              setEvalUpdatedStatus("Tiếp tục theo dõi");
                            } else {
                              setEvalUpdatedStatus("");
                            }
                          }}
                          className="w-full rounded-xl border-amber-300 border py-2.5 px-3.5 text-xs sm:text-sm font-black focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/40 text-amber-950 cursor-pointer shadow-2xs"
                        >
                          <option value="">-- Chọn mức độ kết quả tổng kết tháng --</option>
                          {evalTargetType === "ACADEMIC" ? (
                            <>
                              <option value="Đạt mục tiêu">🌟 Đạt mục tiêu / Đã ổn định (Hoàn thành kế hoạch, tiến bộ vượt bậc)</option>
                              <option value="Có tiến bộ">📈 Có tiến bộ / Cải thiện (Có chuyển biến tích cực trong tháng)</option>
                              <option value="Duy trì">🔄 Duy trì / Tiếp tục theo dõi (Chưa có nhiều thay đổi đáng kể)</option>
                              <option value="Chưa tiến bộ">⚠️ Chưa tiến bộ / Cần tăng cường kèm cặp</option>
                              <option value="Hỗ trợ chuyên sâu">🚨 Chưa tiến bộ / Hỗ trợ chuyên sâu (Cần can thiệp chuyên sâu)</option>
                              <option value="Giảm sút">📉 Giảm sút (Kết quả/thái độ đi xuống)</option>
                              <option value="Chưa đủ dữ liệu">❓ Chưa đủ dữ liệu</option>
                            </>
                          ) : (
                            <>
                              <option value="Đã ổn định">🌟 Đã ổn định / Đạt mục tiêu (Tâm lý và hành vi đã ổn định tốt)</option>
                              <option value="Có cải thiện">📈 Có cải thiện / Cải thiện (Có dấu hiệu hồi phục tích cực trong tháng)</option>
                              <option value="Cải thiện">📈 Cải thiện (Dấu hiệu cải thiện rõ rệt)</option>
                              <option value="Tiếp tục theo dõi">🔄 Duy trì / Tiếp tục theo dõi (Cần tiếp tục đồng hành)</option>
                              <option value="Duy trì theo dõi">🔄 Duy trì theo dõi (Chưa có chuyển biến rõ rệt)</option>
                              <option value="Chưa cải thiện">⚠️ Chưa cải thiện (Biểu hiện chưa thuyên giảm)</option>
                              <option value="Hỗ trợ chuyên sâu">🚨 Chưa tiến bộ / Hỗ trợ chuyên sâu (Cần can thiệp chuyên sâu/chuyển tuyến)</option>
                              <option value="Diễn biến phức tạp">🚨 Diễn biến phức tạp (Cần hỗ trợ can thiệp khẩn)</option>
                              <option value="Chưa đủ dữ liệu">❓ Chưa đủ dữ liệu</option>
                            </>
                          )}
                        </select>
                      </div>
                    ) : (
                      /* ====== 2. GIAO DIỆN THEO TUẦN (TIẾN ĐỘ THEO TUẦN) ====== */
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {/* Tuần - Mức 1: Đạt mục tiêu / Đã ổn định */}
                          {(() => {
                            const isSelected =
                              evalTrackingLevel === "Đạt mục tiêu / Đã ổn định" ||
                              evalTrackingLevel === "Đạt mục tiêu" ||
                              evalTrackingLevel === "Đã ổn định" ||
                              (evalTrackingLevel && getTrackingLevelBadge(evalTrackingLevel).category === "POSITIVE");
                            const val = evalTargetType === "PSYCHOLOGICAL" ? "Đã ổn định" : "Đạt mục tiêu";
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setEvalTrackingLevel(val);
                                  setEvalUpdatedStatus("Đề xuất kết thúc bồi dưỡng");
                                }}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                                  isSelected
                                    ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs scale-[1.02]"
                                    : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className="text-xs font-black text-emerald-800 flex items-center gap-1">
                                    🌟 Đạt mục tiêu / Đã ổn định
                                  </span>
                                  {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                </div>
                                <span className="text-[10px] text-emerald-700/90 font-medium leading-tight">
                                  Tiến bộ vượt bậc, hoàn thành kế hoạch tuần
                                </span>
                              </button>
                            );
                          })()}

                          {/* Tuần - Mức 2: Có tiến bộ / Cải thiện */}
                          {(() => {
                            const isSelected =
                              evalTrackingLevel === "Có tiến bộ / Cải thiện" ||
                              evalTrackingLevel === "Có tiến bộ" ||
                              evalTrackingLevel === "Có cải thiện" ||
                              evalTrackingLevel === "Cải thiện" ||
                              (evalTrackingLevel && getTrackingLevelBadge(evalTrackingLevel).category === "IMPROVING");
                            const val = evalTargetType === "PSYCHOLOGICAL" ? "Có cải thiện" : "Có tiến bộ";
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setEvalTrackingLevel(val);
                                  setEvalUpdatedStatus("Tiếp tục theo dõi");
                                }}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                                  isSelected
                                    ? "bg-sky-50 border-sky-500 ring-2 ring-sky-500/30 shadow-xs scale-[1.02]"
                                    : "bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/40"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className="text-xs font-black text-sky-800 flex items-center gap-1">
                                    📈 Có tiến bộ / Cải thiện
                                  </span>
                                  {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />}
                                </div>
                                <span className="text-[10px] text-sky-700/90 font-medium leading-tight">
                                  Có chuyển biến tích cực trong tuần
                                </span>
                              </button>
                            );
                          })()}

                          {/* Tuần - Mức 3: Duy trì / Tiếp tục theo dõi */}
                          {(() => {
                            const isSelected =
                              evalTrackingLevel === "Duy trì / Tiếp tục theo dõi" ||
                              evalTrackingLevel === "Duy trì" ||
                              evalTrackingLevel === "Tiếp tục theo dõi" ||
                              evalTrackingLevel === "Duy trì theo dõi" ||
                              (evalTrackingLevel && getTrackingLevelBadge(evalTrackingLevel).category === "MAINTAINING");
                            const val = evalTargetType === "PSYCHOLOGICAL" ? "Tiếp tục theo dõi" : "Duy trì";
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setEvalTrackingLevel(val);
                                  setEvalUpdatedStatus("Tiếp tục theo dõi");
                                }}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                                  isSelected
                                    ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/30 shadow-xs scale-[1.02]"
                                    : "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/40"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className="text-xs font-black text-amber-800 flex items-center gap-1">
                                    🔄 Duy trì / Tiếp tục theo dõi
                                  </span>
                                  {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />}
                                </div>
                                <span className="text-[10px] text-amber-700/90 font-medium leading-tight">
                                  Chưa có nhiều thay đổi đáng kể, tiếp tục đồng hành
                                </span>
                              </button>
                            );
                          })()}

                          {/* Tuần - Mức 4: Chưa tiến bộ / Hỗ trợ chuyên sâu */}
                          {(() => {
                            const isSelected =
                              evalTrackingLevel === "Chưa tiến bộ / Hỗ trợ chuyên sâu" ||
                              evalTrackingLevel === "Chưa tiến bộ" ||
                              evalTrackingLevel === "Hỗ trợ chuyên sâu" ||
                              evalTrackingLevel === "Chưa cải thiện" ||
                              evalTrackingLevel === "Giảm sút" ||
                              evalTrackingLevel === "Diễn biến phức tạp" ||
                              (evalTrackingLevel && getTrackingLevelBadge(evalTrackingLevel).category === "CRITICAL");
                            const val = evalTargetType === "PSYCHOLOGICAL" ? "Hỗ trợ chuyên sâu" : "Chưa tiến bộ";
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setEvalTrackingLevel(val);
                                  setEvalUpdatedStatus("Xây dựng kế hoạch hỗ trợ chuyên sâu");
                                }}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                                  isSelected
                                    ? "bg-rose-50 border-rose-500 ring-2 ring-rose-500/30 shadow-xs scale-[1.02]"
                                    : "bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/40"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className="text-xs font-black text-rose-800 flex items-center gap-1">
                                    ⚠️ Chưa tiến bộ / Hỗ trợ chuyên sâu
                                  </span>
                                  {isSelected && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                                </div>
                                <span className="text-[10px] text-rose-700/90 font-medium leading-tight">
                                  Cần tăng cường kèm cặp / can thiệp tuần tới
                                </span>
                              </button>
                            );
                          })()}
                        </div>

                        {/* Dropdown chi tiết theo Tuần */}
                        <select
                          value={evalTrackingLevel}
                          onChange={e => {
                            const val = e.target.value;
                            setEvalTrackingLevel(val);
                            if (
                              val === "Đạt mục tiêu" ||
                              val === "Đã ổn định" ||
                              val === "Có tiến bộ" ||
                              val === "Có cải thiện" ||
                              val === "Cải thiện" ||
                              val.includes("Đạt mục tiêu") ||
                              val.includes("Đã ổn định") ||
                              val.includes("Có tiến bộ") ||
                              val.includes("Cải thiện")
                            ) {
                              setEvalUpdatedStatus("Đề xuất kết thúc bồi dưỡng");
                            } else if (
                              val === "Chưa tiến bộ" ||
                              val === "Chưa cải thiện" ||
                              val === "Giảm sút" ||
                              val === "Diễn biến phức tạp" ||
                              val === "Chuyển hỗ trợ chuyên sâu" ||
                              val === "Hỗ trợ chuyên sâu" ||
                              val.includes("Chưa tiến bộ") ||
                              val.includes("Hỗ trợ chuyên sâu") ||
                              val.includes("Chưa cải thiện")
                            ) {
                              setEvalUpdatedStatus("Xây dựng kế hoạch hỗ trợ chuyên sâu");
                            } else if (val) {
                              setEvalUpdatedStatus("Tiếp tục theo dõi");
                            } else {
                              setEvalUpdatedStatus("");
                            }
                          }}
                          className="w-full rounded-xl border-emerald-300 border py-2.5 px-3.5 text-xs sm:text-sm font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/40 text-emerald-950 cursor-pointer shadow-2xs"
                        >
                          <option value="">-- Chọn mức độ kết quả theo tuần --</option>
                          {evalTargetType === "ACADEMIC" ? (
                            <>
                              <option value="Đạt mục tiêu">🌟 Đạt mục tiêu / Đã ổn định (Tiến bộ vượt bậc, hoàn thành kế hoạch tuần)</option>
                              <option value="Có tiến bộ">📈 Có tiến bộ / Cải thiện (Có chuyển biến tích cực trong tuần)</option>
                              <option value="Duy trì">🔄 Duy trì / Tiếp tục theo dõi (Chưa có nhiều thay đổi đáng kể)</option>
                              <option value="Chưa tiến bộ">⚠️ Chưa tiến bộ / Cần tăng cường kèm cặp tuần tới</option>
                              <option value="Hỗ trợ chuyên sâu">🚨 Chưa tiến bộ / Hỗ trợ chuyên sâu (Cần can thiệp chuyên sâu)</option>
                              <option value="Giảm sút">📉 Giảm sút (Kết quả/thái độ đi xuống)</option>
                              <option value="Chưa đủ dữ liệu">❓ Chưa đủ dữ liệu</option>
                            </>
                          ) : (
                            <>
                              <option value="Đã ổn định">🌟 Đã ổn định / Đạt mục tiêu (Tâm lý và hành vi tuần này đã tốt)</option>
                              <option value="Có cải thiện">📈 Có cải thiện / Cải thiện (Có dấu hiệu hồi phục tích cực trong tuần)</option>
                              <option value="Cải thiện">📈 Cải thiện (Dấu hiệu cải thiện rõ rệt)</option>
                              <option value="Tiếp tục theo dõi">🔄 Duy trì / Tiếp tục theo dõi (Cần tiếp tục đồng hành)</option>
                              <option value="Duy trì theo dõi">🔄 Duy trì theo dõi (Chưa có chuyển biến rõ rệt)</option>
                              <option value="Chưa cải thiện">⚠️ Chưa cải thiện (Biểu hiện chưa thuyên giảm)</option>
                              <option value="Hỗ trợ chuyên sâu">🚨 Chưa tiến bộ / Hỗ trợ chuyên sâu (Cần can thiệp chuyên sâu)</option>
                              <option value="Diễn biến phức tạp">🚨 Diễn biến phức tạp (Cần hỗ trợ can thiệp khẩn)</option>
                              <option value="Chưa đủ dữ liệu">❓ Chưa đủ dữ liệu</option>
                            </>
                          )}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Nhận xét chi tiết */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-emerald-600" />
                        3. Nhận xét chi tiết chuyên môn (Học lực / Tâm lý):
                      </label>
                      <span className="text-[11px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Bắt buộc nhập
                      </span>
                    </div>
                    <textarea
                      placeholder="Ghi nhận cụ thể các nội dung đã kèm cặp, mức độ tiến bộ, biểu hiện của học sinh và kế hoạch tiếp theo..."
                      value={evalComment}
                      onChange={e => setEvalComment(e.target.value)}
                      className="w-full rounded-2xl border-slate-300 border p-3.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 h-28 resize-none bg-slate-50/70 font-medium text-slate-900 leading-relaxed shadow-inner"
                    />

                    {/* Quick suggestion templates */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" /> Gợi ý nhanh:
                      </span>
                      {evalIsMonthlySummary && (
                        <button
                          type="button"
                          onClick={() => setEvalComment(prev => (prev ? prev + " " : "") + `Tổng kết ${evalSelectedMonth}: Học sinh đạt mục tiêu tháng, tiến bộ rõ rệt và duy trì thái độ tích cực.`)}
                          className="text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-300 cursor-pointer transition-colors"
                        >
                          ⭐ Tổng kết tháng đạt MT
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEvalComment(prev => (prev ? prev + " " : "") + "Học sinh tiếp thu bài tốt, có ý thức làm bài tập đầy đủ.")}
                        className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-300 cursor-pointer transition-colors"
                      >
                        + Tiếp thu bài tốt
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvalComment(prev => (prev ? prev + " " : "") + "Có tiến bộ rõ rệt so với giai đoạn trước, hoàn thành các mục tiêu đề ra.")}
                        className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-300 cursor-pointer transition-colors"
                      >
                        + Tiến bộ rõ rệt
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvalComment(prev => (prev ? prev + " " : "") + "Cần tập trung nghe giảng hơn và chủ động hỏi bài khi chưa hiểu.")}
                        className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-300 cursor-pointer transition-colors"
                      >
                        + Cần tập trung hơn
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvalComment(prev => (prev ? prev + " " : "") + "Đã đạt yêu cầu, đề xuất cho học sinh kết thúc bồi dưỡng.")}
                        className="text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-300 cursor-pointer transition-colors"
                      >
                        + Đạt yêu cầu kết thúc
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvalComment(prev => (prev ? prev + " " : "") + "Chưa đạt yêu cầu theo dõi, đề xuất phối hợp gia đình và tăng cường hỗ trợ chuyên sâu.")}
                        className="text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 px-2.5 py-1 rounded-lg border border-rose-300 cursor-pointer transition-colors"
                      >
                        + Cần hỗ trợ chuyên sâu
                      </button>
                    </div>
                  </div>

                  {/* Đề xuất hành động tiếp theo */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-teal-600" />
                      4. Đề xuất hành động tiếp theo:
                    </label>
                    <select
                      value={evalUpdatedStatus}
                      onChange={e => setEvalUpdatedStatus(e.target.value)}
                      className="w-full rounded-xl border-slate-300 border py-2.5 px-3.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold bg-teal-50/50 text-[#003B3A] cursor-pointer shadow-2xs"
                    >
                      <option value="">-- Chọn đề xuất hành động --</option>
                      <option value="Tiếp tục theo dõi">Tiếp tục hỗ trợ theo kế hoạch</option>
                      <option value="Đề xuất kết thúc bồi dưỡng">Đề xuất hoàn thành (Kết thúc hỗ trợ)</option>
                      <option value="Xây dựng kế hoạch hỗ trợ chuyên sâu">Yêu cầu can thiệp / hỗ trợ chuyên sâu</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setIsEvaluationModalOpen(false)}
                  className="border border-slate-300 hover:bg-slate-100 py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-slate-700 cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="button"
                  onClick={handleSaveEvaluation}
                  className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white py-2.5 px-7 rounded-xl text-xs sm:text-sm font-black shadow-md shadow-emerald-700/25 transition-all flex items-center gap-2 cursor-pointer transform active:scale-95"
                >
                  <Save className="h-4 w-4 text-emerald-200" />
                  <span>Lưu Đánh giá</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Gửi Email Nhắc lịch Đánh giá định kỳ theo Tháng */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-teal-900 via-[#003B3A] to-[#009085] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs">
                  <Mail className="h-5 w-5 text-[#48BFE3]" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">Nhắc lịch Đánh giá định kỳ qua Email</h3>
                  <p className="text-xs text-teal-200 font-medium">Gửi email thông báo danh sách học sinh cần đánh giá trong tháng</p>
                </div>
              </div>
              <button
                onClick={() => setIsReminderModalOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-all text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* 1. Chọn tháng cần nhắc */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[#009085]" />
                  Chọn Tháng cần nhắc lịch đánh giá:
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {ACADEMIC_MONTHS.map(m => {
                    const isSelected = reminderMonth === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setReminderMonth(m)}
                        className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                          isSelected
                            ? "bg-gradient-to-r from-[#003B3A] to-[#009085] text-white border-transparent shadow-md shadow-[#003B3A]/25 font-black scale-[1.03]"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50/70 hover:border-teal-300"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Đối tượng nhận email */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[#009085]" />
                  Đối tượng nhận email:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    reminderTargetOption === "ALL"
                      ? "bg-teal-50/70 border-teal-400 ring-2 ring-teal-500/20"
                      : "bg-slate-50 border-slate-200 hover:bg-white"
                  }`}>
                    <input
                      type="radio"
                      name="reminderTarget"
                      checked={reminderTargetOption === "ALL"}
                      onChange={() => setReminderTargetOption("ALL")}
                      className="mt-0.5 text-[#009085] focus:ring-[#009085]"
                    />
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 block">Tất cả GV phụ trách</span>
                      <span className="text-[11px] text-slate-500 font-medium">Gửi tới tất cả GV còn học sinh chưa đánh giá trong ${reminderMonth}</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    reminderTargetOption === "ME"
                      ? "bg-teal-50/70 border-teal-400 ring-2 ring-teal-500/20"
                      : "bg-slate-50 border-slate-200 hover:bg-white"
                  }`}>
                    <input
                      type="radio"
                      name="reminderTarget"
                      checked={reminderTargetOption === "ME"}
                      onChange={() => setReminderTargetOption("ME")}
                      className="mt-0.5 text-[#009085] focus:ring-[#009085]"
                    />
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 block">Gửi riêng cho tôi</span>
                      <span className="text-[11px] text-slate-500 font-medium">Gửi danh sách nhắc việc về email cá nhân: ${teacher?.email || "Email GV"}</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 3. Hạn chót hoàn thành (Deadline) */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#009085]" />
                  Hạn chót hoàn thành (Deadline - tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trước 17h00 ngày 30/09/2026..."
                  value={reminderDeadline}
                  onChange={(e) => setReminderDeadline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-[#009085]"
                />
              </div>

              {/* 4. Lời nhắn / Ghi chú kèm theo */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-[#009085]" />
                  Lời nhắn / Lưu ý từ Ban Khảo thí & ĐBCL (tùy chọn):
                </label>
                <textarea
                  placeholder="Nhập nội dung nhắc nhở hoặc yêu cầu đặc biệt khi đánh giá..."
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-[#009085] h-20 resize-none"
                />
              </div>

              {/* Thông tin mẫu email */}
              <div className="bg-teal-50/60 border border-teal-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-[#003B3A]">
                <Info className="h-4 w-4 text-[#009085] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-extrabold block">Cơ chế gửi email tự động:</span>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Hệ thống sẽ tự động lọc danh sách học sinh chưa có bản ghi đánh giá của <strong>${reminderMonth}</strong>, tạo bảng tổng hợp chi tiết và gửi email kèm đường link trực tiếp vào Sổ theo dõi cho từng giáo viên.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsReminderModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={sendingReminder}
                onClick={handleSendEmailReminder}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#003B3A] to-[#009085] hover:from-[#002a29] hover:to-[#007a70] shadow-md shadow-[#003B3A]/25 disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
              >
                {sendingReminder ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-[#48BFE3]" />
                    <span>Đang gửi email...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 text-[#48BFE3]" />
                    <span>Gửi Email Nhắc lịch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 5. Modal Gửi Email Khẩn đến GVCN */}
      <UrgentEmailModal
        isOpen={isUrgentEmailModalOpen}
        onClose={() => setIsUrgentEmailModalOpen(false)}
        academicYearId={selectedYearId}
        targets={filteredTargets}
        selectedTargetIds={selectedEvalTargetIds}
      />

      {/* 6. Modal Ghi nhận Ý kiến GVCN & PHHS */}
      <FeedbackGvcnPhhsModal
        isOpen={isFeedbackModalOpen}
        onClose={() => {
          setIsFeedbackModalOpen(false);
          setSelectedFeedbackTarget(null);
        }}
        target={selectedFeedbackTarget}
        academicYearId={selectedYearId}
      />



      

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
