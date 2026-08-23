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
  Baby, Building2, Star, CheckCheck, Clock
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

  // Available block tabs
  const availableBlocks = useMemo(() => {
    if (isTTCM && currentTeacher?.departmentId) {
      const d = departments.find(dept => dept.id === currentTeacher.departmentId);
      if (d?.blockCM === "Mầm Non") return ["Mầm non"];
      if (d?.blockCM === "Điều hành") return ["Điều hành"];
      return ["Phổ thông K-12"];
    }
    return ["Phổ thông K-12", "Mầm non", "Điều hành"];
  }, [isTTCM, currentTeacher, departments]);

  // Departments for active block
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
  const [activeDetailTab, setActiveDetailTab] = useState<"lich-su" | "phan-tich" | "to-cm">("lich-su")
  
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
    initialSlots.forEach(s => {
      if (s.date) {
        const d = new Date(s.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        months.add(`${yyyy}-${mm}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [initialSlots]);

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
        (slot.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");

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

  // Set default selected teacher when list loads or changes
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

  // Calculate teacher average score
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
    <div className="space-y-6 pb-12">
      <Toaster position="top-right" />

      {/* Header & Metric Banner */}
      <div className="bg-gradient-to-br from-[#003B3A] via-[#004d4b] to-[#015856] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#003B3A]/15 relative overflow-hidden">
        {/* Background decorative glow */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#48BFE3]/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-60 h-60 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-[#48BFE3] shadow-inner">
                <PieChart className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  Tổng hợp kết quả dự giờ
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#48BFE3]/20 text-[#48BFE3] border border-[#48BFE3]/40 font-extrabold tracking-wide">
                    Live Analytics
                  </span>
                </h1>
                <p className="text-teal-100/80 text-xs sm:text-sm font-medium mt-0.5">
                  {isTTCM 
                    ? `Báo cáo chuyên môn Tổ ${selectedDeptName}` 
                    : "Hệ thống quản trị & báo cáo dự giờ giảng dạy toàn trường"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {academicYears && academicYears.length > 0 && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-2 rounded-2xl text-xs">
                <Calendar className="w-4 h-4 text-[#48BFE3]" />
                <span className="text-white/70 font-semibold">Năm học:</span>
                <select
                  value={filterAcademicYearId}
                  onChange={(e) => handleAcademicYearChange(e.target.value)}
                  className="bg-transparent font-bold text-white outline-none cursor-pointer pr-2"
                >
                  {academicYears.map((yr: any) => (
                    <option key={yr.id} value={yr.id} className="text-slate-800 font-bold">
                      {yr.name} {yr.status === "ACTIVE" ? "(Hiện tại)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 4 Hero KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 mt-6 relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between text-teal-200">
              <span className="text-[11px] font-bold uppercase tracking-wider">Tổng tiết dạy</span>
              <GraduationCap className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{departmentSummary.totalTaught}</span>
              <span className="text-[10px] text-teal-200/80 font-semibold">tiết hoàn thành</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-300 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>K12: {departmentSummary.taughtPhoThong} | MN: {departmentSummary.taughtMamNon}</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between text-teal-200">
              <span className="text-[11px] font-bold uppercase tracking-wider">Tổng tiết dự</span>
              <Eye className="w-4 h-4 text-sky-300" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{departmentSummary.totalObserved}</span>
              <span className="text-[10px] text-teal-200/80 font-semibold">lượt dự giờ</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-sky-300 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>K12: {departmentSummary.observedPhoThong} | MN: {departmentSummary.observedMamNon}</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between text-teal-200">
              <span className="text-[11px] font-bold uppercase tracking-wider">Tỷ lệ Đạt chuẩn</span>
              <CheckCheck className="w-4 h-4 text-amber-300" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{departmentSummary.passRate}%</span>
              <span className="text-[10px] text-teal-200/80 font-semibold">phiếu đánh giá</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-amber-300 font-bold">
              <span>{departmentSummary.passingEvaluations}/{departmentSummary.totalEvaluations} phiếu Đạt</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between text-teal-200">
              <span className="text-[11px] font-bold uppercase tracking-wider">Giáo viên Tổ</span>
              <User className="w-4 h-4 text-violet-300" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{deptTeachers.length}</span>
              <span className="text-[10px] text-teal-200/80 font-semibold">nhân sự</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-violet-300 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span>{departmentSummary.activeTeachersCount} GV đã tham gia dạy/dự</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Filter & Teacher Directory */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Block Selection Pills */}
          <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1">
            {availableBlocks.map(tab => {
              const isActive = activeBlockTab === tab;
              const count = departments.filter(dept => {
                if (tab === "Phổ thông K-12" && dept.blockCM === "Phổ thông") return true;
                if (tab === "Mầm non" && dept.blockCM === "Mầm Non") return true;
                if (tab === "Điều hành" && dept.blockCM === "Điều hành") return true;
                return false;
              }).length;

              let icon = <School className="w-3.5 h-3.5" />;
              if (tab === "Mầm non") icon = <Baby className="w-3.5 h-3.5" />;
              if (tab === "Điều hành") icon = <Building2 className="w-3.5 h-3.5" />;

              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? tab === "Mầm non"
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 scale-[1.02]"
                        : tab === "Điều hành"
                        ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20 scale-[1.02]"
                        : "bg-gradient-to-r from-[#003B3A] to-[#015856] text-white shadow-md shadow-[#003B3A]/20 scale-[1.02]"
                      : "bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80"
                  }`}
                >
                  {icon}
                  <span>{tab}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? "bg-white/25 text-white" : "bg-slate-200 text-slate-600"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filter Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            
            {/* Department Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#48BFE3]" /> Tổ chuyên môn
              </label>
              {isTTCM ? (
                <div className="w-full text-xs font-bold p-3 bg-teal-50/70 border border-teal-200 text-teal-900 rounded-2xl flex items-center justify-between">
                  <span>{selectedDeptName}</span>
                  <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full uppercase">
                    TTCM
                  </span>
                </div>
              ) : (
                <select 
                  value={selectedDeptId} 
                  onChange={e => { setSelectedDeptId(e.target.value); setSelectedTeacherId(null); setSearchTeacherQuery(""); }}
                  className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 hover:bg-slate-100/80 focus:bg-white focus:border-[#48BFE3] focus:ring-4 focus:ring-[#48BFE3]/15 transition-all outline-none"
                >
                  {activeDepartments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Month Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#48BFE3]" /> Lọc theo tháng
              </label>
              <select 
                value={selectedMonth} 
                onChange={e => { setSelectedMonth(e.target.value); }}
                className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 hover:bg-slate-100/80 focus:bg-white focus:border-[#48BFE3] focus:ring-4 focus:ring-[#48BFE3]/15 transition-all outline-none"
              >
                <option value="all">📅 Tất cả các tháng</option>
                {availableMonths.map(m => {
                  const [year, month] = m.split("-");
                  return <option key={m} value={m}>Tháng {month}/{year}</option>;
                })}
              </select>
            </div>

            {/* Teacher Search */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#48BFE3]" /> Tìm kiếm giáo viên
              </label>
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#003B3A] transition-colors" />
                <input 
                  type="text" 
                  placeholder="Tên hoặc mã GV..."
                  value={searchTeacherQuery}
                  onChange={e => setSearchTeacherQuery(e.target.value)}
                  className="w-full text-xs font-bold pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-[#48BFE3]/15 focus:border-[#48BFE3] transition-all outline-none"
                />
                {searchTeacherQuery && (
                  <button onClick={() => setSearchTeacherQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Teacher Directory List */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm flex-1 flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>Thành viên</span>
                <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] rounded-full font-bold">
                  {filteredDeptTeachers.length} GV
                </span>
              </h3>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                {selectedDeptName}
              </span>
            </div>

            {filteredDeptTeachers.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-400">
                <ClipboardList className="w-12 h-12 text-slate-200 mb-2 stroke-1" />
                <p className="text-xs font-bold text-center">Không tìm thấy giáo viên nào.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {filteredDeptTeachers.map((teacher: any) => {
                  const stats = teacherStats[teacher.id] || { taughtCount: 0, observedCount: 0 };
                  const isSelected = selectedTeacherId === teacher.id;

                  const hasTargets = teacher.requiredTaught || teacher.requiredObserved;
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
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 group ${
                        isSelected
                          ? "bg-gradient-to-r from-teal-50 to-emerald-50/40 border-[#48BFE3] shadow-md shadow-teal-500/10 scale-[1.01] ring-2 ring-[#48BFE3]/20"
                          : "bg-slate-50/50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm transition-transform group-hover:scale-105 ${
                          isSelected 
                            ? "bg-gradient-to-br from-[#003B3A] to-[#48BFE3] text-white" 
                            : "bg-slate-200 text-slate-700"
                        }`}>
                          {teacher.teacherName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-black truncate ${isSelected ? "text-[#003B3A]" : "text-slate-800"}`}>
                            {teacher.teacherName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold text-slate-400">
                              {teacher.teacherCode}
                            </span>
                            {teacher.position && (
                              <span className="px-1.5 py-0.2 bg-slate-200/80 text-slate-600 rounded text-[9px] font-extrabold uppercase">
                                {teacher.position}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 items-end shrink-0">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border flex items-center gap-1 ${
                          taughtPassed 
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          <span className="text-[8px] uppercase tracking-wider font-extrabold">Dạy:</span>
                          <span>{stats.taughtCount}{teacher.requiredTaught ? `/${teacher.requiredTaught}` : ""}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border flex items-center gap-1 ${
                          observedPassed 
                            ? "bg-violet-50 text-violet-800 border-violet-200" 
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          <span className="text-[8px] uppercase tracking-wider font-extrabold">Dự:</span>
                          <span>{stats.observedCount}{teacher.requiredObserved ? `/${teacher.requiredObserved}` : ""}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Deep-dive Analysis & History */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Selected Teacher Banner */}
          {selectedTeacher ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#003B3A] via-[#004d4b] to-[#48BFE3] text-white flex items-center justify-center font-black text-xl shadow-md shadow-[#003B3A]/20">
                    {selectedTeacher.teacherName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-black text-[#003B3A]">
                        {selectedTeacher.teacherName}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                        {selectedTeacher.teacherCode}
                      </span>
                      {selectedTeacher.position && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-extrabold uppercase">
                          {selectedTeacher.position}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                      <span>Tổ: <strong className="text-slate-800">{selectedDeptName}</strong></span>
                      <span>•</span>
                      <span>{selectedTeacher.email || "Chưa có email"}</span>
                    </div>

                    {/* Observer / Observee quota tags */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTeacher.observerType && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-50 text-violet-800 border border-violet-200 rounded-lg">
                          Dự: {selectedTeacher.requiredObserved} tiết/{selectedTeacher.observedUnit} ({selectedTeacher.observerType})
                        </span>
                      )}
                      {selectedTeacher.observeeType && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                          Dạy: {selectedTeacher.requiredTaught} tiết/{selectedTeacher.taughtUnit} ({selectedTeacher.observeeType})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(isSuperAdmin || isTTCM || isGDCS) && (
                    <button
                      onClick={() => openTargetConfig(selectedTeacher)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-500" />
                      <span>Thiết lập chỉ tiêu</span>
                    </button>
                  )}
                  {teacherAvgScore && (
                    <div className="px-3.5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl font-black text-xs shadow-md shadow-teal-500/20 text-center">
                      <div className="text-[9px] uppercase font-bold text-teal-100">ĐTB Đánh giá</div>
                      <div>{teacherAvgScore}/20.0đ</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-tab Navigation */}
              <div className="flex gap-2 pt-4 overflow-x-auto">
                <button
                  onClick={() => setActiveDetailTab("lich-su")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                    activeDetailTab === "lich-su"
                      ? "bg-[#003B3A] text-white shadow-md shadow-[#003B3A]/20"
                      : "bg-slate-100 hover:bg-slate-200/80 text-slate-600"
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Lịch sử tiết dạy</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeDetailTab === "lich-su" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                    {filteredSlots.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveDetailTab("phan-tich")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                    activeDetailTab === "phan-tich"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-slate-100 hover:bg-slate-200/80 text-slate-600"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Phân tích Năng lực & Điểm yếu</span>
                </button>

                <button
                  onClick={() => setActiveDetailTab("to-cm")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                    activeDetailTab === "to-cm"
                      ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                      : "bg-slate-100 hover:bg-slate-200/80 text-slate-600"
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Năng lực Tổ CM</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-200/90 text-center py-16">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-black text-slate-600 uppercase">Vui lòng chọn giáo viên để xem chi tiết</p>
            </div>
          )}

          {/* TAB 1: Lịch sử tiết dạy */}
          {activeDetailTab === "lich-su" && selectedTeacher && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
              {/* Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                <div className="sm:col-span-6 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm chủ đề, đề tài, lớp..."
                    value={searchSlotQuery}
                    onChange={e => setSearchSlotQuery(e.target.value)}
                    className="w-full text-xs font-bold pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-[#48BFE3] focus:ring-4 focus:ring-[#48BFE3]/15 outline-none transition-all"
                  />
                </div>
                <div className="sm:col-span-3">
                  <select 
                    value={filterLevel} 
                    onChange={e => { setFilterLevel(e.target.value); setFilterGrade("all"); }}
                    className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:border-[#48BFE3] outline-none"
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
                    className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:border-[#48BFE3] outline-none"
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
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <ClipboardList className="w-14 h-14 stroke-1 text-slate-300 mb-3" />
                  <p className="text-sm font-black text-slate-600">Không tìm thấy tiết dạy nào tương ứng</p>
                  <p className="text-xs text-slate-400 mt-1">Hãy thử thay đổi điều kiện lọc hoặc chọn tháng khác</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSlots.map(slot => {
                    const avgScore = getSlotAverageScore(slot);
                    const slotDate = new Date(slot.date);
                    const evals = slot.registrations?.filter((r: any) => r.evaluation !== null) || [];
                    const isMamNonBlock = slot.level === "Mầm non" || 
                      (slot.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes("mam non");

                    return (
                      <div 
                        key={slot.id} 
                        className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden"
                      >
                        {/* Level indicator strip */}
                        <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                          isMamNonBlock ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-[#003B3A] to-[#48BFE3]"
                        }`} />

                        {/* Card Header & Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pt-1">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider ${
                                isMamNonBlock 
                                  ? "bg-amber-100 text-amber-800 border border-amber-300" 
                                  : "bg-teal-100 text-teal-800 border border-teal-300"
                              }`}>
                                {slot.level}
                              </span>
                              {slot.grade && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[10px] font-bold">
                                  {slot.grade}
                                </span>
                              )}
                              {slot.startTime && (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {slot.startTime}
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {slotDate.toLocaleDateString("vi-VN")}
                              </span>
                              {slot.className && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-bold">
                                  Lớp: {slot.className}
                                </span>
                              )}
                            </div>

                            {/* Subject / Topic Title */}
                            {isMamNonBlock ? (() => {
                              const parts = (slot.subjectName || "").split(" | ");
                              const chuDe = parts[0] || "";
                              const hoatDong = parts[1] || "";
                              const deTai = slot.topic || "";
                              return (
                                <div className="space-y-1 mt-2">
                                  <div className="flex items-center gap-2 flex-wrap text-xs">
                                    <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                      Chủ đề: {chuDe}
                                    </span>
                                    <span className="text-slate-600 font-semibold">
                                      Hoạt động: <strong className="text-amber-800">{hoatDong}</strong>
                                    </span>
                                  </div>
                                  <h3 className="text-base sm:text-lg font-black text-amber-950 tracking-tight">
                                    Đề tài: {deTai}
                                  </h3>
                                </div>
                              );
                            })() : (
                              <div className="mt-1.5">
                                {slot.subjectName && (
                                  <span className="text-xs font-bold text-slate-400 block">
                                    Môn: {slot.subjectName}
                                  </span>
                                )}
                                <h3 className="text-base sm:text-lg font-black text-[#003B3A] tracking-tight mt-0.5">
                                  {slot.topic}
                                </h3>
                              </div>
                            )}
                          </div>

                          {/* Score Badge */}
                          <div className="shrink-0 sm:text-right">
                            {avgScore !== null ? (
                              <div className="inline-flex flex-col items-end">
                                <span className="px-3.5 py-1.5 bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-900 border border-teal-300 rounded-2xl font-black text-xs shadow-xs">
                                  ĐTB chung: {typeof avgScore === "number" ? avgScore.toFixed(2) + "/20.00đ" : avgScore}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Đã nghiệm thu
                                </span>
                              </div>
                            ) : (
                              <span className="px-3 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-2xl font-bold text-xs">
                                ĐTB chung: --
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Evaluations by Observers */}
                        <div className="pt-3 border-t border-slate-100 space-y-3">
                          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-[#48BFE3]" />
                            <span>Đánh giá từ người dự ({evals.length} phiếu)</span>
                          </h4>

                          {evals.length === 0 ? (
                            <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-400 font-medium italic border border-slate-100">
                              Chưa có phiếu đánh giá nào được ghi nhận cho tiết dạy này.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {evals.map((reg: any) => {
                                const evalData = reg.evaluation;
                                const passed = isPreschoolTeacher
                                  ? (evalData.overallRating === "Tốt" || evalData.overallRating === "Khá" || evalData.overallRating === "Đạt")
                                  : (evalData.totalScore !== null && evalData.totalScore !== undefined ? evalData.totalScore >= 14 : (evalData.overallRating === "Giỏi" || evalData.overallRating === "Khá"));

                                return (
                                  <div 
                                    key={reg.id} 
                                    className="p-4 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3 transition-all"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-[#003B3A] text-white flex items-center justify-center font-black text-[11px]">
                                          {reg.teacher?.teacherName.charAt(0) || "U"}
                                        </div>
                                        <div>
                                          <p className="text-xs font-black text-slate-800">{reg.teacher?.teacherName}</p>
                                          <p className="text-[10px] text-slate-400 font-bold">Mã GV: {reg.teacher?.teacherCode}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200">
                                          {evalData.totalScore !== null && evalData.totalScore !== undefined
                                            ? evalData.totalScore.toFixed(2) + "đ"
                                            : evalData.overallRating}
                                        </span>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                                          passed 
                                            ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                                            : "bg-rose-100 text-rose-800 border-rose-300"
                                        }`}>
                                          {passed ? "ĐẠT" : "CHƯA ĐẠT"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Criteria Pills */}
                                    <div className="flex flex-wrap gap-1.5">
                                      {isPreschoolTeacher ? (
                                        [1, 2, 3, 4, 5].map((num) => {
                                          const critKey = "criterion" + num;
                                          const ratingLabels: any = { 4: "Tốt", 3: "Khá", 2: "Tr.bình", 1: "Yếu" };
                                          const critVal = evalData[critKey] !== null && evalData[critKey] !== undefined ? evalData[critKey] : 0;
                                          const isPassed = critVal >= 3;
                                          return (
                                            <span 
                                              key={num} 
                                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black border rounded-lg shadow-2xs ${
                                                isPassed 
                                                  ? "bg-teal-50 text-teal-800 border-teal-200" 
                                                  : "bg-rose-50 text-rose-700 border-rose-200"
                                              }`}
                                            >
                                              <span>T{num}:</span>
                                              <span>{ratingLabels[critVal] || "-"}</span>
                                            </span>
                                          );
                                        })
                                      ) : (
                                        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => {
                                          const scoreKey = "score" + num;
                                          const scoreVal = evalData[scoreKey] !== null && evalData[scoreKey] !== undefined ? Number(evalData[scoreKey]) : 0;
                                          const maxVal = maxScoresK12[num - 1];
                                          const isPassed = scoreVal >= maxVal * 0.5;

                                          return (
                                            <span 
                                              key={num} 
                                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-black border rounded-lg shadow-2xs ${
                                                isPassed 
                                                  ? "bg-sky-50 text-sky-800 border-sky-200" 
                                                  : "bg-rose-50 text-rose-700 border-rose-200"
                                              }`}
                                            >
                                              <span>Y{num}:</span>
                                              <span>{scoreVal.toFixed(1)}</span>
                                            </span>
                                          );
                                        })
                                      )}
                                    </div>

                                    {/* Feedback (Strengths & Improvements) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-200/60">
                                      {evalData.strengths && (
                                        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-950">
                                          <div className="font-black flex items-center gap-1.5 text-emerald-800 mb-1">
                                            <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Ưu điểm:</span>
                                          </div>
                                          <p className="italic text-[11px] leading-relaxed">{evalData.strengths}</p>
                                        </div>
                                      )}
                                      {evalData.improvements && (
                                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-950">
                                          <div className="font-black flex items-center gap-1.5 text-amber-800 mb-1">
                                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                            <span>Góp ý phát triển:</span>
                                          </div>
                                          <p className="italic text-[11px] leading-relaxed">{evalData.improvements}</p>
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
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Phân tích Năng lực & Điểm yếu cá nhân */}
          {activeDetailTab === "phan-tich" && selectedTeacher && (() => {
            const { competencyData, sortedWeaknesses } = teacherCompetencyResult;
            const size = 300;
            const center = size / 2;
            const radius = 100;
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
                lx: center + (radius + 22) * Math.sin(angle),
                ly: center - (radius + 22) * Math.cos(angle)
              });
            }

            const valuePoints = competencyData.map((d, i) => {
              const angle = i * angleStep;
              const r = radius * (d.pct / 100);
              return (center + r * Math.sin(angle)) + "," + (center - r * Math.cos(angle));
            });
            const valuePath = valuePoints.join(" ");

            return (
              <div className="space-y-6">
                {teacherEvaluations.length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-slate-200/90 text-center py-16">
                    <PieChart className="w-14 h-14 stroke-1 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-black text-slate-700 uppercase">Chưa có dữ liệu đánh giá</h3>
                    <p className="text-xs text-slate-400 mt-1">Giáo viên này chưa có phiếu đánh giá nào trong kỳ học/tháng đã chọn.</p>
                  </div>
                ) : (
                  <>
                    {/* Radar Chart & Competency Bars */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
                        <span className="text-xs font-black text-indigo-700 uppercase tracking-wider mb-2">
                          Bản đồ Năng lực dạy học
                        </span>
                        <svg width="260" height="260" viewBox="0 0 300 300" className="overflow-visible">
                          {gridLayers.map((level, idx) => (
                            <polygon
                              key={level}
                              points={gridPaths[idx]}
                              fill="none"
                              stroke="#e2e8f0"
                              strokeWidth="1"
                              strokeDasharray={level === 100 ? "none" : "3,3"}
                            />
                          ))}
                          {gridLayers.map((level) => (
                            <text
                              key={level}
                              x={center}
                              y={center - radius * (level / 100) + 4}
                              textAnchor="middle"
                              className="text-[9px] fill-slate-400 font-bold"
                            >
                              {level}%
                            </text>
                          ))}
                          {axisLines.map((axis, idx) => (
                            <g key={idx}>
                              <line x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="#e2e8f0" strokeWidth="1" />
                              <text x={axis.lx} y={axis.ly + 4} textAnchor="middle" className="text-[11px] font-black fill-[#003B3A]">
                                {axis.label}
                              </text>
                            </g>
                          ))}
                          {valuePoints.length > 0 && (
                            <polygon points={valuePath} fill="rgba(79, 70, 229, 0.15)" stroke="#4f46e5" strokeWidth="2.5" />
                          )}
                          {competencyData.map((d, i) => {
                            const angle = i * angleStep;
                            const r = radius * (d.pct / 100);
                            return (
                              <circle
                                key={i}
                                cx={center + r * Math.sin(angle)}
                                cy={center - r * Math.cos(angle)}
                                r="4"
                                fill="#ffffff"
                                stroke="#4f46e5"
                                strokeWidth="2.5"
                              />
                            );
                          })}
                        </svg>
                      </div>

                      {/* Bars */}
                      <div className="md:col-span-7 space-y-3">
                        <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Award className="w-4 h-4 text-indigo-600" />
                          <span>Chi tiết từng tiêu chí</span>
                        </h4>
                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {competencyData.map(item => {
                            let barColor = "from-teal-500 to-emerald-500";
                            if (item.standard === 2) barColor = "from-sky-500 to-blue-500";
                            if (item.standard === 3) barColor = "from-indigo-500 to-violet-500";
                            if (item.standard === 4) barColor = "from-amber-500 to-orange-500";

                            return (
                              <div key={item.id} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-800 text-[11px] truncate max-w-[240px]">
                                    {item.id}. {item.label.split(":")[1] || item.label}
                                  </span>
                                  <span className="font-black text-slate-600 text-[11px]">
                                    {item.avg.toFixed(2)}/{item.max.toFixed(1)}đ ({item.pct}%)
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full bg-gradient-to-r ${barColor}`} style={{ width: `${item.pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Weakness Analysis & Development Action */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                          <span>Điểm yếu cần ưu tiên đào tạo & bồi dưỡng</span>
                        </h4>
                        <span className="text-[10px] font-extrabold text-slate-400">
                          (Dưới 70% chuẩn)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {sortedWeaknesses.slice(0, 4).map((weakness, idx) => {
                          const isHighRisk = weakness.lowPct >= 40;
                          return (
                            <div 
                              key={weakness.id}
                              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                                isHighRisk 
                                  ? "bg-rose-50/60 border-rose-200 border-l-4 border-l-rose-500" 
                                  : "bg-amber-50/60 border-amber-200 border-l-4 border-l-amber-500"
                              }`}
                            >
                              <div className="min-w-0">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Ưu tiên {idx + 1}</span>
                                <h5 className="font-extrabold text-xs text-slate-900 truncate mt-0.5">
                                  {weakness.id}. {weakness.label.split(":")[1] || weakness.label}
                                </h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">Hiệu suất trung bình: <strong>{weakness.avgPct}%</strong></p>
                              </div>
                              <div className="shrink-0 text-right">
                                <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                                  isHighRisk ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-amber-100 text-amber-800 border-amber-300"
                                }`}>
                                  {weakness.lowPct}% yếu
                                </span>
                                <span className="block text-[9px] text-slate-400 font-bold mt-1">
                                  {weakness.lowCount}/{teacherEvaluations.length} phiếu
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {sortedWeaknesses[0] && sortedWeaknesses[0].lowPct > 0 && (
                        <div className="bg-gradient-to-r from-teal-50 to-emerald-50/50 border border-teal-200 rounded-2xl p-4 flex items-start gap-3.5 mt-4">
                          <div className="p-2.5 bg-white text-[#003B3A] rounded-2xl border border-teal-200 shadow-sm shrink-0">
                            <Sparkles className="w-5 h-5 text-[#48BFE3]" />
                          </div>
                          <div className="space-y-1">
                            <h6 className="font-black text-xs text-[#003B3A] uppercase tracking-wider">
                              Đề xuất sinh hoạt chuyên môn & Kèm cặp (Coaching)
                            </h6>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              Khuyến nghị Tổ chuyên môn phân công giáo viên cốt cán hỗ trợ chuyên sâu cho thầy/cô về <strong className="text-rose-700">{sortedWeaknesses[0].id} ({sortedWeaknesses[0].lowPct}% phiếu chưa đạt)</strong>. Tổ chức dự giờ chuyên đề tiếp theo tập trung vào tiêu chí này.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* TAB 3: Năng lực Tổ Chuyên Môn */}
          {activeDetailTab === "to-cm" && (() => {
            const { dep, dmn, dc, dsw } = deptCompetencyResult;
            const tp2 = dmn ? 5 : 11;
            const as2 = (2 * Math.PI) / tp2;
            const ce = 150;
            const rd = 100;
            const gl2 = [25, 50, 75, 100];
            const gp2 = gl2.map(lv => {
              const pts = [];
              for (let i = 0; i < tp2; i++) {
                const a = i * as2, rv = rd * (lv / 100);
                pts.push((ce + rv * Math.sin(a)) + "," + (ce - rv * Math.cos(a)));
              }
              return pts.join(" ");
            });
            const al2 = [];
            for (let i = 0; i < tp2; i++) {
              const a = i * as2;
              al2.push({
                x1: ce, y1: ce,
                x2: ce + rd * Math.sin(a),
                y2: ce - rd * Math.cos(a),
                lb: (dmn ? "T" : "Y") + (i + 1),
                lx: ce + (rd + 22) * Math.sin(a),
                ly: ce - (rd + 22) * Math.cos(a)
              });
            }
            const dvp = dc.map((d, i) => {
              const a = i * as2, rv = rd * (d.pt / 100);
              return (ce + rv * Math.sin(a)) + "," + (ce - rv * Math.cos(a));
            });
            const dvpath = dvp.join(" ");

            return (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50/50 border border-violet-200 rounded-3xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-white text-violet-600 rounded-2xl border border-violet-200 shadow-sm">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-800">{selectedDeptName}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Tổng hợp toàn Tổ • {dep.length} phiếu đánh giá • {deptTeachers.length} giáo viên
                      </p>
                    </div>
                  </div>
                </div>

                {dep.length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-slate-200/90 text-center py-16">
                    <PieChart className="w-14 h-14 stroke-1 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-black text-slate-700 uppercase">Chưa có dữ liệu đánh giá cho Tổ CM</h3>
                    <p className="text-xs text-slate-400 mt-1">Chưa có phiếu dự giờ nào được ghi nhận cho các giáo viên trong tổ.</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
                        <span className="text-xs font-black text-violet-600 uppercase tracking-wider mb-2">
                          Bản đồ Năng lực Toàn Tổ
                        </span>
                        <svg width="260" height="260" viewBox="0 0 300 300" className="overflow-visible">
                          {gl2.map((lv, ix) => (
                            <polygon key={lv} points={gp2[ix]} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray={lv === 100 ? "none" : "3,3"} />
                          ))}
                          {gl2.map(lv => (
                            <text key={lv} x={ce} y={ce - rd * (lv / 100) + 4} textAnchor="middle" className="text-[9px] fill-slate-400 font-bold">
                              {lv}%
                            </text>
                          ))}
                          {al2.map((ax, ix) => (
                            <g key={ix}>
                              <line x1={ax.x1} y1={ax.y1} x2={ax.x2} y2={ax.y2} stroke="#e2e8f0" strokeWidth="1" />
                              <text x={ax.lx} y={ax.ly + 4} textAnchor="middle" className="text-[11px] font-black fill-[#003B3A]">
                                {ax.lb}
                              </text>
                            </g>
                          ))}
                          {dvp.length > 0 && (
                            <polygon points={dvpath} fill="rgba(124, 58, 237, 0.15)" stroke="#7c3aed" strokeWidth="2.5" />
                          )}
                          {dc.map((d, i) => {
                            const a = i * as2, rv = rd * (d.pt / 100);
                            return (
                              <circle
                                key={i}
                                cx={ce + rv * Math.sin(a)}
                                cy={ce - rv * Math.cos(a)}
                                r="4"
                                fill="#ffffff"
                                stroke="#7c3aed"
                                strokeWidth="2.5"
                              />
                            );
                          })}
                        </svg>
                      </div>

                      <div className="md:col-span-7 space-y-3">
                        <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Award className="w-4 h-4 text-violet-600" />
                          <span>Hiệu suất Năng lực Giảng dạy Toàn Tổ</span>
                        </h4>
                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {dc.map(item => (
                            <div key={item.id} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-800 text-[11px] truncate max-w-[240px]">
                                  {item.id}. {item.lb.split(":")[1] || item.lb}
                                </span>
                                <span className="font-black text-slate-600 text-[11px]">
                                  {item.av.toFixed(2)}/{item.mx.toFixed(1)}đ ({item.pt}%)
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${item.pt}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                          <span>Điểm yếu chung của Tổ Chuyên môn</span>
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {dsw.slice(0, 6).map((w, ix) => {
                          const isHigh = w.lp >= 40;
                          return (
                            <div 
                              key={w.id} 
                              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                                isHigh 
                                  ? "bg-rose-50/60 border-rose-200 border-l-4 border-l-rose-500" 
                                  : "bg-amber-50/60 border-amber-200 border-l-4 border-l-amber-500"
                              }`}
                            >
                              <div className="min-w-0">
                                <span className="text-[9px] font-black uppercase text-slate-400">Ưu tiên {ix + 1}</span>
                                <h5 className="font-extrabold text-xs text-slate-900 truncate mt-0.5">
                                  {w.id}. {w.lb.split(":")[1] || w.lb}
                                </h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">Hiệu suất TB: <strong>{w.pt}%</strong></p>
                              </div>
                              <div className="shrink-0 text-right">
                                <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                                  isHigh ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-amber-100 text-amber-800 border-amber-300"
                                }`}>
                                  {w.lp}% điểm yếu
                                </span>
                                <span className="block text-[9px] text-slate-400 font-bold mt-1">
                                  {w.lc}/{dep.length} phiếu
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {dsw[0] && dsw[0].lp > 0 && (
                        <div className="bg-gradient-to-r from-violet-50 to-indigo-50/40 border border-violet-200 rounded-2xl p-4 flex items-start gap-3.5 mt-4">
                          <div className="p-2.5 bg-white text-violet-600 rounded-2xl border border-violet-200 shadow-sm shrink-0">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h6 className="font-black text-xs text-[#003B3A] uppercase tracking-wider">
                              Đề xuất Chuyên đề Sinh hoạt Chuyên môn Toàn Tổ
                            </h6>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              Tỷ lệ điểm yếu cao nhất toàn tổ rơi vào <strong className="text-rose-700">{dsw[0].id} ({dsw[0].lp}%)</strong>. Ban Giám hiệu và Tổ trưởng chuyên môn nên tổ chức hội thảo chuyên đề hoặc thao giảng mẫu nhằm nâng cao năng lực này cho toàn bộ giáo viên trong tổ.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

        </div>
      </div>

      {/* Target Configuration Modal */}
      {isTargetModalOpen && targetTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#003B3A] text-white rounded-2xl">
                  <Settings className="w-5 h-5 text-[#48BFE3]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">Thiết lập Chỉ tiêu Dự giờ</h3>
                  <p className="text-xs text-slate-500">Giáo viên: <strong>{targetTeacher.teacherName}</strong> ({targetTeacher.teacherCode})</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTargetModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Observer Quota */}
              <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="text-xs font-black text-indigo-900 uppercase tracking-wider block">
                  1. Chỉ tiêu Người DỰ giờ
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {["Ban ĐHCM", "TTCM", "Nhóm trưởng CM CS", "Giáo viên mới", "Giáo viên cũ"].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleObserverTypePreset(preset)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        observerType === preset 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" 
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Số tiết dự</label>
                    <input 
                      type="number"
                      min={0}
                      value={requiredObserved}
                      onChange={e => setRequiredObserved(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl mt-1 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Đơn vị tính</label>
                    <select
                      value={observedUnit}
                      onChange={e => setObservedUnit(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl mt-1 outline-none focus:border-indigo-500"
                    >
                      <option value="tháng">Tiết / Tháng</option>
                      <option value="học kỳ">Tiết / Học kỳ</option>
                      <option value="năm">Tiết / Năm</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Observee Quota */}
              <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="text-xs font-black text-emerald-900 uppercase tracking-wider block">
                  2. Chỉ tiêu Người DẠY (Bị dự)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {["TTCM", "Nhóm trưởng CM CS", "Giáo viên mới", "Giáo viên cũ"].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleObserveeTypePreset(preset)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        observeeType === preset 
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" 
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Số tiết dạy</label>
                    <input 
                      type="number"
                      min={0}
                      value={requiredTaught}
                      onChange={e => setRequiredTaught(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl mt-1 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Đơn vị tính</label>
                    <select
                      value={taughtUnit}
                      onChange={e => setTaughtUnit(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl mt-1 outline-none focus:border-emerald-500"
                    >
                      <option value="tháng">Tiết / Tháng</option>
                      <option value="học kỳ">Tiết / Học kỳ</option>
                      <option value="năm">Tiết / Năm</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsTargetModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={savingTargets}
                onClick={handleSaveTargets}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#003B3A] to-[#015856] text-white font-black text-xs shadow-md shadow-[#003B3A]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {savingTargets ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
