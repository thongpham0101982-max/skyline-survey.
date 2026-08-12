import { ObservationVideoGuideModal } from "@/components/ObservationVideoGuideModal"
"use client"

import { useState, useEffect, useTransition, useMemo, useRef, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { 
  Calendar, Clock, MapPin, User, Users, BookOpen, Plus, Search, X, Check,
  AlertCircle, Trash2, Info, Layers, FileText, ChevronDown, ChevronUp,
  ClipboardList, CheckCircle, Clock3, Building2, Shield, Filter, RotateCcw, SlidersHorizontal, Award,
  Eye, TrendingUp, Sparkles, CheckSquare
} from "lucide-react"
import { 
  createObservationSlot, updateObservationSlot, registerObservation, cancelObservation,
  requestObservationSlot, respondToObservationRequest,
  deleteObservationSlot, getCreatedCountInMonth, getObservationSlots,
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
  initialFilters: { level: string; period: string; grade: string; date: string; campusId: string; deptId: string; academicYearId?: string }
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
  "Tốt": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "Khá": "bg-sky-100 text-sky-700 border-sky-300",
  "Trung bình": "bg-amber-100 text-amber-700 border-amber-300",
  "Yếu": "bg-rose-100 text-rose-700 border-rose-300"
}

export function ObservationClient(props: ObservationClientProps) {
  const {
    initialSlots, currentTeacher, subjects, departments, teachers, campuses, classes, initialFilters, academicYears, selectedYearId
  } = props;
  const isMamNonTeacher = 
    currentTeacher?.user?.role === "GV_MN" || 
    currentTeacher?.user?.role === "BGH_MN" ||
    (currentTeacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");
  const router = useRouter()
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

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTabParam = searchParams.get("tab") || "dang-ky"
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [slots, setSlots] = useState(initialSlots)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
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
  const [myScheduleMonth, setMyScheduleMonth] = useState<string>("ALL");
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
  const [filterAcademicYearId, setFilterAcademicYearId] = useState(initialFilters.academicYearId || selectedYearId || "")

  const handleAcademicYearChange = (yearId: string) => {
    setFilterAcademicYearId(yearId)
    const params = new URLSearchParams(window.location.search)
    params.set("academicYearId", yearId)
    router.push(`${pathname}?${params.toString()}`)
  }
  const [showFilterPanel, setShowFilterPanel] = useState(true)

  // All observation request slots targeted to current teacher (GV dạy được xin dự)
  const allRequestsForMySlot = useMemo(() => {
    return slots.filter((s: any) => s.teacherId === currentTeacher?.id && s.requestOrigin === "OBSERVER_REQUEST");
  }, [slots, currentTeacher?.id]);

  // All observation request slots created by current teacher (GVBM xin dự)
  const myCreatedObserverRequests = useMemo(() => {
    return slots.filter((s: any) => s.registrations.some((r: any) => r.teacherId === currentTeacher?.id) && s.requestOrigin === "OBSERVER_REQUEST");
  }, [slots, currentTeacher?.id]);


  // Filter classes for GVBM request form based on Level and Grade
  const filteredReqClasses = useMemo(() => {
    return classes.filter((c: any) => {
      if (reqLevel && reqLevel !== "all" && c.level !== reqLevel) return false;
      if (reqGrade && reqGrade !== "all" && c.grade !== reqGrade) return false;
      return true;
    });
  }, [classes, reqLevel, reqGrade]);


  // Filter teachers for request form by selected department
  const filteredTeachersForRequest = useMemo(() => {
    if (!reqDeptId) return teachers;
    return teachers.filter((t: any) => t.departmentId === reqDeptId);
  }, [teachers, reqDeptId]);

  // Pending slots waiting for my approval (I am host teacher)
  const pendingRequestsForMe = useMemo(() => {
    return slots.filter((s: any) => s.teacherId === currentTeacher?.id && s.status === "PENDING_TEACHER_APPROVAL");
  }, [slots, currentTeacher?.id]);

  // Helper to format date with Day of Week
  const formatDateWithDayOfWeek = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayName = days[d.getDay()];
    const dateFormatted = d.toLocaleDateString("vi-VN");
    return `${dayName}, ${dateFormatted}`;
  };

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
  const [newVisibility, setNewVisibility] = useState("ALL")
  const [newTargetDeptId, setNewTargetDeptId] = useState("")
  const [newLessonPlanName, setNewLessonPlanName] = useState("")
  const [newLessonPlanData, setNewLessonPlanData] = useState("")

  // Tong Hop Tab states
  const [selectedDeptId, setSelectedDeptId] = useState(currentTeacher?.departmentId || (departments[0]?.id || ""))
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  const [tongHopSearchTeacherQuery, setTongHopSearchTeacherQuery] = useState("")
  const [tongHopSearchSlotQuery, setTongHopSearchSlotQuery] = useState("")
  const [tongHopFilterLevel, setTongHopFilterLevel] = useState("all")
  const [tongHopFilterGrade, setTongHopFilterGrade] = useState("all")
  const [monthlyLimitCount, setMonthlyLimitCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [editSlotId, setEditSlotId] = useState<string | null>(null)

  // Target Config states (moved down to avoid referencing selectedTeacherId before initialization)
  const [activeDetailTab, setActiveDetailTab] = useState("lich-su")
  const [observerType, setObserverType] = useState("")
  const [observeeType, setObserveeType] = useState("")
  const [requiredObserved, setRequiredObserved] = useState(0)
  const [observedUnit, setObservedUnit] = useState("tháng")
  const [requiredTaught, setRequiredTaught] = useState(0)
  const [taughtUnit, setTaughtUnit] = useState("tháng")
  const [savingTargets, setSavingTargets] = useState(false)

  // Self Target Confirmation states
  const [selfObserverType, setSelfObserverType] = useState(currentTeacher?.observerType || "")
  const [selfObserveeType, setSelfObserveeType] = useState(currentTeacher?.observeeType || "")
  const [selfRequiredObserved, setSelfRequiredObserved] = useState(currentTeacher?.requiredObserved || 0)
  const [selfObservedUnit, setSelfObservedUnit] = useState(currentTeacher?.observedUnit || "tháng")
  const [selfRequiredTaught, setSelfRequiredTaught] = useState(currentTeacher?.requiredTaught || 0)
  const [selfTaughtUnit, setSelfTaughtUnit] = useState(currentTeacher?.taughtUnit || "tháng")
  const [isEditingSelfTargets, setIsEditingSelfTargets] = useState(!currentTeacher?.observerType)
  const defaultGvOption = currentTeacher?.observerType === "Giáo viên mới" ? "new" : "old"
  const [gvOption, setGvOption] = useState(defaultGvOption)
  const [savingSelfTargets, setSavingSelfTargets] = useState(false)

  const specialPositions = ["Ban ĐHCM", "TTCM", "QLCM", "GĐCS", "Giám đốc Điều hành cơ sở"];
  const isSpecialPosition = currentTeacher?.position && specialPositions.includes(currentTeacher.position);

  const computedTargets = useMemo(() => {
    const position = currentTeacher?.position || "";
    if (position === "Ban ĐHCM") {
      return {
        obsType: "Ban ĐHCM",
        obsCount: 10,
        obsUnit: "tháng",
        tgtType: "Ban ĐHCM",
        tgtCount: 0,
        tgtUnit: "tháng",
        labelObs: "10 tiết / Tháng",
        labelTgt: "Không quy định"
      };
    } else if (position === "TTCM") {
      return {
        obsType: "TTCM",
        obsCount: 8,
        obsUnit: "tháng",
        tgtType: "TTCM",
        tgtCount: 1,
        tgtUnit: "năm",
        labelObs: "8 tiết / Tháng",
        labelTgt: "1 tiết / Năm học"
      };
    } else if (position === "QLCM") {
      return {
        obsType: "QLCM",
        obsCount: 8,
        obsUnit: "tháng",
        tgtType: "QLCM",
        tgtCount: 0,
        tgtUnit: "tháng",
        labelObs: "8 tiết / Tháng",
        labelTgt: "Không quy định"
      };
    } else if (position === "GĐCS" || position === "Giám đốc Điều hành cơ sở") {
      return {
        obsType: "Giám đốc Điều hành cơ sở",
        obsCount: 4,
        obsUnit: "tháng",
        tgtType: "Giám đốc Điều hành cơ sở",
        tgtCount: 0,
        tgtUnit: "tháng",
        labelObs: "4 tiết / Tháng",
        labelTgt: "Không quy định"
      };
    } else {
      // Normal GV
      if (gvOption === "new") {
        return {
          obsType: "Giáo viên mới",
          obsCount: 10,
          obsUnit: "tháng",
          tgtType: "Giáo viên mới",
          tgtCount: 1,
          tgtUnit: "tháng",
          labelObs: "10 tiết / Tháng",
          labelTgt: "1 tiết / Tháng"
        };
      } else {
        return {
          obsType: "Giáo viên cũ",
          obsCount: 4,
          obsUnit: "tháng",
          tgtType: "Giáo viên cũ",
          tgtCount: 1,
          tgtUnit: "học kỳ",
          labelObs: "4 tiết / Tháng",
          labelTgt: "1 tiết / Học kỳ"
        };
      }
    }
  }, [currentTeacher?.position, gvOption]);

  const isPrivileged = currentTeacher?.position === "TTCM" || currentTeacher?.position === "QLCM";

  useEffect(() => {
    if (selectedTeacherId) {
      const teacher = teachers.find(t => t.id === selectedTeacherId);
      if (teacher) {
        setObserverType(teacher.observerType || "");
        setObserveeType(teacher.observeeType || "");
        setRequiredObserved(teacher.requiredObserved || 0);
        setObservedUnit(teacher.observedUnit || "tháng");
        setRequiredTaught(teacher.requiredTaught || 0);
        setTaughtUnit(teacher.taughtUnit || "tháng");
      }
    }
  }, [selectedTeacherId, teachers]);

  const handleObserverTypeChange = (type: any) => {
    setObserverType(type);
    if (type === "Ban ĐHCM") {
      setRequiredObserved(10);
      setObservedUnit("tháng");
    } else if (type === "TTCM") {
      setRequiredObserved(8);
      setObservedUnit("tháng");
    } else if (type === "Nhóm trưởng CM CS") {
      setRequiredObserved(8);
      setObservedUnit("tháng");
    } else if (type === "Giám đốc Điều hành cơ sở") {
      setRequiredObserved(4);
      setObservedUnit("tháng");
    } else if (type === "Giáo viên mới") {
      setRequiredObserved(10);
      setObservedUnit("tháng");
    } else if (type === "Giáo viên cũ") {
      setRequiredObserved(4);
      setObservedUnit("tháng");
    }
  };

  const handleObserveeTypeChange = (type: any) => {
    setObserveeType(type);
    if (type === "TTCM") {
      setRequiredTaught(1);
      setTaughtUnit("năm");
    } else if (type === "Nhóm trưởng CM CS") {
      setRequiredTaught(1);
      setTaughtUnit("năm");
    } else if (type === "Giáo viên mới") {
      setRequiredTaught(1);
      setTaughtUnit("tháng");
    } else if (type === "Giáo viên cũ") {
      setRequiredTaught(1);
      setTaughtUnit("học kỳ");
    }
  };

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

  useEffect(() => {
    if (isMamNonTeacher) {
      setNewLevel("Mầm non");
    }
  }, [isMamNonTeacher])

  const resetCreateForm = () => {
    setEditSlotId(null);
    setNewSubjectId(""); setNewSubjectName(""); setNewLevel(isMamNonTeacher ? "Mầm non" : ""); setNewGrade(""); setNewClassId("");
    setNewClassNameText(""); setNewTopic(""); setNewDate(""); setNewStartTime("Tiết 1"); setNewEndTime("Tiết 1");
    setNewIsDoublePeriod(false); setNewDescription(""); setNewVisibility("ALL"); setNewTargetDeptId("");
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
      case "Mầm non": return ["Nhà trẻ 24-36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"]
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

    const cleanDbLevel = dbLevel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const numGrade = newGrade.replace(/Khối\s+/gi, "").replace(/Khoi\s+/gi, "").trim();
    const activeYearId = filterAcademicYearId || selectedYearId || "";

    return classes.filter(c => {
      if (activeYearId && c.academicYearId !== activeYearId) return false;
      if (c.campusId !== newCampusId) return false;

      const cLevelClean = (c.level || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (cLevelClean !== cleanDbLevel) return false;

      if (cleanDbLevel === "mam non") {
        if (!newGrade) return true;
        return (c.grade || "") === newGrade;
      }
      return (c.grade || "").trim() === numGrade;
    })
  }, [classes, newCampusId, newLevel, newGrade, filterAcademicYearId, selectedYearId])

  // Derive unique Khoi hoc values for Mam non from actual class data
  const mamNonGrades = useMemo(() => {
    const activeYearId = filterAcademicYearId || selectedYearId || "";
    const gradeSet = new Set<string>();
    classes.forEach((cls: any) => {
      if (activeYearId && cls.academicYearId !== activeYearId) return;
      if (newCampusId && cls.campusId !== newCampusId) return;
      const lvlClean = (cls.level || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (lvlClean !== "mam non") return;
      if (cls.grade) gradeSet.add(cls.grade);
    });
    const ORDER = ["Nh\u00e0 tr\u1ebb 24-36 th\u00e1ng", "M\u1eabu gi\u00e1o b\u00e9", "M\u1eabu gi\u00e1o nh\u1ee1", "M\u1eabu gi\u00e1o l\u1edbn"];
    return [...gradeSet].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  }, [classes, newCampusId, filterAcademicYearId, selectedYearId]);

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
          // fallback
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
      // DB compatibility values for first 5 criteria
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
      setNewSubjectId(""); setNewSubjectName(""); setNewLevel(isMamNonTeacher ? "Mầm non" : ""); setNewGrade(""); setNewClassId("")
      setNewClassNameText(""); setNewTopic(""); setNewDate(""); setNewStartTime("Tiết 1"); setNewEndTime("Tiết 1")
      setNewIsDoublePeriod(false); setNewDescription(""); setNewVisibility("ALL"); setNewTargetDeptId("")
      setNewLessonPlanName(""); setNewLessonPlanData("")
      setNewChuDe(""); setNewHoatDong(""); setNewDeTai("")
      if (fileInputRef.current) fileInputRef.current.value = ""
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
        // Chỉ tính tiết dạy khi tất cả GV đã được duyệt đều đã điền phiếu đánh giá
        const approvedRegs = slot.registrations.filter((r: any) => r.isApproved);
        const allEvaluated = approvedRegs.length > 0 && approvedRegs.every((r: any) => !!r.evaluation);
        if (allEvaluated) {
          stats[key].taughtCount += countWeight;
        }
      }
      if (isObserverApproved) {
        // Chỉ tính tiết dự khi GV dự đã điền phiếu đánh giá
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

  const evaluationsGroupedBySlot = useMemo(() => {
    const groups: any[] = [];
    slots.forEach(slot => {
      if (slot.teacherId === currentTeacher?.id) {
        const evals: any[] = [];
        slot.registrations.forEach((reg: any) => {
          if (reg.evaluation) {
            evals.push({
              registration: reg,
              evaluation: reg.evaluation
            });
          }
        });
        if (evals.length > 0) {
          groups.push({
            slot,
            evaluations: evals
          });
        }
      }
    });
    return groups.sort((a, b) => new Date(b.slot.date).getTime() - new Date(a.slot.date).getTime());
  }, [slots, currentTeacher?.id]);

  // Get all teachers in the selected department
  const deptTeachers = useMemo(() => {
    return teachers.filter((t: any) => t.departmentId === selectedDeptId);
  }, [teachers, selectedDeptId]);

  // Filter department teachers by search query
  const filteredDeptTeachers = useMemo(() => {
    return deptTeachers.filter((t: any) => 
      t.teacherName.toLowerCase().includes(tongHopSearchTeacherQuery.toLowerCase()) ||
      t.teacherCode.toLowerCase().includes(tongHopSearchTeacherQuery.toLowerCase())
    );
  }, [deptTeachers, tongHopSearchTeacherQuery]);

  // Compute taught and observed slot counts for each teacher in the selected department
  const teacherStats = useMemo(() => {
    const statsMap: Record<string, { taughtCount: number; observedCount: number }> = {};
    
    // Initialize stats for each teacher in the department
    deptTeachers.forEach((t: any) => {
      statsMap[t.id] = { taughtCount: 0, observedCount: 0 };
    });

    // Loop through all slots to calculate counts
    slots.forEach((slot: any) => {
      // 1. Taught count (Host)
      if (statsMap[slot.teacherId]) {
        const hasEvaluations = slot.registrations.some((r: any) => r.evaluation !== null);
        if (hasEvaluations) {
          statsMap[slot.teacherId].taughtCount += (slot.isDoublePeriod ? 2 : 1);
        }
      }

      // 2. Observed count (Observer)
      slot.registrations.forEach((reg: any) => {
        if (reg.isApproved && reg.evaluation && statsMap[reg.teacherId]) {
          statsMap[reg.teacherId].observedCount += (slot.isDoublePeriod ? 2 : 1);
        }
      });
    });

    return statsMap;
  }, [deptTeachers, slots]);

  const getSlotAverageScore = (slot: any) => {
    const isK12 = !["Mầm non"].includes(slot.level);
    const passedEvals = slot.registrations.filter((r: any) => {
      if (!r.evaluation) return false;
      const passed = isK12
        ? (r.evaluation.totalScore !== null && r.evaluation.totalScore !== undefined ? r.evaluation.totalScore >= 14 : (r.evaluation.overallRating === "Giỏi" || r.evaluation.overallRating === "Khá"))
        : (r.evaluation.overallRating === "Tốt" || r.evaluation.overallRating === "Khá" || r.evaluation.overallRating === "Đạt");
      return passed;
    });
    
    if (passedEvals.length === 0) return null;
    if (!isK12) return "Mầm non";
    
    const sum = passedEvals.reduce((acc: number, curr: any) => acc + (curr.evaluation.totalScore || 0), 0);
    return sum / passedEvals.length;
  };

  const tabFilteredSlots = useMemo(() => {
    const now = new Date()
    return slots.filter(slot => {
      const isHost = slot.teacherId === currentTeacher?.id
      const isObserver = slot.registrations.some((r: any) => r.teacherId === currentTeacher?.id)
      if (activeTab === "dang-ky") {
        if (isHost || isObserver) return false;
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
      }
      if (activeTab === "my-schedule") return isHost
      if (activeTab === "history") return isObserver
      return true
    })
  }, [slots, activeTab, currentTeacher?.id, currentTeacher?.departmentId, currentTeacher?.departmentRel, activeDeptTab, isMamNonTeacher, checkIsMyDept]);

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

  // Calculate progress values inside JSX or right before return:
  
  // Compute available months for Section 4 (Lịch dạy & dự giờ của tôi)
  const availableScheduleMonths = useMemo(() => {
    const myTaught = slots.filter(s => s.teacherId === currentTeacher?.id);
    const myRegistered = slots.filter(s => s.registrations.some((r: any) => r.teacherId === currentTeacher?.id));
    const allMySlots = [...myTaught, ...myRegistered];
    
    const monthMap = new Map<string, string>();
    allMySlots.forEach(s => {
      if (!s.date) return;
      const d = new Date(s.date);
      if (isNaN(d.getTime())) return;
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const label = `Tháng ${month}/${year}`;
      monthMap.set(key, label);
    });
    
    const sorted = Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    return sorted.map(([value, label]) => ({ value, label }));
  }, [slots, currentTeacher?.id]);

  const myStats = currentTeacher?.id ? teacherStats[currentTeacher.id] : undefined;
  const myObserved = myStats?.observedCount || 0;
  const myTaught = myStats?.taughtCount || 0;
  
  const obsTarget = selfRequiredObserved || 0;
  const taughtTarget = selfRequiredTaught || 0;

  const obsProgress = obsTarget > 0 ? Math.min(100, Math.round((myObserved / obsTarget) * 100)) : 0;
  const taughtProgress = taughtTarget > 0 ? Math.min(100, Math.round((myTaught / taughtTarget) * 100)) : 0;

  
  return (
    <div className="flex flex-col gap-6 relative pb-12 text-slate-800 bg-slate-50/50 min-h-screen p-1 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border border-white/20 text-white animate-in slide-in-from-top duration-300 ${toast.type === "success" ? "bg-emerald-600" : toast.type === "error" ? "bg-rose-600" : "bg-sky-600"}`}>
          {toast.type === "success" && <Check className="w-5 h-5 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 shrink-0" />}
          {toast.type === "info" && <Info className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-bold tracking-wide">${toast.message}</span>
        </div>
      )}

      {/* Top Header Navbar with Teacher Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#002D2B] via-[#005E57] to-[#009085] p-6 md:p-8 rounded-[2rem] shadow-lg text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-emerald-100 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" /> SKY-LINE SYSTEM | ĐÁNH GIÁ CHUYÊN MÔN
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1 flex items-center gap-2">
            Dự giờ đánh giá Giáo viên
          </h1>
          <p className="text-emerald-100/80 text-xs font-medium">Giao diện điều khiển dự giờ, theo dõi chỉ tiêu và đánh giá chuyên môn giáo viên chuẩn Sky-Line</p>
        </div>
        
        {/* Profile Card right */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <button 
            onClick={() => setIsVideoModalOpen(true)}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 rounded-2xl text-xs font-black shadow-xl shadow-amber-400/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-amber-300/50"
          >
            <Tv className="w-4 h-4 text-slate-950" /> 🎬 Xem Video Hướng Dẫn Tương Tác
          </button>
          <div className="flex items-center gap-3.5 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-inner">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-black text-lg shadow-md border-2 border-white/20">
            {currentTeacher?.teacherName?.charAt(0) || "N"}
          </div>
          <div className="text-left space-y-0.5">
            <span className="block text-sm font-black tracking-wide">{currentTeacher?.teacherName}</span>
            <span className="block text-[10px] text-emerald-100/90 font-bold">Mã số: {currentTeacher?.teacherCode}</span>
            {currentTeacher?.position && (
              <span className="inline-block text-[9px] bg-emerald-500/30 text-emerald-100 px-2 py-0.2 rounded font-extrabold uppercase mt-1">
                {currentTeacher?.position}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* DASHBOARD OVERVIEW: 3 Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Observation target */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-md p-6 flex flex-col justify-between gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-b from-sky-400/5 to-transparent rounded-full -mr-6 -mt-6" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Chỉ tiêu dự giờ</h4>
                <p className="text-xs font-bold text-slate-500 mt-0.5">Đơn vị: tiết / {selfObservedUnit}</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
              {obsProgress}% Hoàn thành
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-800">{myObserved}</span>
              <span className="text-slate-400 font-bold text-sm">/ {obsTarget} tiết</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full transition-all duration-500" 
                style={{ width: `${obsProgress}%` }}
              />
            </div>
            <p className="text-[10px] font-bold text-slate-400 text-right">
              {obsTarget - myObserved > 0 ? `Còn thiếu ${obsTarget - myObserved} tiết` : "Đã đạt mục tiêu!"}
            </p>
          </div>
        </div>

        {/* Card 2: Taught target */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-md p-6 flex flex-col justify-between gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-b from-[#00A99D]/5 to-transparent rounded-full -mr-6 -mt-6" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#E6F7F6] flex items-center justify-center text-[#00A99D]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Chỉ tiêu tiết dạy</h4>
                <p className="text-xs font-bold text-slate-500 mt-0.5">Đơn vị: tiết / {selfTaughtUnit}</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold text-[#00A99D] bg-[#E6F7F6] px-2.5 py-0.5 rounded-full border border-[#00A99D]/15">
              {taughtProgress}% Hoàn thành
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-800">{myTaught}</span>
              <span className="text-slate-400 font-bold text-sm">/ {taughtTarget || 1} tiết</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00A99D] to-[#007068] rounded-full transition-all duration-500" 
                style={{ width: `${taughtProgress}%` }}
              />
            </div>
            <p className="text-[10px] font-bold text-slate-400 text-right">
              {taughtTarget - myTaught > 0 ? `Còn thiếu ${taughtTarget - myTaught} tiết` : "Đã đạt mục tiêu!"}
            </p>
          </div>
        </div>

        {/* Card 3: Monthly Statistics List */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-md p-6 flex flex-col justify-between gap-3 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-b from-violet-400/5 to-transparent rounded-full -mr-6 -mt-6" />
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hiệu suất tháng gần nhất</h4>
              <p className="text-[9px] font-extrabold text-slate-400">Thống kê số tiết dạy & dự</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-2 my-1">
            {monthlyStats.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-2">Chưa có số liệu thống kê.</p>
            ) : (
              monthlyStats.slice(0, 2).map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-100 transition-colors">
                  <span className="font-extrabold text-xs text-slate-700">{stat.monthStr}</span>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-extrabold text-[9px] border border-emerald-100/50">
                      Dạy: {stat.taughtCount}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-extrabold text-[9px] border border-violet-100/50">
                      Dự: {stat.observedCount}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* ROW 1: 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Panel 1: Khởi tạo tiết dạy của tôi */}
        <div className={`lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-md p-6 flex flex-col gap-4 border-t-4 ${isMamNonTeacher ? "border-t-amber-500" : "border-t-[#00A99D]"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-3">
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 shadow-inner-2xs w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setCreationMode("TEACHER_OPEN")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  creationMode === "TEACHER_OPEN"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Plus className="w-4 h-4" />
                1. GV DẠY TỰ MỞ TIẾT
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("OBSERVER_REQUEST")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  creationMode === "OBSERVER_REQUEST"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100"
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-500" />
                2. GVBM XIN DỰ GIỜ
              </button>
            </div>
            {creationMode === "TEACHER_OPEN" && (
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg self-start sm:self-auto ${isMamNonTeacher ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-[#E6F7F6] text-[#00A99D]"}`}>
                Tháng {new Date().getMonth() + 1}: {monthlyLimitCount}/2
              </span>
            )}
          </div>

          {creationMode === "OBSERVER_REQUEST" ? (
            /* ===== FORM 2: GVBM XIN ĐĂNG KÝ DỰ GIỜ ===== */
            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4 text-xs font-semibold bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100">
              <div className="bg-indigo-500/10 border border-indigo-200/60 rounded-xl p-3 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-900 leading-relaxed font-medium">
                  <span className="font-extrabold">Đề xuất xin dự giờ:</span> Chọn Tổ chuyên môn & Giáo viên bạn muốn dự, cùng Cơ sở, Cấp học, Khối lớp, Lớp học và Tiết học. Yêu cầu sẽ được gửi tới Giáo viên dạy để xác nhận & đồng ý.
                </p>
              </div>

              {/* Tổ chuyên môn & Giáo viên dạy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-indigo-800 uppercase tracking-wide">1. Chọn Tổ chuyên môn</label>
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
                  <label className="text-[10px] font-black text-indigo-800 uppercase tracking-wide">2. Chọn Giáo viên dạy *</label>
                  <select
                    value={reqTeacherId}
                    onChange={e => setReqTeacherId(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  >
                    <option value="">-- Chọn Giáo viên dạy --</option>
                    {filteredTeachersForRequest.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.teacherName} ({t.teacherCode}) {t.departmentRel?.name ? `- ${t.departmentRel.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Môn học & Chủ đề/Tên bài dạy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-indigo-800 uppercase tracking-wide">3. Chọn Môn học *</label>
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
                  <label className="text-[10px] font-black text-indigo-800 uppercase tracking-wide">4. Tên bài dạy / Chủ đề dự giờ *</label>
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

              {/* Cơ sở & Cấp học */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-indigo-800 uppercase tracking-wide">5. Chọn Cơ sở *</label>
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
                  <label className="text-[10px] font-black text-indigo-800 uppercase tracking-wide">6. Chọn Cấp học *</label>
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

              {/* Khối lớp & Lớp học */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-indigo-800 uppercase tracking-wide">7. Chọn Khối lớp *</label>
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
                  <label className="text-[10px] font-black text-indigo-800 uppercase tracking-wide">8. Chọn Lớp học *</label>
                  <select
                    value={reqClassId}
                    onChange={e => setReqClassId(e.target.value)}
                    required
                    disabled={!reqGrade}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800 disabled:opacity-50"
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {filteredReqClasses.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.className} ({c.level || c.grade})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tiết học & Ngày dạy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-indigo-800 uppercase tracking-wide">9. Chọn Tiết học dự *</label>
                  <select
                    value={reqPeriod}
                    onChange={e => setReqPeriod(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800 font-extrabold text-indigo-900"
                  >
                    <option value="Tiết 1">Tiết 1 (07:30 - 08:15)</option>
                    <option value="Tiết 2">Tiết 2 (08:25 - 09:10)</option>
                    <option value="Tiết 3">Tiết 3 (09:30 - 10:15)</option>
                    <option value="Tiết 4">Tiết 4 (10:25 - 11:10)</option>
                    <option value="Tiết 5">Tiết 5 (13:00 - 13:45)</option>
                    <option value="Tiết 6">Tiết 6 (13:55 - 14:40)</option>
                    <option value="Tiết 7">Tiết 7 (15:00 - 15:45)</option>
                    <option value="Tiết 8">Tiết 8 (15:55 - 16:40)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-indigo-800 uppercase tracking-wide">10. Chọn Ngày dạy / Thứ trong tuần *</label>
                  <input
                    type="date"
                    value={reqDate}
                    onChange={e => setReqDate(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  />
                  {reqDate && (
                    <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-lg border border-indigo-200 inline-block self-start mt-1">
                      🗓️ {formatDateWithDayOfWeek(reqDate)}
                    </span>
                  )}
                </div>
              </div>

              {/* Ghi chú */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-indigo-800 uppercase tracking-wide">11. Ghi chú gửi Giáo viên dạy</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Xin dự giờ học hỏi kinh nghiệm giảng dạy môn Toán..."
                  value={reqNotes}
                  onChange={e => setReqNotes(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {submitting ? "Đang gửi yêu cầu..." : "+ GỬI YÊU CẦU XIN DỰ GIỜ (GVBM)"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 text-xs font-semibold">
            {isMamNonTeacher ? (
              /* ===== INLINE MAM NON FORM ===== */
              <>
                {/* Chu de */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-amber-700 uppercase tracking-wide">Chủ đề bài dạy *</label>
                  <input type="text" placeholder="Ví dụ: Thế giới động vật, Gia đình..." value={newChuDe} onChange={e => setNewChuDe(e.target.value)} required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200/80 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-amber-50/10 hover:bg-amber-50/20 focus:bg-white transition-all shadow-inner-sm text-slate-800" />
                </div>
                {/* Hoat dong & De tai */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-wide">Hoạt động *</label>
                    <input type="text" placeholder="Ví dụ: Âm nhạc, Tạo hình, KPKH..." value={newHoatDong} onChange={e => setNewHoatDong(e.target.value)} required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200/80 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-amber-50/10 hover:bg-amber-50/20 focus:bg-white transition-all shadow-inner-sm text-slate-800" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-wide">Đề tài *</label>
                    <input type="text" placeholder="Ví dụ: Bé yêu các con vật..." value={newDeTai} onChange={e => setNewDeTai(e.target.value)} required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200/80 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-amber-50/10 hover:bg-amber-50/20 focus:bg-white transition-all shadow-inner-sm text-slate-800" />
                  </div>
                </div>
                {/* Khối lớp & Lớp học */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-wide">Khối học *</label>
                    <select value={newGrade} onChange={e => { setNewGrade(e.target.value); setNewClassId(""); }} required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200/80 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white hover:bg-amber-50/10 transition-all text-slate-850">
                      <option value="">Chọn khối học</option>
                       {mamNonGrades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-wide">Tên lớp *</label>
                    <select value={newClassId} onChange={e => setNewClassId(e.target.value)} required disabled={!newGrade}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200/80 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white hover:bg-amber-50/10 transition-all disabled:opacity-50 text-slate-850">
                      <option value="">Chọn lớp</option>
                      {filteredClassesForCreation.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              /* ===== INLINE K12 FORM ===== */
              <>
                {/* Topic Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-wide">Tên bài dạy / Chủ đề *</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Đơn vị đo độ dài..." 
                    value={newTopic} 
                    onChange={e => setNewTopic(e.target.value)} 
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A99D] focus:border-transparent outline-none hover:bg-slate-50/50 focus:bg-white transition-all shadow-inner-sm text-slate-800"
                  />
                </div>

                {/* 1. Cơ sở & Môn học */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-550 uppercase tracking-wide">Cơ sở *</label>
                    <select 
                      value={newCampusId || currentTeacher?.campusId || ""} 
                      onChange={e => { setNewCampusId(e.target.value); setNewClassId(""); }} 
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A99D] focus:border-transparent outline-none bg-white hover:bg-slate-50/30 transition-all text-slate-850"
                    >
                      <option value="">Chọn cơ sở</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-550 uppercase tracking-wide">Môn học *</label>
                    <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)} required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A99D] focus:border-transparent outline-none bg-white hover:bg-slate-50/30 transition-all text-slate-850">
                      <option value="">Chọn môn</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                    </select>
                  </div>
                </div>

                {/* 2. Cấp học & Khối lớp */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-550 uppercase tracking-wide">Cấp học *</label>
                    <select value={newLevel} onChange={e => { setNewLevel(e.target.value); setNewGrade(""); setNewClassId(""); }} required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A99D] focus:border-transparent outline-none bg-white hover:bg-slate-50/30 transition-all text-slate-855">
                      <option value="">Chọn cấp</option>
                      <option value="Mầm non">Mầm non</option>
                      <option value="Tiểu học">Tiểu học</option>
                      <option value="THCS">THCS</option>
                      <option value="THPT">THPT</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-550 uppercase tracking-wide">Khối lớp *</label>
                    <select value={newGrade} onChange={e => { setNewGrade(e.target.value); setNewClassId(""); }} required disabled={!newLevel}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A99D] focus:border-transparent outline-none bg-white hover:bg-slate-50/30 transition-all disabled:opacity-50 text-slate-855">
                      <option value="">Chọn khối</option>
                      {getGradesForLevel(newLevel).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                {/* 3. Lớp học */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-wide">Lớp học *</label>
                  <select value={newClassId} onChange={e => setNewClassId(e.target.value)} required disabled={!newGrade}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A99D] focus:border-transparent outline-none bg-white hover:bg-slate-50/30 transition-all disabled:opacity-50 text-slate-855">
                    <option value="">Chọn lớp</option>
                    {filteredClassesForCreation.map(c => (
                      <option key={c.id} value={c.id}>{c.className}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {/* Date & Period */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-550 uppercase tracking-wide">Ngày dạy *</label>
                <input 
                  type="date" 
                  value={newDate} 
                  onChange={e => setNewDate(e.target.value)} 
                  required
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A99D] focus:border-transparent outline-none hover:bg-slate-50/50 focus:bg-white transition-all shadow-inner-sm text-slate-800"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-550 uppercase tracking-wide">Tiết dạy *</label>
                <select value={newStartTime} onChange={e => { setNewStartTime(e.target.value); setNewEndTime(e.target.value); }} required
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A99D] focus:border-transparent outline-none bg-white hover:bg-slate-50/30 transition-all text-slate-855">
                  <option value="">Chọn tiết</option>
                  {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={`Tiết ${p}`}>Tiết {p}</option>)}
                </select>
              </div>
            </div>

            {/* Room & Visibility */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-550 uppercase tracking-wide">Phòng học *</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Phòng 302..." 
                  value={newClassNameText} 
                  onChange={e => setNewClassNameText(e.target.value)} 
                  required
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A99D] focus:border-transparent outline-none hover:bg-slate-50/50 focus:bg-white transition-all shadow-inner-sm text-slate-800"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-550 uppercase tracking-wide">Chế độ hiển thị</label>
                <select value={newVisibility} onChange={e => setNewVisibility(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A99D] focus:border-transparent outline-none bg-white hover:bg-slate-50/30 transition-all text-slate-855">
                  <option value="ALL">Công khai toàn trường</option>
                  <option value="DEPARTMENT">Nội bộ Tổ chuyên môn</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={submitting}
              className={`w-full mt-3 text-white font-black py-3.5 px-6 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] text-xs uppercase tracking-wider shrink-0 flex items-center justify-center gap-1.5 hover:-translate-y-0.5 cursor-pointer ${isMamNonTeacher ? "bg-gradient-to-r from-amber-700 to-amber-500 hover:from-amber-800 hover:to-amber-600 shadow-amber-100/50" : "bg-gradient-to-r from-[#003B3A] to-[#00A99D] hover:from-[#002b2a] hover:to-[#008b82] shadow-[#003B3A]/10"}`}
            >
              <Plus className="w-4 h-4" />
              {submitting ? "Đang xử lý..." : "Khởi tạo lịch dạy"}
            </button>
          </form>
          )}
        </div>

        {/* Panel 2: Đăng ký nhanh tiết dạy gợi ý */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-md p-6 flex flex-col gap-4 border-t-4 border-t-[#003B3A] transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-150 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#003B3A]" />
              <span className="font-extrabold text-sm text-[#003B3A] uppercase tracking-wider">2. Đăng ký nhanh</span>
            </div>
            <span className="text-[9px] font-bold bg-[#E6F7F6] text-[#00A99D] px-2.5 py-0.5 rounded-full border border-teal-100 animate-pulse">⚡ Gợi ý</span>
          </div>

          {/* Quick Register Slots */}
          <div className="flex-1 flex flex-col gap-2.5">
            <span className="text-[10px] font-black text-[#003B3A] uppercase tracking-wider">⚡ Tiết học gợi ý đăng ký nhanh</span>
            
            {(() => {
              const suggested = slots
                .filter(s => s.teacherId !== currentTeacher?.id && !s.registrations.some((r: any) => r.teacherId === currentTeacher?.id))
                .sort((a, b) => {
                  const getScore = (slot: any) => {
                    let score = 0;
                    const isSlotMamNon = slot.level === "Mầm non" ||
                      (slot.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");
                    
                    if (isMamNonTeacher) {
                      if (isSlotMamNon) {
                        score += 1000;
                        const slotDeptName = (slot.teacher?.departmentRel?.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                        const myDeptName = (currentTeacher?.departmentRel?.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                        const isSameDept = myDeptName !== "" && slotDeptName === myDeptName;
                        const isSameCampus = slot.campusId === currentTeacher?.campusId;
                        
                        if (isSameCampus && isSameDept) {
                          score += 500;
                        } else if (isSameCampus) {
                          score += 300;
                        } else if (isSameDept) {
                          score += 200;
                        }
                      } else {
                        score -= 1000;
                      }
                    } else {
                      if (!isSlotMamNon) {
                        score += 1000;
                        const isSameDept = checkIsMyDept(slot);
                        const isSameCampus = slot.campusId === currentTeacher?.campusId;
                        
                        if (isSameCampus && isSameDept) {
                          score += 500;
                        } else if (isSameCampus) {
                          score += 300;
                        } else if (isSameDept) {
                          score += 200;
                        }
                      } else {
                        score -= 1000;
                      }
                    }
                    return score;
                  };
                  return getScore(b) - getScore(a);
                })
                .slice(0, 3);
              
              if (suggested.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center flex-1 py-8 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <CheckCircle className="w-8 h-8 text-slate-350 mb-1 stroke-1" />
                    <p className="text-[10px] font-bold text-center">Bạn đã đăng ký hết các tiết học khả dụng!</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {suggested.map(slot => {
                    const isPastSlot = new Date(slot.date) < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                    const isMamNon = slot.level === "Mầm non";
                    return (
                      <div key={slot.id} className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold transition-all hover:scale-[1.01] hover:shadow-sm ${isMamNon ? "bg-amber-50/20 hover:bg-amber-50/40 border-amber-100" : "bg-slate-50 hover:bg-[#E6F7F6]/30 border-slate-150"}`}>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          {isMamNon ? (() => {
                            const parts = (slot.subjectName || "").split(" | ");
                            const chuDe = parts[0] || "";
                            const hoatDong = parts[1] || "";
                            const deTai = slot.topic || "";
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.2 text-[8px] font-black uppercase rounded bg-amber-100 text-amber-800">Mầm non</span>
                                  <span className="text-[10px] text-amber-900 font-extrabold truncate">Chủ đề: {chuDe}</span>
                                </div>
                                <p className="text-xs font-black text-amber-950 truncate leading-snug">Đề tài: {deTai}</p>
                                <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                  <span className="bg-amber-100/50 text-amber-850 px-1.5 py-0.2 rounded font-black text-[9px]">{hoatDong}</span>
                                  <span>Lớp: {slot.className || "Lớp"}</span>
                                </p>
                              </div>
                            );
                          })() : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.2 text-[8px] font-black uppercase rounded bg-teal-50 text-[#00A99D] border border-teal-100">K-12</span>
                                <span className="text-[10px] text-slate-500 font-bold truncate">{slot.subjectName}</span>
                              </div>
                              <p className="text-xs font-black text-slate-800 truncate leading-snug">{slot.topic}</p>
                              <p className="text-[10px] text-slate-400 font-bold">Lớp: {slot.className || "Lớp"}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-450 font-bold pt-0.5 border-t border-slate-100/60">
                            <span className="text-slate-600 font-extrabold">{slot.teacher.teacherName}</span>
                            <span>•</span>
                            <span>{new Date(slot.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</span>
                          </div>
                        </div>
                        <button 
                          disabled={isPastSlot}
                          onClick={() => setRegisterDetailSlot(slot)}
                          className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl transition-all shadow-sm flex-shrink-0 cursor-pointer hover:-translate-y-0.2 active:scale-98 ${
                            isPastSlot
                              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                              : "bg-[#00A99D] hover:bg-[#008b82] text-white"
                          }`}
                        >
                          {isPastSlot ? "Hết hạn" : "Đăng ký"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            
    </div>
        </div>

      </div>

      
      


      {/* ROW 2: Full Width Layout */}
      <div className="w-full mt-6">
        
        {/* Panel 4: Danh sách tiết dạy đang mở đăng ký */}
        <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-md p-6 flex flex-col gap-5 border-t-4 border-t-[#003B3A]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#00A99D]" />
              <span className="font-extrabold text-sm text-[#003B3A] uppercase tracking-wider">3. Danh sách tiết dạy đăng ký dự giờ</span>
              {isSearching && (
                <div className="flex items-center gap-1.5 ml-2 animate-pulse text-xs font-semibold">
                  <div className="w-2 h-2 border border-sky-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-bold text-sky-600">Đang cập nhật...</span>
                </div>
              )}
            </div>

            {/* Department tabs selector */}
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const openSlots = slots.filter(s => s.teacherId !== currentTeacher?.id && !s.registrations.some((r: any) => r.teacherId === currentTeacher?.id));
                const myDeptCount = openSlots.filter(s => checkIsMyDept(s)).length;
                const otherDeptCount = openSlots.filter(s => !checkIsMyDept(s)).length;
                const allCount = openSlots.length;

                return (
                  <>
                    <button onClick={() => setActiveDeptTab("my-dept")}
                      className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all duration-300 shadow-xs border flex items-center gap-1.5 ${activeDeptTab === "my-dept" ? "bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white border-transparent shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <span>🏫 Tiết dạy thuộc TCM</span>
                      <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-black ${activeDeptTab === "my-dept" ? "bg-white/20 text-white" : "bg-teal-50 text-teal-700 border border-teal-200"}`}>
                        {myDeptCount}
                      </span>
                    </button>
                    <button onClick={() => setActiveDeptTab("other-dept")}
                      className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all duration-300 shadow-xs border flex items-center gap-1.5 ${activeDeptTab === "other-dept" ? "bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white border-transparent shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <span>🌐 Tiết dạy TCM khác</span>
                      <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-black ${activeDeptTab === "other-dept" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                        {otherDeptCount}
                      </span>
                    </button>
                    <button onClick={() => setActiveDeptTab("all")}
                      className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all duration-300 shadow-xs border flex items-center gap-1.5 ${activeDeptTab === "all" ? "bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white border-transparent shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <span>⭐ Tất cả tiết dạy</span>
                      <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-black ${activeDeptTab === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                        {allCount}
                      </span>
                    </button>
                  </>
                );
              
    </div>
          </div>

          {/* Advanced filters inputs block */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-semibold">
            {/* Campus */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cơ sở</span>
              <select value={filterCampusId} onChange={e => setFilterCampusId(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none">
                <option value="all">Tất cả cơ sở</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
              </select>
            </div>

            {/* Level */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Bậc học</span>
              <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setFilterGrade("all"); }}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none">
                <option value="all">Tất cả bậc</option>
                <option value="Mầm non">Mầm non</option>
                <option value="Phổ thông K-12">Phổ thông K-12</option>
              </select>
            </div>

            {/* Grade */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Khối lớp</span>
              <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} disabled={filterLevel === "all"}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none disabled:opacity-55">
                <option value="all">Tất cả khối</option>
                {getGradesForLevel(filterLevel).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ngày dạy</span>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-1.5 bg-white text-slate-800 outline-none" />
            </div>

            {/* Period */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tiết dạy</span>
              <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none">
                <option value="all">Tất cả tiết</option>
                {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={`Tiết ${p}`}>Tiết {p}</option>)}
              </select>
            </div>
          </div>

          {/* Active Tags */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeFilterTags.map(tag => (
                <span key={tag.key} className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-lg bg-[#E6F7F6] text-[#00A99D] border border-[#00A99D]/10">
                  <span>{tag.label}:</span> {tag.value}
                  <button onClick={tag.onRemove} className="ml-1 p-0.5 rounded-full hover:bg-[#00A99D]/20 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button onClick={clearAllFilters} className="text-[10px] font-black text-rose-500 hover:underline ml-1">Xóa tất cả bộ lọc</button>
            </div>
          )}

          {/* Slots Table */}
          {tabFilteredSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-450 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <Calendar className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
              {(() => {
                const openSlots = slots.filter(s => s.teacherId !== currentTeacher?.id && !s.registrations.some((r: any) => r.teacherId === currentTeacher?.id));
                const otherCount = openSlots.filter(s => !checkIsMyDept(s)).length;
                return (
                  <div className="text-center space-y-1.5">
                    <p className="text-xs font-bold text-slate-700">Không tìm thấy tiết dạy dự giờ nào{activeDeptTab === "my-dept" ? " thuộc Tổ Chuyên Môn của bạn" : ""}!</p>
                    <p className="text-[10px] text-slate-400">Thay đổi bộ lọc hoặc tạo thêm tiết dạy của bạn ở Panel 1.</p>
                    {activeDeptTab === "my-dept" && otherCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveDeptTab("other-dept")}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-[#00A99D] bg-teal-50 hover:bg-[#00A99D] hover:text-white rounded-xl border border-teal-200 transition-all cursor-pointer shadow-xs"
                      >
                        ⚡ Xem ngay {otherCount} tiết dạy mở tại các Tổ Chuyên Môn khác
                      </button>
                    )}
                  </div>
                );
              
    </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-150">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="p-4">Giáo viên</th>
                    <th className="p-4">Môn học & Chủ đề</th>
                    <th className="p-4">Thời gian / Phòng</th>
                    <th className="p-4 text-center">Số chỗ</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Đăng ký</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                  {tabFilteredSlots.map(slot => {
                    const isHost = slot.teacherId === currentTeacher?.id;
                    const myReg = slot.registrations.find((r: any) => r.teacherId === currentTeacher?.id);
                    const isRegistered = !!myReg;
                    const observerCount = slot.registrations.length;
                    const slotDate = new Date(slot.date);
                    
                    // Expired (Hết hạn) check compared to today's date
                    const today = new Date();
                    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const isExpired = slotDate < todayStart;

                    return (
                      <tr key={slot.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-bold text-slate-800">
                          <p className="font-extrabold">{slot.teacher.teacherName}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Mã: {slot.teacher.teacherCode}</p>
                        </td>
                        <td className="p-4">
                          {slot.level === "Mầm non" ? (() => {
                            const parts = (slot.subjectName || "").split(" | ");
                            const chuDe = parts[0] || "";
                            const hoatDong = parts[1] || "";
                            const deTai = slot.topic || "";
                            return (
                              <div className="flex flex-col gap-1 text-xs">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 text-[8px] font-black uppercase rounded bg-amber-50 text-amber-700 border border-amber-250">Mầm non</span>
                                  <span className="text-[10px] font-bold text-amber-900 bg-amber-50/40 px-1.5 py-0.2 rounded border border-amber-100/50">Chủ đề: {chuDe}</span>
                                </div>
                                <p className="font-black text-amber-950 text-[13px] leading-snug">Đề tài: {deTai}</p>
                                <p className="text-[10px] text-slate-500 font-semibold">
                                  Hoạt động: <span className="text-amber-800 font-bold">{hoatDong}</span> • Lớp: {slot.className || "Chưa xếp"} ({slot.campusName || "Cơ sở"})
                                </p>
                              </div>
                            );
                          })() : (
                            <>
                              <p className="font-extrabold text-[#003B3A]">{slot.topic}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {slot.subjectName} • {slot.className || "Lớp"} ({slot.campusName || "Cơ sở"})
                              </p>
                            </>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="font-bold">{slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                          <p className="text-[10px] text-[#00A99D] font-bold mt-0.5">
                            {slot.startTime} • Phòng: {slot.room || "X"}
                          </p>
                        </td>
                        <td className="p-4 text-center font-black">
                          <span className={`px-2 py-0.5 rounded-md ${observerCount >= slot.maxSeats ? "bg-slate-100 text-slate-500" : "bg-sky-50 text-sky-700"}`}>
                            {observerCount} / {slot.maxSeats}
                          </span>
                        </td>
                        <td className="p-4">
                          {isExpired ? (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-rose-50 border border-rose-200 text-rose-600">
                              Hết hạn
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-emerald-50 border border-emerald-250 text-emerald-700">
                              Mở đăng ký
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                           {isExpired ? (
                             <button 
                               disabled
                               className="px-3 py-1.5 text-[10px] font-black rounded-xl bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                             >
                               Hết hạn
                             </button>
                           ) : isRegistered ? (
                             <button onClick={() => handleCancelRegistration(myReg.id)}
                               className="px-3 py-1.5 text-[10px] font-black bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200">
                               Hủy dự
                             </button>
                           ) : (
                             <button 
                               onClick={() => setRegisterDetailSlot(slot)}
                               className="px-3 py-1.5 text-[10px] font-black rounded-xl transition-all shadow-sm bg-[#00A99D] hover:bg-[#008b82] text-white"
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

      </div>

            {/* Panel 3: Lịch dạy & dự giờ của tôi (1 hàng riêng, chia thành 2 hàng con) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-md p-6 flex flex-col gap-6 border-t-4 border-t-[#00A99D] mt-6">
        <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
          <Calendar className="w-5 h-5 text-[#00A99D]" />
          <span className="font-extrabold text-sm text-[#003B3A] uppercase tracking-wider">4. Lịch dạy & dự giờ của tôi</span>
        </div>

        {/* 4.1 TIẾT DẠY CỦA TÔI */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-l-4 border-l-amber-500 pl-3">
            <span className="font-black text-xs text-[#003B3A] uppercase tracking-wider">Tiết dạy của tôi</span>
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-50 text-amber-700 rounded-md border border-amber-200">
              {slots.filter(s => s.teacherId === currentTeacher?.id).length} tiết
            </span>
          </div>

          <div className="overflow-y-auto max-h-[350px] space-y-3 custom-scrollbar pr-1">
            {(() => {
              const myTaughtSlots = slots.filter(slot => slot.teacherId === currentTeacher?.id)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

              if (myTaughtSlots.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <p className="text-xs font-bold text-center italic">Bạn chưa khởi tạo tiết dạy nào.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myTaughtSlots.map(slot => {
                    const isHost = true;
                    const slotDate = new Date(slot.date);
                    const isSchedulePastSlot = slotDate < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                    
                    return (
                      <div key={slot.id} className="p-4 rounded-2xl border flex flex-col gap-2.5 transition-all shadow-sm hover:shadow-md bg-amber-50/40 border-amber-200/80 border-l-4 border-l-amber-500">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-amber-100 text-amber-800">
                            Tôi dạy
                          </span>
                          <span className="text-[9px] font-extrabold text-slate-400">
                            {slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                          </span>
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          {slot.level === "Mầm non" ? (() => {
                            const parts = (slot.subjectName || "").split(" | ");
                            const chuDe = parts[0] || "";
                            const hoatDong = parts[1] || "";
                            const deTai = slot.topic || "";
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.2 text-[8px] font-black uppercase rounded bg-amber-50 text-amber-700 border border-amber-200">Mầm non</span>
                                  <span className="text-[9px] text-amber-900 font-bold truncate">Chủ đề: {chuDe}</span>
                                </div>
                                <h4 className="text-xs font-black text-[#78350F] leading-snug" title={deTai}>Đề tài: {deTai}</h4>
                                <p className="text-[10px] font-bold text-slate-500 truncate">
                                  Hoạt động: <span className="text-amber-800">{hoatDong}</span>
                                </p>
                                <p className="text-[9px] font-semibold text-slate-400 truncate mt-0.5">
                                  Lớp: {slot.className || "Chưa xếp"} • Tiết: {slot.startTime}
                                </p>
                                <p className="text-[9px] font-semibold text-slate-400 truncate">
                                  Gv dạy: {slot.teacher.teacherName}
                                </p>
                              </div>
                            );
                          })() : (
                            <>
                              <h4 className="text-xs font-black text-slate-800 truncate leading-tight" title={slot.topic}>{slot.topic}</h4>
                              <p className="text-[10px] font-semibold text-slate-500 truncate mt-1">
                                Lớp: {slot.className || "Chưa xếp"} • Tiết: {slot.startTime}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                                Gv dạy: {slot.teacher.teacherName}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Host's Observers list block */}
                        <div className="mt-2.5 pt-2.5 border-t border-slate-150 flex flex-col gap-1.5 w-full text-[10px] font-semibold text-slate-500">
                          <span className="font-black text-[#003B3A] uppercase tracking-wider text-[8px]">
                            GV đăng ký dự giờ ({slot.registrations.length}/4):
                          </span>
                          {slot.registrations.length === 0 ? (
                            <span className="text-slate-400 italic">Chưa có GV nào đăng ký</span>
                          ) : (
                            <div className="flex flex-col gap-1 w-full max-h-[120px] overflow-y-auto pr-0.5 custom-scrollbar">
                              {slot.registrations.map((reg: any) => {
                                const approvedCount = slot.registrations.filter((r: any) => r.isApproved).length;
                                return (
                                  <div key={reg.id} className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-150 gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-slate-800 truncate leading-snug">{reg.teacher?.teacherName || "Giáo viên"}</p>
                                      <p className="text-[8px] text-slate-400 mt-0.5 font-bold">{reg.teacher?.teacherCode || ""}</p>
                                    </div>
                                    <div className="shrink-0">
                                      {reg.isApproved ? (
                                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-black text-[8px] uppercase">Đã duyệt</span>
                                      ) : approvedCount >= 4 ? (
                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 border border-slate-200 rounded font-black text-[8px] uppercase">Đầy (Tối đa 4)</span>
                                      ) : (
                                        <button 
                                          type="button"
                                          onClick={() => handleApprove(reg.id)}
                                          className="px-2 py-0.5 bg-[#00A99D] hover:bg-[#008b82] text-white rounded font-black text-[8px] uppercase shadow-sm transition-all"
                                        >
                                          Xác nhận
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 mt-2 border-t border-slate-100 pt-2 text-[10px] w-full">
                          <button type="button" onClick={() => openEditModal(slot)}
                            className="px-2.5 py-1 text-slate-600 bg-white border border-slate-200 rounded-lg font-bold hover:bg-slate-50 transition-colors">
                            Sửa
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="px-2.5 py-1 text-rose-600 bg-white border border-rose-250 hover:bg-rose-50 rounded-lg font-bold transition-all cursor-pointer"
                          >
                            Hủy tiết
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            
    </div>
        </div>

        <hr className="border-slate-100 my-1" />

        {/* 4.2 TIẾT ĐÃ ĐĂNG KÝ DỰ GIỜ */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-l-4 border-l-[#00A99D] pl-3">
            <span className="font-black text-xs text-[#003B3A] uppercase tracking-wider">Tiết đã đăng ký dự giờ</span>
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-[#E6F7F6] text-[#00A99D] rounded-md border border-teal-100">
              {slots.filter(s => s.registrations.some((r: any) => r.teacherId === currentTeacher?.id)).length} tiết
            </span>
          </div>

          <div className="overflow-y-auto max-h-[350px] space-y-3 custom-scrollbar pr-1">
            {(() => {
              const myObservedSlots = slots.filter(slot => slot.registrations.some((r: any) => r.teacherId === currentTeacher?.id))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

              if (myObservedSlots.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <p className="text-xs font-bold text-center italic">Bạn chưa đăng ký dự giờ tiết học nào.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myObservedSlots.map(slot => {
                    const isHost = false;
                    const slotDate = new Date(slot.date);
                    const myReg = slot.registrations.find((r: any) => r.teacherId === currentTeacher?.id);
                    const isSchedulePastSlot = slotDate < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                    
                    return (
                      <div key={slot.id} className="p-4 rounded-2xl border flex flex-col gap-2.5 transition-all shadow-sm hover:shadow-md bg-teal-50/30 border-teal-200/60 border-l-4 border-l-[#00A99D]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-[#E6F7F6] text-[#00A99D]">
                            Tôi dự
                          </span>
                          <span className="text-[9px] font-extrabold text-slate-400">
                            {slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                          </span>
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          {slot.level === "Mầm non" ? (() => {
                            const parts = (slot.subjectName || "").split(" | ");
                            const chuDe = parts[0] || "";
                            const hoatDong = parts[1] || "";
                            const deTai = slot.topic || "";
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.2 text-[8px] font-black uppercase rounded bg-amber-50 text-amber-700 border border-amber-200">Mầm non</span>
                                  <span className="text-[9px] text-amber-900 font-bold truncate">Chủ đề: {chuDe}</span>
                                </div>
                                <h4 className="text-xs font-black text-[#78350F] leading-snug" title={deTai}>Đề tài: {deTai}</h4>
                                <p className="text-[10px] font-bold text-slate-500 truncate">
                                  Hoạt động: <span className="text-amber-800">{hoatDong}</span>
                                </p>
                                <p className="text-[9px] font-semibold text-slate-400 truncate mt-0.5">
                                  Lớp: {slot.className || "Chưa xếp"} • Tiết: {slot.startTime}
                                </p>
                                <p className="text-[9px] font-semibold text-slate-400 truncate">
                                  Gv dạy: {slot.teacher.teacherName}
                                </p>
                              </div>
                            );
                          })() : (
                            <>
                              <h4 className="text-xs font-black text-slate-800 truncate leading-tight" title={slot.topic}>{slot.topic}</h4>
                              <p className="text-[10px] font-semibold text-slate-500 truncate mt-1">
                                Lớp: {slot.className || "Chưa xếp"} • Tiết: {slot.startTime}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                                Gv dạy: {slot.teacher.teacherName}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 mt-2 border-t border-slate-100 pt-2 text-[10px] w-full">
                          {!myReg?.isApproved ? (
                            <div className="flex flex-col gap-1.5 w-full">
                              <span className="px-2 py-1 text-[8px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 rounded-md text-center leading-snug">
                                Chờ xác nhận GV tổ chức tiết dạy
                              </span>
                              <button type="button" onClick={() => handleCancelRegistration(myReg?.id)}
                                className="px-2.5 py-1 text-rose-600 bg-white border border-rose-200 rounded-lg font-bold hover:bg-rose-50/50 transition-all text-center">
                                Hủy đăng ký
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 w-full">
                              <span className="px-2 py-1 text-[8px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-250 rounded-md text-center leading-snug">
                                Đã xác nhận dự giờ
                              </span>
                              <button type="button" onClick={() => openEvalModal(myReg, slot)}
                                className="px-2.5 py-1 bg-[#00A99D] hover:bg-[#008b82] text-white rounded-lg font-black shadow-sm transition-all whitespace-nowrap w-full text-center">
                                {myReg?.evaluation ? "Xem đánh giá" : "Nhập đánh giá"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            
    </div>
        </div>
      </div>

      
      {/* ROW 4: Full Width Layout for Panel 6 */}
      <div className="w-full mt-6">
        {/* Panel 6: Kết quả đánh giá gần đây */}
        <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-md p-6 flex flex-col gap-5 border-t-4 border-t-[#00A99D]">
          <div className="flex items-center gap-2 border-b border-slate-150 pb-4">
            <ClipboardList className="w-5 h-5 text-[#00A99D]" />
            <span className="font-extrabold text-sm text-[#003B3A] uppercase tracking-wider">6. Kết quả đánh giá gần đây</span>
          </div>

          {receivedEvaluations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-250 rounded-2xl bg-slate-50/50">
              <ClipboardList className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
              <p className="text-xs font-bold text-center">Chưa nhận được phiếu đánh giá nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-150">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="p-4">Giáo viên dạy</th>
                    <th className="p-4">Người đánh giá</th>
                    <th className="p-4">Môn học & Chủ đề</th>
                    <th className="p-4">Thời gian / Phòng</th>
                    <th className="p-4 text-center">Kết quả</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                  {receivedEvaluations.map(evalItem => {
                    const hasPassed = evalItem.evaluation?.isPassed ?? true;
                    const slotDate = new Date(evalItem.slot.date);
                    return (
                      <tr key={evalItem.evaluation?.id || evalItem.registration?.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-bold text-slate-800">
                          <p className="font-extrabold">{evalItem.slot.teacher?.teacherName || "Giáo viên"}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Mã: {evalItem.slot.teacher?.teacherCode || ""}</p>
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          <p className="font-extrabold">{evalItem.registration?.teacher?.teacherName || "Giáo viên"}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Mã: {evalItem.registration?.teacher?.teacherCode || ""}</p>
                        </td>
                        <td className="p-4">
                          {evalItem.slot.level === "Mầm non" ? (() => {
                            const parts = (evalItem.slot.subjectName || "").split(" | ");
                            const chuDe = parts[0] || "";
                            const hoatDong = parts[1] || "";
                            const deTai = evalItem.slot.topic || "";
                            return (
                              <div className="flex flex-col gap-0.5 text-xs">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.2 text-[8px] font-black uppercase rounded bg-amber-50 text-amber-700 border border-amber-200">Mầm non</span>
                                  <span className="text-[9px] font-bold text-amber-900 bg-amber-50/40 px-1 py-0.2 rounded border border-amber-100/50">Chủ đề: {chuDe}</span>
                                </div>
                                <p className="font-bold text-[#003B3A] text-xs">Đề tài: {deTai}</p>
                                <p className="text-[10px] text-slate-500 font-semibold">
                                  Hoạt động: <span className="text-amber-800">{hoatDong}</span> • Lớp: {evalItem.slot.className || "Lớp"} ({evalItem.slot.campusName || "Cơ sở"})
                                </p>
                              </div>
                            );
                          })() : (
                            <>
                              <p className="font-extrabold text-[#003B3A]">{evalItem.evaluation?.topic || evalItem.slot.topic || "Đánh giá tiết dạy"}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {evalItem.slot.subjectName} • {evalItem.slot.className || "Lớp"} ({evalItem.slot.campusName || "Cơ sở"})
                              </p>
                            </>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="font-bold">{slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                          <p className="text-[10px] text-[#00A99D] font-bold mt-0.5">
                            {evalItem.slot.startTime} • Phòng: {evalItem.slot.room || "X"}
                          </p>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-md border ${hasPassed ? "bg-emerald-50 text-emerald-700 border-emerald-250" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                            {hasPassed ? "Đạt" : "Không đạt"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => openEvalModal(evalItem.registration, evalItem.slot)}
                            className="px-3 py-1.5 text-[10px] font-black rounded-xl transition-all shadow-sm bg-[#00A99D] hover:bg-[#008b82] text-white"
                          >
                            Xem chi tiết
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
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className={`px-6 py-5 text-white flex items-center justify-between shrink-0 ${isMamNonTeacher ? "bg-amber-950 border-b border-amber-900" : "bg-[#003B3A]"}`}>
              <div>
                <h3 className="font-black text-lg">{isMamNonTeacher ? (editSlotId ? "Cập nhật tiết dạy Mầm non" : "Thêm mới tiết dạy Mầm non") : (editSlotId ? "Cập nhật tiết dạy" : "Thêm mới tiết dạy")}</h3>
                <p className="text-white/60 text-xs mt-0.5">{isMamNonTeacher ? "Biểu mẫu thiết lập tiết dạy Mầm non" : "Tạo tiết dạy để giáo viên khác đăng ký dự giờ"}</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><X className="w-5 h-5 text-white/80" /></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div className="flex items-center justify-between gap-3 p-4 text-sky-800 text-xs font-semibold">
                <div className="flex items-center gap-2"><Info className="w-4 h-4 text-sky-600 shrink-0" /><span className="text-xs font-semibold">Bạn có thể tạo tối đa 2 tiết dạy mỗi tháng.</span></div>
                <span className="text-xs font-bold bg-sky-200/50 px-2 py-0.5 rounded-md text-sky-900 shrink-0">Đã tạo trong {selectedMonthStr}: <span className="font-black">{monthlyLimitCount}/2</span> tiết</span>
              </div>
              {isMamNonTeacher ? (
                /* ===== MAM NON EDIT FORM ===== */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Chu de */}
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-black text-amber-700 uppercase tracking-wide">Chủ đề *</label>
                    <input type="text" placeholder="Ví dụ: Thế giới động vật, Gia đình..." value={newChuDe} onChange={e => setNewChuDe(e.target.value)} required
                      className="w-full text-xs font-bold p-3 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none rounded-xl border border-amber-200/80 bg-amber-50/10 hover:bg-amber-50/20 focus:bg-white transition-all shadow-inner-sm" />
                  </div>
                  {/* Hoat dong */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-amber-700 uppercase tracking-wide">Hoạt động *</label>
                    <input type="text" placeholder="Ví dụ: Âm nhạc, Tạo hình, KPKH..." value={newHoatDong} onChange={e => setNewHoatDong(e.target.value)} required
                      className="w-full text-xs font-bold p-3 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none rounded-xl border border-amber-200/80 bg-amber-50/10 hover:bg-amber-50/20 focus:bg-white transition-all shadow-inner-sm" />
                  </div>
                  {/* De tai */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-amber-700 uppercase tracking-wide">Đề tài *</label>
                    <input type="text" placeholder="Ví dụ: Bé yêu các con vật..." value={newDeTai} onChange={e => setNewDeTai(e.target.value)} required
                      className="w-full text-xs font-bold p-3 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none rounded-xl border border-amber-200/80 bg-amber-50/10 hover:bg-amber-50/20 focus:bg-white transition-all shadow-inner-sm" />
                  </div>
                  {/* Campus */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-amber-700 uppercase tracking-wide">Cơ sở *</label>
                    <select value={newCampusId} onChange={e => { setNewCampusId(e.target.value); setNewClassId("") }} required
                      className="w-full text-xs font-bold p-3 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none rounded-xl border border-amber-200/80 bg-white hover:bg-amber-50/10 transition-all">
                      <option value="">Chọn cơ sở</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                    </select>
                  </div>
                  {/* Grade */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-amber-700 uppercase tracking-wide">Khối học *</label>
                    <select value={newGrade} onChange={e => { setNewGrade(e.target.value); setNewClassId("") }} required
                      className="w-full text-xs font-bold p-3 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none rounded-xl border border-amber-200/80 bg-white hover:bg-amber-50/10 transition-all">
                      <option value="">Chọn khối học</option>
                       {mamNonGrades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  {/* Class */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-amber-700 uppercase tracking-wide">Tên lớp *</label>
                    <select value={newClassId} onChange={e => setNewClassId(e.target.value)} required disabled={!newCampusId || !newGrade}
                      className="w-full text-xs font-bold p-3 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none rounded-xl border border-amber-200/80 bg-white disabled:opacity-50 hover:bg-amber-50/10 transition-all">
                      <option value="">Chọn tên lớp</option>
                      {filteredClassesForCreation.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                    </select>
                  </div>
                  {/* Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Ngày dạy *</label>
                    <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required
                      className="w-full text-xs font-semibold p-2.5 text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none rounded-xl border border-slate-200" />
                  </div>
                  {/* PDF Upload */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Upload Giáo án (PDF) <span className="text-slate-400 font-normal">(không bắt buộc)</span></label>
                    <div className="flex items-center gap-2">
                      <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="pdf-upload-file-modal" />
                      <label htmlFor="pdf-upload-file-modal" className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-all">
                        <FileText className="w-4 h-4 text-slate-500" />{newLessonPlanName ? "Thay đổi File PDF" : "Chọn File PDF..."}
                      </label>
                      {newLessonPlanName && (
                        <button type="button" onClick={() => { setNewLessonPlanName(""); setNewLessonPlanData(""); if (fileInputRef.current) fileInputRef.current.value = "" }}
                          className="p-2 hover:bg-rose-100 text-rose-600 transition-all text-xs font-semibold" title="Xóa file đã chọn"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                    {newLessonPlanName && <span className="text-[10px] font-bold text-amber-600 mt-1 truncate max-w-full block">Đã chọn: {newLessonPlanName}</span>}
                  </div>
                  {/* Period */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3 items-end p-4 text-xs font-semibold bg-amber-50/20 border border-amber-100 rounded-2xl">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Tiết dạy: Từ *</label>
                      <select value={newStartTime} onChange={e => { setNewStartTime(e.target.value); setNewEndTime(e.target.value); }}
                        className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none">
                        {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={`Tiết ${p}`}>Tiết {p}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Đến *</label>
                      <select value={newEndTime} disabled={true}
                        className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50">
                        {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={`Tiết ${p}`}>Tiết {p}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pb-2 h-[42px] pl-2 text-slate-400">
                      <input type="checkbox" id="isDoublePeriodModal" checked={false} disabled={true}
                        className="w-4 h-4 rounded text-slate-300 focus:ring-slate-350" />
                      <label htmlFor="isDoublePeriodModal" className="text-xs font-bold select-none cursor-pointer">Dạy 2 tiết liên tiếp (K12)</label>
                    </div>
                  </div>
                </div>
              ) : (
                /* ===== K12 EDIT FORM ===== */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Level */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-slate-550 uppercase tracking-wide">Cấp học *</label>
                    <select value={newLevel} onChange={e => { setNewLevel(e.target.value); setNewGrade(""); setNewClassId("") }} required
                      className="w-full text-xs font-bold p-3 text-slate-800 focus:ring-2 focus:ring-[#00A99D] focus:border-transparent outline-none rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-all">
                      <option value="">Chọn cấp học</option>
                      <option value="Mầm non">Mầm non</option>
                      <option value="Tiểu học">Tiểu học</option>
                      <option value="THCS">THCS</option>
                      <option value="THPT">THPT</option>
                    </select>
                  </div>
                  {/* Grade */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-slate-550 uppercase tracking-wide">Khối lớp *</label>
                    <select value={newGrade} onChange={e => { setNewGrade(e.target.value); setNewClassId("") }} required disabled={!newLevel}
                      className="w-full text-xs font-bold p-3 text-slate-800 focus:ring-2 focus:ring-[#00A99D] focus:border-transparent outline-none rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-all disabled:opacity-50">
                      <option value="">Chọn khối lớp</option>
                      {getGradesForLevel(newLevel).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  {/* Subject */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-slate-550 uppercase tracking-wide">Môn học *</label>
                    <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)} required
                      className="w-full text-xs font-bold p-3 text-slate-800 focus:ring-2 focus:ring-[#00A99D] focus:border-transparent outline-none rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-all">
                      <option value="">Chọn môn học</option>
                      {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.subjectName}</option>)}
                      <option value="other">Môn học khác / Tổ nhóm chuyên đề</option>
                    </select>
                  </div>
                  {newSubjectId === "other" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Tên môn học khác *</label>
                      <input type="text" placeholder="Nhập tên môn học..." value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} required
                        className="w-full text-sm p-2.5 text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none text-xs font-semibold" />
                    </div>
                  )}
                  {/* Campus */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Cơ sở *</label>
                    <select value={newCampusId} onChange={e => { setNewCampusId(e.target.value); setNewClassId("") }} required
                      className="w-full text-sm p-2.5 text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none text-xs font-semibold">
                      <option value="">Chọn cơ sở</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                    </select>
                  </div>
                  {/* Class */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Lớp học *</label>
                    <select value={newClassId} onChange={e => setNewClassId(e.target.value)} required disabled={!newCampusId || !newLevel || !newGrade}
                      className="w-full text-sm p-2.5 text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none disabled:opacity-50 text-xs font-semibold">
                      <option value="">Chọn lớp học</option>
                      {filteredClassesForCreation.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                      <option value="other">Lớp học khác (Nhập tay...)</option>
                    </select>
                  </div>
                  {newClassId === "other" && (
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-extrabold text-slate-700">Nhập tên lớp học khác *</label>
                      <input type="text" placeholder="Nhập tên lớp học (ví dụ: Lớp 2.1, Nhà trẻ A...)" value={newClassNameText} onChange={e => setNewClassNameText(e.target.value)} required
                        className="w-full text-sm p-2.5 text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none text-xs font-semibold" />
                    </div>
                  )}
                  {/* Topic */}
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Bài dạy / Chủ đề *</label>
                    <input type="text" placeholder="Nhập tên bài dạy hoặc chủ đề sinh hoạt..." value={newTopic} onChange={e => setNewTopic(e.target.value)} required
                      className="w-full text-sm p-2.5 text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none text-xs font-semibold" />
                  </div>
                  {/* Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Ngày dạy *</label>
                    <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required
                      className="w-full text-sm p-2.5 text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none text-xs font-semibold" />
                  </div>
                  {/* PDF Upload */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Upload Giáo án (PDF) <span className="text-slate-400 font-normal">(không bắt buộc)</span></label>
                    <div className="flex items-center gap-2">
                      <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="pdf-upload-file-modal-k12" />
                      <label htmlFor="pdf-upload-file-modal-k12" className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-all">
                        <FileText className="w-4 h-4 text-slate-500" />{newLessonPlanName ? "Thay đổi File PDF" : "Chọn File PDF..."}
                      </label>
                      {newLessonPlanName && (
                        <button type="button" onClick={() => { setNewLessonPlanName(""); setNewLessonPlanData(""); if (fileInputRef.current) fileInputRef.current.value = "" }}
                          className="p-2 hover:bg-rose-100 text-rose-600 transition-all text-xs font-semibold" title="Xóa file đã chọn"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                    {newLessonPlanName && <span className="text-[10px] font-bold text-[#00A99D] mt-1 truncate max-w-full block">Đã chọn: {newLessonPlanName}</span>}
                  </div>
                  {/* Period */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3 items-end p-4 text-xs font-semibold">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Tiết dạy: Từ *</label>
                      <select value={newStartTime} onChange={e => handleStartTimeChange(e.target.value)}
                        className="w-full text-sm rounded-xl border border-slate-200 p-2 bg-white text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none">
                        {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Đến *</label>
                      <select value={newEndTime} disabled={newIsDoublePeriod} onChange={e => setNewEndTime(e.target.value)}
                        className="w-full text-sm rounded-xl border border-slate-200 p-2 bg-white text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none disabled:opacity-50">
                        {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pb-2 h-[42px] pl-2">
                      <input type="checkbox" id="isDoublePeriod" checked={newIsDoublePeriod} disabled={newStartTime === "Tiết 8"} onChange={e => handleDoublePeriodChange(e.target.checked)}
                        className="w-4 h-4 rounded text-[#00A99D] focus:ring-[#00A99D]" />
                      <label htmlFor="isDoublePeriod" className="text-xs font-extrabold text-slate-600 select-none cursor-pointer">Dạy 2 tiết liên tiếp</label>
                    </div>
                  </div>
                </div>
              )}
              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700">Mô tả nội dung tiết dạy (không bắt buộc)</label>
                  <span className="text-[10px] font-bold text-slate-400">{newDescription.length}/500</span>
                </div>
                <textarea placeholder="Nhập mô tả ngắn về nội dung, mục tiêu, phương pháp dạy học..." maxLength={500} rows={3} value={newDescription} onChange={e => setNewDescription(e.target.value)}
                  className="w-full text-sm p-3 text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none resize-none text-xs font-semibold" />
              </div>
              {/* Visibility */}
              <div className="flex flex-col gap-2.5 p-4 text-xs font-semibold">
                <label className="text-xs font-extrabold text-slate-700">Hiển thị cho giáo viên</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none cursor-pointer">
                    <input type="radio" name="visibility" checked={newVisibility === "ALL"} onChange={() => setNewVisibility("ALL")} className="w-4 h-4 text-[#00A99D] focus:ring-[#00A99D]" />
                    Tất cả giáo viên trong trường
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none cursor-pointer">
                    <input type="radio" name="visibility" checked={newVisibility === "DEPARTMENT"} onChange={() => setNewVisibility("DEPARTMENT")} className="w-4 h-4 text-[#00A99D] focus:ring-[#00A99D]" />
                    Chỉ các tổ nhóm chuyên môn
                  </label>
                </div>
                {newVisibility === "DEPARTMENT" && (
                  <div className="flex flex-col gap-1.5 mt-2 animate-in fade-in duration-200">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chọn tổ nhóm *</label>
                    <select value={newTargetDeptId} onChange={e => setNewTargetDeptId(e.target.value)} required
                      className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-[#00A99D] outline-none">
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
                  className={`px-6 py-2.5 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl transition-all shadow-md text-sm shrink-0 ${isMamNonTeacher ? "bg-amber-600 hover:bg-amber-700" : "bg-[#00A99D] hover:bg-[#008B85]"}`}>
                  {submitting ? "Đang lưu..." : (editSlotId ? "Cập nhật" : "Lưu tiết dạy")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Details Modal */}
      {registerDetailSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="px-6 py-5 bg-[#003B3A] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-base">Thông tin & Đăng ký Dự giờ</h3>
                <p className="text-white/60 text-[10px] mt-0.5">Vui lòng kiểm tra kỹ thông tin tiết dạy trước khi đăng ký</p>
              </div>
              <button 
                onClick={() => setRegisterDetailSlot(null)} 
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs font-semibold">
              {registerDetailSlot.level === "Mầm non" ? (() => {
                const parts = (registerDetailSlot.subjectName || "").split(" | ");
                const chuDe = parts[0] || "";
                const hoatDong = parts[1] || "";
                const deTai = registerDetailSlot.topic || "";
                return (
                  <>
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/50 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-amber-100 text-amber-800 border border-amber-250">Mầm non</span>
                        <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider">Chủ đề: {chuDe}</span>
                      </div>
                      <h4 className="text-sm font-black text-[#78350F] leading-snug">Đề tài: {deTai}</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Giáo viên giảng dạy</span>
                        <span className="text-xs font-bold text-slate-800 mt-1">{registerDetailSlot.teacher?.teacherName || "Chưa rõ"}</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">{registerDetailSlot.teacher?.teacherCode || ""}</span>
                      </div>
                      
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Lớp học & Hoạt động</span>
                        <span className="text-xs font-bold text-slate-800 mt-1">{registerDetailSlot.className || "Chưa xếp lớp"}</span>
                        <span className="text-[9px] text-amber-700 font-bold mt-0.5">Hoạt động: {hoatDong}</span>
                      </div>
                      
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Thời gian</span>
                        <span className="text-xs font-bold text-slate-800 mt-1">{registerDetailSlot.startTime}</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          {new Date(registerDetailSlot.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </span>
                      </div>
                      
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Địa điểm</span>
                        <span className="text-xs font-bold text-slate-800 mt-1">Phòng: {registerDetailSlot.room || "Chưa xếp phòng"}</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">{registerDetailSlot.campus?.campusName || ""}</span>
                      </div>
                    </div>
                  </>
                );
              })() : (
                <>
                  <div className="bg-[#E6F7F6]/30 p-4 rounded-2xl border border-emerald-100/50">
                    <span className="text-[9px] font-black text-[#00A99D] uppercase tracking-wider">Tên bài dạy / Chủ đề</span>
                    <h4 className="text-sm font-black text-[#003B3A] mt-1 leading-snug">{registerDetailSlot.topic}</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Giáo viên giảng dạy</span>
                      <span className="text-xs font-bold text-slate-800 mt-1">{registerDetailSlot.teacher?.teacherName || "Chưa rõ"}</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">{registerDetailSlot.teacher?.teacherCode || ""}</span>
                    </div>
                    
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Lớp học / Môn học</span>
                      <span className="text-xs font-bold text-slate-800 mt-1">{registerDetailSlot.className || "Chưa xếp lớp"}</span>
                      <span className="text-[9px] text-[#00A99D] font-bold mt-0.5">{registerDetailSlot.subjectCode || "Môn học"}</span>
                    </div>
                    
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Thời gian</span>
                      <span className="text-xs font-bold text-slate-800 mt-1">{registerDetailSlot.startTime}</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">
                        {new Date(registerDetailSlot.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </span>
                    </div>
                    
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Địa điểm</span>
                      <span className="text-xs font-bold text-slate-800 mt-1">Phòng: {registerDetailSlot.room || "Chưa xếp phòng"}</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">{registerDetailSlot.campus?.campusName || ""}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-150">
                <span className="text-[10px] font-black text-slate-400 uppercase">Hình thức đăng ký</span>
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                  new Date(registerDetailSlot.date) < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-250"
                }`}>
                  {new Date(registerDetailSlot.date) < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
                    ? "Dự giờ bù"
                    : "Dự giờ chính thức"}
                </span>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setRegisterDetailSlot(null)} 
                className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all text-xs"
              >
                Hủy bỏ
              </button>
              {(() => {
                const slotDate = new Date(registerDetailSlot.date);
                const today = new Date();
                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const isExpired = slotDate < todayStart;
                return (
                  <button 
                    type="button" 
                    disabled={isExpired}
                    onClick={() => handleRegister(registerDetailSlot.id)} 
                    className="px-5 py-2 bg-[#00A99D] hover:bg-[#008b82] disabled:bg-slate-200 disabled:text-slate-450 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-xs shadow-md"
                  >
                    {isExpired ? "Đã hết hạn" : "Xác nhận Đăng ký"}
                  </button>
                );
              
    </div>
          </div>
        </div>
      )}

      <ObservationVideoGuideModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} />

      {/* Evaluation Modal */}
      {renderEvalModal()}
                </div>
                {evalModal.slot.level === "Mầm non" ? (() => {
                  const parts = (evalModal.slot.subjectName || "").split(" | ");
                  const chuDe = parts[0] || "";
                  const hoatDong = parts[1] || "";
                  const deTai = evalModal.slot.topic || "";
                  return (
                    <p className="text-white/70 text-xs mt-0.5">
                      Đề tài: <span className="font-extrabold text-white">{deTai}</span> • Chủ đề: <span className="font-extrabold text-white">{chuDe}</span> • Hoạt động: <span className="font-extrabold text-white">{hoatDong}</span>
                    </p>
                  );
                })() : (
                  <p className="text-white/70 text-xs mt-0.5">Bài dạy: {evalModal.slot.topic}</p>
                )}
              </div>
              <button onClick={() => setEvalModal(null)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><X className="w-5 h-5 text-white/80" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Evaluation Form Sections */}
              {evalModal.slot.level !== "Mầm non" ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 text-xs font-semibold">
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
                              <div key={req.id} className="p-4 bg-slate-50/60 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all duration-200 flex flex-col md:flex-row md:items-start justify-between gap-4 text-xs font-semibold">
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 text-[9px] font-extrabold bg-slate-200 text-slate-700 rounded-md uppercase tracking-wider">{req.label}</span>
                                    <span className="text-[10px] font-bold text-slate-400">(Tối đa: {req.max}đ)</span>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">{req.text}</p>
                                  
                                  {/* Warning message for core requirements (1, 3, 6, 7) */}
                                  {[1, 3, 6, 7].includes(req.id) && (
                                    <div className={`mt-2 p-2 rounded-xl text-[10px] font-bold border transition-all ${
                                      (() => {
                                        const score = evalK12Scores[globalIdx] || 0;
                                        if (req.id === 1) {
                                          return score === 1.5 
                                            ? "bg-emerald-50 border-emerald-200/60 text-emerald-700" 
                                            : "bg-amber-50 border-amber-200/60 text-amber-700";
                                        }
                                        if (req.id === 3 || req.id === 6) {
                                          if (score < 1.0) return "bg-rose-50 border-rose-200/60 text-rose-700";
                                          if (score < 2.0) return "bg-amber-50 border-amber-200/60 text-amber-700";
                                          return "bg-emerald-50 border-emerald-200/60 text-emerald-700";
                                        }
                                        if (req.id === 7) {
                                          if (score < 1.0) return "bg-rose-50 border-rose-200/60 text-rose-700";
                                          if (score < 2.0) return "bg-amber-50 border-amber-200/60 text-amber-700";
                                          if (score < 3.0) return "bg-amber-50 border-amber-200/60 text-amber-700";
                                          return "bg-emerald-50 border-emerald-200/60 text-emerald-700";
                                        }
                                        return "";
                                      })()
                                    }`}>
                                      <div className="flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span>
                                          {(() => {
                                            const score = evalK12Scores[globalIdx] || 0;
                                            if (req.id === 1) {
                                              return score === 1.5
                                                ? "Yêu cầu chốt chặn: Đã đạt điểm tối đa (1.50đ) để xếp loại Giỏi."
                                                : "Yêu cầu chốt chặn: Điểm chưa đạt tối đa (1.50đ). Tiết dạy không thể xếp loại Giỏi.";
                                            }
                                            if (req.id === 3 || req.id === 6) {
                                              const label = req.id === 3 ? "Yêu cầu 3" : "Yêu cầu 6";
                                              if (score < 1.0) return `${label} chốt chặn: Điểm dưới 1.0đ. Tiết dạy sẽ bị Không xếp loại (cần tối thiểu 1.0đ cho loại Trung bình).`;
                                              if (score < 2.0) return `${label} chốt chặn: Điểm dưới 2.0đ. Tiết dạy chỉ có thể xếp loại Trung bình (cần tối thiểu 2.0đ cho loại Khá/Giỏi).`;
                                              return `${label} chốt chặn: Đã đạt điểm tối đa (2.00đ) để xếp loại Khá/Giỏi.`;
                                            }
                                            if (req.id === 7) {
                                              if (score < 1.0) return "Yêu cầu 7 chốt chặn: Điểm dưới 1.0đ. Tiết dạy sẽ bị Không xếp loại (cần tối thiểu 1.0đ cho loại Trung bình).";
                                              if (score < 2.0) return "Yêu cầu 7 chốt chặn: Điểm dưới 2.0đ. Tiết dạy chỉ có thể xếp loại Trung bình (cần tối thiểu 2.0đ cho loại Khá/Giỏi).";
                                              if (score < 3.0) return "Yêu cầu 7 chốt chặn: Điểm dưới 3.0đ. Tiết dạy tối đa chỉ xếp loại Khá (cần tối đa 3.0đ cho loại Giỏi).";
                                              return "Yêu cầu 7 chốt chặn: Đã đạt điểm tối đa (3.00đ) để xếp loại Giỏi.";
                                            }
                                            return "";
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                  )}
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
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 text-xs font-semibold">
                    <span className="text-xs font-black text-amber-800 uppercase tracking-wide">Tổng điểm tự động tính:</span>
                    <span className="text-base font-black text-amber-900 bg-white px-4 py-1.5 rounded-xl shadow-sm border border-amber-100">
                      {evalCriteria.reduce((a, b) => a + b, 0).toFixed(2)} / 10.00 điểm
                    </span>
                  </div>
                  {MAMNON_SECTIONS.map((sec, sIdx) => {
                    let reqStartIdx = 0;
                    for (let i = 0; i < sIdx; i++) {
                      reqStartIdx += MAMNON_SECTIONS[i].requirements.length;
                    }

                    return (
                      <div key={sIdx} className="space-y-4">
                        <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                          <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-md flex items-center justify-center text-[10px] font-black">{sIdx + 1}</span>
                          {sec.name}
                        </h4>
                        <div className="space-y-3">
                          {sec.requirements.map((req, rSubIdx) => {
                            const globalIdx = reqStartIdx + rSubIdx;
                            const options = [];
                            for (let v = 0; v <= req.max; v += 0.25) {
                              options.push(Math.round(v * 100) / 100);
                            }

                            return (
                              <div key={req.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4 text-xs font-semibold">
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
                                    value={evalCriteria[globalIdx]}
                                    onChange={(e) => {
                                      const nextCriteria = [...evalCriteria];
                                      nextCriteria[globalIdx] = parseFloat(e.target.value);
                                      setEvalCriteria(nextCriteria);
                                      const nextRank = calculateMamNonRanking(nextCriteria);
                                      setEvalOverall(nextRank);
                                    }}
                                    disabled={isReadOnly} className="rounded-xl border border-slate-200 p-2 bg-white text-sm font-black text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none w-28 shadow-sm disabled:opacity-75 disabled:bg-slate-150"
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
                    disabled={isReadOnly} className="w-full text-sm p-3 text-slate-800 focus:ring-2 focus:ring-violet-500 outline-none resize-none disabled:opacity-75 disabled:bg-slate-100 text-xs font-semibold" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Góp ý cải thiện / xây dựng</label>
                  <textarea placeholder="Những điểm có thể cải thiện, gợi ý phương pháp thay thế..." rows={3} value={evalImprovements} onChange={e => setEvalImprovements(e.target.value)}
                    disabled={isReadOnly} className="w-full text-sm p-3 text-slate-800 focus:ring-2 focus:ring-violet-500 outline-none resize-none disabled:opacity-75 disabled:bg-slate-100 text-xs font-semibold" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Nhận xét chung</label>
                  <textarea placeholder="Tổng thể nhận xét của bạn về tiết dự giờ..." rows={2} value={evalGeneral} onChange={e => setEvalGeneral(e.target.value)}
                    disabled={isReadOnly} className="w-full text-sm p-3 text-slate-800 focus:ring-2 focus:ring-violet-500 outline-none resize-none disabled:opacity-75 disabled:bg-slate-100 text-xs font-semibold" />
                </div>
              </div>

              {/* Overall Rating */}
              <div className="flex flex-col gap-3 p-4 text-xs font-semibold">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Xếp loại tiết dạy tổng thể *</label>
                    {evalModal.slot.level !== "Mầm non" && (
                      <span className="text-xs font-black text-violet-700 text-xs font-semibold">
                        Tổng điểm: {evalK12Scores.reduce((a, b) => a + b, 0).toFixed(2)}/20đ
                      </span>
                    )}
                    {evalOverall && (() => {
                      const isK12 = evalModal.slot.level !== "Mầm non";
                      const score = isK12 ? evalK12Scores.reduce((a, b) => a + b, 0) : null;
                      const passed = isK12
                        ? (score !== null ? score >= 14 : (evalOverall === "Giỏi" || evalOverall === "Khá"))
                        : (evalOverall === "Tốt" || evalOverall === "Khá" || evalOverall === "Đạt");
                      return passed ? (
                        <span className="text-emerald-700 text-[10px] font-black uppercase tracking-wider text-xs font-semibold">ĐẠT</span>
                      ) : (
                        <span className="text-rose-700 text-[10px] font-black uppercase tracking-wider text-xs font-semibold">CHƯA ĐẠT</span>
                      );
                    
    </div>
                  {evalModal.slot.level !== "Mầm non" ? (
                    <span className="text-[10px] font-black bg-violet-100 text-violet-700 px-2 py-0.5 rounded-md">
                      Tự động gợi ý: {calculateK12Ranking(evalK12Scores)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">
                      Tự động gợi ý: {calculateMamNonRanking(evalCriteria)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(evalModal.slot.level !== "Mầm non"
                    ? [["Giỏi","bg-emerald-500"],["Khá","bg-sky-500"],["Trung bình","bg-amber-400"],["Không xếp loại","bg-rose-500"]]
                    : [["Tốt","bg-emerald-500"],["Khá","bg-sky-500"],["Đạt","bg-amber-400"],["Không đạt","bg-rose-500"]]
                  ).map(([r, color]) => (
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
        )
      )}
      <ObservationVideoGuideModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} />
    </div>
  )
}