"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  X,
  Puzzle,
  Check,
  Paperclip,
  Link2,
  AtSign,
  ArrowRight,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Users,
  MessageSquare,
  RefreshCw,
  Star,
  Sparkles,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  SLC_CONTRIBUTION_TYPES,
  SLC_FEEDBACK_STATUSES,
  SlcContributionType,
} from "@/lib/skyline-connect/constants";
import {
  ContributePieceDraftState,
  insertStarterPromptAtCursor,
  preserveDraftStateOnTypeSwitch,
} from "@/lib/skyline-connect/scoring";
import { filterAllowedMentionUsersForPost } from "@/lib/skyline-connect/permissions";

export interface ContributePieceModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: {
    id: string;
    title?: string | null;
    content?: string;
    postType?: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string | null;
    campusId?: string | null;
    campusName?: string | null;
    visibility?: string;
    groupId?: string | null;
    coverImageUrl?: string | null;
    isSeekingCollaborators?: boolean;
    helpRequests?: Array<{
      id: string;
      title: string;
      description?: string | null;
      supportType: string;
      subjectCode?: string | null;
      gradeLevel?: string | null;
      expectedTimeframe?: string | null;
      status?: string;
    }>;
    openHelpRequests?: Array<any>;
    recentContributions?: Array<{
      id: string;
      authorName: string;
      authorAvatar?: string | null;
      contributionType: string;
      content: string;
      feedbackStatus?: string;
      attachments?: Array<{
        id: string;
        fileName: string;
        fileUrl: string;
        mimeType?: string;
      }>;
    }>;
    previewComments?: Array<any>;
  };
  targetPost?: any;
  currentUserId?: string;
  currentUserName?: string;
  initialContributionType?: "METHOD" | "MATERIAL" | "EXPERIMENT" | "SKILL" | "CONNECTION";
  initialHelpRequest?: {
    id: string;
    title: string;
    supportType: string;
    subjectCode?: string | null;
    gradeLevel?: string | null;
  } | null;
  linkedHelpRequest?: any;
  onSelectHelpRequest?: (hr: any) => void;
  teachers?: Array<{
    userId: string;
    teacherName: string;
    teacherCode?: string;
    campusId?: string;
    campusName?: string;
    subjectName?: string;
  }>;
  onSubmitted?: (result: { comment: any; commentCount: number }) => void;
  onSuccess?: () => void;
}

const DRAFT_STORAGE_PREFIX = "slc_contribute_draft_v1_";

function renderPieceIllustration(type: string, isSelected: boolean) {
  switch (type) {
    case "METHOD":
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto drop-shadow-xs" aria-hidden="true">
          <circle cx="32" cy="28" r="18" fill={isSelected ? "#FDE68A" : "#FEF3C7"} />
          <path
            d="M32 12c-8.8 0-16 7.2-16 16 0 5.7 3 10.7 7.5 13.5l1.5 5.5h14l1.5-5.5C45 38.7 48 33.7 48 28c0-8.8-7.2-16-16-16z"
            fill="#F59E0B"
          />
          <path d="M26 24c0-3.3 2.7-6 6-6" stroke="#FFFBEB" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <rect x="26" y="48" width="12" height="4" rx="2" fill={isSelected ? "#E2E8F0" : "#64748B"} />
          <rect x="28" y="53" width="8" height="3" rx="1.5" fill={isSelected ? "#CBD5E1" : "#94A3B8"} />
          <path
            d="M32 4v4M12 28H8M56 28h-4M17 13l-3-3M47 13l3-3"
            stroke={isSelected ? "#FDE047" : "#D97706"}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "MATERIAL":
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto drop-shadow-xs" aria-hidden="true">
          <path d="M10 18c8-2 16 0 22 4v28c-6-4-14-6-22-4V18z" fill="#FDE68A" stroke="#D97706" strokeWidth="1.5" />
          <path d="M54 18c-8-2-16 0-22 4v28c6-4 14-6 22-4V18z" fill="#FFFBEB" stroke="#D97706" strokeWidth="1.5" />
          <path d="M15 26h11M15 32h11M15 38h8M38 26h11M38 32h11M38 38h8" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "EXPERIMENT":
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto drop-shadow-xs" aria-hidden="true">
          <path
            d="M25 12h14M28 12v12l-11 20c-1.8 3.2.5 7 4.2 7h21.6c3.7 0 6-3.8 4.2-7L36 24V12"
            fill="#E0F2FE"
            stroke="#0284C7"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M19 39h26l3.2 5.8c1.2 2.2-.4 4.7-2.9 4.7H18.7c-2.5 0-4.1-2.5-2.9-4.7L19 39z" fill="#2DD4BF" />
          <circle cx="28" cy="44" r="2" fill="#FFFFFF" />
          <circle cx="35" cy="41" r="1.5" fill="#FFFFFF" />
          <circle cx="33" cy="20" r="2" fill="#38BDF8" />
        </svg>
      );
    case "SKILL":
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto drop-shadow-xs" aria-hidden="true">
          <path
            d="M22 14l26 26-6 6-26-26 6-6z"
            fill="#F59E0B"
            stroke="#B45309"
            strokeWidth="1.5"
          />
          <path d="M14 12l8 2-6 6-2-8z" fill="#FDE68A" stroke="#B45309" strokeWidth="1.5" />
          <path
            d="M42 14a10 10 0 0 0-9 13L16 44a4 4 0 1 0 6 6l17-17a10 10 0 0 0 13-9l-6 5-5-5 5-6z"
            fill="#94A3B8"
            stroke="#475569"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "CONNECTION":
    default:
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto drop-shadow-xs" aria-hidden="true">
          <circle cx="21" cy="24" r="7" fill="#FBBF24" />
          <path d="M11 46c0-5.5 4.5-10 10-10s10 4.5 10 10" fill="#38BDF8" />
          <circle cx="43" cy="24" r="7" fill="#F472B6" />
          <path d="M33 46c0-5.5 4.5-10 10-10s10 4.5 10 10" fill="#FB7185" />
          <circle cx="32" cy="21" r="8" fill="#00A19A" />
          <path d="M20 48c0-6.6 5.4-12 12-12s12 5.4 12 12" fill="#003B3A" />
        </svg>
      );
  }
}

function SkyLineBirdMascot({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M12 36c6-12 18-18 30-14 5 1.5 9 5 11 9 3-1 6 0 7 2-2 3-5 4-8 4-2 8-10 14-20 14-9 0-16-4-20-11l-8 4 3-8h5z"
        fill="#14B8A6"
      />
      <path d="M24 34c5-6 14-8 22-4-4 7-12 10-22 4z" fill="#99F6E4" />
      <circle cx="44" cy="28" r="2.5" fill="#003B3A" />
      <circle cx="44.8" cy="27.2" r="0.9" fill="#FFFFFF" />
      <path d="M52 29l7-2-5 5z" fill="#F59E0B" />
    </svg>
  );
}

export function ContributePieceModal({
  isOpen,
  onClose,
  post: rawPost,
  targetPost,
  initialContributionType = "METHOD",
  initialHelpRequest: rawInitialHelpRequest = null,
  linkedHelpRequest = null,
  teachers = [],
  onSubmitted,
  onSuccess,
}: ContributePieceModalProps) {
  const post = rawPost || targetPost || { id: "", authorId: "", authorName: "Giáo viên Sky-Line", postType: "IDEA" };
  const initialHelpRequest = rawInitialHelpRequest || linkedHelpRequest || null;
  const storageKey = `${DRAFT_STORAGE_PREFIX}${post.id}`;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [draft, setDraft] = useState<ContributePieceDraftState>(() => ({
    postId: post.id,
    contributionType: initialContributionType,
    content: "",
    links: [],
    attachments: [],
    mentionedUserIds: [],
    followPost: true,
    helpRequestId: initialHelpRequest?.id || null,
  }));

  const [initialLoadedContent, setInitialLoadedContent] = useState("");
  const [savedDraftNotice, setSavedDraftNotice] = useState<string | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  // Sub-panels for Attachment, Link, and @Mention
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [linkTitleInput, setLinkTitleInput] = useState("");
  const [linkFieldError, setLinkFieldError] = useState<string | null>(null);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachmentFieldError, setAttachmentFieldError] = useState<string | null>(null);

  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  // Submission & Idempotency retry state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const clientRequestIdRef = useRef<string>("");

  // Load saved draft from localStorage on open
  useEffect(() => {
    if (!isOpen) return;
    setSubmitError(null);
    setAttachmentFieldError(null);
    setLinkFieldError(null);
    setShowUnsavedConfirm(false);
    setSubmitSuccess(false);

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ContributePieceDraftState;
        if (parsed && parsed.postId === post.id) {
          const nextType =
            initialHelpRequest?.supportType &&
            ["METHOD", "MATERIAL", "EXPERIMENT", "SKILL", "CONNECTION"].includes(
              initialHelpRequest.supportType
            )
              ? (initialHelpRequest.supportType as ContributePieceDraftState["contributionType"])
              : initialContributionType || parsed.contributionType || "METHOD";

          setDraft({
            postId: post.id,
            contributionType: nextType,
            content: parsed.content || "",
            links: Array.isArray(parsed.links) ? parsed.links : [],
            attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
            mentionedUserIds: Array.isArray(parsed.mentionedUserIds) ? parsed.mentionedUserIds : [],
            followPost: parsed.followPost ?? true,
            helpRequestId: initialHelpRequest?.id ?? parsed.helpRequestId ?? null,
          });
          setInitialLoadedContent(parsed.content || "");
          if (parsed.content || parsed.attachments?.length || parsed.links?.length) {
            setSavedDraftNotice("Đã khôi phục bản nháp chưa gửi của Thầy/Cô.");
          }
          return;
        }
      }
    } catch {
      // Ignore storage error
    }

    const defaultType =
      initialHelpRequest?.supportType &&
      ["METHOD", "MATERIAL", "EXPERIMENT", "SKILL", "CONNECTION"].includes(
        initialHelpRequest.supportType
      )
        ? (initialHelpRequest.supportType as ContributePieceDraftState["contributionType"])
        : initialContributionType || "METHOD";

    setDraft({
      postId: post.id,
      contributionType: defaultType,
      content: "",
      links: [],
      attachments: [],
      mentionedUserIds: [],
      followPost: true,
      helpRequestId: initialHelpRequest?.id || null,
    });
    setInitialLoadedContent("");
    setSavedDraftNotice(null);
  }, [isOpen, post.id, initialContributionType, initialHelpRequest, storageKey]);

  // Auto-persist draft in localStorage whenever user edits so upload/submit errors or accidental closes never lose data
  useEffect(() => {
    if (!isOpen) return;
    try {
      if (
        draft.content.trim() ||
        draft.attachments.length > 0 ||
        draft.links.length > 0
      ) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })
        );
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [draft, isOpen, storageKey]);

  // Reset clientRequestId only when content/type/attachments/links meaningfully change
  useEffect(() => {
    clientRequestIdRef.current = `piece_${post.id}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }, [
    post.id,
    draft.contributionType,
    draft.content,
    draft.links.length,
    draft.attachments.length,
    draft.helpRequestId,
  ]);

  const selectedTypeConfig = useMemo(
    () =>
      SLC_CONTRIBUTION_TYPES.find((t) => t.value === draft.contributionType) ||
      SLC_CONTRIBUTION_TYPES[0],
    [draft.contributionType]
  );

  // Filter mentionable colleagues by post view permission (Section 4 & 11)
  const allowedColleagues = useMemo(() => {
    const filteredByPerm = filterAllowedMentionUsersForPost(
      teachers.map((t) => ({
        ...t,
        systemRole: "TEACHER",
        campusId: t.campusId || null,
      })),
      {
        id: post.id,
        authorId: post.authorId,
        status: "PUBLISHED",
        visibility: post.visibility || "SYSTEM",
        campusId: post.campusId || null,
        groupId: post.groupId || null,
      }
    );

    const q = mentionQuery.trim().toLowerCase();
    if (!q) return filteredByPerm.slice(0, 12);
    return filteredByPerm
      .filter(
        (t) =>
          t.teacherName.toLowerCase().includes(q) ||
          (t.teacherCode && t.teacherCode.toLowerCase().includes(q)) ||
          (t.subjectName && t.subjectName.toLowerCase().includes(q))
      )
      .slice(0, 12);
  }, [teachers, post, mentionQuery]);

  const hasUnsavedContent =
    draft.content.trim().length > 0 ||
    draft.attachments.length > 0 ||
    draft.links.length > 0;

  const handleRequestClose = () => {
    if (hasUnsavedContent && draft.content !== initialLoadedContent && !submitSuccess) {
      setShowUnsavedConfirm(true);
      return;
    }
    onClose();
  };

  // Keyboard Escape handler
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleRequestClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Switch contribution type without losing content (Section 2)
  const handleSelectContributionType = (
    nextType: ContributePieceDraftState["contributionType"]
  ) => {
    setDraft((prev) => preserveDraftStateOnTypeSwitch(prev, nextType));
  };

  // Insert contextual starter prompt without overwriting existing text (Section 3)
  const handleInsertStarterPrompt = (phrase: string) => {
    const el = textareaRef.current;
    const cursor = el ? el.selectionStart : draft.content.length;
    const { text, nextCursorPosition } = insertStarterPromptAtCursor(
      draft.content,
      phrase,
      cursor
    );
    setDraft((prev) => ({ ...prev, content: text }));
    setSubmitError(null);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCursorPosition, nextCursorPosition);
      }
    }, 10);
  };

  // Handle file attachment with progress and field-level error (Section 4)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAttachmentFieldError(null);
    setUploadingFile(true);
    setUploadProgress(15);

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress((p) => (p < 80 ? p + 20 : p));
      }, 120);

      // Validate metadata on backend
      const valRes = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validateAttachment",
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
        }),
      });
      const valJson = await valRes.json();

      if (!valRes.ok || !valJson.ok) {
        clearInterval(progressTimer);
        setUploadingFile(false);
        setUploadProgress(0);
        setAttachmentFieldError(
          valJson.message || "Tệp tải lên không hợp lệ hoặc vượt quá dung lượng cho phép."
        );
        return;
      }

      // Read file as data URL (for images <= 2MB) or safe internal attachment reference
      const isImage = file.type.startsWith("image/");
      let fileUrl = `/uploads/skyline-connect/${valJson.safeFileName || encodeURIComponent(file.name)}`;

      if (isImage && file.size <= 2 * 1024 * 1024) {
        fileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || fileUrl));
          reader.onerror = () => reject(new Error("Không thể đọc tệp ảnh."));
          reader.readAsDataURL(file);
        });
      }

      clearInterval(progressTimer);
      setUploadProgress(100);

      setDraft((prev) => ({
        ...prev,
        attachments: [
          ...prev.attachments,
          {
            fileName: file.name,
            fileUrl,
            mimeType: file.type || "application/pdf",
            fileSize: file.size,
            attachmentType: isImage ? "IMAGE" : "DOCUMENT",
          },
        ],
      }));

      setTimeout(() => {
        setUploadingFile(false);
        setUploadProgress(0);
      }, 250);
    } catch (err: any) {
      setUploadingFile(false);
      setUploadProgress(0);
      setAttachmentFieldError(
        err?.message || "Lỗi khi tải tệp lên. Bản nháp của Thầy/Cô vẫn được giữ nguyên."
      );
    }
  };

  // Add external HTTPS link with field-level validation
  const handleAddLink = () => {
    setLinkFieldError(null);
    const trimmed = linkUrlInput.trim();
    if (!trimmed) {
      setLinkFieldError("Vui lòng nhập địa chỉ liên kết (bắt đầu bằng https://).");
      return;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:") {
        setLinkFieldError("Liên kết đính kèm phải sử dụng giao thức bảo mật https://.");
        return;
      }
    } catch {
      setLinkFieldError("Định dạng liên kết URL không hợp lệ (ví dụ: https://...).");
      return;
    }

    setDraft((prev) => ({
      ...prev,
      links: [
        ...prev.links,
        {
          url: trimmed,
          title: linkTitleInput.trim() || undefined,
        },
      ],
    }));
    setLinkUrlInput("");
    setLinkTitleInput("");
    setShowLinkInput(false);
  };

  // Insert @mention
  const handleSelectMentionColleague = (colleague: {
    userId: string;
    teacherName: string;
  }) => {
    const mentionTag = `@${colleague.teacherName} `;
    const el = textareaRef.current;
    const cursor = el ? el.selectionStart : draft.content.length;
    const { text, nextCursorPosition } = insertStarterPromptAtCursor(
      draft.content,
      mentionTag,
      cursor
    );
    setDraft((prev) => ({
      ...prev,
      content: text,
      mentionedUserIds: Array.from(new Set([...prev.mentionedUserIds, colleague.userId])),
    }));
    setShowMentionPicker(false);
    setMentionQuery("");

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCursorPosition, nextCursorPosition);
      }
    }, 10);
  };

  // Save draft explicitly
  const handleSaveDraftExplicit = () => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })
      );
      setInitialLoadedContent(draft.content);
      setSavedDraftNotice("Đã lưu nháp thành công trên thiết bị của Thầy/Cô.");
      setTimeout(() => setSavedDraftNotice(null), 4000);
    } catch {
      setSavedDraftNotice("Đã giữ nội dung nháp trong phiên làm việc.");
    }
  };

  // Pick a help request ("Tôi có thể giúp")
  const handleHelpWithRequest = (hr: {
    id: string;
    title: string;
    supportType: string;
  }) => {
    const matchedType = (
      ["METHOD", "MATERIAL", "EXPERIMENT", "SKILL", "CONNECTION"].includes(hr.supportType)
        ? hr.supportType
        : "EXPERIMENT"
    ) as ContributePieceDraftState["contributionType"];

    setDraft((prev) => ({
      ...preserveDraftStateOnTypeSwitch(prev, matchedType),
      helpRequestId: hr.id,
    }));

    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Submit contribution piece with retry deduplication
  const handleSubmitPiece = async () => {
    if (submitting) return;
    setSubmitError(null);
    setAttachmentFieldError(null);
    setLinkFieldError(null);

    if (
      !draft.content.trim() &&
      draft.attachments.length === 0 &&
      draft.links.length === 0
    ) {
      setSubmitError(
        "Vui lòng nhập ý kiến của Thầy/Cô hoặc đính kèm ít nhất một tài liệu / liên kết hợp lệ."
      );
      return;
    }

    setSubmitting(true);
    try {
      const requestId =
        clientRequestIdRef.current ||
        `piece_${post.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      clientRequestIdRef.current = requestId;

      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createComment",
          postId: post.id,
          content: draft.content,
          contributionType: draft.contributionType,
          links: draft.links,
          attachments: draft.attachments,
          mentionedUserIds: draft.mentionedUserIds,
          followPost: draft.followPost,
          helpRequestId: draft.helpRequestId,
          clientRequestId: requestId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.field === "link") {
          setShowLinkInput(true);
          setLinkFieldError(data.message || "Liên kết không hợp lệ.");
        } else if (data.field === "attachment") {
          setAttachmentFieldError(data.message || "Tệp đính kèm không hợp lệ.");
        } else {
          setSubmitError(
            data.message ||
              "Chưa thể gửi mảnh đóng góp lúc này. Bản nháp của Thầy/Cô đã được giữ an toàn để thử lại."
          );
        }
        setSubmitting(false);
        return;
      }

      // Clear saved draft on success
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Ignore
      }

      setSubmitSuccess(true);
      setSubmitting(false);
      onSubmitted?.({ comment: data.comment, commentCount: data.commentCount });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setSubmitting(false);
      setSubmitError(
        err?.message ||
          "Mất kết nối tạm thời khi gửi. Nội dung nháp của Thầy/Cô vẫn được giữ nguyên, vui lòng nhấn gửi lại."
      );
    }
  };

  if (!isOpen) return null;

  const openHelpRequests = (post.helpRequests || post.openHelpRequests || []).filter(
    (h: any) => !h.status || h.status === "OPEN"
  );
  const activeHelpRequest =
    openHelpRequests.find((h: any) => h.id === draft.helpRequestId) ||
    initialHelpRequest ||
    openHelpRequests[0] ||
    null;

  const recentPieces =
    post.recentContributions && post.recentContributions.length > 0
      ? post.recentContributions.slice(0, 3)
      : (post.previewComments || []).slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contribute-piece-modal-title"
    >
      <div className="relative w-full h-full sm:h-auto sm:max-h-[94vh] max-w-5xl bg-gradient-to-b from-[#F2FAF9] via-[#F8FAFC] to-[#F3F8F7] sm:rounded-2xl shadow-2xl border border-[#BCE6E1] flex flex-col overflow-hidden">
        {/* Top Header Banner */}
        <div className="relative px-4 sm:px-7 pt-5 pb-4 bg-gradient-to-r from-[#E6F6F5] via-[#F2FBF9] to-[#E9F7F6] border-b border-[#D2ECE9] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#008B85] text-white flex items-center justify-center shadow-md shrink-0">
              <Puzzle className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2
                  id="contribute-piece-modal-title"
                  className="text-xl sm:text-2xl font-bold text-[#003B3A] tracking-tight"
                >
                  Góp một mảnh sáng tạo
                </h2>
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FDF6E7] text-[#9A6715] border border-[#ECD5A6]">
                  Cùng sáng tạo Sky-Line
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Một góp ý nhỏ có thể mở ra một ý tưởng lớn.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <SkyLineBirdMascot className="hidden sm:block w-12 h-12" />
            <button
              type="button"
              onClick={handleRequestClose}
              aria-label="Đóng hộp thoại Góp một mảnh sáng tạo"
              className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-600 hover:text-[#003B3A] border border-slate-200/80 shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#00A19A]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Unsaved Changes Warning Banner */}
        {showUnsavedConfirm && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-900 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Thầy/Cô đang có nội dung chưa gửi. Thầy/Cô muốn lưu nháp hay bỏ qua?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleSaveDraftExplicit();
                  setShowUnsavedConfirm(false);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-[#003B3A] text-white text-xs font-semibold hover:bg-[#005250]"
              >
                Lưu nháp & Đóng
              </button>
              <button
                type="button"
                onClick={() => setShowUnsavedConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50"
              >
                Tiếp tục viết
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(storageKey);
                  } catch {
                    // ignore
                  }
                  setShowUnsavedConfirm(false);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg text-rose-700 hover:bg-rose-100 text-xs font-medium"
              >
                Bỏ nội dung
              </button>
            </div>
          </div>
        )}

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-7 py-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left 8 Columns: Target Post + 5 Puzzle Cards + Starter Prompts + Short Form */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-[#DCECE9] shadow-xs p-4 sm:p-5 space-y-5">
              {/* Target Post Card: "Bạn đang góp sức cho..." */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-3.5 rounded-xl bg-gradient-to-r from-[#F4FBF9] to-[#F8FAFC] border border-[#D8EDE9]">
                <div className="flex items-center gap-3.5 min-w-0">
                  {post.coverImageUrl ? (
                    <img
                      src={post.coverImageUrl}
                      alt={post.title || "Ảnh bài viết"}
                      className="w-24 h-16 sm:w-28 sm:h-18 rounded-xl object-cover border border-teal-200/80 shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-16 sm:w-28 sm:h-18 rounded-xl bg-gradient-to-br from-[#003B3A] via-[#0E7470] to-[#00A19A] text-white p-2 flex flex-col justify-center items-center text-center shrink-0 shadow-xs">
                      <Sparkles className="w-4 h-4 text-amber-300 mb-0.5" />
                      <span className="text-[10px] font-bold leading-tight line-clamp-2">
                        {post.title || "Ý tưởng sáng tạo"}
                      </span>
                    </div>
                  )}

                  <div className="min-w-0 space-y-1">
                    <div className="text-xs font-medium text-slate-500">
                      Bạn đang góp sức cho
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#003B3A] leading-snug line-clamp-1">
                      {post.title || "Chia sẻ sáng tạo cùng AI"}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-[#003B3A] text-white text-[10px] flex items-center justify-center font-bold">
                          {(post.authorName || "G").charAt(0)}
                        </span>
                        {post.authorName}
                      </span>
                      <span className="text-slate-300">|</span>
                      {post.isSeekingCollaborators || openHelpRequests.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E8F8F5] text-[#006B66] border border-[#B2E5DF]">
                          <Users className="w-3 h-3" />
                          Đang tìm cộng sự
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                          {post.postType === "AI_PRODUCT" ? "Sản phẩm AI" : "Ý tưởng dạy học"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/teacher/skyline-connect/posts/${post.id}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#00736E] hover:text-[#003B3A] bg-white px-3 py-1.5 rounded-lg border border-[#BCE6E1] hover:border-[#008B85] transition-colors shrink-0 self-start sm:self-center"
                >
                  <span>Xem bài gốc</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Linked Help Request Indicator (if responding to "Tôi có thể giúp") */}
              {draft.helpRequestId && activeHelpRequest && (
                <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[#E8F8F5] border border-[#99DCD9] text-xs text-[#003B3A]">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="w-4 h-4 text-[#008B85] shrink-0" />
                    <span className="truncate">
                      Đang phản hồi lời mời hỗ trợ:{" "}
                      <strong className="font-semibold">{activeHelpRequest.title}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, helpRequestId: null }))}
                    className="text-slate-500 hover:text-slate-800 text-[11px] underline shrink-0"
                  >
                    Bỏ gắn lời mời
                  </button>
                </div>
              )}

              {/* 5 Selectable Puzzle Piece Cards: "Bạn muốn góp điều gì?" */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-sm sm:text-base font-bold text-[#003B3A]">
                    Bạn muốn góp điều gì?
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Đổi loại mảnh ghép bất kỳ lúc nào mà không mất nội dung đang viết
                  </span>
                </div>

                <div
                  className="grid grid-cols-2 sm:grid-cols-5 gap-2.5"
                  role="radiogroup"
                  aria-label="Chọn loại mảnh đóng góp"
                >
                  {SLC_CONTRIBUTION_TYPES.map((item) => {
                    const isSelected = draft.contributionType === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() =>
                          handleSelectContributionType(
                            item.value as ContributePieceDraftState["contributionType"]
                          )
                        }
                        className={`group relative rounded-2xl p-3 text-center border transition-all duration-200 flex flex-col items-center justify-between min-h-[142px] focus:outline-none focus:ring-2 focus:ring-[#00A19A] ${
                          isSelected ? item.selectedCardClass : item.cardBgClass
                        }`}
                      >
                        {/* Checkmark indicator when selected */}
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white text-[#006B66] flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </span>
                        )}

                        {/* Subtle puzzle connector notch on right side for desktop */}
                        <span
                          aria-hidden="true"
                          className={`hidden sm:block absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-5 rounded-full border z-10 ${
                            isSelected
                              ? "bg-[#08746F] border-[#003B3A]"
                              : "bg-white/90 border-slate-200"
                          }`}
                        />

                        <div className="my-1">{renderPieceIllustration(item.value, isSelected)}</div>

                        <div className="space-y-1">
                          <div
                            className={`text-xs sm:text-sm font-bold leading-tight ${
                              isSelected ? "text-white" : "text-[#003B3A]"
                            }`}
                          >
                            {item.label}
                          </div>
                          <p
                            className={`text-[11px] leading-snug line-clamp-2 ${
                              isSelected ? "text-teal-50/95" : "text-slate-600"
                            }`}
                          >
                            {item.shortDesc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contextual Starter Prompts: "Bắt đầu từ trải nghiệm của Thầy/Cô" */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F2FBF9] border border-[#CBECE7] text-xs font-semibold text-[#005F5B]">
                  <SkyLineBirdMascot className="w-5 h-5" />
                  <span>Bắt đầu từ trải nghiệm của Thầy/Cô</span>
                </div>

                {selectedTypeConfig.starterPrompts.map((promptText) => (
                  <button
                    key={promptText}
                    type="button"
                    onClick={() => handleInsertStarterPrompt(promptText)}
                    className="px-3 py-1.5 rounded-full bg-[#E8F6F5] hover:bg-[#D5EFECE6] text-[#004D4A] border border-[#B8E2DD] text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#00A19A]"
                  >
                    {promptText}
                  </button>
                ))}
              </div>

              {/* Short Form Textarea: "Ý kiến của Thầy/Cô" */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="contribute-piece-textarea"
                    className="text-xs sm:text-sm font-semibold text-slate-700"
                  >
                    Ý kiến của Thầy/Cô
                  </label>
                  {savedDraftNotice && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {savedDraftNotice}
                    </span>
                  )}
                </div>

                <textarea
                  id="contribute-piece-textarea"
                  ref={textareaRef}
                  rows={4}
                  value={draft.content}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, content: e.target.value }));
                    setSubmitError(null);
                  }}
                  placeholder={`Chia sẻ ${selectedTypeConfig.label.toLowerCase()} của Thầy/Cô... (Chỉ cần viết ngắn gọn hoặc đính kèm tệp/liên kết)`}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#008B85] focus:outline-none focus:ring-2 focus:ring-[#00A19A]/25 leading-relaxed"
                />

                {/* Attached Files & Links Preview Pills */}
                {(draft.attachments.length > 0 || draft.links.length > 0) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {draft.attachments.map((att, idx) => (
                      <div
                        key={`${att.fileName}_${idx}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700"
                      >
                        {att.attachmentType === "IMAGE" ? (
                          <ImageIcon className="w-3.5 h-3.5 text-[#008B85]" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span className="font-medium truncate max-w-[180px]">{att.fileName}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              attachments: prev.attachments.filter((_, i) => i !== idx),
                            }))
                          }
                          aria-label={`Xóa tệp ${att.fileName}`}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {draft.links.map((lnk, idx) => (
                      <div
                        key={`${lnk.url}_${idx}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900"
                      >
                        <Link2 className="w-3.5 h-3.5 text-sky-700" />
                        <span className="font-medium truncate max-w-[200px]">
                          {lnk.title || lnk.url}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              links: prev.links.filter((_, i) => i !== idx),
                            }))
                          }
                          aria-label={`Xóa liên kết ${lnk.url}`}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Progress & Field-level Attachment Error */}
                {uploadingFile && (
                  <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#003B3A] font-medium tabular-nums">
                      <span>Đang kiểm tra và tải tệp đính kèm...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-teal-100 overflow-hidden">
                      <div
                        className="h-full bg-[#008B85] transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {attachmentFieldError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{attachmentFieldError}</span>
                  </div>
                )}

                {/* Inline Link Input Sub-panel */}
                {showLinkInput && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-xs font-semibold text-slate-700">
                      Thêm liên kết học liệu / công cụ (HTTPS)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <input
                        type="url"
                        value={linkUrlInput}
                        onChange={(e) => {
                          setLinkUrlInput(e.target.value);
                          setLinkFieldError(null);
                        }}
                        placeholder="https://..."
                        className="sm:col-span-7 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:border-[#008B85] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={linkTitleInput}
                        onChange={(e) => setLinkTitleInput(e.target.value)}
                        placeholder="Tên hiển thị (không bắt buộc)"
                        className="sm:col-span-3 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:border-[#008B85] focus:outline-none"
                      />
                      <div className="sm:col-span-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleAddLink}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#008B85] text-white text-xs font-semibold hover:bg-[#00736E]"
                        >
                          Thêm
                        </button>
                      </div>
                    </div>
                    {linkFieldError && (
                      <div
                        role="alert"
                        className="flex items-center gap-1.5 text-xs text-rose-600 font-medium"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{linkFieldError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline @Mention Colleague Picker (Filtered by Post Permission) */}
                {showMentionPicker && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700">
                        Nhắc tên đồng nghiệp có quyền xem bài đăng này
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMentionPicker(false)}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Đóng
                      </button>
                    </div>
                    <input
                      type="text"
                      value={mentionQuery}
                      onChange={(e) => setMentionQuery(e.target.value)}
                      placeholder="Tìm theo tên giáo viên, bộ môn..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:border-[#008B85] focus:outline-none"
                    />
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white rounded-lg border border-slate-200">
                      {allowedColleagues.length === 0 ? (
                        <div className="p-2.5 text-xs text-slate-500 text-center">
                          Không tìm thấy đồng nghiệp phù hợp trong phạm vi quyền xem bài.
                        </div>
                      ) : (
                        allowedColleagues.map((col) => (
                          <button
                            key={col.userId}
                            type="button"
                            onClick={() => handleSelectMentionColleague(col)}
                            className="w-full px-3 py-1.5 text-left hover:bg-teal-50/60 flex items-center justify-between text-xs"
                          >
                            <span className="font-medium text-slate-800">{col.teacherName}</span>
                            <span className="text-[11px] text-slate-500">
                              {col.subjectName || col.campusName || "Giáo viên"}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* General Submit Error */}
                {submitError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
              </div>

              {/* Action Toolbar: Attachments, Link, @Colleague | Follow Toggle, Save Draft, Submit */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.docx,.pptx,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ảnh / Tài liệu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLinkInput((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Liên kết</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMentionPicker((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-colors"
                  >
                    <AtSign className="w-3.5 h-3.5 text-slate-500" />
                    <span>Đồng nghiệp</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Toggle "Theo dõi phản hồi" */}
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={draft.followPost}
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, followPost: !prev.followPost }))
                      }
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#00A19A] ${
                        draft.followPost ? "bg-[#008B85]" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform duration-200 mt-0.5 ${
                          draft.followPost ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                    <span>Theo dõi phản hồi</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSaveDraftExplicit}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold transition-colors"
                  >
                    Lưu nháp
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitPiece}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#008B85] to-[#005F5B] hover:from-[#00736E] hover:to-[#003B3A] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang gửi...</span>
                      </>
                    ) : (
                      <>
                        <span>Gửi mảnh đóng góp</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right 4 Columns: "Ý tưởng lớn lên cùng nhau" + "Đang cần một đồng nghiệp..." */}
            <div className="lg:col-span-4 space-y-4">
              {/* Co-creation Value Card */}
              <div className="rounded-2xl bg-gradient-to-b from-[#E5F6F3] via-[#F2FAF8] to-white border border-[#C5E8E3] p-4 shadow-xs space-y-3.5">
                <div className="text-center space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-[#003B3A]">
                    Ý tưởng lớn lên cùng nhau
                  </h3>
                  <p className="text-xs text-slate-600 italic">
                    Mỗi đóng góp đều có dấu ấn riêng.
                  </p>
                </div>

                {/* Decorative Co-Creation Puzzle Graphic */}
                <div className="relative rounded-xl bg-gradient-to-br from-[#D7F2EE] to-[#FEF9E7] border border-[#BCE6E1] p-3 flex items-center justify-center gap-2">
                  <div className="w-11 h-11 rounded-xl bg-white/90 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                    <Puzzle className="w-6 h-6" />
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 shadow-xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-white/90 border border-teal-200 flex items-center justify-center text-[#008B85] shadow-2xs">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-medium text-slate-700">
                    <MessageSquare className="w-4 h-4 text-[#008B85] shrink-0" />
                    <span>Được tác giả phản hồi</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-medium text-slate-700">
                    <RefreshCw className="w-4 h-4 text-[#008B85] shrink-0" />
                    <span>Gắn với bản cập nhật</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-medium text-slate-700">
                    <Star className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Ghi nhận người đóng góp</span>
                  </div>
                </div>
              </div>

              {/* "Đang cần một đồng nghiệp..." Card */}
              <div className="rounded-2xl bg-white border border-[#DCECE9] p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E8F8F5] text-[#006B66] flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-[#003B3A]">
                    Đang cần một đồng nghiệp...
                  </h4>
                </div>

                {activeHelpRequest ? (
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/90 space-y-2.5">
                    <div className="text-xs sm:text-sm font-bold text-[#003B3A]">
                      {activeHelpRequest.title}
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E9F9F6] text-[#0D7A6F] border border-[#B3E8E1]">
                        {SLC_CONTRIBUTION_TYPES.find(
                          (t) => t.value === activeHelpRequest.supportType
                        )?.label || "Thử nghiệm"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleHelpWithRequest(activeHelpRequest)}
                        className="px-3 py-1 rounded-lg bg-white hover:bg-[#E8F8F5] text-[#005F5B] border border-[#99DCD9] text-xs font-semibold transition-colors"
                      >
                        Tôi có thể giúp
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/90 space-y-2">
                    <div className="text-xs font-semibold text-slate-700">
                      Cùng thử nghiệm hoặc bổ sung học liệu cho bài viết này
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E9F9F6] text-[#0D7A6F] border border-[#B3E8E1]">
                        Thử nghiệm
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectContributionType("EXPERIMENT");
                          textareaRef.current?.focus();
                        }}
                        className="px-3 py-1 rounded-lg bg-white hover:bg-[#E8F8F5] text-[#005F5B] border border-[#99DCD9] text-xs font-semibold transition-colors"
                      >
                        Tôi có thể giúp
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Strip: "Những mảnh ghép vừa được gửi" */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-2">
              <Puzzle className="w-4 h-4 text-[#008B85]" />
              <h4 className="text-sm font-bold text-[#003B3A]">
                Những mảnh ghép vừa được gửi
              </h4>
            </div>

            {recentPieces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {recentPieces.map((piece: any) => {
                  const typeCfg =
                    SLC_CONTRIBUTION_TYPES.find((t) => t.value === piece.contributionType) ||
                    SLC_CONTRIBUTION_TYPES[0];
                  const statusCfg = SLC_FEEDBACK_STATUSES.find(
                    (s) => s.value === piece.feedbackStatus
                  );
                  return (
                    <div
                      key={piece.id}
                      className="rounded-xl bg-white border border-slate-200/90 p-3 shadow-2xs flex flex-col justify-between gap-2"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {piece.authorName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${typeCfg.badgeClass}`}
                          >
                            {typeCfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">{piece.content}</p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        {piece.attachments?.[0] ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[11px] text-slate-700 truncate max-w-[160px]">
                            <FileText className="w-3 h-3 text-rose-600 shrink-0" />
                            <span className="truncate">{piece.attachments[0].fileName}</span>
                          </span>
                        ) : statusCfg && piece.feedbackStatus !== "NONE" ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.badgeClass}`}
                          >
                            <Check className="w-3 h-3" />
                            {statusCfg.label}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Mảnh đóng góp</span>
                        )}

                        <Link
                          href={`/teacher/skyline-connect/posts/${post.id}?commentId=${piece.id}`}
                          onClick={onClose}
                          className="text-[11px] font-semibold text-[#00736E] hover:underline shrink-0"
                        >
                          Xem trao đổi
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl bg-white/80 border border-dashed border-[#BCE6E1] px-4 py-3 text-xs text-slate-600 flex items-center justify-between">
                <span>
                  Hãy là người đầu tiên gửi một mảnh ghép sáng tạo để cùng tác giả hoàn thiện ý tưởng này!
                </span>
              </div>
            )}

            <div className="text-center pt-1 text-xs font-semibold text-[#005F5B]">
              Cùng góp sức. Cùng thử. Cùng phát triển.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContributePieceModal;
