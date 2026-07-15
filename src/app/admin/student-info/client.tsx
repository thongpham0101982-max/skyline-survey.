"use client";

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
  Info
} from "lucide-react";
import { confirmEnrollmentAction } from "../student-transfers/actions";
import { getSurveyFormAgeGroup } from "@/lib/preschool";
import * as XLSX from "xlsx";
import { InputAssessmentsClient } from "../input-assessments/client";
import { PreschoolInputAssessmentsClient } from "../preschool-input-assessments/client";

interface StudentInfoClientProps {
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
}

const preschoolGrades = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"];

export function StudentInfoClient({ 
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
  gradesPreschool = []
}: StudentInfoClientProps) {
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

  const [activeTab, setActiveTab] = useState<"general" | "preschool">("general");

  const [devAreas, setDevAreas] = useState<any[]>([]);
  const [devAreasLoading, setDevAreasLoading] = useState(false);
  const [preschoolInputAreas, setPreschoolInputAreas] = useState<any[]>([]);
  const [preschoolInputScores, setPreschoolInputScores] = useState<any[]>([]);
  const [preschoolInputLoading, setPreschoolInputLoading] = useState(false);
  const [preschoolAssignments, setPreschoolAssignments] = useState<any[]>([]);

  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedResult, setSelectedResult] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedCampusFilter, setSelectedCampusFilter] = useState("all");

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCampusFilter]);
  
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

  // Add/Edit student modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formSubTab, setFormSubTab] = useState<"admin" | "academic" | "approval">("admin");

  // Reset form subtab when form modal opens
  useEffect(() => {
    if (isFormOpen) {
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
    isAbsent: false
  });

  // Import excel modal states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPeriodId, setImportPeriodId] = useState("");
  const [importBatchId, setImportBatchId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDetailsOpen && activeTab === "preschool" && selectedStudent) {
      const fetchDevAreas = async () => {
        setDevAreasLoading(true);
        try {
          const ageGroup = getSurveyFormAgeGroup(selectedStudent.grade, selectedStudent.batch?.startDate);
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
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00A99D]" />
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
            <div className="font-bold text-[#00A99D] text-[10px] uppercase tracking-wider">{areaData.areaName}</div>
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
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
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
              <div className="font-bold text-indigo-700 text-[10px] uppercase tracking-wider">{area.name}</div>
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
  const [subTab, setSubTab] = useState<"periods" | "students" | "info" | "result">("students");

  useEffect(() => {
    setSelectedIds([]);
  }, [subTab, activeTab]);
  
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

  const showNotification = (text: string, type: "success" | "err" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Reset filters when changing tab
  const handleTabChange = (tab: "general" | "preschool") => {
    setActiveTab(tab);
    setSearchQuery("");
    setSelectedPeriod("");
    setSelectedBatch("");
    setSelectedResult("");
    setSelectedGrade("");
    setSelectedIds([]);
    setCurrentPage(1);
  };

  // Get active dataset
  const currentDataset = useMemo(() => {
    return activeTab === "general" ? initialGeneralStudents : initialPreschoolStudents;
  }, [activeTab, initialGeneralStudents, initialPreschoolStudents]);

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
      const matchingCampus = campuses.find(c => c.id === s.registeredCampus || c.campusName === s.registeredCampus);
      if (matchingCampus) return matchingCampus.id;
    }
    
    // 2. Check admissionCampus
    if (s.admissionCampus) {
      const tc = campuses.find(c => c.campusName === s.admissionCampus || c.campusCode === s.admissionCampus);
      if (tc) return tc.id;
    }
    
    // 3. Fallback to batch campusId
    if (s.batchId) {
      const b = preschoolPeriods.flatMap(p => p.batches || []).concat(generalPeriods.flatMap(p => p.batches || [])).find(bx => bx.id === s.batchId);
      if (b?.campusId) {
        const tc = campuses.find(c => c.id === b.campusId);
        if (tc) return tc.id;
      }
    }
    
    // 4. Try string match on admissionCampus
    const campusName = s.admissionCampus || "";
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
      }

      return true;
    });
  }, [currentDataset, searchQuery, selectedPeriod, selectedBatch, selectedResult, selectedGrade, subTab]);

  // Reset selected checkboxes if filtered dataset changes
  useEffect(() => {
    setSelectedIds([]);
  }, [filteredStudents]);

  // Statistics
  const statistics = useMemo(() => {
    let total = filteredStudents.length;
    let passed = 0;
    let failed = 0;
    let pending = 0;

    filteredStudents.forEach((s) => {
      const res = s.admissionResult || "";
      if (res === "Đạt" || res === "Đạt cam kết" || res === "Học thử") {
        passed++;
      } else if (res.includes("Không đạt")) {
        failed++;
      } else {
        pending++;
      }
    });

    return { total, passed, failed, pending };
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
    if (result === "Đạt cam kết") return "bg-amber-50 text-amber-600 border border-amber-100";
    if (result === "Học thử") return "bg-indigo-50 text-indigo-600 border border-indigo-100";
    if (result.includes("Không đạt")) return "bg-rose-50 text-rose-600 border border-rose-100";
    return "bg-blue-50 text-blue-600 border border-blue-100";
  };

  // Get current active tab periods list
  const activePeriodsList = useMemo(() => {
    return activeTab === "general" ? generalPeriods : preschoolPeriods;
  }, [activeTab, generalPeriods, preschoolPeriods]);

  const uniquePeriodNames = useMemo(() => {
    const names = new Set();
    activePeriodsList.forEach((p) => {
      if (p.name) names.add(p.name);
    });
    return Array.from(names).sort();
  }, [activePeriodsList]);

  const uniqueBatchNames = useMemo(() => {
    const names = new Set();
    if (selectedPeriod) {
      const period = activePeriodsList.find(p => p.name === selectedPeriod);
      if (period?.batches) {
        period.batches.forEach((b) => {
          if (b.name) names.add(b.name);
        });
      }
    } else {
      activePeriodsList.forEach((p) => {
        if (p.batches) {
          p.batches.forEach((b) => {
            if (b.name) names.add(b.name);
          });
        }
      });
    }
    return Array.from(names).sort();
  }, [selectedPeriod, activePeriodsList]);

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
      isAbsent: false
    });
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
      isAbsent: student.isAbsent || false
    });
    setIsFormOpen(true);
  };

  // Handle Save Student (Create/Edit)
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.studentCode.trim()) return showNotification("Mã học sinh không được để trống", "err");
    if (!formState.fullName.trim()) return showNotification("Họ và tên không được để trống", "err");
    if (!formState.periodId) return showNotification("Kỳ khảo sát là bắt buộc", "err");

    const endpoint = activeTab === "general" 
      ? "/api/input-assessment-students" 
      : "/api/preschool-input-assessment-students";
    
    const method = formMode === "edit" ? "PUT" : "POST";
    const bodyData = formMode === "edit"
      ? { id: editingId, data: formState }
      : { action: "CREATE", data: formState };

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
    } catch (err) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setRetestRegisterLoading(false);
    }
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
          "Học lực": s.kqHocTap || "",
          "Hạnh kiểm": s.kqRenLuyen || "",
          "Học bạ": s.kqgdTieuHoc || "",
          "Học kỳ / Năm TS": s.hocKy || "",
          "Đối tượng TS": s.targetType || "",
          ...(selectedPeriod?.toLowerCase().includes("open day") && {
            "Đăng ký CS": campuses.find(c => c.id === s.registeredCampus)?.campusName || s.registeredCampus || "",
            "Ủy quyền xét duyệt": campuses.find(c => c.id === s.registeredCampus)?.manager?.fullName || ""
          }),
          "Kết quả duyệt": s.admissionResult || "Chưa duyệt",
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
        };
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === "general" ? "Phổ thông" : "Mầm non");
    XLSX.writeFile(workbook, `Danh_Sach_HS_Khao_Sat_${activeTab === "general" ? "Pho_Thong" : "Mam_Non"}.xlsx`);
    showNotification("Đã xuất file Excel thành công!");
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
          "Đối tượng TS": ""
        }
      ]);
      ws["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
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
          const kqHocTap = String(row["Học lực"] || row["Kết quả Học tập"] || findVal(row, ["học lực", "học tập"]) || "").trim();
          const kqRenLuyen = String(row["Hạnh kiểm"] || row["Kết quả Rèn luyện"] || findVal(row, ["hạnh kiểm", "rèn luyện"]) || "").trim();

          return {
            studentCode,
            fullName,
            dateOfBirth: parsedDate,
            gender,
            grade,
            hocKy,
            surveyFormType,
            hoSoCtQuocTe,
            kqgdTieuHoc,
            targetType,
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
    <div className="space-y-8">
      
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

      {/* Tab Selector & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-b border-slate-300">
        <div className="flex gap-4">
          <button
            onClick={() => handleTabChange("general")}
            className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-all border-b-2 -mb-px rounded-t-xl ${
              activeTab === "general"
                ? "border-[#00A99D] text-[#00A99D] bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/20"
            }`}
          >
            <GraduationCap className="w-5 h-5" />
            Phổ thông K-12 ({initialGeneralStudents.length})
          </button>
          <button
            onClick={() => handleTabChange("preschool")}
            className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-all border-b-2 -mb-px rounded-t-xl ${
              activeTab === "preschool"
                ? "border-[#00A99D] text-[#00A99D] bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/20"
            }`}
          >
            <Baby className="w-5 h-5" />
            Mầm non ({initialPreschoolStudents.length})
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pb-2 sm:pb-0">
          {subTab === "info" && selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 hover:bg-rose-100 text-rose-600 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer text-xs font-semibold"
            >
              <Trash2 className="w-4 h-4" />
              Xóa đã chọn ({selectedIds.length})
            </button>
          )}
          {subTab === "info" && (
            <>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00A99D] hover:bg-[#009085] text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {activeTab === "general" ? "Thêm mới" : "Thêm trẻ"}
              </button>
              <button
                onClick={() => {
                  if (activePeriodsList.length === 0) {
                    return showNotification("Năm học này chưa có kỳ khảo sát để import học sinh", "err");
                  }
                  setImportPeriodId(activePeriodsList[0].id);
                  setImportError(null);
                  setImportSuccessCount(null);
                  setIsImportOpen(true);
                }}
                className="flex items-center gap-1.5 hover:bg-indigo-100 text-indigo-600 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer text-xs font-semibold"
              >
                <Upload className="w-4 h-4" />
                Nhập Excel
              </button>
            </>
          )}

          {subTab === "result" && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Selector */}
      <div className="flex flex-wrap gap-2 w-fit">
        <button
          onClick={() => {
            setSubTab("periods");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
            subTab === "periods"
              ? "bg-[#00A99D] text-white shadow-sm"
              : "bg-slate-50 hover:bg-slate-100 text-slate-600"
          }`}
        >
          <Clock className="w-4 h-4" />
          Tạo đợt khảo sát
        </button>
        <button
          onClick={() => {
            setSubTab("students");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
            subTab === "students"
              ? "bg-[#00A99D] text-white shadow-sm"
              : "bg-slate-50 hover:bg-slate-100 text-slate-600"
          }`}
        >
          <Users className="w-4 h-4" />
          Danh sách khảo sát
        </button>
        <button
          onClick={() => {
            setSubTab("info");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
            subTab === "info"
              ? "bg-[#00A99D] text-white shadow-sm"
              : "text-slate-650 hover:bg-slate-200/60 hover:text-slate-800"
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          TT Khảo sát lại
        </button>
        <button
          onClick={() => {
            setSubTab("result");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
            subTab === "result"
              ? "bg-[#00A99D] text-white shadow-sm"
              : "text-slate-650 hover:bg-slate-200/60 hover:text-slate-800"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Kết quả và nhập học
        </button>
      </div>

      {/* Statistics Cards */}
      {subTab === "result" && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4 hover:shadow-sm transition-all duration-200">
          <div className="p-3 bg-slate-50 text-slate-650 rounded-xl">
            <Users2 className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng số trong bộ lọc</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{statistics.total}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4 hover:shadow-sm transition-all duration-200">
          <div className="p-3 bg-emerald-50 text-emerald-650 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đạt / Đạt cam kết / Học thử</p>
            <p className="text-xl font-black text-emerald-650 mt-0.5">{statistics.passed}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4 hover:shadow-sm transition-all duration-200">
          <div className="p-3 bg-rose-50 text-rose-650 rounded-xl">
            <XCircle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Không đạt</p>
            <p className="text-xl font-black text-rose-650 mt-0.5">{statistics.failed}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4 hover:shadow-sm transition-all duration-200">
          <div className="p-3 bg-amber-50 text-amber-650 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Chưa duyệt / Khác</p>
            <p className="text-xl font-black text-amber-650 mt-0.5">{statistics.pending}</p>
          </div>
        </div>
      </div>
      )}

      {(subTab === "periods" || subTab === "students") ? (
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
              forcedTab={subTab}
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
              forcedTab={subTab === "students" ? "children" : "periods"}
            />
          )}
        </div>
      ) : (
        <>
          {/* Filters & Search Control Panel */}
          <div className="bg-slate-50/30 rounded-2xl p-6 border border-slate-100 shadow-none space-y-5">
        <div className="flex items-center gap-2 text-[#1E1B4B] font-bold text-sm">
          <Filter className="w-4 h-4 text-[#00A99D]" />
          Bộ lọc & Tìm kiếm nhanh
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${subTab === "result" ? "lg:grid-cols-6 md:grid-cols-3" : "lg:grid-cols-5 md:grid-cols-3"} gap-3`}>
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
              className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm border border-slate-200/80 bg-white focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none transition-all text-slate-700 shadow-xs"
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

          {/* Campus Filter */}
          <select
            value={selectedCampusFilter}
            onChange={(e) => {
              setSelectedCampusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2.5 rounded-xl text-sm border border-slate-200/80 focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none bg-white cursor-pointer text-slate-700 font-medium shadow-xs"
          >
            <option value="all">Tất cả Cơ sở</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>{c.campusName}</option>
            ))}
          </select>

          {/* Period Filter */}
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              setSelectedBatch(""); // Reset batch when period changes
              setCurrentPage(1);
            }}
            className="px-3 py-2.5 rounded-xl text-sm border border-slate-200/80 focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none bg-white cursor-pointer text-slate-700 font-medium shadow-xs"
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
            className="px-3 py-2.5 rounded-xl text-sm border border-slate-200/80 focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none bg-white cursor-pointer text-slate-700 font-medium shadow-xs"
          >
            <option value="">Tất cả Đợt</option>
            <option value="UNASSIGNED">Khác / Chưa phân đợt</option>
            {uniqueBatchNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Grade Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2.5 rounded-xl text-sm border border-slate-200/80 focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none bg-white cursor-pointer text-slate-700 font-medium shadow-xs"
          >
            <option value="">Tất cả Khối</option>
            {filterOptions.grades.map((g) => (
              <option key={g} value={g}>{activeTab === "general" ? `Khối ${g}` : g}</option>
            ))}
          </select>

          {/* Result Filter */}
          {subTab === "result" && (
            <select
              value={selectedResult}
              onChange={(e) => {
                setSelectedResult(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 rounded-xl text-sm border border-slate-200/80 focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none bg-white cursor-pointer text-slate-700 font-medium shadow-xs"
            >
              <option value="">Tất cả Kết quả</option>
              {filterOptions.results.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === "general" ? (
            /* Phổ thông K-12 Table (Matched style of original general assessments) */
            <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
              <thead className="text-xs font-bold bg-slate-50/50 text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  {subTab === "info" && (
                    <th className="px-5 py-4 border-b border-slate-200/60 w-12 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-[#00A99D] accent-[#00A99D]"
                        checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                        onChange={(e) => setSelectedIds(e.target.checked ? filteredStudents.map(s => s.id) : [])}
                      />
                    </th>
                  )}
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-28">Mã học sinh</th>
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600">Họ và tên</th>
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-16 text-center">Khối</th>
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-16 text-center">Giới tính</th>
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-24 text-center">Ngày sinh</th>
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-28 text-center">Cơ sở</th>
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-20 text-center">Hệ KS</th>
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-16 text-center">Vắng</th>
                  {subTab === "info" && (
                    <>
                      <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-24 text-center">Học lực</th>
                      <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-24 text-center">Hạnh kiểm</th>
                      <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-28 text-center">Học bạ</th>
                      <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 text-center">Học kỳ / Năm TS</th>
                      <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 text-center">Đối tượng TS</th>
                      <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-48 text-center">Đăng ký Khảo sát lại</th>
                    </>
                  )}
                  {selectedPeriod?.toLowerCase().includes("open day") && (
                    <>
                      <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-24 text-center">Đăng ký CS</th>
                      <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-32 text-center">Ủy quyền xét duyệt</th>
                    </>
                  )}
                  {subTab === "result" && (
                    <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 text-center">Kết quả duyệt</th>
                  )}
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-32 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-slate-700">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={selectedPeriod?.toLowerCase().includes("open day") ? (subTab === "info" ? 18 : 13) : (subTab === "info" ? 16 : 11)} className="px-4 py-6 text-center text-slate-400 font-medium border-b border-slate-100">
                      Không tìm thấy dữ liệu học sinh phù hợp.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((s, idx) => (
                    <tr 
                      key={s.id} 
                      className={`group hover:bg-slate-50 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                      onClick={() => {
                        setSelectedStudent(s);
                        setIsDetailsOpen(true);
                      }}
                    >
                      {subTab === "info" && (
                        <td className="px-5 py-4 border-b border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded text-[#00A99D] accent-[#00A99D]"
                            checked={selectedIds.includes(s.id)}
                            onChange={(e) => setSelectedIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))}
                          />
                        </td>
                      )}
                      <td className="px-5 py-4 border-b border-slate-100 font-mono text-xs text-slate-650">{s.studentCode}</td>
                      <td className="px-5 py-4 border-b border-slate-100">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800">{s.fullName}</span>
                            {s.enrollmentStatus === "COMPLETED" && (
                              <span className="text-[9px] font-semibold text-emerald-600">
                                Lớp: {s.enrollmentClass?.className || s.enrollmentClassId || ""}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-slate-450 mt-0.5">{s.surveySystem || "Chưa xếp hệ"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 border-b border-slate-100 text-center text-xs font-semibold text-slate-650">
                        {s.grade}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-100 text-center text-xs font-semibold text-slate-650">
                        {s.gender || "-"}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-100 text-center text-xs text-slate-500">
                        {formatDate(s.dateOfBirth)}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-100 text-center text-xs font-semibold text-slate-650">
                        {campuses.find(c => c.id === resolveStudentCampusId(s))?.campusName || s.admissionCampus || s.registeredCampus || "—"}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-100 text-center text-xs text-slate-650">
                        {s.surveyFormType || "-"}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-rose-600 accent-rose-600 cursor-pointer"
                          checked={s.isAbsent || false}
                          onChange={async (e) => {
                            const val = e.target.checked;
                            await handleUpdateAbsent(s, val);
                          }}
                        />
                      </td>
                      {subTab === "info" && (
                        <>
                          <td className="px-5 py-4 border-b border-slate-100 text-center text-xs text-slate-600">{s.kqHocTap || "-"}</td>
                          <td className="px-5 py-4 border-b border-slate-100 text-center text-xs text-slate-600">{s.kqRenLuyen || "-"}</td>
                          <td className="px-5 py-4 border-b border-slate-100 text-center text-xs text-slate-600">{s.kqgdTieuHoc || "-"}</td>
                          <td className="px-5 py-4 border-b border-slate-100 text-center text-xs text-slate-600">{s.hocKy || "-"}</td>
                          <td className="px-5 py-4 border-b border-slate-100 text-center text-xs text-slate-600">{s.targetType || "-"}</td>
                          <td className="px-5 py-4 border-b border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setRetestStudent(s);
                                setRetestPeriodId("");
                                setRetestBatchId("");
                              }}
                              className="hover:bg-indigo-100 text-indigo-600 text-[11px] font-black tracking-wide shadow-sm hover:shadow transition-all duration-200 flex items-center gap-1.5 mx-auto cursor-pointer text-xs font-semibold"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Đăng ký thi lại
                            </button>
                          </td>
                        </>
                      )}
                      {selectedPeriod?.toLowerCase().includes("open day") && (
                        <>
                          <td className="p-2 p-2 text-center text-xs text-slate-650 border border-slate-300">
                            {campuses.find(c => c.id === s.registeredCampus)?.campusName || s.registeredCampus || "-"}
                          </td>
                          <td className="p-2 p-2 text-center text-xs text-slate-650 font-bold border border-slate-300">
                            {campuses.find(c => c.id === s.registeredCampus)?.manager?.fullName || "-"}
                          </td>
                        </>
                      )}
                      {subTab === "result" && (
                        <td className="px-5 py-4 border-b border-slate-100 text-center">
                          <span className="text-xs font-semibold text-slate-700">
                            {s.admissionResult || "Chưa duyệt"}
                          </span>
                        </td>
                      )}
                      <td className="px-5 py-4 border-b border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-1.5">
                          {subTab === "result" && s.admissionResult && s.admissionResult.toUpperCase().includes("ĐẠT") && !s.admissionResult.toUpperCase().includes("KHÔNG") && (
                            <>
                              {!s.enrollmentStatus ? (
                                <button
                                  onClick={() => handleConfirmEnrollment(s)}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-all text-xs font-semibold"
                                  title="Xác nhận Nhập học"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              ) : s.enrollmentStatus === "PENDING" ? (
                                <span className="text-[10px] font-semibold text-amber-600" title="Chờ xếp lớp">
                                  Chờ nhập học
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-emerald-600" title={`Nhập học vào ${s.enrollmentClass?.className || s.enrollmentClassId || ""}`}>
                                  Đã nhập học
                                </span>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedStudent(s);
                              setIsDetailsOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#00A99D] hover:bg-slate-100 rounded-xl transition-all"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {subTab === "info" && (
                            <>

                              <button
                                onClick={() => openEditModal(s)}
                                className="p-1.5 text-slate-400 hover:text-[#00A99D] hover:bg-slate-100 rounded-xl transition-all"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteStudent(s, e)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all text-xs font-semibold"
                                title="Xóa học sinh"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* Mầm non Preschool Table (Matched style of original preschool Ds Trẻ) */
            <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
              <thead className="text-xs font-bold bg-slate-50/50 text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  {subTab === "info" && (
                    <th className="px-5 py-4 border-b border-slate-200/60 w-12 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-[#00A99D]"
                        checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                        onChange={(e) => setSelectedIds(e.target.checked ? filteredStudents.map(c => c.id) : [])}
                      />
                    </th>
                  )}
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-14">STT</th>
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-28">Mã bé</th>
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600">Họ và tên</th>
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-24">Ngày sinh</th>
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-24">Giới tính</th>
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-28">Nhóm tuổi</th>
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-36">Cơ sở</th>
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-16 text-center">Vắng</th>
                  {subTab === "result" && (
                    <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-36">Kết quả</th>
                  )}
                  <th className="px-5 py-4 border-b border-slate-200/60 text-xs font-bold text-slate-600 w-32 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-6 text-center text-slate-400 font-medium border-b border-slate-100">
                      Không tìm thấy dữ liệu học sinh phù hợp.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((child, i) => (
                    <tr 
                      key={child.id} 
                      className={`hover:bg-[#00A99D]/5/30 transition-colors cursor-pointer ${selectedIds.includes(child.id) ? "bg-[#00A99D]/5/50" : ""}`}
                      onClick={() => {
                        setSelectedStudent(child);
                        setIsDetailsOpen(true);
                      }}
                    >
                      {subTab === "info" && (
                        <td className="px-5 py-4 border-b border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-[#00A99D]"
                            checked={selectedIds.includes(child.id)}
                            onChange={(e) => setSelectedIds(prev => e.target.checked ? [...prev, child.id] : prev.filter(id => id !== child.id))}
                          />
                        </td>
                      )}
                      <td className="px-5 py-4 border-b border-slate-100 text-slate-400 text-xs">{(currentPage - 1) * pageSize + i + 1}</td>
                      <td className="px-5 py-4 border-b border-slate-100 font-mono text-xs text-slate-650">{child.studentCode}</td>
                      <td className="px-5 py-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-xs">{child.fullName}</span>
                          {child.enrollmentStatus === "COMPLETED" && (
                            <span className="text-[9px] font-semibold text-emerald-600">
                              Lớp: {child.enrollmentClass?.className || child.enrollmentClassId || ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 border-b border-slate-100 text-xs text-slate-500">
                        {formatDate(child.dateOfBirth)}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-100">
                        <span className="text-sm font-semibold text-slate-700">
                          {child.gender ? (child.gender === "MALE" || child.gender === "Nam" || child.gender === "M" ? "Nam" : "Nữ") : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 border-b border-slate-100 text-xs font-semibold text-slate-650">{child.grade || "—"}</td>
                      <td className="px-5 py-4 border-b border-slate-100 text-xs font-semibold text-slate-650">
                        {child.admissionCampus || "—"}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-rose-600 accent-rose-600 cursor-pointer"
                          checked={child.isAbsent || false}
                          onChange={async (e) => {
                            const val = e.target.checked;
                            await handleUpdateAbsent(child, val);
                          }}
                        />
                      </td>
                      {subTab === "result" && (
                        <td className="px-5 py-4 border-b border-slate-100">
                          {child.admissionResult ? (
                            <span className="text-xs font-semibold text-slate-700">{child.admissionResult}</span>
                          ) : (
                            <span className="text-xs text-slate-300">Chưa duyệt</span>
                          )}
                        </td>
                      )}
                      <td className="px-5 py-4 border-b border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-1 items-center">
                          {subTab === "result" && child.admissionResult && child.admissionResult.toUpperCase().includes("ĐẠT") && !child.admissionResult.toUpperCase().includes("KHÔNG") && (
                            <>
                              {!child.enrollmentStatus ? (
                                <button
                                  onClick={() => handleConfirmEnrollment(child, true)}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-all text-xs font-semibold"
                                  title="Xác nhận Nhập học"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              ) : child.enrollmentStatus === "PENDING" ? (
                                <span className="text-[10px] font-semibold text-amber-600" title="Chờ xếp lớp">
                                  Chờ nhập học
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-emerald-600" title={`Nhập học vào ${child.enrollmentClass?.className || child.enrollmentClassId || ""}`}>
                                  Đã nhập học
                                </span>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedStudent(child);
                              setIsDetailsOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#00A99D] hover:bg-slate-100 rounded-xl transition-all"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {subTab === "info" && (
                            <>
                              <button
                                onClick={() => openEditModal(child)}
                                className="p-2 text-slate-300 hover:text-[#00A99D] hover:bg-[#00A99D]/5 rounded-xl transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteStudent(child, e)}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all text-xs font-semibold"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredStudents.length > 0 && (
          <div className="p-4 flex items-center justify-between text-xs font-semibold">
            <span className="text-xs text-slate-500 font-medium">
              Hiển thị {Math.min(filteredStudents.length, (currentPage - 1) * pageSize + 1)}-
              {Math.min(filteredStudents.length, currentPage * pageSize)} trong tổng số{" "}
              {filteredStudents.length} học sinh
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer text-xs font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                if (totalPages > 5 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="px-2 py-1 text-xs text-slate-400">...</span>;
                  }
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-[#00A99D] text-white border-[#00A99D]"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer text-xs font-semibold"
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

            <form onSubmit={handleSaveStudent} className="flex-1 overflow-hidden flex flex-col bg-[#F8FAFC]">
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                
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
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Kết quả Học tập</label>
                              <select
                                value={formState.kqHocTap}
                                onChange={(e) => setFormState({ ...formState, kqHocTap: e.target.value })}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">--</option>
                                {configs.filter(c => c.categoryType === "KQ_HOC_TAP").map(c => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Kết quả Rèn luyện</label>
                              <select
                                value={formState.kqRenLuyen}
                                onChange={(e) => setFormState({ ...formState, kqRenLuyen: e.target.value })}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">--</option>
                                {configs.filter(c => c.categoryType === "KQ_REN_LUYEN").map(c => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
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
                        <span className="text-[11px] font-semibold text-[#64748B] block mt-0.5">Chọn một hoặc nhiều đối tượng tuyển sinh:</span>
                        <div className="flex flex-wrap gap-2">
                          {configs.filter(c => c.categoryType === "DOI_TUONG_TS").map(c => {
                            const selectedTargets = formState.targetType ? formState.targetType.split(",").map((t) => t.trim()).filter(Boolean) : [];
                            const isChecked = selectedTargets.includes(c.name);
                            return (
                              <button
                                type="button"
                                key={c.id}
                                onClick={() => {
                                  let updated;
                                  if (isChecked) {
                                    updated = selectedTargets.filter((t) => t !== c.name);
                                  } else {
                                    updated = [...selectedTargets, c.name];
                                  }
                                  setFormState(f => ({ ...f, targetType: updated.join(", ") }));
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none bg-white cursor-pointer font-semibold"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none bg-white cursor-pointer font-semibold"
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
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-[#00A99D] hover:bg-[#009085] text-white rounded-xl text-xs font-bold shadow-none transition-all active:scale-95 cursor-pointer disabled:opacity-50"
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
                    ? "border-[#00A99D] text-[#00A99D]"
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
                    ? "border-[#00A99D] text-[#00A99D]"
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
                    ? "border-[#00A99D] text-[#00A99D]"
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
                            <Award className="w-4 h-4 text-[#00A99D]" />
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
                                } else if (sNameLower.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl")) {
                                  if (sNameLower.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt")) {
                                    writtenEnglishVal = scoreVal;
                                  } else if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || sCode.includes("speaking") || sCode.includes("oral") || sCode.includes("vd")) {
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
                            let totalScore: number | null = null;
                            
                            if (!isGrade1) {
                              if (writtenEnglishVal !== null && writtenEnglishVal !== undefined && writtenEnglishVal !== "") {
                                writtenDisplay = `${writtenEnglishVal}/70`;
                              }
                              if (oralEnglishVal !== null && oralEnglishVal !== undefined && oralEnglishVal !== "") {
                                oralDisplay = `${oralEnglishVal}/30`;
                              }
                              
                              const wScore = parseFloat(writtenEnglishVal);
                              const oScore = parseFloat(oralEnglishVal);
                              if (!isNaN(wScore) || !isNaN(oScore)) {
                                totalScore = (isNaN(wScore) ? 0 : wScore) + (isNaN(oScore) ? 0 : oScore);
                              }
                            }

                            // Determine psychology color code based on score
                            let psychColorClass = "text-slate-700 bg-slate-50 border-slate-200";
                            let psychBadgeText = "";
                            if (psychologyVal !== null && psychologyVal !== undefined && psychologyVal !== "—") {
                              const scNum = parseFloat(psychologyVal);
                              if (!isNaN(scNum)) {
                                if (scNum <= 15) {
                                  psychColorClass = "text-[#00A99D] bg-[#00A99D]/5 border-[#00A99D]/20";
                                  psychBadgeText = "Bình thường";
                                } else if (scNum <= 31) {
                                  psychColorClass = "text-amber-600 bg-amber-50 border-amber-200/50";
                                  psychBadgeText = "Dấu hiệu nhẹ";
                                } else if (scNum <= 47) {
                                  psychColorClass = "text-orange-600 bg-orange-50 border-orange-200/50";
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
                                {/* 1. Core Subject Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                  {/* Math Card */}
                                  <div className="bg-[#00A99D]/5 p-4 rounded-2xl border border-[#00A99D]/15 hover:shadow-md hover:scale-[1.02] transition-all duration-300 text-center flex flex-col justify-between h-28">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Calculator className="w-3.5 h-3.5 text-[#00A99D]" />
                                      <span className="block text-[10px] font-black text-[#00A99D] uppercase tracking-widest">Điểm Toán</span>
                                    </div>
                                    <span className="text-3xl font-black text-slate-800 leading-none">
                                      {mathVal !== null && mathVal !== undefined ? mathVal : "—"}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold">Thang điểm 10</span>
                                  </div>

                                  {/* Literature Card */}
                                  <div className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100 hover:shadow-md hover:scale-[1.02] transition-all duration-300 text-center flex flex-col justify-between h-28">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <BookOpen className="w-3.5 h-3.5 text-indigo-505" />
                                      <span className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest">Điểm Ngữ văn</span>
                                    </div>
                                    <span className="text-3xl font-black text-slate-800 leading-none">
                                      {literatureVal !== null && literatureVal !== undefined ? literatureVal : "—"}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold">Thang điểm 10</span>
                                  </div>

                                  {/* English Written Card */}
                                  <div className="bg-sky-50/20 p-4 rounded-2xl border border-sky-100 hover:shadow-md hover:scale-[1.02] transition-all duration-300 text-center flex flex-col justify-between h-28">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <PenTool className="w-3.5 h-3.5 text-sky-505" />
                                      <span className="block text-[10px] font-black text-sky-600 uppercase tracking-widest">Tiếng Anh viết</span>
                                    </div>
                                    <span className="text-3xl font-black text-slate-800 leading-none">
                                      {writtenDisplay}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold">{isGrade1 ? "Thang điểm 10" : "Thang điểm 70"}</span>
                                  </div>

                                  {/* English Oral Card */}
                                  <div className="bg-sky-50/20 p-4 rounded-2xl border border-sky-100/50 hover:shadow-md hover:scale-[1.02] transition-all duration-300 text-center flex flex-col justify-between h-28">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Mic className="w-3.5 h-3.5 text-sky-505" />
                                      <span className="block text-[10px] font-black text-sky-600 uppercase tracking-widest">Tiếng Anh nói</span>
                                    </div>
                                    <span className="text-3xl font-black text-slate-800 leading-none">
                                      {oralDisplay}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold">{isGrade1 ? "Thang điểm 10" : "Thang điểm 30"}</span>
                                  </div>

                                  {/* Psychology Card */}
                                  <div className={`sm:${psychColorClass} p-4 rounded-2xl border hover:shadow-md hover:scale-[1.02] transition-all duration-300 text-center flex flex-col justify-between h-28`}>
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Brain className="w-3.5 h-3.5" />
                                      <span className="block text-[10px] font-black uppercase tracking-widest opacity-80">Điểm Tâm lý</span>
                                    </div>
                                    <span className="text-3xl font-black leading-none">
                                      {psychologyVal !== null && psychologyVal !== undefined ? psychologyVal : "—"}
                                    </span>
                                    {psychBadgeText ? (
                                      <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded bg-white/80 border border-current/15 truncate w-full text-center">
                                        {psychBadgeText}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] opacity-60 font-bold">Thang điểm 100</span>
                                    )}
                                  </div>
                                </div>

                                {/* 2. English Speaking Comment & Total English Score */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="md:col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-black text-sky-700 uppercase tracking-wider">Nhận xét Tiếng Anh Nói</span>
                                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                                    </div>
                                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                      {oralEnglishComment ? (
                                        <span className="italic">"${oralEnglishComment}"</span>
                                      ) : (
                                        <span className="text-slate-400 font-normal">Chưa có nhận xét Tiếng Anh Nói.</span>
                                      )}
                                    </p>
                                  </div>
                                  
                                  {totalScore !== null ? (
                                    <div className="bg-gradient-to-br from-indigo-50 to-sky-50 p-4 rounded-2xl border border-indigo-150 text-center flex flex-col justify-center items-center">
                                      <span className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest">Tổng điểm Tiếng Anh</span>
                                      <span className="text-2xl font-black text-indigo-700 mt-1 block">
                                        {totalScore}/100
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center flex flex-col justify-center text-slate-400 text-xs font-medium italic">
                                      Không áp dụng tổng điểm
                                    </div>
                                  )}
                                </div>

                                {/* 3. Detailed Psychology Section */}
                                {(psychologyConclusion || psychologyRecommendation) && (
                                  <div className="bg-gradient-to-br from-violet-50/20 via-indigo-50/10 to-transparent p-5 rounded-2xl border border-violet-100 text-left animate-fade-in">
                                    <div className="flex items-center gap-2 mb-3.5 border-b border-violet-100/50 pb-2">
                                      <Brain className="w-4 h-4 text-violet-650 animate-pulse" />
                                      <h5 className="text-xs font-black text-violet-855 uppercase tracking-wider">Chi tiết Đánh giá Tâm lý</h5>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {psychologyConclusion && (
                                        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-violet-100/30 shadow-sm">
                                          <span className="block text-[9.5px] font-black text-violet-600 uppercase tracking-wider mb-1.5">Chẩn đoán chuyên môn</span>
                                          <p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-wrap">{psychologyConclusion}</p>
                                        </div>
                                      )}
                                      {psychologyRecommendation && (
                                        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-violet-100/30 shadow-sm">
                                          <span className="block text-[9.5px] font-black text-indigo-600 uppercase tracking-wider mb-1.5">Khuyến nghị & Nhận xét</span>
                                          <p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-wrap">{psychologyRecommendation}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {detailsSubTab === "admin" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-[#00A99D]" />
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
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-[#00A99D]" />
                            Học bạ & Hồ sơ học tập
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học bạ tiểu học / THCS</label>
                              <span className="text-xs font-semibold text-slate-700 mt-1 block leading-relaxed whitespace-pre-wrap">{selectedStudent.kqgdTieuHoc || "-"}</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả học tập</label>
                              <span className="text-xs font-semibold text-slate-700 mt-1 block">{selectedStudent.kqHocTap || "-"}</span>
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
                          </div>
                        </div>

                        {/* Section: Final Approval Result */}
                        <div className="border-t border-slate-200 pt-6">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-[#00A99D]" />
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
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {detailsSubTab === "results" && (
                      <div className="space-y-6 animate-in fade-in duration-200">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-[#00A99D]" />
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
                          <Info className="w-4 h-4 text-[#00A99D]" />
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
                              <FileText className="w-4 h-4 text-[#00A99D]" />
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
                                <span className="text-xs font-black text-indigo-700 mt-1 block">
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
                            <Award className="w-4 h-4 text-[#00A99D]" />
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
            <div className="p-6 flex justify-between items-center text-xs font-semibold">
              <div>
                <h3 className="text-lg font-black text-slate-800">Đăng ký Khảo sát lại</h3>
                <p className="text-xs text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                  Học sinh: {retestStudent.fullName}
                </p>
              </div>
              <button
                onClick={() => setRetestStudent(null)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all text-xs font-semibold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Học sinh đã duyệt kết quả <span className="text-rose-600 font-bold">Không đạt - Kiểm tra lại</span>. 
                Thực hiện đăng ký học sinh vào một Kỳ/Đợt khảo sát mới để thi lại. 
                Mã học sinh <span className="font-bold text-indigo-600">({retestStudent.studentCode})</span> sẽ được giữ nguyên để đối chiếu lịch sử.
              </p>

              {/* Target Period selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kỳ khảo sát mới *</label>
                <select
                  value={retestPeriodId}
                  onChange={(e) => {
                    setRetestPeriodId(e.target.value);
                    setRetestBatchId("");
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none bg-white cursor-pointer font-semibold"
                >
                  <option value="">-- Chọn Kỳ khảo sát mới --</option>
                  {generalPeriods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Target Batch selection */}
              {retestPeriodId && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đợt khảo sát mới</label>
                  <select
                    value={retestBatchId}
                    onChange={(e) => setRetestBatchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none bg-white cursor-pointer font-semibold"
                  >
                    <option value="">-- Chọn Đợt khảo sát mới (Tất cả / Lẻ) --</option>
                    {(generalPeriods.find(p => p.id === retestPeriodId)?.batches || [])
                      .filter((b: any) => b.id !== retestStudent.batchId && b.status === "ACTIVE")
                      .map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-4 flex justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                disabled={retestRegisterLoading}
                onClick={() => setRetestStudent(null)}
                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={retestRegisterLoading || !retestPeriodId}
                onClick={handleRegisterRetest}
                className="flex items-center gap-1.5 hover:bg-indigo-700 text-white text-xs font-bold shadow-none transition-all active:scale-95 cursor-pointer disabled:opacity-50 text-xs font-semibold"
              >
                {retestRegisterLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
