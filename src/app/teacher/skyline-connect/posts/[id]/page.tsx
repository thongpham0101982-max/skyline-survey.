"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
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
} from "lucide-react";
import { SkylineConnectSubNav } from "@/components/skyline-connect/SkylineConnectSubNav";
import { CommentThreadSection } from "@/components/skyline-connect/CommentThreadSection";
import { RatingAndApplicationModal } from "@/components/skyline-connect/RatingAndApplicationModal";
import { PostComposerModal } from "@/components/skyline-connect/PostComposerModal";

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
        <h2 className="text-base font-bold text-[#123E4A]">Nội dung thuộc phạm vi hạn chế</h2>
        <p className="text-xs text-slate-600">
          Bài đăng này thuộc nhóm chuyên môn riêng tư hoặc cơ sở khác mà Thầy/Cô chưa có quyền truy cập.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-xl bg-[#123E4A] text-white text-xs font-bold cursor-pointer"
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
        <h2 className="text-base font-bold text-[#123E4A]">Không tìm thấy bài đăng</h2>
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
  const isAuthor = post.authorId === currentUserId;
  const isProduct = post.postType === "AI_PRODUCT" || Boolean(post.linkedProduct);
  const isIdea = post.postType === "IDEA" || Boolean(post.linkedIdea);

  const avgRating = Number(
    post.linkedProduct?.avgRating ?? post.linkedIdea?.avgRating ?? 0
  );
  const ratingCount = Number(
    post.linkedProduct?.validRatingCount ?? post.linkedIdea?.validRatingCount ?? 0
  );

  return (
    <div className="min-h-screen bg-[#F5F8FA] -m-4 sm:-m-6 p-4 sm:p-6 space-y-5 text-slate-800">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#123E4A] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg">
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
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-[#123E4A] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại tường (giữ bộ lọc)</span>
        </button>

        <div className="flex items-center gap-2">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#123E4A] text-white text-xs font-bold cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Chỉnh sửa bài đăng</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Post Detail Card */}
      <article className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#123E4A] p-5 sm:p-6 shadow-2xs space-y-5">
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

            <h1 className="text-xl sm:text-2xl font-extrabold text-[#123E4A]">
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
                  <div className="text-sm font-extrabold text-[#123E4A]">
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
                  className="px-3.5 py-2 rounded-xl bg-[#123E4A] text-white text-xs font-bold cursor-pointer"
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
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#159EAA] hover:bg-[#11828C] text-white text-xs font-bold cursor-pointer"
                      >
                        <span>Dùng thử ngay ({post.linkedProduct.openLinkCount || 0} lượt mở)</span>
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
            <div className="font-bold text-[#123E4A]">Lịch sử chỉnh sửa bài đăng</div>
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
                  <div className="font-bold text-[#123E4A] mb-1">Vấn đề thực tế cần giải quyết</div>
                  <p>{post.linkedIdea.problemStatement}</p>
                </div>
              )}
              {post.linkedIdea.aiSupportStep && (
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <div className="font-bold text-[#123E4A] mb-1">Khâu AI hoặc công nghệ hỗ trợ</div>
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

          {/* Product Versions & Contributor Credits + Applications */}
          {post.linkedProduct && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
              {/* Product Versions */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-2.5">
                <div className="font-bold text-[#123E4A] flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-[#159EAA]" />
                  <span>
                    Lịch sử phiên bản & Ghi nhận đóng góp (Hiện tại: v
                    {post.linkedProduct.currentVersion})
                  </span>
                </div>
                {(post.linkedProduct.versions || []).map((ver: any) => (
                  <div
                    key={ver.id}
                    className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Phiên bản v{ver.version}</span>
                      {ver.contributorName && !ver.contributorOptOutPublic && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-[#00736E] border border-teal-200">
                          Đóng góp: {ver.contributorName}
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
                          ? "Hiển thị lại tên của tôi trên bản ghi công khai"
                          : "Bỏ nhắc tên tôi trên bản ghi công khai"}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Product Applications (Separating Verified vs Self-Declared) */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[#123E4A] flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-[#159EAA]" />
                    <span>Báo cáo áp dụng thực tế của giáo viên</span>
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
                              ? "Đã được xác nhận minh chứng"
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
                    className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-[#123E4A]"
                  >
                    📎 {att.fileName}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Full Threaded Comments Section */}
        <CommentThreadSection
          postId={post.id}
          postAuthorId={post.authorId}
          currentUserId={currentUserId}
          linkedProductId={post.linkedProduct?.id || null}
          initialComments={post.comments || []}
          totalCommentCount={post.activeCommentCount || 0}
          isCompactPreview={false}
          highlightCommentId={highlightCommentId}
          teachers={data.catalogs?.teachers || []}
        />
      </article>

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
