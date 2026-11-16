"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
    AlertCircle,
    ArrowRight,
    Camera,
    CheckCircle2,
    Download,
    Eye,
    FileCheck2,
    FileText,
    Image as ImageIcon,
    Lock,
    Maximize2,
    PenTool,
    RefreshCw,
    RotateCcw,
    RotateCw,
    Save,
    ShieldCheck,
    Trash2,
    Upload,
    X,
} from "lucide-react";
import {
    TCI_SUBJECT_DISPLAY_LABEL,
    DEFAULT_TCI_CRITERIA_16,
    DEFAULT_TCI_FOOTER_CONFIG,
    TciCriterionConfig,
    TciFooterConfig,
    TciResultChoice,
    TciCriterionResultEntry,
    TciEvidenceSummaryItem,
    normalizeCriterionResults,
    computeTciSummary,
    validateTciCompletion,
    formatIndicatorCodesLabel,
    getTciChoiceLabel,
    getTciEvaluationStatusLabel,
    getTciSignatureStatusLabel,
} from "@/lib/tci/constants";

interface ChildDevStandardFormProps {
    student: any;
    periodId?: string;
    onSave?: (student: any, scores: any[], comments: any[]) => Promise<void> | void;
    onSavedRecord?: (updatedRecord: any) => void;
    onNextStudent?: () => void;
    hasNextStudent?: boolean;
    isLocked?: boolean;
    onClose: () => void;
}

/**
 * Xoay bitmap ảnh 90 độ trên Canvas ở phía trình duyệt để dữ liệu base64 lưu trên server
 * và nhúng vào PDF có hướng khớp 100% với giao diện người dùng.
 */
async function rotateImageDataUrlOnCanvas(
    dataUrl: string,
    deltaDeg: number,
    mimeType = "image/jpeg"
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve(dataUrl);
                return;
            }
            const norm = ((deltaDeg % 360) + 360) % 360;
            if (norm === 90 || norm === 270) {
                canvas.width = img.height;
                canvas.height = img.width;
            } else {
                canvas.width = img.width;
                canvas.height = img.height;
            }
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((norm * Math.PI) / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            const outMime =
                mimeType === "image/png" || mimeType === "image/webp" ? mimeType : "image/jpeg";
            resolve(canvas.toDataURL(outMime, 0.92));
        };
        img.onerror = () => reject(new Error("Không thể xử lý xoay ảnh."));
        img.src = dataUrl;
    });
}

export default function ChildDevStandardForm({
    student,
    periodId,
    onSave,
    onSavedRecord,
    onNextStudent,
    hasNextStudent = false,
    isLocked = false,
    onClose,
}: ChildDevStandardFormProps) {
    const [loading, setLoading] = useState(true);
    const [saveState, setSaveState] = useState<"IDLE" | "SAVING" | "SAVED" | "ERROR">("IDLE");
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
    const [signing, setSigning] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Dữ liệu hồ sơ & mẫu từ server
    const [recordId, setRecordId] = useState<string>("");
    const [resultVersion, setResultVersion] = useState<number>(1);
    const [lockVersion, setLockVersion] = useState<number>(1);
    const [templateVersionCode, setTemplateVersionCode] = useState<string>("v1.0");
    const [criteriaConfig, setCriteriaConfig] =
        useState<TciCriterionConfig[]>(DEFAULT_TCI_CRITERIA_16);
    const [footerConfig, setFooterConfig] = useState<TciFooterConfig>(DEFAULT_TCI_FOOTER_CONFIG);

    const [assessmentDate, setAssessmentDate] = useState<string>(
        new Date().toISOString().slice(0, 10)
    );
    const [assignedTeacherName, setAssignedTeacherName] = useState<string>("");
    const [assessorName, setAssessorName] = useState<string>("");
    const [evaluationStatus, setEvaluationStatus] = useState<string>("NOT_STARTED");
    const [signatureStatus, setSignatureStatus] = useState<string>("UNSIGNED");
    const [signatureType, setSignatureType] = useState<string | null>(null);
    const [signerName, setSignerName] = useState<string | null>(null);
    const [signedAt, setSignedAt] = useState<string | null>(null);
    const [signatureImageBase64, setSignatureImageBase64] = useState<string | null>(null);
    const [signedSnapshotHash, setSignedSnapshotHash] = useState<string | null>(null);
    const [reopenReason, setReopenReason] = useState<string | null>(null);

    // Kết quả 16 tiêu chí (Không chọn sẵn kết quả)
    const [criteriaResults, setCriteriaResults] = useState<
        Record<string, TciCriterionResultEntry>
    >(() => normalizeCriterionResults({}, DEFAULT_TCI_CRITERIA_16));

    // Nhận xét cuối phiếu
    const [highlightsComment, setHighlightsComment] = useState<string>("");
    const [supportNeededComment, setSupportNeededComment] = useState<string>("");
    const [teacherRecommendation, setTeacherRecommendation] = useState<string>("");
    const [generalComment, setGeneralComment] = useState<string>("");

    // Ảnh sản phẩm (Câu 16 & Câu 13)
    const [evidences, setEvidences] = useState<TciEvidenceSummaryItem[]>([]);
    const [uploadingByCriterion, setUploadingByCriterion] = useState<Record<string, boolean>>({});
    const [uploadErrorByCriterion, setUploadErrorByCriterion] = useState<
        Record<string, string | null>
    >({});

    // Kiểm tra chữ ký số của GV hiện tại
    const [actorSignatureProfile, setActorSignatureProfile] = useState<{
        hasSignature: boolean;
        signatureType: string | null;
        signerName: string;
    } | null>(null);
    const [showMissingSigModal, setShowMissingSigModal] = useState(false);

    // Bộ lọc hiển thị tiêu chí còn thiếu & hộp thoại xem ảnh phóng to
    const [highlightMissing, setHighlightMissing] = useState(false);
    const [filterOnlyMissing, setFilterOnlyMissing] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<{
        url: string;
        title: string;
        evidenceId?: string;
    } | null>(null);

    const isSigned = signatureStatus === "SIGNED";
    const readOnly = Boolean(isLocked || isSigned);

    const applyBundle = useCallback((data: any) => {
        if (!data?.record) return;
        const rec = data.record;
        const tpl = data.template;

        const cConfig =
            Array.isArray(tpl?.criteria) && tpl.criteria.length === 16
                ? tpl.criteria
                : DEFAULT_TCI_CRITERIA_16;
        const fConfig = { ...DEFAULT_TCI_FOOTER_CONFIG, ...(tpl?.footerConfig || {}) };

        setCriteriaConfig(cConfig);
        setFooterConfig(fConfig);
        setTemplateVersionCode(tpl?.versionCode || rec.templateVersionCode || "v1.0");

        setRecordId(rec.id || "");
        setResultVersion(Number(rec.resultVersion || 1));
        setLockVersion(Number(rec.lockVersion || 1));
        setAssessmentDate(rec.assessmentDate || new Date().toISOString().slice(0, 10));
        setAssignedTeacherName(
            data.assignment?.teacherName || rec.assignedTeacherName || ""
        );
        setAssessorName(rec.assessorName || data.assignment?.teacherName || "");
        setEvaluationStatus(rec.evaluationStatus || "NOT_STARTED");
        setSignatureStatus(rec.signatureStatus || "UNSIGNED");
        setSignatureType(rec.signatureType || null);
        setSignerName(rec.signerName || null);
        setSignedAt(rec.signedAt ? String(rec.signedAt) : null);
        setSignatureImageBase64(rec.signatureImageBase64 || null);
        setSignedSnapshotHash(rec.signedSnapshotHash || null);
        setReopenReason(rec.reopenReason || null);

        setCriteriaResults(normalizeCriterionResults(rec.criteriaResults, cConfig));
        setHighlightsComment(rec.highlightsComment || "");
        setSupportNeededComment(rec.supportNeededComment || "");
        setTeacherRecommendation(rec.teacherRecommendation || "");
        setGeneralComment(rec.generalComment || "");
        setEvidences(Array.isArray(rec.evidences) ? rec.evidences : []);

        if (data.actorSignatureProfile) {
            setActorSignatureProfile(data.actorSignatureProfile);
        }
    }, []);

    const loadAssessmentRecord = useCallback(async () => {
        if (!student?.id) return;
        setLoading(true);
        try {
            const pId = periodId || student?.periodId || student?.batch?.periodId || "";
            const res = await fetch(
                `/api/tci/assessments?studentId=${encodeURIComponent(
                    student.id
                )}&periodId=${encodeURIComponent(pId)}`,
                { cache: "no-store" }
            );
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Không thể tải dữ liệu phiếu TCI");
            }
            applyBundle(data);
            setIsDirty(false);
            setSaveState("IDLE");
        } catch (err: any) {
            toast.error(err.message || "Lỗi tải phiếu đánh giá môn TCI");
        } finally {
            setLoading(false);
        }
    }, [student?.id, student?.periodId, student?.batch?.periodId, periodId, applyBundle]);

    useEffect(() => {
        loadAssessmentRecord();
    }, [loadAssessmentRecord]);

    // Cảnh báo rời trang khi còn thay đổi chưa lưu
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty && !readOnly) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty, readOnly]);

    // Tính toán tổng hợp trực tiếp (Đạt + Không đạt + Không làm + Chưa đánh giá = 16)
    const summary = useMemo(
        () => computeTciSummary(criteriaResults, criteriaConfig),
        [criteriaResults, criteriaConfig]
    );

    const hasUploadingOrErroredEvidence = useMemo(() => {
        const anyUploading = Object.values(uploadingByCriterion).some(Boolean);
        const anyError = Object.values(uploadErrorByCriterion).some(Boolean);
        return anyUploading || anyError;
    }, [uploadingByCriterion, uploadErrorByCriterion]);

    const validation = useMemo(
        () =>
            validateTciCompletion({
                criteriaResults,
                criteriaConfig,
                footerConfig,
                evidences,
                hasUploadingOrErroredEvidence,
                generalComment,
                highlightsComment,
                supportNeededComment,
                teacherRecommendation,
            }),
        [
            criteriaResults,
            criteriaConfig,
            footerConfig,
            evidences,
            hasUploadingOrErroredEvidence,
            generalComment,
            highlightsComment,
            supportNeededComment,
            teacherRecommendation,
        ]
    );

    const handleSelectChoice = (criterionId: string, choice: TciResultChoice) => {
        if (readOnly) return;
        setCriteriaResults((prev) => {
            const cur = prev[criterionId];
            // Cho phép nhấn lại lựa chọn đang chọn để hủy về Chưa đánh giá (null) khi đang nhập nháp
            const nextStatus = cur?.status === choice ? null : choice;
            return {
                ...prev,
                [criterionId]: {
                    ...cur,
                    status: nextStatus,
                    updatedAt: new Date().toISOString(),
                },
            };
        });
        setIsDirty(true);
        setSaveState("IDLE");
    };

    const handleCriterionFieldChange = (
        criterionId: string,
        field: "note" | "writingSampleText" | "studentWritingText",
        value: string
    ) => {
        if (readOnly) return;
        setCriteriaResults((prev) => ({
            ...prev,
            [criterionId]: {
                ...prev[criterionId],
                [field]: value,
                updatedAt: new Date().toISOString(),
            },
        }));
        setIsDirty(true);
        setSaveState("IDLE");
    };

    // Lưu nháp kết quả đánh giá
    const handleSaveDraft = async (silent = false): Promise<boolean> => {
        if (readOnly) return true;
        setSaveState("SAVING");
        try {
            const pId = periodId || student?.periodId || student?.batch?.periodId || "ALL";
            const res = await fetch("/api/tci/assessments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId: student.id,
                    periodId: pId,
                    assessmentDate,
                    criteriaResults,
                    generalComment,
                    highlightsComment,
                    supportNeededComment,
                    teacherRecommendation,
                    expectedLockVersion: lockVersion,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Không thể lưu nháp phiếu TCI");
            }

            applyBundle(data);
            setIsDirty(false);
            setSaveState("SAVED");
            setLastSavedTime(
                new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
            );

            if (onSavedRecord && data.record) {
                onSavedRecord(data.record);
            }

            if (!silent) {
                toast.success(
                    `Đã lưu nháp (${data.record?.countEvaluated ?? summary.countEvaluated}/16 tiêu chí).`
                );
            }
            return true;
        } catch (err: any) {
            setSaveState("ERROR");
            toast.error(err.message || "Lỗi khi lưu nháp kết quả môn TCI");
            return false;
        }
    };

    // Tải lên hoặc thay thế ảnh sản phẩm (Câu 16 / Câu 13)
    const handleUploadProductImage = async (
        criterion: TciCriterionConfig,
        file: File | null | undefined,
        replaceEvidenceId?: string
    ) => {
        if (!file || readOnly) return;
        const cId = criterion.criterionId;

        const allowedMimes = criterion.allowedMimeTypes || [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];
        if (!allowedMimes.includes(file.type.toLowerCase())) {
            const msg = `Định dạng "${file.type || file.name}" không hợp lệ. Chỉ chấp nhận ảnh JPEG (.jpg), PNG (.png) hoặc WebP (.webp).`;
            setUploadErrorByCriterion((prev) => ({ ...prev, [cId]: msg }));
            toast.error(msg);
            return;
        }

        const maxBytes = (criterion.maxFileSizeMb || 5) * 1024 * 1024;
        if (file.size > maxBytes) {
            const msg = `Tệp ảnh "${file.name}" (${(file.size / (1024 * 1024)).toFixed(
                2
            )} MB) vượt quá dung lượng cho phép (${criterion.maxFileSizeMb || 5} MB).`;
            setUploadErrorByCriterion((prev) => ({ ...prev, [cId]: msg }));
            toast.error(msg);
            return;
        }

        setUploadingByCriterion((prev) => ({ ...prev, [cId]: true }));
        setUploadErrorByCriterion((prev) => ({ ...prev, [cId]: null }));

        try {
            const base64DataUrl: string = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => reject(new Error("Lỗi đọc tệp ảnh từ thiết bị."));
                reader.readAsDataURL(file);
            });

            const pId = periodId || student?.periodId || student?.batch?.periodId || "ALL";
            const res = await fetch("/api/tci/evidence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "UPLOAD",
                    studentId: student.id,
                    periodId: pId,
                    criterionId: cId,
                    fileName: file.name,
                    mimeType: file.type,
                    imageDataBase64: base64DataUrl,
                    replaceEvidenceId: replaceEvidenceId || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Lỗi tải ảnh sản phẩm lên máy chủ");
            }

            const newEv: TciEvidenceSummaryItem = {
                id: data.evidence.id,
                criterionId: data.evidence.criterionId,
                criterionStt: data.evidence.criterionStt,
                indicatorCode: data.evidence.indicatorCode,
                fileName: data.evidence.fileName,
                mimeType: data.evidence.mimeType,
                fileSizeBytes: data.evidence.fileSizeBytes,
                rotationDeg: data.evidence.rotationDeg || 0,
                imageDataBase64: data.evidence.imageDataBase64,
                uploadedByUserId: data.evidence.uploadedByUserId,
                uploadedByName: data.evidence.uploadedByName,
                createdAt: data.evidence.createdAt,
            };

            setEvidences((prev) => {
                if (replaceEvidenceId) {
                    return prev.map((item) => (item.id === replaceEvidenceId ? newEv : item));
                }
                return [...prev, newEv];
            });
            toast.success(
                replaceEvidenceId
                    ? `Đã thay thế ảnh sản phẩm tại Câu ${criterion.stt}.`
                    : `Đã tải lên ảnh sản phẩm tại Câu ${criterion.stt}.`
            );
        } catch (err: any) {
            const msg = err.message || "Lỗi tải ảnh sản phẩm";
            setUploadErrorByCriterion((prev) => ({ ...prev, [cId]: msg }));
            toast.error(msg);
        } finally {
            setUploadingByCriterion((prev) => ({ ...prev, [cId]: false }));
        }
    };

    // Xoay ảnh sản phẩm 90 độ và lưu đúng hướng đã xoay lên server (để PDF giống hệt giao diện)
    const handleRotateEvidence = async (ev: TciEvidenceSummaryItem, deltaDeg: number) => {
        if (readOnly || !ev.imageDataBase64) return;
        const cId = ev.criterionId;
        setUploadingByCriterion((prev) => ({ ...prev, [cId]: true }));
        try {
            const rotatedDataUrl = await rotateImageDataUrlOnCanvas(
                ev.imageDataBase64,
                deltaDeg,
                ev.mimeType
            );
            const res = await fetch("/api/tci/evidence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "ROTATE",
                    evidenceId: ev.id,
                    rotationDeg: 0,
                    rotatedImageDataBase64: rotatedDataUrl,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Không thể xoay ảnh sản phẩm");

            setEvidences((prev) =>
                prev.map((item) =>
                    item.id === ev.id
                        ? {
                              ...item,
                              imageDataBase64: data.evidence.imageDataBase64,
                              rotationDeg: data.evidence.rotationDeg || 0,
                          }
                        : item
                )
            );
            toast.success("Đã xoay và lưu hướng ảnh sản phẩm.");
        } catch (err: any) {
            toast.error(err.message || "Lỗi khi xoay ảnh sản phẩm");
        } finally {
            setUploadingByCriterion((prev) => ({ ...prev, [cId]: false }));
        }
    };

    // Xóa ảnh sản phẩm trước khi ký
    const handleDeleteEvidence = async (ev: TciEvidenceSummaryItem) => {
        if (readOnly) return;
        try {
            const res = await fetch(
                `/api/tci/evidence?evidenceId=${encodeURIComponent(ev.id)}`,
                { method: "DELETE" }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Không thể xóa ảnh sản phẩm");

            setEvidences((prev) => prev.filter((item) => item.id !== ev.id));
            toast.success("Đã xóa ảnh sản phẩm.");
        } catch (err: any) {
            toast.error(err.message || "Lỗi xóa ảnh sản phẩm");
        }
    };

    // Ký và xác nhận hoàn thành + tạo PDF bất biến
    const handleSignAndComplete = async () => {
        if (readOnly || signing) return;
        setHighlightMissing(true);

        if (!validation.valid) {
            toast.error(validation.errors[0] || "Vui lòng hoàn thành đủ 16 tiêu chí trước khi ký.");
            // Tự động cuộn tới tiêu chí còn thiếu đầu tiên
            const firstMissingStt =
                validation.summary.missingStts[0] || validation.missingEvidenceStts[0];
            if (firstMissingStt) {
                const el = document.getElementById(`tci-criterion-row-${firstMissingStt}`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return;
        }

        setSigning(true);
        try {
            const pId = periodId || student?.periodId || student?.batch?.periodId || "ALL";
            const res = await fetch("/api/tci/sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId: student.id,
                    periodId: pId,
                    assessmentDate,
                    criteriaResults,
                    generalComment,
                    highlightsComment,
                    supportNeededComment,
                    teacherRecommendation,
                    hasUploadingOrErroredEvidence,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.code === "MISSING_SIGNATURE_PROFILE") {
                    setShowMissingSigModal(true);
                }
                throw new Error(data.error || "Không thể ký xác nhận phiếu TCI");
            }

            applyBundle(data);
            setIsDirty(false);
            setSaveState("SAVED");
            setLastSavedTime(
                new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
            );
            toast.success(
                data.message ||
                    "Đã ký xác nhận hoàn thành và lưu trữ bản PDF bất biến thành công!"
            );

            if (onSavedRecord && data.record) {
                onSavedRecord(data.record);
            }
        } catch (err: any) {
            toast.error(err.message || "Lỗi khi ký xác nhận hoàn thành phiếu");
        } finally {
            setSigning(false);
        }
    };

    const handlePreviewPrintHtml = async () => {
        if (isDirty && !readOnly) {
            await handleSaveDraft(true);
        }
        const pId = periodId || student?.periodId || student?.batch?.periodId || "ALL";
        const url = `/api/tci/pdf?studentId=${encodeURIComponent(
            student.id
        )}&periodId=${encodeURIComponent(pId)}&format=html&disposition=inline`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleDownloadPdf = async () => {
        if (isDirty && !readOnly) {
            await handleSaveDraft(true);
        }
        const pId = periodId || student?.periodId || student?.batch?.periodId || "ALL";
        const url = `/api/tci/pdf?studentId=${encodeURIComponent(
            student.id
        )}&periodId=${encodeURIComponent(pId)}&format=pdf&disposition=attachment`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleSafeClose = () => {
        if (isDirty && !readOnly) {
            const ok = window.confirm(
                "Bạn đang có thay đổi đánh giá chưa lưu. Bạn có chắc chắn muốn đóng mà không lưu không?"
            );
            if (!ok) return;
        }
        onClose();
    };

    const handleSafeNextStudent = async () => {
        if (!onNextStudent) return;
        if (isDirty && !readOnly) {
            const shouldSave = window.confirm(
                "Bạn có thay đổi chưa lưu cho học sinh hiện tại. Nhấn OK để tự động Lưu nháp trước khi chuyển sang học sinh tiếp theo."
            );
            if (shouldSave) {
                const ok = await handleSaveDraft(true);
                if (!ok) return;
            }
        }
        onNextStudent();
    };

    const displayedCriteria = useMemo(() => {
        if (!filterOnlyMissing) return criteriaConfig;
        return criteriaConfig.filter(
            (c) =>
                !criteriaResults[c.criterionId]?.status ||
                validation.missingEvidenceStts.includes(c.stt)
        );
    }, [criteriaConfig, filterOnlyMissing, criteriaResults, validation.missingEvidenceStts]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-xs max-w-md w-full space-y-3">
                    <RefreshCw className="w-6 h-6 text-[#00736E] animate-spin mx-auto" />
                    <div className="text-sm font-bold text-[#003B3A]">
                        Đang tải phiếu đánh giá môn TCI...
                    </div>
                    <div className="text-xs text-slate-500">
                        Học sinh: {student?.fullName} ({student?.studentCode})
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900">
            {/* A. THÔNG TIN ĐẦU TRANG (HEADER CỐ ĐỊNH) */}
            <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="w-1.5 self-stretch rounded-full bg-[#003B3A]" />
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#003B3A] text-white">
                                    {TCI_SUBJECT_DISPLAY_LABEL}
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 tabular-nums">
                                    Mẫu {templateVersionCode} • Kết quả v{resultVersion}
                                </span>
                                {isSigned ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        Đã ký và khóa phiếu
                                    </span>
                                ) : signatureStatus === "PENDING_RESIGN" ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Cần ký lại (Phiên bản v{resultVersion})
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                                        {getTciEvaluationStatusLabel(evaluationStatus)} • Chưa ký
                                    </span>
                                )}

                                {/* Trạng thái lưu trực tiếp */}
                                {saveState === "SAVING" && (
                                    <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                                        <RefreshCw className="w-3 h-3 animate-spin" /> Đang lưu...
                                    </span>
                                )}
                                {saveState === "SAVED" && !isDirty && (
                                    <span className="text-xs font-medium text-emerald-700 tabular-nums">
                                        ✓ Đã lưu {lastSavedTime ? `lúc ${lastSavedTime}` : ""}
                                    </span>
                                )}
                                {saveState === "ERROR" && (
                                    <span className="text-xs font-semibold text-rose-600">
                                        ✕ Lưu lỗi — vui lòng thử lại
                                    </span>
                                )}
                                {isDirty && saveState !== "SAVING" && (
                                    <span className="text-xs font-medium text-amber-700">
                                        • Có thay đổi chưa lưu
                                    </span>
                                )}
                            </div>

                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 tabular-nums">
                                <div>
                                    Học sinh:{" "}
                                    <strong className="text-sm text-[#003B3A]">
                                        {student?.fullName}
                                    </strong>
                                </div>
                                <div>
                                    Mã hồ sơ:{" "}
                                    <strong className="font-mono text-slate-900">
                                        {student?.studentCode || student?.id}
                                    </strong>
                                </div>
                                <div>
                                    Khối dự tuyển:{" "}
                                    <strong>{student?.grade || "Khối 1"}</strong>
                                </div>
                                {student?.batch?.name && (
                                    <div>
                                        Đợt: <strong>{student.batch.name}</strong>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <span>Ngày khảo sát:</span>
                                    <input
                                        type="date"
                                        disabled={readOnly}
                                        value={assessmentDate}
                                        onChange={(e) => {
                                            setAssessmentDate(e.target.value);
                                            setIsDirty(true);
                                        }}
                                        className="h-6 px-1.5 rounded border border-slate-300 text-xs font-semibold bg-white disabled:bg-slate-100"
                                    />
                                </div>
                                <div>
                                    GV phụ trách:{" "}
                                    <strong>
                                        {signerName ||
                                            assessorName ||
                                            assignedTeacherName ||
                                            "Giáo viên khảo sát"}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end lg:self-center">
                        <button
                            type="button"
                            onClick={handlePreviewPrintHtml}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            <Eye className="w-3.5 h-3.5 text-[#00736E]" />
                            Xem phiếu A4
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-xs font-semibold text-[#00736E] hover:bg-teal-100"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Tải PDF
                        </button>
                        <button
                            type="button"
                            onClick={handleSafeClose}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                        >
                            <X className="w-4 h-4" />
                            Đóng
                        </button>
                    </div>
                </div>
            </header>

            {/* NỘI DUNG CHÍNH */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 space-y-5 pb-28">
                {/* Thông báo nếu phiếu vừa được mở khóa đánh giá lại */}
                {reopenReason && signatureStatus === "PENDING_RESIGN" && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                            <div className="font-bold">
                                Phiếu đã được mở khóa sang Phiên bản kết quả v{resultVersion} (Yêu cầu ký xác nhận lại)
                            </div>
                            <div className="mt-0.5">
                                Lý do mở khóa: <strong>{reopenReason}</strong>. Bản kết quả và file PDF đã ký của phiên bản trước vẫn được lưu giữ trong lịch sử.
                            </div>
                        </div>
                    </div>
                )}

                {/* C. DẢI TỔNG HỢP TRỰC TIẾP (UNIFIED LEDGER STRIP - TABULAR NUMS) */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 flex-1 tabular-nums">
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                                <div className="text-[11px] font-medium text-slate-500">
                                    Đã đánh giá
                                </div>
                                <div className="text-base font-bold text-[#003B3A] mt-0.5">
                                    {summary.countEvaluated}/{summary.totalCriteria}
                                </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
                                <div className="text-[11px] font-medium text-emerald-800">
                                    Đạt
                                </div>
                                <div className="text-base font-bold text-emerald-700 mt-0.5">
                                    {summary.countDat}/{summary.totalCriteria}
                                </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200">
                                <div className="text-[11px] font-medium text-rose-800">
                                    Không đạt
                                </div>
                                <div className="text-base font-bold text-rose-700 mt-0.5">
                                    {summary.countKhongDat}/{summary.totalCriteria}
                                </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
                                <div className="text-[11px] font-medium text-slate-600">
                                    Không làm
                                </div>
                                <div className="text-base font-bold text-slate-700 mt-0.5">
                                    {summary.countKhongLam}/{summary.totalCriteria}
                                </div>
                            </div>
                            <div
                                className={`p-2.5 rounded-lg border ${
                                    summary.countChuaDanhGia > 0
                                        ? "bg-amber-50/80 border-amber-200"
                                        : "bg-slate-50 border-slate-200"
                                }`}
                            >
                                <div className="text-[11px] font-medium text-amber-800">
                                    Chưa đánh giá
                                </div>
                                <div className="text-base font-bold text-amber-700 mt-0.5">
                                    {summary.countChuaDanhGia}/{summary.totalCriteria}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {summary.countChuaDanhGia > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilterOnlyMissing((v) => !v);
                                        setHighlightMissing(true);
                                    }}
                                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors tabular-nums ${
                                        filterOnlyMissing
                                            ? "bg-amber-600 text-white border-amber-600"
                                            : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                                    }`}
                                >
                                    {filterOnlyMissing
                                        ? "Hiện tất cả 16 tiêu chí"
                                        : `Lọc câu chưa đánh giá (${summary.countChuaDanhGia})`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* B. BẢNG 16 TIÊU CHÍ (MÁY TÍNH: BẢNG SỔ CÁI / ĐIỆN THOẠI: THẺ TIÊU CHÍ) */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="px-4 py-3 bg-[#003B3A] text-white flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-bold">
                            Bảng đánh giá 16 tiêu chí — Bộ chuẩn phát triển trẻ em 5–6 tuổi (Môn TCI)
                        </div>
                        <div className="text-[11px] text-teal-100">
                            Chọn 1 trong 3 mức: Đạt / Không đạt / Không làm (Không chọn sẵn kết quả)
                        </div>
                    </div>

                    {/* Giao diện Bảng trên máy tính (md trở lên) */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse tabular-nums">
                            <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                                <tr className="border-b text-xs font-semibold">
                                    <th className="py-3 px-3 w-14 text-center font-semibold">STT</th>
                                    <th className="py-3 px-3 w-28 text-center font-semibold">Mã chỉ số</th>
                                    <th className="py-3 px-4 font-semibold">Nội dung tiêu chí & Minh chứng sản phẩm</th>
                                    <th className="py-3 px-3 w-72 text-center font-semibold">
                                        Kết quả đánh giá
                                    </th>
                                    <th className="py-3 px-3 w-64 font-semibold">Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-xs">
                                {displayedCriteria.map((c) => {
                                    const entry = criteriaResults[c.criterionId];
                                    const status = entry?.status ?? null;
                                    const isMissingStatus = !status;
                                    const isMissingReqImage =
                                        validation.missingEvidenceStts.includes(c.stt);
                                    const isRowHighlighted =
                                        highlightMissing &&
                                        (isMissingStatus || isMissingReqImage);
                                    const itemEvidences = evidences.filter(
                                        (ev) =>
                                            ev.criterionId === c.criterionId ||
                                            ev.criterionStt === c.stt
                                    );
                                    const isUploading = Boolean(
                                        uploadingByCriterion[c.criterionId]
                                    );
                                    const uploadErr =
                                        uploadErrorByCriterion[c.criterionId] || null;

                                    return (
                                        <tr
                                            key={c.criterionId}
                                            id={`tci-criterion-row-${c.stt}`}
                                            className={`transition-colors ${
                                                isRowHighlighted
                                                    ? "bg-rose-50/50"
                                                    : status
                                                      ? "bg-white hover:bg-slate-50/60"
                                                      : "bg-slate-50/30 hover:bg-slate-50/80"
                                            }`}
                                        >
                                            <td className="py-3.5 px-3 text-center align-top">
                                                <span
                                                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs ${
                                                        isRowHighlighted
                                                            ? "bg-rose-600 text-white"
                                                            : status
                                                              ? "bg-[#003B3A] text-white"
                                                              : "bg-slate-200 text-slate-700"
                                                    }`}
                                                >
                                                    {c.stt}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-3 text-center align-top">
                                                <span className="inline-block px-2.5 py-1 rounded-md bg-teal-50 text-[#00736E] border border-teal-200 font-bold text-xs">
                                                    {c.indicatorCodes.join(", ")}
                                                </span>
                                                <div className="text-[11px] text-slate-500 mt-1">
                                                    {formatIndicatorCodesLabel(c.indicatorCodes)}
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 align-top space-y-2.5">
                                                <div className="font-semibold text-slate-900 text-sm leading-snug">
                                                    {c.content}
                                                </div>
                                                {c.guideline && (
                                                    <div className="text-xs text-slate-500">
                                                        Hướng dẫn: {c.guideline}
                                                    </div>
                                                )}

                                                {/* Vùng bổ trợ Câu 13: Giáo viên viết mẫu / Thí sinh viết theo */}
                                                {c.supplementaryType === "WRITING_SAMPLE_BOX" && (
                                                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-[11px] font-semibold text-[#003B3A] mb-1">
                                                                    Giáo viên viết mẫu:
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    disabled={readOnly}
                                                                    value={
                                                                        entry?.writingSampleText ??
                                                                        c.writingPromptDefault ??
                                                                        "bé chăm ngoan"
                                                                    }
                                                                    onChange={(e) =>
                                                                        handleCriterionFieldChange(
                                                                            c.criterionId,
                                                                            "writingSampleText",
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white font-semibold text-[#003B3A]"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                                                    Thí sinh viết theo (ghi nhận / mô tả):
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    disabled={readOnly}
                                                                    value={
                                                                        entry?.studentWritingText ?? ""
                                                                    }
                                                                    onChange={(e) =>
                                                                        handleCriterionFieldChange(
                                                                            c.criterionId,
                                                                            "studentWritingText",
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    placeholder="Ghi nhận nét viết hoặc đính kèm ảnh bài viết..."
                                                                    className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Vùng bổ trợ Câu 16: Ảnh mẫu tô màu + Mục Sản phẩm của học sinh */}
                                                {c.supplementaryType ===
                                                    "COLORING_SAMPLE_AND_PRODUCT" && (
                                                    <div className="p-3.5 rounded-xl bg-teal-50/40 border border-teal-200 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                        {/* Khối 1: Ảnh mẫu tô màu */}
                                                        <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-bold text-[#003B3A] text-xs">
                                                                    Ảnh mẫu tô màu (Chỉ số {c.indicatorCodes.join(", ")})
                                                                </span>
                                                                {c.sampleImageUrl && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setLightboxImage({
                                                                                url: c.sampleImageUrl!,
                                                                                title: `Ảnh mẫu tô màu — Câu ${c.stt} (Chỉ số ${c.indicatorCodes.join(", ")})`,
                                                                            })
                                                                        }
                                                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00736E] hover:underline"
                                                                    >
                                                                        <Maximize2 className="w-3 h-3" />
                                                                        Phóng to mẫu
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {c.sampleImageUrl ? (
                                                                <div className="border border-slate-100 rounded bg-slate-50 p-2 flex items-center justify-center">
                                                                    <img
                                                                        src={c.sampleImageUrl}
                                                                        alt="Ảnh mẫu tô màu Câu 16"
                                                                        className="max-h-40 object-contain cursor-pointer"
                                                                        onClick={() =>
                                                                            setLightboxImage({
                                                                                url: c.sampleImageUrl!,
                                                                                title: `Ảnh mẫu tô màu — Câu ${c.stt}`,
                                                                            })
                                                                        }
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="text-slate-400 text-xs py-6 text-center">
                                                                    Chưa có ảnh mẫu
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Khối 2: Mục Sản phẩm (Ảnh bài làm của học sinh) */}
                                                        <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2.5">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <div>
                                                                    <span className="font-bold text-[#003B3A] text-xs">
                                                                        Sản phẩm (Ảnh bài làm của học sinh)
                                                                    </span>
                                                                    <span className="ml-1.5 text-[11px] text-slate-500">
                                                                        ({itemEvidences.length}/{c.maxImages || 3} ảnh)
                                                                    </span>
                                                                    {c.isProductImageRequired &&
                                                                        status !== "KHONG_LAM" && (
                                                                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                                                                Bắt buộc
                                                                            </span>
                                                                        )}
                                                                </div>

                                                                {!readOnly &&
                                                                    itemEvidences.length <
                                                                        (c.maxImages || 3) && (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#003B3A] text-white text-xs font-semibold cursor-pointer hover:bg-[#005250] transition-colors">
                                                                                <Camera className="w-3.5 h-3.5" />
                                                                                <span>
                                                                                    Chụp / Tải ảnh sản phẩm
                                                                                </span>
                                                                                <input
                                                                                    type="file"
                                                                                    accept="image/jpeg,image/png,image/webp"
                                                                                    capture="environment"
                                                                                    className="hidden"
                                                                                    disabled={isUploading}
                                                                                    onChange={(e) => {
                                                                                        const f =
                                                                                            e.target
                                                                                                .files?.[0];
                                                                                        handleUploadProductImage(
                                                                                            c,
                                                                                            f
                                                                                        );
                                                                                        e.target.value =
                                                                                            "";
                                                                                    }}
                                                                                />
                                                                            </label>
                                                                        </div>
                                                                    )}
                                                            </div>

                                                            {isUploading && (
                                                                <div className="p-2 rounded bg-teal-50 text-[#00736E] text-xs font-medium flex items-center gap-1.5">
                                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                    Đang xử lý và lưu ảnh sản phẩm...
                                                                </div>
                                                            )}

                                                            {uploadErr && (
                                                                <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-between gap-2">
                                                                    <span>{uploadErr}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setUploadErrorByCriterion(
                                                                                (prev) => ({
                                                                                    ...prev,
                                                                                    [c.criterionId]:
                                                                                        null,
                                                                                })
                                                                            )
                                                                        }
                                                                        className="text-rose-800 underline text-[11px]"
                                                                    >
                                                                        Đóng
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {itemEvidences.length > 0 ? (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                    {itemEvidences.map((ev) => (
                                                                        <div
                                                                            key={ev.id}
                                                                            className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col justify-between gap-2"
                                                                        >
                                                                            <div
                                                                                className="h-32 bg-white border border-slate-200 rounded flex items-center justify-center overflow-hidden cursor-pointer"
                                                                                onClick={() =>
                                                                                    ev.imageDataBase64 &&
                                                                                    setLightboxImage({
                                                                                        url: ev.imageDataBase64,
                                                                                        title: `Sản phẩm Câu ${c.stt} — ${student?.fullName}`,
                                                                                        evidenceId:
                                                                                            ev.id,
                                                                                    })
                                                                                }
                                                                            >
                                                                                {ev.imageDataBase64 && (
                                                                                    <img
                                                                                        src={
                                                                                            ev.imageDataBase64
                                                                                        }
                                                                                        alt={
                                                                                            ev.fileName
                                                                                        }
                                                                                        className="max-h-full max-w-full object-contain"
                                                                                        style={{
                                                                                            transform: `rotate(${
                                                                                                ev.rotationDeg ||
                                                                                                0
                                                                                            }deg)`,
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center justify-between gap-1">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        ev.imageDataBase64 &&
                                                                                        setLightboxImage(
                                                                                            {
                                                                                                url: ev.imageDataBase64,
                                                                                                title: `Sản phẩm Câu ${c.stt} — ${student?.fullName}`,
                                                                                                evidenceId:
                                                                                                    ev.id,
                                                                                            }
                                                                                        )
                                                                                    }
                                                                                    className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                                                                    title="Phóng to xem ảnh"
                                                                                >
                                                                                    <Maximize2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                {!readOnly && (
                                                                                    <>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                handleRotateEvidence(
                                                                                                    ev,
                                                                                                    -90
                                                                                                )
                                                                                            }
                                                                                            className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                                                                            title="Xoay trái 90°"
                                                                                        >
                                                                                            <RotateCcw className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                handleRotateEvidence(
                                                                                                    ev,
                                                                                                    90
                                                                                                )
                                                                                            }
                                                                                            className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                                                                            title="Xoay phải 90°"
                                                                                        >
                                                                                            <RotateCw className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                        <label
                                                                                            className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                                                                                            title="Thay thế ảnh khác"
                                                                                        >
                                                                                            <Upload className="w-3.5 h-3.5" />
                                                                                            <input
                                                                                                type="file"
                                                                                                accept="image/jpeg,image/png,image/webp"
                                                                                                className="hidden"
                                                                                                onChange={(
                                                                                                    e
                                                                                                ) => {
                                                                                                    const f =
                                                                                                        e
                                                                                                            .target
                                                                                                            .files?.[0];
                                                                                                    handleUploadProductImage(
                                                                                                        c,
                                                                                                        f,
                                                                                                        ev.id
                                                                                                    );
                                                                                                    e.target.value =
                                                                                                        "";
                                                                                                }}
                                                                                            />
                                                                                        </label>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                handleDeleteEvidence(
                                                                                                    ev
                                                                                                )
                                                                                            }
                                                                                            className="p-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                                                                            title="Xóa ảnh này"
                                                                                        >
                                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center text-slate-500 text-xs">
                                                                    Chưa có ảnh sản phẩm tô màu của học sinh.{" "}
                                                                    {!readOnly &&
                                                                        "Nhấn “Chụp / Tải ảnh sản phẩm” (JPEG, PNG, WebP)."}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Đính kèm ảnh sản phẩm cho Câu 13 (hoặc tiêu chí khác nếu được bật) */}
                                                {c.allowProductImage &&
                                                    c.supplementaryType !==
                                                        "COLORING_SAMPLE_AND_PRODUCT" && (
                                                        <div className="pt-1 flex flex-wrap items-center gap-2">
                                                            {!readOnly &&
                                                                itemEvidences.length <
                                                                    (c.maxImages || 2) && (
                                                                    <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-teal-200 bg-teal-50 text-[#00736E] text-xs font-semibold cursor-pointer hover:bg-teal-100">
                                                                        <Camera className="w-3.5 h-3.5" />
                                                                        <span>
                                                                            Đính kèm ảnh minh chứng (Câu {c.stt})
                                                                        </span>
                                                                        <input
                                                                            type="file"
                                                                            accept="image/jpeg,image/png,image/webp"
                                                                            className="hidden"
                                                                            onChange={(e) => {
                                                                                const f =
                                                                                    e.target
                                                                                        .files?.[0];
                                                                                handleUploadProductImage(
                                                                                    c,
                                                                                    f
                                                                                );
                                                                                e.target.value = "";
                                                                            }}
                                                                        />
                                                                    </label>
                                                                )}
                                                            {itemEvidences.map((ev) => (
                                                                <div
                                                                    key={ev.id}
                                                                    className="inline-flex items-center gap-2 p-1.5 rounded border border-slate-200 bg-slate-50"
                                                                >
                                                                    {ev.imageDataBase64 && (
                                                                        <img
                                                                            src={ev.imageDataBase64}
                                                                            alt={ev.fileName}
                                                                            className="w-10 h-10 object-cover rounded cursor-pointer"
                                                                            onClick={() =>
                                                                                setLightboxImage({
                                                                                    url: ev.imageDataBase64!,
                                                                                    title: `Minh chứng Câu ${c.stt} — ${student?.fullName}`,
                                                                                    evidenceId:
                                                                                        ev.id,
                                                                                })
                                                                            }
                                                                        />
                                                                    )}
                                                                    {!readOnly && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleDeleteEvidence(
                                                                                    ev
                                                                                )
                                                                            }
                                                                            className="text-rose-600 hover:text-rose-800 p-1"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                            </td>

                                            {/* 3 lựa chọn loại trừ nhau: Đạt / Không đạt / Không làm */}
                                            <td className="py-3.5 px-3 align-top text-center">
                                                <div className="inline-flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200">
                                                    <button
                                                        type="button"
                                                        disabled={readOnly}
                                                        onClick={() =>
                                                            handleSelectChoice(c.criterionId, "DAT")
                                                        }
                                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                                            status === "DAT"
                                                                ? "bg-emerald-600 text-white shadow-xs"
                                                                : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                                                        } disabled:cursor-not-allowed`}
                                                    >
                                                        Đạt
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={readOnly}
                                                        onClick={() =>
                                                            handleSelectChoice(
                                                                c.criterionId,
                                                                "KHONG_DAT"
                                                            )
                                                        }
                                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                                            status === "KHONG_DAT"
                                                                ? "bg-rose-600 text-white shadow-xs"
                                                                : "bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                                                        } disabled:cursor-not-allowed`}
                                                    >
                                                        Không đạt
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={readOnly}
                                                        onClick={() =>
                                                            handleSelectChoice(
                                                                c.criterionId,
                                                                "KHONG_LAM"
                                                            )
                                                        }
                                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                                            status === "KHONG_LAM"
                                                                ? "bg-slate-700 text-white shadow-xs"
                                                                : "bg-white text-slate-700 hover:bg-slate-200"
                                                        } disabled:cursor-not-allowed`}
                                                    >
                                                        Không làm
                                                    </button>
                                                </div>
                                                {!status && (
                                                    <div
                                                        className={`text-[11px] mt-1 font-medium ${
                                                            isRowHighlighted
                                                                ? "text-rose-600 font-bold"
                                                                : "text-slate-400"
                                                        }`}
                                                    >
                                                        Chưa đánh giá
                                                    </div>
                                                )}
                                            </td>

                                            {/* Cột Ghi chú */}
                                            <td className="py-3.5 px-3 align-top">
                                                {c.allowNote !== false ? (
                                                    <textarea
                                                        rows={2}
                                                        disabled={readOnly}
                                                        value={entry?.note || ""}
                                                        onChange={(e) =>
                                                            handleCriterionFieldChange(
                                                                c.criterionId,
                                                                "note",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Ghi chú quan sát..."
                                                        className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white focus:border-[#00736E] outline-none disabled:bg-slate-100"
                                                    />
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Giao diện Điện thoại (Mobile Cards dưới md) */}
                    <div className="md:hidden divide-y divide-slate-200">
                        {displayedCriteria.map((c) => {
                            const entry = criteriaResults[c.criterionId];
                            const status = entry?.status ?? null;
                            const itemEvidences = evidences.filter(
                                (ev) =>
                                    ev.criterionId === c.criterionId || ev.criterionStt === c.stt
                            );

                            return (
                                <div key={c.criterionId} className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1.5 font-bold text-xs text-[#003B3A]">
                                            <span className="w-6 h-6 rounded bg-[#003B3A] text-white inline-flex items-center justify-center">
                                                {c.stt}
                                            </span>
                                            <span>{formatIndicatorCodesLabel(c.indicatorCodes)}</span>
                                        </span>
                                        <span className="text-xs font-semibold text-slate-500">
                                            {getTciChoiceLabel(status)}
                                        </span>
                                    </div>

                                    <div className="text-sm font-semibold text-slate-900">
                                        {c.content}
                                    </div>

                                    {/* 3 nút chọn lớn trên điện thoại */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            disabled={readOnly}
                                            onClick={() => handleSelectChoice(c.criterionId, "DAT")}
                                            className={`py-2.5 rounded-lg text-xs font-bold border ${
                                                status === "DAT"
                                                    ? "bg-emerald-600 text-white border-emerald-600"
                                                    : "bg-white text-slate-700 border-slate-300"
                                            }`}
                                        >
                                            Đạt
                                        </button>
                                        <button
                                            type="button"
                                            disabled={readOnly}
                                            onClick={() =>
                                                handleSelectChoice(c.criterionId, "KHONG_DAT")
                                            }
                                            className={`py-2.5 rounded-lg text-xs font-bold border ${
                                                status === "KHONG_DAT"
                                                    ? "bg-rose-600 text-white border-rose-600"
                                                    : "bg-white text-slate-700 border-slate-300"
                                            }`}
                                        >
                                            Không đạt
                                        </button>
                                        <button
                                            type="button"
                                            disabled={readOnly}
                                            onClick={() =>
                                                handleSelectChoice(c.criterionId, "KHONG_LAM")
                                            }
                                            className={`py-2.5 rounded-lg text-xs font-bold border ${
                                                status === "KHONG_LAM"
                                                    ? "bg-slate-700 text-white border-slate-700"
                                                    : "bg-white text-slate-700 border-slate-300"
                                            }`}
                                        >
                                            Không làm
                                        </button>
                                    </div>

                                    {c.allowProductImage && (
                                        <div className="p-3 rounded-lg bg-teal-50/50 border border-teal-200 space-y-2">
                                            {c.sampleImageUrl && (
                                                <img
                                                    src={c.sampleImageUrl}
                                                    alt="Ảnh mẫu"
                                                    className="max-h-32 object-contain mx-auto bg-white p-1 rounded border border-slate-200"
                                                />
                                            )}
                                            {!readOnly && (
                                                <label className="w-full py-2 rounded-lg bg-[#003B3A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                                                    <Camera className="w-4 h-4" />
                                                    <span>Chụp / Tải ảnh sản phẩm (Câu {c.stt})</span>
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        capture="environment"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const f = e.target.files?.[0];
                                                            handleUploadProductImage(c, f);
                                                            e.target.value = "";
                                                        }}
                                                    />
                                                </label>
                                            )}
                                            {itemEvidences.length > 0 && (
                                                <div className="flex gap-2 overflow-x-auto pt-1">
                                                    {itemEvidences.map((ev) => (
                                                        <div
                                                            key={ev.id}
                                                            className="relative shrink-0 w-24 h-24 border border-slate-200 rounded bg-white p-1"
                                                        >
                                                            {ev.imageDataBase64 && (
                                                                <img
                                                                    src={ev.imageDataBase64}
                                                                    alt={ev.fileName}
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <input
                                        type="text"
                                        disabled={readOnly}
                                        value={entry?.note || ""}
                                        onChange={(e) =>
                                            handleCriterionFieldChange(
                                                c.criterionId,
                                                "note",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Ghi chú tiêu chí..."
                                        className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs bg-white"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* D. NHẬN XÉT CUỐI PHIẾU & THÔNG TIN CHỮ KÝ XÁC NHẬN */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
                        <h3 className="text-sm font-bold text-[#003B3A] border-b border-slate-100 pb-2.5">
                            Nhận xét và đề xuất của giáo viên khảo sát
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            {footerConfig.enableHighlightsComment && (
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        {footerConfig.highlightsCommentLabel}
                                        {footerConfig.highlightsCommentRequired && (
                                            <span className="text-rose-600 ml-1">*</span>
                                        )}
                                    </label>
                                    <textarea
                                        rows={3}
                                        disabled={readOnly}
                                        value={highlightsComment}
                                        onChange={(e) => {
                                            setHighlightsComment(e.target.value);
                                            setIsDirty(true);
                                        }}
                                        placeholder="Ghi nhận điểm mạnh, sự tự tin, kỹ năng nổi bật của trẻ..."
                                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:border-[#00736E] outline-none disabled:bg-slate-100"
                                    />
                                </div>
                            )}

                            {footerConfig.enableSupportNeededComment && (
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        {footerConfig.supportNeededCommentLabel}
                                        {footerConfig.supportNeededCommentRequired && (
                                            <span className="text-rose-600 ml-1">*</span>
                                        )}
                                    </label>
                                    <textarea
                                        rows={3}
                                        disabled={readOnly}
                                        value={supportNeededComment}
                                        onChange={(e) => {
                                            setSupportNeededComment(e.target.value);
                                            setIsDirty(true);
                                        }}
                                        placeholder="Những kỹ năng/chỉ số trẻ cần được rèn luyện hoặc hỗ trợ thêm..."
                                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:border-[#00736E] outline-none disabled:bg-slate-100"
                                    />
                                </div>
                            )}

                            {footerConfig.enableTeacherRecommendation && (
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        {footerConfig.teacherRecommendationLabel}
                                        {footerConfig.teacherRecommendationRequired && (
                                            <span className="text-rose-600 ml-1">*</span>
                                        )}
                                    </label>
                                    <textarea
                                        rows={3}
                                        disabled={readOnly}
                                        value={teacherRecommendation}
                                        onChange={(e) => {
                                            setTeacherRecommendation(e.target.value);
                                            setIsDirty(true);
                                        }}
                                        placeholder="Đề xuất phối hợp giữa nhà trường và phụ huynh..."
                                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:border-[#00736E] outline-none disabled:bg-slate-100"
                                    />
                                </div>
                            )}

                            {footerConfig.enableGeneralComment && (
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        {footerConfig.generalCommentLabel}
                                        {footerConfig.generalCommentRequired && (
                                            <span className="text-rose-600 ml-1">*</span>
                                        )}
                                    </label>
                                    <textarea
                                        rows={3}
                                        disabled={readOnly}
                                        value={generalComment}
                                        onChange={(e) => {
                                            setGeneralComment(e.target.value);
                                            setIsDirty(true);
                                        }}
                                        placeholder="Nhận xét tổng quát về mức độ sẵn sàng vào Lớp 1..."
                                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:border-[#00736E] outline-none disabled:bg-slate-100"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Khối Chữ ký số của tôi & Xác thực */}
                    <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-xs">
                        <div>
                            <h3 className="text-sm font-bold text-[#003B3A] border-b border-slate-100 pb-2.5 flex items-center justify-between">
                                <span>Chữ ký người khảo sát</span>
                                <Link
                                    href="/teacher/chu-ky-so"
                                    target="_blank"
                                    className="text-xs font-semibold text-[#00736E] hover:underline"
                                >
                                    Cấu hình chữ ký →
                                </Link>
                            </h3>

                            {isSigned ? (
                                <div className="mt-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-xs">
                                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                        <span>ĐÃ KÝ XÁC NHẬN HOÀN THÀNH</span>
                                    </div>
                                    {signatureImageBase64 && (
                                        <div className="bg-white border border-emerald-200 rounded-lg p-2 flex items-center justify-center h-20">
                                            <img
                                                src={signatureImageBase64}
                                                alt="Chữ ký giáo viên"
                                                className="max-h-16 object-contain"
                                            />
                                        </div>
                                    )}
                                    <div className="text-slate-700 space-y-0.5 tabular-nums">
                                        <div>
                                            Người ký: <strong>{signerName}</strong>
                                        </div>
                                        <div>
                                            Hình thức:{" "}
                                            <strong>
                                                {signatureType === "CERTIFICATE_CA"
                                                    ? "Chữ ký số chứng thư (CA)"
                                                    : "Chữ ký giáo viên (Chữ ký số của tôi)"}
                                            </strong>
                                        </div>
                                        <div>
                                            Thời gian ký:{" "}
                                            <strong>
                                                {signedAt
                                                    ? new Date(signedAt).toLocaleString("vi-VN")
                                                    : "—"}
                                            </strong>
                                        </div>
                                        {signedSnapshotHash && (
                                            <div className="text-[10px] text-slate-500 break-all pt-1">
                                                SHA-256: {signedSnapshotHash.slice(0, 32)}...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-3 space-y-3 text-xs">
                                    {actorSignatureProfile?.hasSignature ? (
                                        <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200 text-slate-700 space-y-1">
                                            <div className="font-semibold text-[#003B3A] flex items-center gap-1.5">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                Đã sẵn sàng chữ ký của:{" "}
                                                {actorSignatureProfile.signerName}
                                            </div>
                                            <div className="text-[11px] text-slate-600">
                                                Loại chữ ký:{" "}
                                                {actorSignatureProfile.signatureType ===
                                                "CERTIFICATE_CA"
                                                    ? "Chữ ký số chứng thư CA"
                                                    : "Chữ ký điện tử giáo viên"}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                                            <div className="font-semibold flex items-center gap-1.5">
                                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                                Bạn chưa thiết lập chữ ký tại “Chữ ký số của tôi”
                                            </div>
                                            <p className="text-[11px] text-amber-800">
                                                Bạn vẫn có thể nhập đánh giá và bấm <strong>Lưu nháp</strong> bình thường. Để ký xác nhận hoàn thành, vui lòng thiết lập chữ ký trước.
                                            </p>
                                            <Link
                                                href="/teacher/chu-ky-so"
                                                target="_blank"
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-700 text-white font-semibold text-[11px] hover:bg-amber-800"
                                            >
                                                Mở trang Chữ ký số của tôi
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
                            Sau khi nhấn <strong>“Ký và xác nhận hoàn thành”</strong>, phiếu sẽ được khóa và xuất bản PDF bất biến phục vụ xét duyệt.
                        </div>
                    </div>
                </div>
            </main>

            {/* E. THANH THAO TÁC CỐ ĐỊNH CUỐI MÀN HÌNH */}
            <footer className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-600 tabular-nums">
                        Tiến độ:{" "}
                        <strong className="text-[#003B3A]">
                            {summary.countEvaluated}/16 tiêu chí
                        </strong>{" "}
                        (Đạt: <strong className="text-emerald-700">{summary.countDat}</strong> • Không đạt:{" "}
                        <strong className="text-rose-600">{summary.countKhongDat}</strong> • Không làm:{" "}
                        <strong className="text-slate-700">{summary.countKhongLam}</strong> • Chưa đánh giá:{" "}
                        <strong className="text-amber-700">{summary.countChuaDanhGia}</strong>)
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={() => handleSaveDraft(false)}
                                disabled={saveState === "SAVING" || signing}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4 text-[#00736E]" />
                                {saveState === "SAVING" ? "Đang lưu nháp..." : "Lưu nháp"}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handlePreviewPrintHtml}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            <Eye className="w-4 h-4 text-[#00736E]" />
                            Xem trước phiếu
                        </button>

                        {!readOnly && (
                            <button
                                type="button"
                                onClick={handleSignAndComplete}
                                disabled={signing || saveState === "SAVING"}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#003B3A] text-white text-xs font-bold hover:bg-[#005250] transition-colors disabled:opacity-50 shadow-xs"
                            >
                                <PenTool className="w-4 h-4" />
                                {signing
                                    ? "Đang ký & tạo PDF..."
                                    : "Ký và xác nhận hoàn thành"}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-teal-200 bg-teal-50 text-xs font-semibold text-[#00736E] hover:bg-teal-100"
                        >
                            <Download className="w-4 h-4" />
                            Tải PDF
                        </button>

                        {hasNextStudent && onNextStudent && (
                            <button
                                type="button"
                                onClick={handleSafeNextStudent}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00A19A] text-white text-xs font-semibold hover:bg-[#008B85]"
                            >
                                <span>Học sinh tiếp theo</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </footer>

            {/* MODAL HƯỚNG DẪN KHI GIÁO VIÊN CHƯA CẤU HÌNH CHỮ KÝ SỐ */}
            {showMissingSigModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 space-y-4 shadow-xl">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">
                                    Chưa thiết lập “Chữ ký số của tôi”
                                </h4>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                    Toàn bộ kết quả đánh giá 16 tiêu chí và ảnh sản phẩm của học sinh{" "}
                                    <strong>{student?.fullName}</strong> đã được hệ thống <strong>lưu nháp an toàn</strong>. Vui lòng thiết lập chữ ký tại mục “Chữ ký số của tôi” trước khi ký xác nhận hoàn thành phiếu.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowMissingSigModal(false)}
                                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
                            >
                                Đóng
                            </button>
                            <Link
                                href="/teacher/chu-ky-so"
                                target="_blank"
                                onClick={() => setShowMissingSigModal(false)}
                                className="px-4 py-1.5 rounded-lg bg-[#003B3A] text-white text-xs font-semibold"
                            >
                                Thiết lập Chữ ký số của tôi →
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* LIGHTBOX XEM TRƯỚC & PHÓNG TO ẢNH MẪU / ẢNH SẢN PHẨM */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4"
                    onClick={() => setLightboxImage(null)}
                >
                    <div
                        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 py-3 bg-[#003B3A] text-white flex items-center justify-between text-xs font-bold">
                            <span>{lightboxImage.title}</span>
                            <button
                                type="button"
                                onClick={() => setLightboxImage(null)}
                                className="p-1 rounded hover:bg-white/10"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 bg-slate-900 flex-1 flex items-center justify-center overflow-auto">
                            <img
                                src={lightboxImage.url}
                                alt={lightboxImage.title}
                                className="max-h-[75vh] max-w-full object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
