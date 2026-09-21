/* eslint-disable */
"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Printer, Search, Calendar, Award,
  AlertCircle, User, Building2,
  BookOpen, ThumbsUp, MessageSquare, Star, X,
  ChevronDown, ChevronUp, CheckCircle2, Sparkles, Filter
} from "lucide-react";
import toast from "react-hot-toast";
import { isExactWalkthroughForm } from "@/app/teacher/du-gio-gvnn/utils";
import { ACADEMIC_DIVISIONS, normalizeDivisionCode } from "@/config/divisions";

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
  const [selectedDivisionCode, setSelectedDivisionCode] = useState<string>("all");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const getDeptDivisionCode = useCallback((dept: any): string => {
    if (!dept) return "";
    if (dept.divisionCode) return normalizeDivisionCode(dept.divisionCode);
    const name = (dept.name || "").toLowerCase();
    const block = (dept.blockCM || "").toLowerCase();
    if (name.includes("mầm non") || block.includes("mầm non")) return "BP_MAM_NON";
    if (name.includes("tiểu học") || name.match(/tổ [1-5]\b/)) return "BP_TIEU_HOC";
    if (name.includes("trung học") || name.includes("toán") || name.includes("văn") || name.includes("khtn") || name.includes("khxh") || name.includes("lý") || name.includes("hóa") || name.includes("sinh") || name.includes("sử") || name.includes("địa")) return "BP_TRUNG_HOC";
    if (name.includes("anh") || name.includes("esl") || name.includes("quốc tế") || name.includes("foreign")) return "BP_TA_CTQT";
    if (name.includes("tin") || name.includes("stem") || name.includes("ict") || name.includes("công nghệ")) return "BP_STEM_ICT";
    if (name.includes("trải nghiệm") || name.includes("kỹ năng") || name.includes("cố vấn") || name.includes("hướng nghiệp")) return "BP_HDNG_CTHS";
    if (block.includes("điều hành") || name.includes("điều hành") || name.includes("ban đhcm")) return "BAN_DHCM";
    if (block.includes("giám đốc") || name.includes("ban gđ") || name.includes("gđcs")) return "BAN_GD";
    if (name.includes("khảo thí") || name.includes("đbcl")) return "BAN_KT_DBCL";
    return "BP_TRUNG_HOC";
  }, []);

  const availableDivisions = useMemo(() => {
    const presentCodes = new Set<string>();
    departments.forEach((d: any) => {
      const code = getDeptDivisionCode(d);
      if (code) presentCodes.add(code);
    });
    return ACADEMIC_DIVISIONS.filter(div => presentCodes.has(div.code) || [
      "BP_TRUNG_HOC", "BP_TIEU_HOC", "BP_MAM_NON", "BP_STEM_ICT", "BP_TA_CTQT", "BP_HDNG_CTHS", "BAN_DHCM"
    ].includes(div.code));
  }, [departments, getDeptDivisionCode]);

  const filteredDepartments = useMemo(() => {
    if (selectedDivisionCode === "all") return departments;
    return departments.filter(d => getDeptDivisionCode(d) === selectedDivisionCode);
  }, [departments, selectedDivisionCode, getDeptDivisionCode]);

  const handleDivisionChange = (divCode: string) => {
    setSelectedDivisionCode(divCode);
    if (selectedDepartmentId !== "all") {
      const dept = departments.find(d => d.id === selectedDepartmentId);
      if (divCode !== "all" && getDeptDivisionCode(dept) !== divCode) {
        setSelectedDepartmentId("all");
      }
    }
  };

  const handleDepartmentChange = (deptId: string) => {
    setSelectedDepartmentId(deptId);
    if (deptId !== "all") {
      const dept = departments.find(d => d.id === deptId);
      if (dept) {
        const div = getDeptDivisionCode(dept);
        if (div && selectedDivisionCode === "all") {
          setSelectedDivisionCode(div);
        }
      }
    }
  };

  React.useEffect(() => {
    if (preSelectedTeacherId) {
      setSelectedTeacherId(preSelectedTeacherId);
    }
  }, [preSelectedTeacherId]);

  const selectedTeacher = useMemo(() => {
    return teachers.find((t: any) => t.id === selectedTeacherId) || teachers[0] || null;
  }, [teachers, selectedTeacherId]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t: any) => {
      if (selectedDepartmentId !== "all") {
        const primaryMatch = t.departmentId === selectedDepartmentId || t.departmentRel?.id === selectedDepartmentId;
        const assignedMatch = (t.departmentAssignments || []).some((da: any) => da.departmentId === selectedDepartmentId);
        if (!primaryMatch && !assignedMatch) return false;
      }

      if (selectedDivisionCode !== "all") {
        const tDept = departments.find((d: any) => d.id === t.departmentId || d.id === t.departmentRel?.id);
        const assignedDepts = (t.departmentAssignments || []).map((da: any) => departments.find((d: any) => d.id === da.departmentId)).filter(Boolean);
        const allDepts = [tDept, ...assignedDepts].filter(Boolean);
        const matchDiv = allDepts.some((d: any) => getDeptDivisionCode(d) === selectedDivisionCode);
        if (!matchDiv && allDepts.length > 0) return false;
      }

      if (teacherSearch.trim()) {
        const q = teacherSearch.toLowerCase();
        const matchSearch =
          t.teacherName?.toLowerCase().includes(q) ||
          t.teacherCode?.toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      return true;
    });
  }, [teachers, departments, selectedDepartmentId, selectedDivisionCode, teacherSearch, getDeptDivisionCode]);

  React.useEffect(() => {
    if (filteredTeachers.length > 0) {
      const exists = filteredTeachers.some((t: any) => t.id === selectedTeacherId);
      if (!exists) {
        const newTeacherId = filteredTeachers[0].id;
        setSelectedTeacherId(newTeacherId);
        if (onSelectTeacher) onSelectTeacher(newTeacherId);
      }
    }
  }, [filteredTeachers, selectedTeacherId, onSelectTeacher]);

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
    ledgerRows
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

    teacherSlots.forEach(slot => {
      const cat = getSlotCategory(slot);
      const catLabel = cat === "PHO_THONG" ? "Khối Phổ thông" : cat === "MAM_NON" ? "Khối Mầm non" : "GV Nước ngoài";
      const increment = slot.isDoublePeriod ? 2 : 1;
      const isSurprise = slot.requestOrigin === "PRESCHOOL_SURPRISE" || (slot.description || "").toLowerCase().includes("đột xuất");
      const slotCampus = slot.campusName || slot.teacher?.campus?.campusName || homeCampusName;

      // TEACHER IS HOST (DẠY)
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

        const mainEval = completedEvaluations[0]?.evaluation || null;

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
          evaluatorName: completedEvaluations[0]?.teacher?.teacherName || observerNames,
          evaluatorPosition: completedEvaluations[0]?.teacher?.position || "Người dự giờ",
          campus: slotCampus,
          scoreText: avgScore ? `${avgScore}đ` : "-",
          ratingText: ratings || "Chưa xếp loại",
          isValid,
          feedbackSummary: mainEval?.generalComment || mainEval?.improvements || "",
          evaluation: mainEval,
          allCompletedEvaluations: completedEvaluations,
          slot,
          registration: completedEvaluations[0] || null
        });
      }

      // TEACHER IS OBSERVER (DỰ)
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
          evaluatorName: selectedTeacher?.teacherName || "Tôi dự",
          evaluatorPosition: selectedTeacher?.position || "Người đánh giá",
          campus: slotCampus,
          scoreText: myReg.evaluation?.totalScore ? `${myReg.evaluation.totalScore}đ` : "-",
          ratingText: myReg.evaluation?.overallRating || "Đã dự",
          isValid: !!isValid,
          feedbackSummary: myReg.evaluation?.generalComment || myReg.evaluation?.improvements || "",
          evaluation: myReg.evaluation || null,
          allCompletedEvaluations: myReg.evaluation ? [myReg] : [],
          slot,
          registration: myReg
        });
      }
    });

    rows.sort((a, b) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime());

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
      ledgerRows: rows
    };
  }, [teacherSlots, selectedTeacher, homeCampusName]);

  const isTaughtMet = reqTaught > 0 ? taughtValidCount >= reqTaught : true;
  const progressPct = reqObserved > 0 ? Math.round((observedValidCount / reqObserved) * 100) : 100;

  const handleOpenPdfExport = () => {
    if (!selectedTeacher) return;
    const url = `/api/admin/du-gio/export-bang-ke-pdf?teacherId=${selectedTeacher.id}&academicYearId=${selectedYearId || ""}&month=${selectedMonth}&category=${selectedCategory}&autoPrint=true`;
    window.open(url, "_blank");
  };

  const toggleExpandRow = (rowId: string) => {
    setExpandedRowId(prev => (prev === rowId ? null : rowId));
  };

  if (!selectedTeacher) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">Chưa tìm thấy thông tin giáo viên phù hợp</p>
      </div>
    );
  }

  const teacherDept = departments.find((d: any) => d.id === selectedTeacher?.departmentId || d.id === selectedTeacher?.departmentRel?.id);
  const teacherDivCode = getDeptDivisionCode(teacherDept);
  const teacherDivName = ACADEMIC_DIVISIONS.find(d => d.code === teacherDivCode)?.name || teacherDept?.blockCM || "Chuyên môn";

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      {/* 1. Header tinh gọn - 1 nút xuất PDF duy nhất */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-teal-800" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                BẢNG KÊ CHI TIẾT DỰ GIỜ & PHÁT TRIỂN CHUYÊN MÔN
              </h2>
              <span className="hidden md:inline-flex px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold">
                TTCM • TBP • GĐCS • Admin
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Sổ cái theo dõi chi tiết tiết dạy, tiết dự, góp ý TCM và ma trận cơ sở
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenPdfExport}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002B2A] text-white font-bold text-xs shadow-2xs flex items-center gap-2 transition-all cursor-pointer shrink-0 active:scale-[0.98]"
          title="Mở bản in A4 và xuất file PDF chính thức"
        >
          <Printer className="w-3.5 h-3.5 text-teal-300" />
          <span>Xuất file PDF (A4)</span>
        </button>
      </div>

      {/* 2. Bộ Lọc Hợp Nhất & Tinh Gọn */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 sm:p-3.5 space-y-2.5">
        {/* Hàng 1: Phân cấp Chọn Bộ Phận -> Tổ CM -> Giáo viên */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          <div className="sm:col-span-3">
            <select
              value={selectedDivisionCode}
              onChange={(e) => handleDivisionChange(e.target.value)}
              className="w-full text-xs font-semibold px-2.5 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:border-[#48BFE3] outline-none text-slate-800 cursor-pointer transition-colors"
            >
              <option value="all">Tất cả Bộ phận ({availableDivisions.length})</option>
              {availableDivisions.map((div) => (
                <option key={div.code} value={div.code}>
                  {div.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedDepartmentId}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="w-full text-xs font-semibold px-2.5 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:border-[#48BFE3] outline-none text-slate-800 cursor-pointer transition-colors"
            >
              <option value="all">Tất cả Tổ CM ({filteredDepartments.length})</option>
              {filteredDepartments.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-6 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm GV theo tên / mã..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                className="w-full text-xs font-medium pl-7 pr-2.5 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:border-[#48BFE3] outline-none transition-colors"
              />
            </div>
            <select
              value={selectedTeacherId}
              onChange={(e) => {
                setSelectedTeacherId(e.target.value);
                if (onSelectTeacher) onSelectTeacher(e.target.value);
              }}
              className="text-xs font-bold px-3 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:border-[#48BFE3] outline-none max-w-[220px] text-slate-800 cursor-pointer transition-colors"
            >
              {filteredTeachers.map((t: any) => {
                const isTeacherTTCM = t.position === "TTCM" || (t.departmentAssignments || []).some((da: any) => da.position === "TTCM");
                return (
                  <option key={t.id} value={t.id}>
                    {isTeacherTTCM ? "★ " : ""}{t.teacherName} ({t.teacherCode || "GV"})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Hàng 2: Kỳ báo cáo (Tháng) + Danh mục Pill Tabs + Cơ sở */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Tháng */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#48BFE3] outline-none cursor-pointer"
            >
              <option value="all">Toàn năm học</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  Tháng {m.split("-")[1]}/{m.split("-")[0]}
                </option>
              ))}
            </select>

            {/* Pill tabs Danh mục */}
            <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
              {[
                { id: "all", label: "Tất cả danh mục" },
                { id: "PHO_THONG", label: "Khối Phổ thông" },
                { id: "MAM_NON", label: "Khối Mầm non" },
                { id: "GVNN", label: "Dự giờ GVNN" },
              ].map((pill) => {
                const isActive = selectedCategory === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setSelectedCategory(pill.id)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? "bg-white text-teal-900 shadow-2xs border border-slate-200/60"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cơ sở */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Cơ sở:</span>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#48BFE3] outline-none cursor-pointer max-w-[160px]"
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

      {/* 3. THẺ TỔNG HỢP PROFILE & KPI MA TRẬN DUY NHẤT (Executive Card - Tránh trùng lặp) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3.5 sm:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:divide-x lg:divide-slate-100">
          {/* Cột 1: Thông tin nhân sự (4 cột lg) */}
          <div className="lg:col-span-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-700 to-[#003B3A] text-white font-bold flex items-center justify-center shrink-0 shadow-2xs text-sm">
              {selectedTeacher?.teacherName ? selectedTeacher.teacherName.charAt(0).toUpperCase() : "G"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 text-sm truncate">
                  {selectedTeacher?.teacherName}
                </span>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {selectedTeacher?.teacherCode || "GV"}
                </span>
                {selectedTeacher?.position === "TTCM" && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    ★ TTCM
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                <div className="truncate">
                  <span className="text-slate-400">Bộ phận:</span> <strong className="text-slate-700">{teacherDivName}</strong>
                </div>
                <div className="truncate">
                  <span className="text-slate-400">Tổ CM:</span> <span className="text-slate-700">{selectedTeacher?.departmentRel?.name || teacherDept?.name || "Chưa gán"}</span>
                </div>
                <div className="truncate">
                  <span className="text-slate-400">Cơ sở chính:</span> <span className="text-slate-700 font-medium">{homeCampusName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cột 2: KPI Giảng dạy & Dự giờ (5 cột lg) */}
          <div className="lg:col-span-5 lg:pl-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Chỉ số KPI Chuyên Môn
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                progressPct >= 100
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : progressPct >= 70
                  ? "bg-sky-50 text-sky-800 border-sky-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}>
                {progressPct >= 100 ? "🌟 Đạt chỉ tiêu" : `Tiến độ ${progressPct}%`}
              </span>
            </div>

            {/* 2 Thống kê số tiết */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Tiết dạy hợp lệ</span>
                  <span className="text-[10px] text-slate-400">Giao: {reqTaught > 0 ? reqTaught : "-"}</span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg font-black text-slate-900 tabular-nums">{taughtValidCount}</span>
                  <span className="text-xs text-slate-500">tiết</span>
                  {taughtSurpriseCount > 0 && (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1 rounded border border-amber-200">
                      +{taughtSurpriseCount} ĐX
                    </span>
                  )}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-teal-50/50 border border-teal-200/60">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-teal-900 font-medium">Tiết dự hợp lệ</span>
                  <span className="text-[10px] text-teal-600">Giao: {reqObserved > 0 ? reqObserved : "-"}</span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg font-black text-teal-950 tabular-nums">{observedValidCount}</span>
                  <span className="text-xs text-teal-800">tiết</span>
                  {observedSurpriseCount > 0 && (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1 rounded border border-amber-200">
                      +{observedSurpriseCount} ĐX
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Phân loại 3 danh mục tinh gọn */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>Phổ thông: <strong className="text-slate-800">{taughtPhoThong}d / {observedPhoThong}d</strong></span>
              <span>Mầm non: <strong className="text-slate-800">{taughtMamNon}d / {observedMamNon}d</strong></span>
              <span>GVNN: <strong className="text-slate-800">{taughtGVNN}d / {observedGVNN}d</strong></span>
            </div>
          </div>

          {/* Cột 3: Ma trận cơ sở (3 cột lg) */}
          <div className="lg:col-span-3 lg:pl-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3 text-teal-700" />
                <span>Ma trận cơ sở</span>
              </span>
              <span className="text-xs font-black text-teal-800 tabular-nums">
                {observedValidCount > 0 ? Math.round((crossObserved / observedValidCount) * 100) : 0}% liên CS
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Nội bộ ({homeCampusName}):</span>
                <strong className="text-slate-900 tabular-nums">{internalObserved} tiết</strong>
              </div>
              <div className="flex justify-between">
                <span>Liên cơ sở khác:</span>
                <strong className="text-teal-800 tabular-nums">{crossObserved} tiết</strong>
              </div>
            </div>

            {/* Phân bổ các cơ sở mini chips */}
            <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-100">
              {campuses.map((c: any) => {
                const count = campusDistribution[c.campusName] || 0;
                if (count === 0 && c.campusName !== homeCampusName) return null;
                return (
                  <span
                    key={c.id}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                      count > 0 ? "bg-teal-50 text-teal-800 border-teal-200" : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}
                    title={`${c.campusName}: ${count} tiết`}
                  >
                    {c.campusName.replace("Sky-Line ", "CS ")}: <strong>{count}</strong>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. SỔ CÁI BẢNG KÊ CHI TIẾT & ACCORDION GÓP Ý TCM TRỰC TIẾP TẠI DÒNG */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Danh sách chi tiết tiết dạy & dự giờ ({ledgerRows.length} lượt)
            </span>
            <span className="text-[11px] text-slate-400">
              (Bấm vào dòng để xem chi tiết góp ý chuyên môn của TCM)
            </span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="font-bold text-emerald-700">✓ {ledgerRows.filter(r => r.isValid).length} Hợp lệ</span>
            <span>•</span>
            <span className="text-amber-700">⏳ {ledgerRows.filter(r => !r.isValid).length} Chờ đánh giá</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3 w-10 text-center">STT</th>
                <th className="py-2.5 px-3 w-24">Ngày</th>
                <th className="py-2.5 px-3 w-24">Danh mục</th>
                <th className="py-2.5 px-3 w-16 text-center">Vai trò</th>
                <th className="py-2.5 px-3 w-14 text-center">Số tiết</th>
                <th className="py-2.5 px-3 min-w-[140px]">Môn & Lớp</th>
                <th className="py-2.5 px-3 min-w-[180px]">Tên bài dạy / Chủ đề</th>
                <th className="py-2.5 px-3 min-w-[150px]">Người tham gia</th>
                <th className="py-2.5 px-3 w-24">Cơ sở</th>
                <th className="py-2.5 px-3 w-20 text-center">Đánh giá</th>
                <th className="py-2.5 px-3 w-20 text-center">Hợp lệ</th>
                <th className="py-2.5 px-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgerRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400 font-medium">
                    Không có tiết dạy hoặc dự giờ nào phù hợp với bộ lọc đã chọn.
                  </td>
                </tr>
              ) : (
                ledgerRows.map((r, idx) => {
                  const isExpanded = expandedRowId === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        onClick={() => toggleExpandRow(r.id)}
                        className={`transition-colors cursor-pointer ${
                          isExpanded ? "bg-teal-50/40" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-medium tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-semibold tabular-nums">
                          {r.date}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              r.category === "PHO_THONG"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : r.category === "MAM_NON"
                                ? "bg-pink-50 text-pink-700 border-pink-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            }`}
                          >
                            {r.category === "PHO_THONG" ? "Phổ thông" : r.category === "MAM_NON" ? "Mầm non" : "GVNN"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
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
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800 tabular-nums">
                          {r.periodCount}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          <div>{r.subject}</div>
                          <div className="text-[11px] text-slate-400 font-normal">Lớp {r.className}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-800">
                          <div className="font-semibold text-slate-900">{r.topic}</div>
                          {r.isSurprise && (
                            <span className="inline-block mt-0.5 text-[9px] text-amber-700 font-bold bg-amber-50 px-1 rounded border border-amber-200">
                              Đột xuất
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-600">
                          {r.person}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-xs truncate max-w-[100px]" title={r.campus}>
                          {r.campus}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="font-bold text-slate-800 tabular-nums">{r.scoreText}</div>
                          <div className="text-[10px] text-slate-500 font-medium">{r.ratingText}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              r.isValid
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {r.isValid ? "✓ Hợp lệ" : "⏳ Chờ ĐG"}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-400">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-teal-700 inline" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 hover:text-slate-600 inline" />
                          )}
                        </td>
                      </tr>

                      {/* Accordion Chi tiết Góp ý chuyên môn TCM trực tiếp tại dòng */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <td colSpan={12} className="p-3 sm:p-4">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4 text-teal-700" />
                                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                                    Chi tiết Đánh Giá Chuyên Môn & Góp Ý Của TCM
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">
                                    Người đánh giá: <strong className="text-slate-800">{r.evaluatorName}</strong> ({r.evaluatorPosition})
                                  </span>
                                  {r.scoreText !== "-" && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                                      {r.scoreText} • {r.ratingText}
                                    </span>
                                  )}
                                  {openEvalModal && r.registration && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEvalModal(r.registration);
                                      }}
                                      className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold border border-teal-200 transition-colors"
                                    >
                                      Xem phiếu đầy đủ
                                    </button>
                                  )}
                                </div>
                              </div>

                              {r.evaluation ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                  {/* Ưu điểm */}
                                  <div className="p-2.5 rounded-lg bg-emerald-50/40 border border-emerald-200/70">
                                    <span className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1 text-[11.5px]">
                                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Ưu điểm nổi bật</span>
                                    </span>
                                    <p className="text-slate-700 text-[11.5px] leading-relaxed">
                                      {r.evaluation.strengths || "Chưa ghi nhận ưu điểm chi tiết."}
                                    </p>
                                  </div>

                                  {/* Tồn tại */}
                                  <div className="p-2.5 rounded-lg bg-amber-50/40 border border-amber-200/70">
                                    <span className="font-bold text-amber-900 flex items-center gap-1.5 mb-1 text-[11.5px]">
                                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Tồn tại & Góp ý hoàn thiện</span>
                                    </span>
                                    <p className="text-slate-700 text-[11.5px] leading-relaxed">
                                      {r.evaluation.improvements || "Không có nội dung tồn tại."}
                                    </p>
                                  </div>

                                  {/* Nhận xét chung & Phản hồi GV */}
                                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                                    <div>
                                      <span className="font-bold text-slate-900 flex items-center gap-1.5 mb-1 text-[11.5px]">
                                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>Nhận xét chung của TCM</span>
                                      </span>
                                      <p className="text-slate-700 text-[11.5px] leading-relaxed">
                                        {r.evaluation.generalComment || "Tiết dạy đạt yêu cầu chuyên môn."}
                                      </p>
                                    </div>

                                    {r.evaluation.teacherFeedback && (
                                      <div className="pt-1.5 border-t border-slate-200">
                                        <span className="font-bold text-sky-900 block mb-0.5 text-[11px]">
                                          💬 Phản hồi tiếp thu của GV:
                                        </span>
                                        <p className="text-slate-600 text-[11px] italic">
                                          &ldquo;{r.evaluation.teacherFeedback}&rdquo;
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="py-4 text-center text-slate-400 text-xs">
                                  Chưa có nội dung phiếu đánh giá cho tiết này (Đang chờ người dự hoàn tất đánh giá).
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
      </div>
    </div>
  );
}
