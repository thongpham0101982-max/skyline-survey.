"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Globe,
  FileSpreadsheet,
  Users,
  Download,
  Upload,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  ChevronRight,
  Search,
  BookOpen,
  Filter,
  Sparkles,
  Layers,
  Award,
  CheckSquare,
  Square,
  UserCheck,
  Trash2,
  ArrowUpRight,
  Building2,
  Mail,
  Send,
  X,
  BarChart3,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { CTQT_LEVEL_CONFIGS, detectCtqtLevel, CORE_COMPETENCIES_DEF, compareCtqtClasses } from "@/lib/ctqt/config";
import { CtqtGradeProgressTab } from "./grade-progress-tab";

interface Props {
  academicYears: any[];
  activeYearId: string;
  campuses: any[];
  departments?: any[];
  teachers: any[];
  initialClasses: any[];
}

function resolveClientTeacherEmail(teacher?: {
  email?: string | null;
  user?: { email?: string | null } | null;
} | null): string | null {
  const candidates = [teacher?.email, teacher?.user?.email];
  for (const raw of candidates) {
    const val = (raw || "").trim();
    if (!val) continue;
    if (val.includes("@")) return val;
    if (/^[a-zA-Z0-9._-]+$/.test(val) && !/^\d+$/.test(val)) {
      return `${val}@skylineschool.edu.vn`;
    }
  }
  return null;
}

function normalizeDeptText(str?: string | null): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim();
}

function isEnglishDivisionDepartment(
  dept?: { code?: string | null; name?: string | null; divisionCode?: string | null } | null
): boolean {
  if (!dept) return false;
  const div = (dept.divisionCode || "").toUpperCase().trim();
  if (div === "BP_TA_CTQT" || div.includes("TA_CTQT") || div.includes("TIENG_ANH") || div === "BP_TA") {
    return true;
  }
  const normName = normalizeDeptText(dept.name);
  const normCode = normalizeDeptText(dept.code);
  const keywords = [
    "tieng anh",
    "anh van",
    "ngoai ngu",
    "gvnn",
    "nuoc ngoai",
    "esl",
    "expat",
    "ctqt",
    "quoc te",
    "ielts",
    "english",
    "bilingual",
    "cambridge",
  ];
  if (keywords.some(kw => normName.includes(kw) || normCode.includes(kw))) {
    return true;
  }
  if (/^(ta|to[_-\s]?ta)([_-\s]|$)/i.test(normCode) || /\bto\s+ta\b/i.test(normName)) {
    return true;
  }
  return false;
}

export function DiemCtqtAdminClient({
  academicYears,
  activeYearId,
  campuses,
  departments = [],
  teachers,
  initialClasses,
}: Props) {
  const [selectedYearId, setSelectedYearId] = useState(activeYearId || (academicYears[0]?.id || ""));
  const [selectedSemester, setSelectedSemester] = useState(2); // Default to HK2 as seen in screenshots
  const [selectedCampusId, setSelectedCampusId] = useState("");
  const [activeTab, setActiveTab] = useState<
    "subject_gradebook" | "consolidated" | "assignments" | "grade_progress" | "excel" | "report_card"
  >("subject_gradebook");
  const [progressPresetSearch, setProgressPresetSearch] = useState<string>("");

  // Subject Gradebook Tab state
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>("ENG");
  const [subjectTeacherId, setSubjectTeacherId] = useState<string>("");
  const [subjectDelegatedTeacherId, setSubjectDelegatedTeacherId] = useState<string>("");
  const [subjectAssignmentStatus, setSubjectAssignmentStatus] = useState<string>("DRAFT");
  const [savingSubjectAssignment, setSavingSubjectAssignment] = useState(false);
  const [subjectGrades, setSubjectGrades] = useState<Record<string, any>>({});

  // Selected class for consolidated view & Excel
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClasses[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedClass = initialClasses.find(c => c.id === selectedClassId);
  const currentLevel = selectedClass ? detectCtqtLevel(selectedClass.className, selectedClass.grade, selectedClass.level) : "PRIMARY";
  const currentConfig = CTQT_LEVEL_CONFIGS[currentLevel] || CTQT_LEVEL_CONFIGS.PRIMARY;

  // Assignment tab state
  const [assignmentClasses, setAssignmentClasses] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);

  // Multi-class & Bulk Assignment Builder state
  const [assignmentViewMode, setAssignmentViewMode] = useState<"matrix" | "by_teacher">("matrix");
  const [assignRoleMode, setAssignRoleMode] = useState<"BOTH" | "PRIMARY_ONLY" | "DELEGATED_ONLY">("PRIMARY_ONLY");
  const [bulkPrimaryTeacherId, setBulkPrimaryTeacherId] = useState<string>("");
  const [bulkDelegatedTeacherId, setBulkDelegatedTeacherId] = useState<string>("");
  const [bulkSubjectCodes, setBulkSubjectCodes] = useState<string[]>(["ALL"]);
  const [selectedBulkClassIds, setSelectedBulkClassIds] = useState<string[]>([]);
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [isMultiClassDropdownOpen, setIsMultiClassDropdownOpen] = useState<boolean>(false);

  // Filters for Assignment Tab & BP Tiếng Anh Department Scope
  const [assignLevelFilter, setAssignLevelFilter] = useState<string>("ALL");
  const [assignStatusFilter, setAssignStatusFilter] = useState<string>("ALL");
  const [assignClassFilterId, setAssignClassFilterId] = useState<string>("");
  const [assignClassSearch, setAssignClassSearch] = useState<string>("");
  const [teacherDeptScope, setTeacherDeptScope] = useState<string>("ALL_BP_TA"); // "ALL_BP_TA" | <deptId> | "ALL_SCHOOL"
  const [teacherFilterCampusId, setTeacherFilterCampusId] = useState<string>("");
  const [teacherSearchQuery, setTeacherSearchQuery] = useState<string>("");
  const [showOnlyAssignedTeachers, setShowOnlyAssignedTeachers] = useState<boolean>(false);

  // Email notification states
  const [sendEmailOnBulkAssign, setSendEmailOnBulkAssign] = useState<boolean>(false);
  const [sendingSubjectEmail, setSendingSubjectEmail] = useState<boolean>(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [sendingEmails, setSendingEmails] = useState<boolean>(false);
  const [emailScopeMode, setEmailScopeMode] = useState<"ALL_ASSIGNED" | "SELECTED_CLASSES" | "SELECTED_TEACHERS">("ALL_ASSIGNED");
  const [emailRoleScope, setEmailRoleScope] = useState<"BOTH" | "PRIMARY_ONLY" | "DELEGATED_ONLY">("PRIMARY_ONLY");
  const [selectedEmailTeacherIds, setSelectedEmailTeacherIds] = useState<string[]>([]);
  const [emailCustomMessage, setEmailCustomMessage] = useState<string>("");
  const [emailModalSearch, setEmailModalSearch] = useState<string>("");

  // Consolidated tab state
  const [consolidatedData, setConsolidatedData] = useState<any>(null);
  const [loadingConsolidated, setLoadingConsolidated] = useState(false);
  const [savingGrades, setSavingGrades] = useState(false);

  // Excel tab state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [importStats, setImportStats] = useState<any>(null);

  // Report Card generating
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Sorted initial classes filtered by selected academic year (Grade 1 -> 12)
  const sortedInitialClasses = useMemo(() => {
    const yearMatched = initialClasses.filter(
      (c: any) => !selectedYearId || !c.academicYearId || c.academicYearId === selectedYearId
    );
    const baseList = yearMatched.length > 0 ? yearMatched : initialClasses;
    return [...baseList].sort(compareCtqtClasses);
  }, [initialClasses, selectedYearId]);

  // Count of CTQT classes per campus
  const campusClassCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const sourceList = assignmentClasses.length > 0 ? assignmentClasses : sortedInitialClasses;
    sourceList.forEach(c => {
      if (c.campusId) {
        counts.set(c.campusId, (counts.get(c.campusId) || 0) + 1);
      }
    });
    return {
      byCampusId: counts,
      total: sourceList.length,
    };
  }, [assignmentClasses, sortedInitialClasses]);

  // Filtered classes by campus
  const filteredClasses = useMemo(() => {
    return sortedInitialClasses.filter(c => {
      const matchCampus = !selectedCampusId || c.campusId === selectedCampusId;
      const matchSearch = !searchQuery || c.className.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCampus && matchSearch;
    });
  }, [sortedInitialClasses, selectedCampusId, searchQuery]);

  // Keep selectedClassId and assignClassFilterId valid when campus changes
  useEffect(() => {
    if (filteredClasses.length > 0 && !filteredClasses.some(c => c.id === selectedClassId)) {
      setSelectedClassId(filteredClasses[0].id);
    }
    if (assignClassFilterId && !filteredClasses.some(c => c.id === assignClassFilterId)) {
      setAssignClassFilterId("");
    }
  }, [filteredClasses, selectedClassId, assignClassFilterId]);

  // Helper to render <optgroup> grouped by Cấp học (Tiểu học, THCS, THPT) for Class dropdowns
  const renderGroupedClassOptions = (
    classesList: any[],
    opts?: { idKey?: "id" | "classId"; showTickedSet?: Set<string> }
  ) => {
    const idKey = opts?.idKey || "id";
    const tickedSet = opts?.showTickedSet;
    const groups: { level: "PRIMARY" | "MIDDLE" | "HIGH"; label: string; items: any[] }[] = [
      { level: "PRIMARY", label: "Tiểu học (Khối 1 - 5)", items: [] },
      { level: "MIDDLE", label: "THCS (Khối 6 - 9)", items: [] },
      { level: "HIGH", label: "THPT (Khối 10 - 12)", items: [] },
    ];

    const sorted = [...classesList].sort(compareCtqtClasses);
    sorted.forEach(c => {
      const lv = c.level && (c.level === "PRIMARY" || c.level === "MIDDLE" || c.level === "HIGH")
        ? c.level
        : detectCtqtLevel(c.className, c.grade, c.level);
      const grp = groups.find(g => g.level === lv) || groups[0];
      grp.items.push(c);
    });

    return (
      <>
        {groups
          .filter(g => g.items.length > 0)
          .map(g => (
            <optgroup key={g.level} label={`${g.label} (${g.items.length} lớp)`}>
              {g.items.map(c => {
                const cId = c[idKey] || c.id || c.classId;
                const campusLabel = c.campusName || c.campus?.campusName || c.campus?.campusCode || "";
                const isTicked = tickedSet?.has(cId);
                const hasExplicitSysTag = /INT|UK/i.test(c.className || "");
                const gradeHint = !hasExplicitSysTag && c.grade ? ` • Khối ${c.grade} INT` : "";
                return (
                  <option key={cId} value={cId}>
                    {isTicked ? "✓ " : ""}
                    {c.className}
                    {gradeHint}
                    {campusLabel ? ` (${campusLabel})` : ""}
                  </option>
                );
              })}
            </optgroup>
          ))}
      </>
    );
  };

  // Load assignments when on assignment tab or dependencies change
  const fetchAssignments = async () => {
    if (!selectedYearId) return;
    setLoadingAssignments(true);
    try {
      const res = await fetch(
        `/api/admin/ctqt/assignments?academicYearId=${selectedYearId}&semester=${selectedSemester}`
      );
      const data = await res.json();
      if (data.success) {
        const sortedData = [...(data.data || [])].sort(compareCtqtClasses);
        setAssignmentClasses(sortedData);
      } else {
        toast.error(data.error || "Không thể tải phân công");
      }
    } catch (e: any) {
      toast.error("Lỗi kết nối khi tải phân công");
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    if (activeTab === "assignments") {
      fetchAssignments();
    }
  }, [activeTab, selectedYearId, selectedSemester]);

  // Load consolidated grades when selectedClassId or semester changes
  const fetchConsolidatedGrades = async () => {
    if (!selectedClassId || !selectedYearId) return;
    setLoadingConsolidated(true);
    try {
      const res = await fetch(
        `/api/admin/ctqt/grades?classId=${selectedClassId}&academicYearId=${selectedYearId}&semester=${selectedSemester}`
      );
      const data = await res.json();
      if (data.success) {
        setConsolidatedData(data.data);
      } else {
        toast.error(data.error || "Không thể tải sổ điểm tổng hợp");
      }
    } catch {
      toast.error("Lỗi kết nối khi tải sổ điểm");
    } finally {
      setLoadingConsolidated(false);
    }
  };

  useEffect(() => {
    if (selectedClassId && (activeTab === "subject_gradebook" || activeTab === "consolidated" || activeTab === "report_card")) {
      fetchConsolidatedGrades();
    }
  }, [selectedClassId, selectedYearId, selectedSemester, activeTab]);

  // Save Assignment changes
  const handleSaveAssignments = async () => {
    setSavingAssignments(true);
    try {
      const payload: any[] = [];
      assignmentClasses.forEach(cls => {
        cls.subjects.forEach((sub: any) => {
          payload.push({
            classId: cls.classId,
            subjectCode: sub.code,
            primaryTeacherId: sub.primaryTeacherId,
            delegatedTeacherId: sub.delegatedTeacherId,
          });
        });
      });

      const res = await fetch("/api/admin/ctqt/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          semester: selectedSemester,
          assignments: payload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Đã lưu phân công thành công!");
        fetchAssignments();
      } else {
        toast.error(data.error || "Lỗi lưu phân công");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSavingAssignments(false);
    }
  };

  // Clone from Semester 1 to Semester 2
  const handleCloneAssignments = async () => {
    if (!confirm(`Sao chép toàn bộ phân công từ Học kỳ 1 sang Học kỳ 2?`)) return;
    try {
      const res = await fetch("/api/admin/ctqt/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clone",
          academicYearId: selectedYearId,
          sourceSemester: 1,
          targetSemester: 2,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchAssignments();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Lỗi kết nối");
    }
  };

  // Identify all Departments belonging to BP Tiếng Anh (BP_TA_CTQT)
  const englishDepartments = useMemo(() => {
    const fromProps = (departments || []).filter(d => isEnglishDivisionDepartment(d));
    if (fromProps.length > 0) return fromProps;

    // Fallback: extract from teachers' department relations if departments prop is empty
    const fallbackMap = new Map<string, any>();
    teachers.forEach(t => {
      if (t.departmentRel && isEnglishDivisionDepartment(t.departmentRel)) {
        fallbackMap.set(t.departmentRel.id, t.departmentRel);
      }
      (t.departmentAssignments || []).forEach((da: any) => {
        if (da.department && isEnglishDivisionDepartment(da.department)) {
          fallbackMap.set(da.department.id, da.department);
        }
      });
    });
    return Array.from(fallbackMap.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [departments, teachers]);

  const englishDeptIdSet = useMemo(() => new Set(englishDepartments.map(d => d.id)), [englishDepartments]);

  const otherDepartments = useMemo(() => {
    return (departments || []).filter(d => !englishDeptIdSet.has(d.id));
  }, [departments, englishDeptIdSet]);

  // Enrich teachers with full Tổ chuyên môn & BP Tiếng Anh (BP_TA_CTQT) membership
  const enrichedTeachers = useMemo(() => {
    return teachers.map(t => {
      const deptMap = new Map<string, { id: string; name: string; code: string; divisionCode?: string | null }>();
      if (t.departmentRel?.id) {
        deptMap.set(t.departmentRel.id, {
          id: t.departmentRel.id,
          name: t.departmentRel.name || "",
          code: t.departmentRel.code || "",
          divisionCode: t.departmentRel.divisionCode,
        });
      }
      (t.departmentAssignments || []).forEach((da: any) => {
        const d = da.department;
        if (d?.id) {
          deptMap.set(d.id, {
            id: d.id,
            name: d.name || "",
            code: d.code || "",
            divisionCode: d.divisionCode,
          });
        }
      });

      const allDepts = Array.from(deptMap.values());
      const engDepts = allDepts.filter(d => englishDeptIdSet.has(d.id) || isEnglishDivisionDepartment(d));
      const isTbpEnglish = (t.divisionAssignments || []).some((div: any) => {
        const code = (div.divisionCode || "").toUpperCase();
        return code === "BP_TA_CTQT" || code.includes("TA_CTQT") || code.includes("TIENG_ANH");
      });

      return {
        ...t,
        resolvedEmail: resolveClientTeacherEmail(t),
        allDepts,
        allDeptIds: allDepts.map(d => d.id),
        allDeptNames: allDepts.map(d => d.name).filter(Boolean),
        englishDepts: engDepts,
        englishDeptIds: engDepts.map(d => d.id),
        englishDeptNames: engDepts.map(d => d.name).filter(Boolean),
        isInEnglishDivision: engDepts.length > 0 || isTbpEnglish,
      };
    });
  }, [teachers, englishDeptIdSet]);

  // Count of teachers per department for clear UI badges
  const deptTeacherCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let totalEnglishDivCount = 0;
    enrichedTeachers.forEach(t => {
      if (t.isInEnglishDivision) totalEnglishDivCount++;
      t.allDeptIds.forEach((dId: string) => {
        counts.set(dId, (counts.get(dId) || 0) + 1);
      });
    });
    return { byDeptId: counts, totalEnglishDivCount };
  }, [enrichedTeachers]);

  // Teachers scoped by selected Tổ chuyên môn (defaults to BP Tiếng Anh)
  const scopedTeachers = useMemo(() => {
    const hasEnglishSetup = deptTeacherCounts.totalEnglishDivCount > 0;
    return enrichedTeachers.filter(t => {
      if (!hasEnglishSetup || teacherDeptScope === "ALL_SCHOOL") return true;
      if (teacherDeptScope === "ALL_BP_TA") return t.isInEnglishDivision;
      return t.allDeptIds.includes(teacherDeptScope);
    });
  }, [enrichedTeachers, teacherDeptScope, deptTeacherCounts.totalEnglishDivCount]);

  // Filtered teachers for the assignment panel & teacher view (adds campus + search query)
  const filteredTeachersForAssign = useMemo(() => {
    const q = teacherSearchQuery.trim().toLowerCase();
    return scopedTeachers.filter(t => {
      if (teacherFilterCampusId && t.campusId !== teacherFilterCampusId) return false;
      if (q) {
        const nameMatch = (t.teacherName || "").toLowerCase().includes(q);
        const codeMatch = (t.teacherCode || "").toLowerCase().includes(q);
        const deptMatch = t.allDeptNames.some((n: string) => n.toLowerCase().includes(q));
        if (!nameMatch && !codeMatch && !deptMatch) return false;
      }
      return true;
    });
  }, [scopedTeachers, teacherFilterCampusId, teacherSearchQuery]);

  // Helper to render <optgroup> grouped by Tổ chuyên môn thuộc BP Tiếng Anh
  const renderGroupedTeacherOptions = (currentSelectedId?: string | null, useBulkFiltered = false) => {
    const baseList = useBulkFiltered ? filteredTeachersForAssign : scopedTeachers;
    const baseIdSet = new Set(baseList.map(t => t.id));
    const currentOutside =
      currentSelectedId && currentSelectedId !== "__HOMEROOM__" && !baseIdSet.has(currentSelectedId)
        ? enrichedTeachers.find(t => t.id === currentSelectedId)
        : null;

    // Group baseList by Tổ chuyên môn (prioritizing English Division departments)
    const groups = new Map<string, { label: string; list: any[] }>();
    const targetDepts =
      teacherDeptScope !== "ALL_BP_TA" && teacherDeptScope !== "ALL_SCHOOL"
        ? [...englishDepartments, ...otherDepartments].filter(d => d.id === teacherDeptScope)
        : teacherDeptScope === "ALL_BP_TA" && englishDepartments.length > 0
        ? englishDepartments
        : [...englishDepartments, ...otherDepartments];

    targetDepts.forEach(d => {
      groups.set(d.id, { label: d.name, list: [] });
    });

    const ungrouped: any[] = [];
    baseList.forEach(t => {
      let placed = false;
      // Place into matching target department(s) (primary English dept first so no duplicates in <select>)
      const preferredDeptId =
        t.englishDeptIds.find((id: string) => groups.has(id)) ||
        t.allDeptIds.find((id: string) => groups.has(id));
      if (preferredDeptId && groups.has(preferredDeptId)) {
        groups.get(preferredDeptId)!.list.push(t);
        placed = true;
      }
      if (!placed) {
        ungrouped.push(t);
      }
    });

    const nonEmptyGroups = Array.from(groups.entries()).filter(([, g]) => g.list.length > 0);

    return (
      <>
        {currentOutside && (
          <optgroup label="Đang phân công hiện tại (ngoài bộ lọc)">
            <option value={currentOutside.id}>
              {currentOutside.teacherName} ({currentOutside.teacherCode})
              {currentOutside.allDeptNames[0] ? ` • ${currentOutside.allDeptNames[0]}` : ""}
            </option>
          </optgroup>
        )}
        {nonEmptyGroups.map(([gId, g]) => (
          <optgroup key={gId} label={`${g.label} (${g.list.length} GV)`}>
            {g.list.map(t => (
              <option key={t.id} value={t.id}>
                {t.teacherName} ({t.teacherCode}){t.campus?.campusCode ? ` • ${t.campus.campusCode}` : ""}
              </option>
            ))}
          </optgroup>
        ))}
        {ungrouped.length > 0 && (
          <optgroup label={nonEmptyGroups.length > 0 ? `Trực thuộc BP Tiếng Anh / Khác (${ungrouped.length} GV)` : `Danh sách giáo viên (${ungrouped.length} GV)`}>
            {ungrouped.map(t => (
              <option key={t.id} value={t.id}>
                {t.teacherName} ({t.teacherCode}){t.campus?.campusCode ? ` • ${t.campus.campusCode}` : ""}
              </option>
            ))}
          </optgroup>
        )}
      </>
    );
  };

  // All unique subjects across CTQT levels
  const allCtqtSubjectOptions = useMemo(() => {
    const map = new Map<string, { code: string; nameVi: string; nameEn: string; levels: string[] }>();
    Object.values(CTQT_LEVEL_CONFIGS).forEach(cfg => {
      cfg.subjects.forEach(s => {
        const existing = map.get(s.code);
        if (existing) {
          if (!existing.levels.includes(cfg.level)) existing.levels.push(cfg.level);
        } else {
          map.set(s.code, {
            code: s.code,
            nameVi: s.nameVi,
            nameEn: s.nameEn,
            levels: [cfg.level],
          });
        }
      });
    });
    return Array.from(map.values());
  }, []);

  // Classes filtered by selectedCampusId in Tab 3
  const campusFilteredAssignmentClasses = useMemo(() => {
    return assignmentClasses
      .filter(cls => !selectedCampusId || cls.campusId === selectedCampusId)
      .sort(compareCtqtClasses);
  }, [assignmentClasses, selectedCampusId]);

  // Count of CTQT classes per level (within selected campus)
  const levelClassCounts = useMemo(() => {
    let primary = 0;
    let middle = 0;
    let high = 0;
    campusFilteredAssignmentClasses.forEach(cls => {
      if (cls.level === "PRIMARY") primary++;
      else if (cls.level === "MIDDLE") middle++;
      else if (cls.level === "HIGH") high++;
    });
    return {
      PRIMARY: primary,
      MIDDLE: middle,
      HIGH: high,
      ALL: campusFilteredAssignmentClasses.length,
    };
  }, [campusFilteredAssignmentClasses]);

  // Classes filtered by selectedCampusId + assignLevelFilter (for Class dropdowns in Tab 3)
  const levelFilteredAssignmentClasses = useMemo(() => {
    if (assignLevelFilter === "ALL") return campusFilteredAssignmentClasses;
    return campusFilteredAssignmentClasses.filter(cls => cls.level === assignLevelFilter);
  }, [campusFilteredAssignmentClasses, assignLevelFilter]);

  // Filtered assignment classes in Tab 3 (Campus + Specific Class + Level + Status + Search)
  const visibleAssignmentClasses = useMemo(() => {
    const q = assignClassSearch.trim().toLowerCase();
    return campusFilteredAssignmentClasses.filter(cls => {
      if (assignClassFilterId && cls.classId !== assignClassFilterId) return false;
      if (assignLevelFilter !== "ALL" && cls.level !== assignLevelFilter) return false;

      const totalSubs = cls.subjects.length;
      const primaryCount = cls.subjects.filter((s: any) => Boolean(s.primaryTeacherId)).length;

      if (assignStatusFilter === "COMPLETE" && primaryCount < totalSubs) return false;
      if (assignStatusFilter === "MISSING_PRIMARY" && primaryCount === totalSubs) return false;

      if (q) {
        const matchClass = (cls.className || "").toLowerCase().includes(q);
        const matchGrade =
          Boolean(cls.grade) &&
          (`khối ${cls.grade}`.includes(q) ||
            `khoi ${cls.grade}`.includes(q) ||
            `lớp ${cls.grade}`.includes(q) ||
            `lop ${cls.grade}`.includes(q) ||
            `${cls.grade}int` === q ||
            `${cls.grade}uk` === q);
        const matchCampus = (cls.campusName || "").toLowerCase().includes(q);
        const matchTeacher = cls.subjects.some((s: any) => {
          const pT = teachers.find(t => t.id === s.primaryTeacherId);
          return (
            (pT?.teacherName || "").toLowerCase().includes(q) ||
            (pT?.teacherCode || "").toLowerCase().includes(q)
          );
        });
        if (!matchClass && !matchGrade && !matchCampus && !matchTeacher) return false;
      }

      return true;
    });
  }, [campusFilteredAssignmentClasses, assignClassFilterId, assignLevelFilter, assignStatusFilter, assignClassSearch, teachers]);

  // Overall assignment statistics for the Ledger Strip
  const assignmentLedgerStats = useMemo(() => {
    const totalClassCount = campusFilteredAssignmentClasses.length;
    let totalSlots = 0;
    let assignedPrimary = 0;
    let assignedDelegated = 0;
    let fullyAssignedClasses = 0;

    campusFilteredAssignmentClasses.forEach(cls => {
      let clsComplete = cls.subjects.length > 0;
      cls.subjects.forEach((sub: any) => {
        totalSlots++;
        if (sub.primaryTeacherId) {
          assignedPrimary++;
        } else {
          clsComplete = false;
        }
        if (sub.delegatedTeacherId) {
          assignedDelegated++;
        }
      });
      if (clsComplete) fullyAssignedClasses++;
    });

    return {
      totalClassCount,
      totalSlots,
      assignedPrimary,
      assignedDelegated,
      unassignedPrimary: Math.max(0, totalSlots - assignedPrimary),
      unassignedDelegated: Math.max(0, totalSlots - assignedDelegated),
      fullyAssignedClasses,
    };
  }, [campusFilteredAssignmentClasses]);

  // Teacher-centric workload summary for "Theo giáo viên" mode
  const teacherWorkloadList = useMemo(() => {
    const teacherMap = new Map<
      string,
      {
        teacher: any;
        primaryItems: { classId: string; className: string; campusName: string; subjects: string[] }[];
        delegatedItems: { classId: string; className: string; campusName: string; subjects: string[] }[];
        totalPrimarySlots: number;
        totalDelegatedSlots: number;
      }
    >();

    filteredTeachersForAssign.forEach(t => {
      teacherMap.set(t.id, {
        teacher: t,
        primaryItems: [],
        delegatedItems: [],
        totalPrimarySlots: 0,
        totalDelegatedSlots: 0,
      });
    });

    assignmentClasses.forEach(cls => {
      cls.subjects.forEach((sub: any) => {
        if (sub.primaryTeacherId && teacherMap.has(sub.primaryTeacherId)) {
          const entry = teacherMap.get(sub.primaryTeacherId)!;
          entry.totalPrimarySlots++;
          let clsGroup = entry.primaryItems.find(x => x.classId === cls.classId);
          if (!clsGroup) {
            clsGroup = { classId: cls.classId, className: cls.className, campusName: cls.campusName, subjects: [] };
            entry.primaryItems.push(clsGroup);
          }
          clsGroup.subjects.push(sub.code);
        }
      });
    });

    let list = Array.from(teacherMap.values());
    if (showOnlyAssignedTeachers) {
      list = list.filter(item => item.totalPrimarySlots > 0);
    }
    return list.sort((a, b) => {
      if (b.totalPrimarySlots !== a.totalPrimarySlots) return b.totalPrimarySlots - a.totalPrimarySlots;
      return (a.teacher.teacherName || "").localeCompare(b.teacher.teacherName || "");
    });
  }, [filteredTeachersForAssign, assignmentClasses, showOnlyAssignedTeachers]);

  // Toggle a single class in bulk selection
  const toggleBulkClassSelection = (classId: string) => {
    setSelectedBulkClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  // Toggle all classes of a specific level (Tiểu học / THCS / THPT)
  const toggleLevelClassesSelection = (level: "PRIMARY" | "MIDDLE" | "HIGH") => {
    const levelIds = campusFilteredAssignmentClasses
      .filter(c => c.level === level)
      .map(c => c.classId);
    if (levelIds.length === 0) return;
    const allSelected = levelIds.every(id => selectedBulkClassIds.includes(id));
    if (allSelected) {
      setSelectedBulkClassIds(prev => prev.filter(id => !levelIds.includes(id)));
    } else {
      setSelectedBulkClassIds(prev => Array.from(new Set([...prev, ...levelIds])));
    }
  };

  // Toggle all currently visible classes
  const toggleSelectAllVisibleClasses = () => {
    const visibleIds = visibleAssignmentClasses.map(c => c.classId);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedBulkClassIds.includes(id));
    if (allSelected) {
      setSelectedBulkClassIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedBulkClassIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Select classes by quick condition
  const selectClassesByCondition = (condition: "MISSING_PRIMARY" | "PRIMARY" | "MIDDLE" | "HIGH") => {
    const matchedIds = visibleAssignmentClasses
      .filter(cls => {
        if (condition === "MISSING_PRIMARY") {
          return cls.subjects.some((s: any) => !s.primaryTeacherId);
        }
        return cls.level === condition;
      })
      .map(c => c.classId);

    if (matchedIds.length === 0) {
      toast("Không có lớp nào khớp điều kiện trong danh sách đang lọc.");
      return;
    }
    setSelectedBulkClassIds(Array.from(new Set([...selectedBulkClassIds, ...matchedIds])));
  };

  // Toggle subject code in bulk assignment builder
  const toggleBulkSubjectCode = (code: string) => {
    if (code === "ALL") {
      setBulkSubjectCodes(["ALL"]);
      return;
    }
    setBulkSubjectCodes(prev => {
      const withoutAll = prev.filter(c => c !== "ALL");
      if (withoutAll.includes(code)) {
        const next = withoutAll.filter(c => c !== code);
        return next.length === 0 ? ["ALL"] : next;
      } else {
        return [...withoutAll, code];
      }
    });
  };

  // Execute Bulk Assignment for 1 or multiple selected classes
  const handleExecuteBulkAssign = async (clearMode = false) => {
    if (selectedBulkClassIds.length === 0) {
      toast.error("Vui lòng tích chọn ít nhất 1 lớp học ở danh sách để gán phân công.");
      return;
    }

    if (!clearMode) {
      if (!bulkPrimaryTeacherId) {
        toast.error("Vui lòng chọn Giáo viên bộ môn (GVBM) ở Bước 1 trước khi gán.");
        return;
      }
    } else {
      if (!confirm(`Xác nhận gỡ phân công các môn đang chọn cho ${selectedBulkClassIds.length} lớp đã đánh dấu?`)) {
        return;
      }
    }

    setApplyingBulk(true);
    try {
      const res = await fetch("/api/admin/ctqt/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_assign",
          academicYearId: selectedYearId,
          semester: selectedSemester,
          classIds: selectedBulkClassIds,
          subjectCodes: bulkSubjectCodes,
          primaryTeacherId: bulkPrimaryTeacherId || null,
          delegatedTeacherId: null,
          updatePrimary: true,
          updateDelegated: false,
          clearAssignments: clearMode,
          sendNotificationEmail: !clearMode && sendEmailOnBulkAssign,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Đã cập nhật phân công cho ${selectedBulkClassIds.length} lớp!`);
        await fetchAssignments();
        if (selectedClassId && selectedBulkClassIds.includes(selectedClassId)) {
          fetchConsolidatedGrades();
        }
      } else {
        toast.error(data.error || "Không thể áp dụng phân công hàng loạt");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ khi lưu phân công");
    } finally {
      setApplyingBulk(false);
    }
  };

  // Prefill the Multi-class Builder from an existing subject slot or from Tab 1
  const handleQuickPrefillMultiClass = (opts: {
    subjectCode?: string;
    primaryTeacherId?: string | null;
    delegatedTeacherId?: string | null;
    classIds?: string[];
    roleMode?: "BOTH" | "PRIMARY_ONLY" | "DELEGATED_ONLY";
  }) => {
    if (opts.subjectCode) {
      setBulkSubjectCodes([opts.subjectCode]);
    } else {
      setBulkSubjectCodes(["ALL"]);
    }
    setAssignRoleMode("PRIMARY_ONLY");
    if (opts.primaryTeacherId !== undefined) {
      setBulkPrimaryTeacherId(opts.primaryTeacherId || "");
    }
    if (opts.classIds && opts.classIds.length > 0) {
      setSelectedBulkClassIds(opts.classIds);
    }
    setIsMultiClassDropdownOpen(true);
    setActiveTab("assignments");
    setAssignmentViewMode("matrix");
    toast.success("Đã nạp Giáo viên & Môn học vào Bảng gán nhiều lớp. Hãy tích chọn các lớp cần gán và nhấn Áp dụng!");
  };

  // List of teachers who currently have assignments in the selected scope for Email Notification Modal
  const emailCandidateTeachers = useMemo(() => {
    const targetClasses =
      emailScopeMode === "SELECTED_CLASSES" && selectedBulkClassIds.length > 0
        ? assignmentClasses.filter(c => selectedBulkClassIds.includes(c.classId))
        : assignmentClasses;

    const map = new Map<
      string,
      {
        teacher: any;
        primaryClasses: { className: string; subjects: string[] }[];
        delegatedClasses: { className: string; subjects: string[] }[];
        primarySlotCount: number;
        delegatedSlotCount: number;
      }
    >();

    targetClasses.forEach(cls => {
      cls.subjects.forEach((sub: any) => {
        if (sub.primaryTeacherId) {
          const tObj = enrichedTeachers.find(t => t.id === sub.primaryTeacherId);
          if (tObj) {
            if (!map.has(tObj.id)) {
              map.set(tObj.id, {
                teacher: tObj,
                primaryClasses: [],
                delegatedClasses: [],
                primarySlotCount: 0,
                delegatedSlotCount: 0,
              });
            }
            const entry = map.get(tObj.id)!;
            entry.primarySlotCount++;
            let cg = entry.primaryClasses.find(x => x.className === cls.className);
            if (!cg) {
              cg = { className: cls.className, subjects: [] };
              entry.primaryClasses.push(cg);
            }
            if (!cg.subjects.includes(sub.code)) cg.subjects.push(sub.code);
          }
        }
      });
    });

    const q = emailModalSearch.trim().toLowerCase();
    return Array.from(map.values())
      .filter(item => {
        if (!q) return true;
        const t = item.teacher;
        return (
          (t.teacherName || "").toLowerCase().includes(q) ||
          (t.teacherCode || "").toLowerCase().includes(q) ||
          (t.resolvedEmail || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.teacher.teacherName || "").localeCompare(b.teacher.teacherName || ""));
  }, [assignmentClasses, emailScopeMode, selectedBulkClassIds, enrichedTeachers, emailModalSearch]);

  // Open the Email Notification Modal (optionally pre-selecting specific teacher IDs)
  const handleOpenEmailModal = (presetTeacherIds?: string[]) => {
    setEmailModalSearch("");
    setEmailRoleScope("PRIMARY_ONLY");
    if (presetTeacherIds && presetTeacherIds.length > 0) {
      setEmailScopeMode("SELECTED_TEACHERS");
      setSelectedEmailTeacherIds(presetTeacherIds);
    } else if (selectedBulkClassIds.length > 0) {
      setEmailScopeMode("SELECTED_CLASSES");
      setSelectedEmailTeacherIds([]);
    } else {
      setEmailScopeMode("ALL_ASSIGNED");
      setSelectedEmailTeacherIds([]);
    }
    setIsEmailModalOpen(true);
  };

  // Send Assignment Notification Emails from Modal
  const handleSendAssignmentEmails = async () => {
    const targetTeacherIds =
      emailScopeMode === "SELECTED_TEACHERS"
        ? selectedEmailTeacherIds
        : emailCandidateTeachers.map(c => c.teacher.id);

    if (targetTeacherIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 giáo viên có phân công để gửi email.");
      return;
    }

    setSendingEmails(true);
    try {
      const res = await fetch("/api/admin/ctqt/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_email",
          academicYearId: selectedYearId,
          semester: selectedSemester,
          campusId: selectedCampusId || undefined,
          classIds:
            emailScopeMode === "SELECTED_CLASSES" && selectedBulkClassIds.length > 0
              ? selectedBulkClassIds
              : undefined,
          teacherIds: targetTeacherIds,
          roleScope: emailRoleScope,
          customMessage: emailCustomMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Đã gửi email thông báo đến ${data.sentCount} giáo viên!`);
        setIsEmailModalOpen(false);
      } else {
        toast.error(data.error || "Không thể gửi email thông báo phân công");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ khi gửi email");
    } finally {
      setSendingEmails(false);
    }
  };

  // Save & Send Email directly for the single subject on Tab 1
  const handleSendSingleSubjectEmail = async () => {
    if (!selectedClassId || !selectedSubjectCode) return;
    if (!subjectTeacherId) {
      toast.error("Vui lòng chọn Giáo viên bộ môn (GVBM) trước khi gửi email thông báo.");
      return;
    }

    setSendingSubjectEmail(true);
    try {
      // Save current subject assignment + trigger notification email in one call
      const res = await fetch("/api/admin/ctqt/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          semester: selectedSemester,
          sendNotificationEmail: true,
          assignments: [
            {
              classId: selectedClassId,
              subjectCode: selectedSubjectCode,
              primaryTeacherId: subjectTeacherId || null,
              delegatedTeacherId: subjectDelegatedTeacherId || null,
              status: subjectAssignmentStatus,
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Đã lưu và gửi email thông báo phân công cho giáo viên!");
        fetchConsolidatedGrades();
      } else {
        toast.error(data.error || "Không thể gửi email thông báo");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ khi gửi email");
    } finally {
      setSendingSubjectEmail(false);
    }
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    if (!selectedClassId) {
      toast.error("Vui lòng chọn lớp học");
      return;
    }
    const url = `/api/admin/ctqt/excel?classId=${selectedClassId}&academicYearId=${selectedYearId}&semester=${selectedSemester}`;
    window.open(url, "_blank");
  };

  // Upload Excel file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClassId) return;

    setUploadingFile(true);
    setImportStats(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("classId", selectedClassId);
      formData.append("academicYearId", selectedYearId);
      formData.append("semester", String(selectedSemester));

      const res = await fetch("/api/admin/ctqt/excel", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Đã nạp file Excel thành công!");
        setImportStats(data.stats);
        fetchConsolidatedGrades();
      } else {
        toast.error(data.error || "Lỗi nạp file");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  // Export PDF Report Cards (Single or All)
  const handleExportPdf = async (studentId?: string) => {
    if (!selectedClassId) return;
    setGeneratingPdf(true);
    try {
      const res = await fetch("/api/admin/ctqt/report-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          studentId,
          academicYearId: selectedYearId,
          semester: selectedSemester,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Lỗi xuất PDF" }));
        throw new Error(err.error || "Không thể xuất PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = studentId
        ? `ReportCard_HS_${studentId}.pdf`
        : `ReportCard_Lop_${selectedClass?.className || "CTQT"}_HK${selectedSemester}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Xuất Report Card thành công!");
    } catch (e: any) {
      toast.error(e.message || "Lỗi xuất Report Card");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const currentSubjectDef = useMemo(() => {
    return currentConfig?.subjects?.find(s => s.code === selectedSubjectCode) || currentConfig?.subjects?.[0];
  }, [currentConfig, selectedSubjectCode]);

  useEffect(() => {
    if (currentConfig?.subjects?.length > 0) {
      if (!currentConfig.subjects.some(s => s.code === selectedSubjectCode)) {
        setSelectedSubjectCode(currentConfig.subjects[0].code);
      }
    }
  }, [currentConfig, selectedSubjectCode]);

  const currentSubjectAssignment = useMemo(() => {
    return consolidatedData?.assignments?.find((a: any) => a.subjectCode === selectedSubjectCode);
  }, [consolidatedData?.assignments, selectedSubjectCode]);

  useEffect(() => {
    if (currentSubjectAssignment) {
      setSubjectTeacherId(currentSubjectAssignment.primaryTeacherId || "");
      setSubjectDelegatedTeacherId(currentSubjectAssignment.delegatedTeacherId || "");
      setSubjectAssignmentStatus(currentSubjectAssignment.status || "DRAFT");
    } else {
      setSubjectTeacherId("");
      setSubjectDelegatedTeacherId("");
      setSubjectAssignmentStatus("DRAFT");
    }
  }, [currentSubjectAssignment, selectedSubjectCode]);

  useEffect(() => {
    if (!consolidatedData?.students) return;
    const gradeMap: Record<string, any> = {};
    consolidatedData.students.forEach((st: any) => {
      const g = consolidatedData.grades?.find((x: any) => x.studentId === st.id && x.subjectCode === selectedSubjectCode);
      let progArr: any[] = [];
      try {
        progArr = g?.progressScores ? JSON.parse(g.progressScores) : [];
      } catch {
        progArr = [];
      }
      gradeMap[st.id] = {
        studentId: st.id,
        englishName: st.englishName || "",
        progressScores: progArr,
        midTermScore: g?.midTermScore !== null && g?.midTermScore !== undefined ? g.midTermScore : "",
        endTermScore: g?.endTermScore !== null && g?.endTermScore !== undefined ? g.endTermScore : "",
        gpaScore: g?.gpaScore !== null && g?.gpaScore !== undefined ? g.gpaScore : "",
        assessmentContentEn: g?.assessmentContentEn || "",
        assessmentContentVi: g?.assessmentContentVi || "",
        ieltsScore: g?.ieltsScore !== null && g?.ieltsScore !== undefined ? g.ieltsScore : "",
        commentEn: g?.commentEn || "",
        commentVi: g?.commentVi || "",
        status: g?.reviewStatus || g?.status || "DRAFT",
      };
    });
    setSubjectGrades(gradeMap);
  }, [consolidatedData, selectedSubjectCode]);

  // Update a single score field for a student
  const updateStudentScore = (studentId: string, field: string, value: any, subIndex?: number) => {
    if (field === "englishName") {
      setConsolidatedData((prev: any) => {
        if (!prev?.students) return prev;
        return {
          ...prev,
          students: prev.students.map((s: any) =>
            s.id === studentId ? { ...s, englishName: value } : s
          ),
        };
      });
    }

    setSubjectGrades(prev => {
      const current = prev[studentId] || { studentId, progressScores: [] };
      const updated = { ...current };

      if (field === "progressScores" && typeof subIndex === "number") {
        const pArr = [...(updated.progressScores || [])];
        pArr[subIndex] = value === "" ? "" : Number(value);
        updated.progressScores = pArr;
      } else if (field === "englishName") {
        updated.englishName = value;
      } else {
        updated[field] = value === "" ? "" : value;
      }

      // If MIDDLE level, auto calculate GPA if applicable
      if (currentLevel === "MIDDLE" && !currentSubjectDef?.isQualitative) {
        const pVals = (updated.progressScores || [])
          .filter((v: any) => v !== "" && v !== null && !isNaN(Number(v)))
          .map(Number);
        const mVal = updated.midTermScore !== "" && updated.midTermScore !== null && !isNaN(Number(updated.midTermScore))
          ? Number(updated.midTermScore)
          : null;
        const eVal = updated.endTermScore !== "" && updated.endTermScore !== null && !isNaN(Number(updated.endTermScore))
          ? Number(updated.endTermScore)
          : null;

        const scores: number[] = [...pVals];
        if (mVal !== null) scores.push(mVal, mVal);
        if (eVal !== null) scores.push(eVal, eVal);
        if (scores.length > 0) {
          const sum = scores.reduce((a, b) => a + b, 0);
          updated.gpaScore = Math.round((sum / scores.length) * 10) / 10;
        } else {
          updated.gpaScore = "";
        }
      }

      return {
        ...prev,
        [studentId]: updated,
      };
    });
  };

  // Save Subject Assignment
  const handleSaveSubjectAssignment = async () => {
    if (!selectedClassId || !selectedSubjectCode) return;
    setSavingSubjectAssignment(true);
    try {
      const res = await fetch("/api/admin/ctqt/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          semester: selectedSemester,
          assignments: [
            {
              classId: selectedClassId,
              subjectCode: selectedSubjectCode,
              primaryTeacherId: subjectTeacherId || null,
              delegatedTeacherId: subjectDelegatedTeacherId || null,
              status: subjectAssignmentStatus,
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã cập nhật phân quyền GVBM & GVTA môn ${currentSubjectDef?.nameVi || selectedSubjectCode}!`);
        fetchConsolidatedGrades();
      } else {
        toast.error(data.error || "Lỗi cập nhật phân quyền");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSavingSubjectAssignment(false);
    }
  };

  // Save Subject Grades
  const handleSaveSubjectGrades = async () => {
    if (!selectedClassId || !selectedSubjectCode) return;
    setSavingGrades(true);
    try {
      const gradesPayload = Object.values(subjectGrades).map((g: any) => ({
        studentId: g.studentId,
        englishName: g.englishName !== undefined ? g.englishName : null,
        subjectCode: selectedSubjectCode,
        progressScores: JSON.stringify(g.progressScores || []),
        midTermScore: g.midTermScore !== "" && g.midTermScore !== null ? Number(g.midTermScore) : null,
        endTermScore: g.endTermScore !== "" && g.endTermScore !== null ? Number(g.endTermScore) : null,
        gpaScore: g.gpaScore !== "" && g.gpaScore !== null ? Number(g.gpaScore) : null,
        assessmentContentEn: g.assessmentContentEn || null,
        assessmentContentVi: g.assessmentContentVi || null,
        ieltsScore: g.ieltsScore !== "" && g.ieltsScore !== null ? Number(g.ieltsScore) : null,
        commentEn: g.commentEn || null,
        commentVi: g.commentVi || null,
        reviewStatus: g.status || "DRAFT",
        status: g.status || "DRAFT",
      }));

      const res = await fetch("/api/admin/ctqt/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          academicYearId: selectedYearId,
          semester: selectedSemester,
          grades: gradesPayload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã lưu bảng điểm môn ${currentSubjectDef?.nameVi || selectedSubjectCode} thành công!`);
        fetchConsolidatedGrades();
      } else {
        toast.error(data.error || "Lỗi lưu bảng điểm");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSavingGrades(false);
    }
  };

  // Approve Subject Grades
  const handleApproveSubjectGrades = async () => {
    if (!confirm(`Xác nhận duyệt hoàn tất bảng điểm môn ${currentSubjectDef?.nameVi || selectedSubjectCode}? Sau khi duyệt, điểm sẽ được ghi nhận chính thức.`)) return;
    setSavingGrades(true);
    try {
      const updatedGrades = { ...subjectGrades };
      Object.keys(updatedGrades).forEach(k => {
        updatedGrades[k] = { ...updatedGrades[k], status: "APPROVED" };
      });
      setSubjectGrades(updatedGrades);

      const gradesPayload = Object.values(updatedGrades).map((g: any) => ({
        studentId: g.studentId,
        englishName: g.englishName !== undefined ? g.englishName : null,
        subjectCode: selectedSubjectCode,
        progressScores: JSON.stringify(g.progressScores || []),
        midTermScore: g.midTermScore !== "" && g.midTermScore !== null ? Number(g.midTermScore) : null,
        endTermScore: g.endTermScore !== "" && g.endTermScore !== null ? Number(g.endTermScore) : null,
        gpaScore: g.gpaScore !== "" && g.gpaScore !== null ? Number(g.gpaScore) : null,
        assessmentContentEn: g.assessmentContentEn || null,
        assessmentContentVi: g.assessmentContentVi || null,
        ieltsScore: g.ieltsScore !== "" && g.ieltsScore !== null ? Number(g.ieltsScore) : null,
        commentEn: g.commentEn || null,
        commentVi: g.commentVi || null,
        reviewStatus: "APPROVED",
        status: "APPROVED",
      }));

      await fetch("/api/admin/ctqt/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          academicYearId: selectedYearId,
          semester: selectedSemester,
          grades: gradesPayload,
        }),
      });

      await fetch("/api/admin/ctqt/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          semester: selectedSemester,
          assignments: [
            {
              classId: selectedClassId,
              subjectCode: selectedSubjectCode,
              primaryTeacherId: subjectTeacherId || null,
              delegatedTeacherId: subjectDelegatedTeacherId || null,
              status: "APPROVED",
            },
          ],
        }),
      });
      setSubjectAssignmentStatus("APPROVED");
      toast.success(`Đã phê duyệt hoàn tất bảng điểm môn ${currentSubjectDef?.nameVi || selectedSubjectCode}!`);
      fetchConsolidatedGrades();
    } catch {
      toast.error("Lỗi khi duyệt bảng điểm");
    } finally {
      setSavingGrades(false);
    }
  };

  // Download Single Subject Excel Template
  const handleDownloadSubjectTemplate = (subCode?: string) => {
    if (!selectedClassId) {
      toast.error("Vui lòng chọn lớp học");
      return;
    }
    const targetSub = subCode || selectedSubjectCode;
    const url = `/api/admin/ctqt/excel?classId=${selectedClassId}&academicYearId=${selectedYearId}&semester=${selectedSemester}&subjectCode=${targetSub}`;
    window.open(url, "_blank");
  };

  // Upload Single Subject Excel
  const handleSubjectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClassId) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("classId", selectedClassId);
      formData.append("academicYearId", selectedYearId);
      formData.append("semester", String(selectedSemester));

      const res = await fetch("/api/admin/ctqt/excel", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Đã nạp file điểm môn ${currentSubjectDef?.nameVi || ""} thành công!`);
        fetchConsolidatedGrades();
      } else {
        toast.error(data.error || "Lỗi nạp file điểm");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  // Stats for the current subject
  const subjectStats = useMemo(() => {
    if (!consolidatedData?.students || consolidatedData.students.length === 0) {
      return { total: 0, hasScore: 0, avg: 0, max: 0, min: 0 };
    }
    const students = consolidatedData.students;
    let scoreSum = 0;
    let scoreCount = 0;
    let max = -Infinity;
    let min = Infinity;
    let hasScoreCount = 0;

    students.forEach((st: any) => {
      const g = subjectGrades[st.id];
      if (!g) return;
      let repScore: number | null = null;
      if (currentLevel === "PRIMARY") {
        if (g.endTermScore !== "" && g.endTermScore !== null) repScore = Number(g.endTermScore);
        else if (g.midTermScore !== "" && g.midTermScore !== null) repScore = Number(g.midTermScore);
      } else if (currentLevel === "MIDDLE") {
        if (g.gpaScore !== "" && g.gpaScore !== null) repScore = Number(g.gpaScore);
        else if (g.endTermScore !== "" && g.endTermScore !== null) repScore = Number(g.endTermScore);
      } else if (currentLevel === "HIGH") {
        if (currentSubjectDef?.code === "IELTS") {
          if (g.ieltsScore !== "" && g.ieltsScore !== null) repScore = Number(g.ieltsScore);
        } else {
          if (g.midTermScore !== "" && g.midTermScore !== null) repScore = Number(g.midTermScore);
        }
      }

      if (repScore !== null && !isNaN(repScore)) {
        hasScoreCount++;
        scoreSum += repScore;
        scoreCount++;
        if (repScore > max) max = repScore;
        if (repScore < min) min = repScore;
      }
    });

    return {
      total: students.length,
      hasScore: hasScoreCount,
      avg: scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0,
      max: max === -Infinity ? 0 : max,
      min: min === Infinity ? 0 : min,
    };
  }, [consolidatedData?.students, subjectGrades, currentLevel, currentSubjectDef]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-[#003B3A] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-[#003B3A] text-white rounded-xl shadow-xs">
                <Globe className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-[#003B3A] tracking-tight flex items-center gap-2">
                  Quản lý Điểm CTQT & Report Card
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#00736E] border border-teal-200">
                    Bilingual / International
                  </span>
                </h1>
                <p className="text-xs md:text-sm text-slate-600 mt-0.5">
                  Cấu hình sổ điểm, phân công Giáo viên bộ môn (GVBM) cho 1 hoặc nhiều lớp, sổ điểm tổng hợp và xuất Report Card song ngữ.
                </p>
              </div>
            </div>
          </div>

          {/* Academic Year & Semester selector */}
          <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
            <select
              value={selectedYearId}
              onChange={e => setSelectedYearId(e.target.value)}
              className="text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-[#008B85]"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>
                  Năm học: {y.name}
                </option>
              ))}
            </select>

            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedSemester(1)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  selectedSemester === 1 ? "bg-[#003B3A] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Học kỳ 1
              </button>
              <button
                type="button"
                onClick={() => setSelectedSemester(2)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  selectedSemester === 2 ? "bg-[#003B3A] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Học kỳ 2
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-200 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("subject_gradebook")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "subject_gradebook"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            1. Sổ điểm theo Môn (GVBM)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("consolidated")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "consolidated"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            2. Sổ điểm Tổng hợp
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("assignments")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "assignments"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            3. Phân công Giáo viên (GVBM)
          </button>

          <button
            type="button"
            onClick={() => {
              setProgressPresetSearch("");
              setActiveTab("grade_progress");
            }}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "grade_progress"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            4. Thống kê nhập điểm theo GV phân công
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("excel")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "excel"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            5. Quản lý File & Import/Export
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("report_card")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "report_card"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Award className="w-4 h-4" />
            6. Xuất Report Card (PDF)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SỔ ĐIỂM THEO MÔN (GVBM)                                            */}
      {/* ========================================================================= */}
      {activeTab === "subject_gradebook" && (
        <div className="space-y-4">
          {/* Top Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 tabular-nums">
              {/* Campus filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Chọn Cơ sở:</span>
                <select
                  value={selectedCampusId}
                  onChange={e => setSelectedCampusId(e.target.value)}
                  className="text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[#003B3A] focus:outline-[#008B85]"
                >
                  <option value="">Tất cả Cơ sở ({campusClassCounts.total} lớp)</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.campusName} ({campusClassCounts.byCampusId.get(c.id) || 0} lớp)
                    </option>
                  ))}
                </select>
              </div>

              {/* Class selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Chọn Lớp:</span>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="text-xs font-bold px-3.5 py-2 bg-teal-50 border border-teal-300 rounded-xl text-[#003B3A] focus:outline-[#008B85] min-w-[190px]"
                >
                  {renderGroupedClassOptions(filteredClasses, { idKey: "id" })}
                </select>
              </div>

              {selectedClass && (
                <span className="text-xs font-bold px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl">
                  {currentConfig.levelNameVi} ({currentConfig.subjects.length} môn)
                </span>
              )}
            </div>

            {/* Quick Actions for Subject Gradebook */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleDownloadSubjectTemplate()}
                className="text-xs font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition-all"
                title="Tải file Excel mẫu đúng riêng môn này"
              >
                <Download className="w-3.5 h-3.5" />
                Tải Excel môn này
              </button>

              <label className="text-xs font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                {uploadingFile ? "Đang nạp..." : "Nạp Excel môn này"}
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleSubjectFileUpload}
                  className="hidden"
                  disabled={uploadingFile}
                />
              </label>

              <button
                type="button"
                onClick={handleSaveSubjectGrades}
                disabled={savingGrades}
                className="text-xs font-bold px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingGrades ? "Đang lưu điểm..." : "Lưu điểm môn này"}
              </button>
            </div>
          </div>

          {/* Subject Pills / Tabs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
            <div className="text-xs font-bold text-slate-600 mb-2.5 px-1">
              Chọn môn học để nhập điểm và phân quyền giáo viên:
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {currentConfig.subjects.map(sub => {
                const isSelected = sub.code === selectedSubjectCode;
                const assignment = consolidatedData?.assignments?.find((a: any) => a.subjectCode === sub.code);
                const primaryTeacher = assignment?.primaryTeacher?.teacherName;
                const delegatedTeacher = assignment?.delegatedTeacher?.teacherName;
                const status = assignment?.status || "DRAFT";

                return (
                  <button
                    key={sub.code}
                    type="button"
                    onClick={() => setSelectedSubjectCode(sub.code)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 ${
                      isSelected
                        ? "bg-[#003B3A] text-white border-[#003B3A] shadow-sm ring-2 ring-[#00A19A]/40"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                        isSelected ? "bg-white text-[#003B3A]" : "bg-teal-100 text-[#003B3A]"
                      }`}
                    >
                      {sub.code}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs">
                        {sub.nameVi} <span className={isSelected ? "text-teal-200 font-normal" : "text-slate-500 font-normal"}>({sub.nameEn})</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[11px] font-medium ${isSelected ? "text-teal-100" : "text-slate-500"}`}>
                          {primaryTeacher ? `GVBM: ${primaryTeacher}` : "Chưa phân công GVBM"}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            status === "APPROVED"
                              ? isSelected ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-800"
                              : status === "SUBMITTED"
                              ? isSelected ? "bg-amber-400 text-slate-900" : "bg-amber-100 text-amber-800"
                              : isSelected ? "bg-[#00736E] text-teal-100" : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {status === "APPROVED" ? "Đã duyệt" : status === "SUBMITTED" ? "Đã gửi duyệt" : "Bản nháp"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Assignment Header Card */}
          <div className="bg-white border border-slate-200 border-l-4 border-l-[#003B3A] rounded-2xl p-4 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#003B3A] text-white flex items-center justify-center font-black text-sm shadow-xs">
                  {currentSubjectDef?.code}
                </div>
                <div>
                  <div className="text-base font-black text-slate-800 flex items-center gap-2">
                    Bảng điểm môn: {currentSubjectDef?.nameVi} ({currentSubjectDef?.nameEn})
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[#003B3A]">
                      Sheet: {currentSubjectDef?.sheetName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Phân công Giáo viên bộ môn (GVBM) dạy và nhập điểm cho một hoặc nhiều lớp.
                  </p>
                </div>
              </div>

              {/* Direct Assignment Controls */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-[#00736E] mb-1">
                    Tổ chuyên môn (BP Tiếng Anh)
                  </label>
                  <select
                    value={teacherDeptScope}
                    onChange={e => setTeacherDeptScope(e.target.value)}
                    className="text-xs font-bold px-2.5 py-1.5 bg-teal-50/70 border border-teal-300 rounded-lg text-[#003B3A] focus:outline-[#008B85] max-w-[215px] tabular-nums"
                  >
                    <option value="ALL_BP_TA">
                      Tất cả Tổ thuộc BP Tiếng Anh ({deptTeacherCounts.totalEnglishDivCount})
                    </option>
                    {englishDepartments.length > 0 && (
                      <optgroup label="Các Tổ chuyên môn thuộc BP Tiếng Anh">
                        {englishDepartments.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({deptTeacherCounts.byDeptId.get(d.id) || 0})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Mở rộng phạm vi">
                      <option value="ALL_SCHOOL">Toàn trường ({enrichedTeachers.length} GV)</option>
                      {otherDepartments.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({deptTeacherCounts.byDeptId.get(d.id) || 0})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Giáo viên bộ môn (GVBM)
                  </label>
                  <select
                    value={subjectTeacherId}
                    onChange={e => setSubjectTeacherId(e.target.value)}
                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-[#008B85] min-w-[200px] tabular-nums"
                  >
                    <option value="">-- Chưa phân công --</option>
                    {renderGroupedTeacherOptions(subjectTeacherId, false)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Trạng thái sổ điểm môn
                  </label>
                  <select
                    value={subjectAssignmentStatus}
                    onChange={e => setSubjectAssignmentStatus(e.target.value)}
                    className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-[#008B85]"
                  >
                    <option value="DRAFT">Bản nháp (GVBM đang nhập)</option>
                    <option value="SUBMITTED">Đã gửi duyệt</option>
                    <option value="APPROVED">Đã duyệt chính thức</option>
                    <option value="REVISION_REQUESTED">Yêu cầu chỉnh sửa</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-end gap-2 pt-3 sm:pt-0">
                  <button
                    type="button"
                    onClick={handleSaveSubjectAssignment}
                    disabled={savingSubjectAssignment}
                    className="text-xs font-bold px-3 py-2 bg-[#003B3A] hover:bg-[#005250] text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {savingSubjectAssignment ? "Đang lưu..." : "Lưu phân công"}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendSingleSubjectEmail}
                    disabled={sendingSubjectEmail || !subjectTeacherId}
                    className="text-xs font-bold px-3 py-2 bg-white hover:bg-teal-50 text-[#003B3A] border border-teal-300 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
                    title="Lưu và gửi email thông báo phân công môn này cho GVBM"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#008B85]" />
                    {sendingSubjectEmail ? "Đang gửi mail..." : "Gửi mail GV"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleQuickPrefillMultiClass({
                        subjectCode: selectedSubjectCode,
                        primaryTeacherId: subjectTeacherId || null,
                        classIds: selectedClassId ? [selectedClassId] : [],
                      })
                    }
                    className="text-xs font-bold px-3 py-2 bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-300 rounded-lg flex items-center gap-1.5 transition-all"
                    title="Mở công cụ chọn nhiều lớp để gán nhanh GVBM vừa chọn"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-[#008B85]" />
                    Gán cho nhiều lớp...
                  </button>

                  <button
                    type="button"
                    onClick={handleApproveSubjectGrades}
                    className="text-xs font-bold px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <Award className="w-3.5 h-3.5" />
                    Duyệt điểm môn
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Subject Grade Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {loadingConsolidated ? (
              <div className="p-16 text-center text-slate-500 font-semibold flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Đang tải bảng điểm môn {currentSubjectDef?.nameVi}...</span>
              </div>
            ) : !consolidatedData?.students || consolidatedData.students.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-semibold">
                Lớp này chưa có danh sách học sinh.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-[#003B3A] sticky top-0 z-10 shadow-xs text-white border-b border-[#003B3A]">
                      <tr className="text-[11px] font-semibold whitespace-nowrap">
                        <th className="p-3 border border-white/15 text-center w-12 font-semibold">STT</th>
                        <th className="p-3 border border-white/15 text-center w-28 font-semibold">Mã HS</th>
                        <th className="p-3 border border-white/15 min-w-[160px] font-semibold">Họ và tên</th>
                        <th className="p-3 border border-white/15 min-w-[140px] text-[#5EEAD4] font-semibold">English Name</th>

                        {/* Dynamic Score Columns */}
                        {currentLevel === "HIGH" ? (
                          currentSubjectDef?.code === "IELTS" ? (
                            <>
                              <th className="p-3 border border-white/15 text-center w-36 font-semibold">Nội dung</th>
                              <th className="p-3 border border-white/15 text-center w-28 bg-[#003B3A] text-[#5EEAD4] font-semibold">IELTS Band (0-9)</th>
                            </>
                          ) : currentSubjectDef?.isQualitative ? (
                            <th className="p-3 border border-white/15 text-center w-48 font-semibold">Nghiên cứu học thuật</th>
                          ) : (
                            <>
                              <th className="p-3 border border-white/15 text-center min-w-[180px] font-semibold">Nội dung kiểm tra (Content)</th>
                              <th className="p-3 border border-white/15 text-center w-24 bg-[#003B3A] text-[#5EEAD4] font-semibold">Điểm số (Mark)</th>
                            </>
                          )
                        ) : (
                          currentSubjectDef?.scoreColumns.map((col: any) => (
                            <th
                              key={col.key}
                              className={`py-3 px-3 border-r border-white/10 text-center font-semibold ${
                                col.key === "gpaScore"
                                  ? "bg-[#004D4B] text-[#5EEAD4] w-28"
                                  : "text-teal-100 w-24"
                              }`}
                            >
                              <div>{col.labelVi}</div>
                              <div className="text-[10px] font-normal text-teal-200/80">{col.labelEn}</div>
                            </th>
                          ))
                        )}

                        <th className="py-3 px-3 border-r border-white/10 min-w-[220px] text-teal-100 font-semibold">Nhận xét tiếng Anh (Comment EN)</th>
                        <th className="py-3 px-3 border-r border-white/10 min-w-[220px] text-teal-100 font-semibold">Nhận xét tiếng Việt (Nhận xét VI)</th>
                        <th className="py-3 px-3 text-center w-24 text-[#5EEAD4] font-semibold">Trạng thái</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E2E8F0]">
                      {consolidatedData.students.map((st: any, idx: number) => {
                        const g = subjectGrades[st.id] || { studentId: st.id, progressScores: [] };

                        return (
                          <tr key={st.id} className="hover:bg-teal-50/30 transition-colors">
                            <td className="p-2.5 border border-slate-200 text-center font-bold text-slate-500 tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="p-2.5 border border-slate-200 text-center font-mono text-slate-600 tabular-nums">
                              {st.studentCode}
                            </td>
                            <td className="p-2.5 border border-slate-200 font-bold text-slate-800 whitespace-nowrap">
                              {st.studentName}
                            </td>
                            <td className="p-2 border border-slate-200">
                              <input
                                type="text"
                                value={g.englishName !== undefined ? g.englishName : (st.englishName || "")}
                                onChange={e => updateStudentScore(st.id, "englishName", e.target.value)}
                                placeholder="Nhập English Name..."
                                className="w-full min-w-[125px] text-xs font-semibold text-[#00736E] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#008B85] focus:border-[#008B85] focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                              />
                            </td>

                            {/* Score Inputs */}
                            {currentLevel === "HIGH" ? (
                              currentSubjectDef?.code === "IELTS" ? (
                                <>
                                  <td className="p-2 border border-slate-200 text-center text-slate-500 italic">
                                    Điểm thi HK2
                                  </td>
                                  <td className="p-2 border border-slate-200 text-center">
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      max="9"
                                      value={g.ieltsScore ?? ""}
                                      onChange={e => updateStudentScore(st.id, "ieltsScore", e.target.value)}
                                      placeholder="0 - 9"
                                      className="w-20 text-center font-black text-teal-800 px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                  </td>
                                </>
                              ) : currentSubjectDef?.isQualitative ? (
                                <td className="p-2 border border-slate-200 text-center text-slate-500 italic">
                                  Đánh giá định tính
                                </td>
                              ) : (
                                <>
                                  <td className="p-2 border border-slate-200">
                                    <input
                                      type="text"
                                      value={g.assessmentContentVi || g.assessmentContentEn || ""}
                                      onChange={e => updateStudentScore(st.id, "assessmentContentVi", e.target.value)}
                                      placeholder="Nhập nội dung bài đánh giá..."
                                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                    />
                                  </td>
                                  <td className="p-2 border border-slate-200 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={g.midTermScore ?? ""}
                                      onChange={e => updateStudentScore(st.id, "midTermScore", e.target.value)}
                                      placeholder="Điểm"
                                      className="w-18 text-center font-black text-teal-800 px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    />
                                  </td>
                                </>
                              )
                            ) : (
                              currentSubjectDef?.scoreColumns.map((col: any) => {
                                if (col.key.startsWith("progressScores_")) {
                                  const subIdx = parseInt(col.key.split("_")[1], 10);
                                  const val = g.progressScores?.[subIdx] ?? "";
                                  return (
                                    <td key={col.key} className="p-2 border border-slate-200 text-center">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={val}
                                        onChange={e => updateStudentScore(st.id, "progressScores", e.target.value, subIdx)}
                                        className="w-16 text-center font-bold px-2 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                      />
                                    </td>
                                  );
                                }
                                if (col.key === "midTermScore") {
                                  return (
                                    <td key={col.key} className="p-2 border border-slate-200 text-center">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={g.midTermScore ?? ""}
                                        onChange={e => updateStudentScore(st.id, "midTermScore", e.target.value)}
                                        className="w-16 text-center font-bold px-2 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                      />
                                    </td>
                                  );
                                }
                                if (col.key === "endTermScore") {
                                  return (
                                    <td key={col.key} className="p-2 border border-slate-200 text-center">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={g.endTermScore ?? ""}
                                        onChange={e => updateStudentScore(st.id, "endTermScore", e.target.value)}
                                        className="w-16 text-center font-bold px-2 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                      />
                                    </td>
                                  );
                                }
                                if (col.key === "gpaScore") {
                                  return (
                                    <td key={col.key} className="p-2 border border-slate-200 text-center bg-teal-50/40">
                                      <span className="font-black text-teal-800 text-xs px-2.5 py-1 rounded bg-teal-100 border border-teal-200 inline-block">
                                        {g.gpaScore !== "" && g.gpaScore !== null ? g.gpaScore : "-"}
                                      </span>
                                    </td>
                                  );
                                }
                                return <td key={col.key} className="p-2 border border-slate-200 text-center">-</td>;
                              })
                            )}

                            {/* Comment EN */}
                            <td className="p-2 border border-slate-200">
                              <textarea
                                rows={2}
                                value={g.commentEn || ""}
                                onChange={e => updateStudentScore(st.id, "commentEn", e.target.value)}
                                placeholder="Nhận xét tiếng Anh (English comment)..."
                                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none resize-y"
                              />
                            </td>

                            {/* Comment VI */}
                            <td className="p-2 border border-slate-200">
                              <textarea
                                rows={2}
                                value={g.commentVi || ""}
                                onChange={e => updateStudentScore(st.id, "commentVi", e.target.value)}
                                placeholder="Nhận xét tiếng Việt đối ứng..."
                                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none resize-y"
                              />
                            </td>

                            {/* Student Status */}
                            <td className="py-3 px-3 border border-slate-200 text-center align-middle">
                              <span
                                className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full inline-block whitespace-nowrap ${
                                  g.status === "APPROVED"
                                    ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                                    : g.status === "SUBMITTED" || g.status === "PENDING_REVIEW"
                                    ? "bg-amber-50 text-[#D97706] border border-amber-200"
                                    : g.status === "REVISION_REQUESTED" || g.status === "CHANGES_REQUESTED"
                                    ? "bg-rose-50 text-[#E11D48] border border-rose-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                              >
                                {g.status === "APPROVED"
                                  ? "Đã duyệt"
                                  : g.status === "SUBMITTED" || g.status === "PENDING_REVIEW"
                                  ? "Chờ duyệt"
                                  : g.status === "REVISION_REQUESTED" || g.status === "CHANGES_REQUESTED"
                                  ? "Cần chỉnh sửa"
                                  : "Bản nháp"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Statistics Bar */}
                <div className="bg-slate-50 border-t border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 text-slate-700 font-semibold">
                    <span>
                      Sĩ số: <strong className="text-slate-900">{subjectStats.total}</strong> học sinh
                    </span>
                    <span>
                      Đã có điểm:{" "}
                      <strong className="text-teal-700">
                        {subjectStats.hasScore} / {subjectStats.total}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-4 font-bold">
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-800">
                      Điểm TB môn cả lớp: <strong className="text-teal-700">{subjectStats.avg || "-"}</strong>
                    </span>
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-emerald-700">
                      Cao nhất: <strong>{subjectStats.max || "-"}</strong>
                    </span>
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-rose-700">
                      Thấp nhất: <strong>{subjectStats.min || "-"}</strong>
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SỔ ĐIỂM TỔNG HỢP (CONSOLIDATED GRID)                                */}
      {/* ========================================================================= */}
      {activeTab === "consolidated" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 tabular-nums">
              {/* Campus filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Chọn Cơ sở:</span>
                <select
                  value={selectedCampusId}
                  onChange={e => setSelectedCampusId(e.target.value)}
                  className="text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[#003B3A] focus:outline-[#008B85]"
                >
                  <option value="">Tất cả Cơ sở ({campusClassCounts.total} lớp)</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.campusName} ({campusClassCounts.byCampusId.get(c.id) || 0} lớp)
                    </option>
                  ))}
                </select>
              </div>

              {/* Class selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Chọn Lớp:</span>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="text-xs font-bold px-3.5 py-2 bg-teal-50 border border-teal-300 rounded-xl text-[#003B3A] focus:outline-[#008B85] min-w-[190px]"
                >
                  {renderGroupedClassOptions(filteredClasses, { idKey: "id" })}
                </select>
              </div>

              {selectedClass && (
                <span className="text-xs font-bold px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl">
                  {currentConfig.levelNameVi} ({currentConfig.subjects.length} môn)
                </span>
              )}
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-xs font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Tải Excel
              </button>

              <button
                type="button"
                onClick={() => handleExportPdf()}
                disabled={generatingPdf}
                className="text-xs font-bold px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                {generatingPdf ? "Đang xuất..." : "Xuất Report Card Lớp"}
              </button>
            </div>
          </div>

          {/* Consolidated Grid */}
          {loadingConsolidated ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Đang tải dữ liệu Sổ điểm Tổng hợp...
            </div>
          ) : !consolidatedData || consolidatedData.students?.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Chưa có học sinh nào trong lớp này hoặc lớp chưa có dữ liệu.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-700">
                  Danh sách {consolidatedData.students.length} học sinh • Bảng ma trận tổng hợp khớp chính xác cấu trúc Sheet TỔNG HỢP
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  * Nhấp đúp vào ô nhận xét để xem/chỉnh sửa chi tiết song ngữ
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] border-b border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#003B3A] sticky top-0 shadow-xs z-10 text-white border-b border-[#003B3A]">
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      <th className="p-2.5 border border-white/15 text-center font-bold w-10">STT</th>
                      <th className="p-2.5 border border-white/15 text-center font-bold w-24">Mã HS</th>
                      <th className="p-2.5 border border-white/15 font-bold min-w-[140px] text-teal-100">Họ và tên</th>
                      <th className="p-2.5 border border-white/15 font-bold min-w-[90px] text-[#5EEAD4]">English Name</th>

                      {/* Subject Groups */}
                      {consolidatedData.config?.subjects?.map((sub: any) => (
                        <th
                          key={sub.code}
                          colSpan={sub.scoreColumns.length + 2}
                          className={`p-2 border border-slate-300 text-center font-black ${sub.color.bg} ${sub.color.text}`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>{sub.nameEn} ({sub.nameVi})</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubjectCode(sub.code);
                                setActiveTab("subject_gradebook");
                              }}
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/90 hover:bg-white text-slate-800 border border-slate-300/80 shadow-2xs transition-all hover:scale-105 cursor-pointer"
                              title={`Chuyển đến Sổ điểm môn ${sub.nameVi} để nhập điểm & phân quyền GVBM`}
                            >
                              Sổ môn ↗
                            </button>
                          </div>
                        </th>
                      ))}

                      {/* Core Competencies Header */}
                      <th
                        colSpan={6}
                        className="p-2 border border-white/15 text-center bg-[#003B3A] text-[#5EEAD4] font-semibold"
                      >
                        Năng lực Cốt lõi (Core Competencies)
                      </th>
                    </tr>

                    {/* Sub-header row */}
                    <tr className="text-[11px] font-semibold">
                      <th className="border border-white/15 font-semibold"></th>
                      <th className="border border-white/15 font-semibold"></th>
                      <th className="border border-white/15 font-semibold"></th>
                      <th className="border border-white/15 font-semibold"></th>

                      {consolidatedData.config?.subjects?.map((sub: any) => (
                        <React.Fragment key={sub.code}>
                          {sub.scoreColumns.map((col: any) => (
                            <th key={col.key} className="p-1.5 border border-white/15 text-center font-bold w-12">
                              {col.shortLabel}
                            </th>
                          ))}
                          <th className="p-1.5 border border-white/15 text-center font-semibold min-w-[120px]">CMT (EN)</th>
                          <th className="p-1.5 border border-white/15 text-center font-semibold min-w-[120px]">NX (VI)</th>
                        </React.Fragment>
                      ))}

                      {CORE_COMPETENCIES_DEF.map(cc => (
                        <th key={cc.key} className="p-1.5 border border-white/15 text-center font-bold w-12">
                          {cc.labelVi}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E2E8F0]">
                    {consolidatedData.students.map((st: any, idx: number) => {
                      const gradeMap = new Map<string, any>();
                      consolidatedData.grades
                        ?.filter((g: any) => g.studentId === st.id)
                        .forEach((g: any) => gradeMap.set(g.subjectCode, g));

                      const comp = consolidatedData.competencies?.find((c: any) => c.studentId === st.id) || {};

                      return (
                        <tr key={st.id} className="hover:bg-teal-50/40 transition-colors">
                          <td className="p-2 border border-slate-200 text-center font-bold text-slate-600 tabular-nums">{idx + 1}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono text-slate-600 tabular-nums">{st.studentCode}</td>
                          <td className="p-2 border border-slate-200 font-bold text-slate-800">{st.studentName}</td>
                          <td className="p-2 border border-slate-200 font-semibold text-teal-700">{st.englishName || "-"}</td>

                          {/* Subjects scores & comments */}
                          {consolidatedData.config?.subjects?.map((sub: any) => {
                            const g = gradeMap.get(sub.code) || {};
                            let progArr: any[] = [];
                            try {
                              progArr = JSON.parse(g.progressScores || "[]");
                            } catch {
                              progArr = [];
                            }

                            return (
                              <React.Fragment key={sub.code}>
                                {sub.scoreColumns.map((col: any) => {
                                  let val: any = "-";
                                  if (col.key.startsWith("progressScores_")) {
                                    const pIdx = parseInt(col.key.replace("progressScores_", ""), 10);
                                    val = progArr[pIdx] !== undefined ? progArr[pIdx] : "-";
                                  } else if (col.key === "midTermScore") {
                                    val = g.midTermScore !== null && g.midTermScore !== undefined ? g.midTermScore : "-";
                                  } else if (col.key === "endTermScore") {
                                    val = g.endTermScore !== null && g.endTermScore !== undefined ? g.endTermScore : "-";
                                  } else if (col.key === "gpaScore") {
                                    val = g.gpaScore !== null && g.gpaScore !== undefined ? g.gpaScore : "-";
                                  } else if (col.key === "ieltsScore") {
                                    val = g.ieltsScore !== null && g.ieltsScore !== undefined ? g.ieltsScore : "-";
                                  }

                                  return (
                                    <td key={col.key} className="p-1.5 border border-slate-200 text-center font-semibold text-slate-800">
                                      {val}
                                    </td>
                                  );
                                })}

                                <td className="p-1.5 border border-slate-200 text-[11px] text-slate-700 truncate max-w-[140px]" title={g.commentEn}>
                                  {g.commentEn || "-"}
                                </td>
                                <td className="p-1.5 border border-slate-200 text-[11px] text-slate-600 italic truncate max-w-[140px]" title={g.commentVi}>
                                  {g.commentVi || "-"}
                                </td>
                              </React.Fragment>
                            );
                          })}

                          {/* Core Competencies values */}
                          {CORE_COMPETENCIES_DEF.map(cc => {
                            const val = comp[cc.key] || "E";
                            return (
                              <td key={cc.key} className="p-1.5 border border-slate-200 text-center font-black">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                                    val === "E"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : val === "S"
                                      ? "bg-blue-100 text-blue-800"
                                      : val === "N"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {val}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PHÂN CÔNG GIÁO VIÊN BỘ MÔN (CHỌN 1 HOẶC NHIỀU LỚP CHO 1 GV)        */}
      {/* ========================================================================= */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          {/* Unified Academic Ledger Strip */}
          <div className="bg-white border border-slate-200 border-l-4 border-l-[#003B3A] rounded-2xl p-4 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 tabular-nums">
              <div>
                <div className="text-xs font-semibold text-slate-500">Tổng số lớp CTQT</div>
                <div className="text-lg font-black text-[#003B3A] mt-0.5">
                  {assignmentLedgerStats.totalClassCount} <span className="text-xs font-semibold text-slate-500">lớp</span>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200 hidden sm:block" />

              <div>
                <div className="text-xs font-semibold text-slate-500">Đã phân công GVBM</div>
                <div className="text-lg font-black text-emerald-700 mt-0.5 flex items-baseline gap-1.5">
                  <span>
                    {assignmentLedgerStats.assignedPrimary} / {assignmentLedgerStats.totalSlots}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    ({assignmentLedgerStats.totalSlots > 0 ? Math.round((assignmentLedgerStats.assignedPrimary / assignmentLedgerStats.totalSlots) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200 hidden sm:block" />

              <div>
                <div className="text-xs font-semibold text-slate-500">Còn thiếu GVBM</div>
                <div className="text-lg font-black text-rose-600 mt-0.5">
                  {assignmentLedgerStats.unassignedPrimary} <span className="text-xs font-semibold text-slate-500">môn</span>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200 hidden sm:block" />

              <div>
                <div className="text-xs font-semibold text-slate-500">Lớp đang tích chọn</div>
                <div className="text-lg font-black text-amber-700 mt-0.5">
                  {selectedBulkClassIds.length} <span className="text-xs font-semibold text-slate-500">lớp</span>
                </div>
              </div>
            </div>

            {/* Right Controls: View Switcher, Clone Semester, Save Inline */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAssignmentViewMode("matrix")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    assignmentViewMode === "matrix"
                      ? "bg-[#003B3A] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Ma trận theo lớp
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentViewMode("by_teacher")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    assignmentViewMode === "by_teacher"
                      ? "bg-[#003B3A] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Tổng hợp theo giáo viên
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProgressPresetSearch("");
                    setActiveTab("grade_progress");
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[#00736E] hover:bg-teal-50 hover:text-[#003B3A] transition-all cursor-pointer"
                  title="Mở tab Thống kê nhập điểm theo GV phân công"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Thống kê nhập điểm
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleOpenEmailModal()}
                className="text-xs font-bold px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-300 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                title="Gửi email thông báo phân công giảng dạy đến các giáo viên"
              >
                <Mail className="w-3.5 h-3.5 text-[#008B85]" />
                Gửi email phân công
              </button>

              <button
                type="button"
                onClick={handleCloneAssignments}
                className="text-xs font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                Sao chép HK1 sang HK2
              </button>

              <button
                type="button"
                onClick={handleSaveAssignments}
                disabled={savingAssignments}
                className="text-xs font-bold px-4 py-2 bg-[#008B85] hover:bg-[#00736E] text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                title="Lưu toàn bộ chỉnh sửa trực tiếp trên ma trận lớp"
              >
                <Save className="w-4 h-4" />
                {savingAssignments ? "Đang lưu..." : "Lưu chỉnh sửa trên bảng"}
              </button>
            </div>
          </div>

          {/* Two-Column Split Workspace: Left Sticky Bulk Builder + Right Interactive Matrix/Teacher View */}
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* ================================================================= */}
            {/* LEFT PANEL: CÔNG CỤ GÁN NHANH NHIỀU LỚP CHO 1 GIÁO VIÊN (GVBM)    */}
            {/* ================================================================= */}
            <div className="w-full lg:w-[410px] shrink-0 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] flex flex-col">
              <div className="p-3.5 bg-[#003B3A] text-white shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#00A19A]" />
                    Gán nhanh nhiều lớp cho 1 GV
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-teal-100 tabular-nums">
                    Đã chọn {selectedBulkClassIds.length} lớp
                  </span>
                </div>
                <p className="text-xs text-teal-100/90 mt-1">
                  Chọn 1 giáo viên (GVBM), chọn môn học và tích chọn 1 hoặc nhiều lớp để phân công đồng loạt.
                </p>
              </div>

              <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
                {/* Step 1: Teacher Selection (GVBM only) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#003B3A]">
                      Bước 1. Chọn Giáo viên bộ môn (GVBM)
                    </span>
                  </div>

                  {/* BP Tiếng Anh Department Selector & Quick Chips */}
                  <div className="p-2.5 bg-teal-50/40 border border-teal-200/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#003B3A] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#008B85]" />
                        Tổ chuyên môn thuộc BP Tiếng Anh
                      </span>
                      <span className="text-[11px] font-bold text-[#00736E] tabular-nums">
                        {filteredTeachersForAssign.length} GV
                      </span>
                    </div>

                    <select
                      value={teacherDeptScope}
                      onChange={e => setTeacherDeptScope(e.target.value)}
                      className="w-full text-xs font-bold p-2 bg-white border border-teal-300 rounded-lg text-[#003B3A] focus:outline-[#008B85] tabular-nums"
                    >
                      <option value="ALL_BP_TA">
                        ★ Tất cả Tổ thuộc BP Tiếng Anh ({deptTeacherCounts.totalEnglishDivCount} GV)
                      </option>
                      {englishDepartments.length > 0 && (
                        <optgroup label="Chọn riêng từng Tổ thuộc BP Tiếng Anh">
                          {englishDepartments.map(d => (
                            <option key={d.id} value={d.id}>
                              • {d.name} ({deptTeacherCounts.byDeptId.get(d.id) || 0} GV)
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Mở rộng ngoài BP Tiếng Anh">
                        <option value="ALL_SCHOOL">Toàn trường ({enrichedTeachers.length} GV)</option>
                        {otherDepartments.map(d => (
                          <option key={d.id} value={d.id}>
                            • {d.name} ({deptTeacherCounts.byDeptId.get(d.id) || 0} GV)
                          </option>
                        ))}
                      </optgroup>
                    </select>

                    {englishDepartments.length > 0 && (
                      <div className="flex flex-wrap gap-1 tabular-nums">
                        <button
                          type="button"
                          onClick={() => setTeacherDeptScope("ALL_BP_TA")}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                            teacherDeptScope === "ALL_BP_TA"
                              ? "bg-[#003B3A] text-white border-[#003B3A]"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50"
                          }`}
                        >
                          Tất cả BP TA ({deptTeacherCounts.totalEnglishDivCount})
                        </button>
                        {englishDepartments.map(d => {
                          const active = teacherDeptScope === d.id;
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setTeacherDeptScope(d.id)}
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                                active
                                  ? "bg-[#008B85] text-white border-[#00736E]"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50"
                              }`}
                            >
                              {d.name} ({deptTeacherCounts.byDeptId.get(d.id) || 0})
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Teacher Search & Campus Filter */}
                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-3 relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={teacherSearchQuery}
                        onChange={e => setTeacherSearchQuery(e.target.value)}
                        placeholder="Tìm tên, mã GV..."
                        className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-[#008B85]"
                      />
                    </div>
                    <select
                      value={teacherFilterCampusId}
                      onChange={e => setTeacherFilterCampusId(e.target.value)}
                      className="col-span-2 text-xs font-semibold px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-[#008B85] tabular-nums"
                      title="Lọc danh sách giáo viên theo cơ sở"
                    >
                      <option value="">GV mọi CS ({scopedTeachers.length})</option>
                      {campuses.map(c => (
                        <option key={c.id} value={c.id}>
                          GV: {c.campusName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Primary Teacher (GVBM) Picker */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#003B3A]">
                        Giáo viên nhận phân công (GVBM)
                      </label>
                      <button
                        type="button"
                        onClick={() => setBulkPrimaryTeacherId("__HOMEROOM__")}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded border transition-all ${
                          bulkPrimaryTeacherId === "__HOMEROOM__"
                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                            : "bg-white text-[#00736E] border-teal-200 hover:bg-teal-50"
                        }`}
                        title="Tự động lấy Giáo viên chủ nhiệm của từng lớp làm GVBM"
                      >
                        Theo GVCN từng lớp
                      </button>
                    </div>
                    <select
                      value={bulkPrimaryTeacherId}
                      onChange={e => setBulkPrimaryTeacherId(e.target.value)}
                      className="w-full text-xs font-bold p-2 bg-white border border-teal-300 rounded-lg text-[#003B3A] focus:outline-[#008B85] tabular-nums"
                    >
                      <option value="">-- Chọn Giáo viên (GVBM) --</option>
                      <option value="__HOMEROOM__">★ Tự động gán theo GVCN của từng lớp</option>
                      {renderGroupedTeacherOptions(bulkPrimaryTeacherId, true)}
                    </select>
                  </div>
                </div>

                {/* Step 2: Subject Multi-Selection */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#003B3A]">
                      Bước 2. Chọn môn học áp dụng
                    </span>
                    <button
                      type="button"
                      onClick={() => setBulkSubjectCodes(["ALL"])}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded transition-all ${
                        bulkSubjectCodes.includes("ALL")
                          ? "bg-[#003B3A] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Tất cả môn của lớp
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {allCtqtSubjectOptions.map(sub => {
                      const isAll = bulkSubjectCodes.includes("ALL");
                      const isSelected = !isAll && bulkSubjectCodes.includes(sub.code);
                      return (
                        <button
                          key={sub.code}
                          type="button"
                          onClick={() => toggleBulkSubjectCode(sub.code)}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? "bg-[#008B85] text-white border-[#00736E] shadow-2xs"
                              : isAll
                              ? "bg-teal-50/70 text-[#003B3A] border-teal-200 hover:bg-teal-100"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span className="font-black">{sub.code}</span>
                          <span className={isSelected ? "text-teal-100 font-normal" : "text-slate-500 font-normal"}>
                            {sub.nameVi}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Campus & Multi-Class Picker (Chọn Cơ sở & Nhiều lớp cho 1 GV) */}
                <div className="space-y-2.5 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#003B3A]">
                      Bước 3. Chọn nhiều lớp cho GV ({selectedBulkClassIds.length}/{visibleAssignmentClasses.length})
                    </span>
                    <div className="flex items-center gap-2">
                      {selectedBulkClassIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedBulkClassIds([])}
                          className="text-[11px] font-bold text-rose-600 hover:underline"
                        >
                          Bỏ chọn hết
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={toggleSelectAllVisibleClasses}
                        className="text-[11px] font-bold text-[#008B85] hover:underline"
                      >
                        {visibleAssignmentClasses.length > 0 &&
                        visibleAssignmentClasses.every(c => selectedBulkClassIds.includes(c.classId))
                          ? "Bỏ chọn đang lọc"
                          : "Chọn tất cả đang lọc"}
                      </button>
                    </div>
                  </div>

                  {/* Direct Campus & Multi-Select Class Box */}
                  <div className="p-2.5 bg-teal-50/40 border border-teal-200/80 rounded-xl space-y-2 tabular-nums">
                    {/* Quick Campus Chips */}
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCampusId("");
                          setAssignClassFilterId("");
                        }}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                          !selectedCampusId
                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50"
                        }`}
                      >
                        Tất cả CS ({campusClassCounts.total})
                      </button>
                      {campuses.map(c => {
                        const count = campusClassCounts.byCampusId.get(c.id) || 0;
                        const active = selectedCampusId === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCampusId(c.id);
                              setAssignClassFilterId("");
                            }}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                              active
                                ? "bg-[#008B85] text-white border-[#00736E]"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50"
                            }`}
                          >
                            {c.campusName} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Chọn Cơ sở & Multi-Select Lớp Dropdown */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Chọn Cơ sở
                        </label>
                        <select
                          value={selectedCampusId}
                          onChange={e => {
                            setSelectedCampusId(e.target.value);
                            setAssignClassFilterId("");
                          }}
                          className="w-full text-xs font-bold p-1.5 bg-white border border-teal-300 rounded-lg text-[#003B3A] focus:outline-[#008B85]"
                        >
                          <option value="">Tất cả cơ sở ({campusClassCounts.total} lớp)</option>
                          {campuses.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.campusName} ({campusClassCounts.byCampusId.get(c.id) || 0} lớp)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Chọn nhiều lớp (Tích chọn)
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsMultiClassDropdownOpen(prev => !prev)}
                          className="w-full text-xs font-bold p-1.5 bg-white border border-teal-300 rounded-lg text-[#003B3A] hover:bg-teal-50/50 flex items-center justify-between gap-1 cursor-pointer"
                        >
                          <span className="truncate">
                            {selectedBulkClassIds.length > 0
                              ? `Đã chọn ${selectedBulkClassIds.length} lớp`
                              : `Tích chọn lớp (${levelFilteredAssignmentClasses.length})`}
                          </span>
                          <span className="text-[10px] text-[#008B85] shrink-0">
                            {isMultiClassDropdownOpen ? "▲ Đóng" : "▼ Mở"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Multi-Select Class Dropdown Panel (stays open so user can tick multiple classes!) */}
                    {isMultiClassDropdownOpen && (
                      <div className="bg-white border-2 border-[#008B85] rounded-xl p-2.5 shadow-md space-y-2 max-h-[280px] overflow-y-auto">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <span className="text-[11px] font-extrabold text-[#003B3A]">
                            Tích chọn nhiều lớp cho giáo viên:
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={toggleSelectAllVisibleClasses}
                              className="text-[11px] font-bold text-[#008B85] hover:underline"
                            >
                              {visibleAssignmentClasses.length > 0 &&
                              visibleAssignmentClasses.every(c => selectedBulkClassIds.includes(c.classId))
                                ? "Bỏ chọn tất cả"
                                : `Chọn cả ${visibleAssignmentClasses.length} lớp`}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsMultiClassDropdownOpen(false)}
                              className="text-[11px] font-bold px-2 py-0.5 bg-[#003B3A] text-white rounded-md"
                            >
                              Xong
                            </button>
                          </div>
                        </div>

                        {(["PRIMARY", "MIDDLE", "HIGH"] as const).map(lv => {
                          const groupClasses = visibleAssignmentClasses.filter(c => c.level === lv);
                          if (groupClasses.length === 0) return null;
                          const lvLabel =
                            lv === "PRIMARY"
                              ? "Tiểu học (Khối 1 - 5)"
                              : lv === "MIDDLE"
                              ? "THCS (Khối 6 - 9)"
                              : "THPT (Khối 10 - 12)";
                          const allGroupSelected = groupClasses.every(c => selectedBulkClassIds.includes(c.classId));

                          return (
                            <div key={lv} className="space-y-1">
                              <div className="flex items-center justify-between bg-slate-100 px-2 py-1 rounded-md">
                                <span className="text-[11px] font-bold text-slate-700">
                                  {lvLabel} ({groupClasses.length} lớp)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleLevelClassesSelection(lv)}
                                  className="text-[10px] font-bold text-[#008B85] hover:underline"
                                >
                                  {allGroupSelected ? "Bỏ chọn cấp này" : "+ Chọn cả cấp"}
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-1 pl-1">
                                {groupClasses.map(cls => {
                                  const checked = selectedBulkClassIds.includes(cls.classId);
                                  const hasExplicitTag = /INT|UK/i.test(cls.className || "");
                                  return (
                                    <label
                                      key={cls.classId}
                                      onClick={() => toggleBulkClassSelection(cls.classId)}
                                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                                        checked
                                          ? "bg-[#003B3A] text-white border-[#003B3A] font-bold"
                                          : "bg-white hover:bg-teal-50 text-slate-800 border-slate-200 font-semibold"
                                      }`}
                                    >
                                      {checked ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
                                      ) : (
                                        <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      )}
                                      <span className="truncate">
                                        {cls.className}
                                        {!hasExplicitTag && cls.grade ? ` (K${cls.grade})` : ""}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick Level Filter Pills (Tiểu học / THCS / THPT) */}
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAssignLevelFilter("ALL");
                          setAssignClassFilterId("");
                        }}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                          assignLevelFilter === "ALL"
                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50"
                        }`}
                      >
                        Mọi cấp ({levelClassCounts.ALL})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignLevelFilter("PRIMARY");
                          setAssignClassFilterId("");
                        }}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                          assignLevelFilter === "PRIMARY"
                            ? "bg-[#008B85] text-white border-[#00736E]"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50"
                        }`}
                      >
                        Tiểu học 1-5 ({levelClassCounts.PRIMARY})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignLevelFilter("MIDDLE");
                          setAssignClassFilterId("");
                        }}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                          assignLevelFilter === "MIDDLE"
                            ? "bg-[#008B85] text-white border-[#00736E]"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50"
                        }`}
                      >
                        THCS 6-9 ({levelClassCounts.MIDDLE})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignLevelFilter("HIGH");
                          setAssignClassFilterId("");
                        }}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                          assignLevelFilter === "HIGH"
                            ? "bg-[#008B85] text-white border-[#00736E]"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50"
                        }`}
                      >
                        THPT 10-12 ({levelClassCounts.HIGH})
                      </button>
                    </div>

                    {/* Quick search input inside Step 3 */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={assignClassSearch}
                        onChange={e => setAssignClassSearch(e.target.value)}
                        placeholder="Tìm nhanh lớp (VD: 1.1, 6INT, 10Compass, Khối 10)..."
                        className="w-full text-xs pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-[#008B85]"
                      />
                      {(assignClassSearch || assignClassFilterId) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAssignClassSearch("");
                            setAssignClassFilterId("");
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          title="Xóa lọc tên lớp"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Selected Classes Removable Chips (when > 0 classes selected) */}
                  {selectedBulkClassIds.length > 0 && (
                    <div className="p-2 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1.5 tabular-nums">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#003B3A]">
                          Các lớp đã tích chọn ({selectedBulkClassIds.length} lớp):
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedBulkClassIds([])}
                          className="text-[10px] font-bold text-rose-600 hover:underline"
                        >
                          Xóa hết
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-[84px] overflow-y-auto">
                        {selectedBulkClassIds.map(cid => {
                          const clsObj = assignmentClasses.find(c => c.classId === cid);
                          if (!clsObj) return null;
                          return (
                            <span
                              key={cid}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#003B3A] text-white text-[11px] font-bold"
                            >
                              {clsObj.className}
                              <button
                                type="button"
                                onClick={() => toggleBulkClassSelection(cid)}
                                className="hover:text-rose-300"
                                title="Bỏ chọn lớp này"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Smart Quick-Select Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => selectClassesByCondition("MISSING_PRIMARY")}
                      className="text-[11px] font-semibold px-2 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-all"
                    >
                      + Lớp thiếu GVBM
                    </button>
                    <button
                      type="button"
                      onClick={() => selectClassesByCondition("PRIMARY")}
                      className="text-[11px] font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                    >
                      + Cả Khối 1-5
                    </button>
                    <button
                      type="button"
                      onClick={() => selectClassesByCondition("MIDDLE")}
                      className="text-[11px] font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                    >
                      + Cả Khối 6-9
                    </button>
                    <button
                      type="button"
                      onClick={() => selectClassesByCondition("HIGH")}
                      className="text-[11px] font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                    >
                      + Cả Khối 10-12
                    </button>
                  </div>

                  {/* Compact Multi-Class Checklist inside Panel */}
                  <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 max-h-[260px] overflow-y-auto grid grid-cols-2 gap-1.5 tabular-nums">
                    {visibleAssignmentClasses.length === 0 ? (
                      <div className="col-span-2 py-6 text-center text-xs text-slate-400">
                        Không có lớp phù hợp bộ lọc
                      </div>
                    ) : (
                      visibleAssignmentClasses.map(cls => {
                        const isChecked = selectedBulkClassIds.includes(cls.classId);
                        const primaryAssigned = cls.subjects.filter((s: any) => Boolean(s.primaryTeacherId)).length;
                        const totalSubs = cls.subjects.length;

                        return (
                          <button
                            key={cls.classId}
                            type="button"
                            onClick={() => toggleBulkClassSelection(cls.classId)}
                            className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer ${
                              isChecked
                                ? "bg-[#003B3A] text-white border-[#003B3A] shadow-2xs"
                                : "bg-white hover:bg-teal-50/50 text-slate-800 border-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isChecked ? (
                                <CheckSquare className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <div className="truncate">
                                <div className="text-xs font-bold truncate">{cls.className}</div>
                                <div className={`text-[10px] truncate ${isChecked ? "text-teal-200" : "text-slate-500"}`}>
                                  {cls.campusName} • Đã gán {primaryAssigned}/{totalSubs} môn
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Sticky Bottom Footer: Step 4 Execute Buttons */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2 shrink-0">
                <label className="flex items-center gap-2 p-2 bg-teal-50/60 border border-teal-200/80 rounded-xl cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendEmailOnBulkAssign}
                    onChange={e => setSendEmailOnBulkAssign(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#003B3A] rounded shrink-0"
                  />
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#008B85] shrink-0" />
                    Gửi email thông báo cho GV ngay sau khi gán
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => handleExecuteBulkAssign(false)}
                  disabled={applyingBulk || selectedBulkClassIds.length === 0}
                  className="w-full py-2.5 px-4 bg-[#003B3A] hover:bg-[#005250] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer tabular-nums"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#00A19A]" />
                  {applyingBulk
                    ? "Đang áp dụng phân công..."
                    : `Gán phân công cho ${selectedBulkClassIds.length} lớp đã chọn`}
                </button>

                {selectedBulkClassIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleExecuteBulkAssign(true)}
                    disabled={applyingBulk}
                    className="w-full py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer tabular-nums"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Gỡ phân công của {selectedBulkClassIds.length} lớp đang chọn
                  </button>
                )}
              </div>
            </div>

            {/* ================================================================= */}
            {/* RIGHT MAIN AREA: MA TRẬN THEO LỚP HOẶC TỔNG HỢP THEO GIÁO VIÊN    */}
            {/* ================================================================= */}
            <div className="flex-1 w-full space-y-4 min-w-0">
              {/* Filter Bar for Classes / Teachers */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
                  {/* Chọn Cơ sở */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Cơ sở:</span>
                    <select
                      value={selectedCampusId}
                      onChange={e => {
                        setSelectedCampusId(e.target.value);
                        setAssignClassFilterId("");
                      }}
                      className="text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[#003B3A] focus:outline-[#008B85]"
                    >
                      <option value="">Tất cả cơ sở ({campusClassCounts.total} lớp)</option>
                      {campuses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.campusName} ({campusClassCounts.byCampusId.get(c.id) || 0} lớp)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chọn Lớp (Lọc xem hoặc mở bảng tích chọn nhiều lớp) */}
                  {assignmentViewMode === "matrix" && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-600">Lớp:</span>
                      <select
                        value={assignClassFilterId}
                        onChange={e => {
                          const val = e.target.value;
                          setAssignClassFilterId(val);
                        }}
                        className="text-xs font-bold px-3 py-2 bg-teal-50/70 border border-teal-300 rounded-xl text-[#003B3A] focus:outline-[#008B85] min-w-[175px]"
                      >
                        <option value="">
                          Tất cả các lớp ({levelFilteredAssignmentClasses.length} lớp)
                        </option>
                        {renderGroupedClassOptions(levelFilteredAssignmentClasses, {
                          idKey: "classId",
                          showTickedSet: new Set(selectedBulkClassIds),
                        })}
                      </select>
                      {assignClassFilterId && (
                        <button
                          type="button"
                          onClick={() => setAssignClassFilterId("")}
                          className="text-[11px] font-bold px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                          title="Xem lại toàn bộ các lớp"
                        >
                          Xem tất cả
                        </button>
                      )}
                    </div>
                  )}

                  <select
                    value={teacherDeptScope}
                    onChange={e => setTeacherDeptScope(e.target.value)}
                    className="text-xs font-bold px-3 py-2 bg-teal-50/70 border border-teal-300 rounded-xl text-[#003B3A] focus:outline-[#008B85] tabular-nums"
                  >
                    <option value="ALL_BP_TA">
                      GV thuộc BP Tiếng Anh ({deptTeacherCounts.totalEnglishDivCount})
                    </option>
                    {englishDepartments.length > 0 && (
                      <optgroup label="Các Tổ chuyên môn thuộc BP Tiếng Anh">
                        {englishDepartments.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({deptTeacherCounts.byDeptId.get(d.id) || 0})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Mở rộng ngoài BP Tiếng Anh">
                      <option value="ALL_SCHOOL">Toàn trường ({enrichedTeachers.length} GV)</option>
                      {otherDepartments.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({deptTeacherCounts.byDeptId.get(d.id) || 0})
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  {assignmentViewMode === "matrix" ? (
                    <>
                      <select
                        value={assignLevelFilter}
                        onChange={e => {
                          setAssignLevelFilter(e.target.value);
                          setAssignClassFilterId("");
                        }}
                        className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 focus:outline-[#008B85] tabular-nums"
                      >
                        <option value="ALL">Tất cả cấp học ({levelClassCounts.ALL} lớp)</option>
                        <option value="PRIMARY">Tiểu học • Khối 1 - 5 ({levelClassCounts.PRIMARY} lớp)</option>
                        <option value="MIDDLE">THCS • Khối 6 - 9 ({levelClassCounts.MIDDLE} lớp)</option>
                        <option value="HIGH">THPT • Khối 10 - 12 ({levelClassCounts.HIGH} lớp)</option>
                      </select>

                      <select
                        value={assignStatusFilter}
                        onChange={e => setAssignStatusFilter(e.target.value)}
                        className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 focus:outline-[#008B85]"
                      >
                        <option value="ALL">Mọi trạng thái phân công</option>
                        <option value="COMPLETE">Đã phân công đủ GVBM</option>
                        <option value="MISSING_PRIMARY">Còn thiếu GVBM</option>
                      </select>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={assignClassSearch}
                          onChange={e => setAssignClassSearch(e.target.value)}
                          placeholder="Tìm lớp hoặc tên GV..."
                          className="text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-[#008B85] w-44"
                        />
                      </div>
                    </>
                  ) : (
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOnlyAssignedTeachers}
                        onChange={e => setShowOnlyAssignedTeachers(e.target.checked)}
                        className="w-3.5 h-3.5 accent-[#003B3A] rounded"
                      />
                      Chỉ hiện giáo viên đã có lớp phân công
                    </label>
                  )}
                </div>

                {assignmentViewMode === "matrix" && visibleAssignmentClasses.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAllVisibleClasses}
                    className="text-xs font-bold px-3 py-2 bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 rounded-xl flex items-center gap-1.5 transition-all tabular-nums"
                  >
                    {visibleAssignmentClasses.every(c => selectedBulkClassIds.includes(c.classId)) ? (
                      <>
                        <CheckSquare className="w-4 h-4 text-[#008B85]" />
                        Bỏ chọn {visibleAssignmentClasses.length} lớp hiển thị
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4 text-[#008B85]" />
                        Chọn tất cả {visibleAssignmentClasses.length} lớp hiển thị
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* VIEW 1: MA TRẬN THEO LỚP HỌC (CHỈ PHÂN CÔNG GVBM) */}
              {loadingAssignments ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
                  Đang tải danh sách phân công...
                </div>
              ) : assignmentViewMode === "matrix" ? (
                visibleAssignmentClasses.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
                    Không tìm thấy lớp học CTQT nào phù hợp bộ lọc.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {visibleAssignmentClasses.map(cls => {
                      const isClassSelected = selectedBulkClassIds.includes(cls.classId);
                      const totalSubs = cls.subjects.length;
                      const primaryAssigned = cls.subjects.filter((s: any) => Boolean(s.primaryTeacherId)).length;
                      const isFullyAssigned = primaryAssigned === totalSubs && totalSubs > 0;

                      return (
                        <div
                          key={cls.classId}
                          className={`bg-white border rounded-2xl p-4 shadow-xs transition-all ${
                            isClassSelected
                              ? "border-[#008B85] border-l-4 border-l-[#003B3A] bg-teal-50/20 ring-1 ring-[#008B85]/30"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {/* Class Header Row */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-3.5">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => toggleBulkClassSelection(cls.classId)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                                  isClassSelected
                                    ? "bg-[#003B3A] text-white border-[#003B3A]"
                                    : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300"
                                }`}
                              >
                                {isClassSelected ? (
                                  <CheckSquare className="w-4 h-4 text-[#00A19A]" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400" />
                                )}
                                <span>{cls.className}</span>
                              </button>

                              <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                                {cls.campusName}
                              </span>

                              <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-[#00736E] rounded-lg border border-teal-200">
                                {cls.level === "PRIMARY"
                                  ? "Tiểu học (Khối 1 - 5)"
                                  : cls.level === "MIDDLE"
                                  ? "THCS (Khối 6 - 9)"
                                  : "THPT (Khối 10 - 12)"}
                              </span>

                              <span
                                className={`text-xs font-bold px-2.5 py-1 rounded-lg border tabular-nums ${
                                  isFullyAssigned
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : primaryAssigned > 0
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                Đã phân công GVBM: {primaryAssigned}/{totalSubs} môn
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClassId(cls.classId);
                                  setActiveTab("subject_gradebook");
                                }}
                                className="text-xs font-semibold px-2.5 py-1 text-slate-600 hover:text-[#003B3A] hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-all"
                              >
                                Mở sổ điểm lớp
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Subjects Grid inside Class Card (GVBM only) */}
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                            {cls.subjects.map((sub: any) => {
                              const hasPrimary = Boolean(sub.primaryTeacherId);
                              return (
                                <div
                                  key={sub.code}
                                  className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                                    hasPrimary
                                      ? "bg-white border-emerald-200/90"
                                      : "bg-slate-50/80 border-slate-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-[11px] font-black px-2 py-0.5 bg-[#003B3A] text-white rounded">
                                        {sub.code}
                                      </span>
                                      <span className="text-xs font-bold text-slate-800 truncate">
                                        {sub.nameVi} ({sub.nameEn})
                                      </span>
                                    </div>

                                    {sub.primaryTeacherId && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleQuickPrefillMultiClass({
                                            subjectCode: sub.code,
                                            primaryTeacherId: sub.primaryTeacherId,
                                            classIds: [cls.classId],
                                          })
                                        }
                                        className="text-[11px] font-bold text-[#008B85] hover:text-[#003B3A] hover:underline shrink-0 flex items-center gap-0.5 cursor-pointer"
                                        title="Chọn GV này để gán nhanh cho nhiều lớp khác"
                                      >
                                        Gán nhiều lớp ↗
                                      </button>
                                    )}
                                  </div>

                                  {/* GVBM Primary selector */}
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                      Giáo viên bộ môn (GVBM)
                                    </label>
                                    <select
                                      value={sub.primaryTeacherId || ""}
                                      onChange={e => {
                                        const val = e.target.value || null;
                                        setAssignmentClasses(prev =>
                                          prev.map(item =>
                                            item.classId !== cls.classId
                                              ? item
                                              : {
                                                  ...item,
                                                  subjects: item.subjects.map((s: any) =>
                                                    s.code === sub.code ? { ...s, primaryTeacherId: val } : s
                                                  ),
                                                }
                                          )
                                        );
                                      }}
                                      className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-[#008B85] tabular-nums"
                                    >
                                      <option value="">-- Chưa phân công --</option>
                                      {renderGroupedTeacherOptions(sub.primaryTeacherId, false)}
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
                )
              ) : (
                /* VIEW 2: TỔNG HỢP THEO GIÁO VIÊN (CHỌN 1 GV ĐỂ GÁN NHIỀU LỚP) */
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-700 tabular-nums">
                      Danh sách giáo viên ({teacherWorkloadList.length}) • Nhấn &ldquo;+ Chọn nhiều lớp cho GV này&rdquo; để tích chọn nhiều lớp ở cột trái
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[680px] overflow-y-auto">
                    <table className="w-full text-xs text-left border-collapse tabular-nums">
                      <thead className="bg-[#003B3A] sticky top-0 z-10 border-b text-white border-[#003B3A]">
                        <tr className="text-[11px] font-semibold whitespace-nowrap">
                          <th className="p-3 border-r border-white/15 min-w-[220px] font-semibold">Giáo viên</th>
                          <th className="p-3 border-r border-white/15 min-w-[320px] font-semibold">
                            Các lớp &amp; môn đang phụ trách (GVBM)
                          </th>
                          <th className="p-3 text-center w-[220px] font-semibold">Thao tác gán nhiều lớp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {teacherWorkloadList.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-12 text-center text-slate-400 font-semibold">
                              Không có giáo viên nào khớp bộ lọc.
                            </td>
                          </tr>
                        ) : (
                          teacherWorkloadList.map(row => {
                            const t = row.teacher;
                            const isSelectedPrimary = bulkPrimaryTeacherId === t.id;

                            return (
                              <tr
                                key={t.id}
                                className={`transition-colors ${
                                  isSelectedPrimary ? "bg-teal-50/50" : "hover:bg-slate-50"
                                }`}
                              >
                                <td className="p-3 border-r border-slate-200 align-top">
                                  <div className="font-bold text-slate-800">{t.teacherName}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Mã: <span className="font-mono font-semibold text-slate-700">{t.teacherCode}</span>
                                    {t.campus?.campusName ? ` • ${t.campus.campusName}` : ""}
                                  </div>
                                  {t.resolvedEmail ? (
                                    <div className="text-[11px] text-slate-500 truncate mt-0.5" title={t.resolvedEmail}>
                                      {t.resolvedEmail}
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                                      Chưa có địa chỉ email
                                    </div>
                                  )}
                                  {(t.englishDeptNames?.length > 0 || t.allDeptNames?.length > 0) && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {(t.englishDeptNames?.length > 0 ? t.englishDeptNames : t.allDeptNames).map(
                                        (dName: string) => (
                                          <span
                                            key={dName}
                                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-[#00736E] border border-teal-200"
                                          >
                                            {dName}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  )}
                                </td>

                                <td className="p-3 border-r border-slate-200 align-top">
                                  {row.primaryItems.length === 0 ? (
                                    <span className="text-slate-400 italic">Chưa phân công lớp</span>
                                  ) : (
                                    <div className="space-y-1.5">
                                      <div className="text-[11px] font-bold text-[#003B3A]">
                                        Đang dạy {row.primaryItems.length} lớp ({row.totalPrimarySlots} môn):
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {row.primaryItems.map(item => (
                                          <span
                                            key={item.classId}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold text-[11px]"
                                          >
                                            <strong>{item.className}</strong>
                                            <span className="text-emerald-700">({item.subjects.join(", ")})</span>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </td>

                                <td className="p-3 align-top">
                                  <div className="flex flex-col gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssignRoleMode("PRIMARY_ONLY");
                                        setBulkPrimaryTeacherId(t.id);
                                        setSelectedBulkClassIds(row.primaryItems.map(x => x.classId));
                                        setIsMultiClassDropdownOpen(true);
                                        toast.success(
                                          `Đã chọn ${t.teacherName}. Hãy tích chọn thêm các lớp ở cột trái và nhấn Gán phân công!`
                                        );
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#005250] text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                                    >
                                      + Chọn nhiều lớp cho GV này
                                    </button>
                                    {row.totalPrimarySlots > 0 && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setProgressPresetSearch(t.teacherCode || t.teacherName || "");
                                            setActiveTab("grade_progress");
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                                          title={`Xem thống kê nhập điểm của ${t.teacherName}`}
                                        >
                                          <BarChart3 className="w-3 h-3 text-[#008B85]" />
                                          Tiến độ nhập điểm
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEmailModal([t.id])}
                                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                                          title={`Gửi email thông báo phân công cho ${t.teacherName}`}
                                        >
                                          <Mail className="w-3 h-3 text-[#008B85]" />
                                          Gửi mail phân công
                                        </button>
                                      </>
                                    )}
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
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: THỐNG KÊ NHẬP ĐIỂM THEO GV PHÂN CÔNG                               */}
      {/* ========================================================================= */}
      {activeTab === "grade_progress" && (
        <CtqtGradeProgressTab
          academicYearId={selectedYearId}
          academicYearName={academicYears.find(y => y.id === selectedYearId)?.name || ""}
          semester={selectedSemester}
          campuses={campuses}
          departments={departments}
          selectedCampusId={selectedCampusId}
          onCampusChange={setSelectedCampusId}
          presetSearch={progressPresetSearch}
          onClearPresetSearch={() => setProgressPresetSearch("")}
          onOpenGradebook={({ classId, subjectCode }) => {
            setSelectedClassId(classId);
            setSelectedSubjectCode(subjectCode);
            setActiveTab("subject_gradebook");
          }}
          onOpenAssignTab={opts => {
            if (opts?.classId) {
              setAssignClassFilterId(opts.classId);
            }
            setActiveTab("assignments");
            setAssignmentViewMode("matrix");
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: QUẢN LÝ FILE & IMPORT / EXPORT                                     */}
      {/* ========================================================================= */}
      {activeTab === "excel" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Box 1: Tải File mẫu */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-teal-700 mb-2">
                <FileSpreadsheet className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-800">1. Tải File Mẫu Excel Chuẩn</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tải file mẫu Excel được tạo tự động tương ứng theo cấp học của lớp (5 Sheet cho Khối 1-5, 6 Sheet cho Khối 6-9, 7 Sheet cho Khối 10-12), đã điền sẵn danh sách học sinh từ CSDL.
              </p>

              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 tabular-nums">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Chọn Cơ sở:</label>
                    <select
                      value={selectedCampusId}
                      onChange={e => setSelectedCampusId(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 bg-white border border-slate-300 rounded-xl text-[#003B3A] focus:outline-[#008B85]"
                    >
                      <option value="">Tất cả Cơ sở ({campusClassCounts.total} lớp)</option>
                      {campuses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.campusName} ({campusClassCounts.byCampusId.get(c.id) || 0} lớp)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Chọn Lớp học:</label>
                    <select
                      value={selectedClassId}
                      onChange={e => setSelectedClassId(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 bg-white border border-teal-300 rounded-xl text-[#003B3A] focus:outline-[#008B85]"
                    >
                      {renderGroupedClassOptions(filteredClasses, { idKey: "id" })}
                    </select>
                  </div>
                </div>

                {selectedClass && (
                  <div className="text-[11px] text-slate-600 space-y-2">
                    <div>• Cấp học nhận diện: <strong className="text-teal-700">{currentConfig.levelNameVi}</strong></div>
                    <div>• Danh mục sheet xuất ra: {currentConfig.subjects.map(s => s.sheetName).join(", ")}, Core Competencies, TỔNG HỢP</div>

                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[11px] font-bold text-slate-700 mb-1.5">Hoặc tải file Excel riêng từng môn cho GVBM:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {currentConfig.subjects.map(s => (
                          <button
                            key={s.code}
                            type="button"
                            onClick={() => handleDownloadSubjectTemplate(s.code)}
                            className="text-[11px] font-semibold px-2.5 py-1 bg-white border border-slate-300 hover:bg-teal-50 hover:border-teal-300 text-slate-700 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Download className="w-3 h-3 text-teal-600" />
                            {s.nameVi} ({s.code})
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="mt-6 w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <Download className="w-4 h-4" />
              Tải File Excel Mẫu Của Lớp Này
            </button>
          </div>

          {/* Box 2: Tải lên File điểm */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-teal-700 mb-2">
                <Upload className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-800">2. Nạp File Điểm & Nhận Xét Lên Hệ Thống</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tải lên file Excel hoàn thiện của lớp. Hệ thống tự động bóc tách từng sheet môn học, tự động khớp mã học sinh, cập nhật tên tiếng Anh và đồng bộ sổ điểm tổng hợp.
              </p>

              <div className="mt-4 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-teal-500 transition-colors bg-slate-50">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <label className="cursor-pointer">
                  <span className="text-xs font-bold text-teal-600 hover:underline">Chọn file Excel (.xlsx)</span>
                  <span className="text-xs text-slate-500"> hoặc kéo thả vào đây</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="hidden"
                  />
                </label>
                <div className="text-[10px] text-slate-400 mt-2">Hỗ trợ file định dạng Excel chuẩn của trường</div>
              </div>

              {uploadingFile && (
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  Đang bóc tách dữ liệu và nạp vào hệ thống...
                </div>
              )}

              {importStats && (
                <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Đã nạp file thành công!
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    • Điểm số nạp: <strong>{importStats.grades}</strong> bản ghi
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    • Năng lực cốt lõi: <strong>{importStats.competencies}</strong> bản ghi
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    • Tên tiếng Anh: <strong>{importStats.englishNames}</strong> học sinh
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: XUẤT REPORT CARD                                                  */}
      {/* ========================================================================= */}
      {activeTab === "report_card" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 tabular-nums">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Chọn Cơ sở:</span>
                <select
                  value={selectedCampusId}
                  onChange={e => setSelectedCampusId(e.target.value)}
                  className="text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[#003B3A] focus:outline-[#008B85]"
                >
                  <option value="">Tất cả Cơ sở ({campusClassCounts.total} lớp)</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.campusName} ({campusClassCounts.byCampusId.get(c.id) || 0} lớp)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Chọn Lớp:</span>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="text-xs font-bold px-3.5 py-2 bg-teal-50 border border-teal-300 rounded-xl text-[#003B3A] focus:outline-[#008B85] min-w-[190px]"
                >
                  {renderGroupedClassOptions(filteredClasses, { idKey: "id" })}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleExportPdf()}
              disabled={generatingPdf}
              className="text-xs font-bold px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              {generatingPdf ? "Đang tạo PDF..." : "Tải Trọn Bộ PDF Cả Lớp"}
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-xs text-slate-700">
              Danh sách học sinh lớp {selectedClass?.className} • Xuất phiếu Report Card cá nhân
            </div>

            <div className="divide-y divide-slate-100">
              {consolidatedData?.students?.map((st: any, idx: number) => (
                <div key={st.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-bold text-slate-400">{idx + 1}</span>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{st.studentName}</div>
                      <div className="text-[11px] text-slate-500">
                        Mã: <span className="font-mono">{st.studentCode}</span> • English Name: <span className="font-semibold text-teal-700">{st.englishName || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExportPdf(st.id)}
                    disabled={generatingPdf}
                    className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Xuất Phiếu PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GỬI EMAIL THÔNG BÁO PHÂN CÔNG GIẢNG DẠY & ỦY QUYỀN CTQT            */}
      {/* ========================================================================= */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-white/10 rounded-xl text-[#00A19A]">
                  <Mail className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Gửi email thông báo phân công đến giáo viên
                  </h3>
                  <p className="text-xs text-teal-100/90 mt-0.5 tabular-nums">
                    Học kỳ {selectedSemester} • Hệ thống tổng hợp tự động danh sách lớp và môn phụ trách của từng giáo viên
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Scope & Role Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    1. Phạm vi giáo viên nhận thông báo
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 tabular-nums">
                    <button
                      type="button"
                      onClick={() => setEmailScopeMode("ALL_ASSIGNED")}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
                        emailScopeMode === "ALL_ASSIGNED"
                          ? "bg-teal-50/80 border-[#008B85] text-[#003B3A]"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>Tất cả giáo viên đã có phân công</span>
                      {selectedCampusId && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-teal-200 text-[#00736E]">
                          Theo cơ sở đang lọc
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEmailScopeMode("SELECTED_CLASSES")}
                      disabled={selectedBulkClassIds.length === 0}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer disabled:opacity-50 ${
                        emailScopeMode === "SELECTED_CLASSES"
                          ? "bg-teal-50/80 border-[#008B85] text-[#003B3A]"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>Chỉ giáo viên của các lớp đang tích chọn</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {selectedBulkClassIds.length} lớp
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEmailScopeMode("SELECTED_TEACHERS");
                        if (selectedEmailTeacherIds.length === 0) {
                          setSelectedEmailTeacherIds(emailCandidateTeachers.map(c => c.teacher.id));
                        }
                      }}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
                        emailScopeMode === "SELECTED_TEACHERS"
                          ? "bg-teal-50/80 border-[#008B85] text-[#003B3A]"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>Tùy chọn từng giáo viên cụ thể</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        Đã chọn {selectedEmailTeacherIds.length} GV
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      2. Lời nhắn / ghi chú kèm theo trong email (không bắt buộc)
                    </label>
                    <textarea
                      rows={4}
                      value={emailCustomMessage}
                      onChange={e => setEmailCustomMessage(e.target.value)}
                      placeholder="Nhập ghi chú thêm về thời hạn hoàn thành nhập điểm và nhận xét song ngữ..."
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-[#008B85]"
                    />
                  </div>
                </div>
              </div>

              {/* Recipient Preview & Selection Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 tabular-nums">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Danh sách giáo viên dự kiến nhận email ({emailCandidateTeachers.length})
                    </span>
                    {emailScopeMode === "SELECTED_TEACHERS" && emailCandidateTeachers.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedEmailTeacherIds(emailCandidateTeachers.map(c => c.teacher.id))
                          }
                          className="text-[11px] font-bold text-[#008B85] hover:underline cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedEmailTeacherIds([])}
                          className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={emailModalSearch}
                      onChange={e => setEmailModalSearch(e.target.value)}
                      placeholder="Tìm tên, mã, email GV..."
                      className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-[#008B85] w-48"
                    />
                  </div>
                </div>

                <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-100 tabular-nums">
                  {emailCandidateTeachers.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-semibold">
                      Chưa có giáo viên nào được phân công trong phạm vi đang chọn. Hãy lưu phân công trước khi gửi email.
                    </div>
                  ) : (
                    emailCandidateTeachers.map(item => {
                      const t = item.teacher;
                      const isChecked =
                        emailScopeMode !== "SELECTED_TEACHERS" || selectedEmailTeacherIds.includes(t.id);

                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            if (emailScopeMode !== "SELECTED_TEACHERS") {
                              setEmailScopeMode("SELECTED_TEACHERS");
                              setSelectedEmailTeacherIds(
                                emailCandidateTeachers
                                  .map(c => c.teacher.id)
                                  .filter(id => id !== t.id)
                              );
                            } else {
                              setSelectedEmailTeacherIds(prev =>
                                prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                              );
                            }
                          }}
                          className={`px-4 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                            isChecked ? "bg-white hover:bg-teal-50/30" : "bg-slate-50/60 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-[#008B85] shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                                <span>{t.teacherName}</span>
                                <span className="text-[11px] font-mono text-slate-500">({t.teacherCode})</span>
                                {t.resolvedEmail ? (
                                  <span className="text-[11px] font-semibold text-[#00736E] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    {t.resolvedEmail}
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Chưa có email
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                {item.primaryClasses.length > 0 && (
                                  <span className="text-emerald-800 font-semibold">
                                    Lớp phụ trách: {item.primaryClasses.map(c => `${c.className} (${c.subjects.join(",")})`).join("; ")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.primarySlotCount > 0 && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {item.primarySlotCount} môn GVBM
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 tabular-nums">
              <div className="text-xs text-slate-600">
                Sẽ gửi email thông báo đến{" "}
                <strong className="text-[#003B3A]">
                  {emailScopeMode === "SELECTED_TEACHERS"
                    ? selectedEmailTeacherIds.length
                    : emailCandidateTeachers.length}
                </strong>{" "}
                giáo viên trong danh sách đã chọn.
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={sendingEmails}
                  className="text-xs font-bold px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl transition-all cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSendAssignmentEmails}
                  disabled={
                    sendingEmails ||
                    (emailScopeMode === "SELECTED_TEACHERS"
                      ? selectedEmailTeacherIds.length === 0
                      : emailCandidateTeachers.length === 0)
                  }
                  className="text-xs font-bold px-5 py-2 bg-[#003B3A] hover:bg-[#005250] text-white rounded-xl flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#00A19A]" />
                  {sendingEmails ? "Đang gửi email..." : "Gửi email thông báo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
