"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders, Check, RotateCcw, Save, Layers, School, Sparkles, Loader2, Eye, EyeOff, Settings2
} from "lucide-react";
import {
  SECTION_DEFINITIONS,
  DEFAULT_PROFILE_SECTIONS,
  ProfileSectionVisibility,
  normalizeGradeKey,
  normalizeEduSystemKey,
} from "@/lib/studentProfileSectionConfig";

interface StudentProfileInlineSectionTogglesProps {
  configMap: Record<string, Record<string, boolean>>;
  onConfigMapChange: (newMap: Record<string, Record<string, boolean>>) => void;
  selectedStudent?: any;
  selectedGradeFilter?: string;
  academicYearId?: string;
  onOpenFullModal?: () => void;
}

const GRADE_OPTIONS = [
  { value: "ALL", label: "Tất cả Khối" },
  { value: "1", label: "Khối 1" },
  { value: "2", label: "Khối 2" },
  { value: "3", label: "Khối 3" },
  { value: "4", label: "Khối 4" },
  { value: "5", label: "Khối 5" },
  { value: "6", label: "Khối 6" },
  { value: "7", label: "Khối 7" },
  { value: "8", label: "Khối 8" },
  { value: "9", label: "Khối 9" },
  { value: "10", label: "Khối 10" },
  { value: "11", label: "Khối 11" },
  { value: "12", label: "Khối 12" },
  { value: "12 đến 18 tháng", label: "MN 12-18 tháng" },
  { value: "18 đến 24 tháng", label: "MN 18-24 tháng" },
  { value: "24 đến 36 tháng", label: "MN 24-36 tháng" },
  { value: "3 đến 4 tuổi", label: "MN 3-4 tuổi" },
  { value: "4 đến 5 tuổi", label: "MN 4-5 tuổi" },
  { value: "5 đến 6 tuổi", label: "MN 5-6 tuổi" },
];

const EDU_OPTIONS = [
  { value: "ALL", label: "Tất cả Hệ học" },
  { value: "HNG", label: "Hệ Hội nhập Quốc tế (HNG)" },
  { value: "HNS", label: "Hệ Hội nhập Sky-Line (HNS)" },
  { value: "SB", label: "Hệ Song bằng (SB)" },
  { value: "MNG", label: "Hệ Mầm non Quốc tế (MNG)" },
  { value: "MNS", label: "Hệ Mầm non Hội nhập (MNS)" },
];

export default function StudentProfileInlineSectionToggles({
  configMap,
  onConfigMapChange,
  selectedStudent,
  selectedGradeFilter,
  academicYearId,
  onOpenFullModal,
}: StudentProfileInlineSectionTogglesProps) {
  const [targetGrade, setTargetGrade] = useState<string>("ALL");
  const [targetEdu, setTargetEdu] = useState<string>("ALL");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string>("");

  // Sync targetGrade when top filter changes
  useEffect(() => {
    if (selectedGradeFilter && selectedGradeFilter !== "all") {
      setTargetGrade(normalizeGradeKey(selectedGradeFilter));
    }
  }, [selectedGradeFilter]);

  // Resolve current visibility for the selected (targetGrade, targetEdu)
  const getResolvedSections = (): ProfileSectionVisibility => {
    const exactKey = `${targetGrade}_${targetEdu}`;
    if (configMap[exactKey]) {
      return { ...DEFAULT_PROFILE_SECTIONS, ...configMap[exactKey] };
    }
    if (configMap[`${targetGrade}_ALL`]) {
      return { ...DEFAULT_PROFILE_SECTIONS, ...configMap[`${targetGrade}_ALL`] };
    }
    if (configMap[`ALL_${targetEdu}`]) {
      return { ...DEFAULT_PROFILE_SECTIONS, ...configMap[`ALL_${targetEdu}`] };
    }
    if (configMap["ALL_ALL"] || configMap["DEFAULT"]) {
      return { ...DEFAULT_PROFILE_SECTIONS, ...(configMap["ALL_ALL"] || configMap["DEFAULT"]) };
    }
    return { ...DEFAULT_PROFILE_SECTIONS };
  };

  const currentSections = getResolvedSections();

  const saveSectionsToServer = async (
    grade: string,
    edu: string,
    newSections: ProfileSectionVisibility,
    triggerKey: string
  ) => {
    const configKey = `${grade}_${edu}`;
    // Optimistic update immediately so UI and A4 preview respond in 0ms
    const optimisticMap = {
      ...configMap,
      [configKey]: { ...newSections },
    };
    onConfigMapChange(optimisticMap);

    try {
      setSavingKey(triggerKey);
      const res = await fetch("/api/admin/student-profiles/section-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade,
          educationSystem: edu,
          sections: newSections,
          academicYearId: academicYearId || null,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        onConfigMapChange(json.data);
        setSaveToast(
          `Đã lưu cấu hình (${grade === "ALL" ? "Tất cả Khối" : `Khối ${grade}`} • ${
            edu === "ALL" ? "Tất cả Hệ" : `Hệ ${edu}`
          })`
        );
        setTimeout(() => setSaveToast(""), 2500);
      }
    } catch (e) {
      console.error("Failed to save inline section toggle:", e);
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleSection = (key: keyof ProfileSectionVisibility) => {
    const updated: ProfileSectionVisibility = {
      ...currentSections,
      [key]: !currentSections[key],
    };
    saveSectionsToServer(targetGrade, targetEdu, updated, key);
  };

  const handleToggleAll = (enable: boolean) => {
    const updated: any = { ...currentSections };
    SECTION_DEFINITIONS.forEach((sec) => {
      updated[sec.key] = enable;
    });
    saveSectionsToServer(targetGrade, targetEdu, updated, "ALL");
  };

  const handleUseCurrentStudentScope = () => {
    if (!selectedStudent) return;
    const g = normalizeGradeKey(
      selectedStudent.grade ||
        selectedStudent.class?.grade ||
        selectedStudent.className ||
        selectedStudent.class?.className
    );
    const e = normalizeEduSystemKey(
      selectedStudent.educationSystem ||
        selectedStudent.class?.educationSystem ||
        selectedStudent.studyProgram ||
        selectedStudent.className ||
        selectedStudent.class?.className
    );
    setTargetGrade(g);
    setTargetEdu(e);
  };

  const enabledCount = SECTION_DEFINITIONS.filter((s) => currentSections[s.key]).length;

  return (
    <div className="bg-gradient-to-r from-teal-50/70 via-white to-emerald-50/50 border-2 border-teal-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 border-b border-teal-200/60 pb-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-8 h-8 rounded-xl bg-[#00A19A] text-white flex items-center justify-center shadow-2xs shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-black text-[#003B3A] uppercase tracking-wide">
                TÙY CHỌN BẬT / TẮT CÁC MỤC TRÊN HỒ SƠ HỌC SINH
              </h4>
              <span className="text-[10px] font-black bg-teal-100 text-teal-900 border border-teal-300 px-2 py-0.5 rounded-full">
                Đang bật {enabledCount}/{SECTION_DEFINITIONS.length} mục
              </span>
              {saveToast && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3 h-3" />
                  {saveToast}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Tích chọn theo <b>Khối</b> và <b>Hệ học</b> thì các mục tương ứng sẽ xuất hiện trên Hồ sơ (Áp dụng trực tiếp cho cả Xem A4 &amp; In/Xuất PDF)
            </p>
          </div>
        </div>

        {/* Scope Selectors: Khối & Hệ học */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-teal-300 rounded-xl px-2.5 py-1 shadow-2xs">
            <Layers className="w-3.5 h-3.5 text-[#00A19A]" />
            <span className="text-[10px] font-black text-slate-500 uppercase">Khối:</span>
            <select
              value={targetGrade}
              onChange={(e) => setTargetGrade(e.target.value)}
              className="text-xs font-extrabold text-[#003B3A] bg-transparent focus:outline-none cursor-pointer"
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-teal-300 rounded-xl px-2.5 py-1 shadow-2xs">
            <School className="w-3.5 h-3.5 text-[#00A19A]" />
            <span className="text-[10px] font-black text-slate-500 uppercase">Hệ học:</span>
            <select
              value={targetEdu}
              onChange={(e) => setTargetEdu(e.target.value)}
              className="text-xs font-extrabold text-[#003B3A] bg-transparent focus:outline-none cursor-pointer"
            >
              {EDU_OPTIONS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          {selectedStudent && (
            <button
              type="button"
              onClick={handleUseCurrentStudentScope}
              className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-bold transition cursor-pointer"
              title="Lấy tự động Khối & Hệ học của học sinh đang xem"
            >
              Theo HS đang xem ({selectedStudent.className || "Lớp"})
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleToggleAll(true)}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition cursor-pointer"
            >
              Bật tất cả
            </button>
            <button
              type="button"
              onClick={() => handleToggleAll(false)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold transition cursor-pointer"
            >
              Tắt tất cả
            </button>
            {onOpenFullModal && (
              <button
                type="button"
                onClick={onOpenFullModal}
                className="px-2.5 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#005B55] text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                title="Mở bảng cấu hình chi tiết theo ma trận Khối & Hệ học"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chi tiết</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Switches Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {SECTION_DEFINITIONS.map((sec) => {
          const isChecked = Boolean(currentSections[sec.key]);
          const isBusy = savingKey === sec.key || savingKey === "ALL";
          return (
            <button
              key={sec.key}
              type="button"
              onClick={() => handleToggleSection(sec.key)}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer select-none ${
                isChecked
                  ? "bg-white border-[#00A19A] shadow-2xs ring-1 ring-[#00A19A]/25"
                  : "bg-slate-100/70 border-slate-200 opacity-65 hover:opacity-100"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div
                  className={`text-[11px] font-extrabold leading-tight truncate ${
                    isChecked ? "text-[#003B3A]" : "text-slate-500 line-through"
                  }`}
                  title={sec.label}
                >
                  {sec.label}
                </div>
                <div className="text-[9px] text-slate-400 font-semibold truncate mt-0.5">
                  {isChecked ? "Đang hiển thị trên Hồ sơ" : "Đang ẩn khỏi Hồ sơ"}
                </div>
              </div>

              {/* Visual Switch */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isBusy ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#00A19A] animate-spin" />
                ) : (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      isChecked
                        ? "bg-teal-100 text-teal-900 border border-teal-300"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isChecked ? "BẬT" : "TẮT"}
                  </span>
                )}
                <div
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                    isChecked ? "bg-[#00A19A]" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      isChecked ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
