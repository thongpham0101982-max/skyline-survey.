"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  Feather,
  FileSpreadsheet,
  Filter,
  Gamepad2,
  Heart,
  RefreshCcw,
  Search,
  Users
} from "lucide-react";
import { SpecialSubjectNav } from "@/components/special-subjects/SpecialSubjectNav";
import {
  FinGameOverviewCharts,
  StagePerformanceChart
} from "@/components/special-subjects/FinGameReportCharts";
import type {
  FinEduGamificationReportData,
  StudentGameSummaryRow
} from "@/lib/skyline-journey/reportService";

type ReportTab = "LEVEL_GRADE" | "CLASS" | "STAGE" | "STUDENT";
type StudentQuickFilter = "ALL" | "PLAYED" | "SURVEYED" | "NOT_STARTED";

const STATUS_LABEL_MAP: Record<string, { label: string; cls: string }> = {
  COMPLETED: {
    label: "Hoàn thành",
    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200"
  },
  WAITING_CONFIRMATION: {
    label: "Chờ GV duyệt",
    cls: "bg-amber-50 text-amber-700 border border-amber-200"
  },
  NEEDS_REVISION: {
    label: "Cần bổ sung",
    cls: "bg-rose-50 text-rose-700 border border-rose-200"
  },
  IN_PROGRESS: {
    label: "Đang chơi",
    cls: "bg-slate-100 text-slate-700 border border-slate-200"
  }
};

const INTEREST_BADGE_MAP: Record<string, { label: string; cls: string }> = {
  VERY_LOVE: {
    label: "Rất yêu thích",
    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200"
  },
  LOVE: {
    label: "Yêu thích",
    cls: "bg-teal-50 text-[#00736E] border border-teal-200"
  },
  NORMAL: {
    label: "Bình thường",
    cls: "bg-amber-50 text-amber-700 border border-amber-200"
  },
  NEED_SUPPORT: {
    label: "Cần hướng dẫn",
    cls: "bg-rose-50 text-rose-700 border border-rose-200"
  }
};

function formatDateTimeVi(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDurationShort(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
}

function RateBar({
  percent,
  tone = "teal"
}: {
  percent: number;
  tone?: "teal" | "emerald" | "sky" | "amber";
}) {
  const safe = Math.max(0, Math.min(100, percent || 0));
  const barCls =
    tone === "emerald"
      ? "bg-[#059669]"
      : tone === "sky"
      ? "bg-[#0284C7]"
      : tone === "amber"
      ? "bg-[#D97706]"
      : "bg-[#00A19A]";
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden shrink-0">
        <div className={`h-full rounded-full ${barCls}`} style={{ width: `${safe}%` }} />
      </div>
      <span className="font-semibold text-slate-800 w-11 text-right">{safe.toFixed(1)}%</span>
    </div>
  );
}

function ScorePill({ score, hasData = true }: { score: number; hasData?: boolean }) {
  if (!hasData) return <span className="text-slate-400">—</span>;
  const cls =
    score >= 90
      ? "bg-emerald-50 text-[#059669] border-emerald-200"
      : score >= 70
      ? "bg-teal-50 text-[#00736E] border-teal-200"
      : "bg-amber-50 text-[#D97706] border-amber-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}
    >
      {score.toFixed(1)}%
    </span>
  );
}

export default function FinEduGamificationReportPage() {
  const [data, setData] = useState<FinEduGamificationReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [campusFilter, setCampusFilter] = useState<string>("ALL");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");

  // Tabs & table states
  const [activeTab, setActiveTab] = useState<ReportTab>("LEVEL_GRADE");
  const [onlyPlayedStages, setOnlyPlayedStages] = useState<boolean>(true);
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [studentQuickFilter, setStudentQuickFilter] = useState<StudentQuickFilter>("ALL");
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set());
  const [studentPage, setStudentPage] = useState<number>(1);
  const PAGE_SIZE = 30;

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (academicYearId) params.set("academicYearId", academicYearId);
      if (levelFilter !== "ALL") params.set("level", levelFilter);
      if (campusFilter !== "ALL") params.set("campusId", campusFilter);
      if (gradeFilter !== "ALL") params.set("grade", gradeFilter);
      if (classFilter !== "ALL") params.set("classId", classFilter);

      const res = await fetch(`/api/skyline-journey/report?${params.toString()}`, {
        cache: "no-store"
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json?.error || "Không thể tải báo cáo hoạt động game hóa.");
        return;
      }
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi kết nối máy chủ.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [academicYearId, levelFilter, campusFilter, gradeFilter, classFilter]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Reset pagination when filters/search change
  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch, studentQuickFilter, levelFilter, campusFilter, gradeFilter, classFilter]);

  const availableGrades = useMemo(() => {
    if (levelFilter === "PRIMARY") return ["1", "2", "3", "4", "5"];
    if (levelFilter === "SECONDARY") return ["6", "7", "8", "9"];
    return ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  }, [levelFilter]);

  const displayedStages = useMemo(() => {
    const list = data?.stageResults || [];
    if (!onlyPlayedStages) return list;
    const played = list.filter((s) => s.totalPlayers > 0);
    return played.length > 0 ? played : list;
  }, [data?.stageResults, onlyPlayedStages]);

  const filteredStudents = useMemo(() => {
    const list = data?.studentGameResults || [];
    const q = studentSearch.trim().toLowerCase();
    return list.filter((stu) => {
      if (studentQuickFilter === "PLAYED" && stu.playedGamesCount === 0) return false;
      if (studentQuickFilter === "SURVEYED" && !stu.hasSurveyed) return false;
      if (studentQuickFilter === "NOT_STARTED" && (stu.hasSurveyed || stu.playedGamesCount > 0)) {
        return false;
      }
      if (!q) return true;
      return (
        stu.studentName.toLowerCase().includes(q) ||
        stu.studentCode.toLowerCase().includes(q) ||
        stu.className.toLowerCase().includes(q) ||
        stu.campusName.toLowerCase().includes(q)
      );
    });
  }, [data?.studentGameResults, studentSearch, studentQuickFilter]);

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const pagedStudents = useMemo(() => {
    const start = (studentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(start, start + PAGE_SIZE);
  }, [filteredStudents, studentPage]);

  const toggleExpandStudent = (studentId: string) => {
    setExpandedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleDrillDownClass = (clsId: string) => {
    setClassFilter(clsId);
    setActiveTab("STUDENT");
  };

  const handleExportExcel = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Tổng hợp theo Bậc học & Khối lớp
    const levelRows = data.levelSummary.map((lv) => ({
      "Nhóm thống kê": "Bậc học",
      "Bậc học / Khối": `${lv.levelName} (${lv.gradeRange})`,
      "Trạng thái game hóa": lv.gamificationStatusLabel,
      "Số lớp": lv.totalClasses,
      "Số HS tham gia học": lv.enrolledStudents,
      "Số HS khảo sát": lv.surveyedStudents,
      "Tỷ lệ khảo sát (%)": lv.surveyRatePercent,
      "Rất yêu thích": lv.surveyDistribution.VERY_LOVE,
      "Yêu thích": lv.surveyDistribution.LOVE,
      "Bình thường": lv.surveyDistribution.NORMAL,
      "Cần hướng dẫn": lv.surveyDistribution.NEED_SUPPORT,
      "Tỷ lệ yêu thích (%)": lv.surveyDistribution.positiveRatePercent,
      "Số HS chơi game": lv.playedStudents,
      "Tỷ lệ tham gia game (%)": lv.participationRatePercent,
      "Tổng lượt bài game": lv.totalStagePlays,
      "Bài hoàn thành": lv.completedStages,
      "Tỷ lệ hoàn thành (%)": lv.completionRatePercent,
      "Điểm TB bài game (%)": lv.avgScorePercent
    }));

    const gradeRows = data.gradeSummary.map((gr) => ({
      "Nhóm thống kê": "Khối lớp",
      "Bậc học / Khối": `Khối ${gr.grade} (${gr.levelName} • ${gr.curriculumCode})`,
      "Trạng thái game hóa":
        gr.gamificationStatus === "ACTIVE" ? "Đang triển khai game hóa" : "Chưa kích hoạt game",
      "Số lớp": gr.totalClasses,
      "Số HS tham gia học": gr.enrolledStudents,
      "Số HS khảo sát": gr.surveyedStudents,
      "Tỷ lệ khảo sát (%)": gr.surveyRatePercent,
      "Rất yêu thích": gr.surveyDistribution.VERY_LOVE,
      "Yêu thích": gr.surveyDistribution.LOVE,
      "Bình thường": gr.surveyDistribution.NORMAL,
      "Cần hướng dẫn": gr.surveyDistribution.NEED_SUPPORT,
      "Tỷ lệ yêu thích (%)": gr.surveyDistribution.positiveRatePercent,
      "Số HS chơi game": gr.playedStudents,
      "Tỷ lệ tham gia game (%)": gr.participationRatePercent,
      "Tổng lượt bài game": gr.totalStagePlays,
      "Bài hoàn thành": gr.completedStages,
      "Tỷ lệ hoàn thành (%)": gr.completionRatePercent,
      "Điểm TB bài game (%)": gr.avgScorePercent
    }));

    const ws1 = XLSX.utils.json_to_sheet([...levelRows, ...gradeRows]);
    XLSX.utils.book_append_sheet(wb, ws1, "Theo_Bac_Hoc_Khoi");

    // Sheet 2: Theo Cơ sở & Lớp
    const ws2 = XLSX.utils.json_to_sheet(
      data.classSummary.map((c, idx) => ({
        STT: idx + 1,
        Lớp: c.className,
        Khối: `Khối ${c.grade}`,
        "Bậc học": c.levelName,
        Hệ: c.educationSystem,
        "Cơ sở": c.campusName,
        "GV phụ trách": c.teacherName,
        "Số HS tham gia học": c.enrolledStudents,
        "Số HS khảo sát": c.surveyedStudents,
        "Tỷ lệ khảo sát (%)": c.surveyRatePercent,
        "Số HS chơi game": c.playedStudents,
        "Tỷ lệ tham gia game (%)": c.participationRatePercent,
        "Tổng lượt bài game": c.totalStagePlays,
        "Bài hoàn thành": c.completedStages,
        "Tỷ lệ hoàn thành (%)": c.completionRatePercent,
        "Điểm TB (%)": c.avgScorePercent
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws2, "Theo_Co_So_Lop");

    // Sheet 3: Tổng hợp kết quả theo Học sinh
    const ws3 = XLSX.utils.json_to_sheet(
      filteredStudents.map((s, idx) => ({
        STT: idx + 1,
        "Mã HS": s.studentCode,
        "Họ và tên": s.studentName,
        Lớp: s.className,
        Khối: `Khối ${s.grade}`,
        "Bậc học": s.levelName,
        "Cơ sở": s.campusName,
        "GV phụ trách": s.teacherName,
        "Đã khảo sát": s.hasSurveyed ? "Đã khảo sát" : "Chưa khảo sát",
        "Mức độ yêu thích": s.surveyInterestLabel || "",
        "Số bài game đã chơi": s.playedGamesCount,
        "Số bài hoàn thành": s.completedGamesCount,
        "Tỷ lệ hoàn thành (%)": s.completionRatePercent,
        "Điểm TB bài game (%)": s.avgScorePercent,
        "Tổng lượt thử": s.totalAttempts,
        "Lông vũ": s.totalFeathers,
        "Lần chơi gần nhất": formatDateTimeVi(s.lastPlayedAt)
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws3, "Ket_Qua_Tong_Hop_HS");

    // Sheet 4: Chi tiết từng bài game của Học sinh
    const gameDetailRows: Array<Record<string, string | number>> = [];
    let detailIdx = 1;
    for (const s of filteredStudents) {
      for (const g of s.games) {
        gameDetailRows.push({
          STT: detailIdx++,
          "Mã HS": s.studentCode,
          "Họ và tên": s.studentName,
          Lớp: s.className,
          Khối: `Khối ${s.grade}`,
          "Bậc học": s.levelName,
          "Cơ sở": s.campusName,
          "Mã bài game": g.lessonCode,
          Chặng: g.periodIndex,
          "Tên bài học": g.lessonName,
          "Trạng thái": STATUS_LABEL_MAP[g.status]?.label || g.status,
          "Điểm (%)": g.scorePercent,
          "YCCĐ đạt": `${g.achievedCriteriaCount}/${g.totalCriteriaCount}`,
          "Số lần thử": g.attemptsCount,
          "Lông vũ": g.feathersEarned,
          "Thời gian": formatDurationShort(g.durationSeconds),
          "Chia sẻ HS": g.studentReflection || "",
          "Nhận xét GVBM": g.teacherFeedback || "",
          "Cập nhật lúc": formatDateTimeVi(g.completedAt || g.lastPlayedAt)
        });
      }
    }
    const ws4 = XLSX.utils.json_to_sheet(
      gameDetailRows.length > 0
        ? gameDetailRows
        : [{ "Thông báo": "Chưa có lượt chơi bài game nào theo bộ lọc hiện tại" }]
    );
    XLSX.utils.book_append_sheet(wb, ws4, "Chi_Tiet_Bai_Game_HS");

    const ayName = (data.academicYear?.name || "2026-2027").replace(/\s+/g, "_");
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Bao_Cao_Game_GD_Tai_Chinh_${ayName}_${today}.xlsx`);
  };

  const overview = data?.overview;
  const dist = overview?.surveyDistribution;

  return (
    <div className="p-3 md:p-5 w-full max-w-[1600px] mx-auto space-y-4 bg-[#F8FAFC] min-h-screen">
      <SpecialSubjectNav
        title="Báo cáo theo dõi trải nghiệm Hoạt động game hóa — Giáo dục Tài chính"
        subtitle="Tổng hợp số học sinh tham gia học, tỷ lệ khảo sát yêu thích và kết quả các bài game theo bậc học, khối lớp và từng học sinh"
      />

      {/* Masthead Strip */}
      <div className="bg-gradient-to-r from-white via-[#F0FDFA]/70 to-[#ECFDF5]/60 rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] px-5 py-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#003B3A] tracking-tight">
              Báo cáo theo dõi trải nghiệm Hoạt động game hóa môn Giáo dục Tài chính
            </h2>
            {data?.academicYear && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-teal-50 text-[#00736E] border border-teal-200 tabular-nums">
                Năm học {data.academicYear.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600">
            Phân tích đồng bộ từ phân công giảng dạy GD Tài chính (Khối 1–9), khảo sát đầu game và nhật ký kết quả từng chặng Hành trình Sky-Line.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/admin/special-subjects/skyline-journey"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-[#00736E]" />
            <span>Quản trị Hành trình Sky-Line</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!data || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] hover:bg-[#005250] text-white transition-colors shadow-xs disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span>Xuất Excel (4 sheet)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#003B3A] pb-2 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#00A19A]" />
            <span>Bộ lọc báo cáo</span>
          </div>

          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-[11px] font-medium text-slate-600">Năm học</label>
            <select
              value={academicYearId || data?.academicYear?.id || ""}
              onChange={(e) => {
                setAcademicYearId(e.target.value);
                setClassFilter("ALL");
              }}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00A19A]"
            >
              {(data?.academicYears || []).map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.status === "ACTIVE" ? "(Hiện hành)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[170px]">
            <label className="text-[11px] font-medium text-slate-600">Bậc học</label>
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setGradeFilter("ALL");
                setClassFilter("ALL");
              }}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả bậc học (Khối 1–9)</option>
              <option value="PRIMARY">Tiểu học (Khối 1–5)</option>
              <option value="SECONDARY">THCS (Khối 6–9)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[190px]">
            <label className="text-[11px] font-medium text-slate-600">Cơ sở</label>
            <select
              value={campusFilter}
              onChange={(e) => {
                setCampusFilter(e.target.value);
                setClassFilter("ALL");
              }}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả cơ sở ({data?.campuses?.length || 0})</option>
              {(data?.campuses || []).map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-[11px] font-medium text-slate-600">Khối lớp</label>
            <select
              value={gradeFilter}
              onChange={(e) => {
                setGradeFilter(e.target.value);
                setClassFilter("ALL");
              }}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả khối</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-[11px] font-medium text-slate-600">Lớp học</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả lớp ({data?.classSummary?.length || 0})</option>
              {(data?.classSummary || []).map((cls) => (
                <option key={cls.classId} value={cls.classId}>
                  {cls.className} — {cls.campusCode || cls.campusName}
                </option>
              ))}
            </select>
          </div>

          {(levelFilter !== "ALL" ||
            campusFilter !== "ALL" ||
            gradeFilter !== "ALL" ||
            classFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setLevelFilter("ALL");
                setCampusFilter("ALL");
                setGradeFilter("ALL");
                setClassFilter("ALL");
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#00736E] hover:bg-teal-50 border border-teal-200 transition-colors"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {/* Unified Academic Ledger KPI Strip */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0] tabular-nums">
          <div className="p-4 border-t-[3px] border-t-[#003B3A] bg-gradient-to-b from-[#003B3A]/[0.03] to-white">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-600">Số HS tham gia học</span>
              <span className="w-7 h-7 rounded-lg bg-[#003B3A]/10 text-[#003B3A] flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#003B3A]">
                {(overview?.enrolledStudents ?? 0).toLocaleString("vi-VN")}
              </span>
              <span className="text-xs text-slate-500">HS</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              {overview?.totalClasses ?? 0} lớp học GD Tài chính
            </div>
          </div>

          <div className="p-4 border-t-[3px] border-t-[#00A19A] bg-gradient-to-b from-[#00A19A]/[0.05] to-white">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-600">Số HS khảo sát</span>
              <span className="w-7 h-7 rounded-lg bg-teal-50 text-[#00736E] border border-teal-200/70 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#00736E]">
                {(overview?.surveyedStudents ?? 0).toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-teal-50 text-[#00736E]">
                {(overview?.surveyRatePercent ?? 0).toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 w-full h-1.5 rounded-full bg-teal-100/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#00A19A]"
                style={{ width: `${Math.min(100, overview?.surveyRatePercent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="p-4 border-t-[3px] border-t-[#059669] bg-gradient-to-b from-[#059669]/[0.05] to-white">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-600">Mức độ yêu thích</span>
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#059669] border border-emerald-200/70 flex items-center justify-center shrink-0">
                <Heart className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#059669]">
                {(dist?.positiveRatePercent ?? 0).toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500">tích cực</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="w-full h-1.5 rounded-full bg-emerald-100/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#059669]"
                  style={{ width: `${Math.min(100, dist?.positiveRatePercent ?? 0)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500">
                {dist?.positiveCount ?? 0}/{overview?.surveyedStudents ?? 0} HS yêu thích &amp; rất thích
              </div>
            </div>
          </div>

          <div className="p-4 border-t-[3px] border-t-[#0284C7] bg-gradient-to-b from-[#0284C7]/[0.05] to-white">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-600">Số HS đã chơi game</span>
              <span className="w-7 h-7 rounded-lg bg-sky-50 text-[#0284C7] border border-sky-200/70 flex items-center justify-center shrink-0">
                <Gamepad2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#0369A1]">
                {(overview?.playedStudents ?? 0).toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-[#0284C7]">
                {(overview?.participationRatePercent ?? 0).toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 w-full h-1.5 rounded-full bg-sky-100/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0284C7]"
                style={{ width: `${Math.min(100, overview?.participationRatePercent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="p-4 border-t-[3px] border-t-[#10B981] bg-gradient-to-b from-[#10B981]/[0.05] to-white">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-600">Hoàn thành bài game</span>
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#059669] border border-emerald-200/70 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#059669]">
                {(overview?.completedStages ?? 0).toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-[#059669]">
                {(overview?.completionRatePercent ?? 0).toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="w-full h-1.5 rounded-full bg-emerald-100/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#059669]"
                  style={{ width: `${Math.min(100, overview?.completionRatePercent ?? 0)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500">
                Trên {(overview?.totalStagePlays ?? 0).toLocaleString("vi-VN")} lượt bài game
              </div>
            </div>
          </div>

          <div className="p-4 border-t-[3px] border-t-[#D97706] bg-gradient-to-b from-[#D97706]/[0.05] to-white">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-600">Điểm TB bài game</span>
              <span className="w-7 h-7 rounded-lg bg-amber-50 text-[#D97706] border border-amber-200/70 flex items-center justify-center shrink-0">
                <Award className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#B45309]">
                {(overview?.avgScorePercent ?? 0).toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="w-full h-1.5 rounded-full bg-amber-100/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#D97706]"
                  style={{ width: `${Math.min(100, overview?.avgScorePercent ?? 0)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500">
                {(overview?.totalFeathers ?? 0).toLocaleString("vi-VN")} lông vũ tích lũy
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Control Tabs */}
      <div className="bg-white rounded-xl p-1 border border-[#E2E8F0] inline-flex flex-wrap items-center gap-1 shadow-xs">
        {[
          { id: "LEVEL_GRADE" as ReportTab, label: "1. Tổng hợp theo Bậc học & Khối lớp" },
          {
            id: "CLASS" as ReportTab,
            label: `2. Theo Cơ sở & Lớp học (${data?.classSummary?.length ?? 0})`
          },
          {
            id: "STAGE" as ReportTab,
            label: `3. Kết quả theo từng Bài game (${displayedStages.length})`
          },
          {
            id: "STUDENT" as ReportTab,
            label: `4. Kết quả Game của từng Học sinh (${filteredStudents.length})`
          }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-[#003B3A] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && !data ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-xs text-slate-500 font-medium">
          Đang tổng hợp dữ liệu báo cáo hoạt động game hóa môn Giáo dục Tài chính...
        </div>
      ) : null}

      {/* TAB 1: BẬC HỌC & KHỐI LỚP */}
      {data && activeTab === "LEVEL_GRADE" && (
        <div className="space-y-5">
          {/* Visual Charts Row: Bar Chart by Grade + 2 Donut Charts */}
          {overview && (
            <FinGameOverviewCharts overview={overview} gradeSummary={data.gradeSummary} />
          )}

          {/* Table 1: Theo Bậc học */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Bảng tổng hợp theo Bậc học
              </h3>
              <span className="text-xs text-slate-500">
                So sánh quy mô tham gia học, tỷ lệ khảo sát và kết quả thực hành game theo bậc học
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      <th className="py-3 px-3 text-white">Bậc học</th>
                      <th className="py-3 px-3 text-teal-100">Trạng thái triển khai</th>
                      <th className="py-3 px-3 text-teal-100 text-right">Số lớp</th>
                      <th className="py-3 px-3 text-white text-right">Số HS tham gia học</th>
                      <th className="py-3 px-3 text-[#5EEAD4] text-right">Số HS khảo sát</th>
                      <th className="py-3 px-3 text-[#5EEAD4] text-right">% Khảo sát</th>
                      <th className="py-3 px-3 text-teal-100 text-right">% Yêu thích</th>
                      <th className="py-3 px-3 text-white text-right">HS chơi game</th>
                      <th className="py-3 px-3 text-[#5EEAD4] text-right">% Chơi game</th>
                      <th className="py-3 px-3 text-teal-100 text-right">Lượt bài game</th>
                      <th className="py-3 px-3 text-[#5EEAD4] text-right">Hoàn thành (%)</th>
                      <th className="py-3 px-3 text-white text-right">Điểm TB (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {data.levelSummary.map((lv) => (
                      <tr
                        key={lv.levelCode}
                        className="transition-colors align-middle hover:bg-[#F8FAFC]"
                      >
                        <td className="py-3 px-3 align-middle">
                          <div className="font-semibold text-[#003B3A]">{lv.levelName}</div>
                          <div className="text-[11px] text-slate-500">{lv.gradeRange}</div>
                        </td>
                        <td className="py-3 px-3 align-middle">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                              lv.gamificationStatus === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {lv.gamificationStatusLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-middle text-right text-slate-700">
                          {lv.totalClasses}
                        </td>
                        <td className="py-3 px-3 align-middle text-right font-semibold text-slate-900">
                          {lv.enrolledStudents.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 align-middle text-right font-semibold text-[#00736E]">
                          {lv.surveyedStudents.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          <RateBar percent={lv.surveyRatePercent} />
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          {lv.surveyedStudents > 0 ? (
                            <span className="font-semibold text-[#059669]">
                              {lv.surveyDistribution.positiveRatePercent.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 align-middle text-right font-semibold text-slate-900">
                          {lv.playedStudents.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          <RateBar percent={lv.participationRatePercent} tone="sky" />
                        </td>
                        <td className="py-3 px-3 align-middle text-right text-slate-700">
                          {lv.totalStagePlays.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          {lv.totalStagePlays > 0 ? (
                            <RateBar percent={lv.completionRatePercent} tone="emerald" />
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          <ScorePill score={lv.avgScorePercent} hasData={lv.totalStagePlays > 0} />
                        </td>
                      </tr>
                    ))}

                    {/* Total row */}
                    {overview && (
                      <tr className="bg-[#F0FDFA]/70 font-semibold text-[#003B3A]">
                        <td className="py-3 px-3 align-middle">Tổng theo bộ lọc</td>
                        <td className="py-3 px-3 align-middle text-slate-600 font-normal">
                          Toàn phạm vi đang chọn
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          {overview.totalClasses}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          {overview.enrolledStudents.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 align-middle text-right text-[#00736E]">
                          {overview.surveyedStudents.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          {overview.surveyRatePercent.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 align-middle text-right text-[#059669]">
                          {overview.surveyedStudents > 0
                            ? `${overview.surveyDistribution.positiveRatePercent.toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          {overview.playedStudents.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          {overview.participationRatePercent.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          {overview.totalStagePlays.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 align-middle text-right text-[#059669]">
                          {overview.totalStagePlays > 0
                            ? `${overview.completedStages} (${overview.completionRatePercent.toFixed(1)}%)`
                            : "—"}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          {overview.totalStagePlays > 0
                            ? `${overview.avgScorePercent.toFixed(1)}%`
                            : "—"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Survey Interest Distribution Strip */}
          {dist && overview && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#003B3A]">
                    Phân bố kết quả khảo sát trải nghiệm đầu game
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tổng hợp phản hồi mức độ yêu thích môn Giáo dục Tài chính từ {overview.surveyedStudents} học sinh đã hoàn thành khảo sát.
                  </p>
                </div>
                <div className="text-xs font-semibold text-[#059669] tabular-nums">
                  Tỷ lệ tích cực: {dist.positiveRatePercent.toFixed(1)}%
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                {[
                  {
                    key: "VERY_LOVE",
                    label: "Rất yêu thích",
                    count: dist.VERY_LOVE,
                    bar: "bg-[#059669]",
                    text: "text-[#059669]"
                  },
                  {
                    key: "LOVE",
                    label: "Yêu thích",
                    count: dist.LOVE,
                    bar: "bg-[#00A19A]",
                    text: "text-[#00736E]"
                  },
                  {
                    key: "NORMAL",
                    label: "Bình thường",
                    count: dist.NORMAL,
                    bar: "bg-[#D97706]",
                    text: "text-[#D97706]"
                  },
                  {
                    key: "NEED_SUPPORT",
                    label: "Cần thêm hướng dẫn",
                    count: dist.NEED_SUPPORT,
                    bar: "bg-[#E11D48]",
                    text: "text-[#E11D48]"
                  }
                ].map((item) => {
                  const pct =
                    overview.surveyedStudents > 0
                      ? Math.round((item.count / overview.surveyedStudents) * 1000) / 10
                      : 0;
                  return (
                    <div
                      key={item.key}
                      className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{item.label}</span>
                        <span className={`font-bold ${item.text}`}>{pct.toFixed(1)}%</span>
                      </div>
                      <div className="text-lg font-bold text-[#003B3A]">
                        {item.count.toLocaleString("vi-VN")}{" "}
                        <span className="text-xs font-normal text-slate-500">HS</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className={`h-full rounded-full ${item.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Table 2: Chi tiết theo Khối lớp */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Bảng chi tiết theo Khối lớp (Khối 1–9)
              </h3>
              <span className="text-xs text-slate-500">
                Chọn nút &ldquo;Xem lớp&rdquo; để lọc chi tiết các lớp thuộc từng khối
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      <th className="py-3 px-3 text-white">Khối lớp</th>
                      <th className="py-3 px-3 text-teal-100">Bậc học / Mã CT</th>
                      <th className="py-3 px-3 text-teal-100 text-right">Số lớp</th>
                      <th className="py-3 px-3 text-white text-right">Số HS học</th>
                      <th className="py-3 px-3 text-[#5EEAD4] text-right">HS khảo sát</th>
                      <th className="py-3 px-3 text-[#5EEAD4] text-right">% Khảo sát</th>
                      <th className="py-3 px-3 text-white text-right">HS chơi game</th>
                      <th className="py-3 px-3 text-[#5EEAD4] text-right">% Chơi game</th>
                      <th className="py-3 px-3 text-teal-100 text-right">Lượt bài game</th>
                      <th className="py-3 px-3 text-[#5EEAD4] text-right">Hoàn thành (%)</th>
                      <th className="py-3 px-3 text-white text-right">Điểm TB (%)</th>
                      <th className="py-3 px-3 text-white text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {data.gradeSummary.map((gr) => (
                      <tr
                        key={gr.grade}
                        className="transition-colors align-middle hover:bg-[#F8FAFC]"
                      >
                        <td className="py-3 px-3 align-middle font-semibold text-[#003B3A]">
                          Khối {gr.grade}
                        </td>
                        <td className="py-3 px-3 align-middle">
                          <span className="text-slate-700 font-medium">{gr.levelName}</span>
                          <span className="text-slate-400 mx-1.5">•</span>
                          <span className="text-[11px] font-mono text-slate-600">
                            {gr.curriculumCode}
                          </span>
                          {gr.totalCatalogStages > 0 && (
                            <span className="text-[11px] text-slate-500 ml-1.5">
                              ({gr.totalCatalogStages} chặng)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 align-middle text-right text-slate-700">
                          {gr.totalClasses}
                        </td>
                        <td className="py-3 px-3 align-middle text-right font-semibold text-slate-900">
                          {gr.enrolledStudents.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 align-middle text-right font-semibold text-[#00736E]">
                          {gr.surveyedStudents.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          <RateBar percent={gr.surveyRatePercent} />
                        </td>
                        <td className="py-3 px-3 align-middle text-right font-semibold text-slate-900">
                          {gr.playedStudents.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          <RateBar percent={gr.participationRatePercent} tone="sky" />
                        </td>
                        <td className="py-3 px-3 align-middle text-right text-slate-700">
                          {gr.totalStagePlays.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          {gr.totalStagePlays > 0 ? (
                            <RateBar percent={gr.completionRatePercent} tone="emerald" />
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          <ScorePill score={gr.avgScorePercent} hasData={gr.totalStagePlays > 0} />
                        </td>
                        <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setGradeFilter(gr.grade);
                              setClassFilter("ALL");
                              setActiveTab("CLASS");
                            }}
                            className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] hover:border-[#00A19A] hover:bg-teal-50 text-[#003B3A] font-semibold text-[11px] transition-colors"
                          >
                            Xem lớp
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: THEO CƠ SỞ & LỚP HỌC */}
      {data && activeTab === "CLASS" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-3 px-3 text-white">Lớp</th>
                  <th className="py-3 px-3 text-teal-100">Khối / Bậc học</th>
                  <th className="py-3 px-3 text-teal-100">Cơ sở</th>
                  <th className="py-3 px-3 text-teal-100">GV phụ trách</th>
                  <th className="py-3 px-3 text-white text-right">Số HS học</th>
                  <th className="py-3 px-3 text-[#5EEAD4] text-right">HS khảo sát (%)</th>
                  <th className="py-3 px-3 text-[#5EEAD4] text-right">HS chơi game (%)</th>
                  <th className="py-3 px-3 text-teal-100 text-right">Lượt bài game</th>
                  <th className="py-3 px-3 text-[#5EEAD4] text-right">Hoàn thành (%)</th>
                  <th className="py-3 px-3 text-white text-right">Điểm TB (%)</th>
                  <th className="py-3 px-3 text-white text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {data.classSummary.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-500">
                      Không có lớp học nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  data.classSummary.map((cls) => (
                    <tr
                      key={cls.classId}
                      className="transition-colors align-middle hover:bg-[#F8FAFC]"
                    >
                      <td className="py-3 px-3 align-middle font-semibold text-[#003B3A]">
                        {cls.className}
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-700">
                        Khối {cls.grade} • {cls.levelName}
                        <span className="text-slate-400 ml-1">({cls.educationSystem})</span>
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-600">{cls.campusName}</td>
                      <td className="py-3 px-3 align-middle text-slate-700">{cls.teacherName}</td>
                      <td className="py-3 px-3 align-middle text-right font-semibold text-slate-900">
                        {cls.enrolledStudents}
                      </td>
                      <td className="py-3 px-3 align-middle text-right">
                        <span className="font-semibold text-[#00736E]">{cls.surveyedStudents}</span>
                        <span className="text-slate-500 ml-1">
                          ({cls.surveyRatePercent.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle text-right">
                        <span className="font-semibold text-slate-900">{cls.playedStudents}</span>
                        <span className="text-slate-500 ml-1">
                          ({cls.participationRatePercent.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle text-right text-slate-700">
                        {cls.totalStagePlays}
                      </td>
                      <td className="py-3 px-3 align-middle text-right">
                        {cls.totalStagePlays > 0 ? (
                          <span>
                            <span className="font-semibold text-[#059669]">
                              {cls.completedStages}
                            </span>
                            <span className="text-slate-500 ml-1">
                              ({cls.completionRatePercent.toFixed(1)}%)
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle text-right">
                        <ScorePill score={cls.avgScorePercent} hasData={cls.totalStagePlays > 0} />
                      </td>
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDrillDownClass(cls.classId)}
                          className="px-2.5 py-1 rounded-lg bg-[#003B3A] hover:bg-[#005250] text-white font-semibold text-[11px] transition-colors"
                        >
                          Xem DS HS
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: KẾT QUẢ THEO TỪNG BÀI GAME */}
      {data && activeTab === "STAGE" && (
        <div className="space-y-4">
          <StagePerformanceChart stages={data.stageResults} />

          <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-[#E2E8F0] px-4 py-2.5">
            <div className="text-xs text-slate-600">
              Hiển thị kết quả thực hành theo từng chặng/bài game thuộc chương trình Giáo dục Tài chính.
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyPlayedStages}
                onChange={(e) => setOnlyPlayedStages(e.target.checked)}
                className="rounded border-slate-300 text-[#003B3A] focus:ring-[#00A19A]"
              />
              <span>Chỉ hiện các bài game đã có HS tham gia</span>
            </label>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 text-white">Khối / Chặng</th>
                    <th className="py-3 px-3 text-teal-100">Mã bài học</th>
                    <th className="py-3 px-3 text-white">Tên bài học (Game)</th>
                    <th className="py-3 px-3 text-white text-right">Số HS đã chơi</th>
                    <th className="py-3 px-3 text-[#5EEAD4] text-right">Hoàn thành</th>
                    <th className="py-3 px-3 text-[#5EEAD4] text-right">% Hoàn thành</th>
                    <th className="py-3 px-3 text-teal-100 text-right">Chờ duyệt / Đang chơi</th>
                    <th className="py-3 px-3 text-teal-100 text-right">Cần bổ sung</th>
                    <th className="py-3 px-3 text-white text-right">Điểm TB (%)</th>
                    <th className="py-3 px-3 text-teal-100 text-right">Lần thử TB</th>
                    <th className="py-3 px-3 text-teal-100 text-right">YCCĐ đạt TB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {displayedStages.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-500">
                        Chưa có dữ liệu bài game theo bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    displayedStages.map((st) => (
                      <tr
                        key={st.lessonCode}
                        className="transition-colors align-middle hover:bg-[#F8FAFC]"
                      >
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          <span className="font-semibold text-[#003B3A]">Khối {st.grade}</span>
                          <span className="text-slate-400 mx-1">•</span>
                          <span className="text-slate-700">Chặng {st.periodIndex}</span>
                        </td>
                        <td className="py-3 px-3 align-middle font-mono text-[11px] text-slate-600">
                          {st.lessonCode}
                        </td>
                        <td className="py-3 px-3 align-middle font-medium text-slate-900">
                          {st.lessonName}
                        </td>
                        <td className="py-3 px-3 align-middle text-right font-semibold text-slate-900">
                          {st.totalPlayers}
                        </td>
                        <td className="py-3 px-3 align-middle text-right font-semibold text-[#059669]">
                          {st.completedCount}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          <RateBar percent={st.completionRatePercent} tone="emerald" />
                        </td>
                        <td className="py-3 px-3 align-middle text-right text-slate-600">
                          {st.waitingCount + st.inProgressCount}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          <span
                            className={
                              st.needsRevisionCount > 0
                                ? "font-semibold text-[#E11D48]"
                                : "text-slate-400"
                            }
                          >
                            {st.needsRevisionCount}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          <ScorePill score={st.avgScorePercent} hasData={st.totalPlayers > 0} />
                        </td>
                        <td className="py-3 px-3 align-middle text-right text-slate-700">
                          {st.totalPlayers > 0 ? st.avgAttempts.toFixed(1) : "—"}
                        </td>
                        <td className="py-3 px-3 align-middle text-right text-slate-700">
                          {st.totalPlayers > 0
                            ? `${st.avgAchievedCriteria.toFixed(1)}/${st.totalCriteriaCount}`
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KẾT QUẢ GAME CỦA TỪNG HỌC SINH */}
      {data && activeTab === "STUDENT" && (
        <div className="space-y-3">
          {/* Student Search & Quick Filter Bar */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Tìm theo họ tên, mã HS, lớp hoặc cơ sở..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL" as StudentQuickFilter, label: "Tất cả HS" },
                { id: "PLAYED" as StudentQuickFilter, label: "Đã chơi game" },
                { id: "SURVEYED" as StudentQuickFilter, label: "Đã khảo sát" },
                { id: "NOT_STARTED" as StudentQuickFilter, label: "Chưa tham gia" }
              ].map((qf) => (
                <button
                  key={qf.id}
                  type="button"
                  onClick={() => setStudentQuickFilter(qf.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    studentQuickFilter === qf.id
                      ? "bg-[#003B3A] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {qf.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 text-white w-10">STT</th>
                    <th className="py-3 px-3 text-white">Học sinh</th>
                    <th className="py-3 px-3 text-teal-100">Lớp / Cơ sở</th>
                    <th className="py-3 px-3 text-[#5EEAD4]">Khảo sát đầu game</th>
                    <th className="py-3 px-3 text-white text-right">Bài đã chơi</th>
                    <th className="py-3 px-3 text-[#5EEAD4] text-right">Hoàn thành (%)</th>
                    <th className="py-3 px-3 text-white text-right">Điểm TB (%)</th>
                    <th className="py-3 px-3 text-teal-100 text-right">Lông vũ</th>
                    <th className="py-3 px-3 text-white text-right">Chi tiết bài game</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {pagedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        Không tìm thấy học sinh phù hợp với điều kiện lọc.
                      </td>
                    </tr>
                  ) : (
                    pagedStudents.map((stu: StudentGameSummaryRow, idx: number) => {
                      const isExpanded = expandedStudentIds.has(stu.studentId);
                      const interestBadge = stu.surveyInterestLevel
                        ? INTEREST_BADGE_MAP[stu.surveyInterestLevel]
                        : null;
                      const rowNum = (studentPage - 1) * PAGE_SIZE + idx + 1;

                      return (
                        <React.Fragment key={stu.studentId}>
                          <tr
                            className={`transition-colors align-middle ${
                              isExpanded
                                ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                                : "hover:bg-[#F8FAFC]"
                            }`}
                          >
                            <td className="py-3 px-3 align-middle text-slate-500">{rowNum}</td>
                            <td className="py-3 px-3 align-middle">
                              <div className="font-semibold text-slate-900">{stu.studentName}</div>
                              <div className="text-[11px] font-mono text-slate-500">
                                {stu.studentCode}
                              </div>
                            </td>
                            <td className="py-3 px-3 align-middle">
                              <div className="font-medium text-slate-800">
                                {clsLabel(stu.className, stu.grade, stu.levelName)}
                              </div>
                              <div className="text-[11px] text-slate-500">{stu.campusName}</div>
                            </td>
                            <td className="py-3 px-3 align-middle">
                              {stu.hasSurveyed ? (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                                    interestBadge?.cls ||
                                    "bg-teal-50 text-[#00736E] border border-teal-200"
                                  }`}
                                >
                                  {interestBadge?.label || stu.surveyInterestLabel || "Đã khảo sát"}
                                </span>
                              ) : (
                                <span className="text-slate-400">Chưa khảo sát</span>
                              )}
                            </td>
                            <td className="py-3 px-3 align-middle text-right font-semibold text-slate-900">
                              {stu.playedGamesCount}
                            </td>
                            <td className="py-3 px-3 align-middle text-right">
                              {stu.playedGamesCount > 0 ? (
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                    <div
                                      className="h-full rounded-full bg-[#059669]"
                                      style={{
                                        width: `${Math.min(100, stu.completionRatePercent)}%`
                                      }}
                                    />
                                  </div>
                                  <span className="whitespace-nowrap">
                                    <span className="font-semibold text-[#059669]">
                                      {stu.completedGamesCount}
                                    </span>
                                    <span className="text-slate-500 ml-1">
                                      ({stu.completionRatePercent.toFixed(1)}%)
                                    </span>
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 align-middle text-right">
                              <ScorePill
                                score={stu.avgScorePercent}
                                hasData={stu.playedGamesCount > 0}
                              />
                            </td>
                            <td className="py-3 px-3 align-middle text-right">
                              {stu.totalFeathers > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-[#B45309] border border-amber-200 font-semibold text-[11px]">
                                  <Feather className="w-3 h-3 text-[#D97706]" />
                                  {stu.totalFeathers}
                                </span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                              {stu.playedGamesCount > 0 || stu.hasSurveyed ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandStudent(stu.studentId)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white hover:border-[#00A19A] hover:bg-teal-50 text-[#003B3A] font-semibold text-[11px] transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    {isExpanded
                                      ? "Thu gọn"
                                      : `Xem (${stu.playedGamesCount} bài)`}
                                  </span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">Chưa có dữ liệu</span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded detail panel: student's survey & every game lesson played */}
                          {isExpanded && (
                            <tr className="bg-[#F8FAFC]">
                              <td colSpan={9} className="px-5 py-4">
                                <div className="space-y-3">
                                  {/* Survey summary box */}
                                  {stu.hasSurveyed && (
                                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 text-xs flex flex-wrap items-center justify-between gap-2">
                                      <div className="space-y-0.5">
                                        <div className="font-semibold text-[#003B3A]">
                                          Thông tin khảo sát đầu game
                                        </div>
                                        <div className="text-slate-600">
                                          Nhân vật đồng hành:{" "}
                                          <span className="font-medium text-slate-800">
                                            {stu.characterName || "—"}
                                          </span>
                                          {stu.surveyFavoriteActivities.length > 0 && (
                                            <>
                                              <span className="mx-1.5 text-slate-300">|</span>
                                              Hoạt động yêu thích:{" "}
                                              <span className="font-medium text-slate-800">
                                                {stu.surveyFavoriteActivities.join(", ")}
                                              </span>
                                            </>
                                          )}
                                          {stu.surveyNote && (
                                            <>
                                              <span className="mx-1.5 text-slate-300">|</span>
                                              Ghi chú HS:{" "}
                                              <span className="italic text-slate-700">
                                                &ldquo;{stu.surveyNote}&rdquo;
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-[11px] text-slate-500">
                                        Khảo sát lúc: {formatDateTimeVi(stu.surveySubmittedAt)}
                                      </div>
                                    </div>
                                  )}

                                  {/* List of game lessons played */}
                                  {stu.games.length === 0 ? (
                                    <div className="text-xs text-slate-500 italic">
                                      Học sinh đã hoàn thành khảo sát đầu game nhưng chưa phát sinh lượt chơi bài game nào.
                                    </div>
                                  ) : (
                                    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                                      <table className="w-full text-left border-collapse">
                                        <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                                          <tr className="text-[11px] font-semibold whitespace-nowrap">
                                            <th className="py-2 px-3 text-white">Chặng</th>
                                            <th className="py-2 px-3 text-teal-100">Mã bài</th>
                                            <th className="py-2 px-3 text-white">Tên bài game</th>
                                            <th className="py-2 px-3 text-[#5EEAD4] text-right">
                                              Điểm (%)
                                            </th>
                                            <th className="py-2 px-3 text-teal-100 text-right">
                                              YCCĐ đạt
                                            </th>
                                            <th className="py-2 px-3 text-teal-100 text-right">
                                              Lần thử
                                            </th>
                                            <th className="py-2 px-3 text-teal-100 text-right">
                                              Thời gian
                                            </th>
                                            <th className="py-2 px-3 text-[#5EEAD4]">Trạng thái</th>
                                            <th className="py-2 px-3 text-teal-100">
                                              Chia sẻ HS / Nhận xét GVBM
                                            </th>
                                            <th className="py-2 px-3 text-teal-100 text-right">
                                              Cập nhật
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E2E8F0] text-xs tabular-nums">
                                          {stu.games.map((g) => {
                                            const stBadge =
                                              STATUS_LABEL_MAP[g.status] ||
                                              STATUS_LABEL_MAP.IN_PROGRESS;
                                            return (
                                              <tr key={g.id} className="hover:bg-[#F8FAFC]">
                                                <td className="py-2.5 px-3 font-semibold text-[#003B3A] whitespace-nowrap">
                                                  Chặng {g.periodIndex}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                                  {g.lessonCode}
                                                </td>
                                                <td className="py-2.5 px-3 font-medium text-slate-900">
                                                  {g.lessonName}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-semibold text-[#003B3A]">
                                                  {g.scorePercent}%
                                                </td>
                                                <td className="py-2.5 px-3 text-right text-slate-700">
                                                  {g.achievedCriteriaCount}/{g.totalCriteriaCount}
                                                </td>
                                                <td className="py-2.5 px-3 text-right text-slate-700">
                                                  {g.attemptsCount}
                                                </td>
                                                <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                                                  {formatDurationShort(g.durationSeconds)}
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                  <span
                                                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${stBadge.cls}`}
                                                  >
                                                    {stBadge.label}
                                                  </span>
                                                </td>
                                                <td className="py-2.5 px-3 max-w-xs text-[11px] text-slate-600">
                                                  {g.studentReflection && (
                                                    <div className="truncate" title={g.studentReflection}>
                                                      <span className="font-semibold text-slate-800">
                                                        HS:
                                                      </span>{" "}
                                                      {g.studentReflection}
                                                    </div>
                                                  )}
                                                  {g.teacherFeedback && (
                                                    <div
                                                      className="truncate text-[#00736E]"
                                                      title={g.teacherFeedback}
                                                    >
                                                      <span className="font-semibold">GVBM:</span>{" "}
                                                      {g.teacherFeedback}
                                                    </div>
                                                  )}
                                                  {!g.studentReflection && !g.teacherFeedback && (
                                                    <span className="text-slate-400">Chấm tự động</span>
                                                  )}
                                                </td>
                                                <td className="py-2.5 px-3 text-right text-[11px] text-slate-500 whitespace-nowrap">
                                                  {formatDateTimeVi(g.completedAt || g.lastPlayedAt)}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {filteredStudents.length > PAGE_SIZE && (
              <div className="px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-xs text-slate-600 tabular-nums">
                <div>
                  Hiển thị{" "}
                  <span className="font-semibold text-slate-900">
                    {(studentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(studentPage * PAGE_SIZE, filteredStudents.length)}
                  </span>{" "}
                  trong tổng số{" "}
                  <span className="font-semibold text-slate-900">{filteredStudents.length}</span>{" "}
                  học sinh
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={studentPage <= 1}
                    onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 font-medium disabled:opacity-40"
                  >
                    Trang trước
                  </button>
                  <span className="px-2 font-semibold text-[#003B3A]">
                    {studentPage} / {totalStudentPages}
                  </span>
                  <button
                    type="button"
                    disabled={studentPage >= totalStudentPages}
                    onClick={() => setStudentPage((p) => Math.min(totalStudentPages, p + 1))}
                    className="px-3 py-1 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 font-medium disabled:opacity-40"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function clsLabel(className: string, grade: string, levelName: string): string {
  return `${className} (Khối ${grade} • ${levelName})`;
}
