"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  ThumbsUp,
  Pin,
  Edit3,
  Trash2,
  CheckCircle2,
  Sparkles,
  CornerDownRight,
  AlertCircle,
  GitBranch,
  AtSign,
  X,
  Puzzle,
  Link2,
  ExternalLink,
  EyeOff,
  Eye,
  Clock,
} from "lucide-react";

export interface SlcTeacherDirectoryItem {
  userId: string;
  teacherName: string;
  teacherCode?: string;
  campusName?: string;
  subjectName?: string;
  email?: string;
}

export interface CommentItem {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  authorRole?: string | null;
  campusName?: string | null;
  parentId?: string | null;
  replyToCommentId?: string | null;
  replyToUserId?: string | null;
  replyToUserName?: string | null;
  depth: number;
  content: string;
  contributionType?: string | null;
  links?: Array<{ url: string; title?: string }>;
  isEdited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  feedbackStatus?: string | null;
  feedbackReason?: string | null;
  linkedProjectId?: string | null;
  developmentItemNote?: string | null;
  appliedChangeNote?: string | null;
  linkedProductVersionId?: string | null;
  helpRequestId?: string | null;
  statusHistory?: Array<{
    status: string;
    actorId: string;
    actorName: string;
    note?: string | null;
    createdAt: string;
  }>;
  reactionCount?: number;
  userReaction?: string | null;
  createdAt: string;
  attachments?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    attachmentType: string;
  }>;
  replies?: CommentItem[];
}

interface CommentThreadSectionProps {
  postId: string;
  postAuthorId: string;
  canManageFeedback?: boolean;
  currentUserId: string;
  currentUserName?: string;
  linkedProductId?: string | null;
  linkedProjectId?: string | null;
  productVersions?: Array<{
    id: string;
    version: string;
    releaseNotes: string;
    sourceCommentId?: string | null;
    contributorId?: string | null;
    contributorOptOutPublic?: boolean;
  }>;
  initialComments?: CommentItem[];
  totalCommentCount?: number;
  contributionCount?: number;
  isCompactPreview?: boolean;
  autoFocusInput?: boolean;
  highlightCommentId?: string | null;
  teachers?: SlcTeacherDirectoryItem[];
  onCommentCountChange?: (newCount: number) => void;
  onOpenContributeModal?: () => void;
  onRefreshPost?: () => void;
}

export const CONTRIBUTION_TYPE_BADGES: Record<
  string,
  { label: string; emoji: string; bg: string; text: string; border: string }
> = {
  METHOD: {
    label: "Một cách làm",
    emoji: "💡",
    bg: "bg-[#E6F7F5]",
    text: "text-[#003B3A]",
    border: "border-[#159EAA]/40",
  },
  MATERIAL: {
    label: "Học liệu",
    emoji: "📖",
    bg: "bg-[#EFF6FF]",
    text: "text-[#1E3A8A]",
    border: "border-[#93C5FD]",
  },
  EXPERIMENT: {
    label: "Thử nghiệm",
    emoji: "🧪",
    bg: "bg-[#ECFEFF]",
    text: "text-[#164E63]",
    border: "border-[#67E8F9]",
  },
  SKILL: {
    label: "Kỹ năng",
    emoji: "🛠️",
    bg: "bg-[#FEF9EC]",
    text: "text-[#78350F]",
    border: "border-[#FCD34D]",
  },
  CONNECTION: {
    label: "Kết nối",
    emoji: "🤝",
    bg: "bg-[#FDF2F4]",
    text: "text-[#881337]",
    border: "border-[#FBCFE8]",
  },
};

export const FEEDBACK_STATUS_BADGES: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  RECEIVED: {
    label: "Đã tiếp nhận",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  IN_PROGRESS: {
    label: "Đưa vào phát triển",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
  },
  APPLIED: {
    label: "Đã áp dụng vào bản cập nhật",
    bg: "bg-teal-50",
    text: "text-[#00736E]",
    border: "border-teal-200",
  },
  NOT_IMPLEMENTED: {
    label: "Chưa triển khai",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
};

export function CommentThreadSection({
  postId,
  postAuthorId,
  canManageFeedback = false,
  currentUserId,
  currentUserName,
  linkedProductId,
  linkedProjectId,
  productVersions = [],
  initialComments = [],
  totalCommentCount = 0,
  contributionCount = 0,
  isCompactPreview = false,
  autoFocusInput = false,
  highlightCommentId = null,
  teachers = [],
  onCommentCountChange,
  onOpenContributeModal,
  onRefreshPost,
}: CommentThreadSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [sortOrder, setSortOrder] = useState<"NEWEST" | "OLDEST">("NEWEST");
  const [filterType, setFilterType] = useState<
    "ALL" | "CONTRIBUTIONS" | "METHOD" | "MATERIAL" | "EXPERIMENT" | "SKILL" | "CONNECTION"
  >("ALL");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [computedContribCount, setComputedContribCount] = useState<number>(contributionCount);

  const [draftText, setDraftText] = useState("");
  const [mentionedUsers, setMentionedUsers] = useState<SlcTeacherDirectoryItem[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionHighlightIdx, setMentionHighlightIdx] = useState(0);

  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Author reception modal state (for IN_PROGRESS / APPLIED / NOT_IMPLEMENTED details)
  const [receptionModal, setReceptionModal] = useState<{
    comment: CommentItem;
    status: "IN_PROGRESS" | "APPLIED" | "NOT_IMPLEMENTED";
  } | null>(null);
  const [receptionNote, setReceptionNote] = useState("");
  const [receptionVersionId, setReceptionVersionId] = useState("");

  // Release version from comment modal state
  const [versionSourceComment, setVersionSourceComment] = useState<CommentItem | null>(null);
  const [newVersionNumber, setNewVersionNumber] = useState("1.1");
  const [newVersionNotes, setNewVersionNotes] = useState("");

  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string>(() =>
    `req_${postId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const isAuthorizedManager = postAuthorId === currentUserId || canManageFeedback;

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    if (autoFocusInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocusInput]);

  // Filter teachers matching @query
  const filteredMentionTeachers = React.useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.trim().toLowerCase();
    return teachers
      .filter((t) => {
        if (!t.userId || t.userId === currentUserId) return false;
        if (!q) return true;
        return (
          (t.teacherName || "").toLowerCase().includes(q) ||
          (t.teacherCode || "").toLowerCase().includes(q) ||
          (t.campusName || "").toLowerCase().includes(q) ||
          (t.subjectName || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [mentionQuery, teachers, currentUserId]);

  const handleDraftChange = (val: string) => {
    setDraftText(val);
    const match = val.match(/(?:^|\s)@([^\s@]{0,35})$/);
    if (match) {
      setMentionQuery(match[1] || "");
      setMentionHighlightIdx(0);
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectMentionTeacher = (teacher: SlcTeacherDirectoryItem) => {
    const replaced = draftText.replace(
      /(^|\s)@([^\s@]{0,35})$/,
      `$1@${teacher.teacherName} `
    );
    const nextText =
      replaced !== draftText
        ? replaced
        : `${draftText}${draftText.endsWith(" ") || !draftText ? "" : " "}@${
            teacher.teacherName
          } `;

    setDraftText(nextText);
    setMentionQuery(null);
    if (!mentionedUsers.some((u) => u.userId === teacher.userId)) {
      setMentionedUsers((prev) => [...prev, teacher]);
    }
    inputRef.current?.focus();
  };

  const handleTriggerMentionButton = () => {
    if (mentionQuery !== null) {
      setMentionQuery(null);
      return;
    }
    const next = `${draftText}${draftText && !draftText.endsWith(" ") ? " " : ""}@`;
    setDraftText(next);
    setMentionQuery("");
    setMentionHighlightIdx(0);
    inputRef.current?.focus();
  };

  const loadComments = async (
    targetPage = 1,
    targetSort = sortOrder,
    append = false,
    targetFilter = filterType
  ) => {
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/skyline-connect?action=comments&postId=${postId}&sort=${targetSort}&filterType=${targetFilter}&page=${targetPage}&pageSize=${
          isCompactPreview ? 5 : 12
        }`
      );
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => (append ? [...prev, ...(data.comments || [])] : data.comments || []));
        setHasMore(Boolean(data.pagination?.hasMore));
        setPage(targetPage);
        if (typeof data.contributionCount === "number") {
          setComputedContribCount(data.contributionCount);
        }
        if (onCommentCountChange && typeof data.activeCommentCount === "number") {
          onCommentCountChange(data.activeCommentCount);
        }
      }
    } catch {
      // ignore transient error
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isCompactPreview || filterType !== "ALL") {
      loadComments(1, sortOrder, false, filterType);
    }
  }, [postId, sortOrder, filterType, isCompactPreview]);

  const handleSubmitComment = async () => {
    const trimmed = draftText.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createComment",
          postId,
          content: trimmed,
          contributionType: "NONE",
          parentCommentId: replyingTo?.id || null,
          mentionedUserIds: mentionedUsers.map((u) => u.userId),
          clientRequestId: pendingRequestId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Không thể gửi bình luận.");
      }

      setDraftText("");
      setMentionedUsers([]);
      setMentionQuery(null);
      setReplyingTo(null);
      setPendingRequestId(`req_${postId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      if (onCommentCountChange && typeof data.commentCount === "number") {
        onCommentCountChange(data.commentCount);
      }
      await loadComments(1, sortOrder, false, filterType);
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Gửi bình luận chưa thành công. Bản nháp của Thầy/Cô đã được giữ lại."
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMentionTeachers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionHighlightIdx((i) => (i + 1) % filteredMentionTeachers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionHighlightIdx(
          (i) => (i - 1 + filteredMentionTeachers.length) % filteredMentionTeachers.length
        );
        return;
      }
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSelectMentionTeacher(filteredMentionTeachers[mentionHighlightIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleEditSave = async (commentId: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateComment",
          commentId,
          content: editContent.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setEditingCommentId(null);
      await loadComments(1, sortOrder, false, filterType);
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể sửa bình luận.");
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteComment",
          commentId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      if (onCommentCountChange && typeof json.commentCount === "number") {
        onCommentCountChange(json.commentCount);
      }
      await loadComments(1, sortOrder, false, filterType);
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể xóa bình luận.");
    }
  };

  const handleTogglePin = async (commentId: string) => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "togglePinComment",
          commentId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      await loadComments(1, sortOrder, false, filterType);
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể ghim bình luận.");
    }
  };

  const handleSelectFeedbackStatus = async (
    comment: CommentItem,
    feedbackStatus: "NONE" | "RECEIVED" | "IN_PROGRESS" | "APPLIED" | "NOT_IMPLEMENTED"
  ) => {
    if (
      feedbackStatus === "IN_PROGRESS" ||
      feedbackStatus === "APPLIED" ||
      feedbackStatus === "NOT_IMPLEMENTED"
    ) {
      setReceptionModal({ comment, status: feedbackStatus });
      if (feedbackStatus === "IN_PROGRESS") {
        setReceptionNote(comment.developmentItemNote || "Đưa vào danh mục cải tiến sản phẩm/ý tưởng");
      } else if (feedbackStatus === "APPLIED") {
        setReceptionNote(comment.appliedChangeNote || "Đã bổ sung cải tiến vào phiên bản mới");
        setReceptionVersionId(comment.linkedProductVersionId || productVersions[0]?.id || "");
      } else {
        setReceptionNote(comment.feedbackReason || "Sẽ cân nhắc ở giai đoạn tiếp theo của học kỳ");
      }
      return;
    }

    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "markFeedbackStatus",
          commentId: comment.id,
          feedbackStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      await loadComments(1, sortOrder, false, filterType);
      if (onRefreshPost) onRefreshPost();
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể cập nhật trạng thái góp ý.");
    }
  };

  const handleSubmitReceptionModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receptionModal) return;

    const { comment, status } = receptionModal;
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "markFeedbackStatus",
          commentId: comment.id,
          feedbackStatus: status,
          linkedProjectId: status === "IN_PROGRESS" ? linkedProjectId || null : undefined,
          developmentItemNote: status === "IN_PROGRESS" ? receptionNote.trim() : undefined,
          linkedProductVersionId:
            status === "APPLIED" ? receptionVersionId || null : undefined,
          appliedChangeNote: status === "APPLIED" ? receptionNote.trim() : undefined,
          feedbackReason: status === "NOT_IMPLEMENTED" ? receptionNote.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setReceptionModal(null);
      await loadComments(1, sortOrder, false, filterType);
      if (onRefreshPost) onRefreshPost();
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể cập nhật trạng thái tiếp nhận đóng góp.");
    }
  };

  const handleToggleCommentReaction = async (commentId: string) => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleReaction",
          targetType: "COMMENT",
          targetId: commentId,
          reactionType: "USEFUL",
        }),
      });
      if (res.ok) {
        await loadComments(1, sortOrder, false, filterType);
      }
    } catch {
      // ignore
    }
  };

  const handleReleaseVersionFromComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionSourceComment || !linkedProductId) return;
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "releaseProductVersion",
          productId: linkedProductId,
          version: newVersionNumber.trim() || "1.1",
          releaseNotes:
            newVersionNotes.trim() ||
            `Cập nhật cải tiến từ góp ý của ${versionSourceComment.authorName}`,
          sourceCommentId: versionSourceComment.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setVersionSourceComment(null);
      setNewVersionNotes("");
      await loadComments(1, sortOrder, false, filterType);
      if (onRefreshPost) onRefreshPost();
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể tạo phiên bản sản phẩm từ góp ý.");
    }
  };

  const handleToggleContributorOptOut = async (versionId: string, optOut: boolean) => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleContributorOptOut",
          versionId,
          optOut,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      await loadComments(1, sortOrder, false, filterType);
      if (onRefreshPost) onRefreshPost();
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể cập nhật tùy chọn hiển thị tên.");
    }
  };

  const formatTimeAgo = (iso: string) => {
    if (!iso) return "Vừa xong";
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày`;
  };

  const renderFormattedContent = (text: string) => {
    if (!text || !text.includes("@")) return text;
    const parts = text.split(/(@[\p{L}\p{N}_]+(?:\s+[\p{L}\p{N}_]+){0,3})/gu);
    return parts.map((part, idx) => {
      if (part.startsWith("@") && part.length > 1) {
        return (
          <span
            key={idx}
            className="inline-block px-1.5 py-0.2 rounded-md bg-[#E6F4F5] text-[#123E4A] font-bold"
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const renderSingleComment = (c: CommentItem, isReply = false) => {
    const isCommentAuthor = c.authorId === currentUserId;
    const isAuthorOfPost = c.authorId === postAuthorId;
    const contribBadge =
      c.contributionType && c.contributionType !== "NONE"
        ? CONTRIBUTION_TYPE_BADGES[c.contributionType]
        : null;
    const fbBadge =
      c.feedbackStatus && c.feedbackStatus !== "NONE"
        ? FEEDBACK_STATUS_BADGES[c.feedbackStatus]
        : null;
    const isHighlighted = highlightCommentId === c.id;

    const linkedVer = c.linkedProductVersionId
      ? productVersions.find((v) => v.id === c.linkedProductVersionId)
      : productVersions.find((v) => v.sourceCommentId === c.id);

    return (
      <div key={c.id} id={`comment-${c.id}`} className="group">
        <div className="flex items-start gap-2">
          {/* Avatar */}
          <div
            className={`${
              isReply ? "w-7 h-7 text-[11px]" : "w-8 h-8 text-xs"
            } rounded-full overflow-hidden bg-gradient-to-br from-[#003B3A] to-[#159EAA] text-white font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
          >
            {c.authorAvatar ? (
              <img
                src={c.authorAvatar}
                alt={c.authorName}
                className="w-full h-full object-cover"
              />
            ) : (
              (c.authorName || "G").charAt(0).toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Rounded Comment / Contribution Bubble */}
            <div
              className={`inline-block max-w-full rounded-2xl px-3.5 py-2.5 relative border transition-colors ${
                isHighlighted
                  ? "bg-teal-50 border-[#159EAA] ring-2 ring-[#159EAA]/20"
                  : contribBadge
                  ? "bg-white border-slate-200 shadow-2xs"
                  : "bg-[#F0F2F5] border-transparent hover:bg-[#EBEDF0]"
              }`}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[13px] font-bold text-slate-900 leading-tight">
                  {c.authorName}
                </span>
                {isAuthorOfPost && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#003B3A]/10 text-[#003B3A]">
                    Tác giả
                  </span>
                )}
                {/* Contribution Piece Type Badge */}
                {contribBadge && !c.isDeleted && (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${contribBadge.bg} ${contribBadge.text} ${contribBadge.border}`}
                  >
                    <span>{contribBadge.emoji}</span>
                    <span>{contribBadge.label}</span>
                  </span>
                )}
                {c.isPinned && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100/80 text-amber-800">
                    <Pin className="w-2.5 h-2.5" />
                    <span>Đã ghim</span>
                  </span>
                )}
                {fbBadge && !c.isDeleted && (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${fbBadge.bg} ${fbBadge.text} ${fbBadge.border}`}
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>{fbBadge.label}</span>
                  </span>
                )}
              </div>

              {editingCommentId === c.id ? (
                <div className="mt-1.5 space-y-1.5 min-w-[240px]">
                  <textarea
                    rows={2}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:border-[#159EAA]"
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleEditSave(c.id)}
                      className="px-2.5 py-1 rounded-lg bg-[#159EAA] text-white text-[11px] font-semibold cursor-pointer"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCommentId(null)}
                      className="px-2.5 py-1 rounded-lg bg-white text-slate-600 text-[11px] font-semibold border border-slate-200 cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className={`text-[13px] mt-1 leading-relaxed break-words ${
                    c.isDeleted ? "italic text-slate-400" : "text-slate-800"
                  }`}
                >
                  {c.replyToUserName && !c.isDeleted && (
                    <span className="inline-block px-1.5 py-0.2 rounded-md bg-[#E6F4F5] text-[#123E4A] font-bold mr-1">
                      @{c.replyToUserName}
                    </span>
                  )}
                  {c.isDeleted ? "Bình luận đã được xóa" : renderFormattedContent(c.content)}
                </p>
              )}

              {/* Reception Notes (Development Item / Applied Change / Not Implemented Reason) */}
              {!c.isDeleted &&
                (c.developmentItemNote || c.appliedChangeNote || c.feedbackReason) && (
                  <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[11px] text-slate-600 space-y-0.5">
                    {c.feedbackStatus === "IN_PROGRESS" && c.developmentItemNote && (
                      <div className="flex items-center gap-1 text-sky-800">
                        <span className="font-semibold">Hạng mục phát triển:</span>
                        <span>{c.developmentItemNote}</span>
                      </div>
                    )}
                    {c.feedbackStatus === "APPLIED" && c.appliedChangeNote && (
                      <div className="flex items-center gap-1 text-[#00736E]">
                        <span className="font-semibold">Thay đổi đã áp dụng:</span>
                        <span>{c.appliedChangeNote}</span>
                        {linkedVer && (
                          <span className="px-1.5 py-0.2 rounded bg-teal-100 text-[#003B3A] font-bold tabular-nums">
                            v{linkedVer.version}
                          </span>
                        )}
                      </div>
                    )}
                    {c.feedbackStatus === "NOT_IMPLEMENTED" && c.feedbackReason && (
                      <div className="flex items-center gap-1 text-amber-800">
                        <span className="font-semibold">Ghi chú từ tác giả:</span>
                        <span>{c.feedbackReason}</span>
                      </div>
                    )}
                  </div>
                )}

              {/* Floating Reaction Pill on Bubble Corner */}
              {!c.isDeleted && (c.reactionCount || 0) > 0 && (
                <div className="absolute -bottom-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white shadow-xs border border-slate-200 text-[10px] font-bold text-slate-700 tabular-nums">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#159EAA] text-white inline-flex items-center justify-center">
                    <ThumbsUp className="w-2 h-2 fill-white" />
                  </span>
                  <span>{c.reactionCount}</span>
                </div>
              )}
            </div>

            {/* External Links & File Attachments */}
            {!c.isDeleted &&
              ((c.links && c.links.length > 0) || (c.attachments && c.attachments.length > 0)) && (
                <div className="flex flex-wrap gap-1.5 mt-1.5 pl-1">
                  {(c.attachments || []).map((att) => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-slate-200 hover:bg-slate-100 text-[11px] text-[#003B3A] font-semibold"
                    >
                      <span>📎 {att.fileName}</span>
                    </a>
                  ))}
                  {(c.links || []).map((lnk, idx) => (
                    <a
                      key={`${lnk.url}-${idx}`}
                      href={lnk.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 hover:bg-sky-100 text-[11px] text-sky-900 font-semibold"
                    >
                      <Link2 className="w-3 h-3 text-sky-600" />
                      <span className="truncate max-w-[200px]">{lnk.title || lnk.url}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                  ))}
                </div>
              )}

            {/* Sub-Bubble Action Links */}
            {!c.isDeleted && (
              <div className="flex items-center gap-3 mt-1 pl-2 flex-wrap text-[11px] text-slate-500">
                <button
                  type="button"
                  onClick={() => handleToggleCommentReaction(c.id)}
                  className={`font-bold hover:underline cursor-pointer tabular-nums ${
                    c.userReaction ? "text-[#159EAA]" : "text-slate-600"
                  }`}
                >
                  Hữu ích
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo({ id: c.id, authorName: c.authorName });
                    inputRef.current?.focus();
                  }}
                  className="font-bold text-slate-600 hover:underline cursor-pointer"
                >
                  Trả lời
                </button>

                <span className="text-slate-400 tabular-nums">{formatTimeAgo(c.createdAt)}</span>

                {c.isEdited && <span className="text-slate-400">• Đã chỉnh sửa</span>}

                {isCommentAuthor && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCommentId(c.id);
                        setEditContent(c.content);
                      }}
                      className="hover:text-slate-800 hover:underline cursor-pointer"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="hover:text-rose-600 hover:underline cursor-pointer"
                    >
                      Xóa
                    </button>
                  </>
                )}

                {/* Contributor opt-out of public recognition on product version */}
                {isCommentAuthor && linkedVer && (
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleContributorOptOut(
                        linkedVer.id,
                        !linkedVer.contributorOptOutPublic
                      )
                    }
                    className="inline-flex items-center gap-1 text-[#00736E] hover:underline font-semibold cursor-pointer"
                    title="Tùy chọn hiển thị tên của bạn trên phần ghi nhận bản cập nhật"
                  >
                    {linkedVer.contributorOptOutPublic ? (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Hiện tên ghi nhận</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Ẩn tên ghi nhận</span>
                      </>
                    )}
                  </button>
                )}

                {isAuthorizedManager && !isReply && (
                  <button
                    type="button"
                    onClick={() => handleTogglePin(c.id)}
                    className="hover:text-amber-700 hover:underline cursor-pointer"
                  >
                    {c.isPinned ? "Bỏ ghim" : "Ghim"}
                  </button>
                )}

                {isAuthorizedManager && (
                  <select
                    value={c.feedbackStatus || "NONE"}
                    onChange={(e) => handleSelectFeedbackStatus(c, e.target.value as any)}
                    aria-label="Tiếp nhận & xử lý đóng góp"
                    className="text-[11px] bg-white border border-slate-200 hover:border-[#159EAA] rounded-lg px-2 py-0.5 text-[#003B3A] font-semibold cursor-pointer focus:outline-none"
                  >
                    <option value="NONE">Tiếp nhận đóng góp...</option>
                    <option value="RECEIVED">✓ Đã tiếp nhận</option>
                    <option value="IN_PROGRESS">⚙️ Đưa vào phát triển</option>
                    <option value="APPLIED">★ Đã áp dụng vào bản cập nhật</option>
                    <option value="NOT_IMPLEMENTED">• Chưa triển khai (kèm lý do)</option>
                  </select>
                )}

                {isAuthorizedManager && linkedProductId && (
                  <button
                    type="button"
                    onClick={() => {
                      setVersionSourceComment(c);
                      setNewVersionNotes(
                        `Cải tiến sản phẩm theo đóng góp của ${c.authorName}: ${c.content}`
                      );
                    }}
                    className="inline-flex items-center gap-0.5 text-[#159EAA] hover:underline font-semibold cursor-pointer"
                  >
                    <GitBranch className="w-3 h-3" />
                    <span>Gắn vào bản cập nhật mới</span>
                  </button>
                )}
              </div>
            )}

            {/* 2nd-level Replies */}
            {c.replies && c.replies.length > 0 && (
              <div className="mt-2 pl-3 border-l-2 border-slate-200/80 space-y-2.5">
                {c.replies.map((rep) => renderSingleComment(rep, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 pt-2.5 relative">
      {/* Filter Bar: Tất cả trao đổi vs Mảnh đóng góp + Nút Góp một mảnh */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer tabular-nums ${
              filterType === "ALL"
                ? "bg-[#003B3A] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả trao đổi ({totalCommentCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("CONTRIBUTIONS")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer tabular-nums ${
              filterType !== "ALL"
                ? "bg-[#159EAA] text-white"
                : "bg-[#F0FDFA] text-[#003B3A] border border-[#99F6E4] hover:bg-teal-100/70"
            }`}
          >
            <Puzzle className="w-3.5 h-3.5" />
            <span>Mảnh đóng góp {computedContribCount > 0 ? `(${computedContribCount})` : ""}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenContributeModal && (
            <button
              type="button"
              onClick={onOpenContributeModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00736E] hover:bg-[#003B3A] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Puzzle className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span>Góp một mảnh</span>
            </button>
          )}
          {!isCompactPreview && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSortOrder("NEWEST")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                  sortOrder === "NEWEST"
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Mới nhất
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("OLDEST")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                  sortOrder === "OLDEST"
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Cũ nhất
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-filter pills when viewing Mảnh đóng góp */}
      {filterType !== "ALL" && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <button
            type="button"
            onClick={() => setFilterType("CONTRIBUTIONS")}
            className={`px-2.5 py-1 rounded-full font-semibold cursor-pointer ${
              filterType === "CONTRIBUTIONS"
                ? "bg-[#003B3A] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả 5 mảnh
          </button>
          {(["METHOD", "MATERIAL", "EXPERIMENT", "SKILL", "CONNECTION"] as const).map((tKey) => {
            const b = CONTRIBUTION_TYPE_BADGES[tKey];
            const active = filterType === tKey;
            return (
              <button
                key={tKey}
                type="button"
                onClick={() => setFilterType(tKey)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold border transition-all cursor-pointer ${
                  active
                    ? `${b.bg} ${b.text} ${b.border} ring-2 ring-[#159EAA]/30`
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{b.emoji}</span>
                <span>{b.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={handleSubmitComment}
            className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Reply banner */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] text-xs text-[#123E4A]">
          <span className="inline-flex items-center gap-1">
            <CornerDownRight className="w-3.5 h-3.5 text-[#159EAA]" />
            <span>
              Đang phản hồi <strong>{replyingTo.authorName}</strong>
            </span>
          </span>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
          >
            Hủy
          </button>
        </div>
      )}

      {/* Tagged Colleagues Pills */}
      {mentionedUsers.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pl-10">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-0.5">
            <AtSign className="w-3 h-3 text-[#159EAA]" />
            <span>Đang nhắc tên:</span>
          </span>
          {mentionedUsers.map((u) => (
            <span
              key={u.userId}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E6F4F5] text-[#123E4A] border border-[#99F6E4] text-[11px] font-bold"
            >
              <span>@{u.teacherName}</span>
              <button
                type="button"
                onClick={() =>
                  setMentionedUsers((prev) => prev.filter((item) => item.userId !== u.userId))
                }
                className="text-slate-500 hover:text-rose-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Normal Comment Composer Bar with @Mention Autocomplete */}
      <div className="relative">
        {mentionQuery !== null && filteredMentionTeachers.length > 0 && (
          <div className="absolute bottom-full left-10 mb-1.5 z-40 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-3 py-1.5 bg-[#F8FAFC] border-b border-slate-100 text-[11px] font-bold text-[#123E4A] flex items-center justify-between">
              <span>Chọn đồng nghiệp được phép xem bài</span>
              <button
                type="button"
                onClick={() => setMentionQuery(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
              {filteredMentionTeachers.map((t, idx) => (
                <button
                  key={t.userId}
                  type="button"
                  onClick={() => handleSelectMentionTeacher(t)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs transition-colors cursor-pointer ${
                    idx === mentionHighlightIdx
                      ? "bg-[#F0FDFA] text-[#123E4A]"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-[#123E4A] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    {(t.teacherName || "G").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 truncate">{t.teacherName}</div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {[t.subjectName, t.campusName, t.teacherCode].filter(Boolean).join(" • ")}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full bg-[#003B3A] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
            {(currentUserName || "G").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 flex items-center gap-1 bg-[#F0F2F5] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#159EAA]/30 border border-transparent focus-within:border-[#159EAA] rounded-2xl px-3 py-1.5 transition-all">
            <textarea
              ref={inputRef}
              rows={1}
              value={draftText}
              onChange={(e) => handleDraftChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              placeholder="Viết bình luận nhanh... hoặc nhấn 'Góp một mảnh' để gửi đóng góp có phân loại"
              className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-500 focus:outline-none resize-none py-0.5"
            />
            <button
              type="button"
              onClick={handleTriggerMentionButton}
              className="p-1.5 rounded-full text-slate-500 hover:text-[#159EAA] hover:bg-teal-50 transition-colors cursor-pointer shrink-0"
              title="Nhắc tên (@) đồng nghiệp"
              aria-label="Nhắc tên đồng nghiệp"
            >
              <AtSign className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSubmitComment}
              disabled={sending || !draftText.trim()}
              className="p-1.5 rounded-full text-[#159EAA] hover:bg-teal-50 disabled:text-slate-400 disabled:hover:bg-transparent transition-colors cursor-pointer shrink-0"
              aria-label="Gửi bình luận"
              title="Gửi bình luận (Ctrl+Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Existing comments list */}
      {comments.length > 0 ? (
        <div className="space-y-2.5 pt-1">
          {comments.map((c) => renderSingleComment(c, false))}
        </div>
      ) : (
        <div className="py-4 text-center text-xs text-slate-500">
          {filterType === "ALL"
            ? "Chưa có trao đổi nào. Hãy là người đầu tiên bình luận hoặc góp một mảnh sáng tạo!"
            : "Chưa có mảnh đóng góp nào thuộc phân loại này."}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => loadComments(page + 1, sortOrder, true, filterType)}
          disabled={loadingMore}
          className="text-xs font-bold text-slate-600 hover:underline pl-10 cursor-pointer"
        >
          {loadingMore ? "Đang tải thêm trao đổi..." : "Xem thêm trao đổi trước đó..."}
        </button>
      )}

      {/* Modal: Author Reception Details (IN_PROGRESS / APPLIED / NOT_IMPLEMENTED) */}
      {receptionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitReceptionModal}
            className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-3.5 shadow-xl text-xs"
          >
            <h4 className="text-sm font-bold text-[#003B3A] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#159EAA]" />
              <span>
                {receptionModal.status === "IN_PROGRESS"
                  ? "Đưa đóng góp vào phát triển"
                  : receptionModal.status === "APPLIED"
                  ? "Đánh dấu Đã áp dụng vào bản cập nhật"
                  : "Phản hồi Chưa triển khai"}
              </span>
            </h4>
            <p className="text-slate-600">
              Đóng góp từ <strong>{receptionModal.comment.authorName}</strong>:{" "}
              <span className="italic">“{receptionModal.comment.content.slice(0, 120)}”</span>
            </p>

            {receptionModal.status === "APPLIED" && productVersions.length > 0 && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Liên kết phiên bản cập nhật (nếu có)
                </label>
                <select
                  value={receptionVersionId}
                  onChange={(e) => setReceptionVersionId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                >
                  <option value="">-- Hoặc ghi rõ thay đổi bên dưới --</option>
                  {productVersions.map((ver) => (
                    <option key={ver.id} value={ver.id}>
                      Phiên bản v{ver.version} — {ver.releaseNotes.slice(0, 50)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {receptionModal.status === "IN_PROGRESS"
                  ? "Hạng mục phát triển dự kiến (Không tự giao việc bắt buộc cho người góp ý)"
                  : receptionModal.status === "APPLIED"
                  ? "Nội dung thay đổi đã thực hiện *"
                  : "Lý do ngắn chưa triển khai *"}
              </label>
              <textarea
                rows={3}
                required={receptionModal.status !== "IN_PROGRESS"}
                value={receptionNote}
                onChange={(e) => setReceptionNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:border-[#159EAA]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReceptionModal(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-[#00736E] hover:bg-[#003B3A] text-white font-bold cursor-pointer"
              >
                Lưu trạng thái tiếp nhận
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Link comment to new Product Version */}
      {versionSourceComment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleReleaseVersionFromComment}
            className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-3 shadow-xl text-xs"
          >
            <h4 className="text-sm font-bold text-[#003B3A] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#159EAA]" />
              <span>Công bố phiên bản mới & Ghi nhận người đóng góp</span>
            </h4>
            <p className="text-slate-600">
              Hiển thị <strong>“Có đóng góp từ {versionSourceComment.authorName}”</strong> kèm liên kết
              đến mảnh đóng góp nguồn. Người đóng góp có thể chọn ẩn tên và không tự động trở thành
              đồng tác giả.
            </p>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Số phiên bản mới *</label>
              <input
                type="text"
                required
                value={newVersionNumber}
                onChange={(e) => setNewVersionNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 tabular-nums"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ghi chú cập nhật *</label>
              <textarea
                rows={3}
                required
                value={newVersionNotes}
                onChange={(e) => setNewVersionNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVersionSourceComment(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-[#00736E] hover:bg-[#003B3A] text-white font-bold cursor-pointer"
              >
                Công bố & Ghi nhận
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
