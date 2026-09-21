"use client"
import { useState, useMemo, useEffect, useCallback } from "react"
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
  UserCheck, AlertTriangle, ArrowRight, BookMarked, Grid3X3, Table2, ArrowLeftRight, MapPin, RefreshCw, ListChecks, Info, HelpCircle, ShieldCheck, Target, Printer
} from "lucide-react"
import { DetailedStatementView } from "@/components/dashboard/DetailedStatementView"

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
  divisions?: any[]
  teachers: any[]
  campuses: CampusInfo[]
  classes: ClassInfo[]
  initialFilters: { level: string; period: string; grade: string; date: string; campusId: string; divisionCode?: string; deptId: string; academicYearId?: string }
  isTTCM: boolean
  isSuperAdmin: boolean
  isHeadOfAcademic?: boolean
  isTBP?: boolean
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
  initialSlots, currentTeacher, subjects, departments, divisions = [], teachers: initialTeachers, campuses, classes, initialFilters, isTTCM, isSuperAdmin, isHeadOfAcademic = false, isTBP = false, isGDCS = false, academicYears, selectedYearId
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
  const [activeDetailTab, setActiveDetailTab] = useState<"lich-su" | "lich-su-du" | "tien-do-to" | "phan-tich" | "to-cm">("lich-su")

  // Top-level Navigation Tab state ("tong-hop" | "ma-tran")
  const [mainTab, setMainTab] = useState<"tong-hop" | "ma-tran" | "dbcl" | "kho-tieu-bieu">(() => {
    const t = searchParams.get("tab"); return t === "ma-tran" ? "ma-tran" : t === "dbcl" ? "dbcl" : t === "kho-tieu-bieu" ? "kho-tieu-bieu" : "tong-hop"
  })

  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam === "ma-tran") {
      setMainTab("ma-tran")
    } else if (tabParam === "dbcl") {
      setMainTab("dbcl")
    } else if (tabParam === "kho-tieu-bieu") {
      setMainTab("kho-tieu-bieu")
    } else if (tabParam === "tong-hop") {
      setMainTab("tong-hop")
    }
  }, [searchParams])

  const handleSwitchMainTab = (tab: "tong-hop" | "ma-tran" | "dbcl" | "kho-tieu-bieu") => {
    setMainTab(tab)
    const params = new URLSearchParams(window.location.search)
    if (tab === "ma-tran") {
      params.set("tab", "ma-tran")
    } else if (tab === "dbcl") {
      params.set("tab", "dbcl")
    } else if (tab === "kho-tieu-bieu") {
      params.set("tab", "kho-tieu-bieu")
    } else {
      params.delete("tab")
    }
    const newQuery = params.toString() ? `?${params.toString()}` : ""
    window.history.replaceState(null, "", `${pathname}${newQuery}`)
  }

  // Filter & view states for TTCM Matrix Tab
  const [ttcmMatrixMonth, setTtcmMatrixMonth] = useState<string>("all")
  const [ttcmMatrixBlock, setTtcmMatrixBlock] = useState<string>("all")
  const [ttcmMatrixCampus, setTtcmMatrixCampus] = useState<string>("all")
  const [ttcmMatrixObservedCampus, setTtcmMatrixObservedCampus] = useState<string>("all")
  const [ttcmSearchQuery, setTtcmSearchQuery] = useState<string>("")
  // QA Dashboard Filters
  const [qaCampusFilter, setQaCampusFilter] = useState<string>("all")
  const [qaBlockFilter, setQaBlockFilter] = useState<string>("all")
  const [qaMonthFilter, setQaMonthFilter] = useState<string>("all")
  // Exemplary Lessons Filters
  const [exemplarySearchQuery, setExemplarySearchQuery] = useState("")
  const [exemplarySubjectFilter, setExemplarySubjectFilter] = useState("all")
  const [exemplaryGradeFilter, setExemplaryGradeFilter] = useState("all")
  const [exemplaryCampusFilter, setExemplaryCampusFilter] = useState("all")


  const [ttcmViewMode, setTtcmViewMode] = useState<"pivot-matrix" | "detailed-list">("pivot-matrix")

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

    // Auto detect observerType if not already configured
    const posUpper = (teacher.position || "").toUpperCase();
    const isGDCS = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS"].includes(posUpper) ||
      posUpper.includes("GIÁM ĐỐC") || posUpper.includes("GIAM DOC");
    const isBanDH = posUpper === "BAN ĐHCM" || posUpper.includes("ĐHCM") || posUpper.includes("DHCM");
    const isTT = posUpper === "TTCM" || posUpper.includes("TỔ TRƯỞNG") || posUpper.includes("TO TRUONG");

    const defaultObserverType = isBanDH ? "Ban ĐHCM" : (isGDCS ? "GĐCS" : (isTT ? "TTCM" : "Giáo viên cũ"));
    const obsType = teacher.observerType || defaultObserverType;

    setObserverType(obsType);
    setObserveeType(teacher.observeeType || (isGDCS || isBanDH ? "GĐCS" : ""));

    let reqObs = teacher.requiredObserved;
    if (reqObs === undefined || reqObs === null || reqObs === 0) {
      if (obsType === "Ban ĐHCM") reqObs = 10;
      else if (obsType === "GĐCS" || obsType === "Giám đốc Điều hành cơ sở" || obsType === "GDCS") reqObs = 4;
      else if (obsType === "TTCM" || obsType === "Nhóm trưởng CM CS") reqObs = 8;
      else if (obsType === "Giáo viên mới") reqObs = 10;
      else if (obsType === "Giáo viên cũ") reqObs = 4;
      else reqObs = 4;
    }

    setRequiredObserved(reqObs);
    setObservedUnit(teacher.observedUnit || "tháng");
    setRequiredTaught(teacher.requiredTaught || 0);
    setTaughtUnit(teacher.taughtUnit || "tháng");
    setIsTargetModalOpen(true);
  };

  const handleObserverTypePreset = (type: string) => {
    setObserverType(type);
    if (type === "Ban ĐHCM") {
      setRequiredObserved(10); setObservedUnit("tháng");
    } else if (type === "GĐCS" || type === "Giám đốc Điều hành cơ sở" || type === "GDCS") {
      setRequiredObserved(4); setObservedUnit("tháng");
    } else if (type === "TTCM") {
      setRequiredObserved(8); setObservedUnit("tháng");
    } else if (type === "Nhóm trưởng CM CS") {
      setRequiredObserved(8); setObservedUnit("tháng");
    } else if (type === "Giáo viên mới") {
      setRequiredObserved(10); setObservedUnit("tháng");
    } else if (type === "Giáo viên cũ") {
      setRequiredObserved(4); setObservedUnit("tháng");
    }
  };

  const handleObserveeTypePreset = (type: string) => {
    setObserveeType(type);
    if (type === "GĐCS" || type === "Ban ĐHCM") {
      setRequiredTaught(0); setTaughtUnit("tháng");
    } else if (type === "TTCM") {
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
      taughtEsl: number;
      observedMamNon: number;
      observedPhoThong: number;
      observedEsl: number;
    }> = {};

    teachersList.forEach((t: any) => {
      statsMap[t.id] = {
        taughtCount: 0,
        observedCount: 0,
        taughtSurpriseCount: 0,
        observedSurpriseCount: 0,
        taughtMamNon: 0,
        taughtPhoThong: 0,
        taughtEsl: 0,
        observedMamNon: 0,
        observedPhoThong: 0,
        observedEsl: 0
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
      const isEsl = (slot.subjectName || "").includes("ESL") ||
        (slot.subjectName || "").toLowerCase().includes("tiếng anh (esl)") ||
        (slot.topic || "").toLowerCase().includes("foreign english") ||
        slot.requestOrigin === "FOREIGN_WALKTHROUGH";
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
          else if (isEsl) statsMap[slot.teacherId].taughtEsl += increment;
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
          else if (isEsl) statsMap[reg.teacherId].observedEsl += increment;
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

  // Tính toán trước ngày cuối tháng & tháng hiện tại trên client làm giá trị dự phòng
  const clientNextRunDate = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = now.getMonth();
    const lastDay = new Date(yyyy, mm + 1, 0).getDate();
    return `${String(lastDay).padStart(2, "0")}/${String(mm + 1).padStart(2, "0")}/${yyyy}`;
  }, []);

  const clientCurrentMonth = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  }, []);

  // Cấu hình Tự động gửi email đến TTCM vào ngày cuối cùng của tháng
  const [isAutoEmailModalOpen, setIsAutoEmailModalOpen] = useState(false);
  const [autoEmailConfig, setAutoEmailConfig] = useState<{
    enabled: boolean;
    currentMonth: string;
    nextRunDate: string;
    isRunDay: boolean;
    lastSentMonth: string;
    lastSentAt: string;
    lastLog: string;
    departments: any[];
  }>({
    enabled: false,
    currentMonth: "",
    nextRunDate: "",
    isRunDay: false,
    lastSentMonth: "",
    lastSentAt: "",
    lastLog: "",
    departments: []
  });
  const [loadingAutoConfig, setLoadingAutoConfig] = useState(false);
  const [togglingAutoEmail, setTogglingAutoEmail] = useState(false);
  const [runningAutoTest, setRunningAutoTest] = useState(false);
  const [autoTestMessage, setAutoTestMessage] = useState<string | null>(null);

  const fetchAutoEmailConfig = useCallback(async () => {
    try {
      setLoadingAutoConfig(true);
      const res = await fetch("/api/admin/du-gio/auto-email-config");
      const data = await res.json();
      if (res.ok && data) {
        setAutoEmailConfig(prev => ({
          ...prev,
          ...data,
          enabled: Boolean(data.enabled)
        }));
      }
    } catch (err) {
      console.error("Error fetching auto email config:", err);
    } finally {
      setLoadingAutoConfig(false);
    }
  }, []);

  useEffect(() => {
    fetchAutoEmailConfig();
  }, [fetchAutoEmailConfig]);

  const handleToggleAutoEmail = async (newVal: boolean) => {
    // Optimistic update ngay lập tức trên UI
    setAutoEmailConfig(prev => ({ ...prev, enabled: newVal }));
    try {
      setTogglingAutoEmail(true);
      const res = await fetch("/api/admin/du-gio/auto-email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newVal })
      });
      const data = await res.json();
      if (res.ok) {
        setAutoEmailConfig(prev => ({ ...prev, enabled: newVal }));
        toast.success(data.message || (newVal ? "Đã BẬT tự động gửi email cuối tháng" : "Đã TẮT tự động gửi email cuối tháng"));
      } else {
        // Rollback nếu thất bại
        setAutoEmailConfig(prev => ({ ...prev, enabled: !newVal }));
        toast.error(data.error || "Không thể cập nhật cấu hình tự động gửi email");
      }
    } catch (err) {
      setAutoEmailConfig(prev => ({ ...prev, enabled: !newVal }));
      toast.error("Lỗi khi kết nối đến máy chủ");
    } finally {
      setTogglingAutoEmail(false);
    }
  };

  const handleRunAutoTest = async () => {
    if (!confirm("Hệ thống sẽ gửi email báo cáo tháng hiện tại cho TẤT CẢ các Tổ trưởng chuyên môn ngay bây giờ. Bạn có chắc chắn muốn chạy thử nghiệm?")) {
      return;
    }
    try {
      setRunningAutoTest(true);
      setAutoTestMessage(null);
      const res = await fetch("/api/admin/du-gio/auto-email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerNow: true })
      });
      const data = await res.json();
      if (res.ok) {
        setAutoTestMessage(`Thành công: ${data.message}`);
        toast.success(data.message);
        fetchAutoEmailConfig();
      } else {
        setAutoTestMessage(`Thất bại: ${data.error || "Có lỗi xảy ra"}`);
        toast.error(data.error || "Gửi thử nghiệm thất bại");
      }
    } catch (err: any) {
      setAutoTestMessage(`Lỗi: ${err.message}`);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setRunningAutoTest(false);
    }
  };

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
      const posUpper = (ttcm.position || "").toUpperCase();
      const isGDCS = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS"].includes(posUpper) ||
        posUpper.includes("GIÁM ĐỐC") || posUpper.includes("GIAM DOC");
      const isBanDH = posUpper === "BAN ĐHCM" || posUpper.includes("ĐHCM") || posUpper.includes("DHCM");

      const observerType = ttcm.observerType || (
        isBanDH ? "Ban ĐHCM" :
          isGDCS ? "GĐCS" :
            (ttcm.position?.includes("Nhóm trưởng") ? "Nhóm trưởng CM CS" : "TTCM")
      );

      const getPresetTarget = (type: string) => {
        if (type === "Ban ĐHCM") return 10;
        if (type === "GĐCS" || type === "GDCS" || type === "Giám đốc Điều hành cơ sở") return 4;
        if (type === "TTCM" || type === "Nhóm trưởng CM CS") return 8;
        if (type === "Giáo viên cũ") return 4;
        if (type === "Giáo viên mới") return 10;
        return 4;
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

      // 7. Sheet Báo cáo ĐBCL & Phân tích chuyên môn
      const qaHeaders = [
        ["BÁO CÁO ĐẢM BẢO CHẤT LƯỢNG (ĐBCL) & PHÂN TÍCH CHUYÊN MÔN DỰ GIỜ"],
        [`Kỳ báo cáo: ${periodText}`, `Năm học: ${yearName}`, `Thời gian xuất: ${new Date().toLocaleString("vi-VN")}`],
        [],
        ["I. TỔNG HỢP CHỈ SỐ CHẤT LƯỢNG TOÀN TRƯỜNG"],
        ["Tổng tiết dạy có dự giờ", qaAnalytics.totalObservedSlots, "Tổng số phiếu đánh giá", qaAnalytics.totalEvaluations],
        ["Tiết dự giờ đột xuất", qaAnalytics.surpriseObservedSlots, "Tỷ lệ dự giờ đột xuất", `${qaAnalytics.surpriseRate}%`],
        ["Tỷ lệ Đạt chuẩn K-12 (Giỏi + Khá)", `${qaAnalytics.k12.passRate}%`, "Điểm trung bình K-12", `${qaAnalytics.k12.avgScore}/20`],
        [],
        ["II. CƠ CẤU PHỔ ĐIỂM XẾP LOẠI K-12"],
        ["Xếp loại", "Số lượng phiếu", "Tỷ lệ (%)", "Quy chuẩn điểm"],
        ["Giỏi", qaAnalytics.k12.gioi, `${qaAnalytics.k12.gioiPct}%`, "Từ 18.0 - 20.0 điểm"],
        ["Khá", qaAnalytics.k12.kha, `${qaAnalytics.k12.khaPct}%`, "Từ 14.0 - 17.5 điểm"],
        ["Trung bình", qaAnalytics.k12.tb, `${qaAnalytics.k12.tbPct}%`, "Từ 10.0 - 13.5 điểm"],
        ["Chưa đạt", qaAnalytics.k12.khongDat, `${qaAnalytics.k12.khongDatPct}%`, "Dưới 10.0 điểm"],
        [],
        ["III. PHÂN TÍCH 11 TIÊU CHÍ SƯ PHẠM K-12 (BỘ GD&ĐT)"],
        ["Mã", "Tên tiêu chí", "Nhóm chuẩn sư phạm", "Điểm tối đa", "Điểm TB", "Tỷ lệ đạt (%)", "Số tiết bị trừ điểm", "Tỷ lệ trừ điểm (%)"],
        ...qaAnalytics.k12CriteriaStats.map(c => [
          c.id, c.name, c.standardName, c.max, c.avg, `${c.pct}%`, c.lowCount, `${c.lowPct}%`
        ]),
        [],
        ["IV. TOP 3 THẾ MẠNH & TOP 3 TRỌNG TÂM BỒI DƯỠNG"],
        ["Nhóm", "Mã", "Tên tiêu chí", "Điểm TB / Tối đa", "Tỷ lệ đạt (%)", "Khuyến nghị giải pháp hành động"],
        ...qaAnalytics.bestPractices.map(bp => [
          "Thế mạnh nổi bật", bp.id, bp.name, `${bp.avg}/${bp.max}`, `${bp.pct}%`, "Tiếp tục nhân rộng mô hình và chia sẻ trong sinh hoạt chuyên môn"
        ]),
        ...qaAnalytics.recommendations.map(fa => [
          "Trọng tâm bồi dưỡng", fa.id, fa.name, `${fa.avg}/${fa.max}`, `${fa.pct}%`, fa.advice
        ]),
        [],
        ["V. TỔNG HỢP THEO TỪNG CƠ SỞ"],
        ["STT", "Cơ sở", "Tổng tiết dự", "Tiết đột xuất", "Điểm TB K-12", "Tỷ lệ Giỏi (%)", "Tỷ lệ Đạt chuẩn (%)"],
        ...qaAnalytics.campusList.map((c, idx) => [
          idx + 1,
          c.name,
          c.totalSlots,
          c.surpriseSlots,
          c.k12Count > 0 ? Number((c.k12Sum / c.k12Count).toFixed(2)) : "-",
          c.totalEvals > 0 ? `${Math.round((c.gioiCount / c.totalEvals) * 100)}%` : "0%",
          c.totalEvals > 0 ? `${Math.round(((c.gioiCount + c.khaCount) / c.totalEvals) * 100)}%` : "0%"
        ])
      ];

      const wsQA = XLSX.utils.aoa_to_sheet(qaHeaders);
      XLSX.utils.book_append_sheet(wb, wsQA, "Bao_Cao_DBCL");


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


  // =========================================================================
  // GIAI ĐOẠN 3: PHÂN TÍCH CHUYÊN MÔN CHUYÊN SÂU & BÁO CÁO ĐBCL (QA ANALYTICS)
  // =========================================================================

  // =========================================================================
  // GIAI ĐOẠN 4: KHO TIẾT DẠY TIÊU BIỂU & BÀI GIẢNG XUẤT SẮC (EXEMPLARY LESSONS)
  // =========================================================================
  const exemplaryLessons = useMemo(() => {
    const list: any[] = [];
    (initialSlots || []).forEach((slot: any) => {
      const bestEvalReg = slot.registrations?.find((r: any) => {
        const ev = r.evaluation;
        if (!ev || ev.reEvaluationStatus === "DRAFT") return false;
        return ev.overallRating === "Giỏi" || (typeof ev.totalScore === "number" && ev.totalScore >= 18.5) || ev.overallRating === "Tốt";
      });

      if (bestEvalReg) {
        const ev = bestEvalReg.evaluation;
        const teacher = teachersList.find(t => t.id === slot.teacherId);
        list.push({
          slot,
          evaluation: ev,
          teacherName: teacher?.teacherName || slot.teacher?.teacherName || "Giáo viên",
          teacherCode: teacher?.teacherCode || "",
          position: teacher?.position || "",
          deptName: teacher?.departmentRel?.name || "",
          totalScore: ev.totalScore,
          overallRating: ev.overallRating,
          strengths: ev.strengths || ev.generalComments || "",
          lessonPlanName: slot.lessonPlanName || null,
          lessonPlanData: slot.lessonPlanData || null
        });
      }
    });

    return list.filter(item => {
      const s = item.slot;
      const matchQuery = !exemplarySearchQuery ||
        s.topic?.toLowerCase().includes(exemplarySearchQuery.toLowerCase()) ||
        item.teacherName.toLowerCase().includes(exemplarySearchQuery.toLowerCase()) ||
        s.subjectName?.toLowerCase().includes(exemplarySearchQuery.toLowerCase());
      const matchSubject = exemplarySubjectFilter === "all" || s.subjectName === exemplarySubjectFilter;
      const matchGrade = exemplaryGradeFilter === "all" || s.grade === exemplaryGradeFilter;
      const matchCampus = exemplaryCampusFilter === "all" || s.campusId === exemplaryCampusFilter;
      return matchQuery && matchSubject && matchGrade && matchCampus;
    });
  }, [initialSlots, teachersList, exemplarySearchQuery, exemplarySubjectFilter, exemplaryGradeFilter, exemplaryCampusFilter]);

  // Distinct subjects and grades for filters
  const distinctSubjects = useMemo(() => {
    const set = new Set<string>();
    (initialSlots || []).forEach((s: any) => {
      if (s.subjectName) set.add(s.subjectName);
    });
    return Array.from(set).sort();
  }, [initialSlots]);

  const distinctGrades = useMemo(() => {
    const set = new Set<string>();
    (initialSlots || []).forEach((s: any) => {
      if (s.grade) set.add(s.grade);
    });
    return Array.from(set).sort();
  }, [initialSlots]);

  const qaAnalytics = useMemo(() => {
    // 1. Lọc danh sách slots theo các bộ lọc ĐBCL
    const slots = (initialSlots || []).filter((slot: any) => {
      if (qaMonthFilter !== "all") {
        if (!slot.date) return false;
        const d = new Date(slot.date);
        if (isNaN(d.getTime())) return false;
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (ym !== qaMonthFilter) return false;
      }
      if (qaCampusFilter !== "all" && slot.campusId !== qaCampusFilter) {
        return false;
      }
      if (qaBlockFilter === "k12" && slot.level === "Mầm non") return false;
      if (qaBlockFilter === "mam-non" && slot.level !== "Mầm non") return false;
      return true;
    });

    let totalObservedSlots = 0;
    let surpriseObservedSlots = 0;
    let totalEvaluations = 0;
    let totalK12Evaluations = 0;
    let totalMNEvaluations = 0;

    // Rating breakdown K12
    let k12Gioi = 0;
    let k12Kha = 0;
    let k12TB = 0;
    let k12KhongDat = 0;
    let k12ScoresSum = 0;

    // Rating breakdown MN
    let mnTot = 0;
    let mnKha = 0;
    let mnDat = 0;
    let mnChuaDat = 0;

    // Criteria arrays
    const k12CriteriaSums = new Array(11).fill(0);
    const k12CriteriaLowCounts = new Array(11).fill(0);
    let k12CriteriaCount = 0;

    const mnCriteriaSums = new Array(5).fill(0);
    const mnCriteriaLowCounts = new Array(5).fill(0);
    let mnCriteriaCount = 0;

    // Campus breakdown map
    const campusStatsMap = new Map<string, {
      id: string;
      name: string;
      totalSlots: number;
      surpriseSlots: number;
      totalEvals: number;
      k12Count: number;
      k12Sum: number;
      gioiCount: number;
      khaCount: number;
      otherCount: number;
    }>();

    (campuses || []).forEach(c => {
      campusStatsMap.set(c.id, {
        id: c.id,
        name: c.campusName,
        totalSlots: 0,
        surpriseSlots: 0,
        totalEvals: 0,
        k12Count: 0,
        k12Sum: 0,
        gioiCount: 0,
        khaCount: 0,
        otherCount: 0
      });
    });

    slots.forEach((slot: any) => {
      const hasEvals = slot.registrations?.some(
        (r: any) => r.evaluation && r.evaluation.reEvaluationStatus !== "DRAFT"
      );
      if (!hasEvals) return;

      const inc = slot.isDoublePeriod ? 2 : 1;
      totalObservedSlots += inc;
      const isSurprise = isSurpriseSlot(slot);
      if (isSurprise) surpriseObservedSlots += inc;

      const cStat = campusStatsMap.get(slot.campusId);
      if (cStat) {
        cStat.totalSlots += inc;
        if (isSurprise) cStat.surpriseSlots += inc;
      }

      slot.registrations?.forEach((reg: any) => {
        const ev = reg.evaluation;
        if (!ev || ev.reEvaluationStatus === "DRAFT") return;

        totalEvaluations++;
        if (cStat) cStat.totalEvals++;

        const isMN = slot.level === "Mầm non";
        if (!isMN) {
          totalK12Evaluations++;
          const score = typeof ev.totalScore === "number" ? ev.totalScore : 0;
          k12ScoresSum += score;
          if (cStat) {
            cStat.k12Count++;
            cStat.k12Sum += score;
          }

          const rating = ev.overallRating || "";
          if (rating === "Giỏi" || score >= 18) {
            k12Gioi++;
            if (cStat) cStat.gioiCount++;
          } else if (rating === "Khá" || (score >= 14 && score < 18)) {
            k12Kha++;
            if (cStat) cStat.khaCount++;
          } else if (rating === "Trung bình" || (score >= 10 && score < 14)) {
            k12TB++;
            if (cStat) cStat.otherCount++;
          } else {
            k12KhongDat++;
            if (cStat) cStat.otherCount++;
          }

          // 11 criteria
          if (ev.score1 !== null && ev.score1 !== undefined) {
            k12CriteriaCount++;
            for (let i = 1; i <= 11; i++) {
              const val = typeof ev["score" + i] === "number" ? ev["score" + i] : 0;
              k12CriteriaSums[i - 1] += val;
              if (val < maxScoresK12[i - 1] * 0.7) {
                k12CriteriaLowCounts[i - 1]++;
              }
            }
          }
        } else {
          totalMNEvaluations++;
          const rating = ev.overallRating || "";
          if (rating === "Tốt") {
            mnTot++;
            if (cStat) cStat.gioiCount++;
          } else if (rating === "Khá") {
            mnKha++;
            if (cStat) cStat.khaCount++;
          } else if (rating === "Đạt") {
            mnDat++;
            if (cStat) cStat.otherCount++;
          } else {
            mnChuaDat++;
            if (cStat) cStat.otherCount++;
          }

          // 5 criteria MN
          if (ev.criterion1 !== null && ev.criterion1 !== undefined) {
            mnCriteriaCount++;
            for (let i = 1; i <= 5; i++) {
              const val = typeof ev["criterion" + i] === "number" ? ev["criterion" + i] : 0;
              mnCriteriaSums[i - 1] += val;
              if (val <= 2) {
                mnCriteriaLowCounts[i - 1]++;
              }
            }
          }
        }
      });
    });

    // 11 criteria summary
    const k12CriteriaStats = maxScoresK12.map((max, idx) => {
      const avg = k12CriteriaCount > 0 ? (k12CriteriaSums[idx] / k12CriteriaCount) : 0;
      const pct = Math.round((avg / max) * 100);
      const lowCount = k12CriteriaLowCounts[idx];
      const lowPct = k12CriteriaCount > 0 ? Math.round((lowCount / k12CriteriaCount) * 100) : 0;
      const standardGroup = idx < 2 ? 1 : idx < 5 ? 2 : idx < 9 ? 3 : 4;
      const standardName = standardGroup === 1 ? "1. Kế hoạch & Chuẩn bị dạy học"
        : standardGroup === 2 ? "2. Hoạt động & Nội dung kiến thức"
        : standardGroup === 3 ? "3. Phương pháp & Tổ chức học tập"
        : "4. Kiểm tra đánh giá & Hiệu quả";

      return {
        id: "Y" + (idx + 1),
        name: k12Labels[idx],
        max,
        avg: Number(avg.toFixed(2)),
        pct,
        lowCount,
        lowPct,
        standardGroup,
        standardName
      };
    });

    // Top 3 strengths and Top 3 focus areas
    const sortedByPct = [...k12CriteriaStats].sort((a, b) => b.pct - a.pct);
    const bestPractices = sortedByPct.slice(0, 3);
    const focusAreas = [...k12CriteriaStats].sort((a, b) => a.pct - b.pct).slice(0, 3);

    // QA Recommendations based on focus areas
    const recommendations = focusAreas.map(fa => {
      let advice = "";
      if (fa.id === "Y11") {
        advice = "Tăng cường dự giờ đồng đẳng và tổ chức thao giảng các chuyên đề ứng dụng CNTT, gamification để bài dạy thêm sinh động, sáng tạo.";
      } else if (fa.id === "Y5") {
        advice = "Tổ chức tập huấn tích hợp giáo dục STEM/STEAM và liên hệ thực tế đời sống vào kế hoạch bài dạy theo chương trình GDPT 2018.";
      } else if (fa.id === "Y9") {
        advice = "Đẩy mạnh các phương pháp dạy học kích thích tư duy phản biện (Socratic questioning, bản đồ tư duy, tranh biện nhóm).";
      } else if (fa.id === "Y7") {
        advice = "Rèn luyện kỹ năng quản lý lớp học và kỹ thuật chia nhóm học tập cộng tác thực chất, tránh hình thức đọc chép.";
      } else if (fa.id === "Y10") {
        advice = "Tập huấn sâu về đánh giá thường xuyên (formative assessment), kỹ thuật đặt câu hỏi phân hóa học sinh theo Thông tư 22/27.";
      } else if (fa.id === "Y8") {
        advice = "Rà soát cấu trúc phân phối thời gian bài giảng, dành tối thiểu 50% thời lượng cho học sinh thực hành và làm việc.";
      } else {
        advice = "Đưa tiêu chí này vào nội dung trọng tâm sinh hoạt chuyên môn định kỳ và kiểm tra chéo giữa các tổ bộ môn.";
      }
      return { ...fa, advice };
    });

    // Campus list
    const campusList = Array.from(campusStatsMap.values()).filter(c => c.totalSlots > 0 || c.totalEvals > 0);

    // K12 rates
    const k12AvgScore = totalK12Evaluations > 0 ? (k12ScoresSum / totalK12Evaluations).toFixed(2) : "0.00";
    const k12PassRate = totalK12Evaluations > 0 ? Math.round(((k12Gioi + k12Kha) / totalK12Evaluations) * 100) : 0;
    const mnPassRate = totalMNEvaluations > 0 ? Math.round(((mnTot + mnKha + mnDat) / totalMNEvaluations) * 100) : 0;
    const surpriseRate = totalObservedSlots > 0 ? Math.round((surpriseObservedSlots / totalObservedSlots) * 100) : 0;

    return {
      totalObservedSlots,
      surpriseObservedSlots,
      surpriseRate,
      totalEvaluations,
      totalK12Evaluations,
      totalMNEvaluations,
      k12: {
        gioi: k12Gioi,
        kha: k12Kha,
        tb: k12TB,
        khongDat: k12KhongDat,
        gioiPct: totalK12Evaluations > 0 ? Math.round((k12Gioi / totalK12Evaluations) * 100) : 0,
        khaPct: totalK12Evaluations > 0 ? Math.round((k12Kha / totalK12Evaluations) * 100) : 0,
        tbPct: totalK12Evaluations > 0 ? Math.round((k12TB / totalK12Evaluations) * 100) : 0,
        khongDatPct: totalK12Evaluations > 0 ? Math.round((k12KhongDat / totalK12Evaluations) * 100) : 0,
        avgScore: k12AvgScore,
        passRate: k12PassRate
      },
      mn: {
        tot: mnTot,
        kha: mnKha,
        dat: mnDat,
        chuaDat: mnChuaDat,
        totPct: totalMNEvaluations > 0 ? Math.round((mnTot / totalMNEvaluations) * 100) : 0,
        khaPct: totalMNEvaluations > 0 ? Math.round((mnKha / totalMNEvaluations) * 100) : 0,
        datPct: totalMNEvaluations > 0 ? Math.round((mnDat / totalMNEvaluations) * 100) : 0,
        chuaDatPct: totalMNEvaluations > 0 ? Math.round((mnChuaDat / totalMNEvaluations) * 100) : 0,
        passRate: mnPassRate
      },
      k12CriteriaStats,
      bestPractices,
      focusAreas,
      recommendations,
      campusList
    };
  }, [initialSlots, campuses, maxScoresK12, k12Labels, qaMonthFilter, qaCampusFilter, qaBlockFilter]);

  const teacherAvgScore = useMemo(() => {
    if (teacherEvaluations.length === 0) return null;
    if (isPreschoolTeacher) return null;
    const scores = teacherEvaluations
      .map(e => e.evaluation?.totalScore)
      .filter(s => s !== null && s !== undefined && typeof s === "number");
    if (scores.length === 0) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
  }, [teacherEvaluations, isPreschoolTeacher]);



  // Full-width view for Kho Tiết Dạy Tiêu Biểu & Bài Giảng Mẫu
  const renderExemplaryLessons = () => {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* Header & Bộ lọc Kho Học Liệu */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1">
                <BookMarked className="w-3 h-3 text-amber-600" />
                Kho Học Liệu Số & Bài Giảng Xuất Sắc
              </span>
              <span className="text-xs font-semibold text-slate-500">• Hệ sinh thái Chuyên môn Số</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
              Kho Tiết Dạy Tiêu Biểu & Bài Giảng Mẫu Sky-Line
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Tuyển tập các tiết dạy xếp loại Giỏi (từ 18.5 đến 20đ) kèm kế hoạch bài dạy và điểm sáng sư phạm để tham khảo
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Tìm kiếm */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên bài, giáo viên, môn học..."
                value={exemplarySearchQuery}
                onChange={(e) => setExemplarySearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none w-52 sm:w-64"
              />
            </div>

            {/* Lọc Môn */}
            <select
              value={exemplarySubjectFilter}
              onChange={(e) => setExemplarySubjectFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">Tất cả môn</option>
              {distinctSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>

            {/* Lọc Khối */}
            <select
              value={exemplaryGradeFilter}
              onChange={(e) => setExemplaryGradeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">Tất cả khối</option>
              {distinctGrades.map(gr => (
                <option key={gr} value={gr}>{gr}</option>
              ))}
            </select>

            {/* Lọc Cơ sở */}
            <select
              value={exemplaryCampusFilter}
              onChange={(e) => setExemplaryCampusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">Tất cả cơ sở</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.campusName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 Thẻ Chỉ Số Kho Tiết Dạy Tiêu Biểu */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Tiết dạy xuất sắc đã tuyển chọn
              </div>
              <div className="text-2xl font-black text-amber-900 mt-1">
                {exemplaryLessons.length} <span className="text-xs font-normal text-slate-500">tiết dạy</span>
              </div>
              <div className="text-[10.5px] text-slate-500 mt-0.5">
                Đạt loại Giỏi & Tốt từ các đợt dự giờ
              </div>
            </div>
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Môn học có bài giảng mẫu
              </div>
              <div className="text-2xl font-black text-teal-900 mt-1">
                {distinctSubjects.length} <span className="text-xs font-normal text-slate-500">môn học</span>
              </div>
              <div className="text-[10.5px] text-slate-500 mt-0.5">
                Trải rộng từ Mầm non đến K-12
              </div>
            </div>
            <div className="p-3 bg-teal-50 text-teal-700 rounded-xl border border-teal-200">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Chia sẻ chuyên môn liên cơ sở
              </div>
              <div className="text-2xl font-black text-indigo-900 mt-1">
                {campuses.length} <span className="text-xs font-normal text-slate-500">cơ sở</span>
              </div>
              <div className="text-[10.5px] text-slate-500 mt-0.5">
                Giao lưu học tập kinh nghiệm toàn trường
              </div>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Danh sách Tiết dạy Tiêu biểu (Grid Cards) */}
        {exemplaryLessons.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
            <BookMarked className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700 uppercase">Không tìm thấy tiết dạy tiêu biểu nào phù hợp</p>
            <p className="text-[11px] text-slate-500">Hãy thử thay đổi điều kiện tìm kiếm hoặc bộ lọc môn học/cơ sở.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exemplaryLessons.map((item, idx) => {
              const s = item.slot;
              const dateStr = s.date ? new Date(s.date).toLocaleDateString("vi-VN") : "";
              const scoreDisplay = item.totalScore !== null && item.totalScore !== undefined
                ? `${item.totalScore}đ`
                : item.overallRating;

              return (
                <div
                  key={s.id || idx}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400/80 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group"
                >
                  {/* Card Header */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold">
                        {s.subjectName} • {s.grade}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10.5px] font-black flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                        {scoreDisplay} ({item.overallRating})
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 line-clamp-2 group-hover:text-amber-900 transition-colors">
                      {s.topic}
                    </h3>

                    {/* Teacher info */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs text-slate-600">
                      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-[11px] shrink-0">
                        {item.teacherName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{item.teacherName}</p>
                        <p className="text-[10.5px] text-slate-500 truncate">{s.campusName || "Cơ sở Sky-Line"} &bull; {dateStr}</p>
                      </div>
                    </div>
                  </div>

                  {/* Highlights from real evaluations */}
                  {item.strengths && (
                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/70 text-[11px] text-slate-700 space-y-1">
                      <div className="font-bold text-amber-900 flex items-center gap-1 text-[10px] uppercase tracking-wider">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        Điểm sáng sư phạm nổi bật:
                      </div>
                      <p className="line-clamp-3 italic text-slate-600">
                        "{item.strengths}"
                      </p>
                    </div>
                  )}

                  {/* Card Footer: Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {s.className || "Lớp chuẩn"} • {s.room || "Phòng học"}
                    </span>
                    {item.lessonPlanName ? (
                      <span className="px-2 py-1 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[10.5px] font-semibold">
                        Có giáo án đính kèm
                      </span>
                    ) : (
                      <span className="text-[10.5px] text-slate-500 font-medium">
                        Bài giảng mẫu
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Full-width view for Dashboard Báo cáo ĐBCL & Phân tích Chuyên môn
  const renderQADashboard = () => {
    const activeYearObj = academicYears?.find((y: any) => y.id === filterAcademicYearId) || academicYears?.[0];
    const yearName = activeYearObj?.name || "Năm học 2025 - 2026";
    const periodText = qaMonthFilter === "all" ? "Toàn bộ năm học" : `Tháng ${qaMonthFilter.split("-")[1]}/${qaMonthFilter.split("-")[0]}`;

    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* 1. Header Báo cáo ĐBCL & Bộ lọc linh hoạt */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Báo cáo ĐBCL & Khảo thí
              </span>
              <span className="text-xs font-semibold text-slate-500">• {yearName}</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
              Báo cáo Đảm bảo Chất lượng & Năng lực Giảng dạy
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Phổ điểm xếp loại, kiểm định 11 tiêu chí K-12, phát hiện điểm nghẽn & giải pháp bồi dưỡng sư phạm
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bộ lọc Tháng */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={qaMonthFilter}
                onChange={(e) => setQaMonthFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer text-xs"
              >
                <option value="all">Tất cả các tháng</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>Tháng {m.split("-")[1]}/{m.split("-")[0]}</option>
                ))}
              </select>
            </div>

            {/* Bộ lọc Khối */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
              <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={qaBlockFilter}
                onChange={(e) => setQaBlockFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer text-xs"
              >
                <option value="all">Tất cả các khối</option>
                <option value="k12">Khối Phổ thông K-12</option>
                <option value="mam-non">Khối Mầm non</option>
              </select>
            </div>

            {/* Bộ lọc Cơ sở */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={qaCampusFilter}
                onChange={(e) => setQaCampusFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer text-xs"
              >
                <option value="all">Tất cả các cơ sở</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.campusName}</option>
                ))}
              </select>
            </div>

            {/* Nút In Báo cáo */}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs shadow-2xs transition-all cursor-pointer"
              title="In báo cáo ĐBCL hoặc xuất file PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>In Báo Cáo</span>
            </button>
          </div>
        </div>

        {/* 2. 4 Thẻ KPI ĐBCL Trọng Yếu */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Phiếu đánh giá</span>
              <Award className="w-4 h-4 text-teal-600 stroke-2" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {qaAnalytics.totalEvaluations} <span className="text-xs font-normal text-slate-500">phiếu</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Từ {qaAnalytics.totalObservedSlots} tiết dự giờ thực tế
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Tỷ lệ Đạt chuẩn ĐBCL</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-2" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {qaAnalytics.k12.passRate}% <span className="text-xs font-normal text-slate-500">xếp Giỏi & Khá</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {qaAnalytics.k12.gioi} tiết Giỏi • {qaAnalytics.k12.kha} tiết Khá
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Điểm TB Hệ Thống (K-12)</span>
              <TrendingUp className="w-4 h-4 text-indigo-600 stroke-2" />
            </div>
            <div className="text-2xl font-bold text-indigo-700 mt-1">
              {qaAnalytics.k12.avgScore} <span className="text-xs font-normal text-slate-500">/ 20 điểm</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Đánh giá qua thang điểm 11 tiêu chí
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Tỷ lệ Dự giờ Đột xuất</span>
              <Sparkles className="w-4 h-4 text-amber-500 stroke-2" />
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {qaAnalytics.surpriseRate}% <span className="text-xs font-normal text-slate-500">kiểm định đột xuất</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {qaAnalytics.surpriseObservedSlots} tiết đánh giá thực tế không báo trước
            </div>
          </div>
        </div>

        {/* 3. Phổ Điểm Xếp Loại & Cơ Cấu Theo Cơ Sở */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Phổ điểm K12 & MN */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-700" />
                <span>Phổ điểm & Cơ cấu Xếp loại Toàn hệ thống</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">{periodText}</span>
            </div>

            {/* Thanh tỷ lệ phổ điểm K-12 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Khối Phổ thông K-12 ({qaAnalytics.totalK12Evaluations} phiếu)</span>
                <span className="text-teal-700">ĐTB: {qaAnalytics.k12.avgScore}/20đ</span>
              </div>
              <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div style={{ width: `${qaAnalytics.k12.gioiPct}%` }} className="bg-teal-600 h-full transition-all" title={`Giỏi: ${qaAnalytics.k12.gioi} (${qaAnalytics.k12.gioiPct}%)`} />
                <div style={{ width: `${qaAnalytics.k12.khaPct}%` }} className="bg-emerald-500 h-full transition-all" title={`Khá: ${qaAnalytics.k12.kha} (${qaAnalytics.k12.khaPct}%)`} />
                <div style={{ width: `${qaAnalytics.k12.tbPct}%` }} className="bg-amber-400 h-full transition-all" title={`Trung bình: ${qaAnalytics.k12.tb} (${qaAnalytics.k12.tbPct}%)`} />
                <div style={{ width: `${qaAnalytics.k12.khongDatPct}%` }} className="bg-rose-500 h-full transition-all" title={`Chưa đạt: ${qaAnalytics.k12.khongDat} (${qaAnalytics.k12.khongDatPct}%)`} />
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1">
                <div className="p-2 bg-teal-50/60 border border-teal-100 rounded-lg text-center">
                  <div className="text-[10px] text-teal-800 font-bold">Giỏi (≥18đ)</div>
                  <div className="text-base font-black text-teal-900 mt-0.5">{qaAnalytics.k12.gioi}</div>
                  <div className="text-[10px] text-teal-700 font-semibold">{qaAnalytics.k12.gioiPct}%</div>
                </div>
                <div className="p-2 bg-emerald-50/60 border border-emerald-100 rounded-lg text-center">
                  <div className="text-[10px] text-emerald-800 font-bold">Khá (14-17.5đ)</div>
                  <div className="text-base font-black text-emerald-900 mt-0.5">{qaAnalytics.k12.kha}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold">{qaAnalytics.k12.khaPct}%</div>
                </div>
                <div className="p-2 bg-amber-50/60 border border-amber-100 rounded-lg text-center">
                  <div className="text-[10px] text-amber-800 font-bold">TB (10-13.5đ)</div>
                  <div className="text-base font-black text-amber-900 mt-0.5">{qaAnalytics.k12.tb}</div>
                  <div className="text-[10px] text-amber-700 font-semibold">{qaAnalytics.k12.tbPct}%</div>
                </div>
                <div className="p-2 bg-rose-50/60 border border-rose-100 rounded-lg text-center">
                  <div className="text-[10px] text-rose-800 font-bold">Dưới chuẩn (&lt;10đ)</div>
                  <div className="text-base font-black text-rose-900 mt-0.5">{qaAnalytics.k12.khongDat}</div>
                  <div className="text-[10px] text-rose-700 font-semibold">{qaAnalytics.k12.khongDatPct}%</div>
                </div>
              </div>
            </div>

            {/* Mầm non */}
            {qaAnalytics.totalMNEvaluations > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Khối Mầm non ({qaAnalytics.totalMNEvaluations} phiếu)</span>
                  <span className="text-indigo-600">Đạt chuẩn: {qaAnalytics.mn.passRate}%</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 bg-indigo-50/60 border border-indigo-100 rounded-lg text-center">
                    <div className="text-[10px] text-indigo-800 font-bold">Tốt</div>
                    <div className="text-base font-black text-indigo-900 mt-0.5">{qaAnalytics.mn.tot}</div>
                    <div className="text-[10px] text-indigo-700 font-semibold">{qaAnalytics.mn.totPct}%</div>
                  </div>
                  <div className="p-2 bg-sky-50/60 border border-sky-100 rounded-lg text-center">
                    <div className="text-[10px] text-sky-800 font-bold">Khá</div>
                    <div className="text-base font-black text-sky-900 mt-0.5">{qaAnalytics.mn.kha}</div>
                    <div className="text-[10px] text-sky-700 font-semibold">{qaAnalytics.mn.khaPct}%</div>
                  </div>
                  <div className="p-2 bg-amber-50/60 border border-amber-100 rounded-lg text-center">
                    <div className="text-[10px] text-amber-800 font-bold">Đạt</div>
                    <div className="text-base font-black text-amber-900 mt-0.5">{qaAnalytics.mn.dat}</div>
                    <div className="text-[10px] text-amber-700 font-semibold">{qaAnalytics.mn.datPct}%</div>
                  </div>
                  <div className="p-2 bg-rose-50/60 border border-rose-100 rounded-lg text-center">
                    <div className="text-[10px] text-rose-800 font-bold">Chưa đạt</div>
                    <div className="text-base font-black text-rose-900 mt-0.5">{qaAnalytics.mn.chuaDat}</div>
                    <div className="text-[10px] text-rose-700 font-semibold">{qaAnalytics.mn.chuaDatPct}%</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Phân bổ theo từng Cơ sở */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Chất lượng Giảng dạy Theo Từng Cơ Sở</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">{qaAnalytics.campusList.length} cơ sở</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <th className="py-2 pr-2">Cơ sở</th>
                    <th className="py-2 px-2 text-center">Số tiết</th>
                    <th className="py-2 px-2 text-center">Đột xuất</th>
                    <th className="py-2 px-2 text-center">ĐTB K-12</th>
                    <th className="py-2 px-2 text-center">Tỷ lệ Giỏi</th>
                    <th className="py-2 pl-2 text-right">Đạt chuẩn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {qaAnalytics.campusList.map(c => {
                    const cAvg = c.k12Count > 0 ? (c.k12Sum / c.k12Count).toFixed(2) : "-";
                    const cGioiPct = c.totalEvals > 0 ? Math.round((c.gioiCount / c.totalEvals) * 100) : 0;
                    const cPassPct = c.totalEvals > 0 ? Math.round(((c.gioiCount + c.khaCount) / c.totalEvals) * 100) : 0;
                    const cSurprisePct = c.totalSlots > 0 ? Math.round((c.surpriseSlots / c.totalSlots) * 100) : 0;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 pr-2 font-bold text-slate-800">{c.name}</td>
                        <td className="py-2.5 px-2 text-center font-semibold text-slate-700">{c.totalSlots}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {c.surpriseSlots} ({cSurprisePct}%)
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-indigo-700">{cAvg}đ</td>
                        <td className="py-2.5 px-2 text-center font-bold text-teal-700">{cGioiPct}%</td>
                        <td className="py-2.5 pl-2 text-right font-black text-emerald-600">{cPassPct}%</td>
                      </tr>
                    );
                  })}
                  {qaAnalytics.campusList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">Chưa có dữ liệu dự giờ theo cơ sở</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 4. Đối sánh Chuyên Môn: Top 3 Thế Mạnh & Top 3 Điểm Nghẽn */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Top 3 Thế Mạnh */}
          <div className="bg-gradient-to-br from-teal-50/60 to-white rounded-2xl border border-teal-200 shadow-2xs p-5 space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-teal-100">
              <div className="p-2 bg-teal-600 text-white rounded-xl shadow-xs">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-teal-950">Top 3 Thế Mạnh Nổi Bật (Best Practices)</h4>
                <p className="text-[11px] text-teal-800 font-medium">Các tiêu chuẩn sư phạm đạt kết quả cao nhất toàn trường</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {qaAnalytics.bestPractices.map((bp, idx) => (
                <div key={bp.id} className="p-3 bg-white/90 rounded-xl border border-teal-100 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-900 font-black text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {bp.id}: {bp.name.split(":")[1] || bp.name}
                    </span>
                    <span className="font-black text-teal-700 text-xs">
                      {bp.avg}/{bp.max}đ ({bp.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-600 rounded-full" style={{ width: `${bp.pct}%` }} />
                  </div>
                  <p className="text-[10.5px] text-slate-500 font-medium italic">
                    Chuẩn: {bp.standardName} • Tỷ lệ trừ điểm thấp: {bp.lowPct}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Top 3 Điểm Nghẽn & Khuyến Nghị */}
          <div className="bg-gradient-to-br from-amber-50/60 to-white rounded-2xl border border-amber-200 shadow-2xs p-5 space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-amber-100">
              <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-amber-950">Top 3 Trọng Tâm Bồi Dưỡng (Key Focus Areas)</h4>
                <p className="text-[11px] text-amber-800 font-medium">Tiêu chí có tỷ lệ bị trừ điểm nhiều nhất & Khuyến nghị ĐBCL</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {qaAnalytics.recommendations.map((fa, idx) => (
                <div key={fa.id} className="p-3 bg-white/90 rounded-xl border border-amber-100 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {fa.id}: {fa.name.split(":")[1] || fa.name}
                    </span>
                    <span className="font-black text-amber-700 text-xs">
                      {fa.avg}/{fa.max}đ ({fa.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${fa.pct}%` }} />
                  </div>
                  <div className="p-2 bg-amber-50/50 rounded-lg border border-amber-200/50 text-[11px] text-slate-700 font-medium">
                    <span className="font-bold text-amber-900">Khuyến nghị: </span>
                    {fa.advice}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Bảng Chi Tiết 11 Tiêu Chí K-12 Toàn Hệ Thống */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-teal-700" />
                <span>Kiểm Định Chi Tiết 11 Tiêu Chí Sư Phạm K-12 (Bộ GD&ĐT)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Đánh giá toàn diện 4 tiêu chuẩn sư phạm cốt lõi qua {qaAnalytics.totalK12Evaluations} lượt đánh giá thực tế
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
              Thang điểm 20.0
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600 bg-slate-50/50">
                  <th className="py-2.5 px-3">Mã</th>
                  <th className="py-2.5 px-3">Nội dung tiêu chí kiểm định</th>
                  <th className="py-2.5 px-3">Chuẩn sư phạm</th>
                  <th className="py-2.5 px-3 text-center">Tối đa</th>
                  <th className="py-2.5 px-3 text-center">Điểm TB</th>
                  <th className="py-2.5 px-3 text-center">Tỷ lệ đạt (%)</th>
                  <th className="py-2.5 px-3 text-center">Tiết bị trừ điểm</th>
                  <th className="py-2.5 px-3 text-right">Đánh giá ĐBCL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {qaAnalytics.k12CriteriaStats.map(c => {
                  const isTop = c.pct >= 96;
                  const isWeak = c.pct < 93;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-black text-teal-800">{c.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-xs">
                        {c.name.split(":")[1] || c.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-medium text-[11px]">{c.standardName}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600">{c.max}đ</td>
                      <td className="py-2.5 px-3 text-center font-black text-slate-900">{c.avg}đ</td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isTop ? "bg-teal-600" : isWeak ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${c.pct}%` }}
                            />
                          </div>
                          <span className="font-bold text-xs">{c.pct}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.lowCount > 0 ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-slate-100 text-slate-600"}`}>
                          {c.lowCount} ({c.lowPct}%)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isTop ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            Xuất sắc
                          </span>
                        ) : isWeak ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Cần bồi dưỡng
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Đạt chuẩn
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. Bảng Ma Trận Hiệu Suất Tiến Độ KPI & Chất Lượng Của Các Tổ Chuyên Môn */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-600" />
                <span>Tiến Độ Thực Hiện KPI & Chất Lượng Giảng Dạy Theo Tổ Chuyên Môn</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Đối chiếu chỉ tiêu tiết dạy, tiết dự và tỷ lệ đạt chuẩn của {allDepartmentsSummary.length} tổ bộ môn
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003B3A] text-white font-semibold text-xs hover:bg-[#002B2A] transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-300" />
              <span>Xuất Báo Cáo Excel</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600 bg-slate-50/50">
                  <th className="py-2.5 px-3">STT</th>
                  <th className="py-2.5 px-3">Tổ Chuyên Môn</th>
                  <th className="py-2.5 px-3">Tổ trưởng CM (TTCM)</th>
                  <th className="py-2.5 px-3 text-center">Số GV</th>
                  <th className="py-2.5 px-3 text-center">Tổng tiết dạy</th>
                  <th className="py-2.5 px-3 text-center">Dạy đột xuất</th>
                  <th className="py-2.5 px-3 text-center">Tổng tiết dự</th>
                  <th className="py-2.5 px-3 text-center">Số phiếu ĐG</th>
                  <th className="py-2.5 px-3 text-right">Tỷ lệ Đạt chuẩn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allDepartmentsSummary.map((d: any, idx: number) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{d.name}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {d.ttcm?.teacherName || <span className="text-slate-400 italic">Chưa phân công</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{d.teacherCount}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-teal-800">{d.totalTaught}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {d.taughtSurprise}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-indigo-700">{d.totalObserved}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{d.totalEvals}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                      {d.totalEvals > 0 ? `${d.passRate}%` : <span className="text-slate-400 font-normal">Chưa có</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Full-width view for Bảng Ma trận dự giờ TTCM theo tháng
  const renderTTCMMatrix = () => {
    const activeMonth = ttcmMatrixMonth !== "all" ? ttcmMatrixMonth : selectedMonth;
    const activeMonthText = activeMonth === "all" ? "Toàn bộ năm học" : `Tháng ${activeMonth.split("-")[1]}/${activeMonth.split("-")[0]}`;

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        {/* 1. Header Quản Trị & Thanh Công Cụ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[10.5px] font-bold uppercase tracking-wider">
                Báo cáo quản trị
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {filteredTTCMMatrix.length} Tổ trưởng chuyên môn
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-1">
              MA TRẬN DỰ GIỜ TỔ TRƯỞNG CHUYÊN MÔN
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kỳ báo cáo: <span className="font-semibold text-slate-700">{activeMonthText}</span> &bull; Thống kê đối chiếu số tiết dự giờ nội bộ và liên cơ sở
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Chế độ xem */}
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTtcmViewMode("pivot-matrix")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${ttcmViewMode === "pivot-matrix"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
              >
                Ma trận 2 chiều (Pivot)
              </button>
              <button
                type="button"
                onClick={() => setTtcmViewMode("detailed-list")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${ttcmViewMode === "detailed-list"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
              >
                Danh sách chi tiết
              </button>
            </div>

            {/* Nút Xuất Excel */}
            <button
              type="button"
              onClick={handleExportTTCMExcel}
              className="px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002B2A] text-white font-semibold text-xs shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-300" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* 2. Thẻ KPI Quản Trị (5 Cards tinh gọn) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Tổng số TTCM
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {ttcmMatrixKPIs.totalTTCM}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {ttcmMatrixBlock === "all" ? "Tất cả các khối" : ttcmMatrixBlock}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Tổng tiết đã dự
            </div>
            <div className="text-2xl font-bold text-teal-800 mt-1">
              {ttcmMatrixKPIs.totalObserved} <span className="text-xs font-normal text-slate-500">tiết</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {ttcmMatrixKPIs.totalSurprise > 0 ? `${ttcmMatrixKPIs.totalSurprise} tiết đột xuất` : "100% theo kế hoạch"}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Dự nội bộ cơ sở
            </div>
            <div className="text-2xl font-bold text-emerald-800 mt-1">
              {ttcmMatrixKPIs.totalInternal} <span className="text-xs font-normal text-slate-500">tiết</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">
              {ttcmMatrixKPIs.totalObserved > 0 ? `${Math.round((ttcmMatrixKPIs.totalInternal / ttcmMatrixKPIs.totalObserved) * 100)}% tổng số tiết` : "0%"}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Dự chéo liên cơ sở
            </div>
            <div className="text-2xl font-bold text-sky-800 mt-1">
              {ttcmMatrixKPIs.totalCross} <span className="text-xs font-normal text-slate-500">tiết</span>
            </div>
            <div className="text-[11px] text-sky-700 font-medium mt-1">
              {ttcmMatrixKPIs.totalObserved > 0 ? `${Math.round((ttcmMatrixKPIs.totalCross / ttcmMatrixKPIs.totalObserved) * 100)}% tổng số tiết` : "0%"}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Đạt chỉ tiêu dự giờ
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {ttcmMatrixKPIs.targetMetCount}/{ttcmMatrixKPIs.totalTTCM}
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-1">
              Tỷ lệ hoàn thành: <span className="font-bold text-slate-900">{ttcmMatrixKPIs.metRate}%</span>
            </div>
          </div>
        </div>

        {/* 3. Thanh Bộ Lọc Quản Trị (Filter Toolbar) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3 flex flex-wrap items-center gap-2.5">
          {/* Lọc Tháng */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-[11px] font-semibold text-slate-500">Tháng:</span>
            <select
              value={ttcmMatrixMonth}
              onChange={(e) => setTtcmMatrixMonth(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer text-xs"
            >
              <option value="all">Toàn bộ năm học</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  Tháng {m.split("-")[1]}/{m.split("-")[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Khối */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-[11px] font-semibold text-slate-500">Khối:</span>
            <select
              value={ttcmMatrixBlock}
              onChange={(e) => setTtcmMatrixBlock(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer text-xs"
            >
              <option value="all">Tất cả khối</option>
              <option value="Phổ thông K-12">Phổ thông K-12</option>
              <option value="Mầm non">Mầm non</option>
              <option value="Điều hành">Điều hành</option>
            </select>
          </div>

          {/* Lọc Cơ sở công tác */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-[11px] font-semibold text-slate-500">Cơ sở TTCM:</span>
            <select
              value={ttcmMatrixCampus}
              onChange={(e) => setTtcmMatrixCampus(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer text-xs max-w-[140px] truncate"
            >
              <option value="all">Tất cả cơ sở</option>
              {campuses.map(c => (
                <option key={c.id} value={c.campusName}>
                  {c.campusName}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Cơ sở dự giờ */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-[11px] font-semibold text-slate-500">Cơ sở dự giờ:</span>
            <select
              value={ttcmMatrixObservedCampus}
              onChange={(e) => setTtcmMatrixObservedCampus(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer text-xs max-w-[140px] truncate"
            >
              <option value="all">Tất cả cơ sở</option>
              {distinctObservedCampusNames.map(cn => (
                <option key={cn} value={cn}>
                  {cn}
                </option>
              ))}
            </select>
          </div>

          {/* Ô Tìm kiếm */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={ttcmSearchQuery}
              onChange={(e) => setTtcmSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, mã giáo viên, tổ CM..."
              className="bg-transparent font-medium text-slate-800 outline-none text-xs w-full"
            />
            {ttcmSearchQuery && (
              <button
                type="button"
                onClick={() => setTtcmSearchQuery("")}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Nút Xóa Lọc */}
          {(ttcmMatrixMonth !== "all" || ttcmMatrixBlock !== "all" || ttcmMatrixCampus !== "all" || ttcmMatrixObservedCampus !== "all" || ttcmSearchQuery) && (
            <button
              type="button"
              onClick={() => {
                setTtcmMatrixMonth("all");
                setTtcmMatrixBlock("all");
                setTtcmMatrixCampus("all");
                setTtcmMatrixObservedCampus("all");
                setTtcmSearchQuery("");
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-all shrink-0 cursor-pointer"
            >
              Xóa lọc
            </button>
          )}
        </div>

        {/* 4. Table Views */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {filteredTTCMMatrix.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="text-sm font-semibold text-slate-700">Không tìm thấy dữ liệu phù hợp với bộ lọc</p>
              <p className="text-xs text-slate-400 mt-1">Vui lòng thay đổi tháng, khối hoặc cơ sở đang lọc</p>
            </div>
          ) : ttcmViewMode === "pivot-matrix" ? (
            /* VIEW 1: BẢNG MA TRẬN 2 CHIỀU (PIVOT GRID - CHUẨN QUẢN TRỊ, KHÔNG ICON DỮ LIỆU) */
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-700 tracking-wider">
                    <th className="py-3 px-3 text-center w-12 border-r border-slate-200">STT</th>
                    <th className="py-3 px-3 min-w-[170px] max-w-[210px] border-r border-slate-200">Họ và Tên TTCM</th>
                    <th className="py-3 px-2 text-center w-20 border-r border-slate-200">Chức vụ</th>
                    <th className="py-3 px-3 min-w-[130px] border-r border-slate-200">Tổ chuyên môn</th>
                    <th className="py-3 px-3 min-w-[120px] border-r border-slate-200">Cơ sở công tác</th>
                    {distinctObservedCampusNames.map(cn => (
                      <th key={cn} className="py-3 px-2 text-center min-w-[85px] border-r border-slate-200 bg-slate-100/70 text-slate-800 font-bold">
                        {cn}
                      </th>
                    ))}
                    <th className="py-3 px-2 text-center w-24 border-r border-slate-200 bg-teal-50/60 text-teal-900 font-bold">
                      Tổng dự
                    </th>
                    <th className="py-3 px-2 text-center w-28 border-r border-slate-200">Chỉ tiêu</th>
                    <th className="py-3 px-2 text-center w-28 border-r border-slate-200">Đánh giá</th>
                    <th className="py-3 px-2 text-center w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTTCMMatrix.map((item, idx) => {
                    const campusPeriodsMap = new Map(item.breakdown.map(b => [b.campusName, b.periods]));
                    const campusSurpriseMap = new Map(item.breakdown.map(b => [b.campusName, b.surprisePeriods]));
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-500 font-medium border-r border-slate-100">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-100">
                          <div className="font-semibold text-slate-900 text-xs">{item.teacherName}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.teacherCode}</div>
                        </td>
                        <td className="py-2.5 px-2 text-center border-r border-slate-100">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {item.position}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 text-xs font-medium border-r border-slate-100">
                          {item.deptName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 text-xs font-medium border-r border-slate-100">
                          {item.homeCampus}
                        </td>

                        {/* Các cột cơ sở dự giờ */}
                        {distinctObservedCampusNames.map(cn => {
                          const count = campusPeriodsMap.get(cn) || 0;
                          const surprise = campusSurpriseMap.get(cn) || 0;
                          const isHome = cn === item.homeCampus;
                          return (
                            <td
                              key={cn}
                              className={`py-2 px-2 text-center border-r border-slate-100 ${isHome ? "bg-emerald-50/25" : ""
                                }`}
                            >
                              {count > 0 ? (
                                <div>
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${isHome
                                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                      : "bg-sky-50 text-sky-800 border border-sky-200"
                                    }`}>
                                    {count} tiết
                                  </span>
                                  {surprise > 0 && (
                                    <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                                      ({surprise} đột xuất)
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Tổng đã dự */}
                        <td className="py-2.5 px-2 text-center font-bold text-slate-900 border-r border-slate-100 bg-teal-50/20">
                          {item.totalObserved} tiết
                        </td>

                        {/* Chỉ tiêu */}
                        <td className="py-2.5 px-2 text-center border-r border-slate-100 text-slate-700">
                          <div className="font-semibold text-xs">
                            {item.reqObserved} tiết/{item.observedUnit}
                          </div>
                          {item.observerType && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {item.observerType}
                            </div>
                          )}
                        </td>

                        {/* Đánh giá */}
                        <td className="py-2.5 px-2 text-center border-r border-slate-100">
                          {item.isTargetMet ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Đạt chỉ tiêu
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              Chưa đạt ({item.progressPct}%)
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                handleSwitchMainTab("tong-hop");
                                setSelectedTeacherId(item.id);
                                setActiveDetailTab("lich-su-du");
                              }}
                              className="text-teal-700 hover:text-teal-900 hover:underline text-xs font-semibold cursor-pointer"
                            >
                              Xem dự
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => openTargetConfig(item.ttcm)}
                              className="text-slate-500 hover:text-slate-800 hover:underline text-xs font-medium cursor-pointer"
                            >
                              Chỉ tiêu
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300 text-slate-800">
                  <tr>
                    <td colSpan={5} className="py-3 px-3 uppercase text-slate-700 border-r border-slate-200">
                      Tổng cộng từng cơ sở ({filteredTTCMMatrix.length} TTCM)
                    </td>
                    {distinctObservedCampusNames.map(cn => {
                      const campusTotal = filteredTTCMMatrix.reduce((sum, item) => {
                        const campusPeriodsMap = new Map(item.breakdown.map(b => [b.campusName, b.periods]));
                        return sum + (campusPeriodsMap.get(cn) || 0);
                      }, 0);
                      return (
                        <td key={cn} className="py-3 px-2 text-center font-bold text-slate-900 border-r border-slate-200 bg-slate-200/50">
                          {campusTotal} tiết
                        </td>
                      );
                    })}
                    <td className="py-3 px-2 text-center font-bold text-teal-900 border-r border-slate-200 bg-teal-100/50">
                      {ttcmMatrixKPIs.totalObserved} tiết
                    </td>
                    <td className="py-3 px-2 text-center border-r border-slate-200 text-slate-500">
                      -
                    </td>
                    <td className="py-3 px-2 text-center text-emerald-800 border-r border-slate-200">
                      {ttcmMatrixKPIs.targetMetCount}/{ttcmMatrixKPIs.totalTTCM} Đạt ({ttcmMatrixKPIs.metRate}%)
                    </td>
                    <td className="py-3 px-2 text-center text-slate-400">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            /* VIEW 2: BẢNG DANH SÁCH CHI TIẾT (CHUẨN QUẢN TRỊ, KHÔNG ICON DỮ LIỆU) */
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-700 tracking-wider">
                    <th className="py-3 px-3 text-center w-12 border-r border-slate-200">STT</th>
                    <th className="py-3 px-3 min-w-[170px] max-w-[210px] border-r border-slate-200">Họ và Tên TTCM</th>
                    <th className="py-3 px-2 text-center w-20 border-r border-slate-200">Chức vụ</th>
                    <th className="py-3 px-3 min-w-[130px] border-r border-slate-200">Tổ chuyên môn</th>
                    <th className="py-3 px-3 min-w-[120px] border-r border-slate-200">Cơ sở công tác</th>
                    <th className="py-3 px-3 min-w-[140px] border-r border-slate-200">Cơ sở dự giờ</th>
                    <th className="py-3 px-2 text-center w-24 border-r border-slate-200">Phân loại</th>
                    <th className="py-3 px-2 text-center w-24 border-r border-slate-200">Số tiết</th>
                    <th className="py-3 px-2 text-center w-28 border-r border-slate-200">Chỉ tiêu</th>
                    <th className="py-3 px-2 text-center w-28 border-r border-slate-200">Đánh giá</th>
                    <th className="py-3 px-2 text-center w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTTCMMatrix.map((item, idx) => {
                    const rowCount = item.breakdown.length;
                    return item.breakdown.map((b, bIdx) => (
                      <tr
                        key={`${item.id}-${b.campusName}-${bIdx}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {bIdx === 0 && (
                          <>
                            <td
                              rowSpan={rowCount}
                              className="py-2.5 px-3 text-center text-slate-500 font-medium border-r border-slate-100 bg-white align-top"
                            >
                              {idx + 1}
                            </td>
                            <td
                              rowSpan={rowCount}
                              className="py-2.5 px-3 border-r border-slate-100 bg-white align-top"
                            >
                              <div className="font-semibold text-slate-900 text-xs">{item.teacherName}</div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.teacherCode}</div>
                            </td>
                            <td
                              rowSpan={rowCount}
                              className="py-2.5 px-2 text-center border-r border-slate-100 bg-white align-top"
                            >
                              <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {item.position}
                              </span>
                            </td>
                            <td
                              rowSpan={rowCount}
                              className="py-2.5 px-3 text-slate-700 text-xs font-medium border-r border-slate-100 bg-white align-top"
                            >
                              {item.deptName}
                            </td>
                            <td
                              rowSpan={rowCount}
                              className="py-2.5 px-3 text-slate-700 text-xs font-medium border-r border-slate-100 bg-white align-top"
                            >
                              {item.homeCampus}
                            </td>
                          </>
                        )}

                        {/* Cơ sở dự giờ */}
                        <td className="py-2 px-3 border-r border-slate-100">
                          <span className={`text-xs ${b.periods > 0 ? "font-medium text-slate-800" : "text-slate-400 italic"}`}>
                            {b.campusName}
                          </span>
                        </td>

                        {/* Phân loại (Nội bộ / Liên cơ sở) */}
                        <td className="py-2 px-2 text-center border-r border-slate-100">
                          {b.periods > 0 ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${b.isCrossCampus
                                ? "bg-sky-50 text-sky-800 border border-sky-200"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              }`}>
                              {b.isCrossCampus ? "Liên cơ sở" : "Nội bộ"}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>

                        {/* Số tiết dự */}
                        <td className="py-2 px-2 text-center border-r border-slate-100">
                          {b.periods > 0 ? (
                            <div>
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${b.isCrossCampus ? "bg-sky-50 text-sky-800 border border-sky-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                }`}>
                                {b.periods} tiết
                              </span>
                              {b.surprisePeriods > 0 && (
                                <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                                  ({b.surprisePeriods} đột xuất)
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>

                        {bIdx === 0 && (
                          <>
                            {/* Chỉ tiêu */}
                            <td
                              rowSpan={rowCount}
                              className="py-2.5 px-2 text-center border-r border-slate-100 bg-white align-top text-slate-700"
                            >
                              <div className="font-semibold text-xs">
                                {item.reqObserved} tiết/{item.observedUnit}
                              </div>
                              {item.observerType && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {item.observerType}
                                </div>
                              )}
                            </td>

                            {/* Đánh giá */}
                            <td
                              rowSpan={rowCount}
                              className="py-2.5 px-2 text-center border-r border-slate-100 bg-white align-top"
                            >
                              {item.isTargetMet ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Đạt chỉ tiêu
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  Chưa đạt ({item.progressPct}%)
                                </span>
                              )}
                            </td>

                            {/* Thao tác */}
                            <td
                              rowSpan={rowCount}
                              className="py-2.5 px-2 text-center bg-white align-top whitespace-nowrap"
                            >
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSwitchMainTab("tong-hop");
                                    setSelectedTeacherId(item.id);
                                    setActiveDetailTab("lich-su-du");
                                  }}
                                  className="text-teal-700 hover:text-teal-900 hover:underline text-xs font-semibold cursor-pointer"
                                >
                                  Xem dự
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => openTargetConfig(item.ttcm)}
                                  className="text-slate-500 hover:text-slate-800 hover:underline text-xs font-medium cursor-pointer"
                                >
                                  Chỉ tiêu
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ));
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300 text-slate-800">
                  <tr>
                    <td colSpan={7} className="py-3 px-3 uppercase text-slate-700 border-r border-slate-200">
                      Tổng cộng ({filteredTTCMMatrix.length} TTCM)
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-teal-900 border-r border-slate-200 bg-teal-100/50">
                      {ttcmMatrixKPIs.totalObserved} tiết
                    </td>
                    <td className="py-3 px-2 text-center border-r border-slate-200 text-slate-500">-</td>
                    <td className="py-3 px-2 text-center text-emerald-800 border-r border-slate-200">
                      {ttcmMatrixKPIs.targetMetCount}/{ttcmMatrixKPIs.totalTTCM} Đạt ({ttcmMatrixKPIs.metRate}%)
                    </td>
                    <td className="py-3 px-2 text-center text-slate-400">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* 5. Chú thích chuẩn Quản Trị */}
        <div className="flex flex-wrap items-center gap-6 px-4 py-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 shadow-2xs">
          <span className="font-semibold text-slate-800">Chú thích dữ liệu:</span>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span>
            <span>Tiết dự nội bộ (tại cơ sở công tác)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-sky-100 border border-sky-300"></span>
            <span>Tiết dự liên cơ sở (chéo cơ sở)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">-</span>
            <span>Không có tiết dự</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-12">
      <Toaster position="top-right" />

      {/* Executive Header Banner: Điều hành Dự giờ Toàn trường */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D40] to-[#003B3A] rounded-2xl p-4 sm:p-5 text-white shadow-xl shadow-teal-950/20 border border-teal-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#48BFE3] to-[#008B82] p-0.5 shadow-md shrink-0">
            <div className="w-full h-full bg-[#003B3A] rounded-[10px] flex items-center justify-center">
              <PieChart className="w-5 h-5 text-[#48BFE3]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-white/10 border border-white/15 text-emerald-200">
                SKY-LINE • TRUNG TÂM ĐIỀU HÀNH DỰ GIỜ
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-indigo-500 text-white border border-indigo-400/30">
                👔 QUẢN LÝ CẤP CAO
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
              Điều hành Dự giờ Toàn trường
            </h1>
          </div>
        </div>
      </div>

      {/* 1. Main Top Navigation Bar & Tools (Chuẩn Quản Trị, Không Trùng Lặp) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => handleSwitchMainTab("tong-hop")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${mainTab === "tong-hop"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
          >
            <span>Tổng hợp kết quả dự giờ</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${mainTab === "tong-hop" ? "bg-teal-50 text-teal-800 border border-teal-200" : "bg-slate-200 text-slate-600"
              }`}>
              {filteredDeptTeachers.length} GV
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMainTab("ma-tran")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${mainTab === "ma-tran"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
          >
            <span>Ma trận dự giờ TTCM</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${mainTab === "ma-tran" ? "bg-teal-50 text-teal-800 border border-teal-200" : "bg-slate-200 text-slate-600"
              }`}>
              {allTTCMList.length} TTCM
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMainTab("bang-ke")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${mainTab === "bang-ke"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-teal-600" />
            <span>Bảng kê chi tiết</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${mainTab === "bang-ke" ? "bg-teal-50 text-teal-800 border border-teal-200" : "bg-slate-200 text-slate-600"
              }`}>
              {teachersList.length} GV
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMainTab("dbcl")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${mainTab === "dbcl"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Báo cáo ĐBCL & Phân tích CM</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${mainTab === "dbcl" ? "bg-indigo-50 text-indigo-800 border border-indigo-200" : "bg-slate-200 text-slate-600"
              }`}>
              {qaAnalytics.totalEvaluations} ĐG
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMainTab("kho-tieu-bieu")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${mainTab === "kho-tieu-bieu"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
          >
            <BookMarked className="w-3.5 h-3.5 text-amber-600" />
            <span>Kho Tiết Dạy Tiêu Biểu</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${mainTab === "kho-tieu-bieu" ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-slate-200 text-slate-600"
              }`}>
              {exemplaryLessons.length} Tiết
            </span>
          </button>
        </div>

        {/* Action Tools: Duy nhất 1 chỗ chọn Năm học, Xuất Excel, Báo cáo */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bộ chọn Năm học duy nhất */}
          {academicYears && academicYears.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
              <span className="text-slate-500 font-medium text-[11px]">Năm học:</span>
              <select
                value={filterAcademicYearId}
                onChange={(e) => handleAcademicYearChange(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer text-xs"
              >
                {academicYears.map((yr: any) => (
                  <option key={yr.id} value={yr.id} className="text-slate-800 font-semibold">
                    {yr.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nút Xuất Excel duy nhất */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#002B2A] text-white font-semibold text-xs shadow-2xs transition-all cursor-pointer"
            title="Xuất file Excel báo cáo tổng hợp dự giờ"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-300" />
            <span>Xuất Excel {selectedMonth === "all" ? "(Cả năm)" : `(T${selectedMonth.split("-")[1]})`}</span>
          </button>

          {/* Nút Gửi Báo Cáo TTCM duy nhất */}
          <button
            type="button"
            onClick={openEmailModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs shadow-2xs transition-all cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-slate-950" />
            <span>Báo cáo cho TTCM</span>
          </button>

          {/* Nút Cấu hình Tự động gửi email cuối tháng */}
          <button
            type="button"
            onClick={() => setIsAutoEmailModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-all cursor-pointer ${autoEmailConfig?.enabled
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                : "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200"
              }`}
            title="Cấu hình tự động gửi email báo cáo cho TTCM vào ngày cuối cùng của tháng"
          >
            <span className={`w-2 h-2 rounded-full ${autoEmailConfig?.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            <span>Tự động gửi cuối tháng: {autoEmailConfig?.enabled ? "BẬT" : "TẮT"}</span>
          </button>
        </div>
      </div>

      {mainTab === "ma-tran" ? (
        renderTTCMMatrix()
      ) : mainTab === "bang-ke" ? (
        <DetailedStatementView
          initialSlots={initialSlots}
          teachers={teachersList}
          departments={departments}
          campuses={campuses}
          academicYears={academicYears}
          selectedYearId={filterAcademicYearId}
          currentTeacher={currentTeacher}
          isTTCM={isTTCM}
          isSuperAdmin={isSuperAdmin}
          isHeadOfAcademic={isHeadOfAcademic}
          isTBP={isTBP}
          isGDCS={isGDCS}
          preSelectedTeacherId={selectedTeacherId}
          onSelectTeacher={(id) => setSelectedTeacherId(id)}
          openEvalModal={openEvalModal}
        />
      ) : mainTab === "dbcl" ? (
        renderQADashboard()
      ) : mainTab === "kho-tieu-bieu" ? (
        renderExemplaryLessons()
      ) : (
        <>
          {/* 2. 4 Thẻ KPI Chuẩn Quản Trị (Phẳng, Nền trắng, Không icon trong số liệu) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Tổng tiết dạy
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {departmentSummary.totalTaught} <span className="text-xs font-normal text-slate-500">tiết</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {departmentSummary.taughtSurprise > 0 ? `${departmentSummary.taughtSurprise} tiết đột xuất` : "100% theo kế hoạch"}
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Tổng tiết dự
              </div>
              <div className="text-2xl font-bold text-teal-800 mt-1">
                {departmentSummary.totalObserved} <span className="text-xs font-normal text-slate-500">lượt</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {departmentSummary.observedSurprise > 0 ? `${departmentSummary.observedSurprise} lượt đột xuất` : "100% theo kế hoạch"}
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Tỷ lệ đạt chuẩn
              </div>
              <div className="text-2xl font-bold text-emerald-800 mt-1">
                {departmentSummary.passRate}%
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                {departmentSummary.passingEvaluations}/{departmentSummary.totalEvaluations} lượt đạt
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Giáo viên trong tổ
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {deptTeachers.length} <span className="text-xs font-normal text-slate-500">GV</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Tổ: <span className="font-semibold text-slate-700">{selectedDeptName}</span>
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
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${isActive
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
                    <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
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
                            className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${isSelected
                                ? "bg-teal-50/80 border-teal-500 shadow-2xs"
                                : "bg-white border-slate-200 hover:bg-slate-50"
                              }`}
                          >
                            <div className="min-w-0">
                              <p className={`text-xs font-semibold truncate ${isSelected ? "text-teal-950 font-bold" : "text-slate-800"}`}>
                                {teacher.teacherName}
                              </p>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                                <span>{teacher.teacherCode}</span>
                                {teacher.position && (
                                  <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-sans text-[10px] font-medium uppercase">
                                    {teacher.position}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-medium">
                              <span className={`px-1.5 py-0.5 rounded text-[10.5px] ${taughtPassed ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-slate-50 text-slate-500 border border-slate-200"
                                }`}>
                                Dạy: {stats.taughtCount}{teacher.requiredTaught ? `/${teacher.requiredTaught}` : ""}
                                {stats.taughtSurpriseCount > 0 && ` (${stats.taughtSurpriseCount} ĐX)`}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10.5px] ${observedPassed ? "bg-sky-50 text-sky-800 border border-sky-200" : "bg-slate-50 text-slate-500 border border-slate-200"
                                }`}>
                                Dự: {stats.observedCount}{teacher.requiredObserved ? `/${teacher.requiredObserved}` : ""}
                                {stats.observedSurpriseCount > 0 && ` (${stats.observedSurpriseCount} ĐX)`}
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
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">

                  {/* Header profile info (Chuẩn Quản Trị, Không Avatar, Không Icon Thừa, Không Nút Trùng Lặp) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900">
                          {selectedTeacher.teacherName}
                        </h2>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-mono font-medium">
                          {selectedTeacher.teacherCode}
                        </span>
                        {selectedTeacher.position && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold uppercase">
                            {selectedTeacher.position}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Tổ chuyên môn: <strong className="text-slate-800">{selectedDeptName}</strong> &bull; {selectedTeacher.email || "Chưa có email"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openTargetConfig(selectedTeacher)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
                      >
                        Thiết lập chỉ tiêu
                      </button>
                      {teacherAvgScore && (
                        <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-bold text-xs text-center">
                          <span className="text-[10px] text-emerald-600 font-normal mr-1">ĐTB:</span>
                          <span>{teacherAvgScore}đ</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sub-tab Navigation (Tối Giản, Đã Loại Bỏ Nút Ma Trận TTCM Trùng Lặp) */}
                  <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setActiveDetailTab("lich-su")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeDetailTab === "lich-su"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                    >
                      <span>Tiết dạy</span>
                      <span className={`ml-1.5 px-1.5 py-0.2 rounded text-[10px] ${activeDetailTab === "lich-su" ? "bg-teal-50 text-teal-800 border border-teal-200 font-bold" : "bg-slate-200 text-slate-600"}`}>
                        {filteredSlots.length}
                      </span>
                      {(selectedTeacher && teacherStats[selectedTeacher.id]?.taughtSurpriseCount > 0) && (
                        <span className="ml-1 text-[10px] text-amber-700 font-medium">
                          ({teacherStats[selectedTeacher.id]?.taughtSurpriseCount} ĐX)
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveDetailTab("lich-su-du")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeDetailTab === "lich-su-du"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                    >
                      <span>Tiết dự</span>
                      <span className={`ml-1.5 px-1.5 py-0.2 rounded text-[10px] ${activeDetailTab === "lich-su-du" ? "bg-teal-50 text-teal-800 border border-teal-200 font-bold" : "bg-slate-200 text-slate-600"}`}>
                        {filteredObservedSlots.length}
                      </span>
                      {(selectedTeacher && teacherStats[selectedTeacher.id]?.observedSurpriseCount > 0) && (
                        <span className="ml-1 text-[10px] text-amber-700 font-medium">
                          ({teacherStats[selectedTeacher.id]?.observedSurpriseCount} ĐX)
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveDetailTab("tien-do-to")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeDetailTab === "tien-do-to"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                    >
                      <span>Tiến độ Tổ CM</span>
                      <span className={`ml-1.5 px-1.5 py-0.2 rounded text-[10px] ${activeDetailTab === "tien-do-to" ? "bg-teal-50 text-teal-800 border border-teal-200 font-bold" : "bg-slate-200 text-slate-600"}`}>
                        {deptTeachers.length} GV
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveDetailTab("phan-tich")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeDetailTab === "phan-tich"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                    >
                      <span>Năng lực cá nhân</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveDetailTab("to-cm")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeDetailTab === "to-cm"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                    >
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
                        <option value="PLAN">Theo kế hoạch</option>
                        <option value="SURPRISE">Đột xuất</option>
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
                            <div className={`absolute top-0 left-0 right-0 h-1 ${isMamNonBlock ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-[#003B3A] to-[#48BFE3]"
                              }`} />

                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pt-1">
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {isSurprise && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-bold flex items-center gap-1 shadow-2xs">
                                      Tiết dự đột xuất
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase ${isMamNonBlock
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
                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${passed ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-rose-100 text-rose-800 border-rose-300"
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
                        <option value="PLAN">Theo kế hoạch</option>
                        <option value="SURPRISE">Đột xuất</option>
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
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-bold flex items-center gap-1 shadow-2xs">
                                      Dự giờ đột xuất
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
                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border mt-1 ${passed ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-rose-100 text-rose-800 border-rose-300"
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
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Thống kê tiến độ các tổ chuyên môn theo tháng
                          </span>
                          <span className="px-2 py-0.5 rounded bg-teal-50 text-[#003B3A] font-semibold text-[11px] border border-teal-100">
                            {allDepartmentsSummary.length} Tổ chuyên môn
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Kỳ báo cáo: <strong className="text-slate-700">{selectedMonth === "all" ? "Toàn bộ năm học" : `Tháng ${selectedMonth.split("-")[1]}/${selectedMonth.split("-")[0]}`}</strong> &bull; Chọn dòng để xem danh sách giáo viên của tổ bên dưới
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={openAllDeptsEmailModal}
                          className="px-3.5 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#002d2c] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Báo cáo cho Ban ĐHCM</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                            <th className="py-2.5 px-3 text-center w-12">STT</th>
                            <th className="py-2.5 px-4 min-w-[200px]">Tổ Chuyên Môn</th>
                            <th className="py-2.5 px-3 text-center min-w-[90px]">Giáo Viên</th>
                            <th className="py-2.5 px-3 text-center min-w-[110px]">Tổng Tiết Dạy</th>
                            <th className="py-2.5 px-3 text-center min-w-[110px] text-amber-900 bg-amber-50/40">Dạy đột xuất</th>
                            <th className="py-2.5 px-3 text-center min-w-[110px]">Tổng Tiết Dự</th>
                            <th className="py-2.5 px-3 text-center min-w-[110px] text-amber-900 bg-amber-50/40">Dự đột xuất</th>
                            <th className="py-2.5 px-3 text-center min-w-[90px]">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {allDepartmentsSummary.map((dept: any, idx: number) => {
                            const isCurrentSelected = selectedDeptId === dept.id;
                            return (
                              <tr
                                key={dept.id}
                                onClick={() => setSelectedDeptId(dept.id)}
                                className={`hover:bg-teal-50/40 cursor-pointer transition-colors ${isCurrentSelected ? "bg-teal-50/70 border-l-4 border-l-[#003B3A]" : ""}`}
                              >
                                <td className="py-2.5 px-3 text-center font-medium text-slate-400 text-xs">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-4">
                                  <div>
                                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                      <span>{dept.name}</span>
                                      {isCurrentSelected && (
                                        <span className="px-1.5 py-0.2 rounded bg-teal-100 text-[#003B3A] font-bold text-[9px]">
                                          Đang chọn
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                      {dept.ttcm ? (
                                        <span className="text-teal-700 font-medium">TTCM: {dept.ttcm.teacherName}</span>
                                      ) : (
                                        <span className="text-slate-400 italic">Chưa gán TTCM</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                                  {dept.teacherCount} GV
                                </td>
                                <td className="py-2.5 px-3 text-center font-semibold text-emerald-800">
                                  {dept.totalTaught} tiết
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {dept.taughtSurprise > 0 ? (
                                    <span className="font-semibold text-amber-800">
                                      {dept.taughtSurprise} tiết
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center font-semibold text-sky-800">
                                  {dept.totalObserved} lượt
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {dept.observedSurprise > 0 ? (
                                    <span className="font-semibold text-amber-800">
                                      {dept.observedSurprise} lượt
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => openEmailModalForDept(dept.id)}
                                    className="px-2.5 py-1 rounded border border-slate-200 hover:border-teal-600 hover:bg-teal-50 text-slate-700 hover:text-teal-800 font-medium text-xs transition-colors"
                                    title={`Gửi Email báo cáo cho TTCM ${dept.name}`}
                                  >
                                    Gửi mail
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold text-xs border-t border-slate-200 text-slate-800">
                          <tr>
                            <td colSpan={2} className="py-2.5 px-4 uppercase text-slate-700 font-bold">
                              Tổng cộng ({allDepartmentsSummary.length} Tổ CM)
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                              {allDepartmentsSummary.reduce((sum: number, d: any) => sum + (d.teacherCount || 0), 0)} GV
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-emerald-800">
                              {allDepartmentsSummary.reduce((sum: number, d: any) => sum + (d.totalTaught || 0), 0)} tiết
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-amber-800 bg-amber-50/40">
                              {allDepartmentsSummary.reduce((sum: number, d: any) => sum + (d.taughtSurprise || 0), 0)} tiết
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-sky-800">
                              {allDepartmentsSummary.reduce((sum: number, d: any) => sum + (d.totalObserved || 0), 0)} lượt
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-amber-800 bg-amber-50/40">
                              {allDepartmentsSummary.reduce((sum: number, d: any) => sum + (d.observedSurprise || 0), 0)} lượt
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* BẢNG 2: DANH SÁCH GIÁO VIÊN & ĐỐI CHIẾU CHỈ TIÊU CỦA TỔ ĐANG CHỌN */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
                          Chi tiết: Danh sách Giáo viên & Đối chiếu Chỉ tiêu - {selectedDeptName} ({deptTeachers.length} GV)
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Kỳ: {selectedMonth === "all" ? "Toàn bộ năm học" : `Tháng ${selectedMonth.split("-")[1]}/${selectedMonth.split("-")[0]}`} {deptTTCM ? `• TTCM: ${deptTTCM.teacherName}` : ""}
                        </p>
                      </div>

                      <button
                        onClick={openEmailModal}
                        className="px-3.5 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#002d2c] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Gửi mail cho TTCM {selectedDeptName}</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                            <th className="py-2.5 px-3 text-center w-10">STT</th>
                            <th className="py-2.5 px-4 min-w-[200px]">Giáo viên Bộ môn</th>
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
                                className={`hover:bg-slate-50 transition-colors ${isSelected ? "bg-teal-50/40" : ""}`}
                              >
                                <td className="py-2.5 px-3 text-center font-medium text-slate-400 text-xs">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-4">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 text-xs truncate">{t.teacherName}</p>
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                      <span>{t.teacherCode}</span>
                                      {t.position && (
                                        <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px]">
                                          {t.position}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div>
                                    <span className={`font-semibold ${t.reqTaught > 0
                                        ? (t.isTaughtMet ? "text-emerald-800" : "text-rose-700")
                                        : (t.taughtCount > 0 ? "text-teal-800" : "text-slate-600")
                                      }`}>
                                      {t.taughtCount} {t.reqTaught > 0 ? `/ ${t.reqTaught} (${t.taughtUnit})` : "tiết"}
                                    </span>
                                    {t.taughtSurpriseCount > 0 && (
                                      <div className="text-[11px] text-amber-800 font-medium mt-0.5">
                                        (Đột xuất: {t.taughtSurpriseCount})
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div>
                                    <span className={`font-semibold ${t.reqObserved > 0
                                        ? (t.isObservedMet ? "text-emerald-800" : "text-amber-800")
                                        : (t.observedCount > 0 ? "text-cyan-800" : "text-slate-600")
                                      }`}>
                                      {t.observedCount} {t.reqObserved > 0 ? `/ ${t.reqObserved} (${t.observedUnit})` : "lượt"}
                                    </span>
                                    {t.observedSurpriseCount > 0 && (
                                      <div className="text-[11px] text-amber-800 font-medium mt-0.5">
                                        (Đột xuất: {t.observedSurpriseCount})
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
                                    className="px-2.5 py-1 rounded border border-slate-200 hover:border-teal-600 hover:bg-teal-50 text-slate-700 hover:text-teal-800 font-medium text-xs transition-colors"
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

                        {/* Digital Pedagogical Badges & CPD Growth Portfolio */}
                        <div className="p-4 bg-gradient-to-r from-amber-50/60 via-teal-50/40 to-indigo-50/50 rounded-2xl border border-amber-200/70 space-y-3">
                          <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-amber-600" />
                              <h5 className="font-black text-xs text-amber-950 uppercase tracking-wide">
                                Huy hiệu Năng lực Sư phạm Số & Hồ sơ CPD
                              </h5>
                            </div>
                            <span className="text-[10.5px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded-md border border-amber-200">
                              Hồ sơ phát triển chuyên môn
                            </span>
                          </div>

                          {/* Huy hiệu đạt được */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {/* Badge 1: Nhà Sư Phạm Xuất Sắc */}
                            {(() => {
                              const hasExemplary = teacherEvaluations.filter(e => e.evaluation?.overallRating === "Giỏi" || (e.evaluation?.totalScore && e.evaluation.totalScore >= 18)).length >= 1;
                              return (
                                <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center ${hasExemplary ? "bg-white border-amber-200 shadow-2xs" : "bg-slate-50/60 border-slate-200 opacity-50"}`}>
                                  <div className="text-xl">🌟</div>
                                  <div className="text-[11px] font-bold text-slate-800 mt-1">Sư Phạm Xuất Sắc</div>
                                  <div className="text-[9.5px] text-slate-500">{hasExemplary ? "Đã đạt loại Giỏi" : "Chưa mở khóa"}</div>
                                </div>
                              );
                            })()}

                            {/* Badge 2: Bậc Thầy Tương Tác (Y7) */}
                            {(() => {
                              const y7Crit = competencyData.find(c => c.id === "Y7" || c.id === "T3");
                              const isMaster = y7Crit && y7Crit.pct >= 95;
                              return (
                                <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center ${isMaster ? "bg-white border-teal-200 shadow-2xs" : "bg-slate-50/60 border-slate-200 opacity-50"}`}>
                                  <div className="text-xl">👥</div>
                                  <div className="text-[11px] font-bold text-slate-800 mt-1">Dạy Học Tích Cực</div>
                                  <div className="text-[9.5px] text-slate-500">{isMaster ? "Tương tác nhóm ≥95%" : "Cần bồi dưỡng"}</div>
                                </div>
                              );
                            })()}

                            {/* Badge 3: Tiên Phong Đổi Mới (Y11/Y9) */}
                            {(() => {
                              const y11Crit = competencyData.find(c => c.id === "Y11" || c.id === "T2");
                              const isInnovator = y11Crit && y11Crit.pct >= 90;
                              return (
                                <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center ${isInnovator ? "bg-white border-indigo-200 shadow-2xs" : "bg-slate-50/60 border-slate-200 opacity-50"}`}>
                                  <div className="text-xl">🚀</div>
                                  <div className="text-[11px] font-bold text-slate-800 mt-1">Tiên Phong Đổi Mới</div>
                                  <div className="text-[9.5px] text-slate-500">{isInnovator ? "Sáng tạo & Đổi mới" : "Chưa đạt"}</div>
                                </div>
                              );
                            })()}

                            {/* Badge 4: Kỷ Lục KPI */}
                            {(() => {
                              const isKPI = currentStats.taughtCount >= (selectedTeacher.requiredTaught || 1) && currentStats.observedCount >= (selectedTeacher.requiredObserved || 1);
                              return (
                                <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center ${isKPI ? "bg-white border-emerald-200 shadow-2xs" : "bg-slate-50/60 border-slate-200 opacity-50"}`}>
                                  <div className="text-xl">🎯</div>
                                  <div className="text-[11px] font-bold text-slate-800 mt-1">Kỷ Lục Hoàn Thành</div>
                                  <div className="text-[9.5px] text-slate-500">{isKPI ? "100% KPI Dạy & Dự" : "Đang thực hiện"}</div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Kế hoạch Bồi dưỡng Sư phạm Cá nhân (IDP) */}
                          {sortedWeaknesses.length > 0 && sortedWeaknesses[0].lowPct > 0 && (
                            <div className="p-3 bg-white/90 rounded-xl border border-amber-200/80 text-[11px] text-slate-700 space-y-1.5">
                              <div className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                <span>Kế hoạch Phát triển Sư phạm Cá nhân (IDP Khuyến nghị):</span>
                              </div>
                              <p className="text-slate-600">
                                Dựa trên kết quả dự giờ, thầy/cô nên ưu tiên tham gia sinh hoạt chuyên môn chuyên đề:{" "}
                                <strong className="text-slate-900">{sortedWeaknesses[0].label}</strong> (tỷ lệ cần cải thiện {sortedWeaknesses[0].lowPct}%) để hoàn thiện kỹ năng và nâng cao hiệu quả tiết dạy.
                              </p>
                            </div>
                          )}
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
        </>
      )}

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
                    <option value="all">Toàn bộ năm học</option>
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
                      ({emailPreviewSummary.totalSurpriseTaught} đột xuất)
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Tiết Dự Hoàn Thành</span>
                  <strong className="text-sm font-black text-sky-700">{emailPreviewSummary.totalObserved} lượt</strong>
                  {emailPreviewSummary.totalSurpriseObserved > 0 && (
                    <span className="text-[9px] text-amber-800 font-bold block mt-0.5">
                      ({emailPreviewSummary.totalSurpriseObserved} đột xuất)
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
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-block ${t.reqTaught > 0
                                  ? (t.isTaughtMet ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")
                                  : (t.taughtCount > 0 ? "bg-teal-50 text-teal-800 border-teal-200" : "bg-slate-50 text-slate-500 border-slate-200")
                                }`}>
                                {t.taughtCount} {t.reqTaught > 0 ? `/ ${t.reqTaught} (${t.taughtUnit})` : "tiết"}
                              </span>
                              {t.taughtSurpriseCount > 0 && (
                                <div className="text-[9px] text-amber-800 font-semibold mt-0.5">
                                  ({t.taughtSurpriseCount} ĐX)
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-block ${t.reqObserved > 0
                                  ? (t.isObservedMet ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200")
                                  : (t.observedCount > 0 ? "bg-cyan-50 text-cyan-800 border-cyan-200" : "bg-slate-50 text-slate-500 border-slate-200")
                                }`}>
                                {t.observedCount} {t.reqObserved > 0 ? `/ ${t.reqObserved} (${t.observedUnit})` : "lượt"}
                              </span>
                              {t.observedSurpriseCount > 0 && (
                                <div className="text-[9px] text-amber-800 font-semibold mt-0.5">
                                  ({t.observedSurpriseCount} ĐX)
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
                <div className="font-bold flex items-center gap-1.5 text-emerald-900 uppercase text-[10.5px]">
                  <span>Quy định tính Tiết dạy và Tiết dự giờ trong Báo cáo:</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-[10.5px] text-emerald-800">
                  <li><strong>Tiết dạy:</strong> Chỉ được tính khi tiết dạy đã diễn ra, có giáo viên tham gia dự giờ <strong>VÀ người dự ĐÃ NỘP PHIẾU ĐÁNH GIÁ</strong>. (Tiết đôi tính 2 tiết).</li>
                  <li><strong>Tiết dự:</strong> Chỉ được tính khi Giáo viên đã được duyệt tham gia dự giờ <strong>VÀ ĐÃ HOÀN TẤT GỬI PHIẾU ĐÁNH GIÁ</strong>. (Tiết đôi tính 2 lượt).</li>
                  <li><strong>Tiết đột xuất:</strong> Báo cáo tự động tổng hợp số tiết dự giờ đột xuất và tiết dạy của GV được dự đột xuất.</li>
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
                    <option value="all">Toàn bộ năm học</option>
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
                        <th className="py-2 px-2 text-center w-24 text-amber-900 bg-amber-50/50">Dạy ĐX</th>
                        <th className="py-2 px-2 text-center w-24">Tổng Dự</th>
                        <th className="py-2 px-2 text-center w-24 text-amber-900 bg-amber-50/50">Dự ĐX</th>
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
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-block ${d.taughtSurprise > 0 ? "bg-amber-100/70 text-amber-900 border-amber-300" : "bg-slate-50 text-slate-400 border-slate-200"
                              }`}>
                              {d.taughtSurprise > 0 ? `${d.taughtSurprise}` : "0"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-50 text-sky-800 border border-sky-200 inline-block">
                              {d.totalObserved} lượt
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border inline-block ${d.observedSurprise > 0 ? "bg-amber-100/70 text-amber-900 border-amber-300" : "bg-slate-50 text-slate-400 border-slate-200"
                              }`}>
                              {d.observedSurprise > 0 ? `${d.observedSurprise}` : "0"}
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
                <div className="font-bold flex items-center gap-1.5 text-emerald-900 uppercase text-[10.5px]">
                  <span>Quy định tính Tiết dạy và Tiết dự giờ trong Báo cáo:</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-[10.5px] text-emerald-800">
                  <li><strong>Tiết dạy:</strong> Chỉ được tính khi tiết dạy đã diễn ra, có giáo viên tham gia dự giờ <strong>VÀ người dự ĐÃ NỘP PHIẾU ĐÁNH GIÁ</strong>. (Tiết đôi tính 2 tiết).</li>
                  <li><strong>Tiết dự:</strong> Chỉ được tính khi Giáo viên đã được duyệt tham gia dự giờ <strong>VÀ ĐÃ HOÀN TẤT GỬI PHIẾU ĐÁNH GIÁ</strong>. (Tiết đôi tính 2 lượt).</li>
                  <li><strong>Tiết đột xuất:</strong> Báo cáo tự động phân loại và thống kê riêng biệt số tiết dự giờ đột xuất và tiết dạy được dự đột xuất.</li>
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
                  {["Ban ĐHCM", "GĐCS", "TTCM", "Nhóm trưởng CM CS", "Giáo viên mới", "Giáo viên cũ"].map(preset => {
                    const isSelected = observerType === preset ||
                      (preset === "GĐCS" && (observerType === "Giám đốc Điều hành cơ sở" || observerType === "GDCS"));
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleObserverTypePreset(preset)}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all ${isSelected
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
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
                  {["GĐCS", "TTCM", "Nhóm trưởng CM CS", "Giáo viên mới", "Giáo viên cũ"].map(preset => {
                    const isSelected = observeeType === preset ||
                      (preset === "GĐCS" && (observeeType === "Giám đốc Điều hành cơ sở" || observeeType === "GDCS"));
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleObserveeTypePreset(preset)}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all ${isSelected
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
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

      {/* Auto Email Configuration Modal */}
      {isAutoEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Cấu hình Tự động gửi Email Báo cáo TTCM
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động gửi báo cáo đối chiếu chỉ tiêu dự giờ đến các Tổ trưởng chuyên môn vào ngày cuối cùng của tháng
                </p>
              </div>
              <button
                onClick={() => setIsAutoEmailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Toggle Switch On/Off Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <span>Tự động gửi email cuối tháng:</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${autoEmailConfig?.enabled
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-slate-200 text-slate-700 border border-slate-300"
                      }`}>
                      {autoEmailConfig?.enabled ? "ĐANG BẬT (ON)" : "ĐANG TẮT (OFF)"}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                    Khi BẬT, hệ thống tự động tổng hợp và gửi email báo cáo tháng hiện tại cho từng TTCM vào 18:00 ngày cuối cùng của tháng.
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={togglingAutoEmail}
                    onClick={() => handleToggleAutoEmail(!autoEmailConfig?.enabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoEmailConfig?.enabled ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoEmailConfig?.enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                    />
                  </button>
                  <span className="font-semibold text-xs text-slate-700">
                    {autoEmailConfig?.enabled ? "Bật" : "Tắt"}
                  </span>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Lịch gửi tiếp theo
                  </span>
                  <div className="text-sm font-bold text-slate-800">
                    {autoEmailConfig?.nextRunDate || clientNextRunDate} lúc 18:00
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    (Ngày cuối cùng của tháng {(autoEmailConfig?.currentMonth || clientCurrentMonth).split("-")[1]})
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Kỳ báo cáo
                  </span>
                  <div className="text-sm font-bold text-teal-800">
                    Theo tháng hiện tại
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Tháng {(autoEmailConfig?.currentMonth || clientCurrentMonth).split("-")[1]}/{(autoEmailConfig?.currentMonth || clientCurrentMonth).split("-")[0]}
                  </span>
                </div>
              </div>

              {/* Last Run Log */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Nhật ký lần gửi gần nhất
                </span>
                <div className="text-xs text-slate-700 font-medium">
                  {autoEmailConfig?.lastLog || "Chưa có lượt gửi tự động nào"}
                </div>
                {autoEmailConfig?.lastSentAt && (
                  <span className="text-[10px] text-slate-400 block">
                    Thời gian: {new Date(autoEmailConfig.lastSentAt).toLocaleString("vi-VN")}
                  </span>
                )}
              </div>

              {/* Departments Preview List */}
              {(() => {
                const previewDepts = (autoEmailConfig?.departments && autoEmailConfig.departments.length > 0)
                  ? autoEmailConfig.departments
                  : (departments || []).map(d => {
                    const ttcm = allTTCMList.find((t: any) => t.deptId === d.id);
                    return {
                      id: d.id,
                      name: d.name,
                      blockCM: d.blockCM,
                      ttcmName: ttcm?.teacherName || null,
                      ttcmEmail: ttcm?.email || null,
                      hasValidEmail: !!(ttcm?.email && ttcm.email.includes("@"))
                    };
                  });

                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Danh sách TTCM nhận báo cáo ({previewDepts.length} Tổ)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Chỉ gửi tới các tổ có TTCM và địa chỉ email hợp lệ
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-bold uppercase sticky top-0">
                          <tr>
                            <th className="py-2 px-2 text-center w-8">STT</th>
                            <th className="py-2 px-3">Tổ Chuyên Môn</th>
                            <th className="py-2 px-3">Tổ Trưởng (TTCM)</th>
                            <th className="py-2 px-3">Email Nhận</th>
                            <th className="py-2 px-2 text-center w-24">Trạng Thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewDepts.map((d: any, idx: number) => (
                            <tr key={d.id} className="hover:bg-slate-50">
                              <td className="py-2 px-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                              <td className="py-2 px-3 font-semibold text-slate-800">{d.name}</td>
                              <td className="py-2 px-3 text-slate-700">
                                {d.ttcmName || <span className="text-slate-400 italic">Chưa gán</span>}
                              </td>
                              <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                                {d.ttcmEmail || <span className="text-slate-400 italic">--</span>}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {d.hasValidEmail ? (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                                    Sẵn sàng
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-semibold text-[10px]">
                                    Thiếu email
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Test Run Section */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">
                      Kiểm thử tính năng gửi báo cáo
                    </span>
                    <span className="text-[11px] text-amber-800">
                      Gửi thử nghiệm báo cáo tháng hiện tại cho tất cả TTCM ngay bây giờ mà không cần chờ đến cuối tháng.
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={runningAutoTest}
                    onClick={handleRunAutoTest}
                    className="px-3 py-1.5 bg-[#003B3A] hover:bg-[#002B2A] text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {runningAutoTest ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang gửi thử...</span>
                      </>
                    ) : (
                      <span>Chạy thử nghiệm ngay</span>
                    )}
                  </button>
                </div>
                {autoTestMessage && (
                  <div className="p-2 bg-white rounded border border-amber-200 text-slate-800 text-[11px] font-medium">
                    {autoTestMessage}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsAutoEmailModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
