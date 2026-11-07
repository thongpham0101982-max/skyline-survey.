import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canUserAccessFeatureFlag, canViewPost } from "@/lib/skyline-connect/permissions";
import {
  resolveSlcUserContext,
  getSlcFeatureConfig,
  getSlcCatalogs,
  createOrUpdateSlcPost,
  shareSlcPost,
  toggleSlcReaction,
  toggleSlcSaveItem,
  toggleSlcFollow,
  createSlcComment,
  updateOrDeleteSlcComment,
  togglePinSlcComment,
  markCommentFeedbackStatus,
  releaseProductVersionWithCredit,
  toggleContributorPublicCreditOptOut,
  recordProductTrialLinkOpen,
  submitOrUpdateSlcRating,
  submitProductApplication,
  verifyProductApplication,
  handleProjectCollaboration,
  addSlcProjectProgress,
  handleSlcGroupAction,
  submitSlcExpertEvaluation,
  registerAwardNomination,
  computeOrLoadPeriodHallOfFame,
  finalizeSlcAwardPeriod,
  createAmendmentSnapshot,
  createOrProcessContentReport,
  updateSlcCommunityProfile,
  handleSlcAdminAction,
  safeJsonParse,
} from "@/lib/skyline-connect/service";
import {
  querySlcWallFeed,
  querySlcPostComments,
  getSlcPostFullDetail,
  getSlcMySpaceAndProfile,
  getSlcTeacherOverviewWidget,
  getSlcAdminOverviewData,
} from "@/lib/skyline-connect/queries";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Vui lòng đăng nhập để truy cập Sky-Line Connect." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "wall";

    const ctx = await resolveSlcUserContext(session.user as any);
    if (!ctx) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Không xác định được hồ sơ người dùng." },
        { status: 401 }
      );
    }

    const featureConfig = await getSlcFeatureConfig();
    if (!canUserAccessFeatureFlag(ctx, featureConfig)) {
      if (action === "overviewWidget") {
        return NextResponse.json({ enabled: false, recommendedProducts: [], openProjects: [] });
      }
      return NextResponse.json(
        {
          error: "FEATURE_DISABLED",
          message: "Phân hệ Sky-Line Connect hiện đang tạm đóng hoặc chỉ mở trong phạm vi thí điểm.",
        },
        { status: 403 }
      );
    }

    if (action === "overviewWidget") {
      const widget = await getSlcTeacherOverviewWidget(ctx);
      const recommendedProducts = [
        ...(widget.products || []).map((p: any) => ({
          id: p.postId || p.id,
          title: p.name,
          postType: "AI_PRODUCT",
          authorName: p.authorName,
          campusName: p.campusName,
          subjectName: safeJsonParse<string[]>(p.subjectCodesJson, [])[0] || null,
          gradeBand: safeJsonParse<string[]>(p.gradeLevelsJson, [])[0] || null,
          avgRating: Number(p.avgRating || 0),
          ratingCount: Number(p.validRatingCount || 0),
          product: {
            id: p.id,
            trialUrl: p.productUrl,
          },
        })),
        ...(widget.recentIdeas || []).map((i: any) => ({
          id: i.postId || i.id,
          title: i.title,
          postType: "IDEA",
          authorName: i.authorName,
          campusName: i.campusName,
          subjectName: safeJsonParse<string[]>(i.subjectCodesJson, [])[0] || null,
          gradeBand: safeJsonParse<string[]>(i.gradeLevelsJson, [])[0] || null,
          avgRating: Number(i.avgRating || 0),
          ratingCount: Number(i.validRatingCount || 0),
          product: null,
        })),
      ].slice(0, 4);

      const openProjects = (widget.openProjects || []).map((proj: any) => ({
        id: proj.id,
        postId: proj.postId,
        title: proj.title,
        summary: proj.goal,
        neededRoles: proj.neededRoles || [],
        neededHeadcount: 3,
        currentMemberCount: proj.memberCount || 1,
        leaderName: proj.ownerName,
        campusName: proj.campusName,
        subjectName: safeJsonParse<string[]>(proj.subjectCodesJson, [])[0] || null,
        gradeBand: safeJsonParse<string[]>(proj.gradeLevelsJson, [])[0] || null,
      }));

      return NextResponse.json({
        enabled: true,
        recommendedProducts,
        openProjects,
      });
    }

    if (action === "catalogs") {
      const catalogs = await getSlcCatalogs(ctx);
      return NextResponse.json({
        catalogs,
        currentUser: {
          userId: ctx.userId,
          fullName: ctx.fullName,
          campusId: ctx.campusId,
          campusName: ctx.campusName,
          mainSubjectCode: ctx.mainSubjectCode,
          mainSubjectName: ctx.mainSubjectName,
          systemRole: ctx.systemRole,
        },
      });
    }

    if (action === "wall") {
      const feed = await querySlcWallFeed(ctx, {
        tab: (searchParams.get("tab") as any) || "ALL",
        sort: (searchParams.get("sort") as any) || "NEWEST",
        followingOnly: searchParams.get("followingOnly") === "true",
        search: searchParams.get("search") || undefined,
        campusId: searchParams.get("campusId") || undefined,
        subjectCode: searchParams.get("subjectCode") || undefined,
        gradeLevel: searchParams.get("gradeLevel") || undefined,
        postType: searchParams.get("postType") || undefined,
        purposeTag: searchParams.get("purposeTag") || undefined,
        groupId: searchParams.get("groupId") || undefined,
        authorId: searchParams.get("authorId") || undefined,
        page: Number(searchParams.get("page") || 1),
        pageSize: Number(searchParams.get("pageSize") || 12),
      });

      const catalogs = await getSlcCatalogs(ctx);

      // Load active award period preview for right sidebar if available
      let hallOfFamePreview: any = null;
      const latestPeriod = catalogs.awardPeriods?.[0];
      if (latestPeriod) {
        hallOfFamePreview = await computeOrLoadPeriodHallOfFame(latestPeriod.id).catch(() => null);
      }

      return NextResponse.json({
        ...feed,
        catalogs,
        hallOfFamePreview,
        currentUser: {
          userId: ctx.userId,
          fullName: ctx.fullName,
          campusId: ctx.campusId,
          campusName: ctx.campusName,
          mainSubjectCode: ctx.mainSubjectCode,
          mainSubjectName: ctx.mainSubjectName,
          systemRole: ctx.systemRole,
          permissions: catalogs.userPermissions,
        },
      });
    }

    if (action === "detail") {
      const postId = searchParams.get("postId") || "";
      if (!postId) {
        return NextResponse.json({ error: "MISSING_POST_ID", message: "Thiếu mã bài đăng." }, { status: 400 });
      }
      const res = await getSlcPostFullDetail(ctx, postId);
      if (res.status === "NOT_FOUND") {
        return NextResponse.json({ error: "NOT_FOUND", message: "Không tìm thấy bài đăng." }, { status: 404 });
      }
      if (res.status === "PERMISSION_DENIED") {
        return NextResponse.json(
          { error: "PERMISSION_DENIED", message: "Thầy/Cô không có quyền xem nội dung này." },
          { status: 403 }
        );
      }
      const catalogs = await getSlcCatalogs(ctx);
      return NextResponse.json({
        post: res.post,
        catalogs,
        currentUser: {
          userId: ctx.userId,
          fullName: ctx.fullName,
          campusId: ctx.campusId,
          campusName: ctx.campusName,
          systemRole: ctx.systemRole,
          permissions: catalogs.userPermissions,
        },
      });
    }

    if (action === "comments") {
      const postId = searchParams.get("postId") || "";
      const sort = (searchParams.get("sort") as "NEWEST" | "OLDEST") || "NEWEST";
      const page = Number(searchParams.get("page") || 1);
      const pageSize = Number(searchParams.get("pageSize") || 10);
      const data = await querySlcPostComments(ctx, { postId, sort, page, pageSize });
      return NextResponse.json(data);
    }

    if (action === "hallOfFame") {
      const catalogs = await getSlcCatalogs(ctx);
      const requestedPeriodId = searchParams.get("periodId") || catalogs.awardPeriods?.[0]?.id;
      const campusId = searchParams.get("campusId") || undefined;
      const subjectCode = searchParams.get("subjectCode") || undefined;
      const gradeLevel = searchParams.get("gradeLevel") || undefined;

      if (!requestedPeriodId) {
        return NextResponse.json({
          period: null,
          periods: catalogs.awardPeriods || [],
          catalogs,
          ideaStandings: [],
          productStandings: [],
          isOfficial: false,
        });
      }

      const standings = await computeOrLoadPeriodHallOfFame(requestedPeriodId, {
        campusId,
        subjectCode,
        gradeLevel,
      });

      return NextResponse.json({
        ...standings,
        periods: catalogs.awardPeriods || [],
        catalogs,
        currentUser: {
          userId: ctx.userId,
          fullName: ctx.fullName,
          permissions: catalogs.userPermissions,
        },
      });
    }

    if (action === "groupsAndProjects") {
      const pAny = prisma as any;
      const [groups, projects, catalogs] = await Promise.all([
        pAny.slcGroup.findMany({
          where: { status: "ACTIVE" },
          include: {
            members: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        pAny.slcProject.findMany({
          include: {
            members: { orderBy: { createdAt: "asc" } },
            progressUpdates: { orderBy: { createdAt: "desc" } },
          },
          orderBy: { createdAt: "desc" },
        }),
        getSlcCatalogs(ctx),
      ]);

      const visibleProjects = projects
        .filter((proj: any) =>
          canViewPost(ctx, {
            id: proj.id,
            authorId: proj.ownerId,
            status: "PUBLISHED",
            visibility: proj.visibility,
            campusId: proj.campusId,
            groupId: proj.groupId,
          })
        )
        .map((proj: any) => ({
          ...proj,
          neededRoles: safeJsonParse<string[]>(proj.neededRolesJson, []),
          subjectCodes: safeJsonParse<string[]>(proj.subjectCodesJson, []),
          gradeLevels: safeJsonParse<string[]>(proj.gradeLevelsJson, []),
        }));

      const formattedGroups = groups.map((g: any) => {
        const myMembership = (g.members || []).find((m: any) => m.userId === ctx.userId);
        return {
          ...g,
          myStatus: g.ownerId === ctx.userId ? "APPROVED" : myMembership?.status || null,
          isOwner: g.ownerId === ctx.userId,
          pendingMembers:
            g.ownerId === ctx.userId || ctx.moderatedGroupIds.includes(g.id)
              ? (g.members || []).filter((m: any) => m.status === "PENDING")
              : [],
        };
      });

      return NextResponse.json({
        groups: formattedGroups,
        projects: visibleProjects,
        catalogs,
        currentUser: {
          userId: ctx.userId,
          fullName: ctx.fullName,
          permissions: catalogs.userPermissions,
        },
      });
    }

    if (action === "mySpace") {
      const targetUserId = searchParams.get("userId") || undefined;
      const [data, catalogs] = await Promise.all([
        getSlcMySpaceAndProfile(ctx, targetUserId),
        getSlcCatalogs(ctx),
      ]);
      return NextResponse.json({
        ...data,
        catalogs,
        currentUser: {
          userId: ctx.userId,
          fullName: ctx.fullName,
          permissions: catalogs.userPermissions,
        },
      });
    }

    if (action === "adminOverview") {
      const data = await getSlcAdminOverviewData(ctx);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "INVALID_ACTION", message: "Action không hợp lệ." }, { status: 400 });
  } catch (err: any) {
    const msg = String(err?.message || "Đã xảy ra lỗi khi tải dữ liệu Sky-Line Connect.");
    const isPerm = msg.includes("PERMISSION_DENIED");
    return NextResponse.json(
      { error: isPerm ? "PERMISSION_DENIED" : "SERVER_ERROR", message: msg.replace("PERMISSION_DENIED: ", "") },
      { status: isPerm ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Vui lòng đăng nhập để thực hiện thao tác." },
        { status: 401 }
      );
    }

    const ctx = await resolveSlcUserContext(session.user as any);
    if (!ctx) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Không xác định được hồ sơ người dùng." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const action = body?.action;

    if (action === "createOrUpdatePost") {
      const post = await createOrUpdateSlcPost(ctx, body);
      return NextResponse.json({ ok: true, post });
    }

    if (action === "sharePost") {
      const shared = await shareSlcPost(ctx, body);
      return NextResponse.json({ ok: true, post: shared });
    }

    if (action === "toggleReaction") {
      const result = await toggleSlcReaction(ctx, body);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "toggleSave") {
      const result = await toggleSlcSaveItem(ctx, body);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "toggleFollow") {
      const result = await toggleSlcFollow(ctx, body);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "createComment") {
      const result = await createSlcComment(ctx, body);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "updateComment" || action === "deleteComment") {
      const result = await updateOrDeleteSlcComment(ctx, {
        commentId: body.commentId,
        action: action === "deleteComment" ? "DELETE" : "EDIT",
        content: body.content,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "togglePinComment") {
      const updated = await togglePinSlcComment(ctx, body.commentId);
      return NextResponse.json({ ok: true, comment: updated });
    }

    if (action === "markFeedbackStatus") {
      const updated = await markCommentFeedbackStatus(ctx, body);
      return NextResponse.json({ ok: true, comment: updated });
    }

    if (action === "releaseProductVersion") {
      const version = await releaseProductVersionWithCredit(ctx, body);
      return NextResponse.json({ ok: true, version });
    }

    if (action === "toggleContributorOptOut") {
      const updated = await toggleContributorPublicCreditOptOut(ctx, body.versionId, Boolean(body.optOut));
      return NextResponse.json({ ok: true, version: updated });
    }

    if (action === "openProductLink") {
      const result = await recordProductTrialLinkOpen(ctx, body.productId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "submitRating") {
      const result = await submitOrUpdateSlcRating(ctx, body);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "submitApplication") {
      const application = await submitProductApplication(ctx, body);
      return NextResponse.json({ ok: true, application });
    }

    if (action === "verifyApplication") {
      const application = await verifyProductApplication(ctx, body);
      return NextResponse.json({ ok: true, application });
    }

    if (action === "projectAction") {
      const result = await handleProjectCollaboration(ctx, body);
      return NextResponse.json({ ok: true, result });
    }

    if (action === "addProjectProgress") {
      const progress = await addSlcProjectProgress(ctx, body);
      return NextResponse.json({ ok: true, progress });
    }

    if (action === "groupAction") {
      const result = await handleSlcGroupAction(ctx, body);
      return NextResponse.json({ ok: true, result });
    }

    if (action === "submitExpertEvaluation") {
      const evaluation = await submitSlcExpertEvaluation(ctx, body);
      return NextResponse.json({ ok: true, evaluation });
    }

    if (action === "registerNomination") {
      const nomination = await registerAwardNomination(ctx, body);
      return NextResponse.json({ ok: true, nomination });
    }

    if (action === "finalizePeriod") {
      const result = await finalizeSlcAwardPeriod(ctx, body.periodId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "amendSnapshot") {
      const amendment = await createAmendmentSnapshot(ctx, body);
      return NextResponse.json({ ok: true, amendment });
    }

    if (action === "reportAction") {
      const report = await createOrProcessContentReport(ctx, body);
      return NextResponse.json({ ok: true, report });
    }

    if (action === "updateProfile") {
      const profile = await updateSlcCommunityProfile(ctx, body);
      return NextResponse.json({ ok: true, profile });
    }

    if (action === "adminAction") {
      const result = await handleSlcAdminAction(ctx, body);
      return NextResponse.json({ ok: true, result });
    }

    return NextResponse.json(
      { error: "INVALID_ACTION", message: "Thao tác không hợp lệ." },
      { status: 400 }
    );
  } catch (err: any) {
    const msg = String(err?.message || "Không thể thực hiện thao tác.");
    const isPerm = msg.includes("PERMISSION_DENIED") || msg.includes("không có quyền");
    return NextResponse.json(
      {
        error: isPerm ? "PERMISSION_DENIED" : "VALIDATION_ERROR",
        message: msg.replace("PERMISSION_DENIED: ", ""),
      },
      { status: isPerm ? 403 : 400 }
    );
  }
}
