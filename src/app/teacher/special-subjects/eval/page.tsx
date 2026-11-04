"use client";
import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Compass, 
  Heart, 
  Coins, 
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
  X,
  Layers,
  GraduationCap,
  Shield
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

const SPECIAL_SUBJECTS = [
  { code: "CXXH", name: "Giáo dục Cảm xúc - Xã hội", grades: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], icon: Heart, color: "#00A19A", badge: "Khối 1–9" },
  { code: "GDGT", name: "Giáo dục giới tính", grades: ["6", "7", "8", "9"], icon: Shield, color: "#E11D48", badge: "Khối 6–9" },
  { code: "FIN_EDU", name: "Giáo dục tài chính cá nhân", grades: ["4", "5", "6", "7", "8", "9"], icon: Coins, color: "#16A34A", badge: "Khối 4–9" },
  { code: "GDHN", name: "Giáo dục hướng nghiệp", grades: ["6", "7", "8", "9", "10", "11", "12"], icon: Compass, color: "#E67E22", badge: "Khối 6–12" },
];

function UniversalSpecialSubjectEvaluationContent() {
  const searchParams = useSearchParams();
  const querySubject = searchParams.get("subject");
  const queryClassId = searchParams.get("classId");
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(
    querySubject ? querySubject.toUpperCase() : "CXXH"
  );

  const [loading, setLoading] = useState(true);
  
  // All assignments of the logged-in teacher across assigned special subjects
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");

  // Filters
  const [selectedCampusId, setSelectedCampusId] = useState<string>("ALL");
  const [selectedGrade, setSelectedGrade] = useState<string>("ALL");

  // Lessons
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);

  // Gradebook data
  const [gradebookLoading, setGradebookLoading] = useState(false);
  const [assignmentMeta, setAssignmentMeta] = useState<any>(null);
  const [students, setStudents] = useState<StudentGradeRow[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string>("DRAFT");
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // UI view modes
  const [viewMode, setViewMode] = useState<"MATRIX" | "CARD">("MATRIX");
  const [activeStudentIndex, setActiveStudentIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNGRADED" | "GRADED" | "ABSENT">("ALL");
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Batch score
  const [batchScore, setBatchScore] = useState<"TOT" | "HOAN_THANH" | "CAN_CO_GANG">("HOAN_THANH");

  // Audit Drawer
  const [selectedAuditStudent, setSelectedAuditStudent] = useState<StudentGradeRow | null>(null);

  // 1. Fetch personal Special Subject Assignments for the logged-in Teacher
  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/special-subjects/assignments?scope=TEACHER`);
      const json = await res.json();
      if (res.ok) {
        const list = json.assignments || [];
        setAllAssignments(list);
      } else {
        toast.error(json.error || "Không thể tải danh sách phân công");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi nạp danh sách lớp được phân công");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Subjects actually assigned to this teacher
  const assignedSubjects = useMemo(() => {
    const codes = new Set<string>();
    allAssignments.forEach(a => {
      if (a.subject?.code) codes.add(String(a.subject.code).toUpperCase());
    });
    return SPECIAL_SUBJECTS.filter(s => codes.has(s.code));
  }, [allAssignments]);

  // Sync selectedSubjectCode with URL querySubject and teacher's assignedSubjects
  useEffect(() => {
    if (loading) return;
    const requested = querySubject ? querySubject.toUpperCase() : "";
    if (assignedSubjects.length > 0) {
      if (requested && assignedSubjects.some(s => s.code === requested)) {
        setSelectedSubjectCode(requested);
      } else if (!assignedSubjects.some(s => s.code === selectedSubjectCode)) {
        setSelectedSubjectCode(assignedSubjects[0].code);
      }
    } else if (requested && SPECIAL_SUBJECTS.some(s => s.code === requested)) {
      setSelectedSubjectCode(requested);
    }
  }, [querySubject, assignedSubjects, loading]);

  // Assignments for the currently selected special subject
  const assignments = useMemo(() => {
    return allAssignments.filter(a => String(a.subject?.code || "").toUpperCase() === selectedSubjectCode);
  }, [allAssignments, selectedSubjectCode]);

  // Unique campuses in teacher's assignments for the selected subject
  const availableCampuses = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach(a => {
      if (a.class?.campusId) {
        const cCode = a.class?.campus?.campusCode || "";
        const cName = a.class?.campus?.campusName || cCode || "Sky-Line";
        map.set(a.class.campusId, cName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments]);

  // Sync selectedCampusId so only assigned campuses are active
  useEffect(() => {
    if (availableCampuses.length === 1) {
      setSelectedCampusId(availableCampuses[0].id);
    } else if (selectedCampusId !== "ALL" && !availableCampuses.some(c => c.id === selectedCampusId)) {
      setSelectedCampusId("ALL");
    }
  }, [availableCampuses, selectedCampusId]);

  // Unique grades in teacher's assignments for the selected subject & campus
  const availableGrades = useMemo(() => {
    const gradeSet = new Set<string>();
    assignments.forEach(a => {
      if (selectedCampusId !== "ALL" && a.class?.campusId !== selectedCampusId) return;
      if (a.class?.grade) {
        gradeSet.add(String(a.class.grade));
      }
    });
    return Array.from(gradeSet).sort((a, b) => Number(a) - Number(b));
  }, [assignments, selectedCampusId]);

  // Sync selectedGrade so only assigned grades are active
  useEffect(() => {
    if (availableGrades.length === 1) {
      setSelectedGrade(availableGrades[0]);
    } else if (selectedGrade !== "ALL" && !availableGrades.includes(selectedGrade)) {
      setSelectedGrade("ALL");
    }
  }, [availableGrades, selectedGrade]);

  // Filtered assignments for class dropdown
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (selectedCampusId !== "ALL" && a.class?.campusId !== selectedCampusId) return false;
      if (selectedGrade !== "ALL" && String(a.class?.grade) !== selectedGrade) return false;
      return true;
    });
  }, [assignments, selectedCampusId, selectedGrade]);

  // Sync selectedAssignmentId whenever filteredAssignments changes
  useEffect(() => {
    if (filteredAssignments.length > 0) {
      const stillValid = filteredAssignments.some(a => a.id === selectedAssignmentId);
      if (!stillValid) {
        const byClassQuery = queryClassId ? filteredAssignments.find(a => a.classId === queryClassId) : null;
        setSelectedAssignmentId((byClassQuery || filteredAssignments[0]).id);
      }
    } else {
      setSelectedAssignmentId("");
      setStudents([]);
      setLessons([]);
      setCurrentLesson(null);
    }
  }, [filteredAssignments, selectedAssignmentId, queryClassId]);

  // Current active assignment
  const activeAssignment = useMemo(() => {
    return filteredAssignments.find(a => a.id === selectedAssignmentId) || filteredAssignments[0] || null;
  }, [filteredAssignments, selectedAssignmentId]);

  // 2. Fetch Lessons when activeAssignment changes
  useEffect(() => {
    let cancelled = false;
    async function loadLessons() {
      if (!activeAssignment) {
        setLessons([]);
        setSelectedLessonId("");
        setCurrentLesson(null);
        return;
      }
      try {
        const grade = activeAssignment.class?.grade || "6";
        const subjCode = activeAssignment.subject?.code || selectedSubjectCode;
        const res = await fetch(`/api/special-subjects/structure?subjectCode=${subjCode}&grade=${grade}`);
        const json = await res.json();
        if (!cancelled && res.ok) {
          const lList = json.lessons || [];
          setLessons(lList);
          if (lList.length > 0) {
            setSelectedLessonId(lList[0].id);
            setCurrentLesson(lList[0]);
          } else {
            setSelectedLessonId("");
            setCurrentLesson(null);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadLessons();
    return () => {
      cancelled = true;
    };
  }, [activeAssignment?.id, selectedSubjectCode]);

  // 3. Fetch Gradebook entries
  const fetchGradebookData = async () => {
    if (!selectedAssignmentId || !selectedLessonId) return;
    try {
      setGradebookLoading(true);
      const res = await fetch(`/api/special-subjects/gradebook?assignmentId=${selectedAssignmentId}&lessonId=${selectedLessonId}`);
      const json = await res.json();
      if (res.ok) {
        setAssignmentMeta(json.assignment);
        setStudents(json.students || []);
        setSessionStatus(json.sessionStatus || "DRAFT");
        setIsLocked(Boolean(json.isLocked));
        setHasUnsavedChanges(false);

        if (json.lesson) {
          setCurrentLesson(json.lesson);
        }
      } else {
        toast.error(json.error || "Không thể tải sổ đánh giá");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi kết nối");
    } finally {
      setGradebookLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAssignmentId && selectedLessonId) {
      fetchGradebookData();
    }
  }, [selectedAssignmentId, selectedLessonId]);

  // Helper: Calculate Lesson Overall Grade based on Formula 1 (Most Frequent)
  const calculateOverall = (rubric: Record<string, string>, totalCriteria: number, explicitResult?: string | null): string => {
    if (explicitResult && ["TOT", "HOAN_THANH", "CAN_CO_GANG", "CHUA_DANH_GIA", "VANG"].includes(explicitResult)) {
      return explicitResult;
    }
    const values = Object.values(rubric || {}).filter(v => Boolean(v) && v !== "CHUA_DANH_GIA");
    if (values.length === 0) return "CHUA_DANH_GIA";

    let tot = 0, ht = 0, ccg = 0;
    values.forEach(v => {
      if (v === "TOT") tot++;
      else if (v === "HOAN_THANH") ht++;
      else if (v === "CAN_CO_GANG") ccg++;
    });

    if (ccg >= totalCriteria / 2) return "CAN_CO_GANG";
    if (tot >= ht && tot > 0) return "TOT";
    return "HOAN_THANH";
  };

  // Cell change handler
  const handleScoreChange = (studentId: string, criterionId: string, score: string) => {
    if (isLocked) {
      toast.error("Phiên đánh giá đã bị khóa, không thể chỉnh sửa");
      return;
    }
    setStudents(prev => prev.map(s => {
      if (s.studentId !== studentId) return s;
      const newRubric = { ...(s.rubricDetails || {}), [criterionId]: score };
      const totalCrit = currentLesson?.criteria?.length || 3;
      const autoResult = s.attendanceStatus === "ABSENT" ? "VANG" : calculateOverall(newRubric, totalCrit);
      return {
        ...s,
        rubricDetails: newRubric,
        evalResult: autoResult
      };
    }));
    setHasUnsavedChanges(true);
  };

  // Explicit result override
  const handleResultOverride = (studentId: string, result: string) => {
    if (isLocked) return;
    setStudents(prev => prev.map(s => {
      if (s.studentId !== studentId) return s;
      return { ...s, evalResult: result };
    }));
    setHasUnsavedChanges(true);
  };

  // Attendance toggle
  const handleAttendanceToggle = (studentId: string) => {
    if (isLocked) return;
    setStudents(prev => prev.map(s => {
      if (s.studentId !== studentId) return s;
      const newStatus = s.attendanceStatus === "PRESENT" ? "ABSENT" : "PRESENT";
      const totalCrit = currentLesson?.criteria?.length || 3;
      const newResult = newStatus === "ABSENT" ? "VANG" : calculateOverall(s.rubricDetails, totalCrit);
      return {
        ...s,
        attendanceStatus: newStatus,
        evalResult: newResult
      };
    }));
    setHasUnsavedChanges(true);
  };

  // Feedback change
  const handleFeedbackChange = (studentId: string, feedback: string) => {
    if (isLocked) return;
    setStudents(prev => prev.map(s => {
      if (s.studentId !== studentId) return s;
      return { ...s, teacherFeedback: feedback };
    }));
    setHasUnsavedChanges(true);
  };

  // Batch apply to all students
  const handleBatchApply = () => {
    if (isLocked) return;
    if (!currentLesson?.criteria) return;
    setStudents(prev => prev.map(s => {
      if (s.attendanceStatus === "ABSENT") return s;
      const filledRubric: Record<string, string> = {};
      currentLesson.criteria.forEach(c => {
        filledRubric[c.id] = batchScore;
      });
      return {
        ...s,
        rubricDetails: filledRubric,
        evalResult: batchScore
      };
    }));
    setHasUnsavedChanges(true);
    toast.success(`Đã gán nhanh tất cả tiêu chuẩn thành "${batchScore === 'TOT' ? 'Tốt' : batchScore === 'HOAN_THANH' ? 'Hoàn thành' : 'Cần cố gắng'}"`);
  };

  // Save handler (Draft or Completed)
  const handleSave = async (targetStatus: "DRAFT" | "COMPLETED") => {
    if (!selectedAssignmentId || !selectedLessonId) return;
    try {
      setSaving(true);
      const payload = {
        assignmentId: selectedAssignmentId,
        lessonId: selectedLessonId,
        status: targetStatus,
        entries: students.map(s => ({
          studentId: s.studentId,
          rubricDetails: s.rubricDetails,
          evalResult: s.evalResult,
          teacherFeedback: s.teacherFeedback,
          attendanceStatus: s.attendanceStatus
        }))
      };

      const res = await fetch("/api/special-subjects/gradebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(targetStatus === "COMPLETED" ? "Đã nộp kết quả đánh giá bài học thành công!" : "Đã lưu nháp kết quả!");
        setSessionStatus(targetStatus);
        setHasUnsavedChanges(false);
        fetchGradebookData();
      } else {
        toast.error(json.error || "Lỗi lưu dữ liệu");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi máy chủ khi lưu kết quả");
    } finally {
      setSaving(false);
    }
  };

  // Sequential lesson navigation
  const currentLessonIndex = useMemo(() => {
    return lessons.findIndex(l => l.id === selectedLessonId);
  }, [lessons, selectedLessonId]);

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      const prev = lessons[currentLessonIndex - 1];
      setSelectedLessonId(prev.id);
      setCurrentLesson(prev);
    }
  };

  const handleNextLesson = () => {
    if (currentLessonIndex >= 0 && currentLessonIndex < lessons.length - 1) {
      const next = lessons[currentLessonIndex + 1];
      setSelectedLessonId(next.id);
      setCurrentLesson(next);
    }
  };

  // Filtered students for display
  const displayedStudents = useMemo(() => {
    return students.filter(s => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = s.studentName.toLowerCase().includes(q);
        const matchCode = s.studentCode.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      if (statusFilter === "ABSENT" && s.attendanceStatus !== "ABSENT") return false;
      if (statusFilter === "UNGRADED" && (s.evalResult && s.evalResult !== "CHUA_DANH_GIA")) return false;
      if (statusFilter === "GRADED" && (!s.evalResult || s.evalResult === "CHUA_DANH_GIA")) return false;
      return true;
    });
  }, [students, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    let tot = 0, ht = 0, ccg = 0, vang = 0, un = 0;
    students.forEach(s => {
      if (s.attendanceStatus === "ABSENT") vang++;
      else if (s.evalResult === "TOT") tot++;
      else if (s.evalResult === "HOAN_THANH") ht++;
      else if (s.evalResult === "CAN_CO_GANG") ccg++;
      else un++;
    });
    return { tot, ht, ccg, vang, un, total: students.length };
  }, [students]);

  const currentActiveSubject = SPECIAL_SUBJECTS.find(s => s.code === selectedSubjectCode) || SPECIAL_SUBJECTS[0];
  const ActiveIcon = currentActiveSubject.icon;
  const switcherSubjects = assignedSubjects.length > 0 ? assignedSubjects : [currentActiveSubject];
  const assignedGradeBadge = availableGrades.length > 0 ? `Khối ${availableGrades.join(", ")}` : currentActiveSubject.badge;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* 1. Header with Sky-Line Brand identity */}
      <header className="bg-[#003B3A] text-white border-b border-teal-800 shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Link 
              href="/teacher/phan-cong-giang-day"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-teal-200"
              title="Quay lại Phân công giảng dạy"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2 rounded-xl bg-teal-600/30 border border-teal-400/30">
              <ActiveIcon className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Đánh giá {currentActiveSubject.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                  {assignedGradeBadge}
                </span>
                <Link
                  href={`/teacher/special-subjects/skyline-journey${activeAssignment?.classId ? `?classId=${activeAssignment.classId}` : ""}`}
                  className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm transition"
                >
                  🐦 Hành trình Sky-Line (Đảo Game)
                </Link>
              </div>
              <p className="text-xs text-teal-200/80">
                Form đánh giá môn đặc thù được phân công • Chuẩn hóa chương trình 2026–2027
              </p>
            </div>
          </div>

          {/* Quick Subject Switcher (Only assigned special subjects) */}
          <div className="flex items-center bg-black/20 p-1 rounded-xl border border-white/10">
            {switcherSubjects.map(subj => {
              const SubjIcon = subj.icon;
              const isSelected = selectedSubjectCode === subj.code;
              return (
                <button
                  key={subj.code}
                  onClick={() => {
                    if (isSelected) return;
                    if (hasUnsavedChanges) {
                      if (!confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn đổi môn học?")) return;
                    }
                    setSelectedSubjectCode(subj.code);
                    setSelectedCampusId("ALL");
                    setSelectedGrade("ALL");
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isSelected
                      ? "bg-teal-500 text-white shadow-sm"
                      : "text-teal-100/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <SubjIcon className="w-3.5 h-3.5" />
                  <span>{subj.name.replace("Giáo dục ", "GD ")}</span>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-400/20 text-amber-200 border border-amber-400/30 animate-pulse">
                Chưa lưu
              </span>
            )}
            <button
              onClick={() => handleSave("DRAFT")}
              disabled={saving || isLocked}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu nháp</span>
            </button>
            <button
              onClick={() => handleSave("COMPLETED")}
              disabled={saving || isLocked}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-white shadow-md transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Hoàn thành & Khóa</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Top Cascading Selector Toolbar: Năm học -> Cơ sở -> Môn -> Khối -> Lớp */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Campus Selector (Only assigned campuses) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                1. Cơ sở Sky-Line
              </label>
              <select
                value={selectedCampusId}
                onChange={e => setSelectedCampusId(e.target.value)}
                disabled={availableCampuses.length === 0}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
              >
                {availableCampuses.length === 0 ? (
                  <option value="ALL">Chưa có cơ sở phân công</option>
                ) : (
                  <>
                    {availableCampuses.length > 1 && (
                      <option value="ALL">Tất cả cơ sở được phân công ({availableCampuses.length})</option>
                    )}
                    {availableCampuses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Grade Selector (Only assigned grades) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                2. Khối lớp ({assignedGradeBadge})
              </label>
              <select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                disabled={availableGrades.length === 0}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
              >
                {availableGrades.length === 0 ? (
                  <option value="ALL">Chưa có khối phân công</option>
                ) : (
                  <>
                    {availableGrades.length > 1 && (
                      <option value="ALL">Tất cả khối được phân công ({availableGrades.length})</option>
                    )}
                    {availableGrades.map(g => (
                      <option key={g} value={g}>Khối {g}</option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Class Selector (Only assigned classes) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                3. Lớp được phân công
              </label>
              <select
                value={selectedAssignmentId}
                onChange={e => setSelectedAssignmentId(e.target.value)}
                disabled={filteredAssignments.length === 0}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
              >
                {filteredAssignments.length === 0 ? (
                  <option value="">Không có lớp phân công</option>
                ) : (
                  filteredAssignments.map(a => (
                    <option key={a.id} value={a.id}>
                      Lớp {a.class?.className} ({a.class?.campus?.campusName || 'Sky-Line'})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Lesson Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                4. Bài học ({lessons.length} bài)
              </label>
              <select
                value={selectedLessonId}
                onChange={e => {
                  setSelectedLessonId(e.target.value);
                  const l = lessons.find(item => item.id === e.target.value);
                  if (l) setCurrentLesson(l);
                }}
                disabled={lessons.length === 0}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
              >
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>
                    Bài {l.periodIndex}: {l.lessonName.substring(0, 32)}... ({l.criteriaCount} TC)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Current Lesson Navigation Bar */}
          {currentLesson && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  {currentLesson.topicName || `Chủ đề Khối ${currentLesson.grade}`}
                </span>
                <span className="text-sm font-bold text-slate-800">
                  Bài {currentLesson.periodIndex}: {currentLesson.lessonName}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                  {currentLesson.criteriaCount} tiêu chuẩn đánh giá
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevLesson}
                  disabled={currentLessonIndex <= 0}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Bài trước</span>
                </button>
                <span className="text-xs text-slate-500 font-medium">
                  {currentLessonIndex + 1} / {lessons.length}
                </span>
                <button
                  onClick={handleNextLesson}
                  disabled={currentLessonIndex >= lessons.length - 1}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-40"
                >
                  <span>Bài tiếp theo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Session Status & Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-5">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Sĩ số lớp</p>
              <p className="text-base font-extrabold text-slate-800">{stats.total}</p>
            </div>
            <GraduationCap className="w-5 h-5 text-slate-400" />
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Đạt Tốt (T)</p>
              <p className="text-base font-extrabold text-emerald-700">{stats.tot}</p>
            </div>
            <Sparkles className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase">Hoàn thành (H)</p>
              <p className="text-base font-extrabold text-blue-700">{stats.ht}</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-amber-600 uppercase">Cần cố gắng (C)</p>
              <p className="text-base font-extrabold text-amber-700">{stats.ccg}</p>
            </div>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Vắng mặt</p>
              <p className="text-base font-extrabold text-slate-700">{stats.vang}</p>
            </div>
            <UserX className="w-5 h-5 text-slate-400" />
          </div>
          <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-purple-600 uppercase">Trạng thái sổ</p>
              <p className="text-xs font-bold text-purple-800">
                {isLocked ? "ĐÃ KHÓA" : sessionStatus === "COMPLETED" ? "ĐÃ NỘP" : "BẢN NHÁP"}
              </p>
            </div>
            {isLocked ? <Lock className="w-5 h-5 text-purple-600" /> : <Unlock className="w-5 h-5 text-teal-600" />}
          </div>
        </div>

        {/* 4. Filter & Mode Switching Toolbar */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1">
              <button
                onClick={() => setViewMode("MATRIX")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === "MATRIX" ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Ma trận toàn lớp</span>
              </button>
              <button
                onClick={() => setViewMode("CARD")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === "CARD" ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Thẻ từng học sinh</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên học sinh..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 w-52"
              />
            </div>
          </div>

          {/* Batch Quick Assign */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Gán nhanh cả lớp:</span>
            <select
              value={batchScore}
              onChange={e => setBatchScore(e.target.value as any)}
              className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none"
            >
              <option value="TOT">Tất cả Tốt (T)</option>
              <option value="HOAN_THANH">Tất cả Hoàn thành (H)</option>
              <option value="CAN_CO_GANG">Tất cả Cần cố gắng (C)</option>
            </select>
            <button
              onClick={handleBatchApply}
              disabled={isLocked || displayedStudents.length === 0}
              className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-lg border border-teal-200 transition disabled:opacity-50"
            >
              Áp dụng
            </button>
          </div>
        </div>

        {/* 5. Main Content: Matrix View or Card View */}
        {gradebookLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <RefreshCcw className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Đang tải danh sách học sinh và tiêu chuẩn đánh giá...</p>
          </div>
        ) : displayedStudents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Chưa có dữ liệu học sinh</p>
            <p className="text-xs text-slate-500 mt-1">Vui lòng kiểm tra lại lớp được phân công hoặc bài học đang chọn.</p>
          </div>
        ) : viewMode === "MATRIX" ? (
          /* MATRIX GRID VIEW */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[650px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200 sticky top-0 z-20">
                    <th className="py-3 px-3 w-12 text-center bg-slate-100">STT</th>
                    <th className="py-3 px-3 w-28 bg-slate-100">Mã HS</th>
                    <th className="py-3 px-4 min-w-[180px] bg-slate-100">Họ và tên</th>
                    <th className="py-3 px-2 w-24 text-center bg-slate-100">Điểm danh</th>

                    {/* DYNAMIC CRITERIA HEADERS */}
                    {(currentLesson?.criteria || []).map((crit, idx) => (
                      <th 
                        key={`crit-header-${crit.id || idx}-${idx}`} 
                        className="py-3 px-3 min-w-[140px] text-center border-l border-slate-200 group relative cursor-help"
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-extrabold text-teal-800">TC {idx + 1}</span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[120px] font-mono">
                            {crit.code}
                          </span>
                          {crit.programLevel && (
                            <span className="mt-0.5 px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 font-semibold">
                              {crit.programLevel}
                            </span>
                          )}
                        </div>

                        {/* Tooltip Description */}
                        <div className="absolute hidden group-hover:block z-50 w-64 p-2.5 bg-slate-900 text-white rounded-xl shadow-xl text-[11px] font-normal leading-relaxed left-1/2 -translate-x-1/2 top-full mt-1 border border-slate-700 pointer-events-none">
                          <p className="font-bold text-teal-300 mb-1">{crit.code} • {crit.programLevel || 'Chuẩn CT'}</p>
                          <p>{crit.description}</p>
                        </div>
                      </th>
                    ))}

                    <th className="py-3 px-3 w-28 text-center border-l border-slate-200 bg-teal-50/50">
                      Kết quả bài
                    </th>
                    <th className="py-3 px-3 min-w-[160px] border-l border-slate-200">
                      Nhận xét của giáo viên
                    </th>
                    <th className="py-3 px-2 w-12 text-center border-l border-slate-200">
                      Lịch sử
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedStudents.map((st, idx) => {
                    const isAbsent = st.attendanceStatus === "ABSENT";
                    return (
                      <tr 
                        key={`eval-row-${st.studentId || idx}-${idx}`} 
                        className={`hover:bg-slate-50/80 transition ${isAbsent ? "bg-slate-50/50 opacity-75" : ""}`}
                      >
                        {/* STT */}
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono bg-white">
                          {idx + 1}
                        </td>
                        {/* Code */}
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-600 bg-white whitespace-nowrap">
                          {st.studentCode}
                        </td>
                        {/* Name */}
                        <td className="py-2.5 px-4 font-bold text-slate-800 bg-white whitespace-nowrap">
                          {st.studentName}
                        </td>
                        {/* Attendance Toggle */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleAttendanceToggle(st.studentId)}
                            disabled={isLocked}
                            className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                              isAbsent 
                                ? "bg-rose-100 text-rose-700 hover:bg-rose-200" 
                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            }`}
                            title={isAbsent ? "Học sinh vắng (Bấm để đổi thành Có mặt)" : "Học sinh có mặt (Bấm để đổi thành Vắng)"}
                          >
                            {isAbsent ? "VẮNG" : "CÓ"}
                          </button>
                        </td>

                        {/* Dynamic Criteria Evaluation Cells */}
                        {(currentLesson?.criteria || []).map((crit, cIdx) => {
                          const val = st.rubricDetails[crit.id] || "";
                          return (
                            <td 
                              key={`crit-cell-${crit.id || cIdx}-${cIdx}`} 
                              className="py-2 px-2 text-center border-l border-slate-100"
                            >
                              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                                <button
                                  onClick={() => handleScoreChange(st.studentId, crit.id, "TOT")}
                                  disabled={isLocked || isAbsent}
                                  className={`px-2 py-1 text-[11px] font-bold rounded-md transition ${
                                    val === "TOT" 
                                      ? "bg-emerald-600 text-white shadow-xs" 
                                      : "text-slate-600 hover:text-emerald-700"
                                  }`}
                                  title="Tốt (Phím tắt: 1)"
                                >
                                  T
                                </button>
                                <button
                                  onClick={() => handleScoreChange(st.studentId, crit.id, "HOAN_THANH")}
                                  disabled={isLocked || isAbsent}
                                  className={`px-2 py-1 text-[11px] font-bold rounded-md transition ${
                                    val === "HOAN_THANH" 
                                      ? "bg-blue-600 text-white shadow-xs" 
                                      : "text-slate-600 hover:text-blue-700"
                                  }`}
                                  title="Hoàn thành (Phím tắt: 2)"
                                >
                                  H
                                </button>
                                <button
                                  onClick={() => handleScoreChange(st.studentId, crit.id, "CAN_CO_GANG")}
                                  disabled={isLocked || isAbsent}
                                  className={`px-2 py-1 text-[11px] font-bold rounded-md transition ${
                                    val === "CAN_CO_GANG" 
                                      ? "bg-amber-500 text-white shadow-xs" 
                                      : "text-slate-600 hover:text-amber-700"
                                  }`}
                                  title="Cần cố gắng (Phím tắt: 3)"
                                >
                                  C
                                </button>
                              </div>
                            </td>
                          );
                        })}

                        {/* Overall Lesson Result */}
                        <td className="py-2.5 px-3 text-center border-l border-slate-100 bg-teal-50/20 font-bold">
                          {isAbsent ? (
                            <span className="px-2 py-1 rounded text-xs bg-slate-200 text-slate-700">
                              VẮNG
                            </span>
                          ) : (
                            <select
                              value={st.evalResult || "CHUA_DANH_GIA"}
                              onChange={e => handleResultOverride(st.studentId, e.target.value)}
                              disabled={isLocked}
                              className={`text-xs font-bold rounded-lg px-2 py-1 border transition ${
                                st.evalResult === "TOT"
                                  ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                                  : st.evalResult === "HOAN_THANH"
                                  ? "bg-blue-100 border-blue-300 text-blue-800"
                                  : st.evalResult === "CAN_CO_GANG"
                                  ? "bg-amber-100 border-amber-300 text-amber-800"
                                  : "bg-slate-100 border-slate-300 text-slate-500"
                              }`}
                            >
                              <option value="CHUA_DANH_GIA">Chưa ĐG</option>
                              <option value="TOT">Tốt</option>
                              <option value="HOAN_THANH">Hoàn thành</option>
                              <option value="CAN_CO_GANG">Cần cố gắng</option>
                            </select>
                          )}
                        </td>

                        {/* Feedback Input */}
                        <td className="py-2 px-3 border-l border-slate-100">
                          <input
                            type="text"
                            placeholder="Nhận xét sự tiến bộ..."
                            value={st.teacherFeedback}
                            onChange={e => handleFeedbackChange(st.studentId, e.target.value)}
                            disabled={isLocked}
                            className="w-full text-xs px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </td>

                        {/* Audit Log Drawer Trigger */}
                        <td className="py-2.5 px-2 text-center border-l border-slate-100">
                          <button
                            onClick={() => setSelectedAuditStudent(st)}
                            className="p-1 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition"
                            title="Xem lịch sử chỉnh sửa điểm"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* SINGLE-STUDENT CARD VIEW (IPAD/TABLET OPTIMIZED) */
          <div className="max-w-3xl mx-auto">
            {displayedStudents[activeStudentIndex] && (() => {
              const st = displayedStudents[activeStudentIndex];
              const isAbsent = st.attendanceStatus === "ABSENT";

              return (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                          {st.studentCode}
                        </span>
                        <h2 className="text-xl font-bold text-slate-900">{st.studentName}</h2>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Học sinh thứ {activeStudentIndex + 1} / {displayedStudents.length} • Lớp {activeAssignment?.class?.className}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAttendanceToggle(st.studentId)}
                      disabled={isLocked}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        isAbsent 
                          ? "bg-rose-100 text-rose-700 border border-rose-200" 
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {isAbsent ? "TRẠNG THÁI: VẮNG HỌC" : "TRẠNG THÁI: CÓ MẶT"}
                    </button>
                  </div>

                  {/* Criteria Cards */}
                  <div className="space-y-4 mb-6">
                    {(currentLesson?.criteria || []).map((crit, idx) => {
                      const val = st.rubricDetails[crit.id] || "";
                      return (
                        <div key={crit.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-sm text-teal-800">
                                  Tiêu chuẩn {idx + 1}
                                </span>
                                <span className="text-xs font-mono text-slate-500">({crit.code})</span>
                                {crit.programLevel && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                                    {crit.programLevel}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-700 mt-1 leading-relaxed">{crit.description}</p>
                            </div>
                          </div>

                          {/* Score Pills */}
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            <button
                              onClick={() => handleScoreChange(st.studentId, crit.id, "TOT")}
                              disabled={isLocked || isAbsent}
                              className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                                val === "TOT" 
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" 
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              TỐT (T)
                            </button>
                            <button
                              onClick={() => handleScoreChange(st.studentId, crit.id, "HOAN_THANH")}
                              disabled={isLocked || isAbsent}
                              className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                                val === "HOAN_THANH" 
                                  ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              HOÀN THÀNH (H)
                            </button>
                            <button
                              onClick={() => handleScoreChange(st.studentId, crit.id, "CAN_CO_GANG")}
                              disabled={isLocked || isAbsent}
                              className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                                val === "CAN_CO_GANG" 
                                  ? "bg-amber-500 border-amber-500 text-white shadow-sm" 
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              CẦN CỐ GẮNG (C)
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Overall Result & Feedback */}
                  <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-100 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                        Kết quả tổng hợp bài học:
                      </span>
                      <select
                        value={st.evalResult || "CHUA_DANH_GIA"}
                        onChange={e => handleResultOverride(st.studentId, e.target.value)}
                        disabled={isLocked}
                        className="text-xs font-bold rounded-xl px-3 py-1.5 border border-teal-300 bg-white text-slate-800 focus:outline-none"
                      >
                        <option value="CHUA_DANH_GIA">Chưa đánh giá</option>
                        <option value="TOT">Tốt (T)</option>
                        <option value="HOAN_THANH">Hoàn thành (H)</option>
                        <option value="CAN_CO_GANG">Cần cố gắng (C)</option>
                        <option value="VANG">Vắng mặt (V)</option>
                      </select>
                    </div>

                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nhận xét & Hướng dẫn phát triển cá nhân:
                    </label>
                    <textarea
                      rows={2}
                      value={st.teacherFeedback}
                      onChange={e => handleFeedbackChange(st.studentId, e.target.value)}
                      disabled={isLocked}
                      placeholder="Ghi nhận điểm mạnh, sở thích hoặc sự tiến bộ nổi bật của học sinh..."
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Card Navigation Stepper */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveStudentIndex(Math.max(0, activeStudentIndex - 1))}
                      disabled={activeStudentIndex === 0}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Học sinh trước</span>
                    </button>

                    <span className="text-xs font-bold text-slate-500">
                      {activeStudentIndex + 1} / {displayedStudents.length}
                    </span>

                    <button
                      onClick={() => setActiveStudentIndex(Math.min(displayedStudents.length - 1, activeStudentIndex + 1))}
                      disabled={activeStudentIndex >= displayedStudents.length - 1}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition disabled:opacity-40"
                    >
                      <span>Học sinh tiếp theo</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* 6. Audit Log Drawer */}
      {selectedAuditStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Lịch sử đánh giá & Audit Log</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedAuditStudent.studentName} ({selectedAuditStudent.studentCode})
                </p>
              </div>
              <button 
                onClick={() => setSelectedAuditStudent(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {(selectedAuditStudent.auditLogs || []).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Chưa có lịch sử điều chỉnh điểm</p>
              ) : (
                selectedAuditStudent.auditLogs?.map((log: any, lIdx: number) => (
                  <div key={lIdx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-teal-700">{log.action}</span>
                      <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
                    </div>
                    <p className="text-slate-600">
                      Giá trị: <span className="line-through text-slate-400">{log.oldValue || 'None'}</span> → <span className="font-bold text-slate-800">{log.newValue}</span>
                    </p>
                    {log.reason && <p className="text-[11px] text-slate-500 mt-1 italic">"{log.reason}"</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UniversalSpecialSubjectEvaluationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải biểu mẫu đánh giá môn đặc thù...</div>}>
      <UniversalSpecialSubjectEvaluationContent />
    </Suspense>
  );
}
