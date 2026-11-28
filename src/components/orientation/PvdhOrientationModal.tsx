"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  X,
  Save,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  Unlock,
  FileText,
  Download,
  Printer,
  Send,
  RotateCcw,
  Plus,
  Trash2,
  ExternalLink,
  UserCheck,
  Users,
  ClipboardList,
  Compass,
  Eye,
  History,
  Share2,
  Loader2,
  ShieldCheck,
  Brain,
  Mail,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import {
  BM_SHEET_STATUS_OPTIONS,
  BmSheetStatusCode,
  FURTHER_INQUIRY_OPTIONS,
  FurtherInquiryTopicCode,
  PVDH_WORKFLOW_STATUS_LABELS,
  PvdhFieldConfig,
  PvdhFollowUpActionItem,
  PvdhInterviewItemValue,
  PvdhSectionCode,
  PvdhSectionConfig,
  PvdhTeacherSummaryD,
  PvdhWorkflowStatus,
  formatFollowUpActionsToText,
  isBmKtdbclTemplate,
  normalizeK12GradeNumber,
} from "@/lib/pvdh/constants";
import {
  PvdhValidationScope,
  normalizeFurtherTopics,
  parseTeacherSummary,
  validatePvdhRecordData,
} from "@/lib/pvdh/validation";

export interface PvdhOrientationModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  initialSection?: PvdhSectionCode | "FULL_FORM" | "PREVIEW";
  onSuccess?: () => void;
}

type NavTabKey = PvdhSectionCode | "FULL_FORM" | "PREVIEW";

const PARENT_RELATIONSHIP_PRESETS = ["Mẹ", "Bố", "Bố và Mẹ", "Ông / Bà", "Người giám hộ"];

interface AutoGrowTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
}

function AutoGrowTextarea({ minRows = 2, value, onChange, className = "", ...rest }: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, minRows * 24 + 16)}px`;
  }, [minRows]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        adjustHeight();
      }}
      className={`resize-y overflow-hidden ${className}`}
      {...rest}
    />
  );
}

export function PvdhOrientationModal({
  isOpen,
  onClose,
  student,
  initialSection = "FULL_FORM",
  onSuccess,
}: PvdhOrientationModalProps) {
  const [loading, setLoading] = useState(false);
  const [savingMode, setSavingMode] = useState<"NONE" | "DRAFT" | "COMPLETE" | "WORKFLOW" | "PSYCH_EMAIL">("NONE");
  const [activeNav, setActiveNav] = useState<NavTabKey>(initialSection);

  // Workspace data from API
  const [workspace, setWorkspace] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveBanner, setSaveBanner] = useState<{ type: "ok" | "err" | "warn"; text: string } | null>(null);
  const [validationIssues, setValidationIssues] = useState<
    Array<{ fieldKey: string; sectionCode: PvdhSectionCode; label: string; message: string }>
  >([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form states
  const [interviewDate, setInterviewDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [studentInterviewerTitle, setStudentInterviewerTitle] = useState("Giáo viên phỏng vấn");
  const [parentFullName, setParentFullName] = useState("");
  const [parentRelationship, setParentRelationship] = useState("");
  const [parentContactChannel, setParentContactChannel] = useState("");
  const [parentInterviewerName, setParentInterviewerName] = useState("");

  const [studentResponses, setStudentResponses] = useState<Record<string, PvdhInterviewItemValue>>({});
  const [obsStrengthsInterests, setObsStrengthsInterests] = useState("");
  const [obsCommunicationStyle, setObsCommunicationStyle] = useState("");
  const [obsParticipationLevel, setObsParticipationLevel] = useState("");
  const [obsSupportNeeds, setObsSupportNeeds] = useState("");

  const [parentResponses, setParentResponses] = useState<Record<string, PvdhInterviewItemValue>>({});
  const [teacherSummary, setTeacherSummary] = useState<PvdhTeacherSummaryD>({
    d01: "",
    d02: "",
    d03: "",
    d04: "",
    sheetStatus: "",
    psychInterviewRequested: false,
  });

  // Psychology referral coordination states
  const [selectedPsychTeacherId, setSelectedPsychTeacherId] = useState<string>("");
  const [psychReferralNote, setPsychReferralNote] = useState<string>("");

  // Legacy PVDH V states (backward compatibility if older non-BM record opened)
  const [planStrengthsPriority, setPlanStrengthsPriority] = useState("");
  const [planGoalsActionsText, setPlanGoalsActionsText] = useState("");
  const [followUpActions, setFollowUpActions] = useState<PvdhFollowUpActionItem[]>([]);
  const [planCoordinator, setPlanCoordinator] = useState("");
  const [planReviewDate, setPlanReviewDate] = useState("");
  const [planFurtherTopics, setPlanFurtherTopics] = useState<FurtherInquiryTopicCode[]>([]);
  const [planFurtherOtherText, setPlanFurtherOtherText] = useState("");
  const [planReferralReason, setPlanReferralReason] = useState("");
  const [planReferralReceiver, setPlanReferralReceiver] = useState("");
  const [planHandoverNotes, setPlanHandoverNotes] = useState("");
  const [internalSensitiveNotes, setInternalSensitiveNotes] = useState("");

  // Action dialogs (Return / Reopen / Handover / Template Switch)
  const [workflowPrompt, setWorkflowPrompt] = useState<
    null | { mode: "RETURN" | "REOPEN" | "SWITCH_TEMPLATE" | "HANDOVER"; reason: string; includeSensitive: boolean }
  >(null);
  const [useSignatureOnConfirm, setUseSignatureOnConfirm] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string>("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const formScrollRef = useRef<HTMLDivElement>(null);

  const hydrateFromWorkspace = useCallback((ws: any) => {
    setWorkspace(ws);
    const rec = ws?.record;
    const defaultTeacherId =
      ws?.psychReferralContext?.defaultPsychTeachers?.[0]?.userId ||
      ws?.psychReferralContext?.psychTeacherCandidates?.[0]?.userId ||
      "";

    if (!rec) {
      setInterviewDate(new Date().toISOString().split("T")[0]);
      setSelectedPsychTeacherId(defaultTeacherId);
      setHasUnsavedChanges(false);
      return;
    }

    const parsedSum = parseTeacherSummary(rec.teacherSummary || rec.teacherSummaryJson);
    setInterviewDate(rec.interviewDate || new Date().toISOString().split("T")[0]);
    setStudentInterviewerTitle(rec.studentInterviewerTitle || "Giáo viên phỏng vấn");
    setParentFullName(rec.parentFullName || ws?.student?.parentName || "");
    setParentRelationship(rec.parentRelationship || "");
    setParentContactChannel(rec.parentContactChannel || "");
    setParentInterviewerName(rec.parentInterviewerName || "");

    setStudentResponses(rec.studentResponses || {});
    setObsStrengthsInterests(rec.obsStrengthsInterests || "");
    setObsCommunicationStyle(rec.obsCommunicationStyle || "");
    setObsParticipationLevel(rec.obsParticipationLevel || "");
    setObsSupportNeeds(rec.obsSupportNeeds || "");

    setParentResponses(rec.parentResponses || {});
    setTeacherSummary(parsedSum);
    setSelectedPsychTeacherId(parsedSum.psychAssignedTeacherId || defaultTeacherId);
    setPsychReferralNote(parsedSum.psychReferralNote || "");

    setPlanStrengthsPriority(rec.planStrengthsPriority || "");
    setPlanGoalsActionsText(rec.planGoalsActionsText || "");
    setFollowUpActions(Array.isArray(rec.followUpActions) ? rec.followUpActions : []);
    setPlanCoordinator(rec.planCoordinator || "");
    setPlanReviewDate(rec.planReviewDate || "");
    setPlanFurtherTopics(Array.isArray(rec.planFurtherTopics) ? rec.planFurtherTopics : []);
    setPlanFurtherOtherText(rec.planFurtherOtherText || "");
    setPlanReferralReason(rec.planReferralReason || "");
    setPlanReferralReceiver(rec.planReferralReceiver || "");
    setPlanHandoverNotes(rec.planHandoverNotes || "");
    setInternalSensitiveNotes(rec.internalSensitiveNotes || "");

    if (rec.updatedAt) {
      setLastSavedAt(
        new Date(rec.updatedAt).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }
    setHasUnsavedChanges(false);
  }, []);

  const loadWorkspace = useCallback(
    async (attemptNum?: number) => {
      if (!student?.id && !student?.studentCode) return;
      setLoading(true);
      setLoadError(null);
      try {
        const key = encodeURIComponent(student.id || student.studentCode);
        const attQuery = attemptNum ? `&attemptNumber=${attemptNum}` : "";
        const res = await fetch(`/api/pvdh/records?studentId=${key}${attQuery}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setLoadError(data.error || "Không thể tải phiếu định hướng.");
          return;
        }
        hydrateFromWorkspace(data);
      } catch (err: any) {
        setLoadError(err?.message || "Lỗi kết nối máy chủ.");
      } finally {
        setLoading(false);
      }
    },
    [student?.id, student?.studentCode, hydrateFromWorkspace]
  );

  useEffect(() => {
    if (isOpen) {
      setValidationIssues([]);
      setSaveBanner(null);
      setActiveNav(initialSection);
      loadWorkspace();
    }
  }, [isOpen, initialSection, loadWorkspace]);

  // Cảnh báo khi đóng trình duyệt nếu có thay đổi chưa lưu
  useEffect(() => {
    if (!isOpen || !hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isOpen, hasUnsavedChanges]);

  const loadHtmlPreview = useCallback(async () => {
    if (!workspace?.student?.id) return;
    setLoadingPreview(true);
    setPreviewError("");
    try {
      const att = workspace?.record?.attemptNumber ? `&attemptNumber=${workspace.record.attemptNumber}` : "";
      const res = await fetch(
        `/api/pvdh/pdf?studentId=${encodeURIComponent(workspace.student.id)}${att}&format=html&disposition=inline`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const html = await res.text();
        setPreviewHtml(html);
      } else {
        let errMsg = `Không thể tải bản xem trước (HTTP ${res.status}).`;
        try {
          const data = await res.json();
          if (data?.error) errMsg = data.error;
        } catch {
          // ignore non-json error body
        }
        setPreviewHtml("");
        setPreviewError(errMsg);
      }
    } catch (err: any) {
      setPreviewHtml("");
      setPreviewError(err?.message || "Lỗi kết nối khi tải bản xem trước A4.");
    } finally {
      setLoadingPreview(false);
    }
  }, [workspace?.student?.id, workspace?.record?.attemptNumber]);

  useEffect(() => {
    if (activeNav === "PREVIEW" && isOpen) {
      loadHtmlPreview();
    }
  }, [activeNav, isOpen, loadHtmlPreview]);

  const rights = workspace?.accessRights || {};
  const rec = workspace?.record;
  const stInfo = workspace?.student || student || {};
  const ver = workspace?.version || {};
  const psychCtx = workspace?.psychReferralContext || null;
  const sections: PvdhSectionConfig[] = Array.isArray(ver.sections) ? ver.sections : [];
  const fields: PvdhFieldConfig[] = Array.isArray(ver.fields) ? ver.fields : [];
  const isBmLayout = isBmKtdbclTemplate({
    exportLayout: ver.exportLayout,
    sections,
    fields,
    templateCode: ver.templateCode,
  });
  const isLocked = Boolean(rec?.isLocked);
  const canEditStu = Boolean(rights.canEditStudentPart && !isLocked);
  const canEditPar = Boolean(rights.canEditParentPart && !isLocked);
  const canEditOri = Boolean(rights.canEditOrientationPart && !isLocked);

  const buildCurrentPayload = useCallback(
    (overrideSummary?: Partial<PvdhTeacherSummaryD>) => ({
      interviewDate,
      studentInterviewerTitle,
      parentFullName,
      parentRelationship,
      parentContactChannel,
      parentInterviewerName: parentInterviewerName || undefined,
      studentResponses,
      obsStrengthsInterests,
      obsCommunicationStyle,
      obsParticipationLevel,
      obsSupportNeeds,
      parentResponses,
      teacherSummary: {
        ...teacherSummary,
        psychReferralNote: psychReferralNote || teacherSummary.psychReferralNote,
        psychAssignedTeacherId: selectedPsychTeacherId || teacherSummary.psychAssignedTeacherId,
        ...(overrideSummary || {}),
      },
      planStrengthsPriority,
      planGoalsActionsText,
      followUpActions,
      planCoordinator,
      planReviewDate,
      planFurtherTopics,
      planFurtherOtherText,
      planReferralReason,
      planReferralReceiver,
      planHandoverNotes,
      internalSensitiveNotes,
    }),
    [
      interviewDate,
      studentInterviewerTitle,
      parentFullName,
      parentRelationship,
      parentContactChannel,
      parentInterviewerName,
      studentResponses,
      obsStrengthsInterests,
      obsCommunicationStyle,
      obsParticipationLevel,
      obsSupportNeeds,
      parentResponses,
      teacherSummary,
      psychReferralNote,
      selectedPsychTeacherId,
      planStrengthsPriority,
      planGoalsActionsText,
      followUpActions,
      planCoordinator,
      planReviewDate,
      planFurtherTopics,
      planFurtherOtherText,
      planReferralReason,
      planReferralReceiver,
      planHandoverNotes,
      internalSensitiveNotes,
    ]
  );

  const jumpToField = useCallback(
    (sectionCode: PvdhSectionCode, fieldKey: string) => {
      if (activeNav !== "FULL_FORM") {
        setActiveNav(sectionCode);
      }
      setTimeout(() => {
        const el = document.getElementById(`pvdh-field-${fieldKey}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const inputEl = el.querySelector("textarea, input, button") as HTMLElement | null;
          inputEl?.focus();
        }
      }, 100);
    },
    [activeNav]
  );

  const handleSave = useCallback(
    async (mode: "DRAFT" | "COMPLETE") => {
      if (!stInfo?.id) return;
      setSavingMode(mode);
      setSaveBanner(null);
      setValidationIssues([]);
      try {
        const res = await fetch("/api/pvdh/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: mode === "COMPLETE" ? "COMPLETE" : "SAVE_DRAFT",
            studentId: stInfo.id,
            recordId: rec?.id,
            expectedLockVersion: rec?.lockVersion,
            payload: buildCurrentPayload(),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          if (data.code === "VALIDATION_FAILED" && Array.isArray(data.details?.issues)) {
            setValidationIssues(data.details.issues);
            const first = data.details.issues[0];
            setSaveBanner({
              type: "err",
              text: `Còn ${data.details.issues.length} mục bắt buộc chưa hoàn tất. Đã chuyển tới mục cần nhập đầu tiên.`,
            });
            if (first) jumpToField(first.sectionCode, first.fieldKey);
          } else if (data.code === "CONCURRENCY_CONFLICT") {
            setSaveBanner({
              type: "warn",
              text: data.error || "Phiếu vừa được người khác cập nhật. Vui lòng bấm Tải lại phiếu để đồng bộ.",
            });
          } else {
            setSaveBanner({ type: "err", text: data.error || "Không thể lưu dữ liệu." });
          }
          return;
        }

        hydrateFromWorkspace(data);
        const emailSentSuffix = data.emailDispatch?.sent
          ? ` Đã tự động gửi Email đề nghị phỏng vấn tâm lý tới ${data.emailDispatch.recipients.join(", ")}.`
          : "";
        setSaveBanner({
          type: "ok",
          text:
            (mode === "COMPLETE"
              ? "Đã hoàn tất phần được phân công và lưu dữ liệu thành công."
              : "Đã lưu bản nháp thành công.") + emailSentSuffix,
        });
        onSuccess?.();
      } catch (err: any) {
        setSaveBanner({ type: "err", text: err?.message || "Lỗi kết nối khi lưu phiếu." });
      } finally {
        setSavingMode("NONE");
      }
    },
    [stInfo?.id, rec?.id, rec?.lockVersion, buildCurrentPayload, jumpToField, hydrateFromWorkspace, onSuccess]
  );

  // Phím tắt Ctrl+S / Cmd+S lưu nháp nhanh cho giáo viên khi đang phỏng vấn
  useEffect(() => {
    if (!isOpen || isLocked || (!canEditStu && !canEditPar && !canEditOri)) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (savingMode === "NONE") {
          handleSave("DRAFT");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isLocked, canEditStu, canEditPar, canEditOri, savingMode, handleSave]);

  if (!isOpen) return null;

  // Xử lý bấm nút "Đề nghị phỏng vấn tâm lý": lưu nháp + gửi Email ngay cho Giáo vụ cơ sở & GV tâm lý phân công
  const handleRequestPsychInterview = async () => {
    if (!stInfo?.id || !canEditOri) return;
    setSavingMode("PSYCH_EMAIL");
    setSaveBanner(null);
    const effectiveNote =
      psychReferralNote.trim() ||
      teacherSummary.d02.trim() ||
      teacherSummary.d04.trim() ||
      `Đề nghị phỏng vấn tâm lý học sinh ${stInfo.fullName || ""} từ phiếu ${ver.templateCode || ""}`;

    try {
      const res = await fetch("/api/pvdh/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REQUEST_PSYCH_INTERVIEW",
          studentId: stInfo.id,
          recordId: rec?.id,
          expectedLockVersion: rec?.lockVersion,
          selectedPsychTeacherId: selectedPsychTeacherId || null,
          referralNote: effectiveNote,
          payload: buildCurrentPayload({
            psychInterviewRequested: true,
            psychReferralNote: effectiveNote,
            psychAssignedTeacherId: selectedPsychTeacherId || undefined,
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSaveBanner({
          type: "err",
          text: data.error || "Không thể gửi đề nghị phỏng vấn tâm lý.",
        });
        return;
      }

      hydrateFromWorkspace(data);
      const dispatch = data.emailDispatch;
      if (dispatch?.sent) {
        setSaveBanner({
          type: "ok",
          text: `Đã đánh dấu Đề nghị phỏng vấn tâm lý và gửi Email thông báo thành công đến Giáo vụ ${
            psychCtx?.campusCode || "cơ sở"
          } & GV Tâm lý (${dispatch.recipients.join(", ")}).`,
        });
      } else {
        setSaveBanner({
          type: "warn",
          text: `Đã lưu Đề nghị phỏng vấn tâm lý trên hồ sơ${
            dispatch?.error ? `, nhưng gửi Email gặp sự cố: ${dispatch.error}` : "."
          }`,
        });
      }
      onSuccess?.();
    } catch (err: any) {
      setSaveBanner({
        type: "err",
        text: err?.message || "Lỗi kết nối khi gửi Email đề nghị phỏng vấn tâm lý.",
      });
    } finally {
      setSavingMode("NONE");
    }
  };

  const handleCancelPsychRequest = () => {
    if (!canEditOri) return;
    markDirty();
    setTeacherSummary((prev) => ({
      ...prev,
      psychInterviewRequested: false,
    }));
  };

  const studentGroupFields = fields
    .filter((f) => f.sectionCode === "II_STUDENT")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const parentGroupFields = fields
    .filter((f) => f.sectionCode === "IV_PARENT")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const parentGradeCFields = fields
    .filter((f) => f.sectionCode === "C_PARENT_GRADE")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const secByCode = new Map(sections.map((s) => [s.sectionCode, s]));
  const gradeClean = normalizeK12GradeNumber(stInfo.grade) || "1";
  const displayTemplateCode = ver.templateCode || `BM.KTĐBCL.${30 + (Number(gradeClean) || 1)}`;

  const markDirty = () => {
    setHasUnsavedChanges(true);
    if (saveBanner?.type === "ok") setSaveBanner(null);
  };

  // Tính tiến độ hoàn thành trực quan theo từng phần (giúp GV theo dõi cực nhanh khi phỏng vấn)
  const isEntryFilled = (entry?: PvdhInterviewItemValue) => {
    if (!entry) return false;
    if (entry.notRecorded) return Boolean(entry.notRecordedReason?.trim());
    return Boolean(entry.responseText?.trim());
  };

  const generalTotal = 3;
  const generalDone =
    (interviewDate.trim() ? 1 : 0) +
    (parentFullName.trim() ? 1 : 0) +
    (parentRelationship.trim() ? 1 : 0);

  const secATotal = studentGroupFields.length || 6;
  const secADone = studentGroupFields.filter((f) => isEntryFilled(studentResponses[f.fieldKey])).length;

  const secBTotal = parentGroupFields.length || 5;
  const secBDone = parentGroupFields.filter((f) => isEntryFilled(parentResponses[f.fieldKey])).length;

  const secCTotal = parentGradeCFields.length || 5;
  const secCDone = parentGradeCFields.filter((f) => isEntryFilled(parentResponses[f.fieldKey])).length;

  const secDTotal = 5; // D01..D04 + sheetStatus
  const secDDone =
    (teacherSummary.d01.trim() ? 1 : 0) +
    (teacherSummary.d02.trim() ? 1 : 0) +
    (teacherSummary.d03.trim() ? 1 : 0) +
    (teacherSummary.d04.trim() ? 1 : 0) +
    (teacherSummary.sheetStatus ? 1 : 0);

  const totalTrackable = isBmLayout
    ? generalTotal + secATotal + secBTotal + secCTotal + secDTotal
    : generalTotal + secATotal + secBTotal + 4;
  const totalCompleted = isBmLayout
    ? generalDone + secADone + secBDone + secCDone + secDDone
    : generalDone +
      secADone +
      secBDone +
      (obsStrengthsInterests.trim() ? 1 : 0) +
      (obsCommunicationStyle.trim() ? 1 : 0) +
      (planStrengthsPriority.trim() ? 1 : 0) +
      (planGoalsActionsText.trim() ? 1 : 0);
  const progressPercent = totalTrackable > 0 ? Math.min(100, Math.round((totalCompleted / totalTrackable) * 100)) : 0;

  // Rà soát trực tiếp điều kiện hoàn thành các mục đánh giá trước khi cho bấm "Hoàn tất phiếu" / "Gửi kiểm tra"
  const effectiveCompletionScope: PvdhValidationScope =
    canEditStu && canEditPar
      ? "FULL"
      : canEditStu
      ? "STUDENT_PART"
      : canEditPar
      ? "PARENT_PART"
      : "ORIENTATION_PART";

  const liveValidationInput = {
    interviewDate,
    parentFullName,
    parentRelationship,
    parentContactChannel,
    studentResponses,
    obsStrengthsInterests,
    obsCommunicationStyle,
    obsParticipationLevel,
    obsSupportNeeds,
    parentResponses,
    teacherSummary,
    planStrengthsPriority,
    planGoalsActionsText,
    followUpActions,
    planCoordinator,
    planReviewDate,
    planFurtherTopics,
    planFurtherOtherText,
    planReferralReason,
    planReferralReceiver,
    planHandoverNotes,
  };

  const liveCompletionCheck =
    fields.length > 0
      ? validatePvdhRecordData({
          input: liveValidationInput,
          fields,
          mode: "COMPLETE",
          scope: effectiveCompletionScope,
        })
      : { valid: false, issues: [] };

  const liveFullCheck =
    effectiveCompletionScope === "FULL"
      ? liveCompletionCheck
      : fields.length > 0
      ? validatePvdhRecordData({
          input: liveValidationInput,
          fields,
          mode: "COMPLETE",
          scope: "FULL",
        })
      : { valid: false, issues: [] };

  const missingCompleteCount = liveCompletionCheck.issues.length;
  const isReadyToComplete = fields.length > 0 && liveCompletionCheck.valid;
  const isFullReadyToSubmit = fields.length > 0 && liveFullCheck.valid;

  const handleReviewMissingItems = () => {
    const issues = liveCompletionCheck.issues;
    setValidationIssues(issues);
    if (issues.length > 0) {
      const first = issues[0];
      setSaveBanner({
        type: "warn",
        text: `Còn ${issues.length} mục đánh giá bắt buộc chưa hoàn thành. Vui lòng rà soát và bổ sung đầy đủ trước khi hoàn tất phiếu.`,
      });
      jumpToField(first.sectionCode, first.fieldKey);
    }
  };

  const handleWorkflowCall = async (
    action: "SUBMIT_REVIEW" | "RETURN_SUPPLEMENT" | "VERIFY_LOCK" | "REOPEN" | "CREATE_NEW_ATTEMPT" | "HANDOVER_TO_GVCN",
    extra?: { reasonOrNote?: string; includeSensitiveNotes?: boolean }
  ) => {
    if (!rec?.id) return;
    setSavingMode("WORKFLOW");
    setSaveBanner(null);
    try {
      if (hasUnsavedChanges && !isLocked && (action === "SUBMIT_REVIEW" || action === "VERIFY_LOCK")) {
        await fetch("/api/pvdh/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "SAVE_DRAFT",
            studentId: stInfo.id,
            recordId: rec.id,
            expectedLockVersion: rec.lockVersion,
            payload: buildCurrentPayload(),
          }),
        });
      }

      const res = await fetch("/api/pvdh/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          recordId: rec.id,
          reasonOrNote: extra?.reasonOrNote,
          includeSensitiveNotes: extra?.includeSensitiveNotes,
          useSignatureProfile: useSignatureOnConfirm,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.code === "VALIDATION_FAILED" && Array.isArray(data.details?.issues)) {
          setValidationIssues(data.details.issues);
          const first = data.details.issues[0];
          if (first) jumpToField(first.sectionCode, first.fieldKey);
        }
        setSaveBanner({ type: "err", text: data.error || "Không thể thực hiện thao tác." });
        return;
      }

      setWorkflowPrompt(null);
      if (action === "HANDOVER_TO_GVCN") {
        await loadWorkspace(rec.attemptNumber);
        setSaveBanner({
          type: "ok",
          text: `Đã bàn giao phiếu định hướng đã xác nhận cho GVCN lớp ${data.handover?.targetClassName || ""}.`,
        });
      } else {
        hydrateFromWorkspace(data);
        setSaveBanner({
          type: "ok",
          text:
            action === "VERIFY_LOCK"
              ? "Đã xác nhận và khóa phiếu định hướng thành công."
              : action === "REOPEN"
                ? "Đã mở lại phiếu và vô hiệu hóa xác nhận cũ. Vui lòng cập nhật và xác nhận lại."
                : action === "RETURN_SUPPLEMENT"
                  ? "Đã trả lại phiếu yêu cầu bổ sung."
                  : action === "CREATE_NEW_ATTEMPT"
                    ? "Đã tạo lần khảo sát định hướng mới."
                    : "Đã gửi phiếu kiểm tra/xét duyệt.",
        });
      }
      onSuccess?.();
    } catch (err: any) {
      setSaveBanner({ type: "err", text: err?.message || "Lỗi kết nối máy chủ." });
    } finally {
      setSavingMode("NONE");
    }
  };

  const handleSwitchTemplate = async (reason: string) => {
    if (!rec?.id) return;
    setSavingMode("WORKFLOW");
    try {
      const res = await fetch("/api/pvdh/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SWITCH_TEMPLATE",
          recordId: rec.id,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSaveBanner({ type: "err", text: data.error || "Không thể chuyển mẫu." });
        return;
      }
      setWorkflowPrompt(null);
      hydrateFromWorkspace(data);
      setSaveBanner({
        type: "ok",
        text: `Đã chuyển mẫu sang ${data.version?.templateCode || ""} có kiểm tra mapping và lưu lịch sử.`,
      });
    } finally {
      setSavingMode("NONE");
    }
  };

  const handleCloseWithCheck = () => {
    if (hasUnsavedChanges && !isLocked) {
      const ok = window.confirm("Bạn đang có nội dung thay đổi chưa được lưu. Bạn có chắc muốn đóng cửa sổ này?");
      if (!ok) return;
    }
    onClose();
  };

  const handleDownloadPdf = async () => {
    if (!stInfo?.id || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const att = rec?.attemptNumber ? `&attemptNumber=${rec.attemptNumber}` : "";
      const url = `/api/pvdh/pdf?studentId=${encodeURIComponent(stInfo.id)}${att}&format=pdf&disposition=attachment`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        let errMsg = `Không thể xuất file PDF (HTTP ${res.status}).`;
        try {
          const data = await res.json();
          if (data?.error) errMsg = data.error;
        } catch {
          // ignore
        }
        toast.error(errMsg);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const fnMatch = cd.match(/filename="([^"]+)"/i);
      const fileName = fnMatch?.[1] || `PVDH_${stInfo.studentCode || stInfo.id}.pdf`;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi kết nối khi xuất file PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleOpenPrintWindow = () => {
    if (!stInfo?.id) return;
    const att = rec?.attemptNumber ? `&attemptNumber=${rec.attemptNumber}` : "";
    window.open(
      `/api/pvdh/pdf?studentId=${encodeURIComponent(stInfo.id)}${att}&format=html&disposition=inline`,
      "_blank"
    );
  };

  const updateInterviewEntry = (
    target: "STUDENT" | "PARENT",
    fieldKey: string,
    patch: Partial<PvdhInterviewItemValue>
  ) => {
    markDirty();
    const setter = target === "STUDENT" ? setStudentResponses : setParentResponses;
    setter((prev) => {
      const cur = prev[fieldKey] || { responseText: "", notRecorded: false, notRecordedReason: "" };
      const next = { ...cur, ...patch };
      if (patch.notRecorded === true) {
        next.responseText = "";
      }
      if (patch.notRecorded === false) {
        next.notRecordedReason = "";
      }
      return { ...prev, [fieldKey]: next };
    });
  };

  const toggleFurtherTopic = (code: FurtherInquiryTopicCode) => {
    if (!canEditOri) return;
    markDirty();
    setPlanFurtherTopics((prev) => {
      const exists = prev.includes(code);
      const rawNext = exists ? prev.filter((c) => c !== code) : [...prev, code];
      return normalizeFurtherTopics(rawNext, exists ? undefined : code);
    });
  };

  const addActionRow = () => {
    if (!canEditOri) return;
    markDirty();
    setFollowUpActions((prev) => [
      ...prev,
      {
        id: `act_${Date.now()}`,
        actionContent: "",
        owner: "",
        dueDate: "",
        progressIndicator: "",
      },
    ]);
  };

  const syncActionsIntoGoalText = () => {
    const formatted = formatFollowUpActionsToText(followUpActions);
    if (!formatted) return;
    markDirty();
    setPlanGoalsActionsText((prev) => (prev.trim() ? `${prev.trim()}\n${formatted}` : formatted));
  };

  const renderCountBadge = (done: number, total: number, active = false) => {
    const isComplete = total > 0 && done >= total;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums border ${
          active
            ? isComplete
              ? "bg-emerald-400/20 text-emerald-100 border-emerald-300/30"
              : "bg-white/15 text-teal-100 border-white/15"
            : isComplete
              ? "bg-emerald-50 text-[#059669] border-emerald-200"
              : done > 0
                ? "bg-[#F0FDFA] text-[#00736E] border-[#CCFBF1]"
                : "bg-slate-100 text-slate-500 border-slate-200"
        }`}
      >
        {isComplete && <Check className="w-3 h-3 stroke-[2.5]" />}
        <span>
          {done}/{total}
        </span>
      </span>
    );
  };

  const wfMeta =
    PVDH_WORKFLOW_STATUS_LABELS[(rec?.workflowStatus as PvdhWorkflowStatus) || "DRAFT"] ||
    PVDH_WORKFLOW_STATUS_LABELS.DRAFT;

  const navItems: Array<{
    key: NavTabKey;
    shortTitle: string;
    title: string;
    subtitle: string;
    done?: number;
    total?: number;
    icon: any;
  }> = isBmLayout
    ? [
        {
          key: "FULL_FORM",
          shortTitle: "Toàn bộ phiếu",
          title: `Toàn bộ phiếu (${displayTemplateCode})`,
          subtitle: "Nhập liền mạch A → D",
          done: totalCompleted,
          total: totalTrackable,
          icon: FileText,
        },
        {
          key: "I_GENERAL",
          shortTitle: "Thông tin chung",
          title: "Thông tin chung",
          subtitle: "HS, PHHS & ngày phỏng vấn",
          done: generalDone,
          total: generalTotal,
          icon: FileText,
        },
        {
          key: "II_STUDENT",
          shortTitle: "Mục A (HS)",
          title: "A. Phỏng vấn học sinh",
          subtitle: "A01 – A06",
          done: secADone,
          total: secATotal,
          icon: UserCheck,
        },
        {
          key: "IV_PARENT",
          shortTitle: "Mục B (PH)",
          title: "B. Trao đổi phụ huynh",
          subtitle: "B01 – B05",
          done: secBDone,
          total: secBTotal,
          icon: Users,
        },
        {
          key: "C_PARENT_GRADE",
          shortTitle: `Mục C (Khối ${gradeClean})`,
          title: `C. Phân hóa khối ${gradeClean}`,
          subtitle: "C01 – C05 (Phụ huynh)",
          done: secCDone,
          total: secCTotal,
          icon: ClipboardList,
        },
        {
          key: "D_TEACHER_SUMMARY",
          shortTitle: "Mục D (GV)",
          title: "D. Tổng hợp & định hướng GV",
          subtitle: "D01 – D04 & Tâm lý",
          done: secDDone,
          total: secDTotal,
          icon: Compass,
        },
        {
          key: "PREVIEW",
          shortTitle: "Xem bản in A4",
          title: "Xem trước bản in A4",
          subtitle: displayTemplateCode,
          icon: Eye,
        },
      ]
    : [
        {
          key: "I_GENERAL",
          shortTitle: "I. Thông tin",
          title: "I. Thông tin chung",
          subtitle: "Hồ sơ HS, PHHS & phân công",
          done: generalDone,
          total: generalTotal,
          icon: FileText,
        },
        {
          key: "II_STUDENT",
          shortTitle: "II. Học sinh",
          title: "II. Học sinh (6 nhóm)",
          subtitle: "Trao đổi định hướng HS",
          done: secADone,
          total: secATotal,
          icon: UserCheck,
        },
        {
          key: "III_TEACHER",
          shortTitle: "III. Giáo viên",
          title: "III. Ghi nhận của GV",
          subtitle: "4 nội dung quan sát mô tả",
          icon: ClipboardList,
        },
        {
          key: "IV_PARENT",
          shortTitle: "IV. PHHS",
          title: "IV. PHHS (5 nhóm)",
          subtitle: "Góc nhìn từ gia đình",
          done: secBDone,
          total: secBTotal,
          icon: Users,
        },
        {
          key: "V_ORIENTATION",
          shortTitle: "V. Định hướng",
          title: "V. Định hướng & hỗ trợ",
          subtitle: "Thống nhất & bàn giao GVCN",
          icon: Compass,
        },
        {
          key: "PREVIEW",
          shortTitle: "Xem bản in A4",
          title: "Xem trước phiếu & LS",
          subtitle: "Bản in A4 & lịch sử duyệt",
          icon: Eye,
        },
      ];

  const singleSectionOrder: NavTabKey[] = isBmLayout
    ? ["I_GENERAL", "II_STUDENT", "IV_PARENT", "C_PARENT_GRADE", "D_TEACHER_SUMMARY", "PREVIEW"]
    : ["I_GENERAL", "II_STUDENT", "III_TEACHER", "IV_PARENT", "V_ORIENTATION", "PREVIEW"];
  const curOrderIdx = singleSectionOrder.indexOf(activeNav);
  const prevSectionKey = curOrderIdx > 0 ? singleSectionOrder[curOrderIdx - 1] : null;
  const nextSectionKey =
    curOrderIdx >= 0 && curOrderIdx < singleSectionOrder.length - 1 ? singleSectionOrder[curOrderIdx + 1] : null;

  const hasSpecificInquiry = planFurtherTopics.some((t) => t !== "KHONG");
  const requiresReviewDate =
    hasSpecificInquiry ||
    Boolean(planCoordinator.trim()) ||
    followUpActions.some((a) => Boolean(a.actionContent.trim()));

  // Renderer dùng chung cho các bảng sổ cái câu hỏi A, B, C để giao diện gọn, sắc nét, không lặp thẻ rời rạc
  const renderLedgerQuestionRow = (params: {
    field: PvdhFieldConfig;
    target: "STUDENT" | "PARENT";
    canEdit: boolean;
    placeholder: string;
  }) => {
    const { field, target, canEdit, placeholder } = params;
    const mapSource = target === "STUDENT" ? studentResponses : parentResponses;
    const entry = mapSource[field.fieldKey] || {
      responseText: "",
      notRecorded: false,
      notRecordedReason: "",
    };
    const filled = isEntryFilled(entry);
    const hasIssue = validationIssues.some((i) => i.fieldKey === field.fieldKey);
    const emphasis = field.visibilityCondition?.gradeEmphasisNote?.[gradeClean];
    const codeBadge = String(field.fieldKey || "").toUpperCase();
    // Tách mã đầu dòng (VD: "A01. Con thích..." -> "Con thích...") để không hiển thị lặp mã A01 hai lần
    const cleanLabel = String(field.label || "").replace(/^[A-D]0\d\.\s*/i, "");

    return (
      <div
        key={field.fieldKey}
        id={`pvdh-field-${field.fieldKey}`}
        className={`p-3.5 sm:px-5 sm:py-4 transition-colors focus-within:bg-[#F0FDFA]/40 ${
          hasIssue ? "bg-rose-50/40" : "bg-white"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-2.5 sm:gap-3.5">
          {/* Cột mã mục định danh bên trái */}
          <div className="flex items-center justify-between sm:block shrink-0 sm:pt-0.5">
            <span
              className={`inline-flex items-center justify-center gap-1 min-w-[54px] px-2 py-1 rounded-lg text-[11px] font-bold tabular-nums border ${
                hasIssue
                  ? "bg-rose-100 text-[#E11D48] border-rose-300"
                  : filled
                    ? entry.notRecorded
                      ? "bg-amber-50 text-[#D97706] border-amber-200"
                      : "bg-emerald-50 text-[#059669] border-emerald-200"
                    : "bg-[#F8FAFC] text-[#003B3A] border-[#CBD5E1]"
              }`}
            >
              {filled && !entry.notRecorded && <Check className="w-3 h-3 stroke-[2.5]" />}
              <span>{codeBadge}</span>
            </span>

            {/* Toggle Chưa ghi nhận trên mobile */}
            <button
              type="button"
              disabled={!canEdit}
              onClick={() =>
                updateInterviewEntry(target, field.fieldKey, {
                  notRecorded: !entry.notRecorded,
                })
              }
              className={`sm:hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer disabled:opacity-50 ${
                entry.notRecorded
                  ? "bg-amber-50 text-[#D97706] border-amber-300"
                  : "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0]"
              }`}
            >
              <span>{entry.notRecorded ? "☑ Chưa ghi nhận" : "☐ Chưa ghi nhận"}</span>
            </button>
          </div>

          {/* Cột câu hỏi + vùng nhập tự giãn chiều cao */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <label className="block text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
                  {cleanLabel} <span className="text-[#E11D48]">*</span>
                </label>
                {field.promptQuestion && (
                  <p className="text-xs text-slate-600 leading-relaxed">{field.promptQuestion}</p>
                )}
                {emphasis && (
                  <p className="text-[11px] text-[#00736E] font-medium">{emphasis}</p>
                )}
              </div>

              {/* Toggle Chưa ghi nhận trên desktop/tablet */}
              <button
                type="button"
                disabled={!canEdit}
                onClick={() =>
                  updateInterviewEntry(target, field.fieldKey, {
                    notRecorded: !entry.notRecorded,
                  })
                }
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border shrink-0 transition-colors cursor-pointer disabled:opacity-50 ${
                  entry.notRecorded
                    ? "bg-amber-50 text-[#D97706] border-amber-300"
                    : "bg-[#F8FAFC] hover:bg-slate-100 text-slate-600 border-[#E2E8F0]"
                }`}
              >
                <span>{entry.notRecorded ? "☑ Chưa ghi nhận" : "☐ Chưa ghi nhận"}</span>
              </button>
            </div>

            {entry.notRecorded ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-[11px] font-semibold text-[#D97706] shrink-0">Lý do chưa ghi nhận *:</span>
                <input
                  type="text"
                  value={entry.notRecordedReason}
                  disabled={!canEdit}
                  onChange={(e) =>
                    updateInterviewEntry(target, field.fieldKey, {
                      notRecordedReason: e.target.value,
                    })
                  }
                  placeholder="Ví dụ: Học sinh rụt rè chưa trả lời / Phụ huynh hẹn bổ sung sau..."
                  className="flex-1 rounded-xl border border-amber-300 bg-amber-50/40 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#D97706]"
                />
              </div>
            ) : (
              <AutoGrowTextarea
                minRows={2}
                value={entry.responseText}
                disabled={!canEdit}
                onChange={(e) =>
                  updateInterviewEntry(target, field.fieldKey, {
                    responseText: e.target.value,
                  })
                }
                placeholder={placeholder}
                className={`w-full rounded-xl border bg-[#F8FAFC]/60 focus:bg-white px-3.5 py-2 text-xs sm:text-[13px] leading-relaxed text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00A19A]/15 ${
                  hasIssue ? "border-rose-400" : "border-[#E2E8F0] focus:border-[#00A19A]"
                }`}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  const scrollToPsychCard = () => {
    if (activeNav !== "FULL_FORM" && activeNav !== "D_TEACHER_SUMMARY") {
      setActiveNav("D_TEACHER_SUMMARY");
    }
    setTimeout(() => {
      const el = document.getElementById("pvdh-psych-referral-card");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const giaovuList: Array<{ name: string; email: string }> = psychCtx?.giaovuRecipients || [];
  const psychCandidates: Array<{
    userId?: string;
    name: string;
    email: string;
    roleLabel: string;
    isPeriodAssigned?: boolean;
  }> = psychCtx?.psychTeacherCandidates || [];

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-0 sm:p-3 lg:p-4">
      <div className="bg-[#F8FAFC] w-full max-w-[1380px] h-[100dvh] sm:h-[94vh] rounded-none sm:rounded-2xl border-0 sm:border border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden">
        {/* 1. COMPACT AUTHORITATIVE MASTHEAD (Sky-Line Academic Ledger) */}
        <header className="bg-white border-b border-[#E2E8F0] border-l-4 border-l-[#003B3A] px-3.5 sm:px-5 py-2.5 sm:py-3 shrink-0">
          <div className="flex items-start sm:items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap tabular-nums">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#003B3A] text-[#5EEAD4] text-[11px] font-bold">
                  {displayTemplateCode} • {ver.versionCode || "v1.0"}
                </span>
                <span className="text-sm sm:text-base font-bold text-[#003B3A] truncate">
                  {stInfo.fullName || "Học sinh"}
                </span>
                <span className="font-mono text-xs font-semibold text-[#00736E] bg-[#F0FDFA] px-2 py-0.5 rounded-md border border-[#CCFBF1]">
                  {stInfo.studentCode || "—"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    isLocked
                      ? "bg-emerald-50 text-[#059669] border-emerald-200"
                      : rec?.workflowStatus === "RETURNED"
                        ? "bg-rose-50 text-[#E11D48] border-rose-200"
                        : "bg-amber-50 text-[#D97706] border-amber-200"
                  }`}
                >
                  {isLocked ? <Lock className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  <span>{wfMeta.shortLabel || wfMeta.label}</span>
                </span>
                {teacherSummary.psychInterviewRequested && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-[#D97706] border border-amber-300 text-[11px] font-semibold">
                    <Brain className="w-3 h-3" />
                    <span>
                      {teacherSummary.psychEmailSentAt ? "Đã gửi Email PV tâm lý" : "Đề nghị PV tâm lý"}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap text-[11px] sm:text-xs text-slate-600 tabular-nums">
                <span>
                  Khối dự kiến: <strong className="text-[#003B3A]">Khối {gradeClean}</strong>
                </span>
                <span>
                  Hệ/CT: <strong className="text-slate-900">{stInfo.surveySystem || "—"}</strong>
                </span>
                <span>
                  Cơ sở: <strong className="text-slate-900">{stInfo.registeredCampus || "—"}</strong>
                </span>
                {stInfo.periodName && (
                  <span className="hidden md:inline">
                    Đợt KS: <strong className="text-slate-900">{stInfo.periodName}</strong>
                  </span>
                )}
                {workspace?.attempts?.length > 1 && (
                  <select
                    value={rec?.attemptNumber || 1}
                    onChange={(e) => loadWorkspace(Number(e.target.value))}
                    className="text-[11px] font-semibold border border-[#E2E8F0] rounded-lg px-2 py-0.5 bg-white text-slate-700 tabular-nums"
                  >
                    {workspace.attempts.map((a: any) => (
                      <option key={a.id} value={a.attemptNumber}>
                        Lần #{a.attemptNumber} ({a.templateCode})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenPrintWindow}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-700 text-xs font-semibold cursor-pointer"
                title="Mở bản in A4"
              >
                <Printer className="w-3.5 h-3.5 text-[#00736E]" />
                <span className="hidden sm:inline">Bản in A4</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#CCFBF1] bg-[#F0FDFA] hover:bg-[#CCFBF1]/70 text-[#003B3A] text-xs font-semibold cursor-pointer disabled:opacity-60"
                title="Tải file PDF"
              >
                {downloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00736E]" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-[#00736E]" />
                )}
                <span className="hidden sm:inline">{downloadingPdf ? "Đang xuất..." : "Tải PDF"}</span>
              </button>
              <button
                type="button"
                onClick={handleCloseWithCheck}
                className="p-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-100 text-slate-500 cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {workspace?.gradeChangeWarning && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{workspace.gradeChangeWarning.message}</span>
              </div>
              {(rights.canReviewLock || rights.canHandover) && !isLocked && (
                <button
                  type="button"
                  onClick={() =>
                    setWorkflowPrompt({
                      mode: "SWITCH_TEMPLATE",
                      reason: `Chuyển sang ${workspace.gradeChangeWarning.recommendedTemplateCode} theo khối dự kiến mới`,
                      includeSensitive: false,
                    })
                  }
                  className="px-3 py-1 rounded-lg bg-[#003B3A] text-white font-semibold whitespace-nowrap cursor-pointer"
                >
                  Chuyển mẫu có kiểm tra mapping
                </button>
              )}
            </div>
          )}

          {rec?.workflowStatus === "RETURNED" && rec?.returnReason && (
            <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Yêu cầu bổ sung ({rec.returnedByName || "Hội đồng"}):</strong> {rec.returnReason}
              </div>
            </div>
          )}
        </header>

        {/* 2. MOBILE / TABLET STICKY COMPACT NAVIGATION BAR (< lg) */}
        {!loading && !loadError && (
          <div className="lg:hidden bg-white border-b border-[#E2E8F0] px-3 py-2 shrink-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
              <span className="font-semibold text-slate-600">
                Tiến độ nhập phiếu: <strong className="text-[#003B3A]">{totalCompleted}/{totalTrackable}</strong> mục ({progressPercent}%)
              </span>
              {isBmLayout && (
                <button
                  type="button"
                  onClick={scrollToPsychCard}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-[#D97706] border border-amber-200 font-semibold cursor-pointer"
                >
                  <Brain className="w-3 h-3" />
                  <span>Đề nghị PV tâm lý</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {navItems.map((item) => {
                const active = activeNav === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveNav(item.key);
                      formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors cursor-pointer ${
                      active
                        ? "bg-[#003B3A] text-white border-[#003B3A]"
                        : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0]"
                    }`}
                  >
                    <span>{item.shortTitle}</span>
                    {item.total !== undefined && item.key !== "FULL_FORM" && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded tabular-nums ${
                          active ? "bg-white/20 text-white" : "bg-white text-slate-600 border border-slate-200"
                        }`}
                      >
                        {item.done}/{item.total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. WORKSPACE BODY */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-7 h-7 animate-spin text-[#00A19A]" />
            <span className="text-xs font-semibold">Đang tải biểu mẫu định hướng theo khối...</span>
          </div>
        ) : loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-rose-600" />
            <p className="text-sm font-bold text-slate-800">{loadError}</p>
            <button
              type="button"
              onClick={() => loadWorkspace()}
              className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* DESKTOP SLIM LEFT RAIL (lg:flex) */}
            <aside className="hidden lg:flex lg:w-64 bg-white border-r border-[#E2E8F0] p-3 flex-col justify-between overflow-y-auto shrink-0">
              <div className="space-y-3">
                {/* Progress Meter */}
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 tabular-nums">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Tiến độ hoàn thiện</span>
                    <strong className="text-[#003B3A]">
                      {totalCompleted}/{totalTrackable} ({progressPercent}%)
                    </strong>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#00A19A] transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Mẹo: Nhấn <kbd className="px-1 py-0.2 bg-white border border-slate-300 rounded text-[10px] font-semibold">Ctrl+S</kbd> để lưu nháp nhanh
                  </div>
                </div>

                {/* Section Navigation */}
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = activeNav === item.key;
                    const sectionIssueCount = validationIssues.filter((i) => i.sectionCode === item.key).length;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setActiveNav(item.key);
                          formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          active
                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                            : "bg-white hover:bg-[#F8FAFC] text-slate-700 border-transparent hover:border-[#E2E8F0]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${active ? "text-[#5EEAD4]" : "text-[#00736E]"}`}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">{item.title}</div>
                            <div className={`text-[11px] truncate ${active ? "text-teal-100/85" : "text-slate-500"}`}>
                              {item.subtitle}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {sectionIssueCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold tabular-nums">
                              !{sectionIssueCount}
                            </span>
                          )}
                          {item.total !== undefined &&
                            item.key !== "FULL_FORM" &&
                            renderCountBadge(item.done || 0, item.total, active)}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Jump to Psychology Interview Referral */}
                {isBmLayout && (
                  <div className="pt-2 border-t border-[#F1F5F9]">
                    <button
                      type="button"
                      onClick={scrollToPsychCard}
                      className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer flex items-start gap-2.5 ${
                        teacherSummary.psychInterviewRequested
                          ? "bg-amber-50 border-amber-300 text-amber-950"
                          : "bg-[#F8FAFC] hover:bg-amber-50/50 border-[#E2E8F0] text-slate-800"
                      }`}
                    >
                      <Brain className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold">Đề nghị phỏng vấn tâm lý</div>
                        <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {teacherSummary.psychEmailSentAt
                            ? "Đã gửi Email cho Giáo vụ & GV tâm lý"
                            : "Gửi Email điều phối Giáo vụ CS & GV tâm lý"}
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Validation Issues List */}
                {validationIssues.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5">
                    <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Cần bổ sung ({validationIssues.length} mục)</span>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {validationIssues.map((iss, idx) => (
                        <button
                          key={`${iss.fieldKey}_${idx}`}
                          type="button"
                          onClick={() => jumpToField(iss.sectionCode, iss.fieldKey)}
                          className="w-full text-left text-[11px] text-rose-700 hover:underline py-0.5 cursor-pointer"
                        >
                          • {iss.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* MAIN FORM CANVAS (Centered, balanced, responsive) */}
            <main ref={formScrollRef} className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5">
              <div className="max-w-5xl mx-auto space-y-5">
                {saveBanner && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
                      saveBanner.type === "ok"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : saveBanner.type === "warn"
                          ? "bg-amber-50 border-amber-200 text-amber-900"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {saveBanner.type === "ok" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-relaxed">{saveBanner.text}</span>
                    </div>
                    {saveBanner.type === "warn" && (
                      <button
                        type="button"
                        onClick={() => loadWorkspace(rec?.attemptNumber)}
                        className="px-2.5 py-1 rounded-lg bg-[#003B3A] text-white text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        Tải lại phiếu
                      </button>
                    )}
                  </div>
                )}

                {/* HỘP QUỐC HIỆU BIỂU MẪU BM.KTĐBCL.31 .. BM.KTĐBCL.42 */}
                {isBmLayout && activeNav !== "PREVIEW" && (
                  <div className="rounded-2xl border border-[#CBD5E1] bg-white overflow-hidden shadow-2xs">
                    <div className="grid grid-cols-12 divide-x divide-[#CBD5E1] text-xs">
                      <div className="col-span-3 sm:col-span-2 p-2.5 sm:p-3 flex items-center justify-center bg-[#F8FAFC]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="SKY-LINE" className="h-7 sm:h-8 w-auto object-contain" />
                      </div>
                      <div className="col-span-6 sm:col-span-8 divide-y divide-[#CBD5E1]">
                        <div className="px-3 py-2 text-center">
                          <div className="font-bold text-[#003B3A] text-xs sm:text-sm leading-snug">
                            PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH VÀ TRAO ĐỔI VỚI PHỤ HUYNH
                          </div>
                          <div className="font-semibold text-slate-700 text-[11px] sm:text-xs">
                            (Dành cho khối {gradeClean})
                          </div>
                        </div>
                        <div className="px-3 py-1 text-center text-[11px] font-medium text-slate-600 bg-[#F8FAFC]">
                          Đơn vị sở hữu: Ban Khảo thí &amp; Đảm bảo chất lượng
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-2 p-2.5 sm:p-3 flex flex-col items-center justify-center bg-[#F8FAFC] tabular-nums">
                        <span className="font-bold text-[#003B3A] text-xs sm:text-sm">{displayTemplateCode}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 text-center">SSM Sky-Line</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ==================== MỤC I: THÔNG TIN CHUNG ==================== */}
                {(activeNav === "I_GENERAL" || (isBmLayout && activeNav === "FULL_FORM")) && (
                  <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] border-l-4 border-l-[#003B3A] flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-[#003B3A]">
                          Thông tin chung ({displayTemplateCode})
                        </h2>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {secByCode.get("I_GENERAL")?.guideline ||
                            "Hướng dẫn: Hỏi mở, tôn trọng ý kiến HS/PHHS; ghi nhận nguồn thông tin, không tự quy đổi thành điểm xét tuyển."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderCountBadge(generalDone, generalTotal)}
                        {(rights.canReviewLock || rights.canHandover) && (
                          <Link
                            href="/admin/student-info?tab=general"
                            target="_blank"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#00736E] hover:underline"
                          >
                            <span>Hồ sơ gốc</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Dải thông tin hồ sơ đồng bộ (Unified Ledger Strip) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs tabular-nums">
                        {[
                          { lbl: "Họ và tên HS", val: stInfo.fullName || "—" },
                          { lbl: "Hệ đào tạo", val: stInfo.surveySystem || "—" },
                          { lbl: "Cơ sở đăng ký", val: stInfo.registeredCampus || "—" },
                          {
                            lbl: "Năm học",
                            val:
                              stInfo.academicYearName ||
                              String(stInfo.periodName || "").match(/20\d{2}\s*[-–/]\s*20\d{2}/)?.[0] ||
                              "2026-2027",
                          },
                        ].map((item) => (
                          <div key={item.lbl} className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                            <div className="text-[11px] text-slate-500">{item.lbl}</div>
                            <div className="text-xs font-bold text-slate-900 mt-0.5 truncate" title={item.val}>
                              {item.val}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Các trường nhập nhanh của buổi phỏng vấn */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 pt-1">
                        <div id="pvdh-field-gen_interview_date" className="lg:col-span-3">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Ngày phỏng vấn <span className="text-[#E11D48]">*</span>
                          </label>
                          <input
                            type="date"
                            value={interviewDate}
                            disabled={!canEditStu && !canEditPar}
                            onChange={(e) => {
                              markDirty();
                              setInterviewDate(e.target.value);
                            }}
                            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-900 tabular-nums focus:outline-none focus:border-[#00A19A]"
                          />
                        </div>

                        <div id="pvdh-field-gen_parent_name" className="lg:col-span-4">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Phụ huynh tham gia <span className="text-[#E11D48]">*</span>
                          </label>
                          <input
                            type="text"
                            value={parentFullName}
                            disabled={!canEditPar && !canEditStu}
                            onChange={(e) => {
                              markDirty();
                              setParentFullName(e.target.value);
                            }}
                            placeholder="Nhập họ và tên phụ huynh..."
                            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#00A19A]"
                          />
                        </div>

                        <div id="pvdh-field-gen_parent_relationship" className="sm:col-span-2 lg:col-span-5">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Quan hệ với HS <span className="text-[#E11D48]">*</span>
                          </label>
                          <input
                            type="text"
                            value={parentRelationship}
                            disabled={!canEditPar && !canEditStu}
                            onChange={(e) => {
                              markDirty();
                              setParentRelationship(e.target.value);
                            }}
                            placeholder="Chọn nhanh bên dưới hoặc nhập..."
                            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#00A19A]"
                          />
                          {(canEditPar || canEditStu) && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {PARENT_RELATIONSHIP_PRESETS.map((preset) => {
                                const activePreset = parentRelationship.trim().toLowerCase() === preset.toLowerCase();
                                return (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => {
                                      markDirty();
                                      setParentRelationship(preset);
                                    }}
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                                      activePreset
                                        ? "bg-[#003B3A] text-white border-[#003B3A]"
                                        : "bg-[#F8FAFC] hover:bg-[#F0FDFA] text-slate-600 border-[#E2E8F0]"
                                    }`}
                                  >
                                    {preset}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                        <span>
                          Giáo viên thực hiện:{" "}
                          <strong className="text-[#003B3A]">
                            {rec?.studentInterviewerName || rec?.parentInterviewerName || "Theo tài khoản phân công"}
                          </strong>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Ghi nhận định tính phục vụ đồng hành, không tự quy đổi thành điểm xét tuyển
                        </span>
                      </div>
                    </div>
                  </section>
                )}

                {/* ==================== MỤC A / II: PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH ==================== */}
                {(activeNav === "II_STUDENT" || activeNav === "FULL_FORM") && (
                  <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] border-l-4 border-l-[#003B3A] flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-[#003B3A]">
                          {isBmLayout
                            ? "A. Phỏng vấn định hướng học sinh"
                            : `II. Trao đổi với học sinh (${displayTemplateCode})`}
                        </h2>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {secByCode.get("II_STUDENT")?.guideline ||
                            "Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày. Với khối nhỏ, kết hợp trò chuyện và hoạt động đơn giản."}
                        </p>
                      </div>
                      {renderCountBadge(secADone, secATotal)}
                    </div>

                    <div className="divide-y divide-[#E2E8F0]">
                      {studentGroupFields.map((f) =>
                        renderLedgerQuestionRow({
                          field: f,
                          target: "STUDENT",
                          canEdit: canEditStu,
                          placeholder: "Ghi nhận ý chính, lời chia sẻ và cách trình bày của học sinh...",
                        })
                      )}
                    </div>
                  </section>
                )}

                {/* ==================== MỤC III (BẢN GHI CŨ NẾU CÓ) ==================== */}
                {!isBmLayout && activeNav === "III_TEACHER" && (
                  <section className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 space-y-4">
                    <h2 className="text-sm font-bold text-[#003B3A]">III. Ghi nhận của người phỏng vấn</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          key: "obs_strengths_interests",
                          label: "1. Điểm mạnh và sở thích nổi bật",
                          val: obsStrengthsInterests,
                          setVal: setObsStrengthsInterests,
                        },
                        {
                          key: "obs_communication_style",
                          label: "2. Cách giao tiếp",
                          val: obsCommunicationStyle,
                          setVal: setObsCommunicationStyle,
                        },
                        {
                          key: "obs_participation_level",
                          label: "3. Mức độ tham gia",
                          val: obsParticipationLevel,
                          setVal: setObsParticipationLevel,
                        },
                        {
                          key: "obs_support_needs",
                          label: "4. Nhu cầu hỗ trợ ban đầu",
                          val: obsSupportNeeds,
                          setVal: setObsSupportNeeds,
                        },
                      ].map((item) => (
                        <div key={item.key} id={`pvdh-field-${item.key}`} className="space-y-1.5">
                          <label className="block text-xs font-bold text-[#003B3A]">{item.label} *</label>
                          <AutoGrowTextarea
                            minRows={3}
                            value={item.val}
                            disabled={!canEditStu}
                            onChange={(e) => {
                              markDirty();
                              item.setVal(e.target.value);
                            }}
                            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#00A19A]"
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* ==================== MỤC B / IV: TRAO ĐỔI ĐỊNH HƯỚNG VỚI PHỤ HUYNH ==================== */}
                {(activeNav === "IV_PARENT" || (isBmLayout && activeNav === "FULL_FORM")) && (
                  <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] border-l-4 border-l-[#003B3A] flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-[#003B3A]">
                          {isBmLayout
                            ? "B. Trao đổi định hướng với phụ huynh"
                            : `IV. Trao đổi với phụ huynh học sinh (${displayTemplateCode})`}
                        </h2>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Ghi nhận thông tin gia đình chia sẻ tách biệt với phần trả lời của học sinh và nhận định của giáo viên.
                        </p>
                      </div>
                      {renderCountBadge(secBDone, secBTotal)}
                    </div>

                    <div className="divide-y divide-[#E2E8F0]">
                      {parentGroupFields.map((f) =>
                        renderLedgerQuestionRow({
                          field: f,
                          target: "PARENT",
                          canEdit: canEditPar,
                          placeholder: "Ghi nhận chia sẻ, thói quen sinh hoạt và kỳ vọng từ phụ huynh...",
                        })
                      )}
                    </div>
                  </section>
                )}

                {/* ==================== MỤC C: CÂU HỎI PHÂN HÓA RIÊNG CHO KHỐI 1–12 ==================== */}
                {isBmLayout && (activeNav === "C_PARENT_GRADE" || activeNav === "FULL_FORM") && (
                  <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] border-l-4 border-l-[#003B3A] flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-[#003B3A]">
                          C. Câu hỏi phân hóa riêng cho khối {gradeClean} (Phụ huynh)
                        </h2>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Bộ 5 câu hỏi chuyên sâu theo đặc thù lứa tuổi khối {gradeClean} của biểu mẫu {displayTemplateCode}.
                        </p>
                      </div>
                      {renderCountBadge(secCDone, secCTotal)}
                    </div>

                    <div className="divide-y divide-[#E2E8F0]">
                      {parentGradeCFields.map((f) =>
                        renderLedgerQuestionRow({
                          field: f,
                          target: "PARENT",
                          canEdit: canEditPar,
                          placeholder: `Ghi nhận chia sẻ của phụ huynh đối với nội dung khối ${gradeClean}...`,
                        })
                      )}
                    </div>
                  </section>
                )}

                {/* ==================== MỤC D: TỔNG HỢP CỦA GIÁO VIÊN & ĐIỀU PHỐI PHỎNG VẤN TÂM LÝ ==================== */}
                {isBmLayout && (activeNav === "D_TEACHER_SUMMARY" || activeNav === "FULL_FORM") && (
                  <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] border-l-4 border-l-[#003B3A] flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-[#003B3A]">
                          D. Tổng hợp và định hướng của giáo viên
                        </h2>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Tổng hợp từ 3 nguồn (Học sinh • Phụ huynh • Quan sát trực tiếp), xác nhận trạng thái phiếu và điều phối phỏng vấn tâm lý khi cần.
                        </p>
                      </div>
                      {renderCountBadge(secDDone, secDTotal)}
                    </div>

                    <div className="p-4 sm:p-5 space-y-5">
                      {/* Lưới 2 cột trên màn hình lớn giúp tổng hợp D01–D04 trực quan trong 1 tầm mắt */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(
                          [
                            {
                              key: "d01" as const,
                              code: "D01",
                              label: "Điểm mạnh nổi bật của HS (nguồn HS / PHHS / quan sát)",
                              ph: "Tổng hợp sở thích, năng lực nổi bật và biểu hiện tích cực của học sinh...",
                            },
                            {
                              key: "d02" as const,
                              code: "D02",
                              label: "Khó khăn, nhu cầu hỗ trợ và nội dung cần xác minh",
                              ph: "Ghi rõ các điểm cần lưu ý hỗ trợ hoặc cần bộ phận chuyên môn/tâm lý xác minh thêm...",
                            },
                            {
                              key: "d03" as const,
                              code: "D03",
                              label: "Kỳ vọng của HS và gia đình (tương đồng / khác biệt)",
                              ph: "Đối chiếu mức độ tương đồng hoặc khác biệt giữa mong muốn của HS và kỳ vọng PHHS...",
                            },
                            {
                              key: "d04" as const,
                              code: "D04",
                              label: "Định hướng giáo dục, phối hợp và bước tiếp theo",
                              ph: "Đề xuất phương hướng đồng hành cùng HS, phối hợp PHHS và bàn giao cho GVCN...",
                            },
                          ] as const
                        ).map((item) => {
                          const hasIssue = validationIssues.some((i) => i.fieldKey === item.key);
                          const filled = Boolean(teacherSummary[item.key]?.trim());
                          return (
                            <div
                              key={item.key}
                              id={`pvdh-field-${item.key}`}
                              className={`rounded-xl border p-3.5 space-y-2 transition-colors focus-within:bg-[#F0FDFA]/35 ${
                                hasIssue ? "border-rose-400 bg-rose-50/30" : "border-[#E2E8F0] bg-[#F8FAFC]/50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums border ${
                                    filled
                                      ? "bg-emerald-50 text-[#059669] border-emerald-200"
                                      : "bg-white text-[#003B3A] border-[#CBD5E1]"
                                  }`}
                                >
                                  {filled && <Check className="w-3 h-3 stroke-[2.5]" />}
                                  <span>{item.code}</span>
                                </span>
                                <label className="text-xs font-bold text-slate-900 leading-snug">
                                  {item.label} <span className="text-[#E11D48]">*</span>
                                </label>
                              </div>
                              <AutoGrowTextarea
                                minRows={3}
                                value={teacherSummary[item.key]}
                                disabled={!canEditOri}
                                onChange={(e) => {
                                  markDirty();
                                  setTeacherSummary((prev) => ({
                                    ...prev,
                                    [item.key]: e.target.value,
                                  }));
                                }}
                                placeholder={item.ph}
                                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs sm:text-[13px] leading-relaxed text-slate-900 focus:outline-none focus:border-[#00A19A]"
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Trạng thái phiếu (3 lựa chọn chuẩn BM.KTĐBCL) */}
                      <div
                        id="pvdh-field-sheet_status"
                        className={`rounded-xl border p-4 space-y-2.5 ${
                          validationIssues.some((i) => i.fieldKey === "sheet_status")
                            ? "border-rose-400 bg-rose-50/40"
                            : "border-[#E2E8F0] bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <label className="text-xs sm:text-sm font-bold text-[#003B3A]">
                            Trạng thái phiếu <span className="text-[#E11D48]">*</span>
                          </label>
                          <span className="text-[11px] text-slate-500">
                            Chữ ký cuối phiếu: <strong className="text-slate-700">Giáo viên thực hiện (Kí và ghi rõ họ tên)</strong>
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {BM_SHEET_STATUS_OPTIONS.map((opt) => {
                            const checked = teacherSummary.sheetStatus === opt.code;
                            return (
                              <button
                                key={opt.code}
                                type="button"
                                disabled={!canEditOri}
                                onClick={() => {
                                  markDirty();
                                  setTeacherSummary((prev) => ({
                                    ...prev,
                                    sheetStatus: opt.code as BmSheetStatusCode,
                                  }));
                                }}
                                className={`px-3.5 py-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 ${
                                  checked
                                    ? opt.code === "HOAN_THANH"
                                      ? "bg-[#003B3A] text-white border-[#003B3A] shadow-xs"
                                      : opt.code === "CAN_BO_SUNG_THONG_TIN"
                                        ? "bg-[#D97706] text-white border-[#D97706] shadow-xs"
                                        : "bg-[#E11D48] text-white border-[#E11D48] shadow-xs"
                                    : "bg-white hover:bg-[#F0FDFA]/50 text-slate-700 border-[#E2E8F0]"
                                }`}
                              >
                                <span className="text-sm leading-none">{checked ? "☑" : "☐"}</span>
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* KHỐI ĐIỀU PHỐI ĐỀ NGHỊ PHỎNG VẤN TÂM LÝ & GỬI EMAIL TỰ ĐỘNG */}
                      <div
                        id="pvdh-psych-referral-card"
                        className={`rounded-2xl border p-4 sm:p-5 space-y-3.5 transition-colors ${
                          teacherSummary.psychInterviewRequested
                            ? "bg-amber-50/70 border-amber-300"
                            : "bg-white border-[#E2E8F0]"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                teacherSummary.psychInterviewRequested
                                  ? "bg-amber-100 text-[#D97706] border-amber-300"
                                  : "bg-[#F0FDFA] text-[#00736E] border-[#CCFBF1]"
                              }`}
                            >
                              <Brain className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xs sm:text-sm font-bold text-[#003B3A]">
                                  Đề nghị phỏng vấn (tâm lí)
                                </h3>
                                {teacherSummary.psychEmailSentAt ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-[#059669] border border-emerald-200 text-[11px] font-semibold tabular-nums">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>
                                      Đã gửi Email lúc{" "}
                                      {new Date(teacherSummary.psychEmailSentAt).toLocaleString("vi-VN")}
                                    </span>
                                  </span>
                                ) : teacherSummary.psychInterviewRequested ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-semibold">
                                    Đã đánh dấu trên phiếu
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">
                                Khi bấm nút <strong>Đề nghị phỏng vấn tâm lý</strong>, hệ thống tự động tích chọn trên phiếu in, đồng bộ danh sách khảo sát môn Tâm lý và gửi Email thông báo trực tiếp cho{" "}
                                <strong>Giáo vụ phụ trách {psychCtx?.campusCode || "cơ sở"}</strong> cùng{" "}
                                <strong>Giáo viên Tâm lý phân công</strong>.
                              </p>
                            </div>
                          </div>

                          {/* Nút chính bấm 1 chạm gửi đề nghị + Email ngay */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={!canEditOri || savingMode !== "NONE"}
                              onClick={handleRequestPsychInterview}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              {savingMode === "PSYCH_EMAIL" ? (
                                <Loader2 className="w-4 h-4 animate-spin text-[#5EEAD4]" />
                              ) : (
                                <Mail className="w-4 h-4 text-[#5EEAD4]" />
                              )}
                              <span>
                                {savingMode === "PSYCH_EMAIL"
                                  ? "Đang gửi Email..."
                                  : teacherSummary.psychEmailSentAt
                                    ? "Gửi cập nhật lại Email tâm lý"
                                    : "Đề nghị phỏng vấn tâm lý"}
                              </span>
                            </button>

                            {teacherSummary.psychInterviewRequested && canEditOri && (
                              <button
                                type="button"
                                onClick={handleCancelPsychRequest}
                                className="px-2.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer"
                                title="Bỏ đánh dấu đề nghị phỏng vấn tâm lý trên phiếu"
                              >
                                Bỏ chọn
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Thông tin người nhận Email minh bạch: Giáo vụ cơ sở + GV Tâm lý phân công */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-200/80 text-xs">
                          <div className="md:col-span-5 p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500 block">
                              1. Giáo vụ phụ trách cơ sở nhận Email ({psychCtx?.campusCode || "CS"})
                            </span>
                            {giaovuList.length > 0 ? (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {giaovuList.map((gv) => (
                                  <span
                                    key={gv.email}
                                    className="px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] font-medium text-slate-700"
                                  >
                                    {gv.email}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">
                                Tự động xác định theo cơ sở đăng ký của học sinh
                              </span>
                            )}
                          </div>

                          <div className="md:col-span-7 p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-1.5">
                            <label className="text-[11px] font-semibold text-slate-500 block">
                              2. Giáo viên Tâm lý phân công nhận Email &amp; nhiệm vụ khảo sát
                            </label>
                            {psychCandidates.length > 0 ? (
                              <select
                                value={selectedPsychTeacherId}
                                disabled={!canEditOri}
                                onChange={(e) => {
                                  markDirty();
                                  setSelectedPsychTeacherId(e.target.value);
                                }}
                                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-semibold text-[#003B3A] focus:outline-none focus:border-[#00A19A]"
                              >
                                {psychCandidates.map((pt, idx) => (
                                  <option key={pt.userId || `${pt.email}_${idx}`} value={pt.userId || ""}>
                                    {pt.name} ({pt.roleLabel}){pt.email ? ` — ${pt.email}` : ""}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="text-[11px] text-slate-600">
                                Hệ thống tự động gửi đến GV Tâm lý được phân công trong đợt khảo sát &amp; Tổ Tâm lý học đường.
                              </div>
                            )}
                          </div>

                          <div className="md:col-span-12">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Ghi chú / dấu hiệu cần trao đổi riêng với Giáo vụ &amp; GV Tâm lý (Nếu để trống sẽ tự lấy nội dung mục D02)
                            </label>
                            <input
                              type="text"
                              value={psychReferralNote}
                              disabled={!canEditOri}
                              onChange={(e) => {
                                markDirty();
                                setPsychReferralNote(e.target.value);
                              }}
                              placeholder={
                                teacherSummary.d02.trim()
                                  ? `Mặc định theo D02: ${teacherSummary.d02.trim().slice(0, 95)}...`
                                  : "Nhập ngắn gọn biểu hiện hoặc nội dung cần GV Tâm lý trao đổi thêm với học sinh / phụ huynh..."
                              }
                              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#00A19A]"
                            />
                          </div>
                        </div>

                        {Array.isArray(teacherSummary.psychEmailRecipients) &&
                          teacherSummary.psychEmailRecipients.length > 0 && (
                            <div className="text-[11px] text-[#059669] font-medium flex items-center gap-1.5 flex-wrap">
                              <Mail className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                Đã chuyển tới hộp thư: <strong>{teacherSummary.psychEmailRecipients.join(", ")}</strong>
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  </section>
                )}

                {/* ==================== MỤC V (CHỈ BẢN GHI LỊCH SỬ NẾU CÓ) ==================== */}
                {!isBmLayout && activeNav === "V_ORIENTATION" && (
                  <section className="space-y-4">
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3">
                      <h2 className="text-sm font-bold text-[#003B3A]">V. Thống nhất định hướng và hỗ trợ</h2>
                      <div id="pvdh-field-plan_strengths_priority" className="space-y-1">
                        <label className="block text-xs font-bold text-[#003B3A]">
                          1. Điểm mạnh và nhu cầu ưu tiên của học sinh *
                        </label>
                        <AutoGrowTextarea
                          minRows={2}
                          value={planStrengthsPriority}
                          disabled={!canEditOri}
                          onChange={(e) => {
                            markDirty();
                            setPlanStrengthsPriority(e.target.value);
                          }}
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-900"
                        />
                      </div>

                      <div id="pvdh-field-plan_goals_actions" className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <label className="block text-xs font-bold text-[#003B3A]">
                            2. Mục tiêu ban đầu và hành động thống nhất với HS, PHHS *
                          </label>
                          {canEditOri && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={addActionRow}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#CCFBF1] bg-[#F0FDFA] text-[#00736E] text-[11px] font-semibold cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Thêm hành động</span>
                              </button>
                              {followUpActions.length > 0 && (
                                <button
                                  type="button"
                                  onClick={syncActionsIntoGoalText}
                                  className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-slate-700 text-[11px] font-semibold cursor-pointer"
                                >
                                  Đồng bộ vào ô mục 2
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <AutoGrowTextarea
                          minRows={2}
                          value={planGoalsActionsText}
                          disabled={!canEditOri}
                          onChange={(e) => {
                            markDirty();
                            setPlanGoalsActionsText(e.target.value);
                          }}
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-900"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div id="pvdh-field-plan_coordinator">
                          <label className="block text-xs font-bold text-[#003B3A] mb-1">
                            3. Người / bộ phận phối hợp
                          </label>
                          <input
                            type="text"
                            value={planCoordinator}
                            disabled={!canEditOri}
                            onChange={(e) => {
                              markDirty();
                              setPlanCoordinator(e.target.value);
                            }}
                            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-900"
                          />
                        </div>
                        <div id="pvdh-field-plan_review_date">
                          <label className="block text-xs font-bold text-[#003B3A] mb-1">
                            Mốc trao đổi lại {requiresReviewDate ? "*" : ""}
                          </label>
                          <input
                            type="date"
                            value={planReviewDate}
                            disabled={!canEditOri}
                            onChange={(e) => {
                              markDirty();
                              setPlanReviewDate(e.target.value);
                            }}
                            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-900 tabular-nums"
                          />
                        </div>
                      </div>

                      <div id="pvdh-field-plan_further_topics" className="space-y-2">
                        <label className="block text-xs font-bold text-[#003B3A]">
                          4. Nội dung cần tìm hiểu thêm *
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {FURTHER_INQUIRY_OPTIONS.map((opt) => {
                            const checked = planFurtherTopics.includes(opt.code);
                            return (
                              <button
                                key={opt.code}
                                type="button"
                                disabled={!canEditOri}
                                onClick={() => toggleFurtherTopic(opt.code)}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                                  checked
                                    ? "bg-[#003B3A] text-white border-[#003B3A]"
                                    : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0]"
                                }`}
                              >
                                {checked ? "☑ " : "☐ "}
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div id="pvdh-field-plan_handover_notes">
                        <label className="block text-xs font-bold text-[#003B3A] mb-1">
                          5. Nội dung bàn giao cho GVCN khi nhập học *
                        </label>
                        <AutoGrowTextarea
                          minRows={2}
                          value={planHandoverNotes}
                          disabled={!canEditOri}
                          onChange={(e) => {
                            markDirty();
                            setPlanHandoverNotes(e.target.value);
                          }}
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                    </div>
                  </section>
                )}

                {/* ==================== XEM TRƯỚC PHIẾU A4 & LỊCH SỬ / BÀN GIAO ==================== */}
                {activeNav === "PREVIEW" && (
                  <section className="space-y-4">
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-bold text-[#003B3A]">
                          Xem trước Phiếu định hướng A4 ({displayTemplateCode} • {ver.versionCode || "v1.0"})
                        </h2>
                        <p className="text-xs text-slate-500">
                          Hiển thị đúng bố cục bản in A4 chuẩn {displayTemplateCode} (Thông tin chung, Mục A, Mục B, Mục C, Mục D, Trạng thái phiếu &amp; Giáo viên thực hiện).
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={loadHtmlPreview}
                          className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Làm mới bản xem trước
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          disabled={downloadingPdf}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                        >
                          {downloadingPdf ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>{downloadingPdf ? "Đang xuất PDF..." : "Tải PDF"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden min-h-[520px]">
                      {loadingPreview ? (
                        <div className="h-96 flex items-center justify-center text-xs text-slate-500 gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-[#00A19A]" />
                          <span>Đang dựng bản xem trước A4...</span>
                        </div>
                      ) : previewError ? (
                        <div className="p-8 text-center space-y-3">
                          <div className="text-xs font-semibold text-rose-700">{previewError}</div>
                          <button
                            type="button"
                            onClick={loadHtmlPreview}
                            className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                          >
                            Thử tải lại bản xem trước
                          </button>
                        </div>
                      ) : previewHtml ? (
                        <iframe
                          title="Xem trước phiếu PVDH"
                          srcDoc={previewHtml}
                          className="w-full h-[640px] border-0 bg-white"
                        />
                      ) : (
                        <div className="p-8 text-center text-xs text-slate-500">
                          Chưa có dữ liệu xem trước. Hãy lưu nháp để xem bản dựng A4.
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                            <Share2 className="w-4 h-4 text-[#00736E]" />
                            <span>Trạng thái bàn giao cho GVCN sau nhập học</span>
                          </h3>
                          {rights.canHandover && isLocked && (
                            <button
                              type="button"
                              onClick={() =>
                                setWorkflowPrompt({
                                  mode: "HANDOVER",
                                  reason: "",
                                  includeSensitive: false,
                                })
                              }
                              className="px-3 py-1 rounded-lg bg-[#00A19A] hover:bg-[#008B85] text-white text-xs font-semibold cursor-pointer"
                            >
                              Bàn giao cho GVCN
                            </button>
                          )}
                        </div>
                        {workspace?.handovers?.length > 0 ? (
                          <div className="space-y-2 text-xs tabular-nums">
                            {workspace.handovers.map((h: any) => (
                              <div
                                key={h.id}
                                className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1"
                              >
                                <div className="flex items-center justify-between font-bold text-slate-800">
                                  <span>
                                    Lớp: {h.targetClassName} ({h.targetGvcnName || "GVCN"})
                                  </span>
                                  <span
                                    className={
                                      h.receiveStatus === "ACKNOWLEDGED" ? "text-emerald-700" : "text-amber-700"
                                    }
                                  >
                                    {h.receiveStatus === "ACKNOWLEDGED" ? "Đã tiếp nhận" : "Chờ GVCN xác nhận"}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Người bàn giao: {h.handedOverByName} •{" "}
                                  {h.handedOverAt ? new Date(h.handedOverAt).toLocaleString("vi-VN") : ""}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Sau khi phiếu được xác nhận/khóa và học sinh đã xếp lớp nhập học, người điều phối có thể bàn giao cho GVCN đúng lớp.
                          </p>
                        )}
                      </div>

                      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3">
                        <h3 className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                          <History className="w-4 h-4 text-[#00736E]" />
                          <span>Lịch sử kiểm tra, xác nhận &amp; mở lại</span>
                        </h3>
                        {workspace?.reviewHistory?.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto text-xs tabular-nums">
                            {workspace.reviewHistory.map((ev: any) => (
                              <div
                                key={ev.id}
                                className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                              >
                                <div className="font-semibold text-slate-800">
                                  {ev.action} • {ev.actorName}
                                </div>
                                {ev.reasonOrNote && <div className="text-slate-600 mt-0.5">{ev.reasonOrNote}</div>}
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {ev.createdAt ? new Date(ev.createdAt).toLocaleString("vi-VN") : ""}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">Chưa có lịch sử xét duyệt/mở lại.</p>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {/* Thanh chuyển bước nhanh khi đang ở chế độ xem từng mục đơn lẻ */}
                {activeNav !== "FULL_FORM" && (prevSectionKey || nextSectionKey) && (
                  <div className="flex items-center justify-between gap-2 pt-1 pb-2">
                    {prevSectionKey ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveNav(prevSectionKey);
                          formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Mục trước</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setActiveNav("FULL_FORM");
                        formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-xs font-semibold text-[#00736E] hover:underline cursor-pointer"
                    >
                      Hiển thị toàn bộ phiếu liền mạch
                    </button>

                    {nextSectionKey ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveNav(nextSectionKey);
                          formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-semibold cursor-pointer"
                      >
                        <span>Mục tiếp theo</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                )}
              </div>
            </main>
          </div>
        )}

        {/* 4. STICKY FOOTER ACTION BAR (Responsive trên cả Mobile & Desktop) */}
        <footer className="bg-white border-t border-[#E2E8F0] px-3.5 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-3 text-[11px] sm:text-xs text-slate-500 tabular-nums">
            {lastSavedAt ? (
              <span>
                Lưu gần nhất: <strong className="text-slate-800">{lastSavedAt}</strong>
              </span>
            ) : (
              <span>Chưa lưu lần nào</span>
            )}
            {hasUnsavedChanges && !isLocked && (
              <span className="inline-flex items-center gap-1 text-[#D97706] font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Có thay đổi chưa lưu</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {!isLocked && (canEditStu || canEditPar || canEditOri) && (
              <>
                {!isReadyToComplete && missingCompleteCount > 0 && (
                  <button
                    type="button"
                    onClick={handleReviewMissingItems}
                    title="Bấm để rà soát và di chuyển tới mục đánh giá còn thiếu"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-[#D97706] text-xs font-semibold cursor-pointer tabular-nums"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Rà soát (còn {missingCompleteCount} mục)</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={savingMode !== "NONE"}
                  onClick={() => handleSave("DRAFT")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-800 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingMode === "DRAFT" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-[#00736E]" />
                  )}
                  <span>Lưu nháp</span>
                </button>

                <button
                  type="button"
                  disabled={savingMode !== "NONE" || !isReadyToComplete}
                  title={
                    !isReadyToComplete
                      ? `Vui lòng hoàn thành đầy đủ các mục đánh giá trước khi hoàn tất phiếu (còn thiếu ${missingCompleteCount} mục).`
                      : "Hoàn tất phiếu đánh giá"
                  }
                  onClick={() => handleSave("COMPLETE")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#008B85] hover:bg-[#00736E] text-white text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingMode === "COMPLETE" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Hoàn tất phiếu</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setActiveNav(activeNav === "PREVIEW" ? "FULL_FORM" : "PREVIEW")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#00736E]" />
              <span>{activeNav === "PREVIEW" ? "Quay lại nhập liệu" : "Xem trước"}</span>
            </button>

            {!isLocked && rec?.id && (canEditStu || canEditPar) && !rights.canReviewLock && (
              <button
                type="button"
                disabled={savingMode !== "NONE" || !isFullReadyToSubmit}
                title={
                  !isFullReadyToSubmit
                    ? `Vui lòng hoàn thành đầy đủ tất cả các mục đánh giá trước khi gửi kiểm tra (còn thiếu ${liveFullCheck.issues.length} mục).`
                    : "Gửi kiểm tra phiếu định hướng"
                }
                onClick={() => handleWorkflowCall("SUBMIT_REVIEW")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi kiểm tra</span>
              </button>
            )}

            {!isLocked && rec?.id && rights.canReviewLock && (
              <>
                <button
                  type="button"
                  disabled={savingMode !== "NONE"}
                  onClick={() => setWorkflowPrompt({ mode: "RETURN", reason: "", includeSensitive: false })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Trả lại bổ sung</span>
                </button>

                <label className="hidden xl:inline-flex items-center gap-1.5 text-[11px] text-slate-600 px-1.5 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSignatureOnConfirm}
                    onChange={(e) => setUseSignatureOnConfirm(e.target.checked)}
                    className="rounded border-slate-300 text-[#00A19A]"
                  />
                  <span>Gắn chữ ký GV</span>
                </label>

                <button
                  type="button"
                  disabled={savingMode !== "NONE"}
                  onClick={() => handleWorkflowCall("VERIFY_LOCK")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white text-xs font-bold cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  <span>Xác nhận &amp; khóa phiếu</span>
                </button>
              </>
            )}

            {isLocked && rights.canReopen && (
              <button
                type="button"
                disabled={savingMode !== "NONE"}
                onClick={() => setWorkflowPrompt({ mode: "REOPEN", reason: "", includeSensitive: false })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Mở lại phiếu</span>
              </button>
            )}
          </div>
        </footer>
      </div>

      {/* DIALOG NHẬP LÝ DO TRẢ LẠI / MỞ LẠI / CHUYỂN MẪU / BÀN GIAO GVCN */}
      {workflowPrompt && (
        <div className="fixed inset-0 z-[290] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#003B3A]">
              {workflowPrompt.mode === "RETURN"
                ? "Trả lại phiếu yêu cầu bổ sung"
                : workflowPrompt.mode === "REOPEN"
                  ? "Mở lại phiếu đã khóa (Vô hiệu hóa xác nhận cũ)"
                  : workflowPrompt.mode === "SWITCH_TEMPLATE"
                    ? "Chuyển mẫu định hướng theo khối mới"
                    : "Bàn giao phiếu định hướng đã xác nhận cho GVCN"}
            </h3>

            {workflowPrompt.mode === "REOPEN" && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                Khi mở lại, hệ thống sẽ lưu bản chụp trước/sau vào lịch sử audit và vô hiệu hóa chữ ký/xác nhận của phiên bản cũ. Sau khi chỉnh sửa cần xác nhận lại.
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {workflowPrompt.mode === "HANDOVER" ? "Ghi chú bàn giao cho GVCN" : "Lý do thực hiện *"}
              </label>
              <textarea
                rows={3}
                value={workflowPrompt.reason}
                onChange={(e) =>
                  setWorkflowPrompt((prev) => (prev ? { ...prev, reason: e.target.value } : null))
                }
                placeholder="Nhập rõ lý do hoặc ghi chú..."
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-900"
              />
            </div>

            {workflowPrompt.mode === "HANDOVER" && (
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={workflowPrompt.includeSensitive}
                  onChange={(e) =>
                    setWorkflowPrompt((prev) =>
                      prev ? { ...prev, includeSensitive: e.target.checked } : null
                    )
                  }
                  className="rounded border-slate-300 text-[#00A19A]"
                />
                <span>Cho phép GVCN xem kèm mục ghi chú nội bộ nhạy cảm</span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWorkflowPrompt(null)}
                className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={
                  savingMode !== "NONE" ||
                  (workflowPrompt.mode !== "HANDOVER" && !workflowPrompt.reason.trim())
                }
                onClick={() => {
                  if (workflowPrompt.mode === "SWITCH_TEMPLATE") {
                    handleSwitchTemplate(workflowPrompt.reason.trim());
                  } else if (workflowPrompt.mode === "RETURN") {
                    handleWorkflowCall("RETURN_SUPPLEMENT", {
                      reasonOrNote: workflowPrompt.reason.trim(),
                    });
                  } else if (workflowPrompt.mode === "REOPEN") {
                    handleWorkflowCall("REOPEN", {
                      reasonOrNote: workflowPrompt.reason.trim(),
                    });
                  } else {
                    handleWorkflowCall("HANDOVER_TO_GVCN", {
                      reasonOrNote: workflowPrompt.reason.trim(),
                      includeSensitiveNotes: workflowPrompt.includeSensitive,
                    });
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Xác nhận thực hiện
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
