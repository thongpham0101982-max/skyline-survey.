"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Star,
  ExternalLink,
  CheckCircle2,
  GitBranch,
  History,
  FileCheck2,
  AlertCircle,
  Lock,
  Bot,
  Lightbulb,
  Users,
  Edit3,
  Award,
  Puzzle,
  Bell,
  BellOff,
  Plus,
  Sparkles,
  Clock,
} from "lucide-react";
import { SkylineConnectSubNav } from "@/components/skyline-connect/SkylineConnectSubNav";
import {
  CommentThreadSection,
  CONTRIBUTION_TYPE_BADGES,
} from "@/components/skyline-connect/CommentThreadSection";
import { RatingAndApplicationModal } from "@/components/skyline-connect/RatingAndApplicationModal";
import { PostComposerModal } from "@/components/skyline-connect/PostComposerModal";
import { ContributePieceModal } from "@/components/skyline-connect/ContributePieceModal";

function PostDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = String(params?.id || "");
  const highlightCommentId = searchParams?.get("commentId") || null;

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"OK" | "NOT_FOUND" | "PERMISSION_DENIED" | "ERROR">("OK");
  const [data, setData] = useState<any>(null);
  const [showRevisions, setShowRevisions] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // "Góp một mảnh sáng tạo" Modal state
  const [contributeModalState, setContributeModalState] = useState<{
    isOpen: boolean;
    initialType?: any;
    linkedHelpRequest?: any;
  } | null>(null);

  // Help request creation form state (for post author)
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [helpTitle, setHelpTitle] = useState("");
  const [helpType, setHelpType] = useState<
    "METHOD" | "MATERIAL" | "EXPERIMENT" | "SKILL" | "CONNECTION"
  >("EXPERIMENT");
  const [helpSubject, setHelpSubject] = useState("");
  const [helpGrade, setHelpGrade] = useState("");
  const [helpTimeframe, setHelpTimeframe] = useState("");
  const [creatingHelp, setCreatingHelp] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/skyline-connect?action=detail&postId=${postId}`);
      if (res.status === 404) {
        setStatus("NOT_FOUND");
        return;
      }
      if (res.status === 403) {
        setStatus("PERMISSION_DENIED");
        return;
      }
      if (!res.ok) {
        setStatus("ERROR");
        return;
      }
      const json = await res.json();
      setData(json);
      setStatus("OK");
    } catch {
      setStatus("ERROR");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleOpenTrialLink = async (product: any) => {
    if (!product?.productUrl) return;
    await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "openProductLink",
        productId: product.id,
      }),
    }).catch(() => null);
    window.open(product.productUrl, "_blank", "noopener,noreferrer");
    loadDetail();
  };

  const handleToggleContributorOptOut = async (versionId: string, optOut: boolean) => {
    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggleContributorOptOut",
        versionId,
        optOut,
      }),
    });
    if (res.ok) {
      showToast(
        optOut
          ? "Đã ẩn tên của Thầy/Cô khỏi danh sách ghi nhận công khai trên phiên bản này."
          : "Đã bật hiển thị tên đóng góp công khai."
      );
      loadDetail();
    }
  };

  const handleToggleMutePostNotifications = async (mute: boolean) => {
    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggleSave",
        targetType: "POST",
        targetId: postId,
        postId,
        muteNotifications: mute,
      }),
    });
    if (res.ok) {
      showToast(
        mute
          ? "Đã tắt thông báo cho bài viết này."
          : "Đã bật nhận thông báo khi có trao đổi hoặc cập nhật mới."
      );
      loadDetail();
    }
  };

  const handleCreateHelpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpTitle.trim() || creatingHelp) return;
    setCreatingHelp(true);
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "helpRequestAction",
          subAction: "CREATE",
          postId,
          title: helpTitle.trim(),
          supportType: helpType,
          subjectCode: helpSubject || null,
          gradeLevel: helpGrade || null,
          expectedTimeframe: helpTimeframe.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setHelpTitle("");
      setHelpTimeframe("");
      setShowHelpForm(false);
      showToast("Đã tạo lời mời “Đang cần một đồng nghiệp…” trên bài đăng!");
      loadDetail();
    } catch (err: any) {
      showToast(err?.message || "Không thể tạo lời mời hỗ trợ.");
    } finally {
      setCreatingHelp(false);
    }
  };

  const handleUpdateHelpRequestStatus = async (
    helpRequestId: string,
    nextStatus: "OPEN" | "CONNECTED" | "CLOSED"
  ) => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "helpRequestAction",
          subAction: "UPDATE_STATUS",
          helpRequestId,
          status: nextStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      showToast("Đã cập nhật trạng thái lời mời hỗ trợ!");
      loadDetail();
    } catch (err: any) {
      showToast(err?.message || "Không thể cập nhật trạng thái lời mời.");
    }
  };

  const handleNominateForPeriod = async () => {
    const period = data?.catalogs?.awardPeriods?.[0];
    if (!period) {
      showToast("Hiện chưa có kỳ Bảng vàng đang mở đăng ký.");
      return;
    }
    const post = data?.post;
    const isProd = post?.postType === "AI_PRODUCT" || Boolean(post?.linkedProduct);
    const targetId = isProd ? post?.linkedProduct?.id : post?.linkedIdea?.id;
    if (!targetId) return;

    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "registerNomination",
        periodId: period.id,
        targetType: isProd ? "PRODUCT" : "IDEA",
        targetId,
        improvementSummary: "Đăng ký tham gia Bảng vàng sáng tạo trong kỳ",
      }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast(`Đã đăng ký tham gia kỳ Bảng vàng: ${period.name}!`);
    } else {
      showToast(json.message || "Không thể đăng ký dự giải.");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Đang tải chi tiết bài đăng trên Sky-Line Connect...
      </div>
    );
  }

  if (status === "PERMISSION_DENIED") {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-white rounded-2xl border border-amber-200 p-8 text-center space-y-3">
        <Lock className="w-8 h-8 text-amber-600 mx-auto" />
        <h2 className="text-base font-bold text-[#003B3A]">Nội dung thuộc phạm vi hạn chế</h2>
        <p className="text-xs text-slate-600">
          Bài đăng này thuộc nhóm chuyên môn riêng tư hoặc cơ sở khác mà Thầy/Cô chưa có quyền truy cập.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-bold cursor-pointer"
        >
          ← Quay lại Bức tường ý tưởng AI
        </button>
      </div>
    );
  }

  if (status === "NOT_FOUND" || status === "ERROR" || !data?.post) {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h2 className="text-base font-bold text-[#003B3A]">Không tìm thấy bài đăng</h2>
        <button
          type="button"
          onClick={() => router.push("/teacher/skyline-connect")}
          className="px-4 py-2 rounded-xl bg-[#159EAA] text-white text-xs font-bold cursor-pointer"
        >
          Về Bức tường ý tưởng AI
        </button>
      </div>
    );
  }

  const post = data.post;
  const currentUserId = data.currentUser?.userId || "";
  const currentUserName = data.currentUser?.fullName || "Giáo viên Sky-Line";
  const isAuthor = post.authorId === currentUserId;
  const canManageFeedback =
    isAuthor ||
    Boolean(data.currentUser?.permissions?.isAdmin) ||
    Boolean(data.currentUser?.permissions?.isCoordinator);
  const isProduct = post.postType === "AI_PRODUCT" || Boolean(post.linkedProduct);
  const isIdea = post.postType === "IDEA" || Boolean(post.linkedIdea);

  const avgRating = Number(
    post.linkedProduct?.avgRating ?? post.linkedIdea?.avgRating ?? 0
  );
  const ratingCount = Number(
    post.linkedProduct?.validRatingCount ?? post.linkedIdea?.validRatingCount ?? 0
  );

  const helpRequests: any[] = post.helpRequests || [];
  const spreadJourney: any[] = post.spreadJourney || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] -m-4 sm:-m-6 p-4 sm:p-6 space-y-5 text-slate-800">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#003B3A] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg">
          {toastMsg}
        </div>
      )}

      <SkylineConnectSubNav
        showAdminLink={Boolean(data.currentUser?.permissions?.isAdmin)}
      />

      {/* Back & Action Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-[#003B3A] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại tường (giữ bộ lọc)</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleToggleMutePostNotifications(!post.muteNotifications)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            title="Bật/Tắt thông báo cho bài viết này"
          >
            {post.muteNotifications ? (
              <>
                <BellOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Đã tắt thông báo bài này</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5 text-[#159EAA]" />
                <span>Đang nhận thông báo</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setContributeModalState({ isOpen: true, initialType: "METHOD" })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00736E] hover:bg-[#003B3A] text-white text-xs font-extrabold shadow-xs cursor-pointer"
          >
            <Puzzle className="w-4 h-4 text-[#5EEAD4]" />
            <span>Góp một mảnh sáng tạo</span>
          </button>

          {isAuthor && (isIdea || isProduct) && (
            <button
              type="button"
              onClick={handleNominateForPeriod}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold cursor-pointer"
            >
              <Award className="w-4 h-4 text-[#D6A74A]" />
              <span>Đăng ký dự kỳ Bảng vàng</span>
            </button>
          )}
          {isAuthor && (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-bold cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Chỉnh sửa bài đăng</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Post Detail Card */}
      <article className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F0FDFA] text-[#159EAA] border border-[#99F6E4]">
                {isProduct ? (
                  <>
                    <Bot className="w-3.5 h-3.5" />
                    <span>Sản phẩm AI</span>
                  </>
                ) : isIdea ? (
                  <>
                    <Lightbulb className="w-3.5 h-3.5 text-[#D6A74A]" />
                    <span>Ý tưởng dạy học</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    <span>{post.postType}</span>
                  </>
                )}
              </span>

              {(post.subjectCodes || []).map((sc: string) => (
                <span
                  key={sc}
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700"
                >
                  Môn: {sc}
                </span>
              ))}
              {(post.gradeLevels || []).map((gl: string) => (
                <span
                  key={gl}
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800"
                >
                  {gl}
                </span>
              ))}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-[#003B3A]">
              {post.title || "Chia sẻ chuyên môn"}
            </h1>

            <div className="text-xs text-slate-500">
              Tác giả: <strong className="text-slate-800">{post.authorName}</strong> •{" "}
              {post.campusName || "Hệ thống Sky-Line"} • Phiên bản bài v{post.versionNumber || 1}
              {post.revisions && post.revisions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRevisions((v) => !v)}
                  className="ml-2 inline-flex items-center gap-1 text-[#159EAA] hover:underline font-semibold cursor-pointer"
                >
                  <History className="w-3 h-3" />
                  <span>Lịch sử chỉnh sửa ({post.revisions.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Rating & Primary Action Box */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {(isIdea || isProduct) && (
              <div className="flex items-center gap-2 bg-amber-50/90 border border-amber-200 px-3.5 py-2 rounded-xl tabular-nums">
                <Star className="w-5 h-5 fill-[#D6A74A] text-[#D6A74A]" />
                <div>
                  <div className="text-sm font-extrabold text-[#003B3A]">
                    {ratingCount > 0 ? `${avgRating.toFixed(2)} / 5.0` : "Chưa có sao"}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {ratingCount} đánh giá ({isProduct ? "Hữu dụng" : "Tiềm năng"})
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {(isIdea || isProduct) && !isAuthor && (
                <button
                  type="button"
                  onClick={() =>
                    setModalConfig({
                      isOpen: true,
                      mode: "RATING",
                      targetType: isProduct ? "PRODUCT" : "IDEA",
                      targetId: isProduct ? post.linkedProduct?.id : post.linkedIdea?.id,
                      targetTitle: post.title,
                      postId: post.id,
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-bold cursor-pointer"
                >
                  ★ Đánh giá sao
                </button>
              )}

              {isProduct && post.linkedProduct && (
                <>
                  {post.linkedProduct.productUrl &&
                    post.linkedProduct.status !== "DISCONTINUED" &&
                    post.linkedProduct.status !== "MAINTENANCE" && (
                      <button
                        type="button"
                        onClick={() => handleOpenTrialLink(post.linkedProduct)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#159EAA] hover:bg-[#11828C] text-white text-xs font-bold cursor-pointer tabular-nums"
                      >
                        <span>Dùng thử ({post.linkedProduct.openLinkCount || 0} lượt mở)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}

                  {!isAuthor && (
                    <button
                      type="button"
                      onClick={() =>
                        setModalConfig({
                          isOpen: true,
                          mode: "APPLICATION",
                          targetType: "PRODUCT",
                          targetId: post.linkedProduct.id,
                          targetTitle: post.title,
                          postId: post.id,
                        })
                      }
                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#F0FDFA] text-[#00736E] border border-[#99F6E4] text-xs font-bold cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tôi đã áp dụng</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Revision History Drawer */}
        {showRevisions && post.revisions && post.revisions.length > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="font-bold text-[#003B3A]">Lịch sử chỉnh sửa bài đăng</div>
            {post.revisions.map((rev: any) => (
              <div key={rev.id} className="p-2 rounded bg-white border border-slate-200/80">
                <span className="font-semibold">Phiên bản v{rev.versionNumber}:</span>{" "}
                <span className="text-slate-600">{rev.changeNote || "Chỉnh sửa nội dung"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main Content & Structured Fields */}
        <div className="space-y-4 text-sm leading-relaxed text-slate-700">
          {post.summary && (
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 font-medium text-slate-800">
              {post.summary}
            </div>
          )}

          <div className="whitespace-pre-line">{post.content}</div>

          {/* Idea Specific Details */}
          {post.linkedIdea && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
              {post.linkedIdea.problemStatement && (
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <div className="font-bold text-[#003B3A] mb-1">Vấn đề thực tế cần giải quyết</div>
                  <p>{post.linkedIdea.problemStatement}</p>
                </div>
              )}
              {post.linkedIdea.aiSupportStep && (
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <div className="font-bold text-[#003B3A] mb-1">Khâu AI hoặc công nghệ hỗ trợ</div>
                  <p>{post.linkedIdea.aiSupportStep}</p>
                </div>
              )}
              {post.linkedIdea.feedbackQuestions && (
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
                  <div className="font-bold text-amber-900 mb-1">Câu hỏi mong đồng nghiệp góp ý</div>
                  <p>{post.linkedIdea.feedbackQuestions}</p>
                </div>
              )}
              {post.linkedIdea.usageCautionNote && (
                <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200">
                  <div className="font-bold text-[#00736E] mb-1">Lưu ý thận trọng khi áp dụng</div>
                  <p>{post.linkedIdea.usageCautionNote}</p>
                </div>
              )}
            </div>
          )}

          {/* Section 8: "Đang cần một đồng nghiệp..." */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F0FDFA] to-[#F8FAFC] border border-[#99F6E4] space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#003B3A] text-white flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-[#5EEAD4]" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-[#003B3A]">
                    Đang cần một đồng nghiệp…
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Lời mời ngắn từ tác giả để đồng nghiệp cùng thử nghiệm, bổ sung học liệu hoặc hỗ trợ kỹ năng
                  </p>
                </div>
              </div>

              {canManageFeedback && (
                <button
                  type="button"
                  onClick={() => setShowHelpForm((v) => !v)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 text-[#003B3A] border border-[#003B3A]/20 font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#159EAA]" />
                  <span>{showHelpForm ? "Đóng biểu mẫu" : "Tạo lời mời hỗ trợ"}</span>
                </button>
              )}
            </div>

            {showHelpForm && canManageFeedback && (
              <form
                onSubmit={handleCreateHelpRequest}
                className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Cần hỗ trợ việc gì? *
                    </label>
                    <input
                      type="text"
                      required
                      value={helpTitle}
                      onChange={(e) => setHelpTitle(e.target.value)}
                      placeholder="VD: Giúp thử trò chơi ở lớp 4 / Bổ sung bộ câu hỏi Ôn tập"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Loại hỗ trợ *</label>
                    <select
                      value={helpType}
                      onChange={(e) => setHelpType(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <option value="EXPERIMENT">🧪 Thử nghiệm</option>
                      <option value="MATERIAL">📖 Học liệu</option>
                      <option value="METHOD">💡 Một cách làm</option>
                      <option value="SKILL">🛠️ Kỹ năng</option>
                      <option value="CONNECTION">🤝 Kết nối</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={helpSubject}
                    onChange={(e) => setHelpSubject(e.target.value)}
                    placeholder="Môn học (không bắt buộc)"
                    className="rounded-xl border border-slate-200 px-3 py-1.5"
                  />
                  <input
                    type="text"
                    value={helpGrade}
                    onChange={(e) => setHelpGrade(e.target.value)}
                    placeholder="Khối lớp (không bắt buộc)"
                    className="rounded-xl border border-slate-200 px-3 py-1.5"
                  />
                  <input
                    type="text"
                    value={helpTimeframe}
                    onChange={(e) => setHelpTimeframe(e.target.value)}
                    placeholder="Thời gian dự kiến (không bắt buộc)"
                    className="rounded-xl border border-slate-200 px-3 py-1.5"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHelpForm(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={creatingHelp}
                    className="px-3.5 py-1.5 rounded-lg bg-[#00736E] hover:bg-[#003B3A] text-white font-bold cursor-pointer"
                  >
                    {creatingHelp ? "Đang đăng..." : "Đăng lời mời"}
                  </button>
                </div>
              </form>
            )}

            {helpRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {helpRequests.map((hr: any) => {
                  const b =
                    CONTRIBUTION_TYPE_BADGES[hr.supportType] ||
                    CONTRIBUTION_TYPE_BADGES.EXPERIMENT;
                  return (
                    <div
                      key={hr.id}
                      className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${b.bg} ${b.text} ${b.border}`}
                          >
                            <span>{b.emoji}</span>
                            <span>{b.label}</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              hr.status === "OPEN"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : hr.status === "CONNECTED"
                                ? "bg-sky-50 text-sky-700 border-sky-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {hr.status === "OPEN"
                              ? "Đang tìm"
                              : hr.status === "CONNECTED"
                              ? `Đã kết nối${hr.connectedUserName ? ` (${hr.connectedUserName})` : ""}`
                              : "Đã đóng"}
                          </span>
                        </div>
                        <div className="font-bold text-[#003B3A] text-xs">{hr.title}</div>
                        {(hr.subjectCode || hr.gradeLevel || hr.expectedTimeframe) && (
                          <div className="text-[11px] text-slate-500">
                            {[
                              hr.subjectCode && `Môn: ${hr.subjectCode}`,
                              hr.gradeLevel && `Khối: ${hr.gradeLevel}`,
                              hr.expectedTimeframe && `Dự kiến: ${hr.expectedTimeframe}`,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        {hr.status === "OPEN" && (
                          <button
                            type="button"
                            onClick={() =>
                              setContributeModalState({
                                isOpen: true,
                                initialType: hr.supportType || "EXPERIMENT",
                                linkedHelpRequest: hr,
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00736E] hover:bg-[#003B3A] text-white text-xs font-bold cursor-pointer"
                          >
                            <Puzzle className="w-3.5 h-3.5 text-[#5EEAD4]" />
                            <span>Tôi có thể giúp</span>
                          </button>
                        )}

                        {canManageFeedback && (
                          <select
                            value={hr.status}
                            onChange={(e) =>
                              handleUpdateHelpRequestStatus(hr.id, e.target.value as any)
                            }
                            aria-label="Cập nhật trạng thái lời mời"
                            className="text-[11px] rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-700 bg-slate-50 ml-auto"
                          >
                            <option value="OPEN">Trạng thái: Đang tìm</option>
                            <option value="CONNECTED">Trạng thái: Đã kết nối</option>
                            <option value="CLOSED">Trạng thái: Đã đóng</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-600">
                Hiện bài viết chưa có lời mời hỗ trợ cụ thể. Thầy/Cô vẫn có thể nhấn{" "}
                <strong>“Góp một mảnh sáng tạo”</strong> bất kỳ lúc nào.
              </p>
            )}
          </div>

          {/* Product Versions & Contributor Credits + Applications */}
          {post.linkedProduct && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
              {/* Product Versions (Section 7: "Có đóng góp từ..." + link to source comment + opt-out) */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-2.5">
                <div className="font-bold text-[#003B3A] flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-[#159EAA]" />
                  <span>
                    Lịch sử phiên bản & Ghi nhận người đóng góp (Hiện tại: v
                    {post.linkedProduct.currentVersion})
                  </span>
                </div>
                {(post.linkedProduct.versions || []).map((ver: any) => (
                  <div
                    key={ver.id}
                    className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap font-bold text-slate-800">
                      <span className="tabular-nums">Phiên bản v{ver.version}</span>
                      {ver.contributorName && !ver.contributorOptOutPublic && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#00736E] border border-teal-200">
                          <Sparkles className="w-3 h-3 text-[#159EAA]" />
                          <span>Có đóng góp từ {ver.contributorName}</span>
                          {ver.sourceCommentId && (
                            <Link
                              href={`/teacher/skyline-connect/posts/${post.id}?commentId=${ver.sourceCommentId}#comment-${ver.sourceCommentId}`}
                              className="underline ml-1 text-[#003B3A] hover:text-[#159EAA]"
                            >
                              (Xem góp ý nguồn)
                            </Link>
                          )}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600">{ver.releaseNotes}</p>
                    {ver.contributorUserId === currentUserId && (
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleContributorOptOut(ver.id, !ver.contributorOptOutPublic)
                        }
                        className="text-[11px] font-semibold text-[#159EAA] hover:underline cursor-pointer"
                      >
                        {ver.contributorOptOutPublic
                          ? "Hiển thị lại tên của tôi trên bản ghi nhận công khai"
                          : "Bỏ hiển thị tên tôi trên bản ghi nhận công khai"}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Product Applications (Separating Verified vs Self-Declared) */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[#003B3A] flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-[#159EAA]" />
                    <span>Trải nghiệm áp dụng thực tế của giáo viên</span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 tabular-nums">
                    Đã xác nhận:{" "}
                    <strong className="text-emerald-700">
                      {post.linkedProduct.verifiedEvidenceCount || 0}
                    </strong>{" "}
                    • Tự xác nhận:{" "}
                    <strong>{post.linkedProduct.selfAppliedCount || 0}</strong>
                  </div>
                </div>

                {(post.linkedProduct.applications || []).length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {post.linkedProduct.applications.map((app: any) => (
                      <div
                        key={app.id}
                        className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            {app.applicantName} ({app.subjectOrTask})
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              app.verificationStatus === "VERIFIED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {app.verificationStatus === "VERIFIED"
                              ? "Đã xác nhận minh chứng"
                              : "Tự xác nhận"}
                          </span>
                        </div>
                        <p className="text-slate-600">{app.observedResult}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">
                    Chưa có báo cáo áp dụng thực tế nào được gửi cho sản phẩm này.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Section 7: "Hành trình lan tỏa" (Spread Journey Timeline) */}
          {spreadJourney.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-3 text-xs">
              <div className="font-bold text-[#003B3A] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#159EAA]" />
                <span>Hành trình lan tỏa & Cùng phát triển</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {spreadJourney.map((ev: any) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-1 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-[#003B3A]">{ev.title}</span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          {ev.timestamp
                            ? new Date(ev.timestamp).toLocaleDateString("vi-VN")
                            : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                        {ev.description}
                      </p>
                    </div>
                    {ev.actorName && (
                      <div className="text-[10px] font-semibold text-[#00736E] pt-1">
                        Dấu ấn: {ev.actorName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <div className="pt-2">
              <div className="text-xs font-bold text-slate-700 mb-1.5">
                Tài liệu & Tệp đính kèm ({post.attachments.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {post.attachments.map((att: any) => (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-[#003B3A]"
                  >
                    📎 {att.fileName}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Full Threaded Comments & Contribution Pieces Section */}
        <CommentThreadSection
          postId={post.id}
          postAuthorId={post.authorId}
          canManageFeedback={canManageFeedback}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          linkedProductId={post.linkedProduct?.id || null}
          linkedProjectId={post.linkedProject?.id || null}
          productVersions={post.linkedProduct?.versions || []}
          initialComments={post.comments || []}
          totalCommentCount={post.activeCommentCount || 0}
          contributionCount={post.contributionCount || 0}
          isCompactPreview={false}
          highlightCommentId={highlightCommentId}
          teachers={data.catalogs?.teachers || []}
          onOpenContributeModal={() =>
            setContributeModalState({ isOpen: true, initialType: "METHOD" })
          }
          onRefreshPost={loadDetail}
        />
      </article>

      {/* "Góp một mảnh sáng tạo" Modal */}
      {contributeModalState && (
        <ContributePieceModal
          isOpen={contributeModalState.isOpen}
          onClose={() => setContributeModalState(null)}
          onSuccess={() => {
            setContributeModalState(null);
            showToast("Đã gửi mảnh đóng góp thành công!");
            loadDetail();
          }}
          targetPost={{
            id: post.id,
            title: post.title,
            authorId: post.authorId,
            authorName: post.authorName,
            authorAvatar: post.authorAvatar,
            coverImageUrl: post.coverImageUrl,
            postType: post.postType,
            isSeekingCollaborators:
              Boolean(post.isSeekingCollaborators) || post.postType === "PROJECT",
            visibility: post.visibility,
            campusId: post.campusId,
            openHelpRequests: helpRequests.filter((h: any) => h.status === "OPEN"),
            previewComments: (post.comments || []).slice(0, 3),
          }}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          teachers={data.catalogs?.teachers || []}
          initialContributionType={contributeModalState.initialType}
          linkedHelpRequest={contributeModalState.linkedHelpRequest}
          onSelectHelpRequest={(hr) =>
            setContributeModalState((prev) =>
              prev
                ? {
                    ...prev,
                    initialType: hr.supportType || prev.initialType,
                    linkedHelpRequest: hr,
                  }
                : null
            )
          }
        />
      )}

      <PostComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSuccess={loadDetail}
        initialData={{
          id: post.id,
          postType: post.postType,
          title: post.title,
          summary: post.summary,
          content: post.content,
          visibility: post.visibility,
          subjectCodes: post.subjectCodes,
          gradeLevels: post.gradeLevels,
          purposeTags: post.purposeTags,
          tags: post.tags,
          productUrl: post.linkedProduct?.productUrl,
          version: post.linkedProduct?.currentVersion,
          productStatus: post.linkedProduct?.status,
        }}
        catalogs={data.catalogs}
      />

      {modalConfig && (
        <RatingAndApplicationModal
          {...modalConfig}
          onClose={() => setModalConfig(null)}
          onSuccess={() => {
            showToast("Đã ghi nhận thông tin thành công!");
            loadDetail();
          }}
        />
      )}
    </div>
  );
}

export default function SkylineConnectPostDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Đang tải chi tiết bài đăng...</div>}>
      <PostDetailContent />
    </Suspense>
  );
}
