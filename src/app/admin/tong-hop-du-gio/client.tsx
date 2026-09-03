"use client"
import { useState, useMemo, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { updateTeacherObservationTargets } from "@/app/teacher/du-gio/actions"
import toast, { Toaster } from "react-hot-toast"
import { 
  ClipboardList, CheckCircle, CheckCircle2, PieChart, Calendar, Layers,
  ChevronDown, ChevronUp, AlertCircle, Plus, Search, X, Check,
  BookOpen, User, Award, ThumbsUp, MessageSquare, GraduationCap,
  Eye, Settings, Sparkles, Filter, TrendingUp, BarChart3, School,
  Baby, Building2, Star, CheckCheck, Clock, Mail, Send, FileSpreadsheet,
  UserCheck, AlertTriangle, ArrowRight, BookMarked
} from "lucide-react"

interface TeacherInfo { 
  id: string; 
  teacherName: string; 
  teacherCode: string; 
  email: string | null; 
  departmentId: string | null; 
  campusId: string; 
  position?: string;
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

  const blockParam = searchParams.get("block") || ""
  const [activeBlockTab, setActiveBlockTab] = useState(() => {
    if (blockParam === "mammon") return "Mầm non";
    if (blockParam === "dieuhan") return "Điều hành";
    if (blockParam === "k12") return "Phổ thông K-12";
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
    if (blockParam === "mammon") { setActiveBlockTab("Mầm non"); return; }
    if (blockParam === "dieuhan") { setActiveBlockTab("Điều hành"); return; }
    if (blockParam === "k12") { setActiveBlockTab("Phổ thông K-12"); return; }
  }, [blockParam]);

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
  const [activeDetailTab, setActiveDetailTab] = useState<"lich-su" | "lich-su-du" | "tien-do-to" | "phan-tich" | "to-cm">("lich-su")
  
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

  // Extract all unique months from initialSlots
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const activeYearObj = academicYears.find((y: any) => y.id === selectedYearId) || academicYears.find((y: any) => y.status === "ACTIVE");
    initialSlots.forEach(s => {
      if (s.date) {
        const d = new Date(s.date);
        if (activeYearObj?.startDate && activeYearObj?.endDate) {
          const start = new Date(activeYearObj.startDate);
          const end = new Date(activeYearObj.endDate);
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
      taughtMamNon: number;
      taughtPhoThong: number;
      observedMamNon: number;
      observedPhoThong: number;
    }> = {};
    
    teachersList.forEach((t: any) => {
      statsMap[t.id] = { 
        taughtCount: 0, 
        observedCount: 0,
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

      if (statsMap[slot.teacherId]) {
        const hasEvaluations = slot.registrations?.some((r: any) => r.evaluation !== null);
        if (hasEvaluations) {
          const increment = slot.isDoublePeriod ? 2 : 1;
          statsMap[slot.teacherId].taughtCount += increment;
          if (isMamNon) statsMap[slot.teacherId].taughtMamNon += increment;
          else statsMap[slot.teacherId].taughtPhoThong += increment;
        }
      }

      slot.registrations?.forEach((reg: any) => {
        if (reg.isApproved && reg.evaluation && statsMap[reg.teacherId]) {
          const increment = slot.isDoublePeriod ? 2 : 1;
          statsMap[reg.teacherId].observedCount += increment;
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
      taughtMamNon: number;
      taughtPhoThong: number;
      observedMamNon: number;
      observedPhoThong: number;
    }> = {};
    deptTeachers.forEach((t: any) => {
      statsMap[t.id] = allTeacherStats[t.id] || { 
        taughtCount: 0, 
        observedCount: 0,
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
    let totalEvaluations = 0;
    let passingEvaluations = 0;

    const teacherIds = new Set(deptTeachers.map(t => t.id));

    deptTeachers.forEach((t: any) => {
      const stats = teacherStats[t.id] || { taughtMamNon: 0, taughtPhoThong: 0, observedMamNon: 0, observedPhoThong: 0 };
      taughtMamNon += stats.taughtMamNon || 0;
      taughtPhoThong += stats.taughtPhoThong || 0;
      observedMamNon += stats.observedMamNon || 0;
      observedPhoThong += stats.observedPhoThong || 0;
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
        if (r.evaluation) {
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
      if (!r.evaluation) return false;
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

  // Selected teacher's observed slots (where this teacher is the observer)
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
        if (reg.teacherId === selectedTeacherId && reg.isApproved) {
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
      return matchQuery && matchLevel && matchGrade;
    });
  }, [selTeacherObservedSlots, searchSlotQuery, filterLevel, filterGrade]);

  const deptTTCM = useMemo(() => {
    return deptTeachers.find((t: any) => 
      t.position === "TTCM" || 
      (t.departmentAssignments || []).some((da: any) => da.departmentId === selectedDeptId && da.position === "TTCM")
    ) || null;
  }, [deptTeachers, selectedDeptId]);

  const deptTeacherMatrix = useMemo(() => {
    return deptTeachers.map((t: any) => {
      const stats = teacherStats[t.id] || { taughtCount: 0, observedCount: 0 };
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

  // Compute live matrix preview for email based on selected emailMonth
  const emailPreviewTeacherMatrix = useMemo(() => {
    const statsMap: Record<string, { taughtCount: number; observedCount: number }> = {};
    deptTeachers.forEach((t: any) => {
      statsMap[t.id] = { taughtCount: 0, observedCount: 0 };
    });

    initialSlots.forEach((slot: any) => {
      if (emailMonth !== "all") {
        if (!slot.date) return;
        const d = new Date(slot.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        if (`${yyyy}-${mm}` !== emailMonth) return;
      }

      if (statsMap[slot.teacherId]) {
        const hasEvaluations = slot.registrations?.some((r: any) => r.evaluation !== null);
        if (hasEvaluations) {
          const increment = slot.isDoublePeriod ? 2 : 1;
          statsMap[slot.teacherId].taughtCount += increment;
        }
      }

      slot.registrations?.forEach((reg: any) => {
        if (reg.isApproved && reg.evaluation && statsMap[reg.teacherId]) {
          const increment = slot.isDoublePeriod ? 2 : 1;
          statsMap[reg.teacherId].observedCount += increment;
        }
      });
    });

    return deptTeachers.map((t: any) => {
      const stats = statsMap[t.id] || { taughtCount: 0, observedCount: 0 };
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
    emailPreviewTeacherMatrix.forEach(t => {
      totalTaught += t.taughtCount;
      totalObserved += t.observedCount;
    });
    return { totalTaught, totalObserved };
  }, [emailPreviewTeacherMatrix]);

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
      return matchQuery && matchLevel && matchGrade;
    });
  }, [selTeacherSlots, searchSlotQuery, filterLevel, filterGrade]);

  const teacherEvaluations = useMemo(() => {
    const evals: any[] = [];
    selTeacherSlots.forEach(slot => {
      slot.registrations?.forEach((reg: any) => {
        if (reg.evaluation) {
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
        if (r.evaluation) dep.push({ ev: r.evaluation, lv: sl.level }); 
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
  const currentStats = selectedTeacher ? (teacherStats[selectedTeacher.id] || { taughtCount: 0, observedCount: 0 }) : { taughtCount: 0, observedCount: 0 };

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
            </div>
            <GraduationCap className="w-5 h-5 text-emerald-300 opacity-80" />
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-teal-200">Tổng tiết dự</div>
              <div className="text-xl font-black text-white mt-0.5">{departmentSummary.totalObserved} <span className="text-[10px] font-normal text-teal-200">lượt</span></div>
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
                          <span className={`px-1.5 py-0.5 rounded-md border ${
                            taughtPassed ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            Dạy: {stats.taughtCount}{teacher.requiredTaught ? `/${teacher.requiredTaught}` : ""}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded-md border ${
                            observedPassed ? "bg-violet-50 text-violet-800 border-violet-200" : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            Dự: {stats.observedCount}{teacher.requiredObserved ? `/${teacher.requiredObserved}` : ""}
                          </span>
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
                <div className="sm:col-span-6 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm chủ đề, đề tài, lớp..."
                    value={searchSlotQuery}
                    onChange={e => setSearchSlotQuery(e.target.value)}
                    className="w-full text-xs font-bold pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-[#48BFE3] outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
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
                <div className="sm:col-span-3">
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
                    const evals = slot.registrations?.filter((r: any) => r.evaluation !== null) || [];
                    const isMamNonBlock = slot.level === "Mầm non" || 
                      (slot.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes("mam non");

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
                <div className="sm:col-span-6 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo GV được dự, chủ đề, lớp..."
                    value={searchSlotQuery}
                    onChange={e => setSearchSlotQuery(e.target.value)}
                    className="w-full text-xs font-bold pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-[#48BFE3] outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
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
                <div className="sm:col-span-3">
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
            <div className="space-y-4">
              
              {/* Department Action Bar */}
              <div className="bg-gradient-to-r from-teal-900 to-[#003B3A] border border-teal-700/50 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md shadow-[#003B3A]/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.2 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30 text-[9px] font-extrabold uppercase">
                      Bảng tổng hợp tiến độ chỉ tiêu
                    </span>
                    {deptTTCM && (
                      <span className="text-[11px] text-amber-300 font-bold">
                        TTCM: {deptTTCM.teacherName}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight mt-0.5">{selectedDeptName}</h3>
                  <p className="text-[11px] text-teal-100/70">
                    Theo dõi số tiết dạy & dự của {deptTeachers.length} GV • Kỳ: {selectedMonth === "all" ? "Tất cả các tháng" : `Tháng ${selectedMonth.split("-")[1]}/${selectedMonth.split("-")[0]}`}
                  </p>
                </div>

                <button
                  onClick={openEmailModal}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 text-slate-950 font-black text-xs shadow-xs flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-950" />
                  <span>Gửi Email TTCM</span>
                </button>
              </div>

              {/* Matrix Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#003B3A]" />
                    <span>Danh sách Giáo viên & Đối chiếu Chỉ tiêu</span>
                  </h4>

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
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-block ${
                                t.isTaughtMet 
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}>
                                {t.taughtCount} {t.reqTaught > 0 ? `/ ${t.reqTaught}` : "tiết"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-block ${
                                t.isObservedMet 
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}>
                                {t.observedCount} {t.reqObserved > 0 ? `/ ${t.reqObserved}` : "lượt"}
                              </span>
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
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Tiết Dự Hoàn Thành</span>
                  <strong className="text-sm font-black text-sky-700">{emailPreviewSummary.totalObserved} lượt</strong>
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
                        <th className="py-2 px-2 text-center min-w-[110px]">Tiết Dạy</th>
                        <th className="py-2 px-2 text-center min-w-[110px]">Tiết Dự</th>
                        <th className="py-2 px-2 text-center w-28">Trạng thái</th>
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
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-block ${
                              t.isTaughtMet ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}>
                              {t.taughtCount} {t.reqTaught > 0 ? `/ ${t.reqTaught} (${t.taughtUnit})` : "tiết"} {t.isTaughtMet ? "✓" : "✗"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-block ${
                              t.isObservedMet ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}>
                              {t.observedCount} {t.reqObserved > 0 ? `/ ${t.reqObserved} (${t.observedUnit})` : "lượt"} {t.isObservedMet ? "✓" : "⚠️"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black text-white ${
                              t.isAllMet ? "bg-emerald-600" : "bg-rose-600"
                            }`}>
                              {t.isAllMet ? "ĐẠT CHỈ TIÊU" : "CHƯA ĐẠT"}
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
