"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  ThumbsUp,
  Pin,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
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
      setErrorMsg(err?.message || "Gửi bình luận chưa thành công. Bản nháp của Thầy/Cô đã được giữ lại.");
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
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
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
      <div
        key={c.id}
        id={`comment-${c.id}`}
        className={`rounded-xl p-2.5 transition-colors ${
          isHighlighted
            ? "bg-teal-50/90 border border-[#159EAA]"
            : isReply
            ? "bg-white/90 border border-slate-100"
            : "bg-[#F8FAFC] border border-slate-200/70"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#123E4A] text-white text-xs font-bold flex items-center justify-center shrink-0">
            {(c.authorName || "G").charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-800">{c.authorName}</span>
                {isAuthorOfPost && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#123E4A]/10 text-[#123E4A]">
                    Tác giả
                  </span>
                )}
                {c.isPinned && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    <Pin className="w-2.5 h-2.5" />
                    <span>Đã ghim</span>
                  </span>
                )}
                <span className="text-[11px] text-slate-400 tabular-nums">
                  • {formatTimeAgo(c.createdAt)}
                </span>
                {c.isEdited && !c.isDeleted && (
                  <span className="text-[10px] italic text-slate-400">(Đã chỉnh sửa)</span>
                )}
              </div>

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
              <div className="mt-1.5 space-y-1.5">
                <textarea
                  rows={2}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
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
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <p
                className={`text-xs mt-1 leading-relaxed break-words ${
                  c.isDeleted ? "italic text-slate-400" : "text-slate-700"
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

            {/* Attachments (hidden if comment isDeleted) */}
            {!c.isDeleted && c.attachments && c.attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {c.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] text-[#159EAA] hover:underline"
                  >
                    <span>📎 {att.fileName}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Comment Actions */}
            {!c.isDeleted && (
              <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px] text-slate-500">
                <button
                  type="button"
                  onClick={() => handleToggleCommentReaction(c.id)}
                  className={`inline-flex items-center gap-1 font-medium hover:text-[#159EAA] cursor-pointer tabular-nums ${
                    c.userReaction ? "text-[#159EAA] font-bold" : ""
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>Hữu ích {c.reactionCount ? `(${c.reactionCount})` : ""}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo({ id: c.id, authorName: c.authorName });
                    inputRef.current?.focus();
                  }}
                  className="inline-flex items-center gap-1 font-medium hover:text-[#123E4A] cursor-pointer"
                >
                  <CornerDownRight className="w-3 h-3" />
                  <span>Trả lời</span>
                </button>

                {isCommentAuthor && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCommentId(c.id);
                        setEditContent(c.content);
                      }}
                      className="inline-flex items-center gap-0.5 hover:text-slate-800 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="inline-flex items-center gap-0.5 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa</span>
                    </button>
                  </>
                )}

                {isPostAuthor && !isReply && (
                  <button
                    type="button"
                    onClick={() => handleTogglePin(c.id)}
                    className="inline-flex items-center gap-0.5 hover:text-amber-700 cursor-pointer"
                  >
                    <Pin className="w-3 h-3" />
                    <span>{c.isPinned ? "Bỏ ghim" : "Ghim"}</span>
                  </button>
                )}

                {isPostAuthor && (
                  <select
                    value={c.feedbackStatus || "NONE"}
                    onChange={(e) => handleFeedbackStatus(c.id, e.target.value as any)}
                    aria-label="Đánh dấu trạng thái góp ý"
                    className="text-[11px] bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-600 font-medium cursor-pointer"
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
                      setNewVersionNotes(`Cải tiến sản phẩm theo góp ý của ${c.authorName}: ${c.content}`);
                    }}
                    className="inline-flex items-center gap-1 text-[#159EAA] hover:underline font-semibold cursor-pointer"
                  >
                    <GitBranch className="w-3 h-3" />
                    <span>Cập nhật bản mới từ góp ý</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2nd-level Replies */}
        {c.replies && c.replies.length > 0 && (
          <div className="mt-2 pl-6 border-l-2 border-slate-200/80 space-y-2">
            {c.replies.map((rep) => renderSingleComment(rep, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2.5 pt-2 border-t border-slate-100">
      {!isCompactPreview && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 tabular-nums">
            Thảo luận & Đóng góp chuyên môn ({totalCommentCount})
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

      {/* Existing comments list */}
      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map((c) => renderSingleComment(c, false))}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => loadComments(page + 1, sortOrder, true)}
          disabled={loadingMore}
          className="text-xs font-semibold text-[#159EAA] hover:underline cursor-pointer"
        >
          {loadingMore ? "Đang tải thêm bình luận..." : "Xem thêm bình luận đóng góp →"}
        </button>
      )}

      {/* Reply banner */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-xs text-[#123E4A]">
          <span>
            Đang trả lời <strong>{replyingTo.authorName}</strong>
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

      {/* Comment Composer Bar */}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          rows={1}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          placeholder="Viết bình luận đóng góp, đặt câu hỏi hoặc đề xuất cải tiến... (Ctrl+Enter để gửi)"
          className="flex-1 rounded-xl border border-slate-200 bg-[#F8FAFC] focus:bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#159EAA] resize-none"
        />
        <button
          type="button"
          onClick={handleSubmitComment}
          disabled={sending || !draftText.trim()}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#159EAA] hover:bg-[#11828C] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          aria-label="Gửi bình luận"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{sending ? "Đang gửi..." : "Gửi"}</span>
        </button>
      </div>

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
              Ghi nhận đóng góp của <strong>{versionSourceComment.authorName}</strong> trên lịch sử phiên bản sản phẩm (giáo viên góp ý vẫn giữ quyền chấm sao độc lập).
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
