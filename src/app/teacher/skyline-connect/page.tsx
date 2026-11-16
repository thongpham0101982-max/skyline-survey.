"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Plus,
  Award,
  Users,
  Lightbulb,
  Bot,
  Bookmark,
  Filter,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Compass,
  BookOpen,
  LayoutList,
  LayoutGrid,
  SlidersHorizontal,
  Bell,
  AtSign,
  Puzzle,
  Flame,
  Share2,
  Wand2,
} from "lucide-react";
import { SkylineConnectSubNav } from "@/components/skyline-connect/SkylineConnectSubNav";
import { CreativeWallBackdrop } from "@/components/teacher/SkylineConnectOverviewWidget";
import {
  PostComposerModal,
  ComposerInitialData,
} from "@/components/skyline-connect/PostComposerModal";
import { IdeaWallCard } from "@/components/skyline-connect/IdeaWallCard";
import { RatingAndApplicationModal } from "@/components/skyline-connect/RatingAndApplicationModal";
import { ContributePieceModal } from "@/components/skyline-connect/ContributePieceModal";
import { CONTRIBUTION_TYPE_BADGES } from "@/components/skyline-connect/CommentThreadSection";
import { SsmDataSkillBuilderModal } from "@/components/skyline-connect/SsmDataSkillBuilderModal";
import { SkillComposerAndUploadModal } from "@/components/skyline-connect/SkillComposerAndUploadModal";
import { SkillRunnerModal } from "@/components/skyline-connect/SkillRunnerModal";
import { SkillsRepositoryView } from "@/components/skyline-connect/SkillsRepositoryView";
import { Database } from "lucide-react";

function SkylineConnectWallContent() {
  const searchParams = useSearchParams();

  const [mainSection, setMainSection] = useState<
    "WALL" | "SKILLS_REPO" | "MY_CONTRIBUTIONS" | "SAVED" | "REVIEW_QUEUE"
  >((searchParams?.get("section") as any) || "WALL");

  const [tab, setTab] = useState<
    "ALL" | "NEW_IDEAS" | "AI_PRODUCTS" | "SKILLS" | "SEEKING_COLLABORATORS" | "SAVED"
  >((searchParams?.get("tab") as any) || "ALL");
  const [sort, setSort] = useState<
    "NEWEST" | "DISCUSSING" | "MOST_APPLIED" | "USEFUL" | "DISCOVER"
  >((searchParams?.get("sort") as any) || "NEWEST");
  const [viewMode, setViewMode] = useState<"feed" | "grid">("feed");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [followingOnly, setFollowingOnly] = useState(
    searchParams?.get("followingOnly") === "true"
  );
  const [search, setSearch] = useState(searchParams?.get("search") || "");
  const [campusId, setCampusId] = useState(searchParams?.get("campusId") || "");
  const [visibilityFilter, setVisibilityFilter] = useState(
    searchParams?.get("visibility") || ""
  );
  const [authorFilterId, setAuthorFilterId] = useState(searchParams?.get("authorId") || "");
  const [subjectCode, setSubjectCode] = useState(searchParams?.get("subjectCode") || "");
  const [gradeLevel, setGradeLevel] = useState(searchParams?.get("gradeLevel") || "");
  const [purposeTag, setPurposeTag] = useState(searchParams?.get("purposeTag") || "");
  const [page, setPage] = useState<number>(Number(searchParams?.get("page") || 1));

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedData, setFeedData] = useState<any>(null);
  const [mySpacePosts, setMySpacePosts] = useState<any[]>([]);
  const [lastLoadedBumpTime, setLastLoadedBumpTime] = useState<string | null>(null);
  const [hasNewFeedUpdates, setHasNewFeedUpdates] = useState(false);

  // Composer Modal state
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitialData, setComposerInitialData] =
    useState<ComposerInitialData | null>(null);

  // Subject Skills Modals state
  const [ssmBuilderOpen, setSsmBuilderOpen] = useState(false);
  const [skillComposerState, setSkillComposerState] = useState<{
    isOpen: boolean;
    initialSkill?: any | null;
    forkFromSkill?: any | null;
  }>({ isOpen: false });
  const [skillRunnerTarget, setSkillRunnerTarget] = useState<any | null>(null);

  // "Góp một mảnh sáng tạo" Modal state
  const [contributeModalState, setContributeModalState] = useState<{
    isOpen: boolean;
    targetPost: any;
    initialType?: any;
    linkedHelpRequest?: any;
  } | null>(null);

  // Rating / Application / Report Modal state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    mode: "RATING" | "APPLICATION" | "REPORT";
    targetType: "IDEA" | "PRODUCT" | "POST";
    targetId: string;
    targetTitle: string;
    postId?: string;
  } | null>(null);

  // Toast notice
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const composeParam = searchParams?.get("compose");
    if (composeParam) {
      setComposerInitialData({
        postType:
          composeParam === "AI_PRODUCT"
            ? "AI_PRODUCT"
            : composeParam === "PROJECT"
            ? "PROJECT"
            : "IDEA",
      });
      setComposerOpen(true);
    }
  }, [searchParams]);

  const fetchWall = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setHasNewFeedUpdates(false);
    try {
      const qs = new URLSearchParams();
      qs.set("action", "wall");
      qs.set("tab", mainSection === "SAVED" ? "SAVED" : tab);
      qs.set("sort", sort);
      if (followingOnly) qs.set("followingOnly", "true");
      if (search.trim()) qs.set("search", search.trim());
      if (campusId) qs.set("campusId", campusId);
      if (visibilityFilter) qs.set("visibility", visibilityFilter);
      if (authorFilterId) qs.set("authorId", authorFilterId);
      if (subjectCode) qs.set("subjectCode", subjectCode);
      if (gradeLevel) qs.set("gradeLevel", gradeLevel);
      if (purposeTag) qs.set("purposeTag", purposeTag);
      qs.set("page", String(page));
      qs.set("pageSize", "12");

      const res = await fetch(`/api/skyline-connect?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Không thể tải Cộng đồng sáng tạo.");
      }
      setFeedData(json);
      if (json.latestBumpTimestamp) {
        setLastLoadedBumpTime(json.latestBumpTimestamp);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Lỗi kết nối khi tải dữ liệu cộng đồng.");
    } finally {
      setLoading(false);
    }
  }, [
    mainSection,
    tab,
    sort,
    followingOnly,
    search,
    campusId,
    visibilityFilter,
    authorFilterId,
    subjectCode,
    gradeLevel,
    purposeTag,
    page,
  ]);

  useEffect(() => {
    fetchWall();
  }, [fetchWall]);

  useEffect(() => {
    if (mainSection === "MY_CONTRIBUTIONS") {
      fetch("/api/skyline-connect?action=mySpace")
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d?.myPosts)) setMySpacePosts(d.myPosts);
        })
        .catch(() => {});
    }
  }, [mainSection]);

  // Non-jumping feed update check: notifies user with "Có cập nhật mới" banner instead of reordering while reading/writing
  useEffect(() => {
    if (!lastLoadedBumpTime) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/skyline-connect?action=checkFeedUpdates&since=${encodeURIComponent(
            lastLoadedBumpTime
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.hasUpdates) {
            setHasNewFeedUpdates(true);
          }
        }
      } catch {
        // ignore background check error
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [lastLoadedBumpTime]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleOpenComposer = (initial?: ComposerInitialData) => {
    setComposerInitialData(initial || { postType: "IDEA" });
    setComposerOpen(true);
  };

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
        isSeekingCollaborators:
          Boolean(targetPost.isSeekingCollaborators) || targetPost.postType === "PROJECT",
        visibility: targetPost.visibility,
        campusId: targetPost.campusId,
        openHelpRequests: targetPost.openHelpRequests || [],
        previewComments: targetPost.previewComments || [],
      },
      initialType: initialType || "METHOD",
      linkedHelpRequest: linkedHelpRequest || null,
    });
  };

  const handleJoinProject = async (projectId: string, title: string) => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "projectAction",
          subAction: "REQUEST_JOIN",
          projectId,
          roleName: "Cộng sự phát triển chuyên môn",
          message: `Đăng ký cùng phát triển dự án "${title}"`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      showToast("Đã gửi đăng ký tham gia dự án! Chủ dự án sẽ sớm phản hồi Thầy/Cô.");
      fetchWall();
    } catch (err: any) {
      showToast(err?.message || "Không thể gửi yêu cầu tham gia dự án.");
    }
  };

  const editorialItems: any[] = feedData?.editorialFeatured || [];
  const featuredStories =
    editorialItems.length > 0 ? editorialItems.slice(0, 3) : (feedData?.items || []).slice(0, 3);

  const catalogs = feedData?.catalogs || {};
  const currentUserId = feedData?.currentUser?.userId || "";
  const currentUserName = feedData?.currentUser?.fullName || "Giáo viên Sky-Line";
  const currentUserCampus = feedData?.currentUser?.campusName || "Hệ thống Giáo dục Sky-Line";
  const isAdminOrCoordinator = Boolean(
    feedData?.currentUser?.permissions?.isAdmin ||
      feedData?.currentUser?.permissions?.isCoordinator
  );
  const canManageAndReview = Boolean(
    isAdminOrCoordinator ||
      feedData?.currentUser?.permissions?.canManageCommunityAndSkills ||
      feedData?.currentUser?.permissions?.isDepartmentHead ||
      feedData?.currentUser?.permissions?.isKtdbclOfficer
  );

  const handleSelectContributionType = (
    type: "IDEA" | "AI_PRODUCT" | "SKILL" | "SSM_DATA_SKILL"
  ) => {
    if (type === "IDEA") {
      handleOpenComposer({ postType: "IDEA" });
    } else if (type === "AI_PRODUCT") {
      handleOpenComposer({ postType: "AI_PRODUCT" });
    } else if (type === "SKILL") {
      setSkillComposerState({ isOpen: true, initialSkill: null, forkFromSkill: null });
    } else if (type === "SSM_DATA_SKILL") {
      setSsmBuilderOpen(true);
    }
  };

  const hallPreview = feedData?.hallOfFamePreview;
  const topStandings = [
    ...(hallPreview?.productStandings || []),
    ...(hallPreview?.ideaStandings || []),
  ]
    .filter((s: any) => s.candidate?.isEligible && s.rank !== null && s.rank <= 3)
    .sort((a: any, b: any) => (a.rank || 99) - (b.rank || 99))
    .slice(0, 3);

  const hasActiveFilters = Boolean(
    campusId ||
      visibilityFilter ||
      authorFilterId ||
      subjectCode ||
      gradeLevel ||
      purposeTag ||
      search ||
      followingOnly
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] -m-4 sm:-m-6 p-3 sm:p-5 space-y-4 text-slate-800">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#003B3A] text-white px-4 py-3 rounded-2xl shadow-xl border border-[#159EAA]/50 flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Sticky Top Navigation Bar (4 Main Tabs + Review Area + "Chia sẻ đóng góp") */}
      <SkylineConnectSubNav
        showAdminLink={isAdminOrCoordinator}
        canManageAndReview={canManageAndReview}
        activeMainSection={mainSection}
        onSelectMainSection={(sec) => {
          setMainSection(sec);
          if (sec === "SAVED") setTab("SAVED");
          else if (sec === "WALL" && tab === "SAVED") setTab("ALL");
          setPage(1);
        }}
        onOpenComposer={() => handleOpenComposer({ postType: "IDEA" })}
        onSelectContributionType={handleSelectContributionType}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        initialNotifications={feedData?.notificationsData?.notifications}
        initialUnreadCount={feedData?.notificationsData?.unreadCount}
      />

      {/* If user is in Kho Skills môn học, Đóng góp của tôi, Đã lưu, or Duyệt & Quản trị */}
      {mainSection !== "WALL" ? (
        <div className="max-w-[1440px] mx-auto">
          <SkillsRepositoryView
            mode={
              mainSection === "SKILLS_REPO"
                ? "CATALOG"
                : mainSection === "MY_CONTRIBUTIONS"
                ? "MY_CONTRIBUTIONS"
                : mainSection === "SAVED"
                ? "SAVED"
                : "REVIEW_QUEUE"
            }
            catalogs={catalogs}
            currentUser={feedData?.currentUser}
            myPosts={mySpacePosts}
            savedPosts={feedData?.items || []}
            onOpenSsmBuilder={() => setSsmBuilderOpen(true)}
            onOpenSkillComposer={(skillToEdit, skillToFork) =>
              setSkillComposerState({
                isOpen: true,
                initialSkill: skillToEdit || null,
                forkFromSkill: skillToFork || null,
              })
            }
            onOpenSkillRunner={(skill) => setSkillRunnerTarget(skill)}
            onOpenPostComposer={(postToEdit) =>
              handleOpenComposer({
                id: postToEdit.id,
                postType: postToEdit.postType,
                title: postToEdit.title,
                summary: postToEdit.summary,
                content: postToEdit.content,
                visibility: postToEdit.visibility,
                subjectCodes: postToEdit.subjectCodes,
                gradeLevels: postToEdit.gradeLevels,
              })
            }
            onShowToast={showToast}
            onRefreshWall={fetchWall}
          />
        </div>
      ) : (
      /* 2. 3-Column Co-Creation Workspace (Tường chia sẻ) */
      <div className="flex items-start justify-center gap-5 max-w-[1440px] mx-auto">
        {/* ====================================================================
            LEFT COLUMN (Profile, Feed Shortcuts & Granular Filters)
           ==================================================================== */}
        <aside className="hidden xl:block w-[270px] shrink-0 space-y-3.5 sticky top-20">
          {/* User Profile & Shortcuts Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3 shadow-2xs space-y-1">
            <Link
              href={
                currentUserId
                  ? `/teacher/skyline-connect/profile/${currentUserId}`
                  : "/teacher/skyline-connect/my-space"
              }
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F0F2F5] transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#003B3A] to-[#159EAA] text-white text-sm font-bold flex items-center justify-center shrink-0">
                {currentUserName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {currentUserName}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {currentUserCampus}
                </div>
              </div>
            </Link>

            <div className="border-t border-slate-100 my-1.5" />

            {[
              {
                id: "ALL" as const,
                label: "Tất cả đóng góp",
                icon: Sparkles,
                iconBg: "bg-[#E6F4F5] text-[#159EAA]",
              },
              {
                id: "NEW_IDEAS" as const,
                label: "Ý tưởng dạy học",
                icon: Lightbulb,
                iconBg: "bg-amber-50 text-[#D6A74A]",
              },
              {
                id: "AI_PRODUCTS" as const,
                label: "Ứng dụng & Công cụ AI",
                icon: Bot,
                iconBg: "bg-teal-50 text-[#00736E]",
              },
              {
                id: "SKILLS" as const,
                label: "Skills môn học",
                icon: Puzzle,
                iconBg: "bg-[#003B3A] text-[#5EEAD4]",
              },
              {
                id: "SAVED" as const,
                label: "Đã lưu của tôi",
                icon: Bookmark,
                iconBg: "bg-sky-50 text-[#2878D9]",
              },
            ].map((nav) => {
              const Icon = nav.icon;
              const active = tab === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => {
                    setTab(nav.id);
                    setPage(1);
                  }}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    active
                      ? "bg-[#F0FDFA] text-[#003B3A]"
                      : "text-slate-700 hover:bg-[#F0F2F5]"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${nav.iconBg}`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="truncate">{nav.label}</span>
                </button>
              );
            })}
          </div>

          {/* Granular Filters Card on Left Sidebar */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3.5 shadow-2xs space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#003B3A] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#159EAA]" />
                <span>Bộ lọc chuyên môn</span>
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setCampusId("");
                    setVisibilityFilter("");
                    setAuthorFilterId("");
                    setSubjectCode("");
                    setGradeLevel("");
                    setPurposeTag("");
                    setSearch("");
                    setFollowingOnly(false);
                    setPage(1);
                  }}
                  className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  Đặt lại
                </button>
              )}
            </div>

            <div className="space-y-2">
              <select
                value={gradeLevel}
                onChange={(e) => {
                  setGradeLevel(e.target.value);
                  setPage(1);
                }}
                aria-label="Lọc theo khối lớp"
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 font-medium text-slate-700"
              >
                <option value="">Khối lớp: Tất cả</option>
                {(catalogs.grades || []).map((g: any) => (
                  <option key={g.code} value={g.code}>
                    {g.name}
                  </option>
                ))}
              </select>

              <select
                value={subjectCode}
                onChange={(e) => {
                  setSubjectCode(e.target.value);
                  setPage(1);
                }}
                aria-label="Lọc theo môn học"
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 font-medium text-slate-700"
              >
                <option value="">Môn học: Tất cả</option>
                {(catalogs.subjects || []).map((s: any) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={visibilityFilter}
                onChange={(e) => {
                  setVisibilityFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Lọc theo phạm vi được phép xem"
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 font-medium text-slate-700"
              >
                <option value="">Phạm vi: Tất cả được phép xem</option>
                <option value="DEPARTMENT">Tổ chuyên môn</option>
                <option value="CAMPUS">Trong cơ sở</option>
                <option value="SYSTEM">Toàn hệ thống</option>
              </select>

              <select
                value={authorFilterId}
                onChange={(e) => {
                  setAuthorFilterId(e.target.value);
                  setPage(1);
                }}
                aria-label="Lọc theo tác giả"
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 font-medium text-slate-700"
              >
                <option value="">Tác giả: Tất cả giáo viên</option>
                {(catalogs.teachers || []).map((t: any) => (
                  <option key={t.userId} value={t.userId}>
                    {t.teacherName} ({t.campusName || "Sky-Line"})
                  </option>
                ))}
              </select>

              <select
                value={campusId}
                onChange={(e) => {
                  setCampusId(e.target.value);
                  setPage(1);
                }}
                aria-label="Lọc theo cơ sở"
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 font-medium text-slate-700"
              >
                <option value="">Cơ sở: Toàn hệ thống</option>
                {(catalogs.campuses || []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.campusName}
                  </option>
                ))}
              </select>

              <select
                value={purposeTag}
                onChange={(e) => {
                  setPurposeTag(e.target.value);
                  setPage(1);
                }}
                aria-label="Lọc theo mục đích"
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 font-medium text-slate-700"
              >
                <option value="">Mục đích: Tất cả</option>
                {(catalogs.purposes || []).map((p: any) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        {/* ====================================================================
            CENTER COLUMN (News Feed: Composer + Dấu ấn Sky-Line + Posts)
           ==================================================================== */}
        <main
          className={`flex-1 min-w-0 w-full space-y-4 ${
            viewMode === "feed" ? "max-w-[680px] mx-auto" : ""
          }`}
        >
          {/* 0. Prominent @Tag Notification Banner when Teacher is Tagged */}
          {feedData?.notificationsData?.unreadMentions &&
            feedData.notificationsData.unreadMentions.length > 0 && (
              <div className="bg-gradient-to-r from-[#003B3A] to-[#123E4A] text-white rounded-2xl p-4 shadow-md border border-[#159EAA]/50 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-[#159EAA]/30 border border-[#5EEAD4]/50 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4 text-[#5EEAD4]" />
                    </span>
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                        <span>Thông báo: Đồng nghiệp vừa nhắc đến (@Tag) Thầy/Cô!</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold tabular-nums">
                          {feedData.notificationsData.unreadMentions.length} mới
                        </span>
                      </div>
                      <p className="text-[11px] text-teal-100/85">
                        Nhấn vào thông báo bên dưới để xem bài viết hoặc mảnh đóng góp đang nhắc đến Thầy/Cô
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {feedData.notificationsData.unreadMentions.slice(0, 3).map((notif: any) => (
                    <div
                      key={notif.id}
                      className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AtSign className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {notif.title}
                          </div>
                          <div className="text-[11px] text-teal-100 truncate">
                            {notif.message}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {notif.link && (
                          <Link
                            href={notif.link}
                            onClick={async () => {
                              await fetch("/api/skyline-connect", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "markNotificationRead",
                                  notificationId: notif.id,
                                }),
                              }).catch(() => null);
                            }}
                            className="px-3 py-1 rounded-lg bg-[#159EAA] hover:bg-[#11828C] text-white text-xs font-bold transition-colors"
                          >
                            Xem ngay →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Non-jumping "Có cập nhật mới" Banner when posts are bumped */}
          {hasNewFeedUpdates && (
            <div className="bg-[#FEF9EC] border border-[#FCD34D] rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#78350F]">
                <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Có cập nhật hoặc mảnh đóng góp mới trên Bức tường sáng tạo!</span>
              </div>
              <button
                type="button"
                onClick={fetchWall}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#123E4A] text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Làm mới bảng tin</span>
              </button>
            </div>
          )}

          {/* 1. Không gian Bức tường ý tưởng AI & Khung chia sẻ sáng tạo */}
          <div
            className="relative rounded-2xl border border-[#CCFBF1] border-l-4 border-l-[#003B3A] p-4 sm:p-5 shadow-xs overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 46%, #F8FAFC 76%, #FFFBEB 100%)",
            }}
          >
            {/* Dải sắc màu nhận diện Không gian sáng tạo ở đỉnh */}
            <div
              className="absolute top-0 left-0 right-0 h-1 z-20"
              style={{
                background:
                  "linear-gradient(90deg, #003B3A 0%, #00A19A 45%, #D97706 80%, #0284C7 100%)",
              }}
            />

            <CreativeWallBackdrop variant="banner" />

            <div className="relative z-10 space-y-3.5">
              {/* Tiêu đề & dải icon nhận diện Bức tường ý tưởng AI */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 shadow-2xs"
                    style={{
                      background: "linear-gradient(135deg, #003B3A 0%, #00A19A 100%)",
                    }}
                  >
                    <Lightbulb className="w-4 h-4 text-[#FDE68A]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-sm font-extrabold text-[#003B3A]">
                        Bức tường ý tưởng AI
                      </h1>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#003B3A] text-[#5EEAD4]">
                        <Sparkles className="w-3 h-3" />
                        <span>Không gian sáng tạo Sky-Line</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Nơi kết nối ý tưởng sư phạm, ứng dụng AI sáng tạo và chia sẻ học liệu liên môn
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50/90 text-amber-800 border border-amber-200/80">
                    <Lightbulb className="w-3 h-3 text-amber-600" />
                    <span>Ý tưởng</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-50/90 text-[#00736E] border border-teal-200/80">
                    <Wand2 className="w-3 h-3 text-[#00A19A]" />
                    <span>AI sáng tạo</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50/90 text-sky-800 border border-sky-200/80">
                    <Share2 className="w-3 h-3 text-sky-600" />
                    <span>Chia sẻ</span>
                  </span>
                </div>
              </div>

              {/* Ô nhập nhanh mở Composer */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#003B3A] to-[#159EAA] text-white text-sm font-extrabold flex items-center justify-center shrink-0 shadow-2xs border-2 border-white">
                  {currentUserName.charAt(0).toUpperCase()}
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenComposer({ postType: "IDEA" })}
                  className="flex-1 text-left px-4 py-2.5 rounded-full bg-white/95 hover:bg-white border border-teal-200/80 hover:border-[#00A19A] text-xs sm:text-sm text-slate-600 font-medium transition-all shadow-2xs cursor-pointer"
                >
                  Thầy/Cô đang ấp ủ ý tưởng dạy học, sản phẩm AI hay dự án nào muốn cùng đồng nghiệp sáng tạo?
                </button>
              </div>

              <div className="border-t border-[#00A19A]/15" />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenComposer({ postType: "IDEA" })}
                  className="py-2 px-2.5 rounded-xl bg-amber-50/90 hover:bg-amber-100/80 border border-amber-200/80 flex items-center justify-center gap-2 text-xs font-bold text-amber-900 transition-colors cursor-pointer"
                >
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Ý tưởng</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenComposer({ postType: "AI_PRODUCT" })}
                  className="py-2 px-2.5 rounded-xl bg-teal-50/90 hover:bg-teal-100/80 border border-teal-200/80 flex items-center justify-center gap-2 text-xs font-bold text-[#003B3A] transition-colors cursor-pointer"
                >
                  <Bot className="w-4 h-4 text-[#00A19A] shrink-0" />
                  <span>Ứng dụng AI</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSkillComposerState({
                      isOpen: true,
                      initialSkill: null,
                      forkFromSkill: null,
                    })
                  }
                  className="py-2 px-2.5 rounded-xl bg-sky-50/90 hover:bg-sky-100/80 border border-sky-200/80 flex items-center justify-center gap-2 text-xs font-bold text-sky-900 transition-colors cursor-pointer"
                >
                  <Puzzle className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Skill môn học</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSsmBuilderOpen(true)}
                  className="py-2 px-2.5 rounded-xl bg-[#003B3A] hover:bg-[#123E4A] text-white flex items-center justify-center gap-2 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  <Database className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                  <span>Skill từ dữ liệu SSM</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Dấu ấn Sky-Line — Chủ đề sáng tạo tháng */}
          <section
            aria-label="Dấu ấn Sky-Line"
            className="bg-white rounded-2xl border border-[#E2E8F0] p-3.5 shadow-2xs space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D6A74A]" />
                <span className="text-xs font-extrabold text-[#003B3A]">
                  Dấu ấn Sky-Line • Chủ đề sáng tạo tháng
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  • Tiêu điểm truyền cảm hứng (độc lập với Bảng vàng)
                </span>
              </div>
              <Link
                href="/teacher/skyline-connect/explore"
                className="text-xs font-bold text-[#159EAA] hover:underline"
              >
                Khám phá thêm →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Card 1: Create Story Card */}
              <button
                type="button"
                onClick={() => setSsmBuilderOpen(true)}
                className="group relative rounded-xl overflow-hidden border border-slate-200 bg-gradient-to-b from-[#003B3A] to-[#00A19A] p-3 text-left flex flex-col justify-between min-h-[128px] hover:shadow-md transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-white leading-snug">
                    Tạo Skill từ dữ liệu SSM
                  </div>
                  <div className="text-[10px] text-teal-100 mt-0.5">
                    Rà soát & cá nhân hóa theo lớp
                  </div>
                </div>
              </button>

              {/* Featured Story Cards */}
              {featuredStories.map((story: any, idx: number) => (
                <div
                  key={story.id}
                  className="group relative rounded-xl overflow-hidden border border-slate-200 bg-gradient-to-br from-[#F8FAFC] via-white to-[#F0FDFA] p-3 flex flex-col justify-between min-h-[128px] hover:border-[#159EAA] hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 truncate">
                      ★ {idx === 0 ? "Tiêu điểm" : `Dấu ấn #${idx + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenContributeModal(story)}
                      title="Góp một mảnh sáng tạo cho bài này"
                      className="p-1 rounded-lg bg-[#F0FDFA] hover:bg-teal-100 text-[#003B3A] border border-[#99F6E4] cursor-pointer"
                    >
                      <Puzzle className="w-3 h-3 text-[#159EAA]" />
                    </button>
                  </div>

                  <Link
                    href={`/teacher/skyline-connect/posts/${story.id}`}
                    className="my-1 block"
                  >
                    <div className="text-xs font-bold text-[#003B3A] group-hover:text-[#159EAA] line-clamp-2 leading-snug">
                      {story.title}
                    </div>
                  </Link>

                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                    <div className="w-5 h-5 rounded-full bg-[#003B3A] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                      {(story.authorName || "G").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 truncate">
                      {story.authorName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Feed Filter, Sort & View Mode Strip */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] px-3.5 py-2.5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Feed Tabs: Tất cả, Ý tưởng, Ứng dụng, Skill */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {[
                  { id: "ALL" as const, label: "Tất cả" },
                  { id: "NEW_IDEAS" as const, label: "Ý tưởng" },
                  { id: "AI_PRODUCTS" as const, label: "Ứng dụng" },
                  { id: "SKILLS" as const, label: "Skill" },
                  { id: "SAVED" as const, label: "Đã lưu" },
                ].map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTab(t.id);
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? "bg-[#003B3A] text-white"
                          : "bg-[#F0F2F5] text-slate-600 hover:bg-[#E4E6EB]"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Sort + View Toggle: Mới nhất, Đang thảo luận, Được áp dụng nhiều */}
              <div className="flex items-center gap-2 ml-auto">
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followingOnly}
                    onChange={(e) => {
                      setFollowingOnly(e.target.checked);
                      setPage(1);
                    }}
                    className="rounded border-slate-300 text-[#159EAA]"
                  />
                  <span className="hidden sm:inline">Đang theo dõi</span>
                </label>

                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as any);
                    setPage(1);
                  }}
                  aria-label="Sắp xếp bảng tin"
                  className="rounded-xl bg-[#F0F2F5] px-2.5 py-1.5 text-xs font-bold text-slate-700 border-0 focus:outline-none cursor-pointer"
                >
                  <option value="NEWEST">Sắp xếp: Mới nhất</option>
                  <option value="DISCUSSING">Sắp xếp: Đang thảo luận</option>
                  <option value="MOST_APPLIED">Sắp xếp: Được áp dụng nhiều</option>
                </select>

                {/* Mobile/Tablet Filter Toggle */}
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen((v) => !v)}
                  className="xl:hidden p-1.5 rounded-xl bg-[#F0F2F5] text-slate-700 hover:bg-[#E4E6EB] cursor-pointer"
                  title="Bộ lọc chuyên môn"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>

                {/* Feed vs Grid Switcher */}
                <div className="flex items-center bg-[#F0F2F5] p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setViewMode("feed")}
                    title="Xem dạng Bảng tin"
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === "feed"
                        ? "bg-white text-[#003B3A] shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    title="Xem dạng Lưới thẻ"
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-white text-[#003B3A] shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Collapsible Filters on Mobile/Tablet */}
            {mobileFiltersOpen && (
              <div className="xl:hidden grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                <select
                  value={gradeLevel}
                  onChange={(e) => {
                    setGradeLevel(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                >
                  <option value="">Khối: Tất cả</option>
                  {(catalogs.grades || []).map((g: any) => (
                    <option key={g.code} value={g.code}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <select
                  value={subjectCode}
                  onChange={(e) => {
                    setSubjectCode(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                >
                  <option value="">Môn: Tất cả</option>
                  {(catalogs.subjects || []).map((s: any) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={campusId}
                  onChange={(e) => {
                    setCampusId(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                >
                  <option value="">Cơ sở: Tất cả</option>
                  {(catalogs.campuses || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.campusName}
                    </option>
                  ))}
                </select>
                <select
                  value={purposeTag}
                  onChange={(e) => {
                    setPurposeTag(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                >
                  <option value="">Mục đích: Tất cả</option>
                  {(catalogs.purposes || []).map((p: any) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 4. Feed Posts Stream */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-16 bg-slate-100 rounded-xl" />
                  <div className="h-8 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : errorMsg ? (
            <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <div className="text-sm font-bold text-slate-800">{errorMsg}</div>
              <button
                type="button"
                onClick={fetchWall}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#159EAA] text-white text-xs font-bold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : feedData?.items && feedData.items.length > 0 ? (
            <>
              <div
                className={
                  viewMode === "feed"
                    ? "space-y-4"
                    : "grid grid-cols-1 md:grid-cols-2 gap-4 items-start"
                }
              >
                {feedData.items.map((item: any) => (
                  <IdeaWallCard
                    key={item.id}
                    item={item}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                    isAdminOrCoordinator={isAdminOrCoordinator}
                    layoutMode={viewMode}
                    teachers={catalogs.teachers || []}
                    onOpenSkillDetail={() => setMainSection("SKILLS_REPO")}
                    onEditPost={(postToEdit) =>
                      handleOpenComposer({
                        id: postToEdit.id,
                        postType: postToEdit.postType,
                        title: postToEdit.title,
                        summary: postToEdit.summary,
                        content: postToEdit.content,
                        coverImageUrl: postToEdit.coverImageUrl,
                        videoUrl: postToEdit.videoUrl,
                        demoUrl: postToEdit.demoUrl,
                        topicName: postToEdit.topicName,
                        visibility: postToEdit.visibility,
                        groupId: postToEdit.groupId,
                        subjectCodes: postToEdit.subjectCodes,
                        gradeLevels: postToEdit.gradeLevels,
                        purposeTags: postToEdit.purposeTags,
                        tags: postToEdit.tags,
                        mentionedUserIds: postToEdit.mentionedUserIds || [],
                        productUrl: postToEdit.linkedProduct?.productUrl,
                        version: postToEdit.linkedProduct?.currentVersion,
                        productStatus: postToEdit.linkedProduct?.status,
                      })
                    }
                    onOpenRatingModal={(targetItem, mode) => {
                      const isProd =
                        targetItem.postType === "AI_PRODUCT" || Boolean(targetItem.linkedProduct);
                      setModalConfig({
                        isOpen: true,
                        mode,
                        targetType:
                          mode === "REPORT"
                            ? "POST"
                            : isProd
                            ? "PRODUCT"
                            : "IDEA",
                        targetId:
                          mode === "REPORT"
                            ? targetItem.id
                            : isProd
                            ? targetItem.linkedProduct?.id || targetItem.id
                            : targetItem.linkedIdea?.id || targetItem.id,
                        targetTitle: targetItem.title || "Nội dung chia sẻ",
                        postId: targetItem.id,
                      });
                    }}
                    onOpenContributeModal={(targetItem, initialType, helpReq) =>
                      handleOpenContributeModal(targetItem, initialType, helpReq)
                    }
                    onJoinProject={handleJoinProject}
                    onRefresh={fetchWall}
                  />
                ))}
              </div>

              {/* Pagination */}
              {feedData.pagination && feedData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-2xl border border-[#E2E8F0] px-4 py-3 text-xs tabular-nums">
                  <span className="text-slate-600">
                    Trang <strong>{feedData.pagination.page}</strong> /{" "}
                    <strong>{feedData.pagination.totalPages}</strong> ({feedData.pagination.total}{" "}
                    bài viết)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      ← Trước
                    </button>
                    <button
                      type="button"
                      disabled={!feedData.pagination.hasMore}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      Tiếp →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F0FDFA] text-[#159EAA] flex items-center justify-center mx-auto border border-[#99F6E4]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#003B3A]">
                {tab === "SAVED"
                  ? "Thầy/Cô chưa lưu bài viết nào"
                  : "Chưa có bài viết phù hợp với bộ lọc hiện tại"}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {tab === "SAVED"
                  ? "Nhấn nút Lưu trên các bài viết ý tưởng hoặc sản phẩm AI để lưu vào bộ sưu tập cá nhân của Thầy/Cô."
                  : "Hãy chia sẻ ý tưởng dạy học, sản phẩm AI hoặc dự án hợp tác đầu tiên lên bảng tin để khởi tạo thảo luận chuyên môn."}
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenComposer({ postType: "IDEA" })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#159EAA] hover:bg-[#11828C] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Đăng bài chia sẻ ngay</span>
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ====================================================================
            RIGHT COLUMN (Right Sidebar: Đang cần một đồng nghiệp..., Bảng vàng, Dự án)
           ==================================================================== */}
        <aside className="hidden lg:block w-[310px] xl:w-[320px] shrink-0 space-y-4 sticky top-20">
          {/* 1. "Đang cần một đồng nghiệp..." Widget */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] flex items-center justify-center text-[#159EAA]">
                  <Puzzle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#003B3A]">Đang cần một đồng nghiệp…</h2>
                  <p className="text-[11px] text-slate-500">Lời mời góp sức nhanh từ tác giả</p>
                </div>
              </div>
            </div>

            {feedData?.openHelpRequestsForSidebar &&
            feedData.openHelpRequestsForSidebar.length > 0 ? (
              <div className="space-y-2.5">
                {feedData.openHelpRequestsForSidebar.slice(0, 4).map((hr: any) => {
                  const b =
                    CONTRIBUTION_TYPE_BADGES[hr.supportType] ||
                    CONTRIBUTION_TYPE_BADGES.EXPERIMENT;
                  return (
                    <div
                      key={hr.id}
                      className="p-3 rounded-xl bg-gradient-to-br from-[#F8FAFC] to-[#F0FDFA]/50 border border-slate-200/80 space-y-2"
                    >
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
                      <div>
                        <div className="text-xs font-bold text-[#003B3A] leading-snug">
                          {hr.title}
                        </div>
                        <Link
                          href={`/teacher/skyline-connect/posts/${hr.postId}`}
                          className="text-[11px] text-slate-500 hover:text-[#159EAA] line-clamp-1 mt-0.5 block"
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
                        className="w-full py-1.5 rounded-lg bg-white hover:bg-[#003B3A] text-[#003B3A] hover:text-white border border-[#003B3A]/20 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Tôi có thể giúp
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-dashed border-slate-200 text-center space-y-1">
                <p className="text-xs font-semibold text-slate-700">
                  Các ý tưởng trên tường luôn sẵn sàng đón nhận mảnh ghép mới
                </p>
                <p className="text-[11px] text-slate-500">
                  Nhấn “Góp một mảnh” trên bất kỳ bài đăng nào để đề xuất cách làm, học liệu hoặc nhận thử nghiệm.
                </p>
              </div>
            )}
          </div>

          {/* 2. Bảng vàng sáng tạo */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#D6A74A]">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#003B3A]">Bảng vàng sáng tạo</h2>
                  <p className="text-[11px] text-slate-500">
                    {hallPreview?.period?.name || "Vinh danh tháng & năm học"}
                  </p>
                </div>
              </div>
              {hallPreview?.period && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  {hallPreview.isOfficial ? "Đã chốt" : "Tạm tính"}
                </span>
              )}
            </div>

            {topStandings.length > 0 ? (
              <div className="space-y-2">
                {topStandings.map((entry: any) => (
                  <div
                    key={`${entry.candidate.targetType}:${entry.candidate.targetId}`}
                    className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200/80 flex items-center gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#D6A74A]/20 border border-[#D6A74A] text-[#003B3A] text-xs font-extrabold flex items-center justify-center shrink-0 tabular-nums">
                      {entry.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {entry.candidate.targetTitle}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate tabular-nums">
                        {entry.candidate.authorName} •{" "}
                        {entry.candidate.totalScoreRaw !== null
                          ? `${entry.candidate.totalScoreRaw.toFixed(1)} đ`
                          : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-dashed border-slate-200 text-center space-y-1">
                <p className="text-xs font-semibold text-slate-700">
                  Chưa có kết quả xếp hạng đủ ngưỡng trong kỳ
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Tự động tổng hợp từ đánh giá cộng đồng (C), chuyên môn (E) và áp dụng thực tế (U).
                </p>
              </div>
            )}

            <Link
              href="/teacher/skyline-connect/hall-of-fame"
              className="w-full py-2 rounded-xl bg-[#F0F2F5] hover:bg-[#E4E6EB] text-xs font-bold text-[#003B3A] flex items-center justify-center gap-1 transition-colors"
            >
              <span>Xem bảng vàng & quy chế</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 3. Dự án tìm cộng sự */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] flex items-center justify-center text-[#159EAA]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#003B3A]">Dự án tìm cộng sự</h2>
                  <p className="text-[11px] text-slate-500">Gợi ý kết nối & hợp tác liên môn</p>
                </div>
              </div>
            </div>

            {feedData?.openProjectsForSidebar &&
            feedData.openProjectsForSidebar.length > 0 ? (
              <div className="space-y-2.5">
                {feedData.openProjectsForSidebar.map((proj: any) => (
                  <div
                    key={proj.id}
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80 space-y-2"
                  >
                    <div>
                      <Link
                        href={
                          proj.postId
                            ? `/teacher/skyline-connect/posts/${proj.postId}`
                            : `/teacher/skyline-connect/groups-projects?projectId=${proj.id}`
                        }
                        className="text-xs font-bold text-[#003B3A] hover:text-[#159EAA] line-clamp-2"
                      >
                        {proj.title}
                      </Link>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Chủ trì: {proj.ownerName} • {proj.campusName || "Sky-Line"}
                      </p>
                    </div>
                    {proj.neededRoles && proj.neededRoles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {proj.neededRoles.slice(0, 3).map((r: string, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] font-medium px-2 py-0.5 rounded bg-teal-50 text-[#00736E] border border-teal-200/70"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleJoinProject(proj.id, proj.title)}
                      className="w-full py-1.5 rounded-lg bg-[#159EAA] hover:bg-[#11828C] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Tham gia →
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-dashed border-slate-200 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-700">
                  Chưa có dự án đang tuyển cộng sự
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenComposer({ postType: "PROJECT" })}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-[#003B3A] hover:border-[#159EAA] cursor-pointer"
                >
                  + Mở dự án tìm cộng sự
                </button>
              </div>
            )}
          </div>

          {/* 4. Chủ đề quan tâm */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs space-y-2.5">
            <h2 className="text-sm font-bold text-[#003B3A] flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#159EAA]" />
              <span>Chủ đề nổi bật</span>
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {(catalogs.purposes || []).map((p: any) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => {
                    setPurposeTag(purposeTag === p.code ? "" : p.code);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    purposeTag === p.code
                      ? "bg-[#003B3A] text-white"
                      : "bg-[#F0F2F5] text-slate-700 hover:bg-[#E4E6EB]"
                  }`}
                >
                  #{p.name}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
      )}

      {/* Tạo Skill từ dữ liệu SSM Modal (6-Step Guided Workflow) */}
      <SsmDataSkillBuilderModal
        isOpen={ssmBuilderOpen}
        onClose={() => setSsmBuilderOpen(false)}
        workCategories={catalogs.skillWorkCategories || []}
        onSkillCreated={() => {
          showToast("Đã khởi tạo và lưu Skill môn học từ căn cứ dữ liệu SSM!");
          fetchWall();
        }}
      />

      {/* Đóng góp Skill môn học Modal (Form / AI-assisted / Package Upload / Fork) */}
      <SkillComposerAndUploadModal
        isOpen={skillComposerState.isOpen}
        onClose={() => setSkillComposerState({ isOpen: false })}
        initialSkill={skillComposerState.initialSkill}
        forkFromSkill={skillComposerState.forkFromSkill}
        catalogs={catalogs}
        onSaved={() => {
          showToast("Đã lưu Skill môn học thành công!");
          fetchWall();
        }}
      />

      {/* Chạy thử / Dùng trên SSM Modal */}
      <SkillRunnerModal
        isOpen={Boolean(skillRunnerTarget)}
        onClose={() => setSkillRunnerTarget(null)}
        skill={skillRunnerTarget}
        onAppliedConfirm={() => {
          setSkillRunnerTarget(null);
          showToast("Cảm ơn Thầy/Cô đã áp dụng Skill vào thực tế giảng dạy!");
        }}
      />

      {/* "Góp một mảnh sáng tạo" Modal */}
      {contributeModalState && (
        <ContributePieceModal
          isOpen={contributeModalState.isOpen}
          onClose={() => setContributeModalState(null)}
          onSuccess={() => {
            setContributeModalState(null);
            showToast("Đã gửi mảnh đóng góp thành công! Cảm ơn Thầy/Cô đã cùng sáng tạo.");
            fetchWall();
          }}
          targetPost={contributeModalState.targetPost}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          teachers={catalogs.teachers || []}
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

      {/* Unified Post Composer Modal */}
      <PostComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSuccess={() => {
          showToast("Đã đăng bài lên Bảng tin Sky-Line Connect!");
          fetchWall();
        }}
        initialData={composerInitialData}
        catalogs={catalogs}
      />

      {/* Rating / Application / Report Modal */}
      {modalConfig && (
        <RatingAndApplicationModal
          isOpen={modalConfig.isOpen}
          mode={modalConfig.mode}
          targetType={modalConfig.targetType}
          targetId={modalConfig.targetId}
          targetTitle={modalConfig.targetTitle}
          postId={modalConfig.postId}
          onClose={() => setModalConfig(null)}
          onSuccess={() => {
            showToast(
              modalConfig.mode === "RATING"
                ? "Cảm ơn Thầy/Cô đã gửi đánh giá sao!"
                : modalConfig.mode === "APPLICATION"
                ? "Đã ghi nhận báo cáo áp dụng thực tế!"
                : "Đã gửi phản ánh tới Ban điều phối."
            );
            fetchWall();
          }}
        />
      )}
    </div>
  );
}

export default function SkylineConnectWallPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">
          Đang tải Bảng tin Sky-Line Connect...
        </div>
      }
    >
      <SkylineConnectWallContent />
    </Suspense>
  );
}
