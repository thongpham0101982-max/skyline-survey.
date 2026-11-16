import { prisma } from "@/lib/db"
import { canViewPost, isSuperOrCommunityAdmin, hasSlcRoleInScope, SlcUserContext } from "./permissions"
import {
  buildPostSpreadJourney,
  computeBayesianScoreC,
  computeDiscoveryRankScore,
  computeDiscussionHotScore,
  SlcPostBumpEvent,
} from "./scoring"
import { ensureSlcSchema, getSlcDb } from "./schema-init"
import { safeJsonParse, computeOrLoadPeriodHallOfFame } from "./service"

export interface WallFilterParams {
  tab?: "ALL" | "NEW_IDEAS" | "AI_PRODUCTS" | "SKILLS" | "SEEKING_COLLABORATORS" | "SAVED"
  sort?: "ACTIVE" | "NEWEST" | "DISCUSSING" | "MOST_APPLIED" | "USEFUL" | "DISCOVER"
  followingOnly?: boolean
  search?: string
  campusId?: string
  departmentId?: string
  visibility?: string
  subjectCode?: string
  gradeLevel?: string
  postType?: string
  purposeTag?: string
  groupId?: string
  authorId?: string
  page?: number
  pageSize?: number
}

/**
 * Truy vấn danh sách bài trên Bức tường ý tưởng AI & Khám phá sáng tạo:
 * - Tôn trọng tuyệt đối quyền truy cập bài (canViewPost) và bài chia sẻ lại (sharedFromPostId).
 * - Hỗ trợ đầy đủ các Tab:
 *   + ALL (Tất cả)
 *   + NEW_IDEAS (Ý tưởng mới: chỉ lấy loại IDEA và sắp theo ngày đăng)
 *   + AI_PRODUCTS (Sản phẩm AI)
 *   + SEEKING_COLLABORATORS (Tìm cộng sự: lấy đối tượng Ý tưởng hoặc Dự án còn mở nhận thành viên)
 *   + SAVED (Đã lưu: chỉ hiển thị nội dung đã lưu mà người dùng còn quyền truy cập)
 * - Hỗ trợ lọc Đang theo dõi (followingOnly), Cơ sở, Môn học, Khối lớp, Loại bài, Mục đích, Nhóm và Tìm kiếm từ khóa.
 * - Tách lựa chọn sắp xếp: Mới nhất (NEWEST) / Hữu ích (USEFUL) / Mới đáng khám phá (DISCOVER).
 * - Kèm tối đa 2 bình luận cấp đầu xem trước trên mỗi thẻ (bình luận ghim nằm đầu).
 */
export async function querySlcWallFeed(ctx: SlcUserContext, params: WallFilterParams = {}) {
  await ensureSlcSchema()
  const pAny = getSlcDb()

  const page = Math.max(1, Number(params.page || 1))
  const pageSize = Math.min(36, Math.max(1, Number(params.pageSize || 12)))
  const tab = params.tab || "ALL"
  const effectiveSort = tab === "NEW_IDEAS" ? "NEWEST" : params.sort || "NEWEST"

  const [
    rawPosts,
    groups,
    ideas,
    products,
    projects,
    skills,
    userReactions,
    userSaved,
    userFollows,
    allHelpRequests,
    userAppliedConfirmations,
  ] = await Promise.all([
    pAny.slcPost.findMany({
      where: {
        status: "PUBLISHED",
        ...(params.groupId ? { groupId: params.groupId } : {}),
        ...(params.authorId ? { authorId: params.authorId } : {}),
      },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }, { id: "desc" }],
    }),
    pAny.slcGroup.findMany({ where: { status: "ACTIVE" } }),
    pAny.slcIdea.findMany(),
    pAny.slcProduct.findMany(),
    pAny.slcProject.findMany({
      include: {
        members: { where: { status: "APPROVED" } },
      },
    }),
    pAny.slcSkill?.findMany().catch(() => []) ?? [],
    pAny.slcReaction.findMany({
      where: { userId: ctx.userId, targetType: "POST" },
    }),
    pAny.slcSavedItem.findMany({
      where: { userId: ctx.userId },
    }),
    pAny.slcFollow.findMany({
      where: { followerId: ctx.userId },
    }),
    pAny.slcHelpRequest
      ?.findMany({
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []) ?? [],
    pAny.slcAppliedConfirmation
      ?.findMany({
        where: { userId: ctx.userId },
      })
      .catch(() => []) ?? [],
  ])

  const groupMap = new Map<string, any>(groups.map((g: any) => [String(g.id), g]))
  const postMap = new Map<string, any>(rawPosts.map((p: any) => [String(p.id), p]))
  const ideaById = new Map<string, any>(ideas.map((i: any) => [String(i.id), i]))
  const ideaByPostId = new Map<string, any>(ideas.map((i: any) => [String(i.postId), i]))
  const productById = new Map<string, any>(products.map((p: any) => [String(p.id), p]))
  const productByPostId = new Map<string, any>(
    products.filter((p: any) => p.postId).map((p: any) => [String(p.postId), p])
  )
  const projectById = new Map<string, any>(projects.map((p: any) => [String(p.id), p]))
  const projectByPostId = new Map<string, any>(
    projects.filter((p: any) => p.postId).map((p: any) => [String(p.postId), p])
  )
  const skillById = new Map<string, any>(skills.map((s: any) => [String(s.id), s]))
  const skillByPostId = new Map<string, any>(
    skills.filter((s: any) => s.postId).map((s: any) => [String(s.postId), s])
  )
  const userAppliedTargetKeys = new Set<string>(
    userAppliedConfirmations.map((a: any) => `${a.targetType}:${a.targetId}`)
  )
  const userAppliedPostIds = new Set<string>(
    userAppliedConfirmations
      .map((a: any) => String(a.postId || (a.targetType === "POST" ? a.targetId : "")))
      .filter(Boolean)
  )

  const reactionByPostId = new Map<string, string>(
    userReactions.map((r: any) => [String(r.targetId), String(r.reactionType)])
  )
  const savedPostIds = new Set<string>(
    userSaved
      .map((s: any) => String(s.postId || (s.targetType === "POST" ? s.targetId : "")))
      .filter(Boolean)
  )
  const savedTargetKeys = new Set<string>(
    userSaved.map((s: any) => `${s.targetType}:${s.targetId}`)
  )
  const followedUserIds = new Set<string>(
    userFollows.filter((f: any) => f.targetType === "USER").map((f: any) => String(f.targetId))
  )
  const followedPostIds = new Set<string>(
    userFollows.filter((f: any) => f.targetType === "POST").map((f: any) => String(f.targetId))
  )
  const followedGroupIds = new Set<string>(
    userFollows.filter((f: any) => f.targetType === "GROUP").map((f: any) => String(f.targetId))
  )
  const followedProjectIds = new Set<string>(
    userFollows.filter((f: any) => f.targetType === "PROJECT").map((f: any) => String(f.targetId))
  )

  // 1. Filter by permission (including sharedFromPostId & DEPARTMENT check!)
  const accessiblePosts = rawPosts.filter((post: any) => {
    const grp = post.groupId ? groupMap.get(post.groupId) : null
    let sourceTarget = null
    if (post.sharedFromPostId) {
      const src = postMap.get(post.sharedFromPostId)
      if (!src) {
        // Source post is not PUBLISHED or was deleted/hidden -> shared post must NOT leak or show
        return false
      }
      const srcGrp = src.groupId ? groupMap.get(src.groupId) : null
      sourceTarget = {
        id: src.id,
        authorId: src.authorId,
        status: src.status,
        visibility: src.visibility,
        campusId: src.campusId,
        departmentId: src.departmentId,
        groupId: src.groupId,
        groupVisibility: srcGrp?.visibility || null,
      }
    }

    return canViewPost(
      ctx,
      {
        id: post.id,
        authorId: post.authorId,
        status: post.status,
        visibility: post.visibility,
        campusId: post.campusId,
        departmentId: post.departmentId,
        groupId: post.groupId,
        groupVisibility: grp?.visibility || null,
      },
      sourceTarget
    )
  })

  const helpRequestsByPostId = new Map<string, any[]>()
  for (const hr of allHelpRequests) {
    if (!hr.postId) continue
    const arr = helpRequestsByPostId.get(String(hr.postId)) || []
    arr.push(hr)
    helpRequestsByPostId.set(String(hr.postId), arr)
  }

  // Enrich each accessible post with Idea / Product / Project / Skill metadata
  const enrichedPosts = accessiblePosts.map((post: any) => {
    const linkedIdea =
      (post.linkedIdeaId && ideaById.get(post.linkedIdeaId)) || ideaByPostId.get(post.id) || null
    const linkedProduct =
      (post.linkedProductId && productById.get(post.linkedProductId)) ||
      productByPostId.get(post.id) ||
      null
    const linkedProject =
      (post.linkedProjectId && projectById.get(post.linkedProjectId)) ||
      projectByPostId.get(post.id) ||
      null
    const linkedSkill =
      (post.linkedSkillId && skillById.get(post.linkedSkillId)) ||
      skillByPostId.get(post.id) ||
      null
    const sourcePost = post.sharedFromPostId ? postMap.get(post.sharedFromPostId) || null : null
    const postHelpRequests = helpRequestsByPostId.get(post.id) || []
    const openHelpRequests = postHelpRequests.filter((h: any) => h.status === "OPEN")

    const subjectCodes = safeJsonParse<string[]>(post.subjectCodesJson, [])
    const gradeLevels = safeJsonParse<string[]>(post.gradeLevelsJson, [])
    const purposeTags = safeJsonParse<string[]>(post.purposeTagsJson, [])
    const tags = safeJsonParse<string[]>(post.tagsJson, [])
    const mentionedUserIds = safeJsonParse<string[]>(post.mentionedUserIdsJson, [])
    const collaboratorIds = safeJsonParse<string[]>(post.collaboratorIdsJson, [])
    const collaboratorNames = safeJsonParse<string[]>(post.collaboratorNamesJson, [])

    const isSaved =
      savedPostIds.has(post.id) ||
      (linkedIdea && savedTargetKeys.has(`IDEA:${linkedIdea.id}`)) ||
      (linkedProduct && savedTargetKeys.has(`PRODUCT:${linkedProduct.id}`)) ||
      (linkedProject && savedTargetKeys.has(`PROJECT:${linkedProject.id}`)) ||
      (linkedSkill && savedTargetKeys.has(`SKILL:${linkedSkill.id}`))

    const hasUserApplied =
      userAppliedPostIds.has(post.id) ||
      userAppliedTargetKeys.has(`POST:${post.id}`) ||
      (linkedSkill && userAppliedTargetKeys.has(`SKILL:${linkedSkill.id}`)) ||
      (linkedProduct && userAppliedTargetKeys.has(`PRODUCT:${linkedProduct.id}`))

    const totalAppliedCount = Math.max(
      Number(post.appliedCount || 0),
      Number(linkedSkill?.appliedCount || 0),
      Number(linkedProduct?.selfAppliedCount || 0)
    )

    const isSeekingCollaborators =
      (linkedIdea && linkedIdea.status === "SEEKING_COLLABORATORS") ||
      (linkedProject && linkedProject.status === "SEEKING_COLLABORATORS") ||
      openHelpRequests.length > 0

    const avgRating =
      linkedSkill?.avgRating ?? linkedProduct?.avgRating ?? linkedIdea?.avgRating ?? 0
    const validRatingCount =
      linkedSkill?.validRatingCount ??
      linkedProduct?.validRatingCount ??
      linkedIdea?.validRatingCount ??
      0

    const bumpedAtMs = post.lastBumpedAt
      ? new Date(post.lastBumpedAt).getTime()
      : new Date(post.publishedAt).getTime()
    const pubAtMs = new Date(post.publishedAt).getTime()
    const isActivelyBumped = bumpedAtMs > pubAtMs + 1000
    const bumpEvents = safeJsonParse<SlcPostBumpEvent[]>(post.bumpEventsJson, [])
    const discussionHotScore = computeDiscussionHotScore({
      authorId: post.authorId,
      publishedAt: post.publishedAt,
      bumpEvents,
      reactionCount: post.reactionCount,
      commentCount: post.commentCount,
    })

    return {
      ...post,
      subjectCodes,
      gradeLevels,
      purposeTags,
      tags,
      mentionedUserIds,
      collaboratorIds,
      collaboratorNames,
      linkedIdea,
      linkedProduct,
      linkedProject,
      linkedSkill,
      helpRequests: postHelpRequests,
      openHelpRequests,
      isActivelyBumped,
      discussionHotScore,
      totalAppliedCount,
      hasUserApplied: Boolean(hasUserApplied),
      sourcePost: sourcePost
        ? {
            id: sourcePost.id,
            title: sourcePost.title,
            authorId: sourcePost.authorId,
            authorName: sourcePost.authorName,
            campusName: sourcePost.campusName,
            postType: sourcePost.postType,
          }
        : null,
      userReaction: reactionByPostId.get(post.id) || null,
      isSaved: Boolean(isSaved),
      isFollowingAuthor: followedUserIds.has(post.authorId),
      isFollowingPost: followedPostIds.has(post.id),
      isSeekingCollaborators: Boolean(isSeekingCollaborators),
      avgRating: Number(avgRating),
      validRatingCount: Number(validRatingCount),
    }
  })

  // Editorial Spotlight ("Dấu ấn sáng tạo tháng"): 1 main + 2 sub cards
  const editorialFeatured = enrichedPosts
    .filter((p: any) => p.isEditorialFeatured)
    .sort((a: any, b: any) => (a.featuredSlot || 99) - (b.featuredSlot || 99))
    .slice(0, 3)

  // Apply Tab & Attribute Filters
  const qLower = (params.search || "").trim().toLowerCase()

  const filtered = enrichedPosts.filter((p: any) => {
    if (tab === "NEW_IDEAS" && p.postType !== "IDEA") return false
    if (tab === "AI_PRODUCTS" && p.postType !== "AI_PRODUCT") return false
    if (tab === "SKILLS" && p.postType !== "SKILL" && !p.linkedSkill) return false
    if (tab === "SEEKING_COLLABORATORS" && !p.isSeekingCollaborators) return false
    if (tab === "SAVED" && !p.isSaved) return false

    if (params.postType && params.postType !== "ALL" && p.postType !== params.postType) {
      return false
    }
    if (params.visibility && params.visibility !== "ALL" && p.visibility !== params.visibility) {
      return false
    }
    if (params.campusId && params.campusId !== "ALL" && p.campusId !== params.campusId) {
      return false
    }
    if (
      params.departmentId &&
      params.departmentId !== "ALL" &&
      p.departmentId !== params.departmentId
    ) {
      return false
    }
    if (
      params.subjectCode &&
      params.subjectCode !== "ALL" &&
      !p.subjectCodes.includes(params.subjectCode)
    ) {
      return false
    }
    if (
      params.gradeLevel &&
      params.gradeLevel !== "ALL" &&
      !p.gradeLevels.includes(params.gradeLevel)
    ) {
      return false
    }
    if (
      params.purposeTag &&
      params.purposeTag !== "ALL" &&
      !p.purposeTags.includes(params.purposeTag)
    ) {
      return false
    }
    if (params.followingOnly) {
      const followsAny =
        followedUserIds.has(p.authorId) ||
        followedPostIds.has(p.id) ||
        (p.groupId && followedGroupIds.has(p.groupId)) ||
        (p.linkedProject?.id && followedProjectIds.has(p.linkedProject.id))
      if (!followsAny) return false
    }

    if (qLower) {
      const haystack = [
        p.title || "",
        p.summary || "",
        p.content || "",
        p.topicName || "",
        p.authorName || "",
        p.campusName || "",
        p.departmentName || "",
        p.linkedProduct?.utilitySummary || "",
        p.linkedIdea?.problemStatement || "",
        p.linkedSkill?.name || "",
        p.linkedSkill?.purpose || "",
        ...(p.tags || []),
        ...(p.subjectCodes || []),
        ...(p.gradeLevels || []),
        ...(p.collaboratorNames || []),
      ]
        .join(" ")
        .toLowerCase()

      if (!haystack.includes(qLower)) return false
    }

    return true
  })

  // Sort according to effectiveSort: NEWEST | DISCUSSING | MOST_APPLIED | ACTIVE | USEFUL | DISCOVER
  const sorted = [...filtered].sort((a: any, b: any) => {
    // Pinned posts stay at the top
    if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
      return a.isPinned ? -1 : 1
    }

    if (effectiveSort === "DISCUSSING") {
      const scoreDiff = Number(b.discussionHotScore || 0) - Number(a.discussionHotScore || 0)
      if (Math.abs(scoreDiff) > 1e-6) return scoreDiff
      const bumpA = a.lastBumpedAt
        ? new Date(a.lastBumpedAt).getTime()
        : new Date(a.publishedAt).getTime()
      const bumpB = b.lastBumpedAt
        ? new Date(b.lastBumpedAt).getTime()
        : new Date(b.publishedAt).getTime()
      if (bumpB !== bumpA) return bumpB - bumpA
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    }

    if (effectiveSort === "MOST_APPLIED") {
      const appDiff = Number(b.totalAppliedCount || 0) - Number(a.totalAppliedCount || 0)
      if (appDiff !== 0) return appDiff
      const reactDiff = Number(b.reactionCount || 0) - Number(a.reactionCount || 0)
      if (reactDiff !== 0) return reactDiff
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    }

    if (effectiveSort === "NEWEST") {
      const tA = new Date(a.publishedAt).getTime()
      const tB = new Date(b.publishedAt).getTime()
      if (tB !== tA) return tB - tA
      return String(b.id).localeCompare(String(a.id))
    }

    if (effectiveSort === "ACTIVE") {
      const bumpA = a.lastBumpedAt
        ? new Date(a.lastBumpedAt).getTime()
        : new Date(a.publishedAt).getTime()
      const bumpB = b.lastBumpedAt
        ? new Date(b.lastBumpedAt).getTime()
        : new Date(b.publishedAt).getTime()
      if (bumpB !== bumpA) return bumpB - bumpA
      const tA = new Date(a.publishedAt).getTime()
      const tB = new Date(b.publishedAt).getTime()
      if (tB !== tA) return tB - tA
      return String(b.id).localeCompare(String(a.id))
    }

    if (effectiveSort === "USEFUL") {
      // Public utility score combining Bayesian star score C + reactions
      const cA = computeBayesianScoreC(a.validRatingCount, a.avgRating) + a.reactionCount * 1.5
      const cB = computeBayesianScoreC(b.validRatingCount, b.avgRating) + b.reactionCount * 1.5
      if (Math.abs(cB - cA) > 1e-6) return cB - cA
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    }

    // DISCOVER ("Mới đáng khám phá"): prioritize fresh content with low reach
    const dA = computeDiscoveryRankScore(a)
    const dB = computeDiscoveryRankScore(b)
    if (Math.abs(dB - dA) > 1e-6) return dB - dA
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  })

  const latestBumpTimestamp =
    sorted.length > 0
      ? sorted.reduce((maxMs: number, item: any) => {
          const t = item.lastBumpedAt
            ? new Date(item.lastBumpedAt).getTime()
            : new Date(item.publishedAt).getTime()
          return t > maxMs ? t : maxMs
        }, 0)
      : 0

  const total = sorted.length
  const startIndex = (page - 1) * pageSize
  const pagedPosts = sorted.slice(startIndex, startIndex + pageSize)

  // Load up to 2 top-level preview comments per card on current page
  const pagePostIds = pagedPosts.map((p: any) => p.id)
  const [previewCommentsRaw, attachmentsRaw] = await Promise.all([
    pagePostIds.length > 0
      ? pAny.slcComment.findMany({
          where: {
            postId: { in: pagePostIds },
            parentId: null,
            status: "ACTIVE",
            isDeleted: false,
          },
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        })
      : [],
    pagePostIds.length > 0
      ? pAny.slcAttachment.findMany({
          where: {
            postId: { in: pagePostIds },
            isDeleted: false,
          },
        })
      : [],
  ])

  const previewByPost = new Map<string, any[]>()
  for (const c of previewCommentsRaw) {
    const list = previewByPost.get(c.postId) || []
    if (list.length < 2) {
      list.push(c)
      previewByPost.set(c.postId, list)
    }
  }

  // Also load 1 reply preview for any top-level preview comment that has replies
  const previewParentIds = Array.from(previewByPost.values())
    .flat()
    .map((c: any) => c.id)

  const previewRepliesRaw =
    previewParentIds.length > 0
      ? await pAny.slcComment.findMany({
          where: {
            parentId: { in: previewParentIds },
            status: "ACTIVE",
            isDeleted: false,
          },
          orderBy: [{ createdAt: "asc" }],
        })
      : []

  const repliesByParent = new Map<string, any[]>()
  for (const rep of previewRepliesRaw) {
    const arr = repliesByParent.get(rep.parentId) || []
    if (arr.length < 2) {
      arr.push(rep)
      repliesByParent.set(rep.parentId, arr)
    }
  }

  const attachmentsByPost = new Map<string, any[]>()
  for (const att of attachmentsRaw) {
    if (!att.postId) continue
    const arr = attachmentsByPost.get(att.postId) || []
    arr.push(att)
    attachmentsByPost.set(att.postId, arr)
  }

  const items = pagedPosts.map((p: any) => ({
    ...p,
    attachments: attachmentsByPost.get(p.id) || [],
    previewComments: (previewByPost.get(p.id) || []).map((c: any) => ({
      ...c,
      links: safeJsonParse<Array<{ url: string; title?: string }>>(c.linksJson, []),
      statusHistory: safeJsonParse<any[]>(c.statusHistoryJson, []),
      replies: (repliesByParent.get(c.id) || []).map((r: any) => ({
        ...r,
        links: safeJsonParse<Array<{ url: string; title?: string }>>(r.linksJson, []),
        statusHistory: safeJsonParse<any[]>(r.statusHistoryJson, []),
      })),
    })),
  }))

  // Right sidebar data: Open projects seeking collaborators & open colleague help requests ("Đang cần một đồng nghiệp...")
  const openProjectsForSidebar = projects
    .filter((proj: any) => {
      if (proj.status !== "SEEKING_COLLABORATORS") return false
      if (proj.visibility === "GROUP" && proj.groupId && !ctx.approvedGroupIds.includes(proj.groupId)) {
        return false
      }
      return true
    })
    .slice(0, 4)
    .map((proj: any) => ({
      ...proj,
      neededRoles: safeJsonParse<string[]>(proj.neededRolesJson, []),
      subjectCodes: safeJsonParse<string[]>(proj.subjectCodesJson, []),
      gradeLevels: safeJsonParse<string[]>(proj.gradeLevelsJson, []),
    }))

  const accessiblePostIdSet = new Set(accessiblePosts.map((p: any) => String(p.id)))
  const openHelpRequestsForSidebar = allHelpRequests
    .filter((hr: any) => hr.status === "OPEN" && accessiblePostIdSet.has(String(hr.postId)))
    .slice(0, 6)
    .map((hr: any) => {
      const parentPost = postMap.get(String(hr.postId))
      return {
        ...hr,
        postTitle: parentPost?.title || "Chia sẻ sáng tạo",
        postAuthorName: parentPost?.authorName || hr.authorName,
        postCoverImageUrl: parentPost?.coverImageUrl || null,
      }
    })

  return {
    items,
    editorialFeatured,
    openProjectsForSidebar,
    openHelpRequestsForSidebar,
    latestBumpTimestamp,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasMore: startIndex + pageSize < total,
    },
  }
}

/**
 * Truy vấn bình luận theo luồng 2 cấp có phân trang (mặc định tải thêm theo trang, hỗ trợ sắp xếp Mới nhất / Cũ nhất,
 * lọc Tất cả trao đổi (ALL) hoặc Mảnh đóng góp (CONTRIBUTIONS / loại cụ thể), bình luận ghim luôn nằm đầu với nhãn rõ).
 */
export async function querySlcPostComments(
  ctx: SlcUserContext,
  input: {
    postId: string
    sort?: "NEWEST" | "OLDEST"
    filterType?: "ALL" | "CONTRIBUTIONS" | "METHOD" | "MATERIAL" | "EXPERIMENT" | "SKILL" | "CONNECTION"
    page?: number
    pageSize?: number
    replyPageSize?: number
  }
) {
  await ensureSlcSchema()
  const pAny = getSlcDb()

  const post = await pAny.slcPost.findUnique({ where: { id: input.postId } })
  if (!post) {
    throw new Error("Không tìm thấy bài đăng.")
  }

  let groupVisibility: string | null = null
  if (post.groupId) {
    const grp = await pAny.slcGroup.findUnique({ where: { id: post.groupId } })
    groupVisibility = grp?.visibility || "PRIVATE"
  }

  if (
    !canViewPost(ctx, {
      id: post.id,
      authorId: post.authorId,
      status: post.status,
      visibility: post.visibility,
      campusId: post.campusId,
      groupId: post.groupId,
      groupVisibility,
    })
  ) {
    throw new Error("PERMISSION_DENIED: Thầy/Cô không có quyền xem bình luận của bài đăng này.")
  }

  const page = Math.max(1, Number(input.page || 1))
  const pageSize = Math.min(50, Math.max(1, Number(input.pageSize || 10)))
  const sortOrder = input.sort === "OLDEST" ? "asc" : "desc"
  const filterType = input.filterType || "ALL"

  const allComments = await pAny.slcComment.findMany({
    where: {
      postId: post.id,
      status: { in: ["ACTIVE", "DELETED"] },
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: sortOrder }, { id: sortOrder }],
  })

  const commentIds = allComments.map((c: any) => c.id)
  const [attachments, userReactions] = await Promise.all([
    commentIds.length > 0
      ? pAny.slcAttachment.findMany({
          where: {
            commentId: { in: commentIds },
            isDeleted: false,
          },
        })
      : [],
    commentIds.length > 0
      ? pAny.slcReaction.findMany({
          where: {
            userId: ctx.userId,
            targetType: "COMMENT",
            targetId: { in: commentIds },
          },
        })
      : [],
  ])

  const attByComment = new Map<string, any[]>()
  for (const a of attachments) {
    if (!a.commentId) continue
    const arr = attByComment.get(a.commentId) || []
    arr.push(a)
    attByComment.set(a.commentId, arr)
  }

  const reactionByComment = new Map<string, string>(
    userReactions.map((r: any) => [String(r.targetId), String(r.reactionType)])
  )

  const repliesByParent = new Map<string, any[]>()
  for (const c of allComments) {
    if (c.parentId) {
      // Replies: only show active replies or deleted replies that still have references
      if (c.isDeleted) continue
      const arr = repliesByParent.get(c.parentId) || []
      arr.push({
        ...c,
        links: safeJsonParse<Array<{ url: string; title?: string }>>(c.linksJson, []),
        statusHistory: safeJsonParse<any[]>(c.statusHistoryJson, []),
        attachments: attByComment.get(c.id) || [],
        userReaction: reactionByComment.get(c.id) || null,
      })
      repliesByParent.set(c.parentId, arr)
    }
  }

  // Sort replies chronologically ascending inside each thread
  for (const [pid, list] of repliesByParent.entries()) {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    repliesByParent.set(pid, list)
  }

  // Filter top-level comments: keep active ones, OR deleted ones ONLY if they have active replies (placeholder rule!)
  const allTopLevel = allComments.filter((c: any) => {
    if (c.parentId !== null) return false
    if (!c.isDeleted && c.status === "ACTIVE") return true
    const activeReplies = repliesByParent.get(c.id) || []
    return c.isDeleted && activeReplies.length > 0
  })

  // Calculate counts for filter tabs ("Tất cả trao đổi" vs "Mảnh đóng góp")
  const activeTopAndReplies = allComments.filter((c: any) => !c.isDeleted && c.status === "ACTIVE")
  const contributionPiecesCount = activeTopAndReplies.filter(
    (c: any) => c.contributionType && c.contributionType !== "NONE"
  ).length

  const topLevel = allTopLevel.filter((c: any) => {
    if (filterType === "ALL") return true
    const cType = c.contributionType || "NONE"
    const replies = repliesByParent.get(c.id) || []
    if (filterType === "CONTRIBUTIONS") {
      return (
        (!c.isDeleted && cType !== "NONE") ||
        replies.some((r: any) => r.contributionType && r.contributionType !== "NONE")
      )
    }
    return (
      (!c.isDeleted && cType === filterType) ||
      replies.some((r: any) => r.contributionType === filterType)
    )
  })

  const totalTopLevel = topLevel.length
  const startIndex = (page - 1) * pageSize
  const pagedTop = topLevel.slice(startIndex, startIndex + pageSize).map((c: any) => ({
    ...c,
    content: c.isDeleted ? "Bình luận đã được xóa" : c.content,
    links: c.isDeleted ? [] : safeJsonParse<Array<{ url: string; title?: string }>>(c.linksJson, []),
    statusHistory: c.isDeleted ? [] : safeJsonParse<any[]>(c.statusHistoryJson, []),
    // Never expose attachments of a deleted comment
    attachments: c.isDeleted ? [] : attByComment.get(c.id) || [],
    userReaction: c.isDeleted ? null : reactionByComment.get(c.id) || null,
    replies: repliesByParent.get(c.id) || [],
  }))

  // Active comment count strictly excludes placeholders and hidden comments
  const activeCommentCount = activeTopAndReplies.length

  // Top 3 recent contribution pieces ("Những mảnh ghép vừa được gửi")
  const recentContributions = activeTopAndReplies
    .filter((c: any) => c.contributionType && c.contributionType !== "NONE")
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .map((c: any) => ({
      ...c,
      links: safeJsonParse<Array<{ url: string; title?: string }>>(c.linksJson, []),
      statusHistory: safeJsonParse<any[]>(c.statusHistoryJson, []),
      attachments: attByComment.get(c.id) || [],
    }))

  return {
    comments: pagedTop,
    activeCommentCount,
    contributionPiecesCount,
    recentContributions,
    pagination: {
      page,
      pageSize,
      totalTopLevel,
      hasMore: startIndex + pageSize < totalTopLevel,
    },
  }
}

/**
 * Truy vấn chi tiết bài đăng / Ý tưởng / Sản phẩm AI / Dự án kèm đánh giá, lịch sử phiên bản, lời mời đồng nghiệp,
 * Hành trình lan tỏa và bình luận.
 */
export async function getSlcPostFullDetail(ctx: SlcUserContext, postId: string) {
  await ensureSlcSchema()
  const pAny = getSlcDb()

  const post = await pAny.slcPost.findUnique({
    where: { id: postId },
    include: {
      revisions: { orderBy: { versionNumber: "desc" } },
      attachments: { where: { isDeleted: false } },
    },
  })

  if (!post) {
    return { status: "NOT_FOUND" as const, post: null }
  }

  let group: any = null
  if (post.groupId) {
    group = await pAny.slcGroup.findUnique({ where: { id: post.groupId } })
  }

  let sourcePost: any = null
  if (post.sharedFromPostId) {
    sourcePost = await pAny.slcPost.findUnique({ where: { id: post.sharedFromPostId } })
    if (!sourcePost) {
      return { status: "PERMISSION_DENIED" as const, post: null }
    }
  }

  const allowed = canViewPost(
    ctx,
    {
      id: post.id,
      authorId: post.authorId,
      status: post.status,
      visibility: post.visibility,
      campusId: post.campusId,
      groupId: post.groupId,
      groupVisibility: group?.visibility || null,
    },
    sourcePost
      ? {
          id: sourcePost.id,
          authorId: sourcePost.authorId,
          status: sourcePost.status,
          visibility: sourcePost.visibility,
          campusId: sourcePost.campusId,
          groupId: sourcePost.groupId,
        }
      : null
  )

  if (!allowed) {
    return { status: "PERMISSION_DENIED" as const, post: null }
  }

  // Increment reachCount when a non-author views the post detail
  if (post.authorId !== ctx.userId) {
    await pAny.slcPost
      .update({
        where: { id: post.id },
        data: { reachCount: { increment: 1 } },
      })
      .catch(() => null)
  }

  const [linkedIdea, linkedProduct, linkedProject, userReaction, userSaved, userFollow, helpRequests] =
    await Promise.all([
      post.linkedIdeaId
        ? pAny.slcIdea.findUnique({ where: { id: post.linkedIdeaId } })
        : pAny.slcIdea.findUnique({ where: { postId: post.id } }).catch(() => null),
      post.linkedProductId
        ? pAny.slcProduct.findUnique({
            where: { id: post.linkedProductId },
            include: {
              versions: { orderBy: { createdAt: "desc" } },
              applications: { orderBy: { submittedAt: "desc" } },
            },
          })
        : pAny.slcProduct
            .findUnique({
              where: { postId: post.id },
              include: {
                versions: { orderBy: { createdAt: "desc" } },
                applications: { orderBy: { submittedAt: "desc" } },
              },
            })
            .catch(() => null),
      post.linkedProjectId
        ? pAny.slcProject.findUnique({
            where: { id: post.linkedProjectId },
            include: {
              members: { orderBy: { createdAt: "asc" } },
              progressUpdates: { orderBy: { createdAt: "desc" } },
            },
          })
        : pAny.slcProject
            .findUnique({
              where: { postId: post.id },
              include: {
                members: { orderBy: { createdAt: "asc" } },
                progressUpdates: { orderBy: { createdAt: "desc" } },
              },
            })
            .catch(() => null),
      pAny.slcReaction.findUnique({
        where: {
          targetType_targetId_userId: {
            targetType: "POST",
            targetId: post.id,
            userId: ctx.userId,
          },
        },
      }),
      pAny.slcSavedItem.findFirst({
        where: { userId: ctx.userId, postId: post.id },
      }),
      pAny.slcFollow.findUnique({
        where: {
          followerId_targetType_targetId: {
            followerId: ctx.userId,
            targetType: "POST",
            targetId: post.id,
          },
        },
      }),
      pAny.slcHelpRequest
        ?.findMany({
          where: { postId: post.id },
          orderBy: { createdAt: "desc" },
        })
        .catch(() => []) ?? [],
    ])

  const ratingTargetType = linkedProduct ? "PRODUCT" : linkedIdea ? "IDEA" : null
  const ratingTargetId = linkedProduct?.id || linkedIdea?.id || null

  const [ratings, expertEvaluations, commentData, officialAwards] = await Promise.all([
    ratingTargetType && ratingTargetId
      ? pAny.slcRating.findMany({
          where: {
            targetType: ratingTargetType,
            targetId: ratingTargetId,
            isValid: true,
          },
          include: {
            revisions: { orderBy: { createdAt: "desc" } },
          },
          orderBy: { lastRevisedAt: "desc" },
        })
      : [],
    ratingTargetType && ratingTargetId
      ? pAny.slcExpertEvaluation.findMany({
          where: {
            targetType: ratingTargetType,
            targetId: ratingTargetId,
          },
        })
      : [],
    querySlcPostComments(ctx, { postId: post.id, page: 1, pageSize: 20 }),
    ratingTargetId
      ? pAny.slcCommunityBadge
          ?.findMany({
            where: { targetId: ratingTargetId },
            orderBy: { awardedAt: "asc" },
          })
          .catch(() => []) ?? []
      : [],
  ])

  const myRating = ratings.find((r: any) => r.reviewerId === ctx.userId) || null

  // Build "Hành trình lan tỏa" from real post, comments, versions, verified applications, and official awards
  const spreadJourney = buildPostSpreadJourney({
    canViewerAccessPost: true,
    post: {
      id: post.id,
      title: post.title,
      postType: post.postType,
      authorName: post.authorName,
      publishedAt: post.publishedAt,
    },
    comments: commentData.comments,
    productVersions: linkedProduct?.versions || [],
    verifiedApplications: linkedProduct?.applications || [],
    officialAwards,
  })

  return {
    status: "OK" as const,
    post: {
      ...post,
      subjectCodes: safeJsonParse<string[]>(post.subjectCodesJson, []),
      gradeLevels: safeJsonParse<string[]>(post.gradeLevelsJson, []),
      purposeTags: safeJsonParse<string[]>(post.purposeTagsJson, []),
      tags: safeJsonParse<string[]>(post.tagsJson, []),
      group,
      linkedIdea,
      linkedProduct,
      linkedProject: linkedProject
        ? {
            ...linkedProject,
            neededRoles: safeJsonParse<string[]>(linkedProject.neededRolesJson, []),
          }
        : null,
      helpRequests,
      spreadJourney,
      userReaction: userReaction?.reactionType || null,
      isSaved: Boolean(userSaved),
      isFollowingPost: Boolean(userFollow),
      muteNotifications: Boolean(userFollow?.muteNotifications),
      ratings: ratings.map((r: any) => ({
        ...r,
        criteriaTags: safeJsonParse<string[]>(r.criteriaTagsJson, []),
      })),
      myRating: myRating
        ? {
            ...myRating,
            criteriaTags: safeJsonParse<string[]>(myRating.criteriaTagsJson, []),
          }
        : null,
      expertEvaluations,
      comments: commentData.comments,
      activeCommentCount: commentData.activeCommentCount,
      contributionPiecesCount: commentData.contributionPiecesCount,
      recentContributions: commentData.recentContributions,
      commentPagination: commentData.pagination,
    },
  }
}

/**
 * Truy vấn dữ liệu "Không gian của tôi" và Hồ sơ cá nhân (Profile):
 * - Bài đã đăng, Bản nháp, Sản phẩm AI, Dự án, Nội dung đã lưu (chỉ hiện mục còn quyền truy cập!),
 *   Đang theo dõi, Huy hiệu vinh danh có nguồn kỳ vinh danh, và Tùy chọn thông báo.
 */
export async function getSlcMySpaceAndProfile(ctx: SlcUserContext, targetUserId?: string) {
  await ensureSlcSchema()
  const pAny = getSlcDb()
  const uid = targetUserId || ctx.userId
  const isSelf = uid === ctx.userId

  const [
    userRecord,
    teacherRecord,
    communityProfile,
    userPosts,
    userProducts,
    userProjects,
    memberProjects,
    badges,
    savedItems,
    follows,
    myReports,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: uid } }).catch(() => null),
    prisma.teacher
      .findUnique({
        where: { userId: uid },
        include: { campus: true, mainSubjectRel: true, departmentRel: true },
      })
      .catch(() => null),
    pAny.slcCommunityProfile?.findUnique({ where: { userId: uid } }).catch(() => null),
    pAny.slcPost.findMany({
      where: {
        authorId: uid,
        ...(isSelf ? {} : { status: "PUBLISHED" }),
      },
      orderBy: { createdAt: "desc" },
    }),
    pAny.slcProduct.findMany({
      where: { authorId: uid },
      include: { versions: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    }),
    pAny.slcProject.findMany({
      where: { ownerId: uid },
      include: { members: true },
      orderBy: { createdAt: "desc" },
    }),
    pAny.slcProjectMember.findMany({
      where: { userId: uid, status: "APPROVED" },
      include: { project: true },
    }),
    pAny.slcCommunityBadge.findMany({
      where: { userId: uid },
      orderBy: { awardedAt: "desc" },
    }),
    isSelf
      ? pAny.slcSavedItem.findMany({
          where: { userId: uid },
          orderBy: { createdAt: "desc" },
        })
      : [],
    isSelf
      ? pAny.slcFollow.findMany({
          where: { followerId: uid },
          orderBy: { createdAt: "desc" },
        })
      : [],
    isSelf
      ? pAny.slcContentReport.findMany({
          where: {
            OR: [{ reporterId: uid }],
          },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ])

  // Filter accessible posts for viewer
  const visiblePosts = userPosts.filter((p: any) => canViewPost(ctx, p))
  const publishedPosts = visiblePosts.filter((p: any) => p.status === "PUBLISHED")
  const draftPosts = isSelf
    ? userPosts.filter((p: any) => p.status === "DRAFT" || p.status === "ARCHIVED")
    : []

  // Resolve saved items and strictly filter by current access permission (Rule III: "Đã lưu chỉ hiển thị nội dung đã lưu mà người dùng còn quyền truy cập")
  let accessibleSavedPosts: any[] = []
  if (isSelf && savedItems.length > 0) {
    const savedPostIds = Array.from(
      new Set(
        savedItems
          .map((s: any) => s.postId || (s.targetType === "POST" ? s.targetId : null))
          .filter(Boolean)
      )
    )
    const rawSavedPosts =
      savedPostIds.length > 0
        ? await pAny.slcPost.findMany({
            where: { id: { in: savedPostIds } },
          })
        : []
    const groups = await pAny.slcGroup.findMany({ where: { status: "ACTIVE" } })
    const groupMap = new Map<string, any>(groups.map((g: any) => [String(g.id), g]))

    accessibleSavedPosts = rawSavedPosts.filter((post: any) => {
      const grp = post.groupId ? groupMap.get(post.groupId) : null
      return canViewPost(ctx, {
        id: post.id,
        authorId: post.authorId,
        status: post.status,
        visibility: post.visibility,
        campusId: post.campusId,
        groupId: post.groupId,
        groupVisibility: grp?.visibility || null,
      })
    })
  }

  return {
    profile: {
      userId: uid,
      fullName:
        communityProfile?.fullName ||
        teacherRecord?.teacherName ||
        userRecord?.fullName ||
        "Giáo viên Sky-Line",
      avatarUrl: communityProfile?.avatarUrl || null,
      coverImageUrl: communityProfile?.coverImageUrl || null,
      bio:
        communityProfile?.bio ||
        "Cùng chia sẻ ý tưởng dạy học, sản phẩm AI và học liệu sáng tạo tại Sky-Line.",
      campusName:
        communityProfile?.campusName ||
        teacherRecord?.campus?.campusName ||
        "Hệ thống Giáo dục Sky-Line",
      mainSubject:
        communityProfile?.mainSubject ||
        teacherRecord?.mainSubjectRel?.subjectName ||
        teacherRecord?.departmentRel?.name ||
        "Chuyên môn Sư phạm",
      specialties: safeJsonParse<string[]>(communityProfile?.specialtiesJson, []),
      interests: safeJsonParse<string[]>(communityProfile?.interestsJson, []),
      notifyOnMention: communityProfile?.notifyOnMention ?? true,
      notifyOnReply: communityProfile?.notifyOnReply ?? true,
      notifyOnInvite: communityProfile?.notifyOnInvite ?? true,
      notifyOnFollowedUpdate: communityProfile?.notifyOnFollowedUpdate ?? true,
      digestMode: communityProfile?.digestMode || "IMMEDIATE",
    },
    publishedPosts,
    draftPosts,
    products: userProducts.filter((prod: any) =>
      canViewPost(ctx, {
        id: prod.id,
        authorId: prod.authorId,
        status: prod.status === "DISCONTINUED" ? "ARCHIVED" : "PUBLISHED",
        visibility: prod.visibility,
        campusId: prod.campusId,
        groupId: prod.groupId,
      })
    ),
    projects: Array.from(
      new Map(
        [
          ...userProjects,
          ...memberProjects.map((m: any) => m.project).filter(Boolean),
        ].map((p: any) => [p.id, p])
      ).values()
    ),
    badges,
    savedPosts: accessibleSavedPosts,
    follows,
    myReports,
  }
}

/**
 * Truy vấn khối gọn "Có gì mới trên Sky-Line Connect?" trên trang Tổng quan Giáo viên:
 * - Gồm sản phẩm AI phù hợp, dự án đang tìm cộng sự, và ý tưởng mới.
 * - Có cơ chế bắt lỗi an toàn để không bao giờ làm chậm hoặc lỗi trang Tổng quan GV.
 */
export async function getSlcTeacherOverviewWidget(ctx: SlcUserContext | null) {
  try {
    if (!ctx) {
      return { enabled: false, products: [], openProjects: [], recentIdeas: [] }
    }
    await ensureSlcSchema()
    const pAny = getSlcDb()

    const [products, openProjects, recentIdeas] = await Promise.all([
      pAny.slcProduct
        .findMany({
          where: {
            status: { in: ["READY", "TRIAL"] },
            visibility: "SYSTEM",
          },
          orderBy: [{ avgRating: "desc" }, { createdAt: "desc" }],
          take: 3,
        })
        .catch(() => []),
      pAny.slcProject
        .findMany({
          where: {
            status: "SEEKING_COLLABORATORS",
            visibility: "SYSTEM",
          },
          orderBy: { createdAt: "desc" },
          take: 2,
        })
        .catch(() => []),
      pAny.slcIdea
        .findMany({
          where: {
            visibility: "SYSTEM",
          },
          orderBy: { createdAt: "desc" },
          take: 2,
        })
        .catch(() => []),
    ])

    return {
      enabled: true,
      products,
      openProjects: openProjects.map((p: any) => ({
        ...p,
        neededRoles: safeJsonParse<string[]>(p.neededRolesJson, []),
      })),
      recentIdeas,
    }
  } catch {
    return { enabled: true, products: [], openProjects: [], recentIdeas: [] }
  }
}

/**
 * Truy vấn dữ liệu tổng hợp dành cho trang Quản trị Sky-Line Connect (/admin/skyline-connect)
 * hoặc Điều phối viên trong phạm vi phân công.
 */
export async function getSlcAdminOverviewData(ctx: SlcUserContext) {
  await ensureSlcSchema()
  const pAny = getSlcDb()

  const canAccessAdmin =
    isSuperOrCommunityAdmin(ctx) ||
    hasSlcRoleInScope(ctx, "COORDINATOR") ||
    hasSlcRoleInScope(ctx, "EVIDENCE_VERIFIER") ||
    hasSlcRoleInScope(ctx, "EXPERT_REVIEWER") ||
    hasSlcRoleInScope(ctx, "AWARD_FINALIZER")

  if (!canAccessAdmin) {
    throw new Error("PERMISSION_DENIED: Thầy/Cô không có quyền truy cập trang Quản trị Sky-Line Connect.")
  }

  const [
    featureConfig,
    posts,
    ideas,
    products,
    projects,
    groups,
    tags,
    reports,
    applications,
    expertEvals,
    awardPeriods,
    ruleSets,
    roleAssignments,
    badges,
    auditLogs,
    teachers,
    academicYears,
    campuses,
  ] = await Promise.all([
    pAny.slcFeatureConfig.findUnique({ where: { key: "DEFAULT" } }).catch(() => null),
    pAny.slcPost.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    pAny.slcIdea.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    pAny.slcProduct.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    pAny.slcProject.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    pAny.slcGroup.findMany({ orderBy: { createdAt: "desc" } }),
    pAny.slcTag.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] }),
    pAny.slcContentReport.findMany({ orderBy: { createdAt: "desc" } }),
    pAny.slcProductApplication.findMany({ orderBy: { submittedAt: "desc" } }),
    pAny.slcExpertEvaluation.findMany({ orderBy: { createdAt: "desc" } }),
    pAny.slcAwardPeriod.findMany({
      include: { nominations: true, snapshots: true },
      orderBy: { startDateUtc: "desc" },
    }),
    pAny.slcAwardRuleSet.findMany({ orderBy: { version: "desc" } }),
    pAny.slcUserRoleAssignment.findMany({ orderBy: { createdAt: "desc" } }),
    pAny.slcCommunityBadge.findMany({ orderBy: { awardedAt: "desc" } }),
    pAny.slcAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    prisma.teacher
      .findMany({
        where: { status: "ACTIVE" },
        select: { id: true, userId: true, teacherCode: true, teacherName: true, email: true, campusId: true },
        orderBy: { teacherName: "asc" },
        take: 200,
      })
      .catch(() => []),
    prisma.academicYear
      .findMany({
        where: { isOff: false },
        select: { id: true, name: true, startDate: true, endDate: true, status: true },
        orderBy: { startDate: "desc" },
      })
      .catch(() => []),
    prisma.campus
      .findMany({
        where: { status: "ACTIVE" },
        select: { id: true, campusCode: true, campusName: true },
      })
      .catch(() => []),
  ])

  return {
    featureConfig,
    posts,
    ideas,
    products,
    projects,
    groups,
    tags,
    reports,
    applications,
    expertEvals,
    awardPeriods,
    ruleSets,
    roleAssignments,
    badges,
    auditLogs,
    teachers,
    academicYears,
    campuses,
    permissions: {
      isSuperAdmin: isSuperOrCommunityAdmin(ctx),
      isCoordinator: hasSlcRoleInScope(ctx, "COORDINATOR"),
      isEvidenceVerifier: hasSlcRoleInScope(ctx, "EVIDENCE_VERIFIER"),
      isExpertReviewer: hasSlcRoleInScope(ctx, "EXPERT_REVIEWER"),
      isAwardFinalizer: hasSlcRoleInScope(ctx, "AWARD_FINALIZER"),
    },
  }
}
