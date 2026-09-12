"use client";

import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
  GraduationCap,
  Eye,
  Star,
  Layers,
  Sparkles,
  School,
  TrendingUp,
  User,
  Clock,
  Check,
  ChevronDown
} from "lucide-react";
import * as XLSX from "xlsx";
import { getSlotCategoryInfo } from "../client";

export interface MonthlyTeacherStatItem {
  monthKey: string;
  monthStr: string;
  year: number;
  month: number;
  taughtCount: number;
  totalTaughtSlots: number;
  observedCount: number;
  totalObservedSlots: number;
  pendingObservedCount: number;
  avgScore: string | null;
  receivedEvalCount: number;
  surpriseTaughtCount?: number;
  surpriseObservedCount?: number;
}

interface TeacherObservationReportTabProps {
  currentTeacher: any;
  academicYearName: string;
  personalSlots: any[];
  myTaughtSlots: any[];
  myObservedSlots: any[];
  myTaughtCount: number;
  myObservedCount: number;
  taughtTarget: number;
  obsTarget: number;
  avgScore?: string | number | null;
  totalReceivedEvalCount: number;
  myPendingEvaluationsCount: number;
  monthlyStatsList?: MonthlyTeacherStatItem[];
  availableMonths?: string[];
  isPreschool?: boolean;
}

export function TeacherObservationReportTab({
  currentTeacher,
  academicYearName,
  personalSlots = [],
  myTaughtSlots = [],
  myObservedSlots = [],
  myTaughtCount = 0,
  myObservedCount = 0,
  taughtTarget = 2,
  obsTarget = 10,
  avgScore = null,
  totalReceivedEvalCount = 0,
  myPendingEvaluationsCount = 0,
  monthlyStatsList = [],
  availableMonths = [],
  isPreschool = false
}: TeacherObservationReportTabProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | "MAM_NON" | "K12" | "GVNN_ESL">("ALL");

  // Filter slots based on selected month & category
  const filteredTaughtSlots = useMemo(() => {
    return myTaughtSlots.filter(slot => {
      if (selectedMonth !== "all") {
        if (!slot.date) return false;
        const d = new Date(slot.date);
        if (isNaN(d.getTime())) return false;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        if (`${y}-${m}` !== selectedMonth) return false;
      }
      if (selectedCategory !== "ALL") {
        const cat = getSlotCategoryInfo(slot);
        if (cat.key !== selectedCategory) return false;
      }
      return true;
    });
  }, [myTaughtSlots, selectedMonth, selectedCategory]);

  const filteredObservedSlots = useMemo(() => {
    return myObservedSlots.filter(slot => {
      if (selectedMonth !== "all") {
        if (!slot.date) return false;
        const d = new Date(slot.date);
        if (isNaN(d.getTime())) return false;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        if (`${y}-${m}` !== selectedMonth) return false;
      }
      if (selectedCategory !== "ALL") {
        const cat = getSlotCategoryInfo(slot);
        if (cat.key !== selectedCategory) return false;
      }
      return true;
    });
  }, [myObservedSlots, selectedMonth, selectedCategory]);

  // Breakdown statistics across the 3 categories
  const categoryBreakdown = useMemo(() => {
    const res = {
      mamNonTaught: 0,
      mamNonObserved: 0,
      k12Taught: 0,
      k12Observed: 0,
      eslTaught: 0,
      eslObserved: 0,
      surpriseTaught: 0,
      surpriseObserved: 0,
      planTaught: 0,
      planObserved: 0
    };

    myTaughtSlots.forEach(slot => {
      const isSurprise = slot.requestOrigin === "SURPRISE" || slot.requestOrigin === "MANAGEMENT_SURPRISE";
      const hasEval = (slot.registrations || []).some((r: any) => r.isApproved && r.evaluation && r.evaluation.reEvaluationStatus !== "DRAFT");
      if (!hasEval) return;
      const weight = slot.isDoublePeriod ? 2 : 1;
      const cat = getSlotCategoryInfo(slot);
      if (cat.key === "MAM_NON") res.mamNonTaught += weight;
      else if (cat.key === "GVNN_ESL") res.eslTaught += weight;
      else res.k12Taught += weight;

      if (isSurprise) res.surpriseTaught += weight;
      else res.planTaught += weight;
    });

    myObservedSlots.forEach(slot => {
      const isSurprise = slot.requestOrigin === "SURPRISE" || slot.requestOrigin === "MANAGEMENT_SURPRISE";
      const myReg = (slot.registrations || []).find((r: any) => r.teacherId === currentTeacher?.id);
      if (!myReg || !myReg.isApproved || !myReg.evaluation || myReg.evaluation.reEvaluationStatus === "DRAFT") return;
      const weight = slot.isDoublePeriod ? 2 : 1;
      const cat = getSlotCategoryInfo(slot);
      if (cat.key === "MAM_NON") res.mamNonObserved += weight;
      else if (cat.key === "GVNN_ESL") res.eslObserved += weight;
      else res.k12Observed += weight;

      if (isSurprise) res.surpriseObserved += weight;
      else res.planObserved += weight;
    });

    return res;
  }, [myTaughtSlots, myObservedSlots, currentTeacher?.id]);

  const taughtProgress = taughtTarget > 0 ? Math.min(100, Math.round((myTaughtCount / taughtTarget) * 100)) : 0;
  const obsProgress = obsTarget > 0 ? Math.min(100, Math.round((myObservedCount / obsTarget) * 100)) : 0;

  const numAvgScore = avgScore ? Number(avgScore) : null;
  const maxScore = isPreschool ? 10 : 20;

  const scoreRating = numAvgScore
    ? numAvgScore >= (isPreschool ? 9 : 17)
      ? "Xuất sắc"
      : numAvgScore >= (isPreschool ? 8 : 14)
      ? "Tốt"
      : numAvgScore >= (isPreschool ? 7 : 10)
      ? "Đạt"
      : "Chưa đạt"
    : "Chưa có";

  // Handle Export Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Tổng quan
    const overviewData = [
      ["BÁO CÁO THỐNG KÊ DỰ GIỜ & TIẾT DẠY CỦA GIÁO VIÊN"],
      [`Họ và tên: ${currentTeacher?.teacherName || ""}`, `Mã GV: ${currentTeacher?.teacherCode || ""}`],
      [`Tổ chuyên môn: ${currentTeacher?.departmentRel?.name || ""}`, `Năm học: ${academicYearName || ""}`],
      [],
      ["CHỈ TIÊU & TIẾN ĐỘ THỰC HIỆN"],
      ["Hạng mục", "Thực tế đạt", "Chỉ tiêu giao", "Tỷ lệ hoàn thành", "Mầm non", "Phổ thông K-12", "GVNN (ESL)", "Kế hoạch", "Đột xuất"],
      [
        "Tiết trực tiếp giảng dạy",
        myTaughtCount,
        taughtTarget,
        `${taughtProgress}%`,
        categoryBreakdown.mamNonTaught,
        categoryBreakdown.k12Taught,
        categoryBreakdown.eslTaught,
        categoryBreakdown.planTaught,
        categoryBreakdown.surpriseTaught
      ],
      [
        "Tiết tham gia dự giờ",
        myObservedCount,
        obsTarget,
        `${obsProgress}%`,
        categoryBreakdown.mamNonObserved,
        categoryBreakdown.k12Observed,
        categoryBreakdown.eslObserved,
        categoryBreakdown.planObserved,
        categoryBreakdown.surpriseObserved
      ],
      [],
      ["ĐÁNH GIÁ CHẤT LƯỢNG"],
      ["Điểm trung bình nhận được", numAvgScore !== null ? `${numAvgScore.toFixed(2)}/${maxScore}đ` : "Chưa có"],
      ["Xếp loại chất lượng tiết dạy", scoreRating],
      ["Số phiếu nhận xét nhận được", totalReceivedEvalCount],
      ["Số phiếu dự giờ chưa nộp", myPendingEvaluationsCount]
    ];
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, wsOverview, "Tổng quan");

    // Sheet 2: Chi tiết tiết dạy
    const taughtRows = filteredTaughtSlots.map((slot, idx) => {
      const cat = getSlotCategoryInfo(slot);
      const isSurprise = slot.requestOrigin === "SURPRISE" || slot.requestOrigin === "MANAGEMENT_SURPRISE";
      const evals = (slot.registrations || []).filter((r: any) => r.evaluation).map((r: any) => r.evaluation);
      const avg = evals.length > 0 ? (evals.reduce((a: number, b: any) => a + (b.totalScore || 0), 0) / evals.length).toFixed(2) : "-";

      return {
        STT: idx + 1,
        "Ngày dạy": slot.date ? new Date(slot.date).toLocaleDateString("vi-VN") : "",
        "Tiết": slot.startTime || "",
        "Lớp": slot.className || "",
        "Cơ sở": slot.campusName || slot.campusId || "",
        "Môn học": slot.subjectName || "",
        "Tên bài dạy / Chủ đề": slot.topic || "",
        "Danh mục": cat.label,
        "Hình thức": isSurprise ? "Đột xuất" : "Kế hoạch",
        "Tiết đôi": slot.isDoublePeriod ? "Có (x2)" : "Không",
        "Số người dự": (slot.registrations || []).length,
        "Điểm TB": avg,
        "Trạng thái": evals.length > 0 ? "Đã có đánh giá" : "Chưa có đánh giá"
      };
    });
    const wsTaught = XLSX.utils.json_to_sheet(taughtRows);
    XLSX.utils.book_append_sheet(wb, wsTaught, "Tiết dạy của tôi");

    // Sheet 3: Chi tiết tiết đi dự
    const observedRows = filteredObservedSlots.map((slot, idx) => {
      const cat = getSlotCategoryInfo(slot);
      const isSurprise = slot.requestOrigin === "SURPRISE" || slot.requestOrigin === "MANAGEMENT_SURPRISE";
      const myReg = (slot.registrations || []).find((r: any) => r.teacherId === currentTeacher?.id);
      const score = myReg?.evaluation?.totalScore !== null && myReg?.evaluation?.totalScore !== undefined ? myReg.evaluation.totalScore : "-";

      return {
        STT: idx + 1,
        "Ngày dự": slot.date ? new Date(slot.date).toLocaleDateString("vi-VN") : "",
        "Tiết": slot.startTime || "",
        "Lớp": slot.className || "",
        "Cơ sở": slot.campusName || slot.campusId || "",
        "Giáo viên dạy": slot.teacher?.teacherName || "",
        "Môn học": slot.subjectName || "",
        "Tên bài dạy / Chủ đề": slot.topic || "",
        "Danh mục": cat.label,
        "Hình thức": isSurprise ? "Đột xuất" : "Kế hoạch",
        "Điểm đã chấm": score,
        "Xếp loại": myReg?.evaluation?.overallRating || "-",
        "Nhận xét chung": myReg?.evaluation?.generalComment || myReg?.evaluation?.strengths || "-",
        "Trạng thái phiếu": myReg?.evaluation ? "Đã nộp phiếu" : "Chưa nộp phiếu"
      };
    });
    const wsObserved = XLSX.utils.json_to_sheet(observedRows);
    XLSX.utils.book_append_sheet(wb, wsObserved, "Tiết tôi đi dự");

    const teacherCode = currentTeacher?.teacherCode || "GV";
    XLSX.writeFile(wb, `BaoCao_DuGio_${teacherCode}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Printable Report Header (visible on print or screen) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="space-y-3 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[#003B3A] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Báo cáo dự giờ & tiết dạy</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-300 text-xs font-bold">
              {academicYearName || "Năm học 2026-2027"}
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#003B3A] tracking-tight">
              Báo Cáo Thống Kê Hoạt Động Chuyên Môn Giáo Viên
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Thống kê đầy đủ tiết trực tiếp giảng dạy và tiết tham gia dự giờ xuyên suốt 3 danh mục: Mầm non, Phổ thông K-12, và GVNN (ESL).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs font-semibold text-slate-600 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600" />
              <span>Giáo viên: <strong className="text-slate-900">{currentTeacher?.teacherName}</strong> ({currentTeacher?.teacherCode})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-teal-600" />
              <span>Tổ CM: <strong className="text-slate-900">{currentTeacher?.departmentRel?.name || "Tổ chuyên môn"}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>Cơ sở: <strong className="text-slate-900">{currentTeacher?.campus?.campusName || "Sky-Line"}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 self-start md:self-center print:hidden">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-emerald-700/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#002d2c] text-white font-black text-xs flex items-center gap-2 shadow-md shadow-teal-900/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Printer className="w-4 h-4 text-cyan-300" />
            <span>In Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tiết Giảng Dạy */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between gap-3 border-t-4 border-t-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-amber-600" />
              Tiết Giảng Dạy
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${taughtProgress >= 100 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              {taughtProgress}% chỉ tiêu
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{myTaughtCount}</span>
            <span className="text-sm font-bold text-slate-400">/ {taughtTarget} tiết</span>
            {myTaughtCount >= taughtTarget && (
              <span className="ml-auto text-emerald-600 text-xs font-black flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Đạt
              </span>
            )}
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${taughtProgress}%` }} />
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-bold border border-amber-200">
              🍼 MN: {categoryBreakdown.mamNonTaught}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 font-bold border border-emerald-200">
              🏫 K12: {categoryBreakdown.k12Taught}
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-900 font-bold border border-sky-200">
              🌐 ESL: {categoryBreakdown.eslTaught}
            </span>
            <span className="text-slate-400 font-bold">•</span>
            <span className="text-slate-500 font-semibold">{categoryBreakdown.surpriseTaught} ĐX</span>
          </div>
        </div>

        {/* Card 2: Tiết Đi Dự Giờ */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between gap-3 border-t-4 border-t-teal-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-teal-600" />
              Tiết Đi Dự Giờ
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${obsProgress >= 100 ? "bg-emerald-100 text-emerald-800" : "bg-teal-100 text-teal-800"}`}>
              {obsProgress}% chỉ tiêu
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{myObservedCount}</span>
            <span className="text-sm font-bold text-slate-400">/ {obsTarget} tiết</span>
            {myObservedCount >= obsTarget && (
              <span className="ml-auto text-emerald-600 text-xs font-black flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Đạt
              </span>
            )}
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div className="bg-teal-600 h-full rounded-full transition-all duration-500" style={{ width: `${obsProgress}%` }} />
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-bold border border-amber-200">
              🍼 MN: {categoryBreakdown.mamNonObserved}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 font-bold border border-emerald-200">
              🏫 K12: {categoryBreakdown.k12Observed}
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-900 font-bold border border-sky-200">
              🌐 ESL: {categoryBreakdown.eslObserved}
            </span>
            <span className="text-slate-400 font-bold">•</span>
            <span className="text-slate-500 font-semibold">{categoryBreakdown.surpriseObserved} ĐX</span>
          </div>
        </div>

        {/* Card 3: Điểm TB Nhận Được */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between gap-3 border-t-4 border-t-violet-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-4 h-4 text-violet-600" />
              Điểm TB Nhận Được
            </span>
            <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-black">
              {scoreRating}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {numAvgScore !== null ? numAvgScore.toFixed(2) : "---"}
            </span>
            <span className="text-sm font-bold text-slate-400">/ {maxScore}.00đ</span>
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-violet-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${numAvgScore ? Math.min(100, Math.round((numAvgScore / maxScore) * 100)) : 0}%` }}
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
            <span>Tổng cộng: <strong>{totalReceivedEvalCount}</strong> phiếu nhận</span>
            <span>Thang: {maxScore}.0đ</span>
          </div>
        </div>

        {/* Card 4: Trách Nhiệm Đánh Giá (Phiếu Dự Giờ) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between gap-3 border-t-4 border-t-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-rose-600" />
              Trách Nhiệm Nộp Phiếu
            </span>
            {myPendingEvaluationsCount === 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                Hoàn tất
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black animate-pulse">
                Thiếu {myPendingEvaluationsCount}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {myObservedSlots.filter(s => {
                const reg = (s.registrations || []).find((r: any) => r.teacherId === currentTeacher?.id);
                return reg && reg.evaluation;
              }).length}
            </span>
            <span className="text-sm font-bold text-slate-400">/ {myObservedSlots.length} phiếu đã dự</span>
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${myObservedSlots.length > 0 ? Math.round(((myObservedSlots.length - myPendingEvaluationsCount) / myObservedSlots.length) * 100) : 100}%`
              }}
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            {myPendingEvaluationsCount > 0 ? (
              <span className="text-rose-600 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Có {myPendingEvaluationsCount} tiết chưa nộp phiếu!
              </span>
            ) : (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Đã nộp 100% phiếu dự giờ
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar for Details */}
      <div className="bg-slate-100/80 p-3 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-xs font-bold text-slate-500">Danh mục:</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as any)}
              className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="ALL">🌟 Tất cả danh mục</option>
              <option value="K12">🏫 Dự giờ đánh giá Giáo viên</option>
              <option value="MAM_NON">🍼 Dự giờ đánh giá Mầm non</option>
              <option value="GVNN_ESL">🌐 Dự giờ GVNN (ESL)</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-xs font-bold text-slate-500">Xem tháng:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="all">🌟 Cả năm học ({academicYearName || "2026-2027"})</option>
              {availableMonths.map(m => {
                if (!m || typeof m !== "string" || !m.includes("-")) return null;
                const [y, mon] = m.split("-");
                return (
                  <option key={m} value={m}>
                    📅 Tháng {mon}/{y}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-500">
          Hiển thị: <strong className="text-slate-800">{filteredTaughtSlots.length}</strong> tiết dạy • <strong className="text-slate-800">{filteredObservedSlots.length}</strong> tiết dự
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      {monthlyStatsList.length > 0 && selectedMonth === "all" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black border border-teal-200">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">
                Bảng Tiến Độ Dự Giờ & Tiết Dạy Theo Tháng Trong Năm Học
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {monthlyStatsList.length} tháng
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black uppercase text-[10.5px]">
                  <th className="p-3 text-center w-12">TT</th>
                  <th className="p-3">Tháng</th>
                  <th className="p-3 text-center">Tiết Dạy (Có ĐG)</th>
                  <th className="p-3 text-center">Tiết Dự (Đã nộp)</th>
                  <th className="p-3 text-center">Phiếu nợ</th>
                  <th className="p-3 text-center">Điểm TB Dạy</th>
                  <th className="p-3 text-center">Trạng thái tháng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {monthlyStatsList.map((st, idx) => {
                  const hasActivity = st.taughtCount > 0 || st.observedCount > 0;
                  return (
                    <tr key={st.monthKey} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{st.monthStr}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-black ${st.taughtCount > 0 ? "bg-amber-100 text-amber-900" : "text-slate-400"}`}>
                          {st.taughtCount} tiết
                          {st.surpriseTaughtCount ? ` (${st.surpriseTaughtCount} ĐX)` : ""}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-black ${st.observedCount > 0 ? "bg-teal-100 text-teal-900" : "text-slate-400"}`}>
                          {st.observedCount} tiết
                          {st.surpriseObservedCount ? ` (${st.surpriseObservedCount} ĐX)` : ""}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {st.pendingObservedCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black text-[10px] animate-pulse">
                            {st.pendingObservedCount} chưa nộp
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-bold">
                        {st.avgScore ? `${st.avgScore}đ` : <span className="text-slate-400">-</span>}
                      </td>
                      <td className="p-3 text-center">
                        {hasActivity ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-black">
                            Đã tham gia
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Chưa có tiết</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section: Chi tiết các tiết giảng dạy */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4 border-t-4 border-t-amber-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-black border border-amber-200">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-[#003B3A] text-sm uppercase tracking-wider">
                Danh Sách Tiết Giảng Dạy Của Tôi ({filteredTaughtSlots.length} tiết)
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Bao gồm các tiết mở ở Mầm non, Phổ thông K-12, và GVNN (ESL)
              </p>
            </div>
          </div>
        </div>

        {filteredTaughtSlots.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            Không có tiết giảng dạy nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-amber-50/70 border-b border-amber-200 text-amber-950 font-black uppercase text-[10.5px]">
                  <th className="p-3.5 text-center w-12">TT</th>
                  <th className="p-3.5">Ngày & Tiết</th>
                  <th className="p-3.5">Lớp & Cơ sở</th>
                  <th className="p-3.5">Môn học & Tên bài dạy / Chủ đề</th>
                  <th className="p-3.5 text-center">Danh mục</th>
                  <th className="p-3.5 text-center">Hình thức</th>
                  <th className="p-3.5 text-center">Người dự</th>
                  <th className="p-3.5 text-center">Điểm TB</th>
                  <th className="p-3.5 text-center">Đánh giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 font-semibold text-slate-700">
                {filteredTaughtSlots.map((slot, idx) => {
                  const cat = getSlotCategoryInfo(slot);
                  const isSurprise = slot.requestOrigin === "SURPRISE" || slot.requestOrigin === "MANAGEMENT_SURPRISE";
                  const evals = (slot.registrations || []).filter((r: any) => r.evaluation).map((r: any) => r.evaluation);
                  const avg = evals.length > 0 ? (evals.reduce((a: number, b: any) => a + (b.totalScore || 0), 0) / evals.length).toFixed(2) : null;

                  return (
                    <tr key={slot.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 text-center font-black text-slate-400">{idx + 1}</td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">
                          {slot.date ? new Date(slot.date).toLocaleDateString("vi-VN") : ""}
                        </p>
                        <p className="text-[11px] text-teal-700 font-bold">{slot.startTime}</p>
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-800">Lớp {slot.className || "Chưa xếp"}</p>
                        <p className="text-[11px] text-slate-500">{slot.campusName || "Sky-Line"}</p>
                      </td>
                      <td className="p-3.5">
                        <p className="font-black text-[#003B3A] text-xs">{slot.topic}</p>
                        <p className="text-[11px] text-teal-700 font-bold">{slot.subjectName}</p>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${cat.badgeClass}`}>
                          {cat.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {isSurprise ? (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black">
                            ⚡ Đột xuất
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                            Kế hoạch
                          </span>
                        )}
                        {slot.isDoublePeriod && (
                          <span className="block mt-0.5 text-[9px] text-amber-800 font-bold">Tiết đôi (x2)</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        {(slot.registrations || []).length} người
                      </td>
                      <td className="p-3.5 text-center font-black text-slate-900">
                        {avg ? `${avg}đ` : <span className="text-slate-400 font-normal">Chưa có</span>}
                      </td>
                      <td className="p-3.5 text-center">
                        {evals.length > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                            Đã đánh giá ({evals.length} phiếu)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                            Chờ đánh giá
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section: Chi tiết các tiết đi dự giờ */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4 border-t-4 border-t-teal-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-black border border-teal-200">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-[#003B3A] text-sm uppercase tracking-wider">
                Danh Sách Tiết Tôi Đi Dự Giờ ({filteredObservedSlots.length} tiết)
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Bao gồm các tiết tham gia dự giờ ở Mầm non, Phổ thông K-12, và GVNN (ESL)
              </p>
            </div>
          </div>
        </div>

        {filteredObservedSlots.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            Không có tiết dự giờ nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-teal-50/70 border-b border-teal-200 text-teal-950 font-black uppercase text-[10.5px]">
                  <th className="p-3.5 text-center w-12">TT</th>
                  <th className="p-3.5">Ngày & Tiết</th>
                  <th className="p-3.5">Giáo viên dạy</th>
                  <th className="p-3.5">Môn & Bài dạy</th>
                  <th className="p-3.5 text-center">Danh mục</th>
                  <th className="p-3.5 text-center">Hình thức</th>
                  <th className="p-3.5 text-center">Điểm chấm</th>
                  <th className="p-3.5">Nhận xét chung</th>
                  <th className="p-3.5 text-center">Trạng thái phiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 font-semibold text-slate-700">
                {filteredObservedSlots.map((slot, idx) => {
                  const cat = getSlotCategoryInfo(slot);
                  const isSurprise = slot.requestOrigin === "SURPRISE" || slot.requestOrigin === "MANAGEMENT_SURPRISE";
                  const myReg = (slot.registrations || []).find((r: any) => r.teacherId === currentTeacher?.id);
                  const evalObj = myReg?.evaluation;

                  return (
                    <tr key={slot.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 text-center font-black text-slate-400">{idx + 1}</td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">
                          {slot.date ? new Date(slot.date).toLocaleDateString("vi-VN") : ""}
                        </p>
                        <p className="text-[11px] text-teal-700 font-bold">{slot.startTime}</p>
                      </td>
                      <td className="p-3.5">
                        <p className="font-black text-slate-800">{slot.teacher?.teacherName || "Giáo viên"}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{slot.teacher?.teacherCode}</p>
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-[#003B3A] text-xs">{slot.topic}</p>
                        <p className="text-[11px] text-slate-500">Lớp {slot.className} • {slot.subjectName}</p>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${cat.badgeClass}`}>
                          {cat.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {isSurprise ? (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black">
                            ⚡ Đột xuất
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                            Kế hoạch
                          </span>
                        )}
                        {slot.isDoublePeriod && (
                          <span className="block mt-0.5 text-[9px] text-amber-800 font-bold">Tiết đôi (x2)</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-black text-slate-900">
                        {evalObj?.totalScore !== null && evalObj?.totalScore !== undefined ? (
                          <span>{evalObj.totalScore}đ</span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>
                      <td className="p-3.5 max-w-[240px] truncate text-[11px] text-slate-600">
                        {evalObj?.generalComment || evalObj?.strengths || <span className="text-slate-400 italic">Chưa có nhận xét</span>}
                      </td>
                      <td className="p-3.5 text-center">
                        {evalObj ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Đã nộp phiếu
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black animate-pulse inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Chưa nộp phiếu
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
