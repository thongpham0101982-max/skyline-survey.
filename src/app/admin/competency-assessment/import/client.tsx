// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Layers,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Plus,
  Settings,
  HelpCircle,
  Eye,
  Info,
  Filter,
  Check,
  AlertCircle,
  Database,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ImportWizardClientProps {
  currentUser: any;
}

export function ImportWizardClient({ currentUser }: ImportWizardClientProps) {
  const router = useRouter();

  // Wizard Step: 1: Upload & Map, 2: Validate & Preview, 3: Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form selections
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("CUOI_KY_1");

  // File and batch state
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string>("");
  const [batchId, setBatchId] = useState<string>("");
  const [batchCode, setBatchCode] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [duplicateFileWarning, setDuplicateFileWarning] = useState<any | null>(null);

  // Column Mapping
  const [mapping, setMapping] = useState<{ [key: string]: string }>({
    academicYear: "",
    studentCode: "",
    studentName: "",
    className: "",
    subjectName: "",
    competencyName: "",
    achievedScore: "",
    maxScore: "",
    radarPercent: "",
  });

  // Validation Stats
  const [isValidating, setIsValidating] = useState(false);
  const [validationStats, setValidationStats] = useState<{
    totalRows: number;
    validRows: number;
    warningRows: number;
    errorRows: number;
    duplicateRows: number;
    needReviewRows: number;
  } | null>(null);
  const [sampleIssues, setSampleIssues] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<"ALL" | "ERROR" | "WARNING" | "DUPLICATE" | "NEED_REVIEW">("ALL");

  // Duplicate commit action
  const [duplicateAction, setDuplicateAction] = useState<"OVERWRITE" | "SKIP">("OVERWRITE");
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<any | null>(null);

  // Alias quick-add modal state
  const [aliasModalOpen, setAliasModalOpen] = useState(false);
  const [aliasType, setAliasType] = useState<"SUBJECT_ALIAS" | "COMPETENCY_ALIAS" | "NEW_COMPETENCY">("SUBJECT_ALIAS");
  const [aliasTargetId, setAliasTargetId] = useState("");
  const [aliasPattern, setAliasPattern] = useState("");
  const [newCompSubjectId, setNewCompSubjectId] = useState("");
  const [newCompName, setNewCompName] = useState("");
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [competenciesList, setCompetenciesList] = useState<any[]>([]);
  const [aliasLoading, setAliasLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load initial references (Academic Years, Subjects, Competencies)
  useEffect(() => {
    fetch("/api/admin/academic-years")
      .then((res) => res.json())
      .then((data) => {
        if (data.academicYears) {
          setAcademicYears(data.academicYears);
          const active = data.academicYears.find((y: any) => y.status === "ACTIVE") || data.academicYears[0];
          if (active) setSelectedYearId(active.id);
        }
      })
      .catch(() => {});

    fetch("/api/admin/competency-assessment/aliases")
      .then((res) => res.json())
      .then((data) => {
        if (data.subjects) setSubjectsList(data.subjects);
        if (data.competencies) setCompetenciesList(data.competencies);
      })
      .catch(() => {});
  }, []);

  // Handle File Drag & Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("academicYearId", selectedYearId);
    formData.append("semester", String(selectedSemester));
    formData.append("assessmentPeriod", selectedPeriod);

    setIsValidating(true);
    try {
      // 1. Upload & read headers
      const res = await fetch("/api/admin/competency-assessment/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tải file");

      setBatchId(data.batchId);
      setBatchCode(data.batchCode);
      setHeaders(data.headers || []);
      setPreviewRows(data.previewRows || []);
      if (data.mapping) {
        setMapping((prev) => ({ ...prev, ...data.mapping }));
      }
      if (data.hasCommittedDuplicate) {
        setDuplicateFileWarning(data.duplicateInfo);
      } else {
        setDuplicateFileWarning(null);
      }

      // Read all rows on client for validation chunking
      const buffer = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const fullRows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];
      setRawRows(fullRows);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
      setFile(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Run Staging & Validation
  const handleRunValidation = async () => {
    if (!batchId || rawRows.length === 0) {
      alert("Vui lòng tải lên file Excel trước");
      return;
    }

    if (!mapping.studentCode || !mapping.subjectName) {
      alert("Vui lòng chỉ định cột Mã học sinh và Tên môn học");
      return;
    }

    setIsValidating(true);
    try {
      const res = await fetch("/api/admin/competency-assessment/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          rows: rawRows,
          mapping,
          academicYearId: selectedYearId,
          assessmentPeriod: selectedPeriod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi kiểm tra dữ liệu");

      setValidationStats(data.stats);
      setSampleIssues(data.sampleIssues || []);
      setCurrentStep(2);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsValidating(false);
    }
  };

  // Commit Staging to Main Database
  const handleCommitImport = async () => {
    if (!batchId) return;

    setIsCommitting(true);
    try {
      const res = await fetch("/api/admin/competency-assessment/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          duplicateAction,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi commit dữ liệu");

      setCommitResult(data);
      setCurrentStep(3);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  // Quick Add Alias Handler
  const handleSaveAlias = async () => {
    if (aliasType === "SUBJECT_ALIAS" && (!aliasTargetId || !aliasPattern)) {
      alert("Vui lòng chọn môn học và nhập tên alias");
      return;
    }
    if (aliasType === "COMPETENCY_ALIAS" && (!aliasTargetId || !aliasPattern)) {
      alert("Vui lòng chọn năng lực và nhập tên alias");
      return;
    }
    if (aliasType === "NEW_COMPETENCY" && (!newCompSubjectId || !newCompName)) {
      alert("Vui lòng chọn môn học và nhập tên năng lực mới");
      return;
    }

    setAliasLoading(true);
    try {
      const payload: any = {
        type: aliasType,
        targetId: aliasTargetId,
        aliasPattern,
      };
      if (aliasType === "NEW_COMPETENCY") {
        payload.newCompetency = {
          subjectId: newCompSubjectId,
          name: newCompName,
        };
      }

      const res = await fetch("/api/admin/competency-assessment/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu alias");

      alert("Đã lưu thành công! Đang tự động kiểm tra lại dữ liệu...");
      setAliasModalOpen(false);
      setAliasPattern("");
      setNewCompName("");

      // Refresh references and rerun validation
      const refRes = await fetch("/api/admin/competency-assessment/aliases");
      const refData = await refRes.json();
      if (refData.subjects) setSubjectsList(refData.subjects);
      if (refData.competencies) setCompetenciesList(refData.competencies);

      handleRunValidation();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setAliasLoading(false);
    }
  };

  const filteredIssues = sampleIssues.filter((item) => {
    if (filterTab === "ALL") return true;
    return item.status === filterTab;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#007A72] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Quy trình Import Thông minh 8 Bước</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-850 tracking-tight">
            Import Đánh Giá Năng Lực Môn Học
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Hỗ trợ Staging trung gian, chuẩn hóa Alias Môn & Năng lực, phát hiện trùng lặp và tính Radar tự động.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/competency-assessment/history"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            Lịch sử & Rollback
          </Link>
          <Link
            href="/admin/competency-assessment/aliases"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#007A72] bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-2xl transition-all"
          >
            <Settings className="w-4 h-4" />
            Từ điển Alias
          </Link>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className={"p-4 rounded-2xl border transition-all flex items-center gap-3.5 " + (
            currentStep === 1
              ? "bg-[#003B3A] text-white border-[#003B3A] shadow-md"
              : currentStep > 1
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-white text-slate-400 border-slate-200"
          )}
        >
          <div
            className={"w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm " + (
              currentStep === 1 ? "bg-teal-400 text-slate-900" : currentStep > 1 ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
            )}
          >
            {currentStep > 1 ? <Check className="w-4 h-4" /> : "1"}
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Bước 1</div>
            <div className="text-xs font-black">Upload & Mapping Cột</div>
          </div>
        </div>

        <div
          className={"p-4 rounded-2xl border transition-all flex items-center gap-3.5 " + (
            currentStep === 2
              ? "bg-[#003B3A] text-white border-[#003B3A] shadow-md"
              : currentStep > 2
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-white text-slate-400 border-slate-200"
          )}
        >
          <div
            className={"w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm " + (
              currentStep === 2 ? "bg-teal-400 text-slate-900" : currentStep > 2 ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
            )}
          >
            {currentStep > 2 ? <Check className="w-4 h-4" /> : "2"}
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Bước 2</div>
            <div className="text-xs font-black">Kiểm tra & Xem Trước</div>
          </div>
        </div>

        <div
          className={"p-4 rounded-2xl border transition-all flex items-center gap-3.5 " + (
            currentStep === 3
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
              : "bg-white text-slate-400 border-slate-200"
          )}
        >
          <div
            className={"w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm " + (
              currentStep === 3 ? "bg-white text-emerald-800" : "bg-slate-100 text-slate-400"
            )}
          >
            3
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Bước 3</div>
            <div className="text-xs font-black">Hoàn tất & Lưu Trữ</div>
          </div>
        </div>
      </div>

      {/* STEP 1: UPLOAD & MAPPING */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Target Period & Year Selector */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-[#007A72]" />
              1. Cấu hình Đợt Đánh Giá & Năm Học Nhận Dữ Liệu
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Năm học:</label>
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#007A72]"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.status === "ACTIVE" ? "(Hiện tại)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Học kỳ:</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#007A72]"
                >
                  <option value={1}>Học kỳ I</option>
                  <option value={2}>Học kỳ II</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Đợt đánh giá:</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#007A72]"
                >
                  <option value="GIUA_KY_1">Giữa Học kỳ I</option>
                  <option value="CUOI_KY_1">Cuối Học kỳ I</option>
                  <option value="GIUA_KY_2">Giữa Học kỳ II</option>
                  <option value="CUOI_KY_2">Cuối Học kỳ II</option>
                  <option value="CA_NAM">Tổng kết Cả năm</option>
                </select>
              </div>
            </div>
          </div>

          {/* Drag & Drop Upload Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#007A72]" />
              2. Tải lên File Excel (.xlsx, .xls, .csv)
            </h3>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-teal-300 hover:border-[#007A72] bg-teal-50/20 hover:bg-teal-50/40 p-8 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all gap-3 text-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center text-[#007A72] shadow-xs">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">
                  {file ? file.name : "Nhấp hoặc kéo thả file Excel vào đây"}
                </p>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Hỗ trợ xử lý tệp dữ liệu lớn &ge; 100.000 dòng theo cơ chế Chunking & Staging
                </p>
              </div>
              {file && (
                <span className="text-[11px] font-mono font-bold bg-[#007A72] text-white px-3 py-1 rounded-full">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • {rawRows.length} dòng
                </span>
              )}
            </div>

            {duplicateFileWarning && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold">Cảnh báo file trùng lặp:</span> File này đã từng được import thành công bởi{" "}
                  <span className="font-bold">{duplicateFileWarning.importedBy || "người dùng khác"}</span> vào ngày{" "}
                  <span className="font-bold">{new Date(duplicateFileWarning.createdAt).toLocaleDateString("vi-VN")}</span>. Bạn vẫn có thể tiếp tục với tùy chọn ghi đè.
                </div>
              </div>
            )}
          </div>

          {/* Column Mapping Section */}
          {headers.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#007A72]" />
                  3. Ánh Xạ Cột (Column Mapping)
                </h3>
                <span className="text-[10px] font-bold text-slate-400">
                  Hệ thống tự động đề xuất dựa trên Header file Excel
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: "studentCode", label: "Mã học sinh (*Bắt buộc)", required: true, desc: "Khóa nhận diện chính" },
                  { key: "studentName", label: "Họ và tên", required: false, desc: "Hiển thị tham chiếu" },
                  { key: "className", label: "Lớp học", required: false, desc: "Mã lớp" },
                  { key: "subjectName", label: "Môn học (*Bắt buộc)", required: true, desc: "Tên môn để phân giải ID" },
                  { key: "competencyName", label: "Năng lực (*Bắt buộc)", required: true, desc: "Tên năng lực trên trục Radar" },
                  { key: "achievedScore", label: "Tổng giá trị (Điểm đạt)", required: false, desc: "Điểm thực tế (từ 2026-2027)" },
                  { key: "maxScore", label: "Tối đa (Điểm tối đa)", required: false, desc: "Thang điểm tối đa" },
                  { key: "radarPercent", label: "%_ThucTe_Radar (Lịch sử)", required: false, desc: "Chỉ dùng cho năm 2025-2026" },
                ].map((field) => (
                  <div key={field.key} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className={"font-black " + (field.required ? "text-slate-900" : "text-slate-700")}>
                        {field.label}
                      </span>
                    </div>
                    <select
                      value={mapping[field.key] || ""}
                      onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#007A72]"
                    >
                      <option value="">-- Bỏ qua / Không có --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 font-medium">{field.desc}</p>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-3">
                <button
                  disabled={isValidating || !file}
                  onClick={handleRunValidation}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-white bg-[#007A72] hover:bg-[#003B3A] shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isValidating ? (
                    <>Đang nạp Staging & Kiểm tra...</>
                  ) : (
                    <>
                      Tiến hành Kiểm tra Dữ liệu <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: VALIDATION STATS & PREVIEW */}
      {currentStep === 2 && validationStats && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Tổng dòng</div>
              <div className="text-xl font-black text-slate-800 mt-1">{validationStats.totalRows}</div>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
              <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hợp lệ
              </div>
              <div className="text-xl font-black text-emerald-700 mt-1">{validationStats.validRows}</div>
            </div>

            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 shadow-2xs">
              <div className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" /> Cảnh báo
              </div>
              <div className="text-xl font-black text-amber-700 mt-1">{validationStats.warningRows}</div>
            </div>

            <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200 shadow-2xs">
              <div className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-600" /> Lỗi (Error)
              </div>
              <div className="text-xl font-black text-rose-700 mt-1">{validationStats.errorRows}</div>
            </div>

            <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-200 shadow-2xs">
              <div className="text-[10px] font-bold text-sky-800 uppercase flex items-center gap-1">
                <Copy className="w-3 h-3 text-sky-600" /> Trùng lặp
              </div>
              <div className="text-xl font-black text-sky-700 mt-1">{validationStats.duplicateRows}</div>
            </div>

            <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200 shadow-2xs">
              <div className="text-[10px] font-bold text-indigo-800 uppercase flex items-center gap-1">
                <Info className="w-3 h-3 text-indigo-600" /> Cần duyệt
              </div>
              <div className="text-xl font-black text-indigo-700 mt-1">{validationStats.needReviewRows}</div>
            </div>
          </div>

          {/* Quick Alias Action Bar */}
          <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
              <Sparkles className="w-4 h-4 text-[#007A72]" />
              <span>Phát hiện tên môn học hoặc năng lực chưa khớp? Bạn có thể thêm Alias trực tiếp tại đây:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAliasType("SUBJECT_ALIAS");
                  setAliasModalOpen(true);
                }}
                className="px-3 py-1.5 bg-white border border-teal-300 hover:border-[#007A72] text-[#007A72] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                + Ánh xạ Môn học (Alias)
              </button>
              <button
                onClick={() => {
                  setAliasType("COMPETENCY_ALIAS");
                  setAliasModalOpen(true);
                }}
                className="px-3 py-1.5 bg-white border border-teal-300 hover:border-[#007A72] text-[#007A72] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                + Ánh xạ Năng lực (Alias)
              </button>
            </div>
          </div>

          {/* Issues / Preview Inspection Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  Chi Tiết Kiểm Tra & Báo Lỗi ({filteredIssues.length} dòng)
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  Hiển thị các dòng có cảnh báo, lỗi, trùng lặp hoặc cần duyệt
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {(["ALL", "ERROR", "WARNING", "DUPLICATE", "NEED_REVIEW"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={"px-3 py-1 rounded-lg transition-all cursor-pointer " + (
                      filterTab === tab ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {tab === "ALL"
                      ? "Tất cả"
                      : tab === "ERROR"
                      ? "Lỗi"
                      : tab === "WARNING"
                      ? "Cảnh báo"
                      : tab === "DUPLICATE"
                      ? "Trùng lặp"
                      : "Cần duyệt"}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">Dòng</th>
                    <th className="py-2.5 px-3">Mã HS</th>
                    <th className="py-2.5 px-3">Họ và tên</th>
                    <th className="py-2.5 px-3">Môn học</th>
                    <th className="py-2.5 px-3">Năng lực</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3">Chi tiết vấn đề</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredIssues.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        Không có dòng dữ liệu nào thuộc bộ lọc này.
                      </td>
                    </tr>
                  ) : (
                    filteredIssues.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">
                          {item.rowNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#007A72]">{item.studentCode}</td>
                        <td className="py-2.5 px-3 text-slate-800">{item.studentName || "—"}</td>
                        <td className="py-2.5 px-3 font-bold">{item.subject}</td>
                        <td className="py-2.5 px-3">{item.competency || "—"}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={"text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md border " + (
                              item.status === "ERROR"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : item.status === "WARNING"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : item.status === "DUPLICATE"
                                ? "bg-sky-50 text-sky-700 border-sky-200"
                                : item.status === "NEED_REVIEW"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs">
                          {item.errors?.map((e: string, eIdx: number) => (
                            <div key={eIdx} className="text-rose-600 font-medium">
                              • {e}
                            </div>
                          ))}
                          {item.warnings?.map((w: string, wIdx: number) => (
                            <div key={wIdx} className="text-amber-700 font-normal">
                              • {w}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Duplicate Handling Options & Final Action */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black text-slate-800">Xử lý bản ghi trùng lặp (Duplicate Handling):</span>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="dupAction"
                    checked={duplicateAction === "OVERWRITE"}
                    onChange={() => setDuplicateAction("OVERWRITE")}
                    className="text-[#007A72] focus:ring-[#007A72]"
                  />
                  Ghi đè bản ghi cũ (Cập nhật điểm mới nhất)
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="dupAction"
                    checked={duplicateAction === "SKIP"}
                    onChange={() => setDuplicateAction("SKIP")}
                    className="text-[#007A72] focus:ring-[#007A72]"
                  />
                  Bỏ qua dòng trùng (Giữ nguyên dữ liệu cũ)
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 inline mr-1" /> Quay lại
              </button>

              <button
                disabled={isCommitting || validationStats.validRows + validationStats.warningRows === 0}
                onClick={handleCommitImport}
                className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isCommitting ? (
                  <>Đang nạp dữ liệu chính thức...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Xác nhận Import vào Hệ thống
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS & REPORT */}
      {currentStep === 3 && commitResult && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm text-center space-y-6 max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-850">Import Dữ Liệu Thành Công!</h2>
            <p className="text-xs text-slate-500 font-medium">
              Toàn bộ dữ liệu đánh giá năng lực môn học đã được nạp chính thức và tự động tổng hợp biểu đồ Radar cho từng học sinh.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase block text-[10px]">Số bản ghi đã lưu</span>
              <span className="text-xl font-black text-[#007A72]">{commitResult.committedCount}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase block text-[10px]">Môn học đã tổng hợp Radar</span>
              <span className="text-xl font-black text-slate-800">{commitResult.summariesCount}</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setCurrentStep(1);
                setFile(null);
                setBatchId("");
                setRawRows([]);
              }}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
            >
              Import File Khác
            </button>

            <Link
              href="/admin/ho-so-hoc-sinh"
              className="px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider text-white bg-[#007A72] hover:bg-[#003B3A] shadow-md transition-all flex items-center gap-2"
            >
              Xem Hồ Sơ Năng Lực Học Sinh <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* QUICK ALIAS MODAL */}
      {aliasModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-sm font-black text-slate-850 uppercase tracking-tight flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#007A72]" />
              {aliasType === "SUBJECT_ALIAS"
                ? "Thêm Alias Môn Học"
                : aliasType === "COMPETENCY_ALIAS"
                ? "Thêm Alias Năng Lực"
                : "Thêm Năng Lực Mới"}
            </h3>

            {aliasType === "SUBJECT_ALIAS" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Chọn Môn học chuẩn:</label>
                  <select
                    value={aliasTargetId}
                    onChange={(e) => setAliasTargetId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="">-- Chọn môn --</option>
                    {subjectsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subjectName} ({s.subjectCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Tên Alias xuất hiện trong Excel:</label>
                  <input
                    type="text"
                    value={aliasPattern}
                    onChange={(e) => setAliasPattern(e.target.value)}
                    placeholder="VD: KHOA HỌC TỰ NHIÊN (LÍ)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>
            )}

            {aliasType === "COMPETENCY_ALIAS" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Chọn Năng lực chuẩn:</label>
                  <select
                    value={aliasTargetId}
                    onChange={(e) => setAliasTargetId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="">-- Chọn năng lực --</option>
                    {competenciesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.subject?.subjectName}] {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Tên Alias xuất hiện trong Excel:</label>
                  <input
                    type="text"
                    value={aliasPattern}
                    onChange={(e) => setAliasPattern(e.target.value)}
                    placeholder="VD: Kĩ năng nhận thức KHTN"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAliasModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                disabled={aliasLoading}
                onClick={handleSaveAlias}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#007A72] hover:bg-[#003B3A]"
              >
                {aliasLoading ? "Đang lưu..." : "Lưu & Khớp Lại"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
