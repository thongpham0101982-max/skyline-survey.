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
} from "lucide-react";

interface CommentItem {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole?: string | null;
  campusName?: string | null;
  parentId?: string | null;
  replyToCommentId?: string | null;
  replyToUserId?: string | null;
  replyToUserName?: string | null;
  depth: number;
  content: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  feedbackStatus?: string | null;
  feedbackReason?: string | null;
  linkedProductVersionId?: string | null;
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
  currentUserId: string;
  currentUserName?: string;
  linkedProductId?: string | null;
  initialComments?: CommentItem[];
  totalCommentCount?: number;
  isCompactPreview?: boolean;
  autoFocusInput?: boolean;
  highlightCommentId?: string | null;
  onCommentCountChange?: (newCount: number) => void;
}

const FEEDBACK_STATUS_BADGES: Record<
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
    label: "Đang thực hiện",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
  },
  APPLIED: {
    label: "Đã áp dụng",
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
  currentUserId,
  currentUserName,
  linkedProductId,
  initialComments = [],
  totalCommentCount = 0,
  isCompactPreview = false,
  autoFocusInput = false,
  highlightCommentId = null,
  onCommentCountChange,
}: CommentThreadSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [sortOrder, setSortOrder] = useState<"NEWEST" | "OLDEST">("NEWEST");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [draftText, setDraftText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

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

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    if (autoFocusInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocusInput]);

  const loadComments = async (targetPage = 1, targetSort = sortOrder, append = false) => {
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/skyline-connect?action=comments&postId=${postId}&sort=${targetSort}&page=${targetPage}&pageSize=${
          isCompactPreview ? 5 : 10
        }`
      );
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => (append ? [...prev, ...(data.comments || [])] : data.comments || []));
        setHasMore(Boolean(data.pagination?.hasMore));
        setPage(targetPage);
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
    if (!isCompactPreview) {
      loadComments(1, sortOrder, false);
    }
  }, [postId, sortOrder, isCompactPreview]);

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
          parentCommentId: replyingTo?.id || null,
          clientRequestId: pendingRequestId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Không thể gửi bình luận.");
      }

      // Clear draft only after success, and generate a fresh clientRequestId for the next comment
      setDraftText("");
      setReplyingTo(null);
      setPendingRequestId(`req_${postId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      if (onCommentCountChange && typeof data.commentCount === "number") {
        onCommentCountChange(data.commentCount);
      }
      await loadComments(1, sortOrder, false);
    } catch (err: any) {
      // Preserve draftText on error so user can retry with same pendingRequestId (idempotent!)
      setErrorMsg(
        err?.message || "Gửi bình luận chưa thành công. Bản nháp của Thầy/Cô đã được giữ lại."
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      await loadComments(1, sortOrder, false);
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
      await loadComments(1, sortOrder, false);
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
      await loadComments(1, sortOrder, false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể ghim bình luận.");
    }
  };

  const handleFeedbackStatus = async (
    commentId: string,
    feedbackStatus: "NONE" | "RECEIVED" | "IN_PROGRESS" | "APPLIED" | "NOT_IMPLEMENTED"
  ) => {
    let feedbackReason: string | undefined;
    if (feedbackStatus === "NOT_IMPLEMENTED") {
      feedbackReason = "Sẽ cân nhắc ở giai đoạn tiếp theo của học kỳ";
    }
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "markFeedbackStatus",
          commentId,
          feedbackStatus,
          feedbackReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      await loadComments(1, sortOrder, false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể cập nhật trạng thái góp ý.");
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
        await loadComments(1, sortOrder, false);
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
      await loadComments(1, sortOrder, false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể tạo phiên bản sản phẩm từ góp ý.");
    }
  };

  const isPostAuthor = postAuthorId === currentUserId;

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

  const renderSingleComment = (c: CommentItem, isReply = false) => {
    const isCommentAuthor = c.authorId === currentUserId;
    const isAuthorOfPost = c.authorId === postAuthorId;
    const fbBadge =
      c.feedbackStatus && c.feedbackStatus !== "NONE"
        ? FEEDBACK_STATUS_BADGES[c.feedbackStatus]
        : null;
    const isHighlighted = highlightCommentId === c.id;

    return (
      <div key={c.id} id={`comment-${c.id}`} className="group">
        <div className="flex items-start gap-2">
          {/* Avatar */}
          <div
            className={`${
              isReply ? "w-7 h-7 text-[11px]" : "w-8 h-8 text-xs"
            } rounded-full bg-gradient-to-br from-[#123E4A] to-[#159EAA] text-white font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
          >
            {(c.authorName || "G").charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            {/* Facebook-style Rounded Comment Bubble */}
            <div
              className={`inline-block max-w-full rounded-2xl px-3.5 py-2 relative ${
                isHighlighted
                  ? "bg-teal-50 border border-[#159EAA]"
                  : "bg-[#F0F2F5] hover:bg-[#EBEDF0] transition-colors"
              }`}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[13px] font-bold text-slate-900 leading-tight">
                  {c.authorName}
                </span>
                {isAuthorOfPost && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#123E4A]/10 text-[#123E4A]">
                    Tác giả
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
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${fbBadge.bg} ${fbBadge.text} ${fbBadge.border}`}
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
                  className={`text-[13px] mt-0.5 leading-snug break-words ${
                    c.isDeleted ? "italic text-slate-400" : "text-slate-800"
                  }`}
                >
                  {c.replyToUserName && !c.isDeleted && (
                    <span className="font-semibold text-[#159EAA] mr-1">
                      @{c.replyToUserName}
                    </span>
                  )}
                  {c.isDeleted ? "Bình luận đã được xóa" : c.content}
                </p>
              )}

              {/* Floating Reaction Pill on Bubble Corner (like Facebook) */}
              {!c.isDeleted && (c.reactionCount || 0) > 0 && (
                <div className="absolute -bottom-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white shadow-xs border border-slate-200 text-[10px] font-bold text-slate-700 tabular-nums">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#159EAA] text-white inline-flex items-center justify-center">
                    <ThumbsUp className="w-2 h-2 fill-white" />
                  </span>
                  <span>{c.reactionCount}</span>
                </div>
              )}
            </div>

            {/* Attachments (hidden if comment isDeleted) */}
            {!c.isDeleted && c.attachments && c.attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1 pl-1">
                {c.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0F2F5] hover:bg-slate-200 text-[11px] text-[#123E4A] font-medium"
                  >
                    <span>📎 {att.fileName}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Facebook-style Sub-Bubble Action Links (Thích • Phản hồi • Thời gian) */}
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
                  Phản hồi
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

                {isPostAuthor && !isReply && (
                  <button
                    type="button"
                    onClick={() => handleTogglePin(c.id)}
                    className="hover:text-amber-700 hover:underline cursor-pointer"
                  >
                    {c.isPinned ? "Bỏ ghim" : "Ghim"}
                  </button>
                )}

                {isPostAuthor && (
                  <select
                    value={c.feedbackStatus || "NONE"}
                    onChange={(e) => handleFeedbackStatus(c.id, e.target.value as any)}
                    aria-label="Đánh dấu trạng thái góp ý"
                    className="text-[11px] bg-transparent hover:bg-slate-100 rounded px-1 py-0.5 text-slate-600 font-semibold cursor-pointer focus:outline-none"
                  >
                    <option value="NONE">Đánh dấu góp ý...</option>
                    <option value="RECEIVED">✓ Đã tiếp nhận</option>
                    <option value="IN_PROGRESS">⏳ Đang thực hiện</option>
                    <option value="APPLIED">★ Đã áp dụng</option>
                    <option value="NOT_IMPLEMENTED">• Chưa triển khai</option>
                  </select>
                )}

                {isPostAuthor && linkedProductId && (
                  <button
                    type="button"
                    onClick={() => {
                      setVersionSourceComment(c);
                      setNewVersionNotes(
                        `Cải tiến sản phẩm theo góp ý của ${c.authorName}: ${c.content}`
                      );
                    }}
                    className="inline-flex items-center gap-0.5 text-[#159EAA] hover:underline font-semibold cursor-pointer"
                  >
                    <GitBranch className="w-3 h-3" />
                    <span>Cập nhật bản mới</span>
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
    <div className="space-y-3 pt-2.5">
      {!isCompactPreview && (
        <div className="flex items-center justify-between text-xs pb-1">
          <span className="font-bold text-slate-700 tabular-nums">
            Bình luận & Góp ý ({totalCommentCount})
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSortOrder("NEWEST")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                sortOrder === "NEWEST"
                  ? "bg-[#123E4A] text-white"
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
                  ? "bg-[#123E4A] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Cũ nhất
            </button>
          </div>
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

      {/* Facebook-style Pill Comment Composer Bar */}
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-full bg-[#123E4A] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
          {(currentUserName || "G").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 flex items-center gap-1.5 bg-[#F0F2F5] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#159EAA]/30 border border-transparent focus-within:border-[#159EAA] rounded-2xl px-3.5 py-1.5 transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder="Viết bình luận đóng góp, đặt câu hỏi hoặc gợi ý cải tiến... (Ctrl+Enter để gửi)"
            className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-500 focus:outline-none resize-none py-0.5"
          />
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

      {/* Existing comments list */}
      {comments.length > 0 && (
        <div className="space-y-2.5 pt-1">
          {comments.map((c) => renderSingleComment(c, false))}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => loadComments(page + 1, sortOrder, true)}
          disabled={loadingMore}
          className="text-xs font-bold text-slate-600 hover:underline pl-10 cursor-pointer"
        >
          {loadingMore ? "Đang tải thêm bình luận..." : "Xem thêm bình luận trước đó..."}
        </button>
      )}

      {/* Modal: Link comment to new Product Version */}
      {versionSourceComment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleReleaseVersionFromComment}
            className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-3 shadow-xl text-xs"
          >
            <h4 className="text-sm font-bold text-[#123E4A] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#159EAA]" />
              <span>Phát hành phiên bản mới từ góp ý đồng nghiệp</span>
            </h4>
            <p className="text-slate-600">
              Ghi nhận đóng góp của <strong>{versionSourceComment.authorName}</strong> trên lịch sử
              phiên bản sản phẩm (giáo viên góp ý vẫn giữ quyền chấm sao độc lập).
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
                className="px-3.5 py-1.5 rounded-lg bg-[#159EAA] text-white font-bold cursor-pointer"
              >
                Cập nhật & Ghi nhận
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
