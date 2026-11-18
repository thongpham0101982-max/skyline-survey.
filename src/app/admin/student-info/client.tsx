"use client";

import { sortVietnameseStudents } from "@/lib/vietnameseSort";
import TciResultReviewPanel from "@/components/tci/TciResultReviewPanel";
import { useState, useMemo, useRef, useEffect, Fragment, useCallback } from "react";
import { 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Users2, 
  Baby, 
  Clock,
  Users,
  GraduationCap, 
  ArrowRightLeft,
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  BookOpen, 
  FileText,
  Plus,
  Upload,
  Download,
  Edit2,
  Trash2,
  Sparkles,
  UserCheck,
  RefreshCw,
  Loader2,
  Brain,
  Calculator,
  PenTool,
  Mic,
  Award,
  Shield,
  Info,
  RotateCcw,
  Check,
  ExternalLink,
  HeartHandshake,
  Printer,
  Mail
} from "lucide-react";
import { confirmEnrollmentAction, revertEnrollmentAction } from "../student-transfers/actions";
import { getSurveyFormAgeGroup, getProbationAgeGroup } from "@/lib/preschool";
import * as XLSX from "xlsx";
import { InputAssessmentsClient } from "../input-assessments/client";
import { PreschoolInputAssessmentsClient } from "../preschool-input-assessments/client";
import { parseEntranceRecord, serializeEntranceRecord, extractAcademicDetails } from "@/lib/entranceAcademicRecord";
import { getStudentK12Track } from "@/lib/admissionRegulationEngine";
import { EntranceAcademicRecordInput } from "@/components/assessments/EntranceAcademicRecordInput";
import { StudentOrientationModal } from "@/components/orientation/StudentOrientationModal";
import { StudentOrientationReportModal } from "@/components/orientation/StudentOrientationReportModal";
import { PvdhOrientationModal } from "@/components/orientation/PvdhOrientationModal";

interface StudentInfoClientProps {
  pageMode?: "danh-sach" | "ket-qua";
  initialTab?: "general" | "preschool" | "transfer";
  initialSubTab?: "periods" | "students" | "students_s" | "students_i" | "handover" | "batch" | "info" | "result";
  initialGeneralStudents: any[];
  initialPreschoolStudents: any[];
  generalPeriods: any[];
  preschoolPeriods: any[];
  activeYearName: string;
  activeYearId: string;
  configs: any[];
  preschoolConfigs: any[];
  eduSystems: any[];
  campuses: any[];
  grades: string[];
  
  // NEW PROPS FOR EMBEDDING
  academicYears: any[];
  examBoardUsers: any[];
  giaoVuCSUsers: any[];
  gdcsUsers: any[];
  subjects: any[];
  teachers: any[];
  departments: any[];
  currentUser: any;
  rolePermissions: any[];
  gradesPreschool: string[];
  destinationSchools?: any[];
}

const preschoolGrades = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"];

const danangWards = [
  "Hải Châu", "Hòa Cường", "Thanh Khê", "An Khê", "An Hải", "Sơn Trà", "Ngũ Hành Sơn", "Hòa Khánh", "Hải Vân", "Liên Chiểu", 
  "Cẩm Lệ", "Hòa Xuân", "Hòa Vang", "Hòa Tiến", "Bà Nà", "Hoàng Sa (Đặc khu)", "Núi Thành", "Tam Mỹ", "Tam Anh", "Đức Phú", 
  "Tam Xuân", "Tam Hải", "Tam Kỳ", "Quảng Phú", "Hương Trà", "Bàn Thạch", "Tây Hồ", "Chiên Đàn", "Phú Ninh", "Lãnh Ngọc", 
  "Tiên Phước", "Thạnh Bình", "Sơn Cẩm Hà", "Trà Liên", "Trà Giáp", "Trà Tân", "Trà Đốc", "Trà My", "Nam Trà My", "Trà Tập", 
  "Trà Vân", "Trà Linh", "Trà Leng", "Thăng Bình", "Thăng An", "Thăng Trường", "Thăng Điền", "Thăng Phú", "Đồng Dương", "Quế Sơn Trung", 
  "Quế Sơn", "Xuân Phú", "Nông Sơn", "Quế Phước", "Duy Nghĩa", "Nam Phước", "Duy Xuyên", "Thu Bồn", "Điện Bàn", "Điện Bàn Đông", 
  "An Thắng", "Điện Bàn Bắc", "Điện Bàn Tây", "Gò Nổi", "Hội An", "Hội An Đông", "Hội An Tây", "Tân Hiệp", "Đại Lộc", "Hà Nha", 
  "Thượng Đức", "Vu Gia", "Phú Thuận", "Thạnh Mỹ", "Bến Giằng", "Nam Giang", "Đắc Pring", "La Dêê", "La Êê", "Sông Vàng", 
  "Sông Kôn", "Đông Giang", "Bến Hiên", "Avương", "Tây Giang", "Hùng Sơn", "Hiệp Đức", "Việt An", "Phước Trà", "Khâm Đức", 
  "Phước Năng", "Phước Chánh", "Phước Thành", "Phước Hiệp"
].sort();

const vietnamProvinces = [
  "Thành phố Đà Nẵng",
  "Thành phố Hà Nội",
  "Thành phố Hồ Chí Minh",
  "Thành phố Hải Phòng",
  "Thành phố Cần Thơ",
  "An Giang",
  "Bà Rịa - Vũng Tàu",
  "Bắc Giang",
  "Bắc Kạn",
  "Bạc Liêu",
  "Bắc Ninh",
  "Bến Tre",
  "Bình Định",
  "Bình Dương",
  "Bình Phước",
  "Bình Thuận",
  "Cà Mau",
  "Cao Bằng",
  "Đắc Lắk",
  "Đắk Nông",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Giang",
  "Hà Nam",
  "Hà Tĩnh",
  "Hải Dương",
  "Hậu Giang",
  "Hòa Bình",
  "Hưng Yên",
  "Khánh Hòa",
  "Kiên Giang",
  "Kon Tum",
  "Lai Châu",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Long An",
  "Nam Định",
  "Nghệ An",
  "Ninh Bình",
  "Ninh Thuận",
  "Phú Thọ",
  "Phú Yên",
  "Quảng Bình",
  "Quảng Nam",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sóc Trăng",
  "Sơn La",
  "Tây Ninh",
  "Thái Bình",
  "Thái Nguyên",
  "Thanh Hóa",
  "Thừa Thiên Huế",
  "Tiền Giang",
  "Trà Vinh",
  "Tuyên Quang",
  "Vĩnh Long",
  "Vĩnh Phúc",
  "Yên Bái"
];

const worldCountries = [
  "Hoa Kỳ (Mỹ)", "Úc (Australia)", "Singapore", "Anh (UK)", "Nhật Bản", "Hàn Quốc", "Canada", "Lào",
  "Pháp", "Đức", "Trung Quốc", "Đài Loan", "Hồng Kông", "Thái Lan", "Malaysia", "Campuchia", "New Zealand",
  "Hà Lan", "Thụy Sĩ", "Ý (Italy)", "Nga", "Đan Mạch", "Thụy Điển", "Phần Lan", "Na Uy", "Tây Ban Nha",
  "Bỉ", "Áo", "Ireland", "Ấn Độ", "Philippines", "Indonesia", "Các Tiểu vương quốc Ả Rập Thống nhất (UAE)",
  "Saudi Arabia", "Qatar", "Ba Lan", "Cộng hòa Séc", "Hungary", "Hy Lạp", "Bồ Đào Nha", "Brazil", "Argentina",
  "Chile", "South Africa (Nam Phi)", "Ai Cập", "Thổ Nhĩ Kỳ", "Khác"
];

const defaultDanangSchools = [
  { name: "THCS và THPT Nguyễn Khuyến", schoolType: "PUBLIC" },
  { name: "THPT Phan Châu Trinh", schoolType: "PUBLIC" },
  { name: "THPT Trần Phú", schoolType: "PUBLIC" },
  { name: "THPT Thái Phiên", schoolType: "PUBLIC" },
  { name: "THPT Hoàng Hoa Thám", schoolType: "PUBLIC" },
  { name: "THPT Hòa Vang", schoolType: "PUBLIC" },
  { name: "THPT Nguyễn Trãi", schoolType: "PUBLIC" },
  { name: "THPT Ông Ích Khiêm", schoolType: "PUBLIC" },
  { name: "THPT Ngũ Hành Sơn", schoolType: "PUBLIC" },
  { name: "THPT Ngô Quyền", schoolType: "PUBLIC" },
  { name: "THPT Chuyên Lê Quý Đôn", schoolType: "PUBLIC" },
  { name: "TH, THCS & THPT Sky-Line", schoolType: "PRIVATE" },
  { name: "TH, THCS, THPT Hoàng Sa", schoolType: "PRIVATE" },
  { name: "TH, THCS, THPT FPT Đà Nẵng", schoolType: "PRIVATE" },
  { name: "Trường Tiểu học Phù Đổng", schoolType: "PUBLIC" },
  { name: "Trường Tiểu học Lý Công Uẩn", schoolType: "PUBLIC" },
  { name: "Trường Tiểu học Núi Thành", schoolType: "PUBLIC" },
  { name: "Trường Tiểu học Hoàng Dư Khưng", schoolType: "PUBLIC" },
  { name: "Trường Tiểu học Lê Đình Chinh", schoolType: "PUBLIC" },
  { name: "Trường Tiểu học Trần Đại Nghĩa", schoolType: "PUBLIC" },
  { name: "Trường THCS Kim Đồng", schoolType: "PUBLIC" },
  { name: "Trường THCS Tây Sơn", schoolType: "PUBLIC" },
  { name: "Trường THCS Lê Độ", schoolType: "PUBLIC" },
  { name: "Trường THCS Nguyễn Huệ", schoolType: "PUBLIC" },
  { name: "Trường THCS Lý Thường Kiệt", schoolType: "PUBLIC" },
  { name: "Trường THCS Nguyễn Bỉnh Khiêm", schoolType: "PUBLIC" }
];

const cleanBatchName = (name?: string | null) => {
  if (!name) return "-";
  const parts = name.split("|").map(p => p.trim());
  const uniqueParts = Array.from(new Set(parts));
  return uniqueParts.join(" | ");
};

export function StudentInfoClient({ 
  pageMode = "danh-sach",
  initialTab = "general",
  initialSubTab = "students",
  initialGeneralStudents = [], 
  initialPreschoolStudents = [],
  generalPeriods: rawGeneralPeriods = [],
  preschoolPeriods: rawPreschoolPeriods = [],
  activeYearName = "",
  activeYearId = "",
  configs = [],
  preschoolConfigs = [],
  eduSystems = [],
  campuses = [],
  grades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  
  academicYears = [],
  examBoardUsers = [],
  giaoVuCSUsers = [],
  gdcsUsers = [],
  subjects = [],
  teachers = [],
  departments = [],
  currentUser = null,
  rolePermissions = [],
  gradesPreschool = [],
  destinationSchools = []
}: StudentInfoClientProps) {
  useEffect(() => {
    console.log("--- StudentInfoClient VERSION 3.0 LOADED ---");
  }, []);

  const updateUrlParams = useCallback((newTab: string, newSubTab: string) => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", newTab);
      url.searchParams.set("subTab", newSubTab);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const generalPeriods = useMemo(() => {
    return rawGeneralPeriods.map((p: any) => ({
      ...p,
      batches: (p.batches || []).filter((b: any) => b.status === "ACTIVE")
    }));
  }, [rawGeneralPeriods]);

  const preschoolPeriods = useMemo(() => {
    return rawPreschoolPeriods.map((p: any) => ({
      ...p,
      batches: (p.batches || []).filter((b: any) => b.status === "ACTIVE")
    }));
  }, [rawPreschoolPeriods]);

  const [activeTab, setActiveTab] = useState<"general" | "preschool" | "transfer">(initialTab);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const isTransferStudent = useCallback((s: any) => {
    if (!s) return false;
    const periodName = (s.period?.name || "").toLowerCase();
    const criteria = (s.admissionCriteria || "").toLowerCase();
    const target = (s.targetType || "").toLowerCase();
    const batchName = (s.batch?.name || "").toLowerCase();
    return periodName.includes("chuyển hệ") || periodName.includes("chuyen he") ||
           criteria.includes("chuyển hệ") || criteria.includes("chuyen he") ||
           target.includes("chuyển hệ") || target.includes("chuyen he") ||
           batchName.includes("chuyen_he") || batchName.includes("chuyển hệ") ||
           Boolean(s.className && s.surveySystem && s.surveyFormType && s.surveySystem !== s.surveyFormType);
  }, []);

  const transferStudentsCount = useMemo(() => {
    return initialGeneralStudents.filter(isTransferStudent).length;
  }, [initialGeneralStudents, isTransferStudent]);

  const generalEntranceCount = useMemo(() => {
    return initialGeneralStudents.filter(s => !isTransferStudent(s)).length;
  }, [initialGeneralStudents, isTransferStudent]);

  const generalHeSCount = useMemo(() => {
    return initialGeneralStudents.filter(s => !isTransferStudent(s) && getStudentK12Track(s) === "HE_S").length;
  }, [initialGeneralStudents, isTransferStudent]);

  const generalHeICount = useMemo(() => {
    return initialGeneralStudents.filter(s => !isTransferStudent(s) && getStudentK12Track(s) === "HE_I").length;
  }, [initialGeneralStudents, isTransferStudent]);

  const [devAreas, setDevAreas] = useState<any[]>([]);
  const [devAreasLoading, setDevAreasLoading] = useState(false);
  const [preschoolInputAreas, setPreschoolInputAreas] = useState<any[]>([]);
  const [preschoolInputScores, setPreschoolInputScores] = useState<any[]>([]);
  const [preschoolInputLoading, setPreschoolInputLoading] = useState(false);
  const [preschoolAssignments, setPreschoolAssignments] = useState<any[]>([]);
  const [orientationTargetStudent, setOrientationTargetStudent] = useState<any | null>(null);
  const [pvdhTargetStudent, setPvdhTargetStudent] = useState<any | null>(null);
  const [exportingPvdhBatch, setExportingPvdhBatch] = useState<boolean>(false);
  const [reportTargetStudent, setReportTargetStudent] = useState<any | null>(null);
  const [activeReportOrientationData, setActiveReportOrientationData] = useState<any | null>(null);

  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedResult, setSelectedResult] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedCampusFilter, setSelectedCampusFilter] = useState("all");
  const [selectedEnrollmentFilter, setSelectedEnrollmentFilter] = useState("all");

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCampusFilter, selectedEnrollmentFilter]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selected student for details modal
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsSubTab, setDetailsSubTab] = useState<"results" | "admin" | "academic">("results");

  // Reset details subtab to overview when modal opens
  useEffect(() => {
    if (isDetailsOpen) {
      setDetailsSubTab("results");
    }
  }, [isDetailsOpen]);



  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isPreschoolMoveModalOpen, setIsPreschoolMoveModalOpen] = useState(false);

  const handleBulkMoveToBatch = async (targetPeriodId: string, targetBatchId: string) => {
    if (!targetPeriodId) {
      showNotification('Vui lòng chọn Kỳ khảo sát đích', 'error');
      return;
    }
    
    try {
      const isPreschool = activeTab === 'preschool';
      const endpoint = isPreschool ? '/api/preschool-input-assessment-students' : '/api/input-assessment-students';
      
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BULK_UPDATE_BATCH',
          ids: selectedIds,
          targetPeriodId,
          targetBatchId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi chuyển đợt khảo sát');
      
      showNotification(`Đã chuyển ${data.count} học sinh thành công!`, 'success');
      setSelectedIds([]);
      setIsMoveModalOpen(false);
      setIsPreschoolMoveModalOpen(false);
      // Reload page to reflect changes
      window.location.reload();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };


  // Add/Edit student modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formSubTab, setFormSubTab] = useState<"admin" | "academic" | "approval">("admin");

  // Reset form subtab when form modal opens
  useEffect(() => {
    if (isFormOpen) {
      setOldSchoolLevelFilter(activeTab === "preschool" ? "MAM_NON" : "PHO_THONG");
      setFormSubTab("admin");
    }
  }, [isFormOpen]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<any>({
    studentCode: "",
    fullName: "",
    dateOfBirth: "",
    gender: "Nam",
    grade: "",
    className: "",
    periodId: "",
    batchId: "",
    surveySystem: "",
    admissionCriteria: "",
    admissionCampus: "",
    admissionResult: "",
    directorNote: "",
    signatureName: "",
    surveyFormType: "",
    kqHocTap: "",
    kqRenLuyen: "",
    hoSoCtQuocTe: "",
    hocKy: "",
    targetType: "",
    kqgdTieuHoc: "",
    devProfessionalComment: "",
    devPsychologyComment: "",
    devImportantNote: "",
    devAssessmentResult: "",
    registeredCampus: "",
    isAbsent: false,
    cityName: "",
    districtName: "",
    wardName: "",
    countryName: "",
    oldSchoolName: "",
    oldSchoolType: ""
  });

  const [selectedLocationType, setSelectedLocationType] = useState<"Nội tỉnh" | "Ngoại tỉnh" | "Nước ngoài" | "">("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedWard, setSelectedWard] = useState<string>("");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [schoolNameInput, setSchoolNameInput] = useState<string>("");
  const [schoolTypeInput, setSchoolTypeInput] = useState<string>("");
  const [oldSchoolLevelFilter, setOldSchoolLevelFilter] = useState<"PHO_THONG" | "MAM_NON">("PHO_THONG");
  const [originalKqgd, setOriginalKqgd] = useState<string>("");

  // System transfer states
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [allClassesLoading, setAllClassesLoading] = useState(false);
  const [transferCampusId, setTransferCampusId] = useState("");
  const [transferYearId, setTransferYearId] = useState("");
  const [transferGradeId, setTransferGradeId] = useState("");
  const [transferClassId, setTransferClassId] = useState("");
  const [transferStudents, setTransferStudents] = useState<any[]>([]);
  const [transferStudentsLoading, setTransferStudentsLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [targetSystem, setTargetSystem] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  const selectedFormPeriod = useMemo(() => {
    return [...generalPeriods, ...preschoolPeriods].find(p => p.id === formState.periodId);
  }, [formState.periodId, generalPeriods, preschoolPeriods]);

  const isChuyenHe = useMemo(() => {
    if (!selectedFormPeriod) return false;
    const name = selectedFormPeriod.name?.toLowerCase() || "";
    return name.includes("chuyển hệ") || name.includes("chuyenhe") || name.includes("chuyen he");
  }, [selectedFormPeriod]);

  const filteredTransferStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return transferStudents;
    const q = studentSearchQuery.toLowerCase();
    return transferStudents.filter(s => 
      s.studentName?.toLowerCase()?.includes(q) || 
      s.studentCode?.toLowerCase()?.includes(q)
    );
  }, [transferStudents, studentSearchQuery]);

  const selectedClassObj = useMemo(() => {
    return allClasses.find((c) => c.id === transferClassId);
  }, [allClasses, transferClassId]);

  const filteredClasses = useMemo(() => {
    if (!transferCampusId || !transferYearId) return [];
    return allClasses.filter(c => 
      c.campusId === transferCampusId && 
      c.academicYearId === transferYearId &&
      (!transferGradeId || c.grade === transferGradeId)
    );
  }, [allClasses, transferCampusId, transferYearId, transferGradeId]);

  // Sync selectedLocationType when targetType changes
  useEffect(() => {
    if (!isFormOpen) return;
    const selectedTargets = formState.targetType ? formState.targetType.split(",").map((t) => t.trim()).filter(Boolean) : [];
    if (selectedTargets.includes("Nội tỉnh")) {
      setSelectedLocationType("Nội tỉnh"); setSelectedProvince("Thành phố Đà Nẵng");
    } else if (selectedTargets.includes("Ngoại tỉnh")) {
      setSelectedLocationType("Ngoại tỉnh");
    } else if (selectedTargets.includes("Nước ngoài")) {
      setSelectedLocationType("Nước ngoài");
    } else {
      setSelectedLocationType("");
    }
  }, [formState.targetType, isFormOpen]);

  // Parse kqgdTieuHoc when form opens
  useEffect(() => {
    if (isFormOpen) {
      if (formMode === "edit" && formState.kqgdTieuHoc) {
        const match = formState.kqgdTieuHoc.match(/Trường cũ:\s*(.*?)\s*\((.*?)\)\s*\|\s*Đối tượng:\s*(Nội tỉnh|Ngoại tỉnh|Nước ngoài)\s*-\s*(.*)/);
        if (match) {
          const [, sName, sType, locType, locDetail] = match;
          setSchoolNameInput(sName);
          setSchoolTypeInput(sType);
          setSelectedLocationType(locType);
          
                    if (locType === "Nội tỉnh") {
            const parts = locDetail.split(" - ");
            setSelectedDistrict("");
            setSelectedWard(parts[parts.length - 1].trim());
            setSelectedProvince("");
            setSelectedCountry("");
          } else if (locType === "Ngoại tỉnh") {
            const parts = locDetail.split(" - ");
            if (parts.length > 1) {
              setSelectedWard(parts[0].trim());
              setSelectedProvince(parts[1].trim());
            } else {
              setSelectedWard("");
              setSelectedProvince(locDetail.trim());
            }
            setSelectedDistrict("");
            setSelectedCountry("");
          } else if (locType === "Nước ngoài") {
            setSelectedCountry(locDetail.trim());
            setSelectedDistrict("");
            setSelectedWard("");
            setSelectedProvince("");
          }
          
          const lines = formState.kqgdTieuHoc.split("\n");
          if (lines.length > 1) {
            setOriginalKqgd(lines.slice(1).join("\n"));
          } else {
            setOriginalKqgd("");
          }
        } else {
          setSchoolNameInput("");
          setSchoolTypeInput("");
          setSelectedLocationType("");
          setSelectedDistrict("");
          setSelectedWard("");
          setSelectedProvince("");
          setSelectedCountry("");
          setOriginalKqgd(formState.kqgdTieuHoc || "");
        }
      } else {
        setSchoolNameInput("");
        setSchoolTypeInput("");
        setSelectedLocationType("");
        setSelectedDistrict("");
        setSelectedWard("");
        setSelectedProvince("");
        setSelectedCountry("");
        setOriginalKqgd("");
      }
    }
  }, [isFormOpen, formMode]);

    // Update formState when location inputs change
  useEffect(() => {
    if (!isFormOpen) return;
    
    if (selectedLocationType) {
      let locDetail = "";
      if (selectedLocationType === "Nội tỉnh") {
        locDetail = "Thành phố Đà Nẵng";
      } else if (selectedLocationType === "Ngoại tỉnh") {
        locDetail = selectedProvince;
      } else if (selectedLocationType === "Nước ngoài") {
        locDetail = selectedCountry;
      }
      
      const locationStr = `Trường cũ: ${schoolNameInput} (${schoolTypeInput}) | Đối tượng: ${selectedLocationType} - ${locDetail}`;
      const finalKq = originalKqgd ? `${locationStr}\n${originalKqgd}` : locationStr;
      
      setFormState(prev => {
        const cityName = selectedLocationType === "Nội tỉnh" ? "Thành phố Đà Nẵng" : (selectedLocationType === "Ngoại tỉnh" ? selectedProvince : "");
        const countryName = selectedLocationType === "Nước ngoài" ? selectedCountry : "Việt Nam";
        const districtName = "";
        const wardName = (selectedLocationType === "Nội tỉnh" || selectedLocationType === "Ngoại tỉnh") ? selectedWard : "";
        
        return {
          ...prev,
          kqgdTieuHoc: finalKq,
          cityName,
          districtName,
          wardName,
          countryName,
          oldSchoolName: schoolNameInput,
          oldSchoolType: schoolTypeInput
        };
      });
    } else {
      setFormState(prev => {
        return {
          ...prev,
          kqgdTieuHoc: originalKqgd,
          cityName: "",
          districtName: "",
          wardName: "",
          countryName: "",
          oldSchoolName: "",
          oldSchoolType: ""
        };
      });
    }
  }, [selectedLocationType, selectedDistrict, selectedWard, selectedProvince, selectedCountry, schoolNameInput, schoolTypeInput, originalKqgd, isFormOpen]);


  // Import excel modal states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPeriodId, setImportPeriodId] = useState("");
  const [importBatchId, setImportBatchId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [studentPsychReferralInfo, setStudentPsychReferralInfo] = useState<any>(null);

  useEffect(() => {
    if (isDetailsOpen && activeTab !== "preschool" && selectedStudent?.id) {
      fetch(`/api/admin/orientation/psychology-referral?studentId=${encodeURIComponent(selectedStudent.id)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success) {
            setStudentPsychReferralInfo(data);
          } else {
            setStudentPsychReferralInfo(null);
          }
        })
        .catch(() => setStudentPsychReferralInfo(null));
    } else {
      setStudentPsychReferralInfo(null);
    }
  }, [isDetailsOpen, activeTab, selectedStudent?.id]);

  useEffect(() => {
    if (isDetailsOpen && activeTab === "preschool" && selectedStudent) {
      const fetchDevAreas = async () => {
        setDevAreasLoading(true);
        try {
          const ageGroup = getProbationAgeGroup(selectedStudent.grade);
          const res = await fetch(`/api/preschool-dev-areas?type=PROBATION&ageGroup=${encodeURIComponent(ageGroup)}`);
          if (res.ok) {
            const data = await res.json();
            setDevAreas(data);
          }
        } catch (err) {
          console.error("Error fetching dev areas:", err);
        } finally {
          setDevAreasLoading(false);
        }
      };

      const fetchInputData = async () => {
        setPreschoolInputLoading(true);
        try {
          const ageGroup = getSurveyFormAgeGroup(selectedStudent.grade, selectedStudent.batch?.startDate);
          
          // 1. Fetch input areas
          const resAreas = await fetch(`/api/preschool-dev-areas?type=INPUT&ageGroup=${encodeURIComponent(ageGroup)}`);
          if (resAreas.ok) {
            const dataAreas = await resAreas.json();
            setPreschoolInputAreas(dataAreas);
          }

          // 2. Fetch input scores
          const resScores = await fetch(`/api/preschool-dev-scores?studentId=${selectedStudent.id}`);
          if (resScores.ok) {
            const dataScores = await resScores.json();
            setPreschoolInputScores(dataScores);
          }

          // 3. Fetch teacher assignments
          const targetPeriodId = selectedStudent.periodId;
          const targetBatchId = selectedStudent.batchId;
          let assignUrl = `/api/preschool-input-assessment-assignments?periodId=${targetPeriodId}`;
          if (targetBatchId) {
            assignUrl += `&batchId=${targetBatchId}`;
          }
          if (ageGroup) {
            assignUrl += `&grade=${encodeURIComponent(ageGroup)}`;
          }
          const assignRes = await fetch(assignUrl);
          if (assignRes.ok) {
            const assignmentsData = await assignRes.json();
            setPreschoolAssignments(assignmentsData);
          }
        } catch (err) {
          console.error("Error fetching input dev scores/assignments:", err);
        } finally {
          setPreschoolInputLoading(false);
        }
      };

      fetchDevAreas();
      fetchInputData();
    } else {
      setDevAreas([]);
      setPreschoolInputAreas([]);
      setPreschoolInputScores([]);
      setPreschoolAssignments([]);
    }
  }, [isDetailsOpen, activeTab, selectedStudent]);
  const getApprovalStatusText = (status) => {
    if (!status) return "Chưa duyệt";
    if (status === "DAT") return "Đạt";
    if (status === "DAT_MIEN_HOC_THU") return "Đạt - Miễn Học Thử";
    if (status === "DAT_HOC_THU") return "Đạt - Học Thử";
    if (status === "KHONG_DAT") return "Không đạt";
    if (status === "Y_KIEN_KHAC") return "Ý kiến khác";
    return status;
  };

  const getAssignedTeachersText = () => {
    if (!selectedStudent) return "";
    if (preschoolInputLoading && !preschoolAssignments.length) return "Đang tải...";
    if (!preschoolAssignments.length) return "Chưa phân công";

    const ageGroup = getSurveyFormAgeGroup(selectedStudent.grade, selectedStudent.batch?.startDate);
    const dateObj = selectedStudent.batch?.startDate ? new Date(selectedStudent.batch.startDate) : null;
    const isStage2 = dateObj ? (!isNaN(dateObj.getTime()) && dateObj.getMonth() >= 0 && dateObj.getMonth() <= 4) : false;

    const matches = preschoolAssignments.filter(a => {
      const studentPeriodId = selectedStudent.periodId;
      if (a.periodId !== studentPeriodId) return false;
      
      const ag = (a.grade || "").trim();
      const form = (ageGroup || "").trim();
      let isMatch = ag === form;
      if (ag === "Nhà trẻ 12-18 tháng" && form === "12 đến 18 tháng") isMatch = true;
      else if (ag === "Nhà trẻ 18-24 tháng" && form === "18 đến 24 tháng") isMatch = true;
      else if (ag === "Nhà trẻ 24-36 tháng") {
        if (isStage2 && form === "24 đến 36 tháng") isMatch = true;
        if (!isStage2 && form === "18 đến 24 tháng") isMatch = true;
      }
      else if (ag === "Nhà trẻ" && ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng"].includes(form)) {
        isMatch = true;
      }
      if (isStage2) {
        if (form === "12 đến 18 tháng" && ag === "12 đến 18 tháng") isMatch = true;
        else if (form === "18 đến 24 tháng" && ag === "18 đến 24 tháng") isMatch = true;
        else if (form === "24 đến 36 tháng" && ag === "24 đến 36 tháng") isMatch = true;
        else if (form === "3 đến 4 tuổi" && (ag === "Mẫu giáo bé" || ag === "3 đến 4 tuổi")) isMatch = true;
        else if (form === "4 đến 5 tuổi" && (ag === "Mẫu giáo nhỡ" || ag === "4 đến 5 tuổi")) isMatch = true;
        else if (form === "5 đến 6 tuổi" && (ag === "Mẫu giáo lớn" || ag === "5 đến 6 tuổi")) isMatch = true;
      } else {
        if (form === "12 đến 18 tháng" && ag === "12 đến 18 tháng") isMatch = true;
        else if (form === "18 đến 24 tháng" && (ag === "18 đến 24 tháng" || ag === "24 đến 36 tháng")) isMatch = true;
        else if (form === "24 đến 36 tháng" && (ag === "Mẫu giáo bé" || ag === "3 đến 4 tuổi")) isMatch = true;
        else if (form === "3 đến 4 tuổi" && (ag === "Mẫu giáo nhỡ" || ag === "4 đến 5 tuổi")) isMatch = true;
        else if (form === "4 đến 5 tuổi" && (ag === "Mẫu giáo lớn" || ag === "5 đến 6 tuổi")) isMatch = true;
      }

      if (!isMatch) return false;
      return !a.batchId || a.batchId === selectedStudent.batchId;
    });

    if (matches.length === 0) return "Chưa phân công";
    const names = Array.from(new Set(matches.map(m => m.user?.fullName || "Chưa rõ"))).filter(Boolean);
    return names.length > 0 ? names.join(", ") : "Chưa phân công";
  };

  const renderInputDevScores = () => {
    if (preschoolInputLoading) {
      return (
        <div className="flex items-center gap-1.5 py-1 text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00A19A]" />
          <span className="text-xs text-slate-500 font-medium">Đang tải dữ liệu tiêu chí...</span>
        </div>
      );
    }

    if (!preschoolInputScores || preschoolInputScores.length === 0) {
      return <span className="text-xs text-slate-400">Chưa có kết quả tiêu chí khảo sát.</span>;
    }

    const scoresByArea = {};
    preschoolInputScores.forEach((sc) => {
      const areaName = sc.criteria?.area?.name || "Chưa phân loại";
      const areaId = sc.criteria?.area?.id || "unknown";
      if (!scoresByArea[areaId]) {
        scoresByArea[areaId] = { areaName, scores: [] };
      }
      scoresByArea[areaId].scores.push(sc);
    });

    return (
      <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1 mt-1 text-xs">
        {Object.entries(scoresByArea).map(([areaId, areaData]) => (
          <div key={areaId} className="p-2.5 space-y-1.5 text-xs font-semibold">
            <div className="font-bold text-[#00A19A] text-[10px] uppercase tracking-wider">{areaData.areaName}</div>
            <div className="space-y-1">
              {areaData.scores.map((sc) => {
                const resText = sc.result === "DAT" ? "Đạt" : 
                                sc.result === "KHONG_DAT" ? "Không đạt" : 
                                sc.result === "CHUA_THE_HIEN" ? "Chưa thể hiện" : sc.result || "Chưa đánh giá";
                const badgeColor = sc.result === "DAT" ? "bg-emerald-50 text-emerald-700" :
                                   sc.result === "KHONG_DAT" ? "bg-rose-50 text-rose-700" :
                                   sc.result === "CHUA_THE_HIEN" ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500";
                
                return (
                  <div key={sc.id} className="flex items-start justify-between gap-4 py-1 border-b border-slate-100/50 last:border-0">
                    <div className="flex-1">
                      <div className="font-medium text-slate-700 leading-snug">{sc.criteria?.name || "Tiêu chí"}</div>
                      {sc.note && <div className="text-[10px] text-slate-400 italic mt-0.5">Ghi chú: {sc.note}</div>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold whitespace-nowrap ${badgeColor}`}>
                      {resText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };
  const renderProbationaryScores = () => {
    if (!selectedStudent.probationaryScoreText) return <span className="text-xs text-slate-400">—</span>;

    let scores = {};
    try {
      scores = JSON.parse(selectedStudent.probationaryScoreText);
    } catch (e) {
      return <span className="text-xs text-rose-500 font-mono">Lỗi định dạng điểm</span>;
    }

    if (devAreasLoading) {
      return (
        <div className="flex items-center gap-1.5 py-1 text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
          <span className="text-xs text-slate-500 font-medium">Đang tải dữ liệu tiêu chí...</span>
        </div>
      );
    }

    if (devAreas.length === 0) {
      return (
        <div className="text-xs space-y-1 text-slate-650 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {Object.entries(scores).map(([critId, score]) => {
            const resText = score.result === "THE_HIEN_TOT" ? "Thể hiện tốt" : 
                            score.result === "BAT_DAU_THE_HIEN" ? "Bắt đầu thể hiện" : 
                            score.result === "CHUA_THE_HIEN" ? "Chưa thể hiện" : score.result || "Chưa đánh giá";
            return (
              <div key={critId} className="flex justify-between border-b border-slate-100 py-1">
                <span className="font-mono text-[10px] text-slate-450">{critId}</span>
                <span className="font-semibold text-slate-700">{resText}</span>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1 mt-1 text-xs">
        {devAreas.map((area) => {
          const areaCriteria = area.criteria || [];
          const hasScoresInArea = areaCriteria.some((c) => scores[c.id]);
          if (!hasScoresInArea) return null;

          return (
            <div key={area.id} className="p-2.5 space-y-1.5 text-xs font-semibold">
              <div className="font-bold text-teal-800 text-[10px] uppercase tracking-wider">{area.name}</div>
              <div className="space-y-1">
                {areaCriteria.map((crit) => {
                  const score = scores[crit.id];
                  if (!score) return null;

                  const resText = score.result === "THE_HIEN_TOT" ? "Thể hiện tốt" : 
                                  score.result === "BAT_DAU_THE_HIEN" ? "Bắt đầu thể hiện" : 
                                  score.result === "CHUA_THE_HIEN" ? "Chưa thể hiện" : score.result || "Chưa đánh giá";
                  
                  const badgeColor = score.result === "THE_HIEN_TOT" ? "bg-emerald-50 text-emerald-700" :
                                     score.result === "BAT_DAU_THE_HIEN" ? "bg-amber-50 text-amber-700" :
                                     score.result === "CHUA_THE_HIEN" ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-500";

                  return (
                    <div key={crit.id} className="flex items-start justify-between gap-4 py-1 border-b border-slate-100/50 last:border-0">
                      <div className="flex-1">
                        <div className="font-medium text-slate-700 leading-snug">{crit.name}</div>
                        {score.note && <div className="text-[10px] text-slate-400 italic mt-0.5">Ghi chú: {score.note}</div>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold whitespace-nowrap ${badgeColor}`}>
                        {resText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  const effectiveInitialSubTab = useMemo<"periods" | "students" | "students_s" | "students_i" | "handover" | "batch" | "info" | "result">(() => {
    if (pageMode === "ket-qua") {
      if (initialSubTab === "result") return "result";
      if (initialSubTab === "info") return "info";
      return "batch";
    }
    if (initialSubTab === "periods") return "periods";
    if (initialSubTab === "handover") return "handover";
    if (initialTab === "general") {
      return initialSubTab === "students_i" ? "students_i" : "students_s";
    }
    return "students";
  }, [pageMode, initialSubTab, initialTab]);

  const [subTab, setSubTab] = useState<"periods" | "students" | "students_s" | "students_i" | "handover" | "batch" | "info" | "result">(effectiveInitialSubTab);

  useEffect(() => {
    setSubTab(effectiveInitialSubTab);
  }, [effectiveInitialSubTab]);

  useEffect(() => {
    setSelectedIds([]);
  }, [subTab, activeTab]);

  // Fetch classes for active academic year when modal is open and isChuyenHe is true
  useEffect(() => {
    if (isFormOpen && activeYearId && allClasses.length === 0 && !allClassesLoading) {
      setAllClassesLoading(true);
      fetch(`/api/classes?academicYearId=${activeYearId}`)
        .then(res => res.json())
        .then(data => {
          setAllClasses(data);
          setAllClassesLoading(false);
        })
        .catch(err => {
          console.error("Error fetching classes:", err);
          setAllClassesLoading(false);
        });
    }
  }, [isFormOpen, activeYearId, allClasses.length, allClassesLoading]);

  // Fetch students of the selected class
  useEffect(() => {
    if (transferClassId && activeYearId) {
      setTransferStudentsLoading(true);
      fetch(`/api/students/search?academicYearId=${activeYearId}&classId=${transferClassId}`)
        .then(res => res.json())
        .then(data => {
          setTransferStudents(data);
          setTransferStudentsLoading(false);
        })
        .catch(err => {
          console.error("Error fetching class students:", err);
          setTransferStudentsLoading(false);
        });
    } else {
      setTransferStudents([]);
    }
  }, [transferClassId, activeYearId]);
  
  const currentEduSystems = useMemo(() => {
    if (!activeYearId) return eduSystems;
    return eduSystems.filter((es: any) => es.academicYearId === activeYearId);
  }, [eduSystems, activeYearId]);

  // Feedback notifications
  const [notification, setNotification] = useState<{ text: string; type: "success" | "err" } | null>(null);

  // Retest registration states
  const [retestStudent, setRetestStudent] = useState<any | null>(null);
  const [retestPeriodId, setRetestPeriodId] = useState("");
  const [retestBatchId, setRetestBatchId] = useState("");
  const [retestRegisterLoading, setRetestRegisterLoading] = useState(false);
  const [selectedRetestFilter, setSelectedRetestFilter] = useState<"all" | "pending" | "registered">("all");
  const [selectedBatchStatusFilter, setSelectedBatchStatusFilter] = useState<"all" | "pending" | "passed" | "committed" | "failed" | "absent">("all");
  const [isBatchRetestOpen, setIsBatchRetestOpen] = useState(false);
  const [batchRetestPeriodId, setBatchRetestPeriodId] = useState("");
  const [batchRetestBatchId, setBatchRetestBatchId] = useState("");
  const [batchRetestLoading, setBatchRetestLoading] = useState(false);

  const showNotification = (text: string, type: "success" | "err" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Reset filters when changing tab
  const handleTabChange = (tab: "general" | "preschool" | "transfer") => {
    setActiveTab(tab);
    let nextSub = subTab;
    if (pageMode !== "ket-qua") {
      if (tab === "general" && subTab === "students") {
        nextSub = "students_s";
      } else if (tab !== "general" && (subTab === "students_s" || subTab === "students_i")) {
        nextSub = "students";
      }
      if (nextSub !== subTab) setSubTab(nextSub);
    }
    updateUrlParams(tab, nextSub);
    setSearchQuery("");
    setSelectedPeriod("");
    setSelectedBatch("");
    setSelectedResult("");
    setSelectedGrade("");
    setSelectedEnrollmentFilter("all");
    setSelectedBatchStatusFilter("all");
    setSelectedIds([]);
    setCurrentPage(1);
  };

  const handleSubTabChange = (newSub: "periods" | "students" | "students_s" | "students_i" | "handover" | "batch" | "info" | "result") => {
    setSubTab(newSub);
    updateUrlParams(activeTab, newSub);
    setSelectedIds([]);
    setCurrentPage(1);
  };

  // Get active dataset
  const currentDataset = useMemo(() => {
    if (activeTab === "preschool") return initialPreschoolStudents;
    if (activeTab === "transfer") return initialGeneralStudents.filter(isTransferStudent);
    return initialGeneralStudents.filter(s => !isTransferStudent(s));
  }, [activeTab, initialGeneralStudents, initialPreschoolStudents, isTransferStudent]);

  // Extract unique periods, batches, grades for filter options
  const filterOptions = useMemo(() => {
    const periods = new Set<string>();
    const batches = new Set<string>();
    const grades = new Set<string>();
    const results = new Set<string>();

    currentDataset.forEach((student) => {
      if (student.period?.name) periods.add(student.period.name);
      if (student.batch?.name) batches.add(student.batch.name);
      if (student.grade) grades.add(student.grade);
      if (student.admissionResult) results.add(student.admissionResult);
    });

    return {
      periods: Array.from(periods).sort(),
      batches: Array.from(batches).sort(),
      grades: Array.from(grades).sort((a, b) => {
        const na = parseInt(a);
        const nb = parseInt(b);
        if (isNaN(na) || isNaN(nb)) return a.localeCompare(b);
        return na - nb;
      }),
      results: Array.from(results).sort()
    };
  }, [currentDataset]);

  // Filtered dataset
  const resolveStudentCampusId = useCallback((s: any) => {
    // 1. If s.registeredCampus matches a campus ID or name
    if (s.registeredCampus) {
      const matchingCampus = campuses.find(c => c.id === s.registeredCampus || c.campusName === s.registeredCampus || c.campusCode === s.registeredCampus);
      if (matchingCampus) return matchingCampus.id;
    }
    
    // 2. Check admissionCampus
    if (s.admissionCampus) {
      const tc = campuses.find(c => c.id === s.admissionCampus || c.campusName === s.admissionCampus || c.campusCode === s.admissionCampus);
      if (tc) return tc.id;
    }
    
    // 3. Fallback to batch/period campusId directly on student or periods list
    const directCampusId = s.batch?.campusId || s.period?.campusId;
    if (directCampusId) {
      const tc = campuses.find(c => c.id === directCampusId);
      if (tc) return tc.id;
    }
    if (s.batchId) {
      const b = preschoolPeriods.flatMap(p => p.batches || []).concat(generalPeriods.flatMap(p => p.batches || [])).find(bx => bx.id === s.batchId);
      if (b?.campusId) {
        const tc = campuses.find(c => c.id === b.campusId);
        if (tc) return tc.id;
      }
    }
    
    // 4. Try string match on admissionCampus / batch name
    const campusName = `${s.admissionCampus || ""} ${s.batch?.name || ""}`;
    let code = null;
    if (campusName.includes("CS1") || campusName.includes("Cơ sở 1")) code = "CS1";
    else if (campusName.includes("CS2") || campusName.includes("Cơ sở 2")) code = "CS2";
    else if (campusName.includes("CS3") || campusName.includes("Cơ sở 3")) code = "CS3";
    else if (campusName.includes("CS4") || campusName.includes("Cơ sở 4")) code = "CS4";
    else if (campusName.includes("CS5") || campusName.includes("Cơ sở 5")) code = "CS5";
    
    if (code) {
      const tc = campuses.find(c => c.campusCode === code);
      if (tc) return tc.id;
    }
    
    return "unassigned";
  }, [campuses, generalPeriods, preschoolPeriods]);

  const resolveCampusShortName = useCallback((s: any) => {
    const cid = resolveStudentCampusId(s);
    const campusObj = campuses.find(c => c.id === cid);
    if (campusObj) {
      return campusObj.campusCode || campusObj.campusName?.replace("Cơ sở ", "CS") || campusObj.campusName;
    }
    if (s.admissionCampus && !/^(cm|cl)[a-z0-9]{15,}$/i.test(String(s.admissionCampus))) {
      return s.admissionCampus;
    }
    if (s.registeredCampus && !/^(cm|cl)[a-z0-9]{15,}$/i.test(String(s.registeredCampus))) {
      return s.registeredCampus;
    }
    return "—";
  }, [campuses, resolveStudentCampusId]);

  const getStudentSurveyPills = useCallback((student: any) => {
    const pills: { key: string; label: string; value: string; tone: "emerald" | "teal" | "amber" | "rose" | "slate" }[] = [];

    if (activeTab === "preschool") {
      if (student?.devAssessmentResult) {
        const res = String(student.devAssessmentResult).trim();
        const isPass = res.toLowerCase().includes("đạt") && !res.toLowerCase().includes("không");
        const isFail = res.toLowerCase().includes("không đạt") || res.toLowerCase().includes("chưa đạt");
        pills.push({
          key: "dev-res",
          label: "Đánh giá KS",
          value: res,
          tone: isPass ? "emerald" : isFail ? "rose" : "teal"
        });
      }
      if (student?.probationaryResult) {
        pills.push({
          key: "prob-res",
          label: "Học thử",
          value: String(student.probationaryResult),
          tone: "teal"
        });
      }
      if (student?.bghApprovalStatus) {
        pills.push({
          key: "bgh-status",
          label: "BGH",
          value: getApprovalStatusText(student.bghApprovalStatus),
          tone: student.bghApprovalStatus.includes("DAT") && !student.bghApprovalStatus.includes("KHONG") ? "emerald" : "amber"
        });
      }
      if (student?.devProfessionalComment) {
        const cleanComment = String(student.devProfessionalComment).trim();
        if (cleanComment) {
          pills.push({
            key: "prof-cmt",
            label: "Chuyên môn",
            value: cleanComment.length > 22 ? cleanComment.slice(0, 20) + "…" : cleanComment,
            tone: "slate"
          });
        }
      }
      return pills;
    }

    const rawScores = Array.isArray(student?.scores) ? student.scores : [];
    const gradeNum = parseInt(String(student?.grade || "0").replace(/\D/g, ""), 10) || 1;

    rawScores.forEach((sc: any, idx: number) => {
      const sub = sc?.subject || {};
      const sName = String(sub.name || "Môn KS").trim();
      const sNameLower = sName.toLowerCase().normalize("NFC");
      const sCode = String(sub.code || "").toLowerCase();

      if (sCode.includes("pdh") || sCode.includes("orientation") || sNameLower.includes("định hướng")) {
        pills.push({ key: sc.id || `ori-${idx}`, label: "Định hướng", value: "Đã cập nhật", tone: "teal" });
        return;
      }

      const isTci = sCode.includes("tci") || sCode.includes("cpt") || sNameLower.includes("chuẩn phát triển");
      let vArr: any[] = [];
      try {
        if (sc.scores) {
          const p = JSON.parse(sc.scores);
          vArr = Array.isArray(p) ? p : [p];
        }
      } catch {
        vArr = sc.scores ? [sc.scores] : [];
      }

      if (isTci) {
        let tciMeta: any = null;
        if (sc.comments) {
          try {
            const pc = JSON.parse(sc.comments);
            const cArr = Array.isArray(pc) ? pc : [pc];
            for (const item of cArr) {
              if (typeof item === "string" && item.includes('"_tciMeta"')) {
                const m = JSON.parse(item);
                if (m?._tciMeta) tciMeta = m._tciMeta;
              }
            }
          } catch {}
        }
        const passed = tciMeta?.countDat ?? vArr.filter(x => ["3", "Đạt", "DAT"].includes(String(x ?? "").trim())).length;
        const total = vArr.length > 0 ? vArr.length : 16;
        pills.push({
          key: sc.id || `tci-${idx}`,
          label: "TCI",
          value: `${passed}/${total} Đạt`,
          tone: passed >= total * 0.7 ? "emerald" : "amber"
        });
        return;
      }

      if (sCode.includes("tly") || sNameLower.includes("tâm lý")) {
        const scNum = parseFloat(vArr[6] || vArr[20] || vArr[0] || "0");
        const lvl = scNum <= 15 ? "Ổn định" : scNum <= 31 ? "Nhẹ" : scNum <= 47 ? "Vừa" : "Nguy cơ cao";
        pills.push({
          key: sc.id || `tly-${idx}`,
          label: "Tâm lý",
          value: lvl,
          tone: scNum <= 15 ? "emerald" : scNum <= 47 ? "amber" : "rose"
        });
        return;
      }

      if (sCode.includes("nltd") || sNameLower.includes("năng lực tư duy")) {
        const pctVal = vArr.length >= 5 ? vArr[4] : vArr[0];
        if (pctVal !== undefined && pctVal !== null && String(pctVal).trim() !== "") {
          const pct = parseFloat(String(pctVal));
          pills.push({
            key: sc.id || `nltd-${idx}`,
            label: "Tư duy",
            value: `${pctVal}%`,
            tone: !isNaN(pct) && pct >= 75 ? "emerald" : !isNaN(pct) && pct >= 50 ? "teal" : "amber"
          });
        }
        return;
      }

      const firstVal = vArr.find(x => x !== undefined && x !== null && String(x).trim() !== "");
      if (firstVal === undefined) return;

      let shortLabel = sName
        .replace(/^Tiếng Anh\s*\((.*?)\)$/i, "TA $1")
        .replace(/^Tiếng Anh\s*-\s*/i, "TA ")
        .replace(/^Tiếng Anh$/i, "Tiếng Anh")
        .replace(/^Tiếng Việt$/i, "Tiếng Việt")
        .replace(/^Ngữ văn$/i, "Ngữ văn");
      if (shortLabel.length > 16) shortLabel = shortLabel.slice(0, 15) + "…";

      let valDisplay = String(firstVal);
      if (sNameLower.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl")) {
        const oralMax = gradeNum === 2 ? 10 : gradeNum >= 7 ? 20 : 30;
        const writMax = gradeNum >= 7 ? 80 : 70;
        if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || sCode.includes("vd") || sCode.includes("speaking")) {
          shortLabel = "TA nói";
          const num = parseFloat(valDisplay);
          const denom = !isNaN(num) && num <= 10 && gradeNum <= 5 ? 10 : !isNaN(num) && num > oralMax ? 100 : oralMax;
          valDisplay = `${valDisplay}/${denom}`;
        } else if (sNameLower.includes("viết") || sCode.includes("vt") || sCode.includes("writing")) {
          shortLabel = "TA viết";
          const num = parseFloat(valDisplay);
          const denom = !isNaN(num) && num > writMax ? 100 : writMax;
          valDisplay = `${valDisplay}/${denom}`;
        }
      }

      pills.push({
        key: sc.id || `sub-${idx}`,
        label: shortLabel,
        value: valDisplay,
        tone: "teal"
      });
    });

    // Fallback legacy scalar score fields on InputAssessmentStudent if scores relation is empty
    if (pills.length === 0) {
      if (student?.mathScore !== null && student?.mathScore !== undefined && String(student.mathScore).trim() !== "") {
        pills.push({ key: "fb-math", label: "Toán", value: String(student.mathScore), tone: "teal" });
      }
      if (student?.literatureScore !== null && student?.literatureScore !== undefined && String(student.literatureScore).trim() !== "") {
        pills.push({ key: "fb-lit", label: gradeNum <= 5 ? "Tiếng Việt" : "Ngữ văn", value: String(student.literatureScore), tone: "teal" });
      }
      if (student?.writtenEnglishScore !== null && student?.writtenEnglishScore !== undefined && String(student.writtenEnglishScore).trim() !== "") {
        pills.push({ key: "fb-eng-w", label: "TA viết", value: String(student.writtenEnglishScore), tone: "teal" });
      }
      if (student?.oralEnglishScore !== null && student?.oralEnglishScore !== undefined && String(student.oralEnglishScore).trim() !== "") {
        pills.push({ key: "fb-eng-o", label: "TA nói", value: String(student.oralEnglishScore), tone: "teal" });
      }
      if (student?.psychologyScore !== null && student?.psychologyScore !== undefined && String(student.psychologyScore).trim() !== "") {
        pills.push({ key: "fb-psy", label: "Tâm lý", value: String(student.psychologyScore), tone: "teal" });
      }
    }

    return pills;
  }, [activeTab]);

  const extractCommittedSubjectsSummary = useCallback((directorNote?: string | null) => {
    if (!directorNote) return "";
    const cleanNote = String(directorNote).split("\n---LICH_SU_DUYET---")[0].trim();
    const commMatch = cleanNote.match(/Môn (?:cam kết|kiểm tra lại):\s*\[(.*?)\]/i);
    return commMatch?.[1] || "";
  }, []);

  const filteredStudents = useMemo(() => {
    return currentDataset.filter((student) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = student.fullName?.toLowerCase().includes(query);
        const matchesCode = student.studentCode?.toLowerCase().includes(query);
        if (!matchesName && !matchesCode) return false;
      }
      if (selectedPeriod && student.period?.name !== selectedPeriod) return false;
      if (selectedBatch) {
        if (selectedBatch === "UNASSIGNED") {
          if (student.batch?.name) return false;
        } else if (student.batch?.name !== selectedBatch) {
          return false;
        }
      }
      if (selectedResult && student.admissionResult !== selectedResult) return false;
      if (selectedGrade && student.grade !== selectedGrade) return false;

      // Filter by enrollment status (for subTab === "result")
      if (subTab === "result" && selectedEnrollmentFilter && selectedEnrollmentFilter !== "all") {
        const isEnrolled = student.enrollmentStatus === "COMPLETED" || student.enrollmentStatus === "ENROLLED" || student.enrollmentStatus === "PENDING" || !!student.enrollmentClass || !!student.enrollmentClassId;
        if (selectedEnrollmentFilter === "enrolled" && !isEnrolled) return false;
        if (selectedEnrollmentFilter === "not_enrolled" && isEnrolled) return false;
      }

      // Filter by batch approval status (for subTab === "batch")
      if (subTab === "batch" && selectedBatchStatusFilter !== "all") {
        const res = String(student.admissionResult || "");
        const isPending = !res && !student.isAbsent;
        const isPassedStandard = res === "Đạt" || (res.includes("Đạt") && !res.includes("Không") && !res.includes("cam kết"));
        const isCommitted = res.includes("cam kết") || res === "Học thử";
        const isFailed = res.includes("Không đạt");

        if (selectedBatchStatusFilter === "pending" && !isPending) return false;
        if (selectedBatchStatusFilter === "passed" && !isPassedStandard) return false;
        if (selectedBatchStatusFilter === "committed" && !isCommitted) return false;
        if (selectedBatchStatusFilter === "failed" && !isFailed) return false;
        if (selectedBatchStatusFilter === "absent" && !student.isAbsent) return false;
      }

      // Filter by campus
      if (selectedCampusFilter && selectedCampusFilter !== "all") {
        const resolvedCampusId = resolveStudentCampusId(student);
        const matchesCampus = resolvedCampusId === selectedCampusFilter || 
                              student.admissionCampus === selectedCampusFilter || 
                              student.registeredCampus === selectedCampusFilter;
        if (!matchesCampus) return false;
      }

      // Filter strictly by "Không đạt - Kiểm tra lại" for the "TT Khảo sát lại" sub-tab (subTab === "info")
      if (subTab === "info") {
        if (student.admissionResult !== "Không đạt - Kiểm tra lại") return false;

        // Filter by retest registration status
        if (selectedRetestFilter === "pending") {
          const isReg = currentDataset.some(o => o.studentCode === student.studentCode && o.id !== student.id);
          if (isReg) return false;
        } else if (selectedRetestFilter === "registered") {
          const isReg = currentDataset.some(o => o.studentCode === student.studentCode && o.id !== student.id);
          if (!isReg) return false;
        }
      }

      return true;
    });
  }, [currentDataset, searchQuery, selectedPeriod, selectedBatch, selectedResult, selectedGrade, selectedCampusFilter, selectedEnrollmentFilter, selectedBatchStatusFilter, selectedRetestFilter, subTab, resolveStudentCampusId]);

  // Reset selected checkboxes if filtered dataset changes
  useEffect(() => {
    setSelectedIds([]);
  }, [filteredStudents]);

  // Statistics for Batch Results tab (subTab === "batch")
  const batchStats = useMemo(() => {
    let total = 0;
    let hasScores = 0;
    let passedStandard = 0;
    let committedOrProbation = 0;
    let failed = 0;
    let pending = 0;
    let absent = 0;

    filteredStudents.forEach(s => {
      total++;
      const pills = getStudentSurveyPills(s);
      if (pills.length > 0) hasScores++;
      const res = String(s.admissionResult || "");
      if (s.isAbsent) {
        absent++;
      } else if (!res) {
        pending++;
      } else if (res === "Đạt" || (res.includes("Đạt") && !res.includes("Không") && !res.includes("cam kết"))) {
        passedStandard++;
      } else if (res.includes("cam kết") || res === "Học thử") {
        committedOrProbation++;
      } else if (res.includes("Không đạt")) {
        failed++;
      } else {
        pending++;
      }
    });

    return { total, hasScores, passedStandard, committedOrProbation, failed, pending, absent };
  }, [filteredStudents, getStudentSurveyPills]);

  // Statistics for Retest tab (subTab === "info")
  const retestStats = useMemo(() => {
    const allRetest = currentDataset.filter(s => s.admissionResult === "Không đạt - Kiểm tra lại");
    let registered = 0;
    let pending = 0;
    allRetest.forEach(s => {
      const isReg = currentDataset.some(o => o.studentCode === s.studentCode && o.id !== s.id);
      if (isReg) registered++;
      else pending++;
    });
    return {
      total: allRetest.length,
      registered,
      pending,
      rate: allRetest.length > 0 ? Math.round((registered / allRetest.length) * 100) : 0
    };
  }, [currentDataset]);

  // Statistics
  const statistics = useMemo(() => {
    const total = filteredStudents.length;
    let passed = 0;
    let failed = 0;
    let pending = 0;
    let enrolled = 0;
    let requestedEnrollment = 0;

    filteredStudents.forEach((s) => {
      const res = s.admissionResult || "";
      if (res === "Đạt" || res === "Đạt cam kết" || res === "Học thử") {
        passed++;
      } else if (res.includes("Không đạt")) {
        failed++;
      } else {
        pending++;
      }

      if (s.enrollmentStatus === "COMPLETED") {
        enrolled++;
      }
      if (s.enrollmentStatus === "PENDING" || s.enrollmentStatus === "COMPLETED") {
        requestedEnrollment++;
      }
    });

    return { total, passed, failed, pending, enrolled, requestedEnrollment };
  }, [filteredStudents]);

  // Paginated dataset
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredStudents.slice(startIndex, startIndex + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;

  const formatDate = (dateVal: any) => {
    if (!dateVal) return "-";
    try {
      return new Date(dateVal).toLocaleDateString("vi-VN");
    } catch {
      return String(dateVal);
    }
  };

  const getResultBadgeClass = (result: string) => {
    if (!result) return "bg-slate-50 text-slate-500 border border-slate-100";
    if (result === "Đạt") return "bg-emerald-50 text-emerald-600 border border-emerald-100";
    if (result === "Đạt - Giao lưu") return "bg-teal-50 text-teal-700 border border-teal-200";
    if (result === "Đạt cam kết") return "bg-amber-50 text-amber-600 border border-amber-100";
    if (result === "Học thử") return "bg-teal-50 text-teal-800 border border-teal-200";
    if (result.includes("Không đạt")) return "bg-rose-50 text-rose-600 border border-rose-100";
    return "bg-blue-50 text-blue-600 border border-blue-100";
  };

  // Get current active tab periods list
  const isTransferPeriod = useCallback((p: any) => {
    if (!p) return false;
    const name = (p.name || "").toLowerCase();
    const hasBatch = (p.batches || []).some((b: any) => (b.name || "").toLowerCase().includes("chuyen_he") || (b.name || "").toLowerCase().includes("chuyển hệ"));
    return name.includes("chuyển hệ") || name.includes("chuyen he") || name.includes("chuyenhe") || hasBatch;
  }, []);

  const activePeriodsList = useMemo(() => {
    if (activeTab === "preschool") return preschoolPeriods;
    if (activeTab === "transfer") return generalPeriods.filter(isTransferPeriod);
    return generalPeriods.filter(p => !isTransferPeriod(p));
  }, [activeTab, generalPeriods, preschoolPeriods, isTransferPeriod]);

  const uniquePeriodNames = useMemo(() => {
    const names = new Set<string>();
    activePeriodsList.forEach((p: any) => {
      if (p.name) names.add(String(p.name));
    });
    currentDataset.forEach((s: any) => {
      if (s.period?.name) names.add(String(s.period.name));
    });
    return Array.from(names).sort();
  }, [activePeriodsList, currentDataset]);

  const uniqueBatchNames = useMemo(() => {
    const names = new Set<string>();
    if (selectedPeriod) {
      const period = activePeriodsList.find((p: any) => p.name === selectedPeriod);
      if (period?.batches) {
        period.batches.forEach((b: any) => {
          if (b.name) names.add(String(b.name));
        });
      }
      currentDataset.forEach((s: any) => {
        if (s.period?.name === selectedPeriod && s.batch?.name) {
          names.add(String(s.batch.name));
        }
      });
    } else {
      activePeriodsList.forEach((p: any) => {
        if (p.batches) {
          p.batches.forEach((b: any) => {
            if (b.name) names.add(String(b.name));
          });
        }
      });
      currentDataset.forEach((s: any) => {
        if (s.batch?.name) names.add(String(s.batch.name));
      });
    }
    return Array.from(names).sort();
  }, [selectedPeriod, activePeriodsList, currentDataset]);

  // Get active tab period's batch options in form/import
  const activeFormBatches = useMemo(() => {
    const selected = activePeriodsList.find(p => p.id === formState.periodId);
    return selected?.batches || [];
  }, [formState.periodId, activePeriodsList]);

  const activeImportBatches = useMemo(() => {
    const selected = activePeriodsList.find(p => p.id === importPeriodId);
    return selected?.batches || [];
  }, [importPeriodId, activePeriodsList]);

  // Preschool age calculation and dynamic suggestions
  const getMonthsAndSuggestGrade = useCallback((dobStr: string, batchId: string) => {
    if (!dobStr) return { months: null, suggest: "", surveyDateStr: "" };
    
    // Find the survey date based on selected batch or period
    let surveyDate = new Date();
    let source = "Ngày hôm nay";
    
    if (batchId) {
      const selectedBatch = preschoolPeriods.flatMap(p => p.batches || []).find(b => b.id === batchId);
      if (selectedBatch?.startDate) {
        surveyDate = new Date(selectedBatch.startDate);
        source = `Đầu đợt: ${surveyDate.toLocaleDateString("vi-VN")}`;
      }
    } else {
      const activePeriodId = formState.periodId || (preschoolPeriods[0]?.id || "");
      const period = preschoolPeriods.find(p => p.id === activePeriodId);
      if (period?.startDate) {
        surveyDate = new Date(period.startDate);
        source = `Đầu kỳ: ${surveyDate.toLocaleDateString("vi-VN")}`;
      }
    }

    const birth = new Date(dobStr);
    if (isNaN(birth.getTime())) return { months: null, suggest: "", surveyDateStr: "" };

    // Calculate months difference
    let months = (surveyDate.getFullYear() - birth.getFullYear()) * 12 + (surveyDate.getMonth() - birth.getMonth());
    if (surveyDate.getDate() < birth.getDate()) {
      months--;
    }

    // Suggest grade
    let suggest = "";
    if (months >= 12 && months < 18) suggest = "12 đến 18 tháng";
    else if (months >= 18 && months <= 24) suggest = "18 đến 24 tháng";
    else if (months > 24 && months <= 36) suggest = "24 đến 36 tháng";
    else if (months > 36 && months <= 48) suggest = "Mẫu giáo bé";
    else if (months > 48 && months <= 60) suggest = "Mẫu giáo nhỡ";
    else if (months > 60) suggest = "Mẫu giáo lớn";

    return { months, suggest, surveyDateStr: source };
  }, [preschoolPeriods, formState.periodId]);

  const ageInfo = useMemo(() => {
    if (activeTab !== "preschool") return { months: null, suggest: "", surveyDateStr: "" };
    return getMonthsAndSuggestGrade(formState.dateOfBirth, formState.batchId);
  }, [activeTab, formState.dateOfBirth, formState.batchId, getMonthsAndSuggestGrade]);

  // Auto generate code helper
  const handleAutoGenerateCode = async () => {
    try {
      const endpoint = activeTab === "general" 
        ? "/api/input-assessment-students?get_max_code=true" 
        : "/api/preschool-input-assessment-students?get_max_code=true";
      const r = await fetch(endpoint);
      if (r.ok) {
        const res = await r.json();
        if (res.nextCode) {
          if (activeTab === "general") {
            setFormState(prev => ({ ...prev, studentCode: res.nextCode }));
          } else {
            const code = "MN" + res.nextCode.replace(/^\D+/, "");
            setFormState(prev => ({ ...prev, studentCode: code }));
          }
          showNotification("Đã tạo mã học sinh tự động");
        }
      }
    } catch (e) {
      showNotification("Lỗi khi tự động sinh mã", "err");
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormMode("create");
    setEditingId(null);
    const defaultPeriodId = activeTab === "general" 
      ? (generalPeriods[0]?.id || "") 
      : (preschoolPeriods[0]?.id || "");
    const defaultBatchId = activeTab === "general"
      ? (generalPeriods[0]?.batches?.[0]?.id || "")
      : (preschoolPeriods[0]?.batches?.[0]?.id || "");

    setFormState({
      studentCode: "",
      fullName: "",
      dateOfBirth: "",
      gender: "Nam",
      grade: activeTab === "general" ? (grades[0] || "1") : "12 đến 18 tháng",
      className: "",
      periodId: defaultPeriodId,
      batchId: defaultBatchId,
      surveySystem: "",
      admissionCriteria: "",
      admissionCampus: "",
      admissionResult: "",
      directorNote: "",
      signatureName: "",
      surveyFormType: "",
      kqHocTap: "",
      kqRenLuyen: "",
      hoSoCtQuocTe: "",
      hocKy: "",
      targetType: "",
      kqgdTieuHoc: "",
      devProfessionalComment: "",
      devPsychologyComment: "",
      devImportantNote: "",
      devAssessmentResult: "",
      registeredCampus: "",
      isAbsent: false,
      cityName: "",
      districtName: "",
      wardName: "",
      countryName: "",
      oldSchoolName: "",
      oldSchoolType: ""
    });
    setTransferCampusId("");
    setTransferClassId("");
    setTransferStudents([]);
    setSelectedStudentIds([]);
    setTargetSystem("");
    setStudentSearchQuery("");
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (student: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormMode("edit");
    setEditingId(student.id);
    
    // Format birthdate for HTML date input: YYYY-MM-DD
    let formattedDob = "";
    if (student.dateOfBirth) {
      try {
        formattedDob = new Date(student.dateOfBirth).toISOString().split("T")[0];
      } catch {}
    }

    setFormState({
      studentCode: student.studentCode || "",
      fullName: student.fullName || "",
      dateOfBirth: formattedDob,
      gender: student.gender || "Nam",
      grade: student.grade || "",
      className: student.className || "",
      periodId: student.periodId || "",
      batchId: student.batchId || "",
      surveySystem: student.surveySystem || "",
      admissionCriteria: student.admissionCriteria || "",
      admissionCampus: student.admissionCampus || "",
      admissionResult: student.admissionResult || "",
      directorNote: student.directorNote || "",
      signatureName: student.signatureName || "",
      surveyFormType: student.surveyFormType || "",
      kqHocTap: student.kqHocTap || "",
      kqRenLuyen: student.kqRenLuyen || "",
      hoSoCtQuocTe: student.hoSoCtQuocTe || "",
      hocKy: student.hocKy || "",
      targetType: student.targetType || "",
      kqgdTieuHoc: student.kqgdTieuHoc || "",
      devProfessionalComment: student.devProfessionalComment || "",
      devPsychologyComment: student.devPsychologyComment || "",
      devImportantNote: student.devImportantNote || "",
      devAssessmentResult: student.devAssessmentResult || "",
      registeredCampus: student.registeredCampus || "",
      isAbsent: student.isAbsent || false,
      cityName: student.cityName || "",
      districtName: student.districtName || "",
      wardName: student.wardName || "",
      countryName: student.countryName || "",
      oldSchoolName: student.oldSchoolName || "",
      oldSchoolType: student.oldSchoolType || ""
    });
    setTransferCampusId("");
    setTransferClassId("");
    setTransferStudents([]);
    setSelectedStudentIds([]);
    setTargetSystem(student.surveyFormType || "");
    setStudentSearchQuery("");
    setIsFormOpen(true);
  };

  // Handle Save Student (Create/Edit)
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChuyenHe && formMode === "create") {
      if (selectedStudentIds.length === 0) {
        return showNotification("Vui lòng chọn ít nhất một học sinh để chuyển hệ", "err");
      }
      if (!targetSystem) {
        return showNotification("Vui lòng chọn hệ chuyển", "err");
      }
      
      const currentClass = allClasses.find(c => c.id === transferClassId);
      const selectedStudentsData = transferStudents.filter(s => selectedStudentIds.includes(s.id));
      
      const endpoint = "/api/input-assessment-students";
      const bodyData = {
        action: "BULK_CREATE",
        data: selectedStudentsData.map(s => ({
          studentCode: s.studentCode,
          fullName: s.studentName,
          dateOfBirth: s.dateOfBirth,
          gender: s.gender || "Nam",
          className: currentClass?.className || "",
          grade: currentClass?.grade || "",
          registeredCampus: campuses.find(c => c.id === transferCampusId)?.campusName || "",
          periodId: formState.periodId,
          batchId: formState.batchId || null,
          surveySystem: currentClass?.educationSystem || "", // Hệ đang học
          surveyFormType: targetSystem, // Hệ chuyển
        }))
      };
      
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData)
        });
        if (res.ok) {
          showNotification("Đã ghi nhận thông tin chuyển hệ cho " + selectedStudentIds.length + " học sinh!");
          setIsFormOpen(false);
          setTimeout(() => window.location.reload(), 1000);
        } else {
          const err = await res.json();
          showNotification("Lỗi: " + (err.error || "Gửi yêu cầu thất bại"), "err");
        }
      } catch (e) {
        showNotification("Lỗi kết nối máy chủ", "err");
      }
      return;
    }

    // Allow empty studentCode to be auto-generated by backend if formMode === "create"
    if (formMode === "edit" && !formState.studentCode.trim()) return showNotification("Mã học sinh không được để trống", "err");
    if (!formState.fullName.trim()) return showNotification("Họ và tên không được để trống", "err");
    if (!formState.periodId) return showNotification("Kỳ khảo sát là bắt buộc", "err");

    const syncedState = {
      ...formState,
      oldSchoolName: schoolNameInput || formState.oldSchoolName || null,
      oldSchoolType: schoolTypeInput || formState.oldSchoolType || null,
      cityName: selectedLocationType === "Nội tỉnh" ? "Thành phố Đà Nẵng" : (selectedLocationType === "Ngoại tỉnh" ? selectedProvince : (formState.cityName || null)),
      countryName: selectedLocationType === "Nước ngoài" ? selectedCountry : (formState.countryName || "Việt Nam"),
    };

    const endpoint = activeTab === "general" 
      ? "/api/input-assessment-students" 
      : "/api/preschool-input-assessment-students";
    
    const method = formMode === "edit" ? "PUT" : "POST";
    const bodyData = formMode === "edit"
      ? { id: editingId, data: syncedState }
      : { action: "CREATE", data: syncedState };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      });
      if (res.ok) {
        showNotification(formMode === "edit" ? "Cập nhật học sinh thành công!" : "Thêm mới học sinh thành công!");
        setIsFormOpen(false);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const err = await res.json();
        showNotification("Lỗi: " + (err.error || "Gửi yêu cầu thất bại"), "err");
      }
    } catch (e) {
      showNotification("Lỗi kết nối máy chủ", "err");
    }
  };

  // Handle Update Absent Status
  const handleUpdateAbsent = async (student: any, isAbsent: boolean) => {
    const endpoint = activeTab === "general" 
      ? "/api/input-assessment-students" 
      : "/api/preschool-input-assessment-students";
      
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          data: {
            ...student,
            isAbsent
          }
        })
      });
      
      if (res.ok) {
        showNotification("Đã cập nhật trạng thái vắng thành công!");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const err = await res.json();
        showNotification("Lỗi: " + (err.error || "Không thể cập nhật"), "err");
      }
    } catch (e) {
      showNotification("Lỗi kết nối máy chủ", "err");
    }
  };

  // Handle Delete Student
  const handleDeleteStudent = async (student: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Bạn có chắc muốn xóa học sinh ${student.fullName} (${student.studentCode}) khỏi hệ thống?`)) return;

    const endpoint = activeTab === "general" 
      ? `/api/input-assessment-students?id=${student.id}` 
      : `/api/preschool-input-assessment-students?id=${student.id}`;

    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        showNotification("Đã xóa học sinh thành công");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showNotification("Lỗi khi xóa học sinh", "err");
      }
    } catch (e) {
      showNotification("Lỗi kết nối", "err");
    }
  };

  const handleConfirmEnrollment = async (student: any, isPreschool = false) => {
    const isAssigned = student.enrollmentStatus === "COMPLETED" || student.enrollmentStatus === "ENROLLED" || !!student.enrollmentClass || !!student.enrollmentClassId;
    if (isAssigned) {
      showNotification("Học sinh này đã được sắp lớp, không thể thực hiện xác nhận nhập học!", "err");
      return;
    }
    if (!confirm(`Xác nhận nhập học cho học sinh ${student.fullName} (Mã KS: ${student.studentCode})?\nHành động này sẽ gửi một phiếu yêu cầu đến Tổ Giáo vụ để tiến hành xếp lớp.`)) return;

    try {
      const res = await confirmEnrollmentAction(student.id, isPreschool);
      if (res.success) {
        showNotification("Đã gửi yêu cầu nhập học đến Tổ Giáo vụ!");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showNotification("Lỗi: " + (res.error || "Không thể thực hiện"), "err");
      }
    } catch (e: any) {
      showNotification("Lỗi kết nối: " + e.message, "err");
    }
  };

  const handleRevertEnrollment = async (student: any, isPreschool = false) => {
    const isAssigned = student.enrollmentStatus === "COMPLETED" || student.enrollmentStatus === "ENROLLED" || !!student.enrollmentClass || !!student.enrollmentClassId;
    if (isAssigned) {
      showNotification("Học sinh này đã được sắp lớp, không thể hoàn lại!", "err");
      return;
    }
    if (!confirm(`Xác nhận HOÀN TRẢ (Hủy yêu cầu nhập học) cho học sinh ${student.fullName} (Mã KS: ${student.studentCode})?\nHành động này sẽ rút lại yêu cầu nhập học hiện tại.`)) return;

    try {
      const res = await revertEnrollmentAction(student.id, isPreschool);
      if (res.success) {
        showNotification("Đã hoàn trả yêu cầu nhập học!");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showNotification("Lỗi: " + (res.error || "Không thể thực hiện"), "err");
      }
    } catch (e: any) {
      showNotification("Lỗi kết nối: " + e.message, "err");
    }
  };

  const handleRegisterRetest = async () => {
    if (!retestStudent) return;
    if (!retestPeriodId) {
      alert("Vui lòng chọn Kỳ khảo sát mới!");
      return;
    }
    if (retestPeriodId === retestStudent.periodId && retestBatchId === retestStudent.batchId) {
      alert("Đợt khảo sát mới phải khác với Đợt khảo sát hiện tại!");
      return;
    }

    setRetestRegisterLoading(true);
    try {
      const res = await fetch("/api/input-assessment-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RETEST_REGISTER",
          data: {
            studentId: retestStudent.id,
            targetPeriodId: retestPeriodId,
            targetBatchId: retestBatchId || null
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification("Đăng ký khảo sát lại thành công cho học sinh " + retestStudent.fullName + "!");
        setRetestStudent(null);
        setRetestPeriodId("");
        setRetestBatchId("");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert(data.error || "Đăng ký khảo sát lại thất bại!");
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + (err?.message || String(err)));
    } finally {
      setRetestRegisterLoading(false);
    }
  };

  const handleBatchRetestRegister = async () => {
    if (selectedIds.length === 0 || !batchRetestPeriodId) {
      alert("Vui lòng chọn Kỳ khảo sát mới!");
      return;
    }

    setBatchRetestLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const sid of selectedIds) {
      try {
        const res = await fetch("/api/input-assessment-students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "RETEST_REGISTER",
            data: {
              studentId: sid,
              targetPeriodId: batchRetestPeriodId,
              targetBatchId: batchRetestBatchId || null
            }
          })
        });
        const data = await res.json();
        if (res.ok && data.success) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setBatchRetestLoading(false);
    setIsBatchRetestOpen(false);
    setSelectedIds([]);
    showNotification(`Đã chuyển thành công ${successCount} học sinh sang đợt khảo sát mới!${failCount > 0 ? ` (${failCount} lỗi/trùng)` : ""}`);
    setTimeout(() => window.location.reload(), 1200);
  };

  const handleExportRetestList = () => {
    if (filteredStudents.length === 0) {
      showNotification("Không có dữ liệu học sinh khảo sát lại để xuất!", "err");
      return;
    }

    const dataToExport = filteredStudents.map((s, idx) => {
      const record = parseEntranceRecord(s.kqHocTap, s.grade);
      const details = extractAcademicDetails(record, s.grade);
      const retestRecord = currentDataset.find(o => o.studentCode === s.studentCode && o.id !== s.id);
      const isRetestRegistered = !!retestRecord;
      const retestTargetText = isRetestRegistered
        ? `${retestRecord.period?.name || "Kỳ mới"}${retestRecord.batch?.name ? ` - ${retestRecord.batch.name}` : ""}`
        : "Chưa xếp đợt mới";

      const campusObj = campuses.find(c => c.id === resolveStudentCampusId(s));
      const campusTitle = campusObj?.campusName || s.admissionCampus || s.registeredCampus || "";

      return {
        "STT": idx + 1,
        "Mã học sinh": s.studentCode || "",
        "Họ và tên": s.fullName || "",
        "Khối": s.grade ? (activeTab === "general" ? `Khối ${s.grade}` : s.grade) : "",
        "Giới tính": s.gender || "",
        "Ngày sinh": formatDate(s.dateOfBirth),
        "Cơ sở": campusTitle,
        "Hệ KS": s.surveySystem || s.surveyFormType || "",
        "Kỳ KS gốc": s.period?.name || "",
        "Đợt KS gốc": s.batch?.name || "",
        "Kết quả": s.admissionResult || "Không đạt - Kiểm tra lại",
        "Xếp loại học lực": details.overallRating || s.kqHocTap || "",
        "Môn Toán": details.math || "",
        "Môn Tiếng Việt/Văn": details.literature || "",
        "Môn Tiếng Anh": details.english || "",
        "Môn khác / Tổ hợp": details.otherSubjects || "",
        "Hạnh kiểm": s.kqRenLuyen || "",
        "Trạng thái KS lại": isRetestRegistered ? "Đã đăng ký đợt mới" : "Chờ đăng ký đợt mới",
        "Kỳ/Đợt thi lại mới": retestTargetText,
        "Ghi chú tuyển sinh": s.directorNote || ""
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DS_Khao_Sat_Lai");
    XLSX.writeFile(workbook, `Danh_Sach_Khao_Sat_Lai_${activeTab === "general" ? "Pho_Thong" : "Mam_Non"}_${new Date().toISOString().split("T")[0]}.xlsx`);
    showNotification("Đã xuất danh sách Khảo sát lại thành công!");
  };

  const getRatingBadgeCls = (rating?: string) => {
    const r = (rating || "").toLowerCase();
    if (r.includes("xuất sắc") || r.includes("tốt") || r.includes("giỏi")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    }
    if (r.includes("khá") || r.includes("đạt") || r.includes("hoàn thành")) {
      return "bg-sky-50 text-sky-700 border-sky-200/80";
    }
    if (r.includes("chưa") || r.includes("yếu") || r.includes("kém") || r.includes("cố gắng")) {
      return "bg-rose-50 text-rose-700 border-rose-200/80";
    }
    return "bg-slate-100 text-slate-700 border-slate-200/80";
  };

  // Bulk Delete
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} học sinh đã chọn khỏi hệ thống?`)) return;

    const endpoint = activeTab === "general"
      ? `/api/input-assessment-students?ids=${selectedIds.join(",")}`
      : `/api/preschool-input-assessment-students?ids=${selectedIds.join(",")}`;

    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        showNotification(`Đã xóa thành công ${selectedIds.length} học sinh!`);
        setSelectedIds([]);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showNotification("Lỗi khi thực hiện xóa nhiều dòng", "err");
      }
    } catch (e) {
      showNotification("Lỗi kết nối", "err");
    }
  };

  const handleExportStudentProfilesCsv = () => {
    const params = new URLSearchParams();
    params.set("action", "exportCsv");
    if (activeYearId) {
      params.set("academicYearId", activeYearId);
    }
    if (selectedCampusFilter && selectedCampusFilter !== "all") {
      params.set("campusId", selectedCampusFilter);
    }
    if (searchQuery) {
      params.set("search", searchQuery);
    }
    window.location.href = `/api/admin/student-profiles?${params.toString()}`;
  };

  // Export filtered students list to Excel aligned with forms 100% (without admin/approval fields)
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) return showNotification("Không có dữ liệu trong bộ lọc để xuất", "err");

    const dataToExport = filteredStudents.map((s, index) => {
      if (activeTab === "general") {
        return {
          "STT": index + 1,
          "Kỳ khảo sát": s.period?.name || "",
          "Đợt khảo sát": s.batch?.name || "",
          "Mã học sinh": s.studentCode || "",
          "Họ và tên": s.fullName || "",
          "Khối": s.grade || "",
          "Giới tính": s.gender || "",
          "Ngày sinh": formatDate(s.dateOfBirth),
          "Hệ KS": s.surveyFormType || "",
          "Học lực": parseEntranceRecord(s.kqHocTap, s.grade).summaryText || s.kqHocTap || "",
          "Hạnh kiểm": s.kqRenLuyen || "",
          "Học bạ": s.kqgdTieuHoc || "",
          "Học kỳ / Năm TS": s.hocKy || "",
          "Đối tượng TS": s.targetType || "",
          "Tỉnh/Thành": s.cityName || "",
          "Quận/Huyện": s.districtName || "",
          "Phường/Xã": s.wardName || "",
          "Quốc gia": s.countryName || "",
          "Tên trường cũ": s.oldSchoolName || "",
          "Loại hình trường": s.oldSchoolType || "",
          ...(selectedPeriod?.toLowerCase().includes("open day") && {
            "Đăng ký CS": campuses.find(c => c.id === s.registeredCampus)?.campusName || s.registeredCampus || "",
            "Ủy quyền xét duyệt": campuses.find(c => c.id === s.registeredCampus)?.manager?.fullName || ""
          }),
          "Kết quả duyệt": s.admissionResult || "Chưa duyệt",
          "Lớp nhập học": s.enrollmentClass?.className || s.enrollmentClassId || "",
        };
      } else {
        return {
          "STT": index + 1,
          "Kỳ khảo sát": s.period?.name || "",
          "Đợt khảo sát": s.batch?.name || "",
          "Mã bé": s.studentCode || "",
          "Họ và tên": s.fullName || "",
          "Ngày sinh": formatDate(s.dateOfBirth),
          "Giới tính": s.gender || "",
          "Nhóm tuổi": s.grade || "",
          "Cơ sở": s.admissionCampus || "",
          "Kết quả": s.admissionResult || "Chưa duyệt",
          "Lớp nhập học": s.enrollmentClass?.className || s.enrollmentClassId || "",
        };
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === "general" ? "Phổ thông" : "Mầm non");
    XLSX.writeFile(workbook, `Danh_Sach_HS_Khao_Sat_${activeTab === "general" ? "Pho_Thong" : "Mam_Non"}.xlsx`);
    showNotification("Đã xuất file Excel thành công!");
  };

  const handleExportBatchResultsExcel = () => {
    if (filteredStudents.length === 0) return showNotification("Không có dữ liệu trong bộ lọc để xuất", "err");

    const dataToExport = filteredStudents.map((s, index) => {
      const pills = getStudentSurveyPills(s);
      const surveySummary = pills.length > 0 ? pills.map(p => `${p.label}: ${p.value}`).join(" | ") : "Chưa ghi nhận điểm";
      const commSummary = extractCommittedSubjectsSummary(s.directorNote);
      const approvedLabel = s.isAbsent
        ? "Vắng khảo sát"
        : !s.admissionResult
        ? "Chờ duyệt"
        : s.admissionResult === "Đạt"
        ? "Đạt chuẩn"
        : s.admissionResult;

      return {
        "STT": index + 1,
        "Kỳ khảo sát": s.period?.name || "",
        "Đợt khảo sát": cleanBatchName(s.batch?.name) || "Khảo sát lẻ",
        "Mã HS": s.studentCode || "",
        "Học sinh": s.fullName || "",
        "Ngày sinh": formatDate(s.dateOfBirth),
        "Giới tính": s.gender === "M" || s.gender === "Nam" ? "Nam" : s.gender === "F" || s.gender === "Nữ" ? "Nữ" : s.gender || "",
        "Khối": s.grade ? (activeTab === "preschool" ? s.grade : `Khối ${s.grade}`) : "",
        "Hệ": s.surveyFormType || s.surveySystem || "",
        "Cơ sở": resolveCampusShortName(s),
        "Kết quả khảo sát": surveySummary,
        "KQ đã xét duyệt": commSummary ? `${approvedLabel} (Môn: ${commSummary})` : approvedLabel,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "KQ_Theo_Dot");
    XLSX.writeFile(
      workbook,
      `Ket_Qua_Khao_Sat_Theo_Dot_${activeTab === "preschool" ? "Mam_Non" : activeTab === "transfer" ? "Chuyen_He" : "Pho_Thong"}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
    showNotification("Đã xuất Kết quả khảo sát theo đợt ra Excel!");
  };

  // Download template for Excel import matching KSNL 100%
  const handleDownloadTemplate = () => {
    let ws;
    if (activeTab === "general") {
      ws = XLSX.utils.json_to_sheet([
        { 
          "Mã học sinh": "", 
          "Họ và tên": "Nguyễn Văn A", 
          "Khối": "6",
          "Giới tính": "Nam",
          "Ngày sinh": "20/05/2010",
          "Hệ KS": "",
          "Học lực": "",
          "Hạnh kiểm": "",
          "Học bạ": "",
          "Học kỳ / Năm TS": "HK1",
          "Đối tượng TS": "",
          "Tỉnh/Thành": "",
          "Quận/Huyện": "",
          "Phường/Xã": "",
          "Quốc gia": "",
          "Tên trường cũ": "",
          "Loại hình trường": ""
        }
      ]);
      ws["!cols"] = [
        { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 20 }, { wch: 15 }
      ];
    } else {
      ws = XLSX.utils.json_to_sheet([
        { 
          "Mã bé": "MN001", 
          "Họ và tên": "Nguyễn Bé An", 
          "Ngày sinh": "15/08/2022", 
          "Giới tính": "Nữ", 
          "Nhóm tuổi": "18 đến 24 tháng", 
          "Cơ sở": "Skyline Riverside", 
          "Hệ KS": "Chất lượng cao" 
        }
      ]);
      ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, "DS_HocSinh");
    XLSX.writeFile(workbook, activeTab === "general" ? "Mau_Import_HS_KhaoSat.xlsx" : "Form_Mau_Them_Be_Mam_Non.xlsx");
    showNotification("Đã tải file Excel mẫu!");
  };

  // Handle Excel parsing and bulk upload matching KSNL 100%
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!importPeriodId) return showNotification("Vui lòng chọn Kỳ khảo sát đích trước", "err");
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportSuccessCount(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

      if (rawRows.length === 0) {
        throw new Error("File Excel không có dữ liệu học sinh");
      }

      // Helper function to dynamically map values based on keywords
      const findVal = (row: any, keywords: string[]) => {
        const keys = Object.keys(row);
        for (const key of keys) {
          const k = key.toLowerCase().trim();
          if (keywords.some(kw => k.includes(kw.toLowerCase()))) return row[key];
        }
        return null;
      };

      const mapped = rawRows.map((row: any) => {
        // Handle date parsing
        let parsedDate = null;
        const rawDate = row["Ngày sinh"] || findVal(row, ["birth", "dob", "sinh", "ngay sinh"]);
        if (rawDate) {
          if (typeof rawDate === "number") {
            const date = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
            parsedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000).toISOString();
          } else if (typeof rawDate === "string") {
            const parts = rawDate.split(/[\/\-]/);
            if (parts.length === 3 && parts[0].length <= 2) {
              parsedDate = parts[2] + "-" + parts[1].padStart(2, "0") + "-" + parts[0].padStart(2, "0") + "T00:00:00.000Z";
            } else {
              const d = new Date(rawDate);
              if (!isNaN(d.getTime())) parsedDate = d.toISOString();
            }
          }
        }

        const genderVal = String(row["Giới tính"] || findVal(row, ["giới tính", "gender"]) || "").trim().toLowerCase();
        let gender = "Nam";
        if (genderVal.includes("nữ") || genderVal === "female" || genderVal === "f") {
          gender = "Nữ";
        } else if (genderVal.includes("nam") || genderVal === "male" || genderVal === "m") {
          gender = "Nam";
        }

        if (activeTab === "general") {
          const studentCode = String(row["Mã học sinh"] || row["Mã HS KS"] || findVal(row, ["mã hs", "ma hs", "mã"]) || "").trim();
          const fullName = String(row["Họ và tên"] || row["Họ và Tên"] || row["Họ và Tên *"] || findVal(row, ["họ tên", "tên", "fullname"]) || "").trim();
          const grade = String(row["Khối"] || findVal(row, ["khối", "grade"]) || "").trim();
          const hocKy = String(row["Học kỳ / Năm TS"] || findVal(row, ["học kỳ", "hoc ky"]) || "").trim();
          const surveyFormType = String(row["Hệ KS"] || row["Hệ Khảo sát"] || findVal(row, ["hệ khảo sát", "he khao sat"]) || "").trim();
          const hoSoCtQuocTe = String(row["Học bạ"] || row["Hồ sơ/Bảng điểm"] || row["Hồ sơ / Bảng điểm"] || findVal(row, ["hồ sơ", "bảng điểm"]) || "").trim();
          const kqgdTieuHoc = String(row["Học bạ"] || findVal(row, ["học bạ", "hoc ba"]) || "").trim();
          const registeredCampusRaw = String(row["Đăng ký CS"] || row["Cơ sở đăng ký"] || findVal(row, ["đăng ký cs", "co so dang ky", "cs dang ky"]) || "").trim();
          let registeredCampus = null;
          
          const cityName = String(row["Tỉnh/Thành"] || row["Tỉnh / Thành"] || findVal(row, ["tỉnh", "thành"]) || "").trim();
          const districtName = String(row["Quận/Huyện"] || row["Quận / Huyện"] || findVal(row, ["quận", "huyện"]) || "").trim();
          const wardName = String(row["Phường/Xã"] || row["Phường / Xã"] || findVal(row, ["phường", "xã"]) || "").trim();
          const countryName = String(row["Quốc gia"] || findVal(row, ["quốc gia", "country"]) || "").trim();
          const oldSchoolName = String(row["Tên trường cũ"] || row["Trường cũ"] || findVal(row, ["trường cũ", "old school"]) || "").trim();
          const oldSchoolType = String(row["Loại hình trường"] || findVal(row, ["loại hình", "school type"]) || "").trim();
          if (registeredCampusRaw) {
            const matchedCampus = campuses.find(c => 
              c.campusCode?.toUpperCase() === registeredCampusRaw.toUpperCase() || 
              c.campusName?.toUpperCase() === registeredCampusRaw.toUpperCase() || 
              registeredCampusRaw.toUpperCase().includes(c.campusCode?.toUpperCase()) || 
              registeredCampusRaw.toUpperCase().includes(c.campusName?.toUpperCase())
            );
            if (matchedCampus) {
              registeredCampus = matchedCampus.id;
            }
          }
          const targetType = String(row["Đối tượng TS"] || row["Đối tượng Tuyển sinh"] || findVal(row, ["đối tượng", "doi tuong"]) || "").trim();
          const admissionCriteria = String(row["Diện Khảo sát"] || row["Diện khảo sát"] || findVal(row, ["diện", "criteria"]) || "").trim();
          const surveySystem = String(row["Hình thức KS"] || findVal(row, ["hình thức", "hinh thuc"]) || "").trim();
          const rawKqHocTap = String(row["Học lực"] || row["Kết quả Học tập"] || findVal(row, ["học lực", "học tập"]) || "").trim();
          let kqHocTap = rawKqHocTap;
          if (rawKqHocTap) {
            try {
              JSON.parse(rawKqHocTap);
            } catch {
              const rec = parseEntranceRecord(rawKqHocTap, grade);
              kqHocTap = serializeEntranceRecord(rec);
            }
          }
          const kqRenLuyen = String(row["Hạnh kiểm"] || row["Kết quả Rèn luyện"] || findVal(row, ["hạnh kiểm", "rèn luyện"]) || "").trim();

          // Construct kqgdTieuHoc from location if not provided
          let finalKqgd = kqgdTieuHoc;
          if (targetType) {
            let locDetail = "";
            if (targetType === "Nội tỉnh") {
              locDetail = wardName;
            } else if (targetType === "Ngoại tỉnh") {
              locDetail = wardName ? `${wardName} - ${cityName}` : cityName;
            } else if (targetType === "Nước ngoài") {
              locDetail = countryName;
            }
            const locationStr = `Trường cũ: ${oldSchoolName} (${oldSchoolType}) | Đối tượng: ${targetType} - ${locDetail}`;
            finalKqgd = kqgdTieuHoc ? `${locationStr}\n${kqgdTieuHoc}` : locationStr;
          }

          return {
            studentCode,
            fullName,
            dateOfBirth: parsedDate,
            gender,
            grade,
            hocKy,
            surveyFormType,
            hoSoCtQuocTe,
            kqgdTieuHoc: finalKqgd,
            targetType,
            cityName,
            districtName,
            wardName,
            countryName,
            oldSchoolName,
            oldSchoolType,
            admissionCriteria,
            surveySystem,
            kqHocTap,
            kqRenLuyen,
            periodId: importPeriodId,
            batchId: importBatchId || null,
            registeredCampus: registeredCampus || null
          };
        } else {
          const studentCode = String(row["Mã bé"] || findVal(row, ["mã bé", "mã"]) || "").trim();
          const fullName = String(row["Họ và tên"] || findVal(row, ["họ tên", "tên", "fullname"]) || "").trim();
          const grade = String(row["Nhóm tuổi"] || findVal(row, ["nhóm tuổi", "nhom tuoi", "tuổi"]) || "").trim();
          const admissionCampus = String(row["Cơ sở"] || findVal(row, ["cơ sở", "campus", "cs"]) || "").trim();
          const surveyFormType = String(row["Hệ KS"] || findVal(row, ["hệ ks", "he ks"]) || "").trim();

          return {
            studentCode,
            fullName,
            dateOfBirth: parsedDate,
            gender,
            grade,
            admissionCampus,
            surveyFormType,
            periodId: importPeriodId,
            batchId: importBatchId || null
          };
        }
      });

      // Filter rows: General K-12 only requires full name (API will auto generate code), Preschool requires both
      const validRows = activeTab === "general"
        ? mapped.filter(r => r.fullName)
        : mapped.filter(r => r.fullName && r.studentCode);
        
      if (validRows.length === 0) {
        const errorMsg = activeTab === "general" 
          ? "Không có dòng dữ liệu hợp lệ (Cần có Họ và tên)" 
          : "Không có dòng dữ liệu hợp lệ (Cần có Mã học sinh và Họ & tên)";
        throw new Error(errorMsg);
      }

      const endpoint = activeTab === "general"
        ? "/api/input-assessment-students"
        : "/api/preschool-input-assessment-students";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "BULK_CREATE", data: validRows })
      });

      if (response.ok) {
        const result = await response.json();
        setImportSuccessCount(result.created || validRows.length);
        showNotification(`Đã import thành công ${result.created || validRows.length} học sinh!`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const err = await response.json();
        throw new Error(err.error || "Gửi dữ liệu lên API thất bại");
      }

    } catch (err: any) {
      setImportError(err.message || "Đã xảy ra lỗi không xác định");
      showNotification("Import file thất bại", "err");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  // Set default batch when period changes in forms
  useEffect(() => {
    if (activeFormBatches.length > 0) {
      const match = activeFormBatches.find((b: any) => b.id === formState.batchId);
      if (!match) {
        setFormState(prev => ({ ...prev, batchId: activeFormBatches[0].id }));
      }
    } else {
      setFormState(prev => ({ ...prev, batchId: "" }));
    }
  }, [formState.periodId, activeFormBatches]);

  useEffect(() => {
    if (activeImportBatches.length > 0) {
      setImportBatchId(activeImportBatches[0].id);
    } else {
      setImportBatchId("");
    }
  }, [importPeriodId, activeImportBatches]);

  return (
    <div className="space-y-4">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-xl border animate-in slide-in-from-top-4 duration-300 font-semibold text-sm ${
          notification.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {notification.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
          {notification.text}
        </div>
      )}

      {/* Sky-Line Official Brand Header Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005854] to-[#00736E] rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        {/* Subtle decorative background watermark */}
        <div className="absolute right-0 top-0 bottom-0 w-80 opacity-10 pointer-events-none flex items-center justify-end pr-8">
          <GraduationCap className="w-64 h-64 text-white -mr-10 -mt-10" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/15 text-teal-200 px-2.5 py-0.5 rounded-full border border-white/20 backdrop-blur-md">
                Sky-Line Education System • Khảo sát đầu vào
              </span>
              <span className="text-xs font-semibold text-teal-100/90">
                Năm học: <strong className="text-white">{activeYearName || "Hiện tại"}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {pageMode === "ket-qua" ? "Kết quả khảo sát" : "Danh sách Khảo sát"}
            </h1>
            <p className="text-white/80 text-xs font-medium mt-1 max-w-2xl leading-relaxed">
              {pageMode === "ket-qua"
                ? "Quản lý kết quả khảo sát, danh sách khảo sát lại và xét duyệt nhập học cho học sinh Phổ thông & Mầm non chuẩn quy trình chất lượng Sky-Line."
                : "Quản lý tạo đợt khảo sát, tiếp nhận hồ sơ học sinh đăng ký dự tuyển, nguyện vọng và thành tích học sinh Phổ thông & Mầm non chuẩn quy trình chất lượng Sky-Line."}
            </p>
          </div>

          {/* Mode Switcher Segmented Control */}
          <div className="bg-black/25 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 flex flex-wrap items-center gap-1.5 self-start lg:self-auto shrink-0 shadow-inner">
            <button
              onClick={() => handleTabChange("general")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "general"
                  ? "bg-white text-[#003B3A] shadow-lg shadow-black/20"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <GraduationCap className={`w-4 h-4 ${activeTab === "general" ? "text-[#00A19A]" : "text-white/70"}`} />
              <span>Phổ thông K-12</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === "general" ? "bg-[#00A19A]/15 text-[#00736E]" : "bg-white/20 text-white"
              }`}>
                {generalEntranceCount}
              </span>
            </button>

            <button
              onClick={() => handleTabChange("preschool")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "preschool"
                  ? "bg-[#00A19A] text-white shadow-lg shadow-[#00A19A]/30"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Baby className="w-4 h-4 text-white" />
              <span>Mầm non</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === "preschool" ? "bg-white/25 text-white" : "bg-white/20 text-white"
              }`}>
                {initialPreschoolStudents.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange("transfer")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "transfer"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <ArrowRightLeft className={`w-4 h-4 ${activeTab === "transfer" ? "text-white" : "text-amber-300"}`} />
              <span>Học sinh Chuyển hệ</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === "transfer" ? "bg-white text-amber-800" : "bg-white/20 text-white"
              }`}>
                {transferStudentsCount}
              </span>
            </button>
          </div>
        </div>

        {/* Integrated Workflow Sub-tabs inside Banner for danh-sach mode */}
        {pageMode !== "ket-qua" && (
          <div className="relative z-10 mt-4 pt-3.5 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-black/20 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => handleSubTabChange("periods")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  subTab === "periods"
                    ? "bg-[#00A19A] text-white shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>1. Tạo đợt khảo sát</span>
              </button>
              {activeTab === "general" ? (
                <>
                  <button
                    onClick={() => handleSubTabChange("students_s")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer tabular-nums ${
                      subTab === "students_s" || subTab === "students"
                        ? "bg-[#00A19A] text-white shadow-sm"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>2. Danh sách Khảo sát Hệ S</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      subTab === "students_s" || subTab === "students"
                        ? "bg-white text-[#003B3A]"
                        : "bg-white/15 text-teal-100"
                    }`}>
                      {generalHeSCount}
                    </span>
                  </button>
                  <button
                    onClick={() => handleSubTabChange("students_i")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer tabular-nums ${
                      subTab === "students_i"
                        ? "bg-[#00A19A] text-white shadow-sm"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>3. Danh sách Khảo sát Hệ I</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      subTab === "students_i"
                        ? "bg-white text-[#003B3A]"
                        : "bg-white/15 text-teal-100"
                    }`}>
                      {generalHeICount}
                    </span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleSubTabChange("students")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    subTab === "students"
                      ? "bg-[#00A19A] text-white shadow-sm"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>2. Danh sách khảo sát</span>
                </button>
              )}
              <button
                onClick={() => handleSubTabChange("handover")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  subTab === "handover"
                    ? "bg-[#00A19A] text-white shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{activeTab === "general" ? "4. Bàn giao danh sách tới Giáo vụ" : "3. Bàn giao danh sách tới Giáo vụ"}</span>
              </button>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[11px] text-teal-100/80 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-300"></span>
              <span>
                {subTab === "periods"
                  ? "Bước 1: Thiết lập kỳ/đợt khảo sát hoặc xếp ca khảo sát nhanh"
                  : subTab === "handover"
                  ? `${activeTab === "general" ? "Bước 4" : "Bước 3"}: Bàn giao danh sách học sinh theo đợt khảo sát tới Giáo vụ để Phân công Giáo viên`
                  : subTab === "students_i"
                  ? "Danh sách độc lập Hệ I (HNG, SB, Compass): Bám sát Cấu hình file điểm KSĐV & Quy chế theo 1. Mốc thời gian / Kỳ khảo sát"
                  : subTab === "students_s"
                  ? "Danh sách độc lập Hệ S (HNS): Bám sát Cấu hình file điểm KSĐV & Quy chế theo 1. Mốc thời gian / Kỳ khảo sát"
                  : "Bước 2: Tiếp nhận, rà soát hồ sơ đăng ký & kết quả học bạ đầu vào"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Workflow Navigation Sub-tabs & Action Toolbar (Only shown separately in ket-qua mode) */}
      {pageMode === "ket-qua" && (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => handleSubTabChange("batch")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === "batch"
                ? "bg-[#003B3A] text-white shadow-sm shadow-[#003B3A]/20"
                : "text-slate-650 hover:text-[#00736E] hover:bg-teal-50/50"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Kết quả khảo sát theo đợt</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
              subTab === "batch" ? "bg-[#00A19A] text-white" : "bg-teal-50 text-[#00736E] border border-teal-200/60"
            }`}>
              {currentDataset.length}
            </span>
          </button>
          <button
            onClick={() => handleSubTabChange("info")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === "info"
                ? "bg-[#00A19A] text-white shadow-sm shadow-[#00A19A]/20"
                : "text-slate-650 hover:text-[#00A19A] hover:bg-teal-50/50"
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>2. TT Khảo sát lại</span>
            {retestStats.total > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                subTab === "info" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-600"
              }`}>
                {retestStats.total}
              </span>
            )}
          </button>
          <button
            onClick={() => handleSubTabChange("result")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === "result"
                ? "bg-[#00A19A] text-white shadow-sm shadow-[#00A19A]/20"
                : "text-slate-650 hover:text-[#00A19A] hover:bg-teal-50/50"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>3. Kết quả & Nhập học</span>
          </button>
        </div>

        {/* Action Buttons for batch, info and result tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {subTab === "batch" && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportBatchResultsExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#003B3A] hover:bg-[#005854] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Xuất bảng kết quả khảo sát theo đợt ra Excel"
              >
                <Download className="w-4 h-4 text-[#5EEAD4]" />
                Xuất KQ theo đợt (Excel)
              </button>
            </div>
          )}

          {subTab === "info" && (
            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      setBatchRetestPeriodId("");
                      setBatchRetestBatchId("");
                      setIsBatchRetestOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-600 to-[#00A19A] hover:from-teal-600 hover:to-[#008B85] text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Đăng ký KS lại ({selectedIds.length})
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1.5 px-3 py-2 hover:bg-rose-100 text-rose-600 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa đã chọn ({selectedIds.length})
                  </button>
                </>
              )}
              <button
                onClick={handleExportRetestList}
                className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-teal-100 text-[#00736E] bg-teal-50 border border-teal-200/70 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Xuất danh sách học sinh cần khảo sát lại ra Excel"
              >
                <Download className="w-4 h-4" />
                Xuất DS Khảo sát lại
              </button>
            </div>
          )}

          {subTab === "result" && (
            <div className="flex gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
              <button
                onClick={handleExportStudentProfilesCsv}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00A19A] hover:bg-[#008B85] text-white rounded-xl text-xs font-bold shadow-sm shadow-[#00A19A]/20 transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Xuất CSV Hồ Sơ
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Statistics Ledger Strip for Batch Results Tab */}
      {subTab === "batch" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] tabular-nums animate-in fade-in duration-300">
          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Tổng hồ sơ theo đợt</p>
              <p className="text-2xl font-black text-[#003B3A] mt-0.5">{batchStats.total}</p>
              <p className="text-[11px] font-medium text-[#00736E] mt-0.5">
                Đã có điểm KS: <strong>{batchStats.hasScores}</strong>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F0FDFA] text-[#003B3A] border border-[#CCFBF1]">
              <Users2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Đạt chuẩn</p>
              <p className="text-2xl font-black text-[#059669] mt-0.5">{batchStats.passedStandard}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                {batchStats.total > 0 ? Math.round((batchStats.passedStandard / batchStats.total) * 100) : 0}% tổng hồ sơ
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-[#059669] border border-emerald-200/70">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Đạt cam kết / Học thử</p>
              <p className="text-2xl font-black text-[#D97706] mt-0.5">{batchStats.committedOrProbation}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                {batchStats.total > 0 ? Math.round((batchStats.committedOrProbation / batchStats.total) * 100) : 0}% tổng hồ sơ
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-[#D97706] border border-amber-200/70">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Không đạt / KS lại</p>
              <p className="text-2xl font-black text-[#E11D48] mt-0.5">{batchStats.failed}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                {batchStats.total > 0 ? Math.round((batchStats.failed / batchStats.total) * 100) : 0}% tổng hồ sơ
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 text-[#E11D48] border border-rose-200/70">
              <XCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-3 col-span-2 sm:col-span-1">
            <div>
              <p className="text-xs font-semibold text-slate-500">Chờ xét duyệt</p>
              <p className="text-2xl font-black text-slate-800 mt-0.5">{batchStats.pending}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Vắng KS: <strong>{batchStats.absent}</strong>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Statistics Ledger Strip for Retest Tab (2. TT Khảo sát lại) */}
      {subTab === "info" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-xs grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] tabular-nums animate-in fade-in duration-300">
          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Tổng cần khảo sát lại</p>
              <p className="text-2xl font-black text-[#003B3A] mt-0.5">{retestStats.total}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Hồ sơ diện kiểm tra lại
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F0FDFA] text-[#003B3A] border border-[#CCFBF1]">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Chờ đăng ký đợt mới</p>
              <p className="text-2xl font-black text-[#D97706] mt-0.5">{retestStats.pending}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Cần xếp lịch khảo sát lại
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-[#D97706] border border-amber-200/70">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Đã đăng ký đợt mới</p>
              <p className="text-2xl font-black text-[#059669] mt-0.5">{retestStats.registered}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Đã chuyển sang đợt khảo sát mới
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-[#059669] border border-emerald-200/70">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Tỷ lệ đã xử lý</p>
              <p className="text-2xl font-black text-[#00736E] mt-0.5">{retestStats.rate}%</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Hoàn tất phân đợt mới
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Statistics Ledger Strip for Result & Enrollment Tab (3. Kết quả & Nhập học) */}
      {subTab === "result" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] tabular-nums animate-in fade-in duration-300">
          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Tổng số trong bộ lọc</p>
              <p className="text-2xl font-black text-[#003B3A] mt-0.5">{statistics.total}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Hồ sơ khảo sát đầu vào
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F0FDFA] text-[#003B3A] border border-[#CCFBF1]">
              <Users2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Đạt / Cam kết / Học thử</p>
              <p className="text-2xl font-black text-[#059669] mt-0.5">{statistics.passed}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Đủ điều kiện nhập học
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-[#059669] border border-emerald-200/70">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Không đạt</p>
              <p className="text-2xl font-black text-[#E11D48] mt-0.5">{statistics.failed}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Không đạt / Kiểm tra lại
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 text-[#E11D48] border border-rose-200/70">
              <XCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Chờ duyệt / Khác</p>
              <p className="text-2xl font-black text-[#D97706] mt-0.5">{statistics.pending}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Đang chờ phê duyệt KQ
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-[#D97706] border border-amber-200/70">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-3 col-span-2 sm:col-span-1">
            <div>
              <p className="text-xs font-semibold text-slate-500">Đã nhập học / Chờ xếp lớp</p>
              <p className="text-2xl font-black text-[#00736E] mt-0.5">
                {statistics.enrolled} / {statistics.requestedEnrollment}
              </p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Đã phân lớp chính thức
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {(subTab === "periods" || subTab === "students" || subTab === "students_s" || subTab === "students_i" || subTab === "handover") ? (
        <div className="transition-all duration-300">
          {activeTab === "general" ? (
            <InputAssessmentsClient
              academicYears={academicYears}
              campuses={campuses}
              examBoardUsers={examBoardUsers}
              giaoVuCSUsers={giaoVuCSUsers}
              gdcsUsers={gdcsUsers}
              subjects={subjects}
              eduSystems={eduSystems}
              grades={grades}
              configs={configs}
              teachers={teachers}
              departments={departments}
              currentUser={currentUser}
              rolePermissions={rolePermissions}
              mode="input"
              forcedTab={subTab === "students_s" || subTab === "students_i" ? "students" : subTab}
              k12Track={subTab === "students_i" ? "HE_I" : "HE_S"}
              onK12TrackChange={(nextTrack) => handleSubTabChange(nextTrack === "HE_I" ? "students_i" : "students_s")}
              viewMode="general"
              destinationSchools={destinationSchools}
            />
          ) : activeTab === "transfer" ? (
            <InputAssessmentsClient
              academicYears={academicYears}
              campuses={campuses}
              examBoardUsers={examBoardUsers}
              giaoVuCSUsers={giaoVuCSUsers}
              gdcsUsers={gdcsUsers}
              subjects={subjects}
              eduSystems={eduSystems}
              grades={grades}
              configs={configs}
              teachers={teachers}
              departments={departments}
              currentUser={currentUser}
              rolePermissions={rolePermissions}
              mode="input"
              forcedTab={subTab === "students_s" || subTab === "students_i" ? "students" : subTab}
              viewMode="transfer"
              destinationSchools={destinationSchools}
            />
          ) : (
            <PreschoolInputAssessmentsClient
              academicYears={academicYears}
              campuses={campuses}
              giaoVuCSUsers={giaoVuCSUsers}
              grades={gradesPreschool}
              teachers={teachers}
              departments={departments}
              currentUser={currentUser}
              mode="input"
              forcedTab={subTab === "students" ? "children" : subTab}
            />
          )}
        </div>
      ) : (
        <>
          {/* Filters & Search Control Panel */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#003B3A] font-bold text-sm">
            <Filter className="w-4 h-4 text-[#00A19A]" />
            <span>
              {subTab === "batch"
                ? "Bộ lọc Kết quả khảo sát theo đợt"
                : subTab === "info"
                ? "Bộ lọc Danh sách khảo sát lại"
                : "Bộ lọc Kết quả & Nhập học"}
            </span>
          </div>

          {subTab === "batch" && (
            <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
              {[
                { id: "all", label: "Tất cả", count: currentDataset.length },
                { id: "pending", label: "Chờ duyệt", count: batchStats.pending },
                { id: "passed", label: "Đạt chuẩn", count: batchStats.passedStandard },
                { id: "committed", label: "Đạt cam kết / Học thử", count: batchStats.committedOrProbation },
                { id: "failed", label: "Không đạt", count: batchStats.failed },
                { id: "absent", label: "Vắng khảo sát", count: batchStats.absent },
              ].map((pill) => {
                const isActive = selectedBatchStatusFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      setSelectedBatchStatusFilter(pill.id as any);
                      setCurrentPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#003B3A] text-white border-[#003B3A] shadow-2xs"
                        : "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:border-[#008B85]/50 hover:text-[#003B3A]"
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-white text-slate-600 border border-[#E2E8F0]"
                    }`}>
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {subTab === "info" && (
            <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
              {[
                { id: "all", label: "Tất cả cần KS lại", count: retestStats.total },
                { id: "pending", label: "Chờ đăng ký đợt mới", count: retestStats.pending },
                { id: "registered", label: "Đã đăng ký đợt mới", count: retestStats.registered },
              ].map((pill) => {
                const isActive = selectedRetestFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      setSelectedRetestFilter(pill.id as any);
                      setCurrentPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#003B3A] text-white border-[#003B3A] shadow-2xs"
                        : "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:border-[#008B85]/50 hover:text-[#003B3A]"
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-white text-slate-600 border border-[#E2E8F0]"
                    }`}>
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {subTab === "result" && (
            <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
              {[
                { id: "all", label: "Tất cả hồ sơ", count: currentDataset.length },
                { id: "enrolled", label: "Đã nhập học / Chờ xếp lớp", count: statistics.requestedEnrollment },
                { id: "not_enrolled", label: "Chưa nhập học", count: Math.max(0, statistics.total - statistics.requestedEnrollment) },
              ].map((pill) => {
                const isActive = selectedEnrollmentFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      setSelectedEnrollmentFilter(pill.id);
                      setCurrentPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#003B3A] text-white border-[#003B3A] shadow-2xs"
                        : "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:border-[#008B85]/50 hover:text-[#003B3A]"
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-white text-slate-600 border border-[#E2E8F0]"
                    }`}>
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${subTab === "result" || subTab === "batch" ? "lg:grid-cols-6 md:grid-cols-3" : "lg:grid-cols-5 md:grid-cols-3"} gap-3`}>
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tên hoặc mã HS..."
              className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm border border-slate-200/80 bg-white focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none transition-all text-slate-700 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Period Filter */}
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              setSelectedBatch(""); // Reset batch when period changes
              setCurrentPage(1);
            }}
            className="px-3 py-2.5 rounded-xl text-sm border border-slate-200/80 focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer text-slate-700 font-medium shadow-xs"
          >
            <option value="">Tất cả Kỳ khảo sát</option>
            {uniquePeriodNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Batch Filter */}
          <select
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2.5 rounded-xl text-sm border border-slate-200/80 focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer text-slate-700 font-medium shadow-xs"
          >
            <option value="">Tất cả Đợt khảo sát</option>
            <option value="UNASSIGNED">Khảo sát lẻ / Chưa phân đợt</option>
            {uniqueBatchNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Campus Filter */}
          <select
            value={selectedCampusFilter}
            onChange={(e) => {
              setSelectedCampusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2.5 rounded-xl text-sm border border-slate-200/80 focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer text-slate-700 font-medium shadow-xs"
          >
            <option value="all">Tất cả Cơ sở</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>{c.campusName}</option>
            ))}
          </select>

          {/* Grade Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2.5 rounded-xl text-sm border border-slate-200/80 focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer text-slate-700 font-medium shadow-xs"
          >
            <option value="">Tất cả Khối</option>
            {filterOptions.grades.map((g) => (
              <option key={g} value={g}>{activeTab !== "preschool" ? `Khối ${g}` : g}</option>
            ))}
          </select>

          {/* Secondary Status Filter by subTab */}
          {subTab === "info" ? (
            <select
              value={selectedRetestFilter}
              onChange={(e) => {
                setSelectedRetestFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 rounded-xl text-sm border border-slate-200/80 focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer text-slate-700 font-medium shadow-xs"
            >
              <option value="all">Tất cả Trạng thái KS lại</option>
              <option value="pending">Chờ đăng ký đợt mới</option>
              <option value="registered">Đã đăng ký đợt mới</option>
            </select>
          ) : subTab === "batch" ? (
            <select
              value={selectedResult}
              onChange={(e) => {
                setSelectedResult(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 rounded-xl text-sm border border-slate-200/80 focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer text-slate-700 font-medium shadow-xs"
            >
              <option value="">Tất cả KQ đã xét duyệt</option>
              {filterOptions.results.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          ) : (
            <select
              value={selectedEnrollmentFilter}
              onChange={(e) => {
                setSelectedEnrollmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 rounded-xl text-sm border border-slate-200/80 focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer text-slate-700 font-medium shadow-xs"
            >
              <option value="all">Tất cả Trạng thái Nhập học</option>
              <option value="enrolled">Đã nhập học (X)</option>
              <option value="not_enrolled">Chưa nhập học</option>
            </select>
          )}
        </div>
        {activeTab !== "preschool" && (
          <div className="pt-2.5 mt-2.5 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 font-medium">
              Phiếu phỏng vấn định hướng HS &amp; PHHS (PVDH-01..05):{" "}
              <strong className="text-[#003B3A]">
                {selectedIds.length > 0
                  ? `Đang chọn ${selectedIds.length} hồ sơ`
                  : `${filteredStudents.length} hồ sơ theo bộ lọc`}
              </strong>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={exportingPvdhBatch || filteredStudents.length === 0}
                onClick={async () => {
                  const targetIds =
                    selectedIds.length > 0
                      ? selectedIds
                      : filteredStudents.slice(0, 50).map((st: any) => st.id);
                  setExportingPvdhBatch(true);
                  try {
                    const res = await fetch("/api/pvdh/pdf", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        mode: "BATCH_PDF_ZIP",
                        studentIds: targetIds,
                        periodId: selectedPeriod || undefined,
                      }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      showNotification(err.error || "Chưa có phiếu định hướng PVDH để xuất ZIP.", "err");
                      return;
                    }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `Phieu_Dinh_Huong_PVDH_${new Date().toISOString().split("T")[0]}.zip`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showNotification("Đã tải gói ZIP phiếu định hướng PVDH!");
                  } catch (e: any) {
                    showNotification("Lỗi xuất PDF hàng loạt: " + e.message, "err");
                  } finally {
                    setExportingPvdhBatch(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F0FDFA] text-[#003B3A] border border-[#E2E8F0] hover:border-[#00A19A] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#008B85]" />
                <span>Xuất PDF định hướng (.zip)</span>
              </button>
              <button
                type="button"
                disabled={exportingPvdhBatch || filteredStudents.length === 0}
                onClick={async () => {
                  const targetIds =
                    selectedIds.length > 0
                      ? selectedIds
                      : filteredStudents.map((st: any) => st.id);
                  setExportingPvdhBatch(true);
                  try {
                    const res = await fetch("/api/pvdh/pdf", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        mode: "EXCEL_SUMMARY",
                        studentIds: targetIds,
                        periodId: selectedPeriod || undefined,
                      }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      showNotification(err.error || "Chưa có dữ liệu định hướng PVDH để xuất Excel.", "err");
                      return;
                    }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `Tong_Hop_Dinh_Huong_PVDH_${new Date().toISOString().split("T")[0]}.xlsx`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showNotification("Đã xuất bảng tổng hợp định hướng PVDH (.xlsx)!");
                  } catch (e: any) {
                    showNotification("Lỗi xuất Excel định hướng: " + e.message, "err");
                  } finally {
                    setExportingPvdhBatch(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#004d4b] text-white font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#5EEAD4]" />
                <span>Xuất Excel tổng hợp định hướng</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {subTab === "batch" ? (
            /* KẾT QUẢ KHẢO SÁT THEO ĐỢT — SKY-LINE ACADEMIC LEDGER TABLE */
            <table className="w-full text-left table-auto border-collapse tabular-nums">
              <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-3 px-3 text-center w-10 font-semibold">
                    <input
                      type="checkbox"
                      checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedIds.includes(s.id))}
                      onChange={(e) => setSelectedIds(e.target.checked ? paginatedStudents.map(s => s.id) : [])}
                      className="w-4 h-4 rounded text-[#00A19A] focus:ring-[#00A19A] cursor-pointer"
                      title="Chọn tất cả học sinh trên trang này"
                    />
                  </th>
                  <th className="py-3 px-3 text-teal-100 font-semibold">Mã HS</th>
                  <th className="py-3 px-3.5 min-w-[180px] font-semibold">Học sinh</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Ngày sinh</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Giới tính</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Khối</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Hệ</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Cơ sở</th>
                  <th className="py-3 px-3.5 min-w-[230px] font-semibold">Kết quả khảo sát</th>
                  <th className="py-3 px-3 text-center text-[#5EEAD4] font-semibold">KQ đã xét duyệt</th>
                  <th className="py-3 px-3.5 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center border-b border-slate-100">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="w-11 h-11 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#00736E]">
                          <FileText className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">Không tìm thấy hồ sơ khảo sát phù hợp</p>
                        <p className="text-xs text-slate-500">
                          Vui lòng điều chỉnh bộ lọc Kỳ khảo sát, Đợt khảo sát hoặc từ khóa tìm kiếm.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((s) => {
                    const isChecked = selectedIds.includes(s.id);
                    const isPending = !s.admissionResult && !s.isAbsent;
                    const isPassedStandard =
                      s.admissionResult === "Đạt" ||
                      (s.admissionResult?.includes("Đạt") &&
                        !s.admissionResult?.includes("Không") &&
                        !s.admissionResult?.includes("cam kết"));
                    const isCommitted = s.admissionResult?.includes("cam kết");
                    const isProbation = s.admissionResult === "Học thử";

                    const dobStr = formatDate(s.dateOfBirth);
                    const genderStr =
                      s.gender === "M" || s.gender === "MALE" || s.gender === "Nam"
                        ? "Nam"
                        : s.gender === "F" || s.gender === "FEMALE" || s.gender === "Nữ"
                        ? "Nữ"
                        : s.gender || "—";
                    const shortCampus = resolveCampusShortName(s);
                    const surveyPills = getStudentSurveyPills(s);
                    const commSubjectsSummary = extractCommittedSubjectsSummary(s.directorNote);
                    const batchLabel = s.batch?.name ? cleanBatchName(s.batch.name) : "Khảo sát lẻ";

                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors align-middle cursor-pointer ${
                          isChecked
                            ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                            : "hover:bg-[#F8FAFC]"
                        }`}
                        onClick={() => {
                          setSelectedStudent(s);
                          setIsDetailsOpen(true);
                        }}
                      >
                        {/* 1. Checkbox */}
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setSelectedIds((prev) =>
                                e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                              )
                            }
                            className="w-4 h-4 rounded text-[#008B85] focus:ring-[#00A19A] cursor-pointer"
                          />
                        </td>

                        {/* 2. Mã HS */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono font-semibold text-xs text-[#003B3A] bg-[#F8FAFC] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                            {s.studentCode || "—"}
                          </span>
                        </td>

                        {/* 3. Học sinh */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-slate-900 hover:text-[#00736E] transition-colors text-[13px]">
                              {s.fullName}
                            </span>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {s.period?.name && (
                                <span className="text-[10px] font-medium text-slate-500">
                                  {s.period.name} •
                                </span>
                              )}
                              <span
                                className="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] max-w-[240px] truncate"
                                title={batchLabel}
                              >
                                {batchLabel}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Ngày sinh */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap text-slate-600">
                          {dobStr}
                        </td>

                        {/* 5. Giới tính */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap text-slate-600">
                          {genderStr}
                        </td>

                        {/* 6. Khối */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md font-semibold text-xs bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0]">
                            {activeTab === "preschool" ? (s.grade || "—") : `Khối ${s.grade || "—"}`}
                          </span>
                        </td>

                        {/* 7. Hệ */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap font-semibold text-slate-700">
                          {s.surveyFormType || s.surveySystem || "—"}
                        </td>

                        {/* 8. Cơ sở */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                            {shortCampus}
                          </span>
                        </td>

                        {/* 9. Kết quả khảo sát */}
                        <td className="py-3 px-3.5">
                          {surveyPills.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5 text-left">
                              {surveyPills.slice(0, 4).map((p) => (
                                <span
                                  key={p.key}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] hover:border-[#008B85]/60 transition-colors"
                                >
                                  <span className="text-slate-500 font-medium">{p.label}:</span>
                                  <strong className="font-bold text-[#003B3A]">{p.value}</strong>
                                </span>
                              ))}
                              {surveyPills.length > 4 && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                                  +{surveyPills.length - 4} môn
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Chưa ghi nhận điểm</span>
                          )}
                        </td>

                        {/* 10. KQ đã xét duyệt */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex flex-col items-center justify-center gap-1">
                            {s.isAbsent ? (
                              <span className="font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px]">
                                Vắng khảo sát
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1.5 text-[#D97706] bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                                Chờ duyệt
                              </span>
                            ) : (
                              <>
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                    isPassedStandard
                                      ? "bg-emerald-50 text-[#059669] border-emerald-200"
                                      : isCommitted
                                      ? "bg-amber-50 text-[#D97706] border-amber-200"
                                      : isProbation
                                      ? "bg-[#F0FDFA] text-[#00736E] border-[#99F6E4]"
                                      : "bg-rose-50 text-[#E11D48] border-rose-200"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isPassedStandard
                                        ? "bg-[#059669]"
                                        : isCommitted
                                        ? "bg-[#D97706]"
                                        : isProbation
                                        ? "bg-[#008B85]"
                                        : "bg-[#E11D48]"
                                    }`}
                                  />
                                  {s.admissionResult === "Đạt" ? "Đạt chuẩn" : s.admissionResult}
                                </span>
                                {commSubjectsSummary && (
                                  <span
                                    className="text-[10px] font-medium text-[#D97706] max-w-[180px] truncate"
                                    title={commSubjectsSummary}
                                  >
                                    Môn: {commSubjectsSummary}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* 11. Thao tác */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {activeTab !== "preschool" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setPvdhTargetStudent(s)}
                                  className="p-1.5 text-[#00736E] hover:bg-[#F0FDFA] border border-[#CCFBF1] rounded-lg transition-all cursor-pointer"
                                  title="Nhập / Xem phiếu phỏng vấn định hướng PVDH (Khối 1–12)"
                                >
                                  <HeartHandshake className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReportTargetStudent(s);
                                    setActiveReportOrientationData(null);
                                  }}
                                  className="p-1.5 text-[#00736E] hover:bg-[#F0FDFA] border border-[#CCFBF1] rounded-lg transition-all cursor-pointer"
                                  title="Báo cáo nhận diện & định hướng (A4)"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudent(s);
                                setIsDetailsOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-[#003B3A] hover:bg-[#005854] text-white shadow-2xs cursor-pointer transition-colors"
                              title="Xem chi tiết kết quả khảo sát"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Chi tiết
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : subTab === "info" ? (
            /* 2. TT KHẢO SÁT LẠI — SKY-LINE ACADEMIC LEDGER TABLE (Phổ thông, Chuyển hệ & Mầm non) */
            <table className="w-full text-left table-auto border-collapse tabular-nums">
              <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-3 px-3 text-center w-10 font-semibold">
                    <input
                      type="checkbox"
                      checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedIds.includes(s.id))}
                      onChange={(e) => setSelectedIds(e.target.checked ? paginatedStudents.map(s => s.id) : [])}
                      className="w-4 h-4 rounded text-[#00A19A] focus:ring-[#00A19A] cursor-pointer"
                      title="Chọn tất cả học sinh trên trang này"
                    />
                  </th>
                  <th className="py-3 px-3 text-teal-100 font-semibold">Mã HS</th>
                  <th className="py-3 px-3.5 min-w-[190px] font-semibold">Học sinh</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Ngày sinh</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Giới tính</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Khối</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Hệ</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Cơ sở</th>
                  <th className="py-3 px-3.5 min-w-[210px] font-semibold">Kết quả khảo sát</th>
                  <th className="py-3 px-3 text-center text-[#5EEAD4] font-semibold">Trạng thái KS lại</th>
                  <th className="py-3 px-3 text-center text-teal-100 font-semibold">Đăng ký đợt mới</th>
                  <th className="py-3 px-3.5 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center border-b border-slate-100">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="w-11 h-11 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#00736E]">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">Không có học sinh cần khảo sát lại</p>
                        <p className="text-xs text-slate-500">
                          Tất cả học sinh đều đã đạt yêu cầu hoặc không có kết quả phù hợp với bộ lọc hiện tại.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((s) => {
                    const isChecked = selectedIds.includes(s.id);
                    const retestRecord = currentDataset.find(o => o.studentCode === s.studentCode && o.id !== s.id);
                    const isRetestRegistered = !!retestRecord;
                    const retestTargetText = isRetestRegistered
                      ? `${retestRecord.period?.name || "Kỳ mới"}${retestRecord.batch?.name ? ` • ${cleanBatchName(retestRecord.batch.name)}` : ""}`
                      : "";

                    const dobStr = formatDate(s.dateOfBirth);
                    const genderStr =
                      s.gender === "M" || s.gender === "MALE" || s.gender === "Nam"
                        ? "Nam"
                        : s.gender === "F" || s.gender === "FEMALE" || s.gender === "Nữ"
                        ? "Nữ"
                        : s.gender || "—";
                    const shortCampus = resolveCampusShortName(s);
                    const surveyPills = getStudentSurveyPills(s);
                    const batchLabel = s.batch?.name ? cleanBatchName(s.batch.name) : "Khảo sát lẻ";
                    const retestSubjectsText = extractCommittedSubjectsSummary(s.directorNote);

                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors align-middle cursor-pointer ${
                          isChecked
                            ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                            : isRetestRegistered
                            ? "bg-emerald-50/25 hover:bg-emerald-50/50"
                            : "hover:bg-[#F8FAFC]"
                        }`}
                        onClick={() => {
                          setSelectedStudent(s);
                          setIsDetailsOpen(true);
                        }}
                      >
                        {/* 1. Checkbox */}
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setSelectedIds((prev) =>
                                e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                              )
                            }
                            className="w-4 h-4 rounded text-[#008B85] focus:ring-[#00A19A] cursor-pointer"
                          />
                        </td>

                        {/* 2. Mã HS */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono font-semibold text-xs text-[#003B3A] bg-[#F8FAFC] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                            {s.studentCode || "—"}
                          </span>
                        </td>

                        {/* 3. Học sinh + Kỳ/Đợt KS cũ */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-slate-900 hover:text-[#00736E] transition-colors text-[13px]">
                              {s.fullName}
                            </span>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {s.period?.name && (
                                <span className="text-[10px] font-medium text-slate-500">
                                  {s.period.name} •
                                </span>
                              )}
                              <span
                                className="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] max-w-[240px] truncate"
                                title={batchLabel}
                              >
                                {batchLabel}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Ngày sinh */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap text-slate-600">
                          {dobStr}
                        </td>

                        {/* 5. Giới tính */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap text-slate-600">
                          {genderStr}
                        </td>

                        {/* 6. Khối */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md font-semibold text-xs bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0]">
                            {activeTab === "preschool" ? (s.grade || "—") : `Khối ${s.grade || "—"}`}
                          </span>
                        </td>

                        {/* 7. Hệ */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap font-semibold text-slate-700">
                          {s.surveyFormType || s.surveySystem || "—"}
                        </td>

                        {/* 8. Cơ sở */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                            {shortCampus}
                          </span>
                        </td>

                        {/* 9. Kết quả khảo sát */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col items-start gap-1">
                            {surveyPills.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5 text-left">
                                {surveyPills.slice(0, 3).map((p) => (
                                  <span
                                    key={p.key}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0]"
                                  >
                                    <span className="text-slate-500 font-medium">{p.label}:</span>
                                    <strong className="font-bold text-[#003B3A]">{p.value}</strong>
                                  </span>
                                ))}
                                {surveyPills.length > 3 && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                                    +{surveyPills.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-[#E11D48] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                {s.devAssessmentResult || s.admissionResult || "Cần khảo sát lại"}
                              </span>
                            )}
                            {retestSubjectsText && (
                              <span
                                className="text-[10px] font-semibold text-[#E11D48] max-w-[210px] truncate"
                                title={`Môn KS lại: ${retestSubjectsText}`}
                              >
                                Môn KS lại: {retestSubjectsText}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 10. Trạng thái KS lại */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isRetestRegistered ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-[#059669] border border-emerald-200 text-[11px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                                Đã đăng ký đợt mới
                              </span>
                              <span
                                className="text-[10px] text-slate-500 font-medium max-w-[160px] truncate"
                                title={retestTargetText}
                              >
                                {retestTargetText}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-[#D97706] border border-amber-200 text-[11px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                              Chờ đăng ký lại
                            </span>
                          )}
                        </td>

                        {/* 11. Đăng ký đợt mới */}
                        <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setRetestStudent(s);
                              setRetestPeriodId("");
                              setRetestBatchId("");
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                              isRetestRegistered
                                ? "bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 border border-[#E2E8F0]"
                                : "bg-[#008B85] hover:bg-[#00736E] text-white shadow-2xs"
                            }`}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{isRetestRegistered ? "Đổi đợt" : "Đăng ký KS lại"}</span>
                          </button>
                        </td>

                        {/* 12. Thao tác */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(s)}
                              className="p-1.5 text-slate-500 hover:text-[#00736E] hover:bg-[#F0FDFA] border border-[#E2E8F0] rounded-lg transition-all cursor-pointer"
                              title="Chỉnh sửa hồ sơ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteStudent(s, e)}
                              className="p-1.5 text-slate-500 hover:text-[#E11D48] hover:bg-rose-50 border border-[#E2E8F0] rounded-lg transition-all cursor-pointer"
                              title="Xóa hồ sơ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudent(s);
                                setIsDetailsOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-[#003B3A] hover:bg-[#005854] text-white shadow-2xs cursor-pointer transition-colors"
                              title="Xem chi tiết kết quả khảo sát"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Chi tiết
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* 3. KẾT QUẢ & NHẬP HỌC — SKY-LINE ACADEMIC LEDGER TABLE (Phổ thông, Chuyển hệ & Mầm non) */
            <table className="w-full text-left table-auto border-collapse tabular-nums">
              <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-3 px-3 text-center w-10 font-semibold">
                    <input
                      type="checkbox"
                      checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedIds.includes(s.id))}
                      onChange={(e) => setSelectedIds(e.target.checked ? paginatedStudents.map(s => s.id) : [])}
                      className="w-4 h-4 rounded text-[#00A19A] focus:ring-[#00A19A] cursor-pointer"
                      title="Chọn tất cả học sinh trên trang này"
                    />
                  </th>
                  <th className="py-3 px-3 text-teal-100 font-semibold">Mã HS</th>
                  <th className="py-3 px-3.5 min-w-[180px] font-semibold">Học sinh</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Ngày sinh</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Giới tính</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Khối</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Hệ</th>
                  <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Cơ sở</th>
                  <th className="py-3 px-3.5 min-w-[210px] font-semibold">Kết quả khảo sát</th>
                  <th className="py-3 px-3 text-center text-[#5EEAD4] font-semibold">KQ đã xét duyệt</th>
                  <th className="py-3 px-2 text-center text-teal-100 font-semibold">Vắng</th>
                  <th className="py-3 px-3 text-center text-teal-100 font-semibold">Nhập học & Lớp</th>
                  {selectedPeriod?.toLowerCase().includes("open day") && (
                    <>
                      <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Đăng ký CS</th>
                      <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Ủy quyền duyệt</th>
                    </>
                  )}
                  <th className="py-3 px-3.5 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={selectedPeriod?.toLowerCase().includes("open day") ? 15 : 13}
                      className="px-4 py-12 text-center border-b border-slate-100"
                    >
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="w-11 h-11 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#00736E]">
                          <FileText className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">Không tìm thấy hồ sơ học sinh phù hợp</p>
                        <p className="text-xs text-slate-500">
                          Vui lòng điều chỉnh bộ lọc Kỳ khảo sát, Đợt khảo sát hoặc trạng thái nhập học.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((s) => {
                    const isChecked = selectedIds.includes(s.id);
                    const isEnrolled =
                      s.enrollmentStatus === "COMPLETED" ||
                      s.enrollmentStatus === "ENROLLED" ||
                      s.enrollmentStatus === "PENDING" ||
                      !!s.enrollmentClass ||
                      !!s.enrollmentClassId;

                    const isPending = !s.admissionResult && !s.isAbsent;
                    const isPassedStandard =
                      s.admissionResult === "Đạt" ||
                      (s.admissionResult?.includes("Đạt") &&
                        !s.admissionResult?.includes("Không") &&
                        !s.admissionResult?.includes("cam kết"));
                    const isCommitted = s.admissionResult?.includes("cam kết");
                    const isProbation = s.admissionResult === "Học thử";

                    const dobStr = formatDate(s.dateOfBirth);
                    const genderStr =
                      s.gender === "M" || s.gender === "MALE" || s.gender === "Nam"
                        ? "Nam"
                        : s.gender === "F" || s.gender === "FEMALE" || s.gender === "Nữ"
                        ? "Nữ"
                        : s.gender || "—";
                    const shortCampus = resolveCampusShortName(s);
                    const surveyPills = getStudentSurveyPills(s);
                    const commSubjectsSummary = extractCommittedSubjectsSummary(s.directorNote);
                    const batchLabel = s.batch?.name ? cleanBatchName(s.batch.name) : "Khảo sát lẻ";
                    const isPreschool = activeTab === "preschool";

                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors align-middle cursor-pointer ${
                          isChecked
                            ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                            : isEnrolled
                            ? "bg-emerald-50/30 hover:bg-emerald-50/60"
                            : "hover:bg-[#F8FAFC]"
                        }`}
                        onClick={() => {
                          setSelectedStudent(s);
                          setIsDetailsOpen(true);
                        }}
                      >
                        {/* 1. Checkbox */}
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setSelectedIds((prev) =>
                                e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                              )
                            }
                            className="w-4 h-4 rounded text-[#008B85] focus:ring-[#00A19A] cursor-pointer"
                          />
                        </td>

                        {/* 2. Mã HS */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono font-semibold text-xs text-[#003B3A] bg-[#F8FAFC] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                            {s.studentCode || "—"}
                          </span>
                        </td>

                        {/* 3. Học sinh */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-slate-900 hover:text-[#00736E] transition-colors text-[13px]">
                              {s.fullName}
                            </span>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {s.period?.name && (
                                <span className="text-[10px] font-medium text-slate-500">
                                  {s.period.name} •
                                </span>
                              )}
                              <span
                                className="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] max-w-[230px] truncate"
                                title={batchLabel}
                              >
                                {batchLabel}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Ngày sinh */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap text-slate-600">
                          {dobStr}
                        </td>

                        {/* 5. Giới tính */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap text-slate-600">
                          {genderStr}
                        </td>

                        {/* 6. Khối */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md font-semibold text-xs bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0]">
                            {isPreschool ? (s.grade || "—") : `Khối ${s.grade || "—"}`}
                          </span>
                        </td>

                        {/* 7. Hệ */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap font-semibold text-slate-700">
                          {s.surveyFormType || s.surveySystem || "—"}
                        </td>

                        {/* 8. Cơ sở */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                            {shortCampus}
                          </span>
                        </td>

                        {/* 9. Kết quả khảo sát */}
                        <td className="py-3 px-3.5">
                          {surveyPills.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5 text-left">
                              {surveyPills.slice(0, 3).map((p) => (
                                <span
                                  key={p.key}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0]"
                                >
                                  <span className="text-slate-500 font-medium">{p.label}:</span>
                                  <strong className="font-bold text-[#003B3A]">{p.value}</strong>
                                </span>
                              ))}
                              {surveyPills.length > 3 && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                                  +{surveyPills.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Chưa ghi nhận điểm</span>
                          )}
                        </td>

                        {/* 10. KQ đã xét duyệt */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex flex-col items-center justify-center gap-1">
                            {s.isAbsent ? (
                              <span className="font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px]">
                                Vắng khảo sát
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1.5 text-[#D97706] bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                                Chờ duyệt
                              </span>
                            ) : (
                              <>
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                    isPassedStandard
                                      ? "bg-emerald-50 text-[#059669] border-emerald-200"
                                      : isCommitted
                                      ? "bg-amber-50 text-[#D97706] border-amber-200"
                                      : isProbation
                                      ? "bg-[#F0FDFA] text-[#00736E] border-[#99F6E4]"
                                      : "bg-rose-50 text-[#E11D48] border-rose-200"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isPassedStandard
                                        ? "bg-[#059669]"
                                        : isCommitted
                                        ? "bg-[#D97706]"
                                        : isProbation
                                        ? "bg-[#008B85]"
                                        : "bg-[#E11D48]"
                                    }`}
                                  />
                                  {s.admissionResult === "Đạt" ? "Đạt chuẩn" : s.admissionResult}
                                </span>
                                {commSubjectsSummary && (
                                  <span
                                    className="text-[10px] font-medium text-[#D97706] max-w-[160px] truncate"
                                    title={commSubjectsSummary}
                                  >
                                    Môn: {commSubjectsSummary}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* 11. Vắng */}
                        <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded text-[#E11D48] accent-[#E11D48] cursor-pointer"
                            checked={s.isAbsent || false}
                            onChange={async (e) => {
                              const val = e.target.checked;
                              await handleUpdateAbsent(s, val);
                            }}
                          />
                        </td>

                        {/* 12. Nhập học & Lớp */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isEnrolled ? (
                            <div className="inline-flex flex-col items-center justify-center gap-0.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                  s.enrollmentStatus === "PENDING" && !s.enrollmentClass && !s.enrollmentClassId
                                    ? "bg-amber-50 text-[#D97706] border-amber-200"
                                    : "bg-emerald-50 text-[#059669] border-emerald-200"
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                {s.enrollmentStatus === "PENDING" && !s.enrollmentClass && !s.enrollmentClassId
                                  ? "Chờ xếp lớp"
                                  : "Đã nhập học"}
                              </span>
                              {(s.enrollmentClass?.className || s.enrollmentClassId) && (
                                <span className="text-[10px] font-bold text-[#003B3A] bg-[#F8FAFC] px-1.5 py-0.2 rounded border border-[#E2E8F0]">
                                  Lớp: {s.enrollmentClass?.className || s.enrollmentClassId}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Chưa nhập học</span>
                          )}
                        </td>

                        {/* Open Day Extra Columns */}
                        {selectedPeriod?.toLowerCase().includes("open day") && (
                          <>
                            <td className="py-3 px-2.5 text-center text-xs text-slate-600">
                              {campuses.find(c => c.id === s.registeredCampus)?.campusName || s.registeredCampus || "—"}
                            </td>
                            <td className="py-3 px-2.5 text-center text-xs text-slate-700 font-semibold">
                              {campuses.find(c => c.id === s.registeredCampus)?.manager?.fullName || "—"}
                            </td>
                          </>
                        )}

                        {/* 13. Thao tác */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleConfirmEnrollment(s, isPreschool)}
                              disabled={
                                s.enrollmentStatus === "COMPLETED" ||
                                s.enrollmentStatus === "ENROLLED" ||
                                s.enrollmentStatus === "PENDING" ||
                                !!s.enrollmentClass ||
                                !!s.enrollmentClassId ||
                                !s.admissionResult ||
                                !s.admissionResult.toUpperCase().includes("ĐẠT")
                              }
                              className={`p-1.5 rounded-lg transition-all ${
                                s.admissionResult &&
                                s.admissionResult.toUpperCase().includes("ĐẠT") &&
                                s.enrollmentStatus !== "COMPLETED" &&
                                s.enrollmentStatus !== "ENROLLED" &&
                                s.enrollmentStatus !== "PENDING" &&
                                !s.enrollmentClass &&
                                !s.enrollmentClassId
                                  ? "text-[#059669] hover:bg-emerald-50 border border-emerald-200 cursor-pointer"
                                  : "text-slate-300 border border-slate-100 cursor-not-allowed opacity-40"
                              }`}
                              title={
                                s.enrollmentStatus === "COMPLETED" ||
                                s.enrollmentStatus === "ENROLLED" ||
                                s.enrollmentClass ||
                                s.enrollmentClassId
                                  ? "Đã sắp lớp" +
                                    (s.enrollmentClass?.className || s.enrollmentClassId
                                      ? " (" + (s.enrollmentClass?.className || s.enrollmentClassId) + ")"
                                      : "")
                                  : s.enrollmentStatus === "PENDING"
                                  ? "Đã gửi yêu cầu nhập học (Chờ xếp lớp)"
                                  : "Xác nhận nhập học"
                              }
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevertEnrollment(s, isPreschool)}
                              disabled={
                                !s.enrollmentStatus ||
                                s.enrollmentStatus === "COMPLETED" ||
                                s.enrollmentStatus === "ENROLLED" ||
                                !!s.enrollmentClass ||
                                !!s.enrollmentClassId
                              }
                              className={`p-1.5 rounded-lg transition-all ${
                                s.enrollmentStatus &&
                                s.enrollmentStatus !== "COMPLETED" &&
                                s.enrollmentStatus !== "ENROLLED" &&
                                !s.enrollmentClass &&
                                !s.enrollmentClassId
                                  ? "text-[#E11D48] hover:bg-rose-50 border border-rose-200 cursor-pointer"
                                  : "text-slate-300 border border-slate-100 cursor-not-allowed opacity-40"
                              }`}
                              title={
                                s.enrollmentStatus === "COMPLETED" ||
                                s.enrollmentStatus === "ENROLLED" ||
                                s.enrollmentClass ||
                                s.enrollmentClassId
                                  ? "Đã sắp lớp - Không thể hoàn lại"
                                  : s.enrollmentStatus
                                  ? "Hoàn trả (Hủy yêu cầu / Rút nhập học)"
                                  : "Chưa có thông tin nhập học để hoàn trả"
                              }
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            {!isPreschool && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setPvdhTargetStudent(s)}
                                  className="p-1.5 text-[#00736E] hover:bg-[#F0FDFA] border border-[#CCFBF1] rounded-lg transition-all cursor-pointer"
                                  title="Nhập / Xem phiếu phỏng vấn định hướng PVDH (Khối 1–12)"
                                >
                                  <HeartHandshake className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReportTargetStudent(s);
                                    setActiveReportOrientationData(null);
                                  }}
                                  className="p-1.5 text-[#00736E] hover:bg-[#F0FDFA] border border-[#CCFBF1] rounded-lg transition-all cursor-pointer"
                                  title="Báo cáo nhận diện & định hướng (A4)"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudent(s);
                                setIsDetailsOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-[#003B3A] hover:bg-[#005854] text-white shadow-2xs cursor-pointer transition-colors"
                              title="Xem chi tiết kết quả khảo sát"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Chi tiết
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredStudents.length > 0 && (
          <div className="px-4 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs font-semibold tabular-nums">
            <span className="text-xs text-slate-600 font-medium">
              Hiển thị <strong className="font-bold text-[#003B3A]">{Math.min(filteredStudents.length, (currentPage - 1) * pageSize + 1)}–{Math.min(filteredStudents.length, currentPage * pageSize)}</strong> trong tổng số{" "}
              <strong className="font-bold text-[#003B3A]">{filteredStudents.length}</strong> học sinh
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                if (totalPages > 5 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="px-1.5 py-1 text-xs text-slate-400">…</span>;
                  }
                  return null;
                }
                return (
                  <button
                    type="button"
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-[#003B3A] text-white border-[#003B3A] shadow-2xs"
                        : "bg-white text-slate-600 border-[#E2E8F0] hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer text-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* Dialog Form: Add / Edit Student */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-[#1E293B]/65 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-[900px] max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-[#D9E2EC]">
            {/* Header */}
            <div className="px-6 py-5 flex justify-between items-center bg-white border-b border-[#D9E2EC] shrink-0">
              <div>
                <h3 className="text-lg font-black text-[#004C97] flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-[#00B5E2] inline-block rounded animate-pulse"></span>
                  {formMode === "create" ? (activeTab === "general" ? "Thêm mới học sinh" : "Thêm trẻ mới") : "Chỉnh sửa thông tin học sinh"}
                </h3>
                <p className="text-xs text-[#64748B] font-semibold mt-1">
                  Mã học sinh: <span className="text-[#004C97] font-bold">{formState.studentCode || "(Sẽ tự động sinh nếu trống)"}</span>
                  {formState.admissionResult && (
                    <span className="ml-3 px-2 py-0.5 bg-[#E6F8FD] text-[#004C97] text-[10px] rounded-full border border-[#00B5E2]/30 font-black uppercase">
                      {formState.admissionResult}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-xl text-[#64748B] hover:text-[#00B5E2] hover:bg-[#E6F8FD] transition-all flex items-center justify-center cursor-pointer border border-[#D9E2EC]/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Tab Switcher */}
            {!isChuyenHe && (
            <div className="bg-slate-50 border-b border-[#D9E2EC] px-6 py-1 flex gap-4 shrink-0 text-xs font-semibold overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setFormSubTab("admin")}
                className={`py-2.5 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  formSubTab === "admin"
                    ? "border-[#004C97] text-[#004C97]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                Thông tin hành chính
              </button>
              <button
                type="button"
                onClick={() => setFormSubTab("academic")}
                className={`py-2.5 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  formSubTab === "academic"
                    ? "border-[#004C97] text-[#004C97]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Hồ sơ học bạ
              </button>
              {formMode === "edit" && (
                <button
                  type="button"
                  onClick={() => setFormSubTab("approval")}
                  className={`py-2.5 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    formSubTab === "approval"
                      ? "border-[#004C97] text-[#004C97]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  Phê duyệt tuyển sinh
                </button>
              )}
            </div>

            )}

            <form onSubmit={handleSaveStudent} className="flex-1 overflow-hidden flex flex-col bg-[#F8FAFC]">
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-left">
                
                {isChuyenHe ? (
                  // Redesigned form layout for transfer system
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="bg-white border border-[#D9E2EC] p-5 rounded-2xl space-y-4 shadow-sm">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#D9E2EC]/60">
                        <span className="w-1.5 h-4 bg-[#004C97] inline-block rounded"></span>
                        <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider">Thông tin học sinh chuyển hệ</h4>
                      </div>

                      {/* Always show Period and Batch selectors so user can edit them if needed */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Kỳ khảo sát *</label>
                          <select
                            required
                            value={formState.periodId}
                            onChange={(e) => {
                              setFormState({ ...formState, periodId: e.target.value, batchId: "" });
                            }}
                            className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-bold rounded-xl outline-none focus:border-[#00B5E2] cursor-pointer"
                          >
                            <option value="">-- Chọn Kỳ khảo sát --</option>
                            {activeTab === "general" ? (
                              generalPeriods.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))
                            ) : (
                              preschoolPeriods.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Đợt khảo sát</label>
                          <select
                            value={formState.batchId}
                            onChange={(e) => setFormState({ ...formState, batchId: e.target.value })}
                            className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] cursor-pointer"
                          >
                            <option value="">-- Không phân đợt / Mặc định --</option>
                            {activeFormBatches.map((b) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {formMode === "create" ? (
                        /* CREATE MODE */
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Năm học *</label>
                              <select
                                required
                                value={transferYearId}
                                onChange={(e) => {
                                  setTransferYearId(e.target.value);
                                  setTransferClassId("");
                                  setTransferStudents([]);
                                  setSelectedStudentIds([]);
                                }}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">-- Chọn Năm học --</option>
                                {generalPeriods.length > 0 ? academicYears.filter(ay => !ay.isOff).map((y) => (
                                  <option key={y.id} value={y.id}>{y.name}</option>
                                )) : academicYears.filter(ay => !ay.isOff).map((y) => (
                                  <option key={y.id} value={y.id}>{y.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Cơ sở *</label>
                              <select
                                required
                                value={transferCampusId}
                                onChange={(e) => {
                                  setTransferCampusId(e.target.value);
                                  setTransferClassId("");
                                  setTransferStudents([]);
                                  setSelectedStudentIds([]);
                                  setTargetSystem("");
                                }}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">-- Chọn Cơ sở --</option>
                                {campuses.map((c) => (
                                  <option key={c.id} value={c.id}>{c.campusName}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Khối</label>
                              <select
                                value={transferGradeId}
                                onChange={(e) => {
                                  setTransferGradeId(e.target.value);
                                  setTransferClassId("");
                                  setTransferStudents([]);
                                  setSelectedStudentIds([]);
                                }}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">-- Tất cả Khối --</option>
                                {grades.map((g) => (
                                  <option key={g} value={g}>Khối {g}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Lớp học *</label>
                              <select
                                required
                                disabled={!transferCampusId || !transferYearId}
                                value={transferClassId}
                                onChange={(e) => {
                                  setTransferClassId(e.target.value);
                                  setTransferStudents([]);
                                  setSelectedStudentIds([]);
                                }}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer disabled:opacity-50"
                              >
                                <option value="">-- Chọn Lớp học --</option>
                                {filteredClasses.map((c) => (
                                  <option key={c.id} value={c.id}>{c.className}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Hệ đang học</label>
                              <input
                                type="text"
                                readOnly
                                value={selectedClassObj?.educationSystem || "Không xác định"}
                                className="h-10.5 w-full px-3.5 bg-slate-100 border border-[#D9E2EC] text-slate-500 text-sm font-semibold rounded-xl outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Hệ chuyển *</label>
                              <select
                                required
                                value={targetSystem}
                                onChange={(e) => setTargetSystem(e.target.value)}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">-- Chọn Hệ chuyển --</option>
                                {currentEduSystems.map((es) => (
                                  <option key={es.code} value={es.code}>{es.code} - {es.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Student Checklist Selection */}
                          <div className="space-y-3 pt-2">
                            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider">Danh sách Học sinh *</label>
                            <div className="border border-[#D9E2EC] rounded-2xl bg-white overflow-hidden shadow-sm">
                              <div className="p-3 bg-slate-50 border-b border-[#D9E2EC] flex justify-between items-center gap-4">
                                <input
                                  type="text"
                                  placeholder="Tìm nhanh học sinh..."
                                  value={studentSearchQuery}
                                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                                  className="px-3 py-1.5 bg-white border border-[#D9E2EC] rounded-lg text-xs font-semibold outline-none focus:border-[#00B5E2] max-w-xs w-full"
                                />
                                {transferStudents.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (selectedStudentIds.length === transferStudents.length) {
                                        setSelectedStudentIds([]);
                                      } else {
                                        setSelectedStudentIds(transferStudents.map(s => s.id));
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-[#E6F8FD] hover:bg-[#00B5E2]/25 text-[#004C97] border border-[#00B5E2]/30 rounded-lg text-[11px] font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                                  >
                                    {selectedStudentIds.length === transferStudents.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                                  </button>
                                )}
                              </div>
                              
                              <div className="max-h-[220px] overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                {transferStudentsLoading ? (
                                  <div className="py-6 flex justify-center items-center text-slate-400 text-xs font-semibold gap-2">
                                    <span className="w-4 h-4 border-2 border-[#00B5E2] border-t-transparent rounded-full animate-spin"></span>
                                    Đang tải danh sách học sinh...
                                  </div>
                                ) : transferStudents.length === 0 ? (
                                  <div className="py-6 text-center text-slate-400 text-xs font-semibold">
                                    {transferClassId ? "Không có học sinh nào trong lớp này." : "Vui lòng chọn Lớp học trước."}
                                  </div>
                                ) : filteredTransferStudents.length === 0 ? (
                                  <div className="py-6 text-center text-slate-400 text-xs font-semibold">
                                    Không tìm thấy học sinh phù hợp.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {filteredTransferStudents.map((s) => {
                                      const isChecked = selectedStudentIds.includes(s.id);
                                      return (
                                        <label
                                          key={s.id}
                                          className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all hover:bg-slate-50/50 ${isChecked ? 'bg-[#E6F8FD]/50 border-[#00B5E2]' : 'border-[#D9E2EC]'}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              if (isChecked) {
                                                setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                                              } else {
                                                setSelectedStudentIds([...selectedStudentIds, s.id]);
                                              }
                                            }}
                                            className="rounded border-[#D9E2EC] text-[#00B5E2] focus:ring-[#00B5E2]/15 w-4 h-4 cursor-pointer"
                                          />
                                          <div className="text-left">
                                            <div className={`text-xs font-bold ${isChecked ? 'text-[#004C97]' : 'text-slate-700'}`}>{s.studentName}</div>
                                            <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{s.studentCode}</div>
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                            {selectedStudentIds.length > 0 && (
                              <div className="text-[11px] font-bold text-[#004C97] mt-1">
                                Đã chọn <span className="text-[#00B5E2]">{selectedStudentIds.length}</span> học sinh.
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        /* EDIT MODE */
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Học sinh</label>
                              <input
                                type="text"
                                readOnly
                                value={`${formState.fullName} (${formState.studentCode})`}
                                className="h-10.5 w-full px-3.5 bg-slate-100 border border-[#D9E2EC] text-slate-500 text-sm font-semibold rounded-xl outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Lớp / Cơ sở</label>
                              <input
                                type="text"
                                readOnly
                                value={`${formState.className || "Chưa xếp lớp"} - ${formState.registeredCampus || ""}`}
                                className="h-10.5 w-full px-3.5 bg-slate-100 border border-[#D9E2EC] text-slate-500 text-sm font-semibold rounded-xl outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Hệ đang học *</label>
                              <select
                                required
                                value={formState.surveySystem}
                                onChange={(e) => setFormState({ ...formState, surveySystem: e.target.value })}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">-- Chọn Hệ đang học --</option>
                                {currentEduSystems.map((es) => (
                                  <option key={es.code} value={es.code}>{es.code} - {es.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Hệ chuyển *</label>
                              <select
                                required
                                value={formState.surveyFormType}
                                onChange={(e) => setFormState({ ...formState, surveyFormType: e.target.value })}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">-- Chọn Hệ chuyển --</option>
                                {currentEduSystems.map((es) => (
                                  <option key={es.code} value={es.code}>{es.code} - {es.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="contents">
                    {formSubTab === "admin" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* SECTION 1: THÔNG TIN CÁ NHÂN */}
                    <div className="bg-white border border-[#D9E2EC] p-5 rounded-2xl space-y-4 shadow-sm">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#D9E2EC]/60">
                        <span className="w-1.5 h-4 bg-[#004C97] inline-block rounded"></span>
                        <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider">Thông tin cá nhân học sinh</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Mã học sinh *</label>
                          <div className="flex gap-2">
                            <input
                              required
                              type="text"
                              disabled={formMode === "edit"}
                              value={formState.studentCode}
                              onChange={(e) => {
                                setFormState({ ...formState, studentCode: e.target.value.toUpperCase().replace(/\s/g, "") });
                                if (e.target.value.trim()) {
                                  setFormErrors(prev => { const n = {...prev}; delete n.studentCode; return n; });
                                }
                              }}
                              placeholder="VD: HS001"
                              className={`h-10.5 w-full px-3.5 bg-[#F8FAFC] hover:bg-slate-100/30 focus:bg-white border text-[#1E293B] placeholder-[#94A3B8] text-sm font-semibold rounded-xl outline-none transition-all focus:ring-4 focus:ring-[#00B5E2]/10 ${formErrors.studentCode ? 'border-[#EF4444] focus:border-[#EF4EF4] focus:ring-[#EF4444]/10' : 'border-[#D9E2EC] focus:border-[#00B5E2]'}`}
                            />
                            {formMode === "create" && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleAutoGenerateCode();
                                  setFormErrors(prev => { const n = {...prev}; delete n.studentCode; return n; });
                                }}
                                className="px-4 h-10.5 bg-[#E6F8FD] hover:bg-[#00B5E2]/20 text-[#004C97] border border-[#00B5E2]/30 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                              >
                                Sinh mã
                              </button>
                            )}
                          </div>
                          {formErrors.studentCode && (
                            <p className="text-[#EF4444] text-[11px] font-semibold mt-1 flex items-center gap-1">
                              <span>⚠</span> {formErrors.studentCode}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Họ và Tên *</label>
                          <input
                            required
                            type="text"
                            value={formState.fullName}
                            onChange={(e) => {
                              setFormState({ ...formState, fullName: e.target.value });
                              if (e.target.value.trim()) {
                                setFormErrors(prev => { const n = {...prev}; delete n.fullName; return n; });
                              }
                            }}
                            placeholder="VD: Nguyễn Văn A"
                            className={`h-10.5 w-full px-3.5 bg-[#F8FAFC] hover:bg-slate-100/30 focus:bg-white border text-[#1E293B] placeholder-[#94A3B8] text-sm font-semibold rounded-xl outline-none transition-all focus:ring-4 focus:ring-[#00B5E2]/10 ${formErrors.fullName ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/10' : 'border-[#D9E2EC] focus:border-[#00B5E2]'}`}
                          />
                          {formErrors.fullName && (
                            <p className="text-[#EF4444] text-[11px] font-semibold mt-1 flex items-center gap-1">
                              <span>⚠</span> {formErrors.fullName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Ngày sinh *</label>
                          <input
                            required
                            type="date"
                            value={formState.dateOfBirth}
                            onChange={(e) => {
                              setFormState({ ...formState, dateOfBirth: e.target.value });
                              if (e.target.value) {
                                setFormErrors(prev => { const n = {...prev}; delete n.dateOfBirth; return n; });
                              }
                            }}
                            className={`h-10.5 w-full px-3.5 bg-[#F8FAFC] hover:bg-slate-100/30 focus:bg-white border text-[#1E293B] placeholder-[#94A3B8] text-sm font-semibold rounded-xl outline-none transition-all focus:ring-4 focus:ring-[#00B5E2]/10 ${formErrors.dateOfBirth ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/10' : 'border-[#D9E2EC] focus:border-[#00B5E2]'}`}
                          />
                          {formErrors.dateOfBirth && (
                            <p className="text-[#EF4444] text-[11px] font-semibold mt-1 flex items-center gap-1">
                              <span>⚠</span> {formErrors.dateOfBirth}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Giới tính *</label>
                            <select
                              value={formState.gender}
                              onChange={(e) => setFormState({ ...formState, gender: e.target.value })}
                              className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                            >
                              <option value="Nam">Nam</option>
                              <option value="Nữ">Nữ</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Khối *</label>
                            <select
                              required
                              value={formState.grade}
                              onChange={(e) => {
                                setFormState({ ...formState, grade: e.target.value });
                                if (e.target.value) {
                                  setFormErrors(prev => { const n = {...prev}; delete n.grade; return n; });
                                }
                              }}
                              className={`h-10.5 w-full px-3 bg-[#F8FAFC] border text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer ${formErrors.grade ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/10' : 'border-[#D9E2EC] focus:border-[#00B5E2]'}`}
                            >
                              <option value="">-- Chọn khối --</option>
                              {activeTab === "general" ? (
                                grades.map(g => (
                                  <option key={g} value={g}>Khối {g}</option>
                                ))
                              ) : (
                                preschoolGrades.map(g => (
                                  <option key={g} value={g}>{g}</option>
                                ))
                              )}
                            </select>
                            {formErrors.grade && (
                              <p className="text-[#EF4444] text-[11px] font-semibold mt-1 flex items-center gap-1">
                                <span>⚠</span> {formErrors.grade}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: THÔNG TIN TUYỂN SINH */}
                    <div className="bg-white border border-[#D9E2EC] p-5 rounded-2xl space-y-4 shadow-sm">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#D9E2EC]/60">
                        <span className="w-1.5 h-4 bg-[#004C97] inline-block rounded"></span>
                        <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider">Thông tin hành chính tuyển sinh</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Năm tuyển sinh</label>
                          <select
                            disabled
                            value={activeYearId}
                            className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#64748B] text-sm font-semibold rounded-xl outline-none cursor-not-allowed"
                          >
                            <option value={activeYearId}>{activeYearName}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Học kỳ / Năm học</label>
                          <select
                            value={formState.hocKy}
                            onChange={(e) => setFormState({ ...formState, hocKy: e.target.value })}
                            className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                          >
                            <option value="">-- Chọn học kỳ --</option>
                            {configs.filter(c => c.categoryType === "HOC_KY").map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Kỳ khảo sát *</label>
                          <select
                            required
                            value={formState.periodId}
                            onChange={(e) => {
                              setFormState({ ...formState, periodId: e.target.value, batchId: "" });
                              if (e.target.value) {
                                setFormErrors(prev => { const n = {...prev}; delete n.periodId; return n; });
                              }
                            }}
                            className={`h-10.5 w-full px-3 bg-[#F8FAFC] border text-[#1E293B] text-sm font-bold rounded-xl outline-none focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer ${formErrors.periodId ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/10' : 'border-[#D9E2EC] focus:border-[#00B5E2]'}`}
                          >
                            <option value="">-- Chọn Kỳ khảo sát --</option>
                            {activeTab === "general" ? (
                              generalPeriods.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))
                            ) : (
                              preschoolPeriods.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))
                            )}
                          </select>
                          {formErrors.periodId && (
                            <p className="text-[#EF4444] text-[11px] font-semibold mt-1 flex items-center gap-1">
                              <span>⚠</span> {formErrors.periodId}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Đợt khảo sát *</label>
                          <select
                            value={formState.batchId}
                            onChange={(e) => setFormState({ ...formState, batchId: e.target.value })}
                            className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                          >
                            <option value="">-- Không phân đợt / Mặc định --</option>
                            {activeFormBatches.map((b) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Hệ khảo sát</label>
                          <select
                            value={formState.surveyFormType}
                            onChange={(e) => setFormState({ ...formState, surveyFormType: e.target.value })}
                            className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                          >
                            <option value="">-- Chọn Hệ khảo sát --</option>
                            {activeTab === "general" ? (
                              currentEduSystems.map(es => (
                                <option key={es.code} value={es.code}>{es.code} - {es.name}</option>
                              ))
                            ) : (
                              preschoolConfigs.filter(c => c.categoryType === "system").map(c => (
                                <option key={c.code} value={c.name}>{c.name}</option>
                              ))
                            )}
                          </select>
                        </div>

                        {activeTab === "general" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Diện Khảo sát</label>
                              <select
                                value={formState.admissionCriteria}
                                onChange={(e) => setFormState({ ...formState, admissionCriteria: e.target.value })}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">--</option>
                                {configs.filter(c => c.categoryType === "DIEN_KS").map(c => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Hình thức KS</label>
                              <select
                                value={formState.surveySystem}
                                onChange={(e) => setFormState({ ...formState, surveySystem: e.target.value })}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">--</option>
                                {configs.filter(c => c.categoryType === "HINH_THUC_KS").map(c => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {formSubTab === "academic" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* SECTION 3: HỒ SƠ HỌC BẠ */}
                    <div className="bg-white border border-[#D9E2EC] p-5 rounded-2xl space-y-4 shadow-sm">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#D9E2EC]/60">
                        <span className="w-1.5 h-4 bg-[#004C97] inline-block rounded"></span>
                        <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider">Hồ sơ & Học bạ học tập</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Hồ sơ/Bảng điểm</label>
                          <select
                            value={formState.hoSoCtQuocTe}
                            onChange={(e) => setFormState({ ...formState, hoSoCtQuocTe: e.target.value })}
                            className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                          >
                            <option value="">-- Chọn hồ sơ --</option>
                            {configs.filter(c => c.categoryType === "HS_HT_HOC_SINH").map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {activeTab === "general" && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Kết quả Rèn luyện</label>
                              <select
                                value={formState.kqRenLuyen}
                                onChange={(e) => setFormState({ ...formState, kqRenLuyen: e.target.value })}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">-- Chọn kết quả rèn luyện --</option>
                                {configs.filter(c => c.categoryType === "KQ_REN_LUYEN").map(c => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="pt-2">
                              <EntranceAcademicRecordInput
                                value={formState.kqHocTap}
                                grade={formState.grade || "1"}
                                hocKy={formState.hocKy || (generalPeriods.find(p => p.id === formState.periodId)?.name || "")}
                                onChange={(serializedJson) => {
                                  try {
                                    const parsed = JSON.parse(serializedJson);
                                    setFormState((prev: any) => {
                                      let hoSo = prev.hoSoCtQuocTe;
                                      if (parsed.programType === "BO_GD_DT") hoSo = "CT Việt Nam";
                                      else if (parsed.programType === "SONG_NGU") hoSo = "Song ngữ / Tích hợp";
                                      else if (parsed.programType === "NUOC_NGOAI") hoSo = "CT Quốc tế";
                                      else if (parsed.programType === "HOMESCHOOLING") hoSo = "Home Schooling";
                                      return { ...prev, kqHocTap: serializedJson, hoSoCtQuocTe: hoSo };
                                    });
                                  } catch (e) {
                                    setFormState((prev: any) => ({ ...prev, kqHocTap: serializedJson }));
                                  }
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {activeTab === "general" && (
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Học bạ tiểu học / THCS</label>
                          <textarea
                            value={formState.kqgdTieuHoc}
                            onChange={(e) => setFormState({ ...formState, kqgdTieuHoc: e.target.value })}
                            rows={3}
                            placeholder="Nhập thông tin kết quả giáo dục tiểu học / THCS hoặc ghi chú học bạ học sinh..."
                            className="w-full p-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] placeholder-[#94A3B8] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 resize-none"
                          />
                        </div>
                      )}

                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider">Đối tượng tuyển sinh</label>
                        <span className="text-[11px] font-semibold text-[#64748B] block mt-0.5">Chọn 1 đối tượng tuyển sinh:</span>
                        <div className="flex flex-wrap gap-2">
                          {configs.filter(c => c.categoryType === "DOI_TUONG_TS" && !c.name.toLowerCase().includes("home")).map(c => {
                            const selectedTargets = formState.targetType ? formState.targetType.split(",").map((t) => t.trim()).filter(Boolean) : [];
                            const isChecked = selectedTargets.includes(c.name);
                            return (
                              <button
                                type="button"
                                key={c.id}
                                onClick={() => {
                                  const updated = isChecked ? "" : c.name;
                                  setFormState(f => ({ ...f, targetType: updated }));
                                }}
                                className={`px-3 py-1.5 border rounded-xl flex items-center gap-1.5 transition-all text-xs font-semibold select-none cursor-pointer ${isChecked ? 'bg-[#E6F8FD] border-[#00B5E2] text-[#004C97] font-bold shadow-sm' : 'bg-[#F8FAFC] border-[#D9E2EC] text-[#64748B] hover:bg-slate-100/50'}`}
                              >
                                {isChecked ? (
                                  <span className="text-[#00B5E2] font-black text-sm">✓</span>
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                )}
                                <span>{c.name}</span>
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => alert("Chức năng thêm cấu hình đối tượng tuyển sinh thực hiện tại trang cấu hình danh mục.")}
                            className="px-3 py-1.5 border border-dashed border-[#00B5E2] text-[#00B5E2] bg-transparent hover:bg-[#E6F8FD]/50 rounded-xl flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
                          >
                            <span>+</span>
                            Thêm đối tượng tuyển sinh
                          </button>
                        </div>
                      </div>

                      {/* CONDITIONAL LOCATION INPUTS */}
{selectedLocationType && (
                        <div className="mt-4 p-5 bg-[#F8FAFC] border border-[#D9E2EC] rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-200">
                          <div className="flex items-center gap-2 pb-2 border-b border-[#D9E2EC]/60">
                            <span className="w-1.5 h-4 bg-[#00B5E2] inline-block rounded"></span>
                            <h4 className="text-xs font-black text-[#004C97] uppercase tracking-wider">Thông tin trường học cũ ({selectedLocationType})</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {selectedLocationType === "Nội tỉnh" && (
                              <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Tỉnh / Thành phố *</label>
                                <input
                                  readOnly
                                  type="text"
                                  value="Thành phố Đà Nẵng"
                                  className="h-10 w-full px-3.5 py-2 bg-slate-100 border border-[#D9E2EC] text-[#1E293B] text-xs sm:text-sm font-bold rounded-xl outline-none cursor-not-allowed leading-normal"
                                />
                              </div>
                            )}

                            {selectedLocationType === "Ngoại tỉnh" && (
                              <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Tỉnh / Thành phố *</label>
                                <select value={selectedProvince}
                                  onChange={(e) => setSelectedProvince(e.target.value)}
                                  className="h-10 w-full px-3 py-2 bg-white border border-[#D9E2EC] text-[#1E293B] text-xs sm:text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer leading-normal"
                                >
                                  <option value="">-- Chọn Tỉnh/Thành --</option>
                                  {vietnamProvinces.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {selectedLocationType === "Nước ngoài" && (
                              <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Quốc gia *</label>
                                <select value={selectedCountry}
                                  onChange={(e) => setSelectedCountry(e.target.value)}
                                  className="h-10 w-full px-3 py-2 bg-white border border-[#D9E2EC] text-[#1E293B] text-xs sm:text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer leading-normal"
                                >
                                  <option value="">-- Chọn Quốc gia --</option>
                                  {worldCountries.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Tên trường học cũ *</label>
                              {(selectedLocationType === "Nội tỉnh" || selectedProvince === "Thành phố Đà Nẵng" || selectedProvince.includes("Đà Nẵng")) ? (
                                <div className="space-y-2">
                                  <select
                                    value={
                                      ((typeof destinationSchools !== "undefined" && destinationSchools && destinationSchools.length > 0) ? destinationSchools : defaultDanangSchools).some(s => s.name === schoolNameInput)
                                        ? schoolNameInput
                                        : (schoolNameInput ? "__OTHER__" : "")
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "__OTHER__") {
                                        setSchoolNameInput("");
                                      } else {
                                        setSchoolNameInput(val);
                                        const list = ((typeof destinationSchools !== "undefined" && destinationSchools && destinationSchools.length > 0) ? destinationSchools : defaultDanangSchools);
                                        const matched = list.find(s => s.name === val);
                                        if (matched) {
                                          const st = matched.schoolType === "PUBLIC" ? "Công lập" : matched.schoolType === "PRIVATE" ? "Tư thục" : (matched.schoolType || "");
                                          if (st) setSchoolTypeInput(st);
                                        }
                                      }
                                    }}
                                    className="h-10 w-full px-3 py-2 bg-white border border-[#D9E2EC] text-[#1E293B] text-xs sm:text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer leading-normal"
                                  >
                                    <option value="">-- Chọn Đơn vị Trường học cũ --</option>
                                    {((typeof destinationSchools !== "undefined" && destinationSchools && destinationSchools.length > 0) ? destinationSchools : defaultDanangSchools).map((s) => (
                                      <option key={s.id || s.name} value={s.name}>
                                        {s.name} ({s.schoolType === "PUBLIC" ? "Công lập" : s.schoolType === "PRIVATE" ? "Tư thục" : (s.schoolType || "Khác")})
                                      </option>
                                    ))}
                                    <option value="__OTHER__">-- Khác (Nhập thủ công bên dưới) --</option>
                                  </select>

                                  {(!schoolNameInput || !((typeof destinationSchools !== "undefined" && destinationSchools && destinationSchools.length > 0) ? destinationSchools : defaultDanangSchools).some(s => s.name === schoolNameInput)) && (
                                    <input type="text" value={schoolNameInput}
                                      onChange={(e) => setSchoolNameInput(e.target.value)}
                                      placeholder="Nhập tên trường cũ (VD: TH Phù Đổng)"
                                      className="h-10 w-full px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#1E293B] placeholder-[#94A3B8] text-xs sm:text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 leading-normal"
                                    />
                                  )}
                                </div>
                              ) : (
                                <input type="text" value={schoolNameInput}
                                  onChange={(e) => setSchoolNameInput(e.target.value)}
                                  placeholder="Nhập tên trường cũ (VD: TH Phù Đổng)"
                                  className="h-10 w-full px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#1E293B] placeholder-[#94A3B8] text-xs sm:text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 leading-normal"
                                />
                              )}
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Loại hình trường *</label>
                              <select value={schoolTypeInput}
                                onChange={(e) => setSchoolTypeInput(e.target.value)}
                                className="h-10 w-full px-3 py-2 bg-white border border-[#D9E2EC] text-[#1E293B] text-xs sm:text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer leading-normal"
                              >
                                <option value="">-- Chọn loại hình --</option>
                                <option value="Công lập">Công lập</option>
                                <option value="Tư thục">Tư thục</option>
                                <option value="Song ngữ">Song ngữ</option>
                                <option value="Quốc tế">Quốc tế</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                      </div>


                    {/* SECTION 4: ĐÁNH GIÁ MẦM NON (Chỉ hiển thị cho mầm non) */}
                    {activeTab === "preschool" && formMode === "edit" && (
                      <div className="bg-white border border-[#D9E2EC] p-5 rounded-2xl space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 pb-2 border-b border-[#D9E2EC]/60">
                          <span className="w-1.5 h-4 bg-[#004C97] inline-block rounded"></span>
                          <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider">Đánh giá phát triển mầm non</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Nhận xét chuyên môn</label>
                            <textarea
                              value={formState.devProfessionalComment}
                              onChange={(e) => setFormState({ ...formState, devProfessionalComment: e.target.value })}
                              rows={2}
                              className="w-full p-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Nhận xét tâm lý</label>
                            <textarea
                              value={formState.devPsychologyComment}
                              onChange={(e) => setFormState({ ...formState, devPsychologyComment: e.target.value })}
                              rows={2}
                              className="w-full p-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 resize-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Ghi chú quan trọng</label>
                            <input
                              type="text"
                              value={formState.devImportantNote}
                              onChange={(e) => setFormState({ ...formState, devImportantNote: e.target.value })}
                              placeholder="VD: Bé còn rụt rè, khó hòa nhập"
                              className="h-10.5 w-full px-3.5 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] placeholder-[#94A3B8] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Đánh giá chung</label>
                            <input
                              type="text"
                              value={formState.devAssessmentResult}
                              onChange={(e) => setFormState({ ...formState, devAssessmentResult: e.target.value })}
                              placeholder="VD: Đạt khảo sát"
                              className="h-10.5 w-full px-3.5 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] placeholder-[#94A3B8] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formSubTab === "approval" && formMode === "edit" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* SECTION 5: XÉT DUYỆT & Ý KIẾN CHỈ ĐẠO */}
                    <div className="bg-[#E6F8FD]/45 border border-[#00B5E2]/30 p-5 rounded-2xl space-y-4 shadow-sm">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#00B5E2]/20">
                        <span className="w-1.5 h-4 bg-[#004C97] inline-block rounded"></span>
                        <h4 className="text-xs font-black text-[#004C97] uppercase tracking-wider">Xét duyệt & Ý kiến chỉ đạo của Giám đốc</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Kết quả xét duyệt tuyển sinh</label>
                          <select
                            value={formState.admissionResult}
                            onChange={(e) => setFormState({ ...formState, admissionResult: e.target.value })}
                            className="h-10.5 w-full px-3 bg-white border border-[#D9E2EC] text-[#004C97] text-sm font-bold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                          >
                            {activeTab === "general" ? (
                              <Fragment>
                                <option value="">Chưa duyệt / Khác</option>
                                <option value="Đạt">Đạt</option>
                                <option value="Đạt - Giao lưu">Đạt - Giao lưu</option>
                                <option value="Đạt cam kết">Đạt cam kết</option>
                                <option value="Học thử">Học thử</option>
                                <option value="Không đạt">Không đạt</option>
                                <option value="Không đạt - Kiểm tra lại">Không đạt - Kiểm tra lại</option>
                                <option value="Không đạt - Không kiểm tra lại">Không đạt - Không kiểm tra lại</option>
                              </Fragment>
                            ) : (
                              <Fragment>
                                <option value="">Chưa duyệt</option>
                                <option value="Đạt">Đạt</option>
                                <option value="Đạt - Giao lưu">Đạt - Giao lưu</option>
                                <option value="Không đạt">Không đạt</option>
                                <option value="Học thử">Học thử</option>
                              </Fragment>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Giám đốc tuyển sinh ký duyệt</label>
                          <input
                            type="text"
                            value={formState.signatureName}
                            onChange={(e) => setFormState({ ...formState, signatureName: e.target.value })}
                            placeholder="Họ tên Giám đốc tuyển sinh"
                            className="h-10.5 w-full px-3.5 bg-white border border-[#D9E2EC] text-[#1E293B] placeholder-[#94A3B8] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Ý kiến chỉ đạo / Ghi chú của Giám đốc</label>
                        <textarea
                          value={formState.directorNote}
                          onChange={(e) => setFormState({ ...formState, directorNote: e.target.value })}
                          rows={3}
                          placeholder="Ghi ý kiến chỉ đạo tuyển sinh..."
                          className="w-full p-3 bg-white border border-[#D9E2EC] text-[#1E293B] placeholder-[#94A3B8] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
                  </div>
            )}
              </div>

              {/* FOOTER */}
              <div className="p-4 bg-slate-50 border-t border-[#D9E2EC] flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-2 border border-[#D9E2EC] text-[#64748B] hover:text-[#1E293B] hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-xs font-bold uppercase tracking-wider"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#00B5E2] hover:bg-[#0098C2] text-white rounded-xl text-xs font-bold shadow-md shadow-[#00B5E2]/15 transition-all active:scale-95 cursor-pointer uppercase tracking-wider flex items-center gap-1.5"
                >
                  Lưu dữ liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Dialog Form: Import Excel */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 flex justify-between items-center text-xs font-semibold">
              <div>
                <h3 className="text-lg font-black text-slate-800">Nhập học sinh từ Excel</h3>
                <p className="text-xs text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                  Phân hệ {activeTab === "general" ? "Phổ thông K-12" : "Mầm non"}
                </p>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all text-xs font-semibold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Target Period selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kỳ khảo sát nhập vào *</label>
                <select
                  value={importPeriodId}
                  onChange={(e) => setImportPeriodId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer font-semibold"
                >
                  {activePeriodsList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Target Batch selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đợt khảo sát nhập vào</label>
                <select
                  value={importBatchId}
                  onChange={(e) => setImportBatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer font-semibold"
                >
                  <option value="">Không phân đợt</option>
                  {activeImportBatches.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Download template */}
              <div className="p-4 flex items-center justify-between text-xs font-semibold">
                <div className="text-xs font-medium text-slate-500">
                  Tải file Excel mẫu đúng định dạng chuẩn để nhập dữ liệu.
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-none transition-all active:scale-95 cursor-pointer whitespace-nowrap text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Mẫu file
                </button>
              </div>

              {/* Show Status */}
              {importing && (
                <div className="flex items-center justify-center gap-3 p-4 text-blue-700 text-xs font-semibold">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-bold">Đang xử lý dữ liệu và tải lên hệ thống...</span>
                </div>
              )}

              {importError && (
                <div className="p-4 text-rose-800 text-xs font-semibold text-xs font-semibold">
                  Lỗi: {importError}
                </div>
              )}

              {importSuccessCount !== null && (
                <div className="p-4 text-emerald-800 text-xs font-semibold text-xs font-semibold">
                  Đã import thành công {importSuccessCount} học sinh vào hệ thống!
                </div>
              )}

              <input
                type="file"
                ref={importInputRef}
                accept=".xlsx"
                className="hidden"
                onChange={handleImportExcel}
              />

              {/* Footer buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => setIsImportOpen(false)}
                  className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={importing || !importPeriodId}
                  onClick={() => importInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-[#00A19A] hover:bg-[#008B85] text-white rounded-xl text-xs font-bold shadow-none transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  Chọn file tải lên
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Dialog Modal */}
      {isDetailsOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-[#003B3A] to-[#005D5B] text-white p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg shrink-0">
              {/* Decorative abstract elements */}
              <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 blur-xl pointer-events-none" />
              <div className="absolute left-1/4 bottom-0 w-32 h-32 bg-teal-400/10 rounded-full -mb-16 blur-lg pointer-events-none" />

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-sm font-black shadow-inner">
                  {selectedStudent.fullName.split(" ").slice(-1)[0].charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 border border-white/10 text-teal-100">
                    {activeTab === "general" ? "Phổ thông" : "Mầm non"}
                  </span>
                  <h3 className="text-xl font-black mt-1 leading-tight flex flex-wrap items-center gap-2">
                    {selectedStudent.fullName}
                    <span className="text-teal-200/85 font-mono text-sm font-bold">({selectedStudent.studentCode})</span>
                  </h3>
                  <p className="text-white/60 text-[11px] font-semibold mt-1">
                    Ngày sinh: {formatDate(selectedStudent.dateOfBirth)} &nbsp;·&nbsp; Giới tính: {selectedStudent.gender || "—"} &nbsp;·&nbsp; Lớp dự tuyển: {activeTab === "general" ? (selectedStudent.className || "—") : (selectedStudent.grade || "—")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="absolute top-4 right-4 sm:relative sm:top-auto sm:right-auto w-8 h-8 rounded-xl bg-white/10 hover:bg-red-500/25 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-Tab Switcher */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-1 flex gap-4 shrink-0 text-xs font-semibold overflow-x-auto scrollbar-none">
              <button
                onClick={() => setDetailsSubTab("results")}
                className={`py-2.5 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  detailsSubTab === "results"
                    ? "border-[#00A19A] text-[#00A19A]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                {activeTab === "general" ? "Kết quả đánh giá" : "Đánh giá phát triển"}
              </button>
              <button
                onClick={() => setDetailsSubTab("admin")}
                className={`py-2.5 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  detailsSubTab === "admin"
                    ? "border-[#00A19A] text-[#00A19A]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                Thông tin hành chính
              </button>
              <button
                onClick={() => setDetailsSubTab("academic")}
                className={`py-2.5 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  detailsSubTab === "academic"
                    ? "border-[#00A19A] text-[#00A19A]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {activeTab === "general" ? <FileText className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                {activeTab === "general" ? "Hồ sơ & Học bạ" : "Học thử & Quyết định"}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {(() => {
                const cleanBatchName = (name: string) => {
                  if (!name) return "-";
                  const parts = name.split("|").map(p => p.trim());
                  const uniqueParts = Array.from(new Set(parts));
                  return uniqueParts.join(" | ");
                };

                return activeTab === "general" ? (
                  <div className="space-y-4">
                    {detailsSubTab === "results" && (
                      <div className="space-y-6 animate-in fade-in duration-200">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-[#00A19A]" />
                            Kết quả điểm khảo sát năng lực
                          </h4>
                          
                          {(() => {
                            const getNumericGrade = (g: string) => {
                              if (!g) return null;
                              const match = String(g).match(/\d+/);
                              return match ? parseInt(match[0], 10) : null;
                            };
                            const isGrade1 = getNumericGrade(selectedStudent.grade) === 1;
                            
                            let mathVal: any = selectedStudent.mathScore;
                            let literatureVal: any = selectedStudent.literatureScore;
                            let writtenEnglishVal: any = selectedStudent.writtenEnglishScore;
                            let oralEnglishVal: any = selectedStudent.oralEnglishScore;
                            let psychologyVal: any = selectedStudent.psychologyScore;
                            let eptVal: any = selectedStudent.eptScore || null;
                            
                            let oralEnglishComment = "";
                            let psychologyConclusion = "";
                            let psychologyRecommendation = "";

                            const studentScores = selectedStudent.scores || [];
                            studentScores.forEach((sc: any) => {
                              const subject = sc.subject || {};
                              const sName = subject.name || "";
                              const sCode = (subject.code || "").toLowerCase();
                              const sNameLower = sName.toLowerCase().normalize("NFC");
                              
                              let scoreVal: any = null;
                              try {
                                if (sc.scores) {
                                  const parsed = JSON.parse(sc.scores);
                                  const vArr = Array.isArray(parsed) ? parsed : [parsed];
                                  scoreVal = vArr.find((x: any) => x !== undefined && x !== "" && x !== null);
                                }
                              } catch (e) {
                                scoreVal = sc.scores;
                              }

                              if (scoreVal !== null && scoreVal !== undefined && scoreVal !== "") {
                                if (sNameLower.includes("toán") || sCode.includes("math") || sCode.includes("mth")) {
                                  mathVal = scoreVal;
                                } else if (sNameLower.includes("tiếng việt") || sNameLower.includes("ngữ văn") || sCode.includes("lit") || sCode.includes("vie") || sCode.includes("van")) {
                                  literatureVal = scoreVal;
                                } else if (sNameLower.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl") || sCode.includes("ept") || sNameLower.includes("ept")) {
                                  if (sCode.includes("ept") || sNameLower.includes("ept")) {
                                    eptVal = scoreVal;
                                    if (writtenEnglishVal == null) writtenEnglishVal = scoreVal;
                                  } else if (sNameLower.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt") || sCode === "tav") {
                                    writtenEnglishVal = scoreVal;
                                  } else if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || sCode.includes("speaking") || sCode.includes("oral") || sCode.includes("vd") || sCode === "tavd") {
                                    oralEnglishVal = scoreVal;
                                    oralEnglishComment = sc.comments || "";
                                  }
                                } else if (sCode.includes("tly")) {
                                  try {
                                    if (sc.scores) {
                                      const parsed = JSON.parse(sc.scores);
                                      const vArr = Array.isArray(parsed) ? parsed : [parsed];
                                      psychologyVal = parseFloat(vArr[6] || vArr[20] || "0");
                                    }
                                  } catch (e) {
                                    psychologyVal = parseFloat(sc.scores || "0");
                                  }
                                  try {
                                    if (sc.comments) {
                                      const parsedComments = JSON.parse(sc.comments);
                                      if (Array.isArray(parsedComments)) {
                                        psychologyConclusion = parsedComments[0] || "";
                                        psychologyRecommendation = parsedComments[1] || "";
                                      } else {
                                        psychologyConclusion = sc.comments;
                                      }
                                    }
                                  } catch (e) {
                                    psychologyConclusion = sc.comments || "";
                                  }
                                }
                              }
                            });

                            let writtenDisplay: React.ReactNode = writtenEnglishVal !== null && writtenEnglishVal !== undefined ? writtenEnglishVal : "—";
                            let oralDisplay: React.ReactNode = oralEnglishVal !== null && oralEnglishVal !== undefined ? oralEnglishVal : "—";
                            
                            if (isGrade1) {
                              writtenDisplay = "Không áp dụng";
                              if (oralEnglishVal !== null && oralEnglishVal !== undefined && oralEnglishVal !== "") {
                                oralDisplay = `${oralEnglishVal}/10`;
                              }
                            } else {
                              if (eptVal !== null && eptVal !== undefined && eptVal !== "") {
                                writtenDisplay = `${eptVal}/100`;
                              } else if (writtenEnglishVal !== null && writtenEnglishVal !== undefined && writtenEnglishVal !== "") {
                                writtenDisplay = `${writtenEnglishVal}/10`;
                              }
                              if (oralEnglishVal !== null && oralEnglishVal !== undefined && oralEnglishVal !== "") {
                                oralDisplay = `${oralEnglishVal}/10`;
                              }
                            }

                            // Determine psychology color code based on score
                            let psychColorClass = "text-slate-700 bg-slate-50 border-slate-200";
                            let psychBadgeText = "";
                            if (psychologyVal !== null && psychologyVal !== undefined && psychologyVal !== "—") {
                              const scNum = parseFloat(psychologyVal);
                              if (!isNaN(scNum)) {
                                if (scNum <= 15) {
                                  psychColorClass = "text-[#00A19A] bg-[#00A19A]/5 border-[#00A19A]/20";
                                  psychBadgeText = "Bình thường";
                                } else if (scNum <= 31) {
                                  psychColorClass = "text-amber-600 bg-amber-50 border-amber-200/50";
                                  psychBadgeText = "Dấu hiệu nhẹ";
                                } else if (scNum <= 47) {
                                  psychColorClass = "text-amber-700 bg-amber-50 border-amber-200/50";
                                  psychBadgeText = "Dấu hiệu vừa";
                                } else if (scNum <= 63) {
                                  psychColorClass = "text-rose-600 bg-rose-50 border-rose-200/50";
                                  psychBadgeText = "Nguy cơ cao";
                                } else {
                                  psychColorClass = "text-red-700 bg-red-50 border-red-200/50";
                                  psychBadgeText = "Nguy cơ rất cao";
                                }
                              }
                            }
                            
                            return (
                              <div className="space-y-5">
                                {/* Exemption Banner for GDCS if any subject is exempt */}
                                {((mathVal == null || mathVal === "" || mathVal === "—") || 
                                  (literatureVal == null || literatureVal === "" || literatureVal === "—") || 
                                  (oralEnglishVal == null || oralEnglishVal === "" || oralEnglishVal === "—") || 
                                  (psychologyVal == null || psychologyVal === "" || psychologyVal === "—")) && (
                                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs font-semibold shadow-2xs">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Các môn không thi trực tiếp được <strong>Miễn khảo sát (Theo quy chế tuyển sinh)</strong> để tiện GĐCS nắm bắt xét duyệt.</span>
                                  </div>
                                )}

                                {/* 1. Core Subject Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                  {/* Math Card */}
                                  <div className="bg-[#00A19A]/5 p-4 rounded-2xl border border-[#00A19A]/15 hover:shadow-md hover:scale-[1.02] transition-all duration-300 text-center flex flex-col justify-between h-28">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Calculator className="w-3.5 h-3.5 text-[#00A19A]" />
                                      <span className="block text-[10px] font-black text-[#00A19A] uppercase tracking-widest">Điểm Toán</span>
                                    </div>
                                    {mathVal !== null && mathVal !== undefined && mathVal !== "" && mathVal !== "—" ? (
                                      <>
                                        <span className="text-3xl font-black text-slate-800 leading-none">
                                          {mathVal}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-bold">Thang điểm 10</span>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex flex-col items-center justify-center my-auto">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <Check className="w-3 h-3 text-emerald-600" />
                                            Miễn khảo sát
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-medium mt-0.5">Theo quy chế KS</span>
                                        </div>
                                        <span className="text-[9px] text-emerald-600 font-bold">Quy chế tuyển sinh</span>
                                      </>
                                    )}
                                  </div>

                                  {/* Literature Card */}
                                  <div className="bg-teal-50/30 p-4 rounded-2xl border border-teal-200 hover:shadow-md hover:scale-[1.02] transition-all duration-300 text-center flex flex-col justify-between h-28">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                                      <span className="block text-[10px] font-black text-teal-800 uppercase tracking-widest">Điểm Ngữ văn</span>
                                    </div>
                                    {literatureVal !== null && literatureVal !== undefined && literatureVal !== "" && literatureVal !== "—" ? (
                                      <>
                                        <span className="text-3xl font-black text-slate-800 leading-none">
                                          {literatureVal}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-bold">Thang điểm 10</span>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex flex-col items-center justify-center my-auto">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <Check className="w-3 h-3 text-emerald-600" />
                                            Miễn khảo sát
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-medium mt-0.5">Theo quy chế KS</span>
                                        </div>
                                        <span className="text-[9px] text-emerald-600 font-bold">Quy chế tuyển sinh</span>
                                      </>
                                    )}
                                  </div>

                                  {/* English Written Card */}
                                  <div className="bg-sky-50/20 p-4 rounded-2xl border border-sky-100 hover:shadow-md hover:scale-[1.02] transition-all duration-300 text-center flex flex-col justify-between h-28">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <PenTool className="w-3.5 h-3.5 text-sky-500" />
                                      <span className="block text-[10px] font-black text-sky-600 uppercase tracking-widest">Tiếng Anh viết</span>
                                    </div>
                                    {isGrade1 ? (
                                      <>
                                        <span className="text-xs font-bold text-slate-500 leading-none my-auto">
                                          Không áp dụng
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-bold">Khối 1</span>
                                      </>
                                    ) : (eptVal !== null && eptVal !== undefined && eptVal !== "") || (writtenEnglishVal !== null && writtenEnglishVal !== undefined && writtenEnglishVal !== "" && writtenEnglishVal !== "—") ? (
                                      <>
                                        <span className="text-3xl font-black text-slate-800 leading-none">
                                          {writtenDisplay}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-bold">{eptVal !== null && eptVal !== undefined && eptVal !== "" ? "Thang điểm 100 (EPT)" : "Thang điểm 10"}</span>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex flex-col items-center justify-center my-auto">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <Check className="w-3 h-3 text-emerald-600" />
                                            Miễn khảo sát
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-medium mt-0.5">Theo quy chế KS</span>
                                        </div>
                                        <span className="text-[9px] text-emerald-600 font-bold">Quy chế tuyển sinh</span>
                                      </>
                                    )}
                                  </div>

                                  {/* English Oral Card */}
                                  <div className="bg-sky-50/20 p-4 rounded-2xl border border-sky-100/50 hover:shadow-md hover:scale-[1.02] transition-all duration-300 text-center flex flex-col justify-between h-28">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Mic className="w-3.5 h-3.5 text-sky-500" />
                                      <span className="block text-[10px] font-black text-sky-600 uppercase tracking-widest">Tiếng Anh nói</span>
                                    </div>
                                    {oralEnglishVal !== null && oralEnglishVal !== undefined && oralEnglishVal !== "" && oralEnglishVal !== "—" ? (
                                      <>
                                        <span className="text-3xl font-black text-slate-800 leading-none">
                                          {oralDisplay}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-bold">Thang điểm 10</span>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex flex-col items-center justify-center my-auto">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <Check className="w-3 h-3 text-emerald-600" />
                                            Miễn khảo sát
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-medium mt-0.5">Theo quy chế KS</span>
                                        </div>
                                        <span className="text-[9px] text-emerald-600 font-bold">Quy chế tuyển sinh</span>
                                      </>
                                    )}
                                  </div>

                                  {/* Psychology Card */}
                                  <div className={`sm:${psychColorClass} p-4 rounded-2xl border hover:shadow-md hover:scale-[1.02] transition-all duration-300 text-center flex flex-col justify-between h-28`}>
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Brain className="w-3.5 h-3.5" />
                                      <span className="block text-[10px] font-black uppercase tracking-widest opacity-80">Điểm Tâm lý</span>
                                    </div>
                                    {psychologyVal !== null && psychologyVal !== undefined && psychologyVal !== "" && psychologyVal !== "—" ? (
                                      <>
                                        <span className="text-3xl font-black leading-none">
                                          {psychologyVal}
                                        </span>
                                        {psychBadgeText ? (
                                          <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded bg-white/80 border border-current/15 truncate w-full text-center">
                                            {psychBadgeText}
                                          </span>
                                        ) : (
                                          <span className="text-[9px] opacity-60 font-bold">Thang điểm 100</span>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex flex-col items-center justify-center my-auto">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <Check className="w-3 h-3 text-emerald-600" />
                                            Miễn khảo sát
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-medium mt-0.5">Theo quy chế KS</span>
                                        </div>
                                        <span className="text-[9px] text-emerald-600 font-bold">Quy chế tuyển sinh</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* 2. English Speaking Comment */}
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-center">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-black text-sky-700 uppercase tracking-wider">Nhận xét Tiếng Anh Nói</span>
                                  </div>
                                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                    {oralEnglishComment ? (
                                      <span className="italic">"{oralEnglishComment}"</span>
                                    ) : (
                                      <span className="text-slate-400 font-normal">Chưa có nhận xét Tiếng Anh Nói.</span>
                                    )}
                                  </p>
                                </div>

                                {/* 3. Detailed Psychology Section & GĐCS Confirmed Work Plan for Giáo vụ / Tư vấn cơ sở */}
                                {(psychologyConclusion || psychologyRecommendation || studentPsychReferralInfo?.psychologyData?.gdcsResponse || studentPsychReferralInfo?.psychologyData?.reportedToGdcs) && (
                                  <div className="bg-[#F0FDFA] p-5 rounded-2xl border border-[#99F6E4] text-left space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#99F6E4]/70 pb-2.5">
                                      <div className="flex items-center gap-2">
                                        <Brain className="w-4 h-4 text-[#003B3A]" />
                                        <h5 className="text-xs font-bold text-[#003B3A]">Chi tiết Đánh giá Tâm lý &amp; Phương án làm việc của GĐCS</h5>
                                      </div>
                                      {studentPsychReferralInfo?.psychologyData?.gdcsResponse && (
                                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-[#059669] border border-emerald-200 text-[11px] font-bold">
                                          ✓ GĐCS đã xác nhận: {studentPsychReferralInfo.psychologyData.gdcsResponse.responseTypeName}
                                        </span>
                                      )}
                                    </div>
                                    {(psychologyConclusion || psychologyRecommendation) && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {psychologyConclusion && (
                                          <div className="bg-white p-4 rounded-xl border border-[#CCFBF1] shadow-2xs">
                                            <span className="block text-[11px] font-bold text-[#003B3A] mb-1">Kết luận chuyên môn Tâm lý</span>
                                            <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{psychologyConclusion}</p>
                                          </div>
                                        )}
                                        {psychologyRecommendation && (
                                          <div className="bg-white p-4 rounded-xl border border-[#CCFBF1] shadow-2xs">
                                            <span className="block text-[11px] font-bold text-[#003B3A] mb-1">Khuyến nghị &amp; Nhận xét</span>
                                            <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{psychologyRecommendation}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {(() => {
                                      const gdcsResp = studentPsychReferralInfo?.psychologyData?.gdcsResponse;
                                      const repInfo = studentPsychReferralInfo?.psychologyData?.reportedToGdcs;
                                      const gStaff = gdcsResp?.giaovuStaff || repInfo?.giaovuStaff || studentPsychReferralInfo?.giaovuStaff || [];
                                      const tStaff = gdcsResp?.tuvanStaff || repInfo?.tuvanStaff || studentPsychReferralInfo?.tuvanStaff || [];
                                      if (!gdcsResp && !repInfo) return null;
                                      return (
                                        <div className="bg-white p-4 rounded-xl border border-[#00A19A] space-y-2 text-xs">
                                          {gdcsResp ? (
                                            <>
                                              <div className="flex flex-wrap items-center justify-between gap-2">
                                                <strong className="text-[#003B3A]">
                                                  Phương án làm việc đã được GĐCS ({gdcsResp.directorName || "Ban Giám đốc Cơ sở"}) xác nhận:
                                                </strong>
                                                <span className="text-[11px] text-slate-500 tabular-nums">
                                                  {gdcsResp.respondedAtFormatted || ""}
                                                </span>
                                              </div>
                                              <div className="text-slate-700 space-y-1">
                                                <div>
                                                  • <strong>Phương án:</strong>{" "}
                                                  <span className="px-2 py-0.5 rounded bg-[#003B3A] text-white font-bold text-[11px]">
                                                    {gdcsResp.responseTypeName}
                                                  </span>
                                                </div>
                                                {gdcsResp.details?.meetingTime && (
                                                  <div>• <strong>Thời gian &amp; Địa điểm:</strong> {gdcsResp.details.meetingTime} — {gdcsResp.details.meetingLocation || "Tại cơ sở"}</div>
                                                )}
                                                {gdcsResp.details?.parentMeetingContent && (
                                                  <div>• <strong>Nội dung làm việc với PHHS:</strong> {gdcsResp.details.parentMeetingContent}</div>
                                                )}
                                                {gdcsResp.details?.meetingAgenda && (
                                                  <div>• <strong>Nội dung hội chẩn chuyên môn:</strong> {gdcsResp.details.meetingAgenda} (Thành phần: {gdcsResp.details.meetingParticipants})</div>
                                                )}
                                                {gdcsResp.details?.delegatedTeacherName && (
                                                  <div>• <strong>Giáo viên được ủy quyền đồng hành:</strong> {gdcsResp.details.delegatedTeacherName} ({gdcsResp.details.delegationDuration || "4 tuần đầu"}) — {gdcsResp.details.delegationNote}</div>
                                                )}
                                                {gdcsResp.generalDirectiveNote && (
                                                  <div>• <strong>Ý kiến chỉ đạo của GĐCS:</strong> &ldquo;{gdcsResp.generalDirectiveNote}&rdquo;</div>
                                                )}
                                              </div>
                                            </>
                                          ) : (
                                            <div className="text-amber-800 font-medium">
                                              • <strong>Đã báo cáo GĐCS ({repInfo?.gdcsName || "GĐCS"}):</strong> Đề xuất phương án{" "}
                                              <strong>{repInfo?.proposedActionLabel || "1. Trao đổi trực tiếp PHHS"}</strong> — Đang chờ GĐCS xác nhận.
                                            </div>
                                          )}
                                          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                                            <div>
                                              • <strong>Tổ Giáo vụ cơ sở nắm thông tin:</strong>{" "}
                                              <span className="font-semibold text-[#003B3A]">
                                                {gStaff.length > 0 ? gStaff.map((s: any) => `${s.fullName} (${s.email})`).join(", ") : (gdcsResp?.giaovuEmail || repInfo?.giaovuEmail || studentPsychReferralInfo?.defaultGiaovuEmail)}
                                              </span>
                                            </div>
                                            <div>
                                              • <strong>Tổ Tư vấn cơ sở nắm thông tin:</strong>{" "}
                                              <span className="font-semibold text-[#003B3A]">
                                                {tStaff.length > 0 ? tStaff.map((s: any) => `${s.fullName} (${s.email})`).join(", ") : (gdcsResp?.tuyensinhEmail || repInfo?.tuyensinhEmail || studentPsychReferralInfo?.defaultTuyensinhEmail)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}

                                {/* 3.5. Kết quả & Xét duyệt môn TCI – Bộ chuẩn phát triển trẻ em 5–6 tuổi (Dự tuyển Lớp 1) */}
                                {(isGrade1 || studentScores.some((sc: any) => (sc.subject?.code || "").toUpperCase() === "TCI" || (sc.subject?.name || "").toLowerCase().includes("bộ chuẩn"))) && (
                                  <div className="pt-2">
                                    <TciResultReviewPanel
                                      studentId={selectedStudent.id}
                                      studentName={selectedStudent.fullName}
                                      studentCode={selectedStudent.studentCode}
                                      periodId={selectedStudent.periodId}
                                    />
                                  </div>
                                )}

                                {/* 4. Quyết định tuyển sinh của Ban Giám Hiệu (chuyển qua Kết quả đánh giá) */}
                                <div className="border-t border-slate-200 pt-5 mt-6">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <Award className="w-4 h-4 text-[#00A19A]" />
                                    Quyết định tuyển sinh của Ban Giám Hiệu
                                  </h4>
                                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                                    <div className="flex flex-wrap items-center gap-6">
                                      <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kết quả chung cuộc</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold inline-block border mt-1.5 ${getResultBadgeClass(selectedStudent.admissionResult)}`}>
                                          {selectedStudent.admissionResult || "Chưa duyệt kết quả tuyển sinh"}
                                        </span>
                                      </div>
                                      {selectedStudent.signatureName && (
                                        <div>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Người ký duyệt</span>
                                          <span className="text-sm font-bold text-slate-700 block mt-1.5">{selectedStudent.signatureName}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ý kiến chỉ đạo / Ghi chú của Giám đốc</span>
                                      <p className="text-xs font-semibold text-slate-800 bg-white p-3.5 rounded-xl border border-slate-200 mt-2 min-h-[4rem] leading-relaxed">
                                        {selectedStudent.directorNote || "Chưa có ghi chú chỉ đạo."}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {detailsSubTab === "admin" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-[#00A19A]" />
                          Thông tin hành chính tuyển sinh
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kỳ khảo sát</label>
                            <span className="text-xs font-black text-slate-700 mt-1 block">{selectedStudent.period?.name || "-"}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đợt khảo sát</label>
                            <span className="text-xs font-black text-slate-700 mt-1 block break-all">{cleanBatchName(selectedStudent.batch?.name)}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp dự tuyển</label>
                            <span className="text-xs font-black text-slate-700 mt-1 block">{selectedStudent.className || "-"}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hệ đào tạo</label>
                            <span className="text-xs font-black text-slate-700 mt-1 block">{selectedStudent.surveySystem || "-"}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cơ sở dự tuyển</label>
                            <span className="text-xs font-black text-slate-700 mt-1 block">{selectedStudent.admissionCampus || "-"}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diện tuyển sinh</label>
                            <span className="text-xs font-black text-slate-700 mt-1 block">{selectedStudent.admissionCriteria || "-"}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hình thức khảo sát</label>
                            <span className="text-xs font-black text-slate-700 mt-1 block">{selectedStudent.surveySystem || "-"}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hệ Khảo sát</label>
                            <span className="text-xs font-black text-slate-700 mt-1 block">{selectedStudent.surveyFormType || "-"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {detailsSubTab === "academic" && (
                      <div className="space-y-6 animate-in fade-in duration-200">
                        {(() => {
                          const academicRec = parseEntranceRecord(selectedStudent.kqHocTap, selectedStudent.grade);
                          const academicDetails = extractAcademicDetails(academicRec, selectedStudent.grade);
                          
                          return (
                            <div className="space-y-5">
                              {/* 1. Component Subject Scores from Entrance Academic Record */}
                              <div className="bg-gradient-to-br from-slate-50 via-teal-50/20 to-sky-50/20 border border-teal-200/80 rounded-2xl p-5 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-teal-100">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-[#00A19A]" />
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                      Điểm các môn trong kết quả học tập đầu vào (Học bạ)
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${academicDetails.programBadgeCls}`}>
                                      {academicDetails.programLabel}
                                    </span>
                                    {academicDetails.overallRating !== "—" && (
                                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getRatingBadgeCls(academicDetails.overallRating)}`}>
                                        Học lực: {academicDetails.overallRating}
                                      </span>
                                    )}
                                    {academicDetails.conductRating && (
                                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                        Hạnh kiểm: {academicDetails.conductRating}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* 4 Component Score Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-4">
                                  {/* Toán */}
                                  <div className="bg-white p-3.5 rounded-xl border border-teal-100/90 text-center shadow-2xs hover:shadow-xs transition-shadow">
                                    <div className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1">
                                      <Calculator className="w-3.5 h-3.5 text-[#00A19A]" />
                                      Toán
                                    </div>
                                    <span className={`text-2xl font-black ${academicDetails.math !== "—" ? "text-slate-800" : "text-slate-300"}`}>
                                      {academicDetails.math}
                                    </span>
                                    <span className="text-[9px] text-slate-400 block mt-1 font-medium">Học bạ đầu vào</span>
                                  </div>

                                  {/* Tiếng Việt / Ngữ Văn */}
                                  <div className="bg-white p-3.5 rounded-xl border border-teal-100/90 text-center shadow-2xs hover:shadow-xs transition-shadow">
                                    <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1">
                                      <BookOpen className="w-3.5 h-3.5 text-teal-800" />
                                      Tiếng Việt / Văn
                                    </div>
                                    <span className={`text-2xl font-black ${academicDetails.literature !== "—" ? "text-slate-800" : "text-slate-300"}`}>
                                      {academicDetails.literature}
                                    </span>
                                    <span className="text-[9px] text-slate-400 block mt-1 font-medium">Học bạ đầu vào</span>
                                  </div>

                                  {/* Tiếng Anh */}
                                  <div className="bg-white p-3.5 rounded-xl border border-sky-100/90 text-center shadow-2xs hover:shadow-xs transition-shadow">
                                    <div className="text-[10px] font-bold text-sky-700 uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1">
                                      <PenTool className="w-3.5 h-3.5 text-sky-600" />
                                      Tiếng Anh
                                    </div>
                                    <span className={`text-2xl font-black ${academicDetails.english !== "—" ? "text-slate-800" : "text-slate-300"}`}>
                                      {academicDetails.english}
                                    </span>
                                    <span className="text-[9px] text-slate-400 block mt-1 font-medium">Học bạ đầu vào</span>
                                  </div>

                                  {/* Tổ hợp / Môn khác */}
                                  <div className="bg-white p-3.5 rounded-xl border border-teal-100/90 text-center shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
                                    <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1">
                                      <Sparkles className="w-3.5 h-3.5 text-teal-800" />
                                      Tổ hợp / Môn khác
                                    </div>
                                    <span className={`text-sm font-black truncate block my-auto ${academicDetails.otherSubjects !== "—" ? "text-slate-800" : "text-slate-300"}`} title={academicDetails.otherSubjects}>
                                      {academicDetails.otherSubjects}
                                    </span>
                                    <span className="text-[9px] text-slate-400 block mt-1 font-medium">KHTN/KHXH/Khác</span>
                                  </div>
                                </div>

                                {/* Achievements / Năng khiếu nếu có */}
                                {academicDetails.achievements && (
                                  <div className="mt-3.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5">
                                    <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="text-xs">
                                      <strong className="text-amber-900 block font-bold">Thành tích & Năng khiếu học sinh:</strong>
                                      <p className="text-amber-800 font-medium mt-0.5 leading-relaxed">{academicDetails.achievements}</p>
                                    </div>
                                  </div>
                                )}

                                {/* File đính kèm học bạ nếu có */}
                                {academicDetails.attachments && academicDetails.attachments.length > 0 && (
                                  <div className="mt-3.5 pt-3 border-t border-teal-100/80">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                                      Tập tin học bạ / Bảng điểm scan đính kèm ({academicDetails.attachments.length})
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                      {academicDetails.attachments.map((file, fIdx) => (
                                        <a
                                          key={fIdx}
                                          href={file.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-teal-700 hover:text-teal-800 hover:border-teal-300 transition-all shadow-2xs"
                                        >
                                          <FileText className="w-3.5 h-3.5 text-teal-600" />
                                          <span className="max-w-[220px] truncate">{file.name}</span>
                                          <ExternalLink className="w-3 h-3 text-slate-400" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* 2. Additional Academic Records */}
                              <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                  <FileText className="w-4 h-4 text-[#00A19A]" />
                                  Chi tiết Hồ sơ học sinh
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-3">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học bạ tiểu học / THCS</label>
                                    <span className="text-xs font-semibold text-slate-700 mt-1 block leading-relaxed whitespace-pre-wrap">{selectedStudent.kqgdTieuHoc || "-"}</span>
                                  </div>
                                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tóm tắt KQ học tập</label>
                                    <span className="text-xs font-semibold text-slate-700 mt-1 block" title={academicRec.summaryText || selectedStudent.kqHocTap || ""}>
                                      {academicRec.summaryText || selectedStudent.kqHocTap || "-"}
                                    </span>
                                  </div>
                                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả rèn luyện</label>
                                    <span className="text-xs font-semibold text-slate-700 mt-1 block">{selectedStudent.kqRenLuyen || "-"}</span>
                                  </div>
                                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hồ sơ / Bảng điểm khác</label>
                                    <span className="text-xs font-semibold text-slate-700 mt-1 block leading-relaxed">{selectedStudent.hoSoCtQuocTe || "-"}</span>
                                  </div>
                                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học kỳ / Năm tuyển sinh</label>
                                    <span className="text-xs font-semibold text-slate-700 mt-1 block">{selectedStudent.hocKy || "-"}</span>
                                  </div>
                                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đối tượng tuyển sinh</label>
                                    <span className="text-xs font-semibold text-slate-700 mt-1 block">{selectedStudent.targetType || "-"}</span>
                                  </div>

                                  {selectedStudent.oldSchoolName && (
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-3">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trường học cũ & Địa chỉ</label>
                                      <div className="text-xs font-semibold text-slate-700 mt-1.5 space-y-1.5">
                                        <div><span className="text-slate-400">Tên trường cũ:</span> {selectedStudent.oldSchoolName} ({selectedStudent.oldSchoolType})</div>
                                        {selectedStudent.targetType === "Nội tỉnh" && (
                                          <div><span className="text-slate-400">Địa chỉ trường cũ:</span> {selectedStudent.wardName} - {selectedStudent.cityName || "TP Đà Nẵng"}</div>
                                        )}
                                        {selectedStudent.targetType === "Ngoại tỉnh" && (
                                          <div><span className="text-slate-400">Địa chỉ trường cũ:</span> {selectedStudent.wardName} - {selectedStudent.cityName}</div>
                                        )}
                                        {selectedStudent.targetType === "Nước ngoài" && (
                                          <div><span className="text-slate-400">Quốc gia:</span> {selectedStudent.countryName}</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {detailsSubTab === "results" && (
                      <div className="space-y-6 animate-in fade-in duration-200">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-[#00A19A]" />
                            Đánh giá năng lực phát triển mầm non
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Đánh giá chuyên môn</label>
                              <p className="text-xs text-slate-750 font-semibold leading-relaxed">{selectedStudent.devProfessionalComment || "Chưa có nhận xét chuyên môn."}</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Đánh giá tâm lý</label>
                              <p className="text-xs text-slate-750 font-semibold leading-relaxed">{selectedStudent.devPsychologyComment || "Chưa có nhận xét tâm lý."}</p>
                            </div>
                          </div>
                        </div>

                        {/* Criteria score results */}
                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                          <label className="block text-[10.5px] font-black text-slate-650 uppercase tracking-wider mb-3">Kết quả chi tiết các tiêu chí mầm non</label>
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            {renderInputDevScores()}
                          </div>
                        </div>

                        {/* Nhật ký phê duyệt của BGH Mầm non và GĐCS */}
                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                          <label className="block text-[10.5px] font-black text-slate-650 uppercase tracking-wider border-b border-slate-200 pb-2">Nhật ký phê duyệt kết quả khảo sát</label>
                          <div className="space-y-4 divide-y divide-slate-200">
                            {/* Row 1: BGH Mầm non */}
                            <div className="pt-0 text-xs text-slate-650 leading-relaxed font-semibold">
                              <div className="flex justify-between items-center text-slate-400">
                                <span>👤 BGH Mầm non Phê duyệt: <strong className="text-slate-700">{selectedStudent.bghApprovalUser || "—"}</strong></span>
                                <span>{selectedStudent.bghApprovalDate ? new Date(selectedStudent.bghApprovalDate).toLocaleString("vi-VN") : "—"}</span>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider border ${
                                  selectedStudent.bghApprovalStatus === "DAT" || selectedStudent.bghApprovalStatus === "DAT_MIEN_HOC_THU" || selectedStudent.bghApprovalStatus === "DAT_HOC_THU" 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                    : selectedStudent.bghApprovalStatus === "KHONG_DAT" 
                                    ? "bg-rose-50 text-rose-700 border-rose-200" 
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}>
                                  {getApprovalStatusText(selectedStudent.bghApprovalStatus).toUpperCase()}
                                </span>
                                {selectedStudent.bghApprovalComment && <span className="text-slate-500 italic">"${selectedStudent.bghApprovalComment}"</span>}
                              </div>
                            </div>

                            {/* Row 2: GĐCS */}
                            <div className="pt-4 text-xs text-slate-650 leading-relaxed font-semibold">
                              <div className="flex justify-between items-center text-slate-400">
                                <span>👤 GĐCS Phê duyệt: <strong className="text-slate-700">{selectedStudent.gdcsApprovalUser || "—"}</strong></span>
                                <span>{selectedStudent.gdcsApprovalDate ? new Date(selectedStudent.gdcsApprovalDate).toLocaleString("vi-VN") : "—"}</span>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider border ${
                                  selectedStudent.gdcsApprovalStatus === "DAT" || selectedStudent.gdcsApprovalStatus === "DAT_MIEN_HOC_THU" || selectedStudent.gdcsApprovalStatus === "DAT_HOC_THU" 
                                    ? "bg-teal-50 text-teal-700 border-teal-200" 
                                    : selectedStudent.gdcsApprovalStatus === "KHONG_DAT" 
                                    ? "bg-rose-50 text-rose-700 border-rose-200" 
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}>
                                  {getApprovalStatusText(selectedStudent.gdcsApprovalStatus).toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {detailsSubTab === "admin" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-[#00A19A]" />
                          Thông tin hành chính tuyển sinh
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Khối học</label>
                            <span className="text-xs font-black text-slate-700 mt-1 block">{selectedStudent.grade || "-"}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kỳ khảo sát</label>
                            <span className="text-xs font-black text-slate-700 mt-1 block">{selectedStudent.period?.name || "-"}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đợt khảo sát</label>
                            <span className="text-xs font-black text-slate-700 mt-1 block break-all">{cleanBatchName(selectedStudent.batch?.name)}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hệ đào tạo</label>
                            <span className="text-xs font-black text-slate-700 mt-1 block">{selectedStudent.surveySystem || "-"}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cơ sở dự tuyển</label>
                            <span className="text-xs font-black text-slate-700 mt-1 block">{selectedStudent.admissionCampus || "-"}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">GV phụ trách khảo sát</label>
                            <span className="text-xs font-semibold text-slate-700 mt-1 block leading-relaxed">{getAssignedTeachersText()}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-2">
                            <label className="block text-[10px] font-bold text-[#E11D48] uppercase tracking-wider">Ghi chú quan trọng</label>
                            <p className="text-xs font-bold text-rose-600 mt-1.5 leading-relaxed bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">{selectedStudent.devImportantNote || "-"}</p>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả đánh giá chung</label>
                            <span className="text-xs font-bold text-slate-800 mt-1 block">{selectedStudent.devAssessmentResult || "-"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {detailsSubTab === "academic" && (
                      <div className="space-y-6 animate-in fade-in duration-200">
                        {/* Section: Học thử */}
                        {(selectedStudent.probationaryPeriod || selectedStudent.probationaryClass || selectedStudent.probationaryTeacher || selectedStudent.probationaryResult) && (
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-[#00A19A]" />
                              Thông tin đánh giá học thử
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thời gian học thử</label>
                                <span className="text-xs font-semibold text-slate-700 mt-1 block">{selectedStudent.probationaryPeriod || "-"}</span>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp học thử</label>
                                <span className="text-xs font-semibold text-slate-700 mt-1 block">{selectedStudent.probationaryClass || "-"}</span>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giáo viên phụ trách</label>
                                <span className="text-xs font-semibold text-slate-700 mt-1 block">{selectedStudent.probationaryTeacher || "-"}</span>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả học thử</label>
                                <span className="text-xs font-black text-teal-800 mt-1 block">
                                  {selectedStudent.probationaryResult === "DAT" ? "ĐẠT" : selectedStudent.probationaryResult === "CHUA_DAT" ? "CHƯA ĐẠT" : selectedStudent.probationaryResult || "-"}
                                </span>
                              </div>
                            </div>
                            
                            {selectedStudent.probationaryScoreText && (
                              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl mt-4">
                                <label className="block text-[10.5px] font-black text-slate-650 uppercase tracking-wider mb-3">Chi tiết điểm đánh giá học thử</label>
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                  {renderProbationaryScores()}
                                </div>
                              </div>
                            )}

                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mt-4">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nhận xét chi tiết học thử</label>
                              <p className="text-xs text-slate-750 mt-1.5 font-medium leading-relaxed">{selectedStudent.probationaryComment || "Chưa có nhận xét."}</p>
                            </div>

                            {/* Approval log of Preschool BGH */}
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mt-4">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Nhật ký Ban Giám hiệu Mầm non Phê duyệt học thử</label>
                              {(() => {
                                let logs = [];
                                if (selectedStudent.probationaryBghLog) {
                                  try { logs = JSON.parse(selectedStudent.probationaryBghLog); } catch (e) {}
                                }
                                if (logs.length === 0) {
                                  return <p className="text-xs text-slate-400 font-semibold italic">Chưa có nhật ký ghi nhận.</p>;
                                }
                                return (
                                  <div className="space-y-3 divide-y divide-slate-150 max-h-40 overflow-y-auto pr-1">
                                    {logs.map((log: any, idx: number) => (
                                      <div key={idx} className="pt-2.5 first:pt-0 text-xs text-slate-650 leading-relaxed font-semibold">
                                        <div className="flex justify-between items-center text-slate-400">
                                          <span>👤 <strong className="text-slate-700">{log.user}</strong></span>
                                          <span>{log.date ? new Date(log.date).toLocaleString("vi-VN") : ""}</span>
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-2">
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider border ${
                                            log.status === "DAT" ? "bg-emerald-50 text-emerald-700 border-emerald-250" : log.status === "KHONG_DAT" ? "bg-rose-50 text-rose-700 border-rose-250" : "bg-amber-50 text-amber-700 border-amber-250"
                                          }`}>
                                            {log.status === "DAT" ? "ĐẠT" : log.status === "KHONG_DAT" ? "KHÔNG ĐẠT" : "Ý KIẾN KHÁC"}
                                          </span>
                                          {log.comment && <span className="text-slate-505 italic">"${log.comment}"</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Section: Final Approval Result */}
                        <div className="border-t border-slate-200 pt-6">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-[#00A19A]" />
                            Quyết định tuyển sinh chung cuộc của Ban Giám Hiệu
                          </h4>
                          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                            <div className="flex flex-wrap items-center gap-6">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kết quả chung cuộc</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-extrabold inline-block border mt-1.5 ${getResultBadgeClass(selectedStudent.admissionResult)}`}>
                                  {selectedStudent.admissionResult || "Chưa duyệt kết quả tuyển sinh"}
                                </span>
                              </div>
                              {selectedStudent.signatureName && (
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Người ký duyệt</span>
                                  <span className="text-sm font-bold text-slate-700 block mt-1.5">{selectedStudent.signatureName}</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ý kiến chỉ đạo / Ghi chú của Giám đốc</span>
                              <p className="text-xs font-semibold text-slate-800 bg-white p-3.5 rounded-xl border border-slate-200 mt-2 min-h-[4rem] leading-relaxed">
                                {selectedStudent.directorNote || "Chưa có ghi chú chỉ đạo."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end text-xs font-semibold shrink-0">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-sm font-bold transition-all shadow-none cursor-pointer"
              >
                Đóng thông tin
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Dialog Form: Đăng ký Khảo sát lại */}
      {retestStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 flex justify-between items-center text-xs font-semibold border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#00A19A]">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">Đăng ký Khảo sát lại</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                    Học sinh: <span className="text-[#00A19A]">{retestStudent.fullName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRetestStudent(null)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Học sinh đã có kết quả <span className="text-rose-600 font-bold">Không đạt - Khảo sát lại</span>. 
                Thực hiện đăng ký học sinh vào một Kỳ/Đợt khảo sát mới để thi lại. 
                Mã học sinh <span className="font-bold text-[#00A19A]">({retestStudent.studentCode})</span> sẽ được giữ nguyên để đối chiếu toàn bộ lịch sử thi.
              </p>

              {/* Target Period selection */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Kỳ khảo sát mới <span className="text-rose-500">*</span>
                </label>
                <select
                  value={retestPeriodId}
                  onChange={(e) => {
                    setRetestPeriodId(e.target.value);
                    setRetestBatchId("");
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer font-medium text-slate-700"
                >
                  <option value="">-- Chọn Kỳ khảo sát mới --</option>
                  {(activeTab === "general" ? generalPeriods : preschoolPeriods).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Target Batch selection */}
              {retestPeriodId && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Đợt khảo sát mới</label>
                  <select
                    value={retestBatchId}
                    onChange={(e) => setRetestBatchId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer font-medium text-slate-700"
                  >
                    <option value="">-- Chọn Đợt khảo sát mới (Tất cả / Lẻ) --</option>
                    {((activeTab === "general" ? generalPeriods : preschoolPeriods).find(p => p.id === retestPeriodId)?.batches || [])
                      .filter((b: any) => b.id !== retestStudent.batchId && b.status === "ACTIVE")
                      .map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2.5 text-xs font-semibold">
              <button
                type="button"
                disabled={retestRegisterLoading}
                onClick={() => setRetestStudent(null)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200/60 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={retestRegisterLoading || !retestPeriodId}
                onClick={handleRegisterRetest}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00A19A] hover:bg-[#008B85] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {retestRegisterLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
                <span>Xác nhận đăng ký</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Form: Đăng ký Khảo sát lại hàng loạt */}
      {isBatchRetestOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 flex justify-between items-center text-xs font-semibold border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#00A19A]">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">Đăng ký Khảo sát lại hàng loạt</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                    Đang chọn: <span className="text-[#00A19A]">{selectedIds.length} học sinh</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchRetestOpen(false)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Hệ thống sẽ tạo đợt dự tuyển khảo sát lại cho toàn bộ <strong>{selectedIds.length}</strong> học sinh được chọn. Mã học sinh và hồ sơ cũ sẽ được liên kết lưu trữ.
              </p>

              {/* Target Period selection */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Kỳ khảo sát mới <span className="text-rose-500">*</span>
                </label>
                <select
                  value={batchRetestPeriodId}
                  onChange={(e) => {
                    setBatchRetestPeriodId(e.target.value);
                    setBatchRetestBatchId("");
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer font-medium text-slate-700"
                >
                  <option value="">-- Chọn Kỳ khảo sát mới --</option>
                  {(activeTab === "general" ? generalPeriods : preschoolPeriods).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Target Batch selection */}
              {batchRetestPeriodId && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Đợt khảo sát mới (Tùy chọn)
                  </label>
                  <select
                    value={batchRetestBatchId}
                    onChange={(e) => setBatchRetestBatchId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer font-medium text-slate-700"
                  >
                    <option value="">-- Chọn Đợt khảo sát mới --</option>
                    {((activeTab === "general" ? generalPeriods : preschoolPeriods).find(p => p.id === batchRetestPeriodId)?.batches || [])
                      .filter((b: any) => b.status === "ACTIVE")
                      .map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2.5 text-xs font-semibold">
              <button
                type="button"
                disabled={batchRetestLoading}
                onClick={() => setIsBatchRetestOpen(false)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200/60 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={batchRetestLoading || !batchRetestPeriodId}
                onClick={handleBatchRetestRegister}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00A19A] hover:bg-[#008B85] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {batchRetestLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
                <span>Xác nhận chuyển ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HS & PHHS (PVDH-01..05) */}
      {pvdhTargetStudent && (
        <PvdhOrientationModal
          isOpen={!!pvdhTargetStudent}
          onClose={() => setPvdhTargetStudent(null)}
          student={pvdhTargetStudent}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      {/* MODAL PHIẾU ĐỊNH HƯỚNG ĐẦU VÀO (2 TAB) */}
      {orientationTargetStudent && (
        <StudentOrientationModal
          isOpen={!!orientationTargetStudent}
          onClose={() => setOrientationTargetStudent(null)}
          student={orientationTargetStudent}
          onOpenReport={(stu, orData) => {
            setReportTargetStudent(stu);
            setActiveReportOrientationData(orData);
          }}
          onSuccess={() => {
            // refresh data
            window.location.reload();
          }}
        />
      )}

      {/* MODAL BÁO CÁO NHẬN DIỆN VÀ ĐỊNH HƯỚNG ĐẦU VÀO (A4) */}
      {reportTargetStudent && (
        <StudentOrientationReportModal
          isOpen={!!reportTargetStudent}
          onClose={() => {
            setReportTargetStudent(null);
            setActiveReportOrientationData(null);
          }}
          student={reportTargetStudent}
          orientationData={activeReportOrientationData}
        />
      )}
    </div>
  );
}


function MoveToBatchModal({
  open,
  onClose,
  selectedIds,
  periods,
  onSubmit
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  periods: any[];
  onSubmit: (targetPeriodId: string, targetBatchId: string) => Promise<void>;
}) {
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [loading, setLoading] = useState(false);

  // Update batches when period changes
  const activePeriod = periods.find(p => p.id === selectedPeriodId);
  const availableBatches = activePeriod ? activePeriod.batches : [];

  // Reset state on open
  useEffect(() => {
    if (open) {
      setSelectedPeriodId("");
      setSelectedBatchId("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    setLoading(true);
    await onSubmit(selectedPeriodId, selectedBatchId);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Chuyển đợt KS</h3>
            <p className="text-xs font-semibold text-slate-500 mt-1">Đang chọn {selectedIds.length} học sinh</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 bg-white">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Kỳ Khảo sát đích <span className="text-red-500">*</span></label>
              <select
                value={selectedPeriodId}
                onChange={(e) => {
                  setSelectedPeriodId(e.target.value);
                  setSelectedBatchId("");
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-teal-200 transition-all cursor-pointer"
              >
                <option value="">-- Chọn Kỳ KS --</option>
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Đợt Khảo sát đích</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                disabled={!selectedPeriodId || availableBatches.length === 0}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-teal-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <option value="">-- Có thể chọn sau --</option>
                {availableBatches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPeriodId || loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#003B3A] hover:bg-[#003B3A] text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Xác nhận Chuyển
          </button>
        </div>
      </div>
    </div>
  );
}

function PreschoolMoveToBatchModal({
  open,
  onClose,
  selectedIds,
  periods,
  onSubmit
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  periods: any[];
  onSubmit: (targetPeriodId: string, targetBatchId: string) => Promise<void>;
}) {
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [loading, setLoading] = useState(false);

  const activePeriod = periods.find(p => p.id === selectedPeriodId);
  const availableBatches = activePeriod ? activePeriod.batches : [];

  useEffect(() => {
    if (open) {
      setSelectedPeriodId("");
      setSelectedBatchId("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    setLoading(true);
    await onSubmit(selectedPeriodId, selectedBatchId);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Chuyển đợt KS Mầm non</h3>
            <p className="text-xs font-semibold text-slate-500 mt-1">Đang chọn {selectedIds.length} học sinh</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 bg-white">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Kỳ Khảo sát đích <span className="text-red-500">*</span></label>
              <select
                value={selectedPeriodId}
                onChange={(e) => {
                  setSelectedPeriodId(e.target.value);
                  setSelectedBatchId("");
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-[#00A19A]/20 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] transition-all cursor-pointer"
              >
                <option value="">-- Chọn Kỳ KS --</option>
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Đợt Khảo sát đích</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                disabled={!selectedPeriodId || availableBatches.length === 0}
                className="w-full px-4 py-3 bg-slate-50 border border-[#00A19A]/20 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] transition-all cursor-pointer disabled:opacity-50"
              >
                <option value="">-- Có thể chọn sau --</option>
                {availableBatches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPeriodId || loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#00A19A] hover:bg-[#008B85] text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Xác nhận Chuyển
          </button>
        </div>
      </div>
    </div>
  );
}
