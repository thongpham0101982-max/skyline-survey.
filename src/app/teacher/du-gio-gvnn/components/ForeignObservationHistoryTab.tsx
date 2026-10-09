"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Search,
  Filter,
  Calendar,
  Building2,
  User,
  Eye,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Award,
  ChevronDown,
  X,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Clock,
  Layers,
  Star,
  Check,
  ClipboardList
} from "lucide-react";
import * as XLSX from "xlsx";
import { IndicatorConfig } from "../client";
import { isSlotBelongsToForeignEsl, isExactWalkthroughForm } from "../utils";
import { TRANSLATIONS, SupportedLang } from "../locales/translations";

interface ForeignObservationHistoryTabProps {
  slots: any[];
  currentTeacher: any;
  academicYears: any[];
  selectedYearId?: string;
  campuses: any[];
  departments: any[];
  indicators: IndicatorConfig[];
  onOpenWalkthroughForm?: () => void;
  showAllForAdmin?: boolean;
  lang?: SupportedLang;
}

const RATING_CONFIG: Record<string, { label: string; shortLabel: string; badgeClass: string; score: number }> = {
  "4": {
    label: "4 - Strong Practice",
    shortLabel: "Strong Practice",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-300",
    score: 4
  },
  "3": {
    label: "3 - Effective",
    shortLabel: "Effective",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    score: 3
  },
  "2": {
    label: "2 - Developing",
    shortLabel: "Developing",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    score: 2
  },
  "1": {
    label: "1 - Need support",
    shortLabel: "Need support",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
    score: 1
  },
  "NO": {
    label: "NO - Not observed",
    shortLabel: "Not observed",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    score: 0
  },
  "N/O": {
    label: "NO - Not observed",
    shortLabel: "Not observed",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    score: 0
  }
};

const OVERALL_RATING_STYLES: Record<string, { label: string; icon: string; badgeClass: string; bgSoft: string }> = {
  "Strong Practice": {
    label: "Strong Practice (Thực hành xuất sắc)",
    icon: "🌟",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-300 ring-1 ring-purple-400/30",
    bgSoft: "bg-purple-50"
  },
  "Effective": {
    label: "Effective (Hiệu quả / Đạt chuẩn)",
    icon: "✨",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/30",
    bgSoft: "bg-emerald-50"
  },
  "Effective Practice": {
    label: "Effective Practice (Hiệu quả / Đạt chuẩn)",
    icon: "✨",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/30",
    bgSoft: "bg-emerald-50"
  },
  "Developing": {
    label: "Developing (Đang phát triển)",
    icon: "📈",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400/30",
    bgSoft: "bg-amber-50"
  },
  "Need support": {
    label: "Need support (Cần hỗ trợ)",
    icon: "⚠️",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-400/30",
    bgSoft: "bg-rose-50"
  },
  "Needs Support": {
    label: "Need support (Cần hỗ trợ)",
    icon: "⚠️",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-400/30",
    bgSoft: "bg-rose-50"
  }
};

export function ForeignObservationHistoryTab({
  slots = [],
  currentTeacher,
  academicYears = [],
  selectedYearId,
  campuses = [],
  departments = [],
  indicators = [],
  onOpenWalkthroughForm,
  showAllForAdmin = false,
  lang = "en"
}: ForeignObservationHistoryTabProps) {
  const t = TRANSLATIONS[lang];
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCampus, setFilterCampus] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [filterRole, setFilterRole] = useState<"all" | "observer" | "host">("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [selectedSlotForModal, setSelectedSlotForModal] = useState<any | null>(null);

  // Base slots: Strictly belonging to category Giáo viên nước ngoài, filtered to the logged-in teacher unless showAllForAdmin
  const baseSlots = useMemo(() => {
    return slots.filter(slot => {
      // 1. MUST belong to category Giáo viên nước ngoài
      if (!isExactWalkthroughForm(slot)) {
        return false;
      }

      // 2. Filter by teacher if not showAllForAdmin
      if (!showAllForAdmin && currentTeacher?.id) {
        const isHost = slot.teacherId === currentTeacher.id;
        const isObserver = (slot.registrations || []).some((r: any) => r.teacherId === currentTeacher.id);
        if (!isHost && !isObserver) return false;
      }

      return true;
    });
  }, [slots, showAllForAdmin, currentTeacher?.id]);

  // Available months from baseSlots
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    baseSlots.forEach(slot => {
      if (!slot.date) return;
      const d = new Date(slot.date);
      if (isNaN(d.getTime())) return;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      months.add(`${y}-${m}`);
    });
    return Array.from(months).sort().reverse();
  }, [baseSlots]);

  // Filter slots
  const filteredSlots = useMemo(() => {
    return baseSlots.filter(slot => {
      // Find evaluation
      const reg = (slot.registrations || [])[0];
      const evaluation = reg?.evaluation;

      // Filter Role
      if (filterRole === "observer") {
        const isObserver = (slot.registrations || []).some((r: any) => r.teacherId === currentTeacher?.id);
        if (!isObserver) return false;
      } else if (filterRole === "host") {
        if (slot.teacherId !== currentTeacher?.id) return false;
      }

      // Filter Campus
      if (filterCampus !== "all") {
        const slotCampus = slot.campusId || slot.teacher?.campusId || "";
        if (slotCampus !== filterCampus) return false;
      }

      // Filter Rating
      if (filterRating !== "all") {
        const r = evaluation?.overallRating || "";
        if (r !== filterRating) return false;
      }

      // Filter Month
      if (filterMonth !== "all") {
        if (!slot.date) return false;
        const d = new Date(slot.date);
        if (isNaN(d.getTime())) return false;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        if (`${y}-${m}` !== filterMonth) return false;
      }

      // Filter Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const teacherName = (slot.teacher?.teacherName || "").toLowerCase();
        const observerName = (reg?.teacher?.teacherName || "").toLowerCase();
        const topic = (slot.topic || "").toLowerCase();
        const className = (slot.className || "").toLowerCase();
        const match = teacherName.includes(q) || observerName.includes(q) || topic.includes(q) || className.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [baseSlots, filterRole, filterCampus, filterRating, filterMonth, searchQuery, currentTeacher?.id]);

  // KPI calculations
  const stats = useMemo(() => {
    let strongCount = 0;
    let effectiveCount = 0;
    let developingCount = 0;
    let needsSupportCount = 0;
    let totalScoreSum = 0;
    let countWithScore = 0;

    filteredSlots.forEach(slot => {
      const reg = (slot.registrations || [])[0];
      const evalObj = reg?.evaluation;
      if (!evalObj) return;

      const rating = evalObj.overallRating || "";
      if (rating.includes("Strong")) strongCount++;
      else if (rating.includes("Effective")) effectiveCount++;
      else if (rating.includes("Developing")) developingCount++;
      else if (rating.includes("Needs Support")) needsSupportCount++;

      if (evalObj.totalScore !== null && evalObj.totalScore !== undefined) {
        totalScoreSum += Number(evalObj.totalScore);
        countWithScore++;
      }
    });

    return {
      total: filteredSlots.length,
      strongCount,
      effectiveCount,
      developingCount,
      needsSupportCount,
      avgScore: countWithScore > 0 ? (totalScoreSum / countWithScore).toFixed(2) : "-"
    };
  }, [filteredSlots]);

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const data = filteredSlots.map((slot, idx) => {
      const reg = (slot.registrations || [])[0];
      const evalObj = reg?.evaluation;
      const slotDate = slot.date ? new Date(slot.date).toLocaleDateString(lang === "en" ? "en-GB" : "vi-VN") : "";
      const campus = slot.campusName || slot.teacher?.campus?.campusName || slot.campusId || "Sky-Line";

      if (lang === "en") {
        return {
          "#": idx + 1,
          "Date": slotDate,
          "Period": slot.startTime || "Period 1",
          "Class": slot.className || "",
          "Campus": campus,
          "Host Teacher": slot.teacher?.teacherName || "",
          "Observer": reg?.teacher?.teacherName || "Current User",
          "Subject": slot.subjectName || "English (ESL)",
          "Lesson / Topic": slot.topic || "",
          "Classroom": slot.room || "",
          "Overall Rating": evalObj?.overallRating || "-",
          "Score": evalObj?.totalScore ?? "-",
          "Key Strengths": evalObj?.strengths || "-",
          "Challenges / Growth Areas": evalObj?.improvements || "-",
          "Agreed Actions": evalObj?.generalComment || "-"
        };
      }

      return {
        "STT": idx + 1,
        "Ngày dự giờ": slotDate,
        "Tiết học": slot.startTime || "Tiết 1",
        "Lớp": slot.className || "",
        "Cơ sở": campus,
        "Giáo viên được dự (Host)": slot.teacher?.teacherName || "",
        "Người dự giờ (Observer)": reg?.teacher?.teacherName || "Current User",
        "Môn học": slot.subjectName || "Tiếng Anh (ESL)",
        "Bài dạy / Chủ đề": slot.topic || "",
        "Phòng học": slot.room || "",
        "Xếp loại": evalObj?.overallRating || "-",
        "Tổng điểm": evalObj?.totalScore ?? "-",
        "Điểm mạnh nổi bật": evalObj?.strengths || "-",
        "Khó khăn trọng tâm": evalObj?.improvements || "-",
        "Hành động thống nhất": evalObj?.generalComment || "-"
      };
    });

    const sheetName = lang === "en" ? "ESL Walkthrough Records" : "Dự giờ GVNN ESL";
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const fileName = lang === "en"
      ? `ESL_Observation_Records_${new Date().toISOString().split("T")[0]}.xlsx`
      : `LuocSu_DuGio_GVNN_ESL_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Summary */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[#003B3A] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>{t.historyBannerBadge}</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-900 border border-sky-300 text-xs font-bold">
              {t.historyBannerSubBadge}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t.historyTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl font-medium">
            {t.historySubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap relative z-10">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-emerald-700/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.exportExcelBtn}</span>
          </button>
          {onOpenWalkthroughForm && (
            <button
              type="button"
              onClick={onOpenWalkthroughForm}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-indigo-700/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t.newObservationBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Mini KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between gap-3 border-t-4 border-t-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-indigo-600" />
              {t.kpiTotalTitle}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[11px] font-black border border-indigo-200">
              ESL Walkthrough
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats.total}</span>
            <span className="text-sm font-bold text-slate-400">{t.kpiTotalUnit}</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {t.kpiAvgScoreLabel} <strong className="text-indigo-700 font-black">{stats.avgScore}</strong>/4.00
          </p>
        </div>

        {/* Card 2: Strong Practice */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between gap-3 border-t-4 border-t-purple-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>🌟</span>
              {t.kpiStrongTitle}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 text-[11px] font-black border border-purple-200">
              {stats.total > 0 ? Math.round((stats.strongCount / stats.total) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-900">{stats.strongCount}</span>
            <span className="text-sm font-bold text-slate-400">{t.kpiStrongUnit}</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {t.kpiStrongDesc}
          </p>
        </div>

        {/* Card 3: Effective */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between gap-3 border-t-4 border-t-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>✨</span>
              {t.kpiEffectiveTitle}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200">
              {stats.total > 0 ? Math.round((stats.effectiveCount / stats.total) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-900">{stats.effectiveCount}</span>
            <span className="text-sm font-bold text-slate-400">{t.kpiEffectiveUnit}</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {t.kpiEffectiveDesc}
          </p>
        </div>

        {/* Card 4: Developing / Needs Support */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between gap-3 border-t-4 border-t-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>📈</span>
              {t.kpiSupportTitle}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-black border border-amber-200">
              {stats.developingCount + stats.needsSupportCount}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-900">
              {stats.developingCount} <span className="text-lg font-bold text-slate-400">/</span> {stats.needsSupportCount}
            </span>
            <span className="text-xs font-bold text-slate-400">{t.kpiSupportUnit}</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {t.kpiSupportDesc}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Role Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setFilterRole("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filterRole === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {lang === "en" ? `All (${baseSlots.length})` : `Tất cả (${baseSlots.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterRole("observer")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                filterRole === "observer" ? "bg-white text-teal-800 shadow-xs" : "text-slate-500 hover:text-teal-800"
              }`}
            >
              <span>{lang === "en" ? "👁️ As Observer" : "👁️ Tôi đi dự"}</span>
              <span className="text-[11px] opacity-75">
                ({baseSlots.filter(s => (s.registrations || []).some((r: any) => r.teacherId === currentTeacher?.id)).length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterRole("host")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                filterRole === "host" ? "bg-white text-indigo-800 shadow-xs" : "text-slate-500 hover:text-indigo-800"
              }`}
            >
              <span>{lang === "en" ? "🏫 As Host Teacher" : "🏫 Tôi được dự"}</span>
              <span className="text-[11px] opacity-75">
                ({baseSlots.filter(s => s.teacherId === currentTeacher?.id).length})
              </span>
            </button>
          </div>
        </div>

        {/* Dropdowns row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
          {/* Campus Filter */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-400">{lang === "en" ? "Campus:" : "Cơ sở:"}</span>
            <select
              value={filterCampus}
              onChange={e => setFilterCampus(e.target.value)}
              className="bg-transparent text-slate-800 font-black outline-none cursor-pointer pr-1"
            >
              <option value="all">{t.allCampuses}</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.campusName || c.campusCode}
                </option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
            <Award className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-slate-400">{lang === "en" ? "Rating:" : "Xếp loại:"}</span>
            <select
              value={filterRating}
              onChange={e => setFilterRating(e.target.value)}
              className="bg-transparent text-slate-800 font-black outline-none cursor-pointer pr-1"
            >
              <option value="all">{t.allRatings}</option>
              <option value="Strong Practice">🌟 Strong Practice</option>
              <option value="Effective">✨ Effective</option>
              <option value="Developing">📈 Developing</option>
              <option value="Needs Support">⚠️ Needs Support</option>
            </select>
          </div>

          {/* Month Filter */}
          {availableMonths.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-slate-400">{lang === "en" ? "Month:" : "Tháng:"}</span>
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="bg-transparent text-slate-800 font-black outline-none cursor-pointer pr-1"
              >
                <option value="all">{lang === "en" ? "Full Academic Year" : "Cả năm học"}</option>
                {availableMonths.map(m => {
                  const [y, mon] = m.split("-");
                  return (
                    <option key={m} value={m}>
                      {lang === "en" ? `Month ${mon}/${y}` : `Tháng ${mon}/${y}`}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {(filterCampus !== "all" || filterRating !== "all" || filterMonth !== "all" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setFilterCampus("all");
                setFilterRating("all");
                setFilterMonth("all");
                setSearchQuery("");
                setFilterRole("all");
              }}
              className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer"
            >
              {t.clearFiltersBtn}
            </button>
          )}

          <span className="ml-auto text-xs font-bold text-slate-400">
            {t.filterResultsCount.replace("%s", String(filteredSlots.length))}
          </span>
        </div>
      </div>

      {/* Main Data Table */}
      {filteredSlots.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-base">{t.emptyRecordsTitle}</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {t.emptyRecordsDesc}
          </p>
          {onOpenWalkthroughForm && (
            <button
              type="button"
              onClick={onOpenWalkthroughForm}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/30 hover:bg-indigo-700 transition cursor-pointer"
            >
              {t.newObservationBtn}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-black uppercase text-[11px] tracking-wider">
                  <th className="p-4 text-center w-12">{t.colNo}</th>
                  <th className="p-4 text-center w-24">{lang === "en" ? "Campus" : "Cơ sở"}</th>
                  <th className="p-4">{t.colHostTeacher}</th>
                  <th className="p-4">{t.colObserver}</th>
                  <th className="p-4">{lang === "en" ? "Lesson Topic & Skills" : "Bài dạy & Kỹ năng"}</th>
                  <th className="p-4">{t.colDatePeriod}</th>
                  <th className="p-4 text-center">{t.colRatingScore}</th>
                  <th className="p-4 text-right">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                {filteredSlots.map((slot, index) => {
                  const reg = (slot.registrations || [])[0];
                  const evalObj = reg?.evaluation;
                  const slotDate = slot.date ? new Date(slot.date) : null;
                  const campusDisplay = slot.campusName || slot.teacher?.campus?.campusName || (campuses.find(c => c.id === slot.campusId)?.campusName) || "Sky-Line";
                  const ratingInfo = OVERALL_RATING_STYLES[evalObj?.overallRating || ""] || {
                    label: evalObj?.overallRating || "Effective",
                    icon: "✨",
                    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
                    bgSoft: "bg-slate-50"
                  };

                  return (
                    <tr
                      key={slot.id}
                      className="hover:bg-indigo-50/20 transition-all duration-200"
                    >
                      {/* TT */}
                      <td className="p-4 text-center font-black text-slate-400">
                        {index + 1}
                      </td>

                      {/* Cơ sở */}
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded-xl bg-sky-50 text-sky-900 border border-sky-200 font-black text-xs inline-block shadow-2xs">
                          {campusDisplay}
                        </span>
                      </td>

                      {/* Giáo viên được dự */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-900 text-xs tracking-tight">
                            {slot.teacher?.teacherName || t.notAssigned}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {slot.teacher?.departmentRel?.name || (lang === "en" ? "English & International Faculty" : "Tổ Tiếng Anh & Quốc tế")}
                          </p>
                        </div>
                      </td>

                      {/* Người dự giờ */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800 text-xs">
                            {reg?.teacher?.teacherName || "Current User"}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {reg?.teacher?.position || (lang === "en" ? "Academic Lead" : "Chuyên môn")}
                          </p>
                        </div>
                      </td>

                      {/* Bài dạy & Kỹ năng */}
                      <td className="p-4">
                        <div className="space-y-1.5 max-w-[280px]">
                          <p className="font-black text-[#003B3A] text-xs leading-snug" title={slot.topic}>
                            {slot.topic || (lang === "en" ? "International English Walkthrough" : "Dự giờ GVNN ESL")}
                          </p>
                          <div className="flex items-center gap-1 flex-wrap text-[10px]">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-bold border border-indigo-200/60">
                              {slot.subjectName || (lang === "en" ? "English (ESL)" : "Tiếng Anh (ESL)")}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 font-bold">
                              {slot.className || "ESL Class"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Thời gian & Lớp */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-800 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {slotDate ? slotDate.toLocaleDateString(lang === "en" ? "en-GB" : "vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""}
                          </p>
                          <p className="text-xs font-bold text-teal-700">
                            {slot.startTime || (lang === "en" ? "Period 1" : "Tiết 1")} • {lang === "en" ? "Room" : "Phòng"} {slot.room || (lang === "en" ? "Classroom" : "học")}
                          </p>
                        </div>
                      </td>

                      {/* Xếp loại & Điểm */}
                      <td className="p-4 text-center">
                        <div className="space-y-1 inline-flex flex-col items-center">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black border inline-flex items-center gap-1 shadow-2xs whitespace-nowrap ${ratingInfo.badgeClass}`}>
                            <span>{ratingInfo.icon}</span>
                            <span>{evalObj?.overallRating || "Effective"}</span>
                          </span>
                          {evalObj?.totalScore !== null && evalObj?.totalScore !== undefined && (
                            <span className="text-[11px] font-bold text-slate-500 block">
                              {lang === "en" ? "Score:" : "Điểm:"} <strong className="text-slate-800 font-black">{evalObj.totalScore}</strong>/4.0
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedSlotForModal(slot)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer border border-indigo-200"
                            title={lang === "en" ? "View walkthrough observation details" : "Xem chi tiết phiếu đánh giá Walkthrough"}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t.viewDetailsBtn}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Xem Chi tiết Phiếu Đánh giá Walkthrough */}
      {selectedSlotForModal && (
        <WalkthroughDetailModal
          slot={selectedSlotForModal}
          indicators={indicators}
          onClose={() => setSelectedSlotForModal(null)}
          campuses={campuses}
          lang={lang}
        />
      )}
    </div>
  );
}

// Sub-component: Modal xem chi tiết phiếu Walkthrough
function WalkthroughDetailModal({
  slot,
  indicators,
  onClose,
  campuses,
  lang = "en"
}: {
  slot: any;
  indicators: IndicatorConfig[];
  onClose: () => void;
  campuses: any[];
  lang?: SupportedLang;
}) {
  const isEn = lang === "en";
  const reg = (slot.registrations || [])[0];
  const evalObj = reg?.evaluation;
  
  // Parse generalComment if JSON
  let parsedGeneral: any = null;
  if (evalObj?.generalComment && typeof evalObj.generalComment === "string" && evalObj.generalComment.startsWith("{")) {
    try {
      parsedGeneral = JSON.parse(evalObj.generalComment);
    } catch {}
  }

  const rawCriterionScores = parsedGeneral?.criterionScores || evalObj?.criteriaScores || [];
  const criteriaScoresMap: Record<string | number, { score?: number; rating: string; evidence?: string; studentImpact?: string }> = {};
  
  if (Array.isArray(rawCriterionScores)) {
    rawCriterionScores.forEach((item: any) => {
      const id = item.criterionId || item.id;
      if (id != null) {
        criteriaScoresMap[id] = {
          score: item.score,
          rating: String(item.rating || (item.score === 4 ? "4" : item.score === 3 ? "3" : item.score === 2 ? "2" : item.score === 1 ? "1" : "NO")),
          evidence: item.evidence || "",
          studentImpact: item.notes || item.studentImpact || ""
        };
      }
    });
  } else if (typeof rawCriterionScores === "object" && rawCriterionScores !== null) {
    Object.entries(rawCriterionScores).forEach(([k, v]: [string, any]) => {
      criteriaScoresMap[k] = {
        rating: v?.rating || "3",
        evidence: v?.evidence || "",
        studentImpact: v?.studentImpact || v?.notes || ""
      };
    });
  }

  const slotDate = slot.date ? new Date(slot.date) : null;
  const campusDisplay = slot.campusName || slot.teacher?.campus?.campusName || (campuses.find((c: any) => c.id === slot.campusId)?.campusName) || "Sky-Line";

  const overallRating = evalObj?.overallRating || parsedGeneral?.overallRatingText || "Effective";
  const ratingInfo = OVERALL_RATING_STYLES[overallRating] || {
    label: overallRating,
    icon: "✨",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
    bgSoft: "bg-slate-50"
  };

  const targetSkills: string[] = parsedGeneral?.targetSkills || [];
  const teacherVoice = parsedGeneral?.teacherVoice || {};
  const summary = parsedGeneral?.summary || {};
  const numberOfStudents = parsedGeneral?.numberOfStudents || "";
  const lessonDuration = parsedGeneral?.lessonDuration || "";
  const subjectName = parsedGeneral?.subjectName || slot.subjectName || "Tiếng Anh (ESL)";

  const sectionsList = [
    {
      key: "A",
      title: isEn
        ? "A. LEARNING ENVIRONMENT & STUDENT ENGAGEMENT"
        : "A. LEARNING ENVIRONMENT & STUDENT ENGAGEMENT / MÔI TRƯỜNG HỌC TẬP & SỰ THAM GIA CỦA HỌC SINH"
    },
    {
      key: "B",
      title: isEn
        ? "B. TEACHING & LEARNING"
        : "B. TEACHING & LEARNING / HOẠT ĐỘNG DẠY VÀ HỌC"
    },
    {
      key: "C",
      title: isEn
        ? "C. DIFFERENTIATION & STUDENT SUPPORT"
        : "C. DIFFERENTIATION & STUDENT SUPPORT / PHÂN HÓA & HỖ TRỢ HỌC SINH"
    },
    {
      key: "D",
      title: isEn
        ? "D. CURRICULUM IMPLEMENTATION"
        : "D. CURRICULUM IMPLEMENTATION / THỰC HIỆN CHƯƠNG TRÌNH"
    },
    {
      key: "E",
      title: isEn
        ? "E. ASSESSMENT & STUDENT PROGRESS"
        : "E. ASSESSMENT & STUDENT PROGRESS / ĐÁNH GIÁ & TIẾN BỘ CỦA HỌC SINH"
    }
  ];

  const handlePrintModal = () => {
    window.print();
  };

  const notRecordedText = isEn ? "— Not recorded —" : "— Chưa ghi nhận —";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-4 border-b border-white/10 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 text-[10px] font-black uppercase tracking-wider">
                SY2026-2027 • Official Walkthrough
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-bold">
                {campusDisplay}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">
              CLASS OBSERVATION & TEACHING SUPPORT FORM
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintModal}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/15"
              title={isEn ? "Print this observation form" : "In phiếu này"}
            >
              <Printer className="w-4 h-4 text-cyan-300" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/15"
              title={isEn ? "Close" : "Đóng"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Guiding Principle Banner */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-950 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block">
                {isEn ? "Observation approach" : "Observation approach / Phương pháp tiếp cận dự giờ"}
              </span>
              <p className="text-xs font-bold italic text-indigo-950">
                {isEn
                  ? "Focus on evidence and impact on students."
                  : "Focus on evidence and impact on students. (Tập trung vào minh chứng thực tế và tác động đến học sinh)."}
              </p>
            </div>
          </div>

          {/* Section 1: Header Form Matrix */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider text-slate-500">
              {isEn ? "Observation Header Information" : "Thông tin buổi dự giờ (Observation Header Information)"}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {isEn ? "Teacher" : "Teacher / Giáo viên"}
                </span>
                <p className="text-xs font-black text-slate-900">
                  {slot.teacher?.teacherName || (isEn ? "Not assigned" : "Chưa gán")}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {slot.teacher?.departmentRel?.name || (isEn ? "English Faculty" : "Tổ Tiếng Anh & Quốc tế")}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {isEn ? "Observer" : "Observer / Người dự"}
                </span>
                <p className="text-xs font-black text-slate-900">{reg?.teacher?.teacherName || "Observer"}</p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {reg?.teacher?.position || (isEn ? "Academic Board" : "Ban Chuyên môn")}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {isEn ? "Subject" : "Subject / Môn học"}
                </span>
                <p className="text-xs font-bold text-slate-800">{subjectName}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {isEn ? "Class" : "Class / Lớp"}
                </span>
                <p className="text-xs font-bold text-slate-800">{slot.className || "ESL"}</p>
              </div>

              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {isEn ? "Date" : "Date / Ngày dự"}
                </span>
                <p className="text-xs font-bold text-slate-800">
                  {slotDate ? slotDate.toLocaleDateString(isEn ? "en-US" : "vi-VN") : "—"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {isEn ? "Lesson / Topic" : "Lesson / Unit"}
                </span>
                <p className="text-xs font-bold text-[#003B3A]">{slot.topic || "Class Observation"}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {isEn ? "No. of students" : "No. of students / Sĩ số"}
                </span>
                <p className="text-xs font-bold text-slate-800">{numberOfStudents || "—"}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {isEn ? "Duration" : "Duration / Thời lượng"}
                </span>
                <p className="text-xs font-bold text-slate-800">{lessonDuration || "45 mins"}</p>
              </div>

              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {isEn ? "Campus" : "Campus / Cơ sở"}
                </span>
                <p className="text-xs font-bold text-slate-800">{campusDisplay}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {isEn ? "Period" : "Period / Tiết dạy"}
                </span>
                <p className="text-xs font-bold text-slate-800">{slot.startTime || "Period 1"}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {isEn ? "Room" : "Room / Phòng học"}
                </span>
                <p className="text-xs font-bold text-slate-800">{slot.room || (isEn ? "Classroom" : "Phòng học")}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {isEn ? "Overall Rating" : "Overall / Xếp loại"}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black border inline-flex items-center gap-1 shadow-xs ${ratingInfo.badgeClass}`}>
                    <span>{ratingInfo.icon}</span>
                    <span>{isEn ? overallRating : ratingInfo.label}</span>
                  </span>
                  {evalObj?.totalScore !== null && evalObj?.totalScore !== undefined && (
                    <span className="text-[11px] font-black text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                      {evalObj.totalScore}/4.00
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Target Skills Tags */}
            {targetSkills.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  {isEn ? "Target Skills:" : "Target Skills / Kỹ năng trọng tâm:"}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {targetSkills.map((sk: string) => (
                    <span key={sk} className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 text-xs font-bold">
                      ✓ {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: 20 Pedagogical Indicators grouped in Sections A-E */}
          <div className="space-y-4">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>
                {isEn
                  ? "Classroom Walkthrough Rubric (20 Indicators)"
                  : "Bảng điểm 20 Tiêu chí Đánh giá & Hỗ trợ Chuyên môn (Rubric Indicators)"}
              </span>
            </h4>

            {sectionsList.map((sec) => {
              const secIndicators = indicators.filter((ind) => ind.section === sec.key);
              if (secIndicators.length === 0) return null;

              return (
                <div key={sec.key} className="space-y-2">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-[#003B3A] font-black text-xs uppercase tracking-wide border border-slate-200 flex items-center justify-between">
                    <span>{sec.title}</span>
                    <span className="text-[10px] text-slate-500 font-bold lowercase">
                      ({secIndicators.length} {isEn ? "indicators" : "tiêu chí"})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {secIndicators.map((ind) => {
                      const scoreData = criteriaScoresMap[ind.id] || criteriaScoresMap[String(ind.id)] || { rating: "3", evidence: "", studentImpact: "" };
                      const ratingCfg = RATING_CONFIG[scoreData.rating] || RATING_CONFIG["3"];

                      return (
                        <div key={ind.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2 hover:border-indigo-300 transition">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-[10px] font-black border border-indigo-200 shrink-0">
                                  #{ind.id}
                                </span>
                                <span className="font-extrabold text-slate-900 text-xs">{ind.text}</span>
                              </div>
                              {!isEn && ind.vnText && (
                                <p className="text-[11px] text-slate-500 font-medium italic pl-7">{ind.vnText}</p>
                              )}
                            </div>

                            <span className={`px-2.5 py-1 rounded-xl text-xs font-black border inline-flex items-center gap-1 shrink-0 self-start sm:self-auto ${ratingCfg.badgeClass}`}>
                              <span>{ratingCfg.label}</span>
                            </span>
                          </div>

                          {(scoreData.evidence || scoreData.studentImpact) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                              {scoreData.evidence && (
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                                  <span className="font-bold text-slate-500 block mb-0.5">
                                    {isEn ? "Recorded Evidence:" : "Minh chứng ghi nhận (Evidence):"}
                                  </span>
                                  <p className="text-slate-800 font-medium">{scoreData.evidence}</p>
                                </div>
                              )}
                              {scoreData.studentImpact && (
                                <div className="bg-teal-50/60 p-2.5 rounded-xl border border-teal-150">
                                  <span className="font-bold text-teal-700 block mb-0.5">
                                    {isEn ? "Student Impact:" : "Tác động lên học sinh (Student Impact):"}
                                  </span>
                                  <p className="text-teal-950 font-medium">{scoreData.studentImpact}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section F: Teacher Voice & Curriculum Feedback */}
          <div className="space-y-3 pt-2">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>
                {isEn
                  ? "Section F: Teacher Voice & Curriculum Feedback"
                  : "Section F: Teacher Voice & Curriculum Feedback / Ý kiến GV & Phản hồi Chương trình"}
              </span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-black text-slate-700 block">
                  1. Did the lesson go as planned? What went well?
                </span>
                <p className="text-xs text-slate-800 font-medium italic whitespace-pre-line">
                  {teacherVoice.reflectionQ1 || teacherVoice.workingWell || notRecordedText}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-black text-slate-700 block">
                  2. What challenges did you or the students face?
                </span>
                <p className="text-xs text-slate-800 font-medium italic whitespace-pre-line">
                  {teacherVoice.reflectionQ2 || teacherVoice.challenges || notRecordedText}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-black text-slate-700 block">
                  3. Is the curriculum pacing realistic for your students?
                </span>
                <p className="text-xs text-slate-800 font-medium italic whitespace-pre-line">
                  {teacherVoice.reflectionQ3 || teacherVoice.curriculumAdjustments || notRecordedText}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-black text-slate-700 block">
                  4. What additional support or resources do you need?
                </span>
                <p className="text-xs text-slate-800 font-medium italic whitespace-pre-line">
                  {teacherVoice.reflectionQ4 || teacherVoice.supportNeeded || notRecordedText}
                </p>
              </div>
            </div>
          </div>

          {/* Section G: Observation Summary & Actions */}
          <div className="space-y-3 pt-2">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-600" />
              <span>
                {isEn
                  ? "Section G: Observation Summary & Action Plan"
                  : "Section G: Observation Summary & Actions / Tổng kết & Hành động tiếp theo"}
              </span>
            </h4>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                <span className="font-black text-emerald-900 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isEn ? "Key strengths observed" : "Key strengths observed / Điểm mạnh nổi bật"}
                  </span>
                </span>
                <p className="text-xs text-emerald-950 font-medium whitespace-pre-line leading-relaxed">
                  {summary.keyStrengths || evalObj?.strengths || notRecordedText}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                <span className="font-black text-amber-900 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>
                    {isEn
                      ? "Key teaching / learning challenges"
                      : "Key teaching / learning challenges / Thách thức dạy & học"}
                  </span>
                </span>
                <p className="text-xs text-amber-950 font-medium whitespace-pre-line leading-relaxed">
                  {summary.keyChallenges || evalObj?.improvements || notRecordedText}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1">
                <span className="font-black text-indigo-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>
                    {isEn
                      ? "Agreed follow-up actions & support"
                      : "Agreed follow-up actions / Kế hoạch hành động thống nhất"}
                  </span>
                </span>
                <p className="text-xs text-indigo-950 font-medium whitespace-pre-line leading-relaxed">
                  {summary.agreedActions || evalObj?.generalComment || notRecordedText}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Signatures */}
          <div className="grid grid-cols-2 gap-4 text-center text-xs mt-6 pt-4 border-t border-slate-200">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-bold uppercase text-slate-900">
                {isEn ? "OBSERVER" : "OBSERVER / NGƯỜI DỰ GIỜ"}
              </p>
              <p className="text-[10px] italic text-slate-500">
                {isEn ? "(Signature & Full Name)" : "(Ký và ghi rõ họ tên)"}
              </p>
              <div className="h-14 flex items-end justify-center font-black text-slate-800">
                {reg?.teacher?.teacherName || "Observer"}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-bold uppercase text-slate-900">
                {isEn ? "HOST TEACHER" : "HOST TEACHER / GIÁO VIÊN ĐƯỢC DỰ"}
              </p>
              <p className="text-[10px] italic text-slate-500">
                {isEn ? "(Signature & Full Name)" : "(Ký và ghi rõ họ tên)"}
              </p>
              <div className="h-14 flex items-end justify-center font-black text-slate-800">
                {slot.teacher?.teacherName || "Teacher"}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">
            {isEn
              ? "CLASS OBSERVATION & TEACHING SUPPORT FORM (SY2026-2027) • Skyline Observation System"
              : "CLASS OBSERVATION & TEACHING SUPPORT FORM (SY2026-2027) • Hệ thống Đánh giá Skyline"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintModal}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isEn ? "Print Form" : "In phiếu"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              {isEn ? "Close" : "Đóng"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
