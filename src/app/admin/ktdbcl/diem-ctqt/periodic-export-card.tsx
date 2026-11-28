"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  Calendar,
  Check,
  Download,
  FileSpreadsheet,
  Layers,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { CtqtLevel, detectCtqtLevel, extractCtqtGradeNumber } from "@/lib/ctqt/config";
import {
  CTQT_PERIODIC_OPTIONS,
  CtqtPeriodicCode,
  getCtqtPeriodicMeta,
  getUniqueCtqtSubjectsForLevels,
  normalizeSubjectCode,
} from "@/lib/ctqt/periodicExportService";

interface PeriodicExportCardProps {
  academicYearId: string;
  campuses: { id: string; campusCode?: string; campusName: string }[];
  classes: {
    id: string;
    className: string;
    grade?: string | null;
    level?: string | null;
    campusId?: string | null;
    academicYearId?: string | null;
  }[];
  defaultCampusId?: string;
  defaultSemester?: number;
  isSubjectScoped?: boolean;
  allowedCtqtSubjectCodes?: string[];
}

function getLevelFromGradeNum(gNum: number): CtqtLevel {
  if (gNum >= 10) return "HIGH";
  if (gNum >= 6) return "MIDDLE";
  return "PRIMARY";
}

function formatLevelsLabel(levels: CtqtLevel[]): string {
  return levels
    .map(l => (l === "PRIMARY" ? "Tiểu học" : l === "MIDDLE" ? "THCS" : "THPT"))
    .join(" · ");
}

export function CtqtPeriodicExportCard({
  academicYearId,
  campuses,
  classes,
  defaultCampusId = "",
  defaultSemester = 1,
  isSubjectScoped = false,
  allowedCtqtSubjectCodes = [],
}: PeriodicExportCardProps) {
  const [campusId, setCampusId] = useState<string>(defaultCampusId || "");
  const [periodCode, setPeriodCode] = useState<CtqtPeriodicCode>(defaultSemester === 2 ? "HK2" : "HK1");
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [gradesInitialized, setGradesInitialized] = useState(false);

  const [includeOverview, setIncludeOverview] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [includeCompetencies, setIncludeCompetencies] = useState(false);
  const [includeAllScoreCols, setIncludeAllScoreCols] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Sync default campus & semester when parent changes
  useEffect(() => {
    setCampusId(defaultCampusId || "");
  }, [defaultCampusId]);

  useEffect(() => {
    setPeriodCode(prev => {
      if (defaultSemester === 1 && (prev === "GK2" || prev === "CK2" || prev === "HK2")) return "HK1";
      if (defaultSemester === 2 && (prev === "GK1" || prev === "CK1" || prev === "HK1")) return "HK2";
      return prev;
    });
  }, [defaultSemester]);

  // Classes filtered by selected campus
  const campusClasses = useMemo(() => {
    return classes.filter(c => !campusId || c.campusId === campusId);
  }, [classes, campusId]);

  // Available grades with class counts
  const availableGrades = useMemo(() => {
    const counts = new Map<number, number>();
    for (const cls of campusClasses) {
      const gNum = extractCtqtGradeNumber(cls.className, cls.grade);
      if (gNum >= 1 && gNum <= 12) {
        counts.set(gNum, (counts.get(gNum) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([grade, classCount]) => ({
        grade,
        classCount,
        level: getLevelFromGradeNum(grade),
      }));
  }, [campusClasses]);

  const availableGradeNumbers = useMemo(() => availableGrades.map(g => g.grade), [availableGrades]);

  // Keep selectedGrades valid when campus/availableGrades change
  useEffect(() => {
    if (availableGradeNumbers.length === 0) {
      setSelectedGrades([]);
      return;
    }
    if (!gradesInitialized) {
      setSelectedGrades(availableGradeNumbers);
      setGradesInitialized(true);
      return;
    }
    setSelectedGrades(prev => {
      const valid = prev.filter(g => availableGradeNumbers.includes(g));
      return valid.length > 0 ? valid : availableGradeNumbers;
    });
  }, [availableGradeNumbers, gradesInitialized]);

  // Matching classes for selected grades
  const matchedClasses = useMemo(() => {
    if (selectedGrades.length === 0) return [];
    const gradeSet = new Set(selectedGrades);
    return campusClasses.filter(c => gradeSet.has(extractCtqtGradeNumber(c.className, c.grade)));
  }, [campusClasses, selectedGrades]);

  // Active educational levels derived from selected grades/classes
  const activeLevels = useMemo<CtqtLevel[]>(() => {
    if (matchedClasses.length > 0) {
      return Array.from(
        new Set(matchedClasses.map(c => detectCtqtLevel(c.className, c.grade || undefined, c.level || undefined)))
      );
    }
    return Array.from(new Set(selectedGrades.map(getLevelFromGradeNum)));
  }, [matchedClasses, selectedGrades]);

  // Available subjects for selected grades, respecting subject scope
  const availableSubjects = useMemo(() => {
    const raw = getUniqueCtqtSubjectsForLevels(activeLevels);
    if (!isSubjectScoped || allowedCtqtSubjectCodes.length === 0) return raw;
    const allowedSet = new Set(allowedCtqtSubjectCodes.map(normalizeSubjectCode));
    const scoped = raw.filter(s => allowedSet.has(s.code));
    return scoped.length > 0 ? scoped : raw;
  }, [activeLevels, isSubjectScoped, allowedCtqtSubjectCodes]);

  const availableSubjectCodes = useMemo(() => availableSubjects.map(s => s.code), [availableSubjects]);

  // Sync selectedSubjects when availableSubjects change
  useEffect(() => {
    if (availableSubjectCodes.length === 0) {
      setSelectedSubjects([]);
      return;
    }
    setSelectedSubjects(prev => {
      if (prev.length === 0) return availableSubjectCodes;
      const kept = prev.filter(code => availableSubjectCodes.includes(code));
      return kept.length > 0 ? kept : availableSubjectCodes;
    });
  }, [availableSubjectCodes]);

  const periodMeta = getCtqtPeriodicMeta(periodCode);

  const toggleGrade = (gradeNum: number) => {
    setSelectedGrades(prev =>
      prev.includes(gradeNum) ? prev.filter(g => g !== gradeNum) : [...prev, gradeNum].sort((a, b) => a - b)
    );
  };

  const selectGradePreset = (preset: "ALL" | "PRIMARY" | "MIDDLE" | "HIGH" | "NONE") => {
    if (preset === "NONE") {
      setSelectedGrades([]);
      return;
    }
    if (preset === "ALL") {
      setSelectedGrades(availableGradeNumbers);
      return;
    }
    const target = availableGrades.filter(g => g.level === preset).map(g => g.grade);
    setSelectedGrades(target);
  };

  const isPresetActive = (preset: "ALL" | "PRIMARY" | "MIDDLE" | "HIGH"): boolean => {
    if (selectedGrades.length === 0) return false;
    const expected =
      preset === "ALL"
        ? availableGradeNumbers
        : availableGrades.filter(g => g.level === preset).map(g => g.grade);
    if (expected.length === 0 || expected.length !== selectedGrades.length) return false;
    return expected.every(g => selectedGrades.includes(g));
  };

  const toggleSubject = (code: string) => {
    setSelectedSubjects(prev => (prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]));
  };

  const handleExportPeriodic = async () => {
    if (!academicYearId) {
      toast.error("Chưa chọn năm học");
      return;
    }
    if (selectedGrades.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 khối lớp để xuất bảng điểm");
      return;
    }
    if (selectedSubjects.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 môn học để xuất bảng điểm");
      return;
    }

    setExporting(true);
    try {
      const params = new URLSearchParams({
        academicYearId,
        period: periodCode,
        grades: selectedGrades.join(","),
        subjects: selectedSubjects.join(","),
        includeOverview: includeOverview ? "1" : "0",
        includeSummary: includeSummary ? "1" : "0",
        includeComments: includeComments ? "1" : "0",
        includeCompetencies: includeCompetencies ? "1" : "0",
        includeAllCols: includeAllScoreCols ? "1" : "0",
      });
      if (campusId) {
        params.set("campusId", campusId);
      }

      const res = await fetch(`/api/admin/ctqt/excel/periodic?${params.toString()}`);
      if (!res.ok) {
        let errMsg = "Không thể xuất bảng điểm định kỳ";
        try {
          const data = await res.json();
          if (data?.error) errMsg = data.error;
        } catch {
          // ignore json parse error
        }
        toast.error(errMsg);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/i);
      const fileName = match?.[1] || `BangDiem_CTQT_${periodCode}.xlsx`;

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);

      toast.success(
        `Đã xuất bảng điểm ${periodMeta.shortLabel} (${selectedGrades.length} khối · ${matchedClasses.length} lớp · ${selectedSubjects.length} môn)`
      );
    } catch {
      toast.error("Lỗi kết nối máy chủ khi xuất file Excel");
    } finally {
      setExporting(false);
    }
  };

  // Campus class counts for dropdown
  const campusCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of classes) {
      if (c.campusId) {
        map.set(c.campusId, (map.get(c.campusId) || 0) + 1);
      }
    }
    return map;
  }, [classes]);

  const estimatedSheets = useMemo(() => {
    let count = 0;
    if (includeOverview) count += 1;
    if (includeSummary) count += 1;
    count += selectedSubjects.length;
    if (includeCompetencies) count += 1;
    return count;
  }, [includeOverview, includeSummary, selectedSubjects.length, includeCompetencies]);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
      {/* Header masthead - Sky-Line Academic Ledger */}
      <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] border-l-4 border-l-[#003B3A] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[#003B3A]">
            <FileSpreadsheet className="w-5 h-5 text-[#00736E]" />
            <h3 className="text-base font-bold text-[#003B3A]">
              3. Xuất bảng điểm chi tiết định kỳ theo khối & môn học
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Tổng hợp và xuất file Excel đa sheet cho toàn bộ các lớp CTQT theo cơ sở, kỳ đánh giá định kỳ (GK1, CK1, HK1, GK2, CK2, HK2), nhiều khối lớp và danh sách môn tự chọn.
          </p>
        </div>

        {/* Summary strip */}
        <div className="flex items-center gap-2 text-xs font-semibold tabular-nums bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-[#003B3A]">
          <span>{selectedGrades.length} khối</span>
          <span className="text-slate-300">|</span>
          <span>{matchedClasses.length} lớp</span>
          <span className="text-slate-300">|</span>
          <span>{selectedSubjects.length} môn</span>
          <span className="text-slate-300">|</span>
          <span className="text-[#00736E]">{estimatedSheets} sheet</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5 tabular-nums">
        {/* Step 1: Campus & Periodic Period */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#00736E]" />
              Cơ sở xuất bảng điểm
            </label>
            <select
              value={campusId}
              onChange={e => setCampusId(e.target.value)}
              disabled={exporting}
              className="w-full text-xs font-semibold px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[#003B3A] focus:outline-none focus:ring-2 focus:ring-[#00A19A]/30 focus:border-[#008B85]"
            >
              <option value="">Tất cả cơ sở ({classes.length} lớp CTQT)</option>
              {campuses.map(cp => (
                <option key={cp.id} value={cp.id}>
                  {cp.campusName} ({campusCounts.get(cp.id) || 0} lớp)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#00736E]" />
              Kỳ đánh giá định kỳ
            </label>
            <select
              value={periodCode}
              onChange={e => setPeriodCode(e.target.value as CtqtPeriodicCode)}
              disabled={exporting}
              className="w-full text-xs font-semibold px-3 py-2.5 bg-[#F0FDFA] border border-[#008B85]/40 rounded-xl text-[#003B3A] focus:outline-none focus:ring-2 focus:ring-[#00A19A]/30 focus:border-[#008B85]"
            >
              {CTQT_PERIODIC_OPTIONS.map(opt => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">{periodMeta.description}</p>
          </div>
        </div>

        {/* Step 2: Grade multi-select */}
        <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00736E]" />
              <span className="text-xs font-bold text-[#003B3A]">Chọn khối lớp</span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  selectedGrades.length === 0
                    ? "bg-rose-50 text-[#E11D48] border-rose-200"
                    : "bg-white text-[#003B3A] border-[#E2E8F0]"
                }`}
              >
                {selectedGrades.length}/{availableGrades.length} khối ({matchedClasses.length} lớp)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => selectGradePreset("ALL")}
                disabled={exporting}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  isPresetActive("ALL")
                    ? "bg-[#003B3A] text-white border-[#003B3A]"
                    : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => selectGradePreset("PRIMARY")}
                disabled={exporting || !availableGrades.some(g => g.level === "PRIMARY")}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer disabled:opacity-40 ${
                  isPresetActive("PRIMARY")
                    ? "bg-[#00736E] text-white border-[#00736E]"
                    : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50"
                }`}
              >
                Tiểu học (K1–K5)
              </button>
              <button
                type="button"
                onClick={() => selectGradePreset("MIDDLE")}
                disabled={exporting || !availableGrades.some(g => g.level === "MIDDLE")}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer disabled:opacity-40 ${
                  isPresetActive("MIDDLE")
                    ? "bg-[#00736E] text-white border-[#00736E]"
                    : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50"
                }`}
              >
                THCS (K6–K9)
              </button>
              <button
                type="button"
                onClick={() => selectGradePreset("HIGH")}
                disabled={exporting || !availableGrades.some(g => g.level === "HIGH")}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer disabled:opacity-40 ${
                  isPresetActive("HIGH")
                    ? "bg-[#00736E] text-white border-[#00736E]"
                    : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50"
                }`}
              >
                THPT (K10–K12)
              </button>
              <button
                type="button"
                onClick={() => selectGradePreset("NONE")}
                disabled={exporting || selectedGrades.length === 0}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 text-[#E11D48] hover:bg-rose-100 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          {availableGrades.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">
              Không có lớp CTQT nào thuộc cơ sở đã chọn.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {availableGrades.map(item => {
                const checked = selectedGrades.includes(item.grade);
                return (
                  <button
                    key={item.grade}
                    type="button"
                    onClick={() => toggleGrade(item.grade)}
                    disabled={exporting}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      checked
                        ? "bg-[#F0FDFA] border-[#008B85] text-[#003B3A]"
                        : "bg-white border-[#E2E8F0] text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          checked ? "bg-[#00736E] border-[#00736E] text-white" : "border-slate-300 bg-white"
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </span>
                      Khối {item.grade}
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">{item.classCount}l</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 3: Subject multi-select */}
        <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#00736E]" />
              <span className="text-xs font-bold text-[#003B3A]">Chọn các môn học xuất</span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  selectedSubjects.length === 0
                    ? "bg-rose-50 text-[#E11D48] border-rose-200"
                    : "bg-white text-[#003B3A] border-[#E2E8F0]"
                }`}
              >
                {selectedSubjects.length}/{availableSubjects.length} môn
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedSubjects(availableSubjectCodes)}
                disabled={exporting || availableSubjectCodes.length === 0}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-[#003B3A] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40"
              >
                Chọn tất cả môn
              </button>
              <button
                type="button"
                onClick={() => setSelectedSubjects([])}
                disabled={exporting || selectedSubjects.length === 0}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 text-[#E11D48] hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-40"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          {selectedGrades.length === 0 ? (
            <div className="text-xs text-slate-500 py-1">
              Chọn ít nhất 1 khối lớp ở bước trên để hiển thị danh sách môn học tương ứng.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {availableSubjects.map(sub => {
                const checked = selectedSubjects.includes(sub.code);
                return (
                  <button
                    key={sub.code}
                    type="button"
                    onClick={() => toggleSubject(sub.code)}
                    disabled={exporting}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      checked
                        ? "bg-[#F0FDFA] border-[#008B85] text-[#003B3A]"
                        : "bg-white border-[#E2E8F0] text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center border ${
                        checked ? "bg-[#00736E] border-[#00736E] text-white" : "border-slate-300 bg-white"
                      }`}
                    >
                      {checked && <Check className="w-3 h-3" />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">
                        {sub.nameVi} <span className="text-slate-500 font-normal">({sub.code})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {formatLevelsLabel(sub.levels)}
                        {sub.isQualitative ? " · Nhận xét định tính" : ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 4: Export options + Action button */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-2 border-t border-[#F1F5F9]">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#00736E]" />
              Tùy chọn nội dung file Excel
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-700">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOverview}
                  onChange={e => setIncludeOverview(e.target.checked)}
                  disabled={exporting}
                  className="rounded border-slate-300 text-[#00736E] focus:ring-[#00A19A]"
                />
                Sheet Tổng quan & Thống kê
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={e => setIncludeSummary(e.target.checked)}
                  disabled={exporting}
                  className="rounded border-slate-300 text-[#00736E] focus:ring-[#00A19A]"
                />
                Sheet TỔNG HỢP đa môn
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeComments}
                  onChange={e => setIncludeComments(e.target.checked)}
                  disabled={exporting}
                  className="rounded border-slate-300 text-[#00736E] focus:ring-[#00A19A]"
                />
                Kèm nhận xét song ngữ (EN / VI)
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCompetencies}
                  onChange={e => setIncludeCompetencies(e.target.checked)}
                  disabled={exporting}
                  className="rounded border-slate-300 text-[#00736E] focus:ring-[#00A19A]"
                />
                Kèm Năng lực cốt lõi
              </label>

              {periodMeta.mode !== "FULL" && (
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAllScoreCols}
                    onChange={e => setIncludeAllScoreCols(e.target.checked)}
                    disabled={exporting}
                    className="rounded border-slate-300 text-[#00736E] focus:ring-[#00A19A]"
                  />
                  Kèm đủ cột KTTX & các cột khác trong HK{periodMeta.semester}
                </label>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportPeriodic}
            disabled={exporting || selectedGrades.length === 0 || selectedSubjects.length === 0}
            className="shrink-0 px-5 py-3 bg-[#003B3A] hover:bg-[#002B2A] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tạo bảng điểm Excel...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Xuất bảng điểm chi tiết định kỳ (.xlsx)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
