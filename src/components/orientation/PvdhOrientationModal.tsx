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
} from "lucide-react";
import {
  FURTHER_INQUIRY_OPTIONS,
  FurtherInquiryTopicCode,
  PVDH_WORKFLOW_STATUS_LABELS,
  PvdhFieldConfig,
  PvdhFollowUpActionItem,
  PvdhInterviewItemValue,
  PvdhSectionCode,
  PvdhWorkflowStatus,
  formatFollowUpActionsToText,
  normalizeK12GradeNumber,
} from "@/lib/pvdh/constants";
import { normalizeFurtherTopics } from "@/lib/pvdh/validation";

export interface PvdhOrientationModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  initialSection?: PvdhSectionCode | "PREVIEW";
  onSuccess?: () => void;
}

type NavTabKey = PvdhSectionCode | "PREVIEW";

export function PvdhOrientationModal({
  isOpen,
  onClose,
  student,
  initialSection = "II_STUDENT",
  onSuccess,
}: PvdhOrientationModalProps) {
  const [loading, setLoading] = useState(false);
  const [savingMode, setSavingMode] = useState<"NONE" | "DRAFT" | "COMPLETE" | "WORKFLOW">("NONE");
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

  // Form states (Sections I–V, strictly separated!)
  const [interviewDate, setInterviewDate] = useState("");
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

  const formScrollRef = useRef<HTMLDivElement>(null);

  const hydrateFromWorkspace = useCallback((ws: any) => {
    setWorkspace(ws);
    const rec = ws?.record;
    if (!rec) return;

    setInterviewDate(rec.interviewDate || new Date().toISOString().split("T")[0]);
    setStudentInterviewerTitle(rec.studentInterviewerTitle || "Giáo viên phỏng vấn");
    setParentFullName(rec.parentFullName || "");
    setParentRelationship(rec.parentRelationship || "");
    setParentContactChannel(rec.parentContactChannel || "");
    setParentInterviewerName(rec.parentInterviewerName || "");

    setStudentResponses(rec.studentResponses || {});
    setObsStrengthsInterests(rec.obsStrengthsInterests || "");
    setObsCommunicationStyle(rec.obsCommunicationStyle || "");
    setObsParticipationLevel(rec.obsParticipationLevel || "");
    setObsSupportNeeds(rec.obsSupportNeeds || "");

    setParentResponses(rec.parentResponses || {});

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
      setLastSavedAt(new Date(rec.updatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
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
    try {
      const att = workspace?.record?.attemptNumber ? `&attemptNumber=${workspace.record.attemptNumber}` : "";
      const res = await fetch(
        `/api/pvdh/pdf?studentId=${encodeURIComponent(workspace.student.id)}${att}&format=html&disposition=inline`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const html = await res.text();
        setPreviewHtml(html);
      }
    } catch {
      // ignore preview error
    } finally {
      setLoadingPreview(false);
    }
  }, [workspace?.student?.id, workspace?.record?.attemptNumber]);

  useEffect(() => {
    if (activeNav === "PREVIEW" && isOpen) {
      loadHtmlPreview();
    }
  }, [activeNav, isOpen, loadHtmlPreview]);

  if (!isOpen) return null;

  const rights = workspace?.accessRights || {};
  const rec = workspace?.record;
  const stInfo = workspace?.student || student || {};
  const ver = workspace?.version || {};
  const fields: PvdhFieldConfig[] = Array.isArray(ver.fields) ? ver.fields : [];
  const isLocked = Boolean(rec?.isLocked);
  const canEditStu = Boolean(rights.canEditStudentPart && !isLocked);
  const canEditPar = Boolean(rights.canEditParentPart && !isLocked);
  const canEditOri = Boolean(rights.canEditOrientationPart && !isLocked);

  const studentGroupFields = fields
    .filter((f) => f.sectionCode === "II_STUDENT")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const parentGroupFields = fields
    .filter((f) => f.sectionCode === "IV_PARENT")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const gradeClean = normalizeK12GradeNumber(stInfo.grade);

  const markDirty = () => {
    setHasUnsavedChanges(true);
    if (saveBanner?.type === "ok") setSaveBanner(null);
  };

  const jumpToField = (sectionCode: PvdhSectionCode, fieldKey: string) => {
    setActiveNav(sectionCode);
    setTimeout(() => {
      const el = document.getElementById(`pvdh-field-${fieldKey}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const inputEl = el.querySelector("textarea, input") as HTMLElement | null;
        inputEl?.focus();
      }
    }, 120);
  };

  const buildCurrentPayload = () => ({
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
  });

  const handleSave = async (mode: "DRAFT" | "COMPLETE") => {
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
      setSaveBanner({
        type: "ok",
        text:
          mode === "COMPLETE"
            ? "Đã hoàn tất phần được phân công và lưu dữ liệu thành công."
            : "Đã lưu bản nháp thành công.",
      });
      onSuccess?.();
    } catch (err: any) {
      setSaveBanner({ type: "err", text: err?.message || "Lỗi kết nối khi lưu phiếu." });
    } finally {
      setSavingMode("NONE");
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
      // Nếu có thay đổi nháp chưa lưu và phiếu chưa khóa -> lưu nháp trước khi chốt/gửi kiểm tra
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

  const handleDownloadPdf = () => {
    if (!stInfo?.id) return;
    const att = rec?.attemptNumber ? `&attemptNumber=${rec.attemptNumber}` : "";
    window.open(
      `/api/pvdh/pdf?studentId=${encodeURIComponent(stInfo.id)}${att}&format=pdf&disposition=attachment`,
      "_blank"
    );
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

  // Trạng thái từng phần (hiển thị bằng chữ + biểu tượng, không chỉ dựa vào màu!)
  const renderSectionBadge = (status?: string) => {
    const isDone = status === "COMPLETED";
    return isDone ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
        <CheckCircle2 className="w-3 h-3 shrink-0" />
        <span>Đã hoàn tất</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-semibold">
        <Clock className="w-3 h-3 shrink-0" />
        <span>Chưa hoàn tất</span>
      </span>
    );
  };

  const wfMeta =
    PVDH_WORKFLOW_STATUS_LABELS[(rec?.workflowStatus as PvdhWorkflowStatus) || "DRAFT"] ||
    PVDH_WORKFLOW_STATUS_LABELS.DRAFT;

  const navItems: Array<{
    key: NavTabKey;
    title: string;
    subtitle: string;
    status?: string;
    icon: any;
  }> = [
    {
      key: "I_GENERAL",
      title: "I. Thông tin chung",
      subtitle: "Hồ sơ HS, PHHS & phân công",
      status: interviewDate ? "COMPLETED" : "DRAFT",
      icon: FileText,
    },
    {
      key: "II_STUDENT",
      title: "II. Học sinh (6 nhóm)",
      subtitle: "Trao đổi định hướng HS",
      status: rec?.studentSectionStatus,
      icon: UserCheck,
    },
    {
      key: "III_TEACHER",
      title: "III. Ghi nhận của GV",
      subtitle: "4 nội dung quan sát mô tả",
      status: rec?.teacherSectionStatus,
      icon: ClipboardList,
    },
    {
      key: "IV_PARENT",
      title: "IV. PHHS (5 nhóm)",
      subtitle: "Góc nhìn từ gia đình",
      status: rec?.parentSectionStatus,
      icon: Users,
    },
    {
      key: "V_ORIENTATION",
      title: "V. Định hướng & hỗ trợ",
      subtitle: "Thống nhất & bàn giao GVCN",
      status: rec?.orientationSectionStatus,
      icon: Compass,
    },
    {
      key: "PREVIEW",
      title: "Xem trước phiếu & LS",
      subtitle: "Bản in A4 & lịch sử duyệt",
      status: isLocked ? "COMPLETED" : undefined,
      icon: Eye,
    },
  ];

  const hasSpecificInquiry = planFurtherTopics.some((t) => t !== "KHONG");
  const requiresReviewDate =
    hasSpecificInquiry ||
    Boolean(planCoordinator.trim()) ||
    followUpActions.some((a) => Boolean(a.actionContent.trim()));

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-900/55 backdrop-blur-[2px] p-2 sm:p-4">
      <div className="bg-[#F8FAFC] w-full max-w-[1340px] h-[94vh] rounded-2xl border border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden">
        {/* 1. MASTHEAD HỒ SƠ (Sky-Line Academic Ledger) */}
        <header className="bg-white border-b border-[#E2E8F0] border-l-4 border-l-[#003B3A] px-4 sm:px-6 py-3.5 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#003B3A] text-white text-[11px] font-semibold tabular-nums">
                  {ver.templateCode || "PVDH"} • {ver.versionCode || "v1.0"}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-[11px] font-semibold">
                  Ghi nhận định tính (Không quy đổi điểm)
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                    isLocked
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : rec?.workflowStatus === "RETURNED"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {isLocked ? <Lock className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  <span>{wfMeta.label}</span>
                </span>
                {workspace?.attempts?.length > 1 && (
                  <select
                    value={rec?.attemptNumber || 1}
                    onChange={(e) => loadWorkspace(Number(e.target.value))}
                    className="text-xs font-semibold border border-[#E2E8F0] rounded-lg px-2 py-0.5 bg-white text-slate-700 tabular-nums"
                  >
                    {workspace.attempts.map((a: any) => (
                      <option key={a.id} value={a.attemptNumber}>
                        Lần khảo sát #{a.attemptNumber} ({a.templateCode} {a.templateVersionCode})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-slate-600 tabular-nums">
                <span className="text-sm sm:text-base font-bold text-[#003B3A]">
                  {stInfo.fullName || "Học sinh"}
                </span>
                <span>
                  Mã hồ sơ: <strong className="text-slate-900">{stInfo.studentCode || "—"}</strong>
                </span>
                <span>
                  Khối dự kiến: <strong className="text-[#00736E]">{stInfo.grade || "—"}</strong>
                </span>
                <span>
                  Hệ/CT: <strong className="text-slate-900">{stInfo.surveySystem || "—"}</strong>
                </span>
                <span>
                  Cơ sở: <strong className="text-slate-900">{stInfo.registeredCampus || "—"}</strong>
                </span>
                {stInfo.periodName && (
                  <span>
                    Đợt KS: <strong className="text-slate-900">{stInfo.periodName}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenPrintWindow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#00736E]" />
                <span>Bản in A4</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CCFBF1] bg-[#F0FDFA] hover:bg-[#CCFBF1]/70 text-[#003B3A] text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#00736E]" />
                <span>Tải PDF</span>
              </button>
              <button
                type="button"
                onClick={handleCloseWithCheck}
                className="p-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-100 text-slate-500 cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cảnh báo đổi khối hoặc lý do trả lại / mở lại */}
          {workspace?.gradeChangeWarning && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
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
            <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Yêu cầu bổ sung từ người kiểm tra ({rec.returnedByName || "Hội đồng"}):</strong>{" "}
                {rec.returnReason}
              </div>
            </div>
          )}
        </header>

        {/* 2. BODY: DESKTOP LEFT RAIL + RIGHT WORKSPACE (MOBILE STACKED) */}
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
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            {/* Left Section Rail */}
            <aside className="lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-[#E2E8F0] p-2.5 sm:p-3 overflow-x-auto lg:overflow-y-auto shrink-0">
              <div className="flex lg:flex-col gap-1.5 min-w-max lg:min-w-0">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeNav === item.key;
                  const sectionIssueCount = validationIssues.filter(
                    (i) => i.sectionCode === item.key
                  ).length;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveNav(item.key)}
                      className={`text-left px-3 py-2.5 rounded-xl border transition-colors cursor-pointer flex items-start gap-2.5 ${
                        active
                          ? "bg-[#003B3A] text-white border-[#003B3A]"
                          : "bg-white hover:bg-[#F8FAFC] text-slate-700 border-[#E2E8F0]"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          active ? "text-[#5EEAD4]" : "text-[#00736E]"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{item.title}</div>
                        <div
                          className={`text-[11px] truncate ${
                            active ? "text-teal-100" : "text-slate-500"
                          }`}
                        >
                          {item.subtitle}
                        </div>
                        {item.status && (
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            {item.status === "COMPLETED" ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  active
                                    ? "bg-emerald-500/20 text-emerald-200"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Đã hoàn tất</span>
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  active
                                    ? "bg-white/15 text-slate-200"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                <span>Chưa hoàn tất</span>
                              </span>
                            )}
                            {sectionIssueCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white tabular-nums">
                                <AlertCircle className="w-2.5 h-2.5" />
                                <span>Thiếu {sectionIssueCount}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Validation issues quick jump panel */}
              {validationIssues.length > 0 && (
                <div className="hidden lg:block mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                  <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Cần bổ sung ({validationIssues.length} mục)</span>
                  </div>
                  <div className="space-y-1 max-h-44 overflow-y-auto">
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
            </aside>

            {/* Right Form Content */}
            <main ref={formScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
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
                  <div className="flex items-center gap-2">
                    {saveBanner.type === "ok" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{saveBanner.text}</span>
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

              {/* ==================== MỤC I: THÔNG TIN CHUNG ==================== */}
              {activeNav === "I_GENERAL" && (
                <div className="space-y-4 max-w-4xl">
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-[#003B3A]">
                          I. Thông tin chung của hồ sơ khảo sát
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Thông tin gốc của học sinh được đồng bộ từ hồ sơ dự tuyển và không chỉnh sửa trực tiếp tại đây.
                        </p>
                      </div>
                      {(rights.canReviewLock || rights.canHandover) && (
                        <Link
                          href="/admin/student-info?tab=general"
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#00736E] hover:underline"
                        >
                          <span>Cập nhật hồ sơ gốc</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs tabular-nums">
                      {[
                        { lbl: "Mã hồ sơ", val: stInfo.studentCode || "—" },
                        { lbl: "Họ tên học sinh", val: stInfo.fullName || "—" },
                        {
                          lbl: "Ngày sinh",
                          val: stInfo.dateOfBirth
                            ? new Date(stInfo.dateOfBirth).toLocaleDateString("vi-VN")
                            : "—",
                        },
                        {
                          lbl: "Trường/lớp đang học",
                          val: [stInfo.oldSchoolName, stInfo.className].filter(Boolean).join(" – ") || "—",
                        },
                        { lbl: "Cơ sở đăng ký", val: stInfo.registeredCampus || "—" },
                        { lbl: "Khối dự kiến", val: stInfo.grade || "—" },
                        { lbl: "Hệ/chương trình", val: stInfo.surveySystem || "—" },
                        { lbl: "Đợt khảo sát", val: stInfo.periodName || stInfo.batchName || "—" },
                        {
                          lbl: "Mẫu & phiên bản áp dụng",
                          val: `${ver.templateCode || ""} (${ver.versionCode || "v1.0"})`,
                        },
                      ].map((item) => (
                        <div
                          key={item.lbl}
                          className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                        >
                          <div className="text-[11px] text-slate-500 font-medium">{item.lbl}</div>
                          <div className="text-xs font-bold text-slate-900 mt-0.5">{item.val}</div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#F1F5F9]">
                      <div id="pvdh-field-gen_interview_date">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Ngày phỏng vấn <span className="text-rose-600">*</span>
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
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Người phỏng vấn HS
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={rec?.studentInterviewerName || "Theo tài khoản phân công"}
                          className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Chức danh người phỏng vấn
                        </label>
                        <input
                          type="text"
                          value={studentInterviewerTitle}
                          disabled={!canEditStu && !rights.canReviewLock}
                          onChange={(e) => {
                            markDirty();
                            setStudentInterviewerTitle(e.target.value);
                          }}
                          placeholder="Ví dụ: Giáo viên phỏng vấn / Tổ trưởng CM"
                          className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#00A19A]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Thông tin PHHS trao đổi */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#003B3A]">
                        Thông tin phụ huynh học sinh (PHHS) tham gia trao đổi
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Hiển thị ở đầu Phần 2 của phiếu in. Hỗ trợ lưu riêng người trao đổi PHHS nếu phân công khác với người phỏng vấn học sinh.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div id="pvdh-field-gen_parent_name">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Họ tên PHHS <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={parentFullName}
                          disabled={!canEditPar && !canEditStu}
                          onChange={(e) => {
                            markDirty();
                            setParentFullName(e.target.value);
                          }}
                          placeholder="Nhập họ tên phụ huynh..."
                          className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#00A19A]"
                        />
                      </div>
                      <div id="pvdh-field-gen_parent_relationship">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Quan hệ với học sinh <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={parentRelationship}
                          disabled={!canEditPar && !canEditStu}
                          onChange={(e) => {
                            markDirty();
                            setParentRelationship(e.target.value);
                          }}
                          placeholder="Ví dụ: Bố / Mẹ / Người giám hộ"
                          className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#00A19A]"
                        />
                      </div>
                      <div id="pvdh-field-gen_parent_contact">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Điện thoại / kênh liên hệ
                        </label>
                        <input
                          type="text"
                          value={parentContactChannel}
                          disabled={!canEditPar && !canEditStu}
                          onChange={(e) => {
                            markDirty();
                            setParentContactChannel(e.target.value);
                          }}
                          placeholder="SĐT, Email hoặc Zalo liên hệ..."
                          className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#00A19A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Người trao đổi với PHHS
                        </label>
                        <input
                          type="text"
                          value={parentInterviewerName || rec?.studentInterviewerName || ""}
                          disabled={!rights.canReviewLock && !canEditPar}
                          onChange={(e) => {
                            markDirty();
                            setParentInterviewerName(e.target.value);
                          }}
                          placeholder="Tên cán bộ/GV trao đổi PHHS"
                          className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#00A19A]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== MỤC II: TRAO ĐỔI VỚI HỌC SINH ==================== */}
              {activeNav === "II_STUDENT" && (
                <div className="space-y-4 max-w-4xl">
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-[#003B3A]">
                        II. Trao đổi với học sinh (6 nhóm nội dung theo mẫu {ver.templateCode})
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Câu hỏi gợi mở linh hoạt theo độ tuổi. Ghi ý chính và ví dụ; nếu chưa có thông tin, chọn &ldquo;Chưa ghi nhận&rdquo; kèm lý do. Không quy đổi thành điểm.
                      </p>
                    </div>
                    {renderSectionBadge(rec?.studentSectionStatus)}
                  </div>

                  {studentGroupFields.map((f) => {
                    const entry = studentResponses[f.fieldKey] || {
                      responseText: "",
                      notRecorded: false,
                      notRecordedReason: "",
                    };
                    const emphasis = f.visibilityCondition?.gradeEmphasisNote?.[gradeClean];
                    const hasIssue = validationIssues.some((i) => i.fieldKey === f.fieldKey);

                    return (
                      <div
                        key={f.fieldKey}
                        id={`pvdh-field-${f.fieldKey}`}
                        className={`bg-white rounded-2xl border p-4 sm:p-5 space-y-2.5 ${
                          hasIssue ? "border-rose-400 ring-2 ring-rose-100" : "border-[#E2E8F0]"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="text-xs sm:text-sm font-bold text-[#003B3A]">
                            {f.itemNumber}. {f.label} <span className="text-rose-600">*</span>
                          </label>
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(entry.notRecorded)}
                              disabled={!canEditStu}
                              onChange={(e) =>
                                updateInterviewEntry("STUDENT", f.fieldKey, {
                                  notRecorded: e.target.checked,
                                })
                              }
                              className="rounded border-slate-300 text-[#00A19A] focus:ring-[#00A19A]"
                            />
                            <span>Chưa ghi nhận (kèm lý do)</span>
                          </label>
                        </div>

                        {f.promptQuestion && (
                          <div className="text-xs text-slate-600 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2">
                            <span className="font-semibold text-[#00736E]">Câu hỏi gợi mở: </span>
                            {f.promptQuestion}
                          </div>
                        )}

                        {emphasis && (
                          <div className="text-xs text-[#005854] bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl px-3 py-1.5 font-medium">
                            {emphasis}
                          </div>
                        )}

                        {entry.notRecorded ? (
                          <div>
                            <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                              Lý do chưa ghi nhận ở nhóm câu hỏi này <span className="text-rose-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={entry.notRecordedReason}
                              disabled={!canEditStu}
                              onChange={(e) =>
                                updateInterviewEntry("STUDENT", f.fieldKey, {
                                  notRecordedReason: e.target.value,
                                })
                              }
                              placeholder="Ví dụ: Học sinh còn rụt rè đầu buổi, cần trao đổi bổ sung ở buổi làm quen..."
                              className="w-full rounded-xl border border-amber-300 bg-amber-50/40 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        ) : (
                          <textarea
                            rows={3}
                            value={entry.responseText}
                            disabled={!canEditStu}
                            onChange={(e) =>
                              updateInterviewEntry("STUDENT", f.fieldKey, {
                                responseText: e.target.value,
                              })
                            }
                            placeholder="Ghi nhận ý chính và ví dụ thực tế từ chia sẻ của học sinh..."
                            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-xs leading-relaxed text-slate-900 focus:outline-none focus:border-[#00A19A]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ==================== MỤC III: GHI NHẬN CỦA GIÁO VIÊN ==================== */}
              {activeNav === "III_TEACHER" && (
                <div className="space-y-4 max-w-4xl">
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-bold text-[#003B3A]">
                        III. Ghi nhận của người phỏng vấn
                      </h2>
                      {renderSectionBadge(rec?.teacherSectionStatus)}
                    </div>
                    <p className="text-xs text-slate-600">
                      Ghi nhận mô tả khách quan dựa trên thông tin thu được theo 4 khía cạnh riêng biệt; khi xuất PDF sẽ ghép đầy đủ dưới Mục III của phiếu. Không sử dụng thang chẩn đoán hay chấm tính cách.
                    </p>
                    {ver.templateCode === "PVDH-01" ? (
                      <div className="text-xs font-semibold text-[#005854] bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl px-3 py-2">
                        Lưu ý Khối 1: Nội dung này thực hiện riêng với phiếu khảo sát 16 tiêu chí (TCI); không dùng câu trả lời tại đây để thay kết quả khảo sát.
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-[#005854] bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl px-3 py-2">
                        Kết quả khảo sát môn học và Tiếng Anh vấn đáp được ghi tại biểu mẫu tương ứng; đối chiếu khi tổng hợp định hướng.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        key: "obs_strengths_interests",
                        label: "1. Điểm mạnh và sở thích nổi bật",
                        val: obsStrengthsInterests,
                        setVal: setObsStrengthsInterests,
                        ph: "Ghi nhận điểm mạnh, sở thích nổi bật quan sát được...",
                      },
                      {
                        key: "obs_communication_style",
                        label: "2. Cách giao tiếp",
                        val: obsCommunicationStyle,
                        setVal: setObsCommunicationStyle,
                        ph: "Cách diễn đạt, lắng nghe, tương tác với giáo viên...",
                      },
                      {
                        key: "obs_participation_level",
                        label: "3. Mức độ tham gia",
                        val: obsParticipationLevel,
                        setVal: setObsParticipationLevel,
                        ph: "Sự chủ động, hợp tác, mức độ tập trung trong buổi phỏng vấn...",
                      },
                      {
                        key: "obs_support_needs",
                        label: "4. Nhu cầu hỗ trợ ban đầu",
                        val: obsSupportNeeds,
                        setVal: setObsSupportNeeds,
                        ph: "Nhu cầu hỗ trợ bước đầu về nề nếp, học tập, ngôn ngữ hoặc hòa nhập...",
                      },
                    ].map((item) => {
                      const hasIssue = validationIssues.some((i) => i.fieldKey === item.key);
                      return (
                        <div
                          key={item.key}
                          id={`pvdh-field-${item.key}`}
                          className={`bg-white rounded-2xl border p-4 space-y-2 ${
                            hasIssue ? "border-rose-400 ring-2 ring-rose-100" : "border-[#E2E8F0]"
                          }`}
                        >
                          <label className="block text-xs font-bold text-[#003B3A]">
                            {item.label} <span className="text-rose-600">*</span>
                          </label>
                          <textarea
                            rows={4}
                            value={item.val}
                            disabled={!canEditStu}
                            onChange={(e) => {
                              markDirty();
                              item.setVal(e.target.value);
                            }}
                            placeholder={item.ph}
                            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 focus:outline-none focus:border-[#00A19A]"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ==================== MỤC IV: TRAO ĐỔI VỚI PHHS ==================== */}
              {activeNav === "IV_PARENT" && (
                <div className="space-y-4 max-w-4xl">
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-[#003B3A]">
                        IV. Hiểu học sinh qua góc nhìn PHHS (5 nhóm nội dung theo mẫu {ver.templateCode})
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Lưu tách biệt với câu trả lời của học sinh và nhận định của giáo viên. Nếu chưa trao đổi được mục nào, chọn &ldquo;Chưa ghi nhận&rdquo; kèm lý do.
                      </p>
                    </div>
                    {renderSectionBadge(rec?.parentSectionStatus)}
                  </div>

                  {parentGroupFields.map((f) => {
                    const entry = parentResponses[f.fieldKey] || {
                      responseText: "",
                      notRecorded: false,
                      notRecordedReason: "",
                    };
                    const emphasis = f.visibilityCondition?.gradeEmphasisNote?.[gradeClean];
                    const hasIssue = validationIssues.some((i) => i.fieldKey === f.fieldKey);

                    return (
                      <div
                        key={f.fieldKey}
                        id={`pvdh-field-${f.fieldKey}`}
                        className={`bg-white rounded-2xl border p-4 sm:p-5 space-y-2.5 ${
                          hasIssue ? "border-rose-400 ring-2 ring-rose-100" : "border-[#E2E8F0]"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="text-xs sm:text-sm font-bold text-[#003B3A]">
                              {f.itemNumber}. {f.label} <span className="text-rose-600">*</span>
                            </label>
                            {f.sensitivityTier === "SENSITIVE_HEALTH_PSYCH" && (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                Bảo mật sức khỏe / cá nhân
                              </span>
                            )}
                          </div>
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(entry.notRecorded)}
                              disabled={!canEditPar}
                              onChange={(e) =>
                                updateInterviewEntry("PARENT", f.fieldKey, {
                                  notRecorded: e.target.checked,
                                })
                              }
                              className="rounded border-slate-300 text-[#00A19A] focus:ring-[#00A19A]"
                            />
                            <span>Chưa ghi nhận (kèm lý do)</span>
                          </label>
                        </div>

                        {f.promptQuestion && (
                          <div className="text-xs text-slate-600 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2">
                            <span className="font-semibold text-[#00736E]">Câu hỏi gợi mở: </span>
                            {f.promptQuestion}
                          </div>
                        )}

                        {emphasis && (
                          <div className="text-xs text-[#005854] bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl px-3 py-1.5 font-medium">
                            {emphasis}
                          </div>
                        )}

                        {entry.notRecorded ? (
                          <div>
                            <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                              Lý do chưa ghi nhận ý kiến PHHS <span className="text-rose-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={entry.notRecordedReason}
                              disabled={!canEditPar}
                              onChange={(e) =>
                                updateInterviewEntry("PARENT", f.fieldKey, {
                                  notRecordedReason: e.target.value,
                                })
                              }
                              placeholder="Ví dụ: PHHS hẹn trao đổi bổ sung qua điện thoại..."
                              className="w-full rounded-xl border border-amber-300 bg-amber-50/40 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        ) : (
                          <textarea
                            rows={3}
                            value={entry.responseText}
                            disabled={!canEditPar}
                            onChange={(e) =>
                              updateInterviewEntry("PARENT", f.fieldKey, {
                                responseText: e.target.value,
                              })
                            }
                            placeholder="Ghi nhận thông tin và kỳ vọng do PHHS chia sẻ..."
                            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-xs leading-relaxed text-slate-900 focus:outline-none focus:border-[#00A19A]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ==================== MỤC V: THỐNG NHẤT ĐỊNH HƯỚNG & HỖ TRỢ ==================== */}
              {activeNav === "V_ORIENTATION" && (
                <div className="space-y-4 max-w-4xl">
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-[#003B3A]">
                        V. Thống nhất định hướng và hỗ trợ
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tổng hợp mục tiêu ban đầu, nội dung cần tìm hiểu thêm và thông tin bàn giao cho GVCN khi học sinh nhập học.
                      </p>
                    </div>
                    {renderSectionBadge(rec?.orientationSectionStatus)}
                  </div>

                  {/* V.1 */}
                  <div
                    id="pvdh-field-plan_strengths_priority"
                    className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-2"
                  >
                    <label className="block text-xs font-bold text-[#003B3A]">
                      1. Điểm mạnh và nhu cầu ưu tiên của học sinh <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={planStrengthsPriority}
                      disabled={!canEditOri}
                      onChange={(e) => {
                        markDirty();
                        setPlanStrengthsPriority(e.target.value);
                      }}
                      placeholder="Tổng hợp điểm mạnh cốt lõi và nhu cầu ưu tiên hỗ trợ trong giai đoạn đầu..."
                      className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#00A19A]"
                    />
                  </div>

                  {/* V.2 + Bảng hành động không bắt nhập lặp */}
                  <div
                    id="pvdh-field-plan_goals_actions"
                    className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="block text-xs font-bold text-[#003B3A]">
                        2. Mục tiêu ban đầu và hành động thống nhất với HS, PHHS{" "}
                        <span className="text-rose-600">*</span>
                      </label>
                      {canEditOri && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={addActionRow}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#CCFBF1] bg-[#F0FDFA] text-[#00736E] text-[11px] font-semibold cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Thêm hành động chi tiết</span>
                          </button>
                          {followUpActions.length > 0 && (
                            <button
                              type="button"
                              onClick={syncActionsIntoGoalText}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-slate-700 text-[11px] font-semibold cursor-pointer"
                            >
                              <span>Đồng bộ bảng vào ô mục 2</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <textarea
                      rows={3}
                      value={planGoalsActionsText}
                      disabled={!canEditOri}
                      onChange={(e) => {
                        markDirty();
                        setPlanGoalsActionsText(e.target.value);
                      }}
                      placeholder="Nhập mục tiêu ban đầu và hành động thống nhất (hoặc dùng bảng hành động bên dưới, hệ thống tự động kết xuất lên phiếu gốc mà không phải nhập lặp)..."
                      className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#00A19A]"
                    />

                    {followUpActions.length > 0 && (
                      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                              <th className="py-2.5 px-3 text-left text-white">Nội dung hành động</th>
                              <th className="py-2.5 px-3 text-left text-teal-100">Người phụ trách</th>
                              <th className="py-2.5 px-3 text-left text-teal-100">Thời hạn</th>
                              <th className="py-2.5 px-3 text-left text-teal-100">Cách nhận biết tiến bộ</th>
                              <th className="py-2.5 px-3 text-center text-white w-14">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                            {followUpActions.map((act, idx) => (
                              <tr key={act.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                                <td className="py-2.5 px-3 align-middle">
                                  <input
                                    type="text"
                                    value={act.actionContent}
                                    disabled={!canEditOri}
                                    onChange={(e) => {
                                      markDirty();
                                      setFollowUpActions((prev) =>
                                        prev.map((x, i) =>
                                          i === idx ? { ...x, actionContent: e.target.value } : x
                                        )
                                      );
                                    }}
                                    placeholder="Hành động cụ thể..."
                                    className="w-full border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs"
                                  />
                                </td>
                                <td className="py-2.5 px-3 align-middle">
                                  <input
                                    type="text"
                                    value={act.owner}
                                    disabled={!canEditOri}
                                    onChange={(e) => {
                                      markDirty();
                                      setFollowUpActions((prev) =>
                                        prev.map((x, i) =>
                                          i === idx ? { ...x, owner: e.target.value } : x
                                        )
                                      );
                                    }}
                                    placeholder="HS / PHHS / GVCN"
                                    className="w-full border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs"
                                  />
                                </td>
                                <td className="py-2.5 px-3 align-middle">
                                  <input
                                    type="date"
                                    value={act.dueDate}
                                    disabled={!canEditOri}
                                    onChange={(e) => {
                                      markDirty();
                                      setFollowUpActions((prev) =>
                                        prev.map((x, i) =>
                                          i === idx ? { ...x, dueDate: e.target.value } : x
                                        )
                                      );
                                    }}
                                    className="w-full border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs tabular-nums"
                                  />
                                </td>
                                <td className="py-2.5 px-3 align-middle">
                                  <input
                                    type="text"
                                    value={act.progressIndicator}
                                    disabled={!canEditOri}
                                    onChange={(e) => {
                                      markDirty();
                                      setFollowUpActions((prev) =>
                                        prev.map((x, i) =>
                                          i === idx ? { ...x, progressIndicator: e.target.value } : x
                                        )
                                      );
                                    }}
                                    placeholder="Minh chứng / biểu hiện tiến bộ..."
                                    className="w-full border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs"
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center align-middle">
                                  {canEditOri && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        markDirty();
                                        setFollowUpActions((prev) => prev.filter((_, i) => i !== idx));
                                      }}
                                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* V.3 */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        placeholder="Ví dụ: GVCN, Tổ Tiếng Anh, Bộ phận Tư vấn học đường..."
                        className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#00A19A]"
                      />
                    </div>
                    <div id="pvdh-field-plan_review_date">
                      <label className="block text-xs font-bold text-[#003B3A] mb-1">
                        Mốc trao đổi lại{" "}
                        {requiresReviewDate ? (
                          <span className="text-rose-600">*</span>
                        ) : (
                          <span className="text-slate-400 font-normal">(Tùy chọn khi không có hành động tiếp nối)</span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={planReviewDate}
                        disabled={!canEditOri}
                        onChange={(e) => {
                          markDirty();
                          setPlanReviewDate(e.target.value);
                        }}
                        className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-900 tabular-nums focus:outline-none focus:border-[#00A19A]"
                      />
                    </div>
                  </div>

                  {/* V.4: Loại trừ Không vs Các mục tìm hiểu thêm */}
                  <div
                    id="pvdh-field-plan_further_topics"
                    className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3"
                  >
                    <label className="block text-xs font-bold text-[#003B3A]">
                      4. Nội dung cần tìm hiểu thêm <span className="text-rose-600">*</span>
                      <span className="ml-2 text-[11px] font-normal text-slate-500">
                        (&ldquo;Không&rdquo; và các lựa chọn cần tìm hiểu thêm tự động loại trừ nhau)
                      </span>
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
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                              checked
                                ? "bg-[#003B3A] text-white border-[#003B3A]"
                                : "bg-[#F8FAFC] hover:bg-white text-slate-700 border-[#E2E8F0]"
                            }`}
                          >
                            <span className="text-sm leading-none">{checked ? "☑" : "☐"}</span>
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {planFurtherTopics.includes("KHAC") && (
                      <div id="pvdh-field-plan_further_other_text">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nội dung khác cần tìm hiểu thêm <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={planFurtherOtherText}
                          disabled={!canEditOri}
                          onChange={(e) => {
                            markDirty();
                            setPlanFurtherOtherText(e.target.value);
                          }}
                          placeholder="Nhập cụ thể nội dung khác cần tìm hiểu thêm..."
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                    )}

                    {hasSpecificInquiry && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#F1F5F9]">
                        <div id="pvdh-field-plan_referral_reason">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Lý do đề nghị tìm hiểu thêm / phối hợp <span className="text-rose-600">*</span>
                          </label>
                          <textarea
                            rows={2}
                            value={planReferralReason}
                            disabled={!canEditOri}
                            onChange={(e) => {
                              markDirty();
                              setPlanReferralReason(e.target.value);
                            }}
                            placeholder="Nêu rõ lý do đề nghị..."
                            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-900"
                          />
                        </div>
                        <div id="pvdh-field-plan_referral_receiver">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Người / bộ phận tiếp nhận <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={planReferralReceiver}
                            disabled={!canEditOri}
                            onChange={(e) => {
                              markDirty();
                              setPlanReferralReceiver(e.target.value);
                            }}
                            placeholder="Ví dụ: Bộ phận Tâm lý học đường / Tổ Chuyên môn..."
                            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-900"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* V.5: Bàn giao GVCN & Ghi chú nội bộ tách riêng */}
                  <div
                    id="pvdh-field-plan_handover_notes"
                    className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3"
                  >
                    <label className="block text-xs font-bold text-[#003B3A]">
                      5. Nội dung bàn giao cho GVCN/bộ phận liên quan khi nhập học{" "}
                      <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={planHandoverNotes}
                      disabled={!canEditOri}
                      onChange={(e) => {
                        markDirty();
                        setPlanHandoverNotes(e.target.value);
                      }}
                      placeholder="Ghi rõ các lưu ý bàn giao cho GVCN đồng hành cùng học sinh khi nhập học..."
                      className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#00A19A]"
                    />

                    {rights.canViewSensitiveHealth && (
                      <div className="pt-2 border-t border-[#F1F5F9]">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Ghi chú nội bộ nhạy cảm (Tách khỏi bản in chung; chỉ hiển thị cho người được phân quyền)
                        </label>
                        <textarea
                          rows={2}
                          value={internalSensitiveNotes}
                          disabled={!canEditOri}
                          onChange={(e) => {
                            markDirty();
                            setInternalSensitiveNotes(e.target.value);
                          }}
                          placeholder="Tùy chọn: Ghi chú nội bộ riêng cho công tác chăm sóc đặc biệt (không xuất ra bản công bố PHHS)..."
                          className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-slate-800"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ==================== XEM TRƯỚC PHIẾU A4 & LỊCH SỬ / BÀN GIAO ==================== */}
              {activeNav === "PREVIEW" && (
                <div className="space-y-5 max-w-5xl">
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-[#003B3A]">
                        Xem trước Phiếu định hướng A4 ({ver.templateCode} • {ver.versionCode})
                      </h2>
                      <p className="text-xs text-slate-500">
                        Hiển thị đúng 5 phần I–V, tự động co giãn trang theo độ dài câu trả lời. Khi chưa khóa sẽ hiển thị rõ nhãn &ldquo;Bản nháp&rdquo;.
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải PDF</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden min-h-[520px]">
                    {loadingPreview ? (
                      <div className="h-96 flex items-center justify-center text-xs text-slate-500 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#00A19A]" />
                        <span>Đang dựng bản xem trước A4...</span>
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

                  {/* Bàn giao GVCN & Lịch sử kiểm tra */}
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
                                <span>Lớp: {h.targetClassName} ({h.targetGvcnName || "GVCN"})</span>
                                <span
                                  className={
                                    h.receiveStatus === "ACKNOWLEDGED"
                                      ? "text-emerald-700"
                                      : "text-amber-700"
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
                          Chưa thực hiện bàn giao. Sau khi phiếu được xác nhận/khóa và học sinh đã xếp lớp nhập học, người điều phối có thể bàn giao cho GVCN đúng lớp.
                        </p>
                      )}
                    </div>

                    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3">
                      <h3 className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                        <History className="w-4 h-4 text-[#00736E]" />
                        <span>Lịch sử kiểm tra, xác nhận & mở lại</span>
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
                              {ev.reasonOrNote && (
                                <div className="text-slate-600 mt-0.5">{ev.reasonOrNote}</div>
                              )}
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
                </div>
              )}
            </main>
          </div>
        )}

        {/* 3. STICKY FOOTER ACTION BAR (Không che nội dung vùng nhập) */}
        <footer className="bg-white border-t border-[#E2E8F0] px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs text-slate-500 tabular-nums flex-wrap">
            {lastSavedAt && <span>Lưu gần nhất: <strong>{lastSavedAt}</strong></span>}
            {hasUnsavedChanges && !isLocked && (
              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Có thay đổi chưa lưu</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {!isLocked && (canEditStu || canEditPar || canEditOri) && (
              <>
                <button
                  type="button"
                  disabled={savingMode !== "NONE"}
                  onClick={() => handleSave("DRAFT")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-800 text-xs font-semibold cursor-pointer disabled:opacity-50"
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
                  disabled={savingMode !== "NONE"}
                  onClick={() => handleSave("COMPLETE")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00A19A] hover:bg-[#008B85] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingMode === "COMPLETE" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Hoàn tất phần được phân công</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setActiveNav("PREVIEW")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#00736E]" />
              <span>Xem trước</span>
            </button>

            {!isLocked && rec?.id && (canEditStu || canEditPar) && !rights.canReviewLock && (
              <button
                type="button"
                disabled={savingMode !== "NONE"}
                onClick={() => handleWorkflowCall("SUBMIT_REVIEW")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white text-xs font-semibold cursor-pointer"
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
                  onClick={() =>
                    setWorkflowPrompt({ mode: "RETURN", reason: "", includeSensitive: false })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Trả lại bổ sung</span>
                </button>

                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 px-2 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSignatureOnConfirm}
                    onChange={(e) => setUseSignatureOnConfirm(e.target.checked)}
                    className="rounded border-slate-300 text-[#00A19A]"
                  />
                  <span>Gắn chữ ký hồ sơ GV (nếu có)</span>
                </label>

                <button
                  type="button"
                  disabled={savingMode !== "NONE"}
                  onClick={() => handleWorkflowCall("VERIFY_LOCK")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white text-xs font-semibold cursor-pointer"
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
                onClick={() =>
                  setWorkflowPrompt({ mode: "REOPEN", reason: "", includeSensitive: false })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Mở lại phiếu (Bắt buộc lý do)</span>
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
                {workflowPrompt.mode === "HANDOVER" ? "Ghi chú bàn giao cho GVCN" : "Lý do thực hiện *"}{" "}
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
                onClick={() => {
                  if (workflowPrompt.mode === "RETURN") {
                    handleWorkflowCall("RETURN_SUPPLEMENT", { reasonOrNote: workflowPrompt.reason });
                  } else if (workflowPrompt.mode === "REOPEN") {
                    handleWorkflowCall("REOPEN", { reasonOrNote: workflowPrompt.reason });
                  } else if (workflowPrompt.mode === "SWITCH_TEMPLATE") {
                    handleSwitchTemplate(workflowPrompt.reason);
                  } else {
                    handleWorkflowCall("HANDOVER_TO_GVCN", {
                      reasonOrNote: workflowPrompt.reason,
                      includeSensitiveNotes: workflowPrompt.includeSensitive,
                    });
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer"
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
