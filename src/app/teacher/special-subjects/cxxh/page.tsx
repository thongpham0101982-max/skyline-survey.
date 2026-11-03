"use client";
import React, { useState, useEffect, useMemo } from "react";
import { 
  Heart, 
  Smile, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Download, 
  Search, 
  Filter, 
  Lock, 
  Unlock, 
  UserCheck, 
  UserX, 
  Grid, 
  CreditCard, 
  History, 
  RefreshCcw,
  Zap,
  Info,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Calendar,
  Check,
  X
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Criterion {
  id: string;
  code: string;
  name: string;
  description: string;
  programLevel: string | null;
  competencyGroup: string;
  sortOrder: number;
}

interface Lesson {
  id: string;
  topicId: string;
  topicName: string;
  topicCode: string;
  grade: string;
  periodIndex: number;
  lessonName: string;
  objectives?: string;
  criteriaCount: number;
  criteria: Criterion[];
}

interface StudentGradeRow {
  studentId: string;
  studentCode: string;
  studentName: string;
  gender: string | null;
  attendanceStatus: "PRESENT" | "ABSENT";
  evalResult: string | null;
  rubricDetails: Record<string, string>; // criterionId -> "TOT" | "HOAN_THANH" | "CAN_CO_GANG"
  teacherFeedback: string;
  status: string;
  entryId: string | null;
  auditLogs?: any[];
}

export default function TeacherCxxhEvaluationPage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  
  // Lessons in the selected grade
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number>(0);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);

  // Gradebook data
  const [gradebookLoading, setGradebookLoading] = useState(false);
  const [assignmentMeta, setAssignmentMeta] = useState<any>(null);
  const [students, setStudents] = useState<StudentGradeRow[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string>("DRAFT");
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // UI view modes & filters
  const [viewMode, setViewMode] = useState<"MATRIX" | "CARD">("MATRIX");
  const [activeStudentIndex, setActiveStudentIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNGRADED" | "GRADED" | "ABSENT">("ALL");
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Quick batch apply
  const [batchScore, setBatchScore] = useState<"TOT" | "HOAN_THANH" | "CAN_CO_GANG">("HOAN_THANH");

  // Selected audit student
  const [auditStudent, setAuditStudent] = useState<StudentGradeRow | null>(null);

  // 1. Initial Load: Fetch assignments assigned to current teacher for CXXH
  useEffect(() => {
    async function loadAssignments() {
      try {
        setLoading(true);
        // Get CXXH assignments for the logged-in teacher
        const res = await fetch("/api/special-subjects/assignments?scope=TEACHER&subjectCode=CXXH");
        const json = await res.json();
        if (res.ok) {
          const allAss = json.assignments || [];
          const cxxhAss = allAss.filter((a: any) => a.subject?.code === "CXXH");
          setAssignments(cxxhAss);

          if (cxxhAss.length > 0) {
            setSelectedAssignmentId(cxxhAss[0].id);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Lỗi tải danh sách phân công");
      } finally {
        setLoading(false);
      }
    }
    loadAssignments();
  }, []);

  // 2. When assignment changes, load curriculum lessons for that class's grade
  useEffect(() => {
    if (!selectedAssignmentId) return;
    const currentAss = assignments.find(a => a.id === selectedAssignmentId);
    if (!currentAss) return;

    const grade = currentAss.class?.grade || "1";

    async function loadCurriculum() {
      try {
        setGradebookLoading(true);
        const res = await fetch(`/api/special-subjects/cxxh/structure?grade=${grade}`);
        const json = await res.json();
        if (res.ok) {
          const lessonList = json.lessons || [];
          setLessons(lessonList);
          if (lessonList.length > 0) {
            setSelectedLessonIndex(0);
            setCurrentLesson(lessonList[0]);
          } else {
            setCurrentLesson(null);
          }
        } else {
          toast.error(json.error || "Không thể tải khung bài học");
        }
      } catch (e) {
        console.error(e);
        toast.error("Lỗi nạp bài học");
      } finally {
        setGradebookLoading(false);
      }
    }
    loadCurriculum();
  }, [selectedAssignmentId, assignments]);

  // 3. When current lesson changes, fetch Gradebook data for that lesson & assignment
  useEffect(() => {
    if (!selectedAssignmentId || !currentLesson) return;

    async function fetchGradebook() {
      try {
        setGradebookLoading(true);
        const res = await fetch(`/api/special-subjects/cxxh/gradebook?assignmentId=${selectedAssignmentId}&lessonId=${currentLesson?.id || ""}`);
        const json = await res.json();
        if (res.ok) {
          setAssignmentMeta(json.assignment);
          setStudents(json.students || []);
          setSessionStatus(json.sessionStatus || "DRAFT");
          setIsLocked(json.isLocked || false);
          setHasUnsavedChanges(false);
          setActiveStudentIndex(0);
        } else {
          toast.error(json.error || "Lỗi tải sổ đánh giá");
        }
      } catch (err) {
        console.error(err);
        toast.error("Lỗi kết nối sổ điểm");
      } finally {
        setGradebookLoading(false);
      }
    }
    fetchGradebook();
  }, [selectedAssignmentId, currentLesson]);

  // Handle changing lesson index
  const handleSelectLesson = (idx: number) => {
    if (hasUnsavedChanges) {
      if (!confirm("Bạn có thay đổi chưa lưu trên bài học hiện tại. Bạn có chắc muốn chuyển bài?")) {
        return;
      }
    }
    if (idx >= 0 && idx < lessons.length) {
      setSelectedLessonIndex(idx);
      setCurrentLesson(lessons[idx]);
    }
  };

  // Helper: auto compute lesson overall result according to Phưong an 1 (Most Frequent)
  const computeOverall = (rubricDetails: Record<string, string>, totalCrit: number): string => {
    const vals = Object.values(rubricDetails).filter(v => Boolean(v) && v !== "CHUA_DANH_GIA");
    if (vals.length === 0) return "CHUA_DANH_GIA";
    let t = 0, h = 0, c = 0;
    vals.forEach(v => {
      if (v === "TOT") t++;
      else if (v === "HOAN_THANH") h++;
      else if (v === "CAN_CO_GANG") c++;
    });

    if (c >= totalCrit / 2) return "CAN_CO_GANG";
    if (t >= h && t > 0) return "TOT";
    return "HOAN_THANH";
  };

  // Update a single criterion for a student
  const handleScoreChange = (studentId: string, criterionId: string, val: string) => {
    if (isLocked) {
      toast.error("Phiên đánh giá đã bị khóa");
      return;
    }

    setStudents(prev => prev.map(s => {
      if (s.studentId !== studentId) return s;
      const newRubric = { ...s.rubricDetails, [criterionId]: val };
      const totalCrit = currentLesson?.criteria?.length || 3;
      const newOverall = s.attendanceStatus === "ABSENT" ? "VANG" : computeOverall(newRubric, totalCrit);
      return {
        ...s,
        rubricDetails: newRubric,
        evalResult: newOverall
      };
    }));
    setHasUnsavedChanges(true);
  };

  // Toggle student attendance
  const handleToggleAttendance = (studentId: string) => {
    if (isLocked) return;
    setStudents(prev => prev.map(s => {
      if (s.studentId !== studentId) return s;
      const isNowAbsent = s.attendanceStatus === "PRESENT";
      const totalCrit = currentLesson?.criteria?.length || 3;
      return {
        ...s,
        attendanceStatus: isNowAbsent ? "ABSENT" : "PRESENT",
        evalResult: isNowAbsent ? "VANG" : computeOverall(s.rubricDetails, totalCrit)
      };
    }));
    setHasUnsavedChanges(true);
  };

  // Update teacher feedback for a student
  const handleFeedbackChange = (studentId: string, text: string) => {
    if (isLocked) return;
    setStudents(prev => prev.map(s => s.studentId === studentId ? { ...s, teacherFeedback: text } : s));
    setHasUnsavedChanges(true);
  };

  // Batch apply: Apply a score to all criteria for all present students
  const handleBatchApply = () => {
    if (isLocked) return;
    if (!currentLesson?.criteria || currentLesson.criteria.length === 0) return;

    if (!confirm(`Áp dụng nhanh mức "${batchScore === "TOT" ? "Tốt" : batchScore === "HOAN_THANH" ? "Hoàn thành" : "Cần cố gắng"}" cho toàn bộ tiêu chuẩn của các học sinh có mặt?`)) {
      return;
    }

    const critIds = currentLesson.criteria.map(c => c.id);
    const newRubricTemplate: Record<string, string> = {};
    critIds.forEach(id => newRubricTemplate[id] = batchScore);

    setStudents(prev => prev.map(s => {
      if (s.attendanceStatus === "ABSENT") return s;
      return {
        ...s,
        rubricDetails: { ...newRubricTemplate },
        evalResult: batchScore
      };
    }));
    setHasUnsavedChanges(true);
    toast.success(`Đã áp dụng ${batchScore} cho toàn lớp`);
  };

  // Save changes (DRAFT or COMPLETED)
  const handleSave = async (status: "DRAFT" | "COMPLETED") => {
    if (!selectedAssignmentId || !currentLesson) return;

    if (status === "COMPLETED") {
      // Check for missing evaluations
      const totalCrit = currentLesson.criteria.length;
      const missingCount = students.filter(s => {
        if (s.attendanceStatus === "ABSENT") return false;
        const evaluatedCritCount = Object.values(s.rubricDetails).filter(Boolean).length;
        return evaluatedCritCount < totalCrit;
      }).length;

      if (missingCount > 0) {
        if (!confirm(`Còn ${missingCount} học sinh chưa hoàn tất đánh giá đầy đủ tất cả các tiêu chuẩn. Bạn có chắc chắn muốn Hoàn tất phiên đánh giá?`)) {
          return;
        }
      }
    }

    try {
      setSaving(true);
      const payload = {
        assignmentId: selectedAssignmentId,
        lessonId: currentLesson.id,
        status,
        entries: students.map(s => ({
          studentId: s.studentId,
          rubricDetails: s.rubricDetails,
          evalResult: s.evalResult,
          teacherFeedback: s.teacherFeedback,
          attendanceStatus: s.attendanceStatus
        }))
      };

      const res = await fetch("/api/special-subjects/cxxh/gradebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Đã lưu thành công");
        setSessionStatus(status);
        setHasUnsavedChanges(false);
      } else {
        toast.error(json.error || "Lỗi khi lưu kết quả");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  };

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.studentName.toLowerCase().includes(q);
        const matchCode = s.studentCode.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }

      // Status filter
      if (statusFilter === "ABSENT") return s.attendanceStatus === "ABSENT";
      if (statusFilter === "UNGRADED") {
        if (s.attendanceStatus === "ABSENT") return false;
        const totalCrit = currentLesson?.criteria?.length || 3;
        const evalCount = Object.values(s.rubricDetails || {}).filter(Boolean).length;
        return evalCount < totalCrit;
      }
      if (statusFilter === "GRADED") {
        if (s.attendanceStatus === "ABSENT") return false;
        const totalCrit = currentLesson?.criteria?.length || 3;
        const evalCount = Object.values(s.rubricDetails || {}).filter(Boolean).length;
        return evalCount === totalCrit;
      }
      return true;
    });
  }, [students, searchQuery, statusFilter, currentLesson]);

  // Current active student in Card View
  const currentCardStudent = filteredStudents[activeStudentIndex] || null;

  return (
    <div className="p-3 md:p-6 max-w-[1600px] mx-auto space-y-5 text-slate-800">
      {/* Top Header Card in Deep Pine Brand Style */}
      <div className="bg-[#003B3A] text-white rounded-2xl p-4 md:p-6 shadow-lg border border-teal-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#00A19A]/20 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00A19A] text-white uppercase tracking-wider">
                Môn học đặc thù
              </span>
              <span className="text-teal-200 text-xs font-semibold">
                Khung chuẩn CXXH 1–9
              </span>
            </div>
            <h1 className="text-lg md:text-2xl font-black mt-1 flex items-center space-x-2">
              <Heart className="w-6 h-6 text-rose-400 fill-rose-400" />
              <span>Đánh giá Giáo dục Cảm xúc - Xã hội</span>
            </h1>
            <p className="text-xs text-teal-100/90 mt-1 max-w-3xl">
              Đánh giá sự hình thành và phát triển các nhóm năng lực cảm xúc theo từng tiêu chuẩn bài học.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/teacher/special-subjects/gradebook"
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all border border-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sổ điểm chung</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Control Bar: Class selector, Lesson Selector, Navigation */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
        {/* Row 1: Assignment & Lesson Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Lớp phụ trách được phân công *
            </label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              disabled={loading || saving}
            >
              {assignments.map((a, aIdx) => (
                <option key={a.id ? `${a.id}-${aIdx}` : `assign-${aIdx}`} value={a.id}>
                  {a.class?.className} ({a.class?.campus?.campusCode || "CS"}) • Khối {a.class?.grade} • GV: {a.teacher?.teacherName}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Bài học đánh giá ({lessons.length} bài) *
              </label>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleSelectLesson(selectedLessonIndex - 1)}
                  disabled={selectedLessonIndex <= 0}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                  title="Bài trước"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-bold text-teal-800 px-1">
                  Bài {selectedLessonIndex + 1} / {lessons.length}
                </span>
                <button
                  onClick={() => handleSelectLesson(selectedLessonIndex + 1)}
                  disabled={selectedLessonIndex >= lessons.length - 1}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                  title="Bài tiếp theo"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <select
              value={selectedLessonIndex}
              onChange={(e) => handleSelectLesson(parseInt(e.target.value, 10))}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              disabled={gradebookLoading || saving || lessons.length === 0}
            >
              {lessons.map((l, idx) => (
                <option key={l.id ? `${l.id}-${idx}` : `lesson-${idx}`} value={idx}>
                  Bài {l.periodIndex}: {l.lessonName} ({l.criteriaCount} tiêu chuẩn) • Chủ đề: {l.topicName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Lesson Summary Card */}
        {currentLesson && (
          <div className="p-3 bg-teal-50/60 border border-teal-200/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-[#003B3A]">
                  Bài {currentLesson.periodIndex}: {currentLesson.lessonName}
                </span>
                <span className="text-[10px] font-bold bg-white text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                  {currentLesson.criteria.length} Tiêu chuẩn
                </span>
                <span className="text-[10px] text-slate-500">
                  Chủ đề: {currentLesson.topicName}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 flex flex-wrap gap-2 pt-0.5">
                {currentLesson.criteria.map((c, i) => (
                  <span key={c.id ? `${c.id}-${i}` : `crit-tag-${i}`} className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-mono text-[10px]" title={c.description}>
                    <span className="font-bold text-teal-900">TC {i + 1}:</span> {c.code} {c.programLevel ? `(${c.programLevel})` : ""} • <span className="text-teal-700 font-semibold">{c.competencyGroup}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                sessionStatus === "COMPLETED"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : sessionStatus === "LOCKED"
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : "bg-amber-100 text-amber-800 border-amber-300"
              }`}>
                {sessionStatus === "COMPLETED" ? "✓ Đã hoàn tất" : sessionStatus === "LOCKED" ? "🔒 Đã khóa sổ" : "📝 Đang nhập nháp"}
              </span>

              {hasUnsavedChanges && (
                <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
                  Chưa lưu
                </span>
              )}
            </div>
          </div>
        )}

        {/* Row 2: Search, Filters, View Mode & Batch Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên hoặc mã HS..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 w-44 md:w-56"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center space-x-1 p-0.5 bg-slate-100 rounded-xl text-xs">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${statusFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Tất cả ({students.length})
              </button>
              <button
                onClick={() => setStatusFilter("UNGRADED")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${statusFilter === "UNGRADED" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Chưa đánh giá
              </button>
              <button
                onClick={() => setStatusFilter("GRADED")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${statusFilter === "GRADED" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Đủ kết quả
              </button>
              <button
                onClick={() => setStatusFilter("ABSENT")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${statusFilter === "ABSENT" ? "bg-white text-slate-700 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Vắng
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Matrix vs Card */}
            <div className="flex items-center space-x-1 p-0.5 bg-slate-100 rounded-xl text-xs">
              <button
                onClick={() => setViewMode("MATRIX")}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition-all ${viewMode === "MATRIX" ? "bg-white text-teal-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Bảng ma trận</span>
              </button>
              <button
                onClick={() => setViewMode("CARD")}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition-all ${viewMode === "CARD" ? "bg-white text-teal-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Từng học sinh</span>
              </button>
            </div>

            {/* Quick Batch Apply */}
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <span className="text-[11px] text-slate-500 font-semibold">Gán cả lớp:</span>
              <select
                value={batchScore}
                onChange={(e: any) => setBatchScore(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="HOAN_THANH">Hoàn thành (H)</option>
                <option value="TOT">Tốt (T)</option>
                <option value="CAN_CO_GANG">Cần cố gắng (C)</option>
              </select>
              <button
                onClick={handleBatchApply}
                disabled={isLocked || saving}
                className="ml-1 px-2 py-0.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold cursor-pointer"
                title="Áp dụng cho tất cả HS có mặt"
              >
                Áp dụng
              </button>
            </div>

            {/* Save Buttons */}
            <button
              onClick={() => handleSave("DRAFT")}
              disabled={saving || isLocked}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs flex items-center space-x-1 transition-all text-slate-700 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>{saving ? "Đang lưu..." : "Lưu nháp"}</span>
            </button>

            <button
              onClick={() => handleSave("COMPLETED")}
              disabled={saving || isLocked}
              className="px-4 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#002827] font-bold text-xs text-white flex items-center space-x-1.5 shadow-md shadow-[#003B3A]/20 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-300" />
              <span>Hoàn tất phiên</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Evaluation Area */}
      {gradebookLoading ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200 shadow-sm text-center">
          <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
          <p className="text-sm font-bold text-slate-700">Đang tải sổ đánh giá bài học...</p>
        </div>
      ) : !currentLesson ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200 shadow-sm text-center text-slate-400">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Vui lòng chọn bài học để tiến hành đánh giá</p>
        </div>
      ) : viewMode === "MATRIX" ? (
        /* MODE 1: MATRIX TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[650px] relative">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-20 bg-slate-50 shadow-xs border-b border-slate-200 text-[11px] font-bold text-slate-700">
                <tr>
                  <th className="py-3 px-3 w-12 text-center sticky left-0 z-30 bg-slate-50 border-r border-slate-200">
                    STT
                  </th>
                  <th className="py-3 px-3 w-28 sticky left-12 z-30 bg-slate-50 border-r border-slate-200">
                    Mã HS
                  </th>
                  <th className="py-3 px-4 w-48 sticky left-40 z-30 bg-slate-50 border-r border-slate-200 shadow-sm">
                    Họ và tên học sinh
                  </th>

                  {/* Criteria Columns */}
                  {currentLesson.criteria.map((crit, cIdx) => (
                    <th key={crit.id ? `${crit.id}-${cIdx}` : `crit-head-${cIdx}`} className="py-3 px-3 min-w-[200px] border-r border-slate-200 bg-teal-50/40">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#003B3A]">Tiêu chuẩn {cIdx + 1}</span>
                        {crit.programLevel && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-teal-800 border border-teal-200">
                            {crit.programLevel}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-teal-700 font-semibold mt-0.5">
                        {crit.competencyGroup} • <span className="font-mono text-[9px] text-slate-500">{crit.code}</span>
                      </div>
                      <div className="text-[10px] text-slate-600 line-clamp-2 mt-1 font-normal font-sans" title={crit.description}>
                        {crit.description}
                      </div>
                    </th>
                  ))}

                  {/* Overall Result Column */}
                  <th className="py-3 px-3 w-32 text-center border-r border-slate-200 bg-slate-100">
                    <div>Kết quả bài</div>
                    <div className="text-[9px] text-slate-500 font-normal">Tự động (P.Án 1)</div>
                  </th>

                  {/* Feedback Column */}
                  <th className="py-3 px-4 min-w-[220px]">
                    Nhận xét cá nhân của GV
                  </th>

                  {/* Action / Audit Column */}
                  <th className="py-3 px-2 w-12 text-center">
                    Lịch sử
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((st, sIdx) => {
                    const isAbsent = st.attendanceStatus === "ABSENT";
                    const isFullyGraded = !isAbsent && currentLesson.criteria.every(c => Boolean(st.rubricDetails[c.id]));

                    return (
                      <tr 
                        key={st.studentId ? `${st.studentId}-${sIdx}` : `st-${st.studentCode || sIdx}`} 
                        className={`hover:bg-slate-50/80 transition-colors ${isAbsent ? "bg-slate-100/60 text-slate-400" : ""}`}
                      >
                        {/* Sticky STT */}
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400 sticky left-0 z-10 bg-inherit border-r border-slate-200">
                          {sIdx + 1}
                        </td>

                        {/* Sticky Code */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 sticky left-12 z-10 bg-inherit border-r border-slate-200">
                          {st.studentCode}
                        </td>

                        {/* Sticky Name & Attendance toggle */}
                        <td className="py-2.5 px-4 font-bold sticky left-40 z-10 bg-inherit border-r border-slate-200 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className={isAbsent ? "line-through text-slate-400" : "text-slate-900"}>
                              {st.studentName}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleAttendance(st.studentId)}
                              disabled={isLocked}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                isAbsent
                                  ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              }`}
                              title={isAbsent ? "Nhấn để hủy đánh dấu vắng" : "Nhấn để đánh dấu vắng mặt"}
                            >
                              {isAbsent ? "Vắng" : "Có mặt"}
                            </button>
                          </div>
                        </td>

                        {/* Criteria Score Buttons */}
                        {currentLesson.criteria.map((crit, cIdx) => {
                          const val = st.rubricDetails[crit.id] || "";
                          return (
                            <td key={crit.id ? `${crit.id}-${cIdx}` : `crit-cell-${cIdx}`} className="py-2 px-2.5 border-r border-slate-200 text-center">
                              {isAbsent ? (
                                <span className="text-[10px] text-slate-400 italic">Vắng</span>
                              ) : (
                                <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg space-x-0.5 border border-slate-200">
                                  {/* Tốt */}
                                  <button
                                    type="button"
                                    onClick={() => handleScoreChange(st.studentId, crit.id, "TOT")}
                                    disabled={isLocked}
                                    className={`w-7 h-7 rounded-md font-black text-xs transition-all ${
                                      val === "TOT"
                                        ? "bg-emerald-600 text-white shadow-xs scale-105"
                                        : "text-slate-600 hover:bg-white hover:text-emerald-700"
                                    }`}
                                    title="T - Tốt"
                                  >
                                    T
                                  </button>

                                  {/* Hoàn thành */}
                                  <button
                                    type="button"
                                    onClick={() => handleScoreChange(st.studentId, crit.id, "HOAN_THANH")}
                                    disabled={isLocked}
                                    className={`w-7 h-7 rounded-md font-black text-xs transition-all ${
                                      val === "HOAN_THANH"
                                        ? "bg-teal-600 text-white shadow-xs scale-105"
                                        : "text-slate-600 hover:bg-white hover:text-teal-700"
                                    }`}
                                    title="H - Hoàn thành"
                                  >
                                    H
                                  </button>

                                  {/* Cần cố gắng */}
                                  <button
                                    type="button"
                                    onClick={() => handleScoreChange(st.studentId, crit.id, "CAN_CO_GANG")}
                                    disabled={isLocked}
                                    className={`w-7 h-7 rounded-md font-black text-xs transition-all ${
                                      val === "CAN_CO_GANG"
                                        ? "bg-amber-500 text-white shadow-xs scale-105"
                                        : "text-slate-600 hover:bg-white hover:text-amber-700"
                                    }`}
                                    title="C - Cần cố gắng"
                                  >
                                    C
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Overall Result */}
                        <td className="py-2 px-3 text-center border-r border-slate-200">
                          {isAbsent ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600">
                              VẮNG
                            </span>
                          ) : st.evalResult === "TOT" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              TỐT
                            </span>
                          ) : st.evalResult === "HOAN_THANH" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                              HOÀN THÀNH
                            </span>
                          ) : st.evalResult === "CAN_CO_GANG" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              CỐ GẮNG
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Chưa đủ
                            </span>
                          )}
                        </td>

                        {/* Teacher Feedback */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={st.teacherFeedback || ""}
                            onChange={(e) => handleFeedbackChange(st.studentId, e.target.value)}
                            disabled={isLocked || isAbsent}
                            placeholder="Nhập nhận xét riêng..."
                            className="w-full text-xs px-2.5 py-1 rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 disabled:opacity-50"
                          />
                        </td>

                        {/* Audit log button */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setAuditStudent(st)}
                            className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Xem lịch sử thay đổi"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={currentLesson.criteria.length + 6} className="py-12 text-center text-slate-400">
                      Không có học sinh nào phù hợp với bộ lọc
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MODE 2: CARD / SINGLE STUDENT VIEW (Optimized for iPad & Mobile) */
        currentCardStudent ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
            {/* Student Pagination Navigation */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setActiveStudentIndex(Math.max(0, activeStudentIndex - 1))}
                disabled={activeStudentIndex <= 0}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs flex items-center space-x-1 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Học sinh trước</span>
              </button>

              <div className="text-center">
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                  Học sinh {activeStudentIndex + 1} / {filteredStudents.length}
                </span>
                <div className="text-sm font-black text-slate-900 mt-0.5">
                  {currentCardStudent.studentName} ({currentCardStudent.studentCode})
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveStudentIndex(Math.min(filteredStudents.length - 1, activeStudentIndex + 1))}
                disabled={activeStudentIndex >= filteredStudents.length - 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs flex items-center space-x-1 disabled:opacity-40"
              >
                <span>Tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Attendance Toggle Bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Trạng thái điểm danh buổi học:</span>
              <button
                type="button"
                onClick={() => handleToggleAttendance(currentCardStudent.studentId)}
                disabled={isLocked}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  currentCardStudent.attendanceStatus === "ABSENT"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "bg-emerald-600 text-white shadow-xs"
                }`}
              >
                {currentCardStudent.attendanceStatus === "ABSENT" ? "✗ Đang vắng mặt" : "✓ Có mặt"}
              </button>
            </div>

            {/* Criteria Evaluation List */}
            {currentCardStudent.attendanceStatus === "ABSENT" ? (
              <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Học sinh được đánh dấu vắng mặt trong buổi học này
              </div>
            ) : (
              <div className="space-y-4">
                {currentLesson.criteria.map((crit, cIdx) => {
                  const val = currentCardStudent.rubricDetails[crit.id] || "";
                  return (
                    <div key={crit.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-400 transition-all space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-sm text-[#003B3A]">
                              Tiêu chuẩn {cIdx + 1}
                            </span>
                            {crit.programLevel && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                {crit.programLevel}
                              </span>
                            )}
                            <span className="text-xs text-teal-700 font-semibold">
                              Nhóm: {crit.competencyGroup}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 mt-1.5 leading-relaxed font-medium">
                            {crit.description}
                          </p>
                        </div>
                      </div>

                      {/* Large Touch Radio Buttons */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleScoreChange(currentCardStudent.studentId, crit.id, "TOT")}
                          disabled={isLocked}
                          className={`py-3 px-2 rounded-xl font-black text-xs flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer border ${
                            val === "TOT"
                              ? "bg-emerald-600 text-white border-emerald-700 shadow-md scale-102"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span className="text-sm">TỐT</span>
                          <span className="text-[10px] opacity-80 font-normal">Vượt trội</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleScoreChange(currentCardStudent.studentId, crit.id, "HOAN_THANH")}
                          disabled={isLocked}
                          className={`py-3 px-2 rounded-xl font-black text-xs flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer border ${
                            val === "HOAN_THANH"
                              ? "bg-teal-600 text-white border-teal-700 shadow-md scale-102"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span className="text-sm">HOÀN THÀNH</span>
                          <span className="text-[10px] opacity-80 font-normal">Đạt yêu cầu</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleScoreChange(currentCardStudent.studentId, crit.id, "CAN_CO_GANG")}
                          disabled={isLocked}
                          className={`py-3 px-2 rounded-xl font-black text-xs flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer border ${
                            val === "CAN_CO_GANG"
                              ? "bg-amber-500 text-white border-amber-600 shadow-md scale-102"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span className="text-sm">CẦN CỐ GẮNG</span>
                          <span className="text-[10px] opacity-80 font-normal">Cần hỗ trợ</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Feedback area */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Nhận xét cá nhân của giáo viên cho {currentCardStudent.studentName}:
                  </label>
                  <textarea
                    rows={3}
                    value={currentCardStudent.teacherFeedback || ""}
                    onChange={(e) => handleFeedbackChange(currentCardStudent.studentId, e.target.value)}
                    disabled={isLocked}
                    placeholder="Ghi lại các biểu hiện cảm xúc nổi bật, sự tiến bộ hoặc lưu ý cần hỗ trợ..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            {/* Bottom Card Navigation and Auto Advance */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAuditStudent(currentCardStudent)}
                className="text-xs text-slate-500 hover:text-teal-700 flex items-center space-x-1"
              >
                <History className="w-3.5 h-3.5" />
                <span>Xem lịch sử thay đổi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeStudentIndex < filteredStudents.length - 1) {
                    setActiveStudentIndex(activeStudentIndex + 1);
                  } else {
                    toast.success("Đã đến học sinh cuối cùng trong danh sách");
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-bold flex items-center space-x-2 shadow-md shadow-[#003B3A]/20"
              >
                <span>Chuyển sang HS kế tiếp</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-400">
            Không tìm thấy học sinh phù hợp
          </div>
        )
      )}

      {/* Audit Logs Drawer / Modal */}
      {auditStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Lịch sử đánh giá: {auditStudent.studentName}
                </h4>
                <p className="text-[11px] text-slate-500">Mã HS: {auditStudent.studentCode}</p>
              </div>
              <button
                onClick={() => setAuditStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {auditStudent.auditLogs && auditStudent.auditLogs.length > 0 ? (
                auditStudent.auditLogs.map((log: any, idx: number) => (
                  <div key={log.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-teal-900">{log.action}</span>
                      <span className="text-slate-400">{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
                    </div>
                    <div className="text-slate-600">
                      Kết quả: <span className="font-bold text-slate-800">{log.newValue || "—"}</span>
                    </div>
                    {log.reason && (
                      <div className="text-[11px] text-slate-500 italic">Lý do: {log.reason}</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Chưa có lịch sử thay đổi nào được ghi nhận cho học sinh này
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
