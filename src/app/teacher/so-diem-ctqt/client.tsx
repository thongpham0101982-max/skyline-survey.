"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Download,
  Upload,
  BookOpen,
  MessageSquare,
  Layers,
  Users,
  BarChart3,
  Search,
  Clock,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  CORE_COMPETENCIES_DEF,
  CORE_COMPETENCY_RATINGS,
  CTQT_LEVEL_CONFIGS,
  detectCtqtLevel,
} from "@/lib/ctqt/config";

interface Props {
  teacher: any;
  academicYears: any[];
  activeYearId: string;
  ctqtClasses: any[];
  isSuperAdmin: boolean;
}

function getReviewStatusMeta(rawStatus?: string | null) {
  const status = (rawStatus || "DRAFT").toUpperCase();
  if (status === "APPROVED") {
    return {
      label: "Đã duyệt",
      badgeClass: "bg-emerald-50 text-[#059669] border border-emerald-200",
    };
  }
  if (status === "PENDING_REVIEW" || status === "SUBMITTED") {
    return {
      label: "Chờ duyệt",
      badgeClass: "bg-amber-50 text-[#D97706] border border-amber-200",
    };
  }
  if (status === "CHANGES_REQUESTED" || status === "REVISION_REQUESTED") {
    return {
      label: "Cần chỉnh sửa",
      badgeClass: "bg-rose-50 text-[#E11D48] border border-rose-200",
    };
  }
  return {
    label: "Bản nháp",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-200",
  };
}

function getProgressStatusMeta(
  progressStatus?: string | null,
  gradedStudents = 0,
  totalStudents = 0
) {
  const st = (progressStatus || "NOT_STARTED").toUpperCase();
  if (st === "COMPLETED" || (totalStudents > 0 && gradedStudents >= totalStudents)) {
    return {
      code: "COMPLETED",
      label: "Hoàn thành 100%",
      shortLabel: `Đủ điểm (${gradedStudents}/${totalStudents})`,
      badgeClass: "bg-emerald-50 text-[#059669] border border-emerald-200",
      activeBadgeClass: "bg-emerald-500/25 text-[#5EEAD4] border border-emerald-400/40",
      barClass: "bg-[#059669]",
      activeBarClass: "bg-[#5EEAD4]",
    };
  }
  if (st === "IN_PROGRESS" || gradedStudents > 0) {
    return {
      code: "IN_PROGRESS",
      label: "Đang nhập dở",
      shortLabel: `Đang nhập (${gradedStudents}/${totalStudents})`,
      badgeClass: "bg-amber-50 text-[#D97706] border border-amber-200",
      activeBadgeClass: "bg-amber-400/25 text-amber-200 border border-amber-300/40",
      barClass: "bg-[#D97706]",
      activeBarClass: "bg-amber-300",
    };
  }
  if (st === "NO_STUDENTS" || totalStudents === 0) {
    return {
      code: "NO_STUDENTS",
      label: "Chưa có HS",
      shortLabel: "0 HS",
      badgeClass: "bg-slate-100 text-slate-600 border border-slate-200",
      activeBadgeClass: "bg-white/15 text-slate-200 border border-white/20",
      barClass: "bg-slate-300",
      activeBarClass: "bg-white/30",
    };
  }
  return {
    code: "NOT_STARTED",
    label: "Chưa nhập điểm",
    shortLabel: `Chưa nhập (0/${totalStudents})`,
    badgeClass: "bg-rose-50 text-[#E11D48] border border-rose-200",
    activeBadgeClass: "bg-rose-500/25 text-rose-200 border border-rose-400/40",
    barClass: "bg-[#E11D48]",
    activeBarClass: "bg-rose-300",
  };
}

function formatUpdatedAtVi(iso?: string | null): string {
  if (!iso) return "Chưa nhập";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Chưa nhập";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "Chưa nhập";
  }
}

export function SoDiemCtqtTeacherClient({
  teacher,
  academicYears,
  activeYearId,
  ctqtClasses,
  isSuperAdmin,
}: Props) {
  const searchParams = useSearchParams();
  const urlTab = searchParams?.get("tab");
  const urlClassId = searchParams?.get("classId");
  const urlYearId = searchParams?.get("academicYearId");

  const [selectedYearId, setSelectedYearId] = useState(
    urlYearId || activeYearId || academicYears[0]?.id || ""
  );
  const [selectedSemester, setSelectedSemester] = useState(2);
  const [activeTab, setActiveTab] = useState<"entry" | "progress" | "review" | "consolidated">(
    urlTab === "consolidated" || urlTab === "review" || urlTab === "progress" || urlTab === "entry"
      ? (urlTab as "entry" | "progress" | "review" | "consolidated")
      : "entry"
  );

  // Assignments & slot progress data
  const [assignmentsData, setAssignmentsData] = useState<any>({
    primaryAssignments: [],
    delegatedAssignments: [],
    allClassSlots: [],
  });
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  // Filter & Tracking states for "Chọn môn học phụ trách theo GV"
  const [selectedTeacherFilterId, setSelectedTeacherFilterId] = useState<string>("ALL");
  const [subjectScopeMode, setSubjectScopeMode] = useState<"TEACHER_ONLY" | "ALL_CLASS_SUBJECTS">(
    "TEACHER_ONLY"
  );
  const [subjectProgressFilter, setSubjectProgressFilter] = useState<
    "ALL" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
  >("ALL");
  const [showInlineTracker, setShowInlineTracker] = useState<boolean>(false);

  // Progress Tab / Panel filters
  const [trackerViewMode, setTrackerViewMode] = useState<"by_teacher" | "by_slot">("by_teacher");
  const [trackerSearch, setTrackerSearch] = useState<string>("");
  const [trackerSubjectFilter, setTrackerSubjectFilter] = useState<string>("ALL");
  const [trackerStatusFilter, setTrackerStatusFilter] = useState<string>("ALL");

  // Selected for Entry Tab
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>("");
  const [subjectGradeData, setSubjectGradeData] = useState<any>(null);
  const [loadingSubjectGrades, setLoadingSubjectGrades] = useState(false);
  const [savingGrades, setSavingGrades] = useState(false);

  // Selected for Review Tab
  const [selectedReviewAssignment, setSelectedReviewAssignment] = useState<any>(null);
  const [reviewGradeData, setReviewGradeData] = useState<any>(null);
  const [loadingReviewData, setLoadingReviewData] = useState(false);
  const [actioningReview, setActioningReview] = useState(false);

  // Selected for Consolidated Tab (GVCN / Class View)
  const [consolidatedClassId, setConsolidatedClassId] = useState<string>(
    urlClassId || ctqtClasses[0]?.id || ""
  );
  const [consolidatedData, setConsolidatedData] = useState<any>(null);
  const [loadingConsolidated, setLoadingConsolidated] = useState(false);
  const [savingCompetencies, setSavingCompetencies] = useState(false);

  useEffect(() => {
    if (urlTab === "consolidated") {
      setActiveTab("consolidated");
    } else if (urlTab === "review") {
      setActiveTab("review");
    } else if (urlTab === "progress") {
      setActiveTab("progress");
    }
    if (urlClassId) {
      setConsolidatedClassId(urlClassId);
    }
  }, [urlTab, urlClassId]);

  // All class+subject slots enriched with progress and teacher info
  const allSlotsWithProgress = useMemo(() => {
    const rawSlots = Array.isArray(assignmentsData.allClassSlots)
      ? assignmentsData.allClassSlots
      : [];
    const primaryList = Array.isArray(assignmentsData.primaryAssignments)
      ? assignmentsData.primaryAssignments
      : [];

    if (rawSlots.length > 0) {
      if (!isSuperAdmin && teacher?.id) {
        // Non-admin teacher: include classes where teacher has primary assignment (all subjects of those classes so they can track class progress or filter to their own)
        const myClassIds = new Set(primaryList.map((a: any) => a.classId));
        return rawSlots.filter((s: any) => myClassIds.has(s.classId));
      }
      return rawSlots;
    }

    // Fallback if allClassSlots is empty
    if (!isSuperAdmin) return primaryList;
    const existingKeys = new Set(primaryList.map((a: any) => `${a.classId}::${a.subjectCode}`));
    const adminExtras: any[] = [];
    ctqtClasses.forEach((c: any) => {
      const lv = detectCtqtLevel(c.className, c.grade, c.level);
      const cfg = CTQT_LEVEL_CONFIGS[lv] || CTQT_LEVEL_CONFIGS.PRIMARY;
      cfg.subjects.forEach(sub => {
        const key = `${c.id}::${sub.code}`;
        if (!existingKeys.has(key)) {
          adminExtras.push({
            classId: c.id,
            subjectCode: sub.code,
            class: c,
            isAdminFallback: true,
          });
        }
      });
    });
    return [...primaryList, ...adminExtras];
  }, [
    assignmentsData.allClassSlots,
    assignmentsData.primaryAssignments,
    ctqtClasses,
    isSuperAdmin,
    teacher?.id,
  ]);

  // Live progress computation for the currently active (selectedClassId + selectedSubjectCode) from subjectGradeData
  const liveActiveSlotProgress = useMemo(() => {
    if (!subjectGradeData?.students || !selectedClassId || !selectedSubjectCode) return null;
    const students = subjectGradeData.students;
    const entries = subjectGradeData.entries || [];
    const subDef = subjectGradeData.subjectDef;
    const totalStudents = students.length;

    let gradedStudents = 0;
    let fullScoreStudents = 0;
    let commentEnStudents = 0;
    let commentViStudents = 0;

    const nonGpaCols = (subDef?.scoreColumns || []).filter((c: any) => c.key !== "gpaScore");
    const requiredCols = subDef?.isQualitative ? 1 : Math.max(1, nonGpaCols.length);

    students.forEach((st: any) => {
      const entry = entries.find((e: any) => e.studentId === st.id);
      const hasEn = Boolean(entry?.commentEn && String(entry.commentEn).trim() !== "");
      const hasVi = Boolean(entry?.commentVi && String(entry.commentVi).trim() !== "");
      if (hasEn) commentEnStudents++;
      if (hasVi) commentViStudents++;

      if (subDef?.isQualitative) {
        const hasQual =
          hasEn ||
          hasVi ||
          Boolean(entry?.assessmentContentEn && String(entry.assessmentContentEn).trim() !== "") ||
          Boolean(entry?.assessmentContentVi && String(entry.assessmentContentVi).trim() !== "");
        if (hasQual) {
          gradedStudents++;
          fullScoreStudents++;
        }
        return;
      }

      let progArr: any[] = [];
      try {
        progArr = JSON.parse(entry?.progressScores || "[]");
        if (!Array.isArray(progArr)) progArr = [];
      } catch {
        progArr = [];
      }

      let filled = 0;
      nonGpaCols.forEach((col: any) => {
        let v: any = null;
        if (col.key.startsWith("progressScores_")) {
          const idx = parseInt(col.key.split("_")[1], 10);
          v = progArr[idx];
        } else if (col.key === "midTermScore") {
          v = entry?.midTermScore;
        } else if (col.key === "endTermScore") {
          v = entry?.endTermScore;
        } else if (col.key === "ieltsScore") {
          v = entry?.ieltsScore;
        }
        if (v !== null && v !== undefined && String(v).trim() !== "" && !isNaN(Number(v))) {
          filled++;
        }
      });

      const hasGpa =
        entry?.gpaScore !== null &&
        entry?.gpaScore !== undefined &&
        String(entry.gpaScore).trim() !== "" &&
        !isNaN(Number(entry.gpaScore));

      if (filled > 0 || hasGpa) gradedStudents++;
      if (filled >= requiredCols) fullScoreStudents++;
    });

    const progressRate = totalStudents > 0 ? Math.round((gradedStudents / totalStudents) * 100) : 0;
    const fullScoreRate =
      totalStudents > 0 ? Math.round((fullScoreStudents / totalStudents) * 100) : 0;
    const commentRate =
      totalStudents > 0
        ? Math.round((Math.max(commentEnStudents, commentViStudents) / totalStudents) * 100)
        : 0;

    let progressStatus: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "NO_STUDENTS" = "NOT_STARTED";
    if (totalStudents === 0) progressStatus = "NO_STUDENTS";
    else if (gradedStudents >= totalStudents) progressStatus = "COMPLETED";
    else if (gradedStudents > 0) progressStatus = "IN_PROGRESS";

    return {
      classId: selectedClassId,
      subjectCode: selectedSubjectCode,
      totalStudents,
      gradedStudents,
      fullScoreStudents,
      commentEnStudents,
      commentViStudents,
      missingStudents: Math.max(0, totalStudents - gradedStudents),
      progressRate,
      fullScoreRate,
      commentRate,
      progressStatus,
    };
  }, [subjectGradeData, selectedClassId, selectedSubjectCode]);

  // Merge live active slot progress into allSlotsWithProgress
  const effectiveAllSlots = useMemo(() => {
    return allSlotsWithProgress.map((s: any) => {
      if (
        liveActiveSlotProgress &&
        s.classId === liveActiveSlotProgress.classId &&
        s.subjectCode === liveActiveSlotProgress.subjectCode
      ) {
        return {
          ...s,
          ...liveActiveSlotProgress,
        };
      }
      return s;
    });
  }, [allSlotsWithProgress, liveActiveSlotProgress]);

  // Teacher summary list for "Chọn môn học phụ trách theo GV" & Progress Tracking
  const teacherProgressSummaries = useMemo(() => {
    const map = new Map<
      string,
      {
        teacherId: string;
        teacherName: string;
        teacherCode: string;
        classIds: Set<string>;
        slots: any[];
        completedSlots: number;
        inProgressSlots: number;
        notStartedSlots: number;
        totalStudents: number;
        gradedStudents: number;
        fullScoreStudents: number;
        commentEnStudents: number;
        commentViStudents: number;
        progressRate: number;
        status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
      }
    >();

    effectiveAllSlots.forEach((slot: any) => {
      const tId = slot.primaryTeacherId || slot.primaryTeacher?.id;
      if (!tId) return;
      if (!map.has(tId)) {
        map.set(tId, {
          teacherId: tId,
          teacherName: slot.primaryTeacher?.teacherName || "Giáo viên",
          teacherCode: slot.primaryTeacher?.teacherCode || "",
          classIds: new Set<string>(),
          slots: [],
          completedSlots: 0,
          inProgressSlots: 0,
          notStartedSlots: 0,
          totalStudents: 0,
          gradedStudents: 0,
          fullScoreStudents: 0,
          commentEnStudents: 0,
          commentViStudents: 0,
          progressRate: 0,
          status: "NOT_STARTED",
        });
      }
      const item = map.get(tId)!;
      item.classIds.add(slot.classId);
      item.slots.push(slot);
      const st = slot.progressStatus || "NOT_STARTED";
      if (st === "COMPLETED") item.completedSlots++;
      else if (st === "IN_PROGRESS") item.inProgressSlots++;
      else if (st !== "NO_STUDENTS") item.notStartedSlots++;

      item.totalStudents += slot.totalStudents || 0;
      item.gradedStudents += slot.gradedStudents || 0;
      item.fullScoreStudents += slot.fullScoreStudents || 0;
      item.commentEnStudents += slot.commentEnStudents || 0;
      item.commentViStudents += slot.commentViStudents || 0;
    });

    return Array.from(map.values())
      .map(t => {
        const progressRate =
          t.totalStudents > 0 ? Math.round((t.gradedStudents / t.totalStudents) * 100) : 0;
        let status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" = "NOT_STARTED";
        if (t.slots.length > 0 && t.completedSlots === t.slots.length) status = "COMPLETED";
        else if (t.gradedStudents > 0 || t.completedSlots > 0) status = "IN_PROGRESS";
        return {
          ...t,
          classCount: t.classIds.size,
          slotCount: t.slots.length,
          progressRate,
          status,
        };
      })
      .sort((a, b) => a.teacherName.localeCompare(b.teacherName, "vi"));
  }, [effectiveAllSlots]);

  const unassignedSlotsCount = useMemo(() => {
    return effectiveAllSlots.filter((s: any) => !s.primaryTeacherId && !s.primaryTeacher?.id).length;
  }, [effectiveAllSlots]);

  // Slots matching the selected teacher filter ("Chọn GV phụ trách")
  const entryAssignmentOptions = useMemo(() => {
    if (selectedTeacherFilterId === "UNASSIGNED") {
      return effectiveAllSlots.filter((s: any) => !s.primaryTeacherId && !s.primaryTeacher?.id);
    }
    if (selectedTeacherFilterId !== "ALL") {
      return effectiveAllSlots.filter(
        (s: any) => (s.primaryTeacherId || s.primaryTeacher?.id) === selectedTeacherFilterId
      );
    }
    if (!isSuperAdmin && teacher?.id && subjectScopeMode === "TEACHER_ONLY") {
      const own = effectiveAllSlots.filter(
        (s: any) => (s.primaryTeacherId || s.primaryTeacher?.id) === teacher.id
      );
      if (own.length > 0) return own;
    }
    return effectiveAllSlots;
  }, [
    effectiveAllSlots,
    selectedTeacherFilterId,
    isSuperAdmin,
    teacher?.id,
    subjectScopeMode,
  ]);

  // Group available subjects for the currently selected class
  const subjectsForSelectedClass = useMemo(() => {
    if (!selectedClassId) return [];
    const basePool =
      subjectScopeMode === "ALL_CLASS_SUBJECTS" ? effectiveAllSlots : entryAssignmentOptions;
    let classSubs = basePool.filter((a: any) => a.classId === selectedClassId);
    if (classSubs.length === 0) {
      classSubs = effectiveAllSlots.filter((a: any) => a.classId === selectedClassId);
    }
    if (subjectProgressFilter !== "ALL") {
      classSubs = classSubs.filter((s: any) => {
        const meta = getProgressStatusMeta(s.progressStatus, s.gradedStudents, s.totalStudents);
        return meta.code === subjectProgressFilter;
      });
    }
    return classSubs;
  }, [
    effectiveAllSlots,
    entryAssignmentOptions,
    selectedClassId,
    subjectScopeMode,
    subjectProgressFilter,
  ]);

  // All subjects of the selected class (unfiltered by status) for summary counters
  const allSubjectsOfSelectedClass = useMemo(() => {
    if (!selectedClassId) return [];
    const basePool =
      subjectScopeMode === "ALL_CLASS_SUBJECTS" ? effectiveAllSlots : entryAssignmentOptions;
    const list = basePool.filter((a: any) => a.classId === selectedClassId);
    return list.length > 0
      ? list
      : effectiveAllSlots.filter((a: any) => a.classId === selectedClassId);
  }, [effectiveAllSlots, entryAssignmentOptions, selectedClassId, subjectScopeMode]);

  // Unique classes in Entry Tab selector (filtered by selectedTeacherFilterId)
  const uniqueEntryClasses = useMemo(() => {
    const seen = new Set<string>();
    const list: {
      classId: string;
      className: string;
      grade?: string;
      level?: string;
      slotCount: number;
      completedSlots: number;
    }[] = [];
    entryAssignmentOptions.forEach((a: any) => {
      if (a.classId && !seen.has(a.classId)) {
        seen.add(a.classId);
        const clsSlots = entryAssignmentOptions.filter((x: any) => x.classId === a.classId);
        const completed = clsSlots.filter(
          (x: any) =>
            getProgressStatusMeta(x.progressStatus, x.gradedStudents, x.totalStudents).code ===
            "COMPLETED"
        ).length;
        list.push({
          classId: a.classId,
          className: a.class?.className || "Lớp CTQT",
          grade: a.class?.grade,
          level: a.class?.level,
          slotCount: clsSlots.length,
          completedSlots: completed,
        });
      }
    });
    return list;
  }, [entryAssignmentOptions]);

  // Selected teacher summary object (when filtering by a specific GV)
  const selectedTeacherSummary = useMemo(() => {
    if (selectedTeacherFilterId === "ALL" || selectedTeacherFilterId === "UNASSIGNED") return null;
    return teacherProgressSummaries.find(t => t.teacherId === selectedTeacherFilterId) || null;
  }, [teacherProgressSummaries, selectedTeacherFilterId]);

  // Overall progress summary for the currently active scope
  const activeScopeSummary = useMemo(() => {
    const pool = entryAssignmentOptions;
    const totalSlots = pool.length;
    let completedSlots = 0;
    let inProgressSlots = 0;
    let notStartedSlots = 0;
    let approvedSlots = 0;
    let totalStudents = 0;
    let gradedStudents = 0;

    pool.forEach((s: any) => {
      const meta = getProgressStatusMeta(s.progressStatus, s.gradedStudents, s.totalStudents);
      if (meta.code === "COMPLETED") completedSlots++;
      else if (meta.code === "IN_PROGRESS") inProgressSlots++;
      else if (meta.code === "NOT_STARTED") notStartedSlots++;
      if ((s.status || s.reviewStatus || "").toUpperCase() === "APPROVED") approvedSlots++;
      totalStudents += s.totalStudents || 0;
      gradedStudents += s.gradedStudents || 0;
    });

    const overallRate = totalStudents > 0 ? Math.round((gradedStudents / totalStudents) * 100) : 0;

    return {
      totalSlots,
      completedSlots,
      inProgressSlots,
      notStartedSlots,
      approvedSlots,
      totalStudents,
      gradedStudents,
      overallRate,
    };
  }, [entryAssignmentOptions]);

  // Filtered teachers & slots for the Progress Tracking tab / panel
  const filteredTrackerTeachers = useMemo(() => {
    const q = trackerSearch.trim().toLowerCase();
    return teacherProgressSummaries
      .map(t => {
        if (
          selectedTeacherFilterId !== "ALL" &&
          selectedTeacherFilterId !== "UNASSIGNED" &&
          t.teacherId !== selectedTeacherFilterId
        ) {
          return null;
        }
        const matchingSlots = t.slots.filter((s: any) => {
          if (trackerSubjectFilter !== "ALL" && s.subjectCode !== trackerSubjectFilter) return false;
          if (trackerStatusFilter !== "ALL") {
            const code = getProgressStatusMeta(
              s.progressStatus,
              s.gradedStudents,
              s.totalStudents
            ).code;
            if (trackerStatusFilter === "INCOMPLETE") {
              if (code !== "IN_PROGRESS" && code !== "NOT_STARTED") return false;
            } else if (code !== trackerStatusFilter) {
              return false;
            }
          }
          if (q) {
            const mName = (t.teacherName || "").toLowerCase().includes(q);
            const mCode = (t.teacherCode || "").toLowerCase().includes(q);
            const mCls = (s.class?.className || "").toLowerCase().includes(q);
            const mSub = (s.subjectCode || "").toLowerCase().includes(q);
            if (!mName && !mCode && !mCls && !mSub) return false;
          }
          return true;
        });
        if (matchingSlots.length === 0) return null;
        return {
          ...t,
          matchingSlots,
        };
      })
      .filter(Boolean) as any[];
  }, [
    teacherProgressSummaries,
    selectedTeacherFilterId,
    trackerSubjectFilter,
    trackerStatusFilter,
    trackerSearch,
  ]);

  const filteredTrackerSlots = useMemo(() => {
    const q = trackerSearch.trim().toLowerCase();
    return effectiveAllSlots.filter((s: any) => {
      const tId = s.primaryTeacherId || s.primaryTeacher?.id || "";
      if (selectedTeacherFilterId === "UNASSIGNED" && tId) return false;
      if (
        selectedTeacherFilterId !== "ALL" &&
        selectedTeacherFilterId !== "UNASSIGNED" &&
        tId !== selectedTeacherFilterId
      ) {
        return false;
      }
      if (trackerSubjectFilter !== "ALL" && s.subjectCode !== trackerSubjectFilter) return false;
      if (trackerStatusFilter !== "ALL") {
        const code = getProgressStatusMeta(
          s.progressStatus,
          s.gradedStudents,
          s.totalStudents
        ).code;
        if (trackerStatusFilter === "INCOMPLETE") {
          if (code !== "IN_PROGRESS" && code !== "NOT_STARTED") return false;
        } else if (code !== trackerStatusFilter) {
          return false;
        }
      }
      if (q) {
        const mCls = (s.class?.className || "").toLowerCase().includes(q);
        const mSub = (s.subjectCode || "").toLowerCase().includes(q);
        const mTeacher =
          (s.primaryTeacher?.teacherName || "").toLowerCase().includes(q) ||
          (s.primaryTeacher?.teacherCode || "").toLowerCase().includes(q);
        if (!mCls && !mSub && !mTeacher) return false;
      }
      return true;
    });
  }, [
    effectiveAllSlots,
    selectedTeacherFilterId,
    trackerSubjectFilter,
    trackerStatusFilter,
    trackerSearch,
  ]);

  // Helper to jump directly to a specific (classId, subjectCode) gradebook in Entry Tab
  const handleSelectSlotForEntry = (cId: string, subCode: string, teacherId?: string | null) => {
    if (teacherId && selectedTeacherFilterId !== "ALL" && selectedTeacherFilterId !== teacherId) {
      setSelectedTeacherFilterId(teacherId);
    }
    setSelectedClassId(cId);
    setSelectedSubjectCode(subCode);
    setActiveTab("entry");
  };

  // Fetch teacher's CTQT assignments
  const fetchTeacherAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await fetch(
        `/api/teacher/ctqt/grades?action=getTeacherAssignments&academicYearId=${selectedYearId}&semester=${selectedSemester}`
      );
      const data = await res.json();
      if (data.success) {
        setAssignmentsData(data.data);
        const primaries = data.data.primaryAssignments || [];
        if (primaries.length > 0) {
          const stillValid = primaries.some(
            (a: any) => a.classId === selectedClassId && a.subjectCode === selectedSubjectCode
          );
          if (!stillValid) {
            setSelectedClassId(primaries[0].classId);
            setSelectedSubjectCode(primaries[0].subjectCode);
          }
        } else if (isSuperAdmin && ctqtClasses.length > 0 && !selectedClassId) {
          const firstCls = ctqtClasses[0];
          const lv = detectCtqtLevel(firstCls.className, firstCls.grade, firstCls.level);
          setSelectedClassId(firstCls.id);
          setSelectedSubjectCode(CTQT_LEVEL_CONFIGS[lv]?.subjects?.[0]?.code || "ENG");
        }
        if (data.data.delegatedAssignments?.length > 0 && !selectedReviewAssignment) {
          setSelectedReviewAssignment(data.data.delegatedAssignments[0]);
        }
      }
    } catch {
      toast.error("Không thể tải danh sách phân công CTQT");
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    fetchTeacherAssignments();
  }, [selectedYearId, selectedSemester]);

  // Load subject grade data for Entry tab
  const fetchSubjectGrades = async () => {
    if (!selectedClassId || !selectedSubjectCode) return;
    setLoadingSubjectGrades(true);
    try {
      const res = await fetch(
        `/api/teacher/ctqt/grades?classId=${selectedClassId}&subjectCode=${selectedSubjectCode}&academicYearId=${selectedYearId}&semester=${selectedSemester}`
      );
      const data = await res.json();
      if (data.success) {
        setSubjectGradeData(data.data);
      } else {
        toast.error(data.error || "Không thể tải bảng điểm môn");
      }
    } catch {
      toast.error("Lỗi tải dữ liệu điểm bộ môn");
    } finally {
      setLoadingSubjectGrades(false);
    }
  };

  useEffect(() => {
    if (activeTab === "entry" && selectedClassId && selectedSubjectCode) {
      fetchSubjectGrades();
    }
  }, [activeTab, selectedClassId, selectedSubjectCode, selectedYearId, selectedSemester]);

  // Load review grade data for Review tab
  const fetchReviewGrades = async () => {
    if (!selectedReviewAssignment) return;
    setLoadingReviewData(true);
    try {
      const res = await fetch(
        `/api/teacher/ctqt/grades?classId=${selectedReviewAssignment.classId}&subjectCode=${selectedReviewAssignment.subjectCode}&academicYearId=${selectedYearId}&semester=${selectedSemester}`
      );
      const data = await res.json();
      if (data.success) {
        setReviewGradeData(data.data);
      }
    } catch {
      toast.error("Lỗi tải dữ liệu rà soát");
    } finally {
      setLoadingReviewData(false);
    }
  };

  useEffect(() => {
    if (activeTab === "review" && selectedReviewAssignment) {
      fetchReviewGrades();
    }
  }, [activeTab, selectedReviewAssignment, selectedYearId, selectedSemester]);

  // Load consolidated grades for Consolidated Tab
  const fetchConsolidatedGrades = async () => {
    if (!consolidatedClassId) return;
    setLoadingConsolidated(true);
    try {
      const res = await fetch(
        `/api/admin/ctqt/grades?classId=${consolidatedClassId}&academicYearId=${selectedYearId}&semester=${selectedSemester}`
      );
      const data = await res.json();
      if (data.success) {
        setConsolidatedData(data.data);
      }
    } catch {
      toast.error("Lỗi tải sổ điểm tổng hợp");
    } finally {
      setLoadingConsolidated(false);
    }
  };

  useEffect(() => {
    if (activeTab === "consolidated" && consolidatedClassId) {
      fetchConsolidatedGrades();
    }
  }, [activeTab, consolidatedClassId, selectedYearId, selectedSemester]);

  // Helper to update a student's score/comment in Entry Tab (with MIDDLE GPA auto-calculation matching Admin)
  const updateEntryField = (studentId: string, field: string, rawValue: any, progIdx?: number) => {
    if (!subjectGradeData) return;

    if (field === "englishName") {
      const updatedStudents = subjectGradeData.students.map((s: any) =>
        s.id === studentId ? { ...s, englishName: rawValue } : s
      );
      setSubjectGradeData({ ...subjectGradeData, students: updatedStudents });
      return;
    }

    const updatedEntries = [...(subjectGradeData.entries || [])];
    const existingIdx = updatedEntries.findIndex((x: any) => x.studentId === studentId);
    const current = existingIdx >= 0 ? { ...updatedEntries[existingIdx] } : { studentId };

    let progArr: any[] = [];
    try {
      progArr = JSON.parse(current.progressScores || "[]");
      if (!Array.isArray(progArr)) progArr = [];
    } catch {
      progArr = [];
    }

    if (field === "progressScores" && typeof progIdx === "number") {
      const parsed = rawValue === "" ? null : parseFloat(rawValue);
      progArr[progIdx] = parsed !== null && !isNaN(parsed) ? parsed : null;
      current.progressScores = JSON.stringify(progArr);
    } else if (
      field === "midTermScore" ||
      field === "endTermScore" ||
      field === "gpaScore" ||
      field === "ieltsScore"
    ) {
      const parsed = rawValue === "" ? null : parseFloat(rawValue);
      current[field] = parsed !== null && !isNaN(parsed) ? parsed : null;
    } else {
      current[field] = rawValue;
    }

    // Auto-calculate GPA for MIDDLE level quantitative subjects (same formula as Admin)
    const currentLv = subjectGradeData.level;
    const subDef = subjectGradeData.subjectDef;
    if (currentLv === "MIDDLE" && !subDef?.isQualitative && field !== "commentEn" && field !== "commentVi") {
      const pVals = progArr
        .filter((v: any) => v !== "" && v !== null && v !== undefined && !isNaN(Number(v)))
        .map(Number);
      const mVal =
        current.midTermScore !== "" && current.midTermScore !== null && current.midTermScore !== undefined && !isNaN(Number(current.midTermScore))
          ? Number(current.midTermScore)
          : null;
      const eVal =
        current.endTermScore !== "" && current.endTermScore !== null && current.endTermScore !== undefined && !isNaN(Number(current.endTermScore))
          ? Number(current.endTermScore)
          : null;

      const scores: number[] = [...pVals];
      if (mVal !== null) scores.push(mVal, mVal);
      if (eVal !== null) scores.push(eVal, eVal);
      current.gpaScore =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null;
    }

    if (existingIdx >= 0) {
      updatedEntries[existingIdx] = current;
    } else {
      updatedEntries.push(current);
    }

    setSubjectGradeData({ ...subjectGradeData, entries: updatedEntries });
  };

  // Summary statistics for Entry Tab footer (matching Admin Subject Gradebook)
  const entryStats = useMemo(() => {
    if (!subjectGradeData?.students || subjectGradeData.students.length === 0) {
      return { total: 0, hasScore: 0, avg: 0, max: 0, min: 0 };
    }
    const students = subjectGradeData.students;
    const lv = subjectGradeData.level;
    const subDef = subjectGradeData.subjectDef;
    let scoreSum = 0;
    let scoreCount = 0;
    let max = -Infinity;
    let min = Infinity;
    let hasScoreCount = 0;

    students.forEach((st: any) => {
      const g = subjectGradeData.entries?.find((e: any) => e.studentId === st.id);
      if (!g) return;
      let repScore: number | null = null;
      if (lv === "PRIMARY") {
        if (g.endTermScore !== null && g.endTermScore !== undefined) repScore = Number(g.endTermScore);
        else if (g.midTermScore !== null && g.midTermScore !== undefined) repScore = Number(g.midTermScore);
      } else if (lv === "MIDDLE") {
        if (g.gpaScore !== null && g.gpaScore !== undefined) repScore = Number(g.gpaScore);
        else if (g.endTermScore !== null && g.endTermScore !== undefined) repScore = Number(g.endTermScore);
      } else if (lv === "HIGH") {
        if (subDef?.code === "IELTS") {
          if (g.ieltsScore !== null && g.ieltsScore !== undefined) repScore = Number(g.ieltsScore);
        } else if (g.midTermScore !== null && g.midTermScore !== undefined) {
          repScore = Number(g.midTermScore);
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
  }, [subjectGradeData]);

  // Save Subject Grades (Draft or Submit Review)
  const handleSaveGrades = async (isSubmitReview = false) => {
    if (!subjectGradeData?.students || !selectedClassId || !selectedSubjectCode) return;
    setSavingGrades(true);
    try {
      const entries = subjectGradeData.students.map((st: any) => {
        const existing = subjectGradeData.entries?.find((e: any) => e.studentId === st.id) || {};
        return {
          studentId: st.id,
          englishName: st.englishName !== undefined ? st.englishName : null,
          progressScores: existing.progressScores || null,
          midTermScore: existing.midTermScore !== undefined ? existing.midTermScore : null,
          endTermScore: existing.endTermScore !== undefined ? existing.endTermScore : null,
          gpaScore: existing.gpaScore !== undefined ? existing.gpaScore : null,
          assessmentContentEn: existing.assessmentContentEn || null,
          assessmentContentVi: existing.assessmentContentVi || null,
          ieltsScore: existing.ieltsScore !== undefined ? existing.ieltsScore : null,
          commentEn: existing.commentEn || null,
          commentVi: existing.commentVi || null,
        };
      });

      const res = await fetch("/api/teacher/ctqt/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isSubmitReview ? "submitReview" : "saveDraft",
          academicYearId: selectedYearId,
          semester: selectedSemester,
          classId: selectedClassId,
          subjectCode: selectedSubjectCode,
          entries,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchSubjectGrades();
        fetchTeacherAssignments();
      } else {
        toast.error(data.error || "Không thể lưu bảng điểm");
      }
    } catch {
      toast.error("Lỗi kết nối khi lưu bảng điểm");
    } finally {
      setSavingGrades(false);
    }
  };

  // Review Action: Approve or Request Changes
  const handleReviewAction = async (action: "approve" | "requestChanges") => {
    if (!selectedReviewAssignment) return;
    let reviewerNote = "";
    if (action === "requestChanges") {
      const input = prompt("Nhập nội dung yêu cầu GVBM chỉnh sửa:");
      if (!input) return;
      reviewerNote = input;
    }

    setActioningReview(true);
    try {
      const entries = reviewGradeData?.students?.map((st: any) => {
        const e = reviewGradeData.entries?.find((x: any) => x.studentId === st.id) || {};
        return {
          studentId: st.id,
          commentEn: e.commentEn,
          commentVi: e.commentVi,
        };
      });

      const res = await fetch("/api/teacher/ctqt/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          classId: selectedReviewAssignment.classId,
          subjectCode: selectedReviewAssignment.subjectCode,
          academicYearId: selectedYearId,
          semester: selectedSemester,
          reviewerNote,
          entries,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchReviewGrades();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setActioningReview(false);
    }
  };

  // Save Core Competencies
  const handleSaveCompetencies = async () => {
    if (!consolidatedData?.students || !consolidatedClassId) return;
    setSavingCompetencies(true);
    try {
      const competencies = consolidatedData.students.map((st: any) => {
        const c = consolidatedData.competencies?.find((x: any) => x.studentId === st.id) || {};
        return {
          studentId: st.id,
          englishName: st.englishName !== undefined ? st.englishName : null,
          communication: c.communication || "E",
          collaboration: c.collaboration || "E",
          responsibility: c.responsibility || "E",
          criticalThinking: c.criticalThinking || "E",
          creativity: c.creativity || "E",
          problemSolving: c.problemSolving || "E",
        };
      });

      const res = await fetch("/api/teacher/ctqt/competencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: consolidatedClassId,
          academicYearId: selectedYearId,
          semester: selectedSemester,
          competencies,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchConsolidatedGrades();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSavingCompetencies(false);
    }
  };

  const hasDelegatedReviews =
    (assignmentsData.delegatedAssignments?.length || 0) > 0 || isSuperAdmin || activeTab === "review";

  const entryLevel = subjectGradeData?.level || "PRIMARY";
  const entryLevelConfig = CTQT_LEVEL_CONFIGS[entryLevel as "PRIMARY" | "MIDDLE" | "HIGH"] || CTQT_LEVEL_CONFIGS.PRIMARY;
  const entrySubjectDef = subjectGradeData?.subjectDef;
  const reviewerNoteBanner = useMemo(() => {
    const noted = subjectGradeData?.entries?.find(
      (e: any) =>
        (e.reviewStatus === "CHANGES_REQUESTED" || e.reviewStatus === "REVISION_REQUESTED") &&
        e.reviewerNote
    );
    return noted || null;
  }, [subjectGradeData?.entries]);

  return (
    <div className="space-y-5 pb-20">
      {/* Top Masthead Card — Sky-Line Academic Ledger */}
      <div className="bg-white border border-[#E2E8F0] border-l-4 border-l-[#003B3A] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-[#003B3A] text-white rounded-xl shadow-xs shrink-0">
              <Globe className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#003B3A] tracking-tight flex flex-wrap items-center gap-2">
                Sổ điểm Chương trình Quốc tế (CTQT)
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#00736E] border border-teal-200">
                  Bilingual / International
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-600 mt-0.5">
                Nhập điểm, nhận xét song ngữ theo môn học và quản lý sổ điểm tổng hợp Chương trình Quốc tế.
              </p>
            </div>
          </div>

          {/* Academic Year & Semester selector */}
          <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
            <select
              value={selectedYearId}
              onChange={e => setSelectedYearId(e.target.value)}
              className="text-xs font-bold px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-slate-800 focus:outline-[#008B85]"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>
                  Năm học: {y.name}
                </option>
              ))}
            </select>

            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setSelectedSemester(1)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedSemester === 1
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Học kỳ 1
              </button>
              <button
                type="button"
                onClick={() => setSelectedSemester(2)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedSemester === 2
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Học kỳ 2
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-b border-[#E2E8F0] overflow-x-auto no-scrollbar tabular-nums">
          <button
            type="button"
            onClick={() => setActiveTab("entry")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "entry"
                ? "border-[#008B85] text-[#00736E]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            1. Sổ điểm theo Môn (GVBM)
            {assignmentsData.primaryAssignments?.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-50 text-[#00736E] border border-teal-200 font-bold">
                {assignmentsData.primaryAssignments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("progress")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "progress"
                ? "border-[#008B85] text-[#00736E]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            2. Theo dõi nhập điểm các môn theo GV
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                activeScopeSummary.completedSlots === activeScopeSummary.totalSlots &&
                activeScopeSummary.totalSlots > 0
                  ? "bg-emerald-50 text-[#059669] border-emerald-200"
                  : "bg-teal-50 text-[#00736E] border-teal-200"
              }`}
            >
              {activeScopeSummary.completedSlots}/{activeScopeSummary.totalSlots} môn
            </span>
          </button>

          {hasDelegatedReviews && (
            <button
              type="button"
              onClick={() => setActiveTab("review")}
              className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "review"
                  ? "border-[#008B85] text-[#00736E]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              3. Rà soát nhận xét song ngữ (GVTA)
              {assignmentsData.delegatedAssignments?.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-[#D97706] border border-amber-200 font-bold">
                  {assignmentsData.delegatedAssignments.length}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("consolidated")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "consolidated"
                ? "border-[#008B85] text-[#00736E]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            {hasDelegatedReviews ? "4." : "3."} Sổ điểm Tổng hợp & Năng lực cốt lõi (GVCN)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SỔ ĐIỂM THEO MÔN (GVBM) — ĐỒNG BỘ GIAO DIỆN ADMIN                 */}
      {/* ========================================================================= */}
      {activeTab === "entry" && (
        <div className="space-y-4">
          {/* Teacher & Class Selector + Excel / Save Action Strip */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 tabular-nums">
              {/* Chọn GV phụ trách (GVBM) */}
              {teacherProgressSummaries.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#008B85]" />
                    Chọn GV phụ trách:
                  </label>
                  <select
                    value={selectedTeacherFilterId}
                    onChange={e => {
                      const nextTeacherId = e.target.value;
                      setSelectedTeacherFilterId(nextTeacherId);
                      setSubjectProgressFilter("ALL");
                      if (nextTeacherId === "ALL") return;

                      const pool =
                        nextTeacherId === "UNASSIGNED"
                          ? effectiveAllSlots.filter(
                              (s: any) => !s.primaryTeacherId && !s.primaryTeacher?.id
                            )
                          : effectiveAllSlots.filter(
                              (s: any) =>
                                (s.primaryTeacherId || s.primaryTeacher?.id) === nextTeacherId
                            );

                      if (pool.length > 0) {
                        const stillInClass = pool.filter((s: any) => s.classId === selectedClassId);
                        if (stillInClass.length > 0) {
                          if (!stillInClass.some((s: any) => s.subjectCode === selectedSubjectCode)) {
                            setSelectedSubjectCode(stillInClass[0].subjectCode);
                          }
                        } else {
                          setSelectedClassId(pool[0].classId);
                          setSelectedSubjectCode(pool[0].subjectCode);
                        }
                      }
                    }}
                    className="text-xs font-bold px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-[#003B3A] focus:outline-[#008B85] max-w-[310px]"
                  >
                    <option value="ALL">
                      Tất cả GV phụ trách ({teacherProgressSummaries.length} GV •{" "}
                      {assignmentsData.primaryAssignments?.length || effectiveAllSlots.length} môn)
                    </option>
                    {teacher?.id &&
                      teacherProgressSummaries.some(t => t.teacherId === teacher.id) && (
                        <option value={teacher.id}>
                          ★ Môn tôi phụ trách — {teacher.teacherName}
                        </option>
                      )}
                    <optgroup label="Chọn Giáo viên bộ môn (GVBM)">
                      {teacherProgressSummaries.map(t => (
                        <option key={t.teacherId} value={t.teacherId}>
                          {t.teacherName}
                          {t.teacherCode ? ` (${t.teacherCode})` : ""} — {t.classCount} lớp •{" "}
                          {t.slotCount} môn (Đủ điểm: {t.completedSlots}/{t.slotCount} •{" "}
                          {t.progressRate}%)
                        </option>
                      ))}
                    </optgroup>
                    {unassignedSlotsCount > 0 && (
                      <option value="UNASSIGNED">
                        Chưa phân công GVBM ({unassignedSlotsCount} môn)
                      </option>
                    )}
                  </select>
                </div>
              )}

              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Chọn Lớp:</label>
              {loadingAssignments ? (
                <span className="text-xs text-slate-500">Đang tải phân công...</span>
              ) : uniqueEntryClasses.length === 0 ? (
                <span className="text-xs text-slate-500 italic">
                  Bạn chưa được phân công môn học CTQT nào trong học kỳ này.
                </span>
              ) : (
                <>
                  <select
                    value={selectedClassId}
                    onChange={e => {
                      const nextClassId = e.target.value;
                      setSelectedClassId(nextClassId);
                      const classSubs = entryAssignmentOptions.filter(
                        (a: any) => a.classId === nextClassId
                      );
                      if (
                        classSubs.length > 0 &&
                        !classSubs.some((a: any) => a.subjectCode === selectedSubjectCode)
                      ) {
                        setSelectedSubjectCode(classSubs[0].subjectCode);
                      }
                    }}
                    className="text-xs font-bold px-3.5 py-2 bg-teal-50/70 border border-teal-300 rounded-xl text-[#003B3A] focus:outline-[#008B85] min-w-[185px]"
                  >
                    {uniqueEntryClasses.map(c => (
                      <option key={c.classId} value={c.classId}>
                        Lớp {c.className} ({c.completedSlots}/{c.slotCount} môn hoàn thành)
                      </option>
                    ))}
                  </select>

                  {subjectGradeData?.class && (
                    <span className="text-xs font-semibold px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] text-slate-700 rounded-xl">
                      {entryLevelConfig.levelNameVi} ({allSubjectsOfSelectedClass.length} môn phụ trách)
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Action Buttons matching Admin */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={!selectedClassId || !selectedSubjectCode}
                onClick={() => {
                  if (!selectedClassId || !selectedSubjectCode) return;
                  window.open(
                    `/api/admin/ctqt/excel?classId=${selectedClassId}&academicYearId=${selectedYearId}&semester=${selectedSemester}&subjectCode=${selectedSubjectCode}`,
                    "_blank"
                  );
                }}
                className="text-xs font-bold px-3 py-2 bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] text-slate-700 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                title="Tải file Excel mẫu riêng môn này"
              >
                <Download className="w-3.5 h-3.5" />
                Tải Excel môn này
              </button>

              <label className="text-xs font-bold px-3 py-2 bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] text-slate-700 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Nạp Excel môn này
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file || !selectedClassId) return;
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
                      const d = await res.json();
                      if (d.success) {
                        toast.success(d.message || "Đã nạp file Excel thành công");
                        fetchSubjectGrades();
                        fetchTeacherAssignments();
                      } else {
                        toast.error(d.error || "Không thể nạp file Excel");
                      }
                    } catch {
                      toast.error("Lỗi kết nối khi nạp file Excel");
                    } finally {
                      e.target.value = "";
                    }
                  }}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => handleSaveGrades(false)}
                disabled={savingGrades || !subjectGradeData}
                className="text-xs font-bold px-3.5 py-2 bg-white hover:bg-teal-50 border border-teal-300 text-[#003B3A] rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-[#008B85]" />
                {savingGrades ? "Đang lưu..." : "Lưu nháp"}
              </button>

              <button
                type="button"
                onClick={() => handleSaveGrades(true)}
                disabled={savingGrades || !subjectGradeData}
                className="text-xs font-bold px-4 py-2 bg-[#003B3A] hover:bg-[#005250] text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-[#5EEAD4]" />
                Hoàn tất & gửi duyệt
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* KHU VỰC: CHỌN MÔN HỌC PHỤ TRÁCH THEO GV & THEO DÕI NHẬP ĐIỂM CÁC MÔN */}
          {/* ================================================================= */}
          {allSubjectsOfSelectedClass.length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs space-y-3.5">
              {/* Header row: Title + Summary Badges + Scope/Status Filter Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
                <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
                  <div className="text-xs md:text-sm font-black text-[#003B3A] flex items-center gap-2">
                    <span>Chọn môn học phụ trách để nhập điểm và nhận xét:</span>
                  </div>

                  {/* Summary Progress Strip of Subjects in Current View */}
                  {(() => {
                    const totalSubs = allSubjectsOfSelectedClass.length;
                    const doneSubs = allSubjectsOfSelectedClass.filter(
                      (s: any) =>
                        getProgressStatusMeta(s.progressStatus, s.gradedStudents, s.totalStudents)
                          .code === "COMPLETED"
                    ).length;
                    const inProgSubs = allSubjectsOfSelectedClass.filter(
                      (s: any) =>
                        getProgressStatusMeta(s.progressStatus, s.gradedStudents, s.totalStudents)
                          .code === "IN_PROGRESS"
                    ).length;
                    const notStartedSubs = allSubjectsOfSelectedClass.filter(
                      (s: any) =>
                        getProgressStatusMeta(s.progressStatus, s.gradedStudents, s.totalStudents)
                          .code === "NOT_STARTED"
                    ).length;

                    return (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200">
                          Hoàn thành: {doneSubs}/{totalSubs} môn
                        </span>
                        {inProgSubs > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-[#D97706] border border-amber-200">
                            Đang nhập: {inProgSubs} môn
                          </span>
                        )}
                        {notStartedSubs > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-[#E11D48] border border-rose-200">
                            Chưa nhập: {notStartedSubs} môn
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Right Controls: Scope Switcher + Status Filter + Inline Tracker Toggle */}
                <div className="flex flex-wrap items-center gap-2 tabular-nums">
                  {/* Nếu đang chọn 1 GV cụ thể hoặc tài khoản GV, cho phép chuyển giữa "Môn theo GV" và "Tất cả môn của Lớp" */}
                  {(selectedTeacherFilterId !== "ALL" || (!isSuperAdmin && teacher?.id)) && (
                    <div className="inline-flex p-0.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setSubjectScopeMode("TEACHER_ONLY")}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          subjectScopeMode === "TEACHER_ONLY"
                            ? "bg-[#003B3A] text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Môn theo GV đang chọn
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubjectScopeMode("ALL_CLASS_SUBJECTS")}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          subjectScopeMode === "ALL_CLASS_SUBJECTS"
                            ? "bg-[#003B3A] text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Tất cả môn của lớp
                      </button>
                    </div>
                  )}

                  {/* Lọc theo trạng thái tiến độ nhập điểm */}
                  <select
                    value={subjectProgressFilter}
                    onChange={e => setSubjectProgressFilter(e.target.value as any)}
                    className="text-xs font-semibold px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-700 focus:outline-[#008B85]"
                  >
                    <option value="ALL">Tất cả tiến độ ({allSubjectsOfSelectedClass.length})</option>
                    <option value="NOT_STARTED">Chưa nhập điểm</option>
                    <option value="IN_PROGRESS">Đang nhập dở</option>
                    <option value="COMPLETED">Hoàn thành 100%</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowInlineTracker(prev => !prev)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                      showInlineTracker
                        ? "bg-teal-50 text-[#00736E] border-teal-300"
                        : "bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 border-[#E2E8F0]"
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-[#008B85]" />
                    <span>Theo dõi tiến độ theo GV</span>
                    {showInlineTracker ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Dải các Lớp - Môn phụ trách của GV đang chọn (khi lọc theo 1 GV cụ thể) */}
              {selectedTeacherSummary && selectedTeacherSummary.slots.length > 0 && (
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 space-y-2 tabular-nums">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#003B3A]">
                        GV phụ trách đang chọn: {selectedTeacherSummary.teacherName}
                        {selectedTeacherSummary.teacherCode
                          ? ` (${selectedTeacherSummary.teacherCode})`
                          : ""}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 font-medium">
                        Phụ trách{" "}
                        <strong className="text-slate-900">
                          {selectedTeacherSummary.classCount} lớp / {selectedTeacherSummary.slotCount}{" "}
                          môn
                        </strong>
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 font-medium">
                        Đã nhập điểm:{" "}
                        <strong className="text-[#00736E]">
                          {selectedTeacherSummary.gradedStudents}/
                          {selectedTeacherSummary.totalStudents} lượt HS (
                          {selectedTeacherSummary.progressRate}%)
                        </strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTeacherFilterId("ALL")}
                      className="text-[11px] font-semibold text-[#00736E] hover:underline cursor-pointer"
                    >
                      Xem tất cả giáo viên
                    </button>
                  </div>

                  {/* Chips chuyển nhanh giữa tất cả các Lớp - Môn của GV này */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedTeacherSummary.slots.map((slot: any) => {
                      const isCurrentSlot =
                        slot.classId === selectedClassId &&
                        slot.subjectCode === selectedSubjectCode;
                      const progMeta = getProgressStatusMeta(
                        slot.progressStatus,
                        slot.gradedStudents,
                        slot.totalStudents
                      );
                      return (
                        <button
                          key={`${slot.classId}::${slot.subjectCode}`}
                          type="button"
                          onClick={() => {
                            setSelectedClassId(slot.classId);
                            setSelectedSubjectCode(slot.subjectCode);
                          }}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                            isCurrentSlot
                              ? "bg-[#003B3A] text-white border-[#003B3A] shadow-2xs"
                              : "bg-white hover:bg-teal-50/60 text-slate-700 border-[#E2E8F0]"
                          }`}
                        >
                          <span>{slot.class?.className || "Lớp"}</span>
                          <span className={isCurrentSlot ? "text-[#5EEAD4]" : "text-[#00736E]"}>
                            • {slot.subjectCode}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              isCurrentSlot ? progMeta.activeBadgeClass : progMeta.badgeClass
                            }`}
                          >
                            {slot.gradedStudents ?? 0}/{slot.totalStudents ?? 0} HS
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Subject Progress Cards Grid */}
              {subjectsForSelectedClass.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 font-medium">
                  Không có môn học nào khớp với bộ lọc tiến độ đang chọn.{" "}
                  <button
                    type="button"
                    onClick={() => setSubjectProgressFilter("ALL")}
                    className="text-[#00736E] font-bold hover:underline cursor-pointer ml-1"
                  >
                    Hiển thị tất cả môn
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 tabular-nums">
                  {subjectsForSelectedClass.map((item: any) => {
                    const lv = detectCtqtLevel(
                      item.class?.className || subjectGradeData?.class?.className,
                      item.class?.grade || subjectGradeData?.class?.grade,
                      item.class?.level || subjectGradeData?.class?.level
                    );
                    const subMeta = CTQT_LEVEL_CONFIGS[lv]?.subjects?.find(
                      s => s.code === item.subjectCode
                    );
                    const isActive = item.subjectCode === selectedSubjectCode;
                    const statusMeta = getReviewStatusMeta(item.status || item.reviewStatus);

                    const totalSt = item.totalStudents ?? 0;
                    const gradedSt = item.gradedStudents ?? 0;
                    const fullSt = item.fullScoreStudents ?? 0;
                    const cmtEnSt = item.commentEnStudents ?? 0;
                    const cmtViSt = item.commentViStudents ?? 0;
                    const progRate =
                      totalSt > 0 ? Math.round((gradedSt / totalSt) * 100) : item.progressRate ?? 0;
                    const progMeta = getProgressStatusMeta(item.progressStatus, gradedSt, totalSt);
                    const gvName = item.primaryTeacher?.teacherName || null;
                    const gvId = item.primaryTeacherId || item.primaryTeacher?.id || null;

                    return (
                      <div
                        key={`${item.classId}::${item.subjectCode}`}
                        onClick={() => setSelectedSubjectCode(item.subjectCode)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedSubjectCode(item.subjectCode);
                          }
                        }}
                        className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isActive
                            ? "bg-[#003B3A] border-[#003B3A] text-white shadow-xs ring-2 ring-[#00A19A]/30"
                            : "bg-[#F8FAFC] hover:bg-teal-50/40 border-[#E2E8F0] text-slate-800"
                        }`}
                      >
                        {/* Top row: Subject Code + Name + Review Status */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`text-[11px] font-black px-2 py-1 rounded-lg shrink-0 tabular-nums ${
                                  isActive
                                    ? "bg-white/15 text-[#5EEAD4]"
                                    : "bg-white border border-[#E2E8F0] text-[#003B3A]"
                                }`}
                              >
                                {item.subjectCode}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-bold leading-snug truncate">
                                  {subMeta ? `${subMeta.nameVi} (${subMeta.nameEn})` : item.subjectCode}
                                </div>
                                <div
                                  className={`text-[11px] mt-0.5 flex items-center gap-1.5 ${
                                    isActive ? "text-teal-100" : "text-slate-500"
                                  }`}
                                >
                                  <span>Sheet: {subMeta?.sheetName || item.subjectCode}</span>
                                </div>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                isActive ? "bg-white/15 text-white" : statusMeta.badgeClass
                              }`}
                            >
                              {statusMeta.label}
                            </span>
                          </div>

                          {/* Teacher (GVBM) row */}
                          <div
                            className={`mt-2 pt-2 border-t flex items-center justify-between gap-2 text-[11px] ${
                              isActive
                                ? "border-white/15 text-teal-100"
                                : "border-[#E2E8F0] text-slate-600"
                            }`}
                          >
                            <div className="truncate">
                              <span className="opacity-80">GVBM: </span>
                              <strong
                                className={
                                  isActive
                                    ? "text-white"
                                    : gvName
                                    ? "text-[#00736E]"
                                    : "text-slate-400 italic font-normal"
                                }
                              >
                                {gvName || "Chưa phân công"}
                              </strong>
                            </div>
                            {gvId && selectedTeacherFilterId !== gvId && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedTeacherFilterId(gvId);
                                }}
                                title={`Lọc các môn của GV ${gvName}`}
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors cursor-pointer shrink-0 ${
                                  isActive
                                    ? "bg-white/10 hover:bg-white/20 text-[#5EEAD4]"
                                    : "bg-white hover:bg-teal-50 text-[#00736E] border border-[#E2E8F0]"
                                }`}
                              >
                                Lọc theo GV
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Grade & Comment Entry Progress Section */}
                        <div className="mt-2.5 pt-2 border-t border-dashed border-current/15 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span
                              className={`font-semibold ${
                                isActive ? "text-teal-100" : "text-slate-600"
                              }`}
                            >
                              Điểm:{" "}
                              <strong className={isActive ? "text-white" : "text-slate-900"}>
                                {gradedSt}/{totalSt} HS
                              </strong>{" "}
                              ({progRate}%)
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                                isActive ? progMeta.activeBadgeClass : progMeta.badgeClass
                              }`}
                            >
                              {progMeta.shortLabel}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div
                            className={`w-full h-1.5 rounded-full overflow-hidden ${
                              isActive ? "bg-white/15" : "bg-slate-200"
                            }`}
                          >
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isActive ? progMeta.activeBarClass : progMeta.barClass
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, progRate))}%` }}
                            />
                          </div>

                          {/* Sub-metrics: Full columns & Bilingual comments */}
                          <div
                            className={`flex items-center justify-between gap-2 text-[10px] ${
                              isActive ? "text-teal-200/90" : "text-slate-500"
                            }`}
                          >
                            <span>
                              Đủ cột điểm: <strong>{fullSt}/{totalSt}</strong>
                            </span>
                            <span>
                              Nhận xét EN: <strong>{cmtEnSt}/{totalSt}</strong> • VI:{" "}
                              <strong>{cmtViSt}/{totalSt}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inline Collapsible Progress Tracker Table by Teacher / Subject */}
              {showInlineTracker && (
                <div className="pt-3 border-t border-[#E2E8F0] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-black text-[#003B3A] flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#008B85]" />
                      <span>
                        Bảng theo dõi tiến độ nhập điểm các môn theo Giáo viên phụ trách
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("progress")}
                      className="text-xs font-bold text-[#00736E] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Mở toàn màn hình</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                        <tr className="text-[11px] font-semibold whitespace-nowrap">
                          <th className="py-2.5 px-3 text-center w-10 text-white">STT</th>
                          <th className="py-2.5 px-3 text-white">Lớp</th>
                          <th className="py-2.5 px-3 text-white">Môn học phụ trách</th>
                          <th className="py-2.5 px-3 text-teal-100">Giáo viên bộ môn (GVBM)</th>
                          <th className="py-2.5 px-3 text-center text-teal-100">Đã nhập điểm</th>
                          <th className="py-2.5 px-3 text-center text-teal-100">Đủ cột điểm</th>
                          <th className="py-2.5 px-3 text-center text-teal-100">Nhận xét (EN / VI)</th>
                          <th className="py-2.5 px-3 text-center text-[#5EEAD4]">Tiến độ</th>
                          <th className="py-2.5 px-3 text-center text-[#5EEAD4]">Trạng thái duyệt</th>
                          <th className="py-2.5 px-3 text-center text-white">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                        {(selectedTeacherFilterId !== "ALL"
                          ? entryAssignmentOptions
                          : allSubjectsOfSelectedClass
                        ).map((slot: any, idx: number) => {
                          const lv = detectCtqtLevel(
                            slot.class?.className,
                            slot.class?.grade,
                            slot.class?.level
                          );
                          const subMeta = CTQT_LEVEL_CONFIGS[lv]?.subjects?.find(
                            s => s.code === slot.subjectCode
                          );
                          const progMeta = getProgressStatusMeta(
                            slot.progressStatus,
                            slot.gradedStudents,
                            slot.totalStudents
                          );
                          const revMeta = getReviewStatusMeta(slot.status || slot.reviewStatus);
                          const isCurrent =
                            slot.classId === selectedClassId &&
                            slot.subjectCode === selectedSubjectCode;

                          return (
                            <tr
                              key={`${slot.classId}::${slot.subjectCode}`}
                              className={`transition-colors align-middle ${
                                isCurrent
                                  ? "bg-[#F0FDFA]/80 hover:bg-[#F0FDFA]"
                                  : "hover:bg-[#F8FAFC]"
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[#003B3A] whitespace-nowrap">
                                {slot.class?.className}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                <span className="font-black text-[#00736E] mr-1.5">
                                  [{slot.subjectCode}]
                                </span>
                                {subMeta ? `${subMeta.nameVi} (${subMeta.nameEn})` : slot.subjectCode}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                                {slot.primaryTeacher?.teacherName || (
                                  <span className="text-slate-400 italic font-normal">
                                    Chưa phân công
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                                {slot.gradedStudents ?? 0} / {slot.totalStudents ?? 0} HS (
                                {slot.progressRate ?? 0}%)
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-700">
                                {slot.fullScoreStudents ?? 0} / {slot.totalStudents ?? 0}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-700">
                                EN: {slot.commentEnStudents ?? 0}/{slot.totalStudents ?? 0} • VI:{" "}
                                {slot.commentViStudents ?? 0}/{slot.totalStudents ?? 0}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block whitespace-nowrap ${progMeta.badgeClass}`}
                                >
                                  {progMeta.label}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block whitespace-nowrap ${revMeta.badgeClass}`}
                                >
                                  {revMeta.label}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedClassId(slot.classId);
                                    setSelectedSubjectCode(slot.subjectCode);
                                  }}
                                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    isCurrent
                                      ? "bg-[#003B3A] text-white"
                                      : "bg-teal-50 hover:bg-teal-100 text-[#00736E] border border-teal-200"
                                  }`}
                                >
                                  {isCurrent ? "Đang mở" : "Nhập điểm"}
                                </button>
                              </td>
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

          {/* Subject Header Card (matching Admin's Bảng điểm môn banner) */}
          {entrySubjectDef && (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#003B3A] text-white font-black text-xs flex items-center justify-center shrink-0 tabular-nums">
                  {entrySubjectDef.code}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm md:text-base font-black text-[#003B3A]">
                      Bảng điểm môn: {entrySubjectDef.nameVi} ({entrySubjectDef.nameEn})
                    </h2>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-slate-700">
                      Sheet: {entrySubjectDef.sheetName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Nhập điểm thành phần, tên tiếng Anh và nhận xét song ngữ cho học sinh lớp{" "}
                    <strong className="text-slate-700">{subjectGradeData?.class?.className}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">GVBM:</span>
                  <span className="font-bold text-[#00736E]">
                    {subjectGradeData?.assignment?.primaryTeacher?.teacherName || "Theo phân công"}
                  </span>
                </div>
                {subjectGradeData?.assignment?.delegatedTeacher?.teacherName && (
                  <div className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">GVTA rà soát:</span>
                    <span className="font-bold text-slate-800">
                      {subjectGradeData.assignment.delegatedTeacher.teacherName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reviewer Feedback Banner when Changes Requested */}
          {reviewerNoteBanner && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#E11D48] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[#E11D48]">
                  Ghi chú yêu cầu chỉnh sửa từ GVTA ({reviewerNoteBanner.reviewedBy || "Người rà soát"}):
                </div>
                <div className="mt-0.5 text-slate-800">{reviewerNoteBanner.reviewerNote}</div>
              </div>
            </div>
          )}

          {/* Grade Entry Table — Sky-Line Academic Ledger Table (100% synced with Admin) */}
          {loadingSubjectGrades ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm flex flex-col items-center justify-center gap-3">
              <div className="w-7 h-7 border-3 border-[#008B85] border-t-transparent rounded-full animate-spin" />
              <span>Đang tải bảng điểm môn {entrySubjectDef?.nameVi || selectedSubjectCode}...</span>
            </div>
          ) : !subjectGradeData || subjectGradeData.students?.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Chưa có dữ liệu học sinh của lớp này.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#003B3A] sticky top-0 z-10 border-b border-[#003B3A] shadow-xs">
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      <th className="py-3 px-3 border-r border-white/10 text-center w-12 text-white">STT</th>
                      <th className="py-3 px-3 border-r border-white/10 text-center w-28 text-white">Mã HS</th>
                      <th className="py-3 px-3 border-r border-white/10 min-w-[160px] text-white">Họ và tên</th>
                      <th className="py-3 px-3 border-r border-white/10 min-w-[145px] text-[#5EEAD4]">English Name</th>

                      {/* Dynamic Score Columns synced across PRIMARY / MIDDLE / HIGH */}
                      {entryLevel === "HIGH" ? (
                        entrySubjectDef?.code === "IELTS" ? (
                          <>
                            <th className="py-3 px-3 border-r border-white/10 text-center w-36 text-teal-100">
                              Nội dung
                            </th>
                            <th className="py-3 px-3 border-r border-white/10 text-center w-28 text-[#5EEAD4]">
                              IELTS Band (0-9)
                            </th>
                          </>
                        ) : entrySubjectDef?.isQualitative ? (
                          <th className="py-3 px-3 border-r border-white/10 text-center w-44 text-teal-100">
                            Nghiên cứu học thuật
                          </th>
                        ) : (
                          <>
                            <th className="py-3 px-3 border-r border-white/10 text-center min-w-[180px] text-teal-100">
                              Nội dung kiểm tra (Content)
                            </th>
                            <th className="py-3 px-3 border-r border-white/10 text-center w-24 text-[#5EEAD4]">
                              Điểm số (Mark)
                            </th>
                          </>
                        )
                      ) : (
                        entrySubjectDef?.scoreColumns?.map((col: any) => (
                          <th
                            key={col.key}
                            className={`py-3 px-3 border-r border-white/10 text-center ${
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

                      <th className="py-3 px-3 border-r border-white/10 min-w-[240px] text-teal-100">
                        Nhận xét tiếng Anh (Comment EN)
                      </th>
                      <th className="py-3 px-3 border-r border-white/10 min-w-[240px] text-teal-100">
                        Nhận xét tiếng Việt (Nhận xét VI)
                      </th>
                      <th className="py-3 px-3 text-center w-28 text-[#5EEAD4]">Trạng thái</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {subjectGradeData.students.map((st: any, idx: number) => {
                      const entry =
                        subjectGradeData.entries?.find((e: any) => e.studentId === st.id) || {};
                      let progArr: any[] = [];
                      try {
                        progArr = JSON.parse(entry.progressScores || "[]");
                        if (!Array.isArray(progArr)) progArr = [];
                      } catch {
                        progArr = [];
                      }
                      const statusMeta = getReviewStatusMeta(entry.reviewStatus);

                      return (
                        <tr
                          key={st.id}
                          className="transition-colors align-middle hover:bg-[#F8FAFC]"
                        >
                          <td className="py-3 px-3 text-center font-bold text-slate-500 align-middle">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600 align-middle">
                            {st.studentCode}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap align-middle">
                            {st.studentName}
                          </td>
                          <td className="py-3 px-3 align-middle">
                            <input
                              type="text"
                              value={st.englishName || ""}
                              placeholder="Nhập English Name..."
                              onChange={e => updateEntryField(st.id, "englishName", e.target.value)}
                              className="w-full min-w-[130px] text-xs font-semibold text-[#00736E] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#008B85] focus:border-[#008B85] focus:outline-hidden placeholder:font-normal placeholder:text-slate-400"
                            />
                          </td>

                          {/* Score Input Cells */}
                          {entryLevel === "HIGH" ? (
                            entrySubjectDef?.code === "IELTS" ? (
                              <>
                                <td className="py-3 px-3 text-center text-slate-500 italic align-middle">
                                  Điểm thi HK{selectedSemester}
                                </td>
                                <td className="py-3 px-3 text-center align-middle">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="9"
                                    value={entry.ieltsScore ?? ""}
                                    onChange={e => updateEntryField(st.id, "ieltsScore", e.target.value)}
                                    placeholder="0 - 9"
                                    className="w-20 text-center font-bold text-[#003B3A] px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#008B85] focus:border-[#008B85] focus:outline-hidden tabular-nums"
                                  />
                                </td>
                              </>
                            ) : entrySubjectDef?.isQualitative ? (
                              <td className="py-3 px-3 text-center text-slate-500 italic align-middle">
                                Đánh giá định tính
                              </td>
                            ) : (
                              <>
                                <td className="py-3 px-3 align-middle">
                                  <input
                                    type="text"
                                    value={entry.assessmentContentVi || entry.assessmentContentEn || ""}
                                    onChange={e =>
                                      updateEntryField(st.id, "assessmentContentVi", e.target.value)
                                    }
                                    placeholder="Nhập nội dung bài đánh giá..."
                                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#008B85] focus:border-[#008B85] focus:outline-hidden"
                                  />
                                </td>
                                <td className="py-3 px-3 text-center align-middle">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={entry.midTermScore ?? ""}
                                    onChange={e => updateEntryField(st.id, "midTermScore", e.target.value)}
                                    placeholder="Điểm"
                                    className="w-18 text-center font-bold text-[#003B3A] px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#008B85] focus:border-[#008B85] focus:outline-hidden tabular-nums"
                                  />
                                </td>
                              </>
                            )
                          ) : (
                            entrySubjectDef?.scoreColumns?.map((col: any) => {
                              if (col.key === "gpaScore") {
                                return (
                                  <td
                                    key={col.key}
                                    className="py-3 px-3 text-center bg-[#F0FDFA]/60 align-middle"
                                  >
                                    <span className="font-black text-[#00736E] text-xs px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 inline-block tabular-nums">
                                      {entry.gpaScore !== null && entry.gpaScore !== undefined && entry.gpaScore !== ""
                                        ? entry.gpaScore
                                        : "-"}
                                    </span>
                                  </td>
                                );
                              }

                              let val: any = "";
                              if (col.key.startsWith("progressScores_")) {
                                const pIdx = parseInt(col.key.replace("progressScores_", ""), 10);
                                val =
                                  progArr[pIdx] !== undefined && progArr[pIdx] !== null
                                    ? progArr[pIdx]
                                    : "";
                              } else if (col.key === "midTermScore") {
                                val =
                                  entry.midTermScore !== null && entry.midTermScore !== undefined
                                    ? entry.midTermScore
                                    : "";
                              } else if (col.key === "endTermScore") {
                                val =
                                  entry.endTermScore !== null && entry.endTermScore !== undefined
                                    ? entry.endTermScore
                                    : "";
                              }

                              return (
                                <td key={col.key} className="py-3 px-3 text-center align-middle">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={val}
                                    onChange={e => {
                                      if (col.key.startsWith("progressScores_")) {
                                        const pIdx = parseInt(
                                          col.key.replace("progressScores_", ""),
                                          10
                                        );
                                        updateEntryField(st.id, "progressScores", e.target.value, pIdx);
                                      } else {
                                        updateEntryField(st.id, col.key, e.target.value);
                                      }
                                    }}
                                    className="w-16 text-center text-xs font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#008B85] focus:border-[#008B85] focus:outline-hidden tabular-nums"
                                  />
                                </td>
                              );
                            })
                          )}

                          {/* Nhận xét tiếng Anh (Comment EN) */}
                          <td className="py-3 px-3 align-middle">
                            <textarea
                              rows={2}
                              value={entry.commentEn || ""}
                              placeholder="Nhận xét tiếng Anh (English comment)..."
                              onChange={e => updateEntryField(st.id, "commentEn", e.target.value)}
                              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#008B85] focus:border-[#008B85] focus:outline-hidden resize-y"
                            />
                          </td>

                          {/* Nhận xét tiếng Việt (Nhận xét VI) */}
                          <td className="py-3 px-3 align-middle">
                            <textarea
                              rows={2}
                              value={entry.commentVi || ""}
                              placeholder="Nhận xét tiếng Việt đối ứng..."
                              onChange={e => updateEntryField(st.id, "commentVi", e.target.value)}
                              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#008B85] focus:border-[#008B85] focus:outline-hidden resize-y"
                            />
                          </td>

                          {/* Trạng thái */}
                          <td className="py-3 px-3 text-center align-middle">
                            <span
                              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full inline-block whitespace-nowrap ${statusMeta.badgeClass}`}
                            >
                              {statusMeta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Unified Ledger Footer Statistics Bar (matching Admin) */}
              <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums">
                <div className="flex items-center gap-4 text-slate-700 font-semibold">
                  <span>
                    Sĩ số: <strong className="text-slate-900">{entryStats.total}</strong> học sinh
                  </span>
                  <span>
                    Đã có điểm:{" "}
                    <strong className="text-[#00736E]">
                      {entryStats.hasScore} / {entryStats.total}
                    </strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 font-bold">
                  <span className="px-3 py-1 bg-white border border-[#E2E8F0] rounded-lg text-slate-800">
                    Điểm TB môn cả lớp:{" "}
                    <strong className="text-[#00736E]">{entryStats.avg || "-"}</strong>
                  </span>
                  <span className="px-3 py-1 bg-white border border-[#E2E8F0] rounded-lg text-[#059669]">
                    Cao nhất: <strong>{entryStats.max || "-"}</strong>
                  </span>
                  <span className="px-3 py-1 bg-white border border-[#E2E8F0] rounded-lg text-[#E11D48]">
                    Thấp nhất: <strong>{entryStats.min || "-"}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: THEO DÕI NHẬP ĐIỂM CÁC MÔN THEO GV PHỤ TRÁCH                        */}
      {/* ========================================================================= */}
      {activeTab === "progress" && (
        <div className="space-y-4">
          {/* Unified Academic Ledger Strip */}
          <div className="bg-white border border-[#E2E8F0] border-l-4 border-l-[#003B3A] rounded-2xl p-4 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-5 tabular-nums">
              <div>
                <div className="text-xs font-semibold text-slate-500">Giáo viên phụ trách</div>
                <div className="text-lg font-black text-[#003B3A] mt-0.5 flex items-baseline gap-1.5">
                  <span>{teacherProgressSummaries.length}</span>
                  <span className="text-xs font-semibold text-slate-500">giáo viên</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Đủ 100%:{" "}
                  <strong className="text-[#059669]">
                    {teacherProgressSummaries.filter(t => t.status === "COMPLETED").length}
                  </strong>{" "}
                  • Đang nhập:{" "}
                  <strong className="text-[#D97706]">
                    {teacherProgressSummaries.filter(t => t.status === "IN_PROGRESS").length}
                  </strong>
                </div>
              </div>

              <div className="h-9 w-px bg-[#E2E8F0] hidden sm:block" />

              <div>
                <div className="text-xs font-semibold text-slate-500">Lượt môn phụ trách</div>
                <div className="text-lg font-black text-[#003B3A] mt-0.5 flex items-baseline gap-1.5">
                  <span>{activeScopeSummary.totalSlots}</span>
                  <span className="text-xs font-semibold text-slate-500">lớp – môn</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Đã duyệt chính thức:{" "}
                  <strong className="text-[#059669]">{activeScopeSummary.approvedSlots}</strong> môn
                </div>
              </div>

              <div className="h-9 w-px bg-[#E2E8F0] hidden sm:block" />

              <div>
                <div className="text-xs font-semibold text-slate-500">Hoàn thành 100%</div>
                <div className="text-lg font-black text-[#059669] mt-0.5 flex items-baseline gap-1.5">
                  <span>{activeScopeSummary.completedSlots}</span>
                  <span className="text-xs font-semibold text-slate-500">
                    / {activeScopeSummary.totalSlots} môn
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Đã nhập đủ điểm học sinh</div>
              </div>

              <div className="h-9 w-px bg-[#E2E8F0] hidden sm:block" />

              <div>
                <div className="text-xs font-semibold text-slate-500">Đang nhập / Chưa bắt đầu</div>
                <div className="text-lg font-black mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-[#D97706]">{activeScopeSummary.inProgressSlots}</span>
                  <span className="text-slate-300 font-normal">/</span>
                  <span className="text-[#E11D48]">{activeScopeSummary.notStartedSlots}</span>
                  <span className="text-xs font-semibold text-slate-500">môn</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Cần hoàn thiện nhập điểm</div>
              </div>

              <div className="h-9 w-px bg-[#E2E8F0] hidden md:block" />

              <div className="min-w-[175px]">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Tiến độ điểm học sinh</span>
                  <span className="font-black text-[#00736E]">{activeScopeSummary.overallRate}%</span>
                </div>
                <div className="mt-1.5 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#008B85] h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, activeScopeSummary.overallRate))}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Đã có điểm:{" "}
                  <strong className="text-slate-800">
                    {activeScopeSummary.gradedStudents.toLocaleString("vi-VN")} /{" "}
                    {activeScopeSummary.totalStudents.toLocaleString("vi-VN")}
                  </strong>{" "}
                  lượt HS
                </div>
              </div>
            </div>

            {/* Segmented View Mode Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex p-1 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setTrackerViewMode("by_teacher")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    trackerViewMode === "by_teacher"
                      ? "bg-[#003B3A] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Theo Giáo viên phụ trách
                </button>
                <button
                  type="button"
                  onClick={() => setTrackerViewMode("by_slot")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    trackerViewMode === "by_slot"
                      ? "bg-[#003B3A] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Theo Lớp & Môn học
                </button>
              </div>
            </div>
          </div>

          {/* Filter Strip */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 tabular-nums">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Chọn GV phụ trách */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#008B85]" />
                <span className="text-xs font-bold text-slate-700">GV phụ trách:</span>
                <select
                  value={selectedTeacherFilterId}
                  onChange={e => setSelectedTeacherFilterId(e.target.value)}
                  className="text-xs font-bold px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-[#003B3A] focus:outline-[#008B85] max-w-[270px]"
                >
                  <option value="ALL">
                    Tất cả GV phụ trách ({teacherProgressSummaries.length} GV)
                  </option>
                  {teacher?.id &&
                    teacherProgressSummaries.some(t => t.teacherId === teacher.id) && (
                      <option value={teacher.id}>
                        ★ Môn tôi phụ trách — {teacher.teacherName}
                      </option>
                    )}
                  {teacherProgressSummaries.map(t => (
                    <option key={t.teacherId} value={t.teacherId}>
                      {t.teacherName} ({t.classCount} lớp • {t.slotCount} môn • {t.progressRate}%)
                    </option>
                  ))}
                  {unassignedSlotsCount > 0 && (
                    <option value="UNASSIGNED">
                      Chưa phân công GVBM ({unassignedSlotsCount} môn)
                    </option>
                  )}
                </select>
              </div>

              {/* Lọc Môn học */}
              <select
                value={trackerSubjectFilter}
                onChange={e => setTrackerSubjectFilter(e.target.value)}
                className="text-xs font-bold px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-slate-800 focus:outline-[#008B85]"
              >
                <option value="ALL">Tất cả môn CTQT</option>
                <option value="ENG">ENG - Tiếng Anh</option>
                <option value="MAT">MAT - Toán quốc tế</option>
                <option value="SCI">SCI - Khoa học</option>
                <option value="GLOBAL_STUDIES">GLOBAL_STUDIES - Global Studies</option>
                <option value="AE">AE - Tiếng Anh Học thuật</option>
                <option value="IELTS">IELTS</option>
                <option value="AR">AR - Nghiên cứu Học thuật</option>
              </select>

              {/* Lọc Trạng thái tiến độ */}
              <select
                value={trackerStatusFilter}
                onChange={e => setTrackerStatusFilter(e.target.value)}
                className="text-xs font-bold px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-slate-800 focus:outline-[#008B85]"
              >
                <option value="ALL">Tất cả trạng thái nhập điểm</option>
                <option value="INCOMPLETE">Chưa hoàn thành (Đang nhập + Chưa nhập)</option>
                <option value="NOT_STARTED">Chưa nhập điểm (0%)</option>
                <option value="IN_PROGRESS">Đang nhập dở</option>
                <option value="COMPLETED">Hoàn thành 100%</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[230px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={trackerSearch}
                onChange={e => setTrackerSearch(e.target.value)}
                placeholder="Tìm giáo viên, lớp, mã môn..."
                className="w-full text-xs pl-8 pr-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl focus:outline-[#008B85]"
              />
            </div>
          </div>

          {/* Table View 1: By Teacher (Theo Giáo viên phụ trách) */}
          {trackerViewMode === "by_teacher" ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 text-center w-12 text-white">STT</th>
                    <th className="py-3 px-3 text-white min-w-[180px]">Giáo viên phụ trách (GVBM)</th>
                    <th className="py-3 px-3 text-center text-teal-100 w-28">Số lớp / môn</th>
                    <th className="py-3 px-3 text-teal-100 min-w-[320px]">
                      Danh sách môn học phụ trách (Bấm để mở sổ điểm)
                    </th>
                    <th className="py-3 px-3 text-center text-teal-100 w-44">
                      Tiến độ nhập điểm HS
                    </th>
                    <th className="py-3 px-3 text-center text-teal-100 w-36">
                      Nhận xét (EN / VI)
                    </th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4] w-32">Trạng thái</th>
                    <th className="py-3 px-3 text-center text-white w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {filteredTrackerTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 font-semibold">
                        Không có giáo viên nào khớp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredTrackerTeachers.map((t: any, idx: number) => {
                      const tMeta = getProgressStatusMeta(
                        t.status,
                        t.gradedStudents,
                        t.totalStudents
                      );
                      return (
                        <tr
                          key={t.teacherId}
                          className="transition-colors align-middle hover:bg-[#F8FAFC]"
                        >
                          <td className="py-3 px-3 text-center font-bold text-slate-500 align-middle">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 align-middle">
                            <div className="font-bold text-[#003B3A]">{t.teacherName}</div>
                            {t.teacherCode && (
                              <div className="text-[11px] font-mono text-slate-500">
                                Mã GV: {t.teacherCode}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center align-middle">
                            <div className="font-bold text-slate-800">
                              {t.classCount} lớp • {t.slotCount} môn
                            </div>
                            <div className="text-[11px] text-[#059669] font-semibold">
                              Đủ 100%: {t.completedSlots}/{t.slotCount}
                            </div>
                          </td>
                          <td className="py-3 px-3 align-middle">
                            <div className="flex flex-wrap gap-1.5">
                              {t.matchingSlots.map((slot: any) => {
                                const sMeta = getProgressStatusMeta(
                                  slot.progressStatus,
                                  slot.gradedStudents,
                                  slot.totalStudents
                                );
                                return (
                                  <button
                                    key={`${slot.classId}::${slot.subjectCode}`}
                                    type="button"
                                    onClick={() =>
                                      handleSelectSlotForEntry(
                                        slot.classId,
                                        slot.subjectCode,
                                        t.teacherId
                                      )
                                    }
                                    title={`Mở sổ điểm Lớp ${slot.class?.className} - Môn ${slot.subjectCode}`}
                                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${sMeta.badgeClass}`}
                                  >
                                    <span className="font-bold text-slate-900">
                                      {slot.class?.className}
                                    </span>
                                    <span>• {slot.subjectCode}</span>
                                    <span className="font-bold">
                                      ({slot.gradedStudents ?? 0}/{slot.totalStudents ?? 0})
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-3 align-middle">
                            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                              <span className="text-slate-800">
                                {t.gradedStudents}/{t.totalStudents} HS
                              </span>
                              <span className="text-[#00736E]">{t.progressRate}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${tMeta.barClass}`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, t.progressRate))}%`,
                                }}
                              />
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">
                              Đủ cột điểm: {t.fullScoreStudents}/{t.totalStudents}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center align-middle">
                            <div className="font-semibold text-slate-700">
                              EN: {t.commentEnStudents}/{t.totalStudents}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              VI: {t.commentViStudents}/{t.totalStudents}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center align-middle">
                            <span
                              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full inline-block whitespace-nowrap ${tMeta.badgeClass}`}
                            >
                              {tMeta.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => {
                                const firstSlot = t.matchingSlots[0];
                                if (firstSlot) {
                                  handleSelectSlotForEntry(
                                    firstSlot.classId,
                                    firstSlot.subjectCode,
                                    t.teacherId
                                  );
                                }
                              }}
                              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white transition-all cursor-pointer whitespace-nowrap"
                            >
                              Chọn GV & Nhập
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Table View 2: By Class-Subject Slot (Theo Lớp & Môn học) */
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 text-center w-12 text-white">STT</th>
                    <th className="py-3 px-3 text-white">Lớp học</th>
                    <th className="py-3 px-3 text-white">Môn học phụ trách</th>
                    <th className="py-3 px-3 text-teal-100">Giáo viên bộ môn (GVBM)</th>
                    <th className="py-3 px-3 text-center text-teal-100">Sĩ số</th>
                    <th className="py-3 px-3 text-center text-teal-100">Tiến độ nhập điểm</th>
                    <th className="py-3 px-3 text-center text-teal-100">Đủ cột điểm</th>
                    <th className="py-3 px-3 text-center text-teal-100">Nhận xét (EN / VI)</th>
                    <th className="py-3 px-3 text-center text-teal-100">Cập nhật</th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4]">Tiến độ</th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4]">Trạng thái duyệt</th>
                    <th className="py-3 px-3 text-center text-white">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {filteredTrackerSlots.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-500 font-semibold">
                        Không có lớp – môn nào khớp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredTrackerSlots.map((slot: any, idx: number) => {
                      const lv = detectCtqtLevel(
                        slot.class?.className,
                        slot.class?.grade,
                        slot.class?.level
                      );
                      const subMeta = CTQT_LEVEL_CONFIGS[lv]?.subjects?.find(
                        s => s.code === slot.subjectCode
                      );
                      const progMeta = getProgressStatusMeta(
                        slot.progressStatus,
                        slot.gradedStudents,
                        slot.totalStudents
                      );
                      const revMeta = getReviewStatusMeta(slot.status || slot.reviewStatus);

                      return (
                        <tr
                          key={`${slot.classId}::${slot.subjectCode}`}
                          className="transition-colors align-middle hover:bg-[#F8FAFC]"
                        >
                          <td className="py-3 px-3 text-center font-bold text-slate-500 align-middle">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 font-bold text-[#003B3A] whitespace-nowrap align-middle">
                            Lớp {slot.class?.className}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800 align-middle">
                            <span className="font-black text-[#00736E] mr-1.5">
                              [{slot.subjectCode}]
                            </span>
                            {subMeta ? `${subMeta.nameVi} (${subMeta.nameEn})` : slot.subjectCode}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap align-middle">
                            {slot.primaryTeacher?.teacherName || (
                              <span className="text-slate-400 italic font-normal">
                                Chưa phân công
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700 align-middle">
                            {slot.totalStudents ?? 0}
                          </td>
                          <td className="py-3 px-3 align-middle min-w-[140px]">
                            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                              <span>
                                {slot.gradedStudents ?? 0}/{slot.totalStudents ?? 0} HS
                              </span>
                              <span className="text-[#00736E]">{slot.progressRate ?? 0}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${progMeta.barClass}`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, slot.progressRate ?? 0))}%`,
                                }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-700 align-middle">
                            {slot.fullScoreStudents ?? 0}/{slot.totalStudents ?? 0}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-700 align-middle whitespace-nowrap">
                            EN: {slot.commentEnStudents ?? 0}/{slot.totalStudents ?? 0} • VI:{" "}
                            {slot.commentViStudents ?? 0}/{slot.totalStudents ?? 0}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500 align-middle whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatUpdatedAtVi(slot.lastUpdatedAt)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center align-middle">
                            <span
                              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full inline-block whitespace-nowrap ${progMeta.badgeClass}`}
                            >
                              {progMeta.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center align-middle">
                            <span
                              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full inline-block whitespace-nowrap ${revMeta.badgeClass}`}
                            >
                              {revMeta.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center align-middle">
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectSlotForEntry(
                                  slot.classId,
                                  slot.subjectCode,
                                  slot.primaryTeacherId || slot.primaryTeacher?.id
                                )
                              }
                              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white transition-all cursor-pointer whitespace-nowrap"
                            >
                              Mở sổ điểm
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RÀ SOÁT NHẬN XÉT SONG NGỮ (GVTA ĐƯỢC ỦY QUYỀN)                      */}
      {/* ========================================================================= */}
      {activeTab === "review" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold text-slate-700">
                Lớp & môn được ủy quyền rà soát:
              </label>
              {assignmentsData.delegatedAssignments?.length === 0 && !isSuperAdmin ? (
                <span className="text-xs text-slate-500 italic">
                  Bạn chưa được phân công rà soát nhận xét cho lớp nào trong học kỳ này.
                </span>
              ) : (
                <select
                  value={
                    selectedReviewAssignment
                      ? `${selectedReviewAssignment.classId}::${selectedReviewAssignment.subjectCode}`
                      : ""
                  }
                  onChange={e => {
                    const found = assignmentsData.delegatedAssignments.find(
                      (a: any) => `${a.classId}::${a.subjectCode}` === e.target.value
                    );
                    setSelectedReviewAssignment(found || null);
                  }}
                  className="text-xs font-bold px-3.5 py-2 bg-teal-50/70 border border-teal-300 rounded-xl text-[#003B3A] focus:outline-[#008B85]"
                >
                  {assignmentsData.delegatedAssignments?.map((a: any) => (
                    <option
                      key={`${a.classId}::${a.subjectCode}`}
                      value={`${a.classId}::${a.subjectCode}`}
                    >
                      Lớp {a.class?.className} • Môn: {a.subjectCode} (GVBM:{" "}
                      {a.primaryTeacher?.teacherName || "Chưa gán"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleReviewAction("requestChanges")}
                disabled={actioningReview || !reviewGradeData}
                className="text-xs font-bold px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-[#E11D48] border border-rose-200 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Yêu cầu chỉnh sửa
              </button>

              <button
                type="button"
                onClick={() => handleReviewAction("approve")}
                disabled={actioningReview || !reviewGradeData}
                className="text-xs font-bold px-4 py-2 bg-[#059669] hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Xác nhận duyệt nhận xét
              </button>
            </div>
          </div>

          {loadingReviewData ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Đang tải dữ liệu rà soát...
            </div>
          ) : !reviewGradeData || reviewGradeData.students?.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Chưa có dữ liệu nhận xét cần rà soát cho lớp này.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs text-slate-600">
                Kiểm tra chính tả, văn phong nhận xét tiếng Anh và chuẩn hóa bản dịch tiếng Việt đối ứng trước khi phê duyệt.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      <th className="py-3 px-3 border-r border-white/10 text-center w-12 text-white">STT</th>
                      <th className="py-3 px-3 border-r border-white/10 text-center w-28 text-white">Mã HS</th>
                      <th className="py-3 px-3 border-r border-white/10 min-w-[160px] text-white">Họ và tên</th>
                      <th className="py-3 px-3 border-r border-white/10 min-w-[130px] text-[#5EEAD4]">English Name</th>
                      <th className="py-3 px-3 border-r border-white/10 min-w-[280px] text-teal-100">
                        Nhận xét tiếng Anh (GVBM soạn)
                      </th>
                      <th className="py-3 px-3 border-r border-white/10 min-w-[280px] text-teal-100">
                        Nhận xét tiếng Việt (Bản dịch đối ứng)
                      </th>
                      <th className="py-3 px-3 text-center w-28 text-[#5EEAD4]">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {reviewGradeData.students.map((st: any, idx: number) => {
                      const entry =
                        reviewGradeData.entries?.find((e: any) => e.studentId === st.id) || {};
                      const statusMeta = getReviewStatusMeta(entry.reviewStatus);

                      return (
                        <tr key={st.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                          <td className="py-3 px-3 text-center font-bold text-slate-500 align-middle">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600 align-middle">
                            {st.studentCode}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap align-middle">
                            {st.studentName}
                          </td>
                          <td className="py-3 px-3 font-semibold text-[#00736E] align-middle">
                            {st.englishName || <span className="text-slate-400 font-normal">-</span>}
                          </td>
                          <td className="py-3 px-3 align-middle">
                            <textarea
                              rows={3}
                              value={entry.commentEn || ""}
                              placeholder="Nhận xét tiếng Anh (English comment)..."
                              onChange={e => {
                                const val = e.target.value;
                                const updated = [...(reviewGradeData.entries || [])];
                                let f = updated.find(x => x.studentId === st.id);
                                if (!f) {
                                  f = { studentId: st.id };
                                  updated.push(f);
                                }
                                f.commentEn = val;
                                setReviewGradeData({ ...reviewGradeData, entries: updated });
                              }}
                              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#008B85] focus:border-[#008B85] focus:outline-hidden leading-relaxed"
                            />
                          </td>
                          <td className="py-3 px-3 align-middle">
                            <textarea
                              rows={3}
                              value={entry.commentVi || ""}
                              placeholder="Nhận xét tiếng Việt đối ứng..."
                              onChange={e => {
                                const val = e.target.value;
                                const updated = [...(reviewGradeData.entries || [])];
                                let f = updated.find(x => x.studentId === st.id);
                                if (!f) {
                                  f = { studentId: st.id };
                                  updated.push(f);
                                }
                                f.commentVi = val;
                                setReviewGradeData({ ...reviewGradeData, entries: updated });
                              }}
                              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#008B85] focus:border-[#008B85] focus:outline-hidden leading-relaxed"
                            />
                          </td>
                          <td className="py-3 px-3 text-center align-middle">
                            <span
                              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full inline-block whitespace-nowrap ${statusMeta.badgeClass}`}
                            >
                              {statusMeta.label}
                            </span>
                          </td>
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
      {/* TAB 3: SỔ ĐIỂM TỔNG HỢP & NĂNG LỰC CỐT LÕI (GVCN)                         */}
      {/* ========================================================================= */}
      {activeTab === "consolidated" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 tabular-nums">
              <label className="text-xs font-bold text-slate-700">Lớp chủ nhiệm / theo dõi:</label>
              <select
                value={consolidatedClassId}
                onChange={e => setConsolidatedClassId(e.target.value)}
                className="text-xs font-bold px-3.5 py-2 bg-teal-50/70 border border-teal-300 rounded-xl text-[#003B3A] focus:outline-[#008B85]"
              >
                {ctqtClasses.map(c => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.className} {c.campus?.campusName ? `(${c.campus.campusName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveCompetencies}
                disabled={savingCompetencies || !consolidatedData}
                className="text-xs font-bold px-4 py-2 bg-[#003B3A] hover:bg-[#005250] text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4 text-[#5EEAD4]" />
                {savingCompetencies ? "Đang lưu..." : "Lưu đánh giá năng lực cốt lõi"}
              </button>
            </div>
          </div>

          {loadingConsolidated ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Đang tải Sổ điểm Tổng hợp...
            </div>
          ) : !consolidatedData ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Chưa có dữ liệu lớp này.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-[#003B3A]">
                  Đánh giá 6 tiêu chí Năng lực cốt lõi (Core Competencies) • Thang E – S – N – U
                </div>
                <div className="text-[11px] font-medium text-slate-600">
                  E: Tốt • S: Đạt yêu cầu • N: Cần cải thiện • U: Chưa đạt
                </div>
              </div>

              <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#003B3A] sticky top-0 z-10 border-b border-[#003B3A] shadow-xs">
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      <th className="py-3 px-3 border-r border-white/10 text-center w-12 text-white">STT</th>
                      <th className="py-3 px-3 border-r border-white/10 text-center w-28 text-white">Mã HS</th>
                      <th className="py-3 px-3 border-r border-white/10 min-w-[160px] text-white">Họ và tên</th>
                      <th className="py-3 px-3 border-r border-white/10 min-w-[140px] text-[#5EEAD4]">English Name</th>

                      {CORE_COMPETENCIES_DEF.map(cc => (
                        <th
                          key={cc.key}
                          className="py-3 px-3 border-r border-white/10 text-center min-w-[120px] text-teal-100"
                        >
                          <div>{cc.labelVi}</div>
                          <div className="text-[10px] font-normal text-teal-200/80">{cc.labelEn}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {consolidatedData.students.map((st: any, idx: number) => {
                      const comp =
                        consolidatedData.competencies?.find((c: any) => c.studentId === st.id) || {};

                      return (
                        <tr key={st.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                          <td className="py-3 px-3 text-center font-bold text-slate-500 align-middle">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600 align-middle">
                            {st.studentCode}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap align-middle">
                            {st.studentName}
                          </td>
                          <td className="py-3 px-3 align-middle">
                            <input
                              type="text"
                              value={st.englishName || ""}
                              placeholder="Nhập English Name..."
                              onChange={e => {
                                const nextVal = e.target.value;
                                const updatedStudents = consolidatedData.students.map((s: any) =>
                                  s.id === st.id ? { ...s, englishName: nextVal } : s
                                );
                                setConsolidatedData({
                                  ...consolidatedData,
                                  students: updatedStudents,
                                });
                              }}
                              className="w-full min-w-[130px] text-xs font-semibold text-[#00736E] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#008B85] focus:border-[#008B85] focus:outline-hidden placeholder:font-normal placeholder:text-slate-400"
                            />
                          </td>

                          {CORE_COMPETENCIES_DEF.map(cc => {
                            const val = comp[cc.key] || "E";
                            return (
                              <td key={cc.key} className="py-3 px-3 text-center align-middle">
                                <select
                                  value={val}
                                  onChange={e => {
                                    const nextVal = e.target.value;
                                    const updated = [...(consolidatedData.competencies || [])];
                                    let found = updated.find(x => x.studentId === st.id);
                                    if (!found) {
                                      found = { studentId: st.id };
                                      updated.push(found);
                                    }
                                    found[cc.key] = nextVal;
                                    setConsolidatedData({
                                      ...consolidatedData,
                                      competencies: updated,
                                    });
                                  }}
                                  className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border focus:outline-hidden cursor-pointer ${
                                    val === "E"
                                      ? "bg-emerald-50 text-[#059669] border-emerald-200"
                                      : val === "S"
                                      ? "bg-teal-50 text-[#00736E] border-teal-200"
                                      : val === "N"
                                      ? "bg-amber-50 text-[#D97706] border-amber-200"
                                      : "bg-rose-50 text-[#E11D48] border-rose-200"
                                  }`}
                                >
                                  {CORE_COMPETENCY_RATINGS.map(r => (
                                    <option key={r.code} value={r.code}>
                                      {r.code} – {r.labelVi}
                                    </option>
                                  ))}
                                </select>
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
    </div>
  );
}
