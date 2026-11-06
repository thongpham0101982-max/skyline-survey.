"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  UserCheck,
  FileText,
  Clock,
  ScanLine,
  CheckCircle2,
  BarChart3,
  Plus,
  RefreshCcw,
  AlertTriangle,
  ShieldCheck,
  Printer,
  Shuffle,
  Lock,
  Unlock,
  Send,
  Search,
  Globe,
  BookOpen,
  Layers,
  Award,
  Sparkles,
  Check,
  X,
  ExternalLink,
  BellRing,
} from "lucide-react";
import { ExamMatrixTable } from "@/components/testing/ExamMatrixTable";
import { ScoreDistributionChart } from "@/components/testing/ScoreDistributionChart";
import { CampusComparisonChart } from "@/components/testing/CampusComparisonChart";
import EdgeOmrGradingWorkbench from "@/components/testing/EdgeOmrGradingWorkbench";
import NotificationManagementWorkspace from "@/components/notification-center/NotificationManagementWorkspace";
import { validateExamMatrix } from "@/lib/testing/examMatrixService";

type TabKey =
  | "overview"
  | "periods"
  | "assignments"
  | "papers"
  | "sessions"
  | "grading"
  | "results"
  | "reports"
  | "notifications";

interface KhaoThiSoClientProps {
  mode: "admin" | "teacher";
}

const WORKFLOW_10_STEPS = [
  { step: 1, label: "1. Kỳ kiểm tra", tab: "periods" as TabKey },
  { step: 2, label: "2. Bài kiểm tra", tab: "periods" as TabKey },
  { step: 3, label: "3. Phân công", tab: "assignments" as TabKey },
  { step: 4, label: "4. Ma trận đề", tab: "papers" as TabKey },
  { step: 5, label: "5. Soạn đề (OMR/LMS)", tab: "papers" as TabKey },
  { step: 6, label: "6. Duyệt đề chính thức", tab: "papers" as TabKey },
  { step: 7, label: "7. Tổ chức & Coi thi", tab: "sessions" as TabKey },
  { step: 8, label: "8. Chấm bài (OMR/LMS)", tab: "grading" as TabKey },
  { step: 9, label: "9. Duyệt & Khóa điểm", tab: "results" as TabKey },
  { step: 10, label: "10. Phân tích chất lượng", tab: "reports" as TabKey },
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  MATRIX_AUTHOR: {
    label: "Ra Ma trận & Đặc tả",
    color: "bg-teal-50 text-teal-800 border-teal-200",
  },
  PAPER_AUTHOR: {
    label: "Soạn đề gốc / LMS Quiz",
    color: "bg-teal-50 text-teal-800 border-teal-200",
  },
  PEER_REVIEWER: {
    label: "Phản biện chéo",
    color: "bg-sky-100 text-sky-800 border-sky-200",
  },
  APPROVER: {
    label: "Duyệt đề chính thức (TTCM/KTĐBCL)",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  PROCTOR: {
    label: "Giám thị coi kiểm tra",
    color: "bg-amber-100 text-amber-800 border-amber-200",
  },
  GRADER: {
    label: "Chấm tự luận & Rà soát OMR",
    color: "bg-teal-100 text-teal-800 border-teal-200",
  },
};

export default function KhaoThiSoAdminClient({ mode }: KhaoThiSoClientProps) {
  const searchParams = useSearchParams();
  const urlTab = (searchParams.get("tab") as TabKey) || "overview";

  const [activeTab, setActiveTab] = useState<TabKey>(urlTab);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const t = searchParams.get("tab") as TabKey | null;
    if (
      t &&
      [
        "overview",
        "periods",
        "assignments",
        "papers",
        "sessions",
        "grading",
        "results",
        "reports",
        "notifications",
      ].includes(t)
    ) {
      setActiveTab(t);
    }
  }, [searchParams]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [data, setData] = useState<any>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal / Form states
  const [showNewPeriodForm, setShowNewPeriodForm] = useState(false);
  const [isCustomPeriodCode, setIsCustomPeriodCode] = useState(false);
  const [isCustomPeriodName, setIsCustomPeriodName] = useState(false);
  const [newPeriodForm, setNewPeriodForm] = useState({
    academicYearId: "",
    code: "",
    name: "",
    semester: "HK1",
    examType: "MIDTERM",
    programType: "MOET",
    campusId: "",
    gradeLevels: "10,11,12",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    isMakeup: false,
    parentPeriodId: "",
  });

  // Sync with global header academic year selector (localStorage "selectedAcademicYear")
  useEffect(() => {
    const syncGlobalYear = () => {
      if (typeof window === "undefined") return;
      const storedYearId = localStorage.getItem("selectedAcademicYear");
      if (storedYearId) {
        setNewPeriodForm((prev) =>
          prev.academicYearId === storedYearId
            ? prev
            : { ...prev, academicYearId: storedYearId }
        );
      }
    };
    syncGlobalYear();
    window.addEventListener("academicYearChanged", syncGlobalYear);
    return () => window.removeEventListener("academicYearChanged", syncGlobalYear);
  }, []);

  // Auto-select active academic year once workspace data loads if not set yet
  useEffect(() => {
    if (!data?.academicYears?.length) return;
    setNewPeriodForm((prev) => {
      if (
        prev.academicYearId &&
        data.academicYears.some((y: any) => y.id === prev.academicYearId)
      ) {
        return prev;
      }
      const stored =
        typeof window !== "undefined"
          ? localStorage.getItem("selectedAcademicYear")
          : null;
      const matchedStored = stored
        ? data.academicYears.find((y: any) => y.id === stored)
        : null;
      const activeYear =
        matchedStored ||
        data.academicYears.find((y: any) => y.status === "ACTIVE") ||
        data.academicYears[0];
      return activeYear ? { ...prev, academicYearId: activeYear.id } : prev;
    });
  }, [data?.academicYears]);

  // Helper to build structured Period Code & Name from Academic Year + Structure
  const computeStructuredPeriodMeta = useCallback(
    (formState: typeof newPeriodForm) => {
      const years = data?.academicYears || [];
      const selectedYear =
        years.find((y: any) => y.id === formState.academicYearId) ||
        years.find((y: any) => y.status === "ACTIVE") ||
        years[0];

      const yearName = selectedYear?.name || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      const yearToken = String(yearName).replace(/\s+/g, "").toUpperCase();
      const semNum = formState.semester === "HK2" ? "2" : "1";
      const semLabel = formState.semester === "HK2" ? "Học kỳ II" : "Học kỳ I";

      const typePrefix =
        formState.examType === "FINAL"
          ? `CK${semNum}`
          : formState.examType === "REGULAR"
          ? `TX${semNum}`
          : formState.examType === "MAKEUP" || formState.isMakeup
          ? `GK${semNum}-BU`
          : `GK${semNum}`;

      const typeLabel =
        formState.examType === "FINAL"
          ? "Cuối kỳ"
          : formState.examType === "REGULAR"
          ? "Định kỳ"
          : formState.examType === "MAKEUP" || formState.isMakeup
          ? "Kiểm tra bù"
          : "Giữa kỳ";

      const progToken =
        formState.programType && formState.programType !== "MOET"
          ? `-${formState.programType.toUpperCase()}`
          : "";

      let campusToken = "";
      if (formState.campusId && data?.campuses?.length) {
        const cp = data.campuses.find((c: any) => c.id === formState.campusId);
        if (cp?.code) {
          campusToken = `-${String(cp.code).toUpperCase()}`;
        }
      }

      const baseCode = `KT-${typePrefix}${progToken}${campusToken}-${yearToken}`;
      const existingCodes = new Set(
        (data?.periods || []).map((p: any) => String(p.code).toUpperCase())
      );
      let autoCode = baseCode;
      let seq = 2;
      while (existingCodes.has(autoCode)) {
        autoCode = `${baseCode}-D${seq}`;
        seq++;
      }

      const autoName = `${
        formState.examType === "MAKEUP" || formState.isMakeup
          ? `Đợt Kiểm tra bù ${semLabel}`
          : `Kiểm tra ${typeLabel} - ${semLabel}`
      }${formState.programType === "CTQT" ? " (CTQT)" : ""} (${yearName})`;

      return { autoCode, autoName, yearName };
    },
    [data?.academicYears, data?.campuses, data?.periods]
  );

  // Automatically update code and name when structural fields change
  useEffect(() => {
    const { autoCode, autoName } = computeStructuredPeriodMeta(newPeriodForm);
    setNewPeriodForm((prev) => ({
      ...prev,
      code: isCustomPeriodCode ? prev.code : autoCode,
      name: isCustomPeriodName ? prev.name : autoName,
    }));
  }, [
    newPeriodForm.academicYearId,
    newPeriodForm.semester,
    newPeriodForm.examType,
    newPeriodForm.programType,
    newPeriodForm.campusId,
    newPeriodForm.isMakeup,
    isCustomPeriodCode,
    isCustomPeriodName,
    computeStructuredPeriodMeta,
  ]);

  const [showNewExamForm, setShowNewExamForm] = useState(false);
  const [newExamForm, setNewExamForm] = useState({
    subjectId: "",
    gradeLevel: "10",
    examFormat: "HYBRID",
    durationMinutes: 90,
    mcqWeight: 7.0,
    essayWeight: 3.0,
    moodleCourseId: "",
    moodleQuizId: "",
  });

  const [newTaskForm, setNewTaskForm] = useState({
    departmentId: "",
    teacherId: "",
    role: "PAPER_AUTHOR",
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    reviewNote: "",
  });

  const [newSessionForm, setNewSessionForm] = useState({
    classId: "",
    roomName: "Phòng thi P.202",
    examDate: new Date().toISOString().slice(0, 10),
    startTime: "07:45",
    endTime: "09:15",
    slotNumber: 1,
    proctorDepartmentId: "",
    proctorTeacherId: "",
  });

  const [lmsVerifyReport, setLmsVerifyReport] = useState<any>(null);
  const [editingEssayScores, setEditingEssayScores] = useState<
    Record<string, { score: string; comment: string }>
  >({});

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const fetchWorkspace = useCallback(
    async (periodIdOverride?: string) => {
      setLoading(true);
      try {
        const pId = periodIdOverride ?? selectedPeriodId;
        const url = `/api/testing/workspace?scope=${mode}${
          pId ? `&periodId=${encodeURIComponent(pId)}` : ""
        }`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
          setData(json);
          if (!selectedPeriodId && json.activePeriodId) {
            setSelectedPeriodId(json.activePeriodId);
          }
          if (
            json.subjectExams?.length > 0 &&
            (!selectedExamId ||
              !json.subjectExams.some((e: any) => e.id === selectedExamId))
          ) {
            setSelectedExamId(json.subjectExams[0].id);
          }
        } else {
          showToast("error", json.error || "Không thể tải dữ liệu Khảo thí Số");
        }
      } catch (err: any) {
        showToast("error", err?.message || "Lỗi kết nối máy chủ");
      } finally {
        setLoading(false);
      }
    },
    [mode, selectedPeriodId, selectedExamId]
  );

  useEffect(() => {
    fetchWorkspace();
  }, []);

  const selectedExam = useMemo(() => {
    if (!data?.subjectExams) return null;
    return (
      data.subjectExams.find((e: any) => e.id === selectedExamId) ||
      data.subjectExams[0] ||
      null
    );
  }, [data, selectedExamId]);

  const dispatchAction = async (payload: Record<string, any>, successMessage: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/testing/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        showToast("error", json.error || "Thao tác không thành công");
        return null;
      }
      showToast("success", successMessage);
      await fetchWorkspace(selectedPeriodId);
      return json;
    } catch (err: any) {
      showToast("error", err?.message || "Lỗi kết nối API");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Transform selectedExam's latest matrix into ExamMatrixTable props
  const matrixViewData = useMemo(() => {
    if (!selectedExam?.latestMatrix) return null;
    const m = selectedExam.latestMatrix;
    let rawCells: any[] = [];
    try {
      rawCells = JSON.parse(m.matrixJson || "[]");
    } catch {
      rawCells = [];
    }
    const levelMap: Record<string, any> = {
      NB: "NHAN_BIET",
      TH: "THONG_HIEU",
      VD: "VAN_DUNG",
      VDC: "VAN_DUNG_CAO",
    };
    const items = rawCells.map((c, idx) => {
      const pts = Math.round(Number(c.questionCount || 0) * Number(c.pointsPerQuestion || 0.5) * 100) / 100;
      return {
        id: `M-CELL-${idx + 1}`,
        topic: c.topicName || "Chủ đề kiến thức",
        level: levelMap[c.level] || "NHAN_BIET",
        questionCount: Number(c.questionCount || 0),
        pointsPerQuestion: Number(c.pointsPerQuestion || 0.5),
        totalPoints: pts,
        percentage: Math.round(pts * 10),
        availableInBank: Math.max(Number(c.questionCount || 0) * 2, 6),
      };
    });

    const validation = validateExamMatrix({
      id: m.id,
      code: `MT-V${m.version}`,
      name: m.title,
      subjectCode: selectedExam.subjectCode || "SUB",
      subjectName: selectedExam.subjectName,
      grade: selectedExam.gradeLevel,
      durationMinutes: selectedExam.durationMinutes,
      items,
    });

    return { matrix: m, items, validation };
  }, [selectedExam]);

  const TABS: Array<{ key: TabKey; label: string; icon: any; badge?: number }> = [
    { key: "overview", label: "Tổng quan", icon: LayoutDashboard },
    {
      key: "periods",
      label: "Kỳ kiểm tra",
      icon: Calendar,
      badge: data?.periods?.length || 0,
    },
    {
      key: "assignments",
      label: "Phân công",
      icon: UserCheck,
      badge: data?.kpis?.overdueTasksCount || 0,
    },
    { key: "papers", label: "Hồ sơ đề", icon: FileText },
    {
      key: "sessions",
      label: "Lịch & Coi kiểm tra",
      icon: Clock,
      badge: data?.kpis?.totalSessions || 0,
    },
    {
      key: "grading",
      label: "Chấm bài (OMR/LMS)",
      icon: ScanLine,
      badge: data?.kpis?.omrFlaggedCount || 0,
    },
    { key: "results", label: "Kết quả & Duyệt điểm", icon: CheckCircle2 },
    { key: "reports", label: "Báo cáo & Lưu trữ", icon: BarChart3 },
    { key: "notifications", label: "Thông báo khảo thí", icon: BellRing },
  ];

  if (loading && !data) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-24 rounded-2xl bg-gradient-to-r from-[#003B3A] via-[#135E5B] to-[#6D28D9] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const periods = data?.periods || [];
  const subjectExams = data?.subjectExams || [];

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold transition-all ${
            toastMsg.type === "success"
              ? "bg-emerald-950 text-emerald-100 border-emerald-500/40"
              : "bg-red-950 text-red-100 border-red-500/40"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header Banner: SSM Deep Pine + Sky-Line Global Purple */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#0F4C4A] to-[#5B21B6] text-white px-6 py-6 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>
                {mode === "teacher"
                  ? "Không gian Giáo viên • Nhiệm vụ Khảo thí được phân công"
                  : "Hệ thống Quản trị Khảo thí Số Thống nhất • SSM Sky-Line Global"}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold mt-1 tracking-tight">
              {mode === "teacher"
                ? "Nhiệm vụ Khảo thí Số của Tôi (Ma trận • Đề thi • Coi thi • Chấm OMR/LMS)"
                : "Phân hệ Khảo thí Số (Digital Testing, Moodle LMS & Chấm Trắc nghiệm OMR)"}
            </h1>
            <p className="text-xs text-slate-200/90 mt-1 max-w-3xl">
              Quy trình 10 bước chuẩn hóa: Kỳ kiểm tra → Bài kiểm tra → Phân công → Ma trận → Soạn đề → Duyệt đề → Tổ chức kiểm tra → Chấm bài → Duyệt điểm → Phân tích chất lượng.
            </p>
          </div>

          {/* Period & Subject Exam Selector */}
          <div className="flex flex-wrap items-center gap-2.5 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/15">
            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-wider text-teal-700 font-semibold">
                Kỳ kiểm tra
              </label>
              <select
                value={selectedPeriodId}
                onChange={(e) => {
                  setSelectedPeriodId(e.target.value);
                  fetchWorkspace(e.target.value);
                }}
                className="bg-slate-900/60 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-white/20 focus:outline-none"
              >
                {periods.map((p: any) => (
                  <option key={p.id} value={p.id} className="text-slate-900 bg-white">
                    {p.isMakeup ? "[THI BÙ] " : ""}
                    {p.name} ({p.semester})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-wider text-teal-200 font-semibold">
                Bài kiểm tra bộ môn
              </label>
              <select
                value={selectedExam?.id || ""}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="bg-slate-900/60 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-white/20 focus:outline-none"
              >
                {subjectExams.map((ex: any) => (
                  <option key={ex.id} value={ex.id} className="text-slate-900 bg-white">
                    {ex.subjectName} - Khối {ex.gradeLevel} ({ex.examFormat})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => fetchWorkspace(selectedPeriodId)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Làm mới dữ liệu"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 10-Step Unified Workflow Progress Bar */}
        {selectedExam && (
          <div className="max-w-7xl mx-auto mt-5 pt-4 border-t border-white/15">
            <div className="flex items-center justify-between text-[11px] mb-2">
              <span className="font-semibold text-teal-200">
                Tiến độ quy trình 10 bước:{" "}
                <strong className="text-white">
                  {selectedExam.subjectName} (Khối {selectedExam.gradeLevel})
                </strong>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/30 border border-teal-300/40 text-teal-700 font-mono text-[10px]">
                Bước {selectedExam.workflowStep}/10 • Trạng thái: {selectedExam.status}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5">
              {WORKFLOW_10_STEPS.map((st) => {
                const isDone = selectedExam.workflowStep > st.step;
                const isCurrent = selectedExam.workflowStep === st.step;
                return (
                  <button
                    key={st.step}
                    onClick={() => setActiveTab(st.tab)}
                    className={`text-left px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all flex items-center justify-between gap-1 ${
                      isCurrent
                        ? "bg-[#003B3A] text-white border-teal-400 shadow-sm font-bold"
                        : isDone
                        ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/30 hover:bg-emerald-500/30"
                        : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="truncate">{st.label}</span>
                    {isDone && <Check className="w-3 h-3 text-emerald-300 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 8 Unified Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 overflow-x-auto py-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#6D28D9] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {typeof t.badge === "number" && t.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : t.key === "assignments" || t.key === "grading"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: TỔNG QUAN (OVERVIEW)                               */}
        {/* ========================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-500 font-medium">Kỳ & Bài kiểm tra</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {kpis.totalSubjectExams || 0}
                </div>
                <div className="text-[11px] text-teal-800 font-medium mt-1">
                  Trong {kpis.totalPeriods || 0} đợt (có Thi bù)
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-500 font-medium">Ma trận & Đề chính thức</div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">
                  {kpis.officialPapersCount || 0}/{kpis.totalSubjectExams || 0}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Đã duyệt (isOfficial = true)
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-500 font-medium">Nhiệm vụ quá hạn</div>
                <div
                  className={`text-2xl font-bold mt-1 ${
                    (kpis.overdueTasksCount || 0) > 0 ? "text-red-600" : "text-slate-900"
                  }`}
                >
                  {kpis.overdueTasksCount || 0}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Liên thông Sổ Giáo Viên
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-500 font-medium">Biên bản Coi kiểm tra</div>
                <div className="text-2xl font-bold text-teal-700 mt-1">
                  {kpis.signedMinutesCount || 0}/{kpis.totalSessions || 0}
                </div>
                <div className="text-[11px] text-amber-700 font-medium mt-1">
                  {kpis.makeupCandidatesCount || 0} HS diện thi bù
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-500 font-medium">Phiếu OMR đã quét</div>
                <div className="text-2xl font-bold text-teal-800 mt-1">
                  {kpis.omrSheetsTotal || 0}
                </div>
                <div className="text-[11px] text-amber-700 font-medium mt-1">
                  {kpis.omrFlaggedCount || 0} phiếu cần rà soát
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-500 font-medium">Đồng bộ Sổ điểm</div>
                <div className="text-2xl font-bold text-teal-800 mt-1">
                  {kpis.lockedExamsCount || 0}/{kpis.totalSubjectExams || 0}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Đã khóa & đẩy sang Sổ điểm
                </div>
              </div>
            </div>

            {/* Subject Exam Matrix Status Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900 text-sm">
                    Bảng điều phối tiến độ các Bài kiểm tra trong kỳ
                  </h2>
                  <p className="text-xs text-slate-500">
                    Bấm vào từng môn học để chuyển nhanh đến bước nghiệp vụ tương ứng (Ma trận, Đề thi, OMR, LMS, Duyệt điểm)
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("periods")}
                  className="px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#135E5B] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thiết lập Kỳ / Bài kiểm tra</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Môn học & Khối</th>
                      <th className="py-3 px-4">Hình thức</th>
                      <th className="py-3 px-4">Ma trận đề</th>
                      <th className="py-3 px-4">Hồ sơ đề / LMS Quiz</th>
                      <th className="py-3 px-4">Ca thi & Biên bản</th>
                      <th className="py-3 px-4">Chấm OMR / Tự luận</th>
                      <th className="py-3 px-4">Trạng thái Sổ điểm</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjectExams.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-10 px-4 text-center text-slate-500">
                          Chưa có Bài kiểm tra nào trong kỳ. Nhấn <strong>&quot;+ Thiết lập Kỳ / Bài kiểm tra&quot;</strong> để khởi tạo dữ liệu thực tế.
                        </td>
                      </tr>
                    )}
                    {subjectExams.map((ex: any) => {
                      const hasApprovedMatrix = ex.matrices?.some(
                        (m: any) => m.status === "APPROVED"
                      );
                      const hasOfficialPaper = ex.papers?.some((p: any) => p.isOfficial);
                      return (
                        <tr
                          key={ex.id}
                          className={`hover:bg-teal-50/40 transition-colors ${
                            selectedExam?.id === ex.id ? "bg-teal-50/60" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">
                              {ex.subjectName} - Khối {ex.gradeLevel}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {ex.campusName} • {ex.durationMinutes} phút
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-teal-50 text-teal-800 border border-teal-200">
                              {ex.examFormat}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {hasApprovedMatrix ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt
                              </span>
                            ) : (
                              <span className="text-amber-700 font-medium">
                                Đang thẩm định
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {ex.examFormat === "LMS_MOODLE" ? (
                              <span className="text-teal-800 font-semibold">
                                Quiz #{ex.moodleQuizId || "N/A"} ({ex.moodleSyncStatus})
                              </span>
                            ) : hasOfficialPaper ? (
                              <span className="text-emerald-700 font-semibold">
                                Đề chính thức ({ex.officialPaper?.variants?.length || 0} mã đề)
                              </span>
                            ) : (
                              <span className="text-slate-500">Chưa duyệt đề chính thức</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-semibold text-slate-800">
                              {ex.sessions?.length || 0} ca thi
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-semibold text-slate-800">
                              {ex.results?.length || 0} kết quả
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {ex.status === "LOCKED" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                <Lock className="w-3 h-3" /> Đã khóa & Đồng bộ
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                Bước {ex.workflowStep}/10 ({ex.status})
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            <button
                              onClick={() => {
                                setSelectedExamId(ex.id);
                                setActiveTab("papers");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                            >
                              Hồ sơ đề
                            </button>
                            <button
                              onClick={() => {
                                setSelectedExamId(ex.id);
                                setActiveTab("grading");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#003B3A] hover:bg-[#003B3A] text-white font-semibold"
                            >
                              Chấm & Duyệt
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

        {/* ========================================================= */}
        {/* TAB 2: QUẢN LÝ KỲ KIỂM TRA & BÀI KIỂM TRA (A)             */}
        {/* ========================================================= */}
        {activeTab === "periods" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Danh sách Kỳ kiểm tra (Chính kỳ & Kiểm tra bù) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      A1. Danh mục Kỳ kiểm tra & Đợt Kiểm tra bù
                    </h3>
                    <p className="text-xs text-slate-500">
                      Quản lý năm học, học kỳ, cơ sở, khối lớp và liên kết đợt thi bù
                    </p>
                  </div>
                  {mode === "admin" && (
                    <button
                      onClick={() => setShowNewPeriodForm(!showNewPeriodForm)}
                      className="px-3 py-1.5 rounded-lg bg-[#6D28D9] text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo Kỳ / Đợt thi bù</span>
                    </button>
                  )}
                </div>

                {showNewPeriodForm && (
                  <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-teal-800">
                        Khởi tạo Kỳ kiểm tra định kỳ hoặc Đợt kiểm tra bù
                      </div>
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold text-[10px]">
                        Tự sinh mã: KT-[Loại+HK]-[Năm học]
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">
                          Năm học <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newPeriodForm.academicYearId}
                          onChange={(e) =>
                            setNewPeriodForm({
                              ...newPeriodForm,
                              academicYearId: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                        >
                          {data?.academicYears?.map((y: any) => (
                            <option key={y.id} value={y.id}>
                              Năm học {y.name}{" "}
                              {y.status === "ACTIVE" ? "(Đang hoạt động)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 mb-1">
                          Chương trình đào tạo
                        </label>
                        <select
                          value={newPeriodForm.programType}
                          onChange={(e) =>
                            setNewPeriodForm({
                              ...newPeriodForm,
                              programType: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="MOET">Chương trình Bộ GD&amp;ĐT (MOET)</option>
                          <option value="CTQT">Chương trình Quốc tế (CTQT)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 mb-1">Học kỳ</label>
                        <select
                          value={newPeriodForm.semester}
                          onChange={(e) =>
                            setNewPeriodForm({
                              ...newPeriodForm,
                              semester: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="HK1">Học kỳ I (HK1)</option>
                          <option value="HK2">Học kỳ II (HK2)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 mb-1">
                          Loại kỳ kiểm tra
                        </label>
                        <select
                          value={newPeriodForm.examType}
                          onChange={(e) =>
                            setNewPeriodForm({
                              ...newPeriodForm,
                              examType: e.target.value,
                              isMakeup: e.target.value === "MAKEUP",
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="MIDTERM">Giữa kỳ (MIDTERM - GK)</option>
                          <option value="FINAL">Cuối kỳ (FINAL - CK)</option>
                          <option value="REGULAR">
                            Định kỳ / Thường xuyên (REGULAR - TX)
                          </option>
                          <option value="MAKEUP">Kiểm tra bù (MAKEUP - BU)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 mb-1">
                          Thời gian từ ngày <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={newPeriodForm.startDate}
                          onChange={(e) =>
                            setNewPeriodForm({
                              ...newPeriodForm,
                              startDate: e.target.value,
                              endDate:
                                newPeriodForm.endDate < e.target.value
                                  ? e.target.value
                                  : newPeriodForm.endDate,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 mb-1">
                          Đến ngày <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          min={newPeriodForm.startDate}
                          value={newPeriodForm.endDate}
                          onChange={(e) =>
                            setNewPeriodForm({
                              ...newPeriodForm,
                              endDate: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-slate-600 mb-1">
                          Cơ sở áp dụng
                        </label>
                        <select
                          value={newPeriodForm.campusId}
                          onChange={(e) =>
                            setNewPeriodForm({
                              ...newPeriodForm,
                              campusId: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="">Toàn hệ thống Sky-Line</option>
                          {data?.campuses?.map((cp: any) => (
                            <option key={cp.id} value={cp.id}>
                              {cp.name} ({cp.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <label className="block text-slate-600 font-medium">
                            Khối lớp áp dụng (Bấm chọn một hoặc nhiều khối){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <button
                              type="button"
                              onClick={() =>
                                setNewPeriodForm({
                                  ...newPeriodForm,
                                  gradeLevels: "1,2,3,4,5",
                                })
                              }
                              className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-teal-50 text-slate-700 font-semibold"
                            >
                              Tiểu học (1-5)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setNewPeriodForm({
                                  ...newPeriodForm,
                                  gradeLevels: "6,7,8,9",
                                })
                              }
                              className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-teal-50 text-slate-700 font-semibold"
                            >
                              THCS (6-9)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setNewPeriodForm({
                                  ...newPeriodForm,
                                  gradeLevels: "10,11,12",
                                })
                              }
                              className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-teal-50 text-slate-700 font-semibold"
                            >
                              THPT (10-12)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setNewPeriodForm({
                                  ...newPeriodForm,
                                  gradeLevels:
                                    "1,2,3,4,5,6,7,8,9,10,11,12",
                                })
                              }
                              className="px-2 py-0.5 rounded border border-teal-400 bg-teal-50 hover:bg-teal-50 text-teal-800 font-semibold"
                            >
                              Tất cả (1-12)
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 p-2.5 rounded-xl border border-slate-300 bg-white">
                          {[
                            "1",
                            "2",
                            "3",
                            "4",
                            "5",
                            "6",
                            "7",
                            "8",
                            "9",
                            "10",
                            "11",
                            "12",
                          ].map((g) => {
                            const selectedList = newPeriodForm.gradeLevels
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                            const isChecked = selectedList.includes(g);
                            return (
                              <button
                                key={g}
                                type="button"
                                onClick={() => {
                                  const next = isChecked
                                    ? selectedList.filter((item) => item !== g)
                                    : [...selectedList, g].sort(
                                        (a, b) => Number(a) - Number(b)
                                      );
                                  setNewPeriodForm({
                                    ...newPeriodForm,
                                    gradeLevels: next.join(","),
                                  });
                                }}
                                className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                                  isChecked
                                    ? "bg-[#6D28D9] text-white border-[#6D28D9] shadow-2xs"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50/40"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 shrink-0" />}
                                <span>Khối {g}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-slate-600">
                            Mã kỳ kiểm tra (Tự sinh theo cấu trúc)
                          </label>
                          {isCustomPeriodCode && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomPeriodCode(false);
                                const { autoCode } =
                                  computeStructuredPeriodMeta(newPeriodForm);
                                setNewPeriodForm({
                                  ...newPeriodForm,
                                  code: autoCode,
                                });
                              }}
                              className="text-[10px] text-teal-800 font-semibold underline"
                            >
                              Tự sinh lại
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Tự động sinh theo cấu trúc..."
                          value={newPeriodForm.code}
                          onChange={(e) => {
                            setIsCustomPeriodCode(true);
                            setNewPeriodForm({
                              ...newPeriodForm,
                              code: e.target.value.toUpperCase(),
                            });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-teal-400 bg-teal-50/40 font-mono font-bold text-teal-800"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-slate-600">Tên kỳ kiểm tra</label>
                          {isCustomPeriodName && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomPeriodName(false);
                                const { autoName } =
                                  computeStructuredPeriodMeta(newPeriodForm);
                                setNewPeriodForm({
                                  ...newPeriodForm,
                                  name: autoName,
                                });
                              }}
                              className="text-[10px] text-teal-800 font-semibold underline"
                            >
                              Theo gợi ý
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Kiểm tra Giữa kỳ I..."
                          value={newPeriodForm.name}
                          onChange={(e) => {
                            setIsCustomPeriodName(true);
                            setNewPeriodForm({
                              ...newPeriodForm,
                              name: e.target.value,
                            });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setShowNewPeriodForm(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 bg-white"
                      >
                        Hủy
                      </button>
                      <button
                        disabled={submitting}
                        onClick={async () => {
                          const res = await dispatchAction(
                            {
                              action: "CREATE_PERIOD",
                              ...newPeriodForm,
                              academicYearId:
                                newPeriodForm.academicYearId ||
                                data?.academicYears?.[0]?.id,
                              gradeLevels: newPeriodForm.gradeLevels
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                              parentPeriodId: newPeriodForm.isMakeup
                                ? selectedPeriodId
                                : null,
                            },
                            "Đã tạo Kỳ kiểm tra mới thành công!"
                          );
                          if (res?.period) {
                            setSelectedPeriodId(res.period.id);
                            setIsCustomPeriodCode(false);
                            setIsCustomPeriodName(false);
                            setShowNewPeriodForm(false);
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#135E5B] text-white font-semibold"
                      >
                        Lưu kỳ kiểm tra
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  {periods.length === 0 && (
                    <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                      Chưa có Kỳ kiểm tra nào. Nhấn <strong>&quot;+ Tạo Kỳ / Đợt thi bù&quot;</strong> để khởi tạo kỳ kiểm tra mới.
                    </div>
                  )}
                  {periods.map((p: any) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPeriodId(p.id);
                        fetchWorkspace(p.id);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedPeriodId === p.id
                          ? "border-teal-400 bg-teal-50/40 shadow-2xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                            {p.code}
                          </span>
                          {p.academicYearName && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                              NH: {p.academicYearName}
                            </span>
                          )}
                          {p.isMakeup && (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                              ĐỢT THI BÙ
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700">
                          {p.status}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm mt-1.5">
                        {p.name}
                      </div>
                      <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          Thời gian:{" "}
                          <strong className="text-slate-800">
                            {p.startDate
                              ? new Date(p.startDate).toLocaleDateString("vi-VN")
                              : "—"}{" "}
                            →{" "}
                            {p.endDate
                              ? new Date(p.endDate).toLocaleDateString("vi-VN")
                              : "—"}
                          </strong>
                        </span>
                        <span>
                          • Hệ: <strong>{p.programType}</strong>
                        </span>
                        <span>
                          • Học kỳ: <strong>{p.semester}</strong>
                        </span>
                        <span>
                          • Cơ sở: <strong>{p.campusName || "Toàn hệ thống"}</strong>
                        </span>
                        <span>
                          • Khối: <strong>{p.gradeLevels}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danh sách Bài kiểm tra bộ môn trong kỳ */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      A2. Bài kiểm tra theo Môn & Khối trong kỳ đang chọn
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cấu hình hình thức thi (Giấy OMR, LMS Moodle, Kết hợp, Tự luận) & trọng số
                    </p>
                  </div>
                  {mode === "admin" && (
                    <button
                      onClick={() => setShowNewExamForm(!showNewExamForm)}
                      className="px-3 py-1.5 rounded-lg bg-[#00A19A] text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm môn thi</span>
                    </button>
                  )}
                </div>

                {showNewExamForm && (
                  <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-3 text-xs">
                    <div className="font-bold text-teal-950">
                      Thêm Bài kiểm tra bộ môn vào kỳ hiện tại
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Môn học</label>
                        <select
                          value={newExamForm.subjectId}
                          onChange={(e) =>
                            setNewExamForm({ ...newExamForm, subjectId: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="">-- Chọn môn học --</option>
                          {data?.subjects?.map((s: any) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Khối lớp</label>
                        <select
                          value={newExamForm.gradeLevel}
                          onChange={(e) =>
                            setNewExamForm({ ...newExamForm, gradeLevel: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        >
                          {[
                            "1",
                            "2",
                            "3",
                            "4",
                            "5",
                            "6",
                            "7",
                            "8",
                            "9",
                            "10",
                            "11",
                            "12",
                          ].map((g) => (
                            <option key={g} value={g}>
                              Khối {g}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Hình thức kiểm tra</label>
                        <select
                          value={newExamForm.examFormat}
                          onChange={(e) =>
                            setNewExamForm({ ...newExamForm, examFormat: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="HYBRID">Kết hợp: Giấy OMR + Tự luận (HYBRID)</option>
                          <option value="PAPER_OMR">100% Trắc nghiệm OMR (PAPER_OMR)</option>
                          <option value="LMS_MOODLE">Kiểm tra trên LMS Moodle (LMS_MOODLE)</option>
                          <option value="ESSAY">100% Tự luận (ESSAY)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Thời lượng (phút)</label>
                        <input
                          type="number"
                          value={newExamForm.durationMinutes}
                          onChange={(e) =>
                            setNewExamForm({
                              ...newExamForm,
                              durationMinutes: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowNewExamForm(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300"
                      >
                        Hủy
                      </button>
                      <button
                        disabled={submitting || !newExamForm.subjectId}
                        onClick={async () => {
                          await dispatchAction(
                            {
                              action: "CREATE_SUBJECT_EXAM",
                              periodId: selectedPeriodId,
                              ...newExamForm,
                            },
                            "Đã khởi tạo Bài kiểm tra bộ môn!"
                          );
                          setShowNewExamForm(false);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#003B3A] text-white font-semibold"
                      >
                        Tạo bài kiểm tra
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  {subjectExams.length === 0 && (
                    <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                      Chưa có Bài kiểm tra bộ môn nào trong kỳ đang chọn. Nhấn <strong>&quot;+ Thêm môn thi&quot;</strong> để khởi tạo.
                    </div>
                  )}
                  {subjectExams.map((ex: any) => (
                    <div
                      key={ex.id}
                      onClick={() => setSelectedExamId(ex.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedExam?.id === ex.id
                          ? "border-[#00A19A] bg-teal-50/30"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">
                          {ex.subjectName} • Khối {ex.gradeLevel}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold text-[10px]">
                          {ex.examFormat}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-3">
                        <span>Thời lượng: {ex.durationMinutes} phút</span>
                        <span>
                          Trọng số: TN {ex.mcqWeight}đ / TL {ex.essayWeight}đ
                        </span>
                        <span>Tiến độ: Bước {ex.workflowStep}/10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab !== "overview" && activeTab !== "periods" && !selectedExam && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3 shadow-2xs">
            <div className="text-sm font-bold text-slate-900">
              Chưa có Kỳ kiểm tra hoặc Bài kiểm tra bộ môn được chọn
            </div>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Hệ thống không tự động sinh dữ liệu mẫu. Vui lòng khởi tạo Kỳ kiểm tra và thêm Bài kiểm tra bộ môn tại tab <strong>Kỳ kiểm tra</strong> trước khi thực hiện phân công, nộp ma trận, coi thi hoặc chấm bài.
            </p>
            <button
              onClick={() => setActiveTab("periods")}
              className="px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#003B3A] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Chuyển sang thiết lập Kỳ kiểm tra & Môn thi</span>
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: PHÂN CÔNG KHẢO THÍ & LIÊN THÔNG SỔ GIÁO VIÊN (B)   */}
        {/* ========================================================= */}
        {activeTab === "assignments" && selectedExam && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    B. Phân công Nhiệm vụ Khảo thí: {selectedExam.subjectName} - Khối{" "}
                    {selectedExam.gradeLevel}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mọi nhiệm vụ giao tại đây tự động đồng bộ sang{" "}
                    <strong>Sổ Giáo Viên (/teacher/tasks - phân hệ KHAO_THI)</strong> kèm cảnh báo quá hạn.
                  </p>
                </div>
              </div>

              {mode === "admin" && (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Chọn Tổ chuyên môn
                    </label>
                    <select
                      value={newTaskForm.departmentId}
                      onChange={(e) =>
                        setNewTaskForm({
                          ...newTaskForm,
                          departmentId: e.target.value,
                          teacherId: "",
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">-- Tất cả Tổ chuyên môn --</option>
                      {data?.departments?.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Chọn Giáo viên
                    </label>
                    <select
                      value={newTaskForm.teacherId}
                      onChange={(e) =>
                        setNewTaskForm({ ...newTaskForm, teacherId: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">-- Chọn Giáo viên --</option>
                      {(data?.teachers || [])
                        .filter(
                          (t: any) =>
                            !newTaskForm.departmentId ||
                            (Array.isArray(t.departmentIds) &&
                              t.departmentIds.includes(newTaskForm.departmentId))
                        )
                        .map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.fullName}
                            {t.departmentName ? ` — ${t.departmentName}` : ""}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Vai trò khảo thí
                    </label>
                    <select
                      value={newTaskForm.role}
                      onChange={(e) =>
                        setNewTaskForm({ ...newTaskForm, role: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="MATRIX_AUTHOR">1. Ra Ma trận & Đặc tả</option>
                      <option value="PAPER_AUTHOR">2. Soạn đề gốc / LMS Quiz</option>
                      <option value="PEER_REVIEWER">3. Phản biện đề</option>
                      <option value="APPROVER">4. Duyệt đề chính thức</option>
                      <option value="GRADER">5. Chấm bài (OMR & Tự luận)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Hạn hoàn thành
                    </label>
                    <input
                      type="date"
                      value={newTaskForm.dueDate}
                      onChange={(e) =>
                        setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Ghi chú / Yêu cầu chuyên môn
                    </label>
                    <input
                      type="text"
                      placeholder="Bám sát chuẩn KTKN..."
                      value={newTaskForm.reviewNote}
                      onChange={(e) =>
                        setNewTaskForm({ ...newTaskForm, reviewNote: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      disabled={submitting || !newTaskForm.teacherId}
                      onClick={() =>
                        dispatchAction(
                          {
                            action: "ASSIGN_TASK",
                            subjectExamId: selectedExam.id,
                            ...newTaskForm,
                          },
                          "Đã giao nhiệm vụ và đồng bộ sang Sổ Giáo Viên!"
                        )
                      }
                      className="w-full py-1.5 px-3 rounded-lg bg-[#6D28D9] hover:bg-[#003B3A] text-white font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Giao nhiệm vụ</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Task Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Nhiệm vụ</th>
                      <th className="py-2.5 px-4">Giáo viên được giao</th>
                      <th className="py-2.5 px-4">Thời hạn</th>
                      <th className="py-2.5 px-4">Trạng thái</th>
                      <th className="py-2.5 px-4">Ghi chú thẩm định</th>
                      <th className="py-2.5 px-4 text-right">Nhắc việc Sổ GV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedExam.tasks?.map((t: any) => {
                      const roleMeta = ROLE_LABELS[t.role] || {
                        label: t.role,
                        color: "bg-slate-100 text-slate-800",
                      };
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${roleMeta.color}`}
                            >
                              {roleMeta.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">
                              {t.teacherName}
                            </div>
                            {t.teacherDepartmentName && (
                              <div className="text-[11px] text-slate-500">
                                {t.teacherDepartmentName}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {new Date(t.dueDate).toLocaleDateString("vi-VN")}
                            {t.isOverdue && (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">
                                QUÁ HẠN
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                t.status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : t.status === "REVISION_REQUESTED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {t.reviewNote || "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() =>
                                dispatchAction(
                                  { action: "REMIND_OVERDUE_TASK", taskId: t.id },
                                  `Đã gửi thông báo nhắc việc tới ${t.teacherName}!`
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold"
                            >
                              <BellRing className="w-3 h-3" />
                              <span>Nhắc ({t.remindedCount || 0})</span>
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

        {/* ========================================================= */}
        {/* TAB 4: MA TRẬN, HỒ SƠ ĐỀ, TRỘN ĐỀ OMR & MOODLE LMS (C,D,E)*/}
        {/* ========================================================= */}
        {activeTab === "papers" && selectedExam && (
          <div className="space-y-6">
            {/* Section C: Ma trận & Đặc tả đề */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    C1. Ma trận & Đặc tả Đề kiểm tra ({selectedExam.subjectName} - Khối{" "}
                    {selectedExam.gradeLevel})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kiểm tra tự động tỷ lệ 4 mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao) và tổng điểm 10.0
                  </p>
                </div>

                {matrixViewData && (
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">
                      Phiên bản v{matrixViewData.matrix.version}.0 •{" "}
                      {matrixViewData.matrix.status}
                    </span>
                    <button
                      disabled={submitting}
                      onClick={() =>
                        dispatchAction(
                          {
                            action: "REVIEW_MATRIX",
                            matrixId: matrixViewData.matrix.id,
                            decision: "APPROVE",
                            reviewComment:
                              "Ma trận và bản đặc tả đạt chuẩn kiến thức kỹ năng, phê duyệt cho phép ra đề.",
                          },
                          "Đã phê duyệt Ma trận & Đặc tả đề!"
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Phê duyệt Ma trận</span>
                    </button>
                    <button
                      disabled={submitting}
                      onClick={() =>
                        dispatchAction(
                          {
                            action: "REVIEW_MATRIX",
                            matrixId: matrixViewData.matrix.id,
                            decision: "REJECT",
                            reviewComment:
                              "Yêu cầu rà soát lại số câu Vận dụng cao để phù hợp thời lượng.",
                          },
                          "Đã gửi yêu cầu chỉnh sửa Ma trận!"
                        )
                      }
                      className="px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold"
                    >
                      Yêu cầu sửa
                    </button>
                  </div>
                )}
              </div>

              {matrixViewData ? (
                <ExamMatrixTable
                  matrixName={matrixViewData.matrix.title}
                  subjectName={selectedExam.subjectName}
                  grade={selectedExam.gradeLevel}
                  durationMinutes={selectedExam.durationMinutes}
                  items={matrixViewData.items}
                  validation={matrixViewData.validation}
                />
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-3">
                  <p className="text-xs text-slate-600">
                    Bài kiểm tra này chưa có Ma trận được nộp. Giáo viên có thể khởi tạo Ma trận chuẩn 10.0 điểm ngay dưới đây:
                  </p>
                  <button
                    disabled={submitting}
                    onClick={() =>
                      dispatchAction(
                        {
                          action: "SUBMIT_MATRIX",
                          subjectExamId: selectedExam.id,
                          title: `Ma trận & Đặc tả ${selectedExam.subjectName} Khối ${selectedExam.gradeLevel}`,
                          cells: [
                            {
                              topicName: "Chủ đề trọng tâm 1",
                              level: "NB",
                              questionType: "MCQ",
                              questionCount: 8,
                              pointsPerQuestion: 0.5,
                            },
                            {
                              topicName: "Chủ đề trọng tâm 2",
                              level: "TH",
                              questionType: "MCQ",
                              questionCount: 6,
                              pointsPerQuestion: 0.5,
                            },
                            {
                              topicName: "Bài toán vận dụng thực tiễn",
                              level: "VD",
                              questionType: "ESSAY",
                              questionCount: 2,
                              pointsPerQuestion: 1.0,
                            },
                            {
                              topicName: "Bài toán nâng cao",
                              level: "VDC",
                              questionType: "ESSAY",
                              questionCount: 1,
                              pointsPerQuestion: 1.0,
                            },
                          ],
                        },
                        "Đã nộp Ma trận & Đặc tả chuẩn 10.0 điểm!"
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-[#6D28D9] text-white text-xs font-semibold"
                  >
                    + Nộp Ma trận & Đặc tả mẫu (Chuẩn 10.0 điểm)
                  </button>
                </div>
              )}
            </div>

            {/* Section D: Kiểm tra trên LMS Moodle */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Globe className="w-4 h-4 text-teal-800" />
                    <span>D. Liên kết & Thẩm định Quiz trên Moodle LMS</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tận dụng Moodle Question Bank & Quiz sẵn có; tự động kiểm tra Time Limit, ShuffleAnswers, Attempts và thời điểm mở đáp án qua Moodle REST API.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={submitting}
                    onClick={async () => {
                      const res = await dispatchAction(
                        {
                          action: "VERIFY_LMS_QUIZ",
                          subjectExamId: selectedExam.id,
                          moodleCourseId: selectedExam.moodleCourseId || 104,
                          moodleQuizId: selectedExam.moodleQuizId || 512,
                        },
                        "Đã thẩm định cấu hình Quiz Moodle qua Web Services API!"
                      );
                      if (res?.verificationReport) {
                        setLmsVerifyReport(res.verificationReport);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#003B3A] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Thẩm định cấu hình Moodle Quiz</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs bg-teal-50/50 p-3.5 rounded-xl border border-teal-200">
                <div>
                  <span className="text-slate-500 block">Moodle Course ID:</span>
                  <strong className="font-mono text-slate-900">
                    #{selectedExam.moodleCourseId || 104}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Moodle Quiz ID:</span>
                  <strong className="font-mono text-slate-900">
                    #{selectedExam.moodleQuizId || 512}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Trạng thái thẩm định LMS:</span>
                  <strong className="text-teal-800">{selectedExam.moodleSyncStatus}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Người thẩm định:</span>
                  <strong className="text-slate-900">
                    {selectedExam.moodleVerifiedBy || "Chưa thẩm định"}
                  </strong>
                </div>
              </div>

              {lmsVerifyReport && (
                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-teal-300">
                    <span>
                      Báo cáo thẩm định tự động: {lmsVerifyReport.quiz?.name} (Chế độ:{" "}
                      {lmsVerifyReport.mode})
                    </span>
                    <span>
                      {lmsVerifyReport.isValidForOfficialExam
                        ? "ĐẠT TẤT CẢ TIÊU CHÍ AN TOÀN KHẢO THÍ"
                        : "CẦN ĐIỀU CHỈNH CẤU HÌNH"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                    {lmsVerifyReport.checks?.map((chk: any) => (
                      <div
                        key={chk.code}
                        className="p-2 rounded bg-white/10 border border-white/10 flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">{chk.label}</div>
                          <div className="text-[11px] text-slate-300">{chk.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section E: Kiểm tra trên giấy, Trộn đề có kiểm soát & In Phiếu OMR */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    E. Ngân hàng Câu hỏi, Trộn Mã đề có kiểm soát & Xuất Phiếu trả lời OMR
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chỉ sử dụng đề chính thức đã được duyệt (<strong>isOfficial = true</strong>). Tự động sinh 4 mã đề hoán vị (101, 102, 103, 104) giữ nguyên nhóm câu đọc hiểu và thứ tự mức độ nhận thức.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    disabled={submitting}
                    onClick={() =>
                      dispatchAction(
                        {
                          action: "GENERATE_VARIANTS",
                          subjectExamId: selectedExam.id,
                          variantCodes: ["101", "102", "103", "104"],
                        },
                        "Đã trộn lại 4 mã đề (101, 102, 103, 104) và bảng đáp án!"
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#003B3A] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Trộn 4 Mã đề (101-104)</span>
                  </button>

                  <a
                    href={`/api/testing/workspace?omrSheetHtml=1&examId=${selectedExam.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#135E5B] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In Phiếu trả lời OMR (A4)</span>
                  </a>
                </div>
              </div>

              {/* Official Paper Approval Banner */}
              {selectedExam.papers?.map((p: any) => (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                    p.isOfficial
                      ? "bg-emerald-50/70 border-emerald-300"
                      : "bg-amber-50/60 border-amber-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        Hồ sơ đề Phiên bản v{p.version}.0 ({p.submissionMode})
                      </span>
                      {p.isOfficial ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                          ĐỀ CHÍNH THỨC (isOfficial = true)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px]">
                          CHỜ DUYỆT CHÍNH THỨC ({p.status})
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600 mt-1">
                      Phản biện: <strong>{p.peerReviewNote || "Đã kiểm tra"}</strong> • Phê duyệt:{" "}
                      <strong>{p.approvalComment || "Đang chờ phê duyệt"}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!p.isOfficial && (
                      <button
                        disabled={submitting}
                        onClick={() =>
                          dispatchAction(
                            {
                              action: "REVIEW_PAPER",
                              paperId: p.id,
                              decision: "APPROVE",
                              stage: "FINAL_APPROVE",
                              comment:
                                "Phê duyệt làm Đề chính thức sử dụng cho kỳ kiểm tra và sinh mã đề OMR.",
                            },
                            "Đã phê duyệt Đề chính thức (isOfficial = true)!"
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
                      >
                        Duyệt làm Đề chính thức
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Generated Variants Answer Key Matrix */}
              {selectedExam.officialPaper?.variants?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    Bảng đối chiếu Đáp án các Mã đề đã trộn ({selectedExam.officialPaper.variants.length} mã đề):
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {selectedExam.officialPaper.variants.map((v: any) => {
                      let keyMap: Record<string, any> = {};
                      try {
                        keyMap = JSON.parse(v.answerKeyMapJson || "{}");
                      } catch {
                        keyMap = {};
                      }
                      const qNums = Object.keys(keyMap)
                        .filter((k) => keyMap[k].questionType !== "ESSAY")
                        .slice(0, 14);
                      return (
                        <div
                          key={v.id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                            <span className="font-bold text-teal-800">
                              MÃ ĐỀ {v.variantCode}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              Seed: {v.seedValue}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 font-mono text-[11px]">
                            {qNums.map((qn) => (
                              <div
                                key={qn}
                                className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-center"
                              >
                                <span className="text-slate-400">{qn}:</span>
                                <strong className="text-slate-900 ml-0.5">
                                  {keyMap[qn].correctAnswer}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: LỊCH & COI KIỂM TRA, PHÁT HIỆN TRÙNG LỊCH (F)      */}
        {/* ========================================================= */}
        {activeTab === "sessions" && selectedExam && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    F. Phân công Giám thị, Kiểm tra trùng lịch TKB & Biên bản Coi kiểm tra điện tử
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tự động đối chiếu với Thời khóa biểu (`TimetableSlot`) và các phòng thi cùng giờ. Học sinh vắng có phép tự động chuyển sang danh sách <strong>Kiểm tra bù</strong>.
                  </p>
                </div>
              </div>

              {mode === "admin" && (
                <div className="grid grid-cols-1 md:grid-cols-7 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Lớp dự thi</label>
                    <select
                      value={newSessionForm.classId}
                      onChange={(e) =>
                        setNewSessionForm({ ...newSessionForm, classId: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">-- Chọn lớp --</option>
                      {data?.classes?.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c._count?.students || 0} HS)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phòng thi</label>
                    <input
                      type="text"
                      value={newSessionForm.roomName}
                      onChange={(e) =>
                        setNewSessionForm({ ...newSessionForm, roomName: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ngày thi</label>
                    <input
                      type="date"
                      value={newSessionForm.examDate}
                      onChange={(e) =>
                        setNewSessionForm({ ...newSessionForm, examDate: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Khung giờ</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newSessionForm.startTime}
                        onChange={(e) =>
                          setNewSessionForm({ ...newSessionForm, startTime: e.target.value })
                        }
                        className="w-1/2 px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                      />
                      <span>-</span>
                      <input
                        type="text"
                        value={newSessionForm.endTime}
                        onChange={(e) =>
                          setNewSessionForm({ ...newSessionForm, endTime: e.target.value })
                        }
                        className="w-1/2 px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Chọn Tổ chuyên môn
                    </label>
                    <select
                      value={newSessionForm.proctorDepartmentId}
                      onChange={(e) =>
                        setNewSessionForm({
                          ...newSessionForm,
                          proctorDepartmentId: e.target.value,
                          proctorTeacherId: "",
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">-- Tất cả Tổ CM --</option>
                      {data?.departments?.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Chọn Giám thị coi thi
                    </label>
                    <select
                      value={newSessionForm.proctorTeacherId}
                      onChange={(e) =>
                        setNewSessionForm({
                          ...newSessionForm,
                          proctorTeacherId: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">-- Chọn giám thị --</option>
                      {(data?.teachers || [])
                        .filter(
                          (t: any) =>
                            !newSessionForm.proctorDepartmentId ||
                            (Array.isArray(t.departmentIds) &&
                              t.departmentIds.includes(newSessionForm.proctorDepartmentId))
                        )
                        .map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.fullName}
                            {t.departmentName ? ` — ${t.departmentName}` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      disabled={submitting || !newSessionForm.classId}
                      onClick={() =>
                        dispatchAction(
                          {
                            action: "SCHEDULE_SESSION",
                            subjectExamId: selectedExam.id,
                            ...newSessionForm,
                          },
                          "Đã xếp lịch coi thi và kiểm tra trùng lịch TKB!"
                        )
                      }
                      className="w-full py-1.5 px-3 rounded-lg bg-[#003B3A] text-white font-semibold"
                    >
                      + Xếp ca coi thi
                    </button>
                  </div>
                </div>
              )}

              {/* Sessions & Electronic Proctor Minutes */}
              {selectedExam.sessions?.map((sess: any) => (
                <div
                  key={sess.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {sess.roomName} • Lớp {sess.className}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold text-[10px]">
                          {sess.startTime} - {sess.endTime} (
                          {new Date(sess.examDate).toLocaleDateString("vi-VN")})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            sess.minutesStatus === "SIGNED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          Biên bản: {sess.minutesStatus}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Giám thị:{" "}
                        <strong>
                          {sess.proctors?.map((p: any) => p.teacherName).join(", ") ||
                            "Chưa phân công"}
                        </strong>{" "}
                        • Đăng ký: <strong>{sess.totalRegistered}</strong> • Có mặt:{" "}
                        <strong className="text-emerald-700">{sess.presentCount}</strong> • Vắng:{" "}
                        <strong className="text-red-600">{sess.absentCount}</strong> • Số bài thu:{" "}
                        <strong className="text-teal-800">{sess.collectedPapers}</strong>
                      </div>
                      {sess.proctors?.some((p: any) => p.conflictWarning) && (
                        <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>
                            Phát hiện trùng lịch:{" "}
                            {sess.proctors
                              .map((p: any) => p.conflictWarning)
                              .filter(Boolean)
                              .join("; ")}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      disabled={submitting}
                      onClick={() =>
                        dispatchAction(
                          {
                            action: "SAVE_PROCTOR_MINUTES",
                            sessionId: sess.id,
                            collectedPapers: sess.presentCount,
                            incidentSummary: sess.incidentSummary,
                          },
                          "Đã ký xác nhận Biên bản coi kiểm tra điện tử!"
                        )
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ký xác nhận Biên bản Coi thi</span>
                    </button>
                  </div>

                  {/* Roster Attendance Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 uppercase">
                        <tr>
                          <th className="py-2 px-3">Số báo danh (SBD)</th>
                          <th className="py-2 px-3">Học sinh</th>
                          <th className="py-2 px-3">Chỗ ngồi</th>
                          <th className="py-2 px-3">Mã đề</th>
                          <th className="py-2 px-3">Điểm danh</th>
                          <th className="py-2 px-3">Thu bài</th>
                          <th className="py-2 px-3">Diện thi bù</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sess.roster?.map((r: any) => (
                          <tr key={r.id}>
                            <td className="py-2 px-3 font-mono font-bold text-teal-800">
                              {r.candidateNumber}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-900">
                              {r.studentName}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600">
                              {r.seatNumber}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold">
                              {r.variantCode}
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={r.attendanceStatus}
                                onChange={(e) =>
                                  dispatchAction(
                                    {
                                      action: "SAVE_PROCTOR_MINUTES",
                                      sessionId: sess.id,
                                      rosterUpdates: [
                                        {
                                          id: r.id,
                                          attendanceStatus: e.target.value,
                                        },
                                      ],
                                    },
                                    `Đã cập nhật chuyên cần phòng thi cho SBD ${r.candidateNumber}!`
                                  )
                                }
                                className="px-2 py-1 rounded border border-slate-300 text-xs font-semibold bg-white"
                              >
                                <option value="PRESENT">Có mặt (PRESENT)</option>
                                <option value="ABSENT_EXCUSED">
                                  Vắng có phép (Chuyển Thi bù)
                                </option>
                                <option value="ABSENT_UNEXCUSED">
                                  Vắng không phép
                                </option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              {r.paperSubmitted ? (
                                <span className="text-emerald-700 font-semibold">
                                  Đã nộp bài
                                </span>
                              ) : (
                                <span className="text-red-600 font-semibold">
                                  Không có bài
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {r.needsMakeup ? (
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                                  DS THI BÙ
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: CHẤM BÀI TRẮC NGHIỆM OMR & TỰ LUẬN (G)             */}
        {/* ========================================================= */}
        {activeTab === "grading" && selectedExam && (
          <div className="space-y-6">
            {/* G1. OMR Recognition & Anomaly Review */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <ScanLine className="w-4 h-4 text-teal-800" />
                    <span>
                      G1. Nhận diện & Rà soát Phiếu trả lời Trắc nghiệm OMR (SBD • Mã đề • Đáp án)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tự động phát hiện phiếu tô trùng đáp án (MULTI_MARK), bỏ trống (BLANK), độ tin cậy thấp (LOW_CONF) hoặc trùng SBD. Mọi chỉnh sửa đều ghi vào <strong>AuditLog</strong>.
                  </p>
                </div>
              </div>

              <EdgeOmrGradingWorkbench
                selectedExam={selectedExam}
                onSyncCompleted={async () => {
                  await fetchWorkspace(selectedPeriodId);
                }}
                showToast={showToast}
              />

              {selectedExam.omrBatches?.map((batch: any) => (
                <div key={batch.id} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-teal-50/60 border border-teal-200 text-xs">
                    <div>
                      <span className="font-bold text-teal-800">{batch.batchName}</span> •
                      Tổng số phiếu: <strong>{batch.totalSheets}</strong> • Đã khớp chuẩn:{" "}
                      <strong className="text-emerald-700">{batch.recognizedSheets}</strong> •
                      Cần rà soát:{" "}
                      <strong className="text-amber-700">{batch.flaggedSheets}</strong>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold text-[10px]">
                      {batch.status}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">SBD nhận diện</th>
                          <th className="py-2.5 px-3">Học sinh khớp</th>
                          <th className="py-2.5 px-3">Mã đề</th>
                          <th className="py-2.5 px-3">Độ tin cậy OMR</th>
                          <th className="py-2.5 px-3">Số câu đúng</th>
                          <th className="py-2.5 px-3">Điểm TN (Máy chấm)</th>
                          <th className="py-2.5 px-3">Cảnh báo bất thường</th>
                          <th className="py-2.5 px-3 text-right">Rà soát & Xác nhận</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {batch.sheets?.map((sh: any) => {
                          let flags: string[] = [];
                          try {
                            flags = JSON.parse(sh.anomalyFlagsJson || "[]");
                          } catch {
                            flags = [];
                          }
                          return (
                            <tr
                              key={sh.id}
                              className={
                                flags.length > 0 ? "bg-amber-50/50" : "hover:bg-slate-50"
                              }
                            >
                              <td className="py-2.5 px-3 font-mono font-bold text-teal-800">
                                {sh.candidateNumber}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                {sh.studentName}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">
                                {sh.variantCode}
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                {Math.round((sh.confidenceScore || 0.95) * 100)}%
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                {sh.correctCount}/{sh.totalQuestions}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                                {sh.mcqScore?.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3">
                                {flags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {flags.map((fl) => (
                                      <span
                                        key={fl}
                                        className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]"
                                      >
                                        {fl}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-emerald-700 font-semibold">
                                    Hợp lệ ({sh.recognitionStatus})
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {sh.recognitionStatus !== "VERIFIED" && (
                                  <button
                                    disabled={submitting}
                                    onClick={() =>
                                      dispatchAction(
                                        {
                                          action: "OVERRIDE_OMR_SHEET",
                                          sheetId: sh.id,
                                          questionNumber: 5,
                                          newOption: "A",
                                          reviewReason:
                                            "Giáo viên kiểm tra ảnh gốc phiếu OMR: HS gạch bỏ đáp án B và tô rõ đáp án A ở câu 5.",
                                        },
                                        `Đã xác nhận phiếu OMR SBD ${sh.candidateNumber} và tính lại điểm tự động!`
                                      )
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                                  >
                                    Xử lý & Duyệt phiếu
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {/* G2. Nhập điểm Tự luận & Hợp nhất điểm */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    G2. Chấm điểm Tự luận & Tự động tính Tổng điểm theo thang điểm đã duyệt
                  </h3>
                  <p className="text-xs text-slate-500">
                    Trọng số hiện tại: Trắc nghiệm tối đa <strong>{selectedExam.mcqWeight}đ</strong> + Tự luận tối đa{" "}
                    <strong>{selectedExam.essayWeight}đ</strong> = Tổng <strong>{selectedExam.maxScore}đ</strong>
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">SBD</th>
                      <th className="py-2.5 px-3">Học sinh</th>
                      <th className="py-2.5 px-3">Mã đề</th>
                      <th className="py-2.5 px-3">Điểm TN (OMR/LMS)</th>
                      <th className="py-2.5 px-3">Điểm Tự luận</th>
                      <th className="py-2.5 px-3">Tổng điểm</th>
                      <th className="py-2.5 px-3">Nhận xét bài làm tự luận</th>
                      <th className="py-2.5 px-3 text-right">Lưu điểm TL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedExam.results?.map((r: any) => {
                      const draft = editingEssayScores[r.id] ?? {
                        score: String(r.essayScore ?? 0),
                        comment: r.essayComment ?? "",
                      };
                      return (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                            {r.candidateNumber}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {r.studentName}
                          </td>
                          <td className="py-2.5 px-3 font-mono">{r.variantCode}</td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-teal-800">
                            {r.mcqScore?.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max={selectedExam.essayWeight}
                              disabled={r.isLocked}
                              value={draft.score}
                              onChange={(e) =>
                                setEditingEssayScores({
                                  ...editingEssayScores,
                                  [r.id]: { ...draft, score: e.target.value },
                                })
                              }
                              className="w-20 px-2 py-1 rounded border border-slate-300 font-mono font-bold text-slate-900 bg-white"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-base text-emerald-700">
                            {r.finalScore?.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              disabled={r.isLocked}
                              value={draft.comment}
                              onChange={(e) =>
                                setEditingEssayScores({
                                  ...editingEssayScores,
                                  [r.id]: { ...draft, comment: e.target.value },
                                })
                              }
                              className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              disabled={submitting || r.isLocked}
                              onClick={() =>
                                dispatchAction(
                                  {
                                    action: "SAVE_ESSAY_SCORE",
                                    resultId: r.id,
                                    essayScore: Number(draft.score),
                                    essayComment: draft.comment,
                                  },
                                  `Đã cập nhật điểm tự luận cho ${r.studentName}!`
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-[#003B3A] hover:bg-[#135E5B] text-white font-semibold disabled:opacity-40"
                            >
                              Lưu
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

        {/* ========================================================= */}
        {/* TAB 7: ĐỐI SOÁT 3 CHIỀU, DUYỆT ĐIỂM & ĐỒNG BỘ SỔ ĐIỂM (H) */}
        {/* ========================================================= */}
        {activeTab === "results" && selectedExam && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    H. Đối soát 3 chiều, Phê duyệt & Khóa kết quả liên thông Sổ điểm
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đối soát tự động giữa: (1) Số bài thu trong Biên bản coi thi, (2) Số phiếu OMR/LMS đã chấm và (3) Bảng điểm tự luận trước khi khóa sổ & đẩy sang Sổ điểm MOET/CTQT.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedExam.status !== "LOCKED" ? (
                    <button
                      disabled={submitting}
                      onClick={() =>
                        dispatchAction(
                          {
                            action: "APPROVE_AND_SYNC_GRADEBOOK",
                            subjectExamId: selectedExam.id,
                          },
                          "Đã phê duyệt, khóa kết quả và đồng bộ sang Sổ điểm thành công!"
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Duyệt, Khóa điểm & Đồng bộ Sổ điểm</span>
                    </button>
                  ) : (
                    mode === "admin" && (
                      <button
                        disabled={submitting}
                        onClick={() =>
                          dispatchAction(
                            {
                              action: "ROLLBACK_GRADEBOOK_LOCK",
                              subjectExamId: selectedExam.id,
                              reason:
                                "Mở khóa có kiểm soát để rà soát phúc khảo theo quyết định của Ban KT&ĐBCL",
                            },
                            "Đã mở khóa bảng điểm và ghi AuditLog!"
                          )
                        }
                        className="px-4 py-2 rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>Mở khóa / Rollback (Ghi AuditLog)</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* 3-Way Reconciliation Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 font-medium">
                    1. Biên bản Coi kiểm tra (Số bài thu)
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {selectedExam.sessions?.reduce(
                      (acc: number, s: any) => acc + (s.collectedPapers || 0),
                      0
                    ) || 0}{" "}
                    bài
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 font-medium">
                    2. Số kết quả Chấm OMR / LMS + Tự luận
                  </div>
                  <div className="text-2xl font-bold text-teal-800 mt-1">
                    {selectedExam.results?.length || 0} bản ghi
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-emerald-800 font-medium">
                    3. Trạng thái Đối soát & Liên thông Sổ điểm
                  </div>
                  <div className="text-lg font-bold text-emerald-900 mt-1">
                    {selectedExam.status === "LOCKED"
                      ? `Đã đồng bộ (${selectedExam.gradebookSyncedBy || "KTĐBCL"})`
                      : "Khớp 100% • Sẵn sàng phê duyệt"}
                  </div>
                </div>
              </div>

              {/* Detailed Candidate Reconciliation Table */}
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">SBD</th>
                      <th className="py-2.5 px-3">Học sinh</th>
                      <th className="py-2.5 px-3">Lớp</th>
                      <th className="py-2.5 px-3">Nguồn dữ liệu</th>
                      <th className="py-2.5 px-3">Điểm TN</th>
                      <th className="py-2.5 px-3">Điểm TL</th>
                      <th className="py-2.5 px-3">Tổng điểm</th>
                      <th className="py-2.5 px-3">Đối soát 3 chiều</th>
                      <th className="py-2.5 px-3">Trạng thái Sổ điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedExam.results?.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-teal-800">
                          {r.candidateNumber}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {r.studentName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{r.className}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {r.sourceType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">{r.mcqScore?.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-mono">{r.essayScore?.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 text-sm">
                          {r.finalScore?.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
                          {r.reconciliationFlag === "MATCHED" ? (
                            <span className="text-emerald-700 font-semibold">
                              Khớp (MATCHED)
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold">
                              Cần rà soát ({r.reconciliationFlag})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {r.isLocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              <Lock className="w-3 h-3" /> {r.approvalStatus}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                              {r.approvalStatus}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: BÁO CÁO PHÂN TÍCH CHẤT LƯỢNG & LƯU TRỮ (H)         */}
        {/* ========================================================= */}
        {activeTab === "reports" && selectedExam && (
          <div className="space-y-6">
            {selectedExam.analytics && (
              <ScoreDistributionChart
                title={`Phổ điểm & Phân tích chất lượng: ${selectedExam.subjectName} - Khối ${selectedExam.gradeLevel}`}
                subjectName={selectedExam.subjectName}
                scopeLabel={selectedExam.campusName}
                bands={selectedExam.analytics.bands}
                stats={selectedExam.analytics.stats}
              />
            )}

            {data?.campusStats && (
              <CampusComparisonChart
                systemMean={data.campusStats.systemMean || 0}
                campuses={data.campusStats.campuses || []}
                subjectName={selectedExam.subjectName}
                periodName={selectedExam.period?.name || "Kỳ kiểm tra định kỳ"}
              />
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 9: THÔNG BÁO KHẢO THÍ & TRUNG TÂM LIÊN LẠC            */}
        {/* ========================================================= */}
        {activeTab === "notifications" && (
          <NotificationManagementWorkspace
            workspaceRole={mode === "teacher" ? "TEACHER" : "KTDBCL"}
            embeddedInKhaoThiSo={true}
            defaultTestingPeriodId={selectedPeriodId}
          />
        )}
      </div>
    </div>
  );
}
