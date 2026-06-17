"use client"

import { useState, useEffect, useTransition, useMemo, useRef, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { 
  Calendar, Clock, MapPin, User, Users, BookOpen, Plus, Search, X, Check,
  AlertCircle, Trash2, Info, Layers, FileText, ChevronDown, ChevronUp,
  ClipboardList, CheckCircle, Clock3, Building2, Shield, Filter, RotateCcw, SlidersHorizontal
} from "lucide-react"
import { 
  createObservationSlot, updateObservationSlot, registerObservation, cancelObservation,
  deleteObservationSlot, getCreatedCountInMonth, getObservationSlots,
  approveRegistration, submitEvaluation
} from "./actions"

interface TeacherInfo { id: string; teacherName: string; teacherCode: string; email: string | null; departmentId: string | null; campusId: string }
interface SubjectInfo { id: string; subjectCode: string; subjectName: string }
interface DeptInfo { id: string; code: string; name: string }
interface CampusInfo { id: string; campusCode: string; campusName: string }
interface ClassInfo { id: string; classCode: string; className: string; level: string; grade: string; campusId: string }

interface ObservationClientProps {
  initialSlots: any[]
  currentTeacher: TeacherInfo
  subjects: SubjectInfo[]
  departments: DeptInfo[]
  teachers: any[]
  campuses: CampusInfo[]
  classes: ClassInfo[]
  initialFilters: { level: string; period: string; grade: string; date: string; campusId: string; deptId: string }
}

const CRITERIA_LABELS = [
  "Nội dung bài dạy phù hợp, chính xác",
  "Phương pháp giảng dạy hiệu quả, sáng tạo",
  "Tổ chức hoạt động học tập tích cực",
  "Sử dụng CNTT và phương tiện dạy học",
  "Kết quả học tập và tương tác của học sinh"
]

const RATING_LABELS = ["Tốt", "Khá", "Trung bình", "Yếu"]

const K12_SECTIONS = [
  {
    name: "Tiêu chuẩn 1: Phương tiện (3 điểm)",
    requirements: [
      { id: 1, label: "Yêu cầu 1", max: 1.5, text: "Chuẩn bị giáo án tốt, giáo án phải chỉ rõ các hoạt động của trò và thầy, bám sát chuẩn kiến thức, kỹ năng, thể hiện mức độ phù hợp của các hoạt động học với mục tiêu, nội dung và phương pháp dạy học được sử dụng. KH bài dạy thể hiện mức độ rõ ràng, chính xác của mục tiêu, nội dung, sản phẩm, cách thức tổ chức thực hiện mỗi hoạt động học của học sinh." },
      { id: 2, label: "Yêu cầu 2", max: 1.5, text: "Tích cực sử dụng đồ dùng, thiết bị dạy học. Thiết bị, đồ dùng dạy học phải phù hợp với nội dung, phương pháp của kiểu bài lên lớp." }
    ]
  },
  {
    name: "Tiêu chuẩn 2: Nội dung (5 điểm)",
    requirements: [
      { id: 3, label: "Yêu cầu 3", max: 2.0, text: "Nội dung bài dạy chính xác, khoa học (bao gồm khoa học bộ môn và phù hợp với quan điểm tư tưởng, lập trường chính trị của Đảng); Hấp dẫn (bao gồm hấp dẫn của nội dung, phương pháp và hình thức giao nhiệm vụ học tập cho học sinh)." },
      { id: 4, label: "Yêu cầu 4", max: 2.0, text: "Bảo đảm tính hệ thống, đủ nội dung theo chuẩn kiến thức, kỹ năng và làm rõ trọng tâm của bài học." },
      { id: 5, label: "Yêu cầu 5", max: 1.0, text: "Liên hệ với thực tế đời sống và sản xuất (nếu có). Nội dung liên hệ thực tế có tính giáo dục và gắn với nội dung bài dạy." }
    ]
  },
  {
    name: "Tiêu chuẩn 3: Phương pháp (9 điểm)",
    requirements: [
      { id: 6, label: "Yêu cầu 6", max: 2.0, text: "Không dạy học theo lối 'đọc chép', áp đặt đối với học sinh. Thể hiện khả năng quan sát, theo dõi, phát hiện kịp thời những khó khăn của học sinh." },
      { id: 7, label: "Yêu cầu 7", max: 3.0, text: "Tổ chức học sinh học tập tích cực, chủ động, phù hợp với từng đối tượng trong lớp. Khuyến khích học sinh hợp tác, giúp đỡ nhau khi thực hiện nhiệm vụ học tập. Học sinh được tham gia xây dựng bài và phát huy trí lực tốt, hứng thú học tập, không khí lớp học thân thiện." },
      { id: 8, label: "Yêu cầu 8", max: 2.0, text: "Thực hiện linh hoạt các khâu lên lớp, phân phối thời gian hợp lý (đúng quy trình theo YCCD của CT2018). Dành thời gian thích hợp để củng cố, luyện tập nhằm khắc sâu trọng tâm bài học." },
      { id: 9, label: "Yêu cầu 9", max: 2.0, text: "Kết hợp tốt các phương pháp trong hoạt động dạy và học. Học sinh tiếp nhận, sẵn sàng, chủ động, sáng tạo, hợp tác thực hiện các nhiệm vụ, tích cực trong trình bày, thảo luận về kết quả thực hiện nhiệm vụ." }
    ]
  },
  {
    name: "Tiêu chuẩn 4: Kết quả (3 điểm)",
    requirements: [
      { id: 10, label: "Yêu cầu 10", max: 2.0, text: "Mức độ phù hợp, đúng đắn, chính xác của phương án kiểm tra, đánh giá trong quá trình tổ chức hoạt động dạy và học. Học sinh hiểu bài, dễ nhớ, nắm vững trọng tâm, biết vận dụng kiến thức. Tạo điều kiện để học sinh ghi chép bài đầy đủ." },
      { id: 11, label: "Yêu cầu 11", max: 1.0, text: "Tiết dạy nhuần nhuyễn, hấp dẫn, gây ấn tượng và có tính sáng tạo." }
    ]
  }
];

const RATING_COLORS: Record<string, string> = {
  "Tốt": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "Khá": "bg-sky-100 text-sky-700 border-sky-300",
  "Trung bình": "bg-amber-100 text-amber-700 border-amber-300",
  "Yếu": "bg-rose-100 text-rose-700 border-rose-300"
}

export function ObservationClient({
  initialSlots, currentTeacher, subjects, departments, teachers, campuses, classes, initialFilters
}: ObservationClientProps) {
  const isMamNonTeacher = currentTeacher?.departmentRel?.blockCM?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTabParam = searchParams.get("tab") || "dang-ky"
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [slots, setSlots] = useState(initialSlots)
  const [activeTab, setActiveTab] = useState(activeTabParam)
  const [isPending, startTransition] = useTransition()
  const [isSearching, setIsSearching] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)

  // Filter states
  const [filterSchoolBlock, setFilterSchoolBlock] = useState("all");
  const [activeDeptTab, setActiveDeptTab] = useState("my-dept");
  const [filterLevel, setFilterLevel] = useState(initialFilters.level)
  const [filterGrade, setFilterGrade] = useState(initialFilters.grade)
  const [filterPeriod, setFilterPeriod] = useState("all")
  const [filterDate, setFilterDate] = useState(initialFilters.date)
  const [filterCampusId, setFilterCampusId] = useState(initialFilters.campusId)
  const [filterDeptId, setFilterDeptId] = useState(initialFilters.deptId)
  const [showFilterPanel, setShowFilterPanel] = useState(true)
  const autoSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Create form states
  const [newSubjectId, setNewSubjectId] = useState("")
  const [newSubjectName, setNewSubjectName] = useState("")
  const [newLevel, setNewLevel] = useState("")
  const [newGrade, setNewGrade] = useState("")
  const [newCampusId, setNewCampusId] = useState(currentTeacher.campusId || "")
  const [newClassId, setNewClassId] = useState("")
  const [newClassNameText, setNewClassNameText] = useState("")
  const [newTopic, setNewTopic] = useState("")
  const [newDate, setNewDate] = useState("")
  const [newStartTime, setNewStartTime] = useState("Tiết 1")
  const [newEndTime, setNewEndTime] = useState("Tiết 1")
  const [newIsDoublePeriod, setNewIsDoublePeriod] = useState(false)
  const [newDescription, setNewDescription] = useState("")
  const [newVisibility, setNewVisibility] = useState("ALL")
  const [newTargetDeptId, setNewTargetDeptId] = useState("")
  const [newLessonPlanName, setNewLessonPlanName] = useState("")
  const [newLessonPlanData, setNewLessonPlanData] = useState("")
  const [monthlyLimitCount, setMonthlyLimitCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [editSlotId, setEditSlotId] = useState<string | null>(null)

  // Expanded slot registrants (for host view)
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null)

  // Evaluation modal state
  const [evalModal, setEvalModal] = useState<{ registration: any; slot: any } | null>(null)
  const [evalCriteria, setEvalCriteria] = useState([0, 0, 0, 0, 0])
  const [evalK12Scores, setEvalK12Scores] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  const [evalStrengths, setEvalStrengths] = useState("")
  const [evalImprovements, setEvalImprovements] = useState("")
  const [evalGeneral, setEvalGeneral] = useState("")
  const [evalOverall, setEvalOverall] = useState("")
  const [evalSubmitting, setEvalSubmitting] = useState(false)

  useEffect(() => { setActiveTab(activeTabParam) }, [activeTabParam])

  useEffect(() => {
    setSlots(initialSlots)
  }, [initialSlots])

  useEffect(() => {
    if (newDate) {
      getCreatedCountInMonth(newDate).then(res => { if (res.success) setMonthlyLimitCount(res.count) })
    }
  }, [newDate])

  const resetCreateForm = () => {
    setEditSlotId(null);
    setNewSubjectId(""); setNewSubjectName(""); setNewLevel(""); setNewGrade(""); setNewClassId("");
    setNewClassNameText(""); setNewTopic(""); setNewDate(""); setNewStartTime("Tiết 1"); setNewEndTime("Tiết 1");
    setNewIsDoublePeriod(false); setNewDescription(""); setNewVisibility("ALL"); setNewTargetDeptId("");
    setNewLessonPlanName(""); setNewLessonPlanData("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openEditModal = (slot: any) => {
    setEditSlotId(slot.id);
    setNewSubjectId(slot.subjectId || "other");
    setNewSubjectName(slot.subjectName || "");
    setNewLevel(slot.level || "");
    setNewGrade(slot.grade ? (slot.level === "Mầm non" ? slot.grade : "Khoi " + slot.grade) : "");
    setNewCampusId(slot.campusId || "");
    setNewClassId(slot.classId || "other");
    setNewClassNameText(slot.className || "");
    setNewTopic(slot.topic || "");
    setNewDate(new Date(slot.date).toISOString().split('T')[0]);
    setNewStartTime(slot.startTime || "Tiết 1");
    setNewEndTime(slot.endTime || "Tiết 1");
    setNewIsDoublePeriod(slot.isDoublePeriod || false);
    setNewDescription(slot.description || "");
    setNewVisibility(slot.visibilityType || "ALL");
    setNewTargetDeptId(slot.targetDeptId || "");
    setNewLessonPlanName(slot.lessonPlanName || "");
    setNewLessonPlanData(slot.lessonPlanData || "");
    setShowCreateModal(true);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4500)
  }

  const periodOptions = ["Tiết 1","Tiết 2","Tiết 3","Tiết 4","Tiết 5","Tiết 6","Tiết 7","Tiết 8"]

  const getGradesForLevel = (level: string) => {
    switch (level) {
      case "Mầm non": return ["18-24 tháng","24-36 tháng","Mầm (3-4 tuổi)","Chồi (4-5 tuổi)","Lá (5-6 tuổi)"]
      case "Tiểu học": return ["Khối 1","Khối 2","Khối 3","Khối 4","Khối 5"]
      case "THCS": return ["Khối 6","Khối 7","Khối 8","Khối 9"]
      case "THPT": return ["Khối 10","Khối 11","Khối 12"]
      case "Phổ thông K-12": return [
        "Khối 1","Khối 2","Khối 3","Khối 4","Khối 5",
        "Khối 6","Khối 7","Khối 8","Khối 9",
        "Khối 10","Khối 11","Khối 12"
      ]
      default: return []
    }
  }

  const filteredClassesForCreation = useMemo(() => {
    if (!newCampusId || !newLevel) return []
    let dbLevel = ""
    if (newLevel === "Tiểu học") dbLevel = "Tiểu học"
    else if (newLevel === "THCS") dbLevel = "THCS"
    else if (newLevel === "THPT") dbLevel = "THPT"
    else dbLevel = "Mầm non"
    const numGrade = newGrade.replace("Khoi ", "")
    return classes.filter(c => {
      if (c.campusId !== newCampusId) return false;
      if (c.level !== dbLevel) return false;
      if (dbLevel === "Mầm non") {
        if (!newGrade) return true;
        // Map newGrade to class name or grade in DB
        const lowerGrade = newGrade.toLowerCase();
        const lowerClassGrade = (c.grade || "").toLowerCase();
        const lowerClassName = (c.className || "").toLowerCase();
        
        if (lowerGrade.includes("18-24") || lowerGrade.includes("24-36")) {
          return lowerClassGrade.includes("nhà trẻ") || lowerClassName.includes("nhà trẻ") || lowerClassGrade.includes("tháng");
        }
        if (lowerGrade.includes("mầm")) return lowerClassGrade.includes("mầm") || lowerClassName.includes("mầm");
        if (lowerGrade.includes("chồi")) return lowerClassGrade.includes("chồi") || lowerClassName.includes("chồi");
        if (lowerGrade.includes("lá")) return lowerClassGrade.includes("lá") || lowerClassName.includes("lá");
        
        return true; // fallback, show all
      }
      return c.grade === numGrade;
    })
  }, [classes, newCampusId, newLevel, newGrade])

  const getNextPeriod = (p: string) => { const m = p.match(/\d+/); if (m) { const n = parseInt(m[0]); if (n < 8) return `Tiết ${n+1}` } return p }
  const handleStartTimeChange = (val: string) => { setNewStartTime(val); setNewEndTime(newIsDoublePeriod ? getNextPeriod(val) : val) }
  const handleDoublePeriodChange = (checked: boolean) => { setNewIsDoublePeriod(checked); if (checked) setNewEndTime(getNextPeriod(newStartTime)); else setNewEndTime(newStartTime) }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") { showToast("Chỉ hỗ trợ tải lên file PDF!", "error"); e.target.value = ""; return }
    if (file.size > 5 * 1024 * 1024) { showToast("Kích thước file không được vượt quá 5MB!", "error"); e.target.value = ""; return }
    const reader = new FileReader()
    reader.onload = () => { setNewLessonPlanName(file.name); setNewLessonPlanData(reader.result as string); showToast("Đã đính kèm giáo án PDF!", "info") }
    reader.readAsDataURL(file)
  }

  const handleViewPdf = (name: string, dataUrl: string) => {
    if (!dataUrl) return
    try {
      const win = window.open()
      if (win) {
        win.document.write(`<html><head><title>${name}</title><style>body{margin:0;padding:0;background:#525659;}iframe{border:0;width:100%;height:100%;}</style></head><body><iframe src="${dataUrl}" allowfullscreen></iframe></body></html>`)
      } else { showToast("Vui lòng cho phép mở popup trên trình duyệt!", "error") }
    } catch { showToast("Lỗi hiển thị giáo án PDF!", "error") }
  }

  const handleSearch = useCallback(async () => {
    const params = new URLSearchParams(window.location.search)
    if (filterSchoolBlock && filterSchoolBlock !== "all") params.set("schoolBlock", filterSchoolBlock); else params.delete("schoolBlock")
    if (filterLevel && filterLevel !== "all") params.set("level", filterLevel); else params.delete("level")
    
    if (filterGrade && filterGrade !== "all") params.set("grade", filterGrade); else params.delete("grade")
    
    if (filterDate) params.set("date", filterDate); else params.delete("date")
    if (filterCampusId && filterCampusId !== "all") params.set("campusId", filterCampusId); else params.delete("campusId")
    if (filterDeptId && filterDeptId !== "all") params.set("deptId", filterDeptId); else params.delete("deptId")
    
    setIsSearching(true)
    try {
      router.push(`${pathname}?${params.toString()}`)
      const res = await getObservationSlots({ schoolBlock: filterSchoolBlock, level: filterLevel, grade: filterGrade, period: filterPeriod, date: filterDate, campusId: filterCampusId, deptId: filterDeptId })
      if (res.success && res.slots) { setSlots(res.slots) }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSearching(false)
    }
  }, [filterSchoolBlock, filterLevel, filterGrade, filterPeriod, filterDate, filterCampusId, filterDeptId, router, pathname])

  // Auto-apply filters on change (debounced)
  useEffect(() => {
    if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current)
    autoSearchTimerRef.current = setTimeout(() => {
      handleSearch()
    }, 400)
    return () => { if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current) }
  }, [filterSchoolBlock, filterLevel, filterGrade, filterPeriod, filterDate, filterCampusId, filterDeptId, handleSearch])

  // Active filter helpers
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filterCampusId && filterCampusId !== "all") count++
    if (filterLevel && filterLevel !== "all") count++
    if (filterGrade && filterGrade !== "all") count++
    if (filterDate) count++
    if (filterPeriod && filterPeriod !== "all") count++
    return count
  }, [filterCampusId, filterLevel, filterGrade, filterDate, filterPeriod])

  const activeFilterTags = useMemo(() => {
    const tags: { key: string; label: string; value: string; onRemove: () => void }[] = []
    if (filterCampusId && filterCampusId !== "all") {
      const campus = campuses.find(c => c.id === filterCampusId)
      tags.push({ key: "campus", label: "Cơ sở", value: campus?.campusName || filterCampusId, onRemove: () => setFilterCampusId("all") })
    }
    if (filterLevel && filterLevel !== "all") {
      tags.push({ key: "level", label: "Bậc học", value: filterLevel, onRemove: () => { setFilterLevel("all"); setFilterGrade("all") } })
    }
    if (filterGrade && filterGrade !== "all") {
      tags.push({ key: "grade", label: "Khối", value: filterGrade, onRemove: () => setFilterGrade("all") })
    }
    if (filterDate) {
      const d = new Date(filterDate)
      const formatted = d.getDate().toString().padStart(2,"0") + "/" + (d.getMonth()+1).toString().padStart(2,"0") + "/" + d.getFullYear()
      tags.push({ key: "date", label: "Ngày", value: formatted, onRemove: () => setFilterDate("") })
    }
    if (filterPeriod && filterPeriod !== "all") {
      tags.push({ key: "period", label: "Tiết", value: filterPeriod, onRemove: () => setFilterPeriod("all") })
    }
    return tags
  }, [filterCampusId, filterLevel, filterGrade, filterDate, filterPeriod, campuses])

  const clearAllFilters = () => {
    setFilterCampusId("all")
    setFilterLevel("all")
    setFilterGrade("all")
    setFilterDate("")
    setFilterPeriod("all")
    setFilterSchoolBlock("all")
    setFilterDeptId("all")
  }

  const refreshSlots = async () => {
    const res = await getObservationSlots({ schoolBlock: filterSchoolBlock, level: filterLevel, grade: filterGrade, period: filterPeriod, date: filterDate, campusId: filterCampusId, deptId: filterDeptId })
    if (res.success && res.slots) setSlots(res.slots)
  }

  const handleRegister = async (slotId: string) => {
    startTransition(async () => {
      const res = await registerObservation(slotId)
      if (res.success) { showToast("Đăng ký dự giờ thành công!", "success"); refreshSlots() }
      else showToast(res.error || "Không thể đăng ký!", "error")
    })
  }

  const handleCancelRegistration = async (slotId: string) => {
    if (!confirm("Thầy/Cô có chắc chắn muốn hủy đăng ký dự giờ tiết dạy này?")) return
    startTransition(async () => {
      const res = await cancelObservation(slotId)
      if (res.success) { showToast("Đã hủy đăng ký dự giờ!", "info"); refreshSlots() }
      else showToast(res.error || "Không thể hủy đăng ký!", "error")
    })
  }

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Thầy/Cô có chắc chắn muốn xóa tiết dạy dự giờ này? Tất cả đăng ký liên quan sẽ bị hủy.")) return
    startTransition(async () => {
      const res = await deleteObservationSlot(slotId)
      if (res.success) { showToast("Đã xóa tiết dạy dự giờ thành công!", "info"); refreshSlots() }
      else showToast(res.error || "Không thể xóa!", "error")
    })
  }

  const handleApprove = async (registrationId: string) => {
    startTransition(async () => {
      const res = await approveRegistration(registrationId)
      if (res.success) { showToast("Đã xác nhận GV dự giờ thành công!", "success"); refreshSlots() }
      else showToast(res.error || "Không thể xác nhận!", "error")
    })
  }

  const openEvalModal = (registration: any, slot: any) => {
    if (registration.evaluation) {
      setEvalCriteria([
        registration.evaluation.criterion1 || 0,
        registration.evaluation.criterion2 || 0,
        registration.evaluation.criterion3 || 0,
        registration.evaluation.criterion4 || 0,
        registration.evaluation.criterion5 || 0
      ])
      setEvalK12Scores([
        registration.evaluation.score1 || 0,
        registration.evaluation.score2 || 0,
        registration.evaluation.score3 || 0,
        registration.evaluation.score4 || 0,
        registration.evaluation.score5 || 0,
        registration.evaluation.score6 || 0,
        registration.evaluation.score7 || 0,
        registration.evaluation.score8 || 0,
        registration.evaluation.score9 || 0,
        registration.evaluation.score10 || 0,
        registration.evaluation.score11 || 0
      ])
      setEvalStrengths(registration.evaluation.strengths || "")
      setEvalImprovements(registration.evaluation.improvements || "")
      setEvalGeneral(registration.evaluation.generalComment || "")
      setEvalOverall(registration.evaluation.overallRating || "")
    } else {
      setEvalCriteria([0, 0, 0, 0, 0])
      setEvalK12Scores([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
      setEvalStrengths("")
      setEvalImprovements("")
      setEvalGeneral("")
      setEvalOverall("")
    }
    setEvalModal({ registration, slot })
  }

  const calculateK12Ranking = (scores: number[]) => {
    const sum = scores.reduce((a, b) => a + b, 0)
    const yq1 = scores[0];
    const yq3 = scores[2];
    const yq6 = scores[5];
    const yq7 = scores[6];

    const maxScores = [1.5, 1.5, 2.0, 2.0, 1.0, 2.0, 3.0, 2.0, 2.0, 2.0, 1.0]
    const checkOthersAtLeast50Percent = (coreIndices: number[]) => {
      return scores.every((s, idx) => {
        if (coreIndices.includes(idx)) return true
        return s >= maxScores[idx] * 0.5
      })
    }

    // 1. Giỏi
    if (sum >= 17 && yq1 === 1.5 && yq3 === 2.0 && yq6 === 2.0 && yq7 === 3.0 && checkOthersAtLeast50Percent([0, 2, 5, 6])) {
      return "Giỏi"
    }

    // 2. Khá
    if (sum >= 14 && yq3 >= 2.0 && yq6 >= 2.0 && yq7 >= 2.0 && checkOthersAtLeast50Percent([2, 5, 6])) {
      return "Khá"
    }

    // 3. Trung bình
    if (sum >= 12 && yq3 >= 1.0 && yq6 >= 1.0 && yq7 >= 1.0 && scores.every(s => s > 0)) {
      return "Trung bình"
    }

    return "Không xếp loại"
  }

  const handleSubmitEval = async () => {
    if (!evalModal) return
    const isK12 = evalModal.slot.level !== "Mầm non"
    
    let payload: any = {
      registrationId: evalModal.registration.id,
      slotId: evalModal.slot.id,
      strengths: evalStrengths,
      improvements: evalImprovements,
      generalComment: evalGeneral,
      overallRating: evalOverall
    }

    if (isK12) {
      const sum = evalK12Scores.reduce((a, b) => a + b, 0)
      payload.score1 = evalK12Scores[0]
      payload.score2 = evalK12Scores[1]
      payload.score3 = evalK12Scores[2]
      payload.score4 = evalK12Scores[3]
      payload.score5 = evalK12Scores[4]
      payload.score6 = evalK12Scores[5]
      payload.score7 = evalK12Scores[6]
      payload.score8 = evalK12Scores[7]
      payload.score9 = evalK12Scores[8]
      payload.score10 = evalK12Scores[9]
      payload.score11 = evalK12Scores[10]
      payload.totalScore = sum
    } else {
      if (evalCriteria.some(c => c === 0)) { showToast("Vui lòng đánh giá tất cả 5 tiêu chí!", "error"); return }
      payload.criterion1 = evalCriteria[0]
      payload.criterion2 = evalCriteria[1]
      payload.criterion3 = evalCriteria[2]
      payload.criterion4 = evalCriteria[3]
      payload.criterion5 = evalCriteria[4]
    }

    if (!evalOverall) { showToast("Vui lòng chọn xếp loại tổng thể!", "error"); return }

    setEvalSubmitting(true)
    const res = await submitEvaluation(payload)
    setEvalSubmitting(false)
    if (res.success) {
      showToast("Đã nộp phiếu đánh giá thành công!", "success")
      setEvalModal(null)
      refreshSlots()
    } else {
      showToast(res.error || "Lỗi nộp phiếu!", "error")
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLevel || !newGrade || !newTopic || !newDate || !newStartTime || !newEndTime || !newCampusId) {
      showToast("Vui lòng điền đầy đủ các thông tin bắt buộc (*)", "error"); return
    }
    if (!newSubjectId) { showToast("Vui lòng chọn môn học!", "error"); return }
    if (newSubjectId === "other" && !newSubjectName.trim()) { showToast("Vui lòng nhập tên môn học khác!", "error"); return }
    setSubmitting(true)
    const selectedSub = subjects.find(s => s.id === newSubjectId)
    const subName = selectedSub ? selectedSub.subjectName : newSubjectName || "Khác"
    const selectedCampus = campuses.find(c => c.id === newCampusId)
    const campusNameStr = selectedCampus ? selectedCampus.campusName : ""
    let classNameStr = newClassNameText
    if (newClassId && newClassId !== "other") { const selClass = classes.find(c => c.id === newClassId); if (selClass) classNameStr = selClass.className }
    let res;
    if (editSlotId) {
      res = await updateObservationSlot(editSlotId, {
        subjectId: (newSubjectId && newSubjectId !== "other") ? newSubjectId : undefined,
        subjectName: subName, level: newLevel, grade: newGrade, topic: newTopic, date: newDate,
        startTime: newStartTime, endTime: newEndTime, isDoublePeriod: newIsDoublePeriod,
        room: classNameStr, description: newDescription, visibilityType: newVisibility,
        targetDeptId: newVisibility === "DEPARTMENT" ? newTargetDeptId : undefined,
        campusId: newCampusId, campusName: campusNameStr,
        classId: (newClassId && newClassId !== "other") ? newClassId : undefined,
        className: classNameStr,
        lessonPlanName: newLessonPlanName || undefined, lessonPlanData: newLessonPlanData || undefined
      });
    } else {
      res = await createObservationSlot({
        subjectId: (newSubjectId && newSubjectId !== "other") ? newSubjectId : undefined,
        subjectName: subName, level: newLevel, grade: newGrade, topic: newTopic, date: newDate,
        startTime: newStartTime, endTime: newEndTime, isDoublePeriod: newIsDoublePeriod,
        room: classNameStr, description: newDescription, visibilityType: newVisibility,
        targetDeptId: newVisibility === "DEPARTMENT" ? newTargetDeptId : undefined,
        campusId: newCampusId, campusName: campusNameStr,
        classId: (newClassId && newClassId !== "other") ? newClassId : undefined,
        className: classNameStr,
        lessonPlanName: newLessonPlanName || undefined, lessonPlanData: newLessonPlanData || undefined
      });
    }
    setSubmitting(false)
    if (res.success) {
      showToast(editSlotId ? "Cập nhật tiết dạy thành công!" : "Tạo tiết dạy dự giờ mới thành công!", "success")
      setShowCreateModal(false)
      setNewSubjectId(""); setNewSubjectName(""); setNewLevel(""); setNewGrade(""); setNewClassId("")
      setNewClassNameText(""); setNewTopic(""); setNewDate(""); setNewStartTime("Tiết 1"); setNewEndTime("Tiết 1")
      setNewIsDoublePeriod(false); setNewDescription(""); setNewVisibility("ALL"); setNewTargetDeptId("")
      setNewLessonPlanName(""); setNewLessonPlanData("")
      if (fileInputRef.current) fileInputRef.current.value = ""
      refreshSlots()
    } else {
      showToast(res.error || "Lỗi tạo tiết dạy!", "error")
    }
  }

  const monthlyStats = useMemo(() => {
    const stats = {};
    slots.forEach(slot => {
      const slotDate = new Date(slot.date);
      if (isNaN(slotDate.getTime())) return;
      const year = slotDate.getFullYear();
      const month = slotDate.getMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, "0")}`;
      
      const isHost = slot.teacherId === currentTeacher.id;
      const isObserverApproved = slot.registrations.some(r => r.teacherId === currentTeacher.id && r.isApproved);
      
      if (!stats[key]) {
        stats[key] = {
          monthStr: `Tháng ${month.toString().padStart(2, "0")}/${year}`,
          year,
          month,
          taughtCount: 0,
          observedCount: 0
        };
      }
      
      const countWeight = slot.isDoublePeriod ? 2 : 1;
      if (isHost) {
        // Chỉ tính tiết dạy khi tất cả GV đã được duyệt đều đã điền phiếu đánh giá
        const approvedRegs = slot.registrations.filter((r) => r.isApproved);
        const allEvaluated = approvedRegs.length > 0 && approvedRegs.every((r) => !!r.evaluation);
        if (allEvaluated) {
          stats[key].taughtCount += countWeight;
        }
      }
      if (isObserverApproved) {
        // Chỉ tính tiết dự khi GV dự đã điền phiếu đánh giá
        const myReg = slot.registrations.find((r) => r.teacherId === currentTeacher.id && r.isApproved);
        if (myReg && myReg.evaluation) {
          stats[key].observedCount += countWeight;
        }
      }
    });
    
    return Object.values(stats).sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
  }, [slots, currentTeacher.id]);

  const receivedEvaluations = useMemo(() => {
    const list = [];
    slots.forEach(slot => {
      if (slot.teacherId === currentTeacher.id) {
        slot.registrations.forEach(reg => {
          if (reg.evaluation) {
            list.push({
              slot,
              registration: reg,
              evaluation: reg.evaluation
            });
          }
        });
      }
    });
    return list.sort((a, b) => new Date(b.slot.date).getTime() - new Date(a.slot.date).getTime());
  }, [slots, currentTeacher.id]);

  const tabFilteredSlots = useMemo(() => {
    const now = new Date()
    return slots.filter(slot => {
      const isHost = slot.teacherId === currentTeacher.id
      const isObserver = slot.registrations.some((r: any) => r.teacherId === currentTeacher.id)
      const slotDate = new Date(slot.date)
      const isPast = slotDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())
      if (activeTab === "dang-ky") {
        if (isHost || isObserver || isPast) return false;
        if (activeDeptTab !== "all") {
          const isMyDept = slot.teacher?.departmentId === currentTeacher.departmentId;
          if (activeDeptTab === "my-dept" && !isMyDept) return false;
          if (activeDeptTab === "other-dept" && isMyDept) return false;
        }
        return true;
      }
      if (activeTab === "my-schedule") return isHost
      if (activeTab === "history") return isObserver
      return true
    })
  }, [slots, activeTab, currentTeacher.id, activeDeptTab])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const params = new URLSearchParams(window.location.search)
    if (tab === "dang-ky") {
      params.delete("tab")
    } else {
      params.set("tab", tab)
      // Clear search filters when switching to other tabs
      params.delete("schoolBlock")
      params.delete("level")
      params.delete("grade")
      params.delete("date")
      params.delete("campusId")
      params.delete("deptId")
      
      setFilterCampusId("all")
      setFilterLevel("all")
      setFilterGrade("all")
      setFilterDate("")
      setFilterPeriod("all")
      setFilterSchoolBlock("all")
      setFilterDeptId("all")
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const selectedMonthStr = newDate ? `${(new Date(newDate).getMonth() + 1).toString().padStart(2, "0")}/${new Date(newDate).getFullYear()}` : "tháng hiện tại"

  return (
    <div className="flex flex-col gap-6 relative pb-12 animate-fade-in text-slate-800">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border border-white/20 text-white animate-in slide-in-from-top duration-300 ${toast.type === "success" ? "bg-emerald-600" : toast.type === "error" ? "bg-rose-600" : "bg-sky-600"}`}>
          {toast.type === "success" && <Check className="w-5 h-5 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 shrink-0" />}
          {toast.type === "info" && <Info className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-bold tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#0A3230] tracking-tight flex items-center gap-2">
            <Calendar className="w-7 h-7 text-[#00A19A]" />
            Đăng ký dự giờ
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Đăng ký dự giờ tiết dạy tại Sky-Line</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-[#00A19A] hover:bg-[#008B85] text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 text-sm shrink-0">
          <Plus className="w-4 h-4" /> Thêm mới tiết dạy
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border border-slate-200/60 gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl mb-2 backdrop-blur-sm">
        {[
          ["dang-ky", "Đăng ký dự giờ", <Calendar className="w-4 h-4" key="c"/>],
          ["my-schedule", "Lịch của tôi", <Layers className="w-4 h-4" key="l"/>],
          ["history", "Lịch sử đăng ký", <FileText className="w-4 h-4" key="f"/>],
          ["evaluation-results", "Kết quả đánh giá", <CheckCircle className="w-4 h-4" key="e"/>]
        ].map(([tab, label, icon]) => (
          <button key={tab as string} onClick={() => handleTabChange(tab as string)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-300 ${activeTab === tab ? "bg-gradient-to-r from-[#0A3230] to-[#00A19A] text-white shadow-md font-black scale-105" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"}`}>
            {icon as React.ReactNode}{label as string}
          </button>
        ))}
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Filters */}
        {activeTab === "dang-ky" && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-md shadow-slate-100/40 flex flex-col border-t-4 border-t-[#0A3230] overflow-hidden">
          {/* Filter Header - collapsible */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#00A19A]" />
              <span className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Bộ lọc</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-black text-white bg-[#00A19A] rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showFilterPanel ? "rotate-180" : ""}`} />
          </button>

          {/* Filter Body */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showFilterPanel ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="px-5 pb-5 flex flex-col gap-4 border-t border-slate-100">

              {/* Active Filter Tags */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-4">
                  {activeFilterTags.map(tag => (
                    <span key={tag.key}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#00A19A]/10 text-[#00A19A] border border-[#00A19A]/20">
                      <span className="text-[#0A3230]/50">{tag.label}:</span> {tag.value}
                      <button onClick={tag.onRemove} className="ml-0.5 p-0.5 rounded-full hover:bg-[#00A19A]/20 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button onClick={clearAllFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-500 border border-rose-200/60 hover:bg-rose-100 transition-colors">
                    <RotateCcw className="w-3 h-3" /> Xóa tất cả
                  </button>
                </div>
              )}

              {/* Loading Indicator */}
              {isSearching && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-100">
                  <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] font-bold text-sky-600">Đang cập nhật...</span>
                </div>
              )}
              {/* Campus Filter */}
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Building2 className="w-3 h-3"/>Cơ sở</label>
                <select value={filterCampusId} onChange={e => setFilterCampusId(e.target.value)}
                  className={`w-full text-sm rounded-xl border p-2.5 transition-all outline-none ${filterCampusId !== "all" ? "border-[#00A19A] bg-[#00A19A]/5 text-[#0A3230] font-semibold ring-1 ring-[#00A19A]/20" : "border-slate-200/80 bg-slate-50/50 text-slate-700 hover:border-[#00A19A]/50 focus:border-[#00A19A] focus:bg-white focus:ring-2 focus:ring-[#00A19A]/20"}`}>
                  <option value="all">Tất cả cơ sở</option>
                  {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                </select>
              </div>
              {/* Level Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Layers className="w-3 h-3"/>Bậc học</label>
                <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setFilterGrade("all") }}
                  className={`w-full text-sm rounded-xl border p-2.5 transition-all outline-none ${filterLevel !== "all" ? "border-[#00A19A] bg-[#00A19A]/5 text-[#0A3230] font-semibold ring-1 ring-[#00A19A]/20" : "border-slate-200/80 bg-slate-50/50 text-slate-700 hover:border-[#00A19A]/50 focus:border-[#00A19A] focus:bg-white focus:ring-2 focus:ring-[#00A19A]/20"}`}>
                  <option value="all">Tất cả bậc học</option>
                  <option value="Mầm non">Mầm non</option>
                  <option value="Phổ thông K-12">Phổ thông K-12</option>
                </select>
              </div>
              {/* Grade Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><ChevronDown className="w-3 h-3"/>Khối lớp</label>
                <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} disabled={filterLevel === "all"}
                  className={`w-full text-sm rounded-xl border p-2.5 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed ${filterGrade !== "all" ? "border-[#00A19A] bg-[#00A19A]/5 text-[#0A3230] font-semibold ring-1 ring-[#00A19A]/20" : "border-slate-200/80 bg-slate-50/50 text-slate-700 hover:border-[#00A19A]/50 focus:border-[#00A19A] focus:bg-white focus:ring-2 focus:ring-[#00A19A]/20"}`}>
                  <option value="all">Tất cả khối lớp</option>
                  {getGradesForLevel(filterLevel).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {/* Date Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3"/>Ngày dạy</label>
                <div className="relative">
                  <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                    className={`w-full text-sm rounded-xl border p-2.5 transition-all outline-none pr-8 ${filterDate ? "border-[#00A19A] bg-[#00A19A]/5 text-[#0A3230] font-semibold ring-1 ring-[#00A19A]/20" : "border-slate-200/80 bg-slate-50/50 text-slate-700 hover:border-[#00A19A]/50 focus:border-[#00A19A] focus:bg-white focus:ring-2 focus:ring-[#00A19A]/20"}`} />
                  {filterDate && (
                    <button onClick={() => setFilterDate("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200/80 transition-colors">
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
              {/* Period Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/>Tiết dạy</label>
                <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}
                  className={`w-full text-sm rounded-xl border p-2.5 transition-all outline-none ${filterPeriod !== "all" ? "border-[#00A19A] bg-[#00A19A]/5 text-[#0A3230] font-semibold ring-1 ring-[#00A19A]/20" : "border-slate-200/80 bg-slate-50/50 text-slate-700 hover:border-[#00A19A]/50 focus:border-[#00A19A] focus:bg-white focus:ring-2 focus:ring-[#00A19A]/20"}`}>
                  <option value="all">Tất cả tiết</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(p => <option key={p} value={`Tiết ${p}`}>Tiết {p}</option>)}
                </select>
              </div>
              {/* Filter Info */}
              <div className="text-[10px] text-slate-400 font-medium pt-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Bộ lọc tự động áp dụng khi thay đổi
              </div>

            </div>
          </div>
        </div>
        )}

        {/* Slot Cards */}
        <div className={`${activeTab === "dang-ky" ? "lg:col-span-3" : "lg:col-span-4"} flex flex-col gap-6`}>
          {activeTab === "dang-ky" && (
            <div className="flex flex-col gap-4">
              

              <div className="flex gap-2">
                
                <button onClick={() => setActiveDeptTab("my-dept")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all duration-300 shadow-sm ${activeDeptTab === "my-dept" ? "bg-gradient-to-r from-[#0A3230] to-[#00A19A] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  Tiết dạy thuộc TCM
                </button>
                <button onClick={() => setActiveDeptTab("other-dept")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all duration-300 shadow-sm ${activeDeptTab === "other-dept" ? "bg-gradient-to-r from-[#0A3230] to-[#00A19A] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  Tiết dạy TCM khác
                </button>
              </div>
            </div>
          )}
          {activeTab === "evaluation-results" ? (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* 1. Monthly Statistics Section */}
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <CheckCircle className="w-5 h-5 text-[#00A19A]" /> Thống kê hoạt động theo Tháng
                </h3>
                
                {monthlyStats.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có dữ liệu thống kê.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {monthlyStats.map(stat => (
                      <div key={stat.monthStr} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-3">
                        <span className="text-xs font-black text-slate-700">{stat.monthStr}</span>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiết dạy</span>
                            <span className="text-lg font-black text-emerald-600 mt-1">{stat.taughtCount} tiết</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiết dự giờ</span>
                            <span className="text-lg font-black text-violet-600 mt-1">{stat.observedCount} tiết</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Received Evaluations Section */}
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <ClipboardList className="w-5 h-5 text-[#00A19A]" /> Kết quả đánh giá tiết dạy (Phiếu GV dự)
                </h3>
                
                {receivedEvaluations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <ClipboardList className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
                    <p className="text-xs font-bold">Chưa nhận được phiếu đánh giá nào từ giáo viên dự giờ.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {receivedEvaluations.map(({ slot, registration, evaluation }) => {
                      const slotDate = new Date(slot.date);
                      return (
                        <div key={registration.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-200 transition-all">
                          <div className="space-y-2 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-sky-50 text-sky-600 border border-sky-200 rounded-md uppercase tracking-wider">
                                {["Tiểu học", "THCS", "THPT", "Phổ thông K-12"].includes(slot.level) ? "Phổ thông K-12" : slot.level}
                              </span>
                              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200 rounded-md uppercase tracking-wider">{slot.grade}</span>
                              <span className="text-xs font-bold text-slate-400">{slotDate.toLocaleDateString("vi-VN")} · {slot.startTime}</span>
                            </div>
                            <h4 className="font-extrabold text-sm text-slate-800 truncate">{slot.topic}</h4>
                            <p className="text-[11px] font-bold text-slate-500">
                              Người đánh giá: <span className="text-slate-700 font-extrabold">{registration.teacher?.teacherName || "GV dự giờ"}</span> ({registration.teacher?.teacherCode || ""})
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0 justify-between md:justify-end">
                            <div className="text-right">
                              <div className="text-xs font-black text-slate-700">
                                {evaluation.totalScore !== null && evaluation.totalScore !== undefined
                                  ? `${evaluation.totalScore.toFixed(2)}/20.00đ`
                                  : "Đánh giá đạt"}
                              </div>
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-violet-50 text-violet-700 border border-violet-200 mt-1">
                                {evaluation.overallRating}
                              </span>
                            </div>
                            <button onClick={() => openEvalModal(registration, slot)}
                              className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all">
                              Xem phiếu
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : tabFilteredSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <Calendar className="w-16 h-16 text-slate-300 stroke-1 mb-4" />
              <p className="text-slate-400 font-bold text-sm">Không tìm thấy tiết dạy dự giờ nào!</p>
              <p className="text-slate-400 text-xs mt-1">Vui lòng thay đổi bộ lọc hoặc thêm mới tiết dạy của bạn.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tabFilteredSlots.map((slot) => {
                const isHost = slot.teacherId === currentTeacher.id
                const myReg = slot.registrations.find((r: any) => r.teacherId === currentTeacher.id)
                const isRegistered = !!myReg
                const observerCount = slot.registrations.length
                const isExpanded = expandedSlotId === slot.id
                const slotDate = new Date(slot.date)

                return (
                  <div key={slot.id} className="bg-white rounded-2xl border border-slate-100/80 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 group relative overflow-hidden border-l-4 border-l-[#00A19A]">
                    {/* Tags */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2.5 py-1 text-[10px] font-extrabold bg-[#E0F2FE] text-[#0284C7] rounded-lg uppercase tracking-wider">
                          {["Tiểu học", "THCS", "THPT", "Phổ thông K-12"].includes(slot.level) ? "Phổ thông K-12" : slot.level}
                        </span>
                        {slot.teacher?.departmentRel?.name && (
                          <span className="px-2.5 py-1 text-[10px] font-extrabold bg-indigo-50 text-indigo-700 rounded-lg uppercase tracking-wider border border-indigo-100" title={`Tổ chuyên môn gán với Mã GV ${slot.teacher.teacherCode}`}>
                            TCM: {slot.teacher.departmentRel.name}
                          </span>
                        )}
                        <span className="px-2.5 py-1 text-[10px] font-extrabold bg-[#FEF3C7] text-[#D97706] rounded-lg uppercase tracking-wider">{slot.grade}</span>
                        {isHost && <span className="px-2 py-0.5 text-[9px] font-bold bg-[#00A19A]/10 border border-[#00A19A]/30 text-[#00A19A] rounded-md">Chủ trì</span>}
                      </div>
                      {slot.visibilityType === "DEPARTMENT" && (
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-md">Nội bộ Tổ</span>
                      )}
                    </div>

                    {/* Topic */}
                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-slate-800 text-base group-hover:text-[#00A19A] transition-colors leading-snug">{slot.topic}</h4>
                      <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#00A19A]" /> Môn học: <span className="text-slate-700">{slot.subjectName}</span>
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-1 gap-2.5 bg-slate-50 p-3.5 rounded-xl text-xs font-semibold text-slate-600">
                      <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#00A19A] shrink-0" />
                        <span>{slotDate.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "2-digit", day: "2-digit" })}</span>
                      </div>
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#00A19A] shrink-0" />
                        <span>Tiết dạy: <span className="font-bold text-slate-850">{slot.startTime === slot.endTime ? slot.startTime : `${slot.startTime} - ${slot.endTime}`}</span>
                          {slot.isDoublePeriod && <span className="text-[9px] font-extrabold bg-[#00A19A]/10 text-[#00A19A] px-1.5 py-0.5 rounded-md ml-2">Dạy 2 tiết liên tiếp</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#00A19A] shrink-0" />
                        <span>Lớp: <span className="font-bold text-slate-800">{slot.className || "Chưa xếp"}</span>
                          <span className="text-slate-400 ml-1.5">({slot.campusName || "Cơ sở"})</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 border-t border-slate-200 pt-2 mt-0.5"><User className="w-4 h-4 text-[#00A19A] shrink-0" />
                        <span>Gv dạy: <span className="font-bold text-slate-800">{slot.teacher.teacherName}</span>
                          <span className="text-slate-400 text-[10px] ml-1.5">({slot.teacher.campus?.campusName || "Sky-Line"})</span>
                        </span>
                      </div>
                    </div>

                    {/* My Registration Status (observer view) */}
                    {!isHost && isRegistered && (
                      <div className="flex flex-col gap-2 w-full">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${myReg.isApproved ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                          {myReg.isApproved ? <CheckCircle className="w-4 h-4 shrink-0" /> : <Clock3 className="w-4 h-4 shrink-0" />}
                          {myReg.isApproved ? "Đã được xác nhận dự giờ" : "Chờ xác nhận từ GV chủ trì"}
                        </div>
                        {myReg.evaluation && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 text-violet-700 rounded-xl text-xs font-bold">
                            <ClipboardList className="w-4 h-4 shrink-0" />
                            <span>
                              {myReg.evaluation.totalScore !== null
                                ? `Kết quả: ${myReg.evaluation.totalScore.toFixed(2)}/20 điểm (${myReg.evaluation.overallRating})`
                                : `Kết quả: ${myReg.evaluation.overallRating}`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-bold shrink-0">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Số GV đăng ký: <span className="text-emerald-600 font-black">{observerCount}</span>/{Math.min(slot.maxSeats || 4, 4)} GV</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {slot.lessonPlanData && (
                          <button onClick={() => handleViewPdf(slot.lessonPlanName || "GiaoAn.pdf", slot.lessonPlanData)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-600 rounded-lg text-xs font-bold transition-all" title="Xem giáo án PDF đính kèm">
                            <FileText className="w-3.5 h-3.5" /> Giáo án
                          </button>
                        )}

                        {/* Host: expand registrant list + delete */}
                        {isHost ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setExpandedSlotId(isExpanded ? null : slot.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#00A19A]/10 border border-[#00A19A]/30 hover:bg-[#00A19A]/20 text-[#00A19A] rounded-lg text-xs font-bold transition-all">
                              <Users className="w-3.5 h-3.5" />
                              {observerCount} GV
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {observerCount === 0 && (
                              <button onClick={() => openEditModal(slot)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-all">
                                <FileText className="w-3.5 h-3.5" />
                                Sửa
                              </button>
                            )}                            {observerCount < Math.min(slot.maxSeats || 4, 4) ? (
                              <button onClick={() => handleDeleteSlot(slot.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all">
                                <Trash2 className="w-3.5 h-3.5" /> Xóa
                              </button>
                            ) : (
                              <span
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-400 rounded-lg text-xs font-bold cursor-not-allowed select-none"
                                title="Không thể xóa khi đã đủ GV đăng ký">
                                <Trash2 className="w-3.5 h-3.5" /> Xóa
                              </span>
                            )}
                          </div>
                        ) : isRegistered ? (
                          <div className="flex items-center gap-1.5">
                            {/* Eval form button if approved */}
                            {myReg.isApproved && (
                              myReg.evaluation ? (
                                <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-xs font-extrabold select-none cursor-default">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                  Đã đánh giá
                                </span>
                              ) : (
                                <button onClick={() => openEvalModal(myReg, slot)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-600 hover:bg-violet-100 rounded-lg text-xs font-bold transition-all">
                                  <ClipboardList className="w-3.5 h-3.5" />
                                  Điền phiếu
                                </button>
                              )
                            )}
                            {!myReg.isApproved ? (
                              <button onClick={() => handleCancelRegistration(slot.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all">
                                Hủy đăng ký
                              </button>
                            ) : (
                              <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-xs font-extrabold select-none cursor-default">
                                GV đã xác nhận
                              </span>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => handleRegister(slot.id)} disabled={observerCount >= Math.min(slot.maxSeats || 4, 4)}
                            className="px-4 py-1.5 bg-[#00A19A] hover:bg-[#008B85] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all shadow-sm disabled:shadow-none">
                            Đăng ký
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded registrant list (host view) */}
                    {isHost && isExpanded && (
                      <div className="border-t border-slate-200 pt-4 space-y-2 animate-in fade-in duration-200">
                        <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#00A19A]" /> Danh sách GV đăng ký dự giờ
                        </h5>
                        {slot.registrations.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Chưa có giáo viên nào đăng ký.</p>
                        ) : (
                          <div className="space-y-2">
                            {slot.registrations.map((reg: any) => (
                              <div key={reg.id} className={`flex items-center justify-between gap-2 p-3 rounded-xl border ${reg.isApproved ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${reg.isApproved ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-600"}`}>
                                    {reg.teacher.teacherName.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-extrabold text-slate-800 truncate">{reg.teacher.teacherName}</p>
                                    <p className="text-[10px] text-slate-500 truncate">
                                      {reg.teacher.teacherCode}
                                      {reg.teacher.departmentRel?.name && ` · ${reg.teacher.departmentRel.name}`}
                                      {reg.teacher.campus?.campusName && ` · ${reg.teacher.campus.campusName}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {reg.evaluation && (
                                    <span className="px-2 py-0.5 text-[9px] font-bold bg-violet-50 border border-violet-200 text-violet-600 rounded-md">
                                      {reg.evaluation.totalScore !== null && reg.evaluation.totalScore !== undefined
                                        ? `Đã nộp: ${reg.evaluation.totalScore}đ (${reg.evaluation.overallRating})`
                                        : "Đã nộp phiếu"}
                                    </span>
                                  )}
                                  {reg.isApproved ? (
                                    <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 border border-emerald-300 text-emerald-700 rounded-lg text-[10px] font-extrabold">
                                      <CheckCircle className="w-3 h-3" /> Đã xác nhận
                                    </span>
                                  ) : (
                                    <button onClick={() => handleApprove(reg.id)} disabled={isPending}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-[#00A19A] hover:bg-[#008B85] disabled:opacity-50 text-white rounded-lg text-[10px] font-extrabold transition-all">
                                      <Shield className="w-3 h-3" /> Xác nhận
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="px-6 py-5 bg-[#0A3230] text-white flex items-center justify-between shrink-0">
              <div><h3 className="font-black text-lg">Thêm mới tiết dạy</h3><p className="text-white/60 text-xs mt-0.5">Tạo tiết dạy để giáo viên khác đăng ký dự giờ</p></div>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><X className="w-5 h-5 text-white/80" /></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div className="flex items-center justify-between gap-3 p-4 bg-sky-50 border border-sky-100 text-sky-800 rounded-2xl">
                <div className="flex items-center gap-2"><Info className="w-4 h-4 text-sky-600 shrink-0" /><span className="text-xs font-semibold">Bạn có thể tạo tối đa 2 tiết dạy mỗi tháng.</span></div>
                <span className="text-xs font-bold bg-sky-200/50 px-2 py-0.5 rounded-md text-sky-900 shrink-0">Đã tạo trong {selectedMonthStr}: <span className="font-black">{monthlyLimitCount}/2</span> tiết</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Level */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Cấp học *</label>
                  <select value={newLevel} onChange={e => { setNewLevel(e.target.value); setNewGrade(""); setNewClassId("") }} required
                    className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none">
                    <option value="">Chọn cấp học</option>
                    <option value="Mầm non">Mầm non</option>
                    <option value="Tiểu học">Tiểu học</option>
                    <option value="THCS">THCS</option>
                    <option value="THPT">THPT</option>
                  </select>
                </div>
                {/* Grade */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Khối lớp *</label>
                  <select value={newGrade} onChange={e => { setNewGrade(e.target.value); setNewClassId("") }} required disabled={!newLevel}
                    className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none disabled:opacity-50">
                    <option value="">Chọn khối lớp</option>
                    {getGradesForLevel(newLevel).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                {/* Subject */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Môn học *</label>
                  <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)} required
                    className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none">
                    <option value="">Chọn môn học</option>
                    {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.subjectName}</option>)}
                    <option value="other">Môn học khác / Tổ nhóm chuyên đề</option>
                  </select>
                </div>
                {newSubjectId === "other" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Tên môn học khác *</label>
                    <input type="text" placeholder="Nhập tên môn học..." value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} required
                      className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none" />
                  </div>
                )}
                {/* Campus */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Cơ sở *</label>
                  <select value={newCampusId} onChange={e => { setNewCampusId(e.target.value); setNewClassId("") }} required
                    className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none">
                    <option value="">Chọn cơ sở</option>
                    {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                  </select>
                </div>
                {/* Class */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Lớp học *</label>
                  <select value={newClassId} onChange={e => setNewClassId(e.target.value)} required disabled={!newCampusId || !newLevel || !newGrade}
                    className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none disabled:opacity-50">
                    <option value="">Chọn lớp học</option>
                    {filteredClassesForCreation.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                    <option value="other">Lớp học khác (Nhập tay...)</option>
                  </select>
                </div>
                {newClassId === "other" && (
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-extrabold text-slate-700">Nhập tên lớp học khác *</label>
                    <input type="text" placeholder="Nhập tên lớp học (ví dụ: Lớp 2.1, Nhà trẻ A...)" value={newClassNameText} onChange={e => setNewClassNameText(e.target.value)} required
                      className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none" />
                  </div>
                )}
                {/* Topic */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Bài dạy / Chủ đề *</label>
                  <input type="text" placeholder="Nhập tên bài dạy hoặc chủ đề sinh hoạt..." value={newTopic} onChange={e => setNewTopic(e.target.value)} required
                    className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none" />
                </div>
                {/* Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Ngày dạy *</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required
                    className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none" />
                </div>
                {/* PDF Upload */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Upload Giáo án (PDF) <span className="text-slate-400 font-normal">(không bắt buộc)</span></label>
                  <div className="flex items-center gap-2">
                    <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="pdf-upload-file" />
                    <label htmlFor="pdf-upload-file" className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-all">
                      <FileText className="w-4 h-4 text-slate-500" />{newLessonPlanName ? "Thay đổi File PDF" : "Chọn File PDF..."}
                    </label>
                    {newLessonPlanName && (
                      <button type="button" onClick={() => { setNewLessonPlanName(""); setNewLessonPlanData(""); if (fileInputRef.current) fileInputRef.current.value = "" }}
                        className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-all" title="Xóa file đã chọn"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  {newLessonPlanName && <span className="text-[10px] font-bold text-[#00A19A] mt-1 truncate max-w-full block">Đã chọn: {newLessonPlanName}</span>}
                </div>
                {/* Period */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Tiết dạy: Tu *</label>
                    <select value={newStartTime} onChange={e => handleStartTimeChange(e.target.value)}
                      className="w-full text-sm rounded-xl border border-slate-200 p-2 bg-white text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none">
                      {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Đến *</label>
                    <select value={newEndTime} disabled={newIsDoublePeriod} onChange={e => setNewEndTime(e.target.value)}
                      className="w-full text-sm rounded-xl border border-slate-200 p-2 bg-white text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none disabled:opacity-50">
                      {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pb-2 h-[42px] pl-2">
                    <input type="checkbox" id="isDoublePeriod" checked={newIsDoublePeriod} disabled={newStartTime === "Tiết 8"} onChange={e => handleDoublePeriodChange(e.target.checked)}
                      className="w-4 h-4 rounded text-[#00A19A] focus:ring-[#00A19A]" />
                    <label htmlFor="isDoublePeriod" className="text-xs font-extrabold text-slate-600 select-none cursor-pointer">Dạy 2 tiết liên tiếp</label>
                  </div>
                </div>
              </div>
              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700">Mô tả nội dung tiết dạy (không bắt buộc)</label>
                  <span className="text-[10px] font-bold text-slate-400">{newDescription.length}/500</span>
                </div>
                <textarea placeholder="Nhập mô tả ngắn về nội dung, mục tiêu, phương pháp dạy học..." maxLength={500} rows={3} value={newDescription} onChange={e => setNewDescription(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-200 p-3 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none resize-none" />
              </div>
              {/* Visibility */}
              <div className="flex flex-col gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="text-xs font-extrabold text-slate-700">Hiển thị cho giáo viên</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none cursor-pointer">
                    <input type="radio" name="visibility" checked={newVisibility === "ALL"} onChange={() => setNewVisibility("ALL")} className="w-4 h-4 text-[#00A19A] focus:ring-[#00A19A]" />
                    Tất cả giáo viên trong trường
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none cursor-pointer">
                    <input type="radio" name="visibility" checked={newVisibility === "DEPARTMENT"} onChange={() => setNewVisibility("DEPARTMENT")} className="w-4 h-4 text-[#00A19A] focus:ring-[#00A19A]" />
                    Chỉ các tổ nhóm chuyên môn
                  </label>
                </div>
                {newVisibility === "DEPARTMENT" && (
                  <div className="flex flex-col gap-1.5 mt-2 animate-in fade-in duration-200">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chọn tổ nhóm *</label>
                    <select value={newTargetDeptId} onChange={e => setNewTargetDeptId(e.target.value)} required
                      className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none">
                      <option value="">Chọn tổ nhóm chuyên môn</option>
                      {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>)}
                    </select>
                  </div>
                )}
              </div>
              {/* Submit */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => { setShowCreateModal(false); resetCreateForm(); }} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm">Hủy</button>
                <button type="submit" disabled={submitting || monthlyLimitCount >= 2}
                  className="px-6 py-2.5 bg-[#00A19A] hover:bg-[#008B85] disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl transition-all shadow-md text-sm shrink-0">
                  {submitting ? "Đang lưu..." : (editSlotId ? "Cập nhật" : "Lưu tiết dạy")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {evalModal && (() => {
        const isReadOnly = !!evalModal.registration.evaluation;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="px-6 py-5 bg-gradient-to-r from-violet-700 to-violet-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-lg flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Phiếu đánh giá tiết dự giờ</h3>
                <p className="text-white/70 text-xs mt-0.5">Bài dạy: {evalModal.slot.topic}</p>
              </div>
              <button onClick={() => setEvalModal(null)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><X className="w-5 h-5 text-white/80" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Evaluation Form Sections */}
              {evalModal.slot.level !== "Mầm non" ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-violet-50 border border-violet-100 p-4 rounded-2xl">
                    <span className="text-xs font-black text-violet-800 uppercase tracking-wide">Tổng điểm tự động tính:</span>
                    <span className="text-base font-black text-violet-900 bg-white px-4 py-1.5 rounded-xl shadow-sm border border-violet-100">
                      {evalK12Scores.reduce((a, b) => a + b, 0).toFixed(2)} / 20.00 điểm
                    </span>
                  </div>
                  {K12_SECTIONS.map((sec, sIdx) => {
                    // Calculate starting index of requirements for this section
                    let reqStartIdx = 0;
                    for (let i = 0; i < sIdx; i++) {
                      reqStartIdx += K12_SECTIONS[i].requirements.length;
                    }

                    return (
                      <div key={sIdx} className="space-y-4">
                        <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                          <span className="w-5 h-5 bg-violet-100 text-violet-700 rounded-md flex items-center justify-center text-[10px] font-black">{sIdx + 1}</span>
                          {sec.name}
                        </h4>
                        <div className="space-y-3">
                          {sec.requirements.map((req, rSubIdx) => {
                            const globalIdx = reqStartIdx + rSubIdx;
                            // Generate options from 0 to req.max with step 0.25
                            const options = [];
                            for (let v = 0; v <= req.max; v += 0.25) {
                              options.push(Math.round(v * 100) / 100);
                            }

                            return (
                              <div key={req.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 text-[9px] font-extrabold bg-slate-200 text-slate-700 rounded-md uppercase tracking-wider">{req.label}</span>
                                    <span className="text-[10px] font-bold text-slate-400">(Tối đa: {req.max}đ)</span>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">{req.text}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                                  <span className="text-xs font-extrabold text-slate-500">Điểm:</span>
                                  <select
                                    value={evalK12Scores[globalIdx]}
                                    onChange={(e) => {
                                      const nextScores = [...evalK12Scores];
                                      nextScores[globalIdx] = parseFloat(e.target.value);
                                      setEvalK12Scores(nextScores);
                                      const nextRank = calculateK12Ranking(nextScores);
                                      setEvalOverall(nextRank);
                                    }}
                                    disabled={isReadOnly} className="rounded-xl border border-slate-200 p-2 bg-white text-sm font-black text-slate-800 focus:ring-2 focus:ring-violet-500 outline-none w-28 shadow-sm disabled:opacity-75 disabled:bg-slate-150"
                                  >
                                    {options.map(o => <option key={o} value={o}>{o.toFixed(2)}</option>)}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 bg-violet-100 text-violet-700 rounded-md flex items-center justify-center text-[10px] font-black">1</span>
                    Đánh giá theo tiêu chí (chọn mức độ phù hợp)
                  </h4>
                  {CRITERIA_LABELS.map((label, i) => (
                    <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-xs font-extrabold text-slate-700 mb-3">{i + 1}. {label}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[4, 3, 2, 1].map((score, si) => (
                          <button key={si} type="button" onClick={() => { if (!isReadOnly) { const c = [...evalCriteria]; c[i] = score; setEvalCriteria(c) } }} disabled={isReadOnly}
                            className={`py-2 rounded-xl border-2 text-xs font-extrabold transition-all ${evalCriteria[i] === score ? score === 4 ? "bg-emerald-500 border-emerald-500 text-white" : score === 3 ? "bg-sky-500 border-sky-500 text-white" : score === 2 ? "bg-amber-400 border-amber-400 text-white" : "bg-rose-500 border-rose-500 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"} disabled:opacity-75`}>
                            {RATING_LABELS[si]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Text Fields */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 bg-violet-100 text-violet-700 rounded-md flex items-center justify-center text-[10px] font-black">
                    {evalModal.slot.level !== "Mầm non" ? "5" : "2"}
                  </span>
                  Nhận xét chi tiết
                </h4>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Ưu điểm nổi bật của tiết dạy</label>
                  <textarea placeholder="Những điểm mạnh, sáng tạo, hiệu quả của tiết dạy..." rows={3} value={evalStrengths} onChange={e => setEvalStrengths(e.target.value)}
                    disabled={isReadOnly} className="w-full text-sm rounded-xl border border-slate-200 p-3 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-violet-500 outline-none resize-none disabled:opacity-75 disabled:bg-slate-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Góp ý cải thiện / xây dựng</label>
                  <textarea placeholder="Những điểm có thể cải thiện, gợi ý phương pháp thay thế..." rows={3} value={evalImprovements} onChange={e => setEvalImprovements(e.target.value)}
                    disabled={isReadOnly} className="w-full text-sm rounded-xl border border-slate-200 p-3 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-violet-500 outline-none resize-none disabled:opacity-75 disabled:bg-slate-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Nhận xét chung</label>
                  <textarea placeholder="Tổng thể nhận xét của bạn về tiết dự giờ..." rows={2} value={evalGeneral} onChange={e => setEvalGeneral(e.target.value)}
                    disabled={isReadOnly} className="w-full text-sm rounded-xl border border-slate-200 p-3 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-violet-500 outline-none resize-none disabled:opacity-75 disabled:bg-slate-100" />
                </div>
              </div>

              {/* Overall Rating */}
              <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Xếp loại tiết dạy tổng thể *</label>
                    {evalModal.slot.level !== "Mầm non" && (
                      <span className="text-xs font-black text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-lg">
                        Tổng điểm: {evalK12Scores.reduce((a, b) => a + b, 0).toFixed(2)}/20đ
                      </span>
                    )}
                  </div>
                  {evalModal.slot.level !== "Mầm non" && (
                    <span className="text-[10px] font-black bg-violet-100 text-violet-700 px-2 py-0.5 rounded-md">
                      Tự động gợi ý: {calculateK12Ranking(evalK12Scores)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[["Tốt","bg-emerald-500"],["Khá","bg-sky-500"],["Trung bình","bg-amber-400"],["Yếu","bg-rose-500"]].map(([r, color]) => (
                    <button key={r} type="button" onClick={() => { if (!isReadOnly) setEvalOverall(r); }} disabled={isReadOnly}
                      className={`py-2.5 rounded-xl border-2 text-xs font-extrabold transition-all ${evalOverall === r ? `${color} border-transparent text-white shadow-md` : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEvalModal(null)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm">Đóng</button>
                {!isReadOnly && (
                  <button type="button" onClick={handleSubmitEval} disabled={evalSubmitting}
                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl transition-all shadow-md text-sm">
                    {evalSubmitting ? "Đang nộp..." : "Nộp phiếu đánh giá"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  )
}
