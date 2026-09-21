/* eslint-disable */
"use client";

import React, { useState, useMemo } from "react";
import {
  Printer, FileSpreadsheet, Search, Calendar, Award,
  AlertCircle, User, Building2,
  BookOpen, ThumbsUp, MessageSquare, Star, X
} from "lucide-react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { isExactWalkthroughForm } from "@/app/teacher/du-gio-gvnn/utils";

interface DetailedStatementViewProps {
  initialSlots: any[];
  teachers: any[];
  departments: any[];
  campuses: any[];
  academicYears?: any[];
  selectedYearId?: string;
  currentTeacher?: any;
  isTTCM: boolean;
  isSuperAdmin: boolean;
  isHeadOfAcademic?: boolean;
  isTBP?: boolean;
  isGDCS?: boolean;
  preSelectedTeacherId?: string | null;
  onSelectTeacher?: (id: string) => void;
  openEvalModal?: (reg: any) => void;
}

function getSlotCategory(slot: any): "PHO_THONG" | "MAM_NON" | "GVNN" {
  if (
    slot.requestOrigin === "FOREIGN_WALKTHROUGH" ||
    isExactWalkthroughForm(slot) ||
    (slot.subjectName || "").includes("ESL") ||
    (slot.subjectName || "").toLowerCase().includes("tiếng anh (esl)") ||
    (slot.topic || "").toLowerCase().includes("foreign") ||
    (slot.description || "").toLowerCase().includes("dự giờ gvnn")
  ) {
    return "GVNN";
  }

  if (
    slot.level === "Mầm non" ||
    (slot.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non")
  ) {
    return "MAM_NON";
  }

  return "PHO_THONG";
}

function formatVNDate(d?: Date | string | null) {
  if (!d) return "";
  try {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleDateString("vi-VN");
  } catch {
    return String(d);
  }
}
export function DetailedStatementView({
  initialSlots,
  teachers,
  departments,
  campuses,
  academicYears,
  selectedYearId,
  currentTeacher,
  isTTCM,
  isSuperAdmin,
  isHeadOfAcademic,
  isTBP,
  isGDCS,
  preSelectedTeacherId,
  onSelectTeacher,
  openEvalModal
}: DetailedStatementViewProps) {
  const defaultTeacherId = preSelectedTeacherId || (isTTCM && currentTeacher?.id ? currentTeacher.id : teachers[0]?.id || "");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(defaultTeacherId);
  const [teacherSearch, setTeacherSearch] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCampusId, setSelectedCampusId] = useState<string>("all");

  React.useEffect(() => {
    if (preSelectedTeacherId) {
      setSelectedTeacherId(preSelectedTeacherId);
    }
  }, [preSelectedTeacherId]);

  const selectedTeacher = useMemo(() => {
    return teachers.find((t: any) => t.id === selectedTeacherId) || teachers[0] || null;
  }, [teachers, selectedTeacherId]);

  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return teachers;
    const q = teacherSearch.toLowerCase();
    return teachers.filter(
      (t: any) =>
        t.teacherName?.toLowerCase().includes(q) ||
        t.teacherCode?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
    );
  }, [teachers, teacherSearch]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    initialSlots.forEach(slot => {
      if (slot.date) {
        const d = new Date(slot.date);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          months.add(`${yyyy}-${mm}`);
        }
      }
    });
    return Array.from(months).sort().reverse();
  }, [initialSlots]);

  const reqTaught = selectedTeacher?.requiredTaught || 0;
  const reqObserved = selectedTeacher?.requiredObserved || 0;

  const homeCampusName = selectedTeacher?.campus?.campusName ||
    campuses.find((c: any) => c.id === selectedTeacher?.campusId)?.campusName || "Cơ sở Sky-Line";

  const teacherSlots = useMemo(() => {
    if (!selectedTeacher) return [];
    return initialSlots.filter(slot => {
      const isHost = slot.teacherId === selectedTeacher.id;
      const isObserver = (slot.registrations || []).some((r: any) => r.teacherId === selectedTeacher.id);
      if (!isHost && !isObserver) return false;

      if (selectedMonth !== "all") {
        if (!slot.date) return false;
        const d = new Date(slot.date);
        if (isNaN(d.getTime())) return false;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        if (`${yyyy}-${mm}` !== selectedMonth) return false;
      }

      if (selectedCampusId !== "all") {
        const slotCampus = slot.campusId || slot.teacher?.campusId;
        if (slotCampus !== selectedCampusId) return false;
      }

      if (selectedCategory !== "all") {
        const cat = getSlotCategory(slot);
        if (cat !== selectedCategory) return false;
      }

      return true;
    });
  }, [initialSlots, selectedTeacher, selectedMonth, selectedCampusId, selectedCategory]);
  const {
    taughtValidCount,
    observedValidCount,
    taughtSurpriseCount,
    observedSurpriseCount,
    taughtPhoThong,
    taughtMamNon,
    taughtGVNN,
    observedPhoThong,
    observedMamNon,
    observedGVNN,
    internalObserved,
    crossObserved,
    campusDistribution,
    ledgerRows,
    evaluationList
  } = useMemo(() => {
    let tValid = 0;
    let oValid = 0;
    let tSurprise = 0;
    let oSurprise = 0;

    let tPT = 0;
    let tMN = 0;
    let tESL = 0;

    let oPT = 0;
    let oMN = 0;
    let oESL = 0;

    let intObs = 0;
    let crsObs = 0;
    const campusDist: Record<string, number> = {};

    const rows: any[] = [];
    const evals: any[] = [];

    teacherSlots.forEach(slot => {
      const cat = getSlotCategory(slot);
      const catLabel = cat === "PHO_THONG" ? "Khối Phổ thông" : cat === "MAM_NON" ? "Khối Mầm non" : "GV Nước ngoài";
      const increment = slot.isDoublePeriod ? 2 : 1;
      const isSurprise = slot.requestOrigin === "PRESCHOOL_SURPRISE" || (slot.description || "").toLowerCase().includes("đột xuất");
      const slotCampus = slot.campusName || slot.teacher?.campus?.campusName || homeCampusName;

      // TEACHER IS HOST
      if (slot.teacherId === selectedTeacher?.id) {
        const approvedRegs = (slot.registrations || []).filter((r: any) => r.isApproved || isSurprise);
        const completedEvaluations = approvedRegs.filter((r: any) => r.evaluation && r.evaluation.reEvaluationStatus !== "DRAFT");
        const isValid = completedEvaluations.length > 0;

        if (isValid) {
          tValid += increment;
          if (isSurprise) tSurprise += increment;
          if (cat === "PHO_THONG") tPT += increment;
          else if (cat === "MAM_NON") tMN += increment;
          else tESL += increment;
        }

        const observerNames = approvedRegs.map((r: any) => r.teacher?.teacherName).filter(Boolean).join(", ") || "Chưa có người dự";
        const ratings = completedEvaluations.map((r: any) => r.evaluation.overallRating || "Đạt").join(", ");
        const avgScore = completedEvaluations.length > 0
          ? (completedEvaluations.reduce((sum: number, r: any) => sum + (r.evaluation.totalScore || 0), 0) / completedEvaluations.length).toFixed(1)
          : null;

        completedEvaluations.forEach((r: any) => {
          evals.push({
            slotId: slot.id,
            date: formatVNDate(slot.date),
            rawDate: slot.date,
            topic: slot.topic,
            subject: slot.subjectName,
            className: slot.className || `${slot.grade || ""}`,
            evaluatorName: r.teacher?.teacherName || "Người dự",
            evaluatorPosition: r.teacher?.position || "TTCM / GV",
            totalScore: r.evaluation.totalScore,
            overallRating: r.evaluation.overallRating || "Đạt",
            strengths: r.evaluation.strengths || "",
            improvements: r.evaluation.improvements || "",
            generalComment: r.evaluation.generalComment || "",
            teacherFeedback: r.evaluation.teacherFeedback || "",
            catLabel,
            registration: r
          });
        });

        rows.push({
          id: `host-${slot.id}`,
          date: formatVNDate(slot.date),
          rawDate: slot.date,
          category: cat,
          categoryLabel: catLabel,
          role: "DẠY",
          periodCount: increment,
          isSurprise,
          subject: slot.subjectName,
          className: slot.className || `${slot.grade || ""}`,
          topic: slot.topic,
          person: `Người dự: ${observerNames}`,
          campus: slotCampus,
          scoreText: avgScore ? `${avgScore}đ` : "-",
          ratingText: ratings || "Chưa xếp loại",
          isValid,
          feedbackSummary: completedEvaluations[0]?.evaluation?.generalComment || completedEvaluations[0]?.evaluation?.improvements || "",
          slot,
          registration: completedEvaluations[0] || null
        });
      }

      // TEACHER IS OBSERVER
      const myReg = (slot.registrations || []).find((r: any) => r.teacherId === selectedTeacher?.id);
      if (myReg) {
        const hasEval = myReg.evaluation && myReg.evaluation.reEvaluationStatus !== "DRAFT";
        const isValid = myReg.isApproved && hasEval;

        if (isValid) {
          oValid += increment;
          if (isSurprise) oSurprise += increment;
          if (cat === "PHO_THONG") oPT += increment;
          else if (cat === "MAM_NON") oMN += increment;
          else oESL += increment;

          if (slotCampus === homeCampusName) {
            intObs += increment;
          } else {
            crsObs += increment;
          }
          campusDist[slotCampus] = (campusDist[slotCampus] || 0) + increment;
        }

        rows.push({
          id: `obs-${slot.id}`,
          date: formatVNDate(slot.date),
          rawDate: slot.date,
          category: cat,
          categoryLabel: catLabel,
          role: "DỰ",
          periodCount: increment,
          isSurprise,
          subject: slot.subjectName,
          className: slot.className || `${slot.grade || ""}`,
          topic: slot.topic,
          person: `Giáo viên dạy: ${slot.teacher?.teacherName || "Chưa gán"}`,
          campus: slotCampus,
          scoreText: myReg.evaluation?.totalScore ? `${myReg.evaluation.totalScore}đ` : "-",
          ratingText: myReg.evaluation?.overallRating || "Đã dự",
          isValid: !!isValid,
          feedbackSummary: myReg.evaluation?.generalComment || myReg.evaluation?.improvements || "",
          slot,
          registration: myReg
        });
      }
    });

    rows.sort((a, b) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime());
    evals.sort((a, b) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime());

    return {
      taughtValidCount: tValid,
      observedValidCount: oValid,
      taughtSurpriseCount: tSurprise,
      observedSurpriseCount: oSurprise,
      taughtPhoThong: tPT,
      taughtMamNon: tMN,
      taughtGVNN: tESL,
      observedPhoThong: oPT,
      observedMamNon: oMN,
      observedGVNN: oESL,
      internalObserved: intObs,
      crossObserved: crsObs,
      campusDistribution: campusDist,
      ledgerRows: rows,
      evaluationList: evals
    };
  }, [teacherSlots, selectedTeacher, homeCampusName]);

  const isTaughtMet = reqTaught > 0 ? taughtValidCount >= reqTaught : true;
  const isObservedMet = reqObserved > 0 ? observedValidCount >= reqObserved : true;
  const progressPct = reqObserved > 0 ? Math.round((observedValidCount / reqObserved) * 100) : 100;

  const handleExportExcel = () => {
    if (!selectedTeacher) return;
    try {
      const wb = XLSX.utils.book_new();

      const ledgerHeaders = [
        "STT", "Ngày", "Danh mục", "Vai trò", "Số tiết (Quy đổi)",
        "Môn học", "Lớp", "Tên bài dạy / Chủ đề", "Người tham gia",
        "Cơ sở", "Điểm số", "Xếp loại", "Trạng thái hợp lệ", "Góp ý chuyên môn"
      ];

      const ledgerData: any[][] = [
        ["HỆ THỐNG GIÁO DỤC SKY-LINE - BẢNG KÊ CHI TIẾT DỰ GIỜ & PHÁT TRIỂN CHUYÊN MÔN"],
        [`Giáo viên/TTCM: ${selectedTeacher.teacherName}`, `Mã GV: ${selectedTeacher.teacherCode}`, `Cơ sở: ${homeCampusName}`],
        [`Kỳ báo cáo: ${selectedMonth === "all" ? "Toàn năm học" : selectedMonth}`, `Thời gian xuất: ${new Date().toLocaleString("vi-VN")}`],
        [],
        ledgerHeaders
      ];

      ledgerRows.forEach((r, idx) => {
        ledgerData.push([
          idx + 1,
          r.date,
          r.categoryLabel,
          r.role,
          r.periodCount,
          r.subject,
          r.className,
          r.topic,
          r.person,
          r.campus,
          r.scoreText,
          r.ratingText,
          r.isValid ? "Hợp lệ" : "Chờ đánh giá",
          r.feedbackSummary
        ]);
      });

      const wsLedger = XLSX.utils.aoa_to_sheet(ledgerData);
      wsLedger["!cols"] = [
        { wch: 6 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 12 },
        { wch: 18 }, { wch: 10 }, { wch: 30 }, { wch: 26 }, { wch: 18 },
        { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 35 }
      ];
      XLSX.utils.book_append_sheet(wb, wsLedger, "Bang_Ke_Chi_Tiet");

      const matrixData: any[][] = [
        ["MA TRẬN DỰ GIỜ THEO CƠ SỞ & TỔNG HỢP KPI"],
        [`Cơ sở công tác chính: ${homeCampusName}`],
        [],
        ["CHỈ TIÊU", "THỰC HIỆN HỢP LỆ", "ĐỘT XUẤT", "TIẾN ĐỘ KPI", "TRẠNG THÁI"],
        [
          `Dạy: ${reqTaught > 0 ? `${reqTaught} tiết` : "Chưa giao"}`,
          `${taughtValidCount} tiết`,
          `${taughtSurpriseCount} tiết`,
          `${reqTaught > 0 ? Math.round((taughtValidCount / reqTaught) * 100) : 100}%`,
          isTaughtMet ? "Đạt KPI" : "Chưa đạt"
        ],
        [
          `Dự: ${reqObserved > 0 ? `${reqObserved} tiết` : "Chưa giao"}`,
          `${observedValidCount} tiết`,
          `${observedSurpriseCount} tiết`,
          `${progressPct}%`,
          isObservedMet ? "Đạt KPI" : "Chưa đạt"
        ],
        [],
        ["MA TRẬN CƠ SỞ", "NỘI BỘ CƠ SỞ", "LIÊN CƠ SỞ", "TỶ LỆ LIÊN CƠ SỞ"],
        [
          homeCampusName,
          `${internalObserved} tiết`,
          `${crossObserved} tiết`,
          `${observedValidCount > 0 ? Math.round((crossObserved / observedValidCount) * 100) : 0}%`
        ],
        [],
        ["CHI TIẾT PHÂN BỔ CÁC CƠ SỞ", "SỐ TIẾT DỰ"]
      ];

      Object.entries(campusDistribution).forEach(([cn, count]) => {
        matrixData.push([cn, count]);
      });

      const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);
      wsMatrix["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsMatrix, "Ma_Tran_Co_So");

      const fileName = `Bang_Ke_Chi_Tiet_${selectedTeacher.teacherCode}_${selectedMonth}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Đã xuất file Excel: ${fileName}`);
    } catch (e) {
      console.error(e);
      toast.error("Có lỗi xảy ra khi xuất file Excel");
    }
  };

  const handleOpenPdfExport = () => {
    if (!selectedTeacher) return;
    const url = `/api/admin/du-gio/export-bang-ke-pdf?teacherId=${selectedTeacher.id}&academicYearId=${selectedYearId || ""}&month=${selectedMonth}&category=${selectedCategory}&autoPrint=true`;
    window.open(url, "_blank");
  };

  if (!selectedTeacher) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
        <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-700">Chưa tìm thấy thông tin giáo viên</p>
      </div>
    );
  }
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Header Quản trị & Thanh công cụ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[10.5px] font-bold uppercase tracking-wider">
              Báo cáo & Bảng kê chi tiết
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Dành cho TTCM, TBP, GĐCS, Admin
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-1">
            BẢNG KÊ CHI TIẾT DỰ GIỜ & PHÁT TRIỂN CHUYÊN MÔN
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Giáo viên: <strong className="text-slate-800">{selectedTeacher.teacherName}</strong> ({selectedTeacher.teacherCode}) &bull; Tổ: <span className="font-semibold text-slate-700">{selectedTeacher.departmentRel?.name || "Tổ chuyên môn"}</span> &bull; Cơ sở: <span className="font-semibold text-slate-700">{homeCampusName}</span>
          </p>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenPdfExport}
            className="px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002B2A] text-white font-semibold text-xs shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
            title="Mở bản in A4 và tải file PDF"
          >
            <Printer className="w-3.5 h-3.5 text-teal-300" />
            <span>Xuất file PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Bộ Lọc Điều Khiển (Chọn Giáo Viên, Tháng, Danh Mục, Cơ Sở) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Tìm & Chọn Giáo Viên */}
          <div className="sm:col-span-5 space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Chọn Giáo viên / TTCM
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tên hoặc mã GV..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full text-xs font-semibold pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#48BFE3] outline-none"
                />
              </div>
              <select
                value={selectedTeacherId}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  if (onSelectTeacher) onSelectTeacher(e.target.value);
                }}
                className="text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#48BFE3] outline-none max-w-[200px]"
              >
                {filteredTeachers.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.teacherName} ({t.teacherCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lọc Theo Tháng */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Kỳ báo cáo (Tháng)
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#48BFE3] outline-none"
            >
              <option value="all">Toàn bộ năm học</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  Tháng {m.split("-")[1]}/{m.split("-")[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Danh Mục Chuyên Môn */}
          <div className="sm:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Danh mục Chuyên môn
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#48BFE3] outline-none"
            >
              <option value="all">Tất cả 3 danh mục</option>
              <option value="PHO_THONG">1. Khối Phổ thông (K-12)</option>
              <option value="MAM_NON">2. Khối Mầm non (Preschool)</option>
              <option value="GVNN">3. Dự giờ GV Nước ngoài (ESL)</option>
            </select>
          </div>

          {/* Lọc Theo Cơ Sở */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Cơ sở
            </label>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#48BFE3] outline-none"
            >
              <option value="all">Tất cả cơ sở</option>
              {campuses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.campusName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Thẻ KPI Quản Trị & Số Tiết Hợp Lệ (4 Thẻ tinh gọn) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Tiết dạy hợp lệ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tiết dạy hợp lệ
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                Giảng dạy
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-900 tabular-nums">
                {taughtValidCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">tiết</span>
              {taughtSurpriseCount > 0 && (
                <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  {taughtSurpriseCount} Đột xuất
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Chỉ tiêu: <strong>{reqTaught > 0 ? `${reqTaught} tiết` : "Chưa giao"}</strong></span>
            <span className={`font-bold ${isTaughtMet ? "text-emerald-700" : "text-amber-700"}`}>
              {isTaughtMet ? "✅ Đạt chỉ tiêu" : "Chưa đạt"}
            </span>
          </div>
        </div>

        {/* Card 2: Tiết dự giờ hợp lệ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tiết dự giờ hợp lệ
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                Dự giờ
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-900 tabular-nums">
                {observedValidCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">tiết</span>
              {observedSurpriseCount > 0 && (
                <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  {observedSurpriseCount} Đột xuất
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Chỉ tiêu: <strong>{reqObserved > 0 ? `${reqObserved} tiết` : "Chưa giao"}</strong></span>
            <span className={`font-bold ${isObservedMet ? "text-emerald-700" : "text-amber-700"}`}>
              {isObservedMet ? "✅ Đạt chỉ tiêu" : "Chưa đạt"}
            </span>
          </div>
        </div>

        {/* Card 3: Phân loại theo 3 danh mục */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                3 Danh mục chuyên môn
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                Phân bổ
              </span>
            </div>
            <div className="space-y-1.5 mt-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium truncate max-w-[130px]">Phổ thông (K-12):</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {taughtPhoThong} dạy / {observedPhoThong} dự
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium truncate max-w-[130px]">Mầm non (MN):</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {taughtMamNon} dạy / {observedMamNon} dự
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium truncate max-w-[130px]">GV Nước ngoài (ESL):</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {taughtGVNN} dạy / {observedGVNN} dự
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Tổng cả 3 khối:</span>
            <strong className="text-slate-900">{taughtValidCount + observedValidCount} tiết</strong>
          </div>
        </div>

        {/* Card 4: Tiến độ & Tỷ lệ hoàn thành KPI */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tiến độ chỉ tiêu KPI
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Chất lượng
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-[#003B3A] tabular-nums">
                {progressPct}%
              </span>
              <span className="text-xs text-slate-500">hoàn thành</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progressPct >= 100 ? "bg-emerald-500" : progressPct >= 70 ? "bg-[#48BFE3]" : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Đánh giá chung:</span>
            <span className={`font-bold ${progressPct >= 100 ? "text-emerald-700" : "text-amber-700"}`}>
              {progressPct >= 100 ? "🌟 Hoàn thành tốt" : "Đang thực hiện"}
            </span>
          </div>
        </div>
      </div>
      {/* 4. Ma Trận Dự Giờ Theo Cơ Sở Của TTCM */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>Ma Trận Dự Giờ Theo Cơ Sở (Nội Bộ & Liên Cơ Sở)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cơ sở công tác chính: <strong className="text-slate-800">{homeCampusName}</strong> &bull; Thống kê đối chiếu số tiết dự tại cơ sở nhà và lan tỏa liên cơ sở
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-medium block">Tỷ lệ dự liên cơ sở:</span>
              <span className="text-sm font-black text-teal-700 tabular-nums">
                {observedValidCount > 0 ? Math.round((crossObserved / observedValidCount) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Dự nội bộ cơ sở</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-slate-900 tabular-nums">{internalObserved}</span>
              <span className="text-xs text-slate-500">tiết</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Tại: <strong>{homeCampusName}</strong>
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Dự liên cơ sở</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-teal-700 tabular-nums">{crossObserved}</span>
              <span className="text-xs text-slate-500">tiết</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Tại các cơ sở khác trong hệ thống
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Số cơ sở đã dự giờ</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-indigo-700 tabular-nums">
                {Object.keys(campusDistribution).length}
              </span>
              <span className="text-xs text-slate-500">cơ sở</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Phủ sóng hoạt động chuyên môn
            </span>
          </div>
        </div>

        {/* Chi tiết phân bổ từng cơ sở */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
            Chi tiết phân bổ số tiết dự giờ theo từng cơ sở:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {campuses.map((c: any) => {
              const count = campusDistribution[c.campusName] || 0;
              const isHome = c.campusName === homeCampusName;
              return (
                <div
                  key={c.id}
                  className={`p-2.5 rounded-lg border text-center ${
                    count > 0 ? "bg-white border-teal-200 shadow-2xs" : "bg-slate-100/60 border-slate-200 opacity-60"
                  }`}
                >
                  <span className="text-[10.5px] font-bold text-slate-700 block truncate" title={c.campusName}>
                    {c.campusName} {isHome && "(Nhà)"}
                  </span>
                  <span className={`text-base font-black mt-0.5 block tabular-nums ${count > 0 ? "text-teal-800" : "text-slate-400"}`}>
                    {count} <span className="text-[10px] font-normal text-slate-500">tiết</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Bảng Kê Chi Tiết Theo Tháng (Sổ cái quản trị - Ledger Table) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>Bảng Kê Chi Tiết Các Tiết Dạy & Dự Giờ (Theo Tháng)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Danh mục: <strong>{selectedCategory === "all" ? "Tất cả 3 danh mục" : selectedCategory}</strong> &bull; Hiển thị {ledgerRows.length} lượt thực hiện
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Trạng thái: <span className="font-bold text-emerald-700">{ledgerRows.filter(r => r.isValid).length} Hợp lệ</span> &bull; <span className="text-amber-700">{ledgerRows.filter(r => !r.isValid).length} Chờ hoàn tất</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-3 w-10 text-center">STT</th>
                <th className="py-3 px-3 w-24">Ngày</th>
                <th className="py-3 px-3 w-28">Danh mục</th>
                <th className="py-3 px-3 w-16 text-center">Vai trò</th>
                <th className="py-3 px-3 w-16 text-center">Số tiết</th>
                <th className="py-3 px-3 min-w-[150px]">Môn & Lớp</th>
                <th className="py-3 px-3 min-w-[200px]">Tên bài dạy / Chủ đề</th>
                <th className="py-3 px-3 min-w-[160px]">Người tham gia</th>
                <th className="py-3 px-3 w-28">Cơ sở</th>
                <th className="py-3 px-3 w-24 text-center">Đánh giá</th>
                <th className="py-3 px-3 w-24 text-center">Hợp lệ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgerRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                    Không có tiết dạy hoặc dự giờ nào phù hợp với bộ lọc đã chọn.
                  </td>
                </tr>
              ) : (
                ledgerRows.map((r, idx) => (
                  <tr
                    key={r.id}
                    onClick={() => {
                      if (r.registration && openEvalModal) openEvalModal(r.registration);
                    }}
                    className="hover:bg-teal-50/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 text-center text-slate-400 font-medium tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-semibold tabular-nums">
                      {r.date}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          r.category === "PHO_THONG"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : r.category === "MAM_NON"
                            ? "bg-pink-50 text-pink-700 border-pink-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}
                      >
                        {r.categoryLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          r.role === "DẠY"
                            ? "bg-sky-50 text-sky-800 border border-sky-200"
                            : "bg-teal-50 text-teal-800 border border-teal-200"
                        }`}
                      >
                        {r.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800 tabular-nums">
                      {r.periodCount}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <div>{r.subject}</div>
                      <div className="text-[11px] text-slate-400 font-normal">Lớp {r.className}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-800">
                      <div className="font-semibold text-slate-900">{r.topic}</div>
                      {r.isSurprise && (
                        <span className="inline-block mt-0.5 text-[9.5px] text-amber-700 font-bold bg-amber-50 px-1 rounded border border-amber-200">
                          Đột xuất
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">
                      {r.person}
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-xs">
                      {r.campus}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="font-bold text-slate-800 tabular-nums">{r.scoreText}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{r.ratingText}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          r.isValid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {r.isValid ? "✅ Hợp lệ" : "⏳ Chờ ĐG"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* 6. Lịch Sử Kết Quả Đánh Giá Tiết Dạy & Góp Ý Của TCM */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-600" />
              <span>Lịch Sử Kết Quả Đánh Giá Tiết Dạy & Góp Ý Của TCM</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ghi nhận các ý kiến nhận xét chuyên môn, ưu điểm, tồn tại và phản hồi từ giáo viên
            </p>
          </div>
          <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
            {evaluationList.length} Phiếu đánh giá hoàn tất
          </span>
        </div>

        {evaluationList.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500 uppercase">
              Chưa có phiếu đánh giá tiết dạy nào được lưu trữ trong kỳ này.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {evaluationList.map((eh, idx) => (
              <div
                key={idx}
                className="bg-slate-50/70 hover:bg-slate-50 p-4 rounded-xl border border-slate-200 transition-all space-y-3"
              >
                {/* Tiêu đề giờ dạy & điểm số */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {idx + 1}. Bài dạy: {eh.topic}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                        {eh.catLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Môn: <strong>{eh.subject}</strong> &bull; Lớp: <strong>{eh.className}</strong> &bull; Ngày: <strong>{eh.date}</strong> &bull; Người dự & đánh giá: <strong className="text-slate-800">{eh.evaluatorName}</strong> ({eh.evaluatorPosition})
                    </p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-base font-black text-[#003B3A] tabular-nums">
                      {eh.totalScore !== null && eh.totalScore !== undefined ? `${eh.totalScore} điểm` : ""}
                    </span>
                    <span className="ml-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {eh.overallRating}
                    </span>
                  </div>
                </div>

                {/* Các khối góp ý của TCM */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/80 text-xs">
                  {/* Ưu điểm */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1 text-[11.5px]">
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Ưu điểm nổi bật</span>
                    </span>
                    <p className="text-slate-600 text-[11.5px] leading-relaxed">
                      {eh.strengths || "Chưa ghi nhận ưu điểm chi tiết."}
                    </p>
                  </div>

                  {/* Tồn tại / Góp ý hoàn thiện */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-amber-800 flex items-center gap-1.5 mb-1 text-[11.5px]">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Tồn tại & Góp ý hoàn thiện</span>
                    </span>
                    <p className="text-slate-600 text-[11.5px] leading-relaxed">
                      {eh.improvements || "Không có nội dung tồn tại."}
                    </p>
                  </div>

                  {/* Nhận xét chung & Phản hồi GV */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                    <div>
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-[11.5px]">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Nhận xét chung của TCM</span>
                      </span>
                      <p className="text-slate-600 text-[11.5px] leading-relaxed">
                        {eh.generalComment || "Tiết dạy đạt yêu cầu chuyên môn."}
                      </p>
                    </div>

                    {eh.teacherFeedback && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="font-bold text-sky-800 block mb-0.5 text-[11px]">
                          💬 Phản hồi tiếp thu của GV:
                        </span>
                        <p className="text-slate-600 text-[11px] italic">
                          &ldquo;{eh.teacherFeedback}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
