// Forced Vercel Deployment: 2026-08-23T22:25:00.000Z
"use client"

import { useState, useEffect, useTransition, useMemo, useRef, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { 
  Calendar, Clock, MapPin, User, Users, BookOpen, Plus, Search, X, Check,
  AlertCircle, Trash2, Info, Layers, FileText, ChevronDown, ChevronUp,
  ClipboardList, CheckCircle, Clock3, Building2, Shield, Filter, RotateCcw, SlidersHorizontal, Award,
  Eye, TrendingUp, Sparkles, CheckSquare, Mail, History, Send, ChevronRight, UserCheck, FileCheck,
  CheckCircle2, AlertTriangle, ExternalLink, Bookmark, HelpCircle, ArrowRight, UserPlus, CheckCheck
} from "lucide-react"
import { 
  createObservationSlot, updateObservationSlot, registerObservation, cancelObservation, getDepartmentTeachers,
  requestObservationSlot, respondToObservationRequest,
  deleteObservationSlot, getCreatedCountInMonth, getObservationSlots, triggerSlotReminder,
  approveRegistration, submitEvaluation, updateTeacherObservationTargets
} from "./actions"

interface TeacherInfo {
  id: string;
  teacherName: string;
  teacherCode: string;
  email: string | null;
  departmentId: string | null;
  campusId: string;
  departmentRel?: any;
  user?: { role: string } | null;
  observerType?: string | null;
  observeeType?: string | null;
  requiredObserved?: number | null;
  observedUnit?: string | null;
  requiredTaught?: number | null;
  taughtUnit?: string | null;
  position?: string | null;
  departmentAssignments?: any[];
}
interface SubjectInfo { id: string; subjectCode: string; subjectName: string }
interface DeptInfo { id: string; code: string; name: string }
interface CampusInfo { id: string; campusCode: string; campusName: string }
interface ClassInfo { id: string; classCode: string; className: string; level: string; grade: string; campusId: string; academicYearId?: string }

interface ObservationClientProps {
  initialSlots: any[]
  currentTeacher?: TeacherInfo | null
  subjects: SubjectInfo[]
  departments: DeptInfo[]
  teachers: any[]
  campuses: CampusInfo[]
  classes: ClassInfo[]
  initialFilters: { level: string; period: string; grade: string; classId?: string; date: string; campusId: string; deptId: string; academicYearId?: string }
  academicYears?: { id: string; name: string; status: string }[]
  selectedYearId?: string
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

const MAMNON_SECTIONS = [
  {
    name: "1. Chuẩn bị cho hoạt động (2 điểm)",
    requirements: [
      { id: 1, label: "Yêu cầu 1", max: 1.0, text: "Mục tiêu hoạt động phù hợp với độ tuổi và phù hợp với khả năng của trẻ." },
      { id: 2, label: "Yêu cầu 2", max: 0.5, text: "Các phương tiện dạy học kích thích trẻ hoạt động." },
      { id: 3, label: "Yêu cầu 3", max: 0.5, text: "GV tận dụng các sản phẩm do trẻ làm ra để trẻ được hoạt động." }
    ]
  },
  {
    name: "2. Nội dung hoạt động (3 điểm)",
    requirements: [
      { id: 4, label: "Yêu cầu 4", max: 0.5, text: "Khuyến khích trẻ tham gia hoạt động giáo dục bằng vận động thân thể và các giác quan dưới nhiều hình thức khác nhau." },
      { id: 5, label: "Yêu cầu 5", max: 0.5, text: "Đảm bảo tính chính xác về mặt kiến thức, kỹ năng." },
      { id: 6, label: "Yêu cầu 6", max: 0.5, text: "Kiến thức có hệ thống, gần gũi với cuộc sống thực của trẻ." },
      { id: 7, label: "Yêu cầu 7", max: 0.5, text: "Thiết kế các hoạt động cho trẻ hợp lý, đảm bảo tính phát triển, phù hợp với đặc điểm nhận thức và khả năng tư duy của trẻ." },
      { id: 8, label: "Yêu cầu 8", max: 0.5, text: "Nội dung tích hợp nhẹ nhàng, phù hợp." },
      { id: 9, label: "Yêu cầu 9", max: 0.5, text: "GV hướng dẫn rõ ràng, ngắn gọn, chính xác. GV gợi ý, dẫn dắt trẻ tìm ra câu trả lời, luôn tạo cơ hội cho trẻ tham gia hoạt động." }
    ]
  },
  {
    name: "3. Phương pháp và hình thức tổ chức (3 điểm)",
    requirements: [
      { id: 10, label: "Yêu cầu 10", max: 1.0, text: "Tùy theo từng loại hình tổ chức hoạt động, GV kết hợp các phương pháp một cách linh hoạt và thành thạo. Phân bổ thời gian cho các hoạt động hợp lý." },
      { id: 11, label: "Yêu cầu 11", max: 0.5, text: "Giáo viên tổ chức, điều khiển, hỗ trợ đúng lúc, không làm thay trẻ. Khuyến khích tương tác giữa trẻ với trẻ." },
      { id: 12, label: "Yêu cầu 12", max: 0.5, text: "GV đưa ra những tình huống có vấn đề phù hợp, đúng lúc để tạo hứng thú và kích thích trẻ hoạt động." },
      { id: 13, label: "Yêu cầu 13", max: 0.5, text: "Bao quát lớp tốt, lắng nghe trẻ, khen ngợi trẻ kịp thời. GV có thái độ nhẹ nhàng tình cảm, lôi cuốn trẻ." },
      { id: 14, label: "Yêu cầu 14", max: 0.5, text: "Sử dụng các phương tiện tiện dạy học đạt hiệu quả. Có đa dạng các hình thức cho trẻ hoạt động." }
    ]
  },
  {
    name: "4. Kết quả trên trẻ (2 điểm)",
    requirements: [
      { id: 15, label: "Yêu cầu 15", max: 0.5, text: "Trẻ tích cực, hứng thú trên giờ học." },
      { id: 16, label: "Yêu cầu 16", max: 0.5, text: "Trẻ có nhiều cơ hội để khám phá." },
      { id: 17, label: "Yêu cầu 17", max: 0.5, text: "Mọi trẻ đều được GV hỗ trợ và được tham gia hoạt động." },
      { id: 18, label: "Yêu cầu 18", max: 0.5, text: "Trẻ tự chuẩn bị đồ dùng để hoạt động, GV không làm thay cho trẻ." }
    ]
  }
];

const calculateMamNonRanking = (scores: number[]) => {
  const sum = scores.reduce((a: number, b: number) => a + b, 0);
  if (sum >= 9.0) return "Tốt";
  if (sum >= 8.0) return "Khá";
  if (sum >= 7.0) return "Đạt";
  return "Không đạt";
};

const RATING_COLORS: Record<string, string> = {
  "Tốt": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Giỏi": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Khá": "bg-sky-50 text-sky-700 border-sky-200",
  "Trung bình": "bg-amber-50 text-amber-700 border-amber-200",
  "Đạt": "bg-teal-50 text-teal-700 border-teal-200",
  "Không đạt": "bg-rose-50 text-rose-700 border-rose-200",
  "Không xếp loại": "bg-rose-50 text-rose-700 border-rose-200",
  "Yếu": "bg-rose-50 text-rose-700 border-rose-200"
}

// Generate consistent avatar color based on name
const getAvatarGradient = (name: string) => {
  const gradients = [
    "from-teal-500 to-emerald-600",
    "from-sky-500 to-blue-600",
    "from-indigo-500 to-violet-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-cyan-500 to-teal-600",
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

export function ObservationClient(props: ObservationClientProps) {
  const {
    initialSlots, currentTeacher, subjects, departments, teachers, campuses, classes, initialFilters, academicYears, selectedYearId
  } = props;

  const isMamNonTeacher = 
    currentTeacher?.user?.role === "GV_MN" || 
    currentTeacher?.user?.role === "BGH_MN" ||
    (currentTeacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");

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
  const [creationMode, setCreationMode] = useState<"TEACHER_OPEN" | "OBSERVER_REQUEST">("TEACHER_OPEN")
  
  // Request Observation Form States
  const [reqCampusId, setReqCampusId] = useState("")
  const [reqDeptId, setReqDeptId] = useState("")
  const [reqTeacherId, setReqTeacherId] = useState("")
  const [reqSubjectId, setReqSubjectId] = useState("")
  const [reqLevel, setReqLevel] = useState("")
  const [reqGrade, setReqGrade] = useState("")
  const [reqClassId, setReqClassId] = useState("")
  const [reqDate, setReqDate] = useState("")
  const [reqPeriod, setReqPeriod] = useState("Tiết 1")
  const [reqTopic, setReqTopic] = useState("")
  const [reqNotes, setReqNotes] = useState("")
  const [declineReason, setDeclineReason] = useState("")
  const [decliningSlotId, setDecliningSlotId] = useState<string | null>(null)
  const [registerDetailSlot, setRegisterDetailSlot] = useState<any | null>(null)
  const [historySlot, setHistorySlot] = useState<any | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)

  // Filter states
  const [filterSchoolBlock, setFilterSchoolBlock] = useState("all");
  const [activeDeptTab, setActiveDeptTab] = useState("my-dept");
  const [activeStatusTab, setActiveStatusTab] = useState<"new" | "expired" | "gbm_request" | "all">("new");
  const [sendEmailNotif, setSendEmailNotif] = useState<boolean>(false);
  const [selectedEmailTeacherIds, setSelectedEmailTeacherIds] = useState<string[]>([]);

  // Filter teachers belonging ONLY to current logged-in teacher's department
  const myDeptTeachers = useMemo(() => {
    if (!currentTeacher?.departmentId) return teachers;
    return teachers.filter((t: any) => t.departmentId === currentTeacher.departmentId);
  }, [teachers, currentTeacher?.departmentId]);

  useEffect(() => {
    if (myDeptTeachers.length > 0 && selectedEmailTeacherIds.length === 0) {
      setSelectedEmailTeacherIds(myDeptTeachers.map((t: any) => t.id));
    }
  }, [myDeptTeachers]);

  const [filterLevel, setFilterLevel] = useState(initialFilters.level || "all")
  const [filterGrade, setFilterGrade] = useState(initialFilters.grade || "all")
  const [filterPeriod, setFilterPeriod] = useState(initialFilters.period || "all")
  const [filterDate, setFilterDate] = useState(initialFilters.date || "")
  const [filterCampusId, setFilterCampusId] = useState(initialFilters.campusId || "all")
  const [filterDeptId, setFilterDeptId] = useState(initialFilters.deptId || "all")
  const [filterClassId, setFilterClassId] = useState(initialFilters.classId || "all")
  const [filterAcademicYearId, setFilterAcademicYearId] = useState(initialFilters.academicYearId || selectedYearId || "")

  const handleAcademicYearChange = (yearId: string) => {
    setFilterAcademicYearId(yearId)
    const params = new URLSearchParams(window.location.search)
    params.set("academicYearId", yearId)
    router.push(`${pathname}?${params.toString()}`)
  }

  const checkIsMyDept = useCallback((slot: any) => {
    if (!currentTeacher || !slot?.teacher) return false;
    const normDept = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    
    const myDeptIds = new Set<string>();
    const myDeptNames = new Set<string>();

    if (currentTeacher.departmentId) myDeptIds.add(currentTeacher.departmentId);
    if (currentTeacher.departmentRel?.name) myDeptNames.add(normDept(currentTeacher.departmentRel.name));
    
    if (currentTeacher.departmentAssignments && Array.isArray(currentTeacher.departmentAssignments)) {
      currentTeacher.departmentAssignments.forEach((da: any) => {
        if (da.departmentId) myDeptIds.add(da.departmentId);
        if (da.department?.name) myDeptNames.add(normDept(da.department.name));
      });
    }

    const slotTeacher = slot.teacher;
    const slotDeptIds = new Set<string>();
    const slotDeptNames = new Set<string>();

    if (slotTeacher.departmentId) slotDeptIds.add(slotTeacher.departmentId);
    if (slotTeacher.departmentRel?.name) slotDeptNames.add(normDept(slotTeacher.departmentRel.name));
    if (slot.targetDeptId) slotDeptIds.add(slot.targetDeptId);

    if (slotTeacher.departmentAssignments && Array.isArray(slotTeacher.departmentAssignments)) {
      slotTeacher.departmentAssignments.forEach((da: any) => {
        if (da.departmentId) slotDeptIds.add(da.departmentId);
        if (da.department?.name) slotDeptNames.add(normDept(da.department.name));
      });
    }

    if (isMamNonTeacher) {
      const slotMN = slot.level === "Mầm non" || (slotTeacher.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");
      if (!slotMN) return false;
      if (myDeptNames.size === 0) return true;
      for (const name of slotDeptNames) {
        if (name !== "" && myDeptNames.has(name)) return true;
      }
      return false;
    }

    for (const id of slotDeptIds) {
      if (myDeptIds.has(id)) return true;
    }

    for (const name of slotDeptNames) {
      if (name !== "" && myDeptNames.has(name)) return true;
      for (const myName of myDeptNames) {
        if (name !== "" && myName !== "" && (name.includes(myName) || myName.includes(name))) return true;
      }
    }

    return false;
  }, [currentTeacher, isMamNonTeacher]);

  const filteredReqClasses = useMemo(() => {
    let cleanDbLevel = "";
    if (reqLevel && reqLevel !== "all") {
      if (reqLevel === "Tiểu học") cleanDbLevel = "tieu hoc";
      else if (reqLevel === "THCS") cleanDbLevel = "thcs";
      else if (reqLevel === "THPT") cleanDbLevel = "thpt";
      else if (reqLevel === "Mầm non") cleanDbLevel = "mam non";
      else cleanDbLevel = reqLevel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

    const numGrade = reqGrade ? reqGrade.replace(/Khối\s+/gi, "").replace(/Khoi\s+/gi, "").trim() : "";

    return classes.filter((c: any) => {
      if (reqCampusId && reqCampusId !== "all" && c.campusId !== reqCampusId) return false;

      if (cleanDbLevel && cleanDbLevel !== "pho thong k-12") {
        const cLevelClean = (c.level || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        if (cLevelClean !== cleanDbLevel) return false;
      }

      if (!reqGrade || reqGrade === "all") return true;

      if (cleanDbLevel === "mam non") {
        const cleanCGrade = (c.grade || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const cleanNGrade = reqGrade.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return cleanCGrade === cleanNGrade || cleanCGrade.includes(cleanNGrade) || cleanNGrade.includes(cleanCGrade);
      }

      const cGradeNum = (c.grade || "").replace(/Khối\s+/gi, "").replace(/Khoi\s+/gi, "").trim();
      return cGradeNum === numGrade || (c.grade || "").trim() === numGrade || cGradeNum.startsWith(numGrade + ".");
    });
  }, [classes, reqLevel, reqGrade, reqCampusId]);

  const filteredTeachersForRequest = useMemo(() => {
    if (!reqDeptId) return teachers;
    return teachers.filter((t: any) => t.departmentId === reqDeptId);
  }, [teachers, reqDeptId]);

  const autoSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Create form states
  const [newSubjectId, setNewSubjectId] = useState("")
  const [newSubjectName, setNewSubjectName] = useState("")
  const [newLevel, setNewLevel] = useState(isMamNonTeacher ? "Mầm non" : "")
  const [newGrade, setNewGrade] = useState("")
  const [newCampusId, setNewCampusId] = useState(currentTeacher?.campusId || "")
  const [newClassId, setNewClassId] = useState("")
  const [newClassNameText, setNewClassNameText] = useState("")
  const [newTopic, setNewTopic] = useState("")
  const [newChuDe, setNewChuDe] = useState("")
  const [newHoatDong, setNewHoatDong] = useState("")
  const [newDeTai, setNewDeTai] = useState("")
  const [newDate, setNewDate] = useState("")
  const [newStartTime, setNewStartTime] = useState("Tiết 1")
  const [newEndTime, setNewEndTime] = useState("Tiết 1")
  const [newIsDoublePeriod, setNewIsDoublePeriod] = useState(false)
  const [newDescription, setNewDescription] = useState("")
  const [newVisibility, setNewVisibility] = useState("ALL");
  const [newNotifMode, setNewNotifMode] = useState<"ALL" | "SELECTED">("ALL");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [availableDeptTeachers, setAvailableDeptTeachers] = useState<any[]>([]);
  const [newTargetDeptId, setNewTargetDeptId] = useState("")
  const [newLessonPlanName, setNewLessonPlanName] = useState("")
  const [newLessonPlanData, setNewLessonPlanData] = useState("")

  const [monthlyLimitCount, setMonthlyLimitCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [editSlotId, setEditSlotId] = useState<string | null>(null)

  // Targets
  const [selfRequiredObserved, setSelfRequiredObserved] = useState(currentTeacher?.requiredObserved || 0)
  const [selfObservedUnit, setSelfObservedUnit] = useState(currentTeacher?.observedUnit || "tháng")
  const [selfRequiredTaught, setSelfRequiredTaught] = useState(currentTeacher?.requiredTaught || 0)
  const [selfTaughtUnit, setSelfTaughtUnit] = useState(currentTeacher?.taughtUnit || "tháng")

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
    const evalSlotIdParam = searchParams.get("evalSlotId");
    if (evalSlotIdParam && slots.length > 0) {
      const targetSlot = slots.find((s: any) => s.id === evalSlotIdParam);
      if (targetSlot) {
        const myReg = targetSlot.registrations?.find((r: any) => r.teacherId === currentTeacher?.id);
        if (myReg) {
          openEvalModal(myReg, targetSlot);
        } else if (targetSlot.registrations && targetSlot.registrations.length > 0) {
          openEvalModal(targetSlot.registrations[0], targetSlot);
        }
      }
    }
  }, [searchParams, slots, currentTeacher]);

  useEffect(() => {
    setSlots(initialSlots)
  }, [initialSlots])

  useEffect(() => {
    if (newDate) {
      getCreatedCountInMonth(newDate).then(res => { if (res.success) setMonthlyLimitCount(res.count) })
    }
  }, [newDate])

  useEffect(() => {
    if (isMamNonTeacher) {
      setNewLevel("Mầm non");
    }
  }, [isMamNonTeacher])

  const openHistoryModal = (slot: any) => {
    setHistorySlot(slot);
    setShowHistoryModal(true);
  };

  const resetCreateForm = () => {
    setEditSlotId(null);
    setNewCampusId(currentTeacher?.campusId || "");
    setNewSubjectId(""); setNewSubjectName(""); setNewLevel(isMamNonTeacher ? "Mầm non" : ""); setNewGrade(""); setNewClassId("");
    setNewClassNameText(""); setNewTopic(""); setNewDate(""); setNewStartTime("Tiết 1"); setNewEndTime("Tiết 1");
    setNewIsDoublePeriod(false); setNewDescription(""); setNewVisibility("ALL"); setNewTargetDeptId(""); setNewNotifMode("ALL"); setSelectedMemberIds([]); setSendEmailNotif(false);
    setNewLessonPlanName(""); setNewLessonPlanData("");
    setNewChuDe(""); setNewHoatDong(""); setNewDeTai("");
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
    if (slot.level === "Mầm non") {
      const parts = (slot.subjectName || "").split(" | ");
      setNewChuDe(parts[0] || "");
      setNewHoatDong(parts[1] || "");
      setNewDeTai(slot.topic || "");
    } else {
      setNewChuDe("");
      setNewHoatDong("");
      setNewDeTai("");
    }
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

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const periodOptions = ["Tiết 1","Tiết 2","Tiết 3","Tiết 4","Tiết 5","Tiết 6","Tiết 7","Tiết 8"]

  const getGradesForLevel = (level: string) => {
    switch (level) {
      case "Mầm non": return mamNonGrades.length > 0 ? mamNonGrades : ["Nhà trẻ 24-36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"]
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
    if (!newLevel) return [];
    const effectiveCampusId = newCampusId || currentTeacher?.campusId || "";

    let cleanDbLevel = "";
    if (newLevel === "Tiểu học") cleanDbLevel = "tieu hoc";
    else if (newLevel === "THCS") cleanDbLevel = "thcs";
    else if (newLevel === "THPT") cleanDbLevel = "thpt";
    else if (newLevel === "Mầm non") cleanDbLevel = "mam non";
    else cleanDbLevel = newLevel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const numGrade = newGrade ? newGrade.replace(/Khối\s+/gi, "").replace(/Khoi\s+/gi, "").trim() : "";

    return classes.filter(c => {
      if (effectiveCampusId && c.campusId !== effectiveCampusId) return false;

      if (cleanDbLevel && cleanDbLevel !== "pho thong k-12") {
        const cLevelClean = (c.level || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        if (cLevelClean !== cleanDbLevel) return false;
      }

      if (!newGrade || newGrade === "all") return true;

      if (cleanDbLevel === "mam non") {
        const cleanCGrade = (c.grade || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const cleanNGrade = newGrade.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return cleanCGrade === cleanNGrade || cleanCGrade.includes(cleanNGrade) || cleanNGrade.includes(cleanCGrade);
      }

      const cGradeNum = (c.grade || "").replace(/Khối\s+/gi, "").replace(/Khoi\s+/gi, "").trim();
      return cGradeNum === numGrade || (c.grade || "").trim() === numGrade || cGradeNum.startsWith(numGrade + ".");
    });
  }, [classes, newCampusId, currentTeacher?.campusId, newLevel, newGrade]);

  const mamNonGrades = useMemo(() => {
    const effectiveCampusId = newCampusId || reqCampusId || currentTeacher?.campusId || "";
    const gradeSet = new Set<string>();
    classes.forEach((cls: any) => {
      if (effectiveCampusId && cls.campusId !== effectiveCampusId) return;
      const lvlClean = (cls.level || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (lvlClean !== "mam non") return;
      if (cls.grade) gradeSet.add(cls.grade);
    });
    const ORDER = ["Nhà trẻ 24-36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"];
    return [...gradeSet].sort((a, b) => {
      const idxA = ORDER.indexOf(a);
      const idxB = ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, "vi");
    });
  }, [classes, newCampusId, reqCampusId, currentTeacher?.campusId]);

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

  const handleSearch = useCallback(async () => {
    const params = new URLSearchParams(window.location.search)
    if (filterSchoolBlock && filterSchoolBlock !== "all") params.set("schoolBlock", filterSchoolBlock); else params.delete("schoolBlock")
    if (filterCampusId && filterCampusId !== "all") params.set("campusId", filterCampusId); else params.delete("campusId")
    if (filterDeptId && filterDeptId !== "all") params.set("deptId", filterDeptId); else params.delete("deptId")
    if (filterLevel && filterLevel !== "all") params.set("level", filterLevel); else params.delete("level")
    if (filterGrade && filterGrade !== "all") params.set("grade", filterGrade); else params.delete("grade")
    if (filterClassId && filterClassId !== "all") params.set("classId", filterClassId); else params.delete("classId")
    if (filterDate) params.set("date", filterDate); else params.delete("date")
    if (filterPeriod && filterPeriod !== "all") params.set("period", filterPeriod); else params.delete("period")
    
    setIsSearching(true)
    try {
      router.push(`${pathname}?${params.toString()}`)
      const res = await getObservationSlots({ 
        schoolBlock: filterSchoolBlock, 
        campusId: filterCampusId, 
        deptId: filterDeptId, 
        level: filterLevel, 
        grade: filterGrade, 
        classId: filterClassId, 
        period: filterPeriod, 
        date: filterDate,
        academicYearId: filterAcademicYearId
      })
      if (res.success && res.slots) { setSlots(res.slots) }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSearching(false)
    }
  }, [filterSchoolBlock, filterCampusId, filterDeptId, filterLevel, filterGrade, filterClassId, filterPeriod, filterDate, filterAcademicYearId, router, pathname])

  useEffect(() => {
    if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current)
    autoSearchTimerRef.current = setTimeout(() => {
      handleSearch()
    }, 400)
    return () => { if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current) }
  }, [filterSchoolBlock, filterCampusId, filterDeptId, filterLevel, filterGrade, filterClassId, filterPeriod, filterDate, handleSearch])

  const filterAvailableClasses = useMemo(() => {
    return classes.filter(c => {
      if (filterCampusId && filterCampusId !== "all" && c.campusId !== filterCampusId) return false;
      if (filterLevel && filterLevel !== "all") {
        let cleanLevel = filterLevel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        if (filterLevel === "Tiểu học") cleanLevel = "tieu hoc";
        else if (filterLevel === "THCS") cleanLevel = "thcs";
        else if (filterLevel === "THPT") cleanLevel = "thpt";
        else if (filterLevel === "Mầm non") cleanLevel = "mam non";
        if (cleanLevel !== "pho thong k-12") {
          const cLevelClean = (c.level || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          if (cLevelClean && cLevelClean !== cleanLevel) return false;
        }
      }
      if (filterGrade && filterGrade !== "all") {
        const cGradeClean = (c.grade || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const fGradeClean = filterGrade.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const fGradeNum = filterGrade.replace(/Khối\s+/gi, "").replace(/Khoi\s+/gi, "").trim();
        if (cGradeClean !== fGradeClean && !cGradeClean.includes(fGradeClean) && !fGradeClean.includes(cGradeClean)) {
          if (!cGradeClean.endsWith(fGradeNum) && cGradeClean !== fGradeNum) return false;
        }
      }
      return true;
    });
  }, [classes, filterCampusId, filterLevel, filterGrade]);

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filterCampusId && filterCampusId !== "all") count++
    if (filterDeptId && filterDeptId !== "all") count++
    if (filterLevel && filterLevel !== "all") count++
    if (filterGrade && filterGrade !== "all") count++
    if (filterClassId && filterClassId !== "all") count++
    if (filterDate) count++
    if (filterPeriod && filterPeriod !== "all") count++
    return count
  }, [filterCampusId, filterDeptId, filterLevel, filterGrade, filterClassId, filterDate, filterPeriod])

  const activeFilterTags = useMemo(() => {
    const tags: { key: string; label: string; value: string; onRemove: () => void }[] = []
    if (filterCampusId && filterCampusId !== "all") {
      const campus = campuses.find(c => c.id === filterCampusId)
      tags.push({ key: "campus", label: "Cơ sở", value: campus?.campusName || filterCampusId, onRemove: () => { setFilterCampusId("all"); setFilterClassId("all"); } })
    }
    if (filterDeptId && filterDeptId !== "all") {
      const dept = departments.find(d => d.id === filterDeptId)
      tags.push({ key: "dept", label: "Tổ CM", value: dept?.name || filterDeptId, onRemove: () => setFilterDeptId("all") })
    }
    if (filterLevel && filterLevel !== "all") {
      tags.push({ key: "level", label: "Bậc học", value: filterLevel, onRemove: () => { setFilterLevel("all"); setFilterGrade("all"); setFilterClassId("all"); } })
    }
    if (filterGrade && filterGrade !== "all") {
      tags.push({ key: "grade", label: "Khối", value: filterGrade, onRemove: () => { setFilterGrade("all"); setFilterClassId("all"); } })
    }
    if (filterClassId && filterClassId !== "all") {
      const cls = classes.find(c => c.id === filterClassId || c.className === filterClassId)
      tags.push({ key: "class", label: "Lớp", value: cls?.className || filterClassId, onRemove: () => setFilterClassId("all") })
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
  }, [filterCampusId, filterDeptId, filterLevel, filterGrade, filterClassId, filterDate, filterPeriod, campuses, departments, classes])

  const clearAllFilters = () => {
    setFilterCampusId("all")
    setFilterDeptId("all")
    setFilterLevel("all")
    setFilterGrade("all")
    setFilterClassId("all")
    setFilterDate("")
    setFilterPeriod("all")
    setFilterSchoolBlock("all")
  }

  const refreshSlots = async () => {
    const res = await getObservationSlots({ 
      schoolBlock: filterSchoolBlock, 
      campusId: filterCampusId, 
      deptId: filterDeptId, 
      level: filterLevel, 
      grade: filterGrade, 
      classId: filterClassId, 
      period: filterPeriod, 
      date: filterDate,
      academicYearId: filterAcademicYearId
    })
    if (res.success && res.slots) setSlots(res.slots)
  }

  const handleRegister = async (slotId: string) => {
    setRegisterDetailSlot(null)
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
    const slot = slots.find(s => s.id === slotId);
    if (slot && slot.registrations && slot.registrations.length > 0) {
      showToast("Không thể xóa tiết dạy đã có giáo viên đăng ký!", "error");
      return;
    }
    if (!confirm("Thầy/Cô có chắc chắn muốn xóa tiết dạy dự giờ này?")) return
    startTransition(async () => {
      const res = await deleteObservationSlot(slotId)
      if (res.success) { showToast("Đã xóa tiết dạy thành công!", "info"); refreshSlots() }
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
    const isMN = slot.level === "Mầm non";
    if (registration.evaluation) {
      let parsedScores = Array(18).fill(0);
      let actualGeneralComment = registration.evaluation.generalComment || "";
      
      if (isMN) {
        try {
          const parsed = JSON.parse(registration.evaluation.generalComment);
          if (parsed && Array.isArray(parsed.scores)) {
            parsedScores = parsed.scores;
            actualGeneralComment = parsed.text || "";
          }
        } catch (e) {
          parsedScores = [
            registration.evaluation.criterion1 || 0,
            registration.evaluation.criterion2 || 0,
            registration.evaluation.criterion3 || 0,
            registration.evaluation.criterion4 || 0,
            registration.evaluation.criterion5 || 0,
            ...Array(13).fill(0)
          ];
        }
      } else {
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
        ]);
      }
      
      setEvalCriteria(isMN ? parsedScores : [0, 0, 0, 0, 0]);
      setEvalStrengths(registration.evaluation.strengths || "");
      setEvalImprovements(registration.evaluation.improvements || "");
      setEvalGeneral(actualGeneralComment);
      setEvalOverall(registration.evaluation.overallRating || "");
    } else {
      setEvalCriteria(isMN ? Array(18).fill(0) : [0, 0, 0, 0, 0]);
      setEvalK12Scores([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      setEvalStrengths("");
      setEvalImprovements("");
      setEvalGeneral("");
      setEvalOverall("");
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

    if (sum >= 17 && yq1 === 1.5 && yq3 === 2.0 && yq6 === 2.0 && yq7 === 3.0 && checkOthersAtLeast50Percent([0, 2, 5, 6])) {
      return "Giỏi"
    }
    if (sum >= 14 && yq3 >= 2.0 && yq6 >= 2.0 && yq7 >= 2.0 && checkOthersAtLeast50Percent([2, 5, 6])) {
      return "Khá"
    }
    if (sum >= 12 && yq3 >= 1.0 && yq6 >= 1.0 && yq7 >= 1.0 && scores.every(s => s > 0)) {
      return "Trung bình"
    }
    return "Không xếp loại"
  }

  const handleSubmitEval = async () => {
    if (!evalModal) return
    const isK12 = evalModal.slot.level !== "Mầm non"
    
    const payload: any = {
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
      if (evalCriteria.length < 18 || evalCriteria.some(c => c === undefined || c === null)) {
        showToast("Vui lòng đánh giá đầy đủ 18 yêu cầu!", "error");
        return;
      }
      const sum = evalCriteria.reduce((a, b) => a + b, 0);
      payload.totalScore = sum;
      payload.generalComment = JSON.stringify({
        scores: evalCriteria,
        text: evalGeneral
      });
      payload.criterion1 = Math.round(evalCriteria[0]);
      payload.criterion2 = Math.round(evalCriteria[1]);
      payload.criterion3 = Math.round(evalCriteria[2]);
      payload.criterion4 = Math.round(evalCriteria[3]);
      payload.criterion5 = Math.round(evalCriteria[4]);
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

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reqTeacherId) {
      showToast("Vui lòng chọn Giáo viên dạy!", "error")
      return
    }
    if (!reqDate) {
      showToast("Vui lòng chọn ngày dạy!", "error")
      return
    }

    const selectedClass = classes.find(c => c.id === reqClassId)
    const selectedSub = subjects.find(s => s.id === reqSubjectId)

    setSubmitting(true)
    startTransition(async () => {
      const res = await requestObservationSlot({
        targetTeacherId: reqTeacherId,
        targetDeptId: reqDeptId,
        classId: reqClassId,
        className: selectedClass ? selectedClass.className : undefined,
        level: reqLevel || (selectedClass ? selectedClass.level : "ALL"),
        grade: reqGrade || (selectedClass ? selectedClass.grade : "Khối"),
        subjectId: reqSubjectId,
        subjectName: selectedSub ? selectedSub.subjectName : "Môn học",
        topic: reqTopic || "Yêu cầu dự giờ",
        date: reqDate,
        period: reqPeriod,
        notes: reqNotes,
        academicYearId: filterAcademicYearId
      })
      setSubmitting(false)
      if (res.success) {
        showToast("Đã gửi yêu cầu xin dự giờ thành công! Chờ GV dạy xác nhận.", "success")
        setReqTeacherId("")
        setReqTopic("")
        setReqNotes("")
        setReqDate("")
        refreshSlots()
      } else {
        showToast(res.error || "Không thể gửi yêu cầu!", "error")
      }
    })
  }

  const handleRespondRequest = async (slotId: string, accept: boolean, reason?: string) => {
    setSubmitting(true)
    startTransition(async () => {
      const res = await respondToObservationRequest(slotId, accept, reason)
      setSubmitting(false)
      if (res.success) {
        showToast(accept ? "Đã xác nhận & đồng ý cho dự giờ!" : "Đã từ chối yêu cầu dự giờ.", accept ? "success" : "info")
        setDecliningSlotId(null)
        setDeclineReason("")
        refreshSlots()
      } else {
        showToast(res.error || "Thao tác thất bại!", "error")
      }
    })
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const isMN = isMamNonTeacher || newLevel === "Mầm non";
    if (isMN) {
      if (!newGrade || !newChuDe.trim() || !newHoatDong.trim() || !newDeTai.trim() || !newDate || !newStartTime || !newEndTime || !newCampusId) {
        showToast("Vui lòng điền đầy đủ các thông tin bắt buộc (*)", "error"); return
      }
    } else {
      if (!newLevel || !newGrade || !newTopic || !newDate || !newStartTime || !newEndTime || !newCampusId) {
        showToast("Vui lòng điền đầy đủ các thông tin bắt buộc (*)", "error"); return
      }
      if (!newSubjectId) { showToast("Vui lòng chọn môn học!", "error"); return }
      if (newSubjectId === "other" && !newSubjectName.trim()) { showToast("Vui lòng nhập tên môn học khác!", "error"); return }
    }
    setSubmitting(true)
    const selectedSub = subjects.find(s => s.id === newSubjectId)
    const subName = isMN ? `${newChuDe} | ${newHoatDong}` : (selectedSub ? selectedSub.subjectName : newSubjectName || "Khác")
    const topicText = isMN ? newDeTai : newTopic
    const selectedCampus = campuses.find(c => c.id === newCampusId)
    const campusNameStr = selectedCampus ? selectedCampus.campusName : ""
    let classNameStr = newClassNameText
    if (newClassId && newClassId !== "other") { const selClass = classes.find(c => c.id === newClassId); if (selClass) classNameStr = selClass.className }
    let res;
    if (editSlotId) {
      res = await updateObservationSlot(editSlotId, {
        subjectId: (!isMN && newSubjectId && newSubjectId !== "other") ? newSubjectId : undefined,
        subjectName: subName, level: isMN ? "Mầm non" : newLevel, grade: newGrade, topic: topicText, date: newDate,
        startTime: newStartTime, endTime: newEndTime, isDoublePeriod: newIsDoublePeriod,
        room: classNameStr, description: newDescription, visibilityType: newVisibility,
        sendEmailNotif: sendEmailNotif,
        notifMode: "SELECTED",
        selectedMemberIds: selectedEmailTeacherIds,
        targetDeptId: newVisibility === "DEPARTMENT" ? newTargetDeptId : undefined,
        campusId: newCampusId, campusName: campusNameStr,
        classId: (newClassId && newClassId !== "other") ? newClassId : undefined,
        className: classNameStr,
        lessonPlanName: newLessonPlanName || undefined, lessonPlanData: newLessonPlanData || undefined
      });
    } else {
      res = await createObservationSlot({
        subjectId: (!isMN && newSubjectId && newSubjectId !== "other") ? newSubjectId : undefined,
        subjectName: subName, level: isMN ? "Mầm non" : newLevel, grade: newGrade, topic: topicText, date: newDate,
        startTime: newStartTime, endTime: newEndTime, isDoublePeriod: newIsDoublePeriod,
        room: classNameStr, description: newDescription, visibilityType: newVisibility,
        sendEmailNotif: sendEmailNotif,
        notifMode: "SELECTED",
        selectedMemberIds: selectedEmailTeacherIds,
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
      resetCreateForm()
      refreshSlots()
    } else {
      showToast(res.error || "Lỗi tạo tiết dạy!", "error")
    }
  }

  const monthlyStats = useMemo(() => {
    const stats: Record<string, { monthStr: string; year: number; month: number; taughtCount: number; observedCount: number }> = {};
    slots.forEach(slot => {
      const slotDate = new Date(slot.date);
      if (isNaN(slotDate.getTime())) return;
      const year = slotDate.getFullYear();
      const month = slotDate.getMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, "0")}`;
      
      const isHost = slot.teacherId === currentTeacher?.id;
      const isObserverApproved = slot.registrations.some((r: any) => r.teacherId === currentTeacher?.id && r.isApproved);
      
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
        const approvedRegs = slot.registrations.filter((r: any) => r.isApproved);
        const allEvaluated = approvedRegs.length > 0 && approvedRegs.every((r: any) => !!r.evaluation);
        if (allEvaluated) {
          stats[key].taughtCount += countWeight;
        }
      }
      if (isObserverApproved) {
        const myReg = slot.registrations.find((r: any) => r.teacherId === currentTeacher?.id && r.isApproved);
        if (myReg && myReg.evaluation) {
          stats[key].observedCount += countWeight;
        }
      }
    });
    
    return Object.values(stats).sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
  }, [slots, currentTeacher?.id]);

  const receivedEvaluations = useMemo(() => {
    const list: any[] = [];
    slots.forEach(slot => {
      if (slot.teacherId === currentTeacher?.id) {
        slot.registrations.forEach((reg: any) => {
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
  }, [slots, currentTeacher?.id]);

  const tabFilteredSlots = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return slots.filter(slot => {
      const isHost = slot.teacherId === currentTeacher?.id;
      const isObserver = slot.registrations.some((r: any) => r.teacherId === currentTeacher?.id);
      
      if (activeStatusTab === "gbm_request") {
        if (slot.requestOrigin !== "OBSERVER_REQUEST") return false;
      } else {
        if (isHost || isObserver) return false;

        const slotDate = new Date(slot.date);
        const isExpired = slotDate < todayStart || slot.status === "EXPIRED";
        if (activeStatusTab === "new" && isExpired) return false;
        if (activeStatusTab === "expired" && !isExpired) return false;
      }

      const isMyDept = checkIsMyDept(slot);
      if (activeDeptTab !== "all") {
        if (activeDeptTab === "my-dept" && !isMyDept) return false;
        if (activeDeptTab === "other-dept") {
          if (isMyDept) return false;
          const slotIsMamNon = slot.level === "Mầm non" || 
                               (slot.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");
          if (isMamNonTeacher) {
            if (!slotIsMamNon) return false;
          } else {
            if (slotIsMamNon) return false;
          }
        }
      }
      return true;
    });
  }, [slots, currentTeacher?.id, activeDeptTab, activeStatusTab, isMamNonTeacher, checkIsMyDept]);

  const myTaughtSlots = useMemo(() => {
    return slots.filter(slot => slot.teacherId === currentTeacher?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [slots, currentTeacher?.id]);

  const myObservedSlots = useMemo(() => {
    return slots.filter(slot => slot.registrations.some((r: any) => r.teacherId === currentTeacher?.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [slots, currentTeacher?.id]);

  const myObservedCount = useMemo(() => {
    let count = 0;
    slots.forEach(slot => {
      const reg = slot.registrations.find((r: any) => r.teacherId === currentTeacher?.id && r.isApproved && r.evaluation);
      if (reg) count += (slot.isDoublePeriod ? 2 : 1);
    });
    return count;
  }, [slots, currentTeacher?.id]);

  const myTaughtCount = useMemo(() => {
    let count = 0;
    slots.forEach(slot => {
      if (slot.teacherId === currentTeacher?.id) {
        const approvedRegs = slot.registrations.filter((r: any) => r.isApproved);
        if (approvedRegs.length > 0 && approvedRegs.every((r: any) => !!r.evaluation)) {
          count += (slot.isDoublePeriod ? 2 : 1);
        }
      }
    });
    return count;
  }, [slots, currentTeacher?.id]);

  const obsTarget = selfRequiredObserved || 0;
  const taughtTarget = selfRequiredTaught || 0;

  const obsProgress = obsTarget > 0 ? Math.min(100, Math.round((myObservedCount / obsTarget) * 100)) : 0;
  const taughtProgress = taughtTarget > 0 ? Math.min(100, Math.round((myTaughtCount / (taughtTarget || 1)) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6 relative pb-16 text-slate-800 bg-[#F8FAFC] min-h-screen p-2 sm:p-4 md:p-6 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border border-white/20 text-white animate-in slide-in-from-top duration-300 ${toast.type === "success" ? "bg-emerald-600 shadow-emerald-600/30" : toast.type === "error" ? "bg-rose-600 shadow-rose-600/30" : "bg-[#008B82] shadow-teal-700/30"}`}>
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 shrink-0" />}
          {toast.type === "info" && <Info className="w-5 h-5 shrink-0" />}
          <span className="text-xs sm:text-sm font-bold tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* Top Header Hero Bar */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#002D2B] via-[#004D47] to-[#007068] p-6 sm:p-8 text-white shadow-xl shadow-teal-950/10 border border-teal-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-[#48BFE3]/20 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/15 text-emerald-200 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>SKY-LINE SYSTEM • ĐÁNH GIÁ CHUYÊN MÔN</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Dự giờ đánh giá Giáo viên
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
              Phân hệ quản trị tiết dạy, đăng ký dự giờ trực tuyến, theo dõi chỉ tiêu chuyên môn và thực hiện phiếu đánh giá chuẩn mực Sky-Line.
            </p>
          </div>

          {/* Teacher Profile & Year Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            {academicYears && academicYears.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 shadow-inner">
                <span className="text-[10px] font-bold uppercase text-emerald-200 block mb-0.5">Năm học:</span>
                <select
                  value={filterAcademicYearId}
                  onChange={e => handleAcademicYearChange(e.target.value)}
                  className="bg-transparent text-xs font-black text-white outline-none cursor-pointer pr-2"
                >
                  {academicYears.map(y => (
                    <option key={y.id} value={y.id} className="text-slate-800 font-semibold">{y.name} {y.status === "ACTIVE" ? "(Hiện tại)" : ""}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3.5 bg-white/15 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 shadow-lg">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getAvatarGradient(currentTeacher?.teacherName || "G")} text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-white/40`}>
                {currentTeacher?.teacherName?.charAt(0) || "G"}
              </div>
              <div className="text-left space-y-0.5">
                <span className="block text-sm font-black tracking-wide text-white">{currentTeacher?.teacherName}</span>
                {currentTeacher?.position ? (
                  <span className="inline-block text-[10px] font-black bg-emerald-400/25 text-emerald-100 border border-emerald-300/40 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {currentTeacher?.position}
                  </span>
                ) : (
                  <span className="block text-xs font-medium text-emerald-100/80">Giáo viên</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD OVERVIEW: 3 KPI Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Observation Target */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md p-6 flex flex-col justify-between gap-4 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-400/15 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shadow-2xs">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Chỉ tiêu dự giờ</h4>
                <p className="text-xs font-bold text-slate-600">Đơn vị: tiết / {selfObservedUnit}</p>
              </div>
            </div>
            <span className="text-xs font-black text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200/60 shadow-2xs">
              {obsProgress}% Hoàn thành
            </span>
          </div>

          <div className="my-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{myObservedCount}</span>
              <span className="text-slate-400 font-bold text-sm">/ {obsTarget} tiết</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full transition-all duration-700 shadow-xs" 
                style={{ width: `${obsProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Đã nộp phiếu chấm</span>
              <span className={obsTarget - myObservedCount > 0 ? "text-amber-600 font-extrabold" : "text-emerald-600 font-extrabold"}>
                {obsTarget - myObservedCount > 0 ? `Còn thiếu ${obsTarget - myObservedCount} tiết` : "🎉 Đã đạt mục tiêu!"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Taught Target */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md p-6 flex flex-col justify-between gap-4 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#00A99D]/15 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 text-[#008B82] flex items-center justify-center border border-teal-100 shadow-2xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Chỉ tiêu tiết dạy</h4>
                <p className="text-xs font-bold text-slate-600">Đơn vị: tiết / {selfTaughtUnit}</p>
              </div>
            </div>
            <span className="text-xs font-black text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/60 shadow-2xs">
              {taughtProgress}% Hoàn thành
            </span>
          </div>

          <div className="my-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{myTaughtCount}</span>
              <span className="text-slate-400 font-bold text-sm">/ {taughtTarget || 1} tiết</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-[#48BFE3] to-[#008B82] rounded-full transition-all duration-700 shadow-xs" 
                style={{ width: `${taughtProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Được đánh giá đủ</span>
              <span className={taughtTarget - myTaughtCount > 0 ? "text-amber-600 font-extrabold" : "text-emerald-600 font-extrabold"}>
                {taughtTarget - myTaughtCount > 0 ? `Còn thiếu ${taughtTarget - myTaughtCount} tiết` : "🎉 Đã đạt mục tiêu!"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Monthly Breakdown & History */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md p-6 flex flex-col justify-between gap-3 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-400/15 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
          
          <div className="flex items-center gap-3 border-b border-slate-100 pb-2.5">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Hiệu suất tháng gần nhất</h4>
              <p className="text-xs font-bold text-slate-600">Thống kê số tiết hoàn thành</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-2 my-1">
            {monthlyStats.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-2">Chưa có số liệu thống kê hoàn thành.</p>
            ) : (
              monthlyStats.slice(0, 2).map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 transition-colors">
                  <span className="font-extrabold text-xs text-slate-700">{stat.monthStr}</span>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-extrabold text-xs border border-teal-200/60">
                      Dạy: {stat.taughtCount}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-violet-50 text-violet-800 font-extrabold text-xs border border-violet-200/60">
                      Dự: {stat.observedCount}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ROW 1: Action Panel (Create / Request) & Quick Register Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Panel 1: Creation & Observer Request Form */}
        <div className={`lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col gap-5 border-t-4 ${isMamNonTeacher ? "border-t-amber-500" : "border-t-[#008B82]"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/70 shadow-inner w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setCreationMode("TEACHER_OPEN")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  creationMode === "TEACHER_OPEN"
                    ? "bg-[#008B82] text-white shadow-md shadow-teal-800/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                }`}
              >
                <Plus className="w-4 h-4" />
                1. GV DẠY TỰ MỞ TIẾT
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("OBSERVER_REQUEST")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  creationMode === "OBSERVER_REQUEST"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-indigo-700 bg-indigo-50/70 border border-indigo-100 hover:bg-indigo-100"
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-500" />
                2. GVBM XIN DỰ GIỜ
              </button>
            </div>

            {creationMode === "TEACHER_OPEN" && (
              <span className={`text-xs font-extrabold px-3 py-1.5 rounded-xl self-start sm:self-auto border ${isMamNonTeacher ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-teal-50 text-[#008B82] border-teal-200/70"}`}>
                Tháng {new Date().getMonth() + 1}: {monthlyLimitCount}/2 tiết đã tạo
              </span>
            )}
          </div>

          {creationMode === "OBSERVER_REQUEST" ? (
            /* ===== FORM 2: GVBM XIN ĐĂNG KÝ DỰ GIỜ ===== */
            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4 text-xs font-semibold bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100/80">
              <div className="bg-indigo-500/10 border border-indigo-200/70 rounded-xl p-3.5 flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-indigo-950 leading-relaxed">
                  <span className="font-extrabold text-indigo-900">Đề xuất xin dự giờ:</span> Chọn Tổ chuyên môn & Giáo viên dạy, cùng Cơ sở, Khối lớp và Tiết học mong muốn. Yêu cầu sẽ được gửi tới Giáo viên dạy để xem xét phê duyệt.
                </p>
              </div>

              {/* Group 1: Tổ chuyên môn & Giáo viên dạy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">1. Chọn Tổ chuyên môn</label>
                  <select
                    value={reqDeptId}
                    onChange={e => { setReqDeptId(e.target.value); setReqTeacherId(""); }}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  >
                    <option value="">Tất cả các Tổ chuyên môn</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">2. Chọn Giáo viên dạy *</label>
                  <select
                    value={reqTeacherId}
                    onChange={e => setReqTeacherId(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  >
                    <option value="">-- Chọn Giáo viên dạy --</option>
                    {filteredTeachersForRequest.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.teacherName} {t.departmentRel?.name ? `(${t.departmentRel.name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 2: Môn học & Chủ đề/Tên bài dạy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">3. Chọn Môn học *</label>
                  <select
                    value={reqSubjectId}
                    onChange={e => setReqSubjectId(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  >
                    <option value="">-- Chọn môn học --</option>
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.subjectName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">4. Tên bài dạy / Chủ đề dự giờ *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Cấp số cộng, Sự nảy mầm của hạt..."
                    value={reqTopic}
                    onChange={e => setReqTopic(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Group 3: Cơ sở & Cấp học */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">5. Chọn Cơ sở *</label>
                  <select
                    value={reqCampusId}
                    onChange={e => { setReqCampusId(e.target.value); setReqClassId(""); }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  >
                    <option value="">-- Chọn cơ sở --</option>
                    {campuses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.campusName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">6. Chọn Cấp học *</label>
                  <select
                    value={reqLevel}
                    onChange={e => { setReqLevel(e.target.value); setReqGrade(""); setReqClassId(""); }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  >
                    <option value="">-- Chọn cấp học --</option>
                    <option value="Mầm non">Mầm non</option>
                    <option value="Tiểu học">Tiểu học</option>
                    <option value="THCS">THCS</option>
                    <option value="THPT">THPT</option>
                  </select>
                </div>
              </div>

              {/* Group 4: Khối & Lớp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">7. Chọn Khối lớp *</label>
                  <select
                    value={reqGrade}
                    onChange={e => { setReqGrade(e.target.value); setReqClassId(""); }}
                    required
                    disabled={!reqLevel}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800 disabled:opacity-50"
                  >
                    <option value="">-- Chọn khối học --</option>
                    {getGradesForLevel(reqLevel).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">8. Chọn Lớp học *</label>
                  <select
                    value={reqClassId}
                    onChange={e => {
                      const selectedId = e.target.value;
                      setReqClassId(selectedId);
                      if (selectedId) {
                        const selClass = classes.find((c: any) => c.id === selectedId);
                        if (selClass && selClass.campusId && !reqCampusId) {
                          setReqCampusId(selClass.campusId);
                        }
                      }
                    }}
                    required
                    disabled={!reqGrade}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800 disabled:opacity-50"
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {filteredReqClasses.map((c: any) => {
                      const campusObj = campuses.find((cp: any) => cp.id === c.campusId);
                      const campusLabel = campusObj ? campusObj.campusName : "";
                      return (
                        <option key={c.id} value={c.id}>
                          {c.className} {campusLabel ? `(${campusLabel})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Group 5: Tiết & Ngày */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">9. Tiết học dự *</label>
                  <select
                    value={reqPeriod}
                    onChange={e => setReqPeriod(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  >
                    {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">10. Ngày dạy dự kiến *</label>
                  <input
                    type="date"
                    value={reqDate}
                    onChange={e => setReqDate(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">11. Ghi chú / Lời nhắn tới GV dạy</label>
                <textarea
                  placeholder="Ghi chú thêm về nội dung bài dạy cần quan sát, yêu cầu hỗ trợ..."
                  rows={2}
                  value={reqNotes}
                  onChange={e => setReqNotes(e.target.value)}
                  className="w-full text-xs font-medium p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-800 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-extrabold rounded-xl transition-all shadow-md shadow-indigo-600/20 text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Đang gửi đề xuất..." : "Gửi Đề xuất Xin Dự Giờ"}
              </button>
            </form>
          ) : (
            /* ===== FORM 1: GV DẠY TỰ MỞ TIẾT DẠY ===== */
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 text-xs">
              {isMamNonTeacher ? (
                /* ===== MẦM NON FORM ===== */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-amber-900 uppercase tracking-wide">Chủ đề bài dạy *</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Thế giới động vật, Gia đình..."
                      value={newChuDe}
                      onChange={e => setNewChuDe(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200 bg-amber-50/20 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-amber-900 uppercase tracking-wide">Hoạt động *</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Âm nhạc, Tạo hình, KPKH..."
                      value={newHoatDong}
                      onChange={e => setNewHoatDong(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200 bg-amber-50/20 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-amber-900 uppercase tracking-wide">Đề tài *</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Bé yêu các con vật..."
                      value={newDeTai}
                      onChange={e => setNewDeTai(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200 bg-amber-50/20 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-amber-900 uppercase tracking-wide">Cơ sở *</label>
                    <select
                      value={newCampusId}
                      onChange={e => { setNewCampusId(e.target.value); setNewClassId(""); }}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                    >
                      <option value="">Chọn cơ sở</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-amber-900 uppercase tracking-wide">Khối học *</label>
                    <select
                      value={newGrade}
                      onChange={e => { setNewGrade(e.target.value); setNewClassId(""); }}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                    >
                      <option value="">Chọn khối học</option>
                      {mamNonGrades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-amber-900 uppercase tracking-wide">Tên lớp *</label>
                    <select
                      value={newClassId}
                      onChange={e => setNewClassId(e.target.value)}
                      required
                      disabled={!newCampusId || !newGrade}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-800 disabled:opacity-50"
                    >
                      <option value="">Chọn tên lớp</option>
                      {filteredClassesForCreation.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Ngày dạy *</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none bg-white text-slate-800"
                    />
                  </div>
                </div>
              ) : (
                /* ===== K-12 FORM ===== */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Cấp học *</label>
                    <select
                      value={newLevel}
                      onChange={e => { setNewLevel(e.target.value); setNewGrade(""); setNewClassId(""); }}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200/90 focus:border-[#008B82] focus:ring-2 focus:ring-teal-500/20 outline-none bg-white text-slate-800"
                    >
                      <option value="">Chọn cấp học</option>
                      <option value="Mầm non">Mầm non</option>
                      <option value="Tiểu học">Tiểu học</option>
                      <option value="THCS">THCS</option>
                      <option value="THPT">THPT</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Khối lớp *</label>
                    <select
                      value={newGrade}
                      onChange={e => { setNewGrade(e.target.value); setNewClassId(""); }}
                      required
                      disabled={!newLevel}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200/90 focus:border-[#008B82] focus:ring-2 focus:ring-teal-500/20 outline-none bg-white text-slate-800 disabled:opacity-50"
                    >
                      <option value="">Chọn khối lớp</option>
                      {getGradesForLevel(newLevel).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Môn học *</label>
                    <select
                      value={newSubjectId}
                      onChange={e => setNewSubjectId(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200/90 focus:border-[#008B82] focus:ring-2 focus:ring-teal-500/20 outline-none bg-white text-slate-800"
                    >
                      <option value="">Chọn môn học</option>
                      {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.subjectName}</option>)}
                      <option value="other">Môn học khác / Chuyên đề</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Cơ sở *</label>
                    <select
                      value={newCampusId}
                      onChange={e => { setNewCampusId(e.target.value); setNewClassId(""); }}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200/90 focus:border-[#008B82] focus:ring-2 focus:ring-teal-500/20 outline-none bg-white text-slate-800"
                    >
                      <option value="">Chọn cơ sở</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Lớp học *</label>
                    <select
                      value={newClassId}
                      onChange={e => setNewClassId(e.target.value)}
                      required
                      disabled={!newCampusId || !newLevel || !newGrade}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200/90 focus:border-[#008B82] focus:ring-2 focus:ring-teal-500/20 outline-none bg-white text-slate-800 disabled:opacity-50"
                    >
                      <option value="">Chọn lớp học</option>
                      {filteredClassesForCreation.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                      <option value="other">Lớp khác (Nhập tay...)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Ngày dạy *</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200/90 focus:border-[#008B82] focus:ring-2 focus:ring-teal-500/20 outline-none bg-white text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Tên bài dạy / Chủ đề *</label>
                    <input
                      type="text"
                      placeholder="Nhập tên bài dạy hoặc chủ đề tiết học..."
                      value={newTopic}
                      onChange={e => setNewTopic(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200/90 focus:border-[#008B82] focus:ring-2 focus:ring-teal-500/20 outline-none bg-white text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Time & Period Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-600 uppercase">Tiết: Từ *</label>
                  <select
                    value={newStartTime}
                    onChange={e => handleStartTimeChange(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 outline-none"
                  >
                    {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-600 uppercase">Đến *</label>
                  <select
                    value={newEndTime}
                    disabled={newIsDoublePeriod}
                    onChange={e => setNewEndTime(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 outline-none disabled:opacity-50"
                  >
                    {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-2 pb-2 pl-1">
                  <input
                    type="checkbox"
                    id="isDoublePeriod"
                    checked={newIsDoublePeriod}
                    disabled={newStartTime === "Tiết 8"}
                    onChange={e => handleDoublePeriodChange(e.target.checked)}
                    className="w-4 h-4 rounded text-[#008B82] focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="isDoublePeriod" className="text-xs font-extrabold text-slate-700 select-none cursor-pointer">
                    Dạy 2 tiết liền
                  </label>
                </div>
              </div>

              {/* PDF Upload Dropzone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-600 uppercase">Giáo án đính kèm (PDF) <span className="text-slate-400 font-normal lowercase">(không bắt buộc)</span></label>
                <div className="flex items-center gap-2">
                  <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="pdf-upload-file-inline" />
                  <label htmlFor="pdf-upload-file-inline" className="flex-1 flex items-center justify-center gap-2 bg-slate-100/80 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-all">
                    <FileText className="w-4 h-4 text-slate-500" />
                    {newLessonPlanName ? "Thay đổi File PDF..." : "Tải lên file Giáo án (.PDF)"}
                  </label>
                  {newLessonPlanName && (
                    <button type="button" onClick={() => { setNewLessonPlanName(""); setNewLessonPlanData(""); if (fileInputRef.current) fileInputRef.current.value = "" }}
                      className="p-2.5 hover:bg-rose-100 text-rose-600 transition-all rounded-xl border border-rose-200" title="Xóa file đã chọn">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {newLessonPlanName && (
                  <span className="text-xs font-bold text-teal-700 truncate block">
                    Đã chọn: <span className="underline">{newLessonPlanName}</span>
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || monthlyLimitCount >= 2}
                className="w-full mt-2 py-3 bg-[#008B82] hover:bg-[#007068] disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl transition-all shadow-md shadow-teal-800/20 text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {submitting ? "Đang lưu..." : (editSlotId ? "Cập nhật lịch dạy" : "Khởi tạo lịch dạy mới")}
              </button>
            </form>
          )}
        </div>

        {/* Panel 2: Quick Register Suggestions */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col gap-4 border-t-4 border-t-[#003B3A]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#008B82]" />
              <span className="font-black text-xs text-[#003B3A] uppercase tracking-wider">Đăng ký nhanh</span>
            </div>
            <span className="text-xs font-black bg-teal-50 text-[#008B82] px-2.5 py-0.5 rounded-full border border-teal-200/60 animate-pulse">
              ⚡ Gợi ý mới nhất
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            {(() => {
              const today = new Date();
              const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

              const suggested = slots
                .filter(s => {
                  if (s.teacherId === currentTeacher?.id) return false;
                  if (s.registrations.some((r: any) => r.teacherId === currentTeacher?.id)) return false;
                  if (s.requestOrigin === "OBSERVER_REQUEST") return false;
                  return true;
                })
                .sort((a, b) => {
                  const aDate = new Date(a.date);
                  const bDate = new Date(b.date);
                  const aIsExpired = aDate < todayStart || a.status === "EXPIRED" || a.registrations.length >= a.maxSeats;
                  const bIsExpired = bDate < todayStart || b.status === "EXPIRED" || b.registrations.length >= b.maxSeats;

                  // 1. Ưu tiên hàng đầu: Các tiết còn hạn và còn chỗ
                  if (!aIsExpired && bIsExpired) return -1;
                  if (aIsExpired && !bIsExpired) return 1;

                  // 2. Điểm tương thích theo cấp học / tổ chuyên môn / cơ sở
                  const getScore = (slot: any) => {
                    let score = 0;
                    const isSlotMamNon = slot.level === "Mầm non" ||
                      (slot.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");
                    
                    if (isMamNonTeacher) {
                      if (isSlotMamNon) {
                        score += 500;
                        const isSameDept = checkIsMyDept(slot);
                        const isSameCampus = slot.campusId === currentTeacher?.campusId;
                        if (isSameCampus && isSameDept) score += 300;
                        else if (isSameCampus) score += 200;
                        else if (isSameDept) score += 100;
                      }
                    } else {
                      if (!isSlotMamNon) {
                        score += 500;
                        const isSameDept = checkIsMyDept(slot);
                        const isSameCampus = slot.campusId === currentTeacher?.campusId;
                        if (isSameCampus && isSameDept) score += 300;
                        else if (isSameCampus) score += 200;
                        else if (isSameDept) score += 100;
                      }
                    }
                    return score;
                  };

                  const scoreDiff = getScore(b) - getScore(a);
                  if (scoreDiff !== 0) return scoreDiff;

                  // 3. Nếu cùng độ ưu tiên, sắp xếp theo thời gian mới nhất (ngày dạy hoặc ngày tạo)
                  const aTime = new Date(a.createdAt || a.date).getTime();
                  const bTime = new Date(b.createdAt || b.date).getTime();
                  return bTime - aTime;
                })
                .slice(0, 3);
              
              if (suggested.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <CheckCircle className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                    <p className="text-xs font-bold text-center">Chưa có tiết dạy dự giờ nào khả dụng.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2.5">
                  {suggested.map(slot => {
                    const slotDate = new Date(slot.date);
                    const isPastSlot = slotDate < todayStart || slot.status === "EXPIRED" || slot.registrations.length >= slot.maxSeats;
                    const isMamNon = slot.level === "Mầm non";
                    const campusDisplay = slot.campusName || slot.teacher?.campus?.campusName || (campuses.find(c => c.id === slot.campusId || c.campusCode === slot.campusId)?.campusName) || "";
                    const remainingSeats = Math.max(0, slot.maxSeats - slot.registrations.length);

                    return (
                      <div key={slot.id} className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all hover:shadow-sm ${isMamNon ? "bg-amber-50/30 hover:bg-amber-50/50 border-amber-200/70" : "bg-slate-50/70 hover:bg-teal-50/30 border-slate-200/70"}`}>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md ${isMamNon ? "bg-amber-100 text-amber-900" : "bg-teal-100/80 text-teal-800"}`}>
                              {isMamNon ? "Mầm non" : "K-12"}
                            </span>
                            <span className="text-xs font-black text-slate-700 truncate">{slot.subjectName}</span>
                            {campusDisplay && (
                              <span className="px-1.5 py-0.2 text-[10px] font-extrabold rounded-md bg-slate-200/80 text-slate-700">
                                {campusDisplay}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-900 truncate leading-snug">{slot.topic}</p>
                          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 flex-wrap">
                            <span className="text-slate-800 font-black">{slot.teacher.teacherName}</span>
                            <span>•</span>
                            <span>Lớp: {slot.className || "Chưa xếp"}</span>
                            <span>•</span>
                            <span>{slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</span>
                            <span>•</span>
                            <span className="text-teal-700 font-bold">{slot.startTime}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <button 
                            disabled={isPastSlot}
                            onClick={() => setRegisterDetailSlot(slot)}
                            className={`px-3.5 py-2 text-xs font-black uppercase rounded-xl transition-all shadow-xs shrink-0 cursor-pointer ${
                              isPastSlot
                                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                : "bg-[#008B82] hover:bg-[#007068] text-white hover:scale-105 active:scale-95"
                            }`}
                          >
                            {isPastSlot ? (slot.registrations.length >= slot.maxSeats ? "Đầy chỗ" : "Hết hạn") : "Đăng ký"}
                          </button>
                          {!isPastSlot && (
                            <span className="text-[10px] font-bold text-teal-800">Còn {remainingSeats} chỗ</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ROW 2: Danh sách tiết dạy đăng ký dự giờ (Full-width Data Table) */}
      <div className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col gap-5 border-t-4 border-t-[#003B3A]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#008B82] flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#003B3A] uppercase tracking-wider">3. Danh sách tiết dạy đăng ký dự giờ</h3>
              <p className="text-xs text-slate-400 font-medium">Tìm kiếm, lọc theo tổ chuyên môn và chọn tiết dự giờ phù hợp</p>
            </div>
            {isSearching && (
              <div className="flex items-center gap-1.5 ml-2 text-xs font-bold text-teal-600 animate-pulse">
                <div className="w-2 h-2 border border-teal-500 border-t-transparent rounded-full animate-spin" />
                <span>Đang tải...</span>
              </div>
            )}
          </div>

          {/* Status & Department Tabs */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/70 shadow-inner">
              {(() => {
                const availableSlots = slots.filter(s => s.teacherId !== currentTeacher?.id && !s.registrations.some((r: any) => r.teacherId === currentTeacher?.id));
                const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                const newCount = availableSlots.filter(s => new Date(s.date) >= todayStart && s.status !== "EXPIRED").length;
                const expiredCount = availableSlots.filter(s => new Date(s.date) < todayStart || s.status === "EXPIRED").length;
                const reqCount = slots.filter(s => s.requestOrigin === "OBSERVER_REQUEST").length;

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveStatusTab("new")}
                      className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeStatusTab === "new"
                          ? "bg-[#008B82] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                      }`}
                    >
                      <span>✨ Tiết mới ĐK</span>
                      <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-black ${activeStatusTab === "new" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                        {newCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveStatusTab("expired")}
                      className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeStatusTab === "expired"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                      }`}
                    >
                      <span>⏳ Hết hạn</span>
                      <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-black ${activeStatusTab === "expired" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800"}`}>
                        {expiredCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveStatusTab("gbm_request")}
                      className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeStatusTab === "gbm_request"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                      }`}
                    >
                      <span>📩 Xin dự giờ</span>
                      <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-black ${activeStatusTab === "gbm_request" ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-800"}`}>
                        {reqCount}
                      </span>
                    </button>
                  </>
                );
              })()}
            </div>

            {/* Department Filter Switch */}
            {(() => {
              const openSlots = slots.filter(s => s.teacherId !== currentTeacher?.id && !s.registrations.some((r: any) => r.teacherId === currentTeacher?.id));
              const myDeptCount = openSlots.filter(s => checkIsMyDept(s)).length;
              const otherDeptCount = openSlots.filter(s => !checkIsMyDept(s)).length;
              const allCount = openSlots.length;

              return (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/70 shadow-inner">
                  <button onClick={() => setActiveDeptTab("my-dept")}
                    className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${activeDeptTab === "my-dept" ? "bg-[#003B3A] text-white shadow-xs" : "text-slate-600 hover:bg-white/80"}`}>
                    <span>🏫 Thuộc TCM</span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-black ${activeDeptTab === "my-dept" ? "bg-white/20 text-white" : "bg-teal-100 text-teal-800"}`}>
                      {myDeptCount}
                    </span>
                  </button>
                  <button onClick={() => setActiveDeptTab("other-dept")}
                    className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${activeDeptTab === "other-dept" ? "bg-[#003B3A] text-white shadow-xs" : "text-slate-600 hover:bg-white/80"}`}>
                    <span>🌐 TCM khác</span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-black ${activeDeptTab === "other-dept" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                      {otherDeptCount}
                    </span>
                  </button>
                  <button onClick={() => setActiveDeptTab("all")}
                    className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${activeDeptTab === "all" ? "bg-[#003B3A] text-white shadow-xs" : "text-slate-600 hover:bg-white/80"}`}>
                    <span>⭐ Tất cả</span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-black ${activeDeptTab === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                      {allCount}
                    </span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Compact Advanced Filter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-xs font-semibold">
          {/* Cơ sở */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-slate-400 uppercase">Cơ sở</span>
            <select value={filterCampusId} onChange={e => { setFilterCampusId(e.target.value); setFilterClassId("all"); }}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none focus:border-[#008B82] focus:ring-1 focus:ring-[#008B82]">
              <option value="all">Tất cả cơ sở</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
            </select>
          </div>

          {/* Tổ chuyên môn */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-slate-400 uppercase">Tổ chuyên môn</span>
            <select value={filterDeptId} onChange={e => setFilterDeptId(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none focus:border-[#008B82] focus:ring-1 focus:ring-[#008B82]">
              <option value="all">Tất cả TCM</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* Bậc học */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-slate-400 uppercase">Bậc học</span>
            <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setFilterGrade("all"); setFilterClassId("all"); }}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none focus:border-[#008B82] focus:ring-1 focus:ring-[#008B82]">
              <option value="all">Tất cả bậc</option>
              <option value="Mầm non">Mầm non</option>
              <option value="Tiểu học">Tiểu học</option>
              <option value="THCS">THCS</option>
              <option value="THPT">THPT</option>
              <option value="Phổ thông K-12">Phổ thông K-12</option>
            </select>
          </div>

          {/* Khối lớp */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-slate-400 uppercase">Khối</span>
            <select value={filterGrade} onChange={e => { setFilterGrade(e.target.value); setFilterClassId("all"); }}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none focus:border-[#008B82] focus:ring-1 focus:ring-[#008B82]">
              <option value="all">Tất cả khối</option>
              {filterLevel !== "all" ? (
                getGradesForLevel(filterLevel).map(g => <option key={g} value={g}>{g}</option>)
              ) : (
                <>
                  <optgroup label="Tiểu học">
                    {["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5"].map(g => <option key={g} value={g}>{g}</option>)}
                  </optgroup>
                  <optgroup label="THCS">
                    {["Khối 6", "Khối 7", "Khối 8", "Khối 9"].map(g => <option key={g} value={g}>{g}</option>)}
                  </optgroup>
                  <optgroup label="THPT">
                    {["Khối 10", "Khối 11", "Khối 12"].map(g => <option key={g} value={g}>{g}</option>)}
                  </optgroup>
                  <optgroup label="Mầm non">
                    {(mamNonGrades.length > 0 ? mamNonGrades : ["Nhà trẻ 24-36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"]).map(g => <option key={g} value={g}>{g}</option>)}
                  </optgroup>
                </>
              )}
            </select>
          </div>

          {/* Lớp */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-slate-400 uppercase">Lớp</span>
            <select value={filterClassId} onChange={e => setFilterClassId(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none focus:border-[#008B82] focus:ring-1 focus:ring-[#008B82]">
              <option value="all">Tất cả lớp</option>
              {filterAvailableClasses.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
            </select>
          </div>

          {/* Ngày dạy */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-slate-400 uppercase">Ngày dạy</span>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 p-1.5 bg-white text-slate-800 outline-none focus:border-[#008B82] focus:ring-1 focus:ring-[#008B82]" />
          </div>

          {/* Tiết dạy */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-slate-400 uppercase">Tiết dạy</span>
            <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none focus:border-[#008B82] focus:ring-1 focus:ring-[#008B82]">
              <option value="all">Tất cả tiết</option>
              {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Active Filter Tags */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterTags.map(tag => (
              <span key={tag.key} className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl bg-teal-50 text-[#008B82] border border-teal-200">
                <span>{tag.label}:</span> <span className="font-black">{tag.value}</span>
                <button onClick={tag.onRemove} className="p-0.5 hover:bg-teal-200/50 rounded-full transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            <button onClick={clearAllFilters} className="text-xs font-black text-rose-500 hover:underline ml-2">
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}

        {/* Slots Table */}
        {tabFilteredSlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <Calendar className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-slate-800">Không tìm thấy tiết dạy dự giờ nào!</p>
              <p className="text-xs text-slate-400">Thay đổi bộ lọc hoặc khởi tạo thêm tiết dạy mới của bạn.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {activeStatusTab === "gbm_request" ? (
                  <tr className="bg-indigo-50/80 border-b border-indigo-100 text-indigo-900 font-black uppercase text-[11px] tracking-wider">
                    <th className="p-4 text-center w-12">TT</th>
                    <th className="p-4">GV Xin dự giờ</th>
                    <th className="p-4">GV Dạy</th>
                    <th className="p-4">Cơ sở</th>
                    <th className="p-4">Môn học</th>
                    <th className="p-4">Tên bài dạy / Chủ đề</th>
                    <th className="p-4">Lớp</th>
                    <th className="p-4">Tiết</th>
                    <th className="p-4">Ngày dạy</th>
                    <th className="p-4 text-center">Trạng thái</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                ) : (
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-wider">
                    <th className="p-4 text-center w-12">TT</th>
                    <th className="p-4">Giáo viên</th>
                    <th className="p-4">Cơ sở</th>
                    <th className="p-4">Tổ chuyên môn</th>
                    <th className="p-4">Môn học & Chủ đề</th>
                    <th className="p-4">Thời gian / Phòng</th>
                    <th className="p-4 text-center">Số chỗ</th>
                    <th className="p-4">GV Đăng ký</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Đăng ký</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                {tabFilteredSlots.map((slot, index) => {
                  const isHost = slot.teacherId === currentTeacher?.id;
                  const myReg = slot.registrations.find((r: any) => r.teacherId === currentTeacher?.id);
                  const isRegistered = !!myReg;
                  const observerCount = slot.registrations.length;
                  const slotDate = new Date(slot.date);
                  
                  const today = new Date();
                  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const isExpired = slotDate < todayStart;

                  if (activeStatusTab === "gbm_request") {
                    const observerReg = slot.registrations?.[0];
                    const observerName = observerReg?.teacher?.teacherName || observerReg?.teacherName || "GVBM";

                    return (
                      <tr key={slot.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="p-4 text-center font-black text-slate-400">{index + 1}</td>
                        <td className="p-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(observerName)} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs`}>
                              {observerName.charAt(0)}
                            </div>
                            <span className="font-black text-indigo-950">{observerName}</span>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(slot.teacher?.teacherName || "G")} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs`}>
                              {(slot.teacher?.teacherName || "G").charAt(0)}
                            </div>
                            <span className="font-black text-slate-800">{slot.teacher?.teacherName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200/80 font-bold rounded-lg text-xs inline-block shadow-2xs">
                            {slot.campusName || slot.teacher?.campus?.campusName || (campuses.find(c => c.id === slot.campusId || c.campusCode === slot.campusId)?.campusName) || "Sky-Line"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                            {slot.subjectName}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-[#003B3A]">{slot.topic}</td>
                        <td className="p-4 font-bold text-slate-700">{slot.className || "Chưa xếp"}</td>
                        <td className="p-4 font-bold text-teal-700">{slot.startTime}</td>
                        <td className="p-4 font-bold text-slate-800">
                          {slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </td>
                        <td className="p-4 text-center">
                          {slot.status === "PENDING_TEACHER_APPROVAL" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-500" />
                              Chờ duyệt
                            </span>
                          ) : slot.status === "REJECTED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                              <X className="w-3 h-3 text-rose-500" />
                              Từ chối
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-500" />
                              Đã duyệt
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {isHost && slot.status === "PENDING_TEACHER_APPROVAL" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleRespondRequest(slot.id, true)}
                                className="px-3 py-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-xs cursor-pointer"
                              >
                                Đồng ý
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRespondRequest(slot.id, false, "Giáo viên bận")}
                                className="px-3 py-1.5 text-xs font-black bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200 cursor-pointer"
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic font-medium">
                              {isHost ? "Đã phản hồi" : "Đã gửi yêu cầu"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={slot.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-center font-black text-slate-400">{index + 1}</td>
                      
                      {/* Cột GIÁO VIÊN: Hiện avatar + tên (KHÔNG hiện mã NV) */}
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(slot.teacher.teacherName)} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs`}>
                            {slot.teacher.teacherName.charAt(0)}
                          </div>
                          <span className="font-extrabold text-slate-900 text-xs tracking-tight">
                            {slot.teacher.teacherName}
                          </span>
                        </div>
                      </td>

                      {/* Cột CƠ SỞ */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 border border-teal-200/80 text-xs font-black inline-block shadow-2xs">
                          {slot.campusName || slot.teacher?.campus?.campusName || (campuses.find(c => c.id === slot.campusId || c.campusCode === slot.campusId)?.campusName) || "Sky-Line"}
                        </span>
                      </td>

                      {/* Cột TỔ CHUYÊN MÔN */}
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-extrabold inline-block shadow-2xs">
                          {slot.teacher?.departmentRel?.name || (departments.find((d: any) => d.id === slot.teacher?.departmentId)?.name) || "Chưa xếp tổ"}
                        </span>
                      </td>

                      {/* Cột MÔN HỌC & CHỦ ĐỀ */}
                      <td className="p-4">
                        {slot.level === "Mầm non" ? (() => {
                          const parts = (slot.subjectName || "").split(" | ");
                          const chuDe = parts[0] || "";
                          const hoatDong = parts[1] || "";
                          const deTai = slot.topic || "";
                          return (
                            <div className="flex flex-col gap-1 text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-amber-100 text-amber-900 border border-amber-200">Mầm non</span>
                                <span className="text-xs font-bold text-amber-950 truncate">Chủ đề: {chuDe}</span>
                              </div>
                              <p className="font-black text-amber-950 text-xs leading-snug">Đề tài: {deTai}</p>
                              <p className="text-[11px] text-slate-500 font-medium">
                                Hoạt động: <span className="text-amber-800 font-bold">{hoatDong}</span> • Lớp: {slot.className || "Chưa xếp"} {(() => {
    const campusDisplay = slot.campusName || slot.teacher?.campus?.campusName || (campuses.find(c => c.id === slot.campusId || c.campusCode === slot.campusId)?.campusName) || "";
    return campusDisplay ? `(${campusDisplay})` : "";
  })()}
                              </p>
                            </div>
                          );
                        })() : (
                          <div className="space-y-1">
                            <p className="font-black text-[#003B3A] text-xs leading-snug">{slot.topic}</p>
                            <div className="flex items-center gap-1.5 flex-wrap text-slate-500 font-medium text-[11px]">
                              <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/60 font-bold">
                                {slot.subjectName}
                              </span>
                              <span>•</span>
                              <span>Lớp {slot.className || "Chưa xếp"}</span>
                              {(() => {
                                const campusDisplay = slot.campusName || slot.teacher?.campus?.campusName || (campuses.find(c => c.id === slot.campusId || c.campusCode === slot.campusId)?.campusName) || "";
                                return campusDisplay ? (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-400 font-semibold">({campusDisplay})</span>
                                  </>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Cột THỜI GIAN / PHÒNG */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-800 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </p>
                          <p className="text-xs font-bold text-teal-700">
                            {slot.startTime} • Phòng: {slot.room || "Phòng học"}
                          </p>
                        </div>
                      </td>

                      {/* Cột SỐ CHỖ */}
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-xl text-xs font-black border ${
                          observerCount >= slot.maxSeats 
                            ? "bg-slate-100 text-slate-500 border-slate-200" 
                            : "bg-sky-50 text-sky-700 border-sky-200/70"
                        }`}>
                          {observerCount} / {slot.maxSeats}
                        </span>
                      </td>

                      {/* Cột GV ĐĂNG KÝ: Hiện avatar + tên (KHÔNG hiện mã NV) */}
                      <td className="p-4">
                        {slot.registrations && slot.registrations.length > 0 ? (
                          <div className="flex flex-col gap-1.5 max-w-[260px]">
                            {slot.registrations.map((reg: any) => {
                              const regName = reg.teacher?.teacherName || reg.teacherName || "Giáo viên";
                              return (
                                <div key={reg.id} className="flex items-center justify-between gap-2 text-xs p-1.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${getAvatarGradient(regName)} text-white flex items-center justify-center font-black text-[10px] shrink-0`}>
                                      {regName.charAt(0)}
                                    </div>
                                    <span className="font-bold text-slate-800 truncate" title={regName}>
                                      {regName}
                                    </span>
                                  </div>
                                  {reg.isApproved ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black text-[10px] uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                                      ĐÃ XÁC NHẬN
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black text-[10px] uppercase bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                      <Clock className="w-2.5 h-2.5 text-amber-600" />
                                      CHỜ DUYỆT
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa có</span>
                        )}
                      </td>

                      {/* Cột TRẠNG THÁI */}
                      <td className="p-4">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Hết hạn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Mở ĐK
                          </span>
                        )}
                      </td>

                      {/* Cột THAO TÁC / ĐĂNG KÝ */}
                      <td className="p-4 text-right">
                        {isExpired ? (
                          <button disabled className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
                            Hết hạn
                          </button>
                        ) : isRegistered ? (
                          <button onClick={() => handleCancelRegistration(myReg.id)}
                            className="px-3.5 py-1.5 text-xs font-black bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200 cursor-pointer">
                            Hủy dự
                          </button>
                        ) : (
                          <button 
                            onClick={() => setRegisterDetailSlot(slot)}
                            className="px-4 py-2 text-xs font-black uppercase rounded-xl transition-all shadow-md shadow-teal-800/15 bg-gradient-to-r from-[#008B82] to-[#007068] hover:from-[#007068] hover:to-[#005c56] text-white cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                          >
                            Đăng ký
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ROW 3: Lịch dạy & Dự giờ của tôi */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col gap-6 border-t-4 border-t-[#008B82]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#008B82] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#003B3A] uppercase tracking-wider">4. Lịch dạy & Dự giờ của tôi</h3>
              <p className="text-xs text-slate-400 font-medium">Theo dõi các tiết bạn trực tiếp giảng dạy và các tiết bạn đăng ký dự giờ</p>
            </div>
          </div>
        </div>

        {/* 4.1 TIẾT DẠY CỦA TÔI */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-l-4 border-l-amber-500 pl-3">
            <span className="font-black text-xs text-[#003B3A] uppercase tracking-wider">Tiết dạy của tôi (Tôi dạy)</span>
            <span className="px-2.5 py-0.5 text-xs font-black bg-amber-50 text-amber-800 rounded-md border border-amber-200">
              {myTaughtSlots.length} tiết
            </span>
          </div>

          {myTaughtSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <p className="text-xs font-bold text-center italic">Bạn chưa khởi tạo tiết dạy nào.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTaughtSlots.map(slot => {
                const slotDate = new Date(slot.date);
                return (
                  <div key={slot.id} className="p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all shadow-xs hover:shadow-md bg-amber-50/20 border-amber-200/80 border-l-4 border-l-amber-500">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-amber-100 text-amber-900">
                          Tôi dạy
                        </span>
                        <span className="text-xs font-extrabold text-slate-400">
                          {slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </div>

                      <div className="min-w-0">
                        {slot.level === "Mầm non" ? (
                          <div className="space-y-1 text-xs">
                            <h4 className="font-black text-amber-950 truncate leading-snug">{slot.topic}</h4>
                            <p className="text-slate-500 font-medium">Lớp: {slot.className || "Chưa xếp"} • {slot.startTime}</p>
                          </div>
                        ) : (
                          <div className="space-y-1 text-xs">
                            <h4 className="font-black text-slate-900 truncate leading-tight" title={slot.topic}>{slot.topic}</h4>
                            <p className="text-slate-500 font-medium">Môn: {slot.subjectName} • Lớp: {slot.className || "Chưa xếp"} • {slot.startTime}</p>
                          </div>
                        )}
                      </div>

                      {/* Observers Approval List */}
                      <div className="pt-2 border-t border-slate-200/70 flex flex-col gap-1.5">
                        <span className="font-black text-[#003B3A] uppercase tracking-wider text-[10px]">
                          GV Đăng ký ({slot.registrations.length}/4):
                        </span>
                        {slot.registrations.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">Chưa có GV đăng ký</span>
                        ) : (
                          <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-0.5 custom-scrollbar">
                            {slot.registrations.map((reg: any) => {
                              const regName = reg.teacher?.teacherName || "Giáo viên";
                              return (
                                <div key={reg.id} className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 gap-2 text-xs shadow-2xs">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${getAvatarGradient(regName)} text-white flex items-center justify-center font-black text-[10px] shrink-0`}>
                                      {regName.charAt(0)}
                                    </div>
                                    <p className="font-bold text-slate-800 truncate">{regName}</p>
                                  </div>
                                  <div className="shrink-0">
                                    {reg.isApproved ? (
                                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-black uppercase">Đã duyệt</span>
                                    ) : (
                                      <button 
                                        type="button"
                                        onClick={() => handleApprove(reg.id)}
                                        className="px-2.5 py-1 bg-[#008B82] hover:bg-[#007068] text-white rounded-lg text-[10px] font-black uppercase shadow-xs transition-all cursor-pointer"
                                      >
                                        Duyệt
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Slot Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
                      <button type="button" onClick={() => openEditModal(slot)}
                        className="px-3 py-1 text-slate-600 bg-white border border-slate-200 rounded-lg font-bold hover:bg-slate-50 transition-colors cursor-pointer">
                        Sửa
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="px-3 py-1 text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg font-bold transition-all cursor-pointer"
                      >
                        Hủy tiết
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <hr className="border-slate-100 my-1" />

        {/* 4.2 TIẾT TÔI ĐÃ ĐĂNG KÝ DỰ GIỜ */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-l-4 border-l-[#008B82] pl-3">
            <span className="font-black text-xs text-[#003B3A] uppercase tracking-wider">Tiết tôi dự (Đã đăng ký)</span>
            <span className="px-2.5 py-0.5 text-xs font-black bg-teal-50 text-teal-800 rounded-md border border-teal-200">
              {myObservedSlots.length} tiết
            </span>
          </div>

          {myObservedSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <p className="text-xs font-bold text-center italic">Bạn chưa đăng ký dự giờ tiết học nào.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myObservedSlots.map(slot => {
                const slotDate = new Date(slot.date);
                const myReg = slot.registrations.find((r: any) => r.teacherId === currentTeacher?.id);

                return (
                  <div key={slot.id} className="p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all shadow-xs hover:shadow-md bg-teal-50/20 border-teal-200/70 border-l-4 border-l-[#008B82]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-teal-100 text-teal-900">
                          Tôi dự
                        </span>
                        <span className="text-xs font-extrabold text-slate-400">
                          {slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </div>

                      <div className="min-w-0 space-y-1 text-xs">
                        <h4 className="font-black text-slate-900 truncate leading-snug" title={slot.topic}>{slot.topic}</h4>
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${getAvatarGradient(slot.teacher.teacherName)} text-white flex items-center justify-center font-black text-[10px] shrink-0`}>
                            {slot.teacher.teacherName.charAt(0)}
                          </div>
                          <p className="text-slate-500 font-medium truncate">GV Dạy: <span className="font-bold text-slate-800">{slot.teacher.teacherName}</span></p>
                        </div>
                        <p className="text-slate-500 font-medium">Lớp: {slot.className || "Chưa xếp"} • {slot.startTime}</p>
                      </div>
                    </div>

                    {/* Registration Status & Evaluation Actions */}
                    <div className="pt-2 border-t border-slate-200/70 flex flex-col gap-2 text-xs">
                      {!myReg?.isApproved ? (
                        <div className="flex flex-col gap-1.5 w-full">
                          <span className="px-2 py-1 text-[11px] font-black uppercase text-amber-800 bg-amber-50 border border-amber-200 rounded-md text-center">
                            Chờ GV dạy duyệt
                          </span>
                          <button type="button" onClick={() => handleCancelRegistration(myReg?.id)}
                            className="px-2.5 py-1 text-rose-600 bg-white border border-rose-200 rounded-lg font-bold hover:bg-rose-50 transition-all text-center cursor-pointer">
                            Hủy đăng ký
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 w-full">
                          <span className="px-2 py-1 text-[11px] font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md text-center">
                            Đã xác nhận dự giờ
                          </span>
                          <button type="button" onClick={() => openEvalModal(myReg, slot)}
                            className="px-3 py-1.5 bg-[#008B82] hover:bg-[#007068] text-white rounded-xl font-black shadow-xs transition-all w-full text-center cursor-pointer">
                            {myReg?.evaluation ? "Xem phiếu đánh giá" : "✍️ Nhập đánh giá"}
                          </button>
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

      {/* ROW 4: Kết quả đánh giá gần đây */}
      <div className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col gap-5 border-t-4 border-t-[#008B82]">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#008B82] flex items-center justify-center">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm text-[#003B3A] uppercase tracking-wider">5. Kết quả đánh giá tiết dạy nhận được</h3>
            <p className="text-xs text-slate-400 font-medium">Danh sách các phiếu đánh giá từ đồng nghiệp và Tổ chuyên môn</p>
          </div>
        </div>

        {receivedEvaluations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <ClipboardList className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
            <p className="text-xs font-bold text-center">Chưa nhận được phiếu đánh giá nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-wider">
                  <th className="p-4">Người đánh giá</th>
                  <th className="p-4">Môn học & Chủ đề</th>
                  <th className="p-4">Thời gian / Phòng</th>
                  <th className="p-4 text-center">Xếp loại</th>
                  <th className="p-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                {receivedEvaluations.map(evalItem => {
                  const rating = evalItem.evaluation?.overallRating || "Đạt";
                  const slotDate = new Date(evalItem.slot.date);
                  const evaluatorName = evalItem.registration?.teacher?.teacherName || "Giáo viên";

                  return (
                    <tr key={evalItem.evaluation?.id || evalItem.registration?.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(evaluatorName)} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs`}>
                            {evaluatorName.charAt(0)}
                          </div>
                          <span className="font-extrabold text-slate-900 text-xs">{evaluatorName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-black text-[#003B3A]">{evalItem.slot.topic || "Đánh giá tiết dạy"}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {evalItem.slot.subjectName} • {evalItem.slot.className || "Lớp"}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold">{slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                        <p className="text-xs font-bold text-teal-700 mt-0.5">
                          {evalItem.slot.startTime} • Phòng: {evalItem.slot.room || "Phòng học"}
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 text-xs font-black uppercase rounded-lg border ${RATING_COLORS[rating] || "bg-teal-50 text-teal-700 border-teal-200"}`}>
                          {rating}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => openEvalModal(evalItem.registration, evalItem.slot)}
                          className="px-3.5 py-1.5 text-xs font-black rounded-xl transition-all shadow-xs bg-[#008B82] hover:bg-[#007068] text-white cursor-pointer"
                        >
                          Xem phiếu
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Details Modal */}
      {registerDetailSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-[#003B3A] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-base">Xác nhận Đăng ký Dự giờ</h3>
                <p className="text-white/70 text-xs font-medium mt-0.5">Kiểm tra thông tin tiết dạy trước khi gửi đăng ký</p>
              </div>
              <button 
                onClick={() => setRegisterDetailSlot(null)} 
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs font-semibold">
              <div className="bg-teal-50/40 p-4 rounded-2xl border border-teal-100 space-y-1">
                <span className="text-[10px] font-black text-[#008B82] uppercase tracking-wider">Chủ đề bài dạy</span>
                <h4 className="text-sm font-black text-[#003B3A] leading-snug">{registerDetailSlot.topic}</h4>
                <p className="text-xs text-slate-500 font-medium">Môn: {registerDetailSlot.subjectName}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Giáo viên dạy</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5">{registerDetailSlot.teacher?.teacherName}</span>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Lớp & Phòng</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5">{registerDetailSlot.className || "Lớp"} • Phòng {registerDetailSlot.room || "Phòng học"}</span>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Thời gian</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5">
                    {registerDetailSlot.startTime} • {new Date(registerDetailSlot.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                  </span>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Cơ sở</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5">{registerDetailSlot.campus?.campusName || registerDetailSlot.campusName || "Sky-Line"}</span>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setRegisterDetailSlot(null)} 
                className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                type="button" 
                onClick={() => handleRegister(registerDetailSlot.id)} 
                className="px-5 py-2 bg-[#008B82] hover:bg-[#007068] text-white font-bold rounded-xl transition-all text-xs shadow-md shadow-teal-800/20 cursor-pointer"
              >
                Xác nhận Đăng ký
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Modal (Phiếu đánh giá chuyên môn chuẩn) */}
      {evalModal && (() => {
        const isReadOnly = !!evalModal.registration.evaluation;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 bg-gradient-to-r from-[#003B3A] to-[#007068] text-white flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                      <ClipboardList className="w-5 h-5" /> Phiếu Đánh Giá Tiết Dự Giờ
                    </h3>
                  </div>
                  <p className="text-white/80 text-xs mt-0.5 font-medium">
                    GV Dạy: <span className="font-bold text-white">{evalModal.slot.teacher?.teacherName}</span> • Bài dạy: <span className="font-bold text-white">{evalModal.slot.topic}</span>
                  </p>
                </div>
                <button onClick={() => setEvalModal(null)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer">
                  <X className="w-5 h-5 text-white/80" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs font-semibold">
                {/* Score Summary Box */}
                {evalModal.slot.level !== "Mầm non" ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-teal-50/50 rounded-2xl border border-teal-100">
                      <span className="text-xs font-black text-teal-900 uppercase tracking-wide">Tổng điểm tự động:</span>
                      <span className="text-base font-black text-teal-950 bg-white px-4 py-1.5 rounded-xl shadow-xs border border-teal-200">
                        {evalK12Scores.reduce((a, b) => a + b, 0).toFixed(2)} / 20.00 điểm
                      </span>
                    </div>

                    {K12_SECTIONS.map((sec, sIdx) => {
                      let reqStartIdx = 0;
                      for (let i = 0; i < sIdx; i++) {
                        reqStartIdx += K12_SECTIONS[i].requirements.length;
                      }

                      return (
                        <div key={sIdx} className="space-y-3">
                          <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span className="w-5 h-5 bg-teal-100 text-teal-800 rounded-md flex items-center justify-center text-xs font-black">{sIdx + 1}</span>
                            {sec.name}
                          </h4>
                          <div className="space-y-2.5">
                            {sec.requirements.map((req, rSubIdx) => {
                              const globalIdx = reqStartIdx + rSubIdx;
                              const options = [];
                              for (let v = 0; v <= req.max; v += 0.25) {
                                options.push(Math.round(v * 100) / 100);
                              }

                              return (
                                <div key={req.id} className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col md:flex-row md:items-start justify-between gap-3">
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 text-[10px] font-black bg-slate-200 text-slate-700 rounded-md uppercase tracking-wider">{req.label}</span>
                                      <span className="text-[11px] font-bold text-slate-400">(Tối đa: {req.max}đ)</span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{req.text}</p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                                    <span className="text-xs font-bold text-slate-500">Điểm:</span>
                                    <select
                                      value={evalK12Scores[globalIdx]}
                                      onChange={(e) => {
                                        const nextScores = [...evalK12Scores];
                                        nextScores[globalIdx] = parseFloat(e.target.value);
                                        setEvalK12Scores(nextScores);
                                        const nextRank = calculateK12Ranking(nextScores);
                                        setEvalOverall(nextRank);
                                      }}
                                      disabled={isReadOnly}
                                      className="rounded-xl border border-slate-200 p-2 bg-white text-xs font-black text-slate-800 outline-none w-24 shadow-2xs disabled:opacity-75"
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
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                      <span className="text-xs font-black text-amber-900 uppercase tracking-wide">Tổng điểm tự động:</span>
                      <span className="text-base font-black text-amber-950 bg-white px-4 py-1.5 rounded-xl shadow-xs border border-amber-200">
                        {evalCriteria.reduce((a, b) => a + b, 0).toFixed(2)} / 10.00 điểm
                      </span>
                    </div>

                    {MAMNON_SECTIONS.map((sec, sIdx) => {
                      let reqStartIdx = 0;
                      for (let i = 0; i < sIdx; i++) {
                        reqStartIdx += MAMNON_SECTIONS[i].requirements.length;
                      }

                      return (
                        <div key={sIdx} className="space-y-3">
                          <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded-md flex items-center justify-center text-xs font-black">{sIdx + 1}</span>
                            {sec.name}
                          </h4>
                          <div className="space-y-2.5">
                            {sec.requirements.map((req, rSubIdx) => {
                              const globalIdx = reqStartIdx + rSubIdx;
                              const options = [];
                              for (let v = 0; v <= req.max; v += 0.25) {
                                options.push(Math.round(v * 100) / 100);
                              }

                              return (
                                <div key={req.id} className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col md:flex-row md:items-start justify-between gap-3">
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 text-[10px] font-black bg-slate-200 text-slate-700 rounded-md uppercase tracking-wider">{req.label}</span>
                                      <span className="text-[11px] font-bold text-slate-400">(Tối đa: {req.max}đ)</span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{req.text}</p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                                    <span className="text-xs font-bold text-slate-500">Điểm:</span>
                                    <select
                                      value={evalCriteria[globalIdx]}
                                      onChange={(e) => {
                                        const nextCriteria = [...evalCriteria];
                                        nextCriteria[globalIdx] = parseFloat(e.target.value);
                                        setEvalCriteria(nextCriteria);
                                        const nextRank = calculateMamNonRanking(nextCriteria);
                                        setEvalOverall(nextRank);
                                      }}
                                      disabled={isReadOnly}
                                      className="rounded-xl border border-slate-200 p-2 bg-white text-xs font-black text-slate-800 outline-none w-24 shadow-2xs disabled:opacity-75"
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
                )}

                {/* Qualitative Feedback */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider">Nhận xét & Góp ý chuyên môn</h4>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">Ưu điểm nổi bật của tiết dạy</label>
                    <textarea
                      placeholder="Những điểm mạnh, sáng tạo trong phương pháp và tổ chức hoạt động..."
                      rows={2}
                      value={evalStrengths}
                      onChange={e => setEvalStrengths(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none resize-none disabled:opacity-75 disabled:bg-slate-100"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">Góp ý cải thiện / phát triển</label>
                    <textarea
                      placeholder="Các gợi ý phương pháp, phân bổ thời gian hoặc tổ chức hoạt động tốt hơn..."
                      rows={2}
                      value={evalImprovements}
                      onChange={e => setEvalImprovements(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none resize-none disabled:opacity-75 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {/* Overall Rating Selection */}
                <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wide">Xếp loại tiết dạy tổng thể *</label>
                    <span className="text-xs font-extrabold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                      Gợi ý: {evalModal.slot.level !== "Mầm non" ? calculateK12Ranking(evalK12Scores) : calculateMamNonRanking(evalCriteria)}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {(evalModal.slot.level !== "Mầm non"
                      ? [["Giỏi","bg-emerald-600"],["Khá","bg-sky-600"],["Trung bình","bg-amber-500"],["Không xếp loại","bg-rose-600"]]
                      : [["Tốt","bg-emerald-600"],["Khá","bg-sky-600"],["Đạt","bg-teal-600"],["Không đạt","bg-rose-600"]]
                    ).map(([r, color]) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { if (!isReadOnly) setEvalOverall(r); }}
                        disabled={isReadOnly}
                        className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          evalOverall === r
                            ? `${color} text-white shadow-md`
                            : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setEvalModal(null)}
                  className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all text-xs cursor-pointer"
                >
                  Đóng
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleSubmitEval}
                    disabled={evalSubmitting}
                    className="px-6 py-2 bg-[#008B82] hover:bg-[#007068] disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl transition-all shadow-md text-xs cursor-pointer"
                  >
                    {evalSubmitting ? "Đang nộp..." : "Nộp phiếu đánh giá"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
