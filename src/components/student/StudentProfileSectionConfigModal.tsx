"use client";

import React, { useState, useEffect } from "react";
import {
  X, Check, Settings2, Sliders, CheckSquare, Square,
  RotateCcw, Save, Layers, School, Info, ShieldCheck, Sparkles, Loader2, Lock, Unlock
} from "lucide-react";
import {
  SECTION_DEFINITIONS,
  DEFAULT_PROFILE_SECTIONS,
  ProfileSectionVisibility,
} from "@/lib/studentProfileSectionConfig";

interface StudentProfileSectionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYearId?: string;
  onSaved?: () => void;
}

const GRADE_LIST = [
  { value: "ALL", label: "Tất cả các khối" },
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
  { value: "12 đến 18 tháng", label: "MN 12 - 18 tháng" },
  { value: "18 đến 24 tháng", label: "MN 18 - 24 tháng" },
  { value: "24 đến 36 tháng", label: "MN 24 - 36 tháng" },
  { value: "3 đến 4 tuổi", label: "MN 3 - 4 tuổi" },
  { value: "4 đến 5 tuổi", label: "MN 4 - 5 tuổi" },
  { value: "5 đến 6 tuổi", label: "MN 5 - 6 tuổi" },
];

const EDU_SYSTEM_LIST = [
  { value: "ALL", label: "Tất cả các hệ học" },
  { value: "HNG", label: "Hội nhập Quốc tế (HNG)" },
  { value: "HNS", label: "Hội nhập Sky-Line (HNS)" },
  { value: "SB", label: "Song bằng Quốc tế (SB)" },
  { value: "MNG", label: "Mầm non Quốc tế (MNG)" },
  { value: "MNS", label: "Mầm non Hội nhập (MNS)" },
];

export default function StudentProfileSectionConfigModal({
  isOpen,
  onClose,
  academicYearId,
  onSaved,
}: StudentProfileSectionConfigModalProps) {
  const [selectedGrade, setSelectedGrade] = useState("ALL");
  const [selectedEdu, setSelectedEdu] = useState("ALL");
  const [configMap, setConfigMap] = useState<Record<string, Record<string, boolean>>>({});
  const [currentSections, setCurrentSections] = useState<ProfileSectionVisibility>({
    ...DEFAULT_PROFILE_SECTIONS,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const url = academicYearId
        ? `/api/admin/student-profiles/section-config?academicYearId=${academicYearId}`
        : `/api/admin/student-profiles/section-config`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.data) {
        setConfigMap(data.data);
      }
    } catch (err: any) {
      console.error("Load section config error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConfigs();
      setSuccessMsg("");
      setErrorMsg("");
    }
  }, [isOpen, academicYearId]);

  // When selectedGrade or selectedEdu changes, re-populate currentSections
  useEffect(() => {
    const targetCode = `${selectedGrade}_${selectedEdu}`;
    if (configMap[targetCode]) {
      setCurrentSections({
        ...DEFAULT_PROFILE_SECTIONS,
        ...configMap[targetCode],
      });
    } else if (configMap[`${selectedGrade}_ALL`]) {
      setCurrentSections({
        ...DEFAULT_PROFILE_SECTIONS,
        ...configMap[`${selectedGrade}_ALL`],
      });
    } else if (configMap[`ALL_${selectedEdu}`]) {
      setCurrentSections({
        ...DEFAULT_PROFILE_SECTIONS,
        ...configMap[`ALL_${selectedEdu}`],
      });
    } else if (configMap["ALL_ALL"] || configMap["DEFAULT"]) {
      setCurrentSections({
        ...DEFAULT_PROFILE_SECTIONS,
        ...(configMap["ALL_ALL"] || configMap["DEFAULT"]),
      });
    } else {
      setCurrentSections({ ...DEFAULT_PROFILE_SECTIONS });
    }
  }, [selectedGrade, selectedEdu, configMap]);

  if (!isOpen) return null;

  const handleToggle = (key: string) => {
    setCurrentSections((prev: any) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = (val: boolean) => {
    const updated: any = { ...currentSections };
    SECTION_DEFINITIONS.forEach((sec) => {
      updated[sec.key] = val;
    });
    setCurrentSections(updated);
  };

  const handleSave = async (applyToAll: boolean = false) => {
    try {
      setSaving(true);
      setErrorMsg("");
      setSuccessMsg("");

      const targetGrade = applyToAll ? "ALL" : selectedGrade;
      const targetEdu = applyToAll ? "ALL" : selectedEdu;

      const res = await fetch("/api/admin/student-profiles/section-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: targetGrade,
          educationSystem: targetEdu,
          sections: currentSections,
          academicYearId: academicYearId || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setConfigMap(data.data || {});
        setSuccessMsg(
          applyToAll
            ? "Đã lưu và áp dụng cho TẤT CẢ các khối và hệ học!"
            : `Đã lưu cấu hình cho Khối ${selectedGrade === "ALL" ? "Tất cả" : selectedGrade} - Hệ ${selectedEdu === "ALL" ? "Tất cả" : selectedEdu}!`
        );
        if (onSaved) onSaved();
      } else {
        setErrorMsg(data.error || "Lỗi lưu cấu hình");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi hệ thống khi lưu cấu hình");
    } finally {
      setSaving(false);
    }
  };

  const targetCode = `${selectedGrade}_${selectedEdu}`;
  const isCustomizedForCurrent = Boolean(configMap[targetCode]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003B3A] via-[#00A19A] to-[#0f4c5c] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-teal-200">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                CẤU HÌNH HIỂN THỊ HỒ SƠ HỌC SINH
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-400/20 border border-teal-300/30 text-teal-100 font-normal">
                  Khối &amp; Hệ học
                </span>
              </h3>
              <p className="text-xs text-teal-100/90 font-medium">
                Tích chọn các mục sẽ xuất hiện trên Hồ sơ năng lực (Xem trực tuyến &amp; Xuất PDF/In)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Select Khối & Hệ học */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#00A19A]" />
                Phạm vi áp dụng cấu hình
              </span>
              {isCustomizedForCurrent ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Đã có cấu hình riêng
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Đang dùng cấu hình chung
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  1. Chọn Khối lớp:
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A19A]"
                >
                  {GRADE_LIST.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  2. Chọn Hệ học:
                </label>
                <select
                  value={selectedEdu}
                  onChange={(e) => setSelectedEdu(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A19A]"
                >
                  {EDU_SYSTEM_LIST.map((es) => (
                    <option key={es.value} value={es.value}>
                      {es.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-teal-50/60 border border-teal-100 p-2.5 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                Khi chọn <strong>"Tất cả"</strong>, cấu hình sẽ áp dụng mặc định cho các Khối/Hệ chưa có cấu hình riêng lẻ. Khi chọn cụ thể Khối và Hệ (ví dụ: Khối 1 - Hệ Song bằng), hệ thống sẽ ưu tiên áp dụng cấu hình riêng này khi xuất Hồ sơ.
              </span>
            </div>
          </div>

          {/* Toggle Mở / Khóa Cổng Phụ huynh */}
          <div
            onClick={() => handleToggle("parentPortalUnlocked")}
            className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-center justify-between gap-3 ${
              currentSections.parentPortalUnlocked
                ? "bg-emerald-50/80 border-emerald-300 shadow-2xs"
                : "bg-amber-50/80 border-amber-300 shadow-2xs"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white ${
                  currentSections.parentPortalUnlocked ? "bg-emerald-600" : "bg-amber-500"
                }`}
              >
                {currentSections.parentPortalUnlocked ? (
                  <Unlock className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
                  <span>MỞ KHÓA HỒ SƠ HỌC SINH CHO PHỤ HUYNH XEM</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      currentSections.parentPortalUnlocked
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}
                  >
                    {currentSections.parentPortalUnlocked ? "ĐANG MỞ KHÓA" : "ĐANG KHÓA"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {currentSections.parentPortalUnlocked
                    ? "Phụ huynh thuộc phạm vi này được phép xem đầy đủ Hồ sơ Năng lực Học sinh."
                    : 'Khi khóa, Phụ huynh sẽ thấy: "Hồ sơ đang cập nhật, Hệ thống sẽ mở định kỳ giữa Kỳ 1, Cuối Kỳ 1, Giữa kỳ 2, Cuối kỳ 2 để phụ huynh truy cập".'}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(currentSections.parentPortalUnlocked)}
              onChange={() => {}}
              className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer shrink-0"
            />
          </div>

          {/* Quick toggle actions */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
              Danh sách các mục Hồ sơ ({SECTION_DEFINITIONS.length} mục)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectAll(true)}
                className="text-xs font-bold text-[#00A19A] hover:underline flex items-center gap-1"
              >
                <CheckSquare className="w-3.5 h-3.5" /> Chọn tất cả
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => handleSelectAll(false)}
                className="text-xs font-bold text-slate-500 hover:underline flex items-center gap-1"
              >
                <Square className="w-3.5 h-3.5" /> Bỏ chọn hết
              </button>
            </div>
          </div>

          {/* Checkboxes List */}
          <div className="space-y-2.5">
            {SECTION_DEFINITIONS.map((sec) => {
              const isChecked = Boolean((currentSections as any)[sec.key]);
              return (
                <div
                  key={sec.key}
                  onClick={() => handleToggle(sec.key)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                    isChecked
                      ? "bg-white border-[#00A19A]/50 shadow-xs ring-1 ring-[#00A19A]/15"
                      : "bg-slate-100/70 border-slate-200 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent onClick
                        className="w-4 h-4 rounded text-[#00A19A] focus:ring-[#00A19A] border-slate-300 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                        <span>{sec.label}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                          {sec.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {sec.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        isChecked
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isChecked ? "Hiển thị" : "Ẩn"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Note about removed Career Orientation */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Lưu ý:</strong> Mục <em>"VII. ĐỊNH HƯỚNG NGHỀ NGHIỆP &amp; HƯỚNG NGHIỆP"</em> đã được lược bỏ khỏi Hồ sơ theo đúng chỉ đạo mới nhất.
            </div>
          </div>

          {/* Feedback messages */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
              <X className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 px-6 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Áp dụng cho TẤT CẢ Khối &amp; Hệ
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="px-5 py-2 bg-gradient-to-r from-[#00A19A] to-[#00817a] hover:from-[#00817a] hover:to-[#006660] text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu cấu hình
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
