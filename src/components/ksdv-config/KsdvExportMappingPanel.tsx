"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Play,
  Loader2,
  FileSpreadsheet,
  FileText,
  Power,
} from "lucide-react";

interface KsdvExportMappingPanelProps {
  subjects?: any[];
  academicYearId?: string;
}

const ALLOWED_SOURCE_OPTIONS = [
  { value: "student.studentCode", label: "student.studentCode (Mã hồ sơ)" },
  { value: "student.fullName", label: "student.fullName (Họ tên HS)" },
  { value: "student.dateOfBirth", label: "student.dateOfBirth (Ngày sinh)" },
  { value: "student.grade", label: "student.grade (Khối dự kiến)" },
  { value: "student.program", label: "student.program (Hệ đào tạo)" },
  { value: "period.code", label: "period.code (Mã đợt khảo sát)" },
  { value: "period.name", label: "period.name (Tên đợt khảo sát)" },
  { value: "campus.name", label: "campus.name (Cơ sở đăng ký)" },
  { value: "score.components[0]", label: "score.components[0] (Điểm thành phần 1)" },
  { value: "score.components[1]", label: "score.components[1] (Điểm thành phần 2)" },
  { value: "score.compositeScore", label: "score.compositeScore (Điểm tổng hợp môn)" },
  { value: "score.status", label: "score.status (Trạng thái: Đạt / Không đạt / Miễn / Không làm / Chưa nhập)" },
  { value: "score.remark", label: "score.remark (Nhận xét giáo viên)" },
  { value: "tci.criteriaResults", label: "tci.criteriaResults (Bảng 16 chỉ số TCI)" },
  { value: "tci.summaryCounts", label: "tci.summaryCounts (Thống kê Đạt / Không đạt / Không làm / Chưa nhập)" },
  { value: "tci.evidences.indicator_61", label: "tci.evidences.indicator_61 (Ảnh minh chứng Câu 16 / STT 61)" },
  { value: "tci.signature", label: "tci.signature (Khu vực ký xác nhận TCI)" },
  { value: "pvdh.student.studentCode", label: "pvdh.student.studentCode (Mã hồ sơ PVDH)" },
  { value: "pvdh.student.fullName", label: "pvdh.student.fullName (Họ tên HS PVDH)" },
  { value: "pvdh.studentInterview.q1", label: "pvdh.studentInterview.q1 (Trao đổi HS nhóm 1)" },
  { value: "pvdh.teacherObservation.strengthsInterests", label: "pvdh.teacherObservation.strengthsInterests (Ghi nhận GV)" },
  { value: "pvdh.orientationPlan.strengthsPriority", label: "pvdh.orientationPlan.strengthsPriority (Mục V.1)" },
  { value: "pvdh.orientationPlan.goalsActions", label: "pvdh.orientationPlan.goalsActions (Mục V.2)" },
  { value: "pvdh.orientationPlan.furtherTopics", label: "pvdh.orientationPlan.furtherTopics (Mục V.4 Checkbox)" },
  { value: "pvdh.orientationPlan.handoverNotes", label: "pvdh.orientationPlan.handoverNotes (Mục V.5 Bàn giao GVCN)" },
];

export function KsdvExportMappingPanel({
  subjects = [],
  academicYearId = "ALL",
}: KsdvExportMappingPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fileTemplates, setFileTemplates] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  // Form state (3 lớp cấu hình: Schema -> Phạm vi -> Mẫu xuất & Mapping)
  const [code, setCode] = useState("FILE_TOA_THCS");
  const [name, setName] = useState("Mẫu xuất kết quả Toán khảo sát đầu vào");
  const [resultType, setResultType] = useState<"SCORE" | "RUBRIC" | "CRITERIA" | "ORIENTATION">("SCORE");
  const [subjectCode, setSubjectCode] = useState("TOA");
  const [subjectName, setSubjectName] = useState("Toán học");
  const [exportFormat, setExportFormat] = useState<"HTML_PDF" | "XLSX" | "DOCX">("HTML_PDF");
  const [pageSize, setPageSize] = useState("A4");
  const [pageOrientation, setPageOrientation] = useState("PORTRAIT");
  const [copyCount, setCopyCount] = useState(1);
  const [priorityOrder, setPriorityOrder] = useState(100);
  const [fileNamePattern, setFileNamePattern] = useState("{subjectCode}_{studentCode}_{periodCode}_v{version}");
  const [sourceVerified, setSourceVerified] = useState(true);
  const [missingSourceNote, setMissingSourceNote] = useState("");

  // Schema options specific to resultType === "SCORE"
  const [maxScore, setMaxScore] = useState<number>(10);
  const [decimals, setDecimals] = useState<number>(1);
  const [formula, setFormula] = useState<string>("SUM");
  const [formulaCustom, setFormulaCustom] = useState<string>("");

  const [mappings, setMappings] = useState<any[]>([]);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const notify = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const loadFromTemplate = useCallback((tpl: any) => {
    if (!tpl) return;
    setSelectedId(tpl.id);
    setCode(tpl.code);
    setName(tpl.name);
    setResultType(tpl.resultType || "SCORE");
    setSubjectCode(tpl.subjectCode || "TOA");
    setSubjectName(tpl.subjectName || "");
    setExportFormat(tpl.exportFormat || "HTML_PDF");
    setPageSize(tpl.pageSize || "A4");
    setPageOrientation(tpl.pageOrientation || "PORTRAIT");
    setCopyCount(Number(tpl.copyCount || 1));
    setPriorityOrder(Number(tpl.priorityOrder || 100));
    setFileNamePattern(tpl.fileNamePattern || "{subjectCode}_{studentCode}_{periodCode}_v{version}");
    setSourceVerified(tpl.sourceVerified !== false);
    setMissingSourceNote(tpl.missingSourceNote || "");
    const sc = tpl.schemaConfig || {};
    setMaxScore(Number(sc.maxScore ?? 10));
    setDecimals(Number(sc.decimals ?? 1));
    setFormula(sc.formula || "SUM");
    setFormulaCustom(sc.formulaCustom || "");
    setMappings(Array.isArray(tpl.mappings) ? tpl.mappings : []);
    setPreviewResult(null);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ksdv-file-configs", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        const list = data.fileTemplates || [];
        setFileTemplates(list);
        if (list.length > 0 && !selectedId) {
          loadFromTemplate(list[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [selectedId, loadFromTemplate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCreateNewBlank = () => {
    setSelectedId("");
    setCode(`FILE_KSDV_${Date.now().toString().slice(-4)}`);
    setName("Mẫu xuất kết quả khảo sát mới");
    setResultType("SCORE");
    setSubjectCode(subjects[0]?.code || "TOA");
    setSubjectName(subjects[0]?.name || "Toán học");
    setExportFormat("XLSX");
    setSourceVerified(true);
    setMissingSourceNote("");
    setMappings([
      {
        fieldKey: "student_code",
        sourcePath: "student.studentCode",
        targetFormat: "XLSX",
        targetRef: "KetQua!B6",
        dataType: "TEXT",
        isRequired: true,
        emptyValuePolicy: "KEEP_BLANK",
      },
      {
        fieldKey: "student_name",
        sourcePath: "student.fullName",
        targetFormat: "XLSX",
        targetRef: "KetQua!C6",
        dataType: "TEXT",
        isRequired: true,
        emptyValuePolicy: "KEEP_BLANK",
      },
      {
        fieldKey: "subject_status",
        sourcePath: "score.status",
        targetFormat: "XLSX",
        targetRef: "KetQua!D6",
        dataType: "TEXT",
        isRequired: true,
        emptyValuePolicy: "EXPLICIT_STATUS_LABEL",
      },
    ]);
    setPreviewResult(null);
  };

  const handleValidatePreview = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ksdv-file-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VALIDATE_PREVIEW",
          resultType,
          exportFormat,
          schemaConfig:
            resultType === "SCORE"
              ? { maxScore, decimals, formula, formulaCustom, columnCount: 10 }
              : { hasTotalScore: false },
          mappings,
        }),
      });
      const data = await res.json();
      setPreviewResult(data);
      if (data.valid) {
        notify("ok", "Kiểm tra mapping & công thức hợp lệ! Sẵn sàng lưu hoặc phát hành.");
      } else {
        notify("err", `Phát hiện ${data.errors?.length || 1} lỗi mapping cần xử lý trước khi phát hành.`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (publishNow: boolean) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ksdv-file-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: publishNow ? "PUBLISH" : "SAVE",
          id: selectedId || undefined,
          code,
          name,
          resultType,
          subjectCode,
          subjectName,
          academicYearId,
          exportFormat,
          pageSize,
          pageOrientation,
          copyCount,
          priorityOrder,
          fileNamePattern,
          sourceVerified,
          missingSourceNote,
          schemaConfig:
            resultType === "SCORE"
              ? { maxScore, decimals, formula, formulaCustom, hasTotalScore: true, columnCount: 10 }
              : { hasTotalScore: false },
          mappings,
          publishNow,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notify("err", data.error || "Không thể lưu cấu hình file.");
        return;
      }
      notify("ok", publishNow ? "Đã phát hành mẫu xuất file khảo sát!" : "Đã lưu bản nháp cấu hình file xuất!");
      if (data.fileTemplates) {
        setFileTemplates(data.fileTemplates);
        if (data.template?.id) {
          const found = data.fileTemplates.find((x: any) => x.id === data.template.id);
          if (found) loadFromTemplate(found);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 flex items-center justify-center gap-2 text-xs text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin text-[#00A19A]" />
        <span>Đang tải cấu hình mapping và mẫu file xuất...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Cột trái: Danh sách mẫu xuất */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3 h-fit">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#003B3A]">Danh sách cấu hình mẫu xuất</h3>
          <button
            type="button"
            onClick={handleCreateNewBlank}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#003B3A] text-white text-[11px] font-semibold cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Thêm mẫu mới</span>
          </button>
        </div>

        <div className="space-y-2 max-h-[580px] overflow-y-auto">
          {fileTemplates.map((t) => {
            const active = t.id === selectedId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => loadFromTemplate(t)}
                className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer space-y-1 ${
                  active
                    ? "bg-[#F0FDFA] border-[#00A19A]"
                    : "bg-white hover:bg-[#F8FAFC] border-[#E2E8F0]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#003B3A] font-mono">{t.code}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      t.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {t.status === "ACTIVE" ? "Đang áp dụng" : "Nháp"}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 line-clamp-1">{t.name}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 tabular-nums">
                  <span>Loại: {t.resultType}</span>
                  <span>•</span>
                  <span>{t.exportFormat}</span>
                  <span>•</span>
                  <span>{t.mappings?.length || 0} field</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cột phải: Trình chỉnh 3 lớp cấu hình & Mapping */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-5">
        {toast && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              toast.type === "ok"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toast.msg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#003B3A]">
              Thiết lập cấu trúc dữ liệu, mẫu xuất &amp; khóa mapping
            </h3>
            <p className="text-xs text-slate-500">
              Chỉ hiển thị các tùy chọn tương ứng với loại kết quả đã chọn. Công thức chỉ cho phép toán tử số học và biến trong danh sách an toàn.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleValidatePreview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CCFBF1] bg-[#F0FDFA] text-[#003B3A] text-xs font-semibold cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-[#00736E]" />
              <span>Kiểm tra &amp; Xem trước mẫu</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu nháp</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer"
            >
              <Power className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span>Phát hành</span>
            </button>
          </div>
        </div>

        {/* Thuộc tính mẫu */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mã cấu hình file</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-mono font-bold"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tên mẫu xuất</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Loại kết quả biểu mẫu</label>
            <select
              value={resultType}
              onChange={(e) => {
                const nextType = e.target.value as any;
                setResultType(nextType);
                if (nextType === "RUBRIC") {
                  setSourceVerified(false);
                  setMissingSourceNote(
                    "Chưa có tài liệu rubric nguồn chính thức được đính kèm; hệ thống không tự tạo tiêu chí/thang điểm rubric."
                  );
                } else {
                  setSourceVerified(true);
                }
              }}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-semibold text-[#003B3A]"
            >
              <option value="SCORE">Điểm số (Toán, TV/Ngữ văn, Tiếng Anh viết...)</option>
              <option value="RUBRIC">Định tính / Rubric (khi có mẫu nguồn kiểm chứng)</option>
              <option value="CRITERIA">Tiêu chí 16 chỉ số (TCI Khối 1)</option>
              <option value="ORIENTATION">Phiếu định hướng HS và PHHS (Không tính điểm)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Môn / Nội dung liên kết</label>
            <select
              value={subjectCode}
              onChange={(e) => {
                const sc = e.target.value;
                setSubjectCode(sc);
                const found = subjects.find((s) => s.code === sc);
                if (found) setSubjectName(found.name);
              }}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-medium"
            >
              {subjects.map((s) => (
                <option key={s.id || s.code} value={s.code}>
                  {s.code} – {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Định dạng xuất hỗ trợ thực tế</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-semibold"
            >
              <option value="HTML_PDF">HTML / PDF cấu trúc chuẩn A4</option>
              <option value="XLSX">Excel (.xlsx – Sheet / Ô / Bảng lặp)</option>
              <option value="DOCX">Word / HTML Placeholder (.doc/.docx)</option>
            </select>
          </div>
        </div>

        {/* Khu vực tùy chọn riêng theo từng Loại biểu mẫu */}
        {resultType === "SCORE" && (
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Điểm tối đa</label>
              <input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value || 10))}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chữ số thập phân</label>
              <select
                value={decimals}
                onChange={(e) => setDecimals(Number(e.target.value))}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs tabular-nums"
              >
                <option value={0}>0 (Số nguyên)</option>
                <option value={1}>1 chữ số (0.1)</option>
                <option value={2}>2 chữ số (0.01)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phép tính tổng hợp</label>
              <select
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="SUM">Cộng thành phần (SUM)</option>
                <option value="AVERAGE">Trung bình cộng (AVERAGE)</option>
                <option value="CUSTOM">Công thức an toàn ([col0]+[col1])</option>
                <option value="NONE">Không tính tổng</option>
              </select>
            </div>
            {formula === "CUSTOM" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Biểu thức cho phép</label>
                <input
                  type="text"
                  value={formulaCustom}
                  onChange={(e) => setFormulaCustom(e.target.value)}
                  placeholder="([col0] + [col1]) / 2"
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
            )}
          </div>
        )}

        {resultType === "RUBRIC" && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-900">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Kiểm soát nguồn tài liệu Rubric (Ví dụ: Tiếng Anh vấn đáp)</span>
            </div>
            <p>
              Hệ thống không tự sinh tiêu chí hay mức đánh giá Rubric khi chưa đối chiếu biểu mẫu gốc. Chỉ bật xác nhận bên dưới khi đã cập nhật đúng tiêu chí từ tài liệu chính thức của nhà trường.
            </p>
            <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={sourceVerified}
                onChange={(e) => setSourceVerified(e.target.checked)}
                className="rounded border-amber-400 text-[#00A19A]"
              />
              <span>Đã đối chiếu đầy đủ từ biểu mẫu Rubric nguồn (Cho phép phát hành)</span>
            </label>
          </div>
        )}

        {(resultType === "ORIENTATION" || resultType === "CRITERIA") && (
          <div className="p-3 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-xs text-[#005854] font-medium">
            {resultType === "ORIENTATION"
              ? "Biểu mẫu Định hướng HS & PHHS chỉ ánh xạ các nhóm câu hỏi và ghi nhận định tính; hệ thống tự động tắt trường Tổng điểm số."
              : "Biểu mẫu TCI giữ nguyên 16 tiêu chí (Đạt / Không đạt / Không làm; Chưa nhập tách riêng) và hỗ trợ cấu hình vùng xuất ảnh minh chứng Câu 16 (chỉ số 61) động qua khóa frame:tci_c16_images."}
          </div>
        )}

        {/* Khổ giấy & Quy tắc tên file xuất */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Khổ giấy</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
            >
              <option value="A4">A4</option>
              <option value="A5">A5</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hướng giấy</label>
            <select
              value={pageOrientation}
              onChange={(e) => setPageOrientation(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs"
            >
              <option value="PORTRAIT">Dọc (Portrait)</option>
              <option value="LANDSCAPE">Ngang (Landscape)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Số bản in</label>
            <input
              type="number"
              min={1}
              max={5}
              value={copyCount}
              onChange={(e) => setCopyCount(Number(e.target.value || 1))}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mẫu tên file (Không chứa SĐT)</label>
            <input
              type="text"
              value={fileNamePattern}
              onChange={(e) => setFileNamePattern(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-mono"
            />
          </div>
        </div>

        {/* Bảng Mapping Dữ liệu */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#003B3A]">
              Bảng ánh xạ trường dữ liệu sang đích xuất ({mappings.length} dòng)
            </h4>
            <button
              type="button"
              onClick={() =>
                setMappings((prev) => [
                  ...prev,
                  {
                    fieldKey: `field_${prev.length + 1}`,
                    sourcePath: "student.studentCode",
                    targetFormat: exportFormat,
                    targetRef: exportFormat === "XLSX" ? `Sheet1!A${prev.length + 2}` : `{{field_${prev.length + 1}}}`,
                    dataType: "TEXT",
                    isRequired: false,
                    emptyValuePolicy: "KEEP_BLANK",
                  },
                ])
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#CCFBF1] bg-[#F0FDFA] text-[#00736E] text-[11px] font-semibold cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Thêm dòng mapping</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-2.5 px-3 text-left text-white">Field key</th>
                  <th className="py-2.5 px-3 text-left text-teal-100">Nguồn dữ liệu cho phép</th>
                  <th className="py-2.5 px-3 text-left text-teal-100">Đích xuất (Ô Excel / Placeholder)</th>
                  <th className="py-2.5 px-3 text-left text-teal-100">Xử lý ô trống</th>
                  <th className="py-2.5 px-3 text-center text-[#5EEAD4]">Bắt buộc</th>
                  <th className="py-2.5 px-3 text-center text-white w-12">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {mappings.map((m, idx) => (
                  <tr key={idx} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3 align-middle">
                      <input
                        type="text"
                        value={m.fieldKey}
                        onChange={(e) =>
                          setMappings((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, fieldKey: e.target.value } : x))
                          )
                        }
                        className="w-32 rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <select
                        value={m.sourcePath}
                        onChange={(e) =>
                          setMappings((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, sourcePath: e.target.value } : x))
                          )
                        }
                        className="w-full min-w-[210px] rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs"
                      >
                        {ALLOWED_SOURCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                        {!ALLOWED_SOURCE_OPTIONS.some((o) => o.value === m.sourcePath) && (
                          <option value={m.sourcePath}>{m.sourcePath}</option>
                        )}
                      </select>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <input
                        type="text"
                        value={m.targetRef}
                        onChange={(e) =>
                          setMappings((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, targetRef: e.target.value, targetFormat: exportFormat }
                                : x
                            )
                          )
                        }
                        className="w-40 rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <select
                        value={m.emptyValuePolicy || "KEEP_BLANK"}
                        onChange={(e) =>
                          setMappings((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, emptyValuePolicy: e.target.value } : x
                            )
                          )
                        }
                        className="rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs"
                      >
                        <option value="KEEP_BLANK">Để trống (Không ép = 0)</option>
                        <option value="EXPLICIT_STATUS_LABEL">Ghi rõ trạng thái (Chưa nhập/Miễn...)</option>
                        <option value="DASH">Dấu gạch ngang (—)</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 align-middle text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(m.isRequired)}
                        onChange={(e) =>
                          setMappings((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, isRequired: e.target.checked } : x))
                          )
                        }
                        className="rounded border-slate-300 text-[#00A19A]"
                      />
                    </td>
                    <td className="py-2.5 px-3 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => setMappings((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kết quả kiểm tra & Xem trước dữ liệu mẫu */}
        {previewResult && (
          <div className="p-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold">
              {previewResult.valid ? (
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mapping hợp lệ – Không có khóa trùng hoặc biến ngoài danh mục</span>
                </span>
              ) : (
                <span className="text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Phát hiện lỗi mapping chặn phát hành:</span>
                </span>
              )}
            </div>

            {previewResult.errors?.length > 0 && (
              <ul className="list-disc pl-5 text-xs text-rose-700 space-y-1">
                {previewResult.errors.map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}

            {previewResult.previewRows?.length > 0 && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-xs tabular-nums">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2 px-3 text-left">Field key</th>
                      <th className="py-2 px-3 text-left">Đích xuất</th>
                      <th className="py-2 px-3 text-left">Giá trị kết xuất mẫu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {previewResult.previewRows.slice(0, 8).map((r: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-mono">{r.fieldKey}</td>
                        <td className="py-2 px-3 font-mono text-[#00736E]">{r.targetRef}</td>
                        <td className="py-2 px-3 text-slate-800">{String(r.sampleOutput)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
