"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { Compass, Lightbulb, Bot, BookOpen, Search, Plus, Puzzle, Users } from "lucide-react";
import { SkylineConnectSubNav } from "@/components/skyline-connect/SkylineConnectSubNav";
import { IdeaWallCard } from "@/components/skyline-connect/IdeaWallCard";
import { PostComposerModal } from "@/components/skyline-connect/PostComposerModal";
import { RatingAndApplicationModal } from "@/components/skyline-connect/RatingAndApplicationModal";
import { ContributePieceModal } from "@/components/skyline-connect/ContributePieceModal";
import { CONTRIBUTION_TYPE_BADGES } from "@/components/skyline-connect/CommentThreadSection";

function ExploreContent() {
  const [activeCategory, setActiveCategory] = useState<"IDEA" | "AI_PRODUCT" | "EXPERIENCE">(
    "AI_PRODUCT"
  );
  const [search, setSearch] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [sort, setSort] = useState<"USEFUL" | "NEWEST" | "DISCOVER">("USEFUL");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<any>(null);
  const [contributeModalState, setContributeModalState] = useState<{
    isOpen: boolean;
    targetPost: any;
    initialType?: any;
    linkedHelpRequest?: any;
  } | null>(null);

  const fetchExplore = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        action: "wall",
        postType: activeCategory,
        sort,
      });
      if (search.trim()) qs.set("search", search.trim());
      if (subjectCode) qs.set("subjectCode", subjectCode);
      if (gradeLevel) qs.set("gradeLevel", gradeLevel);

      const res = await fetch(`/api/skyline-connect?${qs.toString()}`);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search, subjectCode, gradeLevel, sort]);

  useEffect(() => {
    fetchExplore();
  }, [fetchExplore]);

  const catalogs = data?.catalogs || {};
  const currentUserId = data?.currentUser?.userId || "";
  const currentUserName = data?.currentUser?.fullName || "Giáo viên Sky-Line";

  const handleOpenContributeModal = (
    targetPost: any,
    initialType?: any,
    linkedHelpRequest?: any
  ) => {
    setContributeModalState({
      isOpen: true,
      targetPost: {
        id: targetPost.id || targetPost.postId,
        title: targetPost.title || targetPost.postTitle || "Ý tưởng sáng tạo",
        authorId: targetPost.authorId,
        authorName: targetPost.authorName || "Giáo viên Sky-Line",
        authorAvatar: targetPost.authorAvatar || null,
        coverImageUrl: targetPost.coverImageUrl || null,
        postType: targetPost.postType,
        isSeekingCollaborators: Boolean(targetPost.isSeekingCollaborators),
        visibility: targetPost.visibility,
        campusId: targetPost.campusId,
        openHelpRequests: targetPost.openHelpRequests || [],
        previewComments: targetPost.previewComments || [],
      },
      initialType: initialType || "METHOD",
      linkedHelpRequest: linkedHelpRequest || null,
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] -m-4 sm:-m-6 p-4 sm:p-6 space-y-5 text-slate-800">
      <SkylineConnectSubNav
        showAdminLink={Boolean(data?.currentUser?.permissions?.isAdmin)}
        onOpenComposer={() => setComposerOpen(true)}
      />

      <header className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#003B3A] text-white flex items-center justify-center">
              <Compass className="w-5 h-5 text-[#5EEAD4]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#003B3A]">Khám phá sáng tạo</h1>
              <p className="text-xs text-slate-500">
                Kho lưu trữ phân loại Ý tưởng dạy học, Sản phẩm AI, Học liệu và các lời mời cùng sáng tạo của giáo viên Sky-Line
              </p>
            </div>
          </div>

          <div className="relative sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên công cụ, môn học..."
              className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-9 pr-3 py-2 text-xs"
            />
          </div>
        </div>

        {/* 3 Required Tabs: Ý tưởng / Sản phẩm AI / Học liệu và trải nghiệm */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {[
              { id: "IDEA" as const, label: "Ý tưởng dạy học", icon: Lightbulb },
              { id: "AI_PRODUCT" as const, label: "Sản phẩm AI", icon: Bot },
              { id: "EXPERIENCE" as const, label: "Học liệu và trải nghiệm", icon: BookOpen },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeCategory === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveCategory(t.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-[#003B3A] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium"
            >
              <option value="">Tất cả khối lớp</option>
              {(catalogs.grades || []).map((g: any) => (
                <option key={g.code} value={g.code}>
                  {g.name}
                </option>
              ))}
            </select>

            <select
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium"
            >
              <option value="">Tất cả môn học</option>
              {(catalogs.subjects || []).map((s: any) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-[#003B3A]"
            >
              <option value="USEFUL">Sắp xếp: Hữu ích nhất</option>
              <option value="NEWEST">Sắp xếp: Mới nhất</option>
              <option value="DISCOVER">Sắp xếp: Mới đáng khám phá</option>
            </select>
          </div>
        </div>
      </header>

      {/* Section 8: "Đang cần một đồng nghiệp..." in Community Explore */}
      {data?.openHelpRequestsForSidebar && data.openHelpRequestsForSidebar.length > 0 && (
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] flex items-center justify-center text-[#159EAA]">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-[#003B3A]">
                  Đang cần một đồng nghiệp…
                </h2>
                <p className="text-[11px] text-slate-500">
                  Các bài viết đang mời đồng nghiệp cùng thử nghiệm, góp học liệu hoặc hỗ trợ chuyên môn
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.openHelpRequestsForSidebar.slice(0, 3).map((hr: any) => {
              const b =
                CONTRIBUTION_TYPE_BADGES[hr.supportType] ||
                CONTRIBUTION_TYPE_BADGES.EXPERIMENT;
              return (
                <div
                  key={hr.id}
                  className="p-3.5 rounded-xl bg-gradient-to-br from-[#F8FAFC] to-[#F0FDFA]/60 border border-slate-200 flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${b.bg} ${b.text} ${b.border}`}
                      >
                        <span>{b.emoji}</span>
                        <span>{b.label}</span>
                      </span>
                      {(hr.subjectCode || hr.gradeLevel) && (
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {[hr.subjectCode, hr.gradeLevel].filter(Boolean).join(" • ")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-[#003B3A]">{hr.title}</div>
                    <Link
                      href={`/teacher/skyline-connect/posts/${hr.postId}`}
                      className="text-[11px] text-slate-500 hover:text-[#159EAA] truncate block"
                    >
                      Bài gốc: {hr.postTitle} ({hr.authorName})
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenContributeModal(
                        {
                          id: hr.postId,
                          title: hr.postTitle,
                          authorId: hr.authorId,
                          authorName: hr.authorName,
                        },
                        hr.supportType || "EXPERIMENT",
                        hr
                      )
                    }
                    className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white hover:bg-[#003B3A] text-[#003B3A] hover:text-white border border-[#003B3A]/20 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Puzzle className="w-3.5 h-3.5 text-[#159EAA]" />
                    <span>Tôi có thể giúp</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-72 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : data?.items && data.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {data.items.map((item: any) => (
            <IdeaWallCard
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              layoutMode="grid"
              teachers={catalogs.teachers || []}
              onOpenRatingModal={(targetItem, mode) => {
                const isProd =
                  targetItem.postType === "AI_PRODUCT" || Boolean(targetItem.linkedProduct);
                setModalConfig({
                  isOpen: true,
                  mode,
                  targetType: mode === "REPORT" ? "POST" : isProd ? "PRODUCT" : "IDEA",
                  targetId:
                    mode === "REPORT"
                      ? targetItem.id
                      : isProd
                      ? targetItem.linkedProduct?.id || targetItem.id
                      : targetItem.linkedIdea?.id || targetItem.id,
                  targetTitle: targetItem.title,
                  postId: targetItem.id,
                });
              }}
              onOpenContributeModal={(targetItem, initialType, helpReq) =>
                handleOpenContributeModal(targetItem, initialType, helpReq)
              }
              onRefresh={fetchExplore}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-3">
          <p className="text-sm font-bold text-[#003B3A]">
            Chưa có nội dung trong phân mục này
          </p>
          <p className="text-xs text-slate-500">
            Mời Thầy/Cô đóng góp ý tưởng, sản phẩm AI hoặc học liệu mới vào thư viện sáng tạo.
          </p>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#159EAA] text-white text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Chia sẻ ngay</span>
          </button>
        </div>
      )}

      {contributeModalState && (
        <ContributePieceModal
          isOpen={contributeModalState.isOpen}
          onClose={() => setContributeModalState(null)}
          onSuccess={() => {
            setContributeModalState(null);
            fetchExplore();
          }}
          targetPost={contributeModalState.targetPost}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          teachers={catalogs.teachers || []}
          initialContributionType={contributeModalState.initialType}
          linkedHelpRequest={contributeModalState.linkedHelpRequest}
        />
      )}

      <PostComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSuccess={fetchExplore}
        initialData={{ postType: activeCategory }}
        catalogs={catalogs}
      />

      {modalConfig && (
        <RatingAndApplicationModal
          {...modalConfig}
          onClose={() => setModalConfig(null)}
          onSuccess={fetchExplore}
        />
      )}
    </div>
  );
}

export default function SkylineConnectExplorePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Đang tải Khám phá sáng tạo...</div>}>
      <ExploreContent />
    </Suspense>
  );
}
