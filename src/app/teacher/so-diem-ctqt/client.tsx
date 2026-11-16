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

export function SoDiemCtqtTeacherClient({
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
  const [activeTab, setActiveTab] = useState<"entry" | "review" | "consolidated">(
    urlTab === "consolidated" || urlTab === "review" || urlTab === "entry"
      ? (urlTab as "entry" | "review" | "consolidated")
      : "entry"
  );

  // Assignments for this teacher
  const [assignmentsData, setAssignmentsData] = useState<any>({
    primaryAssignments: [],
    delegatedAssignments: [],
  });
  const [loadingAssignments, setLoadingAssignments] = useState(true);

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
    }
    if (urlClassId) {
      setConsolidatedClassId(urlClassId);
    }
  }, [urlTab, urlClassId]);

  // Build available class+subject options for Entry Tab
  const entryAssignmentOptions = useMemo(() => {
    const primaryList = Array.isArray(assignmentsData.primaryAssignments)
      ? assignmentsData.primaryAssignments
      : [];
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
  }, [assignmentsData.primaryAssignments, ctqtClasses, isSuperAdmin]);

  // Group available subjects for the currently selected class
  const subjectsForSelectedClass = useMemo(() => {
    if (!selectedClassId) return [];
    return entryAssignmentOptions.filter((a: any) => a.classId === selectedClassId);
  }, [entryAssignmentOptions, selectedClassId]);

  // Unique classes in Entry Tab selector
  const uniqueEntryClasses = useMemo(() => {
    const seen = new Set<string>();
    const list: { classId: string; className: string; grade?: string; level?: string }[] = [];
    entryAssignmentOptions.forEach((a: any) => {
      if (a.classId && !seen.has(a.classId)) {
        seen.add(a.classId);
        list.push({
          classId: a.classId,
          className: a.class?.className || "Lớp CTQT",
          grade: a.class?.grade,
          level: a.class?.level,
        });
      }
    });
    return list;
  }, [entryAssignmentOptions]);

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
              2. Rà soát nhận xét song ngữ (GVTA)
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
            {hasDelegatedReviews ? "3." : "2."} Sổ điểm Tổng hợp & Năng lực cốt lõi (GVCN)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SỔ ĐIỂM THEO MÔN (GVBM) — ĐỒNG BỘ GIAO DIỆN ADMIN                 */}
      {/* ========================================================================= */}
      {activeTab === "entry" && (
        <div className="space-y-4">
          {/* Class Selector & Excel / Save Action Strip */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 tabular-nums">
              <label className="text-xs font-bold text-slate-700">Chọn Lớp:</label>
              {loadingAssignments ? (
                <span className="text-xs text-slate-500">Đang tải phân công...</span>
              ) : entryAssignmentOptions.length === 0 ? (
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
                    className="text-xs font-bold px-3.5 py-2 bg-teal-50/70 border border-teal-300 rounded-xl text-[#003B3A] focus:outline-[#008B85] min-w-[180px]"
                  >
                    {uniqueEntryClasses.map(c => (
                      <option key={c.classId} value={c.classId}>
                        Lớp {c.className}
                      </option>
                    ))}
                  </select>

                  {subjectGradeData?.class && (
                    <span className="text-xs font-semibold px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] text-slate-700 rounded-xl">
                      {entryLevelConfig.levelNameVi} ({subjectsForSelectedClass.length} môn phụ trách)
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

          {/* Subject Pills Switcher (same visual language as Admin) */}
          {subjectsForSelectedClass.length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
              <div className="text-xs font-semibold text-slate-600 mb-2.5">
                Chọn môn học phụ trách để nhập điểm và nhận xét:
              </div>
              <div className="flex flex-wrap gap-2.5">
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
                  const statusMeta = getReviewStatusMeta(item.status);

                  return (
                    <button
                      key={`${item.classId}::${item.subjectCode}`}
                      type="button"
                      onClick={() => setSelectedSubjectCode(item.subjectCode)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#003B3A] border-[#003B3A] text-white shadow-xs"
                          : "bg-[#F8FAFC] hover:bg-teal-50/50 border-[#E2E8F0] text-slate-800"
                      }`}
                    >
                      <span
                        className={`text-[11px] font-black px-2 py-1 rounded-lg tabular-nums ${
                          isActive
                            ? "bg-white/15 text-[#5EEAD4]"
                            : "bg-white border border-[#E2E8F0] text-[#003B3A]"
                        }`}
                      >
                        {item.subjectCode}
                      </span>
                      <div>
                        <div className="text-xs font-bold leading-snug">
                          {subMeta ? `${subMeta.nameVi} (${subMeta.nameEn})` : item.subjectCode}
                        </div>
                        <div
                          className={`text-[11px] mt-0.5 flex items-center gap-1.5 ${
                            isActive ? "text-teal-100" : "text-slate-500"
                          }`}
                        >
                          <span>Sheet: {subMeta?.sheetName || item.subjectCode}</span>
                          <span>•</span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                              isActive
                                ? "bg-white/15 text-white"
                                : statusMeta.badgeClass
                            }`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
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
