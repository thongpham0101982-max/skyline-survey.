"use client";

import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Download,
    Eye,
    FileCheck2,
    History,
    LockOpen,
    Maximize2,
    RefreshCw,
    ShieldCheck,
    UserCheck,
    X,
} from "lucide-react";
import {
    TCI_SUBJECT_DISPLAY_LABEL,
    formatIndicatorCodesLabel,
    getTciEvaluationStatusLabel,
    getTciSignatureStatusLabel,
    getTciReviewStatusLabel,
    TciGroupedCriterionView,
} from "@/lib/tci/constants";

interface TciResultReviewPanelProps {
    studentId: string;
    studentName?: string;
    studentCode?: string;
    periodId?: string;
    compact?: boolean;
    onOpenTeacherForm?: () => void;
    onReviewedOrReopened?: (updatedRecord: any) => void;
}

export default function TciResultReviewPanel({
    studentId,
    studentName,
    studentCode,
    periodId,
    compact = false,
    onOpenTeacherForm,
    onReviewedOrReopened,
}: TciResultReviewPanelProps) {
    const [loading, setLoading] = useState(true);
    const [bundle, setBundle] = useState<any>(null);
    const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

    const [showDetailModal, setShowDetailModal] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        DAT: true,
        KHONG_DAT: true,
        KHONG_LAM: true,
        CHUA_DANH_GIA: true,
    });

    const [reviewNote, setReviewNote] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    const [showReopenModal, setShowReopenModal] = useState(false);
    const [reopenReason, setReopenReason] = useState("");
    const [submittingReopen, setSubmittingReopen] = useState(false);

    const [lightboxImg, setLightboxImg] = useState<{ url: string; title: string } | null>(
        null
    );

    const fetchTciBundle = useCallback(
        async (ver?: number | null) => {
            if (!studentId) return;
            setLoading(true);
            try {
                const verQuery = ver ? `&resultVersion=${ver}` : "";
                const pQuery = periodId ? `&periodId=${encodeURIComponent(periodId)}` : "";
                const res = await fetch(
                    `/api/tci/assessments?studentId=${encodeURIComponent(
                        studentId
                    )}${pQuery}${verQuery}`,
                    { cache: "no-store" }
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Không thể tải kết quả môn TCI");
                setBundle(data);
                setReviewNote(data.record?.reviewNote || "");
            } catch (err: any) {
                console.warn("[TciResultReviewPanel] Load warning:", err.message);
            } finally {
                setLoading(false);
            }
        },
        [studentId, periodId]
    );

    useEffect(() => {
        fetchTciBundle(selectedVersion);
    }, [fetchTciBundle, selectedVersion]);

    const toggleGroup = (key: string) => {
        setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleReviewDecision = async (decision: "APPROVED" | "SUPPLEMENT_REQUESTED") => {
        if (!bundle?.record) return;
        setSubmittingReview(true);
        try {
            const res = await fetch("/api/tci/review", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "REVIEW",
                    studentId,
                    periodId: bundle.record.periodId,
                    decision,
                    reviewNote,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Không thể cập nhật xét duyệt");
            toast.success(data.message || "Đã cập nhật trạng thái xét duyệt môn TCI.");
            setBundle(data);
            if (onReviewedOrReopened && data.record) {
                onReviewedOrReopened(data.record);
            }
        } catch (err: any) {
            toast.error(err.message || "Lỗi xét duyệt kết quả TCI");
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleReopenSignedRecord = async () => {
        if (!reopenReason.trim() || reopenReason.trim().length < 5) {
            toast.error("Vui lòng nhập lý do mở khóa đánh giá lại (tối thiểu 5 ký tự).");
            return;
        }
        setSubmittingReopen(true);
        try {
            const res = await fetch("/api/tci/review", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "REOPEN",
                    studentId,
                    periodId: bundle?.record?.periodId,
                    reason: reopenReason.trim(),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Không thể mở khóa phiếu TCI");
            toast.success(data.message || "Đã mở khóa sang phiên bản mới.");
            setShowReopenModal(false);
            setReopenReason("");
            setSelectedVersion(null);
            setBundle(data);
            if (onReviewedOrReopened && data.record) {
                onReviewedOrReopened(data.record);
            }
        } catch (err: any) {
            toast.error(err.message || "Lỗi mở khóa phiếu TCI");
        } finally {
            setSubmittingReopen(false);
        }
    };

    const handleOpenSignedPdf = (disposition: "inline" | "attachment", ver?: number) => {
        const pId = bundle?.record?.periodId || periodId || "ALL";
        const vParam = ver ? `&resultVersion=${ver}` : "";
        const format = disposition === "inline" ? "html" : "pdf";
        window.open(
            `/api/tci/pdf?studentId=${encodeURIComponent(
                studentId
            )}&periodId=${encodeURIComponent(pId)}${vParam}&format=${format}&disposition=${disposition}`,
            "_blank",
            "noopener,noreferrer"
        );
    };

    if (loading && !bundle) {
        return (
            <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00736E]" />
                Đang tải dữ liệu môn TCI – Bộ chuẩn phát triển trẻ em 5–6 tuổi...
            </div>
        );
    }

    const record = bundle?.record;
    const summary = record?.summary || {
        totalCriteria: 16,
        countEvaluated: record?.countEvaluated ?? 0,
        countDat: record?.countDat ?? 0,
        countKhongDat: record?.countKhongDat ?? 0,
        countKhongLam: record?.countKhongLam ?? 0,
        countChuaDanhGia: record?.countChuaDanhGia ?? 16,
    };
    const grouped = record?.groupedCriteria || {
        datList: [],
        khongDatList: [],
        khongLamList: [],
        chuaDanhGiaList: [],
    };
    const isSigned = record?.signatureStatus === "SIGNED";
    const isCompleted = record?.evaluationStatus === "COMPLETED" && isSigned;

    const renderGroupList = (
        groupKey: string,
        title: string,
        items: TciGroupedCriterionView[],
        badgeClass: string,
        headerBgClass: string
    ) => {
        const isOpen = Boolean(expandedGroups[groupKey]);
        return (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                    type="button"
                    onClick={() => toggleGroup(groupKey)}
                    className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${headerBgClass}`}
                >
                    <div className="flex items-center gap-2">
                        {isOpen ? (
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        )}
                        <span className="text-xs font-bold text-slate-900">{title}</span>
                    </div>
                    <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-bold tabular-nums border ${badgeClass}`}
                    >
                        {items.length}/16 tiêu chí
                    </span>
                </button>

                {isOpen && (
                    <div className="divide-y divide-slate-100">
                        {items.length === 0 ? (
                            <div className="p-3.5 text-xs text-slate-500 italic">
                                Không có tiêu chí nào trong nhóm này.
                            </div>
                        ) : (
                            items.map(({ config, result, evidences }) => (
                                <div
                                    key={config.criterionId}
                                    className="p-3.5 text-xs space-y-2 hover:bg-slate-50/70"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2.5">
                                            <span className="w-6 h-6 rounded bg-[#003B3A] text-white font-bold inline-flex items-center justify-center shrink-0 tabular-nums">
                                                {config.stt}
                                            </span>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="px-2 py-0.5 rounded bg-teal-50 text-[#00736E] border border-teal-200 font-bold tabular-nums">
                                                        {formatIndicatorCodesLabel(
                                                            config.indicatorCodes
                                                        )}
                                                    </span>
                                                    <span className="font-semibold text-slate-900">
                                                        {config.content}
                                                    </span>
                                                </div>
                                                {result.note && (
                                                    <div className="mt-1 text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                                                        <strong>Ghi chú GV:</strong> {result.note}
                                                    </div>
                                                )}
                                                {config.supplementaryType ===
                                                    "WRITING_SAMPLE_BOX" &&
                                                    (result.writingSampleText ||
                                                        result.studentWritingText) && (
                                                        <div className="mt-1.5 p-2 rounded bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            <div>
                                                                <span className="text-slate-500">
                                                                    GV viết mẫu:
                                                                </span>{" "}
                                                                <strong className="text-[#003B3A]">
                                                                    {result.writingSampleText}
                                                                </strong>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500">
                                                                    Thí sinh viết theo:
                                                                </span>{" "}
                                                                <strong>
                                                                    {result.studentWritingText ||
                                                                        "—"}
                                                                </strong>
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hiển thị ảnh mẫu & ảnh sản phẩm nếu có (Câu 16 hoặc Câu 13) */}
                                    {(config.supplementaryType ===
                                        "COLORING_SAMPLE_AND_PRODUCT" ||
                                        evidences.length > 0) && (
                                        <div className="pl-8 pt-1 flex flex-wrap gap-3">
                                            {config.sampleImageUrl && (
                                                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50">
                                                    <div className="text-[10px] font-semibold text-slate-500 mb-1">
                                                        Ảnh mẫu tô màu (Câu {config.stt})
                                                    </div>
                                                    <img
                                                        src={config.sampleImageUrl}
                                                        alt="Ảnh mẫu"
                                                        className="h-24 object-contain bg-white rounded border border-slate-200 p-1 cursor-pointer"
                                                        onClick={() =>
                                                            setLightboxImg({
                                                                url: config.sampleImageUrl!,
                                                                title: `Ảnh mẫu Câu ${config.stt}`,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            )}
                                            {evidences.map((ev) => (
                                                <div
                                                    key={ev.id}
                                                    className="border border-teal-200 rounded-lg p-2 bg-teal-50/30"
                                                >
                                                    <div className="text-[10px] font-bold text-[#003B3A] mb-1">
                                                        Sản phẩm học sinh ({ev.fileName})
                                                    </div>
                                                    {ev.imageDataBase64 && (
                                                        <img
                                                            src={ev.imageDataBase64}
                                                            alt={ev.fileName}
                                                            className="h-24 object-contain bg-white rounded border border-slate-200 p-1 cursor-pointer"
                                                            style={{
                                                                transform: `rotate(${
                                                                    ev.rotationDeg || 0
                                                                }deg)`,
                                                            }}
                                                            onClick={() =>
                                                                setLightboxImg({
                                                                    url: ev.imageDataBase64!,
                                                                    title: `Sản phẩm Câu ${config.stt} — ${
                                                                        studentName || ""
                                                                    }`,
                                                                })
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {/* THẺ TÓM TẮT KẾT QUẢ MÔN TCI TRONG HỒ SƠ / DANH SÁCH XÉT DUYỆT */}
            <div className="bg-white border border-slate-200 border-l-4 border-l-[#003B3A] rounded-xl p-4 shadow-xs space-y-3 tabular-nums">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-[#003B3A] text-white text-xs font-bold">
                                TCI
                            </span>
                            <h4 className="text-sm font-bold text-[#003B3A]">
                                {TCI_SUBJECT_DISPLAY_LABEL}
                            </h4>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                                Phiên bản kết quả v{record?.resultVersion || 1}
                            </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>
                                GV khảo sát:{" "}
                                <strong className="text-slate-800">
                                    {record?.signerName ||
                                        record?.assessorName ||
                                        record?.assignedTeacherName ||
                                        "Chưa phân công"}
                                </strong>
                            </span>
                            <span>•</span>
                            <span>
                                Đánh giá:{" "}
                                <strong>
                                    {getTciEvaluationStatusLabel(record?.evaluationStatus)}
                                </strong>
                            </span>
                            <span>•</span>
                            <span>
                                Chữ ký:{" "}
                                <strong
                                    className={
                                        isSigned ? "text-emerald-700" : "text-amber-700"
                                    }
                                >
                                    {getTciSignatureStatusLabel(record?.signatureStatus)}
                                </strong>
                            </span>
                            <span>•</span>
                            <span>
                                Xét duyệt:{" "}
                                <strong
                                    className={
                                        record?.reviewStatus === "APPROVED"
                                            ? "text-emerald-700"
                                            : "text-slate-700"
                                    }
                                >
                                    {getTciReviewStatusLabel(record?.reviewStatus)}
                                </strong>
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setShowDetailModal(true)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#003B3A] text-white text-xs font-semibold hover:bg-[#005250] transition-colors"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            Xem chi tiết 16 tiêu chí & Xét duyệt
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenSignedPdf("inline")}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
                        >
                            Xem phiếu
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenSignedPdf("attachment")}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-[#00736E] text-xs font-semibold hover:bg-teal-100"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Tải PDF
                        </button>
                    </div>
                </div>

                {/* Dải 4 chỉ số tổng hợp: Đạt / Không đạt / Không làm / Chưa đánh giá */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-[11px] text-slate-500">Đã đánh giá</div>
                        <div className="text-sm font-bold text-[#003B3A]">
                            {summary.countEvaluated}/16
                        </div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200">
                        <div className="text-[11px] text-emerald-800">Đạt</div>
                        <div className="text-sm font-bold text-emerald-700">
                            {summary.countDat}/16
                        </div>
                    </div>
                    <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-200">
                        <div className="text-[11px] text-rose-800">Không đạt</div>
                        <div className="text-sm font-bold text-rose-700">
                            {summary.countKhongDat}/16
                        </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                        <div className="text-[11px] text-slate-600">Không làm</div>
                        <div className="text-sm font-bold text-slate-700">
                            {summary.countKhongLam}/16
                        </div>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-200">
                        <div className="text-[11px] text-amber-800">Chưa đánh giá</div>
                        <div className="text-sm font-bold text-amber-700">
                            {summary.countChuaDanhGia}/16
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL CHI TIẾT 3 NHÓM TIÊU CHÍ (ĐẠT / KHÔNG ĐẠT / KHÔNG LÀM) & XÉT DUYỆT / MỞ KHÓA */}
            {showDetailModal && (
                <div className="fixed inset-0 z-[120] bg-slate-900/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Header Modal */}
                        <div className="px-5 py-3.5 bg-[#003B3A] text-white flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-white/15 text-xs font-bold">
                                        Xét duyệt kết quả môn TCI
                                    </span>
                                    <span className="text-sm font-bold">
                                        {studentName || record?.studentName} (
                                        {studentCode || record?.studentCode || studentId})
                                    </span>
                                </div>
                                <div className="text-xs text-teal-100 mt-0.5 tabular-nums">
                                    Mẫu áp dụng: {bundle?.template?.versionCode || "v1.0"} • Phiên bản kết quả: v
                                    {record?.resultVersion || 1} • Đạt {summary.countDat}/16 • Không đạt{" "}
                                    {summary.countKhongDat}/16 • Không làm {summary.countKhongLam}/16
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDetailModal(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body Modal */}
                        <div className="p-5 overflow-y-auto space-y-4 bg-[#F8FAFC] flex-1">
                            {/* Thanh chuyển phiên bản kết quả nếu có lịch sử mở khóa */}
                            {Array.isArray(bundle?.versionHistory) &&
                                bundle.versionHistory.length > 1 && (
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                                        <div className="flex items-center gap-2 font-semibold text-slate-700">
                                            <History className="w-4 h-4 text-[#00736E]" />
                                            <span>Lịch sử các phiên bản kết quả TCI:</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {bundle.versionHistory.map((vh: any) => (
                                                <button
                                                    key={vh.id}
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedVersion(vh.resultVersion)
                                                    }
                                                    className={`px-3 py-1 rounded-lg font-semibold border transition-colors ${
                                                        record?.resultVersion === vh.resultVersion
                                                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                                                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    v{vh.resultVersion}{" "}
                                                    {vh.isLatestVersion ? "(Hiện hành)" : "(Lịch sử)"}{" "}
                                                    —{" "}
                                                    {vh.signatureStatus === "SIGNED"
                                                        ? "Đã ký"
                                                        : "Chưa ký"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            {/* 3 Nhóm tiêu chí có thể mở rộng / thu gọn */}
                            <div className="space-y-3">
                                {renderGroupList(
                                    "DAT",
                                    `A. Các tiêu chí Đạt (${grouped.datList.length} tiêu chí)`,
                                    grouped.datList,
                                    "bg-emerald-50 text-emerald-700 border-emerald-200",
                                    "bg-emerald-50/50 hover:bg-emerald-50"
                                )}

                                {renderGroupList(
                                    "KHONG_DAT",
                                    `B. Các tiêu chí Không đạt (${grouped.khongDatList.length} tiêu chí)`,
                                    grouped.khongDatList,
                                    "bg-rose-50 text-rose-700 border-rose-200",
                                    "bg-rose-50/50 hover:bg-rose-50"
                                )}

                                {renderGroupList(
                                    "KHONG_LAM",
                                    `C. Các tiêu chí Không làm (${grouped.khongLamList.length} tiêu chí)`,
                                    grouped.khongLamList,
                                    "bg-slate-100 text-slate-700 border-slate-300",
                                    "bg-slate-100/70 hover:bg-slate-100"
                                )}

                                {grouped.chuaDanhGiaList.length > 0 &&
                                    renderGroupList(
                                        "CHUA_DANH_GIA",
                                        `D. Các tiêu chí Chưa đánh giá (${grouped.chuaDanhGiaList.length} tiêu chí)`,
                                        grouped.chuaDanhGiaList,
                                        "bg-amber-50 text-amber-800 border-amber-300",
                                        "bg-amber-50/60 hover:bg-amber-50"
                                    )}
                            </div>

                            {/* Nhận xét chung & Thông tin người khảo sát / chữ ký */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                                    <div className="font-bold text-[#003B3A] text-sm border-b border-slate-100 pb-2">
                                        Nhận xét và đề xuất của giáo viên khảo sát
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-600">
                                            1. Điểm nổi bật:
                                        </span>{" "}
                                        <span className="text-slate-900">
                                            {record?.highlightsComment || "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-600">
                                            2. Nội dung cần hỗ trợ:
                                        </span>{" "}
                                        <span className="text-slate-900">
                                            {record?.supportNeededComment || "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-600">
                                            3. Đề xuất của giáo viên:
                                        </span>{" "}
                                        <span className="text-slate-900">
                                            {record?.teacherRecommendation || "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-600">
                                            4. Nhận xét chung:
                                        </span>{" "}
                                        <span className="text-slate-900">
                                            {record?.generalComment || "—"}
                                        </span>
                                    </div>
                                </div>

                                <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs tabular-nums">
                                    <div className="font-bold text-[#003B3A] text-sm border-b border-slate-100 pb-2">
                                        Thông tin người khảo sát & Chữ ký
                                    </div>
                                    <div>
                                        Người khảo sát:{" "}
                                        <strong>
                                            {record?.assessorName ||
                                                record?.assignedTeacherName ||
                                                "—"}
                                        </strong>
                                    </div>
                                    <div>
                                        Ngày khảo sát:{" "}
                                        <strong>{record?.assessmentDate || "—"}</strong>
                                    </div>
                                    <div>
                                        Trạng thái ký:{" "}
                                        <strong
                                            className={
                                                isSigned ? "text-emerald-700" : "text-amber-700"
                                            }
                                        >
                                            {getTciSignatureStatusLabel(record?.signatureStatus)}
                                        </strong>
                                    </div>
                                    {isSigned && (
                                        <>
                                            <div>
                                                Người ký:{" "}
                                                <strong>{record?.signerName || "—"}</strong>
                                            </div>
                                            <div>
                                                Thời gian ký:{" "}
                                                <strong>
                                                    {record?.signedAt
                                                        ? new Date(
                                                              record.signedAt
                                                          ).toLocaleString("vi-VN")
                                                        : "—"}
                                                </strong>
                                            </div>
                                            {record?.signatureImageBase64 && (
                                                <div className="p-2 border border-slate-200 rounded bg-slate-50 flex items-center justify-center h-16">
                                                    <img
                                                        src={record.signatureImageBase64}
                                                        alt="Chữ ký GV"
                                                        className="max-h-12 object-contain"
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Khối Xét duyệt kết quả & Mở khóa đánh giá lại */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="font-bold text-[#003B3A] text-sm">
                                        Xét duyệt kết quả môn TCI (Dành cho Hội đồng / Người xét duyệt)
                                    </div>
                                    {isSigned && record?.isLatestVersion && (
                                        <button
                                            type="button"
                                            onClick={() => setShowReopenModal(true)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 font-semibold hover:bg-amber-100"
                                        >
                                            <LockOpen className="w-3.5 h-3.5" />
                                            Mở khóa / Yêu cầu đánh giá lại (Tạo phiên bản mới)
                                        </button>
                                    )}
                                </div>

                                {!isCompleted && (
                                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                                        <span>
                                            Phiếu này đang ở trạng thái{" "}
                                            <strong>
                                                {getTciEvaluationStatusLabel(
                                                    record?.evaluationStatus
                                                )}{" "}
                                                ({getTciSignatureStatusLabel(
                                                    record?.signatureStatus
                                                )})
                                            </strong>
                                            . Theo quy định, người xét duyệt không thể chốt phê duyệt bản nháp chưa hoàn thành hoặc chưa được giáo viên ký xác nhận.
                                        </span>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                                    <div className="flex-1">
                                        <label className="block font-medium text-slate-600 mb-1">
                                            Ghi chú xét duyệt / Nội dung yêu cầu bổ sung
                                        </label>
                                        <input
                                            type="text"
                                            value={reviewNote}
                                            onChange={(e) => setReviewNote(e.target.value)}
                                            placeholder="Nhập ý kiến xét duyệt..."
                                            className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={submittingReview}
                                            onClick={() =>
                                                handleReviewDecision("SUPPLEMENT_REQUESTED")
                                            }
                                            className="px-3.5 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 font-semibold hover:bg-amber-100 disabled:opacity-50"
                                        >
                                            Yêu cầu bổ sung
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!isCompleted || submittingReview}
                                            onClick={() => handleReviewDecision("APPROVED")}
                                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Phê duyệt kết quả môn TCI
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Modal */}
                        <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleOpenSignedPdf("inline", record?.resultVersion)
                                    }
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <Eye className="w-3.5 h-3.5 text-[#00736E]" />
                                    Xem bản in phiếu A4 (v{record?.resultVersion || 1})
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleOpenSignedPdf("attachment", record?.resultVersion)
                                    }
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-xs font-semibold text-[#00736E] hover:bg-teal-100"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Tải PDF đã ký (v{record?.resultVersion || 1})
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDetailModal(false)}
                                className="px-4 py-1.5 rounded-lg bg-[#003B3A] text-white text-xs font-semibold"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL NHẬP LÝ DO MỞ KHÓA PHIẾU ĐÃ KÝ */}
            {showReopenModal && (
                <div className="fixed inset-0 z-[130] bg-slate-900/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 space-y-4 shadow-xl text-xs">
                        <div className="font-bold text-sm text-[#003B3A] flex items-center gap-2">
                            <LockOpen className="w-4 h-4 text-amber-600" />
                            <span>Mở khóa / Yêu cầu đánh giá lại phiếu TCI đã ký</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                            Hệ thống sẽ <strong>giữ nguyên kết quả và file PDF đã ký của phiên bản v{record?.resultVersion}</strong> trong lịch sử, đồng thời tạo <strong>phiên bản kết quả mới v{(record?.resultVersion || 1) + 1}</strong> yêu cầu giáo viên ký xác nhận lại và đặt lại trạng thái phê duyệt.
                        </p>
                        <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                                Lý do mở khóa / yêu cầu đánh giá lại <span className="text-rose-600">*</span>
                            </label>
                            <textarea
                                rows={3}
                                value={reopenReason}
                                onChange={(e) => setReopenReason(e.target.value)}
                                placeholder="Nhập rõ lý do cần điều chỉnh hoặc bổ sung..."
                                className="w-full p-2.5 rounded-lg border border-slate-300 bg-white outline-none focus:border-[#00736E]"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowReopenModal(false)}
                                className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-700"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                disabled={submittingReopen}
                                onClick={handleReopenSignedRecord}
                                className="px-4 py-1.5 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-50"
                            >
                                {submittingReopen
                                    ? "Đang mở khóa..."
                                    : "Xác nhận mở khóa tạo phiên bản mới"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIGHTBOX XEM ẢNH SẢN PHẨM / ẢNH MẪU */}
            {lightboxImg && (
                <div
                    className="fixed inset-0 z-[140] bg-slate-900/80 flex items-center justify-center p-4"
                    onClick={() => setLightboxImg(null)}
                >
                    <div
                        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 py-3 bg-[#003B3A] text-white flex items-center justify-between text-xs font-bold">
                            <span>{lightboxImg.title}</span>
                            <button
                                type="button"
                                onClick={() => setLightboxImg(null)}
                                className="p-1 rounded hover:bg-white/10"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 bg-slate-900 flex-1 flex items-center justify-center overflow-auto">
                            <img
                                src={lightboxImg.url}
                                alt={lightboxImg.title}
                                className="max-h-[75vh] max-w-full object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
