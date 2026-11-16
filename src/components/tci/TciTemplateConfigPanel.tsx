"use client";

import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
    CheckCircle2,
    Copy,
    Eye,
    FileCheck2,
    FileSpreadsheet,
    Image as ImageIcon,
    Info,
    Lock,
    Play,
    RotateCcw,
    Save,
    ShieldCheck,
    Sliders,
    Upload,
    UserCheck,
    X,
} from "lucide-react";
import {
    TCI_SUBJECT_DISPLAY_LABEL,
    TCI_ASSESSMENT_TYPE,
    TCI_DEFAULT_TEMPLATE_CODE,
    TCI_DEFAULT_TEMPLATE_NAME,
    DEFAULT_TCI_CRITERIA_16,
    DEFAULT_TCI_FOOTER_CONFIG,
    DEFAULT_TCI_EXPORT_CONFIG,
    TciCriterionConfig,
    TciFooterConfig,
    TciExportConfig,
    formatIndicatorCodesLabel,
} from "@/lib/tci/constants";

interface TciTemplateConfigPanelProps {
    academicYearId?: string;
    periodId?: string;
    educationSystemId?: string;
    grade?: string;
}

export default function TciTemplateConfigPanel({
    academicYearId = "ALL",
    periodId = "ALL",
    educationSystemId = "ALL",
    grade = "Khối 1",
}: TciTemplateConfigPanelProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

    // State biểu mẫu cấu hình
    const [templateCode, setTemplateCode] = useState(TCI_DEFAULT_TEMPLATE_CODE);
    const [templateName, setTemplateName] = useState(TCI_DEFAULT_TEMPLATE_NAME);
    const [versionCode, setVersionCode] = useState("v1.0");
    const [status, setStatus] = useState<"DRAFT" | "ACTIVE" | "INACTIVE">("ACTIVE");
    const [usageCount, setUsageCount] = useState(0);
    const [isImmutable, setIsImmutable] = useState(false);

    const [criteria, setCriteria] = useState<TciCriterionConfig[]>(DEFAULT_TCI_CRITERIA_16);
    const [footerConfig, setFooterConfig] = useState<TciFooterConfig>(DEFAULT_TCI_FOOTER_CONFIG);
    const [exportConfig, setExportConfig] = useState<TciExportConfig>(DEFAULT_TCI_EXPORT_CONFIG);

    const [expandedStt, setExpandedStt] = useState<number | null>(16);
    const [activeSectionTab, setActiveSectionTab] = useState<"criteria" | "footer" | "versions">("criteria");
    const [showTeacherPreviewModal, setShowTeacherPreviewModal] = useState(false);

    const applyTemplateToForm = useCallback((tpl: any) => {
        if (!tpl) return;
        setSelectedTemplateId(tpl.id || "");
        setTemplateCode(tpl.code || TCI_DEFAULT_TEMPLATE_CODE);
        setTemplateName(tpl.name || TCI_DEFAULT_TEMPLATE_NAME);
        setVersionCode(tpl.versionCode || `v${tpl.versionNumber || 1}.0`);
        setStatus(tpl.status || "DRAFT");
        setUsageCount(Number(tpl.usageCount || 0));
        setIsImmutable(Boolean(tpl.isImmutable || Number(tpl.usageCount || 0) > 0));
        setCriteria(
            Array.isArray(tpl.criteria) && tpl.criteria.length === 16
                ? tpl.criteria
                : DEFAULT_TCI_CRITERIA_16
        );
        setFooterConfig({ ...DEFAULT_TCI_FOOTER_CONFIG, ...(tpl.footerConfig || {}) });
        setExportConfig({ ...DEFAULT_TCI_EXPORT_CONFIG, ...(tpl.exportConfig || {}) });
    }, []);

    const fetchTemplates = useCallback(
        async (preferTemplateId?: string) => {
            setLoading(true);
            try {
                const res = await fetch("/api/tci/templates");
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Không thể tải mẫu phiếu TCI");

                const list = Array.isArray(data.templates) ? data.templates : [];
                setTemplates(list);

                const target =
                    (preferTemplateId && list.find((t: any) => t.id === preferTemplateId)) ||
                    data.activeTemplate ||
                    list[0];
                if (target) {
                    applyTemplateToForm(target);
                }
            } catch (err: any) {
                toast.error(err.message || "Lỗi tải cấu hình mẫu phiếu TCI");
            } finally {
                setLoading(false);
            }
        },
        [applyTemplateToForm]
    );

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleCriterionChange = (stt: number, patch: Partial<TciCriterionConfig>) => {
        setCriteria((prev) =>
            prev.map((item) => (item.stt === stt ? { ...item, ...patch } : item))
        );
    };

    const handleIndicatorCodesInput = (stt: number, rawVal: string) => {
        const codes = rawVal
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        handleCriterionChange(stt, { indicatorCodes: codes });
    };

    const handleSampleImageUpload = (stt: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
        if (!allowed.includes(file.type)) {
            toast.error("Chỉ hỗ trợ ảnh mẫu định dạng JPEG, PNG, WebP hoặc SVG.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Ảnh mẫu không vượt quá 5MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            handleCriterionChange(stt, { sampleImageUrl: String(reader.result || "") });
            toast.success(`Đã cập nhật ảnh mẫu cho Câu ${stt}. Nhấn "Lưu nháp" để lưu vào mẫu phiếu.`);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveDraft = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/tci/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "SAVE_DRAFT",
                    id: selectedTemplateId || undefined,
                    code: templateCode,
                    name: templateName,
                    academicYearId,
                    periodId,
                    educationSystemId,
                    grade: grade === "ALL" ? "Khối 1" : grade,
                    criteria,
                    footerConfig,
                    exportConfig,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Lỗi lưu cấu hình mẫu TCI");
            toast.success(data.message || "Đã lưu cấu hình mẫu phiếu TCI.");
            await fetchTemplates(data.template?.id);
        } catch (err: any) {
            toast.error(err.message || "Không thể lưu mẫu phiếu TCI");
        } finally {
            setSaving(false);
        }
    };

    const handleCloneVersion = async () => {
        if (!selectedTemplateId) return;
        setSaving(true);
        try {
            const res = await fetch("/api/tci/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "CLONE_VERSION",
                    sourceTemplateId: selectedTemplateId,
                    newName: templateName,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Lỗi sao chép phiên bản");
            toast.success(data.message || "Đã tạo phiên bản mới.");
            await fetchTemplates(data.template?.id);
        } catch (err: any) {
            toast.error(err.message || "Lỗi sao chép phiên bản");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (nextAction: "ACTIVATE" | "DEACTIVATE") => {
        if (!selectedTemplateId) return;
        setSaving(true);
        try {
            const res = await fetch("/api/tci/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: nextAction,
                    templateId: selectedTemplateId,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Lỗi cập nhật trạng thái mẫu phiếu");
            toast.success(data.message || "Đã cập nhật trạng thái mẫu phiếu.");
            await fetchTemplates(selectedTemplateId);
        } catch (err: any) {
            toast.error(err.message || "Không thể cập nhật trạng thái mẫu phiếu");
        } finally {
            setSaving(false);
        }
    };

    const handleOpenPrintPreview = () => {
        const url = `/api/tci/templates?mode=preview_html&templateId=${encodeURIComponent(
            selectedTemplateId || ""
        )}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleResetVerbatim16 = () => {
        if (isImmutable) {
            toast.error("Phiên bản này đã có dữ liệu khảo sát. Vui lòng Sao chép phiên bản mới trước khi khôi phục.");
            return;
        }
        setCriteria(DEFAULT_TCI_CRITERIA_16);
        toast.success("Đã khôi phục nguyên văn 16 tiêu chí chuẩn Bộ chuẩn phát triển trẻ em 5–6 tuổi.");
    };

    if (loading) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-600">
                Đang tải cấu hình phiếu khảo sát đầu vào môn TCI...
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Dải đầu trang chuẩn Sổ cái Học thuật Sky-Line */}
            <div className="bg-white border border-slate-200 border-l-4 border-l-[#003B3A] rounded-xl p-5 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#003B3A] text-white">
                                Mã môn: TCI
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-teal-50 text-[#00736E] border border-teal-200">
                                {TCI_ASSESSMENT_TYPE} (16 tiêu chí)
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 tabular-nums">
                                Phiên bản: {versionCode}
                            </span>
                            {status === "ACTIVE" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Đang áp dụng
                                </span>
                            ) : status === "DRAFT" ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    Bản nháp
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    Ngừng áp dụng
                                </span>
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-[#003B3A] mt-2">
                            {TCI_SUBJECT_DISPLAY_LABEL}
                        </h2>
                        <p className="text-xs text-slate-600 mt-0.5">
                            Đối tượng: Học sinh dự tuyển vào Lớp 1 • Đánh giá theo 16 tiêu chí (Đạt / Không đạt / Không làm) • Hỗ trợ ảnh sản phẩm tại Câu 16 & ký số lưu PDF bất biến.
                        </p>
                    </div>

                    {/* Thanh nút thao tác mẫu phiếu */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleOpenPrintPreview}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            <Eye className="w-3.5 h-3.5 text-[#00736E]" />
                            Xem trước phiếu
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowTeacherPreviewModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            <UserCheck className="w-3.5 h-3.5 text-[#00736E]" />
                            Xem trước giao diện GV
                        </button>
                        <button
                            type="button"
                            onClick={handleCloneVersion}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-teal-200 bg-teal-50 text-[#00736E] hover:bg-teal-100 transition-colors disabled:opacity-50"
                        >
                            <Copy className="w-3.5 h-3.5" />
                            Sao chép phiên bản
                        </button>
                        {status !== "ACTIVE" ? (
                            <button
                                type="button"
                                onClick={() => handleToggleStatus("ACTIVATE")}
                                disabled={saving}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                                <Play className="w-3.5 h-3.5" />
                                Kích hoạt áp dụng
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleToggleStatus("DEACTIVATE")}
                                disabled={saving}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
                            >
                                Ngừng áp dụng
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250] transition-colors disabled:opacity-50"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? "Đang lưu..." : "Lưu nháp / Cập nhật"}
                        </button>
                    </div>
                </div>

                {/* Cảnh báo khóa cấu trúc nếu phiên bản đã có học sinh được đánh giá */}
                {isImmutable && (
                    <div className="mt-4 flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                        <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                            <span>
                                Phiên bản <strong>{versionCode}</strong> đã phát sinh{" "}
                                <strong className="tabular-nums">{usageCount}</strong> hồ sơ đánh giá thực tế. Để bảo toàn lịch sử, nội dung và mã chỉ số của 16 tiêu chí không được sửa trực tiếp trên phiên bản này.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleCloneVersion}
                            className="shrink-0 px-3 py-1.5 rounded-md font-semibold bg-amber-700 text-white hover:bg-amber-800 transition-colors"
                        >
                            Tạo phiên bản mới để sửa
                        </button>
                    </div>
                )}

                {/* Thông tin định danh mẫu & chọn phiên bản */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            Chọn phiên bản mẫu phiếu
                        </label>
                        <select
                            value={selectedTemplateId}
                            onChange={(e) => {
                                const found = templates.find((t) => t.id === e.target.value);
                                if (found) applyTemplateToForm(found);
                            }}
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white tabular-nums"
                        >
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.code} ({t.versionCode}) —{" "}
                                    {t.status === "ACTIVE"
                                        ? "Đang áp dụng"
                                        : t.status === "DRAFT"
                                          ? "Bản nháp"
                                          : "Ngừng áp dụng"}{" "}
                                    ({t.usageCount || 0} hồ sơ)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            Mã mẫu phiếu
                        </label>
                        <input
                            type="text"
                            value={templateCode}
                            onChange={(e) => setTemplateCode(e.target.value)}
                            disabled={isImmutable}
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 tabular-nums"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            Tên mẫu phiếu khảo sát đầu vào
                        </label>
                        <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* Thanh chuyển tab cấu hình chi tiết */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-2">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveSectionTab("criteria")}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                            activeSectionTab === "criteria"
                                ? "bg-[#003B3A] text-white"
                                : "text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        1. Cấu hình 16 tiêu chí & Minh chứng ảnh (Câu 13, Câu 16)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSectionTab("footer")}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                            activeSectionTab === "footer"
                                ? "bg-[#003B3A] text-white"
                                : "text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        2. Cấu hình cuối phiếu, Chữ ký & Mẫu in Word/PDF
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSectionTab("versions")}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors tabular-nums ${
                            activeSectionTab === "versions"
                                ? "bg-[#003B3A] text-white"
                                : "text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        3. Lịch sử phiên bản ({templates.length})
                    </button>
                </div>

                {activeSectionTab === "criteria" && !isImmutable && (
                    <button
                        type="button"
                        onClick={handleResetVerbatim16}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Khôi phục nguyên văn 16 tiêu chí gốc
                    </button>
                )}
            </div>

            {/* TAB 1: CẤU HÌNH 16 TIÊU CHÍ */}
            {activeSectionTab === "criteria" && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-700">
                            Danh mục 16 tiêu chí đánh giá (Phân biệt STT 1–16 trong phiếu và Mã chỉ số tham chiếu; STT 11 gồm Chỉ số 42, 43 tính là 1 tiêu chí)
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                            Tổng số tiêu chí cố định: <strong>16 tiêu chí</strong>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse tabular-nums">
                            <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                                <tr className="border-b text-xs font-semibold">
                                    <th className="py-2.5 px-3 w-14 text-center font-semibold">STT</th>
                                    <th className="py-2.5 px-3 w-28 font-semibold">Mã chỉ số</th>
                                    <th className="py-2.5 px-3 font-semibold">Nội dung tiêu chí & Hướng dẫn thực hiện</th>
                                    <th className="py-2.5 px-3 w-44 font-semibold">Loại kết quả</th>
                                    <th className="py-2.5 px-3 w-52 font-semibold">Minh chứng & Nội dung bổ trợ</th>
                                    <th className="py-2.5 px-3 w-28 text-center font-semibold">Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-xs">
                                {criteria.map((c) => {
                                    const isExpanded = expandedStt === c.stt;
                                    return (
                                        <React.Fragment key={c.criterionId}>
                                            <tr
                                                className={`hover:bg-slate-50/80 transition-colors ${
                                                    c.stt === 13 || c.stt === 16 ? "bg-teal-50/20" : ""
                                                }`}
                                            >
                                                <td className="py-3 px-3 text-center font-bold text-[#003B3A]">
                                                    {c.stt}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <input
                                                        type="text"
                                                        disabled={isImmutable}
                                                        value={c.indicatorCodes.join(", ")}
                                                        onChange={(e) =>
                                                            handleIndicatorCodesInput(c.stt, e.target.value)
                                                        }
                                                        className="w-24 h-8 px-2 rounded border border-slate-300 font-semibold text-[#003B3A] bg-white disabled:bg-slate-100"
                                                        title="Nhập nhiều mã chỉ số cách nhau bởi dấu phẩy (VD: 42, 43)"
                                                    />
                                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                                        {formatIndicatorCodesLabel(c.indicatorCodes)}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <input
                                                        type="text"
                                                        disabled={isImmutable}
                                                        value={c.content}
                                                        onChange={(e) =>
                                                            handleCriterionChange(c.stt, {
                                                                content: e.target.value,
                                                            })
                                                        }
                                                        className="w-full h-8 px-2.5 rounded border border-slate-300 font-semibold text-slate-900 bg-white disabled:bg-slate-100"
                                                    />
                                                    <div className="mt-1.5 flex items-center gap-2">
                                                        <span className="text-[11px] text-slate-500 shrink-0">
                                                            Hướng dẫn:
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={c.guideline || ""}
                                                            onChange={(e) =>
                                                                handleCriterionChange(c.stt, {
                                                                    guideline: e.target.value,
                                                                })
                                                            }
                                                            className="w-full h-7 px-2 rounded border border-slate-200 text-[11px] text-slate-600 bg-slate-50"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                                            Đạt
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                                                            Không đạt
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                                                            Không làm
                                                        </span>
                                                    </div>
                                                    <label className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-slate-600 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={c.allowNote}
                                                            onChange={(e) =>
                                                                handleCriterionChange(c.stt, {
                                                                    allowNote: e.target.checked,
                                                                })
                                                            }
                                                            className="rounded border-slate-300 text-[#003B3A]"
                                                        />
                                                        Cho phép ô ghi chú
                                                    </label>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="space-y-1">
                                                        {c.supplementaryType === "WRITING_SAMPLE_BOX" && (
                                                            <span className="inline-block px-2 py-0.5 rounded bg-teal-50 text-[#00736E] border border-teal-200 font-semibold">
                                                                Vùng GV viết mẫu / HS viết theo
                                                            </span>
                                                        )}
                                                        {c.supplementaryType ===
                                                            "COLORING_SAMPLE_AND_PRODUCT" && (
                                                            <span className="inline-block px-2 py-0.5 rounded bg-teal-50 text-[#00736E] border border-teal-200 font-semibold">
                                                                Ảnh mẫu tô màu + Mục Sản phẩm
                                                            </span>
                                                        )}
                                                        <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={c.allowProductImage}
                                                                onChange={(e) =>
                                                                    handleCriterionChange(c.stt, {
                                                                        allowProductImage: e.target.checked,
                                                                    })
                                                                }
                                                                className="rounded border-slate-300 text-[#003B3A]"
                                                            />
                                                            Đính kèm ảnh sản phẩm
                                                        </label>
                                                        {c.allowProductImage && (
                                                            <label className="flex items-center gap-1.5 text-[11px] text-amber-800 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={c.isProductImageRequired}
                                                                    onChange={(e) =>
                                                                        handleCriterionChange(c.stt, {
                                                                            isProductImageRequired:
                                                                                e.target.checked,
                                                                        })
                                                                    }
                                                                    className="rounded border-slate-300 text-amber-600"
                                                                />
                                                                Bắt buộc ảnh khi hoàn thành
                                                            </label>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setExpandedStt(isExpanded ? null : c.stt)
                                                        }
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium"
                                                    >
                                                        <Sliders className="w-3 h-3" />
                                                        {isExpanded ? "Thu gọn" : "Thiết lập"}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Khung thiết lập mở rộng cho từng tiêu chí (Đặc biệt cho Câu 13 và Câu 16) */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50/90">
                                                    <td colSpan={6} className="p-4 border-t border-slate-200">
                                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                            {/* Cột 1: Cấu hình loại bổ trợ */}
                                                            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2.5">
                                                                <div className="font-bold text-[#003B3A]">
                                                                    Nội dung bổ trợ trên phiếu (Câu {c.stt})
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                                                        Loại vùng bổ trợ
                                                                    </label>
                                                                    <select
                                                                        value={c.supplementaryType}
                                                                        onChange={(e) =>
                                                                            handleCriterionChange(c.stt, {
                                                                                supplementaryType: e.target
                                                                                    .value as any,
                                                                            })
                                                                        }
                                                                        className="w-full h-8 px-2 rounded border border-slate-300 text-xs bg-white"
                                                                    >
                                                                        <option value="NONE">
                                                                            Tiêu chí thông thường
                                                                        </option>
                                                                        <option value="WRITING_SAMPLE_BOX">
                                                                            Câu 13: Giáo viên viết mẫu / Thí sinh viết theo
                                                                        </option>
                                                                        <option value="COLORING_SAMPLE_AND_PRODUCT">
                                                                            Câu 16: Ảnh mẫu tô màu + Mục Sản phẩm học sinh
                                                                        </option>
                                                                    </select>
                                                                </div>

                                                                {c.supplementaryType ===
                                                                    "WRITING_SAMPLE_BOX" && (
                                                                    <div>
                                                                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                                                            Chữ viết mẫu mặc định của Giáo viên
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={c.writingPromptDefault || ""}
                                                                            onChange={(e) =>
                                                                                handleCriterionChange(c.stt, {
                                                                                    writingPromptDefault:
                                                                                        e.target.value,
                                                                                })
                                                                            }
                                                                            placeholder="VD: bé chăm ngoan"
                                                                            className="w-full h-8 px-2.5 rounded border border-slate-300 text-xs"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Cột 2: Cấu hình Ảnh mẫu (Câu 16) */}
                                                            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2.5">
                                                                <div className="font-bold text-[#003B3A] flex items-center justify-between">
                                                                    <span>Ảnh mẫu hiển thị trên đề/phiếu</span>
                                                                    <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-50 text-[#00736E] border border-teal-200 cursor-pointer hover:bg-teal-100 text-[11px] font-semibold">
                                                                        <Upload className="w-3 h-3" />
                                                                        Tải ảnh mẫu
                                                                        <input
                                                                            type="file"
                                                                            accept="image/jpeg,image/png,image/webp,image/svg+xml"
                                                                            className="hidden"
                                                                            onChange={(e) =>
                                                                                handleSampleImageUpload(
                                                                                    c.stt,
                                                                                    e
                                                                                )
                                                                            }
                                                                        />
                                                                    </label>
                                                                </div>
                                                                {c.sampleImageUrl ? (
                                                                    <div className="space-y-2">
                                                                        <div className="border border-slate-200 rounded p-2 bg-slate-50 flex items-center justify-center max-h-40 overflow-hidden">
                                                                            <img
                                                                                src={c.sampleImageUrl}
                                                                                alt={`Ảnh mẫu Câu ${c.stt}`}
                                                                                className="max-h-36 object-contain"
                                                                            />
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-500">
                                                                            Ảnh mẫu gắn với phiên bản {versionCode} và hiển thị chung cho học sinh áp dụng mẫu này (không bị ảnh sản phẩm của HS ghi đè).
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="border border-dashed border-slate-300 rounded p-4 text-center text-slate-500 text-[11px]">
                                                                        Chưa đính kèm ảnh mẫu cho tiêu chí này.
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Cột 3: Quy tắc Ảnh sản phẩm của học sinh */}
                                                            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2.5">
                                                                <div className="font-bold text-[#003B3A]">
                                                                    Quy tắc tải Ảnh sản phẩm của học sinh
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                                                            Số ảnh tối đa
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            max={10}
                                                                            value={c.maxImages}
                                                                            onChange={(e) =>
                                                                                handleCriterionChange(c.stt, {
                                                                                    maxImages: Math.max(
                                                                                        1,
                                                                                        Number(e.target.value)
                                                                                    ),
                                                                                })
                                                                            }
                                                                            className="w-full h-8 px-2 rounded border border-slate-300 text-xs tabular-nums"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                                                            Dung lượng tối đa (MB)
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            max={20}
                                                                            value={c.maxFileSizeMb}
                                                                            onChange={(e) =>
                                                                                handleCriterionChange(c.stt, {
                                                                                    maxFileSizeMb: Math.max(
                                                                                        1,
                                                                                        Number(e.target.value)
                                                                                    ),
                                                                                })
                                                                            }
                                                                            className="w-full h-8 px-2 rounded border border-slate-300 text-xs tabular-nums"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="text-[11px] text-slate-600">
                                                                    Định dạng cho phép: <strong>JPEG, PNG, WebP</strong>
                                                                </div>
                                                                <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer pt-1">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Boolean(
                                                                            c.requireImageOnKhongLam
                                                                        )}
                                                                        onChange={(e) =>
                                                                            handleCriterionChange(c.stt, {
                                                                                requireImageOnKhongLam:
                                                                                    e.target.checked,
                                                                            })
                                                                        }
                                                                        className="rounded border-slate-300 text-[#003B3A]"
                                                                    />
                                                                    Bắt buộc ảnh ngay cả khi chọn "Không làm" (Mặc định tắt)
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: CẤU HÌNH CUỐI PHIẾU & MẪU XUẤT WORD/PDF */}
            {activeSectionTab === "footer" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                        <h3 className="text-sm font-bold text-[#003B3A] border-b border-slate-100 pb-2.5">
                            Cấu hình các mục nhận xét cuối phiếu & Chữ ký
                        </h3>

                        {[
                            {
                                enableKey: "enableHighlightsComment",
                                labelKey: "highlightsCommentLabel",
                                reqKey: "highlightsCommentRequired",
                                title: "Mục 1: Điểm nổi bật",
                            },
                            {
                                enableKey: "enableSupportNeededComment",
                                labelKey: "supportNeededCommentLabel",
                                reqKey: "supportNeededCommentRequired",
                                title: "Mục 2: Nội dung cần hỗ trợ",
                            },
                            {
                                enableKey: "enableTeacherRecommendation",
                                labelKey: "teacherRecommendationLabel",
                                reqKey: "teacherRecommendationRequired",
                                title: "Mục 3: Đề xuất của giáo viên",
                            },
                            {
                                enableKey: "enableGeneralComment",
                                labelKey: "generalCommentLabel",
                                reqKey: "generalCommentRequired",
                                title: "Mục 4: Nhận xét chung",
                            },
                        ].map((field) => (
                            <div
                                key={field.enableKey}
                                className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2"
                            >
                                <div className="flex items-center justify-between">
                                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean((footerConfig as any)[field.enableKey])}
                                            onChange={(e) =>
                                                setFooterConfig((prev) => ({
                                                    ...prev,
                                                    [field.enableKey]: e.target.checked,
                                                }))
                                            }
                                            className="rounded border-slate-300 text-[#003B3A]"
                                        />
                                        {field.title}
                                    </label>
                                    <label className="inline-flex items-center gap-1.5 text-xs text-amber-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean((footerConfig as any)[field.reqKey])}
                                            onChange={(e) =>
                                                setFooterConfig((prev) => ({
                                                    ...prev,
                                                    [field.reqKey]: e.target.checked,
                                                }))
                                            }
                                            className="rounded border-slate-300 text-amber-600"
                                        />
                                        Bắt buộc nhập khi hoàn thành
                                    </label>
                                </div>
                                <input
                                    type="text"
                                    value={(footerConfig as any)[field.labelKey] || ""}
                                    onChange={(e) =>
                                        setFooterConfig((prev) => ({
                                            ...prev,
                                            [field.labelKey]: e.target.value,
                                        }))
                                    }
                                    className="w-full h-8 px-2.5 rounded border border-slate-300 text-xs bg-white"
                                />
                            </div>
                        ))}

                        <div className="p-3 rounded-lg border border-slate-200 bg-teal-50/40 space-y-2">
                            <div className="text-xs font-bold text-[#003B3A]">
                                Phần ký người khảo sát (Tích hợp Chữ ký số của tôi)
                            </div>
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">
                                    Tiêu đề khối ký tên trên phiếu in / PDF
                                </label>
                                <input
                                    type="text"
                                    value={footerConfig.examinerSignatureTitle}
                                    onChange={(e) =>
                                        setFooterConfig((prev) => ({
                                            ...prev,
                                            examinerSignatureTitle: e.target.value,
                                        }))
                                    }
                                    className="w-full h-8 px-2.5 rounded border border-slate-300 text-xs bg-white font-semibold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                        <h3 className="text-sm font-bold text-[#003B3A] border-b border-slate-100 pb-2.5">
                            Cấu hình tiêu đề Mẫu xuất Word / PDF (Khổ A4 dọc)
                        </h3>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-medium text-slate-600 mb-1">
                                    Dòng tiêu đề đơn vị 1
                                </label>
                                <input
                                    type="text"
                                    value={exportConfig.schoolHeaderLine1}
                                    onChange={(e) =>
                                        setExportConfig((prev) => ({
                                            ...prev,
                                            schoolHeaderLine1: e.target.value,
                                        }))
                                    }
                                    className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-slate-600 mb-1">
                                    Dòng tiêu đề đơn vị 2
                                </label>
                                <input
                                    type="text"
                                    value={exportConfig.schoolHeaderLine2}
                                    onChange={(e) =>
                                        setExportConfig((prev) => ({
                                            ...prev,
                                            schoolHeaderLine2: e.target.value,
                                        }))
                                    }
                                    className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-slate-600 mb-1">
                                    Tên chính thức của phiếu trên bản in PDF / Word
                                </label>
                                <input
                                    type="text"
                                    value={exportConfig.documentTitle}
                                    onChange={(e) =>
                                        setExportConfig((prev) => ({
                                            ...prev,
                                            documentTitle: e.target.value,
                                        }))
                                    }
                                    className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white font-bold"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-slate-600 mb-1">
                                    Dòng mô tả phụ dưới tiêu đề
                                </label>
                                <input
                                    type="text"
                                    value={exportConfig.documentSubTitle}
                                    onChange={(e) =>
                                        setExportConfig((prev) => ({
                                            ...prev,
                                            documentSubTitle: e.target.value,
                                        }))
                                    }
                                    className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white"
                                />
                            </div>

                            <div className="pt-2 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.showDraftWatermarkWhenUnsigned}
                                        onChange={(e) =>
                                            setExportConfig((prev) => ({
                                                ...prev,
                                                showDraftWatermarkWhenUnsigned: e.target.checked,
                                            }))
                                        }
                                        className="rounded border-slate-300 text-[#003B3A]"
                                    />
                                    <span>
                                        Hiển thị dấu mờ <strong>"BẢN NHÁP – CHƯA KÝ"</strong> khi xuất phiếu chưa được giáo viên ký số
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.showAuditHashFooter}
                                        onChange={(e) =>
                                            setExportConfig((prev) => ({
                                                ...prev,
                                                showAuditHashFooter: e.target.checked,
                                            }))
                                        }
                                        className="rounded border-slate-300 text-[#003B3A]"
                                    />
                                    <span>
                                        In kèm mã băm toàn vẹn SHA-256 và thông tin xác thực chữ ký dưới chân phiếu
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: QUẢN LÝ PHIÊN BẢN MẪU */}
            {activeSectionTab === "versions" && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-xs tabular-nums">
                        <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                            <tr className="border-b font-semibold text-[11px]">
                                <th className="py-2.5 px-4 font-semibold">Phiên bản</th>
                                <th className="py-2.5 px-4 font-semibold">Mã mẫu & Tên mẫu</th>
                                <th className="py-2.5 px-4 font-semibold">Khối áp dụng</th>
                                <th className="py-2.5 px-4 font-semibold">Trạng thái</th>
                                <th className="py-2.5 px-4 font-semibold">Số kết quả đã gắn</th>
                                <th className="py-2.5 px-4 font-semibold">Cập nhật lúc</th>
                                <th className="py-2.5 px-4 text-right font-semibold">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                            {templates.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="py-3 px-4 font-bold text-[#003B3A]">
                                        {t.versionCode}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-semibold text-slate-900">{t.name}</div>
                                        <div className="text-[11px] text-slate-500">Mã: {t.code}</div>
                                    </td>
                                    <td className="py-3 px-4">{t.grade || "Khối 1"}</td>
                                    <td className="py-3 px-4">
                                        {t.status === "ACTIVE" ? (
                                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                                Đang áp dụng
                                            </span>
                                        ) : t.status === "DRAFT" ? (
                                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                                                Bản nháp
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                                Ngừng áp dụng
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 font-semibold">
                                        {t.usageCount || 0} học sinh
                                    </td>
                                    <td className="py-3 px-4 text-slate-500">
                                        {t.updatedAt
                                            ? new Date(t.updatedAt).toLocaleString("vi-VN")
                                            : "—"}
                                    </td>
                                    <td className="py-3 px-4 text-right space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                applyTemplateToForm(t);
                                                setActiveSectionTab("criteria");
                                            }}
                                            className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium"
                                        >
                                            Mở cấu hình
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL XEM TRƯỚC GIAO DIỆN GIÁO VIÊN KHẢO SÁT */}
            {showTeacherPreviewModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl border border-slate-200 max-w-5xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
                        <div className="px-5 py-3.5 bg-[#003B3A] text-white flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold">
                                    Xem trước giao diện Giáo viên nhập kết quả — {TCI_SUBJECT_DISPLAY_LABEL} ({versionCode})
                                </div>
                                <div className="text-xs text-teal-100">
                                    Mô phỏng màn hình đánh giá 16 tiêu chí, vùng Câu 13, tải ảnh sản phẩm Câu 16 và ký số
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowTeacherPreviewModal(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-4 bg-[#F8FAFC] text-xs">
                            <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 tabular-nums">
                                <div className="font-bold text-[#003B3A]">
                                    Tổng hợp trực tiếp: Đã đánh giá: 0/16 | Đạt: 0/16 | Không đạt: 0/16 | Không làm: 0/16 | Chưa đánh giá: 16/16
                                </div>
                                <span className="px-2.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                                    Chế độ xem trước mẫu {versionCode}
                                </span>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-left border-collapse tabular-nums">
                                    <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                                        <tr className="border-b font-semibold text-[11px]">
                                            <th className="py-2 px-3 w-12 text-center font-semibold">STT</th>
                                            <th className="py-2 px-3 w-24 text-center font-semibold">Mã chỉ số</th>
                                            <th className="py-2 px-3 font-semibold">Nội dung tiêu chí</th>
                                            <th className="py-2 px-3 w-64 text-center font-semibold">Lựa chọn kết quả</th>
                                            <th className="py-2 px-3 w-48 font-semibold">Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E2E8F0]">
                                        {criteria.map((c) => (
                                            <tr key={c.criterionId}>
                                                <td className="py-2.5 px-3 text-center font-bold text-[#003B3A]">
                                                    {c.stt}
                                                </td>
                                                <td className="py-2.5 px-3 text-center font-semibold text-[#00736E]">
                                                    {c.indicatorCodes.join(", ")}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="font-medium text-slate-900">
                                                        {c.content}
                                                    </div>
                                                    {c.supplementaryType === "WRITING_SAMPLE_BOX" && (
                                                        <div className="mt-2 p-2.5 rounded bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3">
                                                            <div>
                                                                <span className="font-semibold text-[#003B3A]">
                                                                    Giáo viên viết mẫu:
                                                                </span>{" "}
                                                                {c.writingPromptDefault || "bé chăm ngoan"}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-slate-700">
                                                                    Thí sinh viết theo:
                                                                </span>{" "}
                                                                (Ô nhập / Đính kèm ảnh bài viết)
                                                            </div>
                                                        </div>
                                                    )}
                                                    {c.supplementaryType ===
                                                        "COLORING_SAMPLE_AND_PRODUCT" && (
                                                        <div className="mt-2 p-2.5 rounded bg-teal-50/40 border border-teal-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div>
                                                                <div className="font-semibold text-[#003B3A] mb-1">
                                                                    Ảnh mẫu tô màu (Chỉ số {c.indicatorCodes.join(", ")}):
                                                                </div>
                                                                {c.sampleImageUrl && (
                                                                    <img
                                                                        src={c.sampleImageUrl}
                                                                        alt="Ảnh mẫu Câu 16"
                                                                        className="max-h-28 object-contain border border-slate-200 rounded bg-white p-1"
                                                                    />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-[#003B3A] mb-1">
                                                                    Sản phẩm bài làm của học sinh:
                                                                </div>
                                                                <div className="border border-dashed border-teal-300 rounded bg-white p-3 text-center text-slate-500">
                                                                    [Nút Chụp ảnh / Tải ảnh sản phẩm — tối đa {c.maxImages} ảnh, {c.maxFileSizeMb}MB, hỗ trợ Xoay/Phóng to/Thay thế]
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <div className="inline-flex items-center gap-1">
                                                        <span className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 font-medium">
                                                            Đạt
                                                        </span>
                                                        <span className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 font-medium">
                                                            Không đạt
                                                        </span>
                                                        <span className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 font-medium">
                                                            Không làm
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="h-7 rounded border border-slate-200 bg-slate-50 px-2 flex items-center text-slate-400">
                                                        Ghi chú...
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleOpenPrintPreview}
                                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Xem trước bản in PDF A4
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowTeacherPreviewModal(false)}
                                className="px-4 py-1.5 rounded-lg bg-[#003B3A] text-white text-xs font-semibold"
                            >
                                Đóng xem trước
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
