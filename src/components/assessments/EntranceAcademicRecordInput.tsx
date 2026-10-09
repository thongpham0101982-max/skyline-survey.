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
  Sparkles
} from "lucide-react";
import {
  EntranceAcademicRecord,
  ProgramType,
  SubjectScoreItem,
  FileAttachment,
  parseEntranceRecord,
  serializeEntranceRecord,
  getDefaultMoetSubjects
} from "@/lib/entranceAcademicRecord";

interface EntranceAcademicRecordInputProps {
  value?: string | null;
  grade?: string;
  onChange: (serializedJson: string) => void;
  disabled?: boolean;
}

export function EntranceAcademicRecordInput({
  value,
  grade = "1",
  onChange,
  disabled = false
}: EntranceAcademicRecordInputProps) {
  // Parse state từ prop value ban đầu
  const [record, setRecord] = useState<EntranceAcademicRecord>(() => {
    return parseEntranceRecord(value, grade);
  });

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const numericGrade = parseInt(grade || "1", 10);
  const isPrimary = !isNaN(numericGrade) && numericGrade <= 5;
  const isHighSchool = !isNaN(numericGrade) && numericGrade >= 10;

  return (
    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* 1. THANH CHỌN CHƯƠNG TRÌNH ĐƠN NHẤT (SEGMENTED TABS) */}
      <div>
        <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">
          Chương trình học tập trước đây *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleProgramTypeChange("BO_GD_DT")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              record.programType === "BO_GD_DT"
                ? "bg-white text-teal-700 shadow-2xs border border-teal-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-teal-600" />
            <span>Bộ GD&ĐT</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleProgramTypeChange("SONG_NGU")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              record.programType === "SONG_NGU"
                ? "bg-white text-sky-700 shadow-2xs border border-sky-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-sky-600" />
            <span>Song ngữ/Tích hợp</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleProgramTypeChange("NUOC_NGOAI")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              record.programType === "NUOC_NGOAI"
                ? "bg-white text-indigo-700 shadow-2xs border border-indigo-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-indigo-600" />
            <span>Nước ngoài</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleProgramTypeChange("HOMESCHOOLING")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              record.programType === "HOMESCHOOLING"
                ? "bg-white text-amber-700 shadow-2xs border border-amber-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Home className="w-3.5 h-3.5 text-amber-600" />
            <span>Homeschooling</span>
          </button>
        </div>
      </div>

      {/* 2. KHU VỰC NHẬP LIỆU THÍCH ỨNG THEO CHƯƠNG TRÌNH */}

      {/* ──────────────── PROGRAM 1: BỘ GD&ĐT ──────────────── */}
      {record.programType === "BO_GD_DT" && (
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-4">
          {/* Đánh giá chung & Rèn luyện */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-100">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
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
                  className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white outline-none focus:border-teal-500 leading-normal cursor-pointer"
                >
                  <option value="Hoàn thành xuất sắc">Hoàn thành xuất sắc (Học sinh Xuất sắc)</option>
                  <option value="Hoàn thành tốt">Hoàn thành tốt (Học sinh Tiêu biểu)</option>
                  <option value="Hoàn thành">Hoàn thành</option>
                  <option value="Chưa hoàn thành">Chưa hoàn thành</option>
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
                  className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white outline-none focus:border-teal-500 leading-normal cursor-pointer"
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
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
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
                  className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white outline-none focus:border-teal-500 leading-normal cursor-pointer"
                >
                  <option value="Tốt">Tốt (Theo TT 27/2020)</option>
                  <option value="Đạt">Đạt (Theo TT 27/2020)</option>
                  <option value="Cần cố gắng">Cần cố gắng (Theo TT 27/2020)</option>
                </select>
              ) : (
                <select
                  disabled={disabled}
                  value={record.moet?.conductRating || "Tốt"}
                  onChange={(e) => updateRecord(prev => ({
                    ...prev,
                    moet: { ...prev.moet!, conductRating: e.target.value }
                  }))}
                  className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white outline-none focus:border-teal-500 leading-normal cursor-pointer"
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

          {/* Danh sách môn học chính */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">
                {isPrimary ? "Kết quả học tập các môn Tiểu học (Mức T/H/C & Điểm)" : isHighSchool ? "Môn học bắt buộc THPT" : "Môn học bắt buộc THCS"}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={addMoetSubject}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100/70 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Thêm môn học
              </button>
            </div>

            <div className="space-y-2">
              {(record.moet?.subjects || []).map((sub, idx) => (
                <div key={sub.id || idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-50/80 p-2 rounded-xl border border-slate-200/50">
                  <div className="w-full sm:w-1/3">
                    <input
                      type="text"
                      disabled={disabled || idx < 3}
                      placeholder="Tên môn học"
                      value={sub.name}
                      onChange={(e) => handleMoetSubjectChange(idx, "name", e.target.value)}
                      className="w-full h-9.5 px-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-teal-500 disabled:bg-slate-100/70 leading-normal"
                    />
                  </div>

                  {isPrimary ? (
                    <>
                      {/* Chọn nhanh mức T / H / C */}
                      <div className="flex items-center gap-1">
                        {(["T", "H", "C"] as const).map(lvl => (
                          <button
                            type="button"
                            key={lvl}
                            disabled={disabled}
                            onClick={() => handleMoetSubjectChange(idx, "level", lvl)}
                            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                              sub.level === lvl
                                ? lvl === "T" ? "bg-emerald-600 text-white shadow-2xs" : lvl === "H" ? "bg-sky-600 text-white shadow-2xs" : "bg-rose-500 text-white shadow-2xs"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {lvl === "T" ? "T (Tốt)" : lvl === "H" ? "H (HT)" : "C (Chưa)"}
                          </button>
                        ))}
                      </div>

                      {/* Điểm định kỳ */}
                      <div className="flex-1 min-w-[90px]">
                        <input
                          type="text"
                          disabled={disabled}
                          placeholder="Điểm (1-10)"
                          value={sub.score || ""}
                          onChange={(e) => handleMoetSubjectChange(idx, "score", e.target.value)}
                          className="w-full h-9.5 px-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 text-center outline-none focus:border-teal-500 leading-normal"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1">
                      <input
                        type="text"
                        disabled={disabled}
                        placeholder="Điểm trung bình (vd: 8.5)"
                        value={sub.score || ""}
                        onChange={(e) => handleMoetSubjectChange(idx, "score", e.target.value)}
                        className="w-full h-9.5 px-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-normal text-slate-800 outline-none focus:border-teal-500 leading-normal"
                      />
                    </div>
                  )}

                  {idx >= 3 && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removeMoetSubject(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Xóa môn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Riêng THPT: Nhóm môn tổ hợp */}
          {isHighSchool && (
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Các môn tổ hợp lựa chọn (THPT)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  disabled={disabled}
                  value={record.moet?.combination?.name || "KHTN (Lý, Hóa, Sinh)"}
                  onChange={(e) => updateRecord(prev => ({
                    ...prev,
                    moet: {
                      ...prev.moet!,
                      combination: {
                        ...(prev.moet?.combination || {}),
                        name: e.target.value
                      }
                    }
                  }))}
                  className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-teal-500 leading-normal cursor-pointer"
                >
                  <option value="KHTN (Lý, Hóa, Sinh)">Tổ hợp Khoa học Tự nhiên (Lý, Hóa, Sinh)</option>
                  <option value="KHXH (Sử, Địa, GDKT&PL)">Tổ hợp Khoa học Xã hội (Sử, Địa, GDKT&PL)</option>
                  <option value="Công nghệ - Tin học">Tổ hợp Công nghệ - Nghệ thuật</option>
                  <option value="Tổ hợp tự chọn khác">Tổ hợp tự chọn khác</option>
                </select>

                <input
                  type="text"
                  disabled={disabled}
                  placeholder="Điểm TB môn tổ hợp (vd: 8.2)"
                  value={record.moet?.combination?.score || ""}
                  onChange={(e) => updateRecord(prev => ({
                    ...prev,
                    moet: {
                      ...prev.moet!,
                      combination: {
                        ...(prev.moet?.combination || { name: "KHTN (Lý, Hóa, Sinh)" }),
                        score: e.target.value
                      }
                    }
                  }))}
                  className="w-full h-10 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-normal text-slate-800 outline-none focus:border-teal-500 leading-normal"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── PROGRAM 2: SONG NGỮ / TÍCH HỢP ──────────────── */}
      {record.programType === "SONG_NGU" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cột Trái: Nhánh Việt Nam */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-800">🇻🇳 Nhánh Chương trình Việt Nam</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => addBilingualSubject("moet")}
                className="text-[11px] font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Thêm môn
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Học lực chung nhánh VN</label>
              <select
                disabled={disabled}
                value={record.bilingual?.moetRating || "Tốt"}
                onChange={(e) => updateRecord(prev => ({
                  ...prev,
                  bilingual: { ...prev.bilingual!, moetRating: e.target.value }
                }))}
                className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 leading-normal cursor-pointer"
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
                    className="flex-1 h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 leading-normal"
                  />
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Điểm"
                    value={sub.score || ""}
                    onChange={(e) => handleBilingualSubjectChange("moet", idx, "score", e.target.value)}
                    className="w-20 h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 text-center leading-normal"
                  />
                  {idx >= 3 && (
                    <button type="button" onClick={() => removeBilingualSubject("moet", idx)} className="text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cột Phải: Nhánh Quốc tế */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-800">🇬🇧 Nhánh Quốc tế (Cambridge/ESL)</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => addBilingualSubject("intl")}
                className="text-[11px] font-medium text-sky-700 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Thêm môn
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Xếp loại chung nhánh Quốc tế</label>
              <input
                type="text"
                disabled={disabled}
                placeholder="GPA / Grade (vd: GPA 3.8 / A)"
                value={record.bilingual?.internationalRating || ""}
                onChange={(e) => updateRecord(prev => ({
                  ...prev,
                  bilingual: { ...prev.bilingual!, internationalRating: e.target.value }
                }))}
                className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 leading-normal"
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
                    className="flex-1 h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 leading-normal"
                  />
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Điểm / Grade"
                    value={sub.score || ""}
                    onChange={(e) => handleBilingualSubjectChange("intl", idx, "score", e.target.value)}
                    className="w-24 h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 text-center leading-normal"
                  />
                  {idx >= 3 && (
                    <button type="button" onClick={() => removeBilingualSubject("intl", idx)} className="text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── PROGRAM 3: NƯỚC NGOÀI ──────────────── */}
      {record.programType === "NUOC_NGOAI" && (
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-slate-100">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Quốc gia đã học</label>
              <input
                type="text"
                disabled={disabled}
                placeholder="VD: Hoa Kỳ, Úc, Singapore..."
                value={record.foreign?.country || ""}
                onChange={(e) => updateRecord(prev => ({
                  ...prev,
                  foreign: { ...prev.foreign!, country: e.target.value }
                }))}
                className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 leading-normal"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Cấp lớp hoàn thành</label>
              <input
                type="text"
                disabled={disabled}
                placeholder="VD: Grade 5, Year 8..."
                value={record.foreign?.gradeCompleted || ""}
                onChange={(e) => updateRecord(prev => ({
                  ...prev,
                  foreign: { ...prev.foreign!, gradeCompleted: e.target.value }
                }))}
                className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 leading-normal"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Điểm GPA / Xếp loại học bạ</label>
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
                className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 leading-normal"
              />
            </div>
          </div>

          {/* Tình trạng hoàn thành */}
          <div className="flex items-center gap-4 text-xs font-normal text-slate-700">
            <span className="text-[11px] font-medium text-slate-500">Tình trạng:</span>
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
                  className="w-3.5 h-3.5 text-indigo-600 accent-indigo-600"
                />
                <span>{st.label}</span>
              </label>
            ))}
          </div>

          {/* Môn học từ học bạ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600 uppercase">Điểm các môn từ học bạ nước ngoài</span>
              <button
                type="button"
                disabled={disabled}
                onClick={addForeignSubject}
                className="text-[11px] font-medium text-indigo-700 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Thêm môn
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(record.foreign?.subjects || []).map((sub, idx) => (
                <div key={sub.id || idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Tên môn (vd: Math)"
                    value={sub.name}
                    onChange={(e) => handleForeignSubjectChange(idx, "name", e.target.value)}
                    className="flex-1 h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 leading-normal"
                  />
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Grade (A/B/C)"
                    value={sub.score || ""}
                    onChange={(e) => handleForeignSubjectChange(idx, "score", e.target.value)}
                    className="w-24 h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 text-center leading-normal"
                  />
                  <button type="button" onClick={() => removeForeignSubject(idx)} className="text-slate-400 hover:text-rose-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── PROGRAM 4: HOMESCHOOLING ──────────────── */}
      {record.programType === "HOMESCHOOLING" && (
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-4">
          {/* Hình thức học */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Hình thức học tập tại gia</label>
            <div className="flex flex-wrap items-center gap-4 text-xs font-normal text-slate-700">
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
                    className="w-3.5 h-3.5 text-amber-600 accent-amber-600"
                  />
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Nội dung / Môn học đã học */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600 uppercase">Nội dung & Kết quả các môn đã học</span>
              <button
                type="button"
                disabled={disabled}
                onClick={addHomeschoolSubject}
                className="text-[11px] font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Thêm nội dung/môn
              </button>
            </div>

            <div className="space-y-1.5">
              {(record.homeschool?.subjects || []).map((sub, idx) => (
                <div key={sub.id || idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Môn học / Lĩnh vực (vd: Toán học, Ngôn ngữ...)"
                    value={sub.name}
                    onChange={(e) => handleHomeschoolSubjectChange(idx, "name", e.target.value)}
                    className="flex-1 h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 leading-normal"
                  />
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Kết quả / Mức đánh giá"
                    value={sub.score || ""}
                    onChange={(e) => handleHomeschoolSubjectChange(idx, "score", e.target.value)}
                    className="w-48 h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 text-center leading-normal"
                  />
                  <button type="button" onClick={() => removeHomeschoolSubject(idx)} className="text-slate-400 hover:text-rose-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Đánh giá tổng quan */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Kết quả học tập & Nhận xét tổng quan</label>
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
              className="w-full h-10 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 leading-normal"
            />
          </div>
        </div>
      )}

      {/* 3. THÀNH TÍCH HỌC SINH (NẾU CÓ) - THIẾT KẾ CHUẨN, ĐẸP, MÀU SẮC */}
      <div className="bg-gradient-to-br from-amber-50/80 via-amber-50/40 to-orange-50/60 border border-amber-200/90 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in-50 duration-200">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-200/60">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-xs">
              <Trophy className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Thành tích & Khen thưởng học sinh (nếu có)
                </h4>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 border border-amber-300/60 px-2 py-0.5 rounded-full">
                  Tùy chọn
                </span>
              </div>
              <p className="text-[11px] text-amber-850/80 font-normal">
                Ghi nhận các giải thưởng HSG, Tiếng Anh (IELTS, TOEFL, Cambridge), năng khiếu, thể thao, tin học, KHKT...
              </p>
            </div>
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
              className="text-[11px] text-amber-700 hover:text-rose-600 font-medium underline cursor-pointer"
            >
              Xóa nội dung
            </button>
          )}
        </div>

        {/* GỢI Ý CHỌN NHANH THÀNH TÍCH (QUICK PILLS) */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 block">
            Gợi ý thêm nhanh:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "🏆 Học sinh Xuất sắc", cls: "bg-amber-100/80 text-amber-900 border-amber-300 hover:bg-amber-200/80" },
              { label: "🎖️ Học sinh Tiêu biểu", cls: "bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100" },
              { label: "🥇 Giải Nhất / HC Vàng", cls: "bg-yellow-50 text-yellow-900 border-yellow-300 hover:bg-yellow-100" },
              { label: "🥈 Giải Nhì / HC Bạc", cls: "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200" },
              { label: "🥉 Giải Ba / HC Đồng", cls: "bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100" },
              { label: "⭐ Giải IOE / VioEdu", cls: "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100" },
              { label: "📜 Cambridge / IELTS", cls: "bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100" },
              { label: "🎨 Giải Năng khiếu / TDTT", cls: "bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100" }
            ].map(tag => (
              <button
                key={tag.label}
                type="button"
                disabled={disabled}
                onClick={() => {
                  const current = (record.achievements || record.moet?.achievements || "").trim();
                  const addText = tag.label.replace(/^[^\s]+\s*/, "");
                  const updated = current ? `${current}, ${addText}` : addText;
                  updateRecord(prev => ({
                    ...prev,
                    achievements: updated,
                    moet: prev.moet ? { ...prev.moet, achievements: updated } : prev.moet
                  }));
                }}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none active:scale-95 ${tag.cls}`}
              >
                {tag.label}
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
            className="w-full px-3.5 py-2.5 bg-white border border-amber-200/90 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 leading-normal resize-none shadow-2xs transition-all"
          />
        </div>
      </div>

      {/* 4. VÙNG ĐÍNH KÈM HỌC BẠ / BẢNG ĐIỂM (TINH GỌN) */}
      <div className="pt-2 border-t border-slate-200/60">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
            <span>Hồ sơ / Bảng điểm đính kèm (PDF, Ảnh)</span>
          </label>
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
          >
            <Upload className="w-3 h-3" />
            <span>{isUploading ? "Đang tải..." : "Tải file lên"}</span>
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
          <div className="text-[11px] font-normal text-slate-400 italic bg-white/50 p-2.5 rounded-lg border border-dashed border-slate-200 text-center">
            Chưa có file học bạ nào được đính kèm. Bấm "Tải file lên" để chọn tài liệu scan nếu có.
          </div>
        ) : (
          <div className="space-y-1.5">
            {(record.attachments || []).map((file, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <FileText className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                  <span className="font-normal text-slate-700 truncate">{file.name}</span>
                  {file.size && (
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-600 hover:text-teal-700 p-1"
                    title="Xem file"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </a>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Xóa file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
