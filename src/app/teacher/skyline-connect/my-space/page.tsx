"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  Bot,
  Users,
  Bookmark,
  Award,
  Bell,
  Edit3,
  Plus,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { SkylineConnectSubNav } from "@/components/skyline-connect/SkylineConnectSubNav";
import {
  PostComposerModal,
  ComposerInitialData,
} from "@/components/skyline-connect/PostComposerModal";

function MySpaceContent() {
  const [activeTab, setActiveTab] = useState<
    "PUBLISHED" | "DRAFTS" | "PRODUCTS" | "PROJECTS" | "SAVED" | "SETTINGS" | "MODERATION"
  >("PUBLISHED");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerData, setComposerData] = useState<ComposerInitialData | null>(null);

  // Profile & Notification form state
  const [bio, setBio] = useState("");
  const [specialtiesInput, setSpecialtiesInput] = useState("");
  const [interestsInput, setInterestsInput] = useState("");
  const [notifyOnMention, setNotifyOnMention] = useState(true);
  const [notifyOnReply, setNotifyOnReply] = useState(true);
  const [notifyOnInvite, setNotifyOnInvite] = useState(true);
  const [notifyOnFollowedUpdate, setNotifyOnFollowedUpdate] = useState(true);
  const [digestMode, setDigestMode] = useState<"IMMEDIATE" | "DAILY_DIGEST" | "OFF">("IMMEDIATE");
  const [savingSettings, setSavingSettings] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Appeal state
  const [appealReportId, setAppealReportId] = useState<string | null>(null);
  const [appealText, setAppealText] = useState("");

  const loadMySpace = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/skyline-connect?action=mySpace");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.profile) {
          setBio(json.profile.bio || "");
          setSpecialtiesInput((json.profile.specialties || []).join(", "));
          setInterestsInput((json.profile.interests || []).join(", "));
          setNotifyOnMention(Boolean(json.profile.notifyOnMention));
          setNotifyOnReply(Boolean(json.profile.notifyOnReply));
          setNotifyOnInvite(Boolean(json.profile.notifyOnInvite));
          setNotifyOnFollowedUpdate(Boolean(json.profile.notifyOnFollowedUpdate));
          setDigestMode(json.profile.digestMode || "IMMEDIATE");
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMySpace();
  }, [loadMySpace]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateProfile",
          bio: bio.trim(),
          specialties: specialtiesInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          interests: interestsInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          notifyOnMention,
          notifyOnReply,
          notifyOnInvite,
          notifyOnFollowedUpdate,
          digestMode,
        }),
      });
      if (res.ok) {
        showToast("Đã cập nhật hồ sơ cộng đồng & tùy chọn thông báo!");
        loadMySpace();
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReportId || !appealText.trim()) return;
    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reportAction",
        subAction: "SUBMIT_APPEAL",
        reportId: appealReportId,
        appealText: appealText.trim(),
      }),
    });
    if (res.ok) {
      setAppealReportId(null);
      setAppealText("");
      showToast("Đã gửi đề nghị xem lại tới Quản trị viên.");
      loadMySpace();
    }
  };

  const profile = data?.profile;
  const badges = data?.badges || [];
  const publishedPosts = data?.publishedPosts || [];
  const draftPosts = data?.draftPosts || [];
  const products = data?.products || [];
  const projects = data?.projects || [];
  const savedPosts = data?.savedPosts || [];
  const myReports = data?.myReports || [];

  return (
    <div className="min-h-screen bg-[#F5F8FA] -m-4 sm:-m-6 p-4 sm:p-6 space-y-5 text-slate-800">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#123E4A] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#5EEAD4]" />
          <span>{toastMsg}</span>
        </div>
      )}

      <SkylineConnectSubNav
        showAdminLink={Boolean(data?.currentUser?.permissions?.isAdmin)}
        onOpenComposer={() => {
          setComposerData({ postType: "IDEA" });
          setComposerOpen(true);
        }}
      />

      {/* Profile Header Card */}
      <header className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#123E4A] p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#123E4A] text-white text-xl font-extrabold flex items-center justify-center shrink-0">
              {(profile?.fullName || "G").charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#123E4A]">
                {profile?.fullName || "Không gian của tôi"}
              </h1>
              <p className="text-xs font-semibold text-[#159EAA]">
                {profile?.mainSubject || "Giáo viên"} • {profile?.campusName || "Hệ thống Sky-Line"}
              </p>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">{profile?.bio}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setComposerData({ postType: "IDEA" });
              setComposerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#159EAA] hover:bg-[#11828C] text-white text-xs font-bold cursor-pointer self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Đăng bài mới</span>
          </button>
        </div>

        {/* Awarded Badges with Explicit Period Source */}
        {badges.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#D6A74A]" />
              <span>Huy hiệu vinh danh Bảng vàng sáng tạo</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {badges.map((b: any) => (
                <div
                  key={b.id}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-center gap-2"
                >
                  <span className="font-extrabold text-[#D6A74A]">★ Hạng {b.rank}</span>
                  <div>
                    <div className="font-bold text-[#123E4A]">{b.badgeTitle}</div>
                    <div className="text-[10px] text-slate-500">
                      Nguồn kỳ vinh danh: {b.periodName} • Tác phẩm: {b.targetTitle}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3 border-t border-slate-100">
          {[
            {
              id: "PUBLISHED" as const,
              label: `Bài đã đăng (${publishedPosts.length})`,
              icon: FileText,
            },
            {
              id: "DRAFTS" as const,
              label: `Bản nháp (${draftPosts.length})`,
              icon: Edit3,
            },
            {
              id: "PRODUCTS" as const,
              label: `Sản phẩm AI (${products.length})`,
              icon: Bot,
            },
            {
              id: "PROJECTS" as const,
              label: `Dự án (${projects.length})`,
              icon: Users,
            },
            {
              id: "SAVED" as const,
              label: `Đã lưu (${savedPosts.length})`,
              icon: Bookmark,
            },
            {
              id: "SETTINGS" as const,
              label: "Hồ sơ & Thông báo",
              icon: Bell,
            },
            {
              id: "MODERATION" as const,
              label: `Phản ánh & Phúc khảo (${myReports.length})`,
              icon: ShieldAlert,
            },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-[#123E4A] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Tab Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          Đang tải Không gian của tôi...
        </div>
      ) : activeTab === "PUBLISHED" || activeTab === "DRAFTS" || activeTab === "SAVED" ? (
        <div className="space-y-3">
          {(activeTab === "PUBLISHED"
            ? publishedPosts
            : activeTab === "DRAFTS"
            ? draftPosts
            : savedPosts
          ).map((post: any) => (
            <div
              key={post.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-teal-50 text-[#123E4A] border border-teal-200">
                    {post.postType}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Trạng thái: {post.status === "DRAFT" ? "Bản nháp" : "Đã đăng"}
                  </span>
                </div>
                <Link
                  href={`/teacher/skyline-connect/posts/${post.id}`}
                  className="text-sm font-bold text-[#123E4A] hover:text-[#159EAA] block mt-1"
                >
                  {post.title || "Bài chia sẻ chuyên môn"}
                </Link>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {post.summary || post.content}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {post.authorId === data?.currentUser?.userId && (
                  <button
                    type="button"
                    onClick={() => {
                      setComposerData({
                        id: post.id,
                        postType: post.postType,
                        title: post.title,
                        summary: post.summary,
                        content: post.content,
                        visibility: post.visibility,
                      });
                      setComposerOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Chỉnh sửa
                  </button>
                )}
                <Link
                  href={`/teacher/skyline-connect/posts/${post.id}`}
                  className="px-3 py-1.5 rounded-xl bg-[#159EAA] text-white text-xs font-bold"
                >
                  Xem bài →
                </Link>
              </div>
            </div>
          ))}

          {(activeTab === "PUBLISHED"
            ? publishedPosts
            : activeTab === "DRAFTS"
            ? draftPosts
            : savedPosts
          ).length === 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center text-xs text-slate-500">
              Chưa có nội dung trong mục này.
            </div>
          )}
        </div>
      ) : activeTab === "PRODUCTS" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((prod: any) => (
            <div
              key={prod.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#159EAA]">
                  Phiên bản v{prod.currentVersion}
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  ★ {Number(prod.avgRating || 0).toFixed(1)} ({prod.validRatingCount || 0} đánh giá) •{" "}
                  {prod.verifiedEvidenceCount || 0} minh chứng xác nhận
                </span>
              </div>
              <h3 className="text-base font-bold text-[#123E4A]">{prod.name}</h3>
              <p className="text-xs text-slate-600">{prod.utilitySummary}</p>
              {prod.postId && (
                <Link
                  href={`/teacher/skyline-connect/posts/${prod.postId}`}
                  className="inline-block text-xs font-bold text-[#159EAA] hover:underline pt-1"
                >
                  Quản lý phiên bản & xem góp ý →
                </Link>
              )}
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
              Thầy/Cô chưa đăng sản phẩm AI nào.
            </div>
          )}
        </div>
      ) : activeTab === "PROJECTS" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj: any) => (
            <div
              key={proj.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-2"
            >
              <h3 className="text-base font-bold text-[#123E4A]">{proj.title}</h3>
              <p className="text-xs text-slate-600">{proj.goal}</p>
              <Link
                href="/teacher/skyline-connect/groups-projects"
                className="inline-block text-xs font-bold text-[#159EAA] hover:underline"
              >
                Mở không gian dự án →
              </Link>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
              Thầy/Cô chưa tham gia dự án hợp tác nào.
            </div>
          )}
        </div>
      ) : activeTab === "SETTINGS" ? (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 max-w-2xl text-xs"
        >
          <h3 className="text-sm font-bold text-[#123E4A]">
            Cập nhật Hồ sơ sáng tạo & Tùy chọn thông báo
          </h3>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Giới thiệu chuyên môn</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Thế mạnh chuyên môn (phân cách bằng dấu phẩy)
              </label>
              <input
                type="text"
                value={specialtiesInput}
                onChange={(e) => setSpecialtiesInput(e.target.value)}
                placeholder="Prompt AI, Thiết kế trò chơi học tập, STEAM..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Chủ đề quan tâm (phân cách bằng dấu phẩy)
              </label>
              <input
                type="text"
                value={interestsInput}
                onChange={(e) => setInterestsInput(e.target.value)}
                placeholder="Toán THCS, Đánh giá năng lực, Học liệu số..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="font-bold text-slate-700">Chế độ nhận thông báo Sky-Line Connect</div>
            <select
              value={digestMode}
              onChange={(e) => setDigestMode(e.target.value as any)}
              className="w-full sm:w-72 rounded-xl border border-slate-200 px-3 py-2 bg-white font-semibold"
            >
              <option value="IMMEDIATE">Nhận thông báo tức thời</option>
              <option value="DAILY_DIGEST">Gộp bản tin tổng hợp hàng ngày</option>
              <option value="OFF">Tắt thông báo cộng đồng</option>
            </select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnMention}
                  onChange={(e) => setNotifyOnMention(e.target.checked)}
                />
                <span>Khi có đồng nghiệp @nhắc tên</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnReply}
                  onChange={(e) => setNotifyOnReply(e.target.checked)}
                />
                <span>Khi có bình luận hoặc trả lời góp ý</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnInvite}
                  onChange={(e) => setNotifyOnInvite(e.target.checked)}
                />
                <span>Khi có lời mời tham gia dự án</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnFollowedUpdate}
                  onChange={(e) => setNotifyOnFollowedUpdate(e.target.checked)}
                />
                <span>Khi bài hoặc sản phẩm đang theo dõi có bản mới</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="px-5 py-2 rounded-xl bg-[#159EAA] hover:bg-[#11828C] text-white font-bold cursor-pointer"
          >
            {savingSettings ? "Đang lưu..." : "Lưu thiết lập"}
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          {myReports.map((rep: any) => (
            <div
              key={rep.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#123E4A]">
                  Mã phản ánh: {rep.id} • Nhóm: {rep.reasonCategory}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                  {rep.status}
                </span>
              </div>
              <p className="text-slate-600">{rep.description}</p>
              {rep.conclusionNote && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  <strong>Kết luận rà soát:</strong> {rep.conclusionNote}
                </div>
              )}
              {rep.status === "NOTIFIED" && (
                <button
                  type="button"
                  onClick={() => setAppealReportId(rep.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#123E4A] text-white font-semibold cursor-pointer"
                >
                  Gửi đề nghị xem lại (Phúc khảo)
                </button>
              )}
            </div>
          ))}
          {myReports.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
              Không có phản ánh hoặc thông báo kiểm duyệt nào.
            </div>
          )}
        </div>
      )}

      {/* Modal: Submit Appeal */}
      {appealReportId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitAppeal}
            className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-3 text-xs shadow-xl"
          >
            <h3 className="text-sm font-bold text-[#123E4A]">Gửi đề nghị xem lại kết luận</h3>
            <textarea
              rows={3}
              required
              value={appealText}
              onChange={(e) => setAppealText(e.target.value)}
              placeholder="Trình bày nội dung đã khắc phục hoặc giải trình..."
              className="w-full rounded-xl border border-slate-200 p-2.5"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAppealReportId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#159EAA] text-white font-bold cursor-pointer"
              >
                Gửi đề nghị
              </button>
            </div>
          </form>
        </div>
      )}

      <PostComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSuccess={loadMySpace}
        initialData={composerData}
        catalogs={data?.catalogs}
      />
    </div>
  );
}

export default function SkylineConnectMySpacePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Đang tải Không gian của tôi...</div>}>
      <MySpaceContent />
    </Suspense>
  );
}
