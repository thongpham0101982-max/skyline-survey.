"use client"
import { useState, useMemo, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { updateTeacherObservationTargets } from "@/app/teacher/du-gio/actions"
import toast, { Toaster } from "react-hot-toast"
import * as XLSX from "xlsx"
import { 
  ClipboardList, CheckCircle, CheckCircle2, PieChart, Calendar, Layers,
  ChevronDown, ChevronUp, AlertCircle, Plus, Search, X, Check,
  BookOpen, User, Award, ThumbsUp, MessageSquare, GraduationCap,
  Eye, Settings, Sparkles, Filter, TrendingUp, BarChart3, School,
  Baby, Building2, Star, CheckCheck, Clock, Mail, Send, FileSpreadsheet,
  UserCheck, AlertTriangle, ArrowRight, BookMarked, Grid3X3, Table2, ArrowLeftRight, MapPin
} from "lucide-react"

interface TeacherInfo { 
  id: string; 
  teacherName: string; 
  teacherCode: string; 
  email: string | null; 
  departmentId: string | null; 
  campusId: string; 
  campus?: { id: string; campusName: string; campusCode: string } | null;
  position?: string;
  departmentAssignments?: { departmentId: string; position: string }[];
  observerType?: string | null;
  observeeType?: string | null;
  requiredObserved?: number;
  observedUnit?: string;
  requiredTaught?: number;
  taughtUnit?: string;
}
interface SubjectInfo { id: string; subjectCode: string; subjectName: string }
interface DeptInfo { id: string; code: string; name: string; blockCM?: string | null }
interface CampusInfo { id: string; campusCode: string; campusName: string }
interface ClassInfo { id: string; classCode: string; className: string; level: string; grade: string; campusId: string }

interface AdminTongHopClientProps {
  initialSlots: any[]
  currentTeacher: TeacherInfo | null
  subjects: SubjectInfo[]
  departments: DeptInfo[]
  teachers: any[]
  campuses: CampusInfo[]
  classes: ClassInfo[]
  initialFilters: { level: string; period: string; grade: string; date: string; campusId: string; deptId: string; academicYearId?: string }
  isTTCM: boolean
  isSuperAdmin: boolean
  isGDCS?: boolean
  academicYears?: { id: string; name: string; status: string }[]
  selectedYearId?: string
}

const maxScoresK12 = [1.5, 1.5, 2.0, 2.0, 1.0, 2.0, 3.0, 2.0, 2.0, 2.0, 1.0];
const k12Labels = [
  "Y1: Chuẩn bị giáo án, bám sát kiến thức kỹ năng",
  "Y2: Sử dụng đồ dùng, thiết bị dạy học phù hợp",
  "Y3: Nội dung bài giảng chính xác, khoa học",
  "Y4: Đảm bảo tính hệ thống, trọng tâm bài dạy",
  "Y5: Liên hệ thực tế đời sống, tính giáo dục",
  "Y6: Không đọc chép, hỗ trợ kịp thời học sinh",
  "Y7: Tổ chức học tập chủ động, hợp tác nhóm",
  "Y8: Linh hoạt các khâu, phân phối thời gian hợp lý",
  "Y9: Kết hợp các phương pháp, khuyến khích tư duy",
  "Y10: Đánh giá quá trình học, học sinh nắm vững bài",
  "Y11: Tiết dạy nhuần nhuyễn, sinh động, sáng tạo"
];

const preschoolLabels = [
  "T1: Nội dung bài dạy phù hợp, chính xác",
  "T2: Phương pháp giảng dạy hiệu quả, sáng tạo",
  "T3: Tổ chức hoạt động học tập tích cực",
  "T4: Sử dụng CNTT và phương tiện dạy học",
  "T5: Kết quả học tập và tương tác của học sinh"
];

export function AdminTongHopClient({
  initialSlots, currentTeacher, subjects, departments, teachers: initialTeachers, campuses, classes, initialFilters, isTTCM, isSuperAdmin, isGDCS, academicYears, selectedYearId
}: AdminTongHopClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [teachersList, setTeachersList] = useState<any[]>(initialTeachers)

  useEffect(() => {
    setTeachersList(initialTeachers)
  }, [initialTeachers])

  const filterAcademicYearId = searchParams.get("academicYearId") || selectedYearId || ""

  const handleAcademicYearChange = (yearId: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set("academicYearId", yearId)
    router.push(`${pathname}?${params.toString()}`)
  }

  const rawBlock = (searchParams.get("block") || "").toLowerCase().trim()
  const [activeBlockTab, setActiveBlockTab] = useState(() => {
    if (["mammon", "mam-non", "mamnon", "mn"].includes(rawBlock)) return "Mầm non";
    if (["dieuhan", "dieuhanh", "dieu-hanh", "dh"].includes(rawBlock)) return "Điều hành";
    if (["k12", "pho-thong", "phothong"].includes(rawBlock)) return "Phổ thông K-12";
    if (isTTCM && currentTeacher?.departmentId) {
      const d = departments.find(dept => dept.id === currentTeacher.departmentId);
      if (d) {
        if (d.blockCM === "Mầm Non") return "Mầm non";
        if (d.blockCM === "Điều hành") return "Điều hành";
      }
    }
    return "Phổ thông K-12";
  })

  useEffect(() => {
    if (["mammon", "mam-non", "mamnon", "mn"].includes(rawBlock)) { setActiveBlockTab("Mầm non"); return; }
    if (["dieuhan", "dieuhanh", "dieu-hanh", "dh"].includes(rawBlock)) { setActiveBlockTab("Điều hành"); return; }
    if (["k12", "pho-thong", "phothong"].includes(rawBlock)) { setActiveBlockTab("Phổ thông K-12"); return; }
  }, [rawBlock]);

  const availableBlocks = useMemo(() => {
    if (isTTCM && currentTeacher?.departmentId) {
      const d = departments.find(dept => dept.id === currentTeacher.departmentId);
      if (d?.blockCM === "Mầm Non") return ["Mầm non"];
      if (d?.blockCM === "Điều hành") return ["Điều hành"];
      return ["Phổ thông K-12"];
    }
    return ["Phổ thông K-12", "Mầm non", "Điều hành"];
  }, [isTTCM, currentTeacher, departments]);

  const activeDepartments = useMemo(() => {
    return departments.filter(dept => {
      if (!dept.blockCM || dept.blockCM === "" || dept.blockCM === "Hỗ trợ người học") return false;
      if (activeBlockTab === "Phổ thông K-12" && dept.blockCM !== "Phổ thông") return false;
      if (activeBlockTab === "Mầm non" && dept.blockCM !== "Mầm Non") return false;
      if (activeBlockTab === "Điều hành" && dept.blockCM !== "Điều hành") return false;
      return true;
    });
  }, [departments, activeBlockTab]);

  const initialDeptId = isTTCM 
    ? (currentTeacher?.departmentId || "") 
    : (activeDepartments.find(d => d.id === initialFilters.deptId)?.id || activeDepartments[0]?.id || "");

  const [selectedDeptId, setSelectedDeptId] = useState(initialDeptId)

  useEffect(() => {
    if (!isTTCM) {
      const newDepts = departments.filter(dept => {
        if (!dept.blockCM || dept.blockCM === "" || dept.blockCM === "Hỗ trợ người học") return false;
        if (activeBlockTab === "Phổ thông K-12" && dept.blockCM !== "Phổ thông") return false;
        if (activeBlockTab === "Mầm non" && dept.blockCM !== "Mầm Non") return false;
        if (activeBlockTab === "Điều hành" && dept.blockCM !== "Điều hành") return false;
        return true;
      });
      setSelectedDeptId(newDepts[0]?.id || "");
      setSelectedTeacherId(null);
    }
  }, [activeBlockTab, departments, isTTCM]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  const [activeDetailTab, setActiveDetailTab] = useState<"lich-su" | "lich-su-du" | "tien-do-to" | "ma-tran-ttcm" | "phan-tich" | "to-cm">("lich-su")

  // Filter & view states for TTCM Matrix Tab
  const [ttcmMatrixMonth, setTtcmMatrixMonth] = useState<string>("all")
  const [ttcmMatrixBlock, setTtcmMatrixBlock] = useState<string>("all")
  const [ttcmMatrixCampus, setTtcmMatrixCampus] = useState<string>("all")
  const [ttcmMatrixObservedCampus, setTtcmMatrixObservedCampus] = useState<string>("all")
  const [ttcmSearchQuery, setTtcmSearchQuery] = useState<string>("")
  const [ttcmViewMode, setTtcmViewMode] = useState<"detailed-list" | "pivot-matrix">("detailed-list")
  
  // Target Config modal state
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false)
  const [targetTeacher, setTargetTeacher] = useState<any>(null)
  const [observerType, setObserverType] = useState("")
  const [observeeType, setObserveeType] = useState("")
  const [requiredObserved, setRequiredObserved] = useState(0)
  const [observedUnit, setObservedUnit] = useState("tháng")
  const [requiredTaught, setRequiredTaught] = useState(0)
  const [taughtUnit, setTaughtUnit] = useState("tháng")
  const [savingTargets, setSavingTargets] = useState(false)

  const openTargetConfig = (teacher: any) => {
    setTargetTeacher(teacher);
    setObserverType(teacher.observerType || "");
    setObserveeType(teacher.observeeType || "");
    setRequiredObserved(teacher.requiredObserved || 0);
    setObservedUnit(teacher.observedUnit || "tháng");
    setRequiredTaught(teacher.requiredTaught || 0);
    setTaughtUnit(teacher.taughtUnit || "tháng");
    setIsTargetModalOpen(true);
  };

  const handleObserverTypePreset = (type: string) => {
    setObserverType(type);
    if (type === "Ban ĐHCM") {
      setRequiredObserved(10); setObservedUnit("tháng");
    } else if (type === "TTCM") {
      setRequiredObserved(8); setObservedUnit("tháng");
    } else if (type === "Nhóm trưởng CM CS") {
      setRequiredObserved(8); setObservedUnit("tháng");
    } else if (type === "Giám đốc Điều hành cơ sở") {
      setRequiredObserved(4); setObservedUnit("tháng");
    } else if (type === "Giáo viên mới") {
      setRequiredObserved(10); setObservedUnit("tháng");
    } else if (type === "Giáo viên cũ") {
      setRequiredObserved(4); setObservedUnit("tháng");
    }
  };

  const handleObserveeTypePreset = (type: string) => {
    setObserveeType(type);
    if (type === "TTCM") {
      setRequiredTaught(1); setTaughtUnit("năm");
    } else if (type === "Nhóm trưởng CM CS") {
      setRequiredTaught(1); setTaughtUnit("năm");
    } else if (type === "Giáo viên mới") {
      setRequiredTaught(1); setTaughtUnit("tháng");
    } else if (type === "Giáo viên cũ") {
      setRequiredTaught(1); setTaughtUnit("học kỳ");
    }
  };

  const handleSaveTargets = async () => {
    if (!targetTeacher) return;
    setSavingTargets(true);
    try {
      const res = await updateTeacherObservationTargets(targetTeacher.id, {
        observerType,
        observeeType,
        requiredObserved,
        observedUnit,
        requiredTaught,
        taughtUnit
      });
      if (res.success) {
        toast.success("Đã cập nhật chỉ tiêu dự giờ thành công!");
        setTeachersList(prev => prev.map(t => t.id === targetTeacher.id ? {
          ...t,
          observerType,
          observeeType,
          requiredObserved,
          observedUnit,
          requiredTaught,
          taughtUnit
        } : t));
        setIsTargetModalOpen(false);
      } else {
        toast.error(res.error || "Có lỗi xảy ra khi lưu chỉ tiêu");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối");
    } finally {
      setSavingTargets(false);
    }
  };

  // Search & Filter states
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [searchTeacherQuery, setSearchTeacherQuery] = useState("")
  const [searchSlotQuery, setSearchSlotQuery] = useState("")
  const [filterLevel, setFilterLevel] = useState("all")
  const [filterGrade, setFilterGrade] = useState("all")
  const [filterSlotOrigin, setFilterSlotOrigin] = useState<string>("all")
  const [filterObservedSlotOrigin, setFilterObservedSlotOrigin] = useState<string>("all")

  // Helper to determine whether a slot is a surprise observation
  const isSurpriseSlot = (slot: any) => {
    if (!slot) return false;
    return (
      slot.requestOrigin === "SURPRISE" ||
      (typeof slot.description === "string" && (slot.description.includes("[SURPRISE]") || slot.description.toLowerCase().includes("dự giờ đột xuất"))) ||
      (typeof slot.topic === "string" && slot.topic.toLowerCase().includes("đột xuất"))
    );
  };

  // Extract all unique months from initialSlots
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const activeYearObj = (academicYears || []).find((y: any) => y.id === selectedYearId) || (academicYears || []).find((y: any) => y.status === "ACTIVE");
    initialSlots.forEach(s => {
      if (s.date) {
        const d = new Date(s.date);
        if ((activeYearObj as any)?.startDate && (activeYearObj as any)?.endDate) {
          const start = new Date((activeYearObj as any).startDate);
          const end = new Date((activeYearObj as any).endDate);
          if (d < start || d > end) return;
        }
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        months.add(`${yyyy}-${mm}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [initialSlots, academicYears, selectedYearId]);

  // Compute taught and observed slot counts for all teachers
  const allTeacherStats = useMemo(() => {
    const statsMap: Record<string, { 
      taughtCount: number; 
      observedCount: number;
      taughtSurpriseCount: number;
      observedSurpriseCount: number;
      taughtMamNon: number;
      taughtPhoThong: number;
      observedMamNon: number;
      observedPhoThong: number;
    }> = {};
    
    teachersList.forEach((t: any) => {
      statsMap[t.id] = { 
        taughtCount: 0, 
        observedCount: 0,
        taughtSurpriseCount: 0,
        observedSurpriseCount: 0,
        taughtMamNon: 0,
        taughtPhoThong: 0,
        observedMamNon: 0,
        observedPhoThong: 0
      };
    });

    initialSlots.forEach((slot: any) => {
      if (selectedMonth !== "all") {
        const d = new Date(slot.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        if (`${yyyy}-${mm}` !== selectedMonth) return;
      }

      const isMamNon = slot.level === "Mầm non" || 
        (slot.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes("mam non");
      const isSurprise = isSurpriseSlot(slot);

      if (statsMap[slot.teacherId]) {
        // Chỉ tính tiết dạy khi CÓ PHIẾU ĐÁNH GIÁ (loại bỏ phiếu DRAFT/chờ)
        const hasEvaluations = slot.registrations?.some(
          (r: any) => r.evaluation !== null && r.evaluation !== undefined && r.evaluation?.reEvaluationStatus !== "DRAFT"
        );
        if (hasEvaluations) {
          const increment = slot.isDoublePeriod ? 2 : 1;
          statsMap[slot.teacherId].taughtCount += increment;
          if (isSurprise) statsMap[slot.teacherId].taughtSurpriseCount += increment;
          if (isMamNon) statsMap[slot.teacherId].taughtMamNon += increment;
          else statsMap[slot.teacherId].taughtPhoThong += increment;
        }
      }

      slot.registrations?.forEach((reg: any) => {
        // Chỉ tính tiết dự khi đã duyệt và ĐÃ HOÀN THÀNH ĐÁNH GIÁ (loại bỏ phiếu DRAFT/chờ)
        if (reg.isApproved && reg.evaluation && reg.evaluation?.reEvaluationStatus !== "DRAFT" && statsMap[reg.teacherId]) {
          const increment = slot.isDoublePeriod ? 2 : 1;
          statsMap[reg.teacherId].observedCount += increment;
          if (isSurprise) statsMap[reg.teacherId].observedSurpriseCount += increment;
          if (isMamNon) statsMap[reg.teacherId].observedMamNon += increment;
          else statsMap[reg.teacherId].observedPhoThong += increment;
        }
      });
    });

    return statsMap;
  }, [teachersList, initialSlots, selectedMonth]);

  const handleTabChange = (tab: string) => {
    if (isTTCM) return;
    setActiveBlockTab(tab);
    setSelectedTeacherId(null);
    setSearchTeacherQuery("");
    
    const newActiveDepts = departments.filter(dept => {
      if (!dept.blockCM || dept.blockCM === "" || dept.blockCM === "Hỗ trợ người học") return false;
      if (tab === "Phổ thông K-12" && dept.blockCM !== "Phổ thông") return false;
      if (tab === "Mầm non" && dept.blockCM !== "Mầm Non") return false;
      if (tab === "Điều hành" && dept.blockCM !== "Điều hành") return false;
      return true;
    });
    setSelectedDeptId(newActiveDepts[0]?.id || "");
  };

  const deptTeachers = useMemo(() => {
    return teachersList.filter((t: any) => t.departmentId === selectedDeptId);
  }, [teachersList, selectedDeptId]);

  const filteredDeptTeachers = useMemo(() => {
    return deptTeachers.filter((t: any) => 
      t.teacherName.toLowerCase().includes(searchTeacherQuery.toLowerCase()) ||
      t.teacherCode.toLowerCase().includes(searchTeacherQuery.toLowerCase())
    );
  }, [deptTeachers, searchTeacherQuery]);

  useEffect(() => {
    if (!selectedTeacherId && filteredDeptTeachers.length > 0) {
      setSelectedTeacherId(filteredDeptTeachers[0].id);
    }
  }, [filteredDeptTeachers, selectedTeacherId]);

  const teacherStats = useMemo(() => {
    const statsMap: Record<string, { 
      taughtCount: number; 
      observedCount: number;
      taughtSurpriseCount: number;
      observedSurpriseCount: number;
      taughtMamNon: number;
      taughtPhoThong: number;
      observedMamNon: number;
      observedPhoThong: number;
    }> = {};
    deptTeachers.forEach((t: any) => {
      statsMap[t.id] = allTeacherStats[t.id] || { 
        taughtCount: 0, 
        observedCount: 0,
        taughtSurpriseCount: 0,
        observedSurpriseCount: 0,
        taughtMamNon: 0,
        taughtPhoThong: 0,
        observedMamNon: 0,
        observedPhoThong: 0
      };
    });
    return statsMap;
  }, [deptTeachers, allTeacherStats]);

  const departmentSummary = useMemo(() => {
    let taughtMamNon = 0;
    let taughtPhoThong = 0;
    let observedMamNon = 0;
    let observedPhoThong = 0;
    let taughtSurprise = 0;
    let observedSurprise = 0;
    let totalEvaluations = 0;
    let passingEvaluations = 0;

    const teacherIds = new Set(deptTeachers.map(t => t.id));

    deptTeachers.forEach((t: any) => {
      const stats = teacherStats[t.id] || { taughtMamNon: 0, taughtPhoThong: 0, observedMamNon: 0, observedPhoThong: 0, taughtSurpriseCount: 0, observedSurpriseCount: 0 };
      taughtMamNon += stats.taughtMamNon || 0;
      taughtPhoThong += stats.taughtPhoThong || 0;
      observedMamNon += stats.observedMamNon || 0;
      observedPhoThong += stats.observedPhoThong || 0;
      taughtSurprise += stats.taughtSurpriseCount || 0;
      observedSurprise += stats.observedSurpriseCount || 0;
    });

    initialSlots.forEach(slot => {
      if (!teacherIds.has(slot.teacherId)) return;
      if (selectedMonth !== "all") {
        if (!slot.date) return;
        const d = new Date(slot.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        if (`${yyyy}-${mm}` !== selectedMonth) return;
      }
      slot.registrations?.forEach((r: any) => {
        if (r.evaluation && r.evaluation?.reEvaluationStatus !== "DRAFT") {
          totalEvaluations++;
          const isK12 = slot.level !== "Mầm non";
          const passed = isK12
            ? (r.evaluation.totalScore !== null && r.evaluation.totalScore !== undefined ? r.evaluation.totalScore >= 14 : (r.evaluation.overallRating === "Giỏi" || r.evaluation.overallRating === "Khá"))
            : (r.evaluation.overallRating === "Tốt" || r.evaluation.overallRating === "Khá" || r.evaluation.overallRating === "Đạt");
          if (passed) passingEvaluations++;
        }
      });
    });

    const activeTeachersCount = deptTeachers.filter(t => (teacherStats[t.id]?.taughtCount || 0) > 0 || (teacherStats[t.id]?.observedCount || 0) > 0).length;

    return {
      taughtMamNon,
      taughtPhoThong,
      observedMamNon,
      observedPhoThong,
      taughtSurprise,
      observedSurprise,
      totalTaught: taughtMamNon + taughtPhoThong,
      totalObserved: observedMamNon + observedPhoThong,
      totalEvaluations,
      passingEvaluations,
      passRate: totalEvaluations > 0 ? Math.round((passingEvaluations / totalEvaluations) * 100) : 0,
      activeTeachersCount
    };
  }, [deptTeachers, teacherStats, initialSlots, selectedMonth]);

  const getSlotAverageScore = (slot: any) => {
    const isK12 = !["Mầm non"].includes(slot.level);
    const passedEvals = slot.registrations?.filter((r: any) => {
      if (!r.evaluation || r.evaluation?.reEvaluationStatus === "DRAFT") return false;
      const passed = isK12
        ? (r.evaluation.totalScore !== null && r.evaluation.totalScore !== undefined ? r.evaluation.totalScore >= 14 : (r.evaluation.overallRating === "Giỏi" || r.evaluation.overallRating === "Khá"))
        : (r.evaluation.overallRating === "Tốt" || r.evaluation.overallRating === "Khá" || r.evaluation.overallRating === "Đạt");
      return passed;
    }) || [];
    
    if (passedEvals.length === 0) return null;
    if (!isK12) return "Mầm non";
    
    const sum = passedEvals.reduce((acc: number, curr: any) => acc + (curr.evaluation.totalScore || 0), 0);
    return sum / passedEvals.length;
  };

  const selectedDeptName = departments.find(d => d.id === selectedDeptId)?.name || "Chưa xác định";

  const selTeacherSlots = useMemo(() => {
    if (!selectedTeacherId) return [];
    return initialSlots.filter(s => {
      if (s.teacherId !== selectedTeacherId) return false;
      // Chỉ thống kê các tiết dạy CÓ PHIẾU ĐÁNH GIÁ (loại bỏ các tiết đăng ký mà không có phiếu đánh giá / chờ)
      const hasEvaluations = s.registrations?.some(
        (r: any) => r.evaluation !== null && r.evaluation !== undefined && r.evaluation?.reEvaluationStatus !== "DRAFT"
      );
      if (!hasEvaluations) return false;

      if (selectedMonth !== "all") {
        if (!s.date) return false;
        const d = new Date(s.date);
        if (isNaN(d.getTime())) return false;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return yyyy + "-" + mm === selectedMonth;
      }
      return true;
    });
  }, [selectedTeacherId, initialSlots, selectedMonth]);

  // Selected teacher's observed slots (where this teacher is the observer and completed evaluation)
  const selTeacherObservedSlots = useMemo(() => {
    if (!selectedTeacherId) return [];
    const results: any[] = [];
    initialSlots.forEach(slot => {
      if (selectedMonth !== "all") {
        if (!slot.date) return;
        const d = new Date(slot.date);
        if (isNaN(d.getTime())) return;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        if (`${yyyy}-${mm}` !== selectedMonth) return;
      }
      slot.registrations?.forEach((reg: any) => {
        // Chỉ lấy các tiết dự đã duyệt VÀ ĐÃ HOÀN THÀNH ĐÁNH GIÁ (phiếu ở trạng thái chờ/draft thì không thống kê)
        if (reg.teacherId === selectedTeacherId && reg.isApproved && reg.evaluation && reg.evaluation?.reEvaluationStatus !== "DRAFT") {
          results.push({
            slot,
            reg,
            evaluation: reg.evaluation,
            hostTeacher: slot.teacher
          });
        }
      });
    });
    return results;
  }, [selectedTeacherId, initialSlots, selectedMonth]);

  const filteredObservedSlots = useMemo(() => {
    return selTeacherObservedSlots.filter(item => {
      const slot = item.slot;
      const hostName = item.hostTeacher?.teacherName || "";
      const matchQuery = !searchSlotQuery || 
        slot.topic?.toLowerCase().includes(searchSlotQuery.toLowerCase()) ||
        (slot.subjectName && slot.subjectName.toLowerCase().includes(searchSlotQuery.toLowerCase())) ||
        (slot.className && slot.className.toLowerCase().includes(searchSlotQuery.toLowerCase())) ||
        hostName.toLowerCase().includes(searchSlotQuery.toLowerCase());
      const matchLevel = filterLevel === "all" || slot.level === filterLevel;
      const matchGrade = filterGrade === "all" || slot.grade === filterGrade;
      const isSurprise = isSurpriseSlot(slot);
      const matchOrigin = filterObservedSlotOrigin === "all" ||
        (filterObservedSlotOrigin === "SURPRISE" && isSurprise) ||
        (filterObservedSlotOrigin === "PLAN" && !isSurprise);
      return matchQuery && matchLevel && matchGrade && matchOrigin;
    });
  }, [selTeacherObservedSlots, searchSlotQuery, filterLevel, filterGrade, filterObservedSlotOrigin]);

  const deptTTCM = useMemo(() => {
    return deptTeachers.find((t: any) => 
      t.position === "TTCM" || 
      (t.departmentAssignments || []).some((da: any) => da.departmentId === selectedDeptId && da.position === "TTCM")
    ) || null;
  }, [deptTeachers, selectedDeptId]);

  const deptTeacherMatrix = useMemo(() => {
    return deptTeachers.map((t: any) => {
      const stats = teacherStats[t.id] || { taughtCount: 0, observedCount: 0, taughtSurpriseCount: 0, observedSurpriseCount: 0 };
      const reqTaught = t.requiredTaught || 0;
      const reqObserved = t.requiredObserved || 0;
      const taughtUnit = t.taughtUnit || "tháng";
      const observedUnit = t.observedUnit || "tháng";

      const isTaughtMet = reqTaught === 0 || stats.taughtCount >= reqTaught;
      const isObservedMet = reqObserved === 0 || stats.observedCount >= reqObserved;
      const isAllMet = isTaughtMet && isObservedMet;

      const taughtPct = reqTaught > 0 ? Math.min(100, Math.round((stats.taughtCount / reqTaught) * 100)) : 100;
      const observedPct = reqObserved > 0 ? Math.min(100, Math.round((stats.observedCount / reqObserved) * 100)) : 100;

      return {
        ...t,
        taughtCount: stats.taughtCount,
        observedCount: stats.observedCount,
        taughtSurpriseCount: stats.taughtSurpriseCount || 0,
        observedSurpriseCount: stats.observedSurpriseCount || 0,
        reqTaught,
        reqObserved,
        taughtUnit,
        observedUnit,
        isTaughtMet,
        isObservedMet,
        isAllMet,
        taughtPct,
        observedPct
      };
    });
  }, [deptTeachers, teacherStats]);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailMonth, setEmailMonth] = useState<string>("all");
  const [emailNotes, setEmailNotes] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Modal State for All Departments Report
  const [isAllDeptsModalOpen, setIsAllDeptsModalOpen] = useState(false);
  const [allDeptsTo, setAllDeptsTo] = useState("");
  const [allDeptsCc, setAllDeptsCc] = useState("");
  const [allDeptsMonth, setAllDeptsMonth] = useState<string>("all");
  const [allDeptsNotes, setAllDeptsNotes] = useState("");
  const [sendingAllDeptsEmail, setSendingAllDeptsEmail] = useState(false);

  // Compute live summary for all departments based on allDeptsMonth (used for email preview and sending)
  const allDeptsEmailSummary = useMemo(() => {
    return (activeDepartments || []).map((dept: any) => {
      const deptTeachersList = (initialTeachers || []).filter((t: any) => 
        t.departmentId === dept.id || t.departmentAssignments?.some((da: any) => da.departmentId === dept.id)
      );
      const teacherIds = new Set(deptTeachersList.map((t: any) => t.id));

      const ttcm = deptTeachersList.find((t: any) => 
        t.position === "TTCM" || t.departmentAssignments?.some((da: any) => da.departmentId === dept.id && da.position === "TTCM")
      );

      let totalTaught = 0;
      let totalObserved = 0;
      let taughtSurprise = 0;
      let observedSurprise = 0;

      (initialSlots || []).forEach((slot: any) => {
        if (allDeptsMonth !== "all") {
          if (!slot.date) return;
          const d = new Date(slot.date);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          if (`${yyyy}-${mm}` !== allDeptsMonth) return;
        }

        const isHost = teacherIds.has(slot.teacherId);
        const increment = slot.isDoublePeriod ? 2 : 1;
        const hasEvaluations = slot.registrations?.some(
          (r: any) => r.evaluation !== null && r.evaluation !== undefined && r.evaluation?.reEvaluationStatus !== "DRAFT"
        );
        const isSurprise = isSurpriseSlot(slot);

        if (isHost && hasEvaluations) {
          totalTaught += increment;
          if (isSurprise) taughtSurprise += increment;
        }

        slot.registrations?.forEach((reg: any) => {
          if (reg.isApproved && reg.evaluation && reg.evaluation?.reEvaluationStatus !== "DRAFT" && teacherIds.has(reg.teacherId)) {
            totalObserved += increment;
            if (isSurprise) observedSurprise += increment;
          }
        });
      });

      return {
        id: dept.id,
        name: dept.name,
        teacherCount: deptTeachersList.length,
        ttcm,
        totalTaught,
        totalObserved,
        taughtSurprise,
        observedSurprise
      };
    });
  }, [activeDepartments, initialTeachers, initialSlots, allDeptsMonth]);

  
  // Helper to determine block of teacher
  const getTeacherBlock = (t: any) => {
    const dept = departments.find(d => d.id === t.departmentId);
    if (dept?.blockCM) {
      if (dept.blockCM === "Mầm Non" || dept.blockCM === "Mầm non") return "Mầm non";
      if (dept.blockCM === "Điều hành") return "Điều hành";
      if (dept.blockCM === "Phổ thông") return "Phổ thông K-12";
    }
    if (t.departmentAssignments && t.departmentAssignments.length > 0) {
      for (const da of t.departmentAssignments) {
        const daDept = departments.find(d => d.id === da.departmentId);
        if (daDept?.blockCM === "Mầm Non" || daDept?.blockCM === "Mầm non") return "Mầm non";
        if (daDept?.blockCM === "Điều hành") return "Điều hành";
        if (daDept?.blockCM === "Phổ thông") return "Phổ thông K-12";
      }
    }
    return "Phổ thông K-12";
  };

  const getTeacherDeptName = (t: any) => {
    const dept = departments.find(d => d.id === t.departmentId);
    if (dept) return dept.name;
    if (t.departmentAssignments && t.departmentAssignments.length > 0) {
      const daDept = departments.find(d => d.id === t.departmentAssignments[0].departmentId);
      if (daDept) return daDept.name;
    }
    return "Chưa phân tổ";
  };

  // Helper to find teacher's home campus name
  const getTeacherCampusName = (t: any) => {
    if (t?.campus?.campusName) return t.campus.campusName;
    if (t?.campusId) {
      const c = campuses.find(cp => cp.id === t.campusId);
      if (c) return c.campusName;
    }
    return "Chưa rõ cơ sở";
  };

  // Helper to find slot's campus name
  const getSlotCampusName = (slot: any) => {
    if (slot?.campusName) return slot.campusName;
    if (slot?.campusId) {
      const c = campuses.find(cp => cp.id === slot.campusId);
      if (c) return c.campusName;
    }
    if (slot?.teacher?.campus?.campusName) return slot.teacher.campus.campusName;
    if (slot?.teacher?.campusId) {
      const c = campuses.find(cp => cp.id === slot.teacher.campusId);
      if (c) return c.campusName;
    }
    return "Cơ sở chưa rõ";
  };

  // Distinct list of all TTCMs across departments and teachersList
  const allTTCMList = useMemo(() => {
    const ttcmMap = new Map<string, any>();

    // 1. From departments: every department's designated TTCM
    departments.forEach(dept => {
      const deptTeachersList = (teachersList || []).filter((t: any) => 
        t.departmentId === dept.id || t.departmentAssignments?.some((da: any) => da.departmentId === dept.id)
      );
      const ttcm = deptTeachersList.find((t: any) => 
        t.position === "TTCM" || t.departmentAssignments?.some((da: any) => da.departmentId === dept.id && da.position === "TTCM")
      );
      if (ttcm) {
        ttcmMap.set(ttcm.id, {
          ...ttcm,
          deptId: dept.id,
          deptName: dept.name,
          block: getTeacherBlock(ttcm)
        });
      }
    });

    // 2. From teachersList: any teacher whose position or assignment is TTCM / Tổ trưởng
    (teachersList || []).forEach((t: any) => {
      const pos = (t.position || "").toUpperCase().trim();
      const isTT = pos === "TTCM" || pos.includes("TTCM") || pos.includes("TỔ TRƯỞNG") || pos.includes("TO TRUONG") ||
        t.observerType === "TTCM" ||
        t.departmentAssignments?.some((da: any) => {
          const p = (da.position || "").toUpperCase().trim();
          return p === "TTCM" || p.includes("TTCM") || p.includes("TỔ TRƯỞNG") || p.includes("TO TRUONG");
        });
      if (isTT && !ttcmMap.has(t.id)) {
        ttcmMap.set(t.id, {
          ...t,
          deptId: t.departmentId,
          deptName: getTeacherDeptName(t),
          block: getTeacherBlock(t)
        });
      }
    });

    return Array.from(ttcmMap.values()).sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'vi'));
  }, [departments, teachersList]);

  // Distinct campus names for Observed Campuses (columns in pivot grid)
  const distinctObservedCampusNames = useMemo(() => {
    const names = new Set<string>();
    campuses.forEach(c => {
      if (c.campusName) names.add(c.campusName);
    });
    initialSlots.forEach(s => {
      const cn = getSlotCampusName(s);
      if (cn && cn !== "Cơ sở chưa rõ") names.add(cn);
    });
    return Array.from(names).sort();
  }, [campuses, initialSlots]);

  // Compute TTCM matrix data according to active month & Target Configuration
  const ttcmMatrixData = useMemo(() => {
    const activeMonth = ttcmMatrixMonth !== "all" ? ttcmMatrixMonth : selectedMonth;

    return allTTCMList.map(baseTTCM => {
      // Always reference the freshest teacher state from teachersList
      const ttcm = (teachersList || []).find((t: any) => t.id === baseTTCM.id) || baseTTCM;
      const homeCampus = getTeacherCampusName(ttcm);

      // Resolve observerType & target strictly according to "Thiết lập Chỉ tiêu Dự giờ"
      const observerType = ttcm.observerType || (
        ttcm.position === "Ban ĐHCM" ? "Ban ĐHCM" :
        (ttcm.position?.includes("Giám đốc") || ttcm.position === "GDCS") ? "Giám đốc Điều hành cơ sở" :
        (ttcm.position?.includes("Nhóm trưởng") ? "Nhóm trưởng CM CS" : "TTCM")
      );

      const getPresetTarget = (type: string) => {
        if (type === "Ban ĐHCM") return 10;
        if (type === "TTCM" || type === "Nhóm trưởng CM CS") return 8;
        if (type === "Giám đốc Điều hành cơ sở" || type === "Giáo viên cũ") return 4;
        if (type === "Giáo viên mới") return 10;
        return 8;
      };

      const configuredObserved = ttcm.requiredObserved;
      const observedUnit = ttcm.observedUnit || "tháng";
      const reqObserved = (configuredObserved !== undefined && configuredObserved !== null && configuredObserved > 0)
        ? configuredObserved
        : getPresetTarget(observerType);

      const campusStats: Record<string, { periods: number; surprisePeriods: number }> = {};
      let totalObserved = 0;
      let totalSurprise = 0;
      let internalObserved = 0;
      let crossObserved = 0;

      (initialSlots || []).forEach(slot => {
        if (activeMonth !== "all") {
          if (!slot.date) return;
          const d = new Date(slot.date);
          if (isNaN(d.getTime())) return;
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          if (`${yyyy}-${mm}` !== activeMonth) return;
        }

        const isSurprise = isSurpriseSlot(slot);
        const increment = slot.isDoublePeriod ? 2 : 1;

        slot.registrations?.forEach((reg: any) => {
          if (reg.teacherId === ttcm.id && reg.isApproved && reg.evaluation && reg.evaluation?.reEvaluationStatus !== "DRAFT") {
            const observedCampus = getSlotCampusName(slot);
            if (!campusStats[observedCampus]) {
              campusStats[observedCampus] = { periods: 0, surprisePeriods: 0 };
            }
            campusStats[observedCampus].periods += increment;
            if (isSurprise) campusStats[observedCampus].surprisePeriods += increment;

            totalObserved += increment;
            if (isSurprise) totalSurprise += increment;

            if (observedCampus === homeCampus) {
              internalObserved += increment;
            } else {
              crossObserved += increment;
            }
          }
        });
      });

      const breakdown = Object.entries(campusStats).map(([campusName, stat]) => ({
        campusName,
        periods: stat.periods,
        surprisePeriods: stat.surprisePeriods,
        isCrossCampus: campusName !== homeCampus
      })).sort((a, b) => b.periods - a.periods);

      const isTargetMet = reqObserved === 0 || totalObserved >= reqObserved;
      const progressPct = reqObserved > 0 ? Math.round((totalObserved / reqObserved) * 100) : 100;

      return {
        id: ttcm.id,
        ttcm,
        teacherName: ttcm.teacherName,
        teacherCode: ttcm.teacherCode,
        position: ttcm.position || "TTCM",
        observerType,
        observedUnit,
        deptName: baseTTCM.deptName || ttcm.deptName || "Tổ chuyên môn",
        block: baseTTCM.block || ttcm.block || "Phổ thông K-12",
        homeCampus,
        reqObserved,
        totalObserved,
        totalSurprise,
        internalObserved,
        crossObserved,
        isTargetMet,
        progressPct,
        breakdown: breakdown.length > 0 ? breakdown : [{
          campusName: "Chưa có tiết dự",
          periods: 0,
          surprisePeriods: 0,
          isCrossCampus: false
        }]
      };
    });
  }, [allTTCMList, teachersList, initialSlots, ttcmMatrixMonth, selectedMonth, campuses]);

  // Filter TTCM matrix data according to interactive tab filters
  const filteredTTCMMatrix = useMemo(() => {
    return ttcmMatrixData.filter(item => {
      if (ttcmMatrixBlock !== "all" && item.block !== ttcmMatrixBlock) return false;
      if (ttcmMatrixCampus !== "all" && item.homeCampus !== ttcmMatrixCampus) return false;
      if (ttcmMatrixObservedCampus !== "all") {
        const hasObserved = item.breakdown.some(b => b.campusName === ttcmMatrixObservedCampus && b.periods > 0);
        if (!hasObserved) return false;
      }
      if (ttcmSearchQuery.trim()) {
        const q = ttcmSearchQuery.toLowerCase().trim();
        const matchName = item.teacherName.toLowerCase().includes(q);
        const matchCode = item.teacherCode.toLowerCase().includes(q);
        const matchDept = item.deptName.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDept) return false;
      }
      return true;
    });
  }, [ttcmMatrixData, ttcmMatrixBlock, ttcmMatrixCampus, ttcmMatrixObservedCampus, ttcmSearchQuery]);

  // Summary KPIs for TTCM matrix
  const ttcmMatrixKPIs = useMemo(() => {
    let totalTTCM = filteredTTCMMatrix.length;
    let totalObserved = 0;
    let totalSurprise = 0;
    let totalInternal = 0;
    let totalCross = 0;
    let targetMetCount = 0;

    filteredTTCMMatrix.forEach(item => {
      totalObserved += item.totalObserved;
      totalSurprise += item.totalSurprise;
      totalInternal += item.internalObserved;
      totalCross += item.crossObserved;
      if (item.isTargetMet) targetMetCount++;
    });

    const metRate = totalTTCM > 0 ? Math.round((targetMetCount / totalTTCM) * 100) : 0;

    return {
      totalTTCM,
      totalObserved,
      totalSurprise,
      totalInternal,
      totalCross,
      targetMetCount,
      metRate
    };
  }, [filteredTTCMMatrix]);

  // Export TTCM Matrix to Excel
  const handleExportTTCMExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const activeMonth = ttcmMatrixMonth !== "all" ? ttcmMatrixMonth : selectedMonth;
      const periodText = activeMonth === "all" ? "Toàn bộ năm học" : `Tháng ${activeMonth.split("-")[1]}/${activeMonth.split("-")[0]}`;

      // Sheet 1: Bảng Danh Sách Chi Tiết (Theo yêu cầu: STT, Họ và tên, Chức vụ, Cơ sở, Cơ sở dự giờ, Số tiết)
      const detailHeaders = [
        "STT",
        "Họ và tên",
        "Mã GV",
        "Chức vụ",
        "Tổ chuyên môn",
        "Khối",
        "Cơ sở công tác",
        "Cơ sở dự giờ",
        "Số tiết dự",
        "Trong đó đột xuất",
        "Phân loại",
        "Tổng tiết cả kỳ",
        "Chỉ tiêu dự giờ",
        "Đối tượng người dự",
        "Đánh giá"
      ];

      const detailRows: any[][] = [
        ["MA TRẬN DỰ GIỜ TỔ TRƯỞNG CHUYÊN MÔN (TTCM) THEO THÁNG"],
        [`Kỳ báo cáo: ${periodText}`, `Thời gian xuất: ${new Date().toLocaleString("vi-VN")}`],
        [],
        detailHeaders
      ];

      let stt = 1;
      filteredTTCMMatrix.forEach(item => {
        item.breakdown.forEach((b, bIdx) => {
          detailRows.push([
            bIdx === 0 ? stt : "",
            bIdx === 0 ? item.teacherName : "",
            bIdx === 0 ? item.teacherCode : "",
            bIdx === 0 ? item.position : "",
            bIdx === 0 ? item.deptName : "",
            bIdx === 0 ? item.block : "",
            bIdx === 0 ? item.homeCampus : "",
            b.campusName,
            b.periods,
            b.surprisePeriods > 0 ? b.surprisePeriods : 0,
            b.periods === 0 ? "-" : (b.isCrossCampus ? "Liên cơ sở" : "Nội bộ cơ sở"),
            bIdx === 0 ? item.totalObserved : "",
            bIdx === 0 ? `${item.reqObserved} tiết / ${item.observedUnit}` : "",
            bIdx === 0 ? (item.observerType || "") : "",
            bIdx === 0 ? (item.isTargetMet ? "Đạt chỉ tiêu" : `Chưa đạt (${item.progressPct}%)`) : ""
          ]);
        });
        stt++;
      });

      const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
      wsDetail["!cols"] = [
        { wch: 6 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 20 },
        { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 16 },
        { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, wsDetail, "Chi_Tiet_Du_Gio_TTCM");

      // Sheet 2: Ma Trận Đối Chiếu 2 Chiều (Pivot Grid)
      const pivotHeaders = [
        "STT",
        "Họ và tên",
        "Mã GV",
        "Chức vụ",
        "Tổ chuyên môn",
        "Cơ sở công tác",
        ...distinctObservedCampusNames,
        "Tổng tiết dự",
        "Chỉ tiêu dự giờ",
        "Đối tượng",
        "Đánh giá"
      ];

      const pivotRows: any[][] = [
        ["MA TRẬN ĐỐI CHIẾU DỰ GIỜ TTCM - LIÊN CƠ SỞ"],
        [`Kỳ báo cáo: ${periodText}`, `Thời gian xuất: ${new Date().toLocaleString("vi-VN")}`],
        [],
        pivotHeaders
      ];

      filteredTTCMMatrix.forEach((item, pIdx) => {
        const campusPeriodsMap = new Map(item.breakdown.map(b => [b.campusName, b.periods]));
        const campusCols = distinctObservedCampusNames.map(cn => campusPeriodsMap.get(cn) || 0);

        pivotRows.push([
          pIdx + 1,
          item.teacherName,
          item.teacherCode,
          item.position,
          item.deptName,
          item.homeCampus,
          ...campusCols,
          item.totalObserved,
          `${item.reqObserved} tiết / ${item.observedUnit}`,
          item.observerType || "",
          item.isTargetMet ? "Đạt" : `Chưa đạt (${item.progressPct}%)`
        ]);
      });

      const wsPivot = XLSX.utils.aoa_to_sheet(pivotRows);
      XLSX.utils.book_append_sheet(wb, wsPivot, "Ma_Tran_Cheo_Co_So");

      const sanitizedMonth = activeMonth === "all" ? "Tat_Ca_Thang" : `Thang_${activeMonth.replace("-", "_")}`;
      const fileName = `Ma_Tran_Du_Gio_TTCM_${sanitizedMonth}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Đã xuất báo cáo Ma trận TTCM: ${fileName}`);
    } catch (e: any) {
      console.error("Export TTCM Excel error:", e);
      toast.error("Có lỗi xảy ra khi xuất file Excel Ma trận TTCM");
    }
  };

  const handleExportExcel = () => {
    try {
      const activeYearObj = academicYears?.find((y: any) => y.id === filterAcademicYearId) || academicYears?.[0];
      const yearName = activeYearObj?.name || "Năm học hiện tại";
      const periodText = selectedMonth === "all" ? "Tất cả các tháng (Cả năm học)" : `Tháng ${selectedMonth.split("-")[1]}/${selectedMonth.split("-")[0]}`;

      const wb = XLSX.utils.book_new();

      const createTeacherSheet = (
        title: string,
        list: any[],
        period: string,
        yrName: string
      ) => {
        const headers = [
          "STT",
          "Mã GV",
          "Họ và tên",
          "Tổ Chuyên Môn",
          "Chức vụ",
          "Tổng Tiết Dạy",
          "Dạy Đột Xuất",
          "Tổng Tiết Dự",
          "Dự Đột Xuất",
          "Chỉ tiêu Tiết Dạy",
          "Chỉ tiêu Tiết Dự",
          "Trạng thái"
        ];

        const rows: any[][] = [
          [title.toUpperCase()],
          [`Kỳ báo cáo: ${period}`, `Năm học: ${yrName}`, `Thời gian xuất: ${new Date().toLocaleString("vi-VN")}`],
          [],
          headers
        ];

        let sumTaught = 0;
        let sumSurpriseTaught = 0;
        let sumObserved = 0;
        let sumSurpriseObserved = 0;
        let sumReqTaught = 0;
        let sumReqObserved = 0;

        list.forEach((t, idx) => {
          const stats = allTeacherStats[t.id] || { taughtCount: 0, observedCount: 0, taughtSurpriseCount: 0, observedSurpriseCount: 0 };
          const deptName = getTeacherDeptName(t);
          const pos = t.position || "GV";
          const reqT = t.requiredTaught || 0;
          const reqO = t.requiredObserved || 0;

          sumTaught += stats.taughtCount;
          sumSurpriseTaught += (stats.taughtSurpriseCount || 0);
          sumObserved += stats.observedCount;
          sumSurpriseObserved += (stats.observedSurpriseCount || 0);
          sumReqTaught += reqT;
          sumReqObserved += reqO;

          let isAllMet = false;
          if (reqT > 0 && reqO > 0) {
            isAllMet = stats.taughtCount >= reqT && stats.observedCount >= reqO;
          } else if (reqT > 0) {
            isAllMet = stats.taughtCount >= reqT;
          } else if (reqO > 0) {
            isAllMet = stats.observedCount >= reqO;
          } else {
            isAllMet = stats.taughtCount > 0 || stats.observedCount > 0;
          }

          const status = isAllMet ? "Đạt" : "";

          rows.push([
            idx + 1,
            t.teacherCode || "",
            t.teacherName || "",
            deptName,
            pos,
            stats.taughtCount,
            stats.taughtSurpriseCount || 0,
            stats.observedCount,
            stats.observedSurpriseCount || 0,
            reqT > 0 ? `${reqT} (${t.taughtUnit || "tháng"})` : "—",
            reqO > 0 ? `${reqO} (${t.observedUnit || "tháng"})` : "—",
            status
          ]);
        });

        // Summary row
        rows.push([]);
        rows.push([
          "",
          "",
          `TỔNG CỘNG (${list.length} nhân sự)`,
          "",
          "",
          sumTaught,
          sumSurpriseTaught,
          sumObserved,
          sumSurpriseObserved,
          sumReqTaught > 0 ? sumReqTaught : "—",
          sumReqObserved > 0 ? sumReqObserved : "—",
          ""
        ]);

        const ws = XLSX.utils.aoa_to_sheet(rows);

        ws["!cols"] = [
          { wch: 6 },  // STT
          { wch: 15 }, // Mã GV
          { wch: 28 }, // Họ và tên
          { wch: 24 }, // Tổ Chuyên Môn
          { wch: 18 }, // Chức vụ
          { wch: 16 }, // Tổng Tiết Dạy
          { wch: 16 }, // Dạy Đột Xuất
          { wch: 16 }, // Tổng Tiết Dự
          { wch: 16 }, // Dự Đột Xuất
          { wch: 20 }, // Chỉ tiêu Dạy
          { wch: 20 }, // Chỉ tiêu Dự
          { wch: 20 }, // Trạng thái
        ];

        return ws;
      };

      const createDepartmentSummarySheet = (
        period: string,
        yrName: string
      ) => {
        const headers = [
          "STT",
          "Khối",
          "Tổ Chuyên Môn",
          "Số Lượng GV",
          "Tổng Tiết Dạy",
          "Dạy Đột Xuất",
          "Tổng Tiết Dự",
          "Dự Đột Xuất",
          "Tỷ Lệ Đạt Chuẩn"
        ];

        const rows: any[][] = [
          ["BẢNG TỔNG HỢP TIẾN ĐỘ CÁC TỔ CHUYÊN MÔN"],
          [`Kỳ báo cáo: ${period}`, `Năm học: ${yrName}`, `Thời gian xuất: ${new Date().toLocaleString("vi-VN")}`],
          [],
          headers
        ];

        let totalGV = 0;
        let totalTaughtAll = 0;
        let totalSurpriseTaughtAll = 0;
        let totalObservedAll = 0;
        let totalSurpriseObservedAll = 0;
        let stt = 1;

        const blocks = [
          { key: "Phổ thông", name: "Phổ thông K-12" },
          { key: "Mầm Non", name: "Mầm non" },
          { key: "Điều hành", name: "Điều hành" }
        ];

        blocks.forEach(b => {
          const deptsInBlock = departments.filter(d => d.blockCM === b.key);
          deptsInBlock.forEach(dept => {
            const deptTeachersList = teachersList.filter((t: any) => 
              t.departmentId === dept.id || t.departmentAssignments?.some((da: any) => da.departmentId === dept.id)
            );
            const teacherIds = new Set(deptTeachersList.map((t: any) => t.id));

            let deptTaught = 0;
            let deptSurpriseTaught = 0;
            let deptObserved = 0;
            let deptSurpriseObserved = 0;
            let totalEvals = 0;
            let passingEvals = 0;

            initialSlots.forEach((slot: any) => {
              if (selectedMonth !== "all") {
                if (!slot.date) return;
                const d = new Date(slot.date);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                if (`${yyyy}-${mm}` !== selectedMonth) return;
              }

              const isHost = teacherIds.has(slot.teacherId);
              const increment = slot.isDoublePeriod ? 2 : 1;
              const hasEvaluations = slot.registrations?.some(
                (r: any) => r.evaluation !== null && r.evaluation !== undefined && r.evaluation?.reEvaluationStatus !== "DRAFT"
              );
              const isSurprise = isSurpriseSlot(slot);

              if (isHost) {
                if (hasEvaluations) {
                  deptTaught += increment;
                  if (isSurprise) deptSurpriseTaught += increment;
                }
                slot.registrations?.forEach((r: any) => {
                  if (r.evaluation && r.evaluation?.reEvaluationStatus !== "DRAFT") {
                    totalEvals++;
                    const isK12 = slot.level !== "Mầm non";
                    const passed = isK12
                      ? (r.evaluation.totalScore !== null && r.evaluation.totalScore !== undefined ? r.evaluation.totalScore >= 14 : (r.evaluation.overallRating === "Giỏi" || r.evaluation.overallRating === "Khá"))
                      : (r.evaluation.overallRating === "Tốt" || r.evaluation.overallRating === "Khá" || r.evaluation.overallRating === "Đạt");
                    if (passed) passingEvals++;
                  }
                });
              }

              slot.registrations?.forEach((reg: any) => {
                if (reg.isApproved && reg.evaluation && reg.evaluation?.reEvaluationStatus !== "DRAFT" && teacherIds.has(reg.teacherId)) {
                  deptObserved += increment;
                  if (isSurprise) deptSurpriseObserved += increment;
                }
              });
            });

            const passRate = totalEvals > 0 ? `${Math.round((passingEvals / totalEvals) * 100)}%` : "100%";

            totalGV += deptTeachersList.length;
            totalTaughtAll += deptTaught;
            totalSurpriseTaughtAll += deptSurpriseTaught;
            totalObservedAll += deptObserved;
            totalSurpriseObservedAll += deptSurpriseObserved;

            rows.push([
              stt++,
              b.name,
              dept.name,
              deptTeachersList.length,
              deptTaught,
              deptSurpriseTaught,
              deptObserved,
              deptSurpriseObserved,
              passRate
            ]);
          });
        });

        rows.push([]);
        rows.push([
          "",
          "TỔNG CỘNG",
          `${departments.length} Tổ CM`,
          totalGV,
          totalTaughtAll,
          totalSurpriseTaughtAll,
          totalObservedAll,
          totalSurpriseObservedAll,
          ""
        ]);

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [
          { wch: 6 },
          { wch: 18 },
          { wch: 28 },
          { wch: 15 },
          { wch: 16 },
          { wch: 16 },
          { wch: 16 },
          { wch: 16 },
          { wch: 18 }
        ];
        return ws;
      };

      // Group teachers by block
      const k12Teachers = teachersList.filter(t => getTeacherBlock(t) === "Phổ thông K-12");
      const mnTeachers = teachersList.filter(t => getTeacherBlock(t) === "Mầm non");
      const dhTeachers = teachersList.filter(t => getTeacherBlock(t) === "Điều hành");

      // 1. Sheet Phổ thông K-12
      const wsK12 = createTeacherSheet("Báo cáo tổng hợp dự giờ - Khối Phổ thông K-12", k12Teachers, periodText, yearName);
      XLSX.utils.book_append_sheet(wb, wsK12, "Pho_Thong_K12");

      // 2. Sheet Mầm non
      const wsMN = createTeacherSheet("Báo cáo tổng hợp dự giờ - Khối Mầm non", mnTeachers, periodText, yearName);
      XLSX.utils.book_append_sheet(wb, wsMN, "Mam_Non");

      // 3. Sheet Điều hành
      const wsDH = createTeacherSheet("Báo cáo tổng hợp dự giờ - Khối Điều hành", dhTeachers, periodText, yearName);
      XLSX.utils.book_append_sheet(wb, wsDH, "Dieu_Hanh");

      // 4. Sheet Toàn trường (Tổng hợp)
      const wsAll = createTeacherSheet("Báo cáo tổng hợp dự giờ - Toàn trường", teachersList, periodText, yearName);
      XLSX.utils.book_append_sheet(wb, wsAll, "Toan_Truong");

      // 5. Sheet Thống kê theo Tổ CM
      const wsDeptSummary = createDepartmentSummarySheet(periodText, yearName);
      XLSX.utils.book_append_sheet(wb, wsDeptSummary, "Tien_Do_To_CM");

      // 6. Sheet Ma trận TTCM theo tháng
      const ttcmHeaders = [
        "STT", "Họ và tên", "Mã GV", "Chức vụ", "Tổ chuyên môn", "Khối", "Cơ sở công tác",
        ...distinctObservedCampusNames, "Tổng tiết dự", "Chỉ tiêu", "Đánh giá"
      ];
      const ttcmRows: any[][] = [
        ["MA TRẬN ĐỐI CHIẾU DỰ GIỜ TTCM - TOÀN TRƯỜNG"],
        [`Kỳ báo cáo: ${periodText}`, `Năm học: ${yearName}`],
        [],
        ttcmHeaders
      ];
      ttcmMatrixData.forEach((item, pIdx) => {
        const campusPeriodsMap = new Map(item.breakdown.map(b => [b.campusName, b.periods]));
        const campusCols = distinctObservedCampusNames.map(cn => campusPeriodsMap.get(cn) || 0);
        ttcmRows.push([
          pIdx + 1, item.teacherName, item.teacherCode, item.position, item.deptName, item.block, item.homeCampus,
          ...campusCols, item.totalObserved, item.reqObserved, item.isTargetMet ? "Đạt" : "Chưa đạt"
        ]);
      });
      const wsTTCM = XLSX.utils.aoa_to_sheet(ttcmRows);
      XLSX.utils.book_append_sheet(wb, wsTTCM, "Ma_Tran_TTCM");

      const sanitizedMonth = selectedMonth === "all" ? "Tat_Ca_Thang" : `Thang_${selectedMonth.replace("-", "_")}`;
      const fileName = `Bao_Cao_Tong_Hop_Du_Gio_${sanitizedMonth}.xlsx`;

      XLSX.writeFile(wb, fileName);
      toast.success(`Đã xuất báo cáo Excel thành công: ${fileName}`);
    } catch (error: any) {
      console.error("Export Excel error:", error);
      toast.error("Có lỗi xảy ra khi xuất file Excel");
    }
  };

  const openAllDeptsEmailModal = () => {
    // Find Ban ĐHCM teachers/staff if any
    const dhcmTeachers = (initialTeachers || []).filter(
      (t: any) => t.position === "Ban ĐHCM" || t.departmentRel?.blockCM === "DIEU_HANH"
    );
    const dhcmEmails = dhcmTeachers.map((t: any) => t.email).filter((em: any) => em && em.includes("@"));
    
    setAllDeptsTo(dhcmEmails.length > 0 ? dhcmEmails.join(", ") : "bankhaothi@skylineschool.edu.vn");
    setAllDeptsCc(""); // CC is strictly empty by default, not sent to 19 TTCMs
    setAllDeptsMonth(selectedMonth !== "all" ? selectedMonth : (availableMonths[0] || "all"));
    setAllDeptsNotes("");
    setIsAllDeptsModalOpen(true);
  };

  const handleSendAllDeptsEmailReport = async () => {
    if (!allDeptsTo || !allDeptsTo.includes("@")) {
      toast.error("Vui lòng nhập địa chỉ email người nhận chính hợp lệ");
      return;
    }
    setSendingAllDeptsEmail(true);
    try {
      const res = await fetch("/api/admin/du-gio/send-all-depts-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockTab: activeBlockTab,
          academicYearId: filterAcademicYearId,
          month: allDeptsMonth,
          toEmail: allDeptsTo,
          ccEmails: allDeptsCc || undefined,
          notes: allDeptsNotes || undefined,
          departmentSummaries: allDeptsEmailSummary
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Đã gửi email báo cáo tổng hợp các Tổ CM thành công!");
        setIsAllDeptsModalOpen(false);
      } else {
        toast.error(data.error || "Gửi email báo cáo thất bại");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối khi gửi email");
    } finally {
      setSendingAllDeptsEmail(false);
    }
  };

  // Compute live matrix preview for email based on selected emailMonth
  const emailPreviewTeacherMatrix = useMemo(() => {
    const statsMap: Record<string, { taughtCount: number; observedCount: number; taughtSurpriseCount: number; observedSurpriseCount: number }> = {};
    deptTeachers.forEach((t: any) => {
      statsMap[t.id] = { taughtCount: 0, observedCount: 0, taughtSurpriseCount: 0, observedSurpriseCount: 0 };
    });

    initialSlots.forEach((slot: any) => {
      if (emailMonth !== "all") {
        if (!slot.date) return;
        const d = new Date(slot.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        if (`${yyyy}-${mm}` !== emailMonth) return;
      }

      const isSurprise = isSurpriseSlot(slot);

      if (statsMap[slot.teacherId]) {
        const hasEvaluations = slot.registrations?.some(
          (r: any) => r.evaluation !== null && r.evaluation !== undefined && r.evaluation?.reEvaluationStatus !== "DRAFT"
        );
        if (hasEvaluations) {
          const increment = slot.isDoublePeriod ? 2 : 1;
          statsMap[slot.teacherId].taughtCount += increment;
          if (isSurprise) statsMap[slot.teacherId].taughtSurpriseCount += increment;
        }
      }

      slot.registrations?.forEach((reg: any) => {
        if (reg.isApproved && reg.evaluation && reg.evaluation?.reEvaluationStatus !== "DRAFT" && statsMap[reg.teacherId]) {
          const increment = slot.isDoublePeriod ? 2 : 1;
          statsMap[reg.teacherId].observedCount += increment;
          if (isSurprise) statsMap[reg.teacherId].observedSurpriseCount += increment;
        }
      });
    });

    return deptTeachers.map((t: any) => {
      const stats = statsMap[t.id] || { taughtCount: 0, observedCount: 0, taughtSurpriseCount: 0, observedSurpriseCount: 0 };
      const reqTaught = t.requiredTaught || 0;
      const reqObserved = t.requiredObserved || 0;
      const taughtUnit = t.taughtUnit || "tháng";
      const observedUnit = t.observedUnit || "tháng";

      const isTaughtMet = reqTaught === 0 || stats.taughtCount >= reqTaught;
      const isObservedMet = reqObserved === 0 || stats.observedCount >= reqObserved;
      const isAllMet = isTaughtMet && isObservedMet;

      return {
        ...t,
        taughtCount: stats.taughtCount,
        observedCount: stats.observedCount,
        taughtSurpriseCount: stats.taughtSurpriseCount || 0,
        observedSurpriseCount: stats.observedSurpriseCount || 0,
        reqTaught,
        reqObserved,
        taughtUnit,
        observedUnit,
        isTaughtMet,
        isObservedMet,
        isAllMet
      };
    });
  }, [deptTeachers, initialSlots, emailMonth]);

  const emailPreviewSummary = useMemo(() => {
    let totalTaught = 0;
    let totalObserved = 0;
    let totalSurpriseTaught = 0;
    let totalSurpriseObserved = 0;
    emailPreviewTeacherMatrix.forEach(t => {
      totalTaught += t.taughtCount;
      totalObserved += t.observedCount;
      totalSurpriseTaught += (t.taughtSurpriseCount || 0);
      totalSurpriseObserved += (t.observedSurpriseCount || 0);
    });
    return { totalTaught, totalObserved, totalSurpriseTaught, totalSurpriseObserved };
  }, [emailPreviewTeacherMatrix]);

  // Compute summary for ALL active departments by month
  const allDepartmentsSummary = useMemo(() => {
    return (activeDepartments || []).map((dept: any) => {
      const deptTeachersList = (initialTeachers || []).filter((t: any) => 
        t.departmentId === dept.id || t.departmentAssignments?.some((da: any) => da.departmentId === dept.id)
      );
      const teacherIds = new Set(deptTeachersList.map((t: any) => t.id));

      const ttcm = deptTeachersList.find((t: any) => 
        t.position === "TTCM" || t.departmentAssignments?.some((da: any) => da.departmentId === dept.id && da.position === "TTCM")
      );

      let totalTaught = 0;
      let totalObserved = 0;
      let taughtSurprise = 0;
      let observedSurprise = 0;
      let totalEvals = 0;
      let passingEvals = 0;

      (initialSlots || []).forEach((slot: any) => {
        if (selectedMonth !== "all") {
          if (!slot.date) return;
          const d = new Date(slot.date);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          if (`${yyyy}-${mm}` !== selectedMonth) return;
        }

        const isHost = teacherIds.has(slot.teacherId);
        const increment = slot.isDoublePeriod ? 2 : 1;
        const hasEvaluations = slot.registrations?.some(
          (r: any) => r.evaluation !== null && r.evaluation !== undefined && r.evaluation?.reEvaluationStatus !== "DRAFT"
        );
        const isSurprise = isSurpriseSlot(slot);

        if (isHost) {
          if (hasEvaluations) {
            totalTaught += increment;
            if (isSurprise) taughtSurprise += increment;
          }
          slot.registrations?.forEach((r: any) => {
            if (r.evaluation && r.evaluation?.reEvaluationStatus !== "DRAFT") {
              totalEvals++;
              const isK12 = slot.level !== "Mầm non";
              const passed = isK12
                ? (r.evaluation.totalScore !== null && r.evaluation.totalScore !== undefined ? r.evaluation.totalScore >= 14 : (r.evaluation.overallRating === "Giỏi" || r.evaluation.overallRating === "Khá"))
                : (r.evaluation.overallRating === "Tốt" || r.evaluation.overallRating === "Khá" || r.evaluation.overallRating === "Đạt");
              if (passed) passingEvals++;
            }
          });
        }

        slot.registrations?.forEach((reg: any) => {
          if (reg.isApproved && reg.evaluation && reg.evaluation?.reEvaluationStatus !== "DRAFT" && teacherIds.has(reg.teacherId)) {
            totalObserved += increment;
            if (isSurprise) observedSurprise += increment;
          }
        });
      });

      const passRate = totalEvals > 0 ? Math.round((passingEvals / totalEvals) * 100) : 0;

      return {
        id: dept.id,
        name: dept.name,
        teacherCount: deptTeachersList.length,
        ttcm,
        totalTaught,
        totalObserved,
        taughtSurprise,
        observedSurprise,
        totalEvals,
        passingEvals,
        passRate
      };
    });
  }, [activeDepartments, initialTeachers, initialSlots, selectedMonth]);

  const openEmailModalForDept = (deptId: string) => {
    setSelectedDeptId(deptId);
    const deptTeachersList = (initialTeachers || []).filter((t: any) => 
      t.departmentId === deptId || t.departmentAssignments?.some((da: any) => da.departmentId === deptId)
    );
    const ttcm = deptTeachersList.find((t: any) => 
      t.position === "TTCM" || t.departmentAssignments?.some((da: any) => da.departmentId === deptId && da.position === "TTCM")
    );
    setEmailTo(ttcm?.email || "");
    setEmailCc("");
    setEmailMonth(selectedMonth !== "all" ? selectedMonth : (availableMonths[0] || "all"));
    setEmailNotes("");
    setIsEmailModalOpen(true);
  };

  const openEmailModal = () => {
    setEmailTo(deptTTCM?.email || "");
    setEmailCc("");
    setEmailMonth(selectedMonth !== "all" ? selectedMonth : (availableMonths[0] || "all"));
    setEmailNotes("");
    setIsEmailModalOpen(true);
  };

  const handleSendEmailReport = async () => {
    if (!emailTo || !emailTo.includes("@")) {
      toast.error("Vui lòng nhập địa chỉ email hợp lệ cho TTCM");
      return;
    }
    setSendingEmail(true);
    try {
      const res = await fetch("/api/admin/du-gio/send-ttcm-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: selectedDeptId,
          academicYearId: filterAcademicYearId,
          month: emailMonth,
          ttcmEmail: emailTo,
          ttcmName: deptTTCM?.teacherName || "Tổ trưởng chuyên môn",
          customCc: emailCc || undefined,
          notes: emailNotes || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Đã gửi email báo cáo thành công cho TTCM!");
        setIsEmailModalOpen(false);
      } else {
        toast.error(data.error || "Gửi email thất bại");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối khi gửi email");
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredSlots = useMemo(() => {
    return selTeacherSlots.filter(slot => {
      const matchQuery = !searchSlotQuery || 
        slot.topic?.toLowerCase().includes(searchSlotQuery.toLowerCase()) ||
        (slot.subjectName && slot.subjectName.toLowerCase().includes(searchSlotQuery.toLowerCase())) ||
        (slot.className && slot.className.toLowerCase().includes(searchSlotQuery.toLowerCase()));
      const matchLevel = filterLevel === "all" || slot.level === filterLevel;
      const matchGrade = filterGrade === "all" || slot.grade === filterGrade;
      const isSurprise = isSurpriseSlot(slot);
      const matchOrigin = filterSlotOrigin === "all" ||
        (filterSlotOrigin === "SURPRISE" && isSurprise) ||
        (filterSlotOrigin === "PLAN" && !isSurprise);
      return matchQuery && matchLevel && matchGrade && matchOrigin;
    });
  }, [selTeacherSlots, searchSlotQuery, filterLevel, filterGrade, filterSlotOrigin]);

  const teacherEvaluations = useMemo(() => {
    const evals: any[] = [];
    selTeacherSlots.forEach(slot => {
      slot.registrations?.forEach((reg: any) => {
        if (reg.evaluation && reg.evaluation?.reEvaluationStatus !== "DRAFT") {
          evals.push({
            evaluation: reg.evaluation,
            level: slot.level,
            topic: slot.topic,
            date: slot.date
          });
        }
      });
    });
    return evals;
  }, [selTeacherSlots]);

  const isPreschoolTeacher = useMemo(() => {
    if (!selectedTeacherId) return false;
    const selTeacher = teachersList.find(t => t.id === selectedTeacherId);
    return selTeacherSlots.length > 0
      ? selTeacherSlots.every(s => ["Mầm non"].includes(s.level))
      : (selTeacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes("mam non");
  }, [selectedTeacherId, selTeacherSlots, teachersList]);

  const teacherCompetencyResult = useMemo(() => {
    const competencyData: any[] = [];
    const weaknessData: any[] = [];

    if (teacherEvaluations.length > 0) {
      if (!isPreschoolTeacher) {
        for (let i = 1; i <= 11; i++) {
          const scoreKey = "score" + i;
          const maxVal = maxScoresK12[i - 1];
          const sum = teacherEvaluations.reduce((acc, curr) => acc + (curr.evaluation[scoreKey] || 0), 0);
          const avg = sum / teacherEvaluations.length;
          const pct = Math.round((avg / maxVal) * 100);

          const lowCount = teacherEvaluations.filter(curr => {
            const val = curr.evaluation[scoreKey] !== null ? Number(curr.evaluation[scoreKey]) : 0;
            return val < maxVal * 0.70;
          }).length;
          const lowPct = Math.round((lowCount / teacherEvaluations.length) * 100);

          competencyData.push({
            id: "Y" + i,
            label: k12Labels[i - 1],
            avg: avg,
            max: maxVal,
            pct: pct,
            standard: i <= 2 ? 1 : i <= 5 ? 2 : i <= 9 ? 3 : 4
          });

          weaknessData.push({
            id: "Y" + i,
            label: k12Labels[i - 1],
            lowCount: lowCount,
            lowPct: lowPct,
            avgPct: pct
          });
        }
      } else {
        for (let i = 1; i <= 5; i++) {
          const critKey = "criterion" + i;
          const sum = teacherEvaluations.reduce((acc, curr) => acc + (curr.evaluation[critKey] || 0), 0);
          const avg = sum / teacherEvaluations.length;
          const pct = Math.round((avg / 4) * 100);

          const lowCount = teacherEvaluations.filter(curr => (curr.evaluation[critKey] || 0) <= 2).length;
          const lowPct = Math.round((lowCount / teacherEvaluations.length) * 100);

          competencyData.push({
            id: "T" + i,
            label: preschoolLabels[i - 1],
            avg: avg,
            max: 4,
            pct: pct,
            standard: 1
          });

          weaknessData.push({
            id: "T" + i,
            label: preschoolLabels[i - 1],
            lowCount: lowCount,
            lowPct: lowPct,
            avgPct: pct
          });
        }
      }
    }

    const sortedWeaknesses = [...weaknessData].sort((a, b) => b.lowPct - a.lowPct);
    return { competencyData, sortedWeaknesses };
  }, [teacherEvaluations, isPreschoolTeacher]);

  const deptCompetencyResult = useMemo(() => {
    const dep: any[] = [];
    const ids = new Set(deptTeachers.map(t => t.id));
    initialSlots.forEach(sl => {
      if (!ids.has(sl.teacherId)) return;
      if (selectedMonth !== "all") {
        if (!sl.date) return;
        const d2 = new Date(sl.date);
        if (isNaN(d2.getTime())) return;
        const mm2 = String(d2.getMonth() + 1).padStart(2, "0");
        if (d2.getFullYear() + "-" + mm2 !== selectedMonth) return;
      }
      sl.registrations?.forEach((r: any) => { 
        if (r.evaluation && r.evaluation?.reEvaluationStatus !== "DRAFT") dep.push({ ev: r.evaluation, lv: sl.level }); 
      });
    });

    const di = activeDepartments.find(d => d.id === selectedDeptId);
    const dmn = di ? di.blockCM === "Mầm Non" : false;
    const dc: any[] = [];
    const dw: any[] = [];

    if (dep.length > 0) {
      if (!dmn) {
        for (let i = 1; i <= 11; i++) {
          const sk = "score" + i, mx = maxScoresK12[i - 1];
          const sm = dep.reduce((a, x) => a + (x.ev[sk] || 0), 0), av = sm / dep.length, pt = Math.round((av / mx) * 100);
          const lc = dep.filter(x => { const v = x.ev[sk] !== null ? Number(x.ev[sk]) : 0; return v < mx * 0.7; }).length, lp = Math.round((lc / dep.length) * 100);
          dc.push({ id: "Y" + i, lb: k12Labels[i - 1], av, mx, pt, std: i <= 2 ? 1 : i <= 5 ? 2 : i <= 9 ? 3 : 4 });
          dw.push({ id: "Y" + i, lb: k12Labels[i - 1], lc, lp, pt });
        }
      } else {
        for (let i = 1; i <= 5; i++) {
          const ck = "criterion" + i;
          const sm = dep.reduce((a, x) => a + (x.ev[ck] || 0), 0), av = sm / dep.length, pt = Math.round((av / 4) * 100);
          const lc = dep.filter(x => (x.ev[ck] || 0) <= 2).length, lp = Math.round((lc / dep.length) * 100);
          dc.push({ id: "T" + i, lb: preschoolLabels[i - 1], av, mx: 4, pt, std: 1 });
          dw.push({ id: "T" + i, lb: preschoolLabels[i - 1], lc, lp, pt });
        }
      }
    }

    const dsw = [...dw].sort((a, b) => b.lp - a.lp);
    return { dep, dmn, dc, dsw };
  }, [deptTeachers, initialSlots, selectedMonth, activeDepartments, selectedDeptId]);

  const selectedTeacher = teachersList.find(t => t.id === selectedTeacherId) || null;
  const currentStats = selectedTeacher ? (teacherStats[selectedTeacher.id] || { taughtCount: 0, observedCount: 0, taughtSurpriseCount: 0, observedSurpriseCount: 0 }) : { taughtCount: 0, observedCount: 0, taughtSurpriseCount: 0, observedSurpriseCount: 0 };

  const teacherAvgScore = useMemo(() => {
    if (teacherEvaluations.length === 0) return null;
    if (isPreschoolTeacher) return null;
    const scores = teacherEvaluations
      .map(e => e.evaluation?.totalScore)
      .filter(s => s !== null && s !== undefined && typeof s === "number");
    if (scores.length === 0) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
  }, [teacherEvaluations, isPreschoolTeacher]);

  return (
    <div className="space-y-5 pb-12">
      <Toaster position="top-right" />

      {/* Sleek Compact Header & KPI Bar */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#055e5c] to-[#015856] rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-[#003B3A]/10 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-[#48BFE3] shrink-0">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Tổng hợp kết quả dự giờ
                </h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#48BFE3]/20 text-[#48BFE3] border border-[#48BFE3]/40 font-extrabold">
                  Tổ: {selectedDeptName}
                </span>
              </div>
              <p className="text-teal-100/80 text-xs font-medium mt-0.5">
                {isTTCM ? "Báo cáo chuyên môn & kiểm tra tiến độ dự giờ" : "Hệ thống quản trị & báo cáo dự giờ giảng dạy toàn trường"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="Xuất file Excel theo tháng cho các khối Phổ thông, Mầm non, Điều hành"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>Xuất Excel {selectedMonth === "all" ? "(Tất cả)" : `(Tháng ${selectedMonth.split("-")[1]})`}</span>
            </button>
            <button
              onClick={openEmailModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Mail className="w-4 h-4 text-slate-950" />
              <span>Báo Cáo Cho TTCM</span>
            </button>

            {academicYears && academicYears.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl text-xs">
                <Calendar className="w-3.5 h-3.5 text-[#48BFE3]" />
                <span className="text-white/70 font-semibold text-[11px]">Năm học:</span>
                <select
                  value={filterAcademicYearId}
                  onChange={(e) => handleAcademicYearChange(e.target.value)}
                  className="bg-transparent font-bold text-white outline-none cursor-pointer text-xs"
                >
                  {academicYears.map((yr: any) => (
                    <option key={yr.id} value={yr.id} className="text-slate-800 font-bold">
                      {yr.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 4 Compact Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 relative z-10 pt-3 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-teal-200">Tổng tiết dạy</div>
              <div className="text-xl font-black text-white mt-0.5">{departmentSummary.totalTaught} <span className="text-[10px] font-normal text-teal-200">tiết</span></div>
              {departmentSummary.taughtSurprise > 0 && (
                <div className="text-[9.5px] font-extrabold text-rose-300 flex items-center gap-1 mt-0.5">
                  <span>⚡ Trong đó: {departmentSummary.taughtSurprise} đột xuất</span>
                </div>
              )}
            </div>
            <GraduationCap className="w-5 h-5 text-emerald-300 opacity-80" />
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-teal-200">Tổng tiết dự</div>
              <div className="text-xl font-black text-white mt-0.5">{departmentSummary.totalObserved} <span className="text-[10px] font-normal text-teal-200">lượt</span></div>
              {departmentSummary.observedSurprise > 0 && (
                <div className="text-[9.5px] font-extrabold text-amber-300 flex items-center gap-1 mt-0.5">
                  <span>⚡ Trong đó: {departmentSummary.observedSurprise} đột xuất</span>
                </div>
              )}
            </div>
            <Eye className="w-5 h-5 text-sky-300 opacity-80" />
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-teal-200">Tỷ lệ Đạt chuẩn</div>
              <div className="text-xl font-black text-white mt-0.5">{departmentSummary.passRate}%</div>
            </div>
            <CheckCheck className="w-5 h-5 text-amber-300 opacity-80" />
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-teal-200">Giáo viên Tổ</div>
              <div className="text-xl font-black text-white mt-0.5">{deptTeachers.length} <span className="text-[10px] font-normal text-teal-200">GV</span></div>
            </div>
            <User className="w-5 h-5 text-violet-300 opacity-80" />
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Unified Clean Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-3.5">
          
          {/* Unified Sidebar Card */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-3.5">
            
            {/* Block Pills */}
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
              {availableBlocks.map(tab => {
                const isActive = activeBlockTab === tab;
                const count = departments.filter(dept => {
                  if (tab === "Phổ thông K-12" && dept.blockCM === "Phổ thông") return true;
                  if (tab === "Mầm non" && dept.blockCM === "Mầm Non") return true;
                  if (tab === "Điều hành" && dept.blockCM === "Điều hành") return true;
                  return false;
                }).length;

                return (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#003B3A] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>{tab}</span>
                    <span className={`ml-1 text-[10px] ${isActive ? "text-teal-200" : "text-slate-400"}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Department and Month Filters in 1 Row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Tổ chuyên môn</label>
                {isTTCM ? (
                  <div className="text-xs font-bold p-2 bg-teal-50 border border-teal-200 text-teal-900 rounded-xl truncate">
                    {selectedDeptName}
                  </div>
                ) : (
                  <select 
                    value={selectedDeptId} 
                    onChange={e => { setSelectedDeptId(e.target.value); setSelectedTeacherId(null); setSearchTeacherQuery(""); }}
                    className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#48BFE3] outline-none truncate"
                  >
                    {activeDepartments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Lọc theo tháng</label>
                <select 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#48BFE3] outline-none truncate"
                >
                  <option value="all">Tất cả tháng</option>
                  {availableMonths.map(m => {
                    const [year, month] = m.split("-");
                    return <option key={m} value={m}>Tháng {month}/{year}</option>;
                  })}
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm tên hoặc mã GV..."
                value={searchTeacherQuery}
                onChange={e => setSearchTeacherQuery(e.target.value)}
                className="w-full text-xs font-bold pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#48BFE3] outline-none"
              />
              {searchTeacherQuery && (
                <button onClick={() => setSearchTeacherQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Teacher Directory List */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between pb-2 mb-1.5">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Danh sách GV ({filteredDeptTeachers.length})
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {selectedDeptName}
                </span>
              </div>

              {filteredDeptTeachers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  Không tìm thấy giáo viên nào.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                  {filteredDeptTeachers.map((teacher: any) => {
                    const stats = teacherStats[teacher.id] || { taughtCount: 0, observedCount: 0 };
                    const isSelected = selectedTeacherId === teacher.id;

                    const taughtPassed = teacher.requiredTaught ? stats.taughtCount >= teacher.requiredTaught : stats.taughtCount > 0;
                    const observedPassed = teacher.requiredObserved ? stats.observedCount >= teacher.requiredObserved : stats.observedCount > 0;

                    return (
                      <button 
                        key={teacher.id} 
                        onClick={() => { 
                          setSelectedTeacherId(teacher.id); 
                          setSearchSlotQuery(""); 
                          setFilterLevel("all"); 
                          setFilterGrade("all"); 
                        }}
                        className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? "bg-gradient-to-r from-teal-50 to-emerald-50/50 border-[#48BFE3] shadow-xs ring-2 ring-[#48BFE3]/20"
                            : "bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/70"
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isSelected 
                              ? "bg-[#003B3A] text-white" 
                              : "bg-slate-200 text-slate-700"
                          }`}>
                            {teacher.teacherName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-black truncate ${isSelected ? "text-[#003B3A]" : "text-slate-800"}`}>
                              {teacher.teacherName}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                              <span>{teacher.teacherCode}</span>
                              {teacher.position && (
                                <span className="px-1 py-0.2 bg-amber-100 text-amber-800 rounded text-[8px] font-extrabold uppercase">
                                  {teacher.position}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-0.5 items-end shrink-0 text-[9px] font-bold">
                          <div className="flex items-center gap-1">
                            {stats.taughtSurpriseCount > 0 && (
                              <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold text-[8px] border border-amber-300" title={`Có ${stats.taughtSurpriseCount} tiết được dự đột xuất`}>
                                ⚡{stats.taughtSurpriseCount}
                              </span>
                            )}
                            <span className={`px-1.5 py-0.5 rounded-md border ${
                              taughtPassed ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}>
                              Dạy: {stats.taughtCount}{teacher.requiredTaught ? `/${teacher.requiredTaught}` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {stats.observedSurpriseCount > 0 && (
                              <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold text-[8px] border border-amber-300" title={`Đã dự ${stats.observedSurpriseCount} tiết đột xuất`}>
                                ⚡{stats.observedSurpriseCount}
                              </span>
                            )}
                            <span className={`px-1.5 py-0.5 rounded-md border ${
                              observedPassed ? "bg-violet-50 text-violet-800 border-violet-200" : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}>
                              Dự: {stats.observedCount}{teacher.requiredObserved ? `/${teacher.requiredObserved}` : ""}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Details, Sub-tabs & Work Area */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Teacher Profile & Tab Bar Card */}
          {selectedTeacher ? (
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              
              {/* Header profile info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#003B3A] to-[#48BFE3] text-white flex items-center justify-center font-black text-base shadow-sm">
                    {selectedTeacher.teacherName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-[#003B3A]">
                        {selectedTeacher.teacherName}
                      </h2>
                      <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                        {selectedTeacher.teacherCode}
                      </span>
                      {selectedTeacher.position && (
                        <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-extrabold uppercase">
                          {selectedTeacher.position}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Tổ: <strong className="text-slate-800">{selectedDeptName}</strong> • {selectedTeacher.email || "Chưa có email"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={openEmailModal}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shadow-xs transition-all hover:scale-[1.02]"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-950" />
                    <span>Báo Cáo Cho TTCM</span>
                  </button>
                  <button
                    onClick={() => openTargetConfig(selectedTeacher)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    <span>Thiết lập chỉ tiêu</span>
                  </button>
                  {teacherAvgScore && (
                    <div className="px-3 py-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-black text-xs shadow-xs text-center">
                      <div className="text-[8px] uppercase font-bold text-teal-100">ĐTB</div>
                      <div>{teacherAvgScore}đ</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-tab Navigation (Sleek, Compact, No Scrollbar) */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/90 rounded-2xl">
                <button
                  onClick={() => setActiveDetailTab("lich-su")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeDetailTab === "lich-su"
                      ? "bg-[#003B3A] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Tiết dạy</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${activeDetailTab === "lich-su" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                    {filteredSlots.length}
                  </span>
                  {(selectedTeacher && teacherStats[selectedTeacher.id]?.taughtSurpriseCount > 0) && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold flex items-center gap-0.5 ${
                      activeDetailTab === "lich-su" ? "bg-amber-400 text-slate-950" : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}>
                      ⚡ {teacherStats[selectedTeacher.id]?.taughtSurpriseCount} ĐX
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveDetailTab("lich-su-du")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeDetailTab === "lich-su-du"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Tiết dự</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${activeDetailTab === "lich-su-du" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                    {filteredObservedSlots.length}
                  </span>
                  {(selectedTeacher && teacherStats[selectedTeacher.id]?.observedSurpriseCount > 0) && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold flex items-center gap-0.5 ${
                      activeDetailTab === "lich-su-du" ? "bg-amber-400 text-slate-950" : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}>
                      ⚡ {teacherStats[selectedTeacher.id]?.observedSurpriseCount} ĐX
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveDetailTab("tien-do-to")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeDetailTab === "tien-do-to"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Tiến độ Tổ CM</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${activeDetailTab === "tien-do-to" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                    {deptTeachers.length} GV
                  </span>
                </button>

                <button
                  onClick={() => setActiveDetailTab("ma-tran-ttcm")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeDetailTab === "ma-tran-ttcm"
                      ? "bg-gradient-to-r from-[#003B3A] to-teal-700 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                  title="Xem bảng Ma trận dự giờ Tổ trưởng chuyên môn theo tháng"
                >
                  <Grid3X3 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Ma trận dự giờ TTCM</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${activeDetailTab === "ma-tran-ttcm" ? "bg-white/20 text-white" : "bg-teal-100 text-teal-900"}`}>
                    {allTTCMList.length} TTCM
                  </span>
                </button>

                <button
                  onClick={() => setActiveDetailTab("phan-tich")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeDetailTab === "phan-tich"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Năng lực cá nhân</span>
                </button>

                <button
                  onClick={() => setActiveDetailTab("to-cm")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeDetailTab === "to-cm"
                      ? "bg-violet-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Năng lực Tổ CM</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-200/90 text-center py-12">
              <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-black text-slate-600 uppercase">Vui lòng chọn giáo viên để xem chi tiết</p>
            </div>
          )}

          {/* TAB 1: Lịch sử tiết dạy */}
          {activeDetailTab === "lich-su" && selectedTeacher && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              
              {/* Compact Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="sm:col-span-5 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm chủ đề, đề tài, lớp..."
                    value={searchSlotQuery}
                    onChange={e => setSearchSlotQuery(e.target.value)}
                    className="w-full text-xs font-bold pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-[#48BFE3] outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <select 
                    value={filterLevel} 
                    onChange={e => { setFilterLevel(e.target.value); setFilterGrade("all"); }}
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:border-[#48BFE3] outline-none"
                  >
                    <option value="all">Mọi cấp học</option>
                    <option value="Tiểu học">Tiểu học</option>
                    <option value="THCS">THCS</option>
                    <option value="THPT">THPT</option>
                    <option value="Mầm non">Mầm non</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <select 
                    value={filterGrade} 
                    onChange={e => setFilterGrade(e.target.value)}
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:border-[#48BFE3] outline-none"
                  >
                    <option value="all">Mọi khối</option>
                    {Array.from(new Set(selTeacherSlots.map(s => s.grade))).filter(Boolean).sort().map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <select 
                    value={filterSlotOrigin} 
                    onChange={e => setFilterSlotOrigin(e.target.value as any)}
                    className="w-full text-xs font-black p-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:border-[#48BFE3] outline-none"
                  >
                    <option value="all">Mọi hình thức</option>
                    <option value="PLAN">📋 Theo kế hoạch</option>
                    <option value="SURPRISE">⚡ Đột xuất</option>
                  </select>
                </div>
              </div>

              {/* Slot Cards List */}
              {filteredSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <ClipboardList className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-600">Không tìm thấy tiết dạy nào tương ứng</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Hãy thử thay đổi điều kiện lọc hoặc chọn tháng khác</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredSlots.map(slot => {
                    const avgScore = getSlotAverageScore(slot);
                    const slotDate = new Date(slot.date);
                    const evals = slot.registrations?.filter(
                      (r: any) => r.evaluation !== null && r.evaluation?.reEvaluationStatus !== "DRAFT"
                    ) || [];
                    const isMamNonBlock = slot.level === "Mầm non" || 
                      (slot.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes("mam non");
                    const isSurprise = isSurpriseSlot(slot);

                    return (
                      <div 
                        key={slot.id} 
                        className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all space-y-3 relative overflow-hidden"
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1 ${
                          isMamNonBlock ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-[#003B3A] to-[#48BFE3]"
                        }`} />

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pt-1">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {isSurprise && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-black flex items-center gap-1 shadow-2xs">
                                  ⚡ Tiết dự đột xuất
                                </span>
                              )}
                              <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase ${
                                isMamNonBlock 
                                  ? "bg-amber-100 text-amber-800 border border-amber-300" 
                                  : "bg-teal-100 text-teal-800 border border-teal-300"
                              }`}>
                                {slot.level}
                              </span>
                              {slot.grade && (
                                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[9px] font-bold">
                                  {slot.grade}
                                </span>
                              )}
                              <span className="px-1.5 py-0.2 bg-sky-50 text-sky-700 border border-sky-200 rounded text-[9px] font-bold flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {slotDate.toLocaleDateString("vi-VN")}
                              </span>
                              {slot.className && (
                                <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[9px] font-bold">
                                  Lớp: {slot.className}
                                </span>
                              )}
                              {slot.isDoublePeriod && (
                                <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] font-bold">
                                  Tiết đôi (x2)
                                </span>
                              )}
                            </div>

                            <div>
                              {slot.subjectName && (
                                <span className="text-[11px] font-bold text-slate-400 block">
                                  Môn: {slot.subjectName}
                                </span>
                              )}
                              <h3 className="text-sm sm:text-base font-black text-[#003B3A] tracking-tight">
                                {slot.topic}
                              </h3>
                            </div>
                          </div>

                          <div className="shrink-0 sm:text-right">
                            {avgScore !== null ? (
                              <div className="inline-flex flex-col items-end">
                                <span className="px-2.5 py-1 bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-900 border border-teal-300 rounded-xl font-black text-[11px]">
                                  ĐTB: {typeof avgScore === "number" ? avgScore.toFixed(2) + "/20.0đ" : avgScore}
                                </span>
                                <span className="text-[9px] font-bold text-emerald-600 mt-0.5 flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Đã nghiệm thu
                                </span>
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl font-bold text-[11px]">
                                ĐTB: --
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Evaluations list */}
                        {evals.length > 0 && (
                          <div className="pt-2.5 border-t border-slate-100 space-y-2">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-[#48BFE3]" />
                              <span>Phiếu đánh giá từ người dự ({evals.length})</span>
                            </h4>

                            <div className="space-y-2">
                              {evals.map((reg: any) => {
                                const evalData = reg.evaluation;
                                const passed = isPreschoolTeacher
                                  ? (evalData.overallRating === "Tốt" || evalData.overallRating === "Khá" || evalData.overallRating === "Đạt")
                                  : (evalData.totalScore !== null && evalData.totalScore !== undefined ? evalData.totalScore >= 14 : (evalData.overallRating === "Giỏi" || evalData.overallRating === "Khá"));

                                return (
                                  <div 
                                    key={reg.id} 
                                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-[#003B3A] text-white flex items-center justify-center font-black text-[10px]">
                                          {reg.teacher?.teacherName.charAt(0) || "U"}
                                        </div>
                                        <div>
                                          <p className="font-black text-slate-800 text-[11px]">{reg.teacher?.teacherName}</p>
                                          <p className="text-[9px] text-slate-400 font-semibold">{reg.teacher?.teacherCode}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                                          {evalData.totalScore !== null && evalData.totalScore !== undefined
                                            ? evalData.totalScore.toFixed(2) + "đ"
                                            : evalData.overallRating}
                                        </span>
                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                          passed ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-rose-100 text-rose-800 border-rose-300"
                                        }`}>
                                          {passed ? "ĐẠT" : "CHƯA ĐẠT"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Feedback */}
                                    {(evalData.strengths || evalData.improvements) && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                                        {evalData.strengths && (
                                          <div className="p-2 bg-emerald-50/60 rounded-lg text-emerald-950 border border-emerald-100">
                                            <strong className="text-emerald-800 block mb-0.5">Ưu điểm:</strong>
                                            <p className="italic text-[10px]">{evalData.strengths}</p>
                                          </div>
                                        )}
                                        {evalData.improvements && (
                                          <div className="p-2 bg-amber-50/60 rounded-lg text-amber-950 border border-amber-100">
                                            <strong className="text-amber-800 block mb-0.5">Góp ý phát triển:</strong>
                                            <p className="italic text-[10px]">{evalData.improvements}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Lịch sử tiết dự */}
          {activeDetailTab === "lich-su-du" && selectedTeacher && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              
              {/* Compact Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="sm:col-span-5 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo GV được dự, chủ đề, lớp..."
                    value={searchSlotQuery}
                    onChange={e => setSearchSlotQuery(e.target.value)}
                    className="w-full text-xs font-bold pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-[#48BFE3] outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <select 
                    value={filterLevel} 
                    onChange={e => { setFilterLevel(e.target.value); setFilterGrade("all"); }}
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:border-[#48BFE3] outline-none"
                  >
                    <option value="all">Mọi cấp học</option>
                    <option value="Tiểu học">Tiểu học</option>
                    <option value="THCS">THCS</option>
                    <option value="THPT">THPT</option>
                    <option value="Mầm non">Mầm non</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <select 
                    value={filterGrade} 
                    onChange={e => setFilterGrade(e.target.value)}
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:border-[#48BFE3] outline-none"
                  >
                    <option value="all">Mọi khối</option>
                    {Array.from(new Set(selTeacherObservedSlots.map(s => s.slot.grade))).filter(Boolean).sort().map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <select 
                    value={filterObservedSlotOrigin} 
                    onChange={e => setFilterObservedSlotOrigin(e.target.value as any)}
                    className="w-full text-xs font-black p-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:border-[#48BFE3] outline-none"
                  >
                    <option value="all">Mọi hình thức</option>
                    <option value="PLAN">📋 Theo kế hoạch</option>
                    <option value="SURPRISE">⚡ Đột xuất</option>
                  </select>
                </div>
              </div>

              {/* Observed Slot Cards List */}
              {filteredObservedSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Eye className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-600">Không tìm thấy lượt dự giờ nào</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Giáo viên này chưa có phiếu dự giờ đã duyệt trong kỳ được chọn</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredObservedSlots.map(({ slot, reg, evaluation, hostTeacher }) => {
                    const slotDate = new Date(slot.date);
                    const isMamNon = slot.level === "Mầm non";
                    const isSurprise = isSurpriseSlot(slot);
                    const passed = isMamNon
                      ? (evaluation?.overallRating === "Tốt" || evaluation?.overallRating === "Khá" || evaluation?.overallRating === "Đạt")
                      : (evaluation?.totalScore !== null && evaluation?.totalScore !== undefined ? evaluation?.totalScore >= 14 : (evaluation?.overallRating === "Giỏi" || evaluation?.overallRating === "Khá"));

                    return (
                      <div 
                        key={reg.id} 
                        className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all space-y-3 relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-[#48BFE3]" />

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pt-1">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {isSurprise && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-black flex items-center gap-1 shadow-2xs">
                                  ⚡ Dự giờ đột xuất
                                </span>
                              )}
                              <span className="px-2 py-0.5 text-[9px] font-black rounded-md uppercase bg-teal-100 text-teal-800 border border-teal-300">
                                {slot.level}
                              </span>
                              {slot.grade && (
                                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[9px] font-bold">
                                  {slot.grade}
                                </span>
                              )}
                              <span className="px-1.5 py-0.2 bg-sky-50 text-sky-700 border border-sky-200 rounded text-[9px] font-bold flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {slotDate.toLocaleDateString("vi-VN")}
                              </span>
                              {slot.className && (
                                <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[9px] font-bold">
                                  Lớp: {slot.className}
                                </span>
                              )}
                              {slot.isDoublePeriod && (
                                <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] font-bold">
                                  Tiết đôi (x2)
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold">
                                GV dạy: <strong>{hostTeacher?.teacherName || slot.teacher?.teacherName}</strong>
                              </span>
                            </div>

                            <div>
                              {slot.subjectName && (
                                <span className="text-[11px] font-bold text-slate-400 block">
                                  Môn: {slot.subjectName}
                                </span>
                              )}
                              <h3 className="text-sm sm:text-base font-black text-[#003B3A] tracking-tight">
                                {slot.topic}
                              </h3>
                            </div>
                          </div>

                          <div className="shrink-0 sm:text-right">
                            {evaluation ? (
                              <div className="inline-flex flex-col items-end">
                                <span className="px-2.5 py-1 bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-900 border border-teal-300 rounded-xl font-black text-[11px]">
                                  {evaluation.totalScore !== null && evaluation.totalScore !== undefined
                                    ? `Điểm: ${evaluation.totalScore.toFixed(2)}/20.0đ`
                                    : `Xếp loại: ${evaluation.overallRating}`}
                                </span>
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border mt-1 ${
                                  passed ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-rose-100 text-rose-800 border-rose-300"
                                }`}>
                                  {passed ? "ĐẠT CHUẨN" : "CHƯA ĐẠT"}
                                </span>
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl font-bold text-[11px]">
                                Chưa hoàn tất
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Evaluation feedback summary */}
                        {evaluation && (
                          <div className="pt-2.5 border-t border-slate-100 space-y-2">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <BookMarked className="w-3.5 h-3.5 text-[#48BFE3]" />
                              <span>Phiếu nhận xét & chấm điểm đã nộp</span>
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              {evaluation.strengths && (
                                <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-950">
                                  <strong className="text-emerald-800 block mb-0.5">Ưu điểm:</strong>
                                  <p className="italic text-[10px] leading-relaxed">{evaluation.strengths}</p>
                                </div>
                              )}
                              {evaluation.improvements && (
                                <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-950">
                                  <strong className="text-amber-800 block mb-0.5">Góp ý phát triển:</strong>
                                  <p className="italic text-[10px] leading-relaxed">{evaluation.improvements}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Báo cáo & Tiến độ Tổ Chuyên Môn */}
          {activeDetailTab === "tien-do-to" && (
            <div className="space-y-6">
              
              {/* BẢNG 1: BẢNG THỐNG KÊ TIẾN ĐỘ CÁC TỔ CHUYÊN MÔN THEO THÁNG */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md overflow-hidden space-y-0">
                <div className="p-4 sm:p-5 bg-gradient-to-r from-[#003B3A] via-[#064E3B] to-[#0369A1] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-400/30 text-[9.5px] font-extrabold uppercase tracking-wide">
                        Tổng hợp toàn diện
                      </span>
                      <span className="text-[11px] text-amber-300 font-bold">
                        {allDepartmentsSummary.length} Tổ chuyên môn
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black tracking-tight mt-1 text-white">
                      BẢNG THỐNG KÊ TIẾN ĐỘ CÁC TỔ CHUYÊN MÔN THEO THÁNG
                    </h3>
                    <p className="text-[11px] text-teal-100/80 mt-0.5">
                      Kỳ báo cáo: <strong className="text-amber-200">{selectedMonth === "all" ? "Toàn bộ năm học" : `Tháng ${selectedMonth.split("-")[1]}/${selectedMonth.split("-")[0]}`}</strong> &bull; Nhấp vào hàng để xem chi tiết giáo viên của Tổ
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">

                    <button
                      onClick={handleExportExcel}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 transition-all shrink-0 border border-emerald-500 cursor-pointer"
                      title="Xuất file Excel theo tháng cho các khối Phổ thông, Mầm non, Điều hành"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-white" />
                      <span>Xuất File Excel</span>
                    </button>
                    <button
                      onClick={openAllDeptsEmailModal}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 text-slate-950 font-black text-xs shadow-md flex items-center gap-1.5 transition-all shrink-0 border border-amber-300"
                    >
                      <Mail className="w-4 h-4 text-slate-950" />
                      <span>Gửi Email Báo Cáo Ban ĐHCM</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/80 text-[11px] font-black uppercase text-slate-700 tracking-wider">
                        <th className="py-3 px-3 text-center w-12">STT</th>
                        <th className="py-3 px-4 min-w-[190px]">Tổ Chuyên Môn</th>
                        <th className="py-3 px-3 text-center min-w-[90px]">Giáo Viên Tổ</th>
                        <th className="py-3 px-3 text-center min-w-[110px]">Tổng Tiết Dạy</th>
                        <th className="py-3 px-3 text-center min-w-[110px] text-amber-900 bg-amber-50/50">Dạy Đột Xuất ⚡</th>
                        <th className="py-3 px-3 text-center min-w-[110px]">Tổng Tiết Dự</th>
                        <th className="py-3 px-3 text-center min-w-[110px] text-amber-900 bg-amber-50/50">Dự Đột Xuất ⚡</th>
                        <th className="py-3 px-3 text-center min-w-[100px]">Gửi Mail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {allDepartmentsSummary.map((dept: any, idx: number) => {
                        const isCurrentSelected = selectedDeptId === dept.id;
                        return (
                          <tr 
                            key={dept.id}
                            onClick={() => setSelectedDeptId(dept.id)}
                            className={`hover:bg-teal-50/50 cursor-pointer transition-colors ${isCurrentSelected ? "bg-teal-50/70 border-l-4 border-l-[#003B3A]" : ""}`}
                          >
                            <td className="py-3 px-3 text-center font-bold text-slate-400 text-xs">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                                  isCurrentSelected ? "bg-[#003B3A] text-white" : "bg-slate-100 text-slate-700"
                                }`}>
                                  {dept.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                                    <span>{dept.name}</span>
                                    {isCurrentSelected && (
                                      <span className="px-1.5 py-0.2 rounded bg-teal-100 text-[#003B3A] font-extrabold text-[8.5px]">
                                        Đang xem
                                      </span>
                                    )}
                                  </p>
                                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                    {dept.ttcm ? (
                                      <span className="text-teal-700 font-bold">TTCM: {dept.ttcm.teacherName}</span>
                                    ) : (
                                      <span className="text-slate-400 italic">Chưa gán TTCM</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-black text-[11px] border border-slate-200 inline-block">
                                {dept.teacherCount} GV
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-black text-[11px] border border-emerald-200 inline-block">
                                {dept.totalTaught} tiết
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2.5 py-1 rounded-lg font-black text-[11px] border inline-block ${
                                dept.taughtSurprise > 0 
                                  ? "bg-amber-100/70 text-amber-900 border-amber-300 shadow-2xs" 
                                  : "bg-slate-50 text-slate-400 border-slate-200"
                              }`}>
                                {dept.taughtSurprise > 0 ? `⚡ ${dept.taughtSurprise} tiết` : "0"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-black text-[11px] border border-sky-200 inline-block">
                                {dept.totalObserved} lượt
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2.5 py-1 rounded-lg font-black text-[11px] border inline-block ${
                                dept.observedSurprise > 0 
                                  ? "bg-amber-100/70 text-amber-900 border-amber-300 shadow-2xs" 
                                  : "bg-slate-50 text-slate-400 border-slate-200"
                              }`}>
                                {dept.observedSurprise > 0 ? `⚡ ${dept.observedSurprise} lượt` : "0"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openEmailModalForDept(dept.id)}
                                className="px-3 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#002d2c] text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 mx-auto transition-all"
                                title={`Gửi Email báo cáo cho TTCM ${dept.name}`}
                              >
                                <Mail className="w-3 h-3 text-[#48BFE3]" />
                                <span>Gửi Mail</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-black text-xs border-t-2 border-slate-300 text-slate-800">
                      <tr>
                        <td colSpan={2} className="py-3 px-4 uppercase text-slate-700 font-black">
                          Tổng Toàn Bộ ({allDepartmentsSummary.length} Tổ CM)
                        </td>
                        <td className="py-3 px-3 text-center font-black">
                          {allDepartmentsSummary.reduce((sum: number, d: any) => sum + (d.teacherCount || 0), 0)} GV
                        </td>
                        <td className="py-3 px-3 text-center font-black text-emerald-800">
                          {allDepartmentsSummary.reduce((sum: number, d: any) => sum + (d.totalTaught || 0), 0)} tiết
                        </td>
                        <td className="py-3 px-3 text-center font-black text-amber-900 bg-amber-50/50">
                          ⚡ {allDepartmentsSummary.reduce((sum: number, d: any) => sum + (d.taughtSurprise || 0), 0)} tiết
                        </td>
                        <td className="py-3 px-3 text-center font-black text-sky-800">
                          {allDepartmentsSummary.reduce((sum: number, d: any) => sum + (d.totalObserved || 0), 0)} lượt
                        </td>
                        <td className="py-3 px-3 text-center font-black text-amber-900 bg-amber-50/50">
                          ⚡ {allDepartmentsSummary.reduce((sum: number, d: any) => sum + (d.observedSurprise || 0), 0)} lượt
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* BẢNG 2: DANH SÁCH GIÁO VIÊN & ĐỐI CHIẾU CHỈ TIÊU CỦA TỔ ĐANG CHỌN */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#003B3A]" />
                      <span>Chi tiết: Danh sách Giáo viên & Đối chiếu Chỉ tiêu - {selectedDeptName} ({deptTeachers.length} GV)</span>
                    </h4>
                    <p className="text-[10.5px] text-slate-500 font-semibold mt-0.5">
                      Kỳ: {selectedMonth === "all" ? "Toàn bộ năm học" : `Tháng ${selectedMonth.split("-")[1]}/${selectedMonth.split("-")[0]}`} {deptTTCM ? `• TTCM: ${deptTTCM.teacherName}` : ""}
                    </p>
                  </div>

                  <button
                    onClick={openEmailModal}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shadow-2xs flex items-center gap-1.5 transition-all shrink-0 self-start sm:self-auto"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Gửi Email Tổ {selectedDeptName}</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-600 tracking-wider">
                        <th className="py-2.5 px-3 text-center w-10">STT</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Giáo viên Bộ môn</th>
                        <th className="py-2.5 px-3 text-center min-w-[140px]">Tiết Dạy</th>
                        <th className="py-2.5 px-3 text-center min-w-[140px]">Tiết Dự</th>
                        <th className="py-2.5 px-3 text-center w-24">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {deptTeacherMatrix.map((t: any, idx: number) => {
                        const isSelected = selectedTeacherId === t.id;
                        return (
                          <tr 
                            key={t.id}
                            className={`hover:bg-slate-50/80 transition-colors ${isSelected ? "bg-teal-50/40" : ""}`}
                          >
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400 text-xs">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#003B3A] text-white flex items-center justify-center font-black text-xs shrink-0">
                                  {t.teacherName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-black text-slate-800 text-xs truncate">{t.teacherName}</p>
                                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold">
                                    <span>{t.teacherCode}</span>
                                    {t.position && (
                                      <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-extrabold uppercase text-[8px]">
                                        {t.position}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-block ${
                                  t.reqTaught > 0
                                    ? (t.isTaughtMet ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")
                                    : (t.taughtCount > 0 ? "bg-teal-50 text-teal-800 border-teal-200" : "bg-slate-50 text-slate-500 border-slate-200")
                                }`}>
                                  {t.taughtCount} {t.reqTaught > 0 ? `/ ${t.reqTaught} (${t.taughtUnit})` : "tiết"}
                                </span>
                                {t.taughtSurpriseCount > 0 && (
                                  <div className="text-[9px] text-amber-800 font-extrabold mt-0.5 flex items-center justify-center gap-0.5">
                                    ⚡ {t.taughtSurpriseCount} đột xuất
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-block ${
                                  t.reqObserved > 0
                                    ? (t.isObservedMet ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200")
                                    : (t.observedCount > 0 ? "bg-cyan-50 text-cyan-800 border-cyan-200" : "bg-slate-50 text-slate-500 border-slate-200")
                                }`}>
                                  {t.observedCount} {t.reqObserved > 0 ? `/ ${t.reqObserved} (${t.observedUnit})` : "lượt"}
                                </span>
                                {t.observedSurpriseCount > 0 && (
                                  <div className="text-[9px] text-amber-800 font-extrabold mt-0.5 flex items-center justify-center gap-0.5">
                                    ⚡ {t.observedSurpriseCount} đột xuất
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => {
                                  setSelectedTeacherId(t.id);
                                  setActiveDetailTab("lich-su");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#003B3A] text-slate-700 hover:text-white font-bold text-[11px] transition-all"
                              >
                                Xem
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Ma trận dự giờ cho TTCM theo tháng */}
          {activeDetailTab === "ma-tran-ttcm" && (() => {
            const activeMonth = ttcmMatrixMonth !== "all" ? ttcmMatrixMonth : selectedMonth;
            const activeMonthText = activeMonth === "all" ? "Toàn bộ năm học" : `Tháng ${activeMonth.split("-")[1]}/${activeMonth.split("-")[0]}`;

            return (
              <div className="space-y-5">
                
                {/* 1. Header Banner & View Controls */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md overflow-hidden">
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-[#003B3A] via-[#064E3B] to-[#0369A1] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-400/30 text-[9.5px] font-extrabold uppercase tracking-wide flex items-center gap-1">
                          <Grid3X3 className="w-3 h-3 text-teal-300" />
                          <span>Ma trận đối chiếu liên cơ sở</span>
                        </span>
                        <span className="text-[11px] text-amber-300 font-bold">
                          {filteredTTCMMatrix.length} Tổ trưởng chuyên môn
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black tracking-tight mt-1 text-white flex items-center gap-2">
                        <span>BẢNG MA TRẬN DỰ GIỜ TTCM THEO THÁNG</span>
                      </h3>
                      <p className="text-[11px] text-teal-100/80 mt-0.5">
                        Kỳ báo cáo: <strong className="text-amber-200">{activeMonthText}</strong> &bull; Thống kê số tiết dự giờ theo Cơ sở công tác &amp; Cơ sở dự giờ thực tế
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* View Mode Toggle */}
                      <div className="bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/15 flex items-center gap-1">
                        <button
                          onClick={() => setTtcmViewMode("detailed-list")}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            ttcmViewMode === "detailed-list"
                              ? "bg-white text-[#003B3A] shadow-xs font-black"
                              : "text-teal-100 hover:text-white hover:bg-white/10"
                          }`}
                          title="Chế độ Bảng danh sách chi tiết (STT, Họ tên, Chức vụ, Cơ sở, Cơ sở dự giờ, Số tiết)"
                        >
                          <Table2 className="w-3.5 h-3.5" />
                          <span>Danh sách chi tiết</span>
                        </button>
                        <button
                          onClick={() => setTtcmViewMode("pivot-matrix")}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            ttcmViewMode === "pivot-matrix"
                              ? "bg-white text-[#003B3A] shadow-xs font-black"
                              : "text-teal-100 hover:text-white hover:bg-white/10"
                          }`}
                          title="Chế độ Ma trận 2 chiều đối chiếu các Cơ sở"
                        >
                          <Grid3X3 className="w-3.5 h-3.5" />
                          <span>Ma trận Pivot 2D</span>
                        </button>
                      </div>

                      {/* Export Excel Button */}
                      <button
                        onClick={handleExportTTCMExcel}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 transition-all shrink-0 border border-emerald-500 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        title="Xuất dữ liệu Ma trận dự giờ TTCM ra file Excel đầy đủ 2 Sheet"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-white" />
                        <span>Xuất Excel Ma Trận</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Top KPI Metric Cards (5 Cards) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-slate-50/80 border-b border-slate-200">
                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500">Tổng TTCM</span>
                        <UserCheck className="w-4 h-4 text-teal-600" />
                      </div>
                      <div className="text-lg font-black text-slate-900 mt-1">
                        {ttcmMatrixKPIs.totalTTCM} <span className="text-[10px] font-normal text-slate-500">nhân sự</span>
                      </div>
                      <div className="text-[10px] font-semibold text-teal-700 mt-0.5">
                        {ttcmMatrixBlock === "all" ? "Tất cả các khối" : ttcmMatrixBlock}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500">Tổng tiết đã dự</span>
                        <Eye className="w-4 h-4 text-sky-600" />
                      </div>
                      <div className="text-lg font-black text-sky-800 mt-1">
                        {ttcmMatrixKPIs.totalObserved} <span className="text-[10px] font-normal text-slate-500">tiết</span>
                      </div>
                      <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                        {ttcmMatrixKPIs.totalSurprise > 0 ? `⚡ ${ttcmMatrixKPIs.totalSurprise} tiết đột xuất` : "Không có đột xuất"}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500">Dự tại cơ sở (Nội bộ)</span>
                        <School className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-lg font-black text-emerald-800 mt-1">
                        {ttcmMatrixKPIs.totalInternal} <span className="text-[10px] font-normal text-slate-500">tiết</span>
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                        {ttcmMatrixKPIs.totalObserved > 0 ? `${Math.round((ttcmMatrixKPIs.totalInternal / ttcmMatrixKPIs.totalObserved) * 100)}% tổng số tiết` : "0%"}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500">Dự liên cơ sở (Chéo CS)</span>
                        <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="text-lg font-black text-indigo-800 mt-1">
                        {ttcmMatrixKPIs.totalCross} <span className="text-[10px] font-normal text-slate-500">tiết</span>
                      </div>
                      <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">
                        {ttcmMatrixKPIs.totalObserved > 0 ? `${Math.round((ttcmMatrixKPIs.totalCross / ttcmMatrixKPIs.totalObserved) * 100)}% liên cơ sở` : "0%"}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500">Đạt chỉ tiêu dự giờ</span>
                        <CheckCheck className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-lg font-black text-slate-900 mt-1 flex items-baseline gap-1">
                        <span>{ttcmMatrixKPIs.targetMetCount}/{ttcmMatrixKPIs.totalTTCM}</span>
                        <span className="text-xs font-black text-amber-700">({ttcmMatrixKPIs.metRate}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${ttcmMatrixKPIs.metRate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Interactive Filter Toolbar */}
                  <div className="p-3.5 sm:p-4 bg-white border-b border-slate-100 flex flex-wrap items-center gap-2.5">
                    {/* Month Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      <span className="text-[10.5px] font-bold text-slate-500">Tháng:</span>
                      <select
                        value={ttcmMatrixMonth}
                        onChange={(e) => setTtcmMatrixMonth(e.target.value)}
                        className="bg-transparent font-black text-slate-800 outline-none cursor-pointer text-xs"
                      >
                        <option value="all">Toàn bộ năm học</option>
                        {availableMonths.map(m => (
                          <option key={m} value={m}>
                            Tháng {m.split("-")[1]}/{m.split("-")[0]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Block Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                      <Layers className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      <span className="text-[10.5px] font-bold text-slate-500">Khối:</span>
                      <select
                        value={ttcmMatrixBlock}
                        onChange={(e) => setTtcmMatrixBlock(e.target.value)}
                        className="bg-transparent font-black text-slate-800 outline-none cursor-pointer text-xs"
                      >
                        <option value="all">Tất cả khối</option>
                        <option value="Phổ thông K-12">Phổ thông K-12</option>
                        <option value="Mầm non">Mầm non</option>
                        <option value="Điều hành">Điều hành</option>
                      </select>
                    </div>

                    {/* Home Campus Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                      <School className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      <span className="text-[10.5px] font-bold text-slate-500">Cơ sở TTCM:</span>
                      <select
                        value={ttcmMatrixCampus}
                        onChange={(e) => setTtcmMatrixCampus(e.target.value)}
                        className="bg-transparent font-black text-slate-800 outline-none cursor-pointer text-xs max-w-[140px] truncate"
                      >
                        <option value="all">Tất cả cơ sở</option>
                        {campuses.map(c => (
                          <option key={c.id} value={c.campusName}>
                            {c.campusName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Observed Campus Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      <span className="text-[10.5px] font-bold text-slate-500">Cơ sở dự giờ:</span>
                      <select
                        value={ttcmMatrixObservedCampus}
                        onChange={(e) => setTtcmMatrixObservedCampus(e.target.value)}
                        className="bg-transparent font-black text-slate-800 outline-none cursor-pointer text-xs max-w-[140px] truncate"
                      >
                        <option value="all">Tất cả cơ sở</option>
                        {distinctObservedCampusNames.map(cn => (
                          <option key={cn} value={cn}>
                            {cn}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Search Input */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs flex-1 min-w-[180px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={ttcmSearchQuery}
                        onChange={(e) => setTtcmSearchQuery(e.target.value)}
                        placeholder="Tìm theo tên, mã GV, tổ CM..."
                        className="bg-transparent font-bold text-slate-800 outline-none text-xs w-full"
                      />
                      {ttcmSearchQuery && (
                        <button
                          onClick={() => setTtcmSearchQuery("")}
                          className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Reset Filters */}
                    {(ttcmMatrixMonth !== "all" || ttcmMatrixBlock !== "all" || ttcmMatrixCampus !== "all" || ttcmMatrixObservedCampus !== "all" || ttcmSearchQuery) && (
                      <button
                        onClick={() => {
                          setTtcmMatrixMonth("all");
                          setTtcmMatrixBlock("all");
                          setTtcmMatrixCampus("all");
                          setTtcmMatrixObservedCampus("all");
                          setTtcmSearchQuery("");
                        }}
                        className="px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-all shrink-0"
                      >
                        Xóa bộ lọc
                      </button>
                    )}
                  </div>

                  {/* 4. Table Views */}
                  {filteredTTCMMatrix.length === 0 ? (
                    <div className="p-12 text-center bg-white space-y-2">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-black text-slate-600 uppercase">Không tìm thấy TTCM nào phù hợp với bộ lọc</p>
                      <p className="text-[11px] text-slate-400 font-medium">Vui lòng thay đổi tháng, khối hoặc cơ sở đang lọc</p>
                    </div>
                  ) : ttcmViewMode === "detailed-list" ? (
                    /* VIEW 1: BẢNG DANH SÁCH CHI TIẾT (STT, Họ và tên, Chức vụ, Cơ sở, Cơ sở dự giờ, Số tiết) */
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-100/90 text-[10.5px] font-black uppercase text-slate-700 tracking-wider">
                            <th className="py-3 px-3 text-center w-12">STT</th>
                            <th className="py-3 px-4 min-w-[200px]">Họ và Tên</th>
                            <th className="py-3 px-3 text-center min-w-[100px]">Chức Vụ</th>
                            <th className="py-3 px-3 min-w-[150px]">Cơ Sở (Công tác)</th>
                            <th className="py-3 px-4 min-w-[190px]">Cơ Sở Dự Giờ</th>
                            <th className="py-3 px-3 text-center min-w-[110px]">Số Tiết</th>
                            <th className="py-3 px-3 text-center min-w-[165px]">Chỉ Tiêu Dự Giờ</th>
                            <th className="py-3 px-2 text-center w-20">Chi Tiết</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredTTCMMatrix.map((item, idx) => {
                            const rowCount = item.breakdown.length;
                            return item.breakdown.map((b, bIdx) => (
                              <tr 
                                key={`${item.id}-${b.campusName}-${bIdx}`}
                                className="hover:bg-teal-50/40 transition-colors"
                              >
                                {bIdx === 0 && (
                                  <>
                                    <td 
                                      rowSpan={rowCount} 
                                      className="py-3 px-3 text-center font-bold text-slate-500 border-r border-slate-100 bg-white align-top"
                                    >
                                      {idx + 1}
                                    </td>
                                    <td 
                                      rowSpan={rowCount} 
                                      className="py-3 px-4 border-r border-slate-100 bg-white align-top"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-[#003B3A] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                                          {item.teacherName.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-black text-slate-900 text-xs truncate">{item.teacherName}</p>
                                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold mt-0.5">
                                            <span>{item.teacherCode}</span>
                                            <span>&bull;</span>
                                            <span className="text-teal-700 font-bold">{item.deptName}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td 
                                      rowSpan={rowCount} 
                                      className="py-3 px-3 text-center border-r border-slate-100 bg-white align-top"
                                    >
                                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] uppercase inline-block">
                                        {item.position}
                                      </span>
                                    </td>
                                    <td 
                                      rowSpan={rowCount} 
                                      className="py-3 px-3 border-r border-slate-100 bg-white align-top text-xs font-bold text-slate-700"
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>{item.homeCampus}</span>
                                      </div>
                                    </td>
                                  </>
                                )}

                                {/* Cột Cơ sở dự giờ */}
                                <td className="py-2.5 px-4 text-xs border-r border-slate-100">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`font-semibold ${b.periods > 0 ? "text-slate-800" : "text-slate-400 italic"}`}>
                                      {b.campusName}
                                    </span>
                                    {b.periods > 0 && (
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold shrink-0 ${
                                        b.isCrossCampus 
                                          ? "bg-sky-100 text-sky-800 border border-sky-200" 
                                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      }`}>
                                        {b.isCrossCampus ? "Liên CS ✈️" : "Nội bộ CS"}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Cột Số tiết */}
                                <td className="py-2.5 px-3 text-center border-r border-slate-100">
                                  <div>
                                    <span className={`px-2.5 py-1 rounded-lg font-black text-[11px] inline-block ${
                                      b.periods > 0 
                                        ? (b.isCrossCampus ? "bg-sky-50 text-sky-800 border border-sky-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200") 
                                        : "bg-slate-50 text-slate-400 border border-slate-200"
                                    }`}>
                                      {b.periods} tiết
                                    </span>
                                    {b.surprisePeriods > 0 && (
                                      <div className="text-[9px] text-amber-800 font-extrabold mt-0.5">
                                        ⚡ {b.surprisePeriods} đột xuất
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {bIdx === 0 && (
                                  <>
                                    {/* Cột Chỉ tiêu Dự giờ theo đúng Thiết lập Chỉ tiêu Dự giờ */}
                                    <td 
                                      rowSpan={rowCount} 
                                      className="py-3 px-3 text-center border-r border-slate-100 bg-white align-top"
                                    >
                                      <div className="space-y-1.5">
                                        {/* Target Badge & Quick Settings Trigger */}
                                        <div className="flex items-center justify-center gap-1">
                                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200 font-extrabold text-[10.5px] shadow-2xs">
                                            {item.reqObserved} tiết / {item.observedUnit}
                                          </span>
                                          <button
                                            onClick={() => openTargetConfig(item.ttcm)}
                                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                                            title={`Thiết lập chỉ tiêu dự giờ cho ${item.teacherName}`}
                                          >
                                            <Settings className="w-3.5 h-3.5" />
                                          </button>
                                        </div>

                                        {/* Observer Type badge */}
                                        {item.observerType && (
                                          <span className="text-[9px] font-semibold text-slate-400 block -mt-0.5">
                                            ({item.observerType})
                                          </span>
                                        )}

                                        {/* Met Status Badge */}
                                        <div>
                                          <span className={`px-2 py-0.5 rounded-full font-extrabold text-[9.5px] border inline-flex items-center gap-1 ${
                                            item.isTargetMet 
                                              ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                                              : "bg-amber-100 text-amber-900 border-amber-300"
                                          }`}>
                                            {item.isTargetMet ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                                            <span>{item.isTargetMet ? "Đạt chỉ tiêu" : `Chưa đạt (${item.progressPct}%)`}</span>
                                          </span>
                                        </div>

                                        {/* Total & Target Text */}
                                        <div className="text-[10px] font-bold text-slate-600">
                                          Đã dự: <strong>{item.totalObserved}</strong> / {item.reqObserved} tiết
                                        </div>

                                        {/* Visual Progress Bar */}
                                        <div className="w-20 bg-slate-100 rounded-full h-1.5 mx-auto overflow-hidden">
                                          <div 
                                            className={`h-full rounded-full transition-all duration-300 ${item.isTargetMet ? "bg-emerald-500" : "bg-amber-500"}`} 
                                            style={{ width: `${Math.min(100, item.progressPct)}%` }} 
                                          />
                                        </div>
                                      </div>
                                    </td>

                                    {/* Cột Xem chi tiết */}
                                    <td 
                                      rowSpan={rowCount} 
                                      className="py-3 px-2 text-center bg-white align-top"
                                    >
                                      <button
                                        onClick={() => {
                                          setSelectedTeacherId(item.id);
                                          setActiveDetailTab("lich-su-du");
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-[#003B3A] text-slate-700 hover:text-white font-bold text-[10.5px] transition-all"
                                        title="Xem chi tiết các tiết dự của TTCM này"
                                      >
                                        Xem dự
                                      </button>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ));
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50 font-black text-xs border-t-2 border-slate-300 text-slate-800">
                          <tr>
                            <td colSpan={5} className="py-3 px-4 uppercase text-slate-700 font-black">
                              Tổng cộng toàn bộ ({filteredTTCMMatrix.length} TTCM)
                            </td>
                            <td className="py-3 px-3 text-center font-black text-sky-900">
                              {ttcmMatrixKPIs.totalObserved} tiết
                              {ttcmMatrixKPIs.totalSurprise > 0 && (
                                <span className="block text-[9.5px] text-amber-800 font-bold">
                                  ⚡ {ttcmMatrixKPIs.totalSurprise} ĐX
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-black text-emerald-800">
                              {ttcmMatrixKPIs.targetMetCount}/{ttcmMatrixKPIs.totalTTCM} TTCM đạt ({ttcmMatrixKPIs.metRate}%)
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    /* VIEW 2: BẢNG MA TRẬN 2 CHIỀU (PIVOT GRID - TTCM x Các Cơ Sở) */
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-100/90 text-[10.5px] font-black uppercase text-slate-700 tracking-wider">
                            <th className="py-3 px-3 text-center w-12">STT</th>
                            <th className="py-3 px-4 min-w-[190px]">Họ và Tên TTCM</th>
                            <th className="py-3 px-3 text-center min-w-[90px]">Chức vụ</th>
                            <th className="py-3 px-3 min-w-[140px]">Cơ sở công tác</th>
                            {distinctObservedCampusNames.map(cn => (
                              <th key={cn} className="py-3 px-3 text-center min-w-[110px] bg-teal-50/50 text-teal-900">
                                {cn}
                              </th>
                            ))}
                            <th className="py-3 px-3 text-center min-w-[110px] bg-sky-50/80 text-sky-950 font-black">
                              Tổng Tiết Dự
                            </th>
                            <th className="py-3 px-3 text-center min-w-[130px]">Chỉ Tiêu Dự Giờ</th>
                            <th className="py-3 px-3 text-center min-w-[110px]">Đánh Giá</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredTTCMMatrix.map((item, idx) => {
                            const campusPeriodsMap = new Map(item.breakdown.map(b => [b.campusName, b.periods]));
                            return (
                              <tr key={item.id} className="hover:bg-teal-50/40 transition-colors">
                                <td className="py-3 px-3 text-center font-bold text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-[#003B3A] text-white flex items-center justify-center font-black text-xs shrink-0">
                                      {item.teacherName.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-black text-slate-900 text-xs truncate">{item.teacherName}</p>
                                      <p className="text-[10px] text-slate-400 font-semibold">{item.deptName}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[9.5px] uppercase">
                                    {item.position}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-xs font-bold text-slate-700">
                                  {item.homeCampus}
                                </td>

                                {/* Dynamic Columns for each observed campus */}
                                {distinctObservedCampusNames.map(cn => {
                                  const count = campusPeriodsMap.get(cn) || 0;
                                  const isHome = cn === item.homeCampus;
                                  return (
                                    <td key={cn} className="py-3 px-3 text-center">
                                      {count > 0 ? (
                                        <span className={`px-2 py-1 rounded-lg font-black text-xs inline-block ${
                                          isHome 
                                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs" 
                                            : "bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs"
                                        }`} title={isHome ? "Dự tại cơ sở công tác" : "Dự liên cơ sở"}>
                                          {count} tiết
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 font-bold">-</span>
                                      )}
                                    </td>
                                  );
                                })}

                                {/* Total Observed Column */}
                                <td className="py-3 px-3 text-center bg-sky-50/30">
                                  <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 border border-sky-300 font-black text-xs inline-block">
                                    {item.totalObserved} tiết
                                  </span>
                                </td>

                                {/* Target Column */}
                                <td className="py-3 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="font-extrabold text-slate-800 text-[11px]">
                                      {item.reqObserved} tiết/{item.observedUnit}
                                    </span>
                                    <button
                                      onClick={() => openTargetConfig(item.ttcm)}
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                      title={`Thiết lập chỉ tiêu dự giờ cho ${item.teacherName}`}
                                    >
                                      <Settings className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {item.observerType && (
                                    <span className="text-[9px] text-slate-400 block font-medium">({item.observerType})</span>
                                  )}
                                </td>

                                {/* Status Column */}
                                <td className="py-3 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] border inline-block ${
                                    item.isTargetMet 
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                                      : "bg-amber-100 text-amber-900 border-amber-300"
                                  }`}>
                                    {item.isTargetMet ? "Đạt chuẩn" : `${item.progressPct}%`}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50 font-black text-xs border-t-2 border-slate-300 text-slate-800">
                          <tr>
                            <td colSpan={4} className="py-3 px-4 uppercase text-slate-700 font-black">
                              Tổng cộng từng cơ sở ({filteredTTCMMatrix.length} TTCM)
                            </td>
                            {distinctObservedCampusNames.map(cn => {
                              const campusTotal = filteredTTCMMatrix.reduce((sum, item) => {
                                const campusPeriodsMap = new Map(item.breakdown.map(b => [b.campusName, b.periods]));
                                return sum + (campusPeriodsMap.get(cn) || 0);
                              }, 0);
                              return (
                                <td key={cn} className="py-3 px-3 text-center font-black text-teal-950 bg-teal-50/70">
                                  {campusTotal} tiết
                                </td>
                              );
                            })}
                            <td className="py-3 px-3 text-center font-black text-sky-950 bg-sky-100/70">
                              {ttcmMatrixKPIs.totalObserved} tiết
                            </td>
                            <td colSpan={2} className="py-3 px-3 text-center text-emerald-800 font-black">
                              {ttcmMatrixKPIs.targetMetCount}/{ttcmMatrixKPIs.totalTTCM} Đạt ({ttcmMatrixKPIs.metRate}%)
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 4: Phân tích Năng lực & Điểm yếu cá nhân */}
          {activeDetailTab === "phan-tich" && selectedTeacher && (() => {
            const { competencyData, sortedWeaknesses } = teacherCompetencyResult;
            const size = 260;
            const center = size / 2;
            const radius = 90;
            const totalPoints = isPreschoolTeacher ? 5 : 11;
            const angleStep = (2 * Math.PI) / totalPoints;

            const gridLayers = [25, 50, 75, 100];
            const gridPaths = gridLayers.map(level => {
              const points = [];
              for (let i = 0; i < totalPoints; i++) {
                const angle = i * angleStep;
                const r = radius * (level / 100);
                points.push((center + r * Math.sin(angle)) + "," + (center - r * Math.cos(angle)));
              }
              return points.join(" ");
            });

            const axisLines = [];
            for (let i = 0; i < totalPoints; i++) {
              const angle = i * angleStep;
              axisLines.push({
                x1: center,
                y1: center,
                x2: center + radius * Math.sin(angle),
                y2: center - radius * Math.cos(angle),
                label: isPreschoolTeacher ? "T" + (i + 1) : "Y" + (i + 1),
                lx: center + (radius + 18) * Math.sin(angle),
                ly: center - (radius + 18) * Math.cos(angle)
              });
            }

            const valuePoints = competencyData.map((d, i) => {
              const angle = i * angleStep;
              const r = radius * (d.pct / 100);
              return (center + r * Math.sin(angle)) + "," + (center - r * Math.cos(angle));
            });
            const valuePath = valuePoints.join(" ");

            return (
              <div className="space-y-4">
                {competencyData.length === 0 ? (
                  <div className="bg-white p-8 rounded-3xl border border-slate-200/90 text-center py-12">
                    <BarChart3 className="w-10 h-10 stroke-1 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-black text-slate-600 uppercase">Chưa có phiếu dự giờ nào để phân tích năng lực</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                      <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
                        <span className="text-[11px] font-black text-indigo-600 uppercase tracking-wider mb-2">
                          Biểu đồ Năng lực
                        </span>
                        <svg width="240" height="240" viewBox="0 0 260 260" className="overflow-visible">
                          {gridLayers.map((level, idx) => (
                            <polygon key={level} points={gridPaths[idx]} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray={level === 100 ? "none" : "3,3"} />
                          ))}
                          {gridLayers.map(level => (
                            <text key={level} x={center} y={center - radius * (level / 100) + 4} textAnchor="middle" className="text-[8px] fill-slate-400 font-bold">
                              {level}%
                            </text>
                          ))}
                          {axisLines.map((axis, idx) => (
                            <g key={idx}>
                              <line x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="#e2e8f0" strokeWidth="1" />
                              <text x={axis.lx} y={axis.ly + 3} textAnchor="middle" className="text-[10px] font-black fill-[#003B3A]">
                                {axis.label}
                              </text>
                            </g>
                          ))}
                          {valuePoints.length > 0 && (
                            <polygon points={valuePath} fill="rgba(72, 191, 227, 0.25)" stroke="#003B3A" strokeWidth="2" />
                          )}
                        </svg>
                      </div>

                      <div className="md:col-span-7 space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                        <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider pb-1.5 border-b border-slate-100">
                          Chi tiết các tiêu chí
                        </h4>
                        {competencyData.map(item => (
                          <div key={item.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800 text-[11px] truncate max-w-[220px]">
                                {item.id}. {item.label.split(":")[1] || item.label}
                              </span>
                              <span className="font-black text-slate-600 text-[10px]">
                                {item.avg.toFixed(2)}/{item.max}đ ({item.pct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-[#48BFE3]" style={{ width: `${item.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* TAB 5: Năng lực Tổ Chuyên Môn */}
          {activeDetailTab === "to-cm" && (() => {
            const { dep, dmn, dc, dsw } = deptCompetencyResult;
            return (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50/50 border border-violet-200 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-violet-600 rounded-xl border border-violet-200 shadow-xs">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-800">{selectedDeptName}</h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Tổng hợp toàn Tổ • {dep.length} phiếu đánh giá • {deptTeachers.length} giáo viên
                      </p>
                    </div>
                  </div>
                </div>

                {dep.length === 0 ? (
                  <div className="bg-white p-8 rounded-3xl border border-slate-200/90 text-center py-12">
                    <PieChart className="w-10 h-10 stroke-1 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-black text-slate-700 uppercase">Chưa có dữ liệu đánh giá cho Tổ CM</p>
                  </div>
                ) : (
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <Award className="w-4 h-4 text-violet-600" />
                      <span>Hiệu suất Năng lực Giảng dạy Toàn Tổ</span>
                    </h4>
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {dc.map(item => (
                        <div key={item.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800 text-[11px] truncate max-w-[280px]">
                              {item.id}. {item.lb.split(":")[1] || item.lb}
                            </span>
                            <span className="font-black text-slate-600 text-[10px]">
                              {item.av.toFixed(2)}/{item.mx}đ ({item.pt}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${item.pt}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>

      {/* Email Report to TTCM Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-5 sm:p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-gradient-to-br from-[#003B3A] to-[#48BFE3] text-white rounded-xl shadow-xs">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Gửi Email Báo cáo & Đối chiếu Chỉ tiêu TTCM</h3>
                  <p className="text-[11px] text-slate-500">Tổ: <strong className="text-[#003B3A]">{selectedDeptName}</strong></p>
                </div>
              </div>
              <button 
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>1. Email TTCM *</span>
                    {deptTTCM && (
                      <span className="text-[9px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                        {deptTTCM.teacherName}
                      </span>
                    )}
                  </label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                    placeholder="Nhập email TTCM (VD: ttcm@skylineschool.edu.vn)..."
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#48BFE3] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    2. Đồng kính gửi (CC) (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={emailCc}
                    onChange={e => setEmailCc(e.target.value)}
                    placeholder="VD: bgh@skylineschool.edu.vn..."
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#48BFE3] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    3. Kỳ báo cáo
                  </label>
                  <select
                    value={emailMonth}
                    onChange={e => setEmailMonth(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#48BFE3] outline-none"
                  >
                    <option value="all">📅 Toàn bộ năm học</option>
                    {availableMonths.map(m => {
                      const [yyyy, mm] = m.split("-");
                      return (
                        <option key={m} value={m}>
                          Tháng {mm}/{yyyy}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    4. Ghi chú thêm (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={emailNotes}
                    onChange={e => setEmailNotes(e.target.value)}
                    placeholder="VD: Kính đề nghị Quý Thầy/Cô rà soát..."
                    className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#48BFE3] outline-none"
                  />
                </div>
              </div>

              {/* Live Preview Summary Cards */}
              <div className="p-3 bg-gradient-to-r from-teal-50 to-emerald-50/50 rounded-xl border border-teal-200 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Tổng Giáo Viên</span>
                  <strong className="text-sm font-black text-[#003B3A]">{deptTeachers.length} GV</strong>
                </div>
                <div className="border-x border-teal-200/80 px-2">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Tiết Dạy Hoàn Thành</span>
                  <strong className="text-sm font-black text-emerald-700">{emailPreviewSummary.totalTaught} tiết</strong>
                  {emailPreviewSummary.totalSurpriseTaught > 0 && (
                    <span className="text-[9px] text-amber-800 font-bold block mt-0.5">
                      (⚡ {emailPreviewSummary.totalSurpriseTaught} đột xuất)
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Tiết Dự Hoàn Thành</span>
                  <strong className="text-sm font-black text-sky-700">{emailPreviewSummary.totalObserved} lượt</strong>
                  {emailPreviewSummary.totalSurpriseObserved > 0 && (
                    <span className="text-[9px] text-amber-800 font-bold block mt-0.5">
                      (⚡ {emailPreviewSummary.totalSurpriseObserved} đột xuất)
                    </span>
                  )}
                </div>
              </div>

              {/* Table Preview: Danh sách Giáo viên & Đối chiếu Chỉ tiêu */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#003B3A]" />
                    <span>Nội dung bảng sẽ gửi trong Email ({emailPreviewTeacherMatrix.length} GV)</span>
                  </label>
                  <span className="text-[9.5px] text-[#003B3A] font-extrabold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    Kỳ: {emailMonth === "all" ? "Toàn bộ năm học" : `Tháng ${emailMonth.split("-")[1]}/${emailMonth.split("-")[0]}`}
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2 text-center w-8">STT</th>
                        <th className="py-2 px-3 min-w-[160px]">Giáo viên Bộ môn</th>
                        <th className="py-2 px-2 text-center min-w-[130px]">Tiết Dạy</th>
                        <th className="py-2 px-2 text-center min-w-[130px]">Tiết Dự</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-[11px]">
                      {emailPreviewTeacherMatrix.map((t, idx) => (
                        <tr key={t.id} className="hover:bg-slate-50/80">
                          <td className="py-2 px-2 text-center font-bold text-slate-400 text-[10px]">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-extrabold text-slate-800">{t.teacherName}</div>
                            <div className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                              <span>{t.teacherCode}</span>
                              {t.position && (
                                <span className="px-1 rounded bg-amber-100 text-amber-800 font-black text-[8px]">
                                  {t.position}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-block ${
                                t.reqTaught > 0
                                  ? (t.isTaughtMet ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")
                                  : (t.taughtCount > 0 ? "bg-teal-50 text-teal-800 border-teal-200" : "bg-slate-50 text-slate-500 border-slate-200")
                              }`}>
                                {t.taughtCount} {t.reqTaught > 0 ? `/ ${t.reqTaught} (${t.taughtUnit})` : "tiết"}
                              </span>
                              {t.taughtSurpriseCount > 0 && (
                                <div className="text-[8.5px] text-amber-800 font-bold mt-0.5">
                                  ⚡ {t.taughtSurpriseCount} ĐX
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-block ${
                                t.reqObserved > 0
                                  ? (t.isObservedMet ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200")
                                  : (t.observedCount > 0 ? "bg-cyan-50 text-cyan-800 border-cyan-200" : "bg-slate-50 text-slate-500 border-slate-200")
                              }`}>
                                {t.observedCount} {t.reqObserved > 0 ? `/ ${t.reqObserved} (${t.observedUnit})` : "lượt"}
                              </span>
                              {t.observedSurpriseCount > 0 && (
                                <div className="text-[8.5px] text-amber-800 font-bold mt-0.5">
                                  ⚡ {t.observedSurpriseCount} ĐX
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chú thích cách tính Tiết dạy & Tiết dự */}
              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 space-y-1">
                <div className="font-black flex items-center gap-1.5 text-emerald-900 uppercase text-[10.5px]">
                  <span>📌</span>
                  <span>Quy định tính Tiết dạy và Tiết dự giờ trong Báo cáo:</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-[10.5px] text-emerald-800">
                  <li><strong>Tiết dạy:</strong> Chỉ được tính khi tiết dạy đã diễn ra, có giáo viên tham gia dự giờ <strong>VÀ người dự ĐÃ NỘP PHIẾU ĐÁNH GIÁ</strong>. (Tiết đôi tính 2 tiết).</li>
                  <li><strong>Tiết dự:</strong> Chỉ được tính khi Giáo viên đã được duyệt tham gia dự giờ <strong>VÀ ĐÃ HOÀN TẤT GỬI PHIẾU ĐÁNH GIÁ</strong>. (Tiết đôi tính 2 lượt).</li>
                  <li><strong>Tiết đột xuất (⚡):</strong> Báo cáo tự động tổng hợp số tiết dự giờ đột xuất và tiết dạy của GV được dự đột xuất.</li>
                  <li>Email sẽ gửi toàn bộ Bảng đối chiếu chỉ tiêu chi tiết của <strong>{deptTeachers.length} Giáo viên</strong> này đến TTCM.</li>
                </ul>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                disabled={sendingEmail}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSendEmailReport}
                disabled={sendingEmail}
                className="px-5 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#002d2c] text-white font-black text-xs shadow-md flex items-center gap-1.5 disabled:opacity-50 transition-all"
              >
                {sendingEmail ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang gửi email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-[#48BFE3]" />
                    <span>Xác nhận Gửi Email cho TTCM</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gửi Email Báo Cáo Tổng Hợp Tất Cả Các Tổ Chuyên Môn */}
      {isAllDeptsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-5 sm:p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-gradient-to-br from-[#003B3A] to-[#48BFE3] text-white rounded-xl shadow-xs">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Gửi Email Báo Cáo Ban Điều Hành Chuyên Môn (Ban ĐHCM)</h3>
                  <p className="text-[11px] text-slate-500">Khối: <strong className="text-[#003B3A]">{activeBlockTab === "mamnon" ? "Bậc Mầm non" : (activeBlockTab === "dieuhanh" ? "Khối Điều hành" : "Khối Phổ thông K-12")}</strong> &bull; <strong className="text-teal-700">{allDepartmentsSummary.length} Tổ chuyên môn</strong></p>
                </div>
              </div>
              <button 
                onClick={() => setIsAllDeptsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    1. Email Ban ĐHCM / Người Nhận Chính (To) *
                  </label>
                  <input
                    type="email"
                    value={allDeptsTo}
                    onChange={e => setAllDeptsTo(e.target.value)}
                    placeholder="VD: bgh@skylineschool.edu.vn hoặc bankhaothi@..."
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#48BFE3] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    2. Đồng kính gửi (CC) (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={allDeptsCc}
                    onChange={e => setAllDeptsCc(e.target.value)}
                    placeholder="VD: bgh@skylineschool.edu.vn, gdcs@... (Tùy chọn)"
                    className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#48BFE3] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    3. Kỳ báo cáo
                  </label>
                  <select
                    value={allDeptsMonth}
                    onChange={e => setAllDeptsMonth(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#48BFE3] outline-none"
                  >
                    <option value="all">📅 Toàn bộ năm học</option>
                    {availableMonths.map(m => {
                      const [yyyy, mm] = m.split("-");
                      return (
                        <option key={m} value={m}>
                          Tháng {mm}/{yyyy}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    4. Ghi chú & Lời nhắn bổ sung (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={allDeptsNotes}
                    onChange={e => setAllDeptsNotes(e.target.value)}
                    placeholder="VD: Kính gửi Ban Giám hiệu và Quý Thầy/Cô TTCM báo cáo..."
                    className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#48BFE3] outline-none"
                  />
                </div>
              </div>

              {/* Table Preview: Bảng Thống kê Tiến độ các Tổ Chuyên môn */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#003B3A]" />
                    <span>Nội dung bảng Thống kê Các Tổ CM sẽ gửi ({allDeptsEmailSummary.length} Tổ)</span>
                  </label>
                  <span className="text-[9.5px] text-[#003B3A] font-extrabold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    Kỳ: {allDeptsMonth === "all" ? "Toàn bộ năm học" : `Tháng ${allDeptsMonth.split("-")[1]}/${allDeptsMonth.split("-")[0]}`}
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2 text-center w-8">STT</th>
                        <th className="py-2 px-3 min-w-[150px]">Tổ Chuyên Môn</th>
                        <th className="py-2 px-2 text-center w-20">Giáo Viên</th>
                        <th className="py-2 px-2 text-center w-24">Tổng Dạy</th>
                        <th className="py-2 px-2 text-center w-24 text-amber-900 bg-amber-50/50">Dạy ĐX ⚡</th>
                        <th className="py-2 px-2 text-center w-24">Tổng Dự</th>
                        <th className="py-2 px-2 text-center w-24 text-amber-900 bg-amber-50/50">Dự ĐX ⚡</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-[11px]">
                      {allDeptsEmailSummary.map((d, idx) => (
                        <tr key={d.id} className="hover:bg-slate-50/80">
                          <td className="py-2 px-2 text-center font-bold text-slate-400 text-[10px]">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-extrabold text-slate-800">{d.name}</div>
                            <div className="text-[9px] text-slate-400 font-semibold">
                              TTCM: {d.ttcm ? d.ttcm.teacherName : "Chưa gán"}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-slate-700">
                            {d.teacherCount} GV
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                              {d.totalTaught} tiết
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-block ${
                              d.taughtSurprise > 0 ? "bg-amber-100/70 text-amber-900 border-amber-300" : "bg-slate-50 text-slate-400 border-slate-200"
                            }`}>
                              {d.taughtSurprise > 0 ? `⚡ ${d.taughtSurprise}` : "0"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-50 text-sky-800 border border-sky-200 inline-block">
                              {d.totalObserved} lượt
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-block ${
                              d.observedSurprise > 0 ? "bg-amber-100/70 text-amber-900 border-amber-300" : "bg-slate-50 text-slate-400 border-slate-200"
                            }`}>
                              {d.observedSurprise > 0 ? `⚡ ${d.observedSurprise}` : "0"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chú thích cách tính Tiết dạy & Tiết dự */}
              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 space-y-1">
                <div className="font-black flex items-center gap-1.5 text-emerald-900 uppercase text-[10.5px]">
                  <span>📌</span>
                  <span>Quy định tính Tiết dạy và Tiết dự giờ trong Báo cáo:</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-[10.5px] text-emerald-800">
                  <li><strong>Tiết dạy:</strong> Chỉ được tính khi tiết dạy đã diễn ra, có giáo viên tham gia dự giờ <strong>VÀ người dự ĐÃ NỘP PHIẾU ĐÁNH GIÁ</strong>. (Tiết đôi tính 2 tiết).</li>
                  <li><strong>Tiết dự:</strong> Chỉ được tính khi Giáo viên đã được duyệt tham gia dự giờ <strong>VÀ ĐÃ HOÀN TẤT GỬI PHIẾU ĐÁNH GIÁ</strong>. (Tiết đôi tính 2 lượt).</li>
                  <li><strong>Tiết đột xuất (⚡):</strong> Báo cáo tự động phân loại và thống kê riêng biệt số tiết dự giờ đột xuất và tiết dạy được dự đột xuất.</li>
                  <li>Báo cáo tổng hợp này được gửi riêng cho <strong>Ban Điều hành Chuyên môn (Ban ĐHCM)</strong>, không tự động gửi đến 19 Tổ chuyên môn.</li>
                </ul>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsAllDeptsModalOpen(false)}
                disabled={sendingAllDeptsEmail}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSendAllDeptsEmailReport}
                disabled={sendingAllDeptsEmail}
                className="px-5 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#002d2c] text-white font-black text-xs shadow-md flex items-center gap-1.5 disabled:opacity-50 transition-all"
              >
                {sendingAllDeptsEmail ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang gửi báo cáo cho Ban ĐHCM...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-[#48BFE3]" />
                    <span>Xác nhận Gửi Báo Cáo cho Ban ĐHCM</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target Configuration Modal */}
      {isTargetModalOpen && targetTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#003B3A] text-white rounded-xl">
                  <Settings className="w-4 h-4 text-[#48BFE3]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Thiết lập Chỉ tiêu Dự giờ</h3>
                  <p className="text-[11px] text-slate-500">{targetTeacher.teacherName} ({targetTeacher.teacherCode})</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTargetModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="text-[10px] font-black text-indigo-900 uppercase tracking-wider block">
                  1. Chỉ tiêu Người DỰ giờ
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {["Ban ĐHCM", "TTCM", "Nhóm trưởng CM CS", "Giáo viên mới", "Giáo viên cũ"].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleObserverTypePreset(preset)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                        observerType === preset 
                          ? "bg-indigo-600 text-white border-indigo-600" 
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={requiredObserved}
                    onChange={e => setRequiredObserved(parseInt(e.target.value) || 0)}
                    placeholder="Số tiết dự"
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                  <select
                    value={observedUnit}
                    onChange={e => setObservedUnit(e.target.value)}
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="tháng">tiết / tháng</option>
                    <option value="học kỳ">tiết / học kỳ</option>
                    <option value="năm">tiết / năm</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="text-[10px] font-black text-emerald-900 uppercase tracking-wider block">
                  2. Chỉ tiêu Người DẠY
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {["TTCM", "Nhóm trưởng CM CS", "Giáo viên mới", "Giáo viên cũ"].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleObserveeTypePreset(preset)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                        observeeType === preset 
                          ? "bg-emerald-600 text-white border-emerald-600" 
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={requiredTaught}
                    onChange={e => setRequiredTaught(parseInt(e.target.value) || 0)}
                    placeholder="Số tiết dạy"
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                  <select
                    value={taughtUnit}
                    onChange={e => setTaughtUnit(e.target.value)}
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="tháng">tiết / tháng</option>
                    <option value="học kỳ">tiết / học kỳ</option>
                    <option value="năm">tiết / năm</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsTargetModalOpen(false)}
                disabled={savingTargets}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveTargets}
                disabled={savingTargets}
                className="px-4 py-1.5 rounded-lg bg-[#003B3A] text-white text-xs font-black hover:bg-[#002d2c] flex items-center gap-1"
              >
                {savingTargets ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
