"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Globe,
  Plane,
  Home,
  Plus,
  Trash2,
  Paperclip,
  Upload,
  Eye,
  CheckCircle2,
  FileText,
  AlertCircle,
  Trophy,
  Award,
  Sparkles,
  Calculator
} from "lucide-react";
import {
  EntranceAcademicRecord,
  ProgramType,
  SubjectScoreItem,
  FileAttachment,
  parseEntranceRecord,
  serializeEntranceRecord,
  getDefaultMoetSubjects,
  THPT_COMBINATION_PRESETS,
  calculateCombinationAverage
} from "@/lib/entranceAcademicRecord";

interface EntranceAcademicRecordInputProps {
  value?: string | null;
  grade?: string;
  hocKy?: string;
  onChange: (serializedJson: string) => void;
  disabled?: boolean;
  hideSubjectScores?: boolean;
}

export function EntranceAcademicRecordInput({
  value,
  grade = "1",
  hocKy,
  onChange,
  disabled = false,
  hideSubjectScores = false
}: EntranceAcademicRecordInputProps) {
  // Parse state từ prop value ban đầu
  const [record, setRecord] = useState<EntranceAcademicRecord>(() => {
    return parseEntranceRecord(value, grade);
  });

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quản lý chế độ khảo sát Khối 1: Đầu năm (Chưa có học bạ) vs HK2 (Bổ sung điểm)
  const numericGrade = parseInt(grade || "1", 10);
  const isGrade1 = numericGrade === 1;
  const initialG1Mode = record.grade1IntakeMode || (hocKy && (hocKy.includes("2") || hocKy.toLowerCase().includes("hk2")) ? "HK2" : "DAU_NAM");
  const [grade1Mode, setGrade1Mode] = useState<"DAU_NAM" | "HK2">(initialG1Mode);

  useEffect(() => {
    if (isGrade1) {
      if (record.grade1IntakeMode) {
        setGrade1Mode(record.grade1IntakeMode);
      } else if (hocKy && (hocKy.includes("2") || hocKy.toLowerCase().includes("hk2"))) {
        setGrade1Mode("HK2");
      }
    }
  }, [grade, hocKy, record.grade1IntakeMode, isGrade1]);

  // Khi grade thay đổi từ bên ngoài và đang dùng Bộ GD&ĐT, cập nhật môn học phù hợp nếu chưa nhập
  useEffect(() => {
    if (record.programType === "BO_GD_DT") {
      const g = parseInt(grade || "1", 10);
      const isPrimary = !isNaN(g) && g <= 5;
      const defaultSubs = getDefaultMoetSubjects(grade);
      setRecord(prev => {
        const currentSubs = prev.moet?.subjects || [];
        // Nếu danh sách môn rỗng hoặc khác biệt cấu trúc cấp học, cập nhật lại
        const needsUpdate = currentSubs.length === 0 || (isPrimary && !currentSubs.some(s => s.id === "tieng_viet")) || (!isPrimary && currentSubs.some(s => s.id === "tieng_viet"));
        if (needsUpdate) {
          const updated: EntranceAcademicRecord = {
            ...prev,
            moet: {
              ...prev.moet!,
              gradeLevel: grade,
              overallRating: isPrimary ? (prev.moet?.overallRating || "Hoàn thành tốt") : (prev.moet?.overallRating || "Tốt"),
              subjects: defaultSubs
            }
          };
          onChange(serializeEntranceRecord(updated));
          return updated;
        }
        return prev;
      });
    }
  }, [grade]);

  // Cập nhật và kích hoạt onChange
  const updateRecord = (updater: (prev: EntranceAcademicRecord) => EntranceAcademicRecord) => {
    setRecord(prev => {
      const next = updater(prev);
      const serialized = serializeEntranceRecord(next);
      onChange(serialized);
      return next;
    });
  };

  // Chuyển đổi loại chương trình
  const handleProgramTypeChange = (type: ProgramType) => {
    updateRecord(prev => ({
      ...prev,
      programType: type
    }));
  };

  // Quản lý chế độ Khối 1: Đầu năm (Không áp dụng) vs HK2 (Bổ sung môn)
  const handleGrade1ModeChange = (mode: "DAU_NAM" | "HK2") => {
    setGrade1Mode(mode);
    updateRecord(prev => ({
      ...prev,
      grade1IntakeMode: mode
    }));
  };

  // Thao tác môn học chương trình Bộ GD&ĐT
  const handleMoetSubjectChange = (index: number, field: keyof SubjectScoreItem, val: string) => {
    updateRecord(prev => {
      const list = [...(prev.moet?.subjects || [])];
      if (list[index]) {
        list[index] = { ...list[index], [field]: val };
      }
      return {
        ...prev,
        moet: {
          ...prev.moet!,
          subjects: list
        }
      };
    });
  };

  const addMoetSubject = () => {
    updateRecord(prev => ({
      ...prev,
      moet: {
        ...prev.moet!,
        subjects: [
          ...(prev.moet?.subjects || []),
          { id: `sub_${Date.now()}`, name: "", score: "" }
        ]
      }
    }));
  };

  const removeMoetSubject = (index: number) => {
    updateRecord(prev => ({
      ...prev,
      moet: {
        ...prev.moet!,
        subjects: (prev.moet?.subjects || []).filter((_, i) => i !== index)
      }
    }));
  };

  // Thao tác môn tổ hợp lựa chọn THPT
  const handleSelectCombinationPreset = (presetId: string) => {
    if (!presetId) {
      updateRecord(prev => ({
        ...prev,
        moet: {
          ...prev.moet!,
          combination: undefined
        }
      }));
      return;
    }

    const preset = THPT_COMBINATION_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const defaultSubs: SubjectScoreItem[] = preset.defaultSubjects.map((sName, i) => ({
      id: `comb_${presetId.toLowerCase()}_${i}_${Date.now()}`,
      name: sName,
      score: ""
    }));

    updateRecord(prev => ({
      ...prev,
      moet: {
        ...prev.moet!,
        combination: {
          name: preset.name,
          score: "",
          subjects: defaultSubs
        }
      }
    }));
  };

  const handleCombinationSubjectChange = (subIndex: number, field: "name" | "score", val: string) => {
    updateRecord(prev => {
      const currentComb = prev.moet?.combination || { name: "Tổ hợp Khoa học Tự nhiên", subjects: [] };
      const list = [...(currentComb.subjects || [])];
      if (list[subIndex]) {
        list[subIndex] = { ...list[subIndex], [field]: val };
      }
      const autoAvg = calculateCombinationAverage(list);
      return {
        ...prev,
        moet: {
          ...prev.moet!,
          combination: {
            ...currentComb,
            subjects: list,
            score: autoAvg || currentComb.score || ""
          }
        }
      };
    });
  };

  const addCombinationSubject = () => {
    updateRecord(prev => {
      const currentComb = prev.moet?.combination || { name: "Tổ hợp Khoa học Tự nhiên", subjects: [] };
      const list = [
        ...(currentComb.subjects || []),
        { id: `comb_sub_${Date.now()}`, name: "", score: "" }
      ];
      return {
        ...prev,
        moet: {
          ...prev.moet!,
          combination: {
            ...currentComb,
            subjects: list
          }
        }
      };
    });
  };

  const removeCombinationSubject = (subIndex: number) => {
    updateRecord(prev => {
      const currentComb = prev.moet?.combination;
      if (!currentComb) return prev;
      const list = (currentComb.subjects || []).filter((_, i) => i !== subIndex);
      const autoAvg = calculateCombinationAverage(list);
      return {
        ...prev,
        moet: {
          ...prev.moet!,
          combination: {
            ...currentComb,
            subjects: list,
            score: autoAvg
          }
        }
      };
    });
  };

  // Thao tác môn học Song ngữ
  const handleBilingualSubjectChange = (branch: "moet" | "intl", index: number, field: keyof SubjectScoreItem, val: string) => {
    updateRecord(prev => {
      const bi = prev.bilingual!;
      if (branch === "moet") {
        const list = [...bi.moetSubjects];
        list[index] = { ...list[index], [field]: val };
        return { ...prev, bilingual: { ...bi, moetSubjects: list } };
      } else {
        const list = [...bi.internationalSubjects];
        list[index] = { ...list[index], [field]: val };
        return { ...prev, bilingual: { ...bi, internationalSubjects: list } };
      }
    });
  };

  const addBilingualSubject = (branch: "moet" | "intl") => {
    updateRecord(prev => {
      const bi = prev.bilingual!;
      if (branch === "moet") {
        return {
          ...prev,
          bilingual: {
            ...bi,
            moetSubjects: [...bi.moetSubjects, { id: `vn_${Date.now()}`, name: "", score: "" }]
          }
        };
      } else {
        return {
          ...prev,
          bilingual: {
            ...bi,
            internationalSubjects: [...bi.internationalSubjects, { id: `intl_${Date.now()}`, name: "", score: "" }]
          }
        };
      }
    });
  };

  const removeBilingualSubject = (branch: "moet" | "intl", index: number) => {
    updateRecord(prev => {
      const bi = prev.bilingual!;
      if (branch === "moet") {
        return { ...prev, bilingual: { ...bi, moetSubjects: bi.moetSubjects.filter((_, i) => i !== index) } };
      } else {
        return { ...prev, bilingual: { ...bi, internationalSubjects: bi.internationalSubjects.filter((_, i) => i !== index) } };
      }
    });
  };

  // Thao tác môn học Nước ngoài
  const handleForeignSubjectChange = (index: number, field: keyof SubjectScoreItem, val: string) => {
    updateRecord(prev => {
      const list = [...(prev.foreign?.subjects || [])];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, foreign: { ...prev.foreign!, subjects: list } };
    });
  };

  const addForeignSubject = () => {
    updateRecord(prev => ({
      ...prev,
      foreign: {
        ...prev.foreign!,
        subjects: [...(prev.foreign?.subjects || []), { id: `f_${Date.now()}`, name: "", score: "" }]
      }
    }));
  };

  const removeForeignSubject = (index: number) => {
    updateRecord(prev => ({
      ...prev,
      foreign: {
        ...prev.foreign!,
        subjects: (prev.foreign?.subjects || []).filter((_, i) => i !== index)
      }
    }));
  };

  // Thao tác môn học Homeschooling
  const handleHomeschoolSubjectChange = (index: number, field: keyof SubjectScoreItem, val: string) => {
    updateRecord(prev => {
      const list = [...(prev.homeschool?.subjects || [])];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, homeschool: { ...prev.homeschool!, subjects: list } };
    });
  };

  const addHomeschoolSubject = () => {
    updateRecord(prev => ({
      ...prev,
      homeschool: {
        ...prev.homeschool!,
        subjects: [...(prev.homeschool?.subjects || []), { id: `hs_${Date.now()}`, name: "", score: "" }]
      }
    }));
  };

  const removeHomeschoolSubject = (index: number) => {
    updateRecord(prev => ({
      ...prev,
      homeschool: {
        ...prev.homeschool!,
        subjects: (prev.homeschool?.subjects || []).filter((_, i) => i !== index)
      }
    }));
  };

  // Xử lý Upload file đính kèm
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("File vượt quá dung lượng tối đa 15MB");
      return;
    }

    try {
      setIsUploading(true);
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/student-transcripts/upload", {
        method: "POST",
        body: fd
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Tải lên thất bại");
      }

      updateRecord(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), data.file]
      }));
    } catch (err: any) {
      alert(err.message || "Lỗi khi tải file lên");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    updateRecord(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, i) => i !== index)
    }));
  };

  const isPrimary = !isNaN(numericGrade) && numericGrade <= 5;
  const isHighSchool = !isNaN(numericGrade) && numericGrade >= 10;
  const fInp = "raw-input raw-select w-full h-10 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 disabled:bg-slate-100 disabled:text-slate-500";

  return (
    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
      {/* 1. THANH CHỌN CHƯƠNG TRÌNH ĐƠN NHẤT (NO ICONS) */}
      <div>
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
          Chương trình học tập trước đây <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-200/60 p-1.5 rounded-lg border border-slate-200">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleProgramTypeChange("BO_GD_DT")}
            className={`flex items-center justify-center py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
              record.programType === "BO_GD_DT"
                ? "bg-[#00736E] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
            }`}
          >
            <span>Bộ GD&amp;ĐT</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleProgramTypeChange("SONG_NGU")}
            className={`flex items-center justify-center py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
              record.programType === "SONG_NGU"
                ? "bg-[#00736E] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
            }`}
          >
            <span>Song ngữ / Tích hợp</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleProgramTypeChange("NUOC_NGOAI")}
            className={`flex items-center justify-center py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
              record.programType === "NUOC_NGOAI"
                ? "bg-[#00736E] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
            }`}
          >
            <span>Nước ngoài</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleProgramTypeChange("HOMESCHOOLING")}
            className={`flex items-center justify-center py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
              record.programType === "HOMESCHOOLING"
                ? "bg-[#00736E] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
            }`}
          >
            <span>Homeschooling</span>
          </button>
        </div>
      </div>

      {/* LỰA CHỌN THỜI ĐIỂM BẢNG ĐIỂM / HỌC BẠ (NO ICONS) */}
      {(!isGrade1 || grade1Mode === "HK2") && record.programType !== "NUOC_NGOAI" && record.programType !== "HOMESCHOOLING" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="border-l-3 border-[#00736E] pl-2.5">
            <span className="text-xs font-bold text-slate-800 block">Bảng điểm / Học bạ nộp hồ sơ</span>
            <span className="text-[11px] text-slate-500">Chọn thời điểm kết quả học tập ghi nhận trên học bạ</span>
          </div>
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            {[
              { id: "HK1", label: "Học kỳ 1 (HK1)" },
              { id: "HK2", label: "Học kỳ 2 (HK2)" },
              { id: "CA_NAM", label: "Cả năm" }
            ].map(item => {
              const cur = record.transcriptPeriod || "CA_NAM";
              const isSelected = cur === item.id || (item.id === "CA_NAM" && cur === "Cả năm");
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => updateRecord(prev => ({ ...prev, transcriptPeriod: item.id as any }))}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#00736E] text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. KHU VỰC NHẬP LIỆU THÍCH ỨNG THEO CHƯƠNG TRÌNH */}

      {/* ──────────────── PROGRAM 1: BỘ GD&ĐT ──────────────── */}
      {record.programType === "BO_GD_DT" && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
          {/* Đánh giá chung & Rèn luyện */}
          {isGrade1 && grade1Mode === "DAU_NAM" ? (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-3.5 text-center pb-3 mb-1">
              <p className="text-xs font-bold text-slate-700">
                KQ Xếp loại &amp; KQ Rèn luyện: <span className="text-teal-700 uppercase bg-teal-50 px-2 py-0.5 rounded border border-teal-200">Không áp dụng</span>
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Trường hợp Khối 1 khảo sát đầu năm / HK1: Chưa có hồ sơ học bạ lớp 1 nên hệ thống tự động miễn áp dụng KQ Xếp loại và KQ Rèn luyện.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isPrimary ? "Kết quả giáo dục chung (TT 27/2020 & TT 22/2016)" : "Học lực chung (TT 22/2021 & TT 58/2011)"}
                </label>
                {isPrimary ? (
                  <select
                    disabled={disabled}
                    value={record.moet?.overallRating || "Hoàn thành tốt"}
                    onChange={(e) => updateRecord(prev => ({
                      ...prev,
                      overallRating: e.target.value,
                      moet: { ...prev.moet!, overallRating: e.target.value }
                    }))}
                    className={fInp + " cursor-pointer"}
                  >
                    <optgroup label="Kết quả giáo dục chung (TT 27/2020 & TT 22/2016)">
                      <option value="Hoàn thành xuất sắc">Hoàn thành xuất sắc</option>
                      <option value="Hoàn thành tốt">Hoàn thành tốt</option>
                      <option value="Hoàn thành">Hoàn thành</option>
                      <option value="Chưa hoàn thành">Chưa hoàn thành</option>
                      <option value="Tốt">Tốt</option>
                      <option value="Khá">Khá</option>
                      <option value="Đạt">Đạt</option>
                      <option value="Chưa đạt">Chưa đạt</option>
                    </optgroup>
                  </select>
                ) : (
                  <select
                    disabled={disabled}
                    value={record.moet?.overallRating || "Tốt"}
                    onChange={(e) => updateRecord(prev => ({
                      ...prev,
                      overallRating: e.target.value,
                      moet: { ...prev.moet!, overallRating: e.target.value }
                    }))}
                    className={fInp + " cursor-pointer"}
                  >
                    <optgroup label="Quy định mới (TT 22/2021/TT-BGDĐT)">
                      <option value="Tốt">Tốt</option>
                      <option value="Khá">Khá</option>
                      <option value="Đạt">Đạt</option>
                      <option value="Chưa đạt">Chưa đạt</option>
                    </optgroup>
                    <optgroup label="Học bạ cũ (TT 58/2011 & TT 26/2020)">
                      <option value="Giỏi">Giỏi</option>
                      <option value="Khá (TT 58)">Khá (TT 58)</option>
                      <option value="Trung bình">Trung bình</option>
                      <option value="Yếu">Yếu</option>
                      <option value="Kém">Kém</option>
                    </optgroup>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isPrimary ? "Kết quả rèn luyện / Phẩm chất & Năng lực (TT 27)" : "Kết quả rèn luyện / Hạnh kiểm (TT 22 & TT 58)"}
                </label>
                {isPrimary ? (
                  <select
                    disabled={disabled}
                    value={record.moet?.conductRating || "Tốt"}
                    onChange={(e) => updateRecord(prev => ({
                      ...prev,
                      moet: { ...prev.moet!, conductRating: e.target.value }
                    }))}
                    className={fInp + " cursor-pointer"}
                  >
                    <optgroup label="Kết quả rèn luyện / Phẩm chất & Năng lực (TT 27)">
                      <option value="Tốt">Tốt</option>
                      <option value="Đạt">Đạt</option>
                      <option value="Cần cố gắng">Cần cố gắng</option>
                      <option value="Hoàn thành tốt (Học sinh Tiêu biểu)">Hoàn thành tốt (Học sinh Tiêu biểu)</option>
                      <option value="Hoàn thành xuất sắc (Học sinh Xuất sắc)">Hoàn thành xuất sắc (Học sinh Xuất sắc)</option>
                      <option value="Khá">Khá</option>
                      <option value="Chưa đạt">Chưa đạt</option>
                    </optgroup>
                  </select>
                ) : (
                  <select
                    disabled={disabled}
                    value={record.moet?.conductRating || "Tốt"}
                    onChange={(e) => updateRecord(prev => ({
                      ...prev,
                      moet: { ...prev.moet!, conductRating: e.target.value }
                    }))}
                    className={fInp + " cursor-pointer"}
                  >
                    <optgroup label="Quy định mới (TT 22/2021)">
                      <option value="Tốt">Tốt</option>
                      <option value="Khá">Khá</option>
                      <option value="Đạt">Đạt</option>
                      <option value="Chưa đạt">Chưa đạt</option>
                    </optgroup>
                    <optgroup label="Học bạ cũ (TT 58/2011)">
                      <option value="Trung bình (Hạnh kiểm)">Trung bình</option>
                      <option value="Yếu (Hạnh kiểm)">Yếu</option>
                    </optgroup>
                  </select>
                )}
              </div>
            </div>
          )}

          {/* HƯỚNG DẪN / QUY ĐỊNH HỌC BẠ KHỐI 1 (NO ICONS) */}
          {isGrade1 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 space-y-2.5">
              <div className="text-xs text-amber-950">
                <div className="font-bold">Quy định điểm hồ sơ khảo sát Khối 1:</div>
                <div className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  - <strong>Khảo sát đầu cấp học (Đầu Năm):</strong> Chưa có hồ sơ học bạ lớp 1. Ghi chú điểm: <span className="font-bold text-teal-800 uppercase">Không áp dụng</span>.
                  <br />
                  - <strong>Khảo sát Học kỳ 2 (HK2):</strong> Yêu cầu bổ sung kết quả học tập các môn từ học bạ HK1 lớp 1.
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60 flex-wrap">
                <span className="text-[11px] font-bold text-amber-900">Thời điểm khảo sát:</span>
                <div className="inline-flex rounded-lg bg-white p-0.5 border border-amber-200">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleGrade1ModeChange("DAU_NAM")}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      grade1Mode === "DAU_NAM"
                        ? "bg-[#00736E] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Đầu Năm (Không áp dụng điểm)
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleGrade1ModeChange("HK2")}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      grade1Mode === "HK2"
                        ? "bg-[#00736E] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Học kỳ 2 (Yêu cầu bổ sung các môn)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Danh sách môn học chính */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Kết quả học tập các môn
              </span>
              {(!isGrade1 || grade1Mode === "HK2") && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={addMoetSubject}
                  className="text-[11px] font-bold text-[#00736E] hover:text-[#005854] bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  + Thêm môn học
                </button>
              )}
            </div>

            {isGrade1 && grade1Mode === "DAU_NAM" ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-4 text-center space-y-1.5">
                <p className="text-xs font-bold text-slate-700">
                  Ghi chú điểm: <span className="text-teal-700 uppercase bg-teal-50 px-2 py-0.5 rounded border border-teal-200">Không áp dụng</span>
                </p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                  Trường hợp Khối 1 khảo sát đầu cấp học (Đầu Năm): Học sinh chưa có hồ sơ học bạ lớp 1 nên không áp dụng điểm số các môn. Khi khảo sát HK2 mới yêu cầu bổ sung các môn.
                </p>
              </div>
            ) : (
              <>
                {isGrade1 && grade1Mode === "HK2" && (
                  <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-1.5 text-[11px] text-sky-800 font-semibold">
                    Khảo sát Học kỳ 2: Yêu cầu bổ sung kết quả học tập các môn (Toán, Tiếng Việt, Tiếng Anh...) từ học bạ lớp 1.
                  </div>
                )}
                <div className="space-y-2">
                  {(record.moet?.subjects || []).map((sub, idx) => (
                    <div key={sub.id || idx} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <input
                          type="text"
                          disabled={disabled || idx < 3}
                          placeholder="Tên môn học"
                          value={sub.name}
                          onChange={(e) => handleMoetSubjectChange(idx, "name", e.target.value)}
                          className="raw-input w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-800 outline-none focus:border-[#00A19A] disabled:bg-slate-100"
                        />
                      </div>

                      <div className="w-36 sm:w-44 flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                          Điểm TB:
                        </span>
                        <input
                          type="text"
                          disabled={disabled}
                          placeholder="0.0"
                          value={sub.score || ""}
                          onChange={(e) => handleMoetSubjectChange(idx, "score", e.target.value)}
                          className="raw-input w-full h-9 px-2.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 text-center outline-none focus:border-[#00A19A]"
                        />
                      </div>

                      {idx >= 3 && (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => removeMoetSubject(idx)}
                          className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Xóa môn"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Riêng THPT: Nhóm môn tổ hợp lựa chọn (NO ICONS) */}
          {isHighSchool && !hideSubjectScores && (
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="border-l-3 border-[#00736E] pl-2.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Các môn tổ hợp lựa chọn (THPT)
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Chọn tổ hợp, nhập điểm từng môn để hệ thống tự động tính ĐTB
                  </span>
                </div>

                {record.moet?.combination?.name && (
                  <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 px-3 py-1 rounded-lg">
                    <span className="text-[11px] font-bold text-[#005854] whitespace-nowrap">
                      ĐTB Tổ hợp:
                    </span>
                    <input
                      type="text"
                      disabled={disabled}
                      placeholder="ĐTB"
                      value={record.moet.combination.score || ""}
                      onChange={(e) => updateRecord(prev => ({
                        ...prev,
                        moet: {
                          ...prev.moet!,
                          combination: {
                            ...(prev.moet?.combination || { name: "" }),
                            score: e.target.value
                          }
                        }
                      }))}
                      className="raw-input w-16 h-7 px-1.5 bg-white border border-teal-300 rounded text-xs font-black text-[#00736E] text-center outline-none"
                      title="Điểm trung bình tổ hợp (tự động tính hoặc chỉnh sửa)"
                    />
                  </div>
                )}
              </div>

              {/* Lựa chọn Tổ hợp */}
              <div className="flex items-center gap-2">
                <select
                  disabled={disabled}
                  value={
                    THPT_COMBINATION_PRESETS.find(p => p.name === record.moet?.combination?.name || p.label === record.moet?.combination?.name)?.id 
                    || (record.moet?.combination?.name ? "TU_CHON" : "")
                  }
                  onChange={(e) => handleSelectCombinationPreset(e.target.value)}
                  className={fInp + " flex-1 cursor-pointer"}
                >
                  <option value="">-- Chọn Tổ hợp lựa chọn (THPT) --</option>
                  {THPT_COMBINATION_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>

                {record.moet?.combination?.name && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={addCombinationSubject}
                    className="h-10 px-3.5 bg-teal-50 hover:bg-teal-100 text-[#00736E] border border-teal-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    + Thêm môn tổ hợp
                  </button>
                )}
              </div>

              {/* Danh sách các môn thành phần của Tổ hợp */}
              {record.moet?.combination?.name && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-1">
                    <span>Môn thành phần ({record.moet.combination.name}):</span>
                    <span className="text-slate-400 font-normal">Nhập điểm từ 0-10</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {(record.moet.combination.subjects || []).map((cSub, cIdx) => (
                      <div key={cSub.id || cIdx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                        <input
                          type="text"
                          disabled={disabled}
                          placeholder="Tên môn"
                          value={cSub.name}
                          onChange={(e) => handleCombinationSubjectChange(cIdx, "name", e.target.value)}
                          className="raw-input flex-1 h-8 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 outline-none"
                        />
                        <div className="w-20">
                          <input
                            type="text"
                            disabled={disabled}
                            placeholder="ĐTB"
                            value={cSub.score || ""}
                            onChange={(e) => handleCombinationSubjectChange(cIdx, "score", e.target.value)}
                            className="raw-input w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-[#00736E] text-center outline-none"
                          />
                        </div>
                        {!disabled && (
                          <button
                            type="button"
                            onClick={() => removeCombinationSubject(cIdx)}
                            className="px-1.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ──────────────── PROGRAM 2: SONG NGỮ / TÍCH HỢP (NO ICONS) ──────────────── */}
      {record.programType === "SONG_NGU" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cột Trái: Nhánh Việt Nam */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Nhánh Chương trình Việt Nam</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => addBilingualSubject("moet")}
                className="text-[11px] font-bold text-[#00736E] hover:text-[#005854] cursor-pointer"
              >
                + Thêm môn
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Học lực chung nhánh VN</label>
              <select
                disabled={disabled}
                value={record.bilingual?.moetRating || "Tốt"}
                onChange={(e) => updateRecord(prev => ({
                  ...prev,
                  bilingual: { ...prev.bilingual!, moetRating: e.target.value }
                }))}
                className={fInp + " cursor-pointer"}
              >
                <option value="Tốt">Tốt</option>
                <option value="Khá">Khá</option>
                <option value="Đạt">Đạt</option>
              </select>
            </div>

            <div className="space-y-1.5">
              {(record.bilingual?.moetSubjects || []).map((sub, idx) => (
                <div key={sub.id || idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Tên môn"
                    value={sub.name}
                    onChange={(e) => handleBilingualSubjectChange("moet", idx, "name", e.target.value)}
                    className="raw-input flex-1 h-9 px-2.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-semibold text-slate-800"
                  />
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Điểm"
                    value={sub.score || ""}
                    onChange={(e) => handleBilingualSubjectChange("moet", idx, "score", e.target.value)}
                    className="raw-input w-20 h-9 px-2 bg-slate-50 border border-slate-300 rounded-md text-xs font-bold text-slate-800 text-center"
                  />
                  {idx >= 3 && (
                    <button type="button" onClick={() => removeBilingualSubject("moet", idx)} className="text-[11px] font-bold text-rose-600 hover:underline px-1">
                      Xóa
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cột Phải: Nhánh Quốc tế */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Nhánh Quốc tế (Cambridge / ESL)</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => addBilingualSubject("intl")}
                className="text-[11px] font-bold text-[#00736E] hover:text-[#005854] cursor-pointer"
              >
                + Thêm môn
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Xếp loại chung nhánh Quốc tế</label>
              <input
                type="text"
                disabled={disabled}
                placeholder="GPA / Grade (vd: GPA 3.8 / A)"
                value={record.bilingual?.internationalRating || ""}
                onChange={(e) => updateRecord(prev => ({
                  ...prev,
                  bilingual: { ...prev.bilingual!, internationalRating: e.target.value }
                }))}
                className={fInp}
              />
            </div>

            <div className="space-y-1.5">
              {(record.bilingual?.internationalSubjects || []).map((sub, idx) => (
                <div key={sub.id || idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Môn quốc tế"
                    value={sub.name}
                    onChange={(e) => handleBilingualSubjectChange("intl", idx, "name", e.target.value)}
                    className="raw-input flex-1 h-9 px-2.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-semibold text-slate-800"
                  />
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Điểm / Grade"
                    value={sub.score || ""}
                    onChange={(e) => handleBilingualSubjectChange("intl", idx, "score", e.target.value)}
                    className="raw-input w-24 h-9 px-2 bg-slate-50 border border-slate-300 rounded-md text-xs font-bold text-slate-800 text-center"
                  />
                  {idx >= 3 && (
                    <button type="button" onClick={() => removeBilingualSubject("intl", idx)} className="text-[11px] font-bold text-rose-600 hover:underline px-1">
                      Xóa
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── PROGRAM 3: NƯỚC NGOÀI (NO ICONS) ──────────────── */}
      {record.programType === "NUOC_NGOAI" && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900">Quy định hồ sơ Nước ngoài:</span> Hệ thống miễn các cột KQ Xếp loại, KQ Rèn luyện và Điểm các môn (tự động hiển thị nhãn <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-800">Không áp dụng</span>). Quý Thầy/Cô có thể ghi nhận thông tin trường lớp và tải tệp đính kèm học bạ để lưu hồ sơ.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Quốc gia đã học</label>
              <input
                type="text"
                disabled={disabled}
                placeholder="VD: Hoa Kỳ, Úc, Singapore..."
                value={record.foreign?.country || ""}
                onChange={(e) => updateRecord(prev => ({
                  ...prev,
                  foreign: { ...prev.foreign!, country: e.target.value }
                }))}
                className={fInp}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Cấp lớp hoàn thành</label>
              <input
                type="text"
                disabled={disabled}
                placeholder="VD: Grade 5, Year 8..."
                value={record.foreign?.gradeCompleted || ""}
                onChange={(e) => updateRecord(prev => ({
                  ...prev,
                  foreign: { ...prev.foreign!, gradeCompleted: e.target.value }
                }))}
                className={fInp}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Điểm GPA / Xếp loại học bạ</label>
              <input
                type="text"
                disabled={disabled}
                placeholder="VD: GPA 3.9 (Honor Roll)"
                value={record.foreign?.gpaOrHonors || ""}
                onChange={(e) => updateRecord(prev => ({
                  ...prev,
                  overallRating: e.target.value,
                  foreign: { ...prev.foreign!, gpaOrHonors: e.target.value }
                }))}
                className={fInp}
              />
            </div>
          </div>

          {/* Tình trạng hoàn thành */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Tình trạng:</span>
            {[
              { id: "COMPLETED", label: "Đã hoàn thành cấp lớp" },
              { id: "IN_PROGRESS", label: "Đang học dở dang" },
              { id: "TRANSFERRED", label: "Chuyển tiếp giữa kỳ" }
            ].map(st => (
              <label key={st.id} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="foreignStatus"
                  disabled={disabled}
                  checked={(record.foreign?.status || "COMPLETED") === st.id}
                  onChange={() => updateRecord(prev => ({
                    ...prev,
                    foreign: { ...prev.foreign!, status: st.id as any }
                  }))}
                  className="w-3.5 h-3.5 text-[#00736E] accent-[#00736E]"
                />
                <span>{st.label}</span>
              </label>
            ))}
          </div>

          {/* Môn học từ học bạ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Điểm các môn từ học bạ nước ngoài</span>
              <button
                type="button"
                disabled={disabled}
                onClick={addForeignSubject}
                className="text-[11px] font-bold text-[#00736E] hover:text-[#005854] cursor-pointer"
              >
                + Thêm môn
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(record.foreign?.subjects || []).map((sub, idx) => (
                <div key={sub.id || idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Tên môn (vd: Math)"
                    value={sub.name}
                    onChange={(e) => handleForeignSubjectChange(idx, "name", e.target.value)}
                    className="raw-input flex-1 h-9 px-2.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-800"
                  />
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Grade (A/B/C)"
                    value={sub.score || ""}
                    onChange={(e) => handleForeignSubjectChange(idx, "score", e.target.value)}
                    className="raw-input w-24 h-9 px-2 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 text-center"
                  />
                  <button type="button" onClick={() => removeForeignSubject(idx)} className="text-[11px] font-bold text-rose-600 hover:underline px-1">
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── PROGRAM 4: HOMESCHOOLING (NO ICONS) ──────────────── */}
      {record.programType === "HOMESCHOOLING" && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900">Quy định hồ sơ Homeschooling:</span> Hệ thống miễn các cột KQ Xếp loại, KQ Rèn luyện và Điểm các môn (tự động hiển thị nhãn <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-800">Không áp dụng</span>). Quý Thầy/Cô có thể ghi nhận hình thức tự học và tải tệp đính kèm học liệu nếu có.
          </div>
          {/* Hình thức học */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Hình thức học tập tại gia</label>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
              {[
                { id: "INDEPENDENT", label: "Tự học tại nhà (Independent)" },
                { id: "CO_OP", label: "Theo nhóm gia đình (Co-op)" },
                { id: "ONLINE", label: "Học trực tuyến (Online)" }
              ].map(m => (
                <label key={m.id} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="homeschoolMode"
                    disabled={disabled}
                    checked={(record.homeschool?.learningMode || "INDEPENDENT") === m.id}
                    onChange={() => updateRecord(prev => ({
                      ...prev,
                      homeschool: { ...prev.homeschool!, learningMode: m.id as any }
                    }))}
                    className="w-3.5 h-3.5 text-[#00736E] accent-[#00736E]"
                  />
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Nội dung / Môn học đã học */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Nội dung &amp; Kết quả các môn đã học</span>
              <button
                type="button"
                disabled={disabled}
                onClick={addHomeschoolSubject}
                className="text-[11px] font-bold text-[#00736E] hover:text-[#005854] cursor-pointer"
              >
                + Thêm nội dung / môn
              </button>
            </div>

            <div className="space-y-1.5">
              {(record.homeschool?.subjects || []).map((sub, idx) => (
                <div key={sub.id || idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Môn học / Lĩnh vực (vd: Toán học, Ngôn ngữ...)"
                    value={sub.name}
                    onChange={(e) => handleHomeschoolSubjectChange(idx, "name", e.target.value)}
                    className="raw-input flex-1 h-9 px-2.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-800"
                  />
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Kết quả / Mức đánh giá"
                    value={sub.score || ""}
                    onChange={(e) => handleHomeschoolSubjectChange(idx, "score", e.target.value)}
                    className="raw-input w-48 h-9 px-2.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-800 text-center"
                  />
                  <button type="button" onClick={() => removeHomeschoolSubject(idx)} className="text-[11px] font-bold text-rose-600 hover:underline px-1">
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Đánh giá tổng quan */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Kết quả học tập &amp; Nhận xét tổng quan</label>
            <input
              type="text"
              disabled={disabled}
              placeholder="VD: Học sinh có tư duy tự học tốt, hoàn thành đầy đủ mục tiêu..."
              value={record.homeschool?.overallEvaluation || ""}
              onChange={(e) => updateRecord(prev => ({
                ...prev,
                overallRating: e.target.value,
                homeschool: { ...prev.homeschool!, overallEvaluation: e.target.value }
              }))}
              className={fInp}
            />
          </div>
        </div>
      )}

      {/* 3. THÀNH TÍCH HỌC SINH (NO ICONS / EMOJIS) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="border-l-3 border-[#00736E] pl-2.5">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Thành tích &amp; Khen thưởng học sinh
              </h4>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                Tùy chọn
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ghi nhận các giải thưởng HSG, chứng chỉ Tiếng Anh (IELTS, TOEFL, Cambridge), năng khiếu, thể thao, KHKT...
            </p>
          </div>

          {(record.achievements || record.moet?.achievements) && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => updateRecord(prev => ({
                ...prev,
                achievements: "",
                moet: prev.moet ? { ...prev.moet, achievements: "" } : prev.moet
              }))}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer"
            >
              Xóa nội dung
            </button>
          )}
        </div>

        {/* GỢI Ý CHỌN NHANH THÀNH TÍCH (NO EMOJIS) */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Chọn nhanh danh hiệu / giải thưởng:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Học sinh Xuất sắc",
              "Học sinh Tiêu biểu",
              "Giải Nhất / HC Vàng",
              "Giải Nhì / HC Bạc",
              "Giải Ba / HC Đồng",
              "Giải IOE / VioEdu",
              "Chứng chỉ Cambridge / IELTS",
              "Giải Năng khiếu / TDTT"
            ].map(label => (
              <button
                key={label}
                type="button"
                disabled={disabled}
                onClick={() => {
                  const current = (record.achievements || record.moet?.achievements || "").trim();
                  const updated = current ? `${current}, ${label}` : label;
                  updateRecord(prev => ({
                    ...prev,
                    achievements: updated,
                    moet: prev.moet ? { ...prev.moet, achievements: updated } : prev.moet
                  }));
                }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-teal-50 hover:text-[#00736E] hover:border-teal-200 transition-all cursor-pointer select-none"
              >
                + {label}
              </button>
            ))}
          </div>
        </div>

        {/* Ô NHẬP NỘI DUNG THÀNH TÍCH */}
        <div>
          <textarea
            disabled={disabled}
            rows={2}
            value={record.achievements || record.moet?.achievements || ""}
            onChange={(e) => {
              const val = e.target.value;
              updateRecord(prev => ({
                ...prev,
                achievements: val,
                moet: prev.moet ? { ...prev.moet, achievements: val } : prev.moet
              }));
            }}
            placeholder="Ví dụ: Đạt giải Ba cuộc thi Khoa học Kỹ thuật cấp Quận, Huy chương Vàng Bơi lội Hội khỏe Phù Đổng, Chứng chỉ Cambridge Flyers 14/15 khiên..."
            className="raw-textarea w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 leading-normal resize-none transition-all"
          />
        </div>
      </div>

      {/* 4. VÙNG ĐÍNH KÈM HỌC BẠ / BẢNG ĐIỂM (NO ICONS) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Hồ sơ / Bảng điểm đính kèm (PDF, Ảnh)
          </label>
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-[#00736E] border border-teal-200 text-[11px] font-bold cursor-pointer"
          >
            {isUploading ? "Đang tải..." : "+ Tải tệp đính kèm"}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
          />
        </div>

        {/* Danh sách file đã đính kèm */}
        {(record.attachments || []).length === 0 ? (
          <div className="text-[11px] font-normal text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-dashed border-slate-200 text-center">
            Chưa có tệp học bạ đính kèm. Bấm &quot;+ Tải tệp đính kèm&quot; để chọn tài liệu scan nếu có.
          </div>
        ) : (
          <div className="space-y-1.5">
            {(record.attachments || []).map((file, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <span className="font-semibold text-slate-700 truncate">{file.name}</span>
                  {file.size && (
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#00736E] hover:underline text-[11px] font-bold"
                  >
                    Xem tệp
                  </a>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-rose-600 hover:underline text-[11px] font-bold cursor-pointer"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
