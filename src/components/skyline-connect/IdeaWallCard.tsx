"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Star,
  ThumbsUp,
  MessageSquare,
  Bookmark,
  Share2,
  ExternalLink,
  Users,
  Bot,
  Lightbulb,
  BookOpen,
  MoreHorizontal,
  Edit3,
  Flag,
  CheckCircle2,
  Globe,
  Building2,
  Lock,
  Puzzle,
  Flame,
} from "lucide-react";
import { CommentThreadSection, CONTRIBUTION_TYPE_BADGES } from "./CommentThreadSection";

interface IdeaWallCardProps {
  item: any;
  currentUserId: string;
  currentUserName?: string;
  isAdminOrCoordinator?: boolean;
  layoutMode?: "feed" | "grid";
  teachers?: any[];
  onEditPost?: (item: any) => void;
  onOpenRatingModal?: (item: any, mode: "RATING" | "APPLICATION" | "REPORT") => void;
  onOpenContributeModal?: (item: any, initialType?: any, helpRequest?: any) => void;
  onOpenSkillDetail?: (skillId: string) => void;
  onJoinProject?: (projectId: string, title: string) => void;
  onRefresh?: () => void;
}

const REACTION_META: Record<
  string,
  { label: string; emoji: string; colorClass: string; bgClass: string }
> = {
  USEFUL: {
    label: "Hữu ích",
    emoji: "👍",
    colorClass: "text-[#159EAA]",
    bgClass: "bg-[#F0FDFA]",
  },
  LOVE: {
    label: "Yêu thích",
    emoji: "❤️",
    colorClass: "text-rose-600",
    bgClass: "bg-rose-50",
  },
  INSPIRED: {
    label: "Truyền cảm hứng",
    emoji: "💡",
    colorClass: "text-amber-600",
    bgClass: "bg-amber-50",
  },
  SUPPORT: {
    label: "Ủng hộ",
    emoji: "🙌",
    colorClass: "text-[#2878D9]",
    bgClass: "bg-sky-50",
  },
};

export function IdeaWallCard({
  item,
  currentUserId,
  currentUserName,
  isAdminOrCoordinator = false,
  layoutMode = "feed",
  teachers = [],
  onEditPost,
  onOpenRatingModal,
  onOpenContributeModal,
  onOpenSkillDetail,
  onJoinProject,
  onRefresh,
}: IdeaWallCardProps) {
  const [imgError, setImgError] = useState(false);
  const [expandedText, setExpandedText] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(
    layoutMode === "feed" || Boolean(item.previewComments && item.previewComments.length > 0)
  );
  const [focusCommentInput, setFocusCommentInput] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [appliedModalOpen, setAppliedModalOpen] = useState(false);
  const [appliedFeedback, setAppliedFeedback] = useState("");
  const [appliedCount, setAppliedCount] = useState<number>(
    Number(item.appliedCount || item.linkedSkill?.appliedCount || item.linkedProduct?.verifiedAppsCount || 0)
  );
  const [hasUserApplied, setHasUserApplied] = useState<boolean>(Boolean(item.hasUserApplied));

  const [reactionCount, setReactionCount] = useState<number>(Number(item.reactionCount || 0));
  const [userReaction, setUserReaction] = useState<string | null>(item.userReaction || null);
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(item.isSaved));
  const [commentCount, setCommentCount] = useState<number>(
    Number(item.activeCommentCount ?? item.commentCount ?? 0)
  );

  const isAuthor = item.authorId === currentUserId;
  const isSkill = item.postType === "SKILL" || Boolean(item.linkedSkill || item.linkedSkillId);
  const isProduct = item.postType === "AI_PRODUCT" || Boolean(item.linkedProduct);
  const isIdea = item.postType === "IDEA" || Boolean(item.linkedIdea);
  const isSeekingCollaborators =
    Boolean(item.isSeekingCollaborators) || item.postType === "PROJECT";

  const ratingLabel = isProduct ? "Hữu dụng" : "Tiềm năng";
  const avgRating = Number(item.displayRating || 0);
  const ratingCount = Number(item.displayRatingCount || 0);

  const descriptionText =
    item.content ||
    item.summary ||
    item.linkedProduct?.utilitySummary ||
    item.linkedIdea?.problemStatement ||
    "";
  const isLongDescription = descriptionText.length > (layoutMode === "feed" ? 280 : 140);

  const taggedTeacherItems = (item.mentionedUserIds || [])
    .map((uid: string) => teachers.find((t: any) => t.userId === uid))
    .filter(Boolean);

  const primaryHelpRequest =
    Array.isArray(item.openHelpRequests) && item.openHelpRequests.length > 0
      ? item.openHelpRequests[0]
      : null;

  const renderTextWithMentions = (raw: string) => {
    if (!raw) return null;
    const parts = raw.split(/(@[\p{L}\p{N}_]+(?:\s+[\p{L}\p{N}_]+){0,3})/gu);
    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={idx}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-[#E6F4F5] text-[#123E4A] font-bold"
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const formatTimeAgo = (iso?: string) => {
    if (!iso) return "Vừa xong";
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} ngày trước`;
    return new Date(iso).toLocaleDateString("vi-VN");
  };

  const handleSelectReaction = async (
    type: "USEFUL" | "LOVE" | "INSPIRED" | "SUPPORT" = "USEFUL"
  ) => {
    setReactionPickerOpen(false);
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleReaction",
          targetType: "POST",
          targetId: item.id,
          reactionType: type,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserReaction(data.currentReaction);
        setReactionCount(data.reactionCount);
      }
    } catch {
      // ignore
    }
  };

  const handleToggleSave = async () => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleSave",
          targetType: "POST",
          targetId: item.id,
          postId: item.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsSaved(Boolean(data.isSaved));
      }
    } catch {
      // ignore
    }
  };

  const handleOpenTrialLink = async () => {
    const product = item.linkedProduct;
    if (!product?.productUrl) return;
    if (product.status === "DISCONTINUED" || product.status === "MAINTENANCE") {
      return;
    }
    try {
      await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "openProductLink",
          productId: product.id,
        }),
      });
    } catch {
      // ignore
    }
    window.open(product.productUrl, "_blank", "noopener,noreferrer");
  };

  const handleShare = async () => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sharePost",
          sourcePostId: item.id,
          commentary: `Chia sẻ ý tưởng/sản phẩm hữu ích từ ${item.authorName}`,
        }),
      });
      if (res.ok && onRefresh) {
        onRefresh();
      }
    } catch {
      // ignore
    }
  };

  const handleConfirmApplied = async () => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirmApplied",
          postId: item.id,
          skillId: item.linkedSkillId || item.linkedSkill?.id || undefined,
          feedback: appliedFeedback,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAppliedCount(Number(data.appliedCount || appliedCount + 1));
        setHasUserApplied(true);
        setAppliedModalOpen(false);
        setAppliedFeedback("");
      }
    } catch {
      // ignore
    }
  };

  const handleSoftDelete = async () => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "softDeleteOrRestorePost",
          postId: item.id,
          mode: "DELETE",
        }),
      });
      if (res.ok && onRefresh) {
        onRefresh();
      }
    } catch {
      // ignore
    }
  };

  const handleTogglePin = async () => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adminAction",
          adminActionType: "PIN_POST",
          postId: item.id,
          isPinned: !item.isPinned,
          editorialLabel: !item.isPinned ? "Ghim nổi bật" : null,
        }),
      });
      if (res.ok && onRefresh) {
        onRefresh();
      }
    } catch {
      // ignore
    }
  };

  const activeReactionMeta = userReaction ? REACTION_META[userReaction] : null;
  const helpTypeBadge =
    primaryHelpRequest && CONTRIBUTION_TYPE_BADGES[primaryHelpRequest.supportType]
      ? CONTRIBUTION_TYPE_BADGES[primaryHelpRequest.supportType]
      : CONTRIBUTION_TYPE_BADGES.EXPERIMENT;

  // ============================================================================
  // CHẾ ĐỘ 1: BẢNG TIN (FEED CARD — DEFAULT)
  // ============================================================================
  if (layoutMode === "feed") {
    return (
      <article className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:shadow-md transition-shadow overflow-visible">
        {/* 1. Post Header */}
        <div className="px-4 pt-4 pb-2.5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Link
              href={`/teacher/skyline-connect/profile/${item.authorId}`}
              className="relative shrink-0 group"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#003B3A] to-[#159EAA] text-white text-sm font-extrabold flex items-center justify-center shadow-xs group-hover:opacity-95 transition-opacity">
                {item.authorAvatar ? (
                  <img
                    src={item.authorAvatar}
                    alt={item.authorName || "Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (item.authorName || "G").charAt(0).toUpperCase()
                )}
              </div>
              <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap leading-snug">
                <Link
                  href={`/teacher/skyline-connect/profile/${item.authorId}`}
                  className="text-[15px] font-bold text-slate-900 hover:underline"
                >
                  {item.authorName}
                </Link>

                <span className="text-xs text-slate-500">đã chia sẻ</span>

                {isSkill ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#003B3A] text-white">
                    <Puzzle className="w-3.5 h-3.5 text-[#5EEAD4]" />
                    <span>Skill môn học</span>
                  </span>
                ) : isProduct ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDFA] text-[#159EAA] border border-[#99F6E4]">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Ứng dụng / Sản phẩm AI</span>
                  </span>
                ) : isSeekingCollaborators ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <Users className="w-3.5 h-3.5" />
                    <span>Dự án tìm cộng sự</span>
                  </span>
                ) : isIdea ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <Lightbulb className="w-3.5 h-3.5 text-[#D6A74A]" />
                    <span>Ý tưởng dạy học</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-[#2878D9] border border-sky-200">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Học liệu & Trải nghiệm</span>
                  </span>
                )}

                {item.isActivelyBumped && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF9EC] text-[#78350F] border border-[#FCD34D] text-[11px] font-bold"
                    title="Bài viết vừa nhận được tương tác hoặc mảnh đóng góp mới"
                  >
                    <Flame className="w-3 h-3 text-amber-600" />
                    <span>Đang sôi nổi</span>
                  </span>
                )}

                {item.isPinned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003B3A] text-white text-[11px] font-semibold">
                    📌 {item.editorialLabel || "Biên tập chọn"}
                  </span>
                )}

                {taggedTeacherItems.length > 0 && (
                  <span className="text-xs text-slate-600 inline-flex items-center gap-1 flex-wrap">
                    <span>— cùng với</span>
                    {taggedTeacherItems.map((t: any) => (
                      <Link
                        key={t.userId}
                        href={`/teacher/skyline-connect/profile/${t.userId}`}
                        className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#E6F4F5] text-[#123E4A] font-bold hover:underline"
                      >
                        @{t.teacherName}
                      </Link>
                    ))}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span>{item.authorRole || "Giáo viên"}</span>
                <span>•</span>
                <span className="font-medium text-slate-600">{item.campusName || "Sky-Line"}</span>
                <span>•</span>
                <span className="tabular-nums">
                  {formatTimeAgo(item.publishedAt || item.createdAt)}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-0.5 text-slate-400">
                  {item.visibility === "GROUP" ? (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Nhóm chuyên môn</span>
                    </>
                  ) : item.visibility === "DEPARTMENT" ? (
                    <>
                      <BookOpen className="w-3 h-3" />
                      <span>Tổ chuyên môn</span>
                    </>
                  ) : item.visibility === "CAMPUS" ? (
                    <>
                      <Building2 className="w-3 h-3" />
                      <span>Trong cơ sở</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3 h-3" />
                      <span>Toàn hệ thống</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Context Menu Button (•••) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="w-8 h-8 rounded-full text-slate-500 hover:bg-[#F0F2F5] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Tùy chọn bài đăng"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-30 w-52 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 text-xs">
                {isAuthor && onEditPost && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEditPost(item);
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#159EAA]" />
                    <span>Chỉnh sửa bài đăng</span>
                  </button>
                )}
                {onOpenRatingModal && (isIdea || isProduct) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenRatingModal(item, "RATING");
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5 text-[#D6A74A]" />
                    <span>Chấm sao {ratingLabel.toLowerCase()}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleToggleSave();
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#003B3A]" />
                  <span>{isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"}</span>
                </button>
                {isAdminOrCoordinator && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleTogglePin();
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-[#003B3A] font-semibold cursor-pointer"
                  >
                    <span>📌</span>
                    <span>{item.isPinned ? "Bỏ ghim bài" : "Ghim bài nổi bật"}</span>
                  </button>
                )}
                {(isAuthor || isAdminOrCoordinator) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleSoftDelete();
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-700 font-semibold cursor-pointer"
                  >
                    <span>🗑️</span>
                    <span>Xóa bài (có thể khôi phục)</span>
                  </button>
                )}
                {onOpenRatingModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenRatingModal(item, "REPORT");
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-rose-600 font-semibold cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Báo cáo nội dung</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. Post Text Content */}
        <div className="px-4 pb-3 space-y-2">
          {item.title && (
            <Link
              href={`/teacher/skyline-connect/posts/${item.id}`}
              className="block text-[17px] font-bold text-slate-900 hover:text-[#159EAA] transition-colors leading-snug"
            >
              {item.title}
            </Link>
          )}

          {descriptionText && (
            <div className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-line">
              <p className={expandedText ? "" : "line-clamp-4"}>
                {renderTextWithMentions(descriptionText)}
              </p>
              {isLongDescription && (
                <button
                  type="button"
                  onClick={() => setExpandedText((v) => !v)}
                  className="text-sm font-bold text-slate-600 hover:underline mt-1 cursor-pointer"
                >
                  {expandedText ? "Thu gọn" : "Xem thêm"}
                </button>
              )}
            </div>
          )}

          {/* Subject / Grade / Topic Hashtags */}
          {((item.subjectCodes && item.subjectCodes.length > 0) ||
            (item.gradeLevels && item.gradeLevels.length > 0) ||
            (item.tags && item.tags.length > 0)) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(item.subjectCodes || []).map((sc: string) => (
                <span
                  key={`subj-${sc}`}
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-[#F0F2F5] text-slate-700"
                >
                  📚 {sc}
                </span>
              ))}
              {(item.gradeLevels || []).map((gl: string) => (
                <span
                  key={`grade-${gl}`}
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-[#F0F2F5] text-slate-700"
                >
                  🎓 {gl}
                </span>
              ))}
              {(item.tags || []).map((tag: string, idx: number) => (
                <span
                  key={`tag-${idx}`}
                  className="text-xs font-semibold text-[#159EAA] hover:underline cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 3. Media Cover */}
        {item.coverImageUrl && !imgError ? (
          <div className="w-full max-h-[420px] overflow-hidden bg-slate-100 border-y border-slate-100">
            <img
              src={item.coverImageUrl}
              alt={item.title || "Ảnh minh họa bài viết"}
              onError={() => setImgError(true)}
              className="w-full max-h-[420px] object-cover"
            />
          </div>
        ) : null}

        {/* 3b. "Đang cần một đồng nghiệp..." Callout on Card */}
        {primaryHelpRequest && (
          <div className="mx-4 mt-3 mb-2 rounded-xl border border-[#99F6E4] bg-gradient-to-r from-[#F0FDFA] to-[#F8FAFC] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#003B3A]">
                  <Users className="w-3.5 h-3.5 text-[#159EAA]" />
                  <span>Đang cần một đồng nghiệp...</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${helpTypeBadge.bg} ${helpTypeBadge.text} ${helpTypeBadge.border}`}
                >
                  <span>{helpTypeBadge.emoji}</span>
                  <span>{helpTypeBadge.label}</span>
                </span>
                {(primaryHelpRequest.subjectCode || primaryHelpRequest.gradeLevel) && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    {[primaryHelpRequest.subjectCode, primaryHelpRequest.gradeLevel]
                      .filter(Boolean)
                      .join(" • ")}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-800 mt-1 line-clamp-1">
                {primaryHelpRequest.title}
              </p>
            </div>
            {onOpenContributeModal && (
              <button
                type="button"
                onClick={() =>
                  onOpenContributeModal(
                    item,
                    primaryHelpRequest.supportType || "EXPERIMENT",
                    primaryHelpRequest
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#003B3A] text-[#003B3A] hover:text-white border border-[#003B3A]/25 text-xs font-bold shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                <Puzzle className="w-3.5 h-3.5 text-[#159EAA]" />
                <span>Tôi có thể giúp</span>
              </button>
            )}
          </div>
        )}

        {/* Interactive Attachment Card for AI Product or Project */}
        {(isProduct || isSeekingCollaborators) && (
          <div className="mx-4 mt-2 mb-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isProduct
                    ? "bg-gradient-to-br from-[#003B3A] to-[#159EAA] text-white"
                    : "bg-[#F0FDFA] border border-[#99F6E4] text-[#003B3A]"
                }`}
              >
                {isProduct ? (
                  <Bot className="w-6 h-6 text-[#5EEAD4]" />
                ) : (
                  <Users className="w-5 h-5 text-[#159EAA]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#003B3A]">
                    {isProduct
                      ? `Công cụ / Sản phẩm AI ${
                          item.linkedProduct?.currentVersion
                            ? `(v${item.linkedProduct.currentVersion})`
                            : ""
                        }`
                      : "Kêu gọi hợp tác & tìm cộng sự phát triển"}
                  </span>
                  {item.linkedProject?.memberCount > 1 && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 tabular-nums">
                      +{item.linkedProject.memberCount} thành viên
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                  {isProduct
                    ? item.linkedProduct?.utilitySummary ||
                      "Trải nghiệm trực tiếp sản phẩm và góp một mảnh cải tiến cho tác giả."
                    : item.linkedProject?.neededRoles && item.linkedProject.neededRoles.length > 0
                    ? `Vị trí đang mời: ${item.linkedProject.neededRoles.join(" • ")}`
                    : "Mời các Thầy/Cô cùng tham gia đóng góp học liệu và phát triển dự án."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {isProduct && item.linkedProduct && (
                <>
                  {item.linkedProduct.status === "DISCONTINUED" ||
                  item.linkedProduct.status === "MAINTENANCE" ? (
                    <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-200/70 text-slate-600">
                      {item.linkedProduct.status === "MAINTENANCE"
                        ? "Đang bảo trì"
                        : "Ngừng hỗ trợ"}
                    </span>
                  ) : item.linkedProduct.productUrl ? (
                    <button
                      type="button"
                      onClick={handleOpenTrialLink}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#159EAA] hover:bg-[#11828C] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      <span>Dùng thử</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  ) : null}

                  {!isAuthor && onOpenRatingModal && (
                    <button
                      type="button"
                      onClick={() => onOpenRatingModal(item, "APPLICATION")}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-teal-50 text-[#00736E] border border-[#99F6E4] text-xs font-bold transition-colors cursor-pointer"
                      title="Xác nhận trải nghiệm áp dụng thực tế trong lớp học / công việc"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Xác nhận áp dụng</span>
                    </button>
                  )}
                </>
              )}

              {isSeekingCollaborators && item.linkedProject && onJoinProject && (
                <button
                  type="button"
                  onClick={() => onJoinProject(item.linkedProject.id, item.title)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#123E4A] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  <span>Tham gia dự án</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. Social Stats Strip */}
        <div className="px-4 py-2 flex items-center justify-between gap-2 text-xs text-slate-500 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1">
                <span className="w-5 h-5 rounded-full bg-[#159EAA] text-white text-[10px] inline-flex items-center justify-center ring-2 ring-white">
                  👍
                </span>
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] inline-flex items-center justify-center ring-2 ring-white">
                  💡
                </span>
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] inline-flex items-center justify-center ring-2 ring-white">
                  ❤️
                </span>
              </div>
              <span className="font-semibold text-slate-600 tabular-nums">
                {reactionCount > 0 ? `${reactionCount} lượt tương tác` : "Hãy là người đầu tiên thả cảm xúc"}
              </span>
            </div>

            {(isIdea || isProduct) && (
              <button
                type="button"
                onClick={() => onOpenRatingModal && onOpenRatingModal(item, "RATING")}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-slate-800 font-semibold transition-colors cursor-pointer tabular-nums"
              >
                <Star className="w-3.5 h-3.5 fill-[#D6A74A] text-[#D6A74A]" />
                <span className="font-bold">
                  {ratingCount > 0 ? avgRating.toFixed(1) : "Chấm sao"}
                </span>
                <span className="text-slate-500">
                  ({ratingCount} đánh giá {ratingLabel.toLowerCase()})
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 tabular-nums">
            <button
              type="button"
              onClick={() => {
                setCommentsOpen((v) => !v);
                setFocusCommentInput(true);
              }}
              className="hover:underline cursor-pointer"
            >
              {commentCount} trao đổi
            </button>
            {item.contributionCount > 0 && (
              <span className="text-[#00736E] font-semibold">
                • 🧩 {item.contributionCount} mảnh đóng góp
              </span>
            )}
            {item.linkedProduct?.verifiedAppsCount > 0 && (
              <span>• {item.linkedProduct.verifiedAppsCount} GV đã áp dụng</span>
            )}
          </div>
        </div>

        {/* 5. Mandatory Action Bar: Hữu ích · Bình luận · Góp một mảnh · Chia sẻ · Lưu (+ Dùng thử cho Sản phẩm) */}
        <div className="mx-4 border-y border-slate-200/80 py-1 flex items-center justify-between gap-1 flex-wrap relative">
          {/* Action 1: Hữu ích (+ Hover Reaction Picker) */}
          <div
            className="relative flex-1 min-w-[90px]"
            onMouseEnter={() => setReactionPickerOpen(true)}
            onMouseLeave={() => setReactionPickerOpen(false)}
          >
            {reactionPickerOpen && (
              <div className="absolute -top-11 left-0 z-30 bg-white rounded-full shadow-lg border border-slate-200 px-2.5 py-1 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                {(["USEFUL", "LOVE", "INSPIRED", "SUPPORT"] as const).map((rType) => {
                  const meta = REACTION_META[rType];
                  return (
                    <button
                      key={rType}
                      type="button"
                      onClick={() => handleSelectReaction(rType)}
                      title={meta.label}
                      className="hover:scale-125 transition-transform px-1.5 py-0.5 rounded-full hover:bg-slate-100 flex items-center gap-1 text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      <span className="text-base">{meta.emoji}</span>
                      <span className="text-[11px] text-slate-700 hidden sm:inline">
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => handleSelectReaction((userReaction as any) || "USEFUL")}
              className={`w-full py-2 px-2 rounded-xl hover:bg-[#F0F2F5] flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-bold transition-colors cursor-pointer ${
                activeReactionMeta ? activeReactionMeta.colorClass : "text-slate-600"
              }`}
            >
              {activeReactionMeta ? (
                <>
                  <span>{activeReactionMeta.emoji}</span>
                  <span>{activeReactionMeta.label}</span>
                </>
              ) : (
                <>
                  <ThumbsUp className="w-4 h-4" />
                  <span>Hữu ích</span>
                </>
              )}
            </button>
          </div>

          {/* Action 2: Bình luận */}
          <button
            type="button"
            onClick={() => {
              setCommentsOpen(true);
              setFocusCommentInput(true);
            }}
            className="flex-1 min-w-[95px] py-2 px-2 rounded-xl hover:bg-[#F0F2F5] flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-bold text-slate-600 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Bình luận</span>
          </button>

          {/* Action 3: Góp một mảnh (Primary Co-Creation Action) */}
          <button
            type="button"
            onClick={() =>
              onOpenContributeModal
                ? onOpenContributeModal(item)
                : setCommentsOpen(true)
            }
            className="flex-1 min-w-[125px] py-2 px-2.5 rounded-xl bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#003B3A] border border-[#99F6E4]/80 flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-extrabold transition-colors cursor-pointer"
          >
            <Puzzle className="w-4 h-4 text-[#159EAA]" />
            <span>Góp một mảnh</span>
          </button>

          {/* Optional Action for Skill: Mở Skill */}
          {isSkill && (item.linkedSkillId || item.linkedSkill?.id) && onOpenSkillDetail && (
            <button
              type="button"
              onClick={() => onOpenSkillDetail(item.linkedSkillId || item.linkedSkill?.id)}
              className="py-2 px-2.5 rounded-xl bg-[#003B3A] text-white flex items-center justify-center gap-1 text-xs font-bold transition-colors cursor-pointer"
            >
              <Puzzle className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span>Xem Skill</span>
            </button>
          )}

          {/* Optional Action for AI Product: Dùng thử */}
          {isProduct && (item.linkedProduct?.productUrl || item.demoUrl) && (
            <button
              type="button"
              onClick={handleOpenTrialLink}
              className="py-2 px-2.5 rounded-xl hover:bg-teal-50 text-[#00736E] flex items-center justify-center gap-1 text-xs sm:text-[13px] font-bold transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Dùng thử</span>
            </button>
          )}

          {/* Action: Xác nhận Đã áp dụng */}
          <button
            type="button"
            onClick={() => setAppliedModalOpen((v) => !v)}
            className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1 text-xs sm:text-[13px] font-bold transition-colors cursor-pointer tabular-nums ${
              hasUserApplied
                ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                : "hover:bg-[#F0F2F5] text-slate-600"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã áp dụng ({appliedCount})</span>
          </button>

          {/* Action 4: Chia sẻ */}
          <button
            type="button"
            onClick={handleShare}
            title="Chia sẻ bài đăng"
            className="py-2 px-2.5 rounded-xl hover:bg-[#F0F2F5] flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-bold text-slate-600 transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden md:inline">Chia sẻ</span>
          </button>

          {/* Action 5: Lưu */}
          <button
            type="button"
            onClick={handleToggleSave}
            className={`py-2 px-2.5 rounded-xl hover:bg-[#F0F2F5] flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-bold transition-colors cursor-pointer ${
              isSaved ? "text-[#159EAA]" : "text-slate-600"
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-[#159EAA]" : ""}`} />
            <span className="hidden md:inline">{isSaved ? "Đã lưu" : "Lưu"}</span>
          </button>
        </div>

        {/* Inline Applied Confirmation Box */}
        {appliedModalOpen && (
          <div className="mx-4 mt-2 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <div className="text-xs font-bold text-[#059669]">
              Xác nhận Đã áp dụng vào thực tế giảng dạy (kèm phản hồi tùy chọn)
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={appliedFeedback}
                onChange={(e) => setAppliedFeedback(e.target.value)}
                placeholder="Chia sẻ ngắn hiệu quả hoặc lưu ý khi áp dụng trên lớp (tùy chọn)..."
                className="flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={handleConfirmApplied}
                className="px-3 py-1.5 rounded-lg bg-[#059669] text-white text-xs font-bold cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        )}

        {/* 6. Inline Comment & Co-Creation Thread Section */}
        {commentsOpen && (
          <div className="px-4 pb-4">
            <CommentThreadSection
              postId={item.id}
              postAuthorId={item.authorId}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              linkedProductId={item.linkedProduct?.id || null}
              linkedProjectId={item.linkedProject?.id || null}
              initialComments={item.previewComments || []}
              totalCommentCount={commentCount}
              contributionCount={Number(item.contributionCount || 0)}
              isCompactPreview={true}
              autoFocusInput={focusCommentInput}
              teachers={teachers}
              onCommentCountChange={(cnt) => setCommentCount(cnt)}
              onOpenContributeModal={
                onOpenContributeModal ? () => onOpenContributeModal(item) : undefined
              }
              onRefreshPost={onRefresh}
            />
          </div>
        )}
      </article>
    );
  }

  // ============================================================================
  // CHẾ ĐỘ 2: LƯỚI THẺ (COMPACT GRID CARD KHI CHỌN XEM DẠNG LƯỚI)
  // ============================================================================
  return (
    <article className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden">
      {item.coverImageUrl && !imgError ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
          <img
            src={item.coverImageUrl}
            alt={item.title || "Ảnh minh họa ý tưởng"}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
          {item.isActivelyBumped && (
            <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF9EC]/95 text-[#78350F] border border-[#FCD34D] text-[11px] font-bold shadow-xs">
              <Flame className="w-3 h-3 text-amber-600" />
              <span>Đang sôi nổi</span>
            </span>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-r from-[#003B3A] to-[#159EAA] px-4 py-3 text-white flex items-center justify-between">
          <span className="text-xs font-bold flex items-center gap-1.5">
            {isProduct ? (
              <>
                <Bot className="w-4 h-4 text-[#5EEAD4]" />
                <span>Sản phẩm AI</span>
              </>
            ) : isSeekingCollaborators ? (
              <>
                <Users className="w-4 h-4 text-amber-300" />
                <span>Dự án tìm cộng sự</span>
              </>
            ) : (
              <>
                <Lightbulb className="w-4 h-4 text-[#D6A74A]" />
                <span>Ý tưởng dạy học</span>
              </>
            )}
          </span>
          <span className="text-[11px] text-teal-100 tabular-nums">
            {formatTimeAgo(item.publishedAt || item.createdAt)}
          </span>
        </div>
      )}

      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#003B3A] text-white text-xs font-bold flex items-center justify-center shrink-0">
            {item.authorAvatar ? (
              <img
                src={item.authorAvatar}
                alt={item.authorName || "Avatar"}
                className="w-full h-full object-cover"
              />
            ) : (
              (item.authorName || "G").charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-800 truncate">{item.authorName}</div>
            <div className="text-[11px] text-slate-500 truncate">
              {item.authorRole || "Giáo viên"} • {item.campusName || "Sky-Line"}
            </div>
          </div>
        </div>

        <Link
          href={`/teacher/skyline-connect/posts/${item.id}`}
          className="text-[15px] font-bold text-[#0F172A] hover:text-[#159EAA] transition-colors leading-snug line-clamp-2"
        >
          {item.title || "Chia sẻ chuyên môn"}
        </Link>

        <div className="text-xs text-slate-600 leading-relaxed">
          <p className={expandedText ? "" : "line-clamp-3"}>{descriptionText}</p>
          {isLongDescription && (
            <button
              type="button"
              onClick={() => setExpandedText((v) => !v)}
              className="text-xs font-semibold text-[#159EAA] hover:underline mt-1 cursor-pointer"
            >
              {expandedText ? "Thu gọn" : "Xem thêm"}
            </button>
          )}
        </div>

        {primaryHelpRequest && (
          <div className="rounded-xl bg-[#F0FDFA] border border-[#99F6E4] px-2.5 py-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-[#003B3A] flex items-center gap-1">
                <span>{helpTypeBadge.emoji}</span>
                <span className="truncate">{primaryHelpRequest.title}</span>
              </div>
            </div>
            {onOpenContributeModal && (
              <button
                type="button"
                onClick={() =>
                  onOpenContributeModal(
                    item,
                    primaryHelpRequest.supportType || "EXPERIMENT",
                    primaryHelpRequest
                  )
                }
                className="px-2 py-1 rounded-lg bg-white text-[#003B3A] border border-[#003B3A]/20 text-[10px] font-bold shrink-0 cursor-pointer"
              >
                Tôi có thể giúp
              </button>
            )}
          </div>
        )}

        {/* Grid Card Action Strip: Hữu ích · Bình luận · Góp một mảnh · Chia sẻ · Lưu (+ Dùng thử) */}
        <div className="flex items-center justify-between gap-1.5 pt-2.5 border-t border-slate-100 mt-auto flex-wrap text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectReaction("USEFUL")}
              className={`inline-flex items-center gap-1 font-bold cursor-pointer tabular-nums ${
                userReaction ? "text-[#159EAA]" : "hover:text-slate-900"
              }`}
              title="Hữu ích"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Hữu ích ({reactionCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCommentsOpen((v) => !v);
                setFocusCommentInput(true);
              }}
              className="inline-flex items-center gap-1 font-bold hover:text-slate-900 cursor-pointer tabular-nums"
              title="Bình luận"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{commentCount}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {onOpenContributeModal && (
              <button
                type="button"
                onClick={() => onOpenContributeModal(item)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#003B3A] border border-[#99F6E4] text-[11px] font-bold cursor-pointer"
              >
                <Puzzle className="w-3 h-3 text-[#159EAA]" />
                <span>Góp một mảnh</span>
              </button>
            )}
            {isProduct && item.linkedProduct?.productUrl && (
              <button
                type="button"
                onClick={handleOpenTrialLink}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#159EAA] text-white text-[11px] font-bold cursor-pointer"
              >
                <span>Dùng thử</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              title="Chia sẻ"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleToggleSave}
              className={`p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer ${
                isSaved ? "text-[#159EAA]" : "text-slate-500"
              }`}
              title="Lưu"
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-[#159EAA]" : ""}`} />
            </button>
          </div>
        </div>

        {commentsOpen && (
          <CommentThreadSection
            postId={item.id}
            postAuthorId={item.authorId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            linkedProductId={item.linkedProduct?.id || null}
            linkedProjectId={item.linkedProject?.id || null}
            initialComments={item.previewComments || []}
            totalCommentCount={commentCount}
            contributionCount={Number(item.contributionCount || 0)}
            isCompactPreview={true}
            autoFocusInput={focusCommentInput}
            teachers={teachers}
            onCommentCountChange={(cnt) => setCommentCount(cnt)}
            onOpenContributeModal={
              onOpenContributeModal ? () => onOpenContributeModal(item) : undefined
            }
            onRefreshPost={onRefresh}
          />
        )}
      </div>
    </article>
  );
}
